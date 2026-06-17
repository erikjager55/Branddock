---
id: knowledge-context-inline-add
title: Knowledge-context in de content-item flow — prominente knop, library-items zichtbaar, inline toevoegen
fase: pre-launch
priority: now
effort: ~3,5-4 dagen (F1-F4)
owner: claude-code
status: done
created: 2026-06-17
completed: 2026-06-17
related-adr: -
related-spec: docs/audits (research-workflow knowledge-context-feature-research)
worktree: main (gebouwd in hoofd-checkout op gebruikersverzoek "bouw alles")
---

# Probleem

Drie klachten over het koppelen van kenniscontext aan een content-item (Canvas Step 1):

1. **Lage affordance** — de knop "Select knowledge context" valt niet op (kale 12px tekst-link).
2. **Bibliotheek-items ontbreken in de picker** — items in de Knowledge Library zijn niet selecteerbaar omdat ze niet getoond worden.
3. **Geen inline toevoegen** — gebruiker wil ter plekke een link of PDF toevoegen die ook in de Knowledge Library wordt opgeslagen.

# Geverifieerde root-causes (multi-agent research 2026-06-17)

- **Knop**: `Step1Context.tsx:446-453` = kale tekst-link; de "Knowledge Context"-kaart (418-443) rendert alleen als `additionalContextItems.size > 0` → op een vers item geen enkele aanwijzing.
- **Library niet zichtbaar**: GEEN disjoint-store-bug. Picker (`fetcher.ts:58-62`) én Library-pagina lezen hetzelfde `knowledgeResource`-model met dezelfde `workspaceId`-scope; de picker is zelfs inclusiever. Echte oorzaak: (a) `fetcher.ts:64` dropt de hele groep stil bij 0 rijen; (b) workspace-scope-mismatch (rijen in 1 van 17 workspaces) — zombie-tab-patroon.
- **Inline-add**: herbruikbaar pad bestaat al (`useCreateResource`/`useUploadFile` → `/api/knowledge-resources[/upload]`). Gaten: upload-route mist `invalidateCache`; PDF wordt opgeslagen maar nooit geparset → bereikt prompt niet; picker leest een aparte query-key (`canvas-context-items`), dus na add ook die invalideren — NIET `/api/knowledge`.
- **Latente bug (F4)**: `additionalContextItems` leeft alleen in Zustand; geen persist/hydratatie → verdwijnt stil bij reload/tab-switch/regeneratie.

# Fasering

### F1 — Knowledge-kaart altijd zichtbaar + prominente knop (klacht 1)
`Step1Context.tsx`: guard 418 weg, kaart rendert altijd; empty-state met prominente knop (border+bg+padding, BookOpen/Plus, geen emoji); chips + "Beheren" wanneer gevuld. Oude tekst-link verwijderd.

### F2 — Inline toevoegen (link/PDF) → opgeslagen in Library (klacht 3 + 2)
- `KnowledgeContextSelectorModal.tsx`: optionele inline-add sectie (Link/Bestand mini-tabs), opt-in via prop (persona-chat ongewijzigd).
- `CanvasContextSelector.tsx`: wire `useCreateResource`/`useUploadFile`; na succes invalideer `['knowledge-resources']` **én** `['canvas-context-items']` + auto-select het verse item.
- `upload/route.ts`: ontbrekende `invalidateCache` + PDF-tekstextractie via `parsePdf` (unpdf) → nieuw `content`-veld.
- Schema: `KnowledgeResource.content String? @db.Text` (auto-geserialiseerd via registry; geen excludeFields-entry).
- `serializer.ts` + `registry.ts`: `'fulltext'` format-hint + `maxSerializedLength` zodat document-content ruimer dan 500 tekens in de prompt landt.

### F3 — Picker-robuustheid (klacht 2)
- `fetcher.ts`: emit lege groep i.p.v. `continue` bij 0 rijen; `error`-flag bij query-fout i.p.v. stil verbergen.
- `KnowledgeContextSelectorModal.tsx`: zero-count + error per-categorie renderen i.p.v. één generieke "No context items".

