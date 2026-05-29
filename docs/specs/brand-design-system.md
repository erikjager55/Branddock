# Brand Design System — Pad C foundation

> Spec voor het nieuwe render-paradigma van Branddock's Puck-componenten.
> **Aanleiding**: Figma Make Zwarthout-output (2026-05-26) liet zien dat ons huidige
> brand-tokens-model (4 kleuren + 2 fonts) kwalitatief tekortschiet. Premium
> design vereist een vol design-system: spacing-scale, typografie-hiërarchie,
> radius-discipline, sectie-alternatie, image-strategie.
>
> **Doel**: kwalitatief op het niveau van Figma Make + Zwarthout/Linear/Dinesen,
> terwijl Puck-editing (drag-drop, AI-edit, auto-iterate, lock-toggle) volledig
> behouden blijft + volledige integratie met Branddock (brand-context, images,
> tone-of-voice, F-VAL).

---

## §1 Referentie-niveau

Zwarthout (Figma Make 2026-05-26) toont het kwaliteitsniveau dat we willen
matchen. Karakteristieken:

| Aspect | Zwarthout-niveau |
|---|---|
| **Navigatie** | Sticky 2-laags (utility-bar + main-nav) met 4 nav-items + 2 CTA-types |
| **Hero** | Full-bleed donkere architectuur-foto + overlay-gradient + tekst bottom-left + serif display 72px |
| **Sectie-alternatie** | Donker → warm-wit → wit → donker — visueel ritme door hele pagina |
| **Typografie** | Display-serif (Cormorant Garamond 300/400) + body-sans (DM Sans 300/400/500) — geen 600/700 |
| **Spacing-scale** | 4/8/12/16/24/32/48/64/96/128px (vast — geen tussenwaarden) |
| **Radius-regel** | 0 overal — geen rounded corners voor CTAs, cards, badges |
| **Color-palette** | 9 vaste kleuren met semantische rollen (charcoal/soft-black/dark-gray/mid-gray/light-gray/pale-gray/warm-white/white/wood-accent) |
| **Image-treatment** | Donkere placeholders met centered labels `[Architectuurfoto]` ipv blanke vlakken |
| **Letter-spacing** | 0.06-0.16em op uppercase labels — editorial-niveau micro-typografie |
| **CTA-disciplien** | Max 2 primary CTAs above-fold, exact dezelfde stijl per type |

Het belangrijkste inzicht: dit is **niet ad-hoc design**, het is een
strict-geconfigureerd design-system met expliciete regels. Branddock moet
die regels modelleren per brand + layoutStyle.

---

## §2 Design-system primitives

### 2.1 Spacing scale

Vast array van toegestane waardes. Componenten kiezen ALLEEN uit deze scale
voor padding/margin/gap.

```typescript
type SpacingScale = readonly number[];  // px values

const SPACING_PRESETS: Record<LayoutStyle, SpacingScale> = {
  MINIMAL:      [4, 8, 16, 24, 48, 64, 96, 128, 160] as const,
  EDITORIAL:    [4, 8, 12, 16, 24, 32, 48, 64, 96, 128] as const,
  COMMERCIAL:   [4, 8, 12, 16, 20, 24, 32, 48, 64] as const,
  EXPERIENTIAL: [8, 16, 24, 32, 48, 64, 96, 128, 192] as const,
  PLAYFUL:      [4, 8, 12, 16, 24, 32, 48, 64, 96] as const,
};
```

Component-level: bv. `sectionVerticalPadding = layoutStyle === 'MINIMAL' ? 128 : 64`.

### 2.2 Typography scale

Per layoutStyle 3 type-classes: **display** (hero headlines), **heading**
(section-titles), **body** (paragraphs + meta).

```typescript
interface TypographyClass {
  fontFamily: string;          // CSS font-family fallback chain
  weights: readonly number[];  // toegestane font-weights
  sizes: readonly number[];    // px - toegestane sizes
  lineHeight: number;          // unitless
  letterSpacing: string;       // em
  textTransform?: 'uppercase' | 'none';
}

interface TypographyScale {
  display: TypographyClass;    // hero h1
  heading: TypographyClass;    // section titles h2/h3
  body: TypographyClass;       // p, li, blockquote
  label: TypographyClass;      // section overlines, meta, badges
}
```

