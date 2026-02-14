# BRANDDOCK — Implementatieplan Fase 4
## Personas — AI Chat, AI Analysis 4 Dimensies, Image Generator, Impact Badges, 4 Research Methods
**Datum:** 13 februari 2026
**Doel:** Research-based persona management met AI-chat, AI-analyse (4 dimensies), image generator, impact badges, strategic implications, en 4 research methods (incl. User Testing)
**Vereist:** Fase 11 ✅ + Fase 1A-1E ✅ + Fase 2 ✅ + Fase 3 ✅
**Geschatte duur:** 3-4 sessies (rijkste Knowledge module)

---

## HOE DIT PLAN TE GEBRUIKEN

```bash
# In Claude Code:
> Lees IMPLEMENTATIEPLAN-FASE-4.md en voer Stap 1 uit.
```

---

## OVERZICHT

Personas is de **rijkste Knowledge module** in Branddock. Elke persona combineert demografische, psychografische en gedragsdata met AI-powered features: Chat with Persona (AI-gesimuleerde conversatie), AI Analysis (4-dimensie onderzoek), Image Generator, en Strategic Implications. Validatie via 4 research methods met gewogen berekening.

**Unieke patronen (alleen in deze module):**
- Chat with Persona modal — AI conversatie vanuit persona perspectief
- AI Image Generator — profielfoto op basis van demografie
- Strategic Implications — AI-genereerbaar
- Impact badges per sectie (high/medium/low)
- User Testing als research method (i.p.v. Workshop bij Brand Foundation)
- 3-tab create formulier (Overview/Psychographics/Background)

```
Sidebar "Personas"
  → SCR-07: OVERVIEW
  │   ├── 3 Stats Cards (Ready / Needs Work / Total)
  │   ├── Search + Filter (all / ready / needs_work)
  │   ├── Persona Cards (avatar, demografie, research %, chat button)
  │   └── "+ Create Persona"
  │
  → SCR-07a: CREATE PERSONA (3-tab form)
  │   ├── Tab 1: Overview — demografie + AI image generator
  │   ├── Tab 2: Psychographics — values, interests, goals, motivations, frustrations
  │   └── Tab 3: Background — behaviors, additional context
  │
  → SCR-07b: PERSONA DETAIL
  │   ├── Header: avatar, naam, research %, methods
  │   ├── Action bar: Edit, Regenerate AI, Lock
  │   ├── Demographics (6 velden + Regenerate Photo)
  │   ├── Psychographics (personality, values, interests)
  │   ├── Goals (high impact) / Motivations (high) / Frustrations (medium)
  │   ├── Behaviors
  │   ├── Strategic Implications (AI genereerbaar)
  │   ├── Research Methods (4): AI Exploration, Interviews, Questionnaire, User Testing
  │   └── Chat with Persona (modal)
  │
  → SCR-07c/d: AI PERSONA ANALYSIS
      ├── Chat interface met 4 dimensie-vragen
      ├── Progress bar 0% → 25% → 50% → 75% → 100%
      └── Completion: success card + 4 dimensies + +35% research boost
```

**Routes:**
- Overview: `/knowledge/personas`
- Create: `/knowledge/personas/new`
- Detail: `/knowledge/personas/[id]`
- AI Analysis: `/knowledge/personas/[id]/ai-analysis`

---

## STAP 1: DATABASE

### Stap 1A — Prisma Schema

**Nieuwe modellen toevoegen aan `prisma/schema.prisma`:**

```prisma
// ============================================
// PERSONAS MODELLEN (Fase 4)
// ============================================

model Persona {
  id                    String              @id @default(cuid())
  name                  String
  tagline               String?
  avatarUrl             String?
  avatarSource          PersonaAvatarSource @default(NONE)

  // Demographics
  age                   String?
  gender                String?
  location              String?
  occupation            String?
  education             String?
  income                String?
  familyStatus          String?

  // Psychographics
  personalityType       String?
  coreValues            String[]            @default([])
  interests             String[]            @default([])
  goals                 String[]            @default([])
  motivations           String[]            @default([])
  frustrations          String[]            @default([])
  behaviors             String[]            @default([])

  // Strategic
  strategicImplications String?             @db.Text
  isLocked              Boolean             @default(false)
  lockedById            String?
  lockedBy              User?               @relation("LockedPersonas", fields: [lockedById], references: [id])
  lockedAt              DateTime?

  // Relations
  workspaceId           String
  workspace             Workspace           @relation(fields: [workspaceId], references: [id])
  createdById           String
  createdBy             User                @relation(fields: [createdById], references: [id])
  researchMethods       PersonaResearchMethod[]
  aiAnalysisSessions    AIPersonaAnalysisSession[]
  chatSessions          PersonaChatSession[]

  createdAt             DateTime            @default(now())
  updatedAt             DateTime            @updatedAt

  @@index([workspaceId])
}

enum PersonaAvatarSource {
  NONE
  AI_GENERATED
  MANUAL_URL
}

model PersonaResearchMethod {
  id             String                     @id @default(cuid())
  method         PersonaResearchMethodType
  status         ResearchMethodStatus       @default(AVAILABLE)
  progress       Float                      @default(0)
  completedAt    DateTime?
  artifactsCount Int                        @default(0)

  personaId      String
  persona        Persona                    @relation(fields: [personaId], references: [id], onDelete: Cascade)

  @@unique([personaId, method])
  @@index([personaId])
}

enum PersonaResearchMethodType {
  AI_EXPLORATION
  INTERVIEWS
  QUESTIONNAIRE
  USER_TESTING
}

model AIPersonaAnalysisSession {
  id                 String                   @id @default(cuid())
  status             AIPersonaAnalysisStatus  @default(NOT_STARTED)
  progress           Float                    @default(0)
  totalDimensions    Int                      @default(4)
  answeredDimensions Int                      @default(0)
  insightsData       Json?
  completedAt        DateTime?

  personaId          String
  persona            Persona                  @relation(fields: [personaId], references: [id], onDelete: Cascade)
  workspaceId        String
  workspace          Workspace                @relation(fields: [workspaceId], references: [id])
  createdById        String
  createdBy          User                     @relation(fields: [createdById], references: [id])
  messages           AIPersonaAnalysisMessage[]

  createdAt          DateTime                 @default(now())
  updatedAt          DateTime                 @updatedAt

  @@index([personaId])
  @@index([workspaceId])
}

enum AIPersonaAnalysisStatus {
  NOT_STARTED
  IN_PROGRESS
  COMPLETED
  ERROR
}

model AIPersonaAnalysisMessage {
  id          String                       @id @default(cuid())
  type        AIMessageType                // Hergebruik van Fase 1B
  content     String                       @db.Text
  orderIndex  Int
  metadata    Json?

  sessionId   String
  session     AIPersonaAnalysisSession     @relation(fields: [sessionId], references: [id], onDelete: Cascade)

  createdAt   DateTime                     @default(now())

  @@index([sessionId, orderIndex])
}

model PersonaChatSession {
  id            String                  @id @default(cuid())
  mode          PersonaChatMode         @default(FREE_CHAT)

  personaId     String
  persona       Persona                 @relation(fields: [personaId], references: [id], onDelete: Cascade)
  workspaceId   String
  workspace     Workspace               @relation(fields: [workspaceId], references: [id])
  createdById   String
  createdBy     User                    @relation(fields: [createdById], references: [id])
  messages      PersonaChatMessage[]
  insights      PersonaChatInsight[]

  createdAt     DateTime                @default(now())
  updatedAt     DateTime                @updatedAt

  @@index([personaId])
}

enum PersonaChatMode {
  FREE_CHAT
  GUIDED
}

model PersonaChatMessage {
  id          String              @id @default(cuid())
  role        ChatRole
  content     String              @db.Text

  sessionId   String
  session     PersonaChatSession  @relation(fields: [sessionId], references: [id], onDelete: Cascade)

  createdAt   DateTime            @default(now())

  @@index([sessionId])
}

enum ChatRole {
  USER
  ASSISTANT
}

model PersonaChatInsight {
  id          String              @id @default(cuid())
  title       String
  description String              @db.Text
  category    String?

  sessionId   String
  session     PersonaChatSession  @relation(fields: [sessionId], references: [id], onDelete: Cascade)

  createdAt   DateTime            @default(now())

  @@index([sessionId])
}
```

