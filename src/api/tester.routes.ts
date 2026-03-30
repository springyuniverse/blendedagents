import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { testerAuthPlugin } from '../middleware/tester-auth.js';
import { TestCaseModel } from '../models/test-case.js';
import { StepResultModel } from '../models/step-result.js';
import { AssignmentService } from '../services/assignment.service.js';
import { CredentialService } from '../services/credential.service.js';
import { S3Service } from '../services/s3.service.js';
import { TesterModel } from '../models/tester.js';
import { Errors } from '../lib/errors.js';
import sql from '../lib/db.js';

const stepResultSchema = {
  body: {
    type: 'object',
    required: ['status'],
    properties: {
      status: { type: 'string', enum: ['passed', 'failed', 'blocked', 'skipped'] },
      severity: { type: 'string', enum: ['critical', 'major', 'minor', 'cosmetic'] },
      actual_behavior: { type: 'string' },
      screenshot_url: { type: 'string' },
      notes: { type: 'string' },
    },
    additionalProperties: false,
  },
} as const;

const submitSchema = {
  body: {
    type: 'object',
    required: ['verdict', 'summary'],
    properties: {
      verdict: { type: 'string', enum: ['pass', 'fail', 'partial', 'blocked'] },
      summary: { type: 'string', minLength: 1, maxLength: 1000 },
      recording_url: { type: 'string' },
    },
    additionalProperties: false,
  },
} as const;

const presignSchema = {
  body: {
    type: 'object',
    required: ['type', 'test_case_id', 'filename', 'content_type'],
    properties: {
      type: { type: 'string', enum: ['screenshot', 'recording'] },
      test_case_id: { type: 'string', format: 'uuid' },
      filename: { type: 'string', minLength: 1, maxLength: 255 },
      content_type: { type: 'string', minLength: 1 },
    },
    additionalProperties: false,
  },
} as const;

const profileUpdateSchema = {
  body: {
    type: 'object',
    properties: {
      display_name: { type: 'string', minLength: 1, maxLength: 100 },
      timezone: { type: 'string', minLength: 1, maxLength: 100 },
    },
    additionalProperties: false,
  },
} as const;

const availabilitySchema = {
  body: {
    type: 'object',
    required: ['is_available'],
    properties: {
      is_available: { type: 'boolean' },
    },
    additionalProperties: false,
  },
} as const;

