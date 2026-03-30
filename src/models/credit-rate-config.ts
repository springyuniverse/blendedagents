import sql from '../lib/db.js';

export interface CreditRateConfig {
  id: string;
  per_credit_rate_cents: number;
  effective_from: Date;
  created_by: string | null;
  created_at: Date;
}

export const CreditRateConfigModel = {
  async getCurrentRate(): Promise<CreditRateConfig> {
    const [row] = await sql<CreditRateConfig[]>`
      SELECT * FROM credit_rate_config
      WHERE effective_from <= now()
      ORDER BY effective_from DESC
      LIMIT 1
    `;
    if (!row) {
      throw new Error('No credit rate configuration found. Run seed.sql to configure rates.');
    }
    return row;
  },
};
