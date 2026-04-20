import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { builderAuthPlugin } from '../middleware/builder-auth.js';
import { testerAuthPlugin } from '../middleware/tester-auth.js';
import { TestCaseService } from '../services/test-case.service.js';
import { AssignmentService } from '../services/assignment.service.js';
import { Errors } from '../lib/errors.js';
import { EmailService, sendAdminNotification } from '../lib/email.js';
import { TestCaseModel, type TestCase } from '../models/test-case.js';
import sql from '../lib/db.js';

const VALID_STATUSES = ['queued', 'assigned', 'in_progress', 'completed', 'cancelled', 'expired', 'needs_info'];

const createFlowTestSchema = {
  type: 'object',
  required: ['template_type', 'title', 'staging_url', 'steps', 'expected_behavior'],
  properties: {
    template_type: { type: 'string', const: 'flow_test' },
    title: { type: 'string', minLength: 1, maxLength: 255 },
    description: { type: 'string', maxLength: 5000 },
    staging_url: { type: 'string', format: 'uri' },
    steps: {
      type: 'array',
      minItems: 1,
      maxItems: 50,
      items: {
        type: 'object',
        required: ['instruction'],
        properties: {
          instruction: { type: 'string', minLength: 1 },
          expected_behavior: { type: 'string' },
        },
      },
    },
    expected_behavior: { type: 'string', minLength: 1, maxLength: 5000 },
    credentials: { type: 'object' },
    environment: { type: 'string' },
    tags: { type: 'array', items: { type: 'string' } },
    external_id: { type: 'string' },
    callback_url: { type: 'string', format: 'uri' },
    required_skills: { type: 'array', items: { type: 'string' } },
  },
  additionalProperties: false,
} as const;

const createReviewTestSchema = {
  type: 'object',
  required: ['template_type', 'title', 'staging_url', 'context', 'devices_to_check'],
  properties: {
    template_type: { type: 'string', const: 'review_test' },
    title: { type: 'string', minLength: 1, maxLength: 255 },
    description: { type: 'string', maxLength: 5000 },
    staging_url: { type: 'string', format: 'uri' },
    context: { type: 'string', minLength: 10, maxLength: 1500 },
    devices_to_check: {
      type: 'array',
      minItems: 1,
      maxItems: 6,
      items: { type: 'string', enum: ['desktop_chrome', 'desktop_firefox', 'desktop_safari', 'mobile_safari', 'mobile_android', 'tablet'] },
    },
    focus_areas: {
      type: 'array',
      maxItems: 6,
      items: { type: 'string', enum: ['layout', 'typography', 'forms', 'images', 'content', 'functionality'] },
    },
    ignore_areas: { type: 'string', maxLength: 1000 },
    credentials: { type: 'object' },
    environment: { type: 'string' },
    tags: { type: 'array', items: { type: 'string' } },
    external_id: { type: 'string' },
    callback_url: { type: 'string', format: 'uri' },
    required_skills: { type: 'array', items: { type: 'string' } },
  },
  additionalProperties: false,
} as const;

const createTestCaseSchema = {
  body: {
    oneOf: [createFlowTestSchema, createReviewTestSchema],
  },
} as const;

const submitFlowResultsSchema = {
  body: {
    type: 'object',
    required: ['verdict', 'steps'],
    properties: {
      verdict: { type: 'string', enum: ['pass', 'fail', 'partial', 'blocked'] },
      summary: { type: 'string' },
      recording_url: { type: 'string', format: 'uri' },
      steps: {
        type: 'array',
        minItems: 1,
        items: {
          type: 'object',
          required: ['step_index', 'status'],
          properties: {
            step_index: { type: 'integer', minimum: 0 },
            status: { type: 'string', enum: ['passed', 'failed', 'blocked', 'skipped'] },
            severity: { type: 'string', enum: ['critical', 'major', 'minor', 'cosmetic'] },
            actual_behavior: { type: 'string' },
            screenshot_url: { type: 'string', format: 'uri' },
            notes: { type: 'string' },
          },
        },
      },
    },
    additionalProperties: false,
  },
} as const;

