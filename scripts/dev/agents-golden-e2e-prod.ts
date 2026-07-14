/**
 * Golden e2e (agents-scheduling smoke-stap 6) — tegen PRODUCTIE (Neon).
 *
 * Bewijst de live Fase-2-keten: een DAILY-schedule op de Better Brands-
 * workspace wordt door de prod-cron opgepakt → AGENT_TASK-job → runAgent →
 * AgentRun (COMPLETED) + notificatie, en de schedule z'n nextRunAt schuift op.
 * Vervult tegelijk de oude Phase-C BB-pilot-smoke.
 *
 * Werkwijze: seed een schedule met nextRunAt NÉT in het verleden (due), en
 * poll dan tot de prod-cron (elke minuut) hem heeft gedraaid. Het script
 * MUTEERT prod niet verder dan die ene schedule + de run die eruit volgt; de
 * schedule wordt aan het eind opgeruimd (de run blijft als bewijs in de inbox,
 * scheduleId → NULL via SetNull).
 *
 * Draaien (vanuit de worktree, met de prod-Neon-URL):
 *   DATABASE_URL="<neon-prod>" AGENTS_GOLDEN_CONFIRM=1 \
 *     npx tsx scripts/dev/agents-golden-e2e-prod.ts
 *
 * De AGENTS_GOLDEN_CONFIRM=1-gate voorkomt een per-ongeluk-run tegen prod.
 */

// De project-singleton gebruikt de pg-adapter (@prisma/adapter-pg) en leest
// DATABASE_URL bij import (die zetten we in het run-commando).
import { prisma } from "../../src/lib/prisma";

const AGENT_ID = "market-analyst"; // non-billable analyse-agent → COMPLETED (dogfood-bewezen), geen credit-charge
const USE_CASE_ID = "competitive-analysis";
const MESSAGE = "Golden e2e: korte concurrentie-scan voor de scheduled-run-validatie.";
const POLL_MS = 15_000;
const POLL_MAX_MIN = 6;

function log(msg: string) {
  console.log(`${new Date().toISOString().slice(11, 19)}  ${msg}`);
}
function fail(msg: string): never {
  console.error(`❌ ${msg}`);
  process.exit(1);
}

