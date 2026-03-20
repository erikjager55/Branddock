import type { CampaignBlueprint } from '@/lib/campaigns/strategy-blueprint.types';

interface CampaignStrategyJsonData {
  campaignName: string;
  campaignGoalType?: string;
  blueprint: CampaignBlueprint;
  confidence: number | null;
  generatedAt: string | null;
}

/** Export Campaign Strategy Blueprint as a JSON download */
export function exportCampaignStrategyJson(data: CampaignStrategyJsonData) {
  try {
  const exportPayload = {
    metadata: {
      exportedAt: new Date().toISOString(),
      campaignName: data.campaignName,
      campaignGoalType: data.campaignGoalType ?? null,
      confidence: data.confidence,
      generatedAt: data.generatedAt,
    },
    blueprint: data.blueprint,
  };

  const json = JSON.stringify(exportPayload, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  const filename = data.campaignName
    .replace(/[^a-zA-Z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .toLowerCase()
    .slice(0, 60) || 'campaign-strategy';
  link.download = `campaign-strategy-${filename}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
  } catch (error) {
    console.error('[exportCampaignStrategyJson] Failed to generate JSON export:', error);
    alert('Failed to generate JSON export. Please try again.');
  }
}
