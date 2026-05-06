# IMPLEMENTATIEPLAN — Continuous Learning Loop Foundation

> Implementatieplan voor de leerlus-architectuur uit ontwerp-sessies 1+2.
> Lees samen met de audit (`branddock-learning-loop-audit.md`) en
> beslissingen (`branddock-learning-loop-decisions.md`) in memory.
>
> Laatst bijgewerkt: 5 mei 2026 [EJ]

---

## DOEL EN SCOPE

Branddock vangt vanaf dag één gestructureerde data over AI-calls, content-versies, user-edits en fidelity-scores op. Dit is fundament voor de continuous-learning loop:
- Jaar 1: per-klant verbetering vanuit eigen edits/approvals
- Jaar 2: cross-klant patronen binnen segment (mits opt-in)
- Jaar 2-3: structurele product-verbetering uit fidelity-deviation-data

**Wat wel in scope:**
- 5 nieuwe Prisma-modellen voor capture
- Veld-uitbreidingen op `ContentVersion` voor diff-tracking
- FK-extensie op ~10 generatie-modellen (`primaryCallTraceId`)
- 5 nieuwe utility-services in `src/lib/learning-loop/`
- Settings UI voor read-only prompt-registry (niveau A)
- Backfill-strategy voor bestaande data

**Wat niet in scope:**
- Concrete fidelity pillar/sub-criteria-definities per content-type (content-strategy)
- Privacy/DPA-compliance enforcement (separate workstroom)
- Cross-klant aggregatie-queries (jaar 2)
- Niveau B/C prompt-management (DB-migratie van prompts)
- Multi-judge orchestration UI (kan later, capability is er)

---

## SCHEMA-UITBREIDINGEN

### 1. Nieuwe modellen (5)

#### `BrandContextSnapshot`
Frozen snapshot van wat brand-context was ten tijde van een AI-call. Dedup op content-hash.

```prisma
model BrandContextSnapshot {
  id          String    @id @default(cuid())
  workspaceId String
  workspace   Workspace @relation(fields: [workspaceId], references: [id], onDelete: Cascade)
  contentHash String    // sha256 of canonical-stringified content
  content     Json      // BrandContextBlock as returned by getBrandContext()
  createdAt   DateTime  @default(now())

  callTraces  AICallTrace[]

  @@unique([workspaceId, contentHash])
  @@index([workspaceId])
}
```

#### `AICallSnapshot`
Frozen snapshot van de complete AI-call payload. Dedup op content-hash. Captures alles wat output-determinant is.

```prisma
model AICallSnapshot {
  id               String    @id @default(cuid())
  workspaceId      String
  workspace        Workspace @relation(fields: [workspaceId], references: [id], onDelete: Cascade)
  contentHash      String    // sha256 of canonical-stringified payload
  payload          Json      // { model, messages, tools, params, providerExtensions }
  sourceType       String    // "ts-builder" | "db-config" | "inline"
  sourceIdentifier String    // file:function for TS, ExplorationConfigId for DB
  gitSha           String?   // captured from env var at call-time, null for db-config
  createdAt        DateTime  @default(now())

  callTraces       AICallTrace[]

  @@unique([workspaceId, contentHash])
  @@index([workspaceId])
  @@index([sourceIdentifier])
}
```

#### `AICallTrace`
Per-call instance record. Polymorphic FK naar parent-entity. Bevat response-metadata.

```prisma
model AICallTrace {
  id                       String                @id @default(cuid())
  workspaceId              String
  workspace                Workspace             @relation(fields: [workspaceId], references: [id], onDelete: Cascade)
  aiCallSnapshotId         String
  aiCallSnapshot           AICallSnapshot        @relation(fields: [aiCallSnapshotId], references: [id])
  brandContextSnapshotId   String?
  brandContextSnapshot     BrandContextSnapshot? @relation(fields: [brandContextSnapshotId], references: [id])
  parentEntityType         String                // "Deliverable" | "ContentVersion" | "ExplorationSession" | ...
  parentEntityId           String                // polymorphic, no FK constraint
  callOrder                Int                   @default(0) // for multi-call paths (strategy-pipeline, tool-loops)
  responseMetadata         Json                  // { inputTokens, outputTokens, stopReason, latencyMs, errorCode?, wasFromCache, cacheAgeSeconds }
  startedAt                DateTime              @default(now())
  completedAt              DateTime?

  fidelityScores           ContentFidelityScore[] // when this trace was the judge-call

  @@index([workspaceId])
  @@index([parentEntityType, parentEntityId, callOrder])
  @@index([aiCallSnapshotId])
}
```

