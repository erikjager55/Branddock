import type { DetectedTrendWithMeta } from '../types/trend-radar.types';

/** Export all trends as a JSON download */
export function exportTrendRadarJson(trends: DetectedTrendWithMeta[]) {
  try {
  const exportPayload = {
    metadata: {
      exportedAt: new Date().toISOString(),
      totalTrends: trends.length,
      activated: trends.filter((t) => t.isActivated).length,
    },
    trends: trends.map((t) => ({
      title: t.title,
      description: t.description,
      category: t.category,
      scope: t.scope,
      impactLevel: t.impactLevel,
      timeframe: t.timeframe,
      relevanceScore: t.relevanceScore,
      direction: t.direction,
      confidence: t.confidence,
      whyNow: t.whyNow,
      aiAnalysis: t.aiAnalysis,
      dataPoints: t.dataPoints,
      sourceUrls: (t.sourceUrls ?? []).filter((u) => !u.startsWith('search:')),
      industries: t.industries,
      tags: t.tags,
      howToUse: t.howToUse,
      scores: t.scores,
      detectionSource: t.detectionSource,
      evidenceCount: t.evidenceCount,
      imageUrl: t.imageUrl,
      isActivated: t.isActivated,
      createdAt: t.createdAt,
    })),
  };

  const json = JSON.stringify(exportPayload, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'trend-radar-export.json';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
  } catch (error) {
    console.error('[exportTrendRadarJson] Failed to generate JSON export:', error);
    alert('Failed to generate JSON export. Please try again.');
  }
}

/** Export a single trend as a JSON download */
export function exportTrendDetailJson(trend: DetectedTrendWithMeta) {
  try {
  const exportPayload = {
    metadata: {
      exportedAt: new Date().toISOString(),
    },
    trend: {
      title: trend.title,
      description: trend.description,
      category: trend.category,
      scope: trend.scope,
      impactLevel: trend.impactLevel,
      timeframe: trend.timeframe,
      relevanceScore: trend.relevanceScore,
      direction: trend.direction,
      confidence: trend.confidence,
      whyNow: trend.whyNow,
      aiAnalysis: trend.aiAnalysis,
      rawExcerpt: trend.rawExcerpt,
      dataPoints: trend.dataPoints,
      sourceUrls: (trend.sourceUrls ?? []).filter((u) => !u.startsWith('search:')),
      sourceUrl: trend.sourceUrl,
      industries: trend.industries,
      tags: trend.tags,
      howToUse: trend.howToUse,
      scores: trend.scores,
      detectionSource: trend.detectionSource,
      evidenceCount: trend.evidenceCount,
      imageUrl: trend.imageUrl,
      isActivated: trend.isActivated,
      activatedAt: trend.activatedAt,
      createdAt: trend.createdAt,
    },
  };

  const json = JSON.stringify(exportPayload, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  const filename = (trend.title || 'trend')
    .replace(/[^a-zA-Z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .toLowerCase()
    .slice(0, 60) || 'detail';
  link.download = `trend-${filename}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
  } catch (error) {
    console.error('[exportTrendDetailJson] Failed to generate JSON export:', error);
    alert('Failed to generate JSON export. Please try again.');
  }
}
