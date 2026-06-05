// =============================================================
// Google Fonts Catalog Lookup
//
// Determines whether a detected font name is present in the public
// Google Fonts catalog (~1400 families). Used by the analyzer to
// distinguish:
//   - DETECTED + on Google Fonts → auto-loadable via CDN, no upload needed
//   - DETECTED + not on Google Fonts → licensed/commercial (Effra, Sohne, …)
//                                      → user must upload the file
//
// Strategy: fetch the unauthenticated metadata endpoint once, cache in
// memory for 24h. On fetch failure, fall back to a small hardcoded list
// of the ~80 most popular open-source families so we don't degrade to
// "everything is commercial".
// =============================================================

// Public (unauthenticated) metadata endpoint used internally by fonts.google.com.
// The old `fonts.googleapis.com/metadata/fonts` path 404s since 2025; this path
// returns the full 1900+ family list wrapped in a `familyMetadataList` array.
const GOOGLE_FONTS_METADATA_URL = "https://fonts.google.com/metadata/fonts";
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours
const FETCH_TIMEOUT_MS = 8_000;

interface CacheEntry {
  families: Set<string>; // lowercase family names
  fetchedAt: number;
}

// Module-level cache — safe across multiple analyzer runs in the same process.
let _cache: CacheEntry | null = null;

/**
 * Fallback list used when the Google Fonts metadata endpoint is unreachable.
 * Covers the ~80 most-used families per Google Fonts popularity data, so most
 * scans still classify correctly even during outages.
 */
const FALLBACK_POPULAR_FONTS: readonly string[] = [
  "Roboto", "Open Sans", "Noto Sans", "Montserrat", "Lato", "Poppins",
  "Inter", "Oswald", "Raleway", "Nunito", "Roboto Condensed", "Ubuntu",
  "Playfair Display", "Merriweather", "PT Sans", "Roboto Slab", "Noto Serif",
  "Work Sans", "Fira Sans", "Quicksand", "Mukta", "Rubik", "Kanit", "Barlow",
  "Nunito Sans", "Hind Siliguri", "Nanum Gothic", "Titillium Web", "Heebo",
  "Arimo", "Dosis", "Libre Franklin", "Bitter", "Josefin Sans", "Inconsolata",
  "Karla", "PT Serif", "Anton", "Fjalla One", "Cabin", "Libre Baskerville",
  "Source Sans 3", "Source Sans Pro", "Source Serif 4", "Source Serif Pro",
  "Source Code Pro", "DM Sans", "DM Serif Display", "DM Serif Text",
  "Manrope", "Archivo", "IBM Plex Sans", "IBM Plex Serif", "IBM Plex Mono",
  "Outfit", "Space Grotesk", "Space Mono", "Plus Jakarta Sans", "Fraunces",
  "Red Hat Display", "Red Hat Text", "JetBrains Mono", "Fira Code",
  "EB Garamond", "Crimson Text", "Crimson Pro", "Lora", "Cormorant Garamond",
  "Playfair", "Abril Fatface", "Pacifico", "Dancing Script", "Great Vibes",
  "Lobster", "Caveat", "Shadows Into Light", "Indie Flower",
  "Bebas Neue", "Permanent Marker", "Satisfy", "Poetsen One",
  "Figtree", "Geist", "Geist Mono", "Onest",
  "Noto Color Emoji", "Material Icons", "Material Symbols Outlined",
];

async function fetchGoogleFontsCatalog(): Promise<Set<string>> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const response = await fetch(GOOGLE_FONTS_METADATA_URL, {
      signal: controller.signal,
      headers: { Accept: "application/json" },
    });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    // Google prefixes JSON with a XSSI guard: `)]}'\n` — strip if present.
    let text = await response.text();
    if (text.startsWith(")]}'")) text = text.slice(5);
    const parsed = JSON.parse(text);
    const list = parsed?.familyMetadataList;
    if (!Array.isArray(list)) throw new Error("Malformed metadata payload");
    const families = new Set<string>();
    for (const entry of list) {
      if (typeof entry?.family === "string") {
        families.add(entry.family.toLowerCase());
      }
    }
    if (families.size === 0) throw new Error("Empty family list");
    return families;
  } finally {
    clearTimeout(timer);
  }
}

