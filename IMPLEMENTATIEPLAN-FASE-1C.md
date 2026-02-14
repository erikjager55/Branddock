# BRANDDOCK — Implementatieplan Fase 1C
## Brand Asset Detail — Inline Editing, Frameworks, Research Methods, Versie Historie
**Datum:** 13 februari 2026
**Doel:** Detail pagina per brand asset met content editing, framework rendering, research method cards en versie historie
**Vereist:** Fase 11 ✅ + Fase 1A ✅ + Fase 1B ✅
**Geschatte duur:** 2 sessies

---

## HOE DIT PLAN TE GEBRUIKEN

```bash
# In Claude Code:
> Lees IMPLEMENTATIEPLAN-FASE-1C.md en voer Stap 1 uit.
```

---

## OVERZICHT

De Brand Asset Detail pagina is het **hub-punt** van de Brand Foundation module. Vanuit hier:
- Bekijk en bewerk asset content (inline editing)
- Bekijk framework-specifieke secties (ESG, Golden Circle, SWOT)
- Start research methods (AI Analysis, Workshop, Interviews, Questionnaire)
- Bekijk versie historie

```
Brand Foundation Overview (Fase 1A) → klik op asset card
  → Asset Detail (deze fase)
    ├── Edit Content (inline) + Save → nieuwe versie
    ├── Regenerate with AI (mock preview)
    ├── Framework Section (inklapbaar, per asset type)
    └── Research Methods Section (4 cards)
        ├── AI Exploration → Fase 1B (al gebouwd)
        ├── Workshop → placeholder (Fase 1D)
        ├── Interviews → placeholder
        └── Questionnaire → placeholder
```

**Route:** `/knowledge/brand-foundation/[slug]`

---

## STAP 1: DATABASE UITBREIDEN

### Stap 1A — Prisma Schema Uitbreidingen

**BrandAsset model uitbreiden** (velden toevoegen aan bestaand model):
```prisma
// Toevoegen aan bestaand model BrandAsset:
  frameworkType     String?           // 'ESG' | 'GOLDEN_CIRCLE' | 'SWOT'
  frameworkData     Json?
  isLocked          Boolean           @default(false)
  lockedById        String?
  lockedBy          User?             @relation("LockedAssets", fields: [lockedById], references: [id])
  lockedAt          DateTime?
  versions          BrandAssetVersion[]
  researchMethods   BrandAssetResearchMethod[]
```

**Nieuwe modellen:**
```prisma
model BrandAssetVersion {
  id            String      @id @default(cuid())
  version       Int
  content       String?     @db.Text
  frameworkData Json?
  changeNote    String?
  changedById   String
  changedBy     User        @relation(fields: [changedById], references: [id])
  brandAssetId  String
  brandAsset    BrandAsset  @relation(fields: [brandAssetId], references: [id], onDelete: Cascade)
  createdAt     DateTime    @default(now())

  @@index([brandAssetId])
  @@unique([brandAssetId, version])
}

model BrandAssetResearchMethod {
  id             String                @id @default(cuid())
  method         ResearchMethodType
  status         ResearchMethodStatus  @default(AVAILABLE)
  progress       Float                 @default(0)
  completedAt    DateTime?
  artifactsCount Int                   @default(0)
  brandAssetId   String
  brandAsset     BrandAsset            @relation(fields: [brandAssetId], references: [id], onDelete: Cascade)

  @@unique([brandAssetId, method])
  @@index([brandAssetId])
}

enum ResearchMethodType {
  AI_EXPLORATION
  WORKSHOP
  INTERVIEWS
  QUESTIONNAIRE
}

enum ResearchMethodStatus {
  AVAILABLE
  IN_PROGRESS
  COMPLETED
  VALIDATED
}
```

**Relatie toevoegen aan User:**
```prisma
// In model User:
  lockedAssets       BrandAsset[]           @relation("LockedAssets")
  assetVersions      BrandAssetVersion[]
```

### Stap 1B — Migratie + Seed

```bash
npx prisma migrate dev --name add-asset-detail-models
```

**Seed data:** Voeg research methods en frameworks toe voor bestaande assets.

