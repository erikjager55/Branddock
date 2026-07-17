// =============================================================
// Options-pagina: Base URL + API-key (chrome.storage.sync) en een
// "Test verbinding"-knop die GET /api/v1/brand-context gebruikt om de
// key te valideren (200 = geldig, 401 = key fout, 404 = URL fout/API dicht).
// =============================================================

import { testConnection } from './api';
import { getSettings, saveSettings, DEFAULT_SETTINGS } from './settings';

function byId<T extends HTMLElement>(id: string): T {
  const node = document.getElementById(id);
  if (!node) throw new Error(`Options-element ontbreekt: ${id}`);
  return node as T;
}

const baseUrlInput = byId<HTMLInputElement>('base-url');
const apiKeyInput = byId<HTMLInputElement>('api-key');
const showKeyToggle = byId<HTMLInputElement>('show-key');
const saveBtn = byId<HTMLButtonElement>('btn-save');
const testBtn = byId<HTMLButtonElement>('btn-test');
const statusEl = byId<HTMLParagraphElement>('status');

void init();

async function init(): Promise<void> {
  const settings = await getSettings();
  baseUrlInput.value = settings.baseUrl;
  apiKeyInput.value = settings.apiKey;

  showKeyToggle.addEventListener('change', () => {
    apiKeyInput.type = showKeyToggle.checked ? 'text' : 'password';
  });
  saveBtn.addEventListener('click', () => void save());
  testBtn.addEventListener('click', () => void test());
}

function currentValues(): { baseUrl: string; apiKey: string } {
  return {
    baseUrl: baseUrlInput.value.trim() || DEFAULT_SETTINGS.baseUrl,
    apiKey: apiKeyInput.value.trim(),
  };
}

function showStatus(message: string, kind: 'ok' | 'error' | 'busy'): void {
  statusEl.hidden = false;
  statusEl.textContent = message;
  statusEl.className = `status ${kind}`;
}

async function save(): Promise<void> {
  const { baseUrl, apiKey } = currentValues();
  await saveSettings({ baseUrl, apiKey });
  if (apiKey && !apiKey.startsWith('bd_live_')) {
    showStatus('Opgeslagen — let op: de key heeft niet het verwachte bd_live_-formaat.', 'error');
  } else {
    showStatus('Instellingen opgeslagen.', 'ok');
  }
}

async function test(): Promise<void> {
  const { baseUrl, apiKey } = currentValues();
  if (!apiKey) {
    showStatus('Vul eerst een API-key in.', 'error');
    return;
  }
  testBtn.disabled = true;
  showStatus('Verbinding testen…', 'busy');
  try {
    const result = await testConnection({ baseUrl, apiKey });
    if (result.ok) {
      showStatus(`Verbinding geslaagd — gekoppeld aan workspace ${result.workspaceId}.`, 'ok');
    } else {
      showStatus(result.message, 'error');
    }
  } finally {
    testBtn.disabled = false;
  }
}
