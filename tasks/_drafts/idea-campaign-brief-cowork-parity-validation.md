---
id: campaign-brief-cowork-parity-validation
title: A3-validatie — gap-rapport wizard-output vs. Linfi-stijl Cowork-brief
status: completed
created: 2026-05-07
completed: 2026-05-07
related-idea: idea-campaign-brief-cowork-parity.md
type: validation-results
method: code-archeologie (Prisma schema + AI prompt-builders + Zod response-schemas), niet UI-walkthrough
---

# Doel

Bepalen welk **scenario** de feature `campaign-brief-cowork-parity` moet volgen door te meten hoe groot het gat is tussen de huidige Branddock-campagne-wizard-output en een Cowork-stijl 10-secties campagne-brief.

> **Methode-keuze**: code-archeologie ipv. UI-walkthrough. Reden: meet wat de wizard *kan* produceren by design (deterministisch), in plaats van wat één AI-run toevallig oplevert (ruis = N=1 vs. N=1). Als format/schema niet voorziet in een sectie, kan geen prompt-tweak het ophalen — dus dit is een sterker signaal voor scenario-keuze.

---

# Gemapte bronnen (input voor gap-analyse)

- `prisma/schema.prisma`: `Campaign`, `BusinessStrategy`, `CampaignStrategy`, `Persona`, `Deliverable`, `MediumEnrichment`
- `src/lib/campaigns/strategy-chain.ts` (2005 regels) + `strategy-blueprint.types.ts`: 9 wizard-fasen met output-schemas
- `src/app/api/campaigns/wizard/strategy/*`: 9 routes (validate-briefing, improve-briefing, build-foundation, mine-insights, generate-concepts, creative-debate, build-strategy, elaborate, quick-concept)
- `src/features/campaigns/utils/exportCampaignStrategyPdf.ts:54` + `exportCampaignStrategyJson.ts:12` — bestaande export-laag

---

# Per-sectie gap-rapport

## 1. Campagne overzicht
*Linfi had: campagnenaam, samenvatting (5-7 zinnen), primair SMART-doel, secundaire doelen (4 stuks).*

- **Wat Branddock biedt**: `Campaign.{title, type, description, startDate, endDate, campaignGoalType, targetMetrics(Json), actualMetrics(Json), confidence, strategy(Json)}` + `BusinessStrategy.{vision, rationale, keyAssumptions[]}` + `StrategyFoundation.{strategicDirection, coreMessage}`
- **Gap %**: **50%**
- **Oorzaak**: `format` + `data`
- **Notes**: Basis-velden ✓, samenvatting (5-7 zinnen narratief) niet als veld; geen primair vs. secundair SMART-doel-onderscheid (`targetMetrics` is ongestructureerd Json); geen "campagne-thema-naam" zoals "Het luik dat verdwijnt".

## 2. Doelgroep
*Linfi had: primair + secundair segment, pijnpunten (5), motivaties (4), vindplaatsen (5), buying-stage analyse.*

- **Wat Branddock biedt**: `Persona.{frustrations[], motivations[], preferredChannels(Json), buyingTriggers[], decisionCriteria(Json), demographics, psychographics, behaviors[]}` + meerdere persona's voor primair/secundair + `StrategyFoundation.{audienceInsights[], targetBehaviors[], mindspaceAssessment[]}`
- **Gap %**: **10%**
- **Oorzaak**: `format`
- **Notes**: Sterkste sectie. Data structureel rijk dekkend. Alleen narratieve renderlaag ontbreekt (Linfi-stijl proza per segment). Primair/secundair-flag impliciet via persona-volgorde.

## 3. Kernboodschappen
*Linfi had: kernboodschap (1 zin), 4 ondersteunende boodschappen, tone per kanaal, bewijspunten.*

- **Wat Branddock biedt**: `Campaign.masterMessage{coreClaim, proofPoint, emotionalHook, primaryCta}` + `StrategyFoundation.{coreMessage, proofPoints[], reasonToAct}` + `MediumEnrichment.phaseGuidance(Json)` (tone/message/CTA per phase)
- **Gap %**: **25%**
- **Oorzaak**: `format`
- **Notes**: Kern + bewijspunten ✓; 4 ondersteunende boodschappen-array niet expliciet — `proofPoints[]` benadert maar is conceptueel anders (bewijs vs. boodschap); tone-per-kanaal staat in phase-guidance maar niet platform-specifiek (LinkedIn-tone vs. Instagram-tone).

