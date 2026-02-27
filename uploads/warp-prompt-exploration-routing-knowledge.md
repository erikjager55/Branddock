Voer de volgende twee taken uit in volgorde.

---

## TAAK 1: Fix Brand Asset AI Exploration routing

### Probleem
Wanneer je bij een Brand Asset op "AI Exploration" klikt, knippert het scherm en keert het terug naar Brand Foundation. Dit komt door een routing conflict in App.tsx.

### Root Cause
In `App.tsx` → `renderContent()` staat een blok dat checkt op `selectedResearchOption === 'ai-exploration'`. Dat blok:
1. Checkt of de method "unlocked" is via `isMethodUnlocked()`
2. AI Exploration is NIET unlocked in het research plan systeem (het is gratis, geen plan nodig)
3. Dus het redirect naar `StrategicResearchPlanner`
4. Die navigeert weer terug → loop/knippering

### Fix
Zoek in `src/App.tsx` in de `renderContent()` functie het blok dat checkt op `selectedResearchOption` voor brand assets. Het staat NA het `viewingAssetResults` blok en VOOR de deprecated fallback.

Er zijn twee dingen om te fixen:

**Fix A: AI Exploration moet ALTIJD toegankelijk zijn (geen unlock check)**

Zoek het blok dat er zo uitziet (de exacte code kan iets anders zijn door eerdere wijzigingen):

```tsx
if (activeSection.startsWith('brand-') && selectedAssetId && selectedResearchOption) {
  // Special handling for AI Exploration - use dedicated page
  if (selectedResearchOption === 'ai-exploration') {
    return (
      <AIExplorationPage ... />  // OF <AIBrandAssetExplorationPage ... />
    );
  }
  
  // Check if method is unlocked...
  const methodUnlocked = isMethodUnlocked(selectedResearchOption);
  if (!methodUnlocked && !isMethodCompleted) {
    return <StrategicResearchPlanner ... />;
  }
  ...
}
```

De fix is: zorg dat het `ai-exploration` blok VÓÓR de unlock check staat EN dat het `AIBrandAssetExplorationPage` gebruikt (niet `AIExplorationPage`). De component moet zijn:

```tsx
if (activeSection.startsWith('brand-') && selectedAssetId && selectedResearchOption) {
  // AI Exploration is always accessible (free method, no unlock needed)
  if (selectedResearchOption === 'ai-exploration') {
    return (
      <AIBrandAssetExplorationPage
        assetId={selectedAssetId}
        onBack={() => {
          setSelectedResearchOption(null);
          setViewingAssetResults(true);
        }}
      />
    );
  }
  
  // ... rest van de unlock checks voor andere methods
}
```

**Fix B: Import toevoegen**

Zorg dat `AIBrandAssetExplorationPage` geïmporteerd is in `App.tsx`. Check eerst of het al geïmporteerd is:

```bash
grep -n "AIBrandAssetExplorationPage" src/App.tsx
```

Als het ontbreekt, voeg toe:

```tsx
import { AIBrandAssetExplorationPage } from '@/features/brand-asset-detail/components/ai-exploration/AIBrandAssetExplorationPage';
```

OF als er een lazy import systeem is (check `src/lib/lazy-imports.ts`), gebruik die:

```tsx
// In lazy-imports.ts staat al:
export const AIBrandAssetExplorationPage = lazy(() =>
  import('@/features/brand-asset-detail/components/ai-exploration/AIBrandAssetExplorationPage').then(m => ({ default: m.AIBrandAssetExplorationPage }))
);
```

Dan in App.tsx de lazy import gebruiken in plaats van een directe import.

**Fix C: Navigatie vanuit BrandAssetDetailPage**

Check ook hoe de BrandAssetDetailPage naar exploration navigeert. Zoek:

```bash
grep -n "ai-exploration\|onNavigateToAIExploration\|handleStartResearch" src/features/brand-asset-detail/components/BrandAssetDetailPage.tsx
```

Als BrandAssetDetailPage een eigen navigatie doet (bijv. via `onStartResearch` prop), zorg dat die correct `selectedResearchOption` op `'ai-exploration'` zet. De flow moet zijn:

1. User klikt "Start" bij AI Exploration research method card
2. `onStartResearch('ai-exploration')` wordt aangeroepen
3. In App.tsx: `handleNavigateToResearchMethod(assetId, 'AI_EXPLORATION', 'work')`
4. Dat zet `selectedResearchOption = 'ai-exploration'` (via `getResearchOptionId`)
5. renderContent() matcht op `selectedResearchOption === 'ai-exploration'`
6. Rendert `AIBrandAssetExplorationPage`

