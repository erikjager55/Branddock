/**
 * Smoke-test voor W4 — microsite volwaardig (plan §4):
 *
 *  - AnchorNav: eerste sectie, genummerd, max 5 ankers, CTA → #join-slug;
 *    ook de FAQ-jump-nav is nu een AnchorNav (sticky/scroll-spy).
 *  - HighlightCards: TL;DR-jump-cards na de hero (hoofdstukken + join),
 *    alleen bij ≥2 hoofdstukken; deadline als join-card-beschrijving.
 *  - StoryChapter: per hoofdstuk één sectie met anchorId, heading, intro
 *    en blocks (heading/body/imageUrl) — geen markdown-RichText meer.
 *  - Beeld-vulling: heroManifest → eerste brandImage; volgende brandImages
 *    vullen block-slots (max 2 per hoofdstuk); een blok-eigen imageUrl
 *    blijft staan; fixture wordt niet gemuteerd.
 *  - Schema: blocks[].imageUrl additief (geldige URL parset, rommel rejected;
 *    W1-era variants zonder imageUrl blijven geldig).
 *  - Prompt: microsite-systemprompt bevat de campagne-blueprint-mapping.
 *  - Registratie: AnchorNav/StoryChapter/HighlightCards in de Puck-config.
 *
 * Run: npx tsx scripts/smoke-tests/page-types-w4.ts
 */

import { micrositeVariantSchema, type MicrositeVariantContent } from "../../src/lib/landing-pages/page-type-schemas";
import { buildLandingPageVariantPrompt } from "../../src/lib/landing-pages/variant-generator";
import { buildMicrositeTemplateFromStructured } from "../../src/features/campaigns/components/canvas/medium/puck-templates/microsite-from-structured";
import { buildFaqPageTemplateFromStructured } from "../../src/features/campaigns/components/canvas/medium/puck-templates/faq-page-from-structured";
import { buildSpikePuckConfig } from "../../src/features/campaigns/components/canvas/medium/puck-config";
import type { FaqPageVariantContent } from "../../src/lib/landing-pages/page-type-schemas";
import type { CanvasContextStack } from "../../src/lib/ai/canvas-context";

let pass = 0;
let fail = 0;
function assert(name: string, cond: boolean, detail?: string): void {
  if (cond) { console.log(`  PASS ${name}`); pass++; }
  else { console.error(`  FAIL ${name}${detail ? ` -- ${detail}` : ""}`); fail++; }
}
function group(name: string): void { console.log(`\n${name}`); }

type Section = { type: string; props: Record<string, unknown> };
const sectionTypes = (data: { content: unknown }): string[] =>
  (data.content as Section[]).map((s) => s.type);
const sectionsOf = (data: { content: unknown }, type: string): Section[] =>
  (data.content as Section[]).filter((s) => s.type === type);

// ─── Fixtures ──────────────────────────────────────────

const micrositeFixture: MicrositeVariantContent = {
  heroManifest: {
    navLabel: "Start",
    headline: "Toegang is het nieuwe bezit",
    subline: "Een campagne over delen in plaats van kopen.",
    primaryCta: "Doe mee",
  },
  story: {
    navLabel: "Verhaal",
    heading: "Ons verhaal",
    intro: "Waarom we deze campagne zijn gestart.",
    blocks: [
      { body: "Het begon met een simpele vraag over bezit en gebruik." },
      { heading: "De kanteling", body: "Toegang blijkt waardevoller dan bezit." },
      { body: "Blok drie met eigen beeld.", imageUrl: "https://example.com/own-block.jpg" },
    ],
    stat: { value: "410+", context: "huishoudens delen al" },
  },
  impact: {
    navLabel: "Impact",
    heading: "Wat het oplevert",
    blocks: [
      { body: "Minder spullen, meer gebruik." },
      { body: "Lagere kosten per huishouden." },
    ],
  },
  community: null,
  join: {
    navLabel: "Meedoen",
    heading: "Doe mee vóór 1 juli",
    body: "Meld je huishouden aan en deel mee.",
    primaryCta: "Meld je aan",
    deadline: "Aanmelden kan tot 1 juli",
  },
};

