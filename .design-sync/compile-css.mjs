#!/usr/bin/env node
// Compileert src/index.css naar .design-sync/.cache/compiled.css en zet dat neer
// als cfg.cssEntry voor de design-sync.
//
// WAAROM: de converter kopieert cssEntry ongewijzigd naar het Design System-project;
// een browser krijgt dat bestand rechtstreeks. Zolang src/index.css bevroren,
// gecompileerde output was, kon je er direct naar wijzen. Zodra het een BRON wordt
// (`@import "tailwindcss"`, PR #323) is dat fataal: de browser kan die import niet
// oplossen en élke preview én élk gebouwd ontwerp rendert ongestyled — stil, want
// er komt geen foutmelding.
//
// Deze stap draait `@tailwindcss/postcss` over het bestand en is correct in beide
// werelden: zonder `@import "tailwindcss"` laat de plugin de inhoud passeren
// (output == input), mét die regel compileert hij echt.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import postcss from 'postcss';
import tailwind from '@tailwindcss/postcss';

const INPUT = resolve(process.argv[2] ?? 'src/index.css');
const OUTPUT = resolve(process.argv[3] ?? '.design-sync/.cache/compiled.css');

const css = readFileSync(INPUT, 'utf8');
const result = await postcss([tailwind()]).process(css, { from: INPUT, to: OUTPUT });

mkdirSync(dirname(OUTPUT), { recursive: true });
writeFileSync(OUTPUT, result.css);

const kb = (n) => `${Math.round(n / 1024)} KB`;
console.log(`✓ ${INPUT}  ->  ${OUTPUT}`);
console.log(`  in: ${kb(css.length)} (${css.split('\n').length} regels)  uit: ${kb(result.css.length)} (${result.css.split('\n').length} regels)`);
if (result.css.includes('@import "tailwindcss"')) {
  console.error('✗ output bevat nog @import "tailwindcss" — niet gecompileerd, dit zou ongestyled renderen');
  process.exit(1);
}
