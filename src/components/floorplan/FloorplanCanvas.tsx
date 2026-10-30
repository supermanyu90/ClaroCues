import { useRef, useState, type KeyboardEvent, type PointerEvent } from 'react';
import type { SightlineTable } from '../../types';
import { STATUS_COLOR, STATUS_TEXT, seatingIcon, shortTableName } from '../../utils/floorplanLayout';
import {
  CENTERPIECE_MAX_INCHES,
  VENUE_ANCHORS,
  analyzeTableSightline,
  clampToCanvas,
  isPriorityTable,
  nearestCartScreen,
  type Point,
  type SightlineAnalysis,
} from '../../utils/sightline';
import type { FloorplanFilterType } from '../FloorplanLegend';

export interface CanvasViewOptions {
  showRays: boolean;
  showAllRays: boolean;
  showSigningCone: boolean;
  showWheelchairClearance: boolean;
}

interface FloorplanCanvasProps {
  tables: SightlineTable[];
  analyses: Map<string, SightlineAnalysis>;
  selectedId: string;
  view: CanvasViewOptions;
  filter: FloorplanFilterType;
  onSelect: (id: string) => void;
  onChangeTables: (tables: SightlineTable[]) => void;
  /** Screen-reader announcement after a keyboard move. */
  onAnnounce: (message: string) => void;
}

/** Arrow keys move 10px (≈1 ft); Shift moves 40px. */
const KEY_STEP = 10;
const KEY_STEP_LARGE = 40;
const ARROW_DELTAS: Record<string, Point> = {
  ArrowUp: { x: 0, y: -1 },
  ArrowDown: { x: 0, y: 1 },
  ArrowLeft: { x: -1, y: 0 },
  ArrowRight: { x: 1, y: 0 },
};

interface DragState {
  tableId: string;
  offset: Point;
}

export const FloorplanCanvas = ({
  tables,
  analyses,
  selectedId,
  view,
  filter,
  onSelect,
  onChangeTables,
  onAnnounce,
}: FloorplanCanvasProps) => {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [drag, setDrag] = useState<DragState | null>(null);

  const toSvgPoint = (e: PointerEvent): Point | null => {
    const svg = svgRef.current;
    const ctm = svg?.getScreenCTM();
    if (!svg || !ctm) return null;
    const point = svg.createSVGPoint();
    point.x = e.clientX;
    point.y = e.clientY;
    const { x, y } = point.matrixTransform(ctm.inverse());
    return { x, y };
  };

  const moveTable = (id: string, to: Point) => {
    const next = clampToCanvas(to);
    const updated = tables.map((t) => (t.id === id ? { ...t, ...next } : t));
    onChangeTables(updated);
    return { next, updated };
  };

  const startDrag = (e: PointerEvent<SVGGElement>, table: SightlineTable) => {
    e.stopPropagation();
    onSelect(table.id);
    const point = toSvgPoint(e);
    if (!point) return;
    setDrag({ tableId: table.id, offset: { x: point.x - table.x, y: point.y - table.y } });
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const continueDrag = (e: PointerEvent<SVGSVGElement>) => {
    if (!drag) return;
    const point = toSvgPoint(e);
    if (point) moveTable(drag.tableId, { x: point.x - drag.offset.x, y: point.y - drag.offset.y });
  };

  const handleKeyDown = (e: KeyboardEvent, table: SightlineTable) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onSelect(table.id);
      return;
    }
    const direction = ARROW_DELTAS[e.key];
    if (!direction) return;
    e.preventDefault();
    onSelect(table.id);
    const step = e.shiftKey ? KEY_STEP_LARGE : KEY_STEP;
    const { next, updated } = moveTable(table.id, { x: table.x + direction.x * step, y: table.y + direction.y * step });
    const status = analyzeTableSightline({ ...table, ...next }, updated).status;
    onAnnounce(`${shortTableName(table)} moved to ${next.x}, ${next.y}: ${STATUS_TEXT[status]}`);
  };

  const isDimmed = (table: SightlineTable, analysis: SightlineAnalysis) => {
    const priority = isPriorityTable(table);
    return (
      (filter === 'priority' && !priority) ||
      (filter === 'standard' && priority) ||
      (filter === 'obstructed' && analysis.status !== 'obstructed')
    );
  };

  const analysisOf = (table: SightlineTable) => analyses.get(table.id) ?? analyzeTableSightline(table, tables);
  const rayTables = view.showRays ? tables.filter((t) => view.showAllRays || t.id === selectedId) : [];
  const dragged = drag && tables.find((t) => t.id === drag.tableId);

  return (
    <div className="relative w-full aspect-[16/10] bg-slate-950 border border-slate-800 rounded-lg overflow-hidden select-none">
      <svg
        ref={svgRef}
        viewBox="0 0 800 500"
        role="group"
        aria-label="Venue floorplan. Tab to a table, then use arrow keys to move it; hold Shift for larger steps."
        className="w-full h-full cursor-crosshair"
        onPointerMove={continueDrag}
        onPointerUp={() => setDrag(null)}
        onPointerCancel={() => setDrag(null)}
      >
        <VenueBackdrop showSigningCone={view.showSigningCone} />
        {rayTables.map((table) => (
          <SightlineRays
            key={`ray-${table.id}`}
            table={table}
            analysis={analysisOf(table)}
            isSelected={table.id === selectedId}
          />
        ))}
        {tables.map((table) => {
          const analysis = analysisOf(table);
          return (
            <TableMarker
              key={table.id}
              table={table}
              analysis={analysis}
              isSelected={table.id === selectedId}
              isDragging={drag?.tableId === table.id}
              isDimmed={isDimmed(table, analysis)}
              showWheelchairClearance={view.showWheelchairClearance}
              onPointerDown={(e) => startDrag(e, table)}
              onKeyDown={(e) => handleKeyDown(e, table)}
              onFocus={() => onSelect(table.id)}
            />
          );
        })}
      </svg>

      {dragged && (
        <div className="absolute top-3 left-3 bg-teal-500/90 text-slate-950 font-mono text-xs px-2.5 py-1 rounded shadow-lg font-bold">
          Dragging {dragged.name} · ({dragged.x}, {dragged.y})
        </div>
      )}
    </div>
  );
};

