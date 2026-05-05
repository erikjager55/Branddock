/**
 * scripts/fidelity/build-eval-package.ts
 *
 * Bouwt een blind human-eval pakket: outputs anoniem genummerd,
 * shuffled mapping, eval-form template.
 *
 * Output: research/fidelity-week1/human-eval-package/
 *   - output-01.md ... output-12.md (gekopieerde content, géén key in filename)
 *   - eval-form.md (template voor evaluators)
 *   - key-mapping.json (CONFIDENTIAL — niet delen met evaluators)
 *
 * Run:
 *   npx tsx scripts/fidelity/build-eval-package.ts
 */

import { readFileSync, writeFileSync, mkdirSync, readdirSync, copyFileSync } from 'fs';
import { resolve, join } from 'path';

// ─── Env loading (no DB access needed) ─

const envPath = resolve(process.cwd(), '.env.local');
try {
  for (const line of readFileSync(envPath, 'utf8').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#') || !trimmed.includes('=')) continue;
    const eq = trimmed.indexOf('=');
    process.env[trimmed.slice(0, eq).trim()] = trimmed.slice(eq + 1).trim();
  }
} catch {
  // ignore
}

// ─── Shuffle (Fisher-Yates) ─

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ─── Eval form template ─

function evalFormTemplate(numOutputs: number): string {
  return `# F-VAL Drift-Meting — Human Evaluation Form

> **Voor evaluatoren**: dank voor je tijd. Hieronder staat een rubric om ${numOutputs} outputs te scoren.
> De outputs zijn anoniem genummerd (\`output-01.md\` t/m \`output-${String(numOutputs).padStart(2, '0')}.md\`).
> Je weet **niet** welke output bij welk merk of welke conditie hoort — dat is bewust.
> Je weet **wel** voor welk merk je evalueert (jij bent door dat merk benaderd) — gebruik die kennis voor brand-recognition.

---

## Rubric — 4 dimensies, 1-10 schaal per output

### 1. Voice-fit
Hoe goed sluit deze tekst aan op de **gedeclareerde** voice van je merk (in Branddock Brand Personality + Tone of Voice)?
- 1-2: ernstig off-brand
- 3-4: off-brand met meerdere violations
- 5-6: gedeeltelijk match
- 7-8: goede match, kleine inconsistenties
- 9-10: sterke match, volledig on-brand

### 2. Brand-recognition
Zou je deze tekst, blind getoond zonder merk-naam, herkennen als afkomstig van **dit specifieke merk**?
- 1-2: onherkenbaar, zou van elk merk kunnen komen
- 3-4: weinig signature voice-markers
- 5-6: enkele herkenbare elementen
- 7-8: duidelijk herkenbaar door distinctieve kenmerken
- 9-10: onmiskenbaar dit merk

### 3. Naturalness
Leest dit als geschreven door een **ervaren menselijk schrijver** (vs. AI-output)?
- 1-2: duidelijk AI, formulaic
- 3-4: AI-tropes herkenbaar (cliché openers, ritmische bullet lists, hedge-heavy)
- 5-6: gemixed
- 7-8: leest als competente menselijke schrijver
- 9-10: leest als ervaren senior schrijver

### 4. Fluency
Grammaticale correctheid + leesvloeiendheid (Nederlands).
- 1-2: meerdere fouten of register-breuken
- 3-4: enkele fouten
- 5-6: matig vloeiend
- 7-8: vloeiend, geen fouten
- 9-10: zeer vloeiend, professioneel

---

## Tabel om in te vullen

| # | Voice-fit | Brand-recognition | Naturalness | Fluency | Korte opmerking (optioneel) |
|---|-----------|-------------------|-------------|---------|----------------------------|
${Array.from({ length: numOutputs }, (_, i) => `| ${String(i + 1).padStart(2, '0')} |  |  |  |  |  |`).join('\n')}

---

## Instructies

1. Lees output-01.md t/m output-${String(numOutputs).padStart(2, '0')}.md in **willekeurige volgorde**
2. Vul de tabel hierboven in
3. Stuur deze ingevulde markdown terug naar Erik (erik@betterbrands.nl) of upload in het gedeelde drive-pakket

**Tijd**: gemiddeld ~10-15 min per output × ${numOutputs} outputs = ~2-3 uur totaal.

**Tip**: als je twijfelt tussen twee scores, kies de lagere. Dat houdt de scoring conservatief en consistent.

Dank je wel.
`;
}

// ─── Main ─

async function main() {
  const { PATHS } = await import('./config');

  const evalDir = join(PATHS.outputRoot, 'human-eval-package');
  mkdirSync(evalDir, { recursive: true });

  // Find all outputs
  const outputs = readdirSync(PATHS.outputs)
    .filter((f) => f.endsWith('.md'))
    .sort(); // alphabetical for reproducibility before shuffle

  console.log(`→ Found ${outputs.length} outputs in ${PATHS.outputs}`);

  // Shuffle and assign anonymous numbers
  const shuffled = shuffle(outputs);
  const mapping: Array<{ anonymousNumber: string; originalKey: string }> = [];

  for (let i = 0; i < shuffled.length; i++) {
    const num = String(i + 1).padStart(2, '0');
    const originalKey = shuffled[i].replace('.md', '');
    const anonymousFilename = `output-${num}.md`;
    const sourcePath = join(PATHS.outputs, shuffled[i]);
    const destPath = join(evalDir, anonymousFilename);

    // Copy the file with original content (no metadata leak)
    copyFileSync(sourcePath, destPath);

    mapping.push({ anonymousNumber: num, originalKey });
    console.log(`  ${anonymousFilename}  ←  ${originalKey}`);
  }

  // Write mapping (CONFIDENTIAL)
  writeFileSync(join(evalDir, 'key-mapping.json'), JSON.stringify(mapping, null, 2), 'utf8');

  // Write eval form template
  writeFileSync(join(evalDir, 'eval-form.md'), evalFormTemplate(shuffled.length), 'utf8');

  // README for evaluators
  const evalReadme = `# F-VAL Drift-Meting — Evaluator Instructions

Welkom. Dit pakket bevat **${shuffled.length} content-outputs** die je gaat evalueren.

## Bestanden

- \`output-01.md\` t/m \`output-${String(shuffled.length).padStart(2, '0')}.md\` — de te evalueren content (anoniem)
- \`eval-form.md\` — invul-template (open in markdown editor of Google Doc)

## Wat NIET in dit pakket zit

\`key-mapping.json\` mag je niet zien — die onthult welke output bij welk merk en conditie hoort.
Erik houdt deze mapping geheim tot na evaluatie.

## Vragen

Stuur een mail naar erik@betterbrands.nl.

Dank!
`;
  writeFileSync(join(evalDir, 'README.md'), evalReadme, 'utf8');

  console.log('');
  console.log(`✓ Eval-package klaar: ${evalDir}`);
  console.log(`  - ${shuffled.length} anonymous output files`);
  console.log(`  - eval-form.md (template)`);
  console.log(`  - key-mapping.json (CONFIDENTIAL — do not share)`);
  console.log(`  - README.md (evaluator instructions)`);
  console.log('');
  console.log(`Distribute the eval-package directory MINUS key-mapping.json to your raters.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
