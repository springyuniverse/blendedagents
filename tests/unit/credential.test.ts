import { describe, it, expect, beforeAll } from 'vitest';
import crypto from 'node:crypto';
import { CredentialService } from '../../src/services/credential.service.js';

describe('CredentialService', () => {
  beforeAll(() => {
    process.env.CREDENTIAL_ENCRYPTION_KEY = crypto.randomBytes(32).toString('hex');
  });

  it('encrypt returns { encrypted: string, key_version: number }', () => {
    const result = CredentialService.encrypt({ username: 'admin', password: 'secret' });

    expect(result).toHaveProperty('encrypted');
    expect(result).toHaveProperty('key_version');
    expect(typeof result.encrypted).toBe('string');
    expect(typeof result.key_version).toBe('number');
  });

  it('decrypt(encrypt(data)) returns original data (roundtrip)', () => {
    const original = { username: 'admin', password: 'secret', nested: { key: 'value' } };
    const encrypted = CredentialService.encrypt(original);
    const decrypted = CredentialService.decrypt(encrypted);

    expect(decrypted).toEqual(original);
  });

  it('tampering with encrypted string causes decryption to throw', () => {
    const encrypted = CredentialService.encrypt({ username: 'admin' });

    // Tamper with the encrypted data
    const tampered = {
      ...encrypted,
      encrypted: encrypted.encrypted.slice(0, -4) + 'XXXX',
    };

    expect(() => CredentialService.decrypt(tampered)).toThrow();
  });

  it('key_version is preserved', () => {
    const encrypted = CredentialService.encrypt({ foo: 'bar' }, 42);

    expect(encrypted.key_version).toBe(42);
  });
});
