---
id: lp-variant-merge
title: Three-way merge rond regenerate-puck-data + confirm-modal (B4)
fase: pre-launch
priority: next
effort: 2-3 dagen
owner: claude-code
status: done
created: 2026-08-12
completed: 2026-08-12
related-adr: -
related-spec: docs/specs/2026-08-07-webpage-builder-verbeterplan.md (§5 Fase B, B4)
worktree: - (branch claude/puck-editor-improvement-y9ep4x, parallel-engineering sessie)
---

# Probleem

`POST /api/landing-pages/[id]/regenerate-puck-data` hermapt structuredVariant →
puckData met een blinde overwrite: handmatige Puck-edits (Stap 3) gaan
verloren, en de ooit bedoelde confirm-modal is nooit gebouwd. Ook een
variantwissel in Step 2 overschreef puckData wholesale. Spec-doel B4: "edits
overleven variantwissel".

# Voorstel

Pure three-way merge-helper (`threeWayMergePuckData`) in diff-merge.ts met
base = de bij variant-promotie gepersisteerde `settings.puckDataBaseline`,
current = de (mogelijk bewerkte) puckData, incoming = de verse mapping. De
regenerate-route krijgt een niet-persisterende `merge: true`-previewmodus; de
client toont een confirm-modal (keep-mine default, per-conflict take-new) en
past het resultaat toe via het bestaande autosave-pad. handleChooseVariant
schrijft voortaan de baseline mee en loopt bij een her-keuze door dezelfde
merge.

# Acceptatiecriteria

- [x] `threeWayMergePuckData({ base, current, incoming })` in `src/lib/landing-pages/diff-merge.ts`: pure, conservatief, geen input-mutatie; sectie-matching op id met type+occurrence-index-fallback; conflicts (edited ∧ incoming-changed) geflagd met `mine`/`theirs`/`conflictingProps`/`mergedIndex`, keep-mine default
- [x] Baseline-write op elke plek waar de client puckData vers uit de variant seedt (handleChooseVariant incl. fallback-pad) + in de destructieve regenerate-modus (invariant "baseline = laatst geseedde tree")
- [x] Route-modus `merge: true` → `{ merged, conflicts, incoming, baselineUsed, editedSectionCount, refreshedSectionCount }` ZONDER persist; bevestigde apply loopt via bestaand `PATCH /api/studio/[id]` autosave-pad (`settings.puckData` + `settings.puckDataBaseline`) — gedocumenteerd in route-JSDoc
- [x] Destructieve modus (geen body / `merge` afwezig) byte-compatibel + baseline-write
- [x] Confirm-modal in LandingPageGenerateBlock ("bewerkingen blijven behouden (N secties), M conflicten") met per-conflict keep-mine/take-new (default keep-mine), visuele taal van PageDiffPreviewModal zonder import; loading + error states
- [x] "Structuur verversen"-actie op de gekozen-variant-weergave; variantwissel (handleChooseVariant) loopt door dezelfde merge-preview en pauzeert op de modal bij user-werk
- [x] Zod op request-body; shape-guard op de AI-geproduceerde structuredVariant vóór mapping (defense-in-depth, gotcha 2026-03-20)
- [x] Smoke `scripts/smoke-tests/web-page-builder-phase49-variant-merge.ts` (35 PASS) + registratie in `smoke:web-page-builder`-keten
- [x] Bestaande phase35-diff-merge-defensive (8 PASS) + phase9-structured-mapper (34 PASS) blijven groen
- [x] `npx tsc --noEmit` 0 errors in eigen bestanden; eslint 0 errors, 0 nieuwe warnings
- [x] i18n en+nl (`lp.structureRefresh.*`)

# Bestanden die ik aanraak

- `src/lib/landing-pages/diff-merge.ts`
- `src/app/api/landing-pages/[deliverableId]/regenerate-puck-data/route.ts`
- `src/features/campaigns/components/canvas/accordion/LandingPageGenerateBlock.tsx`
- `scripts/smoke-tests/web-page-builder-phase49-variant-merge.ts` (nieuw)
- `package.json` (smoke-keten-append)
- `src/lib/ui-i18n/locales/en/campaigns-canvas-accordion.ts`
- `src/lib/ui-i18n/locales/nl/campaigns-canvas-accordion.ts`

