# Brandstyle-analyzer → Landing-page doorvertaling: verbeterplan

> **Status**: voorstel — **niet 1-op-1 uitgevoerd**. Een parallelle LP-fidelity werkstroom (2026-05-26 → 2026-05-29) heeft overlappende scope geadresseerd via een andere structuur — zie sectie 10 "Implementatie-status 2026-05-29". Fasen A-E uit dit plan blijven open als gestructureerd verbeterpad mocht de LP-fidelity werkstroom ontoereikend blijken.
> **Aanleiding**: LINFI-screenshot 2026-05-27 wijkt sterk af van linfi.nl identiteit ondanks correct gescrapede colors + archetype. Diepere audit identificeerde structurele gaps in de scraper → renderer pijplijn.
> **Audit-bron**: zie sectie "Pipeline-audit" hieronder.

---

## 1. Probleem in één zin

De brandstyle-analyzer extraheert (deels) rijke brand-DNA data, maar de Puck-renderers consumeren slechts **kleur + font + layoutStyle-preset**. Alle nuance over button-styling, spacing-rhythm, corner/elevation/iconography-philosophy, motion en photography-strategy gaat verloren tussen DB en renderer — of wordt überhaupt nooit geëxtraheerd. Resultaat: elke RULER+MINIMAL workspace ziet er **structureel identiek** uit, niet linfi.nl-, Zwarthout- of Patek Philippe-specifiek.

## 2. Pipeline-audit (samenvatting)

| Laag | File | Wat gebeurt | Gap |
|---|---|---|---|
| 1. Raw scrape | `url-scraper.ts` | HTML/CSS extractie → ScrapedData (colors, fonts, css-variables, font-sizes, visualHeuristics) | Geen button-states (hover/active), geen animation/transition, geen font-weight distribution per element-rol, geen letter-spacing patterns |
| 2. AI extraction | `analysis-prompts.ts` + `analysis-engine.ts` | 3 Claude-fases: Visual Identity / Voice+Imagery / Design Language | **Phase 3 Design Language is "non-critical fallback"** — wordt naar DB geschreven maar **nergens geconsumeerd in rendering** |
| 3. DB schema | `prisma/schema.prisma` BrandStyleguide | Velden voor `layoutPrinciples`, `iconographyStyle`, `graphicElements`, `gradientsEffects`, `cornerRadii`, `shadowSystem`, `spacingScale` | Wordt geschreven maar door extractor genegeerd |
| 4. BrandTokens | `brand-tokens.ts` `extractBrandTokensFromStyleguide` | Maps colors + fonts + layoutStyle → role-tokens + designSystem | Genegeerd: `layoutPrinciples`, `iconographyStyle`, `cornerRadii`, `shadowSystem`, `spacingScale`. Geen button/elevation/iconography tokens |
| 5. Renderer | `puck-config.tsx` | 8 components consumeren tokens + designSystem | Button-styling uit `computeBrandRenderHints` (archetype-based hardcoded), niet uit data. Card-shadow hardcoded. IconBlock stroke=1.75 hardcoded. Section-padding via `ds.spacing[5]` (preset-index, niet brand-specific) |

**Kern-bottleneck**: 100% van wat de renderer "weet" over de brand zit in 5 velden: `primaryHex`, `headingFont`, `bodyFont`, `layoutStyle`, `archetype`. Alles daaronder is gegeneraliseerd per archetype/layoutStyle, niet per merk.

## 3. Doel-state

Een nieuwe scrape voor `linfi.nl` moet leiden tot een landing-page die er **specifiek linfi.nl uitziet**:
- Buttons zijn niet "RULER-uppercase-0.1em letterSpacing" (archetype-default) maar **wat linfi.nl daadwerkelijk gebruikt**: bv. dark-fill solid corners, title-case "Plan een afspraak", subtle hover-fade
- Card-elevation matcht linfi.nl's daadwerkelijke shadow-philosophy (mogelijk: geen schaduw, alleen 1px border)
- Section-padding-rhythme volgt linfi.nl's gescrapede spacing-scale, niet een MINIMAL-preset
- Iconography stroke-weight + size matchen wat linfi.nl gebruikt (mogelijk: dunne lijnen, kleine icons, geen iconen)
- Hero-foto's worden gegenereerd in linfi.nl's photography-DNA (architectural, neutral lighting, generous whitespace in compositie)

