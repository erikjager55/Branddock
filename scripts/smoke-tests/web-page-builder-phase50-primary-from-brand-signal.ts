/**
 * Smoke-test — brand-PRIMARY-from-merk-signaal (2026-06-05, Napking-fix).
 *
 * Symptoom: de AI-classifier kent PRIMARY toe aan de meest-frequente kleur. Op
 * een merk met een achromatisch wordmark + chromatische accent (Napking: zwart
 * wordmark #1A171B, blauwe logo-'a' #008ACF) wint daardoor de near-black
 * TEKSTkleur de PRIMARY-slot terwijl de échte merk-kleur naar ACCENT zakt.
 *
 * `demoteAchromaticPrimary` demote een achromatische PRIMARY → NEUTRAL en
 * promote de sterkste chromatische merk-kleur → PRIMARY, alléén met positief
 * merk-bewijs. Deze test dekt de happy-path + alle red-team-regressies:
 *   - Napking swapt (via logo-guideline-hex én via vision-rol zonder guideline)
 *   - Zwarthout (chromatische primary) → géén swap
 *   - monochroom merk → no-op (zwart blijft)
 *   - logo-zegt-zwart + detector-asserted → no-op (4b)
 *   - zwart + status-rood / chromatische LINK-blauw → géén swap (FLAW 2/3)
 *   - verzadigde donker-navy primary → NIET gedemote (FLAW 1)
 *   - framework/social/low-conf challenger → nooit gepromote
 *   - positieve controle: charcoal-tekst + teal merk → swapt
 *
 * Run: DATABASE_URL=... npx tsx scripts/smoke-tests/web-page-builder-phase50-primary-from-brand-signal.ts
 */
import { demoteAchromaticPrimary, type ResolvedColor } from '../../src/lib/brandstyle/analysis-engine';
import type { AuthoritativeColor } from '../../src/lib/brandstyle/analysis-prompts';

let pass = 0, fail = 0;
function assert(name: string, cond: boolean, detail?: string): void {
  if (cond) { console.log(`  PASS ${name}`); pass++; }
  else { console.error(`  FAIL ${name}${detail ? ` -- ${detail}` : ''}`); fail++; }
}

type RCInit = Partial<ResolvedColor> & Pick<ResolvedColor, 'hex' | 'category'>;
function rc(init: RCInit): ResolvedColor {
  return {
    name: init.hex,
    tags: [],
    notes: null,
    confidence: 'high',
    detectorSource: 'frequency',
    ...init,
  };
}
type ACInit = Partial<AuthoritativeColor> & Pick<AuthoritativeColor, 'hex'>;
function ac(init: ACInit): AuthoritativeColor {
  return { source: 'frequency', confidence: 'high', ...init };
}
function catOf(out: ResolvedColor[], hex: string): string | undefined {
  return out.find((c) => c.hex === hex)?.category;
}

console.log('── 1. Napking swap via logo-guideline-hex ──');
{
  const colors = [
    rc({ hex: '#1A171B', category: 'PRIMARY', tags: ['text', 'headings', 'brand-dark'] }),
    rc({ hex: '#008ACF', category: 'ACCENT', tags: ['cta', 'buttons', 'interactive', 'brand-accent'] }),
    rc({ hex: '#EEEEEE', category: 'NEUTRAL', tags: ['backgrounds'], confidence: 'medium' }),
  ];
  const auth = [
    ac({ hex: '#1A171B', usageEvidence: 'strong' }),
    ac({ hex: '#008ACF', usageEvidence: 'weak' }),
    ac({ hex: '#EEEEEE', usageEvidence: 'strong' }),
  ];
  const out = demoteAchromaticPrimary(colors, auth, ["The 'a' uses the brand's Ocean Blue (#008ACF)"]);
  assert('Ocean Blue #008ACF → PRIMARY', catOf(out, '#008ACF') === 'PRIMARY', catOf(out, '#008ACF'));
  assert('Deep Charcoal #1A171B → NEUTRAL', catOf(out, '#1A171B') === 'NEUTRAL', catOf(out, '#1A171B'));
}

