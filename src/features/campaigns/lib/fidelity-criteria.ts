/**
 * Fidelity scoring definitions per content-type.
 *
 * Output van content-strategy sessie 2026-05-05. Implementeert beslissing 3
 * uit `branddock-learning-loop-decisions.md`.
 *
 * Architectuur:
 * - 3 pillars uniform across content-types: strategic / audience / execution
 * - 6 sub-criteria per content-type-categorie (4 universal + 2 specialized)
 * - 8 categorie-defaults uit DELIVERABLE_CATEGORIES
 * - 4 type-overrides waar de categorie-default niet past
 *
 * Gebruik: `getFidelityConfig(contentTypeId)` voor per-type config.
 *
 * Zie: FIDELITY-CRITERIA-AUDIT.md, IMPLEMENTATIEPLAN-FIDELITY-CRITERIA.md
 */

import type {
  ContentTypeFidelityConfig,
  FidelityCriterionDefinition,
  FidelityPillarDefinition,
} from "@/types/learning-loop";

import { getDeliverableTypeById } from "./deliverable-types";

// ─────────────────────────────────────────────────────────────────────────
// PILLARS (uniform, weights overridden per content-type config)
// ─────────────────────────────────────────────────────────────────────────

const PILLAR_STRATEGIC: Omit<FidelityPillarDefinition, "weight"> = {
  key: "strategic",
  label: "Strategic",
  description:
    "Does this content serve the brand strategy and campaign creative concept?",
};

const PILLAR_AUDIENCE: Omit<FidelityPillarDefinition, "weight"> = {
  key: "audience",
  label: "Audience",
  description:
    "Does this content reach and resonate with the target audience?",
};

const PILLAR_EXECUTION: Omit<FidelityPillarDefinition, "weight"> = {
  key: "execution",
  label: "Execution",
  description: "Is this content well-crafted and platform-appropriate?",
};

// ─────────────────────────────────────────────────────────────────────────
// CRITERIA — universal core (4, in every category)
// ─────────────────────────────────────────────────────────────────────────

type CriterionTemplate = Omit<FidelityCriterionDefinition, "weight">;

const CRIT_BRAND_FIDELITY: CriterionTemplate = {
  key: "brand-fidelity",
  label: "Brand Fidelity",
  description:
    "Voice consistency, value-message alignment, positioning reinforcement",
  pillar: "strategic",
  source: "ai-judge",
};

const CRIT_CONCEPT_FIDELITY: CriterionTemplate = {
  key: "concept-fidelity",
  label: "Concept Fidelity",
  description:
    "Aligns with campaign creative concept, key message, strategic intent (gap G2)",
  pillar: "strategic",
  source: "ai-judge",
};

const CRIT_AUDIENCE_RESONANCE: CriterionTemplate = {
  key: "audience-resonance",
  label: "Audience Resonance",
  description:
    "Persona pain-points addressed, language register fits target (gap G4)",
  pillar: "audience",
  source: "ai-judge",
};

const CRIT_CRAFT_QUALITY: CriterionTemplate = {
  key: "craft-quality",
  label: "Craft Quality",
  description:
    "Readability, structural integrity, format-appropriate execution",
  pillar: "execution",
  source: "ai-judge",
};

// ─────────────────────────────────────────────────────────────────────────
// CRITERIA — specialized (per category)
// ─────────────────────────────────────────────────────────────────────────

const CRIT_EVIDENCE_STRENGTH: CriterionTemplate = {
  key: "evidence-strength",
  label: "Evidence Strength",
  description:
    "Proof-points, data, examples count and quality (gap G5, hybrid scoring)",
  pillar: "strategic",
  source: "ai-judge", // hybrid in practice — deterministic count + ai-judge quality
};

const CRIT_SEO_CRAFTSMANSHIP: CriterionTemplate = {
  key: "seo-craftsmanship",
  label: "SEO Craftsmanship",
  description: "Keyword usage, meta-description, heading-structure",
  pillar: "execution",
  source: "deterministic",
};

