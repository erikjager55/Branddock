# 🔒 Lock/Unlock — Implementatie Fasering

> **Doel:** Platform-breed lock/unlock systeem met shield-metafoor, verborgen secties bij lock, en consistente UX.
> **Geschatte doorlooptijd:** 6 prompts in Claude Code (~3-4 uur totaal)
> **Referentiedocumenten:** `ARCHITECTURE-LOCK-UNLOCK-V2.md`, `lock-unlock-prototype-v3.jsx`

---

## Overzicht

```
Fase 1 ──→ Fase 2 ──→ Fase 3 ──→ Fase 4 ──→ Fase 5 ──→ Fase 6
Database    UI Lib     Persona    Assets     Overig     Polish
& API       & Hook     Module     Module     Modules    & QA
```

| Fase | Naam | Scope | Afhankelijk van | Geschatte tijd |
|------|------|-------|-----------------|----------------|
| 1 | Database & API Foundation | Schema, middleware, endpoints | Niets | ~30 min |
| 2 | Shared UI Components | 6 componenten + hook | Fase 1 | ~45 min |
| 3 | Persona Module | Volledige integratie | Fase 1 + 2 | ~45 min |
| 4 | Brand Assets Module | Volledige integratie | Fase 1 + 2 | ~30 min |
| 5 | Products, Strategies, Campaigns | 3 modules tegelijk | Fase 1 + 2 | ~30 min |
| 6 | Polish & Edge Cases | 423 handling, a11y, dark mode | Fase 3-5 | ~30 min |

**Wanneer kun je starten?**
- **Fase 1 + 2:** Nu direct — geen afhankelijkheden van andere lopende werk
- **Fase 3–5:** Na fase 2. Kunnen parallel als je meerdere Claude Code workers hebt
- **Fase 6:** Na alle modules geïntegreerd zijn

---

## Fase 1 — Database & API Foundation

**Wanneer:** ▶️ Kan direct gestart worden
**Afhankelijkheden:** Geen
**Git branch:** `feature/lock-unlock-foundation`

### 1A. Prisma Schema Uitbreiding

Voeg lock-velden toe aan modellen die ze nog missen:

| Model | `isLocked` | `lockedAt` | `lockedById` | Actie nodig |
|-------|-----------|-----------|-------------|-------------|
| Persona | ✅ bestaat | ❌ mist | ❌ mist | + `lockedAt`, `lockedById`, relatie |
| BrandAsset | ✅ bestaat | ✅ bestaat | ✅ bestaat | Geen schema-wijziging |
| Product | ❌ mist | ❌ mist | ❌ mist | + alle 3 velden + relatie |
| Campaign | ❌ mist | ❌ mist | ❌ mist | + alle 3 velden + relatie |
| BusinessStrategy | ✅ bestaat | ❌ mist | ❌ mist | + `lockedAt`, `lockedById`, relatie |
| Interview | ✅ bestaat | ❌ check | ❌ check | Verifieer relatie |

**Migratie:**
```bash
pnpx prisma migrate dev --name add-lock-fields-platform-wide
```

### 1B. Lock Guard Middleware

Nieuw bestand: `src/lib/lock-guard.ts`

```typescript
export async function requireUnlocked(
  model: 'persona' | 'brandAsset' | 'product' | 'campaign' | 'businessStrategy' | 'interview',
  id: string
): Promise<NextResponse | null>
// Retourneert HTTP 423 als isLocked: true
// Retourneert null als unlocked (doorgaan)
```

**Toepassen op ~30 routes:**

| Module | Routes met guard |
|--------|-----------------|
| Personas | `PATCH [id]`, `DELETE [id]`, `POST generate-image`, `POST generate-implications`, `POST ai-analysis`, `POST chat`, `POST regenerate` |
| Brand Assets | `PATCH [id]`, `PATCH content`, `POST regenerate`, `POST ai-analysis`, `DELETE [id]` |
| Products | `PATCH [id]`, `DELETE [id]`, `POST personas` |
| Campaigns | `PATCH [id]`, `DELETE [id]`, `POST deliverables`, `POST strategy/generate` |
| Strategies | `PATCH [id]`, `DELETE [id]` |
| Interviews | `PATCH [id]`, `DELETE [id]` |

**Routes ZONDER guard:** Alle `GET` routes, `PATCH .../lock`, `POST .../duplicate`, `GET .../export`

