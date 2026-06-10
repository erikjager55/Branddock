/**
 * [DET] Phase 61 — hero clobber-guard (root-cause-fix orphaned-hero, audit
 * 2026-06-08). `preserveHeroVisual` mag een al-gewirede header-image NOOIT laten
 * wissen door een stale /context-refetch die de BrandHero nog leeg heeft, maar
 * MOET een nieuwe inkomende URL én een echte clear ongemoeid laten.
 *
 * Run: npx tsx scripts/smoke-tests/web-page-builder-phase61-hero-clobber-guard.ts
 */
import { preserveHeroVisual, preserveHeroOnSettings, syncHeroFromPuck, type PuckTreeLike } from '../../src/features/campaigns/components/canvas/medium/hero-visual-preserve';

let pass = 0;
let fail = 0;
function assert(name: string, cond: boolean, detail?: string): void {
  if (cond) { console.log(`  PASS ${name}`); pass++; }
  else { console.error(`  FAIL ${name}${detail ? ` -- ${detail}` : ''}`); fail++; }
}
function group(name: string): void { console.log(`\n${name}`); }

const URL_A = '/uploads/media/x/hero-a.png';
const URL_B = '/uploads/media/x/hero-b.png';

function tree(heroUrl: string | undefined, extra: Array<{ type: string }> = []): PuckTreeLike {
  return {
    content: [
      { type: 'BrandHero', props: { headline: 'H', heroVisualUrl: heroUrl } },
      { type: 'FeatureSplit', props: {} },
      ...extra.map((e) => ({ type: e.type, props: {} as Record<string, unknown> })),
    ],
  };
}
function heroUrl(t: PuckTreeLike): string | undefined {
  const h = t.content?.find((c) => c?.type === 'BrandHero');
  return (h?.props as { heroVisualUrl?: string } | undefined)?.heroVisualUrl;
}

// ─── 1. De clobber-case: leeg inkomend + gevulde huidige → behoud ────────────
group('1 — stale-refetch (leeg) mag gewirede hero NIET wissen');
{
  const out = preserveHeroVisual(tree(''), tree(URL_A));
  assert('behoudt bestaande URL', heroUrl(out) === URL_A, heroUrl(out));
}
{
  const out = preserveHeroVisual(tree(undefined), tree(URL_A));
  assert('behoudt bestaande URL (undefined inkomend)', heroUrl(out) === URL_A, heroUrl(out));
}

// ─── 2. Nieuwe inkomende URL wint (geen onterechte preserve) ─────────────────
group('2 — inkomende eigen URL passeert ongemoeid');
{
  const out = preserveHeroVisual(tree(URL_B), tree(URL_A));
  assert('respecteert nieuwe inkomende URL', heroUrl(out) === URL_B, heroUrl(out));
}

// ─── 3. Echte clear (beide leeg) → blijft leeg (geen verzinsel) ──────────────
group('3 — beide leeg blijft leeg');
{
  const out = preserveHeroVisual(tree(''), tree(undefined));
  assert('geen URL verzonnen', !heroUrl(out));
}

// ─── 4. Identiteit/immutability: geen mutatie als niets te behouden ──────────
group('4 — geen onnodige nieuwe referentie');
{
  const incoming = tree(URL_B);
  const out = preserveHeroVisual(incoming, tree(URL_A));
  // inkomende heeft eigen URL → changed=false → exact dezelfde referentie terug
  assert('zelfde object-referentie bij geen wijziging', out === incoming);
}

// ─── 5. Edge: geen content / geen BrandHero → no-op ──────────────────────────
group('5 — defensief bij ontbrekende structuur');
{
  const incoming: PuckTreeLike = { content: [{ type: 'FeatureSplit', props: {} }] };
  const out = preserveHeroVisual(incoming, tree(URL_A));
  assert('geen BrandHero in incoming → ongemoeid', out === incoming);
}
{
  const incoming = tree('');
  const out = preserveHeroVisual(incoming, { content: undefined });
  assert('geen current content → ongemoeid', out === incoming);
}

