/**
 * Per-type variant-schemas voor de Puck web-page-types (W1, plan
 * docs/specs/website-page-types-implementatieplan.md §1 Optie A).
 *
 * Tot W1 liepen alle 5 PUCK_WEBPAGE_TYPES door landingPageVariantSchema —
 * een faq-page of microsite werd een landingspagina in vermomming. Deze
 * schemas geven faq-page (§3), product-page (§2.1) en microsite (§4) hun
 * eigen structurele contract; landing-page en comparison-page blijven op
 * het bestaande LP-schema (comparison is bewust buiten W1-scope).
 *
 * Conventies gespiegeld aan variant-schema.ts: imageBrief-hergebruik met
 * `.catch(null)`-degradatie, `heading`/`body`-veldnamen (feature-image-
 * pipeline-compatibel), heroVisualUrl-slot voor de hero-gen-flow, en de
 * single-CTA-discipline via superRefine waar een finalCta bestaat.
 */

import { z } from "zod";
import {
  imageBriefSchema,
  landingPageVariantSchema,
  type LandingPageVariantContent,
} from "./variant-schema";
import { LONG_FORM_SEO_TYPES } from "@/lib/ai/seo-pipeline.types";

// ─── Gedeelde bouwstenen ─────────────────────────────────────

/** Vraag in klanttaal (front-loaded keyword scant beter); antwoord-eerst:
 *  zin 1 beantwoordt de vraag volledig (40-60 woorden kern, AEO-citeerbaar). */
const qaItemSchema = z.object({
  question: z
    .string()
    .min(1, "question mag niet leeg zijn")
    .max(120, "question max 120 tekens — volledige vraagzin in klanttaal"),
  answer: z.string().min(1, "answer mag niet leeg zijn"),
});

export type QaItem = z.infer<typeof qaItemSchema>;

// ─── FAQ-page (plan §3) ──────────────────────────────────────

const faqHeroSchema = z.object({
  /** Conversationele titel in merkstem ("We helpen je graag"), geen droog "FAQ". */
  headline: z.string().min(1, "hero.headline mag niet leeg zijn").max(60, "hero.headline max 60 tekens"),
  subline: z.string().min(1, "hero.subline mag niet leeg zijn"),
});

const faqCategorySchema = z.object({
  /** Taak-gebaseerd label ("Bestellen & betalen"), nooit "Algemeen" als eerste. */
  label: z.string().min(1, "categories[].label mag niet leeg zijn").max(40, "categories[].label max 40 tekens"),
  items: z
    .array(qaItemSchema)
    .min(3, "categories[].items min 3 per categorie")
    .max(5, "categories[].items max 5 per categorie"),
});

export const faqPageVariantSchema = z.object({
  hero: faqHeroSchema,
  /** 3-5 meest gestelde vragen eerst — hoogste koop-angst-lading (Baymard:
   *  verzending/levertijd/retour). Direct beantwoord, vóór de categorieën. */
  popularQuestions: z
    .array(qaItemSchema)
    .min(3, "popularQuestions min 3")
    .max(5, "popularQuestions max 5"),
  categories: z
    .array(faqCategorySchema)
    .min(1, "categories min 1")
    .max(3, "categories max 3"),
  /** "Staat je vraag er niet bij?" — de NN/g escape-hatch, ná de Q&A's. */
  contactEscape: z.object({
    heading: z.string().min(1, "contactEscape.heading mag niet leeg zijn"),
    body: z.string().min(1, "contactEscape.body mag niet leeg zijn"),
    ctaLabel: z.string().min(1, "contactEscape.ctaLabel mag niet leeg zijn").max(48, "contactEscape.ctaLabel max 48 tekens"),
  }),
  closingCta: z.object({
    heading: z.string().min(1, "closingCta.heading mag niet leeg zijn"),
    ctaLabel: z.string().min(1, "closingCta.ctaLabel mag niet leeg zijn").max(48, "closingCta.ctaLabel max 48 tekens"),
  }),
});

export type FaqPageVariantContent = z.infer<typeof faqPageVariantSchema>;

// ─── Product/service-page (plan §2.1) ────────────────────────

