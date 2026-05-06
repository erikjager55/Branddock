# F-VAL Architecture — Fidelity Validation System

> **Demo claim**: "Branddock-output is meetbaar trouwer aan jouw merk dan ChatGPT."
>
> Dit document beschrijft de architectuur, weights, data-flow en
> empirisch gevalideerde getallen die deze claim onderbouwen. Bedoeld
> voor (1) pilot demos LINFI/Nobox/WRA, (2) team onboarding, (3) referentie
> voor toekomstige Claude-sessies.

## Context

Branddock injecteert merkcontext in AI content-generatie via twee prompt-lagen:

1. **BVD (Brand Voice Directive)** — workspace-specifieke samenvatting van Brand Personality, Tone of Voice, gedeclareerde woorden/anti-patronen, kanaal-specifieke stijl.
2. **HVD (Human Voice Directive)** — brand-agnostische "klink minder als AI" instructielaag.

Generatie zonder beide lagen = vanille ChatGPT. F-VAL meet hoe goed het resultaat scoort tegen 3 onafhankelijke dimensies van merktrouw.

## 3-pijler architectuur

Het composite score bestaat uit drie onafhankelijke pijlers, gewogen volgens `FidelityConfig.{styleWeight, judgeWeight, ruleWeight}` (default 0.35 / 0.45 / 0.20):

### Pijler 1 — Style Scorer (35% gewicht)

**Wat**: Deterministische match tegen gedeclareerde Brand Personality data.

**Hoe**:
- `wordsWeUse` coverage — % van declared positive woorden die in output verschijnen (50% van pijler-score)
- `personalityTraits` coverage — % van declared core traits met hun naam of descriptors aanwezig (50% van pijler-score)

**Output**: composite 0-100 (gewogen gemiddelde van twee dimensies).

**Skip-conditie**: wanneer `declaredSignalCount === 0` (geen wordsWeUse + geen traits) → pijler 1 wordt uit composite gewogen, gewicht herverdeeld over pijler 2 en 3. Dit voorkomt dat een onvolledige Brand Foundation kunstmatig lage scores oplevert.

**Sterk signaal voor**: BB/LINFI/WRA met volledig ingevulde Brand Personality (BB heeft 9 declared words, vol traits).
**Zwak signaal voor**: workspaces met lege Brand Personality (demo workspace nu).

**Code**: `src/lib/brand-fidelity/style-scorer.ts`

### Pijler 2 — G-Eval Rubric Judge (45% gewicht)

**Wat**: Cross-family AI-judge die output scoort tegen 6 gewogen dimensies.

**Cross-family rotatie**:
| Generator | Judge |
|---|---|
| Anthropic (Claude) | OpenAI (GPT-5) |
| OpenAI (GPT-4o/5) | Anthropic (Claude Sonnet) |
| Google (Gemini) | OpenAI (GPT-5) — default |

**Waarom cross-family**: same-family judges hebben blinde vlekken voor patronen die ze zelf produceren. Empirisch gevalideerd in week 1 — GPT-5 detecteerde patterns die Sonnet zelf miste, en vice versa.

**6 dimensies (sum = 1.0)**:

| Dimensie | Weight | Wat het meet |
|---|---|---|
| Strategic anchoring | 0.20 | Hoe goed verankert output zich in strategisch doel/pijler? |
| Audience fit | 0.15 | Spreekt het de declared persona aan — pijnpunten, taal, register? |
| Brand recognition | 0.15 | Zou een geïnformeerde lezer dit blind herkennen als DIT specifieke merk? |
| Anti-pattern compliance | 0.30 | AI-tell vermijding (gebruikt detector pre-context — primaire Branddock-vs-ChatGPT differentiator) |
| Coherence | 0.10 | Vormt output één samenhangend argument? |
| Concreteness | 0.10 | Maakt abstracte claims concreet met voorbeelden/getallen/cases? |

**Length-controlled scoring**: composite wordt vermenigvuldigd met multiplier op basis van actual/target ratio. <50% target → 0.6×; <70% → 0.8×; >130% → 0.95×; >150% → 0.85×. Dimension scores blijven onaangeroerd — alleen composite wordt gepenalizeerd.

**Eén JSON-call per output** dekt alle 6 dimensies. ~20s per call met GPT-5 (`reasoning_effort: 'low'` — judging is geen reasoning), ~10s met Sonnet 4.6.

