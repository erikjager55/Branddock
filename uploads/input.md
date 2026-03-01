# Claude Code Prompt — AI Exploration Configuration: Asset-Specific Dimensions + Improved Admin UI

## DEEL 1: System Defaults voor alle Brand Asset Types

### Bestand: `src/lib/ai/exploration/config-resolver.ts`

Voeg in de functie `getDefaultDimensions()` specifieke dimensies toe voor ELKE brand asset subtype. Plaats ze VÓÓR de generieke fallback `return [...]` onderaan.

De `itemSubType` waarden matchen de slug-versie van het framework type. Check hoe de exploration page het subtype bepaalt:
```bash
grep -rn "subType\|itemSubType\|frameworkType" src/features/brand-asset-detail/components/ai-exploration/ --include="*.tsx" | head -10
grep -rn "subType\|itemSubType" src/lib/ai/exploration/builders/brand-asset-builder.ts | head -10
```

Gebruik die mapping om de juiste subType slugs te bepalen. Voeg dan deze dimensies toe:

#### Golden Circle (`golden-circle`)
```typescript
if (itemType === 'brand_asset' && itemSubType === 'golden-circle') {
  return [
    { key: 'why', title: 'WHY — Core Belief', icon: 'Heart', question: 'Why does your organization exist? What is the fundamental belief that drives everything you do?' },
    { key: 'how', title: 'HOW — Unique Approach', icon: 'Settings', question: 'How do you bring your WHY to life? What processes, values, or methods make your approach unique?' },
    { key: 'what', title: 'WHAT — Offering', icon: 'Package', question: 'What exactly do you offer? How do your products or services prove your WHY and HOW?' },
    { key: 'coherence', title: 'Inside-Out Coherence', icon: 'Target', question: 'How consistently does your organization communicate from WHY → HOW → WHAT? Where are the gaps?' },
  ];
}
```

#### Brand Essence (`brand-essence`)
```typescript
if (itemType === 'brand_asset' && itemSubType === 'brand-essence') {
  return [
    { key: 'core_identity', title: 'Core Identity', icon: 'Fingerprint', question: 'If your brand were a person, how would you describe their essential character in one sentence?' },
    { key: 'emotional_connection', title: 'Emotional Connection', icon: 'Heart', question: 'What emotion should people feel every time they interact with your brand?' },
    { key: 'differentiation', title: 'Unique DNA', icon: 'Sparkles', question: 'What makes your brand fundamentally different from everything else in your category?' },
    { key: 'consistency', title: 'Essence in Action', icon: 'Layers', question: 'Where does your brand essence show up most clearly — and where does it get lost?' },
  ];
}
```

#### Brand Promise (`brand-promise`)
```typescript
if (itemType === 'brand_asset' && itemSubType === 'brand-promise') {
  return [
    { key: 'commitment', title: 'Core Commitment', icon: 'Shield', question: 'What is the one promise your brand makes to every customer, every time?' },
    { key: 'proof', title: 'Proof & Delivery', icon: 'CheckCircle', question: 'How do you consistently deliver on this promise? What evidence can customers point to?' },
    { key: 'gap_analysis', title: 'Promise Gap', icon: 'AlertTriangle', question: 'Where is the biggest gap between what you promise and what customers actually experience?' },
    { key: 'evolution', title: 'Future Promise', icon: 'TrendingUp', question: 'How should your brand promise evolve as your market and customers change?' },
  ];
}
```

#### Mission Statement (`mission-statement`)
```typescript
if (itemType === 'brand_asset' && itemSubType === 'mission-statement') {
  return [
    { key: 'purpose', title: 'Purpose & Direction', icon: 'Compass', question: 'What is your organization trying to achieve right now? What is the primary mission?' },
    { key: 'audience', title: 'Who You Serve', icon: 'Users', question: 'Who are the primary beneficiaries of your mission? How does it improve their lives?' },
    { key: 'approach', title: 'How You Deliver', icon: 'Rocket', question: 'What is your unique approach to fulfilling this mission? What sets your method apart?' },
    { key: 'measurement', title: 'Impact & Measurement', icon: 'BarChart2', question: 'How do you know if your mission is succeeding? What does progress look like?' },
  ];
}
```

#### Vision Statement (`vision-statement`)
```typescript
if (itemType === 'brand_asset' && itemSubType === 'vision-statement') {
  return [
    { key: 'future_state', title: 'Future State', icon: 'Telescope', question: 'What does the world look like when your organization has fully succeeded? Paint the picture.' },
    { key: 'ambition', title: 'Scale of Ambition', icon: 'Mountain', question: 'How ambitious is your vision? Does it inspire people to go beyond what seems possible today?' },
    { key: 'relevance', title: 'Stakeholder Relevance', icon: 'Users', question: 'How does this vision connect to what your employees, customers, and partners care about?' },
    { key: 'pathway', title: 'Vision to Action', icon: 'Map', question: 'What are the key milestones between today and your vision? What needs to happen first?' },
  ];
}
```

