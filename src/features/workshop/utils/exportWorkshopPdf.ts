import { jsPDF } from 'jspdf';
import type { Workshop } from '../types/workshop.types';

/** Export a completed Workshop as a PDF */
export function exportWorkshopPdf(workshop: Workshop, brandAssetName?: string) {
  try {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 20;
  const maxWidth = pageWidth - margin * 2;
  let y = margin;

  const s = (v: unknown): string => (v == null ? '' : String(v));

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

  doc.setFillColor(5, 150, 105); // emerald-600
  doc.rect(0, 0, pageWidth, 14, 'F');
  doc.setFontSize(9);
  doc.setTextColor(255, 255, 255);
  doc.text('Branddock — Canvas Workshop Report', margin, 9);
  doc.text(new Date().toLocaleDateString('en-US'), pageWidth - margin, 9, { align: 'right' });

  y = 24;

  // ── Title ───────────────────────────────────────────────

  doc.setFontSize(18);
  doc.setTextColor(17, 24, 39);
  doc.text(workshop.title || 'Canvas Workshop', margin, y);
  y += 8;

  // Metadata
  doc.setFontSize(10);
  doc.setTextColor(107, 114, 128);
  const metaParts: string[] = [];
  if (brandAssetName) metaParts.push(`Asset: ${brandAssetName}`);
  if (workshop.scheduledDate) metaParts.push(`Scheduled: ${new Date(workshop.scheduledDate).toLocaleDateString('en-US')}${workshop.scheduledTime ? ` at ${workshop.scheduledTime}` : ''}`);
  if (workshop.completedAt) metaParts.push(`Completed: ${new Date(workshop.completedAt).toLocaleDateString('en-US')}`);
  if (workshop.durationMinutes) metaParts.push(`Duration: ${workshop.durationMinutes} min`);
  if (workshop.facilitatorName) metaParts.push(`Facilitator: ${workshop.facilitatorName}`);
  if (metaParts.length > 0) {
    doc.text(metaParts.join('  |  '), margin, y);
    y += 6;
  }
  y += 4;

  // ── Participants ────────────────────────────────────────

  if (workshop.participants.length > 0) {
    addSectionHeader(`Participants (${workshop.participants.length})`);

    for (const p of workshop.participants) {
      checkPageBreak(6);
      doc.setFontSize(10);
      doc.setTextColor(31, 41, 55);
      doc.text(`• ${p.name}`, margin, y);
      if (p.role) {
        doc.setTextColor(107, 114, 128);
        doc.text(` — ${p.role}`, margin + doc.getTextWidth(`• ${p.name}`), y);
      }
      y += 5;
    }
    y += 3;
  }

  // ── Agenda Items ───────────────────────────────────────

  if (workshop.agendaItems.length > 0) {
    addSectionHeader(`Agenda (${workshop.agendaItems.length} items)`);

    for (const item of workshop.agendaItems) {
      checkPageBreak(8);
      doc.setFontSize(10);
      doc.setTextColor(31, 41, 55);
      const timePart = item.time ? `${item.time} — ` : '';
      const durationPart = item.duration ? ` (${item.duration})` : '';
      doc.text(`${timePart}${item.activity}${durationPart}`, margin, y);
      y += 4.5;
      if (item.details) {
        doc.setFontSize(9);
        doc.setTextColor(107, 114, 128);
        const lines = doc.splitTextToSize(item.details, maxWidth - 4);
        for (const line of lines) {
          checkPageBreak(4);
          doc.text(line, margin + 2, y);
          y += 4;
        }
      }
      y += 2;
    }
    y += 2;
  }

  // ── Executive Summary ───────────────────────────────────

  if (workshop.executiveSummary) {
    addSectionHeader('Executive Summary');
    addField('', workshop.executiveSummary);
  }

  // ── Key Findings ────────────────────────────────────────

  if (workshop.findings.length > 0) {
    addSectionHeader(`Key Findings (${workshop.findings.length})`);

    for (const finding of workshop.findings) {
      checkPageBreak(8);
      doc.setFontSize(10);
      doc.setTextColor(31, 41, 55);
      const lines = doc.splitTextToSize(`${finding.order}. ${finding.content}`, maxWidth);
      for (const line of lines) {
        checkPageBreak(5);
        doc.text(line, margin, y);
        y += 4.5;
      }
      y += 2;
    }
    y += 2;
  }

  // ── Recommendations ─────────────────────────────────────

  if (workshop.recommendations.length > 0) {
    addSectionHeader(`Recommendations (${workshop.recommendations.length})`);

    for (const rec of workshop.recommendations) {
      checkPageBreak(8);
      const prefix = rec.isCompleted ? '✓' : '○';
      doc.setFontSize(10);
      doc.setTextColor(rec.isCompleted ? 5 : 31, rec.isCompleted ? 150 : 41, rec.isCompleted ? 105 : 55);
      const lines = doc.splitTextToSize(`${prefix} ${rec.order}. ${rec.content}`, maxWidth);
      for (const line of lines) {
        checkPageBreak(5);
        doc.text(line, margin, y);
        y += 4.5;
      }
      y += 2;
    }
    y += 2;
  }

  // ── Canvas Data ─────────────────────────────────────────

  if (workshop.canvasData) {
    addSectionHeader('Canvas Data');
    const canvas = workshop.canvasData as Record<string, unknown>;

    // Golden Circle WHY/HOW/WHAT
    for (const ring of ['why', 'how', 'what'] as const) {
      const value = s(canvas[ring]);
      if (value) {
        addField(ring.toUpperCase(), value);
      }
    }
  }

  // ── Step Responses ──────────────────────────────────────

  const answeredSteps = workshop.steps.filter((st) => st.response);
  if (answeredSteps.length > 0) {
    addSectionHeader('Workshop Step Responses');

    for (const step of answeredSteps) {
      checkPageBreak(14);
      doc.setFontSize(10);
      doc.setTextColor(17, 24, 39);
      doc.text(`Step ${step.stepNumber}: ${step.title}`, margin, y);
      y += 5;

      if (step.response) {
        doc.setFontSize(9);
        doc.setTextColor(55, 65, 81);
        const lines = doc.splitTextToSize(step.response, maxWidth);
        for (const line of lines) {
          checkPageBreak(5);
          doc.text(line, margin, y);
          y += 4.5;
        }
      }
      y += 4;
    }
  }

  // ── Notes ───────────────────────────────────────────────

  if (workshop.notes.length > 0) {
    addSectionHeader(`Notes (${workshop.notes.length})`);

    for (const note of workshop.notes) {
      checkPageBreak(12);
      doc.setFontSize(9);
      doc.setTextColor(107, 114, 128);
      doc.text(`${note.authorName}${note.authorRole ? ` (${note.authorRole})` : ''}`, margin, y);
      y += 4;
      doc.setFontSize(10);
      doc.setTextColor(31, 41, 55);
      const lines = doc.splitTextToSize(note.content, maxWidth);
      for (const line of lines) {
        checkPageBreak(5);
        doc.text(line, margin, y);
        y += 4.5;
      }
      y += 3;
    }
  }

  // ── Photos ─────────────────────────────────────────────

  if (workshop.photos.length > 0) {
    addSectionHeader(`Photos (${workshop.photos.length})`);

    for (const photo of workshop.photos) {
      checkPageBreak(6);
      doc.setFontSize(9);
      doc.setTextColor(31, 41, 55);
      const caption = photo.caption ? `${photo.caption} — ` : '';
      doc.text(`• ${caption}${photo.url}`, margin, y);
      y += 5;
    }
    y += 2;
  }

  // ── Objectives ──────────────────────────────────────────

  if (workshop.objectives.length > 0) {
    addSectionHeader('Objectives');

    for (const obj of workshop.objectives) {
      checkPageBreak(6);
      const prefix = obj.isCompleted ? '✓' : '○';
      doc.setFontSize(10);
      doc.setTextColor(obj.isCompleted ? 5 : 31, obj.isCompleted ? 150 : 41, obj.isCompleted ? 105 : 55);
      doc.text(`${prefix} ${obj.content}`, margin, y);
      y += 5;
    }
    y += 2;
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

  const filename = (workshop.title ?? '')
    .replace(/[^a-zA-Z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .toLowerCase()
    .slice(0, 60) || 'workshop';

  doc.save(`workshop-${filename}.pdf`);
  } catch (error) {
    console.error('[exportWorkshopPdf] Failed to generate PDF:', error);
    alert('Failed to generate PDF. Please try again.');
  }
}