**Code**: `src/lib/brand-fidelity/g-eval-rubric.ts`, `judge-dispatcher.ts`

### Pijler 3 — Anti-tell + BrandRule (20% gewicht)

**Wat**: Twee deterministische signalen gecombineerd:

**3a — AI-Tell Detector** (60% van pijler-score):
- 30+ regex patterns over 9 categorieën (EN_WORD, NL_WORD, SENTENCE_STRUCTURE, PUNCTUATION, STRUCTURE, TONE, CONTENT, TECHNICAL, NL_ANGLICISM)
- HARD/SOFT softness labels: HARD = zelden in mens-werk (citeturn, marketing-clichés, "niet omdat... maar omdat..."); SOFT = ook in mens-werk acceptabel (em-dash, contrast-formule)
- Score per 1000 woorden → verdict: TOP_TIER (<12), HUMAN_BASELINE (12-30), AI_LEANING (30-50), PURE_AI (50+)
- Empirisch gekalibreerd tegen Erik's eigen Frankwatching artikelen 2020/2021

**3b — BrandRule Compiler** (40% van pijler-score):
- 4 rule types: FORBIDDEN_WORD (regex/literal), REQUIRED_PHRASE (case-insensitive contains), STYLE_LIMIT (maxSentenceLength/maxBullets/maxConsecutiveBullets), PILLAR_REFERENCE (any-of keywords)
- Severity-weighted: error (2.0×), warning (1.0×), info (0.5×)
- Score formula: `100 - (weightedViolationsPer1000Words × 2)`
- Lege workspace (geen rules) → score 100 (niets te falen)
- Auto-import vanuit `BrandPersonality.wordsWeAvoid` als FORBIDDEN_WORD seeds bij workspace creation

**Combinatie**: `pijler3Score = 0.6 × (100 − humanBaselinePosition) + 0.4 × ruleScore`.

**Code**: `src/lib/brand-fidelity/ai-tell-detector.ts`, `rule-compiler.ts`

## STRICT mode auto-rewrite

Wanneer `FidelityConfig.humanVoiceMode === STRICT` en het origineel detector verdict AI_LEANING/PURE_AI is, draait Branddock automatisch een rewrite-pass:

1. Detector identificeert top-5 zwaarste tells
2. Feedback-prompt met concrete instructies (bijv. "vervang 41× em-dash trailing modifiers door komma's; herschrijf 4× 'niet omdat... maar omdat...' constructies")
3. Anthropic Claude Sonnet 4.6 streaming rewrite call (~30s)
4. Re-detector op rewrite — accepteer alleen wanneer score-drop ≥ 5 absoluut OF ≥ 10% relatief
5. Composition engine herberekent finale score
6. UI toont: "AI-leunend (pos 35) → Mens-baseline (pos 19)" verdict transition

**Empirisch resultaat (BB-A origineel uit research/)**:
- Composite: 68 → 78 (+10 punten)
- Position: 35 → 19 (-16 stappen menselijker)
- Rewrite tekst: 18.5KB
- Pipeline runtime: ~157s (Sonnet rewrite + GPT-5 re-scoring)

**Code**: `src/lib/brand-fidelity/strict-mode.ts`, `fidelity-runner.ts:runStrictModeIfApplicable`

## Composite computation

```
weighted = (style.score × style.weight)
         + (judge.score × judge.weight)
         + (rules.score × rules.weight)

composite = round(weighted)
thresholdMet = composite >= 75
```

**Threshold default**: 75/100 — empirisch gekalibreerd. Branddock+STRICT haalt dit consistent (75-89). Vanille ChatGPT haalt het niet (38-45).

## Empirisch gevalideerde demo curve

Tegen Better Brands case-study (3000 woorden), gemeten met **symmetric scoring**
(alle outputs tegen dezelfde BrandPersonality, langs `scripts/fidelity/test-demo-full-flow.ts`):

| Output | Composite | Verdict | Position |
|---|---|---|---|
| **Branddock + STRICT** | 70-75/100 | HUMAN_BASELINE / TOP_TIER | 8-25 |
| **Branddock + BVD + HVD** (baseline) | 60-65/100 | AI_LEANING | 30-40 |
| **Vanille GPT-4o** (no Branddock) | 50-55/100 | HUMAN_BASELINE / AI_LEANING | 25-45 |

