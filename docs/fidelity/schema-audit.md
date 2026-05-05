# F-VAL Schema-audit: Brand Personality + Brand Voice + Tone of Voice

> Datum: 2026-05-05
> Auteur: Claude (week 1, dag 1-2)
> Doel: vaststellen welke voice/style-data er nu in Branddock zit en hoe die in
> de generatie-prompt landt, om de scope van pijler 1 (style embeddings) te
> bepalen — nieuwe laag, schema-uitbreiding, of scoring op bestaande data.

---

## 1. Veld-inventaris (wat hebben we)

### 1.1 BrandPersonalityFrameworkData (13 velden)

Locatie: `src/features/brand-asset-detail/types/framework.types.ts` + referentiedata in `src/lib/brand-assets/personality-constants.ts`.

| Veld | Type | Style-relevantie |
|------|------|------------------|
| `dimensionScores` | 5×1-5 (Aaker) | **Hoog** — kwantitatief, vector-baar |
| `primaryDimension` / `secondaryDimension` | string | Hoog — categorisch label |
| `personalityTraits` | 3-5×{name, description, weAreThis, butNeverThat} | **Hoog** — bevat anti-patterns (butNeverThat) |
| `spectrumSliders` | 7×1-7 | **Hoog** — kwantitatief (friendly↔formal, etc.) |
| `toneDimensions` | 4×1-7 (NN/g) | **Hoog** — kwantitatief |
| `brandVoiceDescription` | string (vrije tekst) | Hoog — content-style narrative |
| `wordsWeUse` | string[] (3-10) | **Zeer hoog** — directe rule-input |
| `wordsWeAvoid` | string[] | **Zeer hoog** — directe rule-input |
| `writingSample` | string (100-200 woorden) | **Zeer hoog** — exemplary corpus, embedbaar |
| `channelTones` | 5×string (website/social/support/email/crisis) | Hoog — context-specifiek |
| `colorDirection` / `typographyDirection` / `imageryDirection` | string | Niet relevant voor F-VAL (visual) |

**Content-style velden: 11 van 13** (visual-velden uitgezonderd).

### 1.2 BrandStyleguide.toneOfVoice (18 velden, JSON)

Locatie: Prisma `BrandStyleguide.toneOfVoice` JSON, getypt in `src/features/brandstyle/types/brandstyle.types.ts`, geupdate via `/api/brandstyle/tone-of-voice` PATCH.

| Veld | Type | Style-relevantie |
|------|------|------------------|
| `formalCasual` / `seriousFunny` / `respectfulIrreverent` / `matterOfFactEnthusiastic` | 4×1-7 (NN/g, dubbel met BrandPersonality.toneDimensions) | Overlap |
| `brandVoiceDescription` | string (200-500) | Overlap met BrandPersonality.brandVoiceDescription |
| `dosList` | string[] (5-10) | **Zeer hoog** |
| `dontsList` | string[] | **Zeer hoog** |
| `writingExamples.headline` / `.bodyParagraph` / `.callToAction` | 3×string | **Zeer hoog** — exemplary corpus per format |
| `channelSpecific` | 5×string (website/social/support/email/crisis) | Overlap met BrandPersonality.channelTones |

**Effectief unieke velden bovenop BrandPersonality: 5** (dosList, dontsList, 3× writingExamples). De rest is duplicatie van BrandPersonality.

### 1.3 BrandVoice (TTS) — Content vs audio-config scheiding

Locatie: Prisma `BrandVoice` model + `src/features/media-library/types/media.types.ts`.

| Veld | Categorie | F-VAL relevantie |
|------|-----------|-------------------|
| `voiceTone` | Content-style | Hoog (warm/professional/playful descriptor) |
| `voicePrompt` | Content-style | Hoog (vrije tekst voice character) |
| `name` / `voiceGender` / `voiceAge` / `voiceAccent` | Metadata + TTS | Marginaal |
| `speakingPace` / `ttsProvider` / `ttsVoiceId` / `ttsSettings` / `sampleAudioUrl` | TTS-config | **Niet relevant** voor content fidelity |

