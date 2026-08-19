---
id: power-user-shortcuts
title: Power-user shortcuts voor content items
fase: post-launch
priority: later
effort: ~1 dag (alleen stap 4+5 resteren)
owner: claude-code
status: open
created: 2026-05-07
completed: -
related-adr: -
related-spec: docs/archive/plans-pending-task-migration/IMPLEMENTATIEPLAN-POWER-USER-SHORTCUTS.md
worktree: branddock-static-rendering-regressie
---

> **Triage 2026-07-14 (doc-keeper-audit)**: stappen 1-3 bleken **al gebouwd in april 2026**
> (commit `ccb7e1cd`, vóór de changelog-migratie en daardoor nooit als entry geland):
> auto-inherit leeft in `CanvasPage.tsx` + `useCanvasStore` (`inheritedFrom`-slice +
> inheritance-banner), "Add another like this" als `RepeatSplitButton.tsx` +
> `deliverables/[did]/duplicate`-route, en bulk-add als `BulkGenerateModal.tsx` +
> `bulk-create-deliverables`-route (incl. parallelle SSE-generatie — verder dan dit plan).
> Rest = alleen stap 4 (recent-prompts-dropdown) + stap 5 (Brand-Assistant-banner);
> beslis ná pilot-feedback of die überhaupt nodig zijn. File-refs uit het origineel
> (`accordion/PromptSection.tsx`, `detail/DeliverableRow.tsx`) bestaan niet meer.

# Probleem

Content-item creatie binnen een bestaande campagne is niet wezenlijk te lang (~7-10 clicks) maar ~3 daarvan zijn pure bevestiging voor power-users die hetzelfde type content herhalen (bv 5 LinkedIn-posts achter elkaar). Wizard blijft correct voor nieuwe users en strategische content — alleen de friction voor herhaalde flows wegnemen. Bonus: Brand Assistant is al een volwaardige entry voor content-creatie maar wordt niet proactief getoond.

# Voorstel

5 micro-optimalisaties + Brand Assistant surfacing:
1. **Auto-inherit settings** van vorig deliverable van zelfde type in zelfde campagne (Canvas Step 1+3 prefilled)
2. **"Add another like this"** knop op afgeronde deliverable → opent Canvas met inherit
3. **Bulk-add deliverables** modal in Campaign Detail — multi-select types, kwantiteit per type
4. **Recent prompts dropdown** in Canvas Step 1 — laatste 5 prompts van zelfde content-type
5. **Brand Assistant entry-point banner** op Campaigns overview en lege Content Library


# Meting 2026-08-19 — vier van de vijf stappen bestonden al

Vóór er iets gebouwd is, geteld wat er al was en wie het gebruikt.

**Stap 1-3**: stonden al als "AL GEBOUWD" in dit bestand, met onafgevinkte vakjes.
Dat klopt.

**Stap 5 was voor driekwart af.** `BrandAssistantCTA` bestaat in twee varianten
(`card` en `tip`) en `openClawWithPrompt` is de gedeelde ingang. Al aanwezig:
- Content Library lege staat → `card`-variant (`ContentLibraryPage.tsx:263`)
- `AddDeliverableTypeModal` → `tip`-variant
- onboarding-tooltip → `BrandAssistantTooltip`

Ontbrak alleen: de banner op het campagne-overzicht. **Dat is nu gebouwd** —
`tip`-variant, alleen zichtbaar bij `campaigns.length > 0`, want in de lege staat
heeft de gebruiker een campagne nodig en geen alternatieve route.

⚠️ **Stap 4 is NIET gebouwd, op een meting.** De dropdown met je laatste vijf
prompts per content-type bedient "power-users die hetzelfde type herhalen (bv 5
LinkedIn-posts achter elkaar)". Op productie geteld:

| | |
|---|---:|
| Deliverables totaal | 13 |
| Campagnes | 16 |
| Zelfde content-type herhaald binnen één campagne | **1 geval** |
| Grootste herhaling | **2** |

Dat gedrag bestaat dus vrijwel niet. De functie is ~3 uur werk en het ontwerp ligt
vast in dit bestand; hij kan er staan zodra dat gedrag zich aandient. Bouwen vóór
dat moment is bouwen voor een publiek dat er niet is — dezelfde afweging die vandaag
ook `content-test-regression-7B` en `validate-brand-domain-component-fit` van de
lijst haalde.

**Niet visueel geverifieerd**: de banner is type-check-, lint- en build-groen en
hergebruikt een component die elders in productie draait, maar ik heb hem niet in
een browser gezien. Dat vraagt een ingelogde sessie met campagnes.

# Acceptatiecriteria

## Stap 1 — Auto-inherit settings — ✅ AL GEBOUWD (ccb7e1cd, april 2026)
- [ ] `findMostRecentCompletedInSameCampaign({ campaignId, contentType, excludeId })` query
- [ ] Bij Canvas-load: settings.mediumConfig + settings.contentTypeInputs + settings.brief inherit
- [ ] Per ge-erfd field: `inheritedFrom: previousDeliverable.id` in store
- [ ] UI toont "Inherited from <title>" badge per veld met "Reset to default" knop
- [ ] Werkt alleen wanneer >1 COMPLETED deliverable van zelfde type in campagne bestaat

## Stap 2 — "Add another like this" — ✅ AL GEBOUWD (RepeatSplitButton + duplicate-route)
- [ ] Knop op afgeronde deliverable in Content Library + Campaign Detail
- [ ] Klik → maakt nieuwe Deliverable met type+settings van source → navigeert naar Canvas
- [ ] Auto-inherit logic uit Stap 1 wordt automatisch geactiveerd

