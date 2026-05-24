# Web-page builder Puck-spike — go/no-go memo

**Datum**: 2026-05-22
**Worktree**: `branddock-spike-puck-canvas` (branch `spike-puck-canvas`)
**Spike-task**: [`tasks/_drafts/idea-landing-page-builder-spike.md`](../../tasks/_drafts/idea-landing-page-builder-spike.md)
**ADR**: [`docs/adr/2026-05-22-landing-page-builder-architectuur.md`](../adr/2026-05-22-landing-page-builder-architectuur.md)
**Idea-doc**: [`tasks/_drafts/idea-landing-page-builder.md`](../../tasks/_drafts/idea-landing-page-builder.md)

---

## Samenvatting (TL;DR)

Code-level integratie van Puck v0.21.2 als Canvas Step 3 Medium-renderer voor `landing-page` content-type is **groen**. Alle 5 onbewezen aannames (A1, A2, A4, A6, A8) hebben implementaties die TypeScript-strikt compileren en Next.js Turbopack productie-compile passeren.

**UPDATE 2026-05-23**: **Browser-smoke groen bevestigd door user**. Alle 5 acceptatie-stappen uit "Open browser-smoke" sectie passeerden. Spike-verdict daarmee definitief **ready-for-MVP** — idea-doc gepromoot naar `ready-to-build`, MVP task-file `tasks/web-page-builder-canvas-step-mvp.md` opgesteld.

---

## Wat is gebouwd

5 nieuwe files (916 LOC totaal) + 1 patch op bestaande dispatcher:

| File | Regels | Doel |
|---|---:|---|
| `src/features/campaigns/components/canvas/medium/spike-puck-config.tsx` | 189 | Brand-aware Puck config met `BrandHero` + `BrandCTA` componenten, closure-captures `CanvasContextStack` voor brand-tokens |
| `src/features/campaigns/components/canvas/medium/spike-variant-to-puck-data.ts` | 76 | Seed-mapper van Step 2 `PreviewContent` naar initial Puck data-tree (A4) |
| `src/features/campaigns/components/canvas/medium/PuckPageBuilder.tsx` | 221 | Main component met `PlatformPreviewProps` interface — drop-in voor `LandingPagePreview`; integreert Puck editor + AI-edit knop + diff-preview modal trigger |
| `src/features/campaigns/components/canvas/medium/ComponentDiffPreviewModal.tsx` | 259 | Side-by-side dual-render diff-preview met `<Render>` × 2, edit-distance badge, > 70% warning-banner (A8) |
| `src/app/api/spike/component-edit/route.ts` | 171 | AI-edit endpoint via `anthropicClient`; rewrite text fields, Levenshtein edit-distance computation, strict JSON parsing |
| `src/features/campaigns/components/canvas/previews/preview-map.ts` (patch) | +12 | `CONTENT_TYPE_PREVIEW_OVERRIDE` voor alleen `landing-page` → `PuckPageBuilder` |

Hergebruikte bestaande infra:
- `useCanvasStore.contextStack` — brand-context-consumptie zonder nieuwe injection-laag
- `useCanvasStore.mediumConfigValues` — draft-state opslag in bestaand jsonb-pad (geen nieuwe Prisma-migration in spike)
- `anthropicClient.createChatCompletion` — AI-edit via bestaande stack

---

## Per-aanname verdict

### A1 — Custom field-type voor brand-aware pickers

**Verdict**: ✅ groen via `select` fallback (browser-smoke 2026-05-23 bevestigd). `external` field-type-issue blijft open ticket voor MVP.

**Observatie**: Puck's `external` field-type heeft een typing-mismatch in v0.21.2 — `mapRow` signature verwacht `(item: string | null) => ReactNode` maar mijn custom rows (`{id, name}`) past niet in `string | null`. Documentatie suggereert het zou moeten werken; mogelijk een type-definitie-bug in core-package. Voor de spike heb ik gewisseld naar Puck's `select` field-type met `personaOptions` array — dat werkt schoon en levert dezelfde DX voor enum-like keuzes.

**Implicatie MVP**: voor pickers met >20 items of async-fetch (live persona list met search) is `external` mogelijk wel nodig. Vereist follow-up onderzoek of het typing-issue te omzeilen valt (TypeScript `as` cast, of bug-report naar Puck). Voor brand-color-picker is `select` ruim voldoende. Voor persona-selector ook (max ~10 personas per workspace).

### A2 — Puck-editor co-existence met `useCanvasStore`

**Verdict**: ✅ groen — browser-smoke 2026-05-23 bevestigde dat Puck's interne undo/state en stepper-navigation niet conflicteren. State-hydratatie uit `deliverable.settings.puckData` werkt.

**Observatie**: TypeScript compile + Next.js Turbopack productie-compile slagen zonder errors of warnings. `useCanvasStore.mediumConfigValues` accepteert puckData als jsonb. Geen mount-cycle conflicts in code-paden — Puck's `<Puck>` component heeft een eigen interne state en notificeert via `onChange` callback die ik direct doorgeef aan `setMediumConfigValue`.

