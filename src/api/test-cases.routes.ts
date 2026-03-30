import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { builderAuthPlugin } from '../middleware/builder-auth.js';
import { testerAuthPlugin } from '../middleware/tester-auth.js';
import { TestCaseService } from '../services/test-case.service.js';
import { AssignmentService } from '../services/assignment.service.js';
import { Errors } from '../lib/errors.js';

const VALID_STATUSES = ['queued', 'assigned', 'in_progress', 'completed', 'cancelled', 'expired'];

const createTestCaseSchema = {
  body: {
    type: 'object',
    required: ['title', 'description', 'staging_url', 'steps', 'expected_behavior'],
    properties: {
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
  },
} as const;

const submitResultsSchema = {
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

export async function testCasesRoutes(app: FastifyInstance) {
  // Builder-authenticated routes
  app.register(async (builderScope) => {
    builderScope.register(builderAuthPlugin);

    // POST /api/v1/test-cases — create test case
    builderScope.post('/', {
      schema: createTestCaseSchema,
    }, async (request: FastifyRequest<{
      Body: {
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
      };
    }>, reply: FastifyReply) => {
      const builder = request.builder!;
      const result = await TestCaseService.create(builder.id, request.body);
      reply.status(201).send(result);
    });

    // GET /api/v1/test-cases — list with status filter and cursor pagination
    builderScope.get('/', async (request: FastifyRequest<{
      Querystring: { status?: string; cursor?: string; limit?: string };
    }>) => {
      const builder = request.builder!;
      const { status, cursor, limit: limitStr } = request.query;

      if (status && !VALID_STATUSES.includes(status)) {
        throw Errors.invalidFilter('status', status, VALID_STATUSES);
      }

      const limit = limitStr ? parseInt(limitStr, 10) : undefined;
      if (limit !== undefined && (isNaN(limit) || limit < 1 || limit > 100)) {
        throw Errors.badRequest('limit must be between 1 and 100', { field: 'limit', value: limitStr });
      }

      const page = await TestCaseService.list(builder.id, { status, cursor, limit });

      return {
        test_cases: page.test_cases.map((tc) => ({
          id: tc.id,
          title: tc.title,
          status: tc.status,
          credit_cost: tc.steps.length > 0 ? 2 + tc.steps.length : 0,
          has_credentials: !!tc.credentials,
          environment: tc.environment,
          tags: tc.tags,
          created_at: tc.created_at.toISOString(),
        })),
        next_cursor: page.next_cursor,
        has_more: page.has_more,
      };
    });

    // GET /api/v1/test-cases/:id — get full details
    builderScope.get('/:id', async (request: FastifyRequest<{
      Params: { id: string };
    }>) => {
      const builder = request.builder!;
      const testCase = await TestCaseService.getById(request.params.id, builder.id);

      return {
        id: testCase.id,
        title: testCase.title,
        description: testCase.description,
        url: testCase.url,
        steps: testCase.steps,
        status: testCase.status,
        has_credentials: !!testCase.credentials,
        environment: testCase.environment,
        tags: testCase.tags,
        required_skills: testCase.required_skills,
        external_id: testCase.external_id,
        callback_url: testCase.callback_url,
        expected_behavior: testCase.expected_behavior,
        assigned_tester_id: testCase.assigned_tester_id,
        assigned_at: testCase.assigned_at?.toISOString() ?? null,
        completed_at: testCase.completed_at?.toISOString() ?? null,
        status_history: testCase.status_history,
        created_at: testCase.created_at.toISOString(),
        updated_at: testCase.updated_at.toISOString(),
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
  });

  // Tester-authenticated routes
  app.register(async (testerScope) => {
    testerScope.register(testerAuthPlugin);

    // POST /api/v1/test-cases/:id/accept — tester accepts assignment
    testerScope.post('/:id/accept', async (request: FastifyRequest<{
      Params: { id: string };
    }>, reply: FastifyReply) => {
      const tester = request.tester!;
      await AssignmentService.acceptAssignment(request.params.id, tester.id);
      reply.status(200).send({ status: 'in_progress' });
    });

    // POST /api/v1/test-cases/:id/results — tester submits results
    testerScope.post('/:id/results', {
      schema: submitResultsSchema,
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
      await AssignmentService.submitResults(request.params.id, tester.id, request.body);
      reply.status(200).send({ status: 'completed' });
    });
  });
}
