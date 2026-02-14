# BRANDDOCK — Implementatieplan Fase 2
## Business Strategy — OKR Objectives, Focus Areas, Milestone Timeline, Campaign Links
**Datum:** 13 februari 2026
**Doel:** Strategische planningsmodule: strategies overzicht + detail met OKR-structuur, focus areas, linked campaigns, milestone tijdlijn
**Vereist:** Fase 11 ✅ + Fase 1A-1E ✅
**Geschatte duur:** 2 sessies

---

## HOE DIT PLAN TE GEBRUIKEN

```bash
# In Claude Code:
> Lees IMPLEMENTATIEPLAN-FASE-2.md en voer Stap 1 uit.
```

---

## OVERZICHT

Business Strategy is de strategische planningsmodule. Elke strategie bevat OKR-achtige objectives met key results, focus areas, linked campaigns en milestones op een horizontale tijdlijn. Relatief rechttoe rechtaan vergeleken met Fase 1D/1E — twee schermen, geen wizard.

```
Sidebar "Business Strategy"
  → SCR-05: OVERVIEW
  │   ├── 4 Summary Stats (Active, On Track, At Risk, Planning Period)
  │   ├── Strategy Cards (progress bar, objectives count, focus area tags)
  │   └── + Add Strategy → CreateStrategyModal (6 types)
  │
  → SCR-05a: DETAIL (klik op strategy card)
      ├── Strategy Progress (multi-segment bar + 3 stats)
      ├── Strategic Context (Vision, Rationale, Key Assumptions — editable)
      ├── Objectives (OKR cards: key results, metrics, linked campaigns)
      ├── Focus Areas (5 cards grid)
      ├── Linked Campaigns (status, deliverables, completion %)
      └── Milestones Timeline (horizontaal, Q1-Q4, dots)
```

**Routes:**
- Overview: `/knowledge/business-strategy`
- Detail: `/knowledge/business-strategy/[id]`

---

## STAP 1: DATABASE

### Stap 1A — Prisma Schema

**Nieuwe modellen toevoegen aan `prisma/schema.prisma`:**

```prisma
// ============================================
// BUSINESS STRATEGY MODELLEN (Fase 2)
// ============================================

model BusinessStrategy {
  id                 String            @id @default(cuid())
  name               String
  slug               String
  description        String            @db.Text
  type               StrategyType      @default(CUSTOM)
  status             StrategyStatus    @default(DRAFT)
  vision             String?           @db.Text
  rationale          String?           @db.Text
  keyAssumptions     String[]
  startDate          DateTime?
  endDate            DateTime?
  progressPercentage Float             @default(0)

  objectives         Objective[]
  focusAreas         FocusArea[]
  milestones         Milestone[]
  linkedCampaigns    CampaignStrategy[]

  workspaceId        String
  workspace          Workspace         @relation(fields: [workspaceId], references: [id])
  createdById        String
  createdBy          User              @relation(fields: [createdById], references: [id])
  createdAt          DateTime          @default(now())
  updatedAt          DateTime          @updatedAt

  @@unique([slug, workspaceId])
  @@index([workspaceId])
  @@index([status])
}

model Objective {
  id                String            @id @default(cuid())
  title             String
  description       String?           @db.Text
  status            ObjectiveStatus   @default(ON_TRACK)
  priority          Priority          @default(MEDIUM)
  sortOrder         Int               @default(0)
  metricType        MetricType        @default(NUMBER)
  startValue        Float             @default(0)
  targetValue       Float
  currentValue      Float             @default(0)

  keyResults        KeyResult[]
  focusAreaId       String?
  focusArea         FocusArea?        @relation(fields: [focusAreaId], references: [id])
  strategyId        String
  strategy          BusinessStrategy  @relation(fields: [strategyId], references: [id], onDelete: Cascade)
  linkedCampaigns   CampaignObjective[]

  createdAt         DateTime          @default(now())
  updatedAt         DateTime          @updatedAt

  @@index([strategyId])
}

model KeyResult {
  id                String            @id @default(cuid())
  description       String
  status            KeyResultStatus   @default(ON_TRACK)
  progressValue     String?
  sortOrder         Int               @default(0)

  objectiveId       String
  objective         Objective         @relation(fields: [objectiveId], references: [id], onDelete: Cascade)

  createdAt         DateTime          @default(now())
  updatedAt         DateTime          @updatedAt

  @@index([objectiveId])
}

model FocusArea {
  id                String            @id @default(cuid())
  name              String
  description       String?
  icon              String?

  strategyId        String
  strategy          BusinessStrategy  @relation(fields: [strategyId], references: [id], onDelete: Cascade)
  objectives        Objective[]

  @@index([strategyId])
}

model Milestone {
  id                String            @id @default(cuid())
  title             String
  description       String?
  date              DateTime
  quarter           String            // "Q1 2026"
  status            MilestoneStatus   @default(UPCOMING)

  strategyId        String
  strategy          BusinessStrategy  @relation(fields: [strategyId], references: [id], onDelete: Cascade)

  @@index([strategyId])
}

model CampaignStrategy {
  strategyId        String
  strategy          BusinessStrategy  @relation(fields: [strategyId], references: [id], onDelete: Cascade)
  campaignId        String
  campaign          Campaign          @relation(fields: [campaignId], references: [id], onDelete: Cascade)

  @@id([strategyId, campaignId])
}

model CampaignObjective {
  objectiveId       String
  objective         Objective         @relation(fields: [objectiveId], references: [id], onDelete: Cascade)
  campaignId        String
  campaign          Campaign          @relation(fields: [campaignId], references: [id], onDelete: Cascade)

  @@id([objectiveId, campaignId])
}

// Enums
enum StrategyType {
  GROWTH
  MARKET_ENTRY
  PRODUCT_LAUNCH
  BRAND_BUILDING
  OPERATIONAL_EXCELLENCE
  CUSTOM
}

enum StrategyStatus {
  DRAFT
  ACTIVE
  COMPLETED
  ARCHIVED
}

enum ObjectiveStatus {
  ON_TRACK
  AT_RISK
  BEHIND
  COMPLETED
}

enum KeyResultStatus {
  ON_TRACK
  COMPLETE
  BEHIND
}

enum MilestoneStatus {
  DONE
  UPCOMING
  FUTURE
}

enum MetricType {
  PERCENTAGE
  NUMBER
  CURRENCY
}

enum Priority {
  HIGH
  MEDIUM
  LOW
}
```

