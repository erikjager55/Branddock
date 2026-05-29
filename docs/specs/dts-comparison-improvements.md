# Vergelijking DTS Ede Design System vs. Branddock — verbeterplan

> **Status**: voorstel — wacht op review.
> **Bron**: `~/Projects/branddock-app/docs/experiments/DTS Ede Design System/` (Claude-gegenereerd uit Branddock-export 19 mei 2026 + linfi-rate dtsede.nl-scrape).
> **Doel**: identificeer wat het DTS-systeem WEL doet wat Branddock nu nog NIET doet, en stel concrete uitbreidingen voor.

---

## 1. Wat het DTS-systeem is

Een complete brand-design-deliverable die Claude (waarschijnlijk via een gespecialiseerde "design" skill) heeft gegenereerd uit een Branddock brand-export. Bevat:

- `README.md` (16 KB) — brand-strategie, voice-rules met do/don't vocabulary-tabel, visuele foundations, iconography-doctriene, hard-rules
- `SKILL.md` — invocation manifest (Claude Code skill-shape)
- `colors_and_type.css` (7.6 KB) — **complete CSS-variables export**: raw + semantic colors, `@font-face` declaraties met licensed OTF's, type-scale (7 sizes), spacing (10 tokens), radii (4), shadows (2), motion (3 durations + easing)
- `fonts/` — 7 licensed Helvetica Neue OTF files (Light → Black + italics)
- `assets/dts-ede-logo.png` — crest extract
- `preview/` — **18 HTML specimen-cards** (buttons, badges, type-stack, type-scale, type-banner, colors-primary/neutrals/semantic, spacing, radii-shadows, news-card, fixture-row, form, iconography, imagery, voice, logo, cover)
- `ui_kits/website/` — volledige React-recreatie van dtsede.nl (1319 lines): Header / Hero / NewsCard (met **echte** headlines uit live site) / FixtureTable / StandingsTable / SponsorStrip / Jarigen / Footer + 6 primitives (Button/Badge/ScoreChip/Card/SectionHeading/Icon)

Het is een **portable, downloadbare deliverable** — een developer of designer pakt de hele map mee en heeft een werkende basis.

## 2. Vergelijking per dimensie

| Dimensie | DTS systeem | Branddock huidig | Gap |
|---|---|---|---|
| **Brand-strategie doctriene** | README.md met expliciete voice-rules + hard rules + do/don't vocabulary-tabel | BrandAssetVersion + BrandVoiceguide met losse velden (purpose/essence/personality) | Geen samenhangende doctriene-doc per workspace |
| **CSS-export** | Static `colors_and_type.css` met alle tokens als CSS variables + `@font-face` | BrandTokens als TypeScript objecten; render via inline styles | Geen CSS-bundle export endpoint |
| **Semantic colors** | `--fg1/fg2/fg3/fg4` (headlines/body/secondary/captions), `--border-default/strong/faint`, `--brand-link/focus-ring` | `surface/onSurface/surfaceMuted/surfaceBorder/brand/onBrand/brandSubtle/accent` | 3-niveau text-fg hiërarchie ontbreekt; geen `--brand-link/focus-ring` aliases |
| **Type-scale** | 7 sizes (12/18/20/30/40/64/88) met `--lh-tight/snug/normal/loose` + `--tracking-display/tight/normal/banner` | DesignSystem.typography per layoutStyle: `display/heading/body/label` met 3-5 sizes per category | DTS heeft `.text-banner` (uppercase + tracking) + `.display` als utility-classes; Branddock heeft alleen size-arrays |
| **Font @font-face** | OTF files licensed + loaded via @font-face met font-weight `300-900` ranges + italic | StyleguideFont relatie met `name/fontFamily/role`; geen file-storage | Geen brand-font upload/serve flow |
| **Spacing scale** | 10 tokens (sp-1=4 ... sp-24=96) | DesignSystem.spacing array per layoutStyle | Branddock heeft per layoutStyle een fixed array; DTS heeft een uniform scale die je per gebruik kiest |
| **Radii** | `--radius-chip/card/input/pill` (2/4/4/999) | `tokens.elevation.cardBorderRadius` + `tokens.button.radiusPx` | Branddock mist input-radius + chip-radius |
| **Shadows** | `--shadow-elev-1` (sticky header) + `--shadow-elev-2` (dropdowns) | `tokens.elevation.cardShadow` | Branddock heeft 1 shadow-token; DTS 2 elevation-levels + use-case rules |
| **Motion** | `--ease-out` cubic-bezier + `--dur-fast/base/slow` (150/200/250) | `tokens.motion.transitionDuration + easing` (1 set) | Branddock 1 timing; DTS 3 durations per use-case |
| **Interaction states** | Hard-rules: hover (darken / 4% tint / underline) / press (2px translateY) / focus (2px outline + 2px offset) / disabled (light-gray fill, medium-gray text) | `tokens.button.hoverStyle` enum (darken/lighten/scale/underline/none) | DTS heeft expliciete CSS-classes per state; Branddock heeft alleen one-prop |
| **Preview-cards** | 18 standalone HTML files voor visual validatie | Geen — alleen Puck Step 3 preview | Geen specimen-tab in Brandstyle-UI |
| **Per-merk UI-kit** | Volledige React recreatie met workspace-specifieke layout (FixtureTable / StandingsTable voor voetbal-club) | Generic 8 Puck-components voor alle workspaces | Geen vertical-specifieke component-bibliotheken |
| **Real content samples** | NewsCard heeft 6 echte headlines uit dtsede.nl | LP-renders gebruiken LLM-generated copy | Scraped bodyText wordt niet ge-availabled als placeholder voor previews |
| **Vocabulary table** | "Do say" vs "Don't say" tabel in README (10 rijen) | BrandVoiceguide heeft `examplePhrases` JSON maar niet als geverifieerde tabel | Geen Brandstyle-UI weergave van do/don't woorden |
| **Photography rules** | "60% action / 40% community, all ages, no stock, no studio" — expliciete % + exclusions | `tokens.photography.mood/composition/subjects + imageryDonts[]` | Branddock heeft de info maar geen %-distributie of explicit numeric rules |
| **Substitution-flags** | SKILL.md noemt expliciet "Lucide stands in for unspecified icon set" + "Imagery placeholders — replace with real DTS Ede photos" | Geen confidence-flag van wat AI heeft gegokt vs gescraped | User weet niet welke tokens echte data vs heuristiek zijn |

