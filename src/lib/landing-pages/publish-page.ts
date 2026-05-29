import type { Prisma } from '@prisma/client';

/**
 * Pure functions for publishing + resolving LandingPage records. Extracted
 * from the route handlers so smoke-tests can exercise the persistence logic
 * with a mock PrismaClient — no auth, no Next.js context needed.
 *
 * Routes (src/app/api/landing-pages/*) wrap these with auth + invalidation;
 * keep this module free of side-effects beyond DB writes.
 *
 * Prisma typing: we declare minimal duck-typed interfaces (LandingPageClient
 * + WorkspaceClient) rather than `Pick<PrismaClient, ...>` because Prisma 7
 * `prisma` is a DynamicClientExtensionThis which doesn't structurally match
 * the bare PrismaClient generic. The duck-types accept both the real
 * `prisma` instance + lightweight smoke-test mocks.
 */

interface LandingPageClient {
  landingPage: {
    upsert: (args: {
      where: { workspaceId_slug: { workspaceId: string; slug: string } };
      update: Record<string, unknown>;
      create: Record<string, unknown>;
      select: Record<string, boolean>;
    }) => Promise<{ id: string; slug: string; status: string; publishedAt: Date | null }>;
    findUnique: (args: {
      where: { workspaceId_slug: { workspaceId: string; slug: string } };
      select: Record<string, boolean>;
    }) => Promise<{ puckData: unknown; status: string } | null>;
  };
}

interface WorkspaceClient {
  workspace: {
    findUnique: (args: {
      where: { slug: string };
      select: { id: true };
    }) => Promise<{ id: string } | null>;
  };
}

export interface PublishPageInput {
  workspaceId: string;
  deliverableId: string;
  slug: string;
  puckData: Prisma.InputJsonValue;
}

export interface PublishPageResult {
  id: string;
  slug: string;
  status: 'PUBLISHED';
  publishedAt: Date;
}

/**
 * Validate a user-supplied slug. Constraints chosen so the slug is safe to
 * embed in a URL path without further encoding and reads well in analytics:
 *
 *  - lowercase a-z, 0-9 and single hyphens
 *  - cannot start or end with a hyphen
 *  - 1-80 characters (Vercel SSL cert limit is 64 for the full hostname so
 *    we leave headroom for the workspace prefix + .branddock.app suffix)
 */
const SLUG_PATTERN = /^[a-z0-9](?:[a-z0-9-]{0,78}[a-z0-9])?$/;

export function isValidSlug(slug: string): boolean {
  return SLUG_PATTERN.test(slug);
}

/**
 * Upsert a LandingPage snapshot. Each publish writes a new immutable
 * snapshot of `puckData` so editing the source deliverable afterwards does
 * not affect the live URL — pattern mirrors competitor-snapshot-historie ADR.
 *
 * Slug uniqueness is enforced per workspace at the schema level
 * (`@@unique([workspaceId, slug])`); upserting on that compound key means a
 * re-publish of the same slug overwrites the snapshot in-place rather than
 * accumulating revisions. Phase 5+ may introduce a revisions table for
 * rollback; MVP keeps the latest publish only.
 */
export async function publishLandingPage(
  prisma: LandingPageClient,
  input: PublishPageInput,
): Promise<PublishPageResult> {
  if (!isValidSlug(input.slug)) {
    throw new Error(`Invalid slug "${input.slug}" — must be lowercase a-z, 0-9, hyphens`);
  }

  const publishedAt = new Date();
  const record = await prisma.landingPage.upsert({
    where: {
      workspaceId_slug: {
        workspaceId: input.workspaceId,
        slug: input.slug,
      },
    },
    update: {
      deliverableId: input.deliverableId,
      puckData: input.puckData,
      status: 'PUBLISHED',
      publishedAt,
    },
    create: {
      workspaceId: input.workspaceId,
      deliverableId: input.deliverableId,
      slug: input.slug,
      puckData: input.puckData,
      status: 'PUBLISHED',
      publishedAt,
    },
    select: { id: true, slug: true, status: true, publishedAt: true },
  });

  return {
    id: record.id,
    slug: record.slug,
    status: 'PUBLISHED',
    publishedAt: record.publishedAt ?? publishedAt,
  };
}

/**
 * Resolve a published page for a (workspaceSlug, pageSlug) pair. Used by the
 * public render-route + middleware. Returns null when nothing is published
 * yet (route should 404).
 */
export async function resolvePublishedPage(
  prisma: LandingPageClient & WorkspaceClient,
  workspaceSlug: string,
  pageSlug: string,
): Promise<{ workspaceId: string; puckData: unknown } | null> {
  const workspace = await prisma.workspace.findUnique({
    where: { slug: workspaceSlug },
    select: { id: true },
  });
  if (!workspace) return null;

  const page = await prisma.landingPage.findUnique({
    where: {
      workspaceId_slug: {
        workspaceId: workspace.id,
        slug: pageSlug,
      },
    },
    select: { puckData: true, status: true },
  });
  if (!page || page.status !== 'PUBLISHED') return null;

  return { workspaceId: workspace.id, puckData: page.puckData };
}
