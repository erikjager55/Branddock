// =============================================================
// MCP-client-laagje (chrome-vrij): minimale JSON-RPC 2.0-helper voor de
// stateless Branddock MCP-endpoint `POST /api/mcp`.
//
// De server bouwt per POST een verse McpServer (stateless serverless-
// patroon, enableJsonResponse) — er is dus geen sessie: elke aanroep is
// een losse POST en tools/call werkt zonder voorafgaande initialize.
// `initializeMcp` bestaat als lichte handshake/gezondheidscheck (gebruikt
// door "Test verbinding" in OAuth-modus).
//
// De Bearer mag een OAuth-access-token óf een bd_live-API-key zijn — de
// route accepteert beide op hetzelfde endpoint. Tool-results zijn
// text-content met een JSON-string; die wordt hier geparsed en getypeerd.
// Fouten worden BranddockApiError met NL-melding (401 → her-login).
// =============================================================

import { normalizeBaseUrl, BranddockApiError, type FetchLike } from './api';
import { SESSION_EXPIRED_MESSAGE } from './oauth';

// Re-export voor de test-bundle: instanceof-checks moeten tegen de klasse
// uit déze bundle lopen (elke .test-build-bundle is zelfstandig).
export { BranddockApiError, SESSION_EXPIRED_MESSAGE };

export interface McpConfig {
  /** Bijv. https://branddock.app — zonder trailing slash (wordt genormaliseerd). */
  baseUrl: string;
  /** OAuth-access-token of bd_live-API-key. */
  bearer: string;
}

/** Zelfde budget als de zwaarste tool die de extensie aanroept (rewrite). */
const REQUEST_TIMEOUT_MS = 120_000;

const CLIENT_INFO = { name: 'branddock-everywhere-extension', version: '0.2.0' };
/** MCP-protocolversie; de server onderhandelt zonodig terug naar wat hij kent. */
const PROTOCOL_VERSION = '2025-06-18';

interface JsonRpcResponse {
  jsonrpc?: string;
  id?: number | string | null;
  result?: unknown;
  error?: { code?: number; message?: string };
}

interface TextContentBlock {
  type?: string;
  text?: string;
}

interface CallToolResultShape {
  isError?: boolean;
  content?: TextContentBlock[];
}

/**
 * Haalt het JSON-RPC-object uit een text/event-stream-body (fallback voor
 * als de server ooit zonder enableJsonResponse draait): pakt de laatste
 * niet-lege `data:`-regel.
 */
export function parseSseJson(body: string): JsonRpcResponse {
  const dataLines = body
    .split('\n')
    .filter((line) => line.startsWith('data:'))
    .map((line) => line.slice(5).trim())
    .filter((line) => line.length > 0);
  const last = dataLines[dataLines.length - 1];
  if (!last) throw new BranddockApiError('Leeg antwoord van de Branddock MCP-server.', 0);
  return JSON.parse(last) as JsonRpcResponse;
}

function friendlyHttpMessage(status: number): string {
  switch (status) {
    case 401:
      return SESSION_EXPIRED_MESSAGE;
    case 404:
      return 'MCP-endpoint niet gevonden op deze Base URL. Controleer de URL in de instellingen.';
    case 429:
      return 'Te veel verzoeken — probeer het zo weer.';
    default:
      return `Onverwachte fout van de Branddock MCP-server (HTTP ${status}).`;
  }
}

/** Eén JSON-RPC-request naar POST /api/mcp; geeft het `result`-veld terug. */
async function rpc(
  config: McpConfig,
  method: string,
  params: unknown,
  fetchFn: FetchLike,
): Promise<unknown> {
  const url = `${normalizeBaseUrl(config.baseUrl)}/api/mcp`;
  let response: Response;
  try {
    response = await fetchFn(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // De streamable-HTTP-transport eist dat de client beide accepteert.
        Accept: 'application/json, text/event-stream',
        Authorization: `Bearer ${config.bearer}`,
      },
      body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
  } catch {
    throw new BranddockApiError(
      'Kan de Branddock-API niet bereiken. Controleer de Base URL en je internetverbinding.',
      0,
    );
  }

  if (!response.ok) {
    throw new BranddockApiError(friendlyHttpMessage(response.status), response.status);
  }

  const contentType = response.headers.get('content-type') ?? '';
  let payload: JsonRpcResponse;
  try {
    payload = contentType.includes('text/event-stream')
      ? parseSseJson(await response.text())
      : ((await response.json()) as JsonRpcResponse);
  } catch (error) {
    if (error instanceof BranddockApiError) throw error;
    throw new BranddockApiError('Onleesbaar antwoord van de Branddock MCP-server.', response.status);
  }

  if (payload.error) {
    throw new BranddockApiError(
      `MCP-fout: ${payload.error.message ?? 'onbekende fout'}`,
      response.status,
    );
  }
  return payload.result;
}

