---
id: linkedin-carousel-verbeterplan
title: LinkedIn-carousel content-type verbeterplan (architectuur + prompt + asset-pipeline)
fase: pre-launch
priority: needs-triage
effort: ~3-5d totaal pre-launch (afhankelijk van scope-keuze C2), ~10-15d post-launch (asset-pipeline)
owner: tbd
status: draft
created: 2026-05-19
related-spec: docs/playbooks/testplan-content-items.md (Social Media matrix linkedin-carousel)
related-task: content-items-test-coverage
related: tasks/_drafts/idea-ebook-quality-verbeterplan.md (analoge structuur + H2 asset-pipeline gap is gedeeld concern)
---

# Probleem

Gebruikers-rapport 2026-05-19: "De LinkedIn-carousel is nu niet goed uitgedacht."

Twee parallelle Explore-agents (input-fields/preview/assets + prompt-comparison met social-carousel) identificeerden **6 issue-categorieën**, oplopend van quick-win prompt-fixes tot een ontbrekende multi-slide asset-pipeline. Sommige issues zijn ook van toepassing op `social-carousel`, dus de architecturale beslissingen hier hebben downstream impact.

Onder de motorkap zit een spanning: de prompt-template **beschrijft** een 7-10 slide visual storytelling format met per-slide design-suggesties, maar de **asset-pipeline + preview** behandelen output als single-image text-content. Dat gat verklaart de "niet goed uitgedacht" perceptie — de twee lagen zijn niet op elkaar afgestemd.

# Diagnose-evidence (2 parallelle Explore-agents 2026-05-19)

## C1 — Asset-pipeline mismatch met multi-slide intent (CRITICAL — feature-gap)

**Wat de prompt zegt** (`social-media.ts:113-189`):
- "7-10 slides optimal" (regel 133)
- Per-slide visual direction verplicht: "Suggest background color/theme, icons or simple graphics, text layout" (regel 135)
- "Consistent visual" als één van 5 TEACH-pijlers (regel 122-123)

**Wat de asset-pipeline doet**:
- `generate-visual/route.ts`: linkedin-carousel staat NIET in `MULTI_CANDIDATE_DEFAULTS` → defaultt naar **2 image-variants totaal** (regel 42-51)
- `MODALITY_DEFAULTS` (`deliverable-types.ts:81-115`): linkedin-carousel NIET in lijst → fallback "photo" (regel 123)
- Geen per-slide image-generation, geen "slide consistency checker"

**Wat de preview doet** (`LinkedInCarouselPreview.tsx`):
- ✅ Component bestaat + heeft slide-navigation UI (prev/next + dot-pagination + "3/8" counter)
- ❌ Maar rendert per slide enkel: `imageVariants[currentSlide]?.url` + caption-text. Met 2 image-variants en 8 slide-labels in tekst-output betekent dat: slides 3-8 hebben hetzelfde image (variant 0 of 1 toggle) terwijl de tekst per slide anders is
- ❌ Geen visuele slide-deck rendering — de "[Slide 1: Dark navy background, white bold text]" instructies uit de prompt worden niet visueel uitgevoerd

**Conclusie**: De carousel is gebouwd als "single-image wrapper met multi-slide text-output", niet als dedicated multi-slide visual storytelling format. Per-slide visuals zijn een **never-built feature**, vergelijkbaar met ebook H2.

## C2 — Prompt-duplicatie met `social-carousel` (~75% identiek, maintenance-risk)

**Methodology framing** is verschillend in naam maar identiek in functie:
| | linkedin-carousel | social-carousel |
|---|---|---|
| Naam | TEACH (Title / Each-slide / Action / Consistent / Hook-back) | SLIDE MOMENTUM (Cover-billboard / One-idea / Progressive / Visual / Save-worthy) |
| Filosofie | Structure-scaffold | Psychology-scaffold |
| Output | 7-10 slides, cover+context+core+summary+CTA | 7-10 slides, idem |

