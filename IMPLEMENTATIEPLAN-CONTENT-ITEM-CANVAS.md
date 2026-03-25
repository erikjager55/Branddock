# Implementatieplan: Content Item Canvas

> De werkbank waar strategie, creatie en publicatie samenkomen per content item.

---

## 1. Positie in het systeem

### Huidige flow
```
Campaign Wizard (6 stappen)
  → Campaign Detail (overzicht + deliverables lijst)
    → Content Studio (3-kolom editor per deliverable)
```

### Nieuwe flow
```
Campaign Wizard (6 stappen)
  → Campaign Timeline (met journey-fases en weekplanning)
    → "Bring to Life" (per deliverable)
      → Content Item Canvas (werkbank per content item)
        → Preview & Validatie
          → Goedkeuring
            → Launch (publicatie + feedback naar timeline)
```

### Wat verandert
De huidige Content Studio (3-kolom layout met prompt-input, TipTap-editor en quality panel) wordt **vervangen** door het Content Item Canvas — een kaart-gebaseerde werkruimte die het volledige creatieproces faciliteert: van context-stack tot multi-variant generatie tot platform-preview tot publicatie.

### Wat behouden blijft
- Alle bestaande API-routes (`/api/studio/*`) → worden uitgebreid, niet vervangen
- Quality scoring + improvement suggestions → worden onderdeel van het canvas
- Version history → blijft beschikbaar
- TipTap editor → wordt hergebruikt als inline editor binnen copy-kaarten
- DeliverableComponent model → wordt uitgebreid voor variant-management
- Auto-save mechanisme → blijft werken

---

## 2. De 5-lagen context-stack

Het canvas werkt met een **5-lagen context-stack** die automatisch wordt opgebouwd wanneer een deliverable wordt geopend. Elke laag erft van de vorige en voegt specificiteit toe.

```
┌─────────────────────────────────────────────────────────┐
│ L1: BRAND FOUNDATION                         permanent  │
│     BrandAssets + BrandStyleguide + Brand Personality   │
│     Bron: workspace brand assets (12 types)             │
├─────────────────────────────────────────────────────────┤
│ L2: STRATEGISCH CONCEPT                   per campagne  │
│     CampaignBlueprint: big idea, hooks, kernboodschap   │
│     Bron: campaign.strategy JSON                        │
├─────────────────────────────────────────────────────────┤
│ L3: KLANTREIS-POSITIE                       per fase    │
│     Journey phase + week + fase-specifieke guidance     │
│     Bron: deliverable.settings.phase + campaign dates   │
│     ➜ AUTOMATISCH afgeleid, niet gevraagd aan user      │
├─────────────────────────────────────────────────────────┤
│ L4: MIDDELVERRIJKING                       per kanaal   │
│     Platform specs, best practices, templates           │
│     Bron: MediumEnrichment config + deliverable type    │
├─────────────────────────────────────────────────────────┤
│ L5: CONTENT ITEM                          per uiting    │
│     Varianten, selecties, preview, publicatie           │
│     Bron: DeliverableComponent records                  │
└─────────────────────────────────────────────────────────┘
```

### Context-stack assemblage (server-side)

```typescript
// Nieuw: src/lib/ai/canvas-context.ts

interface CanvasContextStack {
  brand: {
    essence: BrandEssenceSummary;
    personality: BrandPersonalitySummary;
    styleguide: BrandStyleguideSummary;
    toneOfVoice: ToneOfVoiceSummary;
  };
  concept: {
    bigIdea: string;
    creativeHook: HookConcept;
    coreMessage: string;
    proofPoints: string[];
    visualDirection: string;
    targetPersonas: PersonaSummary[];
  };
  journeyPhase: {
    phase: 'awareness' | 'consideration' | 'decision' | 'retention' | 'advocacy';
    phaseObjectives: string[];
    messageGuidance: string;      // AI-gegenereerd op basis van fase
    toneAdjustment: string;       // Hoe tone verschuift per fase
    ctaDirection: string;         // Type CTA dat past bij fase
    weekInCampaign: number;       // Week-positie binnen campagne
    suggestedPublishDate: string; // ISO date (auto-berekend)
  };
  medium: {
    platform: string;             // linkedin | instagram | email | web | etc.
    format: string;               // ad | organic-post | carousel | story | etc.
    specs: MediumSpecs;           // Character limits, image sizes, etc.
    bestPractices: string[];      // Platform-specifieke tips
    templateStructure: ComponentTemplate[]; // Verwachte componenten
  };
}
```

---

## 3. Database wijzigingen

### 3a. Uitbreiding Deliverable model

