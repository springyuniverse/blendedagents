import sql from '../lib/db.js';
import { TestCaseModel } from '../models/test-case.js';
import { TesterModel } from '../models/tester.js';
import { BuilderModel } from '../models/builder.js';
import { StepResultModel } from '../models/step-result.js';
import { TestResultModel } from '../models/test-result.js';
import { FindingModel } from '../models/finding.js';
import { RegionalRateModel } from '../models/regional-rate.js';
import { CreditService, calculateCreditCost, REVIEW_BASE_COST, calculateReviewBonusCredits } from './credit.service.js';
import { gradeAssessment, type AssessmentConfig } from './sandbox-scoring.service.js';
import { getJobManager } from '../lib/jobs.js';
import { Errors } from '../lib/errors.js';
import { EmailService, sendAdminNotification } from '../lib/email.js';
import type { Tester } from '../models/tester.js';

const APP_URL = process.env.APP_URL || 'https://blendedagents.com';

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

    // Fire-and-forget: send task-assigned email to the tester
    (async () => {
      try {
        const [tester, testCase] = await Promise.all([
          TesterModel.findById(testerId),
          TestCaseModel.findById(testCaseId),
        ]);
        if (tester?.email && testCase) {
          const acceptanceDeadline = new Date(Date.now() + 30 * 60 * 1000).toISOString();
          await EmailService.sendTaskAssigned(tester.email, {
            title: testCase.title,
            templateType: testCase.template_type,
            stepCount: testCase.steps.length,
            acceptanceDeadline,
            taskUrl: `${APP_URL}/tester/tasks/${testCase.short_id}`,
          });
        }
      } catch (err) {
        console.error('[email] Failed to send task-assigned email:', err);
      }
    })();
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

    // Refund credits — flow uses step-based cost, review uses base cost
    const creditCost = testCase.template_type === 'review_test'
      ? REVIEW_BASE_COST
      : calculateCreditCost(testCase.steps.length);
    await CreditService.refundCredits(testCase.builder_id, testCaseId, creditCost);

    // Fire-and-forget: send test-expired email to the builder
    (async () => {
      try {
        const builder = await BuilderModel.findById(testCase.builder_id);
        if (builder?.email) {
          await EmailService.sendTestExpired(builder.email, {
            title: testCase.title,
            shortId: testCase.short_id,
            creditsRefunded: creditCost,
          });
        }
      } catch (err) {
        console.error('[email] Failed to send test-expired email:', err);
      }
    })();
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
            started_at = NOW(),
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
   * Tester submits flow test results: validate all steps have results,
   * create StepResults + TestResult, transition to 'completed',
   * and trigger CreditService.completeTest for the 3-transaction settlement.
   */
  async submitFlowResults(testCaseId: string, testerId: string, results: {
    verdict: string;
    summary?: string;
    recording_url?: string;
    annotations_url?: string;
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

    if (results.steps.length !== testCase.steps.length) {
      throw Errors.badRequest(
        `Expected results for ${testCase.steps.length} steps, got ${results.steps.length}`,
        { expected: testCase.steps.length, received: results.steps.length }
      );
    }

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
      annotations_url: results.annotations_url,
    });

    await TestCaseModel.updateStatus(testCaseId, 'completed');
    await sql`UPDATE test_cases SET completed_at = NOW() WHERE id = ${testCaseId}`;

    // Record duration from started_at to now
    if (testCase.started_at) {
      const durationMinutes = Math.round((Date.now() - new Date(testCase.started_at).getTime()) / 60000 * 100) / 100;
      await sql`UPDATE test_results SET duration_minutes = ${durationMinutes} WHERE test_case_id = ${testCaseId}`;
    }

    // ── Assessment auto-grading ──────────────────────────────────
    if (testCase.type === 'onboarding_assessment' && testCase.assessment_config) {
      const grade = gradeAssessment(
        results.steps.map((s) => ({
          step_index: s.step_index,
          status: s.status,
          severity: s.severity ?? null,
          actual_behavior: s.actual_behavior ?? null,
          notes: s.notes ?? null,
        })),
        testCase.assessment_config as unknown as AssessmentConfig,
      );

      // Store grade in assessment_config for retrieval
      await sql`
        UPDATE test_cases
        SET assessment_config = assessment_config || ${sql.json({ grade } as never)}::jsonb
        WHERE id = ${testCaseId}
      `;

      // Assessment complete — mark onboarded so account enters "in review".
      // Admin reviews scores and decides whether to activate (is_active).
      await TesterModel.update(testerId, { onboarded: true });

      // Fire-and-forget: send assessment results email to tester
      (async () => {
        try {
          const tester = await TesterModel.findById(testerId);
          if (tester?.email) {
            const gradeLabel = `${grade.detection_score}% detection, ${grade.clarity_score}% clarity`;
            await EmailService.sendAssessmentResults(tester.email, tester.display_name, gradeLabel, grade.passed);
          }
        } catch (err) {
          console.error('[email] Failed to send assessment-results email:', err);
        }
      })();

      // Skip credit settlement for assessment tasks
      await sql`
        UPDATE testers
        SET current_task_id = NULL
        WHERE id = ${testerId}
      `;
      return;
    }

    await sql`
      UPDATE testers
      SET current_task_id = NULL, is_available = true,
          tasks_completed = tasks_completed + 1,
          avg_completion_minutes = COALESCE(
            (SELECT AVG(duration_minutes) FROM test_results WHERE tester_id = ${testerId} AND duration_minutes IS NOT NULL), 0
          )
      WHERE id = ${testerId}
    `;

    const tester = await TesterModel.findById(testerId);
    const region = tester?.region ?? 'default';
    const regionalRate = await RegionalRateModel.getByRegion(region);

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

    // Fire-and-forget: send test-results-ready email to the builder
    const durationMinutes = testCase.started_at
      ? Math.round((Date.now() - new Date(testCase.started_at).getTime()) / 60000 * 100) / 100
      : 0;
    (async () => {
      try {
        const builder = await BuilderModel.findById(testCase.builder_id);
        if (builder?.email) {
          await EmailService.sendTestResultsReady(builder.email, {
            title: testCase.title,
            shortId: testCase.short_id,
            verdict: results.verdict,
            stepsPassed,
            stepsTotal: testCase.steps.length,
            durationMinutes,
            recordingUrl: results.recording_url,
          });
        }
      } catch (err) {
        console.error('[email] Failed to send test-results-ready email:', err);
      }
    })();

    // Fire-and-forget: send task-completed email to the tester
    (async () => {
      try {
        const freshTester = await TesterModel.findById(testerId);
        if (freshTester?.email) {
          const payoutCents = (regionalRate?.base_pay_cents ?? 100) +
            (regionalRate?.per_step_rate_cents ?? 25) * testCase.steps.length;
          await EmailService.sendTaskCompleted(freshTester.email, freshTester.display_name, {
            title: testCase.title,
            verdict: results.verdict,
            payoutAmount: `$${(payoutCents / 100).toFixed(2)}`,
            totalEarnings: `$${((freshTester.earnings_cents + payoutCents) / 100).toFixed(2)}`,
          });
        }
      } catch (err) {
        console.error('[email] Failed to send task-completed email:', err);
      }
    })();

    // Admin notification
    sendAdminNotification('test_case_completed', {
      actorName: tester?.display_name || 'Tester',
      actorEmail: tester?.email || '',
      message: `"${testCase.title}" completed with verdict: ${results.verdict}.`,
    });
  },

  /**
   * Tester submits review test results: create Findings + TestResult,
   * transition to 'completed', and settle credits (base + bonus).
   */
  async submitReviewResults(testCaseId: string, testerId: string, results: {
    verdict: string;
    summary?: string;
    findings: Array<{
      severity: string;
      category: string;
      description: string;
      screenshot_url?: string;
      device: string;
      location: string;
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

    // Create findings
    for (const finding of results.findings) {
      await FindingModel.create({
        test_case_id: testCaseId,
        tester_id: testerId,
        severity: finding.severity,
        category: finding.category,
        description: finding.description,
        screenshot_url: finding.screenshot_url,
        device: finding.device,
        location: finding.location,
      });
    }

    // Count findings by severity for bonus calculation
    const counts = { critical: 0, major: 0, minor: 0 };
    for (const f of results.findings) {
      counts[f.severity as keyof typeof counts]++;
    }
    const bonusCredits = calculateReviewBonusCredits(counts);
    const totalCredits = REVIEW_BASE_COST + bonusCredits;

    // Create test result
    await TestResultModel.create({
      test_case_id: testCaseId,
      tester_id: testerId,
      verdict: results.verdict,
      summary: results.summary,
      steps_passed: 0,
      steps_failed: 0,
      steps_blocked: 0,
      steps_total: 0,
    });

    await TestCaseModel.updateStatus(testCaseId, 'completed');
    await sql`UPDATE test_cases SET completed_at = NOW() WHERE id = ${testCaseId}`;

    // Record duration from started_at to now
    if (testCase.started_at) {
      const durationMinutes = Math.round((Date.now() - new Date(testCase.started_at).getTime()) / 60000 * 100) / 100;
      await sql`UPDATE test_results SET duration_minutes = ${durationMinutes} WHERE test_case_id = ${testCaseId}`;
    }

    await sql`
      UPDATE testers
      SET current_task_id = NULL, is_available = true,
          tasks_completed = tasks_completed + 1,
          avg_completion_minutes = COALESCE(
            (SELECT AVG(duration_minutes) FROM test_results WHERE tester_id = ${testerId} AND duration_minutes IS NOT NULL), 0
          )
      WHERE id = ${testerId}
    `;

    const tester = await TesterModel.findById(testerId);
    const region = tester?.region ?? 'default';
    const regionalRate = await RegionalRateModel.getByRegion(region);

    // For review tests: charge base + bonus, payout based on total credits
    await CreditService.completeTest({
      builderId: testCase.builder_id,
      testerId,
      testCaseId,
      creditAmount: totalCredits,
      stepsCount: results.findings.length,
      lockedRate: {
        base_pay_cents: regionalRate?.base_pay_cents ?? 100,
        per_step_rate_cents: regionalRate?.per_step_rate_cents ?? 25,
        steps_count: results.findings.length,
      },
    });

    // Fire-and-forget: send test-results-ready email to the builder
    const durationMinutes = testCase.started_at
      ? Math.round((Date.now() - new Date(testCase.started_at).getTime()) / 60000 * 100) / 100
      : 0;
    (async () => {
      try {
        const builder = await BuilderModel.findById(testCase.builder_id);
        if (builder?.email) {
          await EmailService.sendTestResultsReady(builder.email, {
            title: testCase.title,
            shortId: testCase.short_id,
            verdict: results.verdict,
            stepsPassed: 0,
            stepsTotal: 0,
            durationMinutes,
          });
        }
      } catch (err) {
        console.error('[email] Failed to send test-results-ready email:', err);
      }
    })();

    // Fire-and-forget: send task-completed email to the tester
    (async () => {
      try {
        if (tester?.email) {
          const payoutCents = (regionalRate?.base_pay_cents ?? 100) +
            (regionalRate?.per_step_rate_cents ?? 25) * results.findings.length;
          await EmailService.sendTaskCompleted(tester.email, tester.display_name, {
            title: testCase.title,
            verdict: results.verdict,
            payoutAmount: `$${(payoutCents / 100).toFixed(2)}`,
            totalEarnings: `$${((tester.earnings_cents + payoutCents) / 100).toFixed(2)}`,
          });
        }
      } catch (err) {
        console.error('[email] Failed to send task-completed email:', err);
      }
    })();

    // Admin notification
    sendAdminNotification('test_case_completed', {
      actorName: tester?.display_name || 'Tester',
      actorEmail: tester?.email || '',
      message: `"${testCase.title}" review completed with verdict: ${results.verdict}. Findings: ${results.findings?.length || 0}.`,
    });
  },

  /**
   * Admin reassigns a test case to a different tester.
   * Clears existing results, resets status to 'assigned', frees old tester.
   */
  async adminReassign(testCaseId: string, newTesterId: string, reason?: string): Promise<void> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await sql.begin(async (tx: any) => {
      const testCase = await TestCaseModel.getForUpdate(testCaseId, tx);
      if (!testCase) throw Errors.notFound('Test case');

      if (!['assigned', 'in_progress'].includes(testCase.status)) {
        throw Errors.conflict('CANNOT_REASSIGN',
          `Test case cannot be reassigned because it is ${testCase.status}`,
          { current_status: testCase.status }
        );
      }

      const oldTesterId = testCase.assigned_tester_id;

      // Clear previous work
      await tx`DELETE FROM step_results WHERE test_case_id = ${testCaseId}`;
      await tx`DELETE FROM test_results WHERE test_case_id = ${testCaseId}`;
      await tx`DELETE FROM findings WHERE test_case_id = ${testCaseId}`;

      // Free old tester
      if (oldTesterId) {
        await tx`
          UPDATE testers SET current_task_id = NULL, is_available = true
          WHERE id = ${oldTesterId} AND current_task_id = ${testCaseId}
        `;
      }

      // Assign new tester
      await tx`
        UPDATE test_cases
        SET status = 'assigned',
            assigned_tester_id = ${newTesterId},
            assigned_at = NOW(),
            started_at = NULL,
            status_history = status_history || ${JSON.stringify({
              status: 'reassigned',
              at: new Date().toISOString(),
              old_tester_id: oldTesterId,
              new_tester_id: newTesterId,
              reason: reason || null,
            })}::jsonb
        WHERE id = ${testCaseId}
      `;

      // Mark new tester as busy
      await tx`
        UPDATE testers SET current_task_id = ${testCaseId}, is_available = false
        WHERE id = ${newTesterId}
      `;
    });

    // Enqueue fresh acceptance-timeout
    try {
      const boss = await getJobManager();
      await boss.send('acceptance-timeout', { testCaseId, testerId: newTesterId }, {
        startAfter: 1800,
        singletonKey: `acceptance-timeout:${testCaseId}`,
      });
    } catch {
      // Non-fatal
    }
  },
};
