# Overdracht: Branddock AI Exploration Configuration — Sessie 2026-03-03

## Samenvatting van deze sessie

In deze sessie zijn drie grote problemen opgelost en is de AI Exploration config architectuur fundamenteel verbeterd:

### 1. Versioning triggers toegevoegd aan ontbrekende routes ✅
Drie routes misten `createVersion` calls:
- **`src/app/api/brand-assets/[id]/framework/route.ts`** — PATCH route kreeg MANUAL_SAVE snapshot
- **`src/app/api/exploration/[itemType]/[itemId]/sessions/[sessionId]/complete/route.ts`** — AI_GENERATED snapshot na session complete
- **`src/app/api/personas/[id]/lock/route.ts`** — LOCK_BASELINE snapshot bij lock

### 2. AI Exploration subtype doorgifte gefixt ✅
**Root cause**: De analyze route gebruikte `item.slug` als subtype, maar brand assets hebben geen slug — ze hebben `frameworkType` (bijv. `GOLDEN_CIRCLE`).

**Oplossing**: `resolveItemSubType()` functie in `src/lib/ai/exploration/constants.ts` met een mapping:
```typescript
const FRAMEWORK_TO_SUBTYPE: Record<string, string> = {
  'PURPOSE_WHEEL': 'purpose-statement',
  'GOLDEN_CIRCLE': 'golden-circle',
  'BRAND_ESSENCE': 'brand-essence',
  // ... etc voor alle 11 types
};
```

Dit wordt gebruikt in `src/app/api/exploration/[itemType]/[itemId]/analyze/route.ts`:
```typescript
const itemSubType = resolveItemSubType(item as Record<string, unknown>);
const explorationConfig = await resolveExplorationConfig(workspaceId, itemType, itemSubType);
```

### 3. Progress bar gesynchroniseerd met backend config ✅
**Probleem**: Vragen kwamen uit DB config (correcte volgorde), maar progress bar labels waren hardcoded in frontend.

**Oplossing**: Backend slaat dimensies op in sessie metadata bij aanmaken. Frontend leest ze uit en gebruikt ze voor de progress bar. Fallback naar `getDimensionsForSlug()` als metadata ontbreekt.

---

## Huidige staat van de codebase

### ExplorationConfig records in DB (13 totaal)
| # | Label | itemType | itemSubType |
|---|-------|----------|-------------|
| 0 | Golden Circle — WHY → HOW → WHAT | brand_asset | golden-circle |
| 1 | Social Relevancy — Purpose & Impact | brand_asset | social-relevancy |
| 2 | Purpose Statement — Bestaansrecht | brand_asset | purpose-statement |
| 3 | Brand Essence — Core Identity | brand_asset | brand-essence |
| 4 | Brand Promise — Core Commitment | brand_asset | brand-promise |
| 5 | Mission Statement — Purpose & Direction | brand_asset | mission-statement |
| 6 | Vision Statement — Future State | brand_asset | vision-statement |
| 7 | Brand Archetype — Narrative Identity | brand_asset | brand-archetype |
| 8 | Transformative Goals — Change & Impact | brand_asset | transformative-goals |
| 9 | Brand Personality — Character & Voice | brand_asset | brand-personality |
| 10 | Brand Story — Origin & Narrative | brand_asset | brand-story |
| 11 | Brandhouse Values — Core Values & Culture | brand_asset | brandhouse-values |
| 12 | Persona Exploration | persona | (null) |

Alle 12 brand asset types + 1 persona hebben nu DB configs. De vragen zijn gegenereerd op basis van system defaults en moeten nog per type verfijnd worden.

### Admin UI verbeteringen ✅ (volledig geïmplementeerd)
- ✅ Sub Type is nu een dropdown i.p.v. vrij tekstveld (gefilterd per Item Type)
- ✅ "EDITING" badge bij edit modus (header + sticky bar)
- ✅ "Dimension 1 of 4" nummering
- ✅ Up/down pijlen voor dimensie reordering
- ✅ Grip handle icoon per dimensie
- ✅ Collapsible accordeon secties (6 secties, standaard open/dicht)
- ✅ Preview modal (`ExplorationConfigPreviewModal.tsx`, 581 regels) — 2 modes (Chat Flow & Overview), interactieve progress bar, dimensie-selectie
- ✅ Sticky save/cancel bar onderaan (vaste footer met Preview/Cancel/Save buttons + EDITING badge)
- ✅ Kennisbronnen sectie (`KnowledgeLibrarySection.tsx`, 315 regels) — CRUD voor custom knowledge per config

**Niet geïmplementeerd (bewuste keuze):**
- ❌ Drag & drop — up/down pijlen werken als alternatief, @dnd-kit niet geïnstalleerd

---

## Belangrijke bestanden

