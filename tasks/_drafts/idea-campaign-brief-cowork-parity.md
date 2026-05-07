---
id: campaign-brief-cowork-parity
title: Campagne-brief-output op Cowork-pariteit (10-secties Linfi-stijl)
status: pending-validation
created: 2026-05-07
verdict: needs-validation-first
---

# Probleemstelling (1 zin)

De huidige Branddock campagne-wizard produceert kwalitatief magere campagne-briefs die een brand strategist niet zonder substantiële edits naar een klant kan sturen — referentie-output van Anthropic's Claude Cowork community-skill scoort 7,5/10, Branddock-output blijft daar substantieel onder.

# WHO — Doelgebruiker

**Rol**: brand strategist (intern of agency-zijde) die actief nieuwe campagnes plant voor klanten en de output direct als client-presenteerbaar artefact wil gebruiken.

**Schaal**: N=1 actief gevalideerd (founder dogfooding, gebruikte Cowork-skill recent voor Linfi-klantopdracht). Externe pilots (Better Brands) nog niet gestart, dus pilot-vraag onbewezen.

**Acuut segment**: founder/dogfooder zelf. Pas relevant voor pilot-klanten als zij Branddock voor eigen campagne-planning gaan inzetten — dat is de kernaanname van pre-launch.

## JTBD-narratief

> "Toen ik recent voor Linfi (architectenmerk) een 7-weekse organic social campagne moest plannen, wilde ik een complete client-presenteerbare brief produceren met doelen, doelgroep-pijnpunten, kernboodschappen, kanaal-toelichting, week-thematisering, budget en risico's. Branddock's campagne-wizard leverde te magere output, dus viel ik terug op Anthropic's Claude Cowork community-skill buiten Branddock — kreeg een 7,5/10 brief, maar zonder gebruik van de rijke Branddock brand-context."

## Evidence

- **Founder dogfooding 2026-05** — Linfi-campagneplan geschreven via Cowork buiten Branddock (deze sessie als bron)
- **`roadmap.md` NOW-row 5** — content-items doorontwikkeling staat al gepland; brief-output-gap valt logisch onder die paraplu
- **`gotchas.md` 2026-04-15** — `createPhaseSSE` stuck-state issues bevestigen dat wizard-flow nog instabiel is (architecturaal verwarrend om bovenop te bouwen)
- **Geen externe pilot-vraag** — geen Better Brands of andere prospect die hier expliciet om gevraagd heeft

# WHAT — Probleem (niet oplossing)

De Branddock campagne-wizard-output mist (vergeleken met de Cowork Linfi-brief): samenvatting, primaire/secundaire SMART-doelen, gestructureerde doelgroep-opbouw (rol → pijnpunten → motivaties → vindplaatsen → buying stage), kanaal-toelichting met effort-percentages, week-thematisering met productie-cadans, gemeten succes-metrics, budget-allocatie, risico-matrix met mitigatie en concrete next-steps. De gegenereerde inhoud is bovendien onzeker over realisme van pricing/effort.

Gevolg: brand strategists kunnen de output niet zonder substantiële handmatige edits doorzetten naar klanten, wat de tijdwinst van Branddock voor campagne-planning grotendeels uitvlakt.

# WHY-NOW

Geen scherpe externe deadline-trigger. Drijfveer is **founder dogfooding-pijn nu** — de bouwer ervaart dit gat actief tijdens eigen klant-werk. Dat is een geldig pre-launch signaal mits we erkennen dat het N=1 is.

Triggers:
- Founder gebruikte deze week Cowork buiten Branddock voor echte klantopdracht — concreet bewijs dat gat reëel is voor minstens deze gebruiker
- Pre-launch fase = product-readiness van content-flow; zwakke campagne-output blokkeert pilot-livegangen
- Cowork-skill bestaat publiek, dus pilot-klanten kunnen nu al "om Branddock heen werken" → competitive-pressure binnen Anthropic-ecosysteem

Niet-trigger:
- Geen pilot-klant heeft hier expliciet om gevraagd
- Geen launch-datum die hierdoor in gevaar komt
- Geen revenue-impact aantoonbaar pre-launch

# SUCCESS METRICS

**Primaire metric** (één): % campagne-briefs dat een gebruiker zonder edits direct doorzet naar klant — stijgt met **minimaal 30 procentpunt** binnen 60 dagen na livegang van de feature.

> Baseline meting vereist: huidige Branddock-wizard scoort vermoedelijk 0-10% (geen klant-presenteerbaar). Doel: 30-40%. Meting via expliciete UI-knop "Brief is af → naar klant" + post-export survey.

**Counter-metric** (mag NIET kapotgaan): tijd-tot-eerste-brief vanaf wizard-start. Een rijkere brief mag de gebruiker niet structureel langer kosten dan de huidige magere brief — als generatie-tijd > 2× huidig, verlies van adoptie.

# CONSTRAINTS

