/**
 * One-shot data fix — corrects LINFI's BrandPersonality toneDimensions.
 *
 * The 4 NN/g tone-dimension sliders were inconsistent with the rest of LINFI's
 * brand personality data. All sliders sat right of neutral (toward Casual / Funny /
 * Irreverent / Enthusiastic) while every other field — personalityTraits, spectrumSliders,
 * brandVoiceDescription — described "Meticulous / Refined / quietly confident /
 * professional yet approachable / elegant / authoritative".
 *
 * Discovered during WS1 schema audit (docs/voice-fingerprinting-ws1-audit.md).
 * Fix authorized as option 2 of the WS2 pre-registration discussion: correct
 * inconsistent reference data BEFORE WS2 generation so the drift-meting measures
 * the propagation mechanism, not data inconsistency confound.
 *
 * Usage:
 *   tsx scripts/voice-research/fix-linfi-tone.ts            # dry-run (default)
 *   tsx scripts/voice-research/fix-linfi-tone.ts --apply    # actually update DB
 *
 * Idempotent: re-running after apply detects values already correct and exits 0.
 */

import { prisma } from '@/lib/prisma';

// ─── Constants ────────────────────────────────────────────

const WORKSPACE_SLUG = 'linfi';
const FRAMEWORK_TYPE = 'BRAND_PERSONALITY';

/**
 * Corrected tone-dimension values for LINFI based on the rest of the brand personality:
 *   - personalityTraits: Meticulous, Refined, Reliable, Discerning
 *   - brandVoiceDescription: "professional yet approachable, quiet confidence, elegant"
 *   - spectrumSliders: Reserved, Formal, Serious, Proven, Traditional, Exclusive, Thoughtful
 *
 * Slider scale 1-7 (1 = first label, 7 = second label, 4 = neutral):
 *   formalCasual:              1=Formal,        7=Casual
 *   seriousFunny:              1=Serious,       7=Funny
 *   respectfulIrreverent:      1=Respectful,    7=Irreverent
 *   matterOfFactEnthusiastic:  1=Matter-of-fact, 7=Enthusiastic
 *
 * Pre-registered in WS2 protocol §3 — values to be applied:
 */
const CORRECTED_TONE_DIMENSIONS = {
  formalCasual: 3, // slight Formal — "professional yet approachable", not extreme
  seriousFunny: 2, // clearly Serious — "quietly confident", "authoritative"
  respectfulIrreverent: 2, // clearly Respectful — "professional", "refined", "elegant"
  matterOfFactEnthusiastic: 3, // slight Matter-of-fact — descriptive, not bombastic
} as const;

// ─── Main ─────────────────────────────────────────────────

async function main(): Promise<void> {
  const apply = process.argv.includes('--apply');

  console.log('━'.repeat(72));
  console.log('LINFI BrandPersonality toneDimensions — one-shot data fix');
  console.log(`Mode: ${apply ? 'APPLY (will write to DB)' : 'DRY-RUN (no DB write)'}`);
  console.log('━'.repeat(72));

  // Resolve LINFI workspace
  const workspace = await prisma.workspace.findFirst({
    where: { slug: WORKSPACE_SLUG },
    select: { id: true, name: true, slug: true },
  });
  if (!workspace) {
    console.error(`Workspace not found: slug=${WORKSPACE_SLUG}`);
    process.exit(1);
  }

  // Resolve canonical Brand Personality asset
  const asset = await prisma.brandAsset.findFirst({
    where: { workspaceId: workspace.id, frameworkType: FRAMEWORK_TYPE },
    select: { id: true, slug: true, name: true, frameworkData: true },
  });
  if (!asset) {
    console.error(
      `BrandAsset not found: workspace=${workspace.slug}, frameworkType=${FRAMEWORK_TYPE}`,
    );
    process.exit(1);
  }

  const fd = (asset.frameworkData ?? {}) as Record<string, unknown>;
  const currentTone = (fd.toneDimensions ?? {}) as Record<string, number>;

  console.log(`\nWorkspace:    ${workspace.name} (${workspace.id})`);
  console.log(`Asset:        ${asset.name} (${asset.slug}, id=${asset.id})`);
  console.log('\nCurrent toneDimensions:');
  console.log(JSON.stringify(currentTone, null, 2));
  console.log('\nProposed toneDimensions:');
  console.log(JSON.stringify(CORRECTED_TONE_DIMENSIONS, null, 2));

  // Idempotency check
  const alreadyCorrect =
    currentTone.formalCasual === CORRECTED_TONE_DIMENSIONS.formalCasual &&
    currentTone.seriousFunny === CORRECTED_TONE_DIMENSIONS.seriousFunny &&
    currentTone.respectfulIrreverent === CORRECTED_TONE_DIMENSIONS.respectfulIrreverent &&
    currentTone.matterOfFactEnthusiastic === CORRECTED_TONE_DIMENSIONS.matterOfFactEnthusiastic;

  if (alreadyCorrect) {
    console.log('\n✓ Values are already correct. No change needed.');
    await prisma.$disconnect();
    return;
  }

  // Diff
  console.log('\nDiff:');
  for (const key of Object.keys(CORRECTED_TONE_DIMENSIONS) as Array<
    keyof typeof CORRECTED_TONE_DIMENSIONS
  >) {
    const before = currentTone[key];
    const after = CORRECTED_TONE_DIMENSIONS[key];
    const marker = before !== after ? '←' : ' ';
    console.log(`  ${key.padEnd(28)} ${String(before).padStart(2)} → ${after} ${marker}`);
  }

  if (!apply) {
    console.log('\nDry-run only. Re-run with --apply to write changes.');
    await prisma.$disconnect();
    return;
  }

  // Apply: spread current frameworkData, replace only toneDimensions
  const updatedFrameworkData = {
    ...fd,
    toneDimensions: { ...CORRECTED_TONE_DIMENSIONS },
  };

  await prisma.brandAsset.update({
    where: { id: asset.id },
    data: { frameworkData: updatedFrameworkData },
  });

  // Verify
  const verify = await prisma.brandAsset.findUnique({
    where: { id: asset.id },
    select: { frameworkData: true },
  });
  const verifiedTone = ((verify?.frameworkData ?? {}) as Record<string, unknown>)
    .toneDimensions as Record<string, number>;

  console.log('\n✓ Applied. Verified DB state:');
  console.log(JSON.stringify(verifiedTone, null, 2));
  console.log(
    '\nNext run of formatBrandPersonality() will emit:',
  );
  console.log('  "Tone of voice: Formal, Serious, Respectful, Matter-of-fact"');
  console.log(
    '\nTo confirm propagation, re-run condition A or B dry-run on linfi/blog-post.',
  );

  await prisma.$disconnect();
}

main().catch(async (err) => {
  console.error('Fix failed:', err);
  await prisma.$disconnect().catch(() => {});
  process.exit(1);
});
