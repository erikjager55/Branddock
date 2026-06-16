/**
 * Smoke-test voor W2 (product-page volwaardig + Product-koppeling) en
 * W3-restpunten (FAQ-categorie-ankernavigatie + JSON-LD). Plan
 * docs/specs/website-page-types-implementatieplan.md §2-§3.
 *
 * Verifies:
 *  - Product-prompt: het ProductContext-blok in de user-prompt (naam,
 *    feature→benefit-paren, use-cases, pageFlavor-hint, anti-hallucinatie);
 *    geen product → geen blok; LP/faq/microsite negeren product.
 *  - derivePageFlavor: saas/physical/service-classificatie.
 *  - assignProductImagesToVariant: HERO→hero, FEATURE/DETAIL→features op
 *    sortOrder, immutability, no-op bij lege/legacy input.
 *  - Product-builder: ProductImages vullen hero/feature-slots; specs → native
 *    SpecTable (geen RichText-bullets); SpecTable doet band-ritmiek mee.
 *  - FAQ-builder: ≥2 categorieën → AnchorNav-jump-nav met categorie-ankers die
 *    matchen met de anchorId op de categorie-FAQ-secties; 1 categorie → geen nav.
 *  - JSON-LD: Product (offers alleen bij prijs), Service bij dienst-flavor,
 *    FAQPage met alle Q&A's; LP/microsite → null.
 *
 * Run: npx tsx scripts/smoke-tests/page-types-w2-w3.ts
 */

import {
  buildLandingPageVariantPrompt,
  derivePageFlavor,
} from "../../src/lib/landing-pages/variant-generator";
import { assignProductImagesToVariant } from "../../src/lib/landing-pages/product-images";
import {
  buildPageJsonLd,
  buildFaqPageJsonLd,
  flavorFromProduct,
} from "../../src/lib/landing-pages/page-json-ld";
import { buildProductPageTemplateFromStructured } from "../../src/features/campaigns/components/canvas/medium/puck-templates/product-page-from-structured";
import { buildFaqPageTemplateFromStructured } from "../../src/features/campaigns/components/canvas/medium/puck-templates/faq-page-from-structured";
import type {
  ProductPageVariantContent,
  FaqPageVariantContent,
} from "../../src/lib/landing-pages/page-type-schemas";
import type { ProductContext, CanvasContextStack } from "../../src/lib/ai/canvas-context";

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

const qa = (n: number) => ({ question: `Vraag ${n}?`, answer: `Antwoord ${n}, volledig in de eerste zin.` });

const productCtx: ProductContext = {
  id: "prod-1",
  name: "Brand Voice Analyzer",
  description: "Meet voice-drift in marketingcopy",
  category: "SaaS Brand Tool",
  pricingModel: "subscription",
  pricingDetails: "Vanaf € 49 per maand",
  features: ["Voice-fidelity scoring", "Multi-channel audit", "Baseline-definitie"],
  benefits: ["weet of copy on-brand is vóór publicatie", "één merkbron voor alle kanalen", "minder review-rondes"],
  useCases: ["agencies met meerdere klanten", "in-house teams"],
  images: [
    { url: "https://example.com/hero.jpg", category: "HERO", altText: "hero", sortOrder: 0 },
    { url: "https://example.com/feat-a.jpg", category: "FEATURE", altText: "a", sortOrder: 1 },
    { url: "https://example.com/feat-b.jpg", category: "DETAIL", altText: "b", sortOrder: 2 },
  ],
};

const productVariant: ProductPageVariantContent = {
  hero: { headline: "Genereer sneller inkomsten", subline: "Zonder lange implementatie.", primaryCta: "Start vandaag" },
  problem: { heading: "Handwerk remt je af", body: "Teams verliezen uren." },
  solution: { heading: "Eén platform", body: "Automatiseer de keten." },
  features: [
    { heading: "Snel", body: "In 5 minuten live." },
    { heading: "Veilig", body: "GDPR-conform." },
    { heading: "Schaalbaar", body: "Groeit mee." },
  ],
  specs: [
    { label: "Hosting", value: "EU (Frankfurt)" },
    { label: "Integraties", value: "Slack, Zapier, API" },
  ],
  faq: [qa(1), qa(2), qa(3)],
  finalCta: { heading: "Klaar om te starten?", body: "Geen creditcard nodig.", primaryCta: "Start vandaag" },
};

