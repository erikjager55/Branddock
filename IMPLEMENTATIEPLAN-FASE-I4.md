# IMPLEMENTATIEPLAN — Fase I.4: Consistente AI-Modellen (Mensen/Producten)

> **Status**: PLAN — wacht op goedkeuring
> **Afhankelijkheid**: Fase I.3 (AI-Gegenereerde Beelden) moet volledig af zijn
> **Geschatte omvang**: 5 sprints (I.4.1 – I.4.5)

---

## CONTEXT & DOEL

Een workspace moet "hun model" kunnen definiëren dat consistent terugkomt in alle gegenereerde beelden. Denk aan:
- **Mensen**: een vast gezicht/persona voor campagnebeelden (bijv. "onze brand ambassador")
- **Producten**: consistente productfoto's vanuit verschillende hoeken, in verschillende settings
- **Stijl**: een visuele stijl (kleurpalet, belichting, compositie) die over alle assets heen doorwerkt

### Aanbevolen aanpak: Astria.ai als eerste versie

Op basis van de open beslissing in BRANDCLAW-ROADMAP.md (lijn 950):
> "AI-model consistentie: eigen LoRA pipeline vs. derde partij (Astria.ai aanbevolen voor eerste versie)"

**Waarom Astria.ai voor v1:**
- Managed fine-tuning API (geen GPU-infra nodig)
- Flux LoRA fine-tuning out of the box
- REST API met webhook callbacks
- Pricing: ~$0.50-2.00 per training, ~$0.02 per generatie
- Snelle time-to-market (weken i.p.v. maanden)

**Alternatieven voor later (evalueren in I.3):**
- **Eigen LoRA pipeline** (Replicate/Modal) — meer controle, hogere kosten
- **Photoroom** — sterk voor productfoto's, zwak voor mensen
- **Flux direct** (via Replicate) — goedkoper per generatie, meer setup

---

## ARCHITECTUUR OVERZICHT

```
┌─────────────────────────────────────────────────────────┐
│                    Frontend (React)                       │
│  ┌──────────┐  ┌──────────────┐  ┌───────────────────┐  │
│  │ Reference │  │ Model Mgmt   │  │ Generation UI     │  │
│  │ Upload    │  │ (train/view) │  │ (prompt + model)  │  │
│  └────┬─────┘  └──────┬───────┘  └────────┬──────────┘  │
│       │               │                    │              │
├───────┼───────────────┼────────────────────┼──────────────┤
│       │          API Layer                 │              │
│  ┌────▼─────────────────────────────────────▼──────────┐  │
│  │ /api/consistent-models/*                            │  │
│  │   POST /train          — start training             │  │
│  │   GET  /               — list models                │  │
│  │   GET  /:id            — model detail + status      │  │
│  │   POST /:id/generate   — generate image             │  │
│  │   DELETE /:id          — delete model               │  │
│  │   POST /webhook        — Astria callback            │  │
│  └─────────────────────────┬──────────────────────────┘  │
│                            │                              │
├────────────────────────────┼──────────────────────────────┤
│                     Backend Services                      │
│  ┌─────────────┐  ┌───────▼───────┐  ┌────────────────┐  │
│  │ Cloudflare  │  │ Astria.ai     │  │ Prisma DB      │  │
│  │ R2 Storage  │  │ Fine-tuning   │  │ ConsistentModel│  │
│  │ (ref imgs)  │  │ API           │  │ + ReferenceImg │  │
│  └─────────────┘  └───────────────┘  └────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

---

## SPRINT I.4.1 — Database & Storage Foundation

### Doel
Database modellen, Cloudflare R2 integratie, en bestandsupload pipeline.

### 1.1 Prisma Schema

```prisma
enum ConsistentModelType {
  PERSON
  PRODUCT
  STYLE
  OBJECT
}

enum ConsistentModelStatus {
  DRAFT              // Referentiebeelden uploaden
  UPLOADING          // Bestanden naar R2 aan het uploaden
  TRAINING           // Fine-tuning bij Astria
  TRAINING_FAILED    // Training mislukt
  READY              // Klaar voor generatie
  ARCHIVED           // Niet meer actief
}