/** Static venue features: grid, stage, caption screens, interpreter dais, altar and dance floor. */
const VenueBackdrop = ({ showSigningCone }: { showSigningCone: boolean }) => {
  const { interpreter, speaker, leftCart, rightCart, danceFloor } = VENUE_ANCHORS;
  return (
    <>
      <defs>
        <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
          <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#1e293b" strokeWidth="0.5" />
        </pattern>
        <radialGradient id="aslConeGrad" cx={interpreter.x} cy={interpreter.y} r="380" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#14b8a6" stopOpacity="0.28" />
          <stop offset="60%" stopColor="#0d9488" stopOpacity="0.12" />
          <stop offset="100%" stopColor="#0f766e" stopOpacity="0.0" />
        </radialGradient>
      </defs>
      <rect width="800" height="500" fill="url(#grid)" />

      {/* DeafSpace ~70° visual corridor from the interpreter */}
      {showSigningCone && (
        <path
          d={`M ${interpreter.x} ${interpreter.y} L 40 450 L 520 450 Z`}
          fill="url(#aslConeGrad)"
          stroke="#14b8a6"
          strokeWidth="0.75"
          strokeDasharray="4 4"
          opacity="0.85"
        />
      )}

      <rect x="50" y="16" width="700" height="68" rx="8" fill="#0f172a" stroke="#334155" strokeWidth="1.2" />
      <text x="400" y="34" textAnchor="middle" fill="#94a3b8" fontSize="10" fontWeight="700" letterSpacing="1.5">
        STAGE & HIGH-CONTRAST BACKDROP
      </text>

      {[leftCart, rightCart].map((screen, i) => (
        <g key={screen.label}>
          <rect
            x={screen.x - 32}
            y={screen.y - 12}
            width="64"
            height="24"
            rx="4"
            fill="#0369a1"
            stroke="#38bdf8"
            strokeWidth="1.5"
          />
          <text x={screen.x} y={screen.y + 4} textAnchor="middle" fill="#ffffff" fontSize="9" fontWeight="bold">
            CART {i + 1} (75&quot;)
          </text>
        </g>
      ))}

      <rect
        x={interpreter.x - 50}
        y={interpreter.y - 16}
        width="100"
        height="32"
        rx="5"
        fill="#047857"
        stroke="#34d399"
        strokeWidth="2"
      />
      <text x={interpreter.x} y={interpreter.y + 4} textAnchor="middle" fill="#ffffff" fontSize="10" fontWeight="bold">
        ASL INTERPRETER DAIS
      </text>
      <circle cx={interpreter.x} cy={interpreter.y - 4} r="3" fill="#6ee7b7" />

      <circle cx={speaker.x} cy={speaker.y + 8} r="15" fill="#334155" stroke="#94a3b8" strokeWidth="1.5" />
      <text x={speaker.x} y={speaker.y + 12} textAnchor="middle" fill="#f8fafc" fontSize="9" fontWeight="bold">
        ALTAR
      </text>

      <rect
        x={danceFloor.x - 70}
        y={danceFloor.y - 45}
        width="140"
        height="90"
        rx="6"
        fill="#431407"
        stroke="#f97316"
        strokeWidth="1.5"
        strokeDasharray="4 2"
        opacity="0.85"
      />
      <text x={danceFloor.x} y={danceFloor.y - 6} textAnchor="middle" fill="#fb923c" fontSize="10" fontWeight="bold">
        SENSORY FLOOR
      </text>
      <text x={danceFloor.x} y={danceFloor.y + 10} textAnchor="middle" fill="#fed7aa" fontSize="8">
        Sound-to-Light & Haptic Zone
      </text>
    </>
  );
};