```prisma
model Deliverable {
  // ... bestaande velden ...

  // ─── Nieuw: Journey & Publicatie ──────────────────
  journeyPhase          String?           // awareness | consideration | decision | retention | advocacy
  weekInCampaign        Int?              // Week-nummer binnen campagne-tijdlijn
  suggestedPublishDate  DateTime?         // Auto-berekende ideale publicatiedatum
  scheduledPublishDate  DateTime?         // Door gebruiker bevestigde datum
  publishedAt           DateTime?         // Werkelijke publicatiedatum

  // ─── Nieuw: Canvas-specifiek ──────────────────────
  canvasState           Json?             // UI-state: welke varianten geselecteerd, panel-states
  approvalStatus        ApprovalStatus    @default(DRAFT)
  approvalNote          String?           @db.Text
  approvedBy            String?           // User ID
  approvedAt            DateTime?

  // ─── Nieuw: Hergebruik-tracking ───────────────────
  derivedFromId         String?           // ID van bron-deliverable (bij hergebruik)
  derivedFrom           Deliverable?      @relation("DerivableContent", fields: [derivedFromId], references: [id])
  derivatives           Deliverable[]     @relation("DerivableContent")
}

enum ApprovalStatus {
  DRAFT
  IN_REVIEW
  CHANGES_REQUESTED
  APPROVED
  PUBLISHED
}
```

### 3b. Uitbreiding DeliverableComponent model (variant-support)

```prisma
model DeliverableComponent {
  // ... bestaande velden ...

  // ─── Nieuw: Variant-management ────────────────────
  variantGroup          String?           // Groepeert varianten (bijv. "headline", "body", "visual")
  variantIndex          Int       @default(0)  // 0, 1, 2 voor variant A, B, C
  isSelected            Boolean   @default(false) // Geselecteerd voor preview

  // ─── Nieuw: Multi-model tracking ──────────────────
  aiProvider            String?           // anthropic | openai | nanobanana | gemini
  generationDuration    Int?              // Generatietijd in ms
  imagePromptUsed       String?  @db.Text // De prompt die naar image-model ging

  // ─── Nieuw: Iteratie-feedback ─────────────────────
  userFeedback          String?  @db.Text // Feedback voor regeneratie
  iterationCount        Int      @default(0)  // Hoeveel keer heritert

  @@unique([deliverableId, variantGroup, variantIndex])
}
```

### 3c. Nieuw: MediumEnrichment model

```prisma
model MediumEnrichment {
  id                    String   @id @default(cuid())

  platform              String            // linkedin | instagram | facebook | email | web | tiktok | youtube | podcast
  format                String            // ad | organic-post | carousel | story | reel | landing-page | newsletter | etc.

  // ─── Specificaties ────────────────────────────────
  specs                 Json              // { maxChars: { headline: 150, body: 3000 }, imageSize: { width: 1200, height: 627 }, ... }
  componentTemplate     Json              // Verwachte componenten: [{ type: "headline", required: true }, { type: "body" }, { type: "visual" }, { type: "cta" }]
  bestPractices         Json              // ["Gebruik een vraag als hook", "Eerste 2 regels zijn cruciaal", ...]

  // ─── Journey-fase guidance ────────────────────────
  phaseGuidance         Json              // Per fase: { awareness: { toneShift: "...", ctaType: "...", messageFrame: "..." }, ... }

  // ─── Publicatie-optimalisatie ──────────────────────
  optimalPublishTimes   Json              // { dayOfWeek: [2,3,4], hourRange: [9,12], timezone: "Europe/Amsterdam" }

  isDefault             Boolean  @default(true)  // Systeem-default vs workspace-custom
  workspaceId           String?           // null = systeem-breed, gevuld = workspace override

  createdAt             DateTime @default(now())
  updatedAt             DateTime @updatedAt

  @@unique([platform, format, workspaceId])
  @@index([platform, format])
}
```

### 3d. Migratie-strategie

Eén Prisma-migratie die alle wijzigingen bevat:
1. Nieuwe velden op Deliverable (nullable, geen data-verlies)
2. Nieuwe velden op DeliverableComponent (nullable + defaults)
3. Nieuwe tabel MediumEnrichment
4. Seed-script voor MediumEnrichment standaard-data (10+ platform/format combinaties)

---

## 4. AI Orchestrator (multi-model coördinatie)

### Architectuur

```
┌─────────────────────────────────────────────────┐
│              CANVAS ORCHESTRATOR                │
│         /api/studio/[id]/orchestrate            │
│                                                 │
│  Input: CanvasContextStack + generatie-opdracht │
│                                                 │
│  1. Bouw unified prompt uit context-stack       │
│  2. Route naar juiste model(len)                │
│  3. Coördineer parallelle generatie             │
│  4. Retourneer alle varianten via SSE           │
└──────────┬──────────────┬───────────────────────┘
           │              │
     ┌─────▼─────┐  ┌────▼──────────┐
     │  CLAUDE    │  │  NANOBANANA   │
     │ (Anthropic)│  │  (Image API)  │
     │            │  │               │
     │ Genereert: │  │ Genereert:    │
     │ • Copy ×3  │  │ • Visual ×3   │
     │ • Headlines│  │               │
     │ • CTA's    │  │ Input:        │
     │ • Hashtags │  │ Image prompts │
     │ • Alt text │  │ van Claude +  │
     │ • Image    │  │ brand style   │
     │   prompts  │──▶               │
     └─────┬──────┘  └────┬──────────┘
           │              │
           ▼              ▼
     DeliverableComponent records
     (variantGroup + variantIndex + aiProvider)
```

