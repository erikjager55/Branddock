/**
 * Landing-page variant schema (Fase 1 van web-page-builder spec
 * docs/specs/web-page-types/landing-page.md §4b).
 *
 * Definieert het structurele contract dat Step-2 content-generation moet
 * produceren voor landing-page deliverables. Vervangt de markdown-blob
 * fallback + parseMarkdownArticle heuristics door deterministische
 * velden-mapping naar Puck-componenten.
 *
 * Constraints volgen §1 onderzoek:
 *  - headline max 44 chars (#7, CXL framework + Growth Spree B2B 2026)
 *  - features 3-5 items (#7 + #16 paradox of choice)
 *  - testimonials 1-3 items (#8 testimonial-priority)
 *  - faq 5-8 items (#14 objection-coverage)
 *  - pricing exactly 3 tiers when present (#16 decoy-effect)
 *  - finalCta.primaryCta IDENTIEK aan hero.primaryCta (#5 single-CTA discipline)
 *  - trust max 7 items (#8 trust-strip-formula 5-7 logos)
 *  - painBullets 3-5 items (#14 NL practitioner stijl)
 *  - impactStats max 4 (paradox of choice voor stats-card)
 *
 * Optional secties:
 *  - problem: optional voor non-considered purchases (D2C/impulse).
 *    Aanwezig → considered-purchase pad (B2B, SaaS, premium services).
 *  - pricing: optional voor lead-gen LPs zonder prijs-objection.
 *    Aanwezig → 3-tier decoy-pattern.
 */

import { z } from "zod";

// ─── Sectie-schema's ─────────────────────────────────────────

/**
 * Image-brief per sectie-beeld (R7, audit 2026-06-10-lp-feature-image-diversity).
 * Geproduceerd door de copy-LLM (variant-generator) die de volledige brand/
 * persona-context heeft — het [VISUAL:]-precedent uit het video-pad, maar
 * gestructureerd. De sceneType-enum maakt de cross-brief-diversiteitsregel
 * (≥3 verschillende types per pagina, max 1 person) mechanisch valideerbaar.
 * Optioneel + nullable: bestaande gepersisteerde variants parsen ongewijzigd.
 */
export const imageBriefSchema = z.object({
  /** Concreet, sectie-specifiek onderwerp ("stapel gevouwen servetten met GOTS-label"). */
  subject: z.string().min(1, "imageBrief.subject mag niet leeg zijn").max(200, "imageBrief.subject max 200 tekens"),
  /** Scene-typologie — stuurt het compositie-sjabloon van de prompt-builder. */
  sceneType: z.enum(["object", "process", "location", "detail", "person"]),
  /** Compositie-richting in 1 zin ("macro close-up, zachte zijbelichting"). */
  composition: z.string().min(1, "imageBrief.composition mag niet leeg zijn").max(200, "imageBrief.composition max 200 tekens"),
  /** Wat dit beeld NIET moet tonen — gaat naar de negative-prompt (userNegations-slot). */
  avoid: z.string().max(200, "imageBrief.avoid max 200 tekens").nullable().optional(),
});

export type ImageBrief = z.infer<typeof imageBriefSchema>;

const heroSchema = z.object({
  /** Max 60 chars (was 44 — relaxed 2026-05-27 omdat C2 voice-sample longer
   *  rhythm injecteert; 44 was te strict bij brand-voice imitation). */
  headline: z
    .string()
    .min(1, "hero.headline mag niet leeg zijn")
    .max(60, "hero.headline max 60 tekens"),
  /** 1-2 zinnen context + pijnpunt-erkenning. */
  subhead: z.string().min(1, "hero.subhead mag niet leeg zijn"),
  /** Action-led werkwoord; identiek aan finalCta.primaryCta. */
  primaryCta: z.string().min(1, "hero.primaryCta mag niet leeg zijn"),
  /** Hobson's Choice +1 alternatief (bv. "Bekijk demo"). */
  secondaryCta: z.string().nullable().optional(),
  /** v2 placeholder; in MVP via BrandHero workaround. AI mag null retourneren. */
  heroVisualUrl: z.string().nullable().optional(),
  /** C5 — optionele uppercase eyebrow boven headline (civic / categorie-marker). */
  eyebrow: z.string().max(40, "hero.eyebrow max 40 tekens").nullable().optional(),
  /** R7 — visuele richting voor de hero-foto, uit de copy-LLM. `.catch(null)`:
   *  een invalide brief (te lang / onbekend sceneType) degradeert naar null
   *  i.p.v. de hele variant-validatie te laten falen — het is een
   *  nice-to-have-veld met een heading/body-fallback (review 2026-06-10). */
  imageBrief: imageBriefSchema.nullable().optional().catch(null),
});

