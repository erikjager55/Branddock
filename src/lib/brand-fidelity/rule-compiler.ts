// ============================================================
// BrandRule compiler — pijler 3 scoring runtime
//
// Compileert workspace-BrandRule records (FORBIDDEN_WORD,
// REQUIRED_PHRASE, STYLE_LIMIT, PILLAR_REFERENCE) tot evaluators
// die tegen gegenereerde content gedraaid worden. Output:
// RuleViolation[] + ruleScore (0-100, gewogen op severity).
//
// Cached per workspace (60s in-memory) zodat we niet elke generatie
// 100+ rules opnieuw uit DB halen + compileren.
//
// RuleViolation shape matched ContentFidelityScore.ruleViolations Json
// (zie schema.prisma) voor latere persistence in pijler 2 G-Eval rubric.
// ============================================================

import { prisma } from '@/lib/prisma';
import type { BrandRule, BrandRuleType } from '@prisma/client';

// ─── Types ───────────────────────────────────────────

export interface RuleViolation {
  ruleId: string;
  ruleType: BrandRuleType;
  pattern: string;
  severity: 'info' | 'warning' | 'error';
  message: string;
  /** Concrete match in de content (vb: "synergy") */
  snippet: string;
  /** Position in text (0-based char offset) */
  position: number;
}

export interface RuleEvaluationResult {
  /** All violations found */
  violations: RuleViolation[];
  /** 0-100 score; 100 = no violations, lower = more/heavier violations */
  ruleScore: number;
  /** Per-severity counts */
  byCount: { error: number; warning: number; info: number };
  /** Per-rule-type counts */
  byType: Record<BrandRuleType, number>;
  /** Word count of input (for normalization) */
  wordCount: number;
  /** Number of active rules evaluated */
  rulesEvaluated: number;
}

interface CompiledRule {
  rule: BrandRule;
  /** Compiled regex (for FORBIDDEN_WORD literal patterns: word-boundary wrap; regex patterns: as-is) */
  regex?: RegExp;
  /** For REQUIRED_PHRASE: phrase to find */
  requiredPhrase?: string;
  /** For STYLE_LIMIT: parsed limit type and value */
  styleLimit?: { kind: 'maxSentenceLength' | 'maxBullets' | 'maxConsecutiveBullets'; value: number };
  /** For PILLAR_REFERENCE: keywords any of which must appear */
  pillarKeywords?: string[];
}

// ─── Cache ──────────────────────────────────────────

interface CacheEntry {
  compiled: CompiledRule[];
  expiresAt: number;
}

const cache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 60_000; // 60s

export function clearRuleCompilerCache(workspaceId?: string): void {
  if (workspaceId) cache.delete(workspaceId);
  else cache.clear();
}

// ─── Compilation ────────────────────────────────────

const SEVERITY_WEIGHTS: Record<string, number> = {
  info: 0.5,
  warning: 1.0,
  error: 2.0,
};

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function compileRule(rule: BrandRule): CompiledRule | null {
  try {
    if (rule.ruleType === 'FORBIDDEN_WORD') {
      const pattern = rule.patternIsRegex
        ? rule.pattern
        : `\\b${escapeRegex(rule.pattern)}\\b`;
      return { rule, regex: new RegExp(pattern, 'gi') };
    }

    if (rule.ruleType === 'REQUIRED_PHRASE') {
      // For required phrase: store both literal and a regex for case-insensitive contains check
      return { rule, requiredPhrase: rule.pattern.toLowerCase() };
    }

    if (rule.ruleType === 'STYLE_LIMIT') {
      // Pattern format: "maxSentenceLength:25" | "maxBullets:5" | "maxConsecutiveBullets:3"
      const m = rule.pattern.match(/^(maxSentenceLength|maxBullets|maxConsecutiveBullets):(\d+)$/);
      if (!m) return null;
      const kind = m[1] as 'maxSentenceLength' | 'maxBullets' | 'maxConsecutiveBullets';
      const value = parseInt(m[2], 10);
      if (!Number.isFinite(value) || value < 1) return null;
      return { rule, styleLimit: { kind, value } };
    }

    if (rule.ruleType === 'PILLAR_REFERENCE') {
      // Pattern: comma-separated keywords; any of which must appear in content
      const keywords = rule.pattern
        .split(',')
        .map((k) => k.trim().toLowerCase())
        .filter(Boolean);
      if (keywords.length === 0) return null;
      return { rule, pillarKeywords: keywords };
    }

    return null;
  } catch (err) {
    console.warn(`[rule-compiler] Failed to compile rule ${rule.id}:`, (err as Error).message);
    return null;
  }
}

async function getCompiledRules(workspaceId: string): Promise<CompiledRule[]> {
  const cached = cache.get(workspaceId);
  if (cached && cached.expiresAt > Date.now()) return cached.compiled;

  const rules = await prisma.brandRule.findMany({
    where: { workspaceId, isActive: true },
  });
  const compiled = rules
    .map((r) => compileRule(r))
    .filter((c): c is CompiledRule => c !== null);

  cache.set(workspaceId, { compiled, expiresAt: Date.now() + CACHE_TTL_MS });
  return compiled;
}

// ─── Evaluation ─────────────────────────────────────

function severity(rule: BrandRule): 'info' | 'warning' | 'error' {
  if (rule.severity === 'error' || rule.severity === 'info') return rule.severity;
  return 'warning';
}

function evaluateForbiddenWord(text: string, c: CompiledRule): RuleViolation[] {
  if (!c.regex) return [];
  const out: RuleViolation[] = [];
  for (const m of text.matchAll(c.regex)) {
    if (m.index === undefined) continue;
    out.push({
      ruleId: c.rule.id,
      ruleType: 'FORBIDDEN_WORD',
      pattern: c.rule.pattern,
      severity: severity(c.rule),
      message: c.rule.message ?? `Vermijd "${m[0]}"`,
      snippet: m[0],
      position: m.index,
    });
  }
  return out;
}

