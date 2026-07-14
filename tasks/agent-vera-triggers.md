---
id: agent-vera-triggers
title: Vera event-triggered — automatische brand-review bij events (propose-only)
fase: post-launch
priority: later
effort: "Fase 0: 2 weken doorloop (~4 uur actief) · bouw: 6-9 dagen"
owner: claude-code
status: in-progress
created: 2026-07-14
completed: -
related-adr: docs/adr/2026-07-05-agents-architectuur.md (aanvulling te schrijven vóór bouwfase — zie ADR-sectie)
related-spec: tasks/_drafts/idea-agent-vera-triggers.md
worktree: branddock-agent-vera-triggers
---

# Probleem

Brand-bewaking is puur pull-based: Vera (Brand Guardian) scoort betrouwbaar (dogfood 71-75) maar wordt alleen gebruikt als iemand eraan denkt. Assets en drafts passeren de momenten waarop review goedkoop is (DAM-upload, klaar-voor-review) zonder merk-check; het enige systematische alternatief (alignment-scan) is zwaar, handmatig en workspace-breed. Er zit geen mechanisme tussen "niets" en "alles".

⚠️ **Discovery-verdict was `needs-validation-first`** (pilot n=1, nul klantverzoeken, kernaanname onbewezen). De user heeft **expliciet besloten te promoveren mét de validatie als blocking Fase 0** — de bouwfases starten pas na een go op de concierge-test hieronder. Nieuwe context sinds de discovery: het uitbreidingsadvies-rapport is inmiddels wél gecommit (`docs/reports/agents-marktonderzoek-en-uitbreidingsadvies-2026-07-14.md`, commit `0681aa7e`) — de "niet herverifieerbaar"-kanttekening uit de idea-file is daarmee opgelost.

# Voorstel

Twee opt-in event-triggers (default UIT, per workspace per trigger) die een Vera-review-run op de bestaande agents-infra dispatchen: (1) DAM-media-upload, gebatcht per upload-burst; (2) deliverable bereikt review-status. Output = FINDINGS/REPORT-artefact in de bestaande agents-inbox + bestaande `AGENT_RUN_*`-notificatie met deep-link. Propose-only: Vera wijzigt niets, blokkeert niets. Moeheid-ontwerp in drievoud: 1 burst = 1 run = max 1 melding; alleen-notificatie-bij-issues (on-brand = stil inbox-item); harde daily cap per workspace met eenmalige cap-melding.

**Geverifieerde event-plek review-trigger (afwijking van de idea-file, codebase-evidence):** `PipelineStatus.REVIEW` wordt nergens in levende code geschreven — alleen de generieke studio-PATCH (`src/app/api/studio/[deliverableId]/route.ts` regel 111) accepteert het via zod, geen enkele frontend-caller stuurt het. Het levende "klaar voor review"-moment is de **`approvalStatus`-transitie naar `IN_REVIEW`** op twee plekken: `src/app/api/studio/[deliverableId]/approval/route.ts` (enkelvoudig, aangeroepen vanuit `canvas.api.ts` + `Step4Timeline.tsx`) en `src/app/api/campaigns/[id]/canvas/bulk-approve/route.ts` (submit-actie). Dáár komen de hooks.

## Fase 0 — Concierge-validatie (blocking gate, geen code)

**2 weken op Better Brands**: bij elk echt event (DAM-upload, deliverable naar IN_REVIEW) handmatig een Vera-review draaien en de finding via de bestaande inbox delen. Plus één query op bestaande `MediaAsset`/`Deliverable`-tabellen voor historische event-frequentie. Kosten: ~$0 bouw, ~$1-2 AI.

