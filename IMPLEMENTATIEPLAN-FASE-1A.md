# BRANDDOCK — Implementatieplan Fase 1A
## Brand Foundation Overview
**Datum:** 13 februari 2026
**Doel:** Eerste echte module — overzichtspagina met 13 brand assets in grid
**Vereist:** Fase 11 (AppShell + Dashboard) compleet ✅
**Geschatte duur:** 1 sessie

---

## HOE DIT PLAN TE GEBRUIKEN

```bash
# In Claude Code:
> Lees IMPLEMENTATIEPLAN-FASE-1A.md en voer Stap 1 uit.
```

---

## STAP 1: DATABASE UITBREIDEN

### Stap 1A — Prisma Schema Uitbreiden

**Toevoegen aan `prisma/schema.prisma`:**
```prisma
// === FASE 1A: BRAND ASSETS ===

model BrandAsset {
  id                     String        @id @default(cuid())
  name                   String
  slug                   String        @unique
  description            String
  category               AssetCategory
  status                 AssetStatus   @default(DRAFT)
  coveragePercentage     Float         @default(0)
  validatedCount         Int           @default(0)
  artifactCount          Int           @default(0)
  content                Json?

  // Validation methods tracking
  aiValidated            Boolean       @default(false)
  workshopValidated      Boolean       @default(false)
  interviewValidated     Boolean       @default(false)
  questionnaireValidated Boolean       @default(false)

  // Relations
  workspaceId            String
  workspace              Workspace     @relation(fields: [workspaceId], references: [id])

  createdAt              DateTime      @default(now())
  updatedAt              DateTime      @updatedAt

  @@index([workspaceId])
  @@index([category])
  @@index([status])
}

enum AssetCategory {
  PURPOSE
  COMMUNICATION
  STRATEGY
  NARRATIVE
  CORE
  PERSONALITY
  FOUNDATION
  CULTURE
}

enum AssetStatus {
  DRAFT
  IN_PROGRESS
  NEEDS_ATTENTION
  READY
}
```

**Vergeet niet:** Voeg `brandAssets BrandAsset[]` toe aan het bestaande `Workspace` model.

### Stap 1B — Migratie

```bash
npx prisma migrate dev --name add-brand-assets
```

### Stap 1C — Seed Data Uitbreiden

**Toevoegen aan `prisma/seed.ts`:** 13 default brand assets met gevarieerde statussen.

