# F-VAL Drift-Meting — Kwalitatieve Observaties

> Datum: 2026-05-05
> Status: Aanvulling op `llm-aggregate.md` (kwantitatief)
> Bron: judge-reasoning velden uit `scores/{gpt5,sonnet}/*.json`

---

## 1. Drie kernobservaties die de Route A/B-keuze raken

### Observatie 1: Voice-fit en brand-recognition meten verschillende dingen

**Cijfers**:
| Output | Voice-fit | Brand-recognition |
|--------|-----------|-------------------|
| WRA case-B | 9 / 9 | 6 / 7 |
| Linfi case-B | 9 / 9 | 8 / 7 |
| Better Brands TL-B | 8 / 6 | 5 / **3** |

**Signaal**: een output kan voice-fit ≥9 halen (tone matches declared) terwijl brand-recognition tussen 3-7 zweeft. Sonnet over Better Brands TL-B: *"Could belong to McKinsey, a brand consultancy, or any number of strategic firms"*.

**Implicatie voor F-VAL pijler 1**: cosine similarity tegen declared style (Pijler 1) meet voornamelijk voice-fit, niet brand-recognition. Voor de demo-belofte ("Branddock-output is trouwer aan jouw merk dan ChatGPT") moet pijler 2 (G-Eval rubric) **brand-recognition als aparte dimensie** vasthouden. Anders kan een output 100% scoren op pijler 1 terwijl het generic strategy-prose is.

### Observatie 2: Better Brands BrandPersonality bevat interne tegenstrijdigheden

**Bevinding** (Sonnet over BB TL-B): *"The brand voice calls for 'Funny' and 'Enthusiastic' tone dimensions, but the content is uniformly serious and analytical"*.

Concreet in de BrandPersonality data van Better Brands:
- `toneDimensions`: `Funny, Respectful, Enthusiastic` (uit BVD-output)
- `spectrumSliders`: `strongly Reserved, slightly Serious, strongly Proven, strongly Traditional, strongly Exclusive, slightly Thoughtful`

Dat zijn **tegenstrijdige signalen** in dezelfde Brand Foundation. Funny+Enthusiastic vs Reserved+Serious+Traditional kan een LLM niet harmoniseren — die kiest waarschijnlijk de meerderheid en negeert de minderheid (in dit geval: serious wint, funny verliest).

**Implicatie**: dit is een **Brand Foundation data-quality issue**, niet een F-VAL implementatie issue. F-VAL pijler 1 zou dit kunnen detecteren (interne consistentie van declared style), maar de oplossing zit in de Brand Personality editor — niet in een nieuwe scoring laag.

**Aanbevolen actie** (los van F-VAL): voor Better Brands de BrandPersonality reviewen en consistent maken. Mogelijk een "Brand Foundation Coherence Check" als kleinere feature naast F-VAL.

### Observatie 3: Cross-family judge rotatie vangt AI-patterns die single-family mist

**Linfi-thought-A** (high-disagreement uitlier):
- GPT-5 naturalness = 9 (*"reads like an experienced human essay"*)
- Sonnet naturalness = 5 (*"rigid tripartite structures repeated across multiple sections — 'drie criteria', 'drie soorten projecten', 'drie dingen'"*)

Sonnet pakte concreet AI-patroon dat GPT-5 miste. Beide modellen hebben blinde vlekken voor patterns die ze zelf gebruiken. **Dit valideert het cross-family rotatie ontwerp** uit het drift-protocol.

**Implicatie voor F-VAL pijler 2**: blijf bij cross-family judge in productie. Generator Claude → Judge GPT-5. Generator GPT-5 → Judge Claude. **Twee judges van dezelfde familie geeft systematic blind spots**.

---

## 2. Patroon per merk

### WRA Juristen (sterkste merk in drift-meting)

| Output | Voice-fit | Brand-recognition | Naturalness | Fluency |
|--------|-----------|-------------------|-------------|---------|
| WRA case-A | 9/9 | 7/7 | 8/8 | 7/8 |
| WRA case-B | 9/9 | 6/7 | 9/8 | 9/9 |
| WRA TL-A | 8/9 | 6/7 | 7/8 | 5/8 |
| WRA TL-B | 9/8 | 7/7 | 9/7 | 9/8 |

