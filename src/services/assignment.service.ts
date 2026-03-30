import sql from '../lib/db.js';
import { TestCaseModel } from '../models/test-case.js';
import { TesterModel } from '../models/tester.js';
import { StepResultModel } from '../models/step-result.js';
import { TestResultModel } from '../models/test-result.js';
import { RegionalRateModel } from '../models/regional-rate.js';
import { CreditService, calculateCreditCost } from './credit.service.js';
import { getJobManager } from '../lib/jobs.js';
import { Errors } from '../lib/errors.js';
import type { Tester } from '../models/tester.js';

export const AssignmentService = {
  /**
   * Find a qualified tester by skill match using @> containment,
   * FOR UPDATE SKIP LOCKED to prevent concurrent assignment races,
   * ordered by workload (fewest current tasks first), LIMIT 1.
   */
  async findQualifiedTester(requiredSkills: string[]): Promise<Tester | null> {
    const [tester] = await sql<Tester[]>`
      SELECT * FROM testers
      WHERE is_active = true
        AND is_available = true
        AND current_task_id IS NULL
        AND skills @> ${sql.json(requiredSkills as never)}
      ORDER BY tasks_total ASC, avg_completion_minutes ASC
      LIMIT 1
      FOR UPDATE SKIP LOCKED
    `;
    return tester ?? null;
  },

  /**
   * Assign a tester to a test case: update status to 'assigned',
   * set assigned_tester_id, and enqueue acceptance-timeout job.
   */
  async assignTester(testCaseId: string, testerId: string): Promise<void> {
    await sql`
      UPDATE test_cases
      SET status = 'assigned',
          assigned_tester_id = ${testerId},
          assigned_at = NOW(),
          status_history = status_history || ${JSON.stringify({
            status: 'assigned',
            at: new Date().toISOString(),
            tester_id: testerId,
          })}::jsonb
      WHERE id = ${testCaseId}
        AND status = 'queued'
    `;

    // Mark tester as busy
    await sql`
      UPDATE testers
      SET current_task_id = ${testCaseId}, is_available = false
      WHERE id = ${testerId}
    `;

    // Enqueue acceptance-timeout (30 minutes)
    try {
      const boss = await getJobManager();
      await boss.send('acceptance-timeout', { testCaseId, testerId }, {
        startAfter: 1800, // 30 minutes
        singletonKey: `acceptance-timeout:${testCaseId}`,
      });
    } catch {
      // Non-fatal — timeout can be handled manually
    }
  },

  /**
   * Handle acceptance timeout: if the test case is still 'assigned',
   * clear assignment and set back to 'queued', then enqueue new assign-tester.
   */
  async handleAcceptanceTimeout(testCaseId: string): Promise<void> {
    const result = await sql`
      UPDATE test_cases
      SET status = 'queued',
          assigned_tester_id = NULL,
          assigned_at = NULL,
          status_history = status_history || ${JSON.stringify({
            status: 'queued',
            at: new Date().toISOString(),
            reason: 'acceptance_timeout',
          })}::jsonb
      WHERE id = ${testCaseId}
        AND status = 'assigned'
      RETURNING assigned_tester_id
    `;

    if (result.length > 0) {
      // Free up the tester
      const previousTesterId = result[0].assigned_tester_id;
      if (previousTesterId) {
        await sql`
          UPDATE testers
          SET current_task_id = NULL, is_available = true
          WHERE id = ${previousTesterId}
        `;
      }

      // Re-enqueue assignment
      try {
        const boss = await getJobManager();
        await boss.send('assign-tester', { testCaseId }, {
          retryLimit: 15,
          retryDelay: 120,
          retryBackoff: false,
        });
      } catch {
        // Non-fatal
      }
    }
  },

  /**
   * Handle expiry: if test case is still queued or assigned after 2 hours,
   * set it to expired and refund credits.
   */
  async handleExpiry(testCaseId: string): Promise<void> {
    const testCase = await TestCaseModel.findById(testCaseId);
    if (!testCase || !['queued', 'assigned'].includes(testCase.status)) {
      return; // Already progressed past expiry window
    }

    await sql`
      UPDATE test_cases
      SET status = 'expired',
          status_history = status_history || ${JSON.stringify({
            status: 'expired',
            at: new Date().toISOString(),
          })}::jsonb
      WHERE id = ${testCaseId}
        AND status IN ('queued', 'assigned')
    `;

    // Free tester if assigned
    if (testCase.assigned_tester_id) {
      await sql`
        UPDATE testers
        SET current_task_id = NULL, is_available = true
        WHERE id = ${testCase.assigned_tester_id}
      `;
    }

    // Refund credits
    const creditCost = calculateCreditCost(testCase.steps.length);
    await CreditService.refundCredits(testCase.builder_id, testCaseId, creditCost);
  },

  /**
   * Tester accepts the assignment: SELECT FOR UPDATE to prevent race conditions,
   * validate status is 'assigned' and correct tester, transition to 'in_progress'.
   */
  async acceptAssignment(testCaseId: string, testerId: string): Promise<void> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await sql.begin(async (tx: any) => {
      const testCase = await TestCaseModel.getForUpdate(testCaseId, tx);

      if (!testCase) {
        throw Errors.notFound('Test case');
      }

      if (testCase.status !== 'assigned') {
        throw Errors.conflict('CANNOT_ACCEPT',
          `Test case cannot be accepted because it is ${testCase.status}`,
          { current_status: testCase.status }
        );
      }

      if (testCase.assigned_tester_id !== testerId) {
        throw Errors.forbidden('This test case is not assigned to you');
      }

      await tx`
        UPDATE test_cases
        SET status = 'in_progress',
            status_history = status_history || ${JSON.stringify({
              status: 'in_progress',
              at: new Date().toISOString(),
              tester_id: testerId,
            })}::jsonb
        WHERE id = ${testCaseId}
      `;
    });
  },

  /**
   * Tester submits results: validate all steps have results,
   * create StepResults + TestResult, transition to 'completed',
   * and trigger CreditService.completeTest for the 3-transaction settlement.
   */
  async submitResults(testCaseId: string, testerId: string, results: {
    verdict: string;
    summary?: string;
    recording_url?: string;
    steps: Array<{
      step_index: number;
      status: string;
      severity?: string;
      actual_behavior?: string;
      screenshot_url?: string;
      notes?: string;
    }>;
  }): Promise<void> {
    const testCase = await TestCaseModel.findById(testCaseId);
    if (!testCase) {
      throw Errors.notFound('Test case');
    }

    if (testCase.status !== 'in_progress') {
      throw Errors.conflict('CANNOT_SUBMIT',
        `Test case cannot receive results because it is ${testCase.status}`,
        { current_status: testCase.status }
      );
    }

    if (testCase.assigned_tester_id !== testerId) {
      throw Errors.forbidden('This test case is not assigned to you');
    }

    // Validate all steps have results
    if (results.steps.length !== testCase.steps.length) {
      throw Errors.badRequest(
        `Expected results for ${testCase.steps.length} steps, got ${results.steps.length}`,
        { expected: testCase.steps.length, received: results.steps.length }
      );
    }

    // Create step results
    for (const step of results.steps) {
      await StepResultModel.create({
        test_case_id: testCaseId,
        tester_id: testerId,
        step_index: step.step_index,
        status: step.status,
        severity: step.severity,
        actual_behavior: step.actual_behavior,
        screenshot_url: step.screenshot_url,
        notes: step.notes,
      });
    }

    // Create test result
    const stepsPassed = results.steps.filter(s => s.status === 'passed').length;
    const stepsFailed = results.steps.filter(s => s.status === 'failed').length;
    const stepsBlocked = results.steps.filter(s => s.status === 'blocked').length;

    await TestResultModel.create({
      test_case_id: testCaseId,
      tester_id: testerId,
      verdict: results.verdict,
      summary: results.summary,
      steps_passed: stepsPassed,
      steps_failed: stepsFailed,
      steps_blocked: stepsBlocked,
      steps_total: testCase.steps.length,
      recording_url: results.recording_url,
    });

    // Transition to completed
    await TestCaseModel.updateStatus(testCaseId, 'completed');
    await sql`
      UPDATE test_cases SET completed_at = NOW() WHERE id = ${testCaseId}
    `;

    // Free up the tester
    await sql`
      UPDATE testers
      SET current_task_id = NULL, is_available = true,
          tasks_completed = tasks_completed + 1
      WHERE id = ${testerId}
    `;

    // Look up tester region for payout rate
    const tester = await TesterModel.findById(testerId);
    const region = tester?.region ?? 'default';
    const regionalRate = await RegionalRateModel.getByRegion(region);

    // Settle credits: charge + payout + commission (3 transactions)
    const creditCost = calculateCreditCost(testCase.steps.length);
    await CreditService.completeTest({
      builderId: testCase.builder_id,
      testerId,
      testCaseId,
      creditAmount: creditCost,
      stepsCount: testCase.steps.length,
      lockedRate: {
        base_pay_cents: regionalRate?.base_pay_cents ?? 100,
        per_step_rate_cents: regionalRate?.per_step_rate_cents ?? 25,
        steps_count: testCase.steps.length,
      },
    });
  },
};
