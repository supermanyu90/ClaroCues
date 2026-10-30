import jsPDF from 'jspdf';
import { EventPlan } from '../types';
import { auditPlanAccessibility } from './accessibilityAudit';

/**
 * Generates and downloads a clean, professional PDF summary report of the event plan.
 * Uses jsPDF to render a multi-page document with executive summary, milestones,
 * budget breakdown, and vendor directory.
 */
export function generateEventPlanPdf(plan: EventPlan) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'pt',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 40;
  const contentWidth = pageWidth - margin * 2;
  let y = margin;

  // Helper to check for page break
  const checkPageBreak = (requiredSpace: number) => {
    if (y + requiredSpace > pageHeight - margin - 20) {
      doc.addPage();
      y = margin;
      drawHeaderRunning();
    }
  };

  const drawHeaderRunning = () => {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(140, 140, 140);
    doc.text('ClaroCues Event Planning Master Dossier', margin, 25);
    doc.text(plan.title, pageWidth - margin, 25, { align: 'right' });
    doc.setDrawColor(220, 220, 220);
    doc.setLineWidth(0.5);
    doc.line(margin, 28, pageWidth - margin, 28);
  };

  // --- COVER / HEADER SECTION ---
  doc.setFillColor(15, 23, 42); // Slate-900 header block
  doc.rect(margin, y, contentWidth, 75, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(255, 255, 255);
  doc.text(plan.title, margin + 14, y + 26);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.setTextColor(45, 212, 191); // Teal
  doc.text(
    `${plan.eventType.toUpperCase()} · ${plan.guestCount} GUESTS · BUDGET: $${plan.totalBudget.toLocaleString()} · ${plan.dateStr}`,
    margin + 14,
    y + 44
  );

  doc.setFontSize(8.5);
  doc.setTextColor(203, 213, 225);
  doc.text(`Venue: ${plan.venueName} · Theme: ${plan.theme}`, margin + 14, y + 60);

  y += 95;

  // --- EXECUTIVE SUMMARY SECTION ---
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(15, 23, 42);
  doc.text('1. Executive Planning & Experience Strategy', margin, y);
  y += 14;

  doc.setFillColor(248, 250, 252); // Light background box
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(margin, y, contentWidth, 54, 4, 4, 'FD');

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(51, 65, 85);
  const summaryLines = doc.splitTextToSize(plan.executiveSummary, contentWidth - 20);
  doc.text(summaryLines, margin + 10, y + 16);

  y += 70;

  // --- KEY DAY-OF RUN-OF-SHOW MILESTONES ---
  checkPageBreak(120);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(15, 23, 42);
  doc.text('2. Day-Of Run-of-Show Milestones & Visual Cues', margin, y);
  y += 14;

  // Table header
  doc.setFillColor(241, 245, 249);
  doc.rect(margin, y, contentWidth, 18, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);
  doc.text('TIME', margin + 6, y + 12);
  doc.text('MILESTONE TITLE', margin + 60, y + 12);
  doc.text('CUE TYPE', margin + 220, y + 12);
  doc.text('EXECUTION & ACCESSIBILITY DETAILS', margin + 310, y + 12);
  y += 20;

  plan.timelineMilestones.forEach((item, index) => {
    checkPageBreak(28);

    doc.setFillColor(index % 2 === 0 ? 255 : 249, 250, 251);
    doc.rect(margin, y, contentWidth, 22, 'F');
    doc.setDrawColor(241, 245, 249);
    doc.line(margin, y + 22, margin + contentWidth, y + 22);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(13, 148, 136); // Teal
    doc.text(item.time, margin + 6, y + 14);

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 41, 59);
    const truncatedTitle = item.title.length > 28 ? item.title.substring(0, 28) + '...' : item.title;
    doc.text(truncatedTitle, margin + 60, y + 14);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text(item.cueType.toUpperCase(), margin + 220, y + 14);

    const truncatedDetails =
      item.details.length > 46 ? item.details.substring(0, 46) + '...' : item.details;
    doc.text(truncatedDetails, margin + 310, y + 14);

    y += 22;
  });

  y += 20;

  // --- FINANCIAL & BUDGET ALLOCATION BREAKDOWN ---
  checkPageBreak(130);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(15, 23, 42);
  doc.text('3. Budget Allocation & Financial Ledger', margin, y);
  y += 14;

  const totalAllocated = plan.budgetAllocation.reduce((acc, b) => acc + b.amount, 0);
  const remaining = plan.totalBudget - totalAllocated;

  doc.setFillColor(241, 245, 249);
  doc.rect(margin, y, contentWidth, 18, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);
  doc.text('EXPENSE CATEGORY', margin + 6, y + 12);
  doc.text('PRIORITY', margin + 200, y + 12);
  doc.text('STATUS', margin + 290, y + 12);
  doc.text('COST ($)', margin + 370, y + 12);
  doc.text('NOTES', margin + 430, y + 12);
  y += 20;

  plan.budgetAllocation.forEach((item, index) => {
    checkPageBreak(24);

    doc.setFillColor(index % 2 === 0 ? 255 : 249, 250, 251);
    doc.rect(margin, y, contentWidth, 20, 'F');

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(30, 41, 59);
    const catName = item.category.length > 32 ? item.category.substring(0, 32) + '...' : item.category;
    doc.text(catName, margin + 6, y + 13);

    doc.setTextColor(item.priority === 'Essential' ? 225 : 71, item.priority === 'Essential' ? 29 : 85, 72);
    doc.text(item.priority, margin + 200, y + 13);

    doc.setTextColor(100, 116, 139);
    doc.text(item.status, margin + 290, y + 13);

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text(`$${item.amount.toLocaleString()}`, margin + 370, y + 13);

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 116, 139);
    const notePreview = item.notes.length > 22 ? item.notes.substring(0, 22) + '...' : item.notes;
    doc.text(notePreview, margin + 430, y + 13);

    y += 20;
  });

  // Budget summary total line
  doc.setFillColor(248, 250, 252);
  doc.rect(margin, y, contentWidth, 22, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(15, 23, 42);
  doc.text(`TOTAL ALLOCATED: $${totalAllocated.toLocaleString()}`, margin + 6, y + 15);
  doc.setTextColor(remaining >= 0 ? 13 : 225, remaining >= 0 ? 148 : 29, 72);
  doc.text(`REMAINING SURPLUS: $${remaining.toLocaleString()}`, margin + 320, y + 15);
  y += 34;

  // --- VENDOR PARTNERS & CHECKLIST ---
  checkPageBreak(120);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(15, 23, 42);
  doc.text('4. Vendor Procurement & Contacts Directory', margin, y);
  y += 14;

  doc.setFillColor(241, 245, 249);
  doc.rect(margin, y, contentWidth, 18, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);
  doc.text('CATEGORY', margin + 6, y + 12);
  doc.text('VENDOR NAME & CONTACT', margin + 110, y + 12);
  doc.text('STATUS', margin + 280, y + 12);
  doc.text('ESTIMATED COST', margin + 370, y + 12);
  doc.text('DEADLINE', margin + 460, y + 12);
  y += 20;

  plan.vendorChecklist.forEach((v, index) => {
    checkPageBreak(24);
    doc.setFillColor(index % 2 === 0 ? 255 : 249, 250, 251);
    doc.rect(margin, y, contentWidth, 20, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(13, 148, 136);
    doc.text(v.category, margin + 6, y + 13);

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(30, 41, 59);
    const vendorLabel = `${v.name} (${v.contact})`;
    doc.text(vendorLabel.length > 30 ? vendorLabel.substring(0, 30) + '...' : vendorLabel, margin + 110, y + 13);

    doc.setTextColor(v.status === 'Booked' ? 16 : 100, v.status === 'Booked' ? 185 : 116, 129);
    doc.text(v.status, margin + 280, y + 13);

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text(`$${v.estimatedCost.toLocaleString()}`, margin + 370, y + 13);

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 116, 139);
    doc.text(v.deadline, margin + 460, y + 13);

    y += 20;
  });

  y += 26;

  // --- ACCESSIBILITY & SENSORY CHOREOGRAPHY SPECIFICATIONS ---
  checkPageBreak(100);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(15, 23, 42);
  doc.text('5. DeafSpace & Sensory Accessibility Specifications', margin, y);
  y += 14;

  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(margin, y, contentWidth, 54, 4, 4, 'FD');

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(51, 65, 85);
  doc.text(`• Sightline Layout: ${plan.sightlineAndSeating.recommendedLayout}`, margin + 10, y + 14);
  doc.text(
    `• Interpreter Staffing: ${plan.interpreterStaffing.teamSize} RID Interpreters with ${plan.interpreterStaffing.rotationIntervalMinutes}-minute rotations`,
    margin + 10,
    y + 28
  );
  doc.text(
    `• Centerpiece Rule: Centerpieces at or below 9.5 inches so signing stays visible across tables`,
    margin + 10,
    y + 42
  );

  y += 70;

  // --- ACCESS READINESS AUDIT ---
  const audit = auditPlanAccessibility(plan, plan.seatingLayout);
  checkPageBreak(40);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(15, 23, 42);
  doc.text(`6. Access Readiness Audit: ${audit.score}/100`, margin, y);
  y += 16;
  doc.setFontSize(8.5);
  for (const check of audit.checks) {
    const line = `[${check.status.toUpperCase()}] ${check.label}: ${check.detail}${check.fix ? ` Fix: ${check.fix}` : ''}`;
    const wrapped: string[] = doc.splitTextToSize(line, contentWidth - 10);
    checkPageBreak(wrapped.length * 11 + 4);
    doc.setFont('helvetica', check.status === 'pass' ? 'normal' : 'bold');
    doc.setTextColor(check.status === 'fail' ? 185 : 51, check.status === 'fail' ? 28 : 65, check.status === 'fail' ? 28 : 85);
    doc.text(wrapped, margin + 4, y);
    y += wrapped.length * 11 + 3;
  }

  // --- FOOTER ON ALL PAGES ---
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(156, 163, 175);
    doc.text(
      `Generated by ClaroCues GenAI Event Planner · ${new Date().toLocaleDateString()} · Page ${i} of ${totalPages}`,
      pageWidth / 2,
      pageHeight - 16,
      { align: 'center' }
    );
  }

  // Trigger browser download without opening external windows
  const safeFilename = `${plan.title.replace(/[^a-zA-Z0-9]/g, '_')}_Summary_Report.pdf`;
  doc.save(safeFilename);
}