```typescript
// In prisma/seed.ts — voeg toe na AI analysis session seed

// Research methods voor alle 13 assets
const allAssets = await prisma.brandAsset.findMany({
  where: { workspaceId: workspace.id },
});

const methodTypes = ["AI_EXPLORATION", "WORKSHOP", "INTERVIEWS", "QUESTIONNAIRE"] as const;

for (const asset of allAssets) {
  for (const method of methodTypes) {
    let status: "AVAILABLE" | "IN_PROGRESS" | "COMPLETED" | "VALIDATED" = "AVAILABLE";
    let progress = 0;

    // Assets met hoge coverage hebben gevalideerde methods
    if (asset.status === "READY") {
      if (method === "AI_EXPLORATION") { status = "VALIDATED"; progress = 100; }
      else if (method === "WORKSHOP") { status = "COMPLETED"; progress = 100; }
      else { status = "AVAILABLE"; progress = 0; }
    } else if (asset.status === "IN_PROGRESS") {
      if (method === "AI_EXPLORATION") { status = "IN_PROGRESS"; progress = 60; }
      else { status = "AVAILABLE"; progress = 0; }
    }

    await prisma.brandAssetResearchMethod.create({
      data: {
        method,
        status,
        progress,
        completedAt: status === "VALIDATED" || status === "COMPLETED" ? new Date() : null,
        brandAssetId: asset.id,
      },
    });
  }
}

// Framework data voor specifieke assets
const frameworkAssignments = [
  { slug: "social-relevancy", frameworkType: "ESG", frameworkData: {
    pillars: {
      environmental: { impact: "medium", description: "Sustainable packaging initiatives and carbon-neutral operations.", projectCount: 3 },
      social: { impact: "high", description: "Community engagement programs and diversity initiatives.", programCount: 7 },
      governance: { impact: "medium", description: "Transparent reporting and ethical supply chain.", policyCount: 5 },
    },
  }},
  { slug: "brand-purpose", frameworkType: "GOLDEN_CIRCLE", frameworkData: {
    why: { statement: "To empower brands to communicate authentically", details: "We believe every brand has a unique story that deserves to be told consistently and compellingly." },
    how: { statement: "Through AI-powered brand strategy tools", details: "By combining human creativity with AI analysis to bridge the gap between strategy and execution." },
    what: { statement: "A platform for brand strategy and content generation", details: "Branddock helps teams define, validate, and activate their brand across all channels." },
  }},
  { slug: "competitive-landscape", frameworkType: "SWOT", frameworkData: {
    strengths: ["AI-powered analysis", "Integrated strategy-to-content pipeline", "Real-time brand consistency"],
    weaknesses: ["New market entrant", "Limited enterprise features", "Small team"],
    opportunities: ["Growing demand for brand consistency tools", "AI adoption in marketing", "Remote team collaboration"],
    threats: ["Established competitors", "AI commoditization", "Market consolidation"],
  }},
];

for (const fa of frameworkAssignments) {
  await prisma.brandAsset.updateMany({
    where: { slug: fa.slug, workspaceId: workspace.id },
    data: { frameworkType: fa.frameworkType, frameworkData: JSON.stringify(fa.frameworkData) },
  });
}

// Versie historie voor Vision Statement (READY asset)
const visionForVersions = await prisma.brandAsset.findFirst({
  where: { slug: "vision-statement", workspaceId: workspace.id },
});

if (visionForVersions) {
  const versions = [
    { version: 1, content: "Initial draft of our vision statement focusing on brand innovation.", changeNote: "Initial creation" },
    { version: 2, content: "Refined vision with emphasis on AI-driven brand strategy and human creativity.", changeNote: "Added AI focus" },
    { version: 3, content: visionForVersions.content as string ?? "To be the leading platform where brand strategy meets AI-powered execution.", changeNote: "Final approved version" },
  ];

  for (const v of versions) {
    await prisma.brandAssetVersion.create({
      data: { ...v, changedById: user.id, brandAssetId: visionForVersions.id },
    });
  }
}
```

```bash
npx prisma db seed
```

### ✅ Stap 1 Checklist
- [ ] BrandAsset uitgebreid: frameworkType, frameworkData, isLocked, lockedBy, lockedAt
- [ ] `BrandAssetVersion` model aangemaakt (version, content, changeNote)
- [ ] `BrandAssetResearchMethod` model aangemaakt (method, status, progress)
- [ ] Enums: `ResearchMethodType`, `ResearchMethodStatus`
- [ ] Relaties: User.lockedAssets, User.assetVersions
- [ ] Migratie geslaagd
- [ ] Seed: research methods voor alle 13 assets, 3 frameworks, 3 versies voor Vision Statement

---

## STAP 2: TYPES + API ENDPOINTS

### Stap 2A — Types

