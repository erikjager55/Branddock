/**
 * design-sync-drift — bewaakt dat het gesynchroniseerde design system niet stil
 * uit de pas gaat lopen met de code.
 *
 * Het Design System-project op claude.ai/design wordt gebouwd uit deze repo, maar
 * de koppeling loopt via met de hand onderhouden configuratie in `.design-sync/`.
 * Die configuratie kan verouderen zónder dat er iets faalt: de app blijft bouwen,
 * de tests blijven groen, en het design system rot ongemerkt weg. Dat is precies
 * één keer gebeurd (PR #334 -> #347) en de andere twee vormen zijn even stil.
 *
 * Drie controles, elk voor een faalvorm die geen bouwfout geeft:
 *
 *  1. PROP-DRIFT. `dtsPropsFor` is een handgeschreven kopie van de props uit de
 *     bron, nodig omdat de repo geen library-build heeft en de interfaces niet
 *     geëxporteerd zijn. Verandert een prop in de bron, dan codeert de design-agent
 *     tegen een contract dat niet meer klopt.
 *  2. NAMESPACE-DRIFT. `preview-provider.tsx` noemt zijn i18n-namespaces met de
 *     hand. Gaat een gesynct component een namespace gebruiken die daar niet in
 *     staat, dan toont zijn kaart rauwe sleutels — zonder bouwfout, want de
 *     provider hoort bij de sync-toolchain en niet bij de Next-build.
 *  3. ONTBREKENDE COMPONENTEN. Komt er een component bij in een gesynchroniseerde
 *     map, dan ontbreekt hij in het design system tot iemand `entry.ts` en
 *     `componentSrcMap` bijwerkt.
 *
 * Deze smoke draait key-loos en zonder database (zie scripts/ci/run-guards.sh).
 */
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const CONFIG = '.design-sync/config.json';
const PROVIDER = '.design-sync/preview-provider.tsx';
const ENTRY = '.design-sync/entry.ts';

/** Mappen waarvan élk component gesynchroniseerd hoort te zijn, tenzij uitgezonderd. */
const SYNCED_DIRS = ['src/components/ui/layout', 'src/components/shared'];

/**
 * Bewust niet gesynchroniseerd, met reden. Staat hier en niet in config.json
 * omdat die alleen bekende sleutels accepteert — en een uitsluiting zonder
 * reden is precies hoe een gat er over een half jaar uitziet als een vergissing.
 */
const EXCLUDED: Record<string, string> = {
  OptimizedImage: 'next/image werkt niet buiten een Next-runtime',
  WorkspaceSwitchGuard: 'vereist workspace-context; geen ontwerp-element',
  ItemKnowledgeSources: 'importeert de app-barrel (trekt next/image mee); bovendien ongebruikt',
  KnowledgeContextSelectorModal: 'importeert de app-barrel (trekt next/image mee)',
  // ⚠️ De oude reden (wildcard-import blies de bundel op) is sinds #334 niet meer
  // waar — StatsCard gebruikt nu resolveIcon. De uitsluiting blijft, maar om een
  // ándere, gemeten reden: het is een bijna-dubbel van StatCard (34 gebruikers,
  // getypeerde `icon: LucideIcon`) met 1 gebruiker en een zwakkere `icon: string`.
  StatsCard: 'bijna-dubbel van StatCard: 1 gebruiker tegen 34, en een zwakkere icon-API',
  StatsCardGrid: 'hoort bij StatsCard; 0 gebruikers',
  PageHeader_shared: 'naambotsing: de ui/layout-variant wint (15 importeurs tegen 0)',
  markdownComponents: 'geen component maar een map met renderers',
};

type Fout = { controle: string; regel: string };
const fouten: Fout[] = [];
let checks = 0;

function ok(msg: string) { checks++; console.log(`  ✓ ${msg}`); }
function fout(controle: string, regel: string) { checks++; fouten.push({ controle, regel }); console.log(`  ✗ ${regel}`); }

