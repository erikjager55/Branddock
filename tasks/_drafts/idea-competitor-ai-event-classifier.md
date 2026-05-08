---
id: competitor-ai-event-classifier
title: Competitor AI-event-classifier — strategische pattern-detectie bovenop deterministische diff-rules
status: pending-tech
created: 2026-05-08
verdict: ready-to-build
---

# Probleemstelling (1 zin)

`CompetitorActivityType`-enum heeft 12 events maar Fase 1's deterministische diff-engine produceert er slechts 7 — de 5 strategisch interessantste types (CATEGORY_REPOSITIONING, TARGET_AUDIENCE_CHANGED, VISUAL_REBRAND, NEW_FORMAT_EMERGING, FUNDING_EVENT, LEADERSHIP_CHANGE) blijven onbenut omdat ze pattern-level interpretatie vereisen die alleen een AI-classifier kan leveren.

# WHO — Doelgebruiker

**Rol**: brand-strategist die wil snappen of een concurrent een fundamentele strategie-shift maakt (rebrand, nieuwe doelgroep, category-pivot) — niet alleen een tagline-tweak.
**Schaal**: alle pilot-merken (n≈10), elke workspace heeft 4-15 concurrenten. Verwachte AI-classified events: ~3-5 per workspace per maand (low-volume maar high-value signaal).
**Acuut segment**: agency/strategist die in een kwartaal-pitch wil zeggen "deze concurrent heeft sinds 2 maanden zijn category herpositioneerd van X naar Y" — niet "ze hebben hun tagline veranderd".

## JTBD-narratief

> "Ik zag dat concurrent Acme hun tagline had gewijzigd van 'CRM voor MKB' naar 'AI-driven sales platform'. Branddock detecteerde de TAGLINE_CHANGED en VALUE_PROP_CHANGED events — maar wat ik echt wilde weten: is dit kosmetisch (alleen wording) of een fundamentele category-pivot? Daar geeft de huidige UI geen signaal voor."

## Evidence

- `prisma/schema.prisma:3974-3993` — `CompetitorActivityType` heeft 12 enum-waarden; deterministische rules in `src/lib/competitors/diff-engine.ts:21-23` dekken er 7
- `tasks/_drafts/idea-competitive-intelligence-loop.md` — Fase 1 idea-doc verwijst expliciet naar deze vervolg-task: `competitor-ai-event-classifier` voor NEW_FORMAT_EMERGING, CATEGORY_REPOSITIONING, etc.
- `tasks/done/competitor-snapshot-historie.md` "Out of scope" sectie: AI-classified events expliciet doorverwezen naar deze task
- Strategy Analyst Phase 3 BCP (`tasks/strategy-analyst-stub.md`) heeft trend-queries nodig over high-severity events — TAGLINE_CHANGED is INFO, CATEGORY_REPOSITIONING is MAJOR

# WHAT — Probleem (niet oplossing)

Drie waarneembare gebreken vandaag:

1. **Strategische events zijn onzichtbaar** — een concurrent die zijn category herpositioneert produceert wel TAGLINE_CHANGED + VALUE_PROP_CHANGED + TARGET_AUDIENCE_CHANGED in deterministische rules, maar die zijn alle drie INFO/NOTABLE severity. De gebruiker moet zelf de drie events kruisreferentie en concluderen "oh, dit is een pivot". Geen MAJOR-severity-flagging op pattern-level.
2. **5 enum-types blijven leeg** — schema heeft `NEW_FORMAT_EMERGING`, `CATEGORY_REPOSITIONING`, `VISUAL_REBRAND`, `FUNDING_EVENT`, `LEADERSHIP_CHANGE` maar geen producer. UI die op deze types filtert toont leeg.
3. **Severity-distributie skewed** — 7 deterministische rules produceren INFO + NOTABLE (alleen PRICING_CHANGED is MAJOR). Strategy Analyst trend-queries op `severity = MAJOR` krijgen daardoor weinig signaal — terwijl MAJOR events de belangrijkste zijn.

