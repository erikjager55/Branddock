# Content-items design-quality: lessen uit DTS Ede

> **Status**: ✅ **done 2026-05-29** — alle 11 items (C1-C11) uitgevoerd in branch `branddock-feat-web-page-builder-canvas` via commits `39171432` (C1+C2+C6+C7+C9 copy-DNA + sticky-CTA) en `d06b428e` (C3+C4+C5+C8+C10+C11 visuele DTS-verbeteringen).
> **Scope**: verbeteringen aan **gegenereerde content-items** (landing-pages, ads, e-mails, blog-posts) — niet aan de design-system management. Voor dat laatste: zie [`dts-comparison-improvements.md`](./dts-comparison-improvements.md).
> **Bron**: `~/Projects/branddock-app/docs/experiments/DTS Ede Design System/`

---

## 1. Waarom DTS-output zo herkenbaar is

DTS-content voelt **specifiek voor dit merk** — niet generic. Ontleed in 7 specifieke designkeuzes die elke pagina/blog/ad raken:

| Designkeuze | Voorbeeld DTS | Effect |
|---|---|---|
| **Vocabulary-rails** | "Solide overwinning" / "Magere zege" — nooit "Revolutionary", "Premium" | Copy klinkt als de buurman over de heg, niet als marketing |
| **Uppercase eyebrow** | `WELKOM BIJ DTS '35 EDE` boven elke hero | Civic / sign-plaque associatie — typisch voor sport-clubs |
| **Tight type-scale + weight-strategie** | Body 300, h3 500, h1/h2 700, display 900 | Hiërarchie alleen via weight, niet via kleur — bruikbaar zonder accent-kleur |
| **Hard sectie-structuur** | "1 hero + 1-2 rijen cards op 12-col grid" — geen verrassingen | Voorspelbaarheid voelt vertrouwd, niet saai |
| **Concrete copy-rules** | "Actief, 15-20 woorden, front-load belangrijkste fact" | Variant-generator output meteen herkenbaar |
| **No-accent palet** | Alleen blauw + grijs-ramp, geen success-green / error-red | Brand-coherentie over élk element |
| **Real placeholders** | News-cards met echte headlines uit live site | Demo-output voelt productie-rijp, niet lorem-ipsum |

Geen van deze 7 zit nu volledig in de Branddock content-pipeline. We hebben de **infrastructuur** (BrandTokens v4 + variant-generator + Puck-renderer) maar consumeren niet deze laag van **content-DNA**.

## 2. Plan: 7 content-verbeteringen

### C1 — Vocabulary-rails in variant-generator (HOOG impact, ~1 dag)

**Wat ontbreekt nu**: variant-generator krijgt brand-tone-hint (RULER: "premium, refined") maar geen DO/DON'T-lijst. AI grijpt naar generic woorden ("innovative", "revolutionary") als de promptcontext te open is.

**Wat doen**:
- Voeg `BrandVoiceguide.vocabularyDo` + `vocabularyDont` (string[]) toe aan schema
- AI Phase 3 (Voice & Imagery analysis) extraheert 8-12 do/don't-paren uit gescrapede bodyText:
  - Do: keywords + zinsneden die het merk daadwerkelijk gebruikt
  - Don't: hype-vocabulaire dat het merk vermijdt (vergelijking obv archetype)
- Variant-generator system-prompt krijgt expliciete sectie:
  ```
  Vocabulary discipline:
  - Use these phrases when natural: {vocabularyDo}
  - Never use: {vocabularyDont}
  ```
- F-VAL judge checkt output op vocabulary-conformiteit (nieuwe sub-criterium)

**Files**:
- `prisma/schema.prisma` — twee String[] velden op BrandVoiceguide
- `src/lib/brandstyle/analysis-prompts.ts` — Phase 3 prompt uitbreiden
- `src/lib/landing-pages/variant-generator.ts` — system-prompt sectie
- `src/lib/landing-pages/landing-page-quality.ts` — nieuwe vocabulary-fit dimensie

