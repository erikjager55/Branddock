# Audit + plan — Canvas image-briefing flow

> **Datum**: 2026-05-08
> **Aanleiding**: Erik signaleert drie image-problemen pre-launch — beelden slaan niet terug op content, default = foto terwijl per content-type een andere stijl past, en er is geen briefing-laag die vooraf type+stijl+briefing uitlokt. Pilot-blocker.
> **Voorganger**: `docs/audits/2026-05-08-canvas-studio-state.md` (algemene Canvas/Studio-staat).
> **Scope**: Visual-routes + pickers + content↔prompt-koppeling + per-content-type defaults + bouw-tasks.
> **Out-of-scope**: video-briefing, trained-model training-flow zelf, code-wijzigingen.

---

## TL;DR

1. **Infra is volwassen, briefing-laag is naïef**. Vier visual-source-pipelines (`generate` / `library` / `compose` / `trained-style`) draaien end-to-end, plus losse `hero-image` upserter en `select-library-visual` MediaAsset-binder. Style-chip vocabulaire (8 chips) routeert al naar 3 verschillende generators. Per-source pickers (Library / Compose / TrainedStyle) functioneren. Probleem zit niet in de uitvoering, maar in de **strategische instap**: gebruiker krijgt 8 chips × 4 sources = 32 combinaties zonder content-type-aware default of guided briefing.
2. **Content↔prompt-koppeling is mager**. `buildVisualBriefImagePrompts()` voert alleen `keyMessage` of `objective` als subject-seed in. Subject ontstaat uit één tekst-veld, niet uit hero-message + persona's + product. Brand visual identity loopt wél automatisch mee (kleuren / imagery-style / visual-system); persona's en product features doen dat niet.
3. **Geen content-type aware defaults**. Default source = `generate`, default chip = niets. Een blog-post krijgt dezelfde lege start als een sales-email of LinkedIn-post. Erik's intuïtie ("LinkedIn-post → editorial photo, sales-email → productshot, blog-hero → illustration, tech-doc → infographic") wordt nergens in de code gekapitaliseerd.
4. **UX-fix is niet "nieuw scherm bouwen", het is "Step 1 verrijken + Step 2 routing slimmer"**. `VisualBriefSection` in `Step1Context.tsx` (regels 849-960) is het enige natuurlijke aangrijpingspunt. Geen modal nodig — de Brief leeft al in een sectie van Step 1. Wat ontbreekt: een type-suggestie-strook ("Suggested for blog-post: Illustration · Editorial photo · Infographic") + AI-suggestie voor briefing-tekst.

---

## Laag 1 — Visual-route inventarisatie

| Route (`src/app/api/studio/[deliverableId]/...`) | Trigger / source | Generator(s) | Output | Use-case |
|---|---|---|---|---|
| `generate-visual/route.ts` (325L) | `visualBrief.source === 'generate'` | Auto-router → `selectModelForStyle(chip)`: GPT Image 2 (text/infographic/product), Recraft V3 (illustration), FLUX 2 Pro (default photoreal) | 2-3 variants als `DeliverableComponent` (variantGroup='visual'), persisted to storage | AI image vanaf scratch met chip + brand identity + subject-seed |
| `generate-visual-trained/route.ts` (357L) | `visualBrief.source === 'trained-style'` + `trained.modelId` | `fal-ai/flux-lora` met workspace's `ConsistentModel.falLoraUrl`; LoRA-scale = `LORA_QUALITY_CONFIG[type].loraScale * (strength/100)` | Variants + auto-fire `scoreImageFidelity` | Brand-consistente social/photography via getrainde LoRA (Replicate-trained) |
| `generate-visual-compose/route.ts` (338L) | `visualBrief.source === 'compose'` + 2-9 reference assetIds + instructie | `fal-ai/flux-pro/kontext/multi` (multi-reference compositing) | Variants + fidelity-score | Combineer bestaande library-images tot nieuwe compositie ("Sarah holding the product in coffee shop") |
| `select-library-visual/route.ts` (157L) | `visualBrief.source === 'library'` + assetIds (1-3) | Geen generator — herwaardeert MediaAssets als `DeliverableComponent` rows met `imageSource='library:{assetId}'` | Components zonder AI-call | Curated keuze uit bestaande Media Library |
| `hero-image/route.ts` (155L, POST/DELETE) | InsertImageModal → `setHeroImage()` na elke source | n.v.t. (upsert) | Single component met variantGroup='hero-image' | Persistente "uitgekozen" hero — wordt na elke source-pick auto-set door pickers |
| `compose-video/route.ts` | Video-flow (out of scope) | — | — | — |
| `generate-video/route.ts` | Video-flow (out of scope) | — | — | — |
| `vanilla-baseline/route.ts` (239L) | Misnaam in plan-task — dit is een **tekst-baseline** (GPT-4o zonder brand-context) voor F-VAL demo, niet visueel. SSE-stream. | OpenAI GPT-4o text | Vanilla score t.o.v. Branddock-score | Demo voor "vergelijk met vanilla AI" — geen image-relevantie |