export interface McpServerInfo {
  name?: string;
  version?: string;
}

/**
 * MCP-handshake — valideert Bearer + endpoint zonder een tool te draaien.
 * Stateless server: dit is puur een gezondheidscheck, geen vereiste stap
 * vóór tools/call.
 */
export async function initializeMcp(
  config: McpConfig,
  fetchFn: FetchLike = fetch,
): Promise<McpServerInfo> {
  const result = (await rpc(
    config,
    'initialize',
    { protocolVersion: PROTOCOL_VERSION, capabilities: {}, clientInfo: CLIENT_INFO },
    fetchFn,
  )) as { serverInfo?: McpServerInfo } | undefined;
  return result?.serverInfo ?? {};
}

/** Domein-fouten die de server als tool-error-text terugstuurt → NL-melding. */
function friendlyToolError(text: string): string {
  if (text.includes('INSUFFICIENT_CREDITS')) return 'Onvoldoende credits in deze workspace.';
  return text;
}

/**
 * Roept één tool aan en parseert het text-content-JSON-result naar T.
 * Tool-errors (isError) worden BranddockApiError met de server-tekst.
 */
export async function callTool<T>(
  config: McpConfig,
  name: string,
  args: Record<string, unknown>,
  fetchFn: FetchLike = fetch,
): Promise<T> {
  const result = (await rpc(
    config,
    'tools/call',
    { name, arguments: args },
    fetchFn,
  )) as CallToolResultShape | undefined;

  const text = result?.content?.find((block) => block.type === 'text')?.text ?? '';
  if (result?.isError) {
    throw new BranddockApiError(
      friendlyToolError(text || `Tool ${name} gaf een fout terug.`),
      400,
    );
  }
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new BranddockApiError(`Tool ${name} gaf geen leesbaar JSON-resultaat terug.`, 0);
  }
}

// ─── Getypeerde tool-wrappers ────────────────────────────────

/** Eén merk zoals list_brands het teruggeeft (BrandListing op de server). */
export interface BrandInfo {
  workspaceId: string;
  name: string;
  organizationName: string;
  /** OAuth-pad: rol in de organisatie; key-pad: null (machine-toegang). */
  role: string | null;
  /** Het merk waar aanroepen zonder brand-param op landen. */
  isDefault: boolean;
}

/** list_brands — alle merken die deze login mag gebruiken. Gratis. */
export async function listBrands(config: McpConfig, fetchFn: FetchLike = fetch): Promise<BrandInfo[]> {
  const result = await callTool<{ count: number; brands: BrandInfo[] }>(
    config,
    'list_brands',
    {},
    fetchFn,
  );
  return result.brands;
}

export interface McpRewriteRequest {
  content: string;
  intent?: 'rewrite' | 'reply';
  instruction?: string;
  personaIds?: string[];
  /** Workspace-id of merknaam; weggelaten = server volgt de actieve organisatie. */
  brand?: string;
}

export interface McpRewriteResult {
  text: string;
  model: string;
}

/** rewrite_on_brand — ephemeral herschrijven/beantwoorden. Kost 1 credit. */
export async function rewriteOnBrandTool(
  config: McpConfig,
  request: McpRewriteRequest,
  fetchFn: FetchLike = fetch,
): Promise<McpRewriteResult> {
  const args: Record<string, unknown> = { content: request.content };
  if (request.intent) args.intent = request.intent;
  if (request.instruction) args.instruction = request.instruction;
  if (request.personaIds?.length) args.personaIds = request.personaIds;
  if (request.brand) args.brand = request.brand;
  return callTool<McpRewriteResult>(config, 'rewrite_on_brand', args, fetchFn);
}

/** Zelfde composietresultaat-subset als de REST-score-route toont. */
export interface McpScoreResult {
  compositeScore: number;
  thresholdMet: boolean;
  findingsCount: number;
  result: {
    compositeScore: number;
    thresholdMet: boolean;
    compositeThreshold: number;
    detectorVerdict?: string;
    wordCount?: number;
  };
}

/** score_against_brand — F-VAL-score op aangeleverde tekst. Gratis. */
export async function scoreAgainstBrandTool(
  config: McpConfig,
  content: string,
  brand: string | undefined,
  fetchFn: FetchLike = fetch,
): Promise<McpScoreResult> {
  const args: Record<string, unknown> = { content };
  if (brand) args.brand = brand;
  return callTool<McpScoreResult>(config, 'score_against_brand', args, fetchFn);
}