**Verwacht effect**: LINFI variants gebruiken geen "innovative" of "premium quality" meer maar woorden als "op maat", "vakmanschap", "millimeter nauwkeurig" — exact wat linfi.nl zelf doet.

---

### C2 — Few-shot sample-paragraaf in voice (HOOG impact, ~0.5 dag)

**Wat ontbreekt nu**: tone-rules zijn beschrijvend ("authoritative"). AI heeft geen voorbeeld in eigen brand-voice om te imiteren.

**Wat doen**:
- AI Phase 3 extraheert (uit gescrapede bodyText) één representatieve paragraaf 40-80 woorden in de brand's eigen voice
- Persist als `BrandVoiceguide.voiceSample TEXT`
- Variant-generator system-prompt krijgt:
  ```
  Voice example (this brand's own writing):
  > {voiceSample}
  
  Match this voice: tone, rhythm, sentence length, vocabulary.
  ```
- Geen extra cost — Phase 3 draait al

**Files**: zelfde als C1 + 1 extra prompt-veld.

**Verwacht effect**: variant-output rhythm matcht het bron-merk veel scherper. LINFI bijv. krijgt korte declaratieve zinnen ipv lange features-listings.

---

### C3 — Hard render-rules per archetype (MEDIUM impact, ~1 dag)

**Wat ontbreekt nu**: BrandTokens v4 heeft soft-defaults (button.hoverStyle = darken). Geen expliciete "Never use X" constraints in renderer-logica.

**Wat doen**:
- Nieuwe constanten-bestand `src/lib/landing-pages/render-constraints.ts` met per archetype een hard-rules object:
  ```ts
  RULER: {
    allowGradients: false,        // alleen photo-scrim
    allowShadow: 'none',          // cards mogen alleen border-only
    allowEmoji: false,
    allowExclamationMarks: false, // copy-validator
    maxAccentColors: 0,           // alleen brand + neutrals
    maxRadiusPx: 4,               // sharp corners
    capitalisation: 'sentence',   // h1/h2; banners=uppercase
  },
  JESTER: {
    allowGradients: true,
    allowShadow: 'medium',
    allowEmoji: true,
    maxAccentColors: 2,
    maxRadiusPx: 24,
    capitalisation: 'sentence',
  },
  // ...12 archetypes
  ```
- Renderer enforced: BrandHero faalt gracefully wanneer een variant probeert te renderen met gradient-bg + archetype=RULER (fallback naar solid)
- variant-generator system-prompt krijgt de RELEVANTE rules: "No emoji. No exclamation marks. Max 4px radius."

**Files**:
- `src/lib/landing-pages/render-constraints.ts` (nieuw)
- `src/features/campaigns/components/canvas/medium/puck-config.tsx` — enforce
- `src/lib/landing-pages/variant-generator.ts` — copy-constraints prompt

**Verwacht effect**: variants kunnen niet meer "off-brand" renderen ook al staan tokens op default. Voorkomt dat een RULER-merk per ongeluk een speelse gradient krijgt.

---

### C4 — Type-scale uitbreiding (MEDIUM impact, ~0.5 dag)

**Wat ontbreekt nu**: DesignSystem.typography heeft 3-5 sizes per role per layoutStyle. Geen banner / display / eyebrow utility-classes.

**Wat doen**:
- DesignSystem uitbreiden met `bannerStyle` (uppercase + tracking + weight) en `displayStyle` (hero-mega-text)
- BrandTokens.text adden:
  ```ts
  text: {
    heading: { color, weight, ... }    // fg1 - donker
    body: { color, weight, ... }       // fg2 - charcoal
    secondary: { color, weight, ... }  // fg3 - slate
    caption: { color, weight, ... }    // fg4 - medium-gray
  }
  ```
- Renderers gebruiken text-rol per element:
  - h1 → text.heading
  - p → text.body
  - .meta → text.secondary
  - .caption / sub-meta → text.caption