**Bestand:** `src/types/brand-asset-detail.ts`
```typescript
export type AssetDetailStatus = "EMPTY" | "DRAFT" | "IN_DEVELOPMENT" | "APPROVED";

export type ResearchMethodType = "AI_EXPLORATION" | "WORKSHOP" | "INTERVIEWS" | "QUESTIONNAIRE";
export type ResearchMethodStatus = "AVAILABLE" | "IN_PROGRESS" | "COMPLETED" | "VALIDATED";

export type FrameworkType = "ESG" | "GOLDEN_CIRCLE" | "SWOT";

export interface BrandAssetResearchMethod {
  id: string;
  method: ResearchMethodType;
  status: ResearchMethodStatus;
  progress: number;
  completedAt: string | null;
  artifactsCount: number;
}

export interface BrandAssetVersion {
  id: string;
  version: number;
  content: string | null;
  frameworkData: Record<string, unknown> | null;
  changeNote: string | null;
  changedBy: { id: string; name: string };
  createdAt: string;
}

export interface BrandAssetDetail {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  category: string;
  status: string;
  content: string | null;
  coveragePercentage: number;
  frameworkType: FrameworkType | null;
  frameworkData: Record<string, unknown> | null;
  isLocked: boolean;
  lockedBy: { id: string; name: string } | null;
  lockedAt: string | null;
  aiValidated: boolean;
  workshopValidated: boolean;
  interviewValidated: boolean;
  questionnaireValidated: boolean;
  researchMethods: BrandAssetResearchMethod[];
  createdAt: string;
  updatedAt: string;
  _computed: {
    validationPercentage: number;
    completedMethodsCount: number;
    totalMethodsCount: 4;
    lastUpdated: string;
    artifactsGenerated: number;
  };
}

// === Framework Data Types ===
export interface ESGFrameworkData {
  pillars: {
    environmental: { impact: "high" | "medium" | "low"; description: string; projectCount: number };
    social: { impact: "high" | "medium" | "low"; description: string; programCount: number };
    governance: { impact: "high" | "medium" | "low"; description: string; policyCount: number };
  };
}

export interface GoldenCircleFrameworkData {
  why: { statement: string; details: string };
  how: { statement: string; details: string };
  what: { statement: string; details: string };
}

export interface SWOTFrameworkData {
  strengths: string[];
  weaknesses: string[];
  opportunities: string[];
  threats: string[];
}

// === API Bodies ===
export interface UpdateContentBody {
  content: string;
  changeNote?: string;
}

export interface UpdateStatusBody {
  status: AssetDetailStatus;
}

export interface RegenerateBody {
  scope: "full" | "section";
  sectionKey?: string;
}
```

### Stap 2B — Validation Percentage Utility

**Bestand:** `src/lib/utils/validation-percentage.ts`
```typescript
import type { BrandAssetResearchMethod } from "@/types/brand-asset-detail";

export const VALIDATION_WEIGHTS: Record<string, number> = {
  AI_EXPLORATION: 0.15,
  WORKSHOP: 0.30,
  INTERVIEWS: 0.25,
  QUESTIONNAIRE: 0.30,
};

export function calculateValidationPercentage(methods: BrandAssetResearchMethod[]): number {
  let total = 0;
  for (const m of methods) {
    const weight = VALIDATION_WEIGHTS[m.method] ?? 0;
    if (m.status === "COMPLETED" || m.status === "VALIDATED") {
      total += weight * 100;
    } else if (m.status === "IN_PROGRESS") {
      total += weight * m.progress;
    }
  }
  return Math.round(total);
}
```

### Stap 2C — API Endpoints

**Bestanden aanmaken:**

| # | Bestand | Methode | Functie |
|---|---------|---------|---------|
| 1 | `src/app/api/brand-assets/[id]/content/route.ts` | PATCH | Content updaten + versie aanmaken |
| 2 | `src/app/api/brand-assets/[id]/status/route.ts` | PATCH | Status updaten |
| 3 | `src/app/api/brand-assets/[id]/lock/route.ts` | PATCH | Lock/unlock toggle |
| 4 | `src/app/api/brand-assets/[id]/versions/route.ts` | GET | Versie historie ophalen |
| 5 | `src/app/api/brand-assets/[id]/framework/route.ts` | PATCH | Framework data updaten |
| 6 | `src/app/api/brand-assets/[id]/regenerate/route.ts` | POST | AI regenerate (mock) |
| 7 | `src/app/api/brand-assets/[id]/export/route.ts` | GET | Export als JSON |

**Noot:** GET en DELETE voor `/api/brand-assets/[id]` bestaan al uit Fase 1A. Breid GET uit met researchMethods, versions, en _computed velden. POST `/api/brand-assets/[id]/duplicate` bestaat ook al.

**Key endpoint logica:**

**PATCH /content — Content updaten:**
```typescript
// 1. Check niet locked (of locked door huidige user)
// 2. Update BrandAsset.content
// 3. Bepaal volgend versie nummer: max(existing) + 1
// 4. Maak BrandAssetVersion aan
// 5. Return: { asset, version }
```

**PATCH /lock — Lock toggle:**
```typescript
// 1. Als locked=true: set isLocked, lockedById, lockedAt
// 2. Als locked=false: clear alle lock velden
// 3. Return: { isLocked, lockedBy, lockedAt }
```

**GET /versions — Versie historie:**
```typescript
// 1. Query BrandAssetVersion where brandAssetId, include changedBy
// 2. Sorteer op version DESC
// 3. Paginatie: limit + offset
// 4. Return: { versions, total }
```

**POST /regenerate — Mock AI regenerate:**
```typescript
// 1. Genereer mock content (in echte versie: AI call)
// 2. Return: { content: "...", preview: true }
// 3. User moet nog expliciet opslaan via PATCH /content
```

