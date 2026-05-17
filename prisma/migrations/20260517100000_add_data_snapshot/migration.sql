-- Brandclaw foundation (ADR 2026-05-08-brandclaw-agent-architectuur) —
-- DataSnapshot model voor immutable point-in-time inputs naar
-- StrategyAnalyst observations. Reproducibility-borg: past observations
-- blijven herleidbaar nadat live tables muteren.
--
-- SourceType (v1): 'alignment_scan' / 'content_fidelity' / 'review_log' /
-- 'voiceguide'. Geen DB-enum zodat nieuwe sources zonder migration kunnen
-- worden toegevoegd; validation via TS-union in data-source-registry.

CREATE TABLE "DataSnapshot" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "sourceType" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "snapshotAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DataSnapshot_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "DataSnapshot_workspaceId_sourceType_snapshotAt_idx"
    ON "DataSnapshot"("workspaceId", "sourceType", "snapshotAt");

CREATE INDEX "DataSnapshot_sourceType_sourceId_idx"
    ON "DataSnapshot"("sourceType", "sourceId");

ALTER TABLE "DataSnapshot"
    ADD CONSTRAINT "DataSnapshot_workspaceId_fkey"
    FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