**Files**:
- `src/lib/landing-pages/design-system.ts` — banner/display presets
- `src/lib/landing-pages/brand-tokens.ts` — text sub-shape
- `src/lib/landing-pages/brand-tokens-v4-mappers.ts` — mapping uit typographyProfile
- alle 8 renderers — consumeer text.* tokens

**Verwacht effect**: secondary-tekst (datum / persona-naam / meta) krijgt expliciet zwakker contrast — typografisch hiërarchie versterkt zonder kleur-accent.

---

### C5 — Eyebrow / banner-pattern in BrandHero (MEDIUM impact, ~0.5 dag)

**Wat ontbreekt nu**: BrandHero heeft `headline + sub + ctaLabel + heroVisualUrl`. Geen "eyebrow" voor klein uppercase label boven de headline (civic / categorie-marker).

**Wat doen**:
- `SpikeBrandHeroProps` uitgebreid met optionele `eyebrow?: string`
- Renderer toont eyebrow met uppercase + tracking + label-typography boven headline wanneer present
- AI variant-generator krijgt veld in LandingPageVariantContent schema:
  ```
  hero.eyebrow?: string  // "WELKOM BIJ {brand}" / "{categorie}" / etc.
  ```
- Wanneer leeg: renderer skipt het (backward-compat)

**Files**:
- `src/lib/landing-pages/variant-schema.ts` — eyebrow toevoegen
- `src/features/campaigns/components/canvas/medium/puck-config.tsx` — BrandHero renderer
- `src/features/campaigns/components/canvas/medium/puck-templates/landing-page-from-structured.ts` — mapper

**Verwacht effect**: hero krijgt een sub-categorie / context-label dat brand-tone versterkt (LINFI "VLOERLUIK OP MAAT" / Branddock "BRAND OS").

---

### C6 — Section-structuur richtlijn in variant-generator (KLEIN impact, ~0.5 dag)

**Wat ontbreekt nu**: AI mag elke combinatie van secties retourneren. Sommige variants hebben 4 secties, andere 11. Inconsistente density per merk.

**Wat doen**:
- Per archetype een **default sectie-volgorde** definiëren:
  ```ts
  RULER: ['hero', 'features-3col', 'testimonials', 'cta-block']  // 4 secties, tight
  SAGE:  ['hero', 'problem-statement', 'features-4col', 'faq', 'stats', 'testimonials', 'cta-block']  // 7 secties, editorial
  JESTER: ['hero', 'features-4col', 'pricing', 'testimonials', 'faq', 'cta-block']  // 6 secties
  ```
- variant-generator system-prompt krijgt expliciete sectie-blueprint
- F-VAL judge nieuwe sub-criterium: anatomy-fit voor archetype

**Files**:
- `src/lib/landing-pages/render-constraints.ts` (dezelfde file als C3)
- `src/lib/landing-pages/variant-generator.ts` — section-blueprint prompt
- `src/lib/landing-pages/landing-page-quality.ts` — anatomy-fit dimensie

**Verwacht effect**: LINFI (RULER) krijgt consistent 4-secties tight LP; Branddock (SAGE) krijgt editorial 7-secties LP. Geen verrassingen tussen generations.

---

### C7 — Real-content samples uit scraped bodyText (KLEIN impact, ~0.5 dag)

**Wat ontbreekt nu**: bij Step 2 preview (vóór AI-generation) toont Puck placeholder-tekst ("Default headline"). Volstrekt off-brand — verwart de gebruiker.

**Wat doen**:
- Scraper bewaart `scraped.bodyText` (max 2000 chars per page) — al beschikbaar
- AI Phase 3 extract per content-type 3 "fixture-zinnen":
  ```
  fixtureSamples: {
    landing-page-headline: ["Vloerluiken die uw interieur verrijken", ...],
    feature-title: ["Millimeter-nauwkeurig", "100% waterdicht", ...],
    cta-label: ["Plan een afspraak", "Vraag een offerte aan", ...],
  }
  ```
