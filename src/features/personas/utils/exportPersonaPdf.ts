import { jsPDF } from 'jspdf';

interface ExplorationDimension {
  key: string;
  title: string;
  summary: string;
}

interface ExplorationFinding {
  title: string;
  description: string;
}

export interface PersonaExplorationData {
  dimensions?: ExplorationDimension[];
  findings?: ExplorationFinding[];
  recommendations?: string[];
  executiveSummary?: string;
  completedAt?: string;
}

interface PersonaExportData {
  name: string;
  tagline?: string;
  location?: string;
  occupation?: string;
  quote?: string;
  bio?: string;
  age?: string;
  gender?: string;
  education?: string;
  income?: string;
  familyStatus?: string;
  personalityType?: string;
  coreValues?: string[];
  interests?: string[];
  goals?: Array<string | { text?: string }>;
  motivations?: Array<string | { text?: string }>;
  frustrations?: Array<string | { text?: string }>;
  behaviors?: Array<string | { text?: string }>;
  preferredChannels?: string[];
  techStack?: string[];
  buyingTriggers?: Array<string | { text?: string }>;
  decisionCriteria?: Array<string | { text?: string }>;
  strategicImplications?: string;
  exploration?: PersonaExplorationData;
}

function getItemText(item: string | { text?: string; name?: string; title?: string }): string {
  if (typeof item === 'string') return item;
  return item.text || item.name || item.title || String(item);
}