**MINIMAL example** (Zwarthout-style):
```
display:  Cormorant Garamond, weights [300, 400], sizes [48, 64, 72, 96], lineHeight 1.05, letterSpacing -0.01em
heading:  Cormorant Garamond, [300, 400],         [24, 32, 48],          1.15, normal
body:     DM Sans,            [300, 400],         [13, 14, 16],          1.8, normal
label:    DM Sans,            [400, 500],         [11, 12],              1.2, 0.12em, uppercase
```

**COMMERCIAL example** (current Branddock):
```
display:  system-ui,          [600, 700],         [32, 42, 52],          1.1, normal
heading:  system-ui,          [600],              [20, 24, 28],          1.2, normal
body:     system-ui,          [400, 500],         [14, 15, 16],          1.5, normal
label:    system-ui,          [500, 600],         [11, 12],              1.2, 0.05em, uppercase
```

### 2.3 Radius rule

```typescript
interface RadiusRule {
  /** Default radius voor alle UI-elementen tenzij overrule. */
  default: number;
  /** Buttons + CTAs. */
  button: number;
  /** Cards + tiles. */
  card: number;
  /** Pills + badges. */
  pill: number;
  /** Input fields. */
  input: number;
}

const RADIUS_PRESETS: Record<LayoutStyle, RadiusRule> = {
  MINIMAL:      { default: 0, button: 0, card: 0, pill: 0, input: 0 },
  EDITORIAL:    { default: 0, button: 0, card: 0, pill: 999, input: 0 },
  COMMERCIAL:   { default: 8, button: 8, card: 12, pill: 999, input: 8 },
  EXPERIENTIAL: { default: 4, button: 4, card: 4, pill: 999, input: 4 },
  PLAYFUL:      { default: 12, button: 999, card: 16, pill: 999, input: 12 },
};
```

### 2.4 Section-alternation rule

Pages bestaan uit secties. Alternatie tussen surface-types geeft visueel ritme.

```typescript
type SectionBackground = 'surface' | 'surfaceMuted' | 'surfaceInverted' | 'brand';

interface SectionAlternation {
  /** Patroon dat gehanteerd wordt per sectie-index. */
  pattern: SectionBackground[];
}

const ALTERNATION_PRESETS: Record<LayoutStyle, SectionAlternation> = {
  MINIMAL:      { pattern: ['surfaceInverted', 'surfaceMuted', 'surface', 'surfaceInverted', 'surface', 'surfaceMuted', 'surface', 'surfaceInverted'] },
  EDITORIAL:    { pattern: ['surface', 'surface', 'surfaceMuted', 'surface', 'surface', 'surfaceMuted'] },
  COMMERCIAL:   { pattern: ['brand', 'surface', 'surface', 'surface', 'surface', 'surface', 'surface', 'surface'] },
  EXPERIENTIAL: { pattern: ['surfaceInverted', 'surface', 'surfaceInverted', 'surface', 'surfaceInverted', 'surface'] },
  PLAYFUL:      { pattern: ['brand', 'surface', 'brandSubtle', 'surface', 'surfaceMuted', 'surface'] },
};
```

`surfaceInverted` = donkere variant (gebruikt onSurface-color als bg + surface-color als text).

### 2.5 Image strategy

