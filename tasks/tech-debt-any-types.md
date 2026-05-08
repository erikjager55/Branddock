---
id: tech-debt-any-types
title: 146 `: any` type annotations opruimen
fase: pre-launch
priority: now
effort: 1-2 dagen (auto-mode kandidaat)
owner: claude-code
status: in-progress
created: 2026-05-07
completed: -
related-adr: 2026-05-08-fval-output-schema-bevindingen, 2026-05-08-locale-routing-brand-voice
related-spec: tasks/_drafts/idea-brand-control-program.md
worktree: -
---

## Update 2026-05-08 — pre-launch promotion + scope-herijking

Opgenomen als **Phase 0 voorloper** in Brand Control Program (zie `tasks/_drafts/idea-brand-control-program.md`).

**Reden**: Phase 1+ van het programma breidt het Prisma-schema uit met `BrandVoiceguide.contentLocale` (ADR-3), `ContentReviewLog`, `BrandReviewFinding` (ADR-1) en `StrategyObservation` (ADR-2 volgt). Bestaande `: any` in API-routes en hooks zijn de hot paths voor schema-evolutie — runtime-bugs tijdens schema-extensie zijn een reëel risico zonder strict-types op deze laag.

**Cluster-prioriteit (gewijzigd t.o.v. originele plan)**: API/hooks/lib/ai eerst, dan rest. Concreet:
1. `src/app/api/**/*.ts` — schema-extensie consumers
2. `src/features/**/hooks/*.ts` — TanStack Query consumers
3. `src/features/**/api/*.ts` — fetcher-laag
4. `src/lib/ai/**/*.ts` — AI provider clients
5. Rest verspreid

L2 supervised auto-mode blijft passend; clusters 1-3 vereisen extra zorg vanwege schema-aanraking.

# Probleem

Codebase telt nog 146 `: any` type annotations in 68 bestanden (parameters/variabelen). `as any` casts zijn al opgeruimd (47 → 0 in src/). Resterend `: any` ondermijnt type-safety en is op termijn een anti-pattern in CLAUDE.md verboden patronen lijst.

# Voorstel

Systematisch elke `: any` vervangen door `unknown`, proper type, of generics. Per cluster (~10-20 stuks) een batch. Werk in `--permission-mode auto` (L2 supervised) — type-fix is laag-risico, deterministisch, hooks bewaken kwaliteit.

# Acceptatiecriteria

- [ ] Initial baseline-count: `grep -rn ": any" src/ | wc -l` ≤146
- [ ] Per cluster: 10-20 fixes per commit (granulair voor reviewability)
- [ ] Geen `unknown` met onveilige cast — als type echt onkenbaar, document waarom
- [ ] Generics waar mogelijk (bv functies met flexible inputs)
- [ ] `npx tsc --noEmit` 0 errors na elke cluster
- [ ] Smoke-test runtime werking na high-impact clusters (bv API routes)
- [ ] **Final**: `grep -rn ": any" src/ | wc -l` = 0 (of <10 met expliciete justificatie per overgebleven case)
- [ ] Geen impact op productie-functionaliteit
- [ ] Eslint regel `@typescript-eslint/no-explicit-any` van warn → error op `src/`

# Bestanden die ik aanraak

68 bestanden — varieert. Hoog-impact clusters eerst:
- `src/lib/ai/**/*.ts` (~15 stuks) — AI providers
- `src/lib/learning-loop/**/*.ts` (~10 stuks) — recent gebouwd
- `src/features/*/api/*.ts` (~20 stuks) — API client functions
- `src/features/*/hooks/*.ts` (~15 stuks) — TanStack Query hooks
- Rest verspreid

# Bestanden die ik NIET aanraak

- Type-tests (opzettelijke `any` voor testing edge cases)
- Generated code (`prisma/generated/**`) — Prisma genereert dit
- 3rd party type stubs

# Smoke test plan

Per high-impact cluster:
1. Voor cluster: `git diff --stat` toont aangeraakte files
2. `npx tsc --noEmit` 0 errors
3. Voor AI-cluster: trigger 1 AI-call, verify response shape klopt
4. Voor API-cluster: smoke-test 3 random endpoints (GET + POST)
5. Voor hooks-cluster: laad 3 willekeurige UI-pagina's met TanStack Query
6. Final: full E2E critical-flow test (`npm run test:e2e -- --grep critical-flow`)

# Risico's

