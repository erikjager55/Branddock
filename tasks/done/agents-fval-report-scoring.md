---
id: agents-fval-report-scoring
title: F-VAL-score op rauwe content-REPORTs (ADR D5-gat uit dogfood-ronde 1/2)
fase: pre-launch
priority: now
effort: 0,5 dag
owner: claude-code (autonoom, vervolg-directive "pak alle punten op")
status: done
completed: 2026-07-12
created: 2026-07-12
related-adr: 2026-07-05-agents-architectuur.md (D5: F-VAL-poort verplicht op content-producerende agents)
related-spec: docs/reports/agents-dogfood-2026-07-07.md (bevinding #1) + -2026-07-12.md (bevinding #5)
worktree: branddock-agents-fval-reports (branch fix/agents-fval-report-scoring)
---

# Probleem

ADR D5 eist "elke content-output toont fidelity-score + findings — nooit een stille lage score", maar `AgentArtifact.fidelityScore` blijft `NULL` op alle content-REPORTs van de content-creator (Milo). Alleen brand-guardian (eigen tool) en het confirm-pad (LINK-artefact) vullen 'm. De concept-banner (ronde-1-mitigatie) labelt het draft-oppervlak wél, maar een gebruiker die het concept kopieert heeft nog steeds geen score. Beide dogfood-rondes noteerden dit als open bevinding.

# Ontwerp

- Nieuw `src/lib/agents/registry/fval-report-contract.ts`: `reportScoringOutputContract` — wrapper om `artifactOutputContract` (zelfde parse; persist = base-persist → daarna F-VAL op de zojuist aangemaakte REPORT-artefacten).
- Scoring via `runBrandFitReview(..., registerArtifact: false)` (hergebruik fval-gate: 4-min-deadline + alignment/dashboard-cache-invalidatie) → `AgentArtifact.fidelityScore = compositeScore` (post-update; het HELE enrichment-blok fail-soft — een throw ná de atomaire finalize zou de COMPLETED-run onterecht FAILED maken én de billable-charge skippen).
- Alleen op COMPLETED, niet-getrunceerde runs: in de propose-flow is het REPORT een meta-narratief (de echte content scoort op het confirm-pad); truncated output scoren is ruis.
- `fidelityScore` is nu server-owned in het gedeelde contract: model-authored scores op REPORT/LINK worden gestript (forged-badge-bypass gedicht; foundation-smoke bijgewerkt, 14/14).
- Scope: alleen REPORTs met `content.markdown`, géén `answerFallback` (generiek antwoord ≠ content), ≥ 50 woorden (fidelity-floor-conventie).
- Alleen de **content-creator** krijgt dit contract (D5: content-producerende agents; strategist-REPORTs zijn strategie, geen kanaal-content).
- UI: geen werk — `ArtifactViewer` rendert al een `FidelityBadge` zodra `fidelityScore` een getal is.
- Bijeffect (gewenst): de score loopt via de externe-content-runner en landt dus ook als `ContentReviewLog` in Brand Alignment — zelfde pad als Vera's review.

# Acceptatiecriteria

- [x] Milo-run (dogfood-harnas): v1 `REPORT(F-VAL 71)` + v2 (na review-herwerking) `REPORT(F-VAL 66)` — beide COMPLETED, ~$0,076, run-gedrag ongewijzigd
- [x] Fallback-REPORTs (answerFallback) en <50-woorden-REPORTs worden niet gescoord (guards in persist-pad)
- [x] Score-fout is fail-soft (warn, geen run-failure) — try/catch per artefact, run al gefinaliseerd
- [x] Latency-delta: scoring draait ná de atomaire run-finalize (run-row-latency ongewijzigd); harnas-run totaal bleef <30s
- [x] `npx tsc --noEmit` 0 errors; eslint schoon; geen circulaire imports (eigen module)

# Smoke-test

`DOGFOOD_ONLY=content-creator`-run toont `REPORT(F-VAL <score>)` in de harnas-output.

# Out-of-scope

- F-VAL op strategist/market-analyst-REPORTs (geen kanaal-content)
- Auto-iterate onder de drempel op het draft-oppervlak (de banner + score volstaan pre-launch; auto-iterate draait al op het confirm-pad)

# Review

code-reviewer subagent: 1 CRITICAL (findMany buiten fail-soft → run-flip + billing-miss) + 4 WARNINGs (deadline, cache-invalidatie regel #10, status-scoping, forged-score-bypass) — alle verwerkt via de `runBrandFitReview`-hergebruik-route die de reviewer aandroeg. MINORs gedocumenteerd: F-VAL-judge-kosten niet in run-`totalCostUsd` (zelfde gat als fval-gate); agent-reviews in Brand Alignment niet te onderscheiden van user-pastes (fval-gate-precedent).
