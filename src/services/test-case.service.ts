import sql from '../lib/db.js';
import { TestCaseModel, type TestCase } from '../models/test-case.js';
import { StepResultModel } from '../models/step-result.js';
import { TestResultModel } from '../models/test-result.js';
import { FindingModel } from '../models/finding.js';
import { CreditService, calculateCreditCost, REVIEW_BASE_COST } from './credit.service.js';
import { CredentialService } from './credential.service.js';
import { S3Service } from './s3.service.js';
import { getJobManager } from '../lib/jobs.js';
import { Errors } from '../lib/errors.js';

async function signUrl(key: string | null | undefined): Promise<string | null> {
  if (!key) return null;
  return S3Service.getDownloadUrl(key).catch(() => null);
}

async function buildFlowResults(testCase: TestCase, testCaseId: string) {
  const testResult = await TestResultModel.findByTestCase(testCaseId);
  const stepResults = await StepResultModel.findByTestCase(testCaseId);

  const recordingDownloadUrl = await signUrl(testResult?.recording_url);
  const annotationsDownloadUrl = await signUrl(testResult?.annotations_url);

  // Sign all step screenshot URLs in parallel.
  const stepScreenshotUrls = await Promise.all(
    stepResults.map((sr) => signUrl(sr.screenshot_url)),
  );

  return {
    test_case_id: testCase.short_id,
    template_type: 'flow_test' as const,
    status: testCase.status,

    // Test case details
    title: testCase.title,
    description: testCase.description,
    url: testCase.url,
    expected_behavior: testCase.expected_behavior ?? null,
    environment: testCase.environment ?? null,
    tags: testCase.tags ?? [],

    // Verdict & summary
    verdict: testResult?.verdict ?? null,
    summary: testResult?.summary ?? null,

    // Step counts
    steps_passed: testResult?.steps_passed ?? stepResults.filter((s) => s.status === 'passed').length,
    steps_failed: testResult?.steps_failed ?? stepResults.filter((s) => s.status === 'failed').length,
    steps_total: testCase.steps.length,

    // Per-step results with signed screenshot URLs
    per_step_results: stepResults.map((sr, i) => ({
      step_index: sr.step_index,
      instruction: (testCase.steps[sr.step_index] as Record<string, string>)?.instruction ?? '',
      status: sr.status,
      severity: sr.severity,
      actual_behavior: sr.actual_behavior,
      screenshot_url: sr.screenshot_url,
      screenshot_download_url: stepScreenshotUrls[i],
      notes: sr.notes,
    })),

    // Recording
    recording_url: testResult?.recording_url ?? null,
    recording_download_url: recordingDownloadUrl,
    annotations_url: testResult?.annotations_url ?? null,
    annotations_download_url: annotationsDownloadUrl,

    completed_at: testCase.completed_at?.toISOString() ?? null,
  };
}