# WHY-NOW

- **Fase 1 data is daar** — prev/next snapshot pairs zijn beschikbaar via de diff-engine; classifier kan inplug'gen op `computeDiff(prev, next, ctx)`-output
- **A3 probe (2026-05-08)** bewees dat Claude Haiku 4.5 op tekstuele competitor-data accurate classificaties geeft (100% op format-detection sample) → analoog scenario voor pattern-detection
- **Strategy Analyst Phase 3** wacht op rijke event-stroom; deze classifier voedt dat
- **Pilot-pitch (+10-14 weken)** — een MAJOR-severity CATEGORY_REPOSITIONING-event is een sterk demo-argument waar deterministische rules nooit kunnen bij komen

Triggers:
- Schema is gemerged (PR-5)
- Cost-model Fase 4 heeft AI-call budget per refresh expliciet meegenomen
- Diff-engine helper-extractie pattern uit Fase 1 maakt classifier-toevoeging laagdrempelig

# SUCCESS METRICS

**Primaire metric**: % refreshes met content-changes (≥1 deterministisch event) waar de AI-classifier minstens 1 extra MAJOR/NOTABLE event toevoegt — gemeten 30 dagen na livegang. Doel: ≥35%.

**Secundair**:
- Classifier-accuracy op een synthetisch test-set van 30 prev/next paren ≥ 75% (validatie-blokker, zie A1 hieronder)
- Confidence-calibration: % events met `confidence < 0,7` zijn flagged voor manual-review of gedowngrade naar INFO
- Token-cost per refresh < $0,03 (binnen cost-model envelope)

**Counter-metric** (mag NIET kapotgaan):
- Refresh-route p95-latency mag niet >2s extra worden (max één classifier-call per refresh, batched over alle event-types)
- False-positive rate < 15% — anders wordt de UI inbox vervuild met onbetrouwbare flags
- Geen regression op deterministische events: classifier voegt **toe** aan, vervangt nooit, deterministische output

# CONSTRAINTS

## Hard
- **Cost-budget per refresh** ≤ $0,03 (uit cost-model). Eén batched AI-call met alle pattern-checks samen.
- **Geen page-fetch** — classifier werkt op snapshot.extractedJson alleen. Geen scraping, geen externe data-bronnen.
- **MVP scope**: alleen events die uit prev/next snapshot zelf zijn af te leiden. Andere events (FUNDING_EVENT, LEADERSHIP_CHANGE, NEW_FORMAT_EMERGING) hebben externe data-sources nodig — defer.
- **Latency**: classifier moet binnen 5s teruggeven (anders timeout in route). Haiku 4.5 doet dit ruim binnen.
- **Backwards-compat**: deterministische rules blijven runnen + produceren zelfde events. Classifier voegt toe, niet vervangt.

## Soft
- Hergebruik bestaande `createStructuredCompletion`-pipeline (project-conventie voor structured AI-calls)
- Confidence-veld op CompetitorActivity is al aanwezig in schema (`confidence Float?`) — bestaande slot vullen
- Eén batched call ipv per-type calls (analoog A3 probe-aanbeveling)

## Must NOT do
- Geen FUNDING_EVENT detection in MVP — vereist news-content scraping (defer naar `competitor-news-monitor` task die nog niet bestaat)
- Geen LEADERSHIP_CHANGE in MVP — vereist team-page scraping
- Geen NEW_FORMAT_EMERGING in MVP — vereist `competitor-content-item-discovery` te zijn live (zie idea-doc)
- Geen VISUAL_REBRAND in MVP — vereist visual-signaal capture (logo URL hashing, color-palette extraction); niet in Fase 1 schema
- Geen LLM-as-source-of-truth voor severity — classifier suggereert, severity-tabel in code bepaalt finaal
- Geen vervanging van deterministische events. Classifier draait NA deterministische rules.

# SCOPE

## In-Scope (MVP, ~3-4 dagen)