**Go/no-go-criteria (vastgelegd nú, vóór de bouw):**
- **GO** vereist alle drie:
  1. **Actie-rate ≥ 30%** op de handmatig gedeelde findings (fix/confirm/expliciete dismiss-met-reden binnen 7 dagen).
  2. **Vision-false-positives acceptabel**: minder dan 1 op 3 beeld-findings voelt als ruis/betutteling (subjectief gescoord door de pilot-user per finding, gelogd).
  3. **Event-frequentie ≥ ~1 burst/week** (historische query + 2 weken observatie). Onder deze drempel is event-infra overkill → alternatief: DAILY `AgentSchedule` voor Vera op de bestaande Fase-2-infra, task sluiten of ombuigen.
- **NO-GO**: task naar `blocked` met de meetdata in Notes; niet bouwen, niet "toch even proberen".
- **Bijvangst**: Fase 0 levert de score-drempel voor "issue" (wanneer notificeren) en de daily-cap-default — die worden vóór Fase 2 in Notes vastgelegd.

## Fase 1 — Schema + opt-in-configuratie

- `AgentJobType` krijgt enum-lid `AGENT_EVENT_REVIEW`; `NotificationType` krijgt `AGENT_TRIGGER_CAP_REACHED` (zie beslispunt in Notes); nieuw model `AgentEventTriggerConfig` (workspaceId, triggerKey `'dam-upload' | 'content-review'`, enabled default **false**, lastEventRunAt, createdByUserId, `@@unique([workspaceId, triggerKey])`).
- Nieuwe route `src/app/api/agents/triggers/route.ts` (GET + PATCH), patroon `api/agents/schedules/route.ts`: `resolveWorkspaceId` + `getServerSession` + `requireWorkspaceRole` (member+) + `enforceNotLocked` + `invalidateCache(cacheKeys.prefixes.agents(workspaceId))` na elke mutatie.
- `TriggerSettingsCard` op Vera's `AgentDetailPage`, patroon `ScheduleManagerCard`. De toggle-copy benoemt expliciet dat elke run AI-kosten maakt (de toggle ís de kosten-gate).

## Fase 2 — Dispatch-hooks + handler + moeheid-ontwerp

