# Competitor AI-event-classifier accuracy — A1 probe-resultaten

> **Datum**: 2026-05-08 · **Probe-script**: `scripts/probes/competitor-classifier-events-accuracy.ts` · **Doel**: A1 validatie voor `tasks/_drafts/idea-competitor-ai-event-classifier.md`. Hard validatie-blokker vóór technical-planner promotion.

## Samenvatting

**29/30 (96.7%) accuracy** met Claude Haiku 4.5 op een hand-geconstrueerde test-set van 30 prev/next snapshot-paren. Boven de 75% threshold uit het idea-doc. **Classifier MVP-pad bevestigd**, idea-doc verdict blijft `ready-to-build`.

## Setup

- **Model**: `claude-haiku-4-5-20251001`
- **Input per call**: prev en next snapshot-slice (valueProposition, targetAudience, differentiators, mainOfferings)
- **Output**: structured JSON `{ events: [{ type, confidence, rationale }] }`
- **Sample-distributie**: 10 CATEGORY_REPOSITIONING / 10 TARGET_AUDIENCE_CHANGED / 10 NONE (cosmetisch)
- **Modaliteit**: één AI-call per pair (geen batching) voor granulaire meting
- **Cost**: ~$0,03 voor de hele probe

## Per-class breakdown

| Klasse | Recall | Precision (uit confusion-matrix) |
|---|---|---|
| CATEGORY_REPOSITIONING | 10/10 (100%) | 10/11 (91%) — 1 false positive vanuit aud-03 |
| TARGET_AUDIENCE_CHANGED | 9/10 (90%) | 9/9 (100%) — geen false positives |
| NONE | 10/10 (100%) | 10/10 (100%) — geen false negatives |

## Confusion matrix

|  Truth \\ Pred  | CATEGORY | TARGET | NONE |
|---|---|---|---|
| CATEGORY_REPOSITIONING | **10** | 0 | 0 |
| TARGET_AUDIENCE_CHANGED | 1 | **9** | 0 |
| NONE | 0 | 0 | **10** |

**Geen false-positive op NONE-cases** — alle 10 cosmetische wijzigingen (synoniemen, wording, ordering, lengte) correct geskipt. Dit is de belangrijkste eigenschap voor productie: de classifier "praat" niet uit zijn nek.

## Edge case: aud-03

De ene miss is interessant — niet duidelijk fout maar een gevecht over framing.

**Pair**:
- prev: "API-first database for developers" / Backend developers / [REST + GraphQL APIs, PostgreSQL under the hood, TypeScript SDK]
- next: "Build internal tools without code" / Operations teams and analysts / [drag-drop interface, visual workflows, no SQL needed]

**Ground-truth**: TARGET_AUDIENCE_CHANGED (developers → ops/analysts)
**Classifier**: CATEGORY_REPOSITIONING (database → no-code builder), confidence 0.95
**Classifier rationale**: "Fundamental shift... Core offering changes from database hosting with auto-generated APIs to visual UI builder with workflows. Differentiators shift from technical APIs/PostgreSQL/TypeScript to no-code UI paradigm."

**Mijn analyse**: classifier heeft technisch gelijk. De fixture beschrijft tegelijkertijd zowel een audience-shift ALS een category-shift. Mijn ground-truth label was te eenduidig — het is een dual-event scenario. Productie-classifier zou hier ideaal beide events moeten emitten.

**Implicatie voor implementation**:
- Allow multiple events per pair (al toegestaan in JSON-schema, classifier emitted hier alleen één)
- Voor borderline gevallen: confidence-veld helpt UI om nuance te tonen
- Niet als classifier-fout aanmerken — eerder als ground-truth ambiguïteit

## Confidence-calibratie

- **Avg confidence op correcte voorspellingen**: 0,95 (n=19, alleen niet-NONE)
- **Avg confidence op incorrecte voorspelling**: 0,95 (n=1, alleen aud-03)
- NONE-cases hebben geen confidence (events array is leeg)

**Observatie**: confidence-spread is heel smal (0,92-0,98). Classifier is consistent zelfverzekerd. Dit is OK voor MVP maar maakt confidence-thresholding nutteloos voor deze sample (alle predicties zijn high-confidence). Productie kan onbetrouwbare detecties anders uiten dan via confidence — bijvoorbeeld via een second-pass review-prompt.

**Aanbeveling MVP**: bewaar confidence-veld, gebruik niet als auto-downgrade-trigger tot er empirische data is uit echte productie-runs (drift-meting na 30 dagen).

## Wat niet gemeten is

