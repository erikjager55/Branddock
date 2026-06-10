---
id: lp-assistant-content-edits
title: LP-tekst wijzigen via Brand Assistant in Step 3 (Medium)
fase: pre-launch
priority: now
effort: 1 dag
owner: claude-code
status: done
created: 2026-06-10
completed: 2026-06-10
related-adr: docs/adr/2026-05-22-landing-page-builder-architectuur.md
related-spec: -
worktree: branddock-feat-lp-assistant-edits
---

# Probleem

In Canvas Step 3 (Medium) kun je een landing-page bewerken via de Puck-builder. De Brand Assistant ("Claw") kent de actieve deliverable al (`pageContext`) en is bereikbaar via de "?"-hulpknop, maar kan de **pagina-inhoud niet wijzigen**: geen enkele write-tool raakt `puckData`. De system-prompt zegt zelfs letterlijk dat de canvas "not directly editable through tools" is. De gebruiker wil in de chat tekstwijzigingen aan de LP kunnen doorvoeren ("maak de hero-kop korter / punchier").

# Voorstel

Twee nieuwe Claw-tools volgens de veilig-gescopete `update_deliverable_brief`-template (workspace-check via `campaign.workspaceId` in zowel buildProposal als execute). `read_landing_page_content` levert exacte tekstveld-paden + huidige waarden; `update_landing_page_content` past gerichte tekst-edits toe via `deepSet` en persisteert door de hero-preserve chokepoint (`preserveHeroOnSettings`), zodat een tekst-edit nooit de hero-foto clobbert. Scope: **alleen tekst**, geen layout/structuur/beeld. UI hergebruikt de bestaande hulpknop-overlay.

# Acceptatiecriteria

- [x] `read_landing_page_content` returnt tekstvelden met pad/component/value, workspace-scoped, alleen voor web-page-types
- [x] `update_landing_page_content` past tekst-edits toe, valideert paden tegen de editable-set (geen verzonnen paden), behoudt hero-image + niet-tekst props
- [x] System-prompt routeert web-page-deliverables naar de LP-tools (rule #5 verzwakt voor web-page-types)
- [x] Canvas-preview ververst automatisch na een edit (bestaande `canvas:refresh-deliverable`-keten via confirm-route case)
- [x] `PUCK_WEBPAGE_TYPES` gecentraliseerd (3 dupes → 1 import)
- [x] `npx tsc --noEmit` 0 errors
- [x] `npm run lint` 0 errors (alleen pre-existing warnings)
- [x] Smoke-test uitgevoerd — `npm run smoke:lp-assistant-edits` (32/32 PASS)
- [x] Runtime-verificatie (echte sessie, dev-server :3100): chat "maak de hero-kop korter" op de echte Napking-LP → assistant riep `read_landing_page_content` (54 velden) + emitte correcte `update_landing_page_content` mutation_proposal → `/api/claw/confirm` schreef de DB-kop daadwerkelijk om ("Vlekkeloos textiel. Geen omkijken.") met hero intact + `affected.entityType='deliverable'` (triggert refresh-event) → daarna teruggezet naar origineel. Plus 9/9 tool-integratietest tegen echte DB.

# Bestanden die ik aanraak

- `src/lib/landing-pages/webpage-types.ts` (NIEUW — centrale `PUCK_WEBPAGE_TYPES`)
- `src/lib/landing-pages/puck-text-fields.ts` (NIEUW — `collectEditableTextFields` + `readPath`)
- `src/lib/claw/tools/read-tools.ts` (+ `read_landing_page_content`)
- `src/lib/claw/tools/write-tools.ts` (+ `update_landing_page_content`, `readPath` geëxtraheerd)
- `src/lib/claw/claw.types.ts` (`contentType` op `ClawPageContext`)
- `src/lib/claw/context-assembler.ts` (LP-instructieblok + import)
- `src/stores/useClawStore.ts` (`contentType` op `ActiveEntity`)
- `src/features/campaigns/components/canvas/CanvasPage.tsx` (`setActiveEntity` contentType)
- `src/features/claw/components/InputBar.tsx` (pageContext spread)
- `src/app/api/claw/confirm/route.ts` (affected-mapping → refresh-event)
- `src/app/api/landing-pages/[deliverableId]/generate-structured-variant/route.ts` (dupe → import)
- `src/features/campaigns/components/canvas/accordion/Step2ContentVariants.tsx` (dupe → import)
- `src/features/campaigns/components/canvas/medium/GenericConfigPanel.tsx` (dupe → import)
- `scripts/smoke-tests/lp-assistant-content-edits.ts` (NIEUW) + `package.json` (smoke-script)

# Out of scope

- Structuur-edits (componenten toevoegen/verwijderen/herordenen)
- Beeld-edits (hero/feature-afbeeldingen) — aparte image-wiring-workstream
- Ingebed chat-zijpaneel in de Puck-editor
- IDOR-hardening van `update_asset_content`/`update_product`/`update_competitor`/`update_strategy_context` execute() (aparte task — gesignaleerd tijdens leak-audit)

# Notities

- De write-tool volgt de deliverable-scoping in buildProposal **én** execute → geen cross-tenant pad (sluit aan op de Brand Assistant leak-audit van dezelfde sessie).
- Worktree vanaf `main` (b98b936f) — `syncHeroFromPuck`-wiring in de studio-route zit nog in ongecommit werk op `feat/lp-editor-image-field`; daarom gebruikt de tool alleen `preserveHeroOnSettings` (tekst-edits raken de hero sowieso niet).
