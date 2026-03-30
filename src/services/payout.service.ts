import sql from '../lib/db.js';
import { TesterPayoutModel } from '../models/tester-payout.js';

export interface PayoutInput {
  base_pay_cents: number;
  per_step_rate_cents: number;
  steps_count: number;
}

export function calculatePayout(input: PayoutInput): number {
  return input.base_pay_cents + input.steps_count * input.per_step_rate_cents;
}

export const PayoutService = {
  async runWeeklyAggregation(): Promise<number> {
    const now = new Date();
    const weekStart = new Date(now);
    weekStart.setDate(weekStart.getDate() - 7);

    // Get unpaid payout totals per tester
    const aggregates = await getUnpaidPayoutTotals();

    let recordsCreated = 0;

    for (const agg of aggregates) {
      await TesterPayoutModel.create({
        tester_id: agg.tester_id,
        period_start: weekStart.toISOString().split('T')[0],
        period_end: now.toISOString().split('T')[0],
        total_earnings_cents: agg.total_earnings_cents,
        transaction_count: agg.transaction_count,
        status: 'pending',
      });
      recordsCreated++;
    }

    return recordsCreated;
  },
};

async function getUnpaidPayoutTotals(): Promise<
  Array<{ tester_id: string; total_earnings_cents: number; transaction_count: number }>
> {
  // Find payout transactions that haven't been included in any payout record yet
  // A payout transaction is "unpaid" if its created_at is after the latest
  // completed/pending payout record's period_end for that tester
  return sql<
    Array<{ tester_id: string; total_earnings_cents: number; transaction_count: number }>
  >`
    SELECT
      t.tester_id,
      SUM(t.currency_amount_cents)::int AS total_earnings_cents,
      COUNT(*)::int AS transaction_count
    FROM transactions t
    WHERE t.type = 'payout'
      AND t.tester_id IS NOT NULL
      AND t.created_at > COALESCE(
        (SELECT MAX(pr.period_end)
         FROM tester_payout_records pr
         WHERE pr.tester_id = t.tester_id
           AND pr.status IN ('pending', 'completed')),
        '1970-01-01'::date
      )
    GROUP BY t.tester_id
    HAVING SUM(t.currency_amount_cents) > 0
  `;
}
