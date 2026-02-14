# BRANDDOCK — Implementatieplan Fase 1E
## Interviews — 5-Stap Wizard, Question Templates, Conduct & Review
**Datum:** 13 februari 2026
**Doel:** Complete interview management flow: planning, vragenlijst configuratie, live capture, review & approve
**Vereist:** Fase 11 ✅ + Fase 1A ✅ + Fase 1B ✅ + Fase 1C ✅ + Fase 1D ✅
**Geschatte duur:** 2-3 sessies

---

## HOE DIT PLAN TE GEBRUIKEN

```bash
# In Claude Code:
> Lees IMPLEMENTATIEPLAN-FASE-1E.md en voer Stap 1 uit.
```

---

## OVERZICHT

De Interviews module is de derde research method binnen Brand Asset Detail. Het biedt een complete workflow voor stakeholder interviews: van planning tot goedkeuring. Uniek is de **5-stap wizard** en het **question template systeem** met meerdere vraagtypes.

```
Brand Asset Detail (Fase 1C) → klik "Interviews" research method card
  → Interviews Overview (cards + stats)
    → + Add Interview
      → 5-Stap Wizard:
        ① Contact    — interviewee gegevens
        ② Schedule   — datum, tijd, duur
        ③ Questions  — asset selectie + vragen configuratie + templates
        ④ Conduct    — live interview capture per vraag
        ⑤ Review     — resultaten bekijken + approve & lock
```

**Route:** `/knowledge/brand-foundation/[slug]/interviews`
**Interview detail:** `/knowledge/brand-foundation/[slug]/interviews/[interviewId]`

**Kernconcepten:**
- **5-stap wizard** met stepper (groene vinkjes voor completed)
- **5 vraagtypes:** Open, Multiple Choice, Multi-Select, Rating Scale (1-5), Ranking
- **Question Templates** per asset type (slide-out panel met zoek + filter)
- **Conduct mode** met vraag-voor-vraag navigatie + progress tracking
- **Approve & Lock** maakt interview onbewerkbaar
- **Status flow:** To Schedule → Scheduled → Interview Held → In Review → Completed

---

## STAP 1: DATABASE

### Stap 1A — Prisma Schema

**Nieuwe modellen toevoegen aan `prisma/schema.prisma`:**

```prisma
// ============================================
// INTERVIEW MODELLEN (Fase 1E)
// ============================================

model Interview {
  id              String            @id @default(cuid())
  brandAssetId    String
  brandAsset      BrandAsset        @relation(fields: [brandAssetId], references: [id], onDelete: Cascade)
  status          InterviewStatus   @default(TO_SCHEDULE)
  title           String?           // "Leadership Interview #1"
  orderNumber     Int               // Auto-increment per asset

  // Contact (Step 1)
  intervieweeName     String?
  intervieweePosition String?
  intervieweeEmail    String?
  intervieweePhone    String?
  intervieweeCompany  String?

  // Schedule (Step 2)
  scheduledDate   DateTime?
  scheduledTime   String?           // "10:00"
  durationMinutes Int               @default(60)

  // Conduct (Step 4)
  conductedAt     DateTime?
  actualDuration  Int?              // werkelijke duur in minuten
  generalNotes    String?           @db.Text

  // Review (Step 5)
  isLocked        Boolean           @default(false)
  lockedAt        DateTime?
  approvedAt      DateTime?

  // Wizard tracking
  currentStep     Int               @default(1)  // 1-5
  completedSteps  Int[]             @default([]) // [1, 2, 3]

  // Relations
  questions       InterviewQuestion[]
  selectedAssets  InterviewAssetLink[]

  workspaceId     String
  workspace       Workspace         @relation(fields: [workspaceId], references: [id])
  createdById     String
  createdBy       User              @relation(fields: [createdById], references: [id])
  createdAt       DateTime          @default(now())
  updatedAt       DateTime          @updatedAt

  @@index([brandAssetId])
  @@index([workspaceId])
}

model InterviewAssetLink {
  id            String      @id @default(cuid())
  interviewId   String
  interview     Interview   @relation(fields: [interviewId], references: [id], onDelete: Cascade)
  brandAssetId  String
  brandAsset    BrandAsset  @relation(fields: [brandAssetId], references: [id])

  @@unique([interviewId, brandAssetId])
  @@index([interviewId])
}

model InterviewQuestion {
  id              String              @id @default(cuid())
  interviewId     String
  interview       Interview           @relation(fields: [interviewId], references: [id], onDelete: Cascade)
  linkedAssetId   String?             // optioneel gekoppeld aan specifiek asset
  linkedAsset     BrandAsset?         @relation("QuestionAssetLink", fields: [linkedAssetId], references: [id])
  questionType    InterviewQuestionType
  questionText    String              @db.Text
  options         String[]            // voor MC, Multi-Select, Ranking
  orderIndex      Int
  isFromTemplate  Boolean             @default(false)
  templateId      String?

  // Answer
  answerText      String?             @db.Text  // open vragen
  answerOptions   String[]            // geselecteerde opties (MC, MS)
  answerRating    Int?                // 1-5 voor rating
  answerRanking   String[]            // gerangschikte opties
  isAnswered      Boolean             @default(false)

  @@index([interviewId])
  @@index([linkedAssetId])
}

model InterviewQuestionTemplate {
  id              String              @id @default(cuid())
  questionText    String              @db.Text
  questionType    InterviewQuestionType
  options         String[]
  category        String              // "golden_circle", "core_values", "brand_positioning", "brand_personality", "general"
  assetSlug       String?             // optioneel: linked asset slug
  workspaceId     String?             // null = global template
  workspace       Workspace?          @relation(fields: [workspaceId], references: [id])
  createdAt       DateTime            @default(now())

  @@index([category])
  @@index([workspaceId])
}

enum InterviewStatus {
  TO_SCHEDULE
  SCHEDULED
  INTERVIEW_HELD
  IN_REVIEW
  COMPLETED
}

enum InterviewQuestionType {
  OPEN
  MULTIPLE_CHOICE
  MULTI_SELECT
  RATING_SCALE
  RANKING
}
```

**Relaties toevoegen aan bestaande modellen:**
```prisma
// In model BrandAsset — voeg toe:
  interviews          Interview[]
  interviewAssetLinks InterviewAssetLink[]
  linkedQuestions      InterviewQuestion[]   @relation("QuestionAssetLink")

// In model Workspace — voeg toe:
  interviews              Interview[]
  interviewQuestionTemplates InterviewQuestionTemplate[]

// In model User — voeg toe:
  createdInterviews   Interview[]
```

