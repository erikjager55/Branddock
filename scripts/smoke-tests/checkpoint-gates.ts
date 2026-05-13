/**
 * Smoke-test voor pipeline checkpoint-gates (sub-sprint #6.A).
 *
 * Verifies alle 8 gate-functies: pass-case + minstens 1 block-failure-
 * case + minstens 1 warn-failure-case per gate.
 *
 * Run: npx tsx scripts/smoke-tests/checkpoint-gates.ts
 */

import {
  validateBriefInput,
  validateContextCompleteness,
  validateAngleDiversity,
  validateVariantOutput,
  validateSanitizationResult,
  validateFidelityComposite,
  validateStrictRewrite,
  validatePersistenceResult,
  batchGateResults,
} from '../../src/lib/content-test/checkpoint-gates';

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

async function main() {
  console.log('\n=== Pipeline checkpoint-gates smoke ===\n');

  // ─ Gate [1] validateBriefInput ─
  console.log('## Gate [1] validateBriefInput\n');
  const briefFull = validateBriefInput({
    objective: 'Restaurant-owners overtuigen',
    keyMessage: 'Premium duurzaam servies',
    toneDirection: 'vakkundig, warm',
    callToAction: 'Vraag staal aan',
  });
  assert('[1] full brief passes', briefFull.pass);

  // F-gate-strictness fix (audit 2026-05-13): empty brief is warn-only,
  // niet block — UI markeert deze fields niet als required.
  const briefEmpty = validateBriefInput({});
  assert('[1] empty brief warns (was: block)', !briefEmpty.pass && briefEmpty.severity === 'warn');

  const briefMissingKey = validateBriefInput({ toneDirection: 'casual', callToAction: 'click' });
  assert(
    '[1] geen objective + geen keyMessage warns (was: block)',
    !briefMissingKey.pass && briefMissingKey.severity === 'warn',
  );

  const briefPartial = validateBriefInput({
    objective: 'Awareness',
    keyMessage: 'Goed product',
  });
  assert('[1] partial brief warns', !briefPartial.pass && briefPartial.severity === 'warn');
  assert(
    '[1] partial brief reasons mention tone + cta',
    briefPartial.reasons.some((r) => r.includes('toneDirection')) &&
      briefPartial.reasons.some((r) => r.includes('callToAction')),
  );

  // ─ Gate [2] validateContextCompleteness ─
  console.log('\n## Gate [2] validateContextCompleteness\n');
  const ctxFull = validateContextCompleteness({
    brand: { brandName: 'Napking', contentLanguage: 'nl' },
    personas: [{ name: 'Restaurant-eigenaar' }],
    products: [{ name: 'Premium servies' }],
  });
  assert('[2] full context passes', ctxFull.pass);

  const ctxNoBrand = validateContextCompleteness({ personas: [{ name: 'Persona' }] });
  assert('[2] missing brandName blocks', !ctxNoBrand.pass && ctxNoBrand.severity === 'block');

  const ctxNoPersonaProduct = validateContextCompleteness({
    brand: { brandName: 'Napking', contentLanguage: 'nl' },
  });
  assert(
    '[2] missing persona+product warns',
    !ctxNoPersonaProduct.pass && ctxNoPersonaProduct.severity === 'warn',
  );

  const ctxNoLang = validateContextCompleteness({
    brand: { brandName: 'Napking' },
    personas: [{ name: 'Persona' }],
  });
  assert('[2] missing contentLanguage warns', !ctxNoLang.pass && ctxNoLang.severity === 'warn');

  // F2 fix: workspace-level fallback wanneer campaign-link leeg is
  const ctxWsFallback = validateContextCompleteness({
    brand: { brandName: 'Napking', contentLanguage: 'nl' },
    personas: [],
    products: [],
    workspacePersonaCount: 3,
    workspaceProductCount: 2,
  });
  assert(
    '[2] workspace-personas warn (info-level "niet campaign-linked")',
    !ctxWsFallback.pass &&
      ctxWsFallback.severity === 'warn' &&
      ctxWsFallback.reasons[0].includes('Workspace heeft 3 persona(s)'),
  );

  const ctxFullyEmpty = validateContextCompleteness({
    brand: { brandName: 'Napking', contentLanguage: 'nl' },
    personas: [],
    products: [],
    workspacePersonaCount: 0,
    workspaceProductCount: 0,
  });
  assert(
    '[2] zero personas anywhere warns met Brand Foundation tip',
    !ctxFullyEmpty.pass && ctxFullyEmpty.reasons[0].includes('Brand Foundation'),
  );

  // ─ Gate [3] validateAngleDiversity ─
  console.log('\n## Gate [3] validateAngleDiversity\n');
  const noAngles = validateAngleDiversity(null);
  assert('[3] null angles → pass (legacy flow)', noAngles.pass);

  const diverseAngles = validateAngleDiversity([
    { label: 'Stat-driven', approach: 'Open met cijfers over marktimpact en groei-percentages' },
    { label: 'Sensorial', approach: 'Beschrijf textuur, kleur, gewicht van het product zintuiglijk' },
  ]);
  assert('[3] diverse angles pass (high Jaccard)', diverseAngles.pass);

  const identicalAngles = validateAngleDiversity([
    { label: 'A', approach: 'Same approach text' },
    { label: 'B', approach: 'Same approach text' },
  ]);
  assert(
    '[3] identical angles block',
    !identicalAngles.pass && identicalAngles.severity === 'block',
  );

  const lowDiversity = validateAngleDiversity([
    { label: 'A', approach: 'Open met cijfers data getallen marktontwikkeling' },
    { label: 'B', approach: 'Open met cijfers data getallen markt' },
  ]);
  assert('[3] low-diversity angles warn', !lowDiversity.pass && lowDiversity.severity === 'warn');

  const oneAngle = validateAngleDiversity([{ label: 'Solo', approach: 'Only one' }]);
  assert('[3] single angle warns', !oneAngle.pass && oneAngle.severity === 'warn');

  // ─ Gate [4] validateVariantOutput ─
  console.log('\n## Gate [4] validateVariantOutput\n');
  const goodVariant = validateVariantOutput(
    { content: 'Dit is een variant met genoeg substance. '.repeat(20) },
    'body',
  );
  assert('[4] good body-variant passes', goodVariant.pass);

  const emptyVariant = validateVariantOutput({ content: '' }, 'body');
  assert('[4] empty content blocks', !emptyVariant.pass && emptyVariant.severity === 'block');

  // F25 fix (audit 2026-05-13): length-only failures zijn nu WARN, niet BLOCK.
  // Per-group minimum: body = 50 chars; 'Too short' (9 chars) faalt met warn.
  const tinyVariant = validateVariantOutput({ content: 'Too short' }, 'body');
  assert('[4] < 50 chars body warns', !tinyVariant.pass && tinyVariant.severity === 'warn');

  // Korte CTA passes (min 5 chars voor cta-groep)
  const shortCta = validateVariantOutput({ content: 'Plan een afspraak' }, 'cta');
  assert('[4] short CTA passes (>= 5 chars)', shortCta.pass);

  // Sub-5-char CTA warns (niet block)
  const tinyCta = validateVariantOutput({ content: 'Hi' }, 'cta');
  assert('[4] tiny CTA warns', !tinyCta.pass && tinyCta.severity === 'warn');

  const longHeadline = validateVariantOutput(
    { content: 'A '.repeat(200) },
    'headline',
  );
  assert(
    '[4] long headline warns (> 300 chars in plain-group)',
    !longHeadline.pass && longHeadline.severity === 'warn',
  );

  const shortBody = validateVariantOutput({ content: 'Short body content. ' }, 'body');
  assert(
    '[4] short body warns (< 100 chars)',
    !shortBody.pass && shortBody.severity === 'warn',
  );

  // ─ Gate [5] validateSanitizationResult ─
  console.log('\n## Gate [5] validateSanitizationResult\n');
  const stableSanitize = validateSanitizationResult(
    'Pre-sanitize content with some structure',
    'Pre-sanitize content with some structure',
  );
  assert('[5] no-op sanitize passes', stableSanitize.pass);

  const overSanitized = validateSanitizationResult(
    'A long input string '.repeat(20),
    'short',
  );
  assert(
    '[5] over-aggressive sanitize warns',
    !overSanitized.pass && overSanitized.severity === 'warn',
  );

  const emptyPost = validateSanitizationResult('original content', '');
  assert(
    '[5] empty post-sanitize blocks',
    !emptyPost.pass && emptyPost.severity === 'block',
  );

  const fencedPost = validateSanitizationResult(
    'before',
    'Some content\n```\ncode\n```\nmore content',
  );
  assert(
    '[5] markdown-fence leakage warns',
    !fencedPost.pass && fencedPost.severity === 'warn',
  );

  // ─ Gate [6] validateFidelityComposite ─
  console.log('\n## Gate [6] validateFidelityComposite\n');
  const aboveThreshold = validateFidelityComposite(
    { composite: 80 } as unknown as Parameters<typeof validateFidelityComposite>[0],
    65,
    false,
  );
  assert('[6] composite above threshold passes', aboveThreshold.pass);

  const belowNonStrict = validateFidelityComposite(
    { composite: 50 } as unknown as Parameters<typeof validateFidelityComposite>[0],
    65,
    false,
  );
  assert(
    '[6] below threshold non-strict warns',
    !belowNonStrict.pass && belowNonStrict.severity === 'warn',
  );

  const belowStrict = validateFidelityComposite(
    { composite: 50 } as unknown as Parameters<typeof validateFidelityComposite>[0],
    65,
    true,
  );
  assert('[6] below threshold strict blocks', !belowStrict.pass && belowStrict.severity === 'block');

  const noScore = validateFidelityComposite(null, 65, false);
  assert('[6] null score warns', !noScore.pass && noScore.severity === 'warn');

  // ─ Gate [7] validateStrictRewrite ─
  console.log('\n## Gate [7] validateStrictRewrite\n');
  const improved = validateStrictRewrite(50, 75);
  assert('[7] significant improvement passes', improved.pass);

  const worse = validateStrictRewrite(70, 60);
  assert('[7] rewrite verlaagde score blocks', !worse.pass && worse.severity === 'block');

  const marginal = validateStrictRewrite(60, 61);
  assert(
    '[7] marginal improvement warns (Δ < 2)',
    !marginal.pass && marginal.severity === 'warn',
  );

  // ─ Gate [8] validatePersistenceResult ─
  console.log('\n## Gate [8] validatePersistenceResult\n');
  const goodPersist = validatePersistenceResult({
    deliverableId: 'cm123',
    componentCount: 5,
    expectedComponentCount: 5,
  });
  assert('[8] consistent persistence passes', goodPersist.pass);

  const noId = validatePersistenceResult({ deliverableId: null });
  assert('[8] missing deliverableId blocks', !noId.pass && noId.severity === 'block');

  const mismatch = validatePersistenceResult({
    deliverableId: 'cm123',
    componentCount: 3,
    expectedComponentCount: 5,
  });
  assert(
    '[8] component-count mismatch warns',
    !mismatch.pass && mismatch.severity === 'warn',
  );

  // ─ Batch-aggregator ─
  console.log('\n## Batch-aggregator\n');
  const batch = batchGateResults([
    briefFull,
    ctxFull,
    diverseAngles,
    goodVariant,
    stableSanitize,
    aboveThreshold,
    improved,
    goodPersist,
  ]);
  assert('batch all-pass: passed = true', batch.passed);
  assert('batch all-pass: 0 blocks', batch.blockingFailures.length === 0);
  assert('batch all-pass: 0 warnings', batch.warnings.length === 0);

  const mixedBatch = batchGateResults([
    briefFull, // pass
    ctxNoBrand, // block
    diverseAngles, // pass
    shortBody, // warn
  ]);
  assert('batch mixed: passed = false (heeft block)', !mixedBatch.passed);
  assert('batch mixed: 1 block', mixedBatch.blockingFailures.length === 1);
  assert('batch mixed: 1 warning', mixedBatch.warnings.length === 1);

  console.log(`\n=== RESULT: ${pass} pass, ${fail} fail ===\n`);
  process.exit(fail > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error('Fatal:', err);
  process.exit(1);
});
