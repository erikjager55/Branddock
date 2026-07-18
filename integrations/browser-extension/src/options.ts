// =============================================================
// Options-pagina met twee auth-modi:
//
//   "Inloggen met Branddock" (aanbevolen) — OAuth met PKCE via
//   chrome.identity.launchWebAuthFlow; daarna merk-keuze in de popup.
//   "API-key" — het bestaande key-first-pad (bd_live_…), merk-vergrendeld.
//
// De tab-keuze ís de modus-keuze en wordt direct opgeslagen
// (chrome.storage.local). De Base URL onder "Geavanceerd" geldt voor
// beide modi; na een Base-URL-wissel is opnieuw inloggen nodig (tokens
// zijn aan de oude issuer gebonden).
// =============================================================

import { testConnection, BranddockApiError } from './api';
import { getSettings, saveSettings, DEFAULT_SETTINGS } from './settings';
import {
  getAuthMode,
  setAuthMode,
  loginWithBranddock,
  logout,
  isLoggedIn,
  ensureAccessToken,
  type AuthMode,
} from './auth';
import { initializeMcp } from './mcp';
import { getBrands } from './brands';

function byId<T extends HTMLElement>(id: string): T {
  const node = document.getElementById(id);
  if (!node) throw new Error(`Options-element ontbreekt: ${id}`);
  return node as T;
}

const tabOauth = byId<HTMLButtonElement>('tab-oauth');
const tabKey = byId<HTMLButtonElement>('tab-key');
const panelOauth = byId<HTMLElement>('panel-oauth');
const panelKey = byId<HTMLElement>('panel-key');

const oauthStatusEl = byId<HTMLParagraphElement>('oauth-status');
const loginBtn = byId<HTMLButtonElement>('btn-login');
const testOauthBtn = byId<HTMLButtonElement>('btn-test-oauth');
const logoutBtn = byId<HTMLButtonElement>('btn-logout');

const baseUrlInput = byId<HTMLInputElement>('base-url');
const apiKeyInput = byId<HTMLInputElement>('api-key');
const showKeyToggle = byId<HTMLInputElement>('show-key');
const saveBtn = byId<HTMLButtonElement>('btn-save');
const keyStatusEl = byId<HTMLParagraphElement>('key-status');

void init();

async function init(): Promise<void> {
  const settings = await getSettings();
  baseUrlInput.value = settings.baseUrl;
  apiKeyInput.value = settings.apiKey;

  selectTab(await getAuthMode(settings));
  await renderOauthState();

  tabOauth.addEventListener('click', () => void chooseTab('oauth'));
  tabKey.addEventListener('click', () => void chooseTab('key'));
  loginBtn.addEventListener('click', () => void login());
  testOauthBtn.addEventListener('click', () => void testOauthConnection());
  logoutBtn.addEventListener('click', () => void doLogout());
  showKeyToggle.addEventListener('change', () => {
    apiKeyInput.type = showKeyToggle.checked ? 'text' : 'password';
  });
  saveBtn.addEventListener('click', () => void saveAndTest());
  baseUrlInput.addEventListener('change', () => void renderOauthState());
}

// ─── Tabs = modus-keuze ──────────────────────────────────────

function selectTab(mode: AuthMode): void {
  const oauth = mode === 'oauth';
  tabOauth.classList.toggle('active', oauth);
  tabKey.classList.toggle('active', !oauth);
  tabOauth.setAttribute('aria-selected', String(oauth));
  tabKey.setAttribute('aria-selected', String(!oauth));
  panelOauth.hidden = !oauth;
  panelKey.hidden = oauth;
}

async function chooseTab(mode: AuthMode): Promise<void> {
  selectTab(mode);
  await setAuthMode(mode);
  if (mode === 'oauth') await renderOauthState();
}

// ─── OAuth-paneel ────────────────────────────────────────────

function baseUrlValue(): string {
  return baseUrlInput.value.trim() || DEFAULT_SETTINGS.baseUrl;
}

function showOauthStatus(message: string, kind: 'ok' | 'error' | 'busy'): void {
  oauthStatusEl.hidden = false;
  oauthStatusEl.textContent = message;
  oauthStatusEl.className = `status ${kind}`;
}

