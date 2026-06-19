/**
 * GEO/SEO Fase 1a — per-workspace sitemap. Op `<workspace>.branddock.app/sitemap.xml`
 * worden de GEPUBLICEERDE pagina's van die ene workspace gelijst (host-afgeleid,
 * geen cross-tenant lek). Op apex/onbekend → lege urlset. host-router exempt
 * `/sitemap.xml` van de /p/-rewrite.
 */
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import { workspaceSlugFromHost } from "@/lib/landing-pages/host-router";
import { buildSitemapXml, requestOrigin, type SitemapEntry } from "@/lib/landing-pages/sitemap-host";

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
  if (workspaceSlug) {
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
