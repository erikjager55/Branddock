// Smoke-harnas voor de OAuth-connect-fase van de publieke MCP-server
// (Better Auth mcp-plugin — Branddock als OAuth-provider voor connectors).
//
// Vereist een draaiende dev-server op poort 3005 mét de juiste env:
//   PUBLIC_API_ENABLED=true BETTER_AUTH_URL=http://localhost:3005 \
//     npm run dev -- -p 3005
// (BETTER_AUTH_URL MOET de 3005-origin zijn: hij wordt letterlijk de OIDC-
// issuer + de basis van alle discovery-endpoints, en Better Auth's origin-
// check weigert anders de sign-in/consent-POSTs met "Invalid origin".)
//
// Run: node --env-file-if-exists=.env.local node_modules/.bin/tsx \
//        scripts/dev/oauth-mcp-smoke.ts
// Env: SMOKE_BASE     (default http://localhost:3005)
//      SMOKE_EMAIL    (default erik@branddock.com — seed-user)
//      SMOKE_PASSWORD (default Password123!)
// Playwright-chromium moet geïnstalleerd zijn (npx playwright install chromium).
//
// Dekt: (a) beide well-known-discovery-routes, (b) 401 + WWW-Authenticate op
// /api/mcp zonder auth, (c) de volledige connector-flow — dynamic client
// registration → authorize met PKCE → /oauth/login in een echte browser →
// code op de lokale callback → token-exchange → tools/list (14 tools) +
// list_personas met het Bearer-token, (d) ApiCallLog-rij met authVia 'oauth'.
// Ruimt de aangemaakte oauth-client + token-rijen op via Prisma.

import http from 'node:http';
import type { AddressInfo } from 'node:net';
import { createHash, randomBytes } from 'node:crypto';
import { chromium } from 'playwright';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { prisma } from '../../src/lib/prisma';

const BASE = process.env.SMOKE_BASE ?? 'http://localhost:3005';
const EMAIL = process.env.SMOKE_EMAIL ?? 'erik@branddock.com';
const PASSWORD = process.env.SMOKE_PASSWORD ?? 'Password123!';

const EXPECTED_TOOL_COUNT = 14;

function assert(cond: boolean, label: string): void {
  if (cond) {
    console.log(`  PASS — ${label}`);
  } else {
    console.error(`  FAIL — ${label}`);
    process.exitCode = 1;
  }
}

function fail(label: string): never {
  console.error(`  FAIL — ${label}`);
  process.exitCode = 1;
  throw new Error(label);
}

interface AuthServerMetadata {
  issuer?: string;
  authorization_endpoint?: string;
  token_endpoint?: string;
  registration_endpoint?: string;
  code_challenge_methods_supported?: string[];
}

interface ProtectedResourceMetadata {
  resource?: string;
  authorization_servers?: string[];
  bearer_methods_supported?: string[];
}

/** Lokale HTTP-listener die de OAuth-callback (?code=…&state=…) opvangt. */
function startCallbackServer(): Promise<{
  server: http.Server;
  redirectUri: string;
  waitForCode: Promise<{ code: string; state: string | null }>;
}> {
  let resolveCode: (v: { code: string; state: string | null }) => void;
  const waitForCode = new Promise<{ code: string; state: string | null }>((r) => {
    resolveCode = r;
  });
  const server = http.createServer((req, res) => {
    const url = new URL(req.url ?? '/', 'http://127.0.0.1');
    const code = url.searchParams.get('code');
    const error = url.searchParams.get('error');
    res.writeHead(200, { 'content-type': 'text/html' });
    res.end('<p>Authorization received — you can close this window.</p>');
    if (url.pathname === '/callback' && code) {
      resolveCode({ code, state: url.searchParams.get('state') });
    } else if (error) {
      console.error(`  callback-error: ${error} — ${url.searchParams.get('error_description') ?? ''}`);
    }
  });
  return new Promise((resolve) => {
    server.listen(0, '127.0.0.1', () => {
      const { port } = server.address() as AddressInfo;
      resolve({ server, redirectUri: `http://127.0.0.1:${port}/callback`, waitForCode });
    });
  });
}

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error(`Timeout (${ms}ms): ${label}`)), ms)),
  ]);
}

