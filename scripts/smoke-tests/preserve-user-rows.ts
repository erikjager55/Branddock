/**
 * Smoke voor de user-edit-bescherming bij re-analyse (W5).
 *
 * Volledig DB-vrij: `preserve-user-rows.ts` bevat uitsluitend pure functies,
 * precies zodat dit zonder Postgres draait. De wiring in de analyse-engine
 * wordt bewezen door `scripts/dev/verify-refresh-preserves.ts` — dat is een
 * echte dubbele analyse-run.
 *
 * Run: npx tsx scripts/smoke-tests/preserve-user-rows.ts
 */
import {
  allocateFreeSlots,
  applyFieldClaims,
  colorKey,
  componentKey,
  omitClaimed,
  onlyProvided,
  suppressOwned,
  suppressOwnedLogoVariants,
} from '../../src/lib/brandstyle/preserve-user-rows';

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

// ── 1. Kleursleutels ────────────────────────────────────
console.log('\n1. colorKey — casing en # mogen geen duplicaat opleveren');

assert('# wordt gestript', colorKey('#FF0000') === 'ff0000');
assert('zonder # werkt ook', colorKey('ff0000') === 'ff0000');
assert('hoofdletters normaliseren', colorKey('#Ff0000') === colorKey('#fF0000'));
assert('whitespace wordt getrimd', colorKey('  #FF0000 ') === 'ff0000');
assert(
  'verschillende kleuren blijven verschillend',
  colorKey('#FF0000') !== colorKey('#FF0001'),
);

// ── 2. Componentsleutels ────────────────────────────────
console.log('\n2. componentKey — type + label');

assert(
  'type en label vormen samen de sleutel',
  componentKey('BUTTON', 'Primary') === componentKey('BUTTON', 'primary'),
  'label-casing mag niet uitmaken',
);
assert(
  'hetzelfde label bij een ander type is een ander component',
  componentKey('BUTTON', 'Primary') !== componentKey('CHIP', 'Primary'),
);
assert(
  'spaties rond het label worden getrimd',
  componentKey('BUTTON', ' Primary ') === componentKey('BUTTON', 'Primary'),
);

// ── 3. Suppressie ───────────────────────────────────────
console.log('\n3. suppressOwned — de user-rij wint, geen duplicaat');

const scrapedColors = [
  { hex: '#0060A0', name: 'Blauw' },
  { hex: '#FF0000', name: 'Rood' },
  { hex: '#FFFFFF', name: 'Wit' },
];

const kept = suppressOwned(scrapedColors, (c) => colorKey(c.hex), new Set(['ff0000']));
assert('de kleur die de user bezit valt uit de verse batch', kept.length === 2);
assert(
  'de overige kleuren blijven, in volgorde',
  kept[0].hex === '#0060A0' && kept[1].hex === '#FFFFFF',
);

const caseInsensitive = suppressOwned(
  scrapedColors,
  (c) => colorKey(c.hex),
  new Set([colorKey('#ff0000')]),
);
assert(
  'casing-verschil onderdrukt óók — anders krijg je alsnog een duplicaat',
  caseInsensitive.length === 2,
);

assert(
  'zonder user-rijen verandert er niets',
  suppressOwned(scrapedColors, (c) => colorKey(c.hex), new Set()).length === 3,
);

assert(
  'een lege batch blijft leeg',
  suppressOwned([], (c: { hex: string }) => colorKey(c.hex), new Set(['ff0000'])).length === 0,
);

const allOwned = suppressOwned(
  scrapedColors,
  (c) => colorKey(c.hex),
  new Set(['0060a0', 'ff0000', 'ffffff']),
);
assert('alles in bezit → niets aan te maken', allOwned.length === 0);

// ── 4. Logo-varianten ───────────────────────────────────
console.log('\n4. suppressOwnedLogoVariants — geen tweede PRIMARY, maar wel meerdere lockups');

const scrapedLogos = [
  { variant: 'PRIMARY', fileUrl: 'a.svg' },
  { variant: 'LOCKUP', fileUrl: 'b.svg' },
  { variant: 'LOCKUP', fileUrl: 'c.svg' },
];

const withUploadedPrimary = suppressOwnedLogoVariants(scrapedLogos, [
  { variant: 'PRIMARY', fileUrl: 'eigen.svg' },
]);
assert(
  'een geüpload PRIMARY-logo laat geen tweede PRIMARY toe',
  withUploadedPrimary.every((l) => l.variant !== 'PRIMARY'),
);
assert(
  'de gescrapte PRIMARY wordt gedegradeerd, niet weggegooid',
  withUploadedPrimary.length === 3 &&
    withUploadedPrimary.filter((l) => l.fileUrl === 'a.svg')[0]?.variant === 'LOCKUP',
  'anders verdwijnt die asset elke run uit de bibliotheek',
);
assert(
  'een geüploade LOCKUP blokkeert de andere lockups NIET — die variant is meervoudig',
  suppressOwnedLogoVariants(scrapedLogos, [{ variant: 'LOCKUP', fileUrl: 'eigen.svg' }]).length === 3,
  'anders verdwijnen alle gedetecteerde lockups permanent uit de bibliotheek',
);
assert(
  'dezelfde asset komt niet twee keer terug',
  suppressOwnedLogoVariants(scrapedLogos, [{ variant: 'LOCKUP', fileUrl: 'b.svg' }]).length === 2,
);
assert(
  'zonder uploads verandert er niets',
  suppressOwnedLogoVariants(scrapedLogos, []).length === 3,
);

