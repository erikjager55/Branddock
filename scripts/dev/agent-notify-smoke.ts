/**
 * Run-notificatie smoke (agents-scheduling, slice 3) — tegen de dev-DB.
 * Twee modi (de Anthropic-client is een lazy singleton, dus een kapotte
 * key moet vanaf proces-start gelden — in-process saboteren werkt niet):
 *
 *   default — happy path: scheduled echo-run → precies één
 *     AGENT_RUN_COMPLETED-notificatie voor de run-owner, met
 *     actionUrl 'agents-inbox?run=<id>'.
 *   SMOKE_MODE=fail — fail-gate (draai met ANTHROPIC_API_KEY=ongeldig!):
 *     attempt 1 (RETRY) geeft GÉÉN notificatie; attempt 2 (FAILED,
 *     laatste) precies één — de notifyOnFailure=isFinalAttempt-gate.
 *
 * Run:
 *   node --env-file-if-exists=.env.local node_modules/.bin/tsx scripts/dev/agent-notify-smoke.ts
 *   ANTHROPIC_API_KEY=sk-ant-invalid SMOKE_MODE=fail \
 *     node --env-file-if-exists=.env.local node_modules/.bin/tsx scripts/dev/agent-notify-smoke.ts
 */

import { dispatchJob } from "../../src/lib/agents/jobs/dispatch";
import { runPendingJobs } from "../../src/lib/agents/jobs/runner";
import { prisma } from "../../src/lib/prisma";

const WORKSPACE_ID = "cmnomsobx009q44msn0gpw7vb"; // Better Brands (dev-DB)
const USER_ID = "demo-user-erik-001";

function fail(msg: string): never {
  console.error(`❌ ${msg}`);
  process.exit(1);
}

/** De notify wordt door run-agent ge-await, maar poll defensief — de smoke
 * mag niet flaken op een toekomstige her-ordening van de notify-call. */
async function countNotifications(type: string, runId: string): Promise<number> {
  for (let i = 0; i < 10; i++) {
    const count = await prisma.notification.count({
      where: {
        workspaceId: WORKSPACE_ID,
        type: type as never,
        actionUrl: `agents-inbox?run=${runId}`,
      },
    });
    if (count > 0) return count;
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  return 0;
}

async function main() {
  if (process.env.SMOKE_MODE === "fail") {
    await failGateCase();
    return;
  }
  await happyPathCase();
}

async function happyPathCase() {
  // ── 1: happy path ──────────────────────────────────────────────────────
  const { id: okJobId } = await dispatchJob({
    type: "AGENT_TASK",
    workspaceId: WORKSPACE_ID,
    payload: {
      agentId: "echo-test",
      useCaseId: "echo",
      input: { message: `notify-smoke ${new Date().toISOString()}` },
      userId: USER_ID,
    },
    maxAttempts: 2,
    idempotencyKey: `smoke:notify-ok:${Date.now()}`,
  });
  const tick1 = await runPendingJobs({ limit: 5 });
  const okResult = tick1.results.find((r) => r.id === okJobId);
  if (okResult?.status !== "COMPLETED") fail(`happy path: job ${okResult?.status} (${okResult?.error ?? "-"})`);
  const okRunId = (okResult.result as { runId?: string }).runId;
  if (!okRunId) fail("happy path: geen runId");
  const completedCount = await countNotifications("AGENT_RUN_COMPLETED", okRunId);
  if (completedCount !== 1) fail(`verwacht 1 AGENT_RUN_COMPLETED-notificatie, kreeg ${completedCount}`);
  const notif = await prisma.notification.findFirst({
    where: { actionUrl: `agents-inbox?run=${okRunId}` },
  });
  if (notif?.userId !== USER_ID) fail(`notificatie-ontvanger hoort ${USER_ID} te zijn, is ${notif?.userId}`);
  console.log(`✓ happy path: 1 COMPLETED-notificatie voor de run-owner (actionUrl=${notif.actionUrl})`);
  console.log("✅ agent-notify-smoke (happy) geslaagd");
}

// ── fail-gate: één notificatie per job, niet per attempt ────────────────
async function failGateCase() {
  if (!process.env.ANTHROPIC_API_KEY?.includes("invalid")) {
    fail("SMOKE_MODE=fail vereist een bewust ongeldige ANTHROPIC_API_KEY (zie header)");
  }
  {
    const { id: failJobId } = await dispatchJob({
      type: "AGENT_TASK",
      workspaceId: WORKSPACE_ID,
      payload: {
        agentId: "echo-test",
        useCaseId: "echo",
        input: { message: "notify-smoke fail-case" },
        userId: USER_ID,
      },
      maxAttempts: 2,
      idempotencyKey: `smoke:notify-fail:${Date.now()}`,
    });

    const failTick1 = await runPendingJobs({ limit: 5 });
    const attempt1 = failTick1.results.find((r) => r.id === failJobId);
    if (attempt1?.status !== "RETRY") fail(`attempt 1 hoort RETRY te zijn, is ${attempt1?.status}`);
    const run1 = await prisma.agentRun.findFirst({
      where: { workspaceId: WORKSPACE_ID, triggerSource: `job:${failJobId}` },
      orderBy: { createdAt: "desc" },
    });
    if (!run1 || run1.status !== "FAILED") fail("attempt 1: FAILED-run-rij ontbreekt");
    // Korte wachttijd: een (foutieve) notificatie zou fire-and-forget zijn.
    await new Promise((resolve) => setTimeout(resolve, 2000));
    const afterAttempt1 = await prisma.notification.count({
      where: { workspaceId: WORKSPACE_ID, type: "AGENT_RUN_FAILED", actionUrl: `agents-inbox?run=${run1.id}` },
    });
    if (afterAttempt1 !== 0) fail(`attempt 1 hoort stil te zijn, kreeg ${afterAttempt1} notificatie(s)`);
    console.log("✓ attempt 1 (RETRY): geen notificatie");

    await prisma.agentJob.update({ where: { id: failJobId }, data: { nextAttemptAt: new Date() } });
    const failTick2 = await runPendingJobs({ limit: 5 });
    const attempt2 = failTick2.results.find((r) => r.id === failJobId);
    if (attempt2?.status !== "FAILED") fail(`attempt 2 hoort FAILED te zijn, is ${attempt2?.status}`);
    const run2 = await prisma.agentRun.findFirst({
      where: { workspaceId: WORKSPACE_ID, triggerSource: `job:${failJobId}`, id: { not: run1.id } },
      orderBy: { createdAt: "desc" },
    });
    if (!run2) fail("attempt 2: run-rij ontbreekt");
    const failedCount = await countNotifications("AGENT_RUN_FAILED", run2.id);
    if (failedCount !== 1) fail(`attempt 2: verwacht precies 1 FAILED-notificatie, kreeg ${failedCount}`);
    console.log("✓ attempt 2 (laatste): precies één FAILED-notificatie");
  }
  console.log("✅ agent-notify-smoke (fail-gate) geslaagd");
}

main()
  .catch((err) => {
    console.error("❌ smoke crashte:", err instanceof Error ? err.message : err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
