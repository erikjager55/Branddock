---
id: ci-golden-set-e2e-fixes
title: CI-gates groen maken vóór livegang (golden-set + e2e)
fase: pre-launch
priority: now
effort: 0.5 dag
owner: claude-code
status: open
created: 2026-07-06
---

## Waarom
Twee niet-verplichte CI-checks falen structureel op elke PR. Niet-blokkerend (de required
`check` = tsc + lint + build is groen), maar **vóór livegang** wil je alle gates groen, zodat
een échte regressie niet in de ruis van permanent-rode checks verdwijnt.

## 1. `evaluate` (golden-set-gate) — faalt 0/10
- **Symptoom**: "Golden-set gate: no results file — promptfoo crashed before producing output"
  → pass-rate 0/10 (0%) < 70%-threshold. Plus: "Comment results on PR: Resource not accessible
  by integration".
- **Root cause (vermoedelijk)**: promptfoo heeft **AI-API-keys** nodig die niet in de
  PR-context beschikbaar zijn (GitHub stelt repo-secrets niet bloot aan PR-branches), én de
  workflow mist `pull-requests: write`-permissie voor de resultaat-comment.
- **Fix-richting**: keys via repo-secrets + de eval alleen op `main`/push draaien (niet op
  PR-branches), of `continue-on-error` tot de infra klopt; comment-permissie toevoegen.

## 2. `e2e` (critical-flow) — flaky
- **Symptoom**: `locator.click` timeout op de onboarding-skip-knop ("element was detached from
  the DOM, retrying"). Ving ook een **echte i18n-gap**: de knop toont de **rauwe key
  `onboarding.skipTour`** i.p.v. de vertaling.
- **Fix-richting**: (a) `onboarding.skipTour` daadwerkelijk vertalen (i18n-sessie); (b) de
  e2e-stap robuuster maken (retry-safe selector / wachten op stabiele knop).

## Acceptatie
- [ ] `evaluate` groen (of bewust niet-op-PR) op een test-PR.
- [ ] `e2e` groen + `onboarding.skipTour` vertaald.
- [ ] Beide gates groen vóór go-live.

## Context
Ontdekt tijdens de serverless-hardening + SEO-pipeline-work (2026-07-06). Beide checks zijn
niet-verplicht (branch-protection vereist enkel `check`), dus ze blokkeerden de merges niet —
maar permanent-rode checks maskeren echte regressies.