#### `ContentFidelityScore`
Per content-versie fidelity decompositie. 1:N relatie ondersteunt multi-judge.

```prisma
model ContentFidelityScore {
  id                  String          @id @default(cuid())
  workspaceId         String
  workspace           Workspace       @relation(fields: [workspaceId], references: [id], onDelete: Cascade)
  contentVersionId    String
  contentVersion      ContentVersion  @relation(fields: [contentVersionId], references: [id], onDelete: Cascade)
  judgeCallTraceId    String?
  judgeCallTrace      AICallTrace?    @relation(fields: [judgeCallTraceId], references: [id])
  judgeIdentifier     String          // "deterministic-rule-engine-v1" | "claude-judge-fidelity" | "human:userId"

  compositeScore      Float           // 0-100, weighted average
  pillarScores        Json            // { [pillarKey]: { score, weight } }, exact 3 keys
  subCriteriaScores   Json            // { [subKey]: { score, pillar, source: 'deterministic'|'ai-judge'|'human' } }, exact 6 keys
  ruleViolations      Json            // [{ ruleId, severity, message, snippet?, source, pillar? }]
  thresholdMet        Boolean         @default(false)
  scorerVersion       String?         // version of the scoring logic, for reproducibility
  scoredAt            DateTime        @default(now())

  @@index([workspaceId])
  @@index([contentVersionId])
  @@index([judgeCallTraceId])
  @@index([workspaceId, scoredAt])
}
```

#### `LearningEvent`
Unified event-log voor cross-cutting queries.

```prisma
model LearningEvent {
  id          String    @id @default(cuid())
  workspaceId String
  workspace   Workspace @relation(fields: [workspaceId], references: [id], onDelete: Cascade)
  userId      String?
  user        User?     @relation(fields: [userId], references: [id], onDelete: SetNull)
  eventType   String    // "content.edited" | "ai.call_completed" | etc., curated taxonomy
  entityType  String    // "Deliverable" | "ContentVersion" | "AICallTrace" | ...
  entityId    String    // polymorphic, no FK constraint
  data        Json?     // event-specific payload, shape per type via TS discriminated union
  timestamp   DateTime  @default(now())
  createdAt   DateTime  @default(now())

  @@index([workspaceId, timestamp])
  @@index([workspaceId, userId, timestamp])
  @@index([entityType, entityId, timestamp])
  @@index([workspaceId, eventType, timestamp])
}
```

### 2. Veld-uitbreidingen op bestaande modellen

#### `ContentVersion` (cat 4 diff-tracking)

```prisma
// Toevoegen:
diffFromPrevious Json?    // structured diff, format-aware (ProseMirror-diff or text-diff)
diffSummary      Json?    // { charsAdded, charsRemoved, paragraphsTouched, percentChanged, sectionsReordered, ratio }
editType         String?  // "shorten" | "expand" | "restructure" | "polish" | "rewrite" | "factual" | "tone"
editorUserId     String?  // FK to User, null when createdBy='AI'
```

#### Generatie-modellen — `primaryCallTraceId String?` FK

Toevoegen aan ~10 modellen:
- `Deliverable`
- `DeliverableComponent`
- `ContentVersion`
- `ExplorationSession`
- `TrendResearchJob`
- `BrandAudit`
- `AlignmentScan`
- `AIPersonaAnalysisSession`
- `PersonaChatMessage`
- (optioneel) `ImproveSuggestion`

Voorbeeld:
```prisma
model Deliverable {
  // existing fields...
  primaryCallTraceId String?
  primaryCallTrace   AICallTrace? @relation(fields: [primaryCallTraceId], references: [id])
  // ...
  @@index([primaryCallTraceId])
}
```

### 3. Workspace-relaties

`Workspace` model krijgt 5 nieuwe relatie-arrays:
- `brandContextSnapshots BrandContextSnapshot[]`
- `aiCallSnapshots AICallSnapshot[]`
- `aiCallTraces AICallTrace[]`
- `contentFidelityScores ContentFidelityScore[]`
- `learningEvents LearningEvent[]`

