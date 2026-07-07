// =============================================================
// Backfill — één CreditBalance (balance 0) per Organization.
//
// Fase 0, ADR 2026-07-07-pricing-credits-launch. Idempotent: skipt organisaties
// die al een CreditBalance hebben. Dry-run default; --apply schrijft.
//
// De PRO→STARTER enum-remap is BEWUST deferred naar de credit-model-cutover
// (Fase 3/5) — PRO blijft nu bestaan voor Stripe-compat, dus geen data-remap hier.
//
// Run:
//   DATABASE_URL="postgresql://erikjager:@localhost:5432/branddock" npx tsx scripts/backfill-credit-balances.ts
//   ... voeg --apply toe om daadwerkelijk te seeden.
// =============================================================

import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function main(): Promise<void> {
  const apply = process.argv.includes('--apply');

  const orgs = await prisma.organization.findMany({
    select: { id: true, name: true, creditBalance: { select: { id: true } } },
  });
  const missing = orgs.filter((o) => !o.creditBalance);

  console.log(`${orgs.length} organisaties, ${missing.length} zonder CreditBalance.`);

  if (!apply) {
    console.log('DRY-RUN — voeg --apply toe om te seeden.');
    missing.forEach((o) => console.log(`  zou seeden: ${o.name} (${o.id})`));
    return;
  }

  for (const o of missing) {
    await prisma.creditBalance.create({ data: { organizationId: o.id, balance: 0 } });
    console.log(`  ✓ CreditBalance geseed voor ${o.name}`);
  }
  console.log(`Klaar: ${missing.length} CreditBalance-records aangemaakt.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
