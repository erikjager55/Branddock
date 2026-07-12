/**
 * Smoke-test: prompt-contract consistency (prompt-audit Fase 2, cluster T6).
 *
 * Deterministic CI net for the "components array MUST contain exactly 0
 * entries" defect class (docs/audits/2026-06-11-prompt-audit.md §3 C3/C4/C5):
 *
 *  (a) GROUP COVERAGE — every content type known to the canvas pipeline
 *      (CONTENT_TYPE_TO_MEDIUM ∪ TEMPLATE_REGISTRY) resolves to >= 1
 *      component group, either via getComponentTemplateFallback or via the
 *      hardcoded DB-medium-row allowlist (seeded componentTemplate rows).
 *  (b) TYPE-ID CONSISTENCY — near-duplicate type-IDs across registries
 *      (levenshtein <= 3 or dash-prefix, e.g. explainer-video vs
 *      explainer-video-script) fail unless some registry contains both
 *      (then they are deliberately distinct sibling types).
 *  (c) FALLBACK SANITY — every fallback entry has >= 1 required group, no
 *      duplicate group names, valid maxLength values, and maxLength present
 *      on short field types (cta/subject/headline-like) unless the group is
 *      an isScriptedScene scene.
 *  (d) SHARED GROUP CONTRACT — the Fase 2 contract types exist in the
 *      fallback registry and FALLBACK_FIRST_TYPES is exported, contains at
 *      least tiktok-script, and every member has a fallback entry.
 *  (e) RESOLVED-TEMPLATE CONTRACT (smoke-plan punt 4) — press-release /
 *      welcome-sequence / faq-page / tiktok-script resolve (via the same
 *      exports the orchestrator's resolveComponentTemplate consumes) to
 *      >= 1 required group with their type-specific group names
 *      (email-1-subject/-body, question-1/answer-1/closing-cta,
 *      isScriptedScene for tiktok), and FALLBACK_FIRST precedence beats a
 *      generic medium row.
 *  (f) PROMPT_VERSIONS SYNC — every prompt-template file exporting a
 *      PROMPT_VERSION constant matches its category entry in
 *      src/lib/ai/prompt-version-registry.ts (AICallSnapshot.promptVersion
 *      must stay truthful; drift fails).
 *  (g) TYPE→CATEGORY COVERAGE (CF-1/CF-4, content-flow-improvements-7a) —
 *      every canonical deliverable-type has a dedicated prompt template (the
 *      generic fallback is a quality drop and must never re-appear
 *      silently), and getCategoryForType resolves every templated type to
 *      the category of the collection that registers it (the hand-written
 *      predecessor of TYPE_TO_CATEGORY had drifted: 9 phantom-IDs + 11
 *      missing types falling back to 'long-form').
 *
 * No DB, no LLM calls — pure registry imports, plus source parsing for the
 * non-exported consts (CONTENT_TYPE_TO_MEDIUM, FALLBACK_BY_CONTENT_TYPE and
 * the preview-map content-type maps).
 *
 * Run: npx tsx scripts/smoke-tests/prompt-contracts.ts
 */

import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';

import * as fallbackRegistryModule from '../../src/lib/ai/component-templates-fallback';
import {
  getComponentTemplateFallback,
  type ComponentTemplateItem,
} from '../../src/lib/ai/component-templates-fallback';
import {
  PROMPT_VERSIONS,
  getCategoryForType,
  type PromptCategory,
} from '../../src/lib/ai/prompt-version-registry';
import { DELIVERABLE_TYPE_IDS } from '../../src/features/campaigns/lib/deliverable-types';
import { LONG_FORM_TEMPLATES } from '../../src/lib/studio/prompt-templates/long-form';
import { SOCIAL_MEDIA_TEMPLATES } from '../../src/lib/studio/prompt-templates/social-media';
import { ADVERTISING_TEMPLATES } from '../../src/lib/studio/prompt-templates/advertising';
import { EMAIL_TEMPLATES } from '../../src/lib/studio/prompt-templates/email';
import { WEBSITE_TEMPLATES } from '../../src/lib/studio/prompt-templates/website';
import { VIDEO_AUDIO_TEMPLATES } from '../../src/lib/studio/prompt-templates/video-audio';
import { SALES_TEMPLATES } from '../../src/lib/studio/prompt-templates/sales';
import { PR_HR_TEMPLATES } from '../../src/lib/studio/prompt-templates/pr-hr';

