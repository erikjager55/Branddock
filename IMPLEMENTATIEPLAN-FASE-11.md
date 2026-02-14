# BRANDDOCK — Implementatieplan Fase 11
## AppShell + Dashboard & Globale Componenten
**Datum:** 13 februari 2026
**Doel:** Van nul naar werkende globale shell + dashboard
**Tool:** Claude Code (aanbevolen) of Warp AI Agent
**Geschatte duur:** 2-3 sessies

---

## HOE DIT PLAN TE GEBRUIKEN

### Met Claude Code (aanbevolen)
```bash
# 1. Zet dit bestand in je project root
cp IMPLEMENTATIEPLAN-FASE-11.md ~/Projects/branddock-app/

# 2. Start Claude Code in de project directory
cd ~/Projects/branddock-app
claude

# 3. Geef de opdracht
> Lees IMPLEMENTATIEPLAN-FASE-11.md en voer Stap 1 uit.
```

### Met Warp AI Agent
Warp werkt, maar splits het op in kleinere opdrachten:
```
# Per substap een prompt geven, bijv:
"Voer Stap 1A uit uit IMPLEMENTATIEPLAN-FASE-11.md — Next.js project setup"
"Voer Stap 1B uit — Prisma setup met de modellen uit het plan"
```

### CLAUDE.md Context
Kopieer onderstaand blok naar `CLAUDE.md` in je project root zodat Claude Code altijd context heeft:

```markdown
# BRANDDOCK — Claude Code Context

## Project
Branddock is een SaaS platform voor brand strategy, research validatie en AI content generatie.
Tech stack: Next.js 15 (App Router), Tailwind CSS 3, PostgreSQL/Prisma, Zustand, TanStack Query, Lucide React.

## Huidige fase
Fase 11: AppShell + Dashboard & Globale Componenten — de fundatie voor alle modules.
Volg IMPLEMENTATIEPLAN-FASE-11.md voor stap-voor-stap instructies.

## Conventies
- Documentatie: Nederlands | Code/interfaces: Engels
- Design: Teal/green-600 primary, rounded-xl cards, 4px grid, Lucide icons (geen emoji's)
- Sidebar: w-180px, bg-gray-50 | TopBar: h-12, bg-white | Content: flex-1, overflow-y-auto
- Componenten: functioneel React, TypeScript strict, named exports
- State: Zustand voor UI state, TanStack Query voor server state
- API: Next.js Route Handlers, Zod validatie, Prisma ORM
- Bestanden: kebab-case voor bestanden, PascalCase voor componenten

## Referenties
- IMPLEMENTATIEPLAN-FASE-11.md — Dit implementatieplan (stap-voor-stap)
- CONSOLIDATION-PLAN.md — Design patterns + consolidatie specs (upload bij complexe taken)
- HANDOVER-ULTIEM-2026-02-13.md — Volledige projectcontext (upload bij nieuwe sessies)
- Notion Implementation Guide Fase 11: 30548b9c-6dc9-8168-a0a7-f3c1c3ed9874
```

---

## STAP 1: PROJECT SETUP + DATABASE

### Stap 1A — Next.js Project Initialiseren

```bash
cd ~/Projects
npx create-next-app@latest branddock-app \
  --typescript \
  --tailwind \
  --eslint \
  --app \
  --src-dir \
  --import-alias "@/*" \
  --no-turbopack

cd branddock-app
```

### Stap 1B — Dependencies Installeren

```bash
# Database
npm install prisma @prisma/client

# State management
npm install zustand @tanstack/react-query

# UI
npm install lucide-react
npm install @radix-ui/react-dialog @radix-ui/react-popover @radix-ui/react-checkbox
npm install clsx tailwind-merge

# Validatie
npm install zod

# Dev
npm install -D prisma
npx prisma init
```

### Stap 1C — Tailwind Configuratie

**Bestand:** `tailwind.config.ts`
```typescript
import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50:  '#F0FDFA',  // teal-50 equivalent
          100: '#CCFBF1',
          500: '#14B8A6',
          600: '#0D9488',  // PRIMARY
          700: '#0F766E',
        },
      },
    },
  },
  plugins: [],
};
export default config;
```

### Stap 1D — Utility: cn() Helper

**Bestand:** `src/lib/utils.ts`
```typescript
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```

### Stap 1E — Prisma Schema

**Bestand:** `prisma/schema.prisma`
```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// === KERN MODELLEN (minimaal voor Fase 11) ===

model Workspace {
  id        String   @id @default(cuid())
  name      String
  slug      String   @unique
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  users                User[]
  dashboardPreferences DashboardPreference[]
  notifications        Notification[]
}

model User {
  id          String    @id @default(cuid())
  email       String    @unique
  name        String?
  avatarUrl   String?
  workspaceId String
  workspace   Workspace @relation(fields: [workspaceId], references: [id])
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt

  @@index([workspaceId])
}

// === FASE 11: DASHBOARD ===

model DashboardPreference {
  id                   String    @id @default(cuid())
  userId               String    @unique
  onboardingComplete   Boolean   @default(false)
  dontShowOnboarding   Boolean   @default(false)
  quickStartDismissed  Boolean   @default(false)
  quickStartItems      Json?     // [{ key: "brand_asset", completed: false }, ...]
  workspaceId          String
  workspace            Workspace @relation(fields: [workspaceId], references: [id])
  createdAt            DateTime  @default(now())
  updatedAt            DateTime  @updatedAt

  @@index([workspaceId])
}

// === FASE 11: NOTIFICATIONS ===

model Notification {
  id          String               @id @default(cuid())
  type        NotificationType
  title       String
  description String?
  category    NotificationCategory
  isRead      Boolean              @default(false)
  actionUrl   String?
  actorId     String?
  actorName   String?
  workspaceId String
  workspace   Workspace            @relation(fields: [workspaceId], references: [id])
  userId      String
  createdAt   DateTime             @default(now())

  @@index([workspaceId, userId])
  @@index([userId, isRead])
}

enum NotificationType {
  DATA_RELATIONSHIP_CREATED
  RESEARCH_COMPLETED
  FILE_UPLOADED
  MILESTONE_REACHED
  COMMENT_ADDED
  RESEARCH_PLAN_CREATED
  ASSET_STATUS_UPDATED
  RESEARCH_INSIGHT_ADDED
  NEW_PERSONA_CREATED
  NEW_RESEARCH_STARTED
}

enum NotificationCategory {
  BRAND_ASSETS
  RESEARCH
  PERSONAS
  STRATEGY
  COLLABORATION
  SYSTEM
}
```