**Zod Validatie:**
```typescript
const updateContentSchema = z.object({
  content: z.string().min(1).max(50000),
  changeNote: z.string().max(255).optional(),
});

const updateStatusSchema = z.object({
  status: z.enum(["EMPTY", "DRAFT", "IN_DEVELOPMENT", "APPROVED"]),
});

const lockSchema = z.object({
  locked: z.boolean(),
});

const regenerateSchema = z.object({
  scope: z.enum(["full", "section"]),
  sectionKey: z.string().optional(),
});
```

### Stap 2D — API Client

**Bestand:** `src/lib/api/brand-asset-detail.ts`
```typescript
import type {
  BrandAssetDetail, UpdateContentBody, UpdateStatusBody,
  RegenerateBody, BrandAssetVersion,
} from "@/types/brand-asset-detail";

const BASE = "/api/brand-assets";

export async function getAssetDetail(id: string): Promise<BrandAssetDetail> {
  const res = await fetch(`${BASE}/${id}`);
  if (!res.ok) throw new Error("Failed to get asset detail");
  return res.json();
}

export async function updateAssetContent(id: string, body: UpdateContentBody): Promise<{ asset: BrandAssetDetail; version: BrandAssetVersion }> {
  const res = await fetch(`${BASE}/${id}/content`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error("Failed to update content");
  return res.json();
}

export async function updateAssetStatus(id: string, body: UpdateStatusBody): Promise<{ asset: BrandAssetDetail }> {
  const res = await fetch(`${BASE}/${id}/status`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error("Failed to update status");
  return res.json();
}

export async function toggleAssetLock(id: string, locked: boolean): Promise<{ isLocked: boolean }> {
  const res = await fetch(`${BASE}/${id}/lock`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ locked }),
  });
  if (!res.ok) throw new Error("Failed to toggle lock");
  return res.json();
}

export async function getAssetVersions(id: string, limit = 10, offset = 0): Promise<{ versions: BrandAssetVersion[]; total: number }> {
  const res = await fetch(`${BASE}/${id}/versions?limit=${limit}&offset=${offset}`);
  if (!res.ok) throw new Error("Failed to get versions");
  return res.json();
}

export async function regenerateContent(id: string, body: RegenerateBody): Promise<{ content: string; preview: boolean }> {
  const res = await fetch(`${BASE}/${id}/regenerate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error("Failed to regenerate");
  return res.json();
}

export async function updateFramework(id: string, frameworkData: Record<string, unknown>): Promise<{ asset: BrandAssetDetail }> {
  const res = await fetch(`${BASE}/${id}/framework`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ frameworkData }),
  });
  if (!res.ok) throw new Error("Failed to update framework");
  return res.json();
}

export async function exportAsset(id: string, format: "json" | "pdf" = "json"): Promise<Blob> {
  const res = await fetch(`${BASE}/${id}/export?format=${format}`);
  if (!res.ok) throw new Error("Failed to export");
  return res.blob();
}
```

### ✅ Stap 2 Checklist
- [ ] Types in `src/types/brand-asset-detail.ts` (incl. framework types)
- [ ] Validation percentage utility in `src/lib/utils/validation-percentage.ts`
- [ ] 7 nieuwe API route bestanden
- [ ] Bestaande GET `/api/brand-assets/[id]` uitgebreid met researchMethods + _computed
- [ ] PATCH content: slaat op + maakt versie
- [ ] PATCH lock: toggle met user tracking
- [ ] GET versions: gesorteerd + gepagineerd
- [ ] POST regenerate: mock content preview
- [ ] API client functies beschikbaar

---

## STAP 3: STORE + TANSTACK QUERY HOOKS

### Stap 3A — Zustand Store

**Bestand:** `src/stores/useBrandAssetDetailStore.ts`
```typescript
import { create } from "zustand";
import type { BrandAssetDetail } from "@/types/brand-asset-detail";

interface BrandAssetDetailStore {
  asset: BrandAssetDetail | null;
  isEditing: boolean;
  editedContent: string;
  isDirty: boolean;
  isLocked: boolean;
  isRegenerating: boolean;
  frameworkCollapsed: boolean;

  setAsset: (asset: BrandAssetDetail | null) => void;
  startEditing: () => void;
  cancelEditing: () => void;
  setEditedContent: (content: string) => void;
  setLocked: (locked: boolean) => void;
  setRegenerating: (regenerating: boolean) => void;
  toggleFrameworkCollapse: () => void;
  reset: () => void;
}

