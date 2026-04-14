// =============================================================
// OAuth State Manager — CSRF protection for social OAuth flows
//
// Uses an in-memory Map with TTL to store state parameters.
// Each state maps back to a workspace + platform so the callback
// can route correctly. globalThis singleton for dev-mode HMR.
// =============================================================

import crypto from 'crypto';

interface OAuthStateEntry {
  workspaceId: string;
  platform: string;
  createdAt: number;
}

const STATE_TTL_MS = 10 * 60 * 1000; // 10 minutes

function getStore(): Map<string, OAuthStateEntry> {
  const g = globalThis as unknown as { __socialOAuthStates?: Map<string, OAuthStateEntry> };
  if (!g.__socialOAuthStates) {
    g.__socialOAuthStates = new Map();
  }
  return g.__socialOAuthStates;
}

/** Create a new OAuth state string and store it. */
export function createOAuthState(workspaceId: string, platform: string): string {
  const store = getStore();
  const state = crypto.randomBytes(32).toString('hex');

  // Clean up expired entries
  const now = Date.now();
  for (const [key, entry] of store) {
    if (now - entry.createdAt > STATE_TTL_MS) {
      store.delete(key);
    }
  }

  store.set(state, { workspaceId, platform, createdAt: now });
  return state;
}

/** Consume a state string (one-time use). Returns null if invalid or expired. */
export function consumeOAuthState(state: string): { workspaceId: string; platform: string } | null {
  const store = getStore();
  const entry = store.get(state);
  if (!entry) return null;

  store.delete(state);

  if (Date.now() - entry.createdAt > STATE_TTL_MS) return null;

  return { workspaceId: entry.workspaceId, platform: entry.platform };
}
