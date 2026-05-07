# Implementatieplan — Brandstyle Analyzer v2

**Laatst bijgewerkt**: 2026-04-19
**Status**: Fase 0 in progress

## Doel

De Brandstyle Analyzer uitbreiden met:
1. **Brand Assets** sectie voor logo + font uploads (eerste tab, gemerged met huidige Logo tab)
2. **Per-sectie review workflow** met thumbs up / needs work + tekstfeedback + optionele referentie-image
3. **Published toggle** die styleguide pas live zet als alle secties APPROVED zijn
4. **Rijkere design system detectie**: typografie-rollen (display/UI/eyebrow), semantische kleuren (info/success/warning/danger), spacing tokens (scale/radii/shadow), component samples (buttons, forms, chips, cards, icons, nav, quote blocks)

## Openstaande keuzes (beslist 2026-04-19)

1. ✅ Brand Assets als **eerste tab** in styleguide
2. ✅ Huidige Logo tab wordt **gemerged** in Brand Assets
3. ✅ Component detectie draait **automatisch** als onderdeel van analyzer run
4. ✅ Visual System tab wordt **gesplitst** — Spacing eruit als eigen sectie

## Huidige staat

- `BrandStyleguide` model met inline Logo (JSON `logoVariations`), relationele Colors, typografie als aparte velden, tone/imagery/visualLanguage als JSON
- Analyzer in `src/lib/brandstyle/analysis-engine.ts` — 6-fase pipeline (SCANNING → COLORS → TYPOGRAPHY → COMPONENTS → VISUAL_LANGUAGE → STYLEGUIDE)
- Zes UI tabs: Logo, Colors, Typography, Tone of Voice, Imagery, Visual System

## Fases & volgorde

### Fase 0 — Schema + storage foundation

**Nieuwe Prisma modellen**: `StyleguideFont`, `StyleguideLogo`, `StyleguideComponent`, `StyleguideReview`

**Nieuwe enums**: `FontRole` (DISPLAY/UI/EYEBROW_META/BODY), `FontSource` (DETECTED/UPLOADED), `LogoVariant` (PRIMARY/LIGHT/DARK/ICON/WORDMARK/LOCKUP), `ComponentType` (BUTTON/FORM_INPUT/STATUS_CHIP/PRODUCT_CARD/FEATURE_ICON/TOP_NAVIGATION/QUOTE_BLOCK), `ReviewStatus` (PENDING/APPROVED/NEEDS_WORK)

**BrandStyleguide extensies**:
- Verwijder: `logoVariations Json?` (vervangen door `logos StyleguideLogo[]` relatie)
- Behoud: `logoGuidelines`, `logoDonts`, `logoSavedForAi` (per-styleguide niveau)
- Toevoegen: `published Boolean`, `publishedAt DateTime?`, `semanticColors Json?`, `spacingScale Json?`, `cornerRadii Json?`, `shadowSystem Json?`
- Toevoegen relaties: `logos`, `fonts`, `components`, `reviews`

**Workspace**: 4 nieuwe relatievelden.
**User**: 3 nieuwe relatievelden (FontUploader, LogoUploader, StyleguideReviewer).

**Storage paden**:
- `/uploads/fonts/<workspaceId>/<fontId>.<ext>`
- `/uploads/logos/<workspaceId>/<logoId>.<ext>`
- `/uploads/reviews/<workspaceId>/<reviewId>.<ext>`

**Validatie**:
- Fonts: max 5MB, types woff2/woff/ttf/otf
- Logos: max 10MB, types svg/png/jpg
- Review images: max 5MB, types png/jpg

### Fase 1 — Brand Assets sectie (logos + fonts)

**Doel**: eerste zichtbare oplevering. Fonts uploaden, logos beheren.

**API** (9 endpoints):
- `POST/GET /api/brandstyle/fonts` — upload + lijst
- `PATCH/DELETE /api/brandstyle/fonts/[id]`
- `POST/GET /api/brandstyle/logos` — upload + lijst
- `PATCH/DELETE /api/brandstyle/logos/[id]`
- Alle mutaties invalideren `brandstyle` + `dashboard` cache prefixes

**Analyzer koppeling**: `analysis-engine.ts` Phase 2 schrijft detected font names naar `StyleguideFont` met `source: DETECTED` + `fileUrl: null`. Upload route matcht op naam → update bestaand record naar `UPLOADED`.

**UI**:
- `BrandAssetsSection.tsx` — eerste tab, 2 sub-kaarten (Fonts, Logos)
- `FontsGrid.tsx` + `FontCard.tsx` + `FontUploadModal.tsx`
- `LogosGrid.tsx` + `LogoCard.tsx` + `LogoUploadModal.tsx`
- `useCustomFonts` hook — `@font-face` injectie via dynamic `<style>` tag voor uploaded fonts
- `TypographySection.tsx` — update om uploaded font te gebruiken als aanwezig, anders Google Fonts fallback

