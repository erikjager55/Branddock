---
id: lp-pattern-swap-ui
title: "Wissel layout" per sectie (C2) — deterministische pattern-swap in preview + sectie-editor
fase: pre-launch
priority: next
effort: 1 dag (uitgevoerd in 1 sessie samen met lp-section-pattern-library)
owner: claude-code
status: done
created: 2026-08-12
completed: 2026-08-12
related-adr: -
related-spec: docs/specs/2026-08-07-webpage-builder-verbeterplan.md (§3 doelbeeld punt 1-2 + §5 Fase C, C2)
worktree: - (branch claude/puck-editor-improvement-y9ep4x, parallel-engineering sessie)
---

# Probleem

De C1-patroonbibliotheek bestaat, maar zonder UI blijft structuurvariatie
onbereikbaar voor de user. Het doelbeeld (§3): naast prompts een
**deterministische gratis edit-laag** — pattern-swap als instant operatie,
geen AI-call, kan niets breken (het Lovable Visual Edits / v0 Design
Mode-patroon).

# Voorstel

Een LayoutGrid-knop in de A4-hover-toolbar van `PreviewEditingLayer` (alleen
zichtbaar op sectie-types mét patterns) → popover met de brand-toegestane
patterns uit `listPatternOptions(type, archetype, itemCount)`: NL-labels uit
de registry, actieve markering, minItems-gefaalde patterns uitgegrijsd mét
reden. Klik = `setSectionProps(sectionId, { patternKey })` via de kernel →
`onChange` → bestaand debounced-autosave-pad. In E2's sectie-editor is de
kiezer al gratis via het `patternKey`-select-veld; de sectie-lijst krijgt
een pattern-badge bij niet-default patterns.

# Besluiten

- **Archetype-bron**: `contextStack.brandTokens.archetype` (de
  geclassificeerde Jung-archetype uit de brand-tokens-laag — zelfde stack
  waar `buildSpikePuckConfig` zijn tokens uit haalt), gelezen via
  `useCanvasStore((s) => s.contextStack)` — exact zoals `SectionEditor` de
  contextStack al leest; de layer-props hoefden er niet voor te wijzigen.
- **itemCount** uit de sectie-instance zelf via
  `sectionPatternItemCount(type, props)` (features/items-array-lengte;
  Testimonial/BrandCTA tellen als 1) — pure helper in section-patterns.ts,
  smoke-gedekt.
- **Swap via de kernel** (`setSectionProps`) i.p.v. directe tree-mutatie:
  lock-guard gratis, één waarheid voor alle edit-paden (verbeterplan §7).
  Knop bovendien disabled bij sectie-lock.
- **Popover-exclusiviteit**: pattern-popover en AI-prompt-popover sluiten
  elkaar; hover-/inline-edit-guards behandelen `patternPopoverOpen` zoals
  `popoverOpen` (geen hover-switch of inline-edit onder een open popover).
- **E2-props-paneel gratis geverifieerd**: het `patternKey`-select-veld uit
  C1's fields-metadata wordt door `fieldsToPanelModel` als select gemapt
  (phase54 sectie 12 + phase53 select-mapping); via de nieuwe
  label-preferentie (`meta.label` wint van humanize) heet het veld
  'Layout-patroon' i.p.v. 'Pattern key'.
- **Registry-labels zijn dé pattern-labels** (NL, geen dubbele
  i18n-catalogus); i18n bevat alleen UI-chrome: `pageBuilder.patterns.*`
  (button, popoverTitle, active, minItems-reden, badgeTitle) in nl + en.

# Acceptatiecriteria

- [x] LayoutGrid-knop in de hover-toolbar, alleen op types met patterns
      (`sectionHasPatterns`), disabled bij lock
- [x] Popover: allowedPatterns per archetype, actieve markering (Check),
      uitgegrijsde patterns tonen minItems-reden
- [x] Klik = instant `setSectionProps` → onChange (geen AI-call, geen modal)
- [x] E2: patternKey-select in props-paneel (gratis via C1) — geverifieerd
- [x] E2: pattern-badge in de sectie-lijst bij niet-default pattern
- [x] i18n nl/en `pageBuilder.patterns.*` aanwezig
- [x] `npx tsc --noEmit` 0 errors; eslint 0 op geraakte bestanden
- [x] phase47/48/53/54 groen (kernel/preview/editor/patterns)

# Bestanden die ik aanraak

- `src/features/campaigns/components/canvas/medium/PreviewEditingLayer.tsx` (knop + PatternSwapPopover + guards + archetype-bron)
- `src/features/campaigns/components/canvas/medium/SectionEditor.tsx` (pattern-badge in sectie-lijst)
- `src/features/campaigns/components/canvas/medium/section-editor-model.ts` (SectionFieldMeta.label-preferentie — veld heet 'Layout-patroon' in het paneel)
- `src/lib/ui-i18n/locales/nl/campaigns-canvas-medium.ts` + `.../en/campaigns-canvas-medium.ts` (`pageBuilder.patterns.*` + editor.types voor de 3 nieuwe componenten)

# Bestanden die ik NIET aanraak

- `PuckPageBuilder.tsx` — archetype bleek zonder prop-doorgifte bereikbaar (canvas-store)
- `section-edit-tools.ts` — `setSectionProps` dekt de swap al (geen nieuwe kernel-operatie)
- Claw-tools (`swap_section_pattern` chat-tool is B1/C3-terrein)

# Smoke test plan

1. `npx tsx scripts/smoke-tests/web-page-builder-phase54-section-patterns.ts` → 98/98 (kiezer-logica: listPatternOptions/disabled-reason/actieve key + veld-metadata)
2. `npx tsx scripts/smoke-tests/web-page-builder-phase53-section-editor.ts` → 44/44 (paneel-model)
3. Handmatig (localhost): hover FeatureGrid → LayoutGrid-knop → popover toont Raster (actief) / Om-en-om / Bento (JESTER-merk) of zonder Bento (RULER-merk); klik 'Om-en-om' → preview herschikt direct in A-B-A-B-rijen, autosave loopt; sectie-editor toont badge 'Om-en-om (beeld/tekst)' + select 'Layout-patroon'. Bij 2 features staat Bento uitgegrijsd met "Vereist minimaal 3 items".

# Risico's

- Popover botst met bestaande hover/inline-edit-flows → gemitigeerd via
  dezelfde guard-set als de AI-popover (mouseover/mouseleave/click).
- Swap op gelockte sectie → kernel weigert + knop disabled (dubbel geborgd).
- Ongeclassificeerd merk (archetype null) → alleen ongerestricteerde
  patterns zichtbaar (bewust conservatief, zie C1-task).

# Out of scope

- Pattern-thumbnails/previews in de popover (spec noemt thumbnails — nu
  tekst-lijst; thumbnails vragen een mini-render-pipeline).
- `swap_section_pattern` als Claw-chat-tool (B1-consolidatie) en
  pattern-keuze in generatie (C3).

# Notes

- De hover-toolbar-volgorde: lock → Wissel layout → AI-prompt; de
  deterministische actie staat vóór de AI-actie (doelbeeld §3 punt 1).
