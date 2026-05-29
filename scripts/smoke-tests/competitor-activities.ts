/**
 * DB-side smoke voor competitor-activities-ui (finalisatie + hardening 2026-05-29).
 *
 * Dekt de hardening-fixes + kern-acceptatiecriteria die zonder HTTP-sessie
 * testbaar zijn. De activities/summary/acknowledge routes hangen op
 * resolveWorkspaceId() (sessie-cookies) en zijn dus niet standalone aan te
 * roepen; voor die routes testen we het onderliggende data-laag-invariant.
 *
 * Scenario's:
 *   S1  getWorkspaceUsers — resolve via OrganizationMember + workspaceAccess-
 *       scoping (Fix F). Bewijst dat een member ZONDER legacy User.workspaceId
 *       wordt gevonden, en dat een member met scoped access tot een andere
 *       workspace wordt uitgesloten.
 *   S2  notifyMajorEvents — maakt in-app Notification rows voor de resolved
 *       users (Fix F end-to-end; oude code zou 0 rows maken) + non-MAJOR no-op.
 *   S3  notifyMajorEvents op 0-user workspace — geen throw, geen rows, en
 *       gestructureerde console.warn (Fix E silent-return logging).
 *   S4  isCronAuthorized — valid/wrong/missing-secret + no-secret prod/non-prod
 *       (Fix G constant-time helper).
 *   S5  reconcile-cron GET-handler — 401 op verkeerde Bearer (geen mutatie) +
 *       drift-correctie op geldige Bearer (Fix C + Fix G + AC9). NB: de cron
 *       reconcilieert ALLE workspaces (nachtelijk gedrag, idempotent/safe).
 *   S6  activity-summary totals-invariant — ge-ackte events tellen NIET mee in
 *       de acknowledgedAt:null groupBy (Fix B: gate ⇄ renderbare secties).
 *   S7  acknowledge atomic-decrement invariant — updateMany({acknowledgedAt:null})
 *       + decrement-by-count is race-safe: tweede ack flipt 0 rows, geen
 *       dubbel-decrement, geen negatieve drift (AC2).
 *
 * Run: DATABASE_URL="postgresql://erikjager:@localhost:5432/branddock" \
 *        npx tsx scripts/smoke-tests/competitor-activities.ts
 */
import type { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getWorkspaceUsers } from '@/lib/workspace/workspace-users';
import { notifyMajorEvents } from '@/lib/competitors/notify-major-events';
import { isCronAuthorized } from '@/lib/auth/cron-auth';
import { GET as reconcileGET } from '@/app/api/cron/reconcile-competitor-counts/route';
import type { DetectedActivity } from '@/lib/competitors/types';

const CRON_SECRET = 'smoke-secret-12345';

let pass = 0;
let fail = 0;

function assert(name: string, cond: boolean, detail?: string): void {
  if (cond) {
    console.log(`  ✓ ${name}`);
    pass++;
  } else {
    console.error(`  ✗ ${name}${detail ? ` — ${detail}` : ''}`);
    fail++;
  }
}

function mkReq(authorization?: string): NextRequest {
  return {
    headers: new Headers(authorization ? { authorization } : {}),
  } as unknown as NextRequest;
}

const majorActivity: DetectedActivity = {
  type: 'CATEGORY_REPOSITIONING',
  severity: 'MAJOR',
  summary: 'Smoke: fundamentele categorie-shift gedetecteerd',
  detectionMethod: 'ai-classified',
  confidence: 0.95,
  diffPayload: { version: 1, kind: 'pattern-change', fields: ['targetAudience'], rationale: 'smoke' },
};