model ConsistentModel {
  id                String                @id @default(cuid())
  workspaceId       String
  workspace         Workspace             @relation(fields: [workspaceId], references: [id])
  createdById       String
  createdBy         User                  @relation(fields: [createdById], references: [id])

  name              String                // "Sarah — Brand Ambassador"
  slug              String                // auto-generated
  description       String?               @db.Text
  type              ConsistentModelType   // PERSON, PRODUCT, STYLE, OBJECT
  status            ConsistentModelStatus @default(DRAFT)

  // Astria integration
  astriaModelId     String?               // Astria tune ID na training
  astriaModelUrl    String?               // Astria model URL
  triggerWord       String?               // Het woord dat het model triggert (bijv. "sks person")
  baseModel         String?               // "flux-lora" | "sdxl-lora"

  // Training config
  trainingConfig    Json?                 // { steps, learningRate, resolution, ... }
  trainingStartedAt DateTime?
  trainingCompletedAt DateTime?
  trainingError     String?               @db.Text

  // Visual style context
  stylePrompt       String?               @db.Text  // Default style prompt
  negativePrompt    String?               @db.Text  // Default negative prompt

  // Metadata
  thumbnailUrl      String?               // Beste voorbeeld na training
  sampleImageUrls   Json?                 // String[] — AI-gegenereerde samples na training
  usageCount        Int                   @default(0)
  isDefault         Boolean               @default(false)  // Default model voor dit type

  referenceImages   ReferenceImage[]
  generatedImages   GeneratedImage[]

  createdAt         DateTime              @default(now())
  updatedAt         DateTime              @updatedAt

  @@unique([workspaceId, slug])
  @@index([workspaceId, type])
  @@index([workspaceId, status])
}

model ReferenceImage {
  id                String           @id @default(cuid())
  consistentModelId String
  consistentModel   ConsistentModel  @relation(fields: [consistentModelId], references: [id], onDelete: Cascade)

  fileName          String           // Originele bestandsnaam
  fileSize          Int              // Bytes
  mimeType          String           // image/jpeg, image/png, image/webp
  width             Int?
  height            Int?

  // Storage
  storageKey        String           // R2 object key: "ws_{id}/models/{modelId}/{uuid}.jpg"
  storageUrl        String           // Signed URL of CDN URL
  thumbnailKey      String?          // R2 key voor thumbnail (300px)
  thumbnailUrl      String?

  // Metadata
  caption           String?          // Beschrijving van het beeld
  sortOrder         Int              @default(0)
  isTrainingImage   Boolean          @default(true)  // Mee in training set

  createdAt         DateTime         @default(now())

  @@index([consistentModelId])
}

model GeneratedImage {
  id                String           @id @default(cuid())
  consistentModelId String
  consistentModel   ConsistentModel  @relation(fields: [consistentModelId], references: [id], onDelete: Cascade)
  workspaceId       String
  workspace         Workspace        @relation(fields: [workspaceId], references: [id])
  createdById       String
  createdBy         User             @relation(fields: [createdById], references: [id])

  // Generation params
  prompt            String           @db.Text
  negativePrompt    String?          @db.Text
  seed              Int?
  width             Int              @default(1024)
  height            Int              @default(1024)
  guidanceScale     Float?
  numInferenceSteps Int?

  // Result
  storageKey        String           // R2 key
  storageUrl        String           // CDN/signed URL
  thumbnailKey      String?
  thumbnailUrl      String?

  // Metadata
  generationTimeMs  Int?
  aiProvider        String           // "astria"
  aiModel           String           // Astria model ID
  cost              Float?           // Geschatte kosten in USD

  // Link naar MediaAsset (optioneel — als opgeslagen in media library)
  mediaAssetId      String?

  createdAt         DateTime         @default(now())

  @@index([consistentModelId])
  @@index([workspaceId])
}

