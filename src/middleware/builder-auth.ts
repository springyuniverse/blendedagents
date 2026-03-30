import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { AuthService } from '../services/auth.service.js';
import { ApiError, Errors } from '../lib/errors.js';
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

    if (!authHeader || !authHeader.startsWith('Bearer ba_sk_')) {
      throw Errors.unauthorized('Missing or invalid API key');
    }

    const rawKey = authHeader.slice(7); // Remove 'Bearer '

    const builder = await AuthService.verifyApiKey(rawKey);
    if (!builder) {
      throw Errors.unauthorized('Invalid or revoked API key');
    }

    // Decorate request with authenticated builder
    request.builder = builder;

    // Set RLS context for this request's database queries
    // Using tagged template to safely set the builder ID
    await sql`SELECT set_config('app.current_builder_id', ${builder.id}, true)`;
  });
}