**Conclusie route-laag**: 4 echte image-pipelines (generate / trained / compose / library) + 1 hero-upsert. Allen lezen `settings.visualBrief` server-side; client-pickers persisteren via debounced PATCH naar `/api/studio/[id]`. Aspect-ratio rauwt zichzelf via `MediumEnrichment.specs.imageSize` (LinkedIn → 16:9, Instagram → 1:1, TikTok → 9:16) — al goed.

## Laag 2 — Picker-component inventarisatie

| Component (`src/features/campaigns/components/canvas/...`) | Triggert route | UX |
|---|---|---|
| `LibraryAssetPicker.tsx` (363L) | `select-library-visual` | Search + 8 categorie-chips (HERO/LIFESTYLE/PRODUCT/TEAM/EVENT/PHOTO/ILLUSTRATION/INFOGRAPHIC) + favorites toggle, grid 60 max, multi-pick 1-3 |
| `ComposePicker.tsx` (410L) | `generate-visual-compose` | Compose-instructie textarea + library-search + multi-pick 2-9, persisteert naar `visualBrief.compose` |
| `TrainedStylePicker.tsx` (256L) | `generate-visual-trained` | Dropdown READY-models + strength slider 20-150%, persisteert naar `visualBrief.trained` |
| `InsertImageModal.tsx` (122L) | Multi-source bypass — opent modal met 5 tabs (Library / Upload / URL / Stock / Generate) en zet result als `hero-image` | Werkt **buiten** Visual Brief om — directe hero-set, geen variants. Lichte path die Step 3 Medium aanvult zonder de Step 2 source-flow te kruisen. |

**Conclusie picker-laag**: er bestaat al een paralleluniversum (`InsertImageModal`) dat het briefing-mechanisme volledig negeert. Dit is het echte UX-probleem: gebruiker kan kiezen tussen "go to Step 2 and route via Visual Brief" óf "open Insert Image modal en pak iets". Dat splijt de mentale flow.

---

## Laag 3 — Content↔image-prompt-koppeling

### Huidige koppeling (`src/lib/ai/visual-brief-prompts.ts` regels 111-151)

```
prompt = [
  styleInstruction,                        // VISUAL_STYLE_IMAGE_INSTRUCTIONS[chip]
  `Subject: ${subjectSeed}.`,              // brief.keyMessage ?? brief.objective ?? brand.brandName
  angle,                                   // close / wide / detail
  freeText,                                // styleDirectionFreeText
  visualIdentity,                          // brand colors + imageryStyle + visualSystem
].join(' ')
```

**Wat klopt**: brand visual identity stroomt automatisch in. Style chip stuurt zowel framing als model-keuze. Aspect ratio loopt mee uit MediumEnrichment.

**Wat ontbreekt**:

| Veld | Status | Voorstel |
|---|---|---|
| `brief.keyMessage` | wel gebruikt als subject-seed | houden |
| `brief.objective` | fallback | houden |
| `brief.callToAction` | **niet gebruikt** | toevoegen — bv. "ad-CTA-style" laat de visual een action-shot suggereren |
| `brief.contentOutline` | **niet gebruikt** | als outline begint met "Hoofdstuk 1: ..." → editorial vs. tutorial-style afleidbaar |
| `personas[]` (serialized: name, demographics, role) | **niet gebruikt** | persona age + role + setting → `subject` wordt "37-jarige sales-director in coworking space" i.p.v. abstract |
| `products[]` (name, category, features) | **niet gebruikt** | `product-shot` chip zonder product = onmogelijk; nu valt het terug op brand naam |
| `concept.creativePlatform` | wel via context, niet expliciet in prompt | injecteren als one-liner ("Campaign theme: ${campaignTheme}") |
| `medium.platform` | impliciet via aspect-ratio | expliciet noemen helpt model: "intended for LinkedIn" → meer professional vibe |

### Voorgesteld default-prompt-template per type-beeld

