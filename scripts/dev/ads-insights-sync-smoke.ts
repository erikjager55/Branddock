/**
 * Ads-insights-sync-smoke (ads-watchdog Fase 1) — end-to-end tegen de échte
 * Graph API met een kortlevend Explorer-token, op de lokale dev-DB.
 *
 * Seed: lokale ConnectedAdAccount (BB-workspace) met het token versleuteld
 * onder de lokale TOKEN_ENCRYPTION_KEY — daarna draait de ECHTE syncAdInsights
 * (incl. appsecret_proof; vereist META_APP_ID/SECRET in .env.local).
 *
 * Run (vanuit de worktree):
 *   FB_TOKEN=<explorer-token> DATABASE_URL=... TOKEN_ENCRYPTION_KEY=... \
 *     node --env-file-if-exists=.env.local node_modules/.bin/tsx \
 *     scripts/dev/ads-insights-sync-smoke.ts
 * Flags: KEEP_SEED=1.
 */
import { prisma } from "../../src/lib/prisma";
import { encryptToken } from "../../src/lib/ad-tokens/encryption";
import { syncAdInsights } from "../../src/lib/jobs/sync-ad-insights";
import { syncAdCampaignStatus } from "../../src/lib/jobs/sync-ad-campaign-status";

const WS = process.env.ADS_WS ?? "cmnomsobx009q44msn0gpw7vb"; // Better Brands dev
const USER_ID = "demo-user-erik-001";
const ACCT = "act_764986273365908";
const SEED_TAG = "ads-insights-smoke";

let pass = 0;
let fail = 0;
function check(name: string, ok: boolean, detail?: string) {
  if (ok) { pass += 1; console.log(`  PASS ${name}`); }
  else { fail += 1; console.log(`  FAIL ${name}${detail ? ` — ${detail}` : ""}`); }
}

async function cleanup() {
  const accounts = await prisma.connectedAdAccount.findMany({
    where: { workspaceId: WS, accountName: SEED_TAG }, select: { id: true },
  });
  for (const a of accounts) {
    const rows = await prisma.adCampaign.findMany({ where: { connectedAccountId: a.id }, select: { id: true } });
    await prisma.adMetricSnapshot.deleteMany({ where: { campaignId: { in: rows.map((r) => r.id) } } });
    await prisma.adCampaign.deleteMany({ where: { connectedAccountId: a.id } });
  }
  await prisma.connectedAdAccount.deleteMany({ where: { id: { in: accounts.map((a) => a.id) } } });
}

async function main() {
  const token = process.env.FB_TOKEN;
  if (!token) throw new Error("FB_TOKEN ontbreekt");
  await cleanup();

  // ── Seed: gekoppeld account met lokaal-versleuteld token ──────────────
  const account = await prisma.connectedAdAccount.create({
    data: {
      workspaceId: WS, platform: "meta", externalAccountId: ACCT,
      accountName: SEED_TAG, status: "active",
      accessTokenEncrypted: encryptToken(token),
      tokenExpiresAt: new Date(Date.now() + 60 * 60 * 1000),
      scopes: ["ads_read"], connectedById: USER_ID,
    },
  });

  // ── 1. Happy path: echte sync ─────────────────────────────────────────
  console.log("## Sync — run 1 (echte Graph API)\n");
  const r1 = await syncAdInsights();
  console.log(`  result: ${JSON.stringify(r1)}`);
  check("account onderzocht zonder errors", r1.accountsExamined >= 1 && r1.authErrors === 0 && r1.otherErrors === 0, JSON.stringify(r1.errors));
  check("ads gediscovered (verwacht 2 actieve)", r1.adsDiscovered >= 1, `${r1.adsDiscovered}`);
  check("AdCampaign-rijen aangemaakt", r1.campaignsCreated === r1.adsDiscovered, `${r1.campaignsCreated}`);
  check("snapshots geüpserted", r1.snapshotsUpserted >= 1, `${r1.snapshotsUpserted}`);

  const rows = await prisma.adCampaign.findMany({ where: { connectedAccountId: account.id } });
  check("origin='external' + deliverableId null op alle discovered rows",
    rows.length > 0 && rows.every((r) => r.origin === "external" && r.deliverableId === null));
  check("discovery-metadata gevuld (externalName + creativeCreatedAt)",
    rows.every((r) => !!r.externalName && r.creativeCreatedAt !== null));
  const snapCount1 = await prisma.adMetricSnapshot.count({ where: { campaignId: { in: rows.map((r) => r.id) } } });
  const sample = await prisma.adMetricSnapshot.findFirst({
    where: { campaignId: { in: rows.map((r) => r.id) } }, orderBy: { windowStart: "desc" },
  });
  check("snapshot heeft metrics + frequency in raw",
    !!sample && sample.impressions !== null && sample.ctr !== null &&
    typeof (sample.raw as Record<string, unknown>).frequency === "string",
    JSON.stringify({ impr: sample?.impressions, ctr: sample?.ctr }));

  // ── 2. Idempotentie: run 2 ────────────────────────────────────────────
  console.log("\n## Sync — run 2 (idempotentie)\n");
  const r2 = await syncAdInsights();
  check("geen nieuwe AdCampaign-rijen", r2.campaignsCreated === 0, `${r2.campaignsCreated}`);
  const snapCount2 = await prisma.adMetricSnapshot.count({ where: { campaignId: { in: rows.map((r) => r.id) } } });
  check("geen duplicaat-snapshots (unique window-upsert)", snapCount2 === snapCount1, `${snapCount1} → ${snapCount2}`);

  // ── 3. Regressie: status-sync raakt discovered rows niet ─────────────
  console.log("\n## Regressie — bestaande status-sync\n");
  await syncAdCampaignStatus();
  const afterStatusSync = await prisma.adCampaign.findMany({
    where: { connectedAccountId: account.id }, select: { lastStatusSyncAt: true },
  });
  check("origin-guard: lastStatusSyncAt blijft NULL op discovered rows",
    afterStatusSync.every((r) => r.lastStatusSyncAt === null));

  // ── 4. Workspace-isolatie (FK-keten) ──────────────────────────────────
  const crossWs = await prisma.adMetricSnapshot.count({
    where: { campaign: { connectedAccount: { workspaceId: { not: WS } } }, campaignId: { in: rows.map((r) => r.id) } },
  });
  check("workspace-isolatie: snapshots alleen via dit workspace-account", crossWs === 0);

  if (process.env.KEEP_SEED !== "1") await cleanup();
  console.log(`\n=== RESULT: ${pass} pass, ${fail} fail ===`);
  process.exit(fail > 0 ? 1 : 0);
}

main().catch((e) => { console.error(e); process.exit(1); });
