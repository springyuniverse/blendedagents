import type { FastifyInstance, FastifyRequest } from 'fastify';
import oauthPlugin from '@fastify/oauth2';
import { TesterModel } from '../models/tester.js';
import { Errors } from '../lib/errors.js';

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '';
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || '';
const GOOGLE_CALLBACK_URL = process.env.GOOGLE_CALLBACK_URL || 'http://localhost:3000/auth/google/callback';
const APP_URL = process.env.APP_URL || 'http://localhost:3000';

export async function authRoutes(app: FastifyInstance) {
  // Register Google OAuth2 plugin (only if credentials are configured)
  if (GOOGLE_CLIENT_ID && GOOGLE_CLIENT_SECRET) {
    app.register(oauthPlugin, {
      name: 'googleOAuth2',
      scope: ['openid', 'email', 'profile'],
      credentials: {
        client: {
          id: GOOGLE_CLIENT_ID,
          secret: GOOGLE_CLIENT_SECRET,
        },
      },
      startRedirectPath: '/google',
      callbackUri: GOOGLE_CALLBACK_URL,
      discovery: {
        issuer: 'https://accounts.google.com',
      },
    });

    // GET /auth/google/callback — OAuth2 callback handler
    app.get('/google/callback', async (request: FastifyRequest, reply) => {
      try {
        const googleOAuth2 = (app as unknown as { googleOAuth2: { getAccessTokenFromAuthorizationCodeFlow: (req: FastifyRequest) => Promise<{ token: { access_token: string } }> } }).googleOAuth2;
        const { token } = await googleOAuth2.getAccessTokenFromAuthorizationCodeFlow(request);

        // Fetch user info from Google
        const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
          headers: { Authorization: `Bearer ${token.access_token}` },
        });

        if (!userInfoResponse.ok) {
          throw new Error('Failed to fetch user info from Google');
        }

        const userInfo = await userInfoResponse.json() as { email: string; name: string; picture: string };

        // Look up tester by email
        const tester = await TesterModel.findByEmail(userInfo.email);

        if (!tester) {
          reply.status(403).send({
            error: {
              code: 'TESTER_NOT_FOUND',
              message: 'No account found for this email. Contact your administrator.',
              context: {},
            },
          });
          return;
        }

        if (!tester.is_active) {
          reply.status(403).send({
            error: {
              code: 'TESTER_DEACTIVATED',
              message: 'Your account has been deactivated. Contact your administrator.',
              context: {},
            },
          });
          return;
        }

        // Update avatar if changed
        if (userInfo.picture && userInfo.picture !== tester.avatar_url) {
          await TesterModel.update(tester.id, { avatar_url: userInfo.picture });
        }

        // Create session
        const session = (request as unknown as { session: Record<string, unknown> }).session;
        session.testerId = tester.id;
        session.email = tester.email;

        // Redirect to dashboard
        reply.redirect(`${APP_URL}/dashboard`);
      } catch (err) {
        app.log.error(err, 'OAuth callback error');
        reply.redirect(`${APP_URL}/auth/login?error=oauth_failed`);
      }
    });
  }

  // GET /auth/me — returns authenticated tester profile
  app.get('/me', async (request: FastifyRequest) => {
    const session = (request as unknown as { session?: { testerId?: string } }).session;
    const testerId = session?.testerId;

    if (!testerId) {
      throw Errors.unauthorized('Not authenticated');
    }

    const tester = await TesterModel.findById(testerId);
    if (!tester) {
      throw Errors.unauthorized('Tester not found');
    }

    if (!tester.is_active) {
      throw Errors.unauthorized('Account has been deactivated');
    }

    return {
      id: tester.id,
      display_name: tester.display_name,
      email: tester.email,
      avatar_url: tester.avatar_url,
      region: tester.region,
      is_available: tester.is_available,
    };
  });

  // POST /auth/logout — destroys tester session
  app.post('/logout', async (request: FastifyRequest) => {
    const session = (request as unknown as { session?: { destroy: () => void } }).session;
    if (session?.destroy) {
      session.destroy();
    }
    return { message: 'Logged out successfully' };
  });
}
