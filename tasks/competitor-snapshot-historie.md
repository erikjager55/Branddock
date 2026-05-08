---
id: competitor-snapshot-historie
title: Competitor data-laag — Snapshot/Activity/ContentItem schema + dual-write refresh + backfill
fase: pre-launch
priority: now
effort: 3-4 dagen
owner: claude-code
status: in-progress
created: 2026-05-08
completed:
progress: PR-1 schema applied via db push (commit fd2738c). PR-2 diff-engine + hash + backfill committed (commit 99df752, 7 retroactive snapshots backfilled). PR-3 refresh dual-write committed.
related-adr: docs/adr/2026-05-08-competitor-snapshot-historie.md
related-spec: tasks/_drafts/idea-competitive-intelligence-loop.md
worktree: branddock-feat-competitor-snapshot
---

# Probleem

De huidige Competitor-refresh overschrijft AI-extracted velden bij elke run — geen historie, geen datum-stempels per claim, geen trend-queryability. Drie aankomende capabilities (Strategy Analyst Δ-1 trend-detection, Brandclaw freshness-loop, methodology-conforme competitive briefs) hebben immutable snapshot-historie nodig. Deze task implementeert de data-laag uit ADR `2026-05-08-competitor-snapshot-historie` zodat Fase 2 (UI) en Fase 4 (Brandclaw monitoring) erop kunnen leunen.

# Voorstel

Drie nieuwe Prisma-modellen toevoegen (`CompetitorSnapshot`, `CompetitorActivity`, `CompetitorContentItem`) met bijbehorende enums, plus drie additieve velden op `Competitor` voor monitoring-voorbereiding en aggregaten. Refresh-route omzetten naar dual-write transactie: snapshot first, hash-vergelijking, deterministische diff-engine, activity-events, dan Competitor-pointer update. Backfill-script schrijft retroactief één initial snapshot per ANALYZED competitor zodat alle bestaande rijen een snapshot-history-startpunt hebben. UI, embeddings-pipeline, AI-classified events en Brandclaw-monitoring blijven expliciet buiten scope.

# Acceptatiecriteria

- [ ] Prisma-schema bevat `CompetitorSnapshot`, `CompetitorActivity`, `CompetitorContentItem` modellen + enums (`SnapshotTriggerSource`, `CompetitorSignalSource`, `CompetitorActivityType`, `ActivitySeverity`, `ContentFormat`, `MonitoringFrequency`) volgens ADR
- [ ] `Competitor` model heeft drie nieuwe velden: `monitoringEnabled` (default false), `monitoringFrequency` (default WEEKLY_LIGHT), `nextScheduledScanAt` (nullable), `snapshotCount` (default 0), `unacknowledgedActivityCount` (default 0)
- [ ] `npx prisma db push` op dev-DB succesvol, geen data-verlies
- [ ] Backfill-script `prisma/scripts/backfill-competitor-snapshots.ts` is idempotent (tweede run schrijft geen duplicates), genereert één Snapshot per ANALYZED Competitor met `triggerSource = MANUAL`, `notes = "retroactive backfill 2026-05-08"`
- [ ] Refresh-route `src/app/api/competitors/[id]/refresh/route.ts` schrijft Snapshot in een transactie samen met Activity-events en Competitor-pointer update
- [ ] Refresh op een Competitor zonder veld-wijzigingen produceert GEEN nieuwe Snapshot-rij (hash-match), maar werkt `lastScrapedAt` wél bij
- [ ] Diff-engine `src/lib/competitors/diff-engine.ts` produceert deterministische `CompetitorActivity`-records voor minstens deze types: `TAGLINE_CHANGED`, `VALUE_PROP_CHANGED`, `PRICING_CHANGED`, `NEW_PRODUCT`, `PRODUCT_REMOVED`, `STATUS_CHANGED`, `TIER_CHANGED`. Severity bepaald via simple rules (zie Notes).
- [ ] `getBrandContext(workspaceId)` blijft werken zonder code-wijziging — bestaande competitor-data komt door dezelfde Competitor-pointer
- [ ] Bestaande 6 competitor-API-routes (list, detail, create, update, refresh, lock, products, discover) functioneel ongewijzigd voor consumers
- [ ] `cacheKeys.competitors.list(workspaceId)` + `.detail(competitorId)` invalidation triggert in refresh-route, plus nieuwe `cacheKeys.competitors.activity(workspaceId)`
- [ ] `npx tsc --noEmit` 0 errors
- [ ] `npm run lint` 0 errors
- [ ] Smoke-test uitgevoerd (zie sectie)
- [ ] ADR status `proposed` → `accepted` na merge
- [ ] Changelog-entry in `docs/changelog.md`

