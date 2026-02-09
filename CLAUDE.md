# Branddock

## Project Overview
Branddock is a SaaS platform that combines brand strategy, validation through research, and content creation in a single workflow. The core loop is: Knowledge → Strategy → Content, where all content is campaign-driven and research-backed.

## Tech Stack
- **Framework:** Next.js 15 (App Router, TypeScript strict)
- **Styling:** Tailwind CSS 4, dark mode via `class` strategy
- **Database:** PostgreSQL via Prisma ORM
- **Auth:** NextAuth v5 (Google + Microsoft OAuth)
- **State:** Zustand (client), TanStack Query (server)
- **AI Providers:** OpenAI (GPT-4), Anthropic (Claude), Google AI (Gemini/Veo)
- **Payments:** Stripe
- **Package Manager:** pnpm

## Project Structure
```
src/
├── app/                    # Next.js App Router pages
│   ├── (auth)/             # Login, register, forgot-password
│   ├── (dashboard)/        # Authenticated routes
│   │   ├── dashboard/
│   │   ├── knowledge/      # Brand Foundation, Strategy, Brandstyle, Personas, Products, Insights, Library, Alignment
│   │   ├── strategy/       # Campaigns, Content Studio, Content Library
│   │   ├── validation/     # Research Hub, Bundles, Custom Validation
│   │   └── settings/       # Account, Team, Billing, Notifications, Appearance
│   └── api/                # API routes
├── components/
│   ├── ui/                 # Tier 1: Button, Modal, Badge, Input, etc.
│   ├── layout/             # Tier 2: Sidebar, TopBar, StepperWizard
│   ├── cards/              # Tier 3: PersonaCard, CampaignCard, etc.
│   └── platform/           # Tier 4: Feature-specific components
├── features/               # Feature modules with co-located components
│   ├── knowledge/
│   ├── strategy/
│   └── validation/
├── hooks/                  # Shared React hooks
├── lib/                    # Utils, API client, AI config
│   ├── api/                # API client with error handling
│   ├── ai/                 # AI provider config and routing
│   └── utils/              # Helper functions
├── stores/                 # Zustand stores
├── types/                  # TypeScript interfaces
└── styles/                 # Global CSS + design tokens
```

## Design System
- **Primary color:** #10B981 (emerald green)
- **Spacing:** 4px grid system
- **Border radius:** 6px default
- **Font:** Inter (sans), JetBrains Mono (code)
- **Icons:** Lucide React (consistent set, never mix icon libraries)
- **Dark mode:** Full support via Tailwind `dark:` classes
- **Sidebar:** 256px expanded, 64px collapsed
- **TopBar:** 64px height
- **Max content width:** 1200px

## Component Conventions
- All components use TypeScript with explicit prop interfaces
- Use `cn()` utility (clsx + tailwind-merge) for conditional classes
- Components follow: `ComponentName.tsx` naming
- Stories: `ComponentName.stories.tsx`
- Tests: `ComponentName.test.tsx`
- Export from barrel files (`index.ts`)

## API Conventions
- API routes in `app/api/[module]/[entity]/route.ts`
- Use Zod for request validation
- Standard response format: `{ data, error, meta }`
- Error codes: 4-digit codes per module (1xxx auth, 2xxx knowledge, etc.)
- Always check permissions with `requireRole()` middleware

## State Management
- **Zustand** for UI state (sidebar, modals, theme)
- **TanStack Query** for all server data (queries + mutations)
- Query key convention: `['module', 'entity', id?]`
- Invalidate related queries after mutations

## Database
- Prisma schema in `prisma/schema.prisma`
- Migrations via `pnpx prisma migrate dev`
- Seed data via `prisma/seed.ts`
- All entities have: `id`, `createdAt`, `updatedAt`, `createdById`
- Soft delete via `deletedAt` where applicable

## Permissions (RBAC)
- 4 roles: Owner > Admin > Editor > Viewer
- Viewer: read-only
- Editor: CRUD own items, cannot lock/unlock
- Admin: full CRUD + team management
- Owner: everything + billing + workspace deletion
- Locked entities: only Admin/Owner can edit

## AI Integration
- OpenAI: brand analysis, content generation, quality scoring
- Anthropic: persona analysis, campaign strategy, alignment scan
- Google AI: image generation (Gemini), video generation (Veo)
- All AI calls go through `lib/ai/` with rate limiting and error handling
- Never expose API keys client-side