export const useBrandAssetDetailStore = create<BrandAssetDetailStore>((set, get) => ({
  asset: null,
  isEditing: false,
  editedContent: "",
  isDirty: false,
  isLocked: false,
  isRegenerating: false,
  frameworkCollapsed: false,

  setAsset: (asset) => set({ asset }),
  startEditing: () => {
    const asset = get().asset;
    set({ isEditing: true, editedContent: asset?.content ?? "", isDirty: false });
  },
  cancelEditing: () => set({ isEditing: false, editedContent: "", isDirty: false }),
  setEditedContent: (content) => set({ editedContent: content, isDirty: true }),
  setLocked: (locked) => set({ isLocked: locked }),
  setRegenerating: (regenerating) => set({ isRegenerating: regenerating }),
  toggleFrameworkCollapse: () => set((s) => ({ frameworkCollapsed: !s.frameworkCollapsed })),
  reset: () => set({
    asset: null, isEditing: false, editedContent: "", isDirty: false,
    isLocked: false, isRegenerating: false, frameworkCollapsed: false,
  }),
}));
```

### Stap 3B — TanStack Query Hooks

**Bestand:** `src/lib/api/brand-asset-detail-hooks.ts`
```typescript
"use client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import * as api from "./brand-asset-detail";
import { brandAssetKeys } from "./brand-asset-hooks";
import type { UpdateContentBody, UpdateStatusBody, RegenerateBody } from "@/types/brand-asset-detail";

export const assetDetailKeys = {
  all:      ["asset-detail"] as const,
  detail:   (id: string) => ["asset-detail", id] as const,
  versions: (id: string) => ["asset-detail", "versions", id] as const,
};

export function useBrandAssetDetail(id: string) {
  return useQuery({
    queryKey: assetDetailKeys.detail(id),
    queryFn: () => api.getAssetDetail(id),
    staleTime: 30_000,
  });
}

export function useUpdateAssetContent(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: UpdateContentBody) => api.updateAssetContent(id, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: assetDetailKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: assetDetailKeys.versions(id) });
      queryClient.invalidateQueries({ queryKey: brandAssetKeys.all });
    },
  });
}

export function useUpdateAssetStatus(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: UpdateStatusBody) => api.updateAssetStatus(id, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: assetDetailKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: brandAssetKeys.all });
    },
  });
}

export function useToggleAssetLock(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (locked: boolean) => api.toggleAssetLock(id, locked),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: assetDetailKeys.detail(id) }),
  });
}

export function useAssetVersions(id: string) {
  return useQuery({
    queryKey: assetDetailKeys.versions(id),
    queryFn: () => api.getAssetVersions(id),
    staleTime: 60_000,
  });
}

export function useRegenerateContent(id: string) {
  return useMutation({
    mutationFn: (body: RegenerateBody) => api.regenerateContent(id, body),
  });
}

export function useDeleteAsset(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => {
      return fetch(`/api/brand-assets/${id}`, { method: "DELETE" }).then((r) => {
        if (!r.ok) throw new Error("Failed to delete");
        return r.json();
      });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: brandAssetKeys.all }),
  });
}
```

### ✅ Stap 3 Checklist
- [ ] Zustand store met editing state, lock state, framework collapse
- [ ] TanStack hooks: detail, content update, status, lock, versions, regenerate, delete
- [ ] Cache invalidatie cascade (detail → versions → brand-assets list)

---

## STAP 4: UI COMPONENTEN — PAGINA + HEADER + CONTENT

### Stap 4A — Mappenstructuur

```bash
mkdir -p src/components/brand-asset-detail
mkdir -p src/components/brand-asset-detail/frameworks
```

### Stap 4B — Componenten (bouw in volgorde)

| # | Component | Beschrijving |
|---|-----------|-------------|
| 1 | `AssetDetailHeader.tsx` | Breadcrumb + titel + validation badge + status dropdown + overflow menu |
| 2 | `AssetStatusDropdown.tsx` | 4 status opties met iconen |
| 3 | `AssetOverflowMenu.tsx` | 6 acties dropdown |
| 4 | `ContentEditorSection.tsx` | Content weergave + edit mode toggle |
| 5 | `ContentEditorActionBar.tsx` | Edit/Regenerate/Lock/Save/Cancel knoppen |
| 6 | `ContentEditMode.tsx` | Textarea voor content editing |
| 7 | `VersionHistoryTimeline.tsx` | Lijst van versies met timestamps |
| 8 | `DeleteAssetDialog.tsx` | Bevestigingsdialoog voor delete |
| 9 | `BrandAssetDetailPage.tsx` | Hoofdpagina die alles combineert |

### Design Tokens

#### AssetDetailHeader
```
Container:      space-y-2
Breadcrumb:     text-sm text-gray-500 hover:text-gray-700 cursor-pointer
                flex items-center gap-1, ChevronLeft w-4 h-4 + "Back to Your Brand"
Title row:      flex items-center justify-between
Title:          text-2xl font-bold text-gray-900
Description:    text-sm text-gray-500 mt-1
Validation badge (rechts naast titel):
  warning:      bg-amber-50 text-amber-700 border border-amber-200 rounded-full px-3 py-1 text-xs font-medium
  success:      bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full px-3 py-1 text-xs font-medium
  critical:     bg-red-50 text-red-700 border border-red-200 rounded-full px-3 py-1 text-xs font-medium
  Drempels:     <50%: critical, 50-79%: warning, >=80%: success