```typescript
interface ImageStrategy {
  /** Placeholder treatment wanneer image nog niet gegenereerd is. */
  placeholderStyle: 'dark-framed' | 'subtle-gray' | 'illustration' | 'gradient';
  placeholderLabel: string;  // bv. "[Architectuurfoto]"
  /** Hero-visual prompt-hint per stijl. */
  heroPhotographyStyle: string;
  /** Hoe testimonial-fotos getoond worden. */
  testimonialPhotoStyle: 'circle' | 'square' | 'rounded-square' | 'none';
  /** Persona-photo integration. */
  usePersonaPhotos: boolean;
}

const IMAGE_STRATEGY_PRESETS: Record<LayoutStyle, ImageStrategy> = {
  MINIMAL: {
    placeholderStyle: 'dark-framed',
    placeholderLabel: '[Architectuurfoto]',
    heroPhotographyStyle: 'dramatic, architectural, dark, editorial photography with strong shadows',
    testimonialPhotoStyle: 'none',
    usePersonaPhotos: false,
  },
  EDITORIAL: {
    placeholderStyle: 'subtle-gray',
    placeholderLabel: '[Editorial photo]',
    heroPhotographyStyle: 'magazine-style editorial photography, soft lighting, sophisticated',
    testimonialPhotoStyle: 'square',
    usePersonaPhotos: true,
  },
  COMMERCIAL: {
    placeholderStyle: 'subtle-gray',
    placeholderLabel: '[Product image]',
    heroPhotographyStyle: 'bright, clean product photography on white background',
    testimonialPhotoStyle: 'circle',
    usePersonaPhotos: true,
  },
  EXPERIENTIAL: {
    placeholderStyle: 'gradient',
    placeholderLabel: '[Hero image]',
    heroPhotographyStyle: 'cinematic, immersive scene with depth, story-driven',
    testimonialPhotoStyle: 'rounded-square',
    usePersonaPhotos: true,
  },
  PLAYFUL: {
    placeholderStyle: 'illustration',
    placeholderLabel: '[Illustration]',
    heroPhotographyStyle: 'colorful illustration or playful product shot, friendly tone',
    testimonialPhotoStyle: 'circle',
    usePersonaPhotos: true,
  },
};
```

---

## §3 LayoutStyle taxonomie

Vijf archetypes die de design-system primitives orkestreren. Eén layoutStyle
per BrandStyleguide. Scraper detecteert (Sprint B); user overruled in
brand-onboarding (Sub-Sprint D).

### MINIMAL (Stripe, Linear, Dinesen, LINFI, Zwarthout)
Veel witruimte, weinig elementen, sterke typografie-hiërarchie. Premium uitstraling.
Spec: spacing 4-160, typografie serif-display, radius 0, alternatie sterk.

### EDITORIAL (Apple product, Tesla, Apple newsroom)
Magazine-look, mixed-media, lange copy. Verfijnd maar inhoudelijker.
Spec: spacing 4-128, typografie sophisticated mix, radius 0 (pill voor badges).

### COMMERCIAL (Coolblue, Bol.com, HubSpot, Branddock-default)
Dichte info-grid, conversion-focused, multi-CTA. Toegankelijk B2C/B2B-SaaS look.
Spec: spacing tight 4-64, typografie system-ui clear, radius 8-12 voor warmte.

### EXPERIENTIAL (Patagonia, Tony's Chocolonely, Nike campaigns)
Story-driven, scroll-momentum, immersive. Mission-led.
Spec: spacing dramatic 8-192, typografie groot + impactvol, radius minimaal.

### PLAYFUL (Notion marketing, Linear marketing, MailerLite)
Kleurrijk, illustration-heavy, casual + friendly. Approachable productiviteit.
Spec: spacing comfortable 4-96, typografie sans rounded, radius rond (8-999).

---

## §4 Per-component rendering rules

Voor elke Puck-component definieer per layoutStyle hoe het rendert. 8
componenten × 5 layoutStyles = 40 variant-functies. Voorbeeld voor `BrandHero`:

### BrandHero MINIMAL