### Stap 1F — Database Aanmaken + Migratie

```bash
# .env bestand aanmaken (pas DATABASE_URL aan naar jouw setup)
echo 'DATABASE_URL="postgresql://postgres:postgres@localhost:5432/branddock"' > .env

# Database + eerste migratie
npx prisma migrate dev --name init-fase-11

# Prisma client genereren
npx prisma generate
```

### Stap 1G — Prisma Client Singleton

**Bestand:** `src/lib/prisma.ts`
```typescript
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
```

### Stap 1H — Seed Data

**Bestand:** `prisma/seed.ts`
```typescript
import { PrismaClient, NotificationType, NotificationCategory } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  // Workspace
  const workspace = await prisma.workspace.create({
    data: {
      name: "Branddock Demo",
      slug: "branddock-demo",
    },
  });

  // User
  const user = await prisma.user.create({
    data: {
      email: "erik@branddock.com",
      name: "Erik Jager",
      workspaceId: workspace.id,
    },
  });

  // Dashboard Preferences
  await prisma.dashboardPreference.create({
    data: {
      userId: user.id,
      workspaceId: workspace.id,
      quickStartItems: JSON.stringify([
        { key: "brand_asset", label: "Create your first brand asset", completed: false, href: "/knowledge/brand-foundation" },
        { key: "persona", label: "Define your target persona", completed: false, href: "/knowledge/personas" },
        { key: "research", label: "Plan your first research session", completed: false, href: "/validation/research-hub" },
        { key: "campaign", label: "Generate your first campaign strategy", completed: false, href: "/campaigns/new" },
      ]),
    },
  });

  // 15 Notifications (mix van types, 5 unread)
  const notificationData: Array<{
    type: NotificationType;
    title: string;
    description: string;
    category: NotificationCategory;
    isRead: boolean;
    actorName: string;
  }> = [
    { type: "DATA_RELATIONSHIP_CREATED", title: "New relationship discovered", description: "Brand Foundation linked to 3 personas", category: "BRAND_ASSETS", isRead: false, actorName: "System" },
    { type: "RESEARCH_COMPLETED", title: "Research study completed", description: "Customer Interview Round 2 finished", category: "RESEARCH", isRead: false, actorName: "Sarah Chen" },
    { type: "FILE_UPLOADED", title: "New file uploaded", description: "Brand Guidelines v2.pdf added to library", category: "BRAND_ASSETS", isRead: false, actorName: "Erik Jager" },
    { type: "MILESTONE_REACHED", title: "Milestone reached!", description: "Brand Foundation is now 80% complete", category: "STRATEGY", isRead: false, actorName: "System" },
    { type: "COMMENT_ADDED", title: "New comment on Brand Voice", description: "Tom left feedback on tone guidelines", category: "COLLABORATION", isRead: false, actorName: "Tom Wilson" },
    { type: "RESEARCH_PLAN_CREATED", title: "Research plan created", description: "Q1 Persona Validation plan is ready", category: "RESEARCH", isRead: true, actorName: "Sarah Chen" },
    { type: "ASSET_STATUS_UPDATED", title: "Asset status changed", description: "Mission Statement moved to Review", category: "BRAND_ASSETS", isRead: true, actorName: "Erik Jager" },
    { type: "RESEARCH_INSIGHT_ADDED", title: "New insight added", description: "AI trend analysis found 3 new insights", category: "RESEARCH", isRead: true, actorName: "System" },
    { type: "NEW_PERSONA_CREATED", title: "New persona created", description: "Tech-Savvy Millennial added", category: "PERSONAS", isRead: true, actorName: "Erik Jager" },
    { type: "NEW_RESEARCH_STARTED", title: "Research started", description: "User Testing for Product Page launched", category: "RESEARCH", isRead: true, actorName: "Sarah Chen" },
    { type: "DATA_RELATIONSHIP_CREATED", title: "Cross-reference found", description: "Market insight linked to Business Strategy", category: "STRATEGY", isRead: true, actorName: "System" },
    { type: "FILE_UPLOADED", title: "Design asset added", description: "Logo variations uploaded to Brand Assets", category: "BRAND_ASSETS", isRead: true, actorName: "Tom Wilson" },
    { type: "COMMENT_ADDED", title: "Feedback received", description: "Sarah commented on persona research", category: "COLLABORATION", isRead: true, actorName: "Sarah Chen" },
    { type: "MILESTONE_REACHED", title: "Strategy milestone", description: "All OKRs for Q1 defined", category: "STRATEGY", isRead: true, actorName: "System" },
    { type: "ASSET_STATUS_UPDATED", title: "Asset validated", description: "Brand Promise passed research validation", category: "BRAND_ASSETS", isRead: true, actorName: "System" },
  ];

  for (const n of notificationData) {
    await prisma.notification.create({
      data: {
        ...n,
        workspaceId: workspace.id,
        userId: user.id,
      },
    });
  }

  console.log("✅ Seed complete: workspace, user, preferences, 15 notifications");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
```

**Toevoegen aan `package.json`:**
```json
{
  "prisma": {
    "seed": "npx tsx prisma/seed.ts"
  }
}
```

```bash
npm install -D tsx
npx prisma db seed
```