```

#### AssetStatusDropdown
```
Trigger:        border border-gray-200 rounded-lg px-3 py-1.5 text-sm flex items-center gap-2
4 opties met iconen:
  EMPTY:          geen icoon, text-gray-500
  DRAFT:          FileEdit w-4 h-4, text-gray-600
  IN_DEVELOPMENT: Lightbulb w-4 h-4, text-amber-600
  APPROVED:       CheckCircle w-4 h-4, text-emerald-600
Dropdown:       bg-white rounded-lg shadow-lg border border-gray-200 py-1
Item:           px-3 py-2 text-sm hover:bg-gray-50 flex items-center gap-2
```

#### AssetOverflowMenu
```
Trigger:        w-8 h-8 rounded-lg hover:bg-gray-100 flex items-center justify-center
                MoreVertical w-4 h-4 text-gray-400
Dropdown:       bg-white rounded-lg shadow-lg border border-gray-200 py-1 min-w-[200px]
6 items:
  Edit Details:     Edit w-4 h-4
  Change Status:    RefreshCw w-4 h-4 (submenu met 4 opties)
  Duplicate Asset:  Copy w-4 h-4
  Export:           Download w-4 h-4
  Delete Asset:     Trash2 w-4 h-4, text-red-600 hover:bg-red-50
  Lock for Editing: Lock w-4 h-4
Separator:      border-t border-gray-100 my-1 (voor Delete)
```

#### ContentEditorSection
```
Container:      bg-white rounded-xl border border-gray-200 p-6
View mode:      prose prose-sm text-gray-700, whitespace-pre-wrap
Edit mode:      textarea w-full min-h-[300px] border border-gray-200 rounded-lg p-4 text-sm
                focus:ring-2 focus:ring-teal-500
```

#### ContentEditorActionBar
```
Container:      flex items-center gap-2 mb-4
View mode knoppen:
  Edit Content:      border border-gray-200 rounded-lg px-3 py-1.5 text-sm, Edit w-4 h-4
  Regenerate AI:     border border-gray-200 rounded-lg px-3 py-1.5 text-sm, Sparkles w-4 h-4
  Lock for Editing:  border border-gray-200 rounded-lg px-3 py-1.5 text-sm, Lock w-4 h-4
Edit mode knoppen:
  Save Changes:      bg-emerald-500 text-white rounded-lg px-4 py-1.5 text-sm, Save w-4 h-4
  Cancel:            text-gray-500 hover:text-gray-700 px-3 py-1.5 text-sm
```

#### VersionHistoryTimeline
```
Container:      mt-6 border-t border-gray-100 pt-6
Title:          text-sm font-medium text-gray-900 mb-4 + "Version History"
Timeline:       relative pl-6 space-y-4
Line:           absolute left-2 top-0 bottom-0 w-0.5 bg-gray-200
Dot:            absolute left-0.5 w-3 h-3 rounded-full bg-teal-500 border-2 border-white
Version item:
  Title:        text-sm font-medium text-gray-900 → "v{version}"
  Note:         text-xs text-gray-500
  Meta:         text-xs text-gray-400 → "{user} · {relative time}"
```

### ✅ Stap 4 Checklist
- [ ] Header: breadcrumb, titel, validation badge (kleur per range), status dropdown
- [ ] Status dropdown met 4 opties + iconen
- [ ] Overflow menu met 6 acties, delete = destructive
- [ ] Content viewer: prose rendering
- [ ] Content editor: textarea met save/cancel
- [ ] Action bar schakelt tussen view mode en edit mode
- [ ] Version history timeline met dots
- [ ] Delete dialog met bevestiging

---

## STAP 5: UI COMPONENTEN — FRAMEWORKS + RESEARCH METHODS

### Stap 5A — Framework Componenten

| # | Component | Beschrijving |
|---|-----------|-------------|
| 1 | `FrameworkSection.tsx` | Inklapbare container |
| 2 | `FrameworkRenderer.tsx` | Switcht op frameworkType |
| 3 | `frameworks/ESGFramework.tsx` | 3 pilaren met impact badges |
| 4 | `frameworks/GoldenCircleFramework.tsx` | Why/How/What concentrische lagen |
| 5 | `frameworks/SWOTFramework.tsx` | 2x2 grid |

### Framework Design Tokens

#### FrameworkSection
```
Container:      border border-gray-200 rounded-lg overflow-hidden
Header:         px-6 py-4 flex items-center justify-between cursor-pointer hover:bg-gray-50
Title:          text-base font-semibold text-gray-900 → "Framework: {type}"
Toggle:         ChevronDown w-5 h-5 text-gray-400 (rotate-180 wanneer open)
Body:           px-6 pb-6 (verborgen wanneer collapsed)
```

#### ESGFramework
```
Grid:           grid grid-cols-1 md:grid-cols-3 gap-4
Pillar card:    bg-white border border-gray-100 rounded-lg p-4
Pillar title:   text-sm font-semibold text-gray-900 capitalize
Impact badge:
  high:         bg-emerald-50 text-emerald-700 text-xs px-2 py-0.5 rounded-full
  medium:       bg-amber-50 text-amber-700 text-xs px-2 py-0.5 rounded-full
  low:          bg-gray-100 text-gray-600 text-xs px-2 py-0.5 rounded-full
