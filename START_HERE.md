# START HERE

> Entry point voor mens en agent. Lees deze bij elke sessie-start.
> Update wekelijks (vrijdagretro) en na elke grote sprint.

---

## Huidige fase

**Pre-launch → launch-fase — peildatum 2026-07-12.** **`vercel-deployment` ✅ LIVE + `stripe-billing-live` ✅ LIVE** — app én billing draaien op productie (`branddock-7y9n.vercel.app`, main=production, Vercel Pro+Fluid); **beide harde launch-blockers zijn weg**. Stripe live-billing is volledig go-live (checkout→PRO / cancel→FREE getest, webhook 9 events enabled, Customer Portal, Vercel-env `BILLING_ENABLED=true`). **`pilot-onboarding-better-brands` is ✅ afgesloten** (BB live op prod, PR #95) en **credits draaien LIVE in pilotmodus** (sinds 2026-07-10, top-up dicht). Het kritieke pad richting betalende klanten is nu **het credit-model afronden tot betaling-aan** (Fase 4-rest + Fase 5 + launch-checklist). In juni landden twee grote feature-clusters op `main`: de **web-page-builder (Puck) + GEO/SEO long-form** (Fase 1-3 + alle followups) en de **Knowledge Library / Deep Research** + knowledge-context-laag. De GEO/SEO-arc, de bijbehorende LP-render-bugfixes én het brandstyle-kalibratie-paneel zijn nu **volledig afgerond en gemerged**.

### Stand per 2026-07-05 (actueel)

- **💳 Launch-pricing besloten 2026-07-07** (ADR [`2026-07-07-pricing-credits-launch`](docs/adr/2026-07-07-pricing-credits-launch.md)) — **lage basis + prepaid credit-bundel + on-demand top-up (€0,10/credit)**, €15 platform-floor, **output-only metering** (merkcontext/F-VAL credit-vrij). Tiers **Starter €39/400cr · Growth €89/1.200cr · Agency €299/4.000cr** + 28d no-card trial; iDEAL/SEPA + Stripe Tax/BTW. Herziet D8 van de agents-ADR. ~46% marge / ~€142K jaarwinst bij 300 gemixte users. **Build = launch-blocker**: [`pricing-credits-billing`](tasks/pricing-credits-billing.md) (gefaseerd 0-6, gesplitst in 7 fase-task-files). **Stand 2026-07-08**: Fase 0 ✅ + Fase 1 ✅ + Fase 2-primaire-wiring **gemerged op `main`** (PR #92, changelog #369), dormant achter `NEXT_PUBLIC_BILLING_ENABLED=false`. Fase 3 begonnen (alleen unlimited-credits-org-uitzondering `b7359d9c`, ongemergd op `feat/pricing-credits-fase3`; top-up-kern nog te bouwen). Fase 4-6 open. **Nog dicht vóór billing-ON**: 8 gates (pre-flight-guard-wiring, grant-callers trial/plan/topup, confirm-time charge, reaper-cron, Neon `db push`) + Fase 3 top-up-kern + Fase 4 trial + Fase 5 iDEAL/SEPA+BTW. **Stand-update 2026-07-12 (doc-sync)**: Fase 3+6 ✅ + de 8 billing-ON-gates ✅ (#372, PR #98), Credit Admin-paneel ✅ (#373, PR #99), en **credits LIVE in pilotmodus sinds 2026-07-10** (#374, PR #100 — `NEXT_PUBLIC_CREDITS_ENABLED=true`, top-up-gate dicht, pilot-orgs comped; zie memory `credit-billing-state`). **Rest vóór betaling-aan** (`NEXT_PUBLIC_TOPUP_ENABLED=true`): Fase 4-rest (dag-28 read-only-lock; trial-grant + expiry ✅) + Fase 5 (iDEAL/SEPA-mandaat + Stripe Tax/BTW + auto-topup off-session) + launch-checklist (o.a. álle `STRIPE_PRICE_*`-ids in de env-map).

- **`vercel-deployment` ✅ done 2026-07-05** — app live op branddock-7y9n.vercel.app (main=production, Vercel Pro+Fluid). Ontgrendelt Track B Phase C (Vercel Cron), `pilot-onboarding-better-brands` en de GEO deploy-smoke. Let op memory `neon-schema-push-on-deploy`: schema-changes handmatig naar Neon `prisma db push`-en.
- **Nieuw initiatief 2026-07-05 — 🤖 Agents (user-facing persona-agents)**: volledige Fase 0 afgerond in één dag — diepte-analyse (`docs/reports/agents-diepte-analyse-en-plan-2026-07-05.md`: adversarieel geverifieerde Sintra/Jasper-analyse + brede scan + codebase-inventaris), idea-doc `tasks/_drafts/idea-agents-feature.md` (verdict `ready-to-build`, gepromoot), ADR `2026-07-05-agents-architectuur` (8 deelbeslissingen) en 6 task-files: `agents-foundation` → `agents-motor-wiring` + `agents-ui-inbox` → `agents-data-analyst` (Fase 1, pre-launch NOW, 16-24d, lite-fallback ~11-17d), `agents-scheduling` (Fase 2, gate: Fase 1), `agents-brandclaw-convergentie` (Fase 3-epic, blocked). Kernframe: Agents = user-facing productlaag op `runAgentLoop`; Brandclaw = latere autonomie-trap. User-besluiten: persona-agents, Data Analyst in MVP, vaste maandprijs (per-token later). Detail: roadmap §🤖.
- **Geland op `main` in juni** (changelog #322-#344): web-page-builder/Puck als Canvas Step 3 + brandstyle-extractie-fixes; website page-types W0-W5; GEO/SEO long-form Fase 1-3 (directive + composable seo-geo + F-VAL GEO-pijler + entity-JSON-LD + meet-haak); Deep Research in de Knowledge Library; knowledge-context in de content-flow + op de 5 PUCK web-page-types; content-item-beelden auto-groeien de Media Library; prompt-audit fase 0-5; NL→EN UI-migratie; web-page/GEO-publish markeert het content-item als PUBLISHED (#337); GEO-meet-paneel in de Canvas (#338); LP Step 2+3 render-bugfixes ge-finalized (#339); GEO stat-citatie-leak gedicht (#340/#343); "model offline"-melding (#341); LP/GEO render quick-wins (#342); **brandstyle kalibratie-paneel (#344, deze sessie — gemerged via `37701ab7`)**.
- **Worktrees (stand 2026-07-12)**: alle taak-worktrees zijn opgeruimd (incl. `branddock-brandclaw`, `branddock-launch` en de agents-/content-flow-trees) — gemergde branches verwijderd via de nieuwe `scripts/dev/worktree.sh --done <task-id>`. Naast de main-tree rest alleen `branddock-figma-reference`. Nieuwe taak = nieuwe worktree via `scripts/dev/worktree.sh <task-id>`.
- **Research Hub** staat bewust uit achter `RESEARCH_HUB_ENABLED=false` (per-asset AI-Exploration vanuit Brand Foundation blijft wél aan).
- **Nog open / niet ge-finalized**: `web-page-builder-canvas-step-mvp` op `in-progress` (alle 6 fasen + squash-merges PR #14/#15 done; alleen een verspreide acceptance-staart rest: README, F-VAL HTML-calibratie, dual-render perf, marketing-site dogfood, browser-smoke door user); `strategy-analyst-stub` Phase C **gesuperseded** (→ Agents `agents-scheduling`/`agents-brandclaw-convergentie`); Track C launch-infra: `vercel-deployment` ✅ LIVE + `stripe-billing-live` ✅ LIVE (go-live 2026-07-06). **De `lp-*`-bugfixes (`lp-fidelity-bugfixes-step2` + `lp-step3-rendering-bugs`) zijn afgerond** — de eerdere "in-review"-claim was stale.
- **Nieuw initiatief gepland 2026-06-30 — Meertaligheid (i18n + multi-markt)**: ADR `2026-06-28-multilingual-i18n-and-multi-market-content` + 5 task-files (`i18n-ui-foundation`, `i18n-ai-translation-pipeline`, `content-locale-foundation`, `content-locale-target-picker`, `multi-market-transcreation-enterprise`). Twee assen: UI-taal per gebruiker (i18next, automatisch AI-vertaald — geen handwerk) + content-taal per workspace/markt (Approach C: `Brand` 1:1 + `BrandLocaleProfile`). Fases 1-3 pre-launch-startklaar + niet-brekend; Fase 4-5 = enterprise/LATER, go/no-go-gated, mag `vercel-deployment` niet gijzelen. **✅ STATUS 2026-07-05 — Fase 1-3 GEMERGED op `main` (#65/#68/#70/#71/#73/#74), launch-ready**: en↔nl live door de hele app; de twee-selector-visie (Display-language per gebruiker + Content-/Output-language per workspace/generatie) is compleet. Blokkeert `vercel-deployment` niet. **Post-launch parkeer**: `i18n-ai-translation-pipeline` (automatische engine voor onderhoud + de/es/fr — nu en/nl geseed), de deferred Fase-3-follow-ups (F-VAL-target-pack + bulk-UI-picker), en Fase 4-5. Detail: roadmap §🌍 Meertaligheid.
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

> **▶️ HIER VERDER (bijgewerkt 2026-07-12)**: de pilot draait (`pilot-onboarding-better-brands` ✅ done 2026-07-07, BB merk-DNA op prod), **credits staan LIVE in pilotmodus** (2026-07-10, #372–#374) en de agents-dogfood is **twee rondes** uitgevoerd (#375). Het kritieke pad richting betalende klanten is nu het **credit-model afronden** (Fase 4 trial + Fase 5 iDEAL/SEPA+BTW + launch-checklist) — zie de fase-task-files.

1. **▶️ Agents — Fase 1 LIVE; dogfood-ronde 1 (2026-07-07) + ronde 2 (2026-07-12) ✅ GEDAAN** (changelog #359–#365 + #375 + #377; rapporten `docs/reports/agents-dogfood-2026-07-07.md` + `-2026-07-12.md`). Guardrails groen en herhaald: ~$0,09–0,10/run, eindcontent-F-VAL 73–76 (>70), en **credit-metering op agents praktijk-gevalideerd** (0-charge voor gratis agents/proposals; confirm-pad −3 credits, idempotent). **Ronde-2-hoofdvondst**: de ronde-1-strategist-fix (32k) was een fatale regressie (Anthropic SDK weigert non-streaming >21.333 tokens) — Stella was 5 dagen kapot op prod; **fix gemerged + gedeployed** (PR #102, loop-clamp + definitie 21.333, gotcha 2026-07-12). **Follow-up-fixes ✅ (#377)**: angle-generator (Gemini-thinking uit) + strategist-foundation-budget 16k→24k, beide met echte runs gevalideerd; `worktree.sh --done` geïmplementeerd. **Alle dogfood-restpunten afgewerkt 2026-07-12**: golden-set-gate groen (#378), F-VAL op rauwe REPORTs geland (#379, ADR-D5-gat dicht), streaming-refactor expliciet in het Fase-2-ontwerp geparkeerd (`tasks/agents-scheduling.md` Notes).
   - **Enige open dogfood-punt — USER-actie**: `EXA_API_KEY`/`S2_API_KEY` ontbreken **óók op productie** (Vercel-env gecheckt 2026-07-12) — de lokale sweeps waren dus al prod-representatief; Nova draait overal gedegradeerd tot de keys aangeschaft/gezet zijn. Bijvangst: `POSTHOG_API_KEY` ontbreekt eveneens op prod → de per-run-telemetrie-events (agents-ADR D8-databron) zijn daar donker; de kosten staan wél in de `AgentRun`-rijen in Neon. Fase 2 `agents-scheduling` blijft gegate op pilot-adoptiedata; Fase 3 blocked.
   - **Deferred agents-punten** (opportunistisch, staan in de done-task-files): entity-level drilldown in de content-sources-kiezer, Dana's tabellen op het dashboard, hidden-agent-guard-restjes, MarkdownContent → `components/shared`.
   - **Opruimwerk ✅ gedaan 2026-07-12**: worktrees `branddock-feat-agents-feature/-ui/-data` + `branddock-brandclaw` + bijbehorende gemergde branches verwijderd; `e2e-verify-main` bestond al niet meer. **E2e-gotcha**: draai de "Agents UI"-suite vanuit een schone worktree — met een eigen `npm run dev` actief weigert Next 16 de test-server ("Another next dev server is already running"), wat als 5 valse failures leest.
   - Detail: changelog #359–#365 + #375 + #377, `tasks/done/agents-*.md` (incl. `agents-dogfood-ronde2.md`), memory `agents-initiative`.

2. **💳 Credit-model afronden tot betaling-aan — het kritieke launch-pad.** Pilotmodus staat LIVE (#372–#374: metering + saldo + Credit Admin, top-up dicht). Rest in volgorde: **(a)** [`pricing-credits-fase4-trial`](tasks/pricing-credits-fase4-trial.md)-rest — de dag-28 **read-only-lock** (trial-grant + credit-expiry zijn ✅ via Fase 3); **(b)** [`pricing-credits-fase5-payments-tax`](tasks/pricing-credits-fase5-payments-tax.md) — iDEAL→SEPA-mandaat + Stripe Tax/BTW + auto-topup off-session-charge; **(c)** de launch-checklist uit [`pricing-credits-billing`](tasks/pricing-credits-billing.md) (o.a. álle `STRIPE_PRICE_*`-ids in de env-map — anders downgradet een betalende renewal naar FREE). Daarna pas `NEXT_PUBLIC_TOPUP_ENABLED=true`.

3. **🚀 Launch-rest Track C + deploy-smokes.** Klein maar vóór go-live: [`review-live-pricing`](tasks/review-live-pricing.md) (<1u), de `evaluate`-helft van [`ci-golden-set-e2e-fixes`](tasks/ci-golden-set-e2e-fixes.md) (de e2e-helft is ✅ hersteld via #370/PR #93), en de gebundelde [`pre-launch-browser-smoke-batch`](tasks/pre-launch-browser-smoke-batch.md) — **op 2026-07-12 uitgebreid met de twee Track-D-deploy-smokes** (serverless job-queue + SEO-pipeline-meting; die meting is de go/no-go voor `seo-pipeline-speedup` Fase 3/4). Groter maar zonder task-file: `marketing-site-pricing` (1w) + `onboarding-flow-test` (1w).

> **Recent afgesloten (verplaatst uit deze lijst, doc-sync 2026-07-12)**: `content-items-test-coverage` ✅ done 2026-07-07 (#367; Ronde 2 gated op asset-generator) · Track B Phase C herbestemd naar Agents (mapping in `tasks/done/strategy-analyst-stub.md`) · `pilot-onboarding-better-brands` ✅ (PR #95) · Track D serverless: `serverless-hardening-jobs` + `serverless-seo-decompose` ✅ done 2026-07-06 (PR #78/#80), `seo-pipeline-speedup` meting-gated (PR #83) · `content-flow-improvements-7a` ✅ done 2026-07-12 (#376).

**Meertaligheid Fase 1-3 — ✅ AFGEROND + GEMERGED op `main` (2026-07-05, #65/#68/#70/#71/#73/#74)**: `i18n-ui-foundation` + `content-locale-foundation` + `content-locale-target-picker` zijn done; en↔nl is live door de hele app, de twee-selector-visie is compleet. Volledige gate-suite groen op main. Blokkeert `vercel-deployment` niet meer. **Post-launch**: `i18n-ai-translation-pipeline` (onderhoud-engine + de/es/fr), de deferred Fase-3-follow-ups (F-VAL-target-pack + bulk-UI-picker), Fase 4-5 (`multi-market-transcreation-enterprise`). Detail: roadmap §🌍 Meertaligheid + ADR `2026-06-28`.

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
