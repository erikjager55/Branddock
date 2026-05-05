# Conditie B: Gestructureerde BVD — Template Ontwerp

> Datum: 2026-05-05
> Auteur: Claude (week 1, dag 3 — onderdeel drift-protocol design)
> Doel: definitieve markdown-structuur voor Conditie B in de drift-meting,
> met zelfde 25 velden als huidige BVD maar herstructureerd voor LLM-adherentie.

---

## 1. Ontwerprationale

Schema-audit (sectie 2.2) toonde aan dat `formatBrandPersonality()` alle 13 velden volledig joined met `. ` separator. Een rijke BrandPersonality genereert ~800-1500 tokens als één lange zin. LLMs respecteren markdown-structuur beter dan platte tekst — dezelfde data, anders gepresenteerd, kan meetbare voice-fit verbeteren zonder schema-uitbreiding.

Drie ontwerpkeuzes die conditie B onderscheiden van conditie A:

1. **Markdown headers per dimensie** — geen platte zinketenketen, maar `### Personality`, `### Voice positioning`, etc. Logische grouping van gerelateerde velden.
2. **Anti-patterns geïsoleerd** — `butNeverThat` per trait + `dontsList` worden gecombineerd in één expliciet `### Anti-patterns (NEVER)` blok bovenaan, in plaats van verscholen tussen positieve trait-beschrijvingen.
3. **Channel-specific filtering** — alleen het relevante kanaal voor de huidige content wordt geïnjecteerd, niet alle 5. Vermindert prompt-overhead en focusseert het model.

---

## 2. Template (definitief)

```markdown
## BRAND VOICE DIRECTIVE — STRUCTURED

**Brand**: {brandName}
**Language**: {languageName} (only if ≠ English)
**Channel context**: {channelLabel}  ← e.g. "Social Media", "Email", "Website"

### 1. Personality identity
- **Primary dimension**: {primaryDimension}
- **Secondary dimension**: {secondaryDimension}  ← omit if absent
- **Aaker scores**: {dimension}: {score}/5, {dimension}: {score}/5, ...
  ← only dimensions with score > 0, sorted descending

### 2. Voice positioning
- **Spectrum**: {strongly|slightly} {position}, {strongly|slightly} {position}, ...
  ← only sliders ≠ 4 (neutral)
- **Tone**: {tone}, {tone}, ...
  ← only dimensions ≠ 4 (neutral)
- **Voice character**: {brandVoiceDescription}
- **Voice (TTS-derived)**: tone={voiceTone}, character={voicePrompt}
  ← from BrandVoice content-style fields, only if filled

### 3. Core traits
- **{traitName}** — {description}
  - We are: {weAreThis}
  - But never: {butNeverThat}
- **{traitName}** — ...
  ← repeat for all 3-5 traits

### 4. Vocabulary
- **Words we use**: {word1}, {word2}, {word3}, ...
- **Words we avoid**: {word1}, {word2}, ...

### 5. Writing register (match this style)
- **Sample**:
  > {writingSample}
- **Format examples**:
  - Headline: "{writingExamples.headline}"
  - Body: "{writingExamples.bodyParagraph}"
  - CTA: "{writingExamples.callToAction}"
  ← omit per-format if not filled

### 6. Channel-specific tone — current channel: {channelLabel}
{channelTones[currentChannel]}
← ONE channel only, never all 5

### 7. Anti-patterns — NEVER do these
- {butNeverThat from trait 1}
- {butNeverThat from trait 2}
- {butNeverThat from trait 3-5}
- {dontsList[0]}
- {dontsList[1]}
- ...
- (Also avoid these words: {wordsWeAvoid joined})

---

Apply this voice WITHIN the methodology specified below. The methodology provides structure; this directive provides identity.
```

---

## 3. Worked example — WRA Juristen (dummy-vulling)

Voorbeeld-output op een fictieve WRA Brand Foundation, voor het channel "email" en deliverable type "outreach":

