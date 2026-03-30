export interface CommissionResult {
  commission_amount_cents: number;
  commission_pct: number;
}

export function calculateCommission(
  builderChargeCents: number,
  testerPayoutCents: number,
): CommissionResult {
  const commissionAmountCents = builderChargeCents - testerPayoutCents;
  const commissionPct = builderChargeCents > 0
    ? (commissionAmountCents / builderChargeCents) * 100
    : 0;

  return {
    commission_amount_cents: commissionAmountCents,
    commission_pct: Math.round(commissionPct * 100) / 100,
  };
}
