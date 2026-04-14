import { TestCaseModel } from '../models/test-case.js';
import { StepResultModel } from '../models/step-result.js';
import { TestResultModel } from '../models/test-result.js';
import { BuilderModel } from '../models/builder.js';
import { WebhookDeliveryModel } from '../models/webhook-delivery.js';
import { formatSignatureHeader } from '../lib/webhook-signing.js';
import { generateMachineSummary, type MachineSummary } from './summary.service.js';
import { getJobManager } from '../lib/jobs.js';
import { EmailService } from '../lib/email.js';

const APP_BASE_URL = process.env.APP_BASE_URL || 'https://app.blendedagents.com';

/** pg-boss job name for webhook delivery. */
export const WEBHOOK_JOB = 'deliver-webhook';

/** Retry delays in seconds: 1 min, 5 min, 30 min. */
const RETRY_DELAYS = [60, 300, 1800];

/** Maximum number of retry attempts (excluding the initial attempt). */
const MAX_RETRIES = 3;

/** Timeout for webhook HTTP requests in milliseconds. */
const FETCH_TIMEOUT_MS = 10_000;

export interface WebhookPayload {
  event: string;
  test_case_id: string;
  external_id: string | null;
  template_id: string | null;
  verdict: string;
  summary: string | null;
  machine_summary: MachineSummary;
  steps_passed: number;
  steps_failed: number;
  steps_blocked: number;
  steps_total: number;
  per_step_results: Array<{
    step_index: number;
    status: string;
    severity: string | null;
    actual_behavior: string | null;
    screenshot_url: string | null;
    notes: string | null;
  }>;
  recording_url: string | null;
  environment: Record<string, string>;
  credits_charged: number;
  result_url: string;
  timestamp: string;
}

