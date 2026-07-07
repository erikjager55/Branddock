# Branddock — Claude Code Context

> **Laatst bijgewerkt**: 2026-05-07 (volledig herschreven van 2323 → 270 regels tijdens docs-migratie week 1).
> **Geschiedenis**: 217+ historische entries in `docs/changelog.md`. Originele versie in `docs/archive/old-lists/CLAUDE-original-2026-05-07.md`.
> **Onboarding**: nieuwe sessie? Lees ook `gotchas.md` en `START_HERE.md`.

---

## Project

Branddock is een SaaS-platform voor **brand strategy, research validatie en AI content generatie**. Eén workspace bevat de complete merk-DNA (12 canonical brand assets, brand voice, brandstyle, personas, producten, concurrenten, trends), die via een gelaagde context-stack in alle AI-calls wordt geïnjecteerd.

**Strategische richting**: transformatie naar **Brandclaw** (autonome marketing-loop) in stappen post-launch.
**Status**: pre-launch, alles draait localhost. Stripe + Vercel deployment in voorbereiding.
**Voorheen**: Brandshift.ai / ULTIEM.

---

## Tech stack

- **Framework**: Next.js 16.2.9 (hybride SPA), React 19
- **Styling**: Tailwind CSS 4
- **Database**: PostgreSQL 17, Prisma 7.4 (vereist `@prisma/adapter-pg` + `pg`), pgvector
- **Auth**: Better Auth (emailAndPassword + organization plugin + Google/Microsoft/Apple OAuth)
- **State**: Zustand 5 (~18 stores), TanStack Query 5, React Context (~12 providers)
- **Icons**: Lucide React (geen emoji's)
- **Package manager**: npm

## Architectuur

**Hybride Next.js SPA**: Next.js als framework, UI volledig client-side via switch statement in `src/App.tsx`.

- Entry: `src/app/layout.tsx` → `src/app/page.tsx` (`'use client'`) → `<AuthGate>` → `src/App.tsx`
- **Routing voor pagina's**: `activeSection` state → `renderContent()` switch in App.tsx (GEEN App Router voor pagina's)
- Nieuwe pagina = case toevoegen in switch statement
- API routes gebruiken wél Next.js App Router (`src/app/api/`)
- `src/main.tsx` bestaat maar wordt NIET gebruikt

**Multi-tenant**: Organization (DIRECT of AGENCY) → Workspace → User via OrganizationMember (4 rollen: owner/admin/member/viewer).
**Workspace resolution**: sessie-based (`activeOrganizationId` → workspace via `workspace-resolver.ts`). Cookie `branddock-workspace-id` voor switching. **Geen env var fallback meer.**

---

## Workflow regels

### Planning
- **Plan-mode default voor 3+ stappen of architecturale impact.** Plan moet bevatten: scope, file-list, acceptatiecriteria, smoke-test, out-of-scope. User approval vóór uitvoering.
- **Eén taak = één task-file** in `tasks/<id>.md` met gestandaardiseerd template (zie `tasks/_template.md`). Geen werk zonder task-file (uitzondering: bugfixes <30 min).
- **Worktree per taak (verplicht bij code-wijzigingen).** Elke code-wijziging die je commit hoort in een **eigen worktree** met precies **één Claude-sessie**. De main-worktree (`branddock-app`) is voor coördineren/reviewen/lezen/docs — niet voor feature-commits. Spin er één op met `scripts/dev/worktree.sh <task-id>` (regelt branch vanaf origin/main + `.env.local` + `npm ci` + `prisma generate`). Naming `branddock-<id>`, file-ownership vooraf in task-file. **De `session-guard` hook blokkeert branch-switch/reset/rebase als er al een levende sessie in dezelfde worktree draait** (`.claude/hooks/session-guard.sh`) — geborgd n.a.v. de multi-sessie-churn van 2026-07-07 (zie `gotchas.md`).
- **ADR voor non-triviale architectuur-beslissingen** in `docs/adr/<datum>-<id>.md`.

