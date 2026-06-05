/**
 * Smoke-test — brandstyle Fase 1 (plan functional-conjuring-harbor / audit
 * 2026-06-05). Verifieert dat CSS-var()-referenties tegen de volledige CSS
 * worden geresolved i.p.v. als letterlijke "var(--bs-*)" in de typografie te
 * belanden (de Zwarthout-bug: onopgeloste var(--bs-body-line-height)).
 *
 * Run: npx tsx scripts/smoke-tests/web-page-builder-phase41-brandstyle-var-resolution.ts
 */
import { resolveCssVar, resolveOrKeep } from '../../src/lib/brandstyle/css-var-resolver';
import { extractTypographyByRole } from '../../src/lib/brandstyle/typography-extractor';

let pass = 0, fail = 0;
function assert(name: string, cond: boolean, detail?: string): void {
  if (cond) { console.log(`  PASS ${name}`); pass++; }
  else { console.error(`  FAIL ${name}${detail ? ` -- ${detail}` : ''}`); fail++; }
}

const ROOT = ':root{--bs-body-font-size:16px;--bs-body-line-height:1.5;--bs-body-font-family:Inter, sans-serif;--bs-body-font-weight:400}';

console.log('\n── resolveCssVar (unit) ──');
assert('var → definitie', resolveCssVar('var(--bs-body-line-height)', ROOT) === '1.5');
assert('var → font-size', resolveCssVar('var(--bs-body-font-size)', ROOT) === '16px');
assert('var met fallback (def aanwezig wint)', resolveCssVar('var(--bs-body-line-height, 2)', ROOT) === '1.5');
assert('var met fallback (geen def → fallback)', resolveCssVar('var(--missing, 1.4)', ROOT) === '1.4');
assert('onresolveerbare var → null', resolveCssVar('var(--missing)', ROOT) === null);
assert('concrete waarde ongemoeid', resolveOrKeep('1.6', ROOT) === '1.6');
assert('concrete px ongemoeid', resolveOrKeep('18px', ROOT) === '18px');
// Review-bugfixes: fallback met eigen haakjes + geneste var + declaratie-grens
assert('fallback met rgb() haakjes', resolveCssVar('var(--missing, rgb(0,0,0))', ROOT) === 'rgb(0,0,0)');
assert('geneste var-fallback', resolveCssVar('var(--missing, var(--bs-body-line-height))', ROOT) === '1.5');
assert('declaratie-grens: --c niet uit --foo--c', resolveCssVar('var(--c)', '--foo--c: red; --c: blue') === 'blue');

console.log('\n── extractTypographyByRole (end-to-end) ──');
const css = `${ROOT}
body{font-family:var(--bs-body-font-family);font-size:var(--bs-body-font-size);line-height:var(--bs-body-line-height);font-weight:var(--bs-body-font-weight)}
h1{font-size:48px;line-height:1.1;font-family:Poppins}`;
const typ = extractTypographyByRole(css);
const body = typ.body;
const display = typ.display ?? typ.heading;

assert('body geëxtraheerd', !!body, JSON.stringify(typ));
if (body) {
  assert('body.fontSize geresolved (16px)', body.fontSize === '16px', `got=${body.fontSize}`);
  assert('body.lineHeight geresolved (1.5)', body.lineHeight === '1.5', `got=${body.lineHeight}`);
  assert('body.fontFamily geresolved (geen var)', !!body.fontFamily && !body.fontFamily.includes('var('), `got=${body.fontFamily}`);
  assert('body GEEN enkele letterlijke var()', JSON.stringify(body) ? !JSON.stringify({ fs: body.fontSize, lh: body.lineHeight, ff: body.fontFamily, fw: body.fontWeight }).includes('var(') : false);
}
if (display) {
  assert('h1.fontSize concreet (48px)', display.fontSize === '48px', `got=${display.fontSize}`);
}

console.log('\n── font-stack via var (review-bugfix #2) ──');
const cssStack = `:root{--ff:"Helvetica Neue", Arial, sans-serif}
body{font-family:var(--ff);font-size:15px}`;
const tStack = extractTypographyByRole(cssStack);
if (tStack.body) {
  assert('var-fontstack → eerste familie, geen quotes/komma', tStack.body.fontFamily === 'Helvetica Neue', `got=${tStack.body.fontFamily}`);
}

console.log(`\n${fail === 0 ? 'OK' : 'FAILED'} — ${pass} pass / ${fail} fail`);
process.exit(fail === 0 ? 0 : 1);
