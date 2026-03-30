import { describe, it, expect, afterAll } from 'vitest';
import { buildApp } from '../../src/server.js';

const AUTH_HEADER = { authorization: 'Bearer ba_sk_test_key' };

describe('Contract: POST /api/v1/templates', () => {
  const app = buildApp();

  afterAll(async () => {
    await app.close();
  });

  it('returns 201 with correct response shape', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/templates',
      headers: AUTH_HEADER,
      payload: {
        title: 'Login Template',
        description: 'Standard login flow',
        steps: [{ instruction: 'Navigate to login page' }],
        expected_behavior: 'User is logged in',
      },
    });

    // Placeholder — requires real DB and auth
    expect(response.statusCode).toBe(201);
    const body = response.json();
    expect(body).toHaveProperty('id');
    expect(body).toHaveProperty('title');
    expect(body).toHaveProperty('steps');
    expect(body).toHaveProperty('created_at');
  });
});

describe('Contract: GET /api/v1/templates', () => {
  const app = buildApp();

  afterAll(async () => {
    await app.close();
  });

  it('returns correct list response shape', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/templates',
      headers: AUTH_HEADER,
    });

    // Placeholder — requires real DB and auth
    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body).toHaveProperty('templates');
    expect(Array.isArray(body.templates)).toBe(true);
  });
});

describe('Contract: PUT /api/v1/templates/:id', () => {
  const app = buildApp();

  afterAll(async () => {
    await app.close();
  });

  it('returns updated response', async () => {
    const templateId = '00000000-0000-0000-0000-000000000001';
    const response = await app.inject({
      method: 'PUT',
      url: `/api/v1/templates/${templateId}`,
      headers: AUTH_HEADER,
      payload: {
        title: 'Updated Template',
      },
    });

    // Placeholder — requires real DB and auth
    const body = response.json();
    expect(body).toHaveProperty('id');
    expect(body).toHaveProperty('title');
    expect(body).toHaveProperty('updated_at');
  });
});

describe('Contract: DELETE /api/v1/templates/:id', () => {
  const app = buildApp();

  afterAll(async () => {
    await app.close();
  });

  it('returns success message', async () => {
    const templateId = '00000000-0000-0000-0000-000000000001';
    const response = await app.inject({
      method: 'DELETE',
      url: `/api/v1/templates/${templateId}`,
      headers: AUTH_HEADER,
    });

    // Placeholder — requires real DB and auth
    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body).toHaveProperty('message');
  });
});

describe('Contract: POST /api/v1/templates/:id/use', () => {
  const app = buildApp();

  afterAll(async () => {
    await app.close();
  });

  it('returns 201 with test case creation response shape', async () => {
    const templateId = '00000000-0000-0000-0000-000000000001';
    const response = await app.inject({
      method: 'POST',
      url: `/api/v1/templates/${templateId}/use`,
      headers: AUTH_HEADER,
      payload: {
        staging_url: 'https://staging.example.com',
      },
    });

    // Placeholder — requires real DB and auth
    expect(response.statusCode).toBe(201);
    const body = response.json();
    expect(body).toHaveProperty('id');
    expect(body).toHaveProperty('status');
    expect(body).toHaveProperty('credit_cost');
    expect(body).toHaveProperty('has_credentials');
    expect(body).toHaveProperty('created_at');
  });
});
