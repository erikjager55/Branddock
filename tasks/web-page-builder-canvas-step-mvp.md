---
id: web-page-builder-canvas-step-mvp
title: Web-page builder MVP — Puck als Canvas Step 3 Medium-renderer voor 5 web-page types
fase: pre-launch
priority: now
effort: 6-8 weken (1 dev), gefaseerd 6 phases + 4 follow-up werkstromen (totaal 13 dagen sinds 2026-05-24)
owner: claude-code
status: in-progress
created: 2026-05-23
started: 2026-05-24
phases-complete: 6 of 6 (backend + UI) + 6.1 + 6.2 follow-ups + design-batches 1-8 + brandstyle Fase A-E (LP-fidelity werkstroom) + F-VAL vision-judge dim 8 + auto-iterate hardening + DTS content-quality C1-C11
remaining: brand-fidelity Step 2 LP wiring (Track 5) + Track 4 acceptance (README, BrandOnboardingWizard, F-VAL HTML calibration, dual-render perf, marketing-site-pricing dogfood) + Track 2 4-squash-merges + browser-smoke door user + bug-report submission
related-adr: docs/adr/2026-05-22-landing-page-builder-architectuur.md + 3 ADR-aanvullingen volgen (2026-05-29)
related-spec: tasks/_drafts/idea-landing-page-builder.md + docs/specs/{dts-content-quality-improvements,dts-comparison-improvements,brandstyle-analyzer-improvement-plan}.md
related-plan: ~/.claude/plans/zippy-twirling-feigenbaum.md (approved 2026-05-29)
worktree: branddock-feat-web-page-builder-canvas
---

# Status 2026-05-29 — promoted naar pre-launch sprint #6

Feature-branch `branddock-feat-web-page-builder-canvas` heeft **130 commits ahead van main** (origin heeft 129, lokaal 1 extra na docs/specs + roadmap commits 2026-05-29). 4 vermengde werkstromen gelandet sinds 2026-05-24. Roadmap-update: task gepromoot van post-launch (priority: next) naar pre-launch sprint #6 Track A — 5 dagen capaciteit gegaan op een formeel post-launch task verdiende erkenning.

**Brand-fidelity-gap gevonden 2026-05-29** in Step 2 LP-deliverables: `Step2ContentVariants.tsx:318-325` routeert LP naar `LandingPageGenerateBlock` (aparte Step 2 host) zonder `FidelityScoreBar` + zonder SSE-events. Wordt opgelost als Track 5 in plan `zippy-twirling-feigenbaum`.

## Follow-up werkstromen sinds 2026-05-24

| Werkstroom | Commit-aantal | Range | Squash-target Track 2 |
|---|---|---|---|
| **MVP Phase 1-6.2** (oorspronkelijk) | 8 | `2c28dd68` → `873d69b2` | PR 1: `feat(landing-pages): MVP Puck builder + Phase 1-6 + 6.1 + 6.2` |
| **Brandstyle Fase A-E (LP-fidelity werkstroom)** | ~10 | `24105e16`, `b36ca91c`, `08bc6966`, `744ae61f`, `057e4bf7`, `3ff4122f`, `df831143`, `53409620`, `085e8290`, `efb14497`, `98fbefb2`, `2706a9c4` | PR 2: `feat(brandstyle): Fase A-E scraper-extractor cycle voor LP-fidelity` |
| **LP design-quality batches 1-8** | ~15 | `6c9cbe6b`, `caba84a4`, `4855a780`, `0e1b5281` + design-fixes (`719141aa`, `ee876198`, `a168940a`, `4ce8bd13`, `a215964c`, `3e29953a`, `deeda289`, `c7286caf`) + scraped-data exposure (`c351011b`, `c0d6ac13`, `b00a374a`) | PR 3: `feat(lp): design-quality batches 1-8 + scraped-data exposure` |
| **Auto-iterate hardening + F-VAL vision-judge dim 8 + DTS C1-C11** | ~21 | `944a8d34`, `410dcee6`, `0f9ebacf`, `1064cf81`, `6e2d249a`, `aea0d28d`, `809bb9e4`, `0cbccff1`, `2e8eb0ad`, `b09887e8`, `38dcfe10`, `3e621612`, `1439fc20`, `af7a688f`, `ec527061`, `a785273b`, `23dd181b`, `60d1a8cb`, `11283481`, `39171432`, `d06b428e` | PR 4: `feat(canvas+f-val): vision-judge dim 8 + auto-iterate hardening + DTS content-quality C1-C11` |
| **Specs + roadmap (2026-05-29)** | 2 | `08a0ff12` docs(specs), `dad0d003` docs(roadmap) | bundelen met PR 1 of losse `chore: ` PR |

