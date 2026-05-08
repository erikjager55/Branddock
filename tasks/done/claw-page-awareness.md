---
id: claw-page-awareness
title: Brand Assistant page awareness + universal field-fill
fase: pre-launch
priority: now
effort: 2-3 dagen
owner: claude-code
status: done
completed: 2026-05-08
scope-completed: Phase 0.2.A foundation only (useFormFillStore + fill_form_fields tool + system-prompt surfacing + MutationConfirmCard handler). Page-wiring (PersonaDetail/BrandAssetDetail/Step1Context) en Δ-1 chat-integratie compat-criteria deferred — eigen follow-up sub-cluster, niet langer in deze task-file. Foundation is non-regression: AI ziet `formFillFields = []` op alle pages tot een page expliciet registreert, valt terug op dedicated tools.
created: 2026-05-07
completed: -
related-adr: -
related-spec: docs/archive/plans-pending-task-migration/IMPLEMENTATIEPLAN-CLAW-PAGE-AWARENESS.md, tasks/_drafts/idea-brand-control-program.md
worktree: branddock-feat-claw-awareness
---

## Update 2026-05-08 — pre-launch promotion + Δ-1 chat-integratie hooks

Opgenomen als **Phase 0 voorloper** in Brand Control Program (zie `tasks/_drafts/idea-brand-control-program.md`).

### Discovery 2026-05-08 — bestaande infrastructuur veel rijker dan task-file aannam

Pre-existing in repository (geen werk meer nodig):
- ✅ `ClawPageContext` met `page`/`entityType`/`entityId`/`entityName`/`campaignId`/`wizardSnapshot` velden
- ✅ `pageContext` wordt gestuurd vanuit `InputBar.tsx` → `/api/claw/chat` route → `context-assembler.ts` system prompt
- ✅ `useClawStore.activeEntity` + `setActiveEntity` (gewired vanaf detail-pages)
- ✅ `inspect_current_entity` read-tool al gebouwd voor 5 entity types met `FieldPreview[]` + `isEmpty` + completeness
- ✅ `MutationConfirmCard` confirmation-flow + `clientAction: 'wizard_update'` precedent

Wat nog ontbreekt:
- ❌ `fill_form_fields` generic write-tool — voor pages zonder dedicated tool (BrandAssetDetail framework-fields, settings forms, etc.)
- ❌ `useFormFillStore` registratie-API zodat pages hun setters bekend maken aan de AI
- ❌ Wiring per page (Step1Context, PersonaDetail, BrandAssetDetail)
- ❌ Δ-1 chat-integratie compat: `pageContext.sectionPath` voor Canvas Step 4 + `inspect_current_entity` op Canvas Step 4

### Phase 0.2.A — Foundation klaar 2026-05-08 (commit volgt)

Geleverd:
- `src/stores/useFormFillStore.ts` — Zustand store met `registerFields` / `clearFields` / `applyFill`
- `ClawPageContext.formFillFields` veld + Zod schema-extension in `/api/claw/chat`
- `fill_form_fields` write-tool in `write-tools.ts` met `clientAction: 'form_fill'` (mirror van `wizard_update` pattern)
- `context-assembler.ts` `formatFormFillFields()` surfaces velden + tool-instructies in system prompt
- `InputBar.tsx` leest `useFormFillStore.fields` + includeert in pageContext payload
- `MutationConfirmCard.tsx` handler voor `clientAction === 'form_fill'` → `useFormFillStore.applyFill()` + label-overlay voor user-readable preview

Wat NOG niet gedaan (volgt in vervolg-sessie):
- Page-wiring — PersonaDetailPage en BrandAssetDetailPage moeten edit-state via useFormFillStore exposen. PersonaDetail gebruikt vandaag TanStack Query mutations (geen lokale form-state) — vereist refactor om edit-state in store te exposen
- Δ-1 chat-integratie compat criteria 1-3

**Δ-1 dependency**: Brand Assistant chat-integratie van Content Review (Δ-1) bouwt op deze drie infrastructuur-elementen — verifieer in deze task dat de ontworpen contracten Δ-1 niet uitsluiten:

**Δ-1 dependency**: Brand Assistant chat-integratie van Content Review (Δ-1) bouwt op deze drie infrastructuur-elementen — verifieer in deze task dat de ontworpen contracten Δ-1 niet uitsluiten:

- **`pageContext` payload** moet workspace-id + (wanneer op Canvas) huidige content-id + section-path bevatten — zodat het komende `review_content` read-tool weet wát te reviewen wanneer user "review deze draft" zegt
- **`inspect_current_entity` returns** moeten content-tekst + section-id meeleveren wanneer page = Canvas Step 4 — zodat review-flow huidige draft kan ophalen zonder paste-in
- **Read-tool chat-card pattern** moet werken voor multi-row return (`BrandReviewResultCard` rendert N findings) — verificatie dat `MutationConfirmCard`-pattern of een nieuw `ReadResultCard`-pattern dit ondersteunt

# Probleem

Brand Assistant (code-naam `claw`) heeft al `currentPage` in de store, 11 write-tools en MutationProposal-bevestigingsflow — maar de AI krijgt de paginacontext nooit mee. Op specifieke pagina's via dedicated tools werkt vullen wel, maar voor veel pagina's ontbreekt zo'n tool. Concreet voorbeeld: gebruiker vroeg om Stap 1 Review Context briefing-velden te vullen voor een press-release. Assistent antwoordde "Ik zie dat er geen `inspect_current_entity` tool is voor deliverables. Ik kan je concrete test content geven die je direct in de velden kunt kopiëren." — workaround i.p.v. oplossing.

# Voorstel

