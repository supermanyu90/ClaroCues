import { describe, expect, it } from 'vitest';
import type { SightlineTable } from '../types';
import {
  VENUE_ANCHORS,
  analyzeTableSightline,
  clampToCanvas,
  distancePointToSegment,
  isPriorityTable,
  summarizeRoom,
} from './sightline';

const table = (overrides: Partial<SightlineTable>): SightlineTable => ({
  id: 't',
  name: 'Table',
  x: 260,
  y: 200,
  shape: 'radial',
  seats: 8,
  centerpieceHeightInches: 6,
  dhhGuestCount: 0,
  ...overrides,
});

describe('distancePointToSegment', () => {
  it('projects onto the segment interior', () => {
    expect(distancePointToSegment({ x: 5, y: 5 }, { x: 0, y: 0 }, { x: 10, y: 0 })).toEqual({ dist: 5, t: 0.5 });
  });

  it('clamps to the nearest endpoint', () => {
    expect(distancePointToSegment({ x: -3, y: 4 }, { x: 0, y: 0 }, { x: 10, y: 0 })).toEqual({ dist: 5, t: 0 });
  });

  it('handles a zero-length segment', () => {
    expect(distancePointToSegment({ x: 3, y: 4 }, { x: 0, y: 0 }, { x: 0, y: 0 }).dist).toBe(5);
  });
});

describe('analyzeTableSightline', () => {
  it('reports a clear sightline for a nearby, unobstructed table', () => {
    const t = table({ id: 'a' });
    expect(analyzeTableSightline(t, [t]).status).toBe('clear');
  });

  it('marks tall centerpieces as obstructed regardless of position', () => {
    const t = table({ id: 'a', centerpieceHeightInches: 12 });
    const result = analyzeTableSightline(t, [t]);
    expect(result.status).toBe('obstructed');
    expect(result.obstructionReason).toContain('12"');
  });

  it('detects a table sitting between a guest table and the interpreter dais', () => {
    const back = table({ id: 'back', name: 'Back', x: 260, y: 400 });
    const front = table({ id: 'front', name: 'Front', x: 260, y: 230 });
    const result = analyzeTableSightline(back, [back, front]);
    expect(result).toMatchObject({ status: 'obstructed', blockedByTableId: 'front' });
    // ...but the front table itself is fine.
    expect(analyzeTableSightline(front, [back, front]).status).toBe('clear');
  });

  it('rates distant tables as fair', () => {
    const t = table({ id: 'far', x: 700, y: 460 });
    expect(analyzeTableSightline(t, [t]).status).toBe('fair');
  });

  it('measures distance to the interpreter in canvas pixels', () => {
    const t = table({ x: VENUE_ANCHORS.interpreter.x, y: VENUE_ANCHORS.interpreter.y + 100 });
    expect(analyzeTableSightline(t, [t]).distanceToInterpreter).toBe(100);
  });
});

describe('helpers', () => {
  it('clamps positions to the usable room', () => {
    expect(clampToCanvas({ x: -20, y: 9999 })).toEqual({ x: 50, y: 460 });
  });

  it('treats accessibility pods as priority seating', () => {
    expect(isPriorityTable(table({ tableType: 'wheelchair-pod' }))).toBe(true);
    expect(isPriorityTable(table({ tableType: 'standard' }))).toBe(false);
  });

  it('summarises the room', () => {
    const tables = [
      table({ id: 'a', seats: 8, dhhGuestCount: 4 }),
      table({ id: 'b', x: 600, centerpieceHeightInches: 14 }),
    ];
    expect(summarizeRoom(tables)).toMatchObject({ totalSeats: 16, dhhSeats: 4, obstructedCount: 1, clearRate: 50 });
    expect(summarizeRoom([]).clearRate).toBe(0);
  });
});