**Relaties toevoegen aan bestaande modellen:**
```prisma
// In model Workspace — voeg toe:
  businessStrategies  BusinessStrategy[]

// In model User — voeg toe:
  createdStrategies   BusinessStrategy[]

// In model Campaign (als dit model al bestaat, anders: maak placeholder):
  strategyLinks       CampaignStrategy[]
  objectiveLinks      CampaignObjective[]
```

> **⚠️ Campaign model:** Als het Campaign model nog niet bestaat, maak een minimaal placeholder model:
> ```prisma
> model Campaign {
>   id          String   @id @default(cuid())
>   name        String
>   status      String   @default("draft")
>   workspaceId String
>   workspace   Workspace @relation(fields: [workspaceId], references: [id])
>   strategyLinks    CampaignStrategy[]
>   objectiveLinks   CampaignObjective[]
>   @@index([workspaceId])
> }
> ```

### Stap 1B — Migratie

```bash
npx prisma migrate dev --name add-business-strategy-models
```

### Stap 1C — Seed Data

Voeg toe aan `prisma/seed.ts`:

```typescript
// ============================================
// BUSINESS STRATEGY SEED DATA
// ============================================

// === Strategy 1: Growth Strategy 2026 (Active, 65%) ===
const growthStrategy = await prisma.businessStrategy.create({
  data: {
    name: "Growth Strategy 2026",
    slug: "growth-strategy-2026",
    description: "Comprehensive growth plan focusing on market expansion, product innovation, and customer acquisition to achieve 40% YoY revenue growth.",
    type: "GROWTH",
    status: "ACTIVE",
    vision: "Become the leading AI-powered brand strategy platform in Europe by end of 2026, serving 500+ enterprise clients.",
    rationale: "The brand strategy market is rapidly evolving with AI capabilities. Early movers who combine AI with human expertise will capture disproportionate market share. Our unique position at the intersection of strategy and execution gives us a competitive advantage.",
    keyAssumptions: [
      "AI adoption in marketing will grow 60% in 2026",
      "Enterprise clients prefer integrated platforms over point solutions",
      "Brand consistency directly correlates with revenue growth",
      "European market is underserved compared to US",
    ],
    startDate: new Date("2026-01-01"),
    endDate: new Date("2026-12-31"),
    progressPercentage: 65,
    workspaceId: workspace.id,
    createdById: user.id,
  },
});

// 5 Focus Areas
const focusAreas = [
  { name: "Market Expansion", description: "Expand into new European markets", icon: "Globe" },
  { name: "Product Innovation", description: "AI-powered feature development", icon: "Lightbulb" },
  { name: "Customer Acquisition", description: "Scale customer base to 500+", icon: "Users" },
  { name: "Brand Authority", description: "Establish thought leadership", icon: "Award" },
  { name: "Operational Scale", description: "Infrastructure for growth", icon: "Settings" },
];
const createdFocusAreas: Record<string, string> = {};
for (const fa of focusAreas) {
  const created = await prisma.focusArea.create({
    data: { ...fa, strategyId: growthStrategy.id },
  });
  createdFocusAreas[fa.name] = created.id;
}

// 5 Objectives with Key Results
const objectives = [
  {
    title: "Increase Monthly Recurring Revenue by 40%",
    description: "Scale MRR from €50k to €70k through new customer acquisition and upselling existing accounts.",
    status: "ON_TRACK",
    priority: "HIGH",
    metricType: "CURRENCY",
    startValue: 50000,
    targetValue: 70000,
    currentValue: 58000,
    focusArea: "Customer Acquisition",
    keyResults: [
      { description: "Acquire 50 new enterprise customers", status: "ON_TRACK", progressValue: "32/50" },
      { description: "Achieve 95% customer retention rate", status: "COMPLETE", progressValue: "97%" },
      { description: "Increase average deal size to €2,500/mo", status: "ON_TRACK", progressValue: "€2,200/mo" },
    ],
  },
  {
    title: "Launch AI Brand Analysis v2.0",
    description: "Ship next-generation AI analysis with multi-language support and competitive benchmarking.",
    status: "ON_TRACK",
    priority: "HIGH",
    metricType: "PERCENTAGE",
    startValue: 0,
    targetValue: 100,
    currentValue: 72,
    focusArea: "Product Innovation",
    keyResults: [
      { description: "Complete multi-language NLP pipeline", status: "COMPLETE", progressValue: "Done" },
      { description: "Launch competitive benchmarking feature", status: "ON_TRACK", progressValue: "80%" },
      { description: "Achieve 90%+ accuracy on brand sentiment", status: "BEHIND", progressValue: "84%" },
    ],
  },
  {
    title: "Expand to 3 New European Markets",
    description: "Enter Germany, France, and Spain with localized marketing and sales teams.",
    status: "AT_RISK",
    priority: "HIGH",
    metricType: "NUMBER",
    startValue: 0,
    targetValue: 3,
    currentValue: 1,
    focusArea: "Market Expansion",
    keyResults: [
      { description: "Launch German market with local team", status: "COMPLETE", progressValue: "Launched" },
      { description: "Establish French market presence", status: "BEHIND", progressValue: "Delayed" },
      { description: "Begin Spain market research", status: "ON_TRACK", progressValue: "In progress" },
    ],
  },
  {
    title: "Establish Brand Authority in AI Marketing",
    description: "Position Branddock as the thought leader in AI-powered brand strategy through content and events.",
    status: "ON_TRACK",
    priority: "MEDIUM",
    metricType: "NUMBER",
    startValue: 0,
    targetValue: 12,
    currentValue: 7,
    focusArea: "Brand Authority",
    keyResults: [
      { description: "Publish 12 thought leadership articles", status: "ON_TRACK", progressValue: "7/12" },
      { description: "Speak at 4 industry conferences", status: "COMPLETE", progressValue: "4/4" },
      { description: "Achieve 10K LinkedIn followers", status: "ON_TRACK", progressValue: "7.8K" },
    ],
  },
  {
    title: "Scale Infrastructure for 10x User Growth",
    description: "Ensure platform reliability and performance at scale.",
    status: "ON_TRACK",
    priority: "MEDIUM",
    metricType: "PERCENTAGE",
    startValue: 0,
    targetValue: 100,
    currentValue: 55,
    focusArea: "Operational Scale",
    keyResults: [
      { description: "Achieve 99.9% uptime SLA", status: "COMPLETE", progressValue: "99.95%" },
      { description: "Reduce API response time to <200ms", status: "ON_TRACK", progressValue: "240ms" },
      { description: "Implement auto-scaling for 10K concurrent users", status: "ON_TRACK", progressValue: "In progress" },
    ],
  },
];

for (let i = 0; i < objectives.length; i++) {
  const { keyResults, focusArea, ...objData } = objectives[i];
  const obj = await prisma.objective.create({
    data: {
      ...objData,
      sortOrder: i,
      focusAreaId: createdFocusAreas[focusArea],
      strategyId: growthStrategy.id,
    },
  });
  for (let j = 0; j < keyResults.length; j++) {
    await prisma.keyResult.create({
      data: { ...keyResults[j], sortOrder: j, objectiveId: obj.id },
    });
  }
}

// 4 Milestones
const milestones = [
  { title: "Q1 Revenue Target: €55K MRR", date: new Date("2026-03-31"), quarter: "Q1 2026", status: "DONE" as const },
  { title: "AI Analysis v2.0 Beta Launch", date: new Date("2026-04-15"), quarter: "Q2 2026", status: "UPCOMING" as const },
  { title: "Germany Market Launch", date: new Date("2026-02-01"), quarter: "Q1 2026", status: "DONE" as const },
  { title: "France Market Entry", date: new Date("2026-06-30"), quarter: "Q2 2026", status: "UPCOMING" as const },
];
for (const ms of milestones) {
  await prisma.milestone.create({
    data: { ...ms, strategyId: growthStrategy.id },
  });
}

// === Strategy 2: Product Launch Strategy (Draft, 30%) ===
const productStrategy = await prisma.businessStrategy.create({
  data: {
    name: "Product Launch Strategy",
    slug: "product-launch-strategy",
    description: "Launch plan for Branddock Enterprise tier with advanced analytics, team collaboration, and custom integrations.",
    type: "PRODUCT_LAUNCH",
    status: "DRAFT",
    progressPercentage: 30,
    startDate: new Date("2026-03-01"),
    endDate: new Date("2026-09-30"),
    workspaceId: workspace.id,
    createdById: user.id,
  },
});

// 2 Objectives for Product Launch
const plObj1 = await prisma.objective.create({
  data: {
    title: "Complete Enterprise Feature Set",
    status: "ON_TRACK",
    priority: "HIGH",
    metricType: "PERCENTAGE",
    startValue: 0,
    targetValue: 100,
    currentValue: 30,
    sortOrder: 0,
    strategyId: productStrategy.id,
  },
});
await prisma.keyResult.create({
  data: { description: "Ship role-based access control", status: "COMPLETE", progressValue: "Done", sortOrder: 0, objectiveId: plObj1.id },
});
await prisma.keyResult.create({
  data: { description: "Build custom reporting dashboard", status: "ON_TRACK", progressValue: "40%", sortOrder: 1, objectiveId: plObj1.id },
});

const plObj2 = await prisma.objective.create({
  data: {
    title: "Secure 10 Beta Enterprise Clients",
    status: "AT_RISK",
    priority: "HIGH",
    metricType: "NUMBER",
    startValue: 0,
    targetValue: 10,
    currentValue: 3,
    sortOrder: 1,
    strategyId: productStrategy.id,
  },
});
await prisma.keyResult.create({
  data: { description: "Onboard 10 beta testers", status: "BEHIND", progressValue: "3/10", sortOrder: 0, objectiveId: plObj2.id },
});

// === Strategy 3: Brand Building Initiative (Active, 42%) ===
await prisma.businessStrategy.create({
  data: {
    name: "Brand Building Initiative",
    slug: "brand-building-initiative",
    description: "Strengthen brand identity and market perception through consistent messaging, visual refresh, and community building.",
    type: "BRAND_BUILDING",
    status: "ACTIVE",
    progressPercentage: 42,
    startDate: new Date("2026-01-01"),
    endDate: new Date("2026-06-30"),
    workspaceId: workspace.id,
    createdById: user.id,
  },
});
```

