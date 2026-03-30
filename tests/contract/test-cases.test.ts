import { describe, it, expect, afterAll } from 'vitest';
import { buildApp } from '../../src/server.js';

const AUTH_HEADER = { authorization: 'Bearer ba_sk_test_key' };

describe('Contract: POST /api/v1/test-cases', () => {
  const app = buildApp();

  afterAll(async () => {
    await app.close();
  });

  it('returns 201 with correct response shape', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/test-cases',
      headers: AUTH_HEADER,
      payload: {
        title: 'Login flow test',
        description: 'Verify login works',
        staging_url: 'https://staging.example.com',
        steps: [{ instruction: 'Click login button' }],
        expected_behavior: 'User sees dashboard',
      },
    });

    // Placeholder — requires real DB and auth
    // When connected, assert:
    expect(response.statusCode).toBe(201);
    const body = response.json();
    expect(body).toHaveProperty('id');
    expect(body).toHaveProperty('status');
    expect(body).toHaveProperty('credit_cost');
    expect(body).toHaveProperty('has_credentials');
    expect(body).toHaveProperty('created_at');
    expect(typeof body.id).toBe('string');
    expect(typeof body.credit_cost).toBe('number');
    expect(typeof body.has_credentials).toBe('boolean');
  });

  it('returns 400 for missing required fields', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/test-cases',
      headers: AUTH_HEADER,
      payload: {
        // Missing title, steps, etc.
      },
    });

    // Placeholder — requires real DB and auth
    expect(response.statusCode).toBe(400);
    const body = response.json();
    expect(body).toHaveProperty('error');
    expect(body.error).toHaveProperty('code');
    expect(body.error).toHaveProperty('message');
  });
});

describe('Contract: GET /api/v1/test-cases', () => {
  const app = buildApp();

  afterAll(async () => {
    await app.close();
  });

  it('returns correct response shape', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/test-cases',
      headers: AUTH_HEADER,
    });

    // Placeholder — requires real DB and auth
    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body).toHaveProperty('test_cases');
    expect(body).toHaveProperty('next_cursor');
    expect(body).toHaveProperty('has_more');
    expect(Array.isArray(body.test_cases)).toBe(true);
    expect(typeof body.has_more).toBe('boolean');
  });
});

describe('Contract: GET /api/v1/test-cases/:id', () => {
  const app = buildApp();

  afterAll(async () => {
    await app.close();
  });

  it('returns correct response shape', async () => {
    const testId = '00000000-0000-0000-0000-000000000001';
    const response = await app.inject({
      method: 'GET',
      url: `/api/v1/test-cases/${testId}`,
      headers: AUTH_HEADER,
    });

    // Placeholder — requires real DB and auth
    // When connected, assert full field set:
    const body = response.json();
    expect(body).toHaveProperty('id');
    expect(body).toHaveProperty('title');
    expect(body).toHaveProperty('status');
    expect(body).toHaveProperty('has_credentials');
    expect(body).toHaveProperty('status_history');
    expect(typeof body.has_credentials).toBe('boolean');
    expect(Array.isArray(body.status_history)).toBe(true);
  });
});

describe('Contract: DELETE /api/v1/test-cases/:id', () => {
  const app = buildApp();

  afterAll(async () => {
    await app.close();
  });

  it('returns correct response shape', async () => {
    const testId = '00000000-0000-0000-0000-000000000001';
    const response = await app.inject({
      method: 'DELETE',
      url: `/api/v1/test-cases/${testId}`,
      headers: AUTH_HEADER,
    });

    // Placeholder — requires real DB and auth
    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body).toHaveProperty('status', 'cancelled');
    expect(body).toHaveProperty('credits_refunded');
    expect(typeof body.credits_refunded).toBe('number');
  });
});

describe('Contract: GET /api/v1/test-cases/:id/results', () => {
  const app = buildApp();

  afterAll(async () => {
    await app.close();
  });

  it('returns correct response shape', async () => {
    const testId = '00000000-0000-0000-0000-000000000001';
    const response = await app.inject({
      method: 'GET',
      url: `/api/v1/test-cases/${testId}/results`,
      headers: AUTH_HEADER,
    });

    // Placeholder — requires real DB and auth
    const body = response.json();
    expect(body).toHaveProperty('verdict');
    expect(body).toHaveProperty('per_step_results');
    expect(body).toHaveProperty('completed_at');
    expect(Array.isArray(body.per_step_results)).toBe(true);
  });
});