const CRIT_HOOK_STRENGTH: CriterionTemplate = {
  key: "hook-strength",
  label: "Hook Strength",
  description: "Opening line, pattern interrupt, share-worthiness",
  pillar: "audience",
  source: "ai-judge",
};

const CRIT_VISUAL_TEXT_SYNERGY: CriterionTemplate = {
  key: "visual-text-synergy",
  label: "Visual-Text Synergy",
  description: "Caption complements visual without duplicating",
  pillar: "execution",
  source: "ai-judge",
};

const CRIT_CONVERSION_FOCUS: CriterionTemplate = {
  key: "conversion-focus",
  label: "Conversion Focus",
  description: "CTA strength, urgency, value proposition clarity",
  pillar: "strategic",
  source: "ai-judge",
};

const CRIT_TARGETING_PRECISION: CriterionTemplate = {
  key: "targeting-precision",
  label: "Targeting Precision",
  description: "Audience relevance, persona alignment, segment fit",
  pillar: "audience",
  source: "ai-judge",
};

const CRIT_SUBJECT_LINE_STRENGTH: CriterionTemplate = {
  key: "subject-line-strength",
  label: "Subject Line Strength",
  description: "Open-rate potential, curiosity gap, personalization",
  pillar: "audience",
  source: "ai-judge",
};

const CRIT_DELIVERABILITY_TECHNICAL: CriterionTemplate = {
  key: "deliverability-technical",
  label: "Deliverability",
  description: "Spam-trigger avoidance, link ratio, text-to-image balance",
  pillar: "execution",
  source: "deterministic",
};

const CRIT_CONVERSION_OPTIMIZATION: CriterionTemplate = {
  key: "conversion-optimization",
  label: "Conversion Optimization",
  description: "CTA placement, value hierarchy, friction reduction",
  pillar: "strategic",
  source: "ai-judge",
};

const CRIT_PRODUCTION_READINESS: CriterionTemplate = {
  key: "production-readiness",
  label: "Production Readiness",
  description: "Shoot-ready directions, timing cues, format specs",
  pillar: "execution",
  source: "deterministic",
};

const CRIT_VALUE_PROPOSITION: CriterionTemplate = {
  key: "value-proposition",
  label: "Value Proposition",
  description: "Clear differentiation, benefit-focused, ROI framing",
  pillar: "strategic",
  source: "ai-judge",
};

const CRIT_PERSUASION_STRUCTURE: CriterionTemplate = {
  key: "persuasion-structure",
  label: "Persuasion Structure",
  description: "Problem-solution, objection handling, social proof",
  pillar: "execution",
  source: "ai-judge",
};

const CRIT_MESSAGE_CLARITY: CriterionTemplate = {
  key: "message-clarity",
  label: "Message Clarity",
  description: "Key-message prominence, takeaway clarity, lead-paragraph strength",
  pillar: "strategic",
  source: "ai-judge",
};

const CRIT_CREDIBILITY_EVIDENCE: CriterionTemplate = {
  key: "credibility-evidence",
  label: "Credibility & Evidence",
  description: "Data backing, quote usage, source attribution",
  pillar: "execution",
  source: "ai-judge",
};

const CRIT_COMPLETENESS_COVERAGE: CriterionTemplate = {
  key: "completeness-coverage",
  label: "Completeness Coverage",
  description: "FAQ-specific: coverage of common questions, logical grouping",
  pillar: "strategic",
  source: "ai-judge",
};

// ─── Iteratie 2 toevoegingen (gap G1, G3, G7) ────────────

const CRIT_BEHAVIORAL_APPLICATION: CriterionTemplate = {
  key: "behavioral-application",
  label: "Behavioral Application",
  description:
    "Applies behavior-change frameworks (Cialdini / BCT / EAST / MINDSPACE) appropriate to the goal (gap G1)",
  pillar: "strategic",
  source: "ai-judge",
};

const CRIT_DISTINCTIVENESS: CriterionTemplate = {
  key: "distinctiveness",
  label: "Distinctiveness",
  description:
    "Stands out from generic AI output, brand-distinctive perspective, original framing (gap G3)",
  pillar: "strategic",
  source: "ai-judge",
};

