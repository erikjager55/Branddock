---
id: competitive-intelligence-loop
title: Competitive intelligence — deep-research, analyse-frameworks en Brandclaw freshness-loop
status: pending-tech
created: 2026-05-08
verdict: needs-validation-first
---

# Probleemstelling (1 zin)

De Concurrenten-sectie is vandaag een eenmalige data-extractie (URL → AI vult ~25 velden), zonder analyse-frameworks (narrative, positioning-map, content-gap, battlecards), zonder freshness-mechaniek, en zonder integratie met Brandclaw — terwijl een goede competitive brief méér frameworks vraagt en concurrent-data binnen weken veroudert.

# WHO — Doelgebruiker

**Rol**: brand strategist binnen een direct merk of agency-medewerker die positionering en messaging moet onderbouwen vóór een campagne of nieuwe propositie.
**Schaal**: alle pilot-merken (n≈8-12 verwacht). Elke workspace heeft 2-6 concurrenten in scope.
**Acuut segment**: agency-team dat per kwartaal pitcht of een campagne presenteert — zij hebben de up-to-date competitive context echt nodig.

## JTBD-narratief

> "Toen we een campagne-pitch voorbereidden, wilde ik weten waar concurrenten vandaag staan, welke messaging-thema's overlappen en waar witte ruimte zit, maar de Branddock-pagina toont alleen wat we 3 maanden geleden hadden ingevuld — geen recente blogposts, geen veranderde tagline, geen positioning-map. Ik viel terug op een handmatige Google-ronde van 3 uur."

## Evidence

- `prisma/schema.prisma:3722-3794` — Competitor-model heeft géén Snapshot/Activity/ContentItem-relaties; alle data leeft in één rij die overschreven wordt bij refresh.
- `src/app/api/competitors/[id]/refresh/route.ts` — refresh-endpoint bestaat, maar er is geen scheduler die hem aanroept.
- Competitive-brief methodologie-document (mei 2026, gebruiker eigen werkwijze) — beschrijft 6 frameworks waarvan alleen value-prop-decompositie deels in de huidige extraction-prompt zit.
- `src/lib/claw/tools/` — 30+ write-tools, géén competitor-monitoring tool. Brandclaw is request-driven, geen polling-loop.

# WHAT — Probleem (niet oplossing)

Drie waarneembare gebreken vandaag:

1. **Snapshot-blindheid**: een gebruiker die de competitor-pagina opent, ziet niet wanneer iets is veranderd of wát is veranderd. Refresh overschrijft stilletjes.
2. **Analyse-armoede**: er is geen positioning-map, geen messaging-matrix, geen content-gap, geen battlecard. De brand strategist moet de ruwe velden zelf interpreteren.
3. **Freshness-loop ontbreekt**: er is geen mechanisme dat eens per week/maand kijkt of een concurrent een nieuwe blog-post, persbericht, of homepage-tagline heeft. Brandclaw — de logische plek voor "autonome marketing-loop" — kan vandaag geen externe URL's pollen.

# WHY-NOW

- **Brand Control Program** (idea-brand-control-program.md) zet review-side capabilities centraal. Δ-1 (Strategy Analyst) heeft expliciet competitive-context nodig om een strategy-validation te kunnen onderbouwen.
- **Phase 1** van het BCP introduceert F-VAL pijler-versterking; competitor-narrative-analyse is een natuurlijke input voor pijler 2 (judge).
- **Pilot-pitch (+10-14 weken)** vraagt demonstreerbare "always-fresh" intelligence — een eenmalige snapshot is geen verkoopargument tegenover bestaande tools.
- **Brandclaw fundering**: de roadmap voorziet `brandclaw-data-collection` (stappen 1-2). Competitor-monitoring is daarvoor een geschikte eerste use-case — beperkter dan eigen-merk-monitoring, dezelfde architectuur.

Triggers:
- Methodologie-document mei 2026 expliciet uitgewerkt door user.
- Phase 0 voorlopers (any-types, claw-page-awareness, BV-W1) bevrijden binnen 2-3 weken bandbreedte.
- Bestaande Exa-discovery + scanner-pipeline maken Phase 1 (data-extensie) goedkoop.

# SUCCESS METRICS