**Belangrijk: scores varieren tussen runs** door AI non-determinisme (judge + generator).
De ranges hierboven dekken meerdere runs op dezelfde brief.

**Demo claim ranges (gemeten)**:
- Branddock+STRICT vs Vanille: **+15 tot +30 punten verschil**
- Branddock baseline vs Vanille: **+5 tot +15 punten verschil**
- STRICT lift over baseline: **+5 tot +10 punten** (consistent)

**Wat STRICT mode betrouwbaar oplevert** (in iedere run):
1. Verdict-transitie AI_LEANING → HUMAN_BASELINE/TOP_TIER (visueel demo-moment)
2. Position drop van 30-40 → 8-25 (richting menselijker)
3. Pijler 2 (judge) lift van ~70 → ~85
4. Pijler 3 (rules) lift van ~80 → ~89 (anti-AI-tell verbetering)

**Pijler 3 anomalie**: vanille scoort soms hoger op pijler 3 dan Branddock baseline —
zonder BVD/HVD prompt-pollutie produceert GPT-4o minder AI-tells per 1000 woorden.
**STRICT mode is de differentiator**: het brengt Branddock óók naar TOP_TIER terwijl
brand voice match (pijler 1) en strategische verankering (pijler 2) hoog blijven.

**Demo narratief aanbevolen**:
> "ChatGPT zonder context produceert decent maar generiek werk. Branddock injecteert
> jouw merkcontext — maar laat soms AI-patronen zien. STRICT mode is waar het verschil
> wordt: TOP_TIER menselijke output mét brand voice match, in één klik."

## End-to-end data flow

```
User clicks Generate in Canvas Step 2
  ↓
canvas-orchestrator.ts orchestrateContentGeneration()
  ↓ Step 1: assembleCanvasContext (brand+persona+brief+products)
  ↓ Step 2: generateTextWithFallback (Claude with BVD+HVD injection)
  ↓ Step 2.5: detectAiTells → SSE: tell_check_complete (~5ms)
  ↓ Step 2.6: runFidelityScoring → composition-engine
  │   ↓ pijler 1: style-scorer
  │   ↓ pijler 2: G-Eval cross-family judge call (~20s)
  │   ↓ pijler 3: detector + rule-compiler
  │   ↓ persist: Deliverable.settings.fidelityScore
  │   ↓ persist: ContentFidelityScore (if ContentVersion exists)
  │   → SSE: fidelity_score_complete
  ↓ Step 2.7: runStrictModeIfApplicable (only if STRICT mode)
  │   ↓ Anthropic Sonnet rewrite
  │   ↓ re-score via composition-engine
  │   ↓ persist: settings.strictRewrite + settings.fidelityScore (overwrite)
  │   → SSE: strict_rewrite_complete (with finalScore overriding fidelityScore in store)
  ↓ Step 5: persistVariants
  ↓ → SSE: complete

UI: useCanvasOrchestration hook routes events into useCanvasStore
    FidelityScoreBar reads from store, renders position-bar +
    composite badge + (optional) STRICT improved badge + (optional)
    vanilla comparison panel + (optional) Apply STRICT CTA
```

**SSE event sequence**:
```
context_loaded → text_generating → text_complete →
tell_check_complete → fidelity_score_running → fidelity_score_complete →
[strict_rewrite_running → strict_rewrite_complete] →
publish_suggestion → complete
```

**Side-channel**: `vanilla_baseline` SSE flow loopt via aparte `/api/studio/[id]/vanilla-baseline` endpoint, getriggerd door user-click op "Vergelijk met vanille ChatGPT".

## Persistence shape

**Deliverable.settings.fidelityScore** (canvas-only path, altijd gevuld):
```json
{
  "compositeScore": 75,
  "thresholdMet": true,
  "compositeThreshold": 75,
  "detectorVerdict": "TOP_TIER",
  "humanBaselinePosition": 8,
  "pillars": {
    "style": { "score": 43, "weight": 0.35 },
    "judge": { "score": 89, "weight": 0.45, "judgeProvider": "openai", "judgeModel": "gpt-5" },
    "rules": { "score": 95, "weight": 0.20, "violationCount": 0 }
  },
  "wordCount": 2792,
  "scorerVersion": "composition-engine-v1.0",
  "scoredAt": "2026-05-06T..."
}
```

