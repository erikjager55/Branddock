/**
 * Deploy-time verificatie van gepubliceerde landingspagina's op productie.
 *
 * Herkomst: dit stond sinds 2026-06-24 als uitgesteld sub-item in
 * `geo-seo-followup-later`, geblokkeerd op `vercel-deployment`. Die blocker
 * verdween op 2026-07-05 — en niemand kwam terug. In de 44 dagen daarna is
 * precies de bug geland die dit had gevangen: gepubliceerde pagina's hadden
 * **géén `<title>`** (changelog #477, gevonden bij toeval tijdens CSP-werk).
 *
 * Dat is de reden dat deze smoke bestaat en niet alleen de fix: een uitstel met
 * een reden hoort een trigger te hebben, en een trigger die niemand aftikt is
 * geen trigger.
 *
 * Wat hij toetst, op de échte subdomeinen:
 *  1. een gepubliceerde pagina heeft een PAGINA-SPECIFIEKE `<title>` — niet de
 *     geërfde default uit de root-layout;
 *  2. OG-tags (title/description/url) staan er;
 *  3. `<ws>.branddock.app/sitemap.xml` listet alleen díé workspace.
 *
 * ⚠ De CONTROLEROUTE is wat dit bewijs maakt. `/reset-password` heeft geen eigen
 * metadata en hoort dus wél de generieke titel te tonen. Zonder die tweede meting
 * kan "er staat een titel" ook betekenen dat je naar de default kijkt — en precies
 * dat onderscheid was de bug van #477.
 *
 * Read-only HTTP tegen productie. Run: npx tsx scripts/smoke-tests/published-page-metadata-prod.ts
 */

const PUBLISHED_PAGE = 'https://linfi.branddock.app/pillar-page';
const SITEMAP = 'https://linfi.branddock.app/sitemap.xml';
const CONTROL_PAGE = 'https://branddock.app/reset-password';
/** De titel die de root-layout uitdeelt aan routes zonder eigen metadata. */
const INHERITED_TITLE = 'Branddock';

let passed = 0;
const failures: string[] = [];
function check(label: string, ok: boolean, detail?: string): void {
  if (ok) { passed++; console.log(`  ✓ ${label}`); }
  else { failures.push(label); console.error(`  ✗ ${label}${detail ? `\n      ${detail}` : ''}`); }
}

async function fetchText(url: string): Promise<{ status: number; body: string }> {
  const res = await fetch(url, { redirect: 'follow', signal: AbortSignal.timeout(20_000) });
  return { status: res.status, body: await res.text() };
}

const title = (html: string): string | null => html.match(/<title>([^<]*)<\/title>/)?.[1] ?? null;
const meta = (html: string, prop: string): string | null =>
  html.match(new RegExp(`<meta[^>]*property="${prop}"[^>]*content="([^"]*)"`))?.[1] ?? null;

async function main(): Promise<void> {
  console.log('\n── A. Gepubliceerde pagina op het klant-subdomein ─────────');
  const page = await fetchText(PUBLISHED_PAGE);
  check('de pagina is bereikbaar', page.status === 200, `http ${page.status}`);

  const t = title(page.body);
  check('er ís een <title>', !!t, String(t));
  check('en die is PAGINA-SPECIFIEK, niet de geërfde default',
    !!t && t.trim() !== INHERITED_TITLE, `gevonden: ${t}`);
  check('de titel is niet het content-type-label',
    !!t && !/^(Landing Page|Blog Post|Pillar Page)$/i.test(t.trim()), String(t));

  check('og:title staat er', !!meta(page.body, 'og:title'));
  check('og:description staat er', !!meta(page.body, 'og:description'));
  check('og:url wijst naar het subdomein',
    (meta(page.body, 'og:url') ?? '').startsWith('https://linfi.branddock.app/'),
    String(meta(page.body, 'og:url')));

  console.log('\n── B. Sitemap is workspace-gescopet ───────────────────────');
  const sm = await fetchText(SITEMAP);
  check('de sitemap is bereikbaar', sm.status === 200, `http ${sm.status}`);
  const locs = [...sm.body.matchAll(/<loc>([^<]*)<\/loc>/g)].map((m) => m[1]);
  check('de sitemap bevat minstens één pagina', locs.length > 0);
  check('en uitsluitend URLs van deze workspace',
    locs.every((l) => l.startsWith('https://linfi.branddock.app/')),
    locs.filter((l) => !l.startsWith('https://linfi.branddock.app/')).join(', '));

  console.log('\n── C. Controleroute — bewijst dat check A discrimineert ────');
  const ctrl = await fetchText(CONTROL_PAGE);
  const ct = title(ctrl.body);
  check('een route zónder eigen metadata toont wél de geërfde default',
    ct?.trim() === INHERITED_TITLE,
    `gevonden: ${ct} (verwacht: ${INHERITED_TITLE})`);
  check('de twee titels verschillen — anders meet check A niets',
    !!t && !!ct && t.trim() !== ct.trim(), `pagina: ${t} / controle: ${ct}`);

  console.log(`\n${failures.length === 0 ? '✅' : '❌'} ${passed}/${passed + failures.length} checks geslaagd`);
  if (failures.length) { failures.forEach((f) => console.error(`   - ${f}`)); process.exit(1); }
}

main().catch((e) => { console.error('smoke faalde:', e); process.exit(1); });

// Dit bestand importeert niets, dus TypeScript ziet het als een SCRIPT en zet de
// top-level namen in de globale scope — waar ze botsen met gelijknamige helpers
// in andere smokes (`fetchText` bestond al in google-vision-api-key.ts). Deze
// lege export maakt er een module van. Zelfde reden als de noot onderaan
// deliverable-settings-write.ts.
export {};
