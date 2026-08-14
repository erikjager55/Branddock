/**
 * Smoke-test voor het Brand Library-consumptiecontract (W7.1).
 *
 * Dekt de gate-matrix (publish × zes sectie-vlaggen), de scheiding tussen
 * gegate prozasecties en ongegate render-tokens, de marker-stripping en de
 * `gates`-rapportage.
 *
 * Puur: importeert alleen `project.ts` + `views.ts`, dus geen database.
 *
 * Run: npx tsx scripts/smoke-tests/brand-library-accessor.ts
 */
import {
  projectBrandLibrary,
  emptyBrandLibrary,
  resolveGates,
  type StyleguideRowForLibrary,
} from '../../src/lib/brand-library/project';

let pass = 0;
let fail = 0;

function assert(name: string, cond: boolean, detail?: string): void {
  if (cond) {
    console.log(`  ✓ ${name}`);
    pass++;
  } else {
    console.error(`  ✗ ${name}${detail ? ` — ${detail}` : ''}`);
    fail++;
  }
}

const ALL_OPEN = {
  published: true,
  colorsSavedForAi: true,
  typographySavedForAi: true,
  imagerySavedForAi: true,
  designLanguageSavedForAi: true,
  visualLanguageSavedForAi: true,
  logoSavedForAi: true,
};

function makeRow(overrides: Partial<StyleguideRowForLibrary> = {}): StyleguideRowForLibrary {
  return {
    ...ALL_OPEN,
    status: 'COMPLETE',
    manifestVersion: 3,
    brandManifest: {
      manifestVersion: 3,
      generatedAt: '2026-08-14T00:00:00.000Z',
      brandName: 'Testmerk',
      quickFacts: [],
      hardRules: [
        { text: 'Geen emoji', source: 'user', severity: 'BLOCKING', modality: 'text' },
        { text: 'Geen gradients', source: 'scraped', severity: 'ADVISORY', modality: 'visual' },
      ],
      substitutions: [],
      knownGaps: [],
      iterationGuide: [],
      tokens: { colors: { primary: '#0060A0' } },
      voiceBaseline: 'Feitelijk en kort.',
      imagery: { style: 'authentiek', guidelines: [], donts: [] },
    },
    designPhilosophy: 'OBSERVED: sober en blauw',
    sourceUrl: 'https://example.test',

    primaryFontName: 'HelveticaNeue',
    layoutStyle: 'COMMERCIAL',
    layoutStyleInferred: false,
    archetype: null,

    typeScale: [{ level: 'h1', size: '64px' }],
    semanticColors: { info: { base: '#0060A0' } },
    semanticTokens: { resolved: { colors: { primary: '#0060A0' } } },
    buttonProfile: { radius: 4 },
    typographyProfile: null,
    spacingProfile: null,
    spacingScale: null,
    elevationProfile: null,
    radiusProfile: null,
    motionProfile: null,
    brandImages: [{ url: 'https://example.test/a.png' }],
    fixtureSamples: { headline: 'Zege in de slotfase' },

    colorDonts: ['RECOMMENDED: geen accentkleuren verzinnen'],
    logoGuidelines: ['OBSERVED: altijd op wit'],
    logoDonts: ['Niet uitrekken'],
    photographyStyle: { mood: 'OBSERVED: true-to-life', subjects: 'NOTE: spelers' },
    photographyGuidelines: ['OBSERVED: natuurlijk licht'],
    illustrationGuidelines: [],
    imageryDonts: ['RECOMMENDED: geen stockfoto’s'],
    graphicElements: { shapes: 'OBSERVED: cirkels' },
    patternsTextures: null,
    iconographyStyle: { stroke: 'OBSERVED: 1.5px' },
    gradientsEffects: null,
    layoutPrinciples: { grid: 'OBSERVED: 12 koloms' },
    graphicElementsDonts: ['Geen slagschaduw'],
    iconographyDonts: ['Geen gevulde iconen'],
    visualLanguage: { hero: 'OBSERVED: scrim over foto' },

    colors: [
      {
        name: 'Royal Blue',
        hex: '#0060A0',
        category: 'PRIMARY',
        sortOrder: 0,
        tags: [],
        contrastWhite: 5.1,
        contrastBlack: 4.1,
        confidence: 'high',
        detectorSource: 'css',
      },
    ],
    fonts: [
      {
        name: 'HelveticaNeue',
        role: 'BODY',
        source: 'DETECTED',
        fileUrl: null,
        fileType: null,
        weight: '300',
        fontFamily: 'HelveticaNeue, sans-serif',
        availability: 'COMMERCIAL',
        sortOrder: 0,
      },
    ],
    logos: [
      {
        variant: 'PRIMARY',
        fileUrl: 'https://example.test/logo.svg',
        fileType: 'svg',
        width: 200,
        height: 60,
        sortOrder: 0,
        description: 'OBSERVED: rond badge-logo',
      },
    ],
    components: [
      { type: 'BUTTON', label: 'Primary', extractedStyles: { radius: 4 }, confidence: 0.9 },
    ],
    rules: [
      {
        id: 'r1',
        section: 'voice',
        kind: 'HARD_RULE',
        severity: 'ADVISORY',
        source: 'derived',
        title: 'OBSERVED: geen uitroeptekens',
        description: null,
        constraint: { modality: 'text', check: 'no-exclamation-marks', derivedBy: 'ai' },
      },
    ],
    ...overrides,
  } as StyleguideRowForLibrary;
}

const project = (overrides: Partial<StyleguideRowForLibrary> = {}) =>
  projectBrandLibrary('ws-1', makeRow(overrides), 'full', 'kit-123');

