# Competitor monitoring — cost-model Fase 4

> **Datum**: 2026-05-08 · **Auteur**: Claude (task-finalize follow-up) · **Doel**: validatie-blokker vóór technical-planner promotion van `brandclaw-competitor-monitoring` (Fase 4 van Competitive Intelligence Loop). Levert cijfers voor budget-plafond, throttling-strategie, en de pilot vs post-launch beslissing.

> **Bron-task**: [`tasks/done/competitor-snapshot-historie.md`](../../tasks/done/competitor-snapshot-historie.md) · **Idea-doc**: [`tasks/_drafts/idea-competitive-intelligence-loop.md`](../../tasks/_drafts/idea-competitive-intelligence-loop.md) · **ADR**: [`docs/adr/2026-05-08-competitor-snapshot-historie.md`](../adr/2026-05-08-competitor-snapshot-historie.md)

---

## TL;DR

| Tier | Workspaces | Default cost/maand | Worst-case cost/maand |
|---|---|---|---|
| **Pilot** | 10 | **~$11** | ~$50 |
| **Post-launch tier 1** | 50 | **~$55** | ~$240 |
| **Post-launch tier 2** | 100 | **~$110** | ~$1100 |

**Aanbeveling**: Fase 4 is voor pilot-tier (10 workspaces) financieel triviaal — totaal cost is lager dan één licentie. Post-launch wordt het significant pas bij high-concurrent-count + all-deep cadence; daar moet throttling per plan-tier op kicken. Hash-match skip-optimization (in de huidige refresh-route al actief) reduceert effectief 60-80% van de AI-kosten omdat de meeste scans geen content-wijziging vinden.

**Validatie-aanname A5 blijft kritisch**: idea-doc nam 4 concurrenten/workspace gemiddeld aan. Als pilot 15+ toevoegen schaalt cost lineair met factor ~4. Aanbeveling: **hard cap op aantal monitored concurrenten per workspace** (default 8, configureerbaar per plan).

---

## 1. Scope-aannames

| Parameter | Pilot | Post-launch tier 1 | Post-launch tier 2 |
|---|---|---|---|
| Workspaces | 10 | 50 | 100 |
| Concurrenten/workspace (gemiddeld) | 4 | 4 | 4 |
| Concurrenten/workspace (worst case) | 8 | 12 | 15 |
| Default scan-cadence | weekly-light + monthly-deep | idem | idem |
| Worst-case cadence | weekly-deep | weekly-deep | weekly-deep |

Parameters volgen idea-doc Aannames A1-A5. Worst-case cadence is opt-in (gebruiker kiest expliciet vaker scannen) en moet daarom apart belast worden.

## 2. Per-scan AI-cost calibratie

Cost-model leunt op Claude Sonnet 4.5 als default (project-conventie voor exploration/extraction). OpenAI fallback is iets duurder voor input maar vergelijkbaar voor output — niet apart gemodelleerd.

### Light scan
Inhoud: homepage HTML, tagline, top-3 blog-post excerpts, social-headers.

| Component | Tokens | Notitie |
|---|---|---|
| System prompt (extraction) | ~1.000 | Constante per scan |
| Brand-context injection | ~5.000 | Workspace-shared, prompt-cache candidate |
| Scraped content (HTML cleaned) | ~6.000 | Per concurrent |
| Output (extracted CanonicalExtracted velden) | ~1.500 | Structured JSON |

**Cost zonder caching**: 12.000 input × $3/M + 1.500 output × $15/M = $0,036 + $0,0225 = **~$0,06 per concurrent**

**Cost met prompt-caching** (brand-context cached, hits binnen 5 min): 7.000 input × $3/M + 5.000 cached × $0,30/M + 1.500 output × $15/M = $0,021 + $0,0015 + $0,0225 = **~$0,045 per concurrent**

Voor cron-batch (alle competitors in één workspace achter elkaar): cache-hit-rate ~80% → effective cost **~$0,04 per concurrent**.

### Deep scan
Inhoud: alle Fase 2 prompts re-runnen. Narrative-analyse + positioning-statement + messaging strengths/vulnerabilities + content-classification.