const faqVariant: FaqPageVariantContent = {
  hero: { headline: "We helpen je graag", subline: "Antwoorden op de vaakst gestelde vragen." },
  popularQuestions: [qa(1), qa(2), qa(3)],
  categories: [
    { label: "Bestellen & betalen", items: [qa(4), qa(5), qa(6)] },
    { label: "Levering & retour", items: [qa(7), qa(8), qa(9)] },
  ],
  contactEscape: { heading: "Staat je vraag er niet bij?", body: "We antwoorden binnen 24 uur.", ctaLabel: "Contact" },
  closingCta: { heading: "Klaar om te starten?", ctaLabel: "Plan een demo" },
};

const baseParams = {
  brand: { brandName: "Branddock", industry: "martech" },
  userPrompt: "Product-page voor onze voice-analyzer. Doel: trials.",
  locale: "nl-NL",
};

// ─── A. Product-prompt ─────────────────────────────────

group("A. Productblok in de user-prompt");
const productPrompt = buildLandingPageVariantPrompt({ ...baseParams, contentType: "product-page", product: productCtx });
assert("user-prompt bevat productnaam", productPrompt.user.includes("Brand Voice Analyzer"));
assert("user-prompt bevat feature→benefit-paar", productPrompt.user.includes("Voice-fidelity scoring → weet of copy on-brand is"));
assert("user-prompt bevat use-cases", productPrompt.user.includes("agencies met meerdere klanten"));
assert("user-prompt bevat anti-hallucinatie-mandaat", productPrompt.user.includes("ANTI-HALLUCINATIE"));
assert("user-prompt bevat pageFlavor-hint (SaaS)", productPrompt.user.includes("SOFTWARE/SaaS"));
assert("system-prompt is het product-prompt", productPrompt.system.includes("product/service-pagina"));

const noProductPrompt = buildLandingPageVariantPrompt({ ...baseParams, contentType: "product-page" });
assert("geen product → geen GEKOPPELD PRODUCT-blok", !noProductPrompt.user.includes("GEKOPPELD PRODUCT"));

const lpWithProduct = buildLandingPageVariantPrompt({ ...baseParams, contentType: "landing-page", product: productCtx });
assert("LP negeert product (geen productblok)", !lpWithProduct.user.includes("GEKOPPELD PRODUCT"));

// ─── B. derivePageFlavor ───────────────────────────────

group("B. derivePageFlavor");
assert("saas: category SaaS Tool", derivePageFlavor({ category: "SaaS Tool", pricingModel: null }) === "saas");
assert("service: category Consultancy", derivePageFlavor({ category: "Consultancy dienst", pricingModel: null }) === "service");
assert("service: pricingModel custom/project wint via woord", derivePageFlavor({ category: "Marketing", pricingModel: "project-based" }) === "service");
assert("physical: pricingModel eenmalig", derivePageFlavor({ category: "Meubel", pricingModel: "eenmalig per stuk" }) === "physical");
assert("saas: subscription pricingModel", derivePageFlavor({ category: "Onbekend", pricingModel: "subscription" }) === "saas");
assert("default saas bij niets", derivePageFlavor({ category: null, pricingModel: null }) === "saas");

// ─── C. assignProductImagesToVariant ───────────────────