### Verification
- Nooit "done" melden zonder bewijs. Minimum: `npx tsc --noEmit` 0 errors.
- Na UI-changes: beschrijf wat de gebruiker verwacht te zien.
- Pre-commit: type-check + lint moeten groen.

### Bug fixing
- Trace root-cause vóór fix. Geen workarounds zonder expliciete vlag.
- Na niet-evidente bug: append lesson aan `gotchas.md` met datum + wat ging mis + regel.

### Task afronding
- **Trigger**: gebruiker zegt "Ik ben klaar. Voer task-finalize skill uit."
- Skill (`.claude/skills/task-finalize/SKILL.md`) voert uit: 2 parallelle code-reviewer subagents in loop tot clean (max 5 iteraties), quality gates (tsc + lint + smoke), task status → done, changelog entry, conventional commit.
- Voor bugfixes <30 min: skip skill, alleen commit.

### Stop-and-ask
- Nieuwe scope buiten task-file → stop
- Onbekende infra/service → stop
- Test fail die niet door 1 retry oplost → stop
- Externe service down → stop

---

## Conventies

### Code stijl
- TypeScript strict — **geen `any` types**, gebruik `unknown` of proper type
- Functies <50 regels
- Functioneel React met hooks
- Geen comments die uitleggen wat code doet — alleen *waarom* bij niet-evident
- Loading + error states verplicht in UI componenten
- Geen fetch loops — batch requests
- React.memo voor dure re-renders, lazy load wat niet meteen zichtbaar is

### Documentatie
- Documentatie: Nederlands. Code/interfaces: Engels.
- JSDoc op alle exported functies en componenten

### UI patterns (verplicht)
- **Lees `PATTERNS.md`** voor verplichte primitives, design tokens, verboden patronen
- Elke pagina MOET `PageShell` + `PageHeader` gebruiken
- Imports via `@/components/ui/layout` en `@/components/shared`
- Design tokens: `src/lib/constants/design-tokens.ts` is **single source of truth**
- Lucide React iconen, **nooit emoji's**
- Sidebar: w-72 (288px), active state `bg-emerald-50 text-emerald-700`
- Primary kleur: `#1FD1B2` via CSS var `--primary`

### AI calls
- Altijd via `src/lib/ai/` — gebruik `openaiClient`, `anthropicClient`, `geminiClient`
- **NOOIT direct OpenAI/Anthropic/Gemini SDK importeren in componenten**
- Brand context via `getBrandContext(workspaceId)` (5-min cache)

### API conventions
- Loading + error state handling in consuming UI verplicht
- Server-side cache invalidation: elke mutatie route (POST/PATCH/DELETE) MOET `invalidateCache(cacheKeys.prefixes.MODULE(workspaceId))` aanroepen
- PDF parsing: `unpdf` (server-safe), NIET `pdf-parse` (worker crashes in Next.js 16)

### Tailwind 4 caveats
- `src/index.css` is een gecompileerde, gecommitte output. Veel teal/utility-klassen ontbreken
- Voor missende utilities: append regel aan `src/index.css` of gebruik inline `style={{ ... }}` of swap naar `bg-primary`
- `min-h-0` werkt niet door purge — gebruik `style={{ minHeight: 0 }}`

---

## Quality gates (geautomatiseerd)

| Gate | Wanneer | Mechanisme |
|---|---|---|
| Type-check | Na elke Edit | PostToolUse hook → `npx tsc --noEmit` |
| Lint | Na elke Edit | PostToolUse hook → `eslint --fix` |
| 2-subagent review | Bij task-finalize | `task-finalize` skill |
| Quality gates | Bij task-finalize | Skill: tsc + lint + smoke |
| E2E smoke | Pre-merge | `npm run test:e2e -- --grep critical-flow` |

---

## AI providers

