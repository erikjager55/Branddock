// ============================================================
// StyleguideRule → tekst-checks (pure)
//
// Compileert `StyleguideRule`-records met een tekst-constraint tot
// evaluators, en draait die tegen content. Géén Prisma, géén cache, géén
// IO — zodat smoke-tests en evals deze logica zonder database kunnen
// draaien (zelfde seam als brand-library/views.ts).
//
// De DB- en cache-laag zit in styleguide-rule-compiler.ts.
//
// Visuele constraints komen hier NOOIT doorheen: die horen bij de renderer
// (analyzer-plan fase D). Ze worden geteld, niet geëvalueerd — zie
// ADR 2026-08-14-styleguide-rules-in-fval, D2/D3.
// ============================================================

import type { RuleKind, RuleSeverity, BrandRuleType } from "@prisma/client";
import type { RuleViolation } from "./rule-compiler";
import {
  countWords,
  findEmoji,
  findExclamationMarks,
  findMatches,
  splitSentences,
  unicodeWordBoundaryRegex,
} from "./text-matchers";
import {
  isTextConstraint,
  isVisualConstraint,
  parseRuleConstraint,
  type TextRuleConstraint,
} from "@/lib/brandstyle/rule-constraints";

/**
 * Prefix waarmee een styleguide-violation te onderscheiden is van
 * BrandRule/heuristic. Volledige vorm: `styleguide:<section>:<id>` — dezelfde
 * opzet als `heuristic:<locale>:<category>:<term>`, zodat `inferCategory` de
 * sectie kan lezen zonder extra parameter.
 */
export const STYLEGUIDE_RULE_ID_PREFIX = "styleguide:";

/** Bouw de synthetische ruleId voor een styleguide-regel. */
export function styleguideRuleId(section: string, id: string): string {
  return `${STYLEGUIDE_RULE_ID_PREFIX}${section}:${id}`;
}

/** De velden die de compiler van een `StyleguideRule` nodig heeft. */
export interface StyleguideRuleInput {
  id: string;
  section: string;
  kind: RuleKind;
  severity: RuleSeverity;
  title: string;
  description: string | null;
  constraint: unknown;
}

export interface CompiledStyleguideRule {
  ruleId: string;
  section: string;
  /** BLOCKING → 'error' (gewicht 3), ADVISORY → 'warning' (gewicht 1). */
  severity: "error" | "warning";
  /** De regeltekst zelf — dat is wat de gebruiker geschreven heeft. */
  message: string;
  /** Menselijk leesbare pattern-omschrijving voor de violation-payload. */
  pattern: string;
  ruleType: BrandRuleType;
  constraint: TextRuleConstraint;
  regexes?: RegExp[];
  phrase?: string;
  maxWords?: number;
}

export interface StyleguideCompileResult {
  compiled: CompiledStyleguideRule[];
  /** Totaal aantal regels op de styleguide. */
  total: number;
  /** Regels met een visuele constraint — voorbehouden aan de renderer. */
  skippedVisual: number;
  /** Regels zonder constraint: niet afdwingbaar, dus geen score-effect. */
  skippedUnconstrained: number;
  /** Regels met een constraint die niet valideert. */
  invalid: number;
}

export interface CompileOptions {
  /**
   * Expander voor `stemVariants: true`. Geïnjecteerd zodat deze module puur
   * blijft; de DB-laag geeft `expandStemVariants` uit brand-rule-sync mee.
   */
  expandStemVariants?: (word: string) => string[];
  /** Wordt aangeroepen per regel met een aanwezige maar ongeldige constraint. */
  onInvalid?: (ruleId: string, reason: string) => void;
}

// ─── Compilatie ─────────────────────────────────────

function toSeverity(severity: RuleSeverity): "error" | "warning" {
  return severity === "BLOCKING" ? "error" : "warning";
}

/**
 * Welk `BrandRuleType` draagt de violation? `RuleViolation` is gedeeld met de
 * BrandRule-lane, dus elke check kiest het type dat downstream de juiste
 * finding-categorie en byType-telling oplevert.
 */
function toRuleType(check: TextRuleConstraint["check"]): BrandRuleType {
  if (check === "required-phrase") return "REQUIRED_PHRASE";
  if (check === "max-sentence-words") return "STYLE_LIMIT";
  return "FORBIDDEN_WORD";
}

function describePattern(constraint: TextRuleConstraint): string {
  switch (constraint.check) {
    case "forbidden-words":
      return constraint.words.join(", ");
    case "forbidden-pattern":
      return constraint.pattern;
    case "required-phrase":
      return constraint.phrase;
    case "max-sentence-words":
      return `max-sentence-words:${constraint.max}`;
    default:
      return constraint.check;
  }
}