# Bestanden die ik aanraak

**Schema + migration**
- `prisma/schema.prisma` — drie nieuwe modellen, drie nieuwe Competitor-velden, zes nieuwe enums
- `prisma/migrations/<timestamp>_add_competitor_snapshot_models/migration.sql` — Prisma-generated
- `prisma/scripts/backfill-competitor-snapshots.ts` — nieuw

**Refresh-route + diff-engine**
- `src/app/api/competitors/[id]/refresh/route.ts` — dual-write rewrite
- `src/lib/competitors/diff-engine.ts` — nieuw
- `src/lib/competitors/snapshot-hash.ts` — nieuw, sha256-canonicalisation helper
- `src/lib/competitors/types.ts` — nieuw (of uitbreiden van bestaande als die er is), gedeelde types voor diff-payloads

**Cache-keys**
- `src/lib/cache/cache-keys.ts` — nieuwe `competitors.activity(workspaceId)` prefix toevoegen

**Tests**
- `src/lib/competitors/diff-engine.test.ts` — nieuw, unit-tests voor de 7 deterministische rules + hash-match no-op
- `tests/smoke/competitor-snapshot.smoke.ts` — nieuw, end-to-end smoke (refresh → snapshot → activity → cache invalidation)

**Documentatie**
- `docs/adr/2026-05-08-competitor-snapshot-historie.md` — status `proposed` → `accepted`
- `docs/changelog.md` — entry
- `tasks/competitor-snapshot-historie.md` — deze, status updates onderweg

# Bestanden die ik NIET aanraak

- `src/components/competitors/**` — UI is Fase 2
- `src/app/api/claw/**` — Brandclaw monitoring is Fase 4
- `src/app/api/competitors/discover/route.ts` — Exa-discovery onveranderd; nieuwe Snapshot-rij komt pas bij explicit refresh, niet bij discovery
- `src/lib/ai/embeddings.ts` — geen embedding-pipeline voor ContentItem in deze task; veld bestaat in schema maar blijft null
- `src/lib/ai/prompts/competitor-analysis.ts` — extraction-prompts onveranderd; alleen waar de output landt verandert
- `getBrandContext` en alle consumers — bewust uit scope (backwards-compat-test bewijst dat het ongewijzigd blijft werken)
- AI-classified Activity-types (`NEW_FORMAT_EMERGING`, `CATEGORY_REPOSITIONING`, `VISUAL_REBRAND`, `LEADERSHIP_CHANGE`) — vervolg-task `competitor-ai-event-classifier`
- ContentItem auto-discovery (blog-post crawler) — vervolg-task `competitor-content-item-discovery`
- Cron-scheduling infra — Fase 4 ADR
- pgvector index voor `CompetitorContentItem.embedding` — vervolg-task gekoppeld aan content-item-discovery

# Smoke test plan

**Voorbereiding**: één testworkspace met 2 Competitors in `ANALYZED` status, één `DRAFT`. Dev-DB.

1. **Migration apply** — `npx prisma db push`. Verifieer: alle drie nieuwe tabellen zichtbaar via psql, geen drop op bestaande tabellen, drie nieuwe kolommen op `Competitor` met defaults toegepast.

2. **Backfill** — `DATABASE_URL=... npx tsx prisma/scripts/backfill-competitor-snapshots.ts`. Verifieer: precies één Snapshot per ANALYZED Competitor (DRAFT krijgt er geen), `notes` veld bevat "retroactive backfill", `Competitor.snapshotCount = 1`. Tweede run: 0 nieuwe Snapshots geschreven (idempotent).

3. **Refresh — verandering** — Wijzig handmatig één Competitor's tagline in een testfixture, trigger refresh via `POST /api/competitors/<id>/refresh`. Verifieer: nieuwe Snapshot toegevoegd (`snapshotCount = 2`), één `CompetitorActivity` met `type = TAGLINE_CHANGED`, `severity = NOTABLE`, `diffPayload.before` + `.after` correct gevuld, `summary` 1-zin, `acknowledgedAt = null`. Refresh in dezelfde transactie — geen partial state bij rollback (test door fake error in diff-engine te injecteren).