## 4. Verbeterplan: 4 fasen

### Fase A — Data-extractie versterken (~3 dagen)

**A1. Scraper: button-state extractie** (`url-scraper.ts`)
- Detecteer CSS-selectors `.btn`, `button`, `a.button`, `[role="button"]`, `.cta`, framework-classes (.wp-block-button, .elementor-button, .acss-btn)
- Per match: extract padding, font-weight, font-size, text-transform, letter-spacing, border-radius, background, color, transition
- Detecteer hover-state via `:hover` selectors → hover-bg, hover-color, hover-transform
- Output naar nieuwe `ScrapedData.buttonStyles[]`

**A2. Scraper: typography-rol distributie** (`url-scraper.ts`)
- Per CSS-selector rule, classify als: `display` (h1, .hero-title), `heading` (h2, h3), `subheading` (h4, .lead), `body` (p, body), `label` (.caption, .meta, label), `button` (button, .btn)
- Per rol: bewaar font-family, font-size, font-weight, line-height, letter-spacing, text-transform
- Output naar `ScrapedData.typographyByRole`

**A3. Scraper: spacing + elevation profile** (`url-scraper.ts` — uitbreiden `visualHeuristics`)
- Extract unique padding/margin values per element-type (sections, cards, buttons, inputs)
- Extract unique border-radius values per element-type
- Extract box-shadow declarations → categorize: `none` / `subtle` (≤4px blur, ≤0.1 opacity) / `medium` (5-15px) / `strong` (>15px)
- Output naar `ScrapedData.elevationProfile`, `ScrapedData.spacingProfile`

**A4. Scraper: motion signature** (`url-scraper.ts`)
- Detecteer `transition: ...` declarations
- Categorize: instant (≤100ms), quick (100-200ms), comfortable (200-400ms), slow (>400ms)
- Detecteer easing-functions
- Output naar `ScrapedData.motionProfile`

### Fase B — DB-schema uitbreiden (~1 dag)

**B1. Nieuwe Json-velden op `BrandStyleguide`**:
- `buttonProfile: Json?` — primary/secondary/ghost button-styling samples
- `spacingProfile: Json?` — section-padding, card-padding, gap-rhythm per layout-context
- `elevationProfile: Json?` — shadow-style classification + raw box-shadow strings
- `iconographyProfile: Json?` — stroke-weight, sizing, color-policy
- `motionProfile: Json?` — transition signatures
- `typographyByRole: Json?` — font-family/size/weight/line-height per rol
- `photographyProfile: Json?` — composition/lighting/subject-matter (deze bestaat nu in BrandVoiceguide.photographyStyle; dupliceren of cross-reference)

**B2. Migratie-strategie**:
- Velden zijn `Json?` (nullable) → bestaande data niet kapot
- Bestaande workspaces krijgen `null` waardes → renderers vallen terug op archetype-default
- Bij nieuwe scrape → automatisch ingevuld

**B3. Migration**:
- Eén Prisma migration: `add-brandstyle-rendering-profiles`
- `prisma db push --accept-data-loss` voor dev; productie via `prisma migrate dev`

### Fase C — BrandTokens v4 (~2 dagen)

**C1. Nieuwe token-velden** (`brand-tokens.ts`)

