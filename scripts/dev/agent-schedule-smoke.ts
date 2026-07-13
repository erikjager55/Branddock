/**
 * Schedule-mechaniek smoke (agents-scheduling, slice 2) — tegen de echte
 * dev-DB. Valideert de engine-laag van task-smoke-stappen 1-3:
 *   1. due-schedule → enqueue (idempotencyKey per due-slot) + nextRunAt-claim;
 *   2. tweede enqueue-pass = no-op (claim werkt);
 *   3. queue-run → AgentRun met scheduleId + triggerSource 'schedule:<id>';
 *   4. disabled schedule → handler skipt (geen orphan-run);
 *   5. één echte content-creator-run: propose-only blijft gelden onder
 *      een scheduled identity → AWAITING_CONFIRMATION + PROPOSAL-artefact.
 *
 * Run (vanuit de worktree):
 *   node --env-file-if-exists=.env.local node_modules/.bin/tsx \
 *     scripts/dev/agent-schedule-smoke.ts
 */

import { prisma } from "../../src/lib/prisma";
import { enqueueDueSchedules } from "../../src/lib/agents/schedules/enqueue";
import { runPendingJobs } from "../../src/lib/agents/jobs/runner";

const WORKSPACE_ID = "cmnomsobx009q44msn0gpw7vb"; // Better Brands (dev-DB)
const USER_ID = "demo-user-erik-001"; // owner erik@branddock.com

function fail(msg: string): never {
  console.error(`❌ ${msg}`);
  process.exit(1);
}

async function cleanup() {
  const old = await prisma.agentSchedule.findMany({
    where: { workspaceId: WORKSPACE_ID, input: { path: ["message"], string_starts_with: "schedule-smoke" } },
    select: { id: true },
  });
  for (const s of old) {
    await prisma.agentJob.deleteMany({ where: { idempotencyKey: { startsWith: `agent-schedule:${s.id}:` } } });
  }
  await prisma.agentSchedule.deleteMany({ where: { id: { in: old.map((s) => s.id) } } });
}

