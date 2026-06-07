/**
 * Dev-tool — rendert de live LP (Puck "Medium") van een workspace exact zoals de
 * app, via <Render> + de echte BrandTokens, naar /tmp/lp-<slug>.html. Combineer
 * met scripts/dev/shot-lp.mjs voor een screenshot.
 *
 * Run: WS="Better" DATABASE_URL=... npx tsx scripts/dev/render-lp-brand.tsx
 *   WS   = (deel van) workspace-naam (default "zwart")
 *   SLUG = output-slug (default = WS lowercased, alfanumeriek)
 */
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import fs from "fs";
import { Render } from "@puckeditor/core";
import { prisma } from "../../src/lib/prisma";
import { extractBrandTokensFromStyleguide } from "../../src/lib/landing-pages/brand-tokens";
import { buildSpikePuckConfig } from "../../src/features/campaigns/components/canvas/medium/puck-config";
import { buildLandingPageTemplateFromStructured } from "../../src/features/campaigns/components/canvas/medium/puck-templates/landing-page-from-structured";
import { buildA11yStyleBlock } from "../../src/lib/landing-pages/a11y-styles";
import type { CanvasContextStack } from "../../src/lib/ai/canvas-context";

const WS = process.env.WS ?? "zwart";
const REBUILD = process.env.REBUILD === "1"; // herbouw de tree uit structuredVariant (= verse generatie)
const SLUG = process.env.SLUG ?? WS.toLowerCase().replace(/[^a-z0-9]/g, "");
const abs = (u: unknown) =>
  typeof u === "string" && u.startsWith("/uploads/") ? "file://" + process.cwd() + "/public" + u : u;

async function main() {
  const d = await prisma.deliverable.findFirst({
    where: { contentType: "landing-page", campaign: { workspace: { name: { contains: WS, mode: "insensitive" } } } },
    orderBy: { updatedAt: "desc" },
    select: { id: true, settings: true },
  });
  if (!d) { console.log("NO landing-page deliverable for", WS); return; }
  const settings = d.settings as Record<string, unknown>;
  const styleguide = await prisma.brandStyleguide.findFirst({
    where: { workspace: { name: { contains: WS, mode: "insensitive" } } },
    select: {
      primaryFontName: true, layoutStyle: true, layoutStyleInferred: true, archetype: true,
      buttonProfile: true, typographyProfile: true, spacingProfile: true, spacingScale: true,
      elevationProfile: true, radiusProfile: true, motionProfile: true, photographyStyle: true, visualLanguage: true,
      colors: { select: { hex: true, category: true, sortOrder: true, tags: true, contrastWhite: true, contrastBlack: true, confidence: true } },
      fonts: { select: { name: true, role: true, fontFamily: true, sortOrder: true, availability: true, fileUrl: true, fileType: true } },
      components: { select: { type: true, label: true, extractedStyles: true, confidence: true }, orderBy: [{ confidence: "desc" }, { sortOrder: "asc" }] },
      workspace: { select: { adobeFontsKitId: true, name: true } },
    },
  });
  const brandTokens = extractBrandTokensFromStyleguide(styleguide, { adobeFontsKitId: styleguide?.workspace?.adobeFontsKitId ?? null });
  const ctx = { brandTokens, personas: [], brand: { brandName: styleguide?.workspace?.name ?? WS }, deliverableTypeId: "landing-page", contentTypeInputs: {} } as unknown as CanvasContextStack;
  // REBUILD=1 → herbouw de tree uit structuredVariant via de ECHTE builder (incl.
  // bandTone-alternatie) zodat we een verse generatie zien. Anders: persisted puckData.
  const pd = (REBUILD && settings.structuredVariant
    ? buildLandingPageTemplateFromStructured(settings.structuredVariant as never, ctx)
    : settings.puckData) as { content?: Array<Record<string, unknown>> };
  if (!pd?.content) { console.log("NO puckData for", WS); return; }
  for (const c of pd.content) {
    const p = c.props as Record<string, unknown> | undefined;
    if (p?.heroVisualUrl) p.heroVisualUrl = abs(p.heroVisualUrl);
    const feats = p?.features as Array<Record<string, unknown>> | undefined;
    if (Array.isArray(feats)) for (const f of feats) if (f.imageUrl) f.imageUrl = abs(f.imageUrl);
  }
  const config = buildSpikePuckConfig(ctx);
  const body = renderToStaticMarkup(React.createElement(Render, { config, data: pd } as never));
  const puckCss = fs.readFileSync("node_modules/@puckeditor/core/dist/Render-3OV4N4MT.css", "utf8");
  const html = `<!doctype html><html lang="nl"><head><meta charset="utf-8"/><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Sen:wght@400;500;600;700;800&family=Roboto:wght@300;400;500;700&display=swap"/><style>${puckCss}</style><style>${buildA11yStyleBlock(brandTokens.brand)}</style><style>*{box-sizing:border-box}html,body{margin:0;padding:0}img{max-width:100%}</style></head><body>${body}</body></html>`;
  fs.writeFileSync(`/tmp/lp-${SLUG}.html`, html);
  console.log(`WROTE /tmp/lp-${SLUG}.html — ${styleguide?.workspace?.name} — dark:${brandTokens.hasDarkSections} surface:${brandTokens.surface} secondarySurface:${brandTokens.secondarySurface} brandSubtle:${brandTokens.brandSubtle} darkSectionBg:${brandTokens.darkSectionBg}`);
  if (REBUILD) {
    const seq = (pd.content ?? []).map((c) => `${c.type}:${(c.props as Record<string, unknown>)?.bandTone ?? "-"}`);
    console.log("  band-sequence:", seq.join("  "));
  }
  await prisma.$disconnect();
}
main().catch((e) => { console.error("ERR:", e); process.exit(1); });