### Stap 1B — Migratie

```bash
npx prisma migrate dev --name add-interview-models
```

### Stap 1C — Seed Data

Voeg toe aan `prisma/seed.ts`:

```typescript
// ============================================
// INTERVIEW SEED DATA
// ============================================

// 1. Question Templates (global — 20+ templates)
const questionTemplates = [
  // Golden Circle Templates
  { questionText: "What do you believe is our core purpose (WHY)?", questionType: "OPEN", options: [], category: "golden_circle", assetSlug: "brand-purpose" },
  { questionText: "How would you explain our brand's reason for existing to a stranger?", questionType: "OPEN", options: [], category: "golden_circle", assetSlug: "brand-purpose" },
  { questionText: "Rate how clearly our WHY is communicated internally", questionType: "RATING_SCALE", options: [], category: "golden_circle", assetSlug: "brand-purpose" },
  { questionText: "Which of these best describes our unique approach (HOW)?", questionType: "MULTIPLE_CHOICE", options: ["Technology-driven innovation", "Human-centered design", "Data-informed creativity", "Collaborative co-creation"], category: "golden_circle", assetSlug: "brand-purpose" },

  // Core Values Templates
  { questionText: "Which of our stated core values resonates most with your daily work?", questionType: "MULTIPLE_CHOICE", options: ["Innovation", "Authenticity", "Collaboration", "Excellence", "Empowerment"], category: "core_values", assetSlug: "core-values" },
  { questionText: "How well do our core values guide decision-making in your team?", questionType: "RATING_SCALE", options: [], category: "core_values", assetSlug: "core-values" },
  { questionText: "Can you share an example where our values influenced a business decision?", questionType: "OPEN", options: [], category: "core_values", assetSlug: "core-values" },
  { questionText: "Rank these values by how strongly they're lived in the organization", questionType: "RANKING", options: ["Innovation", "Authenticity", "Collaboration", "Excellence"], category: "core_values", assetSlug: "core-values" },

  // Brand Positioning Templates
  { questionText: "How would you position our brand compared to our top 3 competitors?", questionType: "OPEN", options: [], category: "brand_positioning", assetSlug: "brand-positioning" },
  { questionText: "Which attributes best differentiate us from competitors?", questionType: "MULTI_SELECT", options: ["AI-powered tools", "Ease of use", "Brand consistency", "All-in-one platform", "Customer support", "Price"], category: "brand_positioning", assetSlug: "brand-positioning" },
  { questionText: "Rate how effectively we communicate our unique value proposition", questionType: "RATING_SCALE", options: [], category: "brand_positioning", assetSlug: "brand-positioning" },

  // Brand Personality Templates
  { questionText: "If our brand were a person, how would you describe their personality?", questionType: "OPEN", options: [], category: "brand_personality", assetSlug: null },
  { questionText: "Which personality traits should our brand embody?", questionType: "MULTI_SELECT", options: ["Innovative", "Trustworthy", "Bold", "Approachable", "Expert", "Playful"], category: "brand_personality", assetSlug: null },
  { questionText: "Rate how consistently our brand personality comes through in communications", questionType: "RATING_SCALE", options: [], category: "brand_personality", assetSlug: null },

  // General Interview Templates
  { questionText: "What is the single biggest strength of our brand today?", questionType: "OPEN", options: [], category: "general", assetSlug: null },
  { questionText: "What is the biggest risk to our brand in the next 12 months?", questionType: "OPEN", options: [], category: "general", assetSlug: null },
  { questionText: "How aligned is the external brand perception with our internal brand identity?", questionType: "RATING_SCALE", options: [], category: "general", assetSlug: null },
  { questionText: "Which areas of the brand need the most improvement?", questionType: "MULTI_SELECT", options: ["Visual identity", "Messaging consistency", "Customer experience", "Internal culture", "Digital presence", "Market positioning"], category: "general", assetSlug: null },
  { questionText: "Rank these brand priorities for the next quarter", questionType: "RANKING", options: ["Brand awareness", "Customer retention", "Market expansion", "Brand consistency", "Innovation perception"], category: "general", assetSlug: null },
  { questionText: "What one thing would you change about how we present our brand?", questionType: "OPEN", options: [], category: "general", assetSlug: null },
];

for (const qt of questionTemplates) {
  await prisma.interviewQuestionTemplate.create({
    data: { ...qt, workspaceId: null }, // global templates
  });
}

// 2. Completed Interview (#1 — Vision Statement)
const visionForInterview = await prisma.brandAsset.findFirst({
  where: { slug: "vision-statement", workspaceId: workspace.id },
});

if (visionForInterview) {
  const interview1 = await prisma.interview.create({
    data: {
      brandAssetId: visionForInterview.id,
      status: "COMPLETED",
      title: "Leadership Interview #1",
      orderNumber: 1,
      intervieweeName: "John Smith",
      intervieweePosition: "CEO",
      intervieweeEmail: "john.smith@company.com",
      intervieweePhone: "+1 (555) 123-4567",
      intervieweeCompany: "TechCorp Inc.",
      scheduledDate: new Date("2025-01-19"),
      scheduledTime: "10:00",
      durationMinutes: 45,
      conductedAt: new Date("2025-01-19"),
      actualDuration: 42,
      generalNotes: "Very insightful conversation. John has a strong perspective on brand purpose and was particularly passionate about the AI + human creativity angle. Follow-up needed on competitive positioning insights.",
      isLocked: true,
      lockedAt: new Date("2025-01-20"),
      approvedAt: new Date("2025-01-20"),
      currentStep: 5,
      completedSteps: [1, 2, 3, 4, 5],
      workspaceId: workspace.id,
      createdById: user.id,
    },
  });

  // Link assets
  const coreValues = await prisma.brandAsset.findFirst({ where: { slug: "core-values", workspaceId: workspace.id } });
  await prisma.interviewAssetLink.create({
    data: { interviewId: interview1.id, brandAssetId: visionForInterview.id },
  });
  if (coreValues) {
    await prisma.interviewAssetLink.create({
      data: { interviewId: interview1.id, brandAssetId: coreValues.id },
    });
  }

  // Questions + Answers (6 vragen)
  const questions = [
    { questionType: "OPEN", questionText: "What do you believe is our core purpose?", options: [], linkedAssetId: visionForInterview.id, isFromTemplate: true, answerText: "Our core purpose is to democratize brand strategy. Too many companies struggle with translating their vision into daily execution. We exist to bridge that gap through intelligent tools that learn from each brand interaction.", isAnswered: true },
    { questionType: "RATING_SCALE", questionText: "Rate how clearly our WHY is communicated internally", options: [], linkedAssetId: visionForInterview.id, isFromTemplate: true, answerRating: 4, isAnswered: true },
    { questionType: "MULTIPLE_CHOICE", questionText: "Which best describes our unique approach?", options: ["Technology-driven innovation", "Human-centered design", "Data-informed creativity", "Collaborative co-creation"], linkedAssetId: null, isFromTemplate: true, answerOptions: ["Data-informed creativity"], isAnswered: true },
    { questionType: "MULTI_SELECT", questionText: "Which attributes best differentiate us?", options: ["AI-powered tools", "Ease of use", "Brand consistency", "All-in-one platform", "Customer support", "Price"], linkedAssetId: null, isFromTemplate: true, answerOptions: ["AI-powered tools", "Brand consistency", "All-in-one platform"], isAnswered: true },
    { questionType: "RANKING", questionText: "Rank these brand priorities for next quarter", options: ["Brand awareness", "Customer retention", "Market expansion", "Brand consistency", "Innovation perception"], linkedAssetId: null, isFromTemplate: true, answerRanking: ["Brand consistency", "Innovation perception", "Customer retention", "Brand awareness", "Market expansion"], isAnswered: true },
    { questionType: "OPEN", questionText: "What one thing would you change about our brand presentation?", options: [], linkedAssetId: null, isFromTemplate: false, answerText: "I would invest more in emotional storytelling. We're great at explaining what we do functionally, but we need to connect on a deeper level with why it matters to people's daily work lives.", isAnswered: true },
  ];

  for (let i = 0; i < questions.length; i++) {
    await prisma.interviewQuestion.create({
      data: { ...questions[i], interviewId: interview1.id, orderIndex: i + 1 },
    });
  }

  // 3. Scheduled Interview (#2)
  const interview2 = await prisma.interview.create({
    data: {
      brandAssetId: visionForInterview.id,
      status: "SCHEDULED",
      title: "Marketing Lead Interview #2",
      orderNumber: 2,
      intervieweeName: "Sarah Johnson",
      intervieweePosition: "CMO",
      intervieweeEmail: "sarah.johnson@company.com",
      intervieweeCompany: "TechCorp Inc.",
      scheduledDate: new Date("2025-02-10"),
      scheduledTime: "14:00",
      durationMinutes: 60,
      currentStep: 3,
      completedSteps: [1, 2],
      workspaceId: workspace.id,
      createdById: user.id,
    },
  });

  await prisma.interviewAssetLink.create({
    data: { interviewId: interview2.id, brandAssetId: visionForInterview.id },
  });

  // 4. Draft Interview (#3 — minimal)
  await prisma.interview.create({
    data: {
      brandAssetId: visionForInterview.id,
      status: "TO_SCHEDULE",
      title: "Interview #3",
      orderNumber: 3,
      currentStep: 1,
      completedSteps: [],
      workspaceId: workspace.id,
      createdById: user.id,
    },
  });

  // 5. Update research method status
  await prisma.brandAssetResearchMethod.updateMany({
    where: { brandAssetId: visionForInterview.id, method: "INTERVIEWS" },
    data: { status: "IN_PROGRESS", progress: 33 }, // 1 of 3 completed
  });
}
```

