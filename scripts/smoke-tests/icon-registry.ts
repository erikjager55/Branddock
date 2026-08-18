/**
 * icon-registry — bewaakt dat de expliciete Lucide-registry compleet blijft.
 *
 * Achtergrond: acht bestanden deden `import * as LucideIcons from 'lucide-react'`
 * en zochten dynamisch op naam op. Een bundler kan dan niets wegsnoeien en neemt
 * de hele bibliotheek mee (gemeten: 672 KB minified tegen 65 KB voor de registry).
 * Sinds 2026-08-18 loopt alles via `src/lib/icons/icon-registry.ts`.
 *
 * De prijs van die aanpak is dat de registry compleet moet blijven: een naam die
 * er niet in staat valt terug op een fallback-icoon, stil en zonder build-fout.
 * Deze smoke maakt dat luid — hij faalt zodra er in `src/` een iconennaam
 * opduikt die Lucide kent maar de registry niet.
 */
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import * as lucide from 'lucide-react';
import { ICONS } from '../../src/lib/icons/icon-registry';

const SRC = 'src';
const REGISTRY_FILE = join('src', 'lib', 'icons', 'icon-registry.ts');

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (!/node_modules|\.next/.test(p)) walk(p, out);
    } else if (/\.(tsx?|jsx?)$/.test(entry.name)) {
      out.push(p);
    }
  }
  return out;
}

const referenced = new Map<string, string>();
for (const file of walk(SRC)) {
  if (file === REGISTRY_FILE) continue;
  const text = readFileSync(file, 'utf8');
  for (const m of text.matchAll(/['"]([A-Z][A-Za-z0-9]{2,})['"]/g)) {
    const name = m[1];
    if (name === 'Icon') continue;
    if (!(name in lucide)) continue;
    if (!referenced.has(name)) referenced.set(name, file);
  }
}

const missing = [...referenced.entries()].filter(([name]) => !(name in ICONS));

console.log(`icon-registry — ${referenced.size} iconennamen aangetroffen in ${SRC}/`);
console.log(`  in de registry : ${referenced.size - missing.length}`);
console.log(`  ontbrekend     : ${missing.length}`);

if (missing.length > 0) {
  console.error('\n✗ Deze namen komen in src/ voor maar staan niet in de registry.');
  console.error('  Ze zouden op een fallback-icoon terugvallen. Voeg ze toe aan');
  console.error(`  ${REGISTRY_FILE}:\n`);
  for (const [name, file] of missing) console.error(`    ${name}  (${file})`);
  process.exit(1);
}

console.log('\n✓ Elke iconennaam in src/ zit in de registry.');