**Cumulatief**: 36 files (oorspronkelijke MVP) + ~60 files (follow-ups) = ~95 files / +12000 lines geschat.

## Originele MVP status (2026-05-24)

Feature-branch `branddock-feat-web-page-builder-canvas` heeft 8 commits, niet-gemerged in `main`. Totaal: 36 files / +6175 lines / 279 smoke-assertions PASS over 7 zelfstandige `npx tsx`-scripts.

| Phase | Commit | Smoke | Resultaat |
|---|---|---:|---|
| 1 Foundation | `2c28dd68` | — | Prisma + 5-type dispatch + spike-code naar productie |
| 2 Components | `690631f9` | 58 ✅ | 8 brand-aware components + structurele brand-tokens util |
| 3 Templates | `380d99da` | 74 ✅ | 5 per-type templates + smarter variantToPuckData seeding |
| 4 Publish-laag | `29c9d8bb` | 44 ✅ | Middleware host-router + LandingPage write + /p/[slug] render |
| 5 Component AI | `f82f74cf` | 36 ✅ | 4-instruction AI menu + lock-toggle |
| 6 Page-level AI | `00553de3` | 35 ✅ | Auto-iterate + strict-rewrite + generate-page (utils + 3 routes) |
| 6.1 UI follow-up | `23715313` | 18 ✅ | PageDiffPreviewModal + 3 page-level toolbar-knoppen |
| 6.2 F-VAL + migration + bug-report | `873d69b2` | 14 ✅ | evaluatePageQualityViaFVAL + Prisma migration + Puck bug-report draft |

**Open voor productie-rollout** (per plan `zippy-twirling-feigenbaum`, ~8-9 dagen totaal):

**Track 1 — Finalisatie** (~2d):
- ✅ Untracked specs gecommit met status-flags (`08a0ff12`, 2026-05-29)
- ⏳ Bug-report Puck `external` field-typing indienen — draft in `docs/audits/puck-external-field-typing-issue.md`
- ⏳ Browser-smoke 10-stappen (5 LP types × 2 workspaces + 3 non-web regressie + 4 edit-flows) — user-manual
- 🔄 Bundle-size verifiëren — editor ✅ 208 KB gz (target 350 KB, gemeten 2026-05-29); render-route `/p/[slug]` ⏳ (target 100 KB, deelt puck-chunk → momenteel ~208 KB)
- ⏳ Bundle-analyzer Turbopack alternatives — `@next/bundle-analyzer` is incompatibel met Turbopack (Next 16.1.6). Try `npx next experimental-analyze` (Turbopack-native) of `npx next build --webpack` voor klassieke route-tabel met First Load JS per route. `next.config.ts` wrap + `npm run analyze` script staan klaar maar genereren geen rapport.
- ⏳ puck-config render-only split voor `/p/[slug]` ≤100 KB — extract 11 render functions naar `puck-config-render.tsx` (alleen render-fns, geen fields/defaultProps). Update `/p/[slug]/page.tsx` om `buildSpikePuckRenderConfig` te importeren ipv `buildSpikePuckConfig`. Editor (`PuckPageBuilder.tsx`) blijft `puck-config.tsx` gebruiken met de fields. Estimate ~90 min refactor + verify via analyzer.
- ✅ TSC + lint groen (2026-05-29) — 7 smoke-scripts nog te runnen
- ✅ Task-file refresh naar werkelijke staat (deze edit, 2026-05-29)

**Track 5 — Brand-fidelity Step 2 LP** (~1d):
- SSE-conversie `/api/landing-pages/[deliverableId]/generate-structured-variant/route.ts` + `runFidelityScoring` call
- `useCanvasOrchestration`-hook switch in `LandingPageGenerateBlock.tsx`
- `FidelityScoreBar` render conditional toevoegen

