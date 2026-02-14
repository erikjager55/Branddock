# BRANDDOCK — Implementatieplan Fase 1D
## Canvas Workshop — Purchase Flow, Live Sessie, AI Rapport & Resultaten
**Datum:** 13 februari 2026
**Doel:** Complete workshop module: aankoop (3 bundles), 6-stap live sessie met timer, AI rapport + 5-tab resultaten
**Vereist:** Fase 11 ✅ + Fase 1A ✅ + Fase 1B ✅ + Fase 1C ✅
**Geschatte duur:** 3–4 sessies (grootste fase tot nu toe)

---

## HOE DIT PLAN TE GEBRUIKEN

```bash
# In Claude Code:
> Lees IMPLEMENTATIEPLAN-FASE-1D.md en voer Stap 1 uit.
```

---

## OVERZICHT

De Canvas Workshop is een **betaalde service** (€1200+) met 3 schermen en 3 fases:

```
Brand Asset Detail (Fase 1C) → klik "Workshop" research method card
  → SCR-04c: PURCHASE FLOW
  │   ├── Bundle/Individual toggle (3 bundles met kortingen)
  │   ├── Workshop options (stepper + facilitator add-on €350)
  │   ├── Purchase Summary sidebar (sticky)
  │   └── Dashboard Impact Preview modal (before/after)
  │
  → SCR-04d: LIVE SESSION
  │   ├── Workshop toolbar (timer telt OP, bookmark, complete)
  │   ├── 6 step pills (default/active/completed)
  │   ├── Step content (instructies + video placeholder)
  │   ├── Response capture panel (prompt + textarea per step)
  │   └── Facilitator tips (gele sectie, stap 6)
  │
  → SCR-04e: COMPLETE / RESULTS
      ├── Success banner + export buttons
      └── 5 tabs:
          ├── Overview: AI rapport (5 findings, 4 recommendations)
          ├── Canvas: Golden Circle WHY/HOW/WHAT (unlock-to-edit)
          ├── Workshop: objectives, 8 participants grid, agenda timeline
          ├── Notes: participant notes lijst
          └── Gallery: foto grid met captions
```

**Routes:**
- `/knowledge/brand-foundation/[slug]/workshop` → Purchase (TO_BUY) of redirect
- `/knowledge/brand-foundation/[slug]/workshop/[workshopId]` → Session (IN_PROGRESS)
- `/knowledge/brand-foundation/[slug]/workshop/[workshopId]/results` → Complete (COMPLETED)

---

## STAP 1: DATABASE — WORKSHOP MODELLEN

### Stap 1A — Prisma Schema

**9 nieuwe modellen** + 1 enum + relaties toevoegen aan Workspace en BrandAsset.

```prisma
// ============ NIEUW ============

model Workshop {
  id                String            @id @default(cuid())
  brandAssetId      String
  brandAsset        BrandAsset        @relation(fields: [brandAssetId], references: [id], onDelete: Cascade)
  status            WorkshopStatus    @default(TO_BUY)

  // Purchase Data
  bundleId          String?
  bundle            WorkshopBundle?   @relation(fields: [bundleId], references: [id])
  selectedAssetIds  String[]
  workshopCount     Int               @default(1)
  hasFacilitator    Boolean           @default(false)
  totalPrice        Float?
  purchasedAt       DateTime?

  // Session Data
  scheduledDate     DateTime?
  scheduledTime     String?
  title             String?
  currentStep       Int               @default(0)
  timerSeconds      Int               @default(0)
  bookmarkStep      Int?
  facilitatorName   String?
  presentationUrl   String?

  // Results Data
  completedAt       DateTime?
  participantCount  Int?
  durationMinutes   Float?

  // Canvas Data
  canvasData        Json?
  canvasLocked      Boolean           @default(false)

  // AI Report
  reportGenerated   Boolean           @default(false)
  executiveSummary  String?           @db.Text

  // Relations
  steps             WorkshopStep[]
  findings          WorkshopFinding[]
  recommendations   WorkshopRecommendation[]
  participants      WorkshopParticipant[]
  notes             WorkshopNote[]
  photos            WorkshopPhoto[]
  objectives        WorkshopObjective[]
  agendaItems       WorkshopAgendaItem[]

  workspaceId       String
  workspace         Workspace         @relation(fields: [workspaceId], references: [id])
  createdAt         DateTime          @default(now())
  updatedAt         DateTime          @updatedAt

  @@index([brandAssetId])
  @@index([workspaceId])
}

model WorkshopBundle {
  id          String      @id @default(cuid())
  name        String
  badge       String?
  description String?
  assetNames  String[]
  basePrice   Float
  discount    Float
  finalPrice  Float
  workshops   Workshop[]
  workspaceId String
  workspace   Workspace   @relation(fields: [workspaceId], references: [id])
  createdAt   DateTime    @default(now())
  @@index([workspaceId])
}

model WorkshopStep {
  id          String    @id @default(cuid())
  workshopId  String
  workshop    Workshop  @relation(fields: [workshopId], references: [id], onDelete: Cascade)
  stepNumber  Int
  title       String
  duration    String
  instructions String?  @db.Text
  prompt      String?   @db.Text
  response    String?   @db.Text
  isCompleted Boolean   @default(false)
  completedAt DateTime?
  @@unique([workshopId, stepNumber])
  @@index([workshopId])
}

model WorkshopFinding {
  id          String    @id @default(cuid())
  workshopId  String
  workshop    Workshop  @relation(fields: [workshopId], references: [id], onDelete: Cascade)
  order       Int
  content     String    @db.Text
  @@index([workshopId])
}

model WorkshopRecommendation {
  id          String    @id @default(cuid())
  workshopId  String
  workshop    Workshop  @relation(fields: [workshopId], references: [id], onDelete: Cascade)
  order       Int
  content     String    @db.Text
  isCompleted Boolean   @default(false)
  @@index([workshopId])
}

model WorkshopParticipant {
  id          String    @id @default(cuid())
  workshopId  String
  workshop    Workshop  @relation(fields: [workshopId], references: [id], onDelete: Cascade)
  name        String
  role        String
  avatarUrl   String?
  @@index([workshopId])
}

model WorkshopNote {
  id          String    @id @default(cuid())
  workshopId  String
  workshop    Workshop  @relation(fields: [workshopId], references: [id], onDelete: Cascade)
  authorName  String
  authorRole  String?
  content     String    @db.Text
  createdAt   DateTime  @default(now())
  @@index([workshopId])
}

model WorkshopPhoto {
  id          String    @id @default(cuid())
  workshopId  String
  workshop    Workshop  @relation(fields: [workshopId], references: [id], onDelete: Cascade)
  url         String
  caption     String?
  order       Int
  @@index([workshopId])
}

model WorkshopObjective {
  id          String    @id @default(cuid())
  workshopId  String
  workshop    Workshop  @relation(fields: [workshopId], references: [id], onDelete: Cascade)
  content     String
  isCompleted Boolean   @default(true)
  order       Int
  @@index([workshopId])
}

model WorkshopAgendaItem {
  id          String    @id @default(cuid())
  workshopId  String
  workshop    Workshop  @relation(fields: [workshopId], references: [id], onDelete: Cascade)
  time        String
  activity    String
  duration    String
  details     String?   @db.Text
  order       Int
  @@index([workshopId])
}

enum WorkshopStatus {
  TO_BUY
  PURCHASED
  SCHEDULED
  IN_PROGRESS
  COMPLETED
  CANCELLED
}
```

