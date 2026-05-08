---
id: competitor-content-item-discovery
title: Competitor content-item discovery — eerste producer voor CompetitorContentItem (RSS + sitemap + AI-classify)
status: pending-tech
created: 2026-05-08
verdict: needs-validation-first
revision: 2026-05-08 — A1 probe uitgevoerd (42.9% RSS hit-rate, < 50% threshold), scope-cut nodig naar sitemap-first variant. Zie docs/audits/2026-05-08-competitor-rss-probe-results.md.
---

# Probleemstelling (1 zin)

`CompetitorContentItem` is sinds Fase 1 in het schema (`prisma/schema.prisma:3994-4029`) maar leeg in productie — er is geen producer die blog-posts, persberichten of andere content-items per concurrent ontdekt en wegschrijft, waardoor methodology §6.2 content-gap-analyse en Fase 4 Brandclaw monitoring geen data hebben om op te leunen.

# WHO — Doelgebruiker

**Rol**: brand-strategist in pilot-merk of agency-medewerker die competitive content-strategie wil begrijpen — welke thema's pakken concurrenten op, met welke cadence, en in welke formats.
**Schaal**: alle pilot-merken (n≈10), met 4-15 concurrenten per workspace. Discovered-items volume: 10-50 retro per concurrent, 1-5 nieuw per maand.
**Acuut segment**: agency die in week 2 van een pilot een campagne-pitch voorbereidt — zij hebben verse content-cadence-data nodig om een "wij doen X wat zij niet doen" of "we missen format Y" argument te onderbouwen.

## JTBD-narratief

> "Toen ik competitor X opende in Branddock, wilde ik in één blik zien welke 10 meest-recente blogposts ze hadden, met thema's, om te kunnen zeggen 'ze drukken hard op duurzaamheid maar negeren prijspositionering' — maar de Concurrenten-pagina toont alleen high-level extractie zonder cadence of formats. Ik viel terug op handmatig hun blog-archief openen."

## Evidence

- `prisma/schema.prisma:3994-4029` — `CompetitorContentItem` met `format`, `themes`, `signalSource`, `urlHash` unique — schema klaar, geen producer
- `tasks/_drafts/idea-competitive-intelligence-loop.md` — Fase 1 idea-doc verwijst naar deze vervolg-task expliciet
- Methodology mei 2026 §6.2 (content-gap-analyse) — eist format-niveau granulariteit (blog-posts vs persberichten vs ebooks vs podcasts)
- `docs/audits/2026-05-08-competitor-monitoring-cost-model.md` — Fase 4 monitoring rekent op content-cadence-detectie (NEW_BLOG_POST, NEW_PRESS_RELEASE activity-types) die deze task voedt

# WHAT — Probleem (niet oplossing)

Drie waarneembare gebreken vandaag:

1. **Lege ContentItem-tabel** — schema heeft format-enum + themes-array + embedding-veld, maar 0 rijen in productie. Geen content-gap-matrix mogelijk.
2. **Geen content-cadence-signaal** — Fase 1 diff-engine detecteert positionering-changes maar geen "concurrent X publiceert sinds 30 dagen 3× zoveel blog-posts over thema Y". Dat trend-signaal is precies waar Strategy Analyst (Phase 3 BCP) op leunt.
3. **Activity-events `NEW_BLOG_POST` / `NEW_PRESS_RELEASE` zijn enum-only** — staan in `CompetitorActivityType` (Fase 1) maar worden door geen producer geschreven. UI die op deze events filtert toont leeg.

# WHY-NOW

- **Fase 1 schema is gemerged** (PR-5) — producer kan nu landen zonder schema-wijziging
- **Brand Control Program Phase 3 (Strategy Analyst stub)** rekent op content-trend-queryability uit deze tabel — pre-launch dependency
- **Pilot-pitch (+10-14 weken)**: concurrent-content-cadence is een sterk demo-argument — leeg datamodel werkt niet als demo
- **Cost-model Fase 4** assumeert een werkende content-detectie — zonder deze task is `NEW_BLOG_POST` activity-detection altijd 0

Triggers:
- Schema wacht (Fase 1 done 2026-05-08)
- Phase 2 review-surfaces taak `content-review-multi-surface` is gepromoot — kan in parallel met deze task
- Pilot-merken hebben nu al website-URLs in hun Competitor-records → producer heeft input

# SUCCESS METRICS

**Primaire metric**: % pilot-competitors waarvoor minstens 5 blog-posts of persberichten zijn gediscovered binnen 7 dagen na eerste refresh — gemeten 30 dagen na livegang. Doel: ≥75%.