### API Endpoint

```typescript
// Nieuw: src/app/api/studio/[deliverableId]/orchestrate/route.ts

// POST /api/studio/[deliverableId]/orchestrate
// Body: { instruction?: string, regenerateGroup?: string }
// Response: SSE stream

// SSE Events:
// event: context_loaded     → { stack: CanvasContextStack }
// event: text_generating    → { group: "headline", status: "generating" }
// event: text_complete      → { group: "headline", variants: [{ index: 0, content: "..." }, ...] }
// event: text_complete      → { group: "body", variants: [...] }
// event: text_complete      → { group: "cta", variants: [...] }
// event: image_prompt_ready → { group: "visual", prompts: ["...", "...", "..."] }
// event: image_generating   → { group: "visual", status: "generating" }
// event: image_complete     → { group: "visual", variants: [{ index: 0, url: "..." }, ...] }
// event: publish_suggestion → { suggestedDate: "2026-04-15", reasoning: "..." }
// event: complete           → { totalDuration: 12400 }
```

### Orchestratie-flow (server-side)

```typescript
// Nieuw: src/lib/ai/canvas-orchestrator.ts

async function orchestrateContentGeneration(
  deliverableId: string,
  contextStack: CanvasContextStack,
  instruction?: string
): AsyncGenerator<SSEEvent> {

  // Stap 1: Bouw master-prompt uit alle 5 lagen
  const masterPrompt = buildMasterPrompt(contextStack, instruction);

  // Stap 2: Vraag Claude om alle tekst-componenten + image prompts
  const textResult = await generateTextComponents(masterPrompt, {
    components: contextStack.medium.templateStructure,
    variantsPerComponent: 3,
    includeImagePrompts: true,
  });
  // yield: text_complete events per component groep

  // Stap 3: Parallel — stuur image prompts naar nanobanana
  const imagePrompts = enrichImagePrompts(
    textResult.imagePrompts,
    contextStack.brand.styleguide
  );
  const imageResults = await generateImages(imagePrompts, {
    provider: 'nanobanana',
    variantsPerPrompt: 3,
    style: contextStack.brand.styleguide.visualIdentity,
  });
  // yield: image_complete events

  // Stap 4: Bereken publicatie-suggestie
  const publishSuggestion = calculateOptimalPublishDate(
    contextStack.journeyPhase,
    contextStack.medium.optimalPublishTimes,
    campaign.startDate,
    campaign.endDate
  );
  // yield: publish_suggestion event

  // Stap 5: Sla alle varianten op als DeliverableComponent records
  await persistVariants(deliverableId, textResult, imageResults);
}
```

### Model Router (uitbreidbaar)

```typescript
// Nieuw: src/lib/ai/model-router.ts

interface ModelCapability {
  provider: string;          // anthropic | openai | nanobanana | gemini | elevenlabs | runway
  taskType: string;          // text | image | video | audio | code
  model: string;             // claude-sonnet-4-5 | nanobanana-v2 | etc.
  maxTokens?: number;
  supportsBatch?: boolean;
  costPerUnit?: number;
}

const MODEL_REGISTRY: ModelCapability[] = [
  // Tekst
  { provider: 'anthropic', taskType: 'text',  model: 'claude-sonnet-4-5-20250929' },

  // Beeld
  { provider: 'nanobanana', taskType: 'image', model: 'nanobanana-v2' },

  // Video (toekomstig)
  { provider: 'runway',     taskType: 'video', model: 'gen-4' },

  // Audio/Voice (toekomstig)
  { provider: 'elevenlabs', taskType: 'audio', model: 'eleven-multilingual-v2' },

  // Code/Landing pages (toekomstig)
  { provider: 'anthropic',  taskType: 'code',  model: 'claude-sonnet-4-5-20250929' },
];

function routeToModel(taskType: string): ModelCapability {
  return MODEL_REGISTRY.find(m => m.taskType === taskType)!;
}
```

---

## 5. Canvas UI componenten

### Component-hiërarchie

