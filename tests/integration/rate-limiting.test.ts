import { describe, it, expect } from 'vitest';
import { buildApp } from '../../src/server.js';

describe('Rate Limiting', () => {
  it('allows up to 100 requests per minute', async () => {
    // Needs real app with rate limiting enabled
    expect(true).toBe(false); // Placeholder
  });

  it('returns 429 with retry-after on the 101st request', async () => {
    // Needs real app with rate limiting enabled
    expect(true).toBe(false); // Placeholder
  });

  it('includes rate limit headers in 429 response', async () => {
    // X-RateLimit-Limit, X-RateLimit-Remaining, X-RateLimit-Reset, Retry-After
    expect(true).toBe(false); // Placeholder
  });
});
