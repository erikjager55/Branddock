// =============================================================
// Client-side export for Content Studio deliverables
// =============================================================

import jsPDF from 'jspdf';

interface ExportContext {
  title: string;
  contentType: string;
  campaignTitle: string;
  textContent: string;
  imageUrls: string[];
  videoUrl: string | null;
}

// ─── PDF Export ─────────────────────────────────────────

export function exportAsPdf(ctx: ExportContext): void {
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
}

// ─── HTML Export ────────────────────────────────────────

export function exportAsHtml(ctx: ExportContext): void {
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
  <div class="content">${stripUnsafeTags(ctx.textContent) || '<p>No content generated yet.</p>'}</div>
</body>
</html>`;

  downloadBlob(html, `${sanitizeFilename(ctx.title)}.html`, 'text/html');
}

// ─── Plain Text Export ──────────────────────────────────

export function exportAsText(ctx: ExportContext): void {
  const plainText = stripHtml(ctx.textContent);
  const content = `${ctx.title}\nCampaign: ${ctx.campaignTitle} | Type: ${ctx.contentType}\n${'─'.repeat(60)}\n\n${plainText}`;
  downloadBlob(content, `${sanitizeFilename(ctx.title)}.txt`, 'text/plain');
}

// ─── Image Download ─────────────────────────────────────

export function downloadImage(url: string, filename: string): void {
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.target = '_blank';
  link.rel = 'noopener noreferrer';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
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