```
ContentItemCanvas (nieuwe pagina-component)
├── CanvasHeader
│   ├── Breadcrumb (Campaign > Deliverable)
│   ├── Title + Content type badge
│   ├── Journey phase indicator (pill: "Awareness — Week 2")
│   └── Actions (save, preview fullscreen, export, close)
│
├── CanvasLayout (CSS Grid, responsive)
│   │
│   ├── ContextPanel (links, inklapbaar, 320px)
│   │   ├── ContextStack
│   │   │   ├── BrandContextCard (readonly, samenvatting)
│   │   │   ├── ConceptContextCard (readonly, big idea + hook)
│   │   │   ├── JourneyPhaseCard (readonly, fase + guidance)
│   │   │   │   ├── Phase badge (awareness/consideration/etc.)
│   │   │   │   ├── Boodschap-guidance
│   │   │   │   ├── Tone-aanpassing
│   │   │   │   └── CTA-richting
│   │   │   └── MediumCard (readonly, platform specs + tips)
│   │   │
│   │   └── GenerationControls
│   │       ├── InstructionInput (optionele extra instructie)
│   │       ├── ModelIndicators (welke AI-modellen worden ingezet)
│   │       └── GenerateButton (primary CTA)
│   │
│   ├── VariantWorkspace (center, flexibel)
│   │   ├── VariantGroup ("Headline")
│   │   │   ├── VariantCard (variant A) [○ select] [✎ edit] [↻ regen]
│   │   │   ├── VariantCard (variant B) [● selected]
│   │   │   └── VariantCard (variant C) [○ select]
│   │   │
│   │   ├── VariantGroup ("Body Copy")
│   │   │   ├── VariantCard (variant A — TipTap inline editor)
│   │   │   ├── VariantCard (variant B) [● selected]
│   │   │   └── VariantCard (variant C)
│   │   │
│   │   ├── VariantGroup ("Visual")
│   │   │   ├── VariantCard (variant A — image)
│   │   │   ├── VariantCard (variant B — image) [● selected]
│   │   │   └── VariantCard (variant C — image)
│   │   │
│   │   ├── VariantGroup ("CTA")
│   │   │   ├── VariantCard (variant A)
│   │   │   └── VariantCard (variant B) [● selected]
│   │   │
│   │   └── FeedbackBar
│   │       ├── TextInput ("Maak de headline prikkelender...")
│   │       └── RegenerateButton (stuurt feedback naar orchestrator)
│   │
│   └── PreviewPanel (rechts, 400px)
│       ├── PlatformPreview
│       │   ├── LinkedInPostPreview
│       │   ├── LinkedInAdPreview
│       │   ├── InstagramPostPreview
│       │   ├── InstagramCarouselPreview
│       │   ├── EmailPreview
│       │   ├── LandingPagePreview (iframe)
│       │   └── GenericPreview (fallback)
│       │
│       ├── ValidationChecks
│       │   ├── ToneCheck (✓/✗ past bij journey-fase)
│       │   ├── CharCountCheck (per component)
│       │   ├── BrandVoiceCheck (AI-score)
│       │   └── QualityScore (bestaand, hergebruikt)
│       │
│       ├── PublishSuggestion
│       │   ├── Suggested date + reasoning
│       │   ├── DatePicker (override)
│       │   └── "Bevestig datum" → scheduledPublishDate
│       │
│       └── ActionBar
│           ├── IterateButton (terug naar variant workspace met feedback)
│           ├── DeriveButton ("Maak Instagram versie" → nieuw canvas)
│           ├── SubmitForReviewButton → approvalStatus: IN_REVIEW
│           └── LaunchButton → approvalStatus: PUBLISHED + scheduledPublishDate
│
└── CanvasFooter (optioneel)
    ├── VersionHistory (compact timeline)
    ├── AutoSaveIndicator
    └── KeyboardShortcuts hint
```

### Platform Preview componenten

```
src/features/campaigns/components/canvas/previews/
├── LinkedInPostPreview.tsx     // Organische post met profielfoto, reacties
├── LinkedInAdPreview.tsx       // Gesponsorde post met CTA-button
├── InstagramPostPreview.tsx    // Feed post met likes, comments
├── InstagramCarouselPreview.tsx // Swipeable slides
├── InstagramStoryPreview.tsx   // 9:16 story format
├── EmailPreview.tsx            // Email client mockup (inbox + open)
├── LandingPagePreview.tsx      // Iframe of mini-browser frame
├── BlogPreview.tsx             // Article layout
├── VideoPreview.tsx            // Video player met thumbnail
├── PodcastPreview.tsx          // Audio player met artwork
├── GenericPreview.tsx          // Fallback voor onbekende types
└── PreviewFrame.tsx            // Shared frame component (device mockup)
```

### Variant selectie → Preview binding

```typescript
// De preview wordt automatisch bijgewerkt wanneer varianten worden geselecteerd.
// Elke VariantGroup heeft exact één geselecteerde variant.

interface CanvasSelection {
  [variantGroup: string]: number; // group → selected variantIndex
}

// Voorbeeld:
const selection: CanvasSelection = {
  headline: 1,   // Variant B
  body: 2,       // Variant C
  visual: 0,     // Variant A
  cta: 1,        // Variant B
};

// Preview component ontvangt geselecteerde componenten:
function assemblePreviewContent(
  components: DeliverableComponent[],
  selection: CanvasSelection
): PreviewContent {
  return Object.entries(selection).reduce((acc, [group, index]) => {
    const component = components.find(
      c => c.variantGroup === group && c.variantIndex === index
    );
    return { ...acc, [group]: component };
  }, {});
}
```

---

## 6. Medium Enrichment systeem

### Seed data (eerste release)