```bash
npx prisma db seed
```

### ✅ Stap 1 Checklist
- [ ] `Interview` model met contact, schedule, conduct, review velden + wizard tracking
- [ ] `InterviewAssetLink` model (many-to-many: interview ↔ brand assets)
- [ ] `InterviewQuestion` model met 5 vraagtypes + antwoord velden per type
- [ ] `InterviewQuestionTemplate` model (global + workspace templates)
- [ ] Enums: `InterviewStatus`, `InterviewQuestionType`
- [ ] Relaties op BrandAsset, Workspace, User
- [ ] Migratie geslaagd
- [ ] Seed: 20 question templates, 1 completed interview (locked, 6 vragen), 1 scheduled, 1 draft
- [ ] Research method status update

---

## STAP 2: TYPES + API ENDPOINTS

### Stap 2A — Types

**Bestand:** `src/types/interview.ts`

```typescript
export type InterviewStatus = "TO_SCHEDULE" | "SCHEDULED" | "INTERVIEW_HELD" | "IN_REVIEW" | "COMPLETED";

export type InterviewQuestionType = "OPEN" | "MULTIPLE_CHOICE" | "MULTI_SELECT" | "RATING_SCALE" | "RANKING";

export interface Interview {
  id: string;
  brandAssetId: string;
  status: InterviewStatus;
  title: string | null;
  orderNumber: number;
  intervieweeName: string | null;
  intervieweePosition: string | null;
  intervieweeEmail: string | null;
  intervieweePhone: string | null;
  intervieweeCompany: string | null;
  scheduledDate: string | null;
  scheduledTime: string | null;
  durationMinutes: number;
  conductedAt: string | null;
  actualDuration: number | null;
  generalNotes: string | null;
  isLocked: boolean;
  lockedAt: string | null;
  approvedAt: string | null;
  currentStep: number;
  completedSteps: number[];
  questions: InterviewQuestion[];
  selectedAssets: InterviewAssetLink[];
  createdAt: string;
  updatedAt: string;
}

export interface InterviewAssetLink {
  id: string;
  brandAssetId: string;
  brandAsset: { id: string; name: string; slug: string; category: string };
}

export interface InterviewQuestion {
  id: string;
  linkedAssetId: string | null;
  linkedAsset: { id: string; name: string; slug: string } | null;
  questionType: InterviewQuestionType;
  questionText: string;
  options: string[];
  orderIndex: number;
  isFromTemplate: boolean;
  answerText: string | null;
  answerOptions: string[];
  answerRating: number | null;
  answerRanking: string[];
  isAnswered: boolean;
}

export interface InterviewQuestionTemplate {
  id: string;
  questionText: string;
  questionType: InterviewQuestionType;
  options: string[];
  category: string;
  assetSlug: string | null;
}

// === API Bodies ===
export interface SaveContactBody {
  intervieweeName: string;
  intervieweePosition: string;
  intervieweeEmail: string;
  intervieweePhone?: string;
  intervieweeCompany: string;
}

export interface SaveScheduleBody {
  scheduledDate: string;
  scheduledTime: string;
  durationMinutes: number;
}

export interface AddQuestionBody {
  linkedAssetId?: string;
  questionType: InterviewQuestionType;
  questionText: string;
  options?: string[];
  templateId?: string;
}

export interface AnswerQuestionBody {
  answerText?: string;
  answerOptions?: string[];
  answerRating?: number;
  answerRanking?: string[];
}

export interface InterviewOverviewStats {
  total: number;
  toSchedule: number;
  scheduled: number;
  completed: number;
  inReview: number;
}

// Question type config for UI
export const QUESTION_TYPE_CONFIG: Record<InterviewQuestionType, { label: string; icon: string; description: string }> = {
  OPEN: { label: "Open", icon: "MessageSquare", description: "Free text response" },
  MULTIPLE_CHOICE: { label: "Multiple Choice", icon: "CircleDot", description: "Select one option" },
  MULTI_SELECT: { label: "Multi-Select", icon: "CheckSquare", description: "Select multiple options" },
  RATING_SCALE: { label: "Rating Scale", icon: "Star", description: "Rate from 1 to 5" },
  RANKING: { label: "Ranking", icon: "ArrowUpDown", description: "Drag to rank options" },
};
```