4. **Refresh — no-op** — Trigger direct daarna een tweede refresh zonder fixture-wijziging. Verifieer: `snapshotCount` blijft 2, `lastScrapedAt` is bijgewerkt, geen nieuwe Activity-rij.

5. **Backwards-compat** — Roep `GET /api/competitors`, `GET /api/competitors/<id>`, `getBrandContext(workspaceId)`. Verifieer: response-shape ongewijzigd, alle bestaande velden aanwezig, geen 500's.

6. **Cache-invalidation** — Verifieer dat na refresh de cache-keys `competitors.list(ws)`, `competitors.detail(id)`, en `competitors.activity(ws)` zijn geïnvalideerd.

7. **Diff-engine unit-tests** — `npm run test -- diff-engine.test.ts`. Alle 7 deterministische rules + hash-match no-op groen.

8. **Type + lint** — `npx tsc --noEmit` en `npm run lint`. 0 errors.

# Risico's

- **Risico 1**: Migration breekt bestaande Competitor-data door foreign-key issues. **Mitigatie**: alle nieuwe relations zijn outbound (`Snapshot → Competitor`, niet andersom) en additieve velden hebben defaults. `prisma db push` op dev-snapshot eerst, productie-shape valideren via `prisma migrate dev --create-only` review vóór apply.

- **Risico 2**: Refresh-transactie wordt te lang en lockt rijen onder concurrent reads. **Mitigatie**: snapshot-write + diff + activity-writes zijn append-only; alleen Competitor-pointer-update kan blokken. Diff-engine is sync en deterministisch (geen AI-call binnen transactie). Maximum verwachte transactie-duur <100ms.

- **Risico 3**: Hash-canonicalisation maakt subtiele bugs (bijv. veld-ordering, null vs ""). **Mitigatie**: dedicated `snapshot-hash.ts` met expliciete sort + JSON-stable-stringify, plus unit-tests voor edge-cases (nullable velden, lege arrays, verschillende field-order in input).

- **Risico 4**: Backfill faalt halverwege en laat workspace inconsistent. **Mitigatie**: per-Competitor in eigen transactie, idempotent op `notes startswith "retroactive backfill"`, log voortgang per rij. Tweede run vult ontbrekende rijen aan.

- **Risico 5**: gotchas.md `2026-04-21 — Prisma Client Extensions miss nested-write relations` — als refresh-route ergens een nested-write doet via Workspace of User, missen we de hooks. **Mitigatie**: refresh-route gebruikt directe `prisma.competitor.update()` + `prisma.competitorSnapshot.create()`, geen nested writes. Gegrep'd voor `competitor: { create:`, `competitor: { update:` — moet 0 hits opleveren in changes.

- **Risico 6**: Drie nieuwe enums + zes nieuwe modellen vergroten Prisma-client-bundle. **Mitigatie**: ContentFormat en CompetitorActivityType zijn 12 + 18 waarden — verwaarloosbaar. Validatie via `npm run build` om bundle-size-regression te detecteren.

# Out of scope

- **UI**: positioning-map, history-tab, activity-feed, content-gap-matrix, narrative-tab, messaging-matrix, battlecards — Fase 2 idea-doc
- **Brandclaw monitoring**: cron-scheduling, `monitor_competitor` tool, in-app notifications voor changes — Fase 4 idea-doc + eigen ADR
- **AI-classified events**: `NEW_FORMAT_EMERGING`, `CATEGORY_REPOSITIONING`, `VISUAL_REBRAND`, `LEADERSHIP_CHANGE`, `FUNDING_EVENT` — deterministische diff dekt 7 types in MVP, AI-classifier is vervolg-task `competitor-ai-event-classifier`
- **Content-item discovery**: blog-post crawling, RSS-ingestion, Wayback-historiek — vervolg-task `competitor-content-item-discovery`
- **Embedding pipeline**: `CompetitorContentItem.embedding` veld bestaat in schema (Unsupported pgvector type) maar wordt niet gevuld
- **Retention/TTL beleid**: indefinite snapshot-storage volgens ADR Notes — eigen follow-up ADR zodra >100k rijen of privacy-incident
- **External signals enum-waarden**: `RSS`, `WAYBACK`, `REVIEWS`, `GOOGLE_ALERT` zijn in enum aanwezig maar niet bedraad — Fase 5
- **Multi-language analyse**: `language`-veld op ContentItem is aanwezig, taal-classificatie is later
- **Methodology-frameworks**: narrative, positioning-statement reverse-engineering, messaging strengths/vulnerabilities scoring — Fase 2 (UI + nieuwe AI-prompts)

