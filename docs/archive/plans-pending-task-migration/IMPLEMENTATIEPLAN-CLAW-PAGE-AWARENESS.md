# Implementatieplan: Brand Assistant Page Awareness + Field Filling

> **Status**: Plan goedgekeurd (Erik, 2026-04-18), klaar voor Stap 1
> **Aangemaakt**: 2026-04-18
> **Aanleiding**: Gebruiker wil dat de Brand Assistant kan meekijken op de huidige pagina en velden kan invullen. De feature (code-naam `claw`) heeft al `currentPage` in de store, 11 write-tools en een MutationProposal-bevestigingsflow — maar de AI krijgt de paginacontext nooit mee, en weet niet welke velden op het scherm leeg zijn.
>
> **Terminologie**: UI + user-facing docs zeggen "Brand Assistant". Code paths blijven `claw` (store `useClawStore`, routes `/api/claw/*`, feature dir `src/features/claw/`). Dit plan gebruikt "Brand Assistant" in proza en `claw` in code-referenties.

---

## Doelstellingen

1. **Meekijken**: Brand Assistant weet op welke pagina + welke entiteit de gebruiker zich bevindt, zonder dat de gebruiker dit moet vertellen.
2. **Velden zien**: Brand Assistant kan de huidige staat van een entiteit ophalen (welke velden zijn gevuld, welke zijn leeg).
3. **Velden invullen**: Brand Assistant kan specifieke velden voorstellen en na bevestiging wegschrijven — met een naadloze UI-update op de actieve pagina.
4. **Creëren op context**: "Maak een persona hier" werkt zonder extra uitleg. Hergebruik bestaande `create_persona` / `create_trend` tools.
5. Geen nieuwe bevestigingsmechanismen — hergebruik bestaande `MutationConfirmCard`.
6. Geen verandering in het streaming SSE-contract — alleen extra context op de request.

---

## Huidige staat (verkend)

- **`useClawStore`**: heeft `currentPage: string` + `setCurrentPage(page)`. Wordt gezet bij navigatie in `App.tsx`. Wordt **niet** meegestuurd naar de chat API.
- **Entity selectie**: verschillende stores houden selectedId bij (`useBrandAssetDetailStore.selectedAssetId`, `usePersonaDetailStore.selectedPersonaId`, `useProductsStore.selectedProductId`, `useCompetitorsStore.selectedCompetitorId`) — geen centrale plek.
- **`/api/claw/chat`**: accepteert `message`, `contextSelection.modules`, `attachments`. Geen veld voor page/entity context.
- **`context-assembler.ts`**: bouwt system prompt uit workspace-brede context (brand assets, personas, producten) — niet pagina-specifiek.
- **Write-tools** (`src/lib/claw/tools/write-tools.ts`): 11 stuks, vereisen allemaal een expliciete `assetId`/`personaId`/`productId` in de input. AI moet die nu uit de conversatie afleiden.
- **Read-tools** (`src/lib/claw/tools/read-tools.ts`): bestaan voor lijst-queries, geen "inspect current entity".
- **Confirm-flow**: `/api/claw/confirm` voert de mutation uit na user approval. Server-side cache wordt geïnvalideerd; TanStack Query cache wordt **niet** getriggerd.

---

## Beslissingen vooraf