**Twee event-types met snapshot-only inputs**:

1. **CATEGORY_REPOSITIONING** (severity MAJOR) — detecteert wanneer prev/next een fundamentele category-shift impliceren. Inputs: prev/next van `valueProposition`, `targetAudience`, `differentiators`, `mainOfferings`. Trigger-rule (deterministisch pre-filter): minstens 2 van 3 (valueProp / targetAudience / differentiators) moet ≥ 50% Jaccard-distance hebben — anders skip AI-call (cost-saver).

2. **TARGET_AUDIENCE_CHANGED** (severity NOTABLE) — detecteert wanneer prev/next targetAudience semantisch andere doelgroep beschrijft. Inputs: prev/next van `targetAudience` alleen. Trigger-rule: tekst-diff ratio ≥ 0,3 (Jaccard) — minder is wording-tweak, meer is mogelijk audience-shift.

**Implementation**:
- Nieuwe lib: `src/lib/competitors/ai-classifier.ts` met:
  - `classifyPatternEvents(prev, next): Promise<DetectedActivity[]>` — pure async functie, geen DB-side-effects
  - System prompt + user prompt builder
  - Zod-schema voor structured output (Claude returnt `{ events: [...] }` array)
  - Confidence-output per event
- Diff-engine integratie (`src/lib/competitors/diff-engine.ts`):
  - Nieuwe `computeDiffWithClassifier(prev, next, ctx, opts)` async wrapper die deterministische `computeDiff` runt + classifier-events appendert
  - Bestaande `computeDiff` blijft sync + onveranderd (backwards-compat)
- Refresh-route gebruikt `computeDiffWithClassifier` ipv `computeDiff`
- Helper `applyCompetitorRefreshDualWrite` accepteert optionele `classifier?: ClassifierFn` callback voor injection (smoke-tests kunnen mocken)

**Validatie + smoke**:
- Synthetische test-set van 30 prev/next paren (10 CATEGORY_REPOSITIONING, 10 TARGET_AUDIENCE_CHANGED, 10 controle "geen pattern-event") in `scripts/probes/competitor-classifier-events-accuracy.ts`
- Smoke-test `scripts/smoke-tests/competitor-ai-classifier.ts` met fixture-snapshots, verifieert:
  - Classifier produceert correct events bij pattern-input
  - Classifier produceert geen events bij identieke snapshots
  - Pre-filter skip werkt (geen AI-call bij low-distance Jaccard)
  - Cost is binnen budget (mock-API: assert call-count ≤ 1)

## Out-of-Scope (expliciet NIET, ook al verleidelijk)

- **NEW_FORMAT_EMERGING** — depend on `competitor-content-item-discovery` (zie ander idea-doc); volgt pas wanneer ContentItems bestaan
- **VISUAL_REBRAND** — vereist visual-signaal capture (logo URL diff, color-palette diff). Schema heeft `visualStyleNotes` maar dat is text-only AI-extracted; geen ground-truth pixel-data. Eigen vervolg-task `competitor-visual-fingerprint`.
- **FUNDING_EVENT** — vereist news-content scraping; defer naar `competitor-news-monitor` task (nog niet bestaand)
- **LEADERSHIP_CHANGE** — vereist team-page scraping; defer naar `competitor-team-monitor` task
- **NEW_PRODUCT pattern-detection** — bestaande deterministische `NEW_PRODUCT` op `mainOfferings`-array dekt al; classifier-versie zou dubbele detection geven. Skip.
- **Cross-competitor pattern-detectie** — "alle 3 concurrenten herpositioneren naar AI" is een meta-event op workspace-niveau. Defer naar Strategy Analyst Phase 3.
- **AI-classified versies van bestaande deterministische events** — TAGLINE_CHANGED en VALUE_PROP_CHANGED blijven deterministisch. Classifier upgrade'd hun severity niet.
- **Real-time of streaming AI** — classifier is synchroon-binnen-refresh, één batched call.
- **Multi-model ensemble** — Haiku alleen, geen Sonnet-fallback. Bij low-confidence: flag voor user-review, niet retry met duurder model.
- **Continuous learning / fine-tuning** — Out-of-scope. Re-evaluate prompts handmatig na elk kwartaal.