export async function testerRoutes(app: FastifyInstance) {
  app.register(testerAuthPlugin);

  // GET /tasks — list tester's assigned tasks
  app.get('/tasks', async (request: FastifyRequest) => {
    const tester = request.tester!;

    const tasks = await sql<Array<{
      id: string;
      title: string;
      description: string | null;
      url: string | null;
      status: string;
      steps: Record<string, unknown>[];
      environment: string | null;
      assigned_at: Date | null;
    }>>`
      SELECT id, title, description, url, status, steps, environment, assigned_at
      FROM test_cases
      WHERE assigned_tester_id = ${tester.id}
        AND status IN ('assigned', 'in_progress')
      ORDER BY assigned_at DESC
    `;

    return {
      tasks: tasks.map((t) => ({
        id: t.id,
        title: t.title,
        description: t.description,
        url: t.url,
        status: t.status,
        step_count: Array.isArray(t.steps) ? t.steps.length : 0,
        environment: t.environment,
        assigned_at: t.assigned_at?.toISOString() ?? null,
      })),
    };
  });

  // GET /tasks/:id — get task detail
  app.get('/tasks/:id', async (request: FastifyRequest<{
    Params: { id: string };
  }>) => {
    const tester = request.tester!;
    const { id } = request.params;

    const task = await TestCaseModel.findById(id);
    if (!task) {
      throw Errors.notFound('Task');
    }

    if (task.assigned_tester_id !== tester.id) {
      throw Errors.forbidden('This task is not assigned to you');
    }

    const hasCredentials = !!task.credentials;
    let decryptedCredentials: Record<string, unknown> | null = null;

    if (task.status === 'in_progress' && task.credentials) {
      try {
        decryptedCredentials = CredentialService.decrypt(
          task.credentials as { encrypted: string; key_version: number },
        );
      } catch {
        // If decryption fails, credentials are unavailable but test can proceed
        decryptedCredentials = null;
      }
    }

    // Get existing step results for resume support
    const stepResults = await StepResultModel.findByTestCase(id);

    return {
      id: task.id,
      title: task.title,
      description: task.description,
      url: task.url,
      status: task.status,
      steps: task.steps,
      expected_behavior: task.expected_behavior,
      environment: task.environment,
      has_credentials: hasCredentials,
      credentials: decryptedCredentials,
      assigned_at: task.assigned_at?.toISOString() ?? null,
      step_results: stepResults.map((sr) => ({
        id: sr.id,
        step_index: sr.step_index,
        status: sr.status,
        severity: sr.severity,
        actual_behavior: sr.actual_behavior,
        screenshot_url: sr.screenshot_url,
        notes: sr.notes,
        created_at: sr.created_at.toISOString(),
      })),
    };
  });

  // POST /tasks/:id/start — start test execution
  app.post('/tasks/:id/start', async (request: FastifyRequest<{
    Params: { id: string };
  }>, reply: FastifyReply) => {
    const tester = request.tester!;
    const { id } = request.params;

    // acceptAssignment validates ownership and status
    await AssignmentService.acceptAssignment(id, tester.id);

    // Fetch task to return credentials
    const task = await TestCaseModel.findById(id);
    let decryptedCredentials: Record<string, unknown> | null = null;

    if (task?.credentials) {
      try {
        decryptedCredentials = CredentialService.decrypt(
          task.credentials as { encrypted: string; key_version: number },
        );
      } catch {
        decryptedCredentials = null;
      }
    }

    reply.status(200).send({
      status: 'in_progress',
      credentials: decryptedCredentials,
    });
  });

  // POST /tasks/:id/steps/:index — submit individual step result
  app.post('/tasks/:id/steps/:index', {
    schema: stepResultSchema,
  }, async (request: FastifyRequest<{
    Params: { id: string; index: string };
    Body: {
      status: string;
      severity?: string;
      actual_behavior?: string;
      screenshot_url?: string;
      notes?: string;
    };
  }>, reply: FastifyReply) => {
    const tester = request.tester!;
    const { id, index: indexStr } = request.params;
    const stepIndex = parseInt(indexStr, 10);

    if (isNaN(stepIndex) || stepIndex < 0) {
      throw Errors.badRequest('Invalid step index', { step_index: indexStr });
    }

    const task = await TestCaseModel.findById(id);
    if (!task) {
      throw Errors.notFound('Task');
    }

    if (task.assigned_tester_id !== tester.id) {
      throw Errors.forbidden('This task is not assigned to you');
    }

    if (task.status !== 'in_progress') {
      throw Errors.conflict('TASK_NOT_STARTED', 'Test must be started before submitting step results', {
        current_status: task.status,
      });
    }

    // Validate step index exists
    if (stepIndex >= task.steps.length) {
      throw Errors.badRequest(`Step index ${stepIndex} is out of range (${task.steps.length} steps)`, {
        step_index: stepIndex,
        total_steps: task.steps.length,
      });
    }

    const { status, severity, actual_behavior, screenshot_url, notes } = request.body;

    // Validate required fields for failed status
    if (status === 'failed') {
      if (!severity) {
        throw Errors.badRequest('Severity is required when marking a step as failed');
      }
      if (!screenshot_url) {
        throw Errors.badRequest('Screenshot is required when marking a step as failed');
      }
      if (!actual_behavior) {
        throw Errors.badRequest('Actual behavior description is required when marking a step as failed');
      }
    }

    // Validate skip requires notes
    if (status === 'skipped' && !notes) {
      throw Errors.badRequest('A reason (notes) is required when skipping a step');
    }

    const stepResult = await StepResultModel.create({
      test_case_id: id,
      tester_id: tester.id,
      step_index: stepIndex,
      status,
      severity: severity ?? null,
      actual_behavior: actual_behavior ?? null,
      screenshot_url: screenshot_url ?? null,
      notes: notes ?? null,
    });

    reply.status(201).send({
      id: stepResult.id,
      step_index: stepResult.step_index,
      status: stepResult.status,
      severity: stepResult.severity,
      created_at: stepResult.created_at.toISOString(),
    });
  });

  // POST /tasks/:id/submit — submit completed test
  app.post('/tasks/:id/submit', {
    schema: submitSchema,
  }, async (request: FastifyRequest<{
    Params: { id: string };
    Body: {
      verdict: string;
      summary: string;
      recording_url?: string;
    };
  }>, reply: FastifyReply) => {
    const tester = request.tester!;
    const { id } = request.params;
    const { verdict, summary, recording_url } = request.body;

    const task = await TestCaseModel.findById(id);
    if (!task) {
      throw Errors.notFound('Task');
    }

    if (task.assigned_tester_id !== tester.id) {
      throw Errors.forbidden('This task is not assigned to you');
    }

    if (task.status !== 'in_progress') {
      throw Errors.conflict('CANNOT_SUBMIT', `Test case cannot be submitted because it is ${task.status}`, {
        current_status: task.status,
      });
    }

    // Validate all steps have results
    const stepResults = await StepResultModel.findByTestCase(id);
    if (stepResults.length < task.steps.length) {
      throw Errors.badRequest(
        `All steps must have results before submission. ${stepResults.length}/${task.steps.length} steps completed.`,
        { completed: stepResults.length, total: task.steps.length },
      );
    }

    // Build step data from existing step results for AssignmentService.submitResults
    const steps = stepResults.map((sr) => ({
      step_index: sr.step_index,
      status: sr.status,
      severity: sr.severity ?? undefined,
      actual_behavior: sr.actual_behavior ?? undefined,
      screenshot_url: sr.screenshot_url ?? undefined,
      notes: sr.notes ?? undefined,
    }));

    await AssignmentService.submitResults(id, tester.id, {
      verdict,
      summary,
      recording_url,
      steps,
    });

    reply.status(200).send({ status: 'completed' });
  });

  // POST /upload/presign — get S3 presigned URL
  app.post('/upload/presign', {
    schema: presignSchema,
  }, async (request: FastifyRequest<{
    Body: {
      type: 'screenshot' | 'recording';
      test_case_id: string;
      filename: string;
      content_type: string;
    };
  }>) => {
    const tester = request.tester!;
    const { type, test_case_id, filename, content_type } = request.body;

    // Verify tester owns this task
    const task = await TestCaseModel.findById(test_case_id);
    if (!task || task.assigned_tester_id !== tester.id) {
      throw Errors.forbidden('Cannot upload files for tasks not assigned to you');
    }

    const key = S3Service.generateKey(type, test_case_id, filename);
    const uploadUrl = await S3Service.getUploadUrl(key, content_type);

    return {
      upload_url: uploadUrl,
      key,
      expires_in: 3600,
    };
  });

  // GET /profile — get tester profile
  app.get('/profile', async (request: FastifyRequest) => {
    const tester = request.tester!;

    return {
      id: tester.id,
      display_name: tester.display_name,
      email: tester.email,
      avatar_url: tester.avatar_url,
      skills: tester.skills,
      languages: tester.languages,
      region: tester.region,
      is_available: tester.is_available,
      timezone: tester.timezone,
      tasks_total: tester.tasks_total,
      tasks_completed: tester.tasks_completed,
      avg_completion_minutes: tester.avg_completion_minutes,
      earnings_cents: tester.earnings_cents,
      created_at: tester.created_at.toISOString(),
    };
  });

  // PUT /profile — update profile
  app.put('/profile', {
    schema: profileUpdateSchema,
  }, async (request: FastifyRequest<{
    Body: {
      display_name?: string;
      timezone?: string;
    };
  }>) => {
    const tester = request.tester!;
    const { display_name, timezone } = request.body;

    const updateData: Record<string, unknown> = {};
    if (display_name !== undefined) updateData.display_name = display_name;
    if (timezone !== undefined) updateData.timezone = timezone;

    if (Object.keys(updateData).length === 0) {
      throw Errors.badRequest('No fields to update');
    }

    const updated = await TesterModel.update(tester.id, updateData);

    return {
      id: updated.id,
      display_name: updated.display_name,
      email: updated.email,
      avatar_url: updated.avatar_url,
      skills: updated.skills,
      languages: updated.languages,
      region: updated.region,
      is_available: updated.is_available,
      timezone: updated.timezone,
      tasks_total: updated.tasks_total,
      tasks_completed: updated.tasks_completed,
      avg_completion_minutes: updated.avg_completion_minutes,
      earnings_cents: updated.earnings_cents,
      created_at: updated.created_at.toISOString(),
    };
  });

  // PUT /availability — toggle availability
  app.put('/availability', {
    schema: availabilitySchema,
  }, async (request: FastifyRequest<{
    Body: { is_available: boolean };
  }>) => {
    const tester = request.tester!;
    const { is_available } = request.body;

    await TesterModel.update(tester.id, { is_available });

    return { is_available };
  });

  // GET /earnings — earnings history
  app.get('/earnings', async (request: FastifyRequest) => {
    const tester = request.tester!;

    const earnings = await sql<Array<{
      id: string;
      test_case_id: string;
      amount_cents: number;
      status: string;
      created_at: Date;
    }>>`
      SELECT id, test_case_id, amount_cents, status, created_at
      FROM tester_payout_records
      WHERE tester_id = ${tester.id}
      ORDER BY created_at DESC
    `;

    return {
      total_earnings_cents: tester.earnings_cents,
      earnings: earnings.map((e) => ({
        id: e.id,
        test_case_id: e.test_case_id,
        amount_cents: e.amount_cents,
        status: e.status,
        created_at: e.created_at.toISOString(),
      })),
    };
  });
}
