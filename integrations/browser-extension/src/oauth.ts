// =============================================================
// OAuth-core (chrome-vrij): PKCE S256, dynamic client registration,
// authorize-URL, code→token-exchange en silent refresh tegen de Better
// Auth mcp-plugin van Branddock.
//
// Bewuste keuze: géén well-known-discovery. De server canonicaliseert zijn
// issuer naar BETTER_AUTH_URL (vandaag https://branddock.app); discovery-
// metadata zou dus endpoints op een ándere origin kunnen teruggeven dan de
// Base URL die de gebruiker instelde. De Base-URL-setting is hier leidend:
// alle endpoints worden er rechtstreeks van afgeleid. Wisselt de issuer of
// de Base URL, dan is een her-login (en her-registratie) nodig.
//
// Net als api.ts chrome- en DOM-vrij zodat `node --test` deze module met
// een gemockte fetch draait (WebCrypto zit in Node ≥20 op globalThis).
// =============================================================

import { normalizeBaseUrl, BranddockApiError, type FetchLike } from './api';

// Re-export voor de test-bundle: instanceof-checks moeten tegen de klasse
// uit déze bundle lopen (elke .test-build-bundle is zelfstandig).
export { BranddockApiError };

/** Scopes van de connector-flow — offline_access levert het refresh-token. */
export const OAUTH_SCOPE = 'openid profile email offline_access';

/** NL-meldingen die de UI 1-op-1 toont. */
export const NOT_LOGGED_IN_MESSAGE =
  'Je bent nog niet ingelogd bij Branddock. Log in via de extensie-instellingen.';
export const SESSION_EXPIRED_MESSAGE =
  'Je Branddock-sessie is verlopen. Log opnieuw in via de extensie-instellingen.';
export const BASE_URL_CHANGED_MESSAGE =
  'De Base URL is gewijzigd sinds je laatste login. Log opnieuw in via de extensie-instellingen.';

/** Refresh dit aantal ms vóór de echte expiry — vangt klok-drift en trage calls. */
const EXPIRY_MARGIN_MS = 60_000;
/** Fallback wanneer de token-respons geen expires_in meegeeft. */
const DEFAULT_EXPIRES_IN_S = 3600;
/** Token/registratie-calls zijn licht — ruim onder de rewrite-timeout. */
const OAUTH_REQUEST_TIMEOUT_MS = 30_000;

/** OAuth-endpoints, rechtstreeks afgeleid van de Base URL (zie kop-comment). */
export function oauthEndpoints(baseUrl: string): {
  register: string;
  authorize: string;
  token: string;
} {
  const base = normalizeBaseUrl(baseUrl);
  return {
    register: `${base}/api/auth/mcp/register`,
    authorize: `${base}/api/auth/mcp/authorize`,
    token: `${base}/api/auth/mcp/token`,
  };
}

// ─── PKCE (RFC 7636) ─────────────────────────────────────────

function base64UrlEncode(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/** S256-challenge bij een gegeven verifier (apart exporteerbaar voor tests). */
export async function challengeFromVerifier(verifier: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier));
  return base64UrlEncode(new Uint8Array(digest));
}

export interface PkcePair {
  verifier: string;
  challenge: string;
}

/** 32 random bytes → 43-teken base64url-verifier + bijbehorende S256-challenge. */
export async function generatePkcePair(): Promise<PkcePair> {
  const verifier = base64UrlEncode(crypto.getRandomValues(new Uint8Array(32)));
  return { verifier, challenge: await challengeFromVerifier(verifier) };
}

/** CSRF-state voor de authorize-redirect. */
export function randomState(): string {
  return base64UrlEncode(crypto.getRandomValues(new Uint8Array(16)));
}

// ─── Dynamic client registration ─────────────────────────────

