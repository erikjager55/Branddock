/**
 * Smoke-test voor Gemini compose pipeline (sub-sprint #6.A nano-banana migration).
 *
 * Verifieert: typed errors voor edge cases. Echte API-call wordt alleen
 * uitgevoerd wanneer GEMINI_API_KEY beschikbaar is — anders skip we de live
 * test maar verifiëren we wel de error-paths zonder netwerk.
 *
 * Run: npx tsx scripts/smoke-tests/compose-pipeline-gemini.ts
 */

import {
  composeFromImages,
  ComposeInvalidImageError,
} from '../../src/lib/ai/gemini-client';

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

async function expectThrow<T extends Error>(
  fn: () => Promise<unknown>,
  errorClass: new (msg: string) => T,
): Promise<T | null> {
  try {
    await fn();
    return null;
  } catch (err) {
    if (err instanceof errorClass) return err;
    console.error(`  Unexpected error type: ${(err as Error).name}`);
    return null;
  }
}

async function main() {
  console.log('\n=== Gemini compose smoke ===\n');

  // ─── Input validation ──────────────────────────────────────
  console.log('## Input validation\n');

  const tooFewImages = await expectThrow(
    () => composeFromImages(['https://example.com/a.png'], 'test'),
    ComposeInvalidImageError,
  );
  assert('< 2 images → ComposeInvalidImageError', tooFewImages !== null);

  const tooManyImages = await expectThrow(
    () =>
      composeFromImages(
        Array.from({ length: 10 }, (_, i) => `https://example.com/${i}.png`),
        'test',
      ),
    ComposeInvalidImageError,
  );
  assert('> 9 images → ComposeInvalidImageError', tooManyImages !== null);

  const emptyInstruction = await expectThrow(
    () => composeFromImages(['https://example.com/a.png', 'https://example.com/b.png'], '   '),
    ComposeInvalidImageError,
  );
  assert('empty instruction → ComposeInvalidImageError', emptyInstruction !== null);

  // Network error-mapping is environment-dependent (private IPs, DNS,
  // captive portals) — we verifieren in productie via integration-tests
  // niet via deze smoke. Typed errors zijn al gedekt via input-validation
  // boven + de live-test hieronder (wanneer SMOKE_LIVE=1).

  // ─── Live test (skipped wanneer geen GEMINI_API_KEY) ───────
  if (process.env.GEMINI_API_KEY && process.env.SMOKE_LIVE === '1') {
    console.log('\n## Live API test (SMOKE_LIVE=1 set)\n');
    try {
      const result = await composeFromImages(
        [
          'https://picsum.photos/seed/a/512',
          'https://picsum.photos/seed/b/512',
        ],
        'Blend these two scenes into one harmonious composition',
        { aspectRatio: '1:1' },
      );
      assert(
        'live: imageBytes returned',
        result.imageBytes.length > 1000,
      );
      assert('live: mimeType present', result.mimeType.startsWith('image/'));
    } catch (err) {
      console.error(`  Live test failed: ${(err as Error).message}`);
      fail++;
    }
  } else {
    console.log('\n## Live API test SKIPPED (set GEMINI_API_KEY + SMOKE_LIVE=1 to enable)\n');
  }

  console.log(`\n=== RESULT: ${pass} pass, ${fail} fail ===\n`);
  process.exit(fail > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error('Fatal:', err);
  process.exit(1);
});
