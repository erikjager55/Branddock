// ============================================================
// StyleguideRule-constraints — het afdwingbare deel van een merkregel
//
// Een `StyleguideRule` draagt een vrije titel ("Don't use gradients on small
// UI elements") plus een optionele, gestructureerde `constraint`. Die
// constraint bepaalt of en waar de regel afgedwongen wordt:
//
//   modality: 'text'   → compileert naar een check in F-VAL's rules-pijler
//                        (styleguide-rule-compiler.ts)
//   modality: 'visual' → herkend en geteld, maar NOOIT in de tekst-pijler;
//                        voorbehouden aan de renderer (analyzer-plan fase D)
//
// Zonder constraint is een regel niet afdwingbaar — die telt als
// `skippedUnconstrained` en beïnvloedt geen enkele score. Dat is bewust:
// modaliteit raden uit een sectienaam of regeltitel zou een heuristiek zijn
// die een score-aftrek veroorzaakt, en een foute aftrek is duurder dan een
// gemiste (ADR 2026-08-14-styleguide-rules-in-fval, D2).
//
// Het vocabulaire spiegelt `RenderConstraints`
// (src/lib/landing-pages/render-constraints.ts), dat dezelfde scheiding al
// maakt: allowEmoji/allowExclamationMarks (tekst) naast allowGradients/
// maxRadiusPx/allowShadow (visueel). Géén tweede begrippenkader.
// ============================================================

import { z } from "zod";

// ─── Grenzen ────────────────────────────────────────

/** Maximale lengte van een `forbidden-pattern`-bron — houdt regex-compilatie voorspelbaar. */
const MAX_PATTERN_LENGTH = 200;
/** Maximaal aantal woorden in één `forbidden-words`-regel. */
const MAX_WORDS = 100;
/** Ondergrens voor `max-sentence-words` — lager is per definitie onhaalbaar. */
const MIN_SENTENCE_WORDS = 5;

/**
 * Geneste quantifiers ((a+)+, (a*)* , (a+)*) veroorzaken catastrofaal
 * backtracking. We weigeren ze bij validatie in plaats van de scoring-run
 * te laten hangen.
 */