```typescript
const DEFAULT_BRAND_ASSETS = [
  // PURPOSE
  { name: "Social Relevancy",     slug: "social-relevancy",     category: "PURPOSE",       description: "How your brand contributes to society",     status: "DRAFT",           coverage: 0,   ai: false, workshop: false, interview: false, questionnaire: false },

  // COMMUNICATION
  { name: "Brand Tone & Voice",   slug: "brand-tone-voice",     category: "COMMUNICATION", description: "Consistent voice and tone guidelines",      status: "IN_PROGRESS",     coverage: 35,  ai: true,  workshop: false, interview: false, questionnaire: false },

  // STRATEGY (5 assets)
  { name: "Brand Promise",        slug: "brand-promise",        category: "STRATEGY",      description: "Core commitment to your customers",         status: "NEEDS_ATTENTION", coverage: 45,  ai: true,  workshop: false, interview: false, questionnaire: false },
  { name: "Vision Statement",     slug: "vision-statement",     category: "STRATEGY",      description: "Forward-looking declaration of intent",      status: "READY",           coverage: 92,  ai: true,  workshop: true,  interview: true,  questionnaire: false },
  { name: "Mission Statement",    slug: "mission-statement",    category: "STRATEGY",      description: "What you do, how, and for whom",             status: "NEEDS_ATTENTION", coverage: 60,  ai: true,  workshop: true,  interview: false, questionnaire: false },
  { name: "Transformative Goals", slug: "transformative-goals", category: "STRATEGY",      description: "Ambitious goals for lasting impact",         status: "DRAFT",           coverage: 0,   ai: false, workshop: false, interview: false, questionnaire: false },
  { name: "Brand Positioning",    slug: "brand-positioning",    category: "STRATEGY",      description: "Market position vs competitors",              status: "IN_PROGRESS",     coverage: 25,  ai: true,  workshop: false, interview: false, questionnaire: false },

  // NARRATIVE
  { name: "Brand Story",          slug: "brand-story",          category: "NARRATIVE",     description: "Your brand's past, present and future",      status: "IN_PROGRESS",     coverage: 50,  ai: true,  workshop: true,  interview: false, questionnaire: false },

  // CORE
  { name: "Brand Essence",        slug: "brand-essence",        category: "CORE",          description: "The heart and soul of your brand",           status: "DRAFT",           coverage: 0,   ai: false, workshop: false, interview: false, questionnaire: false },

  // PERSONALITY (2 assets)
  { name: "Brand Personality",    slug: "brand-personality",    category: "PERSONALITY",   description: "Human characteristics of your brand",        status: "IN_PROGRESS",     coverage: 40,  ai: true,  workshop: false, interview: false, questionnaire: false },
  { name: "Brand Archetype",      slug: "brand-archetype",      category: "PERSONALITY",   description: "Universal behavior patterns",                 status: "READY",           coverage: 85,  ai: true,  workshop: true,  interview: true,  questionnaire: true },

  // FOUNDATION
  { name: "Golden Circle",        slug: "golden-circle",        category: "FOUNDATION",    description: "Simon Sinek's WHY → HOW → WHAT framework",  status: "IN_PROGRESS",     coverage: 55,  ai: true,  workshop: true,  interview: false, questionnaire: false },

  // CULTURE
  { name: "Core Values",          slug: "core-values",          category: "CULTURE",       description: "Fundamental beliefs that guide your brand",   status: "NEEDS_ATTENTION", coverage: 70,  ai: true,  workshop: true,  interview: true,  questionnaire: false },
];

// In de main() functie:
for (const asset of DEFAULT_BRAND_ASSETS) {
  const validatedCount = [asset.ai, asset.workshop, asset.interview, asset.questionnaire].filter(Boolean).length;
  await prisma.brandAsset.create({
    data: {
      name: asset.name,
      slug: asset.slug,
      category: asset.category as any,
      description: asset.description,
      status: asset.status as any,
      coveragePercentage: asset.coverage,
      validatedCount,
      aiValidated: asset.ai,
      workshopValidated: asset.workshop,
      interviewValidated: asset.interview,
      questionnaireValidated: asset.questionnaire,
      workspaceId: workspace.id,
    },
  });
}
```

```bash
npx prisma db seed
```

### ✅ Stap 1 Checklist
- [ ] `BrandAsset` model + enums in Prisma schema
- [ ] `Workspace` model heeft `brandAssets` relatie
- [ ] Migratie geslaagd
- [ ] 13 brand assets in database met gevarieerde statussen

---

## STAP 2: TYPES + API ENDPOINTS

### Stap 2A — Types

**Bestand:** `src/types/brand-asset.ts`
```typescript
export type AssetCategory =
  | "PURPOSE" | "COMMUNICATION" | "STRATEGY" | "NARRATIVE"
  | "CORE" | "PERSONALITY" | "FOUNDATION" | "CULTURE";

export type AssetStatus = "DRAFT" | "IN_PROGRESS" | "NEEDS_ATTENTION" | "READY";

export interface BrandAssetWithMeta {
  id: string;
  name: string;
  slug: string;
  description: string;
  category: AssetCategory;
  status: AssetStatus;
  coveragePercentage: number;
  validatedCount: number;
  artifactCount: number;
  validationMethods: {
    ai: boolean;
    workshop: boolean;
    interview: boolean;
    questionnaire: boolean;
  };
  updatedAt: string;
}

export interface BrandAssetListParams {
  category?: AssetCategory;
  search?: string;
  status?: AssetStatus;
  sortBy?: "name" | "updatedAt" | "coveragePercentage";
  sortOrder?: "asc" | "desc";
}

export interface BrandAssetListResponse {
  assets: BrandAssetWithMeta[];
  stats: SummaryStats;
}

export interface SummaryStats {
  ready: number;
  needValidation: number;
  total: number;
}

export interface CreateBrandAssetBody {
  name: string;
  category: AssetCategory;
  description?: string;
}

// UI mapping: DB category enum → UI groep labels
export const CATEGORY_MAP: Record<string, AssetCategory[]> = {
  "All Categories": [],
  "Purpose":        ["PURPOSE"],
  "Communication":  ["COMMUNICATION"],
  "Strategy":       ["STRATEGY"],
  "Narrative":      ["NARRATIVE"],
  "Core":           ["CORE"],
  "Personality":    ["PERSONALITY"],
  "Foundation":     ["FOUNDATION"],
  "Culture":        ["CULTURE"],
};
```

