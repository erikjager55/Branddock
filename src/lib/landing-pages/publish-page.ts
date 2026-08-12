import type { Prisma } from '@prisma/client';

/**
 * Pure functions for publishing + resolving LandingPage records. Extracted
 * from the route handlers so smoke-tests can exercise the persistence logic
 * with a mock PrismaClient — no auth, no Next.js context needed.
 *
 * Routes (src/app/api/landing-pages/*) wrap these with auth + invalidation;
 * keep this module free of side-effects beyond DB writes.
 *
 * P1 versioned publishes (verbeterplan §Fase A): elke publish maakt een
 * append-only `PagePublish`-snapshot (version = max+1) en zet
 * `LandingPage.livePublishId` naar die rij (Framer/Netlify-model: immutable
 * versies + pointer; rollback = pointer-swap). `LandingPage.puckData` blijft
 * als legacy-mirror bestaan voor rijen van vóór de versionering.
 *
 * Prisma typing: we declare minimal duck-typed interfaces rather than
 * `Pick<PrismaClient, ...>` because Prisma 7 `prisma` is a
 * DynamicClientExtensionThis which doesn't structurally match the bare
 * PrismaClient generic. The duck-types accept both the real `prisma`
 * instance + lightweight smoke-test mocks; routes cast via
 * `prisma as unknown as Parameters<typeof fn>[0]`.
 */