## 3. Top-5 verbeteringen (geordend op impact/effort)

### V1 — Brand-Doctrine Doc Generator (HOOG impact, ~2 dagen)

Genereer per workspace een README.md-achtige brand-doctriene-doc als nieuwe Phase 4 in `analyzeUrl`. Bevat:

- Brand essence/promise/archetype/personality samenvatting (uit BrandAssetVersion)
- **Tone-rules**: 4-6 expliciete regels in "trusted neighbor not corporate spokesperson" stijl
- **Casing & writing rules**: actief/passief, lengte, persoon (1e/2e/3e), present/past tense
- **Vocabulary table**: 8-10 rijen "Do say" vs "Don't say" specifiek voor dit merk
- **Hard rules**: bullet-list van non-onderhandelbare visuele/voice-regels
- **Sample paragraaf** in eigen brand-voice (~50 woorden)

Persist als `BrandStyleguide.brandDoctrine TEXT` (additive schema-veld).

**Hoe gebruikt**:
- AI variant-generator krijgt het als brand-essence-context (vervangt huidige free-form blends)
- Brandstyle-UI heeft tab "Brand Doctrine" met human-readable view
- Downloadbaar als README.md in brand-kit-export

**Files**:
- `prisma/schema.prisma` — `brandDoctrine String? @db.Text`
- `src/lib/brandstyle/analysis-prompts.ts` — nieuwe Phase 4 prompt
- `src/lib/brandstyle/analysis-engine.ts` — call + persist
- `src/lib/landing-pages/variant-generator.ts` — opname als context

### V2 — CSS-Variables Export Endpoint (HOOG impact, ~1 dag)

Genereer een statisch downloadbare `tokens.css` per workspace uit BrandTokens v4. Endpoint:

```
GET /api/brandstyle/[workspaceId]/tokens.css
→ Content-Type: text/css
→ Body: complete CSS-variables export
```

Output-shape mirror van `colors_and_type.css`:
- Raw kleuren (1 var per BrandColor)
- Semantic aliases (`--brand-primary`, `--brand-link`, `--fg-1/2/3/4`, `--border-default/strong/faint`)
- Type-scale (7 sizes + line-heights + tracking)
- Spacing scale (10 tokens 4-96px)
- Radii (chip/card/input/pill)
- Shadows (elev-1, elev-2)
- Motion (3 durations + ease-out)
- `@font-face` declaraties wanneer StyleguideFont een fileUrl heeft

