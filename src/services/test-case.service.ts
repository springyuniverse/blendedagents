import sql from '../lib/db.js';
import { TestCaseModel, type TestCase } from '../models/test-case.js';
import { StepResultModel } from '../models/step-result.js';
import { TestResultModel } from '../models/test-result.js';
import { CreditService, calculateCreditCost } from './credit.service.js';
import { CredentialService } from './credential.service.js';
import { getJobManager } from '../lib/jobs.js';
import { Errors } from '../lib/errors.js';

export const TestCaseService = {
  async create(builderId: string, data: {
    title: string;
    description: string;
    staging_url: string;
    steps: Record<string, unknown>[];
    expected_behavior: string;
    credentials?: Record<string, unknown>;
    environment?: string;
    tags?: string[];
    external_id?: string;
    callback_url?: string;
    required_skills?: string[];
    template_id?: string;
  }): Promise<{ id: string; status: string; credit_cost: number; has_credentials: boolean; created_at: Date }> {
    // Validate steps
    if (!data.steps || data.steps.length === 0) {
      throw Errors.badRequest('steps array must contain at least one step', { field: 'steps' });
    }

    const creditCost = calculateCreditCost(data.steps.length);

    // Encrypt credentials if provided
    let encryptedCredentials: Record<string, unknown> | null = null;
    if (data.credentials) {
      encryptedCredentials = CredentialService.encrypt(data.credentials) as unknown as Record<string, unknown>;
    }

    // Reserve credits (atomic — will throw if insufficient)
    // First create the test case, then reserve
    const testCase = await TestCaseModel.create({
      builder_id: builderId,
      title: data.title,
      description: data.description,
      url: data.staging_url,
      steps: data.steps,
      credentials: encryptedCredentials,
      expected_behavior: data.expected_behavior,
      environment: data.environment,
      tags: data.tags,
      external_id: data.external_id,
      callback_url: data.callback_url,
      required_skills: data.required_skills,
      template_id: data.template_id,
    });

    // Reserve credits
    try {
      await CreditService.reserveCredits(builderId, testCase.id, creditCost);
    } catch (err) {
      // Rollback test case creation if credit reservation fails
      await sql`DELETE FROM test_cases WHERE id = ${testCase.id}`;
      throw err;
    }

    // Enqueue assignment jobs
    try {
      const boss = await getJobManager();
      await boss.send('assign-tester', { testCaseId: testCase.id }, {
        retryLimit: 15,
        retryDelay: 120,
        retryBackoff: false,
      });
      await boss.send('assignment-expiry', { testCaseId: testCase.id }, {
        startAfter: 7200, // 2 hours
        singletonKey: `expiry:${testCase.id}`,
      });
    } catch {
      // Assignment job enqueue failure is non-fatal — can be retried manually
    }

    return {
      id: testCase.id,
      status: testCase.status,
      credit_cost: creditCost,
      has_credentials: !!data.credentials,
      created_at: testCase.created_at,
    };
  },

  async getById(testCaseId: string, builderId: string): Promise<TestCase> {
    const testCase = await TestCaseModel.findById(testCaseId);
    if (!testCase || testCase.builder_id !== builderId) {
      throw Errors.notFound('Test case');
    }
    return testCase;
  },

  async list(builderId: string, options: { status?: string; cursor?: string; limit?: number }) {
    return TestCaseModel.listByBuilder(builderId, options);
  },

  async cancel(testCaseId: string, builderId: string): Promise<{ id: string; status: string; credits_refunded: number }> {
    const testCase = await TestCaseModel.findById(testCaseId);
    if (!testCase || testCase.builder_id !== builderId) {
      throw Errors.notFound('Test case');
    }

    if (!['queued', 'assigned'].includes(testCase.status)) {
      throw Errors.conflict('CANNOT_CANCEL',
        `Test case cannot be cancelled because it is already ${testCase.status}`,
        { current_status: testCase.status }
      );
    }

    const creditCost = calculateCreditCost(testCase.steps.length);

    // Atomic: lock test case, cancel, refund credits
    await sql.begin(async (tx) => {
      const locked = await TestCaseModel.cancelIfAllowed(testCaseId, tx);
      if (!locked) {
        throw Errors.conflict('CANNOT_CANCEL',
          'Test case status changed during cancellation',
          { current_status: testCase.status }
        );
      }
      // Refund uses its own transaction internally — pass the test case ID
    });

    // Refund credits
    await CreditService.refundCredits(builderId, testCaseId, creditCost);

    return { id: testCaseId, status: 'cancelled', credits_refunded: creditCost };
  },

  async getResults(testCaseId: string, builderId: string) {
    const testCase = await TestCaseModel.findById(testCaseId);
    if (!testCase || testCase.builder_id !== builderId) {
      throw Errors.notFound('Test case');
    }

    const stepResults = await StepResultModel.findByTestCase(testCaseId);
    const testResult = await TestResultModel.findByTestCase(testCaseId);

    return {
      test_case_id: testCaseId,
      status: testCase.status,
      verdict: testResult?.verdict ?? null,
      summary: testResult?.summary ?? null,
      steps_passed: testResult?.steps_passed ?? stepResults.filter(s => s.status === 'passed').length,
      steps_failed: testResult?.steps_failed ?? stepResults.filter(s => s.status === 'failed').length,
      steps_total: testCase.steps.length,
      per_step_results: stepResults.map(sr => ({
        step_index: sr.step_index,
        instruction: (testCase.steps[sr.step_index] as Record<string, string>)?.instruction ?? '',
        status: sr.status,
        severity: sr.severity,
        actual_behavior: sr.actual_behavior,
        screenshot_url: sr.screenshot_url,
        notes: sr.notes,
      })),
      recording_url: testResult?.recording_url ?? null,
      completed_at: testCase.completed_at?.toISOString() ?? null,
    };
  },
};
