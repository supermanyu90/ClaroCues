import type { SightlineTable } from '../types';

export interface Point {
  x: number;
  y: number;
}

/** Fixed venue anchors on the 800×500 floorplan canvas (10px ≈ 1ft). */
export const VENUE_ANCHORS = {
  interpreter: { x: 260, y: 55, label: 'ASL Interpreter Dais (18" Riser)' },
  speaker: { x: 400, y: 45, label: 'Speaker / Couple Altar' },
  leftCart: { x: 120, y: 70, label: '75" Low-Glare CART Screen Left' },
  rightCart: { x: 680, y: 70, label: '75" Low-Glare CART Screen Right' },
  danceFloor: { x: 400, y: 220, label: 'Sound-to-Light Sensory Floor (16x16ft)' },
} as const;

export const CANVAS_BOUNDS = { minX: 50, maxX: 750, minY: 105, maxY: 460 } as const;

/** DeafSpace eye-level cap: anything taller blocks faces and hands across a 60" table. */
export const CENTERPIECE_MAX_INCHES = 9.5;
/** Beyond ~37ft (370px) fine handshapes and facial grammar become hard to read. */
export const MAX_SIGNING_DISTANCE_PX = 370;
/** A table this close to another table's ray to the dais blocks it. */
export const OBSTRUCTION_CORRIDOR_PX = 28;

export type SightlineStatus = 'clear' | 'fair' | 'obstructed';

export interface SightlineAnalysis {
  distanceToInterpreter: number;
  distanceToSpeaker: number;
  distanceToCart: number;
  status: SightlineStatus;
  obstructionReason?: string;
  angleToInterpreter: number;
  blockedByTableId?: string;
}

export function isPriorityTable(tbl: SightlineTable): boolean {
  return (
    tbl.shape === 'crescent' ||
    tbl.shape === 'u-shape' ||
    (tbl.tableType !== undefined && tbl.tableType !== 'standard') ||
    (tbl.wheelchairSpots ?? 0) > 0 ||
    tbl.dhhGuestCount >= 4
  );
}

/** Distance from point p to segment a→b, plus the projection parameter t ∈ [0, 1]. */
export function distancePointToSegment(p: Point, a: Point, b: Point): { dist: number; t: number } {
  const l2 = (b.x - a.x) ** 2 + (b.y - a.y) ** 2;
  if (l2 === 0) return { dist: Math.hypot(p.x - a.x, p.y - a.y), t: 0 };
  const t = Math.max(0, Math.min(1, ((p.x - a.x) * (b.x - a.x) + (p.y - a.y) * (b.y - a.y)) / l2));
  return { dist: Math.hypot(p.x - (a.x + t * (b.x - a.x)), p.y - (a.y + t * (b.y - a.y))), t };
}

export function nearestCartScreen(tbl: Point) {
  return tbl.x < 400 ? VENUE_ANCHORS.leftCart : VENUE_ANCHORS.rightCart;
}

/** Evaluates one table's line of sight to the interpreter dais, checking the rules in priority order. */
export function analyzeTableSightline(tbl: SightlineTable, allTables: SightlineTable[]): SightlineAnalysis {
  const { interpreter, speaker, danceFloor } = VENUE_ANCHORS;
  const cart = nearestCartScreen(tbl);
  const distInterpreter = Math.hypot(tbl.x - interpreter.x, tbl.y - interpreter.y);
  const angleDeg = Math.round((Math.atan2(tbl.x - interpreter.x, tbl.y - interpreter.y) * 180) / Math.PI);

  const base = {
    distanceToInterpreter: Math.round(distInterpreter),
    distanceToSpeaker: Math.round(Math.hypot(tbl.x - speaker.x, tbl.y - speaker.y)),
    distanceToCart: Math.round(Math.hypot(tbl.x - cart.x, tbl.y - cart.y)),
    angleToInterpreter: angleDeg,
  };

  if (tbl.centerpieceHeightInches > CENTERPIECE_MAX_INCHES) {
    return {
      ...base,
      status: 'obstructed',
      obstructionReason: `Centerpiece (${tbl.centerpieceHeightInches}") exceeds ${CENTERPIECE_MAX_INCHES}" DeafSpace eye-level cap`,
    };
  }

  const daisTarget = { x: interpreter.x, y: interpreter.y + 10 };
  for (const other of allTables) {
    if (other.id === tbl.id) continue;
    const { dist, t } = distancePointToSegment(other, tbl, daisTarget);
    // Only count tables genuinely between this one and the dais, not ones touching either end.
    if (t > 0.15 && t < 0.88 && dist < OBSTRUCTION_CORRIDOR_PX) {
      return {
        ...base,
        status: 'obstructed',
        obstructionReason: `Sightline to ASL dais blocked by ${other.name}`,
        blockedByTableId: other.id,
      };
    }
  }

  const acrossFloor = distancePointToSegment(danceFloor, tbl, interpreter);
  if (acrossFloor.t > 0.1 && acrossFloor.t < 0.9 && acrossFloor.dist < 32 && tbl.x > 320 && tbl.y > 280) {
    return { ...base, status: 'fair', obstructionReason: 'Peripheral angle across sensory floor edge' };
  }

  if (distInterpreter > MAX_SIGNING_DISTANCE_PX) {
    return {
      ...base,
      status: 'fair',
      obstructionReason: `Extended distance (${Math.round(distInterpreter / 10)}ft eq) reduces signing nuance clarity`,
    };
  }

  if (angleDeg < -65 || angleDeg > 75) {
    return { ...base, status: 'fair', obstructionReason: `Sharp viewing angle (${angleDeg}°) requires neck strain` };
  }

  return { ...base, status: 'clear' };
}

export function clampToCanvas(p: Point): Point {
  return {
    x: Math.max(CANVAS_BOUNDS.minX, Math.min(CANVAS_BOUNDS.maxX, Math.round(p.x))),
    y: Math.max(CANVAS_BOUNDS.minY, Math.min(CANVAS_BOUNDS.maxY, Math.round(p.y))),
  };
}

export interface RoomSummary {
  totalSeats: number;
  dhhSeats: number;
  clearCount: number;
  obstructedCount: number;
  clearRate: number;
  priorityCount: number;
}

export function summarizeRoom(tables: SightlineTable[]): RoomSummary {
  const analyses = tables.map((t) => analyzeTableSightline(t, tables));
  const clearCount = analyses.filter((a) => a.status === 'clear').length;
  return {
    totalSeats: tables.reduce((acc, t) => acc + t.seats, 0),
    dhhSeats: tables.reduce((acc, t) => acc + t.dhhGuestCount, 0),
    clearCount,
    obstructedCount: analyses.filter((a) => a.status === 'obstructed').length,
    clearRate: tables.length ? Math.round((clearCount / tables.length) * 100) : 0,
    priorityCount: tables.filter(isPriorityTable).length,
  };
}
