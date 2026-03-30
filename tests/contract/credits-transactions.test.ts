import { describe, it, expect } from 'vitest';
import { buildApp } from '../../src/server.js';

// Contract tests for GET /api/v1/credits/transactions
// Validates response shape matches the contract in contracts/credits-api.md

describe('Contract: GET /api/v1/credits/transactions', () => {
  it('returns the correct response shape', async () => {
    const app = buildApp();

    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/credits/transactions',
      headers: { authorization: 'Bearer ba_sk_test_key' },
    });

    expect(response.statusCode).toBe(200);
    const body = response.json();

    // Validate response shape per contract
    expect(body).toHaveProperty('transactions');
    expect(body).toHaveProperty('next_cursor');
    expect(body).toHaveProperty('has_more');
    expect(Array.isArray(body.transactions)).toBe(true);
    expect(typeof body.has_more).toBe('boolean');

    if (body.transactions.length > 0) {
      const txn = body.transactions[0];
      expect(txn).toHaveProperty('id');
      expect(txn).toHaveProperty('type');
      expect(txn).toHaveProperty('credit_amount');
      expect(txn).toHaveProperty('currency_amount');
      expect(txn).toHaveProperty('currency_amount_cents');
      expect(txn).toHaveProperty('description');
      expect(txn).toHaveProperty('created_at');

      expect(typeof txn.id).toBe('string');
      expect(typeof txn.type).toBe('string');
      expect(typeof txn.credit_amount).toBe('number');
      expect(typeof txn.currency_amount).toBe('number');
      expect(typeof txn.currency_amount_cents).toBe('number');
      expect(typeof txn.description).toBe('string');
      expect(typeof txn.created_at).toBe('string');
    }
  });

  it('accepts type filter parameter', async () => {
    const app = buildApp();

    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/credits/transactions?type=charge',
      headers: { authorization: 'Bearer ba_sk_test_key' },
    });

    expect(response.statusCode).toBe(200);
  });

  it('returns structured error for invalid type filter', async () => {
    const app = buildApp();

    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/credits/transactions?type=invalid',
      headers: { authorization: 'Bearer ba_sk_test_key' },
    });

    expect(response.statusCode).toBe(400);
    const body = response.json();
    expect(body.error.code).toBe('INVALID_FILTER');
    expect(body.error).toHaveProperty('message');
    expect(body.error).toHaveProperty('context');
  });

  it('accepts cursor and limit parameters', async () => {
    const app = buildApp();

    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/credits/transactions?limit=5&cursor=2026-03-30T00:00:00.000Z',
      headers: { authorization: 'Bearer ba_sk_test_key' },
    });

    expect(response.statusCode).toBe(200);
  });

  it('returns 401 without authentication', async () => {
    const app = buildApp();

    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/credits/transactions',
    });

    expect(response.statusCode).toBe(401);
  });
});