const brandImagesCtx = {
  brand: { brandName: "Deelmerk" },
  personas: [],
  brandImages: [
    { url: "https://example.com/brand-hero.jpg" },
    { url: "https://example.com/brand-b1.jpg" },
    { url: "https://example.com/brand-b2.jpg" },
    { url: "https://example.com/brand-b3.jpg" },
  ],
} as unknown as CanvasContextStack;

const qa = (n: number) => ({ question: `Vraag ${n}?`, answer: `Antwoord ${n}.` });
const faqFixture: FaqPageVariantContent = {
  hero: { headline: "We helpen je graag", subline: "Antwoorden op veelgestelde vragen." },
  popularQuestions: [qa(1), qa(2), qa(3)],
  categories: [
    { label: "Bestellen", items: [qa(4), qa(5), qa(6)] },
    { label: "Retour", items: [qa(7), qa(8), qa(9)] },
  ],
  contactEscape: { heading: "Staat je vraag er niet bij?", body: "Binnen 24 uur antwoord.", ctaLabel: "Contact" },
  closingCta: { heading: "Klaar?", ctaLabel: "Start" },
};

// ─── A. Schema: blocks[].imageUrl additief ─────────────

group("A. micrositeVariantSchema blocks[].imageUrl");
assert("fixture met block-imageUrl parset", micrositeVariantSchema.safeParse(micrositeFixture).success);
assert(
  "W1-era variant zonder imageUrl blijft geldig",
  micrositeVariantSchema.safeParse({
    ...micrositeFixture,
    story: { ...micrositeFixture.story, blocks: micrositeFixture.story.blocks.map(({ heading, body }) => ({ heading, body })) },
  }).success,
);
assert(
  "rommel-imageUrl rejected",
  !micrositeVariantSchema.safeParse({
    ...micrositeFixture,
    story: { ...micrositeFixture.story, blocks: [{ body: "x", imageUrl: "geen-url" }, { body: "y" }] },
  }).success,
);

// ─── B. Microsite-tree: AnchorNav + HighlightCards + StoryChapter ──

group("B. buildMicrositeTemplateFromStructured (W4-skelet)");
const tree = buildMicrositeTemplateFromStructured(micrositeFixture, null);
const types = sectionTypes(tree);
assert("AnchorNav eerst, HighlightCards na hero", types[0] === "AnchorNav" && types[1] === "BrandHero" && types[2] === "HighlightCards", types.join(","));
const nav = sectionsOf(tree, "AnchorNav")[0];
assert("nav genummerd + ≤5 links + CTA → #meedoen", nav.props.numbered === true && (nav.props.links as unknown[]).length <= 5 && nav.props.ctaHref === "#meedoen");
const highlights = sectionsOf(tree, "HighlightCards")[0];
const cards = highlights.props.items as Array<{ title: string; description: string; href: string }>;
assert("highlight-cards = hoofdstukken + join", cards.length === 3 && cards[0].href === "#verhaal" && cards[1].href === "#impact" && cards[2].href === "#meedoen", JSON.stringify(cards.map((c) => c.href)));
assert("join-card draagt de deadline (urgentie)", cards[2].description === "Aanmelden kan tot 1 juli");
assert("hoofdstuk-card beschrijving uit intro", cards[0].description === "Waarom we deze campagne zijn gestart.");
const chapters = sectionsOf(tree, "StoryChapter");
assert("StoryChapter per hoofdstuk met anker", chapters.length === 2 && chapters[0].props.anchorId === "verhaal" && chapters[1].props.anchorId === "impact");
const storyBlocks = chapters[0].props.blocks as Array<{ body: string; imageUrl: string }>;
assert("blok-eigen imageUrl blijft staan (geen ctx)", storyBlocks[2].imageUrl === "https://example.com/own-block.jpg");

// HighlightCards weggelaten bij 1 hoofdstuk (pagina kort genoeg)
const singleChapter = buildMicrositeTemplateFromStructured(
  { ...micrositeFixture, impact: null },
  null,
);
assert("1 hoofdstuk → geen HighlightCards", !sectionTypes(singleChapter).includes("HighlightCards"));

