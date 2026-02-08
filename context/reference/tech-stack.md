# Tech Stack — Branddock

**Laatste update:** 2026-02-03

## Overzicht

| Laag | Technologie | Rationale |
|------|------------|-----------|
| Frontend | Next.js 14, React, TypeScript, Tailwind CSS, shadcn/ui | Modern, type-safe, component-driven |
| Backend | Next.js API Routes, Prisma, PostgreSQL | Unified codebase, type-safe ORM |
| Infra | Vercel, Supabase, Redis | Serverless, managed services, caching |
| AI | Claude API (primair), OpenAI (fallback), Nanobanana | Multi-provider voor tekst, afbeeldingen, video |
| Betalingen | Stripe (primair), Mollie (NL/BE) | Internationaal + lokale betaalmethoden |
| Search | Meilisearch | Snelle full-text search, typo-tolerant |
| Real-time | Socket.io of Supabase Realtime | Live samenwerking |
| CRDT | Yjs (conflict resolution) | Concurrent editing zonder dataloss |

## Frontend Details

### Next.js 14
- App Router (niet Pages Router)
- Server Components als default
- Client Components alleen waar interactiviteit nodig is
- Suspense boundaries rond async components

### TypeScript
- Strict mode
- Geen `any` types
- Zod voor runtime validatie

### Tailwind CSS + shadcn/ui
- Geen inline styles
- Design tokens via Tailwind config
- shadcn/ui als component basis (niet eigen component library)

## Backend Details

### Prisma
- Altijd Prisma, nooit raw SQL
- Migrations via `prisma migrate`
- Altijd transactions voor multi-table updates

### API Routes
- Zod validation op alle input
- Consistent error format: `{ error: string, code: string }`
- Rate limiting per endpoint

## AI Integraties

### Claude API (primair)
- Strategie generatie
- Content creatie
- Analyse en suggesties

### OpenAI (fallback)
- Fallback bij Claude outage
- Specifieke taken waar GPT beter presteert

### Nanobanana
- Afbeelding generatie
- Video generatie
