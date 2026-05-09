/**
 * scripts/heuristics/seed-bb-locale.ts
 *
 * Δ-2 sub-cluster D — Better Brands locale seed.
 *
 * Sets BrandVoiceguide.contentLocale = 'nl-NL' voor de Better Brands pilot
 * workspace. Idempotent: skip wanneer locale al gezet (tenzij --force).
 *
 * Per ADR-3 fallback chain valt resolveLocaleForBrand zonder voiceguide-locale
 * terug op Workspace.contentLanguage 'nl' → 'nl-NL'. Deze seed maakt het
 * expliciet voor BB zodat:
 *   - Brand Alignment UI toont "BB heeft nl-NL als baseline"
 *   - Future locale-switch (e.g. BE-pilot) trigger automatisch andere package
 *
 * Run:
 *   DOTENV_CONFIG_PATH=.env.local npx tsx -r dotenv/config \
 *     scripts/heuristics/seed-bb-locale.ts [--force] [--workspace=<id>]
 *
 * Default zoekt naar workspace.name === 'Better Brands'. Override via
 * --workspace=<id> voor andere pilot-workspaces (Linfi, Nobox, WRA).
 */

import { prisma } from '@/lib/prisma';

const args = process.argv.slice(2);
const force = args.includes('--force');
const workspaceArg = args.find((a) => a.startsWith('--workspace='));
const explicitWorkspaceId = workspaceArg ? workspaceArg.slice('--workspace='.length) : null;

const TARGET_LOCALE = 'nl-NL';

async function main() {
  // Resolve target workspace
  const workspace = explicitWorkspaceId
    ? await prisma.workspace.findUnique({ where: { id: explicitWorkspaceId } })
    : await prisma.workspace.findFirst({ where: { name: 'Better Brands' } });

  if (!workspace) {
    console.error(
      `❌ Workspace not found${explicitWorkspaceId ? ` (id=${explicitWorkspaceId})` : ` (name="Better Brands")`}`,
    );
    process.exit(1);
  }

  console.log(`Workspace: ${workspace.name} (${workspace.id})`);

  const voiceguide = await prisma.brandVoiceguide.findUnique({
    where: { workspaceId: workspace.id },
    select: { id: true, contentLocale: true },
  });

  if (!voiceguide) {
    console.error(
      `❌ No BrandVoiceguide for workspace ${workspace.name}. Complete BV-extraction first.`,
    );
    process.exit(1);
  }

  if (voiceguide.contentLocale && !force) {
    console.log(
      `✓ contentLocale already set: ${voiceguide.contentLocale}. Skipping (use --force to override).`,
    );
    process.exit(0);
  }

  await prisma.brandVoiceguide.update({
    where: { workspaceId: workspace.id },
    data: { contentLocale: TARGET_LOCALE },
  });

  console.log(`✅ Set ${workspace.name}.contentLocale = '${TARGET_LOCALE}'`);
}

main()
  .catch((err) => {
    console.error('❌ Seed failed:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