```ts
export interface BrandTokens {
  // ... bestaande velden ...

  // v4 — Component-specific styling profiles
  button: {
    paddingY: number;
    paddingX: number;
    radiusPx: number;
    fontWeight: number;
    fontSize: number;
    textTransform: "none" | "uppercase";
    letterSpacing: string;
    transition: string;
    /** Hover-strategy: "darken" / "lighten" / "scale" / "underline" / "none" */
    hoverStyle: "darken" | "lighten" | "scale" | "underline" | "none";
  };

  // v4 — Elevation system uit elevationProfile + cornerRadii
  elevation: {
    cardShadow: string | "none";
    cardBorderRadius: number;
    cardBorderWidth: number;
    /** Pakt fallback uit designSystem als geen brand-data. */
    cardElevationCategory: "flat" | "subtle-shadow" | "strong-shadow" | "border-only";
  };

  // v4 — Iconography
  iconography: {
    strokeWeight: number;  // default 1.75, premium luxury = 1, playful = 2
    sizeDefault: number;   // default 24, hero feature = 32
    style: "outline" | "filled" | "duotone";
  };

  // v4 — Section spacing rhythm
  sectionRhythm: {
    paddingY: number;          // hero/sectie verticale padding
    cardPaddingY: number;
    cardPaddingX: number;
    contentGap: number;        // gap tussen secties
    /** Alternation: true = alternerende bg per section, false = uniform */
    alternateBg: boolean;
  };

  // v4 — Motion
  motion: {
    transitionDuration: string;  // "200ms"
    easing: string;
  };

  // v4 — Photography
  photography: {
    mood: string;              // uit photographyStyle.mood
    compositionStyle: string;  // uit photographyStyle.composition
    subjectMatter: string;     // uit photographyStyle.subjects
    /** Voor hero-visual prompt. */
    promptFragment: string;
  };
}
```

**C2. Extractor uitbreiden** (`extractBrandTokensFromStyleguide`)
- Map BrandStyleguide.buttonProfile → BrandTokens.button
- Map BrandStyleguide.elevationProfile + cornerRadii → BrandTokens.elevation
- Map BrandStyleguide.iconographyProfile → BrandTokens.iconography
- Map BrandStyleguide.spacingProfile + layoutPrinciples.spacingScale → BrandTokens.sectionRhythm
- Map BrandStyleguide.motionProfile → BrandTokens.motion
- Map BrandStyleguide.photographyProfile → BrandTokens.photography

**C3. Per-rol fallback chain**:
- Tier 1: scraped value (`buttonProfile != null`)
- Tier 2: archetype + layoutStyle preset (huidige `computeBrandRenderHints`)
- Tier 3: hard default

Dit zorgt dat bestaande workspaces zonder rich data **niet kapot gaan** — ze gebruiken de huidige preset.

### Fase D — Renderer data-driven (~3 dagen)

**D1. BrandCTA renderer** (`puck-config.tsx` regel 333-415)
- Vervang `hints.buttonStyle` door `tokens.button.{...}`
- Hover-state via inline `onMouseEnter`/`onMouseLeave` of CSS-class met tokens.button.hoverStyle
- Transition uit tokens.motion

**D2. FeatureGrid renderer** (regel 421-535)
- Card-styling uit tokens.elevation in plaats van hardcoded `0 2px 8px rgba(0,0,0,0.06)`
- Card-padding uit tokens.sectionRhythm.cardPaddingY/X
- Icon-stroke uit tokens.iconography.strokeWeight
- Icon-size uit tokens.iconography.sizeDefault

**D3. Testimonial / PricingTable / FAQ / Footer**
- Sectie-padding uit tokens.sectionRhythm.paddingY
- Background-alternation uit tokens.sectionRhythm.alternateBg
- Typography per rol uit tokens.designSystem (al goed) + brand-overrides per rol

**D4. BrandHero**
- Behoud full-bleed-image logica
- Overlay-gradient sterkte uit photographyProfile (luxury = subtle 0.2-0.3, commercial = strong 0.5-0.7)
- Hero-CTA button-styling uit tokens.button

**D5. Hero-visual prompt** (`LandingPageGenerateBlock.tsx` `buildHeroVisualInstruction`)
- Photography-DNA uit tokens.photography.promptFragment toevoegen aan FLUX/Imagen-prompt
- Compositie-hints expliciet ("symmetrical interior shot from slightly elevated angle" voor LINFI)
- Brand-imagery donts als negative-prompt

