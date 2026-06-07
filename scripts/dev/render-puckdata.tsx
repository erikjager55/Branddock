/**
 * Dev-tool — rendert de EXACTE persisted puckData (uit /tmp/puckdata-zwart-raw.json)
 * door <Render>, identiek aan de live app (geen tree-rebuild). /uploads → file://.
 * Run: DATABASE_URL=... npx tsx scripts/dev/render-puckdata.tsx
 */
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import fs from "fs";
import { Render } from "@puckeditor/core";
import { prisma } from "../../src/lib/prisma";
import { extractBrandTokensFromStyleguide } from "../../src/lib/landing-pages/brand-tokens";
import { buildSpikePuckConfig } from "../../src/features/campaigns/components/canvas/medium/puck-config";
import { buildA11yStyleBlock } from "../../src/lib/landing-pages/a11y-styles";
import type { CanvasContextStack } from "../../src/lib/ai/canvas-context";

const abs = (u: unknown) => (typeof u === "string" && u.startsWith("/uploads/") ? "file://" + process.cwd() + "/public" + u : u);

async function main() {
  const pd = JSON.parse(fs.readFileSync("/tmp/puckdata-zwart-raw.json", "utf8"));
  for (const c of pd.content ?? []) {
    if (c.props?.heroVisualUrl) c.props.heroVisualUrl = abs(c.props.heroVisualUrl);
    for (const f of c.props?.features ?? []) if (f.imageUrl) f.imageUrl = abs(f.imageUrl);
  }
  const styleguide = await prisma.brandStyleguide.findFirst({
    where: { workspace: { name: { contains: "zwart", mode: "insensitive" } } },
    select: {
      primaryFontName: true, layoutStyle: true, layoutStyleInferred: true, archetype: true,
      buttonProfile: true, typographyProfile: true, spacingProfile: true, spacingScale: true,
      elevationProfile: true, radiusProfile: true, motionProfile: true, photographyStyle: true, visualLanguage: true,
      colors: { select: { hex: true, category: true, sortOrder: true, tags: true, contrastWhite: true, contrastBlack: true, confidence: true } },
      fonts: { select: { name: true, role: true, fontFamily: true, sortOrder: true, availability: true, fileUrl: true, fileType: true } },
      components: { select: { type: true, label: true, extractedStyles: true, confidence: true }, orderBy: [{ confidence: "desc" }, { sortOrder: "asc" }] },
      workspace: { select: { adobeFontsKitId: true } },
    },
  });
  const brandTokens = extractBrandTokensFromStyleguide(styleguide, { adobeFontsKitId: styleguide?.workspace?.adobeFontsKitId ?? null });
  const ctx = { brandTokens, personas: [], brand: { brandName: "Zwarthout" }, deliverableTypeId: "landing-page" } as unknown as CanvasContextStack;
  const config = buildSpikePuckConfig(ctx);
  const body = renderToStaticMarkup(React.createElement(Render, { config, data: pd } as never));
  const puckCss = fs.readFileSync("node_modules/@puckeditor/core/dist/Render-3OV4N4MT.css", "utf8");
  const html = `<!doctype html><html lang="nl"><head><meta charset="utf-8"/>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Sen:wght@400;500;600;700;800&family=Roboto:wght@300;400;500;700&display=swap"/>
<style>${puckCss}</style><style>${buildA11yStyleBlock(brandTokens.brand)}</style>
<style>*{box-sizing:border-box}html,body{margin:0;padding:0}img{max-width:100%}</style>
</head><body>${body}</body></html>`;
  fs.writeFileSync("/tmp/lp-puckdata.html", html);
  console.log("WROTE /tmp/lp-puckdata.html");
  await prisma.$disconnect();
}
main().catch((e) => { console.error("ERR:", e); process.exit(1); });