group("C. assignProductImagesToVariant");
const withImages = assignProductImagesToVariant(productVariant, productCtx.images);
assert("hero krijgt HERO-beeld", withImages.hero.heroVisualUrl === "https://example.com/hero.jpg");
assert("feature 0 krijgt eerste feature-beeld (sortOrder)", withImages.features[0].imageUrl === "https://example.com/feat-a.jpg");
assert("feature 1 krijgt tweede feature-beeld", withImages.features[1].imageUrl === "https://example.com/feat-b.jpg");
assert("feature 2 blijft leeg (geen beeld meer)", !withImages.features[2].imageUrl);
assert("input-variant niet gemuteerd", !productVariant.hero.heroVisualUrl && !productVariant.features[0].imageUrl);
assert("no-op bij lege images", assignProductImagesToVariant(productVariant, []) === productVariant);
assert("no-op bij null images", assignProductImagesToVariant(productVariant, null) === productVariant);
const onlyFeatureImgs = assignProductImagesToVariant(productVariant, [
  { url: "https://example.com/x.jpg", category: "LIFESTYLE", altText: null, sortOrder: 0 },
]);
assert("geen HERO-categorie → hero blijft leeg, feature gevuld", !onlyFeatureImgs.hero.heroVisualUrl && onlyFeatureImgs.features[0].imageUrl === "https://example.com/x.jpg");
assert("relatieve /uploads-URL telt mee (loadable)", assignProductImagesToVariant(productVariant, [
  { url: "/uploads/p.jpg", category: "HERO", altText: null, sortOrder: 0 },
]).hero.heroVisualUrl === "/uploads/p.jpg");
assert("data:-URL genegeerd (niet loadable)", assignProductImagesToVariant(productVariant, [
  { url: "data:image/png;base64,xxx", category: "HERO", altText: null, sortOrder: 0 },
]) === productVariant);

// ─── D. Product-builder met ProductImages + SpecTable ──

group("D. Product-builder beeld-prioriteit + SpecTable");
const productCtxStack = { products: [productCtx], brandImages: null, personas: [], brand: { brandName: "Branddock" } } as unknown as CanvasContextStack;
const productTree = buildProductPageTemplateFromStructured(productVariant, productCtxStack);
assert("hero-slot gevuld uit ProductImage", sectionsOf(productTree, "BrandHero")[0].props.heroVisualUrl === "https://example.com/hero.jpg");
assert("specs → SpecTable (geen RichText-bullets)", sectionTypes(productTree).includes("SpecTable"));
const specTable = sectionsOf(productTree, "SpecTable")[0];
assert("SpecTable bevat de spec-rijen", (specTable.props.items as Array<{ label: string }>).length === 2 && (specTable.props.items as Array<{ label: string }>)[0].label === "Hosting");
assert("SpecTable doet band-ritmiek mee (bandTone gezet)", specTable.props.bandTone === "base" || specTable.props.bandTone === "alt");
// 2 van de 3 features krijgen een ProductImage (HERO pakt slot 0) → partiële
// vulling → FeatureGrid (all-or-nothing-gate), niet FeatureSplit.
const productFeatures = sectionTypes(productTree);
assert("partiële beeld-vulling (2/3) → FeatureGrid, geen FeatureSplit", productFeatures.includes("FeatureGrid") && !productFeatures.includes("FeatureSplit"));
// Volledige vulling (eigen feature-imageUrls op alle 3) → FeatureSplit.
const fullyImaged: ProductPageVariantContent = {
  ...productVariant,
  features: productVariant.features.map((f, i) => ({ ...f, imageUrl: `https://example.com/own-${i}.jpg` })),
};
assert("alle features beeld → FeatureSplit", sectionTypes(buildProductPageTemplateFromStructured(fullyImaged, null)).includes("FeatureSplit"));

// product-images winnen van brand-images
const bothImagesStack = { products: [productCtx], brandImages: [{ url: "https://example.com/BRANDfallback.jpg" }], personas: [], brand: { brandName: "B" } } as unknown as CanvasContextStack;
const bothTree = buildProductPageTemplateFromStructured(productVariant, bothImagesStack);
assert("ProductImage wint van brand-image op hero", sectionsOf(bothTree, "BrandHero")[0].props.heroVisualUrl === "https://example.com/hero.jpg");

// ─── E. FAQ categorie-jump-nav ─────────────────────────

