/**
 * GEO/SEO Fase 1a — pure builders voor de per-workspace SEO/GEO-discovery-files
 * (sitemap.xml / robots.txt / llms.txt). Bewust DB-/Request-vrij zodat ze los
 * smoke-getest kunnen worden; de route-handlers leveren host + entries aan.
 *
 * Multi-tenant model: elke `<workspace>.branddock.app` serveert ZIJN EIGEN
 * discovery-files (geen globale root-sitemap → geen cross-tenant slug-lek). De
 * URL's worden uit de request-origin gebouwd zodat ze ook op `*.lvh.me` (lokaal)
 * en eventuele custom domains kloppen.
 */

/** Minimale XML-escape voor tekst in element-content (slugs zijn al `[a-z0-9-]`, titels niet). */
function xmlEscape(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export interface SitemapEntry {
  slug: string;
  lastModified?: Date | string | null;
}

/** Bouwt een sitemap-urlset uit gepubliceerde pagina-slugs onder `origin` (bv. `https://acme.branddock.app`). */
export function buildSitemapXml(origin: string, entries: SitemapEntry[]): string {
  const base = origin.replace(/\/+$/, "");
  const urls = entries
    .map((e) => {
      const loc = xmlEscape(`${base}/${e.slug}`);
      const lastmod = toIsoDate(e.lastModified);
      return `  <url>\n    <loc>${loc}</loc>${lastmod ? `\n    <lastmod>${lastmod}</lastmod>` : ""}\n  </url>`;
    })
    .join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${
    urls ? `\n${urls}\n` : "\n"
  }</urlset>\n`;
}

/**
 * robots.txt. Op een workspace-subdomein (gepubliceerde pagina's bestaan) →
 * crawl toegestaan + Sitemap-verwijzing. Op apex/onbekend (de private app-shell,
 * niets publiek indexeerbaars) → alleen niet-schadelijke defaults, geen sitemap.
 */
export function buildRobotsTxt(opts: { sitemapUrl?: string | null }): string {
  const lines = ["User-agent: *", "Allow: /", "Disallow: /api/"];
  if (opts.sitemapUrl) lines.push(`Sitemap: ${opts.sitemapUrl}`);
  return `${lines.join("\n")}\n`;
}

export interface LlmsEntry {
  slug: string;
  title?: string | null;
}

/**
 * llms.txt (experimentele standaard) — adverteert de high-value gepubliceerde
 * URL's van één workspace als markdown-lijst zodat AI-engines ze gericht kunnen
 * ophalen. Leeg → korte placeholder.
 */
export function buildLlmsTxt(opts: {
  workspaceName?: string | null;
  origin: string;
  entries: LlmsEntry[];
}): string {
  const base = opts.origin.replace(/\/+$/, "");
  const heading = `# ${opts.workspaceName?.trim() || "Published pages"}`;
  if (opts.entries.length === 0) {
    return `${heading}\n\n> Nog geen gepubliceerde pagina's.\n`;
  }
  const links = opts.entries
    .map((e) => `- [${(e.title?.trim() || e.slug)}](${base}/${e.slug})`)
    .join("\n");
  return `${heading}\n\n## Pages\n\n${links}\n`;
}

/** Bouwt de request-origin uit (forwarded) proto + host; valt terug op de apex bij ontbreken. */
export function requestOrigin(proto: string | null | undefined, host: string | null | undefined): string {
  const p = (proto ?? "https").split(",")[0].trim() || "https";
  const h = (host ?? "").split(",")[0].trim();
  return h ? `${p}://${h}` : "https://branddock.app";
}

function toIsoDate(value: Date | string | null | undefined): string | null {
  if (!value) return null;
  const d = value instanceof Date ? value : new Date(value);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}
