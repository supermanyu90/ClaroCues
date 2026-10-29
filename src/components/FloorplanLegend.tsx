import React, { useState } from 'react';

export type FloorplanFilterType = 'all' | 'priority' | 'standard' | 'obstructed';

interface FloorplanLegendProps {
  priorityCount: number;
  standardCount: number;
  clearSightlinesCount: number;
  obstructedCount: number;
  totalSeats: number;
  dhhSeats: number;
  activeFilter?: FloorplanFilterType;
  onFilterChange?: (filter: FloorplanFilterType) => void;
  selectedTableName?: string;
  selectedTableCoords?: { x: number; y: number };
}

export const FloorplanLegend: React.FC<FloorplanLegendProps> = ({
  priorityCount,
  standardCount,
  clearSightlinesCount,
  obstructedCount,
  totalSeats,
  dhhSeats,
  activeFilter = 'all',
  onFilterChange,
  selectedTableName,
  selectedTableCoords,
}) => {
  const [isExpanded, setIsExpanded] = useState<boolean>(true);

  return (
    <div className="bg-slate-950/95 backdrop-blur-md border border-slate-800 rounded-xl p-3.5 space-y-3 shadow-lg">
      {/* Top Header & Interactive Filter Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800/80 pb-2.5">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-teal-400 animate-pulse" />
          <span className="text-xs font-bold text-white uppercase tracking-wider">
            Seating & Sightline Legend
          </span>
          <span className="text-[10px] text-slate-400 font-mono">
            DeafSpace Architectural Standards
          </span>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1 text-[11px]">
          <button
            onClick={() => onFilterChange?.('all')}
            className={`px-2 py-0.5 rounded transition-all cursor-pointer font-medium ${
              activeFilter === 'all'
                ? 'bg-slate-700 text-white font-semibold shadow-sm'
                : 'text-slate-400 hover:text-slate-200 bg-slate-900/60'
            }`}
          >
            All Tables
          </button>
          <button
            onClick={() => onFilterChange?.('priority')}
            className={`px-2 py-0.5 rounded transition-all cursor-pointer font-medium flex items-center gap-1 ${
              activeFilter === 'priority'
                ? 'bg-teal-500/30 text-teal-200 border border-teal-500/50 font-semibold'
                : 'text-teal-400/80 hover:text-teal-300 bg-teal-950/40'
            }`}
          >
            <span>🌙 Priority ({priorityCount})</span>
          </button>
          <button
            onClick={() => onFilterChange?.('standard')}
            className={`px-2 py-0.5 rounded transition-all cursor-pointer font-medium flex items-center gap-1 ${
              activeFilter === 'standard'
                ? 'bg-slate-700 text-slate-200 font-semibold'
                : 'text-slate-400 hover:text-slate-300 bg-slate-900/60'
            }`}
          >
            <span>⚪ Standard ({standardCount})</span>
          </button>
          <button
            onClick={() => onFilterChange?.('obstructed')}
            className={`px-2 py-0.5 rounded transition-all cursor-pointer font-medium flex items-center gap-1 ${
              activeFilter === 'obstructed'
                ? 'bg-rose-500/30 text-rose-200 border border-rose-500/50 font-semibold'
                : 'text-rose-400/80 hover:text-rose-300 bg-rose-950/40'
            }`}
          >
            <span>✕ Blocked ({obstructedCount})</span>
          </button>

          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="ml-2 text-slate-400 hover:text-white text-xs px-1.5 py-0.5 rounded bg-slate-900 hover:bg-slate-800 transition-colors cursor-pointer"
            title={isExpanded ? 'Collapse Legend Details' : 'Expand Legend Details'}
          >
            {isExpanded ? '▲ Hide' : '▼ Details'}
          </button>
        </div>
      </div>

      {/* Main Legend Content Comparison: Priority Sightlines vs Standard Guest Seating */}
      {isExpanded ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-3 text-xs pt-1">
          {/* Group 1: Priority Sightline Seats (5 cols) */}
          <div className="lg:col-span-5 bg-teal-950/20 border border-teal-800/40 rounded-lg p-2.5 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-teal-300 uppercase tracking-wide text-[10px] flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-teal-400" />
                Priority Sightline Seating
              </span>
              <span className="font-mono text-[10px] text-teal-400 font-semibold">
                {priorityCount} Tables · {dhhSeats} DHH Guests
              </span>
            </div>

            <div className="space-y-1.5 text-[11px]">
              <div className="flex items-start gap-2">
                <div className="w-5 h-5 rounded-md bg-teal-900/60 border border-teal-500 flex items-center justify-center text-xs shrink-0 text-teal-200">
                  🌙
                </div>
                <div>
                  <div className="font-semibold text-teal-200">DHH Crescent Arc Table</div>
                  <div className="text-[10px] text-slate-400 leading-tight">
                    Open semi-circle facing interpreter & stage. Zero blindspots or chair turns required.
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-2">
                <div className="w-5 h-5 rounded-md bg-sky-900/60 border border-sky-500 flex items-center justify-center text-xs shrink-0 text-sky-200">
                  ♿
                </div>
                <div>
                  <div className="font-semibold text-sky-200">Wheelchair + Companion Pod</div>
                  <div className="text-[10px] text-slate-400 leading-tight">
                    Includes 60" (5ft) ADA turning radius ring & direct aisle access.
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-2">
                <div className="w-5 h-5 rounded-md bg-indigo-900/60 border border-indigo-500 flex items-center justify-center text-xs shrink-0 text-indigo-200">
                  📺
                </div>
                <div>
                  <div className="font-semibold text-indigo-200">CART Caption Viewing Pod</div>
                  <div className="text-[10px] text-slate-400 leading-tight">
                    Optimized perpendicular line-of-sight to 75" real-time caption displays.
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-2">
                <div className="w-5 h-5 rounded-md bg-amber-900/60 border border-amber-500 flex items-center justify-center text-xs shrink-0 text-amber-200">
                  🤝
                </div>
                <div>
                  <div className="font-semibold text-amber-200">DeafBlind Tactile Frontline</div>
                  <div className="text-[10px] text-slate-400 leading-tight">
                    Front-row low acoustic rumble zone for close-vision and tactile sign interpreters.
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Group 2: Standard Guest Seating (3 cols) */}
          <div className="lg:col-span-3 bg-slate-900/60 border border-slate-800 rounded-lg p-2.5 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-300 uppercase tracking-wide text-[10px] flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-slate-500" />
                Standard Guest Seating
              </span>
              <span className="font-mono text-[10px] text-slate-400 font-semibold">
                {standardCount} Tables · {totalSeats - dhhSeats} Seats
              </span>
            </div>

            <div className="space-y-1.5 text-[11px]">
              <div className="flex items-start gap-2">
                <div className="w-5 h-5 rounded-md bg-slate-800 border border-slate-600 flex items-center justify-center text-xs shrink-0 text-slate-300">
                  ⚪
                </div>
                <div>
                  <div className="font-semibold text-slate-200">Standard 60" Radial Round</div>
                  <div className="text-[10px] text-slate-400 leading-tight">
                    Standard circular banquet table for hearing family, coworkers, and evening guests.
                  </div>
                </div>
              </div>

              <div className="p-2 rounded bg-slate-950/80 border border-slate-800/80 text-[10px] text-slate-400 space-y-1 mt-2">
                <div className="text-slate-300 font-medium">DeafSpace Centerpiece Rule:</div>
                <p className="leading-relaxed">
                  Centerpieces on all guest tables must remain capped at <span className="text-teal-400 font-semibold">&le;9.5"</span> to prevent blocking signing sightlines across tables.
                </p>
              </div>
            </div>
          </div>

          {/* Group 3: Real-Time Sightline Status Rays & Venue Anchors (4 cols) */}
          <div className="lg:col-span-4 bg-slate-900/60 border border-slate-800 rounded-lg p-2.5 space-y-2">
            <div className="font-bold text-slate-300 uppercase tracking-wide text-[10px] flex items-center gap-1.5">
              <span>Raycast Sightline & Focal Targets</span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-[10.5px]">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 border border-emerald-300 shrink-0" />
                <span className="text-emerald-300 font-medium">Prime Clear (✓)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500 border border-amber-300 shrink-0" />
                <span className="text-amber-300 font-medium">Peripheral (~)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500 border border-rose-300 shrink-0" />
                <span className="text-rose-300 font-medium">Obstructed (✕)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm bg-emerald-700 border border-emerald-400 shrink-0" />
                <span className="text-slate-300">ASL Dias</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm bg-sky-600 border border-sky-400 shrink-0" />
                <span className="text-slate-300">CART Screens</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm bg-orange-600 border border-orange-400 shrink-0" />
                <span className="text-slate-300">Sensory Floor</span>
              </div>
            </div>

            {selectedTableName && selectedTableCoords && (
              <div className="pt-2 border-t border-slate-800 flex items-center justify-between font-mono text-[10.5px]">
                <span className="text-slate-400">Selected Target:</span>
                <span className="text-teal-300 font-semibold truncate max-w-[170px]">
                  {selectedTableName} ({selectedTableCoords.x}, {selectedTableCoords.y})
                </span>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Compact Bar Mode when Collapsed */
        <div className="flex flex-wrap items-center justify-between gap-3 text-[11px] text-slate-300 pt-0.5">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-1.5">
              <span className="text-teal-400 font-bold">🌙</span>
              <span className="text-teal-200 font-medium">Priority Sightline Seats</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-slate-400 font-bold">⚪</span>
              <span className="text-slate-300 font-medium">Standard Guest Seating</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span className="text-emerald-300">Clear Sightline</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-rose-500" />
              <span className="text-rose-300">Obstructed Sightline</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-sky-400">♿</span>
              <span className="text-sky-300">60" ADA Turning Pod</span>
            </div>
          </div>

          {selectedTableName && selectedTableCoords && (
            <div className="font-mono text-teal-300 text-[10.5px]">
              Active: {selectedTableName} ({selectedTableCoords.x}, {selectedTableCoords.y})
            </div>
          )}
        </div>
      )}
    </div>
  );
};
