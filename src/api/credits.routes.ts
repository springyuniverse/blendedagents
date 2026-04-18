import type { FastifyInstance, FastifyRequest } from 'fastify';
import { builderAuthPlugin } from '../middleware/builder-auth.js';
import { CreditBalanceModel } from '../models/credit-balance.js';
import { CreditRateConfigModel } from '../models/credit-rate-config.js';
import { TransactionModel, VALID_TRANSACTION_TYPES, type TransactionType } from '../models/transaction.js';
import { StripeService, calculateCreditsForAmount } from '../services/stripe.service.js';
import { Errors } from '../lib/errors.js';
import { sendAdminNotification } from '../lib/email.js';
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

  // GET /api/v1/credits/tweet-reward — check builder's tweet reward status
  app.get('/tweet-reward', async (request: FastifyRequest) => {
    const builder = request.builder!;
    const [reward] = await sql<{ id: string; tweet_url: string; credits_awarded: number; status: string; rejection_reason: string | null; created_at: Date }[]>`
      SELECT id, tweet_url, credits_awarded, status, rejection_reason, created_at
      FROM tweet_rewards
      WHERE builder_id = ${builder.id}
      ORDER BY created_at DESC
      LIMIT 1
    `;
    return {
      claimed: !!reward && reward.status === 'approved',
      reward: reward ? {
        tweet_url: reward.tweet_url,
        credits_awarded: reward.credits_awarded,
        status: reward.status,
        rejection_reason: reward.rejection_reason,
        created_at: reward.created_at.toISOString(),
      } : null,
    };
  });

  // POST /api/v1/credits/tweet-reward — submit tweet for admin review (no credits awarded yet)
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

    // Check if builder already has a pending or approved claim
    const [existing] = await sql<{ status: string }[]>`
      SELECT status FROM tweet_rewards
      WHERE builder_id = ${builder.id} AND status IN ('pending', 'approved')
    `;
    if (existing) {
      if (existing.status === 'pending') {
        throw Errors.badRequest('You already have a tweet submission pending review');
      }
      throw Errors.badRequest('Tweet reward already claimed');
    }

    // Insert as pending — credits awarded only after admin approves
    await sql`
      INSERT INTO tweet_rewards (builder_id, tweet_url, status)
      VALUES (${builder.id}, ${tweet_url}, 'pending')
    `;

    // Admin notification
    sendAdminNotification('tweet_reward_submitted', {
      actorName: builder.display_name,
      actorEmail: builder.email,
      message: `${builder.display_name} submitted a tweet for reward credits: ${tweet_url}`,
    });

    return {
      success: true,
      status: 'pending',
      message: 'Your tweet has been submitted for review. You\'ll receive 25 credits once approved.',
    };
  });
}