### 1C. Lock Toggle Endpoints

Consistent patroon per entity:
```
PATCH /api/[entity]/[id]/lock
Body: { lock: boolean }
Permissie: Alleen ADMIN of OWNER
```

| Endpoint | Status |
|----------|--------|
| `/api/personas/[id]/lock` | ✅ Bestaat |
| `/api/brand-assets/[id]/lock` | ✅ Bestaat |
| `/api/interviews/[id]/lock` | ✅ Bestaat |
| `/api/products/[id]/lock` | 🆕 Aanmaken |
| `/api/campaigns/[id]/lock` | 🆕 Aanmaken |
| `/api/strategies/[id]/lock` | 🆕 Aanmaken |

### Claude Code Prompt — Fase 1

```
Implementeer lock/unlock database foundation voor Branddock.

Referentie: ARCHITECTURE-LOCK-UNLOCK-V2.md

1. PRISMA SCHEMA — voeg toe aan prisma/schema.prisma:
   - Persona: + lockedAt DateTime?, lockedById String?, lockedBy User relatie
   - Product: + isLocked Boolean @default(false), lockedAt DateTime?, lockedById String?, lockedBy User relatie
   - Campaign: + isLocked Boolean @default(false), lockedAt DateTime?, lockedById String?, lockedBy User relatie
   - BusinessStrategy: + lockedAt DateTime?, lockedById String?, lockedBy User relatie
   - Verifieer Interview model (heeft het al lockedAt + lockedById?)
   
   Run: pnpx prisma migrate dev --name add-lock-fields-platform-wide

2. LOCK GUARD MIDDLEWARE — maak src/lib/lock-guard.ts:
   - export async function requireUnlocked(model, id) die HTTP 423 retourneert als isLocked: true
   - Error message: "Dit item is vergrendeld. Ontgrendel het om wijzigingen te maken."
   - Fail open bij database errors
   
3. VOEG LOCK GUARD TOE aan alle mutatie-routes (PATCH/DELETE/POST die content wijzigen):
   - Persona routes: PATCH [id], DELETE [id], POST generate-image, POST generate-implications, POST ai-analysis, POST chat
   - Brand Asset routes: PATCH [id], PATCH content, POST regenerate, POST ai-analysis, DELETE [id]
   - Product routes: PATCH [id], DELETE [id]
   - Campaign routes: PATCH [id], DELETE [id]
   - Strategy routes: PATCH [id], DELETE [id]
   - Interview routes: PATCH [id], DELETE [id]
   - NIET op: GET routes, PATCH .../lock, POST .../duplicate

4. NIEUWE LOCK ENDPOINTS — kopieer patroon van src/app/api/brand-assets/[id]/lock/route.ts:
   - POST /api/products/[id]/lock
   - POST /api/campaigns/[id]/lock
   - POST /api/strategies/[id]/lock
   Permissie: alleen ADMIN of OWNER

git add -A && git commit -m "feat(lock): add lock fields, guard middleware, and lock endpoints" && git push origin main
```

---

## Fase 2 — Shared UI Components

**Wanneer:** ▶️ Na fase 1 (of parallel als je de types hardcode)
**Afhankelijkheden:** Fase 1 (voor API types)
**Git branch:** `feature/lock-unlock-ui`

### 2A. Componenten (6 stuks)

Locatie: `src/components/lock/`

| Component | Bestand | Beschrijving |
|-----------|---------|-------------|
| `LockShield` | `LockShield.tsx` | Primaire toggle button met shield icon, shimmer, spring animatie |
| `LockStatusPill` | `LockStatusPill.tsx` | Inline badge: "Vergrendeld" / "Bewerkbaar" met tooltip |
| `LockBanner` | `LockBanner.tsx` | Full-width waarschuwingsbar bovenaan content |
| `LockOverlay` | `LockOverlay.tsx` | Semi-transparant overlay voor read-only kaarten |
| `LockConfirmDialog` | `LockConfirmDialog.tsx` | Bevestigingsmodal met twee blokken: geblokkeerd + verborgen |
| `CardLockIndicator` | `CardLockIndicator.tsx` | 28x28px badge voor overview cards |

### 2B. Custom Hook

Bestand: `src/hooks/useLockState.ts`

