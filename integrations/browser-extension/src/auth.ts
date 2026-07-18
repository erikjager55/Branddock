// =============================================================
// Auth-state (chrome-gebonden): interactieve login via
// chrome.identity.launchWebAuthFlow, token-opslag in chrome.storage.local
// (tokens horen niet mee te syncen naar andere apparaten) en de gedeelde
// ensureAccessToken() met silent refresh.
//
// De pure OAuth-logica (PKCE, registratie, exchange, refresh-beslissing)
// zit in oauth.ts en is daar unit-getest; deze module is alleen de lijm
// naar chrome.identity en chrome.storage.
// =============================================================

import { normalizeBaseUrl, BranddockApiError } from './api';
import {
  generatePkcePair,
  randomState,
  buildAuthorizeUrl,
  parseCallbackUrl,
  registerClient,
  exchangeCode,
  ensureFreshTokens,
  NOT_LOGGED_IN_MESSAGE,
  BASE_URL_CHANGED_MESSAGE,
  type StoredOAuth,
} from './oauth';
import type { ExtensionSettings } from './settings';

/** Keys in chrome.storage.local (brands.ts hergebruikt brands/selectedBrand). */
export const LOCAL_KEYS = {
  tokens: 'oauthTokens',
  client: 'oauthClient',
  mode: 'authMode',
  brands: 'brandsCache',
  selectedBrand: 'selectedBrand',
} as const;

export type AuthMode = 'oauth' | 'key';

interface StoredClient {
  issuer: string;
  clientId: string;
}

async function readLocal<T>(key: string): Promise<T | undefined> {
  const stored = await chrome.storage.local.get(key);
  return stored[key] as T | undefined;
}

// ─── Auth-modus ──────────────────────────────────────────────

/**
 * Expliciet gekozen modus, met migratie-fallback voor bestaande installs:
 * tokens aanwezig → oauth; alleen een key geconfigureerd → key; anders
 * oauth (het aanbevolen pad voor nieuwe gebruikers).
 */
export async function getAuthMode(settings: ExtensionSettings): Promise<AuthMode> {
  const stored = await readLocal<AuthMode>(LOCAL_KEYS.mode);
  if (stored === 'oauth' || stored === 'key') return stored;
  if (await readLocal<StoredOAuth>(LOCAL_KEYS.tokens)) return 'oauth';
  return settings.apiKey.trim().startsWith('bd_live_') ? 'key' : 'oauth';
}

export async function setAuthMode(mode: AuthMode): Promise<void> {
  await chrome.storage.local.set({ [LOCAL_KEYS.mode]: mode });
}

// ─── Token-opslag ────────────────────────────────────────────

async function writeTokens(auth: StoredOAuth): Promise<void> {
  await chrome.storage.local.set({ [LOCAL_KEYS.tokens]: auth });
}

async function clearTokens(): Promise<void> {
  await chrome.storage.local.remove([LOCAL_KEYS.tokens]);
}

/** Merk-cache + keuze horen bij een login; weg bij (uit)loggen. */
async function clearBrandState(): Promise<void> {
  await chrome.storage.local.remove([LOCAL_KEYS.brands, LOCAL_KEYS.selectedBrand]);
}

/**
 * Ingelogd = tokens aanwezig én uitgegeven door de huidige Base URL.
 * Geen netwerk-check; expiry wordt lazy opgelost in ensureAccessToken().
 */
export async function isLoggedIn(baseUrl: string): Promise<boolean> {
  const auth = await readLocal<StoredOAuth>(LOCAL_KEYS.tokens);
  return auth !== undefined && auth.issuer === normalizeBaseUrl(baseUrl);
}

// ─── ensureAccessToken (gedeeld, met silent refresh) ─────────

// Single-flight per JS-context: voorkomt dubbele gelijktijdige refreshes
// vanuit dezelfde popup/service-worker. (Popup en service-worker zijn
// gescheiden contexten — een cross-context race is theoretisch mogelijk
// maar onschadelijk zolang de server het oude refresh-token niet hard
// intrekt bij rotatie; zie README.)
let inflight: Promise<string> | null = null;

