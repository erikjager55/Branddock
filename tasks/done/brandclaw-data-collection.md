---
id: brandclaw-data-collection
title: Brandclaw foundation — DataSource registry + DataSnapshot model + time-window queries
fase: pre-launch
priority: now
effort: 5-7 dagen
owner: claude-code
status: done
created: 2026-05-08
completed: 2026-05-17
related-adr: 2026-05-08-brandclaw-agent-architectuur
related-spec: tasks/_drafts/idea-brand-control-program.md
worktree: branddock-brandclaw
---

# Completion-note (2026-05-17)

Foundation geleverd in twee sub-fasen op `branddock-brandclaw` worktree
(rebased onto main, 132 commits, fast-forward 0 ahead bij start).

**Fase 1 (commit 90aa24ab)**:
- DataSnapshot Prisma model + formele migration met IVFFlat-ready
  indexes (workspaceId+sourceType+snapshotAt, sourceType+sourceId).
- Time-window primitives: `sinceNDaysAgo` / `between` / `sinceVersion`
  / `allTime` met `TimeWindow.toWhere(field)` Prisma-fragment-helper.
- DataSource registry singleton + lazy-init pattern.
- alignment_scan source-accessor met snapshot-materializatie per scan
  in transaction.

**Fase 2 (commit 1088b83a)**:
- StrategyObservation + StrategyObservationRun models (versioned met
  agentVersion + promptVersion) + 2 enums (ObservationSeverity /
  ObservationConfidence per ADR-2 two-reasons-toets).
- content_fidelity source: ContentFidelityScore + BrandReviewFinding
  counts per severity/category in snapshot-payload.
- review_log source: ContentReviewLog uit Δ-1 paste-in flow.
- voiceguide source: drift via ResourceVersion-historie (VOICEGUIDE
  enum) + huidige state als baseline voor diff-walk.
- Registry lazy-importeert nu alle 4 v1 sources parallel via
  Promise.all.

Smoke-test van 16/16 (Fase 1) naar 29/29 (Fase 2) — time-window
edge-cases + alle 4 sources empty-workspace queries + registry
isolation.

Worktree-naam in frontmatter aangepast naar branddock-brandclaw (oude
"branddock-program-p3" was draft-naam in task-file; actual worktree
heet branddock-brandclaw conform roadmap.md track-naming).

Unblockt: `brandclaw-tool-orchestrator` (volgende task — Anthropic
tool-use orchestrator die deze 4 sources via tools exposed aan
Strategy Analyst agent-loop).

# Probleem

ADR-2 vergrendelt de Brandclaw-architectuur op vier elementen: tool-use, versioned observations, immutable DataSnapshot, no-autonomy-in-stub. Voordat de eerste node (Strategy Analyst-stub) gebouwd kan worden moet de **data-laag** staan. Live tables (AlignmentScan, ContentFidelityScore, ContentReviewLog, BrandVoiceguide) muteren tussen Analyst-runs — past observations zijn dan niet reproduceerbaar wanneer Better Brands over 3 maanden vraagt waarom Analyst X suggereerde.

Twee fundamentele behoeften:
1. **DataSource registry** — Analyst (en future nodes) moet weten welke data-bronnen beschikbaar zijn + hoe te queryen via tool-use. Per ADR-2: query_alignment_history / query_content_fidelity / query_review_history / query_brand_voice_drift.
2. **Immutable point-in-time snapshots** — elke Analyst-run moet zijn input vastleggen zodat past observations herleidbaar zijn. ADR-2 specificeert `DataSnapshot` model met `payload: Json` immutable copy.

Plus: **time-window queries** als gedeelde primitive — "AlignmentScan rows since 30 days ago", "ContentFidelityScore rows for contentType X since version Y". Analyst-tools roepen consistent dezelfde abstractie aan i.p.v. ad-hoc Prisma queries per tool.

# Voorstel

Drie deliverables in `src/lib/brandclaw/`:

1. **DataSnapshot Prisma model** + migration (per ADR-2 schema)
2. **DataSource registry** — TypeScript module die per source-type een typed accessor exposeert (`alignment_scan` / `content_fidelity` / `review_log` / `voiceguide`) met query-by-time-window + snapshot-on-read patroon
3. **Time-window query primitives** — pure functies `sinceNDaysAgo(n)`, `sinceVersion(v)`, `between(from, to)` die Prisma-where-clauses produceren consistent over alle sources

Elke DataSource accessor doet bij query: (1) Prisma-fetch op live data, (2) materialize als immutable DataSnapshot row, (3) return zowel data + snapshot-id zodat downstream observations evidence-link kunnen leggen.

# Acceptatiecriteria