- Dunne helper `maybeDispatchVeraEventReview({ workspaceId, triggerKey, userId })` in `src/lib/agents/event-triggers.ts`: config-check (enabled?), dan `dispatchJob({ type: 'AGENT_EVENT_REVIEW', … })` met **idempotencyKey-bucket + scheduledAt-delay** als batching-mechanisme (DAM: +10 min, review: +3 min; `dispatch.ts` dedupet nieuwe events de PENDING-job in — bestaand gedrag, regel 39-47). Fail-soft: een dispatch-fout mag de upload/statuswissel nooit breken (patroon DAM_AUTO_TAG fire-and-forget-comment in `media/route.ts`).
- Hooks op 4 plekken (elk ~8 regels, ná de bestaande cache-invalidation): `media/route.ts` (IMAGE-upload, naast de bestaande DAM_AUTO_TAG-dispatch regel ~275), `media/bulk/route.ts` (éénmaal per bulk-call, niet per asset), `approval/route.ts` (transitie → IN_REVIEW), `canvas/bulk-approve/route.ts` (submit-actie).
- Handler `src/lib/agents/jobs/event-review.ts` (patroon `agent-task.ts`): (1) config nog enabled? anders terminale skip; (2) `enforceNotLocked` + `canActInWorkspace(workspaceId, userId)` — acting identity = event-actor, exact het agent-task-patroon; (3) **daily-cap-check**: count `AgentRun` met `triggerType='event_driven'` + workspaceId + vandaag; bij cap → geen run + éénmalige cap-notificatie (dedup via bestaat-er-al-een-cap-notificatie-vandaag-query), géén stille drop; (4) **batch-collectie at-run-time via query** (niet via payload-array's — dedupe houdt de eerste payload vast): DAM = `MediaAsset` met `createdAt > lastEventRunAt` + IMAGE + max 25 (truncatie-note in de finding); review = `Deliverable` (via campaign-workspace) met `approvalStatus='IN_REVIEW'` + `updatedAt > lastEventRunAt`; (5) `runAgent()` met Vera, `triggerType: 'event_driven'` (bestaat al in het AgentRun-contract én in de notify-hook-docstring), `triggerSource: 'event:<triggerKey>'`, notify-policy issues-only; (6) `lastEventRunAt` bijwerken.
- `run-agent.ts`: additieve `notifyPolicy?: 'always' | 'issues-only'` op `RunAgentInput` (default `'always'` — bestaand gedrag ongewijzigd); bij issues-only wordt `notifyAgentRunFinished` alleen aangeroepen bij FAILED/AWAITING_CONFIRMATION óf een FINDINGS-score onder de Fase-0-drempel.
- `handlers.ts`: `registerHandler('AGENT_EVENT_REVIEW', …)` + de **verplichte floor-vs-credit-notitie in de kop-comment** (keuze: floor-gedekt 0 cr, zelfde klasse als ALIGNMENT_SCAN — recurring achtergrond-analyse; vergrendelen in de ADR-aanvulling).

## Fase 3 — Media-vision-review (het echte nieuwe stuk)

- Vera's `review_brand_fit`-tool (fval-gate → `runFidelityForExternalContent`) is **tekst-only**; `scoreImageFidelity` (`visual-fidelity-scorer.ts`) is hard gekoppeld aan `DeliverableComponent` en dus onbruikbaar voor rauwe `MediaAsset`-rijen. Nieuw: `src/lib/brand-fidelity/media-brand-fit-judge.ts` — vision-judge op rauwe asset-URLs (per-beeld verdict + score tegen de visuele merkidentiteit via `getBrandContext`), naar het vision-call-patroon van `dam-auto-tagger.ts` inclusief de base64-fallback voor localhost-URLs (gotcha 2026-06-10, staat als comment in de scorer).
- Nieuwe agent-tool `review_media_assets` op namespace `agent:brand-guardian`, geregistreerd in `registerBrandGuardianTools()` (`brand-guardian.ts`); FINDINGS-artefact via `recordArtifact` zoals `runBrandFitReview`. De review-trigger (tekst) hergebruikt `runBrandFitReview` as-is.
- Prompt/drempel-tuning op basis van de Fase-0-false-positive-data — dit is bewust de láátste bouwfase.

# Acceptatiecriteria

- [ ] **Fase-0-gate**: go/no-go-meting uitgevoerd en gedocumenteerd in Notes; bouwfases alleen gestart bij GO op alle drie criteria.
- [ ] Beide triggers UIT (default): upload + statuswissel produceren géén AgentJob, géén AgentRun, géén AI-kost (DB-geverifieerd).
- [ ] DAM-trigger AAN: 5 assets in één sessie → binnen 15 min precies één Vera-finding in de agents-inbox die de batch als geheel beoordeelt, max één notificatie.
- [ ] Volledig on-brand batch → run stil in inbox/run-historie, 0 notificaties (Notification-tabel geverifieerd).
- [ ] Review-trigger AAN: deliverable → IN_REVIEW → Vera-finding in de inbox, propose-only (aantoonbaar niets gewijzigd aan deliverable/asset/merk-DNA).
- [ ] Daily cap bereikt → geen run + éénmalige "cap bereikt"-melding; volgende events dezelfde dag → geen stapelende meldingen, geen stille drop.
- [ ] Bestaand notificatie-gedrag (manual + scheduled runs) regressievrij: `scripts/dev/agent-notify-smoke.ts` groen.
- [ ] Neon `prisma db push` uitgevoerd vóór prod-deploy (gotcha `neon-schema-push-on-deploy`).
- [ ] `npx tsc --noEmit` 0 errors
- [ ] `npm run lint` 0 errors
- [ ] Smoke-test uitgevoerd
- [ ] Documentatie bijgewerkt (changelog + ADR-aanvulling)

# Bestanden die ik aanraak

**LET OP**: lokale main loopt achter op origin/main — de Fase-2-scheduling-infra (PR #119, o.a. `agent-task.ts`, `AgentSchedule`, notify-hook) staat alléén op origin/main. Worktree verplicht vanaf origin/main (`scripts/dev/worktree.sh agent-vera-triggers` doet dat al).

| # | Bestand | Wijziging | ±Regels | Risico |
|---|---|---|---|---|
| 1 | `prisma/schema.prisma` | extend: `AgentJobType.AGENT_EVENT_REVIEW`, `NotificationType.AGENT_TRIGGER_CAP_REACHED`, nieuw model `AgentEventTriggerConfig` + Workspace-backrelatie | ~40 | laag (additief; wél Neon-push) |
| 2 | `src/app/api/agents/triggers/route.ts` | **nieuw**: GET + PATCH, member+-gate, workspace-isolatie, cache-invalidation | ~120 | laag |
| 3 | `src/features/agents/components/TriggerSettingsCard.tsx` | **nieuw**, patroon ScheduleManagerCard; shared `<Button>`/primitives (geen nieuwe utility-classes → geen Tailwind-4-purge-risico; anders inline-style caveat) | ~150 | laag |
| 4 | `src/features/agents/components/AgentDetailPage.tsx` | extend: card renderen bij agentId `brand-guardian` | ~10 | laag |
| 5 | `src/features/agents/api/agents.api.ts` + `hooks/index.ts` | extend: trigger-config fetch/mutate | ~50 | laag |
| 6 | `src/lib/agents/event-triggers.ts` | **nieuw**: `maybeDispatchVeraEventReview` (config-check + bucket-idempotency + delay, fail-soft) | ~80 | laag-medium |
| 7 | `src/lib/agents/jobs/event-review.ts` | **nieuw**: AGENT_EVENT_REVIEW-handler (cap, batch-query, runAgent event_driven, lastEventRunAt) | ~180 | medium |
| 8 | `src/lib/agents/jobs/handlers.ts` | extend: registerHandler + verplichte floor-vs-credit-notitie in kop-comment | ~15 | laag |
| 9 | `src/lib/agents/registry/run-agent.ts` | extend: additieve `notifyPolicy` op RunAgentInput | ~25 | medium (levend Fase-2-notify-pad) |
| 10 | `src/app/api/media/route.ts` | extend: dispatch-hook na DAM_AUTO_TAG (IMAGE) | ~8 | laag |
| 11 | `src/app/api/media/bulk/route.ts` | extend: dispatch-hook, éénmaal per call | ~8 | laag |
| 12 | `src/app/api/studio/[deliverableId]/approval/route.ts` | extend: hook bij transitie → IN_REVIEW | ~8 | laag |
| 13 | `src/app/api/campaigns/[id]/canvas/bulk-approve/route.ts` | extend: hook bij submit-actie | ~8 | laag |
| 14 | `src/lib/brand-fidelity/media-brand-fit-judge.ts` | **nieuw**: vision-judge op rauwe MediaAsset-URLs (batch, base64-fallback) | ~200 | **hoog** (false positives = hét vertrouwensrisico) |
| 15 | `src/lib/agents/registry/fval-gate.ts` + `definitions/brand-guardian.ts` | extend: `review_media_assets`-tool + registratie | ~70 | medium |
| 16 | `src/lib/agents/notify-run-finished.ts` | extend (klein): cap-melding-variant | ~20 | laag |

Workspace-isolatie-checklist (CLAUDE.md regel #9/#10): route #2 muteert → `invalidateCache(cacheKeys.prefixes.agents(workspaceId))` verplicht; handler #7 draait workspace-gescoped (job.workspaceId) en alle batch-queries filteren op workspaceId (Deliverable via campaign-relatie); hooks #10-13 dispatchen met de al geresolvede workspaceId van de route zelf.

# Bestanden die ik NIET aanraak

- `src/lib/agents/jobs/agent-task.ts` — de scheduled-brug blijft ongemoeid; het event-pad krijgt een eigen handler (geen triggerType-parametrisering in de bestaande brug)
- `src/lib/agents/schedules/**` — geen scheduling-wijzigingen
- `src/lib/brand-fidelity/visual-fidelity-scorer.ts` — component-gekoppeld; NIET ombouwen/generaliseren (Anti-Abstraction)
- `src/lib/brand-fidelity/external-content-runner.ts` — tekst-pad hergebruikt as-is
- `src/lib/ai/dam-auto-tagger.ts` — patroonbron, geen wijziging
- Notificatie-matrix / quiet-hours / e-mail-digests — bewust inconsistent model, NIET naar binnen trekken (soft constraint idea-file)
- Andere 5 agent-definities (Nova/Stella/Milo/Marco/Dana) — geen generalisatie vóór bewezen actie-rate
- `src/app/api/studio/[deliverableId]/route.ts` — de dode `pipelineStatus`-zod-enum laten staan; opruimen is een andere task

# Contract-skeletons (Integration-First)

```ts
// AGENT_EVENT_REVIEW job-payload (untrusted — Zod-validatie in handler, patroon agentTaskPayloadSchema)
{ triggerKey: 'dam-upload' | 'content-review', userId: string }
// batch wordt at-run-time verzameld via AgentEventTriggerConfig.lastEventRunAt — géén payload-array's

// GET  /api/agents/triggers → 200 { triggers: [{ triggerKey, enabled, lastEventRunAt }] }
// PATCH /api/agents/triggers { triggerKey, enabled } → 200 { trigger } | 401 | 403 (viewer/geen workspace) | 400 (onbekende key)

// MVP-defaults (hardcoded constanten, expliciet NIET configureerbaar per out-of-scope):
// DAILY_CAP = 10 event-runs/workspace/dag (herzien met Fase-0-data)
// BATCH_DELAY: dam-upload 10 min, content-review 3 min
// MAX_ASSETS_PER_RUN = 25 (truncatie-note in finding)
// ISSUE_THRESHOLD: uit Fase 0 (tot die tijd: findingsCount > 0 of compositeScore < 70)
```

# Smoke test plan

1. **Default-uit**: verse workspace, beide toggles UIT → upload 3 beelden + zet 1 deliverable naar IN_REVIEW → psql-check: 0 `AgentJob` rijen type AGENT_EVENT_REVIEW, 0 `AgentRun` met triggerType event_driven.
2. **Happy path DAM**: toggle AAN → upload 5 beelden binnen 2 min → psql: precies 1 PENDING job (dedupe zichtbaar aan idempotencyKey) → na cron-run: 1 AgentRun event_driven in de inbox met batch-finding over 5 assets; bij issues exact 1 notificatie met deep-link `agents-inbox?run=<id>`.
3. **Stille on-brand-run**: batch aantoonbaar on-brand materiaal → run COMPLETED, inbox-item aanwezig, Notification-tabel: 0 nieuwe rijen.
4. **Review-trigger + propose-only**: deliverable → IN_REVIEW via approval-route → finding in inbox; diff vooraf/achteraf op deliverable-rij (generatedText/settings/approvalStatus ongewijzigd door Vera).
5. **Daily cap** (test-constante op 2): 3e burst → geen run + exact 1 cap-notificatie; 4e burst zelfde dag → geen tweede melding, job skipt zichtbaar in result.
6. **Error-state**: kapotte image-URL forceren → job doorloopt retry → FAILED → max 1 fout-notificatie (isFinalAttempt-patroon uit agent-task.ts).
7. **Workspace-isolatie**: trigger AAN in workspace A; upload in workspace B (zelfde user) → geen run in A; PATCH op B's config vanuit A-sessie → 403/geen effect; finding in A refereert uitsluitend A-assets.
8. **Regressie**: `scripts/dev/agent-notify-smoke.ts` + `agent-task-smoke.ts` groen (manual/scheduled notificatie-gedrag ongewijzigd).

# Risico's

- **Vision-false-positives op rauwe uploads** (waarschijnlijkheid: hoog; het gevalideerde vertrouwensrisico — een sfeerfoto hóéft niet on-brand te zijn) → mitigatie: Fase-0-data stuurt prompt + drempel; alleen-bij-issues-notificatie; opt-in default UIT; Fase 3 als laatste bouwfase.
- **Notificatie-regressie op het levende Fase-2-pad** (medium; `run-agent.ts` is 2 dagen op prod) → mitigatie: `notifyPolicy` strikt additief met default `'always'`, bestaande smoke-scripts herdraaien als gate.
- **Kosten-staart bij bulk-import van 200 assets** (medium; ~$0,04/beeld → $8 ongevraagd) → mitigatie: MAX_ASSETS_PER_RUN=25 per run + daily cap 10 → worst-case gecapt; cap-melding maakt het zichtbaar i.p.v. stil.
- **Cap-race bij gelijktijdige runs** (laag) → de agent-lane heeft al een advisory-xact-lock met workspace-cap=1 (Fase-2-queue-hardening); AGENT_EVENT_REVIEW moet in diezelfde lane meedraaien — expliciet verifiëren in Fase 2.
- **`updatedAt`-proxy voor de review-transitie** kan een al-gereviewd IN_REVIEW-item her-reviewen na een edit (laag) → geaccepteerd MVP-gedrag (gewijzigde content tijdens review = re-review verdedigbaar); noteren in de finding.
- **Burst over bucket-grens → 2 runs/2 meldingen** (laag) → geaccepteerd; bucket-window van 10 min houdt dit zeldzaam.
- **Vergeten Neon db push → 500 op triggers-API in prod** → push-stap staat in acceptatiecriteria (gotcha `neon-schema-push-on-deploy`).

# Out of scope

(Overgenomen uit de idea-file — heilig, 11 > 4.)

- Auto-fixes (hertaggen, herschrijven, one-click-correcties)
- Hard gates: publicatie/statuswissel blokkeren onder score-drempel (PublishGate-territorium)
- Brandstyle-import als derde trigger (conflict-detectie ≠ brand-fit)
- Default-aan rollout of aan-bij-onboarding
- Configureerbare drempels/caps per workspace (MVP = vaste defaults)
- Notificatie-matrix, quiet-hours, e-mail-digests, wekelijkse samenvattingen
- Nieuwe review-dimensies of F-VAL-motoraanpassingen
- Event-triggers voor de andere 5 agents
- Externe events (webhooks, publicatie-events buiten Branddock)
- Real-time review-overlay in de upload-flow
- Credit-metering van event-runs (floor-gedekt 0 cr; herziening alleen via ADR-aanvulling)
- Opruimen van de dode `PipelineStatus.REVIEW`-restanten

# Notes

## ADR-noodzaak — JA (aanvulling, geen nieuwe ADR)

Vereist wegens: (a) schema-change (enum-lid `AGENT_EVENT_REVIEW` + `AGENT_TRIGGER_CAP_REACHED` + model `AgentEventTriggerConfig`), (b) event-triggers zijn een **nieuwe trede op de D7-autonomie-trap** van `docs/adr/2026-07-05-agents-architectuur.md` (on-demand → scheduled → *event-driven propose-only* → proactief/Brandclaw). Vorm: gedateerde "Aanvulling"-sectie op die ADR — het gevestigde patroon daar (aanvullingen 2026-07-05/06/07). Vast te leggen: event-driven blijft binnen de no-autonomy-regel (propose-only, geen writes zonder confirm), de floor-gedekt-0cr-keuze voor AGENT_EVENT_REVIEW, en de opt-in-default-uit als kosten-gate. **Roep de `adr-create` skill aan vóór de bouwfase start (na Fase-0-go), niet erna.**

## Beslispunt cap-melding (bewuste, kleine afwijking van de planning-richtlijn)

Richtlijn was "bestaand notificatietype". Voor de **findings** geldt dat onverkort (`AGENT_RUN_COMPLETED/FAILED/AWAITING_CONFIRMATION` + bestaande deep-link). Voor de **cap-melding** is er geen semantisch passend bestaand type (AGENT_RUN_COMPLETED zou "Vera finished a task" liegen terwijl er juist géén run draaide). Voorstel: één extra enum-lid `AGENT_TRIGGER_CAP_REACHED` in dezelfde toch-al-vereiste db-push. Alternatief als de user dit afwijst: cap-info alleen als stil inbox-/UI-element zonder push-melding — dan vervalt de "geen stille drop"-eis gedeeltelijk. Beslissen bij ADR-aanvulling.

## Ontwerp-ankers (uit codebase-verificatie 2026-07-14)

- `AgentRun.triggerType` kent `'event_driven'` al (schema-comment + notify-hook-docstring) — de infra anticipeerde hierop; geen contract-wijziging nodig.
- Batching lift op bestaand `dispatchJob`-gedrag: idempotencyKey-dedupe op niet-terminale jobs (`dispatch.ts` r39-47) + `scheduledAt`-delay; cron draait elke minuut (`vercel.json`, 800s maxDuration).
- Acting identity = event-actor (uploader/submitter), met `canActInWorkspace`-guard — exact het `agent-task.ts`-patroon (untrusted payload).
- Kosten-instrumentatie per run bestaat (`AgentRun.totalCostUsd`) — geen extra metering-werk; de daily-cap-check telt gewoon AgentRun-rijen.
- Dogfood-kostenband: ~$0,09-0,10/tekst-run, ~$0,04/beeld → worst-case dag per workspace bij cap 10 en 25 beelden/run: ~$10. Acceptabel als plafond, herzien met Fase-0-frequentiedata.

## Fase-0-logboek

- **2026-07-14 — Fase 0 gestart** (user-directive "kunnen we verder met een adr-aanvulling ... zodat we de vera-triggers kunnen starten"). ADR-aanvulling geschreven: `docs/adr/2026-07-05-agents-architectuur.md` §"Aanvulling 2026-07-14 — D7 verfijnd" (event-driven trede, floor-0cr, opt-in default uit, moeheid-invarianten, cap-melding-enum-lid beslist). Bouw blijft gegate op de go/no-go hieronder.
- **2026-07-14 — historische event-frequentie (prod-Neon, GO-criterium 3)**:

  | event | week | n | workspace |
  |---|---|---|---|
  | dam-upload (IMAGE) | 5-7 juli | 9 | BB-pilot (Erik Jager's Workspace) |
  | dam-upload (IMAGE) | 13-14 juli | 36 | ⚠️ smoke-account (Claude Smoke 7) — telt NIET mee |
  | deliverable → IN_REVIEW | laatste 8 weken | **0** | heel prod |

  Voorlopige lezing: **dam-upload marginaal** (1 echte burst in 4 weken — precies op de "≥ ~1 burst/week"-drempel als de pilot aantrekt, eronder als het stil blijft); **content-review heeft vandaag géén voer** (0 events — hangt aan pilot-adoptie van de review-flow, user-taak #5). Observatiewindow: 2026-07-14 t/m 2026-07-28.
- **Nog te meten (concierge, 2 weken)**: actie-rate ≥ 30% op handmatig gedeelde findings (criterium 1) + vision-false-positive-score door de pilot-user (criterium 2). Protocol: bij elk echt event handmatig een Vera-review draaien en de finding via de inbox delen; Erik scoort per finding.
- Go/no-go-besluit: _(na de window invullen)_
