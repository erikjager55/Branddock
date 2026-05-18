/**
 * Smoke-test voor ebook-validation utility.
 *
 * Verifieert: chapter-extraction + paraphrase-detection + word-count bounds +
 * Key Takeaway box detection + edge cases (Dutch + English, mixed headings).
 *
 * Run: npx tsx scripts/smoke-tests/ebook-validation.ts
 */

import { validateEbookOutput, formatEbookValidationReport } from '../../src/lib/studio/ebook-validation';

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

const lorem = (n: number) =>
  Array.from({ length: n }, (_, i) => `word${i}`).join(' ');

// ─── Test 1: paraphrase-duplicate (production bug) ──────────
console.log('\n=== Paraphrase detection (LINFI bug 2026-05-18) ===\n');

const paraphraseBug = `## Table of Contents
- Chapter 1 — Foundation — Preview
- Chapter 2 — Method — Preview

## Hoofdstuk 1: Voorluiken in luxe interieurs
${lorem(900)}
> **Key Takeaway**: Sterk fundament.

## Hoofdstuk 2: Vier typen voorluiken
${lorem(650)}
> **Key Takeaway**: Vier types.

## Hoofdstuk 3: Naadloze integratie
${lorem(650)}
> **Key Takeaway**: Integratie.

## Hoofdstuk 4: Van meting tot montage
${lorem(450)}
> **Key Takeaway**: Process.

## Hoofdstuk 5: Van netting tot montage
${lorem(350)}
> **Key Takeaway**: Implementation.
`;

const result1 = validateEbookOutput(paraphraseBug);
assert('Paraphrase detected (Ch4 meting + Ch5 netting)', !result1.ok);
assert(
  'Issue kind = paraphrase-title',
  result1.issues.some((i) => i.kind === 'paraphrase-title' && i.severity === 'error'),
);
assert('5 chapters detected', result1.chapters.length === 5);

// ─── Test 2: clean output ───────────────────────────────────
console.log('\n=== Clean output ===\n');

const clean = `## Table of Contents
- chapters

## Introduction
Intro text.

## Chapter 1: Foundation
${lorem(900)}
> **Key Takeaway**: One.

## Chapter 2: Methodology
${lorem(650)}
> **Key Takeaway**: Two.

## Chapter 3: Application
${lorem(650)}
> **Key Takeaway**: Three.

## Chapter 4: Advanced Tactics
${lorem(450)}
> **Key Takeaway**: Four.

## Chapter 5: Action Plan
${lorem(350)}
> **Key Takeaway**: Five.

## Conclusion
Wrap up.
`;

const result2 = validateEbookOutput(clean);
assert('Clean output passes', result2.ok, formatEbookValidationReport(result2));
assert('5 unique chapters', result2.chapters.length === 5);
assert('All Key Takeaways detected', result2.chapters.every((c) => c.hasKeyTakeaway));

// ─── Test 3: chapter-length asymmetry (production bug H7) ───
console.log('\n=== Chapter-length asymmetry ===\n');

const asymmetric = `## Chapter 1: Foundation
${lorem(1500)}
> **Key Takeaway**: long.

## Chapter 2: Method
${lorem(150)}
> **Key Takeaway**: short.

## Chapter 3: Deep dive
${lorem(150)}
> **Key Takeaway**: short.

## Chapter 4: Advanced
${lorem(100)}
> **Key Takeaway**: short.

## Chapter 5: Action
${lorem(80)}
> **Key Takeaway**: short.
`;

const result3 = validateEbookOutput(asymmetric);
assert('Asymmetric output fails', !result3.ok);
assert(
  'Ch1 over-budget detected',
  result3.issues.some((i) => i.chapterIndex === 1 && i.kind === 'chapter-length-out-of-bounds'),
);
assert(
  'Ch2 under-budget detected',
  result3.issues.some((i) => i.chapterIndex === 2 && i.kind === 'chapter-length-out-of-bounds'),
);

// ─── Test 4: missing Key Takeaway ───────────────────────────
console.log('\n=== Missing Key Takeaway ===\n');

const noKeyTakeaway = `## Chapter 1: Foundation
${lorem(900)}

## Chapter 2: Method
${lorem(650)}

## Chapter 3: Deep
${lorem(650)}

## Chapter 4: Advanced
${lorem(450)}

## Chapter 5: Action
${lorem(350)}
`;

const result4 = validateEbookOutput(noKeyTakeaway);
assert(
  'Key Takeaway missing detected (5 warnings)',
  result4.issues.filter((i) => i.kind === 'missing-key-takeaway').length === 5,
);
// note: warnings don't fail validation, only errors do — but chapters are clean so ok
assert(
  'Key Takeaway warnings are severity=warning',
  result4.issues.filter((i) => i.kind === 'missing-key-takeaway').every((i) => i.severity === 'warning'),
);

// ─── Test 5: too-few chapters ───────────────────────────────
console.log('\n=== Too few chapters ===\n');

const tooFew = `## Chapter 1: Only one
${lorem(900)}
> **Key Takeaway**: x.

## Chapter 2: Two
${lorem(650)}
> **Key Takeaway**: y.
`;

const result5 = validateEbookOutput(tooFew);
assert('Too-few-chapters error', !result5.ok);
assert(
  'Specific too-few kind raised',
  result5.issues.some((i) => i.kind === 'too-few-chapters' && i.severity === 'error'),
);

// ─── Test 6: Dutch headings (Hoofdstuk) ─────────────────────
console.log('\n=== Dutch heading detection ===\n');

const dutchHeadings = `## Inhoudsopgave
toc

## Inleiding
intro

## Hoofdstuk 1: Fundament
${lorem(900)}
> **Key Takeaway**: NL1.

## Hoofdstuk 2: Methode
${lorem(650)}
> **Key Takeaway**: NL2.

## Hoofdstuk 3: Verdieping
${lorem(650)}
> **Key Takeaway**: NL3.

## Hoofdstuk 4: Toepassing
${lorem(450)}
> **Key Takeaway**: NL4.

## Hoofdstuk 5: Actieplan
${lorem(350)}
> **Key Takeaway**: NL5.

## Conclusie
wrap.
`;

const result6 = validateEbookOutput(dutchHeadings);
assert('NL chapter detection ok', result6.chapters.length === 5);
assert(
  'NL "Inhoudsopgave" / "Inleiding" / "Conclusie" gefilterd',
  result6.chapters.every((c) => !/inhoudsopgave|inleiding|conclusie/i.test(c.title)),
);

// ─── Test 7: false-positive check on unique titles ──────────
console.log('\n=== False-positive guards ===\n');

const distinct = `## Chapter 1: Foundation principles
${lorem(900)}
> **Key Takeaway**: x.

## Chapter 2: Methodology framework
${lorem(650)}
> **Key Takeaway**: y.

## Chapter 3: Implementation patterns
${lorem(650)}
> **Key Takeaway**: z.

## Chapter 4: Edge case handling
${lorem(450)}
> **Key Takeaway**: w.

## Chapter 5: Production rollout
${lorem(350)}
> **Key Takeaway**: v.
`;

const result7 = validateEbookOutput(distinct);
assert(
  'Distinct titles: no paraphrase false-positive',
  !result7.issues.some((i) => i.kind === 'paraphrase-title'),
);

// ─── Summary ────────────────────────────────────────────────
console.log(`\n${pass} pass, ${fail} fail`);
process.exit(fail > 0 ? 1 : 0);
