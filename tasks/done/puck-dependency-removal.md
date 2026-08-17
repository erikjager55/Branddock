---
id: puck-dependency-removal
title: E3 — @puckeditor/core volledig verwijderd (dependency + type-imports + compat-stub)
fase: pre-launch
priority: now
effort: 1-2 dagen (gerealiseerd in 1 sessie, parallel-spoor)
owner: claude-code
status: done
created: 2026-08-12
completed: 2026-08-12
related-adr: docs/adr/2026-08-07-puck-exit-sectie-editor.md (Decision 4)
related-spec: docs/specs/2026-08-07-webpage-builder-verbeterplan.md (§5 Fase B, E3)
worktree: claude/puck-editor-improvement-y9ep4x (gedeelde parallel-branch, geen eigen worktree — multi-engineer spoor met file-ownership per taak)
---

# Probleem

Na E1 (eigen `PageRender` op alle render-call-sites) en E2 (eigen `SectionEditor`
vervangt de `<Puck>`-modal) resteerden alleen nog type-imports en een
overgangs-stub: `import type { Config } from '@puckeditor/core'` in
`puck-config.tsx` (return-annotatie) en `PreviewEditingLayer.tsx` (prop-type),
plus de `PUCK_COMPAT_STUB` (`puck: { renderDropZone, isEditing, dragRef }`) die
`page-render.tsx` nog in elke sectie-props injecteerde. Zolang de dependency in
`package.json` staat betalen we install-gewicht (23 packages), een
supply-chain-oppervlak en de suggestie dat Puck nog ergens runtime draait.

# Voorstel

Laatste stap van de exit-ADR: type-imports omzetten naar de eigen
`SectionLibraryConfig` (E3-voorbereiding, commit d3d5da5 + fix e0f3be6),
compat-stub verwijderen, `npm uninstall @puckeditor/core`, en de vier
scripts die nog Puck-CSS uit `node_modules` lazen saneren. Doel-invariant:
**0 `@puckeditor`-referenties buiten historische comments/docs**.

# Acceptatiecriteria

- [x] `puck-config.tsx` zonder `@puckeditor/core`-import; `buildSpikePuckConfig`
      zonder `Config`-return-annotatie (inference levert het rijkste type — een
      minimale annotatie brak 149 consumer-regels die veld-metadata lezen)
- [x] `PreviewEditingLayer.tsx` prop-type `config: SectionLibraryConfig<SpikePuckProps>`
- [x] `PUCK_COMPAT_STUB` weg uit `page-render.tsx` — render-aanroep is
      `definition.render({ ...props, id: sectionId } as never)`; geen component
      las nog `puck.*` (geverifieerd via grep vóór verwijdering)
- [x] `npm uninstall @puckeditor/core` — 23 packages verwijderd; `package.json`
      en `package-lock.json` bevatten 0 `@puckeditor`-referenties
- [x] Scripts die Puck-CSS uit `node_modules/@puckeditor/core/dist` lazen
      gesaneerd: `scripts/workers/lp-screenshot-worker.tsx` (readPuckRenderCss
      + stale doc-comment weg), `scripts/dev/render-puckdata.tsx`,
      `render-lp-brand.tsx`, `render-lp-screenshot.tsx` (crashten anders op de
      verdwenen dist-map; de CSS stylde alleen Puck-interne classnames die onze
      markup nooit emit — componenten zijn inline-styled)
- [x] Stale `@ts-expect-error` in phase18-smoke vervangen (inference-wijziging
      maakte de suppress overbodig → zelf een tsc-error)
- [x] `medium/README.md` herschreven naar de post-exit-architectuur
      (registry/render/editor/kernel/patterns-kaart + 5-staps component-recept)
- [x] `npx tsc --noEmit` 0 errors
- [x] eslint op alle geraakte files 0 errors
- [x] Smokes groen: phase2 (registry-render), phase46 (render-consistentie +
      registry-sync, herwerkt Puck-vrij), phase47/48 (kernel/preview-edit),
      phase51 (static-compile — page-render gewijzigd), phase53 (editor),
      phase54 (patterns)

# Bestanden die ik aanraak

