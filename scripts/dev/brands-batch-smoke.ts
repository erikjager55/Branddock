// Smoke-harnas voor de "merken zijn taal"-batch van de publieke MCP-API.
//
// In-process: de MCP-server wordt via InMemoryTransport aan een echte
// MCP-client gekoppeld — géén dev-server nodig; alle tool-runs raken de
// lokale DB. Alleen de token-uitgifte zelf (Better Auth) valt buiten scope;
// die dekt scripts/dev/oauth-mcp-smoke.ts end-to-end.
//
// Run: node --env-file-if-exists=.env.local node_modules/.bin/tsx \
//        scripts/dev/brands-batch-smoke.ts
// Env: SMOKE_EMAIL (default erik@branddock.com — bestaande user met merk-data)
//      SMOKE_FULL=1 → óók echte AI-runs: generate_on_brand (contentText) en
//                     generate_image (Media-Library-persist + URL). Kost
//                     credits/AI-calls; vereist provider-keys in .env.local.
//
// Dekt (zonder AI): list_brands key-pad vs OAuth-pad, brand-param-resolutie
// (id + naam case-insensitive), membership-weigering (scratch-user/-org),
// key-merk-vergrendeling, rol-check (viewer → generate geweigerd, read ok),
// consent-slot (resolver + tool-surface) en get_deliverable_content op een
// scratch-deliverable met componenten. Ruimt álle scratch-rijen op en zet
// de tijdelijk aangepaste rol terug (finally).
//
// NB de smoke muteert tijdelijk de rol van de SMOKE_EMAIL-membership naar
// 'viewer' — draai hem niet parallel met ander werk op dezelfde DB.

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { prisma } from '../../src/lib/prisma';
import {
  createPublicMcpServer,
  type PublicMcpContext,
} from '../../src/lib/api/public/mcp-server';
import { resolveOAuthWorkspace } from '../../src/lib/api/public/brand-resolver';

const EMAIL = process.env.SMOKE_EMAIL ?? 'erik@branddock.com';
const FULL = process.env.SMOKE_FULL === '1';

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

/** Eerste text-content uit een CallToolResult — via unknown-narrowing. */
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
  return !!result && typeof result === 'object' && (result as { isError?: unknown }).isError === true;
}

function parseJson<T>(result: unknown): T {
  return JSON.parse(firstText(result) || '{}') as T;
}

/** Verse in-memory MCP-client tegen een per-context gebouwde server. */
async function connectClient(ctx: PublicMcpContext): Promise<{ client: Client; close: () => Promise<void> }> {
  const server = createPublicMcpServer(ctx);
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  await server.connect(serverTransport);
  const client = new Client({ name: 'brands-batch-smoke', version: '1.0.0' });
  await client.connect(clientTransport);
  return {
    client,
    close: async () => {
      await client.close();
      await server.close();
    },
  };
}

interface BrandsPayload {
  count: number;
  brands: Array<{ workspaceId: string; name: string; role: string | null; isDefault: boolean }>;
}

