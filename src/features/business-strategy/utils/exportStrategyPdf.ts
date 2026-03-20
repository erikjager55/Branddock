import { jsPDF } from 'jspdf';
import type { StrategyDetailResponse } from '../types/business-strategy.types';

/** Coerce to string, empty if null/undefined */
function s(v: string | number | null | undefined): string {
  if (v == null) return '';
  return String(v);
}

/** Filter to non-empty strings */
function sa(arr: string[] | null | undefined): string[] {
  return (arr ?? []).filter(Boolean);
}

const STATUS_LABELS: Record<string, string> = {
  ON_TRACK: 'On Track',
  AT_RISK: 'At Risk',
  BEHIND: 'Behind',
  COMPLETED: 'Completed',
  DONE: 'Done',
  UPCOMING: 'Upcoming',
  FUTURE: 'Future',
};

const TYPE_LABELS: Record<string, string> = {
  GROWTH: 'Growth & Scale',
  MARKET_ENTRY: 'Market Entry',
  PRODUCT_LAUNCH: 'Product Launch',
  BRAND_BUILDING: 'Brand Building',
  OPERATIONAL_EXCELLENCE: 'Operational Excellence',
  CUSTOM: 'Custom Strategy',
};

export function exportStrategyPdf(strategy: StrategyDetailResponse) {
  try {
    _generateStrategyPdf(strategy);
  } catch (error) {
    console.error('[exportStrategyPdf] Failed to generate PDF:', error);
    alert('Failed to generate PDF. Please try again.');
  }
}

