import type {
  BudgetItem,
  CountdownPhase,
  EventCategory,
  EventPlan,
  PersonalizedIdea,
  SensoryCue,
  TimelineMilestone,
  VendorItem,
} from '../types';

// Model output is untrusted: every field is coerced to the shape the UI expects, unknown enum
// values fall back to a safe default, and list lengths are capped.

type Raw = Record<string, unknown>;

const MAX_ITEMS = 40;

const asRecord = (v: unknown): Raw => (v && typeof v === 'object' && !Array.isArray(v) ? (v as Raw) : {});
const asList = (v: unknown): Raw[] => (Array.isArray(v) ? v.slice(0, MAX_ITEMS).map(asRecord) : []);
const str = (v: unknown, fallback = ''): string =>
  typeof v === 'string' && v.trim() ? v.trim().slice(0, 1000) : fallback;
const num = (v: unknown, fallback = 0): number => {
  const n = typeof v === 'number' ? v : Number.parseFloat(String(v));
  return Number.isFinite(n) && n >= 0 ? n : fallback;
};
const oneOf = <T extends string>(v: unknown, options: readonly T[], fallback: T): T =>
  options.includes(v as T) ? (v as T) : fallback;

const PRIORITIES = ['Essential', 'High', 'Recommended', 'Base'] as const;
const VENDOR_STATUSES = ['To Research', 'Contacted', 'Proposal Received', 'Booked', 'Paid'] as const;
const CUE_TYPES = ['visual', 'interpreter', 'caption', 'haptic', 'milestone'] as const;
const IDEA_CATEGORIES = [
  'Theme & Palette',
  'Food & Beverage',
  'Interactive Experience',
  'Atmosphere & Decor',
  'Inclusive Touch',
] as const;
const IMPACTS = ['Low', 'Medium', 'High'] as const;
const READINESS = ['Verified', 'Ready', 'In Progress'] as const;

export function inferEventCategory(label: string): EventCategory {
  const l = label.toLowerCase();
  if (l.includes('wedding')) return 'wedding';
  if (l.includes('birthday')) return 'birthday';
  if (/(corporate|conference|summit|company|offsite)/.test(l)) return 'corporate';
  return 'community';
}

export function normalizeIdeas(raw: unknown, idPrefix: string): PersonalizedIdea[] {
  return asList(raw)
    .filter((idea) => str(idea.title))
    .map((idea, idx) => ({
      id: `${idPrefix}-${idx}`,
      category: oneOf(idea.category, IDEA_CATEGORIES, 'Inclusive Touch'),
      title: str(idea.title),
      description: str(idea.description),
      budgetImpact: oneOf(idea.budgetImpact, IMPACTS, 'Medium'),
      implementationTip: str(idea.implementationTip, 'Coordinate with your vendor team.'),
      isSaved: false,
    }));
}

export interface PlanRequest {
  eventLabel: string;
  guestCount: number;
  budget: number;
  venueType: string;
  theme: string;
  dhhPercentage: number;
}