const cfg = JSON.parse(readFileSync(CONFIG, 'utf8')) as {
  componentSrcMap: Record<string, string>;
  dtsPropsFor: Record<string, string>;
};

// ─── 1. Prop-drift ────────────────────────────────────────────────────────────
console.log('\n## 1. Prop-drift — komt dtsPropsFor nog overeen met de bron?\n');

/** Haalt de propnamen uit een `<Naam>Props`-blok in de bron. */
function propsUitBron(bestand: string, naam: string): { namen: Set<string>; erft: boolean } | null {
  if (!existsSync(bestand)) return null;
  const tekst = readFileSync(bestand, 'utf8');
  const kop = new RegExp(`(?:export\\s+)?(?:interface|type)\\s+${naam}Props\\b([^{]*)\\{`, 'm');
  const m = tekst.match(kop);
  if (!m) return null;
  // `extends React.ButtonHTMLAttributes<...>` betekent dat de bron props erft die
  // hier niet worden opgesomd. De config mag die dan wél documenteren — dat is
  // geen drift maar juist het contract compleet maken voor de design-agent.
  const erft = /extends|Omit<|&/.test(m[1] ?? '');
  let i = tekst.indexOf(m[0]) + m[0].length;
  let diepte = 1;
  let body = '';
  while (i < tekst.length && diepte > 0) {
    const ch = tekst[i];
    if (ch === '{') diepte++;
    if (ch === '}') { diepte--; if (!diepte) break; }
    body += ch;
    i++;
  }
  return { namen: propnamen(body), erft };
}

/** Propnamen op het buitenste niveau van een interface-body. */
function propnamen(body: string): Set<string> {
  const namen = new Set<string>();
  let diepte = 0;
  for (const regel of body.split('\n')) {
    const t = regel.trim();
    if (!t || t.startsWith('*') || t.startsWith('//') || t.startsWith('/*')) {
      diepte += (regel.match(/\{/g) ?? []).length - (regel.match(/\}/g) ?? []).length;
      continue;
    }
    if (diepte === 0) {
      const m = t.match(/^'?([A-Za-z_][\w-]*)'?\??\s*:/);
      if (m) namen.add(m[1]);
    }
    diepte += (regel.match(/\{/g) ?? []).length - (regel.match(/\}/g) ?? []).length;
  }
  return namen;
}

for (const [naam, pad] of Object.entries(cfg.componentSrcMap)) {
  const bron = propsUitBron(pad, naam);
  if (bron === null) continue; // geen eigen Props-blok (compound of erft alles)
  const config = propnamen(cfg.dtsPropsFor[naam] ?? '');
  const mist = [...bron.namen].filter((p) => !config.has(p));
  const teveel = bron.erft ? [] : [...config].filter((p) => !bron.namen.has(p));
  if (mist.length === 0 && teveel.length === 0) {
    ok(`${naam}: ${bron.namen.size} props komen overeen${bron.erft ? ' (erft, extra\'s toegestaan)' : ''}`);
  } else {
    if (mist.length) fout('prop-drift', `${naam}: bron heeft props die dtsPropsFor mist -> ${mist.join(', ')}`);
    if (teveel.length) fout('prop-drift', `${naam}: dtsPropsFor noemt props die de bron niet heeft -> ${teveel.join(', ')}`);
  }
}

// ─── 2. Namespace-drift ───────────────────────────────────────────────────────
console.log('\n## 2. Namespace-drift — laadt de preview-provider alles wat de kaarten vragen?\n');