const trustItemSchema = z.object({
  label: z.string().min(1, "trust.items[].label mag niet leeg zijn"),
  /** Optional logo/image URL — AI mag null retourneren wanneer geen URL bekend. */
  mediaUrl: z.string().nullable().optional(),
});

const trustSchema = z.object({
  /** Bepaalt rendering: logo-rij, single testimonial-snippet, of authority-badge. */
  type: z.enum(["logos", "testimonial-quote", "authority-statement"]),
  /** 1-7 items per §1 #8 trust-strip-formula. */
  items: z
    .array(trustItemSchema)
    .min(1, "trust.items minimaal 1 per §1 #8")
    .max(7, "trust.items max 7 per §1 #8 logo-strip-formula"),
});

const problemSchema = z.object({
  /** Pijn als vraag of stelling. */
  heading: z.string().min(1),
  /** 3-5 frustratie-bullets. */
  painBullets: z
    .array(z.string().min(1))
    .min(3, "problem.painBullets min 3 per §1 #14 NL practitioner")
    .max(5, "problem.painBullets max 5 per §1 #14"),
  /** Brug naar oplossing — voorkomt doom-and-gloom framing. */
  bridgingSentence: z
    .string()
    .min(1, "problem.bridgingSentence verplicht — voorkomt doom-and-gloom"),
});

const featureItemSchema = z.object({
  /** Lucide-icon naam (geen emoji per CLAUDE.md). */
  icon: z.string().min(1, "features.items[].icon mag niet leeg zijn"),
  /** 2-4 woorden, benefit-led. */
  heading: z.string().min(1, "features.items[].heading mag niet leeg zijn"),
  /** 1-2 zinnen benefit-frame ("wat je krijgt"). */
  body: z.string().min(1, "features.items[].body mag niet leeg zijn"),
  /** Optionele per-feature afbeelding (materiaal-/product-/in-context-shot).
   *  Track 2: bij een tactiel premium-product is beeld het bewijs (Lens D
   *  research). Wanneer aanwezig vervangt de FeatureGrid de icon-badge door
   *  deze foto. Producer (brandImages-mapping / AI-gen) is een verbeterplan-
   *  track — de renderer is hiermee per-feature beeld-capabel. */
  imageUrl: z.string().url("features.items[].imageUrl moet een geldige URL zijn").nullable().optional(),
  /** R7 — visuele richting voor het feature-beeld: visualiseert HET BEWIJS van
   *  déze feature. Briefs moeten onderling verschillende sceneTypes/subjects
   *  hebben (regel 15 in de generator-system-prompt). `.catch(null)`: invalide
   *  brief degradeert naar null i.p.v. de variant te laten falen. */
  imageBrief: imageBriefSchema.nullable().optional().catch(null),
});

const featuresSchema = z.object({
  sectionHeading: z.string().min(1, "features.sectionHeading mag niet leeg zijn"),
  /** 3-5 items per §1 #7 + #16 paradox of choice. */
  items: z
    .array(featureItemSchema)
    // User-bevinding 2026-05-28: 5 features → 3+2 grid asymmetrie (3-col
    // layout met 2 cards op tweede rij). Cap op 4 zodat het altijd
    // visueel-balanced is (2×2 of 4×1) en match-het Anthropic 'paradox-of-
    // choice ≤4'. Min blijft 3.
    .min(3, "features.items min 3 per §1 #7")
    .max(4, "features.items max 4 — voorkomt 3-col grid asymmetrie en respecteert paradox of choice"),
});

/**
 * Audit 2026-06-10 (anti-fabricage): de prompt verbiedt verzonnen persoons-/
 * bedrijfsnamen; zonder brondata levert het model author-velden soms leeg op.
 * Lege velden krijgen een eerlijk-generieke fallback i.p.v. een validation-
 * throw die de hele variant-batch laat falen.
 */
const authorFieldWithFallback = (fallback: string) =>
  z
    .string()
    .optional()
    .transform((s) => (s && s.trim().length > 0 ? s : fallback));