#### Brand Archetype (`brand-archetype`)
```typescript
if (itemType === 'brand_asset' && itemSubType === 'brand-archetype') {
  return [
    { key: 'archetype_fit', title: 'Archetype Identity', icon: 'Crown', question: 'Which archetype best represents your brand — and why? What traits does your brand naturally embody?' },
    { key: 'behavior', title: 'Archetypal Behavior', icon: 'Activity', question: 'How does this archetype show up in your brand's communication, products, and customer interactions?' },
    { key: 'shadow', title: 'Shadow Side', icon: 'Moon', question: 'What is the shadow side of your archetype? How do you avoid falling into those negative patterns?' },
    { key: 'storytelling', title: 'Narrative Power', icon: 'BookOpen', question: 'How does your archetype shape the stories you tell? What recurring narrative themes define your brand?' },
  ];
}
```

#### Transformative Goals (`transformative-goals`)
```typescript
if (itemType === 'brand_asset' && itemSubType === 'transformative-goals') {
  return [
    { key: 'transformation', title: 'Desired Transformation', icon: 'Sparkles', question: 'What fundamental change does your brand want to create in people's lives or in the world?' },
    { key: 'barriers', title: 'Barriers to Change', icon: 'Shield', question: 'What stands in the way of this transformation? What obstacles do your customers face?' },
    { key: 'enablers', title: 'How You Enable', icon: 'Zap', question: 'How does your brand specifically help people overcome these barriers and achieve transformation?' },
    { key: 'evidence', title: 'Transformation Evidence', icon: 'Award', question: 'What evidence exists that your brand has already created this transformation? Share concrete examples.' },
  ];
}
```

#### Brand Personality (`brand-personality`)
```typescript
if (itemType === 'brand_asset' && itemSubType === 'brand-personality') {
  return [
    { key: 'traits', title: 'Core Traits', icon: 'User', question: 'If your brand were a person at a dinner party, how would other guests describe them? Name 3-5 key personality traits.' },
    { key: 'voice', title: 'Voice & Tone', icon: 'MessageCircle', question: 'How does your brand speak? What words would it use — and never use? What's the tone in different situations?' },
    { key: 'relationships', title: 'Relationship Style', icon: 'Heart', question: 'What kind of relationship does your brand build with people? A trusted advisor? A fun friend? A wise mentor?' },
    { key: 'boundaries', title: 'Personality Boundaries', icon: 'AlertCircle', question: 'What is your brand personality NOT? What traits would feel inauthentic or off-brand?' },
  ];
}
```

#### Brand Story (`brand-story`)
```typescript
if (itemType === 'brand_asset' && itemSubType === 'brand-story') {
  return [
    { key: 'origin', title: 'Origin Story', icon: 'BookOpen', question: 'How did your brand begin? What problem or moment sparked its creation?' },
    { key: 'struggle', title: 'Challenge & Struggle', icon: 'Mountain', question: 'What challenges has your brand overcome? What makes the journey compelling?' },
    { key: 'turning_point', title: 'Turning Point', icon: 'Star', question: 'What was the defining moment that shaped who your brand is today?' },
    { key: 'future_chapter', title: 'The Next Chapter', icon: 'ArrowRight', question: 'What is the next chapter of your brand story? Where is the narrative heading?' },
  ];
}
```

#### Brandhouse Values (`brandhouse-values`)
```typescript
if (itemType === 'brand_asset' && itemSubType === 'brandhouse-values') {
  return [
    { key: 'core_values', title: 'Core Values', icon: 'Heart', question: 'What are the 3-5 non-negotiable values that guide every decision in your organization?' },
    { key: 'lived_values', title: 'Values in Practice', icon: 'CheckCircle', question: 'How do these values show up in daily operations, hiring, and customer interactions?' },
    { key: 'tension', title: 'Value Tensions', icon: 'Scale', question: 'When have your values been tested? How do you handle conflicts between competing values?' },
    { key: 'cultural_fit', title: 'Cultural Expression', icon: 'Building', question: 'How do your values shape your internal culture? Would employees recognize these values in their daily work?' },
  ];
}
```

**BELANGRIJK:** Check hoe het `itemSubType` wordt doorgegeven aan de exploration session. Zoek in:
- `src/features/brand-asset-detail/components/ai-exploration/AIBrandAssetExplorationPage.tsx`
- `src/lib/ai/exploration/builders/brand-asset-builder.ts`

