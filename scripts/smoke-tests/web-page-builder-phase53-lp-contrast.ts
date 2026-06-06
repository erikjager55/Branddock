/**
 * Smoke-test — LP-render contrast (Track 1, 2026-06-06). De Medium-renderer paste
 * gescrapte per-rol tekstkleuren toe ZONDER her-check tegen de werkelijk
 * gerenderde achtergrond → zwarthout: witte h1 op lichte surface (1,07:1) +
 * donkere body op zwarte card. `resolveOnColor` clampt elke tekstkleur tegen de
 * ECHTE blok-bg (display/kop = AA-large 3.0; body = 5.0).
 *
 * Run: npx tsx scripts/smoke-tests/web-page-builder-phase53-lp-contrast.ts
 */
import { resolveOnColor, readableTextColor, contrastRatio } from '../../src/lib/landing-pages/wcag';

let pass = 0, fail = 0;
function assert(name: string, cond: boolean, detail?: string): void {
  if (cond) { console.log(`  PASS ${name}`); pass++; }
  else { console.error(`  FAIL ${name}${detail ? ` -- ${detail}` : ''}`); fail++; }
}

// Zwarthout-tokens
const SURFACE = '#F8F9FA';   // Soft White (licht surface)
const CHARCOAL = '#212529';  // Deep Charcoal (onSurface tekst)
const ORANGE = '#E06000';    // Burnt Orange (brand)
const BLACK = '#000000';     // gescrapte PRODUCT_CARD-bg
const PEACH = '#FBE3D4';     // brandSubtle (lichte oranje-tint testimonial-bg)
const WHITE = '#FFFFFF';

console.log('── Hero: gescrapte witte h1 op lichte surface mag NIET wit blijven ──');
{
  const heroH1 = resolveOnColor(WHITE, SURFACE, { fallback: CHARCOAL, minRatio: 3.0 });
  assert('hero h1 niet meer wit-op-licht', heroH1.toUpperCase() !== WHITE);
  assert('hero h1 leesbaar (≥3:1 als grote tekst)', contrastRatio(heroH1, SURFACE) >= 3.0, `${heroH1} ratio=${contrastRatio(heroH1, SURFACE).toFixed(2)}`);
  // sub (body, 5.0): gescrapte witte body op licht → charcoal-fallback.
  const heroSub = resolveOnColor(WHITE, SURFACE, { fallback: CHARCOAL });
  assert('hero sub leesbaar (≥4,5:1)', contrastRatio(heroSub, SURFACE) >= 4.5, `${heroSub}`);
}

console.log('\n── Cards: zwarte PRODUCT_CARD ──');
{
  const cardBody = resolveOnColor('#6B7280', BLACK, { fallback: CHARCOAL });
  assert('card body leesbaar op zwart (→ wit)', contrastRatio(cardBody, BLACK) >= 4.5, `${cardBody} ratio=${contrastRatio(cardBody, BLACK).toFixed(2)}`);
  const cardH3 = resolveOnColor(ORANGE, BLACK, { fallback: CHARCOAL, minRatio: 3.0 });
  assert('card kop: gescrapte oranje BEHOUDEN op zwart (leesbaar)', cardH3.toUpperCase() === ORANGE, cardH3);
  // op een LICHTE card zonder gescrapte kop-kleur → charcoal (geen geforceerd merk)
  const cardH3Light = resolveOnColor(null, SURFACE, { fallback: CHARCOAL, minRatio: 3.0 });
  assert('card kop op licht zonder scrape → charcoal', cardH3Light.toUpperCase() === CHARCOAL, cardH3Light);
}

console.log('\n── Testimonial: oranje op perzik (borderline) → leesbaar ──');
{
  const quote = resolveOnColor(ORANGE, PEACH, { fallback: CHARCOAL, minRatio: 3.0 });
  assert('quote leesbaar op perzik', contrastRatio(quote, PEACH) >= 3.0, `${quote} ratio=${contrastRatio(quote, PEACH).toFixed(2)}`);
  assert('quote flipt weg van te-lichte oranje', quote.toUpperCase() !== ORANGE || contrastRatio(ORANGE, PEACH) >= 3.0);
}

console.log('\n── Invariant: resolveOnColor levert NOOIT onleesbaar t.o.v. de bg ──');
{
  // Voor elke realistische bg: output is fg/fallback (indien leesbaar) of het
  // beste van zwart/wit — nooit een willekeurige onleesbare kleur.
  for (const bg of [SURFACE, BLACK, ORANGE, CHARCOAL, PEACH, '#313131', '#EEEEEE']) {
    const out = resolveOnColor('#9CA3AF', bg, { fallback: CHARCOAL });
    const bw = Math.max(contrastRatio('#000000', bg), contrastRatio('#FFFFFF', bg));
    // de output haalt minstens het beste-van-bw-niveau OF is de fg/fallback die ≥5 haalde
    assert(`leesbaar op ${bg}`, contrastRatio(out, bg) >= Math.min(5.0, bw) - 0.001, `${out} ratio=${contrastRatio(out, bg).toFixed(2)} bw=${bw.toFixed(2)}`);
  }
}

console.log('\n── readableTextColor: minRatio-param backward-compat (default 5.0) ──');
{
  assert('default 5.0: grijs net-4.5 valt terug', readableTextColor('#767676', WHITE, CHARCOAL) === CHARCOAL || contrastRatio('#767676', WHITE) >= 5.0);
  assert('minRatio 3.0: oranje-op-wit behouden (4,2≥3)', readableTextColor(ORANGE, WHITE, CHARCOAL, 3.0).toUpperCase() === ORANGE);
}

console.log(`\n${fail === 0 ? 'OK' : 'FAILED'} — ${pass} pass / ${fail} fail`);
process.exit(fail === 0 ? 0 : 1);
