/**
 * GEO/SEO Fase 1a — per-workspace llms.txt (experimentele standaard). Adverteert
 * de gepubliceerde URL's van één workspace als markdown zodat AI-engines ze
 * gericht kunnen ophalen. host-router exempt `/llms.txt` van de /p/-rewrite.
 */
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import { workspaceSlugFromHost } from "@/lib/landing-pages/host-router";
import { buildLlmsTxt, requestOrigin, type LlmsEntry } from "@/lib/landing-pages/sitemap-host";

export const dynamic = "force-dynamic";

/** Defensief: leest seoChecklist.titleTag uit de Json-settings (runtime onbekend). */
function titleFromSettings(settings: unknown): string | undefined {
  if (!settings || typeof settings !== "object" || Array.isArray(settings)) return undefined;
  const checklist = (settings as Record<string, unknown>).seoChecklist;
  if (!checklist || typeof checklist !== "object" || Array.isArray(checklist)) return undefined;
  const t = (checklist as Record<string, unknown>).titleTag;
  return typeof t === "string" && t.trim().length > 0 ? t.trim() : undefined;
}

export async function GET(): Promise<Response> {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "";
  const origin = requestOrigin(h.get("x-forwarded-proto"), host);
  const workspaceSlug = workspaceSlugFromHost(host);

  let entries: LlmsEntry[] = [];
  let cacheControl = "public, max-age=3600";
  if (workspaceSlug) {
    try {
      const workspace = await prisma.workspace.findUnique({
        where: { slug: workspaceSlug },
        select: { id: true },
      });
      if (workspace) {
        // Eén JOIN-query: titel uit de gekoppelde deliverable-settings (geen N+1).
        const pages = await prisma.landingPage.findMany({
          where: { workspaceId: workspace.id, status: "PUBLISHED" },
          select: { slug: true, deliverable: { select: { settings: true } } },
        });
        entries = pages.map((p) => ({ slug: p.slug, title: titleFromSettings(p.deliverable?.settings) }));
      }
    } catch (error) {
      console.error("[GET /llms.txt]", error);
      entries = [];
      cacheControl = "no-store";
    }
  }

  return new Response(buildLlmsTxt({ workspaceName: workspaceSlug, origin, entries }), {
    headers: { "content-type": "text/plain; charset=utf-8", "cache-control": cacheControl },
  });
}