const ROOT = join(__dirname, '../..');

let pass = 0;
let fail = 0;

function assert(name: string, cond: boolean, detail?: string): void {
  if (cond) {
    console.log(`  PASS ${name}`);
    pass++;
  } else {
    console.error(`  FAIL ${name}${detail ? ` -- ${detail}` : ''}`);
    fail++;
  }
}

// ─── Source-parsing helpers ──────────────────────────────────
// CONTENT_TYPE_TO_MEDIUM, FALLBACK_BY_CONTENT_TYPE and the preview-map
// content-type maps are module-private consts. Parsing their keys from
// source keeps this test registry-shaped (no production exports added
// purely for testing) and keeps it in sync with what actually ships.

/** Strip line + block comments from TS source (string-literal aware). */
function stripComments(src: string): string {
  let out = '';
  let i = 0;
  let str: string | null = null;
  while (i < src.length) {
    const ch = src[i];
    const next = src[i + 1];
    if (str) {
      out += ch;
      if (ch === '\\') {
        out += next ?? '';
        i += 2;
        continue;
      }
      if (ch === str) str = null;
      i++;
      continue;
    }
    if (ch === "'" || ch === '"' || ch === '`') {
      str = ch;
      out += ch;
      i++;
      continue;
    }
    if (ch === '/' && next === '/') {
      const nl = src.indexOf('\n', i);
      i = nl === -1 ? src.length : nl;
      continue;
    }
    if (ch === '/' && next === '*') {
      const end = src.indexOf('*/', i + 2);
      i = end === -1 ? src.length : end + 2;
      continue;
    }
    out += ch;
    i++;
  }
  return out;
}

/** Extract the `{ ... }` value literal of `const <name>(: Type)? = { ... }`. */
function extractObjectLiteral(rawSource: string, constName: string, file: string): string {
  const declIdx = rawSource.indexOf(`const ${constName}`);
  if (declIdx === -1) throw new Error(`const ${constName} not found in ${file}`);
  // Strip comments only from the declaration onward: the const bodies are
  // plain string/array literals, while the full file may contain regex
  // literals that would confuse the string-tracking scanner.
  const tail = stripComments(rawSource.slice(declIdx));
  const eqIdx = tail.indexOf('=');
  const start = eqIdx === -1 ? -1 : tail.indexOf('{', eqIdx);
  if (start === -1) throw new Error(`object literal for ${constName} not found in ${file}`);
  let depth = 0;
  let str: string | null = null;
  for (let i = start; i < tail.length; i++) {
    const ch = tail[i];
    if (str) {
      if (ch === '\\') i++;
      else if (ch === str) str = null;
      continue;
    }
    if (ch === "'" || ch === '"' || ch === '`') str = ch;
    else if (ch === '{' || ch === '[') depth++;
    else if (ch === '}' || ch === ']') {
      depth--;
      if (depth === 0) return tail.slice(start, i + 1);
    }
  }
  throw new Error(`unbalanced object literal for ${constName} in ${file}`);
}

