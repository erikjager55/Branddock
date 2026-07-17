# Branddock Changelog

Chronologisch overzicht van wat is gebouwd. Wordt automatisch bijgewerkt door de `task-finalize` skill na elke afgeronde task.

## Hoe te navigeren

| Periode | Plek | Format |
|---|---|---|
| **Entry #1 t/m #221** (R0.1 → BSTY-FONTS, dec 2025 - mei 2026) | `docs/archive/old-lists/CLAUDE-original-2026-05-07.md` "ACTIELIJST" sectie | Originele oude format, niet gemigreerd om tijd te besparen — volledig grep-baar |
| **Entry #222+** (vanaf 2026-05-07) | dit bestand, h2 per maand | Nieuw gestandaardiseerd format (zie hieronder) |

**Waarom niet alles gemigreerd?** De 221 historische entries vertegenwoordigen ~6 maanden zwaar werk en zijn perfect doorzoekbaar in het archief. Manueel reformatteren zou een dag werk kosten zonder substantiële winst — een grep door het archief geeft hetzelfde resultaat.

**Voor zoekvragen** "wanneer was X gebouwd?" of "wat deden we met Y?":
```bash
grep -n "<zoekterm>" docs/archive/old-lists/CLAUDE-original-2026-05-07.md
```

---

## Format per entry (vanaf #222)

```markdown
### <number>. <Task title>

<1-2 zin samenvatting van wat gebouwd werd en hoe het werkt.>

- Task: [tasks/done/<id>.md](tasks/done/<id>.md)
- ADR: <link of `-`>
- Spec: <link of `-`>
- Commit: <short hash>
```

Numbering wordt auto-incremented door `task-finalize` skill, doorgaand vanaf #222.

---

## 2026-07

### 412. Kanaal-publicatie kon een lege post naar LinkedIn/WordPress/e-mail sturen

Gevonden tijdens de structurele analyse van de content-ketens (n.a.v. de bugmeldingen van 16-07); **nog niet door een gebruiker gemeld — maar het publiceert extern**. `publish-to-channel` bouwt zijn payload uitsluitend uit `deliverable.components` — de component-keten. Voor de structured/PUCK-types (landing-page/faq-page/product-page/microsite + de 7 long-form GEO-types) is die keten **structureel leeg**, niet "soms": `orchestrate/route.ts:91` gate't ze weg vóór de enige plek die tekst-componenten aanmaakt, en `generate-structured-variant` bevat nul `deliverableComponent.create`. Hun copy zit in `settings.structuredVariant`. Gevolg: `bodyText === ''` → een leeg artikel op de WordPress van de klant en een lege LinkedIn-post, naar het publiek van de klant, onomkeerbaar. **De bestaande QA-gate vangt dit niet en kán dat niet**: `getContentReadiness` oordeelt op een F-VAL-score die via het LP-pad uit keten B komt, terwijl de payload uit keten A komt — een groene gate is dus juist bewijs dát er goede content is, waarna we niets versturen; en hij is expliciet failsafe-open (`no-version` → `canPublish: true`, met in de eigen types de comment *"no ContentVersion exists yet — never generated"*). Bereikbaar, niet latent: `Step4Timeline` rendert de kanaal-publish-knop zonder `isPuckType`-gate, terwijl datzelfde bestand 40 regels hoger wél `puckSignals` inpatcht voor de checklist. Fix: een leeg-guard op de **payload zelf** i.p.v. op een proxy ervoor, met de extractie naar een pure functie (`channel-payload.ts`) zodat de guard testbaar is zonder de halve stack én er één chokepoint is waar de latere content-accessor inplugt. Bewust géén beeld-uitzondering — een long-form-deliverable *heeft* een hero-image, dus die uitzondering zou de guard uitschakelen voor precies het geval dat 'm motiveert. **Vangnet, geen fix**: de structurele oplossing is dat de route beide ketens leest; het vangnet blijft daarna staan omdat het valideert wát er verstuurd wordt en dus elke toekomstige keten overleeft. **Bewijs**: smoke 23/23 — de exacte prod-vorm van een pillar-page tegen alle 3 providers, regressie-check op een echte social-post, provider-mapping (`linkedin-direct`, niet `linkedin`), whitespace, en de `caption`/`body-sections`/`introduction`-fallbacks. `tsc` 0 / `lint` 0.

- Task: [tasks/publish-empty-guard.md](../tasks/done/publish-empty-guard.md)
- Analyse: 21 kruisingen tussen de content-ketens; deze was de enige met externe, onomkeerbare impact. De overige 20 vragen de gedeelde accessor.

### 408. Brand-mention-monitor Fase-0 — NO-GO (research-stack-bundel 4/4, gated)

De 10e-agent-kandidaat (merkvermeldingen-waakhond op Exa) had een blocking Fase-0-gate: levert Exa genoeg relevante vermeldingen voor het NL-MKB-doelsegment? Handmatige Exa-pulls (30d, naam + branche-anker + eigen-domein-uitsluiting) op 5 merken wijzen **NO-GO** aan. NL-MKB-targets — Better Brands (1 vermelding/30d, 90% ruis), Sterk Merk (1, 90%), Branding a better world (0, 100%) — zijn structureel leeg + ruizig; alleen een scale-up (Picnic: 6/30d, 40% ruis) haalt beide bars, en die is niet de doelgroep. Gate (1) ≥3/maand faalt voor het doelsegment, gate (2) ruis < 50% haalt 1/5, gate (3) usersignaal is daarmee moot. Bevestigt exact de Red-Team-kernonzekerheid (Exa is geen social-listening-index; generieke merknamen verhogen de ruis). **Geen productie-code gebouwd** — de gate deed precies zijn werk. Taak → `blocked` met meetdata; reopen bij een bredere bron (social/news-API), scale-up-pilotklanten, of gegroeide Exa-NL-dekking. De Marco-web-signals-tool (#406) blijft de enige Exa-mentions-surface (concurrenten, niet eigen merk). Sluit de research-stack-bundel af (1-3 gebouwd, 4 gevalideerd-en-geparkeerd).

- Task: [tasks/brand-mention-monitor.md](../tasks/brand-mention-monitor.md) (status blocked)
- Rapport: [docs/reports/brand-mention-monitor-fase0-2026-07-15.md](reports/brand-mention-monitor-fase0-2026-07-15.md)

### 407. GEO long-form — research-backed citeableStats via Exa + S2 (research-stack-bundel 3/4)

Long-form GEO-artikelen leven van citeerbaarheid (`citedStats` is een van de hoogst gewogen GEO-signalen), maar de stats kwamen uit het model + workspace-kennis — het model kon geen échte actuele bronnen citeren en de sanitizer moest verzonnen bronnen juist wégpoetsen. Nu haalt de generate-structured-variant-route vóór generatie een klein pakket **echte, gebronde statistieken** op (Exa web + Semantic Scholar, **parallel** met de kennis-context-bouw) en legt die als gelabeld **"## GEVERIFIEERD BRONMATERIAAL"**-blok in de prompt; twee chirurgische regels in de GEO-system-prompt erkennen dat blok als geldige citeerbron. Deterministische cijfer-extractie (regex, géén extra LLM-call), elke bron door `cleanStatSource` gehaald (dezelfde filter die verzonnen/interne-laag-bronnen weert), fail-soft + key-gated. **De GEO-scoring, het schema en de source-sanitizer blijven ONGEWIJZIGD** (bevroren, diff-geverifieerd) — er verandert alleen wat het model als grondstof krijgt. **Bewijs**: nieuwe smoke `scripts/dev/geo-research-stats-smoke.ts` **15/15** (incl. A/B-generatie) met échte keys op lokale BB — keyless-pad byte-identiek (regressie), live 3 kandidaten met waardes letterlijk uit de bron + `cleanStatSource`-overlevende bronnen, en het verrijkte artikel bevat citeableStats die herleidbaar zijn tot het pakket, zonder interne-laag-leak. A/B-`citedStats`-signaal: verrijkt ≥ baseline (één sample; run 1: 4→14, run 2: 4→4 — de bron-verankering is robuust, de signaallift single-sample-variabel). Verrijkingskosten ≈ $0,005 < $0,05, +0 LLM-calls. `tsc` 0 / `lint` 0. Code-reviewer: 0 critical — WARNING (Exa/S2 sequentieel) verwerkt naar parallel, MINOR (`match.index`) verwerkt. Bundel 3/4; alleen brand-mention-monitor (Fase-0-gated) rest.

- Task: [tasks/research-stack-geo-research-backed.md](../tasks/research-stack-geo-research-backed.md)
- Spec: [docs/reports/research-stack-plan-2026-07-15.md](reports/research-stack-plan-2026-07-15.md)

### 406. Marco krijgt een externe-web-signalen-tool per concurrent (research-stack-bundel 2/4)

Marco's (market-analyst) concurrent-beeld kwam volledig uit wat wíj van de concurrent-site scrapen; wat er óver een concurrent gebeurt (nieuws, funding, lanceringen, vermeldingen elders) was onzichtbaar. Nieuwe registry-native read-tool **`read_competitor_web_signals`**: per concurrent een Exa-neural-search naar recente externe vermeldingen (datum-filter, **eigen domein uitgesloten**), teruggegeven als gefencede signalen + server-owned TABLE-artefact. Volgt de data-analyst-conventie (`ads-watchdog/tools.ts`): read-only, harde workspace-scope, dubbele fencing (model-facing `signals`-veld én TABLE-preview), geclampte input (days 7-90, cap 5 concurrenten / 10 signalen), fail-soft (keyless → eerlijke `EXA_NOT_CONFIGURED`, Marco degradeert naar de scrape-data). Exa-client kreeg twee additief-optionele knoppen (`excludeDomains`, `publishedDate` op `ExaBlock`) — geen bestaande caller breekt. Gedragsregel toegevoegd zodat Marco de tool bij marktvragen inzet en een leeg resultaat als eerlijk "geen recente externe signalen" behandelt (geen speculatie). **Bewijs**: nieuwe smoke `scripts/dev/marco-web-signals-smoke.ts` **13/13** + `FULL_RUN=1` **16/16** — echte Exa-round-trips, alle URL's extern (eigen domein eruit, subdomein-bewust), fencing, TABLE-caps, workspace-isolatie (concurrent uit andere workspace onzichtbaar), keyless-degradatie; echte Marco-run levert REPORT + "Competitor web signals"-TABLE met externe bron-URL's. Tool-kosten 3 concurrenten ≈ $0,015 < $0,15 (de agent-run zelf ~$0,13 rapport-reasoning). `tsc` 0 / `lint` 0. Code-reviewer: 0 critical/0 warning — MINOR eigen-domein-subdomein-robuustheid verwerkt (`isSameSite`). Bekende pre-existing follow-up: rauwe third-party strings in het gepersisteerde TABLE-artefact (conform data-analyst-patroon; fencing van geaccepteerde external-source-TABLEs is een bredere beslissing). Bundel 2/4.

- Task: [tasks/research-stack-marco-web-signals.md](../tasks/research-stack-marco-web-signals.md)
- ADR: [docs/adr/2026-07-05-agents-architectuur.md](adr/2026-07-05-agents-architectuur.md) (D4 dekt curated tool-toevoeging)
- Spec: [docs/reports/research-stack-plan-2026-07-15.md](reports/research-stack-plan-2026-07-15.md)

### 405. Marketing demo-boeking provider-neutraal — Morgen/Calendly/Cal.com via link i.p.v. iframe

Op user-vraag "kan ik Morgen gebruiken i.p.v. Calendly?": ja — en meteen een latente bug gedicht. De contactpagina embedde de boeking in een `<iframe>`, maar de productie-CSP staat alleen `frame-src 'self' https://js.stripe.com` toe → élke externe booking-iframe (Calendly óók) zou leeg renderen; bovendien weigeren veel booking-tools embedding (X-Frame-Options). **Fix**: boeking is nu een provider-neutrale **link** (opent de geoptimaliseerde boekingspagina in een nieuw tabblad) i.p.v. een embed — werkt met Morgen, Calendly, Cal.com zonder CSP-werk. Env-var `NEXT_PUBLIC_CALENDLY_URL` → provider-neutrale `NEXT_PUBLIC_BOOKING_URL` (oude naam blijft als fallback). Homepage-"Book a demo" valt zonder booking-URL nu terug op de contactpagina i.p.v. een dood `#`. Runbook bijgewerkt. **Rest van taak #9 voor de user**: pilot-quote (1 zin) + `NEXT_PUBLIC_BOOKING_URL` zetten (Morgen-link) + domein-keuze.

### 404. Trend-radar krijgt Exa + S2 als extra bronlagen (research-stack-bundel 1/4)

De trend-radar-researcher (`src/lib/trend-radar/researcher.ts`) zocht uitsluitend via Gemini-grounding; nu draaien **Exa** (neural search met 12-maands versheid-filter) en **Semantic Scholar** (academische vroegsignalen) mee als optionele, key-gated, fail-soft extra bronlagen — exact het #402-patroon. Elk extern resultaat wordt DIRECT naar een `Signal` gemapt (géén extra Gemini-call, dus verwaarloosbare kosten): Exa → `analysis`/`general`, S2 → `research` met citatie-getierde authority (≥50 citaties → `industry_specialist`, anders `general`), beide met echte bron-URL en gededupt over bron-URL heen tegen de grounding-signalen. Twee dunne bron-helpers (`searchExaSources`/`searchScholarSources`) naast de bestaande context-clients (geen tweede client); S2 draait sequentieel tegen de 1-rps-limiet. **Bewijs**: nieuwe smoke `scripts/dev/trend-radar-sources-smoke.ts` **21/21** + één end-to-end scan (`FULL_SCAN=1`, **22/22**) met échte keys — live Exa=15 + S2=8 signalen uit ≥2 lagen, echte https-URL's, correcte types, baseline zonder keys byte-identiek, dedup + S2-degradatie (invalid key → Exa overleeft) groen; verrijkingskosten ≈ $0,015 (3 Exa-searches, S2 gratis, 0 extra Gemini) < $0,15. `tsc` 0 / `lint` 0. Code-reviewer: 0 critical — de S2-authority-blanket-warning verwerkt via citatie-tiering. Bekende pre-existing follow-up (niet in scope): de trend-synthese-prompt fencet signal-strings nog niet (geldt al voor bestaande scraped content, geen regressie van deze diff). Bundel 1/4; Marco-web-signals, GEO-`citeableStats` en brand-mention-monitor volgen.

- Task: [tasks/research-stack-trend-radar.md](../tasks/research-stack-trend-radar.md)
- Spec: [docs/reports/research-stack-plan-2026-07-15.md](reports/research-stack-plan-2026-07-15.md)

### 402. S2 aangesloten op Nova's deep-research — de "scholar"-wiring-gap gedicht

De S2-key kwam 2026-07-15 binnen (user-taak #4; EXA/POSTHOG/EMAILIT dezelfde ochtend gezet). Bij de key-check bleek het brontype `"scholar"` al sinds de bouw in het deep-research-contract te bestaan (`knowledge-research/types.ts`) zonder ooit aangesloten te zijn — de zoekfase gebruikte alleen Gemini-grounding + Exa. Nu gedicht, exact op het bestaande Exa-patroon: optionele verrijking alleen mét `S2_API_KEY`, fail-soft naar een warning, en in de synthese als niet-op-nummer-citeerbare achtergrondcontext ("Peer-reviewed academic context") naast de neural-search-context. Nova, de Knowledge-Library-research en alle afnemers krijgen daarmee peer-reviewed bronnen naast web. **Bewijs**: bestaande deep-research-smoke 30/30 (regressie) + live zoekfase-run met de echte key — 9 papers gevonden, gefilterd op citatie-drempel tot bruikbare context. EXA-helft eerder op prod bewezen (Nova-run met 5 échte webbronnen, $0,048). Vervolg-kandidaten (bewust post-launch, roadmap): trend-radar-deep-dive, Marco-competitor-research en research-backed GEO-`citeableStats` via Nova.

### 401. Scheduling-MINORs-batch + security-hardening gemerged (PR #120)

Twee afhechtingen. **(1) PR #120 gemerged** (gebouwd 2026-07-13): de L9-rollout-gate ("test tegen een echte ad-token-rij") kon dicht zodra het BB-Meta-account gekoppeld was — bewijs: formaatcheck op de echte prod-rij (legacy-formaat → compat-pad), cross-versie-roundtrip met de échte oude writer (byte-identiek), nieuwe writes `v1:`; main conflictloos ingemerged, smokes 13/13 + 23/23 herdraaid. De eerste ads-cron-tick levert het live-praktijkbewijs. **(2) Scheduling-finalize-MINORs verwerkt** (7 van 12): trial-lock op schedule-PATCH, delete-confirms (schedules/memories, en/nl), enqueued-teller exclusief dedupe-joins, `DEFAULT_LOOP_TIMEOUT_MS`-spiegel vervangen door de geëxporteerde loop-constante, zombie-error-pad zonder dubbele telemetrie, agent-task-smoke assert nu de AgentJob-DB-rij, `AGENTS_DEV_CADENCE` gedocumenteerd. Vijf restjes bewust open (UX-/a11y-polish, gedocumenteerd in de task-file). Smokes: agent-task + agent-schedule volledig groen.

### 400. Ada live — 9e persona-agent bewaakt creative-gezondheid op gekoppelde ad-accounts (ads-watchdog Fase 2+3)

Sluitstuk van het ads-watchdog-traject dat vanochtend met Fase 0 begon: **Ada (Ads Watchdog, Gauge)** — de agent waar Eriks A3-antwoord "(c) direct een on-brand refresh-voorstel ter bevestiging" om vroeg. **Fase 2**: pure signaal-functies (`ads-watchdog/signals.ts`) — frequency > 3,5 (som impressies/som reach over de recente dagen, conservatief), CTR-daling ≥ 25% (recente vs oudere venster-helft, ≥4 punten anti-ruis), creative-leeftijd > 45d — plus het weekplafond (3 refresh-PROPOSALs/workspace/week, ADR-productregel). **Fase 3**: read-tools op de data-analyst-conventie (`read_ad_signals`: prioritering op signalen×spend, weekbudget hard in het tool-result, TABLE-artefact, Meta-adnamen gefenced; `read_ad_account_status`), definition met no-Meta-writes/no-budget-advies-framing, refresh via het bestáánde `create_deliverable`-confirm-pad (contentType facebook-post — canvas-registry-fallback werkt), 400-guards op run- én schedule-route bij 0 gekoppelde accounts + koppel-CTA-banner op de agent-detailpagina (i18n en/nl). 0-credit run; ⚠️ gedocumenteerde afwijking: door de billable-gate op de confirm-charge boekt de refresh-creative tijdens de pilot óók 0 credits (bekend credit-model-punt, zelfde klasse als het structured-variant-pad). **Bewijs**: smoke **27/27** — unit-signalen, fixture-scan (vermoeide ad → 3 signalen, paused uitgesloten, workspace-isolatie), echte Ada-run met NL-rapport (meetwaarden vs drempels per signaal) + proposal, **confirm → échte canvas-generatie van de refresh-creative**, weekplafond (cap → 0 proposals + bundeling in rapport), lege workspace → eerlijke koppel-uitleg. Resterend ná deploy: eerste prod-cron-tick (05:30 UTC) + drempel-kalibratie op 2 weken echte snapshots.

- Task: [tasks/done/agent-ads-watchdog.md](../tasks/done/agent-ads-watchdog.md)
- ADR: [docs/adr/2026-07-14-ads-watchdog-datamodel.md](adr/2026-07-14-ads-watchdog-datamodel.md)

### 399. Ads-watchdog Fase 1 — metrics-sync live: AdMetricSnapshot heeft zijn eerste writer (na Fase-0 GO)

Fase-0 GO dezelfde dag behaald in een begeleide sessie met de user (task #18): Meta-app "Branddock" aangemaakt (dev-mode), envs op prod (secret na plak-verwisseling geroteerd), BB-ad-account gekoppeld (`act_764986273365908`), veldmapping via read-only pull — **alle 3 fatigue-signalen op ad-niveau** — en A3-antwoord "(c) direct on-brand refresh-voorstel ter bevestiging". ADR + GO: PR #135 (#`docs/adr/2026-07-14-ads-watchdog-datamodel.md`). **Fase 1 gebouwd** conform ADR: `AdCampaign` krijgt `origin`-discriminator + nullable `deliverableId` + `externalName`/`creativeCreatedAt` (geen parallel model — snapshot-FK-keten ongewijzigd); nieuwe GET-only insights-client (`meta/insights.ts`: discovery + ad-level daily insights, paginatie-cap 200); dagelijkse sync-job `sync-ad-insights.ts` (discovery-upsert zonder Branddock-rijen te hijacken + snapshot-upsert op de bestaande unique window-key, fail-soft per account, 401→expired, cache-invalidation per workspace); cron-route + vercel-schedule 05:30; **origin-guard op de bestaande 5-min status-sync** (regressie). Bijvangst onderweg: onzichtbare Connect-knop gefixt (PR #134, Tailwind-purge) + vindbaarheids-link naar de ad-accounts-pagina. **Bewijs**: smoke 11/11 tegen de échte Graph API — 2 ads discovered → 2 `origin=external`-rijen + 4 snapshots (metrics + frequency in raw), idempotente herdraai, status-sync-regressie groen, workspace-isolatie via FK-keten. Schema-change ⇒ Neon db push vóór prod-gebruik.

- Task: [tasks/done/agent-ads-watchdog.md](../tasks/done/agent-ads-watchdog.md) (Fase 2+3 gevolgd in #400)
- ADR: [docs/adr/2026-07-14-ads-watchdog-datamodel.md](adr/2026-07-14-ads-watchdog-datamodel.md)

### 398. Vera-triggers + ads-watchdog: Fase 0 gestart — ADR-aanvulling event-driven trede + eerste gate-metingen

Op user-verzoek ("kunnen we verder met een adr-aanvulling en metrics-sync-traject") de tweede ring in beweging gezet — binnen de eigen Fase-0-gates van beide task-files (geen productie-code vóór GO). **ADR-aanvulling** op `docs/adr/2026-07-05-agents-architectuur.md` (§2026-07-14): event-driven propose-only als expliciete derde D7-trede, geverifieerd trigger-event (`approvalStatus → IN_REVIEW`, niet het dode `PipelineStatus.REVIEW`), floor-gedekt 0 credits, opt-in default UIT als kosten-gate, moeheid-invarianten (1 burst = 1 run = max 1 melding · issues-only · daily cap), en het cap-melding-beslispunt beslist (`AGENT_TRIGGER_CAP_REACHED`-enum-lid). **Vera Fase-0-meting** (prod): dam-upload marginaal (9 uploads in één BB-burst 5-7 juli; de 36 van vorige week zijn smoke-account-ruis), `IN_REVIEW`-transities 0 in 8 weken — de review-trigger heeft nog geen voer; concierge-window 2026-07-14 t/m 28. **Ads Fase-0**: `ConnectedAdAccount` = 0 herbevestigd én bijvangst: `META_APP_ID/SECRET` ontbreken volledig op Vercel-prod — koppelen kan überhaupt nog niet; items 2-4 (koppel-bereidheid/A3, insights-pull-veldmapping, app-review-status) zijn user-held en staan uitgevraagd in de task-file.

- ADR: [docs/adr/2026-07-05-agents-architectuur.md](adr/2026-07-05-agents-architectuur.md)
- Tasks: `tasks/agent-vera-triggers.md` (Fase-0-logboek) + `tasks/agent-ads-watchdog.md` (Fase-0-resultaten)

### 397. Iris live (ships-dormant) — SEO/GEO-watchdog bewaakt gepubliceerde GEO-content op verval (agents-uitbreiding bouw 3/3)

Derde en laatste bouw uit het agents-uitbreidingsplan (#394): `agent-seo-watchdog` ("Iris", 8e persona-agent) — de eerste agent waarvoor scheduled de natuurlijke modus is. **Scan (judge-vrij, $0 AI)**: nieuwe deterministische tool `scan_published_geo_content` her-scoort `settings.structuredVariant` via de échte `buildGeoOptimizationAnalysis` (zelfde pure functie als de publish-meet-haak) en berekent de 5 vervalsignalen — staleness, score-drift (publish- vs actuele score), canonical-drift, schema-drift, feit-veroudering (jaartal-heuristiek op citeableStats) — met fail-soft skip voor corrupte records, prioriteitssortering (stale eerst, grootste daling bovenaan), caps (25 flagged / 10 LINKs) en gefencede content-afgeleide data. **Rapport + herschrijf-voorstel**: één geprioriteerd REPORT (harde framing-constraint: onderhouds-backlog, nooit traffic-claims — we meten geen traffic), LINK-deep-links naar de canvas, max 3 refresh-briefs via de bestáánde confirmable `update_deliverable_brief` (géén nieuwe write-tool — herschrijf loopt bewust interactief via de structured-variant-flow + republish, zie re-entry-verificatie in de task-file). **0-credit**. **Ships-dormant**: Taak-0-gate op prod = 0 GEO-pagina's — op prod levert de eerste run het eerlijke "niets te bewaken"-rapport + schedule-advies (expliciet AC) tot de pilot GEO-content publiceert. **Bewijs**: smoke **34/34** (`scripts/dev/agent-seo-watchdog-smoke.ts`) — unit-helpers, geseede-DB-scan met alle 5 signalen (80→46), workspace-isolatie, echte run $0,094 met refresh-proposal die de decay-signalen benoemt, headless confirm → brief geüpdatet, lege workspace $0,058, én scheduled-bewijs (enqueue → runner → run `triggerType=scheduled` + notificatie "Iris finished a task"). Bijvangst: scan-result geeft `scannedAt` mee (eerste run hallucineerde een datum); staleness-recompute-cron-sub-item in `geo-seo-followup-later.md` functioneel vervangen.

- Task: [tasks/done/agent-seo-watchdog.md](../tasks/done/agent-seo-watchdog.md)
- Plan: [tasks/_drafts/idea-agent-seo-watchdog.md](../tasks/_drafts/idea-agent-seo-watchdog.md) + marktonderzoek (#PR 128)

### 396. Remi live — 7e persona-agent schrijft het wekelijkse klant-klare merkrapport (agents-uitbreiding bouw 2/3)

Tweede bouw uit het agents-uitbreidingsplan (#394): `agent-reporter` ("Remi", Reporting Analyst) op Dana's curated query-tools. **Fase 1 (code-loos, gate)**: golden report handmatig geschreven op échte BB-prod-data ([docs/reports/remi-golden-report-2026-07-14.md](reports/remi-golden-report-2026-07-14.md)) — bevindingen: (a) frame-acceptatie "brand-operations weekly zonder ads-cijfers" ligt als beslispunt bij Erik, (b) alle vier de blokken blijven (lege blokken bewijzen juist het eerlijke geen-data-gedrag), (c) maand-granulariteit-gap bevestigd → **nieuwe curated tool `query_period_activity`** (venster N dagen vs voorgaand venster: created/published/reviews/avg-F-VAL; bewust géén "completed" — geen completion-timestamp; Dana profiteert automatisch mee). **Fase 2**: registry-definition met vast 4-blokken-skelet (geproduceerd / F-VAL / campagnestatus / marktsignalen+focus), eigen namespace `agent:reporter` (memory-scoping is namespace-keyed — Dana's namespace delen zou geheugens mengen), **0-credit** zoals Dana (beslispunt: "inzicht in je merk is altijd gratis"; geen `billable`-flag = aantoonbaar nergens gemeterd). **Bewijs**: echte runs — BB-workspace perfect 4-blokken-NL-rapport met week-op-weekvergelijking ($0,068/32s), lege workspace eerlijk per-blok "geen data" ($0,065), kosten-gate 5 runs gem. $0,068 ≤ $0,15; smoke `scripts/dev/agent-reporter-smoke.ts`. Review: 0 CRITICAL, 3 WARNINGs gefixt (stale Dana-smoke-assert die de "Dana profiteert mee"-claim bewaakt, venster-woording prompt↔tool, changelog-AC) + dogfood-spec voor Remi.

- Task: [tasks/done/agent-reporter.md](../tasks/done/agent-reporter.md)
- Plan: [tasks/_drafts/idea-agent-reporter.md](../tasks/_drafts/idea-agent-reporter.md) + marktonderzoek (#PR 128)

### 395. Repurposing-route live — long-form → on-brand social-afgeleiden met F-VAL-score per afgeleide (agents-uitbreiding bouw 1/3)

Eerste bouw uit het agents-uitbreidingsplan (#394), route A: repurposing als Milo-use-case i.p.v. 7e persona. **Nieuw**: Claw read-tool `read_deliverable_content` (workspace-gescoped via de campaign-relatie, 12k-cap + truncated-flag onder de 16k-bridge-limiet, undefined-id-guard); `create_deliverable` + optioneel `sourceDeliverableId` (dubbele fail-fast-validatie, zet `derivedFromId`, "Derived from"-regel in de proposal); Milo + `repurpose-content`-use-case met gedistilleerde-brief-instructies (toegestane afgeleiden: linkedin-post/twitter-thread/linkedin-poll — instagram/facebook bewust uit tot er MediumEnrichment-seeds zijn: prod heeft er 0), promptVersion @2, maxToolCalls 8→12. Propose-only/confirm/F-VAL/credits lopen volledig over de bestaande keten. **Bewijs**: smoke 17/17 mét echte AI — proposals met écht gedistilleerde NL-briefs uit de bron, confirm → deliverable in de bron-campagne mét `derivedFromId` → generatie → **F-VAL 79** (boven de linkedin-baseline 76); lege bron → 0 proposals; verboden typen geweigerd; cross-workspace-read dicht. Dogfood-regressie Milo groen + expliciete bleed-check (create-request instagram-post wordt gewoon voorgesteld). Review: 0 CRITICAL, 3 WARNINGs gefixt (o.a. content-fencing in de Claw-chat-route). Stap-0-gate vooraf op prod gedraaid (marginaal gehaald, hertoets-notitie in de task-file).

- Task: [tasks/done/agent-repurposer.md](../tasks/done/agent-repurposer.md)
- Plan: [tasks/_drafts/idea-agent-repurposer.md](../tasks/_drafts/idea-agent-repurposer.md) + marktonderzoek (#PR 128)

### 394. Agents-uitbreiding gepland — 6 discoveries + 5 task-files, gates vooraf gedraaid op prod-data

Volledige planning-flow (feature-planner-discovery → technical-planner-promotie) voor de zes agents uit het marktonderzoek (#PR 128), op user-akkoord "meenemen in de launch". **Ready**: `agent-reporter` ("Remi", agency-rapportage op Dana's tools — Fase 1 is een code-loze golden-report-validatie; credits-beslispunt bij Erik) en `agent-repurposer` (long-form → social-afgeleiden met F-VAL-score; route A = Milo-use-case i.p.v. 7e persona — `AgentSchedule` targt use-cases, dus het ritme-argument verviel; gate marginaal gehaald: 3 BB-bronnen mét aanwas, deels smoke-content; bijvangst: **0 `MediumEnrichment`-seeds op prod** → instagram/facebook-afgeleiden zouden hard-throwen, scope-note toegevoegd). **Data-gated**: `agent-seo-watchdog` (0 geo-geanalyseerde pagina's op prod — opent zodra de pilot GEO-content publiceert). **Tweede ring met Fase-0-validaties**: `agent-vera-triggers` (event-triggered brand-review; vondst: `PipelineStatus.REVIEW` is dood — het echte event is `approvalStatus → IN_REVIEW`; ADR-aanvulling vereist) en `agent-ads-watchdog` (creative-gezondheid op Meta; vondst: `AdMetricSnapshot` heeft nul writers en `AdCampaign` vereist `deliverableId` — metrics-sync + account-discovery zijn eigen fases; ADR vereist). **Localization**: bewust géén task-file (dubbel gegate op het multi-market-epic) — wel idea-doc + agent-consumability-eisenblok op het epic (headless engine, PROPOSAL-subset-confirm, glossary op `BrandLocaleProfile`, F-VAL-P3-threading als score-voorwaarde). Roadmap: nieuwe subsectie onder 🤖 Agents. Coördinatie-note: reporter en toekomstige persona-agents raken dezelfde registry-touchpoints — sequencen.

- Rapport: [docs/reports/agents-marktonderzoek-en-uitbreidingsadvies-2026-07-14.md](reports/agents-marktonderzoek-en-uitbreidingsadvies-2026-07-14.md)
- Ideas: `tasks/_drafts/idea-agent-{reporter,seo-watchdog,repurposer,vera-triggers,ads-watchdog,localization}.md`
- Tasks: `tasks/agent-{reporter,seo-watchdog,repurposer,vera-triggers,ads-watchdog}.md`

### 393. Job-runner parallel — agent-lane concurrent met een rest-worker-pool (follow-up op #388)

De geparkeerde runner-follow-up, ontgrendeld door de agents-scheduling-merge (#119/#391). `runPendingJobs` draaide de batch dubbel-sequentieel: de AGENT_TASK-run werd volledig ge-await vóór de rest-batch startte (een 10-min-agent-run liet batch-genoten wachten en blies meestal meteen het 600s-budget), en de rest-jobs liepen één-voor-één (de #388-kick vangt alleen níeuwe dispatches — batch-genoten serialiseerden nog). Nu: de **agent-lane** (ongewijzigde semantiek: itereer door SKIPPED, max 1 échte start, geen budget-check) draait als eigen lane **concurrent** met een **rest-worker-pool** (cap 4; budget-check vóór elke claim op de oude plek; pull in batch-volgorde → prioriteit bepaalt startvolgorde). Claims blijven atomair (geen dubbel-werk, ook niet over gekickte invocations heen); invocation-duur = max(agent-run, pool) i.p.v. de som. Review-W1: `safeRunJob` voorkomt dat één runJob-throw de invocation vroeg laat sterven met handlers in flight. Verificatie: tsc 0, lint 0, jobs-smoke groen (agent-minirun + pool samen), overlap-smoke: 3 jobs zelfde startseconde, wall 12,5s vs som 35,7s (2,9×).

- Task: [tasks/done/runner-parallel-batch.md](../tasks/done/runner-parallel-batch.md)

### 392. Task-triage: zes open taken gereconcilieerd — web-page-builder afgehecht, drie stale premisses gecorrigeerd

Doc-keeper-audit over alle zes open task-files vs de codebase; uitkomst: **niets hiervan is nu bouwwaardig** — de waarde zat in reconciliatie. (1) **`web-page-builder-canvas-step-mvp` → done**: alle 6 fasen + follow-ups bleken al maanden gemerged (PR #14/#15, #267-#345); Track-4-rest gereconcilieerd (README bestond al; marketing-pricing-dogfood obsoleet via #384; calibratie-doc de facto ingehaald door #270/#316/#336); echte restjes (bundle-split render-route, perf-meting, Puck-bug-report) → nieuwe post-launch-task `web-page-builder-acceptance-rest`. (2) **`power-user-shortcuts`**: stappen 1-3 (auto-inherit, "add another like this", bulk-add) bleken **al gebouwd in april 2026** (`ccb7e1cd`, vóór de changelog-migratie) — gedescoped naar alleen stap 4+5, post-launch. (3) **`content-test-regression-7B`** → later, data-gated: prod heeft 0× rejected/edited-LearningEvents (2× approved); plus de-scopes (golden-sets-runner i.p.v. promptfoo, PublishGate-surface i.p.v. de verwijderde Studio-UI). (4) **`video-chain-explainer-showcase`** → post-launch, gated: de Video&Audio-categorie staat hidden (geen bereikbare surface) én per-scene-visuals bestaan inmiddels (alleen de script-chain ontbreekt). (5) `validate-brand-domain-component-fit`: premisse-drift gecorrigeerd (5 → 11 blokken). (6) `publishgate-second-opinion`: accuraat, geen actie. Roadmap-regels mee-gesynct.

- Audit + adviezen: zie de triage-blokken bovenin de betreffende task-files
- Nieuw: [tasks/web-page-builder-acceptance-rest.md](../tasks/web-page-builder-acceptance-rest.md)

### 391. Agents Fase 2 — scheduled runs, notificaties, per-agent memory + streaming agent-loop (autonomie-trap 2)

De `AGENT_TASK`-stub is een echte brug geworden: job-queue → registry → `runAgent` met `triggerType: 'scheduled'` en de schedule-creator als acting identity (gevalideerd via `canActInWorkspace` — actief lid + schrijfrol; propose-only blijft dus ook headless gelden). **Schedules**: `AgentSchedule`-model met DST-veilige cadence-algebra (Intl two-pass, smoke over beide Europe/Amsterdam-grenzen), exactly-once-enqueue per due-slot (idempotencyKey + conditionele nextRunAt-claim + P2002-vangst), CRUD (cap 20/workspace, EVERY_MINUTE dev-only mét runtime-gate) en beheer-UI op de agent-detailpagina + Manual/Scheduled-inboxfilter. **Queue-hardening**: max 1 gestárte agent-run per cron-tick met 680s-cap, per-workspace concurrency-cap=1 via advisory-xact-lock (SKIPPED zonder attempt), DISTINCT ON-workspace-fairness, en stale-RUNNING-reapers (900s; eigen-claim-guard op terminale writes; 24h-bound tegen historische wedges). **Notificaties**: in-app + e-mail (alleen scheduled, `emailEnabled`-gated, ge-await) bij COMPLETED/FAILED/AWAITING_CONFIRMATION, run-owner-only, met deep-link `agents-inbox?run=<id>` (in-app én via `?section=`-URL-param). **Per-agent memory**: `AgentMemory.agentId`, vrije recall-tool + propose-only `remember_agent_memory` (confirm-pad executeert; agentId server-owned — forge-proof), beheer-UI. **Streaming-loop**: `messages.stream().finalMessage()` per turn heft het non-streaming SDK-plafond van 21.333 tokens op (strategist → 32k); dogfood-sweep alle 6 agents groen vs baseline (0× truncatie, F-VAL 75/72, de 32k-config die eerder élke Stella-run instant liet falen draait door — `docs/reports/agents-dogfood-2026-07-13-streaming.md`). Review: 5 rondes × 2 subagents, 22 WARNINGs gefixt, ronde 5 = 0 CRITICAL / 0 WARNING. ⚠️ Deploy vereist gebatchte Neon `db push` (AgentSchedule, `AgentRun.scheduleId`, `AgentMemory.agentId`, `NotificationType`+3) — zie task-file.

- Task: [tasks/done/agents-scheduling.md](../tasks/done/agents-scheduling.md)
- ADR: [docs/adr/2026-07-05-agents-architectuur.md](adr/2026-07-05-agents-architectuur.md) (D7 autonomie-trap 2; geen nieuwe ADR nodig)
- Spec: `-`
- Commit: `7b1cb76d..97afb568` (10 commits op branch `feat/agents-scheduling`: 5 slices + 3 review-fix-rondes + finalize)

### 390. SEO Fase 4b gemeten: editorial review (stap 7) blijft — F-VAL-A/B zegt NO-GO

Gepaard A/B-experiment (n=4, BB-prod-workspace, echte runs; beide armen uit dezelfde run — de enige delta is de stap-7-pass; scoring cross-family met gpt-5 als judge, skipPersist). Uitkomst: gemiddeld 77,0 mét vs 75,25 zónder (Δ 1,75, nét binnen de marge), maar de vooraf geregistreerde beslisregel wijst **NO-GO**: arm B zakt in 2/4 onder de threshold én de winst is heterogeen — drie briefs 0/+1, één brief **+6** (judge 77→86: editorial redt daar aantoonbaar brand-fit). Een pass schrappen die 1-op-4 zes punten kwaliteit levert is pre-launch niet verdedigbaar; een conditionele gate is met n=4 niet betrouwbaar te bouwen. **Besluit: stap 7 blijft; de pipeline blijft ~7,5 min** (vs 12 vóór #388/#389). Herdraaibare harness: `scripts/fidelity/fase4b-editorial-ab.ts`. Bijvangst: (1) tijdens de meting bleek het Anthropic-tegoed op — stille prod-outage voor alle Claude-features, direct geëscaleerd en door Erik opgewaardeerd; (2) 2/4 briefs scoren in béide armen onder de threshold — draftkwaliteit is briefing-gevoelig, los van de editorial-vraag.

- Task: [tasks/done/seo-fase4b-editorial-ab.md](../tasks/done/seo-fase4b-editorial-ab.md)
- Meting: [tasks/seo-pipeline-speedup.md](../tasks/seo-pipeline-speedup.md) (§Fase 4b)

### 389. SEO Fase 4a — stap 8 parallel met de variant/polish-staart (~1 min van de wall-clock)

Vervolg op de #387-meting en de #388-kick: stap 8 (publication-prep-checklist, snel model, 42-130s) zat sequentieel vóór de variant-B/GEO-polish-staart terwijl beide uitsluitend aan de stap-7-output hangen — sinds ronde 2 is stap 8 checklist-only en levert hij geen prose meer. De wave-executor loopt nu t/m [7]; daarna draaien **stap 8 en de staart concurrent** (variant B ∥ GEO-polish-A → polish-B), waardoor de volledige stap-8-duur achter de staart verdwijnt. Events/checkpoint/resume-semantiek byte-voor-byte behouden (8-stappen-tracker, checkpoint na stap 8, resume-hergebruik); de staart blijft fail-soft. De échte staart-duur wordt nu gemeten en als timing-entry **step:10** gepersisteerd (complete-event → driver), en step:9 is geherdefinieerd als staart-restant + persist/charge. Bewuste, gedocumenteerde input-delta: variant B ziet de accumulatedContext zonder het stap-8-checklist-JSON (mechanische ruis over variant A). Gedocumenteerde trade-off: een run waarvan waves 1-7 het 600s-continuation-budget overschrijden kan de staart dubbel draaien (kosten, geen corruptie). Verwacht met #388 samen: wall-clock ~12 → ~8 min; prod-validatierun volgt. Fase 4b (checklist in stap 7 mergen of stap 7 conditioneel skippen) blijft gegate op een F-VAL-A/B. Verificatie: tsc 0, lint 0; review 0 CRITICAL / 2 WARNINGs verwerkt.

- Task: [tasks/done/seo-fase4a-tail-parallel.md](../tasks/done/seo-fase4a-tail-parallel.md)
- Meting: [tasks/seo-pipeline-speedup.md](../tasks/seo-pipeline-speedup.md) (§Fase 4a)

### 388. Job-queue instant-kick + SEO-overheid-instrumentatie — Fase 3b-uitvoering op de #387-meting

De grootste hefboom uit de #387-meting gedicht zonder de runner aan te raken (die is van de in-flight `agents-scheduling`-taak): **`dispatchJob` kickt nu direct de cron-worker** (fire-and-forget self-request met CRON_SECRET, serverless-safe via `after()` + 5s-abort, 10s-debounce tegen batch-amplificatie, fail-silent → minuut-cron blijft vangnet). Elke kick start een vérse invocation die alleen de nieuwe job claimt — dat haalt zowel de tot-60s-cron-wachttijd als het head-of-line-blocking weg (de #387-run wachtte 2m53 achter andere jobs) en laat SEO-continuations in seconden resumen. **Instrumentatie**: de SEO-driver schrijft nu `step:0` (setup) en `step:9` (post-stap-8-staart) bij in `state.timings`; review-vondst daarbij — die staart bevat variant-B + GEO-polish (1-3 AI-calls), dus de "~1m24 in-invocation overhead" uit #387 is grotendeels **ongetelde AI-tijd** (herkadert de Fase-3b-conclusie; de volgende run kwantificeert het exact). Continuation-runs verliezen hun timings niet meer (hydration-fix). Batch-parallellisatie in de runner = follow-up ná de agents-scheduling-merge. Verificatie: tsc 0, lint 0, kick-unit-smoke PASS; review 0 CRITICAL / 4 WARNINGs verwerkt.

- Task: [tasks/done/job-queue-latency.md](../tasks/done/job-queue-latency.md)
- Meting: [tasks/seo-pipeline-speedup.md](../tasks/seo-pipeline-speedup.md) (§Meting)

### 387. Deploy-smokes job-queue + SEO-meting gedraaid — go/no-go bepaald én stille sign-up-breuk op prod gevonden en gefixt

De laatste deploy-smoke van de launch-pad (taak #7), autonoom gedraaid via een gelabeld smoke-account (`erik+claude-smoke-7e@`). **Kritieke bijvangst**: elke nieuwe prod-sign-up bleek te 500'en op de missende `Organization.sepaPaymentMethodId`-kolom — de handmatige Neon-push van de Fase-4/5a/5b-delta was gerapporteerd als gedaan maar vermoedelijk vanuit een oud-schema-checkout gedraaid; onboarding was stil kapot sinds de 5a-deploy. Push opnieuw gedraaid vanaf actuele main (additief, "in sync") en geverifieerd met een echte sign-up (zie gotcha 2026-07-13). **Job-queue**: alle 7 gemigreerde job-types end-to-end COMPLETED op de deploy via de minuut-cron (website-scan, trend-research, brandstyle-URL, brandvoice-URL, bug-report, chat-feedback, SEO-generate). **SEO-meting (de gate voor `seo-pipeline-speedup` Fase 3/4)**: 6 pilot-runs + 1 verse run — wall-clock gem. 10,9-12 min vs effectieve AI-tijd 7,5-8,5 min; F-VAL 90-92 threshold-met. Verdict: doel 5-7 min nog niet gehaald; **grootste hefboom is de 2,4-4,5 min niet-AI-overhead (nieuw: Fase 3b overhead-analyse eerst)**, daarna **Fase 4 GO** (stap 7+8 = ~2,9 min premium; stap-8-spreiding 42-130s suggereert dat het checklist-only-pad niet altijd actief is), **Fase 3 context-trim NO-GO** als latency-maatregel (output-gedomineerd, zoals voorspeld). Volledige meting in de task-file.

- Task: [tasks/seo-pipeline-speedup.md](../tasks/seo-pipeline-speedup.md) (§Meting)
- Gotcha: Neon-push pas "gedaan" na een verificatie-write (gotchas.md 2026-07-13)

### 386. Auto-topup BTW-compliant (invoice-based) + cap-race atomair dicht — laatste gate vóór topup-enable

De twee herbeoordeel-punten uit playbook §9/§10 opgelost; er staat niets meer tussen de huidige staat en `NEXT_PUBLIC_TOPUP_ENABLED=true`. **(1) Invoice-based charging**: de off-session auto-topup-incasso loopt niet langer via een kale PaymentIntent (geen BTW mogelijk) maar via een `charge_automatically`-invoice met `automatic_tax` — pack-prijs ex-BTW als invoice-item, Stripe Tax rekent het tarief, en de bestaande `invoice.paid`-webhook persisteert de factuur gratis in Settings → Billing. Idempotency-anker verhuisd van PI-id naar invoice-id (`topup:<in_…>`); settle op `invoice.paid`, reversal + kill-switch op `invoice.payment_failed` (die voor topup-invoices bewust géén PAST_DUE op de subscription zet); dispute/refund-fallback herleidt invoice-charges zonder PI-metadata via `invoicePayments.list`. De mandaat-Checkout verzamelt nu verplicht een adres (tax-locatie). **(2) Cap-race (review-W2)**: cap-check + optimistische claim atomair in één transactie onder `pg_advisory_xact_lock` per org, claim-vóór-charge (draft-invoice eerst; bij over-cap wordt de draft gedelete, bij bewijsbare sync-pay-fout gevoid + reversal). Verificatie: tsc 0, lint 0, unit-smokes 49/49, e2e-testmode-smoke groen — BTW-factuur €50+€10,50, settle, exact één claim uit 2 parallelle calls, fail-pad reversal+kill-switch (playbook §11; herdraaibaar via `scripts/dev/credit-autotopup-e2e-smoke.ts`).

- Task: [tasks/done/credit-autotopup-invoice-tax.md](../tasks/done/credit-autotopup-invoice-tax.md)
- Playbook: [stripe-go-live §11](playbooks/stripe-go-live.md)

### 385. Stripe live-config + testmode-deploy-smokes billing groen — webhook-api_version-landmine gefixt

Volledige Stripe-productieconfiguratie via de API afgerond (user-taken #2/#6): webhook-endpoint van 9 → 14 events; iDEAL/SEPA display-preferences aan (SEPA-capability door Erik via dashboard, geverifieerd `active`); **Stripe Tax `active`** (head-office Ede, defaults `exclusive` + SaaS-B2B-taxcode, NL-registratie — live én testmode gespiegeld); `SELLER_VAT_NUMBER` in Vercel; **prijzen ADR-conform**: STARTER €39 en GROWTH €89 aangemaakt, AGENCY-prijs gecorrigeerd van €99 naar €299, oude-casing-producten gearchiveerd, alle actieve prijzen `tax_behavior: exclusive`, price-envs in prod+preview + redeploys. **Testmode-deploy-smokes (user-taak #3) allemaal groen** tegen echte Stripe-testmode met `stripe listen` + headless Playwright: iDEAL-testbank-mandaat → generated `sepa_debit`-pm; auto-topup optimistisch → settled; fail-IBAN → reversal + kill-switch; BTW-facturen NL-21% / DE-reverse-charge / FR-0%-zonder-OSS — alle `Invoice`-tax-velden correct gepersisteerd. **Kritieke bijvangst**: het prod-webhook-endpoint had geen `api_version`-pin en leverde events in account-default **2019-10-17**-shape (had de hele 5b-BTW-extractie stil gebroken) — endpoint opnieuw aangemaakt gepind op `2026-02-25.clover` + secret-rotatie in Vercel. Restpunten vóór topup-enable: W2-cap-race + auto-topup-PI buiten Stripe Tax (playbook §9/§10).

- Playbook: [stripe-go-live §8–10](playbooks/stripe-go-live.md)
- Gotcha: webhook-endpoints altijd pinnen op de SDK-`api_version` (gotchas.md 2026-07-12)

### 384. Marketing-site launch-klaar — ADR-pricing, features gemoderniseerd, JSON-LD

Het bestaande /marketing-scaffold (route-group, 6 pagina's, UTM-tracking) naar launch-klaar gebracht. **Pricing-pagina volledig op het ADR-credit-model**: Starter €39/400cr · Growth €89/1.200cr · Agency €299/4.000cr, top-up-packs (500/€50 · 1.500/€135 · 5.000/€400, €0,10/credit), 28-daagse no-card-trial met 300 credits, en een credit-FAQ die de differentiator expliciet maakt ("brand context and every brand-fit check are always free") + iDEAL/SEPA/reverse-charge-antwoord. **Stale productverhalen gemoderniseerd**: Content Studio/"53 types" → Content Canvas/25+ types (incl. web-page-builder + SEO/GEO), Brandclaw → AI Agents (de zes echte agents, propose-only/human-in-the-loop-framing) — nav, footer én sitemap-slugs mee. **SEO**: Schema.org JSON-LD (Organization/WebSite/Product+offers) in de layout; dode legal-footer-links verwijderd (pagina's bestaan nog niet — user-taak). Visueel geverifieerd met Playwright: 6/6 pagina's HTTP 200, 0 console-errors. Content-rest (copy-review, echte quote, product-screenshots, Calendly, legal, domein-rewrite) staat als user-taak #9 op de takenlijst.

- Task: [tasks/done/marketing-site-pricing.md](../tasks/done/marketing-site-pricing.md)
- ADR (prijzen): [docs/adr/2026-07-07-pricing-credits-launch.md](adr/2026-07-07-pricing-credits-launch.md)

### 383. Launch-pad-hygiëne — credit-model écht af (pre-flight-hints, auto-topup-instellingen), pricing-UI-fixes en task-reconciliatie

Completion-ronde over de resterende launch-pad-taken. **Credit-model-restjes gedicht**: pre-flight-kostenindicatie "kost ~N credits" (nieuw shared `CreditCostHint`, gevoed door de centrale registry) op de drie primaire generatie-CTA's — canvas-tekst (short 5 / long-form 80 via de template-categorie), AI-image (2) en AI-video (20); auto-topup-instellingen-UI + `/api/billing/auto-topup` (toggle/pack/plafond, owner/admin, aanzetten fail-closed 409 zonder actief mandaat of pack); Fase-2d-documentatie van de credit-keuze per background-job-type in `handlers.ts`; `metered.ts` in-arrears-pad expliciet gedeprecieerd. **review-live-pricing (code-deel)**: `PLAN_CONFIGS` bleek al ADR-conform (Starter €39/Growth €89/Agency €299; PRO legacy) — de taak-tekst zelf was stale; de jaarlijks-toggle is nu feature-gated via `yearlyAvailable` op `/api/stripe/prices` (geen -20%-belofte meer zonder echte yearly-prijzen). Nieuw gevonden en op de user-takenlijst gezet: prod mist de Starter/Growth-price-ids (checkout nieuwe tiers onmogelijk) en de lokale `STRIPE_SECRET_KEY` is corrupt (`ssk_live…`). **Onboarding-test**: volledig protocol geleverd (`docs/playbooks/onboarding-test-protocol.md`). **Task-reconciliatie**: pricing-credits fase2/3/6 + umbrella, review-live-pricing en pre-launch-browser-smoke-batch → `tasks/done/` met eerlijke delta-notities; de deploy-smokes en menswerk-delen staan als [USER]-taken op de takenlijst.

- Tasks: [pricing-credits-billing](../tasks/done/pricing-credits-billing.md) · [review-live-pricing](../tasks/done/review-live-pricing.md) · [pre-launch-browser-smoke-batch](../tasks/done/pre-launch-browser-smoke-batch.md)
- Playbook: [onboarding-test-protocol](playbooks/onboarding-test-protocol.md)

### 382. Credit-model Fase 5b — Stripe Tax/BTW: reverse-charge, OSS en factuur-uitsplitsing

Sluit het credit-launch-bouwwerk (Fase 0-6): de BTW-laag. **Checkout doet het werk** (Integration-First, geen eigen tarief- of VIES-logica): `automatic_tax` + verplichte adres-collectie + `tax_id_collection` (Stripe VIES-valideert; geldig EU-B2B-VAT → reverse-charge, ongeldig → fail-closed lokaal tarief, EU-B2C → OSS) op subscription- én top-up-sessies; top-up-`price_data` expliciet `tax_behavior: 'exclusive'`. **Persistentie**: `extractInvoiceTax` (API clover: `total_taxes`) schrijft `taxAmount/taxRate/netAmount/reverseCharge/customerVatNumber/sellerVatNumber` op het (additief uitgebreide) `Invoice`-model; `amount` blijft het totaal (bestaand UI-contract). **UI**: `InvoiceHistoryCard` toont netto/BTW(+tarief)/totaal, "btw verlegd (reverse charge)" en beide VAT-nummers. Bewuste deviaties gedocumenteerd in de task: geen org-VAT-veld/eigen VIES-route (Stripe-customer = bron; per factuur gepersisteerd) en de off-session auto-topup-PI valt buiten Stripe Tax (herbeoordeel-punt vóór topup-enable, playbook §9). Verificatie: smoke `credit-invoice-tax-smoke` 12/12 (NL-21%/reverse-charge/pre-tax-nulls/end-to-end-upsert), tsc/lint 0. Dashboard-acties (Stripe Tax aan, origin-adres, prijs-tax_behavior, OSS, `SELLER_VAT_NUMBER`) in playbook §9. Review-ronde (0 CRITICAL, 3 WARNINGs): reverse-charge-detectie belt-and-braces via `total_taxes[].taxability_reason` (het `customer_tax_exempt`-veld is onder automatic_tax een dode snapshot — de smoke valideerde de aanname i.p.v. Stripe-gedrag), top-up-Checkout krijgt `invoice_creation` (BTW-factuur is verplicht bij elke levering; de usage-reset in invoice.paid is daarbij gegate op subscription-billing_reasons), en de Neon-push van de Invoice-kolommen staat nu expliciet in playbook §9 (zonder push 500't de invoices-route na deploy). Hiermee zijn **Fase 4 + 5a + 5b compleet** — de resterende weg naar betaling-koppelen is dashboard-config + één gebatchte Neon-push + deploy-smokes (user-checklist).

- Task: [tasks/done/pricing-credits-fase5b-tax.md](../tasks/done/pricing-credits-fase5b-tax.md)
- ADR: [docs/adr/2026-07-07-pricing-credits-launch.md](adr/2026-07-07-pricing-credits-launch.md)
- Playbook: [docs/playbooks/stripe-go-live.md](playbooks/stripe-go-live.md) §9

### 381. Credit-model Fase 5a — iDEAL/SEPA op checkout + incasso-mandaat + auto-topup live

Het payments-deel van Fase 5 (gesplitst per de Simplicity-noot in de task; 5b = Tax/BTW volgt apart). **iDEAL** naast kaart op de top-up-Checkout (bewust geen sepa_debit voor one-offs — incasso settelt na dagen) en `card+ideal+sepa_debit` op de subscription-Checkout (iDEAL-eerste-betaling krijgt Stripe-native een SEPA-mandaat voor renewals). **Herbruikbaar incasso-mandaat** via Checkout `mode:'setup'` (volledig gehost, geen Elements): `sepa-mandate.ts` + `/api/stripe/setup-mandate` (GET status/POST start, owner/admin) + mandaat-blok in PaymentMethodsCard; status is webhook-owned ('active' nooit optimistisch; `mandate.updated` fail-closed). **Auto-topup is live** (het Fase-3-invulpunt): blootstellingsplafond over optimistisch-onbevestigde credits (settled-check in JS — SQL `NOT(path=true)` mist rijen zonder de key, JSON-NULL-semantiek), off-session PI tegen het mandaat, optimistische grant met idempotencyKey `topup:<pi.id>` (zelfde key als de succeeded-webhook → nooit dubbel-grant; succeeded markeert settled), reversal via `payment_intent.payment_failed` (force-deduct, idempotent), in-app notificatie per bijkoop (`AUTO_TOPUP`-enum). Review-ronde (1 CRITICAL + 5 WARNINGs): het single-use-iDEAL-pm-vs-generated-sepa_debit-pm-gat gedicht (`resolveSepaPaymentMethodId` via SetupAttempt-expand — anders faalde élke incasso terwijl de status 'actief' toonde), dispute/refund-reversal voor late SEPA-terugboekingen (`charge.dispute.created`/`charge.refunded`), race-tombstone (failed-vóór-grant kan nooit alsnog toekennen), geen pending-degradatie van een actief mandaat, en een kill-switch (één gefaalde incasso zet auto-topup uit — geen oneindige charge-cyclus). Bewust geaccepteerd + gedocumenteerd: de cap-race bij parallelle tekorten (~1s-venster; herbeoordelen vóór topup-enable). Verificatie: nieuwe smoke `credit-sepa-mandate-smoke` **19/19** (bewust zonder Stripe-API: de lokale key bleek live; charge-pad = deploy-smoke in testmode), regressie autotopup 5/5 + topup 4/4 + ledger 8/8 + enforce 4/4, tsc/lint 0. User-acties: **5 webhook-events** toevoegen in het Stripe-dashboard (setup_intent.succeeded, mandate.updated, payment_intent.payment_failed, charge.dispute.created, charge.refunded) + Neon db push (sepaPaymentMethodId + AUTO_TOPUP, te batchen met TRIAL_EXPIRING).

- Task: [tasks/done/pricing-credits-fase5a-payments.md](../tasks/done/pricing-credits-fase5a-payments.md)
- ADR: [docs/adr/2026-07-07-pricing-credits-launch.md](adr/2026-07-07-pricing-credits-launch.md)
- Playbook: [docs/playbooks/stripe-go-live.md](playbooks/stripe-go-live.md) §8

### 380. Credit-model Fase 4 — reverse-trial compleet: read-only-lock + T-3/T-0-vervalmeldingen

Voltooit de 28-daagse no-card reverse-trial (ADR 2026-07-07 D8). De trial-start (300cr-grant, idempotent) en de expiry-cron bestonden al (#372); dit levert de ontbrekende lifecycle: **(1) on-read trial-state** — nieuw `trial.ts` met `getTrialState`/`isReadOnlyLocked`, afgeleid uit `trialEndsAt` + betaal-historie (`lifetimeGranted > TRIAL_CREDITS` óf actieve subscription óf unlimited) — geen status-veld dat een cron moet zetten, dus nooit stale; **(2) read-only-lock** — één lock-check ín `enforceCreditBalance` (vóór de saldo-check, eigen 402 met `trialExpired: true`-conversie-CTA i.p.v. een misleidende "koop credits bij" op restsaldo) dekt de 6 gemeterde generatie-routes; `enforceNotLocked` op de 4 entity-create-routes én (review-W1) op de 5 post-hoc-generatie-ingangen (landing-pages, persona-image, edit-image, consistent-models, agent-run/confirm) zodat een gelockte org ook via chargeAfter-paden geen negatief saldo kan draaien; PATCH/DELETE-edits blijven bewust open (restpunt, copy is daarop eerlijk); lees-routes en merk-data blijven volledig intact (geen delete-pad geraakt); lock-lift is impliciet via de ledger — élke top-up/plan-grant tilt `lifetimeGranted` boven de trial-bundel; **(3) T-3/T-0-meldingen** — `trial-notify.ts` in de bestaande dagelijkse expire-trials-cron: in-app (`NotificationType.TRIAL_EXPIRING`, additief enum-lid → Neon `db push` vóór deploy) + e-mail via Emailit, dedup zonder schema-velden via het createdAt-venster rond `trialEndsAt`; **(4) UX** — `isLocked` in `/api/billing/balance` + lock-banner in `CreditBalanceCard` ("merkdata blijft veilig en zichtbaar"). Verificatie: nieuwe smoke `credit-trial-lock-smoke` 16/16 (state-matrix, 402-precedentie, entity-guard, dedup-vensters), regressie trial-expiry 5/5 + enforce 4/4, tsc/lint 0.

- Task: [tasks/done/pricing-credits-fase4-trial.md](../tasks/done/pricing-credits-fase4-trial.md)
- ADR: [docs/adr/2026-07-07-pricing-credits-launch.md](adr/2026-07-07-pricing-credits-launch.md)
- Spec: [tasks/pricing-credits-billing.md](../tasks/pricing-credits-billing.md)

### 379. F-VAL op rauwe content-REPORTs — Milo's inline draft krijgt een echte score (ADR-D5-gat gedicht)

De laatste open dogfood-bevinding (r1 #1 / r2 #5): `AgentArtifact.fidelityScore` bleef `NULL` op de content-REPORTs van de content-creator, terwijl ADR D5 eist dat élke content-output een fidelity-score toont. Nieuw `reportScoringOutputContract` (eigen module, wrapper om het gedeelde artifact-contract): na de atomaire run-finalize scoort het de zojuist aangemaakte REPORTs via `runFidelityForExternalContent` (zelfde pad als Vera's review — de score landt ook als `ContentReviewLog` in Brand Alignment) en schrijft `fidelityScore` terug op het artefact. Scoping: alleen REPORTs met `content.markdown`, geen `answerFallback` (generiek antwoord ≠ content), ≥50 woorden; fail-soft (een score-fout kan de run nooit falen). Alleen de content-creator gebruikt dit contract; de UI toonde al automatisch een `FidelityBadge` zodra de score er is. Gevalideerd met een echte run: `REPORT(F-VAL 71)`, run-gedrag/kosten ongewijzigd. NB-nummering: #378 is geclaimd door de golden-set-gate-fix (parallelle PR).

- Task: [tasks/done/agents-fval-report-scoring.md](../tasks/done/agents-fval-report-scoring.md)
- ADR: [docs/adr/2026-07-05-agents-architectuur.md](adr/2026-07-05-agents-architectuur.md) (D5)
- Rapporten: [agents-dogfood-2026-07-07.md](reports/agents-dogfood-2026-07-07.md) bevinding #1 · [agents-dogfood-2026-07-12.md](reports/agents-dogfood-2026-07-12.md) bevinding #5

### 378. Golden-set-gate hersteld — uitgefaseerd model-ID + herkalibratie sonnet-4-6 (evaluate weer betekenisvol)

De `evaluate`-check (Content Golden-Sets) stond structureel rood — op elke PR én op main. Echte root cause (anders dan de secrets-hypothese in de task): alle 8 golden-set-yamls draaiden op het **uitgefaseerde model-ID `claude-sonnet-4-5-20251001`** → Anthropic 404 op elke case → 0/10 < 70%-drempel. Fix in vier lagen: model-ID → `claude-sonnet-4-6` (8 configs); workflow-`permissions` voor de PR-comment ("Resource not accessible by integration"); herkalibratie van de blog-post-set op het nieuwe model — het output-contract dat de asserts al toetsten expliciet in de prompt (H1-direct zonder preamble, SEO-keyword letterlijk, harde lengte-eis, brand-primacy bij off-brand briefs) + `max_tokens` 4000→8000; en twee kapotte testgevallen gerepareerd (H1-regex met `$` kon nooit op meerregelige output matchen; de 2000-woorden-case asserteerde lengte die de brief nooit vroeg). Meetreeks: 0/10 (crash) → 4/10 → 5/10 → **7/10 (70%, gate groen)**; de 3 resterende fails zijn llm-rubric-borderline (judge-variantie — de reden dat de gate op pass-rate i.p.v. per-case gaat). NB: 70% is de rand; structurele vervolgstap is de v2 orchestrator-wrapped prompts. e2e-helft van de task was al gefixt (PR #93 + `skipTour`-vertaling). Zelfde stale-artefact-familie als gotchas 2026-05-29/06-10: een model-ID dat alleen in CI-configs leeft, veroudert onzichtbaar.

- Task: [tasks/done/ci-golden-set-e2e-fixes.md](../tasks/done/ci-golden-set-e2e-fixes.md)
- ADR: -
- Workflow: `.github/workflows/golden-sets.yml` + `tests/content-golden-sets/`

### 377. Dogfood-r2 follow-ups — angle-generator thinking-fix, strategist-foundation-budget, worktree.sh --done + opruimwerk

De twee open non-fatale defecten uit dogfood-ronde 2 (#375) gefixt, beide met echte runs gevalideerd. **Angle-generator**: `gemini-2.5-flash` heeft dynamic thinking standaard aan en die thinking-tokens tellen mee in `maxOutputTokens` — daarom loste de ronde-1-budgetverhoging niets op. Fix: `thinking: { google: { thinkingBudget: 0 } }` (angles zijn framing-keuzes, geen deep reasoning); validatie: 2 volwaardige angles op het ronde-2-deliverable, geen MAX_TOKENS-warn. **Strategist-foundation**: outputbudget 16k → 24k in `budgetWithThinking` (strategy-chain) — de foundation-JSON kapte op fast-tier/Haiku af bij ~57k chars waardoor de tool faalde en de agent zonder fundering improviseerde; de Claude-wrapper streamt (geen SDK-21.333-plafond) en de timeout schaalt automatisch mee. Validatie: strategist-run 0× truncatie (was 1×), foundation slaagt; run kost nu ~$0,19 i.p.v. ~$0,09-0,12 doordat de gelukte foundation-output als tool-result terug de loop in stroomt (46k input-tokens) — de agent bouwt weer op een echte fundering. **Tooling**: `worktree.sh --done <task-id>` geïmplementeerd (stond al in de eigen help-tekst maar bestond niet): verwijdert een schone taak-worktree + safe-delete van de gemergde branch, weigert dirty trees — live getest op beide paden. **Opruimwerk** (START_HERE item 1): worktrees `branddock-feat-agents-feature/-ui/-data` + `branddock-brandclaw` + `branddock-agents-dogfood-ronde2` verwijderd incl. gemergde lokale branches + remote `fix/agents-dogfood-ronde2`; `e2e-verify-main` bestond al niet meer.

- Task: [tasks/done/agents-budget-hygiene.md](../tasks/done/agents-budget-hygiene.md)
- ADR: [docs/adr/2026-07-05-agents-architectuur.md](adr/2026-07-05-agents-architectuur.md)
- Rapport: [docs/reports/agents-dogfood-2026-07-12.md](reports/agents-dogfood-2026-07-12.md) (bevindingen #2/#3)

### 376. Content-flow friction-tickets #7.A — afgeleide type→categorie-map, expliciete Plan-and-Solve-set, few-shot-diversiteit ads

Uitvoering van de CF-tickets uit de #7.A flow-analyse, na een verificatie-sweep die 4 van de 9 tickets achterhaald toonde (CF-1 templates / CF-2 twitter-thread / CF-9 LP-F-VAL waren al geland; CF-6/7 skip zolang de betrokken types hidden zijn). Geland: `TYPE_TO_CATEGORY` wordt afgeleid uit de 8 template-collecties (de handmatige voorganger had 9 phantom-IDs + 11 ontbrekende types die stil op `'long-form'` terugvielen, o.a. `facebook-ad`); Plan-and-Solve-eligibility is een expliciete set (long-form-categorie + `proposal-template`/`impact-report`, PUCK-website-types bewust uitgesloten); `getPromptTemplate()` warnt (once-per-type, niet op lege legacy-id) bij een generic-fallback-hit; `smoke:prompt-contracts` sectie (g) bewaakt de dekking via het échte lookup-pad (`hasDedicatedTemplate`) + een cross-collectie-collision-assert; en de 6 zichtbare ad-types kregen een tweede few-shot-anchor in een contrasterende branche + expliciete niet-kopiëren-instructie (anti example-bleed; 41 velden programmatisch binnen hun character-limits gevalideerd; versions advertising 1.3.0 / social-media 2.1.0). Kwaliteit: 2×2 reviewer-subagents over 2 rondes (r1: 4 WARNINGs gevonden + gefixt; r2: 0 CRITICAL / 0 WARNING, alle claims onafhankelijk gereproduceerd — 23/24 zichtbare types byte-identiek gedrag; enige delta is de bedoelde facebook-ad-fix op een dormant pad). Gates: tsc 0 · lint 0 · prompt-contracts 293/293.

- Task: [tasks/done/content-flow-improvements-7a.md](../tasks/done/content-flow-improvements-7a.md)
- ADR: [adr/2026-07-12-type-category-derivation-plan-and-solve.md](adr/2026-07-12-type-category-derivation-plan-and-solve.md)
- Spec: `docs/specs/content-flow-synthesis.md` (bron-tickets §F)
- Commits: `9adf77dd` (CF-1/3/4 + smoke g + ADR) · `eaff014d` (CF-5/8) · `02415d29` (review-fixes r1)

> NB nummering: #375 is bewust overgeslagen — dat nummer is geclaimd door de agents-dogfood-r2-entry uit de parallelle sessie (inmiddels gemerged via PR #102) om een renumber-collision te vermijden.

### 375. Agents dogfood-ronde 2 — strategist-regressie gevonden + gefixt, credit-metering op agents praktijk-gevalideerd

Herhaalmeting van de agents-dogfood (ronde 1 = #366-tijdvak, rapport 2026-07-07), autonoom uitgevoerd. **Hoofdvondst**: de ronde-1-hygiëne-fix (strategist `maxTokens` 16k→32k) bleek een fatale regressie — de Anthropic SDK weigert non-streaming calls met `maxTokens > 21.333` client-side ("Streaming is required…"), waardoor élke Stella-run sinds 2026-07-07 instant faalde, óók op productie. Fix: `NONSTREAMING_MAX_TOKENS`-clamp in `runLoopCore` (defense-in-depth voor alle agents, warn bij clamp) + strategist-definitie op 21.333; gevalideerd met een echte run (COMPLETED, 241,9s, $0,09). **Credit-metering op agent-runs voor het eerst in de praktijk gemeten**: sweep met credits aan boekt correct 0 transacties (5 gratis agents; Milo-proposal boekt niet), confirm-pad boekt exact −3 credits (`agent-deliverable`, idempotencyKey) — geen instrumentatie-blocker meer voor Fase 2. Guardrails opnieuw groen: ~$0,09/run, eindcontent F-VAL 73 (>70). Open bevindingen: angle-generator-truncatie niet verholpen (Gemini thinking-tokens eten het `maxOutputTokens`-budget) en de oorspronkelijke strategist-truncatie zit in de gedeelde `createClaudeStructuredCompletion`-default (16k) — beide non-fataal, gedocumenteerd. Harnassen verbeterd: `DOGFOOD_RUN_DATE`/`DOGFOOD_ONLY` op de sweep, route-parity credit-charge in het confirm-pad. Les vastgelegd als gotcha 2026-07-12.

- Task: [tasks/done/agents-dogfood-ronde2.md](../tasks/done/agents-dogfood-ronde2.md)
- ADR: [docs/adr/2026-07-05-agents-architectuur.md](adr/2026-07-05-agents-architectuur.md)
- Rapport: [docs/reports/agents-dogfood-2026-07-12.md](reports/agents-dogfood-2026-07-12.md)

### 374. Credits LIVE in pilotmodus — top-up-gate + activatie (betaling nog niet gekoppeld)

Het credit-model draait sinds 2026-07-10 live op productie in **pilotmodus**: pilots zien hun creditsaldo (Settings → Billing) dalen per generatie en hebben een hard **maximum** (het via het Credit Admin-paneel gegrante budget → bij 0 een nette 402), terwijl de **koop-flow volledig dicht** is. Daarvoor een derde vlag: `NEXT_PUBLIC_TOPUP_ENABLED` (default uit) — `TopupCard` verbergt zich, `createTopupCheckout` weigert server-side (geen route naar live-Stripe-charges), en de 402-copy is topup-bewust ("Neem contact op voor extra credits" i.p.v. een koopverwijzing). Activatie-volgorde: eerst grants/comps via het admin-paneel (eigen org unlimited, pilots capped), daarna `NEXT_PUBLIC_CREDITS_ENABLED=true` + rebuild-redeploy (NEXT_PUBLIC-vars zijn build-time). Betaling later koppelen = alleen `NEXT_PUBLIC_TOPUP_ENABLED=true` (na de launch-checklist: Stripe-price-map, Tax, iDEAL/SEPA). User-geverifieerd op prod. Bijvangst: `scripts/dev/credit-admin.ts` (saldo tonen/granten/zetten via CLI) alsnog gecommit.

- Task: [tasks/pricing-credits-fase6-usage-ux.md](../tasks/pricing-credits-fase6-usage-ux.md)
- ADR: [docs/adr/2026-07-07-pricing-credits-launch.md](adr/2026-07-07-pricing-credits-launch.md)
- Commit: `6ecbaaab` (#100)

### 373. Superuser Credit Admin-paneel — pilot-comps en grants vanuit de app

In-app platformbeheer van credits, zodat pilot-comps niet langer CLI-scripts vereisen. Nieuwe developer-only Settings-tab **Credit Admin** (zelfde `DEVELOPER_EMAILS`/`requireDeveloper()`-gating als AI Models/Bug Triage): per organisatie het saldo, een "Make unlimited"-toggle (comp aan/uit, met `invalidateOrgUnlimited`-cache-bust) en een grant-invoer (`grantCredits` type TOPUP met de admin-e-mail in de reason als audit-trail). API `/api/admin/credit-orgs` (GET lijst / POST grant|setUnlimited, zod-gevalideerd, 403 voor niet-superusers — live geverifieerd). Werkt bewust óók met credits-uit zodat pilot-orgs vóór de launch voorbereid konden worden. `DEVELOPER_EMAILS` in Vercel (Production+Preview) gezet op beide admin-adressen via de Vercel CLI.

- Task: [tasks/pricing-credits-fase6-usage-ux.md](../tasks/pricing-credits-fase6-usage-ux.md)
- ADR: -
- Commit: `#99`

### 372. Credit-model Fase 3+6 — billing-ON-gates, grants-trio, billing-UX en credit-vlag-ontkoppeling

Voltooit het credit-model tot live-klaar (PR #98, 2 reviewers × 2 rondes → ready-to-merge). **Gates**: unlimited-free-uitzondering per org (`Organization.unlimitedCredits`, gecachte `isOrgUnlimited` gewired in metering/charge/enforcement); pre-flight `enforceCreditsForAction` (402) op de 6 dure generatie-routes; trial-grant 300cr/28d bij signup (fail-soft, idempotent); plan-grant-maandbundel bij subscription-invoice (order-onafhankelijk via sync-first — review-CRITICAL-fix); handmatige top-up (Stripe Checkout + webhook-grant, idempotent per PaymentIntent, server-side prijs); grant-idempotentie (P2002-vangnet); confirm-time charge voor agent-deliverables; reaper-cron (15 min) + trial-expiry-cron (dagelijks, atomair nul-zetten via `FOR UPDATE`, alleen pure-trial-orgs). **Fase 6-UX**: `/api/billing/balance`, `use-credits`-hooks, `CreditBalanceCard` (saldo/trial/onbeperkt) + `TopupCard` in Settings → Billing. **Kritieke ontkoppeling**: prod bleek `NEXT_PUBLIC_BILLING_ENABLED=true` (subscriptions live) — een merge zou 0-saldo-orgs direct blokkeren; nieuwe `NEXT_PUBLIC_CREDITS_ENABLED`-vlag scheidt het credit-model van subscription-billing. Verificatie: smoke-suite 39/39 (ledger/exempt/enforce/grant-idem/reaper/topup/auto-topup/trial-expiry), in-app Pad-A-test (402 bij 0 saldo → grant 30 → video −20), tsc 0/lint 0. Launch-blocker gedocumenteerd: alle live Stripe-price-ids in de env-map vóór betaling-koppelen.

- Task: [tasks/pricing-credits-billing.md](../tasks/pricing-credits-billing.md)
- ADR: [docs/adr/2026-07-07-pricing-credits-launch.md](adr/2026-07-07-pricing-credits-launch.md)
- Commit: `840efb23` (#98)

### 371. Session/worktree-guard — één Claude-sessie per worktree geborgd

Voorkomt de multi-sessie-in-één-werkboom-race van 2026-07-07 (twee sessies deelden één `.git`/HEAD/index + `node_modules` → main-reset ↔ cherry-pick, `AA`-conflicten in de gedeelde index, verdwenen `node_modules/eslint`, ongegenereerde Prisma-client). Twee lagen: **structureel** — `scripts/dev/worktree.sh <task-id>` maakt in één commando een geïsoleerde worktree (branch vanaf `origin/main` + `.env.local` + `npm ci` + `prisma generate`), zodat de setup-frictie die worktrees deed mijden verdwijnt; **vangnet** — `.claude/hooks/session-guard.sh`, een per-worktree heartbeat-lock (geen PID → zelfhelend, stale na 15 min). SessionStart waarschuwt bij een levende co-sessie; PreToolUse(Bash) blokkeert (`exit 2`) HEAD/branch/index-mutaties (`checkout/switch/reset/rebase/cherry-pick/branch -f/-D/worktree/stash/merge`) onder een co-sessie — `commit`/`push`/edits/npm blijven vrij. Fail-open bij interne fouten. CLAUDE.md maakt "worktree per taak" een harde regel; `.gitignore` negeert de lock. Guard-logica getest op 6 scenario's (co-sessie-block, solo-allow, stale-takeover, non-git-allow, commit-allow, eigen-sessie-allow).

- Task: -
- ADR: -
- Spec: `gotchas.md` (2026-07-07)
- Commit: `08fcceb1` (#96)

### 370. CI-e2e-gate hersteld — critical-flow structureel groen

De CI-`e2e`-gate (`critical-flow.spec`) stond al lang rood op `main` én elke PR. Drie gelaagde, puur test-side oorzaken (de app was correct): (1) **stale testid** — de AI-Exploration-methode op de brand-asset-detail-pagina miste `data-testid="research-method-ai-exploration"` (weggevallen bij een refactor van `AssetResearchSidebarCard`); (2) **detach-hang** — de onboarding-tour detacht zichzelf uit de DOM tijdens de skip-klik → kale `.click()` hangt 30s; (3) **count-race** — `campaignCards.count()` telde vóór de async-geladen cards er waren → 0. Fixes: testid hersteld op de gedragsneutrale method-card; skip-klik `click({timeout:5s}).catch()` + `waitFor('hidden')` in `critical-flow.spec` (2×), `auth.fixture`, `performance.spec`; `await expect(cards.first()).toBeVisible()` vóór beide counts. Gediagnosticeerd door het Playwright-report-artifact te downloaden en de a11y-snapshot van het faalmoment te lezen. Gate nu groen (e2e + check success). Les vastgelegd in `gotchas.md`.

- Task: -
- ADR: -
- Spec: `gotchas.md` (2026-07-07)
- Commit: `16ba8107` (#93)

### 369. Credit-model billing — ledger + metering-scaffolding (Fase 0-2, billing OFF)

Prepaid credit-model per ADR `2026-07-07-pricing-credits-launch` (laag maandtarief + tokenbundel + output-only overage; merkcontext en F-VAL nooit gemeterd; iDEAL/SEPA + BTW; 28-daagse gratis tier). **Fase 0** — datamodel + config: `CreditBalance`/`CreditTransaction`/`CreditReservation` (+ enums), `PlanTier` +STARTER/GROWTH (PRO legacy behouden, additief schema), `plan-limits.ts` (Starter €39/400cr · Growth €89/1.200cr · Agency €299/4.000cr · floor €15 · top-up €0,10 · trial 300/28d), credit-kosten-registry. **Fase 1** — ledger-core: atomaire `deduct`/`grant`/`reserve`/`reconcile`/`release` + reaper, concurrency-veilig via conditionele `UPDATE … WHERE … RETURNING`, idempotent via `idempotencyKey`. **Fase 2** — metering-wiring (tracking-only, post-hoc `chargeAfter`): SEO long-form, content-agents, en alle primaire beeld/video/content-routes (`generate-visual`/`-trained`/`-feature-visuals`/`-video`, `personas/generate-image`, `landing-pages/generate-page`) met per-route pad-guards zodat alleen echte generatie boekt; compose/upload-routes bewust niet (dubbel-charge). Alles achter `isBillingEnabled()` → **billing staat OFF** (`NEXT_PUBLIC_BILLING_ENABLED=false`), dus dormant scaffolding zonder runtime-impact. Adversariële T-review (2 rondes): 2 CRITICAL gefixt (C1 agent-billable-gating, C2 reservering-TOCTOU) + hardening. Verificatie: tsc 0, lint 0, ledger-concurrency-smoke 8/8, deploy-smoke groen (Vercel + check). **Fase-3-gates vóór billing-ON**: `enforceCreditBalance`-wiring, credit-grants (trial/plan/topup), confirm-time charge, reaper-cron, en een **Neon `db push`** voor het schema-delta — gedocumenteerd in de task-file.

- Task: [tasks/pricing-credits-billing.md](../tasks/pricing-credits-billing.md)
- ADR: [docs/adr/2026-07-07-pricing-credits-launch.md](adr/2026-07-07-pricing-credits-launch.md)
- Commit: `e7ff8542` (#92)

### 368. Merk-DNA-migratie-tooling voor pilot-onboarding (Better Brands)

Scripts om **alleen het merk-fundament** van één workspace (brand assets, voice+centroid, brandstyle, personas, producten, concurrenten, trends, `FidelityConfig` STRICT, brand rules — ~18 modellen) van lokaal naar productie te migreren en te re-parenten in een vers-aangemeld prod-account (content/telemetrie-historie blijft lokaal). `scripts/migrate-brand-dna/`: `export` (lokaal → inspecteerbare JSON-bundle incl. pgvector via raw SQL), `upload-images` (lokale `/uploads/` → R2 + URL-rewrite, `R2_PUBLIC_URL` verplicht), `import` (één atomische transactie: fresh-workspace-guard over álle wipe-modellen, wipe+insert met `workspaceId`- en user-FK-remap, `Product.slug`-collision-resolver, `--confirm-host`-gate tegen wrong-DB-wipes, pgvector-restore). Bonus-fixes: `create-vector-indexes.ts` dekt nu alle 4 vector-kolommen (miste `CompetitorContentItem`); de foute Fase-8 pg_dump-snippet in de deployment-runbook gecorrigeerd. Geverifieerd via cross-DB round-trip (schema-kloon → export → import → 12/12 asserts groen, incl. confirm-host-gate, collision-resolver, centroid-restore 1536-dim, en +11 eerder stil-gedropte research-methods). Twee 2-subagent reviewrondes: ronde 1 → 1 CRITICAL + 5 WARNING; ronde 2 → 1 CRITICAL (`assertFresh` te smal) + 4 WARNING; alles gefixt. Prod-run + onboarding-mens-stappen resteren (task blijft `in-progress`).

- Task: [tasks/pilot-onboarding-better-brands.md](../tasks/pilot-onboarding-better-brands.md)
- ADR: -
- Spec: [scripts/migrate-brand-dna/README.md](../scripts/migrate-brand-dna/README.md)
- Commit: 368f2416

### 367. Content-items test-coverage Ronde 1 gefinaliseerd — pre-launch content-flow bugvrij (Ronde 2 gated)

Afronding van `content-items-test-coverage`: Ronde 1 was al compleet en gemerged op `main` (playbook `testplan-content-items.md` via `23e0c0e5`/#67, ebook-fix-bundel `fe95fef9`). 24/24 zichtbare content-types handmatig door de 6-staps flow (Setup → Knowledge → Strategy → Concept → Content → Canvas) getest op Napking: **23 passed, 1 bug (ebook) — inmiddels gefixt**, 0 nieuwe bugs. Representanten 4/8 via picker + 4/8 hidden-skip (categorieën bewust uit de Add-Content-picker); varianten 16/16 passed met vooraf hard-geverifieerde reachability. Picker-realiteit vastgelegd: 31 van 55 code-type-definities zijn hidden, 24 zichtbaar — de oude 53-type-matrix is achterhaald. Geen open P1/P2; 3 structuur-leen-observaties (product-page/social-ad/linkedin-article lenen component-structuur) doorgeschoven als post-launch content-kwaliteit-nit. **Ronde 2 (generator-evaluatie) expliciet deferred** — gated op asset-generator-integratie. Lichte finalize (status/doc, geen code-diff → geen 2-subagent review). Task → `tasks/done/`.

- Task: [tasks/done/content-items-test-coverage.md](../tasks/done/content-items-test-coverage.md)
- ADR: -
- Spec: [docs/playbooks/testplan-content-items.md](playbooks/testplan-content-items.md)
- Commits: `23e0c0e5` (Ronde 1 compleet, #67), `fe95fef9` (ebook-fix-bundel)

### 366. Stripe billing — LIVE op productie (go-live)

`stripe-billing-live` is volledig live gegaan op productie (`branddock-7y9n.vercel.app`). Bovenop de hardening (#79 — dode change-plan-exploit weg, one-time-purchase-completion, invoice/yearly-bug, env fail-fast) landden twee checkout-redirect-404-fixes (#85 checkout-success/cancel, #86 portal-return — de hybride SPA heeft geen URL-adresseerbare pagina's, dus redirect naar `/?checkout=…` + `App.tsx` opent de billing-tab) en een billing-styling-pass (#88 — PAID-badge groen [case-bug `PAID`≠`paid`], "Pro Pro"-redundantie weg, payment-copy naar "beheer via Stripe"). Go-live op het betterbrands.nl Stripe-account: 3 live-producten (PRO €29 / AGENCY €99 / ENTERPRISE €249), live-webhook (`we_…`, 9 events, enabled) op de Vercel-URL, Customer Portal (cancel at_period_end), en de live-vars + `NEXT_PUBLIC_BILLING_ENABLED=true` via een geïmporteerd `.env` in Vercel. End-to-end geverifieerd in test-mode (checkout→PRO, cancel→FREE) + live bevestigd. **Beide harde launch-blockers (Vercel + Stripe) zijn nu weg**; kritieke pad naar de eerste pilot = `pilot-onboarding-better-brands`.

- Task: [tasks/stripe-billing-live.md](../tasks/stripe-billing-live.md) — done (LIVE)
- PR's: #79 (hardening) · #85/#86 (redirect-fixes) · #88 (styling) · go-live via Stripe-API + Vercel-env
- Playbook: [docs/playbooks/stripe-go-live.md](playbooks/stripe-go-live.md)

### 365. Agents content sources — bronnen kiezen per agent-run (Brand-Assistant-pariteit)

Elke agent-use-case heeft nu een inklapbare "Content sources"-kiezer (zelfde modulelijst en labels als de Brand Assistant). Zonder selectie draait de run ongewijzigd op de volledige merkcontext; met selectie bevat de system-prompt alleen de gekozen bronnen (zelfde module-fetches als de Claw-overlay, incl. expliciete notitie wanneer het merkfundament is uitgesloten). Server-side gevalideerd en gefilterd; deselect-all wordt in de UI geblokkeerd. Deterministisch bewezen (prompt 20,9k → 7,7k bij personas-only).

- Task: [tasks/done/agents-context-sources.md](../tasks/done/agents-context-sources.md)
- ADR: [docs/adr/2026-07-05-agents-architectuur.md](adr/2026-07-05-agents-architectuur.md)
- Spec: -
- Commit: 22d84b9f (branch feat/agents-research-parity)

### 364. Agents research-parity — Nova op volle Library-diepte + motor-degradatie

Nova's deep research draait zonder config-override op exact de Library-defaults (6 queries/12 bronnen/verificatie/480s) — identieke prompts én identiek budget. De gedeelde research-motor degradeert nu netjes binnen zijn budget (leesfase stopt met partial, verify skipt bij krap restbudget, een gestárte synthese wordt nooit meer door de deadline weggegooid) en het agent-pad kreeg een server-afgedwongen once-per-run-guard (het model retryde een 8-min-onderzoek na een deadline-fout: 2×480s → guard-fail). Zware topics kunnen het gedeelde budget nog raken — de agent levert dan een eerlijk partial antwoord met advies.

- Task: [tasks/done/agents-research-parity.md](../tasks/done/agents-research-parity.md)
- ADR: [docs/adr/2026-07-05-agents-architectuur.md](adr/2026-07-05-agents-architectuur.md)
- Spec: -
- Commit: 22d84b9f (branch feat/agents-research-parity)

### 363. Agents domein-integraties — nav onder CREATE, antwoord-fallback, Marco→Competitors, Stella→Campaigns

Dogfood-feedback verwerkt: Agents staat als navigatie-item onder CREATE; een run die alleen tekst oplevert toont dat antwoord voortaan als REPORT-artefact (de "no parseable artifacts"-melding is structureel weg, incl. robuuste JSON-husk-strip); geaccepteerde concurrentie-analyses van Marco verschijnen als "Agent analyses"-sectie op de Competitors-pagina (canonieke category "Competitor Analysis" + nieuwe GET /api/knowledge/[id]); Stella's goedgekeurde campagne-strategie landt op campaign.strategicApproach en rendert als "Agent-strategie"-blok op de campagne-detail strategie-tab (wizard-blueprint blijft leidend); Milo kan zelf een campagne voorstellen. Review: 3 rondes, 0 CRITICAL, 8 WARNINGs gefixt.

- Task: [tasks/done/agents-domain-integraties.md](../tasks/done/agents-domain-integraties.md)
- ADR: [docs/adr/2026-07-05-agents-architectuur.md](adr/2026-07-05-agents-architectuur.md)
- Spec: -
- Commit: b1986bac (branch feat/agents-domain-integraties)

### 362. Agents Data Analyst — curated query-tools + server-owned TABLE-artefacten

Zesde persona-agent "Dana" (BarChart3) met 7 curated read-only query-tools (content-productie/maand, inventaris type×status, F-VAL-trend, persona/product-dekking, campagne-overzicht, competitor-activiteit, agent-run-kosten): vaste workspace-gescoped Prisma-queries met geclampte parametervlakken — het model kan geen cijfers verzinnen of vrije queries bouwen. Tabellen worden server-owned via de run-collector als TABLE-artefact geregistreerd (strikte parser + REPORT-fallback), gerenderd door een sorteerbare TableArtifactView en bij accept gematerialiseerd als markdown-tabel in de Knowledge Library. Review: 2 rondes, 0 CRITICAL, 4 WARNINGs gefixt; live smoke met psql-geverifieerde cijfers; eigen 22-assert smoke-script. Hiermee is Agents Fase 1 compleet (6 agents).

- Task: [tasks/done/agents-data-analyst.md](../tasks/done/agents-data-analyst.md)
- ADR: [docs/adr/2026-07-05-agents-architectuur.md](adr/2026-07-05-agents-architectuur.md)
- Spec: -
- Commit: 15b27152 (branch feat/agents-data-analyst)

### 361. Agents UI — catalogus + agent-detail + results-inbox + Claw agent-scoping

Agents-sectie in de SPA: catalogus met 5 persona-kaarten, agent-detailpagina met use-case-runner en run-historie, results-inbox met ArtifactViewer (REPORT/FINDINGS/LINK/PROPOSAL) en ProposalConfirmCard (approve/reject via de confirm-route, server-truth + 409-afhandeling). Claw-overlay kreeg optionele agent-scoping (persona in system-prompt; default-pad byte-identiek). i18n en/nl, stale-RUNNING-heuristiek, deep-links naar domein-pagina's. Review: 3 rondes, 0 CRITICAL, 6 WARNINGs gefixt (o.a. tab-in-scheme-XSS-bypass, stream-abort bij scope-wissel); e2e 5/5 + 13/13 browser-smoke.

- Task: [tasks/done/agents-ui-inbox.md](../tasks/done/agents-ui-inbox.md)
- ADR: [docs/adr/2026-07-05-agents-architectuur.md](adr/2026-07-05-agents-architectuur.md)
- Spec: -
- Commit: 2dcece5d (branch feat/agents-ui-inbox)

### 360. Agents motor-wiring — 5 persona-agents op bestaande motoren + propose-only confirm

Nova (Research Analyst), Vera (Brand Guardian), Stella (Strategist), Milo (Content Creator) en Marco (Market Analyst) draaien live op de bestaande motoren via een Claw→orchestrator tool-bridge: reads direct (mechanisch gefenced), writes propose-only (run-collector → PROPOSAL → AWAITING_CONFIRMATION → confirm-route met member+-gate, atomic claim, schema-hervalidatie en self-heal). Deep research schrijft direct door naar de Knowledge Library (source AGENT); Content-Creator-confirm draait de volledige generatie-pipeline incl. F-VAL (93 live gemeten). Review: 4 rondes, 3 CRITICAL (o.a. geforgede PROPOSal-artefacten → REPORT/LINK-whitelist) + 12 WARNINGs gefixt; alle 5 agents live gesmoked (~$1,20).

- Task: [tasks/done/agents-motor-wiring.md](../tasks/done/agents-motor-wiring.md)
- ADR: [docs/adr/2026-07-05-agents-architectuur.md](adr/2026-07-05-agents-architectuur.md)
- Spec: -
- Commit: 96b49fbc (branch feat/agents-motor-wiring)

### 359. Agents foundation — pluggable output-contract + AgentRun/AgentArtifact + registry + run-API

Eerste bouwtaak van het 🤖 Agents-initiatief (ADR `2026-07-05-agents-architectuur`). De Brandclaw agent-loop (`runAgentLoop`) is gegeneraliseerd naar een **pluggable output-contract**: de turn-loop is verbatim geëxtraheerd naar `runLoopCore`, het bestaande observations-pad werd de eerste adapter (`observations-adapter.ts`) en nieuwe agents draaien via `runAgentWithContract` — **aanname A1 bewezen zonder Strategy-Analyst-regressie** (baseline `7cb56c12` vs post-refactor `0e94e26d`, beide 17/17, structureel identieke DB-rijen). Nieuw: `AgentRun`/`AgentArtifact`-schema (additief, incl. `ResourceSource.AGENT`), code-based agent-registry (`src/lib/agents/registry/` — `AgentDefinition`, artifact-contract met atomaire finalize, run-entry met `resolveFeatureModel` + `assertProvider`), 6 `AiFeatureKey`s + Settings-categorie "Agents", 4 API-routes (`POST /api/agents/run` met Zod + 32KB-byte-cap + maxDuration 800, runs-list/-detail met caching, artifact accept/dismiss) en **accept-materialisatie naar de Knowledge Library** (domain-first write-through: first-accept-gated, advisory-locked tegen races, dead-id-zelfherstel, dismiss archiveert / re-accept de-archiveert). Cost-instrumentatie + PostHog-events (`agent_run_started/completed`, `agent_output_accepted`) vanaf dag 1 — ook op FAILED-runs via `OutputContractError`. Tevens **Brandclaw-reconciliatie**: `strategy-analyst-stub` → done (Phase C herbestemd met mapping-tabel), LATER-Brandclaw-tabel geabsorbeerd door het Fase-3-epic.

Review-loop: 5 rondes / 10 reviewers, 0 CRITICAL, 22 WARNINGs alle gefixt + geverifieerd (details in task-Notes). ⚠️ Rollout: handmatige Neon `prisma db push` vóór deploy-verkeer.

- Task: [tasks/done/agents-foundation.md](../tasks/done/agents-foundation.md)
- ADR: [adr/2026-07-05-agents-architectuur.md](adr/2026-07-05-agents-architectuur.md) (+ aanvullingen 2026-07-06)
- Spec: [reports/agents-diepte-analyse-en-plan-2026-07-05.md](reports/agents-diepte-analyse-en-plan-2026-07-05.md)
- Commit: (deze commit — branch `feat/agents-foundation`)

### 358. Stripe billing — live-correctness hardening

Een audit toonde dat de Stripe-subscription-lifecycle al code-compleet + gewired was (checkout → webhook met HMAC + idempotency → DB-sync → `planTier` → enforcement, customer-portal, invoice-sync, live `BillingTab`) — de stale task-file (2026-05-07) beschreef een from-scratch-bouw die er niet meer was. Deze werkstroom dichtte de resterende **code-bugs + revenue-gaten** zodat de bestaande billing live-correct is:

- **S1 (revenue/security)**: verwijderd de dode DB-only `change-plan`/`cancel`-routes + orphaned `BillingSettingsPage` (0 imports) die een subscription op `ACTIVE` zetten **zónder betaling** (gratis-upgrade-exploit) — plan-wijzigingen lopen uitsluitend via Stripe Checkout/Portal. En de one-time-aankopen gewired: nieuwe `payment_intent.succeeded`-webhook-case → `handlePurchaseSuccess` (had geen caller) → `BundlePurchase` PAID + unlock (anders: kaart charget, unlock nooit).
- **S2 (customer-facing bugs)**: factuur-`/100`-dubbeldeling weg (€29 toonde als €0.29); yearly-checkout charget niet langer de maandprijs — `getPriceIdForTier(tier, cycle)` + `STRIPE_PRICE_*_YEARLY`, met fail-safe (400 als de yearly-price ontbreekt i.p.v. stil de maandprijs).
- **S3 (launch-safety)**: AI-usage-meter toont echte data (`getUsageThisMonth`) i.p.v. hardcoded `142`; env-validatie fail-fast wanneer `NEXT_PUBLIC_BILLING_ENABLED=true` maar keys/prices ontbreken.
- **S4**: [`docs/playbooks/stripe-go-live.md`](playbooks/stripe-go-live.md) — de human Stripe-dashboard-stappen (account/products/prices/keys/webhook-events/portal/`BILLING_ENABLED`).

Launch-pricing = vaste maandprijs → metered-overage/usage-metering/trial + PaymentMethod-sync blijven per-token-fase (uit scope). Gates per stap: tsc 0 / lint 0. Gewerkt in worktree `branddock-launch` (branch `feat/stripe-billing-hardening`).

- Task: [tasks/stripe-billing-live.md](../tasks/stripe-billing-live.md) (code-portie done; dashboard-config = human, zie playbook)
- Commit: branch `feat/stripe-billing-hardening` (S1-S4)

### 357. vercel-deployment — LIVE op Vercel + serverless-hardening geconsolideerd (Track C)

De **hard launch-blocker is opgelost**: de app draait live op Vercel (`branddock-7y9n.vercel.app` · Pro + Fluid Compute · fra1), production-branch `main`. Geverifieerd: signup/auth (Better Auth) + Neon Postgres (pgvector + 3 HNSW-indexen) + AI (3 providers) + Cloudflare R2 uploads. De verkenning weerlegde "pure infra, 3 dagen": onder de infra zat een serverless-compatibiliteitslaag die kern-flows brak op Vercel. Geleverd (PR #76, merge `5e642ded`, bovenop i18n Fase 1-3):

- **Serverless-hardening (Fase 2)**: A2 — 3 upload-routes + media-fetch/logo-overlay via `getStorageProvider()` (R2 in prod, fail-closed); A4 — brandstyle/LP-screenshots via in-process `@sparticuz/chromium` + `playwright-core` i.p.v. tsx-child-process/`import('playwright')`; A1 — fire-and-forget onboarding-pipelines naar de `AgentJob`-queue (11 routes: brandstyle url+pdf, DAM auto-tag, bug-reports, chat-feedback, alignment-scan, trend-research); A3 — expliciete `maxDuration` op SSE/streaming-routes; A5 — cache bewust per-instance gedocumenteerd.
- **Deploy-config-fixes (Fase 1)**: `prisma generate && next build` (Vercel-buildfix), playwright-core dedupe (1.60.0 override), R2 env-naam-unificatie (`R2_BUCKET_NAME`/`R2_PUBLIC_URL`), Node-22-pin, Better Auth `trustedOrigins`.
- **Fase 3 Neon**: pooltuning (`pg.Pool` max serverless-cap) + `scripts/prod/create-vector-indexes.ts` (HNSW cosine op 3 vector-kolommen) + `prisma db push`.
- **Fase 4 CI/CD**: e2e critical-flow job + branch-protection op `main` (required `check`).

**Resterende follow-ups (op main, niet-blokkerend)**: A1 Tier 3 (website-scanner + brandvoice: in-memory Map → DB-progress, `tasks/serverless-hardening-jobs.md`), A3-deel-2 (SEO 8-staps-pipeline decompose), custom domein (nu `.vercel.app`), Stripe billing, marketing-site, pilot-onboarding. De e2e-CI-job is flaky + niet-verplicht (ving wél een echte i18n-gap: onboarding-skip-knop toont rúw `onboarding.skipTour`).

**Gotcha vastgelegd**: het prod-Neon-schema wordt via `prisma db push` beheerd, NIET door de Vercel-build — na elke schema-wijziging handmatig db-pushen naar Neon (anders 500't de deployed code op een onbekende enum/kolom).

- Task: [tasks/vercel-deployment.md](../tasks/vercel-deployment.md) + [tasks/serverless-hardening-jobs.md](../tasks/serverless-hardening-jobs.md)
- Plan: `snug-popping-tulip.md`
- Commit: PR #76 (`5e642ded`) — merge van `track/launch` (13 commits) in `main`

### 356. Meertaligheid Fase 1-3 — launch-ready afgerond (docs + status)

Afronding van het meertaligheid-programma tot een **launch-ready** staat, zodat `vercel-deployment` niet langer op i18n wacht. Fase 1-3 (`i18n-ui-foundation` + `content-locale-foundation` + `content-locale-target-picker`) zijn alle **done + gemerged op `main`** (#65/#68/#70/#71/#73/#74): en↔nl is live door de hele app en de twee-selector-visie (Display-language per gebruiker + Content-/Output-language per workspace/generatie) is compleet. Volledige gate-suite groen op main (tsc 0 / lint 0 / separation 3/3 / content-locale-foundation-smoke 46/46 / target-picker-smoke 8/8 / build). Deze commit: `i18n-ui-foundation` → done, roadmap §🌍 + START_HERE bijgewerkt naar launch-ready, alle open items expliciet **post-launch** geparkeerd.

**Post-launch (niet-blokkerend)**: `i18n-ai-translation-pipeline` (automatische AI-vertaal-engine voor onderhoud + de/es/fr — nu is en/nl geseed door de extractie-waves), de deferred Fase-3-follow-ups (F-VAL scoort nog tegen de workspace-default-pack i.p.v. de target-pack + de campagne-bulk-generatie-UI-picker), en Fase 4-5 (`multi-market-transcreation-enterprise`). Bewust Engels gelaten: puck-config (SSR-safe), canvas-previews, PDF-export, dode/demo-code.

- Task: [tasks/i18n-ui-foundation.md](../tasks/i18n-ui-foundation.md) (+ content-locale-foundation/target-picker → done)
- ADR: [adr/2026-06-28-multilingual-i18n-and-multi-market-content.md](adr/2026-06-28-multilingual-i18n-and-multi-market-content.md)
- Commit: (deze docs-commit)

### 355. Content-locale Fase 2 — per-generatie target-locale picker (direct bruikbaar)

Vervolg op #354: een operator kan nu **één deliverable in een gekozen taal laten genereren**. De Canvas-generatie-UI (Step1Context) heeft een **Output-language-picker** (default = workspace-standaard) die de geshipte talen biedt; kies je een taal zonder profiel → server-side **find-or-create** een niet-default `BrandLocaleProfile` (`resolveTargetProfile`, idempotent op `@@unique([workspaceId, locale])`). `targetLanguage` threadt door de bestaande pipeline (`orchestrate`/`bulk-generate` zod → `orchestrateContentGeneration` options → `assembleCanvasContext(…, localeProfileId)` → `getBrandContext(ws, profileId)`) en wordt gepersisteerd op `Deliverable.localeProfileId` (her-genereren behoudt de taal). **Default-pad ongewijzigd** (geen keuze → default-profiel-loos pad, byte-identiek). Daarnaast volgen de **4 analyze-routes** (products url/pdf, competitors url/refresh) nu de workspace-content-taal (`getContentOutputLanguage`) i.p.v. de browser-`Accept-Language` van de operator — **bewuste gedragswijziging** (UI-taal-lek gedicht). Client-safe `shipped-languages.ts` (geen prisma) als gedeelde talenlijst. Smoke `content-locale-target-picker.ts` 8/8. Gates per fase: tsc 0 / lint 0 / separation 3/3 / build.

**Follow-ups** (bewust uitgesteld): F-VAL scoort nog tegen de workspace-default heuristics-pack i.p.v. de target-pack (de threading zit tangled buiten het hoofd-`runFidelityScoring`-pad — de content genereert al correct in de doeltaal, alleen de score-pack verschilt); een taal-picker in de campagne-bulk-generatie-UI (de `bulkGenerateSSE`-plumbing accepteert al `targetLanguage`).

- Task: [tasks/content-locale-target-picker.md](../tasks/content-locale-target-picker.md)
- ADR: [adr/2026-06-28-multilingual-i18n-and-multi-market-content.md](adr/2026-06-28-multilingual-i18n-and-multi-market-content.md) (analyze-route-gedragswijziging genoteerd)
- Commit: 8dc13164 (P1+P2) · 548bd3ca (P4) · 69f848b7 (P5) · (P6 deze commit)

### 354. Content-locale foundation — content-taal-selector + multi-markt-datamodel (Approach C)

De tweede taal-as van het meertaligheid-programma: de **content-taal** (waarin de AI schrijft, per workspace), naast de al gelande UI-taal-as. Niet-brekend + forward-compatible multi-markt-fundament (ADR 2026-06-28). **Fase A+C**: additief schema — `Brand` (1:1 workspace) + `BrandLocaleProfile` (`@@unique([workspaceId, locale])`, gereserveerde JSON-deltas), nullable `localeProfileId` op `Deliverable`/`Persona`, `LandingPage` +`locale`+`localeProfileId` met unique-flip `[workspaceId,slug]` → `[workspaceId,locale,slug]` (compound-key-code in `publish-page.ts`/`p/[slug]`); backfill-script (17 workspaces → 17 default-profielen, 0 orphans) + seed-update. **Fase B**: `getBrandContext(workspaceId, localeProfileId?)` + cache-key `${workspaceId}:${localeProfileId ?? 'default'}` + `invalidateBrandContext` wist alle varianten; `resolveLocaleForBrand(workspaceId, requestedLocale?)`. Default-pad **byte-identiek** (geverifieerd tegen 17-workspace baseline); alleen een expliciet gekozen profiel (Fase 2) wint. **Fase D**: live Content-language-control in WorkspacesTab (per-workspace + create-form, onderscheiden van de Display-language), POST maakt Brand+profiel, PATCH synct profiel + mirror + invalideert de brand-context-cache (fixt een bestaande stale-cache-bug). Elke fase gate-groen (tsc 0 / lint 0 / separation 3/3 / build). Smoke `content-locale-foundation.ts` 46/46.

- Task: [tasks/content-locale-foundation.md](../tasks/content-locale-foundation.md)
- ADR: [adr/2026-06-28-multilingual-i18n-and-multi-market-content.md](adr/2026-06-28-multilingual-i18n-and-multi-market-content.md)
- Spec: -
- Commit: 1b8fc776 (A+C) · 787c39e0 (B) · 67fb8b71 (D) · (E deze commit)
- Vervolg: `content-locale-target-picker` (per-generatie target-locale + analyze-route-lekken, Fase 2)

### 353. Meertaligheid remediation — data-gedreven registries + gemiste clusters (5 waves)

Na #352 bleek bij het switchen naar nl nog veel Engels. Een multi-agent audit vond twee structurele oorzaken die de JSXText-extractie van #352 niet kón raken: **(A) data-gedreven constant-registries** (namen/titels uit `src/*/lib/*` + `src/lib/` + `src/config/`, gerenderd via `{item.name}`) en **(B) gemiste `src/components/*`-clusters** (de extractie-waves liepen op `src/features/*`). Opgelost met het **render-edge-patroon** (constant blijft en-bron + stabiele key; render via `t('ns:key', { defaultValue })`) + migratie van de gemiste clusters, in 5 waves:
- **Wave 1** — campagne-generator-registries: stepper (`wizard-steps`), campagnedoelen (`goal-types`), pipeline-config, `content-type-inputs` (726 keys), deliverable/content-item-namen.
- **Wave 2** — hele Brand Foundation-pagina (`src/components/brand-foundation` + `brand-assets` + `asset-content`) + `canonical-brand-assets` op stabiele slug (vertaalde namen vloeien nooit naar de DB terug).
- **Wave 3** — gedeelde AI-exploration-chat (dekt brand-asset + persona) + 17 merk-DNA-registry-groepen (234 keys).
- **Wave 4** — resterende live-pagina's (StrategicResearchPlanner, TeamManagement, ResearchDashboard, NewStrategyPage, ResearchValidationPage) + shared/lock/billing/versioning/impact-primitieven + brandstyle review-sections + auth-chrome.
- **Wave 5** — long-tail-registries met **liveness-verificatie** vooraf: products/media/consistent-models/trends-personas/claw-content render-edged (~328 keys); research-bundles/strategy-tools/business-strategy correct geskipt (DB-backed/dood/enum).

Bewust Engels (geverifieerd, geen bug): AI-gegenereerde/user-editable merk-content, AI-prompt-strings, enum/icon/Tailwind-class/MIME-identifiers, `.toFixed`-bedragen, dode/demo-code, PDF-export (aparte track). Runtime browser-smoke: cookie `branddock-ui-locale=nl` → loginscherm + `<html lang>` volledig Nederlands. Elke wave per-commit gate-groen (tsc 0 / lint 0 / separation-smoke 3/3 / build groen).

- Task: [tasks/i18n-ui-foundation.md](../tasks/i18n-ui-foundation.md)
- ADR: [adr/2026-06-28-multilingual-i18n-and-multi-market-content.md](adr/2026-06-28-multilingual-i18n-and-multi-market-content.md)
- Spec: -
- PR: #70 (waves 1-4, gemerged) + Wave 5 (`feat/i18n-wave5-longtail`)
- Commit: 4fd49c44 + 9889d73b + 239ab790 + f082554e + 1259d798 (via #70) · 0cd3d4c4 (wave 5)

### 352. Meertaligheid Fase 1 follow-ups — chrome afgemaakt + feature-extractie (4 waves) + toLocale-sweep

Vervolg op #351: de UI is nu grotendeels meertalig (en↔nl). **Chrome afgemaakt**: `SIDEBAR_NAV` item/section-labels render-edge via `t()`, `AuthPage` → `common:auth`, en `src/lib/ui-i18n/format.ts` (`useFormat()` — `Intl` + date-fns gebonden aan `i18n.language`). **Runtime**: lazy feature-namespaces via `i18next-resources-to-backend` (chrome blijft statisch). **Feature-extractie in 4 AI-gedreven Workflow-waves** (~35 namespaces; de extractie-agents genereerden en+nl direct): dashboard, campaigns (canvas/wizard/content-library/overview/core + canvas-medium/accordion/page), brandstyle, brand-asset-detail, media-library, business-strategy, competitors, personas, products, trend-radar, settings (account/team/billing/admin/misc), consistent-models, workshop, research, help, knowledge-library, claw, brandvoice, interviews, brand-alignment, website-scanner, commercial, white-label. Tot slot een **toLocale-sweep** (~130 datum/getal-sites → `useFormat`). Elke wave per-commit gate-groen (tsc 0 / lint 0 / separation-smoke 3/3 / build groen).

Bewust Engels gelaten (gedocumenteerd, geen bug): `puck-config.tsx` (server-safe, `useTranslation` zou de `/p/[slug]`-SSR breken — de renderToStaticMarkup-gotcha), `canvas/previews/*` (social-platform mock-chrome, ambigu), losse top-level `src/components/*.tsx`, `ai-studio`/`ai-trainer`-shells, `.ts` lib/services-formattering + `.toFixed`-bedragen. De ESLint-guard-allowlist is bewust niet verbreed (migrated files houden opzettelijk-gelaten enum/data-strings; verbreden zou false-positives geven).

- Task: [tasks/i18n-ui-foundation.md](../tasks/i18n-ui-foundation.md) (in-progress — follow-ups)
- ADR: [adr/2026-06-28-multilingual-i18n-and-multi-market-content.md](adr/2026-06-28-multilingual-i18n-and-multi-market-content.md)
- Spec: -
- Commit: 96938871 + 23e5ad38 + 9b6ced14 + 81420d63 + 2c944ca3 + a4491867 + 34cf8111

## 2026-06

### 351. Meertaligheid Fase 1 — i18next UI-runtime + Display-language selector (per gebruiker)

Eerste increment van het meertaligheid-programma (ADR 2026-06-28): een client-side **i18next**-runtime voor de UI-taal die de gebruiker *leest*, strikt gescheiden van de content-locale (de taal waarin de AI *schrijft*). De provider wordt in `layout.tsx` gemount — de server leest de `branddock-ui-locale`-cookie via `next/headers cookies()` en geeft `initialLocale` door aan een client-`I18nProvider` (één instance per request via `useState`-lazy-init, geen singleton-bleed), zodat `<html lang>` en de eerste paint geen hydration-flash geven. Een nieuwe **Display-language**-selector (`AppearanceTab`, vervangt de "coming soon"-placeholder) schrijft de bestaande per-user `AppearancePreference.language` + cookie + `i18n.changeLanguage`; `LocaleReconciler` reconcilieert na login naar de DB-pref. App-chrome live vertaald (en↔nl): de 9 settings-tab-labels, TopNav (Quick Content / Brand Assistant / Search / Notifications) en de sidebar (Settings / Help & Support). Getypeerde keys (`react-i18next.d.ts`, geen `any`), zod `/api/settings/appearance` verstrakt naar `z.enum(SHIPPED_LOCALES)` + read-time-normalisatie, en de verweesde `AppearanceSettingsPage.tsx` verwijderd. Een **scoped ESLint-guard** verbiedt nieuwe hardcoded strings in gemigreerde files (allowlist die meegroeit), en een separation-smoke bewijst dat `src/lib/ai/**` de UI-locale-laag nooit aanraakt.

**Finalize review-loop** — 2 ronden 2-subagent parallel review: ronde 1 → 0 CRITICAL, 3 WARNING gefixt (React 19 ref-during-render → `useState`-lazy-init; enum-divergentie → dode orphan verwijderd; loading-state); ronde 2 → 0 CRITICAL, 1 WARNING gefixt (read-time-locale-normalisatie in de GET-route). MINORs (tKey-union-typing, query-error-state, doneRef cross-user-edge) gedocumenteerd als follow-up.

**Quality gates**: tsc 0 errors, lint 0 errors (incl. de nieuwe guard, bewezen via probe), separation-smoke 3/3, build groen.

**Bewust uitgesteld** (increment 1 van een meervoudige task): de data-driven `SIDEBAR_NAV`-labels, `AuthPage`, per-pagina `PageHeader`-titels, `format.ts` + de ~171 `toLocale*`-datum/getal-sites, de feature-namespace-extractie, en de automatische AI-vertaalpipeline (nl-chrome is hand-geseed om de live-switch te bewijzen).

- Task: [tasks/i18n-ui-foundation.md](../tasks/i18n-ui-foundation.md) (in-progress — increment 1)
- ADR: [adr/2026-06-28-multilingual-i18n-and-multi-market-content.md](adr/2026-06-28-multilingual-i18n-and-multi-market-content.md)
- Spec: -
- Commit: `6dff2424`

### 350. Security — SSRF-convergentie: laatste raw-fetch-paden → safeFetch + rate-limit + byte-cap

Restscope van H1 (na #349). Sluit élk resterend server-side fetch-pad dat nog op het oude patroon zat (`fetch` + post-hoc `assertSafeRedirect`, soms zonder entry-validatie). `fetchWithSizeLimit` (`security/fetch-with-limit.ts`, 16 AI-artifact-callers) loopt nu via `safeFetch`; daarnaast in code-review nog 3 raw-fetch-routes ontdekt en geconverteerd: `media/import-url` (entry-probe), `media/stock/import` (user-URL die **geen enkele** SSRF-validatie had) en `export/proxy-image` (allowlisted). Het dode `assertSafeRedirect` is verwijderd. `safeFetch` kreeg fetch-spec-conforme method-handling (303 + 301/302-op-non-GET → bodyless GET; 307/308 behoudt method+body). Drie ongelimiteerde scrape-routes (`website-scanner`/`claw/scrape`/`briefing-sources/parse-url`) kregen `checkGenericRateLimit` (429 + Retry-After). `products/url-scraper` leest de body nu via `readBodyWithCap` (10MB stream-cap, OOM-defense). Ge-finalized via 3-ronde 2-subagent review (eindoordeel ready-to-merge, 0 CRITICAL/0 WARNING; charset-"regressie" weerlegd als false-positive — `Response.text()` is spec-matig óók UTF-8-only). Smoke `ssrf-guard.ts` 65/65, tsc 0, lint 0, build groen (echte node_modules + prisma + env in de worktree). H1 is hiermee volledig afgehecht.

- Task: [tasks/security-residual-hardening.md](../tasks/security-residual-hardening.md) (SSRF-blok afgevinkt; L4/L6/L9 + Zod-sweep blijven open)
- ADR: -
- Spec: [docs/audits/2026-06-26-security-audit.md](audits/2026-06-26-security-audit.md)
- Commit: ba0ff9b5 (PR #64)

### 349. Security — SSRF: safeFetch per-hop redirect-revalidatie in alle scrapers (H1 punt 1)

Sluitstuk van H1 (na de kern-hardening in `6f0875e4`). De scrapers volgden redirects met `redirect:'follow'` + een post-hoc `assertSafeRedirect`: het redirect-*request* vuurde nog vóór validatie tegen de interne target (blind-SSRF-venster op de redirect-hop). Nieuwe `safeFetch()` in `ssrf.ts` forceert `redirect:'manual'` en revalideert élke hop met `assertSafeUrl` (scheme + DNS-resolve-en-verifieer) vóór de connectie, plus credential-header-stripping (Authorization/Cookie) zodra een redirect de origin verlaat. Gewired op alle 7 scraper-fetches (products/url-scraper x2, brandstyle/url-scraper HTML+CSS, logo-color-extractor, multi-page-scraper, competitors/fetch-policy, media/import-scraped-image); redundante pre/post-checks verwijderd. Ge-finalized via 2-subagent review (beide ready-to-merge; reviewer-WARNING over cross-origin credential-leak meteen meegnomen) in een geïsoleerde git-worktree, omdat een parallelle i18n-sessie de hoofd-working-tree bezet hield. Smoke `ssrf-guard.ts` 62/62 (+8 safeFetch-tests: redirect→IMDS geblokkeerd vóór connectie, public-redirect gevolgd, opaque fail-closed, loop-cap, credential-strip cross/same-origin), tsc 0, lint 0, build groen. Restscope (`fetch-with-limit.ts`-conversie, rate-limit/byte-cap, 307/308-body) → `security-residual-hardening`.

- Task: [tasks/done/security-h1-ssrf-guard.md](../tasks/done/security-h1-ssrf-guard.md)
- ADR: -
- Spec: [docs/audits/2026-06-26-security-audit.md](audits/2026-06-26-security-audit.md)
- Commit: <hash> (PR #TBD)

### 348. Security — MEDIUM/LOW-cluster: RBAC-gaten + prototype-pollution + crypto/header hardening

Sluitstuk van de pre-launch security-audit (na #345/#346/#347). **RBAC**: invite-routes valideren `role` tegen een enum en laten alléén een owner een `owner` inviten — beide live routes gepatcht (`/api/organization/invite` + de échte UI-route `/api/settings/team/invite`, die `role: z.string()` verbatim opsloeg → admin→owner-escalatie via de accept-route; gevonden in review-ronde 1). `/api/workspace/export` en Claw `confirm` achter `requireWorkspaceRole` (viewer kon de hele workspace + interviewee-PII exfiltreren, resp. muteren via de agent). **Prototype-pollution**: `deepSet` weigert `__proto__`/`constructor`/`prototype`-segmenten (raakt het LLM-gevoede `update_asset_framework`-pad). **Hardening**: CSP-header (`frame-ancestors`/`object-src`/`base-uri`/`form-action`) in `proxy.ts`, GCM `authTagLength` op beide `createDecipheriv`, en `timingSafeEqual` op het webhook-Bearer-secret. Ge-finalized via 2-ronde 2-subagent review-loop; ronde-2 "CRITICAL" (native Better Auth `invite-member`) bleek een geverifieerde false-positive (library-guard crud-invites.mjs:123 blokkeert admin→owner al). Smoke `security-medium.ts` 7/7, tsc 0, lint 0, build groen. Restscope (L4/L6/L9 + Zod-sweep) gedocumenteerd.

- Task: [tasks/done/security-medium-cluster.md](../tasks/done/security-medium-cluster.md)
- ADR: -
- Spec: [docs/audits/2026-06-26-security-audit.md](audits/2026-06-26-security-audit.md)
- Commit: eba365a1 (PR #61)

### 347. Security — billing-integriteit: server-side purchase-prijs + plan-entitlement (H3 + M5)

Opvolg op #345/#346. **H3**: de one-time-purchase-route leidde de prijs uit een client-`amount` af (→ €0,50 voor een €99-bundle, of `amount:0` voor een gratis tool-unlock). `createPaymentIntent` accepteert geen prijs meer; nieuwe `resolveItemPrice()` haalt 'm server-side uit `ResearchBundle.price` (catalogus) resp. `Workshop.totalPrice` (workspace-scoped); onbekend/cross-workspace/null → fail-closed reject. **M5**: plan-entitlement werd alleen in de UI afgedwongen (`enforceFeature` had 0 call-sites). Nieuwe `enforcePlanLimit(ws, feature)`-helper (402 bij over-limiet, no-op zolang `BILLING_ENABLED=false`) gewired op de 4 hoofd-create-routes (personas/products/campaigns/knowledge-resources). Ge-finalized via 2-subagent review-loop (0 CRITICAL/0 WARNING round 1); smoke `plan-enforcement.ts` 6/6, tsc 0, lint 0, build groen. Restscope (overige create-paden, org/usage-limieten, TOCTOU-hard-cap, dormant-route + live workshop/research-purchase-routes) gedocumenteerd vóór billing-livegang.

- Task: [tasks/done/security-h3-purchase-entitlement.md](../tasks/done/security-h3-purchase-entitlement.md)
- ADR: -
- Spec: [docs/audits/2026-06-26-security-audit.md](audits/2026-06-26-security-audit.md)
- Commit: e00d7238 (PR #60)

### 346. Security — Claw-context fencen tegen indirecte prompt-injectie (H7)

Opvolg op #345 (OWASP Top 10 for LLM). De Claw-agent (de component mét write-tools) kreeg untrusted content rauw in z'n prompt; nu wordt élk attacker-controllable kanaal door `fenceUntrustedContent()` gehaald: (1) system-prompt-context (attachments, scraped competitor, trends, knowledge), (2) message-kanaal-attachments (`buildClaudeMessages`), (3) hoog-risico tool-results (`UNTRUSTED_RESULT_TOOLS`: review_content/read_landing_page_content/read_competitors/read_trends/read_knowledge/review_competitor_activities). Plus system-prompt-clausules (untrusted_content + tool-results zijn data, nooit instructies; geen interne tool-namen/laag-labels/award-jargon in output) en `navigate_to_page.section` `z.string()`→`z.enum` (L5). De fence stript geneste tags + escapet het `source`-attribuut (attacker-controllable filename). Ge-finalized via 4-ronde 2-subagent review-loop (0 CRITICAL/0 WARNING); smoke `claw-fencing.ts` 11/11, tsc 0, lint 0, build groen. Write-`execute`-tenant-scoping (al solide) ongemoeid.

- Task: [tasks/done/security-h7-claw-context-fencing.md](../tasks/done/security-h7-claw-context-fencing.md)
- ADR: -
- Spec: [docs/audits/2026-06-26-security-audit.md](audits/2026-06-26-security-audit.md)
- Commit: 30779ecd (PR #59)

### 345. Security-audit pre-launch — dep-patches + remediatie HIGH-findings

OWASP-ASVS-L2-audit (Fase 0-2: dep-scan + git-history-secrets + SAST + 6 parallelle handmatige reviewers) gevolgd door remediatie van de chirurgische HIGH-findings, ge-finalized via de 2-subagent review-loop (3 rondes tot 0 CRITICAL/0 WARNING). `npm audit` 10 high → 0 (next 16.1.6→16.2.9 + better-auth/undici/axios/ws/form-data/hono). Code-fixes: H1 SSRF-guard volledig gehard (`isPrivateIp` incl. IPv4-mapped hex + NAT64 + IPv4-compatible, async DNS-resolve-en-verifieer in `assertSafeUrl`/`assertSafeRedirect`, alle scrapers ge-await'd + post-redirect-revalidatie + playwright navigatie-interceptie; smoke 54/54); H2 JSON-LD stored-XSS escape op `/p/[slug]`; H4/H5 billing-RBAC + IDOR via nieuwe `requireWorkspaceRole` (rol-check op de org van de geresolvede workspace); H6 3 ongeauth LP-AI-routes achter `withAi`; H8 strategy-child-IDOR-scoping (5 routes). Uitgesteld als task-files: H1-residu (rate-limits), H3 purchase-prijs/entitlement, H7 Claw-context-fencing, MEDIUM-cluster.

- Task: `tasks/security-h1-ssrf-guard.md` (+ h3/h7/medium-cluster) — multi-task
- ADR: -
- Spec: [docs/audits/2026-06-26-security-audit.md](audits/2026-06-26-security-audit.md)
- Commit: 3062a142 (PR #58)

### 344. Brandstyle kalibratie-paneel — geconsolideerde "wat heb ik nodig"-asks

Eén surface bovenaan de Brand Styleguide die verspreide extractie-kwaliteitssignalen bundelt tot actiegerichte asks met severity (critical/suggestion/review) en deep-links naar de juiste tab. Pure functie `buildBrandstyleCalibrationReport` (`src/lib/brandstyle/calibration-report.ts`, geen server-imports) detecteert: ontbrekend primair logo (critical), ontbrekende donker/licht-variant (suggestion), expliciet low-confidence kleuren (review), gedetecteerde fonts zonder laadbaar bestand (suggestion), lege type-scale (review) en AI-only RECOMMENDED-richtlijnen (review). Het `BrandstyleCalibrationPanel` berekent het rapport client-side uit de reeds-geladen styleguide (geen extra fetch/route) en is gegate op `status === "COMPLETE"`. Komt uit lesson L6 van de brandstyle ↔ design-system-builder-vergelijking. Bevat ook een Prisma-7.4-fix in de e2e `global-setup` (`db push --skip-generate` → `--accept-data-loss`) die de hele e2e-suite deblokkeert, plus een seed-kleur op `confidence: "low"` voor een deterministische Playwright-smoke. Verificatie: 2-ronde finalize-review clean (0 CRITICAL/WARNING), tsc 0, lint 0, Playwright-smoke groen (paneel rendert + deep-link schakelt naar Colors-tab).

- Task: [tasks/done/brandstyle-calibration-report.md](../tasks/done/brandstyle-calibration-report.md)
- ADR: -
- Spec: -
- Commit: `9c8eff75`

### 343. GEO stats citeren de echte knowledge-bron (i.p.v. genullde labels)

Vervolg op de stat-citatie-leak: na de sanitizer renderden GEO-stats label-only omdat het model de échte knowledge-bron niet citeerde. Live-harness toonde de bindende constraint: user-geselecteerde knowledge-resources defaulten naar `reference` (7000-char-cap), waardoor de referenties/URLs (achteraan een research-rapport) worden afgekapt en het model ze nooit ziet. Fix: nieuwe `geo-knowledge-context.ts` forceert de eerste ≤3 knowledge-resources (dedup, bron-type-bewust) op `primary` (16k-cap → volledige bron incl. URLs bereikt het model) en prepend een expliciet "## CITEERBARE BRONNEN"-blok (titel + url als schone citeer-handle). De `generate-structured-variant`-route gebruikt dit gated op `LONG_FORM_SEO_TYPES`; de GEO-prompt citeert `citeableStats[].source` uitsluitend uit die lijst (null voor first-party / geen match; geen fabricage; geen interne labels). Live-AI-harness op de Napking-pagina + Deep Research-rapport: additionalContextText 7k→16k incl. URLs, 1/4 citeableStats kreeg een echte bron + `sources[]` met een echte externe URL (superlinen.com); first-party "280+" bleef null. 5-ronde finalize-review clean (0 CRITICAL/WARNING); tsc 0, lint 0. Bekende grens: bronnen >16k kunnen body-URLs afkappen — de title/url-handle blijft dan de citeer-fallback.

- Task: [tasks/done/geo-citation-real-sources.md](../tasks/done/geo-citation-real-sources.md)
- ADR: -
- Spec: [docs/specs/2026-06-17-geo-seo-longform-plan.md](specs/2026-06-17-geo-seo-longform-plan.md)
- Commit: `cb765045`

### 342. LP/GEO render quick-wins — variant-picker, TL;DR-kop NL, heading-fontgroottes gelijkgetrokken

Drie kleine render-/UX-fixes uit de Napking-pagina-review. (1) **Variant-picker**: "Choose a different variant" was gegate op `> 1` en dus verborgen bij een partial generation (1 geleverde variant), waardoor de gebruiker vastzat in de "Variant chosen"-state; gate → `>= 1` (`LandingPageGenerateBlock`, commit `7b3e795b`). (2) **GEO long-form TL;DR-kop**: de hardcoded Engelse "TL;DR" → "Samenvatting", consistent met de overige NL-koppen ("Op een rij"/"Veelgestelde vragen"/"Bronnen") (commit `bd138b9d`). (3) **Heading-fontgroottes**: de RichText-`##`-sectiekop viel terug op een platte 26px terwijl de dedicated component-koppen (FAQ/Listicle/ComparisonTable) de archetype-schaal `heading.sizes[len-2]` (28-56px, preset-afhankelijk) gebruikten — bij fallback-token-merken (zoals Napking, PLAYFUL) gaf dat een zichtbaar groot verschil. De RichText-h2-fallback gebruikt nu dezelfde preset-bewuste expressie → identiek by construction; scraped-token-merken blijven byte-identiek (alleen het fallback-pad gelijkgetrokken). Verificatie: tsc/lint groen + expression-parity bevestigd (h2 == component-kop). Open follow-up: volledige locale-awareness van de section-labels (vereist locale-doorvoer naar de template).

- Task: [tasks/done/lp-variant-picker-single-option.md](../tasks/done/lp-variant-picker-single-option.md), [tasks/done/geo-longform-heading-render-polish.md](../tasks/done/geo-longform-heading-render-polish.md)
- ADR: -
- Spec: [docs/specs/2026-06-17-geo-seo-longform-plan.md](specs/2026-06-17-geo-seo-longform-plan.md)
- Commit: `19272398`

### 341. "Model offline"-melding wanneer genereren niet mogelijk is

Wanneer een AI-provider onbereikbaar is (503/overloaded, 429 rate-limit, 401/ontbrekende API-key, netwerk of timeout) en genereren daardoor onmogelijk is, toont de UI nu een onderscheidende "model offline"-melding (rood inline-blok met "Try again" + sonner-toast) i.p.v. een generieke fout. Eén gedeeld error-contract is additief toegevoegd aan `error-handler.ts` (`isModelUnavailable` + `buildAiErrorPayload`/`buildAiErrorResponseInit`/`buildAiErrorEvent`) en gepropageerd over de SSE-routes (orchestrate, bulk-generate, auto-iterate, persona-chat, seo-pipeline) én de non-SSE AI-routes; content-/validatie-gates (lege brief, woordtelling, truncation) blijven bewust generiek. Client-side classificeert de nieuwe `ai-error-client.ts` (`interpretAiError`/`notifyAiError`/`errorFromResponse`) en rendert `ModelUnavailableNotice`, gewired in Canvas (store + orchestration-hook), persona-chat, beeld-/LP-/foto-generatie en bulk. AbortError blijft silent; de SSE stuck-state-guard is ongemoeid. Geverifieerd: classificatie-smoke 11/11 + live SDK-smoke (echte Anthropic/OpenAI 401 → unavailable); 2-subagent finalize-review (0 CRITICAL; claw-regressie gefixt door de rauwe message te behouden voor InputBar's credit/auth-detectie). Bekende, gedocumenteerde beperking: brede catches in de image/visual/competitors-routes kunnen een zeldzame storage/DB-uitval als "model offline" labelen (zelfde retry-actie).

- Task: [tasks/done/model-offline-notice.md](../tasks/done/model-offline-notice.md)
- ADR: -
- Spec: -
- Commit: `b759e64c`

### 340. GEO stat-citatie leak — interne context-laagnamen niet langer als bron

Een gegenereerde GEO long-form-pagina toonde interne context-laagnamen als citatie-bron in de stats-band ("Napking briefing: evidence pieces, 2024", "brand-context: delivery evidence") — dezelfde leak-klasse als de Effie-rubric (gotcha 2026-05-17). Data-laag-curatie (een echte knowledge-bron toevoegen) bleek onvoldoende: het model citeert de context-lagen zélf. Vier verdedigingslagen: `geoStatSchema.source` van verplicht → nullable/optional (de geforceerde bron was de directe oorzaak dat het model er een verzon); prompt-guard die een echte externe bron eist óf weglaten toestaat en interne laagnamen verbiedt; nieuwe `sanitize-geo-sources.ts` (`cleanStatSource` denylist + `sanitizeLongFormGeoVariant`) gewired op het parse-return-punt zodat de opgeslagen variant schoon is; en `cleanStatSource` als render-/scoring-vangnet in de Puck-template, `geo-analysis` en `flatten-variant` (heelt ook reeds-opgeslagen pre-fix varianten bij rebuild). Stats zonder echte externe bron renderen label-only. Live-AI E2E geverifieerd op een Napking-artikel (sources → null, geen leak in `structuredVariant` + `puckData`); 3-ronde finalize-review clean (0 CRITICAL/WARNING), sanitizer-smoke 15/15.

- Task: [tasks/done/geo-stat-citation-source-leak.md](../tasks/done/geo-stat-citation-source-leak.md)
- ADR: -
- Spec: [docs/specs/2026-06-17-geo-seo-longform-plan.md](specs/2026-06-17-geo-seo-longform-plan.md)
- Commit: `2f78eec3`

### 339. LP smoke-bugs Step 2 + Step 3 ge-finalized (render-verificatie)

Twee post-smoke-test bugfix-tasks (branch `fix/lp-smoke-bugs`, code reeds in main via de web-page-builder squash-merges) formeel afgerond na de openstaande browser-verificatie. Step 3 render-laag live bevestigd op een gepubliceerde Napking landing-page: CTA-affordance-floor (blauwe filled button + radius, geen uppercase/platte-tekst-CTA), Lucide icon-resolutie (geen rauwe icon-namen), quote-cap. Step 2: brand-fit-check media-URL-resolutie (disk-read) + LP auto-iterate op `structuredVariant` + beide-varianten-scoring + page-level 502-guard, gefinalized op merge-bewijs. Mapping-/UI-state-fixes (#7 footer-tagline, #1/#2 hero-image) verschijnen bij nieuwe generatie (niet retroactief op oude puckData).

- Task: [tasks/done/lp-step3-rendering-bugs.md](../tasks/done/lp-step3-rendering-bugs.md), [tasks/done/lp-fidelity-bugfixes-step2.md](../tasks/done/lp-fidelity-bugfixes-step2.md)
- ADR: -
- Spec: -
- Commit: `0327ee6d`

### 338. GEO-meet-paneel in de Canvas — geoOptimizationAnalysis zichtbaar (paneel-only)

Maakt de bij publish gepersisteerde `settings.geoOptimizationAnalysis` zichtbaar in Canvas Step 4: een `GeoOptimizationPanel` toont de GEO-composietscore + zone, de 5 onderliggende signalen (answer-first / atomic chunking / cited-stats / entity-clarity / structurele cues), de geëmitte schema.org-types, een 90-dagen-freshness-badge en de verbeterpunten. Pure view-model in `geo-panel-view.ts` (incl. `isRenderableGeoAnalysis` fail-soft-guard tegen gedrifte JSON); data via een uitgebreide `GET /api/studio/[id]/components` + `useCanvasComponents`. De F-VAL GEO-pijler in de publish-gate blijft **bewust dormant** (geen drempel-impact; activatie = 1-flag-vervolg). Tevens: de meet-haak-persist in `/api/landing-pages/publish` draait nu in een `prisma.$transaction` (read-modify-write-race op `settings` geëlimineerd). Live geverifieerd op een gepubliceerd Napking-artikel (geoScore 77); 3-ronde finalize-review clean (0 CRITICAL/WARNING), geo-panel smoke 25/25.

- Task: [tasks/done/geo-seo-followup-measurement-dashboard.md](../tasks/done/geo-seo-followup-measurement-dashboard.md)
- ADR: -
- Spec: [docs/specs/2026-06-17-geo-seo-longform-plan.md](specs/2026-06-17-geo-seo-longform-plan.md)
- Commit: `9994f381`

### 337. Web-page/GEO-publish markeert het content-item nu als PUBLISHED

De `/api/landing-pages/publish`-keten (GEO/long-form + de 5 PUCK_WEBPAGE_TYPES) maakte alleen de `LandingPage`-snapshot + `/p/[slug]` en liet de eigenaar-Deliverable op DRAFT/APPROVED staan — de pagina ging live maar verscheen nooit in het "online content-items"-overzicht (filtert op `approvalStatus === 'PUBLISHED'`). Bewust opengelaten gap uit GEO/SEO Fase 2 ("Bestanden die ik NIET aanraak"-lijst). Fix: na een geslaagde `publishLandingPage` synct de route de Deliverable (`approvalStatus=PUBLISHED`, `publishedAt`, `status=COMPLETED`, `publishedVia=webpage`, `publishedUrl`) + `invalidateCache(campaigns/dashboard)` (CLAUDE.md-regel #10), fail-soft zodat de al-geslaagde publish niet 500't. Geen backfill — werkt vanaf de eerstvolgende (re)publish.

- Task: - (bugfix <30 min)
- ADR: -
- Spec: -
- Commit: `ce73e8a9`

### 336. GEO/SEO Fase 3 — GEO-prompt-directive, composable seo-geo, F-VAL GEO-pijler, entity-JSON-LD, meet-haak + Claw-edit-gate

Sluit de GEO/SEO long-form-arc af (na #332 fundament + PR #56 render). Vijf increments: (1) canonieke **`buildGeoDirective()`** (answer-first / atomic chunking / cited-stats / entity-clarity / freshness + anti-patterns) als één bron, ingebed in de long-form GEO-generatie-prompt én de polish (geen drift); `LP_VARIANT_PROMPT_VERSION` 2.0.0→2.1.0. (2) **Composable seo-geo**: `runSeoPipeline` kreeg een `optimizationGoals`-param en past bij het seo-geo-profiel op long-form een fail-soft **`runGeoPolish()`** (judge-vrij, stil) toe vóór persist — verfijning op de ADR (interne stage i.p.v. return-naar-orchestrator; lager blast-radius), long-form-only kill-switch, byte-identiek bij seo-only. (3) **F-VAL GEO-pijler** `computeGeoScore()` — deterministisch, judge-vrij, **compute-gated** (draait alleen bij `geoOptimizationActive`; 3-pijler-composite byte-identiek wanneer uit), opt-in gewired in de runner + serializers. (4) **Entity-JSON-LD**: `buildBlogPostingJsonLd` met author Person+sameAs (alléén bij verifieerbare identiteit via nieuw `Workspace.authorProfile` Json + developer-only Settings-tab + `/api/settings/author-profile`), ImageObject, inLanguage, keywords/about/mentions; QAPage bewust niet (UGC-semantiek). (5) **Meet-haak** `settings.geoOptimizationAnalysis` (geoScore + signalen + schema-types + canonical, fail-soft bij publish) + freshness (`dateModified`≠`datePublished`, `isContentStale`-helper 90d). Plus de uit Fase 2 uitgestelde **Claw-edit-gate**: 4 sites `isPuckWebpageType`→`isPuckRenderable` (read/write-tools server-side enforce via DB-fetch; context-assembler-hint + chat-route-schema + client-wiring). Gebouwd via 7-subsysteem understand-workflow → 5 increments → adversariële recall-review (31 agents, 2.9M tokens): 1 major (chat-route Zod strlooft contentTypeInputs) + scorer-correctheid (NL-lidwoord vs voornaamwoord, kale-cijfer-citatie, answerFirst-mat-de-intro-niet-headline) + deploy-safety (workspace-fetch fail-soft) gefixt; alle bevindingen verwerkt of bewust geaccepteerd+gedocumenteerd. Gates: tsc 0, eslint 0, 13 GEO-smokes (233 checks) + prompt-contracts 235 + web-page-builder + page-types + knowledge-context + F-VAL-regressie groen. **Live-AI E2E van generatie+polish deferred** (geen key in worktree). **Productie-deploy: `prisma db push` (authorProfile-kolom).**

- Task: [tasks/geo-seo-fase3-geo-prompts-fval.md](tasks/geo-seo-fase3-geo-prompts-fval.md)
- ADR: [seo-pipeline-composable-stage](docs/adr/2026-06-17-seo-pipeline-composable-stage.md) (accepted)
- Spec: [docs/specs/2026-06-17-geo-seo-longform-plan.md](docs/specs/2026-06-17-geo-seo-longform-plan.md)
- Commit: feat/geo-seo-fase3 (PR)

### 335. Deep Research in de Knowledge Library — onderwerp → onderzoek → geciteerd rapport

Vierde manier om kennis toe te voegen naast Manual Entry / Smart Import / File Upload: de "Upload"-knop is hernoemd naar **"Add Item"** en de Add-Resource-modal heeft een nieuwe **Deep Research**-tab. Flow zoals Claude's deep research: typ een onderwerp → het systeem stelt 2-3 verfijningsvragen → een meerstaps server-side pipeline (`src/lib/knowledge-research/`: PLAN→SEARCH→READ→VERIFY→SYNTHESIZE→FINALIZE, deterministische fan-out gemodelleerd op Trend Radar, NIET de Brandclaw agent-loop want die streamt niet) streamt live voortgang via SSE → een geciteerd markdown-rapport dat je met bewerkbare titel/categorie/tags/samenvatting als `RESEARCH`-resource opslaat (nieuwe viewer-modal + "Read report" op grid/list-kaarten). Bronnen komen van Gemini web-grounding (redirect-links worden naar hun echte eind-URL geresolved + SSRF-gevalideerd vóór de domein-dedup) met optionele Exa-achtergrondcontext; synthese via Anthropic Sonnet 4.6 met afgedwongen `[n]`-citaties + een canoniek herbouwde `## Sources`-sectie (model kan geen niet-bestaande bronnummers injecteren). De run schrijft NIET naar de DB (geen orphan-resource bij afbreken); opslaan gaat via de bestaande create-route (uitgebreid met `content`/`aiSummary`/`aiKeyTakeaways`/`source`/`importedMetadata`), nieuwe additieve `ResourceSource.DEEP_RESEARCH`. Abort/deadline worden naar álle AI-calls geforward (nieuw `abortSignal` op de Anthropic- + Gemini-clients) zodat een disconnect/deadline lopende generaties direct stopt. Gebouwd via workflow (foundation → backend+frontend parallel → smoke) + 3 adversariële review-rondes (0 CRITICAL) + 3 echte live end-to-end runs die 2 defecten vingen die de fakes-smoke miste: gemini-2.5-flash thinking-tokens trunceerden de structured JSON (`thinkingBudget: 0`), en de grounding-redirect-domeinen capten bronnen op 2 (opgelost door redirect-resolutie vóór dedup). Gates: tsc 0, eslint 0, nieuwe `smoke:deep-research` 30/30 (dependency-injected fakes, geen API-kosten).

- Task: [tasks/done/knowledge-library-deep-research.md](../tasks/done/knowledge-library-deep-research.md)
- ADR: [docs/adr/2026-06-19-deep-research-pipeline.md](adr/2026-06-19-deep-research-pipeline.md)
- Spec: -
- Commit: PR #55 (squash op main)

### 334. Knowledge-context werkend op de 5 PUCK web-page-types

Vervolg op #331: de knowledge-context picker was verborgen voor de 5 PUCK web-page-types (landing-page/faq-page/product-page/microsite/comparison-page) omdat hun generatie via het structured-variant-pad loopt dat `additionalContextItems` niet consumeerde — het paneel tonen zou een silent dead-end zijn. Nu bedraad: `assembleCanvasContext` vulde `ctx.additionalContextItems` al, dus `generate-structured-variant` serialiseert ze via `serializeContextForPrompt` (exact het orchestrator-patroon) en geeft de tekst mee aan `generateLandingPageVariantBatch`. De injectie zit op één gedeeld punt — `buildSharedStyleBlocks` — zodat alle 4 type-specifieke system-prompts (faq/product/microsite/LP) het bronmateriaal raw krijgen (zelf-bevattende `## PRIORITY SOURCE MATERIAL`/`## ADDITIONAL CONTEXT`-headings uit de serializer, geen geneste dubbele heading). Daarna is de `!isPuckWebpageType`-gate in `Step1Context.tsx` verwijderd (+ ongebruikte import) zodat het paneel op web-page-types verschijnt. No-knowledge-pad blijft byte-identiek (knowledge-blok leeg → ongewijzigde prompt; golden-set-veiligheid). Bewust NIET in het auto-iterate/tell-rewrite-pad: dat is een meaning-preserving polish op al-gegronde tekst via de golden-set-gevoelige `VARIANT_REWRITE_SYSTEM_PROMPT`; knowledge re-injecteren is onnodig + risicovol. Gates: tsc 0, eslint 0, `smoke:web-page-builder` 68/68, `smoke:page-types` groen, `smoke:knowledge-context` 8/8; live-geverifieerd dat de knowledge-tekst in alle 4 web-page-prompts landt én dat het no-knowledge-pad clean blijft. (#332 → #334 hernummerd post-merge wegens parallelle #332/#333.)

- Task: [tasks/done/knowledge-context-on-webpage-types.md](../tasks/done/knowledge-context-on-webpage-types.md)
- ADR: -
- Commit: `main` (zie git log)

### 333. Gegenereerde content-item beelden groeien automatisch de Media Library

Beelden die je vanuit een content-item genereert (Canvas Step 2/3) belandden alleen als `DeliverableComponent.imageUrl` en bereikten nooit de Media Library — semantische zoek (`findSimilarMediaAssets`) en library-first hergebruik misten ze. PR #325 loste dit al op voor LP-feature-cards via de fire-and-forget util `importGeneratedImageToLibrary`, maar die zat in slechts 1 van de ~5 beeld-entry-points. Nu registreren **alle** content-item beeld-routes hun AI-output als `MediaAsset(source=AI_GENERATED)`: `generate-visual` / `-trained` / `-compose` via een nieuwe gecentraliseerde wrapper `ingestUploadsToLibrary` (resolvet id-keyed `MediaCategory` + leesbare naam uit het deliverable-type, dedupliceert de ingest-loop), en `refine-visual` / `edit-image` direct. Per-`contentType` categorie-mapping (social→`SOCIAL_MEDIA`, ads→`ADVERTISEMENT`, web→`HERO_IMAGE`, rest→`LIFESTYLE`) via pure `resolveMediaCategory` + `getDeliverableTypeById` (contentType = type-id, niet de displaynaam — kernbug uit de review). `refine-visual` gebruikt replace-per-slot (`sourceUrl`-marker `deliverable-component:{id}` in een transactie + best-effort blob-cleanup) zodat herhaald verfijnen één — de meest recente — asset oplevert i.p.v. één per iteratie. **Bijvangst-bugfix**: `edit-image` gaf een gesigneerde, verlopende fal-URL terug die de frontend rechtstreeks persisteerde (dode link na ~30-60 min) — nu eerst naar onze storage geüpload en de duurzame URL geretourneerd. Ingestie is overal fire-and-forget (faalt nooit de generatie) + media-cache-invalidatie. Nieuwe `smoke:content-library-ingest` (43/0) bevat een census-regressievangnet dat elke `storage.upload`-beeld-route dwingt te ingesten of expliciet te allowlisten. Live browser-E2E geverifieerd (nieuw linkedin-post content-item → echte generatie → 2 `MediaAsset(SOCIAL_MEDIA)` met embedding → zichtbaar in de Media Library). 3 adversariële review-rondes (workflow + 2× finalize 2-subagent-loop), 0 CRITICAL; #325-feature-visual-smokes 72/0 ongewijzigd.

- Task: [tasks/done/content-item-images-to-library.md](../tasks/done/content-item-images-to-library.md)
- ADR: -
- Spec: -
- Commit: PR #54 (squash op main)

### 332. GEO/SEO long-form fundament — metadata, discovery, SEO-eligibility + GEO-variant spike

Voegt Generative Engine Optimization (citeerbaarheid voor AI-answer-engines) + SEO toe aan long-form/page-types, additief. **Fase 1a**: `generateMetadata` op `/p/[slug]` uit `settings.seoChecklist` + canonical-fallback, per-workspace host-aware `sitemap.xml`/`robots.txt`/`llms.txt` (geen cross-tenant lek), Organization-publisher op FAQPage. **Fase 1b**: long-form SEO-eligibility via een `optimizationGoals` opt-in checkbox-groep (SEO default-aan, nieuw `checkbox-group`-veldtype) + gedeelde `shouldRunSeoPipeline`-gate. **Fase 2 (spike)**: `LongFormGeoVariantContent`-schema (discriminant `geoArticle`) + `buildLongFormGeoTemplateFromStructured` render-bridge op de gedeelde PageVariantContent-union, backward-compat behouden. Checkpoint — fasen lopen door (resterend: GEO-generatie, gate-spread, publish-keten, BlogPosting JSON-LD). Geverifieerd: tsc 0, eslint 0, prompt-contracts 235/235, web-page-builder + page-types 176 + GEO-smokes 110 groen; review-rondes clean + 2 xhigh code-reviews verwerkt.

- Task: [tasks/geo-seo-fase1a-structured-data.md](tasks/geo-seo-fase1a-structured-data.md) · [1b](tasks/geo-seo-fase1b-longform-seo-substrate.md) · [2](tasks/geo-seo-fase2-optimization-goals-puck-publish.md) · [3](tasks/geo-seo-fase3-geo-prompts-fval.md)
- ADR: [optimization-goals-field](docs/adr/2026-06-17-geo-seo-optimization-goals-field.md) · [longform-puck-publish-chain](docs/adr/2026-06-17-longform-puck-publish-chain.md) · [seo-pipeline-composable-stage](docs/adr/2026-06-17-seo-pipeline-composable-stage.md)
- Spec: [docs/specs/2026-06-17-geo-seo-longform-plan.md](docs/specs/2026-06-17-geo-seo-longform-plan.md)
- Commit: PR #53 (squash op main)

### 331. Knowledge-context in de content-item flow — picker-fixes + inline toevoegen + prioriteit/toelichting + campagne-pre-selectie

Twee samenhangende features op de Canvas Step-1 knowledge-context picker, in één commit (diffs verweven in dezelfde files). **Feature A (inline-add)**: de "Knowledge Context"-kaart is nu altijd zichtbaar met een prominente knop (was een kale 12px-link, verborgen op verse items); de picker toont lege/errored categorie-groepen i.p.v. ze stil te droppen (root-cause "library-items niet zichtbaar"); inline link/PDF toevoegen vanuit de picker schrijft naar de Knowledge Library (PDF/tekst geparset via `unpdf` naar nieuwe `KnowledgeResource.content`-kolom, dubbele cache-invalidatie `knowledge-resources` + `canvas-context-items`, ontbrekende `invalidateCache` op de upload-route hersteld); de selectie persisteert op `deliverable.settings.additionalContextItems` (overleeft reload/tab-switch). **Feature B (prioriteit/toelichting/pre-selectie)**: per item een `priority` ('primary'/'reference', default reference = gedrag ongewijzigd) + vrije `note`, end-to-end door 7 lagen (store → persist → hydration → beide orchestratie-flattens → orchestrate Zod-schema → serializer); `serializeContextForPrompt` rendert primary-items onder `## PRIORITY SOURCE MATERIAL` ("ground your output in it", ruimer leesbudget) en notes als `**User guidance on this source:**`; dubbele `## Additional Context`-heading in de orchestrator verwijderd; campagne-geselecteerde kennis (`CampaignKnowledgeAsset` + nieuwe generieke `sourceType`/`sourceId`, wizard schrijft nu lossless composite-keys i.p.v. alles als brand_asset, casing-bug gefixt) wordt bij eerste opening voorge-checkt als priority='primary' (brand_asset/persona/product gestript tegen dubbel-injectie, gereconcilieerd tegen live data, pre-filter vóór de dure sweep voor perf). Browser-geverifieerd (Playwright) incl. een gevonden+gefixte double-toggle-bug waardoor de modal niet sloot op Apply (gotcha toegevoegd). 3 adversariële review-rondes (workflows + 2-subagent finalize-loop), 0 CRITICAL. Gates: tsc 0, eslint 0 errors, `smoke:prompt-contracts` 235/235 (reference-framing byte-identiek), nieuwe `smoke:knowledge-context` 8/8 + `smoke:context-priority` 9/9, seeding end-to-end + dedup geverifieerd. Schema: `db push` (KnowledgeResource.content + CampaignKnowledgeAsset.sourceType/sourceId) — andere worktrees: `npx prisma generate` na pull.

- Task: [tasks/done/knowledge-context-inline-add.md](../tasks/done/knowledge-context-inline-add.md), [tasks/done/knowledge-context-priority-annotation-preselect.md](../tasks/done/knowledge-context-priority-annotation-preselect.md)
- ADR: -
- Spec: -
- Commit: `31edcdb0` (main)

### 330. Ingeslopen Nederlandse UI/communicatie-teksten → monolinguale Engelse UI

De product-UI bevatte verspreid ingeslopen Nederlands (aria-labels, placeholders, error-/toast-meldingen, marketing-copy, transactionele alert-emails, notificatie-/activity-labels, plus NL default/placeholder-content in de Puck-page-builder). Een multi-agent audit (workflow `dutch-to-english-audit`) wees uit dat er **geen i18n-framework** is (strings zijn hardcoded in JSX) en dat de taal van *gegenereerde klant-content* een aparte, volwassen locale-laag is (ADR `2026-05-08-locale-routing-brand-voice`). Gekozen aanpak: **directe hardcoded NL→EN-vervanging** van user-facing strings (géén i18n-laag), met de gegenereerde-content-locale-laag intact. Uitgevoerd in worktree `branddock-feat-nl-to-en` over ~80 files: **F1/F2/F3** (parallelle apply-agents) marketing-site + settings + shared components + canvas-UI + brandstyle/voice + competitors + transactionele competitor-alert-emails (`notify-major-events.ts`) + activity-labels. **F4** (handmatig): Puck-config + `template-helpers` scaffold-defaults → Engels (consistent met de al-Engelse `defaultBrandHero` + bestaande bilinguale placeholder-markers; géén locale-driven refactor want het zijn placeholders die de generatie overschrijft, RichText-default = `Write your content here.` zodat de `your content here`-marker matcht); de hardcoded `?? 'nl'`-taalfallbacks in 5 generated-content-paden (`generate-structured-variant`/`auto-iterate-variant` routes, `canvas-orchestrator`, `human-voice-directive`, `auto-iterate-integration`) uitgelijnd op `'en'` (= `Workspace.contentLanguage @default("en")`; brands mét expliciete voorkeur + de `nl→nl-NL`-mapping + per-taal-data onaangeraakt). **F5**: ESLint `no-restricted-syntax`-gate die nieuwe NL UI-strings blokkeert (hoog-precieze stopwoordenlijst op JSX-tekst + aria/placeholder/title, klant-content-paden hard uitgesloten) — vond 10 misses tijdens uitvoering, alle gefixt. NL code-comments + interne docs blijven Nederlands (bewuste gebruikerskeuze, conform CLAUDE.md-conventie). Géén doNotTouch/prompt-body files in de diff. Adversariële 4-reviewer pass: clean, 0 majors. Gates: tsc 0, eslint 0 errors, F5-gate 0 violations, `smoke:prompt-contracts` 235/235, `smoke:locale` 32/32, `smoke:web-page-builder` 68/68, `smoke:page-types`/`image-briefing`/`competitor-activities`/`feature-visual-gate` groen.

- Task: [tasks/done/dutch-to-english-ui-migration.md](../tasks/done/dutch-to-english-ui-migration.md)
- ADR: [docs/adr/2026-06-17-nl-to-en-ui-migration.md](adr/2026-06-17-nl-to-en-ui-migration.md)
- Commit: `35097c25` (main)

### 329. Website page-types W0-W5 — product/faq/microsite volwaardig + logo-garantie (L1+L2+L3)

Volledige uitvoering van `docs/specs/website-page-types-implementatieplan.md`: de 5 PUCK-webpage-types waren landingspagina's-in-vermomming (geen contentType-dispatch). **W0** (quick wins + logo-promptlaag L-Fase 1): `Brand:${name}` uit de image-prompt-builders + onconditionele unbranded-guard + `logos` in DEFAULT_NEGATIVE_SEGMENTS, microsite double-render-fix, type-eigen contentTypeInputs → builtPrompt, type-bewuste briefIncomplete-gate, merk-vreemde template-placeholders geneutraliseerd. **W1** (type-aware generatie): `page-type-schemas.ts` (faq/product/microsite Zod) + contentType-dispatch in variant-generator (`buildSharedStyleBlocks` byte-identiek voor LP) + per-type from-structured-builders + shape-dispatch in variantToPuckData/flatten + orchestrate-dubbelpad-gate; LP/comparison byte-compatibel. **W2** (product-page + Product-koppeling): `product-select` veldtype + Layer 7 settings-first productId + ProductImages, product-prompt met anti-hallucinatie + pageFlavor (saas/physical/service), `assignProductImagesToVariant`, server-guard 400, native SpecTable-component, Product/Service JSON-LD op /p/[slug]. **W3** (FAQ): categorie-ankernavigatie + FAQPage JSON-LD (rest zat al in W1). **W4** (microsite): AnchorNav (sticky/scroll-spy/a11y, eigen 'use client'-bestand zodat puck-config server-safe blijft) + StoryChapter (beeld/tekst-alternatie) + HighlightCards (inactief-by-default, activeerbaar in de editor) + block-beeld-slots + blueprint-mapping-promptregel. **W5** (logo-garantie): L-Fase 2 `visibleLogo`-boolean op de coherence-judge (logo-vrije kandidaat wint, zwaarste regen-reden, library-beeld beschermd) + hero-logo-gate (logo-fidelity<50 → auto-deselect naar schone variant, race-guarded, nul latency); L-Fase 3 opt-in hero-logo-overlay (WorkspaceAiConfig-toggle, luminantie-bewuste LIGHT/DARK-variant top-right) + anchor-curatie (`detect-logo-in-image` + `?audit=1`) + settings-UI. Testronde-fixes (browser-feedback): microsite-menu één regel + korte CTA, FAQ twee bijna-identieke CTA-panelen → één, RichText-font = role-body, échte logo in de nav, brand-fit graceful fallback (design-philosophy-judge bij ontbrekende bron-screenshot i.p.v. ENOENT-502), AnchorNav sticky alleen op de live pagina (niet-sticky in de ingebedde preview). Gates: tsc 0, eslint 0, nieuwe `smoke:page-types`-keten (w1 65 / w2-w3 51 / w4 20 / w5 20 / w5-l3 18 = 174), web-page-builder + prompt-contracts 235 + lp-text-quality 50 groen. Cherry-picked op main naast de parallelle content-types-chores (#328, disjuncte files).

- Tasks: [tasks/website-page-types-w0-w1.md](../tasks/website-page-types-w0-w1.md) t/m w5
- Spec: [docs/specs/website-page-types-implementatieplan.md](specs/website-page-types-implementatieplan.md)
- Commits: `f8c72bd5` (W0-W5) + `939546aa` `73617b57` `ffeb03ff` (testronde-fixes)

### 328. Content-item-categorieën Email & Automation / Sales Enablement / PR, HR & Communications verborgen uit de Add Content-picker

Drie categorieën uit de campaign content-type-picker gehaald via het reversibele hidden-flag patroon (mirror van de Video & Audio-verwijdering 2026-05-19), alles in `src/features/campaigns/lib/deliverable-types.ts`: de categorie-strings uit `DELIVERABLE_CATEGORIES` weggehaald (→ verdwijnen uit alle 6 picker-consumers: wizard SetupStep/DeliverablesStep, BulkGenerate, QuickContentForm, ContentFilters, AddDeliverableType) + `hidden: true` op de 17 onderliggende types (5 Email & Automation, 4 Sales Enablement, 8 PR, HR & Communications — `employer-brand-video` was al hidden). De category-keyed maps (fidelity `CATEGORY_DEFAULTS`, brand-voice `CATEGORY_CHANNEL_MAP`, canvas-model-routing `CATEGORY_OPTIMAL_MODEL`) zijn bewust intact gelaten — ze zijn `Record<string, …>` en houden de category-strings, zodat bestaande/hidden deliverables blijven genereren en scoren. Reversibel via `hidden→false` + de categorie-regel terugzetten. 2-reviewer finalize-pass: 0 CRITICAL / 0 WARNING; 1 geërfde MINOR (stale persisted `activeDeliverableTab` in localStorage kan een verwijderde tab eenmalig resurrecten — identiek aan het Video & Audio-precedent, geen regressie van deze change). Gates: tsc 0, lint 0. Ook cherry-picked naar worktree `branddock-feat-page-types` (`83c17479` + `e5d4b430`) waar de dev-server draait.

- Task: -
- ADR: -
- Spec: -
- Commit: `2b247fc1` (Email & Automation + Sales Enablement) + `f022977e` (PR, HR & Communications)

### 327. Prompt-audit verbeterplan fase 0-5 — volledige prompt-laag gesaneerd (truncatie, contracten, validatie, taal, configuratie)

Volledige uitvoering van het 5-fasen-verbeterplan uit de prompt-audit (409 bevindingen, 14 CRITICAL — rapport `docs/audits/2026-06-11-prompt-audit.md`), die alle vier de gemelde testklachten verklaarde (afgebroken teksten / verkeerde opdrachten / onvolledig / verkeerde volgorde). **F0+1 (commit `1039f0e2`)**: 9 quick-wins (o.a. Zod-velden die op het happy path wegvielen, SEO step 6 markdown-vs-JSON, Claw contentType-wiring waarmee de #318 LP-edit-tools voor het eerst bereikbaar zijn, frameworkData read-modify-write) + centrale truncatie-discipline (stop_reason/finish_reason-detectie in alle clients, `getMaxTokensForComponent` 2048→registry-budgetten, thinking-budget bovenop output, gedeelde `call-budget.ts`). **F2**: component-contract-laag — fallback-registry 7→32 entries (einde "exactly 0 entries" voor 17+ types), `FALLBACK_FIRST_TYPES`-precedence (tiktok scene-split terug), per-email sequence-groepen, faq/comparison/microsite eigen contracten, per-group silent-iterate verplaatst naar ná persistVariants (resultaat werd weggevaagd — latent sinds F24), nieuwe CI-gate `smoke:prompt-contracts` (235 checks). **F3**: validatie-hygiëne — `validateAndCoerce` (coerce-dan-enforce, per-call-site), regen-normalisatie vóór parse, C7 ad-runner (judges scoorden altijd lege content; cache heelt zelf via contentHash), judge-degraded-pad i.p.v. 500, auditor/UI-guards, admin-routes Zod. **F4**: taal/jargon/governance — locale-instruction gegeneraliseerd (Intl.DisplayNames, nooit meer stil ''), `withLocaleContract` op alle chain-prompts, award-jargon-sweep + `scrubConceptOutput`, gedeelde `analyzer-markers.ts` (OBSERVED/RECOMMENDED-strip + review-gates op beide consistent-models-resolvers), `fenceUntrustedContent` op 5 scrape-prompts. **F5**: exploration-éénwording (admin-`reportPrompt` echt geconsumeerd; 5→2 promptbronnen; sync-script niet-destructief; BV-WIRE voice-velden uit seed+script+3 DB-configs), `isTempDeprecatedModel` centraal, photo-brief/strategic-implications via anthropicClient (+brand-context), `foldNegativeIntoPrompt` op alle 6 LoRA-paden (negatives waren een stille no-op), golden-sets CI-gate faalt nu echt (<70% = rood), −3.157 regels dead code. Methode: 3 audit-rondes (132 agents, adversariële verificatie incl. live API-tests — bijvangst: gotcha-correctie sonnet-4-6+temperature=200 OK) + per fase parallelle file-disjuncte bouw-clusters met 2-reviewer pass (38 review-bevindingen verwerkt). Gates per fase groen: tsc 0, prompt-contracts 235/235, smoke:locale 32/32, heuristics-locales 50/50, web-page-builder/studio/ad-creative suites. Open: browser-smoke #318-tools + 4 representant-types (handmatig), dam-auto-tagger-centralisatie (parallelle sessie).

- Tasks: [tasks/done/prompt-audit-fase-0-1.md](../tasks/done/prompt-audit-fase-0-1.md) t/m [tasks/done/prompt-audit-fase-5.md](../tasks/done/prompt-audit-fase-5.md)
- Audit: [docs/audits/2026-06-11-prompt-audit.md](audits/2026-06-11-prompt-audit.md) (+ data-JSON)
- Commit: branch `fix/prompt-audit-fase-0-1`

### 326. Quality-mode instelbaar via Settings → AI Models (micro-restje #322)

De kandidaten-per-slot-knop voor LP feature-beelden (#322) was alleen via een handmatige WorkspaceAiConfig-row instelbaar; nu staat er een "Image generation"-sectie in de developer-only AI Models-tab met een 1/2/3-keuze (budget / quality / max, met kosten-hint per pagina) op een eigen mini-route (`/api/settings/feature-image-quality` — bewust naast `/api/settings/ai-models`, want dit is een tuning-knop en geen provider/model-keuze; 1 = row verwijderen = default, conform het reset-patroon). Tweede micro-restje gesloten zonder bouw: per-feature handmatige beeld-keuze bleek al volledig gedekt door #320's PuckImageField (picker + clear + bron-badge op beide feature-velden).

- Task: [tasks/done/lp-feature-image-followups.md](../tasks/done/lp-feature-image-followups.md) (extensie)
- ADR: `-`
- Spec: `-`
- Commit: branch `feat/lp-quality-mode-settings`


### 325. Gegenereerde feature-beelden groeien de Media Library (zelf-lerend hergebruik)

Sluitstuk op library-first (#323): definitieve AI-winnaars uit `generate-feature-visuals` worden fire-and-forget als MediaAsset geregistreerd (source `AI_GENERATED`, sceneType→categorie, naam = brief-subject, slug-suffix uit de unieke upload-bestandsnaam) waarna de dam-auto-tagger automatisch beschrijving + tags + pgvector-embedding levert. Daarmee kan de matcher een eerder gegenereerd beeld bij een volgende pagina hergebruiken voor $0 i.p.v. opnieuw te genereren — de bibliotheek wordt zelf-lerend. Echte foto's houden voorrang (PHOTO_REAL-boost) en de fail-closed coherence-poort blijft de kwaliteitsgrens; bewuste consequentie: her-generatie van dezelfde pagina kan het vorige beeld terugmatchen (gewenst hergebruik — vers afdwingen = asset archiveren of vervangen via de picker). Max 4 assets per page-run (alleen finals, library-matches worden niet her-geïmporteerd); import-fouten zijn non-blocking.

- Task: [tasks/done/lp-library-first-matching.md](../tasks/done/lp-library-first-matching.md) (extensie)
- ADR: [docs/adr/2026-06-10-feature-visual-pipeline.md](adr/2026-06-10-feature-visual-pipeline.md)
- Spec: `-`
- Commit: branch `feat/lp-generated-to-library`


### 324. Planner-checklist false negatives voor Puck web-pages + hero-row pariteit

De Publication Checklist in Canvas Step 4 false-flagde gegarandeerd op "Title or headline" en "Hero image" voor Puck web-pages: de checks lazen alleen DeliverableComponent-tekstgroep-namen en de `heroImage`-store-slice (die uitsluitend uit een `variantGroup='hero-image'`-rij hydrateert), terwijl de Puck-flow titel/hero in `settings.puckData`/`structuredVariant` persisteert. Gefixt langs vier lijnen: (1) Puck-specifieke checklist-branch ("Hero headline is set", required-pariteit met de oude web-branch); (2) checklist-signalen lezen voor Puck-types `contextStack.puckData` (gerenderde waarheid; volgt editor-edits na refetch) met de `structuredVariant`-snapshot als fallback, `has-meta` accepteert het door de SEO-pipeline teruggeschreven `contentTypeInputs.metaDescription` (puck-gated — de WordPress-excerpt van blog-article leest alleen de tekstgroep); (3) de SEO-pipeline-wipe spaart media-rijen (`notIn ['image','video','voiceover']`, orchestrator-conventie) i.p.v. alles te wissen; (4) AI-hero-flows upserten nu óók de `hero-image`-rij op het gedeelde chokepoint (`patchHeroVisualUrl`, alle 3 routes) — atomair op de compound-unique, gegate op nieuw `puckPatched`-signaal (rij spiegelt de gerenderde hero) en strikt additief in fill-only/self-heal-modus zodat een handmatige keuze nooit overschreven wordt; POST /hero-image is de andere race-helft en werd ook atomair. Review: 2 rondes × 2 verse subagents (0 critical, 7 warnings → alle gefixt) + ronde 3 inline wegens subagent-limiet. Browser-geverifieerd op de Napking LP vóór én na de rework: 5/5 groen, warning-regel weg, 0 console-errors. Smokes: phase68 30/30 (incl. nieuw `puckPatched`-contract); tsc 0, lint 0 errors.

- Task: [tasks/done/planner-checklist-puck-lp.md](../tasks/done/planner-checklist-puck-lp.md)
- ADR: `-`
- Spec: `-`
- Commit: `1d6ebbc1`

### 323. Library-first matching — echte merkfoto's vóór AI-generatie op het LP feature-pad

De Media Library is nu de eerste bron voor LP feature-beelden: een server-side slot-matcher (`source-image-matcher.ts`) matcht per slot de brief/copy semantisch tegen aiDescription-pgvector-embeddings (`findSimilarMediaAssets` + additieve `excludeCategories`-param), met greedy unieke toewijzing (één asset → max één slot), foto-categorieën-only, `auth:PHOTO_REAL`-boost, orphaned-disk-guard en throw-loze cold-start. Een match wordt pas geaccepteerd na de coherence-judge (≥55, **fail-closed** zonder oordeel) — "echt maar fout" valt terug op het AI-pad. Gedekte slots kosten $0 fal-spend (`sources: 'library'`, persist `imageSource: library:<assetId>` mét `aiProvider/aiModel: null` conform het select-library-patroon). Source-aware kwaliteitspoort: een library-foto kan nooit de duplicate-verliezer zijn van een (library, AI)-paar (swap-loop + `protectedIndices` in de gate) — de AI-sibling kan via brand-anchors op dezelfde foto geconditioneerd zijn. Review-ronde 1 ving een CRITICAL: webp-library-assets (21% van de embedde set) kregen een png-label waardoor de coherence-acceptatie fail-open passeerde én één invalide image-block de hele multi-image diversity-call stil uitschakelde → `prepareJudgeImage` sniff't nu png/jpeg/webp en converteert onbekende formats naar jpeg. Bevestigingsronde 0C/0W incl. live SQL-verificatie van de nieuwe `text[]`-param (G2-callers ongewijzigd). Smokes: matcher 11/11 (nieuw), gate 23/23 (+protected-cases), judge-image 7/7 (+webp/gif); golden-set dry-run met match-rapportage; npm smoke-entries toegevoegd.

- Task: [tasks/done/lp-library-first-matching.md](../tasks/done/lp-library-first-matching.md)
- ADR: [docs/adr/2026-06-10-feature-visual-pipeline.md](adr/2026-06-10-feature-visual-pipeline.md) beslissing 10 (geactiveerd)
- Spec: [docs/audits/2026-06-10-lp-feature-image-diversity.md](audits/2026-06-10-lp-feature-image-diversity.md)
- Commit: branch `feat/lp-library-first-matching`


### 322. LP feature-images follow-ups — werkende clear-knop, quality-mode, audit-nauwkeurigheid, judge-downscaling

Vier §9-follow-ups van #317, waarvan één een echte cross-PR-bug bleek: de "Verwijderen"-knop uit #320 werd door de #317 clobber-guard stil teruggedraaid (parallel ontwikkeld). **Clear-pad**: de knop stuurt nu `CLEAR_IMAGE_SENTINEL` — de guard herkent dat als expliciete user-intentie (sweep vóór de alignment-guards zodat de magic string nooit persist), normaliseert naar '' én spiegelt de clear naar `structuredVariant` op het PATCH-chokepoint (anders resurrecteerde elke sv→puck-rebuild het gewiste beeld); stale-race-bescherming blijft intact. Plus bron-badge op de veld-thumbnail (URL-heuristiek: AI-gegenereerd / media library / extern). **Quality-mode**: WorkspaceAiConfig featureKey `lp-feature-image-candidates` (1-3, default 1) stuurt num_images per slot; elke kandidaat wordt vóór upload ge-coherence-judged, de winnaar geüpload en de runner-up dient als gratis dupe-swap — mét re-judge van de set na swaps en fail-soft swap-uploads. **Audit-nauwkeurigheid**: per-slot generationDuration, iterationCount=1 bij retry, response `regenerated`/`swapped` alleen bij succes, telemetrie op werkelijke tellers. **Judge-downscaling**: `prepareJudgeImage` (sharp, >4MB → jpeg ≤1024px + magic-byte-sniff) vóór elke vision-judge-call. Reviews: 2 reviewers, 0 critical / 6 warnings → alle gefixt. Smokes: preserve 20/20, judge-image-prep 5/5 (nieuw), bestaande suites groen; tsc 0.

- Task: [tasks/done/lp-feature-image-followups.md](../tasks/done/lp-feature-image-followups.md)
- ADR: [docs/adr/2026-06-10-feature-visual-pipeline.md](adr/2026-06-10-feature-visual-pipeline.md) (beslissingen 6/9 geactualiseerd door deze task)
- Spec: [docs/audits/2026-06-10-lp-feature-image-diversity.md](audits/2026-06-10-lp-feature-image-diversity.md) §9
- Commit: branch `feat/lp-image-followups`


### 321. Brand Assistant tenant-hardening — scope-guard + write-tool IDOR dichtgezet

Twee bevindingen uit de Brand Assistant ("Claw") cross-tenant leak-audit afgehandeld. (1) **Scope-guard**: `SYSTEM_IDENTITY` (de assistant-system-prompt) verbood nergens om over merken buiten de workspace te praten, waardoor de assistant vragen over willekeurige (andere klant-)merken uit zijn trainingskennis beantwoordde. Toegevoegd: een expliciete "Scope boundary"-sectie die de assistant bindt aan de merken/concurrenten in de workspace-context, vragen over bedrijven die niet in context staan laat weigeren (niet uit general/training knowledge antwoorden), en fabricage over andere tenants verbiedt — met de eigen `Competitor`-records expliciet als in-scope (het is eigen concurrentieanalyse). (2) **Write-tool IDOR**: meerdere write-tools muteerden in `execute()` op `prisma.X.update({ where: { id } })` zónder workspace-check. Omdat `execute` los van `buildProposal` via de confirm-route draait met een client-geleverd entity-id, kon een gemanipuleerde confirm een entiteit uit een **andere** workspace muteren. Op `main` geverifieerd aanwezig en gefixt in 7 surfaces: `update_asset_content`, `update_asset_framework`, `update_persona`, `update_product`, `update_competitor`, `update_strategy_context` en `lock_entity` (brand_asset/persona/product — die had zelfs in `buildProposal` geen check). Patroon: `updateMany({ where: { id, workspaceId }, data })` + `count === 0 → throw`, of (waar al een `findFirst` stond) een `if (!row) throw` vóór de bare update. Prisma's `updateMany.count` telt gematchte rijen, dus een idempotente write throwt niet onterecht; de confirm-route vangt de throw als een nette tool-error (geen 500). Reeds-gescopede tools ongemoeid + geverifieerd (`update_interview`, `link_persona_to_product`, alle 4 deliverable-update-tools). 2-reviewer security-pass: 0 critical; de enige WARNING (statische smoke-scan miste multi-line `.update(`-calls) is gefixt — de scan slaat nu whitespace plat en dekt ook delete/upsert. tsc+lint 0; nieuwe smoke `smoke:claw-security` 8/8 + eenmalige cross-workspace integratietest tegen de echte DB (12/12: write geweigerd op alle 5 tools, DB ongemoeid, in-workspace write werkt met revert).

- Task: [tasks/done/claw-security-hardening.md](tasks/done/claw-security-hardening.md)
- ADR: `-`
- Spec: `-`
- Commit: branch `feat/claw-security-hardening`

### 320. Media-library picker als Puck image-field in de Layout editor + scroll/persist-fixes

`heroVisualUrl` (BrandHero) en `imageUrl` (FeatureSplit/FeatureGrid) zijn in de fullscreen Puck-editor geen kale URL-tekstvelden meer maar een herbruikbaar custom field (`PuckImageField`): thumbnail-preview + "Kies afbeelding" opent de bestaande `ImageSourcePanel`-interactie (library/smart-search/generate/upload/url/stock) in een modal bóven de editor; de keuze stroomt via Puck's onChange het bestaande autosave-pad in. FeatureGrid's ontbrekende `imageUrl`-field-def bleek een latente data-loss-bug (Puck stript props zonder field bij elke edit) — gefixt. Persistentie-correctheid: `syncHeroFromPuck` op het PATCH-chokepoint (dual-track sync bij autosave-vormige writes), `onlyIfEmpty`/`heroWriteMode: 'fill-only'` zodat de hero-self-heal een handmatige keuze nooit overschrijft, en re-hydrate-suppressie zolang een autosave pending/in-flight is (in-flight-teller). Scroll-fixes Layout editor (Playwright-gediagnosticeerd): Puck's hardcoded `100dvh` overflowde de wrapper (onderkant afgekapt → scoped CSS-override naar 100%) en een body-scroll-lock lekte via Puck's body→iframe-attributenspiegeling de preview in (editor-lock verwijderd; shared `Modal` kreeg een lock-teller + `lockBodyScroll`-prop + centrale Puck-guard). FidelityScoreBar staat in Step 2 boven de variant-selector. 5 review-iteraties (10 verse subagents), smokes phase61 29/29 + phase68 24/24. Browser-bewezen: library-pick → beide DB-sporen identiek (puckData + structuredVariant). NB: hernummerd van #316 (dubbele claim met text-quality; commit-messages d681ba50/0bc93926 vermelden nog #316); completeert `9e3282be` (gedeelde index met de zombie-tab-sessie — compileert niet standalone, hoort direct onder d681ba50).

- Task: [tasks/done/lp-editor-image-field.md](../tasks/done/lp-editor-image-field.md)
- ADR: -
- Spec: -
- Commit: d681ba50 + 0bc93926 (minors)

### 319. Brand-fit check werkend + zombie-tab workspace-auth op alle studio-routes

Twee samenhangende fixes uit dezelfde diagnose-sessie. **Brand-fit check**: de knop faalde altijd met het misleidende "Playwright niet beschikbaar?" — werkelijke keten: een onnodige `'use client'` op `puck-config.tsx` (pure render-functies) maakte `buildSpikePuckConfig` een client-reference-proxy in de route, en daaronder kan `renderToStaticMarkup` in de Next route-handler-laag fundamenteel geen hook-gebruikende componenten renderen (dual-React: Puck's `Render`/useMemo crasht op een null-dispatcher). Fix: render+screenshot verplaatst naar een tsx **child-process worker** (`scripts/workers/lp-screenshot-worker.tsx`, payload via temp-JSON, nu mét Puck-CSS + a11y-block) — zelfde bewezen patroon als de dev-harness; route-error verwijst nu naar de server-logs. End-to-end geverifieerd (Napking: judge-resultaat in 11s). De "N features zonder beeld"-knop (P2b gap-fill) is op user-verzoek uit PuckPageBuilder verwijderd (de #317 server-side feature-pipeline staat hier los van). **Zombie-tab fix**: de `branddock-workspace-id`-cookie is browser-globaal en een switch reload't alleen de eigen tab — alle andere open tabs werden stil inconsistent: élke cookie-scoped `/api/studio/*`-call 404'de (incl. de puckData-autosave = stille data-loss; zo verdween de hero "soms"). Alle 38 studio-routes zijn omgezet naar resource-based auth op de workspace ván het deliverable: 5 canvas-kritieke via `requireDeliverableAccess` (401/403/404-onderscheid), 33 via drop-in `resolveDeliverableWorkspaceId()` (`src/lib/deliverable/deliverable-access.ts`, hergebruikt `hasWorkspaceAccess` incl. per-member ACL). Defense-in-depth: `WorkspaceSwitchGuard` (BroadcastChannel) toont in andere tabs een blocking herlaad-overlay bij elke workspace/org-switch. Hero self-heal + Step1Context loggen nu gestructureerd (`{}` maskeerde de mismatch). Verificatie: auth-matrix via curl (zombie-scenario's 200, non-member 403/401, no-session 401), two-tab Playwright-smoke (`npm run smoke:zombie-tab-guard`), hero-smokes phase61/68 groen.

- Task: [tasks/workspace-zombie-tab-fix.md](../tasks/workspace-zombie-tab-fix.md)
- ADR: -
- Spec: [docs/audits/2026-06-10-workspace-cookie-zombie-tabs.md](audits/2026-06-10-workspace-cookie-zombie-tabs.md)
- Commit: 9e3282be (+ merge `56849bba` met #317-hotspots)
### 318. LP-tekst wijzigen via Brand Assistant in Step 3 (Medium)

De Brand Assistant ("Claw") kon in Canvas Step 3 (Medium) de pagina-inhoud van een landing page niet wijzigen — geen enkele write-tool raakte de Puck-`puckData`; de bestaande deliverable-tools vulden alléén de Step 1-briefing, en de system-prompt verklaarde de canvas zelfs expliciet "not directly editable through tools". Twee nieuwe tools heffen dat op: **`read_landing_page_content`** levert de bewerkbare tekstvelden met exacte paden + huidige waarden, **`update_landing_page_content`** past gerichte tekst-edits toe via `deepSet` en persisteert door dezelfde **hero-preserve chokepoint** (`preserveHeroOnSettings`) als de studio-autosave, zodat een tekst-edit nooit een gewirede hero-image clobbert. Beide tools volgen de veilige deliverable-scoping (workspace-check via `campaign.workspaceId` in zowel `buildProposal` als `execute` → geen cross-tenant pad) en zijn **tekst-only**: een componenten-agnostische walker met **copy-allowlist** (afgeleid uit de Puck-config) sluit structurele/enum/asset-props (`icon`/`bandTone`/`columns`/URLs/hrefs) uit, en `execute` her-valideert elk pad server-side zodat het model nooit een verzonnen of niet-copy pad kan schrijven. De system-prompt routeert web-page-deliverables naar de LP-tools (rule #5 verzwakt voor web-page-types) via een nieuw `contentType`-veld op `pageContext`; de canvas-preview ververst automatisch via de bestaande `canvas:refresh-deliverable`-keten (één case toegevoegd in de confirm-route → affected `deliverable`). Bijvangst: `PUCK_WEBPAGE_TYPES` (3× gedupliceerd) gecentraliseerd naar `src/lib/landing-pages/webpage-types.ts`. Geverifieerd end-to-end op de echte Napking-LP via een gesigneerde sessie + dev-server: de assistant koos de LP-tools, stelde een correcte kop-rewrite voor, en de confirm schreef de DB-kop daadwerkelijk om met hero intact (daarna teruggezet). tsc+lint 0; 32/32 helper-smoke + 9/9 tool-integratietest tegen de echte DB.

- Task: [tasks/done/lp-assistant-content-edits.md](tasks/done/lp-assistant-content-edits.md)
- ADR: `-` (binnen bestaande `docs/adr/2026-05-22-landing-page-builder-architectuur.md`)
- Spec: `-`
- Commit: branch `feat/lp-assistant-edits`

### 317. LP feature-beelden divers + sectie-relevant — brief-first prompts + judge-gated kwaliteitspoort

Fixt het "4x dezelfde chef"-symptoom (Napking) bij de wortel, in 6 fasen. **R1/R2**: de scraped `photographyStyle` (een OBSERVED-beschrijving van één bron-foto) stuurde via één gedeelde promptstaart élke feature-generatie, terwijl `slice(0,500)` exact het diverse Subjects-deel afkapte — de tokens zijn gesplitst (stijl deelbaar; compositie alleen voor de hero; subjects → inspiratiepool) met per-segment word-safe budgets. **R5/R6**: `canvas-context` leest photographyStyle nu gated (published && imagerySavedForAi, spiegel van brand-context) en negatives werken eindelijk op nano-banana-pro (`supportsNegativePrompt`-capability + prompt-directive-fallback, specifiek-eerst geordend met budget-reservering); `brandImageryDonts` + `brief.avoid` bereiken de feature-route. **R7**: de copy-LLM levert per hero/feature een gestructureerde `imageBrief` ({subject, sceneType-enum, composition, avoid}, `.catch(null)`-degradatie) met harde set-diversiteitsregel. **R3/R4**: de route bouwt prompts server-side (scene-templates, angle-rotatie, sibling-differentiatie, per-slot seeds — empirisch bewezen: nano-banana is deterministisch per seed) en krijgt een kwaliteitspoort: paired G4-coherence-judge per beeld + multi-image Haiku set-diversity-judge + deterministische gate met max 2 gerichte regeneraties (~$0,53-0,79/pagina); persist als `DeliverableComponent feature-visual:<i>` mét `imagePromptUsed` (audit-gat dicht). **R9**: feature-clobber-guard naast de hero-guard op het PATCH-chokepoint. Acceptatie op de echte Napking-secties: 4 onderscheidende, sectie-relevante beelden (wasmachine 85°C / voorraadkast / GOTS-label / bezorgbus), coherence 78×4, 0 dupes. **5 review-iteraties** (o.a. CanvasPage store-pollutie, Grid↔Split-wissel in de guard, brandImageryStyle-R1-zijdeur, slot-index-uniciteit gefixt) tot 0 critical/0 warning. tsc 0; 141 nieuwe smoke-checks (6 suites); golden-set dry-run over 3 workspaces; phase32-smoke omgehangen van handgespiegelde kopie naar de echte helper. Browser-verificatie Step 2/3 + merge-afstemming met `feat/lp-editor-image-field` staan open. NB: #316 is door twee parallelle sessies geclaimd (editor-image-field gecommit + text-quality gereserveerd) — chronologisch renumberen bij merge.

- Task: [tasks/done/lp-feature-image-diversity.md](../tasks/done/lp-feature-image-diversity.md)
- ADR: [docs/adr/2026-06-10-feature-visual-pipeline.md](adr/2026-06-10-feature-visual-pipeline.md)
- Spec: [docs/audits/2026-06-10-lp-feature-image-diversity.md](audits/2026-06-10-lp-feature-image-diversity.md)
- Commit: branch `feat/lp-feature-image-diversity` (12 commits, `a7d5a47f..`)

### 316. LP-tekstkwaliteit + fidelity-meting — length-penalty-artefact weg, HVD-pariteit, detector-gaten dicht

Onderzoek (31-agent workflow, `docs/audits/2026-06-10-lp-text-quality-fidelity.md`) toonde dat de laagste-van-alle-types LP-fidelity (composite 63.0, judge 46.2, n=47) voor ~13 punten een **meetartefact** was: 46/47 scores kregen een ×0.6 "severely short"-penalty omdat de LP-routes geen `targetWordCountOverride` meegaven en het registry-target 1550 woorden was tegen ~650 reële variant-copy. Daarnaast een echte copy-kloof: het LP-pad miste de complete kwaliteits-machinerie (HVD/model-routing/STRICT/silent-iterate) — empirisch 92% em-dash-prevalentie via het LP-pad vs 25% via het orchestrator-pad, en de detector miste precies de geplakte vorm ("over—zodat", PO-klacht #1). **Gebouwd (fase 1-5):** (1) *meting*: per-type scoring-targets (`STRUCTURED_VARIANT_WORD_TARGETS`, 650-700) + F33-override in score-variant-fidelity/auto-iterate-variant + Website-drempel 75→70 + placeholder-guard ("Schrijf hier je inhoud" = 21% van alle LP-scores) + contentHash-dedupe (nieuwe kolom) + baseline-recompute van de 46 penalty-rijen (62.4→75.8 composite, met JSON-backup); (2) *prompts*: HVD mode-gated in variant-generator + álle 32 em-dashes uit de prompt-instructietekst (model-priming) + anti-drieslag-regel + riskReducer-voorbeeld zonder "Geen X" + anti-fabricage (geen verzonnen testimonials/cijfers; schema-fallback voor lege author-velden) + LINFI/Better Brands-hardcode vervangen + locale uit voiceguide i.p.v. hardcoded nl-NL + model-routing naar sonnet-4-6; (3) *detector*: `em_dash_glued` + `hyphen_splice_conjunction` tells + brand-vocab-whitelist (geseede woorden tellen niet als lexicon-tell; vocabularyDo nu ook in de rules-allowlist) + do/avoid-dedup (Linfi 'exclusief'/'luxe' in beide lijsten — gefixt in data + analyzer-write-guard); (4) *loop-pariteit*: STRICT tell-rewrite per variant na batch-generatie (detector-gated, `variant-tell-rewrite.ts`) + verrijkte iterate-prompt (voiceguide-fingerprint + vocab + detector-tells + rule-violations) + silent composite-iterate achter `LP_SILENT_ITERATE=1`; (5) *meetbaarheid*: AICallSnapshot/Trace-capture voor LP-generatie (promptVersion 2.0.0; was onzichtbaar voor de prompt-registry) + golden-runner op de échte productie-prompt (`eval:lp-variant-golden`, prompt-only CI-safe + `--live`) + flatten-hygiëne (asset-key-suffixes, FAQ q→a-volgorde, judge-variant met sectielabels). **Empirische verificatie**: re-score-batch van 8 bestaande variants met live judge: composite 72.9 (was 63.0), judge 79.3 (was 46.2), 6/8 boven drempel — vóór enige nieuwe copy-generatie. tsc+lint 0; nieuwe smoke `smoke:lp-text-quality` 48/48; web-page-builder suites (phase6 35/35, phase6.2 14/14, phase10 40/40) groen.

**Adversariële review (4 dimensies + verificatie) → 4 majors gefixt vóór commit:** (1) brand-vocab-whitelist ontbrak in de rewrite-paden — dezelfde prompt zei "gebruik 'naadloos'" én "vermijd 'naadloos'", en STRICT keep-if-better beloonde het strippen van merkwoorden → whitelist nu op alle detector-call-sites; (2) silent-iterate's fire-and-forget settings-persist racete met de finale variant-write (clobber-klasse gotcha 2026-06-09) → `skipPersist`-optie in runFidelityScoring; (3) de locale-fix flipte LP-generatie naar Engels voor 3 NL-workspaces op de nooit-bewust-gezette DB-default `contentLanguage='en'` (incl. Zwarthout) → data-fix naar 'nl'; (4) de variant-targets raakten ook studio-paden die full component-text (~1450 w) scoren → `resolveScoringWordCountOverride` (webpage-scoped F33) op auto-iterate-trigger + integration-rescore, overige types byte-identiek. Plus minors: whitelist word-boundary i.p.v. substring, author-schema tolerant voor ontbrekende velden, AICall-tracking ge-await (serverless-safe), golden-yaml flake-mitigatie, backup-JSONs gegitignored.

- Audit/plan: `docs/audits/2026-06-10-lp-text-quality-fidelity.md` · Task: `tasks/lp-text-quality-fidelity.md`
- Commit: branch `feat/lp-text-quality-fidelity`


### 315. Compose-pipeline deblokkeerd — dode Gemini-model + relatieve ref-URL gefixt

Tijdens de end-to-end browser-verificatie van #314 bleek de compose-generatie zelf door twee **pre-existing** bugs volledig kapot (los van de hero-wiring-fix): (1) **dood Gemini-model** — `gemini-2.5-flash-image-preview` geeft sinds de GA-release een **404 NOT_FOUND** van Google (de `composeFromImages`-call in `gemini-client.ts` + de `COMPOSE_MODEL`-constanten in de compose- en refine-visual-routes), die de client als generieke "Network error reaching Gemini" maskeerde → vervangen door de GA-opvolger `gemini-2.5-flash-image`. (2) **relatieve reference-URL** — `fetchImageAsInlineData` deed `fetch('/uploads/media/…')` op de MediaAsset-URLs, wat server-side niet parsebaar is bij local-disk-storage (dev) → relatieve paden worden nu tegen `BETTER_AUTH_URL` geresolved (absolute CDN/S3-URLs in prod blijven ongewijzigd). Na beide fixes draait de volledige compose-flow end-to-end: een echte Gemini-compositie (Linfi-vloerluik, 832×1248) gegenereerd uit 3 library-refs + instructie, geüpload, en via de #314-fix gewired in `puckData.BrandHero` (heroVisualUrl ging van `null` → de compositie). tsc+lint 0; 72 web-page-builder smokes groen. Verificatie-harness `scripts/dev/run-compose-render.ts` (gesigneerde sessie-cookie + workspace-cookie → echte route → DB-check).

- Commit: branch `fix/compose-pipeline-model-refurl`

### 314. Image-source follow-up — compose + trained-style werkend in LP Step 2 (hero-wiring)

De compose- en trained-style image-bronnen waren dubbel kapot in de landingspagina-flow: (1) **source-gate 400** — `visualBrief.source` werd nooit gepersisteerd (alleen lokale tab-state), dus de server-routes weigerden met "switch to compose/trained first"; (2) **orphaned hero** — anders dan `generate-visual` misten `generate-visual-compose`/`-trained` de server-side `target:'hero'`-wiring, dus het gegenereerde beeld belandde als `DeliverableComponent` maar nooit in `puckData.BrandHero.heroVisualUrl` → de pagina bleef zonder header-foto. **Fix:** (1) de pickers' force-flush PATCH zet `visualBrief.source` nu expliciet ('compose'/'trained-style', ge-await vóór generate → de route leest de verse source) + de LP `onSourceChange` persisteert de source op tab-klik + de force-flush checkt nu `response.ok` zodat een PATCH-fout niet als misleidende generate-400 maskeert. (2) de atomische hero-patch is uit `generate-visual` geëxtraheerd naar een gedeelde `patchHeroVisualUrl`-helper (`src/lib/deliverable/patch-hero-visual.ts`, met pure+geteste `applyHeroUrlToSettings`-kern); compose + trained accepteren nu `target:'hero'` in hun `.strict()`-schema en roepen de helper post-upload aan — één server-side codepad op het smalste punt (per de orphaned-hero-LESSON). Backward-compat: `target` is optioneel/additief; niet-LP-callers (social-content) sturen 'm niet → helper draait niet. **Adversarieel gereviewd** (3 reviewers → 27 findings, 2 echt: force-flush `response.ok`-check toegevoegd; pre-existing settings-blob-RMW-race gedocumenteerd). tsc+lint 0 (geen nieuwe warnings); 72 web-page-builder smokes + nieuwe `phase68-hero-url-wiring` (13/13). **End-to-end browser-verificatie (compose/trained met echte AI-call) staat nog open.**

- Commit: branch `fix/image-source-compose-trained-hero`

### 313. Step 2 P4 — uniforme error-messaging + fidelity-race-guard + dead-code

Laatste hardening-stap van de Step 2-arc, drie sub-taken. (1) **Uniforme error-messaging**: alle Step 2-feedback (brief-incompleet, genereren, generatie-fout, auto-iterate, partialDelivery, hero-visual loading/fout, variant-keuze-fout, sectie-regen) loopt nu via de gedeelde `InfoBox`-primitive (severity-kleur + icon + `role`), met een nieuwe optionele `onDismiss`-prop (X-knop) voor transiënte banners; de lokale `ErrorBanner` is weg. Auto-iterate splitst echte fouten (`autoIterateError`) van informatieve meldingen (skipped/no_improvement blijven `info`), en variant-wissel reset de feedback (`selectVariant`) zodat variant B nooit A's melding toont. (2) **Fidelity-race-guard**: een per-variant write landt alleen als zijn generation-token nog actueel is voor die index (`bumpFidelityToken` + `shouldApplyFidelityWrite` in de store) — een trage/stale score-fetch na variant-wissel, regeneratie of reset wordt gedropt; een **globale monotone token-seq** (overleeft reset) voorkomt cross-generatie-collisie; `FidelityScoreBar` toont nooit meer variant-0's score op een andere variant. Orchestrator-pad blijft ongegate (backward-compat). (3) **Dead-code**: `VariantWorkspace` + `VariantCard` (cascade) + de nooit-gedispatchte `LandingPageVariantPreview` verwijderd (de levende `LandingPagePreview` blijft). **Adversarieel gereviewd** (3 reviewers → 30 findings, 6 echt): token-reset-collisie (→ globale seq), `autoIterateMsg` niet-dismissbaar + variant-switch-leak gefixt. tsc+lint 0 (geen nieuwe warnings); 71 web-page-builder smokes + nieuwe `phase67-fidelity-race` (15/15).

- Commit: branch `feat/lp-step2-p4-hardening`

### 312. Step 2 P3a — configureerbaar aantal landingspagina-varianten (1-4)

Het aantal varianten was vast op 2; nu kiest de user 2/3/4 via een segmented-selector bij de regenereer-knop (eerste auto-run blijft 2 → bestaand gedrag + kosten). De keten is end-to-end N-aware gemaakt: `generateLandingPageVariantBatch(count)` met `variantTemperatures(count)` (gespreide temps, geen clustering) + `fallbackAxes(count)` (N onderling-divergente CRO-assen: 3=+story-led, 4=+data-led+emotional — uit de al bestaande `VariantAxis`-set, geen prompt-wijziging), en `generateCreativeAngles(stack, type, count)` genereert N angles (system-prompt/JSON-schema/sanitisatie geparametriseerd; default 2 → `canvas-orchestrator` backward-compatible). De UI is N-proof: `accentFor(i)` (emerald/violet/blue/amber via **inline-style hexes** i.p.v. purge-gevoelige Tailwind-klassen — CLAUDE.md-gotcha), dynamische grid (`gridTemplateColumns`), `variantLabel`-fallbacks, geclampte actieve index, count-aware partial-banner + spinner. **Adversarieel gereviewd** (3 reviewers → 36 findings, 4 echt): count-validatie gehard tegen non-integer/string-input (float `2.5`/`"2"` glipte door `>=1 && <=4` maar miste downstream `===` → batch-size-mismatch) op route én generator-guard; a11y aria-live voor de actieve-variant-score. tsc+lint 0; 70 web-page-builder smokes + nieuwe `phase66-variant-count` (28/28).

- Commit: branch `feat/lp-step2-p3a-configurable-count`

### 311. Step 2 P3b — dynamische creative-angles per landingspagina-variant

De twee variants kregen tot nu toe een vaste, generieke divergentie-as (problem-led vs benefit-led). Nu vraagt de route eerst `generateCreativeAngles(ctx, contentType)` (Gemini Flash, best-effort, exact 2 of `null`) — brand-/context-specifieke tegenpool-invalshoeken met leesbare labels — en geeft die aan `generateLandingPageVariantBatch` mee. Per slot bepaalt een `slotParams(i)`-helper of de variant op een **angle** (hard-constraint `CREATIVE ANGLE`-blok in de system-prompt, axis onderdrukt) of op de generieke axis-fallback draait; zowel de parallelle poging als de recovery-retry gebruiken dezelfde slot-params, en een per-slot guard valt terug op de axis als een angle onverhoopt ontbreekt (geen crash). De labels (`angleLabel`) reizen mee terug via het result → route-respons → UI, worden gepersist in `settings.structuredVariantLabels`, en sturen de thumbnail-, detail- en auto-iterate-labels (`Variant A — <angle>`); bij `null` valt de UI terug op conservatief/creatief. Bij angle-failure draait alles ongewijzigd door op de oude axis-split. tsc+lint 0; 69 web-page-builder smokes + nieuwe `phase65-variant-angle-prompt` (9/9, angle-wint-van-axis + fallback) groen.

- Commit: branch `feat/lp-render-step23-provenance-hero-angles`

### 310. Orphaned-hero clobber-guard — gegenereerde header-image blijft betrouwbaar gewired

Root-cause-fix (audit 2026-06-08) voor een Napking-LP waarvan de gegenereerde + geüploade hero-image nooit in `puckData.BrandHero.heroVisualUrl` belandde terwijl feature-foto's wél wirede. Twee compounding oorzaken in `PuckPageBuilder.tsx`: (1) het re-hydrate-effect overschreef een net-gewirede hero met een stale `/context`-refetch die de BrandHero nog leeg had → nieuwe pure helper `preserveHeroVisual` (`hero-visual-preserve.ts`) behoudt een non-lege hero-URL wanneer de inkomende tree leeg is (nieuwe URL én echte clear passeren wél); (2) de self-heal zette zijn ref-guard onvoorwaardelijk vóór de async image-gen → één stille fout blokkeerde élke retry, nu gereset in de catch. Dev-recovery-tool `scripts/dev/wire-orphaned-hero.ts` hergebruikt een bestaande orphaned `DeliverableComponent variantGroup='visual'`-URL i.p.v. opnieuw te genereren. Lesson in `gotchas.md`. tsc+lint 0; nieuwe `phase61-hero-clobber-guard` smoke 7/7 (preserve / new-URL / echte-clear-passeert).

- Commit: branch `feat/lp-render-step23-provenance-hero-angles`

### 309. Provenance-consumptie smoke — bewijst dat de renderer brandProvenance threadt

Sloot een dekkingsgat uit de audit 2026-06-07: phase40–51 + `brandstyle-provenance.ts` dekken de extractie en de gate-input (`isScrapedOrigin`), maar geen smoke bewees dat `buildSpikePuckConfig` de provenance daadwerkelijk naar de renderer threadt én dat de elevation-gate (`forceFlatCards && !elevationIsScraped`) de output verandert — precies de tak die merk-fidelity boven archetype-aanname zet (Zwarthout/Napking preset-bugklasse). Nieuwe `phase60-provenance-consumption` smoke bouwt een fixture mét `brandProvenance` en assert de scraped-override-tak. Gewired in `package.json` (`test:brandstyle-eval` + `smoke:provenance-consumption`) + de `brandstyle-eval` CI-workflow. tsc 0; 11/11.

- Commit: branch `feat/lp-render-step23-provenance-hero-angles`

### 308. Step 2 preview-layout — leesbare thumbnails + detail + selectie drijft score

User-feedback op P1a: de twee side-by-side full-page previews (grid-cols-2, ~0.34 scale) waren onleesbaar, en de variant-selectie voor de fidelity-score (losse pill-toggle) was niet vindbaar. Herzien naar **thumbnails + detail**: een rij klikbare A/B-thumbnails (`VariantPuckPreview` met `maxHeight` = bovenkant van de pagina) waarmee je in één oogopslag vergelijkt én selecteert; de actieve thumbnail drijft nu de **fidelity-score, auto-iterate én** de detail-weergave. Daaronder één **full-width, leesbare** detail-kaart van de geselecteerde variant (preview op ~0.745 scale in een 560px-venster met interne scroll), met bewerken/per-sectie-regenereren (P1b/P1c) + "Kies". `VariantPuckPreview` kreeg `maxHeight` (thumbnail-cap) + `scroll` (leesbaar venster). Lost de twee gemelde issues (onleesbaar + selectie). tsc+lint 0; 67 web-page-builder smokes groen; detail-leesbaarheid visueel geverifieerd.

- Commit: branch `fix/step2-preview-thumbnails-detail`

### 307. Step 3 P2b — feature-beeld-transparantie + retry (landingspagina)

Vervolg op de Step-2-audit (W7: feature-beeld-budget 4 + 60s-timeout vielen stil terug op icons, zonder feedback welke). De Puck-builder (Step 3) detecteert nu features die als icon renderen (FeatureGrid/FeatureSplit zonder `imageUrl`) en toont een **opt-in** knop "N features zonder beeld" (geen waarschuwing — icon-design kan gewenst zijn). Klik genereert de ontbrekende beelden via `generateFeatureVisuals` (prompts uit de nu gedeelde `buildFeatureVisualInstruction`, geëxtraheerd naar `landing-page-visual-prompts.ts` zodat confirm-flow + Step 3 identieke prompts geven) en patcht de puckData **immutable** (alleen gewijzigde componenten + features-arrays gekloond) + persisteert + dispatcht `canvas:refresh-deliverable`. Toont "X/N gegenereerd" bij gedeeltelijk succes. tsc+lint 0; 67 web-page-builder smokes groen. **Hiermee is P2 (a+b) compleet; resteert P3 + P4 uit het verbeterplan.**

- Commit: branch `feat/step3-feature-image-retry`

### 306. Step 2 P2a — auto-iterate before/after-diff + iterate-tot-threshold (landingspagina)

Vervolg op de Step-2-audit (W5: auto-iterate was one-shot + opaak). "Verbeter variant automatisch" itereert nu **tot de drempel** (max 3×): elke iteratie voert het vorige resultaat terug en stopt zodra de fidelity-score ≥ drempel of niet verder verbetert (toont "Iteratie 2/3 — score …"). De uitkomst wordt **niet meer blind toegepast** maar als **voorstel** getoond: score before→after + een per-veld **before/after-diff** (nieuwe pure util `diffVariantCopy`, `src/lib/landing-pages/variant-copy-diff.ts`) met Toepassen/Verwerpen. Pas bij Toepassen wordt de variant vervangen + herscoord. tsc+lint 0; phase64 diff-smoke 9/9; 67 web-page-builder smokes groen.

- Commit: branch `feat/step2-auto-iterate-diff`

### 305. Step 2 P1b + P1c — per-sectie regenereren + tone/length-microtransforms (landingspagina)

Vervolg op de Step-2-audit (W2 + W3). **P1b — per-sectie regenereren**: `auto-iterate-variant`-route accepteert nu een optionele `section` (hero/trust/problem/features/socialProof/pricing/faq/finalCta); bij section-scope krijgt het een sectie-specifieke prompt-instructie, slaat het de "above-threshold"- + "no_improvement"-gates over (het is een expliciete regenereer-actie, geen auto-improve), en dwingt het de scope server-side af via een merge die ALLEEN die sectie vervangt (fallback op de originele sectie als de AI 'm wegliet → nooit `undefined` mergen). UI: een ↻-knop per sectie-header in `VariantCompareCard` (hero/problem/features/socialProof/faq/finalCta) werkt de lokale variant bij — gemerged in de laatste state zodat gelijktijdige edits aan andere secties overleven (geen clobber); de WYSIWYG-preview (P1a) werkt direct bij. **P1c — tone/length-microtransforms**: elk bewerkbaar veld krijgt in edit-mode Korter/Urgenter/Brand-voice-knoppen die de bestaande `useInlineTransform` (→ `inline-transform`-route, brand-voice-aware) hergebruiken; `deliverableId` via een `EditDeliverableCtx` (geen per-veld-prop). Adversariële review (6 dimensies) → 3 fixes toegepast (undefined-merge-fallback, regenerate-clobber-race via `vRef` + sectie-merge, skipped/no_improvement-afhandeling). tsc+lint 0; 66 web-page-builder smokes groen.

- Commit: branch `feat/step2-section-regen-microtransforms`

### 304. Step 2 P1a — WYSIWYG-preview per landingspagina-variant

Uit de Step-2-functionele audit (`docs/audits/2026-06-07-step2-functional-linkedin-vs-landingpage.md`): de landingspagina-Step-2 was functioneel armer dan de social-Step-2 — je bewerkte "blind" een tekstformulier en zag de echte pagina pas in Step 3 (W1). Nu rendert elke A/B-`VariantCompareCard` een **echte (geschaalde) Puck-preview** via dezelfde renderer als Step 3 (`buildSpikePuckConfig` + `variantToPuckDataFromStructured` + `<Render>`), passend op de kaart-breedte (`transform: scale`, gemeten via ResizeObserver), niet-interactief (`pointer-events:none`). De preview rendert uit de live `v`-state → veld-edits werken direct bij; het tekstformulier staat nu ingeklapt onder de preview (preview-first), de sticky "Kies deze variant"-knop blijft. Brand-fonts via `useBrandFontLoader`; a11y-style-block geïnjecteerd. Hero toont nog geen foto (die wordt bij de keuze gegenereerd) — wel echte layout/branding/typografie/kleur-banden/CTA-stijl. tsc+lint 0; visueel geverifieerd (2-up scaled cards, Napking).

- Commit: branch `feat/step2-wysiwyg-variant-preview`

### 303. Hero-image server-side gewired (einde client-race) — Napking + alle merken

De header-foto bleef leeg op opnieuw een merk (Napking): de hero-`canvas-visual` werd wél gegenereerd + geüpload (~21:30, nieuwste code) maar nooit in de puckData gebust (deliverable `updatedAt` onveranderd → de client-side persist landde niet). Root cause-klasse: de hero werd CLIENT-side gewired (confirm-flow + self-heal) wat structureel onbetrouwbaar is (re-hydrate-clobber + stale HMR over merges). **Fix: hero-wiring verplaatst naar de server.** De `generate-visual`-route accepteert nu `target: 'hero'` en bust ná een geslaagde upload de eerste URL ATOMISCH in `settings.puckData` (BrandHero) + `structuredVariant.hero` (read-modify-write op een verse settings-read). De server is de enige DB-autoriteit → dit landt gegarandeerd, onafhankelijk van client-races of HMR-staleness. Self-heal + confirm-flow geven nu `target:'hero'` mee; de self-heal dropt z'n client-PATCH en dispatcht alleen nog `canvas:refresh-deliverable` om de store te re-syncen. Immediate fix voor de bestaande Napking/BB-pagina's: bestaande canvas-visual via `scripts/dev/patch-hero-image.tsx` gewired. tsc+lint 0.

- Commit: branch `fix/hero-server-side-wiring`

### 302. generate-visual route robuust: upload-resilience + non-fatale persist (hero-betrouwbaarheid)

Vervolg op de header-foto-bug. Onderzoek (n.a.v. "orphaned canvas-visual-files op disk + 0 `DeliverableComponent variantGroup='visual'`-rows"): de 0-rows zijn NIET abnormaal — veel deliverables met een wérkende hero hebben óók 0 visual-rows (de hero leeft in `puckData.heroVisualUrl`, niet in DeliverableComponent). Write-path-probe bevestigde dat de `create()` valide is met de huidige Prisma-client. De échte fragiliteit zat in twee plekken die een geslaagde generatie alsnog beeldloos lieten eindigen: **(1)** de upload-loop was een kale `Promise.all` — faalde één download/overlay/upload, dan rejecte het geheel → de andere al-geüploade varianten werden georphand én de hele request 500'de (→ client kreeg geen URL → lege hero). Nu per-item try/catch + filter; 502 alleen als ÁLLE uploads falen. **(2)** een transient `prisma.$transaction`-fout 500'de de hele route → client kreeg geen `variants[0].url` → lege hero. Nu non-fataal: bij persist-fout retourneert de route tóch de geüploade URLs (zonder DB-id) zodat de hero alsnog landt; fidelity-scoring skipt de id-loze fallback-rows. Adversariële review: response-shape blijft geldig in alle paden, geen variabel-conflict. Plus eerdere fixes: hero self-heal await't de PATCH + dispatcht `canvas:refresh-deliverable` (clobber-race, PR #32). tsc+lint 0.

- Commit: branch `fix/generate-visual-robustness`

### 301. LP-render: contrast-veilige achtergrond-afwisseling tussen secties

User-eis: ritmiek in de LP zodat onderdelen visueel te onderscheiden zijn — zónder de valkuil van een bg-wijziging die de contrastratio breekt. Voor lichte merken renderde bijna elke sectie op `tokens.surface` (wit) → vlak. Nu: een `bandTone` ('base'|'alt') die de builder afwisselend toekent aan de "vlakke" secties (FeatureGrid/FeatureSplit/RichText/FAQ/PricingTable/StatsBlock) in finale volgorde (Hero/Testimonial/CTA/Footer hebben hun eigen distinctieve bg). De renderer leidt de sectie-bg af via `sectionBandBg(tokens, bandTone)` — 'alt' = een gescrapete `secondarySurface` (LINFI: cream) of anders een subtiele tint (surface 6% richting onSurface) — en **resolvet ALLE tekst/borders tegen die band-bg** i.p.v. de voorheen hardcoded `tokens.surface` (de contrast-valkuil): de audit-map (9 sectie-renderers) wees per sectie elke hardcoded-surface-referentie aan; FAQ/RichText/FeatureSplit/Pricing/StatsBlock/FeatureGrid alle omgezet (incl. de truly-flat FeatureGrid-cardBg → band, StatsBlock label/border dynamisch). Bestaande pagina's (gepersist vóór de feature) krijgen de bands alsnog via een idempotente normalisatie (`assignSectionBands`/`withSectionBands`) bij hydratie in `PuckPageBuilder` — geen regeneratie nodig. Cross-brand geverifieerd via render-harness (Better Brands neutraal-grijs, LINFI cream, Zwarthout grijs + dark-stats + peach-testimonial), alle tekst leesbaar. Deterministische contrast-garantie: phase63 (18/18 — alt-band houdt body-tekst AA voor light+dark surfaces; alternatie zonder twee gelijke buren). tsc+lint 0; 65 web-page-builder smokes groen (phase18-assertie geüpdatet: hero-CTA letterSpacing volgt nu tokens.button i.p.v. archetype-preset).

- Commit: branch `fix/lp-section-band-alternation`

### 300. LP-render: header-image-garantie + CTA conform brandstyle button-component + preset-audit

Vier Better Brands-bevindingen + een systeemaudit. **(1) Header-image altijd** — de hero-AI-gen draaide alleen in de Step 2-confirm-flow met een 45s-timeout; bij timeout/fout bleef de hero leeg. Nu: Step 3 **self-heal** in `PuckPageBuilder` (genereert + persisteert het beeld alsnog zodra de Medium-preview een BrandHero zónder beeld toont; één poging per deliverable per sessie) + confirm-flow gehard (45s→75s + 1 retry); `buildHeroVisualInstruction` geëxtraheerd naar gedeelde lib. **(2) CTA-knop zichtbaar + doel-URL** — een translucent scraped fill (`rgb(255 255 255 / .1)`) rendert onzichtbaar → `colorAlpha`/`isWeakButtonBackground` + `resolveCtaFill` vallen terug op de merk-accent; de bestaande Step 1-input `landingPageUrl` werd nooit naar de gerenderde `href` gebust (hardcoded `#`) → `resolveCtaHref` in beide builders, hero-CTA wordt navigerende `<a>`. **(3) CTA conform component** — `tokens.button` werd afgeleid uit de ruwe `buttonProfile` (kleur-only primary, geometrie verloren aan presets); nu reconcilieert `reconcileButtonWithComponent` met de accurate `StyleguideComponent` BUTTON-card (computed-style) → radius/border/gewicht/padding/grootte 1-op-1 als de Components-tab, voor élk merk. `resolveCtaVisual` respecteert outline (Better Brands/LINFI) vs filled (Zwarthout oranje, DTS blauw); hero+slot uit één bron. **(4) contrastRatio robuust** — normaliseert nu niet-6-hex kleuren (`rgb()`/space-syntax/named) — voorheen werd `rgb(255,255,255)` als zwart gemeten → witte tekst op een witte knop (LINFI). **Audit** `docs/audits/2026-06-07-archetype-preset-vs-scraped-audit.md`: buttons waren het enige geval waar een preset beschikbare accurate scraped data overschreef; resterend risico is structureel (FORM_INPUT latent + archetype-classificatie-afhankelijkheid). Cross-brand geverifieerd; tsc+lint 0; 63 web-page-builder smokes + phase61 (31/31) + phase62 (16/16) groen.

- Commit: branch `fix/lp-hero-sections-cta`

### 299. LP-render: single-image afdwingen + systematische contrast-borging + CTA-redesign

Drie user-bevindingen op de live Zwarthout-LP. **(1) Eén volledige afbeelding** — de AI-hero was een 3-panel collage/triptiek. `DEFAULT_NEGATIVE_SEGMENTS` (negative-prompts) uitgebreid met collage/triptych/diptych/split-screen/multi-panel/grid/borders/seams (geldt voor álle image-gen), + expliciete "A SINGLE cohesive full-frame photograph"-instructie in `buildHeroVisualInstruction` + `buildFeatureVisualInstruction`, + `negativePrompt` doorgegeven in de feature-visuals-route. **(2) Systematische contrast-borging** — nieuwe `safeHeadingColor(scraped, accent, onSurface, bg)` (accent-reservering + gegarandeerde contrast-clamp in één) toegepast op de tot dan ongeclampte kop-sites (FAQ-vraag, pricing-tier, RichText h1/h2/h3) — een lichte gescrapte kop-kleur op een lichte sectie werd onleesbaar (de FAQ-klacht); RichText-body ook geclampt (`readableTextColor`). Elke kop/body is nu contrast-geclampt, ongeacht klant. **(3) CTA-redesign** — de slot-CTA is nu een CONTAINED gebrande panel (donker-merk → donkere cinematische panel; light-merk → zachte brand-tint) met de merk-accent-knop (geen vibrant→charcoal-downgrade meer) i.p.v. losse tekst+donkere-knop op een leeg wit vlak. Cross-brand geverifieerd (Zwarthout/LINFI/Better Brands): FAQ leesbaar + CTA-panel adapteert dark/tint + accent-knop popt. Smoke phase59 (23/23, +5 contrast-guarantee-asserties); tsc+lint 0; sweep groen.

- Commit: branch `fix/lp-image-contrast-cta`

### 298. LP-render bugfix: hero-foto onzichtbaar (background-shorthand wist background-image op de client)

De hero-`<section>` zette in hetzelfde inline-style-object zowel de `background`-shorthand (dróeg de foto+scrim) ALS een `backgroundImage`-longhand die naar `undefined` resolvede. React's **client**-render past de shorthand toe en wist daarna `background-image` via de undefined longhand → de hero-foto verdween (witte kop op transparante/lichte sectie = onleesbaar). **SSR maskeerde het** (`renderToStaticMarkup` laat undefined uit de geserialiseerde style weg) — daardoor toonde elke server/harness-render de foto wél en leek alle data/serving/CSP correct. Fix: alleen longhands (`backgroundColor` + `backgroundImage` + `backgroundSize`/`Position`), nooit de shorthand ernaast. Root-cause + fix bewezen via Playwright (`getComputedStyle().backgroundImage`: buggy=`none`, fixed=`url(...)`). De feature-`<img>`-tags hadden het conflict niet en werkten al. tsc+lint 0; web-page-builder-sweep groen; gotchas-entry toegevoegd (klasse: meng nooit background-shorthand + longhand in React inline-style; verifieer render-bugs in een echte browser, niet alleen SSR).

- Commit: branch `fix/hero-background-image-shorthand`

### 297. Governed token-layer: provenance (V1–V5)

Provenance als first-class concept op de brandstyle/LP-token-laag, afgeleid van de Anthropic self-service-analytics les (één governed bron + herkomst bij elk antwoord + curatie op onzekerheid). **V1 (keystone)**: nieuwe `token-provenance.ts`; `extractBrandTokensWithProvenance` stempelt per kern-token de herkomst (scraped/logo/preset/fallback/derived)+confidence+bewijs tijdens het resolven (backward-compatible wrapper houdt `extractBrandTokensFromStyleguide`); doorgethread via `CanvasContextStack.brandProvenance`. Provenance is in-memory (deterministisch uit de styleguide), niet gepersisteerd. **V2**: `isScrapedOrigin()`-gate op `forceFlatCards` — archetype mag een echt-gescrapte card-shadow niet meer platslaan (de rest van de renderer deed al scraped-first). **V3**: user-facing data-quality-badge in `StyleguideHeader` ("N onzeker", via `data-quality.ts`) + developer-only `TokenProvenancePanel` op de LP-render (useDeveloperAccess-gated). **V4**: `BrandOnboardingWizard` onzekerheid-first — fallback/low-confidence kleuren+fonts bovenaan met gerichte jump (inline-edit + color-lock bewust gedescoped: `*Override`-flags beschermen profielen niet kleuren). **V5**: `[DET]` eval-suite `scripts/smoke-tests/brandstyle-provenance.ts` (24 asserts) + `npm run test:brandstyle-eval` + CI `.github/workflows/brandstyle-eval.yml` (ablation-per-PR op brandstyle/LP-paden). tsc 0; lint 0 errors; DET 24/24. **NB**: `canvas-context.ts` (V1) + `puck-config.tsx` (V2) belandden al op main via #25 door een parallelle-sessie `git add` in dezelfde werkboom; deze commit repareert main (de gecommitte imports verwezen naar de toen-nog-untracked `token-provenance.ts`).

- Audit: [docs/audits/2026-06-06-governed-token-layer-verbeterplan.md](audits/2026-06-06-governed-token-layer-verbeterplan.md)
- ADR: -
- Commit: 538ab8e5

### 296. Brandstyle: visualLanguage beschrijft resolved palette (Bootstrap-pollutie weg)

De visualLanguage-analyse (`colorApplication`/`promptFragment`/`summary`) draaide vóór de palette-resolutie en kreeg de rauwe gescrapte kleuren (`colorGroups.fromVariables/byFrequency`) incl. framework-defaults. Op een Bootstrap-site lekte zo `#7A00DF` paars als "primary" + de Bootstrap-semantiek in `promptFragment` — die via `brand-context.brandVisualLanguage` ALLE AI-generatie voedt (+ in de brandstyle-UI/PDF toont) — terwijl het resolved palet correct PRIMARY `#E06000` had. **Fix**: de `analyzeVisualLanguage`-call verplaatst naar ná `resolveColors` + usage-filter + `demoteAchromaticPrimary` + `capNeutrals`, gevoed met de definitieve resolved palette rol-gelabeld ("PRIMARY #E06000", "NEUTRAL #212529"); de prompt instrueert de AI expliciet alleen die kleuren te gebruiken. Live geverifieerd (Anthropic): output beschrijft "PRIMARY orange (#E06000) only for buttons/CTAs" + wit/charcoal achtergronden, ZERO Bootstrap-lek. tsc+lint 0; web-page-builder-sweep + brandstyle-provenance (24/24) groen. **Geldt voor toekomstige scrapes**; bestaande styleguides hebben de oude visualLanguage tot een (destructieve) re-scrape.

- Commit: branch `fix/visual-language-bootstrap-pollution`

### 295. LP-render AI-feature-beelden (P2 voltooid, budget 4/pagina)

Het laatste verbeterplan-gat: merken ZONDER bronbeeld (zwarthout, `brandImages=null`) krijgen nu AI-gegenereerde materiaal-/in-context-beelden op hun feature-cards → editorial FeatureSplit (P7) i.p.v. de icon-grid. Nieuwe lean route `POST /api/studio/[id]/generate-feature-visuals` (genereert per prompt, max 4, één beeld via fal.ai — hergebruikt model-selectie + brand-style-anchors + storage-upload; apart van generate-visual zodat de hero-picker onaangeroerd blijft). `canvas.api.generateFeatureVisuals` wrapper + `buildFeatureVisualInstruction` (per-feature materiaal-shot-prompt). `handleChooseVariant` hanteert beeld-prioriteit **handmatig > brandImages > AI**: brandImages-producer eerst, dan AI-gen voor lege hero/feature-slots (budget 4, 60s-race, best-effort). Partiële vulling valt terug op FeatureGrid die de geslaagde beelden als kaarten toont (geen discard — adversariële review-response). Gen-core live geverifieerd (fal.ai nano-banana-pro): 4/4 charred-timber feature-beelden voor zwarthout, gerenderd in de FeatureSplit. Smoke phase60 (19/19); tsc 0; lint 0 errors; sweep groen. **Hiermee is het volledige LP-design verbeterplan (12 principes + card-fix) geland.** Volledige browser-flow van de auth'd route = gebruikers-verificatie (net als hero-gen #290).

- Commit: branch `feat/lp-ai-feature-images`

### 294. LP-render P2 beeld-producer + P7 editorial split-layout

De laatste verbeterplan-tracks. **P2 (beeld-producer)**: `assignBrandImagesToVariant` vult lege hero/feature-beeld-slots met de brand-eigen `brandImages` (uit `BrandStyleguide.brandImages`, nu via canvas-context in de ctx) — merken MÉT bronbeeld krijgen echte foto's i.p.v. placeholders; alleen lege slots, in volgorde. `parseBrandImages` tolereert het scalar/null Json-veld + weert malformed URLs. **P7 (split-layout)**: nieuw `FeatureSplit`-component — features als editorial A-B-A-B volle-breedte rijen (beeld/tekst afwisselend per rij) i.p.v. een 3-koloms grid; de mapper kiest FeatureSplit wanneer ALLE features beeld dragen, anders FeatureGrid. **Cross-brand visueel geverifieerd**: Adullam (7 echte brandImages → hero + split-rijen met echte foto's), Zwarthout (placeholders → split); merk zonder bronbeeld = no-op. Adversariële review: SHIP (geen CRITICAL/WARNING; 1 NIT — URL-validatie — gefixt). Smoke phase60 (17/17); phase2 11→12 componenten; tsc+lint 0; sweep groen. Resterend P2: AI-per-feature-gen voor merken zonder bronbeeld (generateImage-infra bestaat; per-feature-gen = kosten/latency-keuze).

- Commit: branch `feat/lp-p2-p7`

### 293. LP-render copy-laag (P1/P4/P11): descriptieve header + PAS-binding + laagdrempelige CTA

De content-engine-laag van het verbeterplan in de variant-generator-prompt (`src/lib/landing-pages/variant-generator.ts`). **P1**: hero-headline van "benefit-led, max 44" → DESCRIPTIEF (noem WAT je verkoopt + differentiator, slaag voor de 5-seconden-test), aligned op de 60-char schema (prompt zat nog op de stale 44); subhead = believability-line ≤25 woorden. **P4**: feature-pilaren binden terug op de hero-belofte (PAS-narratief: problem → features-bewijs als één doorlopende boog) i.p.v. losse features. **P11**: primaire CTA = laagdrempelige micro-commitment (stalen/demo/adviesgesprek) i.p.v. een zware ask voor een koude lezer. **Geverifieerd via LIVE Anthropic-generatie** (nieuw dev-tool `scripts/dev/gen-lp-variant.tsx`) voor Zwarthout: headline "Verkoold gevelhout dat een leven lang zwart blijft" (50ch), 4 pilaar-bewijzende features, CTA "Vraag stalen aan", objectie-FAQ — gerenderd met de echte AI-copy via de render-harness. Prompt-structuur-smoke phase8 (39/39, +6 asserties); tsc+lint 0. Resterende follow-up: beeld-producer P2 (AI-feature-gen = infra/kosten-beslissing) + A-B-A-B split-layouts P7 (nieuwe componenten).

- Commit: branch `feat/lp-copy-layer`

### 292. LP-render verbeterplan: card-fix + accent-reservering + dark-ritme + measure-cap + trust-badge

De renderer-side tracks uit het deep-design verbeterplan (`docs/audits/2026-06-06-lp-design-verbeterplan.md` DEEL 5) gebouwd + visueel geverifieerd (SSR `<Render>` met echte DB-tokens → Playwright-screenshot; dev-tool `scripts/dev/render-lp-screenshot.tsx`), **cross-brand getest op Zwarthout + LINFI + Better Brands zonder regressies**. **Card-fix**: `isCardContextMismatch` negeert een mis-gescrapte near-black PRODUCT_CARD op een lichte sectie (Zwarthout's zwarte blokken) → sectie-passende styling. **P8 accent-reservering**: `reserveAccentForHeading` maakt accent-gekleurde koppen charcoal en reserveert de accent voor CTA/stats/eyebrow; de primaire hero-CTA draagt nu de accent (contrast-geclampt). **P3/P7/P9 dark-ritme**: de stats-band is een cinematische dark accent-beat voor élk merk met `hasDarkSections`+`darkSectionBg` (was archetype-beperkt). **P12**: RichText body measure-cap 40em + leading 1.6. **P10**: trust-items krijgen een badge-check-icon. Nieuwe smokes phase58 (12/12) + phase59 (12/12); tsc+lint 0; sweep groen; 3-dimensie adversariële review-workflow vóór merge. Copy-laag (P1/P4/P11) + beeld-producer (P2) + layout-alternatie (P7) blijven follow-up (content-engine / AI-gen-infra).

- Commit: branch `feat/lp-verbeterplan`

### 291. LP-render: resterende tracks (E-1/Track 2/E-3) + deep-design verbeterplan

De resterende tracks uit de Zwarthout-audit afgehandeld + een diepgaand best-practice design-onderzoek (4 lenzen / NN/g·Shapiro·CXL·Refactoring UI·Baymard) vertaald naar een verbeterplan. **E-1**: hero-h1 gebruikt de per-rol gescrapte `tbr.display.fontFamily`; `useBrandFontLoader` laadt per-rol display/heading/body/label-families. **Track 2**: per-feature beeld-infra — `imageUrl`-slot op `featureItemSchema`+`FeatureItem`, FeatureGrid rendert een `<img>` (vervangt de icon-badge) wanneer aanwezig, mapper threadt het door (producer = verbeterplan). **E-3**: non-Google font-bronnen — `BrandTokens.fontAssets`+`adobeFontsKitId` (workspace-kit) gedragen door de extractor; de canvas-loader laadt UPLOADED via `@font-face` + ADOBE_FONTS via de gedeelde `injectTypekitCss`, en sluit hun families uit de Google-aanvraag. **Track 6 gereframed**: DB-inspectie toont dat `hasDarkSections` al `true` is (#212529 = `background`+`dark`, L=14,5%); de vlakke hero was de pre-#290 race, niet een extractie-gat → opgelost door #289+#290. Data-quality cross-ref: Zwarthout's `visualLanguage.promptFragment` noemt nog `#7A00DF` purple als primary (Bootstrap-vervuiling → upstream brandstyle-extractie). Verbeterplan: `docs/audits/2026-06-06-lp-design-verbeterplan.md` (12 principes + Top-5 architecturale tracks). Nieuwe smokes phase56 (8/8) + phase57 (13/13), stale phase30-assertie bijgewerkt; tsc+lint 0; sweep (58 smokes) groen.

- Commit: branch `fix/lp-render-remaining-tracks`

### 290. LP-render: AI-hero-image deterministisch (geen kleurblok meer)

De verplichte hero-image werd fire-and-forget gegenereerd ná `onAdvance` → de pagina opende soms zonder foto (kleurblok), en de foto patchte er pas later (of nooit) in. `handleChooseVariant` genereert de hero nu **vóór** de éne persist en vouwt de URL IN de variant → Step 3 rendert de pagina mét de foto (deterministisch). `generateHeroVisualUrl` (puur, returnt URL) gesplitst van `generateHeroVisualFor`; 45s-race-ceiling zodat een hangende image-API de keuze-flow niet blokkeert (bij timeout: pagina zonder foto + duidelijke melding). De eerder onzichtbare `visualError`/`isGeneratingVisual`-state wordt nu getoond in de keuze-view (review-fix). tsc+lint 0; LP-smokes groen.

- Commit: branch `fix/lp-hero-gen-deterministic`

### 289. LP-render (Medium): contrast + typografie-load + ritmiek (Zwarthout-analyse)

Gegenereerde Zwarthout-landingspagina was deels onleesbaar/flets. Audit: `docs/audits/2026-06-06-lp-render-zwarthout.md` (2 workflows / 6 dimensies). Drie tracks: **Track 1 Contrast** (`resolveOnColor` clampt elke tekstkleur tegen de WERKELIJK gerenderde bg, + `normalizeColorToHex` voor gescrapte `rgb()`/3-digit; display/kop 3.0, body 5.0; full-bleed gebruikt scrim-kleur); **Track 3 Typografie laadt** (`stripFontWeightSuffix` "Sen Bold"→"Sen" + 'roboto' uit loader-`SYSTEM_FONTS` + weight-strip); **Track 4 Ritmiek** (preset-`sectionPaddingY` geclampt [40,56], 100vh-hero alleen bij image/placeholder-frame, final-CTA-kop als `BrandCTA.heading`). 2-reviewer: 1 CRITICAL (niet-hex bg→wit-op-wit) + 3 WARNING gefixt. Smokes `phase53/54/55`, stale `phase9/11/18` geüpdatet, sweep groen. (Changelog-entry miste in PR #20 door commit-na-push; code wél gemerged `0d289d2f`.) Gescoped/resteert: Track 2 beeld (zwarthout `brandImages`=null), Track 6 donker-sectie-extractie, E-1/E-3.

- Commit: PR #20 (`0d289d2f`)

### 288. Brandstyle: screenshotter page-load robuust (networkidle-hang → domcontentloaded + capped settle)

De component-screenshotter gebruikte `page.goto(..., waitUntil: 'networkidle')`. Op sites met doorlopende netwerk-activiteit (WordPress-plugins/ads/analytics/polling) settelde networkidle nooit → 30s-timeout → pagina overgeslagen → géén multi-page bulk computed-styles → usage-filter zonder primair signaal (de napking-variantie uit #287's observability).

- **Goto via `domcontentloaded`** (render-blocking CSS is dan al toegepast, hangt niet op continu netwerk) + een **best-effort gecapte settle**: `waitForLoadState('networkidle', 6s)` + `document.fonts.ready` (geracet met 2s-cap) + 400ms — elk niet-blokkerend (`.catch`), dus nooit meer een 30s-hang.
- **SPA-skeleton-guard** (review-fix): is de DOM ná de settle nog < `SPA_SKELETON_FLOOR` (30) elementen, dan één begrensde extra settle (networkidle 4s + 600ms) zodat een client-rendered SPA mid-hydratie geen skeleton laat scannen (en echte merk-kleuren niet als "ongebruikt" gedropt worden).

**Validatie**: live-test napking.nl — nieuwe strategie 1.3s, 553 elementen mét computed color + resolved body-bg (volledige extractie), skeleton-guard vuurt correct NIET op de echte DOM. Adversariële review: SHIP-WITH-FIX (beide fixes — `.catch` op `waitForTimeout` + skeleton-guard — toegepast). tsc 0 / lint 0.

- Commit: branch `fix/screenshotter-load-strategy`

### 287. Brandstyle: 3 gedeferde follow-ups (observed-pairs persist + kleur-mutatie onError + screenshotter-observability)

Drie open punten uit de #17-merge opgepakt:

- **Observed kleurcombinaties blijven behouden bij handmatige edit.** Nieuw `BrandStyleguide.observedColorPairs Json?` (raw fg|bg-paren) wordt bij de scrape gepersisteerd; `recomputeColorPairings` heromapt die observed paren op het BEWERKTE palet via `buildObservedColorPairings` (verwijderde kleur valt vanzelf weg, re-add herstelt), met fallback naar gegenereerd als er geen observed data is (oude styleguides). Voorheen degradeerden de combinaties bij de eerste add/delete naar gegenereerd. Additieve nullable kolom (`db push`), geen backfill.
- **Kleur-mutaties surfacen fouten.** `ColorsSection` toont nu een inline `role="alert"` bij een gefaalde add/delete (volgt het bestaande `ReviewDraftPanel`-idioom: lokale `useState` + `onError`, geen toast) + per-rij delete-spinner/disabled. Voorheen werd een 500 (bv. recompute-throw) stil geslikt.
- **Multi-page no-usage-data observeerbaar.** De usage-filter valt soms terug op de homepage pixel-pass omdat de component-screenshotter geen multi-page bulk-data leverde — eerder stil in 2 van 4 gevallen. 4 log/marker-toevoegingen (env-uit-log, bulk-PRESENT/ABSENT-log, "no bulk gathered"-warn, durable `multi-page-usage` provenance-marker in `frameworks`) maken elk geval traceerbaar. Geen control-flow-wijziging. (.env.local heeft de env aan → de napking-variantie is een runtime networkidle-hang, niet de env.)

**Review** (2 reviewers): 0 CRITICAL / 0 WARNING. **Bewijs**: nieuwe smoke `phase52` 10/10 (delete/re-add re-mapping + fallback); phase43/47/48/49/50/51 groen; tsc 0 / lint 0.

- Commit: branch `fix/brandstyle-deferred-followups`

### 286. Brandstyle palet: neutral-overpopulatie aangescherpt (cap 6 → 4)

Cross-brand controle (betterbrands.nl, een Tailwind-site) toonde 6 distincte grijzen die allemaal écht renderen maar de styleguide overpopuleren. `MAX_NEUTRALS` van 6 → 4: donkerste (tekst) + lichtste (surface) + de **2 meest-gebruikte** mid-grijzen (op `renderedWeight`). De mids worden op werkelijk gebruik gerangschikt — een functionele border-grijs (napking #6B7280) overleeft dus op merite, géén straf voor framework-herkomst, zodat de eerder gemaakte #6B7280-keuze bewaakt blijft. Merk-kleuren onaangeroerd; Zwarthout (2 neutrals) onveranderd.

**Bewijs**: smoke `phase49` 38/38 (betterbrands-achtig 6 → 4, usage-ranked mids, Slate Gray behouden, minst-gebruikte gevallen, greens intact, + her-cap-na-swap); phase47/48/50/51 groen; tsc+lint 0.

**Finalize-review-fix**: `demoteAchromaticPrimary` demote de ex-PRIMARY naar NEUTRAL ná de cap-in-de-filter → `capNeutrals` her-cap't ná de swap (geëxporteerd uit de filter), zodat een redundante near-black niet als 5e neutral binnenkomt en de cap (4) consistent blijft.

- Commit: branch `fix/brandstyle-extraction`

### 285. Brandstyle palet: strenge framework-match tegen "geleende" usage

Napking re-scrape (na #283, vers-herstarte dev-server, mét multi-page usage-data) hield Gutenberg-default **#ABB8C3** vast terwijl WP-admin #007CBA correct viel. Root-cause: #ABB8C3 rendert zélf nergens, maar ligt ~33 RGB van de echt-gerenderde Tailwind-grijs **#9CA3AF** (en ~31 van sage #A2B8A5) — binnen de losse `MATCH_TOLERANCE` (40). Zo absorbeerde de geleakte default het gebruik van z'n buurman → false-`strong` → overleefde de framework-gate. (Diagnose: live curl van napking.nl + afstandsberekening; de re-scrape zélf draaide op verse code na een stale-dev-server-restart.)

- **`renderStrength`** kreeg een optionele `tolerance`-param; **`STRICT_FRAMEWORK_TOLERANCE = 6`**.
- **`keep()`**: een framework-default behoudt mét multi-page-data alléén via een **near-exact** render (strict 6) — geen absorptie meer van een naburige kleur. Een ECHT toegepaste framework-kleur rendert op z'n exacte computed-waarde (dist 0), dus blijft. Zónder multi-page valt het terug op het #283-pixel-pass-gedrag.

**Review** (2 adversariële rondes op de geïmplementeerde code): ronde-1 ving een **severe over-drop** (de strict-only-versie negeerde de pixel-pass in de default-config zónder screenshotter → echte framework-merk-kleuren vielen) + een onder-drop (#ABB8C3 ↔ Bootstrap gray-500 #ADB5BD dist 7) → beide gefixt (pixel-pad hersteld voor no-multi-page; tolerantie 12→6); ronde-2 = SHIP (één narrow framework-only threshold-bias bewust geaccepteerd — een pixel-pad-fallback zou de #ABB8C3-absorptie heropenen).

**Bewijs**: smoke `phase51` 21/21 (incl. strict-match, Regression A pixel-strong-keep, Regression B #ADB5BD); napking-exact verificatie dropt #ABB8C3 in zowel multi-page als pixel-only config; phase47/48/49/50 groen; tsc+lint 0. **Vereist re-scrape Napking** → palet = Ocean Blue + charcoal/soft-white/slate/brown, géén #ABB8C3.

- Task: audit `docs/audits/2026-06-05-brandstyle-cross-brand-palette.md`
- Commit: branch `fix/brandstyle-extraction`

### 284. Brandstyle Typography-fonts-fix: Adobe-CLS-fallback canonicalisatie + geconsolideerd load-pad + weight-consistentie

De Typography-tab presenteerde gescrapte merk-fonts onjuist: Adobe's auto-gegenereerde CLS-fallback-family (`effra-fallback`) lekte als zelfstandige "Secondary/heading"-merkfont (D1), werd als heading-familie gekozen (D2), verscheen als dubbele kaart (D3), laadde inconsistent (D4), toonde de rauwe CSS-stack als label (D5) en de type-scale had gemengde eenheden (D6). Root-cause: de scrape-bron werd niet gecanonicaliseerd vóór de DB-split + twee divergerende font-load-paden.

- **Bron-canonicalisatie (F1)**: `canonicalizeFontFamily` + `dedupeBrandFonts` (pure helpers in `font-fallback.ts`, gedeelde `font-generic-families.ts`) strippen de `[\s-]fallback$`-suffix + generieke families + dedup `X`/`X-fallback`, toegepast vóór de split in `writeResultToDb` én in `selectDetectedFontNames`; `assignRole` + de computed-style-classifier (`normalizeName`) canonicaliseren beide vergelijkingszijden.
- **Extractor + type-scale (F2)**: extractor kiest de eerste *canoniceerbare* family (niet `split(',')[0]`); `normalizeTypeScale` (`type-scale-normalizer.ts`) normaliseert eenheden → rem met veldbehoud (object-spread), BEWUST geen dedup/level-collision (dat brak de size-gedreven `mapTypographyRoles`).
- **Load-pad + display (F3)**: `font-loading.ts` (`resolveFontRender`) + `typography-display.ts` consolideren FontCard + TypographySection op één availability-gedreven pad (substitute in de stack i.p.v. 404'ende Google-link); group-label toont alleen de family-naam; substitute-badge.
- **Weight-consistentie**: gedeelde `weightForLevel(level, scrapedWeight)` zodat Type-Scale- en In-Context-secties dezelfde heading-weights renderen (was 400 vs 700 bij lege scrape).
- **Smoke-suite hersteld**: de `smoke:web-page-builder`-keten was rood door pre-existing failures (gemaskeerd door early-exit op phase2); phase2/18/23/39 gediagnosticeerd (stale-assertie vs intentionele renderer-evolutie) en gefixt → 43/43 groen.

**Review**: 2 adversariële review-rondes (4 agents) → 0 CRITICAL; 2 WARNINGs gefixt (classifier `-fallback`-alignment + `useEffect` `workspaceKitId`-dep); ronde-2 = No issues found.

**Bewijs**: re-scrape Napking geverifieerd via psql (`effra-fallback` weg uit additionalFonts + StyleguideFont; typeScale → rem); nieuwe `smoke:brandstyle-typography` (phase44/45) + volledige web-page-builder-keten exit 0; tsc + lint 0.

- Task: [tasks/done/brandstyle-typography-fonts.md](tasks/done/brandstyle-typography-fonts.md)
- ADR: [docs/adr/2026-06-05-typography-font-canonicalization.md](docs/adr/2026-06-05-typography-font-canonicalization.md)
- Commit: branch fix/brandstyle-extraction

### 283. Brandstyle palet: framework-defaults moeten gebruik bewijzen (geen benefit-of-the-doubt)

Napking re-scrape (na #282) bevestigde PRIMARY = Ocean Blue #008ACF ✓, maar bij een controle tegen de **echte** napking.nl bleken twee framework-leaks: ACCENT "Deep Blue #007CBA" = de **WordPress-admin-kleur** (`--wp-admin-theme-color`, 0× in de gebruikte CSS) en Cool Gray #ABB8C3 = **Gutenberg core-default** ("Cyan bluish gray"). Beide overleefden omdat deze re-scrape géén multi-page usage-data had en `keep()` onbemeten kleuren benefit-of-the-doubt gaf (`!known → keep`) vóór de framework-gate.

- **`isFrameworkOrigin`** uitgebreid met de WP-admin-theme-color-familie (#007CBA/#006BA1/#005A87) — usage-gegate, géén hard-blocklist (blauw kan met corporate-merk-blauw overlappen).
- **`keep()` herordend**: framework-default-kleuren moeten POSITIEF sterk gebruik tonen. Zonder usage-data vallen alléén de **hex-bevestigde geleakte klassen** (`isFrameworkLeakHex` = CMS-neutral-grijzen + WP-admin-blauw); een **saturated framework-default-primary** (Bootstrap #0D6EFD/#20C997) houdt z'n benefit-of-the-doubt (kan een bewuste merk-kleur zijn → geen grayscale). Met usage-data is het gedrag byte-identiek aan vóór deze wijziging.

**Review** (2 adversariële agents): ronde-1 ving een over-drop (de oude reorder grayscale'de Bootstrap-merk-paletten zonder data) → gefixt met de leak-hex-split; ronde-2 op de verfijnde logica = **SHIP** (Leak ⊆ Origin bewezen, with-data-pad onveranderd, structurele bescherming intact).

**Bewijs**: nieuwe smoke `phase51` 14/14 (incl. over-drop-guard #0D6EFD/#20C997 behouden, #ABB8C3/#007CBA gedropt); `phase47` 24/24 (stale "keep-all"-assertie geüpdatet); 48/49/50 groen; tsc+lint 0. Grondwaarheid: napking.nl is WordPress+WooCommerce+Gutenberg+Tailwind (curl bevestigde #007CBA = WP-admin-var, font = Adobe "effra"). **Vereist re-scrape Napking** → verwacht: #007CBA + #ABB8C3 weg.

- Task: audit `docs/audits/2026-06-05-brandstyle-cross-brand-palette.md`
- Commit: branch `fix/brandstyle-extraction`

### 282. Brandstyle palet: brand-PRIMARY uit merk-signaal i.p.v. frequentie

Napking re-scrape onthulde dat de PRIMARY de near-black TEKSTkleur (#1A171B "Deep Charcoal") was, terwijl de échte merk-kleur (Ocean Blue #008ACF — letterlijk genoemd in de logo-guidelines: *"the brand's Ocean Blue (#008ACF)"*) naar ACCENT zakte. Root-cause: de AI-classifier kent PRIMARY toe aan de meest-prominente kleur, en op een merk met een achromatisch wordmark + chromatische accent is dat de ubiquitaire tekstkleur; de logo-pixel-rescue ving het niet (`brandImages` null + een overwegend-zwart wordmark levert via histogram tóch charcoal). Dit was de gedeferde "Fase 4" uit `docs/audits/2026-06-05-brandstyle-cross-brand-palette.md`.

- **`demoteAchromaticPrimary`** (`analysis-engine.ts`, array-niveau spiegel van `reclassifySaturatedNeutral`): demote een achromatische PRIMARY → NEUTRAL en promote de sterkste chromatische merk-kleur → PRIMARY, alléén met POSITIEF merk-bewijs (logo-guideline-vermelding +5, detector/vision-primary +4, vision-cta/accent +2, sterk gebruik +2, core-brand-tag +1; drempel 3 — een losse tag is onvoldoende). Draait NÁ de usage-filter zodat een gepromote kleur al door werkelijk-gebruik is gegaan.
- **Guards** (no-op): chromatische primary (Zwarthout-oranje), monochrome merken (geen chromatisch alternatief), detector/logo-asserted zwart zonder logo-genoemde chromatische hex; **nooit** framework/social/low-confidence/status-kleur gepromote; verzadigde donker-navy/teal primary (#0A1A2F s65) niet gedemote.

**Review**: 2 adversariële workflows (ontwerp + geïmplementeerde code), 6 lenzen, 13 agents → unaniem SHIP; 5 design-flaws vooraf ingebouwd (na-filter-plaatsing, saturatie-gegate achromatic-test, out-evidence-drempel tegen link-blauw-kaping, exact-token alert-tags, hoofdletter-ongevoelige hex-match).

**Bewijs**: smoke `web-page-builder-phase50-primary-from-brand-signal` 20/20 (alle 8 archetypes incl. red-team-regressies); tsc+lint 0; phase47/48/49 groen. **Vereist re-scrape Napking** → verwacht PRIMARY = Ocean Blue, Deep Charcoal → NEUTRAL.

- Task: audit `docs/audits/2026-06-05-brandstyle-cross-brand-palette.md`
- Commit: branch `fix/brandstyle-extraction`

### 281. Brandstyle palet: cross-brand — non-brand-uitsluiting + neutral-consolidatie

Cross-brand audit (Zwarthout schoon vs Napking vervuild; DB over ~10 merken): de usage+framework-filter ving Bootstrap-ruis maar niet (a) third-party widget/social-share-kleuren (napking WhatsApp #25D366; peoplemasterminds **8** social-netwerk-kleuren als brand-SECONDARY/ACCENT) en (b) CMS-admin-kleuren (WordPress #007CBA), én er was (c) universele neutral-overpopulatie (5-10 grijzen/merk). Audit: `docs/audits/2026-06-05-brandstyle-cross-brand-palette.md`. Inzicht: de AI tagt de ruis al zelf (`social`/`whatsapp`/`admin`/`system`).

- **Fase 1 — non-brand-uitsluiting** (`non-brand-colors.ts`): `isNonBrandColor` weert widget/social/admin-kleuren **altijd** (ongeacht usage, anders dan framework-defaults) — primair via de AI-tags, met een ZEER beperkte hex-backstop (alleen distinctieve niet-blauwe hexes: WhatsApp-groen, Instagram-pink). Bedraad in de usage-filter (`keep()`), maar **logo-kleuren winnen** (een wordmark-kleur is per definitie merk-eigen).
- **Fase 2 — neutral-consolidatie**: bijna-identieke NEUTRALs (kleur-afstand) worden samengevoegd tot één representant (meest-gebruikt), met behoud van donkerste+lichtste, cap 6, alléén bij render-bewijs. Napking 7 grijzen → 5; WhatsApp/WordPress weg; Ocean Blue (echte accent) blijft.

**Review** (adversariële 3-lens): 2 CRITICAL + 4 MAJOR gevonden+gefixt: `#FF0000` weerde elk merk-rood (verwijderd), WP-admin/Telegram/Twitter-blauwen weerden een corporate-blauw-band (alle blauwe platform-hexes uit de backstop → alléén via tag), safety-fallback heropende non-brand (→ brandPool-fallback), hard-exclude vóór logo (→ logo wint), consolidatie zonder render-bewijs (→ render-gated), MAX_NEUTRALS-amputatie (→ dedup-eerst + cap 6). De smoke ving daarna nog 2 over-reach-hexes (Telegram~Ocean Blue, Twitter~Material).

**Bewijs**: smoke `web-page-builder-phase49-cross-brand-palette` 27/27; phase43/45/47/48 groen; tsc+lint 0. **Vereist re-scrape (Napking + peoplemasterminds + Zwarthout-regressie) voor volledige validatie.**

- Task: audit `docs/audits/2026-06-05-brandstyle-cross-brand-palette.md`
- Commit: branch `fix/brandstyle-extraction`

### 280. Brandstyle palet: usage-gedreven filter (multi-page) i.p.v. hex-blocklist

User-eis na re-scrape: een kleur mag ALLEEN uit het palet vallen als hij aantoonbaar niet gebruikt wordt — niet op een hardgecodeerde hex-lijst (die brittle is + een echt-gebruikte kleur kan overslaan). Nieuwe `palette-usage-filter.ts` beslist op **werkelijk renderen**:

- **Signalen**: multi-page computed `color`/`background-color`/`border-color`-frequenties (uit de component-screenshotter, ~5 pagina's; `bulk-computed-styles`) + de homepage pixel-pass usageEvidence (`color-usage-verifier`). Bestond al, maar de multi-page-data werd niet in het keep/drop-besluit gebruikt en de pixel-pass keek alleen naar de homepage.
- **Regel**: logo + structurele kleuren (donkerste tekst / lichtste surface, over de gerenderde subset) altijd; geen usage-data → behouden (afwezigheid van bewijs ≠ bewijs van afwezigheid); rendert nergens → drop; framework-default → alleen bij STERK gebruik; elke andere gebruikte kleur → behouden. De oude hex/tag-drop (`isFrameworkNoiseColor`) is verwijderd; `resolveColors` geeft nu het volledige palet, de filter draait ná de component-screenshotter vóór persist.

Hiermee blijft bv. Slate Gray staan *omdat* hij aantoonbaar als muted tekst rendert (multi-page geverifieerd), terwijl een framework-kleur die nergens rendert (Bootstrap Blue) valt — en een wél-gebruikte kleur wordt nooit overgeslagen.

**Review**: adversariële 3-lens workflow → geen CRITICAL. Gefixt: MAJOR-1 (gefaalde/lege pixel-pass schreef `'none'` = "kon-niet-meten" → engine-guard negeert de pixel-pass zonder positief signaal, anders over-drop), MAJOR-2 (`border-color` toegevoegd zodat border-only accenten meetellen), MAJOR-3 (`renderStrength` sample-floor: 'strong' vereist ≥60 samples zodat een dunne pagina geen framework-kleur "strong" maakt), MINOR-1 (structureel over gerenderde subset), MINOR-2 (RGB-tolerantie 24→40, gelijk met de verifier), MINOR-3 (dode `isFrameworkNoiseColor` + phase46-smoke verwijderd). De smoke ving daarvóór al 2 bugs (transparant-regex matchte `rgb(r,g,0)`; drop-alleen-bij-bewijs).

**Bewijs**: smoke `web-page-builder-phase47-usage-filter` 21/21; regressie 44/45 groen; tsc+lint 0. **Vereist re-scrape voor volledige validatie** (Track A): `border-color`-collector + multi-page usage zijn pas op een live render te bevestigen.

- Task: vervolg op `docs/audits/2026-06-05-brandstyle-palette-framework-cleanup.md`
- Commit: branch `fix/brandstyle-extraction`

### 279. Brandstyle palet-framework-cleanup + Voice-analyse resilient (Fase A/C/E/F)

Verse re-scrape Zwarthout ná #278 toonde de kern-oorzaak achter alle kleur-klachten (kleurcombinaties/buttons/effects "niet op de site", overbodige kleuren, dubbel overzicht): het palet was **100% Bootstrap/WordPress framework-defaults** (12 kleuren, 6 getagd `unused`; echt logo-oranje ontbreekt). Plan + diagnose: `docs/audits/2026-06-05-brandstyle-palette-framework-cleanup.md`.

- **Fase A — palet de-frameworken**: nieuwe `isFrameworkNoiseColor` dropt in `resolveColors` framework-herkomst (Bootstrap/WordPress-tag exact-token of bekende hex) ÉN ongebruikt (`usageEvidence==='none'`/`unused`-tag), behoudt logo/gebruikte kleuren + de donkerste tekstkleur (tie-break op tekst-tag), met safety tegen leeg palet. `isFrameworkDefaultPrimary`-hexlijst verbreed. Zwarthout: dropt exact de 6 ongebruikte Bootstrap-kleuren (de bron van de slechte accent-pairings + teal/paars-gradients). **Fase C** (kleurcombinaties alleen echte kleuren) volgt automatisch uit A. **Fase E** — `SystemRolesSection` verwijderd; Color System is het enige kleur-overzicht (user-keuze). **Fase F** — "Recommended"-badge op verzonnen gradients (provenance uit de `RECOMMENDED:`-prefix).
- **Voice & imagery resilient (bonus)**: een Claude-JSON-hiccup in de voice-stap (malformed JSON, bv. onontsnapte quote in een geciteerde merk-frase) blokkeerde de HELE analyse. Nu niet-fataal: log + ga door met lege voice-data zodat kleuren/componenten/visual system wél persisten; + prompt-hardening (geen onontsnapte `"` in string-values).

**Iteratie 2 (na re-scrape-feedback)**: het palet bleef framework-vol omdat (a) de AI dit keer `framework`-tags zette (mijn FRAMEWORK_TAGS miste `framework`) en (b) Bootstrap's default link-blauw `usage:link` (zwakke usage) droeg, wat mijn `hasUsage`-guard spaarde. **Fase A verscherpt**: drop een framework-origin-kleur (tag `framework`/bootstrap/… of bekende hex, incl. Bootstrap semantic-hexes #198754/#FFC107/#DC3545) TENZIJ `usageEvidence==='strong'` — zwakke link/border-usage is geen brand-usage. Zwarthout dropt nu alle 6 framework-defaults, behoudt alleen de echte tekst/surface (Deep Charcoal + Soft White). **Fase B gebouwd**: de multi-page-merge gaf `logoColors` niet door → de logo-kleur-rescue draaide nooit → Zwarthout's oranje ontbrak volledig. 1-regel-fix (`logoColors: homepage.logoColors`); de rescue voegt nu het logo-oranje als PRIMARY toe. Smoke `phase46` 21/21 (14:20-palet → exact 6 framework-defaults gedropt). `[RE-SCRAPE]` validatie vereist.

**Gedeferd `[RE-SCRAPE]`**: Fase D (form-inputs computed-style-fallback). **Review (iter 1)**: adversariële 3-lens workflow → geen CRITICAL/MAJOR bevestigd; gefixt: exact-token-match (anti over-drop), donkerste-tie-break, NL→EN-badge, scrapedJson-comment, orphaned override-editor gedocumenteerd (0/15 styleguides hebben overrides).

**Bewijs**: smoke `web-page-builder-phase46-palette-framework` 20/20 (Zwarthout-palet → exact 6 unused gedropt) + phase45 58/58; tsc+lint 0. **Vereist re-scrape zwarthout.com voor volledige validatie** (Track A).

- Task: audit `docs/audits/2026-06-05-brandstyle-palette-framework-cleanup.md`
- Commit: branch `fix/brandstyle-extraction`

### 278. Brandstyle resultaat-audit fixes — components-depth + elevation + typografie + kleur + spacing + confidence

Vervolg op #277, gedreven door 15 screenshots van de live Brandstyle-UI (Zwarthout). User-observatie: components-tab toont vrijwel niets (form inputs/cards/chips = 0). Diepgaande audit (6-stream workflow + live-site HTML-probe + adversariële cross-check, alle root-causes in live code geverifieerd): `docs/audits/2026-06-05-brandstyle-result-audit.md`. **Kernbevinding**: form-inputs en product-cards zijn NIET afwezig op zwarthout.com (`/contact` + `/quote` hebben 21-24 echte `<input>`; shop heeft 9 `li.product-item`/pagina) — ze worden **gemist** door een merge-defect, dekking-gap en selector-gap.

- **Fase 1a (component merge)**: de Playwright-screenshotter verving `scraped.components` wholesale → static-gemergde form-inputs van `/contact` (die buiten de 5-pagina screenshot-slice vielen) gingen verloren. Nieuwe `backfillComponentsByType` houdt de screenshot-set leidend en backfilt alleen ontbrekende types. **Fase 1b/1d (coverage)**: `prioritiseScreenshotUrls` zet form-rijke pagina's (contact/offerte) vooraan en capt producten op 2 i.p.v. 4 bijna-identieke detailpagina's. **Fase 1c (selector)**: PRODUCT_CARD vangt nu WooCommerce/custom-theme kaarten (`li.product`/`.product-item`/`.wc-block-grid__product`).
- **Fase 2 (elevation)**: 1-regel shape-bug — `clusterElevation` deed `Array.isArray` op een `{tokens:[...]}`-object → Design-System/Visual-System toonden "0 shadows" terwijl de Spacing-tab er 4 had. Unwrap + strip `!important` + skip `none`.
- **Fase 3 (typografie)**: var()-resolutie splitst nu de komma-stack naar de eerste echte familie (geen "system-ui,…"-string meer als primary-font); fallback-chain-ruis (Roboto/Oxygen/Ubuntu) gefilterd (eerste familie per declaratie); WooCommerce/Elementor icon-fonts gefilterd; weight-suffix-strip ("Sen Bold" → "Sen") voor Google-Fonts-classificatie.
- **Fase 4a (kleur)**: chroma-gate — verzadigde kleuren (Bootstrap Blue/Vivid Purple) niet langer in de NEUTRAL-bucket maar ACCENT, behalve framework-default-ruis zonder usage-bewijs (blijft gemute neutral).
- **Fase 5a/5c (spacing/radii)**: computed-style px afgerond (5.42px → 5); pill/cirkel-radius (`50%`/`≥100px`) bewaard als sentinel zodat de "full"-radius een echte pill is i.p.v. 4px. 5b (non-monotone volgorde) bevestigd **stale data** — huidige builder sorteert al.
- **Fase 6a (confidence)**: `computeConfidence` telde `Object.keys().length` → degenereerde naar 100% voor élk element. Telt nu onderscheidende niet-default props (echte button 0.78, generieke balk 0.42).

**Bewust gedeferd** (per audit-risicovlaggen, baat bij re-scrape-validatie): 4b/4c (framework-kleuren bulk-droppen), 6b/6c (nav-handling, vision-confidence), 6d (gradient-provenance — feature met prompt+schema+UI), 6e (Components-telling label). **Review**: adversariële 4-lens workflow → geen CRITICAL; 1 MAJOR (pill-sentinel `9999` lekte in median/mostCommon/AI-prompt) + 1 MINOR (chroma-gate `undefined` usage) gefixt + smoke-coverage.

**Bewijs**: smoke `web-page-builder-phase45-result-audit` 58/58; regressie 41-44 groen; tsc+lint 0 errors. **Vereist re-scrape van zwarthout.com voor volledige validatie** (≥3 form-inputs, ≥5 product-cards, leesbare primary-font, consistente elevation) — Track A.

- Task: audit `docs/audits/2026-06-05-brandstyle-result-audit.md`
- ADR: -
- Spec: `docs/audits/2026-06-05-brandstyle-result-audit.md`
- Commit: branch `fix/brandstyle-extraction`

### 277. Brandstyle extractie-fidelity — Fase 1/2/3/4/5/6 (var-resolutie + framework-gate + kleurcombinaties + font-fallback)

Upstream-vervolg op #276: de scrape→brandstyle-extractie plaatste gescrapte info slecht (onopgeloste `var(--bs-*)`, framework-defaults als merk-design, gefabriceerde preview-tekst). Na 4-lagen deep-research + adversariële code-cross-check (audit `docs/audits/2026-06-05-brandstyle-extraction-pipeline.md`). Meta-oorzaak: drie niet-uniforme CSS-leespaden met verschillende var()-resolutie en geen gedeelde framework-default-gate.

**Fase 1 — gedeelde var-resolutie**: nieuwe property-agnostische `resolveCssVar`/`resolveOrKeep` (`css-var-resolver.ts`) bedraad in de typografie-extractor (fontSize/lineHeight/letterSpacing/fontWeight/fontFamily/color, alleen niet-null geresolveerd) + button-extractor (full-CSS-fallback voor de kleur-gefilterde var-map) + var-guard op lineHeight/letterSpacing in `toRoleEntry`. **Fase 2 — framework-default-gate**: `framework-defaults.ts` (selector- + primary-hex-detectie, focusset zodat een toevallig-Bootstrap-grijs als echte merk-kleur ongemoeid blijft) → component-confidence-penalty (×0.4) + `--bs-primary` detector-downgrade naar 'low' (geen Bootstrap-blauw meer als merk-primary) + logo-rescue-gate die framework-defaults negeert. **Fase 6 — display**: gefabriceerde button-CTA-tekst → neutrale rol-placeholder; dode `StyleGuideViewer`/`BrandstyleView` gemarkeerd.

**Review**: adversariële review-workflow vond 8 bugs (4 HIGH/2 MED/2 LOW) — allemaal gefixt (regex-paren-balancing in var-fallbacks, font-stack-resolutie-volgorde, namespaced-btn-class lookbehind, logo-rescue op ongemuteerde role, refuse-mode-regressie-guard, custom-Gutenberg over-match, declaratie-grens, low-confidence→NEUTRAL bij AI-skip).

**Bewijs**: smokes `phase41-brandstyle-var-resolution` 17/17 + `phase42-framework-default-gate` 19/19 (incl. alle bugfix-scenario's); regressie phase12/24/25/26 groen; tsc+lint 0 errors. Branch `fix/brandstyle-extraction` (`1576f4d8`→`bc139e5e`).

**Fase 3 — usage-enforce**: logo-kleur-redding-deblokkering zat al in de Fase-1/2-review-fixes (`frameworkHasPrimary` negeert framework-default-primaries); resterend deel: kleuren met `usageEvidence 'none'` (niet-gerenderd) die niet uit logo/detector komen → confidence 'low' vóór resolveColors. **Fase 5 — kleurcombinaties**: nieuwe `buildColorPairings` (`color-pairings.ts`) → WCAG-geverifieerde rol-gelabelde fg/bg-paren (knoppen met best-leesbare foreground, merk-op-surface, basis-leespaar); schema `colorPairings Json?` + persist (analyse + `recomputeColorPairings` na user color-add/-delete) + `ColorPairingsPanel` UI. Twee review-workflows vonden 8 (Fase 1/2) + 6 (Fase 3/5) bugs — allemaal gefixt (o.a. var-fallback-paren-balancing, font-stack-volgorde, namespaced-btn lookbehind, stale-pairings recompute, invalidateCache, grammatica, echte donkerste-neutral).

**Bewijs (Fase 3/5)**: smoke `phase43-color-pairings` 12/12; tsc+lint 0. Commits `df6c6c3d`+`b6b6f630`+`e83f8a24`.

**Fase 4 — font-fallback (lege fonts-tabel)**: drie deterministisch-testbare ingrepen + één `[RE-SCRAPE]`-wiring. (a) `extractSemanticFonts` vangt nu Bootstrap's `--bs-headings-font-family`/`--bs-body-font-family` — een brand-gecustomiseerde waarde overleeft, een vanilla system-stack wordt terecht gefilterd. (b) Nieuwe pure helpers (`font-fallback.ts`): de headless computed-style-render (die al `body/h1`-fonts captureert) triggert nu óók bij lege fonts i.p.v. alleen een zwak palet, en merget per-bron deficiëntie-gestuurd (`planHeadlessMerge`) zodat een goed statisch palet/fontset nooit door de grovere render wordt overschreven. (c) **Eerlijke persist**: StyleguideFont-rijen komen uit de écht gedetecteerde fonts (`selectDetectedFontNames`), nooit de AI-fallback; `primaryFontName` behoudt de AI-fallback alleen voor het typografieprofiel (LP-renderer heeft een font nodig). UI (`FontDisplayCard`) toont "Not detected on the site — AI suggestion: X" wanneer de naam niet in de gedetecteerde rijen zit, i.p.v. een confidente font-card. De computed-style-render zelf blijft `[RE-SCRAPE]` (vereist `BRANDSTYLE_HEADLESS_FALLBACK=1` + een echte gerenderde, niet-placeholder bron — Track A).

**Review (Fase 4)**: adversariële 4-lens review-workflow → geen CRITICAL; 1 MAJOR + 3 MINOR/NIT gefixt: font-role-classificatie van supplementaire headless-fonts (gerenderde CSS apart naar de classifier zónder de kleur-pipeline te raken), overbodige reprocess-skip bij niets-geadopteerd, NL→EN UI-copy, UPLOADED-rij comment-accuratesse. Verworpen (onbereikbaar/by-design): secondary-card false-negative, whitespace-spook-font, regex-over-match, kleur-pipeline-verstoring.

**Bewijs (Fase 4)**: smoke `phase44-font-fallback` 20/20 (`--bs-*`-resolutie + vanilla-filter + regressie ACSS-vars + `selectDetectedFontNames` geen-AI-leak + `planHeadlessMerge`-matrix); regressie 41/42/43 groen; tsc+lint 0 errors.

- Task: audit + plan `~/.claude/plans/functional-conjuring-harbor.md`
- ADR: -
- Spec: `docs/audits/2026-06-05-brandstyle-extraction-pipeline.md`
- Commit: `1576f4d8` + `32258522` + `9e03c71b` + `bc139e5e` + Fase 4 (branch `fix/brandstyle-extraction`)

### 276. LP brand-fidelity overhaul — scrape → tokens → render (geen app-identity-lek meer)

Systematische fix van off-brand/slecht-ogende landing-pages, na een 4-lagen deep-research (audit: `docs/audits/2026-06-04-lp-render-pipeline-napking.md`, plan: `~/.claude/plans/functional-conjuring-harbor.md`). Meta-oorzaak: de pipeline behandelde CSS-tekst-aanwezigheid als merk-design, viel bij zwakke extractie terug op **Branddock's eigen huisstijl** (teal #1FD1B2 / amber #F59E0B) en de renderer **verzon** visuals (textuur, 272px-koppen). Aanleiding: Zwarthout-LP renderde teal (nergens op de site) met verzonnen achtergrond-structuur.

**Fase 1 — identity-leak**: `DEFAULT_BRAND_TOKENS.brand/accent/brandSubtle/action` geneutraliseerd (slate i.p.v. teal/amber); `brand = pickBrand(colors) ?? onSurface` (donkerste klant-kleur), `accent = pickAccent ?? brand` — een klant-LP krijgt nooit meer de app-kleur. **Fase 2 — preset-over-scrape/sizing**: px/rem-misclassificatie op magnitude (Napking `[1.6..16]` werd ×16), hero-CTA radius uit scraped `tokens.button` (gecapt, niet MINIMAL→scherp/pill), `pickButtonStyle` padding gecapt (spacing[6]=96 giant button), display-koppen gecapt (88/120px i.p.v. 272), hero section-padding via `sectionRhythm`. **Fase 3 — render-eerlijkheid**: `readableTextColor` dwingt AA-contrast af op feature/trust/FAQ-body (onzichtbare tekst), `pickBackgroundDepth`→`none` (geen verzonnen textuur), feature/trust-koppen gecapt op 32px. **Fase 4 — confidence-gating**: garbage-button-detectie (transparant+padding 0, of `.wp-block-button` framework-selector → sane defaults), framework-default-kleuren (`bootstrap/wordpress` + `default/synced-block` tag) uitgesloten van brand/accent-picking.

**Bewijs**: nieuwe smoke `phase40-brand-fallback-no-leak` 20/20; cross-brand-verificatie (`scripts/verify-cross-brand-tokens.ts`) over alle 15 merken → **0 teal-leaks, 0 amber-leaks, 0 spacing-blowups**, elk merk krijgt zijn echte kleur (Zwarthout #212529 charcoal, Napking #008ACF blauw) of veilig-neutraal (Wassink #0F172A). tsc + lint 0 errors; token/render-smokes groen.

**Out-of-scope (Track A / live-verificatie)**: bron-website moet bereikbaar zijn voor een goede scrape (napking.nl/zwarthout.com zijn WordPress-placeholders); diepe scrape-pipeline-filtering (usageEvidence consumeren, in-scrape framework-filter, scrape-kwaliteitsguard met UI) + gegarandeerd hero-beeld vragen een live re-scrape om te verifiëren.

- Task: `tasks/lp-fidelity-bugfixes-step2.md` + `tasks/lp-step3-rendering-bugs.md` (smoke-bugs) + audit/plan hierboven
- ADR: -
- Spec: `docs/audits/2026-06-04-lp-render-pipeline-napking.md`
- Commit: (branch `fix/lp-smoke-bugs`, nog te committen)

## 2026-05

### 275. Competitor content-item discovery — RSS + sitemap producer voor CompetitorContentItem

Producer voor de sinds Fase 1 lege `CompetitorContentItem`-tabel — laatste nog-te-bouwen stuk van de competitive-intel arc (data → detectie → zichtbaarheid → **ingestie**). Tijdens een competitor-refresh ontdekt het blog/news/press/case-content via **RSS → sitemap-fallback**, classificeert het format (regex-first + gebatchte Claude Haiku 4.5-fallback, verbatim A3-prompt 100% accuracy) + tagt 2-3 thema's per item (gebatchte Haiku), schrijft `CompetitorContentItem`-rijen en emit `NEW_BLOG_POST` / `NEW_PRESS_RELEASE` / `NEW_CASE_STUDY` activities voor nieuw-geziene URLs. Pre-build probes: sitemap 71% / RSS 43% / classifier 100%.

**Architectuur**: nieuwe module `src/lib/competitors/content-discovery/` (fetch-policy met SSRF-guard + robots.txt-respect + 1req/s throttle + Branddock-UA, rss/sitemap-discoverers via cheerio xmlMode incl. sitemap-index-recursie, content-classifier, orchestrator met fetch-budget + 25-truncatie + never-throw). Draait **async vóór de transactie** (spiegelt de AI-pattern-classifier zodat netwerk+AI nooit TX-locks vasthouden); items gaan via nieuwe `contentItems`-param de dual-write-TX in en worden geschreven met `firstSeenSnapshotId` (null op no-op-hash-match — content-discovery staat los van de content-hash) via `createMany({skipDuplicates})` op `@@unique([competitorId, urlHash])` (race-safe). Pure `buildContentItemActivities` in diff-engine mapt de 3 content-cadence formats; overige formats (EBOOK/VIDEO/…) opgeslagen zonder event. Schema additief: `CompetitorContentItem.discovererVersion` (bootstrap-SQL geparkeerd).

Verificatie: tsc 0 · eslint 0 · dual-write smoke 31/31 (incl. content-items Scenario 4) · `smoke:competitor-content-discovery` 18/18 (RSS / sitemap-index / leeg, stub-fetch + stub-classifier) · live charthop.com = 24 items + 8 activities + Haiku-themes · 2-subagent review 0 critical (WARNINGs gefixt). Async/cron-discovery (haalt de ~10-20s latency van het refresh-pad) = Fase 4 brandclaw-monitoring.

- Task: [tasks/done/competitor-content-item-discovery.md](../tasks/done/competitor-content-item-discovery.md)
- ADR: 2026-05-08-competitor-snapshot-historie
- Spec: [tasks/_drafts/idea-competitor-content-item-discovery.md](../tasks/_drafts/idea-competitor-content-item-discovery.md)
- Commit: `b785299e`

### 274. Content-flow analyse #7.A — 8 categorie-rapporten + synthesis

Per-categorie content-flow analyse (long-form / social / advertising / email / website / video / sales / pr-hr) + `content-flow-synthesis.md` in `docs/specs/`, code-gegrond met file:line-refs. Legt twee structurele gaten bloot: (1) 5 kerntypes (`whitepaper`/`ebook`/`article`/`newsletter`/`microsite`) draaien op de generieke prompt door ontbrekende templates; (2) `TYPE_TO_CATEGORY` is gedivergeerd van de echte TEMPLATE_REGISTRY (~9 phantom-IDs, ~17 missende echte types) zodat `getCategoryForType()` mislabelt. Friction-tickets in `tasks/content-flow-improvements-7a.md` (CF-1 t/m CF-10). Documentatie-only (geen tsc/lint); sectie 6 deels pending Ronde 1.

- Task: [tasks/done/content-test-flow-analyse-7A.md](tasks/done/content-test-flow-analyse-7A.md)
- ADR: -
- Spec: docs/specs/content-flow-synthesis.md
- Commit: _(deze commit)_


### 273. `/feature` slash command — feature requests via Brand Assistant

Test-gebruikers kunnen nu een feature request indienen via `/feature` in de Brand Assistant, exact gespiegeld op de bestaande `/bug`-flow (geen AI-analyse). Nieuw workspace-scoped Prisma-model `FeatureReport` (parallel aan `BugReport`, los van het bestaande globale `FeatureRequest`/voting-board) met velden `title`/`description`/`impact` (nice-to-have|useful|important|critical) / optionele http(s)-`screenshot`-link / `status` (open→planned→in_progress→shipped|declined; terminale statussen stempelen `resolvedAt`/`resolvedById`). Twee API-routes: `POST/GET /api/feature-reports` (workspace-scoped, `?all=true` developer-only) + `PATCH /api/feature-reports/[id]` (developer-only status/notes). UI: `FeatureRequestForm` in de chat (page voor-ingevuld) + developer-`FeatureTriageTab` onder Settings → Developer met status-filters + status-transities + triage-notities. Alle vier de assistant-forms (bug/feature/feedback/quick) sluiten elkaar nu wederzijds uit (one-at-a-time). Reference-link wordt server-side gevalideerd op http(s) zodat de `<a href>`-render in triage `javascript:`/`data:` weert. Geverifieerd via Playwright end-to-end (login → /feature → submit → triage → status-transitie). **Merge-let op**: tabel lokaal additief via SQL aangemaakt (niet via Prisma-migratie) wegens pre-existing DB-drift uit de web-page-builder-worktree — los die drift op vóór een schone `db push`/deploy naar Neon.

- Task: [tasks/done/feature-request-slash-command.md](tasks/done/feature-request-slash-command.md)
- ADR: -
- Spec: -
- Commit: _(deze commit)_

### 272. Competitor scraping Apify-fallback — finalisatie van al-gemergde 3-step chain + Track B doc-reconciliatie

Formele finalisatie van `competitor-scraping-apify-fallback`, gebouwd + gemerged via PR #12 (`5173fac5`) maar met stale task-status "open" en zonder changelog-entry. Vierde geval van Track B doc-drift in deze sprint (na classifier #263 en activities-ui #271), daarom in dezelfde pass de hele competitor/Brandclaw backlog tegen `main` gereconcilieerd.

**Apify-fallback** (op main aanwezig, bevestigd): 3-step scraper-chain in `refresh/route.ts` (current `scrapeProductUrl` → `scrapeViaApify` op `<500` chars/throw → `scrapeUrlViaGemini`), `src/lib/scraping/apify-client.ts` singleton (`crawlerType: playwright:firefox` + residential proxy), smoke `apify-fallback-chain.ts` (4 scenarios), dependency `apify-client ^2.23.3`. Lost JS-heavy SPA scrape-failures op (Snowflake-case 0 → 2868 chars) die anders silently geen input aan de AI-classifier zouden leveren; Apify alleen op ~10% fail-pad (~$0.80/mnd @ pilot-volume).

**Doc-reconciliatie**: `APIFY_TOKEN` toegevoegd aan CLAUDE.md optionele env-vars (vereist op fail-pad); `strategy-analyst-stub` status gecorrigeerd naar in-progress (Phase A+B gemerged #260-262, Phase C open); roadmap Track B + Competitive Intelligence Loop bijgewerkt. Spike-branch `spike/apify-url-crawler` (superseded door #12) opgeruimd.

- Task: [tasks/done/competitor-scraping-apify-fallback.md](../tasks/done/competitor-scraping-apify-fallback.md)
- ADR: -
- Spec: [docs/specs/apify-integration-options.md](specs/apify-integration-options.md)
- Commit: `55d35c8a`

### 271. Competitor-activities-ui finalisatie + hardening — audit van al-gemergde feature + 7 minor fixes

Formele finalisatie van `competitor-activities-ui`, dat al gebouwd + gemerged was (PR #6 classifier, #8 timeline/digest/dashboard, #13 notifications, plus BA-tool en reconcile-cron branches) maar de `task-finalize`-ceremonie had overgeslagen: geen changelog, task bleef `in-progress`, geen 2-subagent review. Een 4-dimensionale audit-workflow (API/UI/notifications/conventies) met adversariële bug-verificatie bevestigde alle 11 acceptatiecriteria correct geïmplementeerd met **0 critical/major defects**; 9 minor bugs bevestigd (2 false-positives gekild). Alle 9 zijn gefixt op worktree `branddock-finalize-activities`:

- **Mark-all-read scope-divergence**: activities-route returnt nieuw `totalUnread` (ongefilterd); `ActivityTimelineSection` bindt badge + disable-gate daaraan i.p.v. de filter-scoped `unreadCount` — voorkomt stil acknowledgen van ongezien MAJOR-events onder een actief filter + onterecht disabled knop.
- **Digest half-lege card**: `acknowledgedAt: null` toegevoegd aan de `severityGroups` groupBy in `activity-summary`, zodat totals ⇄ topEvents/hotCompetitors ⇄ skip-gate dezelfde (unack'd) populatie tellen.
- **Reconcile-cron cache-invalidatie**: `invalidateCache(competitors + dashboard)` per gecorrigeerde workspace (verboden-patroon #10).
- **OrganizationMember user-resolutie**: nieuwe helper `src/lib/workspace/workspace-users.ts` (`getWorkspaceUsers`, spiegelt de ACL van `hasWorkspaceAccess()` + `isActive`-filter) vervangt de legacy `User.workspaceId` lookup in `notify-major-events.ts` + (consistentie) de trend-radar approve-route — multi-member workspaces krijgen nu wél notificaties.
- **Constant-time cron-auth**: nieuwe helper `src/lib/auth/cron-auth.ts` (`crypto.timingSafeEqual` + length-guard) toegepast op alle 4 cron-routes.
- **Dev email-observability**: `isEmailitConfigured()`-guard verwijderd zodat `trySendTransactional` z'n dev-stub console-log per ontvanger emit.
- **Silent-return logging**: gestructureerde `console.warn` bij 0-user workspace in `notifyMajorEvents`.

Verificatie: `tsc` 0 errors, `eslint` 0 errors, nieuwe smoke `npm run smoke:competitor-activities` 26/26 PASS (ACL-scoping, in-app notify-rows, 0-user warn, constant-time auth, reconcile drift-correctie + auth-gate, summary totals-invariant, acknowledge atomic-decrement race-safety). 3 code-review-ronden (6 subagents) → 0 critical/0 warning. Live browser-pass van detail/dashboard/digest blijft aanbevolen handmatige gate.

- Task: [tasks/done/competitor-activities-ui.md](../tasks/done/competitor-activities-ui.md)
- ADR: -
- Spec: -
- Commit: `5aaf1922`

### 267. Web-page builder MVP — Puck als Canvas Step 3 Medium-renderer + publish-flow

Volledige feature-branch (`branddock-feat-web-page-builder-canvas`, 8 commits, niet-gemerged in main) die de 5 web-page content-types (`landing-page` / `product-page` / `faq-page` / `comparison-page` / `microsite`) een visuele drag-drop editor + publish-flow geeft via Pattern B uit ADR 2026-05-22 (override Step 3 Medium-renderer ipv aparte feature-tab). Architectuur: Puck v0.21.2 (MIT) embedded in `PuckPageBuilder.tsx` consumeert `CanvasContextStack` via prop, brand-tokens komen structureel uit BrandStyleguide (PRIMARY/SECONDARY/ACCENT/NEUTRAL colors + DISPLAY/BODY fonts) via nieuwe `extractBrandTokensFromStyleguide` util — `assembleCanvasContext` laadt deze server-side. Edit-paradigma 3 lagen (per Optie B uit gesprek 2026-05-22, diff-preview verplicht voor alle AI-changes): Laag 1 direct visual editing via Puck-native drag-drop + inline text, Laag 2 component-level AI via context-menu met 4 instructies (shorten/formal/casual/alternatives) gevoed uit centrale `ai-edit-instructions` registry + `ComponentDiffPreviewModal` dual-render via `<Render>` × 2, Laag 3 page-level AI via 3 endpoints (auto-iterate met F-VAL judge integration + heuristic fallback, strict-rewrite met user-prompt, generate-page free-text → SpikeData via per-type template builders) + `PageDiffPreviewModal` met per-component accept-lane + score-delta badges. Persistentie: `LandingPage` model als immutable snapshot per publish (workspaceId_slug compound unique key, mirror van competitor-snapshot-historie ADR) + `DomainMapping` v2 schema-only. Publish-flow via `/api/landing-pages/publish` met auth + workspace-membership-check + `revalidatePath` on snapshot-write. Public render-route `/p/[slug]` met ISR 1h-fallback. Middleware-routing in `src/middleware.ts` voor `<workspace>.branddock.app/<slug>` subdomain-pattern via `decideHostRoute` pure util (host-port stripping + apex/lvh.me passthrough + exempt-path-prefixes voor /api/_next/p). 5 per-type templates leveren werkbaar startpunt zonder Step 2 variants; `variantToPuckData()` extraction-mapper parseert features/faq/pricing uit variant-content via heuristieken (bullet-lists, question-mark-blocks, EUR-price-tokens). 8 brand-aware components: BrandHero/BrandCTA/FeatureGrid/Testimonial/PricingTable/FAQ/Footer/RichText. Lock-toggle per component voorkomt AI-overschrijving (server-side enforced via 423 Locked + client-side via disabled buttons). F-VAL judge integration: `evaluatePageQualityViaFVAL` adapter wraps `runFidelityScoring` 3-pillar composite (style + judge + rules) — falls back naar heuristic stub bij null-outcome (insufficient signal). Bug-vondst tijdens build: Puck v0.21.2 `external` field typing-mismatch op custom row-shapes; workaround via `select` field met pre-computed options array. Bug-report draft `docs/audits/puck-external-field-typing-issue.md` klaar voor user-submission. Total LOC: 6175+ over 36 files. Smoke-suite: 279 assertions PASS over 7 zelfstandige `npx tsx`-scripts (geen browser-dependence; gebruikt `react-dom/server renderToStaticMarkup` voor rendering-validatie). Smoke-tests vonden + fixten 3 real bugs pre-commit: regex precedence in font-extraction (Phase 2), `Brand: undefined` leak in Claude-prompt (Phase 6), redundant nullish coalescing in test (Phase 6.2). Spike-validatie 2026-05-22 + browser-smoke groen 2026-05-23 bevestigden alle 5 spike-blocker aannames (A1/A2/A4/A6/A8). Productie-readiness open: alleen browser-smoke door user op `branddock-feat-web-page-builder-canvas` worktree + Puck bug-report submission resteren.

**Per-phase commits** (chronologisch op feature-branch):
- Phase 1 `2c28dd68` — Foundation: Prisma LandingPage/DomainMapping + 5-type dispatch in preview-map + spike-code naar productie-paden
- Phase 2 `690631f9` — 8 brand-aware components + structurele brand-tokens util (58 smoke ✅)
- Phase 3 `380d99da` — 5 per-type templates + smarter variantToPuckData seeding (74 smoke ✅)
- Phase 4 `29c9d8bb` — publish-laag: middleware host-router + LandingPage write + `/p/[slug]` render-route (44 smoke ✅)
- Phase 5 `f82f74cf` — component AI-menu (4 instructies) + lock-toggle (36 smoke ✅)
- Phase 6 `00553de3` — page-level AI utilities + 3 routes (35 smoke ✅)
- Phase 6.1 `23715313` — PageDiffPreviewModal + 3 page-level toolbar-knoppen in PuckPageBuilder (18 smoke ✅)
- Phase 6.2 `873d69b2` — F-VAL judge integration + Prisma migration file + Puck bug-report draft (14 smoke ✅)

- Task: [tasks/web-page-builder-canvas-step-mvp.md](../tasks/web-page-builder-canvas-step-mvp.md) (in-progress)
- ADR: [docs/adr/2026-05-22-landing-page-builder-architectuur.md](adr/2026-05-22-landing-page-builder-architectuur.md)
- Spec: [tasks/_drafts/idea-landing-page-builder.md](../tasks/_drafts/idea-landing-page-builder.md) (idea-doc, verdict ready-to-build)
- Spike-memo: [docs/audits/2026-05-22-landing-page-builder-puck-spike.md](audits/2026-05-22-landing-page-builder-puck-spike.md)
- Commits: feature-branch `branddock-feat-web-page-builder-canvas` (8 commits van `2c28dd68` t/m `873d69b2`)
- **Vervolg**: Phases 6.3-6.13 (UX-polish, fullscreen-editor, scope-knip) + spec-driven implementatie zie #268

### 268. Web-page builder follow-on — spec-driven landing-page + multi-variant + WCAG-plan

Vervolg op #267. Twee grote werkblokken sinds 2026-05-23:

**A. Phases 6.3-6.13 UX-polish** (19 commits, pre-2026-05-26): Phase 6.4 preview-first Step 3 + mini Puck.Preview in Step 2 (`83229f12`), Phase 6.5 markdown-blob fallback (`5db51e50`), Phase 6.6 minimal preview UI + remove component-level AI (`9f493437` — scope-knip), Phase 6.7 Branddock top action-bar + scope-knip (`9299abec`), Phase 6.8 flat preview + page-wide lock-toggle (`aae1355c`), Phase 6.9 high-contrast lock-toggle (`2cb6e170`), Phase 6.10 toggle inline-transform + diff-modal styling (`60da4875`), Phase 6.11 auto-iterate non-improvement rejection (`ce4ce178`), Phase 6.12 fullscreen editor portal + theming (`9e3b1518`), Phase 6.13 fullscreen viewport-coverage (`5ea13156`). Plus AI-fixes: maxTokens 8000→16000 (`f6465aaa`), per-step timeout 120s→240/300s SEO (`b929c6d4`), skip temperature voor Opus 4.7+/Sonnet 4.6+ (`5242c9e9`). Plus Next 16 compat: host-router naar proxy.ts (`48863b11`). Phase 6.2-fval smoke-suite 279 asserts blijft groen.

**B. Spec-driven landing-page implementatie** (15 commits, 2026-05-26):
- **Markdown-fix** (`f905f7d8`): RichText component rendert markdown via react-markdown (eerder ###/**/etc. zichtbaar als ruwe tokens). Brand-token-aware components-map.
- **Landing-page type-specificatie** (`ff725443`): `docs/specs/web-page-types/landing-page.md` (619 regels) met 4 secties — onderzoek (16 inzichten uit 13 bronnen: NN/g, Unbounce 2024, CXL, Cialdini, Frankwatching + Marketingfacts NL practitioner-bronnen) + anatomie (8 secties macro + micro per sectie + best-in-class voorbeelden) + onderbouwing (Fogg BAT + Cialdini 7 + Kahneman biases + NN/g attention-economics, cross-mapping naar anatomie) + doorvertaling (component-gap-analyse + LandingPageVariantContent schema + template-skelet + 6 F-VAL judge-dimensies).
- **Fase 1 Zod-schema** (`4e613a00`): `variant-schema.ts` met Zod v4 + superRefine cross-field constraint (finalCta.primaryCta === hero.primaryCta voor single-CTA discipline). Smoke phase7 27 asserts.
- **Fase 2 Variant-generator** (`2f95fd2a`): `variant-generator.ts` met buildPrompt + parseResponse + generateLandingPageVariant. Later aangepast: STRUCTURED useCase + 90s timeout + single-shot (`074a9513` — was eerder retry-loop met 6.2min hang in LINFI-test), daarna two-phase batch met per-failure recovery-temperature retry 0.7→0.5 / 0.3→0.4 (`b3e80e9c`). Smoke phase8 33 asserts incl. persona.serialized roundtrip.
- **Fase 3 Structured mapper** (`9c906e7c`): `landing-page-from-structured.ts` met 11 section-builders + conditional render voor problem + pricing. MVP-workarounds voor 3 v2-gap-componenten (TrustStrip/PainBullets/ImpactStats) via FeatureGrid + RichText. Smoke phase9 32 asserts.
- **Fase 4 Quality-dimensies** (`ceac51c6`): `landing-page-quality.ts` met 6 type-specifieke F-VAL dimensies (hero-clarity 20% / single-CTA 15% / readability 15% / social-proof 15% / anatomie 20% / objection 15%). 5 deterministisch + 1 LLM-injectable. Composite <70 → shouldAutoIterate. Smoke phase10 40 asserts.
- **Fase 5 Component-props** (`6f68fcae`): BrandHero.heroVisualUrl + BrandCTA.riskReducer + FeatureItem.icon + PricingTier.highlighted (additieve, backward-compat). Decoy-pricing-badge "Aanbevolen" + scale 1.05 bij highlighted-tier. Smoke phase11 22 asserts.
- **Fase 6a Generate-route** (`b558e385`): `POST /api/landing-pages/[id]/generate-structured-variant` met auth + workspace-check + PUCK_WEBPAGE_TYPES allowlist + assembleCanvasContext + batch + persist in settings.structuredVariantOptions. Cache-invalidatie studio + campaigns.
- **Fase 6b Store-slice + hydratie** (`04ae511d`): structuredVariant + structuredVariantOptions slices in useCanvasStore + CanvasPage hydrate uit settings. Bestaande puckData-hydratie via contextStack-path werkt automatisch.
- **Fase 6c Step 2 UX** (`cd13275a`): LandingPageGenerateBlock vervangt multi-variant grid voor PUCK_WEBPAGE_TYPES. Iteraties: Step 1 brief-summary (`3dfcb602`), copy-preview na generation (`ff7c319c`), auto-trigger op mount (`1ae2997f`), multi-variant 2-card keuze met carry-over fix via expliciete /context-fetch + setContextStack (`6fcfa6bf`).
- **Brand-styling consistency + WCAG plan** (`71ef9978`): `docs/specs/brand-styling-consistency-plan.md` (284 regels) — diagnose LINFI render-mismatch (goud overal vs linfi.nl minimalistisch wit-zwart, contrast-fail body-text) + 5-fase plan (token-roles / WCAG-gate / layout-style-presets / render-rules / AI brand-fit). Per-component do/don't matrix + WCAG-criteria checklist + 3-sprint fasering.

Total LOC 2026-05-26: ~3500 over 12 nieuwe + 6 gewijzigde files. Smoke chain: 154 nieuwe assertions over phase7-11, full chain 0 FAIL.

Browser-smoke 2026-05-26 LINFI bevestigd: brief → 2 variants → keuze → Step 3 Puck-tree met gekozen variant (carry-over werkt). Outstanding: LINFI-render gebruikt brand-color voor body-text (WCAG-fail + niet-on-brand) — Sprint 1 van styling-plan implementeert fix.

- Spec: [docs/specs/web-page-types/landing-page.md](specs/web-page-types/landing-page.md)
- Spec: [docs/specs/brand-styling-consistency-plan.md](specs/brand-styling-consistency-plan.md)
- Task: [tasks/web-page-builder-canvas-step-mvp.md](../tasks/web-page-builder-canvas-step-mvp.md) (in-progress; Fase 6c afronding open)
- Commits: feature-branch `branddock-feat-web-page-builder-canvas` (44 commits ahead van main; deze entry dekt commits `f905f7d8` t/m `71ef9978` plus pre-2026-05-26 6.3-6.13 reeks)

### 270. Web-page builder feature-branch consolidation merge — brandstyle Fase A-E + F-VAL vision-judge dim 8 + DTS C1-C11 + brand-fidelity Step 2 LP + 3 ADR-aanvullingen

Squash-merge van de volledige `branddock-feat-web-page-builder-canvas` feature-branch naar main na 135 commits over 6 dagen (24-29 mei). Bundelt 4 follow-up werkstromen die parallel aan #267/#268/#269 op dezelfde branch zijn gelandet plus de Track 5 brand-fidelity gap-fix en 3 nieuwe ADR-aanvullingen die de scope-uitbreidingen documenteren. Originele MVP-task (post-launch `priority: next`) gepromoot naar **pre-launch Track A sprint #6** in dezelfde merge — 5 dagen capaciteit ging hier naartoe en die realiteit verdiende erkenning op de roadmap.

**(A) Brandstyle Fase A-E LP-fidelity werkstroom** — andere Fase-labelling dan `brandstyle-analyzer-improvement-plan.md` plan A-E; documenteert via [ADR 2026-05-29-brandstyle-analyzer-lp-fidelity](adr/2026-05-29-brandstyle-analyzer-lp-fidelity.md) waarom een smal-en-diep pad gekozen is i.p.v. volledig 10-11-dagen-plan. Color-usage capture (`24105e16`) + hero-typography fingerprint h1-color uit bron (`b36ca91c`) + hero-pattern detection via vision-AI (split/centered/fullbleed/asymmetric/minimal-typographic, `08bc6966`) + LP-fidelity judge bron-vs-gegenereerd side-by-side (`057e4bf7`) + hero-screenshot persist + API + UI (`744ae61f`) + user-override surface voor color usage-tags (`3ff4122f`). Aanverwante brandstyle-fixes: framework-class-extensies voor Bricks/Divi/Elementor in component-extractors (`df831143`), universele button-scraper met CSS-var-resolution + DOM-presence filter (`efb14497`), component-extractor accuratesse (STATUS_CHIP false-positives weg + PRODUCT_CARD bredere selectors, `085e8290`), scanner-classifier primary-saturation guard + pastel→SEMANTIC (`98fbefb2`), Google Fonts loader in Puck-render (`2706a9c4`), font-UI consolidatie naar Typography-tab (`53409620`).

**(B) F-VAL vision-judge dim 8** ([ADR 2026-05-29-fval-vision-judge-dim8](adr/2026-05-29-fval-vision-judge-dim8.md)) — dim 8 `visual-fidelity` toegevoegd aan G-Eval rubric + composite-engine + auto-iterate trigger. Vision-judge volledig geïntegreerd (`944a8d34`, Playwright + Claude vision dim 8 setup `410dcee6`). Auto-iterate accepteert vision-score als blocker: composite < 70 OR visual-fidelity < 50 → refinement-loop. Per-content-type dispatch: alleen `PUCK_WEBPAGE_TYPES` krijgen dim 8; non-LP content blijft 7-dimensies. Calibration tegen Markdown-content-scores is open follow-up (Track 4.3).

**(C) DTS content-quality C1-C11** ([ADR 2026-05-29-dts-content-quality](adr/2026-05-29-dts-content-quality.md)) — alle 11 items uit `docs/specs/dts-content-quality-improvements.md` uitgevoerd in 2 commit-batches: C1+C2+C6+C7+C9 copy-DNA + sticky-CTA (`39171432`) + C3+C4+C5+C8+C10+C11 visuele DTS-verbeteringen (`d06b428e`). Vocabulary-rails (BrandVoiceguide.vocabularyDo/Dont) + voice few-shot sample (voiceSample TEXT) + hard render-constraints per archetype + type-scale text-hiërarchie + eyebrow pattern + max-width container + photo-scrim per archetype + flat-card discipline + sectie-blueprint + real-content fixture samples + StickyCtaBar component. Shared brand-voice-directive uitgebreid met vocabulary + voiceSample (`11283481`). Render-constraints leven als single-source-of-truth in code-constants; bij toekomstige archetype-uitbreidingen MOET deze file expliciet bijgewerkt worden.

**(D) Auto-iterate hardening** (~16 commits) — silent variant-clobber fix, NaN-score + lege preview-panes + 0-component-match (`0f9ebacf`), skip 'already_passing' check in heuristic mode (`1064cf81`), F-VAL initial check opt-in + maxTokens 2400→1500 + 90s server-cap performance (`6e2d249a`), 3 bugs uit user-test 2026-05-27 (`aea0d28d`), 5 screenshot-review issues (`809bb9e4`), hero-image preservation in auto-iterate merge + projected-skip side-effect (`0cbccff1`), StatsBlock + skip-projected halveert wachttijd (`2e8eb0ad`), Step 2 volledige variants + per-veld inline edit pennetje (`b09887e8`), direct advance na variant-keuze + no auto-hero + step3 loading-guard (`38dcfe10`), Step 2 ImageSourcePanel + Confirm-button parity (`3e621612`), hero.headline max 60 + nullable URLs voor AI null-outputs (`af7a688f`), surface hero-image API error detail + variant-axis prompt (`ec527061`), 3 user-bevindingen hero-font + confirm-step + JSON escape-repair (`a785273b`), variant-axis voor diversifying + back-nav step 1 (`23dd181b`), cleanup-orphan-media-assets dry-run + apply mode utility-script (`1439fc20`).

**(E) Brand-fidelity Step 2 LP gap-fix (Track 5 zippy-twirling-feigenbaum)** — `Step2ContentVariants.tsx:318-325` routeert LP-deliverables naar `LandingPageGenerateBlock` (aparte Step 2 host) zonder `FidelityScoreBar` + zonder SSE-events. Andere content-types kregen wel direct fidelity-score; LP zag hem pas in Step 3 (vision-judge dim 8 op gerenderde HTML). Pragmatische aanpak (scope A — deliverable-level): losse REST-endpoint `POST /api/landing-pages/[id]/score-variant-fidelity` die `runFidelityScoring` op gevlakte variant-text runt + payload returnt identiek aan SSE-event `fidelity_score_complete`. `LandingPageGenerateBlock` doet fire-and-forget call na variant-generation voor variant 0; client zet running → complete/skipped via bestaande store-setters. `FidelityScoreBar` gerenderd in variant-keuze view; pattern identiek aan content-deliverables in `Step2ContentVariants.tsx:388`. Bewust GEEN SSE-conversie van `generate-structured-variant` (was plan-default) — losse score-endpoint minder invasief, behoudt fast JSON-response voor variant-display, isoleert fidelity-failures van variant-flow. Per-variant scoring (scope B) blijft out-of-scope; alleen variant 0 gescoord (mirrors naar legacy `fidelityScore`-state). Commit `086486d3`.

**(F) Documentatie + roadmap (2026-05-29)** — 3 specs in `docs/specs/` gecommit met status-flags (`08a0ff12`): `dts-content-quality-improvements.md` ✅ done, `brandstyle-analyzer-improvement-plan.md` voorstel + sectie 10 implementatie-status van LP-fidelity werkstroom, `dts-comparison-improvements.md` research-doc. README onder `src/features/campaigns/components/canvas/medium/` updated naar 11 components + 40+ smoke-phases (`5726726d`). Roadmap.md NOW Track A sprint #6 + NEXT v2-custom-domains placeholder (`dad0d003`). Task-file refresh naar werkelijke staat met "Follow-up werkstromen sinds 2026-05-24" tabel (commit `33e25238` op main worktree). Plan-doc `~/.claude/plans/zippy-twirling-feigenbaum.md` approved 2026-05-29. Memory `branddock-branch-state-2026-05-29.md`.

**Pre-existing fix vereist op main**: `29871a2a` fix(ad-accounts) wrap useSearchParams in Suspense voor prerender-build — CI-blocker sinds Fase B Meta foundation (`fc38e10b`), niet door deze branch geïntroduceerd.

Quality gates: `npx tsc --noEmit` 0 errors, `npm run lint` 0 errors, `npm run build` exit 0 met route-table compleet. Browser-smoke 10-stappen blijft post-merge user-manual. Bundle-size meting post-merge (was geblokt op prerender-bug, fix nu gepusht). PR #14 squash-merge → één commit op main, granular history beschikbaar in PR.

- Task: [tasks/web-page-builder-canvas-step-mvp.md](../tasks/web-page-builder-canvas-step-mvp.md) (promoted pre-launch sprint #6 — 2026-05-29)
- ADRs: [adr/2026-05-29-brandstyle-analyzer-lp-fidelity.md](adr/2026-05-29-brandstyle-analyzer-lp-fidelity.md) + [adr/2026-05-29-fval-vision-judge-dim8.md](adr/2026-05-29-fval-vision-judge-dim8.md) + [adr/2026-05-29-dts-content-quality.md](adr/2026-05-29-dts-content-quality.md)
- Onderliggende ADR: [adr/2026-05-22-landing-page-builder-architectuur.md](adr/2026-05-22-landing-page-builder-architectuur.md)
- Plan: `~/.claude/plans/zippy-twirling-feigenbaum.md`
- Specs: [specs/dts-content-quality-improvements.md](specs/dts-content-quality-improvements.md), [specs/brandstyle-analyzer-improvement-plan.md](specs/brandstyle-analyzer-improvement-plan.md), [specs/dts-comparison-improvements.md](specs/dts-comparison-improvements.md)
- PR: https://github.com/erikjager55/Branddock/pull/14
- Commit (na squash-merge): TBD na merge

---

### 269. Brand-styleguide 1-op-1 fidelity — LP-renderer consumeert volledige scrape (8 batches)

Volledige doorhevel van BrandStyleguide-data naar LP-renderer (`puck-config.tsx`) zodat wat de Components-tab toont 1-op-1 in de gegenereerde landing-page terechtkomt. 8 batches: (1) Button uitgebreid met `border` / `transition` / `hoverBackground` / `hoverColor` op `ButtonTokens` + `mapButtonTokens` + `.lp-btn:hover` CSS-vars in `a11y-styles.ts`; (2) Typography 1-op-1 — h1/h2/h3/p/label/blockquote in BrandHero/FeatureGrid/PricingTable/Testimonial/FAQ/RichText halen `letterSpacing` + `textTransform` + `color` direct uit `typographyByRole`; (3) Section-colors — nieuwe tokens `darkSectionBg` (luminance-sorted darkest dark-bg) + `secondarySurface` (NEUTRAL/SECONDARY background-tagged, niet-surface, niet-brandSubtle), `hasDarkSections` detector verbreed (plain `background+dark` tags ipv alleen `usage:section-bg`); (4) Spacing-scale — `BrandStyleguide.spacingScale` JSON tokens worden via 3-condition rem/px heuristic (`hasFractional`→rem, `allInteger`+`hasLargeInt`→px, anders rem) doorgegeven aan `designSystem.spacing[]` zodat LP exact dezelfde rhythm krijgt als de scraper detecteerde; (5) PRODUCT_CARD — nieuwe `tokens.styleguideComponents.PRODUCT_CARD` driver voor FeatureGrid card-wrapper met `background`/`border`/`padding`/`borderRadius`/`boxShadow` overrides, plus elevation-fallback chain die archetype-shadow/border laat winnen wanneer scraped sample geen visuele afbakening geeft + C3 max-radius clamp via `pxFromCssValue` (rem-aware); (6) FEATURE_ICON — IconBlock badge-wrapper consumeert scraped sample (LINFI's gold-badge styling met witte icon), `pxFromCssValue` voor rem/em size-parsing; (7) TOP_NAVIGATION — nieuwe `BrandNav` Puck-component (8e in registry) leest scraped padding/bg/border/fontFamily, met scraped-button-styling voor de CTA-knop in nav; (8) QUOTE_BLOCK — Testimonial section pakt scraped bg/border/radius, scraped component-level padding wordt op inner wrapper toegepast (niet op section zelf — anders zou section-hoogte instorten). Nieuwe `src/lib/landing-pages/scraped-css-helpers.ts` centraliseert `isTransparentBackground()` (rgba/hsla alpha=0, transparent, var-resolves, inherit/initial) en `isNoOpBorder()` (width=0 met `(?=\s|$)` lookahead voorkomt `0.5px`-misclassificatie, `\bnone\b` voor style=none in shorthand). `canvas-context.ts` Prisma-select uitgebreid met `spacingScale` / `visualLanguage` / `components` (laatste met `orderBy [{confidence:'desc'},{sortOrder:'asc'}]` voor deterministische highest-conf pick). `mapStyleguideComponents` typeof-string guard voorkomt runtime-fouten op scraper-output met niet-string waardes. Twee nieuwe utility-scripts: `scripts/persist-brand-profiles.ts` (workspaceId+url → rendering-profiles persist zonder analyzer-run) + `scripts/rescrape-brand.ts` (workspace-name → volledige analyzer-cyclus met cascade-delete). LINFI eindstand verifieerd: spacing `[16,32,64,68,80,112]`, button 8 velden compleet (wit-bg / zwart border / Poppins / gold-hover-text), `darkSectionBg=#2E2F2A`, `secondarySurface=#FBF4BC` (cream), 4 styleguide-components (BUTTON/FORM_INPUT/FEATURE_ICON/TOP_NAVIGATION). Napking + Better Brands ook volledig re-analyzed (BUTTON, FORM_INPUT × 2). 3 review-iteraties: 4 CRITICAL fixes (productCard radius rem-handling + elevation-fallback, secondarySurface NEUTRAL/SECONDARY-only restrictie, darkSectionBg luminance-sort, brandSubtle defensive optional-chain) + 5 WARNING fixes (mapStyleguideComponents typeof-guard, productCard C3 max-radius clamp, a11y-styles `var(...,inherit)` fallback, centralized rgba-transparent detection, canvas-context deterministic ordering). Zero `tsc` errors, zero ESLint errors (1 pre-existing warning op `columns` destructure niet door dit werk geïntroduceerd), 580+ LP smoke-tests PASS / 0 FAIL over 27 testbestanden.

- Task: -
- ADR: -
- Spec: -
- Commit: `c0d6ac13`

### 266. Fase B — ad-publishing pipeline (Meta foundation + cron infra)

Complete Fase B end-to-end gebouwd per spec `docs/specs/ad-publishing.md`: 3 nieuwe Prisma-models (`ConnectedAdAccount` met encrypted OAuth-tokens, `AdCampaign` met state-machine draft→publishing→active|rejected|failed + 4 external IDs, `AdMetricSnapshot` lege table klaar voor Fase C fetch-job). AES-256-GCM token-encryption helper met IV-randomized roundtrip + auth-tag verificatie. Meta provider module (`src/lib/ad-providers/meta/`) bevat OAuth-flow (`buildAuthorizeUrl` + `exchangeCodeForShortLivedToken` + `convertToLongLivedToken` + `refreshLongLivedToken` + `appSecretProof`), Graph API client (`fetchUserMe` + `fetchAdAccounts`), en publish-pipeline (`publishFacebookAd` 4-step campaign→adset→creative→ad PAUSED + `fetchAdStatus` + `mapMetaStatusToInternal`). 7 API routes: `/api/ad-accounts` (GET list), `/api/ad-accounts/meta/{connect,callback,select,refresh,disconnect}` (OAuth-flow met CSRF state-tokens + soft-delete via `status='revoked'`), `/api/ad-publish/meta` (POST met inline-token-refresh + creative-spec validation + state-machine). Twee cron-jobs: `sync-ad-campaign-status` (5min, Meta-status polling met auth-error recovery) en `refresh-ad-tokens` (24u, pre-emptief verlengen 7d voor expiry). Twee Next.js standalone settings-pages (`/settings/integrations/ad-accounts` + `/select`) bypassen SPA-chrome voor OAuth UX. Twee smoke-tests: `npm run smoke:ad-encryption` (13 cases) + `smoke:ad-creative-validation` (15 cases), beide 0 failures. **Externe dependency** voor end-to-end: Meta App Dashboard met Business Verification + app-review approved (`META_APP_ID`/`META_APP_SECRET` env-vars). **Deferred uit deze sprint**: LinkedIn (7.6) — wacht op MDP approval; spiegelt zelfde shape als Meta zodra dependency klaar staat.

- Task: -
- ADR: [docs/adr/2026-05-22-ad-publishing-integration.md](docs/adr/2026-05-22-ad-publishing-integration.md)
- Spec: [docs/specs/ad-publishing.md](docs/specs/ad-publishing.md)
- Commit: _(deze commit)_

### 265. Ad-quality A.5.5 + A.5.6 — native-ad + retargeting-ad validators

Quality validation layer uitgebreid van 4 ad-types (search/display/facebook/linkedin) naar 6 met two new validators die structureel afwijken van de eerder geland set. **native-ad** volgt journalism rules in plaats van advertising rules: 13 L1-rules enforce dat headline + opening-paragraph zonder brand-mention werken, totaal brand-mentions ≤2 in body+brand-integration+closing (BuzzFeed Principle), en closing-takeaway geen sales-pitch is. L2-judge meet 4 editorial dimensions: editorial-voice-match, value-first-not-sales, brand-integration-naturalness, buzzfeed-principle (zou een lezer dit sharen zónder brand?). Weights L1=0.40/L2=0.60. **retargeting-ad** dekt 18 named groups (3 audience-scenarios × 6 fields) met scenario-aware rules: cart-abandoner mag geen aggressive urgency ("LAST CHANCE") gebruiken en moet specifieke friction adresseren (shipping/return/trust/payment-keyword), page-visitor moet new-angle hebben (Jaccard <0.6 met cart-abandoner copy), past-customer mag geen discount-language hebben (verspilt marge op trusted audience) en moet novelty leveren. L2-judge meet 4 scenario-fit dimensions: scenario-emotional-fit, friction-removal-precision, new-angle-quality, past-customer-novelty. Weights L1=0.35/L2=0.65 — scenario-fit is primair semantisch. `SUPPORTED_CONTENT_TYPES` in canvas-indicator uitgebreid naar set van 6.

- Task: -
- ADR: [docs/adr/2026-05-22-ad-quality-validation.md](docs/adr/2026-05-22-ad-quality-validation.md)
- Spec: [docs/specs/ad-quality-validation.md](docs/specs/ad-quality-validation.md)
- Commit: _(deze commit)_

### 264. Brand Assistant context-picker: `StrategyObservation` toegevoegd

Audit van Brand Assistant + Persona chat context-pickers (2026-05-19) wees 1 Tier-1 gap aan: AI-gegenereerde brand observations van Brandclaw Strategy Analyst (Phase A+B) waren wel zichtbaar in Brand Alignment UI, maar niet selecteerbaar als context in de chat. Nieuwe `ContextModule` `'observations'` toegevoegd (hardcoded Claw-pattern, geen `CONTEXT_REGISTRY`-entry — Persona chat / Canvas hebben observations niet nodig). Module is opt-in (niet in `DEFAULT_CONTEXT_MODULES`), drillable per observation, met `dismissedAt: null` default-filter die door explicit entity-IDs wordt overruled. Tier-2 cleanups (`Campaign` naar registry, `Deliverable` workspaceFilter-workaround) zijn vastgelegd als follow-up-tasks. Smoke partial: stap 1-5 runtime OK; 6-10 niet uitvoerbaar omdat er nog 0 observations in de hele DB bestaan (Strategy Analyst nog nooit gedraaid — geen manual trigger, Phase C cron niet live). Implementatie volgt 1:1 het bewezen `fetchTrendContext`-pattern.

- Task: [tasks/done/context-picker-strategy-observations.md](tasks/done/context-picker-strategy-observations.md)
- ADR: [docs/adr/2026-05-08-brandclaw-agent-architectuur.md](docs/adr/2026-05-08-brandclaw-agent-architectuur.md) (referentie — niet nieuw)
- Spec: -
- Commit: `711fdd19`

### 263. Competitor AI-event-classifier — pattern-detection bovenop diff-engine

AI-pattern-classifier toegevoegd die CATEGORY_REPOSITIONING (MAJOR) + TARGET_AUDIENCE_CHANGED (NOTABLE) detecteert bovenop de 7 deterministische diff-rules. Architectuur: async wrapper `computeDiffWithClassifier` draait BUITEN `prisma.$transaction` (refresh-route stap 8) zodat de 1-2s Haiku 4.5-call geen TX-locks vasthoudt; `applyCompetitorRefreshDualWrite` kreeg optionele `precomputedDetected` param. Inline Jaccard pre-filter bespaart ~33% AI-calls bij cosmetic shifts. Probe-baseline herbevestigd: 29/30 (96,7%) — geen Haiku-drift sinds 2026-05-08. Smoke 15/15 over 5 scenarios incl NL-fixture. Implementatie-afwijking gedocumenteerd in task-file: GEEN auto-severity-downgrade bij confidence<0,7 (audit toonde spread 0,92-0,98 te smal), alleen `[low-confidence]` summary-prefix.

- Task: [tasks/done/competitor-ai-event-classifier.md](tasks/done/competitor-ai-event-classifier.md)
- ADR: [`2026-05-08-competitor-snapshot-historie`](docs/adr/2026-05-08-competitor-snapshot-historie.md) (Fase 1 schema-context, geen nieuwe ADR)
- Spec: [tasks/_drafts/idea-competitor-ai-event-classifier.md](tasks/_drafts/idea-competitor-ai-event-classifier.md), audit [docs/audits/2026-05-08-competitor-classifier-events-accuracy.md](docs/audits/2026-05-08-competitor-classifier-events-accuracy.md)
- Commit: `9b448d2d`

### 262. Brandclaw Strategy Analyst — model-ID hotfix

Anthropic API gaf 404 op `claude-sonnet-4-6-20251001` (de dated suffix is geen
geldige model-ID). DEFAULT_MODEL in `agent-loop.ts` aangepast naar
`claude-sonnet-4-6`. Real-API smoke daarna 17/17 pass tegen Branddock Demo
workspace (4 tool-calls, $0.0549 cost, 24.9s latency, 0 false-positive
observations door two-reasons-test enforcement).

- Task: [tasks/strategy-analyst-stub.md](tasks/strategy-analyst-stub.md) (Phase B vervolg)
- ADR: -
- Spec: -
- Commit: `d488298c`

### 261. Brandclaw Strategy Analyst Phase B — 4 extra dimensions + UI sort/group

Phase B van de Strategy Analyst-stub levert de overige 4 observation-dimensies:
`fidelity_decline` (F-VAL composite-decline ≥10pt/30d per contentType),
`review_pattern` (top-3 finding-categorie herhaalt over 2-4 weken),
`alignment_gap` (AlignmentScan severity-distribution stagnant/worsening over
60+d met manual-fix-rate <50%), `publish_quality_trend` (publish-time F-VAL
daalt OF PublishGateOverride frequency stijgt). System-prompt bump
`strategy-analyst@0.1.0` → `0.2.0` met deterministische volgorde van
prompt-fragments zodat `computePromptVersion` stabiel blijft. UI: view-mode
toggle (Group per dimension / Severity flat-list) met SEVERITY_RANK comparator
(HIGH → MEDIUM → LOW, dan newest-first). Smoke-test breidt assertion uit naar
alle 5 dimension-fragments.

- Task: [tasks/strategy-analyst-stub.md](tasks/strategy-analyst-stub.md) (Phase B)
- ADR: [adr/2026-05-08-brandclaw-agent-architectuur.md](adr/2026-05-08-brandclaw-agent-architectuur.md)
- Spec: -
- Commit: `58094f8e`

### 260. Brandclaw Strategy Analyst Phase A vervolg — UI Tab 5

Phase A's UI-laag gewired: BrandclawObservationsTab in BrandAlignmentPage als
Tab 5 "Strategy Analyst" met Brain-icon. GET `/api/brandclaw/observations`
met dimension/severity/includeDismissed filters; PATCH
`/api/brandclaw/observations/[id]` met markRead/markActed/dismiss/undo
actions. ObservationCard rendert severity/confidence badges + action-buttons
+ dismiss-reden input. EvidenceModal toont DataSnapshot drilldown per
observation. TanStack Query 5 hooks (`useStrategyObservations`,
`useRunStrategyAnalyst`, `usePatchObservation`). `AlignmentTab` union type
uitgebreid met `brandclaw` variant.

- Task: [tasks/strategy-analyst-stub.md](tasks/strategy-analyst-stub.md) (Phase A vervolg)
- ADR: [adr/2026-05-08-brandclaw-agent-architectuur.md](adr/2026-05-08-brandclaw-agent-architectuur.md)
- Spec: -
- Commit: `8f09d2e3`

### 259. Fix — Auto-iterate "Verbeter automatisch" gate + silent-iter scope-fix

User klikte op de "Verbeter automatisch" CTA in canvas FidelityScoreBar (long-form
deliverable, blog/landing-page/newsletter) en kreeg `"Niet genoeg content om te
verbeteren — genereer eerst content"` terwijl content visueel zichtbaar was. Twee
compounding bugs gefixt: (1) silent auto-iterate (`canvas-orchestrator.ts:863-920`)
miste `variantIndex: 0` filter in zijn query — `groupIndex` defaultt naar 0 dus de
"variant-0" query matchte ALLE componenten, silent-iter kon variant B/C/D body
clobberen. (2) silent-iter pakte de langste text-component en verving die met een
F-VAL tightening rewrite (typisch ~40 woorden voor long-form), waarna variant-0
onder de hardcoded 50-woorden gate van `/auto-iterate/trigger` viel. Fix: (a)
scope-filter `variantIndex: 0` + `componentType notIn ['image', 'video', 'voiceover']`
+ `generatedContent: { not: null }` op silent-iter én beide apply-routes
(`/auto-iterate/apply`, `/strict-rewrite/apply`). (b) don't-shrink guard via
`getDeliverableTypeById().constraints.minWords` + relatieve 70%-floor +
`maxWords` cap (silent-iter alleen; apply-routes blijven user-explicit). (c)
trigger-gate met split error-message (F-VAL floor vs content-type richtlijn) +
type-aware label via `typeDef.name`. (d) `console.warn` op alle silent-return
paden inclusief no-eligible-component branch zodat smoke divergence kan zien.
5 review-iteraties, code-level integratie smoke 13/14 passes op 5 long-form
deliverables.

- Task: [tasks/done/auto-iterate-trigger-content-gate.md](tasks/done/auto-iterate-trigger-content-gate.md)
- ADR: -
- Spec: -
- Gotcha: `gotchas.md` 2026-05-17 "Silent auto-iterate clobbert variants + shrinkt long-form onder F-VAL gate"
- Plan: `~/.claude/plans/eager-hatching-planet.md`
- Commit: `cdd0e074`

### 258. Fix — Effie-rubric leak uit content-flow Strategy-step (P2 shared-pipeline)

Bugfix tijdens handmatige content-items-test-coverage Ronde 1: `linkedin-post`
Strategy-step bevatte letterlijk "effie-waardig" in de rationale-tekst — leak
uit interne Effie Award kwaliteits-rubric in `campaign-strategy.ts` prompts
(gedeeld tussen campaign-mode en single-content-mode via `selectedContentType`
parameter). 3-laagse defense-in-depth: (a) prompt-guards (EFFIE TEST → STRATEGIC
QUALITY TEST in `<internal_rubric>` + output-language-guards in 4 system-prompts
incl. buildStrategyBuildPrompt), (b) nieuwe `src/lib/ai/sanitize-strategy-output.ts`
utility met `scrubStrategyLayer()` toegepast op alle 3 StrategyLayer-productie-sites
(regeneration + concept-driven + quick-concept route), (c) `Effie/Cannes potential:`
labels in angle-context → `Award potential:`. Regex met word-boundary handelt
edge cases (Éffie accent, effie_award underscore, Effie/Cannes slash, Effie's
possessive) zonder onschuldige woorden (effectief, Jeffie) te raken. 30/30
smoke-cases groen. STOP-GATE genomen — representanten-test kan hervatten.

- Task: [tasks/content-items-test-coverage.md](tasks/content-items-test-coverage.md) (parent, still in-progress)
- ADR: -
- Spec: -
- Bug-log: `docs/playbooks/testplan-content-items.md` sectie 5 (linkedin-post FIXED 2026-05-17)
- Gotcha: `gotchas.md` 2026-05-17 "Internal-rubric prompt-jargon lekt via NL-vertaling"
- Follow-ups out-of-scope: veldnaam-rename `effieRationale` → `strategicQualityRationale`, hardcoded UI-labels in ConceptReviewView/ReviewStep/StrategySection, studio promo-video bio-leak
- Commit: `e849a1ed`

### 257. Track A code-debt phase close-out — Cluster A + B + C done

Closure-entry voor `code-debt-pre-launch-cleanup`. Alle drie de clusters (A
persist-TODOs / B API-deprecation / C cleanup) zijn afgerond binnen één
sessie 2026-05-17 plus eerder werk op 2026-05-12.

**Cluster A — Persist-TODOs (kritiek voor pilot UX):**
- Variant-selection persist via API (2026-05-12)
- Fix-options cache-based persist met 60-min TTL: `generateFixOptions` schrijft
  `FixOptionsResponse` naar `fix-options:${issueId}` cache, `applyFixOption`
  leest cache-hit zodat preview ↔ apply consistent zijn (geen temperature 0.3
  drift). Geen schema-change — gebruikt bestaande `lib/api/cache`.
- Persona image-storage via `getStorageProvider()`: base64 data-URI (~500KB
  per row) vervangen door stable storage URL (R2 prod, local dev). Best-effort
  cleanup van oude bestanden bij regeneratie. Persona-row shrinkt naar ~50
  bytes per avatar.
- ProseMirror diff via Markdown-isatie: rich-text inputs (headings, lists,
  blockquotes, marks bold/italic/code/underline/strike/link) serialiseren naar
  Markdown vóór paragraph-LCS, zodat formatting + structurele changes als
  remove+add entries verschijnen i.p.v. "no change". Geen externe lib —
  TipTap camelCase + canonical PM snake_case beide gehandhaafd.

**Cluster B — API-deprecation:**
- `analyzeMultipleSources` (deprecated) gemigreerd naar `synthesizeTrends` in
  researcher.ts: fallback bouwt raw-content `Signal[]` met long claim/evidence,
  zelfde patroon als de bestaande below-threshold augmentation. Twee
  deprecated functies + interne types verwijderd uit trend-analyzer.ts.
  Net -190 regels code.

**Cluster C — Cleanup:**
- Design-tokens dev-only nav-entry weg (2026-05-12).
- BrandAlignmentPage lazy-load — al gedaan via `lazy-imports.ts` + LazyWrapper
  (task-file comment was stale, verified 2026-05-17).
- urgencyLevel deprecation: input-type was number 1-5 maar canvas-orchestrator
  compareerde tegen string `'high'` — branch nooit gevuurd. Removed; strategic
  urgency loopt via adCtaType + hookFormat + urgencyMechanism.
- Step1Context `Suggest from content` error-bubble: parsed nu echte server 400
  body ("Insufficient context — add a key message, persona, or product first")
  i.p.v. generieke fallback.

**Bonus findings (deferred):**
- `DELIVERABLE_TYPE_SETTINGS` map heeft 0 consumers — full dead-code
- `buildMultiSource*` helpers in `prompts/trend-analysis.ts` orphaned na B
- `ImageSuggestion.strengths` field niet meer gerenderd sinds F-LinkedIn-1d

- Task: [tasks/done/code-debt-pre-launch-cleanup.md](tasks/done/code-debt-pre-launch-cleanup.md)
- ADR: -
- Spec: -
- Commits: 9f9b5ad2 (C: error-bubble + urgencyLevel), da9fc408 (B: analyze→synthesize), 9556016f (A: fix-options cache), 3dae25c6 (A: persona avatar storage), 5e919c5e (A: PM diff)
### 256. Brandclaw tool-orchestrator — Anthropic agent-loop + 4 query-tools live

Track B vervolg op data-collection (#255). Orchestrator is volledig
functioneel; `strategy-analyst-stub` (eerste agent-node) heeft hiermee
alle benodigde infrastructuur. Twee sub-fasen, beide groen.

**Fase 1 (commit b426d064)** — orchestrator infrastructure:
- 5 modules in `src/lib/brandclaw/orchestrator/`: types / tool-registry /
  cost-calculator / persistence / agent-loop + public index.ts.
- NodeType union (strategy_analyst / campaign_builder / measurement_eval
  / optimization), BrandclawRunContext, BrandclawTool, AgentLoopResult.
- Tool-registry per-node-type met cross-node isolation.
- Cost-calculator: Sonnet 4.6 / Opus 4.7 / Haiku 4.5 pricing + fallback.
  6-decimal precision matched Decimal(10,6).
- Persistence: createRunRow placeholder + persistRun finalize in
  transaction. ToolCallTrace per-entry getrunceerd naar 4KB voor jsonb
  size-budget.
- Agent-loop: multi-turn Anthropic tool-use met hard-timeout (5min),
  max-tool-calls (20), parallel tool-execute per turn, isError-result
  voor unknown/throwing tools, lenient JSON-parse voor observations.

**Fase 2 (deze commit)** — query-tools + telemetry:
- 4 strategy_analyst tools: `query_alignment_history`,
  `query_content_fidelity`, `query_review_history`,
  `query_brand_voice_drift` (default 90d window). Allen wrappen
  data-source via registry.
- tools/index.ts: side-effect register-imports.
- Agent-loop emit `brandclaw_run_completed` PostHog event fire-and-
  forget na persistRun.

**Smoke-test**: 23/23 → 29/29 groen. Tool-registry isolation +
cost-calculator + persistence E2E + v1 tools auto-register +
empty-workspace query execute. Anthropic API niet aangeroepen — real-API
test deferred naar strategy-analyst-stub.

**Unblockt**: `strategy-analyst-stub` (Phase 3 first node).

- Task: [tasks/done/brandclaw-tool-orchestrator.md](tasks/done/brandclaw-tool-orchestrator.md)
- ADR: [adr/2026-05-08-brandclaw-agent-architectuur.md](adr/2026-05-08-brandclaw-agent-architectuur.md)
- Spec: -
- Commits: `b426d064` (Fase 1) + commit deze entry

### 255. Brandclaw data-collection — DataSnapshot + 4 sources + Strategy Observation schema

Track B foundation pre-launch. ADR-2 schema-laag volledig live op
worktree `branddock-brandclaw`. Twee sub-fasen, beide groen.

**Schema (2 nieuwe models + 1 input-laag, 2 enums)**:
- `DataSnapshot` — immutable point-in-time inputs (workspaceId,
  sourceType TEXT, sourceId, payload JSONB, snapshotAt). Indexed op
  (workspaceId, sourceType, snapshotAt) + (sourceType, sourceId).
- `StrategyObservation` — versioned agent-output (agentVersion +
  promptVersion stempels voor drift-detection + A/B-testing).
  Evidence-veld linkt DataSnapshot rows.
- `StrategyObservationRun` — run-metadata met toolCallTrace JSON,
  totalCostUsd Decimal(10,6), latencyMs, triggerType.
- Enums ObservationSeverity (HIGH/MEDIUM/LOW) + Confidence per
  two-reasons-toets §11 — bewust apart van IssueSeverity.
- 2 formele Prisma migrations.

**Time-window primitives** (`src/lib/brandclaw/time-window.ts`): 4
helpers (`sinceNDaysAgo` / `between` / `sinceVersion` / `allTime`)
met `TimeWindow.toWhere(field)` Prisma-fragment-helper.

**DataSource registry + 4 v1 sources**:
- Singleton registry met lazy-init via `getDataSourceRegistry()`,
  importeert alle 4 v1 sources parallel via Promise.all.
- `alignment-scan-source.ts`: AlignmentScan + issue-counts per severity.
- `content-fidelity-source.ts`: ContentFidelityScore + BrandReviewFinding
  per severity/category.
- `review-log-source.ts`: ContentReviewLog (Δ-1) met source-mix +
  duration + finding-distribution.
- `voiceguide-source.ts`: drift via ResourceVersion VOICEGUIDE-historie
  + current voiceguide-state als baseline voor diff-walk.

**Smoke-test**: 16/16 (Fase 1) → 29/29 (Fase 2) groen.

**Unblockt**: `brandclaw-tool-orchestrator` (volgende task — Anthropic
tool-use die deze 4 sources via tools exposed aan Strategy Analyst
agent-loop).

- Task: [tasks/done/brandclaw-data-collection.md](tasks/done/brandclaw-data-collection.md)
- ADR: [adr/2026-05-08-brandclaw-agent-architectuur.md](adr/2026-05-08-brandclaw-agent-architectuur.md)
- Spec: -
- Commits: `90aa24ab` (Fase 1) + `1088b83a` (Fase 2)

### 254. Content-test sub-sprint #6.A — checkpoint-gates volledig gewired + closed

Closure-entry voor `content-test-wiring-gates-6A` task. Alle 8 checkpoint-gates
(brief-input / context-completeness / angle-diversity / variant-output /
sanitization / fidelity-composite / strict-rewrite / persistence) zijn
gedefinieerd in `src/lib/content-test/checkpoint-gates.ts` en gewired in
`canvas-orchestrator.ts`. Block-severity gates yielden SSE `error`-events met
`gate`-label voor client routing; warn-severity worden geaccumuleerd en
gepersisteerd naar `AICallTrace.gateWarnings`. PostHog telemetry via
`gate-metrics.ts` (`emitGateRunMetrics` + `checkGateDegradation`,
default-threshold 95% pass-rate over rolling 20-runs window) volgt de
infrastructuur op die productie-pipeline-health surfaceert.

Smoke-suite `scripts/smoke-tests/checkpoint-gates.ts` valideert 43 cases
(pass + block + warn per stage + batch-aggregator) — 43/43 groen op final
run. Bewuste interpretatie van acceptatie-bullet "8 stage-smokes × 8 files":
consolidated coverage gekozen boven 8 aparte files zonder coverage-winst.

Sub-sprint #6 Track A foundation hiermee volledig groen.

- Task: [tasks/done/content-test-wiring-gates-6A.md](tasks/done/content-test-wiring-gates-6A.md)
- ADR: -
- Spec: [docs/specs/content-test-improvement-plan.md §3.2](specs/content-test-improvement-plan.md)
- Commit: close-only entry (gates code in eerdere sprint-commits)

### 253. Image-quality-chain — 7 patterns A-G volledig geland

Multi-modal image quality pipeline volledig live: van prompt-construction tot
post-gen scoring + refine-loop + sourcing-strategie. Sluit Track A pre-launch
sprint #6/#7 image-quality scope (~10d effort over 4 sessies).

**7 patterns geleverd**:

- **Pattern A — Negative prompts** (commit 2645ee32/f9dc1180): defaults +
  per-workspace `imageryDonts` extension. Native `negative_prompt` parameter
  naar FAL Flux, Avoid-directive fallback voor Gemini Image. Consolideert
  signaal door duplicate "Avoid:" segment uit `ctx.brandImageryStyle` te
  verwijderen.
- **Pattern B — Multi-candidate** (commit 17f8ac4d): per-content-type
  default (`landing-page`/`blog-post`/`explainer-video`/`instagram-post(-carousel)`
  = 3, rest 2) via `getMultiCandidateDefault`. Auto-scoring parity:
  generate-visual (lifestyle FLUX) ontbrak fire-and-forget
  `scoreImageFidelity`; toegevoegd zodat alle 3 routes consistent zijn.
- **Pattern C — Dimension-breakdown UI** (commit f9dc1180): user-friendly NL
  labels + tooltips voor 5 visual-judge dimensies in
  `visual-dimension-labels.ts`. VisualFidelityDetail JudgeDimensions
  gebruikt `getDimensionLabel` ipv ruwe key-replace.
- **Pattern D — Image-to-image refine-loop** (commit 17f8ac4d):
  `refine-loop.ts` met `extractRefineHint` + `buildRefinePromptModification`
  heuristiek (5 dimension-templates, severity-sorted, max 3 hints).
  REFINE_TRIGGER_THRESHOLD 65, REFINE_MAX_ITERATIONS 2. POST endpoint
  `/api/studio/[id]/components/[componentId]/refine-visual` met lock-check
  + version-snapshot guards. UI `RefineImageButton` (groene Wand2 icoon)
  bij composite &lt; 65.
- **Pattern E — OCR text-in-image** (commit 94535a01): `ocr-check.ts` via
  Google Vision API. Penalty trekt 50% van OCR-deductie af van text-in-image
  dimension. OCR-data persisted in `aiJudgeDimensions.ocr` (geen schema-
  change). Smoke-script + `.env.example` documentatie.
- **Pattern F — Brand-color UI exposure** (commit 94535a01):
  VisualFidelityBadge toont nu off-brand count als kleine red pill naast
  composite-score, alleen wanneer `colorAlignment.unmatchedColors > 0`.
- **subjectIdentity 6e dimensie** (commit 94535a01): VISUAL_DIMENSIONS
  uitgebreid voor compose-flow drift-detection.
- **Pattern G1 — Modality-fit** (commit b33b767a): `recommendedModality`
  (photo/illustration/infographic/ugc/none) helper + 25+ content-types
  gemapped. ModalityHint banner met icoon + accent-color in ImageSourcePanel.
- **Pattern G2 — Reuse-detection** (commit eaf90808): pgvector embedding
  op MediaAsset.aiDescription via OpenAI text-embedding-3-small. Formele
  Prisma migration met IVFFlat cosine-index. Endpoint
  `/api/media/similar-semantic`, upload-trigger in `dam-auto-tagger`,
  `ReuseDetectionBanner` met dismissible UI (threshold 0.75).
- **Pattern G3 — Unified smart-search** (commit d45d126e): nieuwe tab in
  ImageSourcePanel combineert workspace library (semantic via pgvector,
  threshold 0.5) + Pexels (keyword). SmartSearchTab met source-badges +
  similarity-percentage + Pexels attribution footer.
- **Pattern G4 — Copy-image coherence-score** (commit b33b767a): Claude
  Haiku judge die image + variant text-content samen beoordeelt op
  subject-match / audience-match / message-reinforcement. 7e dimensie
  geïntegreerd in `aiJudgeDimensions.dimensions` onder
  `copy-image-coherence` key, gerendert via bestaande `getDimensionLabel`
  lookup.
- **Pattern G5 — Illustration pipeline templates** (commit deze entry):
  `illustration-templates.ts` met 5 styles (flat/3d/hand-drawn/minimalist/
  editorial) + per-content-type defaults (twitter→flat, blog→editorial,
  explainer-video→3d, tiktok-script→minimalist). Auto-injected vooraan
  positive-prompt wanneer chip='illustration'. Style-consistency over
  content-items binnen één campagne.

**Cost-impact per image-scoring totaal**: ~$0.04 (Sonnet visual-judge) +
~$0.001 (Haiku coherence) + ~$0.0015 (Vision OCR) = ~$0.043/image. Multi-
candidate 3× voor 5 expensive content-types = ~$0.13 per generation run.
Reuse-event bespaart 100% generation-cost.

**Quality-gates per fase**: TypeScript 0 errors, lint 0 errors, formele
Prisma migrations toegevoegd voor andere environments (MediaAsset.embedding,
VOICEGUIDE enum, MediaAsset.embeddingComputedAt + IVFFlat cosine-index).

**Out-of-scope** (vervolg-tasks): Backfill MediaAsset embeddings voor
bestaande workspaces (admin endpoint), Unsplash + Brandfetch integraties
(geen API keys; LATER roadmap, $99/mnd Brandfetch), v2 illustration via
ConsistentModel LoRA's (post-launch).

- Task: [tasks/done/image-quality-chain.md](tasks/done/image-quality-chain.md)
- ADR: -
- Spec: [docs/specs/content-test-improvement-plan.md §3.0.5](specs/content-test-improvement-plan.md)
- Commits: `2645ee32` + `f9dc1180` + `17f8ac4d` + `94535a01` + `b33b767a` + `eaf90808` + `d45d126e` + final G5

### 252. Tone of Voice tab consolidatie — BrandStyleguide → BrandVoiceguide

Schema-consolidatie van 3 velden (`contentGuidelines`, `writingGuidelines`, `examplePhrases`) plus de save-for-AI toggle (`toneSavedForAi` gesplitst in `guidelinesSavedForAi` + `examplePhrasesSavedForAi`) van `BrandStyleguide` naar `BrandVoiceguide`. Voice DNA tab in Brand Voice toont nu Content + Writing Guidelines (met OBSERVED/RECOMMENDED prefix-parsing), Vocabulary tab krijgt Do/Don't examples. Brand Styleguide "Tone of Voice" tab + `/api/brandstyle/tone-of-voice/` route + `ToneOfVoiceSection.tsx` zijn verwijderd. De migratie-banner "Voice, Tone & Communication Style — moved" in BrandPersonalitySection is opgeruimd.

**Migratie-pad** (additief eerst, data-loss laatst):
1. Prisma schema: ADD nieuwe kolommen op `BrandVoiceguide`
2. Data-migratie: idempotent script kopieerde 13 workspaces (10 nieuwe voiceguides, 3 updates) — script zelf na uitvoering verwijderd voor lint-conformiteit, ADR documenteert het pad
3. ~25 lees-sites omgeschakeld: AI-context-builders (`brand-context.ts`, `knowledge-context-fetcher.ts`), F-VAL alignment (`audit-scoring`, `data-fetcher`, `fix-generator`), claw read-tools, campaign-strategy-chain, snapshot-builders, consistent-models resolvers, design-system resolver/emitters, brand-kit composite PDF, Studio tone-check, brandstyle/ai-context route, workspace export route
4. UI: Voice DNA + Vocabulary section components uitgebreid; brandvoice API routes accepteren nieuwe velden via Zod
5. Cleanup: Tone of Voice tab/section/route weg, moved-banner weg, types opgeruimd
6. Prisma schema: REMOVE oude kolommen + `db push --accept-data-loss`
7. Formele Prisma migration toegevoegd (`20260515140000_consolidate_tone_of_voice_to_voiceguide`) voor reproducibility

**Alignment fix-generator reroute** — wanneer een Brand Alignment-fix `contentGuidelines` / `writingGuidelines` op een Brandstyle entity wil schrijven, routeren we de update transactioneel naar BrandVoiceguide. Lock-check op de Brandstyleguide entity behoudt governance-parity; best-effort version-snapshot van de voiceguide-state.

**Finalize review-loop** — 3 iteraties:
- Round 1: 2 CRITICAL gefixt (analysis-engine partial upsert preserve user-edits; fix-generator Brandstyle→Voiceguide reroute), 4 WARNING gefixt (legacy StyleguideTab union, snapshot-comment, brand-context gate-semantics, onNavigate dead-prop)
- Round 2: 1 CRITICAL gefixt (formele Prisma migration toegevoegd zodat andere environments kunnen reproduceren), 1 CRITICAL gefixt (fix-generator reroute toegevoegd met lock-check + version-snapshot)
- Round 3: 1 CRITICAL gefixt (e2e tests verwijderd voor tone_of_voice tab + section), 1 WARNING geaccepteerd met comment (ResourceVersion gebruikt STYLEGUIDE enum voor voiceguide-payload — geen VOICEGUIDE enum yet, follow-up)

**Files**:
- Task: [tasks/done/tone-of-voice-merge-into-brand-voice.md](tasks/done/tone-of-voice-merge-into-brand-voice.md)
- ADR: [adr/2026-05-15-tone-of-voice-consolidation.md](adr/2026-05-15-tone-of-voice-consolidation.md)
- Spec: -
- Commit: `3288adec`

### 222. Documentatie-architectuur migratie (week 1)

CLAUDE.md teruggebracht van 2323 → 270 regels, repo root van 37 → 5 .md bestanden. Nieuwe `docs/` structuur (adr/playbooks/specs/archive), `tasks/<id>.md` pattern, `roadmap.md` met Now/Next/Later, `START_HERE.md` als entry point, 8 retroactieve ADRs en `docs/changelog.md` als doorgaand register.

- Task: [tasks/done/docs-migration-week-1.md](../tasks/done/docs-migration-week-1.md)
- ADR: [adr/2026-05-07-claude-md-restructure.md](adr/2026-05-07-claude-md-restructure.md), [adr/2026-05-07-tasks-as-files.md](adr/2026-05-07-tasks-as-files.md)
- Spec: -
- Commit: `47cf1aa` (week 1) + `0abd656` (afronding)

### 223. Backlog herstructurering — open plans + roadmap items naar tasks/

13 NOW + Next-bucket roadmap-items gedistilleerd naar `tasks/<id>.md` files volgens template (campaign-drafts, claw-page-awareness, power-user-shortcuts, hooks-routines-week-3, stripe-billing-live, vercel-deployment, pilot-onboarding-better-brands, posthog-sentry-browser, canvas-inline-edit-overlays, bv-wire-w1-full-centroid, content-styling-migratie, tech-debt-any-types, auto-trigger-fidelity-scoring). Roadmap-links bijgewerkt, originele plan-docs in archive gemarkeerd als gedistilleerd.

- Task: [tasks/done/tasks-migration-week-2.md](../tasks/done/tasks-migration-week-2.md)
- ADR: [adr/2026-05-07-tasks-as-files.md](adr/2026-05-07-tasks-as-files.md)
- Spec: -
- Commit: `0abd656`

### 224. Hooks + skills + subagents + eerste autonome routine (week 3)

`.claude/settings.json` met PostToolUse Edit hook (tsc + eslint via `post-edit-typecheck.sh`), PreToolUse Bash hook (`check-dangerous-bash.sh`), Stop hook (`session-summary.sh`). Skills `pre-commit` en `adr-create` toegevoegd naast bestaande `task-finalize`. Subagents `code-reviewer`, `regression-detector`, `doc-keeper`. Eerste autonome routine `nightly-doc-sync.yml` (02:00 NL, max 50K tokens) — eerste handmatige run + cost-monitoring blijven handover-items voor user.

- Task: [tasks/done/hooks-routines-week-3.md](../tasks/done/hooks-routines-week-3.md)
- ADR: -
- Spec: [playbooks/working-flow.md](playbooks/working-flow.md)
- Commit: `0abd656`

### 225. Feature-planner sparring-partner (PM + Tech-Lead subagents)

Twee gescheiden subagents voor feature-discovery vóór code wordt geschreven. `feature-planner` (PM-mode) doet 6-assen discovery + anti-sycophancy (3 redenen om NIET te bouwen) + 5-punts stop-conditie + Red Team Review, output naar `tasks/_drafts/idea-<id>.md`. `technical-planner` (Tech-Lead-mode) past Phase -1 Gates (Simplicity/Anti-Abstraction/Integration-First) toe en promoot idea-file naar uitvoerbare `tasks/<id>.md`. Forced commitment moment tussen fases voorkomt premature technical design — onderzoek wees dit aan als #1 valkuil voor solo-devs. Plus: 2 nieuwe Stream Deck triggers (Plan feature, Tech plan), staging area `tasks/_drafts/`, gids `docs/playbooks/feature-discovery.md`. Smoke-test handover voor user.

- Task: [tasks/done/feature-planner-setup.md](../tasks/done/feature-planner-setup.md)
- ADR: [adr/2026-05-07-feature-planner-architecture.md](adr/2026-05-07-feature-planner-architecture.md)
- Spec: [playbooks/feature-discovery.md](playbooks/feature-discovery.md)
- Commit: `5bd7886`

### 226. Studio component generation — echte AI in 3 routes (P0)

TODO-stubs in `generate`/`regenerate`/`generate-all` routes vervangen door echte AI-calls via nieuwe `dispatchTextCompletion` (multi-provider: Anthropic/OpenAI/Google). Cascading-context werkt nu in generate-all (component N ziet output van 1..N-1 via uitgebreide `buildCascadingComponentContext` met `includeStatuses` parameter), feedback wordt eerlijk gehonoreerd in regenerate (bug-fix: oude versie las stale feedbackText), en NEEDS_REVISION rijen in generate-all gebruiken hun bestaande feedback (compileComponentFeedback). Observability via `aiProvider`/`generationDuration`/`promptUsed` op DeliverableComponent. Concurrency-guards via `updateMany` met status-filters voorkomen double-spend op parallelle calls; metadata pas op success-path. Cache invalidation per `prefixes.{studio,campaigns,dashboard}`. Long-form components (body_text/article/blog_body etc.) krijgen 8192 tokens + 180s timeout via per-componentType helper. Prompt-injection via `additionalInstructions`/`feedback` afgevangen (strip leading `#`, length cap). 6 nieuwe helpers: `anthropicClient` singleton, `dispatchTextCompletion`, `buildComponentPrompt`, `extractPersonaIdsFromSettings` (canonical `targetPersonas` key), `getMaxTokensForComponent`, `sanitizeUserInput`. Plus `npm run smoke:studio` integratie-test (`scripts/smoke-tests/studio-generation.ts`) die de routes-logica direct aanroept tegen real-DB + real-AI. 5 review-rounds (2-subagent loop) liepen tot 0 CRITICAL/WARNING.

- Task: [tasks/done/studio-content-generation-real-ai.md](../tasks/done/studio-content-generation-real-ai.md)
- ADR: -
- Spec: -
- Commit: `4a54fad` (initial) + `fbc44d7` (hardening)

### 227. ContentVersion CRUD + studio hooks + version-history sidebar

Server-side: 4 CRUD-routes onder `/api/content/[deliverableId]/versions/` (list/detail/create-USER/restore). Helper `src/lib/learning-loop/content-version.ts` met `createContentVersion` (auto-versionNumber met retry-on-P2002 race-protection, USER-edits krijgen automatisch diff via bestaande buildDiff/classifyEdit), `restoreContentVersion` (transactioneel revert van deliverable + componenten met P2025 graceful skip voor verwijderde componenten, schrijft nieuwe USER-version voor audit-trail), `buildDeliverableSnapshot`. ContentVersion is per-deliverable (Cat 4 design uit `branddock-learning-loop-decisions.md` beslissing 4): full deliverable + alle componenten in 1 snapshot, restore reverteert hele bundle. AI-versies krijgen `createdBy='AI'`, alle 4 diff-velden NULL; USER-versies krijgen `editorUserId` + `diffFromPrevious` + `diffSummary` + `editType`. Hooks in 3 studio-routes (generate/regenerate/generate-all) creëren automatisch AI-versions na success én vuren async `scoreContentFidelity` af (absorbeert `auto-trigger-fidelity-scoring` task). Cache: nieuwe `prefixes.contentVersions(deliverableId)`. Client-side: API-client + 4 TanStack hooks (`useContentVersions` met staleTime=0 voor refetch-on-focus, `useContentVersion` met staleTime=Infinity want immutable, `useCreateUserContentVersion`, `useRestoreContentVersion`) + `VersionHistorySidebar.tsx` component met loading/error/empty states + restore-confirmatie. UI-integratie in CanvasPage als handover (drop-in: `<VersionHistorySidebar deliverableId={...} />`). 2 review-rounds tot 0 CRITICAL/WARNING. Smoke-test (Test 4 in `npm run smoke:studio`) verifieert end-to-end: AI-version → USER-version met editType=expand → restore creëert nieuwe version en reverteert component-content.

- Task: [tasks/done/content-versioning-crud.md](../tasks/done/content-versioning-crud.md)
- ADR: -
- Spec: -
- Commit: `58355cf` (iter 1+2 server) + `9dc5e2a` (iter 3+4 UI)

### 228. Auto-trigger fidelity-scoring (absorbed in #227)

`scoreContentFidelity()` wordt nu async fire-and-forget aangeroepen na elke AI ContentVersion-creatie in generate/regenerate/generate-all. Was geblokkeerd op ContentVersion-routes; afgerond als deel van #227.

- Task: [tasks/done/auto-trigger-fidelity-scoring.md](../tasks/done/auto-trigger-fidelity-scoring.md)
- ADR: [adr/2026-05-05-fval-three-pillar.md](adr/2026-05-05-fval-three-pillar.md)
- Spec: -
- Commit: `58355cf`

### 229. Brand-voice content integration (absorbed by 3 eerdere werkstromen)

Task gesloten zonder nieuwe code: de scope was BrandVoiceguide injectie in generation-prompts + voice-consistency score, maar drie eerdere werkstromen leveren dit samen al. **(1) BV-1 (sessie 2026-05-06)** voegt `brandVoiceguide` veld aan `BrandContextBlock` en rendert via `formatBrandVoiceguide()` in alle drie tier-renders van `formatBrandContext()` — dus elke AI-call die `getBrandContext()` gebruikt krijgt voice automatisch. **(2) Sessie 3j fidelity-scorer (2026-05-06)** definieert `brand-fidelity` als universal core criterion in elke content-category met description "Voice consistency, value-message alignment, positioning reinforcement" — `source: 'ai-judge'` zodat de AI-judge call de voice-fit beoordeelt. **(3) Entry #227 content-versioning-crud (2026-05-07)** bedraadt `void scoreContentFidelity()` na elke AI ContentVersion in generate/regenerate/generate-all routes. Resultaat: voice gaat automatisch de prompt in én wordt automatisch achteraf gescoord. Aparte voice-check route + dedicated voice-score badge in canvas blijven open als follow-up indien gewenst, maar zijn UI-keuzes — geen integratie-werk meer nodig.

- Task: [tasks/done/brand-voice-content-integration.md](../tasks/done/brand-voice-content-integration.md)
- ADR: [adr/2026-05-06-brand-voice-extraction.md](adr/2026-05-06-brand-voice-extraction.md)
- Spec: -
- Commit: -

### 230. Content publish QA-gate (fidelity-score blokkeert bij sub-threshold)

Server-side: helper `src/lib/learning-loop/content-readiness.ts` `getContentReadiness(deliverableId, workspaceId)` haalt de meest recente `ContentFidelityScore` op over alle versies van de deliverable (niet alleen latest version, dat zou bij user-edits silent failsafe-open triggeren). Drie nieuwe API-routes: `GET /api/studio/[deliverableId]/readiness` (status-check voor UI), `POST /api/studio/[deliverableId]/publish-with-override` (override-pad met `reason: string min 10 max 500`, emit `content.published` met `reason="override (score N): <text>"` voor analytics). Bestaande `POST /api/studio/[deliverableId]/publish` route blokkeert nu met 422 bij `!canPublish` met details + override-endpoint URL. **Channel-publish gate**: `POST /api/studio/[deliverableId]/publish-to-channel` (de route die naar LinkedIn/email/WordPress pushed) heeft dezelfde gate gekregen — accepteert `overrideReason` body-veld als bypass, emit override-event bij gebruik. Failsafe-open bij no-version/no-score zodat infrastructuur-outage publish niet brickt. Threshold per content-type uit bestaande `fidelity-criteria.ts compositeThreshold` (70 default, 65 voor social, etc.). Client-side: API-client + 2 TanStack hooks + drop-in `PublishGate.tsx` component (badge groen/geel/rood + disabled publish-knop met tooltip + override-modal met escape-to-close, role=dialog, focus-trap-baseline + verplicht reden-veld). 3 review-rounds; round-2 vond gat in `/publish-to-channel`, round-3 verifieerde fix. Smoke-test Test 5 in `npm run smoke:studio` valideert end-to-end: composite=42 blocks, =78 allows, no-score failsafe-open. **Handover**: PublishGate UI is drop-in maar nog niet gewired in CanvasPage (zelfde patroon als VersionHistorySidebar uit #227); server-side gate werkt zonder UI-integratie, integratie is een aparte UI-task.

- Task: [tasks/done/content-item-qa-gating.md](../tasks/done/content-item-qa-gating.md)
- ADR: -
- Spec: -
- Commit: `817b586`

### 231. PostHog browser + Sentry frontend observability

Browser-side observability vóór de eerste pilot. PostHog: `posthog-js` package + `src/lib/analytics/posthog-browser.ts` (singleton met failsafe no-op zonder `NEXT_PUBLIC_POSTHOG_KEY`, mirror van bestaande `src/lib/analytics/posthog.ts` server-pattern uit sessie 4.5) + `src/components/analytics/PostHogProvider.tsx` (root-level client component, `useSession()`-driven identify/reset, group analytics op workspace + organization, default `https://eu.i.posthog.com`). Auto-pageview + auto-capture aan, session-recording uit (privacy + bundle). Sentry: `@sentry/nextjs` v10 modern pattern via `instrumentation.ts` (server + edge runtime) + `instrumentation-client.ts` (browser, met `browserTracingIntegration` voor history-API pageviews die de hybride-SPA nodig heeft). `next.config.ts` voorwaardelijk wrap met `withSentryConfig` — alleen actief wanneer `NEXT_PUBLIC_SENTRY_DSN` gezet (geen build-tijd source-map upload tenzij `SENTRY_AUTH_TOKEN` ook gezet, dus dev/CI veilig). Tunnel via `/monitoring` om ad-blockers te bypassen. **5 events live**: `login_succeeded` + `signup_completed` (AuthPage), `content_qa_gate_blocked` (1× per below-threshold transition via fingerprint-ref dedup), `content_qa_override_modal_opened`, `content_qa_override_fired` (alle 3 in PublishGate uit #230). **Deferred** (out-of-scope follow-up): `content_generated`, `content_published`, `campaign_created`, `campaign_briefing_completed` — vereisen edits in canvas-orchestratie en wizard-flow buiten deze 1u-scope. Env-vars vereist voor productie: `NEXT_PUBLIC_POSTHOG_KEY` + `SENTRY_DSN` + `NEXT_PUBLIC_SENTRY_DSN` (+ `SENTRY_ORG` + `SENTRY_PROJECT` + `SENTRY_AUTH_TOKEN` voor source-maps). tsc + eslint clean op alle 8 nieuwe/gewijzigde files.

- Task: [tasks/done/posthog-sentry-browser.md](../tasks/done/posthog-sentry-browser.md)
- ADR: -
- Spec: -
- Commit: `3eb5b4d`

### 232. Campaign drafts DB-backed (absorbed by 3 eerdere sessies)

Task gesloten zonder nieuwe code: scope was DB-backed campaign drafts met multi-device persistence + max-5 limit + naadloze launch. Drie eerdere commits leveren dit samen al volledig:

1. **`a6204bc` (Sessie 1)** — `feat: DB-backed campaign drafts — schema + API endpoints` toegevoegd: `CampaignStatus.DRAFT` enum + `Campaign.wizardState`/`wizardOwnerId`/`wizardStep`/`wizardLastSavedAt` columns + dedicated draft-lookup index `[workspaceId, status, wizardOwnerId, isArchived, wizardLastSavedAt]`. Routes `POST/GET /api/campaigns/wizard/drafts` met `MAX_DRAFTS_PER_USER = 5` enforced + `PATCH/DELETE /api/campaigns/wizard/drafts/[id]`.
2. **`e55fc3c` (Sessie 2)** — `feat: campaign wizard auto-save to DB drafts`: `useDraftAutoSave` hook met `buildServerSnapshot` (263 regels). Auto-save op stap-transities, niet field-changes. `useCampaignWizardStore` wired voor draft-linkage.
3. **`dfc81ac` (Sessie 3)** — `feat: drafts picker UI + resume flow`: `DraftCampaignsList` + `DraftPickerModal` componenten + `loadDraftForResume` helper. ActiveCampaignsPage toont drafts in eigen sectie (vervuilen Active lijst niet).

Plus `19ea44d` route-fix (CONTENT-drafts naar Content Library i.p.v. Campaigns page) maakt het type-onderscheid robuust. Launch-route `wizard/launch/route.ts` doet nu conditional UPDATE (regel 92, draftId → ACTIVE) of INSERT (regel 113, geen draft).

Alle 11 acceptatiecriteria uit task-file: 11/11 satisfied. Smoke-test plan kan uitgevoerd worden zodra je echt drafts wilt testen — implementatie staat klaar.

- Task: [tasks/done/campaign-drafts-db-backed.md](../tasks/done/campaign-drafts-db-backed.md)
- ADR: -
- Spec: [archive/plans-pending-task-migration/IMPLEMENTATIEPLAN-CAMPAIGN-DRAFTS.md](archive/plans-pending-task-migration/IMPLEMENTATIEPLAN-CAMPAIGN-DRAFTS.md)
- Commit: `a6204bc` + `e55fc3c` + `dfc81ac` + `19ea44d`

### 233. Pre-pilot UI-wiring — VersionHistorySidebar + PublishGate in Step4Timeline

Handover-werk uit #227 + #230 afgemaakt. Beide drop-in componenten leefden nog niet in de actieve UI; pilot-users zouden ze niet zien zonder deze wiring. Integratie minimaal-invasief in `Step4Timeline.tsx` (de "review + publish" stap van canvas-accordion):

1. `<PublishGate>` als banner-rij bovenaan (toont fidelity-score badge groen/geel/rood + override-modal-pad). Pad voor de existing schedule/approve buttons blijft intact zodat channel-publish + email-send flows werken; gate-knop is een extra publish-pad mét score-validatie.
2. `<VersionHistorySidebar>` als slide-over panel rechts (`fixed inset-y-0 right-0 z-40`), togglable via "Toon versies" / "Verberg versies" link in de readiness-rij.

Geen layout-restructure van CanvasPage nodig — beide secties hangen aan de bestaande Step4Timeline render-tree. tsc + eslint clean op de gewijzigde file (2 pre-existing warnings ongewijzigd).

- Task: handover van #227 + #230, geen aparte task-file
- ADR: -
- Spec: -
- Commit: `1f782c3`

### 234. Content-styling migratie volledig afgerond — 9 categorieën

Laatste open NOW-task uit pre-launch. **Validator-driven afgerond**: validator-script `scripts/validate-content-styling-migration.ts` (commit `e815861`) leest 3 source-files (canvas-orchestrator.ts + content-type-inputs.ts + medium-config-registry.ts) en checkt per categorie of de migratie compleet is op 4 plekken (field-builder, MEDIUM_CONFIG_HANDLED_KEYS Set, rich format-case, legacy-cleanup). Eerste run toonde 35 issues — na filteren van validator-false-positives (shared-helper functions zoals `socialContentStyleFields`) bleven er 9 echte gaps over. Alle 9 gefixt:

**MEDIUM_CONFIG_HANDLED_KEYS uitgebreid** (9 keys): sales `salesAngle`/`includePricing`, pr-hr `structure`/`quoteCount`/`includeBoilerplate`/`includeContactBlock`, carousel `transitionStyle`, video `colorGrade`/`quality`.

**Rich-format cases toegevoegd in `formatMediumConfig`**: sales (angle-mapping + pricing-toggle), pr-hr (structure + quote-count + boilerplate + contact-block), carousel (transition-style mapping), video (color-grade mapping + quality target).

**Field-builder toegevoegd**: `colorGrade()` in content-type-inputs.ts (warm/cool/vibrant/natural opties + helpText), opgenomen in `videoContentStyleFields()`.

**Legacy-cleanup**: `colorGrade` field verwijderd uit `medium-config-registry.ts` Step 3 Medium-sectie. Step 3 toont nu alleen platform-rendering (duration, aspectRatio, quality).

**Twee bewuste niet-migraties bevestigd**: `hasEmbargo` (gedropt 2026-04-28 als irrelevant voor HR/internal/career) en `proofPointDensity` (gedropt 2026-04-28 als 1-5 numeric te granular). Validator-expectations bijgewerkt om deze niet als gap te tellen. `ctaType` blijft semantisch gedeeld web-page rendering ↔ advertising migratie (1 veld, 2 use-cases).

Final validator: 10 categorieën, 0 issues. tsc + eslint clean op alle gewijzigde files (1 pre-existing warning in canvas-orchestrator.ts:144 niet door deze task).

- Task: [tasks/done/content-styling-migratie.md](../tasks/done/content-styling-migratie.md)
- ADR: -
- Spec: -
- Commit: `e815861` (validator) + `c331df8` (migratie-fixes)

### 234. Campaign-wizard concept-approval bug-fix + UX-redesign

Bug-fix + UX rework op de "Review Creative Concept" wizard-stap. **Bug**: button bleef disabled bij 6/6 ratings omdat de view rendeerde uit `finalStrategy ?? synthesizedStrategy` maar gate `allConceptRated()` en handler `handleApprove` lazen alleen `synthesizedStrategy`. In campaign-mode multi-variant flow vult `setFinalStrategyResult` `finalStrategy` met o.a. `effieRationale` terwijl `synthesizedStrategy` null kan blijven → silent gate-mismatch + silent handleApprove early-return. **Fix**: gate én handler dezelfde fallback-keten (`finalStrategy ?? synthesizedStrategy`) + dev-only `console.warn` (signature-deduped via module-level Set) wanneer beide bestaan en op concept-velden divergeren — diagnostiek voor follow-up investigation. **UX-redesign**: button altijd-klikbaar met `sonner` toast + smooth-scroll naar eerste ongeraten card bij `!allRated`; per-card status-dot (emerald/amber via inline-style ivm Tailwind 4 purge); "Mark all as approved" `<Button variant="ghost">` shortcut; "Refine Concept" ontkoppeld van `allRated` zodat refinement ook kan met partial input; progress-tekst kleurlogica (groen=compleet, amber=partial, leeg=0); optional feedback verplaatst naar `<details>` accordion met `useState`-driven open-state (lazy initializer leest `conceptFeedback`, daarna user-controlled via `onToggle`); ELEMENTS constant dedupliceert 6 inline cards. Twee parallelle code-reviewer rondes: round 1 ving sticky-footer-clash met de wizard's eigen Continue-button + 6 ontbrekende Tailwind utilities (`scroll-mt-24`, `pb-24`, `bg-emerald-500`, etc.) — beide opgelost door sticky te droppen en inline-styles waar nodig; round 2 ving `<details open={...}>` controlled/uncontrolled hybrid + scrollMarginTop overkill — opgelost via `useState` desync en verwijdering. Tests deferred (geen vitest/jest infra in repo — apart `vitest-setup` task aangeraden); E2E deferred (bestaande wizard-spec test alleen stepper-rendering, geen AI-flow precedent). gotchas-entry geschreven: "view-prop vs store-state divergentie maakt button silent-disabled" met prior art naar twee silent-failure incidenten uit april 2026.

- Task: [tasks/done/concept-approval-ux-fix.md](../tasks/done/concept-approval-ux-fix.md)
- ADR: -
- Spec: -
- Commit: `aee6d91`

### 235. Tech-debt any-types fully cleared — 0 real `: any` left in src/

Multi-cluster TypeScript-strictening voltooid: alle 146 `: any` annotations uit src/ vervangen door proper Prisma-types, generics, of `unknown`. Tegelijk Phase 0 voorloper voor Brand Control Program — schema-extensie van Δ-1/2/3/4 en Strategy Analyst-stub kan veilig op deze laag bouwen.

**Deze sessie (62 fixes in 6 refactor-commits + 1 docs-commit)**:
- `fcf4002` — knowledge-resources + personas API mappers (`Pick<KnowledgeResource>`, `Prisma.WhereInput`/`UpdateInput`, `GeminiImagePart`, full `Persona`)
- `4598dde` — strategies/route.ts mappers (`Prisma.BusinessStrategyGetPayload<{include}>` + optional `lockedBy` intersection voor 4 callers)
- `2b035e4` — component wrappers (`React.ComponentProps<typeof Updated>`) + `LucideIcon` op 11 icon-fields. Edge-case `CanvasWorkspaceShared.icon?: string` (key in iconMap, géén component)
- `804b385` — 4 brand asset canvases krijgen per-canvas data shape types (Mission/Golden/Archetype met `Archetype`-record/Values met `BrandValueItem`); spread-merge fix in MissionStatement zodat partial sessionContent fallt-back op defaultData
- `71302b9` — `cache.ts RouteHandler args: unknown[]` (HOC pattern), `validation-methods icon: LucideIcon`, 5 canvas state-updaters `value: unknown` met polymorphism-comments
- `5346c1e` — `ResearchPlanConfiguration` (export uit ResearchPlanContext, dekt tool-flow + bundle-flow union), lokale `ResearchItem` interface, `ChangeImpactService.activeCampaigns` minimal contract
- `3c25a07` — separate Brand Control Program plan + ADR-1 + ADR-3 (niet onderdeel van deze task maar wel onderbouwing voor de Phase 0 promotion)

**Latent bug surfaced + fixed**: `ResearchDashboard` las `researchPlanConfig.numberOfInterviews/numberOfQuestionnaires` direct, maar die velden zitten in `.configuration.numberOfInterviews/...` (geneste). Het oude `: any` maskeerde dit. Gefixt naar nested access; runtime-gedrag identiek dankzij bestaande `|| 3` fallback.

**Eind-staat**: 29 ruwe matches in `grep -rn ": any" src/`, waarvan 25 in `src/generated/prisma` (NIET aanraak per task-file) en 4 false-positives in comments/string-literals (AMBER-comment, `anyAlpha` varname, "Optional: any notes" string, Adobe-Fonts-detection comment). **0 echte `: any` annotations** in handgeschreven src/.

Two-subagent code-review: 0 CRITICAL, 3 WARNINGS — alle 3 gemarkeerd als acceptable/out-of-scope/pre-existing (deferred MINOR list). tsc + lint groen (0 errors, 960 warnings). E2E-smoke deferred wegens missing `branddock_test` database in env (niet code-gerelateerd; type-only refactor met identiek runtime-gedrag).

- Task: [tasks/done/tech-debt-any-types.md](../tasks/done/tech-debt-any-types.md)
- ADR: -
- Spec: [tasks/_drafts/idea-brand-control-program.md](../tasks/_drafts/idea-brand-control-program.md) (Phase 0 voorloper context)
- Commit: `fcf4002` + `4598dde` + `2b035e4` + `804b385` + `71302b9` + `5346c1e` + `33ea121` (finalize)

### 236. BV-WIRE W-1 full centroid — task closure

Implementation already landed in commit `323ba39` (2026-05-06): voice-similarity helpers (`cosineSimilarity` / `projectSimilarityToScore` / `fetchVoiceguideCentroid` / `embedContentForVoiceMatch` / `scoreVoiceSimilarity`), composition-engine 50/50 blend wiring (`voiceguideCentroid?: number[] | null` field, `pillar1EffectiveScore` combine), fidelity-runner parallel centroid-fetch alongside personality + config. `scorerVersion` krijgt `+voice-emb-1.0` suffix wanneer semantic actief was. style-scorer.ts blijft pure string-match — backwards compat. Empirical regression Better Brands: +24 punten Δ pre/post W-1-full (BB content thematisch verwant aan voiceguide samples maar gebruikt weinig van declared `wordsWeUse` — semantic match corrigeert deze underrepresentation).

Task formal closure 2026-05-08: implementation reviewed in scope of Brand Control Program Phase 1. Multi-workspace centroid seeding (Linfi / Nobox / WRA Juristen via `scripts/fidelity/seed-voiceguide-centroids.ts`) is operational follow-up — no further code-change needed. Demo workspace re-test deferred to runtime-environment (vereist DB + OPENAI_API_KEY).

- Task: [tasks/done/bv-wire-w1-full-centroid.md](../tasks/done/bv-wire-w1-full-centroid.md)
- ADR: -
- Spec: [tasks/_drafts/idea-brand-control-program.md](../tasks/_drafts/idea-brand-control-program.md) (Phase 1 #1)
- Commit: `323ba39` (implementation, 2026-05-06) + closure-commit `5489675`

### 237. Brand Assistant fill_form_fields foundation — Phase 0.2.A claw-page-awareness

Generic write-tool infrastructure waarmee de AI editable form-fields op elke page kan invullen via `fill_form_fields([{key, value}, ...])` — bracket-notation ondersteund. Mirror van bestaand `update_campaign_wizard` pattern: server-execute returnt `clientAction: 'form_fill'` met assignments; `MutationConfirmCard` routes naar `useFormFillStore.applyFill()` na user-confirm.

**Foundation geleverd (8 files, commit `f5b9090` + finalize-fixes):**
- `src/stores/useFormFillStore.ts` (new) — Zustand store met `registerFields` / `clearFields` / `applyFill` API; returns `{applied, missing}` zodat de client kan tonen welke keys de active page niet exposeert
- `src/lib/claw/claw.types.ts` — `formFillFields` array op `ClawPageContext`
- `src/app/api/claw/chat/route.ts` — Zod schema-extension
- `src/lib/claw/tools/write-tools.ts` — nieuw `fill_form_fields` tool met Zod input + `clientAction: 'form_fill'` op execute
- `src/lib/claw/context-assembler.ts` — `formatFormFillFields()` surfaces velden + tool-instructies in system prompt; instrueert preferring dedicated tools
- `src/features/claw/components/InputBar.tsx` — leest `useFormFillStore.fields` + includes in pageContext
- `src/features/claw/components/MutationConfirmCard.tsx` — `clientAction === 'form_fill'` handler + label-overlay (registered label i.p.v. raw key) + conditional footer text voor client-only tools ("Save manually to persist" vs DB-snapshot-message) + defensive type-predicate filter op assignments

**Deferred follow-ups** (eigen sub-cluster, niet langer in deze task-file):
- Page-wiring voor PersonaDetail/BrandAssetDetail/Step1Context — alle 3 hebben dedicated tools (update_persona, update_asset_*, update_deliverable_*); `fill_form_fields` is bedoeld voor pages zonder dedicated tool. Wiring pagina-specifiek edit-state-refactor zinnig zodra die pages er zijn.
- Δ-1 chat-integratie compat-criteria 1-3 (sectionPath voor Canvas Step 4 + content-text returns + chat-card pattern) — landen natuurlijk binnen Δ-1 implementation in Phase 2 van Brand Control Program.

**Two-subagent review**: 3 iteraties tot 0 CRITICAL/WARNING. Round 1: misleading footer text + defensive cast — beide gefixt. Round 2: type predicate value-property check — gefixt. Round 3: clean (1 soft-MINOR over string-literal coupling — established codebase pattern, deferred).

tsc + lint clean (0 errors, 960 warnings, declining trend). Smoke-test deferred — vereist gewired page; foundation is non-regression (AI ziet `formFillFields = []` tot page registreert, valt terug op dedicated tools).

Phase 0 voorloper #2 Brand Control Program — foundation klaar.

- Task: [tasks/done/claw-page-awareness.md](../tasks/done/claw-page-awareness.md)
- ADR: -
- Spec: [tasks/_drafts/idea-brand-control-program.md](../tasks/_drafts/idea-brand-control-program.md) (Phase 0.2.A)
- Commit: `f5b9090` (foundation) + `f709329` (finalize)

### 238. Competitor historie data-laag — Snapshot/Activity/ContentItem (Competitive-intel Fase 1)

Foundation voor de Competitive Intelligence Loop: drie nieuwe Prisma-modellen (`CompetitorSnapshot`, `CompetitorActivity`, `CompetitorContentItem`) met hash-based no-op detection (analoog aan `BrandstyleSnapshot`-pattern), 7 deterministische diff-rules (TAGLINE / VALUE_PROP / PRICING / NEW_PRODUCT / PRODUCT_REMOVED / STATUS / TIER), en refresh-route herschreven naar dual-write transactie via `applyCompetitorRefreshDualWrite` helper die ook door smoke-tests wordt hergebruikt.

**Geleverd (3 PRs, ~2300 regels):**
- **PR-1 schema** (`fd2738c`) — 3 modellen, 6 enums, 5 nieuwe Competitor-velden (monitoring + aggregaten), 1 unique constraint `(competitorId, contentHash)`, pgvector embedding-veld op ContentItem. Backwards-compat: 25 bestaande competitors krijgen defaults zonder NULL-issues.
- **PR-2 hash + diff + backfill** (`99df752`) — `snapshot-hash.ts` (sha256 + canonical sort + whitespace-normalize), `diff-engine.ts` (Jaccard word-set distance voor PRICING met min-length guard, set-diff met case-insensitive membership maar case-preserved values), `backfill-competitor-snapshots.ts` (idempotent per-row tx, 7 retroactive snapshots geschreven, 2e run schrijft 0).
- **PR-3 refresh dual-write** (`5d16834`) — route schrijft snapshot bij hash-mismatch, hergebruikt `applyCompetitorRefreshDualWrite` helper voor de transactie-body. Workflow events (STATUS_CHANGED, TIER_CHANGED) draaien ook op no-op pad. Defensive `isCanonicalShape` shape-guard op historic snapshot-JSON.

**Smoke-tests (totaal 67 asserts):** `competitor-diff-engine.ts` 46/46 (3 lagen: hash determinisme / 7 rules / no-op + edges), `competitor-refresh-dual-write.ts` 21/21 (3 scenarios: no-op-met-workflow-event, hash-miss content, idempotency). Beide gebruiken `tsx` runner volgens project-conventie.

**Two-subagent review**: 3 iteraties. Round 1: 2 CRITICAL (data-loss op hash-match, race condition zonder unique constraint) + 8 WARNING. Round 2: P2002 try/catch was unsafe wegens Prisma `$transaction(fn)` ontbreekt savepoints — verwijderd, race-tradeoff gedocumenteerd voor MVP. Round 3: 0 CRITICAL, alle resterende WARNINGs zijn edge-cases / MVP-tradeoffs (gedocumenteerd).

**Out-of-scope** (vervolg-tasks): AI-classified events (NEW_FORMAT_EMERGING, CATEGORY_REPOSITIONING, etc.), ContentItem auto-discovery, embedding-pipeline, Brandclaw monitoring (Fase 4 post-launch), positioning-frameworks UI (Fase 2), production-grade race-protection via raw SQL `INSERT ON CONFLICT`.

**Documentatie**: idea-doc, ADR, en `prisma/migrations-pending-bootstrap/2026-05-08_competitor_snapshot_models.sql` (voor toekomstige Vercel/Neon migration-bootstrap — project gebruikt sinds februari 2026 `db push` ipv migrations).

- Task: [tasks/done/competitor-snapshot-historie.md](../tasks/done/competitor-snapshot-historie.md)
- ADR: [adr/2026-05-08-competitor-snapshot-historie.md](adr/2026-05-08-competitor-snapshot-historie.md)
- Spec: [tasks/_drafts/idea-competitive-intelligence-loop.md](../tasks/_drafts/idea-competitive-intelligence-loop.md)
- Commit: `fd2738c` (PR-1 schema) + `99df752` (PR-2 hash+diff+backfill) + `5d16834` (PR-3 refresh) + `89b15f9` (finalize)

### 239. Δ-1 Content Review — foundation + engine + API v1 (Brand Control Program Phase 2 #1)

Foundation voor de drie review-surfaces (Brand Alignment Tab 3, Brand Assistant `review_content` chat-tool, PublishGate uitbreiding) — één engine, één endpoint, drie consumers. Schema-additions: `BrandReviewFinding` (XOR FK naar ContentFidelityScore OF ContentReviewLog, afgedwongen via raw Postgres CHECK constraint), `ContentReviewLog` (extern-content audit-rij met 90-dagen `retainUntil`), 2 enums (`BrandReviewSeverity`, `FindingCategory`). Engine `runFidelityForExternalContent` orchestreert F-VAL run zonder canvas-stack/persona/strategy summaries; mappt RuleViolations → BrandReviewFinding via heuristic-prefix-parsing (`heuristic:<locale>:<category>:*` → VOICE/CLAIMS/STYLE/AI_TELL, BrandRule fallback → TERMINOLOGY). API `POST /api/alignment/review-external` accepteert paste/url/file (file deferred naar B-2) met SSRF-hardened URL-ingest: scheme allowlist (http/https), DNS-resolve elke redirect-hop met private/loopback/link-local IP-block (RFC1918 + cloud-metadata + IPv6 ULA/link-local), manual redirect-follow (max 3 hops), byte-cap streaming reader (5 MB ceiling), Content-Length pre-check, opaqueredirect-guard, en backtracking-vrij stripHtml via 2-pass indexOf-scan. Status-mapping: 400/403/413/504/501/422 per IngestError code. Char-offsets in findings 1:1 consistent met `sourceContent` storage (pure slice voor compute, marker alleen in storage).

**Live smoke** (`scripts/heuristics/smoke-external-review.ts`): 1733ms run via Better Brands workspace, 5 findings persisted, XOR FK constraint geverifieerd, scorerVersion `composition-engine-v1.0+voice-emb-1.0` (W-1-full centroid actief), cascade-delete cleanup geverifieerd.

**Two-subagent review**: 4 iteraties. Round 1+2: meerdere CRITICAL (SSRF, char-offset/storage mismatch, type-only enum imports met casts, cache invalidation ontbreekt, payload size niet gecapped). Round 3+4: 0 CRITICAL / 0 WARNING — convergentie. Deferred-by-design: DNS-rebind TOCTOU (vereist custom dispatcher), `language` parameter als v1 audit-metadata only, `findingsCount` op ContentReviewLog (follow-up bij UI).

**Out-of-scope** (sub-clusters voor follow-up): B-2 file-upload (PDF via unpdf, DOCX via mammoth), C Surface 1 Brand Alignment Tab 3 UI, D Surface 2 Brand Assistant `review_content` chat-tool, E Surface 3 PublishGate uitbreiding (bevindingen-tabel render).

- Task: [tasks/done/content-review-multi-surface.md](../tasks/done/content-review-multi-surface.md)
- ADR: [adr/2026-05-08-fval-output-schema-bevindingen.md](adr/2026-05-08-fval-output-schema-bevindingen.md), [adr/2026-05-08-locale-routing-brand-voice.md](adr/2026-05-08-locale-routing-brand-voice.md), [adr/2026-05-08-brandclaw-agent-architectuur.md](adr/2026-05-08-brandclaw-agent-architectuur.md)
- Spec: [tasks/_drafts/idea-brand-control-program.md](../tasks/_drafts/idea-brand-control-program.md)
- Commit: `4c3cc99` (schema+migration) + `4232625` (engine) + `b3f3c20` (API+ingest v1) + `110e9fa` (smoke) + `8294350` (Prisma 7 import-fix scripts) + `f755ccb` (finalize)

### 240. Competitive-intel discovery cluster — cost-model + 2 vervolg-idea-docs ready-to-build

Pre-build discovery-werk voor de Competitive Intelligence Loop, vervolg op #238 Fase 1 data-laag. Drie validatie-probes uitgevoerd, 4 audit-docs geleverd, 2 vervolg-idea-docs van `pending-tech` naar `ready-to-build` gepromoot via evidence.

**Cost-model Fase 4 brandclaw-monitoring** (`docs/audits/2026-05-08-competitor-monitoring-cost-model.md`): pilot-tier ~$11/maand effectief, tier 1 (50 ws) ~$55/maand, tier 2 (100 ws) ~$110/maand. Worst-case (100 ws × 15 concurrenten × weekly-deep zonder hash-skip) ~$1100/maand. Hard-cap aanbevelingen per plan-tier (free 4 / pro 8 / ent 25 concurrenten), prompt-caching verplicht vóór cron actief, `WorkspaceMonitoringMetrics` model nodig in Fase 4 task. Validatie-blokker §1 voor Fase 2 promotion afgerond.

**Idea-doc `competitor-content-item-discovery`** (`tasks/_drafts/idea-competitor-content-item-discovery.md`): producer voor de lege `CompetitorContentItem`-tabel. Drie probes uitgevoerd: A1 RSS hit-rate 42.9% (verworpen, scope-cut), A2 sitemap-coverage 71.4% (boven 70% target), A3 URL-classifier accuracy 100% met Haiku 4.5 op 25 hand-gelabelde URLs. Definitieve MVP-scope: sitemap-first met robots.txt + 4 paden + recursie sub-sitemaps, RSS als secundaire fallback, AI-classifier voor format+themes, geen HTML-fallback (0% in sample), graceful skip voor competitors zonder bron (~28%). Effort 5-6 dagen.

**Idea-doc `competitor-ai-event-classifier`** (`tasks/_drafts/idea-competitor-ai-event-classifier.md`): pattern-detection bovenop deterministische diff-rules voor 2 strategische events (CATEGORY_REPOSITIONING + TARGET_AUDIENCE_CHANGED). A1 probe: 96.7% accuracy op 30 synthetische prev/next paren met Haiku 4.5 — CATEGORY 100%, TARGET_AUDIENCE 90% (1 borderline dual-event miss), NONE 100% (0 false-positives). Strikte JSON-only prompt verplicht (eerste run gaf 33% parse-errors zonder). MVP-scope strak: 2 events deze task; visual-rebrand/funding/leadership/format-emerging defereren naar vervolg-tasks die andere data-sources binnenhalen. Effort 3-4 dagen.

**Probe-infrastructuur**: 4 nieuwe scripts in `scripts/probes/` (`competitor-rss-hit-rate.ts`, `competitor-content-source-availability.ts`, `competitor-classifier-accuracy.ts`, `competitor-classifier-events-accuracy.ts`) — herbruikbare feature-feasibility-validatie pattern voor toekomstige idea-docs.

Beide vervolg-idea-docs zijn klaar voor technical-planner promotion zodra effort-window beschikbaar is. Validatie-blokker §2 (pilot-priority-check 3 leads) blijft open user-action.

- Task: -  (discovery-cluster, geen single task)
- ADR: [adr/2026-05-08-competitor-snapshot-historie.md](adr/2026-05-08-competitor-snapshot-historie.md) (parent)
- Spec: [tasks/_drafts/idea-competitive-intelligence-loop.md](../tasks/_drafts/idea-competitive-intelligence-loop.md), [tasks/_drafts/idea-competitor-content-item-discovery.md](../tasks/_drafts/idea-competitor-content-item-discovery.md), [tasks/_drafts/idea-competitor-ai-event-classifier.md](../tasks/_drafts/idea-competitor-ai-event-classifier.md)
- Commit: `41a7c90` (cost-model) + `bc6dc6f` (idea content-discovery) + `46d3b0a` (A1 RSS) + `d7f81ba` (A2 sitemap) + `583f384` (A3 classifier) + `6e3c7ed` (idea ai-event) + `7355f44` (A1 classifier-events) + `edd2e4b` (finalize)


### 241. Canvas+Studio audit + per-item tweaks 3-cluster + image-track 3-cluster + locale-fix (12-task pre-launch sprint)

Eén-sessie pre-launch sprint die de meeste open Canvas/Studio-werk afrondt. Discovery + 3 per-item-tweak-clusters (36 content-types met item-specifieke inputvelden + Asset Planner pre-fill + canvas-orchestrator rich-renders) + 3 image-flow-clusters (defaults / content-coupling / briefing-textarea + Claude Haiku suggest-route) + locale-bug-fix die mixed-language output structureel oplost. **254/254 smoke-checks groen** over 11 nieuwe `npm run smoke:*` scripts.

Per-item tweaks (3 builders → 36 types):
- `conversionContentStyleFields()` — 13 types (4 social + 7 ads + 2 email) met hookFormat/payoffPromise/targetObjection/proofPoint + per-hookFormat-value rich-renders in canvas-orchestrator
- `authorityContentFields()` + `narrativeAnchorFields()` — 10 types (6 long-form + 4 PR/case) met THESIS/ANTI-THESIS/PIVOT framing
- `skeletonInputFields(kind)` — 13 types met "USE EXACTLY — do NOT modify" skeleton instructie

Image-flow (3 layers):
- 25 type-defaults + suggestie-strook in `VisualBriefSection`
- `buildSubjectByChip()` injecteert persona+product+CTA+platform in image-prompts (4 routes)
- `briefingText` veld op VisualBrief + textarea + Claude Haiku `/suggest-visual-briefing` route

Locale-fix:
- `buildLocaleInstruction()` helper centraal in `prompt-templates.ts` (alle 4 tiers) + `buildBrandVoiceDirective` versterkt voor élke taal met "translate source material" clause

Bonus closures op latente werk in BCP Phase 1+2 + Cowork-pariteit:
- `heuristics-packages-multilingual` — en-GB/nl-BE/de-DE pakketten + ai-tells/Denglisch toegevoegd, registry compleet
- `voice-baseline-1pager` — derivation + format-helper + UI + judge-embed end-to-end gevalideerd
- `campaign-brief-output-mapper` — Cowork-pariteit Fase A: 10-sectie brief-render met week-thema AI-call + B2/B3/B4 placeholders
- `canvas-inline-edit-overlays` — 13 preview-consumers + ContentSectionsEditor cleanup
- `canvas-studio-audit` + 2 plan-tasks (per-item tweaks + image-briefing) — 3 audit-docs gespawnd

12 tasks afgerond, 13 task-files naar `tasks/done/`.

- Task: [tasks/done/canvas-studio-audit.md](../tasks/done/canvas-studio-audit.md), [tasks/done/canvas-per-item-tweaks-plan.md](../tasks/done/canvas-per-item-tweaks-plan.md), [tasks/done/canvas-image-briefing-plan.md](../tasks/done/canvas-image-briefing-plan.md), [tasks/done/content-locale-enforcement-fix.md](../tasks/done/content-locale-enforcement-fix.md), [tasks/done/canvas-tweaks-conversion-shortform.md](../tasks/done/canvas-tweaks-conversion-shortform.md), [tasks/done/canvas-tweaks-longform-authority.md](../tasks/done/canvas-tweaks-longform-authority.md), [tasks/done/canvas-tweaks-structured-skeleton.md](../tasks/done/canvas-tweaks-structured-skeleton.md), [tasks/done/canvas-image-briefing-defaults.md](../tasks/done/canvas-image-briefing-defaults.md), [tasks/done/canvas-image-content-coupling.md](../tasks/done/canvas-image-content-coupling.md), [tasks/done/canvas-image-briefing-textarea.md](../tasks/done/canvas-image-briefing-textarea.md), [tasks/done/heuristics-packages-multilingual.md](../tasks/done/heuristics-packages-multilingual.md), [tasks/done/voice-baseline-1pager.md](../tasks/done/voice-baseline-1pager.md), [tasks/done/campaign-brief-output-mapper.md](../tasks/done/campaign-brief-output-mapper.md), [tasks/done/canvas-inline-edit-overlays.md](../tasks/done/canvas-inline-edit-overlays.md)
- ADR: -
- Spec: [audits/2026-05-08-canvas-studio-state.md](audits/2026-05-08-canvas-studio-state.md), [audits/2026-05-08-canvas-per-item-tweaks-plan.md](audits/2026-05-08-canvas-per-item-tweaks-plan.md), [audits/2026-05-08-canvas-image-briefing-plan.md](audits/2026-05-08-canvas-image-briefing-plan.md)
- Commit: `a8363c0`

### 242. Campaign brief output-mapper — Fase A Cowork-pariteit (finalize + review-loop)

Render-laag bovenop bestaande `CampaignBlueprint` die wizard-output transformeert naar 10-secties Linfi-stijl markdown-brief: pure data-mapper (`brief-data-mapper.ts`) + markdown-renderer (`brief-renderer.ts`) + on-render Anthropic-call voor sectie 5 week-thema's + GET/POST routes onder `/api/campaigns/[id]/brief/{render,mark-ready}` + `BriefRenderView` modal in ContentLibraryCampaignMode. Secties 7/8/9 tonen expliciete "Not available — requires <follow-up-feature>" placeholders met links naar `campaign-kpi-structure` / `campaign-budget-table` / `campaign-risk-assessment`. Geen schema-wijzigingen.

**Implementation** (productie-commit `855f8a3`): 9 nieuwe files (~1688 regels) + ContentLibraryCampaignMode extension. Workspace-isolation via `resolveWorkspaceId()` + `findFirst({ where: { id, workspaceId } })` op beide routes. PostHog event `campaign_brief_marked_ready` op "Klaar voor klant"-knop. AI-call via `anthropicClient.createChatCompletion` met 6s timeout + Zod-schema voor week-theme response.

**Finalize review-loop** — 4 iteraties tot 0 CRITICAL/0 WARNING:
- Round 1: 0 CRITICAL + 14 WARNING (timeout 10s vs spec 6s, hardcoded sectionsRenderedCount, escape() newline corruption, Zod onbegrensd, mediumEnrichment unbounded, `new Date()` in mapper, etc.)
- Round 2: 0 CRITICAL + 4 WARNING (orderBy non-deterministic, sectionsRenderedCount counts flags niet sections, staleTime UX trap, unknownPriorities severity)
- Round 3: 1 CRITICAL (PG NULLS-sorting bug zelf-geintroduceerd in R2: `ORDER BY DESC` defaultt naar NULLS FIRST → workspace-overrides afgekapt bij 200-cap) + 1 WARNING (`<missing>` sentinel lekt naar user-message)
- Round 4: convergentie 0 CRITICAL / 0 WARNING

**Fixes geleverd**: timeout 10s→6s; `new Date()` injectable via `now?: Date` parameter; escape() strip newlines; Zod `.max(20)` op sectionsRenderedCount; sectionsRenderedCount via unique-section Set; staleTime 60_000 + Regenerate-knop; mediumEnrichment `take: 200` + `orderBy: [{ workspaceId: { sort: 'desc', nulls: 'last' } }, { id: 'asc' }]`; `${ch.priority}` defensive; `unknownPriorities` MissingDataFlag met `(empty)` sentinel.

**Quality gates**: tsc 0 errors, lint 0 errors (0 warnings in nieuwe files). Manual smoke-test (9 stappen UI-werk uit task-file) is user-action vóór live productie-gebruik.

**Out-of-scope** (B-cluster follow-ups): `campaign-kpi-structure` (sectie 7), `campaign-budget-table` (sectie 8), `campaign-risk-assessment` (sectie 9), brief-versioning, PDF/Notion/Word export.

- Task: [tasks/done/campaign-brief-output-mapper.md](../tasks/done/campaign-brief-output-mapper.md)
- ADR: -
- Spec: [tasks/_drafts/idea-campaign-brief-cowork-parity.md](../tasks/_drafts/idea-campaign-brief-cowork-parity.md) + [tasks/_drafts/idea-campaign-brief-cowork-parity-validation.md](../tasks/_drafts/idea-campaign-brief-cowork-parity-validation.md)
- Commit: `855f8a3` (initial implementation, parallel session) + `4b0cffe` (finalize)

### 243. Δ-1 Surface C — Brand Alignment "Content Review" tab UI

Eerste pilot-zichtbare review-surface bovenop bestaande Δ-1 API. Derde tab "Content Review" naast Alignment + Audit op `BrandAlignmentPage`. Paste-textarea (50-50000 chars getrimd) of URL-input + submit triggert POST `/api/alignment/review-external`, waarna nieuwe GET `/[reviewLogId]` route findings ophaalt voor render. Score-gauge (3-color emerald/amber/red) + threshold-badge + filterable findings-tabel met severity + category pills (counts per group) + before/after blocks voor top-issues.

**Geleverd** (productie-commit `994e772`, ~786 regels): nieuwe GET `/api/alignment/review-external/[reviewLogId]/route.ts` (workspace-isolated, expliciete severity-rank sort post-fetch wegens alfabetisch enum-sort default), `useReviewContent` hook (mutation + query met staleTime Infinity per ADR-2 immutability), `ContentReviewTab` (input UI met paste/url toggle), `ContentReviewResult` (score + filters + findings-table), `useBrandAlignmentStore` AlignmentTab union extend ("alignment" | "audit" | "review"), `BrandAlignmentPage` 3rd tab integratie. Severity-mapping HIGH→CRITICAL/MEDIUM→WARNING/LOW→SUGGESTION hergebruikt bestaande `SeverityBadge`.

**Architectuur-keuzes**: Optie B uit task-Notes (nieuwe GET-route ipv POST-extending — respecteert "POST niet aanraken"); filter-state lokaal in ContentReviewResult (geen Zustand); React text-children only render (geen `dangerouslySetInnerHTML`, XSS-mitigatie); `DEFAULT_COMPOSITE_THRESHOLD` geïmporteerd uit composition-engine ipv hardcoded magic-number.

**Finalize review-loop** — 3 iteraties tot 0 CRITICAL/0 WARNING:
- Round 1: 0 CRITICAL + 6 WARNING (severity-sort alfabetisch, trim min/max inconsistent, thresholdMet alleen op mutation, geen aria-pressed/role=alert, long-text overflow)
- Round 2: 0 CRITICAL + 3 WARNING (magic-number drift, incomplete tab-ARIA, char-counter untrimmed)
- Round 3: 0 CRITICAL + 0 WARNING (één future-proofing concern over latent threshold-divergence — defer als design-coupling, geen actuele bug)

**Quality gates**: tsc 0 errors, lint 0 errors (0 warnings in nieuwe files; 969 totaal pre-existing).

**Out-of-scope** (Δ-1 v2 follow-ups): file-upload UI (B-2 PDF/DOCX), tone-suggestions inline-edit, Surface D (Brand Assistant chat-tool), Surface E (PublishGate findings-block), history-list earlier reviews, auto-export PDF/CSV.

- Task: [tasks/done/content-review-tab-3-ui.md](../tasks/done/content-review-tab-3-ui.md)
- ADR: [adr/2026-05-08-fval-output-schema-bevindingen.md](adr/2026-05-08-fval-output-schema-bevindingen.md), [adr/2026-05-08-locale-routing-brand-voice.md](adr/2026-05-08-locale-routing-brand-voice.md)
- Spec: [tasks/_drafts/idea-brand-control-program.md](../tasks/_drafts/idea-brand-control-program.md)
- Commit: `994e772` (initial implementation) + `cf030f1` (finalize)

### 244. Δ-1 Surface D — Brand Assistant `review_content` chat-tool (finalize)

Δ-1 Surface D maakt F-VAL fidelity-review beschikbaar als chat-native tool in de Brand Assistant. User plakt content of URL in chat → tool draait F-VAL → `ReviewFindingsCard` rendert inline met composite-score, threshold-status en top-3 findings. Initial build was commit `534d60c`; finalize-cyclus voegt 5 review-rondes hardening toe.

**Geleverd** (initial `534d60c`, ~485 regels): nieuwe `review_content` analyze-tool in `analyze-tools.ts` (Zod discriminated-union paste/url, hergebruikt `runFidelityForExternalContent` engine + `ingestPaste`/`ingestUrl` met SSRF-mitigatie), `ReviewFindingsCard` met error-variant en `role="status"`, ChatArea `clientAction === 'review_findings_card'` routing, system-prompt anti-over-trigger contract, server-side smoke-test met 4 scenarios.

**Finalize review-loop** — 5 iteraties (skill hard-limit) tot 0 CRITICAL en alleen design-trade-off WARNINGs over:
- Round 1: 1 CRITICAL (broken Tab 3 deep-link) + 5 WARNINGs (Zod safeParse defense-in-depth, `take: 50` silent correctness, anti-over-trigger soft spot, top-findings text round-trip naar Anthropic, smoke-test 3 tautologie)
- Round 2: 0 CRITICAL + 3 WARNINGs (smoke-test silent-skip, vacuous-true op empty array, Zod issues join voor LLM-feedback)
- Round 3: 0 CRITICAL + 4 WARNINGs (deterministic test-ordering, andere fixture-string voor isolation-run, take=200 runaway-guard, Zod multi-issue join)
- Round 4: 0 CRITICAL + 1 WARNING (`failureReason: 'invalid_input'` semantisch correct voor Zod-fail, type-union uitgebreid)
- Round 5: 0 CRITICAL + 3 design-trade-off WARNINGs (alle expliciet als acceptable geframed door reviewers)

**Architectuur-keuzes**: defense-in-depth `safeParse` op tool-execute entry (chat-route trust Anthropic SDK; redundant guard hier voorkomt malformed-input slip), `take: 200` runaway-guard (Prisma's enum-orderBy is alfabetisch HIGH<LOW<MEDIUM, dus client-side severity-sort vereist), `TOP_FINDINGS_TEXT_CAP=280` (gestringified findings round-trippen naar Anthropic in elke vervolg-turn), Tab-3 deep-link verwijderd (URL-param parser is separate task wanneer pilot-feedback dit prioriteert), `failureReason: 'ingest_failed' | 'invalid_input'` discriminated zodat FE differentiated copy kan tonen (placeholder voor toekomst).

**Quality gates**: tsc 0 errors, lint 0 errors in nieuwe files (969 pre-existing warnings).

**Out-of-scope** (gedocumenteerd in task-Notes): URL-param parser voor Tab 3 deep-link, ReviewErrorCard differentiated copy per failureReason, Surface E PublishGate findings-block, severity-visual unification Surface C+D.

- Task: [tasks/done/content-review-chat-tool.md](../tasks/done/content-review-chat-tool.md)
- ADR: [adr/2026-05-08-fval-output-schema-bevindingen.md](adr/2026-05-08-fval-output-schema-bevindingen.md), [adr/2026-05-08-locale-routing-brand-voice.md](adr/2026-05-08-locale-routing-brand-voice.md)
- Spec: [tasks/_drafts/idea-content-review-chat-tool.md](../tasks/_drafts/idea-content-review-chat-tool.md)
- Commit: `534d60c` (initial implementation) + `f2f0455` (5-round hardening)

### 245. Δ-1 Surface E — PublishGate findings-block voor interne content (finalize)

Sluit de Δ-1 trifecta: Surface C (Tab 3 paste/url review-UI) en Surface D (Brand Assistant chat-tool) waren live op `main`; Surface E haakt structured findings nu ook in PublishGate voor INTERN gegenereerde canvas-content. Bij sub-threshold score toont PublishGate een uitvouwbaar amber-block met top-3 HIGH-severity findings (severity-pill + category + description + suggestion), zodat user concrete issues ziet vóór de override-modal-keuze. Schema staat al voor: `BrandReviewFinding.fidelityScoreId` is een nullable FK in XOR-relatie met `contentReviewLogId` (ADR-1) — geen migratie nodig.

**Geleverd** (initial `0b27fe0`, ~850 regels): shared util `src/lib/brand-fidelity/violation-to-finding.ts` (extract `mapViolationToFindingInput` + `mapSeverity` + `inferCategory` uit external runner; beide runners delen nu één mapper), `persistContentFidelityScoreIfPossible` extend met `BrandReviewFinding` nested-create via `fidelityScoreId` (atomic 1-roundtrip), nieuwe GET `/api/alignment/internal-findings/[fidelityScoreId]/route.ts` mirror van Surface C, `useInternalFindings` TanStack hook met `staleTime: Infinity` (scores immutable per ADR-2), `FindingsBlock` sub-component in `PublishGate.tsx` met expand/collapse + `key={fidelityScoreId}` voor state-reset bij regenerate. Smoke-test 16/16 + manual UX-smoke uitgevoerd op LINFI deliverable via dev-helper inject-fixture script.

**Finalize review-loop** — 5 iteraties (skill hard-limit) tot 0 CRITICAL/0 WARNING:
- Round 1: 2 CRITICAL (`findingsCount` aggregate ontbrak op create — ADR-1 join-free counter; `inject-fixture` geen NODE_ENV/localhost guard) + 1 WARNING (smoke-test 4 deels tautologisch zoals Surface D round 2)
- Round 2: 0 CRITICAL + 2 WARNINGs (`as string` cast violates "no any types" — revert naar runtime throw als defense-in-depth tegen `refetch()`; smoke-test 4 hard-fail breekt single-workspace seeds — back to soft-skip met luide warn)
- Round 3-4: 1 WARNING ronde 3 (`findingsCount` ook missend op fixture/smoke synthetic creates), 1 WARNING ronde 4 (`SMOKE_FINDINGS_COUNT` magic number — derive uit `smokeFindings.length`)
- Round 5: 0 CRITICAL + 0 WARNING — beide reviewers approve, MINORs als "bewuste keuze" gemarkeerd

**Architectuur-keuzes**: nested-create voor atomic findings+score persist (1 round-trip), aggregate-counter pattern (`findingsCount: findings.length`) gerold mirror op runner én fixture-injector én smoke-test, drift-detection assert in smoke (`findingsCount === persisted.length`), typed `Record<BrandReviewSeverity, …>` voor compile-time exhaustiveness, `key={fidelityScoreId}` voor state-reset bij regenerate, runtime throw in `useInternalFindings.queryFn` als defense-in-depth tegen `refetch()` (die `enabled: false` bypassed).

**Quality gates**: tsc 0 errors, lint 0 errors in nieuwe files (969 pre-existing warnings totaal), smoke `internal-findings.ts` 16/16 pass.

**Dev-helper toegevoegd**: `scripts/inject-publishgate-findings-fixture.ts` — synthetic ContentVersion + sub-threshold ContentFidelityScore + 5 findings injecteren op een gekozen deliverable, met NODE_ENV-prod refusal + localhost-DATABASE_URL guard + `--cleanup` flag. Voor toekomstige UX-smoke van Surface E zonder live F-VAL run te hoeven triggeren.

**Out-of-scope** (gedocumenteerd in task-Notes): `getContentReadiness` filtert niet op `judgeIdentifier` (bestaand readiness-query, niet door deze task geïntroduceerd), STRICT re-score path duplicate-rij-accumulation (bestaand pattern), `mapViolationToFindingInput` populeert `suggestion` nooit (productie heuristics emit geen replacement-text — render is conditioneel), `inferCategory` BrandRule→TERMINOLOGY route (ADR-1 ontwerpkeuze), `SEVERITY_RANK` triplicaat Surface C/D/E (extract naar shared util — separate cleanup-task), `ReviewFinding` type cross-import (extract naar `types/findings.ts` — separate cleanup-task), URL-param parser voor `?fidelityScoreId=` deep-link in BrandAlignmentPage, stale-findings race van 10s `useContentReadiness` staleTime + fire-and-forget persist (acceptable MVP window).

- Task: [tasks/done/publishgate-findings-block.md](../tasks/done/publishgate-findings-block.md)
- ADR: [adr/2026-05-08-fval-output-schema-bevindingen.md](adr/2026-05-08-fval-output-schema-bevindingen.md)
- Spec: -
- Commit: `0b27fe0` (initial implementation) + `9a86e6f` (5-round hardening)

### 246. Δ-1 cleanup-pack — shared SEVERITY_RANK + ReviewFinding types + SPA deep-link + InputBar tool_result fix

Drie cleanup-items uit de Surface D + E finalize-loops als 'separate task' geflagged zijn nu samen geadresseerd, plus een latente productie-bug die tijdens visual smoke aan het licht kwam:

**1. SEVERITY_RANK shared util**: nieuwe `src/lib/brand-fidelity/severity-rank.ts` met `Record<ReviewSeverity, number>` (compile-time exhaustiveness) + `severityRank()` helper met `?? 99` fallback. Drie call-sites (Surface C external GET route, Surface D analyze-tool, Surface E internal GET route) importeren ervan i.p.v. eigen inline-declaratie. Drift-risico bij toekomstige severity-uitbreiding (bijv. `CRITICAL`) weg.

**2. ReviewFinding types extract**: nieuwe `src/types/brand-review-finding.ts` met `ReviewSeverity` / `ReviewCategory` / `ReviewFinding` string-union types. `useReviewContent` (Surface C) en `useInternalFindings` (Surface E) importeren beide uit deze neutrale plek; de hooks-cross-import van Surface E naar Surface C is weg. `useReviewContent` re-exporteert types voor backwards-compat met bestaande consumers.

**3. SPA deep-link voor "View all findings"**: hybrid-SPA architectuur ondersteunt geen URL-params voor pagina-routing (browser-URL blijft constant; `<a href>` zou full reload veroorzaken), dus implementatie via Zustand-store preload-state:
- `useBrandAlignmentStore` extended met `preloadReviewLogId` / `preloadFidelityScoreId` + `openReviewByLogId(id)` / `openReviewByFidelityScoreId(id)` / `clearPreload()` actions (XOR via action-pattern: actie clears tegen-overgestelde field)
- `ContentReviewTab` leest preload-state op mount; bij aanwezigheid skip het paste/url input-form en render direct `ContentReviewResult` met pre-loaded findings via de juiste hook (`useReviewFindings` voor extern, `useInternalFindings` voor intern); synthetisch `ReviewSubmitResponse`-shape voor uniforme render. `clearPreload()` op submit-fire en op handleReset zodat fresh review altijd voorrang krijgt
- Surface D `ReviewFindingsCard`: button met `openReviewByLogId` + `setActiveSection('brand-alignment')` + `closeClaw()` (chat-overlay sluit, content-review tab opent)
- Surface E PublishGate `FindingsBlock`: button met `openReviewByFidelityScoreId` + `setActiveSection` (Canvas wordt verlaten, acceptable trade-off voor deep-link UX)

**4. Latente productie-bug ontdekt en gefixt** (`InputBar.tsx`): `tool_result` SSE event was sinds initial Surface D commit (534d60c) alleen een activity-status setter — `message.toolResults` werd NOOIT gepopuleerd. ChatArea iterates `message.toolResults?.map(...)` om de juiste card te dispatchen, maar door lege array viel het altijd door naar de generic "Data retrieved" badge — of niets. De assistent-text-output gaf zoveel detail (score, threshold, top-3 issues in markdown) dat het op een card leek; pas bij deze cleanup-pack visual smoke (waar de "View all findings" button moest verschijnen) viel op dat de card zelf nooit rendered. Fix: accumuleer SSE `tool_result` events in lokale array tijdens streaming, plak op assistant message bij `done` event. Generic `analyze` tools renderen nu de Wrench-badge (gewenst); `review_content` dispatcht naar ReviewFindingsCard zoals altijd bedoeld.

**Aanvullende cleanups uit finalize-loop**: `durationMs` optional gemaakt in `ReviewSubmitResponse` (preload-internal heeft geen duration; ScorePanel rendert "run took Xs" conditioneel pas vanaf > 0); useEffect-cleanup op ContentReviewTab unmount **verwijderd** (BrandAlignmentPage conditioneel rendert via `{activeTab === 'review' && ...}`, dus tab-switch zou preload wissen — handleSubmit + handleReset volstaan).

**Quality gates**: tsc 0 errors, lint 0 errors in nieuwe/aangeraakte files, smoke `internal-findings.ts` 16/16 pass, manual UX-smoke (Surface D card "View all" + Surface E "+ N more" deep-links beide bevestigd live).

- Task: [tasks/done/delta-1-cleanup-pack.md](../tasks/done/delta-1-cleanup-pack.md)
- ADR: -
- Spec: -
- Commit: `1008918` (initial cleanup-pack) + `4470717` (InputBar tool_result fix) + `bc3b69b` (3-round hardening)

### 247. Brand Alignment Insights tab — pilot-feedback dashboard voor Δ-1 surfaces

Brengt een 4e tab "Insights" naast Alignment / Audit / Content Review met 30d aggregaten over de Δ-1 trifecta — extern (Surface C+D paste/url, gecombineerd) plus intern (Surface E canvas-content). User-visible per workspace, geen org-overview. Geeft data om over 30 dagen pivot-vs-wasted-effort verdict per surface te kunnen geven.

**Geleverd** (initial `c0f274e`, ~790 regels):
- Nieuwe GET `/api/brand-alignment/insights/route.ts` — workspace-scoped 30d aggregate. Returnt KPI-totalen (reviews, findings, threshold-pass-rate, blocked-published-rate proxy via `Deliverable.publishedAt + thresholdMet=false`), top-5 finding-categories via Prisma `groupBy` met stabiele tie-break `[count desc, category asc]`, 7d day-bucket pass-rate trend voor sparkline, 5 meest recente reviews (extern + intern gemixt op scoredAt). `truncated` response-flag wanneer 5000+ records de runaway-cap raken.
- `useAlignmentInsights` TanStack hook met `staleTime: 60s`, `gcTime: 5min` expliciet, queryKey gepostfixed met workspaceId voor cross-workspace cache-isolation.
- `InsightsTab` component met KPI-tiles pattern (cf. `PromptUsageDashboard`), `SparklineChart` 7d trend (hergebruik van business-strategy SparklineChart, nu met `useId()` voor unique gradient-id ipv hardcoded `sparkline-fill`), top-5 categories ranking, recent-reviews lijst met source-pill (Paste / URL / Canvas) + score-color + relative-time. Empty-state placeholder bij 0 reviews; truncated-banner bij >=5000 records met expliciete sampling-methode-uitleg; "Workspace context niet beschikbaar" fallback bij failed useWorkspace.
- `useBrandAlignmentStore.AlignmentTab` union extend met `'insights'`; `BrandAlignmentPage` 4e tab-button + conditional render.

**Cross-task scope-creep**: SparklineChart hardcoded gradient-id collision was een latente bug die door de nieuwe InsightsTab consumer relevanter werd — `useId()` fix in dezelfde PR (geen API-change, backwards-compatible voor bestaande StrategyProgress consumer).

**Finalize review-loop** — 5 iteraties (skill hard-limit + 1 met user-akkoord) tot 0 CRITICAL en alleen acceptabele truncation-edge-case MINORs over:
- Round 1: 3 CRITICAL (Tailwind class overlap, workspace-isolation defense gap, SparklineChart gradient-id) + 6 WARNINGs (DEFAULT_COMPOSITE_THRESHOLD import, take cap + N+1 fold, override-rate label rename, role=alert, _count consistent, queryKey workspaceId)
- Round 2: 0 CRITICAL + 3 WARNINGs (workspace error fallback, gcTime expliciet, truncated flag)
- Round 3: 0 CRITICAL + 4 WARNINGs (`_count.findings` ipv relation-load tegen memory-spike, stable tie-break, isPending ipv isLoading, mixed-threshold semantics comment)
- Round 4: 0 CRITICAL + 2 WARNINGs (banner-text trend distortion, no-workspace copy)
- Round 5 (hard-limit + 1): 0 CRITICAL + 2 WARNINGs gefixt + corner-case truncation behaviour gedocumenteerd

**Quality gates**: tsc 0 errors, lint 0 errors in nieuwe files, manual UX-smoke pass op LINFI workspace (10 reviews, 16 findings, 20% pass-rate, 0% blocked-published — actionable productie-data).

**Out-of-scope** (gedocumenteerd in task-Notes): formatRelative NL drift met dashboard formatLastScan EN, empty-state CTA inert, trend-arrow ignores reviewCount, color-token drift, A11y debt (KPI-tiles geen role/aria-label, sparkline no role=img), tab-state geen URL-sync, denormalized findingsCount legacy-undercount, blockedPublishedRate proxy-overcounting, micro-race already covered.

- Task: [tasks/done/brand-alignment-insights-tab.md](../tasks/done/brand-alignment-insights-tab.md)
- ADR: -
- Spec: -
- Commit: `c0f274e` (initial implementation) + `64f7f95` (5-round hardening)

### 248. F-VAL rules-pijler audit — mapper categories + NL-NL packs + stem-variants

Drie incrementele wijzigingen op de F-VAL rules-pijler na visual-smoke ontdekking dat fluff-NL-tekst met "passie/kwaliteit/innovatie" 0 findings opleverde voor LINFI. Insights tab toonde 16/16 findings allemaal in TERMINOLOGY-categorie (mapper-quirk). Resultaat: rijkere category-spread + meer signal-coverage voor alle drie Δ-1 surfaces.

**Geleverd** (initial `accd88c`, ~415 regels):

- `inferCategory` in `violation-to-finding.ts` extended met `ruleType?: BrandRuleType` parameter. BrandRule violations routen nu via `v.ruleType`: REQUIRED_PHRASE → `BUSINESS`, STYLE_LIMIT → `STYLE`, PILLAR_REFERENCE → `BUSINESS`, FORBIDDEN_WORD blijft `TERMINOLOGY` (geen eenduidig pad zonder schema-extension). Insights tab krijgt category-spread i.p.v. 100% TERMINOLOGY voor alle BrandRule findings.

- NL-NL heuristic-pack uitbreiding: `vague-quality.ts` krijgt "passie" (always-flag) en "kwaliteit" (context-flag, requires-substantiation). `corporate-fluff.ts` krijgt "innovatie" en "innovaties" als stem-varianten van "innovatief". Vangt veelvoorkomende NL-cliché-buzzwords die voorheen door beide pillars heen vielen.

- `expandStemVariants(word)` helper in `brand-rule-sync.ts` — pure-functie, deterministische NL suffix-rules zonder linguistic library. `wordsWeAvoid` entries krijgen automatisch flexed/plural varianten als FORBIDDEN_WORD BrandRules. Beide sync-functies (`syncWordsAvoidToRules` legacy + `syncVoiceguideToRules`) gebruiken het. AntiPatterns blijven 1-op-1 (phrases). LINFI verified: 14 input wordsWeAvoid → 44 BrandRules; "innovatief" matcht nu ook "innovatie" in tekst → 1 FORBIDDEN_WORD violation (was 0).

**Suffix-rules (precision boven recall — false-positives in user-facing patterns/messages zijn schadelijker dan gemiste plurals)**:
- `-ief` (innovatief → innovatie/innovatieve/innovaties)
- `-eel` (passioneel → passionele) — geen plural (-en) want non-NL-noun risk
- `-iek` (uniek → unieke) — geen `+ en` want "unieken" geen NL-noun
- `-isch` (automatisch → automatische) — geen `-isme` want "logisme/basisme" non-words
- Default: `endsWith('e')` → `+ s` (luxe → luxes); else → `+ en` (kwaliteit → kwaliteiten)

**Gemist (deliberate trade-off, gedocumenteerd in helper-JSDoc)**: `materieel → materialen`, `techniek → technieken`, `fabriek → fabrieken`, `automatisch → automatisme`. User moet zulke plural-vormen handmatig in wordsWeAvoid invoeren als die actively unwanted zijn.

**Smoke-test** `heuristic-stem-variants.ts` 25/25 pass: 5 suffix-rules + edge cases (multi-word skip, korte input, empty=`[]`, whitespace, dedup).

**Finalize review-loop** — 4 iteraties tot Reviewer A clean (Reviewer B's WARNINGs blijven doc-clarity-claims op already-verified behavior):
- Round 1: 2 CRITICAL (`-isch + 'isme'` non-words; default-pad "luxee/kwaliteite") + 5 WARNINGs
- Round 2: 0 CRITICAL + 3 trade-off-WARNINGs gefixt naar conservatief
- Round 3: 5 WARNINGs over gemiste legitime plurals → resolved via uitgebreide JSDoc trade-off-block
- Round 4: Reviewer A clean ✓

**Quality gates**: tsc 0 errors, lint 0 errors, smoke 25/25 pass.

**LINFI productie-side-effect bevestigd**: na resync 14 → 44 wordsWeAvoid BrandRules. Heuristics blijven echter 0 violations: LINFI's `Workspace.contentLanguage='en'` → EN-GB pack i.p.v. NL-NL. **Separate user-action vereist** in workspace settings om naar 'nl' te switchen voor NL-NL heuristic-pack activatie.

**Out-of-scope** (gedocumenteerd in task-Notes): locale-guard op helper (NL-only morfologie), dubbele findings risk heuristic+BrandRule, BrandRule.category schema-field voor eenduidige FORBIDDEN_WORD-categorisatie, multi-locale heuristic-pack expansion (en-GB / nl-BE / de-DE), lemmatizer-library voor preciezere morfologie, deploy-time backfill-cron voor bestaande workspaces.

- Task: [tasks/done/fval-rules-pillar-audit.md](../tasks/done/fval-rules-pillar-audit.md)
- ADR: -
- Spec: -
- Commit: `accd88c` (initial implementation) + `82eca9c` (4-round hardening)

### 251. Brand Assistant page-wiring — Step1Context + PersonaDetail + BrandAssetDetail

Sluit BCP Phase 2 Phase 0.2.A vervolg-cluster af. Foundation (`useFormFillStore` + `fill_form_fields` tool + system-prompt surfacing + MutationConfirmCard handler) was 2026-05-08 gemerged maar geen enkele page registreerde nog velden — AI zag overal `formFillFields = []`. Resultaat na deze entry: Brand Assistant kan op de 3 hoogvolume-pages "vul X met Y" begrijpen, confirm-card tonen, en het veld via de bestaande mutation-paden persisteren.

**Geleverd** (`f4ee9ac` scaffold pad reused; eigen commit volgt):

- `src/features/campaigns/components/canvas/accordion/Step1Context.tsx` (modify) — `useEffect` registreert `objective` / `keyMessage` / `toneDirection` / `callToAction` + content-type-specifieke velden bij `useFormFillStore`. Setters routen direct via bestaande `useCanvasStore.setBriefField` + `setContentTypeInput` (geen refactor). `formatCurrentValue` helper voor string/array/boolean preview.
- `src/features/personas/components/detail/PersonaDetailPage.tsx` (modify) — page-level adapter expose 23 velden (13 strings + 10 string-arrays). Batched-mutate via `queueMicrotask` + ref accumulator: N synchrone setter-calls in `fill_form_fields.applyFill` loop worden in 1 `updatePersona.mutate(...)` gemerged ipv N parallelle PATCH-calls. `null → ''` coercion voor non-nullable string-fields (PATCH-schema accepteert null niet); null behouden voor nullable `quote` / `bio` zodat "clear" semantisch correct landt. Locked = geen velden exposeren.
- `src/features/brand-asset-detail/components/BrandAssetDetailPage.tsx` (modify) — polymorphic frameworkData adapter exposeert top-level keys ongeacht frameworkType (BRAND_ESSENCE / PURPOSE_WHEEL / etc.). Server-side shallow merge in `/api/brand-assets/[id]/framework` PATCH route betekent dat we alleen gewijzigde keys hoeven te sturen — elimineert stale-baseData race wanneer meerdere fills snel achter elkaar gebeuren. `humanizeKey` voor labels, `formatFrameworkPreview` voor previews (string/number/array → tekst, object → `<N fields>` hint).

**Trade-offs gedocumenteerd**:
- Geen bracket-notatie support in v1 — AI moet hele nested objecten/arrays meesturen wanneer het sub-keys wil wijzigen. Server merget shallow op top-level, dus partiële nested objecten verliezen niet-genoemde sub-keys. Acceptabel omdat de AI de structuur sowieso moet kennen voor consistente updates.
- Step1Context heeft geen lock-state check — content briefs zijn niet locked in huidige model. Persona/Asset wel.
- Browser-smoke (5 stappen Step1/Persona/Asset/Δ-1 compat/edge-case) uitgesteld naar pre-launch sprint #4 batch — consistent met de pre-launch-smoke-batch deferral (zie eerdere entry). Code passes tsc + lint clean, 2 review-rondes 0 CRITICAL.

**Δ-1 compat (uit done task acceptance-criteria)**:
- `pageContext.sectionPath` voor Canvas Step 4 — sinds Surface D shipped impliciet voldaan
- `inspect_current_entity` op Canvas Step 4 — Surface D gebruikt eigen `review_content` tool, niet inspect; criterium achterhaald
- Read-tool chat-card pattern — `BrandReviewResultCard` werkt via Surface D-pattern; geen nieuwe verificatie nodig

**Finalize review-loop** — 2 iteraties (clean op round 2):
- Round 1: 1 CRITICAL gefixt (BrandAssetDetailPage stale-baseData race; server merge betekent geen full-frameworkData spread nodig), 1 WARNING gefixt (PersonaDetailPage string null-coercion via `nullable` flag per veld)
- Round 2: Reviewer A clean, Reviewer B residual WARNINGs zijn "Pattern is safe, no action" — geen actionable changes

**Files modified**:
- `src/features/campaigns/components/canvas/accordion/Step1Context.tsx`
- `src/features/personas/components/detail/PersonaDetailPage.tsx`
- `src/features/brand-asset-detail/components/BrandAssetDetailPage.tsx`

**Documenten**:
- Task: [tasks/done/claw-page-awareness-vervolg.md](tasks/done/claw-page-awareness-vervolg.md)
- Parent task: [tasks/done/claw-page-awareness.md](tasks/done/claw-page-awareness.md) — Phase 0.2.A foundation

- Task: [tasks/done/claw-page-awareness-vervolg.md](tasks/done/claw-page-awareness-vervolg.md)
- ADR: -
- Spec: -
- Commit: `9240030`

### 250. BrandVoiceguide.contentLocale picker UI (Voice DNA tab)

Follow-up uit #249 deferred-list. Gaf user geen UI om `BrandVoiceguide.contentLocale` te overriden — voorheen alleen DB-script via backfill. Pilot start binnenkort en multi-locale brands (nl-BE, multi-merk agencies) hadden geen pad om handmatig te corrigeren wanneer auto-detect verkeerd zit of bewust afwijkende keuze nodig is.

**Geleverd** (scaffold `f4ee9ac` + finalize-iteratie):

- `src/app/api/i18n/detect-suggested-locale/route.ts` (nieuw) — GET endpoint wrapper rond `detectBrandLanguage(workspaceId)` PLUS `resolveLocaleForBrandWithSource(workspaceId)`. Twee onafhankelijke try/catch-blokken zodat een failure in detectie de active-locale niet onbruikbaar maakt (en omgekeerd). Auth-resolutie heeft eigen catch.
- `src/hooks/useSuggestedLocale.ts` (nieuw) — TanStack hook met `staleTime: Infinity` + workspaceId-scoped queryKey; types via canonical `Locale` + `LocaleSource` re-export uit locale-resolver.
- `src/lib/brand-fidelity/heuristics/locale-resolver.ts` — toegevoegd `resolveLocaleForBrandWithSource` (parallel queries, voor UI-indicator) naast bestaande `resolveLocaleForBrand` (hot-path, sequentieel met short-circuit). Exports `SUPPORTED_LOCALES`, `DEFAULT_LOCALE_BY_LANG`, `LocaleSource` als single source of truth.
- `src/app/api/brandvoiceguide/route.ts` — updateSchema accepteert `contentLocale: z.enum(SUPPORTED_LOCALES).nullable().optional()`. Import direct uit locale-resolver (geen lokale duplicatie).
- `src/features/brandvoice/components/sections/VoiceDnaSection.tsx` — Content-locale card met: "Currently active" pill (laat zien wat F-VAL gebruikt + source-label: voiceguide override / workspace default / fallback), aparte unsaved-cue, BCP-47 dropdown (4 locales), informatieve auto-detected regel met confidence-badge. `aria-label` op select.
- `src/features/brandvoice/hooks/index.ts` — `useUpdateVoiceguide` invalidates `['suggested-locale', workspaceId]` zodat de "Currently active" pill refresht na save.
- `scripts/smoke-tests/locale-picker-api.ts` (nieuw) — DB-laag + HTTP-laag tests met try/finally cleanup (restoreert LINFI's originele contentLocale ook bij mid-run crash).

**UX-iteratie** (gedreven door pilot-user testronde):
- Initiele "Use suggested" knop verwarrend (gebruiker dacht het was een bevestig-knop voor dropdown-keuze) → knop verwijderd, auto-detected blijft alleen als info-regel
- Geen indicatie welke locale F-VAL daadwerkelijk gebruikt → "Currently active" pill toegevoegd (los van unsaved dropdown-state)
- Save-actie refreshte niet de active-locale → cache-invalidation toegevoegd aan voiceguide-mutation

**Finalize review-loop** — 5 iteraties (hard limit; round 5 reviewer A clean, B 2 defensive WARNINGs over documented v1 trade-offs):
- Round 1: 2 CRITICAL gefixt (`DEFAULT_LOCALE_BY_LANG` + `SUPPORTED_LOCALE_VALUES` duplicaten — imports uit canonical resolver)
- Round 2: catch-block fabriceerde gefakede en-GB activeLocale (corrupted UI-truth) → returnt null bij resolver-fail; `<select>` aria-label toegevoegd; `key={contentLocale}` weggehaald (niet langer nodig na verwijderen "Use suggested"); non-null `!` weg
- Round 3: Zod-enum readonly-tuple fix; smoke-test in try/finally; workspaceId in invalidation
- Round 4: hot-path `resolveLocaleForBrand` terug naar sequential short-circuit (perf-regressie vermeden door behoud van parallel-variant alleen in WithSource); invalidation skipt expliciet als workspaceId falsy
- Round 5: clean op A, B's residuals zijn documented v1 limitaties (staleTime+detection-refresh)

**Whitelist consistency** nu via één bron: `SUPPORTED_LOCALES` in locale-resolver wordt gebruikt door Zod-enum (route), TS-type (`Locale`), en LOCALE_OPTIONS-codes (UI). `LocaleSource` type idem voor activeSource.

**Documenten**:
- Task `tasks/done/brandvoiceguide-locale-picker.md`
- ADR (referentie): `docs/adr/2026-05-08-locale-routing-brand-voice.md`, `docs/adr/2026-05-10-brand-language-auto-detect.md`

- Task: [tasks/done/brandvoiceguide-locale-picker.md](tasks/done/brandvoiceguide-locale-picker.md)
- ADR: -
- Spec: -
- Commits: scaffold `f4ee9ac`, finalize `0538a8d`

### 249. Brand-language auto-detect + backfill + runtime mismatch-guard

F-VAL rules-audit van vandaag onthulde dat 5 van 15 workspaces (incl. LINFI) verkeerd geconfigureerde `Workspace.contentLanguage` hadden — content was duidelijk NL maar veld stond op default 'en'. Resultaat: F-VAL Pijler 3 gebruikte EN-GB heuristic-pack ipv NL-NL, canvas-orchestrator injecteerde "Write in English" in elke generate-prompt. Auto-detect mechanism corrigeert alle workspaces tegelijk plus runtime-guard maakt toekomstige mismatches zichtbaar zonder user-flow te onderbreken.

**Geleverd** (initial `e5d2818`, ~950 regels):

- `franc-min` v6.2.0 dependency (42KB pure-JS, geen native bindings, ISO 639-3 trigram-detectie, 150+ talen)
- `src/lib/i18n/detect-brand-language.ts` (nieuw) — `detectBrandLanguage(workspaceId)` consolideert voiceguide.voiceDescription + writingSamples + brandAssets via flatten-helper (depth-cap 10 + WeakSet voor circular safety), runt franc, mapt naar 3 ondersteunde locales (nl-NL / en-GB / de-DE — FR detecteert maar mapt naar null tot heuristic-pack bestaat). Confidence-thresholds: `high` ≥2 sources én ≥300 chars; `medium` ≥1 source én ≥150 chars; `low` anders.
- `logBrandLanguageMismatchIfAny()` fire-and-forget runtime-guard met optimistic cache-set vóór await (concurrent-call dedup), MAX_CACHE_SIZE=500 + drop-oldest eviction, cache-clear in catch-branch (geen 5-min stilte na transient DB-error)
- `scripts/backfill-brand-language.ts` (nieuw) — workspace-iteratie audit/apply met productie-guard, `--apply` flag, `--workspace-slug` filter, idempotent. Workspaces zonder voiceguide-row krijgen alleen workspace.contentLanguage correctie (voiceguide.contentLocale blijft NULL). Action-enum: `update-ws` / `update-locale` / `update-both` / `skip-match` / `skip-no-signal` / `skip-low-conf` / `skip-medium-conf`.
- `src/lib/ai/canvas-orchestrator.ts` — fire-and-forget mismatch-guard call vóór BVD-build, try/catch defense-in-depth
- `scripts/smoke-tests/brand-language-detect.ts` — 11 fixture-tests (NL/EN/DE/FR/mixed/short/empty/code-blob)
- `docs/adr/2026-05-10-brand-language-auto-detect.md` — precedence-policy (voiceguide.contentLocale → workspace.contentLanguage → detection → en-GB), confidence-thresholds, override-policy (auto-detect is NIET runtime-override; backfill-tool + warn-log only), franc-min library-rationale vs alternatives

**Productie-data effect** na `--apply` op alle workspaces:
- 4 NL-correcties: linfi, better-brands, wra-juristen, goed-bouw (en → nl)
- 1 inverse: napking (nl → en, content was EN)
- 9 voiceguide.contentLocale fills waar voiceguide-row bestond
- 2 skipped voor no-signal: wassink-groep, techcorp-brand (geen tekstuele content)
- Verified idempotent: 2e run is no-op

**Finalize review-loop** — 4 iteraties (Reviewer A clean op iter 3; iter-4 WARNINGs zijn cache-race-nuances van bewust gedocumenteerd ontwerp):
- Round 1: 3 CRITICAL gefixt (FR-mapping drop, `!= null` undefined fix, francScore drop), 4 WARNINGs
- Round 2: action-enum `skip-medium-conf` toegevoegd, orderBy take:20 brandAssets, depth-cap + WeakSet, MAX_CACHE_SIZE 500, try/catch orchestrator
- Round 3: cache-clear in catch-branch, smoke FR-test comment expliciet, summary toont medium-conf count
- Round 4: 0 CRITICAL, 3 WARNINGs allemaal acceptable trade-offs rondom optimistic-cache-set design

**Quality gates**: tsc 0 errors, lint 0 errors, smoke 11/11 pass, backfill verified idempotent.

**Out-of-scope** (gedocumenteerd in task-Notes): helper-level unit tests (smoke draait franc-lib direct, helper integration is via backfill --apply live), franc-min margin gating, telemetry hook bij detection-failure, ES/PT/IT detection (geen heuristic-packs; UI accepteert wel manual-set), LRU eviction ipv insertion-order, BrandVoiceguide.contentLocale picker UI (separate task), auto-detect bij workspace-creation (chicken-and-egg met onboarding), multi-locale workspace support (post-launch).

- Task: [tasks/done/brand-language-auto-detect.md](../tasks/done/brand-language-auto-detect.md)
- ADR: [adr/2026-05-10-brand-language-auto-detect.md](adr/2026-05-10-brand-language-auto-detect.md)
- Spec: -
- Commit: `e5d2818` (initial implementation) + `021f262` (4-round hardening)### 404. Research-stack-bundel gepland — 4 uitvoeringsklare task-files voor een vervolg-sessie

User-besluit 2026-07-15 na drie convergerende checks (S2/Nova/Exa — welke oppervlakken profiteren nog meer van de verse research-keys?): trend-radar, Marco, GEO-long-form én de nieuwe brand-mention-monitor plannen voor uitvoering door een aparte (Sonnet 5-)sessie. **Geleverd**: overkoepelend plan ([docs/reports/research-stack-plan-2026-07-15.md](reports/research-stack-plan-2026-07-15.md) — volgorde, gedeelde patronen zoals fail-soft-verrijking/fencing/0-credit, werkafspraken per sessie) + vier task-files met geverifieerde re-entry-punten, contracten, smoke-plannen en start-instructies: `research-stack-trend-radar` (Exa+S2 naast Gemini-grounding, patroon #402), `research-stack-marco-web-signals` (curated tool voor extern nieuws per concurrent, eigen-domein-uitsluiting), `research-stack-geo-research-backed` (échte bron-stats in `citeableStats` — versterkt het zwaarst wegende GEO-signaal; A/B-datapunt verplicht, scoring ongemoeid) en `brand-mention-monitor` (10e agent, **Fase-0-gated** op Exa-dekking voor NL-MKB-merken; discovery + Red Team in `tasks/_drafts/idea-brand-mention-monitor.md`). Roadmap: nieuwe subsectie 🔬 + de MCP-besluiten van 2026-07-14 (AI-assistenten · OAuth 2.1 · read+F-VAL) vastgelegd in de geparkeerde MCP-sectie.

### 403. Marketing-site launch-polish — copy-fixes + 4 echte product-screenshots

Taak #9-afhechting (Claude-deel). **Copy-fixes**: de trial-claim op de homepage zei 2× "14 days free" terwijl het product een 28-dagen no-card trial heeft (feitelijke fout, gecorrigeerd); de agents-feature-pagina zei "six specialist agents" — bijgewerkt naar negen mét de nieuwe rollen (weekly reports, SEO/GEO- en ads-watchdogs). **Screenshots**: de "Screenshot goes here"-placeholder vervangen door echte `<img>`-render + vier échte product-screenshots geschoten (`public/marketing/features/`: agents-catalogus met alle 9 persona's, Brand Voice met gevulde voice-DNA, Brandstyle met kalibratie-flow, en Content Canvas met een écht gegenereerde LinkedIn-post op F-VAL 79 incl. score-opbouw). Gemaakt via een herbruikbaar Playwright-script (`scripts/dev/marketing-screenshots.mjs`, lokale dev-server + seed-account, EN-locale + BB-workspace via cookies) — onderweg vier dev-omgevingslessen opgedaan (HMR breekt networkidle; Next dev weigert 127.0.0.1 als origin; Better Auth eist BETTER_AUTH_URL-poortmatch; UI-taal komt uit appearance_preference, niet localStorage). **Rest voor de user** (taak #9): pilot-quote (1 zin), Calendly-account + `NEXT_PUBLIC_CALENDLY_URL`, domein-keuze.