### Stap 2B — API Endpoints

**Route structuur:**
```
src/app/api/
  brand-assets/[id]/interviews/
    route.ts                          → GET (list + stats), POST (create)
  interviews/[interviewId]/
    route.ts                          → GET detail, DELETE
    contact/route.ts                  → PATCH step 1
    schedule/route.ts                 → PATCH step 2
    assets/route.ts                   → PUT selected assets
    questions/route.ts                → GET + POST questions
    questions/[questionId]/route.ts   → PATCH (update) + DELETE
    questions/[questionId]/answer/route.ts → PATCH answer
    conduct/route.ts                  → PATCH general notes + complete conduct
    approve/route.ts                  → POST approve & lock
    unlock/route.ts                   → POST unlock
    duplicate/route.ts                → POST duplicate
    export/route.ts                   → GET export (JSON/PDF)
  interviews/templates/route.ts       → GET templates (filter by category)
```

**Key endpoint logica:**

**GET /api/brand-assets/[id]/interviews:**
```
1. Query interviews where brandAssetId, include questions + selectedAssets
2. Bereken stats: total, toSchedule, scheduled, completed, inReview
3. Return: { interviews, stats }
```

**POST /api/brand-assets/[id]/interviews (create):**
```
1. Bepaal orderNumber: max(existing) + 1
2. Genereer title: "Interview #{orderNumber}"
3. Maak Interview aan (status: TO_SCHEDULE, currentStep: 1)
4. Return: { interview }
```

**PATCH /interviews/[id]/contact (step 1):**
```
1. Update contact velden
2. Voeg 1 toe aan completedSteps (als nog niet)
3. Set currentStep = max(currentStep, 2)
4. Return: { interview }
```

**PATCH /interviews/[id]/schedule (step 2):**
```
1. Update schedule velden
2. Set status → SCHEDULED (als was TO_SCHEDULE)
3. Voeg 2 toe aan completedSteps
4. Set currentStep = max(currentStep, 3)
5. Return: { interview }
```

**PUT /interviews/[id]/assets (step 3 — asset selectie):**
```
1. Delete bestaande InterviewAssetLinks
2. Maak nieuwe links aan
3. Return: { selectedAssets }
```

**POST /interviews/[id]/questions (add question):**
```
1. Bepaal orderIndex: max(existing) + 1
2. Maak InterviewQuestion aan
3. Voeg 3 toe aan completedSteps (als er >= 1 vraag is)
4. Return: { question }
```

**PATCH /interviews/[id]/questions/[qId]/answer:**
```
1. Update antwoord velden op basis van questionType
2. Set isAnswered = true
3. Return: { question }
```

**PATCH /interviews/[id]/conduct:**
```
1. Update generalNotes
2. Als complete: set status → INTERVIEW_HELD, conductedAt, actualDuration
3. Voeg 4 toe aan completedSteps
4. Set currentStep = max(currentStep, 5)
5. Return: { interview }
```

**POST /interviews/[id]/approve:**
```
1. Set isLocked = true, lockedAt, approvedAt
2. Set status → COMPLETED
3. Voeg 5 toe aan completedSteps
4. Update BrandAssetResearchMethod (INTERVIEWS) progress
5. Herbereken validation %
6. Return: { interview }
```

**Zod Validatie:**
```typescript
const contactSchema = z.object({
  intervieweeName: z.string().min(1).max(200),
  intervieweePosition: z.string().min(1).max(200),
  intervieweeEmail: z.string().email(),
  intervieweePhone: z.string().max(50).optional(),
  intervieweeCompany: z.string().min(1).max(200),
});

const scheduleSchema = z.object({
  scheduledDate: z.string().datetime(),
  scheduledTime: z.string().regex(/^\d{2}:\d{2}$/),
  durationMinutes: z.number().int().min(15).max(240),
});

const addQuestionSchema = z.object({
  linkedAssetId: z.string().cuid().optional(),
  questionType: z.enum(["OPEN", "MULTIPLE_CHOICE", "MULTI_SELECT", "RATING_SCALE", "RANKING"]),
  questionText: z.string().min(1).max(2000),
  options: z.array(z.string().max(500)).max(20).optional(),
  templateId: z.string().cuid().optional(),
});

const answerSchema = z.object({
  answerText: z.string().max(10000).optional(),
  answerOptions: z.array(z.string()).optional(),
  answerRating: z.number().int().min(1).max(5).optional(),
  answerRanking: z.array(z.string()).optional(),
});
```

### Stap 2C — API Client

**Bestand:** `src/lib/api/interview.ts`

Functies:
- `getInterviews(assetId)` — GET lijst + stats
- `createInterview(assetId)` — POST create
- `getInterview(interviewId)` — GET detail
- `deleteInterview(interviewId)` — DELETE
- `saveContact(interviewId, body)` — PATCH step 1
- `saveSchedule(interviewId, body)` — PATCH step 2
- `updateSelectedAssets(interviewId, assetIds)` — PUT assets
- `getQuestions(interviewId)` — GET questions
- `addQuestion(interviewId, body)` — POST question
- `updateQuestion(interviewId, questionId, body)` — PATCH question
- `deleteQuestion(interviewId, questionId)` — DELETE question
- `answerQuestion(interviewId, questionId, body)` — PATCH answer
- `completeConductStep(interviewId, notes)` — PATCH conduct
- `approveInterview(interviewId)` — POST approve & lock
- `unlockInterview(interviewId)` — POST unlock
- `duplicateInterview(interviewId)` — POST duplicate
- `exportInterview(interviewId, format)` — GET export
- `getQuestionTemplates(category?)` — GET templates

