/**
 * Validator voor content-styling-migratie (taak 9.0c).
 *
 * Checkt per categorie en per veld of de migratie compleet is door 4 plekken
 * tegelijk te lezen:
 *
 *   1. content-type-inputs.ts — heeft een field-builder voor de key
 *   2. canvas-orchestrator.ts — key zit in MEDIUM_CONFIG_HANDLED_KEYS Set
 *   3. canvas-orchestrator.ts — formatMediumConfig heeft rich AI-instructie
 *   4. medium-config-registry.ts — key is GEEN legacy-veld meer (mag niet meer)
 *
 * Usage: `npx tsx scripts/validate-content-styling-migration.ts`
 *
 * Output: markdown-rapport per categorie met ✓/⚠/✗ status en concrete gaps.
 */

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

// ─── Expected migration map (from tasks/done/...campaign-styling-migratie.md) ──

interface CategoryExpectation {
  label: string;
  /** Velden die naar Content Brief gemigreerd moeten zijn. */
  migratedKeys: string[];
  /** Velden die in Step 3 Medium mogen blijven (platform-rendering). */
  retainedKeys: string[];
}

const EXPECTED: Record<string, CategoryExpectation> = {
  'long-form': {
    label: 'Long-form',
    migratedKeys: ['tone', 'articleStructure', 'readingLevel', 'includeFaq', 'includeQuotes', 'internalLinking', 'seoFocus'],
    retainedKeys: [],
  },
  sales: {
    label: 'Sales',
    // proofPointDensity verwijderd 2026-04-28 (te granular).
    migratedKeys: ['tone', 'salesAngle', 'includePricing', 'ctaStyle'],
    retainedKeys: [],
  },
  'pr-hr': {
    label: 'PR-HR',
    migratedKeys: ['tone', 'structure', 'quoteCount', 'includeBoilerplate', 'includeContactBlock', 'hasEmbargo'],
    retainedKeys: [],
  },
  email: {
    label: 'Email',
    migratedKeys: ['ctaPlacement', 'previewTextLength', 'personalize'],
    retainedKeys: ['templateStyle', 'headerType'],
  },
  carousel: {
    label: 'Carousel',
    migratedKeys: ['transitionStyle', 'includeCtaSlide', 'visualStyle'],
    retainedKeys: ['slideCount', 'slideFormat'],
  },
  podcast: {
    label: 'Podcast',
    migratedKeys: ['episodeFormat', 'segmentCount', 'introStyle', 'includeShowNotes', 'includeTranscript'],
    retainedKeys: ['duration'],
  },
  advertising: {
    label: 'Advertising',
    migratedKeys: ['urgencyLevel', 'socialProof', 'ctaType', 'visualStyle'],
    retainedKeys: ['adFormat'],
  },
  video: {
    label: 'Video',
    migratedKeys: ['footageType', 'textOverlay', 'colorGrade'],
    retainedKeys: ['duration', 'aspectRatio', 'quality'],
  },
  'web-page': {
    label: 'Web-page',
    migratedKeys: ['seoFocus'],
    retainedKeys: ['pageLayout', 'heroStyle', 'sectionCount', 'ctaType'],
  },
  // Social-post is referentie-implementatie (entry #208c); included voor completeness.
  'social-post': {
    label: 'Social-post (reference)',
    migratedKeys: ['tone', 'visualStyle', 'hashtagStrategy', 'ctaStyle', 'includeEmoji'],
    retainedKeys: [],
  },
};

// ─── Source-file helpers ──────────────────────────────────

const ROOT = resolve(__dirname, '..');

function loadSource(relPath: string): string {
  return readFileSync(resolve(ROOT, relPath), 'utf-8');
}

const orchestratorSrc = loadSource('src/lib/ai/canvas-orchestrator.ts');
const inputsSrc = loadSource('src/features/campaigns/lib/content-type-inputs.ts');
const registrySrc = loadSource('src/features/campaigns/constants/medium-config-registry.ts');

/** Extract het MEDIUM_CONFIG_HANDLED_KEYS Set blok en geef de keys terug. */
function extractHandledKeys(src: string): Set<string> {
  const match = src.match(/MEDIUM_CONFIG_HANDLED_KEYS\s*=\s*new Set<string>\(\[([\s\S]*?)\]\)/);
  if (!match) return new Set();
  const block = match[1];
  const keys = new Set<string>();
  const re = /'([a-zA-Z][a-zA-Z0-9_]*)'/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(block)) !== null) {
    keys.add(m[1]);
  }
  return keys;
}

