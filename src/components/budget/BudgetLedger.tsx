import { useState } from 'react';
import type { BudgetItem } from '../../types';
import type { BudgetWarning } from '../../utils/budgetBenchmark';

type PriorityFilter = 'all' | BudgetItem['priority'];
const FILTERS: PriorityFilter[] = ['all', 'Essential', 'High', 'Recommended', 'Base'];

const PRIORITY_COLOR: Record<BudgetItem['priority'], string> = {
  Essential: 'text-rose-400',
  High: 'text-amber-400',
  Recommended: 'text-teal-400',
  Base: 'text-slate-400',
};

interface BudgetLedgerProps {
  items: BudgetItem[];
  totalBudget: number;
  /** Warning per item id, for items in an over-allocated category. */
  warningsByItem: Map<string, BudgetWarning>;
  activeWarningCount: number;
  onCycleStatus: (id: string) => void;
  onDelete: (id: string) => void;
}

export const BudgetLedger = ({
  items,
  totalBudget,
  warningsByItem,
  activeWarningCount,
  onCycleStatus,
  onDelete,
}: BudgetLedgerProps) => {
  const [filter, setFilter] = useState<PriorityFilter>('all');
  const visible = filter === 'all' ? items : items.filter((item) => item.priority === filter);

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
      <div className="px-6 py-4 border-b border-slate-800 flex flex-wrap items-center justify-between gap-4">
        <h3 className="text-sm font-semibold text-white flex items-center gap-2">
          Expense ledger
          {activeWarningCount > 0 && (
            <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
              {activeWarningCount} warning{activeWarningCount === 1 ? '' : 's'}
            </span>
          )}
        </h3>
        <div
          role="group"
          aria-label="Filter by priority"
          className="flex items-center gap-1 p-1 bg-slate-950 border border-slate-800 rounded-lg text-xs"
        >
          {FILTERS.map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              aria-pressed={filter === f}
              className={`px-3 py-1 font-medium capitalize rounded transition-colors cursor-pointer ${
                filter === f ? 'bg-slate-800 text-teal-300' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <caption className="sr-only">Budget line items with cost, share of budget and procurement status</caption>
          <thead>
            <tr className="border-b border-slate-800 bg-slate-950/60 text-slate-400 uppercase tracking-wider font-medium text-[11px]">
              <th scope="col" className="py-3 px-6">
                Category
              </th>
              <th scope="col" className="py-3 px-4">
                Priority
              </th>
              <th scope="col" className="py-3 px-4 text-right">
                Cost
              </th>
              <th scope="col" className="py-3 px-4 text-right">
                Share
              </th>
              <th scope="col" className="py-3 px-4">
                Benchmark
              </th>
              <th scope="col" className="py-3 px-4">
                Status
              </th>
              <th scope="col" className="py-3 px-6">
                Notes
              </th>
              <th scope="col" className="py-3 px-4 text-right">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60">
            {visible.map((item) => {
              const warning = warningsByItem.get(item.id);
              const share = totalBudget > 0 ? Math.round((item.amount / totalBudget) * 1000) / 10 : 0;
              return (
                <tr
                  key={item.id}
                  className={warning ? 'bg-amber-950/15 hover:bg-amber-950/25' : 'hover:bg-slate-800/40'}
                >
                  <th scope="row" className="py-3.5 px-6 font-medium text-slate-100 whitespace-nowrap text-left">
                    {warning && <span className="sr-only">Over benchmark: </span>}
                    {item.category}
                  </th>
                  <td
                    className={`py-3.5 px-4 whitespace-nowrap text-[11px] font-medium ${PRIORITY_COLOR[item.priority]}`}
                  >
                    {item.priority}
                  </td>
                  <td className="py-3.5 px-4 text-right font-mono font-semibold text-slate-100 tabular-nums">
                    ${item.amount.toLocaleString()}
                  </td>
                  <td className="py-3.5 px-4 text-right font-mono text-slate-400 tabular-nums">{share}%</td>
                  <td className="py-3.5 px-4 whitespace-nowrap">
                    {warning ? (
                      <span className="text-[11px] font-mono font-semibold px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40">
                        Category at {warning.allocatedPercent}%
                      </span>
                    ) : (
                      <span className="text-[11px] font-mono text-slate-400">In range</span>
                    )}
                  </td>
                  <td className="py-3.5 px-4 whitespace-nowrap">
                    <button
                      onClick={() => onCycleStatus(item.id)}
                      aria-label={`${item.category}: status ${item.status}. Activate to change status`}
                      className="text-xs font-mono underline hover:text-teal-300 cursor-pointer text-slate-300"
                    >
                      {item.status}
                    </button>
                  </td>
                  <td className="py-3.5 px-6 text-slate-400 text-[11px] max-w-xs truncate">{item.notes}</td>
                  <td className="py-3.5 px-4 text-right">
                    <button
                      onClick={() => onDelete(item.id)}
                      aria-label={`Remove ${item.category}`}
                      className="text-[11px] text-slate-400 hover:text-rose-400 cursor-pointer"
                    >
                      Remove
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
