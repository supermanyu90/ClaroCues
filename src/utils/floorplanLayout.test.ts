import { describe, expect, it } from 'vitest';
import { INITIAL_TABLES } from '../data/initialBlueprint';
import {
  SEATING_PRESETS,
  autoArrangeRadial,
  createPresetTable,
  duplicateTable,
  seatingIcon,
  shortTableName,
} from './floorplanLayout';
import { CANVAS_BOUNDS, CENTERPIECE_MAX_INCHES, summarizeRoom } from './sightline';

describe('createPresetTable', () => {
  it.each(SEATING_PRESETS.map((p) => p.kind))('builds a %s table inside the room', (kind) => {
    const table = createPresetTable(kind, 4);
    expect(table.tableType).toBe(kind);
    expect(table.name).toMatch(/^Table 5 \(/);
    expect(table.x).toBeGreaterThanOrEqual(CANVAS_BOUNDS.minX);
    expect(table.x).toBeLessThanOrEqual(CANVAS_BOUNDS.maxX);
    expect(table.y).toBeGreaterThanOrEqual(CANVAS_BOUNDS.minY);
    expect(table.y).toBeLessThanOrEqual(CANVAS_BOUNDS.maxY);
    expect(table.dhhGuestCount).toBeLessThanOrEqual(table.seats);
    expect(table.centerpieceHeightInches).toBeLessThanOrEqual(CENTERPIECE_MAX_INCHES);
  });

  it('staggers repeated tables so they do not stack', () => {
    const a = createPresetTable('dhh-crescent', 0);
    const b = createPresetTable('dhh-crescent', 1);
    expect([a.x, a.y]).not.toEqual([b.x, b.y]);
    expect(a.id).not.toBe(b.id);
  });

  it('gives wheelchair pods companion bays', () => {
    expect(createPresetTable('wheelchair-pod', 0).wheelchairSpots).toBe(2);
  });
});

describe('autoArrangeRadial', () => {
  const tables = Array.from({ length: 9 }, (_, i) => createPresetTable('standard', i)).map((t, i) => ({
    ...t,
    id: `t${i}`,
    centerpieceHeightInches: 14,
  }));

  it('places three tables per tier, each tier further from the dais', () => {
    const arranged = autoArrangeRadial(tables);
    const distance = (i: number) => Math.hypot(arranged[i].x - 330, arranged[i].y - 50);
    expect(distance(0)).toBeLessThan(distance(3));
    expect(distance(3)).toBeLessThan(distance(6));
  });

  it('trims tall centerpieces and keeps tables in bounds', () => {
    for (const t of autoArrangeRadial(tables)) {
      expect(t.centerpieceHeightInches).toBeLessThanOrEqual(8);
      expect(t.x).toBeGreaterThanOrEqual(70);
      expect(t.y).toBeLessThanOrEqual(440);
    }
  });

  it('improves sightlines for the sample layout with tall centerpieces', () => {
    const blocked = INITIAL_TABLES.map((t) => ({ ...t, centerpieceHeightInches: 12 }));
    expect(summarizeRoom(autoArrangeRadial(blocked)).clearRate).toBeGreaterThan(summarizeRoom(blocked).clearRate);
  });

  it('does not mutate its input', () => {
    const copy = structuredClone(tables);
    autoArrangeRadial(tables);
    expect(tables).toEqual(copy);
  });
});

describe('helpers', () => {
  it('duplicates with a new id and an offset', () => {
    const original = createPresetTable('cart-pod', 0);
    const copy = duplicateTable(original);
    expect(copy.id).not.toBe(original.id);
    expect(copy.name).toBe(`${original.name} (Copy)`);
    expect(copy.x).toBe(original.x + 35);
  });

  it('picks an icon by seating type', () => {
    expect(seatingIcon(createPresetTable('wheelchair-pod', 0))).toBe('♿');
    expect(seatingIcon(createPresetTable('standard', 0))).toBe('⚪');
  });

  it('strips the type suffix from names', () => {
    expect(shortTableName(createPresetTable('cart-pod', 2))).toBe('Table 3');
  });
});