**Anti-patterns 75% identiek kopieerd**:
- "NEVER >25-30 words per slide" — beide
- "NEVER inconsistent styling" — beide
- "NEVER boring cover" — beide
- "NEVER stock photo BG" — beide
- "NEVER <5 slides" — beide
- "NEVER paraphrase-duplicate slide headings" — woord-voor-woord identiek (commit `e85f636a` van 2026-05-19)

**Drie unieke aspecten** maken differentiatie niet substantieel:
- linkedin-carousel: "Posting time: Tue-Thu 8-10 AM" + "LinkedIn's share format"
- social-carousel: "Summary = most-saved slide", "Value by slide 3 at the latest", "Text-heavy split logic"

**Maintenance-belasting**: elke wijziging aan carousel-basis moet in TWEE prompts. Anti-pattern wording is al licht aan het driften (`paraphrase-duplicate` regel is identiek, maar `text-heavy` zit alleen in social-carousel).

## C3 — Input-fields onder-gespecificeerd

**Huidige velden linkedin-carousel** (`content-type-inputs.ts:1466-1486`):
- `skeletonInputFields('slide')` × 3: slideSkeleton, slideHook, payoffPosition
- `carouselContentStyleFields()` × 2: transitionStyle, includeCtaSlide
- `slidesCount()` × 1: number (open)
- `narrativeStructure` × 1: select (Listicle / Before&After / Problem→Solution / Data Story / How-To Guide)

**Gaps**:
1. `slidesCount()` is een **open number** zonder min/max — gebruiker kan 3 of 50 invullen terwijl prompt 7-10 als optimum zegt. Geen UI-enforcement.
2. **Geen platform-keuze** — social-carousel heeft expliciet Instagram/LinkedIn/Facebook dropdown, linkedin-carousel is hardcoded LinkedIn. Inconsistent.
3. **Visual theme split** — comment in `content-type-inputs.ts:632` zegt "Visual theme moved to Visual Brief (settings.visualBrief.styleDirection)". Maar voor carousel-specifieke deck-styling (consistent palette across slides) is dat niet hetzelfde concept. Parallel/verwarrend.
4. **Geen swipe-trigger formule veld** — engagement-gate-per-slide (max-words enforcement, hook-rotation per slide) zit hardcoded in prompt zonder UI-control.
5. **Geen narrative-arc-closure veld** — circular-loop (hook back to slide 1) vs cheat-sheet vs cliffhanger is een echte design-keuze die nu impliciet uit narrativeStructure volgt.

## C4 — Quality-criteria mismatch met multi-slide formaat

**Huidige `qualityCriteria`** (`deliverable-types.ts:381`): `LINKEDIN_DEFAULTS.qualityCriteria`
- Professional Tone 25%
- Platform Fit 25%
- Engagement Hooks 20%
- Brand Voice 20%
- Accessibility 10%

**Wat ontbreekt voor multi-slide content**:
- **Narrative Coherence** — werkt de 7-10 slide arc als één verhaal? Verbinden bridges tussen slides?
- **Slide Flow / Pacing** — escaleert value progressief? Geen front-loading / no dead slides?
- **Per-slide Distinctness** — is elke slide een unieke contribution, of paraphrase-rijp?

Deze dimensies zitten nu impliciet in "Platform Fit" 25% wat te coarse-grained is. Een carousel die op alle 5 LINKEDIN_DEFAULTS criteria 80+ scoort kan nog steeds een lopsided / repeating-slides carousel zijn.

## C5 — Inconsistente constraints tussen linkedin-carousel & social-carousel

**Niet-gedocumenteerde verschillen**:
| Field | linkedin-carousel | social-carousel | Vraag |
|---|---|---|---|
| `maxChars` | 3000 | 2200 | Waarom? LinkedIn carousel-caption-limit is 3000, IG is 2200 — dat zou de reden zijn, maar nergens in code/comment vastgelegd |
| `maxHashtags` | 5 | (geen limit) | Idem niet gedocumenteerd |
| `outputFormats` | `["Carousel"]` | `["Carousel"]` | Identiek |
| `exportFormats` | `['pdf', 'png']` | `['pdf', 'png']` | Identiek |

Niet kritiek maar code-hygiene issue: zonder rationale-comment is onduidelijk of deze verschillen intentioneel zijn of legacy-drift.

