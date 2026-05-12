---
id: 2026-05-12-cron-infra
title: Cron-infra keuze — Vercel Cron vs Upstash QStash voor scheduled triggers
status: accepted
date: 2026-05-12
supersedes: -
superseded-by: -
---

# Context

Brandclaw transformatie introduceert meerdere scheduled triggers:
- **Strategy Analyst weekly run** (`strategy-analyst-stub` Phase C, cron `0 9 * * 1` Monday 9am UTC)
- **Competitor monitoring** (future `brandclaw-competitor-monitoring`, refresh-cadence 4-6h)
- **Bestaande jobs runner** (`/api/cron/run-jobs` every minute — sinds sprint #1)

Roadmap regel 55-56 vermeldt expliciet: "ADR voor Fase 4 cron-infra (Vercel Cron vs Upstash QStash) — vóór Brandclaw monitoring start". Pre-launch scope-uitbreiding 2026-05-12 trekt strategy-analyst-stub pre-launch waardoor deze ADR-trigger nu actueel is.

**Bestaande infrastructuur**:
- `/api/cron/run-jobs/route.ts` — werkt sinds sprint #1, `CRON_SECRET` Bearer-token auth
- `vercel.json` — cron-entry every minute
- Pattern is stabiel + getest in productie-equivalent (dev + staging-deploys)

**Vereisten van komende Brandclaw triggers**:
- Cron-string scheduling (Monday 9am, every 4h, etc.) — niet delayed-message queue
- Per-workspace iteratie binnen één invocation (10-20 workspaces in MVP-pilot)
- Idempotency op niveau van workspace × periode (één Analyst-run per week per workspace)
- Cost binnen pre-launch budget: cron-trigger zelf is ≤ $5/maand acceptabel

**Out-of-scope voor deze ADR**: workflow-orchestration (e.g. Temporal, Inngest) — overkill voor weekly batch-trigger op 10-20 workspaces. Geen acute trigger om vanaf Vercel platform te migreren.

# Decision

**Continue met Vercel Cron** voor alle pre-launch en post-launch scheduled triggers tot een van de re-evaluation-triggers (sectie Notes) hit.

Concrete impact:
- Strategy-analyst-stub Phase C voegt entry toe aan bestaande `vercel.json` cron-config
- Brandclaw competitor-monitoring (post-launch Fase 4) idem
- Geen vendor-toevoeging (Upstash QStash), geen migratie van `run-jobs`

# Y-statement

In de context van **Branddock pre-launch met bestaande Vercel Cron infrastructure**, facing **cron-keuze voor Brandclaw scheduled triggers**, I decided **Vercel Cron te continueren** to achieve **vendor-eenvoud + hergebruik van werkende CRON_SECRET pattern + zero extra dependencies**, accepting tradeoff **lock-in op Vercel platform + minder retry-granularity dan QStash**.

# Consequences

## Positief
- **Zero migration cost** — bestaande `/api/cron/run-jobs` blijft zoals het is
- **Vendor-eenvoud** — geen extra dashboard/auth te onderhouden naast Vercel
- **Cost** — Vercel Cron is gratis op Hobby tot 100 invocations/dag; vanaf Pro tier ($20/mnd) onbeperkt. Pre-launch op Hobby kan, post-launch sowieso Pro.
- **Auth-pattern hergebruik** — `Authorization: Bearer ${CRON_SECRET}` werkt voor zowel run-jobs als nieuwe routes
- **Native cron-syntax** — `vercel.json` accepteert standaard cron-strings; geen aparte scheduler-DSL
- **Observability** — Vercel logs tonen elke cron-invocation; geen aparte monitoring-stack nodig

## Negatief / tradeoffs
- **Lock-in op Vercel** — bij eventual migratie naar self-hosted of andere PaaS moet cron-handling herontworpen worden. Mitigatie: cron-routes zelf zijn standaard HTTP-endpoints; alleen `vercel.json` cron-config is vendor-specifiek (~20 regels max).
- **Geen native retry-policy per job** — als cron-invocation faalt (timeout, 5xx), Vercel retried niet automatisch. De next-tick cron-call neemt het over via `run-jobs` queue-mechanisme. Voor strategy-analyst weekly: bij failure wacht volgende week of manual re-trigger. Mitigatie: monitoring + alerting op cron-failure rate.
- **Per-invocation timeout (Vercel Hobby 10s, Pro 60s)** — beperkt complexity van workload per cron-tick. Mitigatie: Strategy Analyst per-workspace concurrency-cap (één run tegelijk), workspace-iteratie via queue ipv synchroon in cron-handler.
- **Geen delayed-message queue** — als Brandclaw ooit "schedule deze actie voor over 6 uur" nodig heeft (non-cron timing), Vercel Cron levert dat niet. Niet relevant voor huidige use-cases (alle scheduled werk is cron-string-based).

## Neutraal
- Cost-budget Fase 4 monitoring (zie `docs/audits/2026-05-08-competitor-monitoring-cost-model.md`) gaat over AI-call cost, niet cron-trigger cost — Vercel Cron heeft 0 directe AI-cost-impact
- Failure-recovery via `run-jobs` queue blijft de pattern voor heavy work (cron is alleen trigger, niet uitvoerder)

# Alternatives considered

## Upstash QStash

**Voor**:
- Vendor-agnostisch (HTTPS-callback naar elke URL — werkt buiten Vercel)
- Configurable retry-policy met DLQ (Dead Letter Queue)
- Delayed message scheduling (niet alleen cron-strings)
- $1/100k berichten — extreem goedkoop voor lage volumes

**Tegen** (waarom NIET gekozen):
- **Duplicate vendor-overhead** — extra dashboard, signed-request verification (HMAC), aparte auth
- **Bestaande infra werkt al** — `run-jobs` + `CRON_SECRET` pattern is in productie equivalent stabiel; switchen creëert migration-tax zonder evidente baat
- **Pre-launch retry-features overkill** — Strategy Analyst weekly + competitor-monitoring 4-6h hebben geen need voor sub-minuut retry-precision. Bij failure wacht next-tick.
- **DLQ pre-launch overkill** — geen evidence dat cron-jobs zo vaak falen dat DLQ-pattern nodig is. Vercel logs zijn voldoende monitoring.

## Inngest

**Voor**:
- Event-driven workflow-orchestration met state-management
- Built-in retry + fan-out + step-functions
- Generous free tier (50k events/maand)

**Tegen** (waarom NIET gekozen):
- **Overkill voor cron-trigger gebruik** — Inngest schittert bij multi-step workflows met persistent state, niet bij eenvoudige weekly batch-triggers
- **Steepere learning curve** — eigen SDK + concepten (functions, events, steps) vs Vercel Cron's drie regels JSON
- **Vendor-coupling sterker dan QStash** — Inngest functions zijn niet plain HTTP-routes; migratie is moeilijker

## Self-hosted cron (e.g. node-cron in een long-running server)

**Voor**:
- Maximaal control, geen vendor

**Tegen** (waarom NIET gekozen):
- **Vereist server-component** die continu draait — botst met serverless-architectuur (Vercel functions schalen naar 0)
- **Reliability-overhead** — wie zorgt dat de cron-server up is? Recovery na crash?
- **Operationele complexiteit** voor solo-team met AI — niet de juiste prio in pre-launch

# Notes

**Re-evaluation triggers** (wanneer deze ADR herzien moet worden):

1. **Vercel-migratie**: als project van Vercel afgaat (kostentechnisch of policy-reden), cron-infra heroverwegen. QStash dan natural fallback (HTTPS-callback werkt overal).
2. **Cron-job-failures > 5%/maand**: als monitoring laat zien dat Vercel Cron-invocations onbetrouwbaar zijn, QStash retry-policy + DLQ overwegen.
3. **Delayed-message use-case ontstaat**: als ooit "schedule deze actie voor over X uur" nodig wordt (non-cron timing — bv. follow-up reminder, deferred email), QStash native fit.
4. **Pro-tier cost-explosie**: als cron-job aantal > 1000/dag wordt, Vercel Pro Plan limit raakt; QStash $1/100k berichten dan goedkoper.
5. **Workflow-orchestration scope**: als post-launch Brandclaw multi-step workflows nodig heeft (input van A → wait → step B → fan-out → aggregate), Inngest of Temporal evalueren.

**Implementatie-pattern voor nieuwe cron-routes**:

```typescript
// src/app/api/cron/<job-name>/route.ts
import { NextRequest, NextResponse } from 'next/server';

function isAuthorized(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return process.env.NODE_ENV !== 'production';
  return request.headers.get('authorization') === `Bearer ${secret}`;
}

export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  // ... job logic
  return NextResponse.json({ ok: true });
}
```

**vercel.json cron-entry pattern**:

```json
{
  "crons": [
    { "path": "/api/cron/run-jobs", "schedule": "* * * * *" },
    { "path": "/api/cron/brandclaw-strategy-analyst", "schedule": "0 9 * * 1" }
  ]
}
```

**Bestaande gebruik**:
- `/api/cron/run-jobs` (every minute) — agent-jobs processor sinds sprint #1
- Toekomstig: `/api/cron/brandclaw-strategy-analyst` (Monday 9am UTC) — strategy-analyst-stub Phase C
- Toekomstig: `/api/cron/brandclaw-competitor-refresh` (every 4h) — competitor-monitoring post-launch

**Cross-references**:
- Bestaand implementatie: `src/app/api/cron/run-jobs/route.ts`
- Cost-model competitive: `docs/audits/2026-05-08-competitor-monitoring-cost-model.md`
- Strategy Analyst stub: `tasks/strategy-analyst-stub.md` Phase C
- Roadmap pending-ADRs: `roadmap.md` regel 55-56
