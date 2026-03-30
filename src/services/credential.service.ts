import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;
const AUTH_TAG_LENGTH = 16;

function getEncryptionKey(): Buffer {
  const keyHex = process.env.CREDENTIAL_ENCRYPTION_KEY;
  if (!keyHex) {
    throw new Error('CREDENTIAL_ENCRYPTION_KEY environment variable is required');
  }
  return Buffer.from(keyHex, 'hex');
}

export const CredentialService = {
  encrypt(plaintext: Record<string, unknown>, keyVersion = 1): { encrypted: string; key_version: number } {
    const key = getEncryptionKey();
    const iv = randomBytes(IV_LENGTH);
    const cipher = createCipheriv(ALGORITHM, key, iv);

    const json = JSON.stringify(plaintext);
    const ciphertext = Buffer.concat([cipher.update(json, 'utf8'), cipher.final()]);
    const authTag = cipher.getAuthTag();

    // Format: iv (12) + ciphertext (variable) + authTag (16)
    const combined = Buffer.concat([iv, ciphertext, authTag]);

    return {
      encrypted: combined.toString('base64'),
      key_version: keyVersion,
    };
  },

  decrypt(encryptedData: { encrypted: string; key_version: number }): Record<string, unknown> {
    const key = getEncryptionKey();
    const combined = Buffer.from(encryptedData.encrypted, 'base64');

    const iv = combined.subarray(0, IV_LENGTH);
    const authTag = combined.subarray(combined.length - AUTH_TAG_LENGTH);
    const ciphertext = combined.subarray(IV_LENGTH, combined.length - AUTH_TAG_LENGTH);

    const decipher = createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);

    const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
    return JSON.parse(decrypted.toString('utf8'));
  },
};
