import type { FastifyInstance, FastifyRequest } from 'fastify';
import { supabaseAdmin } from '../lib/supabase.js';
import { Errors } from '../lib/errors.js';
import { AuthService } from '../services/auth.service.js';
import { TesterInviteModel } from '../models/tester-invite.js';
import { PlatformSettingsModel } from '../models/platform-settings.js';

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
      { invite_code: user.user_metadata?.invite_code, region: user.user_metadata?.region },
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

  // GET /auth/signup-config — public, returns whether invite is required
  app.get('/signup-config', async () => {
    const settings = await PlatformSettingsModel.get();
    return { require_invite_code: settings.require_invite_code };
  });

  // GET /auth/validate-invite?code=BA-XXXXXXXX — public, no auth required
  app.get('/validate-invite', async (request: FastifyRequest<{ Querystring: { code?: string } }>) => {
    const code = (request.query.code || '').toUpperCase().trim();
    if (!code) return { valid: false };

    const invite = await TesterInviteModel.findByCode(code);
    if (!invite || invite.used_by_id) return { valid: false };

    return { valid: true };
  });

  // POST /auth/logout — no-op for Supabase (client handles signOut)
  app.post('/logout', async () => {
    return { message: 'Logged out successfully' };
  });
}
