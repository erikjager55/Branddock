// =============================================================
// set-unlimited-credits — zet/haalt de unlimited-free-uitzondering op een org.
//
// Voor comped accounts / pre-launch-gebruikers die de app onbeperkt gratis mogen
// gebruiken (alle credit-metering/enforcement short-circuit voor die org).
// Resolvet op org-id/slug, org-naam (bevat), of workspace-id/-naam.
//
// Run:
//   DATABASE_URL="postgresql://erikjager:@localhost:5432/branddock" \
//     npx tsx scripts/dev/set-unlimited-credits.ts <org-slug|naam|workspaceId> [true|false]
// =============================================================

import { prisma } from '@/lib/prisma';

type OrgRow = { id: string; name: string; slug: string; unlimitedCredits: boolean };

async function resolveOrg(query: string): Promise<OrgRow | null> {
  const direct = await prisma.organization.findFirst({
    where: {
      OR: [{ id: query }, { slug: query }, { name: { contains: query, mode: 'insensitive' } }],
    },
    select: { id: true, name: true, slug: true, unlimitedCredits: true },
  });
  if (direct) return direct;

  const ws = await prisma.workspace.findFirst({
    where: { OR: [{ id: query }, { name: { contains: query, mode: 'insensitive' } }] },
    select: {
      organization: { select: { id: true, name: true, slug: true, unlimitedCredits: true } },
    },
  });
  return ws?.organization ?? null;
}

async function main(): Promise<void> {
  const query = process.argv[2];
  const value = (process.argv[3] ?? 'true').toLowerCase() !== 'false';

  if (!query) {
    console.error('Gebruik: npx tsx scripts/dev/set-unlimited-credits.ts <org-slug|naam|workspaceId> [true|false]');
    process.exit(1);
  }

  const org = await resolveOrg(query);
  if (!org) {
    console.error(`Geen organisatie gevonden voor "${query}".`);
    process.exit(1);
  }

  if (org.unlimitedCredits === value) {
    console.log(`(ongewijzigd) ${org.name} (${org.slug}) → unlimitedCredits = ${value}`);
    return;
  }

  const updated = await prisma.organization.update({
    where: { id: org.id },
    data: { unlimitedCredits: value },
    select: { name: true, slug: true, unlimitedCredits: true },
  });
  console.log(`✅ ${updated.name} (${updated.slug}) → unlimitedCredits = ${updated.unlimitedCredits}`);
  console.log('   (server-cache verloopt binnen 60s; direct effect na herstart.)');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => process.exit(0));
