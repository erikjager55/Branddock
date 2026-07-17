// =============================================================
// Branddock Everywhere — kern-API-wrapper rond de publieke Brand-API.
//
// Bewust chrome-vrij en DOM-vrij zodat deze module 1-op-1 in `node --test`
// draait met een gemockte fetch. Alle netwerk-I/O van de extensie loopt
// hierdoorheen:
//   POST /api/v1/rewrite       → on-brand herschrijven / antwoord (1 credit)
//   POST /api/v1/score         → F-VAL-score (gratis)
//   GET  /api/v1/brand-context → key-validatie voor "Test verbinding"
// =============================================================

export interface BranddockConfig {
  /** Bijv. https://branddock.app — zonder trailing slash (wordt genormaliseerd). */
  baseUrl: string;
  /** Workspace-API-key, formaat bd_live_… */
  apiKey: string;
}

export interface RewriteRequest {
  content: string;
  intent?: 'rewrite' | 'reply';
  instruction?: string;
  personaIds?: string[];
  productIds?: string[];
}

export interface RewriteResponse {
  workspaceId: string;
  text: string;
  model: string;
}

/** Subset van FidelityCompositeResult die de extensie toont. */
export interface ScoreResult {
  compositeScore: number;
  thresholdMet: boolean;
  compositeThreshold: number;
  detectorVerdict?: string;
  wordCount?: number;
}

export interface ScoreResponse {
  workspaceId: string;
  reviewLogId: string;
  findingsCount: number;
  result: ScoreResult;
}

export type ConnectionTestResult =
  | { ok: true; workspaceId: string }
  | { ok: false; status: number; message: string };

/** Injectiepunt voor tests — default is de globale fetch. */
export type FetchLike = (input: string, init?: RequestInit) => Promise<Response>;

export class BranddockApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code?: string,
  ) {
    super(message);
    this.name = 'BranddockApiError';
  }
}

/** De rewrite/score-routes hebben maxDuration 120s — matcht de server-limiet. */
const REQUEST_TIMEOUT_MS = 120_000;

/** Server-side Zod-limieten (gespiegeld voor vroege client-side feedback). */
export const MIN_REWRITE_CHARS = 20;
export const MIN_SCORE_CHARS = 50;
export const MAX_INSTRUCTION_CHARS = 500;

/** Trimt en verwijdert trailing slashes zodat pad-concatenatie klopt. */
export function normalizeBaseUrl(baseUrl: string): string {
  return baseUrl.trim().replace(/\/+$/, '');
}

/**
 * Combineert de vaste doelgroep-notitie en een ad-hoc extra instructie tot
 * één `instruction`-veld (server-limiet 500 tekens). Bewuste v1-keuze:
 * zolang er geen REST-discovery-endpoint voor personas is, gaat doelgroep-
 * sturing als vrije tekst mee in plaats van via personaIds.
 */
export function buildInstruction(audienceNote: string, extra: string): string | undefined {
  const parts: string[] = [];
  if (audienceNote.trim()) parts.push(`Doelgroep: ${audienceNote.trim()}`);
  if (extra.trim()) parts.push(extra.trim());
  const joined = parts.join('\n');
  return joined ? joined.slice(0, MAX_INSTRUCTION_CHARS) : undefined;
}

function friendlyHttpMessage(status: number, serverError?: string): string {
  switch (status) {
    case 401:
      return 'API-key ongeldig of ingetrokken. Controleer de key in de instellingen.';
    case 402:
      return 'Onvoldoende credits in deze workspace.';
    case 404:
      return 'API niet gevonden op deze Base URL. Controleer de URL in de instellingen.';
    case 429:
      return 'Te veel verzoeken — probeer het zo weer.';
    default:
      return serverError ?? `Onverwachte fout van de Branddock-API (HTTP ${status}).`;
  }
}

async function request<T>(
  config: BranddockConfig,
  path: string,
  init: RequestInit,
  fetchFn: FetchLike,
): Promise<T> {
  const url = `${normalizeBaseUrl(config.baseUrl)}${path}`;
  let response: Response;
  try {
    response = await fetchFn(url, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${config.apiKey.trim()}`,
      },
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
  } catch {
    throw new BranddockApiError(
      'Kan de Branddock-API niet bereiken. Controleer de Base URL en je internetverbinding.',
      0,
    );
  }

  if (!response.ok) {
    let serverError: string | undefined;
    let code: string | undefined;
    try {
      const body = (await response.json()) as { error?: string; code?: string };
      serverError = body.error;
      code = body.code;
    } catch {
      // non-JSON error body — val terug op status-mapping
    }
    throw new BranddockApiError(friendlyHttpMessage(response.status, serverError), response.status, code);
  }
  return (await response.json()) as T;
}

/** POST /api/v1/rewrite — intent 'rewrite' (herschrijf) of 'reply' (antwoord). Kost 1 credit. */
export async function rewrite(
  config: BranddockConfig,
  body: RewriteRequest,
  fetchFn: FetchLike = fetch,
): Promise<RewriteResponse> {
  return request<RewriteResponse>(
    config,
    '/api/v1/rewrite',
    { method: 'POST', body: JSON.stringify(body) },
    fetchFn,
  );
}

/** POST /api/v1/score — F-VAL-score op aangeleverde tekst (gratis, min. 50 tekens). */
export async function score(
  config: BranddockConfig,
  content: string,
  fetchFn: FetchLike = fetch,
): Promise<ScoreResponse> {
  return request<ScoreResponse>(
    config,
    '/api/v1/score',
    { method: 'POST', body: JSON.stringify({ content }) },
    fetchFn,
  );
}

/**
 * Valideert Base URL + key via GET /api/v1/brand-context (goedkoop en
 * side-effect-vrij): 200 = geldig, 401 = key fout, 404 = URL fout of
 * publieke API uitgeschakeld.
 */
export async function testConnection(
  config: BranddockConfig,
  fetchFn: FetchLike = fetch,
): Promise<ConnectionTestResult> {
  try {
    const result = await request<{ workspaceId: string }>(
      config,
      '/api/v1/brand-context',
      { method: 'GET' },
      fetchFn,
    );
    return { ok: true, workspaceId: result.workspaceId };
  } catch (error) {
    if (error instanceof BranddockApiError) {
      return { ok: false, status: error.status, message: error.message };
    }
    return { ok: false, status: 0, message: 'Onbekende fout bij het testen van de verbinding.' };
  }
}
