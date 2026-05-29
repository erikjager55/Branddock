"use client";

import { useEffect } from "react";
import type { BrandTokens } from "@/lib/landing-pages/brand-tokens";

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
 * Workspace-specifieke uploaded fonts (StyleguideFont.source=UPLOADED)
 * vereisen aparte @font-face uit fileUrl — niet gedekt door deze hook.
 */

const SYSTEM_FONTS = new Set([
  "system-ui", "-apple-system", "blinkmacsystemfont", "segoe ui",
  "roboto", "helvetica neue", "arial", "sans-serif", "serif", "monospace",
  "ui-sans-serif", "ui-serif", "ui-monospace",
]);

function extractFontName(fontStack: string): string | null {
  const first = fontStack.split(",")[0]?.trim();
  if (!first) return null;
  const stripped = first.replace(/^["']|["']$/g, "").trim();
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