# Notes

## Diff-engine severity-rules (deterministisch, MVP)

Voor de 7 ondersteunde Activity-types in deze task:

| Type | Severity | Trigger |
|---|---|---|
| `TAGLINE_CHANGED` | NOTABLE | `prev.tagline !== next.tagline` (na trim+lowercase) |
| `VALUE_PROP_CHANGED` | NOTABLE | `prev.valueProposition !== next.valueProposition` (na normalisatie) |
| `PRICING_CHANGED` | MAJOR | `prev.pricingModel !== next.pricingModel` OR significant `pricingDetails`-diff (>30% chars) |
| `NEW_PRODUCT` | NOTABLE | item in `next.mainOfferings` niet in `prev.mainOfferings` |
| `PRODUCT_REMOVED` | NOTABLE | item in `prev.mainOfferings` niet in `next.mainOfferings` |
| `STATUS_CHANGED` | INFO | `prev.status !== next.status` (manual workflow event) |
| `TIER_CHANGED` | INFO | `prev.tier !== next.tier` (manual workflow event) |

Alle andere `CompetitorActivityType`-waarden zijn aanwezig in enum maar worden in deze task NIET geproduceerd — vervolg-tasks bouwen ze.

## Hash-canonicalisation

`contentHash` = sha256 van JSON-stable-stringify van een tuple van extracted-velden in vaste sort-volgorde. Velden: `tagline, valueProposition, targetAudience, differentiators[], mainOfferings[], pricingModel, pricingDetails, toneOfVoice, messagingThemes[], visualStyleNotes, strengths[], weaknesses[], socialLinks, hasBlog, hasCareersPage`. Excluded: `lastScrapedAt`, `updatedAt`, alle metadata. Nullable strings worden tot `""` ge-normaliseerd; arrays worden gesorteerd alvorens te hashen zodat field-order in input geen hash-mismatch geeft.

## Migration-volgorde

1. PR-1: schema-additie + Prisma migration (geen runtime-impact, route ongewijzigd)
2. PR-2: backfill-script + diff-engine + tests (geen runtime-impact tot route gewijzigd)
3. PR-3: refresh-route dual-write rewrite (eerste runtime-effect)

Drie kleine PR's > één grote — kleinere blast-radius, makkelijker te reverten als productie-issue zich aandient.

## ADR-promotion

ADR is nu `proposed`. Bij merge van PR-3 (laatste): ADR `status: proposed` → `accepted`. Niet eerder — zolang refresh-route nog niet schrijft is de beslissing technisch nog reverteerbaar zonder data-implicatie.

## Pattern-precedent

Volgt exact `BrandstyleSnapshot` (`prisma/schema.prisma:1860-1894`): hash-based no-op detection, JSON-blobs voor reconstructie, `triggerSource` voor herkomst, indefinite retention. Eén afwijking: `BrandstyleSnapshot` heeft `tokensHash` + `scrapeHash`; competitor-versie heeft `contentHash` + `scrapeHash` (`tokensHash` is brandstyle-specifiek begrip).

## Vervolg-tasks (placeholders, niet nu aanmaken)

- `competitor-ai-event-classifier` — AI-classified Activity-types (NEW_FORMAT_EMERGING, CATEGORY_REPOSITIONING, VISUAL_REBRAND, FUNDING_EVENT)
- `competitor-content-item-discovery` — blog-post crawler, RSS-ingestion, eerste producer voor `CompetitorContentItem`
- `competitor-positioning-frameworks-ui` — Fase 2 UI (positioning-map + matrix + narrative-tab)
- `brandclaw-competitor-monitoring` — Fase 4, eigen ADR voor cron-infra

## Plan-mode reminder

Per CLAUDE.md: deze task heeft 3+ stappen + architecturale impact (schema-wijziging). User-approval op deze plan vóór uitvoering. Geen code wordt geschreven tot je groen licht geeft.

## PR-1 voortgang (2026-05-08, commit fd2738c)

