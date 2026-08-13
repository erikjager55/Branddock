---
id: section-editor-own
title: E2 — eigen fullscreen sectie-editor vervangt de <Puck>-modal
fase: pre-launch
priority: now
effort: 4-6 dagen (gerealiseerd in 1 sessie, parallel-spoor)
owner: claude-code
status: done
created: 2026-08-12
completed: 2026-08-12
related-adr: docs/adr/2026-08-07-puck-exit-sectie-editor.md (Decision 3)
related-spec: docs/specs/2026-08-07-webpage-builder-verbeterplan.md (§5 Fase B, E2)
worktree: claude/puck-editor-improvement-y9ep4x (gedeelde parallel-branch, geen eigen worktree — multi-engineer spoor met file-ownership per taak)
---

# Probleem

De fullscreen "Bewerk layout"-modal draaide nog op `<Puck>` uit `@puckeditor/core` — de laatste runtime-editor-usage van de dependency. De exit-ADR (2026-08-07) besluit tot een eigen sectie-editor: het Puck-interactiemodel past niet bij prompt-first, de workaround-stapel (z-index-portal, `--puck-color-azure`-remap, `_PuckLayout_`-height-hack, body-mirror-gotcha) is structurele frictie, en een generieke drag-drop-editor dwingt de per-type W-regels (verplichte secties) niet af.

# Voorstel

Eigen fullscreen `SectionEditor` (drie kolommen: sectie-lijst / live `<PageRender>`-preview / props-paneel) op het ongewijzigde JSON-datamodel, met álle structurele mutaties door de bestaande `section-edit-tools`-kernel (guards = één waarheid). Undo/redo-snapshotstack + viewport-toggle. `PuckPageBuilder` opent de nieuwe editor; de `FullscreenEditorModal` + het `<Puck>`-gebruik + `puck.css` + de workaround-stapel verdwijnen uit dat bestand.

# Acceptatiecriteria

- [x] "Bewerk layout" opent de eigen `SectionEditor` (portal, max z-index, Branddock-topbar met "Editor sluiten")
- [x] Links: sectie-lijst met type-label + eerste tekstregel, actieve sectie gemarkeerd, reorder via pijlen ÉN native HTML5 drag-and-drop, dupliceer/verwijder via kernel-guards met zichtbare weiger-redenen, "Sectie toevoegen" met alle 18 `SECTION_TYPE_IDS` (NL-labels) + default-props
- [x] Midden: live `<PageRender>` (markers aan), klik-op-sectie selecteert (event-delegation op `data-section-id`), selectie-ring, links inert
- [x] Rechts: props-paneel gerenderd uit de `fields`-metadata (text/textarea/select/radio/number/array incl. genest/custom→PuckImageField); gelockte sectie read-only + melding
- [x] Undo/redo: snapshot-stack max 50, knoppen + Cmd/Ctrl+Z en Shift+Cmd/Ctrl+Z
- [x] Viewport-toggle desktop/768px/375px
- [x] `PuckPageBuilder.tsx` zonder `@puckeditor/core`-import, zonder `puck.css`, zonder azure-remaps/height-hacks/body-overflow-effect
- [x] i18n en+nl (`pageBuilder.editor.*`; verwijder-weigering hergebruikt `sectionRemove*`-keys)
- [x] `npx tsc --noEmit` 0 errors
- [x] `npm run lint` (eslint op geraakte files) 0 errors
- [x] Smoke-test uitgevoerd: phase53-section-editor groen (44 asserts) + phase46/47/47b/48/48b blijven groen

# Bestanden die ik aanraak

- `src/features/campaigns/components/canvas/medium/SectionEditor.tsx` (nieuw)
- `src/features/campaigns/components/canvas/medium/SectionPropsPanel.tsx` (nieuw)
- `src/features/campaigns/components/canvas/medium/section-editor-model.ts` (nieuw, hook-vrij — smoke-doel)
- `src/features/campaigns/components/canvas/medium/PuckPageBuilder.tsx` (modal-swap + Puck-sanering)
- `src/lib/ui-i18n/locales/en/campaigns-canvas-medium.ts` + `nl/campaigns-canvas-medium.ts`
- `scripts/smoke-tests/web-page-builder-phase53-section-editor.ts` (nieuw)
- `tasks/section-editor-own.md`

# Bestanden die ik NIET aanraak

- `src/lib/landing-pages/section-edit-tools.ts` — kernel alleen consumeren
- `PreviewEditingLayer.tsx` — alleen gelezen (patronen hergebruikt)
- `package.json` (smoke NIET geregistreerd — gedeeld bestand, parallel engineer), `prisma/**`, `static-compile.ts`, `publish*`, `/api/f`, `/api/t`, `LandingPageGenerateBlock`, `generate-structured-variant`, `claw/**`
- E3 (volledige `@puckeditor`-dependency-verwijdering incl. type-imports elders) — andere taak

# Smoke test plan