## Key Principles
1. **Campaign-driven:** All content belongs to a campaign
2. **Validation-first:** Strategy is validated before content creation
3. **Type-safe:** No `any` types, strict TypeScript
4. **Permission-aware:** Every action checks RBAC
5. **Error-first:** Handle errors before happy path
6. **Dark mode:** Every component must support dark mode
7. **Responsive:** Mobile-friendly, but desktop-first

## Git Conventions
- Branch: `feature/[module]-[feature]` (e.g., `feature/knowledge-personas`)
- Commits: conventional commits (`feat:`, `fix:`, `refactor:`, `docs:`)
- PR per feature, squash merge to main

## Common Commands
```bash
pnpm dev              # Start dev server (localhost:3000)
pnpm build            # Production build
pnpm lint             # ESLint
pnpm test             # Run tests (Vitest)
pnpm test:e2e         # E2E tests (Playwright)
pnpm storybook        # Component playground (localhost:6006)
pnpx prisma studio    # Database GUI
pnpx prisma migrate dev --name [name]  # New migration
```

## Progress
- Sprints 1–12: Foundation, auth, layout, component library, dashboard, core routes (37 routes)
- Sprint 13: Strategy module — SCR-02a New Campaign Wizard, SCR-02b Quick Content Modal, SCR-02d Quick Content Detail
- Sprint 14: Content & Strategy — SCR-03 Content Library, SCR-16 Content Studio, SCR-05a Strategy Detail
- Sprint 15: Brand Foundation research — SCR-04b AI Brand Analysis, SCR-04c Workshop Purchase, SCR-04d Workshop Session, SCR-04e Workshop Complete
- Sprint 16: Interviews & Questionnaire — SCR-04f Interviews, SCR-04g Questionnaire
- Sprint 17: Brand Style & Personas — SCR-06a Styleguide, SCR-07a Create Persona, SCR-07b Persona Detail, SCR-07c AI Persona Analysis, SCR-07d Analysis Complete
- Sprint 18: Products & Services — SCR-08a Product Analyzer, SCR-08b Analyzing Modal, SCR-08c Product Detail
- ✅ **All 37 screens built with mock data. Full UI coverage complete.**
- **Current: Sprint 19–22 Database & API backlog below**

---

# Database & API Backlog (Sprints 19–22)

## How to Use This Backlog
Work through tasks **sequentially** (Task 1 → Task 12). Each task = one domain model + its API routes = one git commit.

**Per task:**
1. Add the Prisma model(s) to `prisma/schema.prisma`
2. Run `pnpx prisma migrate dev --name [task-name]`
3. Add seed data to `prisma/seed.ts` for the new model
4. Create API routes in `src/app/api/`
5. Commit: `feat(db): add [model] schema + API routes`
6. Move to next task

**Conventions:**
- All entities: `id` (cuid), `createdAt`, `updatedAt`, `createdById`
- Soft delete: `deletedAt DateTime?` where applicable
- API response format: `{ data, error, meta }`
- Zod validation on all inputs
- Routes: `src/app/api/[module]/[entity]/route.ts`
- Query params for filtering/pagination: `?page=1&limit=20&sort=createdAt&order=desc`

---

## SPRINT 19 — Core Foundation Models

### Task 1: Workspace & User Models
**Why first:** Everything belongs to a workspace. All other models reference these.

**Prisma Models:**

```prisma
model Workspace {
  id          String   @id @default(cuid())
  name        String
  slug        String   @unique
  logo        String?
  plan        Plan     @default(FREE)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  members     WorkspaceMember[]
  campaigns   Campaign[]
  personas    Persona[]
  products    Product[]
  assets      BrandAsset[]
  styleguides BrandStyleguide[]
  strategies  BusinessStrategy[]
}

model User {
  id            String    @id @default(cuid())
  name          String
  email         String    @unique
  emailVerified DateTime?
  image         String?
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt

  accounts      Account[]
  sessions      Session[]
  memberships   WorkspaceMember[]
}

model WorkspaceMember {
  id          String   @id @default(cuid())
  role        Role     @default(VIEWER)
  joinedAt    DateTime @default(now())

  userId      String
  user        User      @relation(fields: [userId], references: [id])
  workspaceId String
  workspace   Workspace @relation(fields: [workspaceId], references: [id])

  @@unique([userId, workspaceId])
}

enum Role {
  OWNER
  ADMIN
  EDITOR
  VIEWER
}

enum Plan {
  FREE
  STARTER
  PROFESSIONAL
  ENTERPRISE
}
```

