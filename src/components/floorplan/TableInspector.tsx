import type { SightlineTable } from '../../types';
import {
  CENTERPIECE_MAX_INCHES,
  isPriorityTable,
  type RoomSummary,
  type SightlineAnalysis,
} from '../../utils/sightline';

interface TableInspectorProps {
  table: SightlineTable;
  analysis: SightlineAnalysis;
  room: RoomSummary;
  canDelete: boolean;
  onUpdate: (patch: Partial<SightlineTable>) => void;
  onDuplicate: () => void;
  onDelete: () => void;
}

const MIN_SEATS = 2;
const MAX_SEATS = 14;
const SHAPES: { value: SightlineTable['shape']; label: string }[] = [
  { value: 'crescent', label: '🌙 Crescent' },
  { value: 'u-shape', label: '⊓ U-Shape' },
  { value: 'radial', label: '⚪ Radial' },
];

const STATUS_CARD = {
  clear: { className: 'bg-emerald-950/50 border-emerald-600/60 text-emerald-200', label: '✓ PRIME SIGHTLINE' },
  fair: { className: 'bg-amber-950/50 border-amber-600/60 text-amber-200', label: '~ PERIPHERAL / FAR' },
  obstructed: { className: 'bg-rose-950/50 border-rose-600/60 text-rose-200', label: '✕ OBSTRUCTED' },
} as const;

/** Canvas units are 10px per foot. */
const feet = (px: number) => Math.round(px / 10);

