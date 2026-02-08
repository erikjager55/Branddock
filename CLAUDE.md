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

## Current Sprint
Sprint 1 — Project Setup & Foundation
- [x] Project initialization
- [ ] Database setup (Prisma + Supabase)
- [ ] Auth (NextAuth v5 + OAuth)
- [ ] Base layout (Sidebar + TopBar)
- [ ] Zustand stores (UI, Auth, Workspace)