```bash
npx prisma db seed
```

### ✅ Stap 1 Checklist
- [ ] 7 modellen: BusinessStrategy, Objective, KeyResult, FocusArea, Milestone, CampaignStrategy, CampaignObjective
- [ ] 8 enums: StrategyType, StrategyStatus, ObjectiveStatus, KeyResultStatus, MilestoneStatus, MetricType, Priority
- [ ] Campaign placeholder model (indien nodig)
- [ ] Cascade deletes: Strategy → Objectives → KeyResults
- [ ] Many-to-many: Strategy ↔ Campaign, Objective ↔ Campaign
- [ ] Migratie geslaagd
- [ ] Seed: 3 strategies, 7 objectives, 15 key results, 5 focus areas, 4 milestones

---

## STAP 2: TYPES + API

### Stap 2A — Types

**Bestand:** `src/types/business-strategy.ts`

```typescript
export type StrategyType = "GROWTH" | "MARKET_ENTRY" | "PRODUCT_LAUNCH" | "BRAND_BUILDING" | "OPERATIONAL_EXCELLENCE" | "CUSTOM";
export type StrategyStatus = "DRAFT" | "ACTIVE" | "COMPLETED" | "ARCHIVED";
export type ObjectiveStatus = "ON_TRACK" | "AT_RISK" | "BEHIND" | "COMPLETED";
export type KeyResultStatus = "ON_TRACK" | "COMPLETE" | "BEHIND";
export type MilestoneStatus = "DONE" | "UPCOMING" | "FUTURE";
export type MetricType = "PERCENTAGE" | "NUMBER" | "CURRENCY";
export type Priority = "HIGH" | "MEDIUM" | "LOW";

export interface BusinessStrategy {
  id: string;
  name: string;
  slug: string;
  description: string;
  type: StrategyType;
  status: StrategyStatus;
  vision: string | null;
  rationale: string | null;
  keyAssumptions: string[];
  startDate: string | null;
  endDate: string | null;
  progressPercentage: number;
  objectives: ObjectiveWithKeyResults[];
  focusAreas: FocusAreaDetail[];
  milestones: MilestoneItem[];
  linkedCampaigns: LinkedCampaignPreview[];
  createdAt: string;
  updatedAt: string;
}

export interface StrategyListItem {
  id: string;
  name: string;
  slug: string;
  description: string;
  type: StrategyType;
  status: StrategyStatus;
  progressPercentage: number;
  objectives: { total: number; onTrack: number; atRisk: number };
  focusAreas: string[];
  linkedCampaignCount: number;
  startDate: string | null;
  endDate: string | null;
  updatedAt: string;
}

export interface ObjectiveWithKeyResults {
  id: string;
  title: string;
  description: string | null;
  status: ObjectiveStatus;
  priority: Priority;
  sortOrder: number;
  metricType: MetricType;
  startValue: number;
  targetValue: number;
  currentValue: number;
  keyResults: KeyResultItem[];
  linkedCampaigns: { id: string; name: string }[];
  focusArea: { id: string; name: string } | null;
}

export interface KeyResultItem {
  id: string;
  description: string;
  status: KeyResultStatus;
  progressValue: string | null;
  sortOrder: number;
}

export interface FocusAreaDetail {
  id: string;
  name: string;
  description: string | null;
  icon: string | null;
  objectiveCount: number;
}

export interface MilestoneItem {
  id: string;
  title: string;
  description: string | null;
  date: string;
  quarter: string;
  status: MilestoneStatus;
}

export interface LinkedCampaignPreview {
  id: string;
  name: string;
  status: string;
  // Placeholder velden tot Campaign module klaar is
}

export interface StrategyListResponse {
  strategies: StrategyListItem[];
  stats: StrategySummaryStats;
}

export interface StrategySummaryStats {
  active: number;
  onTrack: number;
  atRisk: number;
  currentPeriod: string;
}

// API Bodies
export interface CreateStrategyBody {
  name: string;
  description: string;
  type?: StrategyType;
  startDate?: string;
  endDate?: string;
  vision?: string;
  focusAreas?: string[];
}

export interface CreateObjectiveBody {
  title: string;
  description?: string;
  focusAreaId?: string;
  priority?: Priority;
  metricType?: MetricType;
  startValue?: number;
  targetValue: number;
  keyResults?: string[];
  linkedCampaignIds?: string[];
}

export interface CreateMilestoneBody {
  title: string;
  description?: string;
  date: string;
  quarter: string;
}

// Constanten
export const STRATEGY_TYPE_CONFIG: Record<StrategyType, { icon: string; label: string }> = {
  GROWTH: { icon: "TrendingUp", label: "Growth" },
  MARKET_ENTRY: { icon: "Globe", label: "Market Entry" },
  PRODUCT_LAUNCH: { icon: "Rocket", label: "Product Launch" },
  BRAND_BUILDING: { icon: "Award", label: "Brand Building" },
  OPERATIONAL_EXCELLENCE: { icon: "Settings", label: "Operational Excellence" },
  CUSTOM: { icon: "Puzzle", label: "Custom" },
};

export const METRIC_TYPE_CONFIG: Record<MetricType, { label: string; prefix?: string; suffix?: string }> = {
  PERCENTAGE: { label: "Percentage", suffix: "%" },
  NUMBER: { label: "Number" },
  CURRENCY: { label: "Currency", prefix: "€" },
};
```