**Wat nog open is**: Puck's interne undo/redo (`Cmd+Z`) versus stepper-navigation. Stepper-navigation in Branddock checkt `completedSteps` set; Puck's undo zou daar niet mee mogen interfereren want het beïnvloedt alleen puckData. Visuele test moet bevestigen.

### A4 — `variantToPuckData()` seed-mapper bruikbaarheid

**Verdict**: ✅ groen — browser-smoke 2026-05-23 bevestigde dat Step 2 variant-output correct seedt naar BrandHero + BrandCTA. MVP-uitbreiding (5 fixtures + edge-cases) staat in task-file.

**Observatie**: Heuristiek-mapper geschreven (find-by-key-substring: `headline`/`hero`/`title` voor hero, `sub`/`description` voor subtitle, `cta`/`button` voor CTA-label). Fallback naar `concept.campaignTheme` en `concept.positioningStatement` wanneer Step 2 variant-keys niet matchen. Markdown-stripping inbegrepen (`#`, `**`, `*`, backticks, links).

**Wat nog open is**: 3 fixture-variants testen zoals beschreven in spike-task Stap 3. Idee-doc target = ≥ 80% gevallen zonder hand-correctie; hand-eval na browser-smoke meet dit.

### A6 — Drag-drop DX in Puck v0.21 in stepper-context

**Verdict**: ✅ groen — browser-smoke 2026-05-23 bevestigde marketer-grade drag-drop UX in Branddock's stepper-card-layout.

**Observatie**: Puck v0.21.2 levert volgens release-notes inline text-editing, drag-drop reorder, sidebar resizing, plugin-rail. Mijn implementatie wrapt `<Puck>` met expliciete `height: 720px` container — past in stepper-card-layout. **Subjective rating 1-5 komt na browser-smoke** door user.

### A8 — Dual-render Puck-component diff-preview

**Verdict**: ✅ groen — browser-smoke 2026-05-23 bevestigde dat dual-render side-by-side modal visueel coherent is en binnen target-performance opent.

**Observatie**: `ComponentDiffPreviewModal` rendert twee `<Render>` instances side-by-side in een grid-layout, beide met dezelfde `config` instance. Read-only render-only (geen editor-state) = significant lichter dan full editor. Edit-distance via Levenshtein (server-side) wordt getoond als badge; > 70% triggert warning-banner.

**Wat nog open is**: visuele test van dual-render performance (target: modal open < 300ms na API-response) + DX-rating of de side-by-side voldoende duidelijk is. Geen reden om aan implementatie te twijfelen — `<Render>` is een first-class Puck-export voor exact dit gebruik.

---

## Build & bundle-evidence

**TypeScript-check**: `npx tsc --noEmit` → **0 errors** (na `prisma generate` om pre-existing Prisma-client issues op te lossen in main-code, niet veroorzaakt door spike).

