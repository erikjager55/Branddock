import type { ExplorationInsightsData, ExplorationMessage } from '../types';

interface ExplorationJsonData {
  itemName: string;
  itemType: string;
  sessionId: string | null;
  sessionDate: string;
  messages: ExplorationMessage[];
  insightsData: ExplorationInsightsData | null;
}

/** Export AI Exploration session data as a JSON download */
export function exportExplorationJson(data: ExplorationJsonData) {
  try {
  const exportPayload = {
    metadata: {
      itemName: data.itemName,
      itemType: data.itemType,
      sessionId: data.sessionId,
      exportedAt: new Date().toISOString(),
      sessionDate: data.sessionDate,
    },
    insightsData: data.insightsData,
    messages: data.messages,
  };

  const json = JSON.stringify(exportPayload, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  const filename = data.itemName
    .replace(/[^a-zA-Z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .toLowerCase()
    .slice(0, 60) || 'exploration';
  link.download = `${filename}-ai-exploration.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
  } catch (error) {
    console.error('[exportExplorationJson] Failed to generate JSON export:', error);
    alert('Failed to generate JSON export. Please try again.');
  }
}