function _generateStrategyPdf(strategy: StrategyDetailResponse) {
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

  const addSectionHeader = (title: string) => {
    checkPageBreak(14);
    doc.setFillColor(16, 185, 129); // emerald-500
    doc.rect(margin, y, contentWidth, 7, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text(title.toUpperCase(), margin + 3, y + 5);
    y += 11;
    doc.setTextColor(17, 24, 39);
  };

  const addField = (label: string, value: string | undefined | null) => {
    if (!value) return;
    checkPageBreak(12);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(107, 114, 128);
    doc.text(label, margin, y);
    y += 4;
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(17, 24, 39);
    const lines = doc.splitTextToSize(value, contentWidth);
    doc.text(lines, margin, y);
    y += lines.length * 4 + 3;
  };

  const addWrappedText = (text: string) => {
    if (!text) return;
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(55, 65, 81);
    const lines = doc.splitTextToSize(text, contentWidth);
    for (const line of lines) {
      checkPageBreak(5);
      doc.text(line, margin, y);
      y += 4;
    }
    y += 2;
  };

  const addList = (title: string, items: string[] | undefined | null) => {
    const filtered = sa(items);
    if (filtered.length === 0) return;
    checkPageBreak(10 + filtered.length * 5);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(107, 114, 128);
    doc.text(title, margin, y);
    y += 5;
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(17, 24, 39);
    doc.setFontSize(9);
    for (const item of filtered) {
      checkPageBreak(5);
      const lines = doc.splitTextToSize(`• ${item}`, contentWidth - 4);
      doc.text(lines, margin + 2, y);
      y += lines.length * 4 + 1;
    }
    y += 2;
  };

  // ── Header bar ──
  doc.setFillColor(16, 185, 129);
  doc.rect(0, 0, pageWidth, 14, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('BRANDDOCK', margin, 9);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text('Business Strategy Export', pageWidth - margin, 9, { align: 'right' });
  y = 24;

  // ── Title ──
  doc.setTextColor(17, 24, 39);
  doc.setFontSize(22);
  doc.setFont('helvetica', 'bold');
  doc.text(strategy.name, margin, y);
  y += 8;

  // ── Meta ──
  doc.setTextColor(107, 114, 128);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  const typeLabel = TYPE_LABELS[strategy.type] ?? strategy.type;
  const dateRange = [
    strategy.startDate ? new Date(strategy.startDate).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) : null,
    strategy.endDate ? new Date(strategy.endDate).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) : null,
  ].filter(Boolean).join(' – ');
  const meta = [typeLabel, `Status: ${strategy.status}`, `Progress: ${strategy.progressPercentage}%`, dateRange].filter(Boolean).join('  |  ');
  doc.text(meta, margin, y);
  y += 8;

  // ── Description ──
  if (strategy.description) {
    doc.setTextColor(55, 65, 81);
    doc.setFontSize(10);
    addWrappedText(strategy.description);
    y += 2;
  }

  // ── Strategic Context ──
  addSectionHeader('Strategic Context');
  addField('Vision', s(strategy.vision));
  addField('Rationale', s(strategy.rationale));
  addList('Key Assumptions', strategy.keyAssumptions);

  // ── SWOT Analysis ──
  if (sa(strategy.strengths).length || sa(strategy.weaknesses).length || sa(strategy.opportunities).length || sa(strategy.threats).length) {
    addSectionHeader('SWOT Analysis');
    addList('Strengths', strategy.strengths);
    addList('Weaknesses', strategy.weaknesses);
    addList('Opportunities', strategy.opportunities);
    addList('Threats', strategy.threats);
  }

  // ── Objectives ──
  if (strategy.objectives.length > 0) {
    addSectionHeader(`Objectives (${strategy.objectives.length})`);
    for (const obj of strategy.objectives) {
      checkPageBreak(20);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(17, 24, 39);
      doc.text(obj.title, margin, y);
      y += 5;

      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(107, 114, 128);
      const objMeta = [
        `Status: ${STATUS_LABELS[obj.status] ?? obj.status}`,
        `Priority: ${obj.priority}`,
        `Progress: ${obj.currentValue}/${obj.targetValue}`,
        obj.focusArea ? `Focus: ${obj.focusArea.name}` : null,
      ].filter(Boolean).join('  |  ');
      doc.text(objMeta, margin, y);
      y += 5;

      if (obj.description) {
        doc.setTextColor(55, 65, 81);
        doc.setFontSize(8);
        const descLines = doc.splitTextToSize(obj.description, contentWidth - 4);
        doc.text(descLines, margin + 2, y);
        y += descLines.length * 3.5 + 2;
      }

      if (obj.keyResults.length > 0) {
        doc.setFontSize(8);
        doc.setTextColor(55, 65, 81);
        for (const kr of obj.keyResults) {
          checkPageBreak(5);
          const statusIcon = kr.status === 'COMPLETE' ? '✓' : kr.status === 'BEHIND' ? '✗' : '○';
          const krLine = `${statusIcon} ${kr.description} [${STATUS_LABELS[kr.status] ?? kr.status}]`;
          const lines = doc.splitTextToSize(krLine, contentWidth - 8);
          doc.text(lines, margin + 4, y);
          y += lines.length * 3.5 + 1;
        }
      }
      y += 3;
    }
  }

  // ── Focus Areas ──
  if (strategy.focusAreaDetails.length > 0) {
    addSectionHeader('Focus Areas');
    for (const fa of strategy.focusAreaDetails) {
      checkPageBreak(10);
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(17, 24, 39);
      doc.text(`${fa.name} (${fa.objectiveCount} objectives)`, margin, y);
      y += 4;
      if (fa.description) {
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(55, 65, 81);
        doc.setFontSize(8);
        const lines = doc.splitTextToSize(fa.description, contentWidth - 4);
        doc.text(lines, margin + 2, y);
        y += lines.length * 3.5 + 2;
      }
      y += 2;
    }
  }

  // ── Milestones ──
  if (strategy.milestones.length > 0) {
    addSectionHeader('Milestones');
    for (const ms of strategy.milestones) {
      checkPageBreak(10);
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(17, 24, 39);
      const dateStr = new Date(ms.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
      doc.text(`${ms.title} — ${dateStr} [${STATUS_LABELS[ms.status] ?? ms.status}]`, margin, y);
      y += 4;
      if (ms.description) {
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(55, 65, 81);
        doc.setFontSize(8);
        const lines = doc.splitTextToSize(ms.description, contentWidth - 4);
        doc.text(lines, margin + 2, y);
        y += lines.length * 3.5 + 2;
      }
      y += 2;
    }
  }

  // ── Linked Campaigns ──
  if (strategy.linkedCampaigns.length > 0) {
    addSectionHeader('Linked Campaigns');
    for (const lc of strategy.linkedCampaigns) {
      checkPageBreak(6);
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(17, 24, 39);
      doc.text(`• ${lc.title} [${lc.type}, ${lc.status}]`, margin, y);
      y += 5;
    }
  }

  // ── Footer on all pages ──
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(7);
    doc.setTextColor(156, 163, 175);
    doc.text('Generated by Branddock  |  Confidential', pageWidth / 2, 284, { align: 'center' });
    doc.text(`Page ${i} of ${totalPages}`, pageWidth - margin, 284, { align: 'right' });
  }

  // ── Save ──
  const filename = strategy.name
    .replace(/[^a-zA-Z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .toLowerCase()
    .slice(0, 60) || 'strategy';
  doc.save(`${filename}-strategy.pdf`);
}