// ── 5. Partiële update ──────────────────────────────────
console.log('\n5. onlyProvided — een lege AI-respons wist niets');

const empty = onlyProvided({
  logoDonts: [],
  colorDonts: undefined,
  primaryFontName: null,
  primaryFontUrl: '',
});
assert(
  'lege array, undefined, null en lege string worden allemaal overgeslagen',
  Object.keys(empty).length === 0,
  JSON.stringify(empty),
);

const filled = onlyProvided({
  logoDonts: ['Niet uitrekken'],
  primaryFontName: 'Effra',
  colorDonts: [],
});
assert('gevulde velden worden wél geschreven', Object.keys(filled).length === 2);
assert('de waarde blijft intact', filled.primaryFontName === 'Effra');
assert('het lege veld ontbreekt in het update-object', !('colorDonts' in filled));

const falsy = onlyProvided({ enabled: false, count: 0 });
assert(
  'false en 0 zijn betekenisvolle waarden en overleven',
  falsy.enabled === false && falsy.count === 0,
);

assert(
  'whitespace-only string telt als leeg',
  Object.keys(onlyProvided({ voiceSample: '   ' })).length === 0,
);

// ── 6. Geclaimde velden ─────────────────────────────────
console.log('\n6. onlyProvided — een geclaimd veld wint óók van een geslaagde AI-respons');

const overAClaim = onlyProvided(
  { logoDonts: ['AI-versie'], colorDonts: ['AI-versie'] },
  ['logoDonts'],
);
assert(
  'het geclaimde veld wordt niet geschreven',
  !('logoDonts' in overAClaim),
  JSON.stringify(overAClaim),
);
assert('een niet-geclaimd veld wél', overAClaim.colorDonts?.[0] === 'AI-versie');
assert(
  'zonder claims verandert er niets aan het oude gedrag',
  Object.keys(onlyProvided({ logoDonts: ['AI-versie'] })).length === 1,
);

// ── 7. Claims bijhouden ─────────────────────────────────
console.log('\n7. applyFieldClaims — schrijven claimt, leegmaken geeft terug');

assert(
  'een geschreven veld wordt geclaimd',
  applyFieldClaims([], { logoDonts: ['Niet uitrekken'] }).includes('logoDonts'),
);
assert(
  'een bestaande claim blijft staan bij een PATCH op een ander veld',
  applyFieldClaims(['logoDonts'], { colorDonts: ['x'] }).sort().join(',') ===
    'colorDonts,logoDonts',
);
assert(
  'het veld leegmaken geeft het terug aan de scraper',
  !applyFieldClaims(['logoDonts'], { logoDonts: [] }).includes('logoDonts'),
);
assert(
  'null doet hetzelfde',
  !applyFieldClaims(['primaryFontName'], { primaryFontName: null }).includes('primaryFontName'),
);
assert(
  'velden buiten de claim-lijst worden genegeerd',
  applyFieldClaims([], { semanticTokens: { overrides: {} }, buttonProfile: {} }).length === 0,
  'die hebben hun eigen mechanisme',
);
assert(
  'dezelfde claim twee keer levert geen duplicaat',
  applyFieldClaims(['logoDonts'], { logoDonts: ['nieuw'] }).length === 1,
);

// ── 8. omitClaimed ──────────────────────────────────────
console.log('\n8. omitClaimed — afgeleide data reist als blok, alleen een claim houdt tegen');

const typo = omitClaimed(
  { primaryFontName: 'Poppins', primaryFontUrl: null, additionalFonts: [], typeScale: [] },
  [],
);
assert(
  'een lege waarde wordt hier WEL geschreven',
  'additionalFonts' in typo && 'primaryFontUrl' in typo && 'typeScale' in typo,
  'anders blijft het profiel naar de font van een vorige scrape wijzen',
);
assert('en de lege waarde is echt leeg', typo.additionalFonts?.length === 0);

const typoClaimed = omitClaimed(
  { primaryFontName: 'Poppins', additionalFonts: ['Inter'] },
  ['primaryFontName'],
);
assert(
  'een geclaimd veld wordt overgeslagen',
  !('primaryFontName' in typoClaimed) && typoClaimed.additionalFonts?.[0] === 'Inter',
);

// ── 9. Sorteerplekken ───────────────────────────────────
console.log('\n9. allocateFreeSlots — bewaarde rijen houden hun plek');

assert(
  'zonder bezette plekken gewoon 0..n-1',
  allocateFreeSlots(3, new Set()).join(',') === '0,1,2',
);
assert(
  'de bezette plek wordt overgeslagen',
  allocateFreeSlots(3, new Set([1])).join(',') === '0,2,3',
);
assert(
  'meerdere bezette plekken, ook niet-aaneengesloten',
  allocateFreeSlots(3, new Set([0, 2, 5])).join(',') === '1,3,4',
);
assert('nul verse rijen → geen plekken', allocateFreeSlots(0, new Set([0, 1])).length === 0);
assert(
  'een hoge bezette plek blokkeert de lage niet',
  allocateFreeSlots(2, new Set([999])).join(',') === '0,1',
);
assert(
  'geen enkele uitgedeelde plek botst met een bezette',
  allocateFreeSlots(5, new Set([1, 3])).every((s) => ![1, 3].includes(s)),
);

console.log(`\n${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);