```
{styleInstruction}.
Subject: {persona-led subject if persona+product available else keyMessage}.
{cta-derived action if applicable}.
{angle}.
Brand context: {visualIdentity}.
Campaign theme: {creativePlatform}.
Intended for {platform} ({aspectRatio}).
{freeText}
```

Per type-beeld krijgt `Subject:` een ander template:

| Type-beeld | Subject template |
|---|---|
| `lifestyle` | "{persona role}, {persona setting}, using {product name}" — fallback `keyMessage` |
| `product-shot` | "{product name} — {product category}, hero composition" — fallback brand name |
| `editorial-photo` | "Editorial photograph illustrating: {keyMessage}" |
| `illustration` | "Illustrated metaphor for: {keyMessage}, {creativePlatform} as conceptual cue" |
| `infographic` | "Infographic visualizing: {keyMessage}. Data points: {contentOutline first 3}" |
| `quote-text` | "Typography centerpiece: '{keyMessage truncated 80 chars}'" |
| `behind-the-scenes` | "Documentary shot of {brand name} team {persona setting}" |
| `ugc` | "Phone-shot moment of {persona role} reacting to {keyMessage}" |
| `data-driven` | "Editorial chart: {keyMessage as data hypothesis}" |

---

## Laag 4 — Per-content-type defaults-tabel

Default = startpunt; gebruiker kan altijd overrulen op Step 1. Onderbouwing per regel.

| Content-type | Default source | Default chip | Default model | Onderbouwing |
|---|---|---|---|---|
| `linkedin-post` | generate | lifestyle | FLUX 2 Pro | Editorial mensbeelden converteren > stockfoto's; LinkedIn-feed verwacht human-context, geen productshot |
| `linkedin-article` | generate | editorial-photo (=lifestyle) | FLUX 2 Pro | Long-form thought-leadership leunt op narratief beeld, niet op product |
| `linkedin-ad` | generate | product-shot | GPT Image 2 | Ads converteren beter met clear product-focus + brand-text-accurate model |
| `instagram-post` | generate | lifestyle | FLUX 2 Pro | IG-feed = lifestyle/aesthetic; persona-shot landt sterker dan product |
| `social-carousel` | generate | infographic | GPT Image 2 | Carousel = stap-voor-stap → infographic-stijl met crisp text rendering |
| `tiktok-script` | trained-style (fallback library) | ugc | n.v.t. | Script ≠ image, maar als een visual moet → UGC-stijl + getraind model voor consistentie |
| `facebook-post` | library | lifestyle | n.v.t. | FB heeft minder ruimte voor productie; library-pick is realistisch first-pass |
| `newsletter` (email) | generate | lifestyle | FLUX 2 Pro | Header-beeld lifestyle werkt beter dan productshot in inbox |
| `welcome-sequence` | generate | illustration | Recraft V3 | Onboarding mailings hebben friendly/illustrated beeld nodig — niet zwaar productieel |
| `promotional-email` | generate | product-shot | GPT Image 2 | Promo = product front-and-center; text-rendering nodig voor packaging/labels |
| `blog-post` (hero) | generate | illustration | Recraft V3 | Editorial blog-hero is illustration > foto; differentieert van stockfoto-generieke websites |
| `landing-page` (hero) | compose | lifestyle | FLUX Pro Kontext | Landing-hero verdient compose: persona + product + setting samengesmolten |
| `product-page` | generate | product-shot | GPT Image 2 | Spreekt voor zich — productshot met text-accurate packaging |
| `case-study` | library | behind-the-scenes | n.v.t. | Case-study leent op echte klant-foto's > AI-generation |
| `whitepaper` | generate | infographic | GPT Image 2 | Tech-content = data viz, headline numbers, structured layout |
| `one-pager` (sales) | generate | data-driven | GPT Image 2 | Sales one-pager = chart-led editorial met getallen prominent |
| `sales-deck` | generate | infographic | GPT Image 2 | Per-slide infographic > foto; sluiers uitlegfunctie |
| `proposal-template` | generate | quote-text | GPT Image 2 | Cover = quote/headline-led, niet illustratief |
| `press-release` | library | editorial-photo (=lifestyle) | n.v.t. | PR vraagt om verifieerbare beelden; library-asset > gegenereerd |
| `media-pitch` | library | behind-the-scenes | n.v.t. | Idem PR — authenticiteit > productie |
| `career-page` / `job-ad-copy` / `employee-story` | library | behind-the-scenes | n.v.t. | Echte team-foto's verslaan AI-gen voor employer-branding |
| `internal-comms` | generate | illustration | Recraft V3 | Intern mag illustrated; foto voelt geforceerd |
| `impact-report` | generate | data-driven | GPT Image 2 | Chart-led editorial, headline numbers |