console.log('\n── 1b. Napking swap ZONDER guideline-hex (via vision-cta + brand-tag) ──');
{
  const colors = [
    rc({ hex: '#1A171B', category: 'PRIMARY', tags: ['text', 'headings'] }),
    rc({ hex: '#008ACF', category: 'ACCENT', tags: ['cta', 'buttons'] }),
  ];
  const auth = [
    ac({ hex: '#1A171B', usageEvidence: 'strong' }),
    ac({ hex: '#008ACF', visionRole: 'cta', usageEvidence: 'weak' }),
  ];
  const out = demoteAchromaticPrimary(colors, auth, []);
  assert('vision-cta + cta-tag → swap (#008ACF PRIMARY)', catOf(out, '#008ACF') === 'PRIMARY', catOf(out, '#008ACF'));
  assert('charcoal → NEUTRAL', catOf(out, '#1A171B') === 'NEUTRAL');
}

console.log('\n── 2. Zwarthout: chromatische PRIMARY → géén swap (guard #1) ──');
{
  const colors = [
    rc({ hex: '#E06000', category: 'PRIMARY', tags: ['brand', 'logo'], detectorSource: 'logo-extraction:histogram' }),
    rc({ hex: '#212529', category: 'NEUTRAL', tags: ['text'] }),
    rc({ hex: '#F8F9FA', category: 'NEUTRAL', tags: ['surface'] }),
  ];
  const auth = colors.map((c) => ac({ hex: c.hex }));
  const out = demoteAchromaticPrimary(colors, auth, ["Logo in Burnt Orange (#E06000)"]);
  assert('oranje #E06000 blijft PRIMARY', catOf(out, '#E06000') === 'PRIMARY');
  assert('strict no-op (categorieën onveranderd)', out.every((c, i) => c.category === colors[i].category));
}

console.log('\n── 3. Monochroom merk → no-op (guard #2: geen chromatisch alternatief) ──');
{
  const colors = [
    rc({ hex: '#000000', category: 'PRIMARY' }),
    rc({ hex: '#FFFFFF', category: 'NEUTRAL' }),
    rc({ hex: '#767676', category: 'NEUTRAL' }),
  ];
  const auth = colors.map((c) => ac({ hex: c.hex }));
  const out = demoteAchromaticPrimary(colors, auth, []);
  assert('zwart blijft PRIMARY', catOf(out, '#000000') === 'PRIMARY');
}

console.log('\n── 3b. Logo zegt "zwart" + detector-asserted → no-op (archetype 4b) ──');
{
  const colors = [
    rc({ hex: '#1A171B', category: 'PRIMARY', detectorSource: 'logo-extraction:histogram' }),
    rc({ hex: '#008ACF', category: 'ACCENT', tags: ['cta'] }),
  ];
  const auth = [ac({ hex: '#1A171B' }), ac({ hex: '#008ACF', visionRole: 'cta' })];
  const out = demoteAchromaticPrimary(colors, auth, ['The logo is solid black (#1A171B)']);
  assert('detector-asserted zwart blijft PRIMARY (logo noemt geen chromatische hex)', catOf(out, '#1A171B') === 'PRIMARY');
}

console.log('\n── 4. Zwart + status-rood ALERT → géén swap ──');
{
  const colors = [
    rc({ hex: '#111111', category: 'PRIMARY' }),
    rc({ hex: '#D32F2F', category: 'SEMANTIC', tags: ['error', 'danger'], confidence: 'medium' }),
  ];
  const auth = [ac({ hex: '#111111' }), ac({ hex: '#D32F2F', usageEvidence: 'weak' })];
  const out = demoteAchromaticPrimary(colors, auth, []);
  assert('zwart blijft PRIMARY', catOf(out, '#111111') === 'PRIMARY');
  assert('status-rood NIET gepromote', catOf(out, '#D32F2F') !== 'PRIMARY');
}

console.log('\n── 4c. FLAW 2/3: zwart + chromatische LINK-blauw → géén swap ──');
{
  const colors = [
    rc({ hex: '#222222', category: 'PRIMARY' }),
    rc({ hex: '#2563EB', category: 'ACCENT', tags: ['link'], confidence: 'medium' }),
  ];
  const auth = [ac({ hex: '#222222' }), ac({ hex: '#2563EB', usageEvidence: 'weak' })];
  const out = demoteAchromaticPrimary(colors, auth, []);
  assert('default link-blauw kaapt PRIMARY NIET (tag alleen onvoldoende)', catOf(out, '#2563EB') !== 'PRIMARY', catOf(out, '#2563EB'));
  assert('zwart blijft PRIMARY', catOf(out, '#222222') === 'PRIMARY');
}

