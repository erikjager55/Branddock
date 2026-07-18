// =============================================================
// Unit-tests voor de OAuth-core (src/oauth.ts, gebundeld naar
// .test-build/oauth.mjs door build.mjs): PKCE, registratie, authorize-URL,
// callback-parsing, token-exchange en de refresh-beslislogica. Alle
// fetches zijn gemockt — geen echte netwerk-calls.
// =============================================================

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  challengeFromVerifier,
  generatePkcePair,
  randomState,
  oauthEndpoints,
  registerClient,
  buildAuthorizeUrl,
  parseCallbackUrl,
  exchangeCode,
  computeExpiresAt,
  tokenNeedsRefresh,
  ensureFreshTokens,
  BranddockApiError,
  SESSION_EXPIRED_MESSAGE,
  OAUTH_SCOPE,
} from '../.test-build/oauth.mjs';

const BASE = 'https://app.example.com/';
const REDIRECT = 'https://abcdefgh.chromiumapp.org/';

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function mockFetch(response) {
  const calls = [];
  const fn = async (url, init) => {
    calls.push({ url, init });
    return typeof response === 'function' ? response(url, init) : response;
  };
  fn.calls = calls;
  return fn;
}

function storedAuth(overrides = {}) {
  return {
    issuer: 'https://app.example.com',
    clientId: 'client-1',
    accessToken: 'access-old',
    refreshToken: 'refresh-old',
    expiresAt: Date.now() + 3_600_000,
    ...overrides,
  };
}

// ─── PKCE ────────────────────────────────────────────────────

test('challengeFromVerifier: RFC 7636-testvector', async () => {
  // Appendix B van RFC 7636 — bekende verifier→challenge-koppeling.
  const challenge = await challengeFromVerifier('dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk');
  assert.equal(challenge, 'E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM');
});

test('generatePkcePair: 43-teken base64url-verifier met kloppende challenge', async () => {
  const { verifier, challenge } = await generatePkcePair();
  assert.equal(verifier.length, 43); // 32 bytes → 43 base64url-tekens
  assert.match(verifier, /^[A-Za-z0-9_-]+$/);
  assert.equal(challenge, await challengeFromVerifier(verifier));

  const second = await generatePkcePair();
  assert.notEqual(second.verifier, verifier);
});

test('randomState: base64url en per aanroep uniek', () => {
  const a = randomState();
  const b = randomState();
  assert.match(a, /^[A-Za-z0-9_-]+$/);
  assert.notEqual(a, b);
});

// ─── Endpoints + registratie ─────────────────────────────────

test('oauthEndpoints: afgeleid van de (genormaliseerde) Base URL', () => {
  const endpoints = oauthEndpoints('  https://app.example.com//  ');
  assert.deepEqual(endpoints, {
    register: 'https://app.example.com/api/auth/mcp/register',
    authorize: 'https://app.example.com/api/auth/mcp/authorize',
    token: 'https://app.example.com/api/auth/mcp/token',
  });
});

test('registerClient: public-client-registratie → client_id', async () => {
  const fetchFn = mockFetch(jsonResponse({ client_id: 'client-123' }, 201));
  const clientId = await registerClient(BASE, REDIRECT, fetchFn);

  assert.equal(clientId, 'client-123');
  const { url, init } = fetchFn.calls[0];
  assert.equal(url, 'https://app.example.com/api/auth/mcp/register');
  assert.equal(init.method, 'POST');
  const body = JSON.parse(init.body);
  assert.deepEqual(body.redirect_uris, [REDIRECT]);
  assert.equal(body.token_endpoint_auth_method, 'none'); // public client, geen secret
  assert.deepEqual(body.grant_types, ['authorization_code', 'refresh_token']);
  assert.equal(body.scope, OAUTH_SCOPE);
});

test('registerClient: non-2xx → nette fout met status', async () => {
  const fetchFn = mockFetch(jsonResponse({ error: 'nope' }, 500));
  await assert.rejects(registerClient(BASE, REDIRECT, fetchFn), (error) => {
    assert.ok(error instanceof BranddockApiError);
    assert.equal(error.status, 500);
    assert.match(error.message, /Registreren/);
    return true;
  });
});

