---
id: campaign-brief-cowork-parity
title: Campagne-brief-output op Cowork-pariteit (10-secties Linfi-stijl)
status: pending-tech
created: 2026-05-07
validated: 2026-05-07
verdict: ready-to-build (Fase A scope only)
scope: Fase A — output-mapper-laag (1-2 dagen). Fase B (data-laag uitbreidingen) gemarkeerd als follow-up via aparte feature-discoveries.
blocked-by: studio-content-generation-real-ai (P0, 1 week, open) — Fase A render-laag heeft werkende AI-content nodig
---

# Probleemstelling (1 zin)

De huidige Branddock campagne-wizard produceert kwalitatief magere campagne-briefs die een brand strategist niet zonder substantiële edits naar een klant kan sturen — referentie-output van Anthropic's Claude Cowork community-skill scoort 7,5/10, Branddock-output blijft daar substantieel onder.

# Scope

**Generieke platform-functionaliteit voor elke workspace.** De Linfi-referentie in dit document en in `idea-campaign-brief-cowork-parity-validation.md` dient uitsluitend als (1) kwaliteits-benchmark (Cowork-output op 7,5/10) en (2) JTBD-validatie (echte klantopdracht waar founder de pijn ervoer). Geen Linfi-specifieke logica, fields, of paths in de implementatie.

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

## In-Scope (Fase A MVP — output-mapper, 1-2 dagen)

A3-validatie 2026-05-07 toonde bimodale gap-verdeling: 6 secties met 5-50% gap (format-zone, output-mapper volstaat) en 4 secties met 70-95% gap (data-zone, vereist nieuwe modellen). Fase A pakt de eerste cluster.

- **Markdown/HTML render-laag** voor wizard-output naar Linfi-stijl 10-secties brief, voor de 6 dekkende secties:
  - Sectie 1 — Campagne overzicht (uit `Campaign` + `BusinessStrategy` + `StrategyFoundation.coreMessage`)
  - Sectie 2 — Doelgroep narratief (uit `Persona.{frustrations, motivations, preferredChannels, buyingTriggers, decisionCriteria}` + `StrategyFoundation.audienceInsights`)
  - Sectie 3 — Kernboodschappen (uit `Campaign.masterMessage` + `MediumEnrichment.phaseGuidance` voor tone-per-kanaal)
  - Sectie 4 — Kanaalstrategie (uit `ChannelPlanLayer.channels[]` + `timingStrategy` + `phaseDurations[]`)
  - Sectie 6 — Benodigde assets (uit `AssetPlanLayer.deliverables[]` + `prepDeliverables[]`) — **prominent renderen met per-asset-brief uit `deliverable.brief` als USP**
  - Sectie 10 — Volgende stappen (uit `prepDeliverables[]`)
- **Sectie 5 — Week-thema-render-prompt** (toegevoegd 2026-05-07 na B1 dissolved): on-render AI-call genereert per-week-thema's uit campaign-strategy + persona + asset-distributie + funnel-positie. **Geen persistentie**, geen `WeeklyTheme` model. Statisch-contextueel (gebaseerd op reeds-aanwezige workspace-data, geen externe API). Zie `tasks/_drafts/idea-campaign-weekly-calendar.md` voor rationale.
- Voor de 3 resterende ontbrekende secties (7/8/9): expliciete "Niet beschikbaar — vereist <modulenaam>" placeholder met link naar follow-up tasks
- Markdown-as-output (geen PDF/Notion-styling in Fase A)
- "Klaar voor klant"-knop + post-export survey voor primary-metric tracking

## Out-of-Scope (expliciet NIET in Fase A — follow-up features)

**Fase B follow-up features** (aparte feature-discoveries via `feature-planner`, na launch):
- **B1 — `campaign-weekly-calendar`** (sectie 5, 70% gap): nieuw `WeeklyTheme`/`WeeklyContentCalendar` model, raakt Brandclaw Strategy-Analyst-input → ADR vereist
- **B2 — `campaign-kpi-structure`** (sectie 7, 75% gap): typed KPI-schema + KPI-prompt-fase, directe input voor Brandclaw Measurement-node → ADR vereist
- **B3 — `campaign-budget-table`** (sectie 8, 90% gap): nieuw `CampaignBudget` model met line-items, mogelijk Brandclaw Optimization-node-input → ADR aanbevolen
- **B4 — `campaign-risk-assessment`** (sectie 9, 95% gap): nieuw `CampaignRisk` model + risk-assessment-prompt, beperkte loop-impact → cross-link in `gotchas.md`

**Echt out-of-scope (geen follow-up)**:
- Multi-language briefs (NL only)
- PDF-export met merk-styling
- Notion / Google Doc / Word-export
- Webinar-planning, podcast-pitches, gastartikel-ideeën
- Pinterest-board strategie
- Auto-publish naar social platforms
- Live benchmark-research APIs
- Multi-tenant agency-templating
- Brief-versioning/diff-history (gebruikt later `ContentVersion`)

> Fase A In-Scope: 6 items. Out-of-Scope (incl. B-follow-ups): 13 items. ✓

# AANNAMES