### Stap 2B — API Endpoints

**23 endpoints:**

```
src/app/api/strategies/
  route.ts                              → GET list + stats, POST create
  stats/route.ts                        → GET summary stats
  [id]/
    route.ts                            → GET detail, PATCH update, DELETE
    archive/route.ts                    → PATCH archive/restore
    context/route.ts                    → PATCH vision/rationale/assumptions
    recalculate/route.ts                → POST recalculate progress
    objectives/
      route.ts                          → GET list, POST create
      reorder/route.ts                  → PATCH reorder
      [objId]/
        route.ts                        → PATCH update, DELETE
        key-results/
          route.ts                      → POST create
          [krId]/route.ts               → PATCH update, DELETE
    milestones/
      route.ts                          → POST create
      [msId]/route.ts                   → PATCH update, DELETE
    focus-areas/route.ts                → POST create
    link-campaign/route.ts              → POST link
    unlink-campaign/[campId]/route.ts   → DELETE unlink
```

**Progress recalculation logica:**
```typescript
// POST /api/strategies/[id]/recalculate
// 1. Haal alle objectives op
// 2. Per objective: bereken progress als (currentValue - startValue) / (targetValue - startValue) * 100
// 3. Strategy progress = gemiddelde van alle objective progress percentages
// 4. Update strategy.progressPercentage
```

