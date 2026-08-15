// ============================================================
// StyleguideRule → F-VAL rules-pijler (DB + cache-laag)
//
// Derde violation-bron naast evaluateBrandRules (BrandRule) en
// evaluateHeuristics (locale-packs). Materialiseert niets: de regels blijven
// in `StyleguideRule` staan en worden hier direct gecompileerd — zie
// ADR 2026-08-14-styleguide-rules-in-fval, D1.
//
// Twee gates, allebei bewust gelijk aan de context-injectie zodat "wat de AI
// krijgt" en "waarop we scoren" niet uit elkaar lopen:
//   1. `styleguide.published` — dezelfde gate als brand-context.ts
//   2. per-sectie save-for-AI — via isRuleSectionSavedForAi
//
// De pure compile/evaluate-logica staat in styleguide-rule-checks.ts.
// ============================================================

import { prisma } from "@/lib/prisma";
import type { RuleViolation } from "./rule-compiler";
import { expandStemVariants } from "./brand-rule-sync";
import {
  compileStyleguideRules,
  evaluateCompiledStyleguideRules,
  type CompiledStyleguideRule,
} from "./styleguide-rule-checks";
import {
  isRuleSectionSavedForAi,
  RULE_SECTION_GATE_SELECT,
} from "@/lib/brandstyle/rule-sections";

// ─── Types ──────────────────────────────────────────

export interface StyleguideRuleEvaluation {
  violations: RuleViolation[];
  /** Regels die daadwerkelijk als tekst-check gedraaid zijn. */
  evaluated: number;
  /** Totaal aantal regels op de styleguide (vóór alle gates). */
  total: number;
  /** Regels met een visuele constraint — voorbehouden aan de renderer (fase D). */
  skippedVisual: number;
  /** Regels zonder constraint: niet afdwingbaar. */
  skippedUnconstrained: number;
  /** Regels met een aanwezige maar ongeldige constraint. */
  invalid: number;
  /** Regels uit een sectie waarvan de save-for-AI-vlag uitstaat. */
  skippedGated: number;
}

const EMPTY: StyleguideRuleEvaluation = {
  violations: [],
  evaluated: 0,
  total: 0,
  skippedVisual: 0,
  skippedUnconstrained: 0,
  invalid: 0,
  skippedGated: 0,
};

// ─── Cache ──────────────────────────────────────────

interface CacheEntry {
  compiled: CompiledStyleguideRule[];
  counts: Omit<StyleguideRuleEvaluation, "violations" | "evaluated">;
  expiresAt: number;
}

const cache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 60_000; // 60s — gelijk aan rule-compiler.ts

/**
 * Leeg de compile-cache. Verplicht aan te roepen door élke mutatie van
 * StyleguideRule of van de save-for-AI-vlaggen; zonder dat blijft een
 * regelwijziging tot 60s onzichtbaar in de scoring.
 */
export function clearStyleguideRuleCache(workspaceId?: string): void {
  if (workspaceId) cache.delete(workspaceId);
  else cache.clear();
}

// ─── Compilatie ─────────────────────────────────────

async function getCompiled(workspaceId: string): Promise<CacheEntry> {
  const cached = cache.get(workspaceId);
  if (cached && cached.expiresAt > Date.now()) return cached;

  const styleguide = await prisma.brandStyleguide.findUnique({
    where: { workspaceId },
    select: {
      published: true,
      ...RULE_SECTION_GATE_SELECT,
      rules: {
        select: {
          id: true,
          section: true,
          kind: true,
          severity: true,
          title: true,
          description: true,
          constraint: true,
        },
      },
    },
  });

  const entry: CacheEntry = {
    compiled: [],
    counts: {
      total: styleguide?.rules.length ?? 0,
      skippedVisual: 0,
      skippedUnconstrained: 0,
      invalid: 0,
      skippedGated: 0,
    },
    expiresAt: Date.now() + CACHE_TTL_MS,
  };

  if (!styleguide || styleguide.rules.length === 0) {
    cache.set(workspaceId, entry);
    return entry;
  }

  // Niet-gepubliceerde styleguide: de merkcontext wordt óók niet geïnjecteerd
  // (brand-context.ts hanteert dezelfde gate), dus scoren op deze regels zou
  // meten wat de generator nooit gezien heeft. Wél luid melden — "ik heb
  // regels toegevoegd en er gebeurt niets" is precies de stille nul die deze
  // taak wegneemt.
  if (!styleguide.published) {
    console.warn(
      `[styleguide-rules] workspace ${workspaceId}: ${entry.counts.total} regel(s) aanwezig, ` +
        `maar de styleguide is niet gepubliceerd — regels tellen pas mee na finalize.`,
    );
    cache.set(workspaceId, entry);
    return entry;
  }

  const gated = styleguide.rules.filter((r) => isRuleSectionSavedForAi(styleguide, r.section));
  entry.counts.skippedGated = styleguide.rules.length - gated.length;

  const result = compileStyleguideRules(gated, {
    expandStemVariants,
    onInvalid: (ruleId, reason) => {
      console.warn(
        `[styleguide-rules] ongeldige constraint op regel ${ruleId} (workspace ${workspaceId}): ${reason}`,
      );
    },
  });

  entry.compiled = result.compiled;
  entry.counts.skippedVisual = result.skippedVisual;
  entry.counts.skippedUnconstrained = result.skippedUnconstrained;
  entry.counts.invalid = result.invalid;

  // D3 — een nul mag niet stil zijn. Dit is exact de toestand die de
  // Stap-0-spike maat: regels aanwezig, scoring ziet er geen enkele.
  if (result.compiled.length === 0) {
    console.warn(
      `[styleguide-rules] workspace ${workspaceId}: ${entry.counts.total} regel(s), 0 tekst-checkbaar ` +
        `(visueel: ${result.skippedVisual}, zonder constraint: ${result.skippedUnconstrained}, ` +
        `ongeldig: ${result.invalid}, gated: ${entry.counts.skippedGated}) — ` +
        `de rules-pijler kan deze regels niet handhaven.`,
    );
  }

  cache.set(workspaceId, entry);
  return entry;
}

// ─── Public API ─────────────────────────────────────

/**
 * Evalueer de tekst-checkbare styleguide-regels van een workspace tegen content.
 *
 * Visuele regels worden geteld maar nooit geëvalueerd — die horen bij de
 * renderer, niet bij de tekst-pijler.
 *
 * @param workspaceId - workspace waarvan de styleguide gelezen wordt
 * @param text - de te scoren content
 */
export async function evaluateStyleguideRules(
  workspaceId: string,
  text: string,
): Promise<StyleguideRuleEvaluation> {
  try {
    const entry = await getCompiled(workspaceId);
    return {
      ...entry.counts,
      evaluated: entry.compiled.length,
      violations: evaluateCompiledStyleguideRules(text, entry.compiled),
    };
  } catch (err) {
    // Fail-soft: een kapotte regelset mag een scoring nooit afschieten. De
    // andere twee bronnen (BrandRule + heuristics) blijven gewoon draaien.
    console.error(`[styleguide-rules] evaluatie mislukt voor workspace ${workspaceId}:`, err);
    return EMPTY;
  }
}