### ✅ Stap 2 Checklist
- [ ] Types voor Interview, Question, Template, alle bodies
- [ ] QUESTION_TYPE_CONFIG met labels + iconen
- [ ] 17 API routes
- [ ] Wizard step tracking: completedSteps array, currentStep auto-advance
- [ ] Status transitions: TO_SCHEDULE → SCHEDULED → INTERVIEW_HELD → COMPLETED
- [ ] Approve & Lock: updates research method + validation %
- [ ] Zod validatie op alle mutatie endpoints
- [ ] API client met alle functies

---

## STAP 3: STORE + HOOKS

### Stap 3A — Zustand Store

**Bestand:** `src/stores/useInterviewStore.ts`

```typescript
interface InterviewStore {
  // Overview
  interviews: Interview[];
  stats: InterviewOverviewStats | null;

  // Wizard
  activeInterview: Interview | null;
  currentWizardStep: number;             // 1-5
  completedWizardSteps: number[];

  // Step 3: Questions
  selectedAssetIds: string[];
  showTemplatePanel: boolean;
  templateFilter: string | null;         // category filter

  // Step 4: Conduct
  currentQuestionIndex: number;
  conductAnswers: Record<string, AnswerQuestionBody>; // questionId → answer

  // Actions
  setInterviews, setStats,
  setActiveInterview, setCurrentWizardStep, markStepCompleted,
  toggleAssetSelection, setShowTemplatePanel, setTemplateFilter,
  setCurrentQuestionIndex, updateConductAnswer,
  reset
}
```

### Stap 3B — TanStack Query Hooks

**Bestand:** `src/lib/api/interview-hooks.ts`

```typescript
const interviewKeys = {
  all:        ["interviews"],
  byAsset:    (assetId: string) => ["interviews", "asset", assetId],
  detail:     (id: string) => ["interviews", id],
  questions:  (id: string) => ["interviews", id, "questions"],
  templates:  (category?: string) => ["interviews", "templates", category ?? "all"],
};

// Hooks
useInterviews(assetId)                     // staleTime: 30s
useCreateInterview(assetId)                // invalidate byAsset
useInterviewDetail(interviewId)            // staleTime: 10s
useDeleteInterview(interviewId, assetId)   // invalidate byAsset
useSaveContact(interviewId)                // invalidate detail
useSaveSchedule(interviewId)               // invalidate detail + byAsset
useUpdateSelectedAssets(interviewId)       // invalidate detail
useAddQuestion(interviewId)                // invalidate detail
useDeleteQuestion(interviewId)             // invalidate detail
useAnswerQuestion(interviewId)             // invalidate detail
useCompleteConductStep(interviewId)        // invalidate detail + byAsset
useApproveInterview(interviewId, assetId)  // invalidate detail + byAsset + brand-assets
useUnlockInterview(interviewId)            // invalidate detail
useDuplicateInterview(interviewId, assetId) // invalidate byAsset
useQuestionTemplates(category?)            // staleTime: 5min (semi-static)
```

### ✅ Stap 3 Checklist
- [ ] Zustand store: overview, wizard, questions, conduct state
- [ ] TanStack hooks: 16 hooks met correcte invalidatie
- [ ] Template panel state management
- [ ] Conduct mode: vraag-voor-vraag navigatie state

---

## STAP 4: UI — OVERVIEW + INTERVIEW CARDS

### Stap 4A — Componenten

```
src/components/interviews/
  InterviewsPage.tsx              ← Main page (overview + wizard routing)
  InterviewsOverview.tsx          ← Stats + cards
  InterviewStatsHeader.tsx        ← Count + status counters + Add CTA
  InterviewCard.tsx               ← Enkele interview card
  InterviewOverflowMenu.tsx       ← 5 acties
  InterviewStatusBadge.tsx        ← Status badge per status
```

### Design Tokens

#### InterviewsPage Header
```
Breadcrumb:     text-sm text-gray-500 hover:text-gray-700 → "← Back to {assetName}"
Icon:           👥 of MessageCircle in bg-amber-50 circle
Title:          text-2xl font-bold text-gray-900 → "Interviews"
Subtitle:       text-sm text-gray-500 → "Conduct structured interviews with stakeholders"
Status:         dropdown → "📝 Draft"
```

#### InterviewStatsHeader
```
Container:      flex items-center justify-between mb-6
Count:          text-lg font-semibold text-gray-900 → "X Interviews"
Add CTA:        bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm → "+ Add Interview"
Status counters: flex gap-4 text-sm
  To Schedule:  text-gray-500 → "X To Schedule" (⚪)
  Scheduled:    text-blue-600 → "X Scheduled" (🔵)
  Completed:    text-emerald-600 → "X Completed" (🟢)
  In Review:    text-purple-600 → "X In Review" (🟣)
```

#### InterviewCard
```
Container:      bg-white border border-gray-200 rounded-lg p-4 hover:shadow-sm cursor-pointer
Title row:      flex items-center justify-between
  Title:        text-sm font-semibold text-gray-900
  Lock icon:    Lock w-4 h-4 text-gray-400 (als locked)
  Status badge: rechtsboven
Interviewee:    text-sm text-gray-700 → "{name} - {position} at {company}"
Details row:    flex items-center gap-4 text-xs text-gray-500 mt-2
  Date:         📅 "Jan 19, 2026 • 10:00 • 45 min"
  Assets:       📋 "2 assets"
  Email:        📧 "email@..."
  Phone:        📞 "+1..."
Action row:     flex items-center gap-2 mt-3
  View btn:     text-sm text-teal-600 hover:text-teal-700 → "👁️ View"
  Overflow:     ⋮ menu
```

#### InterviewStatusBadge
```
TO_SCHEDULE:    bg-gray-100 text-gray-600 text-xs px-2 py-0.5 rounded-full
SCHEDULED:      bg-blue-50 text-blue-700 text-xs px-2 py-0.5 rounded-full
INTERVIEW_HELD: bg-amber-50 text-amber-700 text-xs px-2 py-0.5 rounded-full
IN_REVIEW:      bg-purple-50 text-purple-700 text-xs px-2 py-0.5 rounded-full
COMPLETED:      bg-emerald-50 text-emerald-700 text-xs px-2 py-0.5 rounded-full
```