### ✅ Stap 1 Checklist
- [ ] `branddock-app/` project draait (`npm run dev` → localhost:3000)
- [ ] Alle dependencies geïnstalleerd
- [ ] PostgreSQL database `branddock` bestaat
- [ ] Prisma migratie geslaagd
- [ ] Seed data geladen (1 workspace, 1 user, 1 preference, 15 notifications)
- [ ] `cn()` utility beschikbaar
- [ ] `CLAUDE.md` in project root

---

## STAP 2: APPSHELL + SIDEBAR + TOPBAR

> Dit is de **fundatie** — elke pagina in Branddock rendert binnen deze shell.

### Stap 2A — Mappenstructuur Aanmaken

```bash
mkdir -p src/components/shell
mkdir -p src/components/dashboard
mkdir -p src/stores
mkdir -p src/types
mkdir -p src/lib/api
mkdir -p src/lib/shell
mkdir -p src/lib/dashboard
```

### Stap 2B — Types Definiëren

**Bestand:** `src/types/shell.ts`
```typescript
import { type LucideIcon } from "lucide-react";

export interface SidebarItem {
  icon: LucideIcon;
  label: string;
  href: string;
  badge?: number;
}

export interface SidebarSection {
  label?: string; // undefined = no header (top section)
  items: SidebarItem[];
}

export interface BreadcrumbItem {
  label: string;
  href?: string;
}
```

**Bestand:** `src/types/notifications.ts`
```typescript
export type NotificationType =
  | "DATA_RELATIONSHIP_CREATED"
  | "RESEARCH_COMPLETED"
  | "FILE_UPLOADED"
  | "MILESTONE_REACHED"
  | "COMMENT_ADDED"
  | "RESEARCH_PLAN_CREATED"
  | "ASSET_STATUS_UPDATED"
  | "RESEARCH_INSIGHT_ADDED"
  | "NEW_PERSONA_CREATED"
  | "NEW_RESEARCH_STARTED";

export type NotificationCategory =
  | "BRAND_ASSETS"
  | "RESEARCH"
  | "PERSONAS"
  | "STRATEGY"
  | "COLLABORATION"
  | "SYSTEM";

export interface NotificationItem {
  id: string;
  type: NotificationType;
  title: string;
  description: string | null;
  category: NotificationCategory;
  isRead: boolean;
  actionUrl: string | null;
  actorName: string | null;
  createdAt: string;
}

export interface NotificationEventConfig {
  type: NotificationType;
  icon: string;       // Lucide icon name
  bg: string;         // bg-{color}-100
  iconColor: string;  // text-{color}-600
}
```

**Bestand:** `src/types/dashboard.ts`
```typescript
export interface DashboardResponse {
  readiness: {
    percentage: number;
    breakdown: { ready: number; limited: number; unusable: number };
  };
  stats: {
    brandAssets: number;
    researchStudies: number;
    personas: number;
    products: number;
    marketInsights: number;
  };
  attention: AttentionItem[];
  recommended: RecommendedAction | null;
  campaignsPreview: CampaignPreviewItem[];
}

export interface AttentionItem {
  id: string;
  title: string;
  description: string;
  icon: string;
  iconBg: string;
  iconColor: string;
  actionType: "fix" | "take_action";
  actionLabel: string;
  actionHref: string;
}

export interface RecommendedAction {
  id: string;
  badge: string;
  title: string;
  description: string;
  actionLabel: string;
  actionHref: string;
}

export interface CampaignPreviewItem {
  id: string;
  title: string;
  type: "Strategic" | "Quick";
  status: string;
  deliverableProgress: number;
}

export interface DashboardPreferencesResponse {
  onboardingComplete: boolean;
  dontShowOnboarding: boolean;
  quickStartDismissed: boolean;
  quickStartItems: {
    key: string;
    label: string;
    completed: boolean;
    href: string;
  }[];
}
```

**Bestand:** `src/types/search.ts`
```typescript
export interface SearchResult {
  id: string;
  title: string;
  type: string;
  description: string | null;
  href: string;
  icon: string;
}

export interface QuickAction {
  icon: string;
  label: string;
  description: string;
  color: string;
  href: string;
}
```

### Stap 2C — Shell Configuratie

**Bestand:** `src/lib/shell/sidebar-config.ts`
```typescript
import {
  Megaphone, FileText, Building2, Target, Palette, Users,
  Package, Lightbulb, BookOpen, Scale, FlaskConical, Settings,
  HelpCircle,
} from "lucide-react";
import type { SidebarSection } from "@/types/shell";

export const sidebarSections: SidebarSection[] = [
  {
    // Top section — no header
    items: [
      { icon: Megaphone, label: "Active Campaigns", href: "/campaigns" },
      { icon: FileText, label: "Content Library", href: "/content-library" },
    ],
  },
  {
    label: "KNOWLEDGE",
    items: [
      { icon: Building2, label: "Brand Foundation", href: "/knowledge/brand-foundation", badge: 1 },
      { icon: Target, label: "Business Strategy", href: "/knowledge/business-strategy" },
      { icon: Palette, label: "Brandstyle", href: "/knowledge/brandstyle" },
      { icon: Users, label: "Personas", href: "/knowledge/personas" },
      { icon: Package, label: "Products & Services", href: "/knowledge/products" },
      { icon: Lightbulb, label: "Market Insights", href: "/knowledge/market-insights" },
      { icon: BookOpen, label: "Knowledge Library", href: "/knowledge/library" },
      { icon: Scale, label: "Brand Alignment", href: "/knowledge/brand-alignment", badge: 4 },
    ],
  },
  {
    label: "VALIDATION",
    items: [
      { icon: FlaskConical, label: "Research Hub", href: "/validation/research-hub" },
      { icon: Package, label: "Research Bundles", href: "/validation/research-bundles" },
      { icon: Settings, label: "Custom Validation", href: "/validation/custom" },
    ],
  },
];

export const utilitySidebarItems: SidebarSection = {
  items: [
    { icon: Settings, label: "Settings", href: "/settings" },
    { icon: HelpCircle, label: "Help & Support", href: "/help" },
  ],
};

export const NOTIFICATION_EVENT_CONFIG = [
  { type: "DATA_RELATIONSHIP_CREATED" as const, icon: "Link", bg: "bg-purple-100", iconColor: "text-purple-600" },
  { type: "RESEARCH_COMPLETED" as const, icon: "CheckCircle", bg: "bg-green-100", iconColor: "text-green-600" },
  { type: "FILE_UPLOADED" as const, icon: "Upload", bg: "bg-blue-100", iconColor: "text-blue-600" },
  { type: "MILESTONE_REACHED" as const, icon: "Trophy", bg: "bg-yellow-100", iconColor: "text-yellow-600" },
  { type: "COMMENT_ADDED" as const, icon: "MessageCircle", bg: "bg-gray-100", iconColor: "text-gray-600" },
  { type: "RESEARCH_PLAN_CREATED" as const, icon: "FileText", bg: "bg-green-100", iconColor: "text-green-600" },
  { type: "ASSET_STATUS_UPDATED" as const, icon: "RefreshCw", bg: "bg-orange-100", iconColor: "text-orange-600" },
  { type: "RESEARCH_INSIGHT_ADDED" as const, icon: "Lightbulb", bg: "bg-yellow-100", iconColor: "text-yellow-600" },
  { type: "NEW_PERSONA_CREATED" as const, icon: "UserPlus", bg: "bg-blue-100", iconColor: "text-blue-600" },
  { type: "NEW_RESEARCH_STARTED" as const, icon: "Play", bg: "bg-green-100", iconColor: "text-green-600" },
];
```