interface LandingPageClient {
  landingPage: {
    upsert: (args: {
      where: { workspaceId_locale_slug: { workspaceId: string; locale: string; slug: string } };
      update: Record<string, unknown>;
      create: Record<string, unknown>;
      select: Record<string, boolean>;
    }) => Promise<{ id: string; slug: string; status: string; publishedAt: Date | null }>;
    // Content-locale foundation: read by (workspaceId, slug) is locale-agnostisch
    // (single page per slug vandaag; locale-routing is LATER). Compound-unique
    // [workspaceId, locale, slug] wordt alleen bij publish-upsert gebruikt.
    // `select` is `Record<string, unknown>` (niet boolean) zodat de geneste
    // livePublish-select van de pointer-resolutie erdoorheen past.
    findFirst: (args: {
      where: { workspaceId: string; slug: string };
      select: Record<string, unknown>;
    }) => Promise<{
      puckData: unknown;
      status: string;
      livePublish?: { puckData: unknown } | null;
    } | null>;
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

/**
 * Model-delegates die binnen de publish-transactie gebruikt worden. Ook het
 * shape van de `$transaction`-callback-parameter — het echte
 * Prisma.TransactionClient én de smoke-mock voldoen er structureel aan.
 */
interface PublishTxClient {
  landingPage: {
    upsert: LandingPageClient['landingPage']['upsert'];
    update: (args: {
      where: { id: string };
      data: Record<string, unknown>;
    }) => Promise<unknown>;
  };
  pagePublish: {
    findFirst: (args: {
      where: { landingPageId: string };
      orderBy: { version: 'desc' };
      select: { version: true };
    }) => Promise<{ version: number } | null>;
    create: (args: {
      data: Record<string, unknown>;
      select: { id: true; version: true };
    }) => Promise<{ id: string; version: number }>;
  };
}

interface PublishClient {
  $transaction: <T>(fn: (tx: PublishTxClient) => Promise<T>) => Promise<T>;
}

/** Client-shape voor de versie-historie-helpers (list + rollback). */
interface PublishHistoryClient {
  landingPage: {
    findUnique: (args: {
      where: { id: string };
      select: { livePublishId: true };
    }) => Promise<{ livePublishId: string | null } | null>;
    update: (args: {
      where: { id: string };
      data: Record<string, unknown>;
    }) => Promise<unknown>;
  };
  pagePublish: {
    findFirst: (args: {
      where: { id: string; landingPageId: string };
      select: { id: true; version: true };
    }) => Promise<{ id: string; version: number } | null>;
    findMany: (args: {
      where: { landingPageId: string };
      orderBy: { version: 'desc' };
      select: Record<string, boolean>;
    }) => Promise<
      Array<{ id: string; version: number; createdAt: Date; publishedById: string | null }>
    >;
  };
}

export interface PublishPageInput {
  workspaceId: string;
  deliverableId: string;
  slug: string;
  /** BCP-47 content-locale (default-profiel-resolutie); part of the compound unique. */
  locale: string;
  puckData: Prisma.InputJsonValue;
  /** User-id van de publisher — audit-veld op de PagePublish-snapshot (additief). */
  publishedById?: string;
}

export interface PublishPageResult {
  id: string;
  slug: string;
  status: 'PUBLISHED';
  publishedAt: Date;
  /** Versienummer van de zojuist aangemaakte PagePublish-snapshot (additief). */
  version: number;
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
 * Publish a page: upsert the LandingPage row (status PUBLISHED, publishedAt)
 * AND append an immutable `PagePublish`-snapshot with `version = max + 1`,
 * then point `livePublishId` at the new snapshot — all in one transaction.
 *
 * Slug uniqueness is enforced per workspace at the schema level
 * (`@@unique([workspaceId, locale, slug])`). Re-publishing the same slug adds
 * a new version instead of overwriting history; the legacy
 * `LandingPage.puckData` column is mirrored for pre-versioning readers.
 *
 * Concurrency: two simultaneous publishes of the same page can race on
 * `max(version) + 1`; the `@@unique([landingPageId, version])` constraint
 * makes the loser fail (P2002) instead of silently duplicating a version —
 * the caller surfaces that as a retryable error.
 */
export async function publishLandingPage(
  prisma: PublishClient,
  input: PublishPageInput,
): Promise<PublishPageResult> {
  if (!isValidSlug(input.slug)) {
    throw new Error(`Invalid slug "${input.slug}" — must be lowercase a-z, 0-9, hyphens`);
  }

  const publishedAt = new Date();
  const { record, version } = await prisma.$transaction(async (tx) => {
    const record = await tx.landingPage.upsert({
      where: {
        workspaceId_locale_slug: {
          workspaceId: input.workspaceId,
          locale: input.locale,
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
        locale: input.locale,
        puckData: input.puckData,
        status: 'PUBLISHED',
        publishedAt,
      },
      select: { id: true, slug: true, status: true, publishedAt: true },
    });

    const latest = await tx.pagePublish.findFirst({
      where: { landingPageId: record.id },
      orderBy: { version: 'desc' },
      select: { version: true },
    });
    const publish = await tx.pagePublish.create({
      data: {
        landingPageId: record.id,
        version: (latest?.version ?? 0) + 1,
        puckData: input.puckData,
        publishedById: input.publishedById ?? null,
      },
      select: { id: true, version: true },
    });

    await tx.landingPage.update({
      where: { id: record.id },
      data: { livePublishId: publish.id },
    });

    return { record, version: publish.version };
  });

  return {
    id: record.id,
    slug: record.slug,
    status: 'PUBLISHED',
    publishedAt: record.publishedAt ?? publishedAt,
    version,
  };
}

/**
 * Resolve a published page for a (workspaceSlug, pageSlug) pair. Used by the
 * public render-route + middleware. Returns null when nothing is published
 * yet (route should 404).
 *
 * Versioned resolution: when `livePublishId` is set the live snapshot is
 * `livePublish.puckData`; legacy rows (pre-versioning, pointer null) fall
 * back to the old `LandingPage.puckData` column. Same signature + return
 * shape as before — callers are unaffected.
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

  const page = await prisma.landingPage.findFirst({
    where: {
      workspaceId: workspace.id,
      slug: pageSlug,
    },
    select: {
      puckData: true,
      status: true,
      livePublish: { select: { puckData: true } },
    },
  });
  if (!page || page.status !== 'PUBLISHED') return null;

  return {
    workspaceId: workspace.id,
    puckData: page.livePublish?.puckData ?? page.puckData,
  };
}

export interface PagePublishListItem {
  id: string;
  version: number;
  createdAt: Date;
  publishedById: string | null;
  /** True wanneer `LandingPage.livePublishId` naar deze snapshot wijst. */
  isLive: boolean;
}

/**
 * List all publish-versions of a landing page, newest first, with an
 * `isLive`-flag derived from the page's `livePublishId`-pointer. Read-only;
 * feeds the publish-UI version list.
 */
export async function listPagePublishes(
  prisma: PublishHistoryClient,
  landingPageId: string,
): Promise<PagePublishListItem[]> {
  const page = await prisma.landingPage.findUnique({
    where: { id: landingPageId },
    select: { livePublishId: true },
  });
  const rows = await prisma.pagePublish.findMany({
    where: { landingPageId },
    orderBy: { version: 'desc' },
    select: { id: true, version: true, createdAt: true, publishedById: true },
  });
  return rows.map((row) => ({ ...row, isLive: row.id === page?.livePublishId }));
}

/**
 * Rollback: repoint `livePublishId` to an earlier snapshot (Netlify-model —
 * rollback is a pointer-swap, never a data-mutation). Validates that the
 * publish belongs to the given landing page (throws otherwise). Deliberately
 * only the repoint: the caller owns cache-revalidation (`revalidatePath`).
 */
export async function rollbackToPublish(
  prisma: PublishHistoryClient,
  args: { landingPageId: string; publishId: string },
): Promise<{ liveVersion: number }> {
  const publish = await prisma.pagePublish.findFirst({
    where: { id: args.publishId, landingPageId: args.landingPageId },
    select: { id: true, version: true },
  });
  if (!publish) {
    throw new Error(
      `Publish ${args.publishId} does not belong to landing page ${args.landingPageId}`,
    );
  }

  await prisma.landingPage.update({
    where: { id: args.landingPageId },
    data: { livePublishId: publish.id },
  });

  return { liveVersion: publish.version };
}