```markdown
## BRAND VOICE DIRECTIVE — STRUCTURED

**Brand**: WRA Juristen
**Language**: Dutch (Nederlands)
**Channel context**: Email

### 1. Personality identity
- **Primary dimension**: Competence
- **Secondary dimension**: Sincerity
- **Aaker scores**: Competence: 5/5, Sincerity: 4/5, Sophistication: 3/5

### 2. Voice positioning
- **Spectrum**: strongly formal, slightly thoughtful, strongly traditional, strongly proven, strongly serious, slightly exclusive, strongly reserved
- **Tone**: formal, serious, respectful, matter-of-fact
- **Voice character**: Helder, precies en menselijk. Wij vertalen complexe juridische materie naar bruikbare adviezen, zonder jargon waar dat kan en met jargon waar dat moet.

### 3. Core traits
- **Vakkundig** — Diepe inhoudelijke expertise in arbeidsrecht en familierecht.
  - We are: zorgvuldig, geïnformeerd, accuraat
  - But never: betweterig, neerbuigend, jargon-zwaar zonder reden
- **Toegankelijk** — Juridische dienstverlening die voelt als overleg, niet als consult.
  - We are: persoonlijk, geduldig, helder
  - But never: amicaal-amicaal, te informeel, populistisch
- **Stevig** — We nemen positie in voor onze cliënt en staan ervoor.
  - We are: doortastend, scherp, beslissend
  - But never: agressief, polariserend, theatraal

### 4. Vocabulary
- **Words we use**: cliënt, advies, kwestie, dossier, oplossing, overleg, traject, onderbouwing
- **Words we avoid**: case, deal, klant, klus, push, drive, target, no-brainer

### 5. Writing register (match this style)
- **Sample**:
  > "In deze kwestie spelen drie elementen die elk afzonderlijk overweging vragen. We adviseren een traject in twee fases: eerst de juridische analyse afronden, dan in overleg met u de strategische lijn bepalen. Op die manier blijft het besluit van u — onderbouwd, maar niet voorgekauwd."
- **Format examples**:
  - Headline: "Onderbouwd advies, in uw tempo."
  - Body: "Bij een arbeidsconflict telt elke week. Onze eerste stap is altijd: snel begrijpen wat er speelt, daarna pas adviseren over volgende stappen — niet andersom."
  - CTA: "Plan een vrijblijvend kennismakingsgesprek."

### 6. Channel-specific tone — current channel: Email
Begin met een persoonlijke aanhef en een korte erkenning van de situatie van de ontvanger. Geen marketing-opener. Houd alinea's kort (max 4 regels). Eindig met een concrete vervolgstap, geen open vraag.

### 7. Anti-patterns — NEVER do these
- Betweterig, neerbuigend, jargon-zwaar zonder reden
- Amicaal-amicaal, te informeel, populistisch
- Agressief, polariserend, theatraal
- Geen "Hi {voornaam}!" openers
- Geen exclamatiepunten in zakelijke context
- Geen Engels jargon waar Nederlands volstaat (geen "deal", "case", "follow-up")
- Geen overdreven beloftes ("u krijgt 100% gegarandeerd...")
- (Ook deze woorden vermijden: case, deal, klant, klus, push, drive, target, no-brainer)

---

Apply this voice WITHIN the methodology specified below. The methodology provides structure; this directive provides identity.
```

---

## 4. Vergelijking — zelfde data, andere structuur

| Aspect | Conditie A (huidige BVD) | Conditie B (gestructureerde BVD) |
|--------|--------------------------|----------------------------------|
| Aantal velden geïnjecteerd | 25 | 25 (identiek) |
| Token count (rijke data) | ~1100 | ~950 (filtering channels reduceert overhead) |
| Visuele structuur | Platte ". "-gejoinde zinketenketen | 7 markdown-secties met headers |
| Anti-patterns | Verscholen in trait-beschrijvingen | Geïsoleerd in eigen blok |
| Channel context | Alle 5 channels meegegeven | 1 relevant channel |
| Vocabulaire-lijsten | Inline tussen andere velden | Eigen sectie 4 |
| Writing samples | Eén regel "Writing sample: ..." | Geframed als "Match this style" met blockquote |

---

## 5. Implementatie-overweging (NA drift-meting, NIET nu)

Als de drift-meting Conditie B als winnaar aanwijst (≥5pp voice-fit boven A), is de implementatie laag-impact:

1. **Refactor `formatBrandPersonality()`** om markdown te returnen in plaats van platte string — backward compat via `format: 'plain' | 'markdown'` parameter
2. **Refactor `formatBrandStyle()`** idem
3. **Update `buildBrandVoiceDirectiveFromContext()`** — accepteer `channelKey` argument om alleen het relevante kanaal te injecteren
4. **Geen schema-wijziging nodig** — alle data zit al in BrandPersonalityFrameworkData en BrandStyleguide

Schatting: 1-2 dagen implementatie als Conditie B wint. Ratio: schema-uitbreiding niet nodig, alle data is er.

Niet doen vóór drift-meting outputs heeft opgeleverd.

---

*Status: design-document gereed. Wordt referentie voor `scripts/fidelity/build-conditions.ts` zodra Conditie B in productie wordt getest.*