### Stap 2B — API Endpoints

**Bestanden aanmaken:**

| # | Bestand | Route | Methode | Beschrijving |
|---|---------|-------|---------|-------------|
| 1 | `src/app/api/brand-assets/route.ts` | `/api/brand-assets` | GET + POST | Lijst (met filters) + Aanmaken |
| 2 | `src/app/api/brand-assets/[id]/route.ts` | `/api/brand-assets/:id` | GET + PATCH + DELETE | Detail, Update, Verwijder |
| 3 | `src/app/api/brand-assets/[id]/duplicate/route.ts` | `/api/brand-assets/:id/duplicate` | POST | Dupliceer asset |
| 4 | `src/app/api/brand-assets/stats/route.ts` | `/api/brand-assets/stats` | GET | Summary stats |

**Zod Validatie:**
```typescript
import { z } from "zod";

// GET /api/brand-assets query
const listQuerySchema = z.object({
  category: z.enum(["PURPOSE", "COMMUNICATION", "STRATEGY", "NARRATIVE", "CORE", "PERSONALITY", "FOUNDATION", "CULTURE"]).optional(),
  search: z.string().max(200).optional(),
  status: z.enum(["DRAFT", "IN_PROGRESS", "NEEDS_ATTENTION", "READY"]).optional(),
  sortBy: z.enum(["name", "updatedAt", "coveragePercentage"]).optional().default("name"),
  sortOrder: z.enum(["asc", "desc"]).optional().default("asc"),
});

// POST /api/brand-assets body
const createSchema = z.object({
  name: z.string().min(1).max(100),
  category: z.enum(["PURPOSE", "COMMUNICATION", "STRATEGY", "NARRATIVE", "CORE", "PERSONALITY", "FOUNDATION", "CULTURE"]),
  description: z.string().max(500).optional(),
});
```

**API Response format (GET list):**
```typescript
// Transformeer Prisma → BrandAssetWithMeta
function toAssetWithMeta(asset: PrismaBrandAsset): BrandAssetWithMeta {
  return {
    id: asset.id,
    name: asset.name,
    slug: asset.slug,
    description: asset.description,
    category: asset.category,
    status: asset.status,
    coveragePercentage: asset.coveragePercentage,
    validatedCount: asset.validatedCount,
    artifactCount: asset.artifactCount,
    validationMethods: {
      ai: asset.aiValidated,
      workshop: asset.workshopValidated,
      interview: asset.interviewValidated,
      questionnaire: asset.questionnaireValidated,
    },
    updatedAt: asset.updatedAt.toISOString(),
  };
}
```

### Stap 2C — API Client

**Bestand:** `src/lib/api/brand-assets.ts`
```typescript
import type { BrandAssetListParams, BrandAssetListResponse, BrandAssetWithMeta, CreateBrandAssetBody, SummaryStats } from "@/types/brand-asset";

const BASE = "/api/brand-assets";

export async function fetchBrandAssets(params?: BrandAssetListParams): Promise<BrandAssetListResponse> {
  const searchParams = new URLSearchParams();
  if (params?.category) searchParams.set("category", params.category);
  if (params?.search) searchParams.set("search", params.search);
  if (params?.status) searchParams.set("status", params.status);
  if (params?.sortBy) searchParams.set("sortBy", params.sortBy);
  if (params?.sortOrder) searchParams.set("sortOrder", params.sortOrder);
  const res = await fetch(`${BASE}?${searchParams}`);
  if (!res.ok) throw new Error("Failed to fetch brand assets");
  return res.json();
}

export async function fetchBrandAssetStats(): Promise<SummaryStats> {
  const res = await fetch(`${BASE}/stats`);
  if (!res.ok) throw new Error("Failed to fetch stats");
  return res.json();
}

export async function createBrandAsset(body: CreateBrandAssetBody): Promise<BrandAssetWithMeta> {
  const res = await fetch(BASE, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  if (!res.ok) throw new Error("Failed to create asset");
  return res.json();
}

export async function duplicateBrandAsset(id: string): Promise<BrandAssetWithMeta> {
  const res = await fetch(`${BASE}/${id}/duplicate`, { method: "POST" });
  if (!res.ok) throw new Error("Failed to duplicate asset");
  return res.json();
}

export async function deleteBrandAsset(id: string): Promise<void> {
  const res = await fetch(`${BASE}/${id}`, { method: "DELETE" });
  if (!res.ok) throw new Error("Failed to delete asset");
}
```

