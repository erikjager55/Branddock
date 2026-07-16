/**
 * GEO/SEO Fase 1a — per-workspace sitemap. Op `<workspace>.branddock.app/sitemap.xml`
 * worden de GEPUBLICEERDE pagina's van die ene workspace gelijst (host-afgeleid,
 * geen cross-tenant lek). Op de marketing-apex (branddock.app) → de statische
 * marketing-pagina's. Op onbekend/app-host → lege urlset. host-router exempt
 * `/sitemap.xml` van de /p/-rewrite.
 */
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import { workspaceSlugFromHost, isMarketingApexHost } from "@/lib/landing-pages/host-router";
import { buildSitemapXml, requestOrigin, type SitemapEntry } from "@/lib/landing-pages/sitemap-host";
import { MARKETING_SITEMAP_PATHS } from "@/app/marketing/sitemap-pages";

export const dynamic = "force-dynamic";

export async function GET(): Promise<Response> {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "";
  const origin = requestOrigin(h.get("x-forwarded-proto"), host);
  const workspaceSlug = workspaceSlugFromHost(host);

  let entries: SitemapEntry[] = [];
  // Fail-soft: bij een DB-storing geen 500 (crawler zou de sitemap verwerpen) maar
  // een lege urlset met no-store, zodat de crawler de laatst bekende sitemap behoudt.
  let cacheControl = "public, max-age=3600";
  if (isMarketingApexHost(host)) {
    // Marketing-apex: de statische marketing-pagina's (was: lege urlset →
    // de site was onzichtbaar voor crawlers).
    entries = MARKETING_SITEMAP_PATHS.map((path) => ({ slug: path }));
  } else if (workspaceSlug) {
    try {
      const workspace = await prisma.workspace.findUnique({
        where: { slug: workspaceSlug },
        select: { id: true },
      });
      if (workspace) {
        const pages = await prisma.landingPage.findMany({
          where: { workspaceId: workspace.id, status: "PUBLISHED" },
          select: { slug: true, updatedAt: true, publishedAt: true },
        });
        entries = pages.map((p) => ({ slug: p.slug, lastModified: p.updatedAt ?? p.publishedAt }));
      }
    } catch (error) {
      console.error("[GET /sitemap.xml]", error);
      entries = [];
      cacheControl = "no-store";
    }
  }

  return new Response(buildSitemapXml(origin, entries), {
    headers: { "content-type": "application/xml", "cache-control": cacheControl },
  });
}