> Out-of-Scope > In-Scope: ✓ (10 vs 2)

# AANNAMES

- **A1** — Claude Haiku 4.5 haalt ≥ 75% accuracy op synthetische test-set van 30 prev/next paren met CATEGORY_REPOSITIONING en TARGET_AUDIENCE_CHANGED labels — bewijs: A3 probe (2026-05-08) gaf 100% accuracy op format-classification met dezelfde model. Onbewezen voor pattern-detection (kwalitatief moeilijker dan format-detectie). **Validatie-actie pre-build**: probe-script bouwen + draaien (~1u werk).
- **A2** — Pre-filter Jaccard-trigger reduceert AI-calls met ≥ 50% — bewijs: bij stabiele competitors zal valueProposition zelden veranderen tussen refreshes; alleen bij echte content-shifts triggert classifier. Onbewezen, maar low-risk: bij hoger AI-call-volume past cost binnen budget zolang elke refresh < $0,03 blijft.
- **A3** — Confidence-veld is goed-gecalibreerd door Haiku — bewijs: structured outputs met expliciete confidence prompt-engineering werken in andere project-flows. Onbewezen voor deze taak. Calibratie-validatie: bij A1 probe ook confidence-distributie loggen.
- **A4** — Refresh-route latency-impact ≤ 2s — bewijs: Haiku call ~1-2s + Jaccard pre-filter snel. Onbewezen onder load. **Validatie**: integratie-smoke met timing-meting.
- **A5** — Confidence-cutoff van 0,7 is goed default — bewijs: industrial heuristic. Onbewezen. **Validatie post-launch**: per-event confidence-distributie loggen, drempel tunen na 30d data.

> Onbewezen aannames vereisen validatie VOOR build, niet erna. A1 is harde validatie-blokker (synthetische test-set ≥ 30 paren); A2/A4 zijn observeerbaar tijdens build.

# ACCEPTATIECRITERIA (MVP)

- [ ] Given een Competitor met prev/next snapshot waarbij valueProposition + targetAudience + differentiators alle drie ≥ 50% Jaccard-distance verschillen, When refresh draait, Then er ontstaat 1 `CompetitorActivity` met `type = CATEGORY_REPOSITIONING`, `severity = MAJOR`, `detectionMethod = 'ai-classified'`, `confidence` ≥ 0,7
- [ ] Given een Competitor met alleen targetAudience-tekst-diff ≥ 0,3 Jaccard, When refresh draait, Then er ontstaat 1 `CompetitorActivity` met `type = TARGET_AUDIENCE_CHANGED`, `severity = NOTABLE`, `detectionMethod = 'ai-classified'`
- [ ] Given een Competitor met identieke prev en next, When refresh draait, Then de classifier produceert 0 events en doet geen AI-call (pre-filter skip)
- [ ] Given een classifier-call met confidence < 0,7, When event wordt gepersisteerd, Then severity wordt gedowngrade naar INFO en activity wordt gemarkeerd voor manual review (toekomstig veld of summary-prefix "[low-confidence]")
- [ ] Given de Anthropic API geeft een fout terug, When refresh draait, Then deterministische events worden alsnog geschreven; classifier-error wordt gelogd maar veroorzaakt geen 500
- [ ] `npx tsc --noEmit` 0 errors
- [ ] `npm run lint` 0 errors in nieuwe files
- [ ] `scripts/probes/competitor-classifier-events-accuracy.ts` smoke-test 30 fixtures — accuracy ≥ 75% (validatie A1)
- [ ] `scripts/smoke-tests/competitor-ai-classifier.ts` — 4 scenarios groen (correct event, no-event, pre-filter skip, API-error graceful)
- [ ] Cost-tracking via bestaande `createStructuredCompletion` telemetry — gemiddelde kosten per refresh < $0,03 over 100 testfixture-runs

