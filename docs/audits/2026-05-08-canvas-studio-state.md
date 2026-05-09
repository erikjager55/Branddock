# Audit — Canvas + Studio feitelijke staat

> **Datum**: 2026-05-08
> **Aanleiding**: Specs `docs/specs/content-canvas.md` en `docs/specs/content-studio.md` zijn van 27 maart 2026. Sindsdien zijn er ~12 sprints overheen gegaan. Voor herplanning van per-content-type tweaks + generieke Canvas-verbeteringen moet de feitelijke staat helder zijn.
> **Scope**: Canvas + Studio code, recent merged werk, gap met specs.
> **Out-of-scope**: spec-rewrites, code-wijzigingen, planning van follow-up.

---

## TL;DR

1. **Spec content-canvas.md is grotendeels achterhaald.** Geen enkele Canvas-functie is meer "stub". Alle 5 kernfuncties (orchestrate / components / approval / publish / derive) zijn geïmplementeerd, maar verhuisd naar een andere route-namespace (`/api/studio/[deliverableId]/...` in plaats van `/api/canvas/:campaignId/...`). DeliverableApproval + CanvasLayout Prisma-modellen zijn nooit gebouwd — approval state leeft als string-veld op Deliverable.
2. **Spec content-studio.md (Stap 3 Medium / Stap 4 Planner) is achterhaald.** Beide stappen zijn gebouwd: `Step3GenerateMedium.tsx` en `Step4Timeline.tsx` bestaan en functioneren. Per-content-type weergave werkt via 2 registries (`canvas-flow-registry.ts` + `medium-config-registry.ts`) en 13 platform×format preview-componenten.
3. **Per-item tweak-infrastructuur staat al; gat zit in dekking, niet in fundament.** Medium-config + previews zijn registry-driven en uitbreidbaar. Vraag voor planning is welke content-types nog onvolledige medium-config of ontbrekende preview hebben — niet of het mechanisme moet worden gebouwd.
4. **Recent werk (#226-#237) heeft voornamelijk Studio-laag versterkt** (echte AI, versions, fidelity, voice, QA-gate, drafts, pre-pilot UI-wiring). Canvas-zijde alleen geraakt door #233 (drop-in PublishGate + VersionHistorySidebar in Step4Timeline). Geen breaking changes op canvas-architectuur.

---

## Laag 1 — Recent gemerged (entries #226-#237, 2026-05-07/08)

| # | Task | Canvas/Studio impact | Bestaande spec geraakt? |
|---|---|---|---|
| 226 | studio-content-generation-real-ai | **Studio-routes echt** — generate/regenerate/generate-all met `dispatchTextCompletion` (multi-provider), 6 nieuwe lib-helpers, smoke-test infra | Geen (was bewust uit spec) |
| 227 | content-versioning-crud | Nieuwe namespace `/api/content/[deliverableId]/versions/`, drop-in `VersionHistorySidebar.tsx` in canvas-folder, hooks in studio routes | Geen |
| 228 | auto-trigger-fidelity-scoring | Async `scoreContentFidelity()` na elke AI-version (geabsorbeerd in #227) | Geen |
| 229 | brand-voice-content-integration | Geen nieuwe code — voice via `formatBrandContext()` + AI-judge criterion al gedekt | Geen |
| 230 | content-item-qa-gating | 3 nieuwe routes: `/readiness`, `/publish-with-override`, gates op `/publish` + `/publish-to-channel`; `PublishGate.tsx` drop-in | Approval/publish-flow uit spec geraakt — afwijkende implementatie |
| 231 | posthog-sentry-browser | 5 events live (incl. PublishGate-trio), instrumentation.ts setup | Geen |
| 232 | campaign-drafts-db-backed | wizard/drafts routes + `useDraftAutoSave` + DraftPickerModal; **geen direct Canvas-impact** | Geen |
| 233 | pre-pilot UI-wiring | PublishGate + VersionHistorySidebar gewired in `Step4Timeline.tsx` | Bevestigt: Step 4 bestaat en is integratie-target |
| 234 | content-styling-migratie | `medium-config-registry.ts` uitgebreid (9 categorieën handled, 0 issues per validator) | Direct relevant — Step 3 Medium per content-type |
| 235 | tech-debt-any-types | Pure type-safety; geen functionele Canvas-impact | Geen |
| 236 | bv-wire-w1-full-centroid | Voice-similarity in fidelity-scoring (backend); geen Canvas-UI-impact | Geen |
| 237 | claw-page-awareness | `fill_form_fields` foundation — toekomstig Canvas-write-target, nog niet gewired op Canvas-pages | Geen |

**Brand Control Program (toegevoegd 2026-05-08)**: 4 fasen + 4 voorlopers gepromoot van post-launch naar pre-launch. Phase 0 (`tech-debt-any-types` ✅, `claw-page-awareness` ✅, `bv-wire-w1-full-centroid` ✅) is feitelijk klaar — alleen formele afronding hangt nog. Pilot-start verplaatst van "+/- nu" naar +10-14 weken. **Gevolg voor canvas-planning**: Phase 2 Δ-1 chat-integratie + `canvas-inline-edit-overlays` zijn al gepland binnen Brand Control Program — overlap-risico met "generieke Canvas-verbeteringen" track die we nu willen plannen.

---

## Laag 2 — Code-staat per kernfunctie

### Canvas wizard (in `src/features/campaigns/components/canvas/accordion/`)

| Stap | Component | Regels (medium/) | Status |
|---|---|---|---|
| Step 1 — Review Context | `Step1Context.tsx` | — | **built** |
| Step 2 — Content Variants | `Step2ContentVariants.tsx` | — | **built** |
| Step 3 — Medium | `Step3GenerateMedium.tsx` (+ 11 medium-componenten, 2123 regels) | 11 sub-componenten | **built** |
| Step 4 — Timeline | `Step4Timeline.tsx` (+ PublishGate + VersionHistorySidebar gewired) | — | **built** |

**Flow-registry**: `src/features/campaigns/constants/canvas-flow-registry.ts` definieert per `MediumCategory` de zichtbare stappen + componenten. Default flow = 4 stappen (context/variants/medium/planner). HorizontalAccordion leest registry — **per-medium-category divergerende flows zijn al voorzien in architectuur**.

### Canvas-componenten (totaal in `components/canvas/`)

| Subdirectory | Files | Regels | Doel |
|---|---|---|---|
| `accordion/` | 6 | — | 4 wizard-stappen + HorizontalAccordion + VerticalTab |
| `medium/` | 11 | 2123 | Step 3 config-panels per medium-type (Video/WebPage/Generic + helpers) |
| `previews/` | 18 | 2994 | Platform×format previews (LinkedIn / Instagram / Facebook / X / TikTok / YouTube / Email / Podcast / Landing / Generic) + `preview-map.ts` registry |
| `insert-image/` | n.b. | — | Image-insert modal flow |
| top-level | 22 | — | Shared canvas widgets (CanvasPage, PreviewPanel, FidelityScoreBar, PublishGate, VersionHistorySidebar, InlineEditor, FeedbackBar, etc.) |

**Preview-registry** (`previews/preview-map.ts`): platform → format → `{component, label}`. Dekking nu: linkedin (organic-post / ad / carousel), instagram (feed-post / carousel), email (newsletter / promotional), tiktok (video / story), youtube (short / video), facebook, x, generic, landing-page, podcast, video. **Onbekend**: hoeveel van de 53 testplan-content-types via deze map dekking krijgen via `GenericPreview` fallback.

### Studio API routes (`src/app/api/studio/[deliverableId]/`)

31 routes — geen enkele stub:

**Generation**: `/route` (CRUD), `/generate-visual`, `/generate-visual-trained`, `/generate-visual-compose`, `/generate-video`, `/generate-voiceover`, `/compose-video`, `/hero-image`, `/select-library-visual`, `/vanilla-baseline`, `/inline-transform`, `/strict-rewrite/apply`

**Components**: `/components` (GET), `/components/initialize`, `/components/[componentId]/{generate,regenerate,approve,persona-check,consistency-check}`, `/components/generate-all`, `/components/progress`

**Orchestration & meta**: `/orchestrate` (171L), `/derive` (82L), `/context`, `/readiness`, `/tone-check`

**Approval & publish**: `/approval` (166L), `/publish` (168L, met fidelity-gate), `/publish-with-override`, `/publish-to-channel`

### Canvas API routes (`src/app/api/campaigns/[id]/canvas/`)

Alleen 3 bulk-acties: `bulk-approve` (128L), `bulk-publish`, `export` (80L). **Geen `/api/canvas/:campaignId/orchestrate` zoals spec claimde** — die functionaliteit zit per-deliverable in `/api/studio/[id]/orchestrate`.

### Stores + hooks + clients

| Type | File | Regels | Doel |
|---|---|---|---|
| Store | `useCanvasStore.ts` | 985 | Wizard-state per deliverable |
| Store | `useContentCanvasStore.ts` | 33 | **Apart** — bulk-selection voor grid/timeline view (geen duplicate) |
| Store | `useCampaignWizardStore.ts` | n.b. | Campagne-wizard (5-step setup → knowledge → strategy → concept → content) |
| API client | `canvas.api.ts` | 345 | Per-deliverable canvas-acties |
| API client | `content-canvas.api.ts` | 77 | Bulk + grid/timeline-niveau |
| Hooks | `canvas.hooks.ts`, `content-canvas.hooks.ts`, `useCanvasOrchestration`, `useCanvasContextItems`, `useDraftAutoSave`, `useVanillaBaseline`, `useBulkGenerate`, `useVideoGeneration`, `content-versions.hooks`, `content-readiness.hooks`, `useEnsureWizardWorkspace` | — | 11 canvas-gerelateerde hook-files |

**Geen duplicate code** — twee canvas-stores en twee canvas-api-files dekken verschillende lagen (per-deliverable wizard vs. multi-deliverable bulk).

---

## Laag 3 — Gap-tabel: spec claim vs. code-realiteit

### `docs/specs/content-canvas.md`

| Spec-claim | Reality | Gap |
|---|---|---|
| 5 kernfuncties als stubs onder `/api/canvas/:campaignId/...` | Routes leven in `/api/studio/[deliverableId]/...` (per-deliverable) + 3 bulk-acties in `/api/campaigns/[id]/canvas/` | **Spec achterhaald** — 0 stubs over, andere namespace |
| Nieuw model `DeliverableApproval` | Niet gebouwd — vervangen door `Deliverable.approvalStatus String` (DRAFT/IN_REVIEW/CHANGES_REQUESTED/APPROVED/SCHEDULED/PUBLISHED) | Spec achterhaald — eenvoudigere modellering gekozen |
| Nieuw model `CanvasLayout` (Json layout per campagne) | Niet gebouwd | Genegeerd in praktijk — board-view zoals beschreven bestaat niet |
| `DeliverableStatus` enum uitbreiden naar 8 waarden | Enum heeft nog steeds 3 waarden (NOT_STARTED/IN_PROGRESS/COMPLETED). Status-rijkdom leeft op `approvalStatus` veld | Spec achterhaald |
| Board-weergave per status-kolom (CampaignCanvasPage) | Geen aparte board-view; canvas leeft binnen wizard-accordion + Content Library biedt grid/timeline | **Niet gebouwd, maar ook niet gemist?** Vraag voor Erik |
| ApprovalPanel + DeriveModal + PublishPanel UI | DeriveModal niet gevonden in components/canvas/; approval logic via `/approval` route + bulk-approve; publish via PublishGate uit #230 | Partial — DeriveModal mogelijk niet UI-gewired |
| Resend e-mailnotificaties (Fase D) | Niet ingebouwd | Genegeerd voor pilot |

### `docs/specs/content-studio.md` (Tab 3 Medium + Tab 4 Planner)

| Spec-claim | Reality | Gap |
|---|---|---|
| Stap 3 Medium "ontbreekt — SPEC HIERONDER" | `Step3GenerateMedium.tsx` + 11 medium-componenten gebouwd | **Spec achterhaald** — Medium-stap is gebouwd |
| Stap 4 Planner "ontbreekt" | `Step4Timeline.tsx` gebouwd, met PublishGate + VersionHistorySidebar gewired | **Spec achterhaald** — Planner-stap is gebouwd |
| Medium-aware (TikTok video als voorbeeld) | Implementatie via `medium-config-registry.ts` + `canvas-flow-registry.ts` per `MediumCategory` | Gerealiseerd via registry-pattern (afwijkend van spec) |
| Per-medium tool-set + weergave | 11 medium-componenten + 13+ platform×format previews | Infrastructuur staat; **vraag is dekking per content-type, niet aanwezigheid** |

### Generieke Canvas-verbeter-tracks

| Track | Locatie | Status | Risico op overlap |
|---|---|---|---|
| `canvas-inline-edit-overlays` | `tasks/canvas-inline-edit-overlays.md` | Verplaatst naar Brand Control Program Phase 2 (2026-05-08) | **Hoog** — overlap met "generieke verbeteringen" die Erik wil plannen |
| `power-user-shortcuts` | `tasks/power-user-shortcuts.md` | NEXT post-launch, 1-2 dagen, 5 micro-optimalisaties | **Middel** — kan binnen generieke verbeteringen landen |
| `studio-siblings-context-variation` | NEXT post-launch | ½-1 dag | Laag — content-engine, niet UI |
| `Δ-1 Content Review` (Brand Control Program Phase 2) | Idea-doc | task-files volgen | **Hoog** — 3 surfaces (Brand Alignment Tab 3 + Brand Assistant chat-tool + PublishGate) raken Canvas |
| `Δ-4 PublishGate 2nd-opinion` (Brand Control Program Phase 2) | Idea-doc | task-files volgen | **Hoog** — bouwt verder op #230 PublishGate |

---

## Open vragen voor Erik (vóór planning per-item tweaks + generieke verbeteringen)

1. **Wat bedoel je precies met "per-item canvas tweaks"?** Drie mogelijke duidingen, kies of voeg toe:
   - (a) **Medium-config gaten** — bepaalde content-types hebben onvolledige Step 3 Medium-config (bv. salesAngle ontbrak vóór #234 voor sales-content)
   - (b) **Preview-dekking** — content-types die nu via `GenericPreview` fallback krijgen, terwijl ze een platform-specifieke preview verdienen
   - (c) **Flow-divergentie** — content-types waar de 4-step default-flow logisch zou moeten afwijken (bv. podcast skipt visuele preview, blog skipt scene-editor)
   - (d) **Iets anders** — bv. UX-tweaks per content-type, copy-instructies, validatie-regels per type

2. **Lijst je generieke verbeteringen** — graag concreet (bullets, korte beschrijving). Dan map ik tegen:
   - `canvas-inline-edit-overlays` (Brand Control Program Phase 2)
   - `power-user-shortcuts` (NEXT post-launch)
   - Δ-1 Content Review surfaces (Brand Control Program Phase 2)
   Om dubbel werk te voorkomen.

3. **Spec-onderhoud**: wil je `docs/specs/content-canvas.md` + `content-studio.md` herschrijven naar feitelijke staat (1-2 dagen werk, aparte task), archiveren, of laten staan als "historische snapshot"?

4. **Canvas board-view**: spec beschreef een aparte CampaignCanvasPage met status-kolommen. Die bestaat niet. Is dat (a) overruled door de wizard-flow + Content Library grid/timeline, (b) toch gemist en alsnog te bouwen, of (c) parkeren?

5. **DeriveModal**: spec beschrijft afleiden naar ander content-type (LinkedIn → X-post). API-route `/derive` bestaat (82L), maar UI-modal niet evident in components/canvas/. Is dit een gat of leeft de UI elders (bv. in Content Library `RepeatSplitButton`)?

---

## Verzamelpunt voor follow-up taken (placeholders)

Na beantwoording vragen → geconsolideerd plan met deze structuur (niet nu aanmaken, alleen scope-vooruitkijk):

- **`canvas-per-item-tweaks-plan`** — per-content-type tweaks. Sub-scope volgt uit antwoord op vraag 1.
- **`canvas-generic-improvements-plan`** — generieke verbeteringen. Geconsolideerd met `canvas-inline-edit-overlays` + relevante delen `power-user-shortcuts` + Δ-1 surfaces om overlap te elimineren.
- **`canvas-spec-rewrite`** *(optioneel, afhankelijk vraag 3)* — vervangt 27-maart specs door huidige werkelijkheid.

---

## Bronnen geraadpleegd

- `docs/changelog.md` entries #222-#237
- `tasks/done/*.md` (16 files)
- `docs/specs/content-canvas.md`, `docs/specs/content-studio.md`
- `prisma/schema.prisma` (regels 991, 1038, 1346)
- `src/features/campaigns/components/canvas/**` (~60 files)
- `src/app/api/studio/[deliverableId]/**` (31 routes)
- `src/app/api/campaigns/[id]/canvas/**` (3 routes)
- `src/features/campaigns/constants/canvas-flow-registry.ts`, `medium-config-registry.ts`
- Roadmap pre-launch sectie + Brand Control Program (2026-05-08)
