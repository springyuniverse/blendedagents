import type { FastifyInstance, FastifyRequest } from 'fastify';
import { builderAuthPlugin } from '../middleware/builder-auth.js';
import { AuthService } from '../services/auth.service.js';
import { Errors } from '../lib/errors.js';
import sql from '../lib/db.js';

export async function builderApiRoutes(app: FastifyInstance) {
  await builderAuthPlugin(app);

  // GET /api/v1/me — returns authenticated builder info
  app.get('/me', async (request) => {
    const builder = request.builder!;
    return {
      id: builder.id,
      name: builder.display_name,
      display_name: builder.display_name,
      email: builder.email,
      plan: builder.plan_tier,
      plan_tier: builder.plan_tier,
      credits_balance: builder.credits_balance,
      created_at: builder.created_at,
    };
  });

  // GET /api/v1/api-keys — list builder's API keys
  app.get('/api-keys', async (request) => {
    const builder = request.builder!;
    const keys = await sql`
      SELECT id, key_prefix, label, created_at, revoked_at, last_used_at
      FROM api_keys
      WHERE builder_id = ${builder.id}
      ORDER BY created_at DESC
    `;
    return { data: keys };
  });

  // POST /api/v1/api-keys — generate a new API key
  app.post('/api-keys', async (request: FastifyRequest<{
    Body: { label?: string };
  }>) => {
    const builder = request.builder!;
    const label = (request.body as { label?: string })?.label;
    const { key, id } = await AuthService.createApiKey(builder.id, label);
    return { id, key, label: label || null };
  });

  // DELETE /api/v1/api-keys/:id — revoke an API key
  app.delete('/api-keys/:id', async (request: FastifyRequest<{
    Params: { id: string };
  }>, reply) => {
    const builder = request.builder!;
    const { id } = request.params;
    await AuthService.revokeApiKey(id, builder.id);
    reply.status(204).send();
  });
}