**Track 4 — Openstaande MVP-acceptance** (~3d):
- README in `src/features/campaigns/components/canvas/medium/` ("hoe voeg ik een Puck-component toe")
- `BrandOnboardingWizard.tsx` bouwen (backend klaar)
- F-VAL HTML-vs-Markdown calibration-doc in `docs/specs/`
- Dual-render perf meting ≥50 components in `docs/audits/`
- Dogfood `marketing-site-pricing` via builder (screenshots als vercel niet live)

**Track 2 — Merge-strategie** (~2-3d):
- 3 ADR-aanvullingen (`2026-05-29-brandstyle-analyzer-lp-fidelity`, `2026-05-29-fval-vision-judge-dim8`, `2026-05-29-dts-content-quality`)
- Rebase + conflict-check tegen main (preview-map.ts overlap met ad-quality/ad-publishing)
- 4 squashes sequentieel mergen + wacht-op-CI tussen elke
- Track 5 als losse 5e PR
- 4 changelog entries `#270`-`#273`
- Branch + worktree cleanup post-merge

**Track 3 — Roadmap-update**: ✅ done 2026-05-29 (`dad0d003`)

---

# Probleem

Branddock's Canvas Step 3 stopt vandaag bij een statische Markdown-preview voor de 5 web-page content-types (`landing-page`, `product-page`, `faq-page`, `comparison-page`, `microsite`) — geen drag-drop layout-controle, geen publish-flow naar URL, en brand-context-injectie verdampt op het moment dat gebruikers naar Webflow/HubSpot moeten. Spike 2026-05-22 bevestigde Pattern B (Puck als Medium-renderer met `CanvasContextStack`-prop) als minimal-invasive integratiepad met groen-licht op A1+A2+A4+A6+A8 (browser-smoke 2026-05-23).

# Voorstel

Vervang `LandingPagePreview` voor alle 5 web-page content-types met `PuckPageBuilder` (uitgebouwd uit spike), met 8 brand-aware components, 5 per-type templates, publish-flow naar `<workspace>.branddock.app/<slug>` via middleware-routing, en 3-laags edit-paradigma (direct visual + component-level AI met diff-preview + page-level auto-iterate). Custom domains (Vercel Domains API + DomainMapping) schuiven naar v2. Effort gefaseerd over 6 phases om incrementele merges en review-cycles mogelijk te maken; eerste phase ontgrendelt `marketing-site-pricing` (Track C dogfood) als showcase-use-case.

# Acceptatiecriteria

> Granulair per phase in sectie "Phases" hieronder. Geaggregeerd:

- [ ] Alle 5 web-page content-types tonen `PuckPageBuilder` in Step 3 (0 regressie op 48 non-web-page types)
- [ ] 8 brand-aware components implementeren `BrandStyle` (structurele consumptie, niet free-text parsing) + `BrandVoice` + `Personas` injectie via `CanvasContextStack` prop
- [ ] 5 per-type templates leveren een werkbaar startpunt voor lege deliverables
- [ ] `variantToPuckData()` seedt correct uit Step 2 variants voor alle 5 types (≥ 80% gevallen zonder hand-correctie, gemeten op 5 hand-gekozen fixtures)
- [ ] Publish via Export-step → `<workspace>.branddock.app/<slug>` rendert via ISR met TTFB ≤ 200ms cold
- [ ] Component-level AI-edit ("Maak korter", "Schrijf formeler", "3 alternatieven") toont diff-preview modal vóór commit
- [ ] Page-level auto-iterate triggert bij F-VAL score < 70 en toont page-level diff-preview met per-component accept/reject
- [ ] Lock-toggle per component werkt: AI-changes slaan locked components over en tonen badge in diff-preview
- [ ] Direct page-prompt ("AI: maak landing page voor product-launch met persona X") genereert valid Puck-data-tree met 5-8 components en F-VAL judge ≥ 70
- [ ] Branddock's eigen `marketing-site-pricing` pagina gebouwd via deze builder als dogfooding-bewijs
- [ ] `npx tsc --noEmit` 0 errors
- [ ] `npm run lint` 0 errors
- [ ] Smoke-test: 5 web-page types × 2 workspaces (Better Brands + LINFI) = 10 pages, alle publish + render correct
- [ ] Smoke-test: 3 non-web content-types (linkedin-post, blog-article, instagram-post) — alle bestaande previews ongewijzigd (0 regressie)
- [ ] Bundle-size: editor-route ≤ 350 KB JS gzipped (lazy-loaded vanaf Step 3), publieke render-route ≤ 100 KB JS gzipped
- [ ] Docs: changelog entry + ADR-cross-link + README onder `src/features/campaigns/components/canvas/medium/` met "hoe voeg ik een nieuw Puck-component toe"