console.log('\n── 5. FLAW 1: verzadigde donker-navy PRIMARY → NIET gedemote ──');
{
  const colors = [
    rc({ hex: '#0A1A2F', category: 'PRIMARY', tags: ['brand'], detectorSource: 'css-variable' }),
    rc({ hex: '#D4AF37', category: 'ACCENT', tags: ['accent'], confidence: 'medium' }),
  ];
  const auth = [ac({ hex: '#0A1A2F', source: 'css-variable' }), ac({ hex: '#D4AF37', visionRole: 'accent' })];
  const out = demoteAchromaticPrimary(colors, auth, []);
  assert('donker-navy #0A1A2F (s≈65) blijft PRIMARY', catOf(out, '#0A1A2F') === 'PRIMARY', catOf(out, '#0A1A2F'));
  assert('goud NIET gepromote', catOf(out, '#D4AF37') !== 'PRIMARY');
}

console.log('\n── 6. Framework/social/low-conf challenger → nooit gepromote ──');
{
  // 6a Bootstrap-blauw (framework-default-primary) — zelfs met vision:primary.
  const a = demoteAchromaticPrimary(
    [rc({ hex: '#1A1A1A', category: 'PRIMARY', tags: ['text'] }), rc({ hex: '#0D6EFD', category: 'ACCENT', tags: ['primary'] })],
    [ac({ hex: '#1A1A1A' }), ac({ hex: '#0D6EFD', visionRole: 'primary', detectorRole: 'primary' })],
    [],
  );
  assert('6a Bootstrap #0D6EFD nooit PRIMARY', catOf(a, '#0D6EFD') !== 'PRIMARY', catOf(a, '#0D6EFD'));
  assert('6a charcoal blijft PRIMARY', catOf(a, '#1A1A1A') === 'PRIMARY');

  // 6b WhatsApp-groen (non-brand via tag).
  const b = demoteAchromaticPrimary(
    [rc({ hex: '#1A1A1A', category: 'PRIMARY' }), rc({ hex: '#25D366', category: 'ACCENT', tags: ['social', 'whatsapp'] })],
    [ac({ hex: '#1A1A1A' }), ac({ hex: '#25D366', usageEvidence: 'strong' })],
    [],
  );
  assert('6b WhatsApp #25D366 nooit PRIMARY', catOf(b, '#25D366') !== 'PRIMARY');

  // 6c low-confidence chromatische teal.
  const c = demoteAchromaticPrimary(
    [rc({ hex: '#1A1A1A', category: 'PRIMARY' }), rc({ hex: '#14B8A6', category: 'ACCENT', tags: ['decorative'], confidence: 'low' })],
    [ac({ hex: '#1A1A1A' }), ac({ hex: '#14B8A6', confidence: 'low', visionRole: 'accent' })],
    [],
  );
  assert('6c low-confidence teal nooit PRIMARY', catOf(c, '#14B8A6') !== 'PRIMARY');
}

console.log('\n── 7. Positieve controle: charcoal-tekst + teal merk → swap ──');
{
  const colors = [
    rc({ hex: '#1A1A1A', category: 'PRIMARY', tags: ['text'] }),
    rc({ hex: '#1FD1B2', category: 'ACCENT', tags: ['brand', 'cta'] }),
  ];
  const auth = [ac({ hex: '#1A1A1A', usageEvidence: 'strong' }), ac({ hex: '#1FD1B2', visionRole: 'primary', usageEvidence: 'strong' })];
  const out = demoteAchromaticPrimary(colors, auth, []);
  assert('teal #1FD1B2 → PRIMARY', catOf(out, '#1FD1B2') === 'PRIMARY');
  assert('charcoal → NEUTRAL', catOf(out, '#1A1A1A') === 'NEUTRAL');
}

console.log(`\n${fail === 0 ? 'OK' : 'FAILED'} — ${pass} pass / ${fail} fail`);
process.exit(fail === 0 ? 0 : 1);
