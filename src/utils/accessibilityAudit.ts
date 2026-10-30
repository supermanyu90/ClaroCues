import type { EventPlan, SightlineTable } from '../types';
import { INDUSTRY_BENCHMARKS, accessibilitySpend } from './budgetBenchmark';
import { CENTERPIECE_MAX_INCHES, summarizeRoom } from './sightline';

// A deterministic access-readiness audit computed from the plan itself. It replaces a
// hard-coded "94% compliant" response so the score actually moves when the plan changes.

export type AuditStatus = 'pass' | 'warn' | 'fail';

export interface AuditCheck {
  id: string;
  label: string;
  status: AuditStatus;
  detail: string;
  /** What to do to resolve a warn/fail. */
  fix?: string;
}

export interface AuditReport {
  score: number;
  checks: AuditCheck[];
  counts: Record<AuditStatus, number>;
}

const BOOKED = new Set(['Booked', 'Paid']);
const SPOKEN_SEGMENT =
  /\b(toasts?|speech(es)?|remarks|ceremony|vows?|keynotes?|welcome|announcements?|address|panels?|readings?)\b/i;
const INTERPRETER = /\b(asl|interpreter|interpreting|sign language)\b/i;
const CAPTIONS = /\b(cart|caption|captioning|captioner|steno)\b/i;
const DEAFBLIND = /\b(deafblind|deaf-blind|pro-tactile|protactile|tactile signing|support service provider)\b/i;
const EMERGENCY = /\b(emergency|alarm|evacuation|fire)\b/i;

function provisionStatus(plan: EventPlan, pattern: RegExp): 'booked' | 'planned' | 'missing' {
  const vendors = plan.vendorChecklist.filter((v) => pattern.test(`${v.category} ${v.name} ${v.notes}`));
  if (vendors.some((v) => BOOKED.has(v.status))) return 'booked';
  const budgeted = plan.budgetAllocation.some((b) => pattern.test(`${b.category} ${b.notes}`));
  return vendors.length > 0 || budgeted ? 'planned' : 'missing';
}

function allPlanText(plan: EventPlan): string {
  return [
    ...plan.sensoryAndVisualCues.map((c) => `${c.trigger} ${c.visualCue} ${c.hapticCue}`),
    ...plan.timelineMilestones.map((m) => `${m.title} ${m.details}`),
    ...plan.readinessChecklist.map((r) => `${r.item} ${r.detail}`),
    ...plan.vendorChecklist.map((v) => `${v.category} ${v.name} ${v.notes}`),
    ...plan.budgetAllocation.map((b) => `${b.category} ${b.notes}`),
  ].join('\n');
}