/** Top-level (depth-1) property keys of an object-literal slice. */
function topLevelKeys(literal: string): string[] {
  const keys: string[] = [];
  let depth = 0;
  let keyExpected = false;
  let i = 0;
  while (i < literal.length) {
    const ch = literal[i];
    if (ch === "'" || ch === '"') {
      const end = literal.indexOf(ch, i + 1);
      if (end === -1) break;
      if (depth === 1 && keyExpected && /^\s*:/.test(literal.slice(end + 1))) {
        keys.push(literal.slice(i + 1, end));
        keyExpected = false;
      }
      i = end + 1;
      continue;
    }
    if (ch === '{' || ch === '[') {
      depth++;
      if (depth === 1) keyExpected = true;
      i++;
      continue;
    }
    if (ch === '}' || ch === ']') {
      depth--;
      i++;
      continue;
    }
    if (ch === ',' && depth === 1) {
      keyExpected = true;
      i++;
      continue;
    }
    if (depth === 1 && keyExpected && /[A-Za-z_$]/.test(ch)) {
      const m = /^[\w$]+/.exec(literal.slice(i));
      if (m && /^\s*:/.test(literal.slice(i + m[0].length))) {
        keys.push(m[0]);
        keyExpected = false;
        i += m[0].length;
        continue;
      }
    }
    i++;
  }
  return keys;
}

/** Classic Levenshtein edit distance (two-row DP). */
function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  let prev = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    const curr: number[] = [i];
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(prev[j] + 1, curr[j - 1] + 1, prev[j - 1] + cost);
    }
    prev = curr;
  }
  return prev[b.length];
}

// ─── Registry collection ─────────────────────────────────────

const TEMPLATE_REGISTRY_TYPES = new Set<string>([
  ...Object.keys(LONG_FORM_TEMPLATES),
  ...Object.keys(SOCIAL_MEDIA_TEMPLATES),
  ...Object.keys(ADVERTISING_TEMPLATES),
  ...Object.keys(EMAIL_TEMPLATES),
  ...Object.keys(WEBSITE_TEMPLATES),
  ...Object.keys(VIDEO_AUDIO_TEMPLATES),
  ...Object.keys(SALES_TEMPLATES),
  ...Object.keys(PR_HR_TEMPLATES),
]);

const canvasContextSource = readFileSync(join(ROOT, 'src/lib/ai/canvas-context.ts'), 'utf8');
const MEDIUM_MAP_TYPES = new Set<string>(
  topLevelKeys(extractObjectLiteral(canvasContextSource, 'CONTENT_TYPE_TO_MEDIUM', 'canvas-context.ts')),
);

const fallbackSource = readFileSync(
  join(ROOT, 'src/lib/ai/component-templates-fallback.ts'),
  'utf8',
);
const FALLBACK_TYPES = new Set<string>(
  topLevelKeys(
    extractObjectLiteral(fallbackSource, 'FALLBACK_BY_CONTENT_TYPE', 'component-templates-fallback.ts'),
  ),
);

const previewMapSource = readFileSync(
  join(ROOT, 'src/features/campaigns/components/canvas/previews/preview-map.ts'),
  'utf8',
);
const PREVIEW_MAP_TYPES = new Set<string>([
  ...topLevelKeys(extractObjectLiteral(previewMapSource, 'CONTENT_TYPE_PREVIEW_MAP', 'preview-map.ts')),
  ...topLevelKeys(extractObjectLiteral(previewMapSource, 'CONTENT_TYPE_PREVIEW_OVERRIDE', 'preview-map.ts')),
]);

const DELIVERABLE_TYPES_SET = new Set<string>(DELIVERABLE_TYPE_IDS);

const REGISTRIES: Record<string, ReadonlySet<string>> = {
  'TEMPLATE_REGISTRY': TEMPLATE_REGISTRY_TYPES,
  'CONTENT_TYPE_TO_MEDIUM': MEDIUM_MAP_TYPES,
  'fallback-registry': FALLBACK_TYPES,
  'preview-map': PREVIEW_MAP_TYPES,
  'deliverable-types': DELIVERABLE_TYPES_SET,
};

