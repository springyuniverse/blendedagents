import { describe, it, expect } from 'vitest';
import { buildApp } from '../../src/server.js';

// Contract tests for GET /api/v1/credits/packs
// Validates response shape matches the contract in contracts/credits-api.md

describe('Contract: GET /api/v1/credits/packs', () => {
  it('returns the correct response shape', async () => {
    const app = buildApp();

    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/credits/packs',
      headers: { authorization: 'Bearer ba_sk_test_key' },
    });

    expect(response.statusCode).toBe(200);
    const body = response.json();

    // Validate response shape per contract
    expect(body).toHaveProperty('packs');
    expect(Array.isArray(body.packs)).toBe(true);

    if (body.packs.length > 0) {
      const pack = body.packs[0];
      expect(pack).toHaveProperty('id');
      expect(pack).toHaveProperty('name');
      expect(pack).toHaveProperty('credit_amount');
      expect(pack).toHaveProperty('price');
      expect(pack).toHaveProperty('price_cents');

      // Validate types
      expect(typeof pack.id).toBe('string');
      expect(typeof pack.name).toBe('string');
      expect(typeof pack.credit_amount).toBe('number');
      expect(typeof pack.price).toBe('number');
      expect(typeof pack.price_cents).toBe('number');

      // Validate constraints
      expect(pack.credit_amount).toBeGreaterThan(0);
      expect(pack.price_cents).toBeGreaterThan(0);
    }
  });

  it('returns 401 without authentication', async () => {
    const app = buildApp();

    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/credits/packs',
    });

    expect(response.statusCode).toBe(401);
  });
});
