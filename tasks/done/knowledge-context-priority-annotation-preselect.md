---
id: knowledge-context-priority-annotation-preselect
title: Knowledge-context — campagne-pre-selectie + prioriteit (bronmateriaal) + per-item toelichting
fase: pre-launch
priority: now
effort: ~5-7 dagen (F1-F7)
owner: claude-code
status: done
created: 2026-06-17
completed: 2026-06-17
related: knowledge-context-inline-add (voorganger, gemerged/gebouwd)
worktree: main (gebouwd in hoofd-checkout op gebruikersverzoek)
---

# Probleem (3 wensen)
1. **Pre-selectie**: campagne-geselecteerde kennis moet in de content-item picker al aangevinkt staan.
2. **Prioriteit**: expliciet gekozen kennis (zeker een inhoudelijk Library-artikel) moet als gezaghebbend *bronmateriaal* gelezen worden, niet als ambient "shared for discussion".
3. **Toelichting**: per item een korte notitie ("benadruk deze visie", "speel deze spanning uit") die als guidance de prompt in gaat.

# Geverifieerde uitgangssituatie (research 2026-06-17)
- **Wens 1 premisse faalt vandaag**: `CampaignKnowledgeAsset` heeft alleen brand/persona/product/insight-FK's (geen knowledge_resource); de wizard schrijft in de praktijk alléén `brand_asset`-rijen (door de picker gestript); `isAutoSelected` wordt runtime nooit `true`; persona/product nooit gevuld; casing-bug `assetType:'persona'` vs `'Persona'` (canvas-context.ts:466). → seeding is nu een no-op; wizard-writer + schema moeten eerst herbouwd.
- **Wens 2**: één string `fetcher.ts:158` ("shared for discussion") + dubbele heading (orchestrator wrapt nóg eens `## Additional Context` op canvas-orchestrator.ts:2379 & :2551).
- **Wens 3**: note/priority moet door 6 lagen; alleen hydration-parse (canvas-context.ts:578-591) + beide flattens (useCanvasOrchestration.ts:83-85 & 205-207) + contextItemSchema (orchestrate/route.ts:13-16) + fetcher param droppen het nu. Persist/PATCH zijn al lenient.

# Fasering
- **F1** note?/priority? door de hele keten (store, modal-type, persist, hydration, beide flattens, orchestrate-schema, fetcher-param). Default priority='reference' = gedrag ongewijzigd.
- **F2** fetcher: bucket op priority → `## PRIORITY SOURCE MATERIAL` (read carefully + ground) vs `## ADDITIONAL CONTEXT` (reference); note als `**User guidance on this source:**`; dubbele heading in orchestrator weghalen. Priority-items krijgen ruimer truncatie-budget (volledig artikel inlezen).
- **F3** nieuwe `smoke:context-priority` (priority-heading, reference-regressie, note-render, geen dubbele heading).
- **F4** modal-UI: per geselecteerd item note-textarea + Bronmateriaal/Referentie-toggle; chip-indicator in Step1.
- **F5** schema: `CampaignKnowledgeAsset` += `sourceType String?` + `sourceId String?` (generiek paar).
- **F6** wizard-writer herbouw: store `selectedKnowledge {sourceType,sourceId}[]`, KnowledgeStep meegeven sourceType, launch-route lossless persist + `isAutoSelected:true`; casing-bug fix.
- **F7** seeding in `assembleCanvasContext`: `CampaignKnowledgeAsset` waar campaignId + isAutoSelected → map naar {sourceType,sourceId,title,priority:'primary'}, brand_asset gestript, reconcile tegen live data, alleen seeden als settings.additionalContextItems leeg (guard additionalContextItemsModified).

# Acceptatie
- tsc 0, lint 0; geen `any`.
- `smoke:prompt-contracts` groen of bewust geüpdatet (PRIORITY-heading + dubbel-wrapper weg) met uitleg.
- nieuwe `smoke:context-priority` groen; `smoke:knowledge-context` groen.
- Wens 1: campagne met isAutoSelected-rijen → picker start aangevinkt (priority), brand_asset niet, verwijderde ids niet.
- Wens 2: priority-item onder PRIORITY SOURCE MATERIAL, geen dubbele heading.
- Wens 3: note reist tot in de prompt (initial + regenerate), bewaard bij modal open/close.

