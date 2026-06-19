/**
 * GEO/SEO Fase 1a — host-aware robots.txt. Op een workspace-subdomein → crawl
 * toegestaan + verwijzing naar de per-workspace sitemap. Op apex/onbekend (de
 * private app-shell) → niet-schadelijke defaults zonder sitemap. host-router
 * exempt `/robots.txt` van de /p/-rewrite.
 */
import { headers } from "next/headers";
import { workspaceSlugFromHost } from "@/lib/landing-pages/host-router";
import { buildRobotsTxt, requestOrigin } from "@/lib/landing-pages/sitemap-host";

export const dynamic = "force-dynamic";

export async function GET(): Promise<Response> {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "";
  const workspaceSlug = workspaceSlugFromHost(host);
  const sitemapUrl = workspaceSlug ? `${requestOrigin(h.get("x-forwarded-proto"), host)}/sitemap.xml` : null;

  return new Response(buildRobotsTxt({ sitemapUrl }), {
    headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "public, max-age=3600" },
  });
}