**Note:** NextAuth Account/Session models should already exist. If not, add them per NextAuth Prisma adapter docs.

**API Routes:**
- `GET/PATCH /api/workspace` — get/update current workspace
- `GET/POST /api/workspace/members` — list/invite members
- `PATCH/DELETE /api/workspace/members/[memberId]` — update role/remove

**Seed:** 1 workspace "Branddock Demo" + 2 users (owner + editor)

---

### Task 2: Campaign & Content Models
**Why second:** Campaigns are the backbone — all content belongs to a campaign.

```prisma
model Campaign {
  id          String         @id @default(cuid())
  name        String
  description String?
  status      CampaignStatus @default(DRAFT)
  startDate   DateTime?
  endDate     DateTime?
  createdAt   DateTime       @default(now())
  updatedAt   DateTime       @updatedAt
  deletedAt   DateTime?

  workspaceId String
  workspace   Workspace @relation(fields: [workspaceId], references: [id])
  createdById String

  contents    Content[]
}

model Content {
  id          String        @id @default(cuid())
  title       String
  type        ContentType
  status      ContentStatus @default(DRAFT)
  body        String?       @db.Text
  format      String?       // "blog", "social", "email", etc.
  channel     String?       // "instagram", "linkedin", "website", etc.
  metadata    Json?         // flexible field for type-specific data
  onBrand     Boolean       @default(false)
  brandScore  Float?
  createdAt   DateTime      @default(now())
  updatedAt   DateTime      @updatedAt
  deletedAt   DateTime?

  campaignId  String
  campaign    Campaign @relation(fields: [campaignId], references: [id])
  createdById String
}

enum CampaignStatus {
  DRAFT
  ACTIVE
  PAUSED
  COMPLETED
  ARCHIVED
}

enum ContentType {
  TEXT
  IMAGE
  VIDEO
}

enum ContentStatus {
  DRAFT
  IN_REVIEW
  APPROVED
  PUBLISHED
  ARCHIVED
}
```

**API Routes:**
- `GET/POST /api/campaigns` — list/create campaigns
- `GET/PATCH/DELETE /api/campaigns/[campaignId]` — CRUD single campaign
- `GET/POST /api/campaigns/[campaignId]/contents` — list/create content in campaign
- `GET/PATCH/DELETE /api/contents/[contentId]` — CRUD single content

**Seed:** 2 campaigns ("Q1 Brand Launch", "Product Awareness") with 4 contents each (mix of types/statuses)

---

### Task 3: Brand Asset Model (Brand Foundation)
**Why third:** Assets are referenced by interviews, questionnaires, workshops, and AI analysis.

```prisma
model BrandAsset {
  id              String          @id @default(cuid())
  name            String          // "Golden Circle", "Core Values", etc.
  category        AssetCategory
  description     String?         @db.Text
  content         Json?           // flexible: stores the actual asset data
  status          AssetStatus     @default(DRAFT)
  validationScore Float           @default(0) // 0-100%
  isLocked        Boolean         @default(false)
  lockedAt        DateTime?
  lockedById      String?
  createdAt       DateTime        @default(now())
  updatedAt       DateTime        @updatedAt
  deletedAt       DateTime?

  workspaceId     String
  workspace       Workspace @relation(fields: [workspaceId], references: [id])
  createdById     String

  aiAnalyses      AIAnalysis[]
  workshops       Workshop[]
  interviews      Interview[]
  questionnaires  Questionnaire[]
}

enum AssetCategory {
  FOUNDATION    // Golden Circle, Core Values, Brand Promise
  STRATEGY      // Brand Positioning, Competitive Advantage
  EXPRESSION    // Brand Personality, Tone of Voice
  IDENTITY      // Visual Identity elements
}

enum AssetStatus {
  DRAFT
  IN_PROGRESS
  AI_ANALYSIS_COMPLETE
  VALIDATED
  LOCKED
}
```

**API Routes:**
- `GET/POST /api/assets` — list/create brand assets
- `GET/PATCH/DELETE /api/assets/[assetId]` — CRUD single asset
- `PATCH /api/assets/[assetId]/lock` — lock/unlock asset
- `GET /api/assets/stats` — validation overview stats

**Seed:** 6 assets (Golden Circle, Core Values, Brand Promise, Brand Positioning, Brand Personality, Competitive Advantage) with varying statuses and validation scores

---

## SPRINT 20 — Research Method Models

### Task 4: AI Analysis Model
**For:** SCR-04b AI Brand Analysis + SCR-07c/07d AI Persona Analysis

