// =============================================================
// Extensie-instellingen in chrome.storage.sync (gesynct over apparaten).
// =============================================================

export interface ExtensionSettings {
  /** Basis-URL van de Branddock-installatie, bijv. https://branddock.app */
  baseUrl: string;
  /** Workspace-API-key (bd_live_…) uit Branddock Settings → API & Connectors. */
  apiKey: string;
  /** Vrije doelgroep-notitie — gaat als instruction-context mee met elke rewrite/reply. */
  audienceNote: string;
}

export const DEFAULT_SETTINGS: ExtensionSettings = {
  baseUrl: 'https://branddock.app',
  apiKey: '',
  audienceNote: '',
};

/** Leest alle instellingen, met defaults voor ontbrekende velden. */
export async function getSettings(): Promise<ExtensionSettings> {
  const stored = await chrome.storage.sync.get({ ...DEFAULT_SETTINGS });
  return { ...DEFAULT_SETTINGS, ...(stored as Partial<ExtensionSettings>) };
}

/** Slaat een deel van de instellingen op. */
export async function saveSettings(patch: Partial<ExtensionSettings>): Promise<void> {
  await chrome.storage.sync.set(patch);
}

/** Minimale configuratie-check — géén netwerk-validatie (daarvoor is Test verbinding). */
export function isConfigured(settings: ExtensionSettings): boolean {
  return settings.apiKey.trim().startsWith('bd_live_') && settings.baseUrl.trim().length > 0;
}
