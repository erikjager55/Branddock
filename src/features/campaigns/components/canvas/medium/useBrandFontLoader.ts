"use client";

import { useEffect } from "react";
import type { BrandTokens } from "@/lib/landing-pages/brand-tokens";
import { injectTypekitCss, injectUploadedFontFace } from "@/features/brandstyle/utils/font-loading";

/**
 * Laadt brand-fonts (Google Fonts) in document.head zodat de Puck-render
 * de juiste typography toont. Zonder deze hook valt browser terug op
 * system-ui — Hero met "Oranienbaum" of "Cormorant Garamond" rendert als
 * sans-serif default i.p.v. de bedoelde serif.
 *
 * Strategie:
 * - Lees tokens.headingFont + tokens.bodyFont
 * - Extract de eerste font-family naam (voor de fallback-chain)
 * - Filter system-defaults (system-ui, Arial, sans-serif, etc.) — die
 *   hebben geen Google Fonts URL nodig
 * - Build één `<link>` met family-list voor alle non-system fonts
 * - De-dupe via gefixeerde element-id; re-write bij font-change
 *
 * E-3: non-Google bronnen worden óók geladen via tokens.fontAssets —
 * UPLOADED via @font-face (fileUrl), ADOBE_FONTS via de workspace-Typekit-kit
 * (tokens.adobeFontsKitId). Hun families worden uit de Google-aanvraag gesloten.
 */

// Track 3b: 'roboto' is BEWUST NIET meer system: Roboto is een Google-font dat
// alléén op Android geïnstalleerd is — op macOS/Windows valt het zonder load
// terug op generic sans (zwarthout's body = Roboto → "generieke font"-look). We
// laden 'm dus wél van Google. Echte OS-fonts (Segoe/Arial/Helvetica Neue) +
// generics blijven uitgesloten.
const SYSTEM_FONTS = new Set([
  "system-ui", "-apple-system", "blinkmacsystemfont", "segoe ui",
  "helvetica neue", "arial", "sans-serif", "serif", "monospace",
  "ui-sans-serif", "ui-serif", "ui-monospace",
]);

const WEIGHT_WORDS = new Set([
  "thin", "extralight", "ultralight", "light", "regular", "normal", "medium",
  "semibold", "demibold", "bold", "extrabold", "ultrabold", "black", "heavy",
  "italic", "oblique",
]);

/** Strip een trailing weight/style-woord ("Sen Bold" → "Sen") zodat de Google-
 *  request de echte family vraagt i.p.v. een niet-bestaande "Family Weight". */
function stripWeight(name: string): string {
  const parts = name.trim().split(/\s+/);
  while (parts.length > 1 && (WEIGHT_WORDS.has(parts[parts.length - 1].toLowerCase()) || /^[1-9]00$/.test(parts[parts.length - 1]))) {
    parts.pop();
  }
  return parts.join(" ");
}

/** De daadwerkelijk te laden Google-family uit een font-stack: eerste naam,
 *  quotes weg, weight-suffix gestript, en `null` voor echte OS/generic fonts.
 *  Geëxporteerd voor de smoke-test. */
export function extractFontName(fontStack: string): string | null {
  const first = fontStack.split(",")[0]?.trim();
  if (!first) return null;
  const stripped = stripWeight(first.replace(/^["']|["']$/g, "").trim());
  if (!stripped) return null;
  if (SYSTEM_FONTS.has(stripped.toLowerCase())) return null;
  return stripped;
}

function buildGoogleFontsUrl(families: string[]): string {
  // weights 300/400/500/600/700 cover heading + body + button strategies
  const params = families
    .map((f) => `family=${encodeURIComponent(f).replace(/%20/g, "+")}:wght@300;400;500;600;700`)
    .join("&");
  return `https://fonts.googleapis.com/css2?${params}&display=swap`;
}

export function useBrandFontLoader(tokens: BrandTokens | null | undefined) {
  useEffect(() => {
    if (typeof document === "undefined" || !tokens) return;

    const families = new Set<string>();
    const heading = extractFontName(tokens.headingFont);
    if (heading) families.add(heading);
    const body = extractFontName(tokens.bodyFont);
    if (body) families.add(body);
    const display = extractFontName(tokens.designSystem?.typography?.display?.fontFamily ?? "");
    if (display) families.add(display);
    const labelFont = extractFontName(tokens.designSystem?.typography?.label?.fontFamily ?? "");
    if (labelFont) families.add(labelFont);

    // E-1: per-rol gescrapte families (de échte font van h1/h2/body/eyebrow),
    // los van de globale heading/body-stacks — anders rendert puck-config ze niet.
    const tbr = tokens.typographyByRole;
    if (tbr) {
      for (const role of [tbr.display, tbr.heading, tbr.body, tbr.label]) {
        const roleFont = extractFontName(role?.fontFamily ?? "");
        if (roleFont) families.add(roleFont);
      }
    }

    // E-3: non-Google bronnen apart laden — UPLOADED via @font-face, ADOBE_FONTS
    // via de workspace-Typekit-kit. Een family wordt ALLEEN uit de Google-
    // aanvraag gesloten wanneer hij ook écht via die bron laadt — anders zou
    // een niet-ladende font op system-fallback vallen i.p.v. een Google-poging.
    // Normaliseer via extractFontName zodat de match 1-op-1 is met de Google-set
    // (zelfde weight-strip + system-filter).
    const assetFamilies = new Set<string>();
    let needsTypekit = false;
    const hasKit = !!tokens.adobeFontsKitId;
    const excludeFromGoogle = (family: string): void => {
      const norm = extractFontName(family);
      if (norm) assetFamilies.add(norm.toLowerCase());
    };
    for (const asset of tokens.fontAssets ?? []) {
      if (asset.availability === "UPLOADED" && asset.fileUrl) {
        injectUploadedFontFace(asset.family, asset.fileUrl, asset.fileType);
        excludeFromGoogle(asset.family);
      } else if (asset.availability === "ADOBE_FONTS" && hasKit) {
        needsTypekit = true;
        excludeFromGoogle(asset.family);
      }
    }
    if (needsTypekit && tokens.adobeFontsKitId) {
      injectTypekitCss(tokens.adobeFontsKitId);
    }
    for (const g of [...families]) {
      if (assetFamilies.has(g.toLowerCase())) families.delete(g);
    }

    if (families.size === 0) return;

    const linkId = "brand-font-loader";
    let link = document.getElementById(linkId) as HTMLLinkElement | null;
    const href = buildGoogleFontsUrl(Array.from(families));

    if (!link) {
      link = document.createElement("link");
      link.id = linkId;
      link.rel = "stylesheet";
      document.head.appendChild(link);
    }
    if (link.href !== href) {
      link.href = href;
    }

    // Persistent — geen cleanup bij unmount (fonts blijven cached + zijn
    // global; bij tab-switch in canvas willen we niet opnieuw laden).
  }, [tokens]);
}