```typescript
interface UseLockStateReturn {
  isLocked: boolean;
  lockedAt: string | null;
  lockedBy: { id: string; name: string } | null;
  isToggling: boolean;
  showConfirm: boolean;
  requestToggle: () => void;     // Opent confirm dialog
  confirmToggle: () => Promise<void>;  // API call
  cancelToggle: () => void;      // Sluit dialog
  canEdit: boolean;
  canDelete: boolean;
  canStartResearch: boolean;
  canGenerateAI: boolean;
  canStartChat: boolean;
}
```

### 2C. Visibility Logic

Nieuw concept uit prototype v3 — secties worden **verborgen** bij lock:

```typescript
// src/hooks/useLockVisibility.ts
export function useLockVisibility(isLocked: boolean) {
  return {
    // Verborgen bij lock
    showEmptySections: !isLocked,        // Lege/niet-ingevulde secties
    showAITools: !isLocked,              // AI Exploration, Generate, Implications
    showResearchMethods: !isLocked,      // Workshop, Interview, Enquête (niet-gestart)
    showNewChatButton: !isLocked,        // "Start nieuw gesprek"
    showGeneratePhoto: !isLocked,        // Foto genereren
    showRegenerateButton: !isLocked,     // Regenerate met AI

    // Altijd zichtbaar (read-only)
    showFilledSections: true,            // Secties met data
    showCompletedResearch: true,         // Afgeronde resultaten
    showExistingChats: true,             // Bestaande chatsessies
    showExportOptions: true,             // PDF, JSON export
    showDuplicateOption: true,           // Maakt unlocked kopie
  };
}
```

### Claude Code Prompt — Fase 2

```
Bouw de shared lock/unlock UI component library voor Branddock.

Referentie: ARCHITECTURE-LOCK-UNLOCK-V2.md (sectie "UI Component Library")
Visueel referentie: lock-unlock-prototype-v3.jsx

1. COMPONENTEN — maak src/components/lock/ directory met:
   
   a) LockShield.tsx — Primaire toggle button
      - Props: isLocked, isToggling, onClick, size ('sm'|'md'|'lg')
      - Shield icon (ShieldCheck/ShieldAlert van lucide-react)
      - Framer Motion: whileHover scale 1.08, whileTap scale 0.94, spring stiffness 400
      - Shimmer sweep effect
      - AnimatePresence voor icon swap met rotate ±20°
      - Design tokens: amber (locked), emerald (unlocked)
   
   b) LockStatusPill.tsx — Inline status badge
      - Props: isLocked, lockedBy?, lockedAt?
      - "Vergrendeld" / "Bewerkbaar" text
      - Tooltip bij hover (locked): "Vergrendeld door {naam} — {timeAgo}"
      - Amber/emerald gradient backgrounds
      - Wiggle animatie bij mount
   
   c) LockBanner.tsx — Full-width notification bar
      - Props: isLocked, onUnlock, lockedBy?
      - Alleen zichtbaar als locked
      - Pulserende shield icon, "Dit item is vergrendeld" tekst
      - Embedded "Ontgrendel" button met glassmorphism
      - AnimatePresence height transition
   
   d) LockOverlay.tsx — Card overlay voor read-only content
      - Props: isLocked, children
      - backdrop-filter: blur(0.5px) + amber tint (heel subtiel)
      - Floating lock icon met y-animatie
      - cursor: not-allowed
      - Content blijft leesbaar
   
   e) LockConfirmDialog.tsx — Bevestigingsmodal
      - Props: isOpen, isLocking, entityName, onConfirm, onCancel
      - Twee blokken: "Wordt geblokkeerd" (5 items) + "Wordt verborgen" (2 items)
      - Bij ontgrendelen: "Wordt weer mogelijk" + "Wordt weer zichtbaar"
      - Gradient buttons (amber lock / emerald unlock)
      - Backdrop blur + spring entry animatie
   
   f) CardLockIndicator.tsx — Badge voor overview cards
      - Props: isLocked
      - 28x28px, rechterbovenhoek positie
      - Alleen zichtbaar als locked
      - Scale spring entry

2. HOOKS — maak:
   
   a) src/hooks/useLockState.ts
      - Parameters: entityType, entityId, entityName, initialState, onLockChange?
      - State: isLocked, lockedAt, lockedBy, isToggling, showConfirm
      - Methods: requestToggle(), confirmToggle() (API call), cancelToggle()
      - Computed: canEdit, canDelete, canStartResearch, canGenerateAI, canStartChat
      - API call: PATCH /api/{entityType}/{entityId}/lock met { lock: boolean }
   
   b) src/hooks/useLockVisibility.ts
      - Parameter: isLocked
      - Returns: showEmptySections, showAITools, showResearchMethods,
        showNewChatButton, showGeneratePhoto, showRegenerateButton
        (allemaal !isLocked)
      - En: showFilledSections, showCompletedResearch, showExistingChats,
        showExportOptions, showDuplicateOption (allemaal true)

3. DESIGN TOKENS — voeg toe aan bestaande design tokens:
   - Locked: amber-50 bg, amber-200 border, amber-900 text
   - Unlocked: emerald-50 bg, emerald-200 border, emerald-900 text
   - Gebruik CSS custom properties

Installeer framer-motion als dat nog niet geïnstalleerd is: pnpm add framer-motion

git add -A && git commit -m "feat(lock): add shared UI components and hooks" && git push origin main
```

