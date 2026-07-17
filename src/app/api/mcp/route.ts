// =============================================================
// /api/mcp — publieke Brand-API Fase B: gehoste MCP-server over
// streamable HTTP (ADR 2026-07-17-public-brand-api).
//
// Stateless per-request patroon (serverless-vriendelijk): elke POST krijgt
// een verse McpServer + WebStandardStreamableHTTPServerTransport
// (sessionIdGenerator: undefined = stateless, enableJsonResponse: true =
// het antwoord is pas klaar als alle tool-responses binnen zijn — geen
// levende SSE-stream die een Vercel-invocation zou overleven). Geen
// sessie-state betekent ook: GET (server→client-notificaties) en DELETE
// (sessie-beëindiging) bestaan hier niet → 405.
//
// Auth: workspace-API-key (Authorization: Bearer bd_live_…). OAuth voor de
// connector-flow van claude.ai/ChatGPT komt in een latere fase via de
// Better Auth MCP-plugin (node_modules/better-auth/dist/plugins/mcp) —
// Branddock wordt dan OAuth-provider naast dit key-pad, zie ADR §Decision 3.
// =============================================================

import { NextResponse } from 'next/server';
import { WebStandardStreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js';
import { isPublicApiEnabled, requireApiKey } from '@/lib/api/public/auth';
import { createPublicMcpServer } from '@/lib/api/public/mcp-server';

// generate_on_brand draait de volledige canvas-pipeline binnen de request —
// zelfde budget als /api/v1/generate.
export const maxDuration = 300;

export async function POST(request: Request) {
  if (!isPublicApiEnabled()) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const auth = await requireApiKey(request);
  if (!auth) return NextResponse.json({ error: 'Invalid or missing API key' }, { status: 401 });

  const server = createPublicMcpServer(auth.workspaceId);
  const transport = new WebStandardStreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
    enableJsonResponse: true,
  });

  try {
    await server.connect(transport);
    return await transport.handleRequest(request);
  } catch (error) {
    console.error('[POST /api/mcp]', error);
    return NextResponse.json(
      { jsonrpc: '2.0', error: { code: -32603, message: 'Internal server error' }, id: null },
      { status: 500 },
    );
  } finally {
    // JSON-mode: de response is volledig gematerialiseerd vóór dit punt —
    // sluiten is veilig en ruimt de per-request server + transport op.
    server.close().catch(() => {});
  }
}

/** Stateless mode kent geen sessies of server-initiated streams — alleen POST. */
function methodNotAllowed(): NextResponse {
  if (!isPublicApiEnabled()) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(
    { jsonrpc: '2.0', error: { code: -32000, message: 'Method not allowed' }, id: null },
    { status: 405, headers: { allow: 'POST' } },
  );
}

export function GET() {
  return methodNotAllowed();
}

export function DELETE() {
  return methodNotAllowed();
}
