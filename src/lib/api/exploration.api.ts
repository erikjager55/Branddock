// ─── AI Exploration API Client ──────────────────────────────
// Generic client-side fetch functions for the AI Exploration module.
// Routes: /api/exploration/[itemType]/[itemId]/...

import type {
  ExplorationMessage,
  ExplorationSession,
  ExplorationInsightsData,
  ExplorationModelOption,
} from '@/components/ai-exploration/types';

function baseUrl(itemType: string, itemId: string): string {
  return `/api/exploration/${itemType}/${itemId}`;
}

// ─── Fetch Available Models ─────────────────────────────────

export async function fetchExplorationModels(): Promise<ExplorationModelOption[]> {
  const res = await fetch('/api/exploration/models');
  if (!res.ok) return [];
  const data = await res.json();
  return data.models ?? [];
}

// ─── Start Session ──────────────────────────────────────────

export async function startExplorationSession(
  itemType: string,
  itemId: string,
  modelId?: string,
): Promise<{
  sessionId: string;
  status: string;
  progress: number;
  totalDimensions: number;
  answeredDimensions: number;
  messages: ExplorationMessage[];
}> {
  const res = await fetch(`${baseUrl(itemType, itemId)}/analyze`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ modelId: modelId || null }),
  });
  if (!res.ok) {
    const rawText = await res.text().catch(() => '');
    let errorMsg = `Failed to start exploration session (${res.status})`;
    try {
      const errorData = JSON.parse(rawText);
      if (errorData.error) errorMsg = String(errorData.error);
      else if (errorData.debug) errorMsg = String(errorData.debug);
    } catch { /* non-JSON response */ }
    console.error('[exploration.api] startExplorationSession error:', res.status, rawText.slice(0, 500));
    throw new Error(errorMsg);
  }
  return res.json();
}

// ─── Get Session ────────────────────────────────────────────

export async function fetchExplorationSession(
  itemType: string,
  itemId: string,
  sessionId: string,
): Promise<ExplorationSession> {
  const res = await fetch(
    `${baseUrl(itemType, itemId)}/sessions/${sessionId}`,
  );
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    console.error('[exploration.api] fetchExplorationSession error:', res.status, errorData);
    throw new Error(errorData.error || `Failed to fetch exploration session (${res.status})`);
  }
  return res.json();
}

// ─── Send Answer ────────────────────────────────────────────

export async function sendExplorationAnswer(
  itemType: string,
  itemId: string,
  sessionId: string,
  content: string,
): Promise<{
  feedback: string;
  nextQuestion: {
    content: string;
    dimensionKey: string;
    dimensionTitle: string;
  } | null;
  progress: number;
  answeredDimensions: number;
  isComplete: boolean;
}> {
  const res = await fetch(
    `${baseUrl(itemType, itemId)}/sessions/${sessionId}/answer`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content }),
    },
  );
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    console.error('[exploration.api] sendExplorationAnswer error:', res.status, errorData);
    throw new Error(errorData.error || `Failed to send exploration answer (${res.status})`);
  }
  return res.json();
}

// ─── Complete Session ───────────────────────────────────────

export async function completeExploration(
  itemType: string,
  itemId: string,
  sessionId: string,
): Promise<{
  status: string;
  insightsData: ExplorationInsightsData;
  researchBoost: number;
  validationPercentage: number;
}> {
  const res = await fetch(
    `${baseUrl(itemType, itemId)}/sessions/${sessionId}/complete`,
    { method: 'POST' },
  );
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    console.error('[exploration.api] completeExploration error:', res.status, errorData);
    throw new Error(errorData.error || `Failed to complete exploration (${res.status})`);
  }
  return res.json();
}
