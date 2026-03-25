// =============================================================
// Export formats per content type
// =============================================================

import { getDeliverableTypeById } from '@/features/campaigns/lib/deliverable-types';

export interface ExportFormat {
  id: string;
  label: string;
  extension: string;
}

/** Registry of all known export format objects, keyed by format ID */
export const FORMAT_REGISTRY: Record<string, ExportFormat> = {
  txt: { id: 'txt', label: 'Plain Text', extension: '.txt' },
  pdf: { id: 'pdf', label: 'PDF', extension: '.pdf' },
  html: { id: 'html', label: 'HTML', extension: '.html' },
  md: { id: 'md', label: 'Markdown', extension: '.md' },
  jpeg: { id: 'jpeg', label: 'JPEG', extension: '.jpeg' },
  png: { id: 'png', label: 'PNG', extension: '.png' },
  webp: { id: 'webp', label: 'WebP', extension: '.webp' },
  mp4: { id: 'mp4', label: 'MP4', extension: '.mp4' },
  webm: { id: 'webm', label: 'WebM', extension: '.webm' },
  pptx: { id: 'pptx', label: 'PowerPoint', extension: '.pptx' },
  srt: { id: 'srt', label: 'SRT Subtitles', extension: '.srt' },
};

export const EXPORT_FORMATS: Record<string, ExportFormat[]> = {
  text: [
    { id: 'txt', label: 'Plain Text', extension: '.txt' },
    { id: 'pdf', label: 'PDF', extension: '.pdf' },
    { id: 'html', label: 'HTML', extension: '.html' },
  ],
  images: [
    { id: 'jpeg', label: 'JPEG', extension: '.jpeg' },
    { id: 'png', label: 'PNG', extension: '.png' },
    { id: 'webp', label: 'WebP', extension: '.webp' },
  ],
  video: [
    { id: 'mp4', label: 'MP4', extension: '.mp4' },
    { id: 'webm', label: 'WebM', extension: '.webm' },
  ],
  carousel: [
    { id: 'pdf', label: 'PDF', extension: '.pdf' },
    { id: 'png', label: 'PNG (all slides)', extension: '.png' },
  ],
};

export function getFormatsForType(contentTab: string | null, deliverableTypeId?: string): ExportFormat[] {
  if (deliverableTypeId) {
    const typeDef = getDeliverableTypeById(deliverableTypeId);
    if (typeDef?.exportFormats && typeDef.exportFormats.length > 0) {
      const resolved = typeDef.exportFormats
        .map((fmtId) => FORMAT_REGISTRY[fmtId])
        .filter((fmt): fmt is ExportFormat => fmt != null);
      if (resolved.length > 0) return resolved;
    }
  }

  return EXPORT_FORMATS[contentTab ?? 'text'] ?? EXPORT_FORMATS.text;
}
