/**
 * W2/W3 (plan §2.4 + §3.3) — JSON-LD voor de publieke /p/[slug]-render.
 *
 * - product-page → Product (of Service bij dienst-flavor; Product rich results
 *   zijn voor diensten niet toegestaan). `offers` alleen bij een parsebare prijs.
 * - faq-page → FAQPage (mainEntity = alle Q&A's). Verkocht als AEO-feature
 *   (Bing/Perplexity/AI Overviews-citatie), niet als Google-rich-result.
 *
 * Pure functies — geen DB/React. De page injecteert de output als
 * <script type="application/ld+json">. Shape-dispatch (zelfde discriminatoren
 * als de builders) zodat legacy LP-shaped variants geen onjuiste JSON-LD krijgen.
 */

import type {
  PageVariantContent,
  FaqPageVariantContent,
  ProductPageVariantContent,
  LongFormGeoVariantContent,
} from "./page-type-schemas";
import { derivePageFlavor, type PageFlavor } from "./variant-generator";
import type { AuthorProfile } from "./author-profile";

export interface JsonLdContext {
  brandName?: string | null;
  /** Absolute http(s)-URL van een productbeeld (relatieve paden worden genegeerd). */
  imageUrl?: string | null;
  /** pageFlavor uit het gekoppelde product (category+pricingModel); bepaalt Product vs Service. */
  flavor?: PageFlavor | null;
  /** GEO Fase 2 — ISO-datums uit LandingPage.publishedAt/updatedAt voor BlogPosting freshness. */
  datePublished?: string | null;
  dateModified?: string | null;
  /** BCP-47 / ISO 639-1 taalcode (Workspace.contentLanguage) voor inLanguage. */
  inLanguage?: string | null;
  /**
   * GEO Fase 3 — E-E-A-T author-profiel (Person + sameAs). Alleen geëmit bij een
   * verifieerbare identiteit; resolve via `resolveAuthorProfile` vóór doorgeven.
   */
  author?: AuthorProfile | null;
}

/** FAQPage — alle popular + categorie-Q&A's als Question/Answer-paren. Met
 *  Organization-publisher (E-E-A-T-signaal voor AI-engines) wanneer een merknaam
 *  bekend is; FAQPage is een CreativeWork-subtype dus `publisher` is valide. */
export function buildFaqPageJsonLd(
  variant: FaqPageVariantContent,
  ctx: JsonLdContext = {},
): Record<string, unknown> {
  const all = [
    ...variant.popularQuestions,
    ...variant.categories.flatMap((c) => c.items),
  ];
  const out: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: all.map((qa) => ({
      "@type": "Question",
      name: qa.question,
      acceptedAnswer: { "@type": "Answer", text: qa.answer },
    })),
  };
  if (ctx.brandName) {
    out.publisher = { "@type": "Organization", name: ctx.brandName };
  }
  return out;
}

/** Parse een EUR-prijs uit losse tekst (pricing.body). Conservatief: alleen een
 *  expliciet €/EUR-bedrag telt; geen bedrag → geen offers (plan §2.4). */
function parseEuroPrice(text: string | null | undefined): string | null {
  if (!text) return null;
  const m = text.match(/(?:€|EUR)\s?(\d[\d.]*(?:,\d{1,2})?)/i);
  if (!m) return null;
  // Normaliseer "1.299,50" → "1299.50" (schema.org price = punt-decimaal, geen scheiders).
  const normalized = m[1].replace(/\./g, "").replace(",", ".");
  return /^\d+(\.\d+)?$/.test(normalized) ? normalized : null;
}

/** Product- of Service-JSON-LD afhankelijk van flavor. offers alleen bij prijs. */
export function buildProductPageJsonLd(
  variant: ProductPageVariantContent,
  ctx: JsonLdContext,
): Record<string, unknown> {
  const isService = ctx.flavor === "service";
  const out: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": isService ? "Service" : "Product",
    name: variant.hero.headline,
    description: variant.hero.subline,
  };
  if (ctx.brandName) {
    // Product gebruikt `brand`, Service gebruikt `provider` (Organization).
    out[isService ? "provider" : "brand"] = { "@type": isService ? "Organization" : "Brand", name: ctx.brandName };
  }
  if (ctx.imageUrl && /^https?:\/\//i.test(ctx.imageUrl)) {
    out.image = ctx.imageUrl;
  }
  // offers/price alleen bij een parsebare prijs uit de pricing-sectie. Service
  // krijgt geen offers (diensten hebben zelden een vaste catalog-prijs).
  const price = !isService ? parseEuroPrice(variant.pricing?.body ?? null) : null;
  if (price) {
    out.offers = {
      "@type": "Offer",
      price,
      priceCurrency: "EUR",
      availability: "https://schema.org/InStock",
    };
  }
  return out;
}

