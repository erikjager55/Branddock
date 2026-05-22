// =============================================================
// Temporary token storage during the OAuth callback → ad-account
// selection step. After callback we have a long-lived token but
// the user must still pick WHICH ad-account to connect (Meta
// returns N accounts they have access to).
//
// Lives in-memory (globalThis singleton) with 10min TTL. Cleared
// once user submits /select. Not persistent — if user abandons
// the flow, the token is forgotten (better than orphan rows).
// =============================================================

import { randomBytes } from 'crypto';
import type { MetaAdAccount } from '@/lib/ad-providers/meta/types';

export interface PendingAdAccountSession {
  workspaceId: string;
  platform: string;
  userId: string;
  /** Long-lived access token (plain — encrypted only on persist). */
  accessToken: string;
  /** Unix-ms expiry, derived from Meta `expires_in`. */
  tokenExpiresAt: number;
  scopes: string[];
  availableAccounts: MetaAdAccount[];
  createdAt: number;
}

const PENDING_TTL_MS = 10 * 60 * 1000;

function getStore(): Map<string, PendingAdAccountSession> {
  const g = globalThis as unknown as { __adAccountPendingSessions?: Map<string, PendingAdAccountSession> };
  if (!g.__adAccountPendingSessions) {
    g.__adAccountPendingSessions = new Map();
  }
  return g.__adAccountPendingSessions;
}

export function storePendingAdAccountSession(
  data: Omit<PendingAdAccountSession, 'createdAt'>,
): string {
  const store = getStore();
  const sessionId = randomBytes(24).toString('hex');

  const now = Date.now();
  for (const [key, entry] of store) {
    if (now - entry.createdAt > PENDING_TTL_MS) store.delete(key);
  }

  store.set(sessionId, { ...data, createdAt: now });
  return sessionId;
}

export function consumePendingAdAccountSession(
  sessionId: string,
): PendingAdAccountSession | null {
  const store = getStore();
  const entry = store.get(sessionId);
  if (!entry) return null;
  store.delete(sessionId);
  if (Date.now() - entry.createdAt > PENDING_TTL_MS) return null;
  return entry;
}

/** Peek without consuming — used by the UI selection page. */
export function peekPendingAdAccountSession(
  sessionId: string,
): PendingAdAccountSession | null {
  const store = getStore();
  const entry = store.get(sessionId);
  if (!entry) return null;
  if (Date.now() - entry.createdAt > PENDING_TTL_MS) {
    store.delete(sessionId);
    return null;
  }
  return entry;
}
