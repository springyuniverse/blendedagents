import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { CreditBalanceModel } from '../models/credit-balance.js';
import { CreditRateConfigModel } from '../models/credit-rate-config.js';
import { CreditPackModel } from '../models/credit-pack.js';
import { TransactionModel, VALID_TRANSACTION_TYPES, type TransactionType } from '../models/transaction.js';
import { StripeService } from '../services/stripe.service.js';
import { ApiError, Errors, sendError } from '../lib/errors.js';

// Stub for auth middleware from 001-foundation-auth
// This will be replaced with the real auth middleware when integrated
function getAuthenticatedBuilderId(request: FastifyRequest): string {
  const authHeader = request.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ba_sk_')) {
    throw Errors.unauthorized('Missing or invalid API key');
  }
  // In production, this looks up the builder by API key
  // For now, return a placeholder that will be replaced by 001-foundation-auth integration
  return (request as unknown as { builderId: string }).builderId ?? '';
}

export async function creditsRoutes(app: FastifyInstance) {
  // Auth hook for all routes in this plugin
  app.addHook('preHandler', async (request, reply) => {
    try {
      const builderId = getAuthenticatedBuilderId(request);
      (request as unknown as { builderId: string }).builderId = builderId;
    } catch (err) {
      if (err instanceof ApiError) {
        sendError(reply, err);
        return;
      }
      throw err;
    }
  });

  // GET /api/v1/credits/balance
  app.get('/balance', async (request: FastifyRequest, reply: FastifyReply) => {
    const builderId = (request as unknown as { builderId: string }).builderId;

    const balance = await CreditBalanceModel.getByBuilderId(builderId);
    if (!balance) {
      throw Errors.notFound('Credit balance');
    }

    const totalUsed = await CreditBalanceModel.getTotalUsed(builderId);
    const rate = await CreditRateConfigModel.getCurrentRate();

    return {
      available_credits: balance.available_credits,
      reserved_credits: balance.reserved_credits,
      total_credits_used: totalUsed,
      per_credit_rate: rate.per_credit_rate_cents / 100,
      per_credit_rate_cents: rate.per_credit_rate_cents,
    };
  });

  // GET /api/v1/credits/packs
  app.get('/packs', async () => {
    const packs = await CreditPackModel.listActive();
    return {
      packs: packs.map((p) => ({
        id: p.id,
        name: p.name,
        credit_amount: p.credit_amount,
        price: p.price_cents / 100,
        price_cents: p.price_cents,
      })),
    };
  });

  // POST /api/v1/credits/topup
  app.post('/topup', {
    schema: {
      body: {
        type: 'object',
        required: ['pack_id'],
        properties: {
          pack_id: { type: 'string', format: 'uuid' },
        },
        additionalProperties: false,
      },
    },
  }, async (request: FastifyRequest<{ Body: { pack_id: string } }>, reply: FastifyReply) => {
    const builderId = (request as unknown as { builderId: string }).builderId;
    const { pack_id } = request.body ?? {};

    if (!pack_id) {
      throw Errors.badRequest('pack_id is required');
    }

    // Get builder email for Stripe customer creation
    // Placeholder — will integrate with 001-foundation-auth builder lookup
    const builderEmail = `builder-${builderId}@blendedagents.com`;

    const result = await StripeService.createCheckoutSession(builderId, builderEmail, pack_id);
    return result;
  });

  // GET /api/v1/credits/transactions
  app.get('/transactions', async (
    request: FastifyRequest<{
      Querystring: { type?: string; cursor?: string; limit?: string };
    }>,
  ) => {
    const builderId = (request as unknown as { builderId: string }).builderId;
    const { type, cursor, limit: limitStr } = request.query;

    // Validate type filter
    if (type && !VALID_TRANSACTION_TYPES.includes(type as TransactionType)) {
      throw Errors.invalidFilter('type', type, VALID_TRANSACTION_TYPES);
    }

    const limit = limitStr ? parseInt(limitStr, 10) : undefined;
    if (limit !== undefined && (isNaN(limit) || limit < 1 || limit > 100)) {
      throw Errors.badRequest('limit must be between 1 and 100', { field: 'limit', value: limitStr });
    }

    const page = await TransactionModel.listByBuilder(builderId, {
      type: type as TransactionType | undefined,
      cursor,
      limit,
    });

    return {
      transactions: page.transactions.map((t) => ({
        id: t.id,
        type: t.type,
        credit_amount: t.credit_amount,
        currency_amount: t.currency_amount_cents / 100,
        currency_amount_cents: t.currency_amount_cents,
        description: t.description,
        test_case_id: t.test_case_id,
        created_at: t.created_at.toISOString(),
      })),
      next_cursor: page.next_cursor,
      has_more: page.has_more,
    };
  });
}
