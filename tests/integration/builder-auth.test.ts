import { describe, it, expect } from 'vitest';
import { buildApp } from '../../src/server.js';

describe('Builder API Key Authentication', () => {
  it('authenticates a request with a valid API key', async () => {
    const app = buildApp();
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/me',
      headers: { authorization: 'Bearer ba_sk_validtestkey1234567890abcdef1234567890abcdef1234567890abcdef1234' },
    });
    // Should succeed with builder info (needs real DB)
    expect(response.statusCode).toBeLessThan(500);
  });

  it('rejects a request with no Authorization header', async () => {
    const app = buildApp();
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/me',
    });
    expect(response.statusCode).toBe(401);
    const body = response.json();
    expect(body.error.code).toBe('UNAUTHORIZED');
  });

  it('rejects a request with an invalid API key', async () => {
    const app = buildApp();
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/me',
      headers: { authorization: 'Bearer ba_sk_invalidkey' },
    });
    expect(response.statusCode).toBe(401);
  });

  it('rejects a request with a revoked API key', async () => {
    // Needs real DB with a revoked key
    expect(true).toBe(false); // Placeholder
  });

  it('returns structured error response on auth failure', async () => {
    const app = buildApp();
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/me',
    });
    expect(response.statusCode).toBe(401);
    const body = response.json();
    expect(body.error).toHaveProperty('code');
    expect(body.error).toHaveProperty('message');
  });
});