// ─── C. Beeld-vulling (hero + block-slots) ─────────────

group("C. brand-image fill in hero + block-slots");
const imgTree = buildMicrositeTemplateFromStructured(micrositeFixture, brandImagesCtx);
assert("hero krijgt eerste brandImage", sectionsOf(imgTree, "BrandHero")[0].props.heroVisualUrl === "https://example.com/brand-hero.jpg");
const imgChapters = sectionsOf(imgTree, "StoryChapter");
const imgStoryBlocks = imgChapters[0].props.blocks as Array<{ body: string; imageUrl: string }>;
assert(
  "story-blokken 1+2 gevuld uit pool (max 2/hoofdstuk), eigen beeld blijft",
  imgStoryBlocks[0].imageUrl === "https://example.com/brand-b1.jpg"
    && imgStoryBlocks[1].imageUrl === "https://example.com/brand-b2.jpg"
    && imgStoryBlocks[2].imageUrl === "https://example.com/own-block.jpg",
  JSON.stringify(imgStoryBlocks.map((b) => b.imageUrl)),
);
const imgImpactBlocks = imgChapters[1].props.blocks as Array<{ imageUrl: string }>;
assert(
  "impact-blok 1 krijgt het volgende pool-beeld; pool raakt op",
  imgImpactBlocks[0].imageUrl === "https://example.com/brand-b3.jpg" && imgImpactBlocks[1].imageUrl === "",
  JSON.stringify(imgImpactBlocks.map((b) => b.imageUrl)),
);
assert(
  "fixture niet gemuteerd door de fill",
  !micrositeFixture.story.blocks[0].imageUrl && !micrositeFixture.heroManifest.heroVisualUrl,
);

// ─── D. FAQ-jump-nav = AnchorNav ───────────────────────

group("D. FAQ-builder gebruikt AnchorNav");
const faqTree = buildFaqPageTemplateFromStructured(faqFixture, null);
assert("FAQ-tree start met AnchorNav (≥2 categorieën)", sectionTypes(faqTree)[0] === "AnchorNav");
const faqNav = sectionsOf(faqTree, "AnchorNav")[0];
assert("FAQ-nav niet genummerd (geen story-arc)", faqNav.props.numbered === undefined);

// ─── E. Prompt: blueprint-mapping ──────────────────────

group("E. microsite-prompt blueprint-mapping");
const prompt = buildLandingPageVariantPrompt({
  contentType: "microsite",
  brand: { brandName: "Deelmerk" },
  userPrompt: "Campagne-microsite over deeleconomie.",
  locale: "nl-NL",
});
assert("system-prompt bevat blueprint-mapping-regel", prompt.system.includes("Campagne-blueprint-mapping"));
assert("mapping noemt heroManifest en join", prompt.system.includes("kernconcept/these → heroManifest") && prompt.system.includes("aanbod + einddatum → join"));
// No-priming-contract: net als de LP-golden-set checken we de OFF-prompt
// (de HVD-laag zelf benoemt em-dashes legitiem bij naam).
const offPrompt = buildLandingPageVariantPrompt({
  contentType: "microsite",
  brand: { brandName: "Deelmerk" },
  userPrompt: "Campagne-microsite over deeleconomie.",
  locale: "nl-NL",
  humanVoiceMode: "OFF",
});
assert("OFF-prompt bevat NUL em-dashes (no-priming)", !offPrompt.system.includes("—"));

// ─── F. Puck-config registratie ────────────────────────

group("F. component-registratie");
const config = buildSpikePuckConfig(null);
assert(
  "AnchorNav + StoryChapter + HighlightCards geregistreerd",
  !!config.components.AnchorNav && !!config.components.StoryChapter && !!config.components.HighlightCards,
);

// ─── Samenvatting ──────────────────────────────────────

console.log(`\n${"=".repeat(50)}`);
console.log(`TOTAAL: ${pass} PASS / ${fail} FAIL`);
process.exit(fail > 0 ? 1 : 0);
