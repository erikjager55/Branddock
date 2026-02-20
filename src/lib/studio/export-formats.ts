// =============================================================
// Export formats per content type
// =============================================================

export interface ExportFormat {
  id: string;
  label: string;
  extension: string;
}

export const EXPORT_FORMATS: Record<string, ExportFormat[]> = {
  text: [
    { id: 'docx', label: 'Word Document', extension: '.docx' },
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
    { id: 'pptx', label: 'PowerPoint', extension: '.pptx' },
    { id: 'png', label: 'PNG (all slides)', extension: '.png' },
  ],
};

export function getFormatsForType(contentTab: string | null): ExportFormat[] {
  return EXPORT_FORMATS[contentTab ?? 'text'] ?? EXPORT_FORMATS.text;
}
