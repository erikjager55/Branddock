// =============================================================
// Client-facade (chrome-gebonden): popup en background roepen hierdoorheen
// en hoeven niet te weten welk auth-pad actief is.
//
//   OAuth-modus → MCP-tools (rewrite_on_brand / score_against_brand) met
//                 Bearer uit ensureAccessToken() + de gekozen brand-param.
//   Key-modus   → de bestaande REST-wrapper (api.ts) — bewust ongewijzigd
//                 gelaten (minste risico; API-keys zijn merk-vergrendeld,
//                 dus een brand-param heeft daar toch geen zin).
// =============================================================

import { rewrite, score, buildInstruction, BranddockApiError, type ScoreResponse } from './api';
import { rewriteOnBrandTool, scoreAgainstBrandTool } from './mcp';
import { getSettings, isConfigured, type ExtensionSettings } from './settings';
import { getAuthMode, ensureAccessToken, handleAuthFailure, isLoggedIn, type AuthMode } from './auth';
import { getSelectedBrand } from './brands';

export interface ClientState {
  mode: AuthMode;
  /** True zodra er daadwerkelijk aangeroepen kan worden. */
  ready: boolean;
  /** Host van de Base URL, voor statusregels ("Ingelogd bij …"). */
  host: string;
}

function hostOf(baseUrl: string): string {
  try {
    return new URL(baseUrl).host;
  } catch {
    return baseUrl.trim();
  }
}

/** Huidige modus + of die klaar is voor gebruik (geen netwerk-calls). */
export async function getClientState(): Promise<ClientState> {
  const settings = await getSettings();
  const mode = await getAuthMode(settings);
  const host = hostOf(settings.baseUrl);
  const ready = mode === 'key' ? isConfigured(settings) : await isLoggedIn(settings.baseUrl);
  return { mode, ready, host };
}

/** NL-uitleg bij een niet-ready state, per modus. */
export function notReadyMessage(state: ClientState): string {
  return state.mode === 'oauth'
    ? 'Branddock is nog niet gekoppeld. Log in met Branddock via de extensie-instellingen.'
    : 'Branddock is nog niet geconfigureerd. Vul de API-key in bij de extensie-instellingen.';
}

/** Voert fn uit; na een 401 op het OAuth-pad worden de tokens gewist. */
async function withAuthCleanup<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    if (error instanceof BranddockApiError && error.status === 401) await handleAuthFailure();
    throw error;
  }
}

async function oauthContext(settings: ExtensionSettings): Promise<{
  bearer: string;
  brand: string | undefined;
}> {
  const bearer = await ensureAccessToken(settings.baseUrl);
  const brand = (await getSelectedBrand())?.workspaceId;
  return { bearer, brand };
}

export interface ClientRewriteRequest {
  content: string;
  intent: 'rewrite' | 'reply';
  /** Ad-hoc extra instructie (popup); de doelgroep-notitie gaat altijd mee. */
  extraInstruction?: string;
}

/** Herschrijft/beantwoordt via het actieve auth-pad. Kost 1 credit. */
export async function performRewrite(
  request: ClientRewriteRequest,
): Promise<{ text: string; model: string }> {
  const settings = await getSettings();
  const mode = await getAuthMode(settings);
  const instruction = buildInstruction(settings.audienceNote, request.extraInstruction ?? '');

  if (mode === 'key') {
    const result = await rewrite(
      { baseUrl: settings.baseUrl, apiKey: settings.apiKey },
      { content: request.content, intent: request.intent, instruction },
    );
    return { text: result.text, model: result.model };
  }

  const { bearer, brand } = await oauthContext(settings);
  return withAuthCleanup(() =>
    rewriteOnBrandTool(
      { baseUrl: settings.baseUrl, bearer },
      { content: request.content, intent: request.intent, instruction, brand },
    ),
  );
}

/** Score-uitkomst in het vorm die de popup toont (REST- en MCP-pad gelijk). */
export type ClientScoreResult = Pick<ScoreResponse, 'findingsCount' | 'result'>;

/** F-VAL-score via het actieve auth-pad. Gratis. */
export async function performScore(content: string): Promise<ClientScoreResult> {
  const settings = await getSettings();
  const mode = await getAuthMode(settings);

  if (mode === 'key') {
    const response = await score({ baseUrl: settings.baseUrl, apiKey: settings.apiKey }, content);
    return { findingsCount: response.findingsCount, result: response.result };
  }

  const { bearer, brand } = await oauthContext(settings);
  const response = await withAuthCleanup(() =>
    scoreAgainstBrandTool({ baseUrl: settings.baseUrl, bearer }, content, brand),
  );
  return { findingsCount: response.findingsCount, result: response.result };
}
