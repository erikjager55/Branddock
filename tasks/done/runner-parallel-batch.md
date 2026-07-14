---
id: runner-parallel-batch
title: Job-runner — rest-pool parallel + agent-lane concurrent (follow-up op #388)
fase: pre-launch
priority: now
effort: 3-4 uur
owner: claude-code
status: done
created: 2026-07-14
completed: 2026-07-14
related-adr: -
related-spec: tasks/done/job-queue-latency.md (geparkeerde follow-up) + tasks/done/agents-scheduling.md (queue-regime)
worktree: branddock-runner-parallel-batch
---

# Probleem

`runPendingJobs` draait de batch strikt sequentieel, in twee opzichten:
1. De AGENT_TASK-lane wordt volledig ge-await vóór de rest-batch start — een
   agent-run van 10+ min laat alle batch-genoten (website-scan, brandstyle, SEO…)
   wachten, en blaast vaak meteen het 600s-budget waardoor de rest die invocation
   helemaal niet meer draait.
2. De rest-jobs draaien één-voor-één — de #387-meting liet 3 min head-of-line-
   blocking zien. De #388-kick vangt NIEUWE dispatches (verse invocation), maar
   jobs die samen in één cron-batch of kick-burst (debounce) landen serialiseren
   nog steeds.

Deze follow-up was geparkeerd wegens file-ownership (agents-scheduling bouwde het
budget-regime + de AGENT_TASK-workspace-cap in runner.ts); die is gemerged (#119),
dus het bestand is vrij.

# Voorstel

Herstructureer alleen de orkestratie in `runPendingJobs` — `runJob`, de claims en
de fetch-queries blijven ongewijzigd:
- **Agent-lane** (bestaande logica: itereer door SKIPPED heen, max 1 échte start)
  draait als eigen async-lane, niet meer blokkerend voor de rest.
- **Rest-pool**: kleine worker-pool (cap 4) over de rest-batch; iedere worker
  checkt het invocation-budget vóór hij de volgende job pakt (zelfde check-plek
  als de huidige sequentiële loop). Workers pullen in batch-volgorde → prioriteit
  blijft de startvolgorde bepalen.
- `await` beide (Promise.all) → invocation-duur = max(agent-run, rest-pool) i.p.v.
  de som; strikt meer werk per invocation binnen dezelfde 800s-ceiling.

Veiligheid: claims zijn atomair (claimJob/claimAgentTaskJob, advisory-lock voor de
workspace-cap) — parallel draaien introduceert geen dubbel-verwerking, ook niet
over gelijktijdige (gekickte) invocations heen. `results`-pushes zijn single-threaded
tussen awaits; de route gebruikt results alleen voor counts.

# Acceptatiecriteria

- [x] Overlap bewezen: 3 CHAT_FEEDBACK-jobs zelfde startseconde, wall 12,5s vs som-van-duren 35,7s (2,9×)
- [x] Agent-lane concurrent (jobs-smoke: AGENT_TASK-minirun + pool samen, 4 processed)
- [x] Regimes intact: max 1 gestarte agent-run per invocation; budget-check vóór elke rest-claim; SKIPPED-iteratie; prioriteits-startvolgorde; per-workspace-AGENT_TASK-cap
- [x] `npx tsc --noEmit` 0 errors + lint 0
- [x] scripts/jobs-smoke.ts groen (dispatch→claim→handle→complete, incl. dedupe)
- [x] Prod-validatie (2026-07-14, na deploy): burst van 2 website-scans → **beide gestart in dezelfde seconde** (08:54:07 UTC, 1-2s na enqueue via de kick); scan 1 liep 4m03 door terwijl scan 2 al klaar was — onder de oude sequentiële runner had scan 2 pas ná scan 1 gestart. (Scan 2 faalde inhoudelijk in 1s: bol.com blokkeert scrapers — content-fout, geen queue-fout; de AgentJob zelf COMPLETED netjes.)

# Bestanden die ik aanraak

- `src/lib/agents/jobs/runner.ts` — alleen de runPendingJobs-orkestratie
- `docs/changelog.md`

# Out-of-scope

- runJob/claim-logica, fetch-queries, retry/backoff — ongewijzigd
- JOB_CONCURRENCY tunen boven 4 (rate-limits Anthropic; later op meting)

# Review (code-reviewer subagent, 2026-07-14)

0 CRITICAL, 2 WARNINGs — verwerkt:
- **W1 gefixt**: runJob kán throwen (no-handler-write buiten try/catch; terminale
  failure-write die zelf faalt) — onder Promise.all zou één throw de invocation vroeg
  laten 500'en met tot 5 handlers in flight. Nu `safeRunJob`: throw → synthetisch
  FAILED-result, lanes leven door; de DB-rij blijft dan RUNNING en is voor de reaper.
- **W2 gedocumenteerd**: 4 workers + agent-lane > serverless pg-pool (max 3) — maar
  Prisma houdt geen connectie vast tijdens AI-awaits; de DB-momenten zijn ms-writes die
  op de pool queueën (acquire-timeout 10s). Met W1 gefixt is de blast-radius een RETRY.
  JOB_CONCURRENCY verhogen pas op meting.
- MINORs: rest-vs-rest-concurrency-contract expliciet in de doc-comment; het late-claim-
  venster (budget 600s + multi-minuut-handler → 800s-kill → reaper/RETRY) geaccepteerd
  zoals voorheen; 429-attempt-verbranding bij aanhoudende rate-limits = monitoren.
- Reviewer bevestigde: cursor-pool race-vrij, budget-check op de oude plek, claims
  dragen de dubbel-verwerkingsgarantie, agent-lane start op t≈0 (680s-kalibratie intact).
