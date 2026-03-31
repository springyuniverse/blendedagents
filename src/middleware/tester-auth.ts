import type { FastifyInstance, FastifyRequest } from 'fastify';
import { TesterModel, type Tester } from '../models/tester.js';
import { supabaseAdmin } from '../lib/supabase.js';
import { Errors } from '../lib/errors.js';
import sql from '../lib/db.js';
import { AuthService } from '../services/auth.service.js';

declare module 'fastify' {
  interface FastifyRequest {
    tester: Tester | null;
  }
}

export async function testerAuthPlugin(app: FastifyInstance) {
  app.decorateRequest('tester', null);

  app.addHook('preHandler', async (request: FastifyRequest) => {
    const authHeader = request.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw Errors.unauthorized('Not authenticated');
    }

    const token = authHeader.slice(7);

    // Verify Supabase JWT
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);

    if (error || !user) {
      throw Errors.unauthorized('Invalid or expired token');
    }

    // Look up or create tester by Supabase auth user ID
    const tester = await AuthService.findOrCreateTester(
      user.id,
      user.email || '',
      user.user_metadata?.display_name || user.user_metadata?.full_name || user.email?.split('@')[0] || 'Tester',
    );

    if (!tester) {
      throw Errors.unauthorized('Tester not found');
    }

    // Verify tester is still active
    if (!tester.is_active) {
      throw Errors.unauthorized('Account has been deactivated');
    }

    request.tester = tester;

    // Set RLS context for tester
    await sql`SELECT set_config('app.current_tester_id', ${tester.id}, true)`;
  });
}