### F4 — Persistentie van de selectie
- `canvas-context.ts`: `settings.additionalContextItems` → `stack.additionalContextItems`.
- `useCanvasStore.ts`: hydrateer in `setContextStack` (guard `additionalContextItemsModified`); flag gezet in set/remove; reset in `resetModifiedFlags`+`reset`.
- `canvas.api.ts`: `persistAdditionalContext()` PATCH; aangeroepen op Apply (CanvasContextSelector) + remove (Step1Context).

# Acceptatiecriteria
- [x] `npx tsc --noEmit` 0 errors; geen `any`
- [x] `npm run lint` 0 errors (0 warnings)
- [x] upload-route heeft `invalidateCache`
- [~] F1: vers content-item toont knowledge-kaart + prominente knop — code af; visuele browser-smoke open
- [~] F2: inline link/PDF → picker + Library; PDF-tekst in `content` — serializer-pad geverifieerd via smoke; browser-smoke (echte upload) open
- [x] F3: lege workspace toont zero-count "Knowledge Library"-sectie i.p.v. niets — geverifieerd via `smoke:knowledge-context` (TechCorp Brand)
- [~] F4: selectie overleeft reload/tab-switch — persist/hydratatie-code af; browser-smoke open
- [x] `smoke:prompt-contracts` 235/235 + nieuwe `smoke:knowledge-context` 8/8 groen

# Reviewbevindingen verwerkt (16-agent adversariële review)
- **CRITICAL** modal re-seedt selectie niet bij heropenen → Apply dropte eerder gekozen items (pre-existing, door F4 ook server-side gepersist). Fix: guarded "adjust-state-during-render" re-seed + `resetAndClose` wist `selected` niet meer + `initialSelected` onvoorwaardelijk.
- **MAJOR** knowledge genegeerd voor 5 PUCK web-page-types (orchestrate short-circuit + structured-variant consumeert het niet). Fix: kaart verborgen voor `isPuckWebpageType`.
- **MINOR/NIT** lege chips lekten naar persona-chat (gedeelde fetcher). Fix: modal toont chip alleen bij items/error/(inline-add knowledge_resource).
- **NIT** stale-server-clobber-window. Fix: selectie meegeflushed in `handleGenerate` vóór `resetModifiedFlags`.
- **NIT** geen URL-validatie inline-add. Fix: `new URL()`-guard in `handleAddLink`.

# Bekende beperking / follow-up
- Voor de 5 PUCK web-page-types loopt generatie via `generate-structured-variant` → `generateLandingPageVariantBatch`, dat `additionalContextItems` (nog) niet consumeert. Daarom is de kaart daar **verborgen** i.p.v. een dode affordance. Echte wiring (knowledge-tekst in het variant-prompt) is een aparte taak — raakt golden-set-beschermde variant-prompts, dus eigen smoke/ADR.

# Bestanden
F1: `Step1Context.tsx` · F2: `KnowledgeContextSelectorModal.tsx`, `CanvasContextSelector.tsx`, `upload/route.ts`, `schema.prisma`, `serializer.ts`, `registry.ts` · F3: `fetcher.ts`, `KnowledgeContextSelectorModal.tsx` · F4: `canvas-context.ts`, `useCanvasStore.ts`, `canvas.api.ts`, `Step1Context.tsx`, `CanvasContextSelector.tsx`

NIET aanraken: `/api/knowledge/*`, `KnowledgeContext.tsx` (dode parallel), wizard-`KnowledgeStep`, `serializeContextForPrompt`-injectiepad (werkt).

# Notes
- Schema-wijziging vereist `npx prisma db push && npx prisma generate` + dev-restart; andere worktrees moeten na pull `npx prisma generate` (stale-client gotcha 2026-05-29).