# Phases (gefaseerd, incrementeel mergeable)

## Phase 1 — Foundation (~1 wk)

**Scope**:
- Prisma `LandingPage` model + `DomainMapping` model (laatste leeg voor v2, schema-only)
- Migratie + seed-script test (`npx prisma db push` + smoke insert/query)
- Uitbreiding `preview-map.ts` — alle 5 web-page types via `CONTENT_TYPE_PREVIEW_OVERRIDE` (uit spike, niet meer alleen `landing-page`)
- Verhuis spike-code uit `branddock-spike-puck-canvas` worktree naar productie-paden — vervang spike-bestandsnamen door definitieve naam (`spike-*` prefix weghalen)
- `useCanvasStore` — formele `puckData` slice met debounced auto-save via bestaande Canvas API PATCH-flow (`/api/studio/[id]/canvas` of nieuwe `/api/landing-pages/[id]/save`)
- Bug-report bij Puck voor `external` field-typing-issue (uit spike A1)

**Phase-1 acceptatie**:
- [ ] Prisma migratie groen, `LandingPage` queryable
- [ ] 5 web-page types tonen `PuckPageBuilder` in Step 3
- [ ] Auto-save naar `deliverable.settings.puckData` werkt, hydratatie bij re-mount werkt
- [ ] 0 regressie op overige content-types

## Phase 2 — Brand-aware components (~2 wk)

**Scope**:
- 8 React-component definities in productie-config (extractie uit spike `BrandHero` + `BrandCTA`):
  1. `BrandHero` — full-width hero, BrandStyle.primaryColor + headingFont
  2. `BrandCTA` — call-to-action button in brand-tone
  3. `FeatureGrid` — 2/3/4-kolom layout met icons + brand-typography
  4. `Testimonial` — quote met persona-referentie + foto
  5. `PricingTable` — 2/3-kolom pricing-card
  6. `FAQ` — collapsible accordion
  7. `Footer` — workspace-brand-logo + social-links
  8. `RichText` — Markdown-based content-block (TipTap of native Puck rich text)
- **Structurele BrandStyle consumptie** (vervangt spike free-text regex-parsing van `brandColors`/`brandFonts`): direct uit `Brandstyle` Prisma-record via `CanvasContextStack.brand` extension, of nieuwe `brandTokens` veld op `BrandContextBlock`
- Brand-token-extractie als aparte util (`extractBrandTokens(brand): { primaryHex, secondaryHex, headingFont, bodyFont }`) — testable in isolation
- 8 component-types in `spike-puck-config.tsx` rename → `puck-config.tsx`

**Phase-2 acceptatie**:
- [ ] Alle 8 components renderen correct met brand-tokens van Better Brands + LINFI workspaces
- [ ] BrandStyle Prisma-record wordt structureel gelezen (geen free-text parsing)
- [ ] Brand-token-extractie utility ≥ 90% test-coverage (unit tests)

## Phase 3 — Per-type templates (~0.5 wk)

**Scope**:
- 5 hand-gemaakte Puck-data-trees als startpunt per type, opgeslagen als TypeScript-modules:
  - `landing-page-template.ts`: hero + features + CTA + FAQ + footer
  - `product-page-template.ts`: hero + features + pricing + testimonials + CTA
  - `faq-page-template.ts`: hero + accordion + CTA
  - `comparison-page-template.ts`: hero + comparison-table + features + CTA
  - `microsite-template.ts`: hero + 3 content-sections + footer
