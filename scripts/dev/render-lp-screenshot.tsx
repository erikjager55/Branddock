/**
 * Dev-tool — rendert een LP-"Medium"-pagina naar statische HTML met de ECHTE
 * styleguide-tokens van een workspace, voor visuele verificatie van de
 * web-page-builder renderer (zonder dev-server/auth).
 *
 * Rendert via `renderToStaticMarkup(<Render config data/>)` en schrijft
 * /tmp/lp-<slug>.html. Screenshot daarna met scripts/dev/shot-lp.mjs.
 *
 * De styleguide-tokens (kleuren/fonts/card-styles/spacing) zijn faithful; de
 * variant-copy + placeholder-beelden zijn representatief (charred-wood demo).
 *
 * Run: DATABASE_URL=... npx tsx scripts/dev/render-lp-screenshot.tsx [workspaceNameContains]
 *   default workspaceNameContains = "zwart"
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
import type { LandingPageVariantContent } from "../../src/lib/landing-pages/variant-schema";
import type { CanvasContextStack } from "../../src/lib/ai/canvas-context";

// `'`, `(`, `)` overleven encodeURIComponent en breken een ongequote CSS url();
// de renderer bouwt `url(${heroVisualUrl})` ongequote → escape ze expliciet.
const dataUri = (svg: string) =>
  `data:image/svg+xml;utf8,${encodeURIComponent(svg).replace(/'/g, "%27").replace(/\(/g, "%28").replace(/\)/g, "%29")}`;
const heroSvg = `<svg xmlns='http://www.w3.org/2000/svg' width='1600' height='900'>
  <defs><linearGradient id='g' x1='0' y1='0' x2='0' y2='1'>
    <stop offset='0' stop-color='#15171a'/><stop offset='1' stop-color='#26292e'/>
  </linearGradient></defs>
  <rect width='1600' height='900' fill='url(#g)'/>
  ${Array.from({ length: 16 }, (_, i) => `<rect x='${i * 100}' y='0' width='2' height='900' fill='#0c0d0f' opacity='0.6'/>`).join("")}
  ${Array.from({ length: 60 }, (_, i) => `<rect x='${(i * 53) % 1600}' y='${(i * 137) % 900}' width='${30 + (i % 5) * 14}' height='1' fill='#000' opacity='0.25'/>`).join("")}
</svg>`;
const featSvg = (label: string) => dataUri(
  `<svg xmlns='http://www.w3.org/2000/svg' width='600' height='450'><rect width='600' height='450' fill='#1b1d20'/>${Array.from({ length: 8 }, (_, i) => `<rect x='${i * 75}' width='2' height='450' fill='#0c0d0f' opacity='0.5'/>`).join("")}<text x='300' y='235' fill='#5a5e63' font-family='sans-serif' font-size='20' text-anchor='middle'>${label}</text></svg>`,
);

const variant: LandingPageVariantContent = {
  hero: {
    eyebrow: "SHOU SUGI BAN GEVELBEKLEDING",
    headline: "Verkoold gevelhout dat een leven lang zwart blijft",
    subhead: "Door vuur behandeld: onderhoudsvrij, weerbestendig en brandvertragend. Geleverd voor architecten en eigenaren in heel Europa.",
    primaryCta: "Vraag houtstalen aan",
    heroVisualUrl: dataUri(heroSvg),
  },
  trust: { type: "logos", items: [{ label: "FSC & Cradle-to-Cradle" }, { label: "Brandklasse B-s1,d0" }, { label: "50 jaar garantie" }] },
  problem: {
    heading: "Standaard gevelhout vraagt onderhoud — en vergrijst ongelijk",
    painBullets: ["Om de 3-5 jaar schilderen of oliën", "Onregelmatige vergrijzing en houtrot", "Voldoet vaak niet aan brandeisen voor hoogbouw"],
    bridgingSentence: "Verkoold hout lost dit in één keer op — het vuur sluit het oppervlak permanent.",
  },
  features: {
    sectionHeading: "Waarom verkoold hout",
    items: [
      { icon: "flame", heading: "Onderhoudsvrij", body: "Het vuur sluit de vezel; geen schilderen, geen rot, decennialang.", imageUrl: featSvg("char-textuur macro") },
      { icon: "shield", heading: "Brandvertragend", body: "Brandklasse B-s1,d0 — geschikt voor hoogbouw-eisen.", imageUrl: featSvg("gevel in context") },
      { icon: "leaf", heading: "Circulair", body: "FSC-gecertificeerd hout, Cradle-to-Cradle geproduceerd.", imageUrl: featSvg("detail nerf") },
    ],
  },
  socialProof: {
    testimonials: [{ quote: "De gevel is na zes jaar nog gitzwart, zonder één onderhoudsbeurt. Precies wat we onze opdrachtgever beloofden.", authorName: "Bram de Vries", authorRole: "Architect", authorCompany: "ORGA Architect", outcome: "0 onderhoud in 6 jaar" }],
    impactStats: [{ value: "200+", label: "projecten geleverd" }, { value: "50 jr", label: "garantie" }, { value: "0", label: "onderhoud" }],
  },
  faq: {
    items: [
      { question: "Wat is de levertijd?", answer: "Op maat geproduceerd; reken op 3-5 weken. Plan tijdig in voor grote projecten." },
      { question: "Welke brandklasse haalt het hout?", answer: "B-s1,d0 — geschikt voor de meeste hoogbouw-eisen." },
      { question: "Hoe wordt het gemonteerd?", answer: "Met blinde bevestiging op regelwerk; wij leveren een montagehandleiding." },
      { question: "Wat kost het per m²?", answer: "Afhankelijk van houtsoort en afwerking — vraag een offerte op maat aan." },
      { question: "Is het echt circulair?", answer: "Ja: FSC-hout, Cradle-to-Cradle, geen chemische behandeling." },
    ],
  },
  finalCta: { heading: "Klaar voor een gevel die een leven lang zwart blijft?", riskReducer: "Gratis houtstalen + advies binnen 2 werkdagen — vrijblijvend.", primaryCta: "Vraag houtstalen aan" },
};

async function main() {
  const nameContains = process.argv[2] ?? "zwart";
  const styleguide = await prisma.brandStyleguide.findFirst({
    where: { workspace: { name: { contains: nameContains, mode: "insensitive" } } },
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
  if (!styleguide) throw new Error(`Styleguide niet gevonden voor workspace ~ "${nameContains}"`);

  const brandTokens = extractBrandTokensFromStyleguide(styleguide, { adobeFontsKitId: styleguide.workspace?.adobeFontsKitId ?? null });
  console.log("TOKENS:", JSON.stringify({
    headingFont: brandTokens.headingFont, bodyFont: brandTokens.bodyFont, brand: brandTokens.brand,
    surface: brandTokens.surface, onSurface: brandTokens.onSurface, accent: brandTokens.accent,
    archetype: brandTokens.archetype, layoutStyle: brandTokens.layoutStyle,
    hasDarkSections: brandTokens.hasDarkSections, darkSectionBg: brandTokens.darkSectionBg, heroBgColor: brandTokens.heroBgColor,
  }, null, 2));

  const ctx = { brandTokens, personas: [], brand: { brandName: "Zwarthout" }, deliverableTypeId: "landing-page" } as unknown as CanvasContextStack;
  const config = buildSpikePuckConfig(ctx);
  const tree = buildLandingPageTemplateFromStructured(variant, ctx);
  const body = renderToStaticMarkup(React.createElement(Render, { config, data: tree } as never));

  const puckCss = fs.readFileSync("node_modules/@puckeditor/core/dist/Render-3OV4N4MT.css", "utf8");
  const html = `<!doctype html><html lang="nl"><head><meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<link rel="preconnect" href="https://fonts.googleapis.com"/><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin/>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Sen:wght@400;500;600;700;800&family=Roboto:wght@300;400;500;700&display=swap"/>
<style>${puckCss}</style><style>${buildA11yStyleBlock(brandTokens.brand)}</style>
<style>*{box-sizing:border-box}html,body{margin:0;padding:0}img{max-width:100%}</style>
</head><body>${body}</body></html>`;
  const out = `/tmp/lp-${nameContains}.html`;
  fs.writeFileSync(out, html);
  console.log("WROTE", out, "(", html.length, "bytes )");
  await prisma.$disconnect();
}
main().catch((e) => { console.error("RENDER FAIL:", e); process.exit(1); });
