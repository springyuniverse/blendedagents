import sql from '../lib/db.js';
import { hashApiKey, generateApiKey } from '../lib/api-key.js';
import type { Builder } from '../models/builder.js';

// Simple in-memory LRU cache for API key lookups
const cache = new Map<string, { builder: Builder; cachedAt: number }>();
const CACHE_TTL_MS = 30_000; // 30 seconds

export const AuthService = {
  async verifyApiKey(rawKey: string): Promise<Builder | null> {
    const keyHash = hashApiKey(rawKey);

    // Check cache first
    const cached = cache.get(keyHash);
    if (cached && Date.now() - cached.cachedAt < CACHE_TTL_MS) {
      return cached.builder;
    }

    // Query database
    const [row] = await sql<(Builder & { revoked_at: Date | null })[]>`
      SELECT b.*, ak.revoked_at
      FROM builders b
      JOIN api_keys ak ON ak.builder_id = b.id
      WHERE ak.key_hash = ${keyHash}
    `;

    if (!row) return null;
    if (row.revoked_at) return null;

    // Cache the result
    cache.set(keyHash, { builder: row, cachedAt: Date.now() });

    // Update last_used_at (fire-and-forget, don't block auth)
    sql`UPDATE api_keys SET last_used_at = now() WHERE key_hash = ${keyHash}`.catch(() => {});

    return row;
  },

  async createApiKey(builderId: string, label?: string): Promise<{ key: string; id: string }> {
    const { key, hash, prefix } = generateApiKey();

    const [row] = await sql<{ id: string }[]>`
      INSERT INTO api_keys (builder_id, key_hash, key_prefix, label)
      VALUES (${builderId}, ${hash}, ${prefix}, ${label ?? null})
      RETURNING id
    `;

    return { key, id: row.id };
  },

  async revokeApiKey(keyId: string, builderId: string): Promise<void> {
    await sql`
      UPDATE api_keys SET revoked_at = now()
      WHERE id = ${keyId} AND builder_id = ${builderId}
    `;
  },

  clearCache() {
    cache.clear();
  },
};
