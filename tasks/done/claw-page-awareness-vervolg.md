---
id: claw-page-awareness-vervolg
title: Brand Assistant page-wiring — Step1Context + PersonaDetail + BrandAssetDetail
fase: pre-launch
priority: now
effort: 2 dagen (10-12u verspreid: 2-3u Step1, 4-5u Persona, 3-4u Asset, 1u Δ-1 compat verify)
owner: claude-code
status: done
created: 2026-05-12
completed: 2026-05-12
related-adr: -
related-spec: tasks/done/claw-page-awareness.md (Phase 0.2.A foundation)
worktree: -
---

# Probleem

Phase 0.2.A foundation (`useFormFillStore` + `fill_form_fields` tool + system-prompt surfacing + `MutationConfirmCard` handler) is gemerged 2026-05-08 maar geen enkele page registreert nog velden. Resultaat: de AI ziet `formFillFields = []` op elke pagina en kan alleen via dedicated tools (zoals `update_persona`) velden invullen. Op pages zonder dedicated tool blijft het probleem uit de oorspronkelijke discovery: gebruiker vraagt "vul deze velden", assistant antwoordt met workaround.

Dit is de laatste closure van BCP Phase 2 voordat de focus naar launch-track verschuift (vercel-deployment + pilot-onboarding). Δ-1 review-surfaces zijn allemaal landed; de page-wiring sluit de Brand Assistant write-capabilities aan op de pages waar pilot-klanten ze het meest verwachten.

# Voorstel

Drie representatieve pages wiren aan de foundation, conform de oorspronkelijke scope:

1. **`Step1Context.tsx`** (Canvas content brief, Step 1) — Zustand `useCanvasStore` heeft al clean per-field setters (`setBriefField` + `setContentTypeInput`). Wiring = mount-hook die store-state leest en als `FormFillField[]` registreert. Bracket-notatie voor content-type-specifieke array-fields.

2. **`PersonaDetailPage.tsx`** — Decoupled sections met local `useState` drafts die via `onUpdate` callback → `updatePersona.mutate()`. Wiring = page-level wrapper die per sectie de huidige value uit query-data leest en een setter biedt die routes naar de bestaande `mutate()`. Geen sectie-level refactor — interceptor-pattern op page-niveau.

3. **`BrandAssetDetailPage.tsx`** — Polymorphic `frameworkData` (per `frameworkType` enum: BRAND_ESSENCE / PURPOSE_WHEEL / BRAND_PROMISE / ...). Wiring = page-level adapter die voor de actieve framework-type de juiste TypeScript-interface laadt + flat + bracket-notation paths genereert (`essenceStatement`, `proofPoints[0]`, `validationScores.unique`).

Δ-1 chat-integratie compat (3 criteria uit de done task) is sinds Surface D (`review_content`) live impliciet voldaan; verifiëren via 1 smoke-step, geen aparte werkstroom.

# Acceptatiecriteria

**Step1Context wiring**:
- [ ] `useFormFillStore.registerFields()` aanroep op mount met flat keys: `objective`, `keyMessage`, `toneDirection`, `callToAction` + content-type-specifieke keys met bracket-notatie waar van toepassing
- [ ] `clearFields()` op unmount
- [ ] Setters routes via bestaande `setBriefField` / `setContentTypeInput` actions (geen duplicate state)
- [ ] `currentValue` preview is correcte string (arrays als comma-joined, leeg = null)

**PersonaDetailPage wiring**:
- [ ] Page-level `useEffect` registreert velden uit query-data (`asset.persona`) wanneer beschikbaar
- [ ] Sectie-callbacks (`onUpdate`) blijven werken — geen wijziging in sectie-componenten zelf
- [ ] Setters proxy door naar `updatePersona.mutate()` met juiste partial body
- [ ] Bracket-notatie voor array-velden: `goals[0]`, `motivations[1]`, etc.
- [ ] AI-fill van 1 veld triggert 1 mutation-call (geen burst van N writes)

