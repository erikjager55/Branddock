/**
 * Fidelity rule-engine — deterministic scoring for criteria where
 * scoring can happen in code without an AI-judge.
 *
 * Cat 6 — leerlus-werkstroom sessie 2 + Phase 4 (fidelity-scorer).
 *
 * Each rule takes content + context, returns a score (0-100) and a list
 * of rule-violations. Used by `fidelity-scorer.ts` for sub-criteria
 * marked `source: 'deterministic'` in `fidelity-criteria.ts`.
 *
 * Rules zijn opzettelijk simpel — geen externe libraries, geen NLP.
 * Grof maar reproduceerbaar. AI-judge dekt subjectieve dimensies.
 */

import type { RuleViolation } from "@/types/learning-loop";

export interface RuleContext {
  content: string;
  deliverableTypeId?: string;
  contentTypeInputs?: Record<string, unknown>;
}

export interface RuleResult {
  score: number; // 0-100
  rationale?: string;
  violations: RuleViolation[];
}

// ─────────────────────────────────────────────────────────────────────────
// Rule implementations
// ─────────────────────────────────────────────────────────────────────────

function scoreSeoCraftsmanship(ctx: RuleContext): RuleResult {
  const violations: RuleViolation[] = [];
  let score = 100;

  const targetKeyword =
    typeof ctx.contentTypeInputs?.seoKeyword === "string"
      ? ctx.contentTypeInputs.seoKeyword.trim().toLowerCase()
      : "";

  if (targetKeyword) {
    const lowerContent = ctx.content.toLowerCase();
    const escaped = targetKeyword.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const occurrences = (lowerContent.match(new RegExp(escaped, "g")) ?? [])
      .length;
    if (occurrences === 0) {
      score -= 40;
      violations.push({
        ruleId: "seo.target-keyword-missing",
        severity: "error",
        message: `Target keyword "${targetKeyword}" does not appear in content`,
        source: "rule-engine",
      });
    } else if (occurrences < 2) {
      score -= 15;
      violations.push({
        ruleId: "seo.keyword-density-low",
        severity: "warning",
        message: `Target keyword appears only ${occurrences}× — aim for 2-5 instances`,
        source: "rule-engine",
      });
    }
  }

  // Markdown heading structure (works for plain markdown content)
  const hasH1 = /^#\s/m.test(ctx.content);
  const h2Count = (ctx.content.match(/^##\s/gm) ?? []).length;
  if (!hasH1 && ctx.content.length > 500) {
    score -= 15;
    violations.push({
      ruleId: "seo.missing-h1",
      severity: "warning",
      message: "Content lacks an H1 heading",
      source: "rule-engine",
    });
  }
  if (h2Count < 2 && ctx.content.length > 1000) {
    score -= 10;
    violations.push({
      ruleId: "seo.few-h2-headings",
      severity: "info",
      message: "Long content benefits from multiple H2 sections",
      source: "rule-engine",
    });
  }

  return { score: Math.max(0, score), violations };
}

function scoreDeliverabilityTechnical(ctx: RuleContext): RuleResult {
  const violations: RuleViolation[] = [];
  let score = 100;

  const SPAM_PHRASES = [
    "act now",
    "limited time",
    "click here",
    "buy now",
    "100% free",
    "risk-free",
    "guaranteed",
    "no obligation",
    "winner",
  ];
  const lowerContent = ctx.content.toLowerCase();
  let spamHits = 0;
  for (const phrase of SPAM_PHRASES) {
    if (lowerContent.includes(phrase)) {
      spamHits++;
      violations.push({
        ruleId: "deliverability.spam-trigger",
        severity: "warning",
        message: `Phrase "${phrase}" is a common spam-filter trigger`,
        snippet: phrase,
        source: "rule-engine",
      });
    }
  }
  score -= Math.min(50, spamHits * 10);

  // Excessive ALL-CAPS words (4+ chars) — also a spam signal
  const capsHits = (ctx.content.match(/\b[A-Z]{4,}\b/g) ?? []).length;
  if (capsHits > 3) {
    score -= 15;
    violations.push({
      ruleId: "deliverability.excessive-caps",
      severity: "warning",
      message: `${capsHits} all-caps words — reduce to avoid spam filters`,
      source: "rule-engine",
    });
  }

  // Exclamation overload
  const exclam = (ctx.content.match(/!/g) ?? []).length;
  if (exclam > 3) {
    score -= 10;
    violations.push({
      ruleId: "deliverability.excessive-exclamation",
      severity: "info",
      message: `${exclam} exclamation marks — emails with >3 trigger filters`,
      source: "rule-engine",
    });
  }

  return { score: Math.max(0, score), violations };
}

function scoreProductionReadiness(ctx: RuleContext): RuleResult {
  const violations: RuleViolation[] = [];
  let score = 100;

  const hasTimingCues = /\b\d+\s*(s|sec|second|minute|min)\b/i.test(ctx.content);
  const hasSceneMarkers = /\b(SCENE|CUT TO|FADE|INT\.|EXT\.|VO\b|VOICEOVER)/i.test(
    ctx.content,
  );
  const hasActionNotes = /\([^)]{3,}\)/.test(ctx.content);

  if (!hasTimingCues) {
    score -= 25;
    violations.push({
      ruleId: "production.missing-timing-cues",
      severity: "warning",
      message:
        'Video/audio scripts should include timing cues (e.g. "0:05", "30s")',
      source: "rule-engine",
    });
  }
  if (!hasSceneMarkers && !hasActionNotes) {
    score -= 20;
    violations.push({
      ruleId: "production.missing-scene-markers",
      severity: "info",
      message:
        "No scene markers or action notes found — production crew needs these",
      source: "rule-engine",
    });
  }

  return { score: Math.max(0, score), violations };
}

// ─────────────────────────────────────────────────────────────────────────
// Public API
// ─────────────────────────────────────────────────────────────────────────

const RULES: Record<string, (ctx: RuleContext) => RuleResult> = {
  "seo-craftsmanship": scoreSeoCraftsmanship,
  "deliverability-technical": scoreDeliverabilityTechnical,
  "production-readiness": scoreProductionReadiness,
};

/**
 * Run a deterministic rule for a given criterion-key. Returns null if no
 * rule is registered (caller falls back to AI-judge).
 */
export function runDeterministicRule(
  criterionKey: string,
  ctx: RuleContext,
): RuleResult | null {
  const rule = RULES[criterionKey];
  if (!rule) return null;
  return rule(ctx);
}

/** Set of criterion-keys that have a deterministic implementation. */
export const DETERMINISTIC_CRITERIA = new Set(Object.keys(RULES));