- `variantToPuckData()` uitgebreid: gebruikt type-specifiek template als skeleton, vult component-props met Step 2 variant-content waar mogelijk
- 5 hand-fixtures voor variant-mapper tests (1 per type)

**Phase-3 acceptatie**:
- [ ] Elke 5 types levert correct template bij eerste mount zonder Step 2 variants
- [ ] `variantToPuckData()` fixtures: ≥ 4 van 5 zonder structural changes published
- [ ] Type-specifieke templates docs: hoe voeg ik een 6e type toe

## Phase 4 — Publish-laag (~1 wk)

**Scope**:
- Middleware-routing in `src/middleware.ts` voor `<workspace>.branddock.app/<slug>` subdomain-pattern
- Publish-API: `POST /api/landing-pages/publish { deliverableId, slug }` — schrijft snapshot van `deliverable.settings.puckData` naar `LandingPage.puckData`, `status = PUBLISHED`
- ISR-cached render-route `/p/[slug]` via Next.js App Router met `revalidatePath` on-publish
- Public render: `<Render config={brandAwareConfig(workspace)} data={LandingPage.puckData} />`
- Export-step uitbreiding: nieuwe "Publiceer als webpagina" actie naast bestaande PDF/Markdown export
- Cache invalidation pattern: `invalidateCache(cacheKeys.prefixes.LANDING_PAGES(workspaceId))` per CLAUDE.md API conventies

**Phase-4 acceptatie**:
- [ ] Publish-API werkt: nieuwe `LandingPage` record na publish-click
- [ ] Subdomain-routing werkt: `<workspace>.branddock.app/test-slug` toont gepubliceerde page
- [ ] TTFB ≤ 200ms cold (Vercel Analytics gemeten)
- [ ] Immutable snapshot pattern: deliverable.settings.puckData wijzigen ná publish raakt live URL niet (pas bij re-publish)
- [ ] Cache-invalidation werkt: publish triggert revalidatePath
- [ ] Smoke: publish een page in Better Brands + LINFI workspace, verifieer URL's live

## Phase 5 — Edit-paradigma Laag 2 (component-level AI + diff-preview) (~1.5 wk)

**Scope**:
- Context-menu (rechtsklik op Puck component) met 3-5 AI-acties:
  - "Maak korter"
  - "Schrijf formeler"
  - "Schrijf casualer"
  - "3 alternatieven" (toont carousel-modal)
  - "Match brand-voice strikter"
