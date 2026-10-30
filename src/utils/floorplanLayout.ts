import type { SightlineTable } from '../types';
import { createId } from './id';
import { CANVAS_BOUNDS, type SightlineStatus } from './sightline';

export type SeatingKind = NonNullable<SightlineTable['tableType']>;

interface SeatingPreset {
  kind: SeatingKind;
  label: string;
  description: string;
  icon: string;
  nameSuffix: string;
  defaults: Omit<SightlineTable, 'id' | 'name' | 'x' | 'y' | 'tableType'>;
  /** Where the first table of this kind lands; later ones are staggered so they don't stack. */
  origin: { x: number; y: number };
  stagger: { dx: number; dy: number; spanX: number; spanY: number } | null;
}

export const SEATING_PRESETS: readonly SeatingPreset[] = [
  {
    kind: 'dhh-crescent',
    label: 'DHH Crescent',
    description: 'Priority sightline open curve',
    icon: '🌙',
    nameSuffix: 'DHH Priority Crescent',
    defaults: {
      shape: 'crescent',
      seats: 8,
      centerpieceHeightInches: 6.5,
      dhhGuestCount: 8,
      notes: 'Open curve facing the ASL dais',
    },
    origin: { x: 230, y: 160 },
    stagger: { dx: 35, dy: 25, spanX: 180, spanY: 150 },
  },
  {
    kind: 'wheelchair-pod',
    label: 'Wheelchair Pod',
    description: '60" ADA aisle turning radius',
    icon: '♿',
    nameSuffix: 'Wheelchair Access Pod',
    defaults: {
      shape: 'radial',
      seats: 6,
      centerpieceHeightInches: 5.5,
      dhhGuestCount: 4,
      wheelchairSpots: 2,
      notes: '60" ADA turning corridor with companion seating',
    },
    origin: { x: 170, y: 200 },
    stagger: { dx: 30, dy: 20, spanX: 220, spanY: 140 },
  },
  {
    kind: 'cart-pod',
    label: 'CART View Pod',
    description: 'Perpendicular to caption screen',
    icon: '📺',
    nameSuffix: 'CART Caption Focus',
    defaults: {
      shape: 'u-shape',
      seats: 8,
      centerpieceHeightInches: 7,
      dhhGuestCount: 6,
      notes: 'Square-on to the 75" caption screen',
    },
    origin: { x: 140, y: 180 },
    stagger: { dx: 40, dy: 30, spanX: 200, spanY: 150 },
  },
  {
    kind: 'tactile-close',
    label: 'DeafBlind Front',
    description: 'Tactile / close-vision zone',
    icon: '🤝',
    nameSuffix: 'DeafBlind Frontline',
    defaults: {
      shape: 'crescent',
      seats: 4,
      centerpieceHeightInches: 4,
      dhhGuestCount: 4,
      notes: 'Close enough for tactile and close-vision signing',
    },
    origin: { x: 220, y: 125 },
    stagger: null,
  },
  {
    kind: 'standard',
    label: 'Standard Radial',
    description: 'Standard 8-person banquet',
    icon: '⚪',
    nameSuffix: 'Standard Radial',
    defaults: {
      shape: 'radial',
      seats: 8,
      centerpieceHeightInches: 8,
      dhhGuestCount: 2,
      notes: 'Standard round banquet table',
    },
    origin: { x: 520, y: 260 },
    stagger: null,
  },
];

/** Creates a new table of the given kind, numbered and positioned after the existing ones. */
export function createPresetTable(kind: SeatingKind, existingCount: number): SightlineTable {
  const preset = SEATING_PRESETS.find((p) => p.kind === kind) ?? SEATING_PRESETS[SEATING_PRESETS.length - 1];
  const { origin, stagger } = preset;
  return {
    ...preset.defaults,
    id: createId('tbl'),
    name: `Table ${existingCount + 1} (${preset.nameSuffix})`,
    tableType: kind,
    x: stagger ? origin.x + ((existingCount * stagger.dx) % stagger.spanX) : origin.x,
    y: stagger ? origin.y + ((existingCount * stagger.dy) % stagger.spanY) : origin.y,
  };
}

export function duplicateTable(table: SightlineTable): SightlineTable {
  return {
    ...table,
    id: createId('tbl'),
    name: `${table.name} (Copy)`,
    x: Math.min(CANVAS_BOUNDS.maxX - 30, table.x + 35),
    y: Math.min(CANVAS_BOUNDS.maxY - 30, table.y + 35),
  };
}

/** Tiers of a DeafSpace amphitheatre arc centred on the interpreter dais: [radius, first angle, step]. */
const ARC_TIERS: [number, number, number][] = [
  [135, -35, 35],
  [220, -45, 30],
  [305, -50, 26],
];
const ARC_CENTER = { x: 330, y: 50 };
/** Auto-arrange also trims centerpieces to stay comfortably under the 9.5" cap. */
const ARRANGED_CENTERPIECE_MAX = 8;

/** Places tables on three concentric arcs facing the dais (3 front, 3 middle, the rest behind). */
export function autoArrangeRadial(tables: SightlineTable[]): SightlineTable[] {
  return tables.map((table, index) => {
    const tier = Math.min(2, Math.floor(index / 3));
    const [radius, firstAngle, step] = ARC_TIERS[tier];
    const angle = ((firstAngle + (index - tier * 3) * step) * Math.PI) / 180;
    return {
      ...table,
      x: Math.max(70, Math.min(730, Math.round(ARC_CENTER.x + Math.sin(angle) * radius))),
      y: Math.max(120, Math.min(440, Math.round(ARC_CENTER.y + Math.cos(angle) * radius))),
      centerpieceHeightInches: Math.min(table.centerpieceHeightInches, ARRANGED_CENTERPIECE_MAX),
    };
  });
}

export function seatingIcon(table: SightlineTable): string {
  if (table.tableType === 'wheelchair-pod' || table.wheelchairSpots) return '♿';
  if (table.tableType === 'cart-pod') return '📺';
  if (table.tableType === 'tactile-close') return '🤝';
  if (table.shape === 'crescent' || table.tableType === 'dhh-crescent') return '🌙';
  return '⚪';
}

export const STATUS_TEXT: Record<SightlineStatus, string> = {
  clear: 'clear sightline',
  fair: 'partial sightline',
  obstructed: 'obstructed sightline',
};

export const STATUS_COLOR: Record<SightlineStatus, string> = {
  clear: '#10b981',
  fair: '#f59e0b',
  obstructed: '#f43f5e',
};

/** Display name without the "(Wheelchair Access Pod)" style suffix. */
export const shortTableName = (table: SightlineTable) => table.name.split('(')[0].trim();