| Provider | Default voor | SDK |
|---|---|---|
| Anthropic Claude | exploration, persona chat, F-VAL judge, campaign strategy | `@anthropic-ai/sdk` |
| OpenAI | content generation, embeddings, image (DALL-E) | `openai` |
| Google Gemini | product analyse, foto generatie, vision | `@google/genai` |
| fal.ai | image (FLUX/Imagen/Recraft/Ideogram), video (Kling/Veo/Seedance/LTX) | `@fal-ai/client` |
| ElevenLabs | TTS, brand voices | `elevenlabs` |
| Replicate | LoRA training (consistent models) | `replicate` |

Per-feature model-selectie via `WorkspaceAiConfig` model + Settings → AI Models UI (developer-only).

---

## Common commands

```bash
# Dev
npm run dev

# Database
npx prisma db push
npx prisma generate
DATABASE_URL="postgresql://erikjager:@localhost:5432/branddock" npx tsx prisma/seed.ts

# Re-analyse één workspace-brandstyle (DESTRUCTIEF — wist reviews/edits van die styleguide)
npx tsx scripts/rescrape-brand.ts <workspaceNameBevat>

# Type check
npx tsc --noEmit

# Tests
npm run test:e2e
npm run test:e2e -- --grep "Performance"

# Inspect DB
/opt/homebrew/opt/postgresql@17/bin/psql postgresql://erikjager:@localhost:5432/branddock
```

---

## Environment variables

**Vereist**:
```
BETTER_AUTH_SECRET=<base64>
BETTER_AUTH_URL=http://localhost:3000
DATABASE_URL=postgresql://erikjager:@localhost:5432/branddock
OPENAI_API_KEY=
ANTHROPIC_API_KEY=
GEMINI_API_KEY=
TOKEN_ENCRYPTION_KEY=<voor OAuth tokens — back up zorgvuldig>
```

**Optioneel** (per-feature): `GOOGLE_CLIENT_ID/SECRET`, `MICROSOFT_CLIENT_ID/SECRET`, `APPLE_CLIENT_ID/SECRET`, `ELEVENLABS_API_KEY`, `FAL_KEY`, `RUNWAYML_API_SECRET`, `EXA_API_KEY`, `S2_API_KEY`, `ARENA_API_TOKEN`, `EMAILIT_API_KEY`, `UPSTASH_REDIS_REST_URL`, `POSTHOG_API_KEY`, `CRON_SECRET`, `WEBHOOK_TRIGGER_SECRET`, `DEVELOPER_EMAILS`, `APIFY_TOKEN` (competitor scraping-fallback, fail-fast at startup).

---

## Waar vind ik wat?

| Vraag | Bestand |
|---|---|
| Wat moet ik vandaag doen? | `START_HERE.md` |
| Open werk + prioritering | `roadmap.md` |
| Actieve taak details | `tasks/<id>.md` |
| Wat is gebouwd? | `docs/changelog.md` |
| Architecturale beslissingen | `docs/adr/` |
| Feature specs | `docs/specs/` |
| Hoe-doe-je-X | `docs/playbooks/` |
| UI patterns | `PATTERNS.md` |
| Lessons learned | `gotchas.md` |
| Prisma 7 specifics | `prisma/CLAUDE.md` |
| API routes referentie | `docs/api-routes.md` (te maken) |

---

## Verboden patronen (top 10)

1. **`any` type** — gebruik `unknown` of proper type
2. **Direct AI SDK in componenten** — altijd via `src/lib/ai/`
3. **Mock data fallbacks in productie code** — alleen contexts mogen fallback hebben
4. **`pdf-parse` library** — gebruikt `unpdf`, pdf-parse v1+v2 crashed in Next.js 16
5. **Inline styles voor reguliere utilities** — uitzondering: Tailwind 4 purge issues + custom colors
6. **Emoji's in UI of code** — Lucide icons
7. **`--no-verify` op git commits** — fix de hook, niet bypassen
8. **Force push naar main/master**
9. **Workspace ID uit env var** — altijd uit sessie via `useWorkspace()` of `resolveWorkspaceId()`
10. **API routes zonder cache invalidation na mutaties** — `invalidateCache(cacheKeys.prefixes.MODULE(workspaceId))` is verplicht