test('registerClient: respons zonder client_id → fout', async () => {
  const fetchFn = mockFetch(jsonResponse({}, 201));
  await assert.rejects(registerClient(BASE, REDIRECT, fetchFn), /client_id/);
});

// ─── Authorize-URL + callback ────────────────────────────────

test('buildAuthorizeUrl: alle PKCE-params aanwezig', () => {
  const url = new URL(
    buildAuthorizeUrl(BASE, {
      clientId: 'client-1',
      redirectUri: REDIRECT,
      state: 'state-1',
      challenge: 'challenge-1',
    }),
  );
  assert.equal(url.origin + url.pathname, 'https://app.example.com/api/auth/mcp/authorize');
  assert.equal(url.searchParams.get('client_id'), 'client-1');
  assert.equal(url.searchParams.get('redirect_uri'), REDIRECT);
  assert.equal(url.searchParams.get('response_type'), 'code');
  assert.equal(url.searchParams.get('scope'), OAUTH_SCOPE);
  assert.equal(url.searchParams.get('state'), 'state-1');
  assert.equal(url.searchParams.get('code_challenge'), 'challenge-1');
  assert.equal(url.searchParams.get('code_challenge_method'), 'S256');
});

test('parseCallbackUrl: haalt de code op bij kloppende state', () => {
  const code = parseCallbackUrl(`${REDIRECT}?code=abc&state=state-1`, 'state-1');
  assert.equal(code, 'abc');
});

test('parseCallbackUrl: state-mismatch → fout (CSRF-bescherming)', () => {
  assert.throws(() => parseCallbackUrl(`${REDIRECT}?code=abc&state=evil`, 'state-1'), /State/);
});

test('parseCallbackUrl: error-param → NL-melding met beschrijving', () => {
  assert.throws(
    () =>
      parseCallbackUrl(
        `${REDIRECT}?error=access_denied&error_description=User%20denied`,
        'state-1',
      ),
    /geweigerd.*User denied/,
  );
});

// ─── Token-exchange ──────────────────────────────────────────

test('exchangeCode: form-encoded PKCE-exchange → TokenSet met expiry', async () => {
  const before = Date.now();
  const fetchFn = mockFetch(
    jsonResponse({ access_token: 'access-1', refresh_token: 'refresh-1', expires_in: 900 }),
  );
  const tokens = await exchangeCode(
    BASE,
    { code: 'abc', redirectUri: REDIRECT, clientId: 'client-1', verifier: 'verifier-1' },
    fetchFn,
  );

  const { url, init } = fetchFn.calls[0];
  assert.equal(url, 'https://app.example.com/api/auth/mcp/token');
  assert.equal(init.headers['Content-Type'], 'application/x-www-form-urlencoded');
  const form = new URLSearchParams(init.body);
  assert.equal(form.get('grant_type'), 'authorization_code');
  assert.equal(form.get('code'), 'abc');
  assert.equal(form.get('redirect_uri'), REDIRECT);
  assert.equal(form.get('client_id'), 'client-1');
  assert.equal(form.get('code_verifier'), 'verifier-1');
  assert.equal(form.get('client_secret'), null); // public client

  assert.equal(tokens.accessToken, 'access-1');
  assert.equal(tokens.refreshToken, 'refresh-1');
  assert.ok(tokens.expiresAt >= before + 900_000 && tokens.expiresAt <= Date.now() + 900_000);
});

test('exchangeCode: 400 (invalid_grant) → 401-fout met her-login-melding', async () => {
  const fetchFn = mockFetch(jsonResponse({ error: 'invalid_grant' }, 400));
  await assert.rejects(
    exchangeCode(BASE, { code: 'x', redirectUri: REDIRECT, clientId: 'c', verifier: 'v' }, fetchFn),
    (error) => {
      assert.ok(error instanceof BranddockApiError);
      assert.equal(error.status, 401);
      return true;
    },
  );
});

test('computeExpiresAt: fallback van 1 uur zonder expires_in', () => {
  assert.equal(computeExpiresAt(120, 1_000_000), 1_000_000 + 120_000);
  assert.equal(computeExpiresAt(undefined, 1_000_000), 1_000_000 + 3_600_000);
});

