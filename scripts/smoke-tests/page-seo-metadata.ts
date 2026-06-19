/**
 * Smoke-test — GEO/SEO Fase 1a: seoChecklistToMetadata.
 * Verifieert dat de gepersisteerde SEO-checklist correct naar Next.js Metadata
 * mapt (title/description/canonical/OpenGraph/robots) en fail-soft is bij
 * ontbrekende/lege waarden (symptoom vóór de fix: elke gepubliceerde /p/[slug]
 * kreeg de generieke root-layout-meta).
 *
 * Run: npx tsx scripts/smoke-tests/page-seo-metadata.ts
 */
import { seoChecklistToMetadata, nonEmpty } from '../../src/lib/landing-pages/page-metadata';

let pass = 0,
  fail = 0;
function assert(name: string, cond: boolean, detail?: string): void {
  if (cond) {
    console.log(`  PASS ${name}`);
    pass++;
  } else {
    console.error(`  FAIL ${name}${detail ? ` -- ${detail}` : ''}`);
    fail++;
  }
}

console.log('── nonEmpty ──');
assert('lege string → undefined', nonEmpty('') === undefined);
assert('whitespace → undefined', nonEmpty('   ') === undefined);
assert('niet-string → undefined', nonEmpty(42) === undefined);
assert('trimt waarde', nonEmpty('  hallo  ') === 'hallo');

console.log('\n── fail-soft ──');
assert('null → {}', Object.keys(seoChecklistToMetadata(null)).length === 0);
assert('undefined → {}', Object.keys(seoChecklistToMetadata(undefined)).length === 0);
assert('lege checklist → {}', Object.keys(seoChecklistToMetadata({})).length === 0);
assert(
  'alleen whitespace-velden → {}',
  Object.keys(seoChecklistToMetadata({ titleTag: '  ', metaDescription: '' })).length === 0,
);

console.log('\n── volledige checklist ──');
const full = seoChecklistToMetadata({
  titleTag: 'Beste CRM voor MKB | Acme',
  metaDescription: 'Vergelijk Acme CRM features en prijzen.',
  ogTitle: 'Acme CRM',
  ogDescription: 'CRM die meegroeit.',
  canonicalTag: 'https://acme.branddock.app/crm',
});
assert('title gezet', full.title === 'Beste CRM voor MKB | Acme');
assert('description gezet', full.description === 'Vergelijk Acme CRM features en prijzen.');
assert(
  'canonical in alternates',
  (full.alternates?.canonical as string) === 'https://acme.branddock.app/crm',
);
assert('robots index+follow', full.robots !== undefined);
assert('og title gezet', full.openGraph?.title === 'Acme CRM');
assert('og description gezet', full.openGraph?.description === 'CRM die meegroeit.');
assert(
  'og url = canonical',
  (full.openGraph as { url?: string })?.url === 'https://acme.branddock.app/crm',
);

console.log('\n── og-fallback ──');
const ogFallback = seoChecklistToMetadata({
  titleTag: 'Titel T',
  metaDescription: 'Omschrijving D',
});
assert('og.title valt terug op titleTag', ogFallback.openGraph?.title === 'Titel T');
assert(
  'og.description valt terug op metaDescription',
  ogFallback.openGraph?.description === 'Omschrijving D',
);
assert('geen canonical → geen alternates', ogFallback.alternates === undefined);
assert(
  'geen canonical → og.url undefined',
  (ogFallback.openGraph as { url?: string })?.url === undefined,
);

console.log('\n── canonical-fallback ──');
const fb = 'https://acme.branddock.app/crm';
const noChecklistFb = seoChecklistToMetadata(null, { fallbackCanonical: fb });
assert('null + fallback → canonical gezet', (noChecklistFb.alternates?.canonical as string) === fb);
assert('null + fallback → robots gezet (indexeerbaar)', noChecklistFb.robots !== undefined);
assert('null + fallback → geen title', noChecklistFb.title === undefined);
assert(
  'expliciete canonicalTag wint van fallback',
  (seoChecklistToMetadata({ canonicalTag: 'https://expliciet' }, { fallbackCanonical: fb }).alternates
    ?.canonical as string) === 'https://expliciet',
);
assert(
  'lege checklist + fallback → fallback-canonical',
  (seoChecklistToMetadata({}, { fallbackCanonical: fb }).alternates?.canonical as string) === fb,
);
assert('geen checklist, geen fallback → {}', Object.keys(seoChecklistToMetadata(null)).length === 0);

console.log('\n── alleen og-velden (geen title) ──');
const ogOnly = seoChecklistToMetadata({ ogTitle: 'Sociale titel' });
assert('title undefined', ogOnly.title === undefined);
assert('openGraph wel gevuld', ogOnly.openGraph?.title === 'Sociale titel');
// Hygiëne: geen undefined-velden in het openGraph-object (review-bevinding 2026-06-17)
assert('og heeft geen description-key', !('description' in (ogOnly.openGraph ?? {})));
assert('og heeft geen url-key', !('url' in (ogOnly.openGraph ?? {})));
assert(
  'og-fallback zonder canonical heeft geen url-key',
  !('url' in (seoChecklistToMetadata({ titleTag: 'T', metaDescription: 'D' }).openGraph ?? {})),
);

console.log(`\n${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);