// FALLBACK_FIRST_TYPES is added in this same Fase 2 (cluster T1). Runtime
// lookup instead of a named import so this test compiles against both the
// pre- and post-T1 tree; absence is reported as a contract FAIL in (d).
const fallbackFirstExport: unknown = (
  fallbackRegistryModule as unknown as Record<string, unknown>
)['FALLBACK_FIRST_TYPES'];
const FALLBACK_FIRST: ReadonlySet<string> | null =
  fallbackFirstExport instanceof Set ? (fallbackFirstExport as ReadonlySet<string>) : null;

// Types whose component contract is carried by a seeded MediumEnrichment
// row: their CONTENT_TYPE_TO_MEDIUM platform/format combo has a non-empty
// componentTemplate in prisma/seed.ts, so the canvas resolves >= 1 group
// from the DB row without a code fallback entry. Keep in sync with the
// mediumEnrichment seed data. Deliberately NOT listed despite seeded rows:
//  - tiktok-script, faq-page, comparison-page, microsite, welcome-sequence,
//    nurture-sequence, re-engagement-email — FALLBACK_FIRST per the Fase 2
//    group contract (the generic medium row was exactly the defect);
//  - twitter-thread, linkedin-poll, linkedin-video-ad — already have a
//    dedicated code-fallback entry that carries their contract.
const DB_CONTRACT_ALLOWLIST = new Set<string>([
  // linkedin/organic-post
  'linkedin-post',
  'linkedin-article',
  'linkedin-newsletter',
  'linkedin-video',
  'linkedin-event',
  // linkedin/ad
  'linkedin-ad',
  'social-ad',
  // instagram/feed-post + instagram/carousel
  'instagram-post',
  'social-carousel',
  // facebook/organic-post + facebook/ad
  'facebook-post',
  'facebook-ad',
  // google/display-ad + google/search-ad, native/sponsored-article, meta/retargeting
  'display-ad',
  'search-ad',
  'native-ad',
  'retargeting-ad',
  // email/newsletter (single-email types only)
  'newsletter',
  'promotional-email',
  // web/landing-page (hero/CTA page types only)
  'landing-page',
  'product-page',
  // web/blog-article
  'blog-post',
  'pillar-page',
  'article',
  'thought-leadership',
  'whitepaper',
  'case-study',
  'ebook',
  // tiktok/video
  'video-ad',
]);

/** Short field types that must declare maxLength unless scripted scenes. */
const SHORT_FIELD_RE =
  /(^|-)(cta|subject|preview-text|headline|subheadline|title|hook|hashtags|question|option|quote)(-|$)/;

console.log('\n=== Prompt-contract consistency smoke ===');

// ─── Parser sanity ───────────────────────────────────────────
// Floors guard against a silently broken source parser faking a green run.
console.log('\n## Parser sanity\n');
assert(
  'CONTENT_TYPE_TO_MEDIUM parses >= 40 type keys',
  MEDIUM_MAP_TYPES.size >= 40,
  `got ${MEDIUM_MAP_TYPES.size}`,
);
assert(
  'FALLBACK_BY_CONTENT_TYPE parses >= 5 type keys',
  FALLBACK_TYPES.size >= 5,
  `got ${FALLBACK_TYPES.size}`,
);
assert(
  'preview-map parses >= 10 content-type keys',
  PREVIEW_MAP_TYPES.size >= 10,
  `got ${PREVIEW_MAP_TYPES.size}`,
);
assert(
  'TEMPLATE_REGISTRY exposes >= 40 types',
  TEMPLATE_REGISTRY_TYPES.size >= 40,
  `got ${TEMPLATE_REGISTRY_TYPES.size}`,
);
assert(
  'deliverable-types registry exposes >= 40 types',
  DELIVERABLE_TYPES_SET.size >= 40,
  `got ${DELIVERABLE_TYPES_SET.size}`,
);
{
  const unresolved = [...FALLBACK_TYPES].filter(
    (type) => (getComponentTemplateFallback(type) ?? []).length === 0,
  );
  assert(
    'every parsed fallback key resolves via getComponentTemplateFallback',
    unresolved.length === 0,
    `parser/export drift for: ${unresolved.join(', ')}`,
  );
}