---

## Fase 3 — Persona Module Integratie

**Wanneer:** ▶️ Na fase 2
**Afhankelijkheden:** Fase 1 + 2
**Git branch:** `feature/lock-unlock-personas`

Dit is de **referentie-implementatie** — hierna kopiëren de andere modules dit patroon.

### 3A. PersonaDetailPage

| Locatie | Aanpassing |
|---------|-----------|
| Header | + `<LockShield>` naast naam, + `<LockStatusPill>` |
| Boven content | + `<LockBanner>` (AnimatePresence) |
| Gevulde kaarten | Wrap in `<LockOverlay>` (Demographics, Goals, Frustrations, Behaviors, Quote) |
| JSX root | + `<LockConfirmDialog>` |

### 3B. Verborgen Secties bij Lock

| Sectie | Type | Gedrag bij lock |
|--------|------|----------------|
| Demographics (gevuld) | Data | ✅ Zichtbaar + read-only overlay |
| Goals & Motivations (gevuld) | Data | ✅ Zichtbaar + read-only overlay |
| Frustrations (gevuld) | Data | ✅ Zichtbaar + read-only overlay |
| Behaviors & Channels (gevuld) | Data | ✅ Zichtbaar + read-only overlay |
| Persona Quote (gevuld) | Data | ✅ Zichtbaar + read-only overlay |
| Strategic Implications (gevuld) | Data | ✅ Zichtbaar + read-only overlay |
| Buying Process (leeg) | Empty | 🟡 **Verborgen** |
| Influences & Media (leeg) | Empty | 🟡 **Verborgen** |
| AI Exploration | AI Tool | 🟣 **Verborgen** |
| Persona Chat (start new) | AI Tool | 🟣 **Verborgen** |
| Research Methods (niet-gestart) | AI Tool | 🟣 **Verborgen** |
| Generate Photo | AI Tool | 🟣 **Verborgen** |
| Generate Implications | AI Tool | 🟣 **Verborgen** |
| Regenerate with AI | AI Tool | 🟣 **Verborgen** |

**Resultaten van afgerond onderzoek** (completed AI Analysis, completed Interviews, etc.) blijven **altijd zichtbaar** als read-only.

### 3C. PersonaCard (Overview)

- `<CardLockIndicator>` in rechterbovenhoek
- Lock icon op avatar
- Validation methods: verberg niet-gestarte methoden bij locked

### 3D. Disabled States

| Element | Prop |
|---------|------|
| Edit Content button | `disabled={!canEdit}` |
| Save Changes button | `disabled={!canEdit}` |
| Delete button | `disabled={!canDelete}` |
| Alle input velden | `disabled={isLocked}` / `readOnly={isLocked}` |

### Claude Code Prompt — Fase 3