### ✅ Stap 2 Checklist
- [ ] Types in `src/types/brand-asset.ts`
- [ ] 4 API route bestanden aangemaakt
- [ ] GET `/api/brand-assets` retourneert 13 assets + stats
- [ ] GET `/api/brand-assets/stats` retourneert `{ ready, needValidation, total }`
- [ ] POST `/api/brand-assets` maakt nieuwe asset aan
- [ ] POST `/api/brand-assets/:id/duplicate` dupliceert asset
- [ ] DELETE `/api/brand-assets/:id` verwijdert asset
- [ ] API client functies beschikbaar

---

## STAP 3: STORE + TANSTACK QUERY HOOKS

### Stap 3A — Zustand Store

**Bestand:** `src/stores/useBrandAssetStore.ts`
```typescript
import { create } from "zustand";
import type { AssetCategory, AssetStatus } from "@/types/brand-asset";

interface BrandAssetStore {
  searchQuery: string;
  categoryFilter: AssetCategory | null;
  statusFilter: AssetStatus | null;
  isCreateModalOpen: boolean;

  setSearchQuery: (query: string) => void;
  setCategoryFilter: (category: AssetCategory | null) => void;
  setStatusFilter: (status: AssetStatus | null) => void;
  setCreateModalOpen: (open: boolean) => void;
}

export const useBrandAssetStore = create<BrandAssetStore>((set) => ({
  searchQuery: "",
  categoryFilter: null,
  statusFilter: null,
  isCreateModalOpen: false,

  setSearchQuery: (query) => set({ searchQuery: query }),
  setCategoryFilter: (category) => set({ categoryFilter: category }),
  setStatusFilter: (status) => set({ statusFilter: status }),
  setCreateModalOpen: (open) => set({ isCreateModalOpen: open }),
}));
```

### Stap 3B — TanStack Query Hooks

**Bestand:** `src/lib/api/brand-asset-hooks.ts`
```typescript
"use client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchBrandAssets, fetchBrandAssetStats, createBrandAsset, duplicateBrandAsset, deleteBrandAsset } from "./brand-assets";
import type { BrandAssetListParams, CreateBrandAssetBody } from "@/types/brand-asset";

export const brandAssetKeys = {
  all:    ["brand-assets"] as const,
  list:   (filters: BrandAssetListParams) => ["brand-assets", "list", filters] as const,
  stats:  () => ["brand-assets", "stats"] as const,
  detail: (id: string) => ["brand-assets", "detail", id] as const,
};

export function useBrandAssets(filters: BrandAssetListParams = {}) {
  return useQuery({
    queryKey: brandAssetKeys.list(filters),
    queryFn: () => fetchBrandAssets(filters),
  });
}

export function useBrandAssetStats() {
  return useQuery({
    queryKey: brandAssetKeys.stats(),
    queryFn: fetchBrandAssetStats,
  });
}

export function useCreateBrandAsset() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateBrandAssetBody) => createBrandAsset(body),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: brandAssetKeys.all }),
  });
}

export function useDuplicateBrandAsset() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => duplicateBrandAsset(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: brandAssetKeys.all }),
  });
}

export function useDeleteBrandAsset() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteBrandAsset(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: brandAssetKeys.all }),
  });
}
```

### ✅ Stap 3 Checklist
- [ ] Zustand store met search/filter/modal state
- [ ] TanStack Query hooks voor list, stats, create, duplicate, delete
- [ ] Cache invalidatie na mutaties

---

## STAP 4: UI COMPONENTEN

### Stap 4A — Mappenstructuur

```bash
mkdir -p src/components/brand-foundation
```

### Stap 4B — Componenten Bouwen (in volgorde)

| # | Component | Beschrijving |
|---|-----------|-------------|
| 1 | `AssetStatusBadge.tsx` | Status badge met kleuren per type |
| 2 | `CoverageIndicator.tsx` | Circulaire of lineaire % indicator |
| 3 | `ValidationMethodIcons.tsx` | 4 iconen: AI, Workshop, Interview, Questionnaire |
| 4 | `BrandAssetCard.tsx` | Volledige asset card |
| 5 | `SummaryStats.tsx` | 3 stat cards bovenaan |
| 6 | `SearchFilterBar.tsx` | Zoekbalk + Category dropdown |
| 7 | `BrandAssetGrid.tsx` | Grid container met cards |
| 8 | `CreateBrandAssetModal.tsx` | Modal voor nieuw asset |
| 9 | `BrandFoundationPage.tsx` | Hoofdpagina die alles combineert |

