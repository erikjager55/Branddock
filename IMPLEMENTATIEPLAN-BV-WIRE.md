# IMPLEMENTATIEPLAN — Brand Voice WIRING (post-BV-2/3/5)

> Vervolgwerk na de Brand Voice extractie sessies. BV-2 (UI), BV-3 (analyzer +
> scanner integratie) en BV-5 (BrandPersonality voice-velden deprecation) zijn
> gebouwd. Deze doc inventariseert alle plekken in de codebase die nog tegen
> voice-data lezen via de oude paden, en bepaalt de cutover-volgorde.
>
> **Status**: gepland.
> **Voorvereiste**: BV-0 t/m BV-5 deployed + werkend.
> **Laatst bijgewerkt**: 6 mei 2026 [EJ]

---

## SAMENVATTING — STATUS PER MODULE

| Module | Status | Toelichting |
|---|---|---|
| `src/lib/ai/brand-context.ts` | ✅ Klaar | Voiceguide query + format, personality voice-velden gestript, fallback voor unmigrated workspaces |
| `src/lib/brand-fidelity/brand-rule-sync.ts` | ✅ Klaar | Legacy + voiceguide streams + unified entry-point |
| `src/lib/brand-asset-completeness.ts` | ✅ Klaar | Personality voice-velden uit criteria |
| `src/features/brand-asset-detail/components/BrandPersonalitySection.tsx` | ✅ Klaar | Card 4+5 vervangen door deprecation banner met read-only fallback |
| `src/features/brand-asset-detail/types/framework.types.ts` | ✅ Klaar | `@deprecated` markers op voice-velden |
| `src/app/api/brandvoiceguide/*` | ✅ Klaar | GET/PATCH + section save-for-AI + recompute-centroid + migrate-from-personality + analyze |
| `src/lib/brandvoice/*` | ✅ Klaar | voice-analyzer-engine + voice-analysis-prompts |
| `src/features/brandvoice/*` | ✅ Klaar | UI (4 tabs + analyzer + companion sidebar) |
| **Onderstaande modules consumeren nog voice-data via de oude paden — REWIRE NODIG** | | |
| `src/lib/brand-fidelity/composition-engine.ts` | 🟡 Rewire | Pillar 1 style-scorer leest BrandPersonality.writingSample |
| `src/lib/brand-fidelity/fidelity-runner.ts` | 🟡 Rewire | Composition input bouwen uit personality |
| `src/lib/brand-fidelity/style-scorer.ts` | 🟡 Rewire | Embedding-match tegen `BrandPersonality.writingSample` |
| `src/lib/studio/brand-voice-directive.ts` | 🟡 Rewire | BVD-extractie uit personality |
| `src/lib/alignment/fix-generator.ts` | 🟡 Rewire | Alignment scanner-fixes lezen voice-velden |
| `src/lib/brand-foundation/coherence-checker.ts` | 🟡 Rewire | Brand consistency check |
| `src/lib/claw/tools/write-tools.ts` | 🟡 Rewire | Campaign tooling voice-context |
| `src/lib/consistent-models/model-context-resolver.ts` | 🟡 Rewire | AI image gen context |
| `src/lib/consistent-models/workspace-context-resolver.ts` | 🟡 Rewire | Workspace AI context |
| `src/lib/ai/exploration/config-resolver.ts` | 🟡 Rewire | AI Exploration brand-personality config |
| `src/lib/ai/prompts/brand-alignment.ts` | 🟡 Rewire | Alignment AI-prompts |
| `src/lib/ai/prompts/website-scanner.ts` | 🟡 Rewire | Website scanner prompts |
| `src/app/api/brand-assets/[id]/framework/route.ts` | 🟡 Rewire | Triggert nog `syncWordsAvoidToRules` (legacy) |
| `src/app/api/studio/[deliverableId]/vanilla-baseline/route.ts` | 🟡 Rewire | F-VAL vanilla GPT-4o comparison |

---

## CUTOVER-VOLGORDE

Logische dependency-chain — items lager in de chain bouwen op items hoger.

### Wave W-1 — Pillar 1 voice fingerprint (F-VAL critical path)

Deze 3 bestanden vormen de F-VAL Pillar 1 (style-scorer). Ze zijn de
zwaartepunt rewire — de centroid-embedding op `BrandVoiceguide` is exact wat
deze code nodig heeft.