# EERSTE TAAK (morgen startbaar)

**A1 validatie-probe** (1-1.5u): bouw `scripts/probes/competitor-classifier-events-accuracy.ts` met:
- 30 hand-gecontructeerde prev/next snapshot-paren als test-set, gespreid over CATEGORY_REPOSITIONING (10), TARGET_AUDIENCE_CHANGED (10), GEEN-PATTERN (10 controle)
- Anthropic SDK direct call met `claude-haiku-4-5-20251001`, system+user prompt voorbeeld
- Aggregate: per-class accuracy + confusion matrix + average confidence per class

Direct daarna: prompt-tuning round indien accuracy < 75% — concept-versie + iteratief 2-3 prompt-revisies.

---

# Red Team Review

## Zwakste schakel

**A1 — pattern-classification accuracy is moeilijker dan format-classification**. A3 probe gaf 100% op URL-format-detection waar context kort is en signalen sterk. Pattern-detection vraagt nuance ("herpositionering" vs "tagline-tweak") en compounded signals. Realistisch resultaat A1: 70-85% accuracy. Bij < 75%: scope-cut naar alleen TARGET_AUDIENCE_CHANGED (eenvoudigere taak), of confidence-threshold verhogen tot alleen high-confidence events landen.

## Pleidooi tegen dit plan

Pre-launch is overspannen. Strategy Analyst Phase 3 is ver weg (maand 7-9 post-launch volgens roadmap), dus rijke event-stroom is geen pre-launch noodzakelijk. AI-classifier voegt cost en complexiteit toe voor een feature die in MVP-pilot misschien 3 events per workspace per maand produceert — laag-volume signaal. Defer naar Strategy Analyst implementation: dan kunnen classifier en consumer samen worden ontworpen met echte data over wat strategists daadwerkelijk willen zien.

## Wat zouden we leren door NIET te bouwen

Door pilot eerst de deterministische 7 events alleen te draaien, leren we welke events daadwerkelijk gebruiker-aandacht trekken. Dan kunnen we evidence-based bepalen welke pattern-events meerwaarde hebben — sommige (CATEGORY_REPOSITIONING) zijn zelf-evident waardevol, andere (TARGET_AUDIENCE_CHANGED) zijn mogelijk overlap met TAGLINE_CHANGED in user-perception. Risico van uitstel: de Strategy Analyst Phase 3 implementatie krijgt minder rijke trainings-data om op te tunen.

## Verdict van de planner

**ready-to-build** — schema is mergeable, scope is strak afgekaderd (2 events), cost binnen budget, A1 validatie pre-build uitvoerbaar, helper-extractie pattern uit Fase 1 maakt integratie laagdrempelig. Out-of-scope > In-scope (10 vs 2).

Twee voorbehouden voor technical-planner:
1. **A1 validatie-probe eerst draaien** — bij accuracy < 75% scope-cut naar enkel TARGET_AUDIENCE_CHANGED of confidence-threshold tuning
2. **Cost-tracking actief in implementation** — `createStructuredCompletion`-telemetry meten per refresh, alarm bij budget-overschrijding

# 5-Punts Stop-Conditie

- [x] Probleem in 1 zin formuleerbaar
- [x] Eén primaire success-metric (≥35% refreshes met AI-classified MAJOR/NOTABLE event boven deterministische output)
- [x] Out-of-Scope-lijst langer dan In-Scope-lijst (10 vs 2)
- [x] MVP-acceptance-criteria concreet (Given/When/Then)
- [x] Eerste taak morgen startbaar (A1 probe-script, 1-1,5u)

# Volgende stap

Klaar voor technical-planner promotion na A1-probe. Idea-doc → `tasks/competitor-ai-event-classifier.md` met definitieve scope, of bij A1 < 75% een revisie-pass met scope-cut.
