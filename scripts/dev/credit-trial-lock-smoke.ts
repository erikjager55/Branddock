// =============================================================
// Smoke — trial read-only-lock + T-3/T-0-meldingen (Fase 4).
// Bewijst: (1) getTrialState/isReadOnlyLocked lockt precies de verlopen
// no-card trial zonder betaal-historie; (2) enforceCreditBalance geeft de
// lock-402 (trialExpired) vóór de saldo-402; (3) enforceNotLocked dekt
// entity-creatie via workspace-resolutie; (4) notifyExpiringTrials stuurt
// T-3/T-0 precies één keer (dedup via het createdAt-venster).
//
// Run: NEXT_PUBLIC_CREDITS_ENABLED=true \
//        DATABASE_URL="postgresql://erikjager:@localhost:5432/branddock" \
//        npx tsx scripts/dev/credit-trial-lock-smoke.ts
// =============================================================

import { prisma } from '@/lib/prisma';
import { grantCredits, getBalance } from '@/lib/billing/credits/ledger';
import { getTrialState, isReadOnlyLocked } from '@/lib/billing/credits/trial';
import { notifyExpiringTrials } from '@/lib/billing/credits/trial-notify';
import { enforceCreditBalance, enforceNotLocked } from '@/lib/stripe/enforcement';

const PAST = new Date(Date.now() - 86_400_000);
const JUST_PAST = new Date(Date.now() - 3_600_000); // 1u geleden → T-0-venster
const T3_WINDOW = new Date(Date.now() + 2 * 86_400_000); // over 2 dagen → T-3-venster
const FUTURE = new Date(Date.now() + 30 * 86_400_000);

let pass = 0;
let fail = 0;
function check(label: string, cond: boolean): void {
  if (cond) { pass++; console.log(`  [ok] ${label}`); }
  else { fail++; console.error(`  [x] ${label}`); }
}

