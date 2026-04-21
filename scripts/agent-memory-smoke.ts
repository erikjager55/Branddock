/**
 * Agent memory smoke test — stores a handful of memories, then runs a
 * similarity-based recall to verify pgvector + OpenAI embeddings end
 * to end. Reads EMBEDDING / OPENAI env vars from .env.local.
 *
 * Run: npx tsx scripts/agent-memory-smoke.ts
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
    // Later occurrences win; strip inline comments that follow unquoted values.
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
import { storeMemory, recallRelevant, decayOldMemories } from '../src/lib/agents/memory';

async function main() {
  // Pick the first workspace in the DB for the test
  const workspace = await prisma.workspace.findFirst({ select: { id: true, name: true } });
  if (!workspace) throw new Error('No workspace found in DB — run seed first');

  console.log(`→ using workspace: ${workspace.name} (${workspace.id})`);

  // Wipe any prior smoke-test memories
  await prisma.agentMemory.deleteMany({
    where: { workspaceId: workspace.id, source: 'smoke-test' },
  });

  const inputs: Array<{ content: string; type: 'OBSERVATION' | 'PREFERENCE' | 'FACT' | 'DECISION' | 'OUTCOME' }> = [
    { content: 'The user prefers teal as the primary brand color and strongly dislikes pink.', type: 'PREFERENCE' },
    { content: 'Campaign emails are sent on Tuesday mornings around 10:00 local time.', type: 'FACT' },
    { content: 'User tried sending a campaign to a 1000-recipient list and hit the 500 cap.', type: 'OBSERVATION' },
    { content: 'The latest Q3 trend report found that voice-based search grew 40% among Gen Z.', type: 'FACT' },
    { content: 'User decided to focus on LinkedIn over X for B2B campaigns.', type: 'DECISION' },
  ];

  console.log(`→ storing ${inputs.length} memories…`);
  for (const { content, type } of inputs) {
    const id = await storeMemory({
      workspaceId: workspace.id,
      content,
      memoryType: type,
      source: 'smoke-test',
    });
    console.log(`  ✓ ${type.padEnd(12)} ${id} — ${content.slice(0, 60)}…`);
  }

  const queries = [
    'What colors does the user like?',
    'When should I send marketing emails?',
    'Which social platform is best for B2B?',
  ];

  for (const query of queries) {
    console.log(`\n? ${query}`);
    const hits = await recallRelevant({
      workspaceId: workspace.id,
      query,
      limit: 3,
    });
    for (const hit of hits) {
      console.log(
        `  ${hit.score.toFixed(3)}  (sim ${hit.similarity.toFixed(3)})  ${hit.memoryType.padEnd(12)}  ${hit.content.slice(0, 60)}…`,
      );
    }
  }

  const decayedRows = await decayOldMemories({ workspaceId: workspace.id });
  console.log(`\n→ decay sweep updated ${decayedRows} rows`);

  await prisma.$disconnect();
  process.exit(0);
}

main().catch((err) => {
  console.error('✗ smoke test failed');
  console.error(err);
  process.exit(1);
});