async function main(): Promise<void> {
  if (!process.env.DATABASE_URL) {
    console.error('DATABASE_URL is required');
    process.exit(1);
  }
  process.env.CRON_SECRET = CRON_SECRET;

  const stamp = Date.now();
  console.log(`\n=== Setup: fixture org/workspaces/users (stamp ${stamp}) ===\n`);

  const org = await prisma.organization.create({
    data: { name: `SMOKE Org ${stamp}`, slug: `smoke-org-${stamp}` },
  });
  const ws1 = await prisma.workspace.create({
    data: { name: 'SMOKE WS1', slug: `smoke-ws1-${stamp}`, organizationId: org.id },
  });
  const ws2 = await prisma.workspace.create({
    data: { name: 'SMOKE WS2', slug: `smoke-ws2-${stamp}`, organizationId: org.id },
  });

  // User A: member ZONDER workspaceAccess (ziet alles) en ZONDER legacy User.workspaceId.
  const userA = await prisma.user.create({
    data: { email: `smoke-a-${stamp}@example.com`, name: 'Smoke A' },
  });
  await prisma.organizationMember.create({
    data: { userId: userA.id, organizationId: org.id, role: 'owner' },
  });
  // User B: member met workspaceAccess alleen tot ws2 → uitgesloten voor ws1.
  const userB = await prisma.user.create({
    data: { email: `smoke-b-${stamp}@example.com`, name: 'Smoke B' },
  });
  await prisma.organizationMember.create({
    data: {
      userId: userB.id,
      organizationId: org.id,
      role: 'member',
      workspaceAccess: { create: [{ workspaceId: ws2.id }] },
    },
  });
  // User C: member ZONDER workspaceAccess-records → ziet alle workspaces (incl. ws1).
  const userC = await prisma.user.create({
    data: { email: `smoke-c-${stamp}@example.com`, name: 'Smoke C' },
  });
  await prisma.organizationMember.create({
    data: { userId: userC.id, organizationId: org.id, role: 'member' },
  });

  const comp = await prisma.competitor.create({
    data: { name: `SMOKE Comp ${stamp}`, slug: `smoke-comp-${stamp}`, workspaceId: ws1.id, status: 'ANALYZED' },
  });

  try {
    // ── S1: getWorkspaceUsers ──
    console.log('\n=== S1: getWorkspaceUsers (OrganizationMember + scoping) ===\n');
    const ws1Users = await getWorkspaceUsers(ws1.id);
    assert('S1a ws1 bevat user A (org-member, geen legacy FK)', ws1Users.some((u) => u.id === userA.id));
    assert('S1b ws1 sluit user B uit (workspaceAccess alleen ws2)', !ws1Users.some((u) => u.id === userB.id));
    assert('S1e ws1 bevat user C (member zonder ACL-rows → ziet alles)', ws1Users.some((u) => u.id === userC.id));
    const ws2Users = await getWorkspaceUsers(ws2.id);
    assert(
      'S1c ws2 bevat A (geen scoping → alles) én B (scoped ws2)',
      ws2Users.some((u) => u.id === userA.id) && ws2Users.some((u) => u.id === userB.id),
    );
    assert('S1d niet-bestaande workspace → lege lijst', (await getWorkspaceUsers('nonexistent')).length === 0);

    // ── S2: notifyMajorEvents in-app rows ──
    console.log('\n=== S2: notifyMajorEvents — in-app Notification rows ===\n');
    await notifyMajorEvents({ workspaceId: ws1.id, competitorId: comp.id, competitorName: comp.name, activities: [majorActivity] });
    const notifsA = await prisma.notification.count({
      where: { workspaceId: ws1.id, userId: userA.id, type: 'COMPETITOR_MAJOR_EVENT' },
    });
    assert('S2a MAJOR → 1 in-app notificatie voor resolved user A (Fix F: oude code = 0)', notifsA === 1);
    const notifsB = await prisma.notification.count({ where: { workspaceId: ws1.id, userId: userB.id } });
    assert('S2b user B (geen ws1-toegang) krijgt 0 notificaties', notifsB === 0);

    const beforeInfo = await prisma.notification.count({ where: { workspaceId: ws1.id } });
    const infoActivity: DetectedActivity = {
      ...majorActivity,
      severity: 'INFO',
      summary: 'Smoke info',
      diffPayload: { version: 1, kind: 'field-change', field: 'tagline', before: 'a', after: 'b' },
    };
    await notifyMajorEvents({ workspaceId: ws1.id, competitorId: comp.id, competitorName: comp.name, activities: [infoActivity] });
    const afterInfo = await prisma.notification.count({ where: { workspaceId: ws1.id } });
    assert('S2c non-MAJOR → 0 nieuwe notificaties', afterInfo === beforeInfo);

    // ── S3: 0-user workspace silent-return logging ──
    console.log('\n=== S3: notifyMajorEvents op 0-user workspace (Fix E) ===\n');
    const orphanOrg = await prisma.organization.create({
      data: { name: `SMOKE Orphan ${stamp}`, slug: `smoke-orphan-${stamp}` },
    });
    const orphanWs = await prisma.workspace.create({
      data: { name: 'SMOKE Orphan WS', slug: `smoke-orphanws-${stamp}`, organizationId: orphanOrg.id },
    });
    let warned = false;
    const origWarn = console.warn;
    console.warn = (...args: unknown[]) => {
      if (String(args[0]).includes('notifyMajorEvents')) warned = true;
    };
    let threw = false;
    try {
      await notifyMajorEvents({ workspaceId: orphanWs.id, competitorId: comp.id, competitorName: 'Orphan', activities: [majorActivity] });
    } catch {
      threw = true;
    } finally {
      console.warn = origWarn;
    }
    assert('S3a 0-user workspace → geen throw', !threw);
    assert('S3b 0-user workspace → 0 notificaties', (await prisma.notification.count({ where: { workspaceId: orphanWs.id } })) === 0);
    assert('S3c silent-return logt gestructureerde console.warn', warned);
    await prisma.workspace.delete({ where: { id: orphanWs.id } });
    await prisma.organization.delete({ where: { id: orphanOrg.id } });

    // ── S4: isCronAuthorized ──
    console.log('\n=== S4: isCronAuthorized (constant-time, Fix G) ===\n');
    assert('S4a geldige Bearer → true', isCronAuthorized(mkReq(`Bearer ${CRON_SECRET}`)) === true);
    assert('S4b verkeerde Bearer → false', isCronAuthorized(mkReq('Bearer wrong')) === false);
    assert('S4c langere Bearer (length-mismatch) → false', isCronAuthorized(mkReq(`Bearer ${CRON_SECRET}extra`)) === false);
    assert('S4d ontbrekende header (secret gezet) → false', isCronAuthorized(mkReq()) === false);
    // NODE_ENV is read-only getypeerd; via een gecaste referentie tijdelijk wisselen.
    const env = process.env as Record<string, string | undefined>;
    const savedEnv = env.NODE_ENV;
    delete env.CRON_SECRET;
    env.NODE_ENV = 'development';
    assert('S4e geen secret + non-prod → true', isCronAuthorized(mkReq()) === true);
    env.NODE_ENV = 'production';
    assert('S4f geen secret + prod → false', isCronAuthorized(mkReq()) === false);
    if (savedEnv === undefined) delete env.NODE_ENV;
    else env.NODE_ENV = savedEnv;
    env.CRON_SECRET = CRON_SECRET;

    // ── S5: reconcile-cron GET-handler ──
    console.log('\n=== S5: reconcile-cron drift-correctie + auth (Fix C + G, AC9) ===\n');
    await prisma.competitorActivity.createMany({
      data: [
        { competitorId: comp.id, workspaceId: ws1.id, type: 'NEW_PRODUCT', severity: 'NOTABLE', summary: 'unacked a', detectionMethod: 'hash-diff', diffPayload: { version: 1, kind: 'field-change', field: 'tagline', before: null, after: 'x' } },
        { competitorId: comp.id, workspaceId: ws1.id, type: 'NEW_PRODUCT', severity: 'INFO', summary: 'unacked b', detectionMethod: 'hash-diff', diffPayload: { version: 1, kind: 'field-change', field: 'tagline', before: null, after: 'y' } },
        { competitorId: comp.id, workspaceId: ws1.id, type: 'NEW_PRODUCT', severity: 'INFO', summary: 'acked c', detectionMethod: 'hash-diff', diffPayload: { version: 1, kind: 'field-change', field: 'tagline', before: null, after: 'z' }, acknowledgedAt: new Date(), acknowledgedById: userA.id },
      ],
    });
    await prisma.competitor.update({ where: { id: comp.id }, data: { unacknowledgedActivityCount: 99 } });

    const resp401 = await reconcileGET(mkReq('Bearer wrong'));
    assert('S5a verkeerde Bearer → 401', resp401.status === 401);
    const stillDrift = await prisma.competitor.findUnique({ where: { id: comp.id }, select: { unacknowledgedActivityCount: true } });
    assert('S5b 401-pad muteert de drift niet (blijft 99)', stillDrift?.unacknowledgedActivityCount === 99);

    const resp200 = await reconcileGET(mkReq(`Bearer ${CRON_SECRET}`));
    assert('S5c geldige Bearer → 200', resp200.status === 200);
    const corrected = await prisma.competitor.findUnique({ where: { id: comp.id }, select: { unacknowledgedActivityCount: true } });
    assert('S5d drift gecorrigeerd 99 → 2 (actual unacked)', corrected?.unacknowledgedActivityCount === 2, `kreeg ${corrected?.unacknowledgedActivityCount}`);

    // ── S6: activity-summary totals exclude acknowledged (Fix B) ──
    console.log('\n=== S6: summary totals tellen alleen unacked (Fix B) ===\n');
    const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const groups = await prisma.competitorActivity.groupBy({
      by: ['severity'],
      _count: { _all: true },
      where: { workspaceId: ws1.id, detectedAt: { gte: since }, acknowledgedAt: null },
    });
    const infoUnacked = groups.find((g) => g.severity === 'INFO')?._count._all ?? 0;
    assert('S6 INFO-totaal telt 1 (acked INFO uitgesloten, niet 2)', infoUnacked === 1, `kreeg ${infoUnacked}`);

    // ── S7: acknowledge atomic-decrement race-safety (AC2) ──
    console.log('\n=== S7: acknowledge atomic-decrement race-safety (AC2) ===\n');
    const ackWhere = { competitorId: comp.id, acknowledgedAt: null };
    const firstAck = await prisma.$transaction(async (tx) => {
      const r = await tx.competitorActivity.updateMany({ where: ackWhere, data: { acknowledgedAt: new Date(), acknowledgedById: userA.id } });
      if (r.count > 0) await tx.competitor.update({ where: { id: comp.id }, data: { unacknowledgedActivityCount: { decrement: r.count } } });
      return r.count;
    });
    assert('S7a eerste ack flipt 2 unacked rows', firstAck === 2, `kreeg ${firstAck}`);
    const afterFirst = await prisma.competitor.findUnique({ where: { id: comp.id }, select: { unacknowledgedActivityCount: true } });
    assert('S7b decrement met exact flip-count → 0', afterFirst?.unacknowledgedActivityCount === 0);
    const secondAck = await prisma.$transaction(async (tx) => {
      const r = await tx.competitorActivity.updateMany({ where: ackWhere, data: { acknowledgedAt: new Date(), acknowledgedById: userA.id } });
      if (r.count > 0) await tx.competitor.update({ where: { id: comp.id }, data: { unacknowledgedActivityCount: { decrement: r.count } } });
      return r.count;
    });
    assert('S7c tweede ack (race) flipt 0 rows → geen dubbel-decrement', secondAck === 0);
    const afterSecond = await prisma.competitor.findUnique({ where: { id: comp.id }, select: { unacknowledgedActivityCount: true } });
    assert('S7d count blijft 0 (geen negatieve drift)', afterSecond?.unacknowledgedActivityCount === 0);
  } finally {
    console.log('\n=== Cleanup ===\n');
    // Org-delete cascadeert workspaces → competitors → activities → notifications + members.
    await prisma.organization.delete({ where: { id: org.id } }).catch((e) => console.warn('cleanup org:', e));
    // Users hangen via OrganizationMember (gecascadeerd), niet via legacy FK → expliciet weg.
    await prisma.user.deleteMany({ where: { id: { in: [userA.id, userB.id, userC.id] } } }).catch((e) => console.warn('cleanup users:', e));
  }

  console.log(`\n${'='.repeat(48)}\n${pass} PASS / ${fail} FAIL\n`);
  await prisma.$disconnect();
  process.exit(fail > 0 ? 1 : 0);
}

main().catch(async (err) => {
  console.error('Smoke crashed:', err);
  await prisma.$disconnect();
  process.exit(1);
});
