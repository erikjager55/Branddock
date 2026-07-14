---
id: agent-seo-watchdog
title: SEO/GEO-verval-wachter — scheduled agent die gepubliceerde content bewaakt
status: pending-tech
created: 2026-07-14
verdict: ready-to-build
---

# Probleemstelling (1 zin)

Gepubliceerde SEO/GEO-content veroudert onbewaakt — score-drift, verouderde statistieken en stale pagina's blijven onzichtbaar tot de vindbaarheid al is weggezakt, en geen enkele solo-marketeer loopt periodiek handmatig al zijn pagina's na.

> **Bron-nota discovery**: het aangewezen marktrapport
> `docs/reports/agents-marktonderzoek-en-uitbreidingsadvies-2026-07-14.md` (advies #2)
> bestaat niet in de repo op moment van schrijven — de markt-claims hieronder komen
> uit de opdracht-context van de aanroepende sessie. Committen van dat rapport is
> een open actiepunt (zie Volgende stap).

# WHO — Doelgebruiker

**Rol**: brand/content-owner die via Branddock long-form GEO/SEO-content publiceert (direct merk-owner nu; agency-medewerker met meerdere workspaces later).
**Schaal**: pre-launch — 1 pilot-workspace (Better Brands) plus de launch-funnel. Expliciete klantvraag: **0** (dit is een markt-gedreven bet, geen pull-signaal — eerlijk benoemd).
**Acuut segment**: workspaces die de long-form GEO-flow daadwerkelijk gebruiken en pagina's via Branddock-hosting live hebben staan.

## JTBD-narratief

> "Toen ik drie maanden geleden een reeks GEO-artikelen publiceerde, wilde ik dat die vindbaar bléven, maar niemand keek er ooit nog naar om — er is geen moment waarop 'content nalopen' vanzelf gebeurt, dus verouderde stats en gedrifte pagina's stapelen zich stil op tot een concurrent of een AI-antwoord me heeft ingehaald."

Nota bene: dit narratief is geëxtrapoleerd uit marktbewijs (Jasper's Optimization Agent draait exact deze usecase op "decaying content"), niet uit een Branddock-klantgesprek. Dat is de zwakste evidence-laag van dit plan.

## Evidence

- `src/lib/landing-pages/geo-analysis.ts` — de meet-haak bestaat al en verwijst zélf naar "een latere GEO-dashboard/meting" en "anker voor 90-dagen-staleness via isContentStale": het product anticipeerde deze feature al bij GEO Fase 3.
- `docs/changelog.md` #338 — GEO-meet-paneel toont per pagina al een stale-vlag (`geo-panel-view.ts`), maar niemand kijkt actief; er is geen push-mechanisme.
- Agents-marktonderzoek 2026-07-14, advies #2 (user zei JA) — AEO/GEO is dé groeihoek (Jasper 14 agents, Surfer auto-optimize); "decaying content detecteren" is een bewezen Jasper-usecase; **niemand in de markt levert kwaliteitsbewijs bij de herschrijf** — dat is exact Branddocks F-VAL-white-space (zelfde conclusie als `docs/reports/agents-diepte-analyse-en-plan-2026-07-05.md` §white space).
- Memory `agents-initiative`: Fase 2 (schedules + notificaties + per-agent-memory) live op prod per 2026-07-14 — er is scheduled-agent-infra zonder één scheduled usecase die er iets om geeft.

# WHAT — Probleem (niet oplossing)

De user publiceert long-form content via Branddock en krijgt op publish-moment een GEO-score + verbeterpunten. Daarna gebeurt er niets meer: de score veroudert stil (het paneel markeert 90-dagen-staleness, maar alleen als je toevallig kijkt), citeable stats verwijzen naar oude jaartallen, en canonical/schema-drift na renames blijft onopgemerkt. Het waarneembare gedrag: users openen het GEO-paneel vrijwel nooit na publicatie — onderhoud gebeurt reactief (als iets al kapot voelt) of nooit.

**Wat "verval" vandaag concreet detecteerbaar is in Branddock-data** (gecheckt — géén Search-Console-integratie aanwezig, `WorkspaceIntegration` bevat alleen auth-OAuth):

1. **Tijds-verval**: `geoOptimizationAnalysis.measuredAt` ouder dan drempel (`isContentStale`, 90d default — bestaat).
2. **Score-drift**: `computeGeoScore` is deterministisch en judge-vrij → gratis her-scoren van de actuele gepubliceerde variant en delta vs publish-score.
3. **Canonical-drift**: `canonicalUrl` op meetmoment vs nu (rename/slug — het veld is hiervoor ontworpen).
4. **Schema-drift**: geëmitte schema.org-types vs publish-snapshot.
5. **Feit-veroudering**: citeable stats met oude jaartallen/bronnen (heuristiek; grounded-search-verificatie is duurder en optioneel).

**Wat NIET detecteerbaar is vandaag**: echte ranking-/traffic-decay (geen GSC, geen rank-tracking, AI-crawler-citatie-meting bewust out-of-scope gelaten in GEO Fase 3). De watchdog detecteert dus *onderhoudsachterstand*, geen *performance-verlies* — die framing moet in het product eerlijk blijven.

# WHY-NOW

Drie concrete triggers, alle drie van deze week/maand:

- **Infra-trigger**: agents-scheduling ging 2026-07-14 live op prod (PR #119, golden e2e geslaagd). Er is nu een schedule/notificatie/memory-motor zonder één agent waarvoor "scheduled" de natuurlijke modus is — dit is de eerste usecase die die investering laat renderen.
- **Markt-trigger**: AEO/GEO is dé groeihoek in de agent-markt (Jasper, Surfer auto-optimize). Het launch-window om "agent die je content bewaakt mét kwaliteitsbewijs" als differentiator te claimen is nu; over 6 maanden is het tafelinzet.
- **Launch-trigger**: user wil dit als launch-feature ("de dunste MVP die bij launch mee kan"). Post-launch bouwen betekent launchen zonder het verhaal dat de agents-catalogus meer is dan on-demand chat.

# SUCCESS METRICS

**Primaire metric** (één): binnen 30 dagen na go-live accepteert de pilot-workspace minstens 2 herschrijf-voorstellen die uit *scheduled* watchdog-runs komen (meetbaar: `AgentArtifact.acceptedAt` op PROPOSALs van deze agent met `triggerType='scheduled'`).

**Counter-metric** (mag NIET kapotgaan): de herschreven content scoort op GEO-score én F-VAL minimaal gelijk aan het origineel — anders produceert de watchdog ruis en beschadigt hij het vertrouwen in de hele agents-catalogus. Tweede bewaking: COGS per scheduled run blijft ≤ $0,15 (in lijn met bestaande agent-runs ~$0,10).

# CONSTRAINTS

## Hard

- **Tijd**: pre-launch window; dunste MVP, geen fase-2-meebouw.
- **Tech**: propose-only (artefacten + confirm) — de bestaande agent-lijn; prod-cadence-floor is DAILY, default voor deze agent wordt wekelijks.
- **Data**: alleen Branddock-eigen data — gepubliceerde deliverables met `geoOptimizationAnalysis`. Géén Search-Console-aanname (bestaat niet, gecheckt).
- **Kosten**: scan-run kost de user 0 credits (agents zijn flat-priced per pricing-ADR; deterministische her-scoring is sowieso AI-vrij; alleen de rapport-schrijvende LLM-call kost COGS ~$0,10). De herschrijf zélf kost de normale long-form-credits (80 pre-flight) — pas ná expliciete confirm.

## Soft

- Persona-naamgeving (7e agent naast Nova/Vera/Stella/Milo/Marco/Dana) — productkeuze, mag bij tech-planning.
- Rapportvorm REPORT vs TABLE — beide bestaan als artifact-type; wat het beste prioriteert mag de bouwer kiezen.

## Must NOT do

- Nooit zonder confirm iets aan live pagina's wijzigen.
- Geen traffic-/ranking-claims in het rapport ("je verkeer daalt") — we meten dat niet; alleen onderhouds- en driftsignalen benoemen.
- Geen nieuwe herschrijf-motor — de bestaande 8-staps-pipeline (F-VAL-geborgd, ~5-7,5 min) is de enige herschrijfroute.
- Merkcontext en F-VAL-scoring blijven gratis (ZERO_COST-lijn uit de pricing-ADR).

# SCOPE

## In-Scope (MVP)

1. Nieuwe agent in de code-registry met een scheduled use-case (weekly default): scan alle gepubliceerde deliverables van de workspace die een `geoOptimizationAnalysis` dragen.
2. Verval-detectie op de 5 vandaag-detecteerbare signalen (staleness, score-drift via deterministische her-scoring, canonical-drift, schema-drift, feit-veroudering-heuristiek).
3. Eén geprioriteerd inbox-artefact per run ("wat eerst en waarom", incl. oude vs actuele score per pagina) + de bestaande run-notificatie; expliciete "geen verval gedetecteerd"-uitkomst als alles gezond is.
4. Per prioriteits-item een propose-only herschrijf-voorstel dat na confirm de bestáánde long-form-flow op dat deliverable start, met na afloop oude vs nieuwe GEO/F-VAL-score zichtbaar (het kwaliteitsbewijs — de marktdifferentiator).

## Out-of-Scope (expliciet NIET, ook al verleidelijk)

1. **Auto-deploy van herschreven content naar live pagina's** — markt-les: niemand doet dit betrouwbaar; propose-only is de Branddock-lijn.
2. **Google Search Console-integratie** — bestaat niet; echte traffic-decay-detectie is een eigen feature met eigen discovery.
3. **DataForSEO / rank-tracking** — staat al als post-launch roadmap-item (`dataforseo-integration`); niet mee laten liften.
4. **Externe AI-crawler-citatie-meting** — bij GEO Fase 3 bewust out-of-scope gelaten; blijft dat.
5. **Scannen van externe (niet-via-Branddock-gepubliceerde) website-pagina's** via de WebsiteScan-motor — verdubbelt de scope (crawl + baseline-loze scoring); fase later.
6. **Dedicated "light rewrite"/delta-herschrijf-pipeline** — MVP hergebruikt de volledige bestaande pipeline; een goedkopere refresh-modus is een latere optimalisatie.
7. **Auto-fix van schema/JSON-LD- of canonical-drift** — alleen signaleren.
8. **Keyword-cannibalisatie, interne-link-analyse, content-gap-analyse** — Surfer-territorium, andere feature.
9. **Agency-rollup over meerdere workspaces** — single-workspace zoals alle agents.
10. **Eigen digest-/e-mailkanaal** — de bestaande run-notificaties (met emailEnabled-gate) zijn genoeg.

# AANNAMES

Aannames die WAAR moeten zijn voor deze feature te slagen:

- **Interne vervalsignalen zijn een bruikbare proxy voor echt onderhoudswerk** — bewijs: gedeeltelijk (staleness/drift zijn reëel, maar de correlatie met traffic-verlies is onbewezen zonder GSC) — onbewezen? **ja**. Mitigatie: eerlijke framing ("onderhoudsprioriteit", geen traffic-claims) + latere validatie via DataForSEO/GSC.
- **De pilot/early users hebben genoeg gepubliceerde GEO-deliverables om een wekelijkse scan zinvol te maken** — bewijs: onbekend — onbewezen? **ja**. De Eerste Taak hieronder beantwoordt dit vóór de bouw start (30 min query, geen weken user-research).
- **Herschrijven via de bestaande pipeline verbetert de scores aantoonbaar** — bewijs: F-VAL-borging bestaat en de pilot-meting (memory `pilot-fval-claim`) toont een echt maar bescheiden, briefing-gevoelig on-brand-verschil — deels bewezen; per herschrijf meetbaar via de counter-metric.
- **De scheduled-infra is stabiel genoeg voor een klantgerichte wekelijkse agent** — bewijs: Fase 2 live op prod 2026-07-14, golden e2e COMPLETED op de BB-workspace via de prod-cron — **bewezen**.

> De eerste twee aannames zijn de reden dat het rapport nóóit "je verliest verkeer" mag zeggen en dat de Eerste Taak een datacheck is, geen code.

# ACCEPTATIECRITERIA (MVP)

Given/When/Then:

- [ ] Given een workspace met ≥1 gepubliceerd GEO-deliverable waarvan `measuredAt` ouder is dan de staleness-drempel, When de wekelijkse scheduled run draait, Then verschijnt in de agents-inbox één artefact met per pagina: de vervalsignalen, publish-score vs actuele (her-berekende) score en een prioriteitsvolgorde — en de run boekt 0 credits af bij de user.
- [ ] Given dat artefact, When de user het herschrijf-voorstel voor één pagina bevestigt, Then start de bestaande long-form-flow voor dát deliverable met de normale credit-afboeking, en na afronding zijn oude en nieuwe GEO-score naast elkaar zichtbaar.
- [ ] Given een workspace zonder pagina's met vervalsignalen, When de run draait, Then meldt de agent expliciet "geen verval gedetecteerd" (conform het artifacts-contract: lege artifacts-array of REPORT met uitleg — geen stille no-op, geen valse urgentie).
- [ ] Given een workspace zonder enige gepubliceerde GEO-deliverable, When iemand de schedule wil aanzetten, Then legt de UI of de eerste run uit dat er niets te bewaken valt (geen wekelijkse lege rapporten).
- [ ] Given een falende scheduled run, Then ontvangt de schedule-eigenaar precies één fout-notificatie (bestaand notifyOnFailure-gedrag) en verschijnt er geen half artefact in de inbox.

# EERSTE TAAK (morgen startbaar)

Query op de prod-DB (Neon, read-only): hoeveel deliverables per workspace dragen een `settings.geoOptimizationAnalysis`, wat is de spreiding van `measuredAt`, en hoeveel zijn er vandaag al stale (>90d)? Output: één tabelletje in de task-file. Dit beslist (a) of de eerste watchdog-run op de pilot iets zinvols oplevert en (b) de default-drempels — en het kost een half uur.

---

# Red Team Review

> Onafhankelijke kritiek. Stel: een ervaren PM zou dit plan zien — wat zou ze zeggen?

## Zwakste schakel

De watchdog meet **onderhoudsachterstand, geen verval**. Jasper's decaying-content-usecase draait op Search-Console-data (echte impressie/klik-daling); Branddock heeft die data niet en doet alsof staleness + score-drift hetzelfde verhaal vertellen. Als users de rapporten openen en denken "ja, en? mijn pagina doet het prima", is de agent na twee runs genegeerde inbox-ruis — en genegeerde agents besmetten het vertrouwen in de hele catalogus.

## Pleidooi tegen dit plan

Dit is een feature voor content die in volume bestaat, gebouwd in een fase waarin misschien een handvol pagina's via Branddock live staat. De pilot heeft mogelijk te weinig voer om de loop ook maar één zinvolle run te geven, en elk uur hieraan is een uur niet aan het kritieke launch-pad. Bovendien herhaalt het de fout die Fase 2 expliciet vermeed: bouwen vóór adoptie-bewijs — agents-scheduling was "gated op pilot-adoptie" en die gate is voor deze uitbreiding stilzwijgend losgelaten omdat de markt beweegt.

## Wat zouden we leren door NIET te bouwen

Uitstel van 4-6 weken zou leren: (1) of pilot-users het bestáánde GEO-paneel met stale-vlag überhaupt openen (als push nodig is omdat pull faalt, is dat juist het bewijs vóór de watchdog); (2) hoeveel gepubliceerde pagina's er werkelijk komen na launch; (3) of een goedkoper experiment — een wekelijkse notificatie "3 pagina's zijn 90+ dagen niet herzien" zonder agent-run — al 80% van de waarde levert. Daar staat tegenover: het launch-marketing-argument (agent-catalogus met een scheduled bewaker + kwaliteitsbewijs) vervalt bij uitstel, en dat is expliciet de reden dat de user JA zei.

## Verdict van de planner

**ready-to-build**

Reden: de user heeft op basis van het marktadvies al gecommitteerd (discovery scherpt aan, heronderhandelt niet), de infra-timing is uitzonderlijk goed (scheduling live per 2026-07-14, her-scoring is deterministisch dus bijna gratis), en de MVP is dun omdat vrijwel alles bestaat: meet-haak, staleness-primitief, artifacts-contract, confirm-pad, herschrijf-pipeline, notificaties. Voorwaarden aan dit verdict: (1) de Eerste Taak (datacheck) draait vóór de bouw en mag drempels/cadence bijstellen; (2) de framing blijft "onderhoudswachter", geen traffic-claims — de eerlijke versie van de marktbelofte is verdedigbaar, de opgeblazen versie niet.

# 5-Punts Stop-Conditie (afgevinkt door feature-planner)

- [x] Probleem in 1 zin formuleerbaar
- [x] Eén primaire success-metric (niet 5)
- [x] Out-of-Scope-lijst langer dan In-Scope-lijst (10 vs 4)
- [x] MVP-acceptance-criteria concreet (Given/When/Then)
- [x] Eerste taak morgen startbaar (read-only prod-query, ~30 min)

# Volgende stap

Klaar voor technical-planner — met drie expliciete checkpunten voor die sessie: (1) het exacte re-entry-punt om de bestaande long-form-pipeline op een bestáánd deliverable te herstarten (herschrijf-modus vs verse generatie — niet aannemen dat dit al bestaat); (2) hoe de deterministische her-scoring aan de actuele gepubliceerde variant-content komt (render-pad vs opgeslagen variant); (3) het ontbrekende marktrapport `agents-marktonderzoek-en-uitbreidingsadvies-2026-07-14.md` committen zodat de evidence-keten navolgbaar is.