const CRIT_MEMORABILITY: CriterionTemplate = {
  key: "memorability-stickiness",
  label: "Memorability",
  description:
    "SUCCESs framework: simple, unexpected, concrete, credible, emotional, story-led (gap G7)",
  pillar: "audience",
  source: "ai-judge",
};

const CRIT_NARRATIVE_FLOW: CriterionTemplate = {
  key: "narrative-flow",
  label: "Narrative Flow",
  description: "Story arc, problem-solution-result progression, emotional pacing",
  pillar: "execution",
  source: "ai-judge",
};

// ─────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────

function pillar(
  template: Omit<FidelityPillarDefinition, "weight">,
  weight: number,
): FidelityPillarDefinition {
  return { ...template, weight };
}

function crit(
  template: CriterionTemplate,
  weight: number,
): FidelityCriterionDefinition {
  return { ...template, weight };
}

// ─────────────────────────────────────────────────────────────────────────
// CATEGORY DEFAULTS — 8 categorieën
// ─────────────────────────────────────────────────────────────────────────

const CONFIG_LONG_FORM: ContentTypeFidelityConfig = {
  contentTypeId: "",
  category: "Long-Form Content",
  pillars: [
    pillar(PILLAR_STRATEGIC, 0.4),
    pillar(PILLAR_AUDIENCE, 0.2),
    pillar(PILLAR_EXECUTION, 0.4),
  ],
  criteria: [
    // Strategic (3)
    crit(CRIT_BRAND_FIDELITY, 0.35),
    crit(CRIT_CONCEPT_FIDELITY, 0.4),
    crit(CRIT_EVIDENCE_STRENGTH, 0.25),
    // Audience (1)
    crit(CRIT_AUDIENCE_RESONANCE, 1.0),
    // Execution (2)
    crit(CRIT_CRAFT_QUALITY, 0.55),
    crit(CRIT_SEO_CRAFTSMANSHIP, 0.45),
  ],
  compositeThreshold: 70,
};

const CONFIG_SOCIAL_MEDIA: ContentTypeFidelityConfig = {
  contentTypeId: "",
  category: "Social Media",
  pillars: [
    pillar(PILLAR_STRATEGIC, 0.3),
    pillar(PILLAR_AUDIENCE, 0.4),
    pillar(PILLAR_EXECUTION, 0.3),
  ],
  criteria: [
    crit(CRIT_BRAND_FIDELITY, 0.5),
    crit(CRIT_CONCEPT_FIDELITY, 0.5),
    crit(CRIT_AUDIENCE_RESONANCE, 0.45),
    crit(CRIT_HOOK_STRENGTH, 0.55),
    crit(CRIT_CRAFT_QUALITY, 0.5),
    crit(CRIT_VISUAL_TEXT_SYNERGY, 0.5),
  ],
  compositeThreshold: 65,
};

const CONFIG_ADVERTISING: ContentTypeFidelityConfig = {
  contentTypeId: "",
  category: "Advertising & Paid",
  pillars: [
    pillar(PILLAR_STRATEGIC, 0.45),
    pillar(PILLAR_AUDIENCE, 0.3),
    pillar(PILLAR_EXECUTION, 0.25),
  ],
  criteria: [
    crit(CRIT_BRAND_FIDELITY, 0.3),
    crit(CRIT_CONCEPT_FIDELITY, 0.3),
    crit(CRIT_CONVERSION_FOCUS, 0.4),
    crit(CRIT_AUDIENCE_RESONANCE, 0.45),
    crit(CRIT_TARGETING_PRECISION, 0.55),
    crit(CRIT_CRAFT_QUALITY, 1.0),
  ],
  compositeThreshold: 70,
};

