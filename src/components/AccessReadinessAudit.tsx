import type { AuditReport, AuditStatus } from '../utils/accessibilityAudit';

interface AccessReadinessAuditProps {
  report: AuditReport;
  onOpenFloorplan: () => void;
  onOpenBudget: () => void;
}

const STATUS_STYLE: Record<AuditStatus, { label: string; icon: string; className: string }> = {
  fail: { label: 'Needs action', icon: '✕', className: 'border-rose-600/60 bg-rose-950/40 text-rose-100' },
  warn: { label: 'Review', icon: '!', className: 'border-amber-600/60 bg-amber-950/40 text-amber-100' },
  pass: { label: 'Ready', icon: '✓', className: 'border-emerald-700/50 bg-emerald-950/30 text-emerald-100' },
};

const ORDER: AuditStatus[] = ['fail', 'warn', 'pass'];

export const AccessReadinessAudit = ({ report, onOpenFloorplan, onOpenBudget }: AccessReadinessAuditProps) => {
  const sorted = [...report.checks].sort((a, b) => ORDER.indexOf(a.status) - ORDER.indexOf(b.status));

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row gap-6 items-start justify-between bg-slate-900 border border-slate-800 rounded-xl p-6">
        <div className="space-y-2 max-w-2xl">
          <h2 className="text-xl font-bold text-white tracking-tight">Access Readiness Audit</h2>
          <p className="text-sm text-slate-300 leading-relaxed">
            Checks this plan against established Deaf-access practice: teamed interpreters, live captions, visual
            equivalents for every sound cue, DeafSpace sightlines, DeafBlind provision and budget. The score is
            recalculated from your plan whenever you edit it.
          </p>
        </div>
        <div className="bg-slate-950 border border-slate-800 rounded-lg p-4 text-center min-w-[160px]">
          <div className="text-xs text-slate-400">Readiness score</div>
          <div
            className={`text-4xl font-bold font-mono tabular-nums ${
              report.score >= 85 ? 'text-emerald-400' : report.score >= 60 ? 'text-amber-400' : 'text-rose-400'
            }`}
          >
            {report.score}
          </div>
          <div className="text-[11px] text-slate-400">
            {report.counts.pass} ready · {report.counts.warn} review · {report.counts.fail} action
          </div>
        </div>
      </div>

      <ul className="space-y-3" aria-label="Audit checks">
        {sorted.map((check) => {
          const style = STATUS_STYLE[check.status];
          return (
            <li key={check.id} className={`rounded-xl border p-4 ${style.className}`}>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="font-semibold text-sm flex items-center gap-2">
                  <span
                    aria-hidden="true"
                    className="inline-flex w-5 h-5 items-center justify-center rounded-full bg-slate-950/60 text-xs font-bold"
                  >
                    {style.icon}
                  </span>
                  {check.label}
                </h3>
                <span className="text-[11px] font-mono uppercase tracking-wider">{style.label}</span>
              </div>
              <p className="mt-1.5 text-xs text-slate-200 leading-relaxed">{check.detail}</p>
              {check.fix && (
                <p className="mt-1 text-xs text-slate-300">
                  <span className="font-semibold">How to fix: </span>
                  {check.fix}
                  {check.id === 'sightlines' && (
                    <button
                      onClick={onOpenFloorplan}
                      className="ml-2 underline text-teal-300 hover:text-teal-200 cursor-pointer"
                    >
                      Open floorplan
                    </button>
                  )}
                  {check.id === 'budget' && (
                    <button
                      onClick={onOpenBudget}
                      className="ml-2 underline text-teal-300 hover:text-teal-200 cursor-pointer"
                    >
                      Open budget
                    </button>
                  )}
                </p>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
};
