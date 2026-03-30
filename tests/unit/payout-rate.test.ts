import { describe, it, expect } from 'vitest';
import { calculatePayout } from '../../src/services/payout.service.js';

describe('Payout Calculation', () => {
  it('calculates Egypt payout correctly (5 steps)', () => {
    const result = calculatePayout({
      base_pay_cents: 150,
      per_step_rate_cents: 15,
      steps_count: 5,
    });
    // 150 + 5 * 15 = 225 cents ($2.25)
    expect(result).toBe(225);
  });

  it('calculates MENA payout correctly (10 steps)', () => {
    const result = calculatePayout({
      base_pay_cents: 225,
      per_step_rate_cents: 20,
      steps_count: 10,
    });
    // 225 + 10 * 20 = 425 cents ($4.25)
    expect(result).toBe(425);
  });

  it('calculates Southeast Asia payout correctly (3 steps)', () => {
    const result = calculatePayout({
      base_pay_cents: 300,
      per_step_rate_cents: 25,
      steps_count: 3,
    });
    // 300 + 3 * 25 = 375 cents ($3.75)
    expect(result).toBe(375);
  });

  it('returns base pay only for 0 steps', () => {
    const result = calculatePayout({
      base_pay_cents: 150,
      per_step_rate_cents: 15,
      steps_count: 0,
    });
    expect(result).toBe(150);
  });

  it('always returns a whole number', () => {
    for (let steps = 0; steps <= 20; steps++) {
      const result = calculatePayout({
        base_pay_cents: 150,
        per_step_rate_cents: 15,
        steps_count: steps,
      });
      expect(Number.isInteger(result)).toBe(true);
    }
  });
});