async function postJson(
  url: string,
  body: unknown,
  fetchFn: FetchLike,
  contentType = 'application/json',
): Promise<Response> {
  try {
    return await fetchFn(url, {
      method: 'POST',
      headers: { 'Content-Type': contentType },
      body: typeof body === 'string' ? body : JSON.stringify(body),
      signal: AbortSignal.timeout(OAUTH_REQUEST_TIMEOUT_MS),
    });
  } catch {
    throw new BranddockApiError(
      'Kan de Branddock-server niet bereiken. Controleer de Base URL en je internetverbinding.',
      0,
    );
  }
}

/**
 * Registreert de extensie eenmalig als public OAuth-client (geen secret;
 * PKCE verplicht). De redirect_uri is de chromiumapp.org-URL van deze
 * installatie — per install dus één registratie.
 */
export async function registerClient(
  baseUrl: string,
  redirectUri: string,
  fetchFn: FetchLike = fetch,
): Promise<string> {
  const response = await postJson(
    oauthEndpoints(baseUrl).register,
    {
      client_name: 'Branddock Everywhere (browser-extensie)',
      redirect_uris: [redirectUri],
      token_endpoint_auth_method: 'none',
      grant_types: ['authorization_code', 'refresh_token'],
      response_types: ['code'],
      scope: OAUTH_SCOPE,
    },
    fetchFn,
  );
  if (response.status !== 200 && response.status !== 201) {
    throw new BranddockApiError(
      `Registreren van de extensie bij Branddock is mislukt (HTTP ${response.status}). Controleer de Base URL.`,
      response.status,
    );
  }
  const body = (await response.json()) as { client_id?: string };
  if (!body.client_id) {
    throw new BranddockApiError('Registratie gaf geen client_id terug.', response.status);
  }
  return body.client_id;
}

// ─── Authorize + callback ────────────────────────────────────

export interface AuthorizeParams {
  clientId: string;
  redirectUri: string;
  state: string;
  challenge: string;
}

/** Bouwt de authorize-URL met PKCE S256 en state. */
export function buildAuthorizeUrl(baseUrl: string, params: AuthorizeParams): string {
  const url = new URL(oauthEndpoints(baseUrl).authorize);
  url.searchParams.set('client_id', params.clientId);
  url.searchParams.set('redirect_uri', params.redirectUri);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('scope', OAUTH_SCOPE);
  url.searchParams.set('state', params.state);
  url.searchParams.set('code_challenge', params.challenge);
  url.searchParams.set('code_challenge_method', 'S256');
  return url.toString();
}

/**
 * Haalt de authorization-code uit de callback-redirect en valideert de
 * state (CSRF). Gooit een nette NL-fout bij error-params of state-mismatch.
 */
export function parseCallbackUrl(callbackUrl: string, expectedState: string): string {
  const url = new URL(callbackUrl);
  const error = url.searchParams.get('error');
  if (error) {
    const description = url.searchParams.get('error_description');
    throw new BranddockApiError(
      `Inloggen geweigerd door Branddock: ${description ?? error}`,
      0,
    );
  }
  const code = url.searchParams.get('code');
  if (!code) throw new BranddockApiError('Geen authorization-code ontvangen van Branddock.', 0);
  if (url.searchParams.get('state') !== expectedState) {
    throw new BranddockApiError('State-controle mislukt — login afgebroken uit voorzorg.', 0);
  }
  return code;
}

// ─── Token-exchange + refresh ────────────────────────────────

/** Uitgegeven tokens + berekende absolute expiry (epoch ms). */
export interface TokenSet {
  accessToken: string;
  refreshToken?: string;
  expiresAt: number;
}

interface TokenResponse {
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
  error?: string;
  error_description?: string;
}

/** Absolute expiry op basis van expires_in (fallback 1 uur). */
export function computeExpiresAt(expiresInSeconds: number | undefined, nowMs = Date.now()): number {
  return nowMs + (expiresInSeconds ?? DEFAULT_EXPIRES_IN_S) * 1000;
}