**BrandAssetDetailPage wiring**:
- [ ] Adapter herkent active `frameworkType` en exposeert correcte schema
- [ ] Flat fields (e.g. `essenceStatement`, `essenceNarrative`)
- [ ] Nested object fields (`validationScores.unique`, `.intangible`, ...)
- [ ] Array index fields (`proofPoints[0]`, `attributes[2]`)
- [ ] Setters routen via `updateFramework.mutate({ frameworkData: ... })` met immutable deep-set

**Cross-cutting**:
- [ ] `MutationConfirmCard` toont label + currentValue → newValue per gewijzigd veld
- [ ] AI ziet `formFillFields` array via system prompt op alle 3 pages (verifieerbaar via `console.log` in `context-assembler.ts` of dev-tools network tab)
- [ ] **Δ-1 compat smoke**: open Brand Assistant op Canvas Step 4, vraag "review deze draft" — Surface D `review_content` werkt nog steeds (pageContext shape niet gebroken door nieuwe field-registry)
- [ ] `npx tsc --noEmit` 0 errors
- [ ] `npm run lint` 0 errors (geen nieuwe warnings)
- [ ] Manual smoke-test uitgevoerd op alle 3 pages volgens "Smoke test plan"

# Bestanden die ik aanraak

**Step1Context**:
- `src/features/campaigns/components/canvas/accordion/Step1Context.tsx` — useEffect registreren + clearFields
- `src/features/campaigns/components/canvas/store/useCanvasStore.ts` — alleen lezen, niet wijzigen

**PersonaDetail**:
- `src/features/personas/components/detail/PersonaDetailPage.tsx` — page-level adapter useEffect
- Mogelijk: `src/features/personas/hooks/use-personas.ts` — alleen lezen voor de mutation-hook signature

**BrandAssetDetail**:
- `src/features/brand-asset-detail/components/BrandAssetDetailPage.tsx` — adapter useEffect met framework-type switch
- `src/features/brand-asset-detail/types/` — alleen lezen voor framework-data interfaces (PURPOSE_WHEEL, BRAND_ESSENCE, etc.)
- `src/lib/utils/deep-set.ts` — alleen lezen, hergebruiken voor immutable nested-set

**Cross-cutting**:
- `src/features/claw/components/MutationConfirmCard.tsx` — alleen verifiëren dat label + preview correct rendert; geen wijziging tenzij bug

# Bestanden die ik NIET aanraak

- `src/stores/useFormFillStore.ts` — foundation API stabiel, niet refactoren
- `src/lib/claw/tools/write-tools.ts` — `fill_form_fields` tool werkt al, niet wijzigen
- `src/lib/claw/context-assembler.ts` — surfacing-logica werkt al, alleen lezen
- `src/features/claw/components/InputBar.tsx` — pageContext-payload werkt al
- `src/features/personas/components/detail/sections/*` — sections-internals niet refactoren; ze blijven werken zoals nu via `onUpdate` callback
- `src/features/brand-asset-detail/components/*Section.tsx` — sections-internals niet refactoren
- Andere ~15-20 pages — vervolg-werk in post-launch (`learning-loop-dashboard-usage`-niveau prioriteit)

# Smoke test plan

**Per page (handmatig in browser, Brand Assistant chat open)**:

1. **Step1Context** — open Canvas voor een bestaande campaign, ga naar Step 1
   - Type in Brand Assistant: "Wat zijn de huidige briefing-velden?"
     - Verwacht: AI gebruikt inspect_current_entity OF leest formFillFields uit context; toont objective / keyMessage / toneDirection / callToAction met huidige waarden
   - Type: "Vul keyMessage met 'Vakmanschap zonder compromis'"
     - Verwacht: MutationConfirmCard met preview ("keyMessage: <huidig> → Vakmanschap zonder compromis"), na confirm zit waarde in store
   - Hard refresh → veld blijft staan (store-persistentie verifieert)

2. **PersonaDetailPage** — open een persona, edit-mode aan
   - Type: "Wat zie je hier?"
     - Verwacht: AI toont demographics + psychographics + goals fields
   - Type: "Vul behaviors met 3 voorbeelden: 'leest reviews', 'vergelijkt prijzen', 'vraagt offerte'"
     - Verwacht: 1 confirm-card met behaviors[0], [1], [2]; na confirm → updatePersona.mutate fires éénmaal
   - Network tab: 1 PATCH request, geen burst

