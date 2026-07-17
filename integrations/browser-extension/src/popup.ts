// =============================================================
// Popup: status, vrije-tekst herschrijven/beantwoorden/scoren, doelgroep-
// notitie. De "extra instructie" is bewust popup-lokaal (niet gepersisteerd);
// de doelgroep-notitie wordt in chrome.storage.sync bewaard en gaat óók mee
// met context-menu-acties.
// =============================================================

import {
  rewrite,
  score,
  buildInstruction,
  BranddockApiError,
  MIN_REWRITE_CHARS,
  MIN_SCORE_CHARS,
} from './api';
import { getSettings, saveSettings, isConfigured, type ExtensionSettings } from './settings';

function byId<T extends HTMLElement>(id: string): T {
  const node = document.getElementById(id);
  if (!node) throw new Error(`Popup-element ontbreekt: ${id}`);
  return node as T;
}

const statusEl = byId<HTMLParagraphElement>('status');
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

void init();

async function init(): Promise<void> {
  settings = await getSettings();
  audienceInput.value = settings.audienceNote;
  renderStatus();

  byId<HTMLButtonElement>('open-options').addEventListener('click', () => {
    void chrome.runtime.openOptionsPage();
  });
  audienceInput.addEventListener('change', () => {
    settings.audienceNote = audienceInput.value.trim();
    void saveSettings({ audienceNote: settings.audienceNote });
  });
  rewriteBtn.addEventListener('click', () => void runRewrite('rewrite'));
  replyBtn.addEventListener('click', () => void runRewrite('reply'));
  scoreBtn.addEventListener('click', () => void runScore());
  copyBtn.addEventListener('click', () => void copyResult());
}

function renderStatus(): void {
  if (isConfigured(settings)) {
    let host = settings.baseUrl.trim();
    try {
      host = new URL(settings.baseUrl).host;
    } catch {
      // toon dan de ruwe waarde
    }
    statusEl.textContent = `Geconfigureerd voor ${host}`;
    statusEl.className = 'status ok';
  } else {
    statusEl.textContent = 'Nog niet geconfigureerd — open Instellingen en vul Base URL + API-key in.';
    statusEl.className = 'status warn';
  }
}

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

function requireConfig(): boolean {
  if (isConfigured(settings)) return true;
  showFeedback('Vul eerst Base URL en API-key in via Instellingen.', 'error');
  return false;
}

function errorMessage(error: unknown): string {
  return error instanceof BranddockApiError
    ? error.message
    : 'Er ging iets mis bij het aanroepen van de Branddock-API.';
}

async function runRewrite(intent: 'rewrite' | 'reply'): Promise<void> {
  clearFeedback();
  if (!requireConfig()) return;
  const content = contentInput.value.trim();
  if (content.length < MIN_REWRITE_CHARS) {
    showFeedback(`Voer minimaal ${MIN_REWRITE_CHARS} tekens tekst in.`, 'error');
    return;
  }
  setBusy(true, intent === 'reply' ? 'On-brand antwoord schrijven…' : 'On-brand herschrijven…');
  try {
    const result = await rewrite(
      { baseUrl: settings.baseUrl, apiKey: settings.apiKey },
      {
        content,
        intent,
        instruction: buildInstruction(settings.audienceNote, instructionInput.value),
      },
    );
    clearFeedback();
    showResult(
      intent === 'reply' ? 'Voorgesteld antwoord' : 'Herschreven tekst',
      result.text,
      `Model: ${result.model}`,
    );
  } catch (error) {
    showFeedback(errorMessage(error), 'error');
  } finally {
    setBusy(false);
  }
}

async function runScore(): Promise<void> {
  clearFeedback();
  if (!requireConfig()) return;
  const content = contentInput.value.trim();
  if (content.length < MIN_SCORE_CHARS) {
    showFeedback(`Een brand-score vereist minimaal ${MIN_SCORE_CHARS} tekens tekst.`, 'error');
    return;
  }
  setBusy(true, 'Brand-score berekenen…');
  try {
    const response = await score({ baseUrl: settings.baseUrl, apiKey: settings.apiKey }, content);
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
