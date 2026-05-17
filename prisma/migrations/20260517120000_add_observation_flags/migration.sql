-- Strategy Analyst stub (ADR 2026-05-08) — Phase A user-flag velden.
-- Read/Acted/Dismissed timestamps op StrategyObservation voor de
-- "Insights" Tab 4 user-flow. Geen autonomy — flags zijn user-driven,
-- agent persist alleen new observations.

ALTER TABLE "StrategyObservation" ADD COLUMN "markedReadAt" TIMESTAMP(3);
ALTER TABLE "StrategyObservation" ADD COLUMN "markedActedAt" TIMESTAMP(3);
ALTER TABLE "StrategyObservation" ADD COLUMN "dismissedAt" TIMESTAMP(3);
ALTER TABLE "StrategyObservation" ADD COLUMN "dismissReason" TEXT;

-- Filter-index voor "non-dismissed observations" — Tab 4 default-view.
CREATE INDEX "StrategyObservation_workspaceId_dismissedAt_idx"
    ON "StrategyObservation"("workspaceId", "dismissedAt");