## C6 — Multi-candidate image-gen miscalibration

`MULTI_CANDIDATE_DEFAULTS` (`generate-visual/route.ts:42-51`):
- `instagram-post-carousel`: 3 variants
- `instagram-post`: 3 variants
- alles anders incl. linkedin-carousel + social-carousel: defaultt naar 2

Voor multi-slide format zou je intuïtief MEER variants verwachten (cover-design proeftjes voor 3-5 verschillende hooks), niet minder. De 2-vs-3 splitsing is onsystematisch — niet duidelijk waarom Instagram-carousel meer keuze krijgt dan LinkedIn-carousel.

# Aanpak — gefaseerd pre-launch bundle + post-launch backlog

Vergelijkbaar met de ebook-verbeterplan structuur: prompt-laag fixes pre-launch (snel + lage risk), feature-gap post-launch.

## Pre-launch fixes (~3-5d totaal)

### C1-mitigatie (NIET volledig fixen — alleen managen)

C1 (asset-pipeline gap) is een feature-gap te groot voor pre-launch. Same playbook als ebook H2-A: **expectation-bijstellen via testplan-disclaimer + UI-banner**, niet feature-build.

Concreet:
- Update testplan-content-items.md matrix Notes voor linkedin-carousel + social-carousel: "Visual deck rendering = handmatig per slide via Step 3 InsertImageModal. Auto-generated per-slide visuals zijn post-launch feature."
- Optioneel: in-canvas banner wanneer carousel-type wordt geopend en imageVariants.length < expectedSlides, met message: "Pre-launch: voeg per slide handmatig een image toe via Step 3. Auto-multi-slide-generatie volgt post-launch."

Effort: ~30 min docs + ~2u optional banner.

### C2 — Prompt-consolidation (twee opties, kies één)

**Optie A (Recommended, ~2-3u)**: Refactor naar shared base + platform-suffix.

Maak nieuwe `buildCarouselSystemPrompt(platform: 'linkedin' | 'instagram' | 'facebook')` helper in `social-media.ts` of nieuw `carousel-shared.ts`. Output:
- Gemeenschappelijk skelet: methodology (gechoose: SLIDE MOMENTUM is sterker, want het focust op user-psychology), structure-skeleton (7-10 slides, kies de strictere variant: social-carousel's 5 core slides ipv linkedin's 6), few-shot example (één per platform), full anti-patterns + completeness.
- Platform-suffix:
  - linkedin: "Tue-Thu 8-10 AM posting tip, LinkedIn share-format positioning, Professional tone"
  - instagram: "Saves = algorithmic gold, IG-aspect-ratio 1080x1080"
  - facebook: (TBD — currently social-carousel only fragment)

Voordeel: één plek voor carousel-rules, anti-pattern updates landen in beide platforms tegelijk, geen drift-risk.

Risk: refactor raakt 2 prompt-templates + buildSocialUserPrompt-suffix-aanroepen. Test alle 3 platforms na change.

**Optie B (Conservative, ~30min)**: Backport social-carousel's unieke anti-patterns + completeness items naar linkedin-carousel zonder structurele refactor.

Concreet:
- Voeg "NEVER make slides text-heavy" anti-pattern toe aan linkedin-carousel
- Voeg "NEVER frontload context — value by slide 3" anti-pattern toe
- Voeg "Summary/cheat sheet included" completeness check toe (was impliciet)
- Voeg "Get to value by slide 3" instructie toe in METHODOLOGY sectie

Voordeel: snel + non-breaking + behoudt twee parallel-prompts (toekomstige consolidation blijft mogelijk).

Risk: duplicate-maintenance burden blijft. Niet de root-cause aangepakt.

**Aanbeveling**: Optie B pre-launch (snel afronden voor testronde), Optie A in eerste sprint post-launch wanneer derde platform (Facebook of TikTok-carousel) wordt toegevoegd.

### C3 — Input-field upgrades (~1-2u)