async function main(): Promise<void> {
  if (process.env.NEXT_PUBLIC_CREDITS_ENABLED !== 'true') {
    console.error('Zet NEXT_PUBLIC_CREDITS_ENABLED=true — de lock-paden zijn flag-gated.');
    process.exit(1);
  }
  const s = Date.now();
  const A = await prisma.organization.create({ data: { name: 'lock-pure', slug: `lock-a-${s}`, trialEndsAt: PAST } });
  const B = await prisma.organization.create({ data: { name: 'lock-paid', slug: `lock-b-${s}`, trialEndsAt: PAST } });
  const C = await prisma.organization.create({ data: { name: 'lock-future', slug: `lock-c-${s}`, trialEndsAt: FUTURE } });
  const D = await prisma.organization.create({ data: { name: 'lock-unl', slug: `lock-d-${s}`, trialEndsAt: PAST, unlimitedCredits: true } });
  const E = await prisma.organization.create({
    data: { name: 'lock-sub', slug: `lock-e-${s}`, trialEndsAt: PAST, subscriptionStatus: 'ACTIVE', stripeSubscriptionId: `sub_smoke_${s}` },
  });
  const F = await prisma.organization.create({ data: { name: 'lock-t3', slug: `lock-f-${s}`, trialEndsAt: T3_WINDOW } });
  const ids = [A.id, B.id, C.id, D.id, E.id, F.id];

  const wsA = await prisma.workspace.create({ data: { name: 'lock-ws-a', slug: `lock-ws-a-${s}`, organizationId: A.id } });
  const wsF = await prisma.workspace.create({ data: { name: 'lock-ws-f', slug: `lock-ws-f-${s}`, organizationId: F.id } });
  const user = await prisma.user.create({
    data: { id: `lock-user-${s}`, name: 'Lock Smoke', email: `lock-smoke-${s}@example.test`, emailVerified: true },
  });
  await prisma.organizationMember.create({ data: { organizationId: F.id, userId: user.id, role: 'owner' } });

  try {
    await grantCredits({ organizationId: A.id, credits: 300, type: 'TRIAL_GRANT', reason: 'trial' });
    await grantCredits({ organizationId: B.id, credits: 300, type: 'TRIAL_GRANT', reason: 'trial' });
    await grantCredits({ organizationId: B.id, credits: 100, type: 'TOPUP', reason: 'topup' });
    await grantCredits({ organizationId: C.id, credits: 300, type: 'TRIAL_GRANT', reason: 'trial' });
    await grantCredits({ organizationId: F.id, credits: 300, type: 'TRIAL_GRANT', reason: 'trial' });

    // (1) trial-state per scenario
    const stA = await getTrialState(A.id);
    check('A (verlopen pure trial) → isLocked', stA.isLocked && !stA.isTrialing);
    check('A → isReadOnlyLocked true', await isReadOnlyLocked(A.id));
    check('A → saldo blijft leesbaar in state', stA.creditsRemaining === (await getBalance(A.id)).available);
    const stB = await getTrialState(B.id);
    check('B (trial + top-up) → niet locked (lock-lift via lifetimeGranted)', !stB.isLocked);
    const stC = await getTrialState(C.id);
    check('C (trial loopt) → isTrialing + daysRemaining > 0', stC.isTrialing && stC.daysRemaining > 0 && !stC.isLocked);
    check('D (unlimited) → nooit locked', !(await isReadOnlyLocked(D.id)));
    const stE = await getTrialState(E.id);
    check('E (actieve subscription) → niet locked', !stE.isLocked && !stE.isTrialing);

    // (2) enforceCreditBalance: lock-402 wint van saldo-402 (A heeft nog 300 saldo!)
    const respA = await enforceCreditBalance(A.id, 5);
    const bodyA = respA ? await respA.json() : null;
    check('A → enforceCreditBalance 402 mét trialExpired (ondanks restsaldo)', respA?.status === 402 && bodyA?.trialExpired === true);
    check('B → enforceCreditBalance null (saldo dekt)', (await enforceCreditBalance(B.id, 5)) === null);

    // (3) enforceNotLocked via workspace (entity-creatie-guard)
    const lockResp = await enforceNotLocked(wsA.id);
    const lockBody = lockResp ? await lockResp.json() : null;
    check('wsA → enforceNotLocked 402 trialExpired', lockResp?.status === 402 && lockBody?.trialExpired === true);
    check('wsF (trial loopt) → enforceNotLocked null', (await enforceNotLocked(wsF.id)) === null);

    // (4) T-3-melding: F zit in het venster; precies één keer (dedup).
    // NB: notifyExpiringTrials scant de hele dev-DB — echte orgs in het venster
    // krijgen echte rijen/mails; de asserts verdragen dat (>= i.p.v. ===).
    const n1 = await notifyExpiringTrials();
    check('T-3: eerste run notificeert F', n1 >= 1);
    const created = await prisma.notification.count({ where: { workspaceId: wsF.id, type: 'TRIAL_EXPIRING' } });
    check('T-3: notificatie-rij aangemaakt voor wsF', created === 1);
    const n2 = await notifyExpiringTrials();
    const created2 = await prisma.notification.count({ where: { workspaceId: wsF.id, type: 'TRIAL_EXPIRING' } });
    check('T-3: tweede run dedupt (geen extra rij)', created2 === created && n2 === 0);

    // (4b) T-0: zet F net-verlopen → nieuwe melding (ander venster), daarna dedup.
    // Tijdreis-fixture: dateer de T-3-rij mee terug, anders valt die (createdAt=nu)
    // kunstmatig ín het T-0-venster — in productie ontstaat een T-3-melding per
    // definitie vóór trialEndsAt, dus dit herstelt alleen de echte invariant.
    await prisma.organization.update({ where: { id: F.id }, data: { trialEndsAt: JUST_PAST } });
    await prisma.notification.updateMany({
      where: { workspaceId: wsF.id, type: 'TRIAL_EXPIRING' },
      data: { createdAt: new Date(JUST_PAST.getTime() - 86_400_000) },
    });
    const n3 = await notifyExpiringTrials();
    const created3 = await prisma.notification.count({ where: { workspaceId: wsF.id, type: 'TRIAL_EXPIRING' } });
    check('T-0: verlopen trial krijgt een tweede (T-0-)melding', n3 >= 1 && created3 === 2);
    const n4 = await notifyExpiringTrials();
    check('T-0: dedupt daarna', n4 === 0);
  } finally {
    await prisma.notification.deleteMany({ where: { workspaceId: { in: [wsA.id, wsF.id] } } });
    await prisma.organizationMember.deleteMany({ where: { organizationId: { in: ids } } });
    await prisma.workspace.deleteMany({ where: { id: { in: [wsA.id, wsF.id] } } });
    await prisma.user.delete({ where: { id: user.id } }).catch(() => {});
    for (const id of ids) {
      await prisma.creditTransaction.deleteMany({ where: { organizationId: id } });
      await prisma.creditBalance.deleteMany({ where: { organizationId: id } });
      await prisma.organization.delete({ where: { id } }).catch(() => {});
    }
  }

  console.log(`\n${pass} passed, ${fail} failed.`);
  process.exit(fail ? 1 : 0);
}

main().catch(async (e) => {
  console.error('FATAL', e instanceof Error ? e.stack : String(e));
  await prisma.$disconnect();
  process.exit(1);
});