✅ Feature-branch `branddock-feat-competitor-snapshot` aangemaakt
✅ Schema-additie: 3 modellen, 6 enums, 5 nieuwe Competitor-velden, 1 nieuwe index, 5 relations
✅ `prisma format` + `prisma validate` + `prisma generate` groen
✅ `npx tsc --noEmit` 0 errors — backwards-compat bewezen
✅ `prisma migrate diff` SQL gegenereerd (150 regels, puur additief — 0 DROP, 0 ALTER COLUMN)
✅ `prisma db push` toegepast op dev-DB; 25 bestaande competitors hebben default `snapshotCount=0` zonder NULL-issues
✅ pgvector v0.8.2 actief — `embedding vector(1536)` op CompetitorContentItem werkt
✅ SQL bewaard in `prisma/migrations-pending-bootstrap/2026-05-08_competitor_snapshot_models.sql` voor toekomstige Vercel/Neon migration-bootstrap

## PR-2 voortgang (2026-05-08, commit 99df752)

✅ `src/lib/competitors/types.ts` — CanonicalExtracted (15 fields), DiffPayload discriminated union, DetectedActivity, ManualEventContext
✅ `src/lib/competitors/snapshot-hash.ts` — sha256 over canonical sort + whitespace-normalize, tri-state nullable booleans
✅ `src/lib/competitors/diff-engine.ts` — 7 deterministische rules (TAGLINE / VALUE_PROP / PRICING / NEW_PRODUCT / PRODUCT_REMOVED / STATUS / TIER) met >30% details-ratio voor PRICING_CHANGED major-detection
✅ `prisma/scripts/backfill-competitor-snapshots.ts` — idempotent per-row transactie, dry-run mode, workspace-filter
✅ `src/lib/api/cache-keys.ts` — `competitors.activity(wsId)` + `.snapshots(wsId, id)` toegevoegd
✅ `scripts/smoke-tests/competitor-diff-engine.ts` — 43 asserts in 3 lagen, 43/43 pass
✅ Backfill draaide live: 7 ANALYZED competitors → 7 retroactive snapshots, 2e run idempotent (0 schrijves)

## PR-3 voortgang (2026-05-08, in-progress)

✅ `src/app/api/competitors/[id]/refresh/route.ts` — herschreven naar dual-write pattern:
   - Build CanonicalExtracted uit AI-result + existing fallback (zelfde merge-rules als pre-PR-3)
   - computeContentHash + read latest snapshot
   - **hash-match path**: alleen `lastScrapedAt` updaten, return early met `_refreshOutcome: 'no-op-hash-match'`
   - **hash-miss path**: één `$transaction` met snapshot.create + activities.createMany + competitor.update (incl. snapshotCount + unacknowledgedActivityCount increments)
   - Cache-invalidation onveranderd (`prefixes.competitors` raakt list/detail/activity/snapshots in één call)
✅ `npx tsc --noEmit` 0 errors
✅ `scripts/smoke-tests/competitor-refresh-dual-write.ts` — 14 asserts in 3 scenarios (hash-match no-op, hash-miss content change, combined workflow + content), 14/14 pass, fixture cleanup via cascade werkt

## Afwijkingen van oorspronkelijk plan

1. **Geen `prisma/migrations/<ts>_add_competitor_snapshot_models/` folder aangemaakt** — project gebruikt sinds februari 2026 `db push` als primary schema-sync, niet migration-files. SQL geparkeerd in `migrations-pending-bootstrap/` met README. Migration-bootstrap volgt in eigen task bij Vercel/Neon-deployment.

2. **Baseline-migration tech-debt ontdekt** — `prisma/migrations/0_baseline/migration.sql` heeft `Loaded Prisma config from prisma.config.ts.` als eerste regel, wat shadow-DB validatie breekt. Niet gefixt in deze task (sha256-drift-check risico op productie). Documentatie in `migrations-pending-bootstrap/_README.md`. **Follow-up nodig**: eigen task `migration-bootstrap` voor Vercel/Neon.

3. **Embedding-veld toegevoegd in PR-1** — task-file zei "blijft null", maar omdat `Unsupported("vector(1536)")?` exact het bestaande `AgentMemory.embedding:4715` patroon volgt en pgvector v0.8.2 actief is, was er geen reden om uit te stellen. Producer komt nog steeds in vervolg-task.
