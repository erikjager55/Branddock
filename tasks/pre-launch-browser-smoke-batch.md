---
id: pre-launch-browser-smoke-batch
title: Browser-smoke batch — Δ-1 Surface C + claw-page-awareness + Visual Brief + locale-picker
fase: pre-launch
priority: now
effort: 1-2u
owner: user (UI-manual)
status: open
created: 2026-05-12
completed: -
related-adr: -
related-spec: -
worktree: -
---

# Probleem

Sprint #3 leverde 7 task-finalizations (entries #243-251) plus side-iteraties, maar de bijbehorende browser-smokes zijn telkens uitgesteld omdat code-completion vóór UI-validation prioriteit had. Memory `branddock-pre-launch-smoke-batch` bevestigt: "Δ-1 Surface C 9-stappen browser-smoke uitgesteld naar pre-launch sprint #3 batch met deployment/billing/onboarding". Daarna bleef het uitgesteld.

Status nu: 4 batches code op `main` zonder hands-on UI-validation. Pre-launch sprint #4 is de natuurlijke plek om dit alsnog te doen vóór nieuwe features bovenop een ongeverifieerde basis komen.

# Voorstel

Eén batch van 4 browser-smokes, achter elkaar uitvoerbaar in ~1-2u op een gewarmde dev-server.

# Acceptatiecriteria

- [x] **Δ-1 Surface C** — getest 2026-05-12: paste-flow score 12 (2 findings: state-of-the-art / innovatieve), URL-flow Philips score 59 (16 findings, 5 Voice + 6 Terminology + 5 Claims, run 13.6s), Coolblue 403 graceful, severity+category filters werken. F-VAL rules-audit stem-variants + brand-language auto-detect + locale-resolver allemaal end-to-end gevalideerd.
- [x] **claw-page-awareness vervolg** — getest 2026-05-12 door user, alle 5 sub-stappen werken (Step1Context fill / Persona behaviors fill 1-PATCH / BrandAsset proofPoints / Canvas Step 4 review-content geen regressie / null-coercion edge-case)
- [⏸️] **Visual Brief Compose** — **deferred to post-vercel-deployment** (2026-05-12): localhost storage URLs (`/uploads/media/...`) zijn niet publiek bereikbaar voor FAL/Gemini compose-pipeline. Smoke vereist Vercel Blob / S3 / Cloudinary publieke URLs (Track C `vercel-deployment` levert die). Bovendien: pipeline-migratie naar Gemini Image (nano-banana) gepland in sprint #5 (`compose-pipeline-gemini-migration`) — smoke runt dáárna met betere quality dan huidige FAL Flux Pro Kontext.
- [⏸️] **Visual Brief Trained-Style** — **deferred to post-vercel-deployment** (2026-05-12): zelfde storage blocker als Compose. FAL trained-LoRA model heeft publieke source-URLs nodig.
- [x] **Locale-picker UI** — getest 2026-05-12 (eerder vandaag tijdens implementatie): dropdown wisselt, "Currently active" pill refresht na Save, auto-detected zichtbaar
- [ ] **Serverless job-queue deploy-smoke** (Fase 5 uit [`serverless-hardening-jobs`](done/serverless-hardening-jobs.md), hierheen verplaatst 2026-07-12): start elke gemigreerde pipeline op de deploy (brandstyle url/pdf, alignment-scan, trend-research, website-scanner, brandvoice, DAM auto-tag, bug-report/chat-feedback) → job enqueued → cron verwerkt → progress + resultaat verschijnen cross-instance.
- [ ] **SEO-pipeline deploy-smoke + meting** (uit [`serverless-seo-decompose`](done/serverless-seo-decompose.md) + [`seo-pipeline-speedup`](seo-pipeline-speedup.md), hierheen verplaatst 2026-07-12): genereer een long-form SEO-deliverable op de deploy → `seo_queued` → polling-progress door alle 8 stappen → 2 varianten persisted zonder timeout. Lees `SeoGenerationJob.state.timings` (of Vercel-logs): bevestig ~5-7 min totaal en waar de resttijd zit, en vergelijk de F-VAL-score + handmatige lezing met de ~19K-tekens-baseline. **Deze meting is de go/no-go-gate voor speedup Fase 3/4.**
- [ ] Bug-log gepopuleerd met `[surface] severity: beschrijving → verwachte fix` voor elke P1/P2

# Bestanden die ik aanraak

- Geen code-bestanden — pure UI-smoke
- `gotchas.md` — bij gevonden issues toevoegen
- Bugfix-files volgen alleen voor P1/P2 hits, met expliciete commit-link

# Bestanden die ik NIET aanraak

- Andere browser-flows buiten deze 4 surfaces — apart in `content-items-test-coverage` of post-launch

# Smoke test plan

**Setup**:
- Dev server draait op `localhost:3000` (`npm run dev`)
- DevTools → Network + Console open
- Workspaces ready: LINFI (locale-picker + auto-detected nl-NL), Goed-Bouw (Visual Brief), Better Brands (algemeen)

**Volgorde**:
1. **claw-page-awareness vervolg** eerst (5 stappen, ~20min) — sprint #3 net afgerond, freshest in geheugen
2. **Locale-picker** (~10min)
3. **Δ-1 Surface C** (~20min)
4. **Visual Brief Compose** (~15min)
5. **Visual Brief Trained-Style** (~15min)

# Risico's

- **Stale dev-server**: vorige sessies kunnen orphaned next-server hebben (memory `branddock-dev-server-recovery`). Mitigatie: pkill -9 + .next/dev/lock cleanup vóór start als ChunkLoadError.
- **Workspace-data drift**: workspaces hebben evt geen library-images (better-brands compose). Mitigatie: smoke-test scripts gerund (`learning-loop-e2e` + `visual-brief-readiness`) bewezen ready-state.

# Out of scope

- 53-types content-test (apart in `content-items-test-coverage`)
- Performance-meting (gewoon check dat het werkt, niet timing)
- Cross-browser (Chrome only voor pilot)

# Notes

**Workspace readiness** per smoke (verified door scripts/smoke-tests/visual-brief-readiness.ts):
- LINFI: 125 images, 0 trained models — geschikt voor compose + locale-picker
- Goed-Bouw: 10 images, 1 trained model READY — perfecte test-workspace voor Visual Brief beide flows
- Better Brands: 1 image, 1 trained model — alleen trained-style test (compose needs ≥2)