- `package.json` + `package-lock.json` (uninstall)
- `src/features/campaigns/components/canvas/medium/puck-config.tsx`
- `src/features/campaigns/components/canvas/medium/PreviewEditingLayer.tsx`
- `src/features/campaigns/components/canvas/medium/README.md`
- `src/lib/landing-pages/page-render.tsx` (stub-verwijdering)
- `src/lib/landing-pages/section-config.ts` (nieuw — E3-voorbereiding, al gecommit)
- `scripts/workers/lp-screenshot-worker.tsx`
- `scripts/dev/render-puckdata.tsx` + `render-lp-brand.tsx` + `render-lp-screenshot.tsx`
- `scripts/smoke-tests/web-page-builder-phase18-brand-hero-emergent.ts` (stale suppress)
- `tasks/done/puck-dependency-removal.md`

# Bestanden die ik NIET aanraak

- Sectie-componenten in `puck-config.tsx` zelf (alleen de imports/annotatie —
  geen render-wijzigingen; phase2 bewaakt alle 22 componenten)
- `section-edit-tools.ts`, `static-compile.ts`, `publish*`, `claw/**`
- Gedeelde hotspot-files (`roadmap.md`, `docs/changelog.md`, `gotchas.md`,
  `CLAUDE.md`) — parallel-sessie-afspraak
- Bestandsnamen met "puck" erin (`puck-config.tsx`, `puckData`, e.d.) —
  bewust historisch gehouden; hernoemen is churn zonder gedragswinst en zou
  parallelle sessies breken (ADR-notitie)

# Smoke test plan

1. `npx tsc --noEmit` → 0 errors (bewijst dat geen enkel bestand nog
   `@puckeditor/core` importeert — de module bestaat niet meer)
2. `npx tsx scripts/smoke-tests/web-page-builder-phase2.ts` → 77 pass
   (alle 22 componenten renderen zonder Puck in node_modules)
3. phase46 (herwerkt: zelfconsistentie + registry-sync) → 27 pass
4. phase47/48 (kernel + preview-edit) → groen
5. phase51 (static-compile; raakt page-render) → 8 pass
6. phase53 (editor-model) + phase54 (patterns) → groen
7. `grep -r '@puckeditor' src/ scripts/ package.json package-lock.json` →
   alleen historische comments (page-data.ts, puck-data-flatten.ts,
   section-editor-model.ts, README.md) — geen imports, geen paths

# Risico's

- **Verborgen runtime-lezers van `node_modules/@puckeditor`** → gevonden via
  grep: 4 scripts lazen Puck-CSS; gesaneerd (zie acceptatiecriteria). De
  screenshot-worker degradeerde al stil (try/catch → lege string) — visueel
  een no-op omdat de CSS alleen Puck-classnames stylde.
- **`Config`-annotatie droppen verandert het afgeleide type** → bewust: de
  smallere eigen annotatie brak 149 regels; inference behoudt de rijke
  veld-metadata die SectionPropsPanel/section-editor-model lezen. phase53
  bewaakt het paneel-model.
- **Toekomstige `npm install` haalt Puck niet meer binnen** → precies de
  bedoeling; de screenshotter en `/p/*` draaien op de eigen stack.

# Out of scope

- Hernoemen van "puck"-bestandsnamen/het `puckData`-veld (settings-key is
  gepersisteerde data — migratie zonder winst)
- Verwijderen van historische comments die de exit documenteren
- C-spoor (patterns) en P-spoor (publish) — eigen taken

# Notes / besluiten

- **Inference boven annotatie** voor `buildSpikePuckConfig`: de eigen
  `SectionLibraryConfig` is bewust minimaal-structureel (consumenten-contract:
  alleen `render` + `type`/`label` op fields). De registry-bouwfunctie zelf
  annoteren met dat type gooit de rijke literal-informatie weg waar het
  props-paneel op draait — les van de e0f3be6-fix, nu structureel opgelost.
- **`as never` op de render-aanroep**: elke registratie heeft z'n eigen
  props-type; `never` is de enige parameter waar élke functie contravariant
  aan toewijsbaar is zonder `any`. De loop cast bij de aanroep — de registry
  blijft de type-eigenaar (zelfde patroon als `PageRenderConfig`).
- **Puck-CSS bleek al dood gewicht**: byte-parity-analyse (phase46-historie,
  dist/chunk-YXFTA2VL.mjs) toonde dat Puck's `<Render>` één kale `<div>`
  emitte; de Render-CSS raakte onze inline-gestylede componenten nooit.
- Doel-invariant geverifieerd op commit-moment: 0 hits buiten
  comments/docs/task-files.
