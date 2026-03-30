import { stripe, verifyWebhookSignature } from '../lib/stripe.js';
import { CreditPackModel } from '../models/credit-pack.js';
import { CreditBalanceModel } from '../models/credit-balance.js';
import { CreditService } from './credit.service.js';
import { Errors } from '../lib/errors.js';
import sql from '../lib/db.js';
import type Stripe from 'stripe';

// Track pending purchases per builder to prevent concurrent top-ups
// In production, this would use the database partial unique index
const pendingSessions = new Map<string, string>();

export const StripeService = {
  async createCheckoutSession(
    builderId: string,
    builderEmail: string,
    packId: string,
  ): Promise<{ checkout_url: string; session_id: string; pack: ReturnType<typeof formatPack> }> {
    // Validate pack exists and is active
    const pack = await CreditPackModel.findById(packId);
    if (!pack) {
      throw Errors.badRequest('Invalid or inactive credit pack', { pack_id: packId });
    }

    // Prevent concurrent purchases
    if (pendingSessions.has(builderId)) {
      throw Errors.conflict('PURCHASE_PENDING',
        'You already have a pending credit purchase. Please complete or wait for it to expire before starting a new one.',
        { existing_session_id: pendingSessions.get(builderId) },
      );
    }

    // Ensure Stripe customer exists (lazy creation)
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

    // Create Stripe Checkout Session
    const session = await stripe.checkout.sessions.create({
      customer: stripeCustomerId,
      mode: 'payment',
      line_items: [{
        price: pack.stripe_price_id,
        quantity: 1,
      }],
      metadata: {
        builder_id: builderId,
        pack_id: pack.id,
      },
      success_url: `${process.env.APP_URL || 'http://localhost:3000'}/credits?success=true`,
      cancel_url: `${process.env.APP_URL || 'http://localhost:3000'}/credits?cancelled=true`,
      expires_at: Math.floor(Date.now() / 1000) + 30 * 60, // 30 minutes
    });

    // Track pending session
    pendingSessions.set(builderId, session.id);

    // Auto-cleanup on expiry
    setTimeout(() => {
      if (pendingSessions.get(builderId) === session.id) {
        pendingSessions.delete(builderId);
      }
    }, 30 * 60 * 1000);

    return {
      checkout_url: session.url!,
      session_id: session.id,
      pack: formatPack(pack),
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
        // Unknown event type — ignore silently per contract
        return { processed: false, event_type: event.type };
    }
  },
};

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const builderId = session.metadata?.builder_id;
  const packId = session.metadata?.pack_id;

  if (!builderId || !packId) {
    console.warn('Webhook: checkout.session.completed missing metadata', {
      session_id: session.id,
      metadata: session.metadata,
    });
    return;
  }

  // Verify builder exists
  const [builder] = await sql<{ id: string }[]>`
    SELECT id FROM builders WHERE id = ${builderId}
  `;
  if (!builder) {
    console.warn('Webhook: unmatched builder_id, logging for audit', {
      session_id: session.id,
      builder_id: builderId,
    });
    return;
  }

  // Get pack details
  const pack = await CreditPackModel.findById(packId);
  if (!pack) {
    console.warn('Webhook: unmatched pack_id', {
      session_id: session.id,
      pack_id: packId,
    });
    return;
  }

  // Ensure credit balance row exists
  await CreditBalanceModel.ensureExists(builderId);

  // Grant credits (idempotent via stripe_session_id unique constraint)
  await CreditService.topupCredits(
    builderId,
    pack.credit_amount,
    pack.price_cents,
    session.id,
    `Purchased ${pack.name} (${pack.credit_amount} credits)`,
  );

  // Clear pending session tracker
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

function formatPack(pack: { id: string; name: string; credit_amount: number; price_cents: number }) {
  return {
    id: pack.id,
    name: pack.name,
    credit_amount: pack.credit_amount,
    price: pack.price_cents / 100,
    price_cents: pack.price_cents,
  };
}