- **Field-path notatie**: **bracket-notatie** (`goals[0].title`). Consistent met de bestaande `deepSet()` uit de exploration field-suggestion pipeline (#97 transformative-goals fix) — die splitst al op `/^(.+)\[(\d+)\]$/` per pad-segment.
- **Naam in UI**: "Brand Assistant". Code-symbolen blijven `claw`.
- **Tool-naamgeving**: AI-facing tool namen blijven snake_case Engels (consistent met bestaande 11 tools), bijv. `inspect_current_entity`.

---

## Stap 1 — Page + Entity Context meesturen (Meekijken)

### Doel
Brand Assistant weet: "gebruiker is op Brand Asset Detail, asset ID X, asset naam 'Brand Essence'".

### Wijzigingen

**`src/lib/claw/claw.types.ts`**
Voeg toe aan `ClawChatRequest`:
```ts
pageContext?: {
  page: string;           // bijv. 'brand-asset-detail'
  entityType?: string;    // bijv. 'brand_asset', 'persona', 'product', 'competitor'
  entityId?: string;
  entityName?: string;    // voor leesbare AI-referentie
};
```

**`src/stores/useClawStore.ts`**
- Voeg toe: `activeEntity: { type, id, name } | null` + setter `setActiveEntity(...)`.
- Pagina-componenten die een entiteit tonen, roepen `setActiveEntity(...)` aan in een `useEffect`.

**App.tsx**
- Bestaande `setCurrentPage(activeSection)` blijft.
- Geen nieuwe routing; entity-sync gebeurt in de detail-componenten zelf.

**Pagina-componenten (per detail view)** — 4 plekken, identiek patroon:
- `BrandAssetDetailPage.tsx` → `setActiveEntity({ type: 'brand_asset', id, name })`
- `PersonaDetailPage.tsx` → `{ type: 'persona', id, name }`
- `ProductDetailPage.tsx` → `{ type: 'product', id, name }`
- `CompetitorDetailPage.tsx` → `{ type: 'competitor', id, name }`
- Opruimen bij unmount: `setActiveEntity(null)`.

**`src/features/claw/hooks/useClawChat.ts` (of waar de chat request wordt gebouwd)**
Voeg `pageContext` toe aan de fetch body: `{ page: currentPage, ...(activeEntity && { entityType, entityId, entityName }) }`.

**`src/app/api/claw/chat/route.ts`**
- Zod schema uitbreiden met optionele `pageContext`.
- Doorgeven aan `assembleSystemPrompt()`.

**`src/lib/claw/context-assembler.ts`**
- Nieuwe sectie in system prompt:
  ```
  ## Current Page
  The user is currently viewing: {page}
  Active entity: {entityType} "{entityName}" (id: {entityId})
  When the user says "this asset" / "deze persona" / "dit product", assume they mean this entity.
  When creating new entities, use this page's context where sensible (e.g. a persona created
  from the personas page belongs to this workspace, no further confirmation needed).
  ```
- Als geen `pageContext`: sectie weglaten.

### Verificatie
- Open brand asset detail → open Brand Assistant → "Wat vind je van deze asset?" → AI moet zonder extra uitleg weten welk asset.
- Geen entity actief → AI vraagt bij "deze" om verduidelijking.
- `tsc --noEmit` → 0 errors.

### "Done" betekent
Zonder de entity-ID in het chatbericht te noemen, kan de AI werken met de juiste brand asset / persona / product / competitor. Creatie-tools krijgen impliciet de workspace-context mee.

---

## Stap 2 — Veld-inspectie (Velden zien)

### Doel
Brand Assistant kan de huidige waarden (en gaps) van de actieve entiteit opvragen zonder dat de gebruiker dit hoeft te plakken.

### Ontwerp-keuze: tool-based, niet snapshot

Twee opties:
- **A. Snapshot in store**: pagina pusht `{field: value}` map naar store, wordt meegestuurd in elke request.
- **B. Read-tool `inspect_current_entity`**: AI roept zelf aan wanneer nodig.

**Keuze: B.** Reden: (1) snapshot vergroot elke request, (2) tool-based is consistent met het bestaande tool-use patroon, (3) AI kan selectief inspecteren.

### Wijzigingen

**`src/lib/claw/tools/read-tools.ts`**
Voeg toe: `inspect_current_entity`
- Input: `{ entityType: string, entityId: string }` (AI vult vanuit pageContext)
- Return per entityType (compact JSON, `{ value, isEmpty }` per veld):
  - `brand_asset`: content, description, alle `frameworkData` velden
  - `persona`: demographics, psychographics, goals, frustrations, behaviors
  - `product`: description, features, benefits, useCases, pricing
  - `competitor`: companyDescription, positioning, strengths, weaknesses
- Retourneert óók `completenessPercentage` (hergebruik `calculateAssetCompleteness()` uit `src/lib/brand-asset-completeness.ts`).
- Preview-truncatie: velden > 200 chars worden afgekapt met `...` om tokens te sparen; AI kan specifieke velden volledig opvragen via een vervolg-tool.

**`src/lib/claw/context-assembler.ts`**
- Hint aan AI toevoegen: "When the user asks about the current entity's fields, or wants to fill in empty fields, call `inspect_current_entity` first."

### Verificatie
- "Welke velden zijn nog leeg?" → AI roept `inspect_current_entity` → toont lijst van empty fields.
- "Vul de core values in" → AI inspecteert eerst, stelt dan waarden voor via write-tool.
- Lege entity (nieuw persona zonder data) → AI noemt alle kritieke gaps.

### "Done" betekent
Eén tool die voor 4 entity-types de huidige staat retourneert in een AI-leesbaar formaat met empty-field markers en completeness %.

---

## Stap 3 — Velden invullen (bestaande + 2 fixes)

### Doel
AI stelt velden voor, gebruiker bevestigt, entiteit is bijgewerkt, **de actieve pagina toont direct de nieuwe waarden zonder handmatige refresh**.

### Staat van zaken
Bestaande write-tools doen het werk al:
- `update_asset_content` (content veld)
- `update_asset_framework` (framework velden, volledig object)
- `update_persona` (alle velden)
- `update_product`
- `update_competitor`
- `update_strategy_context`

`/api/claw/confirm/route.ts` roept `invalidateCache()` aan. Dat dekt server-side cache, maar **TanStack Query cache op de actieve pagina wordt niet automatisch getriggerd** — enige echte gat.

### Wijzigingen

**`src/app/api/claw/confirm/route.ts`**
- Response uitbreiden: `{ success, entityType, entityId, fieldsUpdated: string[] }`.

**`src/features/claw/hooks/use-confirm-mutation.ts` (of waar confirm wordt afgehandeld)**
- Na succesvolle confirm: invalideer de relevante TanStack Query keys op basis van `entityType`:
  ```ts
  switch (entityType) {
    case 'brand_asset': queryClient.invalidateQueries({ queryKey: brandAssetKeys.detail(entityId) }); break;
    case 'persona': queryClient.invalidateQueries({ queryKey: personaKeys.detail(entityId) }); break;
    case 'product': queryClient.invalidateQueries({ queryKey: productKeys.detail(entityId) }); break;
    case 'competitor': queryClient.invalidateQueries({ queryKey: competitorKeys.detail(entityId) }); break;
    // new entities: invalidate list instead
    case 'persona_created': queryClient.invalidateQueries({ queryKey: personaKeys.lists() }); break;
    // ...
  }
  ```

**`update_asset_framework` uitbreiden met single-field update**
- Oud gedrag: `{ assetId, frameworkData }` → overschrijft volledig framework object.
- Nieuw gedrag: `{ assetId, fieldPath: "goals[0].title", value: "Launch internationally" }` → deep-set op bestaand object via `deepSet()` (bracket-notatie, zie #97).
- Body is één van beide varianten (Zod `union`). AI kiest; bij twijfel kiest AI single-field.
- Validatie: bestaande array-index wordt geaccepteerd, out-of-bounds wordt geweigerd met duidelijke foutmelding zodat AI kan corrigeren.

**Toast-feedback** (UX-nice-to-have)
- Na confirm: toast "Updated {fieldsUpdated.length} fields in {entityName}".

### Verificatie
- "Vul de 'whyItMatters' van Brand Essence in met '...'" → bevestig → asset detail page toont direct de nieuwe waarde.
- Framework single-field update werkt zonder dat andere velden gewist worden.
- Meerdere opeenvolgende velden invullen via chat → elke update zichtbaar op de pagina.
- Out-of-bounds `goals[99].title` → AI krijgt error → probeert kleinere index.

### "Done" betekent
Velden die Brand Assistant invult verschijnen instant op de pagina. Framework-velden kunnen per-veld worden geüpdate zonder andere data te verliezen.

---

## Stap 4 — Create-flow UX-check

### Doel
Onderzoeken of "maak een persona" / "maak een trend" naadloos werkt met de nieuwe context-awareness, en of er extra UX-werk nodig is.

### Wijzigingen

**`create_persona` tool check**
- AI heeft genoeg context: op `/personas` overzichtspagina krijgt het `page: 'personas'`, kan creëren zonder extra info.
- `buildProposal` toont momenteel alleen de `name` in de MutationConfirmCard. Uitbreiden met de belangrijkste velden zodat de gebruiker weet wat er wordt aangemaakt.

**`create_trend` tool check**
- Idem — check of proposal-preview de volledige trend-inhoud toont.

**Post-create navigatie**
- Na bevestiging van `create_persona`: invalideer `personaKeys.lists()` én open de nieuwe persona-detail pagina? **Voorstel**: alleen lijst invalideren, geen auto-navigate (te verrassend). In plaats daarvan: toast met "View persona →" knop.
- Response van confirm bevat het nieuw aangemaakte entity-ID zodat de toast-link kan werken.

**Proposal preview consistency**
- Alle `create_*` tools moeten in `buildProposal` minimaal 3-5 belangrijke velden tonen via de bestaande `MutationChange[]` structuur (met `currentValue: null` om "new" aan te duiden).

### Verificatie
- Op `/personas` zeg: "maak een persona voor een senior marketing manager" → proposal toont naam + demographics + belangrijkste velden → bevestig → nieuwe persona verschijnt in lijst → toast met link.
- Op asset-detail zeg: "maak een persona" → AI vraagt welke pagina te gebruiken, of creëert met workspace-default.

### "Done" betekent
Creatie-tools tonen een bruikbare proposal-preview en navigeren de lijst correct na bevestiging. Geen verborgen mutations.

---

## Stap 5 — UX-polijst

### Doel
De "Brand Assistant kijkt mee"-ervaring voelbaar maken voor de gebruiker.

### Wijzigingen

**Watching-indicator in Brand Assistant header (`ClawOverlay.tsx`)**
- Onder de titel "Brand Assistant": kleine grijze subtekst `Watching: {entityName}` of `Viewing: {pageName}` wanneer van toepassing.
- Geen indicator op dashboard / overzichtspagina's.

**Context-aware quick actions (`src/features/claw/hooks/useQuickActions.ts` of waar ze worden geladen)**
- Op detail-pagina: quick actions worden gegenereerd op basis van `entityType`:
  - `brand_asset` → ["Vul lege velden in", "Analyseer completeness", "Stel verbeteringen voor"]
  - `persona` → ["Vul lege velden in", "Chat met deze persona", "Valideer tegen markt"]
  - `product` → ["Vul features aan", "Schrijf product-beschrijving", "Link aan personas"]
  - `competitor` → ["Samenvat sterktes/zwaktes", "Vergelijk met ons merk"]
- Op overzicht: bestaande default actions.

**Pro-actieve opening-prompt**
- Wanneer Brand Assistant wordt geopend met `activeEntity !== null` **en** er zijn >3 empty velden: eerste greeting is niet de default, maar "Ik zie dat {entityName} nog {N} lege velden heeft. Wil je dat ik help ze in te vullen?".
- Niet forceren: blijft een suggestie in de chat, gebruiker kan ook gewoon zelf typen.
- Implementeren via `getInitialGreeting(pageContext, completenessData)` helper.

### Verificatie
- Header toont watching-tekst op alle 4 detail-pagina's, niet op dashboard.
- Quick actions wisselen zichtbaar bij navigatie tussen entity-types.
- Nieuwe persona met lege velden → Brand Assistant opent met invul-aanbod.
- Volle persona → default greeting.

### "Done" betekent
Gebruiker ziet in één oogopslag dat Brand Assistant "meekijkt", krijgt relevante quick actions, en wordt pro-actief uitgenodigd om gaps te vullen.

---

## Volgorde & schatting

| Stap | Scope | Schatting | Afhankelijk van |
|------|-------|-----------|-----------------|
| 1 | Page + entity context doorzetten | ~2 uur | — |
| 2 | `inspect_current_entity` read-tool | ~2 uur | Stap 1 |
| 3 | Cache-invalidatie + field-path update | ~1,5 uur | Stap 1 |
| 4 | Create-flow UX-check + proposal preview | ~1,5 uur | Stap 3 |
| 5 | UX-polijst (watching, quick actions, greeting) | ~2 uur | Stap 1-3 |

**Totaal**: ~9 uur werk. Kan in 2 sessies opgeleverd worden (Stap 1-3 eerst, dan Stap 4-5).

---

## Risico's & mitigatie

- **Stale entity-referentie**: gebruiker navigeert weg tijdens AI-respons → AI werkt met oude entity. Mitigatie: entity-ID wordt per request meegestuurd, niet per conversatie — altijd fresh.
- **Framework field-path validatie**: AI kan een ongeldig pad kiezen (bijv. `goals[99].title` in een array van 3). Mitigatie: write-tool valideert bestaand pad, weigert out-of-bounds met duidelijke error zodat AI kan retry-en.
- **Performance bij grote frameworks**: `inspect_current_entity` op een volle Brand Archetype (25+ velden) levert veel tokens. Mitigatie: preview-truncatie (velden >200 chars afkappen met `...`), volledige inhoud alleen op AI-vervolgtool.
- **Privacy tussen workspaces**: alle tools doen al workspace-check via `ctx.workspaceId`. Geen extra werk.
- **Pro-actieve greeting te luid**: kan irritant worden. Mitigatie: alleen bij >3 empty velden + sessie-level suppressie (als je hem eenmaal weggeklikt hebt die sessie, niet opnieuw).
- **Quick actions die falen**: "Vul lege velden in" zonder duidelijke context → AI weet niet wat te doen. Mitigatie: quick actions worden niet zomaar verzonden, ze populaten de input-box zodat de gebruiker kan aanvullen.

---

## Tracking

- Erik implementeert in 2 sessies, prioriteit Stap 1 → 2 → 3 → 4 → 5.
- Per stap: `tsc --noEmit` clean, handmatige verificatie van de genoemde scenario's, commit per stap.
- Gotchas die tijdens implementatie opduiken: append aan `gotchas.md`.
