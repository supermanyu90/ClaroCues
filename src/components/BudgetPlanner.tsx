import { useMemo, useState } from 'react';
import type { BudgetItem, EventCategory } from '../types';
import {
  accessibilitySpend,
  analyzeBudgetAgainstBenchmarks,
  capCategoryToThreshold,
  checkAccessibilityFunding,
  nextBudgetStatus,
  sumAmounts,
  summarizeCategories,
  type BudgetWarning,
} from '../utils/budgetBenchmark';
import { budgetToCsv } from '../utils/csv';
import { downloadText } from '../utils/download';
import { AddBudgetItemForm } from './budget/AddBudgetItemForm';
import { BenchmarkBreakdown } from './budget/BenchmarkBreakdown';
import { FundingGapNotice, OverspendWarning } from './budget/BudgetAlerts';
import { BudgetLedger } from './budget/BudgetLedger';

interface BudgetPlannerProps {
  budgetItems: BudgetItem[];
  totalBudget: number;
  eventType?: EventCategory;
  onUpdateItems: (items: BudgetItem[]) => void;
  onUpdateTotalBudget: (total: number) => void;
}

const percentOf = (part: number, whole: number) => (whole > 0 ? Math.round((part / whole) * 100) : 0);

export const BudgetPlanner = ({
  budgetItems,
  totalBudget,
  eventType = 'wedding',
  onUpdateItems,
  onUpdateTotalBudget,
}: BudgetPlannerProps) => {
  const [isAdding, setIsAdding] = useState(false);
  const [showBenchmarks, setShowBenchmarks] = useState(false);
  const [dismissed, setDismissed] = useState<Set<string>>(() => new Set());

  const allocated = sumAmounts(budgetItems);
  const remaining = totalBudget - allocated;
  const accessSpend = accessibilitySpend(budgetItems);
  const fundingGap = useMemo(
    () => checkAccessibilityFunding(budgetItems, totalBudget, eventType),
    [budgetItems, totalBudget, eventType]
  );
  const warnings = useMemo(
    () => analyzeBudgetAgainstBenchmarks(budgetItems, totalBudget, eventType),
    [budgetItems, totalBudget, eventType]
  );
  const activeWarnings = warnings.filter((w) => !dismissed.has(w.categoryKey));
  const warningsByItem = useMemo(
    () => new Map<string, BudgetWarning>(warnings.flatMap((w) => w.affectedItemIds.map((id) => [id, w] as const))),
    [warnings]
  );

  const exportCsv = () =>
    downloadText(`clarocues_${eventType}_budget.csv`, budgetToCsv(budgetItems), 'text/csv;charset=utf-8');

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row gap-6 items-start justify-between bg-slate-900 border border-slate-800 rounded-xl p-6">
        <div className="space-y-2 max-w-2xl">
          <h2 className="text-xl font-bold text-white tracking-tight">Budget Planner</h2>
          <p className="text-sm text-slate-300 leading-relaxed">
            Track spend for your {eventType} against industry benchmarks. Overspending categories get a warning, and the
            planner flags when interpreters and captioning are under-funded.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <button
            onClick={() => setShowBenchmarks((v) => !v)}
            aria-expanded={showBenchmarks}
            className="px-3.5 py-2 text-xs font-semibold text-teal-300 bg-slate-950 hover:bg-slate-800 border border-teal-500/40 rounded-lg transition-colors cursor-pointer"
          >
            {showBenchmarks ? 'Hide benchmarks' : 'Industry benchmarks'}
          </button>
          <button
            onClick={() => setIsAdding(true)}
            className="px-3.5 py-2 text-xs font-semibold text-slate-950 bg-teal-400 hover:bg-teal-300 rounded-lg transition-colors cursor-pointer"
          >
            + Add expense
          </button>
          <button
            onClick={exportCsv}
            className="px-3 py-2 text-xs font-semibold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg transition-colors cursor-pointer"
          >
            Export CSV
          </button>
        </div>
      </div>

      {fundingGap && <FundingGapNotice gap={fundingGap} eventType={eventType} />}

      {activeWarnings.map((warning) => (
        <OverspendWarning
          key={warning.categoryKey}
          warning={warning}
          onAutoCap={() => onUpdateItems(capCategoryToThreshold(budgetItems, warning))}
          onDismiss={() => setDismissed((prev) => new Set(prev).add(warning.categoryKey))}
        />
      ))}

      {showBenchmarks && (
        <BenchmarkBreakdown
          eventType={eventType}
          categories={summarizeCategories(budgetItems, totalBudget, eventType)}
          onClose={() => setShowBenchmarks(false)}
        />
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-1">
          <label htmlFor="budget-total" className="text-xs text-slate-400">
            Total event budget ($)
          </label>
          <input
            id="budget-total"
            type="number"
            min="0"
            step="500"
            value={totalBudget}
            onChange={(e) => onUpdateTotalBudget(Math.max(0, Number(e.target.value) || 0))}
            className="w-full bg-transparent text-2xl font-bold text-white font-mono tabular-nums focus:outline-none border-b border-slate-700 focus:border-teal-400"
          />
        </div>
        <SummaryCard
          label="Allocated"
          value={`$${allocated.toLocaleString()}`}
          detail={`${percentOf(allocated, totalBudget)}% of total budget`}
          tone="text-teal-400"
        />
        <SummaryCard
          label="Accessibility spend"
          value={`$${accessSpend.toLocaleString()}`}
          detail={`${percentOf(accessSpend, totalBudget)}% on interpreters, captioning and access`}
          tone="text-sky-400"
        />
        <SummaryCard
          label="Remaining"
          value={`$${remaining.toLocaleString()}`}
          detail={remaining >= 0 ? 'Unallocated buffer' : 'Over budget'}
          tone={remaining >= 0 ? 'text-emerald-400' : 'text-rose-400'}
        />
      </div>

      {isAdding && (
        <AddBudgetItemForm
          onAdd={(item) => {
            onUpdateItems([...budgetItems, item]);
            setIsAdding(false);
          }}
          onCancel={() => setIsAdding(false)}
        />
      )}

      <BudgetLedger
        items={budgetItems}
        totalBudget={totalBudget}
        warningsByItem={warningsByItem}
        activeWarningCount={activeWarnings.length}
        onCycleStatus={(id) =>
          onUpdateItems(budgetItems.map((b) => (b.id === id ? { ...b, status: nextBudgetStatus(b.status) } : b)))
        }
        onDelete={(id) => onUpdateItems(budgetItems.filter((b) => b.id !== id))}
      />
    </div>
  );
};

const SummaryCard = ({
  label,
  value,
  detail,
  tone,
}: {
  label: string;
  value: string;
  detail: string;
  tone: string;
}) => (
  <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-1">
    <div className="text-xs text-slate-400">{label}</div>
    <div className={`text-2xl font-bold font-mono tabular-nums ${tone}`}>{value}</div>
    <div className="text-[11px] text-slate-400">{detail}</div>
  </div>
);
