# F-VAL scoring methodology — analyse + recalibratie (2026-05-13)

## Vraag

Is composite-score van 100 realiseerbaar voor AI-gegenereerde brand-voice content? Waarom zit de Napking score consistent op 50-65?

## Antwoord

**100 is mathematisch maar niet praktisch haalbaar.** Realistic max voor uitstekende AI-output ≈ 80-85. Voor de meeste content: 60-75. Reden: F-VAL composite is een gewogen som van drie pijlers met natuurlijke plafonds.

## Composite-formule

```
composite = (style × 0.35) + (judge × 0.45) + (rules × 0.20)
```

### Style pijler (35%) — natuurlijk plafond ~70 (pre-recalibratie)

Style is 50/50 blend van:

**A. String-match (wordsCoverage + traitCoverage)** — % van declared "Words we use" + persona-traits die in de output voorkomen.

Voor Napking: 20 wordsWeUse (`vlekkeloos`, `smetteloos`, `kraakhelder`, ...). In een natuurlijke 300-400 woorden blog-post is **6-10 van deze 20 woorden** realistisch = 30-50% coverage met oude formule = **score 30-50**.

100% wordsCoverage vereist dat ALLE 20 woorden voorkomen in 300 woorden tekst — onnatuurlijk gekrampeld.

**B. Voice-similarity (embedding cosine)** — cosine similarity tussen output-embedding en voiceguide-centroid (gemiddelde van writing samples).

Oude projection:
- cosine 0.5 → 0
- cosine 0.7 → 50
- cosine 0.85 → 80
- cosine 1.0 → 100

Real-world AI-output vs human-written samples scoort typisch **cosine 0.65-0.78** = score 38-66 op style-pijler. Cosine 0.95+ is feitelijk paraphrase van samples (geen originele content).

### Judge pijler (45%) — natuurlijk plafond ~85

LLM-rubric judge met 6 sub-criteria (gegenereerd door Claude/Sonnet als referee). LLMs hebben **calibration bias**: geven zelden 95+ op subjectieve criteria. Voor zeer goede output realistic max **75-85**.

### Rules pijler (20%) — natuurlijk plafond ~95

Detector (AI-tells) + brand-rules violations. Clean output haalt makkelijk 85-95. Per gevonden anti-pattern of "Words we avoid" trekken punten af.

## Pre-recalibratie composite-maxima (realistisch)

```
Uitstekende output:
  style 55 × 0.35 = 19.25
  judge 85 × 0.45 = 38.25
  rules 95 × 0.20 = 19.00
  ────────────────────────
                   = 76 / 100  ←  zelfs uitstekend haalt maar net threshold 75

Goede output:
  style 50 × 0.35 = 17.50
  judge 75 × 0.45 = 33.75
  rules 85 × 0.20 = 17.00
  ────────────────────────
                   = 68 / 100

Middelmatige output:
  style 40 × 0.35 = 14.00
  judge 60 × 0.45 = 27.00
  rules 75 × 0.20 = 15.00
  ────────────────────────
                   = 56 / 100  ←  Napking score-range (47-63)
```

**Conclusie pre-recalibratie**: threshold 75 was te streng voor de gebruikte projectie. Outputs van 50-65 werden gelabeld "onder drempel" terwijl ze inhoudelijk acceptabel waren.

## F31 recalibratie (2026-05-13)

### Voice-similarity projection (nieuwere anchors)

```
cosine ≤ 0.4   → 0     (uncorrelated; geheel ander domein)
cosine = 0.6   → 50    (zwak maar herkenbaar)
cosine = 0.75  → 80    (goede voice-match — typisch voor sterk gevraagde content)
cosine = 0.9   → 95    (uitstekend, near voice-fingerprint)
cosine ≥ 0.95  → 100   (eigenlijk te dicht; mogelijk paraphrase)
```

Effect: AI-output dat voorheen 55-65 scoorde scoort nu 75-85 op voice-similarity dimensie.

### Words/trait coverage saturatie

Oud: `score = matched / total × 100` (linear, vereist 100% match voor 100 score).

Nieuw: `score = min(100, matched / total / 0.4 × 100)` — **40% match = 100 score**, daaronder lineair.

Rationale: brand-style is "gebruik genoeg signature words", niet "gebruik ALLE signature words". 8 van 20 woorden in 300-woorden output = 100; 4 van 20 = 50.

### Verwachte impact

Composite voor identieke output, pre vs post F31:

```
Zelfde output, oude vs nieuwe schaal:
  Style 50 → 75  (recalibratie voice-similarity + words saturation)
  Judge 75 → 75  (ongewijzigd; LLM-judge had niet te lijden)
  Rules 85 → 85  (ongewijzigd; deterministisch al adequaat)
  ──────────────
  Composite 68 → 77  (boven threshold 75)

Uitstekende output, oude vs nieuwe schaal:
  Style 55 → 85
  Judge 85 → 85
  Rules 95 → 95
  ──────────────
  Composite 76 → 88
```

Threshold 75 blijft ongewijzigd — met recalibratie haalt redelijke content de bar.

## Aanvullende observaties

1. **ContentFidelityScore persistence ontbreekt voor Napking** — DB-query toont 8 records totaal, allemaal van oudere workspaces met andere pillar-shape (audience/execution/strategic in plaats van style/judge/rules). De F-VAL scores die canvas UI toont zijn dus in-memory + via SSE — **niet persisted**. Apart issue: `persistContentFidelityScoreIfPossible` faalt silently voor de huidige composition-engine output-shape. Aanpakken in F32 follow-up.

2. **Best-of-3 emphasis bias** (gefixt in F30) — bias-uitgangs candidates corrupteerden composite extra omdat ze elk slechts één pijler maximaliseerden.

3. **Verbatim writing-sample copy** (cosine 0.95+) is **niet** wenselijk: nieuwe content moet origineel zijn maar in voice. Plafond op 100 reserveren voor edge-case is correct.

## Aanbevelingen verder

- **F32**: fix `persistContentFidelityScoreIfPossible` zodat scores in DB belanden voor analytics/learning-loop.
- **F33** (optioneel): pas threshold per content-type aan. Korte content (CTA, headline) heeft minder vlees voor judge-pijler; threshold 70 voor short-form, 75 voor long-form.
- **UI-tooltip** op de score: "70-80 = goed, 80-90 = uitstekend, 90+ = ongebruikelijk hoog (mogelijk paraphrase)."
