import { type BudgetItem, type EventCategory } from '../types';

export type StandardCategoryKey = 'venue' | 'catering' | 'photography' | 'entertainment' | 'decor' | 'accessibility';

export interface CategoryBenchmark {
  key: StandardCategoryKey;
  displayName: string;
  industryAveragePercent: number;
  warningThresholdPercent: number;
  description: string;
}

export interface BudgetWarning {
  categoryKey: StandardCategoryKey;
  categoryDisplayName: string;
  allocatedAmount: number;
  allocatedPercent: number;
  industryAveragePercent: number;
  warningThresholdPercent: number;
  recommendedMaxAmount: number;
  excessAmount: number;
  severity: 'warning' | 'critical';
  eventType: EventCategory;
  affectedItemIds: string[];
  recommendation: string;
}

// Industry average and upper warning thresholds by event type
export const INDUSTRY_BENCHMARKS: Record<EventCategory, Record<StandardCategoryKey, CategoryBenchmark>> = {
  wedding: {
    venue: {
      key: 'venue',
      displayName: 'Venue & Staging',
      industryAveragePercent: 28,
      warningThresholdPercent: 33,
      description: 'Physical hall hire, staging, and site rental fees.',
    },
    catering: {
      key: 'catering',
      displayName: 'Catering & Beverage',
      industryAveragePercent: 36,
      warningThresholdPercent: 42,
      description: 'Food service, appetizers, open bar, and celebratory dessert.',
    },
    photography: {
      key: 'photography',
      displayName: 'Photography & Cinema',
      industryAveragePercent: 10,
      warningThresholdPercent: 14,
      description: 'Lead shooter, highlight reels, and archival galleries.',
    },
    entertainment: {
      key: 'entertainment',
      displayName: 'Music & Production',
      industryAveragePercent: 10,
      warningThresholdPercent: 14,
      description: 'DJ, live musicians, acoustic reinforcement, and dancefloor tech.',
    },
    decor: {
      key: 'decor',
      displayName: 'Floral & Decor',
      industryAveragePercent: 9,
      warningThresholdPercent: 13,
      description: 'Centerpieces, table linen rentals, and ambient lighting.',
    },
    accessibility: {
      key: 'accessibility',
      displayName: 'Accessibility & CART',
      industryAveragePercent: 12,
      warningThresholdPercent: 20,
      description: 'RID-certified interpreter teams, CART real-time steno, and assistive listening.',
    },
  },
  birthday: {
    venue: {
      key: 'venue',
      displayName: 'Venue & Loft Rental',
      industryAveragePercent: 22,
      warningThresholdPercent: 30,
      description: 'Private room hire, rooftop terrace, or hall reservation.',
    },
    catering: {
      key: 'catering',
      displayName: 'Catering, Cake & Bar',
      industryAveragePercent: 38,
      warningThresholdPercent: 45,
      description: 'Tapas stations, craft cocktails, mocktails, and milestone cake.',
    },
    photography: {
      key: 'photography',
      displayName: 'Photography & Photobooth',
      industryAveragePercent: 8,
      warningThresholdPercent: 12,
      description: 'Event candid coverage, polaroid guestbooks, and social media clips.',
    },
    entertainment: {
      key: 'entertainment',
      displayName: 'DJ & Visual Entertainment',
      industryAveragePercent: 16,
      warningThresholdPercent: 22,
      description: 'Sound-to-light reactive dance floor, DJ mixing, and trivia host.',
    },
    decor: {
      key: 'decor',
      displayName: 'Party Decor & Balloons',
      industryAveragePercent: 6,
      warningThresholdPercent: 10,
      description: 'Neon signage, photo backdrops, lighting wash, and guest favors.',
    },
    accessibility: {
      key: 'accessibility',
      displayName: 'Accessibility Services',
      industryAveragePercent: 8,
      warningThresholdPercent: 15,
      description: 'Live captions for speeches, accessible seating, and visual alerts.',
    },
  },
  community: {
    venue: {
      key: 'venue',
      displayName: 'Venue & Hall Facilities',
      industryAveragePercent: 25,
      warningThresholdPercent: 32,
      description: 'Civic auditorium, community center, or park pavilion.',
    },
    catering: {
      key: 'catering',
      displayName: 'Catering & Hospitality',
      industryAveragePercent: 28,
      warningThresholdPercent: 35,
      description: 'Buffet lunch, concession vouchers, and volunteer refreshments.',
    },
    photography: {
      key: 'photography',
      displayName: 'Media & Documentation',
      industryAveragePercent: 6,
      warningThresholdPercent: 10,
      description: 'Press photography, recap videos, and promotional captures.',
    },
    entertainment: {
      key: 'entertainment',
      displayName: 'Staging, Audio & AV',
      industryAveragePercent: 14,
      warningThresholdPercent: 20,
      description: 'Keynote microphones, stage lighting, and PA systems.',
    },
    decor: {
      key: 'decor',
      displayName: 'Signage & Displays',
      industryAveragePercent: 5,
      warningThresholdPercent: 8,
      description: 'Banners, direction wayfinding, and table branding.',
    },
    accessibility: {
      key: 'accessibility',
      displayName: 'Interpreter & CART Team',
      industryAveragePercent: 15,
      warningThresholdPercent: 24,
      description: 'Dual interpreter teams, live steno screens, and wheelchair access.',
    },
  },
  corporate: {
    venue: {
      key: 'venue',
      displayName: 'Conference Venue',
      industryAveragePercent: 28,
      warningThresholdPercent: 35,
      description: 'Hotel ballroom, expo hall, or convention center suites.',
    },
    catering: {
      key: 'catering',
      displayName: 'Executive Catering',
      industryAveragePercent: 32,
      warningThresholdPercent: 38,
      description: 'Working lunches, coffee services, and networking receptions.',
    },
    photography: {
      key: 'photography',
      displayName: 'Corporate Media',
      industryAveragePercent: 6,
      warningThresholdPercent: 10,
      description: 'Keynote live streaming, headshots, and event recaps.',
    },
    entertainment: {
      key: 'entertainment',
      displayName: 'Keynote AV & Sound',
      industryAveragePercent: 14,
      warningThresholdPercent: 20,
      description: 'Dual projection, stage wash, and lavalier microphone systems.',
    },
    decor: {
      key: 'decor',
      displayName: 'Branding & Environment',
      industryAveragePercent: 5,
      warningThresholdPercent: 8,
      description: 'Sponsor step-and-repeat backdrops and registration desks.',
    },
    accessibility: {
      key: 'accessibility',
      displayName: 'Corporate ADA & Inclusion',
      industryAveragePercent: 10,
      warningThresholdPercent: 16,
      description: 'Live CART stream, remote ASL relay, and hearing loops.',
    },
  },
};

