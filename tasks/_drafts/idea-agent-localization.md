---
id: agent-localization
title: Localization/Transcreation-agent — bestaande content on-brand naar andere markten, propose-only op de multi-markt-pipeline
status: pending-tech (GATED — niet promoten vóór de dependency-gate hieronder)
created: 2026-07-14
verdict: needs-validation-first
gated-on: tasks/multi-market-transcreation-enterprise.md (status blocked, go/no-go) — deze agent is een dunne consumptielaag óp die pipeline, nooit een vervanging ervan
related-adr: docs/adr/2026-06-28-multilingual-i18n-and-multi-market-content.md (Approach C: Brand + BrandLocaleProfile) · docs/adr/2026-07-05-agents-architectuur.md (propose-only, één motor, pluggable output-contract)
related-research: briefing uit agents-marktonderzoek 2026-07-14 (tweede ring #6, user-JA) — ⚠️ het rapport `docs/reports/agents-marktonderzoek-en-uitbreidingsadvies-2026-07-14.md` staat NIET op disk in de repo; evidence-link herstellen vóór technical-planning
---

# Probleemstelling (1 zin)

Een merk dat in meerdere markten communiceert moet elk goedgekeurd stuk content handmatig per markt laten hervertalen (of buiten Branddock naar DeepL/ChatGPT stappen, dat het merk-DNA, het per-markt-register en de kwaliteitsvalidatie niet kent) — er is geen opdracht-gerichte manier om "zet deze campagne on-brand om naar markt X" te zeggen en het resultaat per variant te beoordelen.

# Wat er al ligt (anti-dubbel-inventaris — VERPLICHT leeswerk voor technical-planner)

Deze agent bouwt op het meertaligheids-initiatief (ADR 2026-06-28). De scheidslijn agent ↔ pipeline is de kern van dit draft:

| Laag | Status | Wat het levert | Bron |
|---|---|---|---|
| Content-locale-foundation (Fase 2) | ✅ done (PR #73) | `Brand` + `BrandLocaleProfile` (delta-overlays: `voiceOverrides`, `localizedAssets`, per-locale centroid-slot), `Deliverable.localeProfileId`, `getBrandContext(ws, localeProfileId?)` met locale-aware cache-key | `tasks/done/content-locale-foundation.md` |
| Target-picker (Fase 3) | ✅ done (PR #74) | per-generatie target-locale in de Canvas, find-or-create profielen, analyze-`Accept-Language`-lek gedicht | `tasks/done/content-locale-target-picker.md` |
| **Transcreatie-pipeline (Fase 4+5)** | ⛔ **blocked epic, go/no-go** | transcreatie-engine, job-queue, per-locale F-VAL-threading, `MarketClaim`-compliance, markt × deliverable **matrix-UI met per-markt fidelity + approval**, hreflang, markt-RBAC, org-billing | `tasks/multi-market-transcreation-enterprise.md` |
| Agents-platform Fase 1+2 | ✅ live op prod | propose-only runs + confirm-keten, `AgentSchedule` (cadence), per-agent `AgentMemory`, run-notificaties, credit-metering, F-VAL op REPORTs | memory `agents-initiative`, changelog #359-#391 |

**Consequentie**: de agent levert géén engine, géén queue, géén F-VAL-threading en géén compliance — dat is allemaal epic-werk. De agent is de **taakgerichte ingang + push-laag** erop.

**F-VAL-per-taal-beperking (antwoord op de discovery-vraag, drieledig)**:
1. Heuristiek-packs bestaan voor 4 locales (nl-NL/nl-BE/en-GB/de-DE); fr/es/pt/it scoren vandaag **stil tegen en-GB** (ADR-regel: markt-activatie gated op pack, nooit stille fallback).
2. **Deferred P3** (uit Fase 3, changelog §post-launch): F-VAL scoort nu tegen de workspace-**default**-pack, niet de target-pack — de target-locale-threading door `computeFidelityScore`/`getHeuristicsForLocale` is epic-werk. Zonder die threading is elke "per-markt F-VAL-score" van deze agent een **onwaarheid**.
3. Pijler-1 (centroid) per locale vereist een per-locale schrijf-sample-corpus; `voiceOverrides`-deltas leveren dat niet → `centroidEmbedding` blijft `null` → globale-centroid-fallback = structureel zwakkere per-markt-fidelity, die eerlijk gelabeld moet worden in de agent-output.

# WHO — Doelgebruiker

**Rol**: (1) marketing-verantwoordelijke bij een merk dat in ≥2 taal-markten publiceert; (2) agency-medewerker die voor een internationale klant NL-goedgekeurde content naar DE/EN moet omzetten.
**Schaal**: **vandaag nul aantoonbaar.** De 4 pilot-workspaces (Better Brands, Linfi, Nobox, WRA Juristen) zijn NL-georiënteerd; geen enkel pilot-signaal vraagt om multi-markt. De user-keuze "volledige multi-markt nu" (2026-06-28) is een founder-/positioneringskeuze, geen klantvraag.
**Acuut segment**: hypothetisch het agency-segment (één klant met Benelux+DACH-aanwezigheid maakt de hele keten relevant) — te valideren, zie EERSTE TAAK.

## JTBD-narratief

> "Toen een marketeer een goedgekeurde NL-campagne ook in de Duitse markt wilde draaien, wilde hij die campagne in het juiste Duitse register (Sie, andere claims, lokale idioom) uitzetten zonder alles opnieuw te maken, maar hij moest elk deliverable los kopiëren naar DeepL/ChatGPT, handmatig het voice-register bewaken, en had geen enkele check of het resultaat nog on-brand was — dus deed hij het half, te laat, of niet."

**Eerlijkheidsclausule**: dit narratief is geconstrueerd uit markt-logica (Jasper's Localization Agent bestaat omdat dit probleem bij enterprises reëel is), niet uit een Branddock-klantcitaat. Er is geen pilot-ticket, geen support-vraag, geen observatie uit eigen gebruik. Dit is de zwakste JTBD-basis van alle agent-drafts tot nu toe — en dat hoort het verdict te drukken.

## Evidence

- Briefing agents-marktonderzoek 2026-07-14 (tweede ring #6, user-JA): **Jasper Localization Agent** ondersteunt 27 talen met glossary-enforcement; duidelijk enterprise-koopmotief. ⚠️ Rapport-bestand staat niet op disk — link herstellen.
- `docs/adr/2026-06-28-multilingual-i18n-and-multi-market-content.md` — de multinationale eis is al een geaccepteerde ADR; deze agent voegt geen nieuwe architectuurclaim toe, alleen een surface.
- `docs/reports/agents-diepte-analyse-en-plan-2026-07-05.md` §4(d) — Branddocks white space: gestructureerd merk-DNA + output-validatie combineert niemand; transcreatie is precies het use-case waar die combinatie het verschil maakt t.o.v. een kale vertaal-LLM (register + claims + F-VAL per markt).
- Agents-dogfood (memory `agents-initiative`): propose-only + confirm + scheduling + credit-metering zijn praktijk-bewezen — de agent-bouwstenen zijn de-risked.
- **Anti-evidence (eerlijk)**: nul klantvraag in de pilot-cohort; het multi-markt-epic zelf staat op `blocked` met een bewuste go/no-go; Jasper verkoopt aan enterprise-marketingteams die Branddock pre-launch niet in de pipeline heeft.

# WHAT — Probleem (niet oplossing)

Zodra de multi-markt-pipeline (Fase 4+5) bestaat, is het bedieningsmodel pull-gebaseerd: een matrix-UI waarin de gebruiker per deliverable per markt zelf transcreaties initieert en beoordeelt. Waarneembaar gat dat overblijft: (1) niemand "bewaakt" de markten — als de NL-bron wordt geüpdatet of nieuwe content zonder DE-variant live gaat, ziet niemand het tenzij hij de matrix opent; (2) een campagne van 20 deliverables naar 2 markten omzetten is in een matrix 40 losse handelingen; (3) de per-markt terminologie (do-not-translate-termen, verplichte vertalingen) leeft nergens gestructureerd voor content — het UI-glossary (`src/lib/ui-i18n/glossary.ts`) is per ADR-Beslissing-4 expliciet een ándere engine en mag niet hergebruikt worden.

# WHY-NOW

**Eerlijk antwoord: dit is niet "now" — en dat is bewust.** Timing = tweede ring, expliciet ná het multilingual-bouwwerk. De reden om het plan *vandaag* te schrijven is smaller en wél urgent:

Triggers:
- **Design-feedback het epic in, vóór het epic gebouwd wordt.** De les uit `agents-foundation` (aanname A1: orchestrator-output bleek hard-wired op observations → refactor-werk) mag zich niet herhalen: als de transcreatie-engine UI-first wordt gebouwd, is de agent later een tweede refactor. Dit draft levert de epic-eisen: engine headless/agent-aanroepbaar, output PROPOSAL-compatibel, granulaire confirm. Dat kost nu één alinea in de epic-task, later een maand.
- **Koopframe**: Jasper positioneert Localization als benoemde agent — als Branddock ooit multi-markt verkoopt, verwacht de prospect deze agent in de catalogus. Plan-klaar hebben ≠ bouwen.
- **Niet-trigger (eerlijk)**: er is geen klant, geen omzet-effect, geen deadline. Elke poging om dit draft te gebruiken als argument om het blocked epic te un-gaten is scope-misbruik — het epic heeft zijn eigen go/no-go op eigen merites.

# SUCCESS METRICS

**Primaire metric** (één): **wekelijks geaccepteerde agent-getranscreëerde varianten per multi-markt-workspace** — binnen 30 dagen na agent-GA accepteert (confirm) de eerste workspace met ≥2 actieve `BrandLocaleProfile`s wekelijks ≥5 varianten die via de agent zijn voorgesteld. Meting: `AgentRun` + confirm-events + `Deliverable.localeProfileId`-rijen met `derivedFromId`.

**Counter-metric** (mag NIET kapotgaan): **de kwaliteitsclaim** — geaccepteerde varianten scoren op de target-pack gemiddeld niet meer dan 5 F-VAL-punten onder hun bron-deliverable. Zakt dit erdoorheen, dan produceert de agent volume ten koste van de enige differentiator ("bewijsbaar on-brand") en moet hij terug naar de tekentafel, niet naar meer talen.

**Guardrail (secundair)**: kosten per geaccepteerde variant geïnstrumenteerd vanaf run 1 (credit-model bestaat al voor agents); batch-runs blijven binnen het job-queue-cost-budget van het epic.

# CONSTRAINTS

## Hard
- **Dependency-gate (drieledig, niet onderhandelbaar)**: dit draft mag pas naar technical-planner als (1) de go/no-go op `multi-market-transcreation-enterprise` positief is genomen én de minimale slice (transcreatie-engine + job-queue + **per-locale F-VAL-threading incl. deferred P3**) gebouwd is; (2) F-VAL-packs beschikbaar zijn voor elke aangeboden markt (MVP: nl-NL/nl-BE/en-GB/de-DE — dus **NL↔EN↔DE eerst**, fr/es/pt/it hard geweigerd tot hun pack bestaat, nooit stille en-GB-fallback); (3) er ≥1 echte workspace met aantoonbare multi-markt-behoefte is (pilot of betalend).
- **Eén motor, propose-only**: de agent is een config-laag in de bestaande code-registry op `runAgentLoop` + de epic-engine als tool; elke persist loopt via de bestaande confirm-keten. Geen autonomie, geen auto-publish.
- **Geen tweede engine**: de agent bevat geen eigen vertaal-promptstack; kwaliteit is een pipeline-eigenschap.
- **Eerlijke score-weergave**: zolang de per-locale centroid `null` is (geen sample-corpus), labelt de agent-output de Pijler-1-beperking expliciet — geen geïmpliceerde meetprecisie die er niet is.
- **Pricing**: conform agents-besluit — merkcontext/F-VAL nooit meteren; transcreatie-varianten volgen het bestaande credit-model per deliverable.

## Soft
- Persona-naam/gezicht volgt het bestaande design-patroon (Nova/Vera/Stella/Milo/Marco/Dana); werknaam "Localization Agent".
- Confirm-UX bij batch (20 deliverables × 1 markt = 20 beslissingen) heeft een samengevatte, granulaire accept-subset-flow nodig — ontwerp-aandachtspunt, geen nieuw mechanisme.

## Must NOT do
- Het epic un-gaten of versnellen "omdat de agent gepland is".
- UI-string-vertaling aanraken (andere engine, ADR Beslissing 4).
- Glossary in `AgentMemory` stoppen (zie Out-of-Scope #2 — het is merk-data).
- Talen aanbieden zonder F-VAL-pack.

# SCOPE

## In-Scope (MVP — pas na de gate)

1. **Eén Localization-agent** (7e agent) in de code-registry: systeem-prompt + tool-scoping over de epic-transcreatie-engine, `AiFeatureKey` via `resolveFeatureModel`.
2. **Use-case "transcreëer dit deliverable naar markt X"**: run → PROPOSAL met de variant + target-pack F-VAL-score + findings; confirm → persist via `derivedFromId` + `localeProfileId`.
3. **Use-case "transcreëer deze campagne naar markt X"** (batch): run via de epic-job-queue → één PROPOSAL met per-deliverable varianten en scores; **granulaire confirm** (subset accepteren, rest afwijzen/opnieuw).
4. **Conversationele bijsturing binnen de run**: "maak de DE-variant formeler" → hergenereer die variant binnen dezelfde propose-keten (geen nieuw mechanisme; bestaande agent-chat).
5. **Taal-scope nl/en/de** (pack-gated); elke andere taal wordt geweigerd met uitleg + verwijzing naar pack-roadmap.
6. **Kosten- en event-instrumentatie** per variant (bestaand credit-model + PostHog-events), run-notificaties via bestaande Fase-2-infra.

## Out-of-Scope (expliciet NIET, ook al verleidelijk)

1. **Markt-consistentie-watchdog** (scheduled: "bron geüpdatet maar DE-variant stale" / "nieuwe content zonder variant voor actieve markt") — sterkste unieke agent-waarde op termijn (push vs matrix-pull) en `AgentSchedule` bestaat al, maar het is fast-follow: eerst bewijzen dat iemand überhaupt varianten accepteert.
2. **Glossary/do-not-translate-beheer als agent-capaciteit** — principebesluit in dit draft: het content-glossary is **merk-data en hoort in `BrandLocaleProfile`** (bijv. binnen `localizedAssets`/een eigen veld — technical-planner-keuze in het epic), niet in `AgentMemory`. Agent-memory zou terminologie onzichtbaar, niet-cureerbaar en niet-afdwingbaar in de pipeline maken — Jaspers glossary-*enforcement* zit juist in brand-governance. De agent mag láter glossary-entries vóórstellen (propose-confirm), nooit bezitten.
3. **fr/es/pt/it** — gated op F-VAL-pack-bouw (honderden entries per pack, eigen werkstroom in het epic).
4. **Transcreatie van merk-DNA zelf** (persona's lokaliseren, voiceguide-register, positionering) — dat is `BrandLocaleProfile`-setup, epic-werk; de agent transcreëert alleen content.
5. **MarketClaim-/compliance-advies** — claim-enforcement is een pipeline-gate (epic); de agent geeft geen juridisch advies en presenteert een geblokkeerde claim als pipeline-uitkomst, niet als eigen oordeel.
6. **hreflang/SEO-emissie** — epic-werk (`/p/[slug]`).
7. **UI-string-vertaling** — andere engine (ADR Beslissing 4), verboden terrein.
8. **Auto-publish/autonomie-schuif** — propose-only, ook post-MVP alleen via de agents-brede autonomie-trap.
9. **Eigen transcreatie-engine of tweede promptstack** in de agent-config.
10. **TMS-integratie** (Crowdin/Lokalise/Smartling) — geen enkel plan-horizon.
11. **Vrije-vorm plak-en-vertaal-utility** ("vertaal deze tekst even") — generiek-LLM-territorium zonder deliverable-model, ondermijnt het bron→variant-lineage-model (`derivedFromId`).
12. **Beeld/video/audio-localisatie** — alleen tekst-deliverables.
13. **27-talen-pariteit met Jasper** — pack-gated groei is het model; pariteit is geen doel.

> Out-of-Scope (13) > In-Scope (6). De zwaarste verleidingen (watchdog, glossary-eigenaarschap, meer talen) staan er expliciet bij.

# AANNAMES

Aannames die WAAR moeten zijn voor deze feature te slagen:

- **A1 — De epic-engine is headless en agent-aanroepbaar.** Bewijs: geen — het epic is nog niet gebouwd. **Dit is de reden dat dit draft nú bestaat**: de eis moet vóór de epic-bouw in `tasks/multi-market-transcreation-enterprise.md` landen (zie EERSTE TAAK). Onbewezen? Ja, maar per constructie afdwingbaar.
- **A2 — Er bestaat tegen gate-tijd ≥1 workspace met echte multi-markt-behoefte.** Bewijs: **nul vandaag.** Dit is de kernaanname en hij is volledig onbewezen. Validatie: demand-probe bij de pilots (agency-klanten met DACH/EN-aanwezigheid?) — goedkoop, morgen te doen.
- **A3 — Per-markt F-VAL is tegen gate-tijd eerlijk genoeg** (P3-threading gedaan, packs voor de aangeboden markten, centroid-beperking acceptabel mits gelabeld). Bewijs: threading en packs zijn geplande epic-items; de centroid-beperking is structureel gedocumenteerd. Deels onbewezen — gate-checklist-item.
- **A4 — Granulaire batch-confirm veroorzaakt geen review-moeheid.** 20 deliverables × 1 markt = 20 beslissingen per run. Bewijs: geen; de bestaande confirm-flow is per-actie ontworpen. Validatie: dogfood met een echte campagne vóór pilot-exposure; mitigatie is een samenvattings-PROPOSAL met subset-accept (In-Scope #3).
- **A5 — Kosten per variant passen in het credit-model.** Bewijs: agent-runs kosten ~$0,09-0,19 (dogfood), maar transcreatie+F-VAL×N is een ander profiel; het epic rekent zelf al met 240-run-scenario's. Onbewezen op batch-schaal — instrumentatie vanaf run 1.
- **A6 — De agent voegt genoeg toe bóven de epic-matrix-UI.** De matrix doet al per-markt initiate+approve (pull). De agent-meerwaarde = batch-in-één-opdracht + conversationele bijsturing + (fast-follow) de watchdog-push. Bewijs: geen — als de matrix-UI in de praktijk volstaat, is deze agent catalogus-decoratie. Validatie: pas ná epic-dogfood te zien; expliciet her-toetsen bij de gate.

> Zwaarste onbewezen aannames: **A2 (niemand heeft erom gevraagd)** en **A6 (meerwaarde boven de matrix)**. Beide zijn vóór de bouw valideerbaar zonder één regel code.

# ACCEPTATIECRITERIA (MVP)

- [ ] Given een workspace met ≥2 actieve `BrandLocaleProfile`s met beschikbare F-VAL-packs, When de user de agent vraagt een goedgekeurd deliverable naar markt X te transcreëren, Then produceert de run één PROPOSAL met de variant, een F-VAL-score **gescoord tegen de target-pack** (aantoonbaar ≠ default-pack) en findings — en is er niets gepersisteerd vóór confirm.
- [ ] Given diezelfde workspace, When de user een campagne (N deliverables) naar markt X laat transcreëren, Then draait de run via de job-queue binnen het cost-budget en levert één PROPOSAL met per-deliverable varianten + scores, waaruit de user een subset kan accepteren; alleen geaccepteerde varianten persisteren via `derivedFromId` + `localeProfileId`.
- [ ] Given een NL-bron en target de-DE met `voiceOverrides` op Sie-register, When de variant gegenereerd is, Then hanteert de DE-variant aantoonbaar het Sie-register (steekproef-observeerbaar in de PROPOSAL).
- [ ] Given een target-markt zonder F-VAL-pack (bijv. fr-FR), When de user erom vraagt, Then weigert de agent met uitleg — nooit een stil tegen-en-GB-gescoorde variant.
- [ ] Given een run met per-locale centroid = `null`, When de score getoond wordt, Then is de Pijler-1-beperking zichtbaar gelabeld bij de score.
- [ ] Given een falende of budget-overschrijdende batch-run, When de user de inbox bekijkt, Then is de status begrijpelijk failed/partial zonder half-gepersisteerde varianten.
- [ ] Given elke voltooide run, Then zijn kosten per variant en confirm-events geïnstrumenteerd (credit-transacties + PostHog).

# EERSTE TAAK (morgen startbaar — bewust GEEN agent-bouw)

Twee acties, samen <1 dag, beide zonder de gate te schenden:

1. **Epic-eisen borgen**: voeg aan `tasks/multi-market-transcreation-enterprise.md` een blok "agent-consumability" toe met drie harde eisen: (a) transcreatie-engine headless aanroepbaar (geen HTTP-/UI-koppeling), (b) output PROPOSAL-compatibel met het bestaande agent-output-contract incl. granulaire subset-confirm, (c) content-glossary/do-not-translate gemodelleerd op `BrandLocaleProfile`-niveau (niet in agent-memory). Plus een verwijzing naar dit draft als gate-consument.
2. **Demand-probe (A2)**: vraag de 4 pilots (te beginnen bij Better Brands' klantportfolio) of één van hun merken vandaag in ≥2 talen publiceert en hoe ze dat nu oplossen. Resultaat (ook "nee") in dit draft bijschrijven onder Evidence.

---

# Red Team Review

> Onafhankelijke kritiek. Stel: een ervaren PM zou dit plan zien — wat zou ze zeggen?

## Zwakste schakel

**A2 — nul klantvraag, twee lagen diep.** Niet alleen heeft geen pilot om deze agent gevraagd — geen pilot heeft om het onderliggende multi-markt-epic gevraagd. Dit draft plant dus een consumptielaag op een capaciteit waarvan de eigen go/no-go óók nog op founder-overtuiging draait. Als A2 fout is, is niet één feature verspild maar een multi-maand-keten. Tweede zwakke schakel: **A6** — het epic levert zelf al een matrix-UI met per-markt initiate+approve; als die volstaat, is deze agent een 7e catalogus-item zonder eigen bestaansrecht, gebouwd voor Jasper-pariteit-optiek.

## Pleidooi tegen dit plan

Dit is een plan voor een feature op een feature die niet bestaat, voor klanten die er niet om gevraagd hebben, gerechtvaardigd door een concurrent (Jasper) die aan een ander segment (enterprise) verkoopt. Het gevaarlijkste scenario is niet dat de agent mislukt, maar dat dit nette draft als sociaal bewijs gaat dienen om het blocked epic te un-gaten ("we hebben de localization-agent toch al gepland"). De goedkoopste route naar hetzelfde leren is de demand-probe van één middag — en als die "nee" oplevert, hoort dit draft geparkeerd, niet gepromoot.

## Wat zouden we leren door NIET te bouwen

- De demand-probe (EERSTE TAAK #2) beantwoordt A2 voor €0: bestaat er in de eigen pilot-cirkel ook maar één merk met een echt tweede-markt-probleem?
- Epic-dogfood (zodra Fase 4+5 ooit gebouwd wordt) beantwoordt A6 gratis: als de founder zelf de matrix-UI verkiest boven een agent-opdracht, vervalt de agent-premisse.
- Wachten kost hier vrijwel niets: de enige tijdgevoelige opbrengst van dit draft — de agent-consumability-eisen het epic in — wordt met EERSTE TAAK #1 vandaag al verzilverd, zonder ook maar één regel agent-code.

## Verdict van de planner

**needs-validation-first** — met een scherpe splitsing:

- **Nu doen (gratis/goedkoop)**: EERSTE TAAK #1 (epic-eisen) + #2 (demand-probe). Daarmee is de volledige tijdgevoelige waarde van dit draft geoogst.
- **Niet doen tot de drieledige gate staat**: technical-planning en elke vorm van bouw. De gate: (1) epic go/no-go positief + minimale slice gebouwd (engine, queue, P3-F-VAL-threading), (2) packs voor de aangeboden markten, (3) ≥1 workspace met bewezen multi-markt-behoefte.
- **Her-toets bij de gate**: A6 (meerwaarde boven de matrix-UI) opnieuw beoordelen met epic-dogfood-ervaring; pas dan besluiten of de MVP-scope (batch + bijsturing) klopt of dat de watchdog naar voren moet.

Reden: het plan zelf is dun, goed begrensd en sluit aantoonbaar aan op wat er al ligt (geen dubbeling met Fase 2/3, glossary-principebesluit voorkomt een architectuurfout, F-VAL-eerlijkheid is geborgd). Maar een JTBD zonder één klantobservatie, gestapeld op een blocked epic, is per definitie niet ready-to-build — plan-klaar is precies wat de tweede ring vraagt, en meer dan dat mag dit draft niet claimen.

# 5-Punts Stop-Conditie (afgevinkt door feature-planner)

- [x] Probleem in 1 zin formuleerbaar
- [x] Eén primaire success-metric (wekelijks geaccepteerde varianten per multi-markt-workspace; kwaliteits-counter-metric)
- [x] Out-of-Scope-lijst langer dan In-Scope-lijst (13 vs 6)
- [x] MVP-acceptance-criteria concreet (Given/When/Then, 7 stuks)
- [x] Eerste taak morgen startbaar (epic-eisen-blok + demand-probe — bewust géén bouw)

# Volgende stap

**Niet naar technical-planner.** Wél: (1) EERSTE TAAK #1+#2 uitvoeren; (2) evidence-link herstellen (marktonderzoek-rapport 2026-07-14 staat niet op disk); (3) dit draft her-toetsen op A2+A6 zodra de epic-go/no-go genomen is — dán pas promoten of definitief parkeren.
