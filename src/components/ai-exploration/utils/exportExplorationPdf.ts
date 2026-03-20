import { jsPDF } from 'jspdf';
import type { ExplorationInsightsData, ExplorationMessage } from '../types';

interface ExplorationExportData {
  itemName: string;
  itemType: string;
  sessionDate: string;
  messages: ExplorationMessage[];
  insightsData: ExplorationInsightsData;
}

/** Export an AI Exploration session as a professionally formatted PDF */
export function exportExplorationPdf(data: ExplorationExportData) {
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
  doc.setFillColor(20, 184, 166); // teal-500
  doc.rect(0, 0, pageWidth, 14, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('BRANDDOCK', margin, 9);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text('AI Exploration Report', pageWidth - margin, 9, { align: 'right' });
  y = 24;

  // ── Title ──
  doc.setTextColor(17, 24, 39);
  doc.setFontSize(22);
  doc.setFont('helvetica', 'bold');
  doc.text(data.itemName, margin, y);
  y += 8;

  // ── Metadata ──
  doc.setTextColor(107, 114, 128);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  const meta = [
    `Type: ${data.itemType}`,
    `Date: ${data.sessionDate}`,
    `Dimensions: ${data.insightsData.dimensions?.length ?? 0}`,
  ].join('  |  ');
  doc.text(meta, margin, y);
  y += 8;

  // ── Divider ──
  doc.setDrawColor(209, 213, 219);
  doc.line(margin, y, pageWidth - margin, y);
  y += 6;

  // ── Helper functions ──
  const addSectionHeader = (title: string) => {
    checkPageBreak(14);
    doc.setTextColor(20, 184, 166); // teal-500
    doc.setFontSize(13);
    doc.setFont('helvetica', 'bold');
    doc.text(title, margin, y);
    y += 7;
    doc.setFont('helvetica', 'normal');
  };

  const addWrappedText = (text: string, color: [number, number, number] = [55, 65, 81]) => {
    doc.setTextColor(...color);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    const lines = doc.splitTextToSize(text, contentWidth);
    checkPageBreak(lines.length * 5 + 2);
    doc.text(lines, margin, y);
    y += lines.length * 5 + 4;
  };

  const addField = (label: string, value: string | undefined | null) => {
    if (!value) return;
    checkPageBreak(12);
    doc.setTextColor(107, 114, 128);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.text(label.toUpperCase(), margin, y);
    y += 4;
    doc.setTextColor(17, 24, 39);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    const lines = doc.splitTextToSize(value, contentWidth);
    doc.text(lines, margin, y);
    y += lines.length * 5 + 3;
  };

  // ── Executive Summary ──
  if (data.insightsData.executiveSummary) {
    addSectionHeader('Executive Summary');
    addWrappedText(data.insightsData.executiveSummary);
  }

  // ── Dimension Scores ──
  const dimensions = data.insightsData.dimensions ?? [];
  if (dimensions.length > 0) {
    addSectionHeader('Dimension Analysis');
    dimensions.forEach((dim) => {
      checkPageBreak(16);
      doc.setTextColor(17, 24, 39);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text(dim.title, margin, y);
      y += 5;
      if (dim.summary) {
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(55, 65, 81);
        const lines = doc.splitTextToSize(dim.summary, contentWidth);
        checkPageBreak(lines.length * 5);
        doc.text(lines, margin, y);
        y += lines.length * 5 + 3;
      }
    });
    y += 2;
  }

  // ── Key Findings ──
  const findings = data.insightsData.findings ?? [];
  if (findings.length > 0) {
    addSectionHeader('Key Findings');
    findings.forEach((finding, i) => {
      checkPageBreak(14);
      doc.setTextColor(17, 24, 39);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text(`${i + 1}. ${finding.title}`, margin, y);
      y += 5;
      if (finding.description) {
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(55, 65, 81);
        const lines = doc.splitTextToSize(finding.description, contentWidth);
        checkPageBreak(lines.length * 5);
        doc.text(lines, margin, y);
        y += lines.length * 5 + 3;
      }
    });
    y += 2;
  }

  // ── Strategic Recommendations ──
  const recommendations = data.insightsData.recommendations ?? [];
  if (recommendations.length > 0) {
    addSectionHeader('Strategic Recommendations');
    recommendations.forEach((rec, i) => {
      checkPageBreak(10);
      doc.setTextColor(55, 65, 81);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      const lines = doc.splitTextToSize(`${i + 1}. ${rec}`, contentWidth - 5);
      doc.text(lines, margin + 2, y);
      y += lines.length * 5 + 3;
    });
    y += 2;
  }

  // ── Field Suggestions ──
  const suggestions = data.insightsData.fieldSuggestions ?? [];
  if (suggestions.length > 0) {
    addSectionHeader('Field Suggestions');
    suggestions.forEach((sug) => {
      checkPageBreak(20);
      doc.setTextColor(17, 24, 39);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');

      // Label + status badge
      const statusLabel = sug.status === 'accepted' ? ' [Accepted]' : sug.status === 'rejected' ? ' [Rejected]' : '';
      doc.text(`${sug.label}${statusLabel}`, margin, y);
      y += 5;

      // Current value
      if (sug.currentValue != null) {
        const currentStr = Array.isArray(sug.currentValue)
          ? sug.currentValue.join(', ')
          : String(sug.currentValue);
        if (currentStr) {
          addField('Current', currentStr);
        }
      }

      const suggestedStr = Array.isArray(sug.suggestedValue)
        ? sug.suggestedValue.join(', ')
        : String(sug.suggestedValue);
      addField('Suggested', suggestedStr);

      if (sug.reason) {
        doc.setTextColor(107, 114, 128);
        doc.setFontSize(9);
        doc.setFont('helvetica', 'italic');
        const lines = doc.splitTextToSize(sug.reason, contentWidth);
        checkPageBreak(lines.length * 4);
        doc.text(lines, margin, y);
        y += lines.length * 4 + 3;
      }
    });
    y += 2;
  }

  // ── Chat History ──
  const chatMessages = data.messages.filter(
    (m) => m.type === 'AI_QUESTION' || m.type === 'USER_ANSWER',
  );
  if (chatMessages.length > 0) {
    addSectionHeader('Chat History');
    chatMessages.forEach((msg) => {
      checkPageBreak(12);
      const isAI = msg.type === 'AI_QUESTION';
      doc.setTextColor(isAI ? 20 : 5, isAI ? 184 : 150, isAI ? 166 : 105);
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.text(isAI ? 'AI:' : 'You:', margin, y);
      y += 4;
      doc.setTextColor(55, 65, 81);
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      const lines = doc.splitTextToSize(msg.content, contentWidth - 5);
      checkPageBreak(lines.length * 4);
      doc.text(lines, margin + 2, y);
      y += lines.length * 4 + 3;
    });
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

  const filename = data.itemName
    .replace(/[^a-zA-Z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .toLowerCase()
    .slice(0, 60) || 'exploration';
  doc.save(`${filename}-ai-exploration.pdf`);
  } catch (error) {
    console.error('[exportExplorationPdf] Failed to generate PDF:', error);
    alert('Failed to generate PDF. Please try again.');
  }
}
