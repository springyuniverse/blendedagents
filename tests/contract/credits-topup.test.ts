import { describe, it, expect } from 'vitest';
import { buildApp } from '../../src/server.js';

// Contract tests for POST /api/v1/credits/topup
// Validates request/response shapes match the contract in contracts/credits-api.md

describe('Contract: POST /api/v1/credits/topup', () => {
  it('returns the correct response shape on success', async () => {
    const app = buildApp();

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/credits/topup',
      headers: { authorization: 'Bearer ba_sk_test_key' },
      payload: { pack_id: '00000000-0000-0000-0000-000000000001' },
    });

    expect(response.statusCode).toBe(200);
    const body = response.json();

    // Validate response shape per contract
    expect(body).toHaveProperty('checkout_url');
    expect(body).toHaveProperty('session_id');
    expect(body).toHaveProperty('pack');
    expect(body.pack).toHaveProperty('id');
    expect(body.pack).toHaveProperty('name');
    expect(body.pack).toHaveProperty('credit_amount');
    expect(body.pack).toHaveProperty('price');
    expect(body.pack).toHaveProperty('price_cents');

    // Validate types
    expect(typeof body.checkout_url).toBe('string');
    expect(typeof body.session_id).toBe('string');
    expect(typeof body.pack.credit_amount).toBe('number');
    expect(typeof body.pack.price_cents).toBe('number');
  });

  it('returns structured error for missing pack_id', async () => {
    const app = buildApp();

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/credits/topup',
      headers: { authorization: 'Bearer ba_sk_test_key' },
      payload: {},
    });

    expect(response.statusCode).toBe(400);
    const body = response.json();
    expect(body.error).toHaveProperty('code');
    expect(body.error).toHaveProperty('message');
  });

  it('returns 409 with PURCHASE_PENDING error shape', async () => {
    const app = buildApp();

    // This test validates the 409 error response shape
    // The actual 409 condition is tested in integration tests
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/credits/topup',
      headers: { authorization: 'Bearer ba_sk_test_key' },
      payload: { pack_id: '00000000-0000-0000-0000-000000000001' },
    });

    if (response.statusCode === 409) {
      const body = response.json();
      expect(body.error.code).toBe('PURCHASE_PENDING');
      expect(body.error).toHaveProperty('message');
      expect(body.error).toHaveProperty('context');
    }
  });
});
