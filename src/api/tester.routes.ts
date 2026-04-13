import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { testerAuthPlugin } from '../middleware/tester-auth.js';
import { TestCaseModel } from '../models/test-case.js';
import { StepResultModel } from '../models/step-result.js';
import { AssignmentService } from '../services/assignment.service.js';
import { CredentialService } from '../services/credential.service.js';
import { S3Service } from '../services/s3.service.js';
import { TestCaseService } from '../services/test-case.service.js';
import { TesterModel } from '../models/tester.js';
import { TesterInviteModel } from '../models/tester-invite.js';
import { DEFAULT_ASSESSMENT_CONFIG, DEFAULT_ASSESSMENT_STEPS } from '../services/sandbox-scoring.service.js';
import { Errors } from '../lib/errors.js';
import { generateInviteCode } from '../lib/invite-code.js';
import sql from '../lib/db.js';

const SYSTEM_BUILDER_ID = '00000000-0000-0000-0000-000000000000';

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
      annotations_url: { type: 'string' },
    },
    additionalProperties: false,
  },
} as const;

const presignSchema = {
  body: {
    type: 'object',
    required: ['type', 'test_case_id', 'filename', 'content_type'],
    properties: {
      type: { type: 'string', enum: ['screenshot', 'recording', 'annotation'] },
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

const onboardingProfileSchema = {
  body: {
    type: 'object',
    required: ['devices', 'skills', 'languages', 'timezone'],
    properties: {
      devices: { type: 'array', items: { type: 'string' }, minItems: 1 },
      skills: { type: 'array', items: { type: 'string' }, minItems: 1 },
      languages: { type: 'array', items: { type: 'string' }, minItems: 1 },
      timezone: { type: 'string', minLength: 1 },
    },
    additionalProperties: false,
  },
} as const;

/** Guard: tester must be onboarded AND active to access task operations */
function requireActive(tester: { onboarded: boolean; is_active: boolean }) {
  if (!tester.onboarded) {
    throw Errors.forbidden('Please complete onboarding first');
  }
  if (!tester.is_active) {
    throw Errors.forbidden('Your account is pending activation. An admin will review your profile shortly.');
  }
}

/** Check if a task is the tester's assessment task */
async function isAssessmentTask(testerId: string, taskId: string): Promise<boolean> {
  const [row] = await sql<{ id: string }[]>`
    SELECT id FROM test_cases
    WHERE id = ${taskId}
      AND assigned_tester_id = ${testerId}
      AND type = 'onboarding_assessment'
  `;
  return !!row;
}

/** Guard for task routes: allow assessment tasks for non-onboarded testers */
async function requireActiveOrAssessment(tester: { id: string; onboarded: boolean; is_active: boolean }, taskId: string) {
  if (tester.onboarded && tester.is_active) return;
  if (!tester.onboarded && await isAssessmentTask(tester.id, taskId)) return;
  requireActive(tester);
}

export async function testerRoutes(app: FastifyInstance) {
  // Register auth directly (not as a child plugin) so hooks apply to all routes
  await testerAuthPlugin(app);

  // Shared pagination helper
  function parsePagination(query: { page?: string; limit?: string; search?: string }) {
    const page = query.page ? Math.max(1, parseInt(query.page, 10) || 1) : 1;
    const limit = query.limit ? Math.min(Math.max(1, parseInt(query.limit, 10) || 10), 100) : 10;
    const offset = (page - 1) * limit;
    const search = query.search?.trim() || null;
    return { page, limit, offset, search };
  }

  // GET /tasks — list tester's assigned tasks (read-only, no active guard)
  app.get('/tasks', async (request: FastifyRequest<{
    Querystring: { page?: string; limit?: string; search?: string };
  }>) => {
    const tester = request.tester!;
    const { page, limit, offset, search } = parsePagination(request.query);

    const searchCond = search ? sql`AND (tc.title ILIKE ${'%' + search + '%'} OR tc.description ILIKE ${'%' + search + '%'})` : sql``;

    const [{ count }] = await sql<[{ count: number }]>`
      SELECT count(*)::int AS count FROM test_cases tc
      WHERE tc.assigned_tester_id = ${tester.id} AND tc.status IN ('assigned', 'in_progress') ${searchCond}
    `;

    const tasks = await sql<Array<{
      id: string; title: string; description: string | null; url: string | null;
      status: string; steps: Record<string, unknown>[]; environment: string | null; assigned_at: Date | null;
    }>>`
      SELECT tc.id, tc.title, tc.description, tc.url, tc.status, tc.steps, tc.environment, tc.assigned_at
      FROM test_cases tc
      WHERE tc.assigned_tester_id = ${tester.id} AND tc.status IN ('assigned', 'in_progress') ${searchCond}
      ORDER BY tc.assigned_at DESC LIMIT ${limit} OFFSET ${offset}
    `;

    return {
      tasks: tasks.map((t) => ({
        id: t.id, title: t.title, description: t.description, url: t.url, status: t.status,
        step_count: Array.isArray(t.steps) ? t.steps.length : 0,
        environment: t.environment, assigned_at: t.assigned_at?.toISOString() ?? null,
      })),
      total: count, page, per_page: limit, total_pages: Math.max(1, Math.ceil(count / limit)),
    };
  });

  // GET /tasks/completed — list tester's completed tasks with earnings (read-only)
  app.get('/tasks/completed', async (request: FastifyRequest<{
    Querystring: { page?: string; limit?: string; search?: string };
  }>) => {
    const tester = request.tester!;
    const { page, limit, offset, search } = parsePagination(request.query);

    const searchCond = search ? sql`AND (tc.title ILIKE ${'%' + search + '%'} OR tc.description ILIKE ${'%' + search + '%'})` : sql``;

    const [{ count }] = await sql<[{ count: number }]>`
      SELECT count(*)::int AS count FROM test_cases tc
      WHERE tc.assigned_tester_id = ${tester.id} AND tc.status IN ('completed', 'submitted') AND tc.type = 'standard' ${searchCond}
    `;

    const tasks = await sql<Array<{
      id: string; title: string; description: string | null; url: string | null;
      status: string; steps: Record<string, unknown>[]; environment: string | null;
      completed_at: Date | null; payout_cents: string | null;
    }>>`
      SELECT tc.id, tc.title, tc.description, tc.url, tc.status, tc.steps, tc.environment, tc.completed_at,
        (SELECT t.currency_amount_cents FROM transactions t
         WHERE t.test_case_id = tc.id AND t.tester_id = ${tester.id} AND t.type = 'payout'
         LIMIT 1)::text AS payout_cents
      FROM test_cases tc
      WHERE tc.assigned_tester_id = ${tester.id} AND tc.status IN ('completed', 'submitted') AND tc.type = 'standard' ${searchCond}
      ORDER BY tc.completed_at DESC LIMIT ${limit} OFFSET ${offset}
    `;

    return {
      tasks: tasks.map((t) => ({
        id: t.id, title: t.title, description: t.description, url: t.url, status: t.status,
        step_count: Array.isArray(t.steps) ? t.steps.length : 0, environment: t.environment,
        assigned_at: null, completed_at: t.completed_at?.toISOString() ?? null,
        earnings_cents: t.payout_cents ? parseInt(t.payout_cents, 10) : null,
      })),
      total: count, page, per_page: limit, total_pages: Math.max(1, Math.ceil(count / limit)),
    };
  });

  // GET /available — list all queued tasks testers can request (read-only)
  app.get('/available', async (request: FastifyRequest<{
    Querystring: { page?: string; limit?: string; search?: string };
  }>) => {
    const tester = request.tester!;
    const { page, limit, offset, search } = parsePagination(request.query);

    const searchCond = search ? sql`AND (tc.title ILIKE ${'%' + search + '%'} OR tc.description ILIKE ${'%' + search + '%'})` : sql``;

    const [{ count }] = await sql<[{ count: number }]>`
      SELECT count(*)::int AS count FROM test_cases tc WHERE tc.status = 'queued' ${searchCond}
    `;

    const tasks = await sql<Array<{
      id: string; title: string; description: string | null; url: string | null;
      steps: Record<string, unknown>[]; environment: string | null;
      tags: string[]; required_skills: string[]; created_at: Date;
      request_count: string; my_request_status: string | null;
    }>>`
      SELECT
        tc.id, tc.title, tc.description, tc.url, tc.steps, tc.environment,
        tc.tags, tc.required_skills, tc.created_at,
        (SELECT count(*) FROM task_requests tr WHERE tr.test_case_id = tc.id AND tr.status = 'pending')::text AS request_count,
        (SELECT tr.status FROM task_requests tr WHERE tr.test_case_id = tc.id AND tr.tester_id = ${tester.id} LIMIT 1) AS my_request_status
      FROM test_cases tc
      WHERE tc.status = 'queued' ${searchCond}
      ORDER BY tc.created_at DESC LIMIT ${limit} OFFSET ${offset}
    `;

    return {
      tasks: tasks.map((t) => ({
        id: t.id, title: t.title, description: t.description, url: t.url,
        step_count: Array.isArray(t.steps) ? t.steps.length : 0, environment: t.environment,
        tags: t.tags, required_skills: t.required_skills, created_at: t.created_at.toISOString(),
        request_count: parseInt(t.request_count, 10), my_request_status: t.my_request_status,
      })),
      total: count, page, per_page: limit, total_pages: Math.max(1, Math.ceil(count / limit)),
    };
  });

  // POST /available/:id/request — request to work on a task
  app.post('/available/:id/request', async (request: FastifyRequest<{
    Params: { id: string };
    Body: { message?: string };
  }>, reply) => {
    const tester = request.tester!;
    requireActive(tester);
    const { id } = request.params;
    const message = (request.body as { message?: string })?.message ?? null;

    // Verify task exists and is queued
    const [task] = await sql`SELECT id, status FROM test_cases WHERE id = ${id}`;
    if (!task) throw Errors.notFound('Test case');
    if (task.status !== 'queued') {
      throw Errors.badRequest('This task is no longer available');
    }

    // Insert request (unique constraint prevents duplicates)
    try {
      const [created] = await sql`
        INSERT INTO task_requests (test_case_id, tester_id, message)
        VALUES (${id}, ${tester.id}, ${message})
        RETURNING id, created_at
      `;

      // Schedule selection check after the platform-defined window
      try {
        const { getJobManager } = await import('../lib/jobs.js');
        const boss = await getJobManager();
        const [cfg] = await sql<{ value: string }[]>`
          SELECT value::text FROM platform_config WHERE key = 'selection_window_minutes'
        `;
        const windowSeconds = (cfg ? parseInt(cfg.value, 10) : 30) * 60;
        await boss.send('select-tester', { testCaseId: id }, {
          startAfter: windowSeconds,
          singletonKey: `select:${id}`,
        });
      } catch { /* non-fatal */ }

      reply.status(201).send({ id: created.id, status: 'pending', created_at: created.created_at });
    } catch (err: unknown) {
      if ((err as { code?: string }).code === '23505') {
        throw Errors.badRequest('You have already requested this task');
      }
      throw err;
    }
  });

  // DELETE /available/:id/request — withdraw a request
  app.delete('/available/:id/request', async (request: FastifyRequest<{
    Params: { id: string };
  }>, reply) => {
    const tester = request.tester!;
    requireActive(tester);
    const { id } = request.params;

    await sql`
      DELETE FROM task_requests
      WHERE test_case_id = ${id} AND tester_id = ${tester.id} AND status = 'pending'
    `;
    reply.status(204).send();
  });

  // GET /tasks/:id — get task detail
  app.get('/tasks/:id', async (request: FastifyRequest<{
    Params: { id: string };
  }>) => {
    const tester = request.tester!;
    const { id } = request.params;
    await requireActiveOrAssessment(tester, id);

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
      type: task.type,
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

  // GET /tasks/:id/result — fetch completed flow-test result with signed recording URL
  app.get('/tasks/:id/result', async (request: FastifyRequest<{
    Params: { id: string };
  }>) => {
    const tester = request.tester!;
    const { id } = request.params;
    await requireActiveOrAssessment(tester, id);
    return TestCaseService.getResultsForTester(id, tester.id);
  });

  // POST /tasks/:id/start — start test execution
  app.post('/tasks/:id/start', async (request: FastifyRequest<{
    Params: { id: string };
  }>, reply: FastifyReply) => {
    const tester = request.tester!;
    await requireActiveOrAssessment(tester, request.params.id);
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
    await requireActiveOrAssessment(tester, id);
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
    const isAssessment = task.type === 'onboarding_assessment';

    // Validate required fields for failed status (screenshots optional for assessments)
    if (status === 'failed') {
      if (!severity) {
        throw Errors.badRequest('Severity is required when marking a step as failed');
      }
      if (!isAssessment && !screenshot_url) {
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
      annotations_url?: string;
    };
  }>, reply: FastifyReply) => {
    const tester = request.tester!;
    const { id } = request.params;
    await requireActiveOrAssessment(tester, id);
    const { verdict, summary, recording_url, annotations_url } = request.body;

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

    await AssignmentService.submitFlowResults(id, tester.id, {
      verdict,
      summary,
      recording_url,
      annotations_url,
      steps,
    });

    reply.status(200).send({ status: 'completed' });
  });

  // POST /upload/presign — get S3 presigned URL
  app.post('/upload/presign', {
    schema: presignSchema,
  }, async (request: FastifyRequest<{
    Body: {
      type: 'screenshot' | 'recording' | 'annotation';
      test_case_id: string;
      filename: string;
      content_type: string;
    };
  }>) => {
    const tester = request.tester!;
    const { type, test_case_id, filename, content_type } = request.body;
    await requireActiveOrAssessment(tester, test_case_id);

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
      devices: tester.devices,
      region: tester.region,
      is_available: tester.is_available,
      is_active: tester.is_active,
      onboarded: tester.onboarded,
      timezone: tester.timezone,
      tasks_total: tester.tasks_total,
      tasks_completed: tester.tasks_completed,
      avg_completion_minutes: tester.avg_completion_minutes,
      earnings_cents: tester.earnings_cents,
      created_at: tester.created_at.toISOString(),
    };
  });

  // ─── Onboarding ────────────────────────────────────────────────

  // POST /onboarding/profile — save profile + create assessment task
  app.post('/onboarding/profile', {
    schema: onboardingProfileSchema,
  }, async (request: FastifyRequest<{
    Body: { devices: string[]; skills: string[]; languages: string[]; timezone: string };
  }>) => {
    const tester = request.tester!;
    if (tester.onboarded) throw Errors.badRequest('Onboarding already completed');

    const { devices, skills, languages, timezone } = request.body;

    await TesterModel.update(tester.id, { devices, skills, languages, timezone });

    // Check if assessment task already exists
    const [existing] = await sql<{ id: string }[]>`
      SELECT id FROM test_cases
      WHERE assigned_tester_id = ${tester.id} AND type = 'onboarding_assessment'
      LIMIT 1
    `;

    if (existing) {
      return { assessment_task_id: existing.id };
    }

    // Create assessment test case and assign directly to the tester
    const task = await TestCaseModel.create({
      builder_id: SYSTEM_BUILDER_ID,
      title: 'Onboarding Assessment: Acme Shop Checkout',
      description: 'Test this checkout page and report any bugs you find. This assessment determines your readiness to take real testing tasks.',
      url: '/sandbox/index.html',
      steps: DEFAULT_ASSESSMENT_STEPS,
      environment: 'sandbox',
      tags: ['assessment'],
      metadata: {},
      status_history: [
        { status: 'queued', at: new Date().toISOString() },
        { status: 'assigned', at: new Date().toISOString() },
      ],
    });

    // Assign directly — skip queue/matching
    await sql`
      UPDATE test_cases
      SET status = 'assigned',
          type = 'onboarding_assessment',
          assigned_tester_id = ${tester.id},
          assigned_at = NOW(),
          assessment_config = ${sql.json(DEFAULT_ASSESSMENT_CONFIG as never)}
      WHERE id = ${task.id}
    `;

    return { assessment_task_id: task.id };
  });

  // GET /onboarding/assessment — get assessment task status for the current tester
  app.get('/onboarding/assessment', async (request: FastifyRequest) => {
    const tester = request.tester!;

    const [task] = await sql<{ id: string; status: string; assessment_config: Record<string, unknown> | null }[]>`
      SELECT id, status, assessment_config FROM test_cases
      WHERE assigned_tester_id = ${tester.id} AND type = 'onboarding_assessment'
      ORDER BY created_at DESC LIMIT 1
    `;

    if (!task) return { assessment: null };

    return {
      assessment: {
        task_id: task.id,
        status: task.status,
      },
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
      devices: updated.devices,
      region: updated.region,
      is_available: updated.is_available,
      is_active: updated.is_active,
      onboarded: updated.onboarded,
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

  // GET /invites — list tester's invite codes
  app.get('/invites', async (request: FastifyRequest) => {
    const tester = request.tester!;
    requireActive(tester);

    const invites = await TesterInviteModel.findByInviter(tester.id);
    const usedCount = invites.filter(i => i.used_by_id).length;

    return {
      max_invites: tester.max_invites,
      used_count: usedCount,
      remaining: tester.max_invites - invites.length,
      invites: invites.map(i => ({
        id: i.id,
        code: i.code,
        used: !!i.used_by_id,
        used_at: i.used_at?.toISOString() ?? null,
        created_at: i.created_at.toISOString(),
      })),
    };
  });

  // POST /invites — generate a new invite code
  app.post('/invites', async (request: FastifyRequest, reply: FastifyReply) => {
    const tester = request.tester!;
    requireActive(tester);

    const existingCount = await TesterInviteModel.countByInviter(tester.id);
    if (existingCount >= tester.max_invites) {
      throw Errors.badRequest('No invite slots remaining');
    }

    let invite;
    for (let attempt = 0; attempt < 5; attempt++) {
      try {
        invite = await TesterInviteModel.create({
          inviter_id: tester.id,
          code: generateInviteCode(),
        });
        break;
      } catch (err: unknown) {
        if ((err as { code?: string }).code === '23505' && attempt < 4) continue;
        throw err;
      }
    }

    reply.status(201);
    return {
      id: invite!.id,
      code: invite!.code,
      created_at: invite!.created_at.toISOString(),
    };
  });

  // GET /earnings — earnings history from payout transactions
  app.get('/earnings', async (request: FastifyRequest) => {
    // Re-fetch tester to get latest earnings_cents
    const fresh = await TesterModel.findById(request.tester!.id);
    const tester = fresh || request.tester!;

    const payouts = await sql<Array<{
      id: string;
      test_case_id: string;
      currency_amount_cents: number;
      description: string;
      created_at: Date;
    }>>`
      SELECT id, test_case_id, currency_amount_cents, description, created_at
      FROM transactions
      WHERE tester_id = ${tester.id} AND type = 'payout'
      ORDER BY created_at DESC
    `;

    return {
      total_earnings_cents: tester.earnings_cents,
      earnings: payouts.map((p) => ({
        id: p.id,
        test_case_id: p.test_case_id,
        amount_cents: p.currency_amount_cents,
        status: 'completed',
        created_at: p.created_at.toISOString(),
      })),
    };
  });
}