---

## Persona/agent etiquette

- Bij elke sessie-start: lees dit bestand + `gotchas.md` + `START_HERE.md`
- Bij ambiguïteit: vraag, niet aannemen
- Bij verschillende benaderingen: presenteer beide met trade-offs
- Geen "Ik heb de code geüpdatet" zonder file + change te specificeren
- Commits altijd via HEREDOC voor multi-line messages

---

## Workflow modes

| Modus | Wanneer | Setup |
|---|---|---|
| **L1 Assistive** | Default — complex multi-file werk | Plan-mode → user approval → execute |
| **L2 Supervised auto** | Routine taken (any-type opruimen, doc-sync) | `--permission-mode auto`, jij houdt oog |
| **L3 Routines** | Nightly werk (triage, doc-sync, dependency PRs) | Claude Code Routines met cost-budget |

---

## Stream Deck triggers

| Knop | Tekst | Wat |
|---|---|---|
| Start sessie | "Lees CLAUDE.md, gotchas.md en START_HERE.md..." | Sessie-opener |
| Werk overzicht | "Geef me een overzichtelijk overzicht..." | Open werk + keuze |
| **Plan feature** | "Run feature-planner subagent voor nieuw idee..." | PM-mode discovery → tasks/_drafts/idea-<id>.md |
| **Tech plan** | "Run technical-planner subagent op tasks/_drafts/idea-<id>.md..." | Promote idea naar uitvoerbare tasks/<id>.md |
| Bugfix | "Bug: [...]" | Quick fix |
| Finalize | "Ik ben klaar. Voer task-finalize skill uit." | End-of-task ceremonie |
| Commit | "Commit huidig werk met conventional-commit message..." | Tussentijdse commit |
| Retro | "Lees alle tasks/done/..." | Vrijdagretro |
| Doc-sync | "Run nightly-doc-sync routine..." | Autonome routine |
| Help | "Ik weet niet hoe verder. Hier is wat ik probeer: [...]" | Vastloop-hulp |

Volledige feature-discovery flow: `docs/playbooks/feature-discovery.md`.

---

## Genomen fundamentele beslissingen (samenvatting)

Volledige ADRs in `docs/adr/`. Snel referentie:

- **Auth**: Better Auth (open-source, native Prisma, organization plugin)
- **DB**: PostgreSQL + Prisma 7 met `@prisma/adapter-pg` + `pg` driver, pgvector voor embeddings
- **Architectuur**: Hybride SPA (geen App Router voor pagina-routing) — bewuste keuze
- **AI**: 3-provider strategie (Anthropic + OpenAI + Google), per-feature configureerbaar
- **F-VAL** (fidelity validation): 3-pijler scoring (style 35% / judge 45% / rules 20%) + STRICT mode rewrite
- **Brand Voice**: dedicated `BrandVoiceguide` model parallel aan Brandstyle (mirror-architectuur)
- **Brandclaw transformatie**: post-launch in stappen (Optie B uit PLAN-VAN-AANPAK.md)

---

## Niet vergeten

- **Pre-launch eindigt bij livegang** (Vercel + custom domain), niet bij 5 betalende klanten
- **Lange CLAUDE.md = onbetrouwbare instructies** — houd dit bestand <300 regels
- **Twee Claude-sessies in dezelfde werkboom = race condition** (gebeurde 2026-07-07: main-reset ↔ cherry-pick, AA-conflicten in de gedeelde index, verdwenen `node_modules/eslint` — zie `gotchas.md`). Nu geborgd: de `session-guard` hook detecteert een co-sessie (per-worktree heartbeat-lock) en blokkeert HEAD/branch-mutaties. Werk elke taak in een eigen worktree via `scripts/dev/worktree.sh <task-id>`.
- **Auto memory** in `~/.claude/projects/-Users-erikjager/memory/` is persistent — gebruik voor cross-sessie context
