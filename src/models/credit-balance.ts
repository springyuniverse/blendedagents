import sql, { type SqlClient } from '../lib/db.js';

export interface CreditBalance {
  id: string;
  builder_id: string;
  available_credits: number;
  reserved_credits: number;
  created_at: Date;
  updated_at: Date;
}

export const CreditBalanceModel = {
  async getByBuilderId(builderId: string): Promise<CreditBalance | null> {
    const [row] = await sql<CreditBalance[]>`
      SELECT * FROM credit_balances WHERE builder_id = ${builderId}
    `;
    return row ?? null;
  },

  async getForUpdate(builderId: string, tx: SqlClient): Promise<CreditBalance> {
    const [row] = await tx<CreditBalance[]>`
      SELECT * FROM credit_balances
      WHERE builder_id = ${builderId}
      FOR UPDATE
    `;
    if (!row) {
      throw new Error(`No credit balance found for builder ${builderId}`);
    }
    return row;
  },

  async reserve(builderId: string, amount: number, tx: SqlClient): Promise<CreditBalance> {
    const [row] = await tx<CreditBalance[]>`
      UPDATE credit_balances
      SET available_credits = available_credits - ${amount},
          reserved_credits = reserved_credits + ${amount}
      WHERE builder_id = ${builderId}
        AND available_credits >= ${amount}
      RETURNING *
    `;
    if (!row) {
      throw new Error('INSUFFICIENT_CREDITS');
    }
    return row;
  },

  async deduct(builderId: string, amount: number, tx: SqlClient): Promise<CreditBalance> {
    const [row] = await tx<CreditBalance[]>`
      UPDATE credit_balances
      SET reserved_credits = reserved_credits - ${amount}
      WHERE builder_id = ${builderId}
        AND reserved_credits >= ${amount}
      RETURNING *
    `;
    if (!row) {
      throw new Error(`Cannot deduct ${amount} from reserved credits`);
    }
    return row;
  },

  async refund(builderId: string, amount: number, tx: SqlClient): Promise<CreditBalance> {
    const [row] = await tx<CreditBalance[]>`
      UPDATE credit_balances
      SET reserved_credits = reserved_credits - ${amount},
          available_credits = available_credits + ${amount}
      WHERE builder_id = ${builderId}
        AND reserved_credits >= ${amount}
      RETURNING *
    `;
    if (!row) {
      throw new Error(`Cannot refund ${amount} credits`);
    }
    return row;
  },

  async topup(builderId: string, amount: number, tx: SqlClient): Promise<CreditBalance> {
    const [row] = await tx<CreditBalance[]>`
      UPDATE credit_balances
      SET available_credits = available_credits + ${amount}
      WHERE builder_id = ${builderId}
      RETURNING *
    `;
    if (!row) {
      throw new Error(`No credit balance found for builder ${builderId}`);
    }
    return row;
  },

  async getTotalUsed(builderId: string): Promise<number> {
    const [row] = await sql<{ total: number }[]>`
      SELECT COALESCE(SUM(ABS(credit_amount)), 0)::int AS total
      FROM transactions
      WHERE builder_id = ${builderId}
        AND type = 'charge'
    `;
    return row?.total ?? 0;
  },

  async ensureExists(builderId: string): Promise<CreditBalance> {
    const [row] = await sql<CreditBalance[]>`
      INSERT INTO credit_balances (builder_id, available_credits, reserved_credits)
      VALUES (${builderId}, 0, 0)
      ON CONFLICT (builder_id) DO NOTHING
      RETURNING *
    `;
    if (row) return row;
    return (await this.getByBuilderId(builderId))!;
  },
};