// ─── 1. Gate-matrix ─────────────────────────────────

console.log('\n1. Gate-matrix');

const open = project();
assert(
  'alle secties aanwezig als elke gate open staat',
  Boolean(
    open.sections.colors &&
      open.sections.typography &&
      open.sections.imagery &&
      open.sections.designLanguage &&
      open.sections.visualLanguage &&
      open.sections.logo,
  ),
);

const unpublished = project({ published: false });
assert(
  'niet gepubliceerd → geen enkele sectie',
  Object.keys(unpublished.sections).length === 0,
  JSON.stringify(Object.keys(unpublished.sections)),
);
assert(
  'niet gepubliceerd → render-tokens blijven wél beschikbaar',
  unpublished.render.colors.length === 1 &&
    unpublished.render.fonts.length === 1 &&
    unpublished.render.components.length === 1,
  'een pagina moet in de merkkleuren kunnen renderen tijdens review',
);
assert('niet gepubliceerd → geen manifest', unpublished.manifest === null && unpublished.markdown === '');

const perSection: Array<[keyof StyleguideRowForLibrary, keyof typeof open.sections]> = [
  ['colorsSavedForAi', 'colors'],
  ['typographySavedForAi', 'typography'],
  ['imagerySavedForAi', 'imagery'],
  ['designLanguageSavedForAi', 'designLanguage'],
  ['visualLanguageSavedForAi', 'visualLanguage'],
  ['logoSavedForAi', 'logo'],
];
for (const [flag, section] of perSection) {
  const closed = project({ [flag]: false } as Partial<StyleguideRowForLibrary>);
  const others = perSection.filter(([, s]) => s !== section).every(([, s]) => closed.sections[s]);
  assert(
    `${String(flag)}=false sluit alleen '${section}'`,
    closed.sections[section] === undefined && others,
  );
}

// ─── 2. Gate-rapportage ─────────────────────────────

console.log('\n2. Gate-rapportage');

assert('gates rapporteren open state', open.gates.published && open.gates.imagery);
assert(
  'gates onderscheiden "dicht" van "leeg"',
  project({ imagerySavedForAi: false }).gates.imagery === false,
);
assert(
  'publish-gate overschrijft de sectie-vlaggen',
  Object.values(resolveGates(makeRow({ published: false }))).every((v) => v === false),
);
assert(
  'lege bibliotheek is een object, geen null',
  emptyBrandLibrary('ws-2', 'full', null).workspaceId === 'ws-2',
);

// ─── 3. Marker-stripping ────────────────────────────

console.log('\n3. Marker-stripping');

const hasMarker = (value: unknown): boolean =>
  /\b(observed|recommended|note):/i.test(JSON.stringify(value ?? ''));

assert('imagery is marker-vrij', !hasMarker(open.sections.imagery));
assert('design-language is marker-vrij', !hasMarker(open.sections.designLanguage));
assert('visual-language is marker-vrij', !hasMarker(open.sections.visualLanguage));
assert('logo-sectie is marker-vrij', !hasMarker(open.sections.logo));
assert('colors-donts zijn marker-vrij', !hasMarker(open.sections.colors?.donts));
assert('designPhilosophy is marker-vrij', !hasMarker(open.meta.designPhilosophy));
assert('regels zijn marker-vrij', !hasMarker(open.rules));
assert('render-logos zijn marker-vrij', !hasMarker(open.render.logos));
assert(
  'photographyStyle behoudt zijn keys (labels blijven intact)',
  Object.keys(open.sections.imagery?.photographyStyle ?? {}).join(',') === 'mood,subjects',
  JSON.stringify(open.sections.imagery?.photographyStyle),
);

// ─── 4. Render-helft bevat geen proza ───────────────

console.log('\n4. Scheiding render vs proza');

const renderKeys = Object.keys(open.render);
const proseKeys = [
  'photographyStyle',
  'photographyGuidelines',
  'imageryDonts',
  'logoGuidelines',
  'logoDonts',
  'colorDonts',
  'graphicElements',
  'visualLanguage',
  'designPhilosophy',
];
assert(
  'render bevat geen prozavelden (anders is het de nieuwe achterdeur)',
  proseKeys.every((k) => !renderKeys.includes(k)),
  renderKeys.filter((k) => proseKeys.includes(k)).join(', '),
);
assert('render draagt de workspace-scalar adobeFontsKitId', open.render.adobeFontsKitId === 'kit-123');

// ─── 5. View-projectie ──────────────────────────────

console.log('\n5. View-projectie');

const copyView = projectBrandLibrary('ws-1', makeRow(), 'copy', null);
assert('copy-view laat tokens weg', copyView.manifest?.tokens === undefined);
assert(
  'copy-view laat visuele regels weg, houdt tekstregels',
  copyView.manifest?.hardRules.length === 1 &&
    copyView.manifest.hardRules[0].modality === 'text',
);
assert('markdown volgt de geprojecteerde view', !copyView.markdown.includes('Geen gradients'));

// ─── 6. Randgevallen ────────────────────────────────

console.log('\n6. Randgevallen');

const noManifest = project({ brandManifest: null });
assert('geen manifest → null + lege markdown', noManifest.manifest === null && noManifest.markdown === '');
const empty = emptyBrandLibrary('ws-3', 'full', null);
assert(
  'lege bibliotheek heeft lege secties en lege render-arrays',
  Object.keys(empty.sections).length === 0 && empty.render.colors.length === 0,
);
assert('lege bibliotheek rapporteert alle gates dicht', Object.values(empty.gates).every((v) => !v));

console.log(`\n${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);
