import { useMemo, useState } from 'react';
import type { SightlineTable } from '../types';
import { STATUS_TEXT, autoArrangeRadial, createPresetTable, duplicateTable } from '../utils/floorplanLayout';
import { analyzeTableSightline, summarizeRoom, type SightlineAnalysis } from '../utils/sightline';
import { FloorplanLegend, type FloorplanFilterType } from './FloorplanLegend';
import { FloorplanCanvas, type CanvasViewOptions } from './floorplan/FloorplanCanvas';
import { SeatingPalette } from './floorplan/SeatingPalette';
import { TableInspector } from './floorplan/TableInspector';

interface FloorplanArchitectProps {
  tables: SightlineTable[];
  onChangeTables: (tables: SightlineTable[]) => void;
}

/** One-click policy: a little under the 9.5" cap to leave margin for arrangements that settle taller. */
const CENTERPIECE_POLICY_INCHES = 8.5;

const VIEW_TOGGLES: { key: keyof CanvasViewOptions; label: string }[] = [
  { key: 'showRays', label: 'Sightline Rays' },
  { key: 'showAllRays', label: 'All Rays' },
  { key: 'showSigningCone', label: 'ASL Cone' },
  { key: 'showWheelchairClearance', label: '60" Turning Circles' },
];

export const FloorplanArchitect = ({ tables, onChangeTables }: FloorplanArchitectProps) => {
  const [selectedId, setSelectedId] = useState(tables[0]?.id ?? '');
  const [filter, setFilter] = useState<FloorplanFilterType>('all');
  const [announcement, setAnnouncement] = useState('');
  const [view, setView] = useState<CanvasViewOptions>({
    showRays: true,
    showAllRays: false,
    showSigningCone: true,
    showWheelchairClearance: true,
  });

  // Each analysis scans every other table, so compute once per layout change.
  const analyses = useMemo(
    () => new Map<string, SightlineAnalysis>(tables.map((t) => [t.id, analyzeTableSightline(t, tables)])),
    [tables]
  );
  const room = useMemo(() => summarizeRoom(tables), [tables]);

  const selected = tables.find((t) => t.id === selectedId) ?? tables[0];
  if (!selected) return null;
  const selectedAnalysis = analyses.get(selected.id) ?? analyzeTableSightline(selected, tables);

  const updateSelected = (patch: Partial<SightlineTable>) =>
    onChangeTables(tables.map((t) => (t.id === selected.id ? { ...t, ...patch } : t)));

  const addTable = (table: SightlineTable) => {
    onChangeTables([...tables, table]);
    setSelectedId(table.id);
  };

  const deleteSelected = () => {
    const remaining = tables.filter((t) => t.id !== selected.id);
    onChangeTables(remaining);
    setSelectedId(remaining[0]?.id ?? '');
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col lg:flex-row gap-6 items-start justify-between bg-slate-900 border border-slate-800 rounded-xl p-6">
        <div className="space-y-2 max-w-2xl">
          <h2 className="text-xl font-bold text-white tracking-tight">Sightline & Accessibility Seating Architect</h2>
          <p className="text-sm text-slate-300 leading-relaxed">
            Position seating on the venue floorplan by dragging or with the arrow keys. Every table is checked live for
            a clear line of sight to the ASL interpreter dais, the altar and the caption screens, including obstruction
            by other tables and centerpieces taller than 9.5&quot;.
          </p>
        </div>

        <div className="bg-slate-950/70 border border-slate-800 rounded-lg p-3 text-xs space-y-2.5 shrink-0 min-w-[240px]">
          <button
            onClick={() =>
              onChangeTables(tables.map((t) => ({ ...t, centerpieceHeightInches: CENTERPIECE_POLICY_INCHES })))
            }
            className="w-full px-3 py-1.5 font-medium text-slate-950 bg-teal-400 hover:bg-teal-300 rounded transition-colors cursor-pointer"
          >
            Set all centerpieces to {CENTERPIECE_POLICY_INCHES}&quot;
          </button>
          <button
            onClick={() => onChangeTables(autoArrangeRadial(tables))}
            className="w-full px-3 py-1.5 font-medium text-teal-200 bg-teal-950 hover:bg-teal-900 border border-teal-700/60 rounded transition-colors cursor-pointer"
          >
            Auto-arrange in a radial arc
          </button>
        </div>
      </div>

      <SeatingPalette
        tableCount={tables.length}
        priorityCount={room.priorityCount}
        onAdd={(kind) => addTable(createPresetTable(kind, tables.length))}
      />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-8 bg-slate-900 border border-slate-800 rounded-xl p-5 flex flex-col space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h3 className="text-base font-semibold text-white">Venue Floorplan</h3>
            <fieldset className="flex flex-wrap items-center gap-3 text-xs">
              <legend className="sr-only">Floorplan overlays</legend>
              {VIEW_TOGGLES.map(({ key, label }) => (
                <label key={key} className="flex items-center gap-1.5 text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={view[key]}
                    onChange={(e) => setView((v) => ({ ...v, [key]: e.target.checked }))}
                    className="rounded text-teal-500 bg-slate-950 border-slate-700"
                  />
                  {label}
                </label>
              ))}
            </fieldset>
          </div>

          <FloorplanCanvas
            tables={tables}
            analyses={analyses}
            selectedId={selected.id}
            view={view}
            filter={filter}
            onSelect={setSelectedId}
            onChangeTables={onChangeTables}
            onAnnounce={setAnnouncement}
          />

          <p aria-live="polite" className="sr-only">
            {announcement}
          </p>
          <ul className="sr-only" aria-label="Table sightline summary">
            {tables.map((t) => {
              const analysis = analyses.get(t.id);
              return (
                <li key={t.id}>
                  {t.name}: {analysis && STATUS_TEXT[analysis.status]}
                  {analysis?.obstructionReason ? `, ${analysis.obstructionReason}` : ''}
                </li>
              );
            })}
          </ul>

          <FloorplanLegend
            priorityCount={room.priorityCount}
            standardCount={tables.length - room.priorityCount}
            obstructedCount={room.obstructedCount}
            totalSeats={room.totalSeats}
            dhhSeats={room.dhhSeats}
            activeFilter={filter}
            onFilterChange={setFilter}
            selectedTableName={selected.name}
            selectedTableCoords={{ x: selected.x, y: selected.y }}
          />

          <p className="text-[11px] text-slate-400 flex items-center justify-between px-1">
            <span>Filter by seating type above to inspect specific sightlines.</span>
            <span className="font-mono text-teal-400">{room.clearRate}% of tables have a clear sightline</span>
          </p>
        </div>

        <TableInspector
          table={selected}
          analysis={selectedAnalysis}
          room={room}
          canDelete={tables.length > 1}
          onUpdate={updateSelected}
          onDuplicate={() => addTable(duplicateTable(selected))}
          onDelete={deleteSelected}
        />
      </div>
    </div>
  );
};