// Uitbreiding op bestaand Workspace model
model Workspace {
  // ... bestaande velden ...
  consistentModels  ConsistentModel[]
  generatedImages   GeneratedImage[]
}
```

### 1.2 Cloudflare R2 Storage Client

**Nieuw bestand**: `src/lib/storage/r2-client.ts`

```typescript
// Singleton R2 client via AWS S3-compatible SDK
// Functies:
//   uploadFile(key, buffer, contentType) → { key, url }
//   getSignedUrl(key, expiresIn?) → string
//   deleteFile(key) → void
//   deletePrefix(prefix) → void  // Verwijder hele map
//
// Key format: ws_{workspaceId}/models/{modelId}/{uuid}.{ext}
// Thumbnails: ws_{workspaceId}/models/{modelId}/thumbs/{uuid}.{ext}
```

**Env vars**:
```
R2_ACCOUNT_ID=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET_NAME=branddock-media
R2_PUBLIC_URL=         # CDN endpoint (optioneel)
```

### 1.3 Image Upload Pipeline

**Nieuw bestand**: `src/lib/storage/image-processor.ts`

```typescript
// Server-side image processing:
//   validateImage(buffer) → { width, height, mimeType, isValid }
//   generateThumbnail(buffer, maxWidth=300) → Buffer
//   stripExif(buffer) → Buffer
//
// Constraints:
//   Max 10MB per bestand
//   Toegestane types: JPEG, PNG, WebP
//   Min resolutie: 512×512 (voor training kwaliteit)
//   Max 20 referentiebeelden per model
```

### Verificatie
- `npx prisma db push` succesvol
- R2 upload/download werkt (curl test met test-bestand)
- Image validatie rejecteert te kleine/grote bestanden

---

## SPRINT I.4.2 — Astria.ai Integration & Training Pipeline

### Doel
Astria.ai API client, model training flow, en webhook handling.

### 2.1 Astria Client

**Nieuw bestand**: `src/lib/integrations/astria/astria-client.ts`

```typescript
// Singleton Astria client (matching elevenlabs-client.ts patroon)
//
// Functies:
//   isAstriaConfigured() → boolean
//   createTune(params) → AstriaTune
//     - title, name, branch (flux-lora), callback URL
//     - images: Buffer[] of URL[]
//     - training params: steps, learningRate, resolution
//   getTune(tuneId) → AstriaTune
//   deleteTune(tuneId) → void
//   generateImage(tuneId, prompt, params) → AstriaGeneration
//   getGeneration(tuneId, generationId) → AstriaGeneration
//
// Types:
//   AstriaTune { id, title, name, trained_at, expires_at, ... }
//   AstriaGeneration { id, prompt, images: string[], ... }
//   AstriaTrainingParams { steps?, learningRate?, resolution?, ... }
```

**Env vars**:
```
ASTRIA_API_KEY=         # Optioneel: Astria.ai API key
ASTRIA_WEBHOOK_SECRET=  # Optioneel: webhook signature verificatie
```

### 2.2 Training Pipeline

**Nieuw bestand**: `src/lib/consistent-models/training-pipeline.ts`

```typescript
// Training orchestratie:
//
// startTraining(modelId, workspaceId):
//   1. Valideer model status (DRAFT) + ref images (min 5)
//   2. Download ref images van R2 als Buffers
//   3. Bepaal triggerWord op basis van type:
//      - PERSON: "sks person"
//      - PRODUCT: "sks product"
//      - STYLE: "sks style"
//      - OBJECT: "sks object"
//   4. POST naar Astria createTune()
//   5. Update model: status=TRAINING, astriaModelId, trainingStartedAt
//   6. Return astriaModelId
//
// handleTrainingComplete(astriaModelId, success, error?):
//   1. Lookup ConsistentModel by astriaModelId
//   2. If success:
//      - status=READY, trainingCompletedAt
//      - Generate 3 sample images met default prompt
//      - Upload samples naar R2, set thumbnailUrl + sampleImageUrls
//   3. If failure:
//      - status=TRAINING_FAILED, trainingError
//
// Training constraints:
//   - PERSON: min 5, max 20 beelden, aanbevolen 10-15
//   - PRODUCT: min 5, max 20 beelden, verschillende hoeken
//   - STYLE: min 10, max 20 beelden, consistente stijl
//   - OBJECT: min 5, max 15 beelden
```

### 2.3 Webhook Endpoint

**Nieuw bestand**: `src/app/api/consistent-models/webhook/route.ts`

```typescript
// POST /api/consistent-models/webhook
//
// Astria stuurt webhook na training completion:
//   { tune_id, status: "succeeded" | "failed", error? }
//
// Verificatie: HMAC signature check (ASTRIA_WEBHOOK_SECRET)
// Geen workspace auth nodig (server-to-server)
//
// Flow:
//   1. Verify signature
//   2. Parse body
//   3. Call handleTrainingComplete()
//   4. Return 200 OK
```

### 2.4 Polling Fallback

Voor development/testing zonder webhooks:

**Nieuw bestand**: `src/lib/consistent-models/training-poller.ts`

```typescript
// pollTrainingStatus(modelId):
//   1. Lookup ConsistentModel
//   2. getTune(astriaModelId)
//   3. If tune.trained_at → handleTrainingComplete(success)
//   4. If tune.error → handleTrainingComplete(failure)
//   5. Return current status
//
// GET /api/consistent-models/:id/training-status
//   → Roept pollTrainingStatus aan
//   → Frontend pollt elke 10s tijdens TRAINING status
```

### Verificatie
- Training start met test-beelden (5 stock foto's)
- Webhook ontvangst + signature verificatie
- Polling fallback werkt als webhook uitblijft
- Sample generatie na succesvolle training

---

## SPRINT I.4.3 — API Endpoints & State Management

### Doel
Complete REST API, TanStack Query hooks, en Zustand store.

### 3.1 API Routes

```
/api/consistent-models/
├── route.ts                    GET (list) + POST (create)
├── [id]/
│   ├── route.ts                GET (detail) + PATCH (update) + DELETE
│   ├── train/route.ts          POST (start training)
│   ├── training-status/route.ts GET (poll status)
│   ├── generate/route.ts       POST (generate image)
│   ├── generations/route.ts    GET (list generated images)
│   └── reference-images/
│       ├── route.ts            POST (upload) + GET (list)
│       ├── [imageId]/route.ts  DELETE
│       └── reorder/route.ts    PATCH (reorder)
└── webhook/route.ts            POST (Astria callback)
```

**Totaal: 12 endpoints**

#### Key endpoints detail:

**POST /api/consistent-models** (create)
```typescript
// Zod body: { name, type, description? }
// Auto: slug, workspaceId, createdById
// Response: ConsistentModelWithMeta
```

**POST /api/consistent-models/:id/reference-images** (upload)
```typescript
// multipart/form-data: image file(s)
// Per file:
//   1. validateImage (size, type, resolution)
//   2. stripExif
//   3. generateThumbnail
//   4. Upload original + thumbnail naar R2
//   5. Create ReferenceImage record
// Max 20 per model, max 10MB per file
```

**POST /api/consistent-models/:id/train** (start training)
```typescript
// Zod body: { trainingConfig?: { steps?, learningRate?, resolution? } }
// Validatie:
//   - Model status moet DRAFT of TRAINING_FAILED zijn
//   - Min 5 referentiebeelden
//   - Astria API key moet geconfigureerd zijn
// Response: { status: 'TRAINING', astriaModelId }
```

**POST /api/consistent-models/:id/generate** (generate image)
```typescript
// Zod body: {
//   prompt: string,           // "sks person standing in a modern office"
//   negativePrompt?: string,
//   width?: 512-1536,
//   height?: 512-1536,
//   seed?: number,
//   guidanceScale?: 1-20,
//   numImages?: 1-4
// }
// Validatie: model status moet READY zijn
// Flow:
//   1. Inject triggerWord in prompt als niet aanwezig
//   2. Call Astria generateImage()
//   3. Download resultaat, upload naar R2
//   4. Create GeneratedImage record
//   5. Update model usageCount
//   6. Optioneel: save naar MediaAsset (als saveToLibrary=true)
// Response: GeneratedImageResponse[]
```

### 3.2 Types

**Nieuw bestand**: `src/features/consistent-models/types/consistent-model.types.ts`

```typescript
interface ConsistentModelWithMeta {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  type: ConsistentModelType;
  status: ConsistentModelStatus;
  triggerWord: string | null;
  baseModel: string | null;
  stylePrompt: string | null;
  negativePrompt: string | null;
  thumbnailUrl: string | null;
  sampleImageUrls: string[] | null;
  usageCount: number;
  isDefault: boolean;
  referenceImageCount: number;
  createdAt: string;
  updatedAt: string;
  createdBy: { id: string; name: string };
}

