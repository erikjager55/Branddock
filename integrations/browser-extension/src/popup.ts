// =============================================================
// Popup: status, merk-dropdown (OAuth-modus), vrije-tekst herschrijven/
// beantwoorden/scoren, doelgroep-notitie. Alle aanroepen lopen via de
// client-facade (client.ts) die zelf OAuth (MCP) of API-key (REST) kiest.
//
// De merk-dropdown toont de merken uit list_brands (10-min-cache) met
// bovenaan "Volg Branddock" (= geen brand-param; de server volgt de
// actieve organisatie). In key-modus is de dropdown verborgen: API-keys
// zijn merk-vergrendeld.
// =============================================================

import { BranddockApiError, MIN_REWRITE_CHARS, MIN_SCORE_CHARS } from './api';
import { getSettings, saveSettings, type ExtensionSettings } from './settings';
import {
  getClientState,
  notReadyMessage,
  performRewrite,
  performScore,
  type ClientState,
} from './client';
import { getBrands, getSelectedBrand, setSelectedBrand } from './brands';
import type { BrandInfo } from './mcp';

function byId<T extends HTMLElement>(id: string): T {
  const node = document.getElementById(id);
  if (!node) throw new Error(`Popup-element ontbreekt: ${id}`);
  return node as T;
}

const statusEl = byId<HTMLParagraphElement>('status');
const brandRow = byId<HTMLDivElement>('brand-row');
const brandSelect = byId<HTMLSelectElement>('brand-select');
const brandNote = byId<HTMLParagraphElement>('brand-note');
const audienceInput = byId<HTMLInputElement>('audience-note');
const contentInput = byId<HTMLTextAreaElement>('content');
const instructionInput = byId<HTMLInputElement>('instruction');
const rewriteBtn = byId<HTMLButtonElement>('btn-rewrite');
const replyBtn = byId<HTMLButtonElement>('btn-reply');
const scoreBtn = byId<HTMLButtonElement>('btn-score');
const feedbackEl = byId<HTMLParagraphElement>('feedback');
const resultSection = byId<HTMLElement>('result-section');
const resultTitle = byId<HTMLHeadingElement>('result-title');
const resultText = byId<HTMLPreElement>('result-text');
const copyBtn = byId<HTMLButtonElement>('btn-copy');

let settings: ExtensionSettings;
let clientState: ClientState;

void init();

async function init(): Promise<void> {
  settings = await getSettings();
  clientState = await getClientState();
  audienceInput.value = settings.audienceNote;
  renderStatus();
  void initBrandPicker();

  byId<HTMLButtonElement>('open-options').addEventListener('click', () => {
    void chrome.runtime.openOptionsPage();
  });
  audienceInput.addEventListener('change', () => {
    settings.audienceNote = audienceInput.value.trim();
    void saveSettings({ audienceNote: settings.audienceNote });
  });
  brandSelect.addEventListener('change', () => void onBrandChange());
  rewriteBtn.addEventListener('click', () => void runRewrite('rewrite'));
  replyBtn.addEventListener('click', () => void runRewrite('reply'));
  scoreBtn.addEventListener('click', () => void runScore());
  copyBtn.addEventListener('click', () => void copyResult());
}

function renderStatus(): void {
  if (clientState.ready) {
    statusEl.textContent =
      clientState.mode === 'oauth'
        ? `Ingelogd bij ${clientState.host}`
        : `Geconfigureerd voor ${clientState.host} (API-key)`;
    statusEl.className = 'status ok';
  } else {
    statusEl.textContent =
      clientState.mode === 'oauth'
        ? 'Niet ingelogd — open Instellingen en log in met Branddock.'
        : 'Nog niet geconfigureerd — open Instellingen en plak je API-key.';
    statusEl.className = 'status warn';
  }
}

// ─── Merk-dropdown ───────────────────────────────────────────

const FOLLOW_VALUE = '';

function renderBrandOptions(brands: BrandInfo[], selectedId: string | undefined): void {
  brandSelect.replaceChildren();
  const follow = document.createElement('option');
  follow.value = FOLLOW_VALUE;
  follow.textContent = 'Volg Branddock (actieve organisatie)';
  brandSelect.append(follow);
  for (const brand of brands) {
    const option = document.createElement('option');
    option.value = brand.workspaceId;
    option.textContent = `${brand.name} — ${brand.organizationName}`;
    brandSelect.append(option);
  }
  const validSelection = brands.some((brand) => brand.workspaceId === selectedId);
  brandSelect.value = validSelection && selectedId ? selectedId : FOLLOW_VALUE;
  if (!validSelection && selectedId) void setSelectedBrand(null);
}