| Platform | Format | Componenten | Specs |
|----------|--------|-------------|-------|
| **LinkedIn** | organic-post | headline, body, visual, hashtags | body: 3000 chars, image: 1200×627 |
| **LinkedIn** | ad | headline, description, visual, cta | headline: 150, desc: 70 |
| **LinkedIn** | carousel | slides[].headline + body + visual | 2-10 slides, 1080×1080 |
| **Instagram** | feed-post | visual, caption, hashtags | caption: 2200, image: 1080×1080 |
| **Instagram** | carousel | slides[].visual + caption, hashtags | 2-10 slides |
| **Instagram** | story | visual, text-overlay, cta-sticker | 1080×1920, 15s per slide |
| **Instagram** | reel | video, caption, hashtags, audio | 0:15-1:30, 1080×1920 |
| **Email** | newsletter | subject, preheader, hero, body, cta | subject: 60, preheader: 90 |
| **Web** | landing-page | hero, headline, body, features, cta, social-proof | responsive |
| **Web** | blog-article | title, meta-desc, intro, body, conclusion, cta | SEO: title 60, meta 160 |
| **YouTube** | video | title, description, thumbnail, tags, chapters | title: 100, desc: 5000 |
| **Podcast** | episode | title, description, show-notes, transcript | desc: 4000 |
| **TikTok** | video | video, caption, hashtags, sound | caption: 2200, 0:15-3:00 |

### Journey-fase guidance per medium (voorbeeld: LinkedIn organic)

```json
{
  "awareness": {
    "toneShift": "Confronterend en herkenbaar. Stel een provocerende vraag of deel een verrassend inzicht.",
    "messageFrame": "Probleem-herkenning: laat de doelgroep voelen dat er een spanning is die ze herkennen maar nog niet hebben benoemd.",
    "ctaType": "soft — 'Herken je dit?' of 'Lees meer in de comments'",
    "hookStrategy": "Open met een statistiek, controversiële stelling, of persoonlijke observatie",
    "visualDirection": "Contrastrijk, opvallend, pattern-interrupt in de feed"
  },
  "consideration": {
    "toneShift": "Educatief en geloofwaardig. Deel kennis en bewijs dat je expertise hebt.",
    "messageFrame": "Oplossing-verkenning: laat zien dat er een betere manier is, zonder hard te verkopen.",
    "ctaType": "medium — 'Download de guide' of 'Bekijk het framework'",
    "hookStrategy": "Open met 'Hoe...' of 'X stappen om...' of een case-voorbeeld",
    "visualDirection": "Informatief, schema's, frameworks, before/after"
  },
  "decision": {
    "toneShift": "Overtuigend en urgent. Maak de drempel laag om actie te ondernemen.",
    "messageFrame": "Actie-trigger: maak concreet wat de volgende stap is en waarom nu.",
    "ctaType": "hard — 'Start vandaag' of 'Boek een demo' of 'Probeer gratis'",
    "hookStrategy": "Open met social proof, resultaten, of een beperkt aanbod",
    "visualDirection": "Resultaatgericht, testimonials, product-shots"
  },
  "retention": {
    "toneShift": "Ondersteunend en waardevol. Bevestig dat de keuze goed was.",
    "messageFrame": "Waarde-bevestiging: deel tips, updates, en resultaten die bestaande klanten helpen.",
    "ctaType": "engagement — 'Deel je ervaring' of 'Ontdek de nieuwe feature'",
    "hookStrategy": "Open met een tip, een update, of een community-moment",
    "visualDirection": "Warm, community-gevoel, behind-the-scenes"
  },
  "advocacy": {
    "toneShift": "Trots en uitnodigend. Maak het makkelijk en aantrekkelijk om te delen.",
    "messageFrame": "Deel-stimulans: geef ambassadeurs content die ze trots kunnen delen.",
    "ctaType": "viral — 'Tag iemand die dit moet zien' of 'Deel met je team'",
    "hookStrategy": "Open met een persoonlijk verhaal of een wow-resultaat",
    "visualDirection": "Deelbaar, quotable, emotioneel"
  }
}
```

---

## 7. Publicatie-suggestie & Timeline-integratie

### Auto-berekening suggestedPublishDate

```typescript
// src/lib/campaigns/publish-scheduler.ts

function calculateOptimalPublishDate(
  campaign: { startDate: Date; endDate: Date },
  journeyPhase: string,
  weekInCampaign: number,
  mediumEnrichment: MediumEnrichment,
  existingScheduled: Date[]  // Al ingeplande items (voorkom clustering)
): { date: Date; reasoning: string } {

  // Stap 1: Bepaal het tijdvenster op basis van journey-fase
  const campaignDuration = differenceInWeeks(campaign.endDate, campaign.startDate);
  const phaseWindows = {
    awareness:     { startPct: 0.00, endPct: 0.30 },  // Eerste 30% van campagne
    consideration: { startPct: 0.20, endPct: 0.60 },  // 20-60%
    decision:      { startPct: 0.50, endPct: 0.85 },  // 50-85%
    retention:     { startPct: 0.70, endPct: 1.00 },  // 70-100%
    advocacy:      { startPct: 0.80, endPct: 1.00 },  // 80-100%
  };

  // Stap 2: Neem weekInCampaign als primaire indicatie
  const baseDate = addWeeks(campaign.startDate, weekInCampaign - 1);

  // Stap 3: Optimaliseer naar beste dag/tijd voor dit platform
  const { dayOfWeek, hourRange } = mediumEnrichment.optimalPublishTimes;
  const optimizedDate = findNextOptimalSlot(baseDate, dayOfWeek, hourRange);

  // Stap 4: Vermijd clustering (min 4 uur tussen items op zelfde kanaal)
  const finalDate = avoidClustering(optimizedDate, existingScheduled, 4 * 60);

  return {
    date: finalDate,
    reasoning: buildReasoning(journeyPhase, weekInCampaign, mediumEnrichment.platform),
  };
}
```