**Zod validatie:**
```typescript
const createStrategySchema = z.object({
  name: z.string().min(1).max(150),
  description: z.string().min(1).max(1000),
  type: z.enum(["GROWTH", "MARKET_ENTRY", "PRODUCT_LAUNCH", "BRAND_BUILDING", "OPERATIONAL_EXCELLENCE", "CUSTOM"]).optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  vision: z.string().max(2000).optional(),
  focusAreas: z.array(z.string().max(50)).max(10).optional(),
});

const createObjectiveSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(1000).optional(),
  focusAreaId: z.string().cuid().optional(),
  priority: z.enum(["HIGH", "MEDIUM", "LOW"]).optional(),
  metricType: z.enum(["PERCENTAGE", "NUMBER", "CURRENCY"]).optional(),
  startValue: z.number().optional(),
  targetValue: z.number(),
  keyResults: z.array(z.string().max(500)).max(10).optional(),
  linkedCampaignIds: z.array(z.string().cuid()).optional(),
});

const createMilestoneSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(1000).optional(),
  date: z.string().datetime(),
  quarter: z.string().max(20),
});
```

### Stap 2C — API Client + Hooks

**Bestand:** `src/lib/api/strategies.ts` + `src/lib/api/strategy-hooks.ts`

```typescript
const strategyKeys = {
  all:        ["strategies"],
  list:       () => ["strategies", "list"],
  stats:      () => ["strategies", "stats"],
  detail:     (id: string) => ["strategies", "detail", id],
  objectives: (id: string) => ["strategies", id, "objectives"],
  milestones: (id: string) => ["strategies", id, "milestones"],
};

// Hooks
useStrategies()                          // staleTime: 30s
useStrategyStats()                       // staleTime: 30s
useStrategyDetail(id)                    // staleTime: 15s
useCreateStrategy()                      // invalidate list + stats
useUpdateStrategy(id)                    // invalidate detail + list
useDeleteStrategy(id)                    // invalidate list + stats
useArchiveStrategy(id)                   // invalidate detail + list
useUpdateContext(id)                     // invalidate detail
useAddObjective(id)                      // invalidate detail
useUpdateObjective(id)                   // invalidate detail
useDeleteObjective(id)                   // invalidate detail
useReorderObjectives(id)                 // invalidate detail
useAddKeyResult(id, objId)               // invalidate detail
useUpdateKeyResult(id, objId)            // invalidate detail
useDeleteKeyResult(id, objId)            // invalidate detail
useAddMilestone(id)                      // invalidate detail
useUpdateMilestone(id)                   // invalidate detail
useDeleteMilestone(id)                   // invalidate detail
useAddFocusArea(id)                      // invalidate detail
useLinkCampaign(id)                      // invalidate detail
useUnlinkCampaign(id)                    // invalidate detail
useRecalculateProgress(id)               // invalidate detail + list
```

