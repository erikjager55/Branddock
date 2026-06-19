/**
 * Smoke-test voor content-item → Media Library ingestie — unit-level (no AI, no DB).
 *
 * Drie lagen:
 *  1. resolveMediaCategory + mediaCategoryForDeliverableType: per-contentType
 *     mapping, id-keyed resolutie en LIFESTYLE-fallback.
 *  2. Statische census-grep op de studio-routes: elke route die een beeld naar
 *     storage uploadt MOET het ook als MediaAsset ingesten (direct of via de
 *     wrapper) — behalve de bewust uitgesloten video/audio-routes. Dit is het
 *     regressie-vangnet zodat een nieuwe beeld-route de library niet stil kan
 *     omzeilen.
 *  3. Per-route wiring-assertions (replace-per-slot, stored-URL, id-keyed cat).
 *
 * Run: `npx tsx scripts/smoke-tests/content-item-library-ingest.ts`
 */

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { resolveMediaCategory } from '@/lib/media/resolve-media-category';
import { getDeliverableTypeById, DELIVERABLE_TYPES } from '@/features/campaigns/lib/deliverable-types';

// Spiegelt mediaCategoryForDeliverableType() zonder de server-gekoppelde
// helper te importeren (die trekt prisma binnen → niet laadbaar in deze unit).
const categoryForType = (id: string | null | undefined) =>
  resolveMediaCategory(getDeliverableTypeById(id ?? '')?.category);

let pass = 0;
let fail = 0;

function assert(name: string, cond: boolean, detail?: string) {
  if (cond) {
    console.log(`  ✓ ${name}`);
    pass++;
  } else {
    console.error(`  ✗ ${name}${detail ? ` — ${detail}` : ''}`);
    fail++;
  }
}

const STUDIO_DIR = join(process.cwd(), 'src/app/api/studio');
const MEDIA_DIR = join(process.cwd(), 'src/lib/media');

// Routes die wél beelden uploaden maar bewust NIET in de library landen
// (video naar fal.storage; tagger draait alleen op IMAGE). Census-allowlist.
const UPLOAD_WITHOUT_INGEST_ALLOWLIST = ['generate-video'];

// Multi-upload generate-routes: ingesten via de wrapper ingestUploadsToLibrary.
const GENERATE_ROUTES: Record<string, string> = {
  'generate-visual': '[deliverableId]/generate-visual/route.ts',
  'generate-visual-trained': '[deliverableId]/generate-visual-trained/route.ts',
  'generate-visual-compose': '[deliverableId]/generate-visual-compose/route.ts',
};

// Single-image routes + de bestaande #325-caller: roepen de util direct aan.
const DIRECT_INGEST_ROUTES: Record<string, string> = {
  'refine-visual': '[deliverableId]/components/[componentId]/refine-visual/route.ts',
  'edit-image': '[deliverableId]/edit-image/route.ts',
  'generate-feature-visuals': '[deliverableId]/generate-feature-visuals/route.ts',
};

function walkRouteFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) out.push(...walkRouteFiles(full));
    else if (entry === 'route.ts') out.push(full);
  }
  return out;
}

const ingestsLibrary = (src: string) =>
  src.includes('importGeneratedImageToLibrary(') || src.includes('ingestUploadsToLibrary(');

console.log('\n=== content-item-library-ingest smoke ===\n');

// ── 1. resolveMediaCategory mapping ──
console.log('## resolveMediaCategory — per-contentType mapping\n');
{
  assert('Social Media → SOCIAL_MEDIA', resolveMediaCategory('Social Media') === 'SOCIAL_MEDIA');
  assert('Advertising & Paid → ADVERTISEMENT', resolveMediaCategory('Advertising & Paid') === 'ADVERTISEMENT');
  assert('Website & Landing Pages → HERO_IMAGE', resolveMediaCategory('Website & Landing Pages') === 'HERO_IMAGE');
  assert('Long-Form Content → LIFESTYLE (fallback)', resolveMediaCategory('Long-Form Content') === 'LIFESTYLE');
  assert('Onbekende categorie → LIFESTYLE', resolveMediaCategory('Iets Onbekends') === 'LIFESTYLE');
  assert('undefined → LIFESTYLE', resolveMediaCategory(undefined) === 'LIFESTYLE');
  assert('null → LIFESTYLE', resolveMediaCategory(null) === 'LIFESTYLE');
  assert('lege string → LIFESTYLE', resolveMediaCategory('') === 'LIFESTYLE');
}