1. **`src/lib/brand-fidelity/style-scorer.ts`** — switch input van
   `BrandPersonality.writingSample` (1×) naar `BrandVoiceguide.centroidEmbedding`
   (gecureerd, pgvector). Direct cosine-similarity tegen gegenereerde-content
   embedding ipv string-comparison.

2. **`src/lib/brand-fidelity/composition-engine.ts`** — Pillar 1
   weight-skip-logica: skip Pillar 1 als `voiceguide.centroidEmbedding` null is
   (ipv current "BrandPersonality declared signals" check). Herverdeel weight
   over Pillar 2+3.

3. **`src/lib/brand-fidelity/fidelity-runner.ts`** — `runFidelityScoring()`
   compositionInput build: lees voiceDescription/wordsWeAvoid/antiPatterns uit
   voiceguide ipv personality. Persona/strategy contexten ongewijzigd.

**Regression test verplicht**: 100 sample content versies, score voor +
na de cutover, accept als delta < 5%. Behoud `runFidelityScoring()` API
contract.

### Wave W-2 — Brand Voice Directive (BVD) injectie

`src/lib/studio/brand-voice-directive.ts` extraheert de "verplichte
voice-instructies" voor canvas content-generatie + improve-suggester +
quality-scorer. Switch source van `BrandPersonality.frameworkData` naar
`BrandVoiceguide`. Token budget blijft gelijk (~300 tokens). Output-shape
ongewijzigd zodat downstream consumers (canvas-orchestrator, improve-suggester,
quality-scorer, inline-transform) onveranderd blijven.

### Wave W-3 — Alignment + AI Prompts

Alignment scanner + AI prompts injecteren brand context bij scan/fix
generatie. Allemaal lezen via `getBrandContext()` — die levert nu
`brandVoiceguide` automatisch. **Verifieer dat downstream prompts dat veld
opnemen** ipv alleen `brandPersonality`:

- `src/lib/alignment/fix-generator.ts`
- `src/lib/ai/prompts/brand-alignment.ts`
- `src/lib/ai/prompts/website-scanner.ts`
- `src/lib/brand-foundation/coherence-checker.ts`
- `src/lib/claw/tools/write-tools.ts`

Stappen per bestand:
1. Grep voor `brandPersonality` in prompt builders
2. Voeg `brandVoiceguide` direct ernaast toe in de markdown sectie
3. Update prompt-instructies waar voice-specifiek werk gedaan wordt — verwijs
   naar voiceguide ipv personality

### Wave W-4 — Consistent AI Models brand context

Image-generation in AI Studio gebruikt twee resolvers:

- `src/lib/consistent-models/model-context-resolver.ts`
- `src/lib/consistent-models/workspace-context-resolver.ts`

Beide bouwen een `ModelBrandContext` met o.a. `toneOfVoice` voor het
contextSummary. Switch source van `BrandPersonality.brandVoiceDescription`
naar `BrandVoiceguide.voiceDescription` + `toneDimensions`. Blijf omzichtig met
voice-data in image-prompts (kan letterlijk op een mockup belanden) — zie
keyword-detectie in `prompt-context-builder.ts`.

### Wave W-5 — AI Exploration config voor BRAND_PERSONALITY

`src/lib/ai/exploration/config-resolver.ts` bevat default-fallback config voor
brand-personality met dimensions + field-suggestions die nog naar voice-velden
verwijzen (`toneDimensions.formalCasual`, `wordsWeUse`, etc.). Twee opties:

**Optie A** — Strip voice-dimensions uit personality config, drop ze in een
nieuwe `brand-voice` config die op voiceguide opereert. Vereist nieuwe
exploration-config record + UI integratie in voiceguide pagina (knop "Run AI
Exploration" naast Analyze).

**Optie B** — Behoud personality voice-dimensions als read-only legacy. Niet
weglopen via UI maar wel via DB strippen op de admin config record (Settings >
AI Configuration > BRAND_PERSONALITY).

**Aanbeveling**: optie A. AI Exploration is een waardevolle tool om
voice-discovery te doen — past natuurlijk bij voiceguide. Brand Personality
exploration blijft op psychografische velden focussen.

### Wave W-6 — Framework PATCH endpoint legacy hook

`src/app/api/brand-assets/[id]/framework/route.ts` triggert nog
`syncWordsAvoidToRules` (legacy auto-source `auto:wordsWeAvoid`) wanneer
BrandPersonality.frameworkData wijzigt. Twee aanpassingen:

1. Voeg `syncWorkspaceBrandRules()` aanroep toe na de update — dropt legacy
   rules wanneer voiceguide bestaat (idempotent).
2. Wanneer BV-5 voltooid is en deprecation-window verstreken: verwijder de
   `syncWordsAvoidToRules` aanroep volledig.

### Wave W-7 — F-VAL vanilla baseline

`src/app/api/studio/[deliverableId]/vanilla-baseline/route.ts` bouwt een
GPT-4o call met enkel brief-data — geen brand context. Niets te doen tenzij
we de vanilla baseline ook tegen voiceguide-zonder-fingerprint willen scoren
(verlangt aparte composition-engine variant).

---

## EXISTING BRANDSTYLE ↔ BRANDVOICE INTEGRATION

Twee bestaande secties die overlap hebben met voiceguide:

### Brandstyle "Tone of Voice" tab

`src/features/brandstyle/components/ToneOfVoiceSection.tsx` — bevat
`contentGuidelines` + `writingGuidelines` + `examplePhrases` op de
`BrandStyleguide` tabel. Functioneel overlap met voiceguide (maar
guidance-georiënteerd, niet rule-georiënteerd).

**Aanbeveling**: Behoud beide. Tone-of-voice in styleguide is "do/don't"
guidelines voor menselijke schrijvers. Voiceguide is de machine-leesbare
dataset (rule-sync, fingerprint, AI prompts). Cross-link in beide UIs:

- In ToneOfVoiceSection: kleine card "Voiceguide is the canonical source" → link naar `/knowledge/brand-voice`.
- In voiceguide Voice DNA tab: kleine card "Style guidelines live in Brandstyle" → link naar `/knowledge/brand-style?tab=tone`.

### Brandstyle Tone-of-Voice "saveSavedForAi" toggle

`toneSavedForAi` op BrandStyleguide. Wanneer voiceguide bestaat, wordt
`brandToneOfVoice` (uit styleguide) en `brandVoiceguide` beide in de prompt
gerenderd — kan dubbele info veroorzaken. Optie:

- Gate `brandToneOfVoice` injectie op `voiceguide` afwezig zijn (in
  `getBrandContext` of in prompt-templates).
- Of: behoud beide, accepteer marginaal token-overhead (~50 tokens).

**Aanbeveling**: gate. Voiceguide krijgt voorrang.

---

## RISICO'S + MITIGATIES

| Risico | Mitigatie |
|---|---|
| **Pillar 1 score-regressie** na centroid switch | Verplichte regression-test, 100 versies, delta < 5% |
| **AI prompts dubbel voice-context** (personality + voiceguide tijdens migratie) | Soft-migration fallback in getBrandContext is OK — beide outputs zijn intern consistent. Echte risk pas bij tone-of-voice-styleguide overlap. |
| **Workspaces zonder voiceguide raken voice-context kwijt** | `getBrandContext` heeft fallback — projecteert personality voice-fields in voiceguide-shape wanneer voiceguide null is. |
| **Auto-source `auto:wordsWeAvoid` (legacy) blijft naast `auto:voiceguide.wordsWeAvoid` rules** | `syncWorkspaceBrandRules()` dropt legacy zodra voiceguide bestaat. Hook in framework PATCH endpoint (W-6). |
| **AI Exploration config drift** — voice-dimensions in personality + voice-config | Strip uit personality (W-5 optie A) |

---

## SCHATTING

| Wave | Effort | Risico |
|---|---|---|
| W-1 — Pillar 1 fingerprint | 4-6u + regression test (1u) | Hoog (F-VAL critical) |
| W-2 — BVD injection | 1-2u | Laag |
| W-3 — Alignment + prompts (5 bestanden) | 2-3u | Laag |
| W-4 — Consistent models (2 bestanden) | 1-2u | Middel (image gen) |
| W-5 — AI Exploration config | 2-4u (incl. nieuwe voice config) | Middel |
| W-6 — Framework PATCH hook | 30 min | Laag |
| W-7 — Vanilla baseline | n.v.t. (geen werk tenzij scoping uitbreidt) | — |

**Totaal**: 11-18u + 1u regression test.

---

## SEQUENCING VOORSTEL

1. W-6 eerst (klein, snel) — sluit auto-source dual-write af.
2. W-3 + W-2 parallel — laagrisico, snel resultaat.
3. W-4 — image gen — ook laagrisico.
4. W-5 — AI Exploration migratie + nieuwe brand-voice config (waardevolle UX
   verbetering).
5. W-1 als laatste — F-VAL critical, vereist regression-test, plan voldoende
   tijd.

W-7 alleen als baseline-uitbreiding gewenst.
