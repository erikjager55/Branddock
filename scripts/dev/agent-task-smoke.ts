/**
 * AGENT_TASK-brug smoke (agents-scheduling, slice 1).
 *
 * Valideert end-to-end, tegen de echte dev-DB + Anthropic (echo-test =
 * één goedkope text-turn, geen tools):
 *   1. per-workspace cap: een RUNNING AGENT_TASK blokkeert een tweede
 *      claim voor dezelfde workspace → SKIPPED, geen attempt verbrand;
 *   2. de brug: queue → handler → runAgent met triggerType 'scheduled'
 *      en triggerSource 'job:<id>' → COMPLETED job + AgentRun + artefact.
 *
 * Run (vanuit de worktree):
 *   node --env-file-if-exists=.env.local node_modules/.bin/tsx \
 *     scripts/dev/agent-task-smoke.ts
 */

import { dispatchJob } from "../../src/lib/agents/jobs/dispatch";
import { runPendingJobs } from "../../src/lib/agents/jobs/runner";
import { prisma } from "../../src/lib/prisma";

const WORKSPACE_ID = "cmnomsobx009q44msn0gpw7vb"; // Better Brands (dev-DB, zelfde als dogfood)
const USER_ID = "demo-user-erik-001"; // owner erik@branddock.com

function fail(msg: string): never {
  console.error(`❌ ${msg}`);
  process.exit(1);
}

async function main() {
  // Restanten van eerdere (gecrashte) smoke-runs opruimen, anders blokkeert
  // een oude decoy of PENDING smoke-job deze run.
  await prisma.agentJob.deleteMany({
    where: {
      workspaceId: WORKSPACE_ID,
      OR: [
        { payload: { path: ["smoke"], equals: "decoy" } },
        { idempotencyKey: { startsWith: "smoke:agent-task:" }, status: { in: ["PENDING", "RETRY"] } },
      ],
    },
  });

  // Decoy: simuleert een nog-lopende agent-run in deze workspace.
  const decoy = await prisma.agentJob.create({
    data: {
      type: "AGENT_TASK",
      status: "RUNNING",
      workspaceId: WORKSPACE_ID,
      startedAt: new Date(),
      payload: { smoke: "decoy" },
      triggeredBy: "manual",
    },
  });

  const { id: jobId, deduped } = await dispatchJob({
    type: "AGENT_TASK",
    workspaceId: WORKSPACE_ID,
    payload: {
      agentId: "echo-test",
      useCaseId: "echo",
      input: { message: `agent-task-smoke ${new Date().toISOString()}` },
      userId: USER_ID,
    },
    maxAttempts: 2,
    idempotencyKey: `smoke:agent-task:${Date.now()}`,
    triggeredBy: "manual",
  });
  console.log(`→ job dispatched: ${jobId} (deduped=${deduped})`);

  // Tick 1: cap actief → onze job moet SKIPPED zijn, zonder attempt.
  const tick1 = await runPendingJobs({ limit: 10 });
  const r1 = tick1.results.find((r) => r.id === jobId);
  if (r1?.status !== "SKIPPED") fail(`verwacht SKIPPED onder cap, kreeg: ${r1?.status ?? "geen result"}`);
  const jobAfterSkip = await prisma.agentJob.findUniqueOrThrow({ where: { id: jobId } });
  if (jobAfterSkip.status !== "PENDING" || jobAfterSkip.attempts !== 0) {
    fail(`SKIPPED-job hoort onaangeraakt PENDING/0 te zijn, is: ${jobAfterSkip.status}/${jobAfterSkip.attempts}`);
  }
  console.log("✓ per-workspace cap: SKIPPED, job onaangeraakt");

  // Decoy weg → tick 2 draait de echte run (echte Anthropic-call).
  await prisma.agentJob.delete({ where: { id: decoy.id } });
  const tick2 = await runPendingJobs({ limit: 10 });
  const r2 = tick2.results.find((r) => r.id === jobId);
  if (r2?.status !== "COMPLETED") fail(`verwacht COMPLETED, kreeg: ${r2?.status} (${r2?.error ?? "-"})`);
  const runId = (r2.result as { runId?: string } | undefined)?.runId;
  if (!runId) fail("job-result mist runId");

  // Finalize-MINOR: assert óók de AgentJob-DB-rij (niet alleen het
  // in-memory runner-result) — de terminale write is een aparte updateMany
  // met eigen-claim-guard en kan stil niets matchen.
  const jobRow = await prisma.agentJob.findUniqueOrThrow({ where: { id: jobId } });
  if (jobRow.status !== "COMPLETED") fail(`job-DB-rij hoort COMPLETED te zijn, is: ${jobRow.status}`);
  if (jobRow.errorMessage !== null) fail(`job-DB-rij hoort geen errorMessage te hebben: ${jobRow.errorMessage}`);
  if ((jobRow.result as { runId?: string } | null)?.runId !== runId) fail("job-DB-rij result.runId matcht de run niet");
  console.log("✓ job-DB-rij: COMPLETED + result.runId consistent");

  const run = await prisma.agentRun.findUniqueOrThrow({
    where: { id: runId },
    include: { artifacts: true },
  });
  if (run.triggerType !== "scheduled") fail(`triggerType hoort 'scheduled' te zijn, is: ${run.triggerType}`);
  if (run.triggerSource !== `job:${jobId}`) fail(`triggerSource hoort 'job:${jobId}' te zijn, is: ${run.triggerSource}`);
  if (run.status !== "COMPLETED") fail(`run-status hoort COMPLETED te zijn, is: ${run.status}`);
  if (run.artifacts.length === 0) fail("run heeft geen artefacten");
  console.log(
    `✓ brug: run ${runId} COMPLETED — triggerType=${run.triggerType}, triggerSource=${run.triggerSource}, ` +
      `artefacten=${run.artifacts.length}, kosten=$${run.totalCostUsd}`,
  );

  console.log("✅ agent-task-smoke geslaagd");
}

main()
  .catch((err) => {
    console.error("❌ smoke crashte:", err instanceof Error ? err.message : err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
