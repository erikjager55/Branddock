/**
 * Variant-tell-rewrite — STRICT-pariteit voor structured webpage-variants
 * (audit 2026-06-10, fase 4).
 *
 * De canvas-orchestrator draait voor STRICT-workspaces een post-generation
 * anti-AI-tell rewrite (runStrictModeIfApplicable) op platte tekst. Het
 * LP-variant-pad sloeg die hele laag over: een workspace met
 * humanVoiceMode=STRICT kreeg voor landing-pages nooit de anti-tell-pass.
 *
 * Deze module levert de JSON-structuurbehoudende variant daarvan:
 *  1. flatten variant → detectAiTells
 *  2. verdict AI_LEANING / PURE_AI → één rewrite-call met concrete
 *     tell-feedback (zelfde formatTellInstruction als strict-mode)
 *  3. re-detect op de rewrite; behoud de betere van origineel/rewrite
 *
 * De rewrite-call zelf is een caller-supplied callback (zelfde patroon als
 * strict-mode RewriteCallback) zodat model-routing bij de route blijft.
 */

import {
  detectAiTells,
  type AiTellResult,
} from "../brand-fidelity/ai-tell-detector";
import { formatTellInstruction } from "../brand-fidelity/strict-mode";
import { flattenVariantToText } from "./flatten-variant";
import type { LandingPageVariantContent } from "./variant-schema";
import { parseLandingPageVariantResponse } from "./variant-generator";

// ─── Gedeelde rewrite-prompt (structuur intact) ──────────

/**
 * Structuurbehoudende rewrite-systemprompt. Gedeeld door de
 * auto-iterate-variant route en de STRICT tell-rewrite zodat beide paden
 * dezelfde JSON-discipline afdwingen.
 */
export const VARIANT_REWRITE_SYSTEM_PROMPT = `Je bent een merk-bewuste copywriter. Je herschrijft de COPY van een gestructureerde landing-page-variant zodat die hoger scoort op een brand-voice + content-quality judge, ZONDER de structuur te veranderen.

Regels:
- Behoud exact dezelfde JSON-structuur: dezelfde keys en hetzelfde aantal array-items.
- Wijzig ALLEEN tekstuele copy-waarden (headline, subhead, bullets, body, quotes, CTA-labels, etc.).
- Wijzig GEEN icon-namen, URLs of niet-tekstuele config.
- Schrijf in de merk-stem; vermijd generieke AI-frasen; behoud feitelijke claims (cijfers, namen, certificeringen) exact.
- Antwoord met UITSLUITEND de volledige JSON-variant, geen uitleg, geen code-fences.`;

/**
 * Compacte tell-feedback voor in een rewrite-user-prompt: top-N detector-tells
 * als concrete herwerk-instructies. Retourneert null wanneer er niets te
 * melden is. Pure functie, geëxporteerd voor smoke-tests.
 */
export function buildVariantTellFeedback(
  detectorResult: AiTellResult,
  topN = 5,
): string | null {
  const top = detectorResult.detected.slice(0, topN).filter((t) => t.count > 0);
  if (top.length === 0) return null;
  const lines = top.map((t) => formatTellInstruction(t)).filter(Boolean);
  if (lines.length === 0) return null;
  return [
    `AI-tell-detector signaleert (${detectorResult.scorePer1000Words.toFixed(0)}/1000, verdict ${detectorResult.verdict}):`,
    ...lines,
  ].join("\n");
}

// ─── STRICT tell-rewrite ─────────────────────────────────

export interface VariantRewriteCallback {
  (params: { systemPrompt: string; userPrompt: string }): Promise<string>;
}

export interface VariantTellRewriteOptions {
  /**
   * Review-fix 2026-06-10: zelfde brand-vocab-whitelist als composition-engine.
   * Zonder deze lijst gate de detector op geseede merkwoorden (Linfi:
   * 'naadloos'/'op maat' staan letterlijk in het lexicon) en beloont
   * keep-if-better juist het stríppen van brand-vocab — wat pijler-1
   * wordsWeUse-coverage en daarmee de composite verlaagt.
   */
  brandVocabulary?: string[];
}

export interface VariantTellRewriteResult {
  variant: LandingPageVariantContent;
  rewritten: boolean;
  before: AiTellResult;
  after: AiTellResult | null;
  decisionReason: string;
}

const REWRITE_VERDICTS = new Set<AiTellResult["verdict"]>([
  "AI_LEANING",
  "PURE_AI",
]);

/** Zelfde improvement-drempel als strict-mode: score moet betekenisvol dalen. */
function isImprovement(before: AiTellResult, after: AiTellResult): boolean {
  if (after.scorePer1000Words >= before.scorePer1000Words) return false;
  const drop = before.scorePer1000Words - after.scorePer1000Words;
  return drop >= 5 || drop / before.scorePer1000Words >= 0.1;
}

/**
 * Detector-gated anti-tell rewrite op een structured variant. Geen detector-
 * trigger → variant ongewijzigd terug (geen LLM-call, ~0 kosten). Rewrite die
 * niet parset of niet verbetert → origineel behouden (fail-soft).
 */
export async function runVariantTellRewriteIfNeeded(
  variant: LandingPageVariantContent,
  rewrite: VariantRewriteCallback,
  options?: VariantTellRewriteOptions,
): Promise<VariantTellRewriteResult> {
  const detectorOptions = { brandVocabulary: options?.brandVocabulary ?? [] };
  const before = detectAiTells(flattenVariantToText(variant), detectorOptions);

  if (!REWRITE_VERDICTS.has(before.verdict)) {
    return {
      variant,
      rewritten: false,
      before,
      after: null,
      decisionReason: `Geen rewrite nodig: verdict ${before.verdict}.`,
    };
  }

  const feedback = buildVariantTellFeedback(before);
  const userPrompt = [
    feedback ?? "De copy bevat te veel AI-typische patronen. Herschrijf menselijker: varieer zinslengte, schrap formule-zinnen.",
    "",
    "Huidige variant (JSON):",
    JSON.stringify(variant),
    "",
    "Geef de verbeterde variant terug als volledige JSON.",
  ].join("\n");

  let raw: string;
  try {
    raw = await rewrite({ systemPrompt: VARIANT_REWRITE_SYSTEM_PROMPT, userPrompt });
  } catch (err) {
    return {
      variant,
      rewritten: false,
      before,
      after: null,
      decisionReason: `Rewrite-call faalde: ${(err as Error).message}. Origineel behouden.`,
    };
  }

  const parsed = parseLandingPageVariantResponse(raw);
  if (!parsed.success) {
    return {
      variant,
      rewritten: false,
      before,
      after: null,
      decisionReason: "Rewrite-output niet parseerbaar als variant. Origineel behouden.",
    };
  }

  const after = detectAiTells(flattenVariantToText(parsed.data), detectorOptions);
  if (isImprovement(before, after)) {
    return {
      variant: parsed.data,
      rewritten: true,
      before,
      after,
      decisionReason: `Tell-score ${before.scorePer1000Words.toFixed(0)} → ${after.scorePer1000Words.toFixed(0)}/1000 (${before.verdict} → ${after.verdict}).`,
    };
  }

  return {
    variant,
    rewritten: false,
    before,
    after,
    decisionReason: `Rewrite verbeterde onvoldoende (${before.scorePer1000Words.toFixed(0)} → ${after.scorePer1000Words.toFixed(0)}/1000). Origineel behouden.`,
  };
}