// ─── (a) Group coverage ──────────────────────────────────────
console.log('\n## (a) Group coverage per content type\n');
const coverageTypes = [...new Set([...MEDIUM_MAP_TYPES, ...TEMPLATE_REGISTRY_TYPES])].sort();
for (const type of coverageTypes) {
  const groups = getComponentTemplateFallback(type) ?? [];
  const viaFallback = groups.length > 0;
  // A FALLBACK_FIRST type must carry its contract in code: the DB medium
  // row is overruled for it, so the allowlist cannot vouch for coverage.
  const viaAllowlist = DB_CONTRACT_ALLOWLIST.has(type) && !FALLBACK_FIRST?.has(type);
  assert(
    `${type} resolves to >= 1 component group`,
    viaFallback || viaAllowlist,
    'no fallback entry and not on the seeded DB-medium-row allowlist → canvas prompt would demand exactly 0 components',
  );
}

// ─── (b) Type-ID consistency across registries ───────────────
console.log('\n## (b) Type-ID consistency across registries\n');
const registriesFor = (id: string): string[] =>
  Object.keys(REGISTRIES).filter((name) => REGISTRIES[name].has(id));
const sharesRegistry = (a: string, b: string): boolean =>
  Object.values(REGISTRIES).some((set) => set.has(a) && set.has(b));

const allIds = [...new Set(Object.values(REGISTRIES).flatMap((set) => [...set]))].sort();
const nearDuplicates: string[] = [];
for (let i = 0; i < allIds.length; i++) {
  for (let j = i + 1; j < allIds.length; j++) {
    const a = allIds[i];
    const b = allIds[j];
    const prefixMatch = b.startsWith(`${a}-`) || a.startsWith(`${b}-`);
    const distance = levenshtein(a, b);
    if (!prefixMatch && distance > 3) continue;
    // Two near-duplicate IDs that co-exist in one registry are deliberately
    // distinct sibling types (e.g. linkedin-post vs linkedin-poll); only
    // disjoint registries indicate the same concept drifting apart.
    if (sharesRegistry(a, b)) continue;
    nearDuplicates.push(
      `"${a}" (${registriesFor(a).join(', ')}) vs "${b}" (${registriesFor(b).join(', ')}) — ` +
        `${prefixMatch ? 'dash-prefix match' : `levenshtein ${distance}`}; ` +
        'likely the same concept registered under different IDs',
    );
  }
}
if (nearDuplicates.length === 0) {
  assert('no cross-registry near-duplicate type-IDs', true);
} else {
  for (const issue of nearDuplicates) {
    assert('near-duplicate type-ID', false, issue);
  }
}

// ─── (c) Fallback-entry sanity ───────────────────────────────
console.log('\n## (c) Fallback-entry sanity\n');
for (const type of [...FALLBACK_TYPES].sort()) {
  const groups: ComponentTemplateItem[] = getComponentTemplateFallback(type) ?? [];
  assert(
    `${type}: >= 1 required group`,
    groups.some((g) => g.required === true),
    `groups: ${groups.map((g) => g.type).join(', ') || '(none)'}`,
  );
  const seen = new Set<string>();
  const dupes = groups.filter((g) => (seen.has(g.type) ? true : (seen.add(g.type), false)));
  assert(
    `${type}: no duplicate group names`,
    dupes.length === 0,
    `duplicates: ${dupes.map((g) => g.type).join(', ')}`,
  );
  const invalidMax = groups.filter(
    (g) => g.maxLength !== undefined && (typeof g.maxLength !== 'number' || g.maxLength <= 0),
  );
  assert(
    `${type}: maxLength values are positive numbers`,
    invalidMax.length === 0,
    `invalid: ${invalidMax.map((g) => g.type).join(', ')}`,
  );
  const shortWithoutCap = groups.filter(
    (g) => SHORT_FIELD_RE.test(g.type) && !g.isScriptedScene && !(typeof g.maxLength === 'number'),
  );
  assert(
    `${type}: short field types declare maxLength`,
    shortWithoutCap.length === 0,
    `missing maxLength on: ${shortWithoutCap.map((g) => g.type).join(', ')}`,
  );
}