// Ordered: the first matching rule wins, so accessibility is checked before generic AV/sound.
// Whole-word matching avoids false hits such as "bar" in "barrier-free" or "hall" in "shall".
const CATEGORY_RULES: [StandardCategoryKey, RegExp][] = [
  [
    'accessibility',
    /\b(asl|interpreters?|interpreting|cart|captions?|captioning|steno|hearing loops?|induction|dhh|sightlines?|tactile|accessibility)\b/,
  ],
  ['catering', /\b(cater\w*|food|beverages?|bar|cocktails?|mocktails?|cake|dinner|snacks?|buffet|dining|tasting)\b/],
  ['venue', /\b(venue|pavilion|hall|loft|terrace|space rental|facilit(y|ies)|staging|site)\b/],
  ['photography', /\b(photo\w*|video\w*|cinema\w*|polaroids?|camera)\b/],
  ['entertainment', /\b(dj|music|band|dance ?floor|sound-to-light|sound|audio|lighting rig|trivia|performers?)\b/],
  ['decor', /\b(florals?|flowers?|decor|centerpieces?|balloons?|signage|backdrops?|linens?)\b/],
];

/**
 * Classifies an arbitrary expense category string into a standardized benchmark category.
 */
export function classifyCategory(categoryName: string): StandardCategoryKey | null {
  const norm = categoryName.toLowerCase();
  for (const [key, pattern] of CATEGORY_RULES) {
    if (pattern.test(norm)) return key;
  }
  return null;
}

export interface AccessibilityFundingGap {
  allocatedAmount: number;
  allocatedPercent: number;
  industryAveragePercent: number;
  shortfallAmount: number;
}

/**
 * Under-funding access is the costlier mistake for a Deaf-inclusive event, so it is flagged
 * separately from the over-allocation warnings. Returns null when funding meets the benchmark.
 */