### Feedback naar Campaign Timeline

Wanneer een publicatiedatum wordt bevestigd of een item wordt gepubliceerd, wordt dit teruggekoppeld naar de campagne-timeline:

```typescript
// Bij bevestigen datum:
// PATCH /api/campaigns/[campaignId]/deliverables/[deliverableId]
// Body: { scheduledPublishDate: "2026-04-15T09:00:00Z" }

// Bij publicatie:
// POST /api/studio/[deliverableId]/publish
// → Sets approvalStatus: PUBLISHED, publishedAt: now()
// → Invalidates campaign timeline cache
// → Stuurt notification naar campaign owner
```

De Campaign Timeline (bestaand) toont dan:
- Geplande items als outline op de tijdlijn
- Gepubliceerde items als gevulde markers
- Gap-analyse: weken zonder content → suggestie om items toe te voegen

---

## 8. Content hergebruik (cross-medium derivatie)

### Flow

```
Content Item Canvas (LinkedIn Post, Awareness)
  → Gebruiker klikt "Maak Instagram versie"
    → Systeem:
      1. Creëert nieuwe Deliverable met derivedFromId
      2. Kopieert context-stack (L1-L3 identiek)
      3. Wisselt L4 (middelverrijking) naar Instagram specs
      4. Opent nieuw canvas
      5. AI hertaalt copy + genereert nieuwe visuals
      6. Gebruiker cureert opnieuw
```

### API

```typescript
// POST /api/studio/[deliverableId]/derive
// Body: { targetPlatform: "instagram", targetFormat: "carousel" }
// Response: { newDeliverableId: "...", redirectUrl: "..." }

// Server-side:
// 1. Haal bron-deliverable op met geselecteerde varianten
// 2. Maak nieuwe Deliverable aan (derivedFromId = bron)
// 3. Assembleer context-stack met nieuw medium
// 4. Genereer initiële content via orchestrator
// 5. Retourneer ID voor redirect naar nieuw canvas
```

---

## 9. Goedkeuringsflow

### Status-machine

```
DRAFT → IN_REVIEW → APPROVED → PUBLISHED
                  ↘ CHANGES_REQUESTED → DRAFT (iteratie)
```

### UI-integratie

```
Canvas ActionBar:
├── Status: DRAFT
│   └── [Ter goedkeuring sturen] → IN_REVIEW
│
├── Status: IN_REVIEW (voor reviewer)
│   ├── [Goedkeuren] + optionele notitie → APPROVED
│   └── [Wijzigingen nodig] + verplichte notitie → CHANGES_REQUESTED
│
├── Status: CHANGES_REQUESTED (voor creator)
│   └── Banner: "Feedback: [notitie]" + [Opnieuw indienen] → IN_REVIEW
│
├── Status: APPROVED
│   ├── Publicatiedatum zichtbaar
│   └── [Inplannen] of [Nu publiceren] → PUBLISHED
│
└── Status: PUBLISHED
    ├── Lock: content niet meer bewerkbaar
    ├── Performance card (na publicatie)
    └── [Hergebruik voor ander kanaal] → derive flow
```

---

## 10. Implementatie-fases

### Fase A: Foundation (Canvas basis + Context-stack)
**Scope:** De basis-architectuur neerzetten

| # | Taak | Type | Geschatte omvang |
|---|------|------|------------------|
| A1 | Prisma migratie: Deliverable uitbreidingen (journeyPhase, suggestedPublishDate, scheduledPublishDate, approvalStatus, derivedFromId) | Backend | Klein |
| A2 | Prisma migratie: DeliverableComponent uitbreidingen (variantGroup, variantIndex, isSelected, aiProvider, userFeedback) | Backend | Klein |
| A3 | MediumEnrichment model + migratie + seed data (10 platform/format combos) | Backend | Medium |
| A4 | `canvas-context.ts` — Context-stack assemblage uit bestaande data | Backend | Medium |
| A5 | `model-router.ts` — Model registry + routing logica | Backend | Klein |
| A6 | Journey-fase auto-detectie: afleiden uit deliverable.settings.phase + campaign dates | Backend | Klein |
| A7 | `publish-scheduler.ts` — Publicatie-suggestie berekening | Backend | Medium |