**Relaties toevoegen aan bestaande modellen:**
```prisma
// In model Workspace — voeg toe:
  personas               Persona[]
  aiPersonaAnalyses      AIPersonaAnalysisSession[]
  personaChatSessions    PersonaChatSession[]

// In model User — voeg toe:
  lockedPersonas         Persona[]                    @relation("LockedPersonas")
  createdPersonas        Persona[]
  personaAnalyses        AIPersonaAnalysisSession[]
  personaChatSessions    PersonaChatSession[]
```

### Stap 1B — Migratie

```bash
npx prisma migrate dev --name add-persona-models
```

### Stap 1C — Seed Data

Voeg toe aan `prisma/seed.ts`:

```typescript
// ============================================
// PERSONAS SEED DATA — 3 demo personas
// ============================================

// Persona 1: Sarah the Startup Founder
const sarah = await prisma.persona.create({
  data: {
    name: "Sarah Chen",
    tagline: "Tech-savvy startup founder building the next big thing",
    avatarUrl: null,
    avatarSource: "NONE",
    age: "28-35",
    gender: "Female",
    location: "Amsterdam, Netherlands",
    occupation: "Startup Founder & CEO",
    education: "MSc Computer Science, TU Delft",
    income: "€60,000 - €90,000",
    familyStatus: "Single, no children",
    personalityType: "ENTJ — The Commander: Strategic, ambitious, natural leader",
    coreValues: ["Innovation", "Authenticity", "Growth", "Impact", "Transparency"],
    interests: ["AI/ML", "Design Thinking", "Startup Culture", "Public Speaking", "Sustainability"],
    goals: [
      "Build a recognizable brand that stands out in the SaaS market",
      "Achieve product-market fit within 12 months",
      "Raise Series A funding by Q3 2026",
      "Build a diverse, high-performing team of 15+",
    ],
    motivations: [
      "Creating something meaningful that solves real problems",
      "Being recognized as a thought leader in her industry",
      "Financial independence and generational wealth",
      "Proving that ethical business can be profitable",
    ],
    frustrations: [
      "Too many branding tools that don't integrate with each other",
      "Expensive agencies that don't understand startup speed",
      "Inconsistent brand messaging across team members",
      "Lack of data-driven insights for brand decisions",
    ],
    behaviors: [
      "Researches extensively before purchasing (reads 5+ reviews)",
      "Active on LinkedIn and Twitter for professional networking",
      "Prefers self-service tools over agency relationships",
      "Makes decisions quickly once she has enough data",
      "Values free trials and freemium models",
    ],
    strategicImplications: "Sarah represents our core ICP: tech-savvy founders who need professional branding without agency overhead. Key opportunities: emphasize AI-powered efficiency, self-service capabilities, and data-driven brand insights. Her price sensitivity suggests our Professional tier (€99/mo) is the sweet spot. Critical to demonstrate ROI quickly — she'll churn within 30 days if value isn't obvious.",
    workspaceId: workspace.id,
    createdById: user.id,
  },
});

// Sarah's research methods
for (const method of [
  { method: "AI_EXPLORATION" as const, status: "COMPLETED" as const, progress: 100, artifactsCount: 1 },
  { method: "INTERVIEWS" as const, status: "AVAILABLE" as const, progress: 0 },
  { method: "QUESTIONNAIRE" as const, status: "AVAILABLE" as const, progress: 0 },
  { method: "USER_TESTING" as const, status: "AVAILABLE" as const, progress: 0 },
]) {
  await prisma.personaResearchMethod.create({
    data: { ...method, personaId: sarah.id, completedAt: method.status === "COMPLETED" ? new Date() : null },
  });
}

// Persona 2: Marcus the Marketing Director
const marcus = await prisma.persona.create({
  data: {
    name: "Marcus Williams",
    tagline: "Experienced marketing leader scaling mid-market brands",
    avatarUrl: null,
    avatarSource: "NONE",
    age: "40-50",
    gender: "Male",
    location: "London, United Kingdom",
    occupation: "VP of Marketing",
    education: "MBA, London Business School",
    income: "£120,000 - £160,000",
    familyStatus: "Married, 2 children",
    personalityType: "INTJ — The Architect: Strategic thinker, results-driven",
    coreValues: ["Excellence", "Strategy", "Efficiency", "Leadership", "Results"],
    interests: ["Brand Strategy", "Data Analytics", "Team Development", "Golf", "Business Books"],
    goals: [
      "Unify brand messaging across 5 international markets",
      "Reduce content production costs by 40%",
      "Increase brand awareness metrics by 25% YoY",
    ],
    motivations: [
      "Demonstrating measurable marketing ROI to the C-suite",
      "Building a best-in-class marketing organization",
      "Staying ahead of AI disruption in marketing",
    ],
    frustrations: [
      "Team members going off-brand despite guidelines",
      "Lengthy approval processes that slow down content delivery",
      "Difficulty measuring brand consistency across touchpoints",
    ],
    behaviors: [
      "Delegates tool evaluation to team but makes final decision",
      "Requires enterprise-grade security and compliance",
      "Prefers quarterly contracts over monthly subscriptions",
      "Attends 3-4 marketing conferences per year",
    ],
    workspaceId: workspace.id,
    createdById: user.id,
  },
});

// Marcus's research methods
for (const method of [
  { method: "AI_EXPLORATION" as const, status: "COMPLETED" as const, progress: 100, artifactsCount: 1 },
  { method: "INTERVIEWS" as const, status: "AVAILABLE" as const, progress: 0 },
  { method: "QUESTIONNAIRE" as const, status: "AVAILABLE" as const, progress: 0 },
  { method: "USER_TESTING" as const, status: "AVAILABLE" as const, progress: 0 },
]) {
  await prisma.personaResearchMethod.create({
    data: { ...method, personaId: marcus.id, completedAt: method.status === "COMPLETED" ? new Date() : null },
  });
}

// Persona 3: Lisa the UX Designer
const lisa = await prisma.persona.create({
  data: {
    name: "Lisa Müller",
    tagline: "Creative UX designer passionate about user-centered brand experiences",
    avatarUrl: null,
    avatarSource: "NONE",
    age: "25-32",
    gender: "Female",
    location: "Berlin, Germany",
    occupation: "Senior UX Designer",
    education: "BA Interaction Design, HfG Schwäbisch Gmünd",
    income: "€55,000 - €75,000",
    familyStatus: "In a relationship, no children",
    personalityType: "INFP — The Mediator: Creative, empathetic, idealistic",
    coreValues: ["Creativity", "Empathy", "Sustainability", "Simplicity", "Collaboration"],
    interests: ["UX Research", "Design Systems", "Typography", "Cycling", "Illustration"],
    goals: [
      "Create seamless brand-to-product design experiences",
      "Build a personal brand as a UX thought leader",
      "Transition into a Design Lead role within 2 years",
    ],
    motivations: [
      "Designing interfaces that genuinely help people",
      "Working with tools that respect design craft",
      "Contributing to open-source design resources",
    ],
    frustrations: [
      "Brand guidelines that are too rigid for digital adaptation",
      "Marketing tools that ignore design principles",
      "Poor typography and color management in most SaaS tools",
    ],
    behaviors: [
      "Evaluates tools based on design quality first",
      "Active in design communities (Figma, Dribbble, Twitter)",
      "Creates detailed comparison spreadsheets before purchasing",
      "Shares tool recommendations with her network",
    ],
    workspaceId: workspace.id,
    createdById: user.id,
  },
});

// Lisa's research methods (all available, no AI exploration yet)
for (const method of [
  { method: "AI_EXPLORATION" as const, status: "AVAILABLE" as const, progress: 0 },
  { method: "INTERVIEWS" as const, status: "AVAILABLE" as const, progress: 0 },
  { method: "QUESTIONNAIRE" as const, status: "AVAILABLE" as const, progress: 0 },
  { method: "USER_TESTING" as const, status: "AVAILABLE" as const, progress: 0 },
]) {
  await prisma.personaResearchMethod.create({
    data: { ...method, personaId: lisa.id },
  });
}
```