const productHeroSchema = z.object({
  /** Outcome-headline ("Genereer sneller inkomsten"), niet de categorie. */
  headline: z.string().min(1, "hero.headline mag niet leeg zijn").max(60, "hero.headline max 60 tekens"),
  /** Vangt het grootste bezwaar af in 1-2 zinnen. */
  subline: z.string().min(1, "hero.subline mag niet leeg zijn"),
  /** Self-serve CTA; identiek aan finalCta.primaryCta (single-CTA discipline). */
  primaryCta: z.string().min(1, "hero.primaryCta mag niet leeg zijn"),
  /** Tweede koopmodus (sales/demo/offerte) — dual-CTA-patroon (Stripe/Mollie). */
  secondaryCta: z.string().nullable().optional(),
  heroVisualUrl: z.string().nullable().optional(),
  imageBrief: imageBriefSchema.nullable().optional().catch(null),
});

const productFeatureSchema = z.object({
  /** 2-6 woorden, benefit-led. */
  heading: z.string().min(1, "features[].heading mag niet leeg zijn"),
  /** 1-3 zinnen: feature-uitleg in benefit-frame ("which means …"). */
  body: z.string().min(1, "features[].body mag niet leeg zijn"),
  imageUrl: z.string().url("features[].imageUrl moet een geldige URL zijn").nullable().optional(),
  imageBrief: imageBriefSchema.nullable().optional().catch(null),
});

export const productPageVariantSchema = z
  .object({
    hero: productHeroSchema,
    problem: z.object({
      heading: z.string().min(1),
      body: z.string().min(1, "problem.body mag niet leeg zijn"),
    }),
    solution: z.object({
      heading: z.string().min(1),
      body: z.string().min(1, "solution.body mag niet leeg zijn"),
    }),
    /** 3-6 blokken; volgorde = gebruiksvolgorde van de klant, niet interne prioriteit. */
    features: z
      .array(productFeatureSchema)
      .min(3, "features min 3")
      .max(6, "features max 6"),
    useCases: z
      .array(z.object({ heading: z.string().min(1), body: z.string().min(1) }))
      .max(3, "useCases max 3")
      .optional(),
    /** Alleen bij technisch/fysiek product; UITSLUITEND specs uit de aangeleverde context. */
    specs: z
      .array(z.object({ label: z.string().min(1), value: z.string().min(1) }))
      .min(2, "specs min 2 rijen wanneer aanwezig")
      .max(12, "specs max 12 rijen")
      .optional(),
    /** Dienst-variant: 3-5 stappen "zo werken we". */
    processSteps: z
      .array(z.object({ heading: z.string().min(1), body: z.string().min(1) }))
      .min(3, "processSteps min 3 wanneer aanwezig")
      .max(5, "processSteps max 5")
      .optional(),
    /** Alleen wanneer prijsinformatie in de context staat — nooit verzinnen. */
    pricing: z
      .object({ heading: z.string().min(1), body: z.string().min(1) })
      .optional(),
    /** 3-4 bezwaar-gedreven Q&A's vlak voor de final CTA. */
    faq: z.array(qaItemSchema).min(3, "faq min 3").max(4, "faq max 4"),
    finalCta: z.object({
      heading: z.string().min(1),
      body: z.string().min(1, "finalCta.body mag niet leeg zijn"),
      primaryCta: z.string().min(1),
      secondaryCta: z.string().nullable().optional(),
    }),
  })
  .superRefine((data, ctx) => {
    if (data.finalCta.primaryCta !== data.hero.primaryCta) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["finalCta", "primaryCta"],
        message:
          "finalCta.primaryCta MOET identiek zijn aan hero.primaryCta (single-CTA discipline)",
      });
    }
  });

export type ProductPageVariantContent = z.infer<typeof productPageVariantSchema>;

// ─── Campaign-microsite (plan §4) ────────────────────────────

const chapterBlockSchema = z.object({
  heading: z.string().nullable().optional(),
  /** 20-60 woorden lopende tekst per blok — het vaste ritme vervangt animatie. */
  body: z.string().min(1, "blocks[].body mag niet leeg zijn"),
  /** W4 — beeld-slot per blok (zelfde conventie als productFeatureSchema):
   *  brand-image fill of toekomstige AI-gen persisteert hier; StoryChapter
   *  rendert het blok dan als alternerende beeld/tekst-rij. */
  imageUrl: z.string().url("blocks[].imageUrl moet een geldige URL zijn").nullable().optional(),
  imageBrief: imageBriefSchema.nullable().optional().catch(null),
});

/** Herhaalbaar hoofdstuk-template (IKEA/Patagonia-patroon): heading + intro +
 *  2-3 blokken, optioneel stat-callout en quote als visueel rustpunt. */