- Persist als `BrandStyleguide.fixtureSamples Json?`
- Puck `defaultProps` voor LINFI workspace gebruikt deze samples i.p.v. lorem-ipsum
- Effect zichtbaar in Step 2 wanneer user puckData voor het eerst ziet

**Files**:
- `prisma/schema.prisma` — `fixtureSamples Json?`
- `src/lib/brandstyle/analysis-prompts.ts` — Phase 3 extra extractie
- `src/features/campaigns/components/canvas/medium/puck-config.tsx` — defaultProps uit ctx.brandStyleguide

**Verwacht effect**: lege LP bij workspace-init heeft al brand-specifieke placeholders i.p.v. "Get started for free".

---

## 3. Prioritering + ROI

| # | Verbetering | Effort | Impact | ROI-rank |
|---|---|---|---|---|
| **C1** | Vocabulary-rails | 1d | **Hoog** — élk copy-stuk consistenter | **1** |
| **C2** | Voice few-shot sample | 0.5d | **Hoog** — rhythm matcht direct | **2** |
| C3 | Hard render-constraints | 1d | Medium — voorkomt off-brand drift | 3 |
| C4 | Type-scale + text-tokens | 0.5d | Medium — typografische hiërarchie | 4 |
| C5 | Eyebrow pattern | 0.5d | Klein — extra UI-element | 5 |
| C6 | Section-structuur blueprint | 0.5d | Klein — consistency per workspace | 6 |
| C7 | Real-content fixture samples | 0.5d | Klein — Step 2 preview-quality | 7 |

**Aanbevolen volgorde**: C1 → C2 → C3 → C4 → C5 → C6 → C7. C1+C2 vormen samen het grootste copy-quality-blok (~1.5 dag voor de meeste merkbare upgrade). Daarna C3+C4 voor de visuele constraints + hiërarchie (~1.5 dag). Tot slot C5-C7 voor de details (~1.5 dag).

**Totaal C1-C7**: ~4.5 dagen full-focus.

---

## 4. Visual vs. copy impact per item

Belangrijk: niet alle 7 items raken de **visuele** kant van de pagina's. Sommige zijn pure copy-quality. Hieronder per item expliciet:

| # | Visual impact? | Wat verandert er visueel | Wat verandert er textueel |
|---|---|---|---|
| C1 | ❌ Nee | — | Copy-vocabulaire scherper |
| C2 | ❌ Nee | — | Rhythm/zinslengte beter |
| **C3** | ✅ **Ja** | Renderer faalt off-brand styling (geen gradient op RULER, geen shadow op MINIMAL) | Copy mag geen `!` of emoji bij premium archetypes |
| **C4** | ✅ **Ja** | Tekst-kleur per hiërarchie-niveau (heading donker / caption licht); banner-utility-class | — |
| **C5** | ✅ **Ja** | Nieuw UI-element boven hero-headline (uppercase + tracking) | Eén extra kort copy-veld per LP |
| **C6** | ✅ **Ja** | Sectie-volgorde + aantal per archetype consistent | — |
| C7 | ❌ Nee | — | Step 2 placeholder-tekst is brand-specifiek |

**Conclusie**: voor zichtbare design-verbetering aan webpagina's zijn **C3, C4, C5, C6** de relevante items. C1+C2+C7 maken copy beter (welk ook impact heeft op user-perceptie, maar niet op het VISUELE design).

## 5. Aanvullende pure-visuele items (uit DTS-doctriene)

Items die DTS expliciet heeft die Branddock LP-renderers nog niet doen, ALLEEN visueel:

### C8 — Max-width container-constraint (0.25 dag, visual)

DTS: alle content sits within `max-width: 1200px; margin: 0 auto`. Voorkomt full-width tekst-strecken op grote schermen.

