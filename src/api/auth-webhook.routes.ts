import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { EmailService } from '../lib/email.js';

const SUPABASE_WEBHOOK_SECRET = process.env.SUPABASE_WEBHOOK_SECRET || '';

interface AuthWebhookPayload {
  type: 'INSERT' | 'UPDATE' | 'DELETE';
  table: string;
  schema: string;
  record: {
    id: string;
    email: string;
    raw_user_meta_data: {
      role?: string;
      display_name?: string;
      invite_code?: string;
      region?: string;
    };
  };
  old_record: unknown;
}

export async function authWebhookRoutes(app: FastifyInstance) {
  // POST /webhooks/auth — Supabase database webhook for auth.users INSERT
  app.post('/auth', async (request: FastifyRequest, reply: FastifyReply) => {
    // Verify webhook secret
    const authHeader = request.headers['x-webhook-secret'] as string | undefined;

    if (!SUPABASE_WEBHOOK_SECRET || authHeader !== SUPABASE_WEBHOOK_SECRET) {
      reply.status(401).send({
        error: { code: 'UNAUTHORIZED', message: 'Invalid webhook secret' },
      });
      return;
    }

    const payload = request.body as AuthWebhookPayload;

    // Only process new user inserts
    if (payload.type !== 'INSERT' || payload.table !== 'users' || payload.schema !== 'auth') {
      reply.status(200).send({ ok: true, skipped: true });
      return;
    }

    const { email, raw_user_meta_data: meta } = payload.record;
    const displayName = meta?.display_name || email?.split('@')[0] || 'there';
    const role = meta?.role || 'builder';

    try {
      if (role === 'tester') {
        await EmailService.sendTesterWelcome(email, displayName, meta?.invite_code || '');
      } else {
        await EmailService.sendBuilderWelcome(email, displayName, 0);
      }
      request.log.info(`Welcome email sent to ${role}: ${email}`);
    } catch (err) {
      request.log.error(err, `Failed to send welcome email to ${email}`);
      // Return 200 anyway — don't make Supabase retry on email failures
    }

    reply.status(200).send({ ok: true });
  });
}