```bash
npx prisma db seed
```

### ✅ Stap 1 Checklist
- [ ] `Persona` model met demografie, psychographics, behaviors, strategic implications, lock
- [ ] `PersonaResearchMethod` met 4 types (AI_EXPLORATION, INTERVIEWS, QUESTIONNAIRE, USER_TESTING)
- [ ] `AIPersonaAnalysisSession` + `AIPersonaAnalysisMessage` (hergebruik AIMessageType)
- [ ] `PersonaChatSession` + `PersonaChatMessage` + `PersonaChatInsight`
- [ ] 7 enums: PersonaAvatarSource, PersonaResearchMethodType, AIPersonaAnalysisStatus, PersonaChatMode, ChatRole
- [ ] Cascade deletes correct
- [ ] Relaties op Workspace + User
- [ ] Migratie geslaagd
- [ ] Seed: 3 personas (Sarah 15%, Marcus 15%, Lisa 0%), research methods, volledige data

---

## STAP 2: TYPES + API

### Stap 2A — Types

**Bestand:** `src/types/persona.ts`

```typescript
// === Core Types ===
export type PersonaAvatarSource = "NONE" | "AI_GENERATED" | "MANUAL_URL";
export type PersonaResearchMethodType = "AI_EXPLORATION" | "INTERVIEWS" | "QUESTIONNAIRE" | "USER_TESTING";
export type AIPersonaAnalysisStatus = "NOT_STARTED" | "IN_PROGRESS" | "COMPLETED" | "ERROR";
export type PersonaChatMode = "FREE_CHAT" | "GUIDED";
export type ChatRole = "USER" | "ASSISTANT";

export interface Persona {
  id: string;
  name: string;
  tagline: string | null;
  avatarUrl: string | null;
  avatarSource: PersonaAvatarSource;
  // Demographics
  age: string | null;
  gender: string | null;
  location: string | null;
  occupation: string | null;
  education: string | null;
  income: string | null;
  familyStatus: string | null;
  // Psychographics
  personalityType: string | null;
  coreValues: string[];
  interests: string[];
  goals: string[];
  motivations: string[];
  frustrations: string[];
  behaviors: string[];
  // Strategic
  strategicImplications: string | null;
  isLocked: boolean;
  lockedBy: { name: string } | null;
  lockedAt: string | null;
  // Computed
  validationPercentage: number;
  researchMethods: PersonaResearchMethodItem[];
  createdBy: { name: string; avatarUrl: string | null };
  createdAt: string;
  updatedAt: string;
}

export interface PersonaListItem {
  id: string;
  name: string;
  tagline: string | null;
  avatarUrl: string | null;
  age: string | null;
  location: string | null;
  occupation: string | null;
  income: string | null;
  familyStatus: string | null;
  education: string | null;
  validationPercentage: number;
  researchMethodsCompleted: number;
  researchMethodsTotal: number;
}

export interface PersonaResearchMethodItem {
  id: string;
  method: PersonaResearchMethodType;
  status: string; // ResearchMethodStatus from Fase 1C
  progress: number;
  completedAt: string | null;
  artifactsCount: number;
}

export interface PersonaStats {
  ready: number;      // validation >= 80%
  needsWork: number;  // validation < 80%
  total: number;
}

// === Chat Types ===
export interface PersonaChatMessage {
  id: string;
  role: ChatRole;
  content: string;
  createdAt: string;
}

export interface PersonaChatInsight {
  id: string;
  title: string;
  description: string;
  category: string | null;
}

// === AI Analysis Types ===
export interface AIPersonaAnalysisSession {
  id: string;
  status: AIPersonaAnalysisStatus;
  progress: number;
  totalDimensions: number;
  answeredDimensions: number;
  insightsData: PersonaInsightsData | null;
  completedAt: string | null;
  messages: AIPersonaAnalysisMessage[];
}

export interface AIPersonaAnalysisMessage {
  id: string;
  type: string; // AIMessageType
  content: string;
  orderIndex: number;
  metadata: Record<string, unknown> | null;
}

export interface PersonaInsightsData {
  dimensions: PersonaDimension[];
  researchBoostPercentage: number;
  completedAt: string;
}

export interface PersonaDimension {
  key: "demographics" | "goals_motivations" | "challenges_frustrations" | "value_proposition";
  title: string;
  icon: string;
  summary: string;
}

// === API Bodies ===
export interface CreatePersonaBody {
  name: string;
  tagline?: string;
  age?: string;
  gender?: string;
  location?: string;
  occupation?: string;
  education?: string;
  income?: string;
  familyStatus?: string;
  personalityType?: string;
  coreValues?: string[];
  interests?: string[];
  goals?: string[];
  motivations?: string[];
  frustrations?: string[];
  behaviors?: string[];
}

export interface SendChatMessageBody {
  content: string;
  context?: string;
}

export interface AnalysisAnswerBody {
  content: string;
}

export interface GenerateImageBody {
  demographics: { age?: string; gender?: string; occupation?: string };
}

// === Configs ===
export const DEMOGRAPHIC_FIELDS = [
  { key: "age", icon: "Calendar", label: "AGE" },
  { key: "location", icon: "MapPin", label: "LOCATION" },
  { key: "occupation", icon: "Building2", label: "OCCUPATION" },
  { key: "income", icon: "DollarSign", label: "INCOME" },
  { key: "familyStatus", icon: "Users", label: "FAMILY STATUS" },
  { key: "education", icon: "GraduationCap", label: "EDUCATION" },
] as const;

export const IMPACT_BADGE_CONFIG = {
  high:   { label: "high impact",   bg: "bg-emerald-50", color: "text-emerald-700" },
  medium: { label: "medium impact", bg: "bg-amber-50",   color: "text-amber-700" },
  low:    { label: "low impact",    bg: "bg-gray-100",   color: "text-gray-600" },
} as const;

export const RESEARCH_CONFIDENCE_COLORS = {
  critical: { range: [0, 0],    color: "text-red-500",    label: "At risk" },
  low:      { range: [1, 49],   color: "text-amber-500",  label: "Low" },
  medium:   { range: [50, 79],  color: "text-yellow-500", label: "Medium" },
  ready:    { range: [80, 100], color: "text-emerald-500", label: "Ready" },
} as const;

export const PERSONA_RESEARCH_METHODS = [
  { method: "AI_EXPLORATION" as const, icon: "Bot", type: "AI", time: "Instant", isFree: true },
  { method: "INTERVIEWS" as const, icon: "MessageCircle", type: "1-on-1", time: "Variable", isFree: false },
  { method: "QUESTIONNAIRE" as const, icon: "ClipboardList", type: "Quantitative", time: "1-2 weeks", isPaid: true, priceLabel: "From $500" },
  { method: "USER_TESTING" as const, icon: "Smartphone", type: "Observational", time: "Variable", isFree: false },
] as const;

export const PERSONA_VALIDATION_WEIGHTS: Record<PersonaResearchMethodType, number> = {
  AI_EXPLORATION: 0.15,
  INTERVIEWS:     0.30,
  QUESTIONNAIRE:  0.30,
  USER_TESTING:   0.25,
};

export const ANALYSIS_DIMENSIONS = [
  { key: "demographics", title: "Demografische Kenmerken", icon: "Users", color: "text-emerald-500" },
  { key: "goals_motivations", title: "Doelen & Motivaties", icon: "TrendingUp", color: "text-blue-500" },
  { key: "challenges_frustrations", title: "Uitdagingen & Frustraties", icon: "Heart", color: "text-pink-500" },
  { key: "value_proposition", title: "Waarde Propositie", icon: "Zap", color: "text-amber-500" },
] as const;
```