const submitReviewResultsSchema = {
  body: {
    type: 'object',
    required: ['verdict', 'findings'],
    properties: {
      verdict: { type: 'string', enum: ['issues_found', 'no_issues'] },
      summary: { type: 'string' },
      findings: {
        type: 'array',
        maxItems: 10,
        items: {
          type: 'object',
          required: ['severity', 'category', 'description', 'device', 'location'],
          properties: {
            severity: { type: 'string', enum: ['critical', 'major', 'minor'] },
            category: { type: 'string', enum: ['functionality', 'layout', 'content', 'typography', 'forms', 'images'] },
            description: { type: 'string', minLength: 1 },
            screenshot_url: { type: 'string', format: 'uri' },
            device: { type: 'string', minLength: 1 },
            location: { type: 'string', minLength: 1 },
          },
        },
      },
    },
    additionalProperties: false,
  },
} as const;

export async function testCasesRoutes(app: FastifyInstance) {
  // Builder-authenticated routes
  app.register(async (builderScope) => {
    await builderAuthPlugin(builderScope);

    // POST /api/v1/test-cases — create test case
    builderScope.post('/', {
      schema: createTestCaseSchema,
    }, async (request: FastifyRequest<{
      Body: {
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
      };
    }>, reply: FastifyReply) => {
      const builder = request.builder!;
      const result = await TestCaseService.create(builder.id, request.body);

      // Admin notification (fire-and-forget)
      sendAdminNotification('test_case_submitted', {
        actorName: builder.display_name,
        actorEmail: builder.email,
        message: `${builder.display_name} submitted a new ${request.body.template_type === 'review_test' ? 'review' : 'flow'} test: "${request.body.title}".`,
      });

      reply.status(201).send(result);
    });

    // GET /api/v1/test-cases — list with status filter, search, and pagination
    builderScope.get('/', async (request: FastifyRequest<{
      Querystring: { status?: string; search?: string; page?: string; cursor?: string; limit?: string };
    }>) => {
      const builder = request.builder!;
      const { status, search, page: pageStr, cursor, limit: limitStr } = request.query;

      if (status && !VALID_STATUSES.includes(status)) {
        throw Errors.invalidFilter('status', status, VALID_STATUSES);
      }

      const limit = limitStr ? parseInt(limitStr, 10) : undefined;
      if (limit !== undefined && (isNaN(limit) || limit < 1 || limit > 500)) {
        throw Errors.badRequest('limit must be between 1 and 500', { field: 'limit', value: limitStr });
      }

      const page = pageStr ? parseInt(pageStr, 10) : undefined;
      if (page !== undefined && (isNaN(page) || page < 1)) {
        throw Errors.badRequest('page must be a positive integer', { field: 'page', value: pageStr });
      }

      const result = await TestCaseService.list(builder.id, { status, search, page, cursor, limit });

      return {
        test_cases: result.test_cases.map((tc) => ({
          id: tc.short_id,
          title: tc.title,
          template_type: tc.template_type,
          status: tc.status,
          step_count: tc.steps?.length ?? 0,
          credit_cost: tc.template_type === 'flow_test'
            ? (tc.steps.length > 0 ? 2 + tc.steps.length : 0)
            : 3,
          has_credentials: !!tc.credentials,
          environment: tc.environment,
          tags: tc.tags,
          created_at: tc.created_at.toISOString(),
        })),
        total: result.total,
        page: result.page,
        per_page: result.per_page,
        total_pages: result.total_pages,
        next_cursor: result.next_cursor,
        has_more: result.has_more,
      };
    });

    // GET /api/v1/test-cases/:id — get full details
    builderScope.get('/:id', async (request: FastifyRequest<{
      Params: { id: string };
    }>) => {
      const builder = request.builder!;
      const testCase = await TestCaseService.getById(request.params.id, builder.id);

      const base = {
        id: testCase.short_id,
        title: testCase.title,
        template_type: testCase.template_type,
        description: testCase.description,
        url: testCase.url,
        status: testCase.status,
        has_credentials: !!testCase.credentials,
        environment: testCase.environment,
        tags: testCase.tags,
        required_skills: testCase.required_skills,
        external_id: testCase.external_id,
        callback_url: testCase.callback_url,
        assigned_tester_id: testCase.assigned_tester_id,
        assigned_at: testCase.assigned_at?.toISOString() ?? null,
        completed_at: testCase.completed_at?.toISOString() ?? null,
        status_history: testCase.status_history,
        info_requests: testCase.info_requests ?? [],
        created_at: testCase.created_at.toISOString(),
        updated_at: testCase.updated_at.toISOString(),
      };

      if (testCase.template_type === 'flow_test') {
        return {
          ...base,
          steps: testCase.steps,
          expected_behavior: testCase.expected_behavior,
        };
      }

      // review_test
      return {
        ...base,
        context: testCase.context,
        devices_to_check: testCase.devices_to_check,
        focus_areas: testCase.focus_areas,
        ignore_areas: testCase.ignore_areas,
      };
    });

    // DELETE /api/v1/test-cases/:id — cancel
    builderScope.delete('/:id', async (request: FastifyRequest<{
      Params: { id: string };
    }>) => {
      const builder = request.builder!;
      return TestCaseService.cancel(request.params.id, builder.id);
    });

    // GET /api/v1/test-cases/:id/results — get results
    builderScope.get('/:id/results', async (request: FastifyRequest<{
      Params: { id: string };
    }>) => {
      const builder = request.builder!;
      return TestCaseService.getResults(request.params.id, builder.id);
    });

    // POST /api/v1/test-cases/:id/info-reply — builder responds to tester's info request
    builderScope.post('/:id/info-reply', async (request: FastifyRequest<{
      Params: { id: string };
      Body: { message: string };
    }>, reply: FastifyReply) => {
      const builder = request.builder!;
      const { message } = request.body;
      if (!message || typeof message !== 'string' || message.trim().length === 0) {
        throw Errors.badRequest('Message is required');
      }
      const testCase = await TestCaseModel.findById(request.params.id);
      if (!testCase) throw Errors.notFound('Test case');
      if (testCase.builder_id !== builder.id) throw Errors.forbidden('Not your test case');
      if (testCase.status !== 'needs_info') {
        throw Errors.conflict('NOT_NEEDS_INFO', 'Test case is not awaiting info', { current_status: testCase.status });
      }

      const entry = { from: 'builder' as const, message: message.trim(), at: new Date().toISOString(), user_id: builder.id };
      const updated = await sql<TestCase[]>`
        UPDATE test_cases
        SET status = 'in_progress',
            info_requests = info_requests || ${JSON.stringify(entry)}::jsonb,
            status_history = status_history || ${JSON.stringify({ status: 'in_progress', at: new Date().toISOString(), note: 'Builder provided requested info' })}::jsonb
        WHERE id = ${testCase.id}
        RETURNING *
      `;

      // Notify tester that info was provided
      if (testCase.assigned_tester_id) {
        const [tester] = await sql<{ email: string; display_name: string }[]>`
          SELECT email, display_name FROM testers WHERE id = ${testCase.assigned_tester_id}
        `;
        if (tester) {
          EmailService.sendInfoProvided(tester.email, {
            title: testCase.title,
            shortId: testCase.short_id,
            builderMessage: message.trim(),
          }).catch(() => {});
        }
      }

      reply.status(200).send({ status: 'in_progress', info_requests: updated[0]?.info_requests ?? [] });
    });
  });

  // Tester-authenticated routes
  app.register(async (testerScope) => {
    await testerAuthPlugin(testerScope);

    // POST /api/v1/test-cases/:id/accept — tester accepts assignment
    testerScope.post('/:id/accept', async (request: FastifyRequest<{
      Params: { id: string };
    }>, reply: FastifyReply) => {
      const tester = request.tester!;
      await AssignmentService.acceptAssignment(request.params.id, tester.id);
      reply.status(200).send({ status: 'in_progress' });
    });

    // POST /api/v1/test-cases/:id/results — tester submits flow results
    testerScope.post('/:id/results', {
      schema: submitFlowResultsSchema,
    }, async (request: FastifyRequest<{
      Params: { id: string };
      Body: {
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
      };
    }>, reply: FastifyReply) => {
      const tester = request.tester!;
      await AssignmentService.submitFlowResults(request.params.id, tester.id, request.body);
      reply.status(200).send({ status: 'completed' });
    });

    // POST /api/v1/test-cases/:id/findings — tester submits review findings
    testerScope.post('/:id/findings', {
      schema: submitReviewResultsSchema,
    }, async (request: FastifyRequest<{
      Params: { id: string };
      Body: {
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
      };
    }>, reply: FastifyReply) => {
      const tester = request.tester!;
      await AssignmentService.submitReviewResults(request.params.id, tester.id, request.body);
      reply.status(200).send({ status: 'completed' });
    });
  });
}
