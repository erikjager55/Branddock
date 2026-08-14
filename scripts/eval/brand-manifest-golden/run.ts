/**
 * Brand-manifest golden eval (designbibliotheek-verbeterplan W7.4).
 *
 * Deterministische regressietest op manifest-builder + view-projectie:
 * bouwt het manifest uit een bevroren DTS-Ede-achtige fixture (afgeleid
 * van docs/specs/spike-stap0-brand-manifest-dts-ede.md) en assert de
 * gedragsregels van het verbeterplan — donts-import met provenance-
 * stempel, substitutie-flag, known gaps, view-compressie.
 *
 * Run: npx tsx scripts/eval/brand-manifest-golden/run.ts
 */
import {
  buildBrandManifest,
  renderBrandManifestMarkdown,
  type ManifestStyleguideInput,
} from '../../../src/lib/brandstyle/manifest-builder';
import { projectManifest } from '../../../src/lib/brand-library/views';

interface Check {
  ok: boolean;
  label: string;
}

function makeFixture(): ManifestStyleguideInput {
  const styleguide = {
    manifestVersion: 2,
    archetype: 'EVERYMAN',
    archetypeConfidence: 'high',
    layoutStyle: 'COMMERCIAL',
    designPhilosophy: 'OBSERVED: sober, blauw-wit, community-first',
    sourceUrl: 'https://www.dtsede.nl',
    primaryFontName: 'HelveticaNeue',
    colorsSavedForAi: true,
    logoSavedForAi: true,
    imagerySavedForAi: true,
    designLanguageSavedForAi: true,
    colorDonts: ['Never invent accent colors', 'RECOMMENDED: avoid gradients in UI chrome'],
    logoDonts: [],
    imageryDonts: ['No stock photos'],
    iconographyDonts: [],
    graphicElementsDonts: [],
    photographyGuidelines: ['OBSERVED: authentic action and community moments'],
    photographyStyle: { mood: 'true-to-life, slightly cool' },
    buttonProfile: null,
    motionProfile: null,
    typeScale: [{ level: 'h1', size: 64 }],
    semanticTokens: {
      resolved: {
        colors: { primary: '#0060A0', surface: '#F1F1F1', 'on-surface': '#222222' },
        typography: {},
        rounded: { sm: 2, md: 4 },
        spacing: { sm: 8, md: 16 },
        elevation: {},
        componentVariants: {},
      },
      diagnostics: { source: {}, wcagWarnings: [], unresolvedRoles: [] },
      resolvedAt: '2026-08-13T00:00:00.000Z',
      resolverVersion: '1.0.0',
    },
    observedColorPairs: {
      '#222222 | #F1F1F1': 60,
      '#FFFFFF | #0060A0': 25,
      '#222222 | #FFFFFF': 12,
      '#FFFFFF | auto': 3,
    },
    colors: [
      { name: 'Royal Blue', hex: '#0060A0', category: 'PRIMARY', confidence: 'high' },
      { name: 'Bootstrap Blue', hex: '#0D6EFD', category: 'NEUTRAL', confidence: 'low' },
    ],
    fonts: [
      { name: 'HelveticaNeue', role: 'BODY', availability: 'COMMERCIAL', fileUrl: null },
      { name: 'Roboto', role: 'UI', availability: 'GOOGLE_FONTS', fileUrl: null },
    ],
    logos: [{ variant: 'PRIMARY' }],
  };
  return styleguide as unknown as ManifestStyleguideInput;
}

/**
 * Variant met gestructureerde StyleguideRule-records (W2). Dekt de
 * modaliteit-scheiding en de save-for-AI-gate op de gestructureerde tak —
 * die tak omzeilde de gate aanvankelijk volledig.
 */
function makeStructuredFixture(): ManifestStyleguideInput {
  const base = makeFixture() as unknown as Record<string, unknown>;
  return {
    ...base,
    // imagery staat bewust UIT: de imagery-regel hieronder hoort daardoor
    // nergens in het manifest te verschijnen.
    imagerySavedForAi: false,
    rules: [
      {
        id: 'rule-text',
        section: 'voice',
        kind: 'HARD_RULE',
        severity: 'BLOCKING',
        source: 'user',
        title: 'Geen emoji in redactionele copy',
        description: null,
        constraint: { modality: 'text', check: 'no-emoji', derivedBy: 'user' },
      },
      {
        id: 'rule-visual',
        section: 'design-language',
        kind: 'DONT',
        severity: 'ADVISORY',
        source: 'scraped',
        title: 'Geen gradients in UI-chrome',
        description: null,
        constraint: { property: 'gradient', allowed: false },
      },
      {
        id: 'rule-gated',
        section: 'imagery',
        kind: 'DONT',
        severity: 'ADVISORY',
        source: 'scraped',
        title: 'Geen stockfotografie',
        description: null,
        constraint: null,
      },
    ],
  } as unknown as ManifestStyleguideInput;
}

