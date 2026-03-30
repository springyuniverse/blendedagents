import { describe, it, expect } from 'vitest';
import { buildApp } from '../../src/server.js';

// Integration tests for credit top-up flow
// Expected to FAIL until implementation is complete

describe('Credit Top-Up Flow', () => {
  describe('POST /api/v1/credits/topup', () => {
    it('creates a Stripe Checkout session and returns URL', async () => {
      const app = buildApp();

      // Given a builder with a valid API key and a valid pack_id
      // When they POST to /api/v1/credits/topup
      // Then they receive a checkout_url and session_id
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/credits/topup',
        headers: { authorization: 'Bearer ba_sk_test_key' },
        payload: { pack_id: '00000000-0000-0000-0000-000000000001' },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body).toHaveProperty('checkout_url');
      expect(body).toHaveProperty('session_id');
      expect(body).toHaveProperty('pack');
    });

    it('returns 409 when builder has a pending purchase', async () => {
      const app = buildApp();

      // Given a builder who already has a pending checkout session
      // When they POST to /api/v1/credits/topup again
      // Then they receive 409 Conflict with PURCHASE_PENDING code
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/credits/topup',
        headers: { authorization: 'Bearer ba_sk_test_key' },
        payload: { pack_id: '00000000-0000-0000-0000-000000000001' },
      });

      expect(response.statusCode).toBe(409);
      const body = response.json();
      expect(body.error.code).toBe('PURCHASE_PENDING');
    });

    it('returns 400 for invalid pack_id', async () => {
      const app = buildApp();

      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/credits/topup',
        headers: { authorization: 'Bearer ba_sk_test_key' },
        payload: { pack_id: 'nonexistent-pack' },
      });

      expect(response.statusCode).toBe(400);
    });
  });
});