// ─── Refresh-logica ──────────────────────────────────────────

test('tokenNeedsRefresh: 60s-marge vóór expiry', () => {
  assert.equal(tokenNeedsRefresh({ expiresAt: 1_000_000 }, 1_000_000 - 61_000), false);
  assert.equal(tokenNeedsRefresh({ expiresAt: 1_000_000 }, 1_000_000 - 60_000), true);
  assert.equal(tokenNeedsRefresh({ expiresAt: 1_000_000 }, 1_000_001), true);
});

test('ensureFreshTokens: vers token → ongewijzigd terug, geen netwerk-call', async () => {
  const fetchFn = mockFetch(jsonResponse({}));
  const auth = storedAuth();
  const outcome = await ensureFreshTokens(auth, fetchFn);
  assert.equal(outcome.refreshed, false);
  assert.deepEqual(outcome.auth, auth);
  assert.equal(fetchFn.calls.length, 0);
});

test('ensureFreshTokens: verlopen token → refresh_token-grant met rotatie', async () => {
  const fetchFn = mockFetch(
    jsonResponse({ access_token: 'access-new', refresh_token: 'refresh-new', expires_in: 600 }),
  );
  const outcome = await ensureFreshTokens(storedAuth({ expiresAt: Date.now() - 1000 }), fetchFn);

  const { url, init } = fetchFn.calls[0];
  assert.equal(url, 'https://app.example.com/api/auth/mcp/token');
  const form = new URLSearchParams(init.body);
  assert.equal(form.get('grant_type'), 'refresh_token');
  assert.equal(form.get('refresh_token'), 'refresh-old');
  assert.equal(form.get('client_id'), 'client-1');

  assert.equal(outcome.refreshed, true);
  assert.equal(outcome.auth.accessToken, 'access-new');
  assert.equal(outcome.auth.refreshToken, 'refresh-new'); // geroteerd
  assert.equal(outcome.auth.issuer, 'https://app.example.com');
  assert.ok(outcome.auth.expiresAt > Date.now());
});

test('ensureFreshTokens: geen nieuw refresh-token → bestaande blijft behouden', async () => {
  const fetchFn = mockFetch(jsonResponse({ access_token: 'access-new', expires_in: 600 }));
  const outcome = await ensureFreshTokens(storedAuth({ expiresAt: 0 }), fetchFn);
  assert.equal(outcome.auth.refreshToken, 'refresh-old');
});

test('ensureFreshTokens: verlopen zonder refresh-token → sessie-verlopen-fout', async () => {
  const fetchFn = mockFetch(jsonResponse({}));
  await assert.rejects(
    ensureFreshTokens(storedAuth({ expiresAt: 0, refreshToken: undefined }), fetchFn),
    (error) => {
      assert.ok(error instanceof BranddockApiError);
      assert.equal(error.status, 401);
      assert.equal(error.message, SESSION_EXPIRED_MESSAGE);
      return true;
    },
  );
  assert.equal(fetchFn.calls.length, 0);
});

test('ensureFreshTokens: geweigerde refresh (400) → 401 sessie verlopen', async () => {
  const fetchFn = mockFetch(jsonResponse({ error: 'invalid_grant' }, 400));
  await assert.rejects(
    ensureFreshTokens(storedAuth({ expiresAt: 0 }), fetchFn),
    (error) => {
      assert.ok(error instanceof BranddockApiError);
      assert.equal(error.status, 401);
      assert.equal(error.message, SESSION_EXPIRED_MESSAGE);
      return true;
    },
  );
});

test('ensureFreshTokens: netwerkfout → status 0, géén sessie-verlopen-melding', async () => {
  const fetchFn = async () => {
    throw new TypeError('fetch failed');
  };
  await assert.rejects(ensureFreshTokens(storedAuth({ expiresAt: 0 }), fetchFn), (error) => {
    assert.ok(error instanceof BranddockApiError);
    assert.equal(error.status, 0);
    assert.match(error.message, /niet bereiken/);
    return true;
  });
});