### Stap 2B — Validation Utility

**Bestand:** `src/lib/utils/persona-validation.ts`

```typescript
/**
 * Bereken gewogen validation percentage voor een persona
 * Weights: AI_EXPLORATION 0.15, INTERVIEWS 0.30, QUESTIONNAIRE 0.30, USER_TESTING 0.25
 */
export function calculatePersonaValidation(methods: PersonaResearchMethodItem[]): number;

/**
 * Bepaal confidence level op basis van percentage
 * 0 → critical/red, 1-49 → low/amber, 50-79 → medium/yellow, 80-100 → ready/emerald
 */
export function getConfidenceLevel(percentage: number): { color: string; label: string };
```

### Stap 2C — API Endpoints

**24 endpoints verdeeld over 5 groepen:**

```
src/app/api/personas/
  route.ts                                    → GET list+stats, POST create
  [personaId]/
    route.ts                                  → GET detail, PATCH update, DELETE
    duplicate/route.ts                        → POST duplicate
    lock/route.ts                             → PATCH toggle lock
    regenerate/route.ts                       → POST regenerate with AI
    strategic-implications/route.ts           → POST generate implications
    export/route.ts                           → GET export PDF/JSON
    generate-image/route.ts                   → POST AI image
    avatar/route.ts                           → PATCH manual avatar URL
    research-methods/
      [method]/route.ts                       → PATCH update status/progress
    chat/
      route.ts                                → POST create session
      [sessionId]/
        message/route.ts                      → POST send message
        insights/route.ts                     → GET insights
        export/route.ts                       → GET export chat
    ai-analysis/
      route.ts                                → POST start session
      [sessionId]/
        route.ts                              → GET session + messages
        answer/route.ts                       → POST answer dimension
        complete/route.ts                     → POST complete analysis
```

**Key endpoint logica:**

**GET /api/personas:**
```
1. Filter: all | ready (validation >= 80) | needs_work (validation < 80)
2. Search: naam of tagline
3. Include: researchMethods voor validation berekening
4. Return: { personas: PersonaListItem[], stats: PersonaStats }
```

**POST /api/personas/[id]/ai-analysis/[sessionId]/answer:**
```
1. Sla user antwoord op als AIPersonaAnalysisMessage
2. Verhoog answeredDimensions
3. progress = (answeredDimensions / 4) * 100
4. Genereer AI feedback + volgende vraag (of isComplete: true)
5. Return: { feedback, nextQuestion?, progress, isComplete }
```

**POST /api/personas/[id]/ai-analysis/[sessionId]/complete:**
```
1. Status → COMPLETED
2. Genereer insightsData (4 dimensies)
3. Update PersonaResearchMethod AI_EXPLORATION → COMPLETED (progress 100%)
4. Herbereken validation % (gewicht 0.15 voor AI = +15%)
5. Return: { status, insightsData, researchBoost: 15 }
```

**POST /api/personas/[id]/chat/[sessionId]/message:**
```
1. Sla user bericht op
2. Genereer AI response vanuit persona perspectief (system prompt met persona data)
3. Optioneel: extraheer insights automatisch
4. Return: { reply: PersonaChatMessage, insights?: PersonaChatInsight[] }
```

**Zod validatie:**
```typescript
const createPersonaSchema = z.object({
  name: z.string().min(1).max(100),
  tagline: z.string().max(200).optional(),
  age: z.string().max(20).optional(),
  gender: z.string().max(50).optional(),
  location: z.string().max(100).optional(),
  occupation: z.string().max(100).optional(),
  education: z.string().max(150).optional(),
  income: z.string().max(50).optional(),
  familyStatus: z.string().max(100).optional(),
  goals: z.array(z.string().max(500)).max(10).optional(),
  motivations: z.array(z.string().max(500)).max(10).optional(),
  frustrations: z.array(z.string().max(500)).max(10).optional(),
  behaviors: z.array(z.string().max(500)).max(10).optional(),
  coreValues: z.array(z.string().max(100)).max(10).optional(),
  interests: z.array(z.string().max(100)).max(10).optional(),
  personalityType: z.string().max(200).optional(),
});

const chatMessageSchema = z.object({
  content: z.string().min(1).max(5000),
  context: z.string().max(2000).optional(),
});

const analysisAnswerSchema = z.object({
  content: z.string().min(1).max(5000),
});
```

### Stap 2D — API Client + Hooks

**Bestand:** `src/lib/api/personas.ts` + `src/lib/api/personas-hooks.ts`

```typescript
const personaKeys = {
  all:              ["personas"],
  list:             (filter?: string) => ["personas", "list", filter],
  detail:           (id: string) => ["personas", id],
  chatSession:      (personaId: string, sessionId: string) => ["personas", personaId, "chat", sessionId],
  chatInsights:     (personaId: string, sessionId: string) => ["personas", personaId, "chat", sessionId, "insights"],
  analysisSession:  (personaId: string, sessionId: string) => ["personas", personaId, "analysis", sessionId],
};

// 15 Hooks
usePersonas(search?, filter?)                           // GET list + stats
usePersonaDetail(personaId)                             // GET detail
useCreatePersona()                                      // POST → navigate to detail
useUpdatePersona(personaId)                             // PATCH
useDeletePersona()                                      // DELETE → navigate to overview
useDuplicatePersona(personaId)                          // POST
useTogglePersonaLock(personaId)                         // PATCH lock
useRegeneratePersona(personaId)                         // POST regenerate
useGenerateStrategicImplications(personaId)              // POST
useGeneratePersonaImage(personaId)                       // POST image
useStartChatSession(personaId)                           // POST create chat session
useSendChatMessage(personaId, sessionId)                 // POST message
useChatInsights(personaId, sessionId)                    // GET insights
useStartAIAnalysis(personaId)                            // POST start analysis
useSendAnalysisAnswer(personaId, sessionId)              // POST answer
useCompleteAnalysis(personaId, sessionId)                // POST complete
```