## Hard
- **Tijd**: pre-launch fase, dit conflicteert met `studio-content-generation-real-ai` (1 week, P0) die nog open staat. Brief-output-redesign na P0 dependency, niet vóór
- **Tech**: campagne-wizard hangt aan `BusinessStrategy` + `CampaignStrategy` Prisma modellen — wijzigingen daar raken Brandclaw-loop architectuur (Strategy Analyst node post-launch maand 3)
- **Data**: aanname A3 (wizard-data is rijk genoeg om Cowork-pariteit te halen) onbewezen — eerst valideren

## Soft
- Solo-dev capaciteit: pre-launch fase met 5 andere NOW-tasks open
- Founder-bias: N=1 dogfooder is sterk gemotiveerd, pilot-klant kan andere prio hebben

## Must NOT do
- Wizard-redesign starten vóór A3-validatie (risico: maanden bouwen, blijkt input-laag het echte probleem)
- Data-modellen op `BusinessStrategy` / `CampaignStrategy` uitbreiden zonder ADR — raakt Brandclaw-loop
- Live-research APIs (LinkedIn-benchmarks etc.) introduceren in MVP — kosten + complexity
- Cowork-skill rebuild — als 80% via output-mapper kan, niet de hele AI-pipeline opnieuw

# SCOPE

> NB: definitieve scope wacht op A3-validatie. Onderstaande is **indicatief richtinggevend**, te bevestigen na validatie.

## In-Scope (MVP — indicatief, pending A3)

Te bepalen na A3-validatie. Drie scenario's:

- **Scenario 1 (gap < 40%)**: alleen output-mapper-laag — bestaande wizard-data → Linfi-stijl markdown export. ~1-2 dagen.
- **Scenario 2 (gap 40-70%)**: Strategy-step herstructureren + brief-output-mapper + brand-voice-injectie in brief-prompts. ~1 week.
- **Scenario 3 (gap > 70%)**: data-laag uitbreiden eerst (extra velden, betere persona-pijnpunten) dan pas redesign — feature parkeert tot data-laag fix.

## Out-of-Scope (expliciet NIET, ook al verleidelijk)

- Multi-language briefs (NL only in MVP)
- PDF-export met merk-styling (markdown/HTML voldoende)
- Notion / Google Doc / Word-export
- Webinar-planning, podcast-pitches, gastartikel-ideeën (Linfi-brief had die, MVP niet)
- Pinterest-board strategie
- Auto-publish naar social platforms
- Auto-budget berekening op workspace-data (user vult zelf in)
- Auto-risico-detectie via workspace-scanning (AI mag suggesteren, geen scanning)
- Live benchmark-research APIs (statische defaults)
- Multi-tenant agency-templating (1 brief per workspace per campagne)
- Brief-versioning/diff-history (gebruikt later `ContentVersion` als die klaar is)
- Per-week content-kalender met deadline-koppeling aan `ContentBrief` module

> Out-of-Scope (12) > In-Scope (TBD, max 4-5) ✓

# AANNAMES

- **A1 — Pilot-klanten gebruiken Branddock voor campagne-planning** — bewijs: founder N=1 dogfooding. Onbewezen voor externe pilots? **Ja** — niet gevalideerd, acceptabel pre-launch maar kwetsbaar voor adoption-bias.
- **A2 — Format > input-kwaliteit** — bewijs: gevoel uit Cowork-vergelijking. **Onbewezen.** A3-validatie test dit indirect: als wizard genoeg ruwe data heeft, is format de bottleneck; zo niet, dan input-kwaliteit.
- **A3 — Wizard-data is rijk genoeg om Cowork-pariteit te halen** — bewijs: ontbreekt. **Onbewezen** — erkend door founder. Cheapest experiment: 2 uur, geen code (zie EERSTE TAAK).
- **A4 — Brandclaw-loop architectuur blijft intact bij output-laag-only redesign** — bewijs: alleen waar als optie (a) gekozen wordt (output-mapper), niet (b) (data-modellen wijzigen). Sturing tijdens technical-planner.

> Onbewezen aannames vereisen validatie VOOR build, niet erna. A3 is blokker voor promotie naar `tasks/<id>.md`.

# ACCEPTATIECRITERIA (MVP)

> Geblokkeerd door A3-validatie. Worden Given/When/Then na validatie geformuleerd.

Indicatief, te concretiseren post-validatie:
- [ ] TBD pending A3 — afhankelijk van scenario 1/2/3
- [ ] Given een ingevulde campagne-strategy, When user klikt "Genereer brief", Then verschijnt 10-secties markdown analoog aan Cowork-output ≥ 7/10 quality
- [ ] Given gegenereerde brief, When user past 0 edits toe, Then "klaar voor klant"-knop is direct beschikbaar
- [ ] Counter-metric: brief-generatie-tijd ≤ 2× huidige wizard-tijd

# EERSTE TAAK (morgen startbaar)

**A3-validatie — 2 uur, geen code, geen subagent.**