**Hoe gebruikt**:
- Developers kunnen direct in eigen project linken: `<link rel="stylesheet" href="https://branddock.app/api/brandstyle/.../tokens.css">`
- Brand-kit-export ZIP bevat dit bestand
- Brandstyle-UI heeft "Copy CSS variables" button

**Files**:
- `src/app/api/brandstyle/[workspaceId]/tokens.css/route.ts` — nieuwe endpoint
- `src/lib/brandstyle/tokens-css-renderer.ts` — pure helper die BrandTokens → CSS string

### V3 — HTML Specimen-Cards in Brandstyle UI (MEDIUM impact, ~2 dagen)

Brandstyle-tab krijgt een sectie "Specimen" met 8-12 visuele preview-cards die brand-tokens live tonen. Cards zijn React-components in `src/features/brandstyle/components/specimens/`:

- ColorsCard (PRIMARY palette + neutral ramp grid)
- TypeScaleCard (display / h1 / h2 / h3 / body / caption / small met live preview)
- TypeStackCard (font-family + weight-ladder demo)
- ButtonsCard (primary / secondary / tertiary / disabled met live tokens)
- BadgesCard
- CardsCard (rendert FeatureCard / NewsCard / TestimonialCard met scraped images als bgs)
- FormCard (input / textarea / select / button)
- SpacingCard (visuele spacing-scale)
- RadiiShadowsCard
- IconographyCard (Lucide-icons in iconography.strokeWeight + sizeDefault)
- ImageryCard (gallery van scraped brand-images uit MediaLibrary)
- VoiceCard (sample-paragraaf + do/don't vocabulary tabel)

**Hoe gebruikt**:
- User-feedback loop: zie direct welke wijziging welke visuele impact heeft
- Designer/dev-onboarding: 1-screen samenvatting van merk-DNA

**Files**:
- 12 nieuwe React-components in `src/features/brandstyle/components/specimens/`
- Nieuwe tab/sectie in `src/features/brandstyle/components/BrandstylePage.tsx`

### V4 — Type-scale + Semantic fg-tokens (KLEIN impact, ~0.5 dag)

Uitbreiden van BrandTokens v4 met:
- `tokens.text` — semantic foreground hiërarchie: `text.heading` (donker), `text.body` (mid), `text.secondary` (mid-light), `text.caption` (light)
- `tokens.designSystem.typography` — 7-step size-scale i.p.v. 3-5 (Branddock heeft nu per layoutStyle: display sizes [48,64,72,96] voor MINIMAL; uitbreiden naar [12,18,20,30,40,64,88] universele scale)
- `tokens.designSystem.lineHeight` — semantic naming `{tight,snug,normal,loose}` i.p.v. fixed-per-size
- `tokens.designSystem.tracking` — `{display,tight,normal,banner}` voor letter-spacing

Backwards-compat: huidige `tokens.designSystem.typography.{display,heading,body,label}.sizes[]` blijft werken; nieuwe semantic-naming is additive.

**Files**:
- `src/lib/landing-pages/brand-tokens.ts` — nieuwe sub-shapes
- `src/lib/landing-pages/design-system.ts` — uitbreiden presets
- `src/lib/landing-pages/brand-tokens-v4-mappers.ts` — mapping uit typographyProfile per rol

### V5 — Brand-kit Export ZIP (MEDIUM impact, ~1 dag)

Endpoint `GET /api/brandstyle/[workspaceId]/export.zip` genereert een downloadbare brand-kit met dezelfde structuur als de DTS-folder:

```
brand-kit-{slug}/
├── README.md              ← brandDoctrine uit V1
├── tokens.css             ← uit V2 endpoint
├── colors_and_type.css    ← legacy alias
├── assets/
│   ├── logo.png           ← StyleguideLogo primary
│   └── icons/             ← Lucide subset
├── fonts/                 ← StyleguideFont fileUrls
├── preview/               ← V3 cards als statische HTML
└── ui_kits/
    └── (placeholder)      ← roadmap
```

**Hoe gebruikt**:
- Klant downloadt eenmalig + houdt brand-DNA portable
- Dev-overdracht naar third-party agencies
- Backup buiten Branddock

**Files**:
- `src/app/api/brandstyle/[workspaceId]/export.zip/route.ts`
- `src/lib/brandstyle/kit-builder.ts` — zipt alles bij elkaar (jszip al dependency)

## 4. Nice-to-have (deferred)

**N1 — Vertical-specifieke component-bibliotheken**: voor voetbal-clubs een `FixtureTable` / `StandingsTable`, voor e-commerce een `ProductCard`, voor SaaS een `PricingMatrix`. Detectie via brand-archetype + industry. *Effort: zeer hoog, kan v2.*

**N2 — Real content samples**: scraper bewaart al `scraped.bodyText` (max 2000 chars per page). Genereer per content-type een 3-fixture-set met echte zinnen uit de site i.p.v. LLM-placeholders bij Step 2 voorbeeld-render. *Effort: 0.5 dag.*

**N3 — Substitution-confidence-badges**: in Brandstyle-UI badge per token-veld met confidence-niveau (high/medium/low) + bron (scraped / inferred / archetype-default / user-override). Gebruikers zien direct wat wel/niet betrouwbaar is. *Effort: 1 dag.*

**N4 — Interactive state-rules CSS**: tokens.button → genereert `.btn:hover { background: ... }` CSS-rules i.p.v. alleen render-time inline styles. Voor non-Puck consumers + brand-kit-export. *Effort: 0.5 dag, hoort bij V2.*

**N5 — Photography %-rules**: `tokens.photography.subjectMix` met `{actionPct: 60, communityPct: 40}` + extracted via Phase 4 vision op scraped images. *Effort: 1.5 dag — vereist vision-judge infra.*

## 5. Prioritering + ROI

| # | Verbetering | Impact | Effort | ROI |
|---|---|---|---|---|
| V1 | Brand-Doctrine Doc Generator | Hoog | 2d | **1** |
| V2 | CSS-Variables Export | Hoog | 1d | **2** |
| V3 | HTML Specimen-Cards UI | Medium | 2d | 3 |
| V4 | Type-scale + fg-tokens | Klein | 0.5d | 4 |
| V5 | Brand-kit Export ZIP | Medium | 1d | 5 |
| N2 | Real content samples | Medium | 0.5d | 6 |
| N3 | Substitution-confidence | Klein | 1d | 7 |
| N1 | Vertical components | Hoog | 5-10d | (deferred) |
| N5 | Photography %-rules | Klein | 1.5d | (deferred) |

**Aanbevolen volgorde**:
1. **V4 eerst** (foundation, halve dag, geeft type-scale die V2/V3 nodig hebben)
2. **V1** (de echte brand-DNA verrijking)
3. **V2** (geeft ontwikkelaars een tastbare deliverable)
4. **V3** (visualiseert wat V1+V2 hebben opgeleverd)
5. **V5** (verpakt alles als downloadable)

**Totaal V1-V5**: ~6.5 dagen full-focus.

## 6. Wat het DTS-systeem GOED doet wat we kunnen blijven leren

- **Tight scope**: 2 blues + gray ramp + 1 font + 4 radii — kortere lijst is sterker dan een rijke maar incoherente set
- **Explicit substitutie-flags**: Claude flag waar het gokte (Lucide-icons, photo-placeholders)
- **Sample-paragraaf in eigen voice**: belangrijker dan 1000 woorden voice-rules
- **Vocabulary do/don't tabel**: concrete houvast voor copy
- **Real content i.p.v. lorem-ipsum**: laat brand-feel direct zien
- **Hard rules als kortste-zin**: "Never invent accent colors", "Cards do not float", "No emoji except DTS Ede 6 🍺" — pareltjes die in product overgenomen kunnen worden

## 7. Wat Branddock al beter doet dan DTS

- **Multi-tenant**: 1 systeem voor N merken vs. 1 deliverable per merk
- **Live re-scrape**: brand kan evolueren — DTS deliverable is een snapshot
- **Iteratieve generation**: F-VAL feedback-loop verbetert output
- **Visual preview**: Puck-Step-3 toont LIVE wat de tokens doen i.p.v. statische HTML
- **Database-driven**: tokens zijn query-able, schema-typed, versioned
- **AI-archetypes**: Jung-classifier geeft semantische laag boven kleur+font

Branddock's positionering: **een operationeel platform voor levende brand-DNA**, terwijl DTS-deliverable een **statische dev-deliverable** is. Beide kunnen elkaar versterken — Branddock genereert de DTS-stijl deliverable als export-output.

## 8. Open vragen voor review

1. Akkoord met de V1-V5 volgorde + V4 als foundation eerst?
2. Brand-Doctrine Doc als nieuwe Phase 4 in analyzeUrl — extra Anthropic-cost (~$0.05/scrape) acceptabel?
3. Brand-kit Export ZIP: openbaar (geen auth) of behind-workspace-auth?
4. Specimen-cards moeten ook downloadable als statische HTML voor offline-review?
5. N1 (vertical-specifieke components): geïnteresseerd of niet relevant voor de Branddock-positionering?