**Relaties toevoegen:**
```prisma
// In model Workspace:
  workshops          Workshop[]
  workshopBundles    WorkshopBundle[]

// In model BrandAsset:
  workshops          Workshop[]
```

### Stap 1B — Migratie + Seed

```bash
npx prisma migrate dev --name add-workshop-models
```

**Seed data — uitgebreid:**

```typescript
// === 3 BUNDLES ===
const bundles = [
  {
    name: "Starter Bundle",
    badge: "Most Popular",
    description: "Essential brand foundation workshop covering your core identity.",
    assetNames: ["Vision Statement", "Mission Statement", "Core Values"],
    basePrice: 1350,
    discount: 100,
    finalPrice: 1250,
  },
  {
    name: "Professional Bundle",
    badge: "Best Value",
    description: "Extended workshop including positioning and archetype discovery.",
    assetNames: ["Vision Statement", "Mission Statement", "Core Values", "Brand Positioning", "Brand Archetype"],
    basePrice: 1450,
    discount: 100,
    finalPrice: 1350,
  },
  {
    name: "Complete Bundle",
    badge: "Comprehensive",
    description: "Full-spectrum brand strategy workshop covering all dimensions.",
    assetNames: ["Vision Statement", "Mission Statement", "Core Values", "Brand Positioning", "Brand Archetype", "Social Relevancy", "Competitive Landscape"],
    basePrice: 1550,
    discount: 150,
    finalPrice: 1400,
  },
];

// === 1 COMPLETED WORKSHOP (Vision Statement) ===
const completedWorkshop = {
  status: "COMPLETED",
  title: "Brand Strategy Workshop — Vision & Purpose",
  workshopCount: 1,
  hasFacilitator: true,
  facilitatorName: "Sarah Chen",
  totalPrice: 1600, // 1250 bundle + 350 facilitator
  purchasedAt: new Date("2025-01-10"),
  scheduledDate: new Date("2025-01-15"),
  scheduledTime: "10:00",
  completedAt: new Date("2025-01-15"),
  participantCount: 8,
  durationMinutes: 90,
  timerSeconds: 5400, // 90 min
  currentStep: 6,
  reportGenerated: true,
  canvasLocked: true,
  executiveSummary: "The workshop revealed strong alignment between the leadership team on brand purpose and vision. Key themes of innovation, authenticity, and customer empowerment emerged consistently across all exercises. The team identified a clear gap between current market positioning and aspirational brand identity, providing a roadmap for strategic refinement.",
  canvasData: {
    why: {
      statement: "To empower brands to communicate authentically and consistently",
      details: "We believe every brand has a unique story that deserves to be told with clarity and conviction across every touchpoint.",
    },
    how: {
      statement: "Through AI-powered brand strategy tools that bridge creativity and data",
      details: "By combining human creativity with artificial intelligence, we help teams make better brand decisions faster.",
    },
    what: {
      statement: "A platform for brand strategy definition, validation, and content generation",
      details: "Branddock helps marketing teams define their brand foundation, validate it through research, and generate consistent content at scale.",
    },
  },
};

// Steps (6) — all completed with responses
const workshopSteps = [
  { stepNumber: 1, title: "Introduction & Warm-up", duration: "15 min",
    instructions: "Welcome participants and set the stage. Review objectives and establish ground rules.",
    prompt: "What does our brand mean to you personally? Share one word or phrase.",
    response: "Participants shared diverse perspectives: 'Innovation', 'Trust', 'Empowerment', 'Clarity', 'Future-forward', 'Authentic', 'Partner', 'Catalyst'. Common themes emerged around trust and innovation.",
    isCompleted: true },
  { stepNumber: 2, title: "Define the Core Purpose", duration: "30 min",
    instructions: "Explore why your brand exists beyond profit. Use the Golden Circle framework.",
    prompt: "Why does our brand exist? What problem are we uniquely solving?",
    response: "The team identified that brands struggle to maintain consistency across growing channel complexity. Our core purpose is to bridge the gap between brand strategy and execution, making brand consistency achievable for teams of any size.",
    isCompleted: true },
  { stepNumber: 3, title: "Identify Your Unique Approach", duration: "30 min",
    instructions: "Define HOW you deliver on your purpose differently from competitors.",
    prompt: "How do we deliver differently? What is our unique methodology?",
    response: "Our unique approach combines AI analysis with human creativity. Unlike pure-play AI tools, we keep humans in the loop for strategic decisions. Unlike traditional agencies, we offer real-time, always-on brand guidance.",
    isCompleted: true },
  { stepNumber: 4, title: "Map Customer Connections", duration: "20 min",
    instructions: "Identify emotional and functional connections between brand and customers.",
    prompt: "What emotional and functional benefits does our brand deliver?",
    response: "Customers feel confident and empowered. Functional: saves time, reduces errors, improves consistency. Emotional: reduces anxiety about brand decisions, builds confidence in marketing teams, creates sense of professional growth.",
    isCompleted: true },
  { stepNumber: 5, title: "Canvas Review & Refinement", duration: "20 min",
    instructions: "Review the canvas output. Refine language and ensure alignment.",
    prompt: "What needs refinement? Any contradictions or gaps?",
    response: "The team noted that 'AI-powered' could sound cold — refined to emphasize 'AI-augmented human creativity'. Also strengthened the connection between WHY (empowerment) and HOW (keeping humans in the loop).",
    isCompleted: true },
  { stepNumber: 6, title: "Synthesis & Action Planning", duration: "15 min",
    instructions: "Synthesize into actionable next steps. Assign owners and timelines.",
    prompt: "What are the top 3 actions based on today's workshop?",
    response: "1. Update brand guidelines with new WHY statement (Marketing lead, 2 weeks). 2. Audit all customer touchpoints for consistency (UX team, 1 month). 3. Create internal brand training program (HR + Marketing, Q2).",
    isCompleted: true },
];

// Findings (5)
const workshopFindings = [
  { order: 1, content: "Strong internal alignment exists on brand purpose — all participants independently identified 'empowerment' and 'innovation' as core brand attributes." },
  { order: 2, content: "A significant gap exists between current market positioning (tool-focused) and aspirational brand identity (strategic partner)." },
  { order: 3, content: "The team's approach to AI is a key differentiator — 'AI-augmented human creativity' resonates more strongly than 'AI-powered automation'." },
  { order: 4, content: "Customer emotional benefits (confidence, reduced anxiety) are underrepresented in current marketing materials compared to functional benefits." },
  { order: 5, content: "Cross-functional alignment is strong in leadership but may not extend to all team members — internal brand training is needed." },
];

// Recommendations (4)
const workshopRecommendations = [
  { order: 1, content: "Reposition marketing messaging from 'AI tool' to 'AI-powered brand strategy partner' to reflect the aspirational brand identity.", isCompleted: false },
  { order: 2, content: "Develop emotional benefit messaging that highlights confidence-building and anxiety-reduction alongside functional capabilities.", isCompleted: false },
  { order: 3, content: "Launch an internal brand alignment program to ensure the vision discovered in this workshop permeates all levels of the organization.", isCompleted: false },
  { order: 4, content: "Conduct quarterly brand consistency audits across all customer touchpoints to maintain alignment with the refined brand strategy.", isCompleted: false },
];

// Participants (8)
const workshopParticipants = [
  { name: "David Chen", role: "CEO" },
  { name: "Maria Garcia", role: "CMO" },
  { name: "James Wilson", role: "Head of Product" },
  { name: "Sarah Johnson", role: "Brand Director" },
  { name: "Michael Brown", role: "UX Lead" },
  { name: "Emily Davis", role: "Content Strategist" },
  { name: "Robert Taylor", role: "Sales Director" },
  { name: "Lisa Anderson", role: "HR Manager" },
];

// Notes (3)
const workshopNotes = [
  { authorName: "David Chen", authorRole: "CEO", content: "Important insight about the gap between our tool positioning and partner aspiration. We need to reflect this in our next funding pitch as well." },
  { authorName: "Maria Garcia", authorRole: "CMO", content: "The 'AI-augmented human creativity' framing is powerful. I want to build our next campaign around this concept — it differentiates us from pure-play AI tools." },
  { authorName: "James Wilson", authorRole: "Head of Product", content: "Product roadmap should prioritize features that reinforce the 'strategic partner' positioning. The canvas workshop feature itself is a great example of this." },
];

// Photos (4)
const workshopPhotos = [
  { url: "/images/workshop/whiteboard-session.jpg", caption: "Team brainstorming session on brand purpose", order: 1 },
  { url: "/images/workshop/golden-circle-exercise.jpg", caption: "Golden Circle framework exercise in progress", order: 2 },
  { url: "/images/workshop/team-discussion.jpg", caption: "Cross-functional discussion on customer connections", order: 3 },
  { url: "/images/workshop/action-planning.jpg", caption: "Action planning and owner assignment", order: 4 },
];

// Objectives (4)
const workshopObjectives = [
  { content: "Define the core brand purpose (WHY) through collaborative exploration", isCompleted: true, order: 1 },
  { content: "Identify the unique approach (HOW) that differentiates us from competitors", isCompleted: true, order: 2 },
  { content: "Map emotional and functional customer connections", isCompleted: true, order: 3 },
  { content: "Create actionable next steps with owners and timelines", isCompleted: true, order: 4 },
];

// Agenda Items (10)
const workshopAgendaItems = [
  { time: "10:00 AM", activity: "Welcome & Introduction", duration: "10 min", details: "Facilitator welcome, participant introductions, workshop objectives review.", order: 1 },
  { time: "10:10 AM", activity: "Ice Breaker Exercise", duration: "5 min", details: "One-word brand association exercise to warm up creative thinking.", order: 2 },
  { time: "10:15 AM", activity: "Brand Purpose Deep Dive", duration: "25 min", details: "Guided exploration of WHY using Golden Circle framework. Individual reflection followed by group discussion.", order: 3 },
  { time: "10:40 AM", activity: "Group Discussion: Core Purpose", duration: "10 min", details: "Share and debate individual findings. Identify common themes.", order: 4 },
  { time: "10:50 AM", activity: "Unique Approach Workshop", duration: "25 min", details: "Competitive landscape mapping and differentiation exercise.", order: 5 },
  { time: "11:15 AM", activity: "Break", duration: "10 min", details: null, order: 6 },
  { time: "11:25 AM", activity: "Customer Connection Mapping", duration: "15 min", details: "Emotional and functional benefit identification using empathy mapping.", order: 7 },
  { time: "11:40 AM", activity: "Canvas Review", duration: "15 min", details: "Review emerging Golden Circle canvas. Identify contradictions and gaps.", order: 8 },
  { time: "11:55 AM", activity: "Refinement & Alignment", duration: "10 min", details: "Final language refinement. Team vote on key statements.", order: 9 },
  { time: "12:05 PM", activity: "Action Planning & Wrap-up", duration: "15 min", details: "Assign action items, set timelines, closing remarks from facilitator.", order: 10 },
];

// === 1 SCHEDULED WORKSHOP (Brand Positioning) ===
const scheduledWorkshop = {
  status: "SCHEDULED",
  title: "Brand Positioning Deep-Dive",
  workshopCount: 1,
  hasFacilitator: false,
  totalPrice: 1350,
  purchasedAt: new Date("2025-02-01"),
  scheduledDate: new Date("2025-02-28"),
  scheduledTime: "14:00",
};
```