**Observaties**:
- Beide condities scoren consistent hoog (composite 6.5-8.5)
- Conditie B levert kleine winst (vooral fluency, GPT-5 raakt 9 vs 5)
- WRA's BrandPersonality is **rijk en intern consistent** → voice komt sterk door in beide formats

### Linfi (sterkste B-vs-A drift)

| Output | Voice-fit | Brand-recognition |
|--------|-----------|-------------------|
| Linfi case-A | 9/7 | 8/6 |
| Linfi case-B | 9/9 | 8/8 |
| Linfi TL-A | 7/6 | 5/4 (hoge disagreement) |
| Linfi TL-B | 7/9 | 5/8 |

**Observaties**:
- Conditie B helpt LINFI duidelijk (vooral Sonnet ziet B beter dan A)
- TL-A geeft outlier-disagreement — beide judges struggelen ermee
- Luxe voice komt door, maar brand-recognition wisselt sterk

### Better Brands (zwakste merk, vooral op brand-recognition)

| Output | Voice-fit | Brand-recognition |
|--------|-----------|-------------------|
| BB case-A | 7/7 | 5/6 |
| BB case-B | 8/7 | 5/6 |
| BB TL-A | 7/6 | 4/4 |
| BB TL-B | 8/6 | 5/3 |

**Observaties**:
- Brand-recognition systematisch laag (3-6)
- Sonnet score B lager dan A (sonnet=6.7 vs 7.3) — opvallend
- **Tegenstrijdige BrandPersonality data** is hoofdoorzaak (zie observatie 2)

---

## 3. Implicaties voor F-VAL implementatieplan

### Voorlopige Route-keuze (LLM-only, wacht op humans)

**Drift +0.37 < 0.5 drempel** → voorlopig signaal **Route A** (huidige BVD volstaat). Pijler 1 wordt scoring-laag op bestaande data, geen schema-uitbreiding nodig.

### Maar — twee correcties op de oorspronkelijke Route A scope

1. **Pijler 1 ≠ alleen voice-fit-scoring**. Brand-recognition is een echte aparte dimensie die voice-fit-scoring mist. Houd dit in pijler 2 (G-Eval rubric) als eigen criterium met substantiële weight (suggereer 0.20+).

2. **Brand Foundation Coherence Check** als kleine bijkomende feature: detecteer interne tegenstrijdigheden in BrandPersonality (zoals Better Brands tone vs spectrum mismatch). Dit zou als gratis "by-product" van Brand Foundation editor kunnen draaien — geen onderdeel van F-VAL maar wel direct waarde-toevoegend bij implementatie.

### Wat de drift-meting NIET heeft opgelost

- **Truncated outputs**: alle 12 outputs hit 8000 token cap. Mid-zin afgekapt. Voice-fit van slot-secties niet gemeten. Toekomstige drift-rondes zouden grotere `max_tokens` moeten gebruiken.
- **Single language scope**: alle drift-outputs zijn NL. Engelstalige content niet getest — maar vrijwel alle pilot-merken communiceren in NL, dus low priority.
- **n=12 is klein**: voor productie-validatie (na pijler 1 implementatie) zou een tweede ronde met 30+ outputs nuttig zijn.

---

## 4. Concrete bevindingen voor user

1. **Better Brands**: BrandPersonality data heeft interne conflicten (tone dimensions vs spectrum sliders). Niet F-VAL gerelateerd, wel direct fixbaar in de Brand Foundation editor. Aanbeveling: review BB BrandPersonality vóór de echte demo.

2. **Brand-recognition** als aparte dimensie blijft cruciaal in F-VAL pijler 2 — het is wat het Branddock-platform onderscheidt van "any branding consultancy LLM-output".

3. **Cross-family judge** ontwerp is gevalideerd — Sonnet pakte AI-patterns die GPT-5 miste (Linfi TL-A). Houd cross-family in productie pijler 2.

4. **Voorlopige Route A**, maar wacht op humans. Final beslissing in `final-findings.md` na human-eval ronde.

---

*Status: kwalitatieve observaties gereed. Volgende stap: user benadert humans + reviewt deze observaties + wacht op finale Route A/B beslissing.*
