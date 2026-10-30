import React, { useMemo, useRef, useState } from 'react';
import { SightlineTable } from '../types';
import { FloorplanLegend, FloorplanFilterType } from './FloorplanLegend';
import {
  CENTERPIECE_MAX_INCHES,
  VENUE_ANCHORS,
  analyzeTableSightline,
  clampToCanvas,
  isPriorityTable,
  nearestCartScreen,
  summarizeRoom,
  type SightlineAnalysis,
} from '../utils/sightline';

interface DragState {
  tableId: string;
  offsetX: number;
  offsetY: number;
}

interface FloorplanArchitectProps {
  tables: SightlineTable[];
  onChangeTables: (tables: SightlineTable[]) => void;
}

const STATUS_TEXT = { clear: 'clear sightline', fair: 'partial sightline', obstructed: 'obstructed sightline' } as const;

export const FloorplanArchitect: React.FC<FloorplanArchitectProps> = ({ tables, onChangeTables }) => {
  const [selectedTableId, setSelectedTableId] = useState<string>(tables[0]?.id ?? '');
  const [showRays, setShowRays] = useState<boolean>(true);
  const [showAllRays, setShowAllRays] = useState<boolean>(false);
  const [showSigningCone, setShowSigningCone] = useState<boolean>(true);
  const [showWheelchairClearance, setShowWheelchairClearance] = useState<boolean>(true);
  const globalCenterpieceLimit = 8.5;
  const [activeFilter, setActiveFilter] = useState<FloorplanFilterType>('all');
  const [announcement, setAnnouncement] = useState('');

  const svgRef = useRef<SVGSVGElement | null>(null);
  const [dragState, setDragState] = useState<DragState | null>(null);

  const { interpreter: interpreterStage, speaker: speakerPodium, leftCart: leftCartScreen, rightCart: rightCartScreen, danceFloor: sensoryDanceFloor } =
    VENUE_ANCHORS;

  const setTables = (updater: SightlineTable[] | ((prev: SightlineTable[]) => SightlineTable[])) =>
    onChangeTables(typeof updater === 'function' ? updater(tables) : updater);

  // Each analysis scans every other table, so compute once per layout change, not per render pass.
  const analyses = useMemo(
    () => new Map<string, SightlineAnalysis>(tables.map((t) => [t.id, analyzeTableSightline(t, tables)])),
    [tables]
  );
  const analysisFor = (tbl: SightlineTable) => analyses.get(tbl.id) ?? analyzeTableSightline(tbl, tables);

  const selectedTable = tables.find((t) => t.id === selectedTableId) || tables[0] || {
    id: 'tbl-1',
    name: 'Table 1',
    x: 200,
    y: 200,
    shape: 'crescent' as const,
    seats: 8,
    centerpieceHeightInches: 7,
    dhhGuestCount: 6,
  };

  const selectedAnalysis = analysisFor(selectedTable);

  // SVG coordinate converter for Pointer events
  const getSvgCoordinates = (e: React.PointerEvent<SVGSVGElement>): { x: number; y: number } | null => {
    const svg = svgRef.current;
    if (!svg) return null;
    const pt = svg.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;
    const ctm = svg.getScreenCTM();
    if (!ctm) return null;
    const transformed = pt.matrixTransform(ctm.inverse());
    return { x: transformed.x, y: transformed.y };
  };

  // Dragging event handlers
  const handlePointerDownTable = (e: React.PointerEvent, tableId: string) => {
    e.stopPropagation();
    setSelectedTableId(tableId);

    const tbl = tables.find((t) => t.id === tableId);
    if (!tbl) return;

    const coords = getSvgCoordinates(e as unknown as React.PointerEvent<SVGSVGElement>);
    if (!coords) return;

    setDragState({
      tableId,
      offsetX: coords.x - tbl.x,
      offsetY: coords.y - tbl.y,
    });

    (e.target as Element).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    if (!dragState) return;

    const coords = getSvgCoordinates(e);
    if (!coords) return;

    const { x, y } = clampToCanvas({ x: coords.x - dragState.offsetX, y: coords.y - dragState.offsetY });
    setTables((prev) => prev.map((t) => (t.id === dragState.tableId ? { ...t, x, y } : t)));
  };

  // Keyboard alternative to dragging: arrows move 10px (≈1ft), Shift+arrows move 40px.
  const handleTableKeyDown = (e: React.KeyboardEvent, tbl: SightlineTable) => {
    const step = e.shiftKey ? 40 : 10;
    const delta: Record<string, [number, number]> = {
      ArrowUp: [0, -step],
      ArrowDown: [0, step],
      ArrowLeft: [-step, 0],
      ArrowRight: [step, 0],
    };
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      setSelectedTableId(tbl.id);
      return;
    }
    const move = delta[e.key];
    if (!move) return;
    e.preventDefault();
    setSelectedTableId(tbl.id);
    const next = clampToCanvas({ x: tbl.x + move[0], y: tbl.y + move[1] });
    const updated = tables.map((t) => (t.id === tbl.id ? { ...t, ...next } : t));
    onChangeTables(updated);
    const status = analyzeTableSightline({ ...tbl, ...next }, updated).status;
    setAnnouncement(`${tbl.name.split('(')[0].trim()} moved to ${next.x}, ${next.y}: ${STATUS_TEXT[status]}`);
  };

  const handlePointerUp = () => {
    if (dragState) {
      setDragState(null);
    }
  };

  // Add new accessibility seating pod
  const addAccessibilityTable = (type: 'dhh-crescent' | 'wheelchair-pod' | 'cart-pod' | 'tactile-close' | 'standard') => {
    const nextNum = tables.length + 1;
    let newTable: SightlineTable;

    if (type === 'dhh-crescent') {
      newTable = {
        id: `tbl-${Date.now()}`,
        name: `Table ${nextNum} (DHH Priority Crescent)`,
        x: 230 + ((tables.length * 35) % 180),
        y: 160 + ((tables.length * 25) % 150),
        shape: 'crescent',
        seats: 8,
        centerpieceHeightInches: 6.5,
        dhhGuestCount: 8,
        tableType: 'dhh-crescent',
        notes: 'Zero blindspot crescent facing ASL dias',
      };
    } else if (type === 'wheelchair-pod') {
      newTable = {
        id: `tbl-${Date.now()}`,
        name: `Table ${nextNum} (Wheelchair Access Pod)`,
        x: 170 + ((tables.length * 30) % 220),
        y: 200 + ((tables.length * 20) % 140),
        shape: 'radial',
        seats: 6,
        centerpieceHeightInches: 5.5,
        dhhGuestCount: 4,
        tableType: 'wheelchair-pod',
        wheelchairSpots: 2,
        notes: '60" ADA turning corridor with companion seating',
      };
    } else if (type === 'cart-pod') {
      newTable = {
        id: `tbl-${Date.now()}`,
        name: `Table ${nextNum} (CART Caption Focus)`,
        x: 140 + ((tables.length * 40) % 200),
        y: 180 + ((tables.length * 30) % 150),
        shape: 'u-shape',
        seats: 8,
        centerpieceHeightInches: 7,
        dhhGuestCount: 6,
        tableType: 'cart-pod',
        notes: 'Direct perpendicular angle to 75" CART monitor',
      };
    } else if (type === 'tactile-close') {
      newTable = {
        id: `tbl-${Date.now()}`,
        name: `Table ${nextNum} (DeafBlind Frontline)`,
        x: 220,
        y: 125,
        shape: 'crescent',
        seats: 4,
        centerpieceHeightInches: 4,
        dhhGuestCount: 4,
        tableType: 'tactile-close',
        notes: 'Direct proximity for tactile/close-vision signing',
      };
    } else {
      newTable = {
        id: `tbl-${Date.now()}`,
        name: `Table ${nextNum} (Standard Radial)`,
        x: 520,
        y: 260,
        shape: 'radial',
        seats: 8,
        centerpieceHeightInches: 8,
        dhhGuestCount: 2,
        tableType: 'standard',
        notes: 'Standard round banquet table',
      };
    }

    setTables((prev) => [...prev, newTable]);
    setSelectedTableId(newTable.id);
  };

  // Auto-arrange tables into an optimized DeafSpace amphitheater radial arc
  const autoArrangeRadialSightlines = () => {
    const centerX = 330;
    const centerY = 50;

    const updated = tables.map((tbl, index) => {
      const isTier1 = index < 3;
      const isTier2 = index >= 3 && index < 6;

      let radius = 140;
      let angleDeg = -40 + index * 32;

      if (isTier1) {
        radius = 135;
        angleDeg = -35 + index * 35;
      } else if (isTier2) {
        radius = 220;
        const subIndex = index - 3;
        angleDeg = -45 + subIndex * 30;
      } else {
        radius = 305;
        const subIndex = index - 6;
        angleDeg = -50 + subIndex * 26;
      }

      const angleRad = (angleDeg * Math.PI) / 180;
      const newX = Math.round(centerX + Math.sin(angleRad) * radius);
      const newY = Math.round(centerY + Math.cos(angleRad) * radius);

      return {
        ...tbl,
        x: Math.max(70, Math.min(730, newX)),
        y: Math.max(120, Math.min(440, newY)),
        centerpieceHeightInches: Math.min(tbl.centerpieceHeightInches, 8.0),
      };
    });

    setTables(updated);
  };

  const updateSelectedTableHeight = (height: number) => {
    setTables((prev) =>
      prev.map((t) => (t.id === selectedTable.id ? { ...t, centerpieceHeightInches: height } : t))
    );
  };

  const updateTableShape = (shape: 'crescent' | 'u-shape' | 'radial') => {
    setTables((prev) =>
      prev.map((t) => (t.id === selectedTable.id ? { ...t, shape } : t))
    );
  };

  const updateTableSeats = (seats: number) => {
    setTables((prev) =>
      prev.map((t) => (t.id === selectedTable.id ? { ...t, seats } : t))
    );
  };

  const updateTableDhhCount = (dhhGuestCount: number) => {
    setTables((prev) =>
      prev.map((t) => (t.id === selectedTable.id ? { ...t, dhhGuestCount: Math.min(dhhGuestCount, t.seats) } : t))
    );
  };

  const deleteSelectedTable = () => {
    if (tables.length <= 1) return;
    const remaining = tables.filter((t) => t.id !== selectedTable.id);
    setTables(remaining);
    setSelectedTableId(remaining[0].id);
  };

  const duplicateSelectedTable = () => {
    const clone: SightlineTable = {
      ...selectedTable,
      id: `tbl-${Date.now()}`,
      name: `${selectedTable.name} (Copy)`,
      x: Math.min(720, selectedTable.x + 35),
      y: Math.min(430, selectedTable.y + 35),
    };
    setTables((prev) => [...prev, clone]);
    setSelectedTableId(clone.id);
  };

  const applyGlobalHeightPolicy = () => {
    setTables((prev) =>
      prev.map((t) => ({ ...t, centerpieceHeightInches: globalCenterpieceLimit }))
    );
  };

  const room = useMemo(() => summarizeRoom(tables), [tables]);
  const {
    totalSeats,
    dhhSeats: totalDhhGuests,
    clearCount: clearSightlineTables,
    obstructedCount: obstructedTablesCount,
    clearRate,
    priorityCount,
  } = room;
  const standardCount = tables.length - priorityCount;

  return (
    <div className="space-y-8">
      {/* Overview Banner */}
      <div className="flex flex-col lg:flex-row gap-6 items-start justify-between bg-slate-900 border border-slate-800 rounded-xl p-6">
        <div className="space-y-2 max-w-2xl">
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <span className="font-semibold text-teal-400">Interactive Drag & Drop Studio</span>
            <span aria-hidden="true">·</span>
            <span>DeafSpace Sightline Raycaster</span>
            <span aria-hidden="true">·</span>
            <span>Priority vs Standard Seating</span>
          </div>
          <h2 className="text-xl font-bold text-white tracking-tight">
            Sightline & Accessibility Seating Architect
          </h2>
          <p className="text-sm text-slate-300 leading-relaxed">
            Drag and position accessibility-focused seating anywhere on the venue floorplan. Real-time raycasting evaluates lines of sight to the elevated ASL Interpreter Dais, Main Altar Stage, and dual CART displays, automatically detecting table obstructions and centerpiece height violations (&gt;9.5").
          </p>
        </div>

        {/* Global Compliance & Auto-Arrange Actions */}
        <div className="bg-slate-950/70 border border-slate-800 rounded-lg p-3 text-xs space-y-2.5 shrink-0 min-w-[240px]">
          <div className="flex items-center justify-between gap-4">
            <span className="text-slate-400">Global Centerpiece Cap:</span>
            <span className="font-mono font-semibold text-teal-400 tabular-nums">
              &le; {globalCenterpieceLimit}"
            </span>
          </div>
          <button
            onClick={applyGlobalHeightPolicy}
            className="w-full px-3 py-1.5 text-xs font-medium text-slate-950 bg-teal-400 hover:bg-teal-300 rounded transition-colors cursor-pointer"
          >
            Enforce &le;{globalCenterpieceLimit}" Centerpieces
          </button>
          <button
            onClick={autoArrangeRadialSightlines}
            className="w-full px-3 py-1.5 text-xs font-medium text-teal-200 bg-teal-950 hover:bg-teal-900 border border-teal-700/60 rounded transition-colors cursor-pointer flex items-center justify-center gap-1.5"
          >
            <span>⚡ Auto-Arrange Radial Arc</span>
          </button>
        </div>
      </div>

      {/* Seating Palette: Drag / Click to add dedicated accessibility tables */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-3">
          <div>
            <span className="text-xs font-bold text-white uppercase tracking-wider">
              Add Accessibility-Focused Seating
            </span>
            <p className="text-[11px] text-slate-400">
              Click any blueprint to add tailored accessible tables directly into the layout.
            </p>
          </div>
          <span className="text-xs font-mono text-teal-400">
            {tables.length} Total Tables ({priorityCount} Priority · {standardCount} Standard)
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
          <button
            onClick={() => addAccessibilityTable('dhh-crescent')}
            className="group p-2.5 rounded-lg border border-teal-500/30 bg-teal-950/20 hover:bg-teal-900/40 text-left transition-all cursor-pointer flex flex-col justify-between"
          >
            <div className="flex items-center justify-between">
              <span aria-hidden="true" className="text-lg">🌙</span>
              <span className="text-[11px] font-mono px-1.5 py-0.5 rounded bg-teal-500/20 text-teal-300 font-semibold">
                + Add
              </span>
            </div>
            <div className="mt-2">
              <div className="text-xs font-bold text-teal-200 group-hover:text-teal-100">DHH Crescent</div>
              <div className="text-[11px] text-slate-400 leading-tight">Priority sightline open curve</div>
            </div>
          </button>

          <button
            onClick={() => addAccessibilityTable('wheelchair-pod')}
            className="group p-2.5 rounded-lg border border-sky-500/30 bg-sky-950/20 hover:bg-sky-900/40 text-left transition-all cursor-pointer flex flex-col justify-between"
          >
            <div className="flex items-center justify-between">
              <span aria-hidden="true" className="text-lg">♿</span>
              <span className="text-[11px] font-mono px-1.5 py-0.5 rounded bg-sky-500/20 text-sky-300 font-semibold">
                + Add
              </span>
            </div>
            <div className="mt-2">
              <div className="text-xs font-bold text-sky-200 group-hover:text-sky-100">Wheelchair Pod</div>
              <div className="text-[11px] text-slate-400 leading-tight">60" ADA aisle turning radius</div>
            </div>
          </button>

          <button
            onClick={() => addAccessibilityTable('cart-pod')}
            className="group p-2.5 rounded-lg border border-indigo-500/30 bg-indigo-950/20 hover:bg-indigo-900/40 text-left transition-all cursor-pointer flex flex-col justify-between"
          >
            <div className="flex items-center justify-between">
              <span aria-hidden="true" className="text-lg">📺</span>
              <span className="text-[11px] font-mono px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300 font-semibold">
                + Add
              </span>
            </div>
            <div className="mt-2">
              <div className="text-xs font-bold text-indigo-200 group-hover:text-indigo-100">CART View Pod</div>
              <div className="text-[11px] text-slate-400 leading-tight">Perpendicular to caption screen</div>
            </div>
          </button>

          <button
            onClick={() => addAccessibilityTable('tactile-close')}
            className="group p-2.5 rounded-lg border border-amber-500/30 bg-amber-950/20 hover:bg-amber-900/40 text-left transition-all cursor-pointer flex flex-col justify-between"
          >
            <div className="flex items-center justify-between">
              <span aria-hidden="true" className="text-lg">🤝</span>
              <span className="text-[11px] font-mono px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 font-semibold">
                + Add
              </span>
            </div>
            <div className="mt-2">
              <div className="text-xs font-bold text-amber-200 group-hover:text-amber-100">DeafBlind Front</div>
              <div className="text-[11px] text-slate-400 leading-tight">Tactile / Close-Vision zone</div>
            </div>
          </button>

          <button
            onClick={() => addAccessibilityTable('standard')}
            className="group p-2.5 rounded-lg border border-slate-700 bg-slate-950/60 hover:bg-slate-800 text-left transition-all cursor-pointer flex flex-col justify-between"
          >
            <div className="flex items-center justify-between">
              <span aria-hidden="true" className="text-lg">⚪</span>
              <span className="text-[11px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 font-semibold">
                + Add
              </span>
            </div>
            <div className="mt-2">
              <div className="text-xs font-bold text-slate-200 group-hover:text-white">Standard Radial</div>
              <div className="text-[11px] text-slate-400 leading-tight">Standard 8-person banquet</div>
            </div>
          </button>
        </div>
      </div>

      {/* Main Interactive Floorplan Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: 2D Interactive Venue Canvas & Legend Component (8 cols) */}
        <div className="lg:col-span-8 bg-slate-900 border border-slate-800 rounded-xl p-5 flex flex-col space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <h3 className="text-base font-semibold text-white">The Atrium Grand Pavilion Floorplan</h3>
              <span className="text-xs text-teal-400/90 font-mono bg-teal-950/60 border border-teal-800/60 px-2 py-0.5 rounded">
                Interactive Raycaster
              </span>
            </div>

            {/* View Toggles */}
            <div className="flex flex-wrap items-center gap-3 text-xs">
              <label className="flex items-center gap-1.5 text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showRays}
                  onChange={(e) => setShowRays(e.target.checked)}
                  className="rounded text-teal-500 bg-slate-950 border-slate-700"
                />
                Sightline Rays
              </label>

              <label className="flex items-center gap-1.5 text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showAllRays}
                  onChange={(e) => setShowAllRays(e.target.checked)}
                  className="rounded text-teal-500 bg-slate-950 border-slate-700"
                />
                All Rays
              </label>

              <label className="flex items-center gap-1.5 text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showSigningCone}
                  onChange={(e) => setShowSigningCone(e.target.checked)}
                  className="rounded text-teal-500 bg-slate-950 border-slate-700"
                />
                ASL Cone
              </label>

              <label className="flex items-center gap-1.5 text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showWheelchairClearance}
                  onChange={(e) => setShowWheelchairClearance(e.target.checked)}
                  className="rounded text-teal-500 bg-slate-950 border-slate-700"
                />
                60" Turning Circles
              </label>
            </div>
          </div>

          {/* SVG Floorplan Viewport */}
          <div className="relative w-full aspect-[16/10] bg-slate-950 border border-slate-800 rounded-lg overflow-hidden select-none">
            <svg
              ref={svgRef}
              viewBox="0 0 800 500"
              role="group"
              aria-label="Venue floorplan. Tab to a table, then use arrow keys to move it; hold Shift for larger steps."
              className="w-full h-full cursor-crosshair"
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerCancel={handlePointerUp}
            >
              <defs>
                {/* Architectural Grid */}
                <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                  <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#1e293b" strokeWidth="0.5" />
                </pattern>

                {/* ASL Interpreter Signing Cone Gradient */}
                <radialGradient id="aslConeGrad" cx="260" cy="55" r="380" gradientUnits="userSpaceOnUse">
                  <stop offset="0%" stopColor="#14b8a6" stopOpacity="0.28" />
                  <stop offset="60%" stopColor="#0d9488" stopOpacity="0.12" />
                  <stop offset="100%" stopColor="#0f766e" stopOpacity="0.0" />
                </radialGradient>
              </defs>

              {/* Floor background */}
              <rect width="800" height="500" fill="url(#grid)" />

              {/* ASL Interpreter Optimal Sightline Cone (DeafSpace 70° visual corridor) */}
              {showSigningCone && (
                <path
                  d="M 260 55 L 40 450 L 520 450 Z"
                  fill="url(#aslConeGrad)"
                  stroke="#14b8a6"
                  strokeWidth="0.75"
                  strokeDasharray="4 4"
                  opacity="0.85"
                />
              )}

              {/* Stage Perimeter (Top) */}
              <rect x="50" y="16" width="700" height="68" rx="8" fill="#0f172a" stroke="#334155" strokeWidth="1.2" />
              <text x="400" y="34" textAnchor="middle" fill="#94a3b8" fontSize="10" fontWeight="700" letterSpacing="1.5">
                STAGE & HIGH-CONTRAST BACKDROP
              </text>

              {/* Left CART Caption Display (75") */}
              <rect
                x={leftCartScreen.x - 32}
                y={leftCartScreen.y - 12}
                width="64"
                height="24"
                rx="4"
                fill="#0369a1"
                stroke="#38bdf8"
                strokeWidth="1.5"
              />
              <text x={leftCartScreen.x} y={leftCartScreen.y + 4} textAnchor="middle" fill="#ffffff" fontSize="9" fontWeight="bold">
                CART 1 (75")
              </text>

              {/* Right CART Caption Display (75") */}
              <rect
                x={rightCartScreen.x - 32}
                y={rightCartScreen.y - 12}
                width="64"
                height="24"
                rx="4"
                fill="#0369a1"
                stroke="#38bdf8"
                strokeWidth="1.5"
              />
              <text x={rightCartScreen.x} y={rightCartScreen.y + 4} textAnchor="middle" fill="#ffffff" fontSize="9" fontWeight="bold">
                CART 2 (75")
              </text>

              {/* ASL Interpreter Elevated Dias */}
              <rect
                x={interpreterStage.x - 50}
                y={interpreterStage.y - 16}
                width="100"
                height="32"
                rx="5"
                fill="#047857"
                stroke="#34d399"
                strokeWidth="2"
              />
              <text x={interpreterStage.x} y={interpreterStage.y + 4} textAnchor="middle" fill="#ffffff" fontSize="10" fontWeight="bold">
                ASL INTERPRETER DIAS
              </text>
              <circle cx={interpreterStage.x} cy={interpreterStage.y - 4} r="3" fill="#6ee7b7" />

              {/* Center Speaker / Altar Podium */}
              <circle cx={speakerPodium.x} cy={speakerPodium.y + 8} r="15" fill="#334155" stroke="#94a3b8" strokeWidth="1.5" />
              <text x={speakerPodium.x} y={speakerPodium.y + 12} textAnchor="middle" fill="#f8fafc" fontSize="9" fontWeight="bold">
                ALTAR
              </text>

              {/* Sensory Visual Dance Floor in Center */}
              <rect
                x={sensoryDanceFloor.x - 70}
                y={sensoryDanceFloor.y - 45}
                width="140"
                height="90"
                rx="6"
                fill="#431407"
                stroke="#f97316"
                strokeWidth="1.5"
                strokeDasharray="4 2"
                opacity="0.85"
              />
              <text x={sensoryDanceFloor.x} y={sensoryDanceFloor.y - 6} textAnchor="middle" fill="#fb923c" fontSize="10" fontWeight="bold">
                SENSORY FLOOR
              </text>
              <text x={sensoryDanceFloor.x} y={sensoryDanceFloor.y + 10} textAnchor="middle" fill="#fed7aa" fontSize="8">
                Sound-to-Light & Haptic Zone
              </text>

              {/* Sightline Raycasts */}
              {showRays &&
                tables
                  .filter((tbl) => showAllRays || tbl.id === selectedTableId)
                  .map((tbl) => {
                    const analysis = analysisFor(tbl);
                    const isSelected = tbl.id === selectedTableId;
                    const isClear = analysis.status === 'clear';
                    const isObstructed = analysis.status === 'obstructed';

                    return (
                      <g key={`ray-${tbl.id}`}>
                        {/* Ray to ASL Interpreter Dias */}
                        <line
                          x1={tbl.x}
                          y1={tbl.y}
                          x2={interpreterStage.x}
                          y2={interpreterStage.y + 10}
                          stroke={isObstructed ? '#f43f5e' : isClear ? '#10b981' : '#f59e0b'}
                          strokeWidth={isSelected ? '2.5' : '1.2'}
                          strokeDasharray={isObstructed ? '4 3' : isClear ? 'none' : '6 3'}
                          opacity={isSelected ? 0.95 : 0.45}
                        />

                        {/* If selected: also show rays to Altar & CART */}
                        {isSelected && (
                          <>
                            {/* Ray to Altar */}
                            <line
                              x1={tbl.x}
                              y1={tbl.y}
                              x2={speakerPodium.x}
                              y2={speakerPodium.y + 15}
                              stroke="#94a3b8"
                              strokeWidth="1.2"
                              strokeDasharray="3 3"
                              opacity="0.6"
                            />
                            {/* Ray to Nearest CART Screen */}
                            <line
                              x1={tbl.x}
                              y1={tbl.y}
                              x2={nearestCartScreen(tbl).x}
                              y2={nearestCartScreen(tbl).y + 10}
                              stroke="#38bdf8"
                              strokeWidth="1.5"
                              strokeDasharray="4 2"
                              opacity="0.8"
                            />
                          </>
                        )}
                      </g>
                    );
                  })}

              {/* Render Banquet Tables & Accessibility Stations */}
              {tables.map((tbl) => {
                const isSelected = tbl.id === selectedTableId;
                const isDragging = dragState?.tableId === tbl.id;
                const analysis = analysisFor(tbl);
                const isClear = analysis.status === 'clear';
                const isObstructed = analysis.status === 'obstructed';
                const isPriority = isPriorityTable(tbl);

                // Filter dimming
                const isDimmed =
                  (activeFilter === 'priority' && !isPriority) ||
                  (activeFilter === 'standard' && isPriority) ||
                  (activeFilter === 'obstructed' && !isObstructed);

                // Status theme colors
                const statusColor = isObstructed ? '#f43f5e' : isClear ? '#10b981' : '#f59e0b';
                const statusBg = isObstructed ? '#450a0a' : isPriority ? '#064e3b' : '#1e293b';

                // Seating category icon
                const seatingIcon =
                  tbl.tableType === 'wheelchair-pod' || tbl.wheelchairSpots
                    ? '♿'
                    : tbl.tableType === 'cart-pod'
                    ? '📺'
                    : tbl.tableType === 'tactile-close'
                    ? '🤝'
                    : tbl.shape === 'crescent' || tbl.tableType === 'dhh-crescent'
                    ? '🌙'
                    : '⚪';

                return (
                  <g
                    key={tbl.id}
                    role="button"
                    tabIndex={0}
                    aria-pressed={isSelected}
                    aria-label={`${tbl.name}, ${tbl.seats} seats, ${tbl.dhhGuestCount} Deaf or Hard-of-Hearing guests, ${STATUS_TEXT[analysis.status]}${
                      analysis.obstructionReason ? `: ${analysis.obstructionReason}` : ''
                    }. Arrow keys move the table.`}
                    className="cursor-grab active:cursor-grabbing transition-opacity duration-300 focus:outline-none [&:focus-visible>.focus-ring]:opacity-100"
                    opacity={isDimmed ? 0.22 : 1}
                    onPointerDown={(e) => handlePointerDownTable(e, tbl.id)}
                    onKeyDown={(e) => handleTableKeyDown(e, tbl)}
                    onFocus={() => setSelectedTableId(tbl.id)}
                  >
                    <circle className="focus-ring" cx={tbl.x} cy={tbl.y} r="40" fill="none" stroke="#f8fafc" strokeWidth="2" opacity="0" />
                    {/* Wheelchair 60" Clearance Circle (ADA 5-foot turning zone) */}
                    {showWheelchairClearance && (tbl.wheelchairSpots || tbl.tableType === 'wheelchair-pod') && (
                      <circle
                        cx={tbl.x}
                        cy={tbl.y}
                        r="45"
                        fill="#0284c7"
                        fillOpacity="0.08"
                        stroke="#0284c7"
                        strokeWidth="1"
                        strokeDasharray="3 3"
                      />
                    )}

                    {/* Table Active / Selection Glow */}
                    {isSelected && (
                      <circle
                        cx={tbl.x}
                        cy={tbl.y}
                        r="36"
                        fill="none"
                        stroke={statusColor}
                        strokeWidth="2.5"
                        strokeDasharray={isDragging ? '2 2' : '4 2'}
                      />
                    )}

                    {/* Sightline Halo Indicator */}
                    <circle
                      cx={tbl.x}
                      cy={tbl.y}
                      r="27"
                      fill="none"
                      stroke={statusColor}
                      strokeWidth={isSelected ? '2' : '1.5'}
                      opacity={isSelected ? 1 : 0.8}
                    />

                    {/* Table Geometry based on Shape */}
                    {tbl.shape === 'crescent' ? (
                      <path
                        d={`M ${tbl.x - 22} ${tbl.y - 8} A 24 24 0 1 0 ${tbl.x + 22} ${tbl.y - 8} Z`}
                        fill={isSelected ? '#134e4a' : statusBg}
                        stroke={isPriority ? '#2dd4bf' : '#64748b'}
                        strokeWidth={isPriority ? '2' : '1.5'}
                      />
                    ) : tbl.shape === 'u-shape' ? (
                      <rect
                        x={tbl.x - 24}
                        y={tbl.y - 14}
                        width="48"
                        height="28"
                        rx="5"
                        fill={isSelected ? '#134e4a' : statusBg}
                        stroke={isPriority ? '#2dd4bf' : '#64748b'}
                        strokeWidth={isPriority ? '2' : '1.5'}
                      />
                    ) : (
                      <circle
                        cx={tbl.x}
                        cy={tbl.y}
                        r="20"
                        fill={isSelected ? '#134e4a' : statusBg}
                        stroke={isPriority ? '#2dd4bf' : '#64748b'}
                        strokeWidth={isPriority ? '2' : '1.5'}
                      />
                    )}

                    {/* Center Floral Indicator: Red if >9.5", Green if <=9.5" */}
                    <circle
                      cx={tbl.x}
                      cy={tbl.y}
                      r={Math.min(9, Math.max(3, tbl.centerpieceHeightInches / 1.6))}
                      fill={tbl.centerpieceHeightInches > CENTERPIECE_MAX_INCHES ? '#ef4444' : '#10b981'}
                    />

                    {/* Seating Type Icon: Crescent, Wheelchair, CART, Tactile, or Standard */}
                    <text
                      x={tbl.x - 11}
                      y={tbl.y + 4}
                      fill={isPriority ? '#38bdf8' : '#94a3b8'}
                      fontSize="10"
                      fontWeight="bold"
                    >
                      {seatingIcon}
                    </text>

                    {/* Sightline Clearance Spot Badge directly on table */}
                    <g transform={`translate(${tbl.x + 12}, ${tbl.y - 20})`}>
                      <circle
                        cx="0"
                        cy="0"
                        r="7"
                        fill={statusColor}
                        stroke="#0f172a"
                        strokeWidth="1.5"
                      />
                      <text
                        x="0"
                        y="2.5"
                        textAnchor="middle"
                        fill="#ffffff"
                        fontSize="8"
                        fontWeight="bold"
                      >
                        {isClear ? '✓' : isObstructed ? '✕' : '~'}
                      </text>
                    </g>

                    {/* Table Label */}
                    <text
                      x={tbl.x}
                      y={tbl.y + 36}
                      textAnchor="middle"
                      fill={isSelected ? '#2dd4bf' : '#cbd5e1'}
                      fontSize="9"
                      fontWeight="600"
                    >
                      {tbl.name.split('(')[0].trim()}
                    </text>

                    {/* Category Pill Subtext under Table (Priority Sightline vs Standard) */}
                    <text
                      x={tbl.x}
                      y={tbl.y + 46}
                      textAnchor="middle"
                      fill={isPriority ? '#2dd4bf' : '#94a3b8'}
                      fontSize="7"
                      fontWeight="bold"
                    >
                      {isPriority ? 'PRIORITY SIGHTLINE' : 'STANDARD GUEST'}
                    </text>
                  </g>
                );
              })}
            </svg>

            {/* Dragging Overlay Floating Pill */}
            {dragState && (
              <div className="absolute top-3 left-3 bg-teal-500/90 text-slate-950 font-mono text-xs px-2.5 py-1 rounded shadow-lg font-bold flex items-center gap-1.5 animate-pulse">
                <span>Dragging {selectedTable.name}</span>
                <span>· ({selectedTable.x}, {selectedTable.y})</span>
              </div>
            )}

            {/* In-Canvas Mini Status Overlay */}
            <div className="absolute bottom-2 left-2 right-2 bg-slate-950/90 backdrop-blur-md border border-slate-800 rounded px-3 py-1.5 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-400">
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1 text-teal-300 font-medium">
                  <span>🌙</span> Priority Sightlines ({priorityCount})
                </span>
                <span className="flex items-center gap-1 text-slate-300 font-medium">
                  <span>⚪</span> Standard Seating ({standardCount})
                </span>
                <span className="flex items-center gap-1 text-emerald-400">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  Clear ({clearSightlineTables})
                </span>
                {obstructedTablesCount > 0 && (
                  <span className="flex items-center gap-1 text-rose-400">
                    <span className="w-2 h-2 rounded-full bg-rose-500" />
                    Obstructed ({obstructedTablesCount})
                  </span>
                )}
              </div>
              <div className="font-mono text-teal-300">
                Selected: {selectedTable.name} ({selectedTable.x}, {selectedTable.y})
              </div>
            </div>
          </div>

          <p aria-live="polite" className="sr-only">
            {announcement}
          </p>
          <ul className="sr-only" aria-label="Table sightline summary">
            {tables.map((t) => {
              const a = analysisFor(t);
              return (
                <li key={t.id}>
                  {t.name}: {STATUS_TEXT[a.status]}
                  {a.obstructionReason ? `, ${a.obstructionReason}` : ''}
                </li>
              );
            })}
          </ul>

          {/* Dedicated FloorplanLegend Component: Priority Sightline Seats vs Standard Guest Seating */}
          <FloorplanLegend
            priorityCount={priorityCount}
            standardCount={standardCount}
            clearSightlinesCount={clearSightlineTables}
            obstructedCount={obstructedTablesCount}
            totalSeats={totalSeats}
            dhhSeats={totalDhhGuests}
            activeFilter={activeFilter}
            onFilterChange={setActiveFilter}
            selectedTableName={selectedTable.name}
            selectedTableCoords={{ x: selectedTable.x, y: selectedTable.y }}
          />

          {/* Quick instructions footer */}
          <div className="text-[11px] text-slate-400 flex items-center justify-between px-1">
            <span>Tip: Filter by Priority or Standard seating above to inspect specific sightlines. Drag any table to re-position.</span>
            <span className="font-mono text-teal-400">{clearRate}% Room Sightline Clearance</span>
          </div>
        </div>

        {/* Right: Selected Table Inspector & Accessibility Verification (4 cols) */}
        <div className="lg:col-span-4 bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-6">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <div className="text-xs text-slate-400 font-medium">Table Audit Inspector</div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white">{selectedTable.name}</h3>
                <span
                  className={`text-[11px] font-mono px-2 py-0.5 rounded font-semibold ${
                    isPriorityTable(selectedTable)
                      ? 'bg-teal-500/20 text-teal-300 border border-teal-500/40'
                      : 'bg-slate-800 text-slate-300 border border-slate-700'
                  }`}
                >
                  {isPriorityTable(selectedTable) ? 'PRIORITY' : 'STANDARD'}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                {selectedTable.seats} Seats · {selectedTable.dhhGuestCount} DHH Attendees
                {selectedTable.wheelchairSpots ? ` · ${selectedTable.wheelchairSpots} Wheelchair Bays` : ''}
              </p>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={duplicateSelectedTable}
                title="Duplicate Table"
                aria-label={`Duplicate ${selectedTable.name}`}
                className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs transition-colors cursor-pointer"
              >
                📋
              </button>
              {tables.length > 1 && (
                <button
                  onClick={deleteSelectedTable}
                  title="Delete Table"
                  aria-label={`Delete ${selectedTable.name}`}
                  className="p-1.5 rounded bg-rose-950/60 hover:bg-rose-900/80 text-rose-300 border border-rose-800 text-xs transition-colors cursor-pointer"
                >
                  🗑️
                </button>
              )}
            </div>
          </div>

          {/* Sightline Status Card */}
          <div
            className={`p-3.5 rounded-lg border text-xs space-y-2 ${
              selectedAnalysis.status === 'obstructed'
                ? 'bg-rose-950/50 border-rose-600/60 text-rose-200'
                : selectedAnalysis.status === 'fair'
                ? 'bg-amber-950/50 border-amber-600/60 text-amber-200'
                : 'bg-emerald-950/50 border-emerald-600/60 text-emerald-200'
            }`}
          >
            <div className="font-semibold flex items-center justify-between">
              <span>Sightline Integrity:</span>
              <span className="font-mono uppercase font-bold tracking-wider">
                {selectedAnalysis.status === 'clear'
                  ? '✓ PRIME SIGHTLINE'
                  : selectedAnalysis.status === 'fair'
                  ? '~ PERIPHERAL / FAR'
                  : '✕ OBSTRUCTED'}
              </span>
            </div>
            <p className="text-[11px] leading-relaxed opacity-90">
              {selectedAnalysis.obstructionReason ||
                '100% direct, unobstructed sightline to ASL Interpreter Dais & Stage Altar.'}
            </p>
            {selectedAnalysis.blockedByTableId && (
              <div className="text-[11px] bg-rose-900/40 p-1.5 rounded font-mono">
                Recommendation: Drag {selectedTable.name} 20px outward or switch to a front crescent tier.
              </div>
            )}
          </div>

          {/* Centerpiece Height Adjustment Slider */}
          <div className="space-y-3 bg-slate-950/80 border border-slate-800 rounded-lg p-4">
            <div className="flex items-center justify-between text-xs">
              <label htmlFor="centerpiece-height" className="text-slate-300 font-medium">Floral Centerpiece Height:</label>
              <span
                className={`font-mono font-bold tabular-nums text-sm ${
                  selectedTable.centerpieceHeightInches > CENTERPIECE_MAX_INCHES ? 'text-rose-400' : 'text-emerald-400'
                }`}
              >
                {selectedTable.centerpieceHeightInches}"
              </span>
            </div>

            <input
              id="centerpiece-height"
              type="range"
              min="4"
              max="16"
              step="0.5"
              value={selectedTable.centerpieceHeightInches}
              onChange={(e) => updateSelectedTableHeight(parseFloat(e.target.value))}
              className="w-full accent-teal-400 cursor-pointer"
            />

            <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono">
              <span>4" (Low Compliant)</span>
              <span>9.5" (Safe Limit)</span>
              <span>16" (Blocking)</span>
            </div>

            <p className="text-[11px] text-slate-400 leading-relaxed border-t border-slate-800 pt-2">
              <span className="font-semibold text-slate-300">DeafSpace Principle:</span> Eye lines across a standard 60" table sit 10–12" above the tabletop. Any centerpiece &gt;9.5" breaks sign visibility.
            </p>
          </div>

          {/* Table Shape Configuration */}
          <div className="space-y-2">
            <div className="text-xs font-medium text-slate-300">Table Geometry Type</div>
            <div className="grid grid-cols-3 gap-2">
              {(['crescent', 'u-shape', 'radial'] as const).map((shape) => (
                <button
                  key={shape}
                  onClick={() => updateTableShape(shape)}
                  aria-pressed={selectedTable.shape === shape}
                  className={`px-2 py-1.5 text-xs font-medium capitalize rounded border transition-colors cursor-pointer ${
                    selectedTable.shape === shape
                      ? 'bg-teal-500/20 border-teal-500 text-teal-200'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {shape === 'crescent' ? '🌙 Crescent' : shape === 'u-shape' ? '⊓ U-Shape' : '⚪ Radial'}
                </button>
              ))}
            </div>
          </div>

          {/* Seating & Capacity Editors */}
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="space-y-1">
              <label htmlFor="table-seats" className="text-slate-400">Total Seats:</label>
              <input
                id="table-seats"
                type="number"
                min="2"
                max="14"
                value={selectedTable.seats}
                onChange={(e) => updateTableSeats(Math.min(14, Math.max(2, parseInt(e.target.value, 10) || 2)))}
                className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-white font-mono"
              />
            </div>
            <div className="space-y-1">
              <label htmlFor="table-dhh" className="text-slate-400">DHH Attendees:</label>
              <input
                id="table-dhh"
                type="number"
                min="0"
                max={selectedTable.seats}
                value={selectedTable.dhhGuestCount}
                onChange={(e) => updateTableDhhCount(Math.max(0, parseInt(e.target.value, 10) || 0))}
                className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-teal-400 font-mono"
              />
            </div>
          </div>

          {/* Target Angles to Venue Anchors */}
          <div className="space-y-2 text-xs">
            <div className="text-slate-400 font-medium">Computed Sightline Vectors</div>
            <div className="bg-slate-950 border border-slate-800 rounded p-2.5 space-y-1.5 font-mono text-[11px]">
              <div className="flex justify-between text-slate-300">
                <span>To ASL Dais:</span>
                <span className="text-emerald-400">
                  {selectedAnalysis.distanceToInterpreter} px ({Math.round(selectedAnalysis.distanceToInterpreter / 10)} ft eq) · {selectedAnalysis.angleToInterpreter}°
                </span>
              </div>
              <div className="flex justify-between text-slate-300">
                <span>To Primary CART:</span>
                <span className="text-sky-400">
                  {selectedAnalysis.distanceToCart} px ({Math.round(selectedAnalysis.distanceToCart / 10)} ft eq)
                </span>
              </div>
              <div className="flex justify-between text-slate-300">
                <span>To Ceremony Altar:</span>
                <span className="text-slate-400">
                  {selectedAnalysis.distanceToSpeaker} px ({Math.round(selectedAnalysis.distanceToSpeaker / 10)} ft eq)
                </span>
              </div>
            </div>
          </div>

          {/* Seating Room Statistics Summary */}
          <div className="bg-slate-950 border border-slate-800 rounded-lg p-3 text-xs space-y-2">
            <div className="text-slate-400 font-medium">Room Accessibility Scorecard</div>
            <div className="grid grid-cols-2 gap-2 text-[11px]">
              <div className="p-2 rounded bg-slate-900 border border-slate-800">
                <div className="text-slate-400">Clear Sightline Ratio</div>
                <div className="font-mono text-base font-bold text-emerald-400">{clearRate}%</div>
              </div>
              <div className="p-2 rounded bg-slate-900 border border-slate-800">
                <div className="text-slate-400">DHH Capacity</div>
                <div className="font-mono text-base font-bold text-teal-400">{totalDhhGuests} / {totalSeats}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
