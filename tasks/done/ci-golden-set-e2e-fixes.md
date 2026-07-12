---
id: ci-golden-set-e2e-fixes
title: CI-gates groen maken vóór livegang (golden-set + e2e)
fase: pre-launch
priority: now
effort: 0.5 dag
owner: claude-code
status: done
created: 2026-07-06
completed: 2026-07-12
---

## Waarom
Twee niet-verplichte CI-checks faalden structureel op elke PR. Niet-blokkerend (de required
`check` = tsc + lint + build is groen), maar **vóór livegang** wil je alle gates groen, zodat
een échte regressie niet in de ruis van permanent-rode checks verdwijnt.

## 1. `evaluate` (golden-set-gate) — ✅ gefixt 2026-07-12
- **Echte root cause** (anders dan de oorspronkelijke hypothese): de golden-set-configs
  gebruikten het **uitgefaseerde model-ID `claude-sonnet-4-5-20251001`** → Anthropic 404 op
  élke case → 0/10. De secrets wáren beschikbaar (de gate-stap draaide); de key-detectie-skip
  bestond al in de workflow.
- **Fix**: (a) model-ID → `claude-sonnet-4-6` in alle 8 golden-set-yamls; (b) workflow-
  `permissions` (pull-requests/issues: write) voor de PR-comment-stap ("Resource not
  accessible by integration"); (c) herkalibratie blog-post-set op sonnet-4-6: prompt-contract
  expliciet gemaakt (H1-direct zonder preamble, keyword letterlijk, harde lengte-eis,
  brand-primacy bij off-brand briefs — spiegels van productie-gedrag), `max_tokens` 4000→8000;
  (d) twee **kapotte testgevallen** gerepareerd: de H1-regex `^#\s+.+$` kon zonder m-flag
  nooit op meerregelige output matchen (`$` = einde-string), en de length-case asserteerde
  ≥1500 woorden zonder dat de brief een lengte vroeg.
- **Resultaat**: lokale eval **7/10 (70%) ≥ drempel** (was 0/10 crash → 4/10 → 5/10 → 7/10).
  De 3 resterende fails zijn llm-rubric-borderline-cases (judge-variantie; LINFI flapte
  tussen runs). **NB**: 70% is de rand — nightly kan flappen; structurele volgende stap is de
  v2 (orchestrator-wrapped prompts i.p.v. de standalone simulatie), zie yaml-kopcommentaar.

## 2. `e2e` (critical-flow) — ✅ was al gefixt
- Detach-safe skip + testid + count-wait geland in PR #93 (gotcha 2026-07-07); `onboarding.skipTour`
  is vertaald (en: "Skip Tour" / nl: "Tour overslaan" in `src/lib/ui-i18n/locales/*/dashboard.ts:68`).
  e2e is groen op alle recente PR's (#102/#103/#104).

## Acceptatie
- [x] `evaluate` groen op de fix-PR zelf (gate draait live op de PR — paths matchen).
- [x] `e2e` groen + `onboarding.skipTour` vertaald.
- [x] Beide gates groen vóór go-live.

## Context
Ontdekt tijdens de serverless-hardening + SEO-pipeline-work (2026-07-06). Beide checks zijn
niet-verplicht (branch-protection vereist enkel `check`), dus ze blokkeerden de merges niet —
maar permanent-rode checks maskeren echte regressies. De model-ID-klasse ("uitgefaseerd model
in een config die alleen CI raakt") is dezelfde stale-artefact-familie als gotchas 2026-05-29/06-10.
