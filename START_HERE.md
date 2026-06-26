# START HERE

> Entry point voor mens en agent. Lees deze bij elke sessie-start.
> Update wekelijks (vrijdagretro) en na elke grote sprint.

---

## Huidige fase

**Pre-launch — peildatum 2026-06-25.** Alles draait localhost; Vercel + Stripe nog niet live. De hard launch-blocker is onverminderd `vercel-deployment` (Track C, nog niet gestart). In juni landden twee grote feature-clusters op `main`: de **web-page-builder (Puck) + GEO/SEO long-form** (Fase 1-3 + alle followups) en de **Knowledge Library / Deep Research** + knowledge-context-laag. De GEO/SEO-arc, de bijbehorende LP-render-bugfixes én het brandstyle-kalibratie-paneel zijn nu **volledig afgerond en gemerged**.

### Stand per 2026-06-25 (actueel)

- **Geland op `main` in juni** (changelog #322-#344): web-page-builder/Puck als Canvas Step 3 + brandstyle-extractie-fixes; website page-types W0-W5; GEO/SEO long-form Fase 1-3 (directive + composable seo-geo + F-VAL GEO-pijler + entity-JSON-LD + meet-haak); Deep Research in de Knowledge Library; knowledge-context in de content-flow + op de 5 PUCK web-page-types; content-item-beelden auto-groeien de Media Library; prompt-audit fase 0-5; NL→EN UI-migratie; web-page/GEO-publish markeert het content-item als PUBLISHED (#337); GEO-meet-paneel in de Canvas (#338); LP Step 2+3 render-bugfixes ge-finalized (#339); GEO stat-citatie-leak gedicht (#340/#343); "model offline"-melding (#341); LP/GEO render quick-wins (#342); **brandstyle kalibratie-paneel (#344, deze sessie — gemerged via `37701ab7`)**.
- **Worktrees**: `branddock-brandclaw` + `branddock-launch` zijn **2026-06-26 ge-synct met `main`** (fast-forward naar `2bdb00a7`, 0 achter, 0 eigen commits). Geen `npm install`/`prisma generate` nodig (deps + schema ongewijzigd). Klaar om Track B Phase C resp. Track C op te starten.
- **Research Hub** staat bewust uit achter `RESEARCH_HUB_ENABLED=false` (per-asset AI-Exploration vanuit Brand Foundation blijft wél aan).
- **Nog open / niet ge-finalized**: `web-page-builder-canvas-step-mvp` op `in-progress` (alle 6 fasen + squash-merges PR #14/#15 done; alleen een verspreide acceptance-staart rest: README, F-VAL HTML-calibratie, dual-render perf, marketing-site dogfood, browser-smoke door user); `strategy-analyst-stub` Phase C (wacht op vercel); Track C (launch-infra) onaangeroerd. **De `lp-*`-bugfixes (`lp-fidelity-bugfixes-step2` + `lp-step3-rendering-bugs`) zijn afgerond** — de eerdere "in-review"-claim was stale.
- **GEO/SEO Fase 1a/1b/2/3 + 2 van 3 followups afgesloten 2026-06-24/25** (→ `tasks/done/`): `geo-seo-followup-measurement-dashboard` ✅ en `geo-seo-followup-live-ai-e2e` ✅ done. Alleen `geo-seo-followup-later` (entity-reinforcement + restschema + deploy-smoke) blijft **open**.

---

#### Sprint-archief (peildatum 2026-05-29 — historisch, niet meer de huidige stand)

Actuele sprint-status:

- ✅ Sprint #4 quick-wins (5/5): cron-infra ADR, Surface C smoke, claw-page-awareness smoke, locale-picker smoke, code-debt 2/12 + close-out cluster A/B/C (#257). VB Compose/Trained smoke deferred post-vercel. STOP-GATE genomen 2026-05-17 (P2 shared-pipeline `effie-waardig` leak fixt via prompt-guards + sanitizer, commit `e849a1ed` = entry #258). Auto-iterate variant-clobber fix gemerged 2026-05-17 (`cdd0e074` = #259).
- ✅ Sprint #5 Track A vooruitgelopen: `content-test-foundation-5A`, `content-test-goldens-5B`, `content-test-auto-iterate-6B` (5/7 backend, wiring + dashboard deferred), `content-test-wiring-gates-6A` ✅, `compose-pipeline-gemini-migration`, `claw-page-awareness-vervolg`. **Open**: 6B wiring/dashboard panels + bugfix-cluster uit Ronde 1.
- ✅ **Track B Phase A + B gemerged 2026-05-18** (merge-commit `a0e59a5b`): `brandclaw-data-collection`, `brandclaw-tool-orchestrator`, `strategy-analyst-stub` Phase A (node entry + manual trigger + UI Tab 5) + Phase A vervolg + Phase B (4 dimensions + UI sort/group) + model-ID hotfix (#260-262). Worktree `branddock-brandclaw` blijft actief voor Phase C.
- ✅ **Competitive-AI surfaces ge-finalized 2026-05-29**: `competitor-ai-event-classifier` (#263) + `competitor-activities-ui` (#271 — detail-timeline + dashboard attention + multi-competitor digest + Brand Assistant tool + in-app/email notificaties + reconcile-cron). Was gemerged via PR #6/#8/#13 maar nooit formeel ge-finalized; audit gaf 0 critical/major defects, 7 minor hardening-fixes doorgevoerd (mark-all-read scope, digest-gate, reconcile invalidateCache, OrganizationMember user-resolutie, constant-time cron-auth, dev email-log, silent-return warn).
- ⏸️ **Track B Phase C open** (5-7d, in `branddock-brandclaw` worktree): Vercel Cron weekly `0 9 * * 1` + per-workspace concurrency-cap + cost-budget alerts (>$10/ws/maand → PostHog) + BB pilot smoke met productie-data. **Sequential dep**: Vercel Cron heeft `vercel-deployment` nodig — Track C moet eerst.
- ⏸️ Track C (worktree `branddock-launch`): 0 eigen commits, ~6 commits achter op main per 2026-06-24 (de "~58 commits"-telling hieronder was de mei-stand). Rebase nodig voor start. Hard launch-blocker.

Eerdere afronding (sprint #1-3):

- ✅ Pre-launch product-readiness van content-flows (sprint #1, 2026-05-07/08)
- ✅ Canvas + Studio audit + per-item tweaks (3 clusters, 36 types) + image-flow (3 layers) + locale-fix (sprint #2)
- ✅ Brand Control Program **Phase 0** (foundation + tech-debt-any-types)
- ✅ Brand Control Program **Phase 1** (F-VAL extension: W1-full centroid + multilingual heuristics + voice-baseline)
- ✅ Brand Control Program **Phase 2 Δ-1 surfaces** (Surface C Tab 3 UI + Surface D chat-tool + Surface E PublishGate + cleanup-pack + Insights tab)
- ✅ F-VAL rules-pijler audit (mapper + NL-NL packs + stem-variants + violation-dedup)
- ✅ Brand-language auto-detect (`franc-min` + backfill 13 workspaces + runtime mismatch-guard)
- ✅ BrandVoiceguide.contentLocale picker UI (Voice DNA tab manuele override)
- ✅ Cowork-pariteit Fase A + Competitive-intel Fase 1 data-laag

**Open Pre-launch werk** (scope-uitbreiding 2026-05-12 na roadmap-inventaris — 5 items + ~10 code-TODOs uit gaps getrokken):

3 parallelle tracks via worktrees, 4 sprints (~6-8 weken):

- **Track A — Quality + Validation**: content-items-test-coverage (53 types) + browser-smoke batch + code-debt cleanup
- **Track B — Brandclaw + Competitive**: brandclaw-tool-orchestrator → strategy-analyst-stub + competitor-ai-event-classifier + competitor-content-item-discovery + cron-infra ADR
- **Track C — Launch infra**: vercel-deployment → stripe-billing-live → pilot-onboarding-better-brands + onboarding-flow-test + marketing-site-pricing

**Verplaatst naar post-launch (2026-05-12)**:
- **Δ-4 PublishGate 2nd-opinion** — pilot niet live, geen evidence dat huidige 3-pijler F-VAL gaten heeft.

Pilot-start projectie: **+9-11 weken** (content-test verbeterplan Optie B Full geaccepteerd 2026-05-12 — 6 sub-sprints in Track A + chain-of-prompts + multi-modal upgrades, ~40d totaal naast strategy-analyst-stub langste pad).

---

## Top 3 actieve pre-launch tasks

> Kritieke pad voor pilot ligt bij Track C (vercel = hard launch-blocker, ontgrendelt zowel pilot-onboarding als Phase C Vercel Cron). **Stand 2026-06-25**: het juni-werk (web-page-builder + GEO/SEO Fase 1-3 + alle GEO-followups + `lp-*`-bugfixes + brandstyle-calibratie) is **afgerond en gemerged** — er is geen finalisatie-werk meer dat met Track C concurreert. Track C is nu de onbetwiste volgende stap.

1. **Track C activeren — `vercel-deployment`** (3d) — worktree `branddock-launch` staat **current op main** (ge-synct 2026-06-26), dus direct startklaar. Hard launch-blocker. Ontgrendelt `pilot-onboarding-better-brands` (2d) én `Phase C Vercel Cron` van Track B.

2. **content-items-test-coverage Ronde 1 — 8 representanten** (~1d, `in-progress`) — blog-post / linkedin-post / search-ad / newsletter / landing-page / explainer-video / one-pager / press-release. STOP-GATE is genomen (effie-fix gemerged), kan hervatten. Effie-fix mee-verifiëren via DOM grep `/effie/gi` per representant op Strategy-step.

3. **Track B Phase C** (5-7d, in `branddock-brandclaw` worktree) — Vercel Cron weekly + per-workspace concurrency-cap + cost-budget alerts naar PostHog (>$10/ws/maand) + BB pilot smoke met productie-data. **Wacht op vercel-deployment** voor de Cron-config + productie-smoke.

**Track A vervolg (binnen sprint #5/6)**:
- `content-test-auto-iterate-6B` wiring + dashboard panels (deferred deel afmaken)
- `code-debt-pre-launch-cleanup` overige clusters (2/12 done → close-out per #257 deed grootste deel; resterende fill-in)
- `content-items-test-coverage` full 53-types Ronde 1 + Ronde 2

**Track C follow-on**:
- `stripe-billing-live` (1w) parallel mogelijk
- `marketing-site-pricing` + `onboarding-flow-test` afsluitend

---

## Open beslissingen (blokkers voor werk)

1. **Pilot LoRA-status Better Brands workspace** — trained-style image-flow defaults open op (`canvas-image-briefing-defaults` zette tiktok-script default op lifestyle als pilot-veiligheid; flip naar trained-style mogelijk via runtime check zodra LoRA's geseed zijn).
2. **Pre-launch sprint #3 browser-smokes uitgesteld** (per memory `branddock-pre-launch-smoke-batch`): Δ-1 Surface C 9-stappen browser-smoke bundelen met deployment/billing/onboarding smokes in sprint #4 batch.

---

## Hoe te beginnen

**Sessie-start prompt** (Stream Deck "Start sessie" knop):
```
Lees CLAUDE.md, gotchas.md en START_HERE.md.
Bevestig wat je begrijpt over de huidige fase en geef de top 3 actieve tasks.
```

**Bij task-werk**:
```
Werk aan tasks/<id>.md volgens de regels in CLAUDE.md.
Start in plan-mode. Bevestig file-set en acceptatiecriteria voor je begint.
```

**Twijfel over wat te pakken**:
```
Geef me een overzichtelijk overzicht van mijn openstaande werk zodat ik kan kiezen wat ik oppak.
```

**Nieuw feature-idee** (sparring nodig vóór code):
```
Ik heb een idee voor X. Run feature-planner subagent.
```
Pipeline: 6-assen discovery → `tasks/_drafts/idea-<id>.md` → technical-planner → `tasks/<id>.md` → uitvoer.
Volledige gids: [`docs/playbooks/feature-discovery.md`](docs/playbooks/feature-discovery.md)

---

## Recent afgeronde tasks (sessies 2026-05-10 t/m 2026-05-18)

> Track A op `main`. Track B Phase A+B gemerged via `a0e59a5b` op 2026-05-18.

**Track B landing 2026-05-18** (changelog #255/#256/#260/#261/#262 na renumber-collision):
- `brandclaw-data-collection` ✅ — DataSnapshot model + registry + alignment + 4 v1 sources live
- `brandclaw-tool-orchestrator` ✅ — types + registry + agent-loop + persistence + 4 query-tools + PostHog
- `strategy-analyst-stub` Phase A ✅ — node entry + manual trigger + UI Tab 5
- `strategy-analyst-stub` Phase A vervolg ✅ — UI uitbreiding
- `strategy-analyst-stub` Phase B ✅ — 4 extra dimensions + UI sort/group
- Brandclaw model-ID hotfix ✅ (correct Anthropic agent-loop default)

**Track A 2026-05-17 (Sprint #4 close + bugfixes)**:
- `code-debt-pre-launch-cleanup` ✅ close-out (cluster A persist-TODOs + B API-deprecation + C cleanup, #257)
- Effie-rubric leak fix in content-flow Strategy ✅ (#258, commit `e849a1ed`) — prompt-guards + `scrubStrategyLayer()` utility + 30/30 smoke groen
- Auto-iterate gate-floor + silent-iter scope-fix ✅ (#259, `cdd0e074`) — variant-clobber + long-form shrinkage bugfix

**Sprint #4 quick-wins (2026-05-10/12)**:
- Cron-infra ADR — Vercel Cron continueren (`docs/adr/2026-05-12-cron-infra.md`)
- Browser-smoke partial: Surface C ✅ + claw-page-awareness ✅ + locale-picker ✅. VB Compose/Trained deferred post-vercel.

**Sprint #5 Track A vooruitgelopen (2026-05-12)**:
- `content-test-foundation-5A` ✅ — Layer 1 generic property evals + Prompt Registry UI v1
- `content-test-goldens-5B` ✅ — chain-of-prompts upgrades (4 batches A-D) + golden sets via Promptfoo
- `content-test-wiring-gates-6A` ✅ — alle 8 gates gewired
- `content-test-auto-iterate-6B` ✅ partial (5/7 backend) — feedback-compiler + auto-iterate orchestrator + edit-distance + per-type thresholds + Canvas SSE + InsightsTab dashboard. Wiring + dashboard panels deferred.
- `compose-pipeline-gemini-migration` ✅ — FAL Flux Pro Kontext → Gemini nano-banana
- `claw-page-awareness-vervolg` ✅ — Step1Context + PersonaDetail + BrandAssetDetail wiring

**Sprint #3 (eerder afgerond, 2026-05-09/11)** — Δ-1 Content Review surfaces (C/D/E + cleanup + Insights tab), F-VAL rules-pijler audit, Brand-language auto-detect, BrandVoiceguide picker. Details: `tasks/done/` + `docs/changelog.md` entries #243–250.

**Sprint #2 (gemerged 2026-05-09 via PR #5 `618d336`)** — Canvas/Studio 12 tasks + BCP Phase 0/1 + Cowork-pariteit Fase A + Competitive-intel Fase 1. Entries #239–242.

---

## Zie ook

- **`roadmap.md`** — volledige Now/Next/Later met fasering
- **`docs/playbooks/working-flow.md`** — operating manual + spelregels
- **`docs/playbooks/feature-discovery.md`** — feature-planner pipeline
- **`CLAUDE.md`** — runtime context voor agent
- **`docs/changelog.md`** — wat is gebouwd (chronologisch; laatste entry #242)
- **`docs/audits/2026-05-08-canvas-studio-state.md`** — Canvas/Studio current-state audit
- **`docs/audits/2026-05-08-canvas-per-item-tweaks-plan.md`** — per-content-type tweak-plan
- **`docs/audits/2026-05-08-canvas-image-briefing-plan.md`** — image-flow plan
- **`docs/adr/`** — architecturale beslissingen
- **`tasks/`** — actieve taken (`_drafts/` staging area voor PM-output)
