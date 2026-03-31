import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the database module
vi.mock('../../src/lib/db.js', () => {
  const mockSql = Object.assign(
    // Tagged template function
    (_strings: TemplateStringsArray, ..._values: unknown[]) => Promise.resolve([]),
    {
      json: (val: unknown) => val,
    }
  );
  return { default: mockSql };
});

// Mock the API key module
vi.mock('../../src/lib/api-key.js', () => ({
  hashApiKey: (key: string) => `hashed_${key}`,
  generateApiKey: () => ({ key: 'ba_sk_test', hash: 'hash_test', prefix: 'ba_sk_te' }),
}));

// Mock the supabase module
vi.mock('../../src/lib/supabase.js', () => ({
  supabaseAdmin: {
    auth: {
      getUser: vi.fn(),
    },
  },
  SUPABASE_URL: 'https://test.supabase.co',
  SUPABASE_ANON_KEY: 'test-anon-key',
}));

import { AuthService } from '../../src/services/auth.service.js';

describe('AuthService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    AuthService.clearCache();
  });

  describe('verifyApiKey', () => {
    it('should return null for a key with no matching record', async () => {
      const result = await AuthService.verifyApiKey('ba_sk_nonexistent');
      expect(result).toBeNull();
    });
  });

  describe('findOrCreateBuilder', () => {
    it('should be a function', () => {
      expect(typeof AuthService.findOrCreateBuilder).toBe('function');
    });
  });

  describe('findOrCreateTester', () => {
    it('should be a function', () => {
      expect(typeof AuthService.findOrCreateTester).toBe('function');
    });
  });

  describe('clearCache', () => {
    it('should clear the API key cache without error', () => {
      expect(() => AuthService.clearCache()).not.toThrow();
    });
  });
});
