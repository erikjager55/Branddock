// =============================================================
// Layer 1 generic property-evals — 15 deterministic checks per variant.
// Sub-sprint #5.A foundation (content-test-improvement-plan.md §2).
//
// Runtime budget: < 100ms cumulatief per variant. Alle checks pure-functions,
// geen AI-calls, geen DB-calls. Hergebruikt franc-min uit brand-language helper.
//
// Severity-policy:
//   - block: 5 checks (placeholder / pii / hallucination-flag / banned-phrase
//     CRITICAL category / brand-mismatch) → SSE error, generation faalt
//   - warn: 8 checks → logged naar AICallTrace.propertyEvalResults, doorgaan
//   - info: 2 checks (duplicate-content / minimum-heading-count) → telemetry-only
// =============================================================

import { franc } from 'franc-min';
import type {
  PropertyEvalCheckId,
  PropertyEvalContext,
  PropertyEvalResult,
  PropertyEvalRunResult,
} from './types';
import { findBannedPhrase } from './banned-phrases';

// ─── Helpers ──────────────────────────────────────────────────

/** ISO 639-3 (franc) → ISO 639-1 (workspace contentLanguage). */
const FRANC_TO_ISO1: Record<string, string> = {
  nld: 'nl',
  eng: 'en',
  deu: 'de',
  fra: 'fr',
  spa: 'es',
};

/** Snippet rondom positie voor finding-evidence (max 80 chars). */
function snippetAt(content: string, position: number, radius = 40): string {
  const start = Math.max(0, position - radius);
  const end = Math.min(content.length, position + radius);
  const prefix = start > 0 ? '...' : '';
  const suffix = end < content.length ? '...' : '';
  return `${prefix}${content.slice(start, end).trim()}${suffix}`;
}

/** Word-count via whitespace split (good-enough voor length-bounds). */
function wordCount(content: string): number {
  return content.trim().split(/\s+/).filter(Boolean).length;
}

/** Jaccard distance op token-sets (gebruikt voor duplicate-content check). */
function jaccardDistance(a: string, b: string): number {
  const tokens = (s: string) => new Set(s.toLowerCase().match(/\w+/g) ?? []);
  const setA = tokens(a);
  const setB = tokens(b);
  if (setA.size === 0 && setB.size === 0) return 0;
  const intersection = new Set([...setA].filter((x) => setB.has(x)));
  const union = new Set([...setA, ...setB]);
  return 1 - intersection.size / union.size;
}

// ─── 15 check-functies ────────────────────────────────────────

/**
 * #1 — Schema-valid: variant.content matched verwachte structure-pattern.
 * Minimal v1 check: niet-leeg + geen onbalanced JSON-blocks. Uitbreiding per
 * groupType in #5.B wanneer Promptfoo rubrics per type bestaan.
 */
