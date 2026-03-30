import { describe, it, expect } from 'vitest';
import { calculateCommission } from '../../src/services/commission.service.js';

describe('Commission Calculation', () => {
  it('calculates commission as builder charge minus tester payout', () => {
    // Builder charged 7 credits at $0.49/credit = 343 cents
    // Tester earned 225 cents
    // Commission = 343 - 225 = 118 cents
    const result = calculateCommission(343, 225);
    expect(result.commission_amount_cents).toBe(118);
  });

  it('calculates commission percentage correctly', () => {
    const result = calculateCommission(343, 225);
    // Commission = 118 / 343 = ~34.4%
    expect(result.commission_pct).toBeCloseTo(34.4, 0);
  });

  it('handles zero tester payout (100% commission)', () => {
    const result = calculateCommission(343, 0);
    expect(result.commission_amount_cents).toBe(343);
    expect(result.commission_pct).toBeCloseTo(100, 0);
  });

  it('handles equal charge and payout (0% commission)', () => {
    const result = calculateCommission(225, 225);
    expect(result.commission_amount_cents).toBe(0);
    expect(result.commission_pct).toBeCloseTo(0, 0);
  });

  it('returns whole number for commission amount', () => {
    const result = calculateCommission(500, 175);
    expect(Number.isInteger(result.commission_amount_cents)).toBe(true);
  });
});
