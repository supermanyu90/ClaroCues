import type { EventCategory } from '../../types';
import type { CategorySummary } from '../../utils/budgetBenchmark';

interface BenchmarkBreakdownProps {
  eventType: EventCategory;
  categories: CategorySummary[];
  onClose: () => void;
}

export const BenchmarkBreakdown = ({ eventType, categories, onClose }: BenchmarkBreakdownProps) => (
  <section
    aria-labelledby="benchmark-heading"
    className="bg-slate-900 border border-teal-500/40 rounded-xl p-6 space-y-4"
  >
    <div className="flex items-center justify-between border-b border-slate-800 pb-3">
      <div>
        <h3 id="benchmark-heading" className="text-sm font-bold text-white">
          Industry benchmarks for a {eventType}
        </h3>
        <p className="text-xs text-slate-400">
          Typical share of total budget per category, and the level that triggers a warning.
        </p>
      </div>
      <button onClick={onClose} className="text-xs text-slate-300 hover:text-white cursor-pointer">
        Close
      </button>
    </div>

    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {categories.map((cat) => (
        <div
          key={cat.key}
          className={`p-4 rounded-xl border ${cat.isOver ? 'bg-rose-950/20 border-rose-500/50' : 'bg-slate-950 border-slate-800'}`}
        >
          <div className="flex items-center justify-between mb-1">
            <h4 className="font-semibold text-white text-xs">{cat.displayName}</h4>
            <span
              className={`text-[11px] font-mono px-1.5 py-0.5 rounded border ${
                cat.isOver
                  ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                  : 'bg-teal-500/10 text-teal-300 border-teal-500/20'
              }`}
            >
              {cat.isOver ? 'Above benchmark' : 'Balanced'}
            </span>
          </div>
          <div className="text-lg font-bold font-mono text-white tabular-nums">
            ${cat.spent.toLocaleString()}
            <span className="text-xs font-normal text-slate-400 ml-1.5 font-sans">({cat.percent}% of budget)</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">{cat.description}</p>
          <div className="mt-3 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px] font-mono text-slate-400">
            <span>Average: {cat.averagePercent}%</span>
            <span className={cat.isOver ? 'text-rose-400 font-semibold' : undefined}>
              Warning at: {cat.warningThresholdPercent}%
            </span>
          </div>
        </div>
      ))}
    </div>
  </section>
);
