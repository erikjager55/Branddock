// =============================================================
// Dev-tool — toon/zet het credit-saldo van een organisatie (billing-testen).
//
// Usage (DATABASE_URL vereist):
//   credit-admin.ts                         → lijst orgs + workspaces
//   credit-admin.ts <org-slug|naam|wsId>    → toon saldo
//   credit-admin.ts <query> grant <n>       → +n credits
//   credit-admin.ts <query> set <n>         → zet saldo exact op n (voor 402-test: set 0)
// =============================================================

import { prisma } from '@/lib/prisma';
import { grantCredits, getBalance, deductCredits } from '@/lib/billing/credits/ledger';

type OrgRow = { id: string; name: string; slug: string; unlimitedCredits: boolean };

async function resolveOrg(query: string): Promise<OrgRow | null> {
  const direct = await prisma.organization.findFirst({
    where: { OR: [{ id: query }, { slug: query }, { name: { contains: query, mode: 'insensitive' } }] },
    select: { id: true, name: true, slug: true, unlimitedCredits: true },
  });
  if (direct) return direct;
  const ws = await prisma.workspace.findFirst({
    where: { OR: [{ id: query }, { name: { contains: query, mode: 'insensitive' } }] },
    select: { organization: { select: { id: true, name: true, slug: true, unlimitedCredits: true } } },
  });
  return ws?.organization ?? null;
}

async function show(org: OrgRow): Promise<void> {
  const b = await getBalance(org.id);
  const flag = org.unlimitedCredits ? '  ⚠️ unlimitedCredits=true (metering short-circuit!)' : '';
  console.log(`${org.name} (${org.slug}): balance=${b.balance} reserved=${b.reserved} available=${b.available}${flag}`);
}

async function listAll(): Promise<void> {
  const orgs = await prisma.organization.findMany({
    select: { id: true, name: true, slug: true, unlimitedCredits: true, workspaces: { select: { name: true, id: true } } },
    take: 25,
  });
  console.log('Organisaties + workspaces:\n');
  for (const o of orgs) {
    const b = await getBalance(o.id);
    console.log(`• ${o.name} (${o.slug})  balance=${b.balance}${o.unlimitedCredits ? '  [unlimited]' : ''}`);
    for (const w of o.workspaces) console.log(`    └ ws: ${w.name}  (${w.id})`);
  }
}

async function main(): Promise<void> {
  const query = process.argv[2];
  const cmd = process.argv[3];
  const amount = Math.round(Number(process.argv[4] ?? 0));

  if (!query) { await listAll(); return; }

  const org = await resolveOrg(query);
  if (!org) { console.error(`Geen organisatie gevonden voor "${query}".`); process.exit(1); }

  if (cmd === 'grant' && amount > 0) {
    await grantCredits({ organizationId: org.id, credits: amount, type: 'TOPUP', reason: 'dev-grant' });
  } else if (cmd === 'set') {
    const cur = (await getBalance(org.id)).balance;
    const diff = amount - cur;
    if (diff > 0) await grantCredits({ organizationId: org.id, credits: diff, type: 'TOPUP', reason: 'dev-set' });
    else if (diff < 0) await deductCredits({ organizationId: org.id, credits: -diff, reason: 'dev-set', force: true });
  }

  await show(org);
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => process.exit(0));