Stappen:
1. Maak fictieve Linfi-achtige test-workspace in Branddock met realistische brand-data (assets, voice, personas, products)
2. Doorloop volledige campagne-wizard (Brief → Strategy → Concept → Canvas) voor "Lead generation onder NL architecten, 7 weken, organic social"
3. Map de wizard-output tegen de 10-secties Linfi-brief (overzicht, doelgroep, kernboodschappen, kanalen, kalender, assets, KPI's, budget, risico's, next-steps)
4. Per sectie: bereken gap-percentage (% velden leeg / hardgecodeerde fallback / hallucination-prone)
5. Conclusie naar `tasks/_drafts/idea-campaign-brief-cowork-parity-validation-results.md`:
   - Gap < 40% → promote naar `tasks/<id>.md` met scenario 1 (output-mapper, 1-2 dagen)
   - Gap 40-70% → promote met scenario 2 (Strategy-redesign, 1 week)
   - Gap > 70% → parkeer feature, eerst data-laag fix in aparte task

Geen tools nodig buiten Branddock UI + handmatig markdown-mapping. Output is gat-rapport, geen code.

---

# Red Team Review

> Onafhankelijke kritiek. Stel: een ervaren PM zou dit plan zien — wat zou ze zeggen?

## Zwakste schakel

**Aanname A3 (wizard-data is rijk genoeg) is volledig onbewezen.** Als A3-validatie laat zien dat de gap > 70% komt door ontbrekende ruwe data (geen pijnpunten in personas, geen budget-context in `CampaignStrategy`, geen risico-velden ergens), dan lost geen enkele output-redesign het probleem op — dan moet de data-laag eerst uitgebreid, wat een fundamenteel ander en groter project is met directe Brandclaw-loop impact.

## Pleidooi tegen dit plan

Drie argumenten waarom dit niet gebouwd zou moeten worden:

1. **N=1 founder-bias**. De enige gebruiker die dit aantoonbaar nodig heeft is de bouwer zelf. Pre-launch fase met 0 betalende klanten is risicovol voor "ik los mijn eigen workflow op" features — die schalen vaak slecht naar pilot-vraag.
2. **Brandclaw-conflict latent**. De wizard wordt straks input voor de autonome marketing-loop. Een uitgebreide brief-output (met budget, risico-matrix, week-kalender) is mogelijk niet wat een Strategy Analyst node nodig heeft — die wil gestructureerde data, niet markdown-prose. Twee inkompatibele output-doelen op één wizard kan kostbaar worden te ontwarren.
3. **Cowork bestaat al**. Een geldig alternatief: Branddock exporteert brand-context als JSON-payload, gebruiker plakt die in Cowork.skill, krijgt brief. Geen code, kost niets. Lost 80% van het probleem op zonder build-investering. Dat dit niet eens als optie 0 is overwogen, is een rode vlag.

## Wat zouden we leren door NIET te bouwen

- A3-validatie alleen al levert een gap-rapport op dat *los van deze feature* waardevol is voor het hele content-flow product-readiness werk.
- Een Cowork-via-export-payload prototype (1 dag werk) test of klanten de Branddock-context-rijkdom überhaupt waarderen, vóór we eigen wizard-output bouwen.
- Pilot-klant-feedback over magere campagne-output kan andere prio's blootleggen — bv. dat `studio-content-generation-real-ai` (P0, nog open) wel het echte probleem is en niet de brief-format.

## Verdict van de planner

**`needs-validation-first`**

Reden: probleem helder, primaire metric concreet, JTBD echt — maar A3-aanname onbewezen en MVP-scope hangt volledig af van A3-uitkomst. Geen waardevolle technical-planner sessie mogelijk vóór gap-rapport bestaat. Gelukkig is validatie cheap (2 uur, geen code), dus geen permanent parkeer-besluit — alleen een korte tussenstap.

Aanvullend: tweede risico (Brandclaw-conflict) verdient ADR-overweging zodra scenario gekozen wordt — daar is technical-planner het juiste forum voor, mits A3-validatie groen licht geeft.

# 5-Punts Stop-Conditie (afgevinkt door feature-planner)

- [x] Probleem in 1 zin formuleerbaar
- [x] Eén primaire success-metric (niet 5)
- [x] Out-of-Scope-lijst langer dan In-Scope-lijst (12 vs. TBD ≤ 5)
- [ ] MVP-acceptance-criteria concreet (Given/When/Then) — **geblokkeerd door A3**
- [x] Eerste taak morgen startbaar (A3-validatie, 2 uur)

# Volgende stap

**Wacht op A3-validatie.** Zodra `tasks/_drafts/idea-campaign-brief-cowork-parity-validation-results.md` bestaat met gap-rapport: roep `technical-planner` subagent aan met dit bestand + validation-results als input. Bij gap < 40% promotie naar `tasks/<id>.md` direct. Bij gap > 70% parkeer en open separate data-laag task.