export function checkSchemaValid(content: string): PropertyEvalResult {
  const trimmed = content.trim();
  if (trimmed.length === 0) {
    return {
      check: 'schema-valid',
      pass: false,
      severity: 'block',
      reason: 'Output is leeg',
    };
  }
  // Onbalanced code-blocks zijn duidelijk schema-faul.
  const codeBlockCount = (trimmed.match(/```/g) ?? []).length;
  if (codeBlockCount % 2 !== 0) {
    return {
      check: 'schema-valid',
      pass: false,
      severity: 'warn',
      reason: `Onbalanced markdown code-blocks (${codeBlockCount} backticks-blocks gedetecteerd)`,
    };
  }
  return { check: 'schema-valid', pass: true, severity: 'info', reason: 'OK' };
}

/**
 * #2 — Language-match: detected language matched expectedLanguage.
 * Hergebruikt franc-min (zelfde lib als detectBrandLanguage helper).
 * Content < 30 chars wordt skip (te kort voor betrouwbare detection).
 */
export function checkLanguageMatch(
  content: string,
  expectedLanguage: string,
): PropertyEvalResult {
  if (content.trim().length < 30) {
    return {
      check: 'language-match',
      pass: true,
      severity: 'info',
      reason: 'Content te kort voor betrouwbare language-detection (skip)',
    };
  }
  const detected = franc(content, { minLength: 30 });
  const detectedIso1 = FRANC_TO_ISO1[detected] ?? 'und';
  if (detectedIso1 === 'und') {
    return {
      check: 'language-match',
      pass: true,
      severity: 'info',
      reason: 'Language undetectable — skip',
    };
  }
  if (detectedIso1 !== expectedLanguage) {
    return {
      check: 'language-match',
      pass: false,
      severity: 'warn',
      reason: `Detected language "${detectedIso1}" wijkt af van expected "${expectedLanguage}"`,
    };
  }
  return { check: 'language-match', pass: true, severity: 'info', reason: 'OK' };
}

/**
 * #3 — Length-bounds: word-count binnen min/max uit deliverable-types.ts.
 */
export function checkLengthBounds(
  content: string,
  bounds: { min: number | null; max: number | null },
): PropertyEvalResult {
  const count = wordCount(content);
  if (bounds.min !== null && count < bounds.min) {
    return {
      check: 'length-bounds',
      pass: false,
      severity: 'warn',
      reason: `Te kort: ${count} woorden < minimum ${bounds.min}`,
    };
  }
  if (bounds.max !== null && count > bounds.max) {
    return {
      check: 'length-bounds',
      pass: false,
      severity: 'warn',
      reason: `Te lang: ${count} woorden > maximum ${bounds.max}`,
    };
  }
  return { check: 'length-bounds', pass: true, severity: 'info', reason: `${count} woorden OK` };
}

/**
 * #4 — Banned-phrase: corporate jargon + AI-tells per taal (banned-phrases.ts).
 */
export function checkBannedPhrase(
  content: string,
  language: string,
): PropertyEvalResult {
  const match = findBannedPhrase(content, language);
  if (!match) {
    return { check: 'banned-phrase', pass: true, severity: 'info', reason: 'OK' };
  }
  return {
    check: 'banned-phrase',
    pass: false,
    severity: 'warn',
    reason: `${match.phrase.category}: "${match.phrase.phrase}" — ${match.phrase.reason}`,
    evidence: snippetAt(content, match.position),
    position: match.position,
  };
}

/**
 * #5 — Brand-name capitalization: workspace.brandName moet correct (case-
 * sensitive) gecapitaliseerd voorkomen in elke mention. Foute case = block.
 */
export function checkBrandNameCapitalization(
  content: string,
  brandName: string,
): PropertyEvalResult {
  if (!brandName || brandName.length < 2) {
    return { check: 'brand-name-capitalization', pass: true, severity: 'info', reason: 'No brand-name to validate' };
  }
  // Case-insensitive find van brand-name; check daarna of de letterlijke case
  // matched. Variants zoals all-lowercase / ALL-CAPS / Titlecase die afwijken
  // van de canonical brandName zijn fouten.
  const escaped = brandName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const pattern = new RegExp(`\\b${escaped}\\b`, 'gi');
  let match: RegExpExecArray | null;
  const wrongCases: string[] = [];
  while ((match = pattern.exec(content)) !== null) {
    if (match[0] !== brandName) {
      wrongCases.push(match[0]);
      if (wrongCases.length >= 3) break;
    }
  }
  if (wrongCases.length > 0) {
    return {
      check: 'brand-name-capitalization',
      pass: false,
      severity: 'block',
      reason: `Brand-name "${brandName}" foutief gecapitaliseerd: ${wrongCases.slice(0, 3).join(', ')}`,
      evidence: wrongCases[0],
    };
  }
  return { check: 'brand-name-capitalization', pass: true, severity: 'info', reason: 'OK' };
}

/**
 * #6 — Placeholder-detection: [PRICE], TBD, €XX, ${...} patterns die wijzen op
 * onvoltooide AI-output. Block-severity — content mag niet gepubliceerd worden.
 */
export function checkPlaceholders(content: string): PropertyEvalResult {
  const patterns: { re: RegExp; label: string }[] = [
    { re: /\[(PRICE|PRIJS|AMOUNT|DATE|DATUM|URL|LINK|TBD|TODO|NAAM|NAME|XXX|FIXME)\]/i, label: 'bracket-placeholder' },
    { re: /\bTBD\b/, label: 'TBD' },
    { re: /€\s*X+(?:\.X+)?/i, label: '€XX' },
    { re: /\$\{[^}]*\}/, label: 'template-literal' },
    { re: /\{\{[^}]+\}\}/, label: 'mustache-template' },
    { re: /<insert[^>]*>/i, label: 'insert-stub' },
  ];
  for (const { re, label } of patterns) {
    const m = re.exec(content);
    if (m) {
      return {
        check: 'placeholder-detection',
        pass: false,
        severity: 'block',
        reason: `Onvoltooide placeholder gevonden: ${label}`,
        evidence: snippetAt(content, m.index),
        position: m.index,
      };
    }
  }
  return { check: 'placeholder-detection', pass: true, severity: 'info', reason: 'OK' };
}

/**
 * #7 — PII/safety: e-mailadressen, NL-telefoonnummers, BSN-patronen mogen niet
 * in AI-output voorkomen tenzij workspace expliciet opt-in heeft (post-pilot).
 * Voor v1: altijd block.
 */
export function checkPiiSafety(content: string): PropertyEvalResult {
  const emailRe = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i;
  const nlPhoneRe = /(?:\+31\s?|\b0)[1-9](?:[\s-]?\d){8}\b/;
  // BSN-regex `/\b\d{8,9}\b/` is deferred — heuristisch + veel false-positives
  // op product-IDs. Validate-11-test komt in #6.A wiring-gates.

  const email = emailRe.exec(content);
  if (email) {
    return {
      check: 'pii-safety',
      pass: false,
      severity: 'block',
      reason: 'E-mailadres in output — privacy-risico',
      evidence: snippetAt(content, email.index),
      position: email.index,
    };
  }
  const phone = nlPhoneRe.exec(content);
  if (phone) {
    return {
      check: 'pii-safety',
      pass: false,
      severity: 'block',
      reason: 'Telefoonnummer in output — privacy-risico',
      evidence: snippetAt(content, phone.index),
      position: phone.index,
    };
  }
  // BSN-check is heuristisch + heeft veel false-positives op product-IDs. Skip
  // pre-pilot; flag in #6.A wiring-gates met validate-11-test.
  return { check: 'pii-safety', pass: true, severity: 'info', reason: 'OK' };
}

/**
 * #8 — Heading-hierarchy: H1 vóór H2 vóór H3, geen sprongen (H1 → H3).
 * Markdown-parsed via regex (good-enough voor 95% van AI-output).
 */
export function checkHeadingHierarchy(content: string): PropertyEvalResult {
  const headings = content.match(/^(#{1,6})\s+.+$/gm) ?? [];
  if (headings.length === 0) {
    return { check: 'heading-hierarchy', pass: true, severity: 'info', reason: 'Geen headings (skip)' };
  }
  let prevLevel = 0;
  for (let i = 0; i < headings.length; i++) {
    const level = headings[i].match(/^#+/)![0].length;
    if (prevLevel > 0 && level > prevLevel + 1) {
      return {
        check: 'heading-hierarchy',
        pass: false,
        severity: 'warn',
        reason: `Heading-sprong: H${prevLevel} → H${level} bij heading ${i + 1}`,
        evidence: headings[i].slice(0, 80),
      };
    }
    prevLevel = level;
  }
  return { check: 'heading-hierarchy', pass: true, severity: 'info', reason: 'OK' };
}

/**
 * #9 — CTA-presence: voor types met requiresCTA=true moet content een
 * action-verb-pattern bevatten (NL/EN imperative).
 */
const ACTION_VERBS_NL = [
  'klik', 'bestel', 'ontdek', 'lees', 'download', 'meld', 'aanmelden',
  'begin', 'start', 'probeer', 'vraag', 'reserveer', 'boek', 'koop',
  'bekijk', 'leer', 'krijg', 'ontvang',
];
const ACTION_VERBS_EN = [
  'click', 'order', 'discover', 'read', 'download', 'sign up', 'register',
  'start', 'try', 'request', 'reserve', 'book', 'buy', 'view', 'learn',
  'get', 'receive', 'join', 'subscribe',
];

export function checkCtaPresence(
  content: string,
  requiresCTA: boolean,
  language: string,
): PropertyEvalResult {
  if (!requiresCTA) {
    return { check: 'cta-presence', pass: true, severity: 'info', reason: 'Type vereist geen CTA' };
  }
  const verbs = language === 'nl' ? ACTION_VERBS_NL : ACTION_VERBS_EN;
  const lower = content.toLowerCase();
  const found = verbs.some((v) => new RegExp(`\\b${v}\\b`, 'i').test(lower));
  if (!found) {
    return {
      check: 'cta-presence',
      pass: false,
      severity: 'warn',
      reason: 'Geen action-verb gedetecteerd; CTA mogelijk zwak of afwezig',
    };
  }
  return { check: 'cta-presence', pass: true, severity: 'info', reason: 'OK' };
}

/**
 * #16 — CTA-quality: meer dan alleen action-verb presence. Toetst op
 * specifiekheid (niet alleen "Submit"), risk-reduction language
 * ("no credit card", "free for X days") en single primary CTA-density.
 *
 * Inspired by Cowork content-creation guidelines: action-verb opening,
 * specificity over generic submit, risk reduction, één primaire CTA.
 */
const RISK_REDUCTION_PATTERNS_NL = [
  /\bgeen\s+creditcard\b/i,
  /\bgratis\s+(?:voor|tot)\s+\d+\s*(?:dag|week|maand)/i,
  /\bopzeggen?\s+wanneer\s+(?:je\s+wilt|gewenst)/i,
  /\bgeen\s+verplichtingen?\b/i,
  /\b(?:gratis|free)\s+proberen\b/i,
  /\b14\s*dagen\s+gratis\b/i,
];
const RISK_REDUCTION_PATTERNS_EN = [
  /\bno\s+credit\s+card\s+required\b/i,
  /\bfree\s+for\s+\d+\s*(?:days?|weeks?|months?)/i,
  /\bcancel\s+(?:anytime|whenever)\b/i,
  /\bno\s+commitment\b/i,
  /\btry\s+(?:it\s+)?free\b/i,
  /\b\d+[-\s]?day\s+free\s+trial\b/i,
];
const GENERIC_CTA_TERMS = [
  /\bsubmit\b/i,
  /\bverstuur\b/i,
  /\bversturen\b/i,
  /\bclick\s+here\b/i,
  /\bklik\s+hier\b/i,
  /\blees\s+meer\b/i,
  /\bmeer\s+info\b/i,
  /\bread\s+more\b/i,
  /\bcontact\s+(?:us|ons)\b/i,
];

export function checkCtaQuality(
  content: string,
  requiresCTA: boolean,
  language: string,
  groupType: string,
): PropertyEvalResult {
  // Alleen relevant voor CTA-bearing groups (cta, button, hero CTA copy).
  // Skip body/headline/meta tenzij requiresCTA true is.
  const isCtaGroup = ['cta', 'button', 'call_to_action'].includes(groupType.toLowerCase());
  if (!isCtaGroup && !requiresCTA) {
    return { check: 'cta-quality', pass: true, severity: 'info', reason: 'Geen CTA-context (skip)' };
  }
  const lower = content.toLowerCase();
  const issues: string[] = [];

  // Generic-CTA detectie ("Submit", "Click here", "Lees meer") — warn omdat
  // specifieker CTA conversie verhoogt.
  const genericMatches = GENERIC_CTA_TERMS.filter((re) => re.test(content));
  if (genericMatches.length > 0 && content.length < 200) {
    issues.push(
      'Generieke CTA-tekst gedetecteerd; specifieker zoals "Start je gratis proefperiode" werkt beter dan "Submit"',
    );
  }

  // Risk-reduction language — alleen flag wanneer dit een CTA-group is
  // (anders is afwezigheid niet relevant). Info-severity want niet altijd nodig.
  const riskPatterns =
    language === 'nl' ? RISK_REDUCTION_PATTERNS_NL : RISK_REDUCTION_PATTERNS_EN;
  const hasRiskReduction = riskPatterns.some((re) => re.test(lower));
  if (!hasRiskReduction && isCtaGroup && content.length > 80) {
    // Alleen voor langere CTAs (hero CTA copy bv) — korte action buttons
    // hoeven geen risk-reduction
    issues.push(
      'Geen risk-reduction language (e.g. "geen creditcard", "14 dagen gratis", "opzeggen wanneer je wilt")',
    );
  }

  // Multi-primary-CTA check: tel hoeveel duidelijke CTAs in content staan.
  // > 1 actiewoord = mogelijk meerdere concurrerende CTAs, kan conversie hurt.
  const verbs = language === 'nl' ? ACTION_VERBS_NL : ACTION_VERBS_EN;
  const verbHits = verbs.reduce(
    (acc, v) => acc + (lower.match(new RegExp(`\\b${v}\\b`, 'g'))?.length ?? 0),
    0,
  );
  if (verbHits > 2 && isCtaGroup) {
    issues.push(
      `Meerdere CTAs (${verbHits}) gedetecteerd; één primaire CTA werkt beter dan meerdere concurrerende acties`,
    );
  }

  if (issues.length === 0) {
    return { check: 'cta-quality', pass: true, severity: 'info', reason: 'OK' };
  }
  return {
    check: 'cta-quality',
    pass: false,
    severity: 'warn',
    reason: issues.join('; '),
  };
}

/**
 * #17 — Meta-description compliance: alleen relevant voor meta_description /
 * meta-description groups. SEO-vereisten: 120-160 chars, niet generic,
 * niet beginnend met "Welkom" / "Wij zijn".
 *
 * Inspired by Cowork content-creation §4.2: meta description ≤ 160 tekens,
 * primair keyword, klikwaardig.
 */
const META_DESC_OPENERS_TO_AVOID = [
  /^welkom\s+bij\b/i,
  /^wij\s+zijn\b/i,
  /^we\s+zijn\b/i,
  /^welcome\s+to\b/i,
  /^we\s+are\b/i,
];

export function checkMetaDescriptionCompliance(
  content: string,
  groupType: string,
): PropertyEvalResult {
  const isMetaDesc = ['meta_description', 'meta-description', 'metadescription'].includes(
    groupType.toLowerCase(),
  );
  if (!isMetaDesc) {
    return { check: 'meta-description-compliance', pass: true, severity: 'info', reason: 'Niet meta-description (skip)' };
  }

  const trimmed = content.trim();
  const length = trimmed.length;
  const issues: string[] = [];

  // SEO sweet-spot: 120-160 chars. Onder 80 = onderbenut, boven 160 = clip in SERP
  if (length < 80) {
    issues.push(`Meta-description ${length} chars — onder SEO-minimum (120-160 sweet-spot)`);
  } else if (length > 160) {
    issues.push(`Meta-description ${length} chars — overschrijdt 160 chars (Google SERP clip)`);
  }

  // Generic-opener detection
  if (META_DESC_OPENERS_TO_AVOID.some((re) => re.test(trimmed))) {
    issues.push('Generieke opener; begin met benefit/keyword i.p.v. "Welkom bij..."');
  }

  // Trailing-dot expectation (klikwaardigheid)
  if (!/[.!?]$/.test(trimmed)) {
    issues.push('Geen eindleesteken — meta-description hoort als volledige zin te eindigen');
  }

  if (issues.length === 0) {
    return { check: 'meta-description-compliance', pass: true, severity: 'info', reason: 'OK' };
  }
  return {
    check: 'meta-description-compliance',
    pass: false,
    severity: 'warn',
    reason: issues.join('; '),
  };
}

/**
 * #18 — Claim-substantiation: detecteert onderbouwingsloze claims die in
 * juridische context risicovol zijn. Improvement #6 uit Cowork-analyse
 * 2026-05-12 (compliance dimensie als 4e BrandReviewFinding-laag).
 *
 * Drie pattern-categorieën:
 *  - Superlatieven zonder onderbouwing ("best", "world's leading")
 *  - Numerieke claims zonder source-language ("50% sneller", "#1 in")
 *  - Sector-specifiek risico (medisch/financieel/juridisch)
 *
 * Alleen warn-severity — false-positives mogelijk bij legitieme claims
 * met externe bronnen. Bedoeld als triage-flag voor brand-review.
 */
const SUPERLATIVE_CLAIMS_PATTERNS = [
  /\b(?:best|beste|grootste|snelste|meest|nummer\s+1|#1)\s+(?:in|van|ter\s+wereld|world'?s|leading)/i,
  /\b(?:guaranteed|gegarandeerd|gewaarborgd)\b/i,
  /\b(?:revolutionary|revolutionair|baanbrekend|disruptive)\b/i,
  /\b(?:unmatched|ongeevenaard|onovertroffen)\b/i,
  /\bworld'?s\s+(?:leading|best|first|most|largest)\b/i,
  /\bproven\s+to\s+(?:cure|heal|treat|fix)\b/i,
];

const NUMERIC_CLAIM_PATTERNS = [
  /\b(?:up\s+to|tot|maximaal)\s+\d+\s*(?:%|procent|x|keer)/i,
  /\b\d+(?:[.,]\d+)?\s*%\s+(?:meer|less|sneller|beter|hoger|lager|faster|better|higher|lower)/i,
  /\b\d+\s*(?:keer|x|times)\s+(?:meer|less|sneller|beter)/i,
  /\#\s*1\s+(?:in|voor|for)/i,
];

const SOURCE_LANGUAGE_PATTERNS = [
  /\b(?:source|bron|according\s+to|volgens|based\s+on|gebaseerd\s+op|study|studie|research|onderzoek|report|rapport)\b/i,
  /\b(?:gartner|forrester|mckinsey|deloitte|nielsen|kantar|cbs)\b/i,
  /\([^)]*\d{4}[^)]*\)/, // (Year YYYY) citatie-pattern
  /\[\d+\]/, // footnote markers
];

const SECTOR_RISK_PATTERNS = [
  /\b(?:cure|cured|geneest|geneest van|treat[sd]?\s+(?:cancer|diabetes|covid))\b/i,
  /\b(?:guaranteed\s+returns?|gegarandeerd\s+rendement|risk[-\s]?free\s+investment|zonder\s+risico\s+beleggen)\b/i,
  /\b(?:fda[-\s]?approved|approved\s+by\s+the\s+fda)\b/i,
];

export function checkClaimSubstantiation(
  content: string,
): PropertyEvalResult {
  // Skip korte content (headlines, CTAs) — substantiation niet verwacht/relevant
  if (content.trim().length < 80) {
    return { check: 'claim-substantiation', pass: true, severity: 'info', reason: 'Content te kort voor claim-analysis (skip)' };
  }
  const hasSourceLanguage = SOURCE_LANGUAGE_PATTERNS.some((re) => re.test(content));
  const issues: string[] = [];

  // Sector-risk patterns are ALWAYS warn (regardless of source-language)
  const sectorRiskMatches = SECTOR_RISK_PATTERNS.filter((re) => re.test(content));
  if (sectorRiskMatches.length > 0) {
    issues.push(
      'Sector-specifiek risicopatroon gedetecteerd (medisch/financieel/regelgeving) — verifieer disclaimer-vereisten en juridische review',
    );
  }

  // Superlatieven en numerieke claims warnen ALLEEN wanneer geen source-language
  if (!hasSourceLanguage) {
    const superlativeMatches = SUPERLATIVE_CLAIMS_PATTERNS.filter((re) => re.test(content));
    if (superlativeMatches.length > 0) {
      issues.push(
        `Onderbouwingsloze superlatief(en) gedetecteerd zoals "${superlativeMatches[0].source}" — voeg bron, jaartal of vergelijking toe`,
      );
    }
    const numericMatches = NUMERIC_CLAIM_PATTERNS.filter((re) => re.test(content));
    if (numericMatches.length > 0) {
      issues.push(
        'Numerieke claim zonder source-language (geen "volgens", "bron", "studie" of (jaartal)-citatie) — voeg verifieerbare bron toe',
      );
    }
  }

  if (issues.length === 0) {
    return { check: 'claim-substantiation', pass: true, severity: 'info', reason: 'OK' };
  }
  return {
    check: 'claim-substantiation',
    pass: false,
    severity: 'warn',
    reason: issues.join('; '),
  };
}

/**
 * #10 — Hallucination-flag: brand/product-namen die niet in workspace-context
 * staan. Warn-severity — false-positives mogelijk bij legitieme nieuwe naam.
 */
export function checkHallucinationFlag(
  content: string,
  knownEntities: string[],
): PropertyEvalResult {
  if (knownEntities.length === 0) {
    return { check: 'hallucination-flag', pass: true, severity: 'info', reason: 'Geen known-entities om te checken (skip)' };
  }
  // Capitalized-word-sequences die naar product-names verwijzen. Heuristisch.
  const candidates = content.match(/\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,2})\b/g) ?? [];
  const knownLower = new Set(knownEntities.map((e) => e.toLowerCase()));
  const suspect = candidates.filter((c) => {
    const lc = c.toLowerCase();
    // Filter common Dutch start-of-sentence words om noise te verminderen
    const skipWords = ['de', 'het', 'een', 'wij', 'jij', 'ik', 'we', 'the', 'a', 'an'];
    if (skipWords.includes(lc.split(' ')[0])) return false;
    return !knownLower.has(lc);
  });
  // Alleen flag als meerdere unique suspects (single one = waarschijnlijk
  // legitieme generic noun zoals "Onze Aanpak").
  const uniqueSuspects = Array.from(new Set(suspect));
  if (uniqueSuspects.length >= 3) {
    return {
      check: 'hallucination-flag',
      pass: false,
      severity: 'warn',
      reason: `${uniqueSuspects.length} unknown capitalized entities — mogelijk hallucinatie: ${uniqueSuspects.slice(0, 3).join(', ')}`,
      evidence: uniqueSuspects.slice(0, 3).join(', '),
    };
  }
  return { check: 'hallucination-flag', pass: true, severity: 'info', reason: 'OK' };
}

/**
 * #11 — Sentence-case in headings: anti-pattern is Title Case in NL koppen.
 */
export function checkSentenceCaseHeadings(
  content: string,
  language: string,
): PropertyEvalResult {
  if (language !== 'nl') {
    return { check: 'sentence-case-headings', pass: true, severity: 'info', reason: 'Alleen NL-check' };
  }
  const headings = content.match(/^#{1,6}\s+(.+)$/gm) ?? [];
  for (const heading of headings) {
    const text = heading.replace(/^#+\s+/, '');
    // Title Case = elk woord (uitgezonderd kort connecting) Capital.
    const words = text.split(/\s+/);
    if (words.length < 3) continue;
    const capitalizedCount = words.filter((w) => /^[A-Z]/.test(w)).length;
    // > 60% van woorden Capital + niet alleen eerste woord = Title Case
    if (capitalizedCount / words.length > 0.6 && capitalizedCount >= 3) {
      return {
        check: 'sentence-case-headings',
        pass: false,
        severity: 'warn',
        reason: `Heading lijkt Title Case (Engelse stijl) in NL content: "${text.slice(0, 60)}"`,
        evidence: text.slice(0, 80),
      };
    }
  }
  return { check: 'sentence-case-headings', pass: true, severity: 'info', reason: 'OK' };
}

/**
 * #12 — Minimum heading count voor long-form types.
 */
export function checkMinimumHeadingCount(
  content: string,
  contentType: string,
): PropertyEvalResult {
  const LONG_FORM_TYPES = new Set([
    'blog-post', 'whitepaper', 'case-study', 'ebook', 'article',
    'thought-leadership', 'pillar-page', 'landing-page', 'product-page',
  ]);
  if (!LONG_FORM_TYPES.has(contentType)) {
    return { check: 'minimum-heading-count', pass: true, severity: 'info', reason: 'Niet-long-form type (skip)' };
  }
  const h2Count = (content.match(/^##\s+/gm) ?? []).length;
  if (h2Count < 3) {
    return {
      check: 'minimum-heading-count',
      pass: false,
      severity: 'info',
      reason: `Long-form type ${contentType} heeft slechts ${h2Count} H2-headings (≥3 verwacht)`,
    };
  }
  return { check: 'minimum-heading-count', pass: true, severity: 'info', reason: 'OK' };
}

/**
 * #13 — Markdown-leakage: plain-text groups mogen geen markdown-syntax bevatten.
 */
export function checkMarkdownLeakage(
  content: string,
  groupType: string,
): PropertyEvalResult {
  const PLAIN_GROUPS = new Set(['headline', 'meta_description', 'subject', 'preheader', 'cta', 'hashtag']);
  if (!PLAIN_GROUPS.has(groupType)) {
    return { check: 'markdown-leakage', pass: true, severity: 'info', reason: 'Group accepteert markdown' };
  }
  const markdownPatterns = [
    { re: /\*\*[^*]+\*\*/, label: 'bold-markers' },
    { re: /\*[^*]+\*(?!\*)/, label: 'italic-markers' },
    { re: /^#+\s/m, label: 'heading-marker' },
    { re: /\[([^\]]+)\]\(([^)]+)\)/, label: 'markdown-link' },
    { re: /```/, label: 'code-block' },
  ];
  for (const { re, label } of markdownPatterns) {
    const m = re.exec(content);
    if (m) {
      return {
        check: 'markdown-leakage',
        pass: false,
        severity: 'warn',
        reason: `${groupType} bevat markdown-syntax (${label}); zou plain-text moeten zijn`,
        evidence: snippetAt(content, m.index),
        position: m.index,
      };
    }
  }
  return { check: 'markdown-leakage', pass: true, severity: 'info', reason: 'OK' };
}