interface ReferenceImageWithMeta { ... }
interface GeneratedImageWithMeta { ... }
interface TrainingStatusResponse { ... }
interface GenerateImageBody { ... }
interface ConsistentModelStats {
  total: number;
  ready: number;
  training: number;
  totalGenerations: number;
}
```

### 3.3 API Client

**Nieuw bestand**: `src/features/consistent-models/api/consistent-models.api.ts`

```typescript
// 12 fetch functies (matching project patroon):
//   fetchConsistentModels(params)
//   fetchConsistentModelDetail(id)
//   createConsistentModel(body)
//   updateConsistentModel(id, body)
//   deleteConsistentModel(id)
//   uploadReferenceImages(modelId, files)
//   deleteReferenceImage(modelId, imageId)
//   reorderReferenceImages(modelId, imageIds)
//   startTraining(modelId, config?)
//   fetchTrainingStatus(modelId)
//   generateImage(modelId, body)
//   fetchGenerations(modelId, params)
```

### 3.4 TanStack Query Hooks

**Nieuw bestand**: `src/features/consistent-models/hooks/index.ts`

```typescript
// consistentModelKeys factory
// 14 hooks:
//   useConsistentModels(params)        — lijst + stats
//   useConsistentModelDetail(id)       — detail
//   useCreateModel()                   — mutation
//   useUpdateModel(id)                 — mutation
//   useDeleteModel(id)                 — mutation
//   useUploadReferenceImages(modelId)  — mutation (multipart)
//   useDeleteReferenceImage(modelId)   — mutation
//   useReorderReferenceImages(modelId) — mutation
//   useStartTraining(modelId)          — mutation
//   useTrainingStatus(modelId)         — polling (refetchInterval 10s, enabled bij TRAINING)
//   useGenerateImage(modelId)          — mutation
//   useGenerations(modelId, params)    — lijst
//   useConsistentModelStats()          — workspace stats
//   useDefaultModel(type)              — default model per type
```

### 3.5 Zustand Store

**Nieuw bestand**: `src/features/consistent-models/stores/useConsistentModelStore.ts`

```typescript
// State:
//   selectedModelId: string | null
//   selectedModelType: ConsistentModelType | null
//   isCreateModalOpen: boolean
//   isTrainingModalOpen: boolean
//   isGenerateModalOpen: boolean
//   uploadProgress: Map<string, number>
//   generationQueue: GenerationQueueItem[]
//
// Actions:
//   setSelectedModel(id)
//   openCreateModal(type?)
//   closeCreateModal()
//   openTrainingModal()
//   openGenerateModal()
//   setUploadProgress(fileId, progress)
//   clearUploadProgress()
```

### Verificatie
- Alle 12 endpoints curl-getest
- Hooks renderen correct in dev tools
- Training status polling stopt bij READY/FAILED

---

## SPRINT I.4.4 — Frontend: Model Management UI

### Doel
Volledige UI voor model aanmaken, referentiebeelden uploaden, training starten, en resultaten bekijken.

### 4.1 Feature Directory Structuur

```
src/features/consistent-models/
├── components/
│   ├── ConsistentModelsPage.tsx          ← Overview orchestrator
│   ├── ModelStatsCards.tsx               ← 4 StatCards (total, ready, training, generations)
│   ├── ModelFilterBar.tsx               ← Search + type + status filters
│   ├── ModelCard.tsx                    ← Card met thumbnail, status badge, type icon
│   ├── CreateModelModal.tsx             ← Create form (naam, type, beschrijving)
│   ├── detail/
│   │   ├── ModelDetailPage.tsx          ← Detail orchestrator (2-kolom layout)
│   │   ├── ModelDetailHeader.tsx        ← Naam, type badge, status, actions
│   │   ├── ReferenceImagesSection.tsx   ← Upload zone + image grid + reorder
│   │   ├── ReferenceImageUploader.tsx   ← Drag & drop + file picker + progress
│   │   ├── TrainingSection.tsx          ← Training config + start + progress
│   │   ├── TrainingProgressModal.tsx    ← Real-time training status (polling)
│   │   ├── SampleGallery.tsx           ← AI-gegenereerde samples na training
│   │   ├── GenerateSection.tsx          ← Prompt input + params + generate
│   │   ├── GenerationResultCard.tsx     ← Gegenereerd beeld + metadata
│   │   └── sidebar/
│   │       ├── ModelInfoCard.tsx         ← Status, type, created, usage count
│   │       ├── TrainingStatusCard.tsx    ← Training details + progress
│   │       └── QuickActionsCard.tsx      ← Generate, Retrain, Archive, Delete
│   └── shared/
│       ├── ModelTypeBadge.tsx           ← Type → icon + kleur mapping
│       ├── ModelStatusBadge.tsx         ← Status → Badge variant mapping
│       └── TriggerWordDisplay.tsx       ← Copy-able trigger word display
├── hooks/index.ts
├── api/consistent-models.api.ts
├── stores/useConsistentModelStore.ts
├── types/consistent-model.types.ts
└── constants/model-constants.ts         ← TYPE_CONFIG, STATUS_CONFIG, TRAINING_DEFAULTS
```

### 4.2 Overview Page

**ConsistentModelsPage.tsx** — PageShell + PageHeader patroon:
- Header: titel "AI Models", count badge, "Create Model" CTA
- 4 StatCards: Total Models, Ready, In Training, Total Generations
- FilterBar: search + type dropdown (Person/Product/Style/Object) + status
- 3-kolom grid met ModelCards
- Empty state: uitleg + CTA

**ModelCard.tsx**:
- Thumbnail (of type-icon placeholder)
- Naam + beschrijving (truncated)
- ModelTypeBadge + ModelStatusBadge
- Referentie image count + generation count
- "Ready" glow effect bij READY status

### 4.3 Detail Page

**ModelDetailPage.tsx** — 2-kolom grid (8/4 split, matching persona/brand asset patroon):

**Linker kolom:**
1. **ModelDetailHeader** — naam (inline edit), type badge, status badge, breadcrumb
2. **ReferenceImagesSection** — grid van referentiebeelden met:
   - Drag & drop upload zone (max 20 beelden, min 512×512)
   - Sorteerbare grid (drag to reorder)
   - Per beeld: thumbnail, caption edit, delete, training toggle
   - Teller: "8 of 20 images"
3. **TrainingSection** (zichtbaar bij ≥5 referentiebeelden):
   - Training config: steps slider (100-1500, default 500), resolution selector
   - "Start Training" CTA (disabled bij <5 beelden of TRAINING status)
   - Na training: sample gallery
4. **GenerateSection** (zichtbaar bij READY status):
   - Prompt textarea met trigger word hint
   - Negative prompt (collapsed)
   - Grootte selector (512-1536, presets: Square/Portrait/Landscape)
   - Seed input (optioneel, voor reproduceerbare resultaten)
   - "Generate" CTA
   - Resultaten grid (1-4 beelden)

**Rechter kolom (sidebar):**
1. **ModelInfoCard** — status, type, created date, trigger word, base model
2. **TrainingStatusCard** — progress, started/completed timestamps, error details
3. **QuickActionsCard** — Generate, Retrain, Set as Default, Archive, Delete

### 4.4 Training Progress Modal

**TrainingProgressModal.tsx**:
- Status: Uploading → Training → Generating Samples → Complete
- Progress bar (estimated, Astria geeft geen real-time %)
- Elapsed time counter
- Cancel optie (met waarschuwing)
- Bij completion: 3 sample images tonen + "View Model" CTA

### Verificatie
- Model aanmaken + referentiebeelden uploaden
- Training starten en volgen (polling of webhook)
- Generatie met custom prompt
- Responsive op mobile (grid → stack)

---

## SPRINT I.4.5 — Integratie & Cross-Module

### Doel
Consistente modellen beschikbaar maken in Content Studio, Canvas, en andere modules.

### 5.1 Content Studio Integratie

**ImageSettingsPanel.tsx** uitbreiden:
- "AI Model" dropdown: workspace consistente modellen (READY status)
- Bij selectie: trigger word automatisch in prompt
- Model thumbnail als visuele hint

**Canvas Orchestrator** uitbreiden:
- `canvas-orchestrator.ts`: als deliverable een `consistentModelId` heeft:
  - Gebruik Astria API i.p.v. DALL-E 3 voor image generatie
  - Inject trigger word + model style prompt
  - Upload resultaat naar R2 + link aan GeneratedImage

### 5.2 Campaign Strategy Integratie

**Asset Planner prompt** uitbreiden:
- Als workspace consistente modellen heeft:
  - Noem beschikbare modellen in prompt context
  - AI kan modellen suggereren voor specifieke deliverables

### 5.3 Persona Foto Generatie

**Persona Generate Image** endpoint verbeteren:
- Als er een PERSON-type consistent model bestaat:
  - Gebruik dat model i.p.v. DiceBear/generic AI
  - Genereer persona-foto die consistent is met brand identity

### 5.4 Media Library Link

**GeneratedImage → MediaAsset**:
- "Save to Media Library" actie op elk gegenereerd beeld
- Automatische tagging: `ai-generated`, model naam, type
- Collection: auto-create "AI Model: {modelName}" collection

### 5.5 Settings UI

**Settings > AI Models** tab uitbreiden:
- Sectie "Consistent Models" onder bestaande feature model selecties
- Link naar Consistent Models pagina
- Astria API key configuratie (indien niet in .env)

### 5.6 Sidebar & Routing

```
// App.tsx routing toevoegingen:
'consistent-models' → ConsistentModelsPage
'consistent-model-detail' → ModelDetailPage (useConsistentModelStore.selectedModelId)

