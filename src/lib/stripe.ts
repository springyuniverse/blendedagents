import Stripe from 'stripe';

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY ?? '';

export const stripe = new Stripe(STRIPE_SECRET_KEY);

export const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET ?? '';

export function verifyWebhookSignature(
  payload: string | Buffer,
  signature: string,
): Stripe.Event {
  return stripe.webhooks.constructEvent(payload, signature, STRIPE_WEBHOOK_SECRET!);
}
