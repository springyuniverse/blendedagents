import sql from '../lib/db.js';

export interface Builder {
  id: string;
  display_name: string;
  email: string;
  webhook_url: string | null;
  webhook_secret: string | null;
  credits_balance: number;
  plan_tier: string;
  metadata: Record<string, unknown>;
  created_at: Date;
  updated_at: Date;
}

export const BuilderModel = {
  async findById(id: string): Promise<Builder | null> {
    const [row] = await sql<Builder[]>`SELECT * FROM builders WHERE id = ${id}`;
    return row ?? null;
  },

  async findByApiKeyHash(keyHash: string): Promise<Builder | null> {
    const [row] = await sql<Builder[]>`
      SELECT b.* FROM builders b
      JOIN api_keys ak ON ak.builder_id = b.id
      WHERE ak.key_hash = ${keyHash}
        AND ak.revoked_at IS NULL
    `;
    return row ?? null;
  },

  async create(data: { display_name: string; email: string; plan_tier?: string }): Promise<Builder> {
    const [row] = await sql<Builder[]>`
      INSERT INTO builders (display_name, email, plan_tier)
      VALUES (${data.display_name}, ${data.email}, ${data.plan_tier ?? 'starter'})
      RETURNING *
    `;
    return row;
  },

  async update(id: string, data: Partial<Pick<Builder, 'display_name' | 'webhook_url' | 'webhook_secret' | 'credits_balance' | 'plan_tier' | 'metadata'>>): Promise<Builder> {
    const [row] = await sql<Builder[]>`
      UPDATE builders SET ${sql(data as Record<string, unknown>)}
      WHERE id = ${id}
      RETURNING *
    `;
    if (!row) throw new Error(`Builder ${id} not found`);
    return row;
  },
};