/** Converts a raw /api/gemini/plan-event response into a complete, well-typed EventPlan. */
export function normalizeGeneratedPlan(
  data: unknown,
  request: PlanRequest,
  idSeed: string = crypto.randomUUID()
): EventPlan {
  const d = asRecord(data);
  const seating = asRecord(d.sightlineAndSeating);
  const staffing = asRecord(d.interpreterStaffing);

  const budgetAllocation: BudgetItem[] = asList(d.budgetAllocation)
    .filter((b) => str(b.category))
    .map((b, idx) => ({
      id: `b-${idSeed}-${idx}`,
      category: str(b.category),
      amount: Math.round(num(b.amount)),
      priority: oneOf(b.priority, PRIORITIES, 'High'),
      notes: str(b.notes),
      status: 'Estimated',
    }));

  const countdownPhases: CountdownPhase[] = asList(d.countdownPhases).map((p, idx) => ({
    id: `phase-${idSeed}-${idx}`,
    timeframe: str(p.timeframe, `Phase ${idx + 1}`),
    description: str(p.description),
    tasks: asList(p.tasks)
      .filter((t) => str(t.title))
      .map((t, tIdx) => ({
        id: `task-${idSeed}-${idx}-${tIdx}`,
        title: str(t.title),
        category: str(t.category, 'Planning'),
        completed: false,
      })),
  }));

  const vendorChecklist: VendorItem[] = asList(d.vendorChecklist)
    .filter((v) => str(v.name))
    .map((v, idx) => ({
      id: `v-${idSeed}-${idx}`,
      category: str(v.category, 'General'),
      name: str(v.name),
      contact: str(v.contact),
      emailPhone: str(v.emailPhone),
      status: oneOf(v.status, VENDOR_STATUSES, 'To Research'),
      estimatedCost: Math.round(num(v.estimatedCost)),
      keyQuestions: (Array.isArray(v.keyQuestions) ? v.keyQuestions : [])
        .map((q) => str(q))
        .filter(Boolean)
        .slice(0, 10),
      deadline: str(v.deadline, 'TBD'),
      notes: str(v.notes),
    }));

  const timelineMilestones: TimelineMilestone[] = asList(d.timelineMilestones)
    .filter((m) => str(m.title))
    .map((m, idx) => ({
      id: `m-${idSeed}-${idx}`,
      time: /^\d{1,2}:\d{2}$/.test(str(m.time)) ? str(m.time).padStart(5, '0') : '00:00',
      title: str(m.title),
      details: str(m.details),
      cueType: oneOf(m.cueType, CUE_TYPES, 'milestone'),
      interpreterRotation: m.interpreterRotation === true,
    }))
    .sort((a, b) => a.time.localeCompare(b.time));

  const sensoryAndVisualCues: SensoryCue[] = asList(d.sensoryAndVisualCues)
    .filter((c) => str(c.trigger))
    .map((c, idx) => ({
      id: `cue-${idSeed}-${idx}`,
      trigger: str(c.trigger),
      visualCue: str(c.visualCue, 'Visual cue to be defined'),
      hapticCue: str(c.hapticCue, 'Haptic cue to be defined'),
      captionMode: str(c.captionMode, 'Caption screens'),
    }));

  const focalZones = (Array.isArray(seating.focalZones) ? seating.focalZones : []).map((z) => str(z)).filter(Boolean);

  return {
    id: `plan-${idSeed}`,
    title: str(d.title, `${request.eventLabel} Plan`),
    eventType: inferEventCategory(request.eventLabel),
    guestCount: request.guestCount,
    dhhPercentage: request.dhhPercentage,
    totalBudget: request.budget,
    venueName: request.venueType,
    dateStr: 'Date to be confirmed',
    theme: str(d.theme, request.theme),
    executiveSummary: str(d.executiveSummary, 'Event plan with budget, timeline, vendors and access arrangements.'),
    budgetAllocation,
    countdownPhases,
    vendorChecklist,
    timelineMilestones,
    personalizedIdeas: normalizeIdeas(d.personalizedIdeas, `idea-${idSeed}`).map((i) => ({ ...i, isSaved: true })),
    sightlineAndSeating: {
      recommendedLayout: str(seating.recommendedLayout, 'Radial semi-circle facing stage and interpreter'),
      focalZones: focalZones.length ? focalZones : ['Interpreter platform', 'Speaker', 'Caption screens'],
      lightingGuidance: str(seating.lightingGuidance, 'Even front lighting on signers; no backlighting.'),
    },
    interpreterStaffing: {
      teamSize: Math.round(num(staffing.teamSize, 2)),
      rotationIntervalMinutes: Math.round(num(staffing.rotationIntervalMinutes, 20)),
      qualifications: str(staffing.qualifications, 'Certified interpreter team'),
      prepMaterialWindowDays: Math.round(num(staffing.prepMaterialWindowDays, 7)),
    },
    sensoryAndVisualCues,
    readinessChecklist: asList(d.readinessChecklist)
      .filter((r) => str(r.item))
      .map((r) => ({ item: str(r.item), status: oneOf(r.status, READINESS, 'In Progress'), detail: str(r.detail) })),
  };
}
