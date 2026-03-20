import { jsPDF } from 'jspdf';
import type { Interview } from '../types/interview.types';

/** Export a completed/approved Interview as a PDF */
export function exportInterviewPdf(interview: Interview) {
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

  doc.setFillColor(59, 130, 246); // blue-500
  doc.rect(0, 0, pageWidth, 14, 'F');
  doc.setFontSize(9);
  doc.setTextColor(255, 255, 255);
  doc.text('Branddock — Interview Report', margin, 9);
  doc.text(new Date().toLocaleDateString('en-US'), pageWidth - margin, 9, { align: 'right' });

  y = 24;

  // ── Title ───────────────────────────────────────────────

  doc.setFontSize(18);
  doc.setTextColor(17, 24, 39);
  doc.text(interview.title || `Interview #${interview.orderNumber}`, margin, y);
  y += 8;

  // Interviewee info
  const infoParts: string[] = [];
  if (interview.intervieweeName) infoParts.push(interview.intervieweeName);
  if (interview.intervieweePosition) infoParts.push(interview.intervieweePosition);
  if (interview.intervieweeCompany) infoParts.push(interview.intervieweeCompany);

  if (infoParts.length > 0) {
    doc.setFontSize(10);
    doc.setTextColor(107, 114, 128);
    doc.text(infoParts.join('  |  '), margin, y);
    y += 6;
  }
  y += 4;

  // ── Schedule Info ───────────────────────────────────────

  addSectionHeader('Interview Details');

  if (interview.scheduledDate) {
    addField('Scheduled Date', new Date(interview.scheduledDate).toLocaleDateString('en-US'));
  }
  if (interview.scheduledTime) {
    addField('Scheduled Time', interview.scheduledTime);
  }
  addField('Duration', `${interview.durationMinutes} minutes${interview.actualDuration ? ` (actual: ${interview.actualDuration} min)` : ''}`);
  addField('Status', interview.status);
  if (interview.approvedAt) {
    addField('Approved', new Date(interview.approvedAt).toLocaleDateString('en-US'));
  }

  // ── Questions & Answers ─────────────────────────────────

  const questions = interview.questions.sort((a, b) => a.orderIndex - b.orderIndex);

  if (questions.length > 0) {
    addSectionHeader(`Questions & Answers (${questions.length})`);

    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      checkPageBreak(20);

      // Question type badge
      doc.setFontSize(8);
      doc.setTextColor(107, 114, 128);
      doc.text(`[${q.questionType}]`, margin, y);
      y += 4;

      // Question text
      doc.setFontSize(10);
      doc.setTextColor(17, 24, 39);
      const qLines = doc.splitTextToSize(`Q${i + 1}: ${q.questionText}`, maxWidth);
      for (const line of qLines) {
        checkPageBreak(5);
        doc.text(line, margin, y);
        y += 4.5;
      }
      y += 2;

      // Answer
      if (q.isAnswered) {
        doc.setFontSize(9);
        doc.setTextColor(5, 150, 105);
        doc.text('Answer:', margin, y);
        y += 4;

        doc.setFontSize(10);
        doc.setTextColor(31, 41, 55);

        let answerText = '';
        if (q.answerText) {
          answerText = q.answerText;
        } else if (q.answerOptions.length > 0) {
          answerText = q.answerOptions.join(', ');
        } else if (q.answerRating != null) {
          answerText = `Rating: ${q.answerRating}`;
        } else if (q.answerRanking.length > 0) {
          answerText = q.answerRanking.map((r, idx) => `${idx + 1}. ${r}`).join(', ');
        }

        if (answerText) {
          const aLines = doc.splitTextToSize(answerText, maxWidth - 4);
          for (const line of aLines) {
            checkPageBreak(5);
            doc.text(line, margin + 4, y);
            y += 4.5;
          }
        }
      } else {
        doc.setFontSize(9);
        doc.setTextColor(156, 163, 175);
        doc.text('(Not answered)', margin, y);
      }

      y += 4;

      // Divider between questions
      if (i < questions.length - 1) {
        checkPageBreak(4);
        doc.setDrawColor(243, 244, 246);
        doc.line(margin, y, pageWidth - margin, y);
        y += 4;
      }
    }
  }

  // ── General Notes ───────────────────────────────────────

  if (interview.generalNotes) {
    addSectionHeader('General Notes');
    addField('', interview.generalNotes);
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

  const filename = (interview.intervieweeName || interview.title || `interview-${interview.orderNumber}`)
    .replace(/[^a-zA-Z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .toLowerCase()
    .slice(0, 60) || 'interview';

  doc.save(`interview-${filename}.pdf`);
  } catch (error) {
    console.error('[exportInterviewPdf] Failed to generate PDF:', error);
    alert('Failed to generate PDF. Please try again.');
  }
}