### ✅ Stap 2 Checklist
- [ ] Types: Strategy, Objective, KeyResult, FocusArea, Milestone
- [ ] Strategy type config (6 types met iconen)
- [ ] Metric type config (percentage, number, currency)
- [ ] 23 API endpoints
- [ ] Progress recalculation endpoint
- [ ] Zod validatie op create/update endpoints
- [ ] API client + 22 TanStack hooks

---

## STAP 3: ZUSTAND STORE

**Bestand:** `src/stores/useBusinessStrategyStore.ts`

```typescript
interface BusinessStrategyStore {
  strategies: StrategyListItem[];
  stats: StrategySummaryStats | null;
  selectedStrategy: BusinessStrategy | null;

  // Modal state
  isCreateModalOpen: boolean;
  isAddObjectiveModalOpen: boolean;
  isAddMilestoneModalOpen: boolean;

  // Actions
  setStrategies: (strategies: StrategyListItem[]) => void;
  setStats: (stats: StrategySummaryStats) => void;
  setSelectedStrategy: (strategy: BusinessStrategy | null) => void;
  setCreateModalOpen: (open: boolean) => void;
  setAddObjectiveModalOpen: (open: boolean) => void;
  setAddMilestoneModalOpen: (open: boolean) => void;
  reset: () => void;
}
```

### ✅ Stap 3 Checklist
- [ ] Store met strategy list, stats, selected strategy
- [ ] 3 modal toggles
- [ ] Reset functie

---

## STAP 4: UI — OVERVIEW (SCR-05)

### Componenten

```
src/components/business-strategy/
  BusinessStrategyPage.tsx       ← Hoofdpagina
  SummaryStats.tsx               ← 4 stat cards
  StrategyCard.tsx               ← Enkele strategy card
  CreateStrategyModal.tsx        ← Modal met 6 type cards + form
```

### Design Tokens

#### BusinessStrategyPage Header
```
Icon:           Target (Lucide) in bg-teal-50 circle
Title:          text-2xl font-bold text-gray-900 → "Business Strategy"
Subtitle:       text-sm text-gray-500
Add CTA:        bg-emerald-600 text-white px-4 py-2 rounded-lg → "+ Add Strategy"
```

#### SummaryStats (4 kolommen)
```
Grid:           grid grid-cols-4 gap-4
Card:           bg-white border border-gray-200 rounded-lg p-4
  Icon:         w-5 h-5 text-gray-400
  Value:        text-2xl font-bold text-gray-900
  Label:        text-sm text-gray-500
Items:
  BarChart3     → Active Strategies
  CheckCircle   → Objectives On Track
  AlertTriangle → At Risk Objectives
  Calendar      → Current Planning Period (e.g., "Q1 2026")
```

#### StrategyCard
```
Container:      bg-white border border-gray-200 rounded-lg p-5 hover:shadow-sm cursor-pointer
Header row:     flex items-center justify-between
  Type icon:    w-5 h-5 text-gray-400 (uit STRATEGY_TYPE_CONFIG)
  Title:        text-base font-semibold text-gray-900
  Status badge:
    ACTIVE:     bg-green-100 text-green-700 text-xs px-2 py-0.5 rounded-full
    DRAFT:      bg-gray-100 text-gray-500
    COMPLETED:  bg-blue-100 text-blue-700
    ARCHIVED:   bg-gray-100 text-gray-400
Description:    text-sm text-gray-600 mt-1 line-clamp-2
Progress bar:   mt-3 h-2 rounded-full bg-gray-200
  Multi-segment: groen (on track %) + geel (at risk %) + grijs (remaining)
  Label:        text-xs text-gray-500 mt-1 → "65% complete"
Stats row:      flex items-center gap-4 mt-3 text-xs text-gray-500
  "{X} objectives" | "{Y} on track" | "{Z} at risk"
Focus area tags: flex flex-wrap gap-1 mt-2
  Tag:          text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded
Date range:     text-xs text-gray-400 mt-2 → "Jan 2026 – Dec 2026"
```

#### CreateStrategyModal
```
Overlay:        fixed inset-0 bg-black/50 z-50
Container:      bg-white rounded-xl max-w-lg mx-auto mt-20 p-6
Title:          text-lg font-semibold → "Create New Strategy"

Type selector:  grid grid-cols-3 gap-3
  Card:         border border-gray-200 rounded-lg p-3 text-center cursor-pointer
  Selected:     border-emerald-500 ring-1 ring-emerald-500
  Icon:         w-6 h-6 mx-auto text-gray-400 (selected: text-emerald-600)
  Label:        text-xs text-gray-600 mt-1

Form:           space-y-4 mt-4
  Name:         text input
  Description:  textarea min-h-[80px]
  Start/End:    2 date pickers in flex row
  Vision:       textarea (optional)

Cancel btn:     border border-gray-300 px-4 py-2 rounded-lg
Create btn:     bg-emerald-600 text-white px-4 py-2 rounded-lg → "Create Strategy"
```

### ✅ Stap 4 Checklist
- [ ] 4 Summary Stats met iconen + waarden
- [ ] Strategy cards: type icon, status badge, multi-segment progress bar
- [ ] Objective stats per card (total, on track, at risk)
- [ ] Focus area tags op cards
- [ ] "+ Add Strategy" → modal met 6 type cards
- [ ] Klik card → navigeert naar detail