### ✅ Stap 1 Checklist
- [ ] 9 modellen: Workshop, WorkshopBundle, WorkshopStep, WorkshopFinding, WorkshopRecommendation, WorkshopParticipant, WorkshopNote, WorkshopPhoto, WorkshopObjective, WorkshopAgendaItem
- [ ] WorkshopStatus enum: TO_BUY, PURCHASED, SCHEDULED, IN_PROGRESS, COMPLETED, CANCELLED
- [ ] Relaties: BrandAsset.workshops, Workspace.workshops + workshopBundles
- [ ] Migratie succesvol
- [ ] Seed: 3 bundles, 1 completed workshop (met alles), 1 scheduled workshop

---

## STAP 2: TYPES + CONSTANTEN

### Stap 2A — Types

**Bestand:** `src/types/workshop.ts`
```typescript
// === Enums ===
export type WorkshopStatus = "TO_BUY" | "PURCHASED" | "SCHEDULED" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED";

// === Workshop Bundle ===
export interface WorkshopBundle {
  id: string;
  name: string;
  badge: string | null;
  description: string | null;
  assetNames: string[];
  basePrice: number;
  discount: number;
  finalPrice: number;
}

// === Workshop (full) ===
export interface Workshop {
  id: string;
  brandAssetId: string;
  status: WorkshopStatus;
  bundleId: string | null;
  bundle: WorkshopBundle | null;
  selectedAssetIds: string[];
  workshopCount: number;
  hasFacilitator: boolean;
  totalPrice: number | null;
  purchasedAt: string | null;
  scheduledDate: string | null;
  scheduledTime: string | null;
  title: string | null;
  currentStep: number;
  timerSeconds: number;
  bookmarkStep: number | null;
  facilitatorName: string | null;
  completedAt: string | null;
  participantCount: number | null;
  durationMinutes: number | null;
  canvasData: Record<string, unknown> | null;
  canvasLocked: boolean;
  reportGenerated: boolean;
  executiveSummary: string | null;
  steps: WorkshopStep[];
  findings: WorkshopFinding[];
  recommendations: WorkshopRecommendation[];
  participants: WorkshopParticipant[];
  notes: WorkshopNote[];
  photos: WorkshopPhoto[];
  objectives: WorkshopObjective[];
  agendaItems: WorkshopAgendaItem[];
  createdAt: string;
  updatedAt: string;
}

// === Sub-models ===
export interface WorkshopStep {
  id: string;
  stepNumber: number;
  title: string;
  duration: string;
  instructions: string | null;
  prompt: string | null;
  response: string | null;
  isCompleted: boolean;
  completedAt: string | null;
}

export interface WorkshopFinding { id: string; order: number; content: string; }
export interface WorkshopRecommendation { id: string; order: number; content: string; isCompleted: boolean; }
export interface WorkshopParticipant { id: string; name: string; role: string; avatarUrl: string | null; }
export interface WorkshopNote { id: string; authorName: string; authorRole: string | null; content: string; createdAt: string; }
export interface WorkshopPhoto { id: string; url: string; caption: string | null; order: number; }
export interface WorkshopObjective { id: string; content: string; isCompleted: boolean; order: number; }
export interface WorkshopAgendaItem { id: string; time: string; activity: string; duration: string; details: string | null; order: number; }

// === API Bodies ===
export interface PurchaseWorkshopBody {
  bundleId?: string;
  selectedAssetIds?: string[];
  workshopCount: number;
  hasFacilitator: boolean;
}

export interface StepResponseBody { response: string; isCompleted?: boolean; }
export interface CanvasUpdateBody { canvasData: Record<string, unknown>; canvasLocked?: boolean; }
export interface AddNoteBody { authorName: string; authorRole?: string; content: string; }
export interface DashboardImpact { assetId: string; assetName: string; currentStatus: string; afterStatus: string; }
```