```prisma
model AIAnalysis {
  id              String           @id @default(cuid())
  type            AIAnalysisType
  status          AnalysisStatus   @default(IN_PROGRESS)
  progress        Float            @default(0)
  dataPoints      Int              @default(0)
  duration        Int?             // seconds

  messages        Json             // array of {role, content, timestamp}

  executiveSummary String?         @db.Text
  keyFindings     Json?            // array of finding objects
  recommendations Json?            // array of recommendation objects
  dimensions      Json?            // for persona analysis: 4 dimension summaries
  confidenceBoost Float?           // e.g. +35% for persona

  createdAt       DateTime         @default(now())
  updatedAt       DateTime         @updatedAt

  assetId         String?
  asset           BrandAsset?  @relation(fields: [assetId], references: [id])
  personaId       String?
  persona         Persona?     @relation(fields: [personaId], references: [id])
  createdById     String
}

enum AIAnalysisType {
  BRAND_ANALYSIS
  PERSONA_ANALYSIS
}

enum AnalysisStatus {
  IN_PROGRESS
  COMPLETED
  ARCHIVED
}
```

**API Routes:**
- `POST /api/assets/[assetId]/ai-analysis` — start brand analysis
- `GET /api/assets/[assetId]/ai-analysis` — get analysis
- `PATCH /api/ai-analysis/[analysisId]` — update (add messages, complete)
- `POST /api/personas/[personaId]/ai-analysis` — start persona analysis
- `GET /api/personas/[personaId]/ai-analysis` — get persona analysis

**Seed:** 1 completed brand analysis (with messages, findings, recommendations) + 1 completed persona analysis (with 4 dimensions)

---

### Task 5: Workshop Model
**For:** SCR-04c Purchase + SCR-04d Session + SCR-04e Complete

```prisma
model Workshop {
  id              String          @id @default(cuid())
  title           String
  status          WorkshopStatus  @default(DRAFT)
  type            String          @default("golden-circle")

  bundle          String?
  hasFacilitator  Boolean         @default(false)
  purchaseAmount  Float?
  purchasedAt     DateTime?

  currentStep     Int             @default(0)
  totalSteps      Int             @default(6)
  startedAt       DateTime?
  completedAt     DateTime?
  duration        Int?

  facilitator     String?
  participantCount Int            @default(0)
  participants    Json?

  stepResponses   Json?
  canvas          Json?           // Golden Circle: {why, how, what}
  objectives      Json?
  agenda          Json?
  aiReport        Json?
  notes           Json?
  gallery         Json?

  createdAt       DateTime        @default(now())
  updatedAt       DateTime        @updatedAt

  assetId         String
  asset           BrandAsset  @relation(fields: [assetId], references: [id])
  createdById     String
}

enum WorkshopStatus {
  DRAFT
  PURCHASED
  IN_PROGRESS
  COMPLETED
}
```

**API Routes:**
- `POST /api/assets/[assetId]/workshops` — create/purchase workshop
- `GET /api/assets/[assetId]/workshops` — list workshops for asset
- `GET /api/workshops/[workshopId]` — get workshop detail
- `PATCH /api/workshops/[workshopId]` — update progress/responses
- `PATCH /api/workshops/[workshopId]/complete` — mark complete, generate results

**Seed:** 1 completed workshop (full data) + 1 in-progress

---

### Task 6: Interview Model
**For:** SCR-04f Interviews (5-step wizard)

```prisma
model Interview {
  id              String           @id @default(cuid())
  title           String?
  status          InterviewStatus  @default(TO_SCHEDULE)
  currentStep     Int              @default(1)

  contactName     String?
  contactPosition String?
  contactEmail    String?
  contactPhone    String?
  contactCompany  String?

  scheduledDate   DateTime?
  scheduledTime   String?
  duration        Int              @default(60)

  questions       Json?
  selectedAssets  Json?

  answers         Json?
  generalNotes    String?          @db.Text
  completionRate  Float            @default(0)

  isLocked        Boolean          @default(false)
  lockedAt        DateTime?
  approvedAt      DateTime?

  createdAt       DateTime         @default(now())
  updatedAt       DateTime         @updatedAt
  deletedAt       DateTime?

  assetId         String
  asset           BrandAsset   @relation(fields: [assetId], references: [id])
  createdById     String
}

enum InterviewStatus {
  TO_SCHEDULE
  SCHEDULED
  IN_PROGRESS
  COMPLETED
  IN_REVIEW
  APPROVED
}
```

