# Voice Fingerprinting WS1 — Schema & Propagation Audit

**Status**: concept v0.1 ter review — niet gepre-registreerd.
**Datum**: 2026-05-05
**Doel**: Vaststellen of het probleem "voice drift in long-form" een schema-issue is (data ontbreekt) of een propagation-issue (data is er, maar bereikt de generatie verzwakt).

---

## TL;DR

Hypothese uit rand 2 wordt bevestigd: **het schema is rijk, niet het probleem**. Vrijwel alle voice-relevante velden (Aaker-dimensies, spectrum sliders, NN/g tone, woorden-we-gebruiken/vermijden, channel-tones, writing sample) zitten al in `BrandPersonalityFrameworkData` en worden geserialiseerd door `formatBrandPersonality()`. **De zwakte zit in de injectie-mechaniek**: BVD landt eenmalig aan het *begin* van de system prompt op 4 call-sites. Voor 3K-woord long-form is de voice-aanwijzing daardoor positie-ver verwijderd van de uiteindelijke output. Dit is een prompt-engineering kwestie, geen schema-design kwestie.

**Implicatie voor Route A scope**: van "ontwerp uitgebreid voice-object" → "verbeter propagation-mechaniek". Substantieel kleiner werk dan oorspronkelijk gescoped (waarschijnlijk 3-5 dagen i.p.v. 1-2 weken).

---

## §1 Schema-inventaris

`BrandPersonalityFrameworkData` ([framework.types.ts:318-344](../src/features/brand-asset-detail/types/framework.types.ts)) bevat 25+ velden in 6 secties. Wat verschijnt er in `formatBrandPersonality()` ([brand-context.ts:387-480](../src/lib/ai/brand-context.ts)):

| Sectie | Veld | In serialisatie? | Output-vorm (lijn) |
|---|---|---|---|
| Aaker | `dimensionScores` (5D) | ✅ | "Personality scores: Sincerity 4/5, …" (399-406) |
| Aaker | `primaryDimension` / `secondaryDimension` | ✅ | "Primary dimension: Sincerity, Secondary: …" (391-397) |
| Traits | `personalityTraits[]` (3-5, name+desc+weAreThis+butNeverThat) | ✅ | "Core traits: Friendly (approachable) — We are: warm — But never: dismissive; …" (409-420) |
| Spectrum | `spectrumSliders` (7 dimensies, 1-7) | ✅ | "Personality positioning: slightly Friendly, strongly Modern, …" (423-436) |
| Tone | `toneDimensions` (4 NN/g) | ✅ | "Tone of voice: Casual, Enthusiastic, …" (439-450) |
| Voice | `brandVoiceDescription` | ✅ | "Brand voice: …" (453) |
| Voice | `wordsWeUse[]` | ✅ | "Words we use: …" (456-458) |
| Voice | `wordsWeAvoid[]` | ✅ | "Words we avoid: …" (459-461) |
| Voice | `writingSample` | ✅ **(de Explore-agent rapporteerde dit fout als ongebruikt)** | "Writing sample: \"…\"" (463-464) |
| Channels | `channelTones` (5 kanalen) | ✅ | "Channel-specific tone: socialMedia: conversational; email: …" (467-472) |
| Visueel | `colorDirection` / `typographyDirection` / `imageryDirection` | ✅ | (475-477) |

**Niet expliciet in formatBrandPersonality**: er zijn geen velden die mistens. Alle 25+ velden worden of direct of via afgeleide expressie geserialiseerd.

**Tweede voice-bron**: `BrandContextBlock.brandToneOfVoice` ([prompt-templates.ts:36](../src/lib/ai/prompt-templates.ts), populated bij [brand-context.ts:1153](../src/lib/ai/brand-context.ts)) komt uit de **Brandstyle Analyzer's tone-of-voice sectie** — een aparte bron dan de canonical Brand Personality asset. Beide worden in BVD geïnjecteerd als ze verschillen ([brand-voice-directive.ts:104-107](../src/lib/studio/brand-voice-directive.ts)). Mogelijke conflict-bron — zie §3.

---

## §2 Propagation-map

```
BrandAsset (frameworkType=BRAND_PERSONALITY, frameworkData)
        │
        ▼
formatBrandPersonality()                ← brand-context.ts:387
        │
        ▼  (samen met brandToneOfVoice uit Brandstyle Analyzer)
ctx.brandPersonality + ctx.brandToneOfVoice  ← BrandContextBlock fields
        │
        ▼
buildBrandVoiceDirectiveFromContext()    ← brand-voice-directive.ts:74
        │  wraps in "## BRAND VOICE DIRECTIVE — NON-NEGOTIABLE" header
        │  + language instruction (non-en)
        │  + channel reference
        │  + brand name instruction
        ▼
voiceDirective string (~430-720 tokens bij volledig ingevulde data)
        │
        ▼  prepend op 4 call-sites:
        ├─ canvas-orchestrator.ts:134 → buildCanvasPrompt(stack, …, voiceDirective) → systemPrompt
        ├─ improve-suggester.ts:84    → `${voiceDirective}\n\n${SUGGEST_SYSTEM_PROMPT}`
        ├─ quality-scorer.ts:162      → `${voiceDirective}\n\n${baseScoringPrompt}`
        └─ inline-transform/route.ts:102 → vergelijkbaar
```