---

## STAP 5: UI — DETAIL (SCR-05a)

### Componenten

```
src/components/business-strategy/
  StrategyDetailPage.tsx          ← Hoofdpagina detail
  StrategyProgressSection.tsx     ← Multi-segment progress + 3 stats
  StrategicContextSection.tsx     ← Vision, Rationale, Key Assumptions (editable)
  ObjectiveCard.tsx               ← OKR card met key results
  KeyResultRow.tsx                ← Enkele key result rij
  AddObjectiveModal.tsx           ← Modal: objective + metrics + key results
  FocusAreaCards.tsx              ← Grid van focus area cards
  LinkedCampaignsSection.tsx      ← Campaign cards (placeholder data)
  MilestoneTimeline.tsx           ← Horizontale tijdlijn
  AddMilestoneModal.tsx           ← Modal: milestone toevoegen
```

### Design Tokens

#### StrategyDetailPage Header
```
Breadcrumb:     text-sm text-gray-500 → "← Back to Business Strategy"
Title:          text-2xl font-bold text-gray-900 → strategie naam
Type badge:     text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded → type label
Status badge:   (zelfde kleuren als overview)
```

#### StrategyProgressSection
```
Container:      bg-white border border-gray-200 rounded-lg p-5
Title:          text-sm font-semibold text-gray-900 → "Strategy Progress"
Progress bar:   h-3 rounded-full bg-gray-200 mt-2
  Green segment: bg-green-500 (on track %)
  Yellow segment: bg-amber-500 (at risk %)
  Remaining:     bg-gray-200
Label:          text-sm text-gray-600 mt-1 → "65% complete"
Stats row:      grid grid-cols-3 gap-4 mt-4
  Stat card:    text-center
    Value:      text-xl font-bold text-gray-900
    Label:      text-xs text-gray-500
  Items:        "Total Objectives" | "On Track" (groen) | "At Risk" (rood)
```

#### StrategicContextSection
```
Container:      bg-white border border-gray-200 rounded-lg p-5 mt-6
Title:          text-sm font-semibold text-gray-900 → "Strategic Context"
Edit toggle:    text-sm text-teal-600 hover:text-teal-700 → "Edit"

Sections (3):
  Section title: text-xs font-semibold text-gray-500 uppercase tracking-wide
  Content:       text-sm text-gray-700

  Vision:        "Strategic Vision"
  Rationale:     "Strategic Rationale"
  Key Assumptions: "Key Assumptions" → bulleted list

Edit mode:
  Textarea:     border border-gray-200 rounded-lg p-3 text-sm min-h-[80px]
  Assumptions:  textarea (line-separated)
  Save btn:     bg-emerald-600 text-white px-4 py-2 rounded-lg
  Cancel btn:   border border-gray-300 px-4 py-2 rounded-lg
```

#### ObjectiveCard
```
Container:      bg-white border border-gray-200 rounded-lg p-5 mt-4
Header:         flex items-center justify-between
  Title:        text-sm font-semibold text-gray-900
  Status badge:
    ON_TRACK:   bg-green-100 text-green-700 → "On Track" (CheckCircle icon)
    AT_RISK:    bg-red-100 text-red-700 → "At Risk" (AlertTriangle icon)
    BEHIND:     bg-amber-100 text-amber-700 → "Behind" (Clock icon)
    COMPLETED:  bg-blue-100 text-blue-700 → "Completed"
  Priority:     text-xs text-gray-400 → "HIGH" / "MEDIUM" / "LOW"
Description:    text-sm text-gray-600 mt-1

Metric bar:     mt-3
  Label:        text-xs text-gray-500 → "Progress: {current} / {target}"
  Bar:          h-2 rounded-full bg-gray-200 → fill: bg-emerald-500
  Values:       flex justify-between text-xs text-gray-400
    Start:      formatted start value
    Current:    formatted current value (font-medium)
    Target:     formatted target value

Key Results:    mt-4 border-t border-gray-100 pt-3
  Title:        text-xs font-semibold text-gray-500 → "Key Results"
  KR row:       flex items-center gap-2 py-1.5
    Status icon: ✅ (complete, green) / ⚪ (on_track, gray) / 🔴 (behind, red)
    Description: text-sm text-gray-700 flex-1
    Progress:   text-xs text-gray-500 → progressValue

Focus area:     text-xs text-gray-400 mt-2 → "Focus: {focusAreaName}"
Campaigns:      text-xs text-gray-400 → "Linked to: {campaignNames}"
```

#### FocusAreaCards
```
Container:      mt-6
Title:          text-sm font-semibold text-gray-900 → "Focus Areas"
Grid:           grid grid-cols-2 md:grid-cols-5 gap-3 mt-3
Card:           bg-white border border-gray-200 rounded-lg p-4 text-center
  Icon:         w-6 h-6 mx-auto text-gray-400
  Name:         text-sm font-medium text-gray-900 mt-2
  Count:        text-xs text-gray-500 → "{X} objectives"
```

#### LinkedCampaignsSection
```
Container:      mt-6
Title:          text-sm font-semibold text-gray-900 → "Linked Campaigns"
Empty state:    text-sm text-gray-400 italic → "No campaigns linked yet"
Card:           bg-white border border-gray-200 rounded-lg p-4
  Name:         text-sm font-medium text-gray-900
  Status:       badge (zelfde stijl als strategy status)
  "View →":     text-sm text-teal-600 hover:text-teal-700
NOTE:           Campaign data is placeholder tot Fase 10 klaar is
```