const CONFIG_EMAIL: ContentTypeFidelityConfig = {
  contentTypeId: "",
  category: "Email & Automation",
  pillars: [
    pillar(PILLAR_STRATEGIC, 0.3),
    pillar(PILLAR_AUDIENCE, 0.35),
    pillar(PILLAR_EXECUTION, 0.35),
  ],
  criteria: [
    crit(CRIT_BRAND_FIDELITY, 0.5),
    crit(CRIT_CONCEPT_FIDELITY, 0.5),
    crit(CRIT_AUDIENCE_RESONANCE, 0.5),
    crit(CRIT_SUBJECT_LINE_STRENGTH, 0.5),
    crit(CRIT_CRAFT_QUALITY, 0.4),
    crit(CRIT_DELIVERABILITY_TECHNICAL, 0.6),
  ],
  compositeThreshold: 70,
};

const CONFIG_WEBSITE: ContentTypeFidelityConfig = {
  contentTypeId: "",
  category: "Website & Landing Pages",
  pillars: [
    pillar(PILLAR_STRATEGIC, 0.4),
    pillar(PILLAR_AUDIENCE, 0.2),
    pillar(PILLAR_EXECUTION, 0.4),
  ],
  criteria: [
    crit(CRIT_BRAND_FIDELITY, 0.3),
    crit(CRIT_CONCEPT_FIDELITY, 0.3),
    crit(CRIT_CONVERSION_OPTIMIZATION, 0.4),
    crit(CRIT_AUDIENCE_RESONANCE, 1.0),
    crit(CRIT_CRAFT_QUALITY, 0.5),
    crit(CRIT_SEO_CRAFTSMANSHIP, 0.5),
  ],
  compositeThreshold: 70,
};

const CONFIG_VIDEO_AUDIO: ContentTypeFidelityConfig = {
  contentTypeId: "",
  category: "Video & Audio",
  pillars: [
    pillar(PILLAR_STRATEGIC, 0.35),
    pillar(PILLAR_AUDIENCE, 0.35),
    pillar(PILLAR_EXECUTION, 0.3),
  ],
  criteria: [
    crit(CRIT_BRAND_FIDELITY, 0.5),
    crit(CRIT_CONCEPT_FIDELITY, 0.5),
    crit(CRIT_AUDIENCE_RESONANCE, 0.45),
    crit(CRIT_HOOK_STRENGTH, 0.55),
    crit(CRIT_CRAFT_QUALITY, 0.5),
    crit(CRIT_PRODUCTION_READINESS, 0.5),
  ],
  compositeThreshold: 65,
};

const CONFIG_SALES: ContentTypeFidelityConfig = {
  contentTypeId: "",
  category: "Sales Enablement",
  pillars: [
    pillar(PILLAR_STRATEGIC, 0.45),
    pillar(PILLAR_AUDIENCE, 0.2),
    pillar(PILLAR_EXECUTION, 0.35),
  ],
  criteria: [
    crit(CRIT_BRAND_FIDELITY, 0.3),
    crit(CRIT_CONCEPT_FIDELITY, 0.3),
    crit(CRIT_VALUE_PROPOSITION, 0.4),
    crit(CRIT_AUDIENCE_RESONANCE, 1.0),
    crit(CRIT_CRAFT_QUALITY, 0.5),
    crit(CRIT_PERSUASION_STRUCTURE, 0.5),
  ],
  compositeThreshold: 70,
};

const CONFIG_PR_HR: ContentTypeFidelityConfig = {
  contentTypeId: "",
  category: "PR, HR & Communications",
  pillars: [
    pillar(PILLAR_STRATEGIC, 0.4),
    pillar(PILLAR_AUDIENCE, 0.25),
    pillar(PILLAR_EXECUTION, 0.35),
  ],
  criteria: [
    crit(CRIT_BRAND_FIDELITY, 0.3),
    crit(CRIT_CONCEPT_FIDELITY, 0.3),
    crit(CRIT_MESSAGE_CLARITY, 0.4),
    crit(CRIT_AUDIENCE_RESONANCE, 1.0),
    crit(CRIT_CRAFT_QUALITY, 0.5),
    crit(CRIT_CREDIBILITY_EVIDENCE, 0.5),
  ],
  compositeThreshold: 70,
};