### ✅ Stap 2 Checklist
- [ ] Types: Persona, ListItem, Stats, Chat, Analysis, Insights, Bodies
- [ ] Config constants: demographics, impact badges, research confidence, validation weights, dimensions
- [ ] Validation utility: calculatePersonaValidation + getConfidenceLevel
- [ ] 24 API endpoints in 5 groepen (CRUD, detail acties, image, chat, analysis)
- [ ] Zod validatie
- [ ] API client + 16 TanStack hooks met invalidatie

---

## STAP 3: STORES + UI — OVERVIEW + CREATE (SCR-07, SCR-07a)

### Stap 3A — Zustand Stores (4 stores)

**Bestand:** `src/stores/usePersonasStore.ts`

```typescript
// Store 1: Overview
interface PersonasOverviewStore {
  searchQuery: string;
  filter: "all" | "ready" | "needs_work";
  setSearchQuery: (q: string) => void;
  setFilter: (f: "all" | "ready" | "needs_work") => void;
}

// Store 2: Detail
interface PersonaDetailStore {
  activeTab: "overview" | "psychographics" | "background";
  isEditing: boolean;
  editedFields: Partial<CreatePersonaBody>;
  isDirty: boolean;
  isRegenerating: boolean;
  isGeneratingImplications: boolean;
  setActiveTab: (tab: string) => void;
  startEditing: () => void;
  cancelEditing: () => void;
  setEditedField: (key: string, value: unknown) => void;
  reset: () => void;
}

// Store 3: Chat
interface PersonaChatStore {
  sessionId: string | null;
  currentInput: string;
  isAITyping: boolean;
  activeTab: "chat" | "insights";
  mode: PersonaChatMode;
  setSessionId: (id: string) => void;
  setCurrentInput: (input: string) => void;
  setIsAITyping: (typing: boolean) => void;
  setActiveTab: (tab: "chat" | "insights") => void;
  reset: () => void;
}

// Store 4: AI Analysis
interface AIPersonaAnalysisStore {
  sessionId: string | null;
  status: AIPersonaAnalysisStatus;
  progress: number;
  answeredDimensions: number;
  currentInput: string;
  isAITyping: boolean;
  setSessionId: (id: string) => void;
  setProgress: (p: number) => void;
  setCurrentInput: (input: string) => void;
  setIsAITyping: (typing: boolean) => void;
  reset: () => void;
}
```

### Stap 3B — Overview Componenten (SCR-07)

```
src/components/personas/
  PersonasPage.tsx                ← Hoofdpagina
  PersonaStatsCards.tsx           ← 3 stats (Ready / Needs Work / Total)
  PersonaSearchFilter.tsx         ← Search + filter toggle
  PersonaCard.tsx                 ← Persona card met avatar, demografie, research %
  PersonaConfidenceBadge.tsx      ← Kleur-gecodeerde research badge
  WhatArePersonasPanel.tsx        ← Uitleg panel (empty state)
```

### Design Tokens — Overview

#### PersonasPage Header
```
Icon:           Users (Lucide) in bg-emerald-50 circle
Title:          text-2xl font-bold text-gray-900 → "Personas"
Subtitle:       text-sm text-gray-500 → "Research-based target audience profiles"
CTA:            bg-emerald-500 text-white px-4 py-2 rounded-lg → "+ Create Persona"
```

#### PersonaStatsCards
```
Container:      grid grid-cols-3 gap-4 mb-6
Card:           bg-white border border-gray-200 rounded-lg p-4
  Icon:         w-8 h-8 rounded-full {bg} flex items-center justify-center
  Value:        text-2xl font-bold text-gray-900
  Label:        text-sm text-gray-500

3 cards:
  CheckCircle   bg-emerald-50 text-emerald-600 → "Ready for strategic use"
  AlertTriangle bg-amber-50 text-amber-600     → "Need more research"
  Users         bg-gray-50 text-gray-600        → "Total personas"
```

#### PersonaSearchFilter
```
Container:      flex items-center gap-3 mb-4
Search:         flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm
                placeholder="Search personas..." (Search icon left)
Filters:        flex gap-1
  Pill:
    Active:     bg-emerald-50 text-emerald-700 border border-emerald-200 px-3 py-1.5 rounded-full text-sm
    Inactive:   bg-white text-gray-500 border border-gray-200 px-3 py-1.5 rounded-full text-sm hover:bg-gray-50
  3 pills:      "All" | "Ready" | "Needs Work"
```

#### PersonaCard
```
Container:      border border-gray-200 rounded-xl p-6 hover:shadow-md transition-shadow cursor-pointer

Top row:        flex items-start gap-4
  Avatar:       w-16 h-16 rounded-full bg-gray-200 ring-2 ring-white
                (als geen foto: initialen in bg-emerald-100 text-emerald-700)
  Info:
    Name:       text-lg font-semibold text-gray-900
    Tagline:    text-sm text-gray-500 mt-1
    Confidence: PersonaConfidenceBadge rechts bovenaan

Demographics:   grid grid-cols-2 gap-3 mt-4
  Field:        flex items-center gap-2
    Icon:       w-4 h-4 text-gray-400
    Label:      text-xs text-gray-400 uppercase tracking-wide
    Value:      text-sm text-gray-700

Footer:         flex items-center justify-between mt-4 pt-4 border-t border-gray-100
  Chat btn:     bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-lg px-4 py-2 text-sm
                → "Chat with {Name}" (MessageCircle icon)
  Expand:       text-sm text-gray-500 hover:text-gray-700
                → "Validation Methods (X/4)" (ChevronDown icon)
```

#### PersonaConfidenceBadge
```
Badge:          flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium
  0%:           bg-red-50 text-red-500 → "At risk"
  1-49%:        bg-amber-50 text-amber-500 → "Low"
  50-79%:       bg-yellow-50 text-yellow-500 → "Medium"
  80-100%:      bg-emerald-50 text-emerald-500 → "Ready"
Value:          font-mono → "{xx}%"
```

### Stap 3C — Create Persona Componenten (SCR-07a)

```
src/components/personas/create/
  CreatePersonaPage.tsx           ← Hoofdpagina met 3 tabs
  PersonaFormTabs.tsx             ← Tab navigatie (Overview | Psychographics | Background)
  OverviewTab.tsx                 ← 6 demografie velden + naam/tagline
  PsychographicsTab.tsx           ← personality, values, interests, goals, motivations, frustrations
  BackgroundTab.tsx               ← behaviors + extra context
  PersonaImageGenerator.tsx       ← AI generate + manual URL fallback
  RepeatableListInput.tsx         ← Herbruikbaar: lijst met + knop en verwijder
```

### Design Tokens — Create

#### CreatePersonaPage
```
Breadcrumb:     text-sm text-gray-500 → "← Back to Personas"
Title:          text-xl font-semibold text-gray-900 → "Create New Persona"
Save btn:       bg-emerald-500 text-white px-6 py-2 rounded-lg → "Save Persona"
Cancel btn:     text-gray-500 hover:text-gray-700 → "Cancel"
```