const RAY_DASH = { clear: 'none', fair: '6 3', obstructed: '4 3' } as const;

/** Ray to the interpreter, plus rays to the altar and nearest caption screen for the selected table. */
const SightlineRays = ({
  table,
  analysis,
  isSelected,
}: {
  table: SightlineTable;
  analysis: SightlineAnalysis;
  isSelected: boolean;
}) => {
  const { interpreter, speaker } = VENUE_ANCHORS;
  const cart = nearestCartScreen(table);
  return (
    <g>
      <line
        x1={table.x}
        y1={table.y}
        x2={interpreter.x}
        y2={interpreter.y + 10}
        stroke={STATUS_COLOR[analysis.status]}
        strokeWidth={isSelected ? 2.5 : 1.2}
        strokeDasharray={RAY_DASH[analysis.status]}
        opacity={isSelected ? 0.95 : 0.45}
      />
      {isSelected && (
        <>
          <line
            x1={table.x}
            y1={table.y}
            x2={speaker.x}
            y2={speaker.y + 15}
            stroke="#94a3b8"
            strokeWidth="1.2"
            strokeDasharray="3 3"
            opacity="0.6"
          />
          <line
            x1={table.x}
            y1={table.y}
            x2={cart.x}
            y2={cart.y + 10}
            stroke="#38bdf8"
            strokeWidth="1.5"
            strokeDasharray="4 2"
            opacity="0.8"
          />
        </>
      )}
    </g>
  );
};

interface TableMarkerProps {
  table: SightlineTable;
  analysis: SightlineAnalysis;
  isSelected: boolean;
  isDragging: boolean;
  isDimmed: boolean;
  showWheelchairClearance: boolean;
  onPointerDown: (e: PointerEvent<SVGGElement>) => void;
  onKeyDown: (e: KeyboardEvent) => void;
  onFocus: () => void;
}

const STATUS_GLYPH = { clear: '✓', fair: '~', obstructed: '✕' } as const;

