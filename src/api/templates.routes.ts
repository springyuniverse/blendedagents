import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { builderAuthPlugin } from '../middleware/builder-auth.js';
import { TemplateService } from '../services/template.service.js';

export async function templatesRoutes(app: FastifyInstance) {
  app.register(builderAuthPlugin);

  // POST /api/v1/templates — create template
  app.post('/', {
    schema: {
      body: {
        type: 'object',
        required: ['title', 'steps'],
        properties: {
          title: { type: 'string', minLength: 1, maxLength: 255 },
          description: { type: 'string', maxLength: 5000 },
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
          metadata: { type: 'object' },
          environment: { type: 'string' },
          tags: { type: 'array', items: { type: 'string' } },
          expected_behavior: { type: 'string', maxLength: 5000 },
        },
        additionalProperties: false,
      },
    },
  }, async (request: FastifyRequest<{
    Body: {
      title: string;
      description?: string;
      steps: Record<string, unknown>[];
      metadata?: Record<string, unknown>;
      environment?: string;
      tags?: string[];
      expected_behavior?: string;
    };
  }>, reply: FastifyReply) => {
    const builder = request.builder!;
    const template = await TemplateService.create(builder.id, request.body);
    reply.status(201).send({
      id: template.id,
      title: template.title,
      description: template.description,
      steps: template.steps,
      metadata: template.metadata,
      environment: template.environment,
      tags: template.tags,
      expected_behavior: template.expected_behavior,
      created_at: template.created_at.toISOString(),
      updated_at: template.updated_at.toISOString(),
    });
  });

  // GET /api/v1/templates — list templates
  app.get('/', async (request: FastifyRequest) => {
    const builder = request.builder!;
    const templates = await TemplateService.list(builder.id);
    return {
      templates: templates.map((t) => ({
        id: t.id,
        title: t.title,
        description: t.description,
        steps: t.steps,
        environment: t.environment,
        tags: t.tags,
        created_at: t.created_at.toISOString(),
      })),
    };
  });

  // GET /api/v1/templates/:id — get by ID
  app.get('/:id', async (request: FastifyRequest<{
    Params: { id: string };
  }>) => {
    const builder = request.builder!;
    const template = await TemplateService.getById(request.params.id, builder.id);
    return {
      id: template.id,
      title: template.title,
      description: template.description,
      steps: template.steps,
      metadata: template.metadata,
      environment: template.environment,
      tags: template.tags,
      expected_behavior: template.expected_behavior,
      created_at: template.created_at.toISOString(),
      updated_at: template.updated_at.toISOString(),
    };
  });

  // PUT /api/v1/templates/:id — update template
  app.put('/:id', {
    schema: {
      body: {
        type: 'object',
        properties: {
          title: { type: 'string', minLength: 1, maxLength: 255 },
          description: { type: 'string', maxLength: 5000 },
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
          metadata: { type: 'object' },
        },
        additionalProperties: false,
      },
    },
  }, async (request: FastifyRequest<{
    Params: { id: string };
    Body: {
      title?: string;
      description?: string;
      steps?: Record<string, unknown>[];
      metadata?: Record<string, unknown>;
    };
  }>) => {
    const builder = request.builder!;
    const template = await TemplateService.update(request.params.id, builder.id, request.body);
    return {
      id: template.id,
      title: template.title,
      description: template.description,
      steps: template.steps,
      metadata: template.metadata,
      environment: template.environment,
      tags: template.tags,
      expected_behavior: template.expected_behavior,
      created_at: template.created_at.toISOString(),
      updated_at: template.updated_at.toISOString(),
    };
  });

  // DELETE /api/v1/templates/:id — delete template
  app.delete('/:id', async (request: FastifyRequest<{
    Params: { id: string };
  }>) => {
    const builder = request.builder!;
    await TemplateService.delete(request.params.id, builder.id);
    return { message: 'Template deleted successfully' };
  });

  // POST /api/v1/templates/:id/use — instantiate template as test case
  app.post('/:id/use', {
    schema: {
      body: {
        type: 'object',
        required: ['staging_url'],
        properties: {
          title: { type: 'string', minLength: 1, maxLength: 255 },
          description: { type: 'string', maxLength: 5000 },
          staging_url: { type: 'string', format: 'uri' },
          credentials: { type: 'object' },
          environment: { type: 'string' },
          tags: { type: 'array', items: { type: 'string' } },
          external_id: { type: 'string' },
          callback_url: { type: 'string', format: 'uri' },
          required_skills: { type: 'array', items: { type: 'string' } },
        },
        additionalProperties: false,
      },
    },
  }, async (request: FastifyRequest<{
    Params: { id: string };
    Body: {
      title?: string;
      description?: string;
      staging_url: string;
      credentials?: Record<string, unknown>;
      environment?: string;
      tags?: string[];
      external_id?: string;
      callback_url?: string;
      required_skills?: string[];
    };
  }>, reply: FastifyReply) => {
    const builder = request.builder!;
    const result = await TemplateService.useTemplate(request.params.id, builder.id, request.body);
    reply.status(201).send(result);
  });
}