### Stap 2B — Constanten

**Bestand:** `src/lib/constants/workshop.ts`
```typescript
export const WORKSHOP_BASE_PRICE = 1200;
export const FACILITATOR_PRICE = 350;
export const ASSET_PRICE = 50;

export const WORKSHOP_SPECS = [
  { icon: "⏱️", label: "Duration", value: "2-3 hours" },
  { icon: "👥", label: "Participants", value: "5-10 people" },
  { icon: "💻", label: "Format", value: "In-person or virtual" },
];

export const WORKSHOP_WHATS_INCLUDED = [
  "Professional facilitation guide",
  "Interactive canvas exercises",
  "AI-powered analysis of responses",
  "Comprehensive findings report",
  "Actionable recommendations",
  "Exportable canvas output (PDF)",
];

export const WORKSHOP_STEPS_TEMPLATE = [
  { stepNumber: 1, title: "Introduction & Warm-up", duration: "15 min",
    instructions: "Welcome participants and set the stage. Review objectives and establish ground rules.",
    prompt: "What does our brand mean to you personally? Share one word or phrase." },
  { stepNumber: 2, title: "Define the Core Purpose", duration: "30 min",
    instructions: "Explore why your brand exists beyond profit. Use the Golden Circle framework.",
    prompt: "Why does our brand exist? What problem are we uniquely solving?" },
  { stepNumber: 3, title: "Identify Your Unique Approach", duration: "30 min",
    instructions: "Define HOW you deliver on your purpose differently from competitors.",
    prompt: "How do we deliver differently? What is our unique methodology?" },
  { stepNumber: 4, title: "Map Customer Connections", duration: "20 min",
    instructions: "Identify emotional and functional connections between brand and customers.",
    prompt: "What emotional and functional benefits does our brand deliver?" },
  { stepNumber: 5, title: "Canvas Review & Refinement", duration: "20 min",
    instructions: "Review the canvas output. Refine language and ensure alignment.",
    prompt: "What needs refinement? Any contradictions or gaps?" },
  { stepNumber: 6, title: "Synthesis & Action Planning", duration: "15 min",
    instructions: "Synthesize into actionable next steps. Assign owners and timelines.",
    prompt: "What are the top 3 actions based on today's workshop?" },
];

export const FACILITATOR_TIPS = [
  "Ensure all participants have had a chance to contribute their perspective.",
  "Summarize the key themes before moving to action planning.",
  "Assign clear owners and realistic timelines for each action item.",
  "Close with appreciation for participation and preview of next steps.",
];
```

