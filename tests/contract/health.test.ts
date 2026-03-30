import { describe, it, expect, afterAll } from 'vitest';
import buildApp from '../../src/server.js';

describe('GET /health', () => {
  const app = buildApp();

  afterAll(async () => {
    await app.close();
  });

  it('returns 200 with correct shape', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/health',
    });

    expect(response.statusCode).toBe(200);

    const body = response.json();
    expect(body).toHaveProperty('status');
    expect(body).toHaveProperty('database');
    expect(body).toHaveProperty('uptime_seconds');
    expect(typeof body.status).toBe('string');
    expect(typeof body.uptime_seconds).toBe('number');
  });
});