#### InterviewOverflowMenu
```
5 items:
  🔓 Unlock Interview    (alleen als locked)
  ✏️ Edit Details
  📋 Duplicate Interview
  📊 Export Notes
  🗑️ Delete              (rood, separator erboven)
```

### ✅ Stap 4 Checklist
- [ ] Overview: stats header + interview cards
- [ ] Stats: totaal + 4 status counters met kleuren
- [ ] "+ Add Interview" CTA → maakt interview + opent wizard
- [ ] Interview cards: titel, lock icon, status badge, interviewee details
- [ ] View knop + overflow menu met 5 acties
- [ ] Delete = destructive (rood)

---

## STAP 5: UI — WIZARD STAPPEN 1-3

### Stap 5A — Wizard Container + Stepper

```
src/components/interviews/wizard/
  InterviewWizard.tsx             ← Container met stepper + step content
  WizardStepper.tsx               ← 5-stap stepper (horizontaal)
  ContactStep.tsx                 ← Step 1: Contact form
  ScheduleStep.tsx                ← Step 2: Schedule form
  QuestionsStep.tsx               ← Step 3: Asset selectie + vragen
  AssetSelectionList.tsx          ← Asset checkbox lijst
  QuestionsList.tsx               ← Vragen per asset
  AddQuestionModal.tsx            ← Modal: vraag toevoegen
  QuestionTypeSelector.tsx        ← Card select voor vraagtype
  OptionsEditor.tsx               ← Opties editor voor MC/MS/Ranking
  QuestionTemplatePanel.tsx       ← Slide-out panel met templates
  TemplateSearch.tsx              ← Zoekbalk
  TemplateCategoryAccordion.tsx   ← Accordion per categorie
  TemplateItem.tsx                ← Enkele template met type + asset badges
```

### Design Tokens

#### WizardStepper
```
Container:      flex items-center gap-0 mb-8
Step item:      flex items-center
  Number:       w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold
    Completed:  bg-emerald-500 text-white → CheckCircle icon
    Active:     bg-emerald-500 text-white → nummer
    Todo:       bg-gray-200 text-gray-500 → nummer
  Label:        text-xs text-gray-500 mt-1 (onder nummer)
    Completed:  text-emerald-600
    Active:     text-gray-900 font-medium
    Todo:       text-gray-400
  Connector:    h-0.5 w-12 mx-2
    Completed:  bg-emerald-500
    Todo:       bg-gray-200
5 labels:       Contact | Schedule | Questions | Conduct | Review
```

#### ContactStep (Step 1)
```
Title:          text-lg font-semibold text-gray-900 → "Contact Information"
Subtitle:       text-sm text-gray-500 → "Enter interviewee details"
Form:           space-y-4
  Label:        text-sm font-medium text-gray-700
  Input:        w-full border border-gray-200 rounded-lg px-3 py-2 text-sm
                focus:ring-2 focus:ring-teal-500 focus:border-teal-500
  Placeholder:  text-gray-400
  Phone label:  + "(optional)" text-gray-400
Save btn:       bg-emerald-600 text-white px-6 py-2 rounded-lg text-sm → "Save Contact"
```

#### ScheduleStep (Step 2)
```
Title:          "Interview Schedule"
Subtitle:       "Set date, time, and duration"
Date picker:    border border-gray-200 rounded-lg px-3 py-2
Time picker:    border border-gray-200 rounded-lg px-3 py-2
Duration:       select dropdown → 15, 30, 45, 60, 90, 120 min (default 60)
Save btn:       bg-emerald-600 → "Save Schedule"
```

#### QuestionsStep (Step 3)
```
Section 1: "Brand Assets to Discuss"
  Asset list:   space-y-2
  Asset row:    flex items-center justify-between p-3 border border-gray-200 rounded-lg
                hover:bg-gray-50 cursor-pointer
    Checkbox:   w-4 h-4 text-emerald-600 rounded
    Name:       text-sm font-medium text-gray-900
    Category:   text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded
    Questions:  text-xs text-gray-400 → "X questions"
    Actions:    "View" + "+" links text-teal-600

Section 2: "Interview Questions"
  Subtitle:     "Configure questions for each selected asset"
  Add btn:      border border-gray-200 rounded-lg px-3 py-1.5 text-sm → "+ Add Question"
  Template btn: border border-gray-200 rounded-lg px-3 py-1.5 text-sm → "📚 Import from Templates"
  Empty state:  text-sm text-gray-400 italic → "No questions added for this asset yet"
  Question item: flex items-center gap-3 p-3 border-b border-gray-100
    Number:     text-xs font-mono text-gray-400 → "Q1."
    Type badge: text-xs px-2 py-0.5 rounded
      OPEN:             bg-blue-50 text-blue-700 → "open"
      MULTIPLE_CHOICE:  bg-purple-50 text-purple-700 → "multiple choice"
      MULTI_SELECT:     bg-amber-50 text-amber-700 → "multi-select"
      RATING_SCALE:     bg-emerald-50 text-emerald-700 → "rating"
      RANKING:          bg-pink-50 text-pink-700 → "ranking"
    Text:       text-sm text-gray-700 flex-1
    Delete:     Trash2 w-4 h-4 text-gray-400 hover:text-red-500
```

#### AddQuestionModal
```
Overlay:        fixed inset-0 bg-black/50 z-50
Container:      bg-white rounded-xl max-w-lg mx-auto mt-20 p-6
Title:          text-lg font-semibold → "Add Interview Question"
Subtitle:       text-sm text-gray-500
Asset dropdown: select → None, Golden Circle, Brand Positioning, etc.
Type cards:     grid grid-cols-2 gap-3
  Card:         border border-gray-200 rounded-lg p-3 cursor-pointer hover:border-gray-300
  Selected:     border-emerald-500 ring-1 ring-emerald-500
  Icon:         w-5 h-5 text-gray-400 (selected: text-emerald-600)
  Label:        text-sm font-medium text-gray-900
  Description:  text-xs text-gray-500
Textarea:       min-h-[80px] border border-gray-200 rounded-lg p-3 text-sm
Options editor: (voor MC/MS/Ranking)
  Option input: flex items-center gap-2
    Input:      border border-gray-200 rounded px-2 py-1 text-sm flex-1
    Delete:     X w-4 h-4 text-gray-400
  Add option:   text-sm text-teal-600 → "+ Add Option"
Note:           text-xs text-gray-500 italic → "Questions linked to assets help validate specific brand elements"
Inspiration:    💡 text-sm → "Looking for inspiration? Browse question templates"
Save checkbox:  ✅ "Save to my Question Library for reuse"
Cancel btn:     border border-gray-300 px-4 py-2 rounded-lg
Add btn:        bg-emerald-600 text-white px-4 py-2 rounded-lg → "Add Question"
```