Description:    text-sm text-gray-600 mt-2
Count:          text-xs text-gray-400 mt-2
```

#### GoldenCircleFramework
```
Concentrische layout (of vereenvoudigd als 3 rows):
  Why:   bg-amber-50 border border-amber-200 rounded-lg p-4
  How:   bg-blue-50 border border-blue-200 rounded-lg p-4
  What:  bg-emerald-50 border border-emerald-200 rounded-lg p-4
Statement:  text-sm font-semibold text-gray-900
Details:    text-sm text-gray-600 mt-1
```

#### SWOTFramework
```
Grid:           grid grid-cols-2 gap-4
Cell:
  Strengths:    bg-emerald-50 border border-emerald-200 rounded-lg p-4
  Weaknesses:   bg-red-50 border border-red-200 rounded-lg p-4
  Opportunities:bg-blue-50 border border-blue-200 rounded-lg p-4
  Threats:      bg-amber-50 border border-amber-200 rounded-lg p-4
Title:          text-sm font-semibold text-gray-900 mb-2
List:           space-y-1
Item:           text-sm text-gray-600, bullet: "•"
```

### Stap 5B — Research Methods Componenten

| # | Component | Beschrijving |
|---|-----------|-------------|
| 1 | `ResearchMethodsSection.tsx` | Container met header + 4 cards |
| 2 | `ResearchMethodCard.tsx` | Enkele method card |
| 3 | `ResearchMethodStatusBadge.tsx` | Status badge component |

### Research Methods Design Tokens

#### ResearchMethodsSection
```
Container:      mt-8
Header:         flex items-center justify-between mb-4
Title:          text-lg font-semibold text-gray-900 → "Research & Validation"
Subtitle:       text-sm text-gray-500 → "{validationPercentage}% Validated · {completed} of 4 completed"
Grid:           grid grid-cols-1 md:grid-cols-2 gap-4
```

#### ResearchMethodCard
```
Container:      bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer
                flex items-start gap-4
Icon box:       w-10 h-10 rounded-lg flex items-center justify-center
                AI_EXPLORATION:  bg-purple-50, Bot w-5 h-5 text-purple-600
                WORKSHOP:        bg-blue-50, Users w-5 h-5 text-blue-600
                INTERVIEWS:      bg-amber-50, MessageCircle w-5 h-5 text-amber-600
                QUESTIONNAIRE:   bg-emerald-50, ClipboardList w-5 h-5 text-emerald-600
Content:        flex-1
Title:          text-sm font-semibold text-gray-900
                AI_EXPLORATION: "AI Exploration" | WORKSHOP: "Workshop" | etc.
Type label:     text-xs text-gray-400 → "AI" | "Collaborative" | "1-on-1" | "Quantitative"
Time:           text-xs text-gray-400 → "Instant" | "2-4 hours" | "Variable" | "1-2 weeks"
Price:          text-xs text-gray-500 font-medium → alleen voor QUESTIONNAIRE: "From $500"
Free badge:     text-xs bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full → alleen voor AI_EXPLORATION: "Free"
Status badge:   rechtsboven in card
```

#### ResearchMethodStatusBadge
```
VALIDATED:      bg-emerald-50 text-emerald-700 text-xs px-2 py-0.5 rounded-full font-medium
AVAILABLE:      bg-gray-100 text-gray-600 text-xs px-2 py-0.5 rounded-full font-medium
IN_PROGRESS:    bg-blue-50 text-blue-700 text-xs px-2 py-0.5 rounded-full font-medium
COMPLETED:      bg-emerald-50 text-emerald-700 text-xs px-2 py-0.5 rounded-full font-medium
```

### Stap 5C — Navigatie Routes

Research method cards navigeren naar:
```typescript
const RESEARCH_METHOD_ROUTES: Record<string, (slug: string) => string> = {
  AI_EXPLORATION: (slug) => `/knowledge/brand-foundation/${slug}/ai-analysis`,  // Fase 1B
  WORKSHOP:       (slug) => `/knowledge/brand-foundation/${slug}/workshop`,     // Fase 1D — placeholder
  INTERVIEWS:     (slug) => `/knowledge/brand-foundation/${slug}/interviews`,   // placeholder
  QUESTIONNAIRE:  (slug) => `/knowledge/brand-foundation/${slug}/questionnaire`, // placeholder
};
```

Voor placeholder routes, maak simple "Coming Soon" pagina's:
```bash
# Placeholder routes
src/app/knowledge/brand-foundation/[slug]/workshop/page.tsx
src/app/knowledge/brand-foundation/[slug]/interviews/page.tsx
src/app/knowledge/brand-foundation/[slug]/questionnaire/page.tsx
```

### Stap 5D — Route voor Asset Detail

**Bestand:** `src/app/knowledge/brand-foundation/[slug]/page.tsx`
```tsx
import { BrandAssetDetailPage } from "@/components/brand-asset-detail/BrandAssetDetailPage";

