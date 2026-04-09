import sql from '../lib/db.js';
import { hashApiKey, generateApiKey } from '../lib/api-key.js';
import type { Builder } from '../models/builder.js';
import type { Tester } from '../models/tester.js';
import { TesterInviteModel } from '../models/tester-invite.js';
import { PlatformSettingsModel } from '../models/platform-settings.js';
import { Errors } from '../lib/errors.js';

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

  /**
   * Find or create a builder by Supabase auth user ID.
   * Called on first Supabase login to link or create the builder record.
   */
  async findOrCreateBuilder(authUserId: string, email: string, displayName: string): Promise<Builder> {
    // First, try to find by auth_user_id
    const [existing] = await sql<Builder[]>`
      SELECT * FROM builders WHERE auth_user_id = ${authUserId}
    `;
    if (existing) return existing;

    // Try to find by email and link the auth_user_id
    const [byEmail] = await sql<Builder[]>`
      SELECT * FROM builders WHERE email = ${email} AND auth_user_id IS NULL
    `;
    if (byEmail) {
      const [updated] = await sql<Builder[]>`
        UPDATE builders SET auth_user_id = ${authUserId}
        WHERE id = ${byEmail.id}
        RETURNING *
      `;
      return updated;
    }

    // Create a new builder
    const [created] = await sql<Builder[]>`
      INSERT INTO builders (display_name, email, auth_user_id, plan_tier)
      VALUES (${displayName}, ${email}, ${authUserId}, 'starter')
      RETURNING *
    `;

    // Create initial credit balance
    await sql`
      INSERT INTO credit_balances (builder_id, available, reserved)
      VALUES (${created.id}, 0, 0)
      ON CONFLICT (builder_id) DO NOTHING
    `;

    return created;
  },

  /**
   * Find or create a tester by Supabase auth user ID.
   * Called on first Supabase login to link or create the tester record.
   * New testers must provide a valid invite code in metadata.
   */
  async findOrCreateTester(
    authUserId: string,
    email: string,
    displayName: string,
    metadata?: { invite_code?: string; region?: string },
  ): Promise<Tester> {
    // First, try to find by auth_user_id
    const [existing] = await sql<Tester[]>`
      SELECT * FROM testers WHERE auth_user_id = ${authUserId}
    `;
    if (existing) return existing;

    // Try to find by email and link the auth_user_id
    const [byEmail] = await sql<Tester[]>`
      SELECT * FROM testers WHERE email = ${email} AND auth_user_id IS NULL
    `;
    if (byEmail) {
      const [updated] = await sql<Tester[]>`
        UPDATE testers SET auth_user_id = ${authUserId}
        WHERE id = ${byEmail.id}
        RETURNING *
      `;
      return updated;
    }

    // Check platform settings for invite requirement
    const settings = await PlatformSettingsModel.get();
    const inviteCode = metadata?.invite_code?.toUpperCase().trim();

    if (settings.require_invite_code) {
      if (!inviteCode) {
        throw Errors.forbidden('A valid invite code is required to sign up');
      }
      const invite = await TesterInviteModel.findByCode(inviteCode);
      if (!invite || invite.used_by_id) {
        throw Errors.badRequest('Invalid or already used invite code');
      }
    }

    const region = metadata?.region || 'us';

    // Create a new tester with default invite allocation
    const [created] = await sql<Tester[]>`
      INSERT INTO testers (display_name, email, auth_user_id, region, max_invites)
      VALUES (${displayName}, ${email}, ${authUserId}, ${region}, ${settings.default_max_invites})
      RETURNING *
    `;

    // Redeem the invite code if one was provided
    if (inviteCode) {
      await TesterInviteModel.redeem(inviteCode, created.id);
    }

    return created;
  },

  clearCache() {
    cache.clear();
  },
};