// ─── 6. Server-side settings-chokepoint (preserveHeroOnSettings) ─────────────
group('6 — preserveHeroOnSettings: PATCH-route clobber-guard');
{
  // puckData-clobber: inkomende settings met lege hero mag bestaande niet wissen
  const existing = { puckData: tree(URL_A), foo: 1 };
  const incoming = { puckData: tree('') };
  const out = preserveHeroOnSettings(existing, incoming);
  assert('puckData: bestaande hero-URL behouden bij lege incoming',
    heroUrl(out.puckData as PuckTreeLike) === URL_A, heroUrl(out.puckData as PuckTreeLike));
}
{
  // nieuwe URL in incoming wint
  const out = preserveHeroOnSettings({ puckData: tree(URL_A) }, { puckData: tree(URL_B) });
  assert('puckData: nieuwe incoming-URL respecteren',
    heroUrl(out.puckData as PuckTreeLike) === URL_B, heroUrl(out.puckData as PuckTreeLike));
}
{
  // structuredVariant-clobber: hero.heroVisualUrl
  const existing = { structuredVariant: { hero: { heroVisualUrl: URL_A, headline: 'H' } } };
  const incoming = { structuredVariant: { hero: { heroVisualUrl: null, headline: 'H' } } };
  const out = preserveHeroOnSettings(existing, incoming);
  const sv = out.structuredVariant as { hero?: { heroVisualUrl?: string | null } };
  assert('structuredVariant: bestaande hero-URL behouden bij null incoming',
    sv.hero?.heroVisualUrl === URL_A, String(sv.hero?.heroVisualUrl));
}
{
  // incoming zonder puckData → bestaande blijft (merge in route behoudt 'm)
  const out = preserveHeroOnSettings({ puckData: tree(URL_A) }, { otherKey: 2 });
  assert('incoming zonder puckData → geen puckData in output (route-merge behoudt bestaande)',
    out.puckData === undefined);
}
{
  // echte clear: geen bestaande URL → incoming leeg blijft leeg
  const out = preserveHeroOnSettings({ puckData: tree(undefined) }, { puckData: tree('') });
  assert('geen bestaande hero → niets verzonnen',
    !heroUrl(out.puckData as PuckTreeLike));
}

