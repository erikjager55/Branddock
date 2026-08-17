---
id: lp-preview-editing
title: Preview-editing Step 3 — inline tekst-edit (A3) + sectie-hover-toolbar met prompt (A4)
fase: pre-launch
priority: now
effort: 4-6 dagen (A3 2-3d + A4 2-3d, gecombineerd uitgevoerd)
owner: claude-code
status: done
created: 2026-08-12
completed: 2026-08-12
related-adr: docs/adr/2026-08-07-puck-exit-sectie-editor.md
related-spec: docs/specs/2026-08-07-webpage-builder-verbeterplan.md
worktree: claude/puck-editor-improvement-y9ep4x
---

# Probleem

De Step 3-preview rendert sinds E1 via de eigen `<PageRender>` met
`data-section-id`-provenance, maar de preview zelf was nog passief: elke
tekstwijziging vereiste de fullscreen Puck-editor en sectie-operaties
(verplaatsen/dupliceren/verwijderen/locken) hadden geen direct UI-pad. De
`component-edit`-route en `ComponentDiffPreviewModal` stonden orphaned sinds de
verwijdering van de oude component-toolbar, en de 4 presets uit
`ai-edit-instructions.ts` hadden geen UI meer (hygiëne-besluit uit het
verbeterplan: preset naast vrij veld).

# Voorstel

Eén interactielaag (`PreviewEditingLayer`) om de bestaande `<PageRender>` heen
in `PuckPageBuilder`:

- **A3 inline tekst-edit**: klik op een tekst-element → exact-match tegen de
  `collectEditableTextFields`-whitelist (gescoped op de sectie-index, met
  occurrence-telling bij identieke waarden) → contentEditable → commit via
  `structuredClone` + `deepSet` + bestaand debounced-autosave-pad.
  Deterministisch, geen AI-call. Pure matching in `preview-edit-matching.ts`.
- **A4 sectie-hover-toolbar**: verplaats/dupliceer/verwijder via de
  `section-edit-tools`-kernel (incl. verplichte-sectie- en lock-guards),
  per-sectie lock-toggle terug, en een "prompt op deze sectie"-popover met
  vrij tekstveld + de 4 preset-chips. Herbedraadt de `component-edit`-route
  (uitgebreid met vrije-tekst-instructie, 3-2000 tekens) en de
  `ComponentDiffPreviewModal` (accept → `setSectionProps`).

# Acceptatiecriteria

- [x] Klik op een uniek tekst-element in de preview maakt het inline bewerkbaar; Enter/blur commit, Escape annuleert; ambiguë matches doen niets
- [x] Links in de preview navigeren nooit weg (preventDefault, ook bij pageLocked)
- [x] Hover over een sectie toont een floating toolbar (top-right van de sectie, herpositioneert op scroll/resize/structurele ops)
- [x] Verwijderen van het laatste verplichte sectie-type of een gelockte sectie toont de vertaalde reden i.p.v. de confirm
- [x] Sectie-prompt (vrij veld + 4 preset-chips) → component-edit-route → diff-modal → accept past props toe via `setSectionProps`; 423 toont vertaalde lock-melding
- [x] Toolbar verborgen bij page-lock; per-sectie lock blokkeert AI-edit én inline edit
- [x] Alle mutaties lopen via `handlePuckChange` (bestaand debounced-autosave-pad; geen nieuwe persistentie)
- [x] Nieuwe strings in EN + NL (`campaigns-canvas-medium.ts`, `pageBuilder.*`)
- [x] `npx tsc --noEmit` 0 errors in eigen files (1 pre-existing error in andermans `WebPagePublishPanel.tsx`)
- [x] `npx eslint` 0 errors op eigen files
- [x] Smoke-test uitgevoerd (phase48-preview-editing groen; phase46+47 blijven groen)

# Bestanden die ik aanraak

