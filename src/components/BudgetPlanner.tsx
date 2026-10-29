import React, { useState, useMemo } from 'react';
import { BudgetItem, EventCategory } from '../types';
import {
  analyzeBudgetAgainstBenchmarks,
  classifyCategory,
  INDUSTRY_BENCHMARKS,
  BudgetWarning,
  StandardCategoryKey,
} from '../utils/budgetBenchmark';

interface BudgetPlannerProps {
  budgetItems: BudgetItem[];
  totalBudget: number;
  eventType?: EventCategory;
  onUpdateItems: (items: BudgetItem[]) => void;
  onUpdateTotalBudget: (total: number) => void;
}

export const BudgetPlanner: React.FC<BudgetPlannerProps> = ({
  budgetItems,
  totalBudget,
  eventType = 'wedding',
  onUpdateItems,
  onUpdateTotalBudget,
}) => {
  const [filterPriority, setFilterPriority] = useState<string>('all');
  const [isAddingItem, setIsAddingItem] = useState<boolean>(false);
  const [showBenchmarksModal, setShowBenchmarksModal] = useState<boolean>(false);
  const [dismissedWarnings, setDismissedWarnings] = useState<Record<string, boolean>>({});

  // New item form state
  const [newCategory, setNewCategory] = useState<string>('');
  const [newAmount, setNewAmount] = useState<string>('1200');
  const [newPriority, setNewPriority] = useState<'Essential' | 'High' | 'Recommended' | 'Base'>('High');
  const [newNotes, setNewNotes] = useState<string>('');

  // Financial calculations
  const totalAllocated = budgetItems.reduce((acc, item) => acc + item.amount, 0);
  const balanceRemaining = totalBudget - totalAllocated;
  const accessibilitySpecificTotal = budgetItems
    .filter((b) => b.priority !== 'Base')
    .reduce((acc, item) => acc + item.amount, 0);

  // Industry average benchmark warnings analysis
  const allWarnings = useMemo(() => {
    return analyzeBudgetAgainstBenchmarks(budgetItems, totalBudget, eventType);
  }, [budgetItems, totalBudget, eventType]);

  const activeWarnings = useMemo(() => {
    return allWarnings.filter((w) => !dismissedWarnings[w.categoryKey]);
  }, [allWarnings, dismissedWarnings]);

  // Set of item IDs that belong to an over-budget category
  const warnedItemIds = useMemo(() => {
    const ids = new Set<string>();
    for (const warning of allWarnings) {
      for (const id of warning.affectedItemIds) {
        ids.add(id);
      }
    }
    return ids;
  }, [allWarnings]);

  // Map from item ID to its warning info
  const itemWarningMap = useMemo(() => {
    const map = new Map<string, BudgetWarning>();
    for (const warning of allWarnings) {
      for (const id of warning.affectedItemIds) {
        map.set(id, warning);
      }
    }
    return map;
  }, [allWarnings]);

  // Category summary for benchmark table
  const categoryBreakdown = useMemo(() => {
    const benchmarks = INDUSTRY_BENCHMARKS[eventType] || INDUSTRY_BENCHMARKS.wedding;
    const totals: Record<StandardCategoryKey, number> = {
      venue: 0,
      catering: 0,
      photography: 0,
      entertainment: 0,
      decor: 0,
      accessibility: 0,
    };

    for (const item of budgetItems) {
      const key = classifyCategory(item.category);
      if (key && totals[key] !== undefined) {
        totals[key] += item.amount;
      }
    }

    return (Object.keys(benchmarks) as StandardCategoryKey[]).map((key) => {
      const b = benchmarks[key];
      const spent = totals[key];
      const percent = totalBudget > 0 ? (spent / totalBudget) * 100 : 0;
      const isOver = percent > b.warningThresholdPercent;
      return {
        key,
        displayName: b.displayName,
        spent,
        percent: Math.round(percent * 10) / 10,
        averagePercent: b.industryAveragePercent,
        warningThresholdPercent: b.warningThresholdPercent,
        isOver,
        description: b.description,
      };
    });
  }, [budgetItems, totalBudget, eventType]);

  const filteredItems = budgetItems.filter(
    (item) => filterPriority === 'all' || item.priority.toLowerCase() === filterPriority.toLowerCase()
  );

  const handleToggleStatus = (id: string) => {
    const nextStatusMap: Record<string, 'Estimated' | 'Booked' | 'Paid'> = {
      Estimated: 'Booked',
      Booked: 'Paid',
      Paid: 'Estimated',
    };
    onUpdateItems(
      budgetItems.map((b) => (b.id === id ? { ...b, status: nextStatusMap[b.status] } : b))
    );
  };

  const handleAddItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCategory.trim()) return;

    const newItem: BudgetItem = {
      id: `b-${Date.now()}`,
      category: newCategory.trim(),
      amount: parseInt(newAmount) || 0,
      priority: newPriority,
      notes: newNotes.trim() || 'Custom budget item',
      status: 'Estimated',
    };

    onUpdateItems([...budgetItems, newItem]);
    setNewCategory('');
    setNewAmount('1000');
    setNewNotes('');
    setIsAddingItem(false);
  };

  const handleDeleteItem = (id: string) => {
    onUpdateItems(budgetItems.filter((b) => b.id !== id));
  };

  // Auto-cap function: proportionately scales down line items in an over-allocated category
  const handleAutoCapCategory = (warning: BudgetWarning) => {
    if (warning.allocatedAmount <= 0) return;
    const targetAmount = warning.recommendedMaxAmount;
    const scaleFactor = targetAmount / warning.allocatedAmount;

    const updated = budgetItems.map((item) => {
      if (warning.affectedItemIds.includes(item.id)) {
        return {
          ...item,
          amount: Math.round(item.amount * scaleFactor),
        };
      }
      return item;
    });

    onUpdateItems(updated);
  };

  const exportCSV = () => {
    const headers = ['Category', 'Amount', 'Priority', 'Status', 'Notes'];
    const rows = budgetItems.map((b) => [
      `"${b.category.replace(/"/g, '""')}"`,
      b.amount,
      b.priority,
      b.status,
      `"${b.notes.replace(/"/g, '""')}"`,
    ]);
    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `aurasync_${eventType}_budget.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & KPI Stat Strip */}
      <div className="flex flex-col lg:flex-row gap-6 items-start justify-between bg-slate-900 border border-slate-800 rounded-xl p-6">
        <div className="space-y-2 max-w-2xl">
          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400 font-medium">
            <span className="capitalize text-teal-400 font-semibold">{eventType} Budget Model</span>
            <span aria-hidden="true">·</span>
            <span>Industry Benchmark Guardrails</span>
            <span aria-hidden="true">·</span>
            <span>Certified DHH & Accessibility Quotas</span>
          </div>
          <h2 className="text-xl font-bold text-white tracking-tight">
            Automated Budget Planner & Benchmark Guardrails
          </h2>
          <p className="text-sm text-slate-300 leading-relaxed">
            Maintains healthy fiscal equilibrium for your {eventType}. Automatically detects if venue, catering, or entertainment allocations exceed industry percentage averages, safeguarding your contingency and accessibility investments.
          </p>
        </div>

        {/* Quick Actions */}
        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <button
            onClick={() => setShowBenchmarksModal((prev) => !prev)}
            className="px-3.5 py-2 text-xs font-semibold text-teal-300 bg-slate-950 hover:bg-slate-800 border border-teal-500/40 rounded-lg transition-colors cursor-pointer flex items-center gap-1.5"
          >
            <span>📊 {showBenchmarksModal ? 'Hide Benchmarks' : 'Industry Benchmarks'}</span>
          </button>
          <button
            onClick={() => setIsAddingItem(true)}
            className="px-3.5 py-2 text-xs font-semibold text-slate-950 bg-teal-400 hover:bg-teal-300 rounded-lg transition-colors cursor-pointer"
          >
            + Add Expense Item
          </button>
          <button
            onClick={exportCSV}
            className="px-3 py-2 text-xs font-semibold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg transition-colors cursor-pointer"
          >
            Export CSV
          </button>
        </div>
      </div>

      {/* ACTIVE WARNING CALLOUT STRIP */}
      {activeWarnings.length > 0 && (
        <div className="space-y-3">
          {activeWarnings.map((warning) => (
            <div
              key={warning.categoryKey}
              className={`rounded-xl border p-5 shadow-lg transition-all animate-in fade-in duration-200 ${
                warning.severity === 'critical'
                  ? 'bg-rose-950/40 border-rose-600/70 text-rose-100'
                  : 'bg-amber-950/40 border-amber-600/70 text-amber-100'
              }`}
            >
              <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
                {/* Warning Content */}
                <div className="space-y-2 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-base">⚠️</span>
                    <span className="font-bold text-sm tracking-tight">
                      Industry Allocation Warning: {warning.categoryDisplayName} Exceeds Standard Benchmark
                    </span>
                    <span
                      className={`text-[10px] font-mono px-2 py-0.5 rounded font-semibold uppercase ${
                        warning.severity === 'critical'
                          ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                          : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                      }`}
                    >
                      {warning.severity === 'critical' ? 'High Overspend' : 'Above Average'}
                    </span>
                  </div>

                  <p className="text-xs sm:text-sm text-slate-200 leading-relaxed">
                    {warning.recommendation}
                  </p>

                  {/* Benchmark Comparison Stats */}
                  <div className="pt-2 flex flex-wrap items-center gap-4 text-xs font-mono">
                    <div className="bg-slate-950/70 px-3 py-1.5 rounded-lg border border-slate-800">
                      <span className="text-slate-400">Current Allocation: </span>
                      <span className="font-bold text-white">
                        ${warning.allocatedAmount.toLocaleString()} ({warning.allocatedPercent}%)
                      </span>
                    </div>

                    <div className="bg-slate-950/70 px-3 py-1.5 rounded-lg border border-slate-800">
                      <span className="text-slate-400">Industry Average: </span>
                      <span className="text-teal-300">
                        {warning.industryAveragePercent}% of budget
                      </span>
                    </div>

                    <div className="bg-slate-950/70 px-3 py-1.5 rounded-lg border border-slate-800">
                      <span className="text-slate-400">Warning Threshold: </span>
                      <span className="text-amber-300">
                        {warning.warningThresholdPercent}% (${warning.recommendedMaxAmount.toLocaleString()})
                      </span>
                    </div>

                    <div className="bg-slate-950/70 px-3 py-1.5 rounded-lg border border-rose-500/30 text-rose-300 font-semibold">
                      <span>Exceeds Ceiling by: </span>
                      <span>+${warning.excessAmount.toLocaleString()}</span>
                    </div>
                  </div>

                  {/* Visual Benchmark Progress Bar */}
                  <div className="pt-2 max-w-xl space-y-1">
                    <div className="flex justify-between text-[11px] text-slate-400">
                      <span>0%</span>
                      <span className="text-teal-400">Avg ({warning.industryAveragePercent}%)</span>
                      <span className="text-amber-400">Threshold ({warning.warningThresholdPercent}%)</span>
                      <span className="font-bold text-rose-400">Allocated ({warning.allocatedPercent}%)</span>
                    </div>
                    <div className="relative w-full h-3 bg-slate-950 rounded-full overflow-hidden border border-slate-800">
                      {/* Current Fill */}
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          warning.severity === 'critical' ? 'bg-rose-500' : 'bg-amber-500'
                        }`}
                        style={{ width: `${Math.min(100, (warning.allocatedPercent / 60) * 100)}%` }}
                      />
                      {/* Industry Average Marker */}
                      <div
                        className="absolute top-0 bottom-0 w-0.5 bg-teal-400 shadow"
                        style={{ left: `${(warning.industryAveragePercent / 60) * 100}%` }}
                        title={`Industry Average: ${warning.industryAveragePercent}%`}
                      />
                      {/* Threshold Marker */}
                      <div
                        className="absolute top-0 bottom-0 w-0.5 bg-amber-300 shadow"
                        style={{ left: `${(warning.warningThresholdPercent / 60) * 100}%` }}
                        title={`Warning Threshold: ${warning.warningThresholdPercent}%`}
                      />
                    </div>
                  </div>
                </div>

                {/* Quick Rebalance Buttons */}
                <div className="flex flex-row lg:flex-col items-center lg:items-end gap-2 shrink-0">
                  <button
                    onClick={() => handleAutoCapCategory(warning)}
                    title={`Cap ${warning.categoryDisplayName} to ${warning.warningThresholdPercent}% ($${warning.recommendedMaxAmount.toLocaleString()})`}
                    className="px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-teal-400 hover:bg-teal-300 text-slate-950 transition-colors shadow-sm cursor-pointer whitespace-nowrap"
                  >
                    Auto-Cap to ${warning.recommendedMaxAmount.toLocaleString()}
                  </button>
                  <button
                    onClick={() =>
                      setDismissedWarnings((prev) => ({ ...prev, [warning.categoryKey]: true }))
                    }
                    className="px-3 py-1.5 text-xs text-slate-400 hover:text-white transition-colors cursor-pointer"
                  >
                    Dismiss Warning
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* INDUSTRY BENCHMARK BREAKDOWN DRAWER */}
      {showBenchmarksModal && (
        <div className="bg-slate-900 border border-teal-500/40 rounded-xl p-6 space-y-4 shadow-xl animate-in fade-in duration-200">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div>
              <h3 className="text-sm font-bold text-white tracking-wide flex items-center gap-2">
                <span>Industry Benchmark Spectrum for {eventType.toUpperCase()} Planning</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-teal-500/20 text-teal-300">
                  Standard Cap Guide
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                Derived from professional event economics studies (The Knot, Eventbrite, and RID Accessibility guidelines).
              </p>
            </div>
            <button
              onClick={() => setShowBenchmarksModal(false)}
              className="text-xs text-slate-400 hover:text-white cursor-pointer"
            >
              ✕ Close
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {categoryBreakdown.map((cat) => (
              <div
                key={cat.key}
                className={`p-4 rounded-xl border transition-all ${
                  cat.isOver
                    ? 'bg-rose-950/20 border-rose-500/50'
                    : 'bg-slate-950 border-slate-800'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-semibold text-white text-xs">{cat.displayName}</span>
                  <span
                    className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
                      cat.isOver
                        ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                        : 'bg-teal-500/10 text-teal-300 border border-teal-500/20'
                    }`}
                  >
                    {cat.isOver ? 'Exceeds Benchmark' : 'Balanced'}
                  </span>
                </div>

                <div className="text-lg font-bold font-mono text-white tabular-nums">
                  ${cat.spent.toLocaleString()}
                  <span className="text-xs font-normal text-slate-400 ml-1.5 font-sans">
                    ({cat.percent}% of budget)
                  </span>
                </div>

                <p className="text-[11px] text-slate-400 mt-1 line-clamp-1">{cat.description}</p>

                <div className="mt-3 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px] font-mono text-slate-400">
                  <span>Industry Avg: {cat.averagePercent}%</span>
                  <span className={cat.isOver ? 'text-rose-400 font-semibold' : 'text-slate-400'}>
                    Warning Cap: {cat.warningThresholdPercent}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 4-Column KPI Financial Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-1">
          <div className="text-xs text-slate-400">Total Event Budget</div>
          <div className="text-2xl font-bold text-white font-mono tabular-nums">
            ${totalBudget.toLocaleString()}
          </div>
          <div className="text-[11px] text-slate-500">Master expenditure cap</div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-1">
          <div className="text-xs text-slate-400">Allocated Expenditures</div>
          <div className="text-2xl font-bold text-teal-400 font-mono tabular-nums">
            ${totalAllocated.toLocaleString()}
          </div>
          <div className="text-[11px] text-slate-500 font-mono tabular-nums">
            {totalBudget > 0 ? Math.round((totalAllocated / totalBudget) * 100) : 0}% of total budget
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-1">
          <div className="text-xs text-slate-400">Dedicated Accessibility Total</div>
          <div className="text-2xl font-bold text-sky-400 font-mono tabular-nums">
            ${accessibilitySpecificTotal.toLocaleString()}
          </div>
          <div className="text-[11px] text-slate-500 font-mono tabular-nums">
            {totalBudget > 0 ? Math.round((accessibilitySpecificTotal / totalBudget) * 100) : 0}% dedicated to DHH access
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-1">
          <div className="text-xs text-slate-400">Remaining Buffer</div>
          <div
            className={`text-2xl font-bold font-mono tabular-nums ${
              balanceRemaining >= 0 ? 'text-emerald-400' : 'text-rose-400'
            }`}
          >
            ${balanceRemaining.toLocaleString()}
          </div>
          <div className="text-[11px] text-slate-500 font-mono">
            {balanceRemaining >= 0 ? 'Surplus buffer available' : 'Budget exceeded'}
          </div>
        </div>
      </div>

      {/* Add Item Form Modal */}
      {isAddingItem && (
        <form
          onSubmit={handleAddItem}
          className="bg-slate-900 border border-teal-500/50 rounded-xl p-5 space-y-4 shadow-lg animate-in fade-in"
        >
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-white">Add Expense Item</h3>
            <button
              type="button"
              onClick={() => setIsAddingItem(false)}
              className="text-xs text-slate-400 hover:text-white cursor-pointer"
            >
              Cancel
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <div className="space-y-1">
              <label className="text-slate-300">Category Name</label>
              <input
                type="text"
                required
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
                placeholder="e.g. Catering & Beverage, Venue Rental..."
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-100 focus:outline-none focus:border-teal-500"
              />
            </div>

            <div className="space-y-1">
              <label className="text-slate-300">Estimated Cost ($)</label>
              <input
                type="number"
                required
                value={newAmount}
                onChange={(e) => setNewAmount(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-100 font-mono tabular-nums focus:outline-none focus:border-teal-500"
              />
            </div>

            <div className="space-y-1">
              <label className="text-slate-300">Priority Tier</label>
              <select
                value={newPriority}
                onChange={(e) => setNewPriority(e.target.value as any)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-100 focus:outline-none focus:border-teal-500"
              >
                <option value="Essential">Essential (Core Experience / Access)</option>
                <option value="High">High (Recommended Production)</option>
                <option value="Recommended">Recommended</option>
                <option value="Base">Base Logistics</option>
              </select>
            </div>
          </div>

          <div className="space-y-1 text-xs">
            <label className="text-slate-300">Notes & Specification</label>
            <input
              type="text"
              value={newNotes}
              onChange={(e) => setNewNotes(e.target.value)}
              placeholder="e.g. Tapas stations, acoustics, or provider contract terms"
              className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-100 focus:outline-none focus:border-teal-500"
            />
          </div>

          <div className="flex justify-end gap-2">
            <button
              type="submit"
              className="px-4 py-2 text-xs font-semibold text-slate-950 bg-teal-400 hover:bg-teal-300 rounded-lg cursor-pointer"
            >
              Save Line Item
            </button>
          </div>
        </form>
      )}

      {/* Main Budget Items Data Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
        {/* Table Filter Segmented Bar */}
        <div className="px-6 py-4 border-b border-slate-800 flex flex-wrap items-center justify-between gap-4">
          <div className="text-sm font-semibold text-white flex items-center gap-2">
            <span>Expense Ledger & Procurement Status</span>
            {activeWarnings.length > 0 && (
              <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                {activeWarnings.length} Warnings Active
              </span>
            )}
          </div>

          {/* Interactive filter tabs */}
          <div className="flex items-center gap-1 p-1 bg-slate-950 border border-slate-800 rounded-lg text-xs">
            {['all', 'essential', 'high', 'recommended', 'base'].map((tab) => (
              <button
                key={tab}
                onClick={() => setFilterPriority(tab)}
                className={`px-3 py-1 font-medium capitalize rounded transition-colors cursor-pointer ${
                  filterPriority === tab
                    ? 'bg-slate-800 text-teal-300 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        {/* Dense Data Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-950/60 text-slate-400 uppercase tracking-wider font-medium text-[11px]">
                <th className="py-3 px-6">Expense Category</th>
                <th className="py-3 px-4">Priority</th>
                <th className="py-3 px-4 text-right">Cost</th>
                <th className="py-3 px-4 text-right">Share</th>
                <th className="py-3 px-4">Benchmark Status</th>
                <th className="py-3 px-4">Procurement</th>
                <th className="py-3 px-6">Technical Specifications</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-sans">
              {filteredItems.map((item) => {
                const isWarned = warnedItemIds.has(item.id);
                const warning = itemWarningMap.get(item.id);
                const percentOfTotal =
                  totalBudget > 0 ? Math.round(((item.amount / totalBudget) * 100) * 10) / 10 : 0;

                return (
                  <tr
                    key={item.id}
                    className={`transition-colors ${
                      isWarned ? 'bg-amber-950/15 hover:bg-amber-950/25' : 'hover:bg-slate-800/40'
                    }`}
                  >
                    <td className="py-3.5 px-6 font-medium text-slate-100 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        {isWarned && (
                          <span title="Exceeds industry allocation benchmark" className="text-amber-400">
                            ⚠️
                          </span>
                        )}
                        <span>{item.category}</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <span
                        className={`text-[11px] font-medium ${
                          item.priority === 'Essential'
                            ? 'text-rose-400'
                            : item.priority === 'High'
                            ? 'text-amber-400'
                            : item.priority === 'Recommended'
                            ? 'text-teal-400'
                            : 'text-slate-400'
                        }`}
                      >
                        {item.priority}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono font-semibold text-slate-100 tabular-nums whitespace-nowrap">
                      ${item.amount.toLocaleString()}
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono text-slate-400 tabular-nums whitespace-nowrap">
                      {percentOfTotal}%
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      {isWarned && warning ? (
                        <span
                          title={`Category total is ${warning.allocatedPercent}% vs ${warning.warningThresholdPercent}% warning cap`}
                          className="inline-flex items-center gap-1 text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40"
                        >
                          <span>Exceeds Avg ({warning.allocatedPercent}%)</span>
                        </span>
                      ) : (
                        <span className="text-[10px] font-mono text-slate-500">
                          ✓ In Range
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <button
                        onClick={() => handleToggleStatus(item.id)}
                        className="text-xs font-mono underline hover:text-teal-300 cursor-pointer text-slate-300"
                      >
                        {item.status}
                      </button>
                    </td>
                    <td className="py-3.5 px-6 text-slate-400 text-[11px] max-w-xs truncate">
                      {item.notes}
                    </td>
                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      <button
                        onClick={() => handleDeleteItem(item.id)}
                        className="text-[11px] text-slate-500 hover:text-rose-400 transition-colors cursor-pointer"
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
    </div>
  );
};
