import sql, { type SqlClient } from '../lib/db.js';

export type PayoutStatus = 'unpaid' | 'pending' | 'completed';

export interface TesterPayoutRecord {
  id: string;
  tester_id: string;
  period_start: Date;
  period_end: Date;
  total_earnings_cents: number;
  transaction_count: number;
  status: PayoutStatus;
  created_at: Date;
  updated_at: Date;
}

export const TesterPayoutModel = {
  async create(
    data: {
      tester_id: string;
      period_start: string;
      period_end: string;
      total_earnings_cents: number;
      transaction_count: number;
      status: PayoutStatus;
    },
    tx?: SqlClient,
  ): Promise<TesterPayoutRecord> {
    const db = tx ?? sql;
    const [row] = await db<TesterPayoutRecord[]>`
      INSERT INTO tester_payout_records (
        tester_id, period_start, period_end,
        total_earnings_cents, transaction_count, status
      ) VALUES (
        ${data.tester_id}, ${data.period_start}, ${data.period_end},
        ${data.total_earnings_cents}, ${data.transaction_count}, ${data.status}
      )
      RETURNING *
    `;
    return row;
  },

  async getUnpaidAggregatesByTester(): Promise<
    Array<{
      tester_id: string;
      total_earnings_cents: number;
      transaction_count: number;
    }>
  > {
    return sql<
      Array<{
        tester_id: string;
        total_earnings_cents: number;
        transaction_count: number;
      }>
    >`
      SELECT
        tester_id,
        SUM(currency_amount_cents)::int AS total_earnings_cents,
        COUNT(*)::int AS transaction_count
      FROM transactions
      WHERE type = 'payout'
        AND id NOT IN (
          SELECT unnest(string_to_array(
            COALESCE((
              SELECT string_agg(pr.id::text, ',')
              FROM tester_payout_records pr
              WHERE pr.status IN ('pending', 'completed')
            ), ''),
            ','
          ))::uuid
        )
      GROUP BY tester_id
      HAVING SUM(currency_amount_cents) > 0
    `;
  },

  async updateStatus(id: string, status: PayoutStatus): Promise<TesterPayoutRecord> {
    const [row] = await sql<TesterPayoutRecord[]>`
      UPDATE tester_payout_records
      SET status = ${status}
      WHERE id = ${id}
      RETURNING *
    `;
    if (!row) {
      throw new Error(`Payout record ${id} not found`);
    }
    return row;
  },

  async getByTester(testerId: string): Promise<TesterPayoutRecord[]> {
    return sql<TesterPayoutRecord[]>`
      SELECT * FROM tester_payout_records
      WHERE tester_id = ${testerId}
      ORDER BY period_start DESC
    `;
  },
};