```typescript
// Zwarthout-pattern
function renderBrandHero_MINIMAL(props, ctx) {
  return (
    <section style={{
      height: '100vh',
      background: ctx.heroImageUrl
        ? `linear-gradient(rgba(${onSurfaceRGB},0.85) 0%, rgba(${onSurfaceRGB},0.2) 100%), url(${ctx.heroImageUrl}) center/cover`
        : ctx.tokens.onSurface,
      color: ctx.tokens.surface,
      padding: `${spacing[96]}px ${spacing[48]}px`,
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'flex-end',
      alignItems: 'flex-start',
    }}>
      {/* Eyebrow */}
      <span style={{
        fontFamily: typography.label.fontFamily,
        fontSize: typography.label.sizes[0],
        fontWeight: typography.label.weights[1],
        letterSpacing: typography.label.letterSpacing,
        textTransform: 'uppercase',
        color: 'rgba(255,255,255,0.5)',
        marginBottom: spacing[16],
      }}>
        {ctx.brand.brandName} — {ctx.brand.tagline}
      </span>
      {/* Display headline */}
      <h1 style={{
        fontFamily: typography.display.fontFamily,
        fontSize: typography.display.sizes[3],  // 72px
        fontWeight: typography.display.weights[0],  // 300
        lineHeight: typography.display.lineHeight,  // 1.05
        margin: `0 0 ${spacing[16]}px`,
        maxWidth: 720,
      }}>
        {props.headline}
      </h1>
      {/* Subhead */}
      <p style={{
        fontFamily: typography.body.fontFamily,
        fontSize: typography.body.sizes[2],
        fontWeight: typography.body.weights[0],
        lineHeight: typography.body.lineHeight,
        color: 'rgba(255,255,255,0.65)',
        maxWidth: 520,
        marginBottom: spacing[32],
      }}>
        {props.sub}
      </p>
      {/* CTA buttons - 0 radius MINIMAL */}
      <div style={{ display: 'flex', gap: spacing[12] }}>
        <a style={ctaPrimary(ctx, 'MINIMAL')}>{props.primaryCta}</a>
        {props.secondaryCta && (
          <a style={ctaGhost(ctx, 'MINIMAL')}>{props.secondaryCta}</a>
        )}
      </div>
    </section>
  );
}
```

### BrandHero COMMERCIAL (huidige Branddock-look)
Solid-color brand-bg, centered text, full padding-block, rounded button.

### BrandHero EXPERIENTIAL
Bigger headline (96px+), more dramatic overlay, optional scroll-indicator,
parallax-ready.

Vergelijkbaar uitgewerkt per component-type (FeatureGrid, Testimonial,
PricingTable, FAQ, Footer, BrandCTA, RichText) en per layoutStyle.

**Centraal in alle rendering**: nooit hardcoded waarde voor color/spacing/font.
Alles via `ctx.tokens` of `ctx.designSystem`.

---

## §5 Integratie met Branddock

### 5.1 BrandStyleguide schema-uitbreiding

```prisma
model BrandStyleguide {
  // ... bestaande velden ...
  layoutStyle LayoutStyle @default(COMMERCIAL)

  // Optional per-workspace overrides (default = LayoutStyle preset)
  spacingScaleOverride    Json?  // SpacingScale shape
  typographyScaleOverride Json?  // TypographyScale shape
  radiusRuleOverride      Json?  // RadiusRule shape
  imageStrategyOverride   Json?  // ImageStrategy shape
}

enum LayoutStyle {
  MINIMAL
  EDITORIAL
  COMMERCIAL
  EXPERIENTIAL
  PLAYFUL
}
```

### 5.2 BrandTokens v3

```typescript
interface BrandTokens {
  // v2 fields (alle legacy + role-tokens) blijven bestaan
  // ...

  // v3 — Design-system primitives
  layoutStyle: LayoutStyle;
  designSystem: {
    spacing: SpacingScale;
    typography: TypographyScale;
    radius: RadiusRule;
    imageStrategy: ImageStrategy;
    sectionAlternation: SectionAlternation;
  };
}
```

Extractor v3:
1. Lees `BrandStyleguide.layoutStyle` (default COMMERCIAL als afwezig)
2. Resolve design-system preset uit `getDesignSystemForLayoutStyle(layoutStyle)`
3. Override met `*Override` velden waar aanwezig
4. Return enriched BrandTokens

### 5.3 Image-flow integratie

Hero-visual generation prompt-builder krijgt `imageStrategy.heroPhotographyStyle`
geïnjecteerd:

```typescript
const instruction = `${imageStrategy.heroPhotographyStyle}.
Subject: ${variant.hero.headline}.
Style: ${brand.brandImageryStyle ?? 'photography matching brand personality'}.
Tone: ${brand.brandPersonality ?? 'on-brand'}.`;
```

Bestaande `generateCanvasVisual` API wordt hergebruikt; alleen `instruction`
wordt rijker.

