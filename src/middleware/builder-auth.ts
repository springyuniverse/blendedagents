import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { AuthService } from '../services/auth.service.js';
import { BuilderAuthService } from '../services/builder-auth.service.js';
import { Errors } from '../lib/errors.js';
import sql from '../lib/db.js';
import type { Builder } from '../models/builder.js';

declare module 'fastify' {
  interface FastifyRequest {
    builder: Builder | null;
  }
}

export async function builderAuthPlugin(app: FastifyInstance) {
  // Decorate request with builder property
  app.decorateRequest('builder', null);

  app.addHook('preHandler', async (request: FastifyRequest, reply: FastifyReply) => {
    const authHeader = request.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw Errors.unauthorized('Missing or invalid authorization header');
    }

    const token = authHeader.slice(7); // Remove 'Bearer '
    let builder: Builder | null = null;

    if (token.startsWith('ba_sk_')) {
      // API key flow (existing)
      builder = await AuthService.verifyApiKey(token);
      if (!builder) {
        throw Errors.unauthorized('Invalid or revoked API key');
      }
    } else {
      // JWT flow (new dashboard flow)
      const payload = BuilderAuthService.verifyToken(token);
      if (!payload) {
        throw Errors.unauthorized('Invalid or expired token');
      }

      builder = await BuilderAuthService.findById(payload.builderId);
      if (!builder) {
        throw Errors.unauthorized('Builder not found');
      }
    }

    // Decorate request with authenticated builder
    request.builder = builder;

    // Set RLS context for this request's database queries
    await sql`SELECT set_config('app.current_builder_id', ${builder.id}, true)`;
  });
}
