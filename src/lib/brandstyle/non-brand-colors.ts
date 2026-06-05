/**
 * Niet-merk-kleur-detectie (cross-brand verbeterplan, 2026-06-05).
 *
 * Naast CSS-framework-defaults (zie framework-defaults.ts, usage-gegate) zijn er
 * kleuren die ALTIJD geweerd moeten worden — ze renderen wél maar zijn nooit van
 * het merk:
 *   - Third-party widgets / social-shares: WhatsApp-chat, Facebook/Instagram/
 *     LinkedIn/Twitter-share-knoppen, Messenger, Intercom, ...
 *   - CMS-admin/system: WordPress `--wp-admin-theme-color` (#007CBA) e.d.
 *
 * Cross-brand bewijs (DB): napking → WhatsApp Green #25D366, WordPress Blue
 * #007CBA; peoplemasterminds → 8 social-netwerk-kleuren als brand-SECONDARY/
 * ACCENT. De AI tagt ze al (`social`/`whatsapp`/`admin`/`system`); dat is het
 * primaire signaal, met een known-hex-backstop voor ongetagde gevallen.
 *
 * Verschil met framework-defaults: die droppen we TENZIJ sterk gebruikt; deze
 * weren we ALTIJD (een prominente WhatsApp-knop is nóóit de merk-kleur).
 */

/** Tags (exact-token) die niet-merk-herkomst markeren — door de AI gezet.
 *  `x` is bewust WEGGELATEN (te dubbelzinnig: een merk kan "X" heten). */
const NON_BRAND_TAGS = new Set([
  'social', 'whatsapp', 'messenger', 'facebook', 'instagram', 'twitter',
  'linkedin', 'youtube', 'tiktok', 'pinterest', 'snapchat', 'intercom',
  'admin', 'system', 'plugin', 'widget', 'wp-admin',
]);

/** Bekende widget/social-hexes (backstop ALLEEN voor ongetagde gevallen).
 *  Bewust ZEER beperkt tot distinctieve, niet-blauwe hexes die vrijwel nooit een
 *  merk-kleur zijn. Alle BLAUWE platform-hexes (Facebook/Twitter/LinkedIn/
 *  Messenger/Telegram/WP-admin) zijn WEGGELATEN: ze overlappen de enorme
 *  corporate-/material-blauw-band binnen tolerantie (bv. Telegram #0088CC ~
 *  Ocean Blue #008ACF; Twitter #1DA1F2 ~ Material #2196F3). Idem puur-rood
 *  (#FF0000 = elk merk-rood). Die gevallen gaan UITSLUITEND via de AI-tag. */
const NON_BRAND_HEXES: Array<{ r: number; g: number; b: number }> = [
  '#25D366', '#075E54', '#128C7E', // WhatsApp (distinctieve groen-band)
  '#E4405F',                        // Instagram (iconisch pink-rood, ~35 van merk-reds)
].map((h) => {
  const x = h.replace('#', '');
  return { r: parseInt(x.slice(0, 2), 16), g: parseInt(x.slice(2, 4), 16), b: parseInt(x.slice(4, 6), 16) };
});

const HEX_TOLERANCE = 12;

function parseHex(hex: string): { r: number; g: number; b: number } | null {
  let x = hex.trim().replace(/^#/, '').toLowerCase();
  if (x.length === 3) x = x.split('').map((c) => c + c).join('');
  if (!/^[0-9a-f]{6}$/.test(x)) return null;
  return { r: parseInt(x.slice(0, 2), 16), g: parseInt(x.slice(2, 4), 16), b: parseInt(x.slice(4, 6), 16) };
}

/**
 * True wanneer een kleur géén merk-kleur is (third-party widget / social-share /
 * CMS-admin) en dus ALTIJD uit het palet moet, ongeacht hoe vaak hij rendert.
 * Pure functie — deterministisch testbaar.
 */
export function isNonBrandColor(c: { hex: string; tags?: string[] }): boolean {
  const tags = (c.tags ?? []).map((t) => t.toLowerCase());
  if (tags.some((t) => NON_BRAND_TAGS.has(t))) return true;
  const rgb = parseHex(c.hex);
  if (!rgb) return false;
  return NON_BRAND_HEXES.some(
    (h) => Math.sqrt((h.r - rgb.r) ** 2 + (h.g - rgb.g) ** 2 + (h.b - rgb.b) ** 2) <= HEX_TOLERANCE,
  );
}
