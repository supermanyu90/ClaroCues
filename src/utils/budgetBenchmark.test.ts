import { describe, expect, it } from 'vitest';
import type { BudgetItem } from '../types';
import {
  accessibilitySpend,
  analyzeBudgetAgainstBenchmarks,
  capCategoryToThreshold,
  checkAccessibilityFunding,
  classifyCategory,
  nextBudgetStatus,
  sumAmounts,
  summarizeCategories,
} from './budgetBenchmark';

const item = (category: string, amount: number, id = category): BudgetItem => ({
  id,
  category,
  amount,
  priority: 'High',
  notes: '',
  status: 'Estimated',
});

describe('classifyCategory', () => {
  it.each([
    ['Accessibility: ASL Interpreters & CART', 'accessibility'],
    ['Live Captioning (CART)', 'accessibility'],
    ['Catering & Bar', 'catering'],
    ['Venue Rental & Pavilion Staging', 'venue'],
    ['Photography & Documentary Video', 'photography'],
    ['Music, Sound & DJ Entertainment', 'entertainment'],
    ['Florals & Low-Profile Decor', 'decor'],
  ])('classifies %s as %s', (name, expected) => {
    expect(classifyCategory(name)).toBe(expected);
  });

  it('does not match words embedded in other words', () => {
    // "bar" inside "barrier", "hall" inside "shall", "site" inside "website"
    expect(classifyCategory('Barrier-free ramps')).toBeNull();
    expect(classifyCategory('Website & RSVP tools')).toBeNull();
  });

  it('returns null for uncategorised spend', () => {
    expect(classifyCategory('Contingency reserve')).toBeNull();
  });
});

describe('analyzeBudgetAgainstBenchmarks', () => {
  it('flags categories above the warning threshold with the excess amount', () => {
    const warnings = analyzeBudgetAgainstBenchmarks([item('Catering', 5000), item('Venue', 2000)], 10000, 'wedding');
    expect(warnings).toHaveLength(1);
    expect(warnings[0]).toMatchObject({
      categoryKey: 'catering',
      allocatedPercent: 50,
      recommendedMaxAmount: 4200,
      excessAmount: 800,
      severity: 'critical',
    });
  });

  it('groups multiple line items into one category total', () => {
    const warnings = analyzeBudgetAgainstBenchmarks(
      [item('Catering', 2500, 'a'), item('Dinner service', 2000, 'b')],
      10000,
      'wedding'
    );
    expect(warnings[0].affectedItemIds).toEqual(['a', 'b']);
  });

  it('returns nothing for an empty or zero budget', () => {
    expect(analyzeBudgetAgainstBenchmarks([], 1000)).toEqual([]);
    expect(analyzeBudgetAgainstBenchmarks([item('Catering', 10)], 0)).toEqual([]);
  });
});

describe('checkAccessibilityFunding', () => {
  it('reports the shortfall when access spend is below the benchmark', () => {
    const gap = checkAccessibilityFunding([item('ASL Interpreters', 500)], 10000, 'wedding');
    expect(gap).toEqual({
      allocatedAmount: 500,
      allocatedPercent: 5,
      industryAveragePercent: 12,
      shortfallAmount: 700,
    });
  });

  it('returns null once access meets the benchmark', () => {
    expect(checkAccessibilityFunding([item('ASL Interpreters & CART', 1200)], 10000, 'wedding')).toBeNull();
  });

  it('treats a plan with no access line as fully unfunded', () => {
    expect(checkAccessibilityFunding([item('Catering', 3000)], 10000, 'community')?.allocatedAmount).toBe(0);
  });
});

describe('budget helpers', () => {
  const items = [item('Catering', 5000, 'c1'), item('Dinner service', 1000, 'c2'), item('ASL Interpreters', 800, 'a')];

  it('sums totals and accessibility spend', () => {
    expect(sumAmounts(items)).toBe(6800);
    expect(accessibilitySpend(items)).toBe(800);
  });

  it('summarises every benchmark category, flagging overspend', () => {
    const summary = summarizeCategories(items, 10000, 'wedding');
    expect(summary).toHaveLength(6);
    expect(summary.find((c) => c.key === 'catering')).toMatchObject({ spent: 6000, percent: 60, isOver: true });
    expect(summary.find((c) => c.key === 'venue')).toMatchObject({ spent: 0, isOver: false });
  });

  it('caps an over-allocated category proportionally and leaves others alone', () => {
    const [warning] = analyzeBudgetAgainstBenchmarks(items, 10000, 'wedding');
    const capped = capCategoryToThreshold(items, warning);
    expect(capped.find((i) => i.id === 'c1')?.amount).toBe(3500);
    expect(capped.find((i) => i.id === 'c2')?.amount).toBe(700);
    expect(capped.find((i) => i.id === 'a')?.amount).toBe(800);
  });

  it('cycles booking status', () => {
    expect([nextBudgetStatus('Estimated'), nextBudgetStatus('Booked'), nextBudgetStatus('Paid')]).toEqual([
      'Booked',
      'Paid',
      'Estimated',
    ]);
  });
});