### Fase E — AI-prompts upgraden (~1 dag)

**E1. Visual Identity prompt uitbreiden** (`analysis-prompts.ts buildVisualIdentityPrompt`)
- Vraag expliciet naar button-styling (shape/fill/transformation) — niet alleen kleur
- Vraag naar typography-rol mapping (welke font voor display vs body vs button)

**E2. Design Language prompt promoveren van "non-critical" naar primary**
- Phase 3 wordt verplicht (i.p.v. fallback)
- Output uitbreiden met: capitalization-philosophy (title-case / sentence-case / uppercase voor wat?), motion-philosophy, photography-prompt-fragment

**E3. Nieuwe Phase 4: Design Philosophy** (optioneel, nice-to-have)
- "Beschrijf in 1 zin wat dit merk visueel anders maakt — wat je MOET behouden bij rendering"
- Output: `designPhilosophy: string` op BrandStyleguide
- Wordt als brand-context aan AI gegeven bij content-generation (niet rendering)

---

## 5. Prioritering + ROI

| Fase | Effort | Impact op LP-quality | Voorgestelde volgorde |
|---|---|---|---|
| A1 button-state | 1d | **Hoog** — buttons zijn meest zichtbare UI-element | **#1** |
| A2 typography-rol | 1d | **Hoog** — font-weight per rol nu generic | **#2** |
| A3 spacing+elevation | 0.5d | Medium | #4 |
| A4 motion | 0.5d | Laag-medium (subtle effect) | #6 |
| B1-B3 schema | 1d | Foundation voor alles | **#3** (na A1-A2) |
| C1-C3 tokens v4 | 2d | Foundation voor renderers | #5 |
| D1 BrandCTA | 0.5d | Hoog | #7 |
| D2 FeatureGrid | 0.5d | Hoog | #8 |
| D3 overige renderers | 1d | Medium | #9 |
| D5 hero-visual prompt | 0.5d | **Zeer hoog** — directe foto-quality impact | **#10** of vroeger |
| E1-E2 prompts | 1d | Medium (alleen voor toekomstige scrapes) | #11 |
| E3 designPhilosophy | 0.5d | Nice-to-have | #12 |

**Totaal effort**: ~10-11 dagen full-focus

## 6. Quick-win pad (~3 dagen)

Als 11 dagen te veel is, doe minimaal:
1. **A1 button-state + A2 typography-rol** (2d) — meeste visuele winst
2. **B1 schema-uitbreiding** alleen voor buttonProfile + typographyByRole (0.5d)
3. **C1-C3** alleen voor `tokens.button` + brand-typografie-overrides (1d)
4. **D1 BrandCTA + D5 hero-visual prompt** (0.5d)

→ LP gaat van "generieke RULER+MINIMAL" naar "linfi.nl-button + linfi.nl-fotografie-style".

## 7. Risico's + mitigatie

| Risico | Mitigatie |
|---|---|
| Scraper breekt op exotische CSS-frameworks | Tier-3 fallback altijd intact; nieuwe extractie is additive |
| AI-prompt-cost stijgt (Phase 3 verplicht) | Cache per-workspace; 1× per scrape, niet per content-generatie |
| Schema-bloat (veel `Json?` velden) | Acceptabel — tokens worden in geheugen geserialiseerd; geen indexed-query |
| Bestaande puckData breekt door token-shape-change | Backward-compat: nieuwe velden optional; oude renderers werken zonder ze |
| LINFI handmatige overrides verloren | layoutStyleInferred flag al toegevoegd in `5a38e394`; uitbreiden naar `buttonStyleInferred`, etc. wanneer relevant |

## 8. Smoke-coverage

Per fase een phase25+ smoke:
- phase25: scraper button-state extractie op fixture-CSS
- phase26: typography-rol classifier op CSS samples
- phase27: BrandTokens v4 mapping van rich-styleguide fixtures
- phase28: BrandCTA + FeatureGrid render-output bij verschillende buttonProfile-shapes
- phase29: hero-visual prompt-fragment bevat photography-DNA-keywords

