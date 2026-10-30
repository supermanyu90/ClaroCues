import { describe, expect, it } from 'vitest';
import { inferEventCategory, normalizeGeneratedPlan, normalizeIdeas } from './planNormalizer';

const request = {
  eventLabel: 'Accessible Wedding',
  guestCount: 120,
  budget: 25000,
  venueType: 'Pavilion',
  theme: 'Amber',
  dhhPercentage: 30,
};

describe('normalizeGeneratedPlan', () => {
  it('builds a complete plan from an empty or malformed response', () => {
    for (const raw of [null, 'oops', 42, [], {}]) {
      const plan = normalizeGeneratedPlan(raw, request, 'seed');
      expect(plan).toMatchObject({ id: 'plan-seed', eventType: 'wedding', guestCount: 120, totalBudget: 25000 });
      expect(plan.budgetAllocation).toEqual([]);
      expect(plan.interpreterStaffing).toEqual({ teamSize: 2, rotationIntervalMinutes: 20, qualifications: 'Certified interpreter team', prepMaterialWindowDays: 7 });
      expect(plan.sightlineAndSeating.focalZones.length).toBeGreaterThan(0);
    }
  });

  it('coerces unknown enum values to safe defaults', () => {
    const plan = normalizeGeneratedPlan(
      {
        budgetAllocation: [{ category: 'Venue', amount: '4000.6', priority: 'URGENT' }],
        vendorChecklist: [{ name: 'Agency', status: 'Maybe', estimatedCost: -5, keyQuestions: ['Q1', 7, ''] }],
        timelineMilestones: [{ title: 'Toast', time: 'evening', cueType: 'laser' }],
        personalizedIdeas: [{ title: 'Idea', category: 'Random', budgetImpact: 'Huge' }],
      },
      request,
      's'
    );
    expect(plan.budgetAllocation[0]).toMatchObject({ amount: 4001, priority: 'High', status: 'Estimated' });
    expect(plan.vendorChecklist[0]).toMatchObject({ status: 'To Research', estimatedCost: 0, keyQuestions: ['Q1'] });
    expect(plan.timelineMilestones[0]).toMatchObject({ time: '00:00', cueType: 'milestone', interpreterRotation: false });
    expect(plan.personalizedIdeas[0]).toMatchObject({ category: 'Inclusive Touch', budgetImpact: 'Medium', isSaved: true });
  });

  it('keeps the accessibility sections the model returns', () => {
    const plan = normalizeGeneratedPlan(
      {
        interpreterStaffing: { teamSize: 3, rotationIntervalMinutes: 15, qualifications: 'NIC', prepMaterialWindowDays: 10 },
        sensoryAndVisualCues: [{ trigger: 'Dinner call', visualCue: 'Lights dip', hapticCue: 'Pulse', captionMode: 'Screens' }, { visualCue: 'no trigger' }],
        readinessChecklist: [{ item: 'CART booked', status: 'Verified', detail: '' }, { item: 'Loop', status: 'nope' }],
      },
      request,
      's'
    );
    expect(plan.interpreterStaffing.teamSize).toBe(3);
    expect(plan.sensoryAndVisualCues).toHaveLength(1);
    expect(plan.readinessChecklist.map((r) => r.status)).toEqual(['Verified', 'In Progress']);
  });

  it('sorts milestones by time and pads single-digit hours', () => {
    const plan = normalizeGeneratedPlan(
      { timelineMilestones: [{ title: 'Late', time: '19:00' }, { title: 'Early', time: '9:30' }] },
      request,
      's'
    );
    expect(plan.timelineMilestones.map((m) => `${m.time} ${m.title}`)).toEqual(['09:30 Early', '19:00 Late']);
  });

  it('caps very long lists', () => {
    const plan = normalizeGeneratedPlan({ budgetAllocation: Array.from({ length: 500 }, (_, i) => ({ category: `C${i}`, amount: 1 })) }, request, 's');
    expect(plan.budgetAllocation.length).toBe(40);
  });
});

describe('helpers', () => {
  it.each([
    ["Maya's 40th Birthday", 'birthday'],
    ['Tech Summit 2027', 'corporate'],
    ['Wedding & Reception', 'wedding'],
    ['Neighbourhood picnic', 'community'],
  ])('infers %s as %s', (label, expected) => {
    expect(inferEventCategory(label)).toBe(expected);
  });

  it('drops ideas without a title', () => {
    expect(normalizeIdeas([{ description: 'x' }, { title: 'Keep' }], 'p').map((i) => i.title)).toEqual(['Keep']);
  });
});