Het subtype moet overeenkomen met wat in de URL/config wordt meegegeven. Als het frameworkType in UPPER_SNAKE_CASE staat (bijv. `GOLDEN_CIRCLE`), converteer het dan naar kebab-case (`golden-circle`) in de builder voordat het als itemSubType wordt doorgegeven. Of pas de if-statements hierboven aan om de UPPER_SNAKE_CASE variant te matchen.

Verifieer met: `grep -rn "itemSubType" src/lib/ai/exploration/ --include="*.ts"`

---

## DEEL 2: Verbeter de ExplorationConfigEditor UI

### Bestand: `src/features/settings/components/administrator/ExplorationConfigEditor.tsx`

Verbeter de 509-regels editor met deze wijzigingen:

### 2A. Sub Type dropdown i.p.v. vrij tekstveld

Vervang het vrije tekstveld voor Sub Type door een dynamische dropdown die filtert op het geselecteerde Item Type.

```typescript
const SUB_TYPE_OPTIONS: Record<string, Array<{ value: string; label: string }>> = {
  brand_asset: [
    { value: 'purpose-statement', label: 'Purpose Statement' },
    { value: 'golden-circle', label: 'Golden Circle' },
    { value: 'brand-essence', label: 'Brand Essence' },
    { value: 'brand-promise', label: 'Brand Promise' },
    { value: 'mission-statement', label: 'Mission Statement' },
    { value: 'vision-statement', label: 'Vision Statement' },
    { value: 'brand-archetype', label: 'Brand Archetype' },
    { value: 'transformative-goals', label: 'Transformative Goals' },
    { value: 'brand-personality', label: 'Brand Personality' },
    { value: 'brand-story', label: 'Brand Story' },
    { value: 'brandhouse-values', label: 'Brandhouse Values' },
    { value: 'social-relevancy', label: 'Social Relevancy' },
  ],
  persona: [], // Personas have no sub types
};
```

Wanneer Item Type wijzigt, reset het Sub Type. Toon de dropdown alleen als er opties zijn voor het geselecteerde type.

### 2B. Betere visuele hiërarchie

Pas de layout aan:
- **Header sectie**: grotere titel, duidelijke edit/create modus indicator
- **Secties met accordeons**: gebruik `<details>` of een accordion pattern voor Dimensions, Prompts, Field Suggestions, Context Sources
- **Cards voor dimensies**: elke dimensie in een visueel afgebakende card met subtiele border en lichte achtergrond
- **Nummering**: toon "Dimension 1 of 4" i.p.v. alleen "Dimension 1"
- **Betere spacing**: meer padding tussen secties, duidelijkere groepering
- **Save/Cancel bar**: sticky onderaan het formulier zodat je niet hoeft te scrollen

### 2C. Drag & drop voor dimensies

Voeg drag & drop reordering toe voor dimensies:
- Gebruik een simpele aanpak: UP/DOWN knoppen naast elke dimensie (✅ minder complex dan echte drag & drop)
- Voeg een grip/handle icoon (GripVertical uit lucide-react) toe links van elke dimensie card
- Implementeer move-up en move-down handlers die de array index swappen

Als er al een drag & drop library beschikbaar is (check package.json voor `@dnd-kit` of `react-beautiful-dnd`), gebruik die. Anders gebruik UP/DOWN knoppen.

### 2D. Preview van exploration vragen

Voeg een "Preview" knop toe naast de Save knop die een modal/drawer opent met:
- De welkomstboodschap
- Alle dimensies met hun vragen in een chat-achtige layout (AI bubble voor vraag)
- Progress bar simulatie
- Toon hoe het er uitziet voor de eindgebruiker

Gebruik dezelfde styling als de echte `AIExplorationChat` component voor consistentie.

---

## VERIFICATIE

1. Ga naar Settings > AI Configuration
2. Open de Purpose Statement config → check dat de UI verbeterd is
3. Maak een NIEUWE config aan voor Golden Circle:
   - Item Type: Brand Asset
   - Sub Type: golden-circle (uit dropdown)
   - Check dat de 4 dimensies specifiek voor Golden Circle zijn
4. Start een AI Exploration voor Golden Circle
5. Verifieer dat de vragen nu Golden Circle-specifiek zijn (WHY/HOW/WHAT/Coherence)
6. Test de preview functionaliteit

## GIT
```bash
git add -A && git commit -m "feat(exploration): add asset-specific dimensions for all 11 brand asset types + improve config editor UI" && git push origin main
```