| Component | Tokens | Notitie |
|---|---|---|
| System prompts (5 calls) | ~5.000 | Multiple AI-calls per scan |
| Brand-context (5× in batch) | ~25.000 | Of ~5K met prompt-cache |
| Scraped content + history | ~15.000 | Per concurrent |
| Outputs (5× structured) | ~6.000 | Cumulatief over de calls |

**Cost zonder caching**: 45.000 input × $3/M + 6.000 output × $15/M = $0,135 + $0,090 = **~$0,23 per concurrent**

**Cost met prompt-caching**: ~$0,15 per concurrent

### Hash-match skip optimization
Refresh-route (PR-3) skip Fase 2 prompts als `contentHash` matched met latest snapshot. **Impact op deep-scan cost**:

| Scenario | % deep-scans dat skip'd | Effective cost per concurrent |
|---|---|---|
| Stabiele markt (B2B-SaaS, kwartaal-cadens) | ~85% | $0,02 |
| Actieve markt (e-commerce, content-driven) | ~50% | $0,08 |
| Zeer dynamisch (early-stage tech, weekly launches) | ~15% | $0,13 |

**Lichte scans** worden niet ge-skipt — ze produceren altijd snapshot-content; alleen Fase 2 re-extraction skip'd bij hash-match. Light cost blijft ~$0,04 per concurrent ongeacht skip-rate.

## 3. Total cost berekeningen

### Default config (weekly-light + monthly-deep)

Per concurrent per maand:
- Weekly-light: 4 scans × $0,04 = $0,16
- Monthly-deep: 1 scan × $0,15 = $0,15
- Met hash-skip (60% deep skip rate gemiddeld): 1 scan × ($0,15 × 0,40 + $0,02 × 0,60) = $0,072
- **Totaal per concurrent**: $0,16 + $0,072 = **~$0,23/maand** (effectief)

Per workspace bij 4 concurrenten: $0,93/maand
Bij 8 concurrenten (worst-case): $1,86/maand

### Worst-case cadence (weekly-deep)

Per concurrent per maand:
- Weekly-deep: 4 scans × $0,15 = $0,60 (60% skip → effectief $0,29)
- Geen weekly-light apart (deep includes light)
- **Totaal per concurrent**: ~$0,29/maand

Per workspace:
- 4 concurrenten: $1,16/maand
- 15 concurrenten worst case: $4,35/maand

### Schaling-tabel

| # Workspaces | Avg config | Worst-case workspace×concurrenten×weekly-deep |
|---|---|---|
| 10 (pilot) | **$9,30/maand** | $43,50/maand (alle 10 ws op worst case) |
| 50 (tier 1) | **$46,50/maand** | $217,50/maand |
| 100 (tier 2) | **$93,00/maand** | $435,00/maand |
| 100 + ALLE max-concurrenten worst case | n/v | **$1.087,50/maand** |

Worst-case kolom assumeert alle workspaces met 15 concurrenten op weekly-deep en zonder hash-skip. Realistisch in productie: nooit. Maar het is het cap-scenario voor budget-design.

## 4. Aanbevelingen budget + throttling

### 4a. Hard cap per workspace per maand

| Plan-tier | Aantal concurrenten max | Cadence opties | Max cost/maand |
|---|---|---|---|
| **Pilot/Free** | 4 | weekly-light + monthly-deep (forced) | $1,00 |
| **Pro** | 8 | weekly-light + monthly-deep, opt-in biweekly-deep | $3,00 |
| **Enterprise** | 25 | volledige flexibiliteit incl. weekly-deep | $25,00 |

Implementeer als `WorkspaceUsage.competitorMonitoringSpend` veld (telt monetaire equivalent op per AI-call binnen monitoring-context). Cron-job evalueert per workspace voor elke scan: als spend ≥ cap, skip + queue notification.

### 4b. Soft cap (warning threshold)

Trigger PostHog event + in-app notificatie wanneer 80% van hard cap is bereikt. Geeft gebruiker tijd om concurrenten te despecteren of frequency te verlagen vóór monitoring stopt.

