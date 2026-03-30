import { createHash, randomBytes } from 'node:crypto';

const API_KEY_PREFIX = 'ba_sk_';
const RANDOM_BYTES = 32;

export function generateApiKey(): { key: string; hash: string; prefix: string } {
  const secret = randomBytes(RANDOM_BYTES).toString('hex');
  const key = `${API_KEY_PREFIX}${secret}`;
  const hash = hashApiKey(key);
  const prefix = key.slice(0, 12);
  return { key, hash, prefix };
}

export function hashApiKey(key: string): string {
  return createHash('sha256').update(key).digest('hex');
}