**API Routes:**
- `GET/POST /api/assets/[assetId]/interviews` — list/create
- `GET/PATCH/DELETE /api/interviews/[interviewId]` — CRUD
- `PATCH /api/interviews/[interviewId]/lock` — approve & lock
- `GET /api/interview-templates` — get question templates

**Seed:** 3 interviews (1 completed+locked, 1 scheduled, 1 to-schedule) with questions and answers

---

### Task 7: Questionnaire Model
**For:** SCR-04g Questionnaire (5-step wizard)

```prisma
model Questionnaire {
  id              String                @id @default(cuid())
  name            String
  description     String?
  status          QuestionnaireStatus   @default(DRAFT)
  currentStep     Int                   @default(1)

  questions       Json?
  distributionMethod String             @default("email")
  emailSubject    String?
  emailBody       String?
  isAnonymous     Boolean               @default(false)
  allowMultiple   Boolean               @default(false)
  reminderDays    Int?
  shareableLink   String?

  recipients      Json?
  totalResponses  Int                   @default(0)
  responseRate    Float                 @default(0)
  completionRate  Float                 @default(0)
  avgTime         Int?
  responses       Json?
  aiInsights      Json?
  isValidated     Boolean               @default(false)
  isLocked        Boolean               @default(false)
  validatedAt     DateTime?

  createdAt       DateTime              @default(now())
  updatedAt       DateTime              @updatedAt
  deletedAt       DateTime?

  assetId         String
  asset           BrandAsset        @relation(fields: [assetId], references: [id])
  createdById     String
}

enum QuestionnaireStatus {
  DRAFT
  COLLECTING
  ANALYZED
  VALIDATED
}
```

**API Routes:**
- `GET/POST /api/assets/[assetId]/questionnaires` — list/create
- `GET/PATCH/DELETE /api/questionnaires/[questionnaireId]` — CRUD
- `PATCH /api/questionnaires/[questionnaireId]/validate` — validate & lock
- `POST /api/questionnaires/[questionnaireId]/send` — send to recipients
- `POST /api/questionnaires/[questionnaireId]/responses` — submit response (public endpoint)

**Seed:** 2 questionnaires (1 analyzed with 42 responses + AI insights, 1 draft)

---

## SPRINT 21 — Knowledge Module Models

### Task 8: Persona Model
**For:** SCR-07a Create + SCR-07b Detail + SCR-07c/d Analysis

```prisma
model Persona {
  id                  String   @id @default(cuid())
  name                String
  tagline             String?
  imageUrl            String?
  researchConfidence  Float    @default(0)
  methodsCompleted    Int      @default(0)
  isLocked            Boolean  @default(false)

  age                 String?
  gender              String?
  location            String?
  occupation          String?
  education           String?
  income              String?
  familyStatus        String?

  personalityType     String?
  coreValues          Json?
  interests           Json?

  goals               Json?
  motivations         Json?
  frustrations        Json?

  behaviors           Json?
  strategicImplications Json?

  createdAt           DateTime @default(now())
  updatedAt           DateTime @updatedAt
  deletedAt           DateTime?

  workspaceId         String
  workspace           Workspace @relation(fields: [workspaceId], references: [id])
  createdById         String

  aiAnalyses          AIAnalysis[]
  products            ProductPersona[]
}
```

**API Routes:**
- `GET/POST /api/personas` — list/create
- `GET/PATCH/DELETE /api/personas/[personaId]` — CRUD
- `PATCH /api/personas/[personaId]/lock` — lock/unlock
- `POST /api/personas/[personaId]/generate-image` — trigger image generation (stub)
- `POST /api/personas/[personaId]/generate-implications` — trigger AI strategic implications (stub)

**Seed:** 2 personas ("Sarah the Startup Founder" with full data, "Marcus the Marketing Director" partial)

---

### Task 9: Product Model
**For:** SCR-08a Analyzer + SCR-08b Modal + SCR-08c Detail

