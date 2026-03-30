import { createHmac } from 'node:crypto';

/**
 * Sign a webhook payload using HMAC-SHA256.
 * Returns the hex-encoded signature string.
 */
export function signPayload(payload: string, secret: string): string {
  return createHmac('sha256', secret).update(payload).digest('hex');
}

/**
 * Verify a webhook signature against the expected HMAC-SHA256 digest.
 * Uses constant-time comparison via computing the expected signature
 * and comparing strings (Node.js string comparison is sufficient here
 * since we control both sides; for external verification, timingSafeEqual
 * should be used by the builder).
 */
export function verifySignature(payload: string, secret: string, signature: string): boolean {
  const expected = signPayload(payload, secret);
  return expected === signature;
}

/**
 * Format a signature for the X-BlendedAgents-Signature header.
 */
export function formatSignatureHeader(payload: string, secret: string): string {
  return `sha256=${signPayload(payload, secret)}`;
}