export function auditPlanAccessibility(plan: EventPlan, tables?: SightlineTable[]): AuditReport {
  const checks: AuditCheck[] = [];
  const { teamSize, rotationIntervalMinutes, prepMaterialWindowDays } = plan.interpreterStaffing;

  checks.push(
    teamSize >= 2
      ? {
          id: 'team',
          label: 'Interpreter team size',
          status: 'pass',
          detail: `${teamSize} interpreters, enough to team and swap.`,
        }
      : {
          id: 'team',
          label: 'Interpreter team size',
          status: 'fail',
          detail: `Only ${teamSize} interpreter${teamSize === 1 ? '' : 's'} planned.`,
          fix: 'Book at least two interpreters for any assignment longer than an hour so they can swap.',
        }
  );

  checks.push(
    rotationIntervalMinutes <= 20
      ? {
          id: 'rotation',
          label: 'Interpreter rotation interval',
          status: 'pass',
          detail: `Swaps every ${rotationIntervalMinutes} minutes.`,
        }
      : {
          id: 'rotation',
          label: 'Interpreter rotation interval',
          status: rotationIntervalMinutes <= 30 ? 'warn' : 'fail',
          detail: `Swaps every ${rotationIntervalMinutes} minutes; accuracy drops after about 20 minutes.`,
          fix: 'Schedule interpreter swaps every 15–20 minutes.',
        }
  );

  const interp = provisionStatus(plan, INTERPRETER);
  checks.push({
    id: 'interpreter-booked',
    label: 'Interpreters booked',
    status: interp === 'booked' ? 'pass' : interp === 'planned' ? 'warn' : 'fail',
    detail:
      interp === 'booked'
        ? 'An interpreter provider is booked.'
        : interp === 'planned'
          ? 'Interpreters are planned but not yet booked.'
          : 'No interpreter vendor or budget line found.',
    fix: interp === 'booked' ? undefined : 'Add an interpreter agency to the vendor checklist and confirm the booking.',
  });

  const cart = provisionStatus(plan, CAPTIONS);
  checks.push({
    id: 'captions',
    label: 'Live captioning (CART)',
    status: cart === 'booked' ? 'pass' : cart === 'planned' ? 'warn' : 'fail',
    detail:
      cart === 'booked'
        ? 'A captioning provider is booked.'
        : cart === 'planned'
          ? 'Captioning is planned but not yet booked.'
          : 'No captioning provider or budget line found. Many Hard-of-Hearing guests do not sign.',
    fix: cart === 'booked' ? undefined : 'Book a CART captioner and plan large, low-glare caption screens.',
  });

  const accessSpend = accessibilitySpend(plan.budgetAllocation);
  const sharePct = plan.totalBudget > 0 ? (accessSpend / plan.totalBudget) * 100 : 0;
  const benchmark = INDUSTRY_BENCHMARKS[plan.eventType].accessibility.industryAveragePercent;
  checks.push({
    id: 'budget',
    label: 'Accessibility budget',
    status: sharePct >= benchmark ? 'pass' : sharePct >= benchmark / 2 ? 'warn' : 'fail',
    detail: `${sharePct.toFixed(1)}% of budget ($${accessSpend.toLocaleString()}) vs a typical ${benchmark}% for a ${plan.eventType}.`,
    fix: sharePct >= benchmark ? undefined : `Raise the accessibility line toward ${benchmark}% of the total budget.`,
  });

  const uncoveredSegments = plan.timelineMilestones.filter(
    (m) => SPOKEN_SEGMENT.test(`${m.title} ${m.details}`) && m.cueType !== 'interpreter' && m.cueType !== 'caption'
  );
  checks.push(
    uncoveredSegments.length === 0
      ? {
          id: 'spoken-coverage',
          label: 'Spoken segments covered',
          status: 'pass',
          detail: 'Every speech or ceremony segment has interpreting or captions.',
        }
      : {
          id: 'spoken-coverage',
          label: 'Spoken segments covered',
          status: 'warn',
          detail: `No interpreter or caption cue on: ${uncoveredSegments.map((m) => `${m.time} ${m.title}`).join('; ')}.`,
          fix: 'Set those run-of-show items to an interpreter or caption cue.',
        }
  );

  const visualCues = plan.sensoryAndVisualCues.filter((c) => c.visualCue.trim());
  checks.push(
    visualCues.length >= 2
      ? {
          id: 'visual-cues',
          label: 'Visual equivalents for sound cues',
          status: 'pass',
          detail: `${visualCues.length} visual/tactile cues defined.`,
        }
      : {
          id: 'visual-cues',
          label: 'Visual equivalents for sound cues',
          status: visualCues.length === 1 ? 'warn' : 'fail',
          detail: `${visualCues.length} visual cue${visualCues.length === 1 ? '' : 's'} defined.`,
          fix: 'Pair each audible moment (dinner call, toasts, last dance) with a light or vibration cue.',
        }
  );

  checks.push(
    EMERGENCY.test(allPlanText(plan))
      ? {
          id: 'emergency',
          label: 'Visual emergency alerts',
          status: 'pass',
          detail: 'Emergency alerting is addressed in the plan.',
        }
      : {
          id: 'emergency',
          label: 'Visual emergency alerts',
          status: 'warn',
          detail: 'The plan does not mention how Deaf guests will be alerted in an emergency.',
          fix: 'Confirm the venue has strobe fire alarms and add an emergency visual cue to the console.',
        }
  );

  checks.push(
    prepMaterialWindowDays >= 7
      ? {
          id: 'prep',
          label: 'Prep materials for interpreters',
          status: 'pass',
          detail: `Shared ${prepMaterialWindowDays} days ahead.`,
        }
      : {
          id: 'prep',
          label: 'Prep materials for interpreters',
          status: prepMaterialWindowDays >= 3 ? 'warn' : 'fail',
          detail: `Shared only ${prepMaterialWindowDays} day${prepMaterialWindowDays === 1 ? '' : 's'} ahead.`,
          fix: 'Send scripts, names and song lyrics to interpreters and captioners at least a week ahead.',
        }
  );

  const deafBlindTables = tables?.some((t) => t.tableType === 'tactile-close') ?? false;
  checks.push(
    deafBlindTables || DEAFBLIND.test(allPlanText(plan))
      ? {
          id: 'deafblind',
          label: 'DeafBlind guests',
          status: 'pass',
          detail: 'Close-vision or pro-tactile provision is planned.',
        }
      : {
          id: 'deafblind',
          label: 'DeafBlind guests',
          status: 'warn',
          detail: 'No close-vision seating or pro-tactile support in the plan.',
          fix: 'Ask about DeafBlind guests on the RSVP and add a front-line tactile table if needed.',
        }
  );

  if (tables && tables.length > 0) {
    const room = summarizeRoom(tables);
    const tallCenterpieces = tables.filter((t) => t.centerpieceHeightInches > CENTERPIECE_MAX_INCHES).length;
    checks.push({
      id: 'sightlines',
      label: 'Seating sightlines',
      status: room.clearRate >= 90 ? 'pass' : room.clearRate >= 70 ? 'warn' : 'fail',
      detail:
        `${room.clearRate}% of tables have a clear view of the interpreter` +
        (tallCenterpieces ? `; ${tallCenterpieces} table(s) have centerpieces over ${CENTERPIECE_MAX_INCHES}".` : '.'),
      fix: room.clearRate >= 90 ? undefined : 'Open the floorplan, fix obstructed tables or use Auto-Arrange.',
    });
  }

  const pending = plan.readinessChecklist.filter((r) => r.status === 'In Progress');
  if (plan.readinessChecklist.length > 0) {
    checks.push(
      pending.length === 0
        ? {
            id: 'readiness',
            label: 'Day-of readiness checklist',
            status: 'pass',
            detail: 'All readiness items are ready or verified.',
          }
        : {
            id: 'readiness',
            label: 'Day-of readiness checklist',
            status: 'warn',
            detail: `${pending.length} item(s) still in progress: ${pending.map((r) => r.item).join('; ')}.`,
            fix: 'Close out the in-progress items before the event.',
          }
    );
  }

  const counts = { pass: 0, warn: 0, fail: 0 } as Record<AuditStatus, number>;
  for (const c of checks) counts[c.status]++;
  const score = Math.round(((counts.pass + counts.warn * 0.5) / checks.length) * 100);
  return { score, checks, counts };
}
