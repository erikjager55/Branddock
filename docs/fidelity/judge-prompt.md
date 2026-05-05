# LLM-Judge Prompt — Drift-Meting

> Datum: 2026-05-05
> Auteur: Claude (week 1, dag 3 — onderdeel drift-protocol design)
> Doel: judge-prompt en cross-family rotatie voor de drift-meting,
> met expliciete positie als parallel signaal naast (niet vervangend voor) menselijke evaluatie.

---

## 1. Positionering — wat dit document NIET is

Dit is **niet** de productie F-VAL G-Eval rubric (6 dimensies, volledige fidelity-score). Dat komt in week 4-5 als pijler 2 wordt geïmplementeerd.

Dit is **wel** de drift-meting judge: een gerichte voice-fit-evaluatie van 6 outputs (3 merken × 2 condities, of 4 merken × 2 condities, finaal aantal afhankelijk van Brand Foundation completeness check).

**Belangrijke methodologische beperking**: LLM-scores zijn een parallel signaal, **niet** de basis voor de Route A/B/C-beslissing. Reden:
- Self-preference bias: een LLM-judge waardeert mogelijk output van zijn eigen modelfamilie hoger
- Verbosity bias: judges geven hogere scores aan langere outputs ongeacht informatiewaarde
- Echo-chamber: twee Opus-instances als judge produceren correlerende fouten

Definitieve Route A/B/C-beslissing wacht op menselijke ratings van LINFI/Nobox/WRA-contacten. LLM-scores leveren vroege indicatie en flagging van onverwachte uitkomsten.

---

## 2. Cross-family rotatie

| Rol | Model | Familie | Positie |
|-----|-------|---------|---------|
| Generator | `claude-opus-4-7-20260301` | Anthropic | Maakt de 6 drift-outputs |
| **Primary judge** | `gpt-5` (of `gpt-5-2026-XX-XX` huidig) | OpenAI | Cross-family: andere familie dan generator |
| Parallel judge | `claude-sonnet-4-6-20251001` | Anthropic | Same-family: dient als agreement-meting |
| Beslisser | Menselijke evaluators | — | Definitief |

**Logica**: GPT-5 is de primary signal omdat hij geen self-preference voor de Opus-output heeft. Sonnet 4.6 is parallel om te checken of de twee judges consistent scoren (= LLM-scoring is stabiel) of divergeren (= scoring is instabiel, vertrouw alleen humans).

**Agreement-formule**: per output berekenen we per dimensie `|gpt5_score − sonnet_score|`. Als gemiddelde delta over alle 4 dimensies > 1.5 (op 1-10 schaal) → flag als "high disagreement", niet meenemen in LLM-aggregaat.

---

## 3. De 4 dimensies — gericht op drift, niet op volledige fidelity

| # | Dimensie | Wat het meet | Schaal |
|---|----------|--------------|--------|
| 1 | **Voice-fit** | Match tussen declared brand voice (uit Brand Foundation) en de output | 1-10 |
| 2 | **Brand-recognition** | Zou een geïnformeerde lezer deze tekst herkennen als afkomstig van dit specifieke merk, blind getoond? | 1-10 |
| 3 | **Naturalness** | Leest dit als natuurlijke menselijke tekst, of als AI-output? | 1-10 |
| 4 | **Fluency** | Grammaticale correctheid + vloeiende leesbaarheid | 1-10 |

**Niet meegenomen** (komt in pijler 2 productie-judge): strategische verankering, doelgroep-fit per persona, anti-pattern compliance op rule-niveau, conciseness. Drift-meting test specifiek of voice-data tot voice-fit leidt.

---

## 4. Judge-prompt — definitieve template

Drie sub-prompts: één gemeenschappelijke setup + één per dimensie. Wordt batched per output.

### 4.1 System prompt (gedeeld over beide judges)

```
You are an expert evaluator of brand-aligned content quality. You assess whether
generated content authentically reflects a brand's declared voice, tone, and identity.

You will receive:
1. A brand voice declaration (the brand's stated personality, tone, vocabulary, and style)
2. A piece of generated content (typically long-form: blog post, case study, or thought leadership piece)
3. A specific evaluation dimension to score

Score on a 1-10 integer scale:
- 1-2: Severely off-brand, unrecognizable
- 3-4: Off-brand, multiple violations
- 5-6: Partial match, mixed signals
- 7-8: Good match, minor inconsistencies
- 9-10: Strong match, fully on-brand

Avoid these biases:
- Verbosity bias: do NOT reward longer outputs unless extra length adds informative value
- Self-preference bias: do NOT favor content that resembles your own typical outputs
- Halo effect: score each dimension independently; do not let one strong/weak signal influence others

Return strict JSON only — no preamble, no markdown fence.
```

### 4.2 Dimension-specific user prompt

```
## Brand voice declaration

{bvd_output}

## Generated content (length: {wordCount} words, content type: {contentType})

{generatedContent}

## Evaluation task

Score the dimension: **{dimensionName}**

{dimensionDefinition}

Return JSON with this exact shape:
{
  "score": <integer 1-10>,
  "reasoning": "<2-3 sentences citing specific passages from the content>",
  "exampleStrong": "<short quote from content showing strong alignment, or empty if none>",
  "exampleWeak": "<short quote from content showing misalignment, or empty if none>"
}
```