**Totaal: 23 content-types gemapped, ruim boven het minimum van 10.**

Defaults worden geserved via een nieuwe helper `getContentTypeImageDefaults(contentType)` die de mapping retourneert; UI toont dat als suggestie-strook bovenin VisualBriefSection ("Suggested for blog-post: Illustration · 16:9 · Recraft V3 — [Use defaults] [Customize]"). Niet auto-applied, wel preselected.

---

## Laag 5 — UX-flow concept

**Beslissing**: geen aparte modal — verrijk bestaande `VisualBriefSection` in `Step1Context.tsx` met een type-suggestie-strook + AI-briefing-suggestie. Step 2 routeert al per source. `InsertImageModal` blijft als snelle bypass-laag voor hero-image, maar krijgt een "Use Visual Brief" call-out om de strategische flow te promoten.

### Schets — VisualBriefSection na uitbreiding

```
┌─────────────────────────────────────────────────────────────────┐
│  Visual Brief                                                    │
│  How the visual gets made.                                       │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ Suggested for "Blog post"                                 │   │
│  │ Illustration · 16:9 · Recraft V3                          │   │
│  │ Why: editorial blog-heroes converteren beter met          │   │
│  │      illustratie dan stockfoto's.                          │   │
│  │                              [Use defaults]  [Customize ▾]│   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                  │
│  Source                                                          │
│  ◉ Generate    ○ From library   ○ Compose                        │
│  ○ Trained     ○ No visual                                       │
│                                                                  │
│  Style direction                                                 │
│  [Lifestyle] [Product shot] [Quote / text] [Behind the scenes]   │
│  [UGC] [Infographic] [●Illustration] [Data-driven]               │
│                                                                  │
│  Briefing                                                        │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ Sketch out the scene the AI should depict.                │   │
│  │                                                           │   │
│  │ ✨ Suggest from content [tap to fill]                     │   │
│  └──────────────────────────────────────────────────────────┘   │
│  Free-text style notes                                           │
│  [_________________________________________________________ ]    │
└─────────────────────────────────────────────────────────────────┘
```

**Drie keuzes (a/b/c) zoals plan-task vraagt**:

- (a) **Type beeld** = `source` × `styleDirection` (al in code; nu krijgt een suggestie-strook bovenin op basis van content-type)
- (b) **Stijl** = chip-selectie per type relevante opties (al in code; suggestie zet pre-selected chip op basis van defaults-tabel)
- (c) **Briefing-tekst** = nieuw veld `visualBrief.briefingText` (los van `styleDirectionFreeText`) + AI-suggestie-knop die `keyMessage + persona + product + concept` samenvouwt naar concrete subject-omschrijving

### Sanity-check (vereiste door plan-task)

LinkedIn-post over Better Brands' nieuwe service:

- **Huidige flow**: gebruiker klikt direct op Generate → prompt = "Subject: ${keyMessage} (`We helpen merken hun strategie scherp krijgen`). Close composition. {brand colors}." → resultaat: abstract gestyled beeld zonder mens.
- **Voorgestelde flow**: 
  - Suggestie-strook: "LinkedIn post → Lifestyle, FLUX 2 Pro" → klik Use defaults → chip = lifestyle, source = generate
  - Briefing-tekst AI-suggestie: "Sarah, brand director (37) in coworking space, gespreksopstelling met laptop open, heldere ochtendsetting" — uit persona + setting
  - Prompt = "Lifestyle photography: real people in authentic situations... Subject: 37-year-old brand director in coworking space, conversational setting, morning light. Brand colors: ${visualSystem}. Intended for LinkedIn (16:9). ${freeText}"

Resultaat: persona-grounded, platform-aware, on-brand. Antwoord op sanity-check: **ja**, beduidend betere visual.

---

## Laag 6 — Bouw-task clustering

Drie tasks geprioriteerd binnen pre-launch:

1. **`canvas-image-briefing-defaults`** — per-content-type defaults-helper + suggestie-strook in `VisualBriefSection`
   - Effort: 1 dag
   - Files: `src/features/campaigns/constants/image-briefing-defaults.ts` (nieuw), `src/features/campaigns/components/canvas/accordion/Step1Context.tsx` (suggestie-strook), `src/features/campaigns/stores/useCanvasStore.ts` (action `applyImageBriefingDefaults`)
   - Trigger: gebruiker opent Step 1, ziet "Suggested for {type}", klikt Use defaults, source + chip + model worden ingevuld
   