/** One table: a focusable, draggable SVG group with shape, status halo, centerpiece dot and labels. */
const TableMarker = ({
  table,
  analysis,
  isSelected,
  isDragging,
  isDimmed,
  showWheelchairClearance,
  onPointerDown,
  onKeyDown,
  onFocus,
}: TableMarkerProps) => {
  const { x, y } = table;
  const priority = isPriorityTable(table);
  const statusColor = STATUS_COLOR[analysis.status];
  const fill = isSelected ? '#134e4a' : analysis.status === 'obstructed' ? '#450a0a' : priority ? '#064e3b' : '#1e293b';
  const outline = { fill, stroke: priority ? '#2dd4bf' : '#64748b', strokeWidth: priority ? 2 : 1.5 };
  const label =
    `${table.name}, ${table.seats} seats, ${table.dhhGuestCount} Deaf or Hard-of-Hearing guests, ${STATUS_TEXT[analysis.status]}` +
    `${analysis.obstructionReason ? `: ${analysis.obstructionReason}` : ''}. Arrow keys move the table.`;

  return (
    <g
      role="button"
      tabIndex={0}
      aria-pressed={isSelected}
      aria-label={label}
      className="cursor-grab active:cursor-grabbing transition-opacity duration-300 focus:outline-none [&:focus-visible>.focus-ring]:opacity-100"
      opacity={isDimmed ? 0.22 : 1}
      onPointerDown={onPointerDown}
      onKeyDown={onKeyDown}
      onFocus={onFocus}
    >
      <circle className="focus-ring" cx={x} cy={y} r="40" fill="none" stroke="#f8fafc" strokeWidth="2" opacity="0" />
      {/* ADA 60" (5 ft) turning circle */}
      {showWheelchairClearance && (table.wheelchairSpots || table.tableType === 'wheelchair-pod') && (
        <circle
          cx={x}
          cy={y}
          r="45"
          fill="#0284c7"
          fillOpacity="0.08"
          stroke="#0284c7"
          strokeWidth="1"
          strokeDasharray="3 3"
        />
      )}
      {isSelected && (
        <circle
          cx={x}
          cy={y}
          r="36"
          fill="none"
          stroke={statusColor}
          strokeWidth="2.5"
          strokeDasharray={isDragging ? '2 2' : '4 2'}
        />
      )}
      <circle
        cx={x}
        cy={y}
        r="27"
        fill="none"
        stroke={statusColor}
        strokeWidth={isSelected ? 2 : 1.5}
        opacity={isSelected ? 1 : 0.8}
      />

      {table.shape === 'crescent' ? (
        <path d={`M ${x - 22} ${y - 8} A 24 24 0 1 0 ${x + 22} ${y - 8} Z`} {...outline} />
      ) : table.shape === 'u-shape' ? (
        <rect x={x - 24} y={y - 14} width="48" height="28" rx="5" {...outline} />
      ) : (
        <circle cx={x} cy={y} r="20" {...outline} />
      )}

      {/* Centerpiece: red when it breaks the eye-level cap */}
      <circle
        cx={x}
        cy={y}
        r={Math.min(9, Math.max(3, table.centerpieceHeightInches / 1.6))}
        fill={table.centerpieceHeightInches > CENTERPIECE_MAX_INCHES ? '#ef4444' : '#10b981'}
      />
      <text x={x - 11} y={y + 4} fill={priority ? '#38bdf8' : '#94a3b8'} fontSize="10" fontWeight="bold">
        {seatingIcon(table)}
      </text>

      <g transform={`translate(${x + 12}, ${y - 20})`}>
        <circle r="7" fill={statusColor} stroke="#0f172a" strokeWidth="1.5" />
        <text y="2.5" textAnchor="middle" fill="#ffffff" fontSize="8" fontWeight="bold">
          {STATUS_GLYPH[analysis.status]}
        </text>
      </g>

      <text
        x={x}
        y={y + 36}
        textAnchor="middle"
        fill={isSelected ? '#2dd4bf' : '#cbd5e1'}
        fontSize="9"
        fontWeight="600"
      >
        {shortTableName(table)}
      </text>
      <text x={x} y={y + 46} textAnchor="middle" fill={priority ? '#2dd4bf' : '#94a3b8'} fontSize="7" fontWeight="bold">
        {priority ? 'PRIORITY SIGHTLINE' : 'STANDARD GUEST'}
      </text>
    </g>
  );
};