### ✅ Stap 2 Checklist
- [ ] Types: Workshop + alle sub-models + API bodies
- [ ] Constanten: prijzen, specs, included items, steps template, facilitator tips
- [ ] Alles geëxporteerd en bruikbaar

---

## STAP 3: API ENDPOINTS

### Stap 3A — Purchase Flow API (SCR-04c)

| # | Route | Methode | Functie |
|---|-------|---------|---------|
| 1 | `/api/brand-assets/[id]/workshops` | GET | Workshops voor asset + bundles |
| 2 | `/api/brand-assets/[id]/workshops/bundles` | GET | Alle beschikbare bundles |
| 3 | `/api/brand-assets/[id]/workshops/purchase` | POST | Workshop aankoop |
| 4 | `/api/brand-assets/[id]/workshops/preview-impact` | POST | Dashboard impact preview |

**POST /purchase logica:**
```
1. Valideer: bundleId OF selectedAssetIds (niet beide leeg)
2. Bereken prijs:
   - Bundle: bundle.finalPrice × workshopCount
   - Individueel: (WORKSHOP_BASE_PRICE + selectedAssetIds.length × ASSET_PRICE) × workshopCount
   - + FACILITATOR_PRICE als hasFacilitator
3. Maak Workshop aan met status PURCHASED
4. Maak 6 WorkshopSteps aan vanuit WORKSHOP_STEPS_TEMPLATE
5. Return { workshop, totalPrice }
```

### Stap 3B — Session Flow API (SCR-04d)