**Secundair**:
- Gemiddelde discovery-latency: van competitor-create tot eerste content-items in DB (doel: < 24u, of synchroon binnen refresh-call)
- Format-coverage breedte: % competitors met >1 format gedetecteerd (doel: ≥50% — laat zien dat producer niet alleen blog-posts vindt)
- AI-classification confidence-rate: % items met `>0.8` confidence in format-detectie (doel: ≥80%)

**Counter-metric** (mag NIET kapotgaan):
- Refresh-route p95-latency mag niet > 30s worden (huidige is ~10-20s door scrape + AI-extractie). Als content-discovery synchroon te traag is → async-fallback verplicht.
- Token-cost per refresh ≤ $0,06 (cost-model light-scan budget)
- Robots.txt respect: 0 violations gemeten via user-agent in scrape-headers

# CONSTRAINTS

## Hard
- **Robots.txt respect** — vóór elke scrape de robots.txt checken voor de specifieke URL-paden die we crawlen (RSS, sitemap, blog-pagina's)
- **Rate-limit per host** — max 1 request/sec per concurrent-domain om geen rogue-bot-status te krijgen. Sequentieel binnen één refresh-call, geen parallel crawl.
- **Geen persoonsgegevens** — auteur-namen op blog-posts NIET opslaan. Alleen titel, URL, datum, excerpt (eerste ~200 chars), themes.
- **GDPR/AVG**: scraped excerpt is publieke content — geen issue. Maar geen auteur-tracking, geen email-extractie, geen mailto-harvest.
- **Cost-budget** uit cost-model: deze task voegt aan de "light scan" cost van Fase 4. Hard cap: scraping + AI-classify + embedding-genereren samen ≤ $0,03 per refresh.
- **Tijd**: pre-launch — schema is bereid, producer-implementatie binnen 5-7 dagen voor MVP-scope.

## Soft
- Voorkeur RSS-first (gestructureerd) boven HTML-scrape (fragiel)
- Bestaande `src/lib/website-scanner/` infrastructure hergebruiken (pattern + scrape-pipeline)
- Generieke `competitorFetch` helper i.p.v. ad-hoc fetch-calls (DRY met Fase 1 refresh-route)

## Must NOT do
- Geen Wayback-historiek crawlen (zou 100en items per concurrent toevoegen — buiten scope)
- Geen real-time push subscriptions (PubSubHubbub etc.) — overkill voor MVP
- Geen cross-concurrent dedup (zelfde guest-blog-post bij twee concurrenten) — Fase 2 UI-laag, niet hier
- Geen comment-section / engagement metrics scraping
- Geen authenticated-only content (gated whitepapers achter form-wall)
- Geen LinkedIn-post / Twitter-feed scraping (bepalend tegen ToS, requires API)

# SCOPE

## In-Scope (MVP, ~5-7 dagen)

**Producer-laag**:
- Nieuwe lib: `src/lib/competitors/content-discovery/` met `rss-discoverer.ts`, `sitemap-discoverer.ts`, `content-classifier.ts`, `discoverer.ts` (orchestrator)
- RSS-feed detection: probeer standaard URL-paden (`/feed`, `/rss`, `/rss.xml`, `/atom.xml`) + `<link rel="alternate" type="application/rss+xml">` parsing op homepage
- Sitemap.xml fallback voor sites zonder RSS — parse `<url>` entries die `/blog/`, `/news/`, `/press/`, `/case-studies/` bevatten
- Format-classifier: regel-eerst (URL-path-pattern → BLOG_POST / PRESS_RELEASE / CASE_STUDY) + AI-fallback (Claude Haiku, $0,008/call) voor onduidelijke gevallen
- Theme-tagger: één AI-call per discovered batch (5-10 items) → array van 2-3 themes per item
- Synchroon binnen `POST /api/competitors/[id]/refresh` — geen aparte cron in MVP

**Schema-uitbreidingen** (klein):
- `CompetitorContentItem.discovererVersion` int default 1 — voor toekomstige re-discovery na format-classifier upgrades
- Geen embedding-pipeline yet (out-of-scope)

**Activity-event-emissie**:
- Bij elk niewe ContentItem: produce `NEW_BLOG_POST` / `NEW_PRESS_RELEASE` / `NEW_CASE_STUDY` activity met severity NOTABLE
- Diff-engine uitbreiding (`src/lib/competitors/diff-engine.ts`): nieuwe rule "compare contentItems vóór en na refresh" → emit activity per nieuwe URL

**UI-laag** (out-of-scope deze task — eigen Fase 2 task)

## Out-of-Scope (expliciet NIET, ook al verleidelijk)

- **Embedding-pipeline** voor `CompetitorContentItem.embedding` — vereist OpenAI text-embedding-3-small batch-call, eigen cost + producer; volgt in `competitor-content-embedding-pipeline` vervolg-task
- **Async / cron-discovery** — Fase 4 brandclaw-monitoring zal cron-driven monitoring brengen; MVP synchroon binnen refresh
- **Wayback Machine ingestion** — Fase 5 external signals
- **RSS auto-discovery van podcasts** — apart parser nodig (RSS Audio / iTunes XML); skip MVP
- **Webinar / live-event detection** — vaak achter form-wall; defer
- **Social-post scraping** (LinkedIn, X, Instagram) — ToS-issues, requires API access; defer
- **Authenticated content** (gated whitepapers, paywall articles)
- **Cross-language content normalization** — items in NL, EN, DE allemaal accepteren maar niet vertalen
- **Author / byline extraction** — privacy-issue, geen meerwaarde voor MVP
- **Engagement metrics** (likes, shares, comments) — niet beschikbaar zonder authenticated APIs
- **Real-time push** (PubSubHubbub, WebSub) — overkill
- **Content-deduplication** tussen concurrenten — UI-laag in Fase 2
- **Smart content-summarization** (TL;DR generation) — defer

> Out-of-Scope > In-Scope: ✓ (12 vs 5)

# AANNAMES

- **A1** — ~~≥70% van pilot-concurrenten heeft een werkende RSS-feed~~ **VERWORPEN 2026-05-08**: probe `scripts/probes/competitor-rss-hit-rate.ts` op 7 ANALYZED competitors gaf **42.9% hit-rate**. Alle hits zijn WordPress-sites met `/feed`. Homepage `<link rel="alternate">` parsing voegde 0% toe. Implicatie: scope-cut naar sitemap-first variant. Zie [`docs/audits/2026-05-08-competitor-rss-probe-results.md`](../../docs/audits/2026-05-08-competitor-rss-probe-results.md).
- **A2** — Sitemap.xml fallback dekt 90% van de overige 30% — bewijs: sitemap is bijna verplicht voor SEO, dus aanwezigheid is hoog. Onbewezen, maar low-risk; als hit < 90% kan een derde fallback (HTML scrape `/blog/`, `/news/`) erbij in MVP+.
- **A3** — URL-path-patroon classificatie haalt 80% accuracy op format-detectie — bewijs: meeste sites volgen `/blog/` of `/news/` conventies. Onbewezen — meet via 50-item sample na A1 validatie. Bij <70%: AI-fallback noodzakelijk in MVP.
- **A4** — Theme-tagging via AI-call levert nuttige labels (gebruikers vinden ze accuraat) — bewijs: vergelijkbare patterns werken in `studio-content-generation` voor eigen content. Onbewezen voor competitor-content. Geen blokker — bij slechte kwaliteit kan tagger uit zonder schema-impact.
- **A5** — Refresh-call met content-discovery erbij blijft binnen 30s — bewijs: scrape parallel + AI-classify in batches van 5. Onbewezen — meet in dev na implementatie. Bij overschrijding: async-fallback (jobqueue).

> Onbewezen aannames vereisen validatie VOOR build, niet erna. A1 + A3 zijn pre-build validatie-acties (klein, scriptable).

# ACCEPTATIECRITERIA (MVP)

- [ ] Given een Competitor met `websiteUrl` ingevuld, When de gebruiker `POST /api/competitors/[id]/refresh` aanroept, Then er worden 0..N `CompetitorContentItem`-rijen gecreëerd met correcte `format` enum, `urlHash` unique, `firstSeenSnapshotId` link naar de huidige refresh-snapshot.
- [ ] Given een Competitor zonder RSS én zonder sitemap, When refresh draait, Then het endpoint blijft 200 retourneren (geen content-items, geen error). Producer faalt graceful.
- [ ] Given een Competitor met 8 nieuwe blog-posts t.o.v. vorige refresh, When refresh draait, Then er ontstaan 8 NEW_BLOG_POST `CompetitorActivity`-rijen met severity NOTABLE en `snapshotId` link.
- [ ] Given een Competitor waarvan de RSS-feed 5 items returnt waarvan 3 al in DB staan (matching `urlHash`), When refresh draait, Then alleen de 2 nieuwe items worden geschreven; geen duplicate-key errors.
- [ ] Given een 1000-items-bevattende RSS-feed, When refresh draait, Then alleen de 25 meest-recente worden geprocessed (truncation guard) — voorkomt cost-explosie.
- [ ] Given een refresh op een Competitor met content-discovery, When het scrape-deel >10s duurt, Then de discovery wordt afgebroken na timeout en het endpoint return de competitor zonder content-items (graceful degradation).
- [ ] `npx tsc --noEmit` 0 errors
- [ ] `npm run lint` 0 errors in nieuwe files
- [ ] Smoke-test: `scripts/smoke-tests/competitor-content-discovery.ts` valideert RSS-parsing, sitemap-fallback, classifier, dedup en activity-emissie tegen 3 fixture-feeds (één goede RSS, één sitemap-only, één lege)
- [ ] PR-3-style helper-extractie: `applyContentItemDiscovery(tx, ...)` herbruikbaar door route + smoke

# EERSTE TAAK (morgen startbaar)

**A1 validatie-script** (1u): schrijf `scripts/probes/competitor-rss-hit-rate.ts` dat de bestaande 25 ANALYZED competitors in dev-DB itereert, RSS-paden test (`/feed`, `/rss`, `/rss.xml`, `/atom.xml`, plus homepage `<link rel="alternate">`), en logt hoeveel werkende feeds gevonden zijn. Output: per-competitor regel `name | rssFound: y/n | path: <path or none>`. Bij hit-rate ≥ 70%: A1 bevestigd, MVP scope blijft. Bij < 70%: scope-cut nodig (sitemap-first ipv RSS-first).

Direct daarna: `rss-parser` library kiezen (npm pakket comparison: `rss-parser` vs `feedparser`) — kleine ADR / decision-note van 10 regels in `docs/adr/_drafts/`.

---

# Red Team Review

## Zwakste schakel

**Aanname A1 (RSS-feed dekking)**. Als < 50% van pilot-concurrenten een werkende RSS heeft, is sitemap.xml fallback de hoofdpaadje. Sitemap-parsing is fragielere format-detection (URL-pattern only, geen `<title>` of `<description>`) — accuracy van format-classifier dropt mogelijk onder de 80% target, en theme-tagger heeft minder context. MVP-scope blijft uitvoerbaar maar quality lijdt; vereist tweaks aan classifier.

## Pleidooi tegen dit plan

Pre-launch is overspannen. Phase 1 BCP draait, Phase 2 task-files net gepromoot, Canvas-cluster heeft 6 open tasks. Een vervolg-task in de competitive-intel werkstroom concurreert direct met Δ-1 / Δ-4 review-surfaces die voor de pilot-pitch belangrijker zijn (review-side capability vs nice-to-have content-cadence). Bovendien: een leeg `CompetitorContentItem` is in pilot acceptabel — pilot-merken kunnen Concurrenten-pagina alsnog bekijken voor positioning + messaging extractie zonder content-items. Defer naar post-launch + Fase 4 sluit naadloos aan op cron-driven discovery.

## Wat zouden we leren door NIET te bouwen

Door A1 + A3 alleen als probes te draaien (niet bouwen), leren we de feasibility cijfers zonder commit. Kan dan beter gefundeerd op-bouwen post-launch met evidence-based scope (welke fallback-paden echt nodig, welke formats prioriteit hebben). Risico van uitstel: pilot-pitch heeft zwakker demo-argument en Strategy Analyst Phase 3 mist signalen om op te trainen.

## Verdict van de planner

**needs-validation-first** (revisie 2026-05-08 na A1 probe) — A1 verworpen, scope-cut nodig vóór technical-planner kan promoten. Schema is mergeable, hookt aan Phase 3 BCP en Fase 4. Out-of-scope > In-scope.

Drie open validatie-stappen vóór promotion:
1. **A2 sitemap.xml-coverage probe** op zelfde 7 competitors — verwacht 85% hit-rate, te valideren in vervolg-probe (~30 min)
2. **A3 format-classifier accuracy** op 50-item sample (gemixt sitemap + RSS items) — bepaalt of AI-classifier in MVP-pad zit of optioneel
3. **HTML-fallback hit-rate** voor sites zonder RSS én zonder sitemap — voorkomt MVP gap voor 10-15% niche

Bij A2 ≥ 70% hit-rate: scope reviseren naar sitemap-first variant met deze cijfers en alsnog promoten naar technical-planner.

Async-fallback design (A5) blijft staan als pre-build voorbehoud.

# 5-Punts Stop-Conditie

- [x] Probleem in 1 zin formuleerbaar
- [x] Eén primaire success-metric (≥75% pilot-competitors met ≥5 items in 7d)
- [x] Out-of-Scope-lijst langer dan In-Scope-lijst (12 vs 5)
- [x] MVP-acceptance-criteria concreet (Given/When/Then)
- [x] Eerste taak morgen startbaar (A1 validatie-script, 1u)

# Volgende stap

Run A1 validatie-script vóór technical-planner promotion. Bij hit-rate ≥ 50%: ready-to-build. Bij < 50%: revisie scope-cut naar sitemap-first variant.
