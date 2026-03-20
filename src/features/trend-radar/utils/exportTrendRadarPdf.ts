import { jsPDF } from 'jspdf';
import type { DetectedTrendWithMeta } from '../types/trend-radar.types';

const CATEGORY_LABELS: Record<string, string> = {
  CONSUMER_BEHAVIOR: 'Consumer Behavior',
  TECHNOLOGY: 'Technology',
  MARKET_DYNAMICS: 'Market Dynamics',
  COMPETITIVE: 'Competitive',
  REGULATORY: 'Regulatory',
};

const IMPACT_LABELS: Record<string, string> = {
  LOW: 'Low',
  MEDIUM: 'Medium',
  HIGH: 'High',
  CRITICAL: 'Critical',
};

const SCOPE_LABELS: Record<string, string> = {
  MICRO: 'Micro',
  MESO: 'Meso',
  MACRO: 'Macro',
};

const TIMEFRAME_LABELS: Record<string, string> = {
  SHORT_TERM: '0-6 months',
  MEDIUM_TERM: '6-18 months',
  LONG_TERM: '18+ months',
};

function s(val: unknown): string {
  if (val == null) return '';
  if (typeof val === 'number') return String(val);
  if (typeof val === 'string') return val;
  return '';
}

/** Export all trends as a Trend Radar overview PDF */
export function exportTrendRadarOverviewPdf(trends: DetectedTrendWithMeta[]) {
  try {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 20;
  const maxWidth = pageWidth - margin * 2;
  let y = margin;

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

  function addField(label: string, value: string) {
    if (!value) return;
    checkPageBreak(10);
    doc.setFontSize(9);
    doc.setTextColor(107, 114, 128);
    doc.text(label, margin, y);
    y += 4;
    doc.setFontSize(10);
    doc.setTextColor(31, 41, 55);
    const lines = doc.splitTextToSize(value, maxWidth);
    for (const line of lines) {
      checkPageBreak(5);
      doc.text(line, margin, y);
      y += 4.5;
    }
    y += 2;
  }

  // ── Header bar ──────────────────────────────────────────
  doc.setFillColor(109, 40, 217); // violet-600
  doc.rect(0, 0, pageWidth, 14, 'F');
  doc.setFontSize(9);
  doc.setTextColor(255, 255, 255);
  doc.text('Branddock — Trend Radar Report', margin, 9);
  doc.text(new Date().toLocaleDateString('en-US'), pageWidth - margin, 9, { align: 'right' });

  y = 24;

  // ── Title ───────────────────────────────────────────────
  doc.setFontSize(18);
  doc.setTextColor(17, 24, 39);
  doc.text('Trend Radar Overview', margin, y);
  y += 8;

  // ── Stats ───────────────────────────────────────────────
  const activated = trends.filter((t) => t.isActivated).length;
  const highImpact = trends.filter((t) => t.impactLevel === 'HIGH' || t.impactLevel === 'CRITICAL').length;

  doc.setFontSize(10);
  doc.setTextColor(107, 114, 128);
  doc.text(
    `Total: ${trends.length}  |  Activated: ${activated}  |  High/Critical Impact: ${highImpact}`,
    margin,
    y,
  );
  y += 10;

  // ── Group by category ──────────────────────────────────
  const grouped = new Map<string, DetectedTrendWithMeta[]>();
  for (const trend of trends) {
    const cat = trend.category;
    if (!grouped.has(cat)) grouped.set(cat, []);
    grouped.get(cat)!.push(trend);
  }

  for (const [category, categoryTrends] of grouped) {
    addSectionHeader(`${CATEGORY_LABELS[category] ?? category} (${categoryTrends.length})`);

    for (let i = 0; i < categoryTrends.length; i++) {
      const trend = categoryTrends[i];
      checkPageBreak(30);

      // Trend title
      doc.setFontSize(11);
      doc.setTextColor(17, 24, 39);
      doc.text(s(trend.title), margin, y);
      y += 5;

      // Metadata line
      doc.setFontSize(8);
      doc.setTextColor(107, 114, 128);
      const meta = [
        IMPACT_LABELS[trend.impactLevel] ?? trend.impactLevel,
        SCOPE_LABELS[trend.scope] ?? trend.scope,
        TIMEFRAME_LABELS[trend.timeframe] ?? trend.timeframe,
        `Relevance: ${trend.relevanceScore}`,
        trend.isActivated ? 'ACTIVATED' : '',
      ]
        .filter(Boolean)
        .join('  |  ');
      doc.text(meta, margin, y);
      y += 5;

      // Description
      if (trend.description) {
        doc.setFontSize(9);
        doc.setTextColor(55, 65, 81);
        const descLines = doc.splitTextToSize(s(trend.description), maxWidth);
        for (const line of descLines.slice(0, 3)) {
          checkPageBreak(4.5);
          doc.text(line, margin, y);
          y += 4;
        }
        y += 1;
      }

      // Why Now
      if (trend.whyNow) {
        doc.setFontSize(8);
        doc.setTextColor(146, 64, 14); // amber-800
        doc.text('Why Now:', margin, y);
        y += 3.5;
        doc.setFontSize(9);
        doc.setTextColor(120, 53, 15);
        const whyLines = doc.splitTextToSize(s(trend.whyNow), maxWidth - 4);
        for (const line of whyLines.slice(0, 2)) {
          checkPageBreak(4.5);
          doc.text(line, margin + 2, y);
          y += 4;
        }
        y += 1;
      }

      // AI Analysis snippet
      if (trend.aiAnalysis) {
        doc.setFontSize(8);
        doc.setTextColor(107, 114, 128);
        doc.text('AI Analysis:', margin, y);
        y += 3.5;
        doc.setFontSize(9);
        doc.setTextColor(55, 65, 81);
        const analysisLines = doc.splitTextToSize(s(trend.aiAnalysis), maxWidth - 4);
        for (const line of analysisLines.slice(0, 3)) {
          checkPageBreak(4.5);
          doc.text(line, margin + 2, y);
          y += 4;
        }
        y += 1;
      }

      // Data points
      if (trend.dataPoints && trend.dataPoints.length > 0) {
        doc.setFontSize(8);
        doc.setTextColor(107, 114, 128);
        doc.text('Data Points:', margin, y);
        y += 3.5;
        doc.setFontSize(9);
        doc.setTextColor(55, 65, 81);
        for (const dp of trend.dataPoints.slice(0, 4)) {
          checkPageBreak(4.5);
          doc.text(`• ${dp}`, margin + 2, y);
          y += 4;
        }
        y += 1;
      }

      // Sources
      const realUrls = (trend.sourceUrls ?? []).filter((u) => !u.startsWith('search:'));
      if (realUrls.length > 0) {
        doc.setFontSize(8);
        doc.setTextColor(107, 114, 128);
        doc.text(`Sources (${realUrls.length}):`, margin, y);
        y += 3.5;
        doc.setFontSize(8);
        doc.setTextColor(79, 70, 229); // indigo-600
        for (const url of realUrls.slice(0, 3)) {
          checkPageBreak(4);
          const displayUrl = url.length > 80 ? url.slice(0, 77) + '...' : url;
          doc.text(displayUrl, margin + 2, y);
          y += 3.5;
        }
        y += 1;
      }

      // Image URL
      if (trend.imageUrl) {
        doc.setFontSize(8);
        doc.setTextColor(107, 114, 128);
        doc.text('Image:', margin, y);
        doc.setTextColor(79, 70, 229);
        const imgUrl = trend.imageUrl.length > 70 ? trend.imageUrl.slice(0, 67) + '...' : trend.imageUrl;
        doc.text(imgUrl, margin + 14, y);
        y += 4;
      }

      // Quality scores
      if (trend.scores) {
        doc.setFontSize(8);
        doc.setTextColor(107, 114, 128);
        doc.text(
          `Scores — Composite: ${trend.scores.compositeScore} | Novelty: ${trend.scores.novelty} | Evidence: ${trend.scores.evidenceStrength} | Actionability: ${trend.scores.actionability}`,
          margin,
          y,
        );
        y += 5;
      }

      // Divider between trends
      if (i < categoryTrends.length - 1) {
        checkPageBreak(4);
        doc.setDrawColor(243, 244, 246);
        doc.line(margin, y, pageWidth - margin, y);
        y += 4;
      }
    }

    y += 4;
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

  doc.save('trend-radar-overview.pdf');
  } catch (error) {
    console.error('[exportTrendRadarOverviewPdf] Failed to generate PDF:', error);
    alert('Failed to generate PDF. Please try again.');
  }
}

/** Export a single trend as a detailed PDF */
export function exportTrendDetailPdf(trend: DetectedTrendWithMeta) {
  try {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 20;
  const maxWidth = pageWidth - margin * 2;
  let y = margin;

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

  function addField(label: string, value: string) {
    if (!value) return;
    checkPageBreak(10);
    doc.setFontSize(9);
    doc.setTextColor(107, 114, 128);
    doc.text(label, margin, y);
    y += 4;
    doc.setFontSize(10);
    doc.setTextColor(31, 41, 55);
    const lines = doc.splitTextToSize(value, maxWidth);
    for (const line of lines) {
      checkPageBreak(5);
      doc.text(line, margin, y);
      y += 4.5;
    }
    y += 2;
  }

  // ── Header bar ──────────────────────────────────────────
  doc.setFillColor(109, 40, 217); // violet-600
  doc.rect(0, 0, pageWidth, 14, 'F');
  doc.setFontSize(9);
  doc.setTextColor(255, 255, 255);
  doc.text('Branddock — Trend Detail Report', margin, 9);
  doc.text(new Date().toLocaleDateString('en-US'), pageWidth - margin, 9, { align: 'right' });

  y = 24;

  // ── Title ───────────────────────────────────────────────
  doc.setFontSize(18);
  doc.setTextColor(17, 24, 39);
  const titleLines = doc.splitTextToSize(s(trend.title), maxWidth);
  for (const line of titleLines) {
    doc.text(line, margin, y);
    y += 8;
  }

  // Metadata line
  doc.setFontSize(10);
  doc.setTextColor(107, 114, 128);
  const metaParts = [
    CATEGORY_LABELS[trend.category] ?? trend.category,
    `${IMPACT_LABELS[trend.impactLevel] ?? trend.impactLevel} Impact`,
    SCOPE_LABELS[trend.scope] ?? trend.scope,
    TIMEFRAME_LABELS[trend.timeframe] ?? trend.timeframe,
  ];
  doc.text(metaParts.join('  |  '), margin, y);
  y += 6;

  if (trend.isActivated) {
    doc.setFontSize(9);
    doc.setTextColor(5, 150, 105);
    doc.text('STATUS: ACTIVATED', margin, y);
    y += 5;
  }
  y += 4;

  // ── Overview ────────────────────────────────────────────
  addSectionHeader('Overview');

  addField('Relevance Score', String(trend.relevanceScore));
  if (trend.confidence != null) {
    addField('Confidence', `${trend.confidence}%`);
  }
  if (trend.direction) {
    addField('Direction', s(trend.direction));
  }
  addField('Detection Source', trend.detectionSource === 'AI_RESEARCH' ? 'AI Research' : 'Manual');
  addField(
    'Detected',
    new Date(trend.createdAt).toLocaleDateString('en-US', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }),
  );
  if (trend.evidenceCount > 0) {
    addField('Evidence Sources', String(trend.evidenceCount));
  }

  // ── Image ──────────────────────────────────────────────
  if (trend.imageUrl) {
    addField('Image URL', trend.imageUrl);
  }

  // ── Description ─────────────────────────────────────────
  if (trend.description) {
    addSectionHeader('Description');
    doc.setFontSize(10);
    doc.setTextColor(55, 65, 81);
    const descLines = doc.splitTextToSize(s(trend.description), maxWidth);
    for (const line of descLines) {
      checkPageBreak(5);
      doc.text(line, margin, y);
      y += 4.5;
    }
    y += 4;
  }

  // ── Why Now ─────────────────────────────────────────────
  if (trend.whyNow) {
    addSectionHeader('Why Now?');
    doc.setFontSize(10);
    doc.setTextColor(120, 53, 15);
    const whyLines = doc.splitTextToSize(s(trend.whyNow), maxWidth);
    for (const line of whyLines) {
      checkPageBreak(5);
      doc.text(line, margin, y);
      y += 4.5;
    }
    y += 4;
  }

  // ── AI Analysis ─────────────────────────────────────────
  if (trend.aiAnalysis) {
    addSectionHeader('AI Analysis');
    doc.setFontSize(10);
    doc.setTextColor(55, 65, 81);
    const analysisLines = doc.splitTextToSize(s(trend.aiAnalysis), maxWidth);
    for (const line of analysisLines) {
      checkPageBreak(5);
      doc.text(line, margin, y);
      y += 4.5;
    }
    y += 4;
  }

  // ── Data Points ─────────────────────────────────────────
  if (trend.dataPoints && trend.dataPoints.length > 0) {
    addSectionHeader(`Key Data Points (${trend.dataPoints.length})`);
    for (const dp of trend.dataPoints) {
      checkPageBreak(6);
      doc.setFontSize(10);
      doc.setTextColor(31, 41, 55);
      const dpLines = doc.splitTextToSize(`• ${dp}`, maxWidth - 4);
      for (const line of dpLines) {
        checkPageBreak(4.5);
        doc.text(line, margin + 2, y);
        y += 4.5;
      }
    }
    y += 4;
  }

  // ── Quality Scores ──────────────────────────────────────
  if (trend.scores) {
    addSectionHeader('Quality Scores');
    addField('Composite Score', String(trend.scores.compositeScore));
    addField('Novelty', String(trend.scores.novelty));
    addField('Evidence Strength', String(trend.scores.evidenceStrength));
    addField('Growth Signal', String(trend.scores.growthSignal));
    addField('Actionability', String(trend.scores.actionability));
    addField('Strategic Relevance', String(trend.scores.strategicRelevance));
    addField('Specificity', String(trend.scores.specificity));
  }

  // ── Industries & Tags ───────────────────────────────────
  if (trend.industries.length > 0 || trend.tags.length > 0) {
    addSectionHeader('Industries & Tags');
    if (trend.industries.length > 0) {
      addField('Industries', trend.industries.join(', '));
    }
    if (trend.tags.length > 0) {
      addField('Tags', trend.tags.join(', '));
    }
  }

  // ── How to Use ──────────────────────────────────────────
  if (trend.howToUse.length > 0) {
    addSectionHeader('How to Use This Trend');
    for (let i = 0; i < trend.howToUse.length; i++) {
      checkPageBreak(6);
      doc.setFontSize(10);
      doc.setTextColor(31, 41, 55);
      const tipLines = doc.splitTextToSize(`${i + 1}. ${trend.howToUse[i]}`, maxWidth - 4);
      for (const line of tipLines) {
        checkPageBreak(4.5);
        doc.text(line, margin + 2, y);
        y += 4.5;
      }
    }
    y += 4;
  }

  // ── Sources ─────────────────────────────────────────────
  const realSourceUrls = (trend.sourceUrls ?? []).filter((u) => !u.startsWith('search:'));
  const realSourceUrl =
    trend.sourceUrl && !trend.sourceUrl.startsWith('search:') ? trend.sourceUrl : null;

  if (realSourceUrls.length > 0 || realSourceUrl) {
    addSectionHeader('Sources');
    const allUrls = realSourceUrls.length > 0 ? realSourceUrls : realSourceUrl ? [realSourceUrl] : [];
    for (const url of allUrls) {
      checkPageBreak(5);
      doc.setFontSize(9);
      doc.setTextColor(79, 70, 229);
      const displayUrl = url.length > 100 ? url.slice(0, 97) + '...' : url;
      doc.text(displayUrl, margin, y);
      y += 4.5;
    }
    y += 4;
  }

  // ── Raw Excerpt ─────────────────────────────────────────
  if (trend.rawExcerpt) {
    addSectionHeader('Source Excerpt');
    doc.setFontSize(9);
    doc.setTextColor(107, 114, 128);
    const excerptLines = doc.splitTextToSize(s(trend.rawExcerpt), maxWidth - 8);
    doc.setDrawColor(209, 213, 219);
    doc.line(margin, y - 1, margin, y + excerptLines.length * 4);
    for (const line of excerptLines) {
      checkPageBreak(4.5);
      doc.text(line, margin + 4, y);
      y += 4;
    }
    y += 4;
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
  const filename = s(trend.title)
    .replace(/[^a-zA-Z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .toLowerCase()
    .slice(0, 60);

  doc.save(`trend-${filename || 'detail'}.pdf`);
  } catch (error) {
    console.error('[exportTrendDetailPdf] Failed to generate PDF:', error);
    alert('Failed to generate PDF. Please try again.');
  }
}
