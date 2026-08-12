# Web-page builder — component author guide

> **Doc-sync 2026-08-12** (E3, ADR `2026-08-07-puck-exit-sectie-editor`): de
> builder draait volledig op de eigen render-/editor-stack — `@puckeditor/core`
> is verwijderd. Deze gids beschrijft de actuele architectuur + het recept om
> een sectie-component toe te voegen.

## Architectuur in één oogopslag

```
medium/
├── puck-config.tsx              # Component-registry: 22 sectie-types + fields-metadata + render-functies
│                                #   (naam is historisch; het is de eigen registry — geen Puck)
├── puck-templates/              # Per-type starter- + from-structured-builders (naam idem historisch)
├── PuckPageBuilder.tsx          # Step 3-hoofdview: preview-first PageRender + prompt-veld (A2)
│                                #   + page-acties (auto-iterate/brand-fit/lock) + editor-opening
├── PreviewEditingLayer.tsx      # A3 inline tekst-edit · A4 sectie-hover-toolbar (kernel-guards)
│                                #   · B3 element-AI (targetField) · C2 pattern-swap-popover
├── SectionEditor.tsx            # E2 fullscreen drie-koloms editor (lijst+DnD / live preview / props)
├── SectionPropsPanel.tsx        # Props-paneel op fields-metadata (arrays recursief, custom → PuckImageField)
├── section-editor-model.ts      # Hook-vrije model-helpers (labels, panel-model, add-defaults, DnD→moves)
├── preview-edit-matching.ts     # A3-matching: DOM-tekst → exact veld-pad
└── variant-to-puck-data.ts      # Step 2 structured variant → sectie-tree (shape-dispatch per type)

src/lib/landing-pages/
├── page-data.ts                 # PageData + SECTION_TYPE_IDS (stabiel registry-contract) + shape-validatie
├── page-render.tsx              # Hook-vrije render-loop (RSC + client) met data-section-id-provenance
├── section-config.ts            # Minimale structurele registry-typering (consumenten-contract)
├── section-edit-tools.ts        # DE mutatie-kernel: move/duplicate/remove/setProps/add + batch
│                                #   (guards: verplichte secties per type, locks, vocabulaire)
├── section-patterns.ts          # C1 pattern-registry (per sectie-type; archetype- + minItems-gefilterd)
├── static-compile.ts            # P2: publish-artifact (HTML+fonts+a11y+JSON-LD+runtime-script)
└── publish-gate.ts              # P6: deterministische merkvalidatie vóór elke publish
```

**Datamodel**: `Deliverable.settings.puckData` (draft, naam historisch) →
`PagePublish`-versies met `livePublishId`-pointer (P1) + bevroren
`compiledHtml`-artifact (P2). Alle edit-paden — toolbar, editor, Claw-chat
(B1: `update_landing_page_structure`), AI-routes — muteren via
`section-edit-tools`; er is geen tweede waarheid.

## Sectie-component toevoegen (5 stappen)

1. **Props-type + component-functie** in `puck-config.tsx` — conventies:
   - `<lowercaseName>Component(tokens)`; brand-tokens via closure, nooit als prop.
   - **RSC-safe**: geen hooks/handlers/'use client' in render-functies (de
     registry draait server-side voor `/p/*`, de artifact-compiler én de
     screenshotter). Interactie = apart client-eiland met no-JS-fallback
     (patroon: `AnchorNavClient`, LeadForm's `:target`-success).
   - Inline `style={{…}}` (Tailwind-4-purge) · Lucide, geen emoji.
   - Fallback-copy MOET het woord "placeholder" bevatten (anti-fabricatie —
     de publish-gate blokkeert er hard op).
2. **Registreren**: `SECTION_TYPE_IDS` in `page-data.ts` (stabiel id — nooit
   hernoemen zonder migratie) + `components:`-entry in `buildSpikePuckConfig`.
   Phase46 bewaakt dat beide lijsten synchroon blijven.
3. **AI-tekstvelden** (optioneel): `TEXT_FIELDS_BY_TYPE` in
   `api/landing-pages/component-edit/route.ts` (sectie-prompt + element-AI)
   en — voor inline-edit op nieuwe leaf-keys — `COPY_KEYS` in
   `lib/landing-pages/puck-text-fields.ts`.
4. **Default-factory** (optioneel) in `puck-templates/template-helpers.ts` —
   de "Sectie toevoegen"-drawer (E2) en de chat-tool vallen anders terug op
   de registry-`defaultProps`.
5. **Patterns** (optioneel, C1): varianten in `section-patterns.ts` +
   pattern-renders in de component (key `'default'` = bestaand gedrag,
   byte-compatibel); de swap-UI en het props-paneel volgen automatisch.

**Smoke**: voeg je component toe aan de `expected`-lijst + render-check in
`scripts/smoke-tests/web-page-builder-phase2.ts` en draai
`npm run smoke:web-page-builder` (chain t/m phase54; ~1900 assertions).

## Wat te vermijden

| Fout | Reden |
|---|---|
| Hooks/'use client' in render-functies | Breekt `/p/*`, artifact-compile en screenshotter (RSC-pad) |
| Tailwind-klassen in renders | Publieke render heeft geen Tailwind-runtime; purge-gaten |
| Brand-tokens als prop | Closure-capture is het contract (`buildSpikePuckConfig`) |
| Sectie-type-id hernoemen | Gepersisteerde trees breken — registry-id's zijn stabiel (ADR E3) |
| Muteren buiten `section-edit-tools` om | Guards (verplichte secties/locks) zijn anders omzeilbaar |
| Echte copy als fallback | Publish-gate rekent op herkenbare "placeholder"-markering |
| `any` | Strict TS — `unknown` + narrowing |

## Cross-refs

- ADR's: `2026-08-07-puck-exit-sectie-editor` (accepted) ·
  `2026-08-12-compile-to-static-publish` · `2026-05-22-landing-page-builder-architectuur`
  (beslissingen 1/3/4/5 nog van kracht; beslissing 2 herzien)
- Plan: `docs/specs/2026-08-07-webpage-builder-verbeterplan.md` (v3) +
  marktonderzoek `docs/reports/webpage-bouw-en-publicatie-marktonderzoek-2026-08-07.md`
- Task-files: `tasks/page-render-own-loop.md` e.v. (E-/A-/B-/C-/P-reeks, 2026-08-12)
