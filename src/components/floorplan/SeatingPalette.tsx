import { SEATING_PRESETS, type SeatingKind } from '../../utils/floorplanLayout';

const THEME: Record<SeatingKind, { card: string; badge: string; title: string }> = {
  'dhh-crescent': {
    card: 'border-teal-500/30 bg-teal-950/20 hover:bg-teal-900/40',
    badge: 'bg-teal-500/20 text-teal-300',
    title: 'text-teal-200',
  },
  'wheelchair-pod': {
    card: 'border-sky-500/30 bg-sky-950/20 hover:bg-sky-900/40',
    badge: 'bg-sky-500/20 text-sky-300',
    title: 'text-sky-200',
  },
  'cart-pod': {
    card: 'border-indigo-500/30 bg-indigo-950/20 hover:bg-indigo-900/40',
    badge: 'bg-indigo-500/20 text-indigo-300',
    title: 'text-indigo-200',
  },
  'tactile-close': {
    card: 'border-amber-500/30 bg-amber-950/20 hover:bg-amber-900/40',
    badge: 'bg-amber-500/20 text-amber-300',
    title: 'text-amber-200',
  },
  standard: {
    card: 'border-slate-700 bg-slate-950/60 hover:bg-slate-800',
    badge: 'bg-slate-800 text-slate-300',
    title: 'text-slate-200',
  },
};

interface SeatingPaletteProps {
  tableCount: number;
  priorityCount: number;
  onAdd: (kind: SeatingKind) => void;
}

export const SeatingPalette = ({ tableCount, priorityCount, onAdd }: SeatingPaletteProps) => (
  <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4">
    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-3">
      <div>
        <h3 className="text-xs font-bold text-white uppercase tracking-wider">Add Accessibility-Focused Seating</h3>
        <p className="text-[11px] text-slate-400">
          Add a table type to the layout, then drag or arrow-key it into place.
        </p>
      </div>
      <span className="text-xs font-mono text-teal-400">
        {tableCount} Total Tables ({priorityCount} Priority · {tableCount - priorityCount} Standard)
      </span>
    </div>

    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
      {SEATING_PRESETS.map(({ kind, label, description, icon }) => {
        const theme = THEME[kind];
        return (
          <button
            key={kind}
            onClick={() => onAdd(kind)}
            aria-label={`Add ${label}: ${description}`}
            className={`group p-2.5 rounded-lg border text-left transition-colors cursor-pointer flex flex-col justify-between ${theme.card}`}
          >
            <div className="flex items-center justify-between">
              <span aria-hidden="true" className="text-lg">
                {icon}
              </span>
              <span className={`text-[11px] font-mono px-1.5 py-0.5 rounded font-semibold ${theme.badge}`}>+ Add</span>
            </div>
            <div className="mt-2">
              <div className={`text-xs font-bold ${theme.title}`}>{label}</div>
              <div className="text-[11px] text-slate-400 leading-tight">{description}</div>
            </div>
          </button>
        );
      })}
    </div>
  </div>
);