// ─── (d) Shared Fase 2 group contract ────────────────────────
console.log('\n## (d) Shared Fase 2 group contract\n');
const CONTRACT_TYPES = [
  'welcome-sequence',
  'nurture-sequence',
  're-engagement-email',
  'faq-page',
  'comparison-page',
  'microsite',
  'linkedin-carousel',
];
for (const type of CONTRACT_TYPES) {
  assert(
    `contract type ${type} has a fallback entry`,
    (getComponentTemplateFallback(type) ?? []).length > 0,
  );
}
assert(
  'FALLBACK_FIRST_TYPES is exported as a Set from component-templates-fallback',
  FALLBACK_FIRST !== null,
  'export missing — fallback can never win from a generic medium row',
);
if (FALLBACK_FIRST) {
  assert("FALLBACK_FIRST_TYPES contains 'tiktok-script'", FALLBACK_FIRST.has('tiktok-script'));
  const withoutEntry = [...FALLBACK_FIRST].filter(
    (type) => (getComponentTemplateFallback(type) ?? []).length === 0,
  );
  assert(
    'every FALLBACK_FIRST type has a fallback entry',
    withoutEntry.length === 0,
    `fallback-first without fallback entry (would resolve to 0 groups): ${withoutEntry.join(', ')}`,
  );
  const conflicting = [...FALLBACK_FIRST].filter((type) => DB_CONTRACT_ALLOWLIST.has(type));
  assert(
    'FALLBACK_FIRST types are not on the DB-contract allowlist',
    conflicting.length === 0,
    `contradictory precedence for: ${conflicting.join(', ')}`,
  );
}

// ─── (e) Resolved-template contract (smoke-plan punt 4) ──────
console.log('\n## (e) Resolved-template contract (smoke-plan punt 4)\n');

/**
 * Mirror of the orchestrator's module-private resolveComponentTemplate
 * (canvas-orchestrator.ts), built on the same exports it consumes
 * (getComponentTemplateFallback + FALLBACK_FIRST_TYPES). Importing the
 * orchestrator itself would drag OpenAI/env dependencies into this
 * DB-free smoke; keep this mirror in sync with that function.
 */
function resolveLikeOrchestrator(
  medium: { componentTemplate?: unknown[] } | null,
  contentType: string,
): ComponentTemplateItem[] {
  const fromFallback = getComponentTemplateFallback(contentType) ?? [];
  if (FALLBACK_FIRST?.has(contentType) && fromFallback.length > 0) return fromFallback;
  const fromMedium = (medium?.componentTemplate ?? []) as ComponentTemplateItem[];
  if (fromMedium.length > 0) return fromMedium;
  return fromFallback;
}

const SMOKE_TYPES = ['press-release', 'welcome-sequence', 'faq-page', 'tiktok-script'] as const;
const resolvedByType = new Map<string, ComponentTemplateItem[]>();
for (const type of SMOKE_TYPES) {
  const groups = resolveLikeOrchestrator(null, type);
  resolvedByType.set(type, groups);
  assert(
    `${type}: resolves (no medium row) to >= 1 required group`,
    groups.some((g) => g.required === true),
    `groups: ${groups.map((g) => g.type).join(', ') || '(none)'}`,
  );
}

const resolvedNames = (type: string): Set<string> =>
  new Set((resolvedByType.get(type) ?? []).map((g) => g.type));

