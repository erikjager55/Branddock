---
id: 2026-05-08-competitor-snapshot-historie
title: Competitor data-model uitbreiden met Snapshot/Activity/ContentItem voor immutable historie
status: proposed
date: 2026-05-08
supersedes: -
superseded-by: -
---

# Context

Het bestaande `Competitor`-model (`prisma/schema.prisma:3722-3785`) bevat ~25 AI-extracted velden die bij elke refresh worden overschreven. Refresh-route `src/app/api/competitors/[id]/refresh/route.ts` doet een dual-write op de current rij — `lastScrapedAt` wordt bijgewerkt, eerdere veld-waardes verdwijnen onherstelbaar.

Dit contract voldoet niet meer voor drie aankomende capabilities:

- **Idea-doc `competitive-intelligence-loop`** (2026-05-08) — methodologie eist datum-stempels en bron-traceback per claim (§11 quality controls). Bij overschrijven verliezen we de meet-datum van elke individuele extractie.
- **Brand Control Program — Strategy Analyst (Δ-1)** vraagt trend-queries: "welke concurrenten hebben de laatste 90 dagen hun pricing-model gewijzigd?", "welke messaging-thema's komen op?". Zonder historie geen trends.
- **Brandclaw freshness-loop** (post-launch, fase 4 van competitive-intel idea) — een polling-mechanisme dat eens per week scrapet, levert alleen waarde als opeenvolgende states vergelijkbaar zijn.

Daarnaast eist methodologie §6.2 (content-gap-analyse) per-format granulariteit (blog-posts, persberichten, social-posts, ebooks, webinars) — dat is niet representeerbaar in een paar JSON-velden op `Competitor`. Per content-item moeten URL, datum, thema en bron-type queryable zijn.

**Precedent in codebase**: `BrandstyleSnapshot` (`prisma/schema.prisma:1860-1894`) implementeert al een immutable-snapshot patroon voor brandstyle-extractie, met `tokensHash`/`scrapeHash` voor no-op detection en `triggerSource` voor herkomst-traceability. Dit ADR volgt expliciet dat patroon — hetzelfde probleem, dezelfde oplossing.

**Constraints**:
- Bestaande `Competitor`-rij moet "current pointer" blijven — de zes API-routes en `getBrandContext` mogen niet breken.
- Geen polymorfische supertabel (`EntitySnapshot { entityType, entityId, payload }`) — we hebben pas twee instanties (Brandstyle, Competitor); abstractie is voorbarig.
- `analysisData Json?` op Competitor blijft als legacy-veld voor backwards-compat; nieuwe extracted-data hoort in Snapshot.
- Retention onbepaald — `BrandstyleSnapshot` heeft géén TTL; we volgen dat tot kosten-evidence anders dicteert.

# Decision

We voegen drie nieuwe Prisma-modellen toe naast (niet binnen) `Competitor`:

1. **`CompetitorSnapshot`** — immutable rij per refresh, volledige veld-state als JSON + hashes voor no-op detection. Eén `Competitor` heeft N snapshots. `Competitor` blijft de "latest"-pointer.
2. **`CompetitorActivity`** — typed semantic events met diff-payload, geproduceerd door de diff-engine die twee opeenvolgende snapshots vergelijkt.
3. **`CompetitorContentItem`** — discrete content-eenheden (blog-post, persbericht, social-post, case-study, …) met URL, publishedAt, format, theme-tags. Nodig voor methodology §6.2 content-gap-analyse.

Refresh-route wordt dual-write: eerst snapshot persisteren, dan diff tegen vorige snapshot, dan activity-events schrijven, ten slotte `Competitor` "current pointer" updaten. Bij hash-match (geen verandering) wordt geen nieuwe snapshot geschreven — `lastScrapedAt` op `Competitor` wel bijgewerkt.

## Schema-shape

