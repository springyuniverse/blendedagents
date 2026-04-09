import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { AuthService } from '../services/auth.service.js';
import { supabaseAdmin } from '../lib/supabase.js';
import { Errors } from '../lib/errors.js';
import sql from '../lib/db.js';
import type { Builder } from '../models/builder.js';

declare module 'fastify' {
  interface FastifyRequest {
    builder: Builder | null;
  }
}

export async function builderAuthPlugin(app: FastifyInstance) {
  if (!app.hasRequestDecorator('builder')) {
    app.decorateRequest('builder', null);
  }

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
      // Supabase JWT flow (dashboard sessions)
      const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);

      if (error || !user) {
        throw Errors.unauthorized('Invalid or expired token');
      }

      // Look up builder by Supabase auth user ID
      builder = await AuthService.findOrCreateBuilder(
        user.id,
        user.email || '',
        user.user_metadata?.display_name || user.email?.split('@')[0] || 'Builder',
      );

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
