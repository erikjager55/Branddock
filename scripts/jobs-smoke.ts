/**
 * Agent Job queue smoke test — dispatches a few jobs of different
 * types, runs the runner, and prints the outcome. Verifies the
 * dispatch → claim → handle → complete loop end-to-end.
 *
 * Run: DATABASE_URL=... npx tsx scripts/jobs-smoke.ts
 */

import { readFileSync } from 'fs';
import { resolve } from 'path';

const envPath = resolve(process.cwd(), '.env.local');
try {
  for (const line of readFileSync(envPath, 'utf8').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (!value.startsWith('"') && !value.startsWith("'")) {
      const hashIdx = value.indexOf('#');
      if (hashIdx !== -1) value = value.slice(0, hashIdx).trim();
    }
    if (value) process.env[key] = value;
  }
} catch (err) {
  console.warn(`(could not read ${envPath}: ${(err as Error).message})`);
}

import { prisma } from '../src/lib/prisma';
import { dispatchJob } from '../src/lib/agents/jobs/dispatch';
import { runPendingJobs } from '../src/lib/agents/jobs/runner';

async function main() {
  const workspace = await prisma.workspace.findFirst({ select: { id: true, name: true } });
  if (!workspace) throw new Error('No workspace found — run seed first');

  console.log(`→ workspace: ${workspace.name} (${workspace.id})`);

  // Clean any lingering smoke-test jobs from a previous run.
  await prisma.agentJob.deleteMany({
    where: { triggeredBy: 'smoke-test' },
  });

  // Dispatch three job types.
  const heartbeat = await dispatchJob({
    type: 'HEARTBEAT',
    workspaceId: workspace.id,
    payload: { note: 'smoke test ping' },
    triggeredBy: 'smoke-test',
  });
  console.log(`  ✓ HEARTBEAT    ${heartbeat.id}`);

  const decay = await dispatchJob({
    type: 'MEMORY_DECAY',
    workspaceId: workspace.id,
    triggeredBy: 'smoke-test',
  });
  console.log(`  ✓ MEMORY_DECAY ${decay.id}`);

  const agent = await dispatchJob({
    type: 'AGENT_TASK',
    workspaceId: workspace.id,
    payload: { action: 'noop', reason: 'smoke test' },
    triggeredBy: 'smoke-test',
  });
  console.log(`  ✓ AGENT_TASK   ${agent.id}`);

  // Idempotency test — second dispatch with the same key should dedupe.
  const a = await dispatchJob({
    type: 'HEARTBEAT',
    workspaceId: workspace.id,
    idempotencyKey: 'smoke-dedupe-key',
    triggeredBy: 'smoke-test',
  });
  const b = await dispatchJob({
    type: 'HEARTBEAT',
    workspaceId: workspace.id,
    idempotencyKey: 'smoke-dedupe-key',
    triggeredBy: 'smoke-test',
  });
  console.log(`  ↺ dedupe test  first=${a.id}  second=${b.id}  deduped=${b.deduped}`);

  // Drain the queue.
  console.log('\n→ runPendingJobs()');
  const result = await runPendingJobs({ limit: 50 });
  console.log(`  processed: ${result.processed}`);
  for (const r of result.results) {
    const icon = r.status === 'COMPLETED' ? '✓' : r.status === 'RETRY' ? '↻' : '✗';
    const resultStr = r.result ? ` → ${JSON.stringify(r.result)}` : '';
    const errorStr = r.error ? ` (${r.error})` : '';
    console.log(`  ${icon} ${r.type.padEnd(14)} attempts=${r.attempts}${resultStr}${errorStr}`);
  }

  await prisma.$disconnect();
  process.exit(0);
}

main().catch((err) => {
  console.error('✗ smoke test failed');
  console.error(err);
  process.exit(1);
});