function renderOauthButtons(loggedIn: boolean): void {
  loginBtn.textContent = loggedIn ? 'Opnieuw inloggen' : 'Inloggen met Branddock';
  testOauthBtn.hidden = !loggedIn;
  logoutBtn.hidden = !loggedIn;
}

async function renderOauthState(): Promise<void> {
  const loggedIn = await isLoggedIn(baseUrlValue());
  renderOauthButtons(loggedIn);
  if (loggedIn) {
    showOauthStatus(`Ingelogd bij ${hostOf(baseUrlValue())}. Kies je merk in de popup.`, 'ok');
  } else {
    showOauthStatus('Niet ingelogd.', 'busy');
  }
}

function hostOf(baseUrl: string): string {
  try {
    return new URL(baseUrl).host;
  } catch {
    return baseUrl;
  }
}

function errText(error: unknown): string {
  return error instanceof BranddockApiError
    ? error.message
    : 'Er ging iets mis. Probeer het opnieuw.';
}

function setOauthBusy(busy: boolean): void {
  for (const btn of [loginBtn, testOauthBtn, logoutBtn]) btn.disabled = busy;
}

async function login(): Promise<void> {
  const baseUrl = baseUrlValue();
  await saveSettings({ baseUrl });
  setOauthBusy(true);
  showOauthStatus('Inloggen… er opent een apart venster voor de beveiligde login.', 'busy');
  try {
    await loginWithBranddock(baseUrl);
    const brands = await getBrands(baseUrl, true);
    renderOauthButtons(true);
    showOauthStatus(
      `Ingelogd — toegang tot ${brands.length} merk${brands.length === 1 ? '' : 'en'}. Kies je merk in de popup van de extensie.`,
      'ok',
    );
  } catch (error) {
    renderOauthButtons(await isLoggedIn(baseUrl));
    showOauthStatus(errText(error), 'error');
  } finally {
    setOauthBusy(false);
  }
}

/** Bewijst token + endpoint met een lichte MCP-handshake (initialize). */
async function testOauthConnection(): Promise<void> {
  const baseUrl = baseUrlValue();
  setOauthBusy(true);
  showOauthStatus('Verbinding testen…', 'busy');
  try {
    const bearer = await ensureAccessToken(baseUrl);
    const serverInfo = await initializeMcp({ baseUrl, bearer });
    showOauthStatus(
      `Verbinding OK — ${serverInfo.name ?? 'Branddock MCP'} op ${hostOf(baseUrl)}.`,
      'ok',
    );
  } catch (error) {
    showOauthStatus(errText(error), 'error');
    await renderOauthState();
  } finally {
    setOauthBusy(false);
  }
}

async function doLogout(): Promise<void> {
  await logout();
  renderOauthButtons(false);
  showOauthStatus('Uitgelogd. Tokens zijn van dit apparaat verwijderd.', 'ok');
}

// ─── API-key-paneel (bestaand pad) ───────────────────────────

function showKeyStatus(message: string, kind: 'ok' | 'error' | 'busy'): void {
  keyStatusEl.hidden = false;
  keyStatusEl.textContent = message;
  keyStatusEl.className = `status ${kind}`;
}

// Eén actie: opslaan en direct de verbinding bewijzen — de gebruiker hoeft
// nergens over na te denken behalve de key (Base URL default = branddock.app).
async function saveAndTest(): Promise<void> {
  const baseUrl = baseUrlValue();
  const apiKey = apiKeyInput.value.trim();
  await saveSettings({ baseUrl, apiKey });
  await setAuthMode('key');
  if (!apiKey) {
    showKeyStatus('Opgeslagen — plak nog je API-key om te koppelen.', 'error');
    return;
  }
  if (!apiKey.startsWith('bd_live_')) {
    showKeyStatus('Opgeslagen — let op: de key heeft niet het verwachte bd_live_-formaat.', 'error');
    return;
  }
  saveBtn.disabled = true;
  showKeyStatus('Opgeslagen — verbinding testen…', 'busy');
  try {
    const result = await testConnection({ baseUrl, apiKey });
    if (result.ok) {
      showKeyStatus(`Klaar! Gekoppeld aan workspace ${result.workspaceId}.`, 'ok');
    } else {
      showKeyStatus(result.message, 'error');
    }
  } finally {
    saveBtn.disabled = false;
  }
}