**Bestand:** `src/lib/shell/search-config.ts`
```typescript
import type { QuickAction } from "@/types/search";

export const quickActions: QuickAction[] = [
  { icon: "Sparkles", label: "Start New Research", description: "Create a research plan", color: "text-green-600", href: "/validation/research-hub" },
  { icon: "UserPlus", label: "Create Persona", description: "Add a new persona", color: "text-blue-600", href: "/knowledge/personas/new" },
  { icon: "Link", label: "View Relationships", description: "See data connections", color: "text-purple-600", href: "/knowledge/brand-alignment" },
];

export const goToItems = [
  { label: "Dashboard", href: "/" },
  { label: "Research Hub", href: "/validation/research-hub" },
  { label: "Brand Assets", href: "/knowledge/brand-foundation" },
  { label: "Personas", href: "/knowledge/personas" },
  { label: "Products & Services", href: "/knowledge/products" },
  { label: "Market Insights", href: "/knowledge/market-insights" },
];
```

**Bestand:** `src/lib/dashboard/thresholds.ts`
```typescript
// Platform-brede drempelwaarden (C-06 scoreColor variant voor dashboard)
export function getReadinessColor(percentage: number) {
  if (percentage >= 80) return { text: "text-green-600", bg: "bg-green-500", label: "Ready" };
  if (percentage >= 50) return { text: "text-yellow-500", bg: "bg-yellow-500", label: "Limited" };
  return { text: "text-red-500", bg: "bg-red-500", label: "Unusable" };
}
```

### Stap 2D — Zustand Stores

**Bestand:** `src/stores/useShellStore.ts`
```typescript
import { create } from "zustand";
import type { NotificationCategory } from "@/types/notifications";

interface ShellStore {
  // Search Modal
  isSearchOpen: boolean;
  searchQuery: string;
  openSearch: () => void;
  closeSearch: () => void;
  setSearchQuery: (q: string) => void;

  // Notification Panel
  isNotificationPanelOpen: boolean;
  notificationFilter: NotificationCategory | "All";
  showUnreadOnly: boolean;
  openNotifications: () => void;
  closeNotifications: () => void;
  setNotificationFilter: (f: NotificationCategory | "All") => void;
  toggleUnreadOnly: () => void;
}

export const useShellStore = create<ShellStore>((set) => ({
  // Search
  isSearchOpen: false,
  searchQuery: "",
  openSearch: () => set({ isSearchOpen: true, searchQuery: "" }),
  closeSearch: () => set({ isSearchOpen: false, searchQuery: "" }),
  setSearchQuery: (q) => set({ searchQuery: q }),

  // Notifications
  isNotificationPanelOpen: false,
  notificationFilter: "All",
  showUnreadOnly: false,
  openNotifications: () => set({ isNotificationPanelOpen: true }),
  closeNotifications: () => set({ isNotificationPanelOpen: false }),
  setNotificationFilter: (f) => set({ notificationFilter: f }),
  toggleUnreadOnly: () => set((s) => ({ showUnreadOnly: !s.showUnreadOnly })),
}));
```

**Bestand:** `src/stores/useDashboardStore.ts`
```typescript
import { create } from "zustand";

interface DashboardStore {
  // Onboarding
  showOnboarding: boolean;
  onboardingStep: 1 | 2 | 3;
  dontShowAgain: boolean;
  setOnboardingStep: (step: 1 | 2 | 3) => void;
  completeOnboarding: () => void;
  toggleDontShowAgain: () => void;
  setShowOnboarding: (show: boolean) => void;

  // Quick Start
  showQuickStart: boolean;
  quickStartCollapsed: boolean;
  dismissQuickStart: () => void;
  toggleQuickStartCollapse: () => void;
}

export const useDashboardStore = create<DashboardStore>((set) => ({
  // Onboarding
  showOnboarding: false,
  onboardingStep: 1,
  dontShowAgain: false,
  setOnboardingStep: (step) => set({ onboardingStep: step }),
  completeOnboarding: () => set({ showOnboarding: false }),
  toggleDontShowAgain: () => set((s) => ({ dontShowAgain: !s.dontShowAgain })),
  setShowOnboarding: (show) => set({ showOnboarding: show }),

  // Quick Start
  showQuickStart: true,
  quickStartCollapsed: false,
  dismissQuickStart: () => set({ showQuickStart: false }),
  toggleQuickStartCollapse: () => set((s) => ({ quickStartCollapsed: !s.quickStartCollapsed })),
}));
```

