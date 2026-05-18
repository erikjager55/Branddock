-- Brandclaw foundation (ADR 2026-05-08-brandclaw-agent-architectuur) —
-- StrategyObservation + StrategyObservationRun voor versioned + immutable
-- agent-output. AgentVersion + promptVersion stempel maken drift-detection
-- en A/B-testing van prompt-changes mogelijk over tijd. Evidence-veld
-- linkt DataSnapshot rows zodat past observations point-in-time
-- reproduceerbaar zijn.
--
-- ObservationSeverity (HIGH/MEDIUM/LOW) is bewust apart van bestaande
-- IssueSeverity (CRITICAL/WARNING/SUGGESTION) — andere semantiek.
-- ObservationConfidence implementeert two-reasons-toets (methodology §11).

CREATE TYPE "ObservationSeverity" AS ENUM ('HIGH', 'MEDIUM', 'LOW');
CREATE TYPE "ObservationConfidence" AS ENUM ('HIGH', 'MEDIUM', 'LOW');

CREATE TABLE "StrategyObservationRun" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "triggerType" TEXT NOT NULL,
    "triggerSource" TEXT,
    "agentVersion" TEXT NOT NULL,
    "promptVersion" TEXT NOT NULL,
    "toolCallTrace" JSONB NOT NULL,
    "totalCostUsd" DECIMAL(10,6) NOT NULL,
    "latencyMs" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StrategyObservationRun_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "StrategyObservationRun_workspaceId_createdAt_idx"
    ON "StrategyObservationRun"("workspaceId", "createdAt");
CREATE INDEX "StrategyObservationRun_triggerType_idx"
    ON "StrategyObservationRun"("triggerType");

ALTER TABLE "StrategyObservationRun"
    ADD CONSTRAINT "StrategyObservationRun_workspaceId_fkey"
    FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "StrategyObservation" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "runId" TEXT NOT NULL,
    "dimension" TEXT NOT NULL,
    "severity" "ObservationSeverity" NOT NULL,
    "confidence" "ObservationConfidence" NOT NULL,
    "summary" TEXT NOT NULL,
    "evidence" JSONB NOT NULL,
    "agentVersion" TEXT NOT NULL,
    "promptVersion" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StrategyObservation_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "StrategyObservation_workspaceId_createdAt_idx"
    ON "StrategyObservation"("workspaceId", "createdAt");
CREATE INDEX "StrategyObservation_workspaceId_dimension_idx"
    ON "StrategyObservation"("workspaceId", "dimension");
CREATE INDEX "StrategyObservation_runId_idx"
    ON "StrategyObservation"("runId");

ALTER TABLE "StrategyObservation"
    ADD CONSTRAINT "StrategyObservation_workspaceId_fkey"
    FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "StrategyObservation"
    ADD CONSTRAINT "StrategyObservation_runId_fkey"
    FOREIGN KEY ("runId") REFERENCES "StrategyObservationRun"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