async function main(): Promise<void> {
  const startedAt = new Date();
  const suffix = Date.now();
  const clientId = `brands-batch-smoke-${suffix}`;

  // ── Setup: bestaande user A + scratch user/org/workspace B ────────────────
  const userA = await prisma.user.findUnique({ where: { email: EMAIL }, select: { id: true } });
  if (!userA) fail(`user ${EMAIL} niet gevonden — zet SMOKE_EMAIL`);
  const membershipA = await prisma.organizationMember.findFirst({
    where: { userId: userA.id, isActive: true },
    orderBy: { joinedAt: 'asc' },
    select: { id: true, role: true, organizationId: true },
  });
  if (!membershipA) fail(`geen actieve membership voor ${EMAIL}`);
  const wsA = await prisma.workspace.findFirst({
    where: { organizationId: membershipA.organizationId },
    orderBy: { createdAt: 'asc' },
    select: { id: true, name: true },
  });
  if (!wsA) fail('geen workspace in de org van user A');
  const originalRoleA = membershipA.role;

  const userB = await prisma.user.create({
    data: { email: `brands-batch-smoke-${suffix}@example.com`, name: 'Brands Batch Smoke' },
    select: { id: true },
  });
  const orgB = await prisma.organization.create({
    data: { name: `Brands Batch Smoke Org ${suffix}`, slug: `brands-batch-smoke-${suffix}` },
    select: { id: true },
  });
  const wsB = await prisma.workspace.create({
    data: {
      name: `Brands Batch Smoke Brand ${suffix}`,
      slug: `brands-batch-smoke-ws-${suffix}`,
      organizationId: orgB.id,
    },
    select: { id: true, name: true },
  });
  await prisma.organizationMember.create({
    data: { userId: userB.id, organizationId: orgB.id, role: 'member' },
  });

  const ctxKey: PublicMcpContext = { workspaceId: wsA.id, authVia: 'api_key' };
  const ctxOauthA: PublicMcpContext = { workspaceId: wsA.id, authVia: 'oauth', userId: userA.id };
  const ctxOauthB: PublicMcpContext = { workspaceId: wsB.id, authVia: 'oauth', userId: userB.id };

  let campaignId: string | null = null;
  let deliverableId: string | null = null;
  let generatedDeliverableId: string | null = null;
  let generatedImageId: string | null = null;

  try {
    // ── 1. list_brands: key-pad vs OAuth-pad ────────────────────────────────
    console.log('1. list_brands');
    {
      const { client, close } = await connectClient(ctxKey);
      const res = parseJson<BrandsPayload>(await client.callTool({ name: 'list_brands', arguments: {} }));
      assert(
        res.count === 1 && res.brands[0]?.workspaceId === wsA.id && res.brands[0]?.isDefault === true,
        `key-pad: exact 1 merk (het key-merk, isDefault) — got ${res.count}`,
      );
      assert(res.brands[0]?.role === null, 'key-pad: role is null (machine-toegang)');
      await close();
    }
    {
      const { client, close } = await connectClient(ctxOauthA);
      const res = parseJson<BrandsPayload>(await client.callTool({ name: 'list_brands', arguments: {} }));
      const rowA = res.brands.find((b) => b.workspaceId === wsA.id);
      assert(rowA?.isDefault === true && typeof rowA.role === 'string', 'OAuth-pad: wsA aanwezig, isDefault, met rol');
      assert(!res.brands.some((b) => b.workspaceId === wsB.id), 'OAuth-pad: vreemd merk (wsB) NIET zichtbaar voor user A');
      await close();
    }

    // ── 2. brand-param-resolutie + membership-weigering ─────────────────────
    console.log('\n2. brand-param-resolutie');
    {
      const { client, close } = await connectClient(ctxOauthA);
      const byId = await client.callTool({ name: 'list_personas', arguments: { brand: wsA.id } });
      assert(!isToolError(byId), 'OAuth: brand=workspace-id resolvet');
      const byName = await client.callTool({ name: 'list_personas', arguments: { brand: wsA.name.toUpperCase() } });
      assert(!isToolError(byName), 'OAuth: brand=merknaam (case-insensitive) resolvet');
      const denied = await client.callTool({ name: 'list_personas', arguments: { brand: wsB.name } });
      assert(
        isToolError(denied) && /list_brands/i.test(firstText(denied)),
        `OAuth: vreemd merk → nette weigering ("${firstText(denied).slice(0, 80)}…")`,
      );
      await close();
    }
    {
      const { client, close } = await connectClient(ctxKey);
      const own = await client.callTool({ name: 'list_personas', arguments: { brand: wsA.name } });
      assert(!isToolError(own), 'key: brand=eigen merk mag');
      const denied = await client.callTool({ name: 'list_personas', arguments: { brand: wsB.id } });
      assert(
        isToolError(denied) && /locked to the brand/i.test(firstText(denied)),
        `key: afwijkend merk → merk-vergrendeld-error ("${firstText(denied).slice(0, 80)}…")`,
      );
      await close();
    }

    // ── 3. Rol-check: viewer read-only ──────────────────────────────────────
    console.log('\n3. rol-check (viewer)');
    await prisma.organizationMember.update({ where: { id: membershipA.id }, data: { role: 'viewer' } });
    try {
      const { client, close } = await connectClient(ctxOauthA);
      const write = await client.callTool({
        name: 'generate_on_brand',
        arguments: { contentType: 'linkedin-post', brief: {}, generate: false },
      });
      assert(
        isToolError(write) && /member role/i.test(firstText(write)),
        `viewer: generate_on_brand geweigerd ("${firstText(write).slice(0, 80)}…")`,
      );
      const read = await client.callTool({ name: 'list_personas', arguments: {} });
      assert(!isToolError(read), 'viewer: read-tool (list_personas) blijft werken');
      await close();
    } finally {
      await prisma.organizationMember.update({ where: { id: membershipA.id }, data: { role: originalRoleA } });
    }
    assert(true, `rol teruggezet naar '${originalRoleA}'`);

    // ── 4. get_deliverable_content ──────────────────────────────────────────
    console.log('\n4. get_deliverable_content');
    const campaign = await prisma.campaign.create({
      data: {
        title: 'Brands Batch Smoke',
        slug: `brands-batch-smoke-${suffix}`,
        type: 'CONTENT',
        status: 'ACTIVE',
        workspaceId: wsA.id,
      },
      select: { id: true },
    });
    campaignId = campaign.id;
    const deliverable = await prisma.deliverable.create({
      data: { title: 'Smoke deliverable', contentType: 'linkedin-post', campaignId: campaign.id },
      select: { id: true },
    });
    deliverableId = deliverable.id;
    await prisma.deliverableComponent.createMany({
      data: [
        {
          deliverableId: deliverable.id,
          componentType: 'text',
          groupType: 'single',
          order: 0,
          generatedContent: 'Smoke tekst-component',
          isSelected: true,
        },
        {
          deliverableId: deliverable.id,
          componentType: 'image',
          groupType: 'single',
          order: 1,
          imageUrl: 'https://example.com/smoke.png',
        },
      ],
    });
    {
      const { client, close } = await connectClient(ctxKey);
      const res = await client.callTool({ name: 'get_deliverable_content', arguments: { id: deliverable.id } });
      const body = parseJson<{
        title?: string;
        contentType?: string;
        components?: Array<{ componentType: string; text: string | null; imageUrl: string | null; isSelected: boolean }>;
      }>(res);
      assert(
        !isToolError(res) && body.title === 'Smoke deliverable' && body.contentType === 'linkedin-post',
        'titel + contentType kloppen',
      );
      assert(
        body.components?.length === 2 &&
          body.components[0]?.text === 'Smoke tekst-component' &&
          body.components[0]?.isSelected === true &&
          body.components[1]?.imageUrl === 'https://example.com/smoke.png',
        'componenten op volgorde: tekst (selected) + image-URL',
      );
      await close();
    }
    {
      // Workspace-scoping: user B (ander merk) ziet dit item niet.
      const { client, close } = await connectClient(ctxOauthB);
      const res = await client.callTool({ name: 'get_deliverable_content', arguments: { id: deliverable.id } });
      assert(isToolError(res) && /NOT_FOUND/.test(firstText(res)), 'ander merk → NOT_FOUND (geen leakage)');
      await close();
    }

    // ── 5. resolveOAuthWorkspace: actieve org, fallback, consent-slot ───────
    console.log('\n5. resolveOAuthWorkspace');
    const session = await prisma.session.create({
      data: {
        token: `brands-batch-smoke-${suffix}`,
        expiresAt: new Date(Date.now() + 3_600_000),
        activeOrganizationId: orgB.id,
        userId: userB.id,
      },
      select: { id: true },
    });
    const viaSession = await resolveOAuthWorkspace(userB.id, 'no-such-client');
    assert(
      viaSession?.workspaceId === wsB.id && viaSession.lockedWorkspaceId === null,
      'recentste sessie-org → oudste workspace van die org',
    );
    await prisma.session.update({ where: { id: session.id }, data: { activeOrganizationId: null } });
    const viaFallback = await resolveOAuthWorkspace(userB.id, 'no-such-client');
    assert(viaFallback?.workspaceId === wsB.id, 'zonder sessie-org → v1-fallback (oudste membership)');

    await prisma.oauthApplication.create({
      data: {
        name: 'Brands Batch Smoke Client',
        clientId,
        redirectUrls: 'http://127.0.0.1/callback',
        type: 'public',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });
    await prisma.oauthConsent.create({
      data: {
        clientId,
        userId: userB.id,
        scopes: 'openid',
        consentGiven: true,
        lockedWorkspaceId: wsB.id,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });
    const viaLock = await resolveOAuthWorkspace(userB.id, clientId);
    assert(
      viaLock?.workspaceId === wsB.id && viaLock.lockedWorkspaceId === wsB.id,
      'consent-slot → vergrendeld merk (lockedWorkspaceId gevuld)',
    );

    // ── 6. Consent-slot op de tool-surface ──────────────────────────────────
    console.log('\n6. consent-slot op tools');
    const ctxLocked: PublicMcpContext = {
      workspaceId: wsA.id,
      authVia: 'oauth',
      userId: userA.id,
      lockedWorkspaceId: wsA.id,
    };
    {
      const { client, close } = await connectClient(ctxLocked);
      const res = parseJson<BrandsPayload>(await client.callTool({ name: 'list_brands', arguments: {} }));
      assert(res.count === 1 && res.brands[0]?.workspaceId === wsA.id, 'list_brands toont alleen het vergrendelde merk');
      const outside = await client.callTool({ name: 'list_personas', arguments: { brand: wsB.name } });
      assert(
        isToolError(outside) && /locked/i.test(firstText(outside)),
        `brand-param buiten het slot → error ("${firstText(outside).slice(0, 80)}…")`,
      );
      const inside = await client.callTool({ name: 'list_personas', arguments: { brand: wsA.id } });
      assert(!isToolError(inside), 'brand-param bínnen het slot blijft werken');
      await close();
    }

    // ── 7. SMOKE_FULL: echte AI-runs ────────────────────────────────────────
    if (FULL) {
      console.log('\n7. SMOKE_FULL: generate_on_brand → contentText');
      const { client, close } = await connectClient(ctxOauthA);
      const gen = await client.callTool({
        name: 'generate_on_brand',
        arguments: {
          contentType: 'linkedin-post',
          title: 'Brands-batch smoke run',
          brief: { objective: 'Eén korte on-brand post over waarom merkconsistentie loont.' },
        },
      });
      const genBody = parseJson<{ deliverableId?: string; contentText?: string | null; generationError?: string | null }>(gen);
      generatedDeliverableId = genBody.deliverableId ?? null;
      assert(
        !isToolError(gen) &&
          genBody.generationError === null &&
          typeof genBody.contentText === 'string' &&
          genBody.contentText.length > 50,
        `generate_on_brand geeft contentText terug (${genBody.contentText?.length ?? 0} tekens)`,
      );

      console.log('\n8. SMOKE_FULL: generate_image (key-pad, creator-fallback)');
      const { client: imgClient, close: imgClose } = await connectClient(ctxKey);
      const img = await imgClient.callTool({
        name: 'generate_image',
        arguments: {
          prompt: 'Abstract minimal test render of overlapping translucent shapes',
          name: `brands-batch-smoke-${suffix}`,
        },
      });
      const imgBody = parseJson<{ image?: { id?: string; fileUrl?: string } }>(img);
      generatedImageId = imgBody.image?.id ?? null;
      assert(
        !isToolError(img) && typeof imgBody.image?.fileUrl === 'string' && /^https?:\/\//.test(imgBody.image.fileUrl),
        `generate_image persisteert + geeft URL (${imgBody.image?.fileUrl ?? '—'})`,
      );
      if (generatedImageId) {
        const row = await prisma.generatedImage.findUnique({
          where: { id: generatedImageId },
          select: { workspaceId: true, createdById: true },
        });
        assert(row?.workspaceId === wsA.id && !!row.createdById, 'GeneratedImage-rij in wsA met creator-attributie');
      }
      await imgClose();
      await close();
    } else {
      console.log('\n7. SMOKE_FULL=1 niet gezet — AI-runs overgeslagen');
    }
  } finally {
    // ── Opruimen (verplicht) ────────────────────────────────────────────────
    // Rol-restore is hierboven al per-test gedaan; hier de vangnet-restore.
    await prisma.organizationMember
      .update({ where: { id: membershipA.id }, data: { role: originalRoleA } })
      .catch(() => {});

    if (generatedImageId) {
      const img = await prisma.generatedImage.findUnique({
        where: { id: generatedImageId },
        select: { fileUrl: true },
      });
      await prisma.generatedImage.deleteMany({ where: { id: generatedImageId } });
      if (img?.fileUrl) {
        // Best-effort: storage-object opruimen.
        const { getStorageProvider } = await import('../../src/lib/storage');
        await getStorageProvider()
          .delete(img.fileUrl)
          .catch(() => {});
      }
    }
    if (generatedDeliverableId) {
      await prisma.deliverable.deleteMany({ where: { id: generatedDeliverableId } });
    }
    if (deliverableId) await prisma.deliverable.deleteMany({ where: { id: deliverableId } });
    if (campaignId) await prisma.campaign.deleteMany({ where: { id: campaignId } });

    await prisma.apiCallLog.deleteMany({
      where: { workspaceId: { in: [wsA.id, wsB.id] }, createdAt: { gte: startedAt } },
    });
    await prisma.session.deleteMany({ where: { userId: userB.id } });
    // Application-delete cascadet de consent-rij; expliciet is expliciet.
    await prisma.oauthConsent.deleteMany({ where: { clientId } });
    await prisma.oauthApplication.deleteMany({ where: { clientId } });
    // Org-delete cascadet membership + workspace B.
    await prisma.organization.deleteMany({ where: { id: orgB.id } });
    await prisma.user.deleteMany({ where: { id: userB.id } });
    await prisma.$disconnect();
  }

  console.log('\nKlaar.');
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