### Stap 2E — Shell Componenten Bouwen

> **Instructie voor Claude Code:** Bouw de volgende componenten met exact de design tokens uit de Implementation Guide. De tokens staan hieronder per component.

**Bestandenlijst (bouw in deze volgorde):**

| # | Bestand | Beschrijving |
|---|---------|-------------|
| 1 | `src/components/shell/SidebarItem.tsx` | Enkel nav item met icoon, label, badge, active state |
| 2 | `src/components/shell/SidebarSection.tsx` | Sectie header (optioneel) + items |
| 3 | `src/components/shell/CreateContentButton.tsx` | Groene CTA button |
| 4 | `src/components/shell/Sidebar.tsx` | Volledige sidebar: logo + CTA + secties + utility |
| 5 | `src/components/shell/Breadcrumb.tsx` | Breadcrumb navigatie |
| 6 | `src/components/shell/TopBar.tsx` | Header: breadcrumb, workspace, search trigger, icons |
| 7 | `src/components/shell/AppShell.tsx` | Hoofdlayout: sidebar + topbar + children |

**Design Tokens per Component:**

#### SidebarItem
```
Container: flex items-center gap-2 px-4 py-1.5 text-sm rounded-lg mx-2 cursor-pointer
Default:   text-gray-600 hover:bg-gray-100
Active:    bg-green-50 text-green-700 font-medium
Icon:      w-4 h-4 flex-shrink-0 (default: text-gray-400, active: text-green-600)
Label:     flex-1 truncate
Badge:     min-w-[18px] h-[18px] bg-orange-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center
```

#### Sidebar
```
Container:      w-[180px] bg-gray-50 border-r border-gray-200 flex flex-col flex-shrink-0 h-screen
Logo:           flex items-center gap-2 px-4 py-3 cursor-pointer (navigeert naar /)
Logo icon:      text-green-600 w-6 h-6 (Compass icoon)
Logo text:      text-sm font-semibold text-gray-900 → "Branddock"
CTA:            mx-3 mt-2 mb-4 bg-green-600 text-white text-sm font-medium py-2 px-3 rounded-lg text-center
Section header: px-4 pt-4 pb-1 text-[10px] font-semibold text-gray-400 uppercase tracking-wider
Utility:        mt-auto pb-3 border-t border-gray-200 pt-2
```

#### TopBar
```
Container:          h-12 bg-white border-b border-gray-200 flex items-center justify-between px-4
Breadcrumb:         text-xs text-gray-400, links hover:text-gray-600, separator text-gray-300, current text-gray-600 font-medium
Workspace:          text-sm font-medium text-gray-700 + chevron w-3.5 h-3.5 text-gray-400
Search trigger:     flex items-center gap-2 px-3 py-1 bg-gray-100 rounded-lg text-xs text-gray-400 hover:bg-gray-200
Search shortcut:    text-[10px] text-gray-300 bg-gray-200 px-1 rounded → "⌘K"
Help:               text-gray-400 hover:text-gray-600 text-xs flex items-center gap-1
Notification bell:  relative text-gray-400 hover:text-gray-600
Notification badge: absolute -top-1 -right-1 min-w-[16px] h-[16px] bg-red-500 text-white text-[9px] font-bold rounded-full
Avatar:             w-7 h-7 rounded-full bg-gray-300
```

#### AppShell
```
Container: flex h-screen bg-gray-50
Content:   flex-1 overflow-y-auto
```

**Structuur:**
```
┌──────────────────────────────────────────────┐
│ Sidebar (180px)  │  TopBar (h-12)            │
│  ┌─────────────┐ │  ┌──────────────────────┐ │
│  │ Logo        │ │  │ Breadcrumb  Actions  │ │
│  │ + Create    │ │  └──────────────────────┘ │
│  │             │ │  ┌──────────────────────┐ │
│  │ Campaigns   │ │  │                      │ │
│  │ Content Lib │ │  │   children (page)    │ │
│  │             │ │  │                      │ │
│  │ KNOWLEDGE   │ │  │                      │ │
│  │ Brand Found │ │  │                      │ │
│  │ Business St │ │  │                      │ │
│  │ ...         │ │  │                      │ │
│  │             │ │  │                      │ │
│  │ VALIDATION  │ │  │                      │ │
│  │ Research    │ │  │                      │ │
│  │ ...         │ │  │                      │ │
│  │─────────────│ │  │                      │ │
│  │ Settings    │ │  │                      │ │
│  │ Help        │ │  └──────────────────────┘ │
│  └─────────────┘ │                            │
└──────────────────────────────────────────────┘
```

### Stap 2F — Layout Integratie

**Bestand:** `src/app/layout.tsx`
```tsx
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AppShell } from "@/components/shell/AppShell";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Branddock",
  description: "Brand Strategy, Research & AI Content Platform",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
```

**Bestand:** `src/app/page.tsx` (tijdelijk — wordt Dashboard in Stap 4)
```tsx
export default function DashboardPage() {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
      <p className="text-sm text-gray-500 mt-2">
        Fase 11 — AppShell werkt! Dashboard content volgt in Stap 4.
      </p>
    </div>
  );
}
```

### ✅ Stap 2 Checklist
- [ ] Sidebar toont logo "Branddock" met groen icoon
- [ ] "+ Create Content" groene CTA zichtbaar
- [ ] 15 navigatie-items in 3 secties (2 top + 8 Knowledge + 3 Validation)
- [ ] Settings + Help onderaan met separator
- [ ] Badges zichtbaar (Brand Foundation: 1, Brand Alignment: 4)
- [ ] Active state: groene achtergrond + groene tekst op huidige route
- [ ] TopBar: breadcrumb, workspace naam, search trigger, bell, avatar
- [ ] Dashboard NIET in sidebar — logo klikt naar /
- [ ] Layout past zich aan: sidebar fixed, content scrollt

