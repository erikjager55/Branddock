// Verify Opus 4.7 + thinking via PRODUCTION code-path (createStructuredCompletion).
// Quick smoke: triggert dezelfde createStructuredCompletion zoals canvas-orchestrator
// gebruikt om te bevestigen dat F27 ai-caller.ts wijziging Opus 4.7 daadwerkelijk
// callbaar maakt (geen 400 error meer).

import { config as loadEnv } from 'dotenv';
import { resolve } from 'node:path';

loadEnv({ path: resolve(process.cwd(), '.env.local') });
if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = 'postgresql://erikjager:@localhost:5432/branddock';
}

import { createStructuredCompletion } from '../../src/lib/ai/exploration/ai-caller';

interface TestResponse {
  greeting: string;
  brandName: string;
}

async function main() {
  console.log('=== Verify Opus 4.7 via production createStructuredCompletion ===\n');
  const t0 = Date.now();
  try {
    const result = await createStructuredCompletion<TestResponse>(
      'anthropic',
      'claude-opus-4-7',
      'Je bent een vriendelijke assistent. Output alleen JSON.',
      'Geef een korte begroeting van het merk Napking. Return JSON: { "greeting": "...", "brandName": "Napking" }',
      {
        maxTokens: 4096,
        thinking: { anthropic: { budgetTokens: 4000 } },
      },
    );
    const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
    console.log(`SUCCESS (${elapsed}s)`);
    console.log('Response:', JSON.stringify(result, null, 2));
  } catch (err) {
    const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
    console.error(`FAILED (${elapsed}s)`);
    console.error('Error:', err instanceof Error ? err.message : err);
    process.exit(1);
  }
}

main();
