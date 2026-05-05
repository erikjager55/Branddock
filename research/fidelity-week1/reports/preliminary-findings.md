# F-VAL Drift-Meting — Voorlopige Bevindingen

> Datum: 2026-05-05
> Status: **VOORLOPIG — wacht op menselijke ratings voor definitieve Route A/B beslissing**
> Wordt vervangen door `final-findings.md` zodra humans rond zijn

---

## TL;DR

LLM-judges signaleren **drift +0.37** tussen Conditie B (gestructureerde BVD) en Conditie A (huidige BVD), onder de 0.5-drempel uit drift-protocol sectie 7. **Voorlopig signaal richting Route A** — huidige BVD volstaat, geen schema-uitbreiding nodig voor pijler 1.

Met twee scope-aanpassingen ten opzichte van origineel plan:
1. Brand-recognition als aparte dimensie in pijler 2 (G-Eval rubric)
2. Brand Foundation Coherence Check als optionele add-on (uit BB-bevindingen)

**Definitieve beslissing wacht op humans.**

---

## Wat de drift-meting heeft opgeleverd

### Kwantitatief (zie `llm-aggregate.md`)

| Conditie | n | Voice-fit (GPT-5 / Sonnet) | Composite |
|----------|---|----------------------------|-----------|
| A | 5 | 8.00 / 7.60 | 7.0-8.5 spread |
| B | 6 | 8.33 / 8.00 | 5.8-8.5 spread |

Drift B − A: GPT-5 +0.33, Sonnet +0.40, gemiddeld **+0.37**. 11/12 outputs in high-agreement (delta ≤ 1.5). Eén outlier (Linfi TL-A, delta 1.75).

### Kwalitatief (zie `qualitative-observations.md`)

Drie observaties:
1. Voice-fit en brand-recognition zijn **verschillende meeteenheden** — voice-fit kan 9/10 zijn terwijl brand-recognition 3/10 is
2. Better Brands BrandPersonality **bevat interne tegenstrijdigheden** (toneDimensions vs spectrumSliders) — Brand Foundation issue, niet F-VAL
3. Cross-family judge rotatie **vangt AI-patterns die single-family mist** — gevalideerd in Linfi TL-A outlier

---

## Voorlopige scope-update voor F-VAL implementatieplan

### Pijler 1 — Style scoring op bestaande data (Route A)

In plaats van een StyleEmbedding-laag + corpus-centroid-tabel:

```
src/lib/brand-fidelity/style-scorer.ts (nieuw)
  - Input: ContentItem text + BrandPersonalityFrameworkData + ToneOfVoiceData
  - Output: StyleFidelityScore { 0-100 composite + 4-dimensie breakdown }
  - Methode: Claude judge call (cross-family rotatie t.o.v. content generator)
            + keyword-matching tegen wordsWeUse / wordsWeAvoid
            + tone-dimensie overlap-scoring (declared tone vs gedetecteerde tone)
```

Geen schema-wijzigingen op BrandPersonality, BrandStyleguide, of BrandVoice.
Geen nieuwe tabellen (BrandStyleCentroid, StyleEmbedding) nodig.
Geen pgvector dependency voor pijler 1.

**Implementatie-effort**: was 1 week voor full StyleEmbedding-laag, **wordt ~3 dagen** voor scoring-laag op bestaande data.

### Pijler 2 — G-Eval rubric (onveranderd)

Original 6-dimensie rubric blijft staan. **Eén accent-aanpassing**: brand-recognition krijgt expliciet de 0.20 weight die ook strategische-verankering heeft. Was lager geprioriteerd in originele plan; deze drift-meting toont dat het de discriminerende dimensie is tussen "voice-fit ✓" en "feels like the brand ✗".

### Pijler 3 — Rule-based (onveranderd)

Geen wijzigingen op basis van drift-meting.

### NIEUW: Brand Foundation Coherence Check (optionele add-on)