**Wat doen**: voeg `tokens.layout.maxContentWidth: number` (default 1200) toe; alle sectie-renderers wrap inner content in `<div style={{ maxWidth: ..., margin: '0 auto' }}>`. Per archetype default: RULER/SAGE 1200, JESTER/EXPLORER 1400 (luchtiger).

**Backward-compat**: bestaande renderers hebben dit al voor SOMMIGE secties (FeatureGrid: maxWidth 1100). Andere (Testimonial, FAQ) niet. Additive — wanneer token afwezig → default 1200.

### C9 — Banner-style sticky elements (0.5 dag, visual)

DTS: sticky top-nav met dunne grijze onderrand + sticky-elevation-shadow (`0 1px 2px rgba(0,0,0,0.06)`). Branddock-renderer heeft geen top-nav component, maar dit pattern is bruikbaar voor:
- "Sticky CTA-bar" component voor lange LP's (variant van BrandCTA)
- Pagina-Footer met `position: sticky` op mobile

**Wat doen**: nieuwe Puck-component `StickyCtaBar` (variant van BrandCTA) — render onderaan viewport met subtle shadow. Tokens consumeren: button + brand-color + motion.

**Backward-compat**: nieuwe optionele component. Geen bestaande renderer gewijzigd.

### C10 — Photo-scrim pattern (0.25 dag, visual)

DTS: hero-image overlay is **alleen** een translucent brand-color scrim (`rgba(0,96,160,0.55)`). Geen fashion-gradient.

**Wat doen**: BrandHero `full-bleed-image` mode kiest scrim-stijl per archetype:
- RULER/SAGE: solid brand-color scrim `rgba(brand, 0.55)` — DTS-stijl
- JESTER/LOVER: gradient van transparant naar brand (huidige implementatie)
- EXPLORER: dark-gradient bottom-up (cinematic)

**Backward-compat**: huidige `bg-image: linear-gradient(...) , url(...)` aanpak blijft; alleen de gradient-formule wordt archetype-bewust. Bestaande LINFI screenshot ongewijzigd want RULER krijgt nu juist solid-scrim.

### C11 — Flat-card discipline enforcement (0.25 dag, visual)

DTS hard rule: "Cards do not float. They are flat rectangles with a 1px Light Gray border and a `border-radius: 4px` — never glossy or floating."

**Wat doen**: voor MINIMAL + EDITORIAL layoutStyle force `elevation.cardElevationCategory='border-only'` (override scraped data) tenzij user-set. Vermijdt dat een per-ongeluk-scraped `box-shadow: 0 8px 24px` op een premium-merk renderert.

**Backward-compat**: PLAYFUL/EXPERIENTIAL houden huidige shadow-keuze. LINFI heeft al border-only via scraped data — geen verandering.

## 6. Wat dit NIET is + backward-compat garanties

### Geen breaking changes
- **BrandTokens v4** schema blijft intact. Alle nieuwe velden (vocabulary, voiceSample, text-hiërarchie, eyebrow) zijn additive en optional.
- **Puck-config**: bestaande 8 component-renderers behouden hun props + render-output. Wijzigingen zijn ADDITIVE (nieuwe optionele eyebrow-prop, nieuwe text-token-consumption).
- **variant-schema**: nieuwe optionele velden (`hero.eyebrow`). Bestaande variants zonder eyebrow renderen ongewijzigd.
- **Database**: alle nieuwe velden Json/Boolean/String met default null of false. Migration via `prisma db push` (zoals Fase B/E patroon).