// Sidebar: onder CREATIVE HUB sectie
//   Wand2 icon, label "AI Models"
```

### 5.7 Brand Context Export

**brand-context.ts** uitbreiden:
```typescript
// Consistente modellen toevoegen aan AI context:
// "Available AI Models:
//   - Sarah (Person, trigger: 'sks person') — Brand ambassador
//   - Product Line (Product, trigger: 'sks product') — Main product range"
```

### Verificatie
- Content Studio: model selectie → consistent beeld generatie
- Canvas: automatic model usage voor image variants
- Persona: consistent foto generatie
- Media Library: generated images verschijnen
- Brand context: modellen in AI prompt

---

## NIET IN SCOPE (bewust uitgesteld)

| Item | Reden | Wanneer |
|------|-------|---------|
| Eigen GPU fine-tuning | Te complex voor v1, Astria dekt dit af | Evalueren na 3 maanden gebruik |
| Photoroom integratie | Alleen relevant voor product-only use case | Als Astria product-resultaten onvoldoende zijn |
| Video consistency | Wacht op Fase I.5 (Video Generatie) | Pas bij video-pipeline |
| Multi-model blending | Geavanceerd — combineer 2+ modellen in 1 generatie | Fase J+ |
| Real-time preview | Geen streaming image gen bij Astria | Als providers dit supporten |
| Training queue | Concurrent trainings limiet | Bij >10 workspaces actief |

---

## RISICO'S & MITIGATIE

| Risico | Impact | Mitigatie |
|--------|--------|-----------|
| Astria API downtime | Hoog — training/generatie stopt | Polling fallback, duidelijke error states, retry logica |
| Training kwaliteit tegenvallend | Hoog — gebruiker verwacht consistentie | Min 5 beelden enforced, kwaliteitsrichtlijnen in UI, retry met meer beelden |
| R2 kosten onverwacht hoog | Laag — R2 is goedkoop | Lifecycle rules (auto-delete archived >90 dagen), thumbnail-only in lists |
| Astria pricing wijzigt | Medium | Abstractie laag zodat provider swap mogelijk is |
| NSFW content in training | Hoog — reputatierisico | Astria heeft ingebouwde NSFW check, extra validatie client-side |
| Lange training tijd (>1 uur) | Medium — UX frustratie | Webhook + email notificatie, duidelijke verwachtingen in UI |

---

## TECHNISCHE BESLISSINGEN

| Beslissing | Keuze | Rationale |
|------------|-------|-----------|
| Storage provider | Cloudflare R2 | S3-compatible, goedkoop, al gepland in roadmap |
| Fine-tuning provider | Astria.ai | Managed LoRA, REST API, snelle integratie |
| Base model | Flux LoRA | Beste kwaliteit/consistentie verhouding (2026) |
| Trigger word pattern | "sks {type}" | Astria conventie, voorkomt conflicten met gewone woorden |
| Image processing | sharp (Node.js) | Server-safe, snel, thumbnails + EXIF strip |
| Upload methode | multipart/form-data | Bestaand patroon in codebase (product images, media upload) |

---

## DEPENDENCIES

### Nieuwe npm packages
```
@aws-sdk/client-s3          # R2 (S3-compatible)
@aws-sdk/s3-request-presigner  # Signed URLs
sharp                        # Image processing (thumbnails, validation)
```

### Externe services
- **Cloudflare R2** — object storage (gratis egress, $0.015/GB/maand opslag)
- **Astria.ai** — fine-tuning API ($0.50-2.00/training, $0.02/generatie)

### Interne dependencies
- Fase I.3 moet af zijn (AI-Gegenereerde Beelden werkend met Gemini/DALL-E)
- `src/lib/ai/gemini-client.ts` — bestaande image analysis
- `src/features/media-library/` — MediaAsset model + hooks
- `src/lib/storage/` — nieuwe directory voor R2 client

---

## SUCCES CRITERIA

Na afronding van Fase I.4:

1. **Consistentie**: Gegenereerde beelden van hetzelfde model zijn visueel consistent (zelfde persoon/product herkenbaar)
2. **Training flow**: Van referentie-upload tot eerste generatie < 1 uur
3. **Integratie**: Consistente modellen beschikbaar in Content Studio + Canvas
4. **UX**: Niet-technische gebruiker kan model aanmaken en gebruiken zonder uitleg
5. **Stabiliteit**: Training success rate > 80% bij correct gebruik (≥5 goede ref beelden)
6. **Kosten**: < $5 per model training, < $0.05 per generatie

---

## DONE DEFINITIE

- [ ] Cloudflare R2 opslag werkt (upload, download, delete, signed URLs)
- [ ] Astria.ai integratie werkt (training starten, status pollen, genereren)
- [ ] 12 API endpoints live en curl-getest
- [ ] ConsistentModelsPage overview met filters en stats
- [ ] ModelDetailPage met referentie upload, training, en generatie
- [ ] Content Studio kan consistent model selecteren voor image generatie
- [ ] Canvas orchestrator gebruikt consistent model als beschikbaar
- [ ] Media Library link (save generated images)
- [ ] TypeScript 0 errors
- [ ] Seed data: 1 demo model (PERSON, READY) met sample images
