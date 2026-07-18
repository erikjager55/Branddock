// Strategy-UI-metering smoke — bewijs voor de kalibratie (2026-07-18):
// wizard-launch van een chain-blueprint boekt 80cr (zelfde als de API-job),
// QUICK-launch zonder blueprint boekt 0, en de charge is idempotent.
// Vereist een dev-server MET NEXT_PUBLIC_CREDITS_ENABLED=true (de flag die
// isCreditsEnabled() echt leest — kaal CREDITS_ENABLED doet niets):
//   NEXT_PUBLIC_CREDITS_ENABLED=true PORT=3009 npm run dev -- -p 3009
// Draaien (zelfde vlag ook voor de in-process idempotency-stap):
//   NEXT_PUBLIC_CREDITS_ENABLED=true node --env-file-if-exists=.env.local node_modules/.bin/tsx scripts/dev/strategy-ui-metering-smoke.ts

import { prisma } from "../../src/lib/prisma";
import { chargeAfter } from "../../src/lib/billing/credits/meter-generation";
import { CREDIT_COSTS } from "../../src/lib/billing/credits/credit-costs";

const BASE = process.env.SMOKE_BASE ?? "http://localhost:3009";
const ORIGIN = "http://localhost:3000"; // Better Auth origin-check
const EMAIL = process.env.SMOKE_EMAIL ?? "erik@branddock.com";
const PASSWORD = process.env.SMOKE_PASSWORD ?? "Password123!";
const ORG = "demo-org-branddock-001";
const FEATURE = "campaign-strategy-generate";

let pass = 0;
let fail = 0;
function check(name: string, ok: boolean, detail?: string) {
  if (ok) { pass += 1; console.log(`  PASS ${name}`); }
  else { fail += 1; console.log(`  FAIL ${name}${detail ? ` — ${detail}` : ""}`); }
}

async function txCount(): Promise<number> {
  return prisma.creditTransaction.count({ where: { organizationId: ORG, feature: FEATURE } });
}

async function main() {
  console.log("# Strategy-UI-metering smoke\n");

  // ── 0. Sign-in + actieve org ──────────────────────────────────────────
  const signIn = await fetch(`${BASE}/api/auth/sign-in/email`, {
    method: "POST",
    headers: { "content-type": "application/json", origin: ORIGIN },
    body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
  });
  const cookie = signIn.headers.getSetCookie().map((c) => c.split(";")[0]).join("; ");
  check("sign-in", signIn.ok && cookie.length > 0, `${signIn.status}`);
  const setActive = await fetch(`${BASE}/api/auth/organization/set-active`, {
    method: "POST",
    headers: { "content-type": "application/json", origin: ORIGIN, cookie },
    body: JSON.stringify({ organizationId: ORG }),
  });
  check("set-active org", setActive.ok, `${setActive.status}`);

  const before = await txCount();
  const createdCampaigns: string[] = [];

  // ── 1. Launch MET chain-blueprint → 80cr ──────────────────────────────
  const launchA = await fetch(`${BASE}/api/campaigns/wizard/launch`, {
    method: "POST",
    headers: { "content-type": "application/json", origin: ORIGIN, cookie },
    body: JSON.stringify({
      name: "metering-smoke strategic",
      type: "STRATEGIC",
      strategy: { architecture: { journeyPhases: [{ name: "Awareness" }] } },
    }),
  });
  const bodyA = (await launchA.json()) as { campaignId?: string };
  check("blueprint-launch → 201", launchA.status === 201, `${launchA.status}`);
  if (bodyA.campaignId) createdCampaigns.push(bodyA.campaignId);
  const afterA = await txCount();
  check("blueprint-launch boekt precies 1 charge", afterA === before + 1, `${before}→${afterA}`);
  const tx = await prisma.creditTransaction.findFirst({
    where: { organizationId: ORG, feature: FEATURE },
    orderBy: { createdAt: "desc" },
  });
  check(`charge = -${CREDIT_COSTS["long-form"]} credits`, tx?.amount === -CREDIT_COSTS["long-form"], String(tx?.amount));

  // ── 2. QUICK-launch zonder blueprint → 0 ──────────────────────────────
  const launchB = await fetch(`${BASE}/api/campaigns/wizard/launch`, {
    method: "POST",
    headers: { "content-type": "application/json", origin: ORIGIN, cookie },
    body: JSON.stringify({ name: "metering-smoke quick", type: "QUICK" }),
  });
  const bodyB = (await launchB.json()) as { campaignId?: string };
  check("quick-launch → 201", launchB.status === 201, `${launchB.status}`);
  if (bodyB.campaignId) createdCampaigns.push(bodyB.campaignId);
  check("quick-launch boekt niets", (await txCount()) === afterA);

  // ── 3. Idempotency: zelfde key nogmaals → geen tweede boeking ─────────
  if (bodyA.campaignId) {
    await chargeAfter(
      {
        workspaceId: "cmnomsobx009q44msn0gpw7vb",
        action: "long-form",
        feature: FEATURE,
        idempotencyKey: `strategy-charge:launch:${bodyA.campaignId}`,
      },
      { actualCredits: CREDIT_COSTS["long-form"] },
    );
    check("herhaalde charge met zelfde key boekt niet dubbel", (await txCount()) === afterA);
  }

  // ── 4. Cleanup — dev-DB netjes achterlaten ────────────────────────────
  for (const id of createdCampaigns) {
    await prisma.campaign.delete({ where: { id } }).catch(() => undefined);
  }
  const smokeTx = await prisma.creditTransaction.findMany({
    where: { organizationId: ORG, feature: FEATURE },
  });
  const refund = smokeTx.reduce((sum, t) => sum + Math.abs(t.amount), 0);
  await prisma.creditTransaction.deleteMany({ where: { organizationId: ORG, feature: FEATURE } });
  if (refund > 0) {
    await prisma.creditBalance.updateMany({
      where: { organizationId: ORG },
      data: { balance: { increment: refund }, lifetimeSpent: { decrement: refund } },
    });
  }

  console.log(`\n== ${pass} PASS / ${fail} FAIL ==`);
  process.exit(fail > 0 ? 1 : 0);
}

main().catch((e) => { console.error(e); process.exit(1); });
