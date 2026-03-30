import sql from '../lib/db.js';

export interface CreditPack {
  id: string;
  name: string;
  credit_amount: number;
  price_cents: number;
  stripe_price_id: string;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export const CreditPackModel = {
  async listActive(): Promise<CreditPack[]> {
    return sql<CreditPack[]>`
      SELECT * FROM credit_packs
      WHERE is_active = true
      ORDER BY credit_amount ASC
    `;
  },

  async findById(id: string): Promise<CreditPack | null> {
    const [row] = await sql<CreditPack[]>`
      SELECT * FROM credit_packs WHERE id = ${id} AND is_active = true
    `;
    return row ?? null;
  },
};
