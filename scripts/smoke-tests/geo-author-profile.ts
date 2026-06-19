/**
 * Smoke-test — GEO/SEO Fase 3: resolveAuthorProfile (E-E-A-T author-bron) +
 * isContentStale (90-dagen freshness). Pure functies; verifieert dat een author
 * alleen bij een verifieerbare identiteit ontstaat, sameAs op http(s) gefilterd
 * wordt, en de staleness-drempel deterministisch werkt.
 *
 * Run: npx tsx scripts/smoke-tests/geo-author-profile.ts
 */
import {
  resolveAuthorProfile,
  isContentStale,
  DEFAULT_STALENESS_DAYS,
} from '../../src/lib/landing-pages/author-profile';

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

console.log('── resolveAuthorProfile ──');
assert('null bij undefined', resolveAuthorProfile(undefined) === null);
assert('null bij niet-object', resolveAuthorProfile('Jane') === null);
assert('null bij array', resolveAuthorProfile(['Jane']) === null);
assert('null bij lege naam', resolveAuthorProfile({ name: '   ' }) === null);
assert('null zonder naam', resolveAuthorProfile({ jobTitle: 'CEO' }) === null);

const full = resolveAuthorProfile({
  name: '  Jane Doe ',
  jobTitle: ' Head of Content ',
  sameAs: ['https://linkedin.com/in/janedoe', 'mailto:jane@acme.com', 'ftp://x', '  https://jane.dev '],
});
assert('naam getrimd', full?.name === 'Jane Doe');
assert('jobTitle getrimd', full?.jobTitle === 'Head of Content');
assert('sameAs alleen http(s)', JSON.stringify(full?.sameAs) === JSON.stringify(['https://linkedin.com/in/janedoe', 'https://jane.dev']));

const minimal = resolveAuthorProfile({ name: 'Bob' });
assert('minimaal profiel zonder jobTitle/sameAs', !!minimal && minimal.name === 'Bob' && minimal.jobTitle === undefined && minimal.sameAs === undefined);
assert('lege sameAs-array → geen sameAs-veld', resolveAuthorProfile({ name: 'Bob', sameAs: [] })?.sameAs === undefined);

console.log('\n── isContentStale ──');
assert('default-drempel = 90', DEFAULT_STALENESS_DAYS === 90);
const now = new Date('2026-06-19T00:00:00.000Z');
const recent = new Date('2026-05-01T00:00:00.000Z').toISOString(); // ~49 dagen
const old = new Date('2026-01-01T00:00:00.000Z').toISOString(); // ~169 dagen
assert('recent → niet stale', isContentStale(recent, now) === false);
assert('oud → stale', isContentStale(old, now) === true);
assert('null → niet stale (fail-soft)', isContentStale(null, now) === false);
assert('ongeldige datum → niet stale', isContentStale('not-a-date', now) === false);
assert('custom drempel 30 dagen', isContentStale(recent, now, 30) === true);

console.log(`\n${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);