---

## STAP 3: SEARCH MODAL + NOTIFICATION PANEL

### Stap 3A — Keyboard Shortcut

**Bestand:** `src/lib/shell/keyboard-shortcuts.ts`
```typescript
"use client";
import { useEffect } from "react";
import { useShellStore } from "@/stores/useShellStore";

export function useKeyboardShortcuts() {
  const openSearch = useShellStore((s) => s.openSearch);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        openSearch();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [openSearch]);
}
```

### Stap 3B — Search Modal Component

**Bestand:** `src/components/shell/SearchModal.tsx`

**Design Tokens:**
```
Overlay:       fixed inset-0 bg-black/50 flex items-start justify-center pt-[20vh] z-50
Container:     bg-white rounded-xl w-[560px] shadow-2xl overflow-hidden
Search input:  w-full px-4 py-3 text-sm border-b border-gray-200 outline-none
Section head:  px-4 pt-3 pb-1 text-[10px] font-semibold text-gray-400 uppercase tracking-wider
Quick action:  flex items-center gap-3 px-4 py-2 hover:bg-gray-50 cursor-pointer
Go-to item:    flex items-center gap-3 px-4 py-2 hover:bg-gray-50 cursor-pointer
Footer:        flex items-center gap-4 px-4 py-2 border-t border-gray-200 text-[10px] text-gray-400
```

**Gedrag:**
- Opent via ⌘+K of klik op search trigger in TopBar
- Escape sluit modal
- Klik buiten modal sluit modal
- 3 Quick Actions (Sparkles groen, UserPlus blauw, Link paars)
- 6 Go To items (met grijze iconen)
- Footer: "↑↓ Navigate · ↵ Select"

### Stap 3C — Notification Panel Component

**Bestand:** `src/components/shell/NotificationPanel.tsx`

**Design Tokens:**
```
Container:     fixed top-12 right-0 w-96 h-[calc(100vh-3rem)] bg-white border-l border-gray-200 shadow-xl z-40 flex flex-col
Header:        flex items-center justify-between p-4 border-b border-gray-200
Title:         text-base font-semibold text-gray-900 → "Activity"
Mark all read: text-xs text-green-600 hover:text-green-700 font-medium
Clear all:     text-xs text-gray-400 hover:text-gray-600
Filter chips:  px-2.5 py-1 text-xs rounded-full (active: bg-green-100 text-green-700, inactive: bg-gray-100 text-gray-500)
Show unread:   w-3.5 h-3.5 rounded border-gray-300 text-green-600 checkbox
Item:          flex gap-3 px-4 py-3 border-b border-gray-50 hover:bg-gray-50 (unread: bg-blue-50)
Item icon:     w-8 h-8 rounded-full (per-type bg + iconColor)
Unread dot:    w-2 h-2 bg-blue-500 rounded-full
```

**10 Event Type → Icoon Mapping:**
```
DATA_RELATIONSHIP_CREATED  → Link         bg-purple-100  text-purple-600
RESEARCH_COMPLETED         → CheckCircle  bg-green-100   text-green-600
FILE_UPLOADED              → Upload       bg-blue-100    text-blue-600
MILESTONE_REACHED          → Trophy       bg-yellow-100  text-yellow-600
COMMENT_ADDED              → MessageCircle bg-gray-100   text-gray-600
RESEARCH_PLAN_CREATED      → FileText     bg-green-100   text-green-600
ASSET_STATUS_UPDATED       → RefreshCw    bg-orange-100  text-orange-600
RESEARCH_INSIGHT_ADDED     → Lightbulb    bg-yellow-100  text-yellow-600
NEW_PERSONA_CREATED        → UserPlus     bg-blue-100    text-blue-600
NEW_RESEARCH_STARTED       → Play         bg-green-100   text-green-600
```

**6 Filter Categorieën:** All, Brand Assets, Research, Personas, Strategy, Collaboration, System

### Stap 3D — API Endpoints

**Bestanden:**

| Bestand | Route | Methode | Beschrijving |
|---------|-------|---------|-------------|
| `src/app/api/notifications/route.ts` | `/api/notifications` | GET | Lijst met filters (category, unreadOnly, limit, offset) |
| `src/app/api/notifications/count/route.ts` | `/api/notifications/count` | GET | Unread count |
| `src/app/api/notifications/[id]/read/route.ts` | `/api/notifications/:id/read` | PATCH | Markeer als gelezen |
| `src/app/api/notifications/mark-all-read/route.ts` | `/api/notifications/mark-all-read` | POST | Alles gelezen |
| `src/app/api/notifications/clear/route.ts` | `/api/notifications/clear` | DELETE | Verwijder alles |
| `src/app/api/search/route.ts` | `/api/search` | GET | Globale zoekfunctie |
| `src/app/api/search/quick-actions/route.ts` | `/api/search/quick-actions` | GET | Quick actions |

**Zod Validatie:**
```typescript
// notifications query
z.object({
  category: z.nativeEnum(NotificationCategory).optional(),
  unreadOnly: z.coerce.boolean().optional(),
  limit: z.coerce.number().int().min(1).max(100).optional().default(50),
  offset: z.coerce.number().int().min(0).optional().default(0),
});

// search query
z.object({
  query: z.string().min(1).max(200),
  type: z.enum(["all", "brand_assets", "personas", "products", "insights", "campaigns"]).optional(),
  limit: z.coerce.number().int().min(1).max(50).optional().default(10),
});
```

