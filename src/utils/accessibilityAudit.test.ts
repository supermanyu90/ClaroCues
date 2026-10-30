import { describe, expect, it } from 'vitest';
import { INITIAL_TABLES, SAMPLE_BIRTHDAY, SAMPLE_COMMUNITY, SAMPLE_WEDDING } from '../data/initialBlueprint';
import type { EventPlan } from '../types';
import { auditPlanAccessibility } from './accessibilityAudit';

const statusOf = (plan: EventPlan, id: string) => auditPlanAccessibility(plan).checks.find((c) => c.id === id)?.status;

describe('auditPlanAccessibility', () => {
  it.each([SAMPLE_WEDDING, SAMPLE_BIRTHDAY, SAMPLE_COMMUNITY])('scores sample plan "$title" between 0 and 100', (plan) => {
    const report = auditPlanAccessibility(plan, INITIAL_TABLES);
    expect(report.score).toBeGreaterThanOrEqual(0);
    expect(report.score).toBeLessThanOrEqual(100);
    expect(report.counts.pass + report.counts.warn + report.counts.fail).toBe(report.checks.length);
  });

  it('fails a plan with a single interpreter and long rotations', () => {
    const plan: EventPlan = {
      ...SAMPLE_WEDDING,
      interpreterStaffing: { ...SAMPLE_WEDDING.interpreterStaffing, teamSize: 1, rotationIntervalMinutes: 45 },
    };
    expect(statusOf(plan, 'team')).toBe('fail');
    expect(statusOf(plan, 'rotation')).toBe('fail');
  });

  it('fails captioning when no CART vendor or budget line exists', () => {
    const plan: EventPlan = {
      ...SAMPLE_WEDDING,
      vendorChecklist: SAMPLE_WEDDING.vendorChecklist.filter((v) => !/cart|caption/i.test(`${v.category} ${v.name} ${v.notes}`)),
      budgetAllocation: SAMPLE_WEDDING.budgetAllocation.filter((b) => !/cart|caption/i.test(`${b.category} ${b.notes}`)),
    };
    expect(statusOf(plan, 'captions')).toBe('fail');
  });

  it('flags speeches that have no interpreter or caption cue', () => {
    const plan: EventPlan = {
      ...SAMPLE_WEDDING,
      timelineMilestones: [{ id: 'm', time: '19:00', title: 'Toasts', details: '', cueType: 'milestone' }],
    };
    const check = auditPlanAccessibility(plan).checks.find((c) => c.id === 'spoken-coverage');
    expect(check?.status).toBe('warn');
    expect(check?.detail).toContain('19:00 Toasts');
  });

  it('score drops when the plan gets worse', () => {
    const good = auditPlanAccessibility(SAMPLE_WEDDING, INITIAL_TABLES).score;
    const worse = auditPlanAccessibility(
      { ...SAMPLE_WEDDING, sensoryAndVisualCues: [], interpreterStaffing: { ...SAMPLE_WEDDING.interpreterStaffing, teamSize: 1 } },
      INITIAL_TABLES
    ).score;
    expect(worse).toBeLessThan(good);
  });

  it('includes a sightline check only when a seating layout is supplied', () => {
    expect(auditPlanAccessibility(SAMPLE_WEDDING).checks.some((c) => c.id === 'sightlines')).toBe(false);
    const blocked = INITIAL_TABLES.map((t) => ({ ...t, centerpieceHeightInches: 14 }));
    const check = auditPlanAccessibility(SAMPLE_WEDDING, blocked).checks.find((c) => c.id === 'sightlines');
    expect(check?.status).toBe('fail');
  });

  it('recognises DeafBlind provision from a tactile seating pod', () => {
    const plain = { ...SAMPLE_WEDDING, vendorChecklist: [], budgetAllocation: [], sensoryAndVisualCues: [], timelineMilestones: [], readinessChecklist: [] };
    expect(auditPlanAccessibility(plain).checks.find((c) => c.id === 'deafblind')?.status).toBe('warn');
    const withPod = auditPlanAccessibility(plain, [{ ...INITIAL_TABLES[0], tableType: 'tactile-close' }]);
    expect(withPod.checks.find((c) => c.id === 'deafblind')?.status).toBe('pass');
  });
});