```prisma
model CompetitorSnapshot {
  id                String    @id @default(cuid())
  capturedAt        DateTime  @default(now())

  // Fast no-op detection (analoog aan BrandstyleSnapshot)
  // contentHash = sha256 van canonical extracted-fields JSON
  // scrapeHash  = sha256 van cleaned scraped HTML/markdown bundle
  contentHash       String
  scrapeHash        String?

  // Volledige extracted-state — voor reconstructie + diffing.
  // Mirror van Competitor's AI-extracted velden + raw-scrape bundle.
  extractedJson     Json      // { tagline, valueProposition, differentiators[], pricingModel, ... }
  scrapedJson       Json?     // { homepageHtml, productPageHtml, blogIndexHtml, ... }
  embeddings        Json?     // pgvector-compatible: per-thema embedding voor content-gap

  // Herkomst
  triggerSource     SnapshotTriggerSource  // MANUAL | CRON_LIGHT | CRON_DEEP | API
  signalSource      CompetitorSignalSource // WEBSCRAPE | EXA | RSS | WAYBACK | REVIEWS | MANUAL
  triggeredById     String?
  triggeredBy       User?     @relation("CompetitorSnapshotTrigger", fields: [triggeredById], references: [id])

  // Optionele audit
  notes             String?   @db.Text
  errors            Json?     // partial-failure: { homepage: ok, blog: 404, pricing: timeout }

  competitorId      String
  competitor        Competitor @relation(fields: [competitorId], references: [id], onDelete: Cascade)
  workspaceId       String
  workspace         Workspace  @relation(fields: [workspaceId], references: [id], onDelete: Cascade)

  activities        CompetitorActivity[]   // 0..N events afgeleid t.o.v. previous snapshot
  contentItems      CompetitorContentItem[] // items toegevoegd in deze snapshot

  @@index([competitorId, capturedAt])
  @@index([workspaceId, capturedAt])
  @@index([contentHash])
}

model CompetitorActivity {
  id               String    @id @default(cuid())
  type             CompetitorActivityType
  severity         ActivitySeverity        @default(INFO) // INFO | NOTABLE | MAJOR

  // Diff-payload: een gestandaardiseerde voor/na shape per type.
  // Voor TAGLINE_CHANGED: { before: "...", after: "..." }
  // Voor NEW_BLOG_POST: { contentItemId, title, url, publishedAt }
  // Voor PRICING_CHANGED: { fields: ["pricingModel"], before, after }
  diffPayload      Json
  summary          String    @db.Text   // human-readable 1-zin samenvatting

  // Detectie-context
  detectedAt       DateTime  @default(now())
  detectionMethod  String    // "hash-diff" | "ai-classified" | "manual" | "rss-feed"
  confidence       Float?    // 0.0-1.0 — null voor deterministische detectie

  // Linkage — minstens snapshot OF manual reference
  snapshotId       String?
  snapshot         CompetitorSnapshot? @relation(fields: [snapshotId], references: [id], onDelete: Cascade)
  competitorId     String
  competitor       Competitor @relation(fields: [competitorId], references: [id], onDelete: Cascade)
  workspaceId      String
  workspace        Workspace  @relation(fields: [workspaceId], references: [id], onDelete: Cascade)

  // Surfaced/dismissed by user
  acknowledgedAt   DateTime?
  acknowledgedById String?

  @@index([competitorId, detectedAt])
  @@index([workspaceId, detectedAt])
  @@index([workspaceId, type, detectedAt])  // Strategy Analyst trend-queries
  @@index([competitorId, severity, acknowledgedAt])  // unread-major-events
}

model CompetitorContentItem {
  id              String    @id @default(cuid())
  url             String
  urlHash         String    // sha256(url) voor de-dup zonder volledige URL-vergelijking
  title           String
  excerpt         String?   @db.Text
  format          ContentFormat              // BLOG_POST | PRESS_RELEASE | CASE_STUDY | EBOOK | WEBINAR | PODCAST | VIDEO | SOCIAL_POST | DOC | TOOL
  publishedAt     DateTime?
  discoveredAt    DateTime  @default(now())

  // Thematische tagging — voor §6.2 content-gap matrix.
  themes          String[]  @default([])    // AI-classified onderwerpen
  language        String?                    // ISO 639-1
  embedding       Unsupported("vector(1536)")?  // pgvector — voor semantic-gap

  // Eerste snapshot waarin dit item werd gezien (voor "nieuw sinds vorige scan").
  firstSeenSnapshotId String?
  firstSeenSnapshot   CompetitorSnapshot? @relation(fields: [firstSeenSnapshotId], references: [id], onDelete: SetNull)
  signalSource        CompetitorSignalSource  // WEBSCRAPE | RSS | EXA | MANUAL

  competitorId    String
  competitor      Competitor @relation(fields: [competitorId], references: [id], onDelete: Cascade)
  workspaceId     String
  workspace       Workspace  @relation(fields: [workspaceId], references: [id], onDelete: Cascade)

  @@unique([competitorId, urlHash])
  @@index([competitorId, publishedAt])
  @@index([workspaceId, format, publishedAt])
  @@index([workspaceId, discoveredAt])
}

enum SnapshotTriggerSource {
  MANUAL          // user clicked refresh
  CRON_LIGHT      // weekly homepage + tagline + top-3 blogposts scan
  CRON_DEEP       // monthly full re-extraction met alle Fase 2 prompts
  API             // future: webhook/integratie
}

enum CompetitorSignalSource {
  MANUAL
  WEBSCRAPE
  EXA
  RSS
  WAYBACK
  REVIEWS
  GOOGLE_ALERT
}

enum CompetitorActivityType {
  // Positioning shifts
  TAGLINE_CHANGED
  VALUE_PROP_CHANGED
  TARGET_AUDIENCE_CHANGED
  CATEGORY_REPOSITIONING

  // Product / commercial
  NEW_PRODUCT
  PRODUCT_REMOVED
  PRICING_CHANGED
  NEW_OFFERING

  // Content cadence
  NEW_BLOG_POST
  NEW_PRESS_RELEASE
  NEW_CASE_STUDY
  NEW_FORMAT_EMERGING       // ai-classified pattern: was 0 podcasts, now 3 podcasts in 30d

  // Organisational signals
  HIRING_SIGNAL              // careers-page changes
  HEADCOUNT_RANGE_CHANGED
  FUNDING_EVENT              // detected via news/RSS
  LEADERSHIP_CHANGE

  // Brand surface
  VISUAL_REBRAND             // logo/colors significantly diverged
  SOCIAL_PRESENCE_CHANGE

  // Workspace lifecycle (manual)
  STATUS_CHANGED             // DRAFT → ANALYZED, etc.
  TIER_CHANGED
  USER_ANNOTATED             // user heeft handmatig event toegevoegd
}

enum ActivitySeverity {
  INFO        // bijv. small blog-cadence change
  NOTABLE     // bijv. new product, tagline tweak
  MAJOR       // bijv. category repositioning, funding event, full rebrand
}

enum ContentFormat {
  BLOG_POST
  PRESS_RELEASE
  CASE_STUDY
  EBOOK
  WEBINAR
  PODCAST
  VIDEO
  SOCIAL_POST
  DOC                  // help-docs, knowledge-base
  TOOL                 // calculators, free-tools
  EVENT                // conferenties, meetups
  OTHER
}
```

