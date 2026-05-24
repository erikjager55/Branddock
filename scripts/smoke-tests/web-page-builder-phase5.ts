/**
 * Smoke-test voor Phase 5 — component-level AI menu + lock-toggle.
 *
 * Verifies:
 *  - ai-edit-instructions: registry has 4 known ids, returns metadata per id,
 *    rejects unknown ids.
 *  - component-lock: read/toggle locked state on puckData, count locked,
 *    strip lock-metadata for publish (without dropping other metadata).
 *  - End-to-end interaction: locking a component is reflected by
 *    isComponentLocked + countLocked; toggling twice returns to original.
 *
 * Run: npx tsx scripts/smoke-tests/web-page-builder-phase5.ts
 */

import {
  isValidInstructionId,
  getInstruction,
  listInstructions,
  type AiInstructionId,
} from '../../src/lib/landing-pages/ai-edit-instructions';
import {
  isComponentLocked,
  toggleComponentLock,
  countLocked,
  stripLockMetadataForPublish,
} from '../../src/lib/landing-pages/component-lock';

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

function group(name: string): void {
  console.log(`\n${name}`);
}

// ─── Fixtures ────────────────────────────────────────────────

function mockTree() {
  return {
    root: { props: {} },
    content: [
      {
        type: 'BrandHero',
        props: {
          id: 'hero-1',
          headline: 'H',
          sub: 'S',
          ctaLabel: 'CTA',
        },
      },
      {
        type: 'BrandCTA',
        props: {
          id: 'cta-1',
          label: 'Go',
          href: '#',
          personaId: '',
          metadata: { locked: true, analytics: 'tracked' },
        },
      },
      {
        type: 'Footer',
        props: { id: 'footer-1', companyName: 'B', tagline: 't', links: [] },
      },
    ],
  };
}

// ─── 1. ai-edit-instructions ─────────────────────────────────

function testAiInstructions(): void {
  group('1. ai-edit-instructions registry');

  const expectedIds: AiInstructionId[] = ['shorten', 'formal', 'casual', 'alternatives'];
  for (const id of expectedIds) {
    assert(`isValidInstructionId("${id}")`, isValidInstructionId(id));
    const ins = getInstruction(id);
    assert(`getInstruction("${id}") returns matching id`, ins.id === id);
    assert(`getInstruction("${id}") has English label`, typeof ins.label === 'string' && ins.label.length > 0);
    assert(`getInstruction("${id}") has promptDirective`, ins.promptDirective.length > 20);
  }

  const list = listInstructions();
  assert(`listInstructions returns ${expectedIds.length} entries`, list.length === expectedIds.length);

  assert('rejects unknown instruction id', !isValidInstructionId('expand-text'));
  assert('rejects empty string', !isValidInstructionId(''));

  const alternatives = getInstruction('alternatives');
  assert('alternatives is marked multiVariant', alternatives.multiVariant === true);
  assert('shorten is not multiVariant', getInstruction('shorten').multiVariant !== true);
}

// ─── 2. component-lock ───────────────────────────────────────

function testComponentLock(): void {
  group('2. isComponentLocked');

  const tree = mockTree();
  assert('unlocked hero returns false', isComponentLocked(tree, 'hero-1') === false);
  assert('locked cta returns true', isComponentLocked(tree, 'cta-1') === true);
  assert('unknown id returns false', isComponentLocked(tree, 'does-not-exist') === false);

  group('3. toggleComponentLock');
  const unlocked = toggleComponentLock(tree, 'cta-1');
  assert('toggling locked → unlocked', isComponentLocked(unlocked, 'cta-1') === false);
  assert('original tree unchanged (immutability)', isComponentLocked(tree, 'cta-1') === true);

  const relocked = toggleComponentLock(unlocked, 'cta-1');
  assert('toggling unlocked → locked again', isComponentLocked(relocked, 'cta-1') === true);

  const unknown = toggleComponentLock(tree, 'does-not-exist');
  assert('toggling unknown id returns same data ref', unknown === tree);

  const heroLocked = toggleComponentLock(tree, 'hero-1');
  assert('hero now locked', isComponentLocked(heroLocked, 'hero-1') === true);

  group('4. countLocked');
  assert(`original tree has 1 locked (got ${countLocked(tree)})`, countLocked(tree) === 1);
  assert('hero-locked tree has 2 locked', countLocked(heroLocked) === 2);
  assert('cta-unlocked tree has 0 locked', countLocked(unlocked) === 0);
}

// ─── 3. stripLockMetadataForPublish ──────────────────────────

function testStripLockMetadata(): void {
  group('5. stripLockMetadataForPublish');

  const tree = mockTree();
  const stripped = stripLockMetadataForPublish(tree);

  const strippedCta = stripped.content.find((c) => c.props.id === 'cta-1');
  assert(
    'cta metadata.locked removed',
    strippedCta?.props.metadata?.locked === undefined,
  );
  assert(
    'cta metadata.analytics preserved',
    strippedCta?.props.metadata?.analytics === 'tracked',
  );

  // Now build a tree where the component only had locked metadata — the
  // metadata key should be completely removed (no empty {} kept around).
  const onlyLocked = {
    root: { props: {} },
    content: [
      {
        type: 'BrandHero',
        props: { id: 'hero-2', headline: 'h', sub: 's', ctaLabel: 'c', metadata: { locked: true } },
      },
    ],
  };
  const cleanedOnlyLocked = stripLockMetadataForPublish(onlyLocked);
  const hero2 = cleanedOnlyLocked.content[0];
  assert(
    'pure-locked component drops metadata entirely',
    hero2.props.metadata === undefined,
    JSON.stringify(hero2.props),
  );

  // Stripping a tree without any locked metadata is a no-op shape-wise.
  const noLocks = {
    root: { props: {} },
    content: [
      { type: 'RichText', props: { id: 'r-1', content: 'hi' } },
    ],
  };
  const noLocksStripped = stripLockMetadataForPublish(noLocks);
  assert(
    'tree without locks survives strip',
    noLocksStripped.content[0].props.metadata === undefined,
  );
}

async function main(): Promise<void> {
  console.log('Phase 5 smoke-test — component AI-menu + lock-toggle');
  testAiInstructions();
  testComponentLock();
  testStripLockMetadata();
  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error('SMOKE crashed', err);
  process.exit(2);
});