// ── 1b. id-keyed contract via mediaCategoryForDeliverableType ──
// Deliverable.contentType slaat de type-ID op ("blog-post"), NIET de naam
// ("Blog Post"). Een name-lookup faalt stil → altijd LIFESTYLE. De
// gecentraliseerde helper borgt de id-keyed keten end-to-end.
console.log('\n## id-keyed category-resolutie (contentType = type-id)\n');
{
  assert('landing-page → HERO_IMAGE', categoryForType('landing-page') === 'HERO_IMAGE');
  assert('linkedin-post → SOCIAL_MEDIA', categoryForType('linkedin-post') === 'SOCIAL_MEDIA');
  assert('linkedin-ad → ADVERTISEMENT', categoryForType('linkedin-ad') === 'ADVERTISEMENT');
  assert('blog-post → LIFESTYLE', categoryForType('blog-post') === 'LIFESTYLE');
  assert('onbekende id → LIFESTYLE', categoryForType('does-not-exist') === 'LIFESTYLE');
  assert('null → LIFESTYLE', categoryForType(null) === 'LIFESTYLE');
  // getById is de juiste resolver; een name-lookup op de id matcht nooit.
  assert(
    'getDeliverableTypeById(landing-page) bestaat',
    getDeliverableTypeById('landing-page') !== undefined,
  );
  assert(
    'name-lookup op een type-id matcht NIET (waarom id-keyed verplicht is)',
    DELIVERABLE_TYPES.find((d) => d.name === 'landing-page') === undefined,
  );
}

// ── 2. Census: elke storage.upload-beeld-route ingest naar de library ──
console.log('\n## census — storage.upload-routes ingesten (of OOS-allowlist)\n');
{
  const uploaders = walkRouteFiles(STUDIO_DIR).filter((f) =>
    readFileSync(f, 'utf8').includes('storage.upload('),
  );
  assert('Minstens 6 upload-routes gevonden', uploaders.length >= 6, `gevonden: ${uploaders.length}`);
  for (const f of uploaders) {
    const src = readFileSync(f, 'utf8');
    const rel = f.slice(STUDIO_DIR.length + 1);
    const allowlisted = UPLOAD_WITHOUT_INGEST_ALLOWLIST.some((a) => rel.includes(a));
    assert(
      `${rel} → ingest of OOS-allowlisted`,
      ingestsLibrary(src) || allowlisted,
      'uploadt beeld maar ingest niet en staat niet op de allowlist (library-omzeiling!)',
    );
  }
}

// ── 3. Per-route wiring-assertions ──
console.log('\n## per-route wiring\n');
{
  // Generate-routes: ingesten via de wrapper + threaden fileSize.
  for (const [label, rel] of Object.entries(GENERATE_ROUTES)) {
    const src = readFileSync(join(STUDIO_DIR, rel), 'utf8');
    assert(`${label}: roept ingestUploadsToLibrary aan`, src.includes('ingestUploadsToLibrary('));
    assert(`${label}: levert fileSize mee`, src.includes('fileSize:'));
  }

  // Single-image + #325-routes: roepen de util direct aan.
  for (const [label, rel] of Object.entries(DIRECT_INGEST_ROUTES)) {
    const src = readFileSync(join(STUDIO_DIR, rel), 'utf8');
    assert(`${label}: roept importGeneratedImageToLibrary aan`, src.includes('importGeneratedImageToLibrary('));
  }

  // refine-visual: replace-per-slot zodat herhaald verfijnen niet stapelt.
  const refine = readFileSync(join(STUDIO_DIR, DIRECT_INGEST_ROUTES['refine-visual']), 'utf8');
  assert('refine-visual: replace-per-slot via replaceBySourceUrl', refine.includes('replaceBySourceUrl'));
  assert('refine-visual: marker keyed op componentId', refine.includes('deliverable-component:'));

  // edit-image: stored-URL terug (geen verlopende fal-URL meer).
  const edit = readFileSync(join(STUDIO_DIR, DIRECT_INGEST_ROUTES['edit-image']), 'utf8');
  assert('edit-image: uploadt edit naar onze storage', edit.includes('storage.upload('));
  assert('edit-image: retourneert stored-URL (upload.url)', edit.includes('editedImageUrl: upload.url'));
  assert('edit-image: retourneert NIET de rauwe fal-URL', !edit.includes('editedImageUrl: first.url'));

  // Regressie-guard: categorie-resolutie is gecentraliseerd en id-keyed.
  // refine + edit gebruiken de helper, NOOIT een `d.name ===`-lookup.
  for (const label of ['refine-visual', 'edit-image'] as const) {
    const src = readFileSync(join(STUDIO_DIR, DIRECT_INGEST_ROUTES[label]), 'utf8');
    assert(`${label}: categorie via mediaCategoryForDeliverableType`, src.includes('mediaCategoryForDeliverableType('));
    assert(`${label}: GEEN name-lookup (d.name === contentType)`, !/d\.name === .*contentType/.test(src));
  }

  // De id-keyed resolver leeft op één plek: de wrapper-helper.
  const helper = readFileSync(join(MEDIA_DIR, 'ingest-uploads-to-library.ts'), 'utf8');
  assert('helper resolvet categorie via getDeliverableTypeById', helper.includes('getDeliverableTypeById('));
}

console.log(`\n=== TOTAL: ${pass} passed, ${fail} failed ===\n`);
process.exit(fail > 0 ? 1 : 0);