| # | Route | Methode | Functie |
|---|-------|---------|---------|
| 5 | `/api/workshops/[workshopId]` | GET | Workshop detail + steps + participants |
| 6 | `/api/workshops/[workshopId]/start` | POST | Start session → IN_PROGRESS |
| 7 | `/api/workshops/[workshopId]/steps/[stepNumber]` | PATCH | Step response opslaan |
| 8 | `/api/workshops/[workshopId]/timer` | PATCH | Timer sync |
| 9 | `/api/workshops/[workshopId]/bookmark` | PATCH | Bookmark positie opslaan |
| 10 | `/api/workshops/[workshopId]/complete` | POST | Afronden + trigger AI rapport |

**POST /complete logica:**
```
1. Workshop status → COMPLETED, completedAt = now
2. BrandAssetResearchMethod: method=WORKSHOP → status COMPLETED, progress 100
3. BrandAsset.workshopValidated = true
4. Herbereken brand asset coveragePercentage (workshop weight = 0.30)
5. Genereer mock rapport: executiveSummary + 5 findings + 4 recommendations
6. Workshop.reportGenerated = true
7. Return { workshop, reportGenerating: false }
```

### Stap 3C — Results Flow API (SCR-04e)

| # | Route | Methode | Functie |
|---|-------|---------|---------|
| 11 | `/api/workshops/[workshopId]/report` | GET | AI rapport data |
| 12 | `/api/workshops/[workshopId]/canvas` | PATCH | Canvas data updaten |
| 13 | `/api/workshops/[workshopId]/notes` | GET | Alle notes |
| 14 | `/api/workshops/[workshopId]/notes` | POST | Note toevoegen |
| 15 | `/api/workshops/[workshopId]/export` | GET | Export als JSON |

### Stap 3D — API Client

**Bestand:** `src/lib/api/workshop.ts`

Functies: getWorkshops, getBundles, purchaseWorkshop, previewImpact, getWorkshopDetail, startWorkshop, updateStepResponse, syncTimer, setBookmark, completeWorkshop, getReport, updateCanvas, getNotes, addNote, exportWorkshop

### Stap 3E — Zod Validatie

```typescript
const purchaseSchema = z.object({
  bundleId: z.string().cuid().optional(),
  selectedAssetIds: z.array(z.string().cuid()).optional(),
  workshopCount: z.number().int().min(1).max(10).default(1),
  hasFacilitator: z.boolean().default(false),
}).refine(d => d.bundleId || (d.selectedAssetIds && d.selectedAssetIds.length > 0),
  { message: "Either bundleId or selectedAssetIds required" });

const stepResponseSchema = z.object({
  response: z.string().min(1).max(10000),
  isCompleted: z.boolean().optional(),
});

const timerSchema = z.object({ timerSeconds: z.number().int().min(0) });
const bookmarkSchema = z.object({ bookmarkStep: z.number().int().min(1).max(6) });

const canvasUpdateSchema = z.object({
  canvasData: z.record(z.unknown()),
  canvasLocked: z.boolean().optional(),
});

const noteSchema = z.object({
  authorName: z.string().min(1).max(100),
  authorRole: z.string().max(100).optional(),
  content: z.string().min(1).max(5000),
});
```

### ✅ Stap 3 Checklist
- [ ] 15 API endpoints aangemaakt
- [ ] Purchase: prijs berekening correct (bundle vs individueel + facilitator)
- [ ] Complete: status cascade (Workshop → ResearchMethod → BrandAsset validation %)
- [ ] Alle endpoints gevalideerd met Zod
- [ ] API client met alle functies

---

## STAP 4: STORE + HOOKS

### Stap 4A — Zustand Store

**Bestand:** `src/stores/useWorkshopStore.ts`

```typescript
interface WorkshopState {
  // Purchase
  selectionMode: "bundles" | "individual";
  selectedBundleId: string | null;
  selectedAssetIds: string[];
  workshopCount: number;
  hasFacilitator: boolean;
  totalPrice: number;

  // Session
  activeWorkshop: Workshop | null;
  currentStepNumber: number;
  stepResponses: Record<number, string>;
  timerRunning: boolean;
  timerSeconds: number;

  // Results
  activeTab: "overview" | "canvas" | "workshop" | "notes" | "gallery";
  canvasEditing: boolean;

  // Actions
  setSelectionMode, selectBundle, toggleAssetSelection,
  setWorkshopCount, setHasFacilitator, calculateTotalPrice,
  setActiveWorkshop, setCurrentStep, updateStepResponse,
  startTimer, stopTimer, tickTimer,
  setActiveTab, setCanvasEditing, reset
}
```

**Prijs berekening:**
```typescript
calculateTotalPrice: (bundles) => {
  const s = get();
  let price = 0;
  if (s.selectionMode === "bundles" && s.selectedBundleId) {
    const bundle = bundles.find(b => b.id === s.selectedBundleId);
    price = (bundle?.finalPrice ?? 0) * s.workshopCount;
  } else {
    price = (WORKSHOP_BASE_PRICE + s.selectedAssetIds.length * ASSET_PRICE) * s.workshopCount;
  }
  if (s.hasFacilitator) price += FACILITATOR_PRICE;
  set({ totalPrice: price });
}
```

### Stap 4B — TanStack Query Hooks

**Bestand:** `src/lib/api/workshop-hooks.ts`