### 4c. Globale safety net

Top-level workspace-onafhankelijke kill-switch op aggregated daily spend. Bij `dailyCompetitorMonitoringSpend > $50` (cross-workspace) → pause alle cron-jobs voor 24u. Voorkomt runaway cost door bug of malicious workspace config.

### 4d. Prompt-cache verplicht maken

Brand-context-block (~5K tokens) in elke prompt zorgen dat `cache_control` op die positie staat. Cache-hit-rate ~80% in batch-runs. Verlaagt effective cost ~40%. **Hard requirement** voor de Fase 4 implementatie — niet optioneel.

## 5. Implementatie-impact

Wat moet bij Fase 4 build mee als enforcement:

1. **`WorkspaceMonitoringMetrics`-model** — `monthlySpendCents`, `monthlyResetAt`, `lastMonitoringRunAt`. Niet bij task `competitor-snapshot-historie` (te ver doorvragen pre-launch); hoort bij Fase 4 task-file.
2. **Cron-pre-check** — vóór elke scan: read `WorkspaceMonitoringMetrics`, vergelijk met plan-cap, skip + notify als over.
3. **Spend-tracker hook in `createStructuredCompletion`** — bestaande telemetry-laag krijgt extra `monitoringContext` flag; spend wordt geboekt bij workspace-monitoring-call.
4. **Plan-tier enum + per-tier defaults** — moet samen met Stripe-billing-task (`stripe-billing-live`) worden afgestemd. Dependency-link in roadmap.
5. **Admin-dashboard widget** — top-spending workspaces per maand, voor monitoring van de globale kosten.

## 6. Conclusies + beslispunten

**Veilig om Fase 4 te bouwen voor pilot**: pilot-cost is $9,30/maand effectief, maximaal $44/maand worst case. Onder elke realistische budget-grens. Geen risico.

**Kritische pre-build-conditie**: prompt-caching MOET geïmplementeerd zijn vóór Fase 4 cron actief gaat. Zonder cache verdubbelt cost.

**Aanname A5 valideren via pilot**: telling van competitors per workspace na 30 dagen pilot. Als gemiddelde > 6 → tier-cap aanpassen, of plan-tier-strategie nodig vóór tier 2 launch.

**Hash-skip-rate meten**: telemetrie op `_refreshOutcome === 'no-op-hash-match'` ratio per workspace. Geeft empirisch beeld van hoe vaak skip kicks-in. Als < 30% → cost-projectie verdubbelt; revisie nodig.

**Schaalpunt voor Stripe-billing-koppeling**: zodra > 30 paying workspaces of cumulatieve monitoring-cost > $50/maand. Tot dan: free+pilot tier zonder hard caps op metering — alleen aantal-concurrenten cap (default 4).

**Out-of-scope dit cost-model**:
- Scrape-laag cost (geen AI; gratis op eigen infra of marginale request-cost via Gemini fallback)
- Storage-cost (CompetitorSnapshot.scrapedJson groei) — eigen retention-ADR follow-up
- Cron-infra cost (Vercel Cron of Upstash QStash) — Fase 4 ADR
- Embedding-cost voor `CompetitorContentItem.embedding` — vervolg-task `competitor-content-item-discovery`

---

## Beslis-tabel voor task-promotion

| Vraag | Antwoord |
|---|---|
| Mag Fase 4 worden gepromoot? | Ja, post-launch — pilot-cost is verwaarloosbaar, schaalpad helder |
| Welke pre-condities? | Prompt-caching actief + `WorkspaceMonitoringMetrics` schema in Fase 4 task |
| Welke open beslissing voor user? | Plan-tier defaults (zie tabel §4a) — afstemmen met `stripe-billing-live` taak |
| Volgende validatie? | Pilot-priority-check (3 leads) — out-of-code, user-action |

**Status van validatie-blokker**: ✅ cost-modeling **complete**. Pilot-priority-check ⏳ pending (user-action). Beide nodig voordat technical-planner Fase 2 kan promoten.