### Wijzigingen aan bestaand `Competitor`-model

Drie additieve velden, geen breaking change:

```prisma
model Competitor {
  // ... bestaande velden ongewijzigd ...

  // Monitoring (Fase 4 voorbereid, default: uit)
  monitoringEnabled    Boolean   @default(false)
  monitoringFrequency  MonitoringFrequency  @default(WEEKLY_LIGHT)
  nextScheduledScanAt  DateTime?

  // Aggregaten voor snelle UI zonder join (analoog aan ContentFidelityScore.findingsCount)
  snapshotCount        Int       @default(0)
  unacknowledgedActivityCount Int @default(0)

  // Relations toevoegen
  snapshots            CompetitorSnapshot[]
  activities           CompetitorActivity[]
  contentItems         CompetitorContentItem[]
}

enum MonitoringFrequency {
  OFF
  WEEKLY_LIGHT     // homepage + tagline + top-3 blog
  BIWEEKLY_LIGHT
  MONTHLY_DEEP     // volledige Fase 2 re-extraction
  QUARTERLY_DEEP
}
```

# Y-statement

In de context van **een Competitor-sectie die uitbreidt naar deep-research-frameworks (positioning-map, narrative, content-gap, battlecards) plus een Brandclaw-aangedreven freshness-loop**, facing **de eis dat methodology-conforme datum-stempels per claim, queryable trends voor Strategy Analyst, en content-gap-analyse op format-niveau geleverd worden zonder de zes bestaande Competitor-API-routes en `getBrandContext` te breken**, I decided **drie nieuwe Prisma-modellen (`CompetitorSnapshot`, `CompetitorActivity`, `CompetitorContentItem`) additief toe te voegen volgens hetzelfde immutable-snapshot patroon als `BrandstyleSnapshot`, met hash-based no-op detection en typed activity-events afgeleid van snapshot-diffs** to achieve **per-claim datum-traceability, indexeerbare trend-queries voor Strategy Analyst, en format-granulaire content-gap-analyse, met Brandclaw-monitoring als natuurlijke Fase 4 producer-rol op dezelfde schemas**, accepting tradeoff **drie extra tabellen + diff-engine als nieuwe code-laag, hogere DB-groei (deels gemitigeerd door hash-no-op), en migratie-pad dat een retroactieve initial-snapshot-backfill vereist voor ANALYZED competitors**.

