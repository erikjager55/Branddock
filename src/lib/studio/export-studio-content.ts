// =============================================================
// Client-side export for Content Studio deliverables
// =============================================================

import { jsPDF } from 'jspdf';

interface ExportContext {
  title: string;
  contentType: string;
  campaignTitle: string;
  textContent: string;
  imageUrls: string[];
  videoUrl: string | null;
  qualityScore?: number;
  qualityMetrics?: Array<{ name: string; score: number; maxScore: number }>;
  checklistItems?: Array<{ label: string; checked: boolean }>;
}

// ─── PDF Export ─────────────────────────────────────────

export function exportAsPdf(ctx: ExportContext): void {
  try {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 20;
  const maxWidth = pageWidth - margin * 2;
  let y = margin;

  // Header bar
  doc.setFillColor(13, 148, 136); // teal-600
  doc.rect(0, 0, pageWidth, 14, 'F');
  doc.setFontSize(9);
  doc.setTextColor(255, 255, 255);
  doc.text('Branddock Content Studio', margin, 9);
  doc.text(new Date().toLocaleDateString('en-US'), pageWidth - margin, 9, { align: 'right' });

  y = 24;

  // Title
  doc.setFontSize(18);
  doc.setTextColor(17, 24, 39); // gray-900
  doc.text(ctx.title, margin, y);
  y += 8;

  // Campaign + content type
  doc.setFontSize(10);
  doc.setTextColor(107, 114, 128); // gray-500
  doc.text(`Campaign: ${ctx.campaignTitle}  |  Type: ${ctx.contentType}`, margin, y);
  y += 10;

  // Divider
  doc.setDrawColor(229, 231, 235); // gray-200
  doc.line(margin, y, pageWidth - margin, y);
  y += 8;

  // Content
  if (ctx.textContent) {
    doc.setFontSize(11);
    doc.setTextColor(31, 41, 55); // gray-800

    // Strip HTML tags for PDF
    const plainText = stripHtml(ctx.textContent);
    const lines = doc.splitTextToSize(plainText, maxWidth);

    for (const line of lines) {
      if (y > doc.internal.pageSize.getHeight() - 20) {
        doc.addPage();
        y = margin;
      }
      doc.text(line, margin, y);
      y += 5.5;
    }
  }

  // Quality section
  if (ctx.qualityScore != null) {
    if (y > doc.internal.pageSize.getHeight() - 40) {
      doc.addPage();
      y = margin;
    }
    y += 4;
    doc.setDrawColor(229, 231, 235);
    doc.line(margin, y, pageWidth - margin, y);
    y += 8;

    doc.setFontSize(12);
    doc.setTextColor(13, 148, 136); // teal-600
    doc.text('Content Quality', margin, y);
    y += 6;

    const score = Math.round(ctx.qualityScore);
    if (score >= 80) doc.setTextColor(16, 185, 129);
    else if (score >= 60) doc.setTextColor(245, 158, 11);
    else doc.setTextColor(239, 68, 68);
    doc.setFontSize(18);
    doc.text(`${score}/100`, margin, y);
    y += 8;

    if (ctx.qualityMetrics && ctx.qualityMetrics.length > 0) {
      doc.setFontSize(9);
      for (const m of ctx.qualityMetrics) {
        if (y > doc.internal.pageSize.getHeight() - 20) {
          doc.addPage();
          y = margin;
        }
        doc.setTextColor(107, 114, 128);
        doc.text(m.name, margin, y);
        doc.setTextColor(17, 24, 39);
        doc.text(`${Math.round(m.score)}/${m.maxScore}`, margin + 60, y);
        y += 5;
      }
      y += 2;
    }

    if (ctx.checklistItems && ctx.checklistItems.length > 0) {
      doc.setFontSize(9);
      doc.setTextColor(107, 114, 128);
      doc.text('Checklist', margin, y);
      y += 4;
      for (const item of ctx.checklistItems) {
        if (y > doc.internal.pageSize.getHeight() - 20) {
          doc.addPage();
          y = margin;
        }
        doc.setTextColor(55, 65, 81);
        doc.text(`${item.checked ? '[x]' : '[ ]'} ${item.label}`, margin + 2, y);
        y += 4.5;
      }
    }
  }

  // Footer
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(156, 163, 175); // gray-400
    doc.text(
      `Page ${i} of ${totalPages}`,
      pageWidth / 2,
      doc.internal.pageSize.getHeight() - 10,
      { align: 'center' },
    );
  }

  const filename = sanitizeFilename(ctx.title);
  doc.save(`${filename}.pdf`);
  } catch (error) {
    console.error('[exportAsPdf] Failed to generate PDF:', error);
    alert('Failed to generate PDF. Please try again.');
  }
}

// ─── HTML Export ────────────────────────────────────────

