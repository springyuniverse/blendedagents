import type { FastifyInstance, FastifyRequest } from 'fastify';
import { TemplateService } from '../services/template.service.js';

export async function templatesRoutes(app: FastifyInstance) {
  // GET /api/v1/templates — list enforced templates
  app.get('/', async () => {
    const templates = TemplateService.list();
    return { templates };
  });

  // GET /api/v1/templates/:id — get full template schema
  app.get('/:id', async (request: FastifyRequest<{
    Params: { id: string };
  }>) => {
    return TemplateService.getById(request.params.id);
  });
}