## Stap 3 — Bulk-add — ✅ AL GEBOUWD (BulkGenerateModal + bulk-create-deliverables)
- [ ] Modal vanaf "+ Add Deliverable" knop in Campaign Detail
- [ ] Multi-select content-types met kwantiteit (bv "3× linkedin-post + 2× email")
- [ ] Per type: optioneel auto-inherit van laatste van dat type
- [ ] POST /api/campaigns/[id]/deliverables/bulk → array creation in $transaction

## Stap 4 — Recent prompts dropdown (~3 uur) — ⏸️ BEWUST NIET GEBOUWD (zie meting)
- [ ] Lokale store `useRecentPromptsStore` — last 5 prompts per workspace per content-type
- [ ] Persisted via Zustand `persist` middleware
- [ ] Dropdown in Canvas Step 1 PromptSection naast textarea
- [ ] Klik op recent prompt → vult textarea + auto-extends met "(zelfde structuur, andere [topic])"

## Stap 5 — Brand Assistant entry banner (~2 uur) — ✅ AF 2026-08-19
- [x] Banner op Campaigns overview wanneer campagnes-lijst >0 (niet voor lege state)
- [ ] Tekst (Lucide-icoon, geen emoji): "Of vraag de Brand Assistant: 'Maak een nieuwe campagne voor X'"
- [x] Banner op Content Library wanneer empty state — bestond al (`card`-variant)
- [x] Klik → opent Brand Assistant chat met pre-prompted context — via `openClawWithPrompt`

## Cross-cutting
- [ ] `npx tsc --noEmit` 0 errors
- [ ] Smoke-test alle 5 stappen volgens plan in test-scenario hieronder

# Bestanden die ik aanraak

## Stap 1 — Auto-inherit
- `src/features/campaigns/components/canvas/CanvasPage.tsx` — inherit hook
- `src/features/campaigns/lib/inherit-deliverable-settings.ts` (nieuw)
- `src/features/campaigns/stores/useCanvasStore.ts` — inheritedFrom tracking

## Stap 2 — Add another
- `src/features/campaigns/components/content-library/ContentCardGrid.tsx` + `ContentCardList.tsx`
- `src/features/campaigns/components/detail/DeliverableRow.tsx`
- `src/app/api/campaigns/[id]/deliverables/duplicate/route.ts` (nieuw)

## Stap 3 — Bulk add
- `src/features/campaigns/components/detail/BulkAddDeliverablesModal.tsx` (nieuw)
- `src/app/api/campaigns/[id]/deliverables/bulk/route.ts` (nieuw)

## Stap 4 — Recent prompts
- `src/features/campaigns/stores/useRecentPromptsStore.ts` (nieuw)
- `src/features/campaigns/components/canvas/accordion/PromptSection.tsx`

## Stap 5 — BA banner
- `src/features/campaigns/components/overview/BrandAssistantBanner.tsx` (nieuw)
- `src/features/campaigns/components/overview/ActiveCampaignsPage.tsx`
- `src/features/campaigns/components/content-library/ContentLibraryPage.tsx`

# Bestanden die ik NIET aanraak

- `src/features/campaigns/components/wizard/*` — wizard blijft ongewijzigd (regel uit plan)
- `useCampaignWizardStore` — geen wijzigingen aan wizard-state
- Tweede entry-point voor "Quick Content" — eerder voorgesteld, ingetrokken

# Smoke test plan

## Stap 1
1. In bestaande campagne: maak en voltooi 1 LinkedIn-post deliverable
2. Voeg nieuwe LinkedIn-post toe → Canvas opent
3. Verify: Step 1 Context + Step 3 Medium gevuld met settings van vorige
4. Verify: badge "Inherited from <title>" zichtbaar per ge-erfd field
5. Klik "Reset to default" → field leegt

## Stap 2
1. Op een afgerond deliverable card: klik "Add another like this"
2. Verify: nieuwe Canvas opent met type + settings ge-erfd
3. Verify: source deliverable ongewijzigd

## Stap 3
1. Klik "+ Add Deliverable" in Campaign Detail
2. Selecteer "3× LinkedIn-post + 2× Email" → confirm
3. Verify: 5 nieuwe DRAFT deliverables created in 1 transaction
4. Verify: deliverables zichtbaar in lijst

## Stap 4
1. In Canvas Step 1, klik recent prompts dropdown
2. Verify: laatste 5 prompts van dit content-type zichtbaar
3. Klik op een → textarea vult + auto-extends met "(zelfde structuur, andere topic)"

## Stap 5
1. Op Campaigns overview met >0 campagnes: zie BA banner
2. Klik banner → Brand Assistant opent met pre-prompted context

# Risico's

- **Stap 1 inheritance verkeerd**: gebruiker verwart inherited met fresh settings — mitigatie: badge per veld, reset knop
- **Stap 3 bulk creation race**: parallelle uitvoer corrumpeert deliverable count — mitigatie: $transaction
- **Stap 4 recent prompts privacy**: persoonlijke prompts zichtbaar op gedeelde browser — mitigatie: per-user persist key

# Out of scope

- Tweede "Quick Content" entry-point (eerder ingetrokken)
- Wizard verwijderen of inkorten
- Nieuwe content-type taxonomie
- Auto-create van deliverables zonder confirmation
- Inherit van settings cross-campaign

# Notes

Volledig plan in `docs/archive/plans-pending-task-migration/IMPLEMENTATIEPLAN-POWER-USER-SHORTCUTS.md` (336 regels). De 5 stappen zijn losse mini-features die elk apart shippable zijn — overweeg ze als sub-tasks als parallel werk wenselijk is.
