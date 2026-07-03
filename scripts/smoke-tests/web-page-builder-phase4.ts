/**
 * Smoke-test voor Phase 4 — publish-laag (host-router + publish-page).
 *
 * Verifies:
 *  - isValidSlug: lowercase + digits + hyphens, no leading/trailing hyphen,
 *    1-80 chars, rejects uppercase / spaces / unicode / over-length.
 *  - publishLandingPage: upserts via the right unique-key, sets PUBLISHED
 *    status + publishedAt, rejects invalid slugs.
 *  - resolvePublishedPage: returns null for unknown workspace/slug, null for
 *    DRAFT/ARCHIVED status, page-data when PUBLISHED.
 *  - decideHostRoute: apex/localhost passthrough, subdomain → rewriteTo /p,
 *    exempt path prefixes passthrough, root path on subdomain passthrough,
 *    .lvh.me parity for local-dev.
 *
 * Run: npx tsx scripts/smoke-tests/web-page-builder-phase4.ts
 */

import {
  isValidSlug,
  publishLandingPage,
  resolvePublishedPage,
} from '../../src/lib/landing-pages/publish-page';
import { decideHostRoute } from '../../src/lib/landing-pages/host-router';

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

function group(name: string): void {
  console.log(`\n${name}`);
}

// ─── 1. Slug validation ──────────────────────────────────────

function testSlugValidation(): void {
  group('1. isValidSlug');

  const valid = [
    'my-launch',
    'a',
    'product-page',
    'spring-2026',
    'v2',
    'a-b-c-d-e',
    '0',
    'a'.repeat(80),
  ];
  for (const s of valid) {
    assert(`accepts "${s.slice(0, 20)}${s.length > 20 ? '...' : ''}"`, isValidSlug(s));
  }

  const invalid: Array<{ slug: string; why: string }> = [
    { slug: '', why: 'empty' },
    { slug: '-leading', why: 'leading hyphen' },
    { slug: 'trailing-', why: 'trailing hyphen' },
    { slug: 'UPPER', why: 'uppercase' },
    { slug: 'has space', why: 'space' },
    { slug: 'slash/in', why: 'slash' },
    { slug: 'dot.in', why: 'dot' },
    { slug: 'unicode-é', why: 'unicode' },
    { slug: 'a'.repeat(81), why: '> 80 chars' },
    { slug: '--double', why: 'leading double hyphen' },
  ];
  for (const { slug, why } of invalid) {
    assert(`rejects ${why}`, !isValidSlug(slug));
  }
}

// ─── 2. publishLandingPage ───────────────────────────────────

interface UpsertCall {
  where: unknown;
  update: Record<string, unknown>;
  create: Record<string, unknown>;
}

function makeMockPrisma() {
  const upsertCalls: UpsertCall[] = [];
  const mock = {
    landingPage: {
      upsert: async (args: UpsertCall) => {
        upsertCalls.push(args);
        return {
          id: 'mock-id',
          slug: (args.create as { slug: string }).slug,
          status: 'PUBLISHED',
          publishedAt: new Date(),
        };
      },
      findFirst: async (args: {
        where: { workspaceId: string; slug: string };
      }): Promise<{ puckData: unknown; status: string } | null> => {
        if (args.where.slug === 'published-page') {
          return { puckData: { root: { props: {} }, content: [] }, status: 'PUBLISHED' };
        }
        if (args.where.slug === 'draft-page') {
          return { puckData: { root: { props: {} }, content: [] }, status: 'DRAFT' };
        }
        return null;
      },
    },
    workspace: {
      findUnique: async (args: { where: { slug: string } }): Promise<{ id: string } | null> => {
        if (args.where.slug === 'my-workspace') return { id: 'ws-1' };
        return null;
      },
    },
  };
  return { mock, upsertCalls };
}