#### PersonaFormTabs
```
Container:      flex gap-0 border-b border-gray-200 mb-6
Tab:
  Active:       text-emerald-600 border-b-2 border-emerald-500 pb-3 px-4 text-sm font-medium
  Inactive:     text-gray-500 hover:text-gray-700 pb-3 px-4 text-sm
3 tabs:         "Overview" | "Psychographics" | "Background"
```

#### OverviewTab
```
Name:           full-width text input → "Persona name"
Tagline:        full-width text input → "Short description or role"
Demographics:   grid grid-cols-2 gap-4 mt-4
  Field:        label + input (text-sm)
  6 velden:     Age, Gender, Location, Occupation, Education, Income, Family Status

ImageGenerator: rechts bovenin, naast naam
  Container:    w-24 h-24 rounded-full bg-gray-100 border-2 border-dashed border-gray-300
  Actions:      flex gap-2 mt-2
    Generate:   text-xs text-emerald-600 → "✨ Generate with AI"
    Upload:     text-xs text-gray-500 → "Upload image"
```

#### PsychographicsTab
```
PersonalityType: textarea → "e.g., ENTJ — The Commander"

4 repeatable sections:
  Core Values:   RepeatableListInput → tags/chips
  Interests:     RepeatableListInput → tags/chips
  Goals:         RepeatableListInput → textarea items
  Motivations:   RepeatableListInput → textarea items
  Frustrations:  RepeatableListInput → textarea items
```

#### BackgroundTab
```
Behaviors:       RepeatableListInput → textarea items
```

#### RepeatableListInput
```
Container:      space-y-2
Item:           flex items-center gap-2
  Input:        flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm
  Remove btn:   X w-4 h-4 text-gray-400 hover:text-red-500
Add btn:        flex items-center gap-1 text-sm text-emerald-600 hover:text-emerald-700 mt-2
                → "+ Add {label}" (Plus icon)
Max items:      10 per section
```

### ✅ Stap 3 Checklist
- [ ] 4 Zustand stores (overview, detail, chat, analysis)
- [ ] Overview: 3 stats cards (Ready/Needs Work/Total)
- [ ] Search + 3 filter pills (All/Ready/Needs Work)
- [ ] Persona cards: avatar, naam, tagline, 6 demografie velden, research %, chat button
- [ ] Confidence badge met 4 kleur-levels
- [ ] Create: 3-tab form (Overview/Psychographics/Background)
- [ ] AI Image Generator + manual URL fallback
- [ ] RepeatableListInput herbruikbaar component
- [ ] "Save Persona" → POST → navigate to detail

---

## STAP 4: UI — PERSONA DETAIL (SCR-07b)

### Componenten

```
src/components/personas/detail/
  PersonaDetailPage.tsx           ← Hoofdpagina
  PersonaDetailHeader.tsx         ← Avatar, naam, research %, methods count
  PersonaActionBar.tsx            ← Edit, Regenerate AI, Lock, More menu
  DemographicsSection.tsx         ← 6 velden + Regenerate Photo
  PsychographicsSection.tsx       ← Personality, values, interests
  GoalsMotivationsCards.tsx       ← 3 kaarten: Goals/Motivations/Frustrations + impact badges
  BehaviorsSection.tsx            ← Bullet list
  StrategicImplicationsSection.tsx ← AI-genereerbaar tekst
  ResearchMethodsSection.tsx      ← 4 methods met status
  ResearchMethodCard.tsx          ← Enkele method card
  ImpactBadge.tsx                 ← high/medium/low badge
```

### Design Tokens — Detail

#### PersonaDetailHeader
```
Container:      flex items-start gap-6 mb-6
Avatar:         w-24 h-24 rounded-full bg-gray-200 ring-4 ring-white shadow-sm
Info:
  Name:         text-2xl font-bold text-gray-900
  Tagline:      text-sm text-gray-500 mt-1
  Badges:       flex gap-2 mt-2
    Research %:  PersonaConfidenceBadge (groter formaat)
    Methods:     text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full
                 → "{X}/4 methods completed"
```

#### PersonaActionBar
```
Container:      flex items-center gap-2 mb-6 pb-4 border-b border-gray-100
Edit btn:       border border-gray-200 px-3 py-2 rounded-lg text-sm → "Edit Content" (Pencil icon)
Regenerate:     border border-gray-200 px-3 py-2 rounded-lg text-sm → "Regenerate with AI" (Sparkles icon)
Lock:           border border-gray-200 px-3 py-2 rounded-lg text-sm
  Unlocked:     → "Lock for Editing" (Lock icon)
  Locked:       bg-amber-50 border-amber-200 text-amber-700 → "Locked by {name}" (Lock icon)
More menu:      MoreHorizontal icon → Duplicate, Export, Delete
```

#### DemographicsSection
```
Title:          text-lg font-semibold text-gray-900 → "Demographics"
Impact badge:   ImpactBadge medium
Grid:           grid grid-cols-3 gap-4
  Field:        bg-gray-50 rounded-lg p-3
    Icon:       w-4 h-4 text-gray-400
    Label:      text-xs text-gray-400 uppercase tracking-wide
    Value:      text-sm font-medium text-gray-900
Regenerate:     text-sm text-emerald-600 → "Regenerate Photo" (RefreshCw icon)
```

#### GoalsMotivationsCards (3 kaarten)
```
Container:      grid grid-cols-3 gap-4
Card:           border border-gray-200 rounded-lg p-5
  Header:       flex items-center justify-between
    Title:      text-base font-semibold text-gray-900
    Badge:      ImpactBadge
  Items:        space-y-2 mt-3
    Item:       flex items-start gap-2
      Bullet:   w-1.5 h-1.5 rounded-full mt-2 {color}
      Text:     text-sm text-gray-700

3 kaarten:
  "Goals"         — ImpactBadge high   — bullet: bg-emerald-500
  "Motivations"   — ImpactBadge high   — bullet: bg-blue-500
  "Frustrations"  — ImpactBadge medium — bullet: bg-red-400
```

#### StrategicImplicationsSection
```
Title:          text-lg font-semibold text-gray-900 → "Strategic Implications"
Impact badge:   ImpactBadge high
Content:        text-sm text-gray-700 leading-relaxed
Empty state:    bg-gray-50 border border-dashed border-gray-300 rounded-lg p-6 text-center
  Icon:         Sparkles w-8 h-8 text-gray-300
  Text:         text-sm text-gray-500 → "Generate strategic implications using AI"
  Button:       bg-emerald-500 text-white px-4 py-2 rounded-lg text-sm → "Generate with AI"
Generating:     Loader2 animate-spin → "Generating..."
```

#### ImpactBadge
```
Badge:          inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium
  high:         bg-emerald-50 text-emerald-700 → "high impact"
  medium:       bg-amber-50 text-amber-700 → "medium impact"
  low:          bg-gray-100 text-gray-600 → "low impact"
```

#### ResearchMethodsSection
```
Title:          text-lg font-semibold text-gray-900 → "Research & Validation"
Subtitle:       text-sm text-gray-500 → "{X}% validated"

Grid:           grid grid-cols-2 gap-3
ResearchMethodCard:
  Container:    border border-gray-200 rounded-lg p-4
  Header:       flex items-center gap-3
    Icon:       w-8 h-8 rounded-lg {bg} flex items-center justify-center
    Info:
      Name:     text-sm font-semibold text-gray-900
      Type:     text-xs text-gray-500
  Status:       mt-3
    AVAILABLE:  text-xs text-gray-400 → "Not started"
    IN_PROGRESS: progress bar h-1.5 bg-emerald-500 + text-xs
    COMPLETED:  text-xs text-emerald-500 → "✅ Completed"
  CTA:
    AI_EXPLORATION available:  bg-emerald-500 text-white → "Start AI Analysis"
    Other available:           border border-gray-200 → "Set Up"
    COMPLETED:                 text-sm text-gray-500 → "View Results"
```