```typescript
export const workshopKeys = {
  all:      ["workshops"] as const,
  byAsset:  (assetId: string) => ["workshops", "asset", assetId] as const,
  bundles:  (assetId: string) => ["workshops", "bundles", assetId] as const,
  detail:   (workshopId: string) => ["workshops", workshopId] as const,
  report:   (workshopId: string) => ["workshops", workshopId, "report"] as const,
  notes:    (workshopId: string) => ["workshops", workshopId, "notes"] as const,
};

// Purchase: useWorkshops, useWorkshopBundles, usePurchaseWorkshop, usePreviewImpact
// Session: useWorkshopDetail (staleTime 10s), useStartWorkshop, useUpdateStepResponse, useCompleteWorkshop
// Results: useWorkshopReport (staleTime Infinity), useUpdateCanvas, useWorkshopNotes, useAddNote
// Timer:   useWorkshopTimer (interval + 30s debounced sync)
```

### ✅ Stap 4 Checklist
- [ ] Zustand store: purchase + session + results state
- [ ] Prijs berekening: bundle vs individueel × count + facilitator
- [ ] Timer: tick elke seconde + 30s debounced server sync
- [ ] TanStack hooks: alle 15 endpoints afgedekt
- [ ] Query keys gestructureerd

---

## STAP 5: UI — PURCHASE FLOW (SCR-04c)

### Componenten (10)

| # | Component | Beschrijving |
|---|-----------|-------------|
| 1 | `WorkshopPurchasePage.tsx` | 2-kolom layout: content links, sidebar rechts |
| 2 | `WorkshopPackageInfo.tsx` | Package beschrijving + What's Included + specs |
| 3 | `AssetSelectionToggle.tsx` | Pill toggle: Bundles ↔ Individual |
| 4 | `BundleCard.tsx` | Selecteerbare bundel card |
| 5 | `BundleList.tsx` | Grid van 3 bundles |
| 6 | `IndividualAssetGrid.tsx` | Checkbox grid van alle assets |
| 7 | `IndividualAssetCard.tsx` | Enkele selecteerbare asset |
| 8 | `WorkshopOptions.tsx` | Stepper (workshopCount) + facilitator checkbox |
| 9 | `PurchaseSummary.tsx` | Sticky sidebar: line items + totaal + CTA's |
| 10 | `DashboardImpactModal.tsx` | Before/after tabel modal |

### Key Design Tokens

**BundleCard:**
```
Container:      border border-gray-200 rounded-lg p-5 hover:border-gray-300 cursor-pointer
Selected:       border-emerald-500 ring-1 ring-emerald-500
Badge:
  Most Popular:   bg-blue-50 text-blue-700 text-xs px-2 py-0.5 rounded-full
  Best Value:     bg-emerald-50 text-emerald-700 text-xs px-2 py-0.5 rounded-full
  Comprehensive:  bg-purple-50 text-purple-700 text-xs px-2 py-0.5 rounded-full
Original price: text-sm text-gray-400 line-through
Final price:    text-lg font-bold text-gray-900
Savings:        text-sm text-emerald-600 font-medium → "Save €{discount}"
```

**PurchaseSummary (sticky):**
```
Container:      bg-gray-50 border border-gray-200 rounded-lg p-5 sticky top-4
Line items:     flex justify-between text-sm text-gray-700
Total:          text-lg font-bold border-t pt-3
Purchase btn:   w-full bg-emerald-600 text-white py-2.5 rounded-lg
Preview btn:    w-full border border-gray-300 text-gray-700 py-2.5 rounded-lg mt-2
```

**AssetSelectionToggle:**
```
Container:      flex bg-gray-100 rounded-lg p-1
Active:         bg-white text-gray-900 shadow-sm px-4 py-1.5 rounded-md text-sm font-medium
Inactive:       text-gray-500 px-4 py-1.5 rounded-md text-sm
```

### Route
```
src/app/knowledge/brand-foundation/[slug]/workshop/page.tsx
```

### ✅ Stap 5 Checklist
- [ ] 2-kolom layout: content 2/3, sidebar 1/3
- [ ] Toggle: Bundles ↔ Individual
- [ ] 3 bundle cards met badges, strikethrough, savings
- [ ] Bundle selectie als radio
- [ ] Individual: checkbox grid
- [ ] Stepper: min 1
- [ ] Facilitator: +€350
- [ ] Sidebar sticky met dynamisch totaal
- [ ] Purchase disabled zonder selectie
- [ ] Preview Impact modal

---

## STAP 6: UI — LIVE SESSION (SCR-04d)

### Componenten (9)

| # | Component | Beschrijving |
|---|-----------|-------------|
| 1 | `WorkshopSessionPage.tsx` | Session layout |
| 2 | `WorkshopCardList.tsx` | Scheduled workshops overview |
| 3 | `WorkshopCard.tsx` | Workshop card (date, title, facilitator) |
| 4 | `WorkshopToolbar.tsx` | Video + Facilitator + Timer + Bookmark + Complete |
| 5 | `StepNavigation.tsx` | Horizontale pills (1-6) |
| 6 | `StepContent.tsx` | Step body + video placeholder |
| 7 | `ResponseCapture.tsx` | Prompt + textarea + nav buttons |
| 8 | `ProgressBar.tsx` | Overall progress |
| 9 | `FacilitatorTips.tsx` | Gele tips (stap 6) |

### Key Design Tokens

**Step pills:**
```
default:    bg-gray-100 text-gray-500 rounded-full px-3 py-1.5 text-sm
active:     bg-emerald-600 text-white rounded-full px-3 py-1.5 text-sm
completed:  bg-emerald-50 text-emerald-700 rounded-full px-3 py-1.5 text-sm
```

