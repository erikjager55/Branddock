/**
 * Prompt Registry API client (Phase 6 — Settings UI niveau A).
 *
 * Read-only — leest uit `AICallSnapshot` + `AICallTrace` voor de
 * Settings → Developer → AI Prompts pagina.
 */

export interface PromptRegistryEntry {
  sourceIdentifier: string;
  sourceType: string;
  uniqueVersions: number;
  firstSeenAt: string | null;
  lastCallAt: string | null;
  callCount: number;
  successCount: number;
  errorCount: number;
  avgLatencyMs: number;
  totalInputTokens: number;
  totalOutputTokens: number;
}

export interface PromptVersionDetail {
  snapshotId: string;
  contentHash: string;
  sourceType: string;
  gitSha: string | null;
  firstSeenAt: string;
  model: string | null;
  messages: Array<{ role: string; content: string }>;
  params: unknown | null;
  providerExtensions: unknown | null;
  callCount: number;
  successCount: number;
  errorCount: number;
  avgLatencyMs: number;
  totalInputTokens: number;
  totalOutputTokens: number;
  lastCallAt: string | null;
}

export interface PromptRegistryDetail {
  sourceIdentifier: string;
  versionCount: number;
  versions: PromptVersionDetail[];
}

export async function fetchPromptRegistry(): Promise<PromptRegistryEntry[]> {
  const res = await fetch('/api/admin/prompt-registry');
  if (!res.ok) {
    throw new Error(`Failed to fetch prompt registry: ${res.status}`);
  }
  const data = await res.json();
  return data.prompts ?? [];
}

export async function fetchPromptDetail(
  identifier: string,
): Promise<PromptRegistryDetail> {
  const encoded = encodeURIComponent(identifier);
  const res = await fetch(`/api/admin/prompt-registry/${encoded}`);
  if (!res.ok) {
    throw new Error(`Failed to fetch prompt detail: ${res.status}`);
  }
  return res.json();
}
