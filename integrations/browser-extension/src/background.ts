// =============================================================
// Service-worker (MV3): context-menu op tekstselectie → /api/v1/rewrite →
// resultaat naar het injectie-overlay in het content-script.
//
// Flow per klik: content-script injecteren (idempotent) → selectie + editable-
// status capturen → loading-overlay → API-call → resultaat- of fout-overlay.
// De in-flight fetch houdt de service-worker wakker; de server-limiet is 120s.
// =============================================================

import { rewrite, buildInstruction, BranddockApiError, MIN_REWRITE_CHARS } from './api';
import { getSettings, isConfigured } from './settings';
import type { ContentMessage, CaptureResponse } from './messages';

const MENU_REWRITE = 'branddock-rewrite';
const MENU_REPLY = 'branddock-reply';

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: MENU_REWRITE,
    title: 'Branddock: herschrijf on-brand',
    contexts: ['selection'],
  });
  chrome.contextMenus.create({
    id: MENU_REPLY,
    title: 'Branddock: schrijf on-brand antwoord',
    contexts: ['selection'],
  });
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (!tab?.id) return;
  const intent =
    info.menuItemId === MENU_REWRITE ? 'rewrite' : info.menuItemId === MENU_REPLY ? 'reply' : null;
  if (!intent) return;
  void handleSelection(tab.id, intent, info.selectionText ?? '').catch((error) => {
    // Bijv. beschermde pagina's (chrome://, Web Store) waar injectie niet mag.
    console.warn('[Branddock] context-menu-actie mislukt:', error);
  });
});

async function sendToTab(tabId: number, message: ContentMessage): Promise<unknown> {
  return chrome.tabs.sendMessage(tabId, message);
}

/** Injecteert content.js als het er nog niet zit (ping faalt → injecteren). */
async function ensureContentScript(tabId: number): Promise<void> {
  try {
    await sendToTab(tabId, { type: 'branddock:ping' });
  } catch {
    await chrome.scripting.executeScript({ target: { tabId }, files: ['content.js'] });
  }
}

async function handleSelection(
  tabId: number,
  intent: 'rewrite' | 'reply',
  fallbackText: string,
): Promise<void> {
  await ensureContentScript(tabId);

  // Selectie via het content-script (kent editable-status en onthoudt de
  // plek voor "Vervang selectie"); info.selectionText is de fallback voor
  // situaties waar de capture niets oplevert (bijv. selectie in een iframe).
  let capture: CaptureResponse = { text: '', editable: false };
  try {
    capture = (await sendToTab(tabId, { type: 'branddock:capture' })) as CaptureResponse;
  } catch {
    // capture faalde — ga verder met de fallback-tekst, alleen kopiëren mogelijk
  }
  const text = (capture.text || fallbackText).trim();
  const canReplace = capture.editable && capture.text.trim().length > 0;

  if (text.length < MIN_REWRITE_CHARS) {
    await sendToTab(tabId, {
      type: 'branddock:error',
      message: `Selecteer minimaal ${MIN_REWRITE_CHARS} tekens om te herschrijven.`,
    });
    return;
  }

  const settings = await getSettings();
  if (!isConfigured(settings)) {
    await sendToTab(tabId, {
      type: 'branddock:error',
      message: 'Branddock is nog niet geconfigureerd. Vul Base URL en API-key in bij de extensie-opties.',
    });
    chrome.runtime.openOptionsPage();
    return;
  }

  await sendToTab(tabId, {
    type: 'branddock:loading',
    label: intent === 'reply' ? 'On-brand antwoord schrijven…' : 'On-brand herschrijven…',
  });

  try {
    const result = await rewrite(
      { baseUrl: settings.baseUrl, apiKey: settings.apiKey },
      { content: text, intent, instruction: buildInstruction(settings.audienceNote, '') },
    );
    await sendToTab(tabId, {
      type: 'branddock:result',
      title: intent === 'reply' ? 'Voorgesteld antwoord' : 'Herschreven tekst',
      text: result.text,
      model: result.model,
      // Antwoorden vervangen de selectie (het originele bericht) bewust niet.
      canReplace: canReplace && intent === 'rewrite',
    });
  } catch (error) {
    const message =
      error instanceof BranddockApiError
        ? error.message
        : 'Er ging iets mis bij het aanroepen van de Branddock-API.';
    await sendToTab(tabId, { type: 'branddock:error', message });
  }
}
