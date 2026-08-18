---
id: pre-launch-browser-smoke-batch
title: Browser-smoke batch — Δ-1 Surface C + claw-page-awareness + Visual Brief + locale-picker
fase: pre-launch
priority: now
effort: 1-2u
owner: user (UI-manual)
status: done
completed: 2026-07-12 (lokale surfaces; deploy-smokes → takenlijst)
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
> **2026-08-16 — de blocker onder de twee ⏸️-items bestaat niet meer.** Beide wachtten op
> `vercel-deployment` voor publiek bereikbare storage-URL's; dat is sinds 2026-07-05 live en R2
> draait met `R2_PUBLIC_URL`. Ze zijn nooit alsnog gedraaid. Opgepakt in
> [`deferred-browser-smokes-unblocked`](../deferred-browser-smokes-unblocked.md).

- [x] **Visual Brief Compose** — **gedraaid 2026-08-18** met twee échte publieke R2-URL's
      (`pub-…r2.dev`, beide HTTP 200 `image/jpeg`). Gemini `gemini-2.5-flash-image` gaf in 9,1s
      een beeld van 2,4 MB terug wáárin beide referenties herkenbaar zijn overgenomen (de
      gehandschoende handen met kiemplant én de gestreepte museumgevel met gele
      DISCOVERY-MUSEUM-banieren). Bewust met twee sterk herkenbare referenties getest, juist
      omdat "er komt een beeld uit" niets bewijst — een prompt-only generatie was hier direct
      zichtbaar geweest. ⚠️ Twee observaties, zie
      [`deferred-browser-smokes-unblocked`](../deferred-browser-smokes-unblocked.md): de
      gevraagde `aspectRatio: '1:1'` werd genegeerd (output 1632×640) en de compositie werd een
      naast-elkaar-collage i.p.v. de gevraagde voor-/achtergrond.
- [~] **Visual Brief Trained-Style** — **de faalklasse is afgedekt, de flow zelf niet.** Het
      scenario dat op 21-07 omviel (een asset waarvan de opgeslagen URL écht verlopen is) bestaat
      alleen op prod: de lokale DB heeft 561 `/uploads/`-paden en 72 duurzame `pub-…r2.dev`-URL's
      en géén enkele signed URL. In plaats van dat scenario na te doen met verse data — wat niets
      bewijst — is het reproduceerbaar gemaakt: `npm run smoke:storage-url-expiry` ondertekent een
      écht R2-object met 1s TTL, laat die verlopen en meet dat de rauwe URL 403't en de
      geresolvede 200't (byte-identiek). Wat resteert is een visuele beoordeling van de
      trained-style-output op prod — Erik. Zie
      [`deferred-browser-smokes-unblocked`](../deferred-browser-smokes-unblocked.md).
- [x] **Locale-picker UI** — getest 2026-05-12 (eerder vandaag tijdens implementatie): dropdown wisselt, "Currently active" pill refresht na Save, auto-detected zichtbaar
- [→] **Serverless job-queue deploy-smoke** (→ user-taak #7, vereist prod-sessie) (Fase 5 uit [`serverless-hardening-jobs`](done/serverless-hardening-jobs.md), hierheen verplaatst 2026-07-12): start elke gemigreerde pipeline op de deploy (brandstyle url/pdf, alignment-scan, trend-research, website-scanner, brandvoice, DAM auto-tag, bug-report/chat-feedback) → job enqueued → cron verwerkt → progress + resultaat verschijnen cross-instance.
- [→] **SEO-pipeline deploy-smoke + meting** (→ user-taak #7) (uit [`serverless-seo-decompose`](done/serverless-seo-decompose.md) + [`seo-pipeline-speedup`](seo-pipeline-speedup.md), hierheen verplaatst 2026-07-12): genereer een long-form SEO-deliverable op de deploy → `seo_queued` → polling-progress door alle 8 stappen → 2 varianten persisted zonder timeout. Lees `SeoGenerationJob.state.timings` (of Vercel-logs): bevestig ~5-7 min totaal en waar de resttijd zit, en vergelijk de F-VAL-score + handmatige lezing met de ~19K-tekens-baseline. **Deze meting is de go/no-go-gate voor speedup Fase 3/4.**
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


## Afronding 2026-07-12

De 4 oorspronkelijke surfaces waren al getest (2026-05-12; Visual Brief ×2 bewust deferred → gedekt door de latere compose-gemini-migratie + media-flows in content-test Ronde 1). De twee later hierheen verplaatste deploy-smokes vereisen een ingelogde productie-sessie en staan als user-taak #7 op de takenlijst met draaiboek. Geen open lokale smoke-punten meer.