export const TestCaseService = {
  async create(builderId: string, data: {
    template_type: 'flow_test' | 'review_test';
    title: string;
    description?: string;
    staging_url: string;
    // Flow test fields
    steps?: Record<string, unknown>[];
    expected_behavior?: string;
    // Review test fields
    context?: string;
    devices_to_check?: string[];
    focus_areas?: string[];
    ignore_areas?: string;
    // Shared optional fields
    credentials?: Record<string, unknown>;
    environment?: string;
    tags?: string[];
    external_id?: string;
    callback_url?: string;
    required_skills?: string[];
  }): Promise<{ id: string; short_id: string; status: string; template_type: string; credit_cost: number; has_credentials: boolean; created_at: Date }> {
    const isFlow = data.template_type === 'flow_test';

    // Validate per template type
    if (isFlow) {
      if (!data.steps || data.steps.length === 0) {
        throw Errors.badRequest('steps array must contain at least one step', { field: 'steps' });
      }
      if (!data.expected_behavior) {
        throw Errors.badRequest('expected_behavior is required for flow tests', { field: 'expected_behavior' });
      }
    } else {
      if (!data.context) {
        throw Errors.badRequest('context is required for review tests', { field: 'context' });
      }
      if (!data.devices_to_check || data.devices_to_check.length === 0) {
        throw Errors.badRequest('devices_to_check must contain at least one device', { field: 'devices_to_check' });
      }
    }

    // Credit cost: flow = 2 + steps*1, review = 3 base (bonus at completion)
    const creditCost = isFlow
      ? calculateCreditCost(data.steps!.length)
      : REVIEW_BASE_COST;

    // Encrypt credentials if provided
    let encryptedCredentials: Record<string, unknown> | null = null;
    if (data.credentials) {
      encryptedCredentials = CredentialService.encrypt(data.credentials) as unknown as Record<string, unknown>;
    }

    const testCase = await TestCaseModel.create({
      builder_id: builderId,
      template_type: data.template_type,
      title: data.title,
      description: data.description ?? null,
      url: data.staging_url,
      steps: isFlow ? data.steps! : [],
      credentials: encryptedCredentials,
      expected_behavior: isFlow ? data.expected_behavior : null,
      context: !isFlow ? data.context : null,
      devices_to_check: !isFlow ? data.devices_to_check : [],
      focus_areas: !isFlow ? data.focus_areas : [],
      ignore_areas: !isFlow ? data.ignore_areas : null,
      environment: data.environment,
      tags: data.tags,
      external_id: data.external_id,
      callback_url: data.callback_url,
      required_skills: data.required_skills,
    });

    // Reserve credits
    try {
      await CreditService.reserveCredits(builderId, testCase.id, creditCost);
    } catch (err) {
      await sql`DELETE FROM test_cases WHERE id = ${testCase.id}`;
      throw err;
    }

    // Schedule tester selection
    try {
      const boss = await getJobManager();
      const [config] = await sql<{ value: string }[]>`
        SELECT value::text FROM platform_config WHERE key = 'selection_window_minutes'
      `;
      const windowMinutes = config ? parseInt(config.value, 10) : 30;

      await boss.send('select-tester', { testCaseId: testCase.id }, {
        startAfter: windowMinutes * 60,
        singletonKey: `select:${testCase.id}`,
      });
      await boss.send('assignment-expiry', { testCaseId: testCase.id }, {
        startAfter: 7200 + (windowMinutes * 60),
        singletonKey: `expiry:${testCase.id}`,
      });
    } catch {
      // Job enqueue failure is non-fatal
    }

    return {
      id: testCase.short_id,
      short_id: testCase.short_id,
      status: testCase.status,
      template_type: testCase.template_type,
      credit_cost: creditCost,
      has_credentials: !!data.credentials,
      created_at: testCase.created_at,
    };
  },

  /**
   * Get a test case by ID. If skipOwnerCheck is true, ownership is not validated
   * (used internally by tester routes to determine template_type).
   */
  async getById(testCaseId: string, builderId: string, skipOwnerCheck = false): Promise<TestCase> {
    const testCase = await TestCaseModel.findById(testCaseId);
    if (!testCase) {
      throw Errors.notFound('Test case');
    }
    if (!skipOwnerCheck && testCase.builder_id !== builderId) {
      throw Errors.notFound('Test case');
    }
    return testCase;
  },

  async list(builderId: string, options: { status?: string; search?: string; page?: number; cursor?: string; limit?: number }) {
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

    const creditCost = testCase.template_type === 'flow_test'
      ? calculateCreditCost(testCase.steps.length)
      : REVIEW_BASE_COST;

    await sql.begin(async (tx) => {
      const locked = await TestCaseModel.cancelIfAllowed(testCase.id, tx);
      if (!locked) {
        throw Errors.conflict('CANNOT_CANCEL',
          'Test case status changed during cancellation',
          { current_status: testCase.status }
        );
      }
    });

    await CreditService.refundCredits(builderId, testCase.id, creditCost);

    return { id: testCase.short_id, status: 'cancelled', credits_refunded: creditCost };
  },

  async getResultsForTester(testCaseId: string, testerId: string) {
    const testCase = await TestCaseModel.findById(testCaseId);
    if (!testCase || testCase.assigned_tester_id !== testerId) {
      throw Errors.notFound('Test case');
    }
    if (testCase.template_type !== 'flow_test') {
      throw Errors.badRequest('Results view is only available for flow tests');
    }
    return buildFlowResults(testCase, testCaseId);
  },

  async getResults(testCaseId: string, builderId: string) {
    const testCase = await TestCaseModel.findById(testCaseId);
    if (!testCase || testCase.builder_id !== builderId) {
      throw Errors.notFound('Test case');
    }

    const testResult = await TestResultModel.findByTestCase(testCaseId);

    if (testCase.template_type === 'flow_test') {
      return buildFlowResults(testCase, testCaseId);
    }

    // review_test
    const findings = await FindingModel.findByTestCase(testCaseId);
    const counts = await FindingModel.countByTestCase(testCaseId);
    const bonusCredits =
      counts.critical * 3 +
      counts.major * 2 +
      counts.minor * 0.5;

    return {
      test_case_id: testCase.short_id,
      template_type: 'review_test',
      status: testCase.status,
      verdict: testResult?.verdict ?? null,
      summary: testResult?.summary ?? null,
      total_findings: findings.length,
      findings: findings.map(f => ({
        id: f.id,
        severity: f.severity,
        category: f.category,
        description: f.description,
        screenshot_url: f.screenshot_url,
        device: f.device,
        location: f.location,
      })),
      credits_breakdown: {
        base: REVIEW_BASE_COST,
        bonus: bonusCredits,
        total: REVIEW_BASE_COST + bonusCredits,
      },
      completed_at: testCase.completed_at?.toISOString() ?? null,
    };
  },
};