export const WebhookService = {
  /**
   * Assemble the full webhook payload for a completed test case.
   * Loads test case, step results, test result, and generates machine summary.
   */
  async assemblePayload(testCaseId: string): Promise<WebhookPayload> {
    const testCase = await TestCaseModel.findById(testCaseId);
    if (!testCase) {
      throw new Error(`Test case ${testCaseId} not found`);
    }

    const stepResults = await StepResultModel.findByTestCase(testCaseId);
    const testResult = await TestResultModel.findByTestCase(testCaseId);
    if (!testResult) {
      throw new Error(`Test result for test case ${testCaseId} not found`);
    }

    // Parse environment from test case metadata or default
    const environment: Record<string, string> = {};
    if (testCase.environment) {
      try {
        const parsed = JSON.parse(testCase.environment);
        if (typeof parsed === 'object' && parsed !== null) {
          Object.assign(environment, parsed);
        }
      } catch {
        environment.raw = testCase.environment;
      }
    }

    const machineSummary = generateMachineSummary({
      stepResults: stepResults.map((sr) => ({
        step_index: sr.step_index,
        status: sr.status,
        severity: sr.severity,
        actual_behavior: sr.actual_behavior,
        screenshot_url: sr.screenshot_url,
      })),
      testResult: {
        verdict: testResult.verdict,
        recording_url: testResult.recording_url,
      },
      environment,
      startedAt: testCase.assigned_at ?? testCase.created_at,
      completedAt: testCase.completed_at ?? new Date(),
    });

    // Build per-step results (excluding sensitive data)
    const perStepResults = stepResults.map((sr) => ({
      step_index: sr.step_index,
      status: sr.status,
      severity: sr.severity,
      actual_behavior: sr.actual_behavior,
      screenshot_url: sr.screenshot_url,
      notes: sr.notes,
    }));

    // Determine credits charged from metadata if available
    const creditsCharged =
      typeof testCase.metadata?.credits_charged === 'number'
        ? testCase.metadata.credits_charged
        : testResult.steps_total;

    return {
      event: 'test.completed',
      test_case_id: testCase.id,
      external_id: testCase.external_id,
      template_id: testCase.template_id,
      verdict: testResult.verdict,
      summary: testResult.summary,
      machine_summary: machineSummary,
      steps_passed: testResult.steps_passed,
      steps_failed: testResult.steps_failed,
      steps_blocked: testResult.steps_blocked,
      steps_total: testResult.steps_total,
      per_step_results: perStepResults,
      recording_url: testResult.recording_url,
      environment,
      credits_charged: creditsCharged,
      result_url: `${APP_BASE_URL}/results/${testCase.id}`,
      timestamp: new Date().toISOString(),
    };
  },

  /**
   * Deliver a webhook for a completed test case.
   * Signs the payload, POSTs to the builder's URL, records the attempt,
   * and schedules a retry on failure.
   */
  async deliverWebhook(
    testCaseId: string,
    attemptNumber = 1,
    existingDeliveryId?: string,
  ): Promise<void> {
    // Load test case to get builder_id
    const testCase = await TestCaseModel.findById(testCaseId);
    if (!testCase) {
      throw new Error(`Test case ${testCaseId} not found`);
    }

    const builder = await BuilderModel.findById(testCase.builder_id);
    if (!builder || !builder.webhook_url || !builder.webhook_secret) {
      // No webhook configured; silently skip
      return;
    }

    const payload = await this.assemblePayload(testCaseId);
    const payloadJson = JSON.stringify(payload);
    const signatureHeader = formatSignatureHeader(payloadJson, builder.webhook_secret);

    // Create or use existing delivery record
    let deliveryId = existingDeliveryId;
    if (!deliveryId) {
      const delivery = await WebhookDeliveryModel.create({
        builder_id: builder.id,
        test_case_id: testCaseId,
        event_type: 'test.completed',
        payload: payload as unknown as Record<string, unknown>,
        url: builder.webhook_url,
      });
      deliveryId = delivery.id;
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

      const response = await fetch(builder.webhook_url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-BlendedAgents-Signature': signatureHeader,
          'X-BlendedAgents-Event': 'test.completed',
          'X-BlendedAgents-Delivery': deliveryId,
        },
        body: payloadJson,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      const responseBody = await response.text().catch(() => null);

      if (response.ok) {
        // Successful delivery
        await WebhookDeliveryModel.updateAttempt(deliveryId, {
          response_status: response.status,
          response_body: responseBody,
          attempt_count: attemptNumber,
          delivered_at: new Date(),
          next_retry_at: null,
        });
      } else {
        // HTTP error - schedule retry
        await this.handleFailure(deliveryId, testCaseId, attemptNumber, response.status, responseBody);
      }
    } catch (err) {
      // Network error - schedule retry
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      await this.handleFailure(deliveryId, testCaseId, attemptNumber, 0, errorMessage);
    }
  },

  /**
   * Handle a failed delivery attempt: record the failure and schedule a retry if allowed.
   */
  async handleFailure(
    deliveryId: string,
    testCaseId: string,
    attemptNumber: number,
    statusCode: number,
    responseBody: string | null,
  ): Promise<void> {
    const canRetry = attemptNumber < MAX_RETRIES + 1;
    const nextRetryAt = canRetry
      ? new Date(Date.now() + RETRY_DELAYS[attemptNumber - 1] * 1000)
      : null;

    await WebhookDeliveryModel.updateAttempt(deliveryId, {
      response_status: statusCode,
      response_body: responseBody,
      attempt_count: attemptNumber,
      next_retry_at: nextRetryAt,
    });

    if (canRetry) {
      await this.scheduleRetry(deliveryId, testCaseId, attemptNumber);
    } else {
      // All retries exhausted — notify the builder via email (fire-and-forget)
      TestCaseModel.findById(testCaseId).then(async (tc) => {
        if (!tc) return;
        const builder = await BuilderModel.findById(tc.builder_id);
        if (!builder?.email) return;
        EmailService.sendWebhookFailed(builder.email, {
          title: tc.title,
          shortId: tc.short_id,
          webhookUrl: builder.webhook_url ?? '',
          retryCount: attemptNumber,
          lastError: responseBody ?? `HTTP ${statusCode}`,
        }).catch((err) => console.error('[webhook] failed to send webhook-failed email:', err));
      }).catch((err) => console.error('[webhook] failed to look up test case for failure email:', err));
    }
  },

  /**
   * Schedule a retry delivery via pg-boss with the appropriate delay.
   */
  async scheduleRetry(
    deliveryId: string,
    testCaseId: string,
    currentAttempt: number,
  ): Promise<void> {
    const boss = await getJobManager();
    const delaySeconds = RETRY_DELAYS[currentAttempt - 1] ?? RETRY_DELAYS[RETRY_DELAYS.length - 1];

    await boss.send(WEBHOOK_JOB, {
      testCaseId,
      deliveryId,
      attemptNumber: currentAttempt + 1,
    }, {
      startAfter: delaySeconds,
    });
  },

  /**
   * Trigger webhook delivery for a completed test case.
   * Enqueues a pg-boss job for immediate processing.
   */
  async triggerWebhookDelivery(testCaseId: string): Promise<void> {
    const boss = await getJobManager();
    await boss.send(WEBHOOK_JOB, {
      testCaseId,
      attemptNumber: 1,
    });
  },

  /**
   * Send a test ping to the builder's configured webhook URL.
   */
  async sendPing(builderId: string): Promise<{
    success: boolean;
    status_code: number;
    response_time_ms: number;
    error?: string;
  }> {
    const builder = await BuilderModel.findById(builderId);
    if (!builder || !builder.webhook_url || !builder.webhook_secret) {
      throw new Error('No webhook URL configured');
    }

    const pingPayload = {
      event: 'ping',
      timestamp: new Date().toISOString(),
    };

    const payloadJson = JSON.stringify(pingPayload);
    const signatureHeader = formatSignatureHeader(payloadJson, builder.webhook_secret);

    const startTime = Date.now();

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

      const response = await fetch(builder.webhook_url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-BlendedAgents-Signature': signatureHeader,
          'X-BlendedAgents-Event': 'ping',
        },
        body: payloadJson,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      const elapsed = Date.now() - startTime;

      return {
        success: response.ok,
        status_code: response.status,
        response_time_ms: elapsed,
        ...(response.ok ? {} : { error: `HTTP ${response.status}` }),
      };
    } catch (err) {
      const elapsed = Date.now() - startTime;
      return {
        success: false,
        status_code: 0,
        response_time_ms: elapsed,
        error: err instanceof Error ? err.message : 'Unknown error',
      };
    }
  },
};
