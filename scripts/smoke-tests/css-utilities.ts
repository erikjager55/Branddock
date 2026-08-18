/**
 * Guard tegen kleur-utilities die in de code staan maar niet in de gegenereerde CSS.
 *
 * Sinds 2026-08-18 is `src/index.css` een echte Tailwind-bron (ADR
 * 2026-08-18-tailwind-bronpijplijn). Deze guard draait daarom dezelfde build als Next
 * (`@tailwindcss/postcss`) en toetst de **gegenereerde** CSS — niet de bron. Een klasse
 * kan immers wel in de code staan en toch niet gegenereerd worden, bijvoorbeeld als ze
 * een kleur noemt die in geen enkel `@theme` bestaat.
 *
 * Dit is precies de fout die de repo jarenlang stil trof: `bg-primary-50` bestond niet
 * omdat er geen `--color-primary-*` was, en `bg-emerald-500` niet omdat het bevroren
 * artefact nooit werd bijgewerkt. Zulke klassen renderen niets, zonder build-fout.
 *
 * Baseline (`css-utilities-baseline.json`) is bedoeld leeg te zijn. Hij bestaat om een
 * bekende achterstand tijdelijk te kunnen dragen zonder de gate te verliezen; staat er
 * iets in, dan hoort daar een taak bij.
 *
 * Run:
 *   npx tsx scripts/smoke-tests/css-utilities.ts              # faalt op nieuwe drift
 *   npx tsx scripts/smoke-tests/css-utilities.ts --strict     # faalt op alles
 *   npx tsx scripts/smoke-tests/css-utilities.ts --report     # volledige lijst, exit 0
 *   npx tsx scripts/smoke-tests/css-utilities.ts --update-baseline
 */
import { readFileSync, readdirSync, statSync, writeFileSync, existsSync } from 'node:fs';
import { join, relative } from 'node:path';
import postcss from 'postcss';
import tailwindcss from '@tailwindcss/postcss';

const REPO_ROOT = join(__dirname, '..', '..');
const SRC_DIR = join(REPO_ROOT, 'src');
const CSS_FILE = join(REPO_ROOT, 'src', 'index.css');
const BASELINE_FILE = join(__dirname, 'css-utilities-baseline.json');

/**
 * Utility-families waarvan een ontbrekende klasse zichtbaar misgaat. Bewust beperkt tot
 * kleur-families: dat is de klasse fout die zich hier herhaalde, en het houdt vals alarm
 * op dynamisch samengestelde niet-kleur-utilities buiten de deur.
 */
const FAMILIES = ['bg', 'text', 'border', 'ring', 'from', 'to', 'via'] as const;

/** Mappen die geen bijdrage aan de app-CSS leveren. */
const SKIP_DIRS = new Set(['node_modules', '.next', '.git', '__tests__']);

interface MissingClass {
  readonly token: string;
  readonly files: readonly string[];
}

/** Verzamelt alle TypeScript-bronbestanden onder een map. */
function collectSourceFiles(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    if (SKIP_DIRS.has(entry)) continue;
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) collectSourceFiles(full, out);
    else if (/\.tsx?$/.test(entry)) out.push(full);
  }
  return out;
}

/**
 * Zet een Tailwind-klassenaam om naar de selector zoals Tailwind die schrijft.
 * `focus:ring-primary-500` → `.focus\:ring-primary-500`
 */
function toSelector(token: string): string {
  return '.' + token.replace(/([:[\]#/.%])/g, '\\$1');
}

/** Leest welke kleur-utilities de code gebruikt, met de bestanden waarin ze staan. */
function collectUsedClasses(files: readonly string[]): Map<string, string[]> {
  const pattern = new RegExp(
    `\\b((?:[a-z][a-z0-9-]*:)*)(${FAMILIES.join('|')})-([a-z]+)-([0-9]{2,3})(\\/[0-9]{1,3})?\\b`,
    'g',
  );
  const used = new Map<string, string[]>();
  for (const file of files) {
    const rel = relative(REPO_ROOT, file);
    for (const match of readFileSync(file, 'utf8').matchAll(pattern)) {
      const token = match[0];
      const seen = used.get(token);
      if (seen) {
        if (!seen.includes(rel)) seen.push(rel);
      } else {
        used.set(token, [rel]);
      }
    }
  }
  return used;
}

/** Draait dezelfde Tailwind-build als Next en geeft de gegenereerde CSS terug. */
async function buildCss(): Promise<string> {
  const source = readFileSync(CSS_FILE, 'utf8');
  const result = await postcss([tailwindcss()]).process(source, {
    from: CSS_FILE,
    to: join(REPO_ROOT, '.css-utilities-check.css'),
  });
  return result.css;
}

function readBaseline(): Set<string> {
  if (!existsSync(BASELINE_FILE)) return new Set();
  const raw: unknown = JSON.parse(readFileSync(BASELINE_FILE, 'utf8'));
  const tokens = (raw as { known?: unknown }).known;
  return new Set(Array.isArray(tokens) ? tokens.filter((t): t is string => typeof t === 'string') : []);
}

async function main(): Promise<void> {
  const args = new Set(process.argv.slice(2));
  const files = collectSourceFiles(SRC_DIR);
  const used = collectUsedClasses(files);
  const css = await buildCss();
  const missing: MissingClass[] = [...used]
    .filter(([token]) => !css.includes(toSelector(token)))
    .map(([token, files_]) => ({ token, files: files_ }))
    .sort((a, b) => b.files.length - a.files.length);

  console.log(`Gescand: ${files.length} bronbestanden, ${used.size} unieke kleur-utilities.`);
  console.log(`Gegenereerde CSS: ${(css.length / 1024).toFixed(0)} kB.`);

  if (args.has('--update-baseline')) {
    const known = missing.map((m) => m.token).sort();
    writeFileSync(BASELINE_FILE, JSON.stringify({ known }, null, 2) + '\n');
    console.log(`Baseline geschreven: ${known.length} bekende ontbrekende klassen.`);
    return;
  }

  const baseline = readBaseline();
  const strict = args.has('--strict');
  const offending = strict ? missing : missing.filter((m) => !baseline.has(m.token));
  const carried = missing.length - offending.length;

  if (args.has('--report')) {
    for (const m of missing) {
      console.log(`  [${baseline.has(m.token) ? 'bekend' : 'NIEUW '}] ${m.token.padEnd(34)} ${m.files.length} bestanden  bv ${m.files[0]}`);
    }
  }

  if (offending.length === 0) {
    console.log(`✓ Geen ${strict ? '' : 'nieuwe '}ontbrekende kleur-utilities.`);
    if (carried > 0) console.log(`  (${carried} bekende uit de baseline)`);
    return;
  }

  console.error(`\n✗ ${offending.length} kleur-utilit${offending.length === 1 ? 'eit' : 'eiten'} worden niet gegenereerd:\n`);
  for (const m of offending.slice(0, 40)) {
    console.error(`    ${m.token.padEnd(34)} ${m.files.length} bestanden  bv ${m.files[0]}`);
  }
  if (offending.length > 40) console.error(`    … en ${offending.length - 40} meer (draai met --report)`);
  console.error(
    '\nsrc/index.css is een Tailwind-BRON. Ontbreekt een klasse, dan kent de build de kleur\n' +
      'niet: voeg het token toe aan het @theme-blok. Schrijf de utility NIET met de hand —\n' +
      'dat is precies het patroon dat ADR 2026-08-18-tailwind-bronpijplijn heeft opgeruimd.\n',
  );
  process.exit(1);
}

void main();
