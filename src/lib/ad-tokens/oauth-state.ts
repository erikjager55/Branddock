// =============================================================
// OAuth state-token manager for ad-account connections (Fase B).
//
// Mirror of src/lib/integrations/social-oauth/oauth-state.ts but
// scoped to ad-publishing so the two modules don't couple. Each
// state maps to (workspaceId, platform, userId) — userId so the
// callback can write ConnectedAdAccount.connectedById without
// re-resolving auth (which is also done, defense-in-depth).
//
// globalThis-singleton voor dev-mode HMR safety.
// =============================================================

import { randomBytes } from 'crypto';

interface AdOAuthStateEntry {
  workspaceId: string;
  platform: string; // "meta" | "linkedin" | "google"
  userId: string;
  createdAt: number;
}

const STATE_TTL_MS = 10 * 60 * 1000; // 10 minutes

function getStore(): Map<string, AdOAuthStateEntry> {
  const g = globalThis as unknown as { __adAccountOAuthStates?: Map<string, AdOAuthStateEntry> };
  if (!g.__adAccountOAuthStates) {
    g.__adAccountOAuthStates = new Map();
  }
  return g.__adAccountOAuthStates;
}

export function createAdOAuthState(
  workspaceId: string,
  platform: string,
  userId: string,
): string {
  const store = getStore();
  const state = randomBytes(32).toString('hex');

  // Cleanup expired
  const now = Date.now();
  for (const [key, entry] of store) {
    if (now - entry.createdAt > STATE_TTL_MS) store.delete(key);
  }

  store.set(state, { workspaceId, platform, userId, createdAt: now });
  return state;
}

export function consumeAdOAuthState(
  state: string,
): { workspaceId: string; platform: string; userId: string } | null {
  const store = getStore();
  const entry = store.get(state);
  if (!entry) return null;

  store.delete(state);
  if (Date.now() - entry.createdAt > STATE_TTL_MS) return null;

  return { workspaceId: entry.workspaceId, platform: entry.platform, userId: entry.userId };
}