// Lookup-tabel categorie -> default config
const CATEGORY_DEFAULTS: Record<string, ContentTypeFidelityConfig> = {
  "Long-Form Content": CONFIG_LONG_FORM,
  "Social Media": CONFIG_SOCIAL_MEDIA,
  "Advertising & Paid": CONFIG_ADVERTISING,
  "Email & Automation": CONFIG_EMAIL,
  "Website & Landing Pages": CONFIG_WEBSITE,
  "Video & Audio": CONFIG_VIDEO_AUDIO,
  "Sales Enablement": CONFIG_SALES,
  "PR, HR & Communications": CONFIG_PR_HR,
};

// ─────────────────────────────────────────────────────────────────────────
// TYPE-OVERRIDES — types die niet bij de categorie-default passen
// ─────────────────────────────────────────────────────────────────────────

/**
 * faq-page: Website-categorie maar `conversion-optimization` past niet
 * (FAQ heeft geen conversie-doel). Vervang door `completeness-coverage`.
 */
const OVERRIDE_FAQ_PAGE: ContentTypeFidelityConfig = {
  ...CONFIG_WEBSITE,
  contentTypeId: "faq-page",
  criteria: [
    crit(CRIT_BRAND_FIDELITY, 0.3),
    crit(CRIT_CONCEPT_FIDELITY, 0.3),
    crit(CRIT_COMPLETENESS_COVERAGE, 0.4), // vervangt conversion-optimization
    crit(CRIT_AUDIENCE_RESONANCE, 1.0),
    crit(CRIT_CRAFT_QUALITY, 0.5),
    crit(CRIT_SEO_CRAFTSMANSHIP, 0.5),
  ],
};

/**
 * tiktok-script: short-form video — hook is alles. Audience-pillar
 * krijgt zwaarder gewicht en hook-strength domineert.
 */
const OVERRIDE_TIKTOK: ContentTypeFidelityConfig = {
  ...CONFIG_SOCIAL_MEDIA,
  contentTypeId: "tiktok-script",
  pillars: [
    pillar(PILLAR_STRATEGIC, 0.25),
    pillar(PILLAR_AUDIENCE, 0.5),
    pillar(PILLAR_EXECUTION, 0.25),
  ],
  criteria: [
    crit(CRIT_BRAND_FIDELITY, 0.5),
    crit(CRIT_CONCEPT_FIDELITY, 0.5),
    crit(CRIT_AUDIENCE_RESONANCE, 0.3),
    crit(CRIT_HOOK_STRENGTH, 0.7), // dominant
    crit(CRIT_CRAFT_QUALITY, 0.5),
    crit(CRIT_VISUAL_TEXT_SYNERGY, 0.5),
  ],
  compositeThreshold: 60, // korter, lagere bar
};

/**
 * linkedin-set (carousel/newsletter/video/event/poll): Social Media base,
 * maar professional context — meer strategic gewicht, minder hook-spam.
 * Geen criterion-changes, alleen pillar-weights.
 */
const OVERRIDE_LINKEDIN: ContentTypeFidelityConfig = {
  ...CONFIG_SOCIAL_MEDIA,
  pillars: [
    pillar(PILLAR_STRATEGIC, 0.4),
    pillar(PILLAR_AUDIENCE, 0.35),
    pillar(PILLAR_EXECUTION, 0.25),
  ],
  // criteria identiek aan Social Media
};

/**
 * linkedin-ad: hybrid — Social Media positie maar Advertising-stijl criteria.
 * Use Advertising default direct.
 */
// (Geen aparte override; valt onder Advertising-categorie via mapping hieronder.)

// ─── Iteratie 2: Long-Form differentiatie (4 types) ──────────────
//
// Default `CONFIG_LONG_FORM` (= blog-post profile) blijft voor blog-post,
// pillar-page, article. Deze 4 types verdienen eigen weights/criteria
// vanwege fundamenteel ander reader-intent.

/**
 * whitepaper: research-backed thought leadership — evidence is alles.
 * Strategic pillar wordt zwaarder, evidence-strength dominant binnen.
 * Concept-fidelity blijft maar wordt secundair.
 */