3. **BrandAssetDetailPage** — open een Brand Essence framework
   - Type: "Vul proofPoints met 3 voorbeelden"
     - Verwacht: confirm-card met proofPoints[0..2]; na confirm → frameworkData round-trip
   - Refresh → waarden staan in DB

4. **Δ-1 compat smoke** — open Canvas Step 4 met een draft content-piece
   - Type: "review deze draft"
     - Verwacht: Surface D `review_content` werkt nog, `BrandReviewResultCard` rendert findings — geen regressie door nieuwe `formFillFields` in pageContext

5. **TypeScript + lint check**:
   - `npx tsc --noEmit` 0 errors
   - `npm run lint` 0 errors / geen nieuwe warnings

# Risico's

- **PersonaDetail double-write**: AI fillt veld X → confirm → `updatePersona.mutate()` fires. Maar als sectie-internal `useState` draft óók nog open is, kan een latere "save" van de sectie de AI-fill overschrijven. **Mitigatie**: page-level adapter leest huidige value uit query-data (niet uit sectie-internal state); na mutation invalidate triggert React Query refetch en sectie-`useState` syncing.

- **BrandAssetDetail polymorphism**: per framework-type een ander schema. Risico op type-narrowing gaps + runtime errors als framework-type-enum uitbreidt zonder dat adapter wordt bijgewerkt. **Mitigatie**: switch-case exhaustive met `assertNever` fallback; nieuwe framework-types = compile-error.

- **Stale closure in setters**: page herrendert tussen registratie en aanroep. **Mitigatie**: `useRef` op mutate-functie of useEffect met juiste deps.

- **AI hallucination van field-keys**: AI verzint `goals[5]` terwijl er maar 3 goals zijn. **Mitigatie**: `applyFill` returnt `{ applied, missing }` — UI surface de missing keys aan user als hint.

- **Confirmation overload**: AI fillt 10 velden → 1 grote confirm-card. UX-test: scrolt of overweldigt? **Mitigatie**: `MutationConfirmCard` heeft al scroll voor wizard_update; verifieer dat dezelfde scroll voor form_fill werkt.

- **Δ-1 regressie**: nieuwe `formFillFields` veld in pageContext kan Surface D's `review_content` tool verwarren als de tool-router de payload niet correct parsing'd. **Mitigatie**: smoke-test 4 expliciet; payload-shape is additief.

# Out of scope

- Wiring overige ~15-20 pages (Settings, Brandstyle sub-tabs, Workspace, etc.) — post-launch
- Auto-save zonder confirmation — bewust afgewezen (vertrouwen + reverse-ability)
- AI-driven validation buiten huidige form-component validatie
- Proactive field-fill (AI suggesteert velden zonder user-prompt)
- Refactor van sections-internals (sections blijven hun eigen `useState` draft houden)
- Cross-page field-fill (AI fillt veld op page X terwijl user op page Y is)
- Field-fill undo/revert per veld (relies on react-query refetch alleen)

# Notes

**Architecture-references**:
- Foundation store: `src/stores/useFormFillStore.ts`
- Tool definition: `src/lib/claw/tools/write-tools.ts` (search "fill_form_fields")
- Confirmation handler: `src/features/claw/components/MutationConfirmCard.tsx` (search "form_fill")
- System-prompt surfacing: `src/lib/claw/context-assembler.ts` (search "formatFormFillFields")

**Δ-1 compat dependency** (uit done task):
- `pageContext.sectionPath` voor Canvas Step 4 — sinds Surface D shipped is dit impliciet voldaan
- `inspect_current_entity` op Canvas Step 4 — Surface D gebruikt eigen `review_content` tool, niet inspect; criterium achterhaald
- Read-tool chat-card pattern — `BrandReviewResultCard` werkt via Surface D-pattern; geen nieuwe verificatie nodig

**Effort-breakdown**:
- Step1Context: 2-3u (clean store, geen refactor)
- PersonaDetail: 4-5u (adapter-pattern, medium risk)
- BrandAssetDetail: 3-4u (polymorphism, similar adapter-pattern)
- Δ-1 compat smoke: 1u
- Buffer + tsc/lint cycles: 1u
- **Totaal**: ~12u, fits in 2 dagen.