assert(
  'tiktok-script: >= 1 resolved group with isScriptedScene',
  (resolvedByType.get('tiktok-script') ?? []).some((g) => g.isScriptedScene === true),
  'scene-split video pipeline would silently collapse to button-text cta',
);
{
  const names = resolvedNames('welcome-sequence');
  assert(
    'welcome-sequence: resolves email-1-subject AND email-1-body',
    names.has('email-1-subject') && names.has('email-1-body'),
    `groups: ${[...names].join(', ')}`,
  );
}
for (const group of ['question-1', 'answer-1', 'closing-cta']) {
  assert(
    `faq-page: resolves group '${group}'`,
    resolvedNames('faq-page').has(group),
    `groups: ${[...resolvedNames('faq-page')].join(', ')}`,
  );
}

// Naming decision (Fase 2 review-ronde): the ~200-char closing CTA paragraph
// of faq-page/comparison-page is 'closing-cta', never bare 'cta' — a bare
// 'cta' group hits both the global "cta = 48 chars button text" formatting
// rule and the exact-match storage clamp; the '-cta' suffix path strips
// markdown without a length clamp.
for (const type of ['faq-page', 'comparison-page']) {
  const groups = getComponentTemplateFallback(type) ?? [];
  assert(
    `${type}: no bare 'cta' group (renamed to closing-cta)`,
    !groups.some((g) => g.type === 'cta'),
    "bare 'cta' inherits the 48-char button-text rule + storage clamp",
  );
  assert(
    `${type}: has 'closing-cta' group`,
    groups.some((g) => g.type === 'closing-cta'),
  );
}
{
  const switching = (getComponentTemplateFallback('comparison-page') ?? []).find(
    (g) => g.type === 'switching-guide',
  );
  assert(
    'comparison-page: switching-guide group is required',
    switching?.required === true,
    switching ? 'present but optional' : 'group missing',
  );
}

if (FALLBACK_FIRST) {
  // The generic medium row was exactly the C4/C5 defect: for FALLBACK_FIRST
  // types the registry entry must win even when a non-empty row exists.
  const genericMediumRow = { componentTemplate: [{ type: 'body', required: true }] };
  const nameSeq = (groups: ComponentTemplateItem[] | null): string =>
    (groups ?? []).map((g) => g.type).join('|');
  for (const type of SMOKE_TYPES.filter((t) => FALLBACK_FIRST.has(t))) {
    const resolved = resolveLikeOrchestrator(genericMediumRow, type);
    assert(
      `${type}: fallback entry wins over a generic medium row`,
      nameSeq(resolved) === nameSeq(getComponentTemplateFallback(type)),
      `medium row overruled the FALLBACK_FIRST contract — got: ${nameSeq(resolved)}`,
    );
  }
}

// ─── (f) PROMPT_VERSIONS registry sync ───────────────────────
console.log('\n## (f) PROMPT_VERSIONS registry sync\n');

// Template-file → registry-category. A new template file that exports a
// PROMPT_VERSION fails loudly below until it is mapped here — better than
// shipping a version the registry (and AICallSnapshot) never sees.
const TEMPLATE_FILE_CATEGORY: Readonly<Record<string, PromptCategory>> = {
  'long-form.ts': 'long-form',
  'social-media.ts': 'social-media',
  'advertising.ts': 'advertising',
  'email.ts': 'email',
  'website.ts': 'website',
  'video-audio.ts': 'video-audio',
  'sales.ts': 'sales-enablement',
  'pr-hr.ts': 'pr-hr-comms',
};

const templatesDir = join(ROOT, 'src/lib/studio/prompt-templates');
const versionedFiles = readdirSync(templatesDir)
  .filter((file) => file.endsWith('.ts'))
  .flatMap((file) => {
    const match = /export\s+const\s+PROMPT_VERSION\s*=\s*['"]([^'"]+)['"]/.exec(
      readFileSync(join(templatesDir, file), 'utf8'),
    );
    return match ? [{ file, version: match[1] }] : [];
  });