const OVERRIDE_WHITEPAPER: ContentTypeFidelityConfig = {
  ...CONFIG_LONG_FORM,
  contentTypeId: "whitepaper",
  pillars: [
    pillar(PILLAR_STRATEGIC, 0.5),
    pillar(PILLAR_AUDIENCE, 0.15),
    pillar(PILLAR_EXECUTION, 0.35),
  ],
  criteria: [
    crit(CRIT_BRAND_FIDELITY, 0.25),
    crit(CRIT_CONCEPT_FIDELITY, 0.25),
    crit(CRIT_EVIDENCE_STRENGTH, 0.5), // dominant
    crit(CRIT_AUDIENCE_RESONANCE, 1.0),
    crit(CRIT_CRAFT_QUALITY, 0.5),
    crit(CRIT_SEO_CRAFTSMANSHIP, 0.5),
  ],
  compositeThreshold: 75, // hogere bar voor authoritative content
};

/**
 * case-study: customer success narrative — story-driven, persuasion-led.
 * Swap evidence-strength → narrative-flow; audience pillar krijgt
 * memorability als 6e dimensie waar evidence-strength was.
 */
const OVERRIDE_CASE_STUDY: ContentTypeFidelityConfig = {
  ...CONFIG_LONG_FORM,
  contentTypeId: "case-study",
  pillars: [
    pillar(PILLAR_STRATEGIC, 0.35),
    pillar(PILLAR_AUDIENCE, 0.3),
    pillar(PILLAR_EXECUTION, 0.35),
  ],
  criteria: [
    crit(CRIT_BRAND_FIDELITY, 0.4),
    crit(CRIT_CONCEPT_FIDELITY, 0.6), // story-arc consistency
    // Evidence-strength dropped — case-studies zijn narrative-led
    crit(CRIT_AUDIENCE_RESONANCE, 0.5),
    crit(CRIT_MEMORABILITY, 0.5), // SUCCESs framework toegepast
    crit(CRIT_NARRATIVE_FLOW, 0.6), // story arc
    crit(CRIT_CRAFT_QUALITY, 0.4),
  ],
  compositeThreshold: 70,
};

/**
 * ebook: long-form lead magnet — completeness + structure heavyweight.
 * Replace evidence-strength with completeness-coverage; lower threshold
 * because length tolerates wider quality variation.
 */
const OVERRIDE_EBOOK: ContentTypeFidelityConfig = {
  ...CONFIG_LONG_FORM,
  contentTypeId: "ebook",
  pillars: [
    pillar(PILLAR_STRATEGIC, 0.35),
    pillar(PILLAR_AUDIENCE, 0.2),
    pillar(PILLAR_EXECUTION, 0.45),
  ],
  criteria: [
    crit(CRIT_BRAND_FIDELITY, 0.3),
    crit(CRIT_CONCEPT_FIDELITY, 0.3),
    crit(CRIT_COMPLETENESS_COVERAGE, 0.4), // vervangt evidence-strength
    crit(CRIT_AUDIENCE_RESONANCE, 1.0),
    crit(CRIT_CRAFT_QUALITY, 0.6),
    crit(CRIT_SEO_CRAFTSMANSHIP, 0.4),
  ],
  compositeThreshold: 65,
};

/**
 * thought-leadership: distinctive POV is the whole point. Replace
 * evidence-strength with distinctiveness; emphasize concept-fidelity
 * (the thesis) over brand-fidelity (which would dilute the voice).
 */
const OVERRIDE_THOUGHT_LEADERSHIP: ContentTypeFidelityConfig = {
  ...CONFIG_LONG_FORM,
  contentTypeId: "thought-leadership",
  pillars: [
    pillar(PILLAR_STRATEGIC, 0.5),
    pillar(PILLAR_AUDIENCE, 0.25),
    pillar(PILLAR_EXECUTION, 0.25),
  ],
  criteria: [
    crit(CRIT_BRAND_FIDELITY, 0.2),
    crit(CRIT_CONCEPT_FIDELITY, 0.35),
    crit(CRIT_DISTINCTIVENESS, 0.45), // dominant — original POV is the goal
    crit(CRIT_AUDIENCE_RESONANCE, 1.0),
    crit(CRIT_CRAFT_QUALITY, 0.6),
    crit(CRIT_SEO_CRAFTSMANSHIP, 0.4),
  ],
  compositeThreshold: 75, // executive-bylined → high bar
};

