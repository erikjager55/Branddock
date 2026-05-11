/**
 * Smoke-test voor `dedupeViolations` in composition-engine — pure-fn,
 * geen DB. Verifieert tie-break-regels en preservation van legitime
 * (verschillende offset) violations.
 *
 * Run: npx tsx scripts/smoke-tests/violation-dedup.ts
 */
import { dedupeViolations } from '../../src/lib/brand-fidelity/composition-engine';
import type { RuleViolation } from '../../src/lib/brand-fidelity/rule-compiler';

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

function makeViolation(overrides: Partial<RuleViolation>): RuleViolation {
  return {
    ruleId: 'default-rule',
    ruleType: 'FORBIDDEN_WORD',
    pattern: 'default',
    severity: 'warning',
    message: 'default message',
    snippet: 'word',
    position: 100,
    ...overrides,
  };
}

console.log('\n=== 1. Identieke (position, snippet): heuristic wint bij gelijke severity ===\n');
{
  const brandRule = makeViolation({
    ruleId: 'rule-cuid-123',
    pattern: 'innovatief',
    snippet: 'innovatie',
    position: 268,
    severity: 'warning',
    message: 'Avoid "innovatief"',
  });
  const heuristic = makeViolation({
    ruleId: 'heuristic:nl-NL:corporate-fluff:innovatie',
    pattern: 'innovatie',
    snippet: 'innovatie',
    position: 268,
    severity: 'warning',
    message: 'Heuristic flag: innovatie',
  });
  const result = dedupeViolations([brandRule, heuristic]);
  assert('exactly 1 violation after dedupe', result.length === 1);
  assert(
    'heuristic wint bij gelijke severity (rijkere category-mapping)',
    result[0].ruleId.startsWith('heuristic:'),
    `got ruleId=${result[0].ruleId}`,
  );
}

console.log('\n=== 2. Identieke (position, snippet): hogere severity wint ===\n');
{
  const brandRuleError = makeViolation({
    ruleId: 'rule-anti-pattern',
    snippet: 'jouw droomvloerluik',
    position: 50,
    severity: 'error', // antiPattern via voiceguide.antiPatterns
  });
  const heuristicWarning = makeViolation({
    ruleId: 'heuristic:nl-NL:corporate-fluff:droomvloerluik',
    snippet: 'jouw droomvloerluik',
    position: 50,
    severity: 'warning',
  });
  const result = dedupeViolations([heuristicWarning, brandRuleError]);
  assert('exactly 1 violation after dedupe', result.length === 1);
  assert(
    'error severity wint over warning',
    result[0].severity === 'error',
    `got severity=${result[0].severity}`,
  );
}

console.log('\n=== 3. Verschillende offsets: beide behouden ===\n');
{
  const violation1 = makeViolation({ position: 100, snippet: 'innovatie' });
  const violation2 = makeViolation({ position: 250, snippet: 'innovatie' });
  const result = dedupeViolations([violation1, violation2]);
  assert(
    'beide violations behouden (verschillende char-offsets)',
    result.length === 2,
  );
}

console.log('\n=== 4. Verschillende snippets op zelfde offset: beide behouden ===\n');
{
  const violation1 = makeViolation({ position: 100, snippet: 'innovatie' });
  const violation2 = makeViolation({ position: 100, snippet: 'innovatieve' });
  const result = dedupeViolations([violation1, violation2]);
  assert(
    'beide violations behouden (overlap maar verschillende snippet)',
    result.length === 2,
  );
}

console.log('\n=== 5. Document-level violations: niet collapsed op (position=0, snippet="") ===\n');
{
  const doc1 = makeViolation({
    ruleId: 'rule-required-1',
    ruleType: 'REQUIRED_PHRASE',
    position: 0,
    snippet: '',
    pattern: 'tot op de millimeter',
  });
  const doc2 = makeViolation({
    ruleId: 'rule-required-2',
    ruleType: 'REQUIRED_PHRASE',
    position: 0,
    snippet: '',
    pattern: 'vakmanschap',
  });
  const result = dedupeViolations([doc1, doc2]);
  assert(
    'document-level violations met verschillende ruleId behouden',
    result.length === 2,
  );
}

console.log('\n=== 6. Document-level: zelfde ruleId collapsed ===\n');
{
  const doc1 = makeViolation({
    ruleId: 'rule-required-1',
    position: 0,
    snippet: '',
  });
  const doc2 = makeViolation({
    ruleId: 'rule-required-1',
    position: 0,
    snippet: '',
  });
  const result = dedupeViolations([doc1, doc2]);
  assert(
    'document-level violations met zelfde ruleId collapsed',
    result.length === 1,
  );
}

console.log('\n=== 7. Empty input ===\n');
{
  const result = dedupeViolations([]);
  assert('empty array returns empty array', result.length === 0);
}

console.log('\n=== 8. Single input (geen dedup nodig) ===\n');
{
  const v = makeViolation({ snippet: 'kwaliteit', position: 200 });
  const result = dedupeViolations([v]);
  assert('single violation passes through', result.length === 1 && result[0] === v);
}

console.log('\n=== 9. Tie-break ordering — insertion-order independent ===\n');
{
  const brandRule = makeViolation({
    ruleId: 'rule-cuid',
    snippet: 'foo',
    position: 10,
    severity: 'warning',
  });
  const heuristic = makeViolation({
    ruleId: 'heuristic:nl-NL:cat:foo',
    snippet: 'foo',
    position: 10,
    severity: 'warning',
  });
  // Test beide volgordes om te garanderen dat tie-break niet afhankelijk
  // is van wie eerst gemerkt komt.
  const resultA = dedupeViolations([brandRule, heuristic]);
  const resultB = dedupeViolations([heuristic, brandRule]);
  assert(
    'heuristic wint ongeacht insertion-order (A: rule eerst)',
    resultA[0].ruleId.startsWith('heuristic:'),
  );
  assert(
    'heuristic wint ongeacht insertion-order (B: heuristic eerst)',
    resultB[0].ruleId.startsWith('heuristic:'),
  );
}

console.log(`\n=== RESULT: ${pass} pass, ${fail} fail ===\n`);
process.exit(fail > 0 ? 1 : 0);
