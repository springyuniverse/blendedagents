import sql from '../lib/db.js';

export interface RegionalRate {
  id: string;
  region: string;
  base_pay_cents: number;
  per_step_rate_cents: number;
  min_base_cents: number;
  max_base_cents: number;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export const RegionalRateModel = {
  async getByRegion(region: string): Promise<RegionalRate | null> {
    const [row] = await sql<RegionalRate[]>`
      SELECT * FROM regional_rates
      WHERE region = ${region} AND is_active = true
    `;
    return row ?? null;
  },

  async getById(id: string): Promise<RegionalRate | null> {
    const [row] = await sql<RegionalRate[]>`
      SELECT * FROM regional_rates WHERE id = ${id}
    `;
    return row ?? null;
  },

  async listActive(): Promise<RegionalRate[]> {
    return sql<RegionalRate[]>`
      SELECT * FROM regional_rates WHERE is_active = true ORDER BY region
    `;
  },
};