/**
 * #14 — Language-directive-consistency: als systemPrompt taal-instructie bevatte
 * (e.g. "Write in Dutch"), moet content erin matcht. V1: hergebruikt language-
 * match check — duplicaat-warn vermijden door alleen te runnen als check#2
 * geslaagd is + result onderling consistent te markeren.
 *
 * Pre-launch v1: skip — language-match check #2 dekt dit al. Behouden voor
 * #5.B uitbreiding waar systemPrompt-inspectie waardevol wordt.
 */
export function checkLanguageDirectiveConsistency(): PropertyEvalResult {
  return {
    check: 'language-directive-consistency',
    pass: true,
    severity: 'info',
    reason: 'Deferred — language-match check #2 dekt dit pre-launch',
  };
}

/**
 * #15 — Duplicate-content: variant verschilt minimaal 30% van sibling-variants.
 */
export function checkDuplicateContent(
  content: string,
  siblingVariants: string[],
): PropertyEvalResult {
  if (siblingVariants.length === 0) {
    return { check: 'duplicate-content', pass: true, severity: 'info', reason: 'Geen siblings (skip)' };
  }
  for (let i = 0; i < siblingVariants.length; i++) {
    const distance = jaccardDistance(content, siblingVariants[i]);
    if (distance < 0.30) {
      return {
        check: 'duplicate-content',
        pass: false,
        severity: 'info',
        reason: `Variant ${(distance * 100).toFixed(0)}% similar aan sibling ${i + 1} (verwacht ≥ 30% verschil)`,
      };
    }
  }
  return { check: 'duplicate-content', pass: true, severity: 'info', reason: 'OK' };
}