group("E. FAQ categorie-ankernavigatie");
const faqTree = buildFaqPageTemplateFromStructured(faqVariant, null);
const faqTypes = sectionTypes(faqTree);
// W4: jump-nav is de sticky AnchorNav (scroll-spy) geworden.
assert("≥2 categorieën → AnchorNav prepended", faqTypes[0] === "AnchorNav");
const faqNav = sectionsOf(faqTree, "AnchorNav")[0];
const faqNavLinks = faqNav.props.links as Array<{ label: string; href: string }>;
assert("nav linkt naar de 2 categorie-ankers", faqNavLinks.length === 2 && faqNavLinks[0].href === "#bestellen-betalen" && faqNavLinks[1].href === "#levering-retour");
const categoryFaqs = sectionsOf(faqTree, "FAQ").filter((s) => s.props.anchorId);
assert("categorie-FAQ-secties dragen de matchende anchorId", categoryFaqs.length === 2 && categoryFaqs[0].props.anchorId === "bestellen-betalen" && categoryFaqs[1].props.anchorId === "levering-retour");
// W3-fix: escape-hatch + closingCta samengevoegd tot één afsluitende CTA.
assert("precies één afsluitende BrandCTA (geen dubbel paneel)", sectionsOf(faqTree, "BrandCTA").length === 1);

const oneCatFaq = buildFaqPageTemplateFromStructured(
  { ...faqVariant, categories: [faqVariant.categories[0]] },
  null,
);
assert("1 categorie → GEEN AnchorNav (NN/g: alleen bij ≥2)", sectionTypes(oneCatFaq)[0] === "BrandHero");

// ─── F. JSON-LD ────────────────────────────────────────

group("F. JSON-LD (Product/Service/FAQPage)");
const productLd = buildPageJsonLd(productVariant, { brandName: "Branddock", imageUrl: "https://example.com/hero.jpg", flavor: "saas" });
assert("product → @type Product", productLd?.["@type"] === "Product");
assert("product → brand", (productLd?.brand as { name: string })?.name === "Branddock");
assert("product → image", productLd?.image === "https://example.com/hero.jpg");
assert("product zonder pricing → geen offers", productLd?.offers === undefined);

const productWithPriceLd = buildPageJsonLd(
  { ...productVariant, pricing: { heading: "Prijs", body: "Vanaf € 1.299,50 per jaar." } },
  { brandName: "Branddock", imageUrl: null, flavor: "saas" },
);
assert("product mét prijs → offers met genormaliseerde price", (productWithPriceLd?.offers as { price: string })?.price === "1299.50");
assert("offers priceCurrency EUR", (productWithPriceLd?.offers as { priceCurrency: string })?.priceCurrency === "EUR");

const serviceLd = buildPageJsonLd(productVariant, { brandName: "Branddock", imageUrl: null, flavor: "service" });
assert("dienst-flavor → @type Service", serviceLd?.["@type"] === "Service");
assert("service → provider (Organization)", (serviceLd?.provider as { name: string })?.name === "Branddock");
assert("service → geen offers", serviceLd?.offers === undefined);

const faqLd = buildFaqPageJsonLd(faqVariant);
assert("faq → @type FAQPage", faqLd["@type"] === "FAQPage");
assert("faq mainEntity = alle Q&A's (3 popular + 6 categorie)", (faqLd.mainEntity as unknown[]).length === 9);
assert("faq Question/Answer-shape", (faqLd.mainEntity as Array<{ "@type": string; acceptedAnswer: { "@type": string } }>)[0]["@type"] === "Question" && (faqLd.mainEntity as Array<{ acceptedAnswer: { "@type": string } }>)[0].acceptedAnswer["@type"] === "Answer");
assert("buildPageJsonLd dispatcht faq correct", buildPageJsonLd(faqVariant, {})?.["@type"] === "FAQPage");
assert("flavorFromProduct null bij geen product", flavorFromProduct(null) === null);
assert("flavorFromProduct leidt service af", flavorFromProduct({ category: "Consultancy", pricingModel: null }) === "service");

// ─── Samenvatting ──────────────────────────────────────

console.log(`\n${"=".repeat(50)}`);
console.log(`TOTAAL: ${pass} PASS / ${fail} FAIL`);
process.exit(fail > 0 ? 1 : 0);