async function main(): Promise<void> {
  const startedAt = new Date();

  // ── a. Discovery-routes ───────────────────────────────────────────────────
  console.log('a. Well-known discovery');
  const asRes = await fetch(`${BASE}/.well-known/oauth-authorization-server`);
  assert(asRes.status === 200, `authorization-server-metadata → 200 (${asRes.status})`);
  const asMeta = (await asRes.json()) as AuthServerMetadata | null;
  assert(
    typeof asMeta?.issuer === 'string' &&
      typeof asMeta.authorization_endpoint === 'string' &&
      typeof asMeta.token_endpoint === 'string' &&
      typeof asMeta.registration_endpoint === 'string',
    `metadata bevat issuer + authorize/token/register-endpoints`,
  );
  if (!asMeta?.issuer || !asMeta.authorization_endpoint || !asMeta.token_endpoint || !asMeta.registration_endpoint) {
    fail('discovery-metadata onbruikbaar (draait de server met BETTER_AUTH_URL=http://localhost:3005?)');
  }
  assert(
    asMeta.code_challenge_methods_supported?.includes('S256') === true,
    'PKCE S256 geadverteerd',
  );
  assert(
    new URL(asMeta.issuer).origin === new URL(BASE).origin,
    `issuer-origin == smoke-origin (${asMeta.issuer}) — zo niet: BETTER_AUTH_URL verkeerd`,
  );

  const prRes = await fetch(`${BASE}/.well-known/oauth-protected-resource`);
  assert(prRes.status === 200, `protected-resource-metadata → 200 (${prRes.status})`);
  const prMeta = (await prRes.json()) as ProtectedResourceMetadata;
  assert(
    typeof prMeta.resource === 'string' &&
      Array.isArray(prMeta.authorization_servers) &&
      prMeta.authorization_servers.length > 0 &&
      prMeta.bearer_methods_supported?.includes('header') === true,
    'resource + authorization_servers + bearer via header',
  );

  // ── b. 401 mét WWW-Authenticate ───────────────────────────────────────────
  console.log('\nb. POST /api/mcp zonder auth');
  const unauthRes = await fetch(`${BASE}/api/mcp`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', accept: 'application/json, text/event-stream' },
    body: JSON.stringify({ jsonrpc: '2.0', method: 'tools/list', id: 1 }),
  });
  assert(unauthRes.status === 401, `status 401 (${unauthRes.status})`);
  const wwwAuth = unauthRes.headers.get('www-authenticate') ?? '';
  assert(
    wwwAuth.includes('resource_metadata=') && wwwAuth.includes('/.well-known/oauth-protected-resource'),
    `WWW-Authenticate wijst naar protected-resource-metadata (${wwwAuth || 'ontbreekt'})`,
  );

  // ── c1. Dynamic client registration ───────────────────────────────────────
  console.log('\nc. Volledige OAuth-flow');
  const { server: cbServer, redirectUri, waitForCode } = await startCallbackServer();
  console.log(`  callback-listener: ${redirectUri}`);

  const registerRes = await fetch(asMeta.registration_endpoint, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      client_name: 'branddock-oauth-mcp-smoke',
      redirect_uris: [redirectUri],
      token_endpoint_auth_method: 'none', // public client → PKCE verplicht
      grant_types: ['authorization_code', 'refresh_token'],
      response_types: ['code'],
      scope: 'openid profile email offline_access',
    }),
  });
  assert(registerRes.status === 201, `registration → 201 (${registerRes.status})`);
  const registration = (await registerRes.json()) as { client_id?: string; client_secret?: string };
  const clientId = registration.client_id;
  if (!clientId) fail('registration gaf geen client_id terug');
  assert(registration.client_secret === undefined, 'public client → geen client_secret');
  console.log(`  client_id: ${clientId}`);

  const browser = await chromium.launch();
  try {
    // ── c2. Authorize met PKCE → login in echte browser ─────────────────────
    const verifier = randomBytes(32).toString('base64url');
    const challenge = createHash('sha256').update(verifier).digest('base64url');
    const state = randomBytes(16).toString('base64url');

    const authorizeUrl = new URL(asMeta.authorization_endpoint);
    authorizeUrl.searchParams.set('client_id', clientId);
    authorizeUrl.searchParams.set('redirect_uri', redirectUri);
    authorizeUrl.searchParams.set('response_type', 'code');
    authorizeUrl.searchParams.set('scope', 'openid profile email offline_access');
    authorizeUrl.searchParams.set('state', state);
    authorizeUrl.searchParams.set('code_challenge', challenge);
    authorizeUrl.searchParams.set('code_challenge_method', 'S256');

    const page = await browser.newPage();
    await page.goto(authorizeUrl.toString());
    await page.waitForURL('**/oauth/login**', { timeout: 15_000 });
    assert(true, 'authorize redirect naar /oauth/login');

    await page.getByTestId('oauth-login-email').fill(EMAIL);
    await page.getByTestId('oauth-login-password').fill(PASSWORD);
    await page.getByTestId('oauth-login-submit').click();

    const { code, state: returnedState } = await withTimeout(
      waitForCode,
      30_000,
      'authorization-code op de callback',
    );
    assert(code.length > 0, 'authorization-code ontvangen op de callback');
    assert(returnedState === state, 'state round-trip klopt');

    // ── c3. Token-exchange (PKCE-verifier, geen client_secret) ──────────────
    const tokenRes = await fetch(asMeta.token_endpoint, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: redirectUri,
        client_id: clientId,
        code_verifier: verifier,
      }).toString(),
    });
    assert(tokenRes.status === 200, `token-exchange → 200 (${tokenRes.status})`);
    const tokens = (await tokenRes.json()) as {
      access_token?: string;
      refresh_token?: string;
      token_type?: string;
      scope?: string;
    };
    const accessToken = tokens.access_token;
    if (!accessToken) fail(`token-exchange gaf geen access_token (${JSON.stringify(tokens)})`);
    assert(tokens.token_type?.toLowerCase() === 'bearer', `token_type Bearer (${tokens.token_type})`);
    assert(typeof tokens.refresh_token === 'string', 'refresh_token aanwezig (offline_access)');

    // ── c4. MCP met het Bearer-token ────────────────────────────────────────
    const mcpClient = new Client({ name: 'branddock-oauth-mcp-smoke', version: '1.0.0' });
    const transport = new StreamableHTTPClientTransport(new URL(`${BASE}/api/mcp`), {
      requestInit: { headers: { authorization: `Bearer ${accessToken}` } },
    });
    await mcpClient.connect(transport);
    const { tools } = await mcpClient.listTools();
    assert(
      tools.length === EXPECTED_TOOL_COUNT,
      `tools/list → ${EXPECTED_TOOL_COUNT} tools (${tools.length})`,
    );

    // Gratis read-tool aanroepen zodat er een usage-log-rij ontstaat (stap d).
    const personasRes = await mcpClient.callTool({ name: 'list_personas', arguments: {} });
    assert(
      (personasRes as { isError?: boolean }).isError !== true,
      'list_personas draait op het OAuth-pad',
    );
    await mcpClient.close();

    // ── d. ApiCallLog met authVia 'oauth' ───────────────────────────────────
    console.log('\nd. Usage-log');
    const logRow = await prisma.apiCallLog.findFirst({
      where: { tool: 'list_personas', authVia: 'oauth', createdAt: { gte: startedAt } },
      orderBy: { createdAt: 'desc' },
      select: { id: true, workspaceId: true, success: true },
    });
    assert(
      logRow?.success === true,
      `ApiCallLog-rij met authVia 'oauth' (workspace ${logRow?.workspaceId ?? '—'})`,
    );
  } finally {
    await browser.close();
    cbServer.close();

    // ── Opruimen: smoke-client + uitgegeven tokens ──────────────────────────
    // (cascade op de FK zou tokens al meenemen, maar expliciet is expliciet;
    // authorization-code-verificaties verlopen vanzelf binnen 10 min.)
    const deletedTokens = await prisma.oauthAccessToken.deleteMany({ where: { clientId } });
    const deletedClients = await prisma.oauthApplication.deleteMany({ where: { clientId } });
    console.log(`\nOpgeruimd: ${deletedClients.count} client(s), ${deletedTokens.count} token-rij(en).`);
    await prisma.$disconnect();
  }

  console.log('\nKlaar.');
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