### ✅ Stap 3 Checklist
- [ ] ⌘+K (of Ctrl+K) opent Search Modal
- [ ] Search Modal: input, 3 quick actions, 6 go-to items, footer
- [ ] Escape sluit Search Modal
- [ ] Klik op notification bell opent panel rechts
- [ ] Notification panel: 10 event types met correcte iconen en kleuren
- [ ] 6 filter categorieën werken
- [ ] "Show unread only" checkbox filtert
- [ ] Unread items: blauwe dot + bg-blue-50
- [ ] "Mark all read" + "Clear all" werken
- [ ] API endpoints retourneren correcte data

---

## STAP 4: DASHBOARD PAGINA

### Stap 4A — Dashboard API Endpoints

**Bestanden:**

| Bestand | Route | Methode |
|---------|-------|---------|
| `src/app/api/dashboard/route.ts` | `/api/dashboard` | GET — Volledige dashboard data |
| `src/app/api/dashboard/readiness/route.ts` | `/api/dashboard/readiness` | GET — Decision Readiness % |
| `src/app/api/dashboard/stats/route.ts` | `/api/dashboard/stats` | GET — 5 KPI stats |
| `src/app/api/dashboard/attention/route.ts` | `/api/dashboard/attention` | GET — Attention items |
| `src/app/api/dashboard/recommended/route.ts` | `/api/dashboard/recommended` | GET — AI aanbeveling |
| `src/app/api/dashboard/campaigns-preview/route.ts` | `/api/dashboard/campaigns-preview` | GET — Campaigns |
| `src/app/api/dashboard/preferences/route.ts` | `/api/dashboard/preferences` | GET + PATCH |
| `src/app/api/dashboard/quick-start/[key]/complete/route.ts` | `/api/dashboard/quick-start/:key/complete` | POST |

**Noot:** Voor de MVP retourneren de dashboard endpoints hardcoded demo data (de echte modules bestaan nog niet). De seed data bepaalt de waarden. Als de andere modules gebouwd worden, worden de endpoints aangesloten op echte queries.

**Demo data voor endpoints:**
```typescript
// GET /api/dashboard — retourneer:
{
  readiness: { percentage: 67, breakdown: { ready: 5, limited: 4, unusable: 3 } },
  stats: { brandAssets: 12, researchStudies: 8, personas: 4, products: 6, marketInsights: 15 },
  attention: [
    { id: "1", title: "Brand Promise needs research", description: "Low confidence — only AI exploration done", icon: "AlertTriangle", iconBg: "bg-orange-100", iconColor: "text-orange-600", actionType: "fix", actionLabel: "Fix >", actionHref: "/knowledge/brand-foundation/brand-promise" },
    { id: "2", title: "Mission Statement outdated", description: "Last updated 6 months ago", icon: "Clock", iconBg: "bg-orange-100", iconColor: "text-orange-600", actionType: "fix", actionLabel: "Fix >", actionHref: "/knowledge/brand-foundation/mission" },
    { id: "3", title: "No products defined yet", description: "Add products to enable targeting", icon: "Package", iconBg: "bg-green-100", iconColor: "text-green-600", actionType: "take_action", actionLabel: "Take Action", actionHref: "/knowledge/products" },
  ],
  recommended: { id: "rec-1", badge: "RECOMMENDED", title: "Validate your personas with interviews", description: "Your personas are based on AI exploration only. Schedule interviews to boost confidence to 80%+.", actionLabel: "Take Action", actionHref: "/validation/research-hub" },
  campaignsPreview: [
    { id: "camp-1", title: "Q1 Brand Awareness", type: "Strategic", status: "In Progress", deliverableProgress: 45 },
    { id: "camp-2", title: "Product Launch Social", type: "Quick", status: "Draft", deliverableProgress: 0 },
  ],
}
```

### Stap 4B — Dashboard Componenten

**Bouw in deze volgorde:**

| # | Bestand | Tokens referentie |
|---|---------|------------------|
| 1 | `DecisionReadiness.tsx` | Groot percentage (text-4xl font-bold) + progress bar (h-3 rounded-full) + breakdown (text-xs) |
| 2 | `DashboardStatsCards.tsx` | 5 cards in grid-cols-5, elk: icoon in gekleurde cirkel + value (text-2xl font-bold) + label (text-xs) |
| 3 | `AttentionList.tsx` + `AttentionItem.tsx` | Items met "Fix >" (oranje) of "Take Action" (groen) knoppen |
| 4 | `RecommendedAction.tsx` | Gradient card: bg-gradient-to-r from-green-50 to-green-100, border-green-200 |
| 5 | `QuickAccess.tsx` | 3 cards in grid-cols-3 |
| 6 | `ActiveCampaignsPreview.tsx` | Campaign items + "View All" + "Start New Campaign" |
| 7 | `OnboardingWizard.tsx` + `OnboardingStep.tsx` | 3-stap modal met dot indicators |
| 8 | `QuickStartWidget.tsx` + `QuickStartItem.tsx` | 4-item checklist, inklapbaar |
| 9 | `DashboardPage.tsx` | Container die alles samenbrengt |

**Decision Readiness Tokens:**
```
Container:    bg-white rounded-lg border border-gray-200 p-6
Title:        text-sm font-semibold text-gray-500 uppercase tracking-wide → "Decision Readiness"
Percentage:   text-4xl font-bold mt-2 (≥80: text-green-600 | 50-79: text-yellow-500 | <50: text-red-500)
Progress bar: w-full h-3 bg-gray-100 rounded-full mt-3, fill: h-3 rounded-full (zelfde kleuren)
Breakdown:    flex gap-4 mt-3 text-xs text-gray-500
```

**Stats Cards Tokens:**
```
Container: grid grid-cols-5 gap-4 mt-6
Card:      bg-white rounded-lg border border-gray-200 p-4
Icon box:  w-10 h-10 rounded-lg flex items-center justify-center
Value:     text-2xl font-bold text-gray-900 mt-2
Label:     text-xs text-gray-500 mt-0.5

5 cards:
  Building2    "Brand Assets"      bg-blue-50    text-blue-600
  FlaskConical "Research Studies"   bg-green-50   text-green-600
  Users        "Personas"          bg-purple-50  text-purple-600
  Package      "Products"          bg-orange-50  text-orange-500
  Lightbulb    "Market Insights"   bg-yellow-50  text-yellow-600
```