export function checkAccessibilityFunding(
  items: BudgetItem[],
  totalBudget: number,
  eventType: EventCategory = 'wedding'
): AccessibilityFundingGap | null {
  if (totalBudget <= 0) return null;
  const allocatedAmount = accessibilitySpend(items);
  const allocatedPercent = Math.round((allocatedAmount / totalBudget) * 1000) / 10;
  const { industryAveragePercent } = (INDUSTRY_BENCHMARKS[eventType] || INDUSTRY_BENCHMARKS.wedding).accessibility;
  if (allocatedPercent >= industryAveragePercent) return null;
  return {
    allocatedAmount,
    allocatedPercent,
    industryAveragePercent,
    shortfallAmount: Math.round((industryAveragePercent / 100) * totalBudget - allocatedAmount),
  };
}

/**
 * Analyzes all budget items against industry averages for the selected event type.
 * Returns an array of BudgetWarnings for any category whose total allocation exceeds the warning threshold.
 */
export function analyzeBudgetAgainstBenchmarks(
  items: BudgetItem[],
  totalBudget: number,
  eventType: EventCategory = 'wedding'
): BudgetWarning[] {
  if (totalBudget <= 0 || !items || items.length === 0) return [];

  const benchmarksForType = INDUSTRY_BENCHMARKS[eventType] || INDUSTRY_BENCHMARKS.wedding;

  // Group items and amounts by category key
  const grouped: Record<StandardCategoryKey, { totalAmount: number; itemIds: string[]; sampleCategoryName: string }> = {
    venue: { totalAmount: 0, itemIds: [], sampleCategoryName: '' },
    catering: { totalAmount: 0, itemIds: [], sampleCategoryName: '' },
    photography: { totalAmount: 0, itemIds: [], sampleCategoryName: '' },
    entertainment: { totalAmount: 0, itemIds: [], sampleCategoryName: '' },
    decor: { totalAmount: 0, itemIds: [], sampleCategoryName: '' },
    accessibility: { totalAmount: 0, itemIds: [], sampleCategoryName: '' },
  };

  for (const item of items) {
    const key = classifyCategory(item.category);
    if (key && grouped[key]) {
      grouped[key].totalAmount += item.amount;
      grouped[key].itemIds.push(item.id);
      if (!grouped[key].sampleCategoryName) {
        grouped[key].sampleCategoryName = item.category;
      }
    }
  }

  const warnings: BudgetWarning[] = [];

  for (const [keyStr, group] of Object.entries(grouped)) {
    const key = keyStr as StandardCategoryKey;
    const benchmark = benchmarksForType[key];
    if (!benchmark || group.totalAmount <= 0) continue;

    const allocatedPercent = (group.totalAmount / totalBudget) * 100;

    if (allocatedPercent > benchmark.warningThresholdPercent) {
      const recommendedMaxAmount = Math.round((benchmark.warningThresholdPercent / 100) * totalBudget);
      const excessAmount = group.totalAmount - recommendedMaxAmount;
      const severity: 'warning' | 'critical' =
        allocatedPercent >= benchmark.warningThresholdPercent + 6 ? 'critical' : 'warning';

      // Actionable recommendation based on category
      let recommendation = '';
      if (key === 'catering') {
        recommendation = `Allocating ${allocatedPercent.toFixed(1)}% of your total budget to catering exceeds the ${benchmark.warningThresholdPercent}% industry threshold for ${eventType}s. Consider swapping plated course service for grazing stations, adjusting open bar hours, or requesting volume quotes to trim ~$${excessAmount.toLocaleString()}.`;
      } else if (key === 'venue') {
        recommendation = `Venue fees are consuming ${allocatedPercent.toFixed(1)}% of your budget (standard is ~${benchmark.industryAveragePercent}%). Check for off-peak time reductions (e.g. Sunday or Friday) or bundle AV and cleanup fees to save ~$${excessAmount.toLocaleString()}.`;
      } else if (key === 'photography') {
        recommendation = `Media production represents ${allocatedPercent.toFixed(1)}% of total spend (threshold: ${benchmark.warningThresholdPercent}%). Consider trimming coverage hours to focus on core milestones.`;
      } else if (key === 'entertainment') {
        recommendation = `Entertainment and staging allocation (${allocatedPercent.toFixed(1)}%) is above the ${benchmark.warningThresholdPercent}% benchmark. Bundle lighting packages with your DJ to lower equipment rental costs.`;
      } else if (key === 'decor') {
        recommendation = `Florals and decor comprise ${allocatedPercent.toFixed(1)}% of budget. Repurpose ceremony low-profile arrangements (<8.5") for reception dining tables.`;
      } else {
        recommendation = `Accessibility spend is currently ${allocatedPercent.toFixed(1)}%. Ensure paired interpreter rotations are optimized for active program duration rather than full idle hours.`;
      }

      warnings.push({
        categoryKey: key,
        categoryDisplayName: benchmark.displayName,
        allocatedAmount: group.totalAmount,
        allocatedPercent: Math.round(allocatedPercent * 10) / 10,
        industryAveragePercent: benchmark.industryAveragePercent,
        warningThresholdPercent: benchmark.warningThresholdPercent,
        recommendedMaxAmount,
        excessAmount,
        severity,
        eventType,
        affectedItemIds: group.itemIds,
        recommendation,
      });
    }
  }

  // Sort by highest excess percentage over threshold
  return warnings.sort(
    (a, b) => b.allocatedPercent - b.warningThresholdPercent - (a.allocatedPercent - a.warningThresholdPercent)
  );
}