### Fase B: AI Orchestrator (multi-model generatie)
**Scope:** De AI-coördinatielaag

| # | Taak | Type | Geschatte omvang |
|---|------|------|------------------|
| B1 | `canvas-orchestrator.ts` — Kern orchestratie-logica | Backend | Groot |
| B2 | Claude tekst-generatie integratie (copy + headlines + CTA + image prompts) | Backend | Medium |
| B3 | Nanobanana image-generatie integratie (API-koppeling + prompt verrijking) | Backend | Medium |
| B4 | SSE endpoint `/api/studio/[id]/orchestrate` | Backend | Medium |
| B5 | Variant persistence (DeliverableComponent records aanmaken/updaten) | Backend | Medium |
| B6 | Feedback-loop: regeneratie met gebruikersfeedback per variantGroup | Backend | Medium |

### Fase C: Canvas UI (de werkbank)
**Scope:** De nieuwe frontend

| # | Taak | Type | Geschatte omvang |
|---|------|------|------------------|
| C1 | `ContentItemCanvas.tsx` — Hoofd-layout component (3-panel responsive grid) | Frontend | Medium |
| C2 | `ContextPanel` — Readonly context-stack weergave (inklapbare kaarten) | Frontend | Medium |
| C3 | `VariantWorkspace` — Variant-groepen met selectie-logica | Frontend | Groot |
| C4 | `VariantCard` — Individuele variant met select/edit/regen acties | Frontend | Medium |
| C5 | `FeedbackBar` — Inline feedback input voor iteratie | Frontend | Klein |
| C6 | `useCanvasStore` — Zustand store voor canvas-state (selecties, panel-states, generation-status) | Frontend | Medium |
| C7 | `useCanvasOrchestration` — Hook voor SSE-verbinding met orchestrator | Frontend | Medium |
| C8 | Integratie: TipTap inline editor in VariantCards (hergebruik bestaand) | Frontend | Medium |

### Fase D: Preview & Validatie
**Scope:** Platform-specifieke previews

| # | Taak | Type | Geschatte omvang |
|---|------|------|------------------|
| D1 | `PreviewPanel` — Container met dynamic preview loading | Frontend | Klein |
| D2 | `LinkedInPostPreview` + `LinkedInAdPreview` | Frontend | Medium |
| D3 | `InstagramPostPreview` + `InstagramCarouselPreview` | Frontend | Medium |
| D4 | `EmailPreview` | Frontend | Medium |
| D5 | `GenericPreview` (fallback voor overige types) | Frontend | Klein |
| D6 | `ValidationChecks` — Tone check, char count, brand voice score | Frontend | Medium |
| D7 | `PublishSuggestion` — Datum-suggestie + DatePicker override | Frontend | Klein |

### Fase E: Publicatie & Integratie
**Scope:** Goedkeuring, publicatie, hergebruik

| # | Taak | Type | Geschatte omvang |
|---|------|------|------------------|
| E1 | Goedkeuringsflow (status-machine + UI states) | Full-stack | Medium |
| E2 | `/api/studio/[id]/publish` endpoint | Backend | Klein |
| E3 | Timeline-feedback: bevestigde datum terugkoppelen naar campagne | Backend | Klein |
| E4 | `/api/studio/[id]/derive` endpoint (content hergebruik) | Backend | Medium |
| E5 | Derive UI: "Maak X versie" modal + redirect naar nieuw canvas | Frontend | Medium |
| E6 | Navigatie-integratie: Campaign Detail → Canvas routing | Frontend | Klein |
| E7 | Performance placeholder (post-launch card, data later) | Frontend | Klein |

### Fase F: Uitbreidbaarheid (toekomstbestendig)
**Scope:** Voorbereidingen voor video, voice, landing pages

| # | Taak | Type | Geschatte omvang |
|---|------|------|------------------|
| F1 | Model Router uitbreiden: video provider (Runway/Kling) interface | Backend | Klein |
| F2 | Model Router uitbreiden: audio provider (ElevenLabs) interface | Backend | Klein |
| F3 | MediumEnrichment seed data uitbreiden: video, podcast, TikTok | Backend | Klein |
| F4 | `VideoPreview` + `PodcastPreview` component stubs | Frontend | Klein |
| F5 | `LandingPagePreview` (iframe-based live preview) | Frontend | Medium |
| F6 | VariantCard support voor video (thumbnail + duration) en audio (waveform) | Frontend | Medium |

---

## 11. Technische keuzes

### Canvas layout: CSS Grid (geen React Flow)
Het canvas is geen node-gebaseerde graph maar een **gestructureerde werkbank** met vaste zones. CSS Grid met `grid-template-areas` biedt:
- Responsive layout (panels klappen in op smaller scherm)
- Geen zware library-dependency
- Consistente look met rest van Branddock UI
- Visuele connectie-lijnen via CSS/SVG decoratie (optioneel)