{
  const missing = Object.keys(TEMPLATE_FILE_CATEGORY).filter(
    (file) => !versionedFiles.some((v) => v.file === file),
  );
  assert(
    `all ${Object.keys(TEMPLATE_FILE_CATEGORY).length} known template files export PROMPT_VERSION`,
    missing.length === 0,
    `missing export in: ${missing.join(', ')}`,
  );
}

for (const { file, version } of versionedFiles) {
  const category: PromptCategory | undefined = TEMPLATE_FILE_CATEGORY[file];
  if (!category) {
    assert(
      `${file}: known template file`,
      false,
      'exports PROMPT_VERSION but has no category mapping — add it to TEMPLATE_FILE_CATEGORY',
    );
    continue;
  }
  assert(
    `${file} PROMPT_VERSION matches PROMPT_VERSIONS['${category}']`,
    PROMPT_VERSIONS[category] === version,
    `template ${version} vs registry ${PROMPT_VERSIONS[category]} — bump the registry (or file) so AICallSnapshot.promptVersion stays truthful`,
  );
}

// ─── (g) Type→category coverage (CF-1/CF-4) ──────────────────
console.log('\n## (g) Type→category coverage (CF-1/CF-4)\n');

// Category per collection — the same pairing prompt-version-registry.ts
// derives TYPE_TO_CATEGORY from. Re-declared here (not imported) so a bug
// in the registry's derivation wiring cannot vouch for itself.
const COLLECTION_CATEGORY: ReadonlyArray<readonly [Record<string, unknown>, PromptCategory]> = [
  [LONG_FORM_TEMPLATES, 'long-form'],
  [SOCIAL_MEDIA_TEMPLATES, 'social-media'],
  [ADVERTISING_TEMPLATES, 'advertising'],
  [EMAIL_TEMPLATES, 'email'],
  [WEBSITE_TEMPLATES, 'website'],
  [VIDEO_AUDIO_TEMPLATES, 'video-audio'],
  [SALES_TEMPLATES, 'sales-enablement'],
  [PR_HR_TEMPLATES, 'pr-hr-comms'],
];
const EXPECTED_CATEGORY = new Map<string, PromptCategory>(
  COLLECTION_CATEGORY.flatMap(([collection, category]) =>
    Object.keys(collection).map((typeId) => [typeId, category] as const),
  ),
);

{
  // CF-1: a canonical type without a dedicated template silently degrades to
  // the generic prompt (measurable quality drop — the 2026-05-29 flow
  // analysis found 5 such types). All 55 are covered today; keep it that way.
  const untemplated = [...DELIVERABLE_TYPES_SET].filter(
    (type) => !TEMPLATE_REGISTRY_TYPES.has(type),
  );
  assert(
    'every canonical deliverable-type has a dedicated prompt template',
    untemplated.length === 0,
    `generic-fallback types (add to the matching category file): ${untemplated.join(', ')}`,
  );

  // Reverse: a template key that no canonical type can ever reach is dead
  // weight and usually a typo'd ID.
  const orphaned = [...TEMPLATE_REGISTRY_TYPES].filter(
    (type) => !DELIVERABLE_TYPES_SET.has(type),
  );
  assert(
    'no orphaned template keys outside deliverable-types',
    orphaned.length === 0,
    `template keys without a canonical type: ${orphaned.join(', ')}`,
  );
}

// CF-4: getCategoryForType must resolve every templated type to the category
// of the collection that registers it — never via the 'long-form' fallback
// (which is reserved for genuinely unknown types at runtime).
for (const [type, expected] of [...EXPECTED_CATEGORY.entries()].sort()) {
  const actual = getCategoryForType(type);
  assert(
    `${type} → '${expected}'`,
    actual === expected,
    `getCategoryForType returned '${actual}'`,
  );
}

// ─── Summary ─────────────────────────────────────────────────
console.log(`\n${'='.repeat(50)}`);
console.log(`Total: ${pass + fail} | PASS: ${pass} | FAIL: ${fail}`);
console.log('='.repeat(50));

if (fail > 0) {
  process.exit(1);
}