export default function Page({ params }: { params: { slug: string } }) {
  return <BrandAssetDetailPage slug={params.slug} />;
}
```

### ✅ Stap 5 Checklist
- [ ] Framework section inklapbaar (toggle)
- [ ] ESG: 3 pilaren met impact badges (high/medium/low)
- [ ] Golden Circle: Why/How/What met gekleurde achtergronden
- [ ] SWOT: 2x2 grid met 4 kleuren
- [ ] FrameworkRenderer switcht correct op frameworkType
- [ ] Research section header: "X% Validated · Y of 4 completed"
- [ ] 4 research method cards met unieke iconen/kleuren
- [ ] Status badges: VALIDATED/AVAILABLE/IN PROGRESS/COMPLETED
- [ ] AI Exploration navigeert naar Fase 1B
- [ ] Overige methods: placeholder "Coming Soon" pagina's
- [ ] Route `/knowledge/brand-foundation/[slug]` werkt

---

## STAP 6: INTEGRATIE + AFRONDEN

### Stap 6A — Navigatie Vanuit Fase 1A

Update de BrandAssetCard uit Fase 1A zodat klikken op de card navigeert naar `/knowledge/brand-foundation/[slug]`.

### Stap 6B — Sync met Fase 1B

Wanneer AI Analysis (Fase 1B) een rapport genereert:
- Update `BrandAssetResearchMethod` voor AI_EXPLORATION → status COMPLETED
- Dit wordt al gedaan in de generate-report endpoint van Fase 1B
- De asset detail pagina haalt dit automatisch op via de query

### Stap 6C — Lock Feedback

Als een asset locked is:
- Toon lock indicator in de header (Lock icoon + "Locked by {user}")
- Disable Edit Content en Regenerate knoppen
- Lock knop in overflow menu toont "Unlock" tekst

### ✅ Stap 6 Checklist
- [ ] BrandAssetCard klik navigeert naar detail pagina
- [ ] Lock state wordt correct weergegeven
- [ ] Locked assets: edit knoppen disabled
- [ ] Research method status sync met Fase 1B
- [ ] Terug-navigatie via breadcrumb

---

## VOLLEDIGE ACCEPTATIECRITERIA

### Page Header
- [ ] Breadcrumb navigeert naar /knowledge/brand-foundation
- [ ] Asset titel + beschrijving correct
- [ ] Validation % badge met kleur (critical <50%, warning 50-79%, success >=80%)
- [ ] Status dropdown met 4 opties + iconen
- [ ] Overflow menu met 6 acties

### Content Editor
- [ ] View mode: content als prose
- [ ] Edit mode: textarea met content
- [ ] Save → nieuwe versie aangemaakt
- [ ] Cancel → terug naar view mode zonder wijzigingen
- [ ] Regenerate AI → mock preview content
- [ ] Lock → asset vergrendeld, edit disabled

### Framework Section
- [ ] Inklapbaar (toggle met chevron)
- [ ] ESG: 3 pilaren, impact badges
- [ ] Golden Circle: Why/How/What
- [ ] SWOT: 2x2 grid
- [ ] Geen framework → sectie niet getoond

### Research Methods
- [ ] Header: "{X}% Validated · {Y} of 4 completed"
- [ ] 4 cards met unieke iconen/kleuren
- [ ] Status badges correct per method
- [ ] AI Exploration → navigeert naar Fase 1B
- [ ] Questionnaire toont prijs label
- [ ] AI Exploration toont "Free" badge
- [ ] Validation % gewogen (niet simpel 25%)

### Version History
- [ ] Timeline met versie dots
- [ ] Versie nummer, change note, user, timestamp
- [ ] Gesorteerd op versie DESC

### Overflow Acties
- [ ] Edit Details
- [ ] Change Status (submenu met 4 opties)
- [ ] Duplicate → navigeert naar nieuwe asset
- [ ] Export → JSON download
- [ ] Delete → bevestigingsdialoog → terug naar overview
- [ ] Lock for Editing → toggle

### Technisch
- [ ] 0 TypeScript errors, 0 ESLint errors
- [ ] Alle queries invalideren correct
- [ ] Route `/knowledge/brand-foundation/[slug]` werkt
- [ ] Placeholder routes voor workshop/interviews/questionnaire

---

## VOLGENDE STAPPEN NA FASE 1C

```
1. ✅ AppShell + Dashboard (Fase 11)
2. ✅ Brand Foundation Overview (Fase 1A)
3. ✅ AI Brand Analysis (Fase 1B)
4. ✅ Brand Asset Detail (Fase 1C)          ← DIT PLAN
5.    Canvas Workshop (Fase 1D)
6.    Golden Circle (Fase 1E)
7.    Business Strategy + Brandstyle (Fase 2-3)
```

---

*Einde implementatieplan — 13 februari 2026*
*~550 regels, 6 stappen, Brand Asset Detail met editing, frameworks, research methods*
