import { stripe, verifyWebhookSignature } from '../lib/stripe.js';
import { CreditBalanceModel } from '../models/credit-balance.js';
import { CreditService } from './credit.service.js';
import { Errors } from '../lib/errors.js';
import sql from '../lib/db.js';
import type Stripe from 'stripe';

// Volume discount tiers: spend more → get more credits per dollar
const CREDIT_TIERS = [
  { minCents: 20000, perCreditCents: 7, label: '$200+, 30% off' },   // $200+ → $0.07/credit
  { minCents: 10000, perCreditCents: 8, label: '$100+, 20% off' },   // $100+ → $0.08/credit
  { minCents: 5000,  perCreditCents: 9, label: '$50+, 10% off' },    // $50+  → $0.09/credit
  { minCents: 0,     perCreditCents: 10, label: 'Base rate' },        // default → $0.10/credit
];

const MIN_AMOUNT_CENTS = 1000; // $10 minimum
const MAX_AMOUNT_CENTS = 100000; // $1,000 maximum

export function calculateCreditsForAmount(amountCents: number): { credits: number; perCreditCents: number; discountLabel: string } {
  const tier = CREDIT_TIERS.find(t => amountCents >= t.minCents) ?? CREDIT_TIERS[CREDIT_TIERS.length - 1];
  return {
    credits: Math.floor(amountCents / tier.perCreditCents),
    perCreditCents: tier.perCreditCents,
    discountLabel: tier.label,
  };
}

// Track pending purchases per builder to prevent concurrent top-ups
const pendingSessions = new Map<string, string>();

export const StripeService = {
  async createCheckoutSession(
    builderId: string,
    builderEmail: string,
    amountCents: number,
  ): Promise<{ checkout_url: string; session_id: string; credits: number; amount_cents: number }> {
    if (amountCents < MIN_AMOUNT_CENTS) {
      throw Errors.badRequest(`Minimum top-up is $${MIN_AMOUNT_CENTS / 100}`, { min_cents: MIN_AMOUNT_CENTS });
    }
    if (amountCents > MAX_AMOUNT_CENTS) {
      throw Errors.badRequest(`Maximum top-up is $${MAX_AMOUNT_CENTS / 100}`, { max_cents: MAX_AMOUNT_CENTS });
    }

    const { credits } = calculateCreditsForAmount(amountCents);

    // Prevent concurrent purchases
    if (pendingSessions.has(builderId)) {
      throw Errors.conflict('PURCHASE_PENDING',
        'You already have a pending credit purchase. Please complete or wait for it to expire.',
        { existing_session_id: pendingSessions.get(builderId) },
      );
    }

    // Ensure Stripe customer exists
    let stripeCustomerId = await getStripeCustomerId(builderId);
    if (!stripeCustomerId) {
      const customer = await stripe.customers.create({
        email: builderEmail,
        metadata: { builder_id: builderId },
      });
      stripeCustomerId = customer.id;
      await sql`
        UPDATE builders SET stripe_customer_id = ${stripeCustomerId}
        WHERE id = ${builderId}
      `;
    }

    // Create Stripe Checkout Session with dynamic price
    const session = await stripe.checkout.sessions.create({
      customer: stripeCustomerId,
      mode: 'payment',
      line_items: [{
        price_data: {
          currency: 'usd',
          product_data: {
            name: `${credits} BlendedAgents Credits`,
            description: `Top up your testing credits`,
          },
          unit_amount: amountCents,
        },
        quantity: 1,
      }],
      metadata: {
        builder_id: builderId,
        credits: String(credits),
        amount_cents: String(amountCents),
      },
      success_url: `${process.env.APP_URL || 'http://localhost:3000'}/builder/credits?success=true`,
      cancel_url: `${process.env.APP_URL || 'http://localhost:3000'}/builder/credits?cancelled=true`,
      expires_at: Math.floor(Date.now() / 1000) + 30 * 60,
    });

    pendingSessions.set(builderId, session.id);

    setTimeout(() => {
      if (pendingSessions.get(builderId) === session.id) {
        pendingSessions.delete(builderId);
      }
    }, 30 * 60 * 1000);

    return {
      checkout_url: session.url!,
      session_id: session.id,
      credits,
      amount_cents: amountCents,
    };
  },

  async processWebhook(
    rawBody: string | Buffer,
    signature: string,
  ): Promise<{ processed: boolean; event_type: string }> {
    const event = verifyWebhookSignature(rawBody, signature);

    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session);
        return { processed: true, event_type: event.type };

      case 'checkout.session.expired':
        await handleCheckoutExpired(event.data.object as Stripe.Checkout.Session);
        return { processed: true, event_type: event.type };

      default:
        return { processed: false, event_type: event.type };
    }
  },
};

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const builderId = session.metadata?.builder_id;
  const creditsStr = session.metadata?.credits;
  const amountCentsStr = session.metadata?.amount_cents;

  if (!builderId || !creditsStr || !amountCentsStr) {
    console.warn('Webhook: checkout.session.completed missing metadata', {
      session_id: session.id,
      metadata: session.metadata,
    });
    return;
  }

  const credits = parseInt(creditsStr, 10);
  const amountCents = parseInt(amountCentsStr, 10);

  const [builder] = await sql<{ id: string }[]>`
    SELECT id FROM builders WHERE id = ${builderId}
  `;
  if (!builder) {
    console.warn('Webhook: unmatched builder_id', { session_id: session.id, builder_id: builderId });
    return;
  }

  await CreditBalanceModel.ensureExists(builderId);

  await CreditService.topupCredits(
    builderId,
    credits,
    amountCents,
    session.id,
    `Added ${credits} credits ($${(amountCents / 100).toFixed(2)})`,
  );

  pendingSessions.delete(builderId);
}

async function handleCheckoutExpired(session: Stripe.Checkout.Session) {
  const builderId = session.metadata?.builder_id;
  if (builderId) {
    pendingSessions.delete(builderId);
  }
}

async function getStripeCustomerId(builderId: string): Promise<string | null> {
  const [row] = await sql<{ stripe_customer_id: string | null }[]>`
    SELECT stripe_customer_id FROM builders WHERE id = ${builderId}
  `;
  return row?.stripe_customer_id ?? null;
}
