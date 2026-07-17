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
const statusEl = byId<HTMLParagraphElement>('status');

void init();

async function init(): Promise<void> {
  const settings = await getSettings();
  baseUrlInput.value = settings.baseUrl;
  apiKeyInput.value = settings.apiKey;

  showKeyToggle.addEventListener('change', () => {
    apiKeyInput.type = showKeyToggle.checked ? 'text' : 'password';
  });
  saveBtn.addEventListener('click', () => void saveAndTest());
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

// Eén actie: opslaan en direct de verbinding bewijzen — de gebruiker hoeft
// nergens over na te denken behalve de key (Base URL default = branddock.app).
async function saveAndTest(): Promise<void> {
  const { baseUrl, apiKey } = currentValues();
  await saveSettings({ baseUrl, apiKey });
  if (!apiKey) {
    showStatus('Opgeslagen — plak nog je API-key om te koppelen.', 'error');
    return;
  }
  if (!apiKey.startsWith('bd_live_')) {
    showStatus('Opgeslagen — let op: de key heeft niet het verwachte bd_live_-formaat.', 'error');
    return;
  }
  saveBtn.disabled = true;
  showStatus('Opgeslagen — verbinding testen…', 'busy');
  try {
    const result = await testConnection({ baseUrl, apiKey });
    if (result.ok) {
      showStatus(`Klaar! Gekoppeld aan workspace ${result.workspaceId}.`, 'ok');
    } else {
      showStatus(result.message, 'error');
    }
  } finally {
    saveBtn.disabled = false;
  }
}