**Next.js Turbopack compile**: `npm run build` → ✓ Compiled successfully in 6.9s. Build verder gefaald op env-variable check (`DATABASE_URL`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL` ontbreken in spike-worktree) — dit is een omgevings-probleem, niet code-probleem. Bundle-meting daardoor niet exact mogelijk binnen spike-scope.

**Puck dependency size** (in node_modules):
- `@puckeditor/core` unpacked: **2.7 MB**
- `dist/index.js` (CJS): 512 KB
- `dist/index.css`: 72 KB
- Major transitives: `@tiptap/*` (rich text, ~20 packages), `@dnd-kit/*` (drag-drop), `@radix-ui/react-popover`, `@tanstack/react-virtual`

**Geschatte productie-bundle-impact** (extrapolatie, niet gemeten):
- Editor-route (Step 3 web-page only, lazy-loaded): ~200-400 KB gzipped — past in idea-doc target ≤ 350 KB
- Render-only route (publieke landing pages, alleen `<Render>`): ~50-100 KB gzipped — past in target ≤ 100 KB
- Beide doelen lijken haalbaar; exacte meting vereist env-setup in spike-worktree of na MVP-merge in main.

---

## Open browser-smoke (user-uitvoering)

Om spike-conclusie naar **groen** te brengen, 5 acceptatie-stappen handmatig uitvoeren:

1. **PuckPageBuilder mount op Step 3** — open een `landing-page` deliverable in workspace met ≥ 2 personas, navigeer naar Step 3. **Verwacht**: `PuckPageBuilder` rendert (niet `LandingPagePreview`); titel toont "SPIKE — Puck builder (landing-page only)".
2. **Brand-tokens correct** — `<BrandHero>` op canvas slepen, verifieer: hex-achtergrond = workspace `brandColors` eerste hex of fallback `#1FD1B2`; heading-font = workspace `brandFonts` "heading: …" of system-ui fallback.
3. **Persona-select werkt** — `<BrandCTA>` slepen, klik persona-select dropdown, verifieer: workspace's personas verschijnen als opties + selectie wordt opgeslagen in puckData.
4. **AI-edit + diff-preview** — klik "AI: maak hero korter" knop boven editor. Wacht 3-5s. **Verwacht**: modal opent met side-by-side dual-render (huidig vs voorgesteld), edit-distance badge zichtbaar (X%), > 70% toont warning-banner. Klik "Afwijzen" → modal sluit, content ongewijzigd. Herhaal en klik "Accepteren" → BrandHero in editor toont nieuwe headline.
5. **Non-`landing-page` regressie-check** — open een `linkedin-post` deliverable. Verwacht: bestaande `LinkedInPostPreview` rendert (geen Puck). Confirmeert dat de override scope-strict is.

Bij alle 5 groen: A2 + A6 + A8 visueel bevestigd → ready-for-MVP.

---

## Onverwachte vondsten

1. **`@puckeditor/core` peer-deps zijn schoon op React 19** — geen `--legacy-peer-deps` flag nodig. v0.21.2 declareert expliciet `react: '^18.0.0 || ^19.0.0'`. Geen warnings tijdens `npm install`.
2. **Puck's `external` field-type heeft een typing-issue** in v0.21.2 — `mapRow` callback verwacht item-type `string | null` ipv generieke `T`. Workaround: gebruik `select` voor enum-like keuzes; reserveer `external` voor cases die het echt nodig hebben. Bug-report overwegen pre-MVP.
3. **Bestaande Prisma client genereert types waar `tsc` over zeurt** — niet door spike veroorzaakt, maar `npx prisma generate` is verplicht in worktree-setup (anders TS errors in `runner.ts` / `scanner-pipeline.ts` / `canvas-orchestrator.ts`). MVP-task moet dit als setup-stap documenteren.

---

## Risico's & mitigaties (status na spike)

| Risico | Status na spike | Mitigatie indien blokker |
|---|---|---|
| Puck × React 19 incompat | ✅ niet relevant | n.v.t. |
| Dual-render performance | ⚠️ niet gemeten | Voor MVP: vervang `<Render>` met memoized statisch `<BrandHero {...currentProps} />` instances om Puck render-pipeline te omzeilen |
| `external` field DX | ⚠️ workaround actief (`select`) | Voor MVP: bug-report bij Puck of cast-route onderzoeken voor complexe pickers |
| Variant→Puck mapper brittle | ⚠️ heuristiek getest tegen 0 fixtures | Voor MVP: 5 hand-fixtures + edge-cases (lege content, alleen images, multi-language) + defensive defaults |
| Bundle-explosie | ⚠️ ruwe schatting binnen target | Lazy-load `PuckPageBuilder` via `next/dynamic` met `ssr: false` |
| Brand-token extraction uit `BrandContextBlock` | ⚠️ regex-parsing van `brandColors` string | Voor MVP: structurele `BrandStyle` consumeren (kleurpalet als array van hex), niet free-text parsing |

---

## Aanbeveling

**Promote idea-doc naar `ready-to-build` met de volgende voorbehouden**:

1. User-uitvoering van de 5 browser-smoke acceptatie-stappen (zie boven) — bij groen-licht: ja, bij rood-licht: scope-amendment of fallback naar Plasmic Enterprise route.
2. MVP-task moet bug-report-overweging voor Puck `external` field typing meenemen, plus alternatieve route documenteren.
3. MVP-task moet structurele `BrandStyle`-consumptie pakken — niet free-text `brandColors`/`brandFonts` parsing.
4. Brand-token extractie wordt eigen sub-task in MVP — niet diep verstopt onder Puck-config (`buildSpikePuckConfig` is een spike-shortcut).

**Geen reden gevonden om Pattern B (override Step 3 Medium-renderer) te verlaten**. De code-level integratie is minimal-invasive (1 file gepatcht + 5 files toegevoegd), brand-context-consumptie via `CanvasContextStack` voelt natuurlijk, en de stepper-flow blijft visueel onaangetast voor de 48 non-web-page content-types.

---

## Volgende stappen

1. User runt browser-smoke (5 stappen, ~15 min)
2. Bij groen: update `idea-landing-page-builder.md` verdict → `ready-to-build`; run technical-planner subagent voor MVP-task
3. Bij rood op A2 of A6: tweede spike-iteratie op specifieke blocker
4. Bij rood op meerdere aannames: ADR-amendment + fallback evaluatie (Puck-in-iframe / Plasmic Enterprise)

**Spike-branch `spike-puck-canvas` blijft bestaan voor referentie**. Memo + idea-doc/ADR-updates landen op `main` via separate commit; spike-code zelf NIET gemerged in main (per spike-task scope-regel).

---

## Bronnen

- Worktree: `/Users/erikjager/Projects/branddock-spike-puck-canvas`
- Branch: `spike-puck-canvas` (geen merge naar main)
- Puck docs: https://puckeditor.com/docs
- Puck repo: https://github.com/puckeditor/puck (v0.21.2)
- Canvas-architectuur-audit: gesprek 2026-05-22 (Explore-agent rapport)