**Token-omvang van BVD**: comment in [brand-voice-directive.ts:5](../src/lib/studio/brand-voice-directive.ts) zegt "~300 tokens", maar dat is alleen het **wrapper-deel**. De daadwerkelijke output van `formatBrandPersonality()` schaalt met data: bij volledig ingevulde personality (incl. writingSample dat alleen al 50-200 tokens kan zijn) levert dat ~430-720 tokens totaal. Niet kritisch, maar relevant voor reasoning over context-budget.

**De 53 type-specifieke prompt-templates** (`src/lib/studio/prompt-templates/long-form.ts` en 7 andere) zijn **voice-agnostisch**. Ze gebruiken `buildBaseSystemPrompt()` ([helpers.ts:92](../src/lib/studio/prompt-templates/helpers.ts)) dat alleen OUTPUT_FORMAT_INSTRUCTIONS + QUALITY_GUARDRAILS toevoegt — geen voice-instructies. Voice komt 100% uit het prepend van BVD door de orchestrator.

---

## §3 Zwakke punten in de propagation-keten

| # | Zwakte | Impact op long-form drift |
|---|---|---|
| **A** | **BVD wordt eenmalig geïnjecteerd, helemaal aan het begin van de system prompt.** Geen mid-prompt herhaling, geen per-sectie voice-anchor, geen end-of-prompt voice-reminder. | Hoog. Voor 3K-woord output is de positie-afstand van voice-instructie tot laatste output-tokens groot. Dit is de meest waarschijnlijke kandidaat voor de drift. |
| **B** | **Channel-tone wordt referentieel aangewezen, niet extracted.** BVD ([brand-voice-directive.ts:109-113](../src/lib/studio/brand-voice-directive.ts)) zegt "match the channel-specific communication style defined in the brand personality above" — maar de personality-blob bevat *alle* 5 kanalen. LLM moet zelf de juiste eruit halen. | Medium. Bij volle aandacht goed; bij drift over 3K woorden vergroot dit de kans dat het model naar gemiddelde channel-tone glijdt. |
| **C** | **Twee voice-bronnen kunnen conflicteren.** Als zowel canonical Brand Personality als Brandstyle Analyzer tone-of-voice zijn ingevuld en niet identiek zijn, krijgt het model twee deels-overlappende blokjes na elkaar ([brand-voice-directive.ts:104-107](../src/lib/studio/brand-voice-directive.ts)). | Laag-medium. Onbekend hoe vaak beide bronnen tegelijk gevuld zijn — meten in WS2 voorbereiding. |
| **D** | **`buildBaseSystemPrompt` Quality Guardrails zijn negatief geformuleerd** (NEVER use placeholder, NEVER use jargon, NEVER mention competitor names, etc.) — zonder positieve voice-instructie. | Laag. Niet stuck op brand voice, maar de quality guardrails plaatsen 13 verbods-regels tussen BVD en het user-prompt — dat verlengt de afstand voice→output verder. |
| **E** | **Geen "voice-anchor in user prompt"-mechanisme.** User prompt bevat brief, structuur-constraints, context-blok — maar geen reinforcement dat voice de leidende dimensie is. | Laag. User prompt is al kort t.o.v. system prompt; niet de primaire driver. |

**Niet-zwakte (waardevol om expliciet te noteren)**: er zijn **geen direct-injectie paden die BVD bypassen**. Alle generatie-routes en scoring-routes gaan door dezelfde 4 call-sites. Als we BVD verbeteren, propageert dat universeel. Geen dubbele bron van waarheid.

---

## §4 Implicaties voor Route A scope

Oorspronkelijke scope (zoals door gebruiker geformuleerd): "ontwerp gestructureerd voice-object dat huidige BVD vervangt". Implicatie: nieuwe schema, nieuwe injectie, ~1-2 weken bouwwerk.

**Audit-bevinding**: schema is al rijk. Het probleem zit in de propagation-mechaniek. Aanbevolen scope-herziening:

