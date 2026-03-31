import type { FastifyInstance, FastifyRequest } from 'fastify';
import { supabaseAdmin } from '../lib/supabase.js';
import { Errors } from '../lib/errors.js';
import { AuthService } from '../services/auth.service.js';

export async function authRoutes(app: FastifyInstance) {
  // GET /auth/me — returns authenticated user profile from Supabase JWT
  app.get('/me', async (request: FastifyRequest) => {
    const authHeader = request.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw Errors.unauthorized('Not authenticated');
    }

    const token = authHeader.slice(7);
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);

    if (error || !user) {
      throw Errors.unauthorized('Invalid or expired token');
    }

    // Try to find as tester first, then builder
    const tester = await AuthService.findOrCreateTester(
      user.id,
      user.email || '',
      user.user_metadata?.display_name || user.user_metadata?.full_name || user.email?.split('@')[0] || 'User',
    );

    if (tester) {
      return {
        id: tester.id,
        display_name: tester.display_name,
        email: tester.email,
        avatar_url: tester.avatar_url,
        region: tester.region,
        is_available: tester.is_available,
        role: 'tester',
      };
    }

    throw Errors.unauthorized('User not found');
  });

  // POST /auth/logout — no-op for Supabase (client handles signOut)
  app.post('/logout', async () => {
    return { message: 'Logged out successfully' };
  });
}
