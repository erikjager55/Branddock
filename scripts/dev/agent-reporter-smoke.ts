/**
 * Reporter-smoke (task agent-reporter) — draait één echte Remi-run en print
 * status/kosten/artefacten + het rapport. Gebruik REMI_WS om een andere
 * workspace te kiezen (default: lokale Better-Brands-workspace).
 *
 * Run: DATABASE_URL=... REMI_WS=<workspaceId> \
 *      node --env-file-if-exists=.env.local node_modules/.bin/tsx \
 *      scripts/dev/agent-reporter-smoke.ts
 */
import { runAgent } from "../../src/lib/agents/registry/run-agent";
import { prisma } from "../../src/lib/prisma";
const WS = process.env.REMI_WS ?? "cmnomsobx009q44msn0gpw7vb";
async function main() {
  const res = await runAgent({
    workspaceId: WS, userId: "demo-user-erik-001", agentId: "reporter", useCaseId: "weekly-report",
    input: { message: "geen extra focus" }, triggerType: "manual",
  });
  console.log(`status=${res.status} cost=$${res.totalCostUsd} latency=${Math.round(res.latencyMs/1000)}s`);
  const artifacts = await prisma.agentArtifact.findMany({ where: { runId: res.runId }, select: { type: true, title: true } });
  console.log("artifacts:", artifacts.map(a => `${a.type}:${a.title}`).join(" | "));
  const report = await prisma.agentArtifact.findFirst({ where: { runId: res.runId, type: "REPORT" } });
  if (report) {
    const body = (report.content as Record<string, unknown>);
    const md = body.markdown ?? body.body ?? body.text ?? JSON.stringify(body);
    console.log("── REPORT (eerste 2200 chars):\n" + String(md).slice(0, 2200));
  }
}
main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