### Backend — Config architectuur
| Bestand | Functie |
|---------|---------|
| `src/lib/ai/exploration/config-resolver.ts` | Resolvet DB config → system defaults fallback. Bevat `getDefaultDimensions()` met specifieke vragen per subtype |
| `src/lib/ai/exploration/constants.ts` | `FRAMEWORK_TO_SUBTYPE` mapping + `resolveItemSubType()` functie |
| `src/lib/ai/exploration/builders/brand-asset-builder.ts` | Builder voor rapport generatie + field suggestions |
| `src/lib/ai/exploration/exploration-llm.ts` | LLM communicatie voor feedback en rapport |
| `src/lib/ai/exploration/item-type-registry.ts` | Registry die persona/brand_asset configs koppelt |
| `src/lib/ai/exploration/prompt-engine.ts` | Template resolver voor prompts |

### Backend — API routes
| Route | Functie |
|-------|---------|
| `src/app/api/exploration/[itemType]/[itemId]/analyze/route.ts` | **POST** — Start nieuwe sessie. Resolvet config, maakt sessie + eerste messages |
| `src/app/api/exploration/[itemType]/[itemId]/sessions/[sessionId]/answer/route.ts` | **POST** — Verwerk gebruikersantwoord, genereer feedback + volgende vraag |
| `src/app/api/exploration/[itemType]/[itemId]/sessions/[sessionId]/complete/route.ts` | **POST** — Genereer rapport + field suggestions + versie snapshot |
| `src/app/api/admin/exploration-configs/route.ts` | **GET/POST** — CRUD voor admin configs |
| `src/app/api/admin/exploration-configs/[id]/route.ts` | **GET/PATCH/DELETE** — Individuele config CRUD |

### Frontend — Components
| Bestand | Functie |
|---------|---------|
| `src/components/ai-exploration/AIExplorationPage.tsx` | Gedeelde exploration page (chat + progress bar) |
| `src/components/ai-exploration/AIExplorationChatInterface.tsx` | Chat UI met vraag/antwoord bubbles |
| `src/components/ai-exploration/AIExplorationSuggestions.tsx` | Suggesties weergave (Accept/Edit/Dismiss per veld) |
| `src/components/ai-exploration/AIExplorationReport.tsx` | Rapport weergave |
| `src/features/brand-asset-detail/components/ai-exploration/AIBrandAssetExplorationPage.tsx` | Brand asset-specifieke wrapper. Gebruikt `getDimensionsForSlug()` als fallback voor progress bar |
| `src/features/brand-asset-detail/constants/brand-asset-exploration-config.ts` | Frontend dimensie configs per framework type (icon, color, labels). Bevat `getDimensionsForSlug()` |
| `src/features/settings/components/administrator/ExplorationConfigEditor.tsx` | Admin UI voor configs (509+ regels, sticky bar, accordeons) |
| `src/features/settings/components/administrator/ExplorationConfigPreviewModal.tsx` | Preview modal (581 regels, Chat Flow + Overview modes) |
| `src/features/settings/components/administrator/KnowledgeLibrarySection.tsx` | Kennisbronnen CRUD per config (315 regels) |
| `src/features/settings/components/administrator/AdministratorTab.tsx` | Container voor admin tab in settings |
| `src/components/shared/ItemKnowledgeSources.tsx` | Herbruikbare knowledge sources component (384 regels) |

### Database schema (relevant)
- **ExplorationConfig** — Workspace-level config per itemType + itemSubType. Bevat dimensions (JSON), prompts, model settings
- **ExplorationSession** — Individuele sessie per item. Status: IN_PROGRESS / COMPLETED. Bevat metadata met dimensions
- **ExplorationMessage** — Messages binnen sessie (SYSTEM_INTRO, AI_QUESTION, USER_ANSWER, AI_FEEDBACK)
- **BrandAssetResearchMethod** — Koppeling tussen asset en validatie methode (AI_EXPLORATION status tracking)

---

## Config resolver prioriteit

De `resolveExplorationConfig()` functie in `config-resolver.ts` werkt met deze prioriteit:
1. **DB config met exact match** (workspace + itemType + itemSubType) → bijv. `brand_asset` + `golden-circle`
2. **DB config met alleen type** (workspace + itemType, subtype null) → fallback
3. **System defaults** → `getSystemDefault()` + `getDefaultDimensions()`

DB configs zijn nu leidend. System defaults dienen alleen als fallback voor types waarvoor geen DB config bestaat.

---

## Wat nu gedaan moet worden

### ~~Prioriteit 1: Admin UI verfijnen~~ ✅ AFGEROND
~~Preview modal~~ en ~~sticky save/cancel bar~~ zijn beide geïmplementeerd:
- Preview modal: `ExplorationConfigPreviewModal.tsx` (581 regels, Chat Flow + Overview modes)
- Sticky bar: vaste footer in `ExplorationConfigEditor.tsx` (regels 591-662)