async function loadCatalog(): Promise<Set<string>> {
  const now = Date.now();
  if (_cache && now - _cache.fetchedAt < CACHE_TTL_MS) {
    return _cache.families;
  }
  try {
    const families = await fetchGoogleFontsCatalog();
    _cache = { families, fetchedAt: now };
    console.log(`[google-fonts-catalog] Loaded ${families.size} families`);
    return families;
  } catch (err) {
    console.warn(
      `[google-fonts-catalog] Fetch failed, using fallback list (${err instanceof Error ? err.message : String(err)})`,
    );
    const fallback = new Set(FALLBACK_POPULAR_FONTS.map((f) => f.toLowerCase()));
    _cache = { families: fallback, fetchedAt: now };
    return fallback;
  }
}

/**
 * Strip a trailing weight/style token from a font name so a styled face name
 * ("Sen Bold", "Poppins SemiBold Italic") resolves to its catalog family
 * ("Sen", "Poppins") — verbeterplan Fase 3d. Conservatief: strip alleen
 * BEKENDE trailing weight/style-woorden (+ numerieke 100-900), iteratief, en
 * nooit het laatste resterende woord (zodat een merk-font die letterlijk
 * "Bold" heet niet leeg wordt). Wijzigt de display-naam NIET — alleen de
 * lookup-key. Geëxporteerd voor de smoke.
 */
const WEIGHT_STYLE_TOKENS = new Set([
  'thin', 'hairline', 'extralight', 'ultralight', 'light', 'regular', 'normal',
  'book', 'medium', 'semibold', 'demibold', 'demi', 'bold', 'extrabold',
  'ultrabold', 'black', 'heavy', 'italic', 'oblique', 'roman',
]);
export function stripFontWeightSuffix(name: string): string {
  const parts = name.trim().split(/\s+/);
  while (parts.length > 1) {
    const last = parts[parts.length - 1].toLowerCase();
    if (WEIGHT_STYLE_TOKENS.has(last) || /^[1-9]00$/.test(last)) {
      parts.pop();
    } else {
      break;
    }
  }
  return parts.join(' ');
}

/**
 * Check a font name against the Google Fonts catalog. Returns true when the
 * font is available via the free CDN (user doesn't need to upload), false
 * when it's not found (likely commercial / needs upload).
 *
 * Case-insensitive match on exact family name. Loose matches like "Inter UI"
 * against "Inter" are NOT considered — avoids false positives for fonts that
 * happen to share a prefix. A weight/style-stripped fallback ("Sen Bold" →
 * "Sen") IS tried so styled face-names still resolve (Fase 3d).
 */
export async function isOnGoogleFonts(fontName: string): Promise<boolean> {
  if (!fontName) return false;
  const families = await loadCatalog();
  const lower = fontName.trim().toLowerCase();
  if (families.has(lower)) return true;
  const stripped = stripFontWeightSuffix(lower);
  return stripped !== lower && families.has(stripped);
}

/**
 * Batch version — one catalog lookup for multiple names. Returns a Map of
 * lowercase name → availability. Used by the analyzer to classify all
 * detected fonts in a single pass.
 */
export async function classifyFontsAgainstGoogleFonts(
  fontNames: readonly string[],
): Promise<Map<string, boolean>> {
  const families = await loadCatalog();
  const out = new Map<string, boolean>();
  for (const name of fontNames) {
    if (!name) continue;
    const lower = name.trim().toLowerCase();
    // Exact match, of de weight-gestripte familie ("Sen Bold" → "Sen") — Fase 3d.
    const stripped = stripFontWeightSuffix(lower);
    out.set(lower, families.has(lower) || (stripped !== lower && families.has(stripped)));
  }
  return out;
}
