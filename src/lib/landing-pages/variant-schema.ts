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

const heroSchema = z.object({
  /** 5-10 woorden, max 44 chars, benefit-led (geen feature-led). */
  headline: z
    .string()
    .min(1, "hero.headline mag niet leeg zijn")
    .max(44, "hero.headline max 44 tekens per §1 #7 CXL framework"),
  /** 1-2 zinnen context + pijnpunt-erkenning. */
  subhead: z.string().min(1, "hero.subhead mag niet leeg zijn"),
  /** Action-led werkwoord; identiek aan finalCta.primaryCta. */
  primaryCta: z.string().min(1, "hero.primaryCta mag niet leeg zijn"),
  /** Hobson's Choice +1 alternatief (bv. "Bekijk demo"). */
  secondaryCta: z.string().optional(),
  /** v2 placeholder; in MVP via BrandHero workaround. */
  heroVisualUrl: z.string().optional(),
});

const trustItemSchema = z.object({
  label: z.string().min(1, "trust.items[].label mag niet leeg zijn"),
  mediaUrl: z.string().optional(),
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
});

const featuresSchema = z.object({
  sectionHeading: z.string().min(1, "features.sectionHeading mag niet leeg zijn"),
  /** 3-5 items per §1 #7 + #16 paradox of choice. */
  items: z
    .array(featureItemSchema)
    .min(3, "features.items min 3 per §1 #7")
    .max(5, "features.items max 5 per §1 #16 paradox of choice"),
});

const testimonialSchema = z.object({
  quote: z.string().min(1),
  authorName: z.string().min(1),
  authorRole: z.string().min(1),
  authorCompany: z.string().min(1),
  /** Concrete uitkomst-cijfer ("30 uur per maand bespaard"). */
  outcome: z.string().optional(),
});

const impactStatSchema = z.object({
  /** Grote typografie waarde ("10.247", "30 uur"). */
  value: z.string().min(1),
  label: z.string().min(1),
});

const socialProofSchema = z.object({
  /** 1-3 testimonials per §1 #8 — meer dan 3 verzwakt. */
  testimonials: z
    .array(testimonialSchema)
    .min(1, "socialProof.testimonials min 1 per §1 #8")
    .max(3, "socialProof.testimonials max 3 per §1 #8"),
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