`User` model krijgt:
- `learningEvents LearningEvent[]`

---

## CODE-STRUCTURE

```
src/
├── lib/
│   └── learning-loop/                     ← NIEUW
│       ├── index.ts                       ← Barrel export
│       ├── call-tracker.ts                ← Wraps AI calls, writes snapshots + traces
│       ├── snapshot-hasher.ts             ← Canonical stringify + sha256
│       ├── diff-builder.ts                ← Format-aware diff computation
│       ├── edit-classifier.ts             ← Auto-classify editType from diffSummary
│       ├── fidelity-scorer.ts             ← Hybrid deterministic + AI-judge scoring
│       ├── fidelity-rules.ts              ← Rule-engine voor deterministic sub-criteria
│       ├── event-emitter.ts               ← emitLearningEvent() + helpers
│       └── prompt-registry.ts             ← Reads AICallSnapshot for Settings UI
├── types/
│   └── learning-loop.ts                   ← NIEUW: LearningEventPayload union, FidelityPillarKey, etc.
├── app/
│   └── api/
│       ├── learning-loop/                 ← NIEUW
│       │   ├── fidelity/
│       │   │   └── rescore/[contentVersionId]/route.ts  ← POST: re-score on demand
│       │   └── events/
│       │       └── route.ts               ← GET: query LearningEvents
│       └── admin/
│           └── prompt-registry/            ← NIEUW
│               ├── route.ts               ← GET: list all known prompts (sourceIdentifiers)
│               └── [identifier]/route.ts  ← GET: prompt details + history
├── features/
│   └── settings/
│       └── components/
│           └── prompt-registry/            ← NIEUW (niveau A)
│               ├── PromptRegistryTab.tsx
│               ├── PromptListView.tsx
│               ├── PromptDetailView.tsx
│               └── PromptVersionTimeline.tsx
└── lib/
    └── ai/
        └── middleware.ts                  ← UITBREIDEN: integrate call-tracker
```

---

## IMPLEMENTATIE-FASES

Lineaire dependency-keten. Elke fase moet werkend voor de volgende kan starten.