# Consequences

## Positief
- **Backwards-compat**: het bestaande `Competitor`-contract blijft de "current pointer". `getBrandContext`, alle UI-routes en de Exa-discovery-flow werken zonder wijziging.
- **Pattern-consistentie**: identieke shape als `BrandstyleSnapshot` (hash-based, JSON-blobs, triggerSource) — minder cognitieve overhead voor toekomstige ontwikkelaars, en als ooit een polymorfische `EntitySnapshot` zinvol wordt zijn beide instanties gekend.
- **Trend-queryability**: composite-index `(workspaceId, type, detectedAt)` op `CompetitorActivity` levert Strategy Analyst-trends in één query zonder JSON-parsing.
- **Content-gap-analyse natively**: `CompetitorContentItem.format` + `themes[]` + composite-index `(workspaceId, format, publishedAt)` is precies wat methodology §6.2 tabel-1+tabel-2 vereist.
- **No-op-cheap polling**: `contentHash` match voorkomt dat een unchanged scrape een nieuwe snapshot-rij produceert — Brandclaw Fase 4 wekelijkse scans schalen lineair in changes, niet in scans.
- **Diff-engine is centraal**: één plek waar snapshot-deltas worden geclassificeerd → `CompetitorActivity`. Manual-event-injection (user voegt event toe) gebruikt dezelfde tabel met `detectionMethod = "manual"`.
- **`onDelete: Cascade` op workspace + competitor** voorkomt verweesde rijen consistent met restant van schema.
- **`acknowledgedAt`-pad** maakt een toekomstige in-app inbox triviaal — geen aparte notification-tabel nodig voor competitor-changes (`Notification` blijft voor cross-cutting concerns).

## Negatief / tradeoffs
- **Diff-engine is nieuwe code-laag**: classificatie van veld-deltas naar `CompetitorActivityType` vereist regels (deterministisch waar mogelijk) plus AI-fallback voor categorisatie zoals `NEW_FORMAT_EMERGING`. Risico op false positives bij minor-tekst-edits — mitigatie: `severity = INFO` default, `confidence`-veld voor AI-classificatie, en `snapshot.scrapedJson`-comparisons gebruiken normalisatie (whitespace, case) voor robustness.
- **DB-groei**: snapshots én scrapedJson kunnen groot zijn (10-50KB per snapshot). 10 workspaces × 6 competitors × monthly_deep = 720 snapshots/jaar, ~30MB/jaar — beheersbaar, maar voor pilot-cohort van 50+ workspaces wordt dit GB-orde. **Mitigatie deferral**: TTL of cold-storage-pad pas inrichten als monitoring-data evidence levert. Tot dan: alleen `extractedJson` (klein) garandeerd persistent, `scrapedJson` mag in toekomst ge-pruned worden vanaf snapshot N met `scrapedJson = null` en hash behoud.
- **Migratie-overhead**: bestaande ANALYZED competitors hebben geen "snapshot 0". Backfill-script vereist (zie Notes).
- **`unacknowledgedActivityCount` aggregatie-veld** moet consistent gehouden worden via Prisma extension hooks of API-route boilerplate — vergelijkbaar met `ContentFidelityScore.findingsCount` discipline.
- **Retention-onduidelijkheid voorlopig**: indefinite retention is een impliciete keuze die later beleidskeuze vereist (privacy: scraped concurrent-data, kostenbeheersing). Vastleggen in een follow-up ADR zodra meet-data binnenkomt.