async function requestTokens(
  baseUrl: string,
  form: Record<string, string>,
  fetchFn: FetchLike,
  invalidGrantMessage: string,
): Promise<TokenSet> {
  const response = await postJson(
    oauthEndpoints(baseUrl).token,
    new URLSearchParams(form).toString(),
    fetchFn,
    'application/x-www-form-urlencoded',
  );
  let body: TokenResponse = {};
  try {
    body = (await response.json()) as TokenResponse;
  } catch {
    // non-JSON body — status-afhandeling hieronder is leidend
  }
  if (response.status === 400 || response.status === 401) {
    // invalid_grant/invalid_client — het token of de code is niet (meer) geldig.
    throw new BranddockApiError(invalidGrantMessage, 401);
  }
  if (!response.ok) {
    throw new BranddockApiError(
      body.error_description ?? `Token-aanvraag mislukt (HTTP ${response.status}).`,
      response.status,
    );
  }
  if (!body.access_token) {
    throw new BranddockApiError('Token-respons bevatte geen access_token.', response.status);
  }
  return {
    accessToken: body.access_token,
    ...(body.refresh_token ? { refreshToken: body.refresh_token } : {}),
    expiresAt: computeExpiresAt(body.expires_in),
  };
}

export interface ExchangeParams {
  code: string;
  redirectUri: string;
  clientId: string;
  verifier: string;
}

/** Wisselt de authorization-code met PKCE-verifier in voor tokens. */
export async function exchangeCode(
  baseUrl: string,
  params: ExchangeParams,
  fetchFn: FetchLike = fetch,
): Promise<TokenSet> {
  return requestTokens(
    baseUrl,
    {
      grant_type: 'authorization_code',
      code: params.code,
      redirect_uri: params.redirectUri,
      client_id: params.clientId,
      code_verifier: params.verifier,
    },
    fetchFn,
    'Inloggen mislukt — de login-code was niet (meer) geldig. Probeer het opnieuw.',
  );
}

// ─── Opslag-formaat + refresh-beslissing ─────────────────────

/** Wat de extensie in chrome.storage.local bewaart (tokens syncen bewust niet). */
export interface StoredOAuth extends TokenSet {
  /** Genormaliseerde Base URL waartegen is ingelogd — mismatch ⇒ her-login. */
  issuer: string;
  clientId: string;
}

/** True zodra het access-token (bijna) verlopen is. */
export function tokenNeedsRefresh(auth: Pick<StoredOAuth, 'expiresAt'>, nowMs = Date.now()): boolean {
  return nowMs >= auth.expiresAt - EXPIRY_MARGIN_MS;
}

/**
 * Gedeelde refresh-logica: geeft de huidige tokens terug zolang ze vers
 * zijn, en draait anders een refresh_token-grant. Bij een geweigerde
 * refresh (400/401) valt er niets meer te herstellen → 401-fout met
 * her-login-melding; de caller hoort de opgeslagen tokens dan te wissen.
 * Refresh-token-rotatie: een nieuw refresh-token vervangt het oude, blijft
 * het veld leeg dan houden we het bestaande.
 */
export async function ensureFreshTokens(
  auth: StoredOAuth,
  fetchFn: FetchLike = fetch,
  nowMs = Date.now(),
): Promise<{ auth: StoredOAuth; refreshed: boolean }> {
  if (!tokenNeedsRefresh(auth, nowMs)) return { auth, refreshed: false };
  if (!auth.refreshToken) throw new BranddockApiError(SESSION_EXPIRED_MESSAGE, 401);

  const tokens = await requestTokens(
    auth.issuer,
    {
      grant_type: 'refresh_token',
      refresh_token: auth.refreshToken,
      client_id: auth.clientId,
    },
    fetchFn,
    SESSION_EXPIRED_MESSAGE,
  );
  return {
    auth: {
      issuer: auth.issuer,
      clientId: auth.clientId,
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken ?? auth.refreshToken,
      expiresAt: tokens.expiresAt,
    },
    refreshed: true,
  };
}
