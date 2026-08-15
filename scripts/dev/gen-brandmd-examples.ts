// Genereert de voorbeeldbestanden in docs/specs/brandmd-examples/ via de
// échte emitter (geen handwerk → voorbeelden kunnen niet divergeren van de
// implementatie). Run: npx tsx scripts/dev/gen-brandmd-examples.ts

import { writeFileSync } from 'fs';
import { emitBrandMd } from '../../src/lib/export/design-system/emitters/brandmd';
import { draftPayloadToModel } from '../../src/lib/brandmd/scan';
import type { DesignSystemModel } from '../../src/lib/export/design-system/canonical';

const living: DesignSystemModel = {
  meta: { name: 'Acme Coffee', workspaceId: 'ws', workspaceSlug: 'acme-coffee', generatedAt: '2026-08-03T00:00:00.000Z' },
  colors: {
    primary: { value: '#7B3F00', role: 'primary' },
    'on-primary': { value: '#FFF8F0', role: 'on-primary' },
    secondary: { value: '#2E5339', role: 'secondary' },
    surface: { value: '#FAF6F1', role: 'surface' },
  },
  typography: {
    'headline-lg': { fontFamily: 'Fraunces', fontSize: '36px', fontWeight: 600, lineHeight: '1.15' },
    'body-md': { fontFamily: 'Inter', fontSize: '16px', fontWeight: 400, lineHeight: '1.6' },
  },
  rounded: {},
  spacing: {},
  elevation: {},
  components: {},
  prose: {},
  extensions: {
    voice: {
      principles: ['Warm, never cute', 'Specific beats superlative'],
      writingGuidelines: ['Short sentences. Concrete origins.'],
      doSayPhrases: ['Roasted this Tuesday'],
      dontSayPhrases: ['World-class artisanal experience'],
    },
    brandFoundation: {
      assets: [
        { name: 'Purpose Statement', slug: 'purpose-statement', category: 'PURPOSE', summary: 'Make single-origin coffee an everyday habit, not a luxury.' },
        { name: 'Brand Promise', slug: 'brand-promise', category: 'STRATEGY', summary: 'Roasted within 7 days of your cup, always traceable to the farm.' },
      ],
      personas: [
        { name: 'Ritual Rosa', tagline: 'Home-brew perfectionist, 28-40', keyTraits: ['curious', 'quality-driven'], primaryGoal: 'Cafe-level coffee at home', quote: 'Tell me the farm, not the vibe.' },
      ],
      competitors: [],
    },
    brandMd: {
      tagline: 'Single-origin, every day',
      language: 'en',
      locales: ['en', 'nl'],
      voiceDescription: 'Warm and precise — a knowledgeable friend, not a barista influencer.',
      wordsWeUse: ['origin', 'roast date', 'farm-direct'],
      wordsWeAvoid: ['artisanal', 'elevated'],
      channelTones: [{ channel: 'instagram', tone: 'visual-first, farm stories, no hashtag walls' }],
      products: [
        { name: 'Farm-Direct Subscription', description: 'Fresh-roasted single-origin, every two weeks.', features: [], benefits: ['always fresh'], useCases: ['home brewing'] },
      ],
      guardrails: { do: ['Name the farm and roast date'], dont: ['Avoid the word/phrase "artisanal"'] },
      validation: {
        strategy: { status: 'validated', score: 91, date: '2026-08-01' },
        voice: { status: 'validated', date: '2026-08-01' },
        visual: { status: 'validated' },
        audience: { status: 'validated' },
        products: { status: 'validated' },
      },
      provenance: { generatedBy: 'Branddock', canonicalUrl: 'https://branddock.app/b/acme-coffee/brand.md' },
    },
  },
};

writeFileSync(
  'docs/specs/brandmd-examples/example-living-workspace.brand.md',
  emitBrandMd(living, { profile: 'public', useHubUrl: 'https://branddock.app/brandmd/use' }),
);

const draft = draftPayloadToModel(
  {
    version: 1,
    sourceUrl: 'https://example-saas.com',
    domain: 'example-saas.com',
    name: 'Example SaaS',
    tagline: 'Ship customer updates without the busywork',
    language: 'en',
    colors: ['#3B5BDB', '#12B886'],
    fonts: ['Sora', 'Inter'],
    strategy: {
      purpose: 'Help product teams close the loop with their users.',
      positioning: 'The changelog tool that writes itself.',
    },
    voice: {
      description: 'Direct, developer-friendly, lightly wry.',
      tonalRules: ['No corporate filler'],
      wordsWeUse: ['ship', 'close the loop'],
      wordsWeAvoid: [],
    },
    audience: [{ name: 'Product managers', description: 'B2B SaaS, 10-200 employees' }],
    products: [{ name: 'Changelog Autopilot', description: 'Turns merged PRs into customer-readable updates.' }],
    messagePillars: [
      { pillar: 'Close the loop', statements: ['Users deserve to know what shipped'] },
      { pillar: 'Zero busywork', statements: ['Release notes that write themselves'] },
    ],
    artDirection: {
      keywords: ['clean', 'developer-native', 'high-contrast'],
      statement: 'Reads like good documentation: quiet surfaces, one confident accent color.',
    },
  },
  'https://branddock.app/brandmd/claim/EXAMPLE-TOKEN',
);

writeFileSync(
  'docs/specs/brandmd-examples/example-generator-draft.brand.md',
  emitBrandMd(draft, { profile: 'public', useHubUrl: 'https://branddock.app/brandmd/use' }),
);

console.log('examples written');