- **A1 — Pilot-klanten gebruiken Branddock voor campagne-planning** — bewijs: founder N=1 dogfooding. Onbewezen voor externe pilots: nog niet gevalideerd, acceptabel pre-launch maar kwetsbaar voor adoption-bias.
- **A2 — Format > input-kwaliteit (voor Fase A)** — bewijs: A3-validatie 2026-05-07 toonde 6 van 10 secties met 5-50% gap, oorzaak `format` of `format+data` partial. Voor Fase A scope: **bevestigd**. Voor 4 zware secties: input-kwaliteit *is* de bottleneck → niet in Fase A.
- **A3 — Wizard-data is rijk genoeg om Cowork-pariteit te halen** — A3-validatie code-archeologie 2026-05-07: **gedeeltelijk bevestigd**. Voor 6 secties: ja (Fase A scope). Voor 4 secties: nee (Fase B-follow-ups). Zie `idea-campaign-brief-cowork-parity-validation.md`.
- **A4 — Brandclaw-loop architectuur blijft intact bij output-laag-only redesign** — voor Fase A: **bevestigd** (alleen render-laag, geen schema-wijziging). Voor Fase B1/B2/B3: **niet** intact, ADR vereist per follow-up.

> Aannames voor Fase A gevalideerd. Aannames voor Fase B per follow-up te valideren in eigen feature-discovery.

# ACCEPTATIECRITERIA (Fase A MVP)

- [ ] Given een afgeronde campaign-wizard (alle 9 fasen tot en met `elaborate`), When user klikt "Genereer campagne-brief", Then verschijnt een markdown-document met 10 secties in Linfi-stijl-volgorde
- [ ] Given de gegenereerde brief, When user inspecteert sectie 5 (kalender), Then ziet user week-thema's afgeleid uit campaign-strategy + persona + asset-distributie (1 thema per week, on-render gegenereerd, geen persistentie)
- [ ] Given de gegenereerde brief, When user inspecteert sectie 7 (metrics), 8 (budget), 9 (risico's), Then ziet user expliciete "Niet beschikbaar — vereist <follow-up-feature-id>"-placeholder met link, **niet** een hallucinatie of lege sectie
- [ ] Given de gegenereerde brief, When user inspecteert sectie 6 (assets), Then ziet user per asset een mini-brief met objective + keyMessage + toneDirection + CTA + contentOutline (Branddock-USP vs. Cowork)
- [ ] Given de gegenereerde brief, When user klikt "Klaar voor klant", Then wordt een telemetrie-event gelogd voor primary-metric tracking (% briefs naar klant)
- [ ] Given de wizard-data heeft missing fields (bv. geen masterMessage), When de brief gegenereerd wordt, Then toont de relevante sectie een gerichte "ontbrekende data"-melding ipv. blanco
- [ ] Counter-metric: render-tijd brief ≤ 5 seconden (geen AI-call in Fase A — pure mapping + template)
- [ ] `npx tsc --noEmit` 0 errors, geen `any` types, lint groen

# EERSTE TAAK (na studio-content-generation-real-ai live)

**Run `technical-planner` subagent voor Fase A** — input: dit bestand + `idea-campaign-brief-cowork-parity-validation.md`. Output: `tasks/campaign-brief-output-mapper.md` met file-set, fase-A-acceptatiecriteria gespiegeld, eerste sub-task, smoke-test plan.

Verwachte file-set (indicatief, technical-planner bepaalt definitief):
- `src/lib/campaigns/brief-renderer.ts` (nieuw) — markdown-template-engine voor 10-secties output
- `src/lib/campaigns/brief-data-mapper.ts` (nieuw) — wizard-state → renderer-input transformatie
- `src/app/api/campaigns/[id]/brief/render/route.ts` (nieuw) — GET endpoint voor brief-output
- `src/components/campaigns/.../BriefRenderView.tsx` (nieuw) — UI met "klaar voor klant"-knop + telemetrie
- `prisma/schema.prisma` — geen wijzigingen (Fase A is render-only)
- A3-validatie-bestand toevoegen aan `docs/specs/` of `docs/playbooks/` als referentie

Geblokkeerd tot: `studio-content-generation-real-ai` task gemarkeerd als done in `tasks/done/`.

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
- [x] Out-of-Scope-lijst langer dan In-Scope-lijst (13 vs. 6)
- [x] MVP-acceptance-criteria concreet (Given/When/Then)
- [x] Eerste taak morgen startbaar (technical-planner, geblokkeerd tot studio-P0 done)

**5/5 ✓ — `ready-to-build` voor Fase A scope**

# Volgende stap

**Wacht op `studio-content-generation-real-ai` (P0, 1 week, open).** Zodra die task done is: roep `technical-planner` subagent aan met dit bestand + `idea-campaign-brief-cowork-parity-validation.md` als input om naar `tasks/campaign-brief-output-mapper.md` te promoten.

**Parallel pad** (geen blocker): kan voor de B-follow-ups (B1 weekly-calendar, B2 kpi-structure, B3 budget-table, B4 risk-assessment) los van Fase A nieuwe `feature-planner` discoveries openen — elk met expliciete Brandclaw-loop-impact-vraag in Ronde 3. Niet allemaal tegelijk; één per keer als capaciteit het toelaat.