## 9. Open vragen voor review

1. Akkoord met de fasering A → B → C → D → E, of liever quick-win-pad eerst (sectie 6)?
2. Phase 3 Design Language verplicht maken — accepteer extra Anthropic-cost per scrape?
3. Photography-DNA dupliceren in BrandStyleguide of cross-reference naar BrandVoiceguide?
4. Section-alternation: per layoutStyle-preset (huidige) of per-brand uit alternateBg-scrape?
5. Backward-compat policy: bestaande workspaces forceren naar v4 tokens of laten op v3?

---

## 10. Implementatie-status 2026-05-29 — parallel LP-fidelity werkstroom

In plaats van dit plan 1-op-1 uit te voeren, is een parallelle **LP-fidelity werkstroom** gelandet in branch `branddock-feat-web-page-builder-canvas` (2026-05-26 → 2026-05-29). Die gebruikt een eigen Fase A-E labelling die NIET overeenkomt met de Fase A-E in dit plan, maar de scope overlapt deels.

### LP-fidelity werkstroom commits (overlap met dit plan)

| LP-fidelity Fase | Commit | Overlap met dit plan |
|---|---|---|
| **Fase A — color usage capture** | `24105e16` | Raakt scope sectie 4 (photography), niet A1-A4 hierboven |
| **Fase B — hero-typography fingerprint** | `b36ca91c` | Partial overlap A2 (typography-rol distributie) — hero-only |
| **Fase C — hero-pattern detection via vision-AI** | `08bc6966` | Geen overlap met dit plan; nieuwe scope |
| **Fase D — LP fidelity judge + hero-screenshot** | `744ae61f`, `057e4bf7` | Geen overlap; meta-validatie ipv data-extractie |
| **Fase E — user-override surface kleur-tags** | `3ff4122f` | Partial overlap met "user-override flags" patroon uit risico-sectie |

### Aanverwante commits uit andere werkstromen (raakt scope dit plan)

| Commit | Plan-item |
|---|---|
| `efb14497 fix(brandstyle): universele button-scraper — CSS-var resolution + DOM-presence filter` | **A1 button-state extractie** — gedeeltelijk |
| `df831143 feat(brandstyle): Bricks Builder + Divi + Elementor selectors in component-extractors` | **A1 framework-classes** — gedeeltelijk |
| `085e8290 fix(brandstyle): component-extractor accuratesse` | A1 general |
| `98fbefb2 fix(brandstyle): scanner-classifier — primary-saturation guard + pastel→SEMANTIC` | A4 general |
| `53409620 refactor(brandstyle): consolideer alle font-UI naar Typography-tab` | UI-refactor, geen plan-item |
| LP design-batches 1-8 (`6c9cbe6b`, `caba84a4`, etc.) | Indirect Fase D renderer-improvements (geen tokens v4 schema) |

### Niet uitgevoerd uit dit plan

- **Fase A2** typography-rol distributie als volwaardige extractor (alleen hero h1 in LP-fidelity Fase B)
- **Fase A3** spacing + elevation profile
- **Fase A4** motion signature
- **Fase B** schema-uitbreiding met `buttonProfile`/`spacingProfile`/`elevationProfile`/`iconographyProfile`/`motionProfile`/`typographyByRole` als losse Json-velden
- **Fase C** BrandTokens v4 met `button`/`elevation`/`iconography`/`sectionRhythm`/`motion`/`photography` sub-shapes
- **Fase D1-D5** systematische renderer-rewrite voor data-driven token-consumption (alleen ad-hoc design-batches gedaan)
- **Fase E** AI-prompts upgraden (Phase 3 Design Language is nog steeds "non-critical fallback")

### Conclusie 2026-05-29

Dit plan blijft een **gestructureerd verbeterpad** voor het geval LP-fidelity werkstroom onvoldoende werkt op de praktijk-cases (LINFI / Zwarthout / Patek). Niet alle items uitvoeren als de LP-output al brand-specifiek genoeg is na de werkstroom-landing — re-evaluate na pilot-feedback.
