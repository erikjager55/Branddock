/**
 * Smoke-test voor de review-drift-mapping (W5).
 *
 * Verifieert welke review-secties hun goedkeuring verliezen bij welke
 * snapshot-diff: de kleurrol-verdeling, de cosmetic-filter, de
 * spacing-categorieën, `system-roles` als afgeleide, en de logo-vergelijking.
 *
 * Puur — geen database, geen AI.
 *
 * Run: npx tsx scripts/smoke-tests/review-drift.ts
 */
import {
  reviewSectionsFromDiff,
  logoUrlsChanged,
} from '../../src/lib/brandstyle/review-drift';
import type { SnapshotDiff } from '../../src/lib/brandstyle/snapshots/snapshot-diff';

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

function makeDiff(overrides: Partial<SnapshotDiff> = {}): SnapshotDiff {
  return {
    fromCapturedAt: '2026-08-01T00:00:00.000Z',
    toCapturedAt: '2026-08-14T00:00:00.000Z',
    colors: [],
    typography: [],
    rounded: [],
    spacing: [],
    elevation: [],
    components: [],
    brandFoundation: {
      assetsAdded: [],
      assetsRemoved: [],
      assetsChanged: [],
      personasAdded: [],
      personasRemoved: [],
      competitorsAdded: [],
      competitorsRemoved: [],
    },
    isTrivial: false,
    ...overrides,
  } as SnapshotDiff;
}

const sectionsOf = (diff: SnapshotDiff | null, logosChanged = false) =>
  reviewSectionsFromDiff(diff, { logosChanged }).sections.sort();

// ─── 1. Kleuren ─────────────────────────────────────

console.log('\n1. Kleurrollen naar secties');

assert(
  'primary → colors-brand (+ system-roles)',
  sectionsOf(makeDiff({ colors: [{ role: 'primary', from: '#000', to: '#111' }] })).join(',') ===
    'colors-brand,system-roles',
);
assert(
  'surface → colors-neutrals',
  sectionsOf(makeDiff({ colors: [{ role: 'surface', from: '#fff', to: '#eee' }] })).includes(
    'colors-neutrals',
  ),
);
assert(
  'error → colors-semantic',
  sectionsOf(makeDiff({ colors: [{ role: 'error', from: '#f00', to: '#e00' }] })).includes(
    'colors-semantic',
  ),
);
assert(
  'meerdere rollen raken meerdere secties',
  sectionsOf(
    makeDiff({
      colors: [
        { role: 'primary', from: '#000', to: '#111' },
        { role: 'outline', from: '#ccc', to: '#ddd' },
      ],
    }),
  ).join(',') === 'colors-brand,colors-neutrals,system-roles',
);

const cosmetic = reviewSectionsFromDiff(
  makeDiff({ colors: [{ role: 'primary', from: '#000000', to: '#000001', cosmetic: true }] }),
);
assert(
  'cosmetische kleurwijziging reset niets',
  cosmetic.sections.length === 0,
  'anti-aliasing-ruis mag geen goedkeuring intrekken',
);
assert(
  'cosmetisch én echt: alleen de echte telt',
  sectionsOf(
    makeDiff({
      colors: [
        { role: 'primary', from: '#000000', to: '#000001', cosmetic: true },
        { role: 'surface', from: '#ffffff', to: '#f0f0f0' },
      ],
    }),
  ).join(',') === 'colors-neutrals,system-roles',
);

// ─── 2. Overige categorieën ─────────────────────────

console.log('\n2. Typografie, spacing, componenten');

assert(
  'typografie → brand-assets-fonts',
  sectionsOf(
    makeDiff({ typography: [{ role: 'body-md', from: null, to: null, fields: ['fontSize'] }] }),
  ).includes('brand-assets-fonts'),
);
assert(
  'rounded → spacing-radii',
  sectionsOf(makeDiff({ rounded: [{ key: 'md', from: 4, to: 8 }] })).includes('spacing-radii'),
);
assert(
  'spacing → spacing-scale',
  sectionsOf(makeDiff({ spacing: [{ key: 'md', from: 16, to: 20 }] })).includes('spacing-scale'),
);
assert(
  'elevation → spacing-shadow',
  sectionsOf(makeDiff({ elevation: [{ level: '2', from: 'a', to: 'b' }] })).includes(
    'spacing-shadow',
  ),
);
assert(
  'button-variant → components-buttons',
  sectionsOf(makeDiff({ components: [{ variant: 'button-primary', from: null, to: null }] })).includes(
    'components-buttons',
  ),
);
assert(
  'onbekende variant-prefix raakt geen sectie',
  sectionsOf(makeDiff({ components: [{ variant: 'zeppelin-xl', from: null, to: null }] })).length === 0,
);

// ─── 3. system-roles en randgevallen ────────────────

console.log('\n3. system-roles en randgevallen');

assert(
  'system-roles komt mee bij élke tokenwijziging',
  sectionsOf(makeDiff({ spacing: [{ key: 'sm', from: 8, to: 12 }] })).includes('system-roles'),
);
assert('lege diff → lege set', sectionsOf(makeDiff()).length === 0);
assert('null-diff zonder logo-signaal → lege set', sectionsOf(null).length === 0);
assert(
  'logo-wijziging alleen → alleen brand-assets-logos, géén system-roles',
  sectionsOf(null, true).join(',') === 'brand-assets-logos',
  'een logo raakt de design-tokens niet',
);
assert(
  'reden per sectie is gevuld',
  Boolean(
    reviewSectionsFromDiff(makeDiff({ colors: [{ role: 'primary', from: '#000', to: '#111' }] }))
      .reasons['colors-brand'],
  ),
);
assert(
  'meervoud in de reden klopt',
  reviewSectionsFromDiff(
    makeDiff({
      colors: [
        { role: 'primary', from: '#000', to: '#111' },
        { role: 'secondary', from: '#222', to: '#333' },
      ],
    }),
  ).reasons['colors-brand']?.includes('2 kleuren') === true,
);

// ─── 4. Logo-vergelijking ───────────────────────────

console.log('\n4. Logo-vergelijking');

assert(
  'zelfde set (andere volgorde) is geen wijziging',
  !logoUrlsChanged({ logoUrls: ['a.svg', 'b.svg'] }, { logoUrls: ['b.svg', 'a.svg'] }),
);
assert(
  'toegevoegd logo telt als wijziging',
  logoUrlsChanged({ logoUrls: ['a.svg'] }, { logoUrls: ['a.svg', 'b.svg'] }),
);
assert(
  'verwijderd logo telt als wijziging',
  logoUrlsChanged({ logoUrls: ['a.svg', 'b.svg'] }, { logoUrls: ['a.svg'] }),
);
assert(
  'beide leeg is geen wijziging',
  !logoUrlsChanged({ logoUrls: [] }, {}),
  'een eerste analyse mag nooit een reset veroorzaken',
);
assert('null-invoer is veilig', !logoUrlsChanged(null, null));

console.log(`\n${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);