### Design Tokens per Component

#### AssetStatusBadge
```
Badge base:       rounded-full px-2 py-0.5 text-xs font-medium inline-flex items-center gap-1
Dot:              w-1.5 h-1.5 rounded-full

READY:            bg-green-100  text-green-700  dot: bg-green-500
NEEDS_ATTENTION:  bg-amber-100  text-amber-700  dot: bg-amber-500
IN_PROGRESS:      bg-blue-100   text-blue-700   dot: bg-blue-500
DRAFT:            bg-gray-100   text-gray-500   dot: bg-gray-400

Labels:           "Ready" | "Needs Attention" | "In Progress" | "Draft"
```

#### CoverageIndicator
```
Container:  relative w-12 h-12 (circulaire variant)
Circle SVG: stroke-width 3, track: stroke-gray-200, fill: stroke varies by %
Center:     text-xs font-bold

Kleuren per percentage:
  0%:       text-red-500     stroke-red-500
  1-49%:    text-orange-500  stroke-orange-500
  50-74%:   text-yellow-500  stroke-yellow-500
  75-99%:   text-green-400   stroke-green-400
  100%:     text-green-500   stroke-green-500 + CheckCircle icoon
```

#### ValidationMethodIcons
```
Container:  flex items-center gap-1.5
Icon:       w-4 h-4
Active:     text-teal-500
Inactive:   text-gray-300

4 iconen:
  AI:             Sparkles
  Workshop:       Users
  Interview:      MessageSquare
  Questionnaire:  ClipboardList

Tooltip:    icon title attribuut met methode naam
```

#### BrandAssetCard
```
Container:    bg-white rounded-xl border border-gray-100 shadow-sm p-4 hover:shadow-md transition-shadow cursor-pointer
Grid:         grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4

Layout per card:
  ┌──────────────────────────────┐
  │ [CoverageCircle]  [StatusBadge] │
  │                                  │
  │ Asset Name                       │  text-base font-semibold text-gray-900
  │ Description text...              │  text-sm text-gray-600 line-clamp-2
  │                                  │
  │ [Category badge]                 │  text-xs bg-gray-100 text-gray-600 rounded px-1.5 py-0.5
  │                                  │
  │ [AI] [WS] [IV] [QS]  x/4       │  ValidationMethodIcons + validatedCount
  │ Updated 2 days ago               │  text-xs text-gray-400
  └──────────────────────────────┘
```

#### SummaryStats
```
Container:  grid grid-cols-3 gap-4 mb-6
Card:       bg-white rounded-xl border border-gray-100 shadow-sm p-5

Ready card:
  Number:   text-3xl font-bold text-green-600
  Label:    text-sm text-gray-500 → "Ready to Use"

Need Validation card:
  Number:   text-3xl font-bold text-amber-500
  Label:    text-sm text-gray-500 → "Need Validation"

Total card:
  Number:   text-3xl font-bold text-gray-900
  Label:    text-sm text-gray-500 → "Total Assets"
```

#### SearchFilterBar
```
Container:    flex items-center gap-3 mb-6
Search input: flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-teal-500 placeholder-gray-400
              Placeholder: "Search brand assets..."
              Debounce: 300ms
Dropdown:     border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white
              Options: All Categories + 8 categorie namen
```

#### BrandFoundationPage Layout
```
Container:  p-6 max-w-7xl mx-auto

┌─────────────────────────────────────────────────┐
│ Page Header                                       │
│ "Your Brand"              [+ Add Brand Asset]     │  text-3xl font-bold + green CTA
│ "Define and validate..."                          │  text-base text-gray-500
├─────────────────────────────────────────────────┤
│ [1 Ready] [12 Need Validation] [13 Total]         │  SummaryStats
├─────────────────────────────────────────────────┤
│ [Search...                ] [All Categories ▾]    │  SearchFilterBar
├─────────────────────────────────────────────────┤
│ [Card] [Card] [Card] [Card]                       │  BrandAssetGrid
│ [Card] [Card] [Card] [Card]                       │  (responsive grid)
│ [Card] [Card] [Card] [Card]                       │
│ [Card]                                            │
└─────────────────────────────────────────────────┘
```

### Stap 4C — Route Aanmaken

