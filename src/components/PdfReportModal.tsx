import { useState } from 'react';
import { type EventPlan } from '../types';
import { Modal } from './ui/Modal';

interface PdfReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  plan: EventPlan;
}

export const PdfReportModal = ({ isOpen, onClose, plan }: PdfReportModalProps) => {
  const [isExporting, setIsExporting] = useState(false);
  if (!isOpen) return null;

  const totalAllocated = plan.budgetAllocation.reduce((acc, b) => acc + b.amount, 0);
  const remaining = plan.totalBudget - totalAllocated;

  const handlePrint = () => {
    window.print();
  };

  // jsPDF (~350 kB) is loaded only when someone actually exports.
  const handleDownloadPdf = async () => {
    setIsExporting(true);
    try {
      const { generateEventPlanPdf } = await import('../utils/pdfGenerator');
      generateEventPlanPdf(plan);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      className="max-w-4xl"
      title="Event Master Dossier & PDF Summary"
      description="Preview the printable summary, then download a PDF or print from the browser."
      actions={
        <>
          <button
            onClick={handleDownloadPdf}
            disabled={isExporting}
            className="px-4 py-2 text-xs font-semibold text-slate-950 bg-teal-400 hover:bg-teal-300 disabled:opacity-60 rounded-lg transition-colors cursor-pointer shadow-sm"
          >
            {isExporting ? 'Preparing PDF…' : 'Download PDF (.pdf)'}
          </button>
          <button
            onClick={handlePrint}
            className="px-3 py-2 text-xs font-semibold text-slate-200 hover:text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg transition-colors cursor-pointer"
          >
            Print via Browser
          </button>
        </>
      }
    >
      <div className="p-6 space-y-6">
        {/* Paper Document Preview Area (Styled like printed paper) */}
        <div className="flex-1 overflow-y-auto bg-slate-950 rounded-xl p-6 sm:p-8 border border-slate-800/80 space-y-6 text-slate-800 font-sans printable-report">
          {/* Printable Document Sheet Container */}
          <div className="bg-white rounded-lg p-8 sm:p-10 space-y-6 shadow-lg max-w-3xl mx-auto border border-slate-200">
            {/* Document Header Banner */}
            <div className="bg-slate-900 text-white rounded-lg p-6 space-y-2">
              <div className="flex items-center justify-between text-xs font-mono text-teal-400 uppercase tracking-widest">
                <span>{plan.eventType} Master Plan</span>
                <span>{plan.dateStr}</span>
              </div>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white">{plan.title}</h1>
              <div className="flex flex-wrap items-center gap-4 text-xs text-slate-300 pt-1 font-mono">
                <span>Guests: {plan.guestCount}</span>
                <span>·</span>
                <span>Budget: ${plan.totalBudget.toLocaleString()}</span>
                <span>·</span>
                <span>Venue: {plan.venueName}</span>
                <span>·</span>
                <span>Theme: {plan.theme}</span>
              </div>
            </div>

            {/* 1. Executive Summary */}
            <div className="space-y-2">
              <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider border-b border-slate-200 pb-1">
                1. Executive Planning & Experience Strategy
              </h2>
              <div className="bg-slate-50 border border-slate-200 rounded p-4 text-xs text-slate-700 leading-relaxed italic">
                &ldquo;{plan.executiveSummary}&rdquo;
              </div>
            </div>

            {/* 2. Key Run-of-Show Milestones */}
            <div className="space-y-3">
              <div className="flex items-center justify-between border-b border-slate-200 pb-1">
                <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                  2. Day-Of Run-of-Show Milestones & Visual Cues
                </h2>
                <span className="text-[11px] text-slate-400 font-mono">
                  {plan.timelineMilestones.length} Key Milestones
                </span>
              </div>

              <div className="border border-slate-200 rounded overflow-hidden">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-100 text-slate-600 font-bold border-b border-slate-200 text-[11px]">
                      <th className="py-2 px-3">Time</th>
                      <th className="py-2 px-3">Milestone Title</th>
                      <th className="py-2 px-3">Cue Type</th>
                      <th className="py-2 px-3">Execution Details</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 font-sans">
                    {plan.timelineMilestones.map((m) => (
                      <tr key={m.id} className="hover:bg-slate-50">
                        <td className="py-2 px-3 font-mono font-bold text-teal-700 whitespace-nowrap">{m.time}</td>
                        <td className="py-2 px-3 font-semibold text-slate-900 whitespace-nowrap">{m.title}</td>
                        <td className="py-2 px-3 uppercase text-[11px] font-mono text-slate-400 whitespace-nowrap">
                          {m.cueType}
                        </td>
                        <td className="py-2 px-3 text-slate-600 text-[11px]">{m.details}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* 3. Budget Allocation Overview */}
            <div className="space-y-3">
              <div className="flex items-center justify-between border-b border-slate-200 pb-1">
                <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                  3. Budget Allocation & Financial Summary
                </h2>
                <span className="text-[11px] text-slate-400 font-mono">
                  Allocated: ${totalAllocated.toLocaleString()} · Balance: ${remaining.toLocaleString()}
                </span>
              </div>

              <div className="border border-slate-200 rounded overflow-hidden">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-100 text-slate-600 font-bold border-b border-slate-200 text-[11px]">
                      <th className="py-2 px-3">Expense Category</th>
                      <th className="py-2 px-3">Priority</th>
                      <th className="py-2 px-3">Status</th>
                      <th className="py-2 px-3 text-right">Cost</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 font-sans">
                    {plan.budgetAllocation.map((item) => (
                      <tr key={item.id}>
                        <td className="py-2 px-3 font-medium text-slate-900">{item.category}</td>
                        <td className="py-2 px-3 text-slate-600 text-[11px]">{item.priority}</td>
                        <td className="py-2 px-3 text-slate-400 font-mono text-[11px]">{item.status}</td>
                        <td className="py-2 px-3 text-right font-mono font-bold text-slate-900">
                          ${item.amount.toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* 4. Vendor Contacts Summary */}
            <div className="space-y-3">
              <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider border-b border-slate-200 pb-1">
                4. Primary Vendor Procurement Directory
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                {plan.vendorChecklist.map((v) => (
                  <div key={v.id} className="border border-slate-200 rounded p-3 space-y-1 bg-slate-50/50">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-900">{v.name}</span>
                      <span className="font-mono text-teal-700 font-semibold">${v.estimatedCost.toLocaleString()}</span>
                    </div>
                    <div className="text-[11px] text-slate-600">
                      Category: {v.category} · Status: {v.status}
                    </div>
                    <div className="text-[11px] text-slate-400 truncate">
                      {v.contact} · {v.emailPhone}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* 5. Accessibility & Sensory Protocols */}
            <div className="space-y-2 border-t border-slate-200 pt-4 text-xs text-slate-600 leading-relaxed">
              <div className="font-bold text-slate-900 uppercase tracking-wider">
                5. DeafSpace & Sensory Accessibility Directives
              </div>
              <ul className="list-disc list-inside space-y-1 text-[11px]">
                <li>
                  <span className="font-semibold text-slate-800">Sightline Clearance:</span>{' '}
                  {plan.sightlineAndSeating.recommendedLayout}
                </li>
                <li>
                  <span className="font-semibold text-slate-800">Interpreter Team:</span>{' '}
                  {plan.interpreterStaffing.teamSize} RID Interpreters on{' '}
                  {plan.interpreterStaffing.rotationIntervalMinutes}-minute rotations
                </li>
                <li>
                  <span className="font-semibold text-slate-800">Centerpiece Constraint:</span> At or below 9.5 inches
                  so faces and signing stay visible across tables
                </li>
              </ul>
            </div>

            {/* Document Stamp */}
            <div className="border-t border-slate-200 pt-4 flex items-center justify-between text-[11px] text-slate-400 font-mono">
              <span>ClaroCues GenAI Event Planning Platform</span>
              <span>Generated on {new Date().toLocaleDateString()}</span>
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
};
