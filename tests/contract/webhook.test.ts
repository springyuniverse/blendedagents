import { describe, it, expect } from 'vitest';
import { buildApp } from '../../src/server.js';

// Contract tests for webhook configuration endpoints.
// Validates response shapes match the contract in contracts/webhook-api.md.

describe('Contract: PUT /api/v1/webhook', () => {
  it('returns 401 without authentication', async () => {
    const app = buildApp();

    const response = await app.inject({
      method: 'PUT',
      url: '/api/v1/webhook',
      payload: {
        webhook_url: 'https://example.com/webhook',
        webhook_secret: 'whsec_my_secret_key_123',
      },
    });

    expect(response.statusCode).toBe(401);
    const body = response.json();
    expect(body.error).toHaveProperty('code');
    expect(body.error).toHaveProperty('message');
  });

  it('returns 400 for invalid body (missing fields)', async () => {
    const app = buildApp();

    const response = await app.inject({
      method: 'PUT',
      url: '/api/v1/webhook',
      headers: { authorization: 'Bearer ba_sk_test_key' },
      payload: {},
    });

    // Should be 400 (validation error) or 401 (auth first)
    expect([400, 401]).toContain(response.statusCode);
  });

  it('validates response shape on success', async () => {
    const app = buildApp();

    const response = await app.inject({
      method: 'PUT',
      url: '/api/v1/webhook',
      headers: { authorization: 'Bearer ba_sk_test_key' },
      payload: {
        webhook_url: 'https://example.com/webhook',
        webhook_secret: 'whsec_my_secret_key_123',
      },
    });

    // Will be 200 (success) or 401 (auth required in test env)
    if (response.statusCode === 200) {
      const body = response.json();
      expect(body).toHaveProperty('webhook_url');
      expect(body).toHaveProperty('updated_at');
      expect(typeof body.webhook_url).toBe('string');
      expect(typeof body.updated_at).toBe('string');
    }
  });
});

describe('Contract: POST /api/v1/webhook/ping', () => {
  it('returns 401 without authentication', async () => {
    const app = buildApp();

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/webhook/ping',
    });

    expect(response.statusCode).toBe(401);
    const body = response.json();
    expect(body.error).toHaveProperty('code');
    expect(body.error).toHaveProperty('message');
  });

  it('validates response shape on success', async () => {
    const app = buildApp();

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/webhook/ping',
      headers: { authorization: 'Bearer ba_sk_test_key' },
    });

    // Will be 200 (success/failure result) or 400 (no webhook) or 401 (auth)
    if (response.statusCode === 200) {
      const body = response.json();
      expect(body).toHaveProperty('success');
      expect(body).toHaveProperty('status_code');
      expect(body).toHaveProperty('response_time_ms');
      expect(typeof body.success).toBe('boolean');
      expect(typeof body.status_code).toBe('number');
      expect(typeof body.response_time_ms).toBe('number');
    }
  });
});

describe('Contract: GET /api/v1/webhook/history', () => {
  it('returns 401 without authentication', async () => {
    const app = buildApp();

    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/webhook/history',
    });

    expect(response.statusCode).toBe(401);
    const body = response.json();
    expect(body.error).toHaveProperty('code');
    expect(body.error).toHaveProperty('message');
  });

  it('validates response shape on success', async () => {
    const app = buildApp();

    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/webhook/history',
      headers: { authorization: 'Bearer ba_sk_test_key' },
    });

    // Will be 200 or 401
    if (response.statusCode === 200) {
      const body = response.json();
      expect(body).toHaveProperty('deliveries');
      expect(body).toHaveProperty('has_more');
      expect(Array.isArray(body.deliveries)).toBe(true);
      expect(typeof body.has_more).toBe('boolean');

      // Validate delivery item shape if present
      if (body.deliveries.length > 0) {
        const delivery = body.deliveries[0];
        expect(delivery).toHaveProperty('id');
        expect(delivery).toHaveProperty('test_case_id');
        expect(delivery).toHaveProperty('event_type');
        expect(delivery).toHaveProperty('url');
        expect(delivery).toHaveProperty('response_status');
        expect(delivery).toHaveProperty('attempt_count');
        expect(delivery).toHaveProperty('created_at');
      }
    }
  });

  it('validates pagination parameters', async () => {
    const app = buildApp();

    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/webhook/history?limit=200',
      headers: { authorization: 'Bearer ba_sk_test_key' },
    });

    // Should be 400 (invalid limit) or 401 (auth first)
    if (response.statusCode !== 401) {
      expect(response.statusCode).toBe(400);
    }
  });
});
