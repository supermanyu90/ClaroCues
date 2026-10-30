import type { EventCategory } from '../../types';
import type { AccessibilityFundingGap, BudgetWarning } from '../../utils/budgetBenchmark';

/** Scale for the warning bar: 60% of budget fills the bar. */
const BAR_MAX_PERCENT = 60;
const barPosition = (percent: number) => `${Math.min(100, (percent / BAR_MAX_PERCENT) * 100)}%`;

export const FundingGapNotice = ({ gap, eventType }: { gap: AccessibilityFundingGap; eventType: EventCategory }) => (
  <div role="status" className="rounded-xl border border-sky-600/70 bg-sky-950/40 p-5 text-sky-100 space-y-2">
    <h3 className="font-bold text-sm">
      Accessibility is under-funded: {gap.allocatedPercent}% of budget vs a typical {gap.industryAveragePercent}% for a{' '}
      {eventType}
    </h3>
    <p className="text-xs sm:text-sm text-slate-200 leading-relaxed">
      Interpreter teams, CART captioning and assistive listening are what make the event usable for Deaf and
      Hard-of-Hearing guests. Add about ${gap.shortfallAmount.toLocaleString()} to an accessibility line (for example
      &ldquo;ASL Interpreters &amp; CART&rdquo;) so it is tracked against the benchmark.
    </p>
  </div>
);

interface OverspendWarningProps {
  warning: BudgetWarning;
  onAutoCap: () => void;
  onDismiss: () => void;
}

export const OverspendWarning = ({ warning, onAutoCap, onDismiss }: OverspendWarningProps) => {
  const critical = warning.severity === 'critical';
  return (
    <div
      className={`rounded-xl border p-5 ${
        critical
          ? 'bg-rose-950/40 border-rose-600/70 text-rose-100'
          : 'bg-amber-950/40 border-amber-600/70 text-amber-100'
      }`}
    >
      <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
        <div className="space-y-2 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-bold text-sm">
              <span aria-hidden="true">⚠️ </span>
              {warning.categoryDisplayName} is above the industry benchmark
            </h3>
            <span
              className={`text-[11px] font-mono px-2 py-0.5 rounded font-semibold uppercase border ${
                critical
                  ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                  : 'bg-amber-500/20 text-amber-300 border-amber-500/40'
              }`}
            >
              {critical ? 'High overspend' : 'Above average'}
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-200 leading-relaxed">{warning.recommendation}</p>

          <dl className="pt-2 flex flex-wrap items-center gap-3 text-xs font-mono">
            <Stat
              label="Current"
              value={`$${warning.allocatedAmount.toLocaleString()} (${warning.allocatedPercent}%)`}
            />
            <Stat label="Industry average" value={`${warning.industryAveragePercent}%`} />
            <Stat
              label="Warning threshold"
              value={`${warning.warningThresholdPercent}% ($${warning.recommendedMaxAmount.toLocaleString()})`}
            />
            <Stat label="Over by" value={`+$${warning.excessAmount.toLocaleString()}`} highlight />
          </dl>

          <div className="pt-2 max-w-xl space-y-1" aria-hidden="true">
            <div className="relative w-full h-3 bg-slate-950 rounded-full overflow-hidden border border-slate-800">
              <div
                className={`h-full rounded-full ${critical ? 'bg-rose-500' : 'bg-amber-500'}`}
                style={{ width: barPosition(warning.allocatedPercent) }}
              />
              <div
                className="absolute top-0 bottom-0 w-0.5 bg-teal-400"
                style={{ left: barPosition(warning.industryAveragePercent) }}
              />
              <div
                className="absolute top-0 bottom-0 w-0.5 bg-amber-300"
                style={{ left: barPosition(warning.warningThresholdPercent) }}
              />
            </div>
          </div>
        </div>

        <div className="flex flex-row lg:flex-col items-center lg:items-end gap-2 shrink-0">
          <button
            onClick={onAutoCap}
            className="px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-teal-400 hover:bg-teal-300 text-slate-950 transition-colors cursor-pointer whitespace-nowrap"
          >
            Cap at ${warning.recommendedMaxAmount.toLocaleString()}
          </button>
          <button onClick={onDismiss} className="px-3 py-1.5 text-xs text-slate-300 hover:text-white cursor-pointer">
            Dismiss
          </button>
        </div>
      </div>
    </div>
  );
};

const Stat = ({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) => (
  <div
    className={`bg-slate-950/70 px-3 py-1.5 rounded-lg border ${
      highlight ? 'border-rose-500/30 text-rose-300 font-semibold' : 'border-slate-800'
    }`}
  >
    <dt className="inline text-slate-400">{label}: </dt>
    <dd className="inline text-white">{value}</dd>
  </div>
);
