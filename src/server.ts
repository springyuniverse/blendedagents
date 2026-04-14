import Fastify from 'fastify';
import cookie from '@fastify/cookie';
import cors from '@fastify/cors';
import rateLimit from '@fastify/rate-limit';
import { getJobManager } from './lib/jobs.js';
import { healthRoutes } from './api/health.routes.js';
import { authRoutes } from './api/auth.routes.js';
import { builderApiRoutes } from './api/builder-api.routes.js';
import { creditsRoutes } from './api/credits.routes.js';
import { stripeWebhookRoutes } from './api/stripe-webhook.routes.js';
import { authWebhookRoutes } from './api/auth-webhook.routes.js';
import { testCasesRoutes } from './api/test-cases.routes.js';
import { templatesRoutes } from './api/templates.routes.js';
import { PayoutService } from './services/payout.service.js';
import { testerRoutes } from './api/tester.routes.js';
import { webhookRoutes } from './api/webhook.routes.js';
import { adminRoutes } from './api/admin.routes.js';
import { WebhookService, WEBHOOK_JOB } from './services/webhook.service.js';
import { ApiError } from './lib/errors.js';
import sql from './lib/db.js';

const PORT = parseInt(process.env.PORT || '3000', 10);
const HOST = process.env.HOST || '0.0.0.0';

export function buildApp() {
  const app = Fastify({
    logger: true,
  });

  // Global error handler for structured error responses
  app.setErrorHandler((error: Error & { validation?: unknown; statusCode?: number }, _request, reply) => {
    if (error instanceof ApiError) {
      reply.status(error.statusCode).send(error.toResponse());
      return;
    }

    // Fastify validation errors
    if (error.validation) {
      reply.status(400).send({
        error: {
          code: 'VALIDATION_ERROR',
          message: error.message,
          context: { validation: error.validation },
        },
      });
      return;
    }

    app.log.error(error);
    reply.status(500).send({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'An unexpected error occurred',
      },
    });
  });

  // Cookie support (needed for CORS credentials)
  app.register(cookie, {
    secret: process.env.SESSION_SECRET || 'dev-secret-change-in-production',
  });

  // CORS
  const allowedOrigins = (process.env.ALLOWED_ORIGINS || 'http://localhost:3000').split(',');
  app.register(cors, {
    origin: allowedOrigins,
    credentials: true,
  });

  // Rate limiting: 100 req/min per API key (from 001-foundation-auth spec)
  app.register(rateLimit, {
    max: 100,
    timeWindow: '1 minute',
    keyGenerator: (request) => {
      return request.headers.authorization ?? request.ip;
    },
    errorResponseBuilder: () => ({
      error: {
        code: 'RATE_LIMIT_EXCEEDED',
        message: 'Too many requests. Please retry after the rate limit window resets.',
      },
    }),
  });

  // Register route plugins
  app.register(healthRoutes);
  app.register(authRoutes, { prefix: '/auth' });
  app.register(authRoutes, { prefix: '/api/v1/auth' });
  app.register(builderApiRoutes, { prefix: '/api/v1' });
  app.register(creditsRoutes, { prefix: '/api/v1/credits' });
  app.register(stripeWebhookRoutes, { prefix: '/webhooks' });
  app.register(authWebhookRoutes, { prefix: '/webhooks' });
  app.register(testCasesRoutes, { prefix: '/api/v1/test-cases' });
  app.register(templatesRoutes, { prefix: '/api/v1/templates' });
  app.register(testerRoutes, { prefix: '/api/v1/tester' });
  app.register(webhookRoutes, { prefix: '/api/v1' });
  app.register(adminRoutes, { prefix: '/api/v1/admin' });

  return app;
}