### ✅ Stap 4 Checklist
- [ ] Header: avatar, naam, tagline, research %, methods count
- [ ] Action bar: Edit, Regenerate AI, Lock/Unlock, More menu
- [ ] Demographics: 6 velden in 3-kolom grid + Regenerate Photo
- [ ] Psychographics: personality type, values tags, interests tags
- [ ] 3 kaarten: Goals (high), Motivations (high), Frustrations (medium) met impact badges
- [ ] Behaviors bullet list
- [ ] Strategic Implications: content of empty state + "Generate with AI"
- [ ] Research Methods: 4 kaarten met status + CTA's
- [ ] Impact badges op elke sectie

---

## STAP 5: UI — CHAT WITH PERSONA (SCR-07b modal)

### Componenten

```
src/components/personas/chat/
  ChatWithPersonaModal.tsx        ← Modal container
  PersonaChatInterface.tsx        ← Chat berichten + input
  PersonaChatBubble.tsx           ← Enkele chat bubble (user/persona)
  PersonaChatInsightsTab.tsx      ← Insights tab
  PersonaChatInput.tsx            ← Input veld + send
```

### Design Tokens

#### ChatWithPersonaModal
```
Overlay:        fixed inset-0 bg-black/50 z-50
Container:      bg-white rounded-xl w-[600px] max-h-[80vh] shadow-2xl mx-auto mt-16
                flex flex-col

Header:         flex items-center gap-3 p-4 border-b border-gray-100
  Avatar:       w-10 h-10 rounded-full
  Info:
    Name:       text-base font-semibold text-gray-900 → "Chat with {Name}"
    Subtitle:   text-xs text-gray-500 → persona.tagline
  Close:        X w-5 h-5 text-gray-400 ml-auto

Tabs:           flex gap-0 px-4 border-b border-gray-100
  Active:       text-emerald-600 border-b-2 border-emerald-500 pb-2 px-3 text-sm font-medium
  Inactive:     text-gray-500 pb-2 px-3 text-sm
  2 tabs:       "Chat" | "Insights"
```

#### PersonaChatBubble
```
User bubble:    flex justify-end mb-3
  Container:    bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-lg rounded-br-none
                max-w-[80%] px-4 py-3 text-sm

Persona bubble: flex justify-start mb-3 gap-2
  Avatar:       w-8 h-8 rounded-full flex-shrink-0
  Container:    bg-gray-50 border border-gray-200 text-gray-700 rounded-lg rounded-tl-none
                max-w-[80%] px-4 py-3 text-sm

AI typing:      flex gap-1 items-center px-4 py-3
  Dots:         3× w-2 h-2 bg-gray-300 rounded-full animate-bounce (staggered delay)
```

#### PersonaChatInput
```
Container:      flex items-center gap-2 p-4 border-t border-gray-100
Disclaimer:     flex items-center gap-1 px-3 py-1.5 bg-blue-50 rounded-lg mb-2 mx-4
  Icon:         Info w-3 h-3 text-blue-500
  Text:         text-xs text-blue-600 → "AI-simulated conversation in Free Chat mode"
Input:          flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm
                placeholder="Ask {Name} a question..."
Send btn:       bg-emerald-500 text-white rounded-lg p-2 → Send icon
                disabled: bg-gray-300
```

#### PersonaChatInsightsTab
```
Empty state:    text-center p-8
  Icon:         Lightbulb w-8 h-8 text-gray-300
  Text:         text-sm text-gray-500 → "Insights will appear as you chat"

Insight card:   bg-white border border-gray-200 rounded-lg p-3 mb-2
  Title:        text-sm font-semibold text-gray-900
  Description:  text-xs text-gray-600 mt-1
  Category:     text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full
```

### ✅ Stap 5 Checklist
- [ ] Modal: 600px breed, max 80vh, avatar + naam in header
- [ ] 2 tabs: Chat | Insights
- [ ] User bubbles: emerald/teal gradient, rechts uitgelijnd
- [ ] Persona bubbles: gray-50 + border, links met avatar
- [ ] AI typing indicator: 3 bouncing dots
- [ ] Disclaimer: blue-50 met Info icon
- [ ] Input: placeholder met persona naam, Send button
- [ ] Insights tab: empty state + insight cards met category

---

## STAP 6: UI — AI PERSONA ANALYSIS (SCR-07c → SCR-07d)

### Componenten

```
src/components/personas/ai-analysis/
  AIPersonaAnalysisPage.tsx       ← Route pagina
  PersonaAnalysisChatInterface.tsx ← Chat interface met dimensie-vragen
  PersonaAnalysisProgressBar.tsx  ← 0% → 25% → 50% → 75% → 100%
  PersonaAnalysisComplete.tsx     ← Success card + 4 dimensies
  DimensionInsightCard.tsx        ← Enkele dimensie kaart
```

### Design Tokens

#### AIPersonaAnalysisPage
```
Breadcrumb:     text-sm text-gray-500 → "← Back to {Persona Name}"
Title:          text-xl font-semibold text-gray-900 → "AI Persona Analysis"
Subtitle:       text-sm text-gray-500 → "Deep-dive analysis across 4 dimensions"
```

#### PersonaAnalysisProgressBar
```
Container:      mb-6
Labels:         flex items-center justify-between mb-2
  Current:      text-sm font-medium text-gray-900 → "Dimension {X} of 4"
  Percentage:   text-sm text-gray-500 → "{XX}%"
Track:          h-2 rounded-full bg-gray-200 w-full
Fill:           h-2 rounded-full bg-gradient-to-r from-blue-500 to-purple-500
                width: {progress}% transition-all duration-500
```

#### PersonaAnalysisChatInterface
```
AI bubble:      flex gap-3 mb-4
  Icon:         w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center
                Bot w-4 h-4 text-purple-600
  Content:      bg-gray-50 border border-gray-200 rounded-lg rounded-tl-none
                max-w-[80%] px-4 py-3 text-sm text-gray-700

User bubble:    flex justify-end mb-4
  Content:      bg-gradient-to-r from-emerald-500 to-teal-500 text-white
                rounded-lg rounded-br-none max-w-[80%] px-4 py-3 text-sm

Input:          border border-gray-200 rounded-lg px-4 py-3 text-sm w-full
                placeholder="Share your insights about this dimension..."
Actions:        flex items-center justify-between mt-3
  Navigation:   flex gap-2
    Previous:   text-sm text-gray-500 → "← Previous" (disabled op eerste)
    Next:       text-sm text-emerald-600 → "Next →" (disabled als niet beantwoord)
  Complete:     bg-emerald-500 text-white px-4 py-2 rounded-lg text-sm
                → "Complete Analysis" (alleen zichtbaar bij dimension 4)
```

