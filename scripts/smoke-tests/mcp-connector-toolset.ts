/**
 * Smoke-test voor de toolset van de publieke MCP-server per auth-vorm.
 *
 * Achtergrond: `import_brand_data` is de enige tool die bestaand merk-DNA
 * overschrijft. Over de OAuth-connector (claude.ai/ChatGPT) is de aanroeper
 * doorgaans zélf eigenaar van zijn workspace, dus een rol-check beschermt daar
 * niemand — de tool hoort daar niet zichtbaar te zijn. Met een API-key blijft
 * hij bestaan (bewuste, per-merk vergrendelde handeling).
 *
 * Dekt:
 *   1. OAuth-context → 17 tools, zónder import_brand_data
 *   2. API-key-context → 18 tools, mét import_brand_data
 *   3. De 17 gedeelde tools zijn in beide identiek (geen andere drift)
 *
 * Draait volledig in-memory: de tools worden alleen geregistreerd, nooit
 * aangeroepen — geen DB, geen AI-calls, geen netwerk.
 *
 * Run: npx tsx scripts/smoke-tests/mcp-connector-toolset.ts
 */
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { createPublicMcpServer, type PublicMcpContext } from '../../src/lib/api/public/mcp-server';

let pass = 0;
let fail = 0;

function assert(name: string, cond: boolean, detail?: string): void {
  if (cond) {
    console.log(`  PASS ${name}`);
    pass++;
  } else {
    console.error(`  FAIL ${name}${detail ? ` -- ${detail}` : ''}`);
    fail++;
  }
}

/** Start een in-memory server voor deze context en vraag de tool-namen op. */
async function toolNamesFor(ctx: PublicMcpContext): Promise<string[]> {
  const server = createPublicMcpServer(ctx);
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  const client = new Client({ name: 'smoke', version: '1.0.0' });

  await Promise.all([server.connect(serverTransport), client.connect(clientTransport)]);
  try {
    const { tools } = await client.listTools();
    return tools.map((t) => t.name).sort();
  } finally {
    await client.close();
    await server.close();
  }
}

const OAUTH_CTX: PublicMcpContext = {
  workspaceId: 'ws_smoke',
  authVia: 'oauth',
  userId: 'user_smoke',
};

const API_KEY_CTX: PublicMcpContext = {
  workspaceId: 'ws_smoke',
  authVia: 'api_key',
};

const IMPORT_TOOL = 'import_brand_data';

async function main(): Promise<void> {
  console.log('\nMCP connector-toolset smoke\n');

  const oauthTools = await toolNamesFor(OAUTH_CTX);
  const keyTools = await toolNamesFor(API_KEY_CTX);

  console.log('1. OAuth-connector (claude.ai/ChatGPT)');
  assert(
    `${IMPORT_TOOL} niet aanwezig`,
    !oauthTools.includes(IMPORT_TOOL),
    `tools: ${oauthTools.join(', ')}`,
  );
  assert('17 tools', oauthTools.length === 17, `gevonden: ${oauthTools.length}`);

  console.log('\n2. API-key (bd_live_…)');
  assert(`${IMPORT_TOOL} wél aanwezig`, keyTools.includes(IMPORT_TOOL));
  assert('18 tools', keyTools.length === 18, `gevonden: ${keyTools.length}`);

  console.log('\n3. Geen overige drift tussen de twee');
  const keyWithoutImport = keyTools.filter((t) => t !== IMPORT_TOOL);
  const onlyDifference = JSON.stringify(keyWithoutImport) === JSON.stringify(oauthTools);
  assert(
    `enige verschil is ${IMPORT_TOOL}`,
    onlyDifference,
    `oauth=${oauthTools.length} key-minus-import=${keyWithoutImport.length}`,
  );

  console.log(`\n${pass} passed, ${fail} failed\n`);
  if (fail > 0) process.exit(1);
}

main().catch((err) => {
  console.error('Smoke crashte:', err);
  process.exit(1);
});
