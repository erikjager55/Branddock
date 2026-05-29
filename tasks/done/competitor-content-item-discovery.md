---
id: competitor-content-item-discovery
title: Competitor content-item discovery — sitemap-first producer voor CompetitorContentItem
fase: pre-launch
priority: now
effort: 5-7 dagen
owner: claude-code
status: done
created: 2026-05-12
completed: 2026-05-29
related-adr: 2026-05-08-competitor-snapshot-historie
related-spec: tasks/_drafts/idea-competitor-content-item-discovery.md
worktree: branddock-brandclaw
---

# Probleem

`CompetitorContentItem` (schema regel 3994-4029) is sinds Fase 1 (sprint #2 `competitor-snapshot-historie`) klaar maar leeg — geen producer. Activity-events `NEW_BLOG_POST` / `NEW_PRESS_RELEASE` / `NEW_CASE_STUDY` (enum in schema) worden door geen producer geschreven. Strategy Analyst Phase 3 leunt op content-trend-queryability die deze tabel moet voeden.

Pre-build validaties al uitgevoerd 2026-05-08:
- **A1 RSS**: 42.9% hit-rate op 7 ANALYZED competitors → niet RSS-first
- **A2 Sitemap**: 71.4% hit-rate → boven 70% target → sitemap-first MVP
- **A3 Classifier**: 100% accuracy met Haiku 4.5 op 25 hand-gelabelde URLs
- **HTML fallback**: 0% → verworpen

# Voorstel

Sitemap-first producer-laag binnen refresh-call. Hybrid classifier: regel-eerst (URL-path-pattern) + AI-fallback (Haiku) voor onduidelijke gevallen.

**4-laagse discovery pipeline**:
1. RSS attempt (`/feed`, `/rss`, `/rss.xml`, `/atom.xml`) — ~43% hit
2. Sitemap.xml fallback parse `<url>` entries op `/blog/`, `/news/`, `/press/`, `/case-studies/` paths
3. Per discovered URL: format-classifier (URL-path-regex + AI-fallback bij onduidelijkheid)
4. Theme-tagger: 1 batched AI-call per 5-10 items → 2-3 themes per item

# Acceptatiecriteria

**Producer-laag** (nieuw):
- [ ] `src/lib/competitors/content-discovery/rss-discoverer.ts` — RSS-feed detection met standaard URL-paden + homepage `<link rel="alternate">` parsing
- [ ] `src/lib/competitors/content-discovery/sitemap-discoverer.ts` — sitemap.xml parsing met path-filter (`/blog/`, `/news/`, `/press/`, `/case-studies/`)
- [ ] `src/lib/competitors/content-discovery/content-classifier.ts` — URL-path-regex eerst, AI-fallback (Claude Haiku 4.5) voor onduidelijke gevallen, theme-tagger batch
- [ ] `src/lib/competitors/content-discovery/discoverer.ts` — orchestrator: probeert RSS → sitemap fallback → classifier → DB-write

**Persistence**:
- [ ] CompetitorContentItem rij per uniek URL: title + url + urlHash (unique) + format enum + themes[] + firstSeenSnapshotId + publishedAt (if RSS) + discovererVersion=1
- [ ] Dedup via urlHash — bestaande items niet opnieuw inserten
- [ ] Truncation: max 25 meest-recente items per refresh (anti cost-explosion)

**Schema-uitbreiding** (klein additief):
- [ ] `CompetitorContentItem.discovererVersion Int @default(1)` — voor toekomstige re-discovery na format-classifier upgrades

**Activity-emission**:
- [ ] `src/lib/competitors/diff-engine.ts` — nieuwe rule "compare contentItems-set vóór en na refresh" → emit CompetitorActivity per nieuwe URL met type `NEW_BLOG_POST` / `NEW_PRESS_RELEASE` / `NEW_CASE_STUDY` (per format) en severity `NOTABLE`

**Robots + rate-limit**:
- [ ] Robots.txt check vóór elke scrape (cached per domain × 1 dag)
- [ ] Max 1 request/sec per concurrent-domain (sequential binnen refresh-call)
- [ ] User-agent string identificeert Branddock

**Graceful degradation**:
- [ ] Competitor zonder RSS én zonder sitemap → refresh returnt 200, 0 content-items, geen error
- [ ] Scrape-timeout > 10s → discovery breekt af, refresh returnt zonder content-items
- [ ] 1000-items RSS → truncate naar 25, geen cost-explosion

**Smoke**:
- [ ] `scripts/smoke-tests/competitor-content-discovery.ts` — 3 fixture-feeds: (a) werkende RSS, (b) sitemap-only, (c) leeg

**Quality gates**:
- [ ] `npx tsc --noEmit` 0 errors
- [ ] `npm run lint` 0 errors
- [ ] Refresh-route p95 ≤ 30s (counter-metric)
- [ ] Cost per refresh ≤ $0,06 (light-scan budget — scrape + AI-classify + theme-tag samen)

# Bestanden die ik aanraak

**Nieuw**:
- `src/lib/competitors/content-discovery/rss-discoverer.ts`
- `src/lib/competitors/content-discovery/sitemap-discoverer.ts`
- `src/lib/competitors/content-discovery/content-classifier.ts`
- `src/lib/competitors/content-discovery/discoverer.ts`
- `scripts/smoke-tests/competitor-content-discovery.ts`

**Modify**:
- `src/lib/competitors/diff-engine.ts` — content-item-set vergelijking + activity-emission
- `src/lib/competitors/refresh-helper.ts` (`applyCompetitorRefreshDualWrite`) — content-discovery toevoegen na snapshot-write
- `src/app/api/competitors/[id]/refresh/route.ts` — verifieer de orchestrator-call paths
- `prisma/schema.prisma` — `discovererVersion Int @default(1)` op CompetitorContentItem

**Migration**:
- `prisma/migrations/<timestamp>_add_content_item_discoverer_version/migration.sql` — additief

# Bestanden die ik NIET aanraak

- Embedding-pipeline (CompetitorContentItem.embedding) — eigen vervolg-task
- Async / cron-based discovery — Fase 4 brandclaw-monitoring
- Wayback Machine ingestion — Fase 5 external signals
- LinkedIn / X / podcast scraping — ToS-issues, defer
- Author / engagement-metric extraction
- Cross-competitor content-dedup — UI-laag Fase 2
- UI voor content-items (Concurrent detail-tab) — Fase 2 UI-task

# Smoke test plan

**A2-validatie re-run** (verifieer post-build dat sitemap-first nog werkt):
1. `npx tsx scripts/probes/competitor-content-source-availability.ts` (bestaand) → ≥70% sitemap hit-rate behouden

**Smoke-flow per fixture**:
1. RSS-feed fixture (WordPress-style) → producer detecteert RSS → parsing OK → 5+ items in DB met title/url/themes
2. Sitemap-only fixture → producer detecteert geen RSS → sitemap fallback → 5+ items in DB
3. Lege fixture (geen RSS, geen sitemap, geen blog-paths) → 0 items, 200-status, geen error

**Live smoke**:
- Pick één pilot-competitor (e.g. better-brands competitor met website) → manual refresh → verifieer:
  - CompetitorContentItem rijen gecreëerd
  - CompetitorActivity rijen met juiste types
  - urlHash unique-constraint respect (geen duplicates op tweede refresh)

# Risico's

- **Sitemap hit-rate degraderen** — als pilot-merken concurrenten zonder sitemap binnenbrengen (private SaaS sites e.g.). **Mitigatie**: probe-script blijft in CI; bij hit-rate < 50%: HTML-scrape derde fallback overwegen post-launch
- **Classifier-accuracy** op edge-cases (slug-only URLs zonder duidelijk pad). **Mitigatie**: AI-fallback voor onduidelijke patterns; confidence-veld stores
- **Cost-overschrijding** door theme-tagger op large batches. **Mitigatie**: truncate naar 25 items per refresh
- **Robots.txt violations** — silently bot-getrigerd. **Mitigatie**: expliciete robots-check + user-agent identifier
- **Concurrent SoS** door rapid refreshes. **Mitigatie**: 1-req/sec rate-limit per domain

# Out of scope

- Embedding-pipeline (vervolg-task: `competitor-content-embedding-pipeline`)
- Async / cron-driven discovery (Fase 4)
- Wayback historiek (Fase 5)
- Auth-gated content (whitepapers achter form-wall)
- Social-media scraping (LinkedIn, X, Instagram)
- Cross-language normalization (NL/EN/DE accepteren maar niet vertalen)
- Real-time push subscriptions (PubSubHubbub)
- Smart TL;DR generation

# Notes

Validaties uitgevoerd:
- A1 RSS (`docs/audits/2026-05-08-competitor-rss-probe-results.md`)
- A2 Sitemap (`docs/audits/2026-05-08-competitor-content-source-availability.md`)
- A3 Classifier (`docs/audits/2026-05-08-competitor-classifier-accuracy.md`)

Idea-draft (170+ regels) blijft als detailed reference in `tasks/_drafts/idea-competitor-content-item-discovery.md`.

Volgorde binnen Track B: parallel mogelijk met competitor-ai-event-classifier (verschillende files). Beide na `brandclaw-tool-orchestrator` foundation.

---

## Implementatie-summary (2026-05-29, changelog #275)

4-fasen build op worktree `branddock-feat-content-discovery` → gemerged naar main.

**Nieuwe module** `src/lib/competitors/content-discovery/`:
- `fetch-policy.ts` — `politeFetch` (SSRF-guard via `assertSafeUrl`, robots.txt-respect + in-memory cache 1-dag, per-host 1req/s throttle met slot-reservatie, Branddock-UA, timeout) + `normalizeUrl`/`hashUrl` (sha256 dedup-key, strip tracking-params/fragment/trailing-slash) + `CONTENT_PATH_RE`.
- `rss-discoverer.ts` — 5 feed-paden + homepage `<link rel=alternate>`, cheerio xmlMode parse (RSS `<item>` + Atom `<entry>`).
- `sitemap-discoverer.ts` — robots `Sitemap:` + 4 fallback-paden, `<sitemapindex>`-recursie (1 niveau, max 5 children), content-path-filter.
- `content-classifier.ts` — regex-first format-classificatie + gebatchte Haiku 4.5-fallback (verbatim A3-prompt, enum-gevalideerd) + gebatchte theme-tagger.
- `discoverer.ts` — orchestrator: RSS+sitemap merge → dedup vs `existingUrlHashes` → truncate 25 by recency → classify → drop OTHER → theme-tag → bouw items + activities. budgetMs fetch-budget, never-throw.

**Integratie**: `refresh/route.ts` roept de discoverer async **vóór** de TX (spiegelt de AI-classifier); items gaan via nieuwe `contentItems`-param de dual-write-TX in (`createMany({skipDuplicates})` op `@@unique([competitorId, urlHash])`, `firstSeenSnapshotId`=snapshot of null op no-op). `diff-engine.buildContentItemActivities` (pure) mapt BLOG_POST/PRESS_RELEASE/CASE_STUDY → NEW_*-events; overige formats opgeslagen zonder event. Schema: `CompetitorContentItem.discovererVersion` (additief, bootstrap-SQL geparkeerd).

**Afwijkingen vs task-file** (gemotiveerd): `db push`+bootstrap-SQL i.p.v. migration (poisoned baseline); `refresh-write.ts` i.p.v. `refresh-helper.ts`; activities in discoverer (computeDiff is puur); `NEW_FORMAT_EMERGING` out-of-scope (AI-classified bucket); `signalSource` RSS/WEBSCRAPE (geen SITEMAP-enum).

**Verificatie**: tsc 0 · eslint 0 · dual-write smoke 31/31 (Scenario 4 = content-items persistence) · `smoke:competitor-content-discovery` 18/18 (RSS / sitemap-index-recursie / leeg) · live charthop.com = 24 items + 8 activities + Haiku-themes · 2-subagent review (0 critical, WARNINGs gefixt: throttle-race, budget-comment, unbounded-maps, producer-versie).

**Open follow-ups** (uit review, niet-blokkerend): normalizeUrl dedupt alleen vaste tracking-params (niet `?page=`/`?lang=`); `language` blijft null (geen detectie in MVP); parseRobots merge't UA-groepen (geen RFC 9309 precedence). Embedding-pipeline + async/cron-discovery (Fase 4) blijven aparte tasks.
