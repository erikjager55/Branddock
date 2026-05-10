---
id: publishgate-findings-block
title: Δ-1 Surface E — PublishGate findings-block voor interne content
fase: pre-launch
priority: now
effort: 1 dag
owner: claude-code
status: in-progress
created: 2026-05-10
completed: -
related-adr: 2026-05-08-fval-output-schema-bevindingen
related-spec: -
worktree: -
---

# Probleem

Δ-1 Surface C (Tab 3 UI) en Surface D (Brand Assistant chat-tool) zijn live op `main`, maar beide werken alleen op **externe** content (paste/url). Voor **interne** AI-gegenereerde deliverables in de Content Canvas schrijft `runFidelityScoring()` wel een `ContentFidelityScore` met composite-score + pillar-blob, maar genereert geen structured `BrandReviewFinding` rijen. Gevolg: PublishGate (changelog #230/#233) blokkeert wel op score < threshold, maar toont alleen "Score 42 / drempel 70" zonder uit te leggen welke specifieke issues de score zo laag maken. User moet handmatig Tab 3 openen of zelf gaan zoeken — friction die de override-modal eerder uitlokt dan een fix.

Schema staat al voor: `BrandReviewFinding.fidelityScoreId` is een nullable FK (XOR met `contentReviewLogId`) en de Prisma-relatie is gedefineerd op `ContentFidelityScore.findings[]`.

# Voorstel

Drie gefocuste wijzigingen die de bestaande external-content findings-flow uitbreiden naar de interne Canvas-flow:

1. **Refactor**: `mapViolationToFindingInput` + `mapSeverity` + `inferCategory` uit `external-content-runner.ts` extracten naar `src/lib/brand-fidelity/violation-to-finding.ts` (shared util). Beide runners importeren.
2. **Persistence**: in `persistContentFidelityScoreIfPossible`, na de `ContentFidelityScore.create`, óók `BrandReviewFinding.createMany` aanroepen met `fidelityScoreId` → de zojuist gecreëerde score.id. Nested-create binnen één transaction zoals external runner.
3. **UI + API**: nieuwe GET `/api/alignment/internal-findings/[fidelityScoreId]/route.ts` mirror van Surface C's GET endpoint (workspace-isolated, severity-rank sort, thresholdMet flag). PublishGate v.b.: wanneer `data.latestScore` aanwezig én `compositeScore < threshold`, render een uitvouwbaar findings-block met top-3 HIGH-severity findings (severity-pill + category-label + description + suggestion). Dit block staat boven de override-modal-knop zodat de user gemotiveerd is om eerst te fixen ipv overriden.

# Acceptatiecriteria

- [ ] `mapViolationToFindingInput` + helpers verplaatst naar `src/lib/brand-fidelity/violation-to-finding.ts`; beide runners importeren ervan; `npx tsc --noEmit` 0 errors
- [ ] `persistContentFidelityScoreIfPossible` schrijft `BrandReviewFinding` rijen met `fidelityScoreId` na `ContentFidelityScore.create`; atomic in dezelfde Prisma-call via nested-create
- [ ] Nieuwe GET `/api/alignment/internal-findings/[fidelityScoreId]/route.ts` retourneert `{ compositeScore, thresholdMet, findings: [...] }` met workspace-isolation + severity-rank sort
- [ ] `useInternalFindings(fidelityScoreId)` hook in `src/hooks/` met TanStack Query (`staleTime: Infinity` per ADR-2 immutability)
- [ ] `PublishGate.tsx` rendert findings-block wanneer score < threshold; top-3 HIGH met severity-pill + description + suggestion; "View all N findings" deep-link naar Tab 3
- [ ] Hard-block UX behouden: findings-block toont issues maar verbergt de override-modal-knop niet (user kan alsnog override + audit-trail emit)
- [ ] Smoke-test `scripts/smoke-tests/internal-findings.ts` — genereer mock deliverable + content-version, run `runFidelityScoring`, verifieer findings persisted en findbaar via GET endpoint
- [ ] `npm run lint` 0 errors in nieuwe files
- [ ] Manual UX-smoke: deliverable met sub-threshold score → PublishGate toont concrete findings — user-action vóór live productie

# Bestanden die ik aanraak

**Server**:
- `src/lib/brand-fidelity/violation-to-finding.ts` (nieuw) — shared util ~50 regels
- `src/lib/brand-fidelity/external-content-runner.ts` (modify) — vervang inline helpers door imports uit shared util
- `src/lib/brand-fidelity/fidelity-runner.ts` (modify) — `persistContentFidelityScoreIfPossible` extend met findings-write, ~25 regels
- `src/app/api/alignment/internal-findings/[fidelityScoreId]/route.ts` (nieuw) — GET endpoint, ~80 regels

**Client**:
- `src/hooks/useInternalFindings.ts` (nieuw) — TanStack hook, ~30 regels
- `src/features/campaigns/components/canvas/PublishGate.tsx` (modify) — findings-block component + render-conditie, ~80 regels toegevoegd

**Tests**:
- `scripts/smoke-tests/internal-findings.ts` (nieuw) — ~120 regels

**Documentatie**:
- `tasks/publishgate-findings-block.md` (deze)
- `docs/changelog.md` (entry #245 bij task-finalize)

# Bestanden die ik NIET aanraak

- `prisma/schema.prisma` — XOR-shape (`fidelityScoreId` of `contentReviewLogId`) al aanwezig in `BrandReviewFinding`
- `src/lib/brand-fidelity/composition-engine.ts` — score-engine ongewijzigd
- `src/components/brand-alignment/ContentReviewTab.tsx` — Surface C UI, hergebruikt voor "View all" deep-link target
- `src/app/api/alignment/review-external/[reviewLogId]/route.ts` — Surface C GET endpoint, blijft externe-content path
- `src/app/api/studio/[deliverableId]/publish-with-override/route.ts` — override-flow ongewijzigd, alleen UI eromheen verandert
- `src/lib/learning-loop/content-readiness.ts` — gate-logic ongewijzigd

# Smoke test plan

**Server-side smoke** (`npm run smoke:internal-findings`):

1. Setup — pak een deliverable in BB workspace met bestaande ContentVersion
2. Roep `runFidelityScoring()` direct aan met fluff-rijke content (forceer lage score + violations)
3. Verifieer dat ContentFidelityScore is aangemaakt
4. Verifieer dat BrandReviewFinding rijen bestaan met `fidelityScoreId === contentFidelityScore.id`
5. Verifieer XOR — `contentReviewLogId === null` op alle internal findings
6. Verifieer severity-mapping (rule-compiler 'error' → HIGH, 'warning' → MEDIUM)
7. GET endpoint round-trip — fetch via `/api/alignment/internal-findings/[id]`, verifieer workspace-isolation
8. Cleanup — orphaned ContentFidelityScore + findings via cascade (deliverable retention beheert lifecycle)

**Manual UX-smoke** (user-action vóór live productie):

1. Genereer een sub-threshold deliverable in Canvas (bv. fluff-rijke ad-copy)
2. Open PublishGate — verifieer dat findings-block verschijnt met concrete issues
3. Klik "View all N findings" — opent Tab 3 (graceful fallback indien URL-param parser nog niet bestaat)
4. Override-flow blijft werken: open modal, type 10+ char reden, confirm → publish
5. Audit-trail event bevat reden zoals voorheen

# Risico's

- **Async persist non-fatal**: `persistContentFidelityScoreIfPossible` is `void` (fire-and-forget) — als findings-write faalt blijft de score persistented zonder findings, en PublishGate rendert geen findings-block (graceful empty state). **Mitigatie**: catch in dezelfde try/catch als ContentFidelityScore-write, console.warn "internal findings persist failed".
- **Dubbel-render**: zowel ContentFidelityScore.ruleViolations JSON-blob als BrandReviewFinding rijen bevatten violation-data. Twee bronnen kunnen divergeren bij latere refactors. **Mitigatie**: BrandReviewFinding wordt source-of-truth voor UI; ruleViolations JSON-blob blijft voor backwards-compat (legacy hooks die het lezen) maar wordt niet meer in Surface E gebruikt.
- **Latency-impact**: extra `BrandReviewFinding.createMany` voegt ~10-50ms toe aan elke generate-call. **Mitigatie**: nested-create in dezelfde transaction (1 round-trip extra max), niet aparte query; persist is al async voor de orchestrator.
- **PublishGate complexity-creep**: component groeit van pure score+modal naar score+findings+modal. **Mitigatie**: findings-block als sub-component (`PublishGateFindingsBlock`) zodat hoofd-component overzichtelijk blijft.

# Out of scope

- URL-param parser in `BrandAlignmentPage` voor `?tab=review&fidelityScoreId=...` deep-link pre-load — separate task (zelfde caveat als Surface D)
- ContentReviewLog-merge — interne en externe paths blijven 2 entities (XOR-relatie op finding is bewuste keuze)
- "Apply suggestion" inline-fix in PublishGate — Δ-1 v2
- Findings-history naast huidige score (alleen latest-score render) — Δ-1 v2
- Streaming partial findings tijdens generate — Anthropic SDK constraint
- Per-workspace threshold-override via UI — separate task
- Surface E wireframe redesign — pure incremental enhancement bovenop bestaande PublishGate
- Migratie van legacy `Deliverable.settings.fidelityScore` JSON-blob — separate cleanup-task

# Notes

**Phase -1 Gates resultaat**:
- Simplicity Gate: PASS (7 files totaal incl. test, geen nieuwe modules, geen abstractielagen)
- Anti-Abstraction Gate: PASS (refactor-extract is exact dezelfde mapper-logica naar shared util; geen wrapper-toevoegingen)
- Integration-First Gate: PASS (GET endpoint shape mirror van Surface C; UI-component pattern al gevestigd)

**ADR-noodzaak**: NEE
- Geen schema-wijziging (XOR al in `BrandReviewFinding`)
- Geen nieuwe `src/lib/<module>/` directory (`brand-fidelity/` bestaat)
- Geen nieuwe library-install
- Geen pattern-introductie buiten conventies

**Cross-links**:
- Surface C task: `tasks/done/content-review-tab-3-ui.md` (entry #243)
- Surface D task: `tasks/done/content-review-chat-tool.md` (entry #244)
- Δ-1 sub-cluster A+B engine: changelog entry #239
- ADR-1 BrandReviewFinding model: `docs/adr/2026-05-08-fval-output-schema-bevindingen.md`
- PublishGate baseline: changelog entry #230 (gate) + #233 (Step4Timeline integratie)

**Volgende stap na done**: Δ-1 v2 follow-ups (apply-suggestion inline-fix, findings-history, multi-document compare) of pivot naar pilot-feedback over alle drie surfaces (C+D+E).