```
Integreer lock/unlock in de Persona module. Dit is de referentie-implementatie.

Referentie: ARCHITECTURE-LOCK-UNLOCK-V2.md, lock-unlock-prototype-v3.jsx
Componenten: src/components/lock/ (LockShield, LockStatusPill, LockBanner, LockOverlay, LockConfirmDialog, CardLockIndicator)
Hooks: src/hooks/useLockState.ts, src/hooks/useLockVisibility.ts

1. PERSONA DETAIL PAGE (src/components/personas/PersonaDetailPage.tsx):
   
   a) Hook initialisatie:
      const lockState = useLockState({
        entityType: 'persona',
        entityId: persona.id,
        entityName: persona.name,
        initialState: { isLocked: persona.isLocked, lockedAt: persona.lockedAt, lockedBy: persona.lockedBy }
      });
      const visibility = useLockVisibility(lockState.isLocked);
   
   b) Header: voeg <LockShield> en <LockStatusPill> toe naast persona naam
   
   c) Boven content area: <LockBanner> met AnimatePresence
   
   d) VERBORGEN SECTIES bij lock (gebruik visibility hook):
      - Lege/niet-ingevulde secties: wrap in {visibility.showEmptySections && (...)}
      - AI Exploration knop: {visibility.showAITools && (...)}
      - "Start Research" knoppen (niet-gestart): {visibility.showResearchMethods && (...)}
      - "Start new chat" knop: {visibility.showNewChatButton && (...)}
      - "Generate Photo" knop: {visibility.showGeneratePhoto && (...)}
      - "Generate Implications": {visibility.showAITools && (...)}
      - "Regenerate with AI": {visibility.showRegenerateButton && (...)}
   
   e) READ-ONLY SECTIES bij lock (altijd zichtbaar):
      - Demographics, Goals, Frustrations, Behaviors, Quote: wrap in <LockOverlay isLocked={lockState.isLocked}>
      - Strategic Implications (als gevuld): zichtbaar + overlay
      - Completed research resultaten: altijd zichtbaar
      - Bestaande chat sessies: altijd zichtbaar (read-only)
   
   f) Disabled states:
      - Edit button: disabled={!lockState.canEdit}
      - Delete button: disabled={!lockState.canDelete}
      - Alle input velden: readOnly={lockState.isLocked}
   
   g) <LockConfirmDialog> in JSX root

2. PERSONA CONTENT (src/components/personas/PersonaContent.tsx):
   - Voeg isLocked prop toe
   - Per sectie: check of de sectie data bevat
   - Lege secties: verbergen als isLocked
   - Gevulde secties: toon met disabled inputs

3. PERSONA CARD (src/components/personas/PersonaCard.tsx en EnhancedPersonaCard.tsx):
   - <CardLockIndicator> in rechterbovenhoek van card
   - Lock icon overlay op avatar als locked
   - Research methods sectie: verberg niet-gestarte methoden als locked

4. PERSONA OVERVIEW PAGINA:
   - Cards tonen lock indicator
   - Bulk acties: skip locked items (toon toast warning)

git add -A && git commit -m "feat(lock): integrate lock/unlock into persona module" && git push origin main
```

---

## Fase 4 — Brand Assets Module

**Wanneer:** ▶️ Na fase 2 (kan parallel met fase 3)
**Afhankelijkheden:** Fase 1 + 2
**Git branch:** `feature/lock-unlock-assets`

### Bestaande Situatie

Brand Assets heeft **al** `isLocked`, `lockedAt`, `lockedById` en een `/lock` endpoint. De integratie focust op UI-componenten en de verborgen-sectie logica.

### Aanpassingen

| Component | Aanpassing |
|-----------|-----------|
| `BrandAssetDetailPanel` | + `<LockShield>`, `<LockStatusPill>`, `<LockBanner>` in header |
| `AssetContentViewer` | + `<LockOverlay>` over content blocks |
| `AssetOverflowMenu` | Lock/Unlock optie via `requestToggle()` |
| `AssetCard` (overview) | + `<CardLockIndicator>` |
| AI Analysis section | 🟣 Verbergen bij lock |
| Regenerate button | 🟣 Verbergen bij lock |
| Status change dropdown | Disabled bij lock |

### Claude Code Prompt — Fase 4

```
Integreer lock/unlock in de Brand Assets module. Kopieer het patroon van de Persona module.

Brand Assets heeft al isLocked, lockedAt, lockedById en /lock endpoint.
Focus op UI-integratie en verborgen-sectie logica.

1. BrandAssetDetailPanel — voeg LockShield, LockStatusPill, LockBanner toe
2. AssetContentViewer — wrap gevulde content in <LockOverlay>
3. AI Analysis sectie — verbergen bij lock: {visibility.showAITools && (...)}
4. Regenerate knop — verbergen bij lock
5. Status dropdown — disabled bij lock
6. AssetCard — <CardLockIndicator>
7. AssetOverflowMenu — Lock/Unlock optie

Gebruik exact dezelfde hooks: useLockState + useLockVisibility

git add -A && git commit -m "feat(lock): integrate lock/unlock into brand assets module" && git push origin main
```