**Content-style velden: 2 van 11.** Cleanly separated — geen TTS-pollutie naar content generatie.

### 1.4 Persona quotes (cold-start bootstrap-bron)

`Persona.quote` (single string) + `Persona.bio` (string). Niet voice-data per se, maar exemplary tekst die de doelgroep aanspreekt → relevant signal voor wat de stem moet bereiken.

### 1.5 Totaal beschikbaar

**Unique content-style velden over alle bronnen: ~25** (na dedup van overlap tussen BrandPersonality en ToneOfVoiceData). Plus indirecte signalen uit persona-quotes en (toekomstig) APPROVED corpus.

---

## 2. Wat de huidige Brand Voice Directive (BVD) écht injecteert

Locatie: `src/lib/studio/brand-voice-directive.ts` (geïntroduceerd in mem #197) + `src/lib/ai/brand-context.ts` (de daadwerkelijke formatters).

### 2.1 Hoe het werkt

```
buildBrandVoiceDirectiveFromContext(ctx):
  1. Language directive (alleen als contentLanguage ≠ "en")
  2. ctx.brandPersonality       ← gepre-formatteerde string uit formatBrandPersonality()
  3. ctx.brandToneOfVoice       ← gepre-formatteerde string uit formatBrandStyle()
  4. Channel reminder (alleen referentie naar bovenstaande)
  5. Brand name reminder
```

De BVD is **een wrapper, niet een formatter**. De daadwerkelijke serialisatie vindt plaats in `brand-context.ts`.

### 2.2 Empirische lezing van `formatBrandPersonality()` (regel 387-480)

**Cruciaal: er is geen truncation.** De functie joined ALLE niet-lege velden met `. ` separator:

| BrandPersonality veld | In output | Hoe |
|-----------------------|-----------|-----|
| primaryDimension / secondaryDimension | ✅ Volledig | "Primary dimension: X, Secondary: Y" |
| dimensionScores | ✅ Volledig | "Personality scores: X: 4/5, Y: 3/5, ..." |
| personalityTraits | ✅ **Volledig** incl. weAreThis + butNeverThat | "Core traits: name (description) — We are: X — But never: Y; ..." |
| spectrumSliders | ✅ Volledig | "Personality positioning: strongly friendly, slightly modern, ..." |
| toneDimensions | ✅ Volledig | "Tone of voice: casual, enthusiastic, ..." |
| brandVoiceDescription | ✅ Volledig | "Brand voice: [vrije tekst]" |
| wordsWeUse / wordsWeAvoid | ✅ **Volledige lijsten** | "Words we use: a, b, c, ..." |
| writingSample | ✅ **Volledig** (kan 100-200 woorden zijn) | "Writing sample: \"...\"" |
| channelTones | ✅ **Per kanaal volledig** | "Channel-specific tone: website: X; socialMedia: Y; ..." |
| visual fields (color/typography/imagery) | ✅ Volledig | (irrelevant voor F-VAL) |

### 2.3 Implicaties

1. **De ~300-token claim uit mem #197 is een ontwerpdoel, niet enforced.** Een rijke BrandPersonality (alle velden gevuld) genereert ~800-1500 tokens alleen al uit `formatBrandPersonality()`, plus nog `formatBrandStyle()` voor toneOfVoice.
2. **Conditie A van de drift-meting** (= huidige BVD) heeft dus al toegang tot alle 25 unique content-style velden zonder truncation.
3. **De originele drift-hypothese moet herzien worden**: het is niet "huidige BVD vs BVD met meer velden" — het is "huidige BVD (platte joined string) vs herstructureerde BVD (semantisch georganiseerd) vs corpus-grounded centroid".

### 2.4 Wat de drift-meting nu écht moet testen

Drie potentiële condities, niet twee:

| Conditie | Beschrijving | Hypothese |
|----------|--------------|-----------|
| **A — huidige BVD** | Platte string-join via `formatBrandPersonality` (`. ` separator) | Baseline |
| **B — gestructureerde BVD** | Zelfde 25 velden, maar als markdown met headers per dimensie, expliciete anti-pattern blok, channel-specific block geïsoleerd | LLMs respecteren structuur beter dan platte zinnen — voice-fit zou moeten stijgen |
| **C — corpus-grounded centroid** | Embedding-similarity tegen 5+ APPROVED merk-content stukken | Test of declared declarations matchen met geproduceerde corpus |

Conditie C **vereist test-merken met approved corpus** in Branddock — niet alleen Brand Foundation seeds. Te verifiëren met user (vraag 1 in protocol-input).

---

## 3. Gap-analyse: wat ontbreekt voor een centroid?

Twee vragen:

### Vraag A — Hebben we genoeg DECLARED data?

**Antwoord: ja.** 25 unique content-style velden + 5 channel-specific overrides + writing samples is rijke declared data. Theoretisch is een bootstrap-centroid construeerbaar uit alleen Brand Foundation, zonder corpus-content. **Cold-start probleem oplosbaar zonder corpus.**

### Vraag B — Is DECLARED data ook representatief voor wat het merk DOET?

**Onbekend, drift-meting moet dit beantwoorden.** Een merk kan declarered "warm en speels" maar approved content kan in praktijk formeler uitvallen. Drift tussen declared en corpus is zelf een fidelity-signaal — een corpus-grounded centroid vangt dit, declared-only niet.

---

## 4. Drie scope-scenarios (te beslissen na drift-meting)

Herzien op basis van empirische bevinding sectie 2.2 (geen truncation in formatBrandPersonality).

| Scenario | Trigger | Pijler 1 implementatie |
|----------|---------|------------------------|
| **A — Huidige BVD volstaat** | Drift-meting toont dat current BVD ≥80% voice-fit haalt; gestructureerde BVD voegt <5pp toe | Pijler 1 = **scoring op bestaande data**. Geen schema-uitbreiding, geen embedding-laag. Style-score = dimensie-overlap (declared vs gedetecteerde-content-tone via judge). |
| **B — Gestructureerde BVD wint meetbaar** | Drift toont 60-80% met current BVD (platte string); gestructureerde BVD (markdown, isolated blokken) haalt 80+% | Pijler 1 = **BVD-format upgrade + scoring**. Refactor `formatBrandPersonality()` naar gestructureerde markdown-output, geen schema-uitbreiding nodig. Optioneel: nieuw veld op BrandPersonality voor explicit anti-pattern declaration zonder weAreThis-koppeling. |
| **C — Corpus-grounded nodig** | Drift toont <60% zelfs met gestructureerde BVD; declared-vs-corpus drift meetbaar bij merken met APPROVED corpus | Pijler 1 = **volledige StyleEmbedding-laag** zoals oorspronkelijk gepland. BrandStyleCentroid-tabel + auto-switch bij 20+ APPROVED. Embedding via `text-embedding-3-small`. Bootstrap fallback uit Brand Foundation. |

**Voorlopige inschatting (audit-only, vóór drift-meting):**

Scenario A of B meer waarschijnlijk dan eerst gedacht. Bevinding 2.2 toont dat declared data al volledig in de prompt landt — het gat zit dus niet in *welke velden* maar in *hoe ze gestructureerd zijn*. Een platte joined string van 25 velden is moeilijk voor LLMs om te respecteren als ranking-instructies; markdown-headers per dimensie zou betere adherentie kunnen geven.

Scenario C blijft levensvatbaar maar **alleen meetbaar als test-merken approved corpus hebben in Branddock** — anders kunnen we declared-vs-corpus drift niet kwantificeren. Te verifiëren met user.

**Geen lock op scenario zonder drift-data.** De drift-meting (week 1 dag 4-6) is bewust ontworpen om tussen A/B/C empirisch te beslissen.

---

## 5. Implicaties voor de drift-meting (input voor `drift-protocol.md`)

Drie condities, niet twee:

### Conditie A — Huidige BVD (baseline)
Onveranderd: `buildBrandVoiceDirectiveFromContext(ctx)` wrapt de platte joined-string output van `formatBrandPersonality()` en `formatBrandStyle()`. ~800-1500 tokens bij rijke data, ~200-400 bij minimale data.

### Conditie B — Gestructureerde BVD
Zelfde 25 velden, maar herstructureerd:
- Markdown headers per dimensie (`### Personality dimensions`, `### Anti-patterns (NEVER)`, `### Channel-specific tone (current channel: socialMedia)`)
- Anti-pattern blok geïsoleerd uit personalityTraits, prominenter
- Channel-specific blok uitgefilterd op alleen het relevante kanaal (niet alle 5)
- Numerieke dimensies als bullet list met explicit weighting ("Friendly: 6/7 — strong")
- writingSample geframed als "GOOD example, match this register"

### Conditie C — Corpus-grounded centroid (alleen indien mogelijk)
Vereist: het pilot-merk heeft minimaal 5 APPROVED content-stukken in Branddock workspace.
- Embed alle approved content via `text-embedding-3-small`
- Bereken centroid (element-wise gemiddelde)
- Bij generatie: na output, bereken cosine similarity tussen output-embedding en centroid
- Geen prompt-injectie, dus complementair aan A of B

Conditie C is **optioneel** in de drift-meting — alleen meten als data beschikbaar is.

---

## 6. Empirische verificatie (dag 2 — uitgevoerd via `scripts/fidelity/build-bvd.ts`)

### 6.1 Pilot-merken: Brand Foundation status

Run datum: 2026-05-05 via `npx tsx scripts/fidelity/build-bvd.ts`. Channel: `socialMedia`.

| Workspace | BVD chars | Approx tokens | BrandPersonality velden | Status |
|-----------|-----------|---------------|--------------------------|--------|
| **wra-juristen** | 4037 | 1009 | 12/12 ✅ | Drift-ready |
| **linfi** | 3704 | 926 | 12/12 ✅ | Drift-ready |
| **better-brands** | 3655 | 914 | 12/12 ✅ | Drift-ready |
| people-masterminds | 3908 | 977 | 12/12 ✅ | Extra kandidaat |
| qonnecqt-ai | 3273 | 818 | 12/12 ✅ | Extra kandidaat |
| partnerselect | 3854 | 964 | 12/12 ✅ | Extra kandidaat |
| zwarthout | 4073 | 1018 | 12/12 ✅ | Extra kandidaat |
| adullam | 4545 | 1136 | 12/12 ✅ | Extra kandidaat |
| branddock-demo | 489 | 122 | 0/12 ❌ | Empty seed |
| techcorp-brand | 0 | 0 | 0/12 ❌ | Empty seed |

**Bevestiging van sectie 2.2-aanname**: Bij rijke BrandPersonality genereert `formatBrandPersonality()` ~800-1136 tokens. De "BVD ~300 token compact" claim uit mem #197 was inderdaad een ontwerpdoel, niet enforced.

### 6.2 ToneOfVoice — anders dan oorspronkelijk geaudit

Eerdere audit aanname: "BrandStyleguide.toneOfVoice JSON met 18 velden (formalCasual, dosList, etc.)". Realiteit (geverifieerd in Prisma schema + `getBrandContext()` regel 1144-1153):

- **Geen `toneOfVoice` JSON-veld** in BrandStyleguide
- Wel: `contentGuidelines: text[]` + `writingGuidelines: text[]` als platte string-arrays
- BVD injectie alleen wanneer `toneSavedForAi === true`
- Format: `Content guidelines: a; b; c. Writing style: d; e; f` — platte joined string

ToV-status pilot-merken:

| Merk | contentGuidelines | writingGuidelines | toneSavedForAi | In BVD? |
|------|-------------------|-------------------|----------------|---------|
| wra-juristen | 4 items | 4 items | **TRUE** | ✅ |
| linfi | 7 items | 9 items | FALSE | ❌ (data exists, gated off) |
| better-brands | 6 items | 8 items | FALSE | ❌ (data exists, gated off) |

**Methodologisch issue**: WRA krijgt rijkere baseline-BVD dan LINFI + Better Brands. Voor zuivere drift-meting tussen Conditie A en B moet dit gelijk getrokken worden — ófwel `toneSavedForAi=true` voor alle 3, ófwel asymmetrie expliciet rapporteren.

### 6.3 APPROVED corpus — Conditie C eligibility

Geverifieerd via psql query op `Deliverable` tabel:

| Merk | APPROVED | PUBLISHED | Totaal | Conditie C eligible (≥5)? |
|------|----------|-----------|--------|----------------------------|
| wra-juristen | 0 | 0 | 0 | ❌ |
| **linfi** | **6** | **1** | 99 | ✅ |
| better-brands | 0 | 0 | 1 | ❌ |

Conditie C kan alleen op LINFI worden gemeten. Twee opties: (A) skip C voor v1 zoals user eerder stipuleerde ("geen halfslachtige conditie C"), of (B) draai C alleen voor LINFI als asymmetrische extra-test, los gerapporteerd van A/B.

### 6.4 Samenvattende implicaties voor protocol v0.2

1. **Brands**: alle 3 pilots zijn ready voor BrandPersonality-deel; geen seeden nodig (WRA PDF blijft fallback voor v2 als verfijning gewenst)
2. **ToV gelijktrekken**: zet `toneSavedForAi=true` op LINFI + Better Brands vóór generatie, gecommit in pre-registratie
3. **Conditie C**: skip v1 (aanbeveling). LINFI corpus van 7 stukken is technisch eligible, maar single-merk corpus-test is methodologisch zwak en blokkeert geen Route B-beslissing

---

## 7. Volgende stappen

1. **Dag 3** ✅ Conditie B template + judge-prompt + research-script architectuur gereed.
2. **Dag 4 (na user-bevestiging)**:
   - User keuze op ToV gelijktrekken (1A) en Conditie C-skip (2A) bevestigen
   - Briefings opstellen vanuit Brand Foundation per merk per content-type (6 totaal: 3 merken × 2 types)
   - Protocol v0.2 finaliseren + pre-registreren in git
3. **Dag 5-6 (na pre-registratie)**:
   - `build-conditions.ts` + `run-drift.ts` implementeren
   - 12 outputs genereren (3 merken × 2 types × 2 condities)
   - LLM-judge dispatchen (GPT-5 + Sonnet 4.6)
4. **Dag 7-12 (parallel)**:
   - User benadert pilot-merken voor menselijke evaluators
   - LLM-aggregaat-rapport schrijven
   - Wachten op humans
5. **Dag 13 (synthese)**: Beslis Route A/B op basis van drift-uitkomsten. Update F-VAL implementatieplan met definitieve pijler-1 scope.

---

## 8. Open beslissingen voor user (blokkeren dag 4)

Antwoorden op eerdere ronde 1-6 zijn ontvangen + grotendeels achterhaald door empirische data in sectie 6. Resterende beslissingen:

1. **ToV gelijktrekken**: zet `toneSavedForAi=true` voor LINFI + Better Brands vóór generatie? (Aanbeveling: ja — minimaal-invasief, gecommit in pre-registratie batch.)
2. **Conditie C**: skip v1 voor methodologische zuiverheid? (Aanbeveling: ja — single-merk corpus-test blokkeert geen Route A/B-beslissing.)
3. **Briefings**: ik begin nu met opstellen voor 3 merken × 2 types = 6 briefings vanuit Brand Foundation + Personas. Reviewt user en commiteert pre-registratie batch zodra akkoord.

---

*Status: dag 1 + 2 + 3 voltooid. BVD-verificatie + APPROVED corpus check empirisch afgerond. Wacht op user-bevestiging op 3 beslissingen voor dag 4.*