**Navigation**: `StyleguideTabNav` krijgt 7 tabs: **Brand Assets**, Colors, Typography, Tone of Voice, Imagery, Visual System, (later: Components + Spacing).

### Fase 2 — Review workflow + Published toggle

**API** (3 endpoints):
- `PATCH /api/brandstyle/review/[section]` — Zod body `{ status, feedback?, referenceImageUrl? }`, upsert
- `POST /api/brandstyle/review/[section]/upload-reference` — multipart image upload
- `PATCH /api/brandstyle/published` — body `{ published: boolean }`, 400 als niet alle secties APPROVED

**Sectie-keys** (hardcoded in `src/lib/brandstyle/review-sections.ts`):
- `brand-assets-logos`, `brand-assets-fonts`
- `colors-brand`, `colors-neutrals`, `colors-semantic`
- `typography-display`, `typography-ui`, `typography-eyebrow`
- `spacing-scale`, `spacing-radii`, `spacing-shadow`
- `tone-of-voice`, `imagery`
- `visual-system-corners`, `visual-system-shadows`, `visual-system-lines`, `visual-system-shape`, `visual-system-depth`
- `components-buttons`, `components-form-inputs`, `components-status-chips`, `components-product-cards`, `components-feature-icons`, `components-top-navigation`, `components-quote-blocks`

(Sommige activeren pas nadat Fase 3/4/5 ze opleveren.)

**UI**:
- `ReviewDraftPanel.tsx` — shared component: Looks good / Needs work buttons + tekstfeedback + image upload (bij Needs work)
- `ReviewStatusBadge.tsx` — dot indicator per sectie (groen/oranje/grijs)
- `PublishToggle.tsx` — header, tooltip "X secties nog niet gereviewd" tot 0 pending
- `ReviewSummaryHeader.tsx` — titel "Review draft design system" + "Needs review: N" counter + missing assets warnings

**Integratie**: elke bestaande sectie-component krijgt `<ReviewDraftPanel section={key} />` child.

### Fase 3 — Typografie rollen + semantische kleuren

**Analyzer**:
- Typography role detection: cluster font-size uit scraped CSS. Grootste (h1/h2) = DISPLAY, body/buttons = UI, klein met uppercase/letter-spacing = EYEBROW_META. Claude bevestigt + picked family per rol.
- Semantic colors: Claude Vision + CSS class hints (`success|error|warning|info|danger` keywords, standaard hex-patronen). Retourneert `{ info, success, warning, danger }` met tint-paren.

**Schema**: velden al in Fase 0. Typography per rol opslaan als sub-keys van JSON, semantic colors in `semanticColors` JSON.

**UI**:
- `TypographySection.tsx` → 3 kaarten (Display / UI / Eyebrow & meta)
- `ColorsSection.tsx` → 3 kaarten (Brand / Neutrals / Semantic tints)

### Fase 4 — Spacing tokens splitsen uit Visual System

**Analyzer**: `css-visual-heuristics.ts` uitbreiden met frequentie-analyse op padding/margin voor spacing scale, per-componenttype mediaan voor corner radii, dedup van box-shadow values voor shadow system.

**UI**:
- `SpacingSection.tsx` — nieuwe tab, 3 kaarten: Spacing scale (balken met px-waarden), Corner radii (3 squares met radius), Shadow system (3-4 cards met shadow preview)
- `VisualSystemSection.tsx` behoudt corners/lines/shape/depth/effects

**Tabs**: **Brand Assets**, Colors, Typography, **Spacing**, Tone of Voice, Imagery, Visual System (later: Components).

### Fase 5 — Component detectie pipeline

**Pipeline** (`src/lib/brandstyle/component-extractor.ts`):
1. Crawl (hergebruikt `src/lib/website-scanner/crawler.ts`) — 8-10 representatieve pagina's
2. Per pagina: Puppeteer screenshot + DOM-scan per componenttype met CSS selectors
3. Per match: cropped screenshot via `sharp`
4. Claude Vision analyse per crop → `{ label, extractedStyles, confidence }`
5. Dedup op style hash → hoogste confidence behouden
6. Opslag in `StyleguideComponent` + `/uploads/components/<workspaceId>/<componentId>.png`

**Automatisch**: draait als laatste fase in `analysis-engine.ts`. Nieuwe status `EXTRACTING_COMPONENTS`.

**Kosten**: ~5-10 min per scan, ~200K Claude Vision tokens. AI feature key `brandstyle-component-analysis`.