async function testPublishLandingPage(): Promise<void> {
  group('2. publishLandingPage — upsert flow');

  const { mock, upsertCalls } = makeMockPrisma();
  const result = await publishLandingPage(mock, {
    workspaceId: 'ws-1',
    deliverableId: 'd-1',
    slug: 'my-launch',
    locale: 'en-GB',
    puckData: { root: { props: {} }, content: [] },
  });

  assert('returns id', result.id === 'mock-id');
  assert('returns PUBLISHED status', result.status === 'PUBLISHED');
  assert('returns publishedAt', result.publishedAt instanceof Date);
  assert('called upsert once', upsertCalls.length === 1);
  assert(
    'upsert uses compound workspace+locale+slug key',
    JSON.stringify(upsertCalls[0]?.where) ===
      JSON.stringify({ workspaceId_locale_slug: { workspaceId: 'ws-1', locale: 'en-GB', slug: 'my-launch' } }),
  );
  assert(
    'upsert.create sets status=PUBLISHED',
    upsertCalls[0]?.create.status === 'PUBLISHED',
  );
  assert(
    'upsert.update sets status=PUBLISHED',
    upsertCalls[0]?.update.status === 'PUBLISHED',
  );

  group('3. publishLandingPage — rejects invalid slug');
  let rejected = false;
  try {
    await publishLandingPage(mock, {
      workspaceId: 'ws-1',
      deliverableId: 'd-1',
      slug: 'Invalid Slug!',
      locale: 'en-GB',
      puckData: {},
    });
  } catch (err) {
    rejected = err instanceof Error && err.message.includes('Invalid slug');
  }
  assert('throws on invalid slug', rejected);
}

// ─── 3. resolvePublishedPage ─────────────────────────────────

async function testResolvePublishedPage(): Promise<void> {
  group('4. resolvePublishedPage');

  const { mock } = makeMockPrisma();

  const published = await resolvePublishedPage(mock, 'my-workspace', 'published-page');
  assert('returns data for PUBLISHED page', published !== null);
  assert('returns workspaceId', published?.workspaceId === 'ws-1');
  assert('returns puckData', published?.puckData !== undefined);

  const draft = await resolvePublishedPage(mock, 'my-workspace', 'draft-page');
  assert('returns null for DRAFT page', draft === null);

  const noPage = await resolvePublishedPage(mock, 'my-workspace', 'missing-page');
  assert('returns null for missing page', noPage === null);

  const noWs = await resolvePublishedPage(mock, 'unknown-workspace', 'published-page');
  assert('returns null for missing workspace', noWs === null);
}

// ─── 4. decideHostRoute ──────────────────────────────────────

function testHostRouter(): void {
  group('5. decideHostRoute — passthrough cases');

  const passthrough = [
    { host: 'branddock.app', path: '/', why: 'apex root' },
    { host: 'branddock.app', path: '/dashboard', why: 'apex deep path' },
    { host: 'www.branddock.app', path: '/', why: 'www apex' },
    { host: 'localhost:3000', path: '/canvas', why: 'localhost with port' },
    { host: 'lvh.me:3000', path: '/canvas', why: 'lvh.me root' },
    { host: 'ws.branddock.app', path: '/api/foo', why: 'api path on subdomain' },
    { host: 'ws.branddock.app', path: '/_next/static/x.js', why: '_next on subdomain' },
    { host: 'ws.branddock.app', path: '/p/already-routed', why: '/p/ already routed' },
    { host: 'ws.branddock.app', path: '/', why: 'subdomain root path' },
  ];
  for (const { host, path, why } of passthrough) {
    const d = decideHostRoute(host, path);
    assert(`passthrough: ${why}`, d.passthrough === true && d.rewriteTo === undefined);
  }

  group('6. decideHostRoute — subdomain rewrite');

  const rewrites = [
    {
      host: 'my-ws.branddock.app',
      path: '/spring-launch',
      expected: '/p/spring-launch?workspace=my-ws',
    },
    {
      host: 'my-ws.lvh.me:3000',
      path: '/about-us',
      expected: '/p/about-us?workspace=my-ws',
    },
    {
      host: 'WS.BRANDDOCK.APP',
      path: '/Slug-1',
      expected: '/p/Slug-1?workspace=ws',
    },
  ];
  for (const { host, path, expected } of rewrites) {
    const d = decideHostRoute(host, path);
    assert(`${host}${path} → ${expected}`, d.rewriteTo === expected, `got ${d.rewriteTo}`);
  }
}

// ─── Run ─────────────────────────────────────────────────────

async function main(): Promise<void> {
  console.log('Phase 4 smoke-test — publish-laag');
  testSlugValidation();
  await testPublishLandingPage();
  await testResolvePublishedPage();
  testHostRouter();
  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error('SMOKE crashed', err);
  process.exit(2);
});