- `src/features/campaigns/components/canvas/medium/PreviewEditingLayer.tsx` (nieuw)
- `src/features/campaigns/components/canvas/medium/preview-edit-matching.ts` (nieuw, pure matching)
- `src/features/campaigns/components/canvas/medium/PuckPageBuilder.tsx` (mount + contentType-selector)
- `src/app/api/landing-pages/component-edit/route.ts` (vrije-tekst-instructie + provenance-velden)
- `src/lib/ui-i18n/locales/en/campaigns-canvas-medium.ts` (pageBuilder-keys)
- `src/lib/ui-i18n/locales/nl/campaigns-canvas-medium.ts` (pageBuilder-keys)
- `scripts/smoke-tests/web-page-builder-phase48-preview-editing.ts` (nieuw)
- `package.json` (smoke:web-page-builder-keten)
- `tasks/done/lp-preview-editing.md` (deze file)

# Bestanden die ik NIET aanraak

- `src/lib/landing-pages/section-edit-tools.ts` — de kernel is de enige waarheid, alleen consumeren
- `src/lib/landing-pages/puck-text-fields.ts` / `src/lib/utils/deep-set.ts` — bestaande allowlist/write-pad hergebruikt as-is
- `src/features/campaigns/components/canvas/medium/ComponentDiffPreviewModal.tsx` — interface paste al, geen wijziging nodig
- `src/lib/landing-pages/publish-page.ts`, publish-/rollback-routes, `WebPagePublishPanel`, `Step4Timeline` — parallel spoor (P1)
- `LandingPageGenerateBlock.tsx`, generate-structured-variant, auto-iterate, `landing-page-quality.ts` — buiten scope

# Smoke test plan

1. `npx tsx scripts/smoke-tests/web-page-builder-phase48-preview-editing.ts` — pure matching: unieke match, duplicaten over secties (scoping), duplicaten binnen sectie (occurrence), geen match, fallback-sectie-id's.
2. `npx tsx scripts/smoke-tests/web-page-builder-phase46-pagerender-parity.ts` + `...phase47-section-edit-tools.ts` — render-pariteit en kernel-guards onaangetast.
3. Handmatig (Step 3): hover sectie → toolbar; pijltjes verplaatsen de sectie; Trash op laatste BrandHero toont de verplicht-melding; Sparkles → prompt "maak formeler" → diff-modal → accept wijzigt de sectie; klik op headline → typ → Enter → tekst persisteert na reload.

# Risico's

- **DOM↔tree-drift** (re-hydrate of AI-accept tijdens een open inline edit) → commit her-valideert het pad via `readPath` tegen de actuele tree en annuleert stil bij mismatch.
- **`display:contents`-wrappers hebben geen eigen box** → toolbar-positie via union van child-rects i.p.v. `getBoundingClientRect` op de wrapper.
- **Identieke teksten binnen één sectie** → occurrence-telling in DOM-volgorde (geneste elementen tellen als één regio); blijft het ambigu dan géén edit.
- **Dubbele submits/races op de toolbar** → `dataRef`-spiegel wordt synchroon bijgewerkt bij eigen mutaties (zelfde patroon als `puckDataRef` in PuckPageBuilder).

# Out of scope

- B1 chat-dock / B3 select-and-tell (bouwen door op dezelfde provenance)
- "Regenereer sectie" met nieuwe generatie-call (C-spoor pattern-swap)
- Multi-variant carousel voor de `alternatives`-preset (Phase 6-nota in ai-edit-instructions)
- E2 eigen sectie-editor / E3 Puck-dependency-verwijdering

# Notes

- `component-edit`-route: preset wint wanneer per ongeluk beide instructie-vormen meekomen; response-`instructionId` is `null` bij vrije tekst. `TEXT_FIELDS_BY_TYPE`, lock-check (423) en edit-distance ongewijzigd.
- `deliverableId` + `componentId` gaan als provenance mee in de request-body (contract voor logging/toekomstige server-side lockchecks); de route blijft stateless.
- Sectie-typen zonder `TEXT_FIELDS_BY_TYPE`-entry geven een 400 met server-melding; de popover toont die als error-state (bewust niet client-side gedupliceerd — route-files mogen geen extra exports hebben in Next App Router).
