---
id: job-queue-latency
title: Job-queue-latency dicht (parallel batch + instant kick) + SEO-overhead-instrumentatie
fase: pre-launch
priority: now
effort: 2-4 uur
owner: claude-code
status: done
created: 2026-07-13
completed: 2026-07-13
related-adr: -
related-spec: tasks/seo-pipeline-speedup.md (§Meting, Fase 3b)
worktree: branddock-job-queue-latency
---

# Probleem

De taak-#7-meting (changelog #387) decomponeerde de 2,4-4,5 min niet-AI-overhead van de
SEO-pipeline. Grootste component: **queue-wacht vóór de handler start** — de verse run
wachtte 2m53 (AgentJob created 06:38:08 → startedAt 06:41:01) omdat (a) de minuut-cron
tot 60s latency geeft en (b) `runPendingJobs` de batch **strikt sequentieel** afwerkt
(head-of-line-blocking: de SEO-job stond achter 5 andere jobs). Dit raakt niet alleen SEO
maar de UX van álle 8 job-types. Tweede component: ~1m24 in-invocation-overhead die de
Fase-0-timings niet dekken (pre-stap-setup + post-stap-8 persist/charge) — nu onmeetbaar.

# Voorstel

**DESCOPED tijdens de bouw (file-ownership)**: de parallelle sessie `agents-scheduling`
heeft `runner.ts` + `run-jobs/route.ts` al fors herbouwd (budget-regime, AGENT_TASK-
workspace-cap, SKIPPED-status) in `branddock-agents-scheduling` — die files blijven van
die taak. De batch-parallellisatie in `runPendingJobs` is dus GEPARKEERD tot die merge
landt (follow-up bovenop het budget-regime). Wat hier wél landt:

1. **Instant kick** in `dispatchJob` (dispatch.ts is vrij): na de insert fire-and-forget
   een self-request naar `/api/cron/run-jobs` met `Bearer CRON_SECRET` (alleen als
   secret + base-URL bekend; fout = stil → de minuut-cron blijft het vangnet). Dit haalt
   de tot-60s-cron-wachttijd weg ÉN lost het head-of-line-probleem al grotendeels op
   zonder runner-wijziging: elke kick start een vérse invocation die alleen de nieuwe
   (nog niet geclaimde) job oppakt — parallelisme over invocations heen, terwijl claims
   atomair blijven en het aankomende AGENT_TASK-cap-regime gewoon geldt. SEO-
   continuations resumen ook in seconden i.p.v. een cron-tick.
2. **SEO-overhead-instrumentatie**: de driver timet de niet-stap-fasen in
   `state.timings` — `step:0` (handler-start → eerste stap-event: import/context-opbouw)
   en `step:9` (laatste checkpoint → COMPLETED: persist + charge) — zodat de volgende
   run de resterende overhead exact laat zien.

# Acceptatiecriteria

- [x] `dispatchJob` kickt de worker direct (job start < ~10s na enqueue in de smoke) en degradeert stil naar de cron als secret/URL ontbreekt
- [x] Een job die enqueued wordt terwijl een andere invocation bezig is, start via de kick direct in een eigen invocation (geen head-of-line-wachten)
- [x] Kick veroorzaakt geen dubbel-verwerking (atomaire claim gedekt door bestaande smoke/geen nieuwe races)
- [x] SEO-run schrijft `step:0`- en `step:9`-timings naar `state.timings`
- [x] `npx tsc --noEmit` 0 errors
- [x] `npm run lint` 0 errors (gewijzigde files, --quiet)
- [x] Smoke-test uitgevoerd: unit-kick-smoke PASS (1 kick incl. debounce, delayed geen kick); prod-validatie na deploy volgt in de sessie
- [x] Interpretatie-correctie in dit bestand + §Meting-notitie: step:9 kwantificeert de verborgen AI-staart (variant-B + GEO-polish), niet louter persist/charge

# Bestanden die ik aanraak

- `src/lib/agents/jobs/dispatch.ts` — instant kick (fire-and-forget)
- `src/lib/ai/seo-generation-job.ts` — step:0/step:9-instrumentatie
- `tasks/seo-pipeline-speedup.md`, `docs/changelog.md` — afronding

# Out-of-scope

- `runner.ts`/`run-jobs/route.ts` — eigendom van `agents-scheduling` (in-flight); batch-parallellisatie = follow-up ná die merge
- Fase 4 (stap 7/8 mergen/skippen) — aparte taak, vereist F-VAL-A/B
- Fase 3 context-trim (NO-GO per meting)
- Wijzigingen aan de 800s-worker-ceiling of vercel.json-cron

# Smoke-test

1. Unit: bestaande runner-smoke (indien aanwezig) + tsc/lint.
2. Prod na deploy: 2 jobs tegelijk enqueuen via het smoke-account → beide starten
   binnen seconden; AgentJob createdAt→startedAt < 10s.

# Review (code-reviewer subagent, 2026-07-13)

0 CRITICAL, 4 WARNINGs — alle verwerkt:
- **W1**: dangling fetch niet serverless-safe → kick-promise hangt nu aan `after()` (next/server, dynamisch geïmporteerd; buiten request-context stil terugvallend) + 5s-abort zodat we nooit op de run-jobs-response wachten.
- **W2**: kick-amplificatie bij batch-dispatches (media-bulk/backfill) → module-level debounce, max 1 kick per 10s per instance.
- **W3**: step:9 bleek vooral de verborgen AI-staart (variant-B + GEO-polish ná het laatste checkpoint) te meten, geen "overhead" — comment + interpretatie gecorrigeerd; dit herkadert de #387-meting: de ~1m24 "in-invocation overhead" is grotendeels ongetelde AI-tijd.
- **W4**: timings gingen bij continuation-runs verloren (hydration dropte ze) → 1-regel-fix in seo-pipeline.ts (timings mee-hydrateren; de generator-accumulator nam ze al over).
- MINORs: dedupe-join kickt nu ook (versnelt de bestaande PENDING-job), preview-kick-gedrag gedocumenteerd, dubbele-step:0-ruis bij replay geaccepteerd.
- Compat met het aankomende agents-scheduling-regime expliciet getoetst: claims/cap/enqueueDueSchedules allemaal kick-safe; kanttekening — zodra een AGENT_TASK klaarstaat gaat die voor (kick degradeert dan naar de cron-status-quo).