---

## Fase 5 — Products, Strategies & Campaigns

**Wanneer:** ▶️ Na fase 2 (kan parallel met fase 3 + 4)
**Afhankelijkheden:** Fase 1 + 2
**Git branch:** `feature/lock-unlock-remaining-modules`

### Per Module

**Product Detail Page:**
- Header: `<LockShield>` + `<LockStatusPill>`
- `<LockBanner>` boven content
- Gevulde secties (features, benefits, pricing): `<LockOverlay>`
- Lege secties: verbergen bij lock
- Persona koppeling: `disabled={!canEdit}`
- AI Analysis: verbergen bij lock

**Strategy Detail Page:**
- Zelfde patroon als Product
- Strategy content editor: read-only bij lock
- Status dropdown: disabled

**Campaign Detail Page:**
- Zelfde patroon
- Deliverables toevoegen: `disabled={!canEdit}`
- Strategy genereren: verbergen bij lock
- Content Studio link: verbergen bij lock (content creatie)

### Claude Code Prompt — Fase 5

```
Integreer lock/unlock in Products, Strategies en Campaigns. Kopieer het patroon van Persona + Brand Assets.

1. PRODUCT DETAIL PAGE:
   - useLockState + useLockVisibility hooks
   - LockShield + LockStatusPill in header
   - LockBanner boven content
   - Gevulde secties: LockOverlay
   - Lege secties: verbergen bij lock
   - AI analyse: verbergen bij lock
   - Persona koppeling: disabled={!canEdit}

2. STRATEGY DETAIL PAGE:
   - Zelfde patroon
   - Content editor: readOnly={isLocked}
   - Status dropdown: disabled bij lock

3. CAMPAIGN DETAIL PAGE:
   - Zelfde patroon
   - Deliverables toevoegen: disabled={!canEdit}
   - Strategy genereren: verbergen bij lock
   - Content creatie links: verbergen bij lock

4. OVERVIEW PAGINAS:
   - ProductCard, StrategyCard, CampaignCard: + <CardLockIndicator>

git add -A && git commit -m "feat(lock): integrate lock/unlock into products, strategies, campaigns" && git push origin main
```

---

## Fase 6 — Polish & Edge Cases

**Wanneer:** ▶️ Na fase 3, 4 en 5 (alle modules geïntegreerd)
**Afhankelijkheden:** Fase 3 + 4 + 5
**Git branch:** `feature/lock-unlock-polish`

### 6A. Centraal 423 Error Handling

```typescript
// src/lib/api/client.ts
if (res.status === 423) {
  toast.error('Item is vergrendeld', {
    description: data.error || 'Ontgrendel het item om wijzigingen te maken.',
  });
  throw new LockError(data.error);
}
```

### 6B. Edge Cases

| Case | Oplossing |
|------|----------|
| Bulk delete met locked items | Skip locked, toon toast: "X van Y items overgeslagen (vergrendeld)" |
| Duplicate locked item | Maakt UNLOCKED kopie (expliciet `isLocked: false`) |
| Locked item in search results | Toon `<CardLockIndicator>` in zoekresultaten |
| API race condition | Lock guard checkt `isLocked` direct voor elke mutatie |
| Concurrent unlock | Last-write-wins, UI refresht via `onLockChange` callback |

### 6C. Accessibility

| Element | A11y |
|---------|------|
| `<LockShield>` | `aria-label="Vergrendel/Ontgrendel {naam}"`, `aria-pressed={isLocked}` |
| `<LockBanner>` | `role="status"`, `aria-live="polite"` |
| `<LockOverlay>` | `aria-disabled="true"` op interactieve children |
| `<LockConfirmDialog>` | Focus trap, `role="alertdialog"`, Escape to close |
| Verborgen secties | `aria-hidden="true"` (geen screen reader noise) |

### 6D. Dark Mode