/**
 * Long-form GEO-article → `@graph` met BlogPosting + (bij Q&A) een geneste FAQPage
 * + (bij definities) een DefinedTermSet. Dé GEO-payoff: structured data zodat
 * AI-answer-engines het artikel én de Q&A's kunnen citeren.
 *
 * Fase 3 entity-laag: author (Person + sameAs, alléén bij verifieerbare identiteit),
 * ImageObject i.p.v. een kale URL, inLanguage, keywords/about/mentions afgeleid uit
 * de definities (entity-clarity). De geneste Q&A blijft een FAQPage — QAPage is
 * semantisch voor user-generated forum-Q&A, niet voor redactionele FAQ, en zou
 * door validators worden afgekeurd; daarom bewust niet geëmit.
 */
export function buildBlogPostingJsonLd(
  variant: LongFormGeoVariantContent,
  ctx: JsonLdContext = {},
): Record<string, unknown> {
  const articleBody = variant.sections.map((s) => `${s.heading}\n${s.body}`).join("\n\n");
  const blogPosting: Record<string, unknown> = {
    "@type": "BlogPosting",
    headline: variant.hero.headline,
    description: variant.hero.subline,
    abstract: variant.tldr.join(" "),
    articleBody,
  };
  if (ctx.brandName) blogPosting.publisher = { "@type": "Organization", name: ctx.brandName };
  if (ctx.inLanguage) blogPosting.inLanguage = ctx.inLanguage;
  if (ctx.datePublished) blogPosting.datePublished = ctx.datePublished;
  if (ctx.dateModified) blogPosting.dateModified = ctx.dateModified;
  // ImageObject (rijker dan een kale URL — voorkeur van Google/AI voor articles).
  if (ctx.imageUrl && /^https?:\/\//i.test(ctx.imageUrl)) {
    blogPosting.image = { "@type": "ImageObject", url: ctx.imageUrl };
  }
  // Author = E-E-A-T-signaal; alleen bij een verifieerbare identiteit (naam aanwezig).
  if (ctx.author?.name) {
    const author: Record<string, unknown> = { "@type": "Person", name: ctx.author.name };
    if (ctx.author.jobTitle) author.jobTitle = ctx.author.jobTitle;
    if (ctx.author.sameAs && ctx.author.sameAs.length > 0) author.sameAs = ctx.author.sameAs;
    blogPosting.author = author;
  }
  // Entity-laag uit definities: keywords (platte termen), about (primaire entiteit)
  // + mentions (alle gedefinieerde entiteiten als Thing). Versterkt entity-clarity.
  const defs = variant.definitions ?? [];
  if (defs.length > 0) {
    blogPosting.keywords = defs.map((d) => d.term);
    blogPosting.about = { "@type": "Thing", name: defs[0].term, description: defs[0].definition };
    blogPosting.mentions = defs.map((d) => ({ "@type": "Thing", name: d.term, description: d.definition }));
  }

  const graph: Record<string, unknown>[] = [blogPosting];
  if (variant.qa.length > 0) {
    graph.push({
      "@type": "FAQPage",
      mainEntity: variant.qa.map((qa) => ({
        "@type": "Question",
        name: qa.question,
        acceptedAnswer: { "@type": "Answer", text: qa.answer },
      })),
    });
  }
  if (defs.length > 0) {
    graph.push({
      "@type": "DefinedTermSet",
      hasDefinedTerm: defs.map((d) => ({
        "@type": "DefinedTerm",
        name: d.term,
        description: d.definition,
      })),
    });
  }
  return { "@context": "https://schema.org", "@graph": graph };
}

/**
 * Shape-dispatch: bouwt de juiste JSON-LD voor een gevalideerde page-variant.
 * faq → FAQPage, product → Product/Service, geoArticle → BlogPosting(+FAQPage/
 * DefinedTermSet). Returnt null voor LP/microsite/comparison (geen rich-type) of
 * een ontbrekende variant — de page injecteert dan niets.
 */
export function buildPageJsonLd(
  variant: PageVariantContent | null | undefined,
  ctx: JsonLdContext,
): Record<string, unknown> | null {
  if (!variant) return null;
  if ("popularQuestions" in variant) return buildFaqPageJsonLd(variant, ctx);
  if ("solution" in variant) return buildProductPageJsonLd(variant, ctx);
  if ("geoArticle" in variant) return buildBlogPostingJsonLd(variant, ctx);
  return null;
}

/** Helper: leidt de flavor af uit een product-record voor de JSON-LD-context. */
export function flavorFromProduct(
  product: { category: string | null; pricingModel: string | null } | null | undefined,
): PageFlavor | null {
  if (!product) return null;
  return derivePageFlavor(product);
}
