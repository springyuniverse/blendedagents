import sql from '../lib/db.js';
import { CreditBalanceModel, type CreditBalance } from '../models/credit-balance.js';
import { TransactionModel } from '../models/transaction.js';
import { CreditRateConfigModel } from '../models/credit-rate-config.js';
import { calculatePayout, type PayoutInput } from './payout.service.js';
import { calculateCommission } from './commission.service.js';
import { Errors } from '../lib/errors.js';

const BASE_COST = 2;
const COST_PER_STEP = 1;

export function calculateCreditCost(stepsCount: number): number {
  return BASE_COST + stepsCount * COST_PER_STEP;
}

export const CreditService = {
  async reserveCredits(
    builderId: string,
    testCaseId: string,
    creditAmount: number,
  ): Promise<CreditBalance> {
    return sql.begin(async (tx) => {
      // Lock the balance row to prevent concurrent modification
      const balance = await CreditBalanceModel.getForUpdate(builderId, tx);

      if (balance.available_credits < creditAmount) {
        throw Errors.insufficientCredits(balance.available_credits, creditAmount);
      }

      // Reserve credits atomically
      const updated = await CreditBalanceModel.reserve(builderId, creditAmount, tx);

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

      return updated;
    });
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
      const testerPayoutCents = calculatePayout(lockedRate);
      const commission = calculateCommission(builderChargeCents, testerPayoutCents);

      // 3. Insert charge transaction (builder)
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

      // 4. Insert payout transaction (tester)
      await TransactionModel.insert({
        type: 'payout',
        builder_id: builderId,
        tester_id: testerId,
        test_case_id: testCaseId,
        credit_amount: 0,
        currency_amount_cents: testerPayoutCents,
        description: `Tester payout: ${stepsCount}-step test ${testCaseId}`,
        reference_id: testCaseId,
        idempotency_key: `payout:${testCaseId}`,
      }, tx);

      // 5. Insert commission transaction (platform)
      await TransactionModel.insert({
        type: 'commission',
        builder_id: builderId,
        tester_id: testerId,
        test_case_id: testCaseId,
        credit_amount: 0,
        currency_amount_cents: commission.commission_amount_cents,
        commission_pct: commission.commission_pct,
        commission_amount_cents: commission.commission_amount_cents,
        description: `Platform commission: ${stepsCount}-step test ${testCaseId}`,
        reference_id: testCaseId,
        idempotency_key: `commission:${testCaseId}`,
      }, tx);
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