#### QuestionTemplatePanel (slide-out)
```
Container:      fixed right-0 top-0 bottom-0 w-[400px] bg-white shadow-xl z-50
                border-l border-gray-200
Header:         px-6 py-4 border-b border-gray-200
  Title:        text-lg font-semibold → "Question Templates"
  Subtitle:     text-sm text-gray-500
  Close btn:    X w-5 h-5 text-gray-400
Search:         mx-6 mt-4 border border-gray-200 rounded-lg px-3 py-2 text-sm
                placeholder="Search templates..."
Filter:         mx-6 mt-2 bg-emerald-50 text-emerald-700 text-xs px-3 py-1.5 rounded-lg
                → "✨ Showing templates for: {assetName}" + dismiss X
                + "Show all templates" link
Body:           px-6 py-4 overflow-y-auto
  Accordion:    border-b border-gray-100 py-3
    Header:     text-sm font-medium text-gray-900 cursor-pointer flex justify-between
    Chevron:    w-4 h-4 text-gray-400
  Template item: py-2
    Question:   text-sm text-gray-700
    Badges:     flex gap-2 mt-1
      Type:     text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded
      Asset:    text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded
    Add btn:    text-xs text-teal-600 hover:text-teal-700 → "+ Add"
```

### ✅ Stap 5 Checklist
- [ ] Wizard container met 5-stap stepper
- [ ] Stepper: completed (groen vinkje), active (groen nummer), todo (grijs)
- [ ] Step 1 Contact: 5 velden, Save Contact knop
- [ ] Step 2 Schedule: date, time, duration picker, Save Schedule knop
- [ ] Step 3 Questions: asset checkbox lijst + vragen per asset
- [ ] Add Question modal: asset dropdown, 5 type cards, textarea, opties editor
- [ ] Question type badges met unieke kleuren
- [ ] Template panel: slide-out, zoek, filter per asset, accordion per categorie
- [ ] Template items met type + asset badges + Add knop

---

## STAP 6: UI — WIZARD STAPPEN 4-5

### Stap 6A — Componenten

```
src/components/interviews/wizard/
  ConductStep.tsx                 ← Step 4: Interview voeren
  QuestionNavigator.tsx           ← Previous/Next + counter
  QuestionRenderer.tsx            ← Render vraag + antwoord input per type
  OpenAnswer.tsx                  ← Textarea voor open vragen
  MultipleChoiceAnswer.tsx        ← Radio buttons
  MultiSelectAnswer.tsx           ← Checkboxes
  RatingScaleAnswer.tsx           ← 5 sterren/nummers
  RankingAnswer.tsx               ← Drag-and-drop ranking (of simplified up/down)
  ConductProgress.tsx             ← "X of Y answered" + progress bar
  GeneralNotesSection.tsx         ← Textarea voor algemene notities
  ReviewStep.tsx                  ← Step 5: Review + approve
  ReviewStats.tsx                 ← 4 stat kolommen
  ReviewQuestionsList.tsx         ← Alle vragen + antwoorden preview
  ReviewActions.tsx               ← Edit / Export / Approve buttons
```

### Design Tokens

#### ConductStep (Step 4)
```
Title:          "Conduct Interview"
Subtitle:       "Document answers during or after the interview"
Progress:       text-sm text-gray-500 → "X of Y questions answered" + "X% complete"
Progress bar:   h-2 bg-gray-200 rounded-full → fill: bg-emerald-600

Question card:
  Container:    bg-white border border-gray-200 rounded-lg p-6
  Type badge:   (zelfde kleuren als Step 3)
  Question:     text-base font-medium text-gray-900 → "Q1. {text}"
  Answer area:  mt-4 (varieert per type)

Navigation:     flex items-center justify-between mt-4
  Previous:     text-sm text-gray-500 hover:text-gray-700 → "← Previous Question"
  Counter:      text-sm text-gray-500 → "Question X / Y"
  Next:         text-sm text-gray-500 hover:text-gray-700 → "Next Question →"
```

#### Answer Types
```
OPEN:
  Textarea:     w-full border border-gray-200 rounded-lg p-3 text-sm min-h-[100px]
                focus:ring-teal-500

MULTIPLE_CHOICE:
  Radio group:  space-y-2
  Radio item:   flex items-center gap-3 p-3 border border-gray-200 rounded-lg
                hover:bg-gray-50 cursor-pointer
  Selected:     border-emerald-500 bg-emerald-50
  Radio dot:    w-4 h-4 rounded-full border-2 border-gray-300
                Selected: border-emerald-500, inner dot bg-emerald-500

MULTI_SELECT:
  Checkbox group: space-y-2
  Checkbox item:  flex items-center gap-3 p-3 border border-gray-200 rounded-lg
  Selected:       border-emerald-500 bg-emerald-50
  Checkbox:       w-4 h-4 rounded text-emerald-600

RATING_SCALE:
  Container:    flex items-center gap-2
  Number:       w-10 h-10 rounded-lg border border-gray-200 flex items-center justify-center
                text-sm font-medium cursor-pointer hover:bg-gray-50
  Selected:     bg-emerald-500 text-white border-emerald-500
  Labels:       text-xs text-gray-400 → "1 = Strongly disagree" ... "5 = Strongly agree"

RANKING:
  Container:    space-y-2
  Item:         flex items-center gap-3 p-3 border border-gray-200 rounded-lg
                cursor-grab
  Rank number:  w-6 h-6 rounded-full bg-gray-100 text-gray-600 text-xs font-bold
  Up/Down btns: w-6 h-6 text-gray-400 hover:text-gray-700 (ChevronUp/ChevronDown)
  Text:         text-sm text-gray-700 flex-1
```

#### GeneralNotesSection
```
Container:      mt-6 border-t border-gray-200 pt-4
Title:          text-sm font-medium text-gray-900 → "General Notes"
Textarea:       w-full border border-gray-200 rounded-lg p-3 text-sm min-h-[80px]
Actions:        flex gap-2 mt-4
  Save:         border border-gray-300 px-4 py-2 rounded-lg text-sm → "Save Progress"
  Complete:     bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm → "Complete Interview"
```