## 4. Kanaalstrategie
*Linfi had: keuze + waarom + cadans + effort-% per kanaal + "bewust niet"-lijst.*

- **Wat Branddock biedt**: `ChannelPlanLayer.channels[].{name, role(hero/hub/hygiene), objective, targetPersonas[], contentMix[], budgetAllocation(high/med/low), priority}` + `timingStrategy(string)` + `phaseDurations[]`
- **Gap %**: **25%**
- **Oorzaak**: `format` + `ai_output`
- **Notes**: Kanaal-data + rol + content-mix ✓; "Bewust niet"-lijst (waarom skip Pinterest/TikTok) ontbreekt geheel; effort-% (60/30/10) niet expliciet (`priority` is ranking, niet allocatie); cadans-per-kanaal-per-week ontbreekt.

## 5. Content-kalender
*Linfi had: 7 weken × thema × LinkedIn-posts × Instagram-posts × mijlpalen + productie-cadans-regels.*

- **Wat Branddock biedt**: `phaseDurations[].{phaseId, suggestedWeeks}` + `Deliverable.{scheduledPublishDate, channel, phase}` + `AssetPlanDeliverable.suggestedOrder`
- **Gap %**: **70%**
- **Oorzaak**: `data`
- **Notes**: Phase-grain ✓ (awareness/consideration/decision met weken-spanne), maar **geen `WeeklyTheme` of `WeeklyContentCalendar` model**. Per-week-thematisering (zoals "Wk 1: Het luik dat verdwijnt") ontbreekt; per-week posts-grid (X LinkedIn + Y Instagram) ontbreekt; productie-cadans-regels (deadlines) niet als veld; mijlpalen per week niet gestructureerd.

## 6. Benodigde content-assets
*Linfi had: must-have (9 items met klaar-datum + funnel-positie), nice-to-have (4 items).*

- **Wat Branddock biedt**: `AssetPlanLayer.deliverables[].{title, contentType, channel, phase, targetPersonas[], brief{objective, keyMessage, toneDirection, CTA, contentOutline}, productionPriority(must/should/nice), estimatedEffort, suggestedOrder, contentTypeInputs}` + `prepDeliverables[]` (Week 0) + `Deliverable.scheduledPublishDate`
- **Gap %**: **5%**
- **Oorzaak**: `n/a`
- **Notes**: Volledig dekkend. Must/should/nice native, brief-shape rijker dan Linfi (incl. tone-direction + content-outline), prep-deliverables (week 0) als aparte categorie. Sterkste-uitgewerkte sectie van de wizard.

## 7. Succes-metrics
*Linfi had: primaire KPI (numeriek + tijdvenster + definitie), sub-segmentatie (hot/warm), secundaire-KPI-tabel (6 metrics), tracking-stack.*

- **Wat Branddock biedt**: `Campaign.{targetMetrics(Json), actualMetrics(Json)}` (ongestructureerd) + `BriefingValidation.overallScore` (kwaliteits-score, geen KPI)
- **Gap %**: **75%**
- **Oorzaak**: `data` + `ai_output`
- **Notes**: Json-veld ja, maar **geen typed KPI-schema** en **geen prompt-fase die gestructureerde KPI's vraagt**. Primair-vs-secundair onderscheid ontbreekt; numeriek doel + tijdvenster niet als veld; counter-metric concept ontbreekt; sub-segmentatie (hot/warm/cold lead-definitie) niet; tracking-stack-veld niet.

## 8. Budget-allocatie
*Linfi had: budget-tabel (6 posten, bedrag + % + toelichting per post + contingency).*

- **Wat Branddock biedt**: `ChannelPlan.channels[].budgetAllocation` (enum high/medium/low — coarse, niet bedrag)
- **Gap %**: **90%**
- **Oorzaak**: `data`
- **Notes**: **Geen budget-tabel-model**. Geen totaal-budget-veld op `Campaign`; geen budget-post-categorieën (fotografie/content-productie/boost/tools/contingency); enkel een ranking-enum per kanaal. Linfi-stijl detail-tabel zou nieuw model vereisen.

## 9. Risico's en mitigatie
*Linfi had: 5 risico's met expliciete mitigatie-stappen.*