Alle componenten gebruiken Tailwind `dark:` classes. Verificatie:
- Amber kleuren goed leesbaar op donkere achtergrond
- Emerald kleuren contrastrijk genoeg
- Overlay niet te zwaar op donkere cards
- Banner glassmorphism werkt in dark mode

### Claude Code Prompt — Fase 6

```
Polish en edge cases voor het lock/unlock systeem.

1. CENTRAAL 423 HANDLING — update src/lib/api/client.ts:
   - Intercepteer HTTP 423 responses
   - toast.error met "Item is vergrendeld" + beschrijving
   - Throw LockError class
   - Alle bestaande fetch/mutation helpers gebruiken dit automatisch

2. EDGE CASES:
   - Bulk delete: skip locked items, toon toast "X overgeslagen (vergrendeld)"
   - Duplicate: altijd isLocked: false op nieuwe kopie
   - Search results: CardLockIndicator tonen
   - Loading states: disable LockShield tijdens API call

3. ACCESSIBILITY:
   - LockShield: aria-label, aria-pressed
   - LockBanner: role="status", aria-live="polite"
   - LockOverlay: aria-disabled op children
   - LockConfirmDialog: focus trap, role="alertdialog", Escape close
   - Verborgen secties: aria-hidden="true"
   - Keyboard navigation: Tab door alle lock controls

4. DARK MODE VERIFICATIE:
   - Test alle lock componenten in dark mode
   - Fix contrast issues als die er zijn
   - Overlay opacity aanpassen indien nodig

5. ANIMATIE PERFORMANCE:
   - will-change: transform op animated elementen
   - Reduce motion: respecteer prefers-reduced-motion
   - Lazy mount: LockConfirmDialog alleen renderen als showConfirm true is

git add -A && git commit -m "feat(lock): polish, edge cases, a11y, dark mode" && git push origin main
```

---

## Samenvatting — Wanneer Wat Draaien

```
         Week 1                              Week 1 (vervolg)
    ┌─────────────┐                     ┌──────────────────────┐
    │   FASE 1    │─────────────────────│      FASE 2          │
    │  Database   │  afhankelijkheid    │   UI Components      │
    │  & API      │                     │   & Hooks            │
    └─────────────┘                     └──────────┬───────────┘
                                                   │
                                    ┌──────────────┼──────────────┐
                                    ▼              ▼              ▼
                              ┌──────────┐  ┌──────────┐  ┌──────────┐
                              │  FASE 3  │  │  FASE 4  │  │  FASE 5  │
                              │ Personas │  │  Assets  │  │ Products │
                              │          │  │          │  │ Strategy │
                              │          │  │          │  │ Campaign │
                              └────┬─────┘  └────┬─────┘  └────┬─────┘
                                   │              │              │
                                   └──────────────┼──────────────┘
                                                  ▼
                                           ┌──────────┐
                                           │  FASE 6  │
                                           │  Polish  │
                                           │  & QA    │
                                           └──────────┘
```

| Scenario | Aanpak |
|----------|--------|
| **Solo (1 worker)** | Fase 1 → 2 → 3 → 4 → 5 → 6 sequentieel |
| **2 workers** | Worker A: Fase 1 → 2 → 3 → 6. Worker B: (wacht op fase 2) → 4 → 5 |
| **3 workers** | Worker A: Fase 1 → 2. Worker B: → 3. Worker C: → 4 + 5. Daarna: → 6 |

---

## Checklist

- [ ] **Fase 1:** Prisma migratie succesvol
- [ ] **Fase 1:** Lock guard op ~30 routes
- [ ] **Fase 1:** 3 nieuwe lock endpoints
- [ ] **Fase 2:** 6 componenten gebouwd en werkend
- [ ] **Fase 2:** useLockState + useLockVisibility hooks
- [ ] **Fase 2:** framer-motion geïnstalleerd
- [ ] **Fase 3:** Persona detail page volledig geïntegreerd
- [ ] **Fase 3:** Verborgen secties werken bij lock
- [ ] **Fase 3:** PersonaCard met lock indicator
- [ ] **Fase 4:** Brand Assets geïntegreerd
- [ ] **Fase 5:** Products, Strategies, Campaigns geïntegreerd
- [ ] **Fase 6:** Centraal 423 handling
- [ ] **Fase 6:** Edge cases afgehandeld
- [ ] **Fase 6:** Accessibility compleet
- [ ] **Fase 6:** Dark mode geverifieerd