/**
 * Geeft een geldig access-token voor de huidige Base URL; ververst stil
 * via het refresh-token wanneer het (bijna) verlopen is. Bij een
 * geweigerde refresh worden de tokens gewist zodat de UI consequent
 * "log opnieuw in" toont.
 */
export async function ensureAccessToken(baseUrl: string): Promise<string> {
  if (inflight) return inflight;
  inflight = (async () => {
    const auth = await readLocal<StoredOAuth>(LOCAL_KEYS.tokens);
    if (!auth) throw new BranddockApiError(NOT_LOGGED_IN_MESSAGE, 401);
    if (auth.issuer !== normalizeBaseUrl(baseUrl)) {
      throw new BranddockApiError(BASE_URL_CHANGED_MESSAGE, 401);
    }
    try {
      const { auth: fresh, refreshed } = await ensureFreshTokens(auth);
      if (refreshed) await writeTokens(fresh);
      return fresh.accessToken;
    } catch (error) {
      if (error instanceof BranddockApiError && error.status === 401) await clearTokens();
      throw error;
    }
  })();
  try {
    return await inflight;
  } finally {
    inflight = null;
  }
}

/** Ruimt op na een 401 uit de MCP-laag (token server-side ingetrokken). */
export async function handleAuthFailure(): Promise<void> {
  await clearTokens();
}

// ─── Interactieve login/logout ───────────────────────────────

function launchAuthFlow(url: string): Promise<string> {
  return new Promise((resolve, reject) => {
    chrome.identity.launchWebAuthFlow({ url, interactive: true }, (redirectUrl) => {
      if (chrome.runtime.lastError || !redirectUrl) {
        reject(
          new BranddockApiError('Inloggen geannuleerd of niet gelukt. Probeer het opnieuw.', 0),
        );
      } else {
        resolve(redirectUrl);
      }
    });
  });
}

/** Registreert eenmalig per install+issuer; hergebruikt de bewaarde client_id. */
async function ensureClientId(issuer: string, redirectUri: string): Promise<StoredClient> {
  const stored = await readLocal<StoredClient>(LOCAL_KEYS.client);
  if (stored && stored.issuer === issuer) return stored;
  const clientId = await registerClient(issuer, redirectUri);
  const client: StoredClient = { issuer, clientId };
  await chrome.storage.local.set({ [LOCAL_KEYS.client]: client });
  return client;
}

/**
 * Volledige interactieve OAuth-login: (eenmalige) dynamic client
 * registration → authorize met PKCE S256 in een apart venster → state-check
 * → code→token-exchange → tokens in chrome.storage.local. Zet de
 * auth-modus op 'oauth' en wist merk-cache/-keuze (ander account mogelijk).
 */
export async function loginWithBranddock(baseUrl: string): Promise<void> {
  const issuer = normalizeBaseUrl(baseUrl);
  const redirectUri = chrome.identity.getRedirectURL();
  const hadStoredClient = (await readLocal<StoredClient>(LOCAL_KEYS.client))?.issuer === issuer;
  const { clientId } = await ensureClientId(issuer, redirectUri);

  const { verifier, challenge } = await generatePkcePair();
  const state = randomState();
  const authorizeUrl = buildAuthorizeUrl(issuer, { clientId, redirectUri, state, challenge });

  try {
    const redirectResult = await launchAuthFlow(authorizeUrl);
    const code = parseCallbackUrl(redirectResult, state);
    const tokens = await exchangeCode(issuer, { code, redirectUri, clientId, verifier });
    await writeTokens({ issuer, clientId, ...tokens });
  } catch (error) {
    // Een bewaarde client_id kan server-side verdwenen zijn (bijv. DB-reset);
    // door hem te droppen registreert de volgende poging vers.
    if (hadStoredClient) await chrome.storage.local.remove([LOCAL_KEYS.client]);
    throw error;
  }

  await setAuthMode('oauth');
  await clearBrandState();
}

/** Wist tokens + merk-state; de client-registratie blijft (public client). */
export async function logout(): Promise<void> {
  await clearTokens();
  await clearBrandState();
}