#### ReviewStep (Step 5)
```
Title:          "Review Results"
Subtitle:       "Review and finalize interview outcomes"
Status badge:   bg-amber-50 text-amber-700 text-xs px-2 py-0.5 rounded-full → "Ready for approval"

Stats grid:     grid grid-cols-4 gap-4 bg-gray-50 rounded-lg p-4 mt-4
  Stat value:   text-xl font-bold text-gray-900
  Stat label:   text-xs text-gray-500
  Items:        X/Y Questions Answered | X min Duration | X Assets Covered | X% Completion

Questions review: mt-6
  Per asset group:
    Header:     text-sm font-semibold text-gray-900 → "{assetName}" + "X/Y answered"
    Question:   border-b border-gray-100 py-3
      Type badge + Custom badge (als !isFromTemplate)
      Question text
      Answer preview (truncated)

Notes section:  mt-4
  Title:        "Interview Notes"
  Content:      text-sm text-gray-700 bg-gray-50 rounded-lg p-4

Actions:        flex items-center gap-3 mt-6
  Edit:         border border-gray-300 px-4 py-2 rounded-lg → "✏️ Edit Responses"
  Export:       border border-gray-300 px-4 py-2 rounded-lg → "⬇️ Export PDF"
  Approve:      bg-emerald-600 text-white px-6 py-2 rounded-lg → "✅ Approve & Lock"
```

### ✅ Stap 6 Checklist
- [ ] Conduct step: vraag-voor-vraag interface
- [ ] 5 antwoord renderers: Open, MC (radio), MS (checkbox), Rating (1-5), Ranking (up/down)
- [ ] Previous/Next navigatie + counter
- [ ] Progress bar: answered / total
- [ ] General notes textarea
- [ ] Save Progress + Complete Interview buttons
- [ ] Review step: 4 stats, alle Q&A per asset groep, notes
- [ ] Edit Responses → terug naar Conduct
- [ ] Export PDF → download
- [ ] Approve & Lock → completes interview, updates research method

---

## STAP 7: ROUTES + INTEGRATIE

### Stap 7A — Routes

```bash
# Vervangt placeholder uit Fase 1C
src/app/knowledge/brand-foundation/[slug]/interviews/page.tsx
src/app/knowledge/brand-foundation/[slug]/interviews/[interviewId]/page.tsx
```

### Stap 7B — View Switching

```typescript
// InterviewsPage:
// - Default → Overview (cards + stats)
// - Klik "+ Add Interview" → create + navigate naar wizard
// - Klik interview card → navigate naar /interviews/[interviewId]

// InterviewDetailPage:
// - Niet locked → Wizard op currentStep
// - Locked/Completed → Review step (read-only)
```

### Stap 7C — Integratie met Fase 1C

1. Verwijder placeholder "Coming Soon" voor interviews route
2. Research method card navigeert naar `/interviews`
3. Na approve:
   - `BrandAssetResearchMethod` (INTERVIEWS) → recalculate progress
   - Progress = (approved interviews / total interviews) * 100
   - Als alle interviews approved → status COMPLETED
   - Validation % herberekend (interviews weight = 0.25)

### Stap 7D — Interview Nummering

```typescript
// Auto-nummering bij aanmaken:
// orderNumber = max(existing interviews for this asset) + 1
// Default title = "Interview #{orderNumber}"
// User kan custom title geven, bijv. "Leadership Interview #1"
```

### ✅ Stap 7 Checklist
- [ ] 2 routes (overview + detail)
- [ ] Placeholder uit Fase 1C vervangen
- [ ] View switching: overview ↔ wizard ↔ read-only review
- [ ] Research method progress recalculation
- [ ] Validation % cascade update
- [ ] Auto-nummering van interviews
- [ ] Navigatie terug naar asset detail

---

## VOLLEDIGE ACCEPTATIECRITERIA

### Overview
- [ ] Stats header: X Interviews + 4 status counters
- [ ] "+ Add Interview" → maakt interview + opent wizard
- [ ] Interview cards met titel, lock, status, interviewee details
- [ ] Overflow menu: Unlock, Edit, Duplicate, Export, Delete

### Wizard Stepper
- [ ] 5 stappen met groene vinkjes (completed), groen nummer (active), grijs (todo)
- [ ] Connectors: groen (completed), grijs (todo)
- [ ] Klik op completed stap navigeert terug

### Step 1: Contact
- [ ] 5 form velden (name, position, email, phone optional, company)
- [ ] "Save Contact" → markeert step completed

### Step 2: Schedule
- [ ] Date picker, time picker, duration dropdown
- [ ] "Save Schedule" → status → SCHEDULED, step completed

### Step 3: Questions
- [ ] Asset checkbox lijst met category badge + question count
- [ ] Vragen per geselecteerd asset
- [ ] "+ Add Question" modal met 5 type cards
- [ ] Options editor voor MC/MS/Ranking
- [ ] "Import from Templates" → slide-out panel
- [ ] Template zoek + filter per asset
- [ ] Template categories accordion
- [ ] Template items met type + asset badges

### Step 4: Conduct
- [ ] Vraag-voor-vraag navigatie
- [ ] 5 antwoord types correct gerenderd
- [ ] Progress: "X of Y answered" + bar
- [ ] General notes textarea
- [ ] "Save Progress" + "Complete Interview"

### Step 5: Review
- [ ] 4 stats: Questions Answered, Duration, Assets Covered, Completion %
- [ ] Alle Q&A gegroepeerd per asset
- [ ] Interview notes
- [ ] "Edit Responses" → terug naar Step 4
- [ ] "Export PDF" → download
- [ ] "Approve & Lock" → locks + updates research method

### Technisch
- [ ] 0 TypeScript errors, 0 ESLint errors
- [ ] Wizard step tracking persistent (completedSteps array)
- [ ] Status cascade: approve → research method → validation %
- [ ] 20+ question templates seeded

---

## VOLGENDE STAPPEN NA FASE 1E

```
1. ✅ AppShell + Dashboard (Fase 11)
2. ✅ Brand Foundation Overview (Fase 1A)
3. ✅ AI Brand Analysis (Fase 1B)
4. ✅ Brand Asset Detail (Fase 1C)
5. ✅ Canvas Workshop (Fase 1D)
6. ✅ Interviews (Fase 1E)                   ← DIT PLAN
7.    Business Strategy (Fase 2)
8.    Brand Style (Fase 3)
```

---

*Einde implementatieplan — 13 februari 2026*
*~750 regels, 7 stappen, Interviews met 5-stap wizard, question templates, 5 vraagtypes*
