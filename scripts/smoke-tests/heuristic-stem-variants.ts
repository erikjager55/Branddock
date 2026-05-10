/**
 * Smoke-test voor `expandStemVariants` — verifieert NL-suffix-rules op
 * representatieve input-woorden. Pure-functie test, geen DB nodig.
 *
 * Run: npx tsx scripts/smoke-tests/heuristic-stem-variants.ts
 */
import { expandStemVariants } from '../../src/lib/brand-fidelity/brand-rule-sync';

let pass = 0;
let fail = 0;

function assert(name: string, cond: boolean, detail?: string): void {
  if (cond) {
    console.log(`  ✓ ${name}`);
    pass++;
  } else {
    console.error(`  ✗ ${name}${detail ? ` — ${detail}` : ''}`);
    fail++;
  }
}

function expectIncludes(label: string, actual: string[], expected: string[]): void {
  for (const exp of expected) {
    assert(
      `${label}: bevat "${exp}"`,
      actual.includes(exp),
      `actual=[${actual.join(',')}]`,
    );
  }
}

console.log('\n=== 1. Suffix -ief (innovatief) ===\n');
{
  const out = expandStemVariants('innovatief');
  expectIncludes('innovatief', out, ['innovatief', 'innovatie', 'innovatieve', 'innovaties']);
}

console.log('\n=== 2. Suffix -eel (passioneel) ===\n');
{
  const out = expandStemVariants('passioneel');
  expectIncludes('passioneel', out, ['passioneel', 'passionele']);
  assert(
    'passioneel: geen onnatuurlijke -eles variant',
    !out.includes('passioneles'),
  );
}

console.log('\n=== 3. Suffix -iek (uniek) ===\n');
{
  const out = expandStemVariants('uniek');
  expectIncludes('uniek', out, ['uniek', 'unieke', 'unieken']);
}

console.log('\n=== 4. Suffix -isch (automatisch) ===\n');
{
  const out = expandStemVariants('automatisch');
  expectIncludes('automatisch', out, ['automatisch', 'automatische', 'automatisme']);
}

console.log('\n=== 5. Default plurals (kwaliteit) ===\n');
{
  const out = expandStemVariants('kwaliteit');
  expectIncludes('kwaliteit', out, ['kwaliteit', 'kwaliteite', 'kwaliteiten']);
}

console.log('\n=== 6. Multi-word input (een ultieme luxe ervaring) ===\n');
{
  const out = expandStemVariants('een ultieme luxe ervaring');
  // Phrases worden niet geëxpandeerd — alleen origineel terug.
  assert(
    'multi-word: alleen origineel',
    out.length === 1 && out[0] === 'een ultieme luxe ervaring',
    `got [${out.join(',')}]`,
  );
}

console.log('\n=== 7. Korte input (ai) — onder min-stem-length ===\n');
{
  const out = expandStemVariants('ai');
  assert(
    'korte input: alleen origineel',
    out.length === 1 && out[0] === 'ai',
    `got [${out.join(',')}]`,
  );
}

console.log('\n=== 8. Whitespace + casing (  Innovatief  ) ===\n');
{
  const out = expandStemVariants('  Innovatief  ');
  assert(
    'trim + lowercase toegepast',
    out.includes('innovatief') && !out.includes('  Innovatief  '),
  );
}

console.log('\n=== 9. Empty + special chars ===\n');
{
  const out = expandStemVariants('');
  assert('empty input: returns array met empty string', out.length === 1 && out[0] === '');
}

console.log('\n=== 10. Default-pad: niet-suffix-matching woord (luxe) ===\n');
{
  const out = expandStemVariants('luxe');
  expectIncludes('luxe', out, ['luxe', 'luxee', 'luxeen']);
}

console.log('\n=== 11. Dedup binnen output ===\n');
{
  const out = expandStemVariants('innovatief');
  const seen = new Set(out);
  assert(
    'geen duplicaten in output',
    seen.size === out.length,
    `got [${out.join(',')}], seen=${seen.size}, length=${out.length}`,
  );
}

console.log(`\n=== RESULT: ${pass} pass, ${fail} fail ===\n`);
process.exit(fail > 0 ? 1 : 0);