Detecteer tegenstrijdige signalen binnen één BrandPersonality (zoals BB tone vs spectrum mismatch). Geen aparte fase — kan toegevoegd worden aan bestaande Brand Foundation editor als realtime warning.

**Effort**: ~0.5 dag.

---

## Wat dit betekent voor de timeline

| Origineel | Aangepast (op basis van LLM-signaal) |
|-----------|--------------------------------------|
| Week 2: Pijler 3 (rules) | Onveranderd |
| Week 3: Pijler 1 (full StyleEmbedding) | **Pijler 1 verkort tot 3 dagen scoring** |
| Week 4-5: Pijler 2 (judge) | Onveranderd |
| Week 6: Composition + API | Onveranderd, plus Foundation Coherence add-on |
| Week 7: UI design + impl | Onveranderd |
| Week 8: Polish + telemetry | Onveranderd, **2-3 dagen vrijspeling** |
| Week 9: Buffer | Vergroot van 1 week naar **~1.5 weken** |
| Demo: 15 juli | Eerder mogelijk: ~10 juli zonder buffer-druk |

**Demo-ruimte**: van 0 weken buffer naar 1.5 weken buffer. Houdbaar als humans Route A bevestigen.

---

## Scenarios afhankelijk van humans

| Scenario human-eval | Implicatie |
|---------------------|------------|
| Humans bevestigen drift < 0.5 | **Route A definitief** — bovenstaande aangepaste plan staat |
| Humans zien drift 0.5-1.5 | **Route B** — formatBrandPersonality refactor naar markdown, Pijler 1 wordt scoring + format-upgrade |
| Humans zien drift > 1.5 | **Reconsider**: mogelijk methodologisch issue (truncatie, n=12, etc) — aanvullende ronde nodig |
| Humans tonen Route A maar brand-recognition kwart | **Route A + uitgebreide pijler 2** met brand-recognition als kerncriterium |

Dit laatste scenario is meest waarschijnlijk gegeven de LLM-data: voice-fit prima, brand-recognition zwak.

---

## Wat user nu moet doen

1. **Lees deze 3 reports**:
   - `llm-aggregate.md` (kwantitatief)
   - `qualitative-observations.md` (kwalitatief, 3 kernobservaties)
   - `preliminary-findings.md` (dit document — synthese + scope-update)

2. **Optioneel**: bekijk 1-2 outputs handmatig in `outputs/` om voice-fit gevoel te krijgen

3. **Pre-registratie commit batch** (als je dit retroactief wilt vastleggen): protocol v0.2 + 6 briefings + ToV-patch + outputs + scores + reports. Of skip pre-reg en commit alles als één post-meting batch — dit was geen formele wetenschap, was een research-iteratie.

4. **Benader humans** bij LINFI / Nobox / WRA voor blind ratings van de 12 outputs (zie `outputs/{key}.md`). Eval-formulier: 4 dimensies × 1-10 schaal, identiek aan LLM-judge prompt. Distribueer outputs anoniem (output-01.md ... output-12.md mapping naar key kan ik genereren).

5. **Wacht op humans** voordat ik `final-findings.md` schrijf en F-VAL implementatieplan definitief update.

---

## Beslissingen die NU al genomen kunnen worden (low-risk)

Onafhankelijk van human-eval uitkomst:

- ✅ **Brand-recognition als kerncriterium** in pijler 2 G-Eval rubric (validatie via cross-family judge consistent over alle merken)
- ✅ **Cross-family judge rotatie** in productie pijler 2 (gevalideerd in Linfi-TL-A outlier)
- ✅ **Brand Foundation Coherence Check** als kleine add-on bij Brand Foundation editor

Deze drie kunnen direct in week 2-3 ingepland worden zonder op humans te wachten.

---

*Status: voorlopige bevindingen vastgelegd. Wacht op human-eval voor finalisatie. Geschatte tijdspanne tot final-findings.md: 1 week (afhankelijk van evaluator-respons).*