export const TableInspector = ({
  table,
  analysis,
  room,
  canDelete,
  onUpdate,
  onDuplicate,
  onDelete,
}: TableInspectorProps) => {
  const priority = isPriorityTable(table);
  const card = STATUS_CARD[analysis.status];

  return (
    <div className="lg:col-span-4 bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-6">
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <div className="text-xs text-slate-400 font-medium">Table Audit Inspector</div>
          <div className="flex items-center gap-2">
            <h3 className="text-base font-bold text-white">{table.name}</h3>
            <span
              className={`text-[11px] font-mono px-2 py-0.5 rounded font-semibold border ${
                priority
                  ? 'bg-teal-500/20 text-teal-300 border-teal-500/40'
                  : 'bg-slate-800 text-slate-300 border-slate-700'
              }`}
            >
              {priority ? 'PRIORITY' : 'STANDARD'}
            </span>
          </div>
          <p className="text-xs text-slate-400">
            {table.seats} Seats · {table.dhhGuestCount} DHH Attendees
            {table.wheelchairSpots ? ` · ${table.wheelchairSpots} Wheelchair Bays` : ''}
          </p>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={onDuplicate}
            title="Duplicate table"
            aria-label={`Duplicate ${table.name}`}
            className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs transition-colors cursor-pointer"
          >
            <span aria-hidden="true">📋</span>
          </button>
          {canDelete && (
            <button
              onClick={onDelete}
              title="Delete table"
              aria-label={`Delete ${table.name}`}
              className="p-1.5 rounded bg-rose-950/60 hover:bg-rose-900/80 text-rose-300 border border-rose-800 text-xs transition-colors cursor-pointer"
            >
              <span aria-hidden="true">🗑️</span>
            </button>
          )}
        </div>
      </div>

      <div className={`p-3.5 rounded-lg border text-xs space-y-2 ${card.className}`}>
        <div className="font-semibold flex items-center justify-between">
          <span>Sightline Integrity:</span>
          <span className="font-mono uppercase font-bold tracking-wider">{card.label}</span>
        </div>
        <p className="text-[11px] leading-relaxed opacity-90">
          {analysis.obstructionReason || 'Direct, unobstructed sightline to the ASL interpreter dais and altar.'}
        </p>
        {analysis.blockedByTableId && (
          <div className="text-[11px] bg-rose-900/40 p-1.5 rounded font-mono">
            Recommendation: move {table.name} about 2 ft outward or into a front crescent tier.
          </div>
        )}
      </div>

      <div className="space-y-3 bg-slate-950/80 border border-slate-800 rounded-lg p-4">
        <div className="flex items-center justify-between text-xs">
          <label htmlFor="centerpiece-height" className="text-slate-300 font-medium">
            Floral Centerpiece Height:
          </label>
          <span
            className={`font-mono font-bold tabular-nums text-sm ${
              table.centerpieceHeightInches > CENTERPIECE_MAX_INCHES ? 'text-rose-400' : 'text-emerald-400'
            }`}
          >
            {table.centerpieceHeightInches}&quot;
          </span>
        </div>
        <input
          id="centerpiece-height"
          type="range"
          min="4"
          max="16"
          step="0.5"
          value={table.centerpieceHeightInches}
          onChange={(e) => onUpdate({ centerpieceHeightInches: Number(e.target.value) })}
          className="w-full accent-teal-400 cursor-pointer"
        />
        <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono">
          <span>4&quot; (Low Compliant)</span>
          <span>{CENTERPIECE_MAX_INCHES}&quot; (Safe Limit)</span>
          <span>16&quot; (Blocking)</span>
        </div>
        <p className="text-[11px] text-slate-400 leading-relaxed border-t border-slate-800 pt-2">
          <span className="font-semibold text-slate-300">DeafSpace Principle:</span> Eye lines across a standard
          60&quot; table sit 10–12&quot; above the tabletop. Any centerpiece over {CENTERPIECE_MAX_INCHES}&quot; breaks
          sign visibility.
        </p>
      </div>

      <fieldset className="space-y-2">
        <legend className="text-xs font-medium text-slate-300">Table Geometry Type</legend>
        <div className="grid grid-cols-3 gap-2">
          {SHAPES.map(({ value, label }) => (
            <button
              key={value}
              onClick={() => onUpdate({ shape: value })}
              aria-pressed={table.shape === value}
              className={`px-2 py-1.5 text-xs font-medium rounded border transition-colors cursor-pointer ${
                table.shape === value
                  ? 'bg-teal-500/20 border-teal-500 text-teal-200'
                  : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </fieldset>

      <div className="grid grid-cols-2 gap-3 text-xs">
        <div className="space-y-1">
          <label htmlFor="table-seats" className="text-slate-400">
            Total Seats:
          </label>
          <input
            id="table-seats"
            type="number"
            min={MIN_SEATS}
            max={MAX_SEATS}
            value={table.seats}
            onChange={(e) => {
              const seats = Math.min(MAX_SEATS, Math.max(MIN_SEATS, Number.parseInt(e.target.value, 10) || MIN_SEATS));
              onUpdate({ seats, dhhGuestCount: Math.min(table.dhhGuestCount, seats) });
            }}
            className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-white font-mono"
          />
        </div>
        <div className="space-y-1">
          <label htmlFor="table-dhh" className="text-slate-400">
            DHH Attendees:
          </label>
          <input
            id="table-dhh"
            type="number"
            min="0"
            max={table.seats}
            value={table.dhhGuestCount}
            onChange={(e) =>
              onUpdate({ dhhGuestCount: Math.min(table.seats, Math.max(0, Number.parseInt(e.target.value, 10) || 0)) })
            }
            className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-teal-400 font-mono"
          />
        </div>
      </div>

      <dl className="space-y-1.5 bg-slate-950 border border-slate-800 rounded p-2.5 font-mono text-[11px] text-slate-300">
        <div className="text-slate-400 font-medium font-sans text-xs pb-1">Computed Sightline Vectors</div>
        <div className="flex justify-between">
          <dt>To ASL Dais:</dt>
          <dd className="text-emerald-400">
            {feet(analysis.distanceToInterpreter)} ft · {analysis.angleToInterpreter}°
          </dd>
        </div>
        <div className="flex justify-between">
          <dt>To Primary CART:</dt>
          <dd className="text-sky-400">{feet(analysis.distanceToCart)} ft</dd>
        </div>
        <div className="flex justify-between">
          <dt>To Ceremony Altar:</dt>
          <dd className="text-slate-400">{feet(analysis.distanceToSpeaker)} ft</dd>
        </div>
      </dl>

      <div className="bg-slate-950 border border-slate-800 rounded-lg p-3 text-xs space-y-2">
        <div className="text-slate-400 font-medium">Room Accessibility Scorecard</div>
        <div className="grid grid-cols-2 gap-2 text-[11px]">
          <div className="p-2 rounded bg-slate-900 border border-slate-800">
            <div className="text-slate-400">Clear Sightline Ratio</div>
            <div className="font-mono text-base font-bold text-emerald-400">{room.clearRate}%</div>
          </div>
          <div className="p-2 rounded bg-slate-900 border border-slate-800">
            <div className="text-slate-400">DHH Capacity</div>
            <div className="font-mono text-base font-bold text-teal-400">
              {room.dhhSeats} / {room.totalSeats}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