**Timer:** `font-mono bg-gray-100 px-3 py-1 rounded text-sm` — telt OP

**FacilitatorTips:**
```
Container:  bg-amber-50 border border-amber-200 rounded-lg p-4
Title:      text-sm font-bold text-amber-800, 💡
Tips:       list-decimal text-sm text-amber-700
```

### Route
```
src/app/knowledge/brand-foundation/[slug]/workshop/[workshopId]/page.tsx
```

### ✅ Stap 6 Checklist
- [ ] Workshop cards voor scheduled workshops
- [ ] Toolbar: timer OP, bookmark, complete
- [ ] 6 pills: default/active/completed
- [ ] Step content + video placeholder
- [ ] Response capture: prompt + textarea + Previous/Next/Finish
- [ ] Finish alleen stap 6, disabled tot alles klaar
- [ ] Progress bar
- [ ] Facilitator tips bij stap 6

---

## STAP 7: UI — RESULTS (SCR-04e)

### Componenten (14)

| # | Component | Beschrijving |
|---|-----------|-------------|
| 1 | `WorkshopCompletePage.tsx` | Results layout |
| 2 | `WorkshopNavigation.tsx` | Previous/Next workshop |
| 3 | `CompleteBanner.tsx` | Success banner + 4 stats + export |
| 4 | `ResultsTabs.tsx` | 5-tab switcher |
| 5 | `OverviewTab.tsx` | AI rapport |
| 6 | `AIReportSection.tsx` | Summary + findings + recommendations |
| 7 | `KeyFindingsCard.tsx` | Groene nummers (1-5) |
| 8 | `RecommendationsCard.tsx` | Bullets (1-4) |
| 9 | `CanvasTab.tsx` | Golden Circle + unlock-to-edit |
| 10 | `WorkshopDetailsTab.tsx` | Objectives + Participants + Agenda |
| 11 | `ParticipantsGrid.tsx` | 2×4 grid |
| 12 | `AgendaTimeline.tsx` | Inklapbare items |
| 13 | `NotesTab.tsx` | Participant notes |
| 14 | `GalleryTab.tsx` | Foto grid |

### Key Design Tokens

**CompleteBanner:**
```
Container:  bg-emerald-50 border border-emerald-200 rounded-lg p-6
Stats:      grid grid-cols-4 gap-4
```

**ResultsTabs:**
```
Active:     text-emerald-600 border-b-2 border-emerald-600
Inactive:   text-gray-500 hover:text-gray-700
```

**Canvas (Golden Circle):**
```
WHY:   border-blue-500 bg-blue-50
HOW:   border-emerald-500 bg-emerald-50
WHAT:  border-amber-500 bg-amber-50
```

**ParticipantsGrid:**
```
Grid:   grid grid-cols-2 md:grid-cols-4 gap-3
Card:   bg-gray-50 rounded-lg p-3 text-center
```

### Route
```
src/app/knowledge/brand-foundation/[slug]/workshop/[workshopId]/results/page.tsx
```

### ✅ Stap 7 Checklist
- [ ] Complete banner: 4 stats + export
- [ ] 5 tabs correct switchen
- [ ] Overview: summary + 5 findings + 4 recommendations
- [ ] Canvas: Golden Circle + unlock-to-edit
- [ ] Workshop: objectives + 8 participants + inklapbare agenda
- [ ] Notes: participant notes
- [ ] Gallery: foto grid
- [ ] Footer: Back + Done

---

## STAP 8: INTEGRATIE + AFRONDEN

### Stap 8A — Navigatie
- Fase 1C `ResearchMethodCard` (WORKSHOP) → `/knowledge/brand-foundation/[slug]/workshop`
- Status-based routing:
  - Geen workshop of TO_BUY → Purchase
  - PURCHASED/SCHEDULED → Workshop cards
  - IN_PROGRESS → Live session
  - COMPLETED → Results

### Stap 8B — Status Cascade na Complete
1. `Workshop.status` → COMPLETED
2. `BrandAssetResearchMethod` (WORKSHOP) → COMPLETED, progress 100
3. `BrandAsset.workshopValidated` → true
4. Herbereken `coveragePercentage` (workshop weight = 0.30)
5. Invalideer brand-assets + asset-detail caches

### Stap 8C — Placeholder Vervangen
Vervang `/knowledge/brand-foundation/[slug]/workshop/page.tsx` placeholder (Fase 1C) met WorkshopPurchasePage.

### ✅ Stap 8 Checklist
- [ ] Research method card navigeert correct
- [ ] Status-based routing werkt
- [ ] Complete cascade: Workshop → ResearchMethod → BrandAsset
- [ ] Coverage herberekend (weight 0.30)
- [ ] Cache invalidatie
- [ ] 0 TypeScript errors, 0 ESLint errors
- [ ] Placeholder route vervangen

---

## VOLGENDE STAPPEN NA FASE 1D

```
1. ✅ AppShell + Dashboard (Fase 11)
2. ✅ Brand Foundation Overview (Fase 1A)
3. ✅ AI Brand Analysis (Fase 1B)
4. ✅ Brand Asset Detail (Fase 1C)
5. ✅ Canvas Workshop (Fase 1D)          ← DIT PLAN
6.    Golden Circle (Fase 1E)
7.    Business Strategy + Brandstyle (Fase 2-3)
```

---

*Einde implementatieplan — 13 februari 2026*
*~750 regels, 8 stappen, Canvas Workshop: purchase + live sessie + resultaten*
