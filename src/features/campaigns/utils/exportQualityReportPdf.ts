import { jsPDF } from 'jspdf';
import type { QualityScoreResponse, ImproveSuggestionItem, ChecklistItem } from '@/types/studio';

interface QualityReportData {
  deliverableTitle: string;
  campaignTitle: string;
  contentType: string;
  quality: QualityScoreResponse | null;
  suggestions: ImproveSuggestionItem[];
  potentialScore: number | null;
  checklistItems: ChecklistItem[] | null;
}

/** Export a standalone Content Quality Report as PDF */
export function exportQualityReportPdf(data: QualityReportData) {
  try {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 20;
  const maxWidth = pageWidth - margin * 2;
  let y = margin;

  // ── Helpers ─────────────────────────────────────────────

  function checkPageBreak(needed: number) {
    if (y + needed > pageHeight - 20) {
      doc.addPage();
      y = margin;
    }
  }

  function addSectionHeader(title: string) {
    checkPageBreak(14);
    doc.setFontSize(13);
    doc.setTextColor(17, 24, 39);
    doc.text(title, margin, y);
    y += 2;
    doc.setDrawColor(229, 231, 235);
    doc.line(margin, y, pageWidth - margin, y);
    y += 6;
  }

  function addWrappedText(text: string, fontSize: number, color: [number, number, number]) {
    doc.setFontSize(fontSize);
    doc.setTextColor(...color);
    const lines = doc.splitTextToSize(text, maxWidth);
    for (const line of lines) {
      checkPageBreak(6);
      doc.text(line, margin, y);
      y += fontSize * 0.45 + 1;
    }
  }

  function getScoreColor(score: number): [number, number, number] {
    if (score >= 80) return [5, 150, 105]; // emerald-600
    if (score >= 60) return [245, 158, 11]; // amber-500
    return [239, 68, 68]; // red-500
  }

  // ── Header bar ──────────────────────────────────────────

  doc.setFillColor(13, 148, 136); // teal-600
  doc.rect(0, 0, pageWidth, 14, 'F');
  doc.setFontSize(9);
  doc.setTextColor(255, 255, 255);
  doc.text('Branddock — Content Quality Report', margin, 9);
  doc.text(new Date().toLocaleDateString('en-US'), pageWidth - margin, 9, { align: 'right' });

  y = 24;

  // ── Title ───────────────────────────────────────────────

  doc.setFontSize(18);
  doc.setTextColor(17, 24, 39);
  doc.text(data.deliverableTitle, margin, y);
  y += 8;

  doc.setFontSize(10);
  doc.setTextColor(107, 114, 128);
  doc.text(`Campaign: ${data.campaignTitle}  |  Type: ${data.contentType}`, margin, y);
  y += 10;

  // ── Overall Score ───────────────────────────────────────

  const overall = data.quality?.overall ?? 0;

  addSectionHeader('Overall Quality Score');

  // Big score number
  const scoreColor = getScoreColor(overall);
  doc.setFontSize(36);
  doc.setTextColor(...scoreColor);
  doc.text(`${Math.round(overall)}`, margin, y + 10);

  doc.setFontSize(12);
  doc.setTextColor(107, 114, 128);
  doc.text('/ 100', margin + doc.getTextWidth(`${Math.round(overall)}`) + 3, y + 10);

  if (data.potentialScore != null && data.potentialScore > overall) {
    doc.setFontSize(10);
    doc.setTextColor(5, 150, 105);
    doc.text(
      `Potential: ${Math.round(data.potentialScore)}`,
      margin + doc.getTextWidth(`${Math.round(overall)}`) + 25,
      y + 10,
    );
  }

  y += 18;

  // ── Quality Metrics ─────────────────────────────────────

  const metrics = data.quality?.metrics ?? [];

  if (metrics.length > 0) {
    addSectionHeader('Quality Metrics');

    for (const metric of metrics) {
      checkPageBreak(12);
      const pct = metric.maxScore > 0 ? Math.round((metric.score / metric.maxScore) * 100) : 0;
      const barColor = getScoreColor(pct);

      // Metric name and score
      doc.setFontSize(10);
      doc.setTextColor(55, 65, 81);
      doc.text(metric.name, margin, y);
      doc.setTextColor(...barColor);
      doc.text(`${pct}%`, pageWidth - margin, y, { align: 'right' });
      y += 4;

      // Progress bar background
      const barWidth = maxWidth;
      const barHeight = 3;
      doc.setFillColor(229, 231, 235);
      doc.rect(margin, y, barWidth, barHeight, 'F');

      // Progress bar fill
      doc.setFillColor(...barColor);
      doc.rect(margin, y, barWidth * (pct / 100), barHeight, 'F');
      y += 8;
    }
  }

  // ── Content Checklist ───────────────────────────────────

  const checklist = data.checklistItems ?? [];

  if (checklist.length > 0) {
    addSectionHeader('Content Checklist');

    for (const item of checklist) {
      checkPageBreak(8);
      doc.setFontSize(10);

      // Checkbox indicator
      const checkMark = item.checked ? '✓' : '○';
      doc.setTextColor(item.checked ? 5 : 156, item.checked ? 150 : 163, item.checked ? 105 : 175);
      doc.text(checkMark, margin, y);

      // Label
      doc.setTextColor(item.checked ? 55 : 156, item.checked ? 65 : 163, item.checked ? 81 : 175);
      doc.text(item.label, margin + 6, y);
      y += 6;
    }
    y += 2;
  }

  // ── Improve Suggestions ─────────────────────────────────

  const suggestions = data.suggestions ?? [];

  if (suggestions.length > 0) {
    addSectionHeader(`Improve Suggestions (${suggestions.length})`);

    for (let i = 0; i < suggestions.length; i++) {
      const s = suggestions[i];
      checkPageBreak(30);

      // Suggestion header
      doc.setFontSize(10);
      doc.setTextColor(17, 24, 39);
      doc.text(`${i + 1}. ${s.metric}`, margin, y);

      // Status + impact badge
      const statusLabel = s.status === 'APPLIED' ? 'Applied' : s.status === 'DISMISSED' ? 'Dismissed' : 'Pending';
      doc.setFontSize(8);
      doc.setTextColor(107, 114, 128);
      doc.text(`${statusLabel}  |  +${s.impactPoints} pts`, pageWidth - margin, y, { align: 'right' });
      y += 6;

      // Reason
      if (s.reason) {
        doc.setFontSize(9);
        doc.setTextColor(107, 114, 128);
        const reasonLines = doc.splitTextToSize(s.reason, maxWidth);
        for (const line of reasonLines) {
          checkPageBreak(5);
          doc.text(line, margin, y);
          y += 4.5;
        }
        y += 1;
      }

      // Current text
      if (s.currentText) {
        checkPageBreak(10);
        doc.setFontSize(8);
        doc.setTextColor(156, 163, 175);
        doc.text('Current:', margin, y);
        y += 4;
        doc.setFontSize(9);
        doc.setTextColor(107, 114, 128);
        const currentLines = doc.splitTextToSize(s.currentText, maxWidth - 4);
        for (const line of currentLines) {
          checkPageBreak(5);
          doc.text(line, margin + 4, y);
          y += 4.5;
        }
        y += 1;
      }

      // Suggested text
      if (s.suggestedText) {
        checkPageBreak(10);
        doc.setFontSize(8);
        doc.setTextColor(5, 150, 105);
        doc.text('Suggested:', margin, y);
        y += 4;
        doc.setFontSize(9);
        doc.setTextColor(31, 41, 55);
        const suggestedLines = doc.splitTextToSize(s.suggestedText, maxWidth - 4);
        for (const line of suggestedLines) {
          checkPageBreak(5);
          doc.text(line, margin + 4, y);
          y += 4.5;
        }
        y += 2;
      }

      // Divider between suggestions
      if (i < suggestions.length - 1) {
        checkPageBreak(6);
        doc.setDrawColor(243, 244, 246);
        doc.line(margin, y, pageWidth - margin, y);
        y += 5;
      }
    }
  }

  // ── Footer on all pages ─────────────────────────────────

  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(156, 163, 175);
    doc.text('Generated by Branddock | Confidential', margin, pageHeight - 10);
    doc.text(`Page ${i} of ${totalPages}`, pageWidth - margin, pageHeight - 10, { align: 'right' });
  }

  // ── Save ────────────────────────────────────────────────

  const filename = data.deliverableTitle
    .replace(/[^a-zA-Z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .toLowerCase()
    .slice(0, 60) || 'quality-report';

  doc.save(`quality-report-${filename}.pdf`);
  } catch (error) {
    console.error('[exportQualityReportPdf] Failed to generate PDF:', error);
    alert('Failed to generate PDF. Please try again.');
  }
}