async function main() {
  if (process.env.AGENTS_GOLDEN_CONFIRM !== "1") {
    fail("Zet AGENTS_GOLDEN_CONFIRM=1 om deze prod-run te bevestigen.");
  }
  if (!/neon\.tech/.test(process.env.DATABASE_URL ?? "")) {
    fail("DATABASE_URL wijst niet naar Neon-prod — stop (verwacht een neon.tech-URL).");
  }
  try {
    // ── Pilot-workspace (Better Brands draait op erik@betterbrands.nl's
    // bestaande prod-workspace) + de owner als acting identity ─────────────
    const PILOT_OWNER_EMAIL = "erik@betterbrands.nl";
    const owner = await prisma.user.findFirst({
      where: { email: PILOT_OWNER_EMAIL },
      select: { id: true, email: true },
    });
    if (!owner) fail(`pilot-owner ${PILOT_OWNER_EMAIL} niet gevonden op prod.`);
    const ownerMember = await prisma.organizationMember.findFirst({
      where: { userId: owner.id, isActive: true, role: { in: ["owner", "admin"] } },
      select: { organizationId: true, role: true },
    });
    if (!ownerMember) fail("pilot-owner is geen actieve owner/admin.");
    const ws = await prisma.workspace.findFirst({
      where: { organizationId: ownerMember.organizationId },
      select: { id: true, name: true, organizationId: true },
    });
    if (!ws) fail("pilot-workspace niet gevonden.");
    log(`workspace: ${ws.name} (${ws.id})`);
    const member = { userId: owner.id, role: ownerMember.role, user: { email: owner.email } };
    log(`acting identity: ${member.user.email} (${member.role})`);

    // ── Seed een DUE DAILY-schedule (nextRunAt net in het verleden) ────────
    const now = new Date();
    const schedule = await prisma.agentSchedule.create({
      data: {
        workspaceId: ws.id,
        agentId: AGENT_ID,
        useCaseId: USE_CASE_ID,
        input: { message: MESSAGE },
        cadence: "DAILY",
        timeOfDay: "08:00",
        timezone: "Europe/Amsterdam",
        enabled: true,
        nextRunAt: new Date(now.getTime() - 60_000), // due
        createdByUserId: member.userId,
      },
      select: { id: true, nextRunAt: true },
    });
    log(`schedule geseed: ${schedule.id} (nextRunAt ${schedule.nextRunAt.toISOString()}, DUE)`);
    log(`→ wacht op de prod-cron (elke minuut): enqueue → AGENT_TASK → runAgent...`);

    // ── Poll tot de run er is ──────────────────────────────────────────────
    const deadline = now.getTime() + POLL_MAX_MIN * 60_000;
    let run: { id: string; status: string; totalCostUsd: unknown } | null = null;
    while (Date.now() < deadline) {
      await new Promise((r) => setTimeout(r, POLL_MS));
      const found = await prisma.agentRun.findFirst({
        where: { scheduleId: schedule.id },
        orderBy: { createdAt: "desc" },
        select: { id: true, status: true, totalCostUsd: true },
      });
      const job = await prisma.agentJob.findFirst({
        where: { idempotencyKey: { startsWith: `agent-schedule:${schedule.id}:` } },
        select: { status: true },
      });
      log(`  poll — job=${job?.status ?? "—"} run=${found?.status ?? "—"}`);
      if (found && ["COMPLETED", "AWAITING_CONFIRMATION", "FAILED"].includes(found.status)) {
        run = found;
        break;
      }
    }
    if (!run) fail(`geen terminale run binnen ${POLL_MAX_MIN} min — check de cron/logs.`);
    if (run.status === "FAILED") fail(`run FAILED (${run.id}) — check de prod-logs.`);
    log(`✓ run ${run.id} → ${run.status} (kosten $${run.totalCostUsd})`);

    // ── Verificaties: scheduleId gestempeld, nextRunAt opgeschoven, notificatie ──
    const artifacts = await prisma.agentArtifact.count({ where: { runId: run.id } });
    if (artifacts === 0) fail("run heeft geen artefacten.");
    log(`✓ artefacten: ${artifacts}`);

    const after = await prisma.agentSchedule.findUniqueOrThrow({
      where: { id: schedule.id },
      select: { nextRunAt: true, lastRunAt: true },
    });
    if (after.nextRunAt.getTime() <= schedule.nextRunAt.getTime()) fail("nextRunAt niet opgeschoven.");
    if (!after.lastRunAt) fail("lastRunAt niet gezet.");
    log(`✓ nextRunAt opgeschoven → ${after.nextRunAt.toISOString()} (≈ morgen 08:00)`);

    const notif = await prisma.notification.findFirst({
      where: { workspaceId: ws.id, actionUrl: `agents-inbox?run=${run.id}` },
      select: { type: true, userId: true },
    });
    if (!notif) fail("geen run-notificatie aangemaakt.");
    log(`✓ notificatie: ${notif.type} → user ${notif.userId}`);

    // ── Cleanup: schedule weg (run blijft als bewijs, scheduleId → NULL) ───
    await prisma.agentSchedule.delete({ where: { id: schedule.id } });
    await prisma.agentJob.deleteMany({
      where: { idempotencyKey: { startsWith: `agent-schedule:${schedule.id}:` } },
    });
    log(`✓ cleanup: test-schedule + due-slot-job verwijderd (run ${run.id} blijft in de BB-inbox)`);

    console.log(`\n✅ GOLDEN E2E GESLAAGD — de live Fase-2-keten draait op productie.`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error("❌ golden-e2e crashte:", err instanceof Error ? err.message : err);
  process.exit(1);
});
