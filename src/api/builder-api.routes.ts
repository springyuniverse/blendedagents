import type { FastifyInstance } from 'fastify';
import { builderAuthPlugin } from '../middleware/builder-auth.js';

export async function builderApiRoutes(app: FastifyInstance) {
  // Apply builder auth to all routes in this plugin scope
  app.register(builderAuthPlugin);

  // GET /api/v1/me — returns authenticated builder info
  app.get('/me', async (request) => {
    const builder = request.builder!;
    return {
      id: builder.id,
      display_name: builder.display_name,
      email: builder.email,
      plan_tier: builder.plan_tier,
      credits_balance: builder.credits_balance,
    };
  });
}