const provider = readFileSync(PROVIDER, 'utf8');
const nsBlok = provider.match(/ns:\s*\[([^\]]*)\]/);
const geladen = new Set(
  (nsBlok?.[1] ?? '').split(',').map((s) => s.trim().replace(/^['"]|['"]$/g, '')).filter(Boolean),
);

for (const [naam, pad] of Object.entries(cfg.componentSrcMap)) {
  if (!existsSync(pad)) continue;
  const tekst = readFileSync(pad, 'utf8');
  const gebruikt = new Set<string>();
  for (const m of tekst.matchAll(/useTranslation\(\s*\[([^\]]*)\]/g))
    for (const n of m[1].split(',')) { const v = n.trim().replace(/^['"]|['"]$/g, ''); if (v) gebruikt.add(v); }
  for (const m of tekst.matchAll(/useTranslation\(\s*['"]([^'"]+)['"]/g)) gebruikt.add(m[1]);
  for (const m of tekst.matchAll(/\bns:\s*['"]([^'"]+)['"]/g)) gebruikt.add(m[1]);

  const ontbreekt = [...gebruikt].filter((n) => !geladen.has(n));
  if (gebruikt.size === 0) continue;
  if (ontbreekt.length === 0) ok(`${naam}: ${[...gebruikt].join(', ')} wordt geladen`);
  else fout('namespace-drift', `${naam} gebruikt namespace(s) die de provider niet laadt -> ${ontbreekt.join(', ')}`);
}

// ─── 3. Ontbrekende componenten ───────────────────────────────────────────────
console.log('\n## 3. Nieuwe componenten — staat alles uit de gesyncte mappen in de config?\n');

let entry = readFileSync(ENTRY, 'utf8');
// `export * from '@/components/ui/layout'` her-exporteert een hele barrel. Zonder
// die op te lossen ziet deze controle twaalf componenten ten onrechte als ontbrekend.
for (const m of entry.matchAll(/export \* from '@\/([^']+)'/g)) {
  for (const kandidaat of [`src/${m[1]}/index.ts`, `src/${m[1]}.ts`, `src/${m[1]}/index.tsx`]) {
    if (existsSync(kandidaat)) { entry += '\n' + readFileSync(kandidaat, 'utf8'); break; }
  }
}
for (const dir of SYNCED_DIRS) {
  if (!existsSync(dir)) continue;
  for (const bestand of readdirSync(dir).filter((f) => f.endsWith('.tsx'))) {
    const naam = bestand.replace(/\.tsx$/, '');
    if (naam in cfg.componentSrcMap) continue;
    if (naam in EXCLUDED) { ok(`${naam}: bewust uitgezonderd (${EXCLUDED[naam]})`); continue; }
    if (naam === 'PageHeader' && dir.endsWith('shared')) { ok('PageHeader (shared): bewust uitgezonderd, ui/layout wint'); continue; }
    fout('nieuw component', `${join(dir, bestand)} staat niet in componentSrcMap en niet in de uitsluitingslijst`);
  }
}

// Op woordgrens matchen, niet op deelreeks: `SkeletonBadge` bevat `Badge`, dus
// een naïeve `includes` ziet een verwijderde Badge-export niet. Een mutatietest
// ving dat — de check was er wel maar kon niet falen.
for (const naam of Object.keys(cfg.componentSrcMap)) {
  const geexporteerd = new RegExp(`\\b${naam}\\b`).test(entry);
  if (!geexporteerd) fout('entry-barrel', `${naam} staat in componentSrcMap maar wordt niet uit entry.ts geëxporteerd`);
}

// ─── Uitkomst ─────────────────────────────────────────────────────────────────
console.log(`\n=== ${checks} controles, ${fouten.length} gefaald ===`);
if (fouten.length) {
  console.error('\nDe design-sync-configuratie loopt uit de pas met de code:\n');
  for (const f of fouten) console.error(`  [${f.controle}] ${f.regel}`);
  console.error('\nWerk `.design-sync/` bij en draai daarna een re-sync, anders rot het');
  console.error('design system stil weg zonder dat iets faalt.');
  process.exit(1);
}
console.log('\n✓ Configuratie loopt in de pas met de code.');