2. **`canvas-image-content-coupling`** — content-coupled image-prompt builder
   - Effort: 1-1.5 dag
   - Files: `src/lib/ai/visual-brief-prompts.ts` (uitbreiden builder), `src/lib/ai/canvas-context.ts` (verrijken `subject` parameter), 4 visual-routes (signature `buildVisualBriefImagePrompts` aanpassen — non-breaking)
   - Effect: persona + product + cta + concept + platform stromen automatisch in prompt
   
3. **`canvas-image-briefing-textarea`** — briefing-textarea + AI-suggestie-knop in `VisualBriefSection`
   - Effort: 1 dag
   - Files: `src/features/campaigns/components/canvas/accordion/Step1Context.tsx` (nieuwe textarea + button), `src/lib/ai/canvas-context.ts` (extend VisualBrief met `briefingText`), `src/app/api/studio/[deliverableId]/suggest-visual-briefing/route.ts` (nieuw — Claude-call die context samenvouwt)

**Optioneel uit te stellen** (niet in deze ronde):

- Visual-fidelity uitbreiding voor content-relevance-score — kan als sub-task na de 3 hoofdtaken; eerst de coupling werkend krijgen, dan meten.
- `InsertImageModal` deprecation / merge met VisualBriefSection — eigen tweak-task, niet pilot-blokkerend.

---

## Open vragen voor Erik

1. **Blog-post default = illustration of editorial-photo?** Defaults-tabel zegt illustration (Recraft) — Erik's intuïtie zei "blog-hero → illustration", dus aanname klopt. Maar: voor jouw eigen Branddock-blog werkt dat dezelfde keuze? Of wil je per workspace defaults-overrides? Voor pilot-fase: geen overrides, hardcoded. Workspace-overrides → backlog.
2. **Compose als default voor `landing-page`?** Compose vereist 2+ library-assets — als workspace nog leeg is, valt het terug op generate. Acceptabel als auto-fallback, of wil je expliciete melding "Compose niet beschikbaar — terugval op generate"?
3. **AI-suggestie-knop voor briefing-tekst — instant of streaming?** Streaming = betere UX, instant = simpeler. Voor pilot kies ik instant (single Claude-call, ~2s response). Toch streamen?
4. **`tiktok-script` default = trained-style** — vereist getraind model. Geen model = fallback library. Erik: heb je al getrainde modellen in pilot-workspace? Zo nee → fallback `lifestyle` ipv library kan beter.
5. **Briefing-tekst veld los van `styleDirectionFreeText`?** Plan-task vraagt drie keuzes (type + stijl + briefing). `styleDirectionFreeText` doet nu al briefing-werk. Splitsen geeft helderheid (briefing = wat erop staat, freeText = stijl-uitzonderingen). Aanname: splitsen.

---

## Bronnen geraadpleegd

- `src/app/api/studio/[deliverableId]/generate-visual/route.ts`
- `src/app/api/studio/[deliverableId]/generate-visual-trained/route.ts`
- `src/app/api/studio/[deliverableId]/generate-visual-compose/route.ts`
- `src/app/api/studio/[deliverableId]/select-library-visual/route.ts`
- `src/app/api/studio/[deliverableId]/hero-image/route.ts`
- `src/app/api/studio/[deliverableId]/vanilla-baseline/route.ts` (bleek tekst-baseline, niet visueel)
- `src/lib/ai/visual-brief-prompts.ts` (chip → instructie + model-router)
- `src/lib/ai/canvas-context.ts` (VisualBrief type + content-type → medium mapping)
- `src/features/campaigns/components/canvas/InsertImageModal.tsx`
- `src/features/campaigns/components/canvas/LibraryAssetPicker.tsx`
- `src/features/campaigns/components/canvas/ComposePicker.tsx`
- `src/features/campaigns/components/canvas/TrainedStylePicker.tsx`
- `src/features/campaigns/components/canvas/accordion/Step1Context.tsx` (regels 780-960 VisualBriefSection)
- `src/features/campaigns/components/canvas/accordion/Step2ContentVariants.tsx` (regels 540-650 source-routing)
- `src/features/campaigns/constants/canvas-flow-registry.ts`
- `src/features/campaigns/constants/medium-config-registry.ts`
- `docs/audits/2026-05-08-canvas-studio-state.md`