1. **`slidesCount()` met min/max bounds** (`content-type-inputs.ts:360-371`):
   ```ts
   function slidesCount(): ContentTypeInputField {
     return {
       key: 'slidesCount',
       label: 'Number of Slides',
       category: 'format-specs',
       type: 'number',
       placeholder: 'e.g. 8',
       min: 5,   // ← nieuw
       max: 10,  // ← nieuw
       helpText: 'Target slide count (5-10, optimum 7-9 voor engagement)',
       ...
     };
   }
   ```
   Vereist check of `ContentTypeInputField` schema min/max ondersteunt — anders mini-uitbreiding aan de Zod-/type-laag.

2. **`narrativeArcClosure` veld** toevoegen aan linkedin-carousel:
   ```ts
   {
     key: 'narrativeArcClosure',
     label: 'Final-slide Strategy',
     type: 'select',
     options: [
       { value: 'circular', label: 'Circular — hook back to slide 1' },
       { value: 'cheat-sheet', label: 'Cheat-sheet — recap all key points' },
       { value: 'cliffhanger', label: 'Cliffhanger — tease follow-up content' },
     ],
     helpText: 'How the final slide closes the narrative arc',
     aiDerivable: true,
     aiHint: 'Pick based on narrativeStructure: data-story → cheat-sheet, listicle → circular, how-to → cliffhanger',
   }
   ```

3. **Platform-veld** — als Optie A (consolidation) wordt gekozen voor C2, kan dit één veld worden in shared base. Anders skippen om scope te beperken.

### C4 — Quality-criteria multi-slide aware (~1d)

Voeg een carousel-specifieke `qualityCriteria` override toe op linkedin-carousel + social-carousel deliverable-types. Bv.:
```ts
qualityCriteria: [
  { name: 'Narrative Coherence', weight: 0.20 },  // nieuw
  { name: 'Slide Distinctness', weight: 0.15 },   // nieuw
  { name: 'Platform Fit', weight: 0.20 },
  { name: 'Engagement Hooks', weight: 0.20 },
  { name: 'Brand Voice', weight: 0.15 },
  { name: 'Accessibility', weight: 0.10 },
]
```

Vereist:
- Check of `qualityCriteria` doorwerkt in F-VAL judge-rubric of alleen UI-display is (per de eerdere ebook H3.3 analyse: rubric-weights zijn workspace-level configureerbaar via `FidelityConfig.rubricWeightOverrides`, NIET per-content-type → deze override-flow bestaat misschien nog niet)
- Als rubric-weights pre-launch niet per-type aanpasbaar zijn: defer naar H3.3 follow-up (zelfde post-launch backlog als ebook).

**Recommendation**: C4 defer naar post-launch (gedeeld met ebook H3.3 task — "per-content-type rubric weights").

### C5 — Constraint-documentatie (~15min)

Voeg comments toe aan `deliverable-types.ts` linkedin-carousel + social-carousel entries:
```ts
// LinkedIn caption-limit is 3000 chars (vs IG 2200) — niet de slide-tekst maar
// het post-comment-veld dat LinkedIn boven de carousel toont
constraints: { maxSlides: 10, maxChars: 3000, maxHashtags: 5 },
```

Of: hernoem `maxChars` naar `maxCaptionChars` voor clarity. Klein.

### C6 — Multi-candidate aligning (~15min)

Voeg linkedin-carousel + social-carousel toe aan `MULTI_CANDIDATE_DEFAULTS`:
```ts
const MULTI_CANDIDATE_DEFAULTS: Record<string, number> = {
  'instagram-post-carousel': 3,
  'instagram-post': 3,
  'linkedin-carousel': 3,    // ← nieuw
  'social-carousel': 3,      // ← nieuw
};
```

Geeft tester 3 cover-image-variants i.p.v. 2. Klein.

# Concrete pre-launch bundle (recommended)

