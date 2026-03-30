import { describe, it, expect } from 'vitest';
import { generateApiKey, hashApiKey } from '../../src/lib/api-key.js';

describe('API Key Generation', () => {
  it('generates a key with ba_sk_ prefix', () => {
    const { key } = generateApiKey();
    expect(key.startsWith('ba_sk_')).toBe(true);
  });

  it('generates a key that is 70 chars total (6 prefix + 64 hex)', () => {
    const { key } = generateApiKey();
    expect(key.length).toBe(70);
  });

  it('returns a 64-char hex hash', () => {
    const { hash } = generateApiKey();
    expect(hash.length).toBe(64);
    expect(/^[0-9a-f]{64}$/.test(hash)).toBe(true);
  });
});

describe('API Key Hashing', () => {
  it('returns a 64-char hex string', () => {
    const hash = hashApiKey('ba_sk_test');
    expect(hash.length).toBe(64);
    expect(/^[0-9a-f]{64}$/.test(hash)).toBe(true);
  });

  it('is deterministic (same input produces same output)', () => {
    const input = 'ba_sk_deterministic_test';
    const hash1 = hashApiKey(input);
    const hash2 = hashApiKey(input);
    expect(hash1).toBe(hash2);
  });

  it('produces different hashes for different keys', () => {
    const hash1 = hashApiKey('ba_sk_key_one');
    const hash2 = hashApiKey('ba_sk_key_two');
    expect(hash1).not.toBe(hash2);
  });
});