### 5.4 Brand-voice-1-pager geïntegreerd

`brandVoiceguide` (full) + `voiceBaseline1Pager` worden geïnjecteerd in:
- Content-generation prompt (al gedeeltelijk)
- AI-edit context-menu instructions (Sub-Sprint E)
- Auto-iterate refinement-prompts
- F-VAL tone-fit dimensie

### 5.5 F-VAL judge dimensie 8 — Visual brand-fit (Sub-Sprint E)

Bovenop dimensie 7 (WCAG): score op visuele brand-fit met rendered output.
Optioneel met vision-judge (screenshot input).

---

## §6 Migratiestrategie

### 6.1 Bestaande deliverables

Alle bestaande puck-data-trees blijven werken. layoutStyle defaultt naar
COMMERCIAL (huidige look). Render-functions detecteren afwezigheid van v3-
primitives en vallen terug op v2 (current) render.

### 6.2 Nieuwe deliverables

Per workspace: scraper-detected layoutStyle in onboarding (Sub-Sprint B/D).
Voor LINFI handmatig op MINIMAL gezet (Zwarthout-style).

### 6.3 Backward-compat detectie

```typescript
function shouldUseV3Render(tokens: BrandTokens): boolean {
  return tokens.designSystem !== undefined;
}
```

Als false → v2 render-functions (huidige); als true → v3 design-system
render. Geen breaking changes voor bestaande deliverables.

---

## §7 Sub-sprint breakdown

| Sub-Sprint | Deliverable | Scope | Wat het oplevert |
|---|---|---|---|
| A | Foundation | Spec + schema + extractor + BrandTokens v3 + design-system module | LayoutStyle + design-system primitives door hele stack beschikbaar |
| B | Section-template library | 40 variants (5 LayoutStyle × 8 components) | Per-component render-functions die design-system consumeren |
| C | Image-system | Hero-visual brand-aware prompt + lucide-icon dynamic-render + testimonial-photos | Beelden integreren met design-system |
| D | Editing preservation | Puck drag-drop + AI-edit + auto-iterate verifieerd | Bestaande edit-paradigma blijft volledig werkend |
| E | Tone + content depth | Micro-copy per LayoutStyle + F-VAL dimensie 8 | Tone-of-voice + content sluit aan op visuele stijl |

**Realistische effort**: 6-10 weken parallel werk. Niet alles in 1 sessie.

---

## §8 Acceptance: wat het oplevert

Na voltooiing Pad C epic:
- LINFI render: editorial-grade premium look (Zwarthout-niveau), niet meer
  "B2B SaaS template"
- Cross-client: elke workspace krijgt een visueel passend resultaat op basis
  van auto-detected layoutStyle + design-system primitives
- Editing: drag-drop + AI-edit + auto-iterate werken onverminderd
- Brand-integratie: tone-of-voice + brand-imagery-style + persona-photos
  doorgevoerd door hele stack
- F-VAL: 8 dimensies (6 content + 1 WCAG + 1 visual-brand-fit)
- Documentation: 1 epic-spec (dit doc) + 5 sub-sprint-specs + ADR's per
  schema-change

---

## §9 Cross-references

- Voor-Pad-C plan: [`docs/specs/brand-styling-consistency-plan.md`](brand-styling-consistency-plan.md) (Sprint 1+2 al gerealiseerd; Sprint 3 superseded door deze epic)
- Landing-page type-spec: [`docs/specs/web-page-types/landing-page.md`](web-page-types/landing-page.md)
- Web-page builder ADR: [`docs/adr/2026-05-22-landing-page-builder-architectuur.md`](../adr/2026-05-22-landing-page-builder-architectuur.md)
- Brand-tokens v2: `src/lib/landing-pages/brand-tokens.ts` (Sprint 1 — wordt v3 in Sub-Sprint A)
- Puck-components: `src/features/campaigns/components/canvas/medium/puck-config.tsx` (krijgt template-driven variants in Sub-Sprint B)
- F-VAL: `src/lib/landing-pages/landing-page-quality.ts` (krijgt dimensie 8 in Sub-Sprint E)