/**
 * Checks a single BudgetItem against industry standards and returns a warning if it triggers or contributes to an overage.
 */
export function checkSingleItemWarning(
  item: BudgetItem,
  totalBudget: number,
  eventType: EventCategory = 'wedding'
): { isWarning: boolean; benchmark?: CategoryBenchmark; allocatedPercent: number } {
  if (totalBudget <= 0) return { isWarning: false, allocatedPercent: 0 };

  const key = classifyCategory(item.category);
  const allocatedPercent = Math.round((item.amount / totalBudget) * 100 * 10) / 10;

  if (!key) return { isWarning: false, allocatedPercent };

  const benchmark = (INDUSTRY_BENCHMARKS[eventType] || INDUSTRY_BENCHMARKS.wedding)[key];
  if (!benchmark) return { isWarning: false, allocatedPercent };

  const isWarning = allocatedPercent > benchmark.warningThresholdPercent;
  return { isWarning, benchmark, allocatedPercent };
}

export const sumAmounts = (items: BudgetItem[]): number => items.reduce((sum, item) => sum + item.amount, 0);

/** Total spend on interpreters, captioning and other access services. */
export const accessibilitySpend = (items: BudgetItem[]): number =>
  sumAmounts(items.filter((item) => classifyCategory(item.category) === 'accessibility'));

export interface CategorySummary {
  key: StandardCategoryKey;
  displayName: string;
  description: string;
  spent: number;
  percent: number;
  averagePercent: number;
  warningThresholdPercent: number;
  isOver: boolean;
}

/** Spend per benchmark category, as a share of the total, alongside the industry figures. */
export function summarizeCategories(
  items: BudgetItem[],
  totalBudget: number,
  eventType: EventCategory
): CategorySummary[] {
  const benchmarks = INDUSTRY_BENCHMARKS[eventType] ?? INDUSTRY_BENCHMARKS.wedding;
  return (Object.keys(benchmarks) as StandardCategoryKey[]).map((key) => {
    const benchmark = benchmarks[key];
    const spent = sumAmounts(items.filter((item) => classifyCategory(item.category) === key));
    const percent = totalBudget > 0 ? Math.round((spent / totalBudget) * 1000) / 10 : 0;
    return {
      key,
      displayName: benchmark.displayName,
      description: benchmark.description,
      spent,
      percent,
      averagePercent: benchmark.industryAveragePercent,
      warningThresholdPercent: benchmark.warningThresholdPercent,
      isOver: percent > benchmark.warningThresholdPercent,
    };
  });
}

/** Scales every line item in an over-allocated category down proportionally to the warning threshold. */
export function capCategoryToThreshold(items: BudgetItem[], warning: BudgetWarning): BudgetItem[] {
  if (warning.allocatedAmount <= 0) return items;
  const scale = warning.recommendedMaxAmount / warning.allocatedAmount;
  const affected = new Set(warning.affectedItemIds);
  return items.map((item) => (affected.has(item.id) ? { ...item, amount: Math.round(item.amount * scale) } : item));
}

const STATUS_CYCLE: Record<BudgetItem['status'], BudgetItem['status']> = {
  Estimated: 'Booked',
  Booked: 'Paid',
  Paid: 'Estimated',
};

export const nextBudgetStatus = (status: BudgetItem['status']) => STATUS_CYCLE[status];