#### PersonaAnalysisComplete (SCR-07d)
```
Success card:
  Container:    bg-emerald-50 border border-emerald-200 rounded-xl p-6 text-center
  Icon:         CheckCircle w-12 h-12 text-emerald-500 mx-auto
  Title:        text-xl font-bold text-gray-900 mt-3 → "Analysis Complete!"
  Subtitle:     text-sm text-gray-500

Metrics:        flex gap-6 justify-center mt-4
  Metric:       text-center
    Value:      text-2xl font-bold text-gray-900
    Label:      text-xs text-gray-500
  2 metrics:    "4 Dimensies geanalyseerd" + "+35% Research vertrouwen"

Dimensions:     grid grid-cols-2 gap-4 mt-6
DimensionInsightCard:
  Container:    bg-white border border-gray-200 rounded-lg p-4
  Header:       flex items-center gap-2
    Icon:       w-6 h-6 {color} (per dimensie)
    Title:      text-sm font-semibold text-gray-900
  Summary:      text-sm text-gray-600 mt-2

4 dimensies:
  Users         text-emerald-500 → "Demografische Kenmerken"
  TrendingUp    text-blue-500    → "Doelen & Motivaties"
  Heart         text-pink-500    → "Uitdagingen & Frustraties"
  Zap           text-amber-500   → "Waarde Propositie"

Actions:        flex gap-3 justify-center mt-6
  View detail:  border border-gray-200 px-4 py-2 rounded-lg text-sm → "View Persona"
  New analysis: bg-emerald-500 text-white px-4 py-2 rounded-lg text-sm → "Back to Persona"
```

### ✅ Stap 6 Checklist
- [ ] Chat interface met AI (purple) en User (emerald gradient) bubbles
- [ ] Progress bar: gradient blue→purple, 0/25/50/75/100%
- [ ] 4 dimensie-vragen sequentieel
- [ ] Previous/Next navigatie + Complete button
- [ ] Completion: success card + 2 metrics + 4 dimensie kaarten
- [ ] +35% research boost na voltooiing
- [ ] Auto-update: PersonaResearchMethod AI_EXPLORATION → COMPLETED

---

## STAP 7: ROUTES + INTEGRATIE

### Routes

```bash
src/app/knowledge/personas/page.tsx                     ← Overview
src/app/knowledge/personas/new/page.tsx                 ← Create
src/app/knowledge/personas/[id]/page.tsx                ← Detail
src/app/knowledge/personas/[id]/ai-analysis/page.tsx    ← AI Analysis
```

### Sidebar Navigatie

```
Knowledge
  ├── Brand Foundation     (Fase 1A)
  ├── Business Strategy    (Fase 2)
  ├── Brand Style          (Fase 3)
  ├── Personas             (Fase 4)  ← NIEUW
  └── ...
```

### Cross-Module Integratie

```
AI Analysis completion:
  1. AIPersonaAnalysisSession → status COMPLETED
  2. PersonaResearchMethod AI_EXPLORATION → COMPLETED (progress 100%)
  3. Herbereken validation % (AI gewicht = 0.15 → +15%)
  4. Invalideer persona + personas list caches
  5. Update overview stats

Chat with Persona:
  1. System prompt bevat volledige persona data
  2. AI antwoordt vanuit persona perspectief
  3. Insights automatisch geëxtraheerd
  4. Beschikbaar voor Content Studio als context

Downstream consumers (placeholders):
  - Campaign Wizard: persona selectie als target audience
  - Content Studio: persona context voor AI generatie
  - Brand Alignment: persona data voor consistency check
```

### ✅ Stap 7 Checklist
- [ ] 4 routes (overview, create, detail, ai-analysis)
- [ ] Sidebar link "Personas" onder Knowledge
- [ ] AI Analysis → research method → validation % update
- [ ] Chat system prompt met persona data
- [ ] Create → Save → navigate to detail
- [ ] Delete → navigate to overview

---

## VOLLEDIGE ACCEPTATIECRITERIA

### Overview (SCR-07)
- [ ] 3 stats cards: Ready (emerald), Needs Work (amber), Total (gray)
- [ ] Search + 3 filter pills (All/Ready/Needs Work)
- [ ] Persona cards: avatar, naam, tagline, 6 demografie velden
- [ ] Research % badge met 4 kleur-levels
- [ ] "Chat with {Name}" button
- [ ] "Validation Methods (X/4)" expandable
- [ ] "+ Create Persona" navigeert naar form

### Create (SCR-07a)
- [ ] 3 tabs: Overview / Psychographics / Background
- [ ] 6+ demografie velden in 2-kolom grid
- [ ] AI Image Generator + manual URL fallback
- [ ] RepeatableListInput voor alle list-velden (max 10 items)
- [ ] Save → POST → navigate to detail

### Detail (SCR-07b)
- [ ] Header: avatar, naam, tagline, research %, methods count
- [ ] Action bar: Edit, Regenerate AI, Lock/Unlock, More (Duplicate/Export/Delete)
- [ ] Demographics: 6 velden + Regenerate Photo
- [ ] Psychographics: personality type, values tags, interests tags
- [ ] 3 kaarten: Goals (high impact), Motivations (high), Frustrations (medium)
- [ ] Behaviors bullet list
- [ ] Strategic Implications: content of "Generate with AI" empty state
- [ ] Research Methods: 4 cards met status + CTA's
- [ ] Impact badges op elke sectie

### Chat with Persona (F-171)
- [ ] Modal: 600px, avatar + naam + tagline
- [ ] 2 tabs: Chat | Insights
- [ ] User bubbles (emerald gradient) + Persona bubbles (gray + avatar)
- [ ] AI typing indicator (3 bouncing dots)
- [ ] Disclaimer banner + input met persona naam placeholder
- [ ] Insights tab: empty state → auto-collected cards

### AI Persona Analysis (SCR-07c → 07d)
- [ ] Progress bar: gradient blue→purple, 4 stappen
- [ ] Chat met 4 dimensie-vragen
- [ ] Previous/Next/Complete navigatie
- [ ] Completion: success card + 4 dimensies + +35% boost
- [ ] Auto-update: research method → COMPLETED → validation %

### Technisch
- [ ] 0 TypeScript errors, 0 ESLint errors
- [ ] Gewogen validation berekening correct (0.15/0.30/0.30/0.25)
- [ ] Cascade deletes: persona → methods + chat sessions + analysis sessions
- [ ] Zod validatie op alle endpoints
- [ ] 24 API endpoints functioneel
- [ ] 16 TanStack hooks met invalidatie
- [ ] 4 Zustand stores

---

## VOLGENDE STAPPEN NA FASE 4

```
 1.  ✅ AppShell + Dashboard (Fase 11)
 2.  ✅ Brand Foundation Overview (Fase 1A)
 3.  ✅ AI Brand Analysis (Fase 1B)
 4.  ✅ Brand Asset Detail (Fase 1C)
 5.  ✅ Canvas Workshop (Fase 1D)
 6.  ✅ Interviews (Fase 1E)
 7.  ✅ Business Strategy (Fase 2)
 8.  ✅ Brand Style (Fase 3)
 9.  ✅ Personas (Fase 4)                    ← DIT PLAN
10.     Products & Services (Fase 5)
11.     Market Insights (Fase 6)
12.     Knowledge Library (Fase 7)
13.     Brand Alignment (Fase 8)
14.     Research & Validation (Fase 9)
15.     Campaigns & Content (Fase 10.1/10.2/10.3)
16.     Settings & Help (Fase 12)
```

---

*Einde implementatieplan — 13 februari 2026*
*~900 regels, 7 stappen, Personas met AI Chat, AI Analysis 4 dimensies, Image Generator, Impact Badges, 4 Research Methods*