async function initBrandPicker(): Promise<void> {
  if (clientState.mode === 'key') {
    // API-keys zijn merk-vergrendeld — dropdown heeft daar geen betekenis.
    brandNote.hidden = !clientState.ready;
    return;
  }
  if (!clientState.ready) return;
  brandRow.hidden = false;
  try {
    const brands = await getBrands(settings.baseUrl);
    renderBrandOptions(brands, (await getSelectedBrand())?.workspaceId);
  } catch (error) {
    brandSelect.replaceChildren();
    const failed = document.createElement('option');
    failed.value = FOLLOW_VALUE;
    failed.textContent = 'Merken laden mislukt — Volg Branddock';
    brandSelect.append(failed);
    if (error instanceof BranddockApiError && error.status === 401) {
      clientState = await getClientState();
      renderStatus();
    }
  }
}

async function onBrandChange(): Promise<void> {
  const workspaceId = brandSelect.value;
  if (workspaceId === FOLLOW_VALUE) {
    await setSelectedBrand(null);
    return;
  }
  const name = brandSelect.selectedOptions[0]?.textContent ?? workspaceId;
  await setSelectedBrand({ workspaceId, name });
}

// ─── Acties ──────────────────────────────────────────────────

function setBusy(busy: boolean, label?: string): void {
  for (const btn of [rewriteBtn, replyBtn, scoreBtn]) btn.disabled = busy;
  if (busy) {
    showFeedback(label ?? 'Bezig… dit kan tot twee minuten duren. Houd de popup open.', 'busy');
  }
}

function showFeedback(message: string, kind: 'busy' | 'error'): void {
  feedbackEl.hidden = false;
  feedbackEl.textContent = message;
  feedbackEl.className = `feedback ${kind}`;
}

function clearFeedback(): void {
  feedbackEl.hidden = true;
  feedbackEl.textContent = '';
}

function showResult(title: string, text: string, footer?: string): void {
  resultSection.hidden = false;
  resultTitle.textContent = title;
  resultText.textContent = footer ? `${text}\n\n${footer}` : text;
  copyBtn.textContent = 'Kopieer';
  copyBtn.dataset.copyText = text;
}

function requireReady(): boolean {
  if (clientState.ready) return true;
  showFeedback(notReadyMessage(clientState), 'error');
  return false;
}

function errorMessage(error: unknown): string {
  return error instanceof BranddockApiError
    ? error.message
    : 'Er ging iets mis bij het aanroepen van de Branddock-API.';
}

/** Na een 401 is de sessie-status veranderd — statusregel meteen bijwerken. */
async function reflectAuthError(error: unknown): Promise<void> {
  if (error instanceof BranddockApiError && error.status === 401) {
    clientState = await getClientState();
    renderStatus();
  }
}

async function runRewrite(intent: 'rewrite' | 'reply'): Promise<void> {
  clearFeedback();
  if (!requireReady()) return;
  const content = contentInput.value.trim();
  if (content.length < MIN_REWRITE_CHARS) {
    showFeedback(`Voer minimaal ${MIN_REWRITE_CHARS} tekens tekst in.`, 'error');
    return;
  }
  setBusy(true, intent === 'reply' ? 'On-brand antwoord schrijven…' : 'On-brand herschrijven…');
  try {
    const result = await performRewrite({
      content,
      intent,
      extraInstruction: instructionInput.value,
    });
    clearFeedback();
    showResult(
      intent === 'reply' ? 'Voorgesteld antwoord' : 'Herschreven tekst',
      result.text,
      `Model: ${result.model}`,
    );
  } catch (error) {
    showFeedback(errorMessage(error), 'error');
    await reflectAuthError(error);
  } finally {
    setBusy(false);
  }
}

async function runScore(): Promise<void> {
  clearFeedback();
  if (!requireReady()) return;
  const content = contentInput.value.trim();
  if (content.length < MIN_SCORE_CHARS) {
    showFeedback(`Een brand-score vereist minimaal ${MIN_SCORE_CHARS} tekens tekst.`, 'error');
    return;
  }
  setBusy(true, 'Brand-score berekenen…');
  try {
    const response = await performScore(content);
    const { result } = response;
    const lines = [
      `Brand-score: ${Math.round(result.compositeScore)}/100 (drempel ${result.compositeThreshold} — ${
        result.thresholdMet ? 'gehaald' : 'niet gehaald'
      })`,
      `Bevindingen: ${response.findingsCount}`,
    ];
    if (typeof result.wordCount === 'number') lines.push(`Woorden geanalyseerd: ${result.wordCount}`);
    clearFeedback();
    showResult('Brand-score', lines.join('\n'));
  } catch (error) {
    showFeedback(errorMessage(error), 'error');
    await reflectAuthError(error);
  } finally {
    setBusy(false);
  }
}

async function copyResult(): Promise<void> {
  const text = copyBtn.dataset.copyText ?? '';
  try {
    await navigator.clipboard.writeText(text);
    copyBtn.textContent = 'Gekopieerd';
  } catch {
    copyBtn.textContent = 'Kopiëren mislukt';
  }
}