const chapterSchema = z.object({
  /** ≤2 woorden — voedt de ankernavigatie (AnchorNav, W4). */
  navLabel: z.string().min(1, "navLabel mag niet leeg zijn").max(24, "navLabel max 24 tekens (≤2 woorden)"),
  heading: z.string().min(1, "chapter.heading mag niet leeg zijn"),
  intro: z.string().nullable().optional(),
  blocks: z
    .array(chapterBlockSchema)
    .min(2, "chapter.blocks min 2")
    .max(3, "chapter.blocks max 3"),
  stat: z
    .object({
      value: z.string().min(1, "stat.value mag niet leeg zijn"),
      context: z.string().min(1, "stat.context mag niet leeg zijn"),
    })
    .nullable()
    .optional(),
  quote: z
    .object({
      text: z.string().min(1, "quote.text mag niet leeg zijn"),
      attribution: z.string().min(1, "quote.attribution mag niet leeg zijn"),
    })
    .nullable()
    .optional(),
});

export type MicrositeChapter = z.infer<typeof chapterSchema>;

export const micrositeVariantSchema = z.object({
  /** Moet zelfstandig de hele campagne communiceren — meerderheid scrollt niet ver. */
  heroManifest: z.object({
    navLabel: z.string().min(1).max(24, "navLabel max 24 tekens"),
    /** These-headline met meetbare claim ("access is better than ownership"). */
    headline: z.string().min(1, "heroManifest.headline mag niet leeg zijn").max(80, "heroManifest.headline max 80 tekens"),
    subline: z.string().min(1, "heroManifest.subline mag niet leeg zijn"),
    primaryCta: z.string().min(1, "heroManifest.primaryCta mag niet leeg zijn"),
    heroVisualUrl: z.string().nullable().optional(),
    imageBrief: imageBriefSchema.nullable().optional().catch(null),
  }),
  story: chapterSchema,
  impact: chapterSchema.nullable().optional(),
  community: chapterSchema.nullable().optional(),
  /** Altijd de laatste sectie; deadline = het urgentie-element dat een
   *  campagne-microsite van een evergreen LP onderscheidt. */
  join: z.object({
    navLabel: z.string().min(1).max(24, "navLabel max 24 tekens"),
    heading: z.string().min(1, "join.heading mag niet leeg zijn"),
    body: z.string().min(1, "join.body mag niet leeg zijn"),
    primaryCta: z.string().min(1, "join.primaryCta mag niet leeg zijn"),
    deadline: z.string().nullable().optional(),
  }),
});

export type MicrositeVariantContent = z.infer<typeof micrositeVariantSchema>;

// ─── Long-form GEO-article (GEO/SEO Fase 2) ──────────────────

/** Stat met optionele bron. Een ECHTE externe bron maakt 'm beter citeerbaar, maar
 *  een first-party merk-cijfer mag eerlijk zónder bron — een geforceerde bron dwong
 *  het model juist om interne context-laagnamen als "bron" te verzinnen (leak). */
const geoStatSchema = z.object({
  label: z.string().min(1, "citeableStats[].label mag niet leeg zijn"),
  value: z.string().min(1, "citeableStats[].value mag niet leeg zijn"),
  source: z.string().min(1).nullable().optional(),
});

/** Prose-sectie (de body-meat van het artikel). */
const geoSectionSchema = z.object({
  heading: z.string().min(1, "sections[].heading mag niet leeg zijn"),
  body: z.string().min(1, "sections[].body mag niet leeg zijn"),
});

/** Multi-kolom vergelijkingstabel — een van de hoogst-geciteerde GEO-formats. */
const geoComparisonSchema = z.object({
  caption: z.string().min(1).max(120).nullable().optional(),
  columns: z.array(z.string().min(1)).min(2, "comparison.columns min 2 (multi-kolom)").max(6, "comparison.columns max 6"),
  rows: z
    .array(z.object({ label: z.string().min(1), cells: z.array(z.string()).min(1) }))
    .min(1, "comparison.rows min 1"),
});

/** Genummerde listicle — het andere hoogst-geciteerde GEO-format. */
const geoListItemSchema = z.object({
  rank: z.number().int().positive(),
  title: z.string().min(1),
  body: z.string().min(1),
});