| Interventie | Schatting | Reductie van drift-hypothese |
|---|---|---|
| **A.1 Channel-tone extraction** — in BVD, vervang referentiële instructie door directe insert van `data.channelTones[channelKey]`. Verwijder de andere 4 kanalen uit het personality-blok bij prepend. | 0.5 dag | Lost zwakte B op, marginaal effect op drift. |
| **A.2 Voice-bron deduplicatie** — bepaal precedence-regel: canonical Brand Personality wint van Brandstyle Analyzer tone-of-voice (of merge met label "Stylistic refinement: …"). Voorkom dubbele blokken. | 0.5 dag | Lost zwakte C op. |
| **A.3 Mid-prompt voice-reinforcement** — voor long-form types (whitepaper/case-study/blog-post/ebook/pillar-page/research-paper/resource-guide), voeg sectie-niveau voice-anchor toe in de templates. Bij elke ## H2-sectie een korte herinnering aan dominant voice-trait. | 1-2 dagen (bouwwerk + integratie in 7 long-form templates) | **Primaire drift-mitigatie**, lost zwakte A op. |
| **A.4 End-of-prompt voice-summary** — voor long-form, na de structure-skeleton, een "## VOICE CHECK BEFORE OUTPUT" blok dat top-3 voice-instructies herhaalt (primary trait, top-3 woorden-we-gebruiken, top anti-pattern). Dichtst bij output-tokens. | 0.5 dag | Lost zwakte A op (compementair aan A.3). |
| **A.5 Schema-uitbreiding (oorspronkelijke Route A)** | 1+ week | **Onnodig** als A.1-A.4 het drift-probleem oplost. Schrappen tot WS2 anders bewijst. |

**Voorgestelde Route A v0.2 scope**: A.1 + A.2 + A.3 + A.4 = ~3-4 dagen totaal. Schema-uitbreiding (A.5) **uit scope** tenzij WS2 falsificatie-branche (c) — drift in beide condities — uitkomt. In dat geval is óók A.5 onvoldoende en wordt Route B's case sterker.

**Eén belangrijke onzekerheid**: de drift-hypothese A is plausibel maar niet bewezen. WS2 moet dit valideren door 3K-woord generatie met (huidige BVD) vs (BVD + A.1 + A.2 + A.3 + A.4) te vergelijken. Als WS2 conditie B = "uitgebreid voice-object" daadwerkelijk de A-interventies bevat (niet een nieuw schema), is de drift-meting eigenlijk een propagation-mechaniek-meting. Dat moeten we expliciet maken in protocol v0.2.

---

## §5 Open vragen voor review

1. **Akkoord op scope-herziening?** Route A v0.2 = propagation-fixes (A.1-A.4) i.p.v. schema-uitbreiding. Schema-uitbreiding (A.5) on hold tot WS2 falsificatie-branche dit dwingt.
2. **WS2 conditie B definitie** — vervang "uitgebreid voice-object" in protocol v0.2 door "BVD + A.1-A.4 propagation-fixes". Houdt de drift-meting zuiver: we testen of mid-prompt reinforcement + channel-extraction + voice-source deduplicatie de drift oplost.
3. **WS3 disagreement-meting blijft ongewijzigd**. mStyleDistance vs quality-scorer Voice-dimensie test is onafhankelijk van Route A scope.
4. **Bestaande klantcontent voor WS3** — gebruik bestaande gegenereerde long-form output (Studio versions waar beschikbaar) in plaats van nieuwe generaties. Sneller, anchorend op echte data.
5. **Kanttekening voor Erik bij rater-bezetting**: dit verkleint de schaal van "Route A" tegenover wat ik LINFI/WRA/Nobox-eigenaars heb voorgesteld. Verwachting kalibreren: "we testen propagation-verbeteringen, niet nieuw schema". Eerlijkheid voorkomt mismatch tussen wat ze verwachten en wat ze beoordelen.

---

## §6 Bestanden geraakt in audit (lees-only)

- `src/features/brand-asset-detail/types/framework.types.ts` (BrandPersonalityFrameworkData type, regels 318-344)
- `src/lib/ai/brand-context.ts` (formatBrandPersonality, regels 387-480; populatie van brandPersonality + brandToneOfVoice, regels 998 + 1153)
- `src/lib/ai/prompt-templates.ts` (BrandContextBlock interface, regels 18-51)
- `src/lib/studio/brand-voice-directive.ts` (BVD utility, hele bestand 139 regels)
- `src/lib/studio/prompt-templates/helpers.ts` (buildBaseSystemPrompt, geen voice-injectie)
- `src/lib/studio/prompt-templates/long-form.ts` (7 long-form types, allen voice-agnostisch)
- `src/lib/ai/canvas-orchestrator.ts` (BVD injectie, regel 134)
- `src/lib/studio/improve-suggester.ts` (BVD prepend, regel 124)
- `src/lib/studio/quality-scorer.ts` (BVD prepend, regel 176-178)
- `src/app/api/studio/[deliverableId]/inline-transform/route.ts` (4e BVD-site, regel 102)

Geen code gewijzigd. Geen schrijf-acties uitgevoerd buiten dit audit-document.