- API-route `/api/landing-pages/component-edit` — productie-versie van spike's `/api/spike/component-edit` met:
  - Type-registry per component (welke fields zijn text-rewrite, welke zijn config)
  - Brand-context-injectie via `assembleCanvasContext`
  - Defensive validation (don't-shrink guard via per-type minWords, lock-skip)
- Diff-preview modal (productie-versie van spike's `ComponentDiffPreviewModal`):
  - Side-by-side dual-render met `<Render>` × 2
  - Edit-distance badge + > 70% warning-banner
  - Accept/Reject + auto-save trigger
- **Lock-toggle per component** UI: toggle-icoontje in Puck sidebar bij geselecteerde component; state in `puckData.components[id].metadata.locked`

**Phase-5 acceptatie**:
- [ ] Rechtsklik op `<BrandHero>` toont context-menu met 5 AI-acties
- [ ] AI-call respecteert brand-voice tone (gevalideerd op 2 workspaces handmatig)
- [ ] Diff-preview modal opent < 300ms na API-response
- [ ] Lock-toggle werkt: AI-changes slaan locked components over + tonen "🔒 niet gewijzigd" badge in diff-preview
- [ ] Don't-shrink guard: AI-output dat onder minWords komt wordt geweigerd + diagnostic logged

## Phase 6 — Page-level AI (auto-iterate + strict-rewrite + direct prompt) (~1.5 wk)

**Scope**:
- Auto-iterate integratie:
  - `puckDataToAutoIterateInput()` mapper voor data-shape transform
  - Trigger op publish-click of via expliciete "Auto-iterate" knop
  - F-VAL judge op gerenderde HTML (mogelijk prompt-tuning vereist, A9 uit idea-doc)
  - Page-level diff-preview met dual `<Puck.Preview>` panels + per-component accept/reject
- Strict-rewrite endpoint + UI: page-level of selectie-level rewrite met user-prompt
- Direct page-prompt UI:
  - "AI Generate" knop bovenaan editor
  - Modal: "Beschrijf je pagina (bv: product-launch voor persona X)"
  - Backend: prompt → Puck-data-tree (5-8 components) via Anthropic met brand-context-injectie
  - F-VAL judge ≥ 70 gate; bij lager: auto-iterate retry
- Regenerate-from-variants confirm-modal: bij Step 2 navigation + variant-wissel waarschuwt voor visual-edits-verlies

**Phase-6 acceptatie**:
- [ ] Auto-iterate werkt op published page: F-VAL < 70 → diff-preview opent
- [ ] Strict-rewrite werkt: user-prompt → rewrite → diff-preview
- [ ] Direct page-prompt: "Maak landing page voor product-launch met persona X" → valid Puck-tree binnen 30s
- [ ] F-VAL judge ≥ 70 op gegenereerde page (gevalideerd op 3 hand-prompts × 2 workspaces)
- [ ] Regenerate-confirm-modal voorkomt accidental data-verlies

# Bestanden die ik aanraak

> Per-phase: zie sectie "Phases" hierboven. Geaggregeerd:

- `prisma/schema.prisma` — `LandingPage`, `DomainMapping` (lege schema-only voor v2), `PageStatus`, `SslStatus` enums
- `prisma/migrations/...` — Prisma migration
- `src/middleware.ts` — uitbreiding voor `<workspace>.branddock.app` routing
- `src/features/campaigns/components/canvas/medium/`:
  - `PuckPageBuilder.tsx` (uit spike, uitgebreid)
  - `puck-config.tsx` (productie-versie, 8 components)
  - `puck-components/BrandHero.tsx` ... `RichText.tsx` (8 files, splitsen uit config)
  - `puck-templates/landing-page.ts` ... `microsite.ts` (5 templates)
  - `variant-to-puck-data.ts` (uit spike, uitgebreid voor alle 5 types)
  - `ComponentDiffPreviewModal.tsx` (uit spike)
  - `PageDiffPreviewModal.tsx` (nieuw, dual `<Puck.Preview>` panels)
  - `LandingPageContextMenu.tsx` (nieuw, rechtsklik AI-acties)
  - `LockToggle.tsx` (nieuw, sidebar component)
  - `brand-tokens.ts` (extractie util)
- `src/features/campaigns/components/canvas/previews/preview-map.ts` (uitbreiding: 5 types ipv 1 in CONTENT_TYPE_PREVIEW_OVERRIDE)
- `src/features/campaigns/stores/useCanvasStore.ts` (puckData slice, lock-state actions)
- `src/app/api/landing-pages/`:
  - `publish/route.ts`
  - `component-edit/route.ts` (productie-versie spike)
  - `auto-iterate/route.ts` (wrapper rond bestaande `/api/auto-iterate/trigger` met Puck-mapper)
  - `strict-rewrite/route.ts`
  - `generate-page/route.ts` (direct prompt → Puck-tree)
  - `[id]/save/route.ts` (auto-save endpoint)
- `src/app/p/[slug]/page.tsx` — public render-route
- `src/lib/ai/canvas-context.ts` — uitbreiding `BrandContextBlock` met structurele `brandTokens?: { primaryHex; secondaryHex; headingFont; bodyFont }` (Phase 2)
- `src/lib/landing-pages/puck-data-to-auto-iterate-input.ts` (Phase 6)
- `docs/changelog.md` — entries per phase
- `src/features/campaigns/components/canvas/medium/README.md` — "hoe voeg ik een nieuw Puck-component toe"
- `package.json` — `@puckeditor/core` als productie-dep

# Bestanden die ik NIET aanraak

- `src/lib/auto-iterate/edit-distance.ts` — hergebruiken via import, niet wijzigen
- `src/lib/ai/anthropic-client.ts` — hergebruiken via import, niet wijzigen
- Andere 48 non-web-page content-types — geen impact via conditional dispatch
- Bestaande `LandingPagePreview` — blijft bestaan als fallback bij feature-flag-rollback (Phase 1)
- `src/lib/workspace-resolver.ts` — hergebruiken, niet wijzigen
- Vercel Domains API integratie — v2-task `web-page-builder-custom-domains` (apart te schrijven post-MVP)

# Smoke test plan

**Per-phase smoke** in acceptatie-criteria. Pre-merge geaggregeerd:

1. **5 web-page types × 2 workspaces**: open elk type in Better Brands + LINFI, navigeer naar Step 3, verifieer `PuckPageBuilder` rendert met juiste template + brand-tokens. (10 pages totaal)
2. **Publish-flow**: voor elk van de 10 pages, klik "Publiceer als webpagina" → verifieer `LandingPage` record + URL `<workspace>.branddock.app/<slug>` toont page
3. **3 non-web content-types**: open `linkedin-post`, `blog-article`, `instagram-post` deliverables — verifieer bestaande previews ongewijzigd
4. **Edit-paradigma component-level**: rechtsklik op `<BrandHero>` → "Maak korter" → diff-preview opent → Accept werkt + Reject werkt
5. **Lock-toggle**: lock een component, trigger AI-edit, verifieer locked component overgeslagen + badge in diff-preview
6. **Auto-iterate**: page met low-quality content → klik "Auto-iterate" → F-VAL < 70 → page-level diff-preview opent met per-component accept/reject
7. **Direct page-prompt**: lege deliverable → "AI Generate" → "Maak landing page voor product-launch met persona X" → Puck-tree met 5-8 components ingevuld
8. **Bundle-meting**: `npm run build` baseline pre-MVP vs post-MVP, verifieer editor-route delta ≤ 350 KB en render-route delta ≤ 100 KB
9. **TypeScript + lint**: 0 errors over hele MVP-code
10. **Dogfooding**: `marketing-site-pricing` pagina gebouwd via builder

# Risico's

- **F-VAL judge tuning voor HTML-output**: bestaande judge is op Markdown-content getuned; mogelijk lagere scores op gerenderde HTML. Mitigatie: tune-prompt-iteratie in Phase 6, fallback = aparte HTML-judge-variant.
- **Puck `external` field-issue blijft open**: select-fallback werkt voor simpele pickers, maar voor advanced cases (autocomplete persona-search > 50 items) is `external` nodig. Mitigatie: bug-report bij Puck team in Phase 1, fallback = custom field-wrapper bouwen.
- **Dual-render page-level performance**: ≥ 50 components per page kan modal laggen. Mitigatie: memoized statische `<BrandHero>` ipv `<Render>` voor diff-preview, of incremental render per viewport (genoemd in spike-memo).
- **Brand-token-extractie scope-creep**: Phase 2 vereist mogelijk Brandstyle-schema-uitbreiding voor structurele tokens. Mitigatie: gebruik bestaande velden + nieuwe `brandTokens` computed field op `getBrandContext()` zonder schema-migration; bij blokker: aparte mini-task voor Brandstyle-schema-extension.
- **Bundle-size overschrijding**: Puck pulls in tiptap + dnd-kit (heavy). Mitigatie: `dynamic import` voor `PuckPageBuilder`, `ssr: false`, lazy-load alleen op Step 3 mount voor web-page types.
- **Variant→Puck mapper bij type-variatie**: 5 types × veel variant-shapes kan brittle mapper geven. Mitigatie: per-type mapper-functies (`variantToLandingPageData`, `variantToProductPageData`, etc.) met defensive defaults.
- **MVP-effort overschrijding 6-8 wkn**: realistic risico. Mitigatie: phases zijn incrementeel mergeable; bij capacity-knip kan Phase 6 (page-level AI) v2 worden, Phase 1-5 levert al werkbaar MVP.
- **Custom domains in v2 risk**: pilot-klanten willen mogelijk vroeger custom domains. Mitigatie: schema staat klaar (`DomainMapping` in Phase 1), v2-task kan in 1-2 wkn live.

# Out of scope

> Geaggregeerd vanuit idea-doc + post-spike beslissingen:

- **Custom domains** — v2-task `web-page-builder-custom-domains` (Vercel Domains API + CNAME provisioning + SSL monitoring)
- **A/B testing framework** — eigen ADR + task post-MVP
- **Form-builder + CRM-koppeling** — `forms-builder` separate task
- **Smart-content / per-visitor personalization** — post-MVP
- **Email-rendering uit zelfde editor** — `email-builder` separate task
- **Multi-language sites** — gebruikt workspace `contentLocale` default; geen multi-language switching
- **Page-revision-history** — Puck data is JSON-snapshot, v2-feature
- **Page-templates marketplace** — community-templates v2+
- **Webhooks on publish** — v2+
- **Page-level analytics dashboard** — PostHog default volstaat; embed iframe v2
- **Sitemap.xml + Robots.txt customization** — v2+
- **Custom font upload per workspace** — gebruikt BrandStyle.headingFont/bodyFont
- **DNS-provider OAuth integraties** (GoDaddy/Cloudflare/Route53) — v2+
- **Pattern B toepassing op niet-web content-categorieën** (email, social, video) — eigen evaluatie per category, post-MVP
- **Auto-iterate page-level edit-distance display** in dashboard — minimal in MVP, v2 als pilot-feedback dit vraagt

# Notes

**Worktree-strategie**: gebruik `git worktree add ../branddock-feat-web-page-builder-canvas branddock-feat-web-page-builder-canvas` vanuit main. Phases zijn incrementeel mergeable — na elke phase een PR + review + merge naar main vóór volgende phase. Geen long-running feature-branch.

**Spike-code in `branddock-spike-puck-canvas` worktree** blijft bestaan als referentie. MVP-Phase 1 verhuist relevante files (PuckPageBuilder, ComponentDiffPreviewModal, variantToPuckData, puck-config) zonder `spike-*` prefix naar productie-paden. Spike API-routes (`/api/spike/component-edit`) krijgen productie-equivalent (`/api/landing-pages/component-edit`) — spike-route mag verwijderd.

**ADR-cross-referenties**:
- [`docs/adr/2026-05-22-landing-page-builder-architectuur.md`](../docs/adr/2026-05-22-landing-page-builder-architectuur.md) — Pattern B + Puck + Vercel + CNAME (v2)
- [`docs/adr/2026-05-08-competitor-snapshot-historie.md`](../docs/adr/2026-05-08-competitor-snapshot-historie.md) — immutable snapshot pattern (referentie voor LandingPage.puckData snapshot bij publish)
- [`docs/adr/2026-05-12-cron-infra.md`](../docs/adr/2026-05-12-cron-infra.md) — Vercel-vendor-eenvoud lijn (zelfde rationale voor Vercel Domains API in v2)

**Pre-launch interactie**: MVP-werk start NIET vóór pilot-launch tenzij capacity expliciet vrijkomt en pilot-data validating signaal geeft. Bij ongoing pre-launch capaciteit: `marketing-site-pricing` (Track C) gebruikt hand-coded Next.js pages — niet wachten op MVP-builder.

**Decision-trigger v2 (custom domains)**: zodra ≥ 3 pilot-klanten expliciet custom-domain vragen of `marketing-site-pricing` dogfood-pagina onder `branddock.com` ipv `branddock.app/p/<slug>` gewenst is. v2-task spec'en op dat moment.

**Quality-gates** (CLAUDE.md compliance):
- TypeScript strict, geen `any`
- Functies < 50 regels
- Nederlands docs, English code
- JSDoc op exported
- Loading + error states verplicht
- Cache-invalidation na mutaties verplicht
- Lucide React iconen, geen emoji's
- Design tokens via `src/lib/constants/design-tokens.ts`
- Geen `'use client'` zonder noodzaak (Puck-components moeten wel)

**Cross-references**:
- Idea-doc: [`tasks/_drafts/idea-landing-page-builder.md`](_drafts/idea-landing-page-builder.md)
- Spike-task: [`tasks/_drafts/idea-landing-page-builder-spike.md`](_drafts/idea-landing-page-builder-spike.md)
- Spike-memo: [`docs/audits/2026-05-22-landing-page-builder-puck-spike.md`](../docs/audits/2026-05-22-landing-page-builder-puck-spike.md)
- Spike-code referentie (niet-gemerged): worktree `branddock-spike-puck-canvas` (branch `spike-puck-canvas`)