# Risico's
- Golden-set drift (F2) → reference-framing bleek byte-identiek; smoke:prompt-contracts 235/235 groen, geen re-baseline nodig.
- Migratie (F5) → andere worktrees `prisma generate` na pull. Wizard-persist v1→v2 migrate toegevoegd (legacy bare-id drafts → `brand_asset:`-prefix).
- Dubbeltelling → seed strips brand_asset **én persona én product** (die komen via altijd-aan stack.personas/stack.products); alleen knowledge_resource/competitor/detected_trend/business_strategy worden geseed.

# Reviewbevindingen verwerkt (9-agent adversariële review, 4 bevestigd)
- **CRITICAL** `KnowledgeStep.allItemIds` (Select All) schreef bare ids i.p.v. composite keys (een eerdere replace_all miste deze regel) → brak membership + launch-classificatie. Fix: `g.items.map(itemKey)`.
- **MAJOR** (zelfde bug, 2e lens) idem.
- **MAJOR** F7-seed dubbel-injecteerde wizard-persona/product (FK→stack.personas/products + generic→seed). Fix: seed sluit persona/product/brand_asset uit. Geverifieerd: persona 1× via stack.personas, niet in additionalContextItems.
- **MINOR** legacy wizard-drafts (bare ids) → unselected bij resume. Fix: persist version 2 + migrate.

# Status
Alle 7 fasen gebouwd + reviewed + fixes verwerkt. Gates: tsc 0 · lint 0 errors · prompt-contracts 235/235 · knowledge-context 8/8 · context-priority 9/9 · seeding end-to-end 4/4 + dedup 4/4.

# Browser-verificatie (Playwright, 2026-06-17)
Dev-server eerst herstart (schema-wijziging → stale Prisma-client gaf 500 op `assembleCanvasContext`). Daarna geverifieerd op een echt content-item (demo-workspace):
- ✅ F1: knowledge-kaart altijd zichtbaar + prominente "Add knowledge context"-knop (non-PUCK item).
- ✅ F2/F3: picker toont alle categorie-chips incl. **Knowledge Library** (30 items); inline-add Link/File-tabs + Title-input aanwezig.
- ✅ F4: na item-selectie verschijnen "Use as:" + Bronmateriaal/Referentie-toggle + note-textarea; na Apply landt de chip in Step 1.
- ✅ F4-persistentie: selectie overleeft een verse page-load (filled-state "Add or manage knowledge"); bij heropenen pre-checked ("1 item selected").
- 🐞 **Bug gevonden + gefixt**: modal sloot niet op Apply (double-toggle: `CanvasContextSelector.handleApply` toggelde én `resetAndClose→onClose` toggelde). Redundante toggle verwijderd → modal sluit nu (overlay=0). Gotcha 2026-06-17 toegevoegd. Dit bug zat er al sinds `knowledge-context-inline-add`.

**Open**: task-finalize + commit.

# Deferred / known limitations (round-2 review — geen geïntroduceerde regressie)
- **Eén goedkope geïndexeerde query** (`campaignKnowledgeAsset.findMany` by `campaignId`) draait nog op elke `assembleCanvasContext` met lege selectie, incl. publieke `/p/[slug]`-render. De dure 8-model-sweep is gegate weg; één geïndexeerde 2-koloms-query is verwaarloosbaar. Mogelijke follow-up: caller-side opt-out flag (raakt ~16 callers) als profiling het ooit aanwijst.
- **Handmatig** een persona/product in de picker kiezen kan dubbel injecteren (stack.personas/products + ADDITIONAL CONTEXT) — pre-existing picker-gedrag, buiten de 3 wensen. De auto-seed (F7) vermijdt dit correct. Follow-up: serializeContextForPrompt dedupen tegen de altijd-aan stack.
- **`persistAdditionalContext` is fire-and-forget** zonder last-writer-wins-guard; snelle apply-dan-remove kan twee PATCHes out-of-order landen (pre-existing-klasse, zelfde als hero-persist-race in gotchas). `handleGenerate`-flush mitigeert vóór generatie. Follow-up indien het in de praktijk speelt.
- **`skipDuplicates` op `CampaignKnowledgeAsset.createMany`** is een no-op (geen unique constraint) — pre-existing; F7-seed `seen`-set voorkomt prompt-dubbels.