**Primaire metric**: % pilot-merken met ≥3 ANALYZED concurrenten waarvan minstens één snapshot ≤30 dagen oud is, gemeten 60 dagen na livegang. Doel: ≥80%.

**Secundair**:
- % campagne-strategie-runs waarin competitor-context uit de top-3 concurrenten daadwerkelijk in de prompt-payload komt (telemetry op `getBrandContext`).
- # Brandclaw-detected competitor-changes per workspace per week (proxy voor loop-werking).

**Counter-metric** (mag NIET kapotgaan):
- Workspace-resolution latency op `/api/brand/context` < huidige p95 (cache-effect mag niet erodeen door snapshot-explosie).
- Token-cost per workspace per maand ≤ huidige + €X/maand budget (Brandclaw scheduling moet kostenbewust zijn — zie Constraints).

# CONSTRAINTS

## Hard
- **Tijd**: pre-launch — niet alle 5 fases vóór livegang. Realistisch: Fase 1+2 vóór pilot-start, Fase 3+4 daarna.
- **Tech**: nieuwe schema's vereisen een ADR (zie BCP-precedent met ADR-1/3). Snapshot-historie betekent groei — partitionering of TTL nodig.
- **Data**: publieke bronnen-bias (zie methodologie §12). We compenseren met expliciete snapshot-datums in UI; we beloven geen "echte" win-rates.
- **Legal/privacy**: scrapen van concurrent-sites moet `robots.txt` respecteren én we slaan geen persoonsgegevens van competitor-medewerkers op (LinkedIn-careers-pagina's: alleen titel + signaal, niet namen).
- **Cost**: monitoring-loop draait potentieel 100en URL's per workspace per week. Hard budget per workspace per maand vereist (zie Counter-metric).

## Soft
- Tailwind 4 + bestaande PageShell/PageHeader patterns (geen nieuwe primitives).
- Geen nieuwe AI-providers — Anthropic + OpenAI + Gemini voldoende.
- Worktree-discipline: schema-werk en UI-werk in aparte worktrees vanwege hoge merge-conflict-kans.

## Must NOT do
- Geen real-time scrape-on-page-load (latency en kosten).
- Geen automatic posting/publication door Brandclaw n.a.v. competitor-changes — alleen detection + brief notificatie. Action stays human-gated tot post-launch.
- Geen Ahrefs/SEMrush integratie in MVP — duur en pilot-overkill. Wel design-pad open laten.
- Geen "AI-only" battlecards zonder bron-citaten en datum-stempels (methodologie §11 quality controls).

# SCOPE

Vijf-fasen voorstel. Fasering is een **voorstel** — technical-planner mag fases combineren of splitsen.

## Fase 1 — Snapshot + Activity-historie (data-laag) — IN-SCOPE MVP

Schema-extensie. Alles wat hierna komt, leunt hierop.

- Nieuwe modellen: `CompetitorSnapshot` (immutable, één per refresh), `CompetitorActivity` (semantic events: "tagline_changed", "new_blog_post", "pricing_change", "new_product"), `CompetitorContentItem` (blog-posts, persberichten, social-posts met url + publishedAt + thema-tags).
- Refresh-route schrijft naar Snapshot i.p.v. Competitor-rij overschrijven; Competitor-rij wordt "current pointer".
- Diff-engine die twee snapshots vergelijkt en Activity-events genereert.
- ADR vereist (analoog aan ADR-1 voor `BrandReviewFinding`).

## Fase 2 — Analyse-frameworks (UI + AI-prompts) — IN-SCOPE MVP

Concretiseert de zes frameworks uit de methodologie naar Branddock UI. Elk framework heeft een dedicated tab in de competitor-detail-page én een aggregate-view op de Concurrenten-overzicht-pagina.

- **Value-proposition decompositie** — al in extraction, expliciet UI-veld (4 regels: Promise/Evidence/Mechanism/Uniqueness).
- **Narrative-analyse** — nieuwe AI-prompt; output: villain/hero/transformation/stakes per concurrent. Aparte tab.
- **Messaging strengths/vulnerabilities** — 5 maatstaven (clarity, differentiation, proof, consistency, resonance) met 1-5 score + rationale.
- **Positioning-statement reverse-engineering** — gestandaardiseerd template-veld per concurrent + aggregate vergelijking eigen merk vs concurrenten.
- **Positioning-map (2x2)** — interactieve canvas (custom assen kiezen uit dimension-pool); plot inclusief eigen merk. Identificeer "leeg kwadrant" automatisch.
- **Messaging-comparison-matrix** + **content-gap-tabellen** — twee aggregate-views op de overzicht-pagina.

## Fase 3 — Battlecards + Competitive-brief output — IN-SCOPE-IF-CAPACITY

- Battlecard-generator per concurrent (1-pager, methodologie bijlage C).
- Competitive-brief generator (volledige output-structuur §8) als download (docx + pdf) — leunt op bestaande document-skills.
- Brief-template ondersteunt deep-dive (2-3 concurrenten) én brede-scan (4-6) modus.

## Fase 4 — Brandclaw freshness-loop — POST-LAUNCH (eerste use-case van data-collection)

- Nieuwe Brandclaw-tool: `monitor_competitor(competitorId, dimensions[])`. Tool produceert geen output naar gebruiker, maar enqueued een job.
- Cron-mechanisme (Vercel Cron of Upstash QStash — zie Aanname 3). Per workspace configurabele frequentie (default: weekly light scan, monthly deep scan).
- Light scan: homepage-hero, tagline, top-3 blogposts, social-headers. Deep scan: Fase 1 volledige refresh + alle Fase 2 prompts re-runnen.
- Detection-events worden Activity-records (Fase 1) én notifications via bestaande PostHog/Sentry-pipeline + in-app inbox.

## Fase 5 — External signals (uitbreidbaar) — UIT-SCOPE-MVP

- Google Alerts ingestion (RSS), Wayback-historiek, hiring-signals (vacatures-scrape), G2/Capterra reviews-sentiment.
- Architecturaal pad open laten via een `CompetitorSignalSource` enum (`MANUAL`, `WEBSCRAPE`, `RSS`, `WAYBACK`, `REVIEWS`, …) op `CompetitorContentItem` en `CompetitorActivity`. MVP gebruikt alleen `MANUAL` + `WEBSCRAPE`.

## Out-of-Scope (expliciet NIET, ook al verleidelijk)

- Real-time scraping bij paginabezoek.
- Automatic actions (posten, e-mailen, contentDraft genereren) op basis van competitor-changes.
- Enterprise SEO-tooling integraties (Ahrefs/SEMrush).
- Win-loss-interview tooling.
- Computer-use voor visuele competitor-screenshots (komt in een later visual-tracking-idea).
- Multi-language competitor-analyse — MVP is taal-agnostisch via bestaand `language`-veld; geen aparte i18n competitor-frameworks.

# AANNAMES

- **A1** — Pilot-klanten ervaren freshness als duidelijke meerwaarde t.o.v. eenmalige snapshot — bewijs: methodologie §13 expliciete user-eigen aanbeveling. Onbewezen? Nee, user heeft dit zelf opgeschreven.
- **A2** — Bestaande scanner-pipeline (`src/lib/website-scanner/scanner-pipeline.ts`) is robuust genoeg voor weekly polling van 6-30 URL's per workspace zonder rate-limit issues — bewijs: scanner draait al voor brandstyle. Onbewezen? Ja — `lastScrapedAt` op Competitor wordt mogelijk weinig getest. **Validatie: smoke-test met 10 URL's tegelijk vóór Fase 4 commit.**
- **A3** — Vercel Cron + Upstash QStash zijn voldoende infra; we hebben geen aparte queue-service nodig — bewijs: Brandclaw-roadmap noemt geen queue. Onbewezen? Ja — afhankelijk van Brandclaw data-collection ADR. **Validatie: technical-planner moet hier expliciet ADR voor schrijven vóór Fase 4.**
- **A4** — Schema-additieve aanpak (Snapshots als nieuwe tabel naast Competitor) breekt geen bestaande UI of AI-context — bewijs: `getBrandContext` haalt alleen Competitor-rijen, geen historie. Onbewezen? Nee.
- **A5** — Pilot-merken hebben gemiddeld 4 concurrenten — als het 15 wordt, schaalt cost lineair en kunnen we Fase 4 niet betalen — bewijs: idea-doc-aanname uit BCP. Onbewezen? Ja, validatie via bestaande pilot-conversaties.

# ACCEPTATIECRITERIA (MVP — Fase 1+2)

- [ ] Given een Competitor met `lastScrapedAt` 7 dagen oud, When de gebruiker op "Refresh" klikt, Then er ontstaat een nieuw `CompetitorSnapshot`-record + minstens één `CompetitorActivity`-event als er iets veranderd is, en de UI toont een "veranderd sinds vorige snapshot"-indicator.
- [ ] Given drie ANALYZED concurrenten in een workspace, When de gebruiker de overzicht-pagina opent, Then er is een interactieve positioning-map met de drie concurrenten + eigen merk geplot op kiesbare assen, met een visueel-leeg-kwadrant-hint.
- [ ] Given drie ANALYZED concurrenten, When de gebruiker de "Messaging Matrix"-tab opent, Then alle 6 dimensies (tagline, doelgroep, categorisering, kern-differentiator, toon, verteltype) staan in een tabel met eigen merk in de eerste kolom.
- [ ] Given een concurrent-detail-page, When de gebruiker de "Narrative"-tab opent, Then villain/hero/transformation/stakes worden getoond met bron-snippets en datum-stempel.
- [ ] Given een concurrent met ≥2 snapshots, When de gebruiker "Tijdlijn" opent, Then er is een chronologische lijst van Activity-events met type, datum, en diff-snippet.
- [ ] Given het methodologie-quality-control "datum-stempel-test", When de gebruiker een veld inspecteert, Then elke AI-gegenereerde claim toont `extractedAt` of snapshot-datum.
- [ ] `getBrandContext`-cache invalidation triggert bij Snapshot-creatie (tenminste: niet eerder dan dat). p95-latency op `/api/brand/context` regresseert ≤10%.

# Acceptatiecriteria (Fase 4 — Brandclaw freshness-loop)

- [ ] Given een Competitor met `monitoring.enabled = true`, When de wekelijkse cron draait, Then er ontstaat automatisch een nieuw Snapshot zonder gebruiker-actie.
- [ ] Given een gedetecteerde tagline-wijziging, When de gebruiker volgende keer Branddock opent, Then er is een in-app notificatie met link naar de competitor-tijdlijn.
- [ ] Given een workspace met 6 concurrenten op weekly monitoring, When een maand draait, Then total token-cost ≤ vooraf gedefinieerd budget.

# EERSTE TAAK (morgen startbaar)

**ADR schrijven voor Snapshot/Activity/ContentItem-schema** — analoog aan ADR-1 voor `BrandReviewFinding`. Inclusief: relaties, indexing, retention-beleid (snapshots TTL? of indefinite?), migratie-pad voor bestaande Competitor-rijen (eerste snapshot retro-actief vullen of skip?). Output: `docs/adr/2026-05-XX-competitor-snapshot-historie.md`. Zonder ADR komt Fase 1 niet door review.

Direct daarna parallelliseerbaar: een 1-uur prototype-spike die de bestaande `refresh/route.ts` aanpast om naast de update óók een Snapshot-rij weg te schrijven, om Aanname A4 te valideren in code.

---

# Red Team Review

## Zwakste schakel

**Kostencontrole van Fase 4**. Een naïeve weekly scan op 6 concurrenten × 12 workspaces × deep-prompt rerun = ~720 LLM-calls/week. Zonder budget-cap per workspace en zonder change-detection vóór herhaling van duur Fase 2 prompts kan dit het AI-budget snel overschrijden. Aanname A5 (4 concurrenten gemiddeld) is een onbewezen gok — als pilot-klanten 10+ concurrenten toevoegen, knapt het.

## Pleidooi tegen dit plan

Pre-launch is al overspannen door BCP Phase 0+1+2 + content-flow blockers. Een 5-fasen competitive-intel-uitbouw concurreert direct met `tech-debt-any-types` afronden, BV-W1 cosine-fix, en Δ-2 t/m Δ-4. Concurrentie-pagina is **niet** wat een pilot-klant in week 1 nodig heeft — die heeft brand-foundation + content-flow nodig. Fase 1+2 alleen al kost ~3 weken; vooraf duwt dat de pilot-start nog verder weg dan +10-14 weken. Bovendien: de huidige Competitor-extraction werkt al "goed genoeg" voor strategy-foundation context. Het marginale verschil tussen "AI vult 25 velden" en "AI vult 25 velden + positioning-map" is niet doorslaggevend voor een pilot.

## Wat zouden we leren door NIET te bouwen

Door pre-launch alleen Fase 1 (Snapshot + Activity, geen UI) te bouwen en Fase 2 te skippen, leren we via pilot-feedback wélke frameworks ze daadwerkelijk gebruiken — niet welke wij denken dat ze gebruiken. Het bespaart 2-3 weken UI-werk en maakt Fase 2 evidence-based. Risico: pilot oordeelt zonder positioning-map en mist daardoor de "wow"-factor.

## Verdict van de planner

**needs-validation-first**

Reden: drie zaken vereisen validatie vóór een task-promotion:
1. **Pilot-priority-check** — vraag direct aan 2-3 pilot-leads of competitor-intelligence in hun top-3 needs zit, of dat content-flow + brand-foundation harder schreeuwen.
2. **Cost-modeling Fase 4** — uitgewerkt rekenmodel (workspaces × concurrenten × scan-frequency × token-cost-per-scan) met expliciet budget-plafond.
3. **Scope-cut** — alleen Fase 1 (data-historie) verplicht pre-launch; Fase 2 alleen UI voor positioning-map + matrix; Fase 3-5 expliciet post-launch parkeren.

Na deze drie validaties is een gesplitste promotion realistisch:
- `competitor-snapshot-historie` (Fase 1) → ready-to-build (3-4 dagen)
- `competitor-positioning-frameworks` (Fase 2 subset) → conditional op pilot-feedback
- `brandclaw-competitor-monitoring` (Fase 4) → post-launch, eigen ADR + cost-cap

# 5-Punts Stop-Conditie

- [x] Probleem in 1 zin formuleerbaar
- [x] Eén primaire success-metric (niet 5)
- [x] Out-of-Scope-lijst langer dan In-Scope-lijst (let op: alleen-MVP vergelijking, niet hele scope)
- [x] MVP-acceptance-criteria concreet (Given/When/Then)
- [x] Eerste taak morgen startbaar

# Verbeteringen elders (bonus, los promotbaar)

Tijdens analyse vielen drie patronen op die niet competitor-specifiek zijn maar wel uit dezelfde fundering komen:

1. **Snapshot-patroon herbruikbaar** — Persona, Brandstyle en Brand Voice extraction-flows hebben hetzelfde "AI overschrijft veld" probleem. Het Snapshot-model uit Fase 1 zou generiek kunnen via een polymorf `EntitySnapshot { entityType, entityId, capturedAt, payload Json }`. Trade-off: typesafety lijdt, maar 4 concrete tabellen levert hetzelfde probleem 4× op. Aparte ADR-overweging.

2. **Datum-stempel-discipline UI-breed** — methodologie §11 quality-control "datum-stempel-test" is een algemene UX-regel: elke AI-gegenereerde waarde toont wanneer hij is gegenereerd. Vandaag inconsistent (sommige assets tonen `updatedAt`, andere niets). Een gedeelde `<AiProvenanceTag/>` primitive aan PATTERNS.md toevoegen lost dat overal in één klap op.

3. **Brandclaw "monitoring"-architectuur** — als competitor-monitoring de eerste polling-use-case is, wordt het de blueprint voor alle latere autonome-loop-onderdelen (eigen-merk content-tracking, campagne-performance, Brand-Voice-drift). Investeren in een schone scheduling-laag (job-queue, retry, cost-budget per workspace) loont breder dan competitive-intel alleen.

# Volgende stap

Validatie-actie deze week: 3 pilot-leads vragen of competitor-intelligence in top-3 zit + cost-model voor Fase 4 uitwerken (≤2 uur). Daarna: idea opsplitsen in `competitor-snapshot-historie` (klaar voor technical-planner), `competitor-positioning-frameworks` (conditional), `brandclaw-competitor-monitoring` (post-launch).