### Bestaande work-streams die ONAANGERAAKT blijven
- **Fase A-E brandstyle-extractors** (button/typography/spacing/elevation/motion/photography) — blijven werken; nieuwe items lezen alleen IETS extra
- **V2-1/V2-2 lazy classifiers** (archetype + layoutStyle) — blijven werken
- **WCAG-gate** (Sprint 2) — blijft enforced
- **Auto-iterate / F-VAL** scoring pipeline — blijft, krijgt alleen nieuwe sub-criteria optionally
- **Brick Builder selectoren** (recent toegevoegd) — blijven werken
- **Override-flags** (`buttonProfileOverride` etc.) — blijven werken; ook nieuwe `text.*` tokens krijgen override-flag
- **DTS comparison-plan V1-V5** (CSS-export, kit-ZIP, specimen-cards) — onafhankelijk traject, kunnen parallel

### Backward-compat checklist per change
| Item | Risico | Mitigatie |
|---|---|---|
| C3 render-constraints | Bestaande LP's met "off-brand" styling renderen anders | Constraints toepassen alleen wanneer override-flag false → user-set blijft |
| C4 text-tokens | Renderers gebruiken nieuwe text.heading/body/etc | Defaults gelijk aan huidige onSurface/surfaceMuted — visueel identiek bij default |
| C5 eyebrow | Bestaande variants zonder eyebrow | `eyebrow?: string` optional; renderer skipt wanneer absent |
| C6 sectie-blueprint | Bestaande variants met andere sectie-volgorde | Blueprint is **prompt-guidance** voor AI, niet een hard validator. Bestaande puckData ongewijzigd |
| C8 max-width | Bestaande renderers met andere maxWidth | Token-aware default = huidige hardcoded waarde wanneer geen token |
| C9 StickyCtaBar | n.v.t. — nieuwe component | Optioneel toe te voegen in Puck-editor; default LP's onaangeraakt |
| C10 photo-scrim | RULER LINFI hero rendert iets anders | Subjective verbetering; backup: token `tokens.hero.scrimStyle` met user-override |
| C11 flat-card enforcement | Bestaande PLAYFUL/EXPERIENTIAL met border-only override | Alleen MINIMAL/EDITORIAL geforceerd; override-flag respected |

## 7. Aanbevolen volgorde (geüpdatet voor visuele focus)

Voor **echt zichtbaar effect op de webpagina's** prioriteer ik nu de pure visual + meest impactvolle copy items eerst:

| # | Item | Visual? | Effort | Volgorde |
|---|---|---|---|---|
| C4 | Type-scale + text-tokens | ✅ | 0.5d | **1** (foundation) |
| C3 | Hard render-constraints | ✅ | 1d | **2** |
| C10 | Photo-scrim per archetype | ✅ | 0.25d | **3** |
| C11 | Flat-card enforcement | ✅ | 0.25d | **4** |
| C5 | Eyebrow pattern | ✅ | 0.5d | **5** |
| C8 | Max-width container | ✅ | 0.25d | **6** |
| C1 | Vocabulary-rails | ❌ | 1d | 7 (copy) |
| C2 | Voice few-shot | ❌ | 0.5d | 8 (copy) |
| C6 | Sectie-blueprint | ✅ | 0.5d | 9 |
| C7 | Real-content fixtures | ❌ | 0.5d | 10 (copy) |
| C9 | StickyCtaBar (nieuw) | ✅ | 0.5d | 11 (additief) |

**Visueel-eerst pad (~2.75 dagen)**: C4 → C3 → C10 → C11 → C5 → C8. Daarna de copy-items (C1, C2, C7) en C6/C9 voor cherry-on-top.

## 8. Open vragen voor review

1. **Akkoord met visueel-eerst volgorde** (C4→C3→C10→C11→C5→C8 = ~2.75 dagen), copy-items (C1+C2) als second wave?
2. **C3 hard-rules per archetype**: tabel in code-constants, of in CMS-table voor user-override?
3. **C5 eyebrow**: optioneel veld op variant-schema (mag leeg blijven), of forceer AI om altijd een eyebrow te genereren?
4. **C7 fixture-samples**: 3 samples per content-type genoeg, of 5-7 voor variatie?
5. **C9 StickyCtaBar**: bouwen als nieuwe Puck-component, of skippen tot user-request?
