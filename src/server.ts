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
import { testCasesRoutes } from './api/test-cases.routes.js';
import { templatesRoutes } from './api/templates.routes.js';
import { PayoutService } from './services/payout.service.js';
import { testerRoutes } from './api/tester.routes.js';
import { webhookRoutes } from './api/webhook.routes.js';
import { builderAuthRoutes } from './api/builder-auth.routes.js';
import { WebhookService, WEBHOOK_JOB } from './services/webhook.service.js';
import { ApiError } from './lib/errors.js';

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

  // Cookie support (required by OAuth and session plugins)
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
  app.register(builderAuthRoutes, { prefix: '/auth/builder' });
  app.register(builderApiRoutes, { prefix: '/api/v1' });
  app.register(creditsRoutes, { prefix: '/api/v1/credits' });
  app.register(stripeWebhookRoutes, { prefix: '/webhooks' });
  app.register(testCasesRoutes, { prefix: '/api/v1/test-cases' });
  app.register(templatesRoutes, { prefix: '/api/v1/templates' });
  app.register(testerRoutes, { prefix: '/api/v1/tester' });
  app.register(webhookRoutes, { prefix: '/api/v1' });

  return app;
}

async function startWorkers(logger: { info: (msg: string) => void; error: (err: unknown, msg: string) => void }) {
  try {
    const boss = await getJobManager();

    // Payout scheduler
    const PAYOUT_JOB = 'weekly-payout-aggregation';
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