// ─── Orchestrator ─────────────────────────────────────────────

/**
 * Run alle 15 checks. Eager-exit op block-severity = false; cumulatieve
 * runtime gerapporteerd in result.runtimeMs voor monitoring.
 */
export function runAllPropertyEvals(
  content: string,
  context: PropertyEvalContext,
): PropertyEvalRunResult {
  const start = performance.now();
  const results: PropertyEvalResult[] = [];

  // Block-severity checks eerst (eager-exit waar mogelijk reduceert latency)
  results.push(checkSchemaValid(content));
  results.push(checkPlaceholders(content));
  results.push(checkPiiSafety(content));
  results.push(checkBrandNameCapitalization(content, context.brandName));

  // Warn + info checks (geen eager-exit, gewoon allemaal evalueren)
  results.push(checkLanguageMatch(content, context.expectedLanguage));
  results.push(checkLengthBounds(content, context.wordBounds));
  results.push(checkBannedPhrase(content, context.expectedLanguage));
  results.push(checkHeadingHierarchy(content));
  results.push(checkCtaPresence(content, context.requiresCTA, context.expectedLanguage));
  results.push(checkCtaQuality(content, context.requiresCTA, context.expectedLanguage, context.groupType));
  results.push(checkMetaDescriptionCompliance(content, context.groupType));
  results.push(checkClaimSubstantiation(content));
  results.push(checkHallucinationFlag(content, context.knownEntities));
  results.push(checkSentenceCaseHeadings(content, context.expectedLanguage));
  results.push(checkMinimumHeadingCount(content, context.contentType));
  results.push(checkMarkdownLeakage(content, context.groupType));
  results.push(checkLanguageDirectiveConsistency());
  results.push(checkDuplicateContent(content, context.siblingVariants));

  const runtimeMs = performance.now() - start;
  const blockViolations = results.filter((r) => !r.pass && r.severity === 'block');
  const warnings = results.filter((r) => !r.pass && r.severity === 'warn');

  return {
    passed: blockViolations.length === 0,
    results,
    blockViolations,
    warnings,
    runtimeMs,
  };
}

/** Lijst alle 18 check-ids voor test-discovery en UI. */
export const ALL_CHECK_IDS: PropertyEvalCheckId[] = [
  'schema-valid',
  'language-match',
  'length-bounds',
  'banned-phrase',
  'brand-name-capitalization',
  'placeholder-detection',
  'pii-safety',
  'heading-hierarchy',
  'cta-presence',
  'cta-quality',
  'meta-description-compliance',
  'claim-substantiation',
  'hallucination-flag',
  'sentence-case-headings',
  'minimum-heading-count',
  'markdown-leakage',
  'language-directive-consistency',
  'duplicate-content',
];
