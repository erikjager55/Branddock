-- Web-page builder MVP (ADR 2026-05-22-landing-page-builder-architectuur).
--
-- LandingPage:
--   Immutable snapshot per slug-versie at publish-time. Editing the source
--   deliverable.settings.puckData afterwards does NOT mutate the live URL —
--   pattern mirrors CompetitorSnapshot from ADR 2026-05-08. MVP keeps the
--   latest publish only (upsert on workspaceId_slug); revisions table is
--   v2 work.
--
-- DomainMapping:
--   Schema-only in Phase 1. Provisioning (Vercel Domains API + Let's
--   Encrypt SSL) is v2; the table is seeded now so Phase 2/3 code can type
--   against the relation without a follow-up migration.

CREATE TYPE "PageStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');

CREATE TYPE "SslStatus" AS ENUM ('PENDING', 'PROVISIONING', 'ACTIVE', 'FAILED');

-- LandingPage
CREATE TABLE "LandingPage" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "deliverableId" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "puckData" JSONB NOT NULL,
    "status" "PageStatus" NOT NULL DEFAULT 'DRAFT',
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LandingPage_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "LandingPage_workspaceId_slug_key"
    ON "LandingPage"("workspaceId", "slug");

CREATE INDEX "LandingPage_workspaceId_status_idx"
    ON "LandingPage"("workspaceId", "status");

CREATE INDEX "LandingPage_deliverableId_idx"
    ON "LandingPage"("deliverableId");

ALTER TABLE "LandingPage"
    ADD CONSTRAINT "LandingPage_workspaceId_fkey"
    FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "LandingPage"
    ADD CONSTRAINT "LandingPage_deliverableId_fkey"
    FOREIGN KEY ("deliverableId") REFERENCES "Deliverable"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

-- DomainMapping (v2 schema-only)
CREATE TABLE "DomainMapping" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "domain" TEXT NOT NULL,
    "verifiedAt" TIMESTAMP(3),
    "sslStatus" "SslStatus" NOT NULL DEFAULT 'PENDING',
    "vercelDomainId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DomainMapping_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "DomainMapping_domain_key"
    ON "DomainMapping"("domain");

CREATE INDEX "DomainMapping_workspaceId_idx"
    ON "DomainMapping"("workspaceId");

ALTER TABLE "DomainMapping"
    ADD CONSTRAINT "DomainMapping_workspaceId_fkey"
    FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
