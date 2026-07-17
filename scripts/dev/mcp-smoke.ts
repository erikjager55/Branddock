// Smoke-harnas voor de publieke Brand-API Fase B — MCP-server (ADR 2026-07-17).
//
// Run (server moet draaien mét PUBLIC_API_ENABLED=true):
//   MCP_SMOKE_KEY=bd_live_… node --env-file-if-exists=.env.local \
//     node_modules/.bin/tsx scripts/dev/mcp-smoke.ts
// Env: MCP_SMOKE_KEY (verplicht — maak een key via POST /api/workspace/api-keys,
//        zie scripts/dev/public-api-smoke.ts voor de sessie-flow)
//      SMOKE_BASE (default http://localhost:3005)
//
// Dekt: initialize-handshake via de officiële MCP-client, tools/list
// (verwacht 8 tools), get_brand_context en list_personas. Bewust géén
// score/generate — dat zijn echte AI-runs die de hoofdsessie apart smoked.

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';

const BASE = process.env.SMOKE_BASE ?? 'http://localhost:3005';

const EXPECTED_TOOLS = [
  'get_brand_context',
  'score_against_brand',
  'generate_on_brand',
  'list_personas',
  'list_products',
  'list_competitors',
  'search_knowledge',
  'rewrite_on_brand',
];

function assert(cond: boolean, label: string): void {
  if (cond) {
    console.log(`  PASS — ${label}`);
  } else {
    console.error(`  FAIL — ${label}`);
    process.exitCode = 1;
  }
}

/** Eerste text-content uit een CallToolResult — via unknown-narrowing, los van de SDK-union-types. */
function firstText(result: unknown): string {
  if (!result || typeof result !== 'object' || !('content' in result)) return '';
  const content = (result as { content?: unknown }).content;
  if (!Array.isArray(content)) return '';
  for (const item of content) {
    if (item && typeof item === 'object' && (item as { type?: unknown }).type === 'text') {
      const text = (item as { text?: unknown }).text;
      if (typeof text === 'string') return text;
    }
  }
  return '';
}

function isToolError(result: unknown): boolean {
  return (
    !!result && typeof result === 'object' && (result as { isError?: unknown }).isError === true
  );
}

function compact(text: string, max = 400): string {
  const oneLine = text.replace(/\s+/g, ' ').trim();
  return oneLine.length > max ? `${oneLine.slice(0, max)}…` : oneLine;
}

async function main(): Promise<void> {
  const key = process.env.MCP_SMOKE_KEY;
  if (!key) {
    throw new Error('MCP_SMOKE_KEY ontbreekt — maak een workspace-API-key aan en exporteer die.');
  }

  // ── 1. Handshake ──────────────────────────────────────────────────────────
  console.log('1. Initialize-handshake');
  const client = new Client({ name: 'branddock-mcp-smoke', version: '1.0.0' });
  const transport = new StreamableHTTPClientTransport(new URL(`${BASE}/api/mcp`), {
    requestInit: { headers: { authorization: `Bearer ${key}` } },
  });
  await client.connect(transport);
  const serverInfo = client.getServerVersion();
  assert(
    serverInfo?.name === 'branddock-brand-api',
    `server-info ontvangen (${serverInfo?.name ?? '?'} v${serverInfo?.version ?? '?'})`,
  );

  // ── 2. tools/list ─────────────────────────────────────────────────────────
  console.log('\n2. tools/list');
  const { tools } = await client.listTools();
  const names = tools.map((t) => t.name).sort();
  assert(tools.length === 8, `8 tools geregistreerd (${tools.length})`);
  assert(
    EXPECTED_TOOLS.every((t) => names.includes(t)),
    `alle verwachte tools aanwezig: ${names.join(', ')}`,
  );

  // ── 3. get_brand_context ──────────────────────────────────────────────────
  console.log('\n3. get_brand_context');
  const ctx = await client.callTool({ name: 'get_brand_context', arguments: {} });
  const ctxText = firstText(ctx);
  assert(!isToolError(ctx) && ctxText.length > 0, `context-tekst gevuld (${ctxText.length} tekens)`);
  console.log(`  → ${compact(ctxText)}`);

  // ── 4. list_personas ──────────────────────────────────────────────────────
  console.log('\n4. list_personas');
  const personasRes = await client.callTool({ name: 'list_personas', arguments: {} });
  const personasText = firstText(personasRes);
  const personas = JSON.parse(personasText || '{}') as {
    count?: number;
    items?: Array<{ id?: string; name?: string }>;
  };
  assert(
    !isToolError(personasRes) && typeof personas.count === 'number' && Array.isArray(personas.items),
    `personas-lijst ontvangen (count=${String(personas.count)})`,
  );
  console.log(
    `  → ${personas.items?.map((p) => p.name).join(', ') || '(geen personas in deze workspace)'}`,
  );

  await client.close();
  console.log('\nKlaar.');
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