**Bestand:** `src/app/(brand)/foundation/page.tsx`
```tsx
import { BrandFoundationPage } from "@/components/brand-foundation/BrandFoundationPage";

export default function Page() {
  return <BrandFoundationPage />;
}
```

**Noot:** De route is `/foundation` binnen een `(brand)` route group. Dit matcht met de sidebar link `/knowledge/brand-foundation`. Pas de sidebar config aan als nodig:
- Optie A: Route group `(knowledge)` → `/knowledge/brand-foundation/page.tsx`
- Optie B: Pas sidebar href aan naar `/foundation`

**Aanbeveling:** Gebruik `src/app/knowledge/brand-foundation/page.tsx` zodat het matcht met de sidebar config uit Fase 11.

### ✅ Stap 4 Checklist
- [ ] 9 componenten gebouwd in `src/components/brand-foundation/`
- [ ] Route `/knowledge/brand-foundation` rendert BrandFoundationPage
- [ ] Sidebar item "Brand Foundation" heeft active state op deze route
- [ ] 13 asset cards zichtbaar in responsive grid
- [ ] Summary stats: correcte counts (2 Ready, 4 Needs Attention, 13 Total — op basis van seed data)
- [ ] Zoekbalk filtert op naam + beschrijving (debounced)
- [ ] Category dropdown filtert op 8 categorieën
- [ ] Coverage % cirkel met correcte kleuren per drempel
- [ ] Status badges met juiste kleuren per type
- [ ] 4 validation method iconen per card (teal actief, grijs inactief)
- [ ] Klik op card navigeert naar `/knowledge/brand-foundation/[slug]` (404 is ok, Fase 1C bouwt dit)
- [ ] "+ Add Brand Asset" opent CreateBrandAssetModal
- [ ] Cards hover effect: shadow-sm → shadow-md

---

## VOLLEDIGE ACCEPTATIECRITERIA

### Functioneel
- [ ] Pagina toont alle 13 brand assets in responsive grid (4 kolommen desktop, 2 tablet, 1 mobiel)
- [ ] Summary stats tonen correct: Ready (coverage >= 80%), Need Validation (coverage < 80%), Total
- [ ] Zoekbalk filtert op naam en beschrijving (debounced, 300ms)
- [ ] Category dropdown filtert op 8 categorieën + "All Categories"
- [ ] Asset card toont: coverage %, naam, beschrijving, categorie badge, validated x/4, 4 method iconen, last updated
- [ ] Coverage % kleur: 0% rood → 1-49% oranje → 50-74% geel → 75-99% lichtgroen → 100% groen
- [ ] Klik op card navigeert naar asset detail route
- [ ] "+ Add Brand Asset" opent modal
- [ ] Nieuw asset verschijnt direct in grid na aanmaken (TanStack Query invalidatie)

### Visueel
- [ ] Geen emoji's — alle iconen via Lucide React
- [ ] Cards: `bg-white rounded-xl border border-gray-100 shadow-sm`, hover: `shadow-md`
- [ ] Page header: "Your Brand" + subtitel + groene CTA
- [ ] Stat cards: grote nummers (text-3xl font-bold) met juiste kleuren
- [ ] Validation iconen: teal-500 actief, gray-300 inactief
- [ ] Past visueel binnen de AppShell uit Fase 11

### Technisch
- [ ] API endpoints met Zod validatie
- [ ] Zustand store voor UI state (search, filter, modal)
- [ ] TanStack Query voor data fetching + cache invalidatie
- [ ] Prisma model met indexen op workspaceId, category, status
- [ ] TypeScript strict — geen `any` types
- [ ] 0 ESLint errors

---

## VOLGENDE STAPPEN NA FASE 1A

Na Fase 1A volgt het pad uit de handover:

```
1. ✅ AppShell + Dashboard (Fase 11)
2. ✅ Brand Foundation Overview (Fase 1A)      ← DIT PLAN
3.    AI Brand Analysis (Fase 1B)
4.    Brand Asset Detail (Fase 1C)
5.    Canvas Workshop (Fase 1D)
6.    Golden Circle (Fase 1E)
7.    Business Strategy + Brandstyle (Fase 2-3)
```

De Implementation Guides voor Fase 1B-1E staan in Notion:
- Fase 1B: AI Brand Analysis
- Fase 1C: Brand Asset Detail
- Fase 1D: Canvas Workshop
- Fase 1E: Golden Circle

---

*Einde implementatieplan — 13 februari 2026*
*~400 regels, 4 stappen, Brand Foundation Overview*
