// =============================================================
// Quality metrics per content type
// =============================================================

export const QUALITY_METRICS: Record<string, string[]> = {
  text: ['Brand Alignment', 'Audience Fit', 'Research Backed', 'Readability'],
  images: ['Brand Alignment', 'Visual Quality', 'Composition', 'Color Harmony'],
  video: ['Brand Alignment', 'Pacing', 'Visual Quality', 'Message Clarity'],
  carousel: ['Brand Alignment', 'Flow & Coherence', 'Visual Consistency', 'Message Impact'],
};

export function getMetricsForType(contentTab: string | null): string[] {
  return QUALITY_METRICS[contentTab ?? 'text'] ?? QUALITY_METRICS.text;
}