## Schema
- [ ] `prisma/schema.prisma` — `DataSnapshot` model per ADR-2 spec (id, workspaceId, sourceType, sourceId, snapshotAt, payload Json, cascade-relation naar Workspace)
- [ ] Index op `(workspaceId, sourceType, snapshotAt)` voor time-window queries
- [ ] `prisma/migrations/<timestamp>_add_data_snapshot/migration.sql` — additief
- [ ] Geen wijzigingen aan bestaande modellen (additief-only per ADR-2)

## DataSource registry
- [ ] `src/lib/brandclaw/data-sources/index.ts` — `DataSourceRegistry` met `getSource(sourceType): DataSourceAccessor` lookup
- [ ] `src/lib/brandclaw/data-sources/types.ts` — `DataSourceAccessor` interface met `query(workspaceId, window): Promise<{ rows: T[]; snapshotIds: string[] }>` signature
- [ ] `src/lib/brandclaw/data-sources/alignment-scan-source.ts` — accessor voor AlignmentScan + AlignmentIssue rows; snapshot includeert finding-counts per severity
- [ ] `src/lib/brandclaw/data-sources/content-fidelity-source.ts` — accessor voor ContentFidelityScore + BrandReviewFinding rows; snapshot includeert composite + pillar-scores + finding-distribution
- [ ] `src/lib/brandclaw/data-sources/review-log-source.ts` — accessor voor ContentReviewLog rows (uit Δ-1); snapshot includeert source-mix + duration-distribution
- [ ] `src/lib/brandclaw/data-sources/voiceguide-source.ts` — accessor voor BrandVoiceguide changes (uses ResourceVersion-historie); snapshot capt drift in wordsWeUse / wordsWeAvoid

## Time-window primitives
- [ ] `src/lib/brandclaw/time-window.ts` — `sinceNDaysAgo(n)` / `sinceVersion(versionId)` / `between(from, to)` / `lastNRuns(n)` helpers
- [ ] Functies returneren `TimeWindow` interface met `toPrismaWhere(): Prisma.AnyWhereInput` method
- [ ] Unit-tests verifiëren correct edge-cases (n=0, future timestamps, negative n)

## Snapshot persistence
- [ ] Per-source accessor materialiseert query-result als DataSnapshot row + returnt snapshot-id
- [ ] Multi-source query (Analyst-run vraagt 4 sources) creëert 4 DataSnapshot rows in één Prisma transaction
- [ ] `payload` JSON-serialized + reasonable size-budget (≤100KB per snapshot — large content text wordt afgeknipt + char-offset opgenomen voor herleidbaarheid)
- [ ] Snapshot retention: per ADR-2 future retention-ADR, default oneindig v1 (DB-grootte impact monitor via PostHog)

## Quality gates
- [ ] `npx tsc --noEmit` 0 errors + `npm run lint` 0 errors
- [ ] Unit-tests: 4 source accessors × 3 time-window scenarios = 12 test-cases
- [ ] Integration-test: Better Brands workspace seed → run alle 4 sources → verify 4 snapshots aangemaakt + payloads correct gestructureerd
- [ ] Cost-test: payload-size ≤100KB voor representative BB workspace (1000-deliverables, 50 alignment-scans)

# Bestanden die ik aanraak

## Schema
- `prisma/schema.prisma` — `DataSnapshot` model
- `prisma/migrations/<timestamp>_add_data_snapshot/migration.sql` — additief

## Data-sources
- `src/lib/brandclaw/index.ts` (nieuw) — public API exports
- `src/lib/brandclaw/data-sources/index.ts` (nieuw) — DataSourceRegistry
- `src/lib/brandclaw/data-sources/types.ts` (nieuw) — interfaces
- `src/lib/brandclaw/data-sources/alignment-scan-source.ts` (nieuw)
- `src/lib/brandclaw/data-sources/content-fidelity-source.ts` (nieuw)
- `src/lib/brandclaw/data-sources/review-log-source.ts` (nieuw)
- `src/lib/brandclaw/data-sources/voiceguide-source.ts` (nieuw)
- `src/lib/brandclaw/time-window.ts` (nieuw)

## Tests
- `src/lib/brandclaw/__tests__/time-window.test.ts` (nieuw) — pure-function unit tests
- `src/lib/brandclaw/__tests__/integration.test.ts` (nieuw) — 4-source integration test

# Bestanden die ik NIET aanraak

- F-VAL Pijler 1/2/3 — alleen reads via content-fidelity-source
- BrandVoiceguide schema — alleen reads via voiceguide-source
- AlignmentScan / ContentReviewLog schemas — alleen reads
- Tool-orchestrator (`brandclaw-tool-orchestrator` task) — separate file; data-sources zijn input-laag eronder
- Strategy Analyst stub (`strategy-analyst-stub` task) — consumer; depends op deze foundation
- Future nodes (Campaign Builder, Measurement, Optimization) — komen later met eigen task-files

