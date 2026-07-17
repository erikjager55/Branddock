// Aanvullende MCP-smoke: de AI-dragende tools via het MCP-protocol.
// score_against_brand = echte F-VAL-run; generate_on_brand met generate:false
// valideert de tool→service-bedrading (de volledige generatie is al 3×
// bewezen via service/chat/REST — identieke plumbing).
//
// Run (server met PUBLIC_API_ENABLED=true op 3005):
//   MCP_SMOKE_KEY=bd_live_… node --env-file-if-exists=.env.local \
//     node_modules/.bin/tsx scripts/dev/mcp-ai-smoke.ts

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';

const BASE = process.env.SMOKE_BASE ?? 'http://localhost:3005';
const KEY = process.env.MCP_SMOKE_KEY;
if (!KEY) {
  console.error('Zet MCP_SMOKE_KEY');
  process.exit(1);
}

function assert(cond: boolean, label: string): void {
  if (cond) {
    console.log(`  PASS — ${label}`);
  } else {
    console.error(`  FAIL — ${label}`);
    process.exitCode = 1;
  }
}

function firstText(result: unknown): string {
  const content = (result as { content?: Array<{ type?: string; text?: string }> }).content;
  const block = content?.find((c) => c.type === 'text');
  return block?.text ?? '';
}

async function main(): Promise<void> {
  const transport = new StreamableHTTPClientTransport(new URL(`${BASE}/api/mcp`), {
    requestInit: { headers: { authorization: `Bearer ${KEY}` } },
  });
  const client = new Client({ name: 'branddock-ai-smoke', version: '1.0.0' });
  await client.connect(transport);
  console.log('Handshake OK\n');

  console.log('1. score_against_brand (echte F-VAL-run via MCP)');
  const sample =
    'Wij helpen ambitieuze merken hun verhaal consistent te vertellen over elk kanaal. ' +
    'Van merkstrategie tot dagelijkse content bouwen we aan herkenbare communicatie. ' +
    'Onze aanpak combineert data met creativiteit zodat elke uiting bijdraagt aan vertrouwen. ' +
    'Zo wordt zichtbaarheid ook geloofwaardigheid en groeit het merk duurzaam.';
  const score = await client.callTool({
    name: 'score_against_brand',
    arguments: { content: sample },
  });
  const scoreText = firstText(score);
  const scoreJson = JSON.parse(scoreText) as { compositeScore?: number; findingsCount?: number };
  assert(typeof scoreJson.compositeScore === 'number', `compositeScore via MCP (${scoreJson.compositeScore})`);

  console.log('\n2. generate_on_brand met generate:false (bedrading tool→service)');
  const gen = await client.callTool({
    name: 'generate_on_brand',
    arguments: {
      contentType: 'linkedin-post',
      title: 'MCP smoke (create-only)',
      brief: { objective: 'MCP-bedradingscheck' },
      generate: false,
    },
  });
  const genJson = JSON.parse(firstText(gen)) as { deliverableId?: string; generated?: boolean };
  assert(typeof genJson.deliverableId === 'string' && genJson.generated === false, `deliverable aangemaakt via MCP (${genJson.deliverableId})`);

  console.log('\n3. Foutpad: onbekend content-type → nette tool-error');
  const bad = await client.callTool({
    name: 'generate_on_brand',
    arguments: { contentType: 'bestaat-niet', brief: { objective: 'x' } },
  });
  assert((bad as { isError?: boolean }).isError === true, 'isError-tool-result i.p.v. crash');

  await client.close();
  console.log('\nKlaar.');
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