| Stap | Issue | Effort | Type |
|---|---|---|---|
| 1 | C1-A testplan-disclaimer voor carousel asset-pipeline | 30 min | docs |
| 2 | C2-B backport social-carousel anti-patterns naar linkedin-carousel | 30 min | prompt |
| 3 | C3.1 slidesCount() min/max bounds | 1u | input-field + Zod schema check |
| 4 | C3.2 narrativeArcClosure veld | 30 min | input-field |
| 5 | C5 constraint-rationale comments | 15 min | docs in code |
| 6 | C6 MULTI_CANDIDATE_DEFAULTS uitbreiding | 15 min | config |
| 7 | PROMPT_VERSION bump 1.3.0 → 1.4.0 | 1 min | bookkeeping |

**Totaal pre-launch**: **~3u werk** (1 sessie).

# Post-launch backlog (~10-15d)

| Issue | Wat | Effort |
|---|---|---|
| **C1 full** | Multi-slide asset-pipeline: per-slide image-generation, slide-consistency checker, deck-export PDF | 7-10d |
| **C2-A** | Prompt-consolidation refactor (buildCarouselSystemPrompt shared) | 2-3d |
| **C4** | Per-content-type rubric-weights (gedeeld met ebook H3.3) | 3-4d |
| C3.3 | Platform-veld toevoegen voor carousels (if Optie A) | 1u |

# Bestanden die geraakt worden (pre-launch bundle)

- `src/lib/studio/prompt-templates/social-media.ts` (PROMPT_VERSION + linkedin-carousel anti-patterns)
- `src/features/campaigns/lib/content-type-inputs.ts` (slidesCount + narrativeArcClosure)
- `src/features/campaigns/lib/deliverable-types.ts` (rationale-comments)
- `src/app/api/studio/[deliverableId]/generate-visual/route.ts` (MULTI_CANDIDATE_DEFAULTS)
- `docs/playbooks/testplan-content-items.md` (matrix Notes voor linkedin-carousel + social-carousel)

# Verifieerbaarheid

Eind-state pre-launch: tester kan een linkedin-carousel maken in Napking/LINFI workspace en zien:
- 5-10 slides constraint UI-enforced bij slidesCount input
- narrativeArcClosure dropdown beschikbaar
- 3 image-variants gegenereerd voor cover (i.p.v. 2)
- Prompt-output structureel rijker (text-heavy slides geweigerd, value-by-slide-3 pacing, summary slide expliciet)
- Carousel-preview met 3 image-variants + slide-navigation werkt nog steeds
- Testplan-disclaimer zegt expliciet dat per-slide visuals post-launch zijn → expectation gemanaged

# Risico's

- **C2-B backport** kan prompt-output subtiel verschuiven — model gaat dezelfde slides met andere word-budget genereren. Risk laag (anti-patterns versterken, geen nieuwe regels). Manual smoke-test op carousel-output.
- **C3.1 min/max** vereist dat ContentTypeInputField schema dit ondersteunt — als niet, mini-uitbreiding aan de schema-laag (~30min extra).
- **C6 3-variants** kost ~30% meer image-generation tokens. Acceptabel — multi-slide format rechtvaardigt meer cover-keuze.

# Out of scope

- Volledige multi-slide visual deck-pipeline (= post-launch feature)
- Refactor van TWEE-prompt-structuur naar ÉÉN consolidated (= Optie A, post-launch)
- Per-content-type rubric-weights (= gedeeld met ebook H3.3)
- Aparte FacebookCarousel of TikTokCarousel content-types (= scope-creep)

# Notes

- Brand: LINFI (architect-audience, vergelijkbaar met ebook test)
- Workspace: getest 2026-05-19
- Gerelateerd aan ebook-verbeterplan H2 (universele asset-pipeline gap)
- Gerelateerd aan H3 fidelity-runner fix (commit `fe95fef9`) — raakt linkedin-carousel automatisch positief
- Commit-niveau testronde voortgang: zie content-items-test-coverage.md Notes-sectie

# Volgende stappen voor promote

Wanneer je deze idea wilt uitvoeren:
1. Promote naar concrete task-file: `tasks/linkedin-carousel-prompt-polish.md` (C2-B + C3.1 + C3.2 + C5 + C6 bundle, ~3u)
2. Schedule bij sprint #5 of #6 fill-in tussen Track C werk
3. Voor full C1 build: aparte ADR voor multi-slide asset-pipeline first