## Neutraal
- **`MonitoringFrequency`-enum is voorbereid voor Fase 4** maar default `OFF` — schemawijziging is veilig zonder Brandclaw-loop te bouwen.
- **`CompetitorSignalSource`-enum is bewust uitgebreid voorbij MVP** (RSS, Wayback, Reviews, Google Alert) zodat Fase 5 geen schema-migratie hoeft. Niet-MVP waarden mogen in code disabled blijven.
- **`embedding Unsupported("vector(1536)")?`** sluit aan bij bestaande pgvector-usage; geen aparte extension-toevoeging.
- **Manual-events** (user voegt zelf "leadership change" event toe) gebruiken dezelfde `CompetitorActivity`-tabel met `snapshotId = null` en `detectionMethod = "manual"`. Eén surface, twee producers.

# Alternatives considered

- **Alt A — Single `CompetitorHistory` tabel met JSON-payload, geen ContentItem-split**: één tabel waar elke wijziging als `{type, before, after, payload}` JSON wordt opgeslagen, zonder aparte ContentItem. Afgewezen — content-gap-analyse §6.2 vraagt format-granulaire queries (`WHERE format = 'PODCAST' AND publishedAt > now() - 90d`); JSON-filtering is daarvoor te traag op pilot-schaal en breekt op pgvector-embedding-veld voor semantic gap. Bovendien: blog-posts hebben een eigen lifecycle (URL kan dood gaan, theme-tagging kan herclassificeerd worden) die niet hoort in een immutable activity-event.

- **Alt B — Polymorfische `EntitySnapshot { entityType, entityId, payload Json }`**: één generieke tabel voor Brandstyle-, Persona-, Brandvoice- én Competitor-snapshots. Afgewezen — typesafety verdwijnt (alle relations moeten via dynamic JSON-keys), Prisma cascade-relations werken niet polymorfisch zonder triggers, en we hebben pas twee instanties van het patroon. Abstractie is voorbarig. Wel: bij vier+ instanties opnieuw beoordelen (te markeren als open beslissing in idea-doc Verbeteringen-elders sectie).

- **Alt C — Append-only event-log zonder volledige snapshots**: alleen `CompetitorActivity` events bijhouden, geen volledige veld-state per scrape. Afgewezen om twee redenen: (1) reconstructie van historische state vereist replay vanaf creatie — duur en error-prone bij Strategy Analyst-queries die "state-at-time-T" willen weten, (2) diff-engine kan geen snapshot-naar-snapshot vergelijking doen zonder beide volledige states; ze zou het Competitor-pointer moeten lezen en muteren binnen één transactie, wat refresh-route fragiliseert.

- **Alt D — Updates direct in `Competitor` met `auditLog Json?` veld**: simpelste optie. Afgewezen — `analysisData Json?` is een precedent dat al laat zien hoe een opt-in JSON-veld stilletjes balloont en onqueryable raakt. Strategy Analyst trend-queries werken niet, content-gap werkt niet, en BrandstyleSnapshot-precedent maakt deze keuze inconsistent met bestaand schema-patroon.

- **Alt E — Externe time-series database (TimescaleDB, ClickHouse) voor activity-events**: Afgewezen — pre-launch infra-uitbreiding, single-node Postgres voldoet voor pilot-schaal. Heroverwegen wanneer activity-volume >10M rijen per workspace nadert.

# Notes

- **Cross-references**:
  - `tasks/_drafts/idea-competitive-intelligence-loop.md` — programma-context, draft 2026-05-08
  - `tasks/_drafts/idea-brand-control-program.md` — Δ-1 Strategy Analyst trend-queries depend op deze schemas
  - ADR `2026-05-08-fval-output-schema-bevindingen` — pattern-precedent voor additieve-output-uitbreiding zonder bestaand contract te breken
  - `prisma/schema.prisma:1860-1894` — `BrandstyleSnapshot` als concrete shape-precedent

