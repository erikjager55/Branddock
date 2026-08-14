// =============================================================
// Smoke: brand.md-emitter
//
// Draait zonder DB (fixture-model). Bewaakt de drie harde
// emitter-garanties uit de task-file:
//   1. Determinisme — zelfde model → bit-voor-bit zelfde output
//   2. Publiek/privaat — concurrenten NOOIT in het publieke profiel
//   3. Kern-conformiteit — frontmatter-basisvelden + Strategy/Voice/
//      Visual aanwezig (upstream v0.2-kern)
//
// Run: npx tsx scripts/smoke-tests/brandmd-emitter.ts
// =============================================================

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
  prose: { dosDonts: ['Do: keep it human', "Don't: use hype words"] },
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

// 3. Kern-conformiteit (upstream v0.2)
for (const needle of [
  'name: ',
  'version: "0.2"',
  'language: en',
  '## Strategy',
  '## Voice',
  '## Visual',
]) {
  if (!a.includes(needle)) fail(`kern-element ontbreekt: ${needle}`);
}

// 4. Full-profile-elementen + pointer-regel
for (const needle of [
  'locales: [en, nl]',
  'validation:',
  'strategy: { status: validated, score: 82',
  'provenance:',
  '## Audience',
  '## Products & Services',
  '## Channel Tones',
  '## Guardrails',
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

console.log('✓ brand.md-emitter smoke: determinisme, publiek/privaat, kern + full profile OK');
