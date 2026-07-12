# Agents dogfood — ronde 2, Better Brands (2026-07-12)

> Tweede dogfood-ronde (vervolg op [ronde 1](agents-dogfood-2026-07-07.md)). Drie doelen: (1) de ronde-1-hygiëne-fixes valideren met echte runs, (2) de **credit-metering op agent-runs** meten (credits live in pilotmodus sinds 2026-07-10 — nooit eerder in de praktijk geverifieerd), (3) een tweede kosten/F-VAL-datapunt voor de Fase-2/3-guardrails.
> Harnassen: `scripts/dev/agents-dogfood.ts` (sweep, nu met `DOGFOOD_RUN_DATE`/`DOGFOOD_ONLY`) + `scripts/dev/agents-confirm-path.ts` (confirm-pad, nu mét route-parity credit-charge).
> **Meetcondities**: n=1 per agent, lokaal; `EXA_API_KEY`/`S2_API_KEY` nog steeds niet gezet → research-enrichment opnieuw gedegradeerd; `NEXT_PUBLIC_CREDITS_ENABLED=true` per invocatie en `unlimitedCredits` van de org tijdelijk `false` (na afloop hersteld op `true`; het lokale testsaldo ging 10 → 7 door de gemeten afboeking).

---

## Samenvatting + verdicts

| Meting | Resultaat | Verdict |
|---|---|---|
| **Guardrail #2 kosten** | sweep $0,4345 (6 runs, waarvan 1 FAILED à $0) + retry $0,0899 · **~$0,09/run** (r1: $0,10) | ✅ stabiel & reproduceerbaar |
| **Guardrail #1 F-VAL** | eindcontent (confirm-pad, linkedin-post→gpt-5.4): **73** (r1: 76) · brand-guardian review: **71** (r1: 75) | ✅ >70-drempel opnieuw gehaald; n=1-variantie ±3-4 punten |
| **Credit-metering agent-runs** (nieuw) | sweep: **0 transacties** (5 gratis agents + Milo-proposal boekt correct niets) · confirm: **exact −3 DEDUCT** (`agent-deliverable`, idempotencyKey `agent-confirm:<runId>:<deliverableId>`, saldo 10→7) | ✅ **werkt end-to-end zoals ontworpen** — eerste praktijkvalidatie |
| **Hygiëne-fixes ronde 1** | 1 van 3 effectief (concept-banner ✓) · strategist-fix = **regressie** (zie hieronder) · angle-generator-fix = onvoldoende | ⚠️ **hoofdvondst van deze ronde** |

**Kernconclusie**: de guardrail-datapunten blijven groen én de credit-keten op agents is nu bewezen. Maar de ronde bewees vooral de waarde van herhaal-metingen: **de strategist-"fix" van ronde 1 had Stella 5 dagen volledig kapot gemaakt op productie**, onzichtbaar voor tsc/lint/review. Fix geleverd + gevalideerd in deze ronde.

---

## Hoofdvondst — strategist fataal door SDK non-streaming-plafond (fix geleverd)

De ronde-1-fix (strategist `maxTokens` 16k → 32k, tegen een truncatie) brak élke strategist-run: instant FAILED (0,0s, 0 tokens, $0) met *"Streaming is required for operations that may take longer than 10 minutes"*. De Anthropic SDK weigert **client-side** elke non-streaming call met `maxTokens > 21.333` (600s × 128.000/3600) — óók met de per-request timeout die de loop al meegaf (de check leest alleen de client-constructor-timeout). De fix stond sinds 2026-07-07 op productie (`9352edef`).

**Fix (deze ronde, gevalideerd)**:
- `agent-loop.ts`: `NONSTREAMING_MAX_TOKENS = 21_333` + **clamp in `runLoopCore`** (met warn) — geen enkele toekomstige definitie-bump kan de loop nog breken; een gekapte turn levert partial output (contract rapporteert via `lastStopReason === "max_tokens"`), een geweigerde call faalde de hele run.
- `strategist.ts`: definitie 32k → 21.333 (het harde plafond zolang de loop non-streaming is).
- Validatie: gerichte re-run (`DOGFOOD_ONLY=strategist`) → **COMPLETED, 241,9s, $0,0899, truncated=false** (r1: 234,5s — zelfde orde).

Volledige les: gotcha **2026-07-12** in `gotchas.md`. Structureel meer output-ruimte dan 21.333 vereist een **streaming-refactor van de loop** — logisch te koppelen aan Fase-2 background-execution.

---

## Guardrail #2 — kosten & betrouwbaarheid (de sweep)