#### MilestoneTimeline
```
Container:      mt-6 overflow-x-auto
Title:          text-sm font-semibold text-gray-900 → "Milestones"
"+ Add":        text-sm text-teal-600 → opens AddMilestoneModal

Timeline:       relative flex items-center gap-0 min-w-max py-8
  Line:         absolute h-0.5 bg-gray-200 top-1/2 left-0 right-0
  Quarter label: text-xs text-gray-400 absolute top-0
  Milestone dot:
    DONE:       w-4 h-4 rounded-full bg-blue-500 relative z-10
    UPCOMING:   w-4 h-4 rounded-full bg-amber-400 relative z-10
    FUTURE:     w-4 h-4 rounded-full bg-gray-300 relative z-10
  Tooltip/label: text-xs text-gray-600 absolute bottom-0 whitespace-nowrap
                 → milestone title
```

#### AddObjectiveModal
```
Title:          "Add Objective"
Form:
  Title:        text input
  Description:  textarea (optional)
  Focus Area:   select dropdown (bestaande focus areas)
  Priority:     select → High / Medium / Low
  Metric Type:  select → Percentage / Number / Currency
  Start Value:  number input
  Target Value: number input
  Key Results:  repeater
    Input:      text input + delete X
    "+ Add Key Result": link
Cancel/Create buttons
```

#### AddMilestoneModal
```
Title:          "Add Milestone"
Form:
  Title:        text input
  Description:  textarea (optional)
  Date:         date picker
  Quarter:      auto-calculated from date (e.g., "Q2 2026")
Cancel/Create buttons
```

### ✅ Stap 5 Checklist
- [ ] Breadcrumb + title + type badge + status badge
- [ ] Progress section: multi-segment bar + 3 stats
- [ ] Strategic Context: Vision, Rationale, Key Assumptions — inline edit
- [ ] Objective cards: status badge, priority, metric bar, key results
- [ ] Key results: ✅/⚪/🔴 status icons + progress value
- [ ] Focus areas: 5-card grid met iconen + objective count
- [ ] Linked campaigns: placeholder section
- [ ] Milestone timeline: horizontaal, Q labels, colored dots
- [ ] Add Objective modal: metrics + key results repeater
- [ ] Add Milestone modal: auto quarter from date

---

## STAP 6: ROUTES + INTEGRATIE

### Routes

```bash
src/app/knowledge/business-strategy/page.tsx           ← Overview
src/app/knowledge/business-strategy/[id]/page.tsx      ← Detail
```

### Sidebar Navigatie

Voeg toe aan sidebar onder "Knowledge":
```
Knowledge
  ├── Brand Foundation     (Fase 1A)
  ├── Business Strategy    (Fase 2)  ← NIEUW
  └── ...
```

### Cross-Module

- Strategy cards klikken → detail pagina
- Campaign links → placeholder (tot Fase 10)
- Dashboard stats → consumeert strategy summary stats
- Progress recalculation na objective/KR updates

### ✅ Stap 6 Checklist
- [ ] 2 routes (overview + detail)
- [ ] Sidebar link "Business Strategy" onder Knowledge
- [ ] Navigatie: overview ↔ detail
- [ ] Campaign links als placeholder

---

## VOLLEDIGE ACCEPTATIECRITERIA

### Overview (SCR-05)
- [ ] 4 Summary Stats: Active, On Track, At Risk, Planning Period
- [ ] Strategy cards met type icon, status badge, multi-segment progress bar
- [ ] Objective counts per card (total, on track, at risk)
- [ ] Focus area tags
- [ ] "+ Add Strategy" → modal met 6 type cards

### Detail (SCR-05a)
- [ ] Progress: multi-segment bar (groen/geel/grijs) + 3 stats
- [ ] Strategic Context: Vision, Rationale, Key Assumptions — editable
- [ ] OKR Objectives: status, priority, metric bar, key results
- [ ] Key Results: ✅/⚪/🔴 icons + progress value
- [ ] Focus Areas: 5-card grid
- [ ] Linked Campaigns: placeholder section
- [ ] Milestones: horizontale tijdlijn met Q labels + dots
- [ ] Add Objective + Add Milestone modals

### Technisch
- [ ] 0 TypeScript errors, 0 ESLint errors
- [ ] Cascade deletes correct
- [ ] Progress recalculation werkt
- [ ] Zod validatie op alle endpoints
- [ ] 23 API endpoints functioneel

---

## VOLGENDE STAPPEN NA FASE 2

```
1. ✅ AppShell + Dashboard (Fase 11)
2. ✅ Brand Foundation Overview (Fase 1A)
3. ✅ AI Brand Analysis (Fase 1B)
4. ✅ Brand Asset Detail (Fase 1C)
5. ✅ Canvas Workshop (Fase 1D)
6. ✅ Interviews (Fase 1E)
7. ✅ Business Strategy (Fase 2)             ← DIT PLAN
8.    Brand Style (Fase 3)
```

---

*Einde implementatieplan — 13 februari 2026*
*~700 regels, 6 stappen, Business Strategy met OKR objectives, milestone timeline*
