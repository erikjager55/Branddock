// =============================================================
// Smoke: BRAND.md-emitter (spec v0.3.0)
//
// Draait zonder DB (fixture-model). Bewaakt de harde garanties:
//   1. Determinisme — zelfde model → bit-voor-bit zelfde output
//   2. Publiek/privaat — concurrenten NOOIT in het publieke profiel
//   3. Spec-conformiteit — frontmatter (name/tagline/specVersion/
//      version/language) + alle verplichte 0.3-subsecties, bewezen
//      via KRUISVALIDATIE met de echte validator (geen zelfgemaakte
//      kern-lezing meer — les van de conformance-audit 2026-08-14)
//   4. Full-profile-elementen + pointer-regel
//
// Run: npx tsx scripts/smoke-tests/brandmd-emitter.ts
// =============================================================

import { execFileSync } from 'node:child_process';
import { writeFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { emitBrandMd, countValidation } from '../../src/lib/export/design-system/emitters/brandmd';
import type { DesignSystemModel } from '../../src/lib/export/design-system/canonical';

const fixture: DesignSystemModel = {
  meta: {
    name: 'Acme: The "Quoted" Brand',
    workspaceId: 'ws_fixture',
    workspaceSlug: 'acme',
    generatedAt: '2026-08-03T12:00:00.000Z',
  },
  colors: {
    primary: { value: '#1FD1B2', role: 'primary' },
    'on-primary': { value: '#FFFFFF', role: 'on-primary' },
    surface: { value: '#0B1220', role: 'surface' },
  },
  typography: {
    'headline-lg': {
      fontFamily: 'Sora',
      fontSize: '32px',
      fontWeight: 700,
      lineHeight: '1.2',
    },
    'body-md': {
      fontFamily: 'Inter',
      fontSize: '16px',
      fontWeight: 400,
      lineHeight: '1.6',
    },
  },
  rounded: {},
  spacing: {},
  elevation: {},
  components: {},
  prose: {
    overview: 'Editorial calm: one accent color, generous whitespace, no ornament.',
    dosDonts: ['Do: keep it human', "Don't: use hype words"],
  },
  extensions: {
    voice: {
      principles: ['Plain language over jargon'],
      writingGuidelines: ['Short sentences'],
      doSayPhrases: ['Build once, run forever'],
      dontSayPhrases: ['Revolutionize your workflow'],
    },
    brandFoundation: {
      assets: [
        {
          name: 'Purpose Statement',
          slug: 'purpose',
          category: 'PURPOSE',
          summary: 'We help teams ship honest software.',
        },
        {
          name: 'Positioning',
          slug: 'positioning',
          category: 'STRATEGY',
          summary: 'The boring-reliable platform for teams burned by hype.',
        },
        {
          name: 'Core Values',
          slug: 'core-values',
          category: 'CULTURE',
          summary: 'Honesty · Craft · Calm',
        },
      ],
      personas: [
        {
          name: 'Practical Petra',
          tagline: 'Ops lead at a scale-up',
          keyTraits: ['pragmatic', 'busy'],
          primaryGoal: 'Fewer tools, more output',
          quote: 'Show me, don’t pitch me.',
        },
      ],
      competitors: [
        {
          name: 'SECRET-RIVAL-CORP',
          tier: 'PRIMARY',
          positioning: 'Enterprise incumbent',
          differentiators: ['We are honest'],
        },
      ],
    },
    brandMd: {
      tagline: 'Build faster, break nothing',
      language: 'en',
      locales: ['en', 'nl'],
      voiceDescription: 'Confident, concrete, never salesy.',
      wordsWeUse: ['ship', 'honest'],
      wordsWeAvoid: ['synergy'],
      channelTones: [{ channel: 'linkedin', tone: 'peer-to-peer, no hashtag walls' }],
      products: [
        {
          name: 'Acme Cloud',
          description: 'The boring-reliable platform.',
          features: ['uptime'],
          benefits: ['sleep at night'],
          useCases: ['b2b saas'],
        },
      ],
      guardrails: { do: ['Use active voice'], dont: ['Avoid the word/phrase "synergy"'] },
      messagePillars: [
        { pillar: 'Reliability', statements: ['Boring is a feature'] },
        { pillar: 'Honesty', statements: ['We say what we ship'] },
      ],
      artDirection: {
        keywords: ['calm', 'editorial', 'unhurried'],
        statement: 'The identity should read like a well-set book, not a dashboard.',
      },
      validation: {
        strategy: { status: 'validated', score: 82, date: '2026-08-01' },
        voice: { status: 'validated', date: '2026-08-01' },
        visual: { status: 'unvalidated' },
        audience: { status: 'validated' },
        products: { status: 'unvalidated' },
      },
      provenance: {
        generatedBy: 'Branddock',
        canonicalUrl: 'https://branddock.app/b/acme/brand.md',
      },
    },
  },
};

function fail(msg: string): never {
  console.error(`✗ ${msg}`);
  process.exit(1);
}

const opts = { profile: 'public' as const, useHubUrl: 'https://branddock.app/brandmd/use' };

// 1. Determinisme
const a = emitBrandMd(fixture, opts);
const b = emitBrandMd(fixture, opts);
if (a !== b) fail('emitter is niet deterministisch');

// 2. Publiek/privaat
if (a.includes('SECRET-RIVAL-CORP') || a.includes('Market Context')) {
  fail('publiek profiel lekt concurrent-context');
}
const ext = emitBrandMd(fixture, { ...opts, profile: 'extended' });
if (!ext.includes('SECRET-RIVAL-CORP')) fail('extended profiel mist Market Context');

// 3. Spec-conformiteit: frontmatter-vorm + kruisvalidatie met de validator
for (const needle of [
  'tagline: "Build faster, break nothing"',
  'specVersion: "0.3.0"',
  'version: 1',
  'language: en',
  '### Overview',
  '### Audience',
  '### References & Anti-References',
  '### Core Colors',
  '### Typefaces',
  '### Art Direction',
  '#### Do',
  '- **Reliability** — Boring is a feature',
  'Design keywords: calm · editorial · unhurried.',
]) {
  if (!a.includes(needle)) fail(`spec-element ontbreekt: ${needle}`);
}
// Maten horen per 0.3 in DESIGN.md, niet in Typefaces.
if (/Typefaces[\s\S]*?32px/.test(a.split('### Photography')[0])) {
  fail('Typefaces bevat maten — die horen in DESIGN.md');
}

const tmp = mkdtempSync(join(tmpdir(), 'brandmd-smoke-'));
for (const [label, content] of [['public', a], ['extended', ext]] as const) {
  const p = join(tmp, `${label}-BRAND.md`);
  writeFileSync(p, content);
  try {
    execFileSync('node', ['integrations/brandmd-validator/bin/brandmd-validate.mjs', p], {
      stdio: 'pipe',
    });
  } catch (err) {
    const out = err instanceof Error && 'stderr' in err ? String((err as { stderr: unknown }).stderr) : String(err);
    fail(`${label} profiel faalt spec-validatie:\n${out}`);
  }
}

// 4. Full-profile-elementen + pointer-regel
for (const needle of [
  'locales: [en, nl]',
  'validation:',
  'strategy: { status: validated, score: 82',
  'provenance:',
  '#### Practical Petra',
  '## Products & Services',
  '## Channel Tones',
  '### Core Values',
  'how to use this file: https://branddock.app/brandmd/use',
]) {
  if (!a.includes(needle)) fail(`full-profile-element ontbreekt: ${needle}`);
}

// 5. YAML-quoting van lastige merknaam
if (!a.includes('name: "Acme: The \\"Quoted\\" Brand"')) fail('YAML-quoting van merknaam faalt');

// 6. countValidation
const counts = countValidation(fixture.extensions.brandMd);
if (counts.validated !== 3 || counts.total !== 5) {
  fail(`countValidation onjuist: ${counts.validated}/${counts.total} (verwacht 3/5)`);
}
if (!a.includes('3 of 5 sections verified')) fail('pointer-regel mist verified-telling');

console.log('✓ BRAND.md-emitter smoke: determinisme, publiek/privaat, spec-0.3-kruisvalidatie + full profile OK');
