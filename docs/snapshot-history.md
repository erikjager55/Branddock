# Brandstyle Snapshot History

> Geadopteerd uit het hyperbrowserai/competitor-tracker patroon. Per analyzer-run wordt een append-only snapshot vastgelegd met de volledige canonical DesignSystemModel. Diff-engine vergelijkt twee snapshots op token-niveau en produceert een human-readable changelog ("Primary kleur veranderde van #B59032 → #C8A050").

## Wanneer wordt een snapshot gemaakt?

Automatisch na elke succesvolle analyzer-run, als Phase 6 in `analysis-engine.ts` (na de Semantic Role Resolver). Hash-based dedupe voorkomt dubbele entries:
- `tokensHash = sha256(canonical model zonder volatile timestamps)`
- Als dezelfde hash als de vorige snapshot → skip schrijven, retourneer bestaande row

## Data-model

```
BrandstyleSnapshot
├ id, brandstyleId, workspaceId
├ capturedAt
├ tokensHash, scrapeHash
├ tokensJson           — DesignSystemModel snapshot (~5-50KB)
├ scrapedJson          — colors, fonts, sizes, logoUrls, frameworks
├ semanticTokens       — resolver output snapshot
├ screenshotUrl        — optional hero screenshot
├ triggerSource        — 'analyze-url' | 'analyze-pdf' | 'manual' | 'cron'
├ triggeredById, triggeredBy
├ notes                — user-set label, "Pre-rebrand"
└ indexes: (brandstyleId, capturedAt), (workspaceId), (tokensHash)
```

## Diff-engine

**Structureel diff op de canonical model**, niet text-diff op HTML. Per categorie:

- `colors`: per role added/removed/changed met cosmetic-flag (RGB delta < 3)
- `typography`: per role, met `fields` array (welke properties veranderden)
- `rounded`/`spacing`: per scale-key value-change
- `elevation`: per level
- `components`: per variant added/removed/props-changed
- `brandFoundation`: assets/personas/competitors added/removed/changed

`summarizeDiff()` produceert bullets, geen LLM-call. Default verbergt `cosmetic` changes (RGB delta < 3 wordt als anti-aliasing/JPEG noise beschouwd, niet als rebrand). User kan ze tonen via `includeCosmetic: true` of de "Show N cosmetic" toggle in de UI.

`shortSummary()` produceert een 1-zin samenvatting ("3 colors, 1 typography, 2 tokens") voor de timeline-rij.

## API endpoints

```
GET  /api/brandstyle/snapshots
GET  /api/brandstyle/snapshots/[id]
PATCH /api/brandstyle/snapshots/[id]                — alleen `notes`
GET  /api/brandstyle/snapshots/[id]/diff/[otherId]?includeCosmetic=true
```

Alle endpoints workspace-scoped via `resolveWorkspaceId()`. List-endpoint geeft pre-computed `changeSummary` per rij — UI hoeft niet voor elke rij apart een diff op te vragen.

## UI

History-tab (9e tab in Brandstyle Styleguide, Clock-icon):
- Chronologische timeline van snapshots, latest bovenaan
- Per rij: timestamp, hash-prefix, trigger source, change summary, expand-toggle
- Expanded: per-categorie diff cards (Colors / Typography / Rounded / Spacing / Elevation / Components / Brand Foundation)
- Inline notes-edit per snapshot
- "Compare any two" modal in header — picker met twee dropdowns + side-by-side diff
- "Re-analyze now" knop — triggert bestaande `useAnalyzeUrl` met current sourceUrl

## Retention policy

Twee gates, OR-combinatie (snapshot wordt bewaard als één gate hem beschermt):
- **Top-N**: laatste 24 snapshots ALTIJD bewaard
- **Grace period**: alles binnen 90 dagen ALTIJD bewaard

Cleanup via AgentJob type `BRANDSTYLE_SNAPSHOT_CLEANUP`. Dispatch periodiek (default geen schedule — wordt manueel of via toekomstige cron getriggered):

```ts
import { dispatchJob } from '@/lib/agents/jobs/dispatch';

await dispatchJob({
  type: 'BRANDSTYLE_SNAPSHOT_CLEANUP',
  payload: { keepCount: 24, gracePeriodDays: 90 },
});
```

Of voor één specifieke styleguide:

```ts
await dispatchJob({
  type: 'BRANDSTYLE_SNAPSHOT_CLEANUP',
  payload: { brandstyleId: '...', keepCount: 12 },
});
```

## Cost-model

- DB storage per snapshot: ~5-50KB (jsonb compressed)
- Bij retention 24 + 90 dagen: orde van 1-3MB per styleguide
- 1000 styleguides × 2MB = 2GB DB-overhead. Onder limiet voor Postgres-tier 4-8 op Neon.
- Geen LLM-calls in de diff-pipeline — gratis na DB-write.

## Niet in V1

- Pixel-diff op screenshots (sharp + pixelmatch — kan in V2)
- LLM-narrative bovenop bullets (structureel diff is voldoende)
- Periodieke cron-scan per merk (manual re-analyze blijft trigger)
- Notificaties op significant change (Slack/email)
- Restore-snapshot ("revert to this version") — destructief, eigen review-flow nodig

## Bestanden

- `src/lib/brandstyle/snapshots/create-snapshot.ts` — write helper met hash-dedupe
- `src/lib/brandstyle/snapshots/snapshot-diff.ts` — `computeSnapshotDiff` + `summarizeDiff` + `shortSummary`
- `src/lib/brandstyle/snapshots/snapshot-cleanup.ts` — retention policy
- `src/lib/brandstyle/snapshots/types.ts` — `SnapshotSummary` / `SnapshotDetail` shared types
- `src/app/api/brandstyle/snapshots/` — 3 routes
- `src/features/brandstyle/components/HistorySection.tsx` — tab orchestrator
- `src/features/brandstyle/components/SnapshotTimelineRow.tsx` — single row
- `src/features/brandstyle/components/SnapshotDiffPanel.tsx` — categorie cards
- `src/features/brandstyle/components/CompareSnapshotsModal.tsx` — picker
- `src/features/brandstyle/hooks/useSnapshots.ts` — TanStack Query hooks
- `scripts/test-snapshot-write.ts` — write-path smoke test
- `scripts/test-snapshot-diff.ts` — diff-engine smoke test (27 assertions)