1. `npx tsx scripts/smoke-tests/web-page-builder-phase53-section-editor.ts` → 44 pass (lijst-labels, veld-labels, paneel-model incl. array-in-array + custom, factory-dispatch + registry-fallback, drag-drop→kernel-moves incl. echte kernel-integratie, viewport-presets)
2. Regressie: phase46 (pagerender-parity), phase47 (section-edit-tools + usage-filter), phase48 (preview-editing + observed-pairings) → allemaal groen
3. Handmatig (verwacht gedrag): Step 3 → "Bewerk layout" → fullscreen 3-koloms editor; sectie slepen of pijlen → volgorde verandert live in preview; laatste BrandHero verwijderen → inline rode weigering; sectie toevoegen → verschijnt ná selectie met placeholder-copy; tekst typen in paneel → live preview + één undo-stap per typ-burst; Cmd+Z herstelt; tablet/mobiel-knop versmalt de preview; gelockte sectie → paneel read-only + amber melding; ESC sluit (drawer eerst)

# Risico's

- **Undo per toetsaanslag zou de 50-stack fluten** → gemitigeerd met commit-coalescing (zelfde sectie+veld binnen 1s deelt één snapshot; undo/redo breekt de burst zodat geen tussentoestand verloren gaat)
- **Native DnD minder rijk dan dnd-kit** → platte lijst, klein oppervlak; pijlen blijven als deterministisch alternatief; drop vertaalt naar kernel-moves (alles-of-niets)
- **Registry-defaultProps delen referenties bij dubbel toevoegen** → `addDefaultsForType` deep-cloned de fallback
- **Ctrl+Z-conflict met native input-undo** → editable targets overgeslagen (native undo wint in het veld zelf)

# Out of scope

- Restore-forward-checkpoints per AI-mutatie (leeft in de diff-modals van het prompt-pad; zie Notes)
- E3: dependency-verwijdering, CSP-allow rsms.me weg, type-import-swap in overige bestanden
- Pattern-bibliotheek met thumbnails (C-spoor); nu een typelijst met NL-labels
- Preview-schaal via transform (alleen max-width — spec zegt "simpel")

# Notes / besluiten

- **Native HTML5 DnD gekozen (mét pijlen als vangnet)**: een platte verticale lijst is precies het geval waar native `draggable` betrouwbaar genoeg is; drop-semantiek = "dragged sectie landt op de doelindex", vertaald naar 1-staps `move`-operaties (`reorderOperations`) door `applyStructureOperations` — de kernel blijft de enige mutator, geen nieuwe dependency (exit = mínder vendor). Pijlen dekken toetsenbord/precisie.
- **Simpele twee-stacks-undo, geen restore-forward**: elke mutatie in déze editor is een kleine deterministische gebruikersactie; AI-batches (waar checkpoint/restore-forward de markt-standaard is) lopen buiten de editor om via de bestaande diff-preview-modals met accept/reject. Lineaire undo-geschiedenis dekt de sessie; redo wordt geleegd bij een nieuwe edit (standaard-semantiek).
- **Props-commits zijn live** (elke keystroke → `setSectionProps` → bestaand autosave-pad, dat zelf al 1500ms debounced); coalescing houdt de undo-stack betekenisvol.
- **radio→select**: beide config-veldtypes renderen als één native select; optie-waarden behouden hun ruwe type (boolean bij PricingTable/HighlightCards), matching via `String(value)`.
- **Onbekende veld-types worden overgeslagen** in het paneel — geen editor tonen voor iets dat we niet begrijpen kan geen data corrumperen (forward-compat met nieuwere registry).
- **custom-velden roepen de config-eigen `render` aan** → hergebruikt `PuckImageField` exact zoals Puck deed, incl. `readOnly` bij lock; geen hardcoded "welke key is een image"-kennis in de editor.
- **Body-overflow-cleanup-effect en ESC-capture-gotcha's van de oude modal zijn vervallen**: die bestonden om Pucks body→iframe-attribute-mirroring te neutraliseren; er is geen iframe meer. De ESC-guard in `PuckImageField` (capture + stopPropagation) blijft werken met de nieuwe window-listener.
- **`pageBuilder.dragHint`-key verwijderd** (en+nl): enige consumer was de oude modal; vervangen door `pageBuilder.editor.hint`.
- **Smoke bewust NIET in package.json geregistreerd** (gedeeld bestand — parallel engineer bezit het); draaien via `npx tsx`.
- Pre-existing eslint-warning op `PuckPageBuilder.tsx:143` (`set-state-in-effect`, het re-hydrate-effect) stond er al vóór deze taak en valt buiten scope.
- **P3 `LeadForm` landde mid-sessie** (parallel engineer, page-data + puck-config): de editor pikte hem zonder codewijziging op — drawer via `SECTION_TYPE_IDS`, default-props via de registry-fallback, paneel via de fields-metadata (text/textarea/select-met-boolean/array — allemaal gedekt). Alleen het NL/EN-type-label toegevoegd; toekomstige types zonder label vallen terug op de type-id (`defaultValue`).
