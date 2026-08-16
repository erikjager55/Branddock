import JSZip from 'jszip';
import { sanitizeFilename } from '@/lib/studio/export-studio-content';
import type { DeliverableResponse } from '@/types/campaign';

/**
 * Haalt de export-tekst van alle deliverables in ÉÉN aanroep op.
 *
 * Verving 2026-08-16 een per-deliverable `GET /api/studio/:id` in een lus. Die had twee
 * problemen. (1) Hij las `json.generatedText`, maar die route antwoordt genest als
 * `{ deliverable: { … } }` — dus de waarde was ALTIJD `undefined` en élk bestand in de ZIP
 * kreeg "No content generated yet", ongeacht content-type. (2) Een fetch per deliverable is
 * een fetch-loop (CLAUDE.md: "geen fetch loops — batch requests").
 *
 * De canvas-export-route doet het werk server-side mét de component-keten erbij, en gaat
 * door dezelfde `resolveDeliverableContent()` als de rest van de app — dus ook keten B
 * (structured variants) en C (legacy) komen mee.
 */
async function fetchExportTexts(
  campaignId: string,
  deliverableIds: string[],
): Promise<Map<string, string>> {
  const res = await fetch(`/api/campaigns/${campaignId}/canvas/export`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ deliverableIds }),
  });
  if (!res.ok) throw new Error(`Export request failed (${res.status})`);
  const json: { items?: Array<{ id: string; text: string }> } = await res.json();
  return new Map((json.items ?? []).map((i) => [i.id, i.text]));
}

interface ExportProgress {
  current: number;
  total: number;
  deliverableTitle: string;
}

/**
 * Export all COMPLETED deliverables from a campaign as a ZIP file.
 * Fetches generatedText per deliverable via the studio API and bundles as HTML files.
 */
export async function exportApprovedDeliverablesZip(
  campaignId: string,
  campaignTitle: string,
  deliverables: DeliverableResponse[],
  onProgress?: (progress: ExportProgress) => void,
): Promise<void> {
  const completed = deliverables.filter((d) => d.status === 'COMPLETED');
  if (completed.length === 0) return;

  const zip = new JSZip();
  const folderName = sanitizeFilename(campaignTitle);
  const folder = zip.folder(folderName)!;

  // Eén aanroep voor alle deliverables. Faalt die, dan krijgt elk bestand dezelfde
  // eerlijke melding i.p.v. een stil leeg document.
  let texts = new Map<string, string>();
  let fetchFailed = false;
  try {
    texts = await fetchExportTexts(campaignId, completed.map((d) => d.id));
  } catch (err) {
    fetchFailed = true;
    console.error('[export-zip] ophalen van export-teksten mislukt', err);
  }

  for (let i = 0; i < completed.length; i++) {
    const d = completed[i];
    onProgress?.({ current: i + 1, total: completed.length, deliverableTitle: d.title });

    const textContent = fetchFailed
      ? '<p>Content could not be loaded.</p>'
      : (texts.get(d.id) ?? '');

    const html = buildHtmlFile(d.title, campaignTitle, d.contentType, textContent, d.qualityScore);
    const filename = `${sanitizeFilename(d.title)}.html`;
    folder.file(filename, html);
  }

  const blob = await zip.generateAsync({ type: 'blob' });
  downloadBlob(blob, `${folderName}.zip`);
}

function buildHtmlFile(
  title: string,
  campaignTitle: string,
  contentType: string,
  textContent: string,
  qualityScore?: number | null,
): string {
  const escaped = (s: string) =>
    s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

  const safeContent = stripUnsafeTags(textContent) || '<p>No content generated yet.</p>';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escaped(title)}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif; max-width: 800px; margin: 0 auto; padding: 2rem; color: #1f2937; line-height: 1.6; }
    h1 { font-size: 1.5rem; margin-bottom: 0.25rem; }
    .meta { color: #6b7280; font-size: 0.875rem; margin-bottom: 1.5rem; }
    hr { border: none; border-top: 1px solid #e5e7eb; margin: 1.5rem 0; }
    .content { font-size: 1rem; }
    .content img { max-width: 100%; border-radius: 8px; margin: 1rem 0; }
    .quality { color: #0d9488; font-weight: 600; }
  </style>
</head>
<body>
  <h1>${escaped(title)}</h1>
  <p class="meta">Campaign: ${escaped(campaignTitle)} | Type: ${escaped(contentType)}${qualityScore != null ? ` | <span class="quality">Quality: ${Math.round(qualityScore)}/100</span>` : ''}</p>
  <hr>
  <div class="content">${safeContent}</div>
</body>
</html>`;
}

function stripUnsafeTags(html: string): string {
  return html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
    .replace(/<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi, '')
    .replace(/<embed\b[^>]*\/?>/gi, '')
    .replace(/<form\b[^<]*(?:(?!<\/form>)<[^<]*)*<\/form>/gi, '')
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
    .replace(/<link\b[^>]*\/?>/gi, '')
    .replace(/<meta\b[^>]*\/?>/gi, '')
    .replace(/<base\b[^>]*\/?>/gi, '')
    .replace(/\s*on\w+\s*=\s*"[^"]*"/gi, '')
    .replace(/\s*on\w+\s*=\s*'[^']*'/gi, '')
    .replace(/\s*on\w+\s*=\s*`[^`]*`/gi, '')
    .replace(/\s*on\w+\s*=\s*[^\s>]+/gi, '')
    .replace(/\b(href|src)\s*=\s*["']?\s*javascript:/gi, '$1="')
    .replace(/\b(href|src)\s*=\s*["']?\s*data:/gi, '$1="');
}

function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
