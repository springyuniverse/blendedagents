import { describe, it, expect } from 'vitest';
import { signPayload, verifySignature, formatSignatureHeader } from '../../src/lib/webhook-signing.js';

describe('Webhook Signing (HMAC-SHA256)', () => {
  const secret = 'whsec_test_secret_key_12345';
  const payload = '{"event":"test.completed","test_case_id":"abc-123"}';

  it('returns a hex string', () => {
    const signature = signPayload(payload, secret);
    expect(signature).toMatch(/^[a-f0-9]{64}$/);
  });

  it('is deterministic (same input produces same output)', () => {
    const sig1 = signPayload(payload, secret);
    const sig2 = signPayload(payload, secret);
    expect(sig1).toBe(sig2);
  });

  it('produces different signatures for different payloads', () => {
    const sig1 = signPayload('payload-a', secret);
    const sig2 = signPayload('payload-b', secret);
    expect(sig1).not.toBe(sig2);
  });

  it('produces different signatures for different secrets', () => {
    const sig1 = signPayload(payload, 'secret-a-long-enough');
    const sig2 = signPayload(payload, 'secret-b-long-enough');
    expect(sig1).not.toBe(sig2);
  });

  it('verifySignature returns true for valid signature', () => {
    const signature = signPayload(payload, secret);
    expect(verifySignature(payload, secret, signature)).toBe(true);
  });

  it('verifySignature returns false for invalid signature', () => {
    expect(verifySignature(payload, secret, 'invalid-signature')).toBe(false);
  });

  it('verifySignature returns false for tampered payload', () => {
    const signature = signPayload(payload, secret);
    const tampered = payload.replace('abc-123', 'xyz-789');
    expect(verifySignature(tampered, secret, signature)).toBe(false);
  });

  it('verifySignature returns false for wrong secret', () => {
    const signature = signPayload(payload, secret);
    expect(verifySignature(payload, 'wrong_secret_value!', signature)).toBe(false);
  });

  it('formatSignatureHeader prefixes with sha256=', () => {
    const header = formatSignatureHeader(payload, secret);
    expect(header).toMatch(/^sha256=[a-f0-9]{64}$/);
  });

  it('formatSignatureHeader signature is verifiable', () => {
    const header = formatSignatureHeader(payload, secret);
    const hexPart = header.replace('sha256=', '');
    expect(verifySignature(payload, secret, hexPart)).toBe(true);
  });
});