async function startWorkers(logger: { info: (msg: string) => void; error: (err: unknown, msg: string) => void }) {
  try {
    const boss = await getJobManager();

    // Log pg-boss errors instead of crashing
    boss.on('error', (err) => logger.error(err, 'pg-boss error'));

    // Create queues (required in pg-boss v12+)
    const PAYOUT_JOB = 'weekly-payout-aggregation';
    await boss.createQueue(PAYOUT_JOB);
    await boss.createQueue(WEBHOOK_JOB);
    await boss.createQueue('assign-tester');
    await boss.createQueue('select-tester');
    await boss.createQueue('assignment-expiry');
    await boss.createQueue('acceptance-timeout');

    // Select tester from requests after the window closes
    await boss.work<{ testCaseId: string }>('select-tester', async (jobs) => {
      for (const job of jobs) {
        const { testCaseId } = job.data;
        logger.info(`Selecting tester for test case ${testCaseId}`);

        // Check task is still queued
        const [task] = await sql`SELECT id, status FROM test_cases WHERE id = ${testCaseId}`;
        if (!task || task.status !== 'queued') continue;

        // Get pending requests, pick the best tester (for now: most completed tasks, then earliest request)
        const [bestRequest] = await sql`
          SELECT tr.id AS request_id, tr.tester_id, t.tasks_completed, t.avg_completion_minutes
          FROM task_requests tr
          JOIN testers t ON t.id = tr.tester_id
          WHERE tr.test_case_id = ${testCaseId}
            AND tr.status = 'pending'
            AND t.is_active = true
          ORDER BY t.tasks_completed DESC, t.avg_completion_minutes ASC, tr.created_at ASC
          LIMIT 1
        `;

        if (!bestRequest) {
          logger.info(`No requests for test case ${testCaseId}, will retry`);
          // Re-check after the platform-defined selection window
          const [cfg] = await sql<{ value: string }[]>`
            SELECT value::text FROM platform_config WHERE key = 'selection_window_minutes'
          `;
          const retrySeconds = (cfg ? parseInt(cfg.value, 10) : 30) * 60;
          await boss.send('select-tester', { testCaseId }, {
            startAfter: retrySeconds,
            singletonKey: `select:${testCaseId}`,
          });
          continue;
        }

        // Accept the winner, reject others, assign the task
        await sql.begin(async (tx) => {
          await tx`UPDATE task_requests SET status = 'accepted' WHERE id = ${bestRequest.request_id}`;
          await tx`UPDATE task_requests SET status = 'rejected' WHERE test_case_id = ${testCaseId} AND id != ${bestRequest.request_id} AND status = 'pending'`;
          await tx`UPDATE test_cases SET status = 'assigned', assigned_tester_id = ${bestRequest.tester_id}, assigned_at = now() WHERE id = ${testCaseId}`;
        });

        logger.info(`Assigned test case ${testCaseId} to tester ${bestRequest.tester_id}`);
      }
    });

    // Payout scheduler
    await boss.work(PAYOUT_JOB, async () => {
      logger.info('Running weekly payout aggregation...');
      const count = await PayoutService.runWeeklyAggregation();
      logger.info(`Weekly payout aggregation complete: ${count} records created`);
    });
    await boss.schedule(PAYOUT_JOB, '0 0 * * 0');

    // Webhook delivery worker
    interface WebhookJobData { testCaseId: string; deliveryId?: string; attemptNumber?: number }
    await boss.work<WebhookJobData>(WEBHOOK_JOB, async (jobs) => {
      for (const job of jobs) {
        const { testCaseId, deliveryId, attemptNumber } = job.data;
        logger.info(`Delivering webhook for test case ${testCaseId} (attempt ${attemptNumber ?? 1})`);
        await WebhookService.deliverWebhook(testCaseId, attemptNumber ?? 1, deliveryId);
      }
    });

    logger.info('Workers registered: payout scheduler, webhook delivery');
  } catch (err) {
    logger.error(err, 'Failed to start workers (DATABASE_URL may not be set)');
  }
}

async function start() {
  const app = buildApp();

  try {
    await app.listen({ port: PORT, host: HOST });
    app.log.info(`Server listening on ${HOST}:${PORT}`);

    await startWorkers(app.log);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

start();