async function main() {
  await cleanup();

  // ── 1+2: enqueue + claim ──────────────────────────────────────────────
  const schedule = await prisma.agentSchedule.create({
    data: {
      workspaceId: WORKSPACE_ID,
      agentId: "echo-test",
      useCaseId: "echo",
      input: { message: `schedule-smoke ${new Date().toISOString()}` },
      cadence: "EVERY_MINUTE",
      nextRunAt: new Date(Date.now() - 1000),
      createdByUserId: USER_ID,
    },
  });
  const dueSlot = schedule.nextRunAt.toISOString();

  const pass1 = await enqueueDueSchedules();
  if (pass1.enqueued !== 1) fail(`pass 1: verwacht 1 enqueued, kreeg ${pass1.enqueued}`);
  const job = await prisma.agentJob.findUnique({
    where: { idempotencyKey: `agent-schedule:${schedule.id}:${dueSlot}` },
  });
  if (!job) fail("job met due-slot-idempotencyKey ontbreekt");
  const claimed = await prisma.agentSchedule.findUniqueOrThrow({ where: { id: schedule.id } });
  if (claimed.nextRunAt.getTime() <= schedule.nextRunAt.getTime()) fail("nextRunAt niet opgeschoven");
  if (!claimed.lastRunAt) fail("lastRunAt niet gezet");
  console.log("✓ enqueue: job + idempotencyKey + nextRunAt-claim");

  const pass2 = await enqueueDueSchedules();
  if (pass2.enqueued !== 0) fail(`pass 2: verwacht 0 enqueued (claim), kreeg ${pass2.enqueued}`);
  console.log("✓ tweede pass: no-op (claim houdt)");

  // ── 3: queue-run → AgentRun met schedule-herkomst ─────────────────────
  const tick = await runPendingJobs({ limit: 10 });
  const jobResult = tick.results.find((r) => r.id === job.id);
  if (jobResult?.status !== "COMPLETED") {
    fail(`job hoort COMPLETED te zijn, is: ${jobResult?.status} (${jobResult?.error ?? "-"})`);
  }
  const runId = (jobResult.result as { runId?: string } | undefined)?.runId;
  if (!runId) fail("job-result mist runId");
  const run = await prisma.agentRun.findUniqueOrThrow({ where: { id: runId } });
  if (run.scheduleId !== schedule.id) fail(`run.scheduleId hoort ${schedule.id} te zijn, is ${run.scheduleId}`);
  if (run.triggerSource !== `schedule:${schedule.id}`) fail(`triggerSource klopt niet: ${run.triggerSource}`);
  if (run.userId !== USER_ID) fail(`run.userId hoort de schedule-creator te zijn, is ${run.userId}`);
  console.log(`✓ run ${runId}: scheduleId + triggerSource + acting identity kloppen`);

  // ── 4: disabled schedule → handler skipt ──────────────────────────────
  await prisma.agentSchedule.update({
    where: { id: schedule.id },
    data: { enabled: true, nextRunAt: new Date(Date.now() - 1000) },
  });
  await enqueueDueSchedules();
  await prisma.agentSchedule.update({ where: { id: schedule.id }, data: { enabled: false } });
  const tick2 = await runPendingJobs({ limit: 10 });
  const skipResult = tick2.results.find(
    (r) => (r.result as { skipped?: string } | undefined)?.skipped === "schedule-removed-or-disabled",
  );
  if (!skipResult) fail("disabled schedule: handler-skip niet gevonden");
  console.log("✓ disabled schedule: job skipt zonder run (geen orphan)");

  // ── 5: propose-only onder scheduled identity (echte AI-run) ───────────
  const ccSchedule = await prisma.agentSchedule.create({
    data: {
      workspaceId: WORKSPACE_ID,
      agentId: "content-creator",
      useCaseId: "create-content",
      input: {
        message:
          "schedule-smoke: schrijf een korte LinkedIn-post over het belang van merkconsistentie.",
      },
      cadence: "EVERY_MINUTE",
      nextRunAt: new Date(Date.now() - 1000),
      createdByUserId: USER_ID,
    },
  });
  const pass3 = await enqueueDueSchedules();
  if (pass3.enqueued !== 1) fail(`content-creator: verwacht 1 enqueued, kreeg ${pass3.enqueued}`);
  console.log("→ content-creator scheduled run gestart (echte AI-call, kan ~1 min duren)...");
  const tick3 = await runPendingJobs({ limit: 10 });
  const ccResult = tick3.results.find((r) => r.type === "AGENT_TASK" && r.status !== "SKIPPED");
  const ccRunId = (ccResult?.result as { runId?: string; status?: string } | undefined)?.runId;
  if (!ccRunId) fail(`content-creator run niet gevonden (${ccResult?.status}: ${ccResult?.error ?? "-"})`);
  const ccRun = await prisma.agentRun.findUniqueOrThrow({
    where: { id: ccRunId },
    include: { artifacts: true },
  });
  if (ccRun.status !== "AWAITING_CONFIRMATION") {
    fail(`content-creator run hoort AWAITING_CONFIRMATION te zijn, is: ${ccRun.status} (${ccRun.error ?? "-"})`);
  }
  if (!ccRun.artifacts.some((a) => a.type === "PROPOSAL")) fail("geen PROPOSAL-artefact");
  console.log(
    `✓ propose-only onder scheduled identity: run ${ccRunId} AWAITING_CONFIRMATION met PROPOSAL (kosten=$${ccRun.totalCostUsd})`,
  );

  // ── cleanup ───────────────────────────────────────────────────────────
  await prisma.agentJob.deleteMany({
    where: {
      OR: [
        { idempotencyKey: { startsWith: `agent-schedule:${schedule.id}:` } },
        { idempotencyKey: { startsWith: `agent-schedule:${ccSchedule.id}:` } },
      ],
    },
  });
  await prisma.agentSchedule.deleteMany({ where: { id: { in: [schedule.id, ccSchedule.id] } } });
  console.log("✅ agent-schedule-smoke geslaagd (runs blijven staan in de inbox voor visuele check)");
}

main()
  .catch((err) => {
    console.error("❌ smoke crashte:", err instanceof Error ? err.message : err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