# Smoke test plan

1. **DataSnapshot model migration**: `npx prisma migrate dev` clean run; geen foreign-key conflicts
2. **AlignmentScan source**: Better Brands workspace heeft 5 historische scans → `alignmentScanSource.query(BB.id, sinceNDaysAgo(30))` returnt 5 rows + 1 snapshot row in DB
3. **ContentFidelity source**: BB has 50+ scored deliverables → `contentFidelitySource.query(BB.id, sinceNDaysAgo(7))` returnt subset + snapshot capt distribution
4. **ReviewLog source** (na Δ-1 ship): paste-in 10 reviews → query returns 10 rows + snapshot
5. **Voiceguide source**: change BB voiceguide.wordsWeUse → query returns drift-data (oude vs new)
6. **Multi-source transaction**: Run alle 4 sources sequential → 4 DataSnapshot rows in DB
7. **Time-window edge cases**: n=0 (today only) / n=10000 (older than data) / between with from > to (error)
8. **Payload size**: representative BB workspace → all snapshots ≤100KB total
9. **TSC + lint** 0 errors

# Risico's

- **DB-grootte exponentieel** (medium): elke Analyst-run = 4 snapshot rows; bij wekelijkse runs over 1 jaar = ~200 rows per workspace. Mitigatie: per ADR-2 retention-ADR LATER wanneer >100k rijen; v1 monitort via PostHog
- **Payload-size groei** (medium): content-fidelity-source met BrandReviewFinding bevat full content-text — kan rapidly groeien. Mitigatie: payload size-budget ≤100KB; truncate text > 50KB met char-offset preserved
- **Snapshot-creation latency** (laag): 4 Prisma writes per multi-source-query = ~50-100ms toegevoegd. Acceptabel voor Analyst-runs (niet user-facing path)
- **Stale-snapshot race** (laag): tussen query + snapshot-write kunnen rijen muteren. Mitigatie: Prisma transaction omsluit query + snapshot-write zodat snapshot exact match is met query-output
- **Schema-drift in source-models** (medium): wanneer AlignmentScan / ContentFidelityScore schema verandert, oude snapshot-payloads mismatched. Mitigatie: payload bevat schema-version-stamp; consumers kunnen oude snapshots herinterpreteren of skippen
- **Workspace-isolatie hole** (CRITICAL): foutieve workspaceId-filter zou cross-workspace data-leak veroorzaken. Mitigatie: alle 4 source-accessors verplicht workspaceId in `where`; integration-test verifiëert isolation

# Out of scope

- **Tool-orchestrator** — eigen task `brandclaw-tool-orchestrator`; data-collection is input-laag eronder
- **Strategy Analyst-specifieke logica** — data-collection is generiek; Analyst consumption komt in `strategy-analyst-stub`
- **Compression van payloads** — v1 is plain JSON; gzip-compressie LATER wanneer DB-grootte triggers het
- **Snapshot-deduplication** — twee identieke queries dichtbij elkaar = 2 snapshots; geen content-hash-dedupe v1
- **Real-time streaming snapshots** — batch-only v1; future use-case: webhook-driven snapshots bij data-mutatie
- **Cross-workspace aggregation** — `cross-workspace-benchmarks` LATER
- **Snapshot-replay (re-run Analyst op oude snapshots)** — replay-logica komt in `strategy-analyst-stub` indien nodig

# Notes

Per ADR-2 schema-spec direct overgenomen. Geen architectuur-wijzigingen — task is pure implementation.

Implementation-volgorde:
1. Prisma schema + migration (0.5d)
2. Time-window primitives + unit tests (0.5d)
3. DataSourceRegistry + types (0.5d)
4. Per-source accessors (4 × 0.5d = 2d)
5. Integration test op BB workspace (0.5d)
6. Documentatie + cross-references in code-comments (0.5d)

Cross-task dependencies:
- ADR-2 schema fully gelocked → implementation kan direct
- AlignmentScan / ContentFidelityScore live tables → leesbaar nu
- ContentReviewLog (uit Δ-1) — review-log-source ligt afhankelijk van Δ-1 deployment; build accessor maar test pas na Δ-1 ship

Foundation voor:
- `brandclaw-tool-orchestrator` (volgende task) — registreert query-tools die data-sources consumeren
- `strategy-analyst-stub` — eerste node die alle 4 sources via tools queried
- Future nodes (Campaign Builder maand 5-6, Measurement maand 7-9, Optimization maand 10-12) — hergebruiken zelfde data-laag

Validation post-deployment: monitor `DataSnapshot.payload` distribution na 30-dagen Better Brands gebruik; budget-trigger op >50KB gem. payload-size voor optimization ronde.