export function exportAsHtml(ctx: ExportContext): void {
  try {
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(ctx.title)}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif; max-width: 800px; margin: 0 auto; padding: 2rem; color: #1f2937; line-height: 1.6; }
    h1 { font-size: 1.5rem; margin-bottom: 0.25rem; }
    .meta { color: #6b7280; font-size: 0.875rem; margin-bottom: 1.5rem; }
    hr { border: none; border-top: 1px solid #e5e7eb; margin: 1.5rem 0; }
    .content { font-size: 1rem; }
    .content img { max-width: 100%; border-radius: 8px; margin: 1rem 0; }
  </style>
</head>
<body>
  <h1>${escapeHtml(ctx.title)}</h1>
  <p class="meta">Campaign: ${escapeHtml(ctx.campaignTitle)} | Type: ${escapeHtml(ctx.contentType)}</p>
  <hr>
  <div class="content">${stripUnsafeTags(ctx.textContent) || '<p>No content generated yet.</p>'}</div>${ctx.qualityScore != null ? `
  <hr>
  <div class="quality">
    <h2>Content Quality: ${Math.round(ctx.qualityScore)}/100</h2>${ctx.qualityMetrics && ctx.qualityMetrics.length > 0 ? `
    <table style="border-collapse:collapse;width:100%;margin:0.5rem 0">
      ${ctx.qualityMetrics.map(m => `<tr><td style="padding:4px 8px;border-bottom:1px solid #e5e7eb">${escapeHtml(m.name)}</td><td style="padding:4px 8px;border-bottom:1px solid #e5e7eb;text-align:right">${Math.round(m.score)}/${m.maxScore}</td></tr>`).join('')}
    </table>` : ''}${ctx.checklistItems && ctx.checklistItems.length > 0 ? `
    <ul style="list-style:none;padding:0">${ctx.checklistItems.map(i => `<li>${i.checked ? '&#9745;' : '&#9744;'} ${escapeHtml(i.label)}</li>`).join('')}</ul>` : ''}
  </div>` : ''}
</body>
</html>`;

  downloadBlob(html, `${sanitizeFilename(ctx.title)}.html`, 'text/html');
  } catch (error) {
    console.error('[exportAsHtml] Failed to generate HTML:', error);
    alert('Failed to generate HTML export. Please try again.');
  }
}

// ─── Plain Text Export ──────────────────────────────────

export function exportAsText(ctx: ExportContext): void {
  try {
  const plainText = stripHtml(ctx.textContent);
  let content = `${ctx.title}\nCampaign: ${ctx.campaignTitle} | Type: ${ctx.contentType}\n${'─'.repeat(60)}\n\n${plainText}`;
  if (ctx.qualityScore != null) {
    content += `\n\n${'─'.repeat(60)}\nContent Quality: ${Math.round(ctx.qualityScore)}/100\n`;
    if (ctx.qualityMetrics && ctx.qualityMetrics.length > 0) {
      for (const m of ctx.qualityMetrics) {
        content += `  ${m.name}: ${Math.round(m.score)}/${m.maxScore}\n`;
      }
    }
    if (ctx.checklistItems && ctx.checklistItems.length > 0) {
      content += '\nChecklist:\n';
      for (const item of ctx.checklistItems) {
        content += `  ${item.checked ? '[x]' : '[ ]'} ${item.label}\n`;
      }
    }
  }
  downloadBlob(content, `${sanitizeFilename(ctx.title)}.txt`, 'text/plain');
  } catch (error) {
    console.error('[exportAsText] Failed to generate text export:', error);
    alert('Failed to generate text export. Please try again.');
  }
}

// ─── Image Download ─────────────────────────────────────

export function downloadImage(url: string, filename: string): void {
  try {
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } catch (error) {
    console.error('[downloadImage] Failed to download image:', error);
    alert('Failed to download image. Please try again.');
  }
}

// ─── Copy to Clipboard ─────────────────────────────────

export async function copyContentToClipboard(textContent: string): Promise<boolean> {
  try {
    const plainText = stripHtml(textContent);
    await navigator.clipboard.writeText(plainText);
    return true;
  } catch {
    return false;
  }
}

// ─── Version History PDF Export ─────────────────────

interface VersionHistoryExportContext {
  deliverableTitle: string;
  campaignTitle: string;
  contentType: string;
  versions: Array<{
    versionNumber: number;
    qualityScore: number | null;
    qualityMetrics?: Array<{ name: string; score: number; maxScore: number }>;
    contentPreview: string | null;
    createdAt: string;
    createdBy: string | null;
  }>;
}

export function exportVersionHistoryPdf(ctx: VersionHistoryExportContext): void {
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
  doc.setFillColor(13, 148, 136); // teal-600
  doc.rect(0, 0, pageWidth, 14, 'F');
  doc.setFontSize(9);
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.text('BRANDDOCK', margin, 9);
  doc.setFont('helvetica', 'normal');
  doc.text('Version History', pageWidth - margin, 9, { align: 'right' });
  y = 24;

  // Title
  doc.setTextColor(17, 24, 39);
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text(ctx.deliverableTitle, margin, y);
  y += 8;

  // Meta
  doc.setTextColor(107, 114, 128);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Campaign: ${ctx.campaignTitle}  |  Type: ${ctx.contentType}`, margin, y);
  y += 5;
  doc.text(`Total versions: ${ctx.versions.length}`, margin, y);
  y += 8;

  // Divider
  doc.setDrawColor(209, 213, 219);
  doc.line(margin, y, pageWidth - margin, y);
  y += 8;

  // Versions
  for (const v of ctx.versions) {
    checkPageBreak(30);

    // Version header row
    doc.setTextColor(17, 24, 39);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text(`v${v.versionNumber}`, margin, y);

    // Quality score badge
    if (v.qualityScore != null) {
      const scoreX = margin + 16;
      const score = Math.round(v.qualityScore);
      if (score >= 80) doc.setTextColor(16, 185, 129);
      else if (score >= 60) doc.setTextColor(245, 158, 11);
      else doc.setTextColor(239, 68, 68);
      doc.setFontSize(10);
      doc.text(`Quality: ${score}/100`, scoreX, y);
    }

    // Date
    doc.setTextColor(107, 114, 128);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    const dateStr = new Date(v.createdAt).toLocaleString('en-US', {
      year: 'numeric', month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
    doc.text(dateStr, pageWidth - margin, y, { align: 'right' });
    y += 5;

    // Author
    if (v.createdBy) {
      doc.setFontSize(8);
      doc.text(`By: ${v.createdBy}`, margin, y);
      y += 4;
    }

    // Quality metrics breakdown
    if (v.qualityMetrics && v.qualityMetrics.length > 0) {
      doc.setFontSize(8);
      doc.setTextColor(107, 114, 128);
      const metricsStr = v.qualityMetrics.map(m => `${m.name}: ${Math.round(m.score)}/${m.maxScore}`).join('  |  ');
      doc.text(metricsStr, margin, y);
      y += 4;
    }

    // Content preview
    if (v.contentPreview) {
      y += 1;
      doc.setTextColor(55, 65, 81);
      doc.setFontSize(9);
      const previewLines = doc.splitTextToSize(v.contentPreview, contentWidth - 4);
      const maxLines = Math.min(previewLines.length, 6);
      for (let i = 0; i < maxLines; i++) {
        checkPageBreak(4);
        doc.text(previewLines[i], margin + 2, y);
        y += 3.8;
      }
      if (previewLines.length > 6) {
        doc.setTextColor(107, 114, 128);
        doc.text('...', margin + 2, y);
        y += 3.8;
      }
    }

    y += 4;

    // Separator
    doc.setDrawColor(229, 231, 235);
    doc.line(margin, y, pageWidth - margin, y);
    y += 6;
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

  const filename = sanitizeFilename(ctx.deliverableTitle);
  doc.save(`${filename}-version-history.pdf`);
  } catch (error) {
    console.error('[exportVersionHistoryPdf] Failed to generate PDF:', error);
    alert('Failed to generate PDF. Please try again.');
  }
}

// ─── Helpers ────────────────────────────────────────────

function stripHtml(html: string): string {
  // Use DOMParser instead of innerHTML to avoid XSS risk
  const doc = new DOMParser().parseFromString(html, 'text/html');
  return doc.body.textContent || '';
}

function stripUnsafeTags(html: string): string {
  return html
    // Remove dangerous elements
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
    .replace(/<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi, '')
    .replace(/<embed\b[^>]*\/?>/gi, '')
    .replace(/<form\b[^<]*(?:(?!<\/form>)<[^<]*)*<\/form>/gi, '')
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
    .replace(/<link\b[^>]*\/?>/gi, '')
    .replace(/<meta\b[^>]*\/?>/gi, '')
    .replace(/<base\b[^>]*\/?>/gi, '')
    // Remove event handlers (quoted, unquoted, and backtick-quoted)
    .replace(/\s*on\w+\s*=\s*"[^"]*"/gi, '')
    .replace(/\s*on\w+\s*=\s*'[^']*'/gi, '')
    .replace(/\s*on\w+\s*=\s*`[^`]*`/gi, '')
    .replace(/\s*on\w+\s*=\s*[^\s>]+/gi, '')
    // Remove javascript: and data: protocol URIs in href/src attributes
    .replace(/\b(href|src)\s*=\s*["']?\s*javascript:/gi, '$1="')
    .replace(/\b(href|src)\s*=\s*["']?\s*data:/gi, '$1="');
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function sanitizeFilename(name: string): string {
  const sanitized = name
    .replace(/[^a-zA-Z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .toLowerCase()
    .slice(0, 60);
  return sanitized || 'untitled';
}

function downloadBlob(content: string, filename: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