- **Wat Branddock biedt**: `BriefingValidation.gaps[].{field, severity}` (input-gap, geen uitvoerings-risico); verder niets
- **Gap %**: **95%**
- **Oorzaak**: `data`
- **Notes**: **Geen `CampaignRisk` model, geen risk-assessment-prompt**. Volledig afwezig. Vereist nieuwe data-laag + nieuwe wizard-fase of post-strategy AI-call.

## 10. Volgende stappen
*Linfi had: direct-deze-week + vóór-launch + open beslispunten.*

- **Wat Branddock biedt**: `prepDeliverables[].{title, description, category, owner, estimatedEffort}` (Week 0)
- **Gap %**: **50%**
- **Oorzaak**: `data` + `format`
- **Notes**: prepDeliverables dekt "direct deze week"-acties redelijk ✓; "open beslispunten" als gestructureerde lijst ontbreekt geheel; "vóór-launch milestone-checklist" los van prepDeliverables ontbreekt.

---

# Stap 3 — Aggregatie + scenario-keuze

## Totaal-overzicht

| # | Sectie | Gap % | Oorzaak |
|---|---|---|---|
| 1 | Campagne overzicht | 50% | format + data |
| 2 | Doelgroep | 10% | format |
| 3 | Kernboodschappen | 25% | format |
| 4 | Kanaalstrategie | 25% | format + ai_output |
| 5 | Content-kalender | **70%** | data |
| 6 | Benodigde assets | 5% | n/a |
| 7 | Succes-metrics | **75%** | data + ai_output |
| 8 | Budget-allocatie | **90%** | data |
| 9 | Risico's en mitigatie | **95%** | data |
| 10 | Volgende stappen | 50% | data + format |
| | **Totale gap (gemiddelde)** | **49,5%** | |

## Oorzaak-verdeling

- `data`-dominant: secties 5, 7, 8, 9, 10 → **5 secties** (gemiddeld 76% gap)
- `format`-dominant: secties 1, 2, 3, 10 → **4 secties** (gemiddeld 34% gap)
- `ai_output`-bijdrage: secties 4, 7 → **2 secties** (secundair)
- `n/a`: sectie 6 → **1 sectie**

> 💡 Signaal: de **diepste gaten zitten in data-domein** (gemiddeld 76% gap in de 5 data-sections), niet in format. Dat overstemt het gemiddelde.

## Beslissing

- [ ] Totale gap < 40% → Scenario 1 (output-mapper, 1-2 dagen)
- [x] Totale gap 49,5% (40-70% band) → **Scenario 2** (Strategy-redesign + mapper, 1 week) — *nominaal*
- [ ] Totale gap > 70% → Scenario 3 (parkeer + data-laag task)

