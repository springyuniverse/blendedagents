import sql from '../lib/db.js';
import { CreditBalanceModel, type CreditBalance } from '../models/credit-balance.js';
import { TransactionModel } from '../models/transaction.js';
import { CreditRateConfigModel } from '../models/credit-rate-config.js';
import { calculatePayout, type PayoutInput } from './payout.service.js';
import { calculateCommission } from './commission.service.js';
import { Errors } from '../lib/errors.js';
import { EmailService } from '../lib/email.js';

const LOW_CREDITS_THRESHOLD = 20;

// Flow test pricing: 3 base + 2 per step
const FLOW_BASE_COST = 3;
const FLOW_COST_PER_STEP = 2;

// Review test pricing: 5 base + bonus per finding
export const REVIEW_BASE_COST = 5;
export const REVIEW_BONUS_PER_FINDING = { critical: 5, major: 3, minor: 1 } as const;
export const REVIEW_MAX_FINDINGS_CAP = 10;

export function calculateCreditCost(stepsCount: number): number {
  return FLOW_BASE_COST + stepsCount * FLOW_COST_PER_STEP;
}

export function calculateReviewBonusCredits(findings: { critical: number; major: number; minor: number }): number {
  const totalFindings = findings.critical + findings.major + findings.minor;
  if (totalFindings === 0) return 0;

  // Cap at max findings — proportionally reduce if over cap
  const scale = totalFindings > REVIEW_MAX_FINDINGS_CAP ? REVIEW_MAX_FINDINGS_CAP / totalFindings : 1;

  return (
    findings.critical * REVIEW_BONUS_PER_FINDING.critical * scale +
    findings.major * REVIEW_BONUS_PER_FINDING.major * scale +
    findings.minor * REVIEW_BONUS_PER_FINDING.minor * scale
  );
}