- **Niet-Engelse fixtures** — alle 30 paren waren Engels. Productie heeft NL/BE/DE competitors. Risico: classifier mist taal-specifieke nuances. Mitigatie: bij implementation een 10-pair NL fixture-set toevoegen aan smoke-test.
- **Edge-cases met dual events** — alleen aud-03 was dual-natured. Productie zal vaker dubbel-event-cases hebben. Test multi-event output expliciet bij implementation.
- **Borderline content-shifts** — sample is bewust polariserend (echte shifts vs cosmetisch). Echte productie heeft vaak grijze zones (bijv. categoriebreedte verandert lichtjes). Hoe presteert classifier daar — onbekend. Validatie post-launch via samples uit echte refresh-runs.
- **Token-cost in batches** — probe deed 30 individuele calls. Productie zou batches doen (bijv. 5 pairs in één call) wat factor 4-5× cost-besparing oplevert. Niet gemeten.
- **Latency p95** — Haiku ~1-2s per call observerend. Niet expliciet gemeten. Zit ruim binnen het 5s timeout-target uit idea-doc.
- **API-retry-gedrag** — geen API-fouten gehad in deze run. Productie moet retry/backoff hebben.

## Pre-filter Jaccard-trigger validatie

Het idea-doc stelt een pre-filter voor: alleen AI-call wanneer prev/next minstens 50% Jaccard-distance heeft op valueProposition+targetAudience+differentiators. Dit is **niet** in de probe gemeten — alle 30 fixtures werden direct naar de AI gestuurd zonder pre-filter.

**Verwachting voor productie**: pre-filter zou alle NONE-cases (10/30 = 33%) moeten skippen → ~33% AI-call besparing. Plus stabiele competitors zonder content-changes worden helemaal niet aangeroepen.

**Validatie-actie tijdens implementation**: meet pre-filter skip-rate op 100 echte refresh-runs. Bij < 50% skip-rate: pre-filter Jaccard-threshold te streng — verlagen of uitbreiden naar meer signalen.

## Implicaties voor MVP-implementatie

### Bevestigd voor inclusion

- ✅ **Haiku 4.5 is het juiste model** — geen Sonnet/Opus nodig
- ✅ **JSON-only output haalbaar** — bij strikte prompt ("CRITICAL: Respond with ONLY valid JSON")
- ✅ **CATEGORY_REPOSITIONING is robuust gedetecteerd** — klare signalen werken
- ✅ **NONE-detection is sterk** — 0% false positives, geen UI-vervuiling
- ✅ **Multiple-event output ondersteund door schema** — gebruik dit voor borderline gevallen
- ✅ **Confidence-veld werkt** — al heeft het beperkte spread in deze sample

### Aanbevelingen voor implementation

1. **Strenge prompt verplicht** — gebruik de "CRITICAL: Respond with ONLY valid JSON" formulering. Zonder dit krijg je 33% parse-errors (zoals eerste run aantoonde).
2. **Fallback op parse-error** — als JSON parsing faalt, return events: [] in plaats van een error gooien. Refresh-route mag niet failen op classifier-glitch.
3. **Allow multiple events per pair** — schema laat het toe, classifier emit het soms; UI moet beide kunnen tonen.
4. **Pre-filter Jaccard** — implementatie volgens idea-doc spec, meet skip-rate empirisch.
5. **NL/BE/DE fixture-uitbreiding** — voeg 10 niet-Engels paren toe aan smoke-test om taal-coverage te valideren.
6. **Batched calls** — 5 pairs per call ipv 1, factor 4-5× cost-besparing.
7. **Per-event-type cost-tracking** — log via bestaande `createStructuredCompletion` telemetry.

### Niet aanbevolen voor MVP

- ❌ Confidence-threshold downgrades — spread is te smal in deze sample voor zinvol thresholding
- ❌ Multi-model ensemble — overkill, Haiku doet het uitstekend
- ❌ Custom fine-tuning — niet rendabel voor 2-class probleem met 96,7% baseline
- ❌ Real-time of streaming — synchroon-binnen-refresh is fine

## Status van pre-build validaties (volledig)

| Validatie | Status | Resultaat |
|---|---|---|
| **A1 classifier-accuracy** | ✅ uitgevoerd | **96,7% (29/30)** — bevestigd |
| A2 pre-filter Jaccard skip-rate | ⏳ tijdens implementation | meten op echte refresh-runs |
| A3 confidence calibratie | ⏳ post-launch | meten over 30d productie-data |
| A4 latency-impact | ⏳ tijdens implementation | timing meten in smoke-test |
| A5 confidence-cutoff tuning | ⏳ post-launch | empirisch tunen |

**Conclusie**: A1 is de enige hard pre-build validatie-blokker, en die is afgerond met sterke evidence. A2-A5 zijn observability-acties tijdens en na implementation. Idea-doc kan worden gepromoot naar uitvoerbare task door technical-planner.

## Cost-impact bij scope

Cost-model uit `2026-05-08-competitor-monitoring-cost-model.md`:
- Light scan budget: $0,03 per concurrent per refresh
- Met deze classifier: +$0,001-0,003 per refresh als batched, ~$0,01 unbatched

**Past binnen budget** — classifier voegt < 10% toe aan light-scan-cost als batched. Verifieer per pre-filter skip-rate post-launch.

## Volgende stap

Idea-doc verdict blijft `ready-to-build`. Technical-planner promotion mogelijk wanneer:
1. PR-5 (Fase 1) is gemerged in main
2. Sub-cluster-werkstroom van BCP Phase 1 stabiliseert
3. Effort-window van 3-4 dagen beschikbaar voor implementation