**Onboarding Wizard Tokens:**
```
Overlay:      fixed inset-0 bg-black/50 flex items-center justify-center z-50
Container:    bg-white rounded-xl w-[520px] p-8 text-center
Step dots:    active: w-2 h-2 rounded-full bg-green-600 | inactive: bg-gray-300
Next btn:     text-sm text-white bg-green-600 px-6 py-2 rounded-lg font-medium
Skip:         text-xs text-gray-400 hover:text-gray-600
Don't show:   flex items-center gap-2 mt-6 text-xs text-gray-400 justify-center
```

### Stap 4C — Dashboard Page Samenstellen

**Bestand:** `src/app/page.tsx` (vervangt tijdelijke versie)
```tsx
// Layout:
// ┌─────────────────────────────────────────────────────┐
// │ Decision Readiness (67%)                             │
// ├──────┬──────┬──────┬──────┬──────────────────────────┤
// │ Stat │ Stat │ Stat │ Stat │ Stat                     │  5 KPI cards
// ├──────┴──────┴──────┴──────┴──────────────────────────┤
// │ What Needs Your Attention    │ Quick Access           │  2 kolommen
// │  - Fix > item 1              │  [Card] [Card] [Card]  │
// │  - Fix > item 2              │                        │
// │  - Take Action item 3        │ Active Campaigns       │
// │                               │  Campaign 1            │
// │ Recommended Action            │  Campaign 2            │
// │  [gradient card]              │  [Start New Campaign]  │
// ├───────────────────────────────┴────────────────────────┤
// │ Quick Start Widget (indien niet dismissed)              │
// └────────────────────────────────────────────────────────┘
// + OnboardingWizard modal bij eerste bezoek
```

### ✅ Stap 4 Checklist
- [ ] Decision Readiness: 67% in geel, progress bar, breakdown (5 ready, 4 limited, 3 unusable)
- [ ] 5 KPI cards met correcte iconen, kleuren en demo waarden
- [ ] Attention list: 2× "Fix >" (oranje) + 1× "Take Action" (groen)
- [ ] Recommended Action: gradient card met badge + CTA
- [ ] Quick Access: 3 shortcut cards
- [ ] Active Campaigns: 2 demo campaigns + "View All" + "Start New Campaign"
- [ ] Onboarding Wizard: verschijnt bij eerste bezoek, 3 stappen, "Don't show again"
- [ ] Quick Start: 4 items, afvinkbaar, inklapbaar, verdwijnt bij 4/4

---

## STAP 5: TESTEN + AFRONDEN

### Volledige Acceptatiecriteria (uit Implementation Guide)

**AppShell & Sidebar:**
- [ ] Sidebar w-180px, fixed, scrollt niet mee
- [ ] Logo "Branddock" + groen Compass icoon → klikt naar /
- [ ] "+ Create Content" groene CTA
- [ ] 3 secties: top (2), KNOWLEDGE (8), VALIDATION (3)
- [ ] Settings + Help onderaan met border-t separator
- [ ] Active state: bg-green-50 + text-green-700
- [ ] Badges: Brand Foundation (1), Brand Alignment (4) — oranje circles
- [ ] Dashboard NIET in sidebar

**TopBar:**
- [ ] Breadcrumb (contextafhankelijk)
- [ ] Workspace naam + chevron
- [ ] Search trigger: "Search" + ⌘K badge
- [ ] Help toggle
- [ ] Notifications bell + rode badge (unread count)
- [ ] User avatar

**Search Modal:**
- [ ] ⌘+K opent, Escape sluit
- [ ] 3 Quick Actions met gekleurde iconen
- [ ] 6 Go To navigatie items
- [ ] Footer hints

**Notifications:**
- [ ] Panel rechts, 10 event types met correcte iconen/kleuren
- [ ] 6 filter chips
- [ ] "Show unread only" checkbox
- [ ] Unread: blauwe dot + bg-blue-50
- [ ] "Mark all read" + "Clear all"

**Dashboard:**
- [ ] Decision Readiness: percentage + bar + breakdown + correcte drempelkleuren
- [ ] 5 KPI cards
- [ ] Attention list met Fix/Take Action
- [ ] Recommended Action gradient card
- [ ] Quick Access 3 cards
- [ ] Active Campaigns preview
- [ ] Onboarding Wizard 3-stap modal
- [ ] Quick Start 4-item checklist

---

## VOLGENDE STAPPEN NA FASE 11

Na succesvolle implementatie van Fase 11:

1. **Fase 11 → Dashboard** (Stap 2 uit productie-implementatiepad) — De dashboard is al gebouwd, maar de data is hardcoded. Naarmate modules worden gebouwd, worden de endpoints aangesloten.

2. **Fase 1A → Brand Foundation** — Eerste echte module die in de AppShell draait. Implementation Guide: `30548b9c-6dc9-81a6-8b0a-dfa14413b50f`

3. **Fase 2+3 → Business Strategy + Brandstyle** — Volgende Knowledge modules.

**Implementatievolgorde (uit handover):**
```
1. ✅ AppShell + Sidebar + TopBar (Fase 11)    ← DIT PLAN
2.    Dashboard aansluiten (Fase 11)
3.    Brand Foundation (Fase 1A-1E)
4.    Business Strategy + Brandstyle (Fase 2-3)
5.    Personas (Fase 4)
6.    Products + Market Insights (Fase 5-6)
7.    Knowledge Library + Brand Alignment (Fase 7-8)
8.    Research & Validation (Fase 9)
9.    Campaigns & Content (Fase 10)
10.   Settings & Help (Fase 12)
```

---

*Einde implementatieplan — 13 februari 2026*
*~600 regels, 5 stappen, volledige specs voor AppShell + Dashboard*
