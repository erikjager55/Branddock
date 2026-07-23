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
// Duale auth (OAuth-connect-fase):
//  1. workspace-API-key (Authorization: Bearer bd_live_…) — het bestaande pad;
//  2. anders een OAuth-Bearer-token uit de connector-flow (claude.ai/ChatGPT
//     via de Better Auth mcp-plugin) — het default-merk volgt de actieve
//     organisatie van de gebruiker (consent-slot > recentste sessie-org >
//     oudste membership; zie resolveOAuthWorkspace in brand-resolver.ts).
// Elke 401 draagt verplicht `WWW-Authenticate: Bearer resource_metadata=…`:
// dát is het signaal waarmee een connector de OAuth-discovery + flow start
// (RFC 9728) — zonder die header blijft "URL plakken" dood.
// =============================================================

import { NextResponse } from 'next/server';
import { WebStandardStreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js';
import {
  isPublicApiEnabled,
  requireApiKey,
  requireOAuthToken,
} from '@/lib/api/public/auth';
import { createPublicMcpServer, type PublicMcpContext } from '@/lib/api/public/mcp-server';
import { rateLimitIp, rateLimitWorkspace } from '@/lib/api/public/rate-limit';

// generate_on_brand draait de volledige canvas-pipeline binnen de request —
// zelfde budget als /api/v1/generate.
export const maxDuration = 300;

/**
 * 401 in het JSON-RPC-formaat dat Better Auth's eigen withMcpAuth hanteert,
 * mét de resource_metadata-pointer. Expose-header zodat browser-based MCP-
 * clients de WWW-Authenticate ook door CORS heen kunnen lezen.
 */
function unauthorized(request: Request): NextResponse {
  // request.url draagt op Vercel de forwarded host — zelfde origin als waar de
  // connector zonet op POSTte, dus de metadata-URL wijst altijd naar onszelf.
  const origin = new URL(request.url).origin;
  const wwwAuthenticate = `Bearer resource_metadata="${origin}/.well-known/oauth-protected-resource"`;
  return NextResponse.json(
    {
      jsonrpc: '2.0',
      error: { code: -32000, message: 'Unauthorized: authentication required' },
      id: null,
    },
    {
      status: 401,
      headers: {
        'WWW-Authenticate': wwwAuthenticate,
        'Access-Control-Expose-Headers': 'WWW-Authenticate',
      },
    },
  );
}

/**
 * Duale auth: eerst het bd_live-key-pad, anders het OAuth-token-pad. Het
 * OAuth-pad draagt userId (rol-/membership-checks in de tools) en een
 * eventueel consent-slot mee — zie brand-resolver.ts.
 */
async function resolveMcpAuth(request: Request): Promise<PublicMcpContext | null> {
  const keyAuth = await requireApiKey(request);
  if (keyAuth) return { workspaceId: keyAuth.workspaceId, authVia: 'api_key' };

  const oauthAuth = await requireOAuthToken(request);
  if (oauthAuth) {
    return {
      workspaceId: oauthAuth.workspaceId,
      authVia: 'oauth',
      userId: oauthAuth.userId,
      ...(oauthAuth.lockedWorkspaceId ? { lockedWorkspaceId: oauthAuth.lockedWorkspaceId } : {}),
    };
  }

  return null;
}

export async function POST(request: Request) {
  if (!isPublicApiEnabled()) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  // Per-IP limiet vóór de DB-auth: resolveMcpAuth doet een apiKey-lookup +
  // (bij een Bearer) een volledige Better-Auth-tokenvalidatie per request —
  // zonder plafond is dat een unauth connection-pool-DoS (audit CRITICAL-3).
  const ipLimited = await rateLimitIp(request);
  if (ipLimited) return ipLimited;

  const authCtx = await resolveMcpAuth(request);
  if (!authCtx) return unauthorized(request);

  // Per-workspace limiet ná auth: één merk kan de tools niet platslaan (CRITICAL-1).
  const wsLimited = await rateLimitWorkspace(authCtx.workspaceId);
  if (wsLimited) return wsLimited;

  const server = createPublicMcpServer(authCtx);
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