**Maar — nuance**: oorzaak-analyse wijst naar Scenario 3 voor de zware secties (5, 7, 8, 9). De 49,5% gemiddelde maskeert een **bimodale verdeling**:
- 5 secties met gemiddeld 23% gap (overzicht, doelgroep, kernboodschappen, kanaalstrategie, assets, volgende stappen-half) — Scenario 1 / output-mapper-zone
- 4 secties met gemiddeld 82% gap (kalender, metrics, budget, risico's) — Scenario 3 / data-laag-zone

**Aanbevolen scenario**: **hybride 1+3, gefaseerd**

| Fase | Scenario | Effort | Inhoud |
|---|---|---|---|
| **Fase A — quick win** | 1 (output-mapper) | 1-2 dagen | Markdown/HTML render-laag voor secties 1, 2, 3, 4, 6, 10 — bestaande wizard-data → Linfi-stijl prose. Levert **+30-40% brief-presenteerbaarheid** zonder schema-wijziging. |
| **Fase B — data-laag uitbreidingen** | 3 (4 sub-tasks) | elk 2-3 dagen | Aparte tasks/<id>.md per ontbrekend domein: <br>• `campaign-weekly-calendar` (sectie 5) <br>• `campaign-kpi-structure` (sectie 7) <br>• `campaign-budget-table` (sectie 8) <br>• `campaign-risk-assessment` (sectie 9) |
| **Fase C — integratie** | 2 (re-render) | 2-3 dagen | Output-mapper uit Fase A uitbreiden met de 4 nieuwe data-domeinen → 7,5/10-pariteit Cowork. |

**Hoofdmotivatie**: 49,5% nominaal valt in Scenario 2-band, maar oorzaak-verdeling toont dat een 1-week Strategy-redesign onhaalbaar is voor 4 secties die *nieuwe Prisma-modellen + nieuwe AI-prompts + nieuwe wizard-fase(n)* vereisen. Hybride is realistischer: 1-2 dagen quick win nu, daarna gefaseerde data-uitbreiding parallel met andere pre-launch werk.

# Stap 4 — Conclusie en volgende stap

## Onverwachte observaties tijdens validatie

- **Asset-laag (sectie 6) is sterker dan Linfi**: Branddock's `AssetPlanDeliverable` heeft brief-shape (objective + keyMessage + toneDirection + CTA + contentOutline) die **rijker** is dan de Linfi must-have-lijst (alleen titel + funnel-positie + datum). Hier ligt een onbenutte selling-point: Branddock kan per asset een mini-brief produceren waar Cowork niet aan toekomt.
- **Doelgroep-data (sectie 2) is buitenproportioneel rijk** (gemiddelde gap 10%) maar wordt nu in de wizard-output niet als narratief gerendered — dit is **format-only-low-hanging fruit** voor Fase A.
- **Budget-allocation als enum** (`high/medium/low`) is bewust coarse-grained gehouden — pas op: een Linfi-stijl bedrag-tabel raakt deze enum waarschijnlijk niet (additief), maar vereist een nieuw `CampaignBudget`-model met `lineItems[]`.
- **`MediumEnrichment.phaseGuidance`** is een onverwacht goede bron voor tone-per-kanaal in Fase A — niet eerder herkend als wizard-output-veld.
- **`BriefingValidation.gaps[]`** zou hergebruikt kunnen worden voor risico-detectie (sectie 9), maar betreft input-gaps, niet uitvoerings-risico's — andere conceptuele laag, dus echt nieuw model nodig.

## Brandclaw-conflict-check

| Fase | Raakt loop-architectuur? | Mitigatie |
|---|---|---|
| **A (output-mapper)** | Nee — additief op bestaande modellen, alleen render-laag | Geen ADR nodig |
| **B1 (weekly-calendar)** | Ja — `WeeklyTheme` model wordt input voor toekomstige Strategy Analyst | ADR vereist: timing-vs-strategy interface |
| **B2 (kpi-structure)** | Ja — gestructureerde KPI's zijn directe input voor Measurement node (post-launch maand 7-9) | ADR vereist: KPI-schema vs. Measurement-feedback-loop |
| **B3 (budget-table)** | Mogelijk — als Optimization node later budget-suggesties doet | ADR aanbevolen: budget-mutation-policy |
| **B4 (risk-assessment)** | Beperkt — risico-veld is statische registratie, geen loop-input | Geen ADR maar wel cross-link in `gotchas.md` |
| **C (integratie)** | Nee — alleen render-laag op A+B-output | Geen ADR nodig |

> ⚠️ Belangrijk: B1+B2 (en B3) **moeten** met Brandclaw-architecturale-blik ontworpen worden, niet als geïsoleerde wizard-uitbreidingen. Dat is precies het Brandclaw-risico uit de feature-planner Red Team Review.

## Volgende stap

- [x] **Hybride scenario gekozen** (1 + 3, gefaseerd) → niet één technical-planner-call, maar **2 cycli**:
  - **Cyclus 1 (nu)**: roep `technical-planner` aan met dit bestand + `idea-campaign-brief-cowork-parity.md` voor **Fase A (output-mapper)** alleen — promote naar `tasks/campaign-brief-output-mapper.md` (1-2 dagen). Geen ADR.
  - **Cyclus 2 (na Fase A live)**: open 4 nieuwe feature-discovery sessies via `feature-planner` voor B1-B4 (weekly-calendar, kpi-structure, budget-table, risk-assessment). Elke met expliciete Brandclaw-loop-impact-vraag in Ronde 3. Verwacht: 2 van 4 worden `ready-to-build`, 2 worden `needs-validation-first` (afhankelijk van Brandclaw-fasering).

- [ ] Origineel idea-bestand `idea-campaign-brief-cowork-parity.md` updaten:
  - Verdict: van `needs-validation-first` → `ready-to-build` (alleen Fase A scope)
  - Uitkomst van A3-validatie loggen
  - In-Scope MVP afronden naar Fase A items
  - Out-of-Scope uitbreiden met B1-B4 als "follow-up features"

- [ ] Open vraag voor user: starten we Fase A *na* of *vóór* `studio-content-generation-real-ai` (1 week, P0 open)? Mijn advies: **na**, tenzij Fase A ook de output-mapper voor studio-generated content kan dienen (synergie checken).