export const longFormGeoVariantSchema = z.object({
  /** Discriminant — onderscheidt de GEO-article van LP/faq/product/microsite
   *  (dezelfde rol als heroManifest/popularQuestions/solution). */
  geoArticle: z.literal(true),
  hero: z.object({
    headline: z.string().min(1, "hero.headline mag niet leeg zijn").max(80, "hero.headline max 80 tekens"),
    subline: z.string().min(1, "hero.subline mag niet leeg zijn"),
    heroVisualUrl: z.string().nullable().optional(),
    imageBrief: imageBriefSchema.nullable().optional().catch(null),
  }),
  /** Answer-first: ~40-60 woorden die de kernvraag meteen beantwoorden (AEO-citeerbaar). */
  answerFirstIntro: z.string().min(1, "answerFirstIntro mag niet leeg zijn"),
  /** TL;DR / key takeaways. */
  tldr: z.array(z.string().min(1)).min(2, "tldr min 2 bullets").max(5, "tldr max 5 bullets"),
  /** Prose-secties (artikel-body). */
  sections: z.array(geoSectionSchema).min(1, "sections min 1"),
  /** Q&A — citeerbaar + QAPage-JSON-LD-bron. */
  qa: z.array(qaItemSchema).min(2, "qa min 2"),
  /** Stats met bron. */
  citeableStats: z.array(geoStatSchema).min(1, "citeableStats min 1"),
  /** Definities — DefinedTerm-bron (optioneel). */
  definitions: z.array(z.object({ term: z.string().min(1), definition: z.string().min(1) })).nullable().optional(),
  /** Multi-kolom vergelijkingstabel (optioneel). */
  comparison: geoComparisonSchema.nullable().optional(),
  /** Genummerde listicle (optioneel). */
  listItems: z.array(geoListItemSchema).nullable().optional(),
  /** Bronnen/citaties (optioneel). */
  sources: z.array(z.object({ title: z.string().min(1), url: z.string().min(1) })).nullable().optional(),
  finalCta: z.object({
    heading: z.string().min(1, "finalCta.heading mag niet leeg zijn"),
    ctaLabel: z.string().min(1, "finalCta.ctaLabel mag niet leeg zijn").max(48, "finalCta.ctaLabel max 48 tekens"),
  }),
});

export type LongFormGeoVariantContent = z.infer<typeof longFormGeoVariantSchema>;

// ─── Dispatch ────────────────────────────────────────────────

export type PageVariantContent =
  | LandingPageVariantContent
  | FaqPageVariantContent
  | ProductPageVariantContent
  | MicrositeVariantContent
  | LongFormGeoVariantContent;

export type PageVariantSchema =
  | typeof landingPageVariantSchema
  | typeof faqPageVariantSchema
  | typeof productPageVariantSchema
  | typeof micrositeVariantSchema
  | typeof longFormGeoVariantSchema;

/**
 * Schema-dispatch per content-type. landing-page, comparison-page en elk
 * onbekend type vallen op het LP-schema terug — byte-compatibel met het
 * gedrag vóór W1, zodat het productie-kritieke LP-pad niets merkt.
 */
export function getVariantSchemaForType(contentType: string | null | undefined): PageVariantSchema {
  // GEO/SEO Fase 2: long-form-types krijgen het GEO-article-schema.
  if (contentType && LONG_FORM_SEO_TYPES.has(contentType)) return longFormGeoVariantSchema;
  switch (contentType) {
    case "faq-page":
      return faqPageVariantSchema;
    case "product-page":
      return productPageVariantSchema;
    case "microsite":
      return micrositeVariantSchema;
    default:
      return landingPageVariantSchema;
  }
}

/** True wanneer het type een eigen (niet-LP) schema heeft (W1 page-types + GEO long-form). */
export function hasOwnVariantSchema(contentType: string | null | undefined): boolean {
  if (contentType && LONG_FORM_SEO_TYPES.has(contentType)) return true;
  return contentType === "faq-page" || contentType === "product-page" || contentType === "microsite";
}

/**
 * Shape-based type-guard (zelfde discriminatoren als flattenPageVariantToText
 * en variantToPuckDataFromStructured): LP is het type ZONDER de unieke keys
 * van de W1-schemas. Shape i.p.v. contentType zodat legacy LP-shaped variants
 * op faq/microsite-deliverables (van vóór W1) als LP behandeld blijven.
 */
export function isLandingPageVariant(
  variant: PageVariantContent,
): variant is LandingPageVariantContent {
  return (
    !("heroManifest" in variant) &&
    !("popularQuestions" in variant) &&
    !("solution" in variant) &&
    !("geoArticle" in variant)
  );
}