Check `getResearchOptionId` om te verifiëren dat `'AI_EXPLORATION'` mapt naar `'ai-exploration'`:

```bash
grep -n "getResearchOptionId" src/App.tsx
```

---

## TAAK 2: Custom Knowledge Library per ExplorationConfig

### Doel
Gebruikers moeten handmatig contextuele informatie kunnen toevoegen per exploration configuratie — een kennisbibliotheek die buiten de standaard context sources valt.

### Schema wijziging

Voeg een nieuw veld toe aan het `ExplorationConfig` model in `prisma/schema.prisma`:

```prisma
model ExplorationConfig {
  // ... bestaande velden ...
  
  // Custom knowledge library — handmatig toegevoegde context per config
  customKnowledge    ExplorationKnowledgeItem[]
}
```

En maak een nieuw model:

```prisma
model ExplorationKnowledgeItem {
  id                String   @id @default(cuid())
  title             String
  content           String   @db.Text
  category          String?  // bijv. "Marktonderzoek", "Concurrentie", "Doelgroep", "Strategie"
  
  configId          String
  config            ExplorationConfig @relation(fields: [configId], references: [id], onDelete: Cascade)
  
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt
  
  @@index([configId])
}
```

Run daarna:

```bash
npx prisma db push
npx prisma generate
```

### API Routes

Maak CRUD endpoints voor knowledge items:

**`src/app/api/admin/exploration-configs/[id]/knowledge/route.ts`:**

GET: Haal alle knowledge items op voor een config
```tsx
const items = await prisma.explorationKnowledgeItem.findMany({
  where: { configId: id },
  orderBy: { createdAt: 'desc' },
});
return NextResponse.json({ items });
```

POST: Maak een nieuw knowledge item aan
```tsx
const { title, content, category } = await request.json();
const item = await prisma.explorationKnowledgeItem.create({
  data: { configId: id, title, content, category },
});
return NextResponse.json({ item }, { status: 201 });
```

**`src/app/api/admin/exploration-configs/[id]/knowledge/[itemId]/route.ts`:**

PUT: Update een knowledge item
DELETE: Verwijder een knowledge item

### Admin UI uitbreiding

In de `AdministratorTab.tsx` (of een apart detail/edit scherm):

Voeg per config card een sectie "Kennisbibliotheek" toe met:
- Een lijst van bestaande items (titel, categorie badge, preview van content)
- "Item toevoegen" knop die een form opent met:
  - Titel (text input, verplicht)
  - Categorie (select: Marktonderzoek, Concurrentie, Doelgroep, Strategie, Intern, Anders)
  - Inhoud (textarea, verplicht, maximaal 10.000 karakters)
- Per item: bewerken en verwijderen knoppen
- Items tonen een preview van de eerste 150 karakters

### Integratie met exploration prompts

In de `resolveExplorationConfig` of `prompt-engine` moet de custom knowledge meegenomen worden in de AI context. Voeg een stap toe die alle `ExplorationKnowledgeItem` records voor de config ophaalt en ze als extra context toevoegt aan de systemPrompt:

```tsx
// In de prompt resolver/engine:
const knowledgeItems = await prisma.explorationKnowledgeItem.findMany({
  where: { configId: config.id },
});

if (knowledgeItems.length > 0) {
  const knowledgeContext = knowledgeItems
    .map(item => `### ${item.title}${item.category ? ` (${item.category})` : ''}\n${item.content}`)
    .join('\n\n');
  
  // Voeg toe aan de template variabelen:
  templateVars.customKnowledge = knowledgeContext;
}
```

En in de seed systemPrompt, voeg de variabele toe:

```
{{brandContext}}

{{#if customKnowledge}}
## Aanvullende Kennisbibliotheek
De volgende handmatig toegevoegde informatie is relevant voor deze analyse:

{{customKnowledge}}
{{/if}}
```

Of simpeler, als de template engine geen conditionals ondersteunt:

```
{{brandContext}}

{{customKnowledge}}
```

(Lege string als er geen items zijn)

### Verificatie
- [ ] ExplorationKnowledgeItem model aangemaakt (`npx prisma db push`)
- [ ] CRUD API routes werken (GET/POST/PUT/DELETE)
- [ ] Admin UI toont "Kennisbibliotheek" sectie per config
- [ ] Items kunnen worden toegevoegd, bewerkt en verwijderd
- [ ] Custom knowledge wordt meegegeven als context in exploration prompts
- [ ] Brand Asset exploration start correct (geen knippering meer)
- [ ] TypeScript 0 errors
- [ ] `git add -A && git commit -m "feat: brand asset exploration routing fix + custom knowledge library" && git push origin main`