### Prioriteit 1: Vragen per asset type verfijnen
Alle 12 brand asset configs hebben nu generieke vragen. Per type moeten de vragen inhoudelijk kloppen met het framework:

- **Golden Circle**: WHY/HOW/WHAT vragen (al goed, volgorde aangepast in backend)
- **Purpose Statement**: Purpose Wheel methodologie (IDEO) — al redelijk
- **Brand Essence**: Moet gaan over kern-identiteit, emotionele connectie
- **Brand Promise**: Commitment, bewijs, gaps
- **Mission Statement**: Richting, doelgroep, aanpak
- **Vision Statement**: Toekomstbeeld, ambitie, stakeholder relevantie
- **Brand Archetype**: Jung archetypes, schaduwzijde, storytelling
- **Transformative Goals**: Gewenste transformatie, barrières, enablers
- **Brand Personality**: Aaker dimensies, tone of voice, relatiestijl
- **Brand Story**: Origin, struggle, keerpunt, volgende hoofdstuk
- **Brandhouse Values**: Kernwaarden, geleefde waarden, spanningen
- **Social Relevancy**: Purpose, mens, milieu, maatschappij (al goed)

### Prioriteit 2: Field suggestions mapping per type
De `brand-asset-builder.ts` genereert field suggestions dynamisch uit frameworkData. Check of dit correct werkt voor alle 11 framework types — sommige hebben geneste structuren (bijv. Brand Archetype met traits array, Brand Personality met Aaker dimensies).

---

## Technische aandachtspunten

### Tailwind CSS purging
Custom color classes (`bg-teal-100`, `text-amber-600`) worden gepurged door Tailwind als ze dynamisch worden samengesteld. Gebruik altijd een lookup object:
```typescript
// ❌ FOUT - wordt gepurged
`bg-${color}-100`

// ✅ GOED - lookup
const BG_MAP = { teal: 'bg-teal-100', amber: 'bg-amber-100', ... };
BG_MAP[color]
```

Hetzelfde geldt voor `min-h-0` — gebruik `style={{ minHeight: 0 }}` als inline style.

### Session verwijderen voor re-test
Om een AI Exploration opnieuw te testen met bijgewerkte config, moeten zowel de sessie records ALS de research method records verwijderd worden:
```
Verwijder alle ExplorationSession + ExplorationMessage + BrandAssetResearchMethod (methodType: 'AI_EXPLORATION') voor het betreffende asset.
```
Anders toont de UI "View Results" i.p.v. "+ Start".

### Node.js scripts uitvoeren
In de terminal werkt `npx tsx` niet goed met Prisma. Gebruik Claude Code voor database scripts — die heeft de juiste import paden.

### Git workflow
Na elke Claude Code operatie:
```bash
git add -A && git commit -m "descriptieve message" && git push origin main
```

---

## Recente commits (relevant)
```
cf7da61 feat(exploration): add asset-specific dimensions for all 11 brand asset types + improve config editor UI
bfb2fc2 fix(versioning): add createVersion to framework PATCH, exploration complete, and persona lock routes
8600910 fix(exploration): always use builder for report generation to fix fieldSuggestions
c696954 fix(ai-exploration): handle LLM field keys without frameworkData prefix in onApplyChanges
360ccff fix(ai-exploration): fix broken import + onApplyChanges with deep merge to /framework endpoint
```

Plus na deze sessie (check met `git log --oneline -5`):
- feat(exploration): sync progress bar labels with backend config dimension order
- fix(exploration): pass frameworkType as itemSubType for brand assets with mapping
- fix(exploration): use framework-specific dimensions for progress bar labels
- feat(exploration): seed DB configs for all brand asset types
- chore: clear golden circle exploration sessions for re-test

---

## End-to-end flow (bewezen werkend)

1. Admin configureert vragen + volgorde in Settings > AI Configuration
2. Gebruiker opent brand asset detail page (bijv. Golden Circle)
3. Klikt "+ Start" bij AI Exploration onder Validation Methods
4. Backend resolvet config → maakt sessie met juiste vragen + volgorde
5. Frontend toont chat met vragen + progress bar met labels uit backend
6. Gebruiker beantwoordt alle vragen → backend genereert feedback per antwoord
7. Na laatste vraag: rapport wordt gegenereerd met field suggestions
8. Gebruiker reviewt suggestions → Accept/Edit/Dismiss per veld
9. "Apply Changes" → framework velden worden bijgewerkt
10. Versie snapshot wordt aangemaakt (AI_GENERATED type)
11. Asset detail page toont bijgewerkte content
