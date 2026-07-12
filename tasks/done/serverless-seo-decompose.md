---
id: serverless-seo-decompose
title: SEO 8-staps-pipeline decompose → resumable queued job (A3-deel-2)
fase: pre-launch
priority: now
effort: 1-2 dagen
owner: claude-code
status: done
created: 2026-07-06
completed: 2026-07-06
worktree: "- (branddock-a3 opgeruimd)"
---

> **Doc-sync 2026-07-12**: volledig **gemerged op `main`** via PR #80 (merge
> `875a80f3`, 2026-07-06) + resumable-fix `0705eb87` (checkpoint + continuation).
> Op main geverifieerd aanwezig: `SeoGenerationJob`-model, `SEO_GENERATE`-handler,
> `seo_queued`-event in de orchestrator, `seo-progress`-route en de client-polling.
> De file stond stale op in-progress. Enige rest = de deploy-smoke (laatste
> acceptatie-item); die is verplaatst naar
> [`pre-launch-browser-smoke-batch`](pre-launch-browser-smoke-batch.md).

## Probleem
`runSeoPipeline` (async generator, 8 sequentiële stappen) draait **inline** in de SSE-routes
`studio/[deliverableId]/orchestrate` (maxDuration 300) en `campaigns/[id]/bulk-generate` (600),
via `orchestrateContentGeneration` → `yield* runSeoPipeline`. Worst-case ~1000s > Fluid 800s →
mid-pipeline gekild. Typische runs worden bij 300s al afgekapt.

## Aanpak — resumable job + polling
Eén **`SEO_GENERATE`**-job die per stap de state checkpoint naar een DB-record en een
continuation-job dispatcht als 'ie de tijd-budget (≈600s) nadert. Overleeft elke runtime.
De client polt het job-record i.p.v. de SSE-stream.

### State-model (`SeoGenerationJob`)
`{ id, deliverableId, workspaceId, status, currentStep(0..8), totalSteps, stepLabel,
seoInput(Json), optimizationGoals(String[]), contentType, state(Json = SeoPipelineState =
{outputs, accumulatedContext}), errors, startedAt, completedAt }`.
`SeoPipelineState` is volledig JSON-serialiseerbaar (alleen strings) → checkpoint-veilig.

### Files
1. `prisma/schema.prisma` — `SeoGenerationJob`-model + `SEO_GENERATE` enum + Workspace/Deliverable back-relaties. → Neon db-push.
2. `src/lib/ai/seo-pipeline.ts` — generator `runSeoPipeline` → **`runSeoGenerationStep(jobId)`**: laadt job, herbouwt context (via #3), draait stappen vanaf `currentStep+1` met budget + checkpoint, finaliseert (variant B + GEO-polish + persist DeliverableComponents) na stap 8, of dispatcht continuation. Geen `yield` meer; status naar het record.
3. `src/lib/ai/canvas-orchestrator.ts` — factor de SEO-context-assembly (`stack` + `voiceDirective` + `optimizationGoals` + `seoInput`) uit naar een herbruikbare `assembleSeoContext(deliverableId, workspaceId, options)`; de SEO-branch maakt een `SeoGenerationJob` + `dispatchJob(SEO_GENERATE)` + `yield { event:'seo_queued', data:{jobId} }` i.p.v. `yield* runSeoPipeline`.
4. `src/lib/agents/jobs/handlers.ts` — `SEO_GENERATE`-handler → `runSeoGenerationStep(jobId)`.
5. `src/app/api/studio/[deliverableId]/seo-progress/route.ts` (NIEUW) — `GET` leest het `SeoGenerationJob`-record voor polling.
6. `src/features/campaigns/hooks/useCanvasOrchestration.ts` — bij `seo_queued`-event: switch naar polling van `seo-progress` → map naar dezelfde `seo_step`-UI-events → op COMPLETED de deliverable-componenten laden.
7. `src/features/campaigns/components/canvas/CanvasPage.tsx` — indien nodig de progress-weergave voeden uit de polling.

### Budget/resume-logica (handler)
```
laad job; herbouw {stack, voiceDirective}; state = job.state ?? leeg
for step in (job.currentStep+1 .. 8):
  run step; state.outputs.push(...); checkpoint(job, {currentStep:step, state, stepLabel})
  if elapsed > BUDGET_MS (≈600_000): dispatch continuation SEO_GENERATE; return
finaliseer (variant B + geo-polish + persist); job.status=COMPLETED
```
`maxAttempts` hoog genoeg voor continuations; idempotencyKey per (jobId, step).

## Acceptatie
- [x] `SeoGenerationJob` in schema + Neon (schema op main via PR #80; Neon-push onderdeel van de deploy-ronde 2026-07-06 — definitieve bevestiging bij de deploy-smoke).
- [x] SEO-generatie loopt volledig via de queue; geen inline-run in de SSE-route (`seo_queued` + `dispatchJob(SEO_GENERATE)` in canvas-orchestrator).
- [x] Client polt + toont dezelfde 8-stap-progress; op COMPLETED verschijnen de 2 varianten (`seo-progress`-route + `useCanvasOrchestration`-polling).
- [x] Niet-SEO content-types blijven de bestaande inline SSE-flow (byte-identiek).
- [x] tsc + lint groen (CI `check` op PR #80).
- [ ] Smoke op de deploy: genereer een long-form SEO-deliverable → progress loopt → 2 varianten persisted (cross-instance, geen timeout). → **verplaatst naar `pre-launch-browser-smoke-batch` (doc-sync 2026-07-12)**.

## Risico
Raakt de kern content-generatie-UX + de flow die net groen getest is. Niet-SEO-pad MOET
byte-identiek blijven (harde regressie-grens). Client SSE→polling is de delicate wiring —
vereist smoke-verificatie op de deploy (lokaal niet volledig te draaien).
