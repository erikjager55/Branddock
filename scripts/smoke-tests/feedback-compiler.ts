/**
 * Smoke-test voor feedback-compiler (sub-sprint #6.B).
 *
 * Verifieert: template-matching per category, severity-sortering,
 * pijler-emphasis trigger, attempt-aware framing, fallback.
 *
 * Run: npx tsx scripts/smoke-tests/feedback-compiler.ts
 */

import { compileFeedbackHint } from '../../src/lib/content-test/feedback-compiler';

let pass = 0;
let fail = 0;

function assert(name: string, cond: boolean, detail?: string): void {
  if (cond) {
    console.log(`  PASS ${name}`);
    pass++;
  } else {
    console.error(`  FAIL ${name}${detail ? ` -- ${detail}` : ''}`);
    fail++;
  }
}

console.log('\n=== Feedback-compiler smoke ===\n');

// ─── Template-matching per category ─────────────────────────
console.log('## Template-matching\n');

const voiceFormal = compileFeedbackHint({
  findings: [
    {
      category: 'VOICE',
      severity: 'HIGH',
      description: 'Toon is te formal en stijf voor brand-voice baseline',
    },
  ],
  attemptNumber: 1,
});
assert(
  'VOICE/formal → voice-tone-too-formal template',
  voiceFormal.appliedTemplates.includes('voice-tone-too-formal'),
);
assert(
  'VOICE/formal hint bevat warmte-instructie',
  voiceFormal.promptHint.includes('warmer'),
);

const claimVague = compileFeedbackHint({
  findings: [{ category: 'CLAIMS', severity: 'HIGH', description: 'Claim is vaag en generic' }],
  attemptNumber: 1,
});
assert('CLAIMS/vague → claims-vague template', claimVague.appliedTemplates.includes('claims-vague'));

const aiTell = compileFeedbackHint({
  findings: [{ category: 'AI_TELL', severity: 'MEDIUM', description: 'Generic cliché phrasing' }],
  attemptNumber: 1,
});
assert('AI_TELL/cliché → ai-tell-generic-phrasing', aiTell.appliedTemplates.includes('ai-tell-generic-phrasing'));

// ─── Severity-sortering: HIGH komt eerst ─────────────────────
console.log('\n## Severity-sortering\n');

const mixedSeverity = compileFeedbackHint({
  findings: [
    { category: 'STYLE', severity: 'LOW', description: 'Wall of text in alinea 2' },
    { category: 'VOICE', severity: 'HIGH', description: 'Toon is te formal' },
  ],
  attemptNumber: 1,
});
assert(
  'HIGH severity finding wins ordering',
  mixedSeverity.promptHint.indexOf('warmer') < mixedSeverity.promptHint.indexOf('Breek lange alinea'),
);

// ─── Pijler-emphasis trigger ────────────────────────────────
console.log('\n## Pijler-emphasis\n');

const lowStyle = compileFeedbackHint({
  findings: [{ category: 'VOICE', severity: 'HIGH', description: 'formal toon' }],
  pillarScores: { style: 40, judge: 80, rules: 75 },
  attemptNumber: 1,
});
assert(
  'pijler-emphasis bij >15 gap → style focuspunt',
  lowStyle.promptHint.includes('Focuspunt') && lowStyle.promptHint.includes('Style-fit'),
);

const balancedPillars = compileFeedbackHint({
  findings: [{ category: 'VOICE', severity: 'HIGH', description: 'formal toon' }],
  pillarScores: { style: 70, judge: 72, rules: 68 },
  attemptNumber: 1,
});
assert(
  'balanced pillars → geen emphasis',
  !balancedPillars.promptHint.includes('Focuspunt'),
);

// ─── Attempt-aware framing ──────────────────────────────────
console.log('\n## Attempt-framing\n');

const attempt1 = compileFeedbackHint({
  findings: [{ category: 'VOICE', severity: 'HIGH', description: 'formal' }],
  attemptNumber: 1,
});
assert(
  'attempt 1 → "Verbeterpunten uit vorige variant" header',
  attempt1.promptHint.includes('Verbeterpunten uit vorige variant'),
);

const attempt2 = compileFeedbackHint({
  findings: [{ category: 'VOICE', severity: 'HIGH', description: 'formal' }],
  attemptNumber: 2,
});
assert(
  'attempt 2 → "Laatste verbeterronde" header',
  attempt2.promptHint.includes('Laatste verbeterronde'),
);

// ─── Fallback ───────────────────────────────────────────────
console.log('\n## Fallback voor unmapped findings\n');

const unmapped = compileFeedbackHint({
  findings: [
    {
      category: 'BUSINESS',
      severity: 'HIGH',
      description: 'Iets dat nergens op matched',
    },
  ],
  attemptNumber: 1,
});
assert('unmapped → generic fallback', unmapped.promptHint.includes('Herzie tone, claims'));
assert('unmapped count = 1', unmapped.unmappedFindingsCount === 1);
assert('unmapped → no templates applied', unmapped.appliedTemplates.length === 0);

// ─── Max fragments cap (5) ──────────────────────────────────
console.log('\n## Max-fragments cap\n');

const manyFindings = compileFeedbackHint({
  findings: [
    { category: 'VOICE', severity: 'HIGH', description: 'formal' },
    { category: 'CLAIMS', severity: 'HIGH', description: 'vaag' },
    { category: 'STYLE', severity: 'HIGH', description: 'wall of text' },
    { category: 'AI_TELL', severity: 'HIGH', description: 'cliché' },
    { category: 'TERMINOLOGY', severity: 'HIGH', description: 'verboden term' },
    { category: 'STYLE', severity: 'MEDIUM', description: 'headline zwak' },
    // 6e zou eigenlijk niet doorkomen wegens cap
  ],
  attemptNumber: 1,
});
assert(
  'cap op 5 templates applied',
  manyFindings.appliedTemplates.length <= 5,
);

// ─── Duplicate-template dedupe ───────────────────────────────
console.log('\n## Duplicate-template dedupe\n');

const duplicates = compileFeedbackHint({
  findings: [
    { category: 'VOICE', severity: 'HIGH', description: 'formal' },
    { category: 'VOICE', severity: 'MEDIUM', description: 'corporate stijf' },
  ],
  attemptNumber: 1,
});
assert(
  'duplicate template gededupliceerd',
  duplicates.appliedTemplates.filter((t) => t === 'voice-tone-too-formal').length === 1,
);

console.log(`\n=== RESULT: ${pass} pass, ${fail} fail ===\n`);
process.exit(fail > 0 ? 1 : 0);
