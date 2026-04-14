import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { StripeService } from '../services/stripe.service.js';

export async function stripeWebhookRoutes(app: FastifyInstance) {
  // Stripe webhooks need the raw body for signature verification
  // Register a content type parser that preserves the raw body
  app.addContentTypeParser(
    'application/json',
    { parseAs: 'buffer' },
    (_req, body, done) => {
      done(null, body);
    },
  );

  // POST /webhooks/stripe
  app.post('/stripe', async (request: FastifyRequest, reply: FastifyReply) => {
    const signature = request.headers['stripe-signature'] as string;

    if (!signature) {
      reply.status(400).send({
        error: {
          code: 'MISSING_SIGNATURE',
          message: 'Missing stripe-signature header',
        },
      });
      return;
    }

    try {
      const rawBody = request.body as Buffer;
      await StripeService.processWebhook(rawBody, signature);
      reply.status(200).send({});
    } catch (err) {
      if (err instanceof Error && err.message.includes('signature')) {
        reply.status(400).send({
          error: {
            code: 'INVALID_SIGNATURE',
            message: 'Invalid webhook signature',
          },
        });
        return;
      }

      // Log the error but still return 200 for non-signature errors
      // to prevent Stripe from retrying on our application errors
      request.log.error(err, 'Webhook processing error');
      reply.status(200).send({ received: true });
    }
  });
}
