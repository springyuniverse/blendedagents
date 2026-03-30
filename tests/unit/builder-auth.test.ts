import { describe, it, expect, vi, beforeEach } from 'vitest';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

// Mock the database module before importing the service
vi.mock('../../src/lib/db.js', () => {
  const mockSql = Object.assign(
    // Tagged template function
    (_strings: TemplateStringsArray, ..._values: unknown[]) => Promise.resolve([]),
    {}
  );
  return { default: mockSql };
});

// Mock auth service
vi.mock('../../src/services/auth.service.js', () => ({
  AuthService: {
    createApiKey: vi.fn().mockResolvedValue({ key: 'ba_sk_testapikey123', id: 'key-id-1' }),
  },
}));

import { BuilderAuthService, type JwtPayload } from '../../src/services/builder-auth.service.js';

const TEST_JWT_SECRET = 'dev-jwt-secret';

describe('BuilderAuthService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Password hashing', () => {
    it('should hash a password and verify it correctly', async () => {
      const password = 'mySecurePassword123';
      const hash = await BuilderAuthService.hashPassword(password);

      expect(hash).not.toBe(password);
      expect(hash).toMatch(/^\$2[aby]?\$/); // bcrypt hash pattern

      const isValid = await BuilderAuthService.comparePassword(password, hash);
      expect(isValid).toBe(true);
    });

    it('should reject an incorrect password', async () => {
      const hash = await BuilderAuthService.hashPassword('correctPassword');
      const isValid = await BuilderAuthService.comparePassword('wrongPassword', hash);
      expect(isValid).toBe(false);
    });

    it('should produce different hashes for the same password (salted)', async () => {
      const password = 'samePassword';
      const hash1 = await BuilderAuthService.hashPassword(password);
      const hash2 = await BuilderAuthService.hashPassword(password);
      expect(hash1).not.toBe(hash2);

      // But both should verify correctly
      expect(await BuilderAuthService.comparePassword(password, hash1)).toBe(true);
      expect(await BuilderAuthService.comparePassword(password, hash2)).toBe(true);
    });
  });

  describe('JWT token generation and verification', () => {
    it('should generate a valid JWT token', () => {
      const builder = { id: 'builder-123', email: 'test@example.com' };
      const token = BuilderAuthService.generateToken(builder);

      expect(token).toBeTruthy();
      expect(typeof token).toBe('string');
      expect(token.split('.')).toHaveLength(3); // JWT has 3 parts
    });

    it('should verify a valid token and return the payload', () => {
      const builder = { id: 'builder-456', email: 'builder@test.com' };
      const token = BuilderAuthService.generateToken(builder);
      const payload = BuilderAuthService.verifyToken(token);

      expect(payload).not.toBeNull();
      expect(payload!.builderId).toBe('builder-456');
      expect(payload!.email).toBe('builder@test.com');
    });

    it('should return null for an invalid token', () => {
      const result = BuilderAuthService.verifyToken('invalid.token.here');
      expect(result).toBeNull();
    });

    it('should return null for a tampered token', () => {
      const builder = { id: 'builder-789', email: 'test@test.com' };
      const token = BuilderAuthService.generateToken(builder);
      // Tamper with the token by changing a character
      const tampered = token.slice(0, -1) + (token.slice(-1) === 'a' ? 'b' : 'a');
      const result = BuilderAuthService.verifyToken(tampered);
      expect(result).toBeNull();
    });

    it('should return null for an expired token', () => {
      // Create a token that's already expired
      const payload: JwtPayload = { builderId: 'expired-builder', email: 'expired@test.com' };
      const token = jwt.sign(payload, TEST_JWT_SECRET, { expiresIn: '-1s' });
      const result = BuilderAuthService.verifyToken(token);
      expect(result).toBeNull();
    });

    it('should reject a token signed with wrong secret', () => {
      const payload: JwtPayload = { builderId: 'wrong-secret', email: 'wrong@test.com' };
      const token = jwt.sign(payload, 'different-secret', { expiresIn: '7d' });
      const result = BuilderAuthService.verifyToken(token);
      expect(result).toBeNull();
    });
  });

  describe('Signup validation', () => {
    it('should reject passwords shorter than 8 characters', async () => {
      await expect(
        BuilderAuthService.signup('test@example.com', 'short', 'Test User')
      ).rejects.toThrow('Password must be at least 8 characters');
    });
  });

  describe('bcrypt roundtrip (direct)', () => {
    it('should hash and verify using bcryptjs directly', async () => {
      const password = 'testPassword123!';
      const salt = await bcrypt.genSalt(10);
      const hash = await bcrypt.hash(password, salt);

      expect(await bcrypt.compare(password, hash)).toBe(true);
      expect(await bcrypt.compare('wrongPassword', hash)).toBe(false);
    });
  });
});