const NESTED_QUANTIFIER = /\([^)]*[*+][^)]*\)\s*[*+{]/;

/** Waar komt deze constraint vandaan? Bepaalt hoe makkelijk een batch terug te draaien is. */
export const RULE_CONSTRAINT_ORIGINS = ["user", "deterministic", "ai"] as const;
export type RuleConstraintOrigin = (typeof RULE_CONSTRAINT_ORIGINS)[number];

const originSchema = z.enum(RULE_CONSTRAINT_ORIGINS).default("user");

// ─── Tekst-constraints ──────────────────────────────

const forbiddenWordsSchema = z.object({
  modality: z.literal("text"),
  check: z.literal("forbidden-words"),
  /** Losse woorden of korte frasen; word-boundary-match, case-insensitive. */
  words: z.array(z.string().trim().min(1).max(80)).min(1).max(MAX_WORDS),
  /** NL-morfologie meenemen via expandStemVariants (alleen zinvol bij losse woorden). */
  stemVariants: z.boolean().optional(),
  derivedBy: originSchema,
});

const forbiddenPatternSchema = z.object({
  modality: z.literal("text"),
  check: z.literal("forbidden-pattern"),
  /** Regex-bron zonder flags; wordt met 'gi' gecompileerd. */
  pattern: z
    .string()
    .trim()
    .min(1)
    .max(MAX_PATTERN_LENGTH)
    .refine((p) => !NESTED_QUANTIFIER.test(p), {
      message: "Geneste quantifier — risico op catastrofaal backtracking",
    })
    .refine((p) => {
      try {
        new RegExp(p, "gi");
        return true;
      } catch {
        return false;
      }
    }, { message: "Ongeldige regex" }),
  derivedBy: originSchema,
});

const requiredPhraseSchema = z.object({
  modality: z.literal("text"),
  check: z.literal("required-phrase"),
  /** Moet ergens in de tekst voorkomen (case-insensitive substring). */
  phrase: z.string().trim().min(1).max(200),
  derivedBy: originSchema,
});

const noEmojiSchema = z.object({
  modality: z.literal("text"),
  check: z.literal("no-emoji"),
  derivedBy: originSchema,
});

const noExclamationSchema = z.object({
  modality: z.literal("text"),
  check: z.literal("no-exclamation-marks"),
  derivedBy: originSchema,
});

const maxSentenceWordsSchema = z.object({
  modality: z.literal("text"),
  check: z.literal("max-sentence-words"),
  max: z.number().int().min(MIN_SENTENCE_WORDS).max(200),
  derivedBy: originSchema,
});

const textConstraintSchema = z.discriminatedUnion("check", [
  forbiddenWordsSchema,
  forbiddenPatternSchema,
  requiredPhraseSchema,
  noEmojiSchema,
  noExclamationSchema,
  maxSentenceWordsSchema,
]);

// ─── Visuele constraints ────────────────────────────

/**
 * Bewust breed: de renderer (fase D) bepaalt welke properties hij kent. Wat
 * hier telt is uitsluitend dat de tekst-pijler dit NIET aanraakt.
 */
const visualConstraintSchema = z.object({
  modality: z.literal("visual"),
  property: z.string().trim().min(1).max(64),
  allowed: z.boolean().optional(),
  max: z.number().optional(),
  value: z.string().max(200).optional(),
  derivedBy: originSchema,
});

const ruleConstraintSchema = z.union([textConstraintSchema, visualConstraintSchema]);

// ─── Types ──────────────────────────────────────────

export type TextRuleConstraint = z.infer<typeof textConstraintSchema>;
export type VisualRuleConstraint = z.infer<typeof visualConstraintSchema>;
export type RuleConstraint = z.infer<typeof ruleConstraintSchema>;
export type TextRuleCheck = TextRuleConstraint["check"];

/** Alle tekst-checks — gebruikt door de structurer-prompt en de smoke-tests. */
export const TEXT_RULE_CHECKS: readonly TextRuleCheck[] = [
  "forbidden-words",
  "forbidden-pattern",
  "required-phrase",
  "no-emoji",
  "no-exclamation-marks",
  "max-sentence-words",
] as const;

// ─── Parser ─────────────────────────────────────────

/**
 * Normaliseer de legacy-vorm uit het schema-comment (`{ property: 'gradient',
 * allowed: false }` zonder `modality`) naar een expliciete visuele constraint.
 * Alles met een `property` en zonder `modality` is per definitie visueel — de
 * tekst-checks kennen geen `property`.
 */
function normalizeLegacyShape(raw: Record<string, unknown>): Record<string, unknown> {
  if (typeof raw.modality === "string") return raw;
  if (typeof raw.property === "string") return { ...raw, modality: "visual" };
  return raw;
}

/**
 * Parse een `StyleguideRule.constraint`-JSON naar een getypeerde constraint.
 *
 * Retourneert `null` wanneer het veld leeg is óf niet valideert — nooit een
 * gecoerceerde half-constraint. `onInvalid` krijgt de reden door zodat de
 * aanroeper één keer kan waarschuwen zonder dat deze module logt.
 *
 * @param value - de rauwe `Json?`-waarde uit Prisma
 * @param onInvalid - optionele callback bij ongeldige (maar aanwezige) JSON
 */
export function parseRuleConstraint(
  value: unknown,
  onInvalid?: (reason: string) => void,
): RuleConstraint | null {
  if (value === null || value === undefined) return null;
  if (typeof value !== "object" || Array.isArray(value)) {
    onInvalid?.("constraint is geen object");
    return null;
  }

  const normalized = normalizeLegacyShape(value as Record<string, unknown>);
  const parsed = ruleConstraintSchema.safeParse(normalized);
  if (!parsed.success) {
    onInvalid?.(parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; "));
    return null;
  }
  return parsed.data;
}

/** Validatie-schema voor de CRUD-routes — accepteert exact wat de parser accepteert. */
export const ruleConstraintInputSchema = z
  .record(z.string(), z.unknown())
  .refine((v) => parseRuleConstraint(v) !== null, {
    message:
      "Onbekende constraint-vorm. Verwacht { modality: 'text', check: … } of { modality: 'visual', property: … }",
  });

/** Type-guard: telt deze constraint mee in de tekst-pijler? */
export function isTextConstraint(c: RuleConstraint | null): c is TextRuleConstraint {
  return c !== null && c.modality === "text";
}

/** Type-guard: hoort deze constraint bij de renderer in plaats van bij de tekst-pijler? */
export function isVisualConstraint(c: RuleConstraint | null): c is VisualRuleConstraint {
  return c !== null && c.modality === "visual";
}