- **Migratie-pad** (drie passes, één Prisma-migration en één data-script):

  1. **Schema-migration `add_competitor_snapshot_models`** — additief, geen data-rewrite. Inclusief `monitoringEnabled`/`monitoringFrequency` defaults `false`/`WEEKLY_LIGHT` op `Competitor` (geen runtime-impact tot Fase 4 actief).
  2. **Backfill-script `prisma/scripts/backfill-competitor-snapshots.ts`** — voor elke `Competitor` met `status = ANALYZED`: lees huidige veld-state, hash, schrijf één `CompetitorSnapshot` met `triggerSource = MANUAL`, `signalSource = WEBSCRAPE`, `notes = "retroactive backfill 2026-05-XX"`. `scrapedJson = null` (origineel scrape niet meer beschikbaar). Update `Competitor.snapshotCount = 1`. Idempotent — skip als snapshot met `notes startswith "retroactive backfill"` al bestaat.
  3. **Refresh-route omschrijven** (`src/app/api/competitors/[id]/refresh/route.ts`) — dual-write pattern: snapshot first, dan diff vs latest, dan activities, dan Competitor-pointer update. Bij `contentHash` match: skip snapshot-write, alleen `lastScrapedAt` updaten. Eén transactie.

- **Diff-engine plek**: nieuw bestand `src/lib/competitors/diff-engine.ts`. Inputs: prevSnapshot, newSnapshot. Outputs: `CompetitorActivity[]`. Deterministische rules voor field-level changes (TAGLINE_CHANGED, PRICING_CHANGED, …); AI-fallback (`detectionMethod = "ai-classified"`, `confidence < 1`) voor pattern-detection (NEW_FORMAT_EMERGING, CATEGORY_REPOSITIONING).

- **Index-keuze argumentatie**:
  - `(competitorId, capturedAt)` — render history-tab voor één concurrent (per-page query)
  - `(workspaceId, capturedAt)` — cross-competitor freshness-overzicht ("welke concurrenten zijn ouder dan 30 dagen?")
  - `(workspaceId, type, detectedAt)` op Activity — Strategy Analyst trend-queries ("PRICING_CHANGED events laatste kwartaal in workspace X")
  - `(competitorId, severity, acknowledgedAt)` — in-app inbox unread-major-events filter
  - `(competitorId, urlHash)` UNIQUE — voorkomt dubbel-tellen blog-posts bij overlappende scans
  - `(workspaceId, format, publishedAt)` op ContentItem — content-gap-matrix render

- **Cache-invalidation**: refresh-route moet `cacheKeys.competitors.list(workspaceId)` én `cacheKeys.competitors.detail(competitorId)` invalideren. Nieuwe cache-key: `cacheKeys.competitors.activity(workspaceId)` voor cross-competitor activity-feed.

- **Retention-beleid (open, follow-up)**: nu indefinite. Heroverweeg met ADR-update zodra (a) snapshot-tabel >100k rijen, of (b) een privacy-incident scraping-data raakt. Mitigatie-pad: `scrapedJson = null` na 90 dagen (behoud `extractedJson` + hashes voor diff-historie); volledige snapshot-deletion na 2 jaar voor INFO-severity activity-bronnen.

- **Brandclaw Fase 4 voorbereiding**: `MonitoringFrequency`-enum + `nextScheduledScanAt` zijn nu al toegevoegd zodat de scheduling-laag geen tweede schema-migratie nodig heeft. De daadwerkelijke cron-job + `monitor_competitor` Brandclaw-tool blijven scope van post-launch idea-promotion.

- **Niet in scope van deze ADR** (expliciet):
  - De UI-laag voor history-tab, positioning-map, content-gap-matrix (Fase 2 idea)
  - De cron-scheduling-infra (Vercel Cron vs Upstash QStash) — eigen ADR bij Fase 4
  - De multi-language extractie-prompts voor narrative-analyse (eigen ADR mogelijk)
  - Embedding-pipeline voor `CompetitorContentItem.embedding` — al bestaande pgvector-flow hergebruiken via `src/lib/ai/embeddings.ts`