// ─── Iteratie 2: Email differentiatie (2 types) ──────────────────
//
// Default `CONFIG_EMAIL` blijft voor newsletter, nurture-sequence.
// Deze 2 differentiëren omdat hun doel fundamenteel anders is.

/**
 * welcome-sequence: relationship-setting moment — concept-fidelity is
 * de toon-aangevende factor. Subject-line is minder kritiek (deze emails
 * worden meestal geopend uit verwachting), audience-resonance dominant.
 */
const OVERRIDE_WELCOME_SEQUENCE: ContentTypeFidelityConfig = {
  ...CONFIG_EMAIL,
  contentTypeId: "welcome-sequence",
  pillars: [
    pillar(PILLAR_STRATEGIC, 0.4),
    pillar(PILLAR_AUDIENCE, 0.4),
    pillar(PILLAR_EXECUTION, 0.2),
  ],
  criteria: [
    crit(CRIT_BRAND_FIDELITY, 0.4),
    crit(CRIT_CONCEPT_FIDELITY, 0.6), // tone-setting moment
    crit(CRIT_AUDIENCE_RESONANCE, 0.6), // dominant — onboarding fit
    crit(CRIT_SUBJECT_LINE_STRENGTH, 0.4),
    crit(CRIT_CRAFT_QUALITY, 0.5),
    crit(CRIT_DELIVERABILITY_TECHNICAL, 0.5),
  ],
  compositeThreshold: 70,
};

/**
 * promotional-email: conversion-driven — behavioral-application earns
 * its first-class slot. Swap subject-line for behavioral-application
 * to make the goal explicit.
 */
const OVERRIDE_PROMOTIONAL_EMAIL: ContentTypeFidelityConfig = {
  ...CONFIG_EMAIL,
  contentTypeId: "promotional-email",
  pillars: [
    pillar(PILLAR_STRATEGIC, 0.45),
    pillar(PILLAR_AUDIENCE, 0.3),
    pillar(PILLAR_EXECUTION, 0.25),
  ],
  criteria: [
    crit(CRIT_BRAND_FIDELITY, 0.3),
    crit(CRIT_CONCEPT_FIDELITY, 0.3),
    crit(CRIT_BEHAVIORAL_APPLICATION, 0.4), // Cialdini / BCT / EAST
    crit(CRIT_AUDIENCE_RESONANCE, 0.5),
    crit(CRIT_SUBJECT_LINE_STRENGTH, 0.5),
    crit(CRIT_DELIVERABILITY_TECHNICAL, 1.0),
  ],
  compositeThreshold: 70,
};

const TYPE_OVERRIDES: Record<string, ContentTypeFidelityConfig> = {
  "faq-page": OVERRIDE_FAQ_PAGE,
  "tiktok-script": OVERRIDE_TIKTOK,
  // linkedin-set (5 types) → linkedin-overlay
  "linkedin-carousel": { ...OVERRIDE_LINKEDIN, contentTypeId: "linkedin-carousel" },
  "linkedin-newsletter": { ...OVERRIDE_LINKEDIN, contentTypeId: "linkedin-newsletter" },
  "linkedin-video": { ...OVERRIDE_LINKEDIN, contentTypeId: "linkedin-video" },
  "linkedin-event": { ...OVERRIDE_LINKEDIN, contentTypeId: "linkedin-event" },
  "linkedin-poll": { ...OVERRIDE_LINKEDIN, contentTypeId: "linkedin-poll" },
  // linkedin-ad valt onder Advertising — geen override nodig.
  // Iteratie 2 — Long-Form differentiatie (4 types)
  "whitepaper": OVERRIDE_WHITEPAPER,
  "case-study": OVERRIDE_CASE_STUDY,
  "ebook": OVERRIDE_EBOOK,
  "thought-leadership": OVERRIDE_THOUGHT_LEADERSHIP,
  // Iteratie 2 — Email differentiatie (2 types)
  "welcome-sequence": OVERRIDE_WELCOME_SEQUENCE,
  "promotional-email": OVERRIDE_PROMOTIONAL_EMAIL,
};

