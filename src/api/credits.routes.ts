import type { FastifyInstance, FastifyRequest } from 'fastify';
import { builderAuthPlugin } from '../middleware/builder-auth.js';
import { CreditBalanceModel } from '../models/credit-balance.js';
import { CreditRateConfigModel } from '../models/credit-rate-config.js';
import { TransactionModel, VALID_TRANSACTION_TYPES, type TransactionType } from '../models/transaction.js';
import { StripeService, calculateCreditsForAmount } from '../services/stripe.service.js';
import { Errors } from '../lib/errors.js';
import sql from '../lib/db.js';

export async function creditsRoutes(app: FastifyInstance) {
  await builderAuthPlugin(app);

  // GET /api/v1/credits/balance
  app.get('/balance', async (request: FastifyRequest) => {
    const builder = request.builder!;

    const balance = await CreditBalanceModel.getByBuilderId(builder.id);
    if (!balance) {
      return {
        available_credits: 0,
        reserved_credits: 0,
        total_credits_used: 0,
        per_credit_rate: 0,
        per_credit_rate_cents: 0,
      };
    }

    const totalUsed = await CreditBalanceModel.getTotalUsed(builder.id);
    const rate = await CreditRateConfigModel.getCurrentRate();

    return {
      available_credits: balance.available_credits,
      reserved_credits: balance.reserved_credits,
      total_credits_used: totalUsed,
      per_credit_rate: rate ? rate.per_credit_rate_cents / 100 : 0,
      per_credit_rate_cents: rate?.per_credit_rate_cents ?? 0,
    };
  });

  // GET /api/v1/credits/estimate?amount_cents=2500
  app.get('/estimate', async (
    request: FastifyRequest<{ Querystring: { amount_cents?: string } }>,
  ) => {
    const amountCents = parseInt(request.query.amount_cents || '1000', 10);
    if (isNaN(amountCents) || amountCents < 0) {
      throw Errors.badRequest('amount_cents must be a positive integer');
    }
    const result = calculateCreditsForAmount(amountCents);
    return {
      amount_cents: amountCents,
      amount: amountCents / 100,
      credits: result.credits,
      per_credit_cents: result.perCreditCents,
      per_credit: result.perCreditCents / 100,
      discount_label: result.discountLabel,
    };
  });

  // POST /api/v1/credits/topup
  app.post('/topup', {
    schema: {
      body: {
        type: 'object',
        required: ['amount_cents'],
        properties: {
          amount_cents: { type: 'integer', minimum: 1000, maximum: 100000 },
        },
        additionalProperties: false,
      },
    },
  }, async (request: FastifyRequest<{ Body: { amount_cents: number } }>) => {
    const builder = request.builder!;
    const { amount_cents } = request.body;

    const result = await StripeService.createCheckoutSession(builder.id, builder.email, amount_cents);
    return result;
  });

  // GET /api/v1/credits/transactions
  app.get('/transactions', async (
    request: FastifyRequest<{
      Querystring: { type?: string; cursor?: string; limit?: string };
    }>,
  ) => {
    const builder = request.builder!;
    const { type, cursor, limit: limitStr } = request.query;

    if (type && !VALID_TRANSACTION_TYPES.includes(type as TransactionType)) {
      throw Errors.invalidFilter('type', type, VALID_TRANSACTION_TYPES);
    }

    const limit = limitStr ? parseInt(limitStr, 10) : undefined;
    if (limit !== undefined && (isNaN(limit) || limit < 1 || limit > 100)) {
      throw Errors.badRequest('limit must be between 1 and 100', { field: 'limit', value: limitStr });
    }

    const page = await TransactionModel.listByBuilder(builder.id, {
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

  // GET /api/v1/credits/tweet-reward — check if builder already claimed
  app.get('/tweet-reward', async (request: FastifyRequest) => {
    const builder = request.builder!;
    const [reward] = await sql<{ id: string; tweet_url: string; credits_awarded: number; created_at: Date }[]>`
      SELECT id, tweet_url, credits_awarded, created_at
      FROM tweet_rewards
      WHERE builder_id = ${builder.id} AND status = 'credited'
    `;
    return { claimed: !!reward, reward: reward ? { tweet_url: reward.tweet_url, credits_awarded: reward.credits_awarded, created_at: reward.created_at.toISOString() } : null };
  });

  // POST /api/v1/credits/tweet-reward — claim tweet credits
  app.post('/tweet-reward', {
    schema: {
      body: {
        type: 'object',
        required: ['tweet_url'],
        properties: {
          tweet_url: { type: 'string', minLength: 10, maxLength: 500 },
        },
        additionalProperties: false,
      },
    },
  }, async (request: FastifyRequest<{ Body: { tweet_url: string } }>) => {
    const builder = request.builder!;
    const { tweet_url } = request.body;

    // Validate tweet URL format
    const tweetPattern = /^https?:\/\/(x\.com|twitter\.com)\/\w+\/status\/\d+/;
    if (!tweetPattern.test(tweet_url)) {
      throw Errors.badRequest('Invalid tweet URL. Must be a link to a post on x.com or twitter.com', { field: 'tweet_url' });
    }

    const REWARD_CREDITS = 25;

    const result = await sql.begin(async (tx: any) => {
      // Check if already claimed (unique index will catch race conditions too)
      const [existing] = await tx<{ id: string }[]>`
        SELECT id FROM tweet_rewards
        WHERE builder_id = ${builder.id} AND status = 'credited'
      `;
      if (existing) {
        throw Errors.badRequest('Tweet reward already claimed');
      }

      // Ensure credit balance exists
      await CreditBalanceModel.ensureExists(builder.id);

      // Insert reward record
      await tx`
        INSERT INTO tweet_rewards (builder_id, tweet_url, credits_awarded)
        VALUES (${builder.id}, ${tweet_url}, ${REWARD_CREDITS})
      `;

      // Add credits
      await CreditBalanceModel.topup(builder.id, REWARD_CREDITS, tx);

      // Record transaction
      await TransactionModel.insert({
        type: 'topup',
        builder_id: builder.id,
        credit_amount: REWARD_CREDITS,
        currency_amount_cents: 0,
        description: `Tweet reward: ${REWARD_CREDITS} free credits`,
      }, tx);

      return { credits_awarded: REWARD_CREDITS };
    });

    return { success: true, credits_awarded: result.credits_awarded, message: `${result.credits_awarded} credits added to your account` };
  });
}