const handledKeys = extractHandledKeys(orchestratorSrc);

/** Detecteer of formatMediumConfig de key richly behandelt (config.<key> referentie). */
function hasRichFormat(key: string): boolean {
  // Match "config.<key>" of "config.<key> as ..." in de formatMediumConfig functie.
  // We hoeven niet exact in de functie te zoeken — buiten formatMediumConfig is
  // config.<key> alleen indirect, en mogelijke false-positives zijn acceptabel
  // (we willen weten of de richness ER IS, niet of er ergens anders ook wat staat).
  const re = new RegExp(`config\\.${key}\\b`);
  return re.test(orchestratorSrc);
}

/** Detecteer of er een field-builder voor deze key bestaat in content-type-inputs.ts. */
function hasFieldBuilder(key: string): boolean {
  const re = new RegExp(`key:\\s*['"\`]${key}['"\`]`);
  return re.test(inputsSrc);
}

/** Detecteer of de key NOG steeds als legacy-veld in medium-config-registry.ts staat. */
function isLegacyInRegistry(key: string): boolean {
  const re = new RegExp(`key:\\s*['"\`]${key}['"\`]`);
  return re.test(registrySrc);
}

// ─── Validation pipeline ──────────────────────────────────

interface FieldStatus {
  key: string;
  inHandledSet: boolean;
  hasRich: boolean;
  hasBuilder: boolean;
  legacyRemains: boolean; // true = nog in oude registry, FOUT
}

interface CategoryReport {
  label: string;
  migrated: FieldStatus[];
  retained: FieldStatus[];
  /** Geen issues gevonden. */
  clean: boolean;
  /** Aantal hard issues (telt niet legacyRemains voor retained-velden, want die mogen blijven). */
  issueCount: number;
}

function evalField(key: string, expectMigrated: boolean): FieldStatus {
  const inHandledSet = handledKeys.has(key);
  const hasRich = hasRichFormat(key);
  const hasBuilder = hasFieldBuilder(key);
  const legacyRemains = isLegacyInRegistry(key);
  // Voor migrated-velden: legacy moet weg. Voor retained: legacy mag blijven.
  return { key, inHandledSet, hasRich, hasBuilder, legacyRemains: expectMigrated && legacyRemains };
}

function report(): CategoryReport[] {
  const out: CategoryReport[] = [];
  for (const [, exp] of Object.entries(EXPECTED)) {
    const migrated = exp.migratedKeys.map((k) => evalField(k, true));
    const retained = exp.retainedKeys.map((k) => evalField(k, false));

    let issueCount = 0;
    for (const f of migrated) {
      if (!f.hasBuilder) issueCount += 1;
      if (!f.inHandledSet) issueCount += 1;
      if (!f.hasRich) issueCount += 1;
      if (f.legacyRemains) issueCount += 1;
    }
    for (const f of retained) {
      if (!f.hasRich) issueCount += 1; // retained moet rich zijn (rendering instructies)
    }

    out.push({
      label: exp.label,
      migrated,
      retained,
      clean: issueCount === 0,
      issueCount,
    });
  }
  return out;
}

function symbolFor(condition: boolean): string {
  return condition ? '[OK]' : '[!!]';
}

function printReport(reports: CategoryReport[]): void {
  console.log('# Content-styling migration validation\n');
  console.log(`MEDIUM_CONFIG_HANDLED_KEYS bevat ${handledKeys.size} keys.`);
  console.log('');

  let totalIssues = 0;
  for (const r of reports) {
    totalIssues += r.issueCount;
    const status = r.clean ? '[OK]' : `[${r.issueCount} issues]`;
    console.log(`## ${r.label} — ${status}`);
    if (r.migrated.length > 0) {
      console.log('Migrated keys (Step 1 Content Brief):');
      for (const f of r.migrated) {
        const builder = symbolFor(f.hasBuilder);
        const set = symbolFor(f.inHandledSet);
        const rich = symbolFor(f.hasRich);
        const legacy = f.legacyRemains ? '[LEGACY-REMAINS]' : '[OK]';
        console.log(`  ${f.key}: builder=${builder} set=${set} rich=${rich} legacy-cleanup=${legacy}`);
      }
    }
    if (r.retained.length > 0) {
      console.log('Retained keys (Step 3 Medium platform-rendering):');
      for (const f of r.retained) {
        const rich = symbolFor(f.hasRich);
        console.log(`  ${f.key}: rich=${rich}`);
      }
    }
    console.log('');
  }

  console.log(`---\nTotal issues across all categories: ${totalIssues}`);
}

printReport(report());