function evaluateRequiredPhrase(text: string, c: CompiledRule): RuleViolation[] {
  if (!c.requiredPhrase) return [];
  if (text.toLowerCase().includes(c.requiredPhrase)) return [];
  // One violation: the phrase is missing entirely
  return [
    {
      ruleId: c.rule.id,
      ruleType: 'REQUIRED_PHRASE',
      pattern: c.rule.pattern,
      severity: severity(c.rule),
      message: c.rule.message ?? `Verplichte formulering ontbreekt: "${c.rule.pattern}"`,
      snippet: '',
      position: 0,
    },
  ];
}

function evaluateStyleLimit(text: string, c: CompiledRule): RuleViolation[] {
  if (!c.styleLimit) return [];
  const out: RuleViolation[] = [];
  const { kind, value } = c.styleLimit;

  if (kind === 'maxSentenceLength') {
    // Split on . ! ? followed by space + capital
    const sentences = text.split(/(?<=[.!?])\s+(?=[A-Z])/g);
    sentences.forEach((s, i) => {
      const wc = s.trim().split(/\s+/).filter(Boolean).length;
      if (wc > value) {
        out.push({
          ruleId: c.rule.id,
          ruleType: 'STYLE_LIMIT',
          pattern: c.rule.pattern,
          severity: severity(c.rule),
          message: c.rule.message ?? `Zin van ${wc} woorden overschrijdt limiet (${value})`,
          snippet: s.slice(0, 80) + (s.length > 80 ? '…' : ''),
          position: text.indexOf(s),
        });
      }
    });
  } else if (kind === 'maxBullets') {
    const bullets = (text.match(/^[-*•]\s+/gm) ?? []).length;
    if (bullets > value) {
      out.push({
        ruleId: c.rule.id,
        ruleType: 'STYLE_LIMIT',
        pattern: c.rule.pattern,
        severity: severity(c.rule),
        message: c.rule.message ?? `${bullets} bullets overschrijdt limiet (${value})`,
        snippet: '',
        position: 0,
      });
    }
  } else if (kind === 'maxConsecutiveBullets') {
    const re = new RegExp(`^(\\s*[-*•]\\s+\\S.*\\n){${value + 1},}`, 'gm');
    for (const m of text.matchAll(re)) {
      if (m.index === undefined) continue;
      out.push({
        ruleId: c.rule.id,
        ruleType: 'STYLE_LIMIT',
        pattern: c.rule.pattern,
        severity: severity(c.rule),
        message: c.rule.message ?? `Te veel opeenvolgende bullets (limiet: ${value})`,
        snippet: m[0].slice(0, 80) + '…',
        position: m.index,
      });
    }
  }

  return out;
}

function evaluatePillarReference(text: string, c: CompiledRule): RuleViolation[] {
  if (!c.pillarKeywords || c.pillarKeywords.length === 0) return [];
  const lower = text.toLowerCase();
  const found = c.pillarKeywords.some((k) => lower.includes(k));
  if (found) return [];
  return [
    {
      ruleId: c.rule.id,
      ruleType: 'PILLAR_REFERENCE',
      pattern: c.rule.pattern,
      severity: severity(c.rule),
      message:
        c.rule.message ??
        `Output mist verwijzing naar één van: ${c.pillarKeywords.join(', ')}`,
      snippet: '',
      position: 0,
    },
  ];
}

// ─── Public API ─────────────────────────────────────

/**
 * Evaluate workspace BrandRules against generated content.
 * Returns violations + composite ruleScore (0-100).
 */
export async function evaluateBrandRules(
  workspaceId: string,
  text: string,
): Promise<RuleEvaluationResult> {
  const compiled = await getCompiledRules(workspaceId);
  const violations: RuleViolation[] = [];

  for (const c of compiled) {
    switch (c.rule.ruleType) {
      case 'FORBIDDEN_WORD':
        violations.push(...evaluateForbiddenWord(text, c));
        break;
      case 'REQUIRED_PHRASE':
        violations.push(...evaluateRequiredPhrase(text, c));
        break;
      case 'STYLE_LIMIT':
        violations.push(...evaluateStyleLimit(text, c));
        break;
      case 'PILLAR_REFERENCE':
        violations.push(...evaluatePillarReference(text, c));
        break;
    }
  }

  const wordCount = text.trim().split(/\s+/).filter(Boolean).length;

  // Score: weighted violations divided by word count, mapped to 0-100
  // 0 violations → 100. ~1 weighted violation per 100 words → 80. Steeper falloff.
  const weightedViolations = violations.reduce(
    (sum, v) => sum + (SEVERITY_WEIGHTS[v.severity] ?? 1),
    0,
  );
  const violationsPer1000 = wordCount > 0 ? (weightedViolations / wordCount) * 1000 : 0;
  // 0 v/1k → 100, 5 v/1k → 80, 20 v/1k → 50, 50 v/1k → 0
  const ruleScore = Math.max(0, Math.min(100, Math.round(100 - violationsPer1000 * 2)));

  const byCount = { error: 0, warning: 0, info: 0 };
  const byType: Record<BrandRuleType, number> = {
    FORBIDDEN_WORD: 0,
    REQUIRED_PHRASE: 0,
    STYLE_LIMIT: 0,
    PILLAR_REFERENCE: 0,
  };
  for (const v of violations) {
    byCount[v.severity]++;
    byType[v.ruleType]++;
  }

  return {
    violations,
    ruleScore,
    byCount,
    byType,
    wordCount,
    rulesEvaluated: compiled.length,
  };
}