- **Hidden runtime types**: `any` gemaskeerd dat type eigenlijk fout was. Mitigatie: per cluster smoke-test runtime
- **Cascading type errors**: 1 fix triggert 5 nieuwe errors. Mitigatie: rollback cluster, refactor met breder type-systeem
- **Auto-mode te aggressief**: schiet door scope. Mitigatie: cluster-grenzen vooraf bepalen, hard limit op aangeraakte files per run
- **API contract breken**: backend `any` was per ongeluk forgiving. Mitigatie: API-cluster eerst lokaal testen voor commit

# Out of scope

- Generics-introductie waar geen `any` zat (separate refactor)
- React hooks generic type-inferentie verbeteren
- 3rd party type stubs schrijven voor untyped dependencies
- TypeScript strict-mode flags verder aanscherpen (`noUncheckedIndexedAccess` etc.)

# Notes

Strategy:
1. Run `grep -rn ": any" src/ -l | head -20` voor file-list
2. Cluster files op directory (alle hooks samen, alle api samen)
3. Per cluster: open files, replace `: any` met `: unknown` als minimum, refine waar context het toelaat
4. Run hooks na elke save (PostToolUse via week-3 setup)
5. Commit per cluster

Goede L2 auto-mode kandidaat omdat:
- Geen scope-onzekerheid
- Geen externe service-calls
- Hooks bewaken type-check + lint na elke edit
- Per cluster 30-60 min werk → past in 1 sessie van 4u

## Voortgang

Baseline bij start van uitvoering: **118 occurrences in 59 files** (lager dan task-file's 146 — eerdere clusters/sessies hadden al wat opgeruimd).

| Sessie | Cluster | Files | Δ | tsc | Commit |
|---|---|---|---|---|---|
| 2026-05-08 | 1 — types | 8× `src/types/*` + cascade `FilterPanel.tsx` | -13 | 0 errors | `e4cd4cd` |
| 2026-05-08 | 2 — utils + services | `logger.ts`, `FilterService.ts` | -9 | 0 errors | `8cb1eb2` |
| 2026-05-08 | 3 — strategy-tools + white-label | 5 files + `AssetSelectionModal` export | -5 | 0 errors | `8e0d00e` |
| | **Stand** | | **91** | | |

**Type-bugs blootgelegd onder `any`** (waardevol bijproduct):
1. `selectedAssets: any[]` in `FrameworkWorkspace.handleSelectMultipleAssets` verborg dat 'file'-typed `AssetOption` entries een runtime-mismatch zouden veroorzaken (gemapte `Asset.type` ondersteunt geen 'file'). Fix: filter via type-predicate vóór map.
2. `client: any` in `ClientManagementPage.AddClientModal.onAdd` verborg dat formData de `createdAt/updatedAt/projectsCount/strategiesCount` velden van `Client` mist. Fix: `Omit<Client, 'id' | 'createdAt' | 'updatedAt' | 'projectsCount' | 'strategiesCount'>` als prop-type.

**Resterende clusters** (91 occurrences):
- `src/components/canvases` — 14 files, biggest. Canvas preview/render-laag, raakt UI hot path. Smoke-test per file aangeraden.
- `src/app/api` — 10 files. Route handlers, hoog impact. Smoke-test per route na fix.
- `src/lib/ai/**` — verspreid. AI-clients, providers.
- `src/lib/learning-loop/**` — recent gebouwd, types waarschijnlijk al goed gedefinieerd, verbeteringen klein.
- `src/features/*/api`, `src/features/*/hooks` — TanStack Query hooks, API client functions.

Plus: `Record<string, any>` en `<T = any>` patronen die buiten de `: any` literal-grep vallen, maar wel onder de bedoeling van de task — eindig daarop expliciet aan het eind (separate cluster).

**Pattern-gids voor volgende sessie**:
- `icon: any` → `LucideIcon` (uit `lucide-react`)
- `data?: any`, `error?: any`, `value: any` → `unknown` — dwingt narrowing bij callsite
- `(args: any) => ...` → echte type uit caller, of `unknown` als de callsite het naderhand narrowt
- `<T = any>` → vaak laat staan (TS conventie voor flexibele defaults), maar onderzoek per geval
- `Record<string, any>` → `Record<string, unknown>` — bijna altijd veilig
- Eslint regel `@typescript-eslint/no-explicit-any` blijft op `warn` tijdens uitvoering, escaleren naar `error` als laatste actie wanneer baseline 0 is.
