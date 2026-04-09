import type { FastifyInstance, FastifyRequest } from 'fastify';
import { builderAuthPlugin } from '../middleware/builder-auth.js';
import { BuilderModel } from '../models/builder.js';
import { WebhookDeliveryModel } from '../models/webhook-delivery.js';
import { WebhookService } from '../services/webhook.service.js';
import { Errors } from '../lib/errors.js';

export async function webhookRoutes(app: FastifyInstance) {
  await builderAuthPlugin(app);

  // PUT /api/v1/webhook — set or update webhook configuration
  app.put('/webhook', {
    schema: {
      body: {
        type: 'object',
        required: ['webhook_url', 'webhook_secret'],
        properties: {
          webhook_url: { type: 'string', format: 'uri' },
          webhook_secret: { type: 'string', minLength: 16 },
        },
        additionalProperties: false,
      },
    },
  }, async (
    request: FastifyRequest<{ Body: { webhook_url: string; webhook_secret: string } }>,
  ) => {
    const builder = request.builder!;
    const { webhook_url, webhook_secret } = request.body;

    // Validate HTTPS in production
    if (process.env.NODE_ENV === 'production' && !webhook_url.startsWith('https://')) {
      throw Errors.badRequest('Webhook URL must use HTTPS');
    }

    const updated = await BuilderModel.update(builder.id, {
      webhook_url,
      webhook_secret,
    });

    return {
      webhook_url: updated.webhook_url,
      updated_at: updated.updated_at.toISOString(),
    };
  });

  // POST /api/v1/webhook/ping — send a test webhook
  app.post('/webhook/ping', async (request: FastifyRequest) => {
    // Re-fetch builder to get the latest webhook_url (auth middleware caches old data)
    const fresh = await BuilderModel.findById(request.builder!.id);

    if (!fresh?.webhook_url) {
      throw Errors.badRequest('No webhook URL configured. Set one with PUT /api/v1/webhook first.');
    }

    const result = await WebhookService.sendPing(fresh.id);
    return result;
  });

  // GET /api/v1/webhook/history — list delivery attempts
  app.get('/webhook/history', async (
    request: FastifyRequest<{
      Querystring: { cursor?: string; limit?: string };
    }>,
  ) => {
    const builder = request.builder!;
    const { cursor, limit: limitStr } = request.query;

    const limit = limitStr ? parseInt(limitStr, 10) : 20;
    if (isNaN(limit) || limit < 1 || limit > 100) {
      throw Errors.badRequest('limit must be between 1 and 100');
    }

    // Fetch one extra to detect has_more
    const fetchLimit = limit + 1;

    // Use the model's listByBuilder with the fetch limit
    const allDeliveries = await WebhookDeliveryModel.listByBuilder(builder.id, fetchLimit);

    // Apply cursor filtering (keyset pagination by created_at)
    let filtered = allDeliveries;
    if (cursor) {
      const cursorDate = new Date(cursor);
      filtered = allDeliveries.filter((d) => d.created_at < cursorDate);
    }

    const hasMore = filtered.length > limit;
    const deliveries = hasMore ? filtered.slice(0, limit) : filtered;
    const nextCursor =
      hasMore && deliveries.length > 0
        ? deliveries[deliveries.length - 1].created_at.toISOString()
        : null;

    return {
      deliveries: deliveries.map((d) => ({
        id: d.id,
        test_case_id: d.test_case_id,
        event_type: d.event_type,
        url: d.url,
        response_status: d.response_status,
        attempt_count: d.attempt_count,
        delivered_at: d.delivered_at?.toISOString() ?? null,
        created_at: d.created_at.toISOString(),
      })),
      next_cursor: nextCursor,
      has_more: hasMore,
    };
  });
}