const testimonialSchema = z.object({
  quote: z.string().min(1),
  authorName: authorFieldWithFallback("Tevreden klant"),
  authorRole: authorFieldWithFallback("Klant"),
  authorCompany: authorFieldWithFallback(""),
  /** Concrete uitkomst-cijfer ("30 uur per maand bespaard"). */
  outcome: z.string().optional(),
});

const impactStatSchema = z.object({
  /** Grote typografie waarde ("10.247", "30 uur"). */
  value: z.string().min(1),
  label: z.string().min(1),
});

const socialProofSchema = z.object({
  /** EXACT 1 testimonial — user-bevinding 2026-05-27: meerdere quotes
   *  verzwakken impact (Cialdini's authority-principle wint van quantity
   *  bij conversion-focused LPs). Eén goed-gekozen hoogwaardig quote met
   *  outcome-cijfer wint van 3 generieke quotes. */
  testimonials: z
    .array(testimonialSchema)
    .min(1, "socialProof.testimonials min 1")
    .max(1, "socialProof.testimonials max 1 — kies sterke single quote met outcome"),
  /** Optionele stats-card; max 4 per §1 #16 paradox of choice. */
  impactStats: z
    .array(impactStatSchema)
    .max(4, "socialProof.impactStats max 4 per §1 #16")
    .optional(),
});

const pricingTierSchema = z.object({
  name: z.string().min(1),
  price: z.string().min(1),
  features: z.array(z.string().min(1)).min(1, "pricing.tiers[].features min 1"),
  /** Decoy-highlight; geadviseerd: middelste tier highlighted = true. */
  highlighted: z.boolean(),
});

const pricingSchema = z.object({
  /** Exact 3 tiers per §1 #16 decoy-effect. */
  tiers: z
    .array(pricingTierSchema)
    .length(3, "pricing.tiers exact 3 per §1 #16 decoy-effect"),
});

const faqItemSchema = z.object({
  question: z.string().min(1),
  /** 2-4 zinnen, direct. */
  answer: z.string().min(1),
});

const faqSchema = z.object({
  /** 5-8 items per §1 #14 — geordend op gewicht (zwaarste objection eerst). */
  items: z
    .array(faqItemSchema)
    .min(5, "faq.items min 5 per §1 #14 objection-coverage")
    .max(8, "faq.items max 8 per §1 #14"),
});

const finalCtaSchema = z.object({
  /** Belofte herhalen + urgentie. */
  heading: z.string().min(1),
  /** Risico-reductie ("Geen creditcard nodig"). */
  riskReducer: z.string().min(1),
  /** IDENTIEK aan hero.primaryCta — afgedwongen via superRefine. */
  primaryCta: z.string().min(1),
});

// ─── Root schema met cross-field constraint ───────────────────

export const landingPageVariantSchema = z
  .object({
    hero: heroSchema,
    trust: trustSchema,
    problem: problemSchema.optional(),
    features: featuresSchema,
    socialProof: socialProofSchema,
    pricing: pricingSchema.optional(),
    faq: faqSchema,
    finalCta: finalCtaSchema,
  })
  .superRefine((data, ctx) => {
    if (data.finalCta.primaryCta !== data.hero.primaryCta) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["finalCta", "primaryCta"],
        message:
          "finalCta.primaryCta MOET identiek zijn aan hero.primaryCta per §1 #5 single-CTA discipline",
      });
    }
  });

export type LandingPageVariantContent = z.infer<typeof landingPageVariantSchema>;

// ─── Validation helper ───────────────────────────────────────

export type ValidationResult =
  | { success: true; data: LandingPageVariantContent }
  | {
      success: false;
      errors: Array<{ path: string; message: string }>;
    };

/**
 * Validate a candidate variant tegen het schema.
 *
 * Gebruikt safeParse zodat callers geen try/catch nodig hebben. Bij falen
 * worden alle issues teruggegeven (geen first-fail-stop) zodat een
 * content-generator z'n output in één pass kan corrigeren.
 */
export function validateLandingPageVariant(input: unknown): ValidationResult {
  const result = landingPageVariantSchema.safeParse(input);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return {
    success: false,
    errors: result.error.issues.map((issue) => ({
      path: issue.path.join("."),
      message: issue.message,
    })),
  };
}