# Bestanden die ik NIET aanraak

- `PageDiffPreviewModal.tsx` — alleen als stijl-referentie gelezen (niet geïmporteerd: ander interactiemodel)
- `PuckPageBuilder.tsx`, `PreviewEditingLayer`/component-edit, publish*/rollback + `publish-page.ts` + `prisma/**` — parallel engineers
- `mergeAcceptedComponents`/`diffComponentIds` — bestaand gedrag ongewijzigd

# Smoke test plan

1. `npx tsx scripts/smoke-tests/web-page-builder-phase49-variant-merge.ts` → 35 PASS (edited-preserved, untouched-refreshed, conflict+take-new-swap, id- en type/index-matching, jsonb-key-order, user-added/deleted, root, geen mutatie, null-guards).
2. Handmatig: variant kiezen → Stap 3 een headline bewerken → terug naar Stap 2 → "Structuur verversen" → modal toont 1 bewerkte sectie; keep-mine behoudt de edit, take-new neemt de verse mapping.
3. Andere variant kiezen mét bestaande edits → modal verschijnt vóór de overwrite; bevestigen promoot de variant en behoudt keep-mine-secties.
4. phase35 + phase9 blijven groen.

# Risico's

- Mapper genereert per invocatie NIEUWE random ids → id-match richting incoming slaagt vrijwel nooit; type+occurrence-index-fallback is de drager. Mitigatie: refreshed secties nemen de stabiele (current-)id over zodat volgende merges wél op id matchen.
- Meerdere secties van hetzelfde type (FeatureGrid voor trust én features) kunnen bij structuurwijziging mis-pairen op occurrence-index → beide kanten "gewijzigd" → conflict → keep-mine; nooit stil dataverlies.
- Pre-B4 deliverables missen een baseline → `baselineUsed: false`, merge degradeert naar volledige refresh; modal toont een amber-waarschuwing.
- Cancel in de choose-flow laat structuredVariant al gewisseld achter met oude puckData (zelfde tussentoestand als het bestaande vangnet-PATCH bij venster-sluiten); opnieuw kiezen herstelt.

# Out of scope

- Prop-level merge bínnen een conflicterende sectie (sectie-granulariteit is de bewuste conservatieve keuze).
- Resurrectie-UI voor door de gebruiker verwijderde secties (deletion = edit, wint altijd).
- Baseline-migratie voor bestaande deliverables (eerste refresh/keuze schrijft 'm vanzelf).
- Dual-render diff-panes zoals PageDiffPreviewModal (per-conflict tekst-preview volstaat hier).

# Notes

**Beslissingen:**
- **Merge-flow-vorm (route)**: previewmodus retourneert zonder persist; de client PATCH't het opgeloste resultaat via het bestaande autosave-pad — één schrijfpad (incl. hero-preserve-chokepoint + cache-invalidatie), geen tweede confirmed-call op de regenerate-route nodig.
- **Baseline-semantiek**: bij apply wordt `puckDataBaseline := incoming` gezet — diff(nieuwe current, baseline) is dan exact de overgedragen user-edits, zodat de vólgende refresh correct detecteert.
- **Vergelijkingen** met stabiele serialisatie (recursief gesorteerde keys, `id` uitgesloten): Postgres jsonb bewaart key-volgorde niet; kale JSON.stringify zou elke persisted sectie als "bewerkt" zien.
- **Variantwissel**: handleChooseVariant patcht eerst de variant, vraagt dan de merge-preview; zonder user-werk direct toepassen (UX identiek aan voorheen), mét user-werk pauzeert de flow op de modal. Bij preview-falen valt hij terug op het pre-B4 destructieve pad + baseline (graceful degradation).
- **Root-props** volgen dezelfde keep-mine-regel zonder conflict-entry (zelden bewerkt; UI-simpelheid).