// ─── 7. Dual-track sync (syncHeroFromPuck) — PATCH-chokepoint ────────────────
group('7 — syncHeroFromPuck: structuredVariant.hero volgt non-lege puckData-hero');
{
  // divergentie: puckData heeft nieuwe URL, structuredVariant nog de oude → spiegelen
  const merged = {
    puckData: tree(URL_B),
    structuredVariant: { hero: { heroVisualUrl: URL_A, headline: 'H' } },
    other: 1,
  };
  const out = syncHeroFromPuck(merged);
  const sv = out.structuredVariant as { hero?: { heroVisualUrl?: string; headline?: string } };
  assert('structuredVariant gespiegeld naar puckData-URL', sv.hero?.heroVisualUrl === URL_B, String(sv.hero?.heroVisualUrl));
  assert('overige hero-velden intact', sv.hero?.headline === 'H');
  assert('overige settings-keys intact', out.other === 1);
}
{
  // lege puckData-hero → NIET syncen (clear-pad blijft bij preserve-guard)
  const merged = { puckData: tree(''), structuredVariant: { hero: { heroVisualUrl: URL_A } } };
  const out = syncHeroFromPuck(merged);
  const sv = out.structuredVariant as { hero?: { heroVisualUrl?: string } };
  assert('lege puckData-hero laat structuredVariant ongemoeid', sv.hero?.heroVisualUrl === URL_A);
  assert('zelfde referentie bij no-op (leeg)', out === merged);
}
{
  // ontbrekende structuredVariant / hero-key → no-op zonder throw
  const noSv = { puckData: tree(URL_B) };
  assert('geen structuredVariant → no-op', syncHeroFromPuck(noSv) === noSv);
  const noHero = { puckData: tree(URL_B), structuredVariant: { headline: 'x' } };
  assert('structuredVariant zonder hero → no-op', syncHeroFromPuck(noHero) === noHero);
  const noPd = { structuredVariant: { hero: { heroVisualUrl: URL_A } } };
  assert('geen puckData → no-op', syncHeroFromPuck(noPd) === noPd);
}
{
  // idempotent: al gelijk → zelfde referentie (geen onnodige write)
  const merged = { puckData: tree(URL_B), structuredVariant: { hero: { heroVisualUrl: URL_B } } };
  assert('al in sync → zelfde referentie', syncHeroFromPuck(merged) === merged);
}
{
  // samenspel met preserveHeroOnSettings (route-volgorde: preserve → merge → sync):
  // incoming lege hero + bestaande URL_A → preserve herstelt URL_A; sync laat sv op URL_A
  const existing = { puckData: tree(URL_A), structuredVariant: { hero: { heroVisualUrl: URL_A } } };
  const incoming = { puckData: tree('') };
  const preserved = preserveHeroOnSettings(existing, incoming);
  const out = syncHeroFromPuck({ ...existing, ...preserved });
  assert('preserve+sync: puckData behoudt URL_A', heroUrl(out.puckData as PuckTreeLike) === URL_A);
  const sv = out.structuredVariant as { hero?: { heroVisualUrl?: string } };
  assert('preserve+sync: structuredVariant blijft URL_A', sv.hero?.heroVisualUrl === URL_A);
}
{
  // samenspel: incoming met NIEUWE puckData-URL (image-field pick via autosave)
  // → preserve laat passeren, sync trekt structuredVariant bij
  const existing = { puckData: tree(URL_A), structuredVariant: { hero: { heroVisualUrl: URL_A } } };
  const incoming = { puckData: tree(URL_B) };
  const preserved = preserveHeroOnSettings(existing, incoming);
  const out = syncHeroFromPuck({ ...existing, ...preserved });
  assert('pick-pad: puckData = nieuwe URL', heroUrl(out.puckData as PuckTreeLike) === URL_B);
  const sv = out.structuredVariant as { hero?: { heroVisualUrl?: string } };
  assert('pick-pad: structuredVariant gesynct naar nieuwe URL', sv.hero?.heroVisualUrl === URL_B);
}
{
  // route-gate (gemodelleerd zoals route.ts — sync alleen bij autosave-vormige
  // writes: incoming.puckData aanwezig ZONDER eigen structuredVariant). Een
  // sv-only PATCH én een beide-tracks PATCH mogen hun expliciete sv-hero
  // niet door de sync teruggedraaid zien.
  const routeGate = (incoming: Record<string, unknown>, merged: Record<string, unknown>) =>
    incoming.puckData && !incoming.structuredVariant ? syncHeroFromPuck(merged) : merged;
  {
    // sv-only: expliciete sv-hero blijft staan
    const existing = { puckData: tree(URL_A), structuredVariant: { hero: { heroVisualUrl: URL_A } } };
    const incoming = { structuredVariant: { hero: { heroVisualUrl: URL_B } } };
    const merged = { ...existing, ...preserveHeroOnSettings(existing, incoming) };
    const out = routeGate(incoming, merged);
    const sv = out.structuredVariant as { hero?: { heroVisualUrl?: string } };
    assert('sv-only PATCH: expliciete sv-hero blijft staan (geen sync-revert)', sv.hero?.heroVisualUrl === URL_B);
    assert('sv-only PATCH: puckData ongemoeid', heroUrl(out.puckData as PuckTreeLike) === URL_A);
  }
  {
    // mixed write: writer stuurt beide tracks (sv-hero B, stale puckData A) →
    // geen sync, expliciete sv wint
    const existing = { puckData: tree(URL_A), structuredVariant: { hero: { heroVisualUrl: URL_A } } };
    const incoming = { puckData: tree(URL_A), structuredVariant: { hero: { heroVisualUrl: URL_B } } };
    const merged = { ...existing, ...preserveHeroOnSettings(existing, incoming) };
    const out = routeGate(incoming, merged);
    const sv = out.structuredVariant as { hero?: { heroVisualUrl?: string } };
    assert('mixed PATCH: expliciete sv-hero niet door sync overschreven', sv.hero?.heroVisualUrl === URL_B);
  }
  {
    // autosave-vorm (alleen puckData) → sync draait wél
    const existing = { puckData: tree(URL_A), structuredVariant: { hero: { heroVisualUrl: URL_A } } };
    const incoming = { puckData: tree(URL_B) };
    const merged = { ...existing, ...preserveHeroOnSettings(existing, incoming) };
    const out = routeGate(incoming as Record<string, unknown>, merged);
    const sv = out.structuredVariant as { hero?: { heroVisualUrl?: string } };
    assert('autosave-vorm: sync spiegelt sv naar nieuwe puckData-hero', sv.hero?.heroVisualUrl === URL_B);
  }
}

console.log(`\n${pass} PASS, ${fail} FAIL`);
if (fail > 0) process.exit(1);