**API** (4 endpoints):
- `GET /api/brandstyle/components` — lijst + filter op type
- `PATCH/DELETE /api/brandstyle/components/[id]`
- `POST /api/brandstyle/components/regenerate` — her-run pipeline

**UI**:
- `ComponentsSection.tsx` — tab met 7 sub-tabs per type
- `ComponentGallery.tsx` — grid van variants per type
- `ComponentCard.tsx` — thumbnail + tokens + source URL + review panel
- `ComponentDetailModal.tsx` — full preview + token breakdown + edit

**Tabs na Fase 5**: **Brand Assets**, Colors, Typography, **Components**, Spacing, Tone of Voice, Imagery, Visual System.

### Fase 6 — Polish, PDF export, AI context

- `exportBrandstylePdf.ts` — alle nieuwe secties + published stamp
- `brand-context.ts` `formatBrandstyleForAi()` — uploaded fonts + semantic colors + components
- Gate: alleen injecteren in AI prompts als `published: true`
- Code review: 3 rondes met telkens 2 onafhankelijke review-agents per CLAUDE.md conventie

## Afhankelijkheden

```
Fase 0 ─→ Fase 1 (Brand Assets)   [independent deliverable]
       ├→ Fase 2 (Review + Published)  [needs Fase 1 sectie-keys]
       ├→ Fase 3 (Type roles + Semantic)  [needs Fase 1 font roles]
       ├→ Fase 4 (Spacing tokens)  [independent]
       └→ Fase 5 (Components)  [heaviest, run last]
          Fase 6 across
```

## Storage & file handling

Lokale dev: `public/uploads/` structuur al in gebruik (matcht reference-image pattern). Productie later R2/S3 via bestaande storage abstraction.

## Data migratie

- Bestaande `BrandStyleguide.logoVariations` JSON wordt gedropt. Demo styleguide in seed moet logo records naar `StyleguideLogo` records converteren.
- Bestaande styleguides zonder `reviews` default naar PENDING bij eerste load (geen breaking change).

## Verificatie per fase

- **Fase 0**: `npx prisma validate`, `npx prisma db push`, `npx tsc --noEmit` → 0 errors
- **Fase 1**: handmatige upload-flow (woff2 + svg), detected font match, preview rendering, delete cascade
- **Fase 2**: alle secties PENDING bij reset, approven → counter telt af, Publish gate werkt
- **Fase 3**: re-run analyzer op test-URL, bevestig role mapping + semantic color detection
- **Fase 4**: tokens verschijnen als pills, review werkt
- **Fase 5**: run op stripe.com referentie-site, 3-4 button varianten + nav + cards correct gedetecteerd
- **Fase 6**: PDF export bevat alle secties, AI context injectie alleen bij published=true

---

## Progress log

- **2026-04-19**: Plan akkoord, 4 open keuzes beslist, Fase 0 gestart
- **2026-04-19**: Fase 0 afgerond — schema (+4 modellen, +5 enums, +7 BrandStyleguide velden, +3 User relaties, +4 Workspace relaties) gepushed, TS 0 errors, Prisma validate clean. `logoVariations` Json → `StyleguideLogo` relatie gemigreerd in: seed, logo route (legacy wrapper), ai-context route, workspace/export route, analysis-engine, snapshot-builders, claw read-tools, workspace-context-resolver, fill-wra-juristen script.
- **2026-04-19**: Fase 1 afgerond — Brand Assets tab als eerste sectie. 4 API endpoints (fonts + logos GET/POST + [id] PATCH/DELETE), DETECTED→UPLOADED upgrade flow, analyzer schrijft detected fonts naar StyleguideFont, 6 UI componenten (FontCard/Grid/Upload + LogoCard/Grid/Upload), `useCustomFonts` hook voor @font-face injection. Functioneel geverifieerd in dev server.
- **2026-04-19**: Fase 2 afgerond — Review workflow + Published toggle. `lib/brandstyle/review-sections.ts` met 23 sectie-keys + 7 ACTIVE sections, 3 API endpoints (review upsert + upload-reference + published gate). 4 UI componenten (ReviewDraftPanel, ReviewStatusBadge, PublishToggle, ReviewSummaryHeader). ReviewSummaryHeader geplaatst onder provenance banner op BrandStyleguidePage. Alle 6 sectie-componenten (BrandAssets, Colors, Typography, ToneOfVoice, Imagery, VisualSystem) gewired met ReviewDraftPanel children. Functioneel geverifieerd.
- **2026-04-19**: Dev server Turbopack cache corruption na grote refactor — gefixt met `rm -rf .next` + restart (clean start: 541ms).