```prisma
model Product {
  id              String        @id @default(cuid())
  name            String
  description     String?       @db.Text
  category        String?
  source          ProductSource @default(MANUAL)
  sourceUrl       String?
  status          ProductAnalysisStatus @default(DRAFT)

  pricingModel    String?
  pricingDetails  String?

  features        Json?
  benefits        Json?
  useCases        Json?
  targetAudience  Json?

  analyzedAt      DateTime?
  analysisSteps   Json?

  createdAt       DateTime      @default(now())
  updatedAt       DateTime      @updatedAt
  deletedAt       DateTime?

  workspaceId     String
  workspace       Workspace @relation(fields: [workspaceId], references: [id])
  createdById     String

  personas        ProductPersona[]
}

model ProductPersona {
  id         String  @id @default(cuid())
  productId  String
  product    Product @relation(fields: [productId], references: [id])
  personaId  String
  persona    Persona @relation(fields: [personaId], references: [id])

  @@unique([productId, personaId])
}

enum ProductSource {
  MANUAL
  WEBSITE_URL
  PDF_UPLOAD
}

enum ProductAnalysisStatus {
  DRAFT
  ANALYZING
  ANALYZED
}
```

**API Routes:**
- `GET/POST /api/products` — list/create (manual entry)
- `POST /api/products/analyze-url` — analyze from URL (stub, returns mock)
- `POST /api/products/analyze-pdf` — analyze from PDF (stub)
- `GET/PATCH/DELETE /api/products/[productId]` — CRUD
- `POST/DELETE /api/products/[productId]/personas` — link/unlink personas

**Seed:** 2 products ("Digital Platform Suite" analyzed, "Consulting Services" manual) + persona links

---

### Task 10: Brand Styleguide Model
**For:** SCR-06a Brand Styleguide

```prisma
model BrandStyleguide {
  id          String   @id @default(cuid())
  sourceUrl   String?
  sourceType  String?

  logo        Json?
  colors      Json?
  typography  Json?
  toneOfVoice Json?
  imagery     Json?

  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  createdById String

  workspaceId String
  workspace   Workspace @relation(fields: [workspaceId], references: [id])
}
```

**API Routes:**
- `GET /api/styleguide` — get current workspace styleguide
- `POST /api/styleguide` — create from analysis
- `PATCH /api/styleguide` — update sections
- `PATCH /api/styleguide/[section]` — update single section

**Seed:** 1 complete styleguide with mock data per section

---

### Task 11: Business Strategy Model
**For:** SCR-05a Strategy Detail (already built)

```prisma
model BusinessStrategy {
  id          String   @id @default(cuid())
  type        String
  title       String
  description String?  @db.Text
  status      String   @default("draft")
  content     Json?
  isLocked    Boolean  @default(false)

  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  deletedAt   DateTime?

  workspaceId String
  workspace   Workspace @relation(fields: [workspaceId], references: [id])
  createdById String
}
```

**API Routes:**
- `GET/POST /api/strategies` — list/create
- `GET/PATCH/DELETE /api/strategies/[strategyId]` — CRUD

**Seed:** 2 strategies ("Competitive Analysis" complete, "Growth Strategy" draft)

---

## SPRINT 22 — Wiring Pages to API

### Task 12: Connect All Pages to API
Replace hardcoded mock data with TanStack Query hooks across all screens.

**Pattern per module:**
```typescript
// src/hooks/use[Module].ts
export function useAssets() {
  return useQuery({
    queryKey: ['knowledge', 'assets'],
    queryFn: () => api.get('/api/assets'),
  })
}

export function useCreateAsset() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data) => api.post('/api/assets', data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['knowledge', 'assets'] }),
  })
}
```

**Work through modules in this order:**
1. Campaigns + Content (SCR-02a, 02b, 02d, 03, 16)
2. Brand Assets (SCR-04 series)
3. Personas (SCR-07 series)
4. Products (SCR-08 series)
5. Styleguide (SCR-06a)
6. Business Strategy (SCR-05a)

**Per module create:**
- `src/hooks/use[Module].ts` — TanStack Query hooks
- `src/lib/api/[module].ts` — API client functions
- Update page components to use hooks instead of hardcoded data
- Add loading states (skeleton), error states, empty states

**Commit:** `feat(api): wire [module] pages to API` (one commit per module)

---

## Completion Checklist
- [ ] Task 1: Workspace & User models + API
- [ ] Task 2: Campaign & Content models + API
- [ ] Task 3: Brand Asset model + API
- [ ] Task 4: AI Analysis model + API
- [ ] Task 5: Workshop model + API
- [ ] Task 6: Interview model + API
- [ ] Task 7: Questionnaire model + API
- [ ] Task 8: Persona model + API
- [ ] Task 9: Product model + API
- [ ] Task 10: Brand Styleguide model + API
- [ ] Task 11: Business Strategy model + API
- [ ] Task 12: Wire all pages to API (TanStack Query)
