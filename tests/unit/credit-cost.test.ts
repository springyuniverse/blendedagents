import { describe, it, expect } from 'vitest';
import { calculateCreditCost } from '../../src/services/credit.service.js';

describe('Credit Cost Formula', () => {
  const BASE_COST = 2;
  const COST_PER_STEP = 1;

  it('calculates cost for a 1-step test', () => {
    expect(calculateCreditCost(1)).toBe(BASE_COST + 1 * COST_PER_STEP); // 3
  });

  it('calculates cost for a 5-step test', () => {
    expect(calculateCreditCost(5)).toBe(BASE_COST + 5 * COST_PER_STEP); // 7
  });

  it('calculates cost for a 10-step test', () => {
    expect(calculateCreditCost(10)).toBe(BASE_COST + 10 * COST_PER_STEP); // 12
  });

  it('always returns whole numbers', () => {
    for (let steps = 0; steps <= 20; steps++) {
      const cost = calculateCreditCost(steps);
      expect(Number.isInteger(cost)).toBe(true);
      expect(cost).toBeGreaterThanOrEqual(BASE_COST);
    }
  });

  it('returns base cost for 0 steps', () => {
    expect(calculateCreditCost(0)).toBe(BASE_COST); // 2
  });
});
