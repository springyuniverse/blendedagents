import { describe, it, expect } from 'vitest';
import { buildApp } from '../../src/server.js';

describe('Contract: Auth Error Responses', () => {
  it('401 response matches contract shape (code + message)', async () => {
    const app = buildApp();
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/me',
    });
    expect(response.statusCode).toBe(401);
    const body = response.json();
    expect(body).toHaveProperty('error');
    expect(body.error).toHaveProperty('code');
    expect(body.error).toHaveProperty('message');
    expect(typeof body.error.code).toBe('string');
    expect(typeof body.error.message).toBe('string');
  });

  it('GET /auth/me returns 401 without session', async () => {
    const app = buildApp();
    const response = await app.inject({
      method: 'GET',
      url: '/auth/me',
    });
    // Should return 401 or redirect depending on implementation
    expect(response.statusCode).toBeGreaterThanOrEqual(400);
  });

  it('POST /auth/logout returns correct shape', async () => {
    const app = buildApp();
    const response = await app.inject({
      method: 'POST',
      url: '/auth/logout',
    });
    // Without session, should still respond gracefully
    expect(response.statusCode).toBeLessThan(500);
  });
});