export const CreditService = {
  async reserveCredits(
    builderId: string,
    testCaseId: string,
    creditAmount: number,
  ): Promise<CreditBalance> {
    let balanceBefore = 0;

    const updated = await sql.begin(async (tx) => {
      // Lock the balance row to prevent concurrent modification
      const balance = await CreditBalanceModel.getForUpdate(builderId, tx);
      balanceBefore = balance.available_credits;

      if (balance.available_credits < creditAmount) {
        throw Errors.insufficientCredits(balance.available_credits, creditAmount);
      }

      // Reserve credits atomically
      const reserved = await CreditBalanceModel.reserve(builderId, creditAmount, tx);

      // Get current rate for currency conversion
      const rate = await CreditRateConfigModel.getCurrentRate();
      const currencyAmountCents = creditAmount * rate.per_credit_rate_cents;

      // Insert ledger entry
      await TransactionModel.insert({
        type: 'charge',
        builder_id: builderId,
        test_case_id: testCaseId,
        credit_amount: -creditAmount,
        currency_amount_cents: currencyAmountCents,
        description: `Credit reservation for test ${testCaseId}`,
        reference_id: testCaseId,
        idempotency_key: `reserve:${testCaseId}`,
      }, tx);

      return reserved;
    });

    // Send low-balance warning if the builder just crossed the threshold
    if (balanceBefore >= LOW_CREDITS_THRESHOLD && updated.available_credits < LOW_CREDITS_THRESHOLD) {
      sql<{ email: string }[]>`
        SELECT email FROM builders WHERE id = ${builderId}
      `.then(([row]) => {
        if (row?.email) {
          return EmailService.sendCreditsLow(row.email, updated.available_credits);
        }
      }).catch(err => console.error('Failed to send credits-low email', err));
    }

    return updated;
  },

  async deductCredits(
    builderId: string,
    testCaseId: string,
    creditAmount: number,
  ): Promise<CreditBalance> {
    return sql.begin(async (tx) => {
      await CreditBalanceModel.getForUpdate(builderId, tx);
      const updated = await CreditBalanceModel.deduct(builderId, creditAmount, tx);

      const rate = await CreditRateConfigModel.getCurrentRate();
      const currencyAmountCents = creditAmount * rate.per_credit_rate_cents;

      await TransactionModel.insert({
        type: 'charge',
        builder_id: builderId,
        test_case_id: testCaseId,
        credit_amount: -creditAmount,
        currency_amount_cents: currencyAmountCents,
        description: `Credit charge for completed test ${testCaseId}`,
        reference_id: testCaseId,
        idempotency_key: `deduct:${testCaseId}`,
      }, tx);

      return updated;
    });
  },

  async refundCredits(
    builderId: string,
    testCaseId: string,
    creditAmount: number,
  ): Promise<CreditBalance> {
    return sql.begin(async (tx) => {
      await CreditBalanceModel.getForUpdate(builderId, tx);
      const updated = await CreditBalanceModel.refund(builderId, creditAmount, tx);

      const rate = await CreditRateConfigModel.getCurrentRate();
      const currencyAmountCents = creditAmount * rate.per_credit_rate_cents;

      await TransactionModel.insert({
        type: 'refund',
        builder_id: builderId,
        test_case_id: testCaseId,
        credit_amount: creditAmount,
        currency_amount_cents: currencyAmountCents,
        description: `Credit refund for cancelled test ${testCaseId}`,
        reference_id: testCaseId,
        idempotency_key: `refund:${testCaseId}`,
      }, tx);

      return updated;
    });
  },

  /**
   * Handles test completion: atomically creates 3 transactions
   * (charge + payout + commission), deducts reserved credits,
   * and records tester earnings.
   * Lock ordering: builder balance first, then inserts (deterministic).
   */
  async completeTest(params: {
    builderId: string;
    testerId: string;
    testCaseId: string;
    creditAmount: number;
    stepsCount: number;
    lockedRate: PayoutInput;
  }): Promise<void> {
    const { builderId, testerId, testCaseId, creditAmount, stepsCount, lockedRate } = params;

    await sql.begin(async (tx) => {
      // 1. Lock builder balance and deduct reserved credits
      await CreditBalanceModel.getForUpdate(builderId, tx);
      await CreditBalanceModel.deduct(builderId, creditAmount, tx);

      // 2. Calculate amounts
      const rate = await CreditRateConfigModel.getCurrentRate();
      const builderChargeCents = creditAmount * rate.per_credit_rate_cents;
      const grossPayoutCents = calculatePayout(lockedRate);

      // 3. Get platform commission rate and calculate net tester payout
      const [settings] = await tx<{ platform_commission_pct: string }[]>`
        SELECT platform_commission_pct FROM platform_settings WHERE id = 1
      `;
      const commissionPct = parseFloat(settings?.platform_commission_pct ?? '50');
      const commissionCents = Math.round(grossPayoutCents * commissionPct / 100);
      const netPayoutCents = grossPayoutCents - commissionCents;

      // 4. Insert charge transaction (builder)
      await TransactionModel.insert({
        type: 'charge',
        builder_id: builderId,
        tester_id: testerId,
        test_case_id: testCaseId,
        credit_amount: -creditAmount,
        currency_amount_cents: builderChargeCents,
        description: `Test charge: ${stepsCount}-step test ${testCaseId}`,
        reference_id: testCaseId,
        idempotency_key: `charge:${testCaseId}`,
      }, tx);

      // 5. Insert payout transaction (tester gets NET after commission)
      await TransactionModel.insert({
        type: 'payout',
        builder_id: builderId,
        tester_id: testerId,
        test_case_id: testCaseId,
        credit_amount: 0,
        currency_amount_cents: netPayoutCents,
        description: `Tester payout: ${stepsCount}-step test (${commissionPct}% commission applied)`,
        reference_id: testCaseId,
        idempotency_key: `payout:${testCaseId}`,
      }, tx);

      // 6. Insert commission transaction (platform keeps commission from tester payout)
      await TransactionModel.insert({
        type: 'commission',
        builder_id: builderId,
        tester_id: testerId,
        test_case_id: testCaseId,
        credit_amount: 0,
        currency_amount_cents: commissionCents,
        commission_pct: commissionPct,
        commission_amount_cents: commissionCents,
        description: `Platform commission (${commissionPct}%): ${stepsCount}-step test ${testCaseId}`,
        reference_id: testCaseId,
        idempotency_key: `commission:${testCaseId}`,
      }, tx);

      // 7. Platform also keeps the residual (builder charge - gross payout)
      const residualCents = builderChargeCents - grossPayoutCents;
      if (residualCents > 0) {
        await TransactionModel.insert({
          type: 'commission',
          builder_id: builderId,
          tester_id: testerId,
          test_case_id: testCaseId,
          credit_amount: 0,
          currency_amount_cents: residualCents,
          description: `Platform margin: builder charge surplus ${testCaseId}`,
          reference_id: testCaseId,
          idempotency_key: `margin:${testCaseId}`,
        }, tx);
      }

      // 8. Update tester earnings with NET amount (what they actually receive)
      await tx`
        UPDATE testers
        SET earnings_cents = earnings_cents + ${netPayoutCents}
        WHERE id = ${testerId}
      `;
    });
  },

  async topupCredits(
    builderId: string,
    creditAmount: number,
    currencyAmountCents: number,
    stripeSessionId: string,
    description: string,
  ): Promise<CreditBalance> {
    return sql.begin(async (tx) => {
      // Check idempotency — if already processed, return current balance
      const existing = await TransactionModel.findByStripeSessionId(stripeSessionId);
      if (existing) {
        const balance = await CreditBalanceModel.getByBuilderId(builderId);
        return balance!;
      }

      const updated = await CreditBalanceModel.topup(builderId, creditAmount, tx);

      await TransactionModel.insert({
        type: 'topup',
        builder_id: builderId,
        credit_amount: creditAmount,
        currency_amount_cents: currencyAmountCents,
        description,
        stripe_session_id: stripeSessionId,
      }, tx);

      return updated;
    });
  },
};