### 4.3 Dimension-definitions (per dimensie)

**Voice-fit:**
> Voice-fit measures whether the content authentically reflects the brand's declared personality dimensions, tone positioning, vocabulary preferences, and stylistic guidelines. Compare the content against:
> - Aaker dimension scores and primary/secondary dimension
> - Spectrum slider positions (formal↔casual, etc.)
> - Tone dimensions (formal↔casual, serious↔funny, etc.)
> - "Words we use" and "Words we avoid" lists
> - Channel-specific tone guidance (if specified for this channel)
>
> Do not score for general writing quality — that is dimension 4 (Fluency).
> Do not score for whether the content is recognizable as the brand — that is dimension 2 (Brand-recognition).

**Brand-recognition:**
> Brand-recognition measures whether a knowledgeable reader, shown only this content without the brand name, could plausibly identify it as belonging to this specific brand based on distinctive voice markers. Higher score = more distinctive. Lower score = generic, could be any brand in the same industry.
>
> Look for: signature phrases, distinctive metaphors, characteristic sentence structures, specific vocabulary patterns. Generic professional writing scores 4-5 even if voice-fit is high.

**Naturalness:**
> Naturalness measures whether the content reads as written by an experienced human writer, versus reading as AI-generated output. Score lower for: repetitive phrasing, hedge-heavy openings, formulaic transitions, over-explained obvious points, generic AI tropes ("In today's fast-paced world..."), bullet-list addiction, robotic parallelism.
>
> Score independent of brand voice match — a piece can be on-brand but feel AI-written, or off-brand but feel human-written.

**Fluency:**
> Fluency measures grammatical correctness and reading flow. Score lower for: grammar errors, awkward sentence structures, unclear referents, broken parallelism, run-on sentences, choppy paragraphs, language inconsistencies (e.g., partial English in Dutch content).
>
> This is the most objective dimension. Both judges should agree closely on fluency scores; large disagreement here suggests one judge is unreliable.
```

### 4.4 Output JSON-schema (full evaluation per output)

```json
{
  "deliverableId": "string",
  "brandSlug": "string",
  "condition": "A" | "B" | "C",
  "contentType": "string",
  "wordCount": "number",
  "judgeProvider": "openai" | "anthropic",
  "judgeModel": "string",
  "computedAt": "ISO timestamp",
  "scores": {
    "voiceFit": { "score": 7, "reasoning": "...", "exampleStrong": "...", "exampleWeak": "..." },
    "brandRecognition": { "score": 6, "reasoning": "...", "exampleStrong": "...", "exampleWeak": "..." },
    "naturalness": { "score": 8, "reasoning": "...", "exampleStrong": "...", "exampleWeak": "..." },
    "fluency": { "score": 9, "reasoning": "...", "exampleStrong": "...", "exampleWeak": "..." }
  },
  "compositeScore": "number (avg of 4)"
}
```

---

## 5. Aggregatie + agreement-meting

Per output (n = 6 of 8 afhankelijk van merken-aantal):

1. Run GPT-5 judge → 4 scores
2. Run Sonnet 4.6 judge → 4 scores
3. Bereken per dimensie `|gpt5 − sonnet|`
4. Per output: `agreement = 10 - mean(absolute_deltas) * 2`  → schaal 0-10 (10 = perfecte overeenstemming, 0 = totale divergentie)
5. Als `agreement < 7` → flag voor handmatige review, niet meenemen in LLM-aggregaat

Per conditie (A vs B):
- Composite voice-fit: gemiddelde over alle outputs in die conditie (alleen high-agreement)
- Drift A→B = composite_B − composite_A
- Significantie: paired comparison per merk per type (A vs B), n = aantal merk-type combinaties

---

## 6. Hoe LLM-scores worden gerapporteerd in `week1-findings.md`

```markdown
### LLM-scoring (parallel signaal — niet beslissingsbasis)

| Conditie | GPT-5 voice-fit | Sonnet 4.6 voice-fit | Agreement | Drift vs A |
|----------|-----------------|----------------------|-----------|------------|
| A (baseline) | 7.2 ± 0.8 | 6.9 ± 0.9 | 8.4/10 | — |
| B (structured) | 8.1 ± 0.6 | 7.8 ± 0.7 | 8.7/10 | +0.9 (LLM) |

Agreement-uitlieren: 0 outputs (alle ≥7 agreement)

**LLM-indicatie**: Conditie B haalt meetbaar betere voice-fit dan A in beide judges,
met hoge inter-judge agreement. Voorlopig signaal richting Scenario B.

**Definitief oordeel wacht op menselijke ratings.**
```

---

## 7. Implementatie-bestanden (research-script)

| File | Rol |
|------|-----|
| `scripts/fidelity/judge.ts` | Entry point: leest 6 outputs, dispatcht naar beide judges, schrijft scores naar JSON |
| `scripts/fidelity/judge-prompts.ts` | Template-strings voor system + 4 dimensie-prompts |
| `scripts/fidelity/judge-config.ts` | Cross-family rotation map, model IDs, agreement threshold |
| `scripts/fidelity/score-aggregate.ts` | Reads scores JSON, computes agreement + drift, outputs markdown report |

Te bouwen na completeness-data binnen is en protocol v0.2 pre-geregistreerd.

---

*Status: design-document gereed. Wordt referentie voor scripts/fidelity/judge.ts.*
