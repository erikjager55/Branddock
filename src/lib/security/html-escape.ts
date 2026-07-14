// =============================================================
// Pure HTML-escape + href-allowlist helpers (audit L6, 2026-06-26).
//
// Gebruikt door de Help-Center markdown-renderer (HelpArticlePage), die
// zijn output via dangerouslySetInnerHTML zet. Los van React zodat de
// sanitizers herbruikbaar én los te smoke-testen zijn.
// =============================================================

/** Escapet de vijf HTML-gevoelige tekens (incl. `"` voor attribuut-context). */
export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * Allowlist voor markdown-link-hrefs: alleen `https:` en `mailto:`. Blokkeert
 * scheme-injectie (`javascript:`, `data:`, `vbscript:`). De input is bedoeld
 * al escapeHtml'd (de renderer escapet de hele regel eerst), dus quote-
 * breakout uit een `href="…"`-attribuut is uitgesloten. Retourneert null als
 * het schema niet is toegestaan — de caller degradeert dan naar platte tekst.
 */
export function sanitizeMarkdownHref(href: string): string | null {
  const trimmed = href.trim();
  if (/^https:\/\//i.test(trimmed) || /^mailto:/i.test(trimmed)) {
    return trimmed;
  }
  return null;
}
