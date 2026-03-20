import { jsPDF } from 'jspdf';
import type { ScanSummary, ModuleScoreData, AlignmentIssueData } from '@/types/brand-alignment';

const MODULE_LABELS: Record<string, string> = {
  BRAND_FOUNDATION: 'Brand Foundation',
  BUSINESS_STRATEGY: 'Business Strategy',
  BRANDSTYLE: 'Brandstyle',
  PERSONAS: 'Personas',
  PRODUCTS_SERVICES: 'Products & Services',
  MARKET_INSIGHTS: 'Trend Radar',
};

const SEVERITY_LABELS: Record<string, string> = {
  CRITICAL: 'CRITICAL',
  WARNING: 'WARNING',
  SUGGESTION: 'SUGGESTION',
};

interface AlignmentExportData {
  scan: ScanSummary;
  modules: ModuleScoreData[];
  issues: AlignmentIssueData[];
}

/** Export Brand Alignment scan results as a professionally formatted PDF */
export function exportAlignmentPdf(data: AlignmentExportData) {
  try {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 20;
  const contentWidth = pageWidth - margin * 2;
  let y = 20;

  const checkPageBreak = (needed: number) => {
    if (y + needed > 270) {
      doc.addPage();
      y = 20;
    }
  };

  // ── Header bar ──
  doc.setFillColor(59, 130, 246); // blue-500
  doc.rect(0, 0, pageWidth, 14, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('BRANDDOCK', margin, 9);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text('Brand Alignment Report', pageWidth - margin, 9, { align: 'right' });
  y = 24;

  // ── Title ──
  doc.setTextColor(17, 24, 39);
  doc.setFontSize(22);
  doc.setFont('helvetica', 'bold');
  doc.text('Brand Alignment Scan', margin, y);
  y += 8;

  // ── Metadata ──
  doc.setTextColor(107, 114, 128);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  const scanDate = data.scan.completedAt
    ? new Date(data.scan.completedAt).toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' })
    : new Date().toLocaleDateString('en-US');
  doc.text(`Scan Date: ${scanDate}  |  Status: ${data.scan.status}`, margin, y);
  y += 8;

  // ── Divider ──
  doc.setDrawColor(209, 213, 219);
  doc.line(margin, y, pageWidth - margin, y);
  y += 8;

  // ── Overall Score (big number) ──
  checkPageBreak(30);
  doc.setTextColor(17, 24, 39);
  doc.setFontSize(48);
  doc.setFont('helvetica', 'bold');
  doc.text(`${Math.round(data.scan.score)}%`, margin, y + 12);
  doc.setFontSize(12);
  doc.setTextColor(107, 114, 128);
  doc.setFont('helvetica', 'normal');
  doc.text('Overall Alignment Score', margin + 55, y + 2);

  // Stats next to score
  doc.setFontSize(10);
  doc.text(`Aligned: ${data.scan.alignedCount}`, margin + 55, y + 9);
  doc.text(`Needs Review: ${data.scan.reviewCount}`, margin + 100, y + 9);
  doc.text(`Misaligned: ${data.scan.misalignedCount}`, margin + 55, y + 16);
  y += 28;

  // ── Module Scores ──
  if (data.modules.length > 0) {
    checkPageBreak(14);
    doc.setTextColor(59, 130, 246);
    doc.setFontSize(13);
    doc.setFont('helvetica', 'bold');
    doc.text('Module Scores', margin, y);
    y += 7;

    data.modules.forEach((mod) => {
      checkPageBreak(14);
      const label = MODULE_LABELS[mod.moduleName] ?? mod.moduleName;
      const score = Math.round(mod.score);

      doc.setTextColor(17, 24, 39);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text(label, margin, y);
      doc.setFont('helvetica', 'normal');
      doc.text(`${score}%`, margin + 80, y);

      // Score bar
      const barX = margin + 92;
      const barWidth = contentWidth - 92;
      doc.setFillColor(229, 231, 235); // gray-200
      doc.rect(barX, y - 3, barWidth, 4, 'F');
      if (score >= 80) doc.setFillColor(16, 185, 129); // emerald
      else if (score >= 60) doc.setFillColor(245, 158, 11); // amber
      else doc.setFillColor(239, 68, 68); // red
      doc.rect(barX, y - 3, barWidth * (score / 100), 4, 'F');

      y += 8;

      // Sub-stats
      doc.setTextColor(107, 114, 128);
      doc.setFontSize(8);
      doc.text(`Aligned: ${mod.alignedCount}  |  Review: ${mod.reviewCount}  |  Misaligned: ${mod.misalignedCount}`, margin + 4, y);
      y += 6;
    });
    y += 4;
  }

  // ── Issues by Severity ──
  const severities: Array<{ key: string; color: [number, number, number] }> = [
    { key: 'CRITICAL', color: [239, 68, 68] },
    { key: 'WARNING', color: [245, 158, 11] },
    { key: 'SUGGESTION', color: [59, 130, 246] },
  ];

  severities.forEach(({ key, color }) => {
    const filtered = data.issues.filter((i) => i.severity === key);
    if (filtered.length === 0) return;

    checkPageBreak(14);
    doc.setTextColor(...color);
    doc.setFontSize(13);
    doc.setFont('helvetica', 'bold');
    doc.text(`${SEVERITY_LABELS[key]} Issues (${filtered.length})`, margin, y);
    y += 7;

    filtered.forEach((issue) => {
      checkPageBreak(22);
      doc.setTextColor(17, 24, 39);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text(issue.title, margin + 2, y);
      y += 5;

      if (issue.description) {
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(55, 65, 81);
        doc.setFontSize(9);
        const lines = doc.splitTextToSize(issue.description, contentWidth - 4);
        checkPageBreak(lines.length * 4);
        doc.text(lines, margin + 2, y);
        y += lines.length * 4 + 2;
      }

      if (issue.recommendation) {
        doc.setTextColor(16, 185, 129);
        doc.setFontSize(8);
        doc.setFont('helvetica', 'italic');
        const recLines = doc.splitTextToSize(`Recommendation: ${issue.recommendation}`, contentWidth - 4);
        checkPageBreak(recLines.length * 4);
        doc.text(recLines, margin + 2, y);
        y += recLines.length * 4 + 2;
      }

      // Source reference + fix info
      const metaParts: string[] = [`Status: ${issue.status}`, `Module: ${issue.modulePath}`];
      if (issue.sourceItemType) metaParts.push(`Source: ${issue.sourceItemType}`);
      if (issue.fixOption) metaParts.push(`Fix: ${issue.fixOption}`);
      if (issue.fixAppliedAt) metaParts.push(`Fixed: ${new Date(issue.fixAppliedAt).toLocaleDateString('en-US')}`);

      doc.setTextColor(156, 163, 175);
      doc.setFontSize(8);
      doc.text(metaParts.join('  |  '), margin + 2, y);
      y += 6;
    });
    y += 2;
  });

  // ── Resolved Issues ──
  const resolvedIssues = data.issues.filter((i) => i.status === 'FIXED' || i.status === 'DISMISSED');
  if (resolvedIssues.length > 0) {
    checkPageBreak(14);
    doc.setTextColor(16, 185, 129); // emerald-500
    doc.setFontSize(13);
    doc.setFont('helvetica', 'bold');
    doc.text(`Resolved Issues (${resolvedIssues.length})`, margin, y);
    y += 7;

    resolvedIssues.forEach((issue) => {
      checkPageBreak(10);
      doc.setTextColor(107, 114, 128);
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      const fixDate = issue.fixAppliedAt ? ` — ${new Date(issue.fixAppliedAt).toLocaleDateString('en-US')}` : '';
      doc.text(`✓ ${issue.title} [${issue.status}]${fixDate}`, margin + 2, y);
      y += 5;
    });
    y += 2;
  }

  // ── Footer on all pages ──
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setDrawColor(209, 213, 219);
    doc.line(margin, 280, pageWidth - margin, 280);
    doc.setTextColor(156, 163, 175);
    doc.setFontSize(8);
    doc.text('Generated by Branddock  |  Confidential', pageWidth / 2, 284, { align: 'center' });
  }

  const dateFilename = scanDate
    .replace(/[^a-zA-Z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .toLowerCase();
  doc.save(`brand-alignment-scan-${dateFilename}.pdf`);
  } catch (error) {
    console.error('[exportAlignmentPdf] Failed to generate PDF:', error);
    alert('Failed to generate PDF. Please try again.');
  }
}