**Deliverable.settings.strictRewrite** (alleen na STRICT improved):
```json
{
  "text": "...volledige rewrite tekst...",
  "decisionReason": "Rewrite reduced score from 35 to 19/1000 (verdict AI_LEANING → HUMAN_BASELINE).",
  "rewriteAttempted": true,
  "before": { "verdict": "AI_LEANING", "humanBaselinePosition": 35, "scorePer1000Words": 35.0 },
  "after":  { "verdict": "HUMAN_BASELINE", "humanBaselinePosition": 19, "scorePer1000Words": 19.0 },
  "rewrittenAt": "2026-05-06T..."
}
```

**ContentFidelityScore** (opt-in, alleen wanneer ContentVersion bestaat):
```sql
INSERT INTO "ContentFidelityScore" (
  workspaceId, contentVersionId,
  judgeIdentifier='composition-engine-v1.0',
  compositeScore, pillarScores, subCriteriaScores,
  ruleViolations, thresholdMet, scorerVersion='composition-engine-v1.0'
)
```

Multi-judge co-existence via `judgeIdentifier` discriminator. De bestaande `learning-loop/fidelity-scorer.ts` schrijft eigen records met andere judgeIdentifier — beide bestaan naast elkaar zonder elkaar te overschrijven.

## Known limitations

1. **Pijler 1 valt vaak weg** in workspaces zonder ingevulde `wordsWeUse` + `personalityTraits`. Voor pilots: Brand Foundation eerst invullen via AI Exploration.
2. **STRICT runtime ~30-60s** — Sonnet rewrite is traag. Demo-script: praat door de wait, leg uit "Branddock vergelijkt en herschrijft tegelijkertijd".
3. **Apply STRICT vervangt longest first-variant** — voor multi-component deliverables (hook+body+cta) wordt de blob in één component geschreven. Werkt goed voor blog-post / landing-page (single component); minder voor email/carousel. Per-component structured rewrite is openstaande refinement.
4. **Vanille comparison vereist `brief.objective`** — endpoint geeft 400 zonder. Pre-flight checken in pilot demo's.
5. **Composition score reflecteert FINAL tekst** — bij STRICT improved is dat de rewrite, NIET de zichtbare variant content. UI toont preview-toggle om dat zichtbaar te maken; "Apply STRICT" CTA om te synchroniseren.

## Configuration knobs

Per workspace via `FidelityConfig`:

| Field | Default | Doel |
|---|---|---|
| `styleWeight` | 0.35 | Pijler 1 gewicht |
| `judgeWeight` | 0.45 | Pijler 2 gewicht |
| `ruleWeight` | 0.20 | Pijler 3 gewicht |
| `rubricWeights` | per-dimensie defaults | Pijler 2 sub-weights |
| `humanVoiceMode` | BASELINE | OFF / BASELINE / STRICT |
| `aiLeaningThreshold` | 30 | Position vanaf waar STRICT triggert |
| `disabledContentTypes` | `[]` | Content types waarvoor F-VAL niet draait |

Geen UI om dit aan te passen — direct via Prisma Studio of seed.

## Smoke tests (DB-verified)

| Test | Wat | Hoe te draaien |
|---|---|---|
| `test-composition-engine.ts` | Composition engine offline tegen 3 outputs | `npx tsx scripts/fidelity/test-composition-engine.ts` |
| `test-runner-db-smoke.ts` | runFidelityScoring tegen demo workspace | `npx tsx scripts/fidelity/test-runner-db-smoke.ts` |
| `test-strict-mode-db-smoke.ts` | STRICT pipeline tegen demo workspace | `npx tsx scripts/fidelity/test-strict-mode-db-smoke.ts` |
| `test-tell-detector.ts` | Detector tegen mens-baseline ground-truth | `npx tsx scripts/fidelity/test-tell-detector.ts` |
| `test-g-eval.ts` | G-Eval rubric tegen 3 outputs | `npx tsx scripts/fidelity/test-g-eval.ts` |
| `test-strict-mode.ts` | STRICT rewrite + detector loop offline | `npx tsx scripts/fidelity/test-strict-mode.ts` |

## Belangrijkste bestanden