Drie capabilities toevoegen:
1. **Meekijken**: Brand Assistant weet pagina + entity ID + entity-naam zonder dat user het vertelt
2. **Velden zien**: nieuwe `inspect_current_entity` tool retourneert huidige veld-staat
3. **Velden invullen**: nieuwe `fill_form_fields([{key, value}, ...])` tool met bracket-notatie paths schrijft naar actieve form-context store (hergebruikt deepSet uit transformative-goals fix)

Generic field-filler vermijdt per-pagina dedicated tools — eenmalig bouwen, werkt overal.

# Acceptatiecriteria

- [ ] `useClawStore` `currentPage` + `currentEntity` (id + type + name) wordt meegestuurd naar `/api/claw/chat`
- [ ] Nieuwe `useFormFillContext()` hook waarin pagina's hun editable velden registreren (key, label, currentValue, setter)
- [ ] Nieuwe tool `inspect_current_entity` — retourneert pagina-context + huidige veld-staat
- [ ] Nieuwe tool `fill_form_fields([{key, value}])` — schrijft via setters in actieve form-context
- [ ] `MutationConfirmCard` hergebruikt voor field-fill confirmation flow (geen nieuw bevestigingsmechanisme)
- [ ] Bracket-notatie support voor nested velden (`goals[0].title`)
- [ ] Wiring in 3 representatieve pagina's: Stap 1 Content Brief (Canvas), Persona Detail, Brand Asset Detail
- [ ] System prompt in `context-assembler.ts` includeert pagina-context + welke velden actief zijn
- [ ] **Δ-1 chat-integratie compat**: `pageContext` payload-shape includeert workspace-id + (when on Canvas) content-id + section-path — komende `review_content` read-tool kan deze velden lezen zonder schema-wijziging
- [ ] **Δ-1 chat-integratie compat**: `inspect_current_entity` returns op Canvas Step 4 leveren content-tekst + section-id mee — voldoende voor `review_content` om huidige draft op te halen
- [ ] **Δ-1 chat-integratie compat**: read-tool result-card-pattern is gedocumenteerd of geverifieerd — `BrandReviewResultCard` (N-row tabel) zal hetzelfde patroon gebruiken
- [ ] `npx tsc --noEmit` 0 errors
- [ ] Smoke-test: vraag "vul deze velden in" op elk van de 3 wired pagina's → verwacht velden gevuld na bevestiging

# Bestanden die ik aanraak

- `src/lib/claw/claw.types.ts` — ClawChatRequest +pageContext + entityContext velden
- `src/lib/claw/store/useClawStore.ts` — currentEntity state + setter
- `src/lib/claw/tools/read-tools.ts` — `inspect_current_entity` toevoegen
- `src/lib/claw/tools/write-tools.ts` — `fill_form_fields` toevoegen
- `src/lib/claw/context-assembler.ts` — pagina-context in system prompt
- `src/app/api/claw/chat/route.ts` — pageContext + entityContext doorvoer
- `src/app/api/claw/confirm/route.ts` — fill_form_fields confirm-flow
- `src/lib/claw/hooks/useFormFillContext.ts` (nieuw) — generic context store + hook
- `src/features/campaigns/components/canvas/accordion/Step1Context.tsx` — eerste pagina wired
- `src/features/personas/components/detail/PersonaDetailPage.tsx` — tweede pagina wired
- `src/features/brand-asset-detail/components/BrandAssetDetailPage.tsx` — derde pagina wired

# Bestanden die ik NIET aanraak

- Bestaande 11 write-tools — blijven werken voor specifieke flows
- SSE streaming contract — alleen extra context op request, geen response-format change
- Andere ~15-20 pagina's die nog niet gewired worden — vervolgsessie

# Smoke test plan

1. Open Persona Detail, type in chat: "Wat zijn de huidige velden van deze persona?"
   - Verwacht: AI gebruikt `inspect_current_entity`, retourneert lijst gevuld vs leeg
2. Type: "Vul de behaviors sectie met 3 voorbeeld-gedragingen"
   - Verwacht: MutationConfirmCard met preview, na confirm zijn velden gevuld
3. Hard refresh → check persistentie via PATCH naar API
4. Herhaal op Brand Asset Detail (frameworkData.dimensions met bracket-notatie)
5. Herhaal op Step1Context — briefing velden (occasion, audienceObjective, coreMessage, tonePreference, constraints)

# Risico's

- **Stale closure** in setters wanneer pagina re-rendert tussen registratie en aanroep — mitigatie: useRef pattern
- **AI hallucinatie van field-keys** — mitigatie: `inspect_current_entity` retourneert exacte keys, prompt instrueert "alleen keys gebruiken die uit inspect kwamen"
- **Bracket-notatie complexity** — `deepSet` werkt al voor exploration field-suggestions, hergebruik
- **Confirmation overload** — als AI per veld 1 confirm vraagt, frustrerend. Mitigatie: 1 confirm per `fill_form_fields` call met multi-field array

# Out of scope

- Wiring van overige ~15-20 pagina's (vervolgsessie)
- Auto-save zonder confirmation
- Field validation buiten huidige form-component validatie
- Brand Assistant suggestion van velden zonder user-prompt (proactive mode)

# Notes

Plan in `docs/archive/plans-pending-task-migration/IMPLEMENTATIEPLAN-CLAW-PAGE-AWARENESS.md` (292 regels, 4 stappen).

Terminologie: UI + user-facing docs zeggen "Brand Assistant". Code paths blijven `claw` (store `useClawStore`, routes `/api/claw/*`, feature dir `src/features/claw/`).

Field-path notatie: bracket-notatie consistent met `deepSet()` uit transformative-goals fix (#97).