function compileOne(
  rule: StyleguideRuleInput,
  constraint: TextRuleConstraint,
  options: CompileOptions,
): CompiledStyleguideRule | null {
  const base = {
    ruleId: styleguideRuleId(rule.section, rule.id),
    section: rule.section,
    severity: toSeverity(rule.severity),
    message: rule.description ? `${rule.title} — ${rule.description}` : rule.title,
    pattern: describePattern(constraint),
    ruleType: toRuleType(constraint.check),
    constraint,
  };

  try {
    switch (constraint.check) {
      case "forbidden-words": {
        const expand = constraint.stemVariants ? options.expandStemVariants : undefined;
        const words = constraint.words.flatMap((w) => (expand ? expand(w) : [w]));
        const unique = Array.from(new Set(words.map((w) => w.trim()).filter(Boolean)));
        if (unique.length === 0) return null;
        // Unicode-boundary: "dé" en "één" moeten wél matchen (zie text-matchers).
        return { ...base, regexes: unique.map((w) => unicodeWordBoundaryRegex(w)) };
      }
      case "forbidden-pattern":
        return { ...base, regexes: [new RegExp(constraint.pattern, "gi")] };
      case "required-phrase":
        return { ...base, phrase: constraint.phrase.toLowerCase() };
      case "max-sentence-words":
        return { ...base, maxWords: constraint.max };
      case "no-emoji":
      case "no-exclamation-marks":
        return base;
    }
  } catch (err) {
    options.onInvalid?.(rule.id, err instanceof Error ? err.message : String(err));
    return null;
  }
}

/**
 * Compileer een set styleguide-regels tot tekst-evaluators.
 *
 * Alleen regels met een `modality: 'text'`-constraint compileren. Alle andere
 * worden geteld zodat de aanroeper "0 evalueerbare regels" zichtbaar kan
 * maken in plaats van stil te scoren met een lege set (D3).
 */
export function compileStyleguideRules(
  rules: StyleguideRuleInput[],
  options: CompileOptions = {},
): StyleguideCompileResult {
  const compiled: CompiledStyleguideRule[] = [];
  let skippedVisual = 0;
  let skippedUnconstrained = 0;
  let invalid = 0;

  for (const rule of rules) {
    if (rule.constraint === null || rule.constraint === undefined) {
      skippedUnconstrained++;
      continue;
    }
    let reason: string | null = null;
    const parsed = parseRuleConstraint(rule.constraint, (r) => {
      reason = r;
    });
    if (isVisualConstraint(parsed)) {
      skippedVisual++;
      continue;
    }
    if (!isTextConstraint(parsed)) {
      invalid++;
      options.onInvalid?.(rule.id, reason ?? "onbekende constraint-vorm");
      continue;
    }
    const c = compileOne(rule, parsed, options);
    if (c) compiled.push(c);
    else invalid++;
  }

  return {
    compiled,
    total: rules.length,
    skippedVisual,
    skippedUnconstrained,
    invalid,
  };
}

// ─── Evaluatie ──────────────────────────────────────

function violation(
  c: CompiledStyleguideRule,
  snippet: string,
  position: number,
): RuleViolation {
  return {
    ruleId: c.ruleId,
    ruleType: c.ruleType,
    pattern: c.pattern,
    severity: c.severity,
    message: c.message,
    snippet,
    position,
  };
}

/**
 * Bovengrens op het aantal violations dat één regel mag opleveren.
 *
 * Een brede regel ("geen wij-vorm") matcht in een lange tekst tientallen keren.
 * De ruleScore is dan allang op de vloer, maar élke violation persisteert een
 * `BrandReviewFinding`-rij en vult de findings-lijst — één regel zou zo het
 * hele review-scherm kunnen overspoelen. De cap begrenst de schrijf- en
 * leeslast; het signaal ("deze regel wordt overtreden") blijft intact.
 */
const MAX_VIOLATIONS_PER_RULE = 25;

function evaluateOne(text: string, c: CompiledStyleguideRule): RuleViolation[] {
  switch (c.constraint.check) {
    case "forbidden-words":
    case "forbidden-pattern": {
      const out: RuleViolation[] = [];
      for (const regex of c.regexes ?? []) {
        for (const m of findMatches(text, regex)) {
          out.push(violation(c, m.text, m.index));
        }
      }
      return out;
    }
    case "no-emoji":
      return findEmoji(text).map((m) => violation(c, m.text, m.index));
    case "no-exclamation-marks":
      return findExclamationMarks(text).map((m) => violation(c, m.text, m.index));
    case "required-phrase": {
      if (!c.phrase) return [];
      if (text.toLowerCase().includes(c.phrase)) return [];
      // Document-level: de frase ontbreekt in het geheel. position 0 + lege
      // snippet is de sentinel die dedupeViolations op `doc:<ruleId>` sleutelt.
      return [violation(c, "", 0)];
    }
    case "max-sentence-words": {
      const max = c.maxWords ?? 0;
      if (max <= 0) return [];
      const out: RuleViolation[] = [];
      for (const sentence of splitSentences(text)) {
        const wc = countWords(sentence);
        if (wc <= max) continue;
        const snippet = sentence.slice(0, 80) + (sentence.length > 80 ? "…" : "");
        out.push(violation(c, snippet, text.indexOf(sentence)));
      }
      return out;
    }
  }
}

/** Draai gecompileerde styleguide-regels tegen content. */
export function evaluateCompiledStyleguideRules(
  text: string,
  compiled: CompiledStyleguideRule[],
): RuleViolation[] {
  const out: RuleViolation[] = [];
  for (const c of compiled) {
    out.push(...evaluateOne(text, c).slice(0, MAX_VIOLATIONS_PER_RULE));
  }
  return out;
}
