// =============================================================
// Merk-lijst + merk-keuze (chrome-gebonden, alleen OAuth-modus).
//
// list_brands wordt 10 minuten gecachet in chrome.storage.local zodat de
// popup direct opent; de keuze zelf is local (hoort bij de login op dit
// apparaat). Geen keuze = "Volg Branddock": er gaat geen brand-param mee
// en de server volgt de actieve organisatie van de gebruiker.
// =============================================================

import { normalizeBaseUrl } from './api';
import { listBrands, type BrandInfo } from './mcp';
import { ensureAccessToken, LOCAL_KEYS } from './auth';

const BRANDS_TTL_MS = 10 * 60_000;

interface StoredBrandsCache {
  issuer: string;
  fetchedAt: number;
  brands: BrandInfo[];
}

/** De gekozen merk-optie; naam alleen voor weergave. */
export interface SelectedBrand {
  workspaceId: string;
  name: string;
}

/**
 * Merken voor de huidige login, met 10-minuten-cache. `force` ververst
 * altijd (na een login of expliciete refresh).
 */
export async function getBrands(baseUrl: string, force = false): Promise<BrandInfo[]> {
  const issuer = normalizeBaseUrl(baseUrl);
  if (!force) {
    const stored = await chrome.storage.local.get(LOCAL_KEYS.brands);
    const cache = stored[LOCAL_KEYS.brands] as StoredBrandsCache | undefined;
    if (cache && cache.issuer === issuer && Date.now() - cache.fetchedAt < BRANDS_TTL_MS) {
      return cache.brands;
    }
  }
  const bearer = await ensureAccessToken(baseUrl);
  const brands = await listBrands({ baseUrl, bearer });
  const cache: StoredBrandsCache = { issuer, fetchedAt: Date.now(), brands };
  await chrome.storage.local.set({ [LOCAL_KEYS.brands]: cache });
  return brands;
}

/** Gekozen merk, of undefined = "Volg Branddock". */
export async function getSelectedBrand(): Promise<SelectedBrand | undefined> {
  const stored = await chrome.storage.local.get(LOCAL_KEYS.selectedBrand);
  return stored[LOCAL_KEYS.selectedBrand] as SelectedBrand | undefined;
}

/** Slaat de merk-keuze op; null = terug naar "Volg Branddock". */
export async function setSelectedBrand(brand: SelectedBrand | null): Promise<void> {
  if (brand) {
    await chrome.storage.local.set({ [LOCAL_KEYS.selectedBrand]: brand });
  } else {
    await chrome.storage.local.remove([LOCAL_KEYS.selectedBrand]);
  }
}