### Fase 1 — Schema + types (foundation)
- Prisma schema-wijzigingen toevoegen (5 nieuwe modellen + ContentVersion-velden + FK's)
- `npx prisma db push` (development) / migration-bestand (productie)
- `src/types/learning-loop.ts` — TypeScript types voor LearningEventPayload, FidelityPayload-shapes
- Workspace + User relatie-uitbreidingen
- **Risico:** FK-toevoeging aan 10 modellen is invasive — run prisma generate, fix TS-errors in bestaande routes
- **Geen runtime-effect nog**

### Fase 2 — Call-tracker + AI-wrapper integratie

**Architectuur-keuze (gecorrigeerd 2026-05-05):** integreer op **AI completion wrapper-niveau**, niet op `withAi` HTTP-middleware. `withAi` runt eenmaal per request; een request kan N AI-calls doen (strategy-pipeline 8+, canvas 4+, exploration N). Tracking moet per AI-call gebeuren.

**Status 2026-05-05:** utility-services klaar (snapshot-hasher, call-tracker functions). Wrapper-integratie nog te doen.

**Te modificeren wrappers (5):**
- `src/lib/ai/exploration/ai-caller.ts`:
  - `createStructuredCompletion()` (line 437, multi-provider entry-point)
  - `createClaudeStructuredCompletion()` (line 298)
  - `createOpenAIStructuredCompletion()` (line 114)
  - `generateAIResponse()` (line 50, exploration-specifiek)
- `src/lib/ai/gemini-client.ts`:
  - `createGeminiStructuredCompletion()` + Gemini direct calls

**Patroon per wrapper:**
```typescript
type TrackingInput = {
  workspaceId: string;
  parentEntityType: string;
  parentEntityId: string;
  sourceIdentifier: string;
  brandContext?: unknown;
  callOrder?: number;
};

async function createStructuredCompletion<T>(
  // existing params
  options: ExistingOptions,
  // NEW optional tracking parameter
  tracking?: TrackingInput,
): Promise<T> {
  let traceId: string | null = null;

  if (tracking) {
    const result = await trackAICallStart({
      ...tracking,
      payload: buildAICallPayload(options),
      sourceType: 'inline',
      gitSha: process.env.VERCEL_GIT_COMMIT_SHA ?? null,
    });
    traceId = result.traceId;
  }

  try {
    const response = await /* existing AI call */;
    if (traceId) {
      await trackAICallComplete({
        traceId,
        responseMetadata: extractResponseMetadata(response),
      });
    }
    return response;
  } catch (err) {
    if (traceId) {
      await trackAICallComplete({
        traceId,
        responseMetadata: {
          errorCode: 'CALL_FAILED',
          errorMessage: err instanceof Error ? err.message : String(err),
          // ... other fields with defaults
        },
      });
    }
    throw err;
  }
}
```

**Backwards-compatible:** existing callers don't pass `tracking` → no tracking performed. Opt-in.

**Aandachtspunten:**
- Anthropic prompt-caching tokens (`cacheReadTokens`/`cacheWriteTokens`) extracten uit response.usage
- Streaming responses: `track-start` voor stream-init, `track-complete` na `stream.finalMessage()`
- `buildAICallPayload(options)` helper: serialiseer call-options naar AICallPayload shape

**Per-callsite migratie (na wrapper-integratie):**
Elk callsite dat een wrapper aanroept moet `tracking` parameter doorgeven met juiste `parentEntityType` + `parentEntityId`. ~30 callsites. Sequentieel werk per flow:
- canvas-orchestrator (4 calls per generation)
- strategy-chain (8+ calls per pipeline-run)
- exploration sessions
- alignment scanner
- trend research pipeline
- product/competitor analyzers
- workshop report
- brand alignment fix-generator
- improve-suggester
- quality-scorer

**Test-aanpak:** integration-test per wrapper met mock-AI-client → verify Trace-record geschreven met correcte snapshot-hashes, response-metadata populated, errors gevangen zonder crash.

### Fase 3 — Diff + edit classification
- `src/lib/learning-loop/diff-builder.ts` — format-aware diff:
  - Detecteer format via content-type uit `deliverable-types.ts`
  - ProseMirror-diff voor rich-text (use `prosemirror-diff` package of equivalent)
  - Myers line-diff voor plain text
  - Compute `diffSummary` aggregate stats
- `src/lib/learning-loop/edit-classifier.ts` — heuristieken op diffSummary
  - Returns `editType String | null`
  - Optionele AI-judge fallback voor `tone` cases
- ContentVersion-creation route uitbreiden:
  - Wanneer `createdBy='USER'`: vind previous → diff → summary → classify → persist
  - Wanneer `createdBy='AI'`: laat alle vier velden NULL
- **Test:** synthetic edit-cases dekken alle editType-buckets
- **Risico:** ProseMirror-diff library-keuze; ~~potentially~~ kies expliciet bij start fase

### Fase 4 — Fidelity-scorer
- `src/lib/learning-loop/fidelity-rules.ts` — rule-engine voor deterministic sub-criteria
  - Char/word-count limits per content-type
  - Hashtag-count, link-count
  - Brand-keyword-coverage (matcht tegen brand-asset content)
  - Banned-words (uit BrandStyle.bannedWords of equivalent)
- `src/lib/learning-loop/fidelity-scorer.ts` — orchestrates scoring
  - Run deterministic rules (sync)
  - Run AI-judge call (via `trackAICall()` met `parentEntityType='ContentFidelityScore'`)
  - Compose composite score from pillars (weighted)
  - Persist `ContentFidelityScore`
- Auto-trigger bij `ContentVersion.create` met `createdBy='AI'`
- API endpoint `POST /api/learning-loop/fidelity/rescore/:contentVersionId?judge=X` voor on-demand
- **Blokker:** concrete pillar/sub-criteria-definities per content-type — **content-strategy beslissing nodig**
  - Tot die er zijn: scaffold met placeholder-pijlers (brand/audience/craft) en 6 generieke sub-criteria, mark als v0
- **Test:** seed content-versions with known properties → verify deterministic scores, mock AI-judge for hybrid

### Fase 5 — Event-emitter
- `src/lib/learning-loop/event-emitter.ts` — `emitLearningEvent()` helper
- `src/types/learning-loop.ts` — LearningEventPayload discriminated union met alle ~25 types
- Emission-points toevoegen aan API-routes (in volgorde van impact):
  - ContentVersion.create → `content.created` of `content.edited`
  - Deliverable.update (status changes) → `content.approved`/`rejected`/`published`/`archived`
  - AICallTrace.create → `ai.call_started`
  - AICallTrace.update (completion) → `ai.call_completed` of `ai.call_failed`
  - ContentFidelityScore.create → `fidelity.scored` (+ threshold_crossed indien overgang)
  - ImproveSuggestion status change → `suggestion.accepted`/`dismissed`/`previewed`
  - AlignmentIssue dismiss/fix → `alignment.issue_dismissed`/`fix_applied`
  - ExplorationConfig update → `config.exploration_updated`
- API endpoint `GET /api/learning-loop/events` — query interface (workspaceId, userId, eventType, entityType+entityId, time-range)
- **Risico:** emission verspreidt over veel routes — code-discipline checklist nodig. Suggesteer git-hook of test om te verifiëren dat key actions emitten
- **Test:** integration tests die verifiëren dat een end-to-end content-flow alle verwachte events produceert

### Fase 6 — Prompt-registry Settings UI (niveau A)
- `src/lib/learning-loop/prompt-registry.ts` — query-helpers
- `src/app/api/admin/prompt-registry/route.ts` — GET list met aggregates per sourceIdentifier
- `src/app/api/admin/prompt-registry/[identifier]/route.ts` — GET detail + version-history (groupby contentHash)
- Settings UI:
  - Lijst-view: alle unieke `sourceIdentifier`-waarden, met counts (last 30d), recent contentHash
  - Detail-view per prompt: payload-tekst, source (file path), git-sha, fidelity-stats van outputs, version-timeline
- Toegankelijk via Settings → Developer (developer-only, gebruikt bestaande `requireDeveloper()`)
- **Geen schema-werk meer**, puur UI op bestaande data
- **Test:** screenshot/visual-regression van overview + detail views

### Fase 7 — Backfill (niet-blokkerend)
- Batch-job script `prisma/scripts/backfill-learning-loop.ts`:
  - Voor bestaande `ContentVersion`-records met `createdBy='USER'`: compute diff t.o.v. vorige versie, populate 4 velden
  - Voor bestaande generatie-records: GEEN AICallSnapshot/Trace backfill (irreversible loss — niet retroactively reconstrueerbaar zonder origineel prompt)
  - Voor bestaande user-acties: GEEN LearningEvent-backfill (zelfde reden)
- Idempotent — kan re-run bij failure
- Documenteer expliciet in script-comment dat alleen diffs backfillbaar zijn
- **Niet kritiek pad** — kan weken na deploy

---

## RISICO'S EN MITIGATIES

| Risico | Impact | Mitigatie |
|---|---|---|
| FK-toevoeging aan 10 modellen breekt bestaande routes | Hoog | TypeScript dwingt fixes af; prisma generate run vroeg in fase 1; test-suite draaien |
| Polymorphic FK in Trace + LearningEvent (geen DB-constraints) | Medium | Application-level validatie; cleanup-job voor orphans als entityId-target verwijderd wordt |
| ProseMirror-diff library-keuze | Medium | Pin keuze bij start fase 3; alternatief Myers-diff voor non-rich-text fallback |
| Fidelity-scorer zonder concrete pillar-definities | Hoog | Scaffold met placeholder v0; markeer ContentFidelityScore.scorerVersion als 'v0-placeholder'; content-strategy sessie blokkerend voor v1 |
| Sync write-overhead per AI-call (3 DB-writes: snapshot upsert ×2, Trace insert) | Laag-medium | Pre-launch volume is laag; hash-dedup houdt snapshot-table klein; monitor latency |
| Code-discipline voor LearningEvent-emission | Medium | Centrale helper, code-review-discipline, integration-tests die end-to-end events verifiëren |
| Backfill misleadend (gaten in oude data) | Laag | Script-comment expliciet, dashboards filteren op `createdAt >= deployDate` voor leerlus-analyses |
| Workspace-isolation breekt bij polymorphic FK queries | Hoog (privacy) | `workspaceId` op alle nieuwe modellen, ALLE query's verplicht filteren via bestaande `requireWorkspace()` middleware |

---

## TEST-AANPAK

- **Unit-tests:** snapshot-hasher (deterministisch, canonical), diff-builder (alle formaten), edit-classifier (alle buckets), fidelity-rules (deterministic outcomes)
- **Integration-tests:**
  - E2E content-creation flow → verify alle 4 modellen + ContentVersion-velden gevuld
  - Multi-call path (strategy-pipeline) → verify N AICallTraces met correcte callOrder
  - User-edit flow → verify diff + classification + LearningEvent emission
  - On-demand re-score → verify nieuwe ContentFidelityScore-rij + LearningEvent
- **Manual QA:** Settings UI prompt-registry op seed-data
- **Geen load-testing nu** (pre-launch volume)

---

## DOCUMENTATIE-UPDATES

Bij landing van elke fase:
- `CLAUDE.md` — toevoegen sectie "Learning Loop" onder Database & Prisma met overzicht van 5 nieuwe modellen
- `PATTERNS.md` — niet vereist (geen nieuwe UI-patterns)
- `TODO.md` — toevoegen Fase X.x: Learning Loop met deze 7 fases als sub-items
- `gotchas.md` — eventuele lessons-learned tijdens implementatie (polymorphic-FK gotchas, dedup-edge-cases, etc.)
- Memory: `branddock-learning-loop-decisions.md` updaten als beslissingen tijdens implementatie wijzigen

Per nieuw model: schema-comment met purpose, retention, en cross-references.

---

## SEED-DATA UITBREIDING

Bij implementatie van fase 1:
- 5 demo `BrandContextSnapshot` records voor demo-workspace
- 8 demo `AICallSnapshot` records (verschillende sourceIdentifiers)
- 12 demo `AICallTrace` records gekoppeld aan snapshots + bestaande Deliverables
- 5 demo `ContentFidelityScore` records met realistische pillar/sub-scores
- 50+ demo `LearningEvent` records over recente weken voor activity-feed-test

Niet retroactief op bestaande seed-records (te complex, geen leerlus-waarde) — alleen forward-looking demo-data.

---

## ESTIMATE EN VOLGORDE

**Niet-blokkerende dependency-paden:**
- Fase 1 → Fase 2 (call-tracker)
- Fase 1 → Fase 3 (diffs)
- Fase 2 → Fase 4 (fidelity, omdat AI-judge via call-tracker gaat)
- Fase 3 → Fase 5 (events emit op edit-actie)
- Fase 2 → Fase 6 (prompt-registry leest snapshots)
- Fase 7 — onafhankelijk, kan ergens parallel draaien

**Aanbevolen serial volgorde:** 1 → 2 → 3 → 4 → 5 → 6 → 7

**Ruwe inschatting per fase** (niet sprint-locked, afhankelijk van parallelle prioriteiten):
- Fase 1: ~1 dag
- Fase 2: ~3-4 dagen
- Fase 3: ~2-3 dagen
- Fase 4: ~3-4 dagen (excl. content-strategy sessie voor pillars)
- Fase 5: ~2-3 dagen
- Fase 6: ~3-5 dagen
- Fase 7: ~1-2 dagen

**Totaal:** ~3-4 weken geconcentreerd werk, langer als parallelle prioriteiten meespelen.

---

## OPEN AFHANKELIJKHEDEN

Buiten dit plan, maar nodig voor volledige leerlus-werking:

1. **Content-strategy sessie** voor concrete pillar/sub-criteria-definities per content-type — blokkerend voor fase 4 v1 (v0-placeholder is OK voor deploy)
2. **Privacy/DPA-werkstroom** — workspace-isolation enforcement, opt-in voor cross-klant aggregaten, retention-beleid
3. **Cross-klant aggregatie-query design** — jaar 2 use case, separate werkstroom

---

## NIET IN DIT PLAN — EXPLICIETE NIET-DOEL

- Niveau B/C prompt-management (DB-migratie van prompts) — selectief later, geen architectuur-werk
- Multi-judge UI orchestration — capability is er via 1:N ContentFidelityScore, UI komt wanneer use-case dwingt
- Fine-tune dataset export — jaar 2-3 use case, eigen werkstroom
- Cross-customer benchmark queries — jaar 2 use case, eigen werkstroom
- Real-time leerlus-dashboard — separate UI-werkstroom
- Agent-loops die zelfstandig optimaliseren (Brandclaw Fase F) — separate werkstroom, bouwt op deze fundering

---

*Bijwerken bij elke landing van een fase. Ontwerp-beslissingen niet eenzijdig wijzigen — terug naar memory en sessie.*
