import { describe, it, expect } from 'vitest';
import { buildApp } from '../../src/server.js';

// Contract tests for GET /api/v1/credits/balance
// Validates response shape matches the contract in contracts/credits-api.md

describe('Contract: GET /api/v1/credits/balance', () => {
  it('returns the correct response shape', async () => {
    const app = buildApp();

    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/credits/balance',
      headers: { authorization: 'Bearer ba_sk_test_key' },
    });

    expect(response.statusCode).toBe(200);
    const body = response.json();

    // Validate response shape per contract
    expect(body).toHaveProperty('available_credits');
    expect(body).toHaveProperty('reserved_credits');
    expect(body).toHaveProperty('total_credits_used');
    expect(body).toHaveProperty('per_credit_rate');
    expect(body).toHaveProperty('per_credit_rate_cents');

    // Validate types
    expect(typeof body.available_credits).toBe('number');
    expect(typeof body.reserved_credits).toBe('number');
    expect(typeof body.total_credits_used).toBe('number');
    expect(typeof body.per_credit_rate).toBe('number');
    expect(typeof body.per_credit_rate_cents).toBe('number');

    // Validate constraints
    expect(Number.isInteger(body.available_credits)).toBe(true);
    expect(Number.isInteger(body.reserved_credits)).toBe(true);
    expect(body.available_credits).toBeGreaterThanOrEqual(0);
    expect(body.reserved_credits).toBeGreaterThanOrEqual(0);
  });

  it('returns 401 without authentication', async () => {
    const app = buildApp();

    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/credits/balance',
    });

    expect(response.statusCode).toBe(401);
    const body = response.json();
    expect(body.error).toHaveProperty('code');
    expect(body.error).toHaveProperty('message');
  });
});
