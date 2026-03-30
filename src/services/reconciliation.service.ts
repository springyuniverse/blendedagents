import sql from '../lib/db.js';

export interface DiscrepancyReport {
  builder_id: string;
  materialized_total: number;
  ledger_total: number;
  difference: number;
}

export const ReconciliationService = {
  async verifyLedgerConsistency(): Promise<DiscrepancyReport[]> {
    const discrepancies = await sql<DiscrepancyReport[]>`
      SELECT
        b.id AS builder_id,
        (cb.available_credits + cb.reserved_credits) AS materialized_total,
        COALESCE(SUM(t.credit_amount), 0)::int AS ledger_total,
        (cb.available_credits + cb.reserved_credits) - COALESCE(SUM(t.credit_amount), 0)::int AS difference
      FROM builders b
      JOIN credit_balances cb ON cb.builder_id = b.id
      LEFT JOIN transactions t ON t.builder_id = b.id
      GROUP BY b.id, cb.available_credits, cb.reserved_credits
      HAVING (cb.available_credits + cb.reserved_credits) != COALESCE(SUM(t.credit_amount), 0)::int
    `;

    if (discrepancies.length > 0) {
      console.error('LEDGER DISCREPANCY DETECTED:', discrepancies);
    }

    return discrepancies;
  },
};