function run(): number {
  const manifest = buildBrandManifest(makeFixture(), null, 'V.V. DTS ’35 Ede');
  const markdown = renderBrandManifestMarkdown(manifest);
  const checks: Check[] = [];

  checks.push({ ok: manifest.manifestVersion === 3, label: 'version bumps 2 -> 3' });
  checks.push({
    ok: manifest.quickFacts.some((f) => f.value.includes('#0060A0')),
    label: 'quick facts carry primary color',
  });
  checks.push({
    ok: manifest.hardRules.some((r) => r.source === 'derived' && r.severity === 'BLOCKING'),
    label: 'exact-values rule present as BLOCKING',
  });
  checks.push({
    ok: manifest.hardRules.some(
      (r) => r.text === 'Never invent accent colors' && r.source === 'scraped',
    ),
    label: 'observed dont imported as scraped',
  });
  checks.push({
    ok: manifest.hardRules.some(
      (r) => r.text.includes('avoid gradients') && r.source === 'recommended',
    ),
    label: 'RECOMMENDED dont stamped as recommended (marker stripped)',
  });
  checks.push({
    ok: manifest.substitutions.some((s) => s.text.includes('HelveticaNeue') && s.needsConfirmation),
    label: 'commercial font without file flagged as substitution',
  });
  checks.push({
    ok: manifest.knownGaps.some((g) => g.includes('motion')) &&
      manifest.knownGaps.some((g) => g.includes('low extraction confidence')),
    label: 'known gaps honest about motion + low-confidence colors',
  });
  checks.push({
    ok: manifest.tokens?.colors?.primary === '#0060A0',
    label: 'semantic tokens pass through unrenamed',
  });
  checks.push({
    ok:
      (manifest.usageRatios ?? []).some((r) => r.startsWith('#F1F1F1') && r.includes('62%')) &&
      !(manifest.usageRatios ?? []).some((r) => r.includes('auto')),
    label: 'usage ratios derived from observed pairs (auto excluded)',
  });
  checks.push({
    ok: markdown.includes('## Known gaps') && markdown.includes('## Rules'),
    label: 'markdown renders known-gaps + rules sections',
  });

  const copyView = projectManifest(manifest, 'copy');
  const imageView = projectManifest(manifest, 'image');
  checks.push({
    ok: copyView.tokens === undefined && copyView.hardRules.length === manifest.hardRules.length,
    label: 'copy view drops tokens, keeps rules',
  });
  checks.push({
    ok: imageView.imagery !== undefined && imageView.voiceBaseline === undefined,
    label: 'image view keeps imagery, drops voice',
  });

  // ── W2: gestructureerde regels — modaliteit + save-for-AI-gate ──
  const structured = buildBrandManifest(makeStructuredFixture(), null, 'V.V. DTS ’35 Ede');
  const textRule = structured.hardRules.find((r) => r.text.includes('Geen emoji'));
  const visualRule = structured.hardRules.find((r) => r.text.includes('gradients in UI-chrome'));
  const gatedRule = structured.hardRules.find((r) => r.text.includes('stockfotografie'));
  checks.push({
    ok:
      textRule?.modality === 'text' &&
      visualRule?.modality === 'visual' &&
      gatedRule === undefined,
    label: 'structured rules: modality stamped, save-for-AI gate honoured',
  });

  const structuredCopyView = projectManifest(structured, 'copy');
  checks.push({
    ok:
      structuredCopyView.hardRules.some((r) => r.text.includes('Geen emoji')) &&
      !structuredCopyView.hardRules.some((r) => r.modality === 'visual'),
    label: 'copy view drops visual rules, keeps text rules',
  });

  const failed = checks.filter((c) => !c.ok);
  for (const check of checks) {
    console.log(`${check.ok ? 'PASS' : 'FAIL'}  ${check.label}`);
  }
  console.log(`\n${checks.length - failed.length}/${checks.length} checks passed`);
  return failed.length === 0 ? 0 : 1;
}

process.exit(run());