### State management: Zustand `useCanvasStore`
Past bij bestaand patroon (14 stores al in codebase). Bevat:
- `contextStack` (server-loaded)
- `variantSelections` (per group → selected index)
- `generationStatus` (per group → idle/generating/complete/error)
- `panelStates` (collapsed/expanded per panel)
- `feedbackDraft` (tekst in feedback bar)
- `approvalStatus` + `scheduledPublishDate`

### SSE voor generatie (geen WebSockets)
Past bij bestaand patroon (campaign strategy generation). Voordelen:
- Simpele implementatie (ReadableStream)
- Geen extra infra nodig
- Progressive rendering van varianten terwijl ze binnenkomen
- Automatische reconnect via EventSource

### TipTap hergebruik
Bestaande TipTap configuratie (15+ extensions) wordt hergebruikt in VariantCards voor inline tekst-editing. Geen nieuwe editor-dependency.

---

## 12. Bestandsstructuur (nieuw)

```
src/
├── features/campaigns/components/canvas/
│   ├── ContentItemCanvas.tsx          # Hoofd-component
│   ├── CanvasHeader.tsx               # Breadcrumb + acties
│   ├── ContextPanel.tsx               # Links: context-stack
│   │   ├── BrandContextCard.tsx
│   │   ├── ConceptContextCard.tsx
│   │   ├── JourneyPhaseCard.tsx
│   │   └── MediumCard.tsx
│   ├── VariantWorkspace.tsx           # Center: variant-groepen
│   │   ├── VariantGroup.tsx
│   │   ├── VariantCard.tsx
│   │   └── FeedbackBar.tsx
│   ├── PreviewPanel.tsx               # Rechts: preview + validatie
│   │   ├── ValidationChecks.tsx
│   │   └── PublishSuggestion.tsx
│   ├── ActionBar.tsx                  # Goedkeuring + launch acties
│   └── previews/
│       ├── LinkedInPostPreview.tsx
│       ├── LinkedInAdPreview.tsx
│       ├── InstagramPostPreview.tsx
│       ├── InstagramCarouselPreview.tsx
│       ├── EmailPreview.tsx
│       ├── LandingPagePreview.tsx
│       ├── VideoPreview.tsx
│       ├── GenericPreview.tsx
│       └── PreviewFrame.tsx
│
├── features/campaigns/stores/
│   └── useCanvasStore.ts              # Canvas Zustand store
│
├── features/campaigns/hooks/
│   ├── useCanvasOrchestration.ts      # SSE hook voor AI generatie
│   ├── useCanvasContext.ts            # Context-stack fetching
│   └── usePublishScheduler.ts         # Publicatie-suggestie
│
├── lib/ai/
│   ├── canvas-context.ts              # Context-stack assemblage
│   ├── canvas-orchestrator.ts         # Multi-model orchestratie
│   ├── model-router.ts               # Model registry + routing
│   └── prompts/
│       └── canvas-prompts.ts          # Prompt templates per medium
│
├── lib/campaigns/
│   └── publish-scheduler.ts           # Publicatie-datum berekening
│
└── app/api/studio/[deliverableId]/
    ├── orchestrate/route.ts           # SSE generatie endpoint
    ├── publish/route.ts               # Publicatie endpoint
    └── derive/route.ts                # Content hergebruik endpoint
```

---

## 13. Afhankelijkheden (externe packages)

| Package | Doel | Status |
|---------|------|--------|
| `@tiptap/*` | Rich text editing in variant cards | Al geïnstalleerd |
| `date-fns` | Datumberekeningen voor publish-scheduler | Al geïnstalleerd |
| `zod` | Validatie van AI-output en API-input | Al geïnstalleerd |
| `zustand` | Canvas state management | Al geïnstalleerd |
| `@tanstack/react-query` | Data fetching + caching | Al geïnstalleerd |
| Nanobanana SDK | Image generatie API | **Nieuw — te installeren** |

Geen nieuwe UI-libraries nodig. Het canvas wordt gebouwd met bestaande Tailwind CSS 4 + de eigen component-library.

---

## 14. Samenvatting

Het Content Item Canvas transformeert de bestaande Content Studio van een **form-based editor** naar een **kaart-gebaseerde werkbank** per content item. De 5-lagen context-stack zorgt voor consistentie, de AI Orchestrator coördineert meerdere modellen (Claude voor tekst, nanobanana voor beeld), en het variant-systeem laat gebruikers mix-and-match keuzes maken die direct zichtbaar zijn in een platform-specifieke preview.

De klantreis-fase wordt automatisch afgeleid uit de campagne-planning en beïnvloedt alle AI-output — van toon tot CTA-type tot visuele richting. Publicatiedatums worden gesuggereerd op basis van fase, week en platform-optimalisaties, en terugkoppeling naar de campagne-timeline sluit de loop.

Het systeem is voorbereid op uitbreiding naar video (Runway), voice (ElevenLabs) en landing pages via de model-router en het MediumEnrichment-systeem — nieuwe content types toevoegen vereist alleen een nieuw model-router entry, MediumEnrichment seed-data, en een preview-component.
