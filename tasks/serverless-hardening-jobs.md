---
id: serverless-hardening-jobs
title: A1 — fire-and-forget onboarding-pipelines → AgentJob-queue
fase: pre-launch
priority: now
effort: representant done + 3-5d resterend
owner: claude-code
status: in-progress
created: 2026-07-01
related-spec: plan snug-popping-tulip (Fase 2 A1)
worktree: branddock-launch
---

# Probleem

Fire-and-forget background-werk (`someLongPipeline(...).catch()` zonder await) wordt op Vercel **gekild zodra de response verzonden is** (de function bevriest). Onboarding-pipelines starten dus wél maar draaien nooit af. De bestaande AgentJob-queue + minute-cron (`/api/cron/run-jobs`) is de serverless-veilige offload-target.

# Patroon (vastgesteld 2026-07-01, brandstyle als representant)

1. **Job-type** toevoegen aan `enum AgentJobType` (`prisma/schema.prisma`) → `npx prisma generate` (+ `db push` bij deploy).
2. **Handler** registreren in `src/lib/agents/jobs/handlers.ts` via `registerHandler(type, async (job) => {...})` — leest input uit `job.payload`, dynamische import van de engine, returnt een klein result-blob. Gooit → runner zet RETRY/FAILED.
3. **Route** vervangt fire-and-forget door `dispatchJob({ type, payload, workspaceId, priority, maxAttempts, idempotencyKey, triggeredBy })` (`src/lib/agents/jobs/dispatch.ts`). Response-shape ongewijzigd laten.
4. **Progress/polling**: als de engine progress al naar een domein-tabel schrijft (zoals brandstyle → `brandStyleguide.analysisStatus`), blijft het client-polling-contract **ongewijzigd**. AgentJob heeft géén progress-kolom.
5. **maxAttempts:1** voor dure/destructieve AI-pipelines (geen auto-retry die tokens verbrandt); engine landt zelf op ERROR bij falen.
6. **Buffers** (PDF/upload): niet in de JSON-payload — eerst naar `getStorageProvider().upload()`, payload draagt de URL, handler haalt op via `fetchMediaAsBuffer()`.

Latency-noot: minute-cron → tot ~60s start-latency. Acceptabel (spinner dekt het). Evt. optimalisatie: POST kickt `/api/cron/run-jobs` (vereist self-fetch + CRON_SECRET) — bewust NIET gedaan.

# Status per route

## ✅ Tier 1 — DB-backed progress (alleen executie naar queue) — DONE
- `brandstyle/analyze/url` → `BRANDSTYLE_ANALYZE_URL` ✅
- `brandstyle/analyze/pdf` → `BRANDSTYLE_ANALYZE_PDF` ✅ (PDF via storage-URL)

## ✅ Tier 1-restant — DONE 2026-07-05 (DB-backed, zelfde patroon als brandstyle)
- `alignment/scan` (`runScan`) → `ALIGNMENT_SCAN` — engine zet zelf COMPLETED/FAILED (scanner.ts:273/298).
- `trend-radar/research` (`runTrendResearch`) → `TREND_RESEARCH` — idem (researcher.ts:549/566).
- `brandvoiceguide/analyze/url` → **verplaatst naar Tier 3** (voice-analyzer-engine heeft in-memory Map).

## ✅ Tier 2 — enqueue-only (geen client-progress-polling) — DONE 2026-07-03
- DAM auto-tag (5 media-routes) → `DAM_AUTO_TAG`.
- `bug-reports` + reanalyze → `BUG_REPORT_ANALYZE`.
- `chat-feedback` + reanalyze → `CHAT_FEEDBACK_ANALYZE`.
- 3 job-types + handlers (dynamic import van de bestaande functies); 9 routes await'en nu `dispatchJob`.
- studio `generate-visual*` / `refine-visual` fidelity-rescore fire-and-forgets.

## ⬜ Tier 3 — in-memory progress Map → eerst naar domein-tabel
- `website-scanner/route.ts` + `scanner-pipeline.ts:348` (`scanProgress` Map + `setInterval`) → progress naar een DB-kolom/tabel, dan enqueue + client polt DB.
- `brandvoice/voice-analyzer-engine.ts:55` (`progressMap` + `setInterval`).

# Acceptatie
- [x] Patroon vastgesteld + representant (brandstyle url+pdf) op de queue.
- [x] Tier 2 gemigreerd (DAM/bug/feedback, 2026-07-03).
- [x] Tier 1-restant gemigreerd (alignment/scan, trend-radar, 2026-07-05).
- [ ] Tier 3 (website-scanner + brandvoice: in-memory Map → DB-progress).
- [ ] Tier 3: in-memory Maps vervangen door DB-progress + gemigreerd.
- [ ] Smoke (Fase 5): start elke pipeline op de deploy → job enqueued → cron verwerkt → progress + resultaat verschijnen cross-instance.

# Verificatie-noot
Deze omgeving kan tsc/app niet draaien; verificatie = lint (per file) + CI-tsc/build + Fase 5 deploy-smoke.