export function exportPersonaPdf(data: PersonaExportData) {
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

  // Header bar
  doc.setFillColor(16, 185, 129); // emerald-500
  doc.rect(0, 0, pageWidth, 14, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('BRANDDOCK', margin, 9);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text('Persona Export', pageWidth - margin, 9, { align: 'right' });
  y = 24;

  // Name
  doc.setTextColor(17, 24, 39); // gray-900
  doc.setFontSize(22);
  doc.setFont('helvetica', 'bold');
  doc.text(data.name, margin, y);
  y += 8;

  // Tagline
  if (data.tagline) {
    doc.setTextColor(107, 114, 128); // gray-500
    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    doc.text(data.tagline, margin, y);
    y += 6;
  }

  // Location & occupation
  const meta = [data.location, data.occupation].filter(Boolean).join('  |  ');
  if (meta) {
    doc.setFontSize(9);
    doc.text(meta, margin, y);
    y += 8;
  }

  // Divider
  doc.setDrawColor(209, 213, 219);
  doc.line(margin, y, pageWidth - margin, y);
  y += 6;

  // Quote
  if (data.quote) {
    checkPageBreak(12);
    doc.setTextColor(55, 65, 81);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'italic');
    const quoteLines = doc.splitTextToSize(`"${data.quote}"`, contentWidth - 10);
    doc.text(quoteLines, margin + 5, y);
    y += quoteLines.length * 5 + 6;
    doc.setFont('helvetica', 'normal');
  }

  // Helper: section header
  const addSectionHeader = (title: string) => {
    checkPageBreak(14);
    doc.setTextColor(16, 185, 129);
    doc.setFontSize(13);
    doc.setFont('helvetica', 'bold');
    doc.text(title, margin, y);
    y += 7;
    doc.setFont('helvetica', 'normal');
  };

  // Helper: label + value
  const addField = (label: string, value: string) => {
    if (!value) return;
    checkPageBreak(10);
    doc.setTextColor(107, 114, 128);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.text(label.toUpperCase(), margin, y);
    y += 4;
    doc.setTextColor(17, 24, 39);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(value, margin, y);
    y += 6;
  };

  // Helper: list
  const addList = (title: string, items: Array<string | { text?: string }> | undefined) => {
    if (!items || items.length === 0) return;
    addSectionHeader(title);
    doc.setTextColor(55, 65, 81);
    doc.setFontSize(10);
    items.forEach(item => {
      checkPageBreak(8);
      const text = getItemText(item);
      const lines = doc.splitTextToSize(`•  ${text}`, contentWidth - 5);
      doc.text(lines, margin + 2, y);
      y += lines.length * 5 + 2;
    });
    y += 2;
  };

  // Demographics
  addSectionHeader('Demographics');
  const demoFields: [string, string | undefined][] = [
    ['Age', data.age],
    ['Gender', data.gender],
    ['Education', data.education],
    ['Income', data.income],
    ['Family Status', data.familyStatus],
  ];
  demoFields.forEach(([label, value]) => {
    if (value) addField(label, value);
  });
  y += 2;

  // Psychographics
  if (data.personalityType || (data.coreValues && data.coreValues.length > 0)) {
    addSectionHeader('Psychographics');
    if (data.personalityType) addField('Personality Type', data.personalityType);
    if (data.coreValues && data.coreValues.length > 0) {
      addField('Core Values', data.coreValues.join('  |  '));
    }
    if (data.interests && data.interests.length > 0) {
      addField('Interests', data.interests.join('  |  '));
    }
    y += 2;
  }

  // Lists
  addList('Goals', data.goals);
  addList('Motivations', data.motivations);
  addList('Frustrations', data.frustrations);
  addList('Behaviors', data.behaviors);

  // Channels
  if (data.preferredChannels && data.preferredChannels.length > 0) {
    addSectionHeader('Preferred Channels');
    doc.setTextColor(55, 65, 81);
    doc.setFontSize(10);
    const channelLines = doc.splitTextToSize(data.preferredChannels.join('  |  '), contentWidth);
    for (const line of channelLines) {
      checkPageBreak(5);
      doc.text(line, margin, y);
      y += 5;
    }
  }

  // Tech Stack
  if (data.techStack && data.techStack.length > 0) {
    addSectionHeader('Tech Stack');
    doc.setTextColor(55, 65, 81);
    doc.setFontSize(10);
    const techLines = doc.splitTextToSize(data.techStack.join('  |  '), contentWidth);
    for (const line of techLines) {
      checkPageBreak(5);
      doc.text(line, margin, y);
      y += 5;
    }
    y += 2;
  }

  addList('Buying Triggers', data.buyingTriggers);
  addList('Decision Criteria', data.decisionCriteria);

  // Strategic Implications
  if (data.strategicImplications) {
    addSectionHeader('Strategic Implications');
    doc.setTextColor(55, 65, 81);
    doc.setFontSize(10);
    const implLines = doc.splitTextToSize(data.strategicImplications, contentWidth);
    checkPageBreak(implLines.length * 5 + 4);
    doc.text(implLines, margin, y);
    y += implLines.length * 5 + 4;
  }

  // AI Exploration Results
  if (data.exploration) {
    const ex = data.exploration;

    // Executive Summary
    if (ex.executiveSummary) {
      addSectionHeader('AI Exploration — Executive Summary');
      doc.setTextColor(55, 65, 81);
      doc.setFontSize(10);
      const summaryLines = doc.splitTextToSize(ex.executiveSummary, contentWidth);
      for (const line of summaryLines) {
        checkPageBreak(5);
        doc.text(line, margin, y);
        y += 4.5;
      }
      y += 4;
    }

    // Dimension insights
    if (ex.dimensions && ex.dimensions.length > 0) {
      addSectionHeader('AI Exploration — Dimension Insights');
      for (const dim of ex.dimensions) {
        checkPageBreak(14);
        doc.setTextColor(17, 24, 39);
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.text(dim.title, margin, y);
        y += 5;
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(55, 65, 81);
        doc.setFontSize(9);
        const dimLines = doc.splitTextToSize(dim.summary, contentWidth - 4);
        for (const line of dimLines) {
          checkPageBreak(4.5);
          doc.text(line, margin + 2, y);
          y += 4;
        }
        y += 3;
      }
    }

    // Findings
    if (ex.findings && ex.findings.length > 0) {
      addSectionHeader('AI Exploration — Key Findings');
      for (let i = 0; i < ex.findings.length; i++) {
        const finding = ex.findings[i];
        checkPageBreak(14);
        doc.setTextColor(17, 24, 39);
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.text(`${i + 1}. ${finding.title}`, margin, y);
        y += 5;
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(55, 65, 81);
        doc.setFontSize(9);
        const findingLines = doc.splitTextToSize(finding.description, contentWidth - 4);
        for (const line of findingLines) {
          checkPageBreak(4.5);
          doc.text(line, margin + 2, y);
          y += 4;
        }
        y += 3;
      }
    }

    // Recommendations
    if (ex.recommendations && ex.recommendations.length > 0) {
      addSectionHeader('AI Exploration — Recommendations');
      doc.setTextColor(55, 65, 81);
      doc.setFontSize(10);
      for (const rec of ex.recommendations) {
        checkPageBreak(8);
        const recLines = doc.splitTextToSize(`•  ${rec}`, contentWidth - 5);
        doc.text(recLines, margin + 2, y);
        y += recLines.length * 5 + 2;
      }
      y += 2;
    }
  }

  // Footer
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setDrawColor(209, 213, 219);
    doc.line(margin, 280, pageWidth - margin, 280);
    doc.setTextColor(156, 163, 175);
    doc.setFontSize(8);
    doc.text('Generated by Branddock  |  Confidential', pageWidth / 2, 284, { align: 'center' });
  }

  // Save
  const filename = data.name
    .replace(/[^a-zA-Z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .toLowerCase()
    .slice(0, 60) || 'persona';
  doc.save(`${filename}-persona.pdf`);
  } catch (error) {
    console.error('[exportPersonaPdf] Failed to generate PDF:', error);
    alert('Failed to generate PDF. Please try again.');
  }
}