// ─────────────────────────────────────────────────────────────────────────
// PUBLIC API
// ─────────────────────────────────────────────────────────────────────────

/**
 * Resolve fidelity-config voor een content-type.
 *
 * Volgorde:
 * 1. Type-override (bijv. faq-page, tiktok-script, linkedin-set)
 * 2. Categorie-default uit `deliverable-types.ts`
 * 3. Long-Form fallback (laatste redmiddel)
 *
 * @returns config met `contentTypeId` ingevuld
 */
export function getFidelityConfig(
  contentTypeId: string,
): ContentTypeFidelityConfig {
  const override = TYPE_OVERRIDES[contentTypeId];
  if (override) return override;

  const definition = getDeliverableTypeById(contentTypeId);
  if (definition) {
    const categoryDefault = CATEGORY_DEFAULTS[definition.category];
    if (categoryDefault) {
      return { ...categoryDefault, contentTypeId };
    }
  }

  // Fallback — onbekend type, gebruik long-form als veiligste default
  return { ...CONFIG_LONG_FORM, contentTypeId };
}

/** Alle pillar-keys (voor type-validatie en iteratie). */
export const FIDELITY_PILLAR_KEYS = ["strategic", "audience", "execution"] as const;

/** Alle bekende criterion-keys (voor type-validatie). */
export const KNOWN_CRITERION_KEYS = [
  "brand-fidelity",
  "concept-fidelity",
  "audience-resonance",
  "craft-quality",
  "evidence-strength",
  "seo-craftsmanship",
  "hook-strength",
  "visual-text-synergy",
  "conversion-focus",
  "targeting-precision",
  "subject-line-strength",
  "deliverability-technical",
  "conversion-optimization",
  "production-readiness",
  "value-proposition",
  "persuasion-structure",
  "message-clarity",
  "credibility-evidence",
  "completeness-coverage",
  // Iteratie 2 toevoegingen
  "behavioral-application",
  "distinctiveness",
  "memorability-stickiness",
  "narrative-flow",
] as const;

export type KnownCriterionKey = (typeof KNOWN_CRITERION_KEYS)[number];

/**
 * Valideer dat een config klopt: pillars sum to 1.0, criteria-weights
 * binnen elke pillar sum to 1.0, exact 3 pillars, exact 6 criteria.
 *
 * Returns array van foutmeldingen (leeg = valid).
 */
export function validateFidelityConfig(
  config: ContentTypeFidelityConfig,
): string[] {
  const errors: string[] = [];

  if (config.pillars.length !== 3) {
    errors.push(`Expected exactly 3 pillars, got ${config.pillars.length}`);
  }
  if (config.criteria.length !== 6) {
    errors.push(`Expected exactly 6 criteria, got ${config.criteria.length}`);
  }

  const pillarWeightSum = config.pillars.reduce((s, p) => s + p.weight, 0);
  if (Math.abs(pillarWeightSum - 1.0) > 0.001) {
    errors.push(
      `Pillar weights sum to ${pillarWeightSum.toFixed(3)}, expected 1.0`,
    );
  }

  for (const pillarKey of FIDELITY_PILLAR_KEYS) {
    const inPillar = config.criteria.filter((c) => c.pillar === pillarKey);
    if (inPillar.length === 0) continue;
    const sum = inPillar.reduce((s, c) => s + c.weight, 0);
    if (Math.abs(sum - 1.0) > 0.001) {
      errors.push(
        `Criterion weights in pillar '${pillarKey}' sum to ${sum.toFixed(3)}, expected 1.0`,
      );
    }
  }

  if (
    config.compositeThreshold < 0 ||
    config.compositeThreshold > 100
  ) {
    errors.push(
      `Composite threshold ${config.compositeThreshold} out of range 0-100`,
    );
  }

  return errors;
}