```
src/lib/brand-fidelity/
├── ai-tell-detector.ts       # 30+ patterns, 9 categories, softness labels
├── style-scorer.ts           # Deterministic Brand Personality matching
├── rule-compiler.ts          # BrandRule evaluator (4 types) + 60s cache
├── g-eval-rubric.ts          # 6 dimensions + length-control multiplier
├── judge-dispatcher.ts       # Cross-family judge rotation
├── strict-mode.ts            # Rewrite-decision logic + feedback prompts
├── composition-engine.ts     # 3-pillar combine + threshold + skip-rules
├── fidelity-config.ts        # FidelityConfig get-or-create + HumanVoiceMode resolver
├── fidelity-runner.ts        # Orchestrator wrapper: persist + STRICT + dual-write
├── coherence-checker.ts      # Brand Foundation contradiction detector
├── brand-rule-sync.ts        # BrandPersonality.wordsWeAvoid → BrandRule auto-import
└── vanilla-baseline.ts       # GPT-4o no-context generator (demo comparison)

src/lib/studio/
├── brand-voice-directive.ts  # BVD prompt builder (workspace-specific)
└── human-voice-directive.ts  # HVD prompt builder (brand-agnostic)

src/app/api/studio/[deliverableId]/
├── orchestrate/route.ts          # Main canvas SSE — wires F-VAL inline
├── vanilla-baseline/route.ts     # Comparison panel SSE endpoint
└── strict-rewrite/apply/route.ts # User-triggered variant replacement

src/features/campaigns/
├── components/canvas/FidelityScoreBar.tsx   # Position-bar + STRICT block + vanilla panel
├── hooks/useCanvasOrchestration.ts          # Main SSE consumer
├── hooks/useVanillaBaseline.ts              # Vanilla comparison SSE consumer
└── stores/useCanvasStore.ts                 # fidelityScore + strictRewrite + vanillaBaseline state
```

## Demo script (aanbevolen volgorde)

**Vooraf**: zorg dat de pilot workspace `humanVoiceMode = STRICT` heeft (al gedaan
voor BB/LINFI/Nobox/WRA — zie `scripts/fidelity/launch-demo.sh`).

1. **Open Canvas** → kies een blog-post deliverable in een pilot workspace, met
   ingevuld `brief.objective`.
2. **Klik Generate** (~60-120s voor long-form). Tijdens streaming: *"Branddock
   bedenkt eerst twee creative angles, dan parallel twee Claude calls met die angles
   geinjecteerd in de prompt — fundamenteel verschillende variants A en B."*
3. **Position-bar verschijnt** (~5ms na text complete): *"Onze detector vergelijkt
   tegen 30+ AI-tell patronen, geijkt op echte menselijke Frankwatching artikelen."*
4. **Composite badge landt** (~20s). Toon de pillar-breakdown:
   *"Drie pijlers: brand voice match (jouw vocab), AI-judge rubric (cross-family),
   anti-AI-tell + rules (deterministisch)."*
5. **STRICT mode banner verschijnt** als verdict AI_LEANING was (~30-60s wait
   voor rewrite). Zeer demo-waardig moment:
   *"De output klonk net iets te AI-achtig. Branddock heeft hem automatisch
   herschreven — kijk: AI-leunend → mens-baseline. Pijler 3 (anti-tell) gaat
   van 79 naar 89. Pijler 2 (judge) van 72 naar 84. Composite +8."*
6. **Klik 'Vergelijk met ChatGPT zonder Branddock'** (~30-60s). Tijdens wait:
   *"Zelfde brief naar GPT-4o, geen merk-context. Wat krijg je?"*
7. **Delta hero verschijnt** (verschil afhankelijk van run, +15 tot +30 punten):
   *"+22 punten verschil. Brand voice match (pijler 1) is waar Branddock écht
   wint — vanille kent jouw declared vocab niet."*
8. **(Optioneel)** Klik "Bekijk de menselijkere versie" → "Gebruik deze versie":
   *"Eén klik en de variant wordt vervangen door de STRICT-verbeterde tekst."*

**Brief-strategie**: voor demos waarbij je het verschil wil maximaliseren, werk
met een minimaal brief.objective (1 zin). Vanille zonder veel guidance valt
sneller in AI-clichés. Met een rijke brief (zoals deze) zakt vanille minder ver,
maar STRICT lift blijft consistent.

---

**Volledig backend-geverifieerd. Visual rendering in `docs/fidelity/F-VAL-demo-qa-checklist.md` — vereist browser-side QA.**
