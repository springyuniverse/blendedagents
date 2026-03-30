import { describe, it, expect, beforeEach } from 'vitest';
import { CreditService } from '../../src/services/credit.service.js';
import { CreditBalanceModel } from '../../src/models/credit-balance.js';
import { TransactionModel } from '../../src/models/transaction.js';

// Integration tests — these will hit a real PostgreSQL database
// They are expected to FAIL until the implementation is complete

describe('Credit Operations - Atomicity', () => {
  const TEST_BUILDER_ID = '00000000-0000-0000-0000-000000000001';
  const TEST_CASE_ID = '00000000-0000-0000-0000-000000000010';

  describe('reserve', () => {
    it('reserves credits and reduces available balance atomically', async () => {
      // Given a builder with 100 available credits
      // When they reserve 7 credits for a test
      const result = await CreditService.reserveCredits(TEST_BUILDER_ID, TEST_CASE_ID, 7);

      // Then available = 93, reserved = 7, and a reserve transaction is created
      expect(result.available_credits).toBe(93);
      expect(result.reserved_credits).toBe(7);
    });

    it('rejects reservation when insufficient credits', async () => {
      // Given a builder with 3 available credits
      // When they try to reserve 7 credits
      await expect(
        CreditService.reserveCredits(TEST_BUILDER_ID, TEST_CASE_ID, 7),
      ).rejects.toThrow('INSUFFICIENT_CREDITS');
    });
  });

  describe('deduct', () => {
    it('deducts reserved credits on test completion', async () => {
      // Given a builder with 7 reserved credits for a test
      // When the test completes
      const result = await CreditService.deductCredits(TEST_BUILDER_ID, TEST_CASE_ID, 7);

      // Then reserved -= 7, a charge transaction is created, balance remains 93
      expect(result.reserved_credits).toBe(0);
    });
  });

  describe('refund', () => {
    it('returns reserved credits to available on cancellation', async () => {
      // Given a builder with 7 reserved credits
      // When the test is cancelled
      const result = await CreditService.refundCredits(TEST_BUILDER_ID, TEST_CASE_ID, 7);

      // Then reserved -= 7, available += 7, a refund transaction is created
      expect(result.available_credits).toBe(100);
      expect(result.reserved_credits).toBe(0);
    });
  });

  describe('concurrent operations', () => {
    it('prevents negative balance when two reservations race', async () => {
      // Given a builder with exactly 10 available credits
      // When two 7-credit reservations are attempted concurrently
      const results = await Promise.allSettled([
        CreditService.reserveCredits(TEST_BUILDER_ID, '00000000-0000-0000-0000-000000000011', 7),
        CreditService.reserveCredits(TEST_BUILDER_ID, '00000000-0000-0000-0000-000000000012', 7),
      ]);

      // Then exactly one succeeds and one fails
      const fulfilled = results.filter((r) => r.status === 'fulfilled');
      const rejected = results.filter((r) => r.status === 'rejected');
      expect(fulfilled).toHaveLength(1);
      expect(rejected).toHaveLength(1);
    });
  });
});