| Agent | Use-case | Status | $ kosten | Latency | In/Out tokens | Artefacten (F-VAL) | Δ vs ronde 1 |
|---|---|---|---|---|---|---|---|
| research-analyst | market-question | COMPLETED | $0,0919 | 612,7s | 16.858/2.758 | REPORT | ≈ gelijk (615,0s) |
| brand-guardian | review-content | COMPLETED | $0,0579 | 75,6s | 11.928/1.474 | REPORT, FINDINGS (F-VAL **71**) | F-VAL 75→71 |
| content-creator | create-content | AWAITING_CONFIRMATION | $0,1079 | 26,7s | 29.163/1.360 | REPORT, PROPOSAL | ≈ gelijk |
| market-analyst | competitive-analysis | COMPLETED | $0,1267 | 51,9s | 30.478/2.353 | REPORT | ≈ gelijk |
| strategist | strategy-foundation | **FAILED → na fix COMPLETED** | $0 → $0,0899 | 0,0s → 241,9s | 0/0 → 15.339/2.925 | — → REPORT | **regressie gevonden + gefixt** |
| data-analyst | content-production | COMPLETED | $0,0500 | 15,7s | 13.338/668 | REPORT, TABLE×2 | ≈ gelijk |

**Sweep $0,4345 · na strategist-fix effectief 6/6 geslaagd · ~$0,09/run.** Het kostenbeeld van ronde 1 (input-tokens = merk-DNA-injectie domineert; onderbouwt "merkcontext nooit meteren") wordt exact gereproduceerd.

## Guardrail #1 — F-VAL van agent-content

- **Eindcontent (confirm-pad)**: Milo's PROPOSAL bevestigd → echte Canvas-generatie (linkedin-post → gpt-5.4) → **F-VAL 73** (drempel >70 ✓; r1: 76).
- **Brand-guardian review**: F-VAL **71** op hetzelfde reviewsample als ronde 1 (75) — eerste variantie-indicatie op identieke input: ±4 punten bij n=1. Voor trend-conclusies is n≥3 per meting nodig.

## Credit-metering — eerste praktijkvalidatie (nieuw t.o.v. ronde 1)

| Assert | Verwacht (ontwerp) | Gemeten | ✓ |
|---|---|---|---|
| Sweep, 5 niet-billable agents | geen charge | 0 transacties | ✓ |
| Sweep, Milo-run eindigt AWAITING_CONFIRMATION | geen charge op proposal-tokens (charge hoort bij confirm) | 0 transacties | ✓ |
| Confirm-pad, deliverable gemaakt | flat 3 credits, idempotent | **−3 DEDUCT**, `agent-deliverable`, `agent:content-creator`, `balanceAfter 7`, idempotencyKey `agent-confirm:<runId>:<deliverableId>` | ✓ |

Bijvangst: het confirm-harnas miste de confirm-time charge die de route sinds Fase 3 heeft (harnas was ouder dan de credits-landing) — **route-parity hersteld** in `agents-confirm-path.ts`.

---

## Bevindingen

1. **Strategist-regressie** (fataal, productie) — zie hoofdvondst. Fix geleverd + gevalideerd. → gotcha 2026-07-12.
2. **Angle-generator-truncatie NIET verholpen** door de ronde-1-fix: opnieuw MAX_TOKENS bij budget 1800 met slechts 214 chars zichtbare output — **Gemini 2.5-flash eet thinking-tokens uit hetzelfde `maxOutputTokens`-budget**. Non-fataal (fallback werkte, generatie slaagde). *Open: thinking begrenzen via `thinkingConfig` óf budget herzien mét thinking meegerekend.*
3. **De oorspronkelijke strategist-truncatie zit in een sub-stap, niet in de loop**: `createClaudeStructuredCompletion` (ai-caller, gedeelde default 16k, Haiku 4.5) kapte opnieuw af bij 57.606 chars. De ronde-1-fix zat dus op de verkeerde knop. Non-fataal (run COMPLETED). *Open: per-step `maxTokens`-override (≤21.333) op de strategist-subtool, mét eigen validatierun — géén globale default-bump (raakt alle features, zie gotcha 2026-05-24).*
4. **Research-latency onveranderd ~613s** — het Fase-2-argument (background-execution + notificatie) blijft onverminderd staan.
5. **F-VAL nog steeds niet op rauwe REPORTs** (ronde-1-finding #1) — blijft open; labeling-mitigatie (concept-banner) is wél live en geverifieerd.
6. **Strategist leverde dit keer géén PROPOSAL** (run eindigt COMPLETED met alleen REPORT; r1: REPORT+PROPOSAL) — agent-gedragsvariantie, geen bug; relevant voor verwachtingen rond de confirm-inbox.

## Betekenis voor de Fase-2/3 go/no-go

- Beide oorspronkelijke guardrails blijven met echte data ingevuld en reproduceerbaar; **de credit-keten op agents is nu ook bewezen** — er is geen instrumentatie-blocker meer voor Fase 2.
- De hoofdvondst versterkt het procespunt: **elke budget/timeout-wijziging in de agent-keten vereist een echte validatierun** (`DOGFOOD_ONLY` maakt dat goedkoop: ~$0,09, ~4 min).
- Aanbevolen vervolg, in volgorde: (1) deze sweep **op productie** herhalen met `EXA`/`S2`-keys (staat sinds ronde 1 open; keys zijn user-held); (2) findings #2/#3 als kleine hygiëne-taak; (3) de streaming-refactor van de loop meenemen in het Fase-2-ontwerp (lost #3 structureel op én is nodig voor >21.333-output).

Ruwe data: `agents-dogfood-2026-07-12.jsonl` (sweep) + `agents-dogfood-2026-07-12-strategist-retry.jsonl` (fix-validatie).
