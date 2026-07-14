---
id: agent-reporter
title: Remi — rapportage-agent (wekelijks klant-klaar weekrapport, agency-first)
fase: launch
priority: now
effort: 2,5-4 dagen (fase 1: 1 dag validatie zonder code; fase 2: 1,5-3 dagen bouw)
owner: claude-code
status: open
created: 2026-07-14
completed: -
related-adr: docs/adr/2026-07-05-agents-architectuur.md (bestaand — D4 dekt curated agent-toevoeging; géén nieuwe ADR nodig)
related-spec: tasks/_drafts/idea-agent-reporter.md
worktree: branddock-agent-reporter (pas bij fase 2 — fase 1 is code-loos)
---

# Probleem

Bureaus (AGENCY-orgs, per klant één workspace) moeten wekelijks aan elke klant laten zien wat er rond het merk gebeurd en geleverd is, en rapen dat nu handmatig bij elkaar uit versnipperde modules (deliverables, F-VAL-scores, campagnes, concurrent-events) — waardoor de update laat, mager of helemaal niet komt. De data stroomt al in Branddock; alleen de wekelijkse verhaalvorm ontbreekt. Tegelijk staat de Fase-2-scheduling-infra (live op prod sinds 2026-07-14, PR #119) zonder agent waarvoor een schedule het natuurlijke gebruik is, en heeft het AGENCY-tier (€299/4.000cr) nog geen agency-specifieke waarde-driver bij launch.

# Voorstel

**Remi** als 7e curated registry-agent volgens het Dana-patroon (`src/lib/agents/registry/definitions/data-analyst.ts`): eigen persona + system-prompt via `buildAgentSystemPrompt` (definitions/shared.ts), draaiend op Dana's bestaande 7 read-only query-tools, met een **vast, niet-configureerbaar 4-blokken-rapportskelet** (① geproduceerd deze periode, ② F-VAL-trend, ③ campagne-status & hoogtepunten, ④ concurrent-signalen + aanbevolen focus). Output = één REPORT-artefact in de bestaande inbox; WEEKLY-schedule via bestaand `AgentSchedule` (WEEKLY is al de UI-default in `ScheduleManagerCard`); on-demand via use-case-knop "Weekrapport nu".

**De task is twee-fasig met een harde gate ertussen** (Red-Team-randvoorwaarde uit de idea-file):

- **Fase 1 — Golden-report-validatie (géén productie-code)**: draai Dana handmatig op de BB-prod-workspace (4 gerichte runs, één per blok, venster 7 dagen), schrijf daarmee het beoogde rapport met de hand als `docs/reports/remi-golden-report-<datum>.md`, en gebruik dat als de eerstvolgende échte BB-klant-update. Leg vast: (a) accepteert de klant het frame zónder performance-cijfers (aanname A2), (b) welke blokken droegen niets bij, (c) welke tool-gaten bleken (m.n. week-granulariteit — zie Notes). **Klant wijst het frame af → STOP, terug naar discovery** (de echte feature is dan een ads-metrics-sync).
- **Fase 2 — Registry-bouw**: definition-file + registraties + feature-key + (conditioneel, op basis van fase-1-bevinding c) één curated period-tool. Het golden report is de kwaliteitsreferentie voor de system-prompt.

## Phase -1 Gates (technical planning 2026-07-14)

| Gate | Verdict | Onderbouwing |
|---|---|---|
| Simplicity | ✅ pass | 1-2 nieuwe files, 0 nieuwe directories (`definitions/` en `data-analyst/` bestaan); geen templates/export/portal-future-proofing |
| Anti-Abstraction | ✅ pass | Direct hergebruik van `buildAgentSystemPrompt`, `artifactOutputContract`, `registerAgentTool`, `dataAnalystQueryTools` — nul wrappers; rapport-skelet zit in de prompt, niet in een template-engine |
| Integration-First | ✅ pass | Run-/schedule-/inbox-/notificatie-API's bestaan; het output-"contract" (4-blokken-skelet) wordt in fase 1 als golden report vastgelegd vóór er code staat |

## Besliste punten (met rationale)

1. **Tool-namespace: eigen `agent:reporter`, zelfde tool-objecten** — BESLOTEN (planner). Dana's namespace delen is technisch fout: `agentIdFromNamespace()` (`src/lib/agents/registry/memory-tools.ts:20`) leidt de memory-scoping af uit de namespace — Remi zou dan Dana's geheugen lezen/schrijven. Hergebruik = de bestaande `dataAnalystQueryTools`-array een tweede keer registreren onder `agent:reporter` (registry is namespace-keyed; zelfde objecten, geen kopie, conventie `agent:${id}` blijft intact).
2. **Credits: Remi 0-credit (`billable` weglaten, zoals Dana)** — ⚠️ **USER-BESLISPUNT, bevestigen vóór fase 2**. Voorstel-rationale: analyse-runs zijn floor-gedekt (ADR 2026-07-07 §2/§3), ~$0,10/wk/workspace platform-kosten is verwaarloosbaar, en "inzicht is gratis" versterkt de anti-Jasper-positionering. Alternatief (gemeterde output) = `billable: true` + 1 regel; geen bouwrisico, puur pricing-keuze.
3. **Period-tool: conditioneel, gate op fase 1** — bekende gap: `query_content_production` en `query_fval_scores` aggregeren per máánd; "deze week vs vorige week" kan niet met de bestaande 7 tools. Als fase 1 bevestigt dat dit het rapport merkbaar verzwakt: één hand-geschreven `query_period_activity`-tool (venster N dagen vs voorgaand venster: deliverables created/completed/published + reviews + avg F-VAL, één rij per venster) in de data-analyst-toolset — dan profiteert Dana automatisch mee. ADR-D4-conform (curated, read-only, workspace-scoped, geen vrije SQL).
4. **Geen nieuwe ADR** — geen Prisma-wijziging (`AgentSchedule.agentId` is plain TEXT), geen library, geen pattern-afwijking; ADR 2026-07-05 D4 voorziet expliciet "nieuwe agents = code-change". Optioneel bij oplevering: één dated aanvulling-regel in de ADR (7e agent), niet verplicht.

# Acceptatiecriteria

Uit de idea-file (MVP), plus gates:

- [ ] **Fase-1-gate gepasseerd**: golden report op BB-prod-data geschreven, als échte klant-update gebruikt, en bevindingen (a) frame-acceptatie (b) blok-waarde (c) tool-gaten vastgelegd in Notes + `docs/reports/remi-golden-report-<datum>.md`
- [ ] Given een workspace met activiteit in de afgelopen 7 dagen, when de wekelijkse Remi-schedule afgaat, then staat er een COMPLETED run in de inbox met precies één REPORT-artefact met de 4 vaste blokken, in de content-taal van de workspace, waarin elk cijfer herleidbaar is naar een tool-result uit die run
- [ ] Given een workspace zonder activiteit, when Remi draait, then benoemt het rapport per blok expliciet dat er geen data is — zonder verzonnen of voorbeeld-cijfers
- [ ] Given een COMPLETED run, when de user het REPORT accepteert, then materialiseert het naar de Knowledge Library (bestaand accept-gedrag) en is de rapport-markdown te kopiëren
- [ ] Given een falende scheduled run, when de laatste attempt faalt, then ontvangt de schedule-eigenaar de bestaande fout-notificatie met deep-link naar de run
- [ ] Given de Remi-detailpagina, when de user "Weekrapport nu" gebruikt, then draait dezelfde rapport-run on-demand
- [ ] Given 5 opeenvolgende test-runs op de BB-workspace, then is de gemiddelde run-kost ≤ $0,15 (AgentRun-cost; counter-metric)
- [ ] Remi verschijnt automatisch in catalogus + Settings → AI Models (data-driven; geen UI-code aangeraakt)
- [ ] `npx tsc --noEmit` 0 errors
- [ ] `npm run lint` 0 errors
- [ ] Smoke-test uitgevoerd (plan hieronder)
- [ ] `docs/changelog.md` entry bij finalize

# Bestanden die ik aanraak

Fase 1 (code-loos):
- `docs/reports/remi-golden-report-<datum>.md` — **nieuw** (handgeschreven golden report, kwaliteitsreferentie voor de prompt)
- `tasks/agent-reporter.md` — Notes-sectie (fase-1-bevindingen a/b/c)

Fase 2 (vanaf **origin/main** — de scheduling-infra zit dáár, lokale main-checkout loopt achter; het worktree-script pakt origin/main):
- `src/lib/agents/registry/definitions/reporter.ts` — **nieuw** (~100-130 regels): `AgentDefinition` volgens Dana-patroon — persona `{ name: "Remi", role: "Reporting Analyst", icon: "ClipboardList" }`, mission/behavior met het 4-blokken-skelet + Dana's gedragscontract (elk cijfer uit een tool-result, "geen data" expliciet, nooit verzinnen) + rol-afbakening in de copy ("Dana beantwoordt vragen, Remi schrijft je weekrapport" — A4-mitigatie), `toolNamespace: "agent:reporter"`, use-case `weekly-report` ("Weekrapport nu"), `featureKey: "agent-reporter"`, `outputContract: artifactOutputContract`, `maxToolCalls: 12`, `maxTokens: 12_000` (rapport is groter dan Dana's antwoord; strategist-les uit smoke 2026-07-06), `registerReporterTools()` die `dataAnalystQueryTools` registreert onder `agent:reporter`. **Risico: medium** (prompt-kwaliteit is de kern; toetsen tegen golden report)
- `src/lib/agents/registry/types.ts` — `"reporter"` toevoegen aan de `AgentId`-union (+1 regel). **Laag**
- `src/lib/agents/registry/index.ts` — `registerAgent(reporterAgent)` + `registerReporterTools()` + reporter toevoegen aan de memory-tools-loop (recall + `remember_agent_memory`) (+6 regels). **Laag**
- `src/lib/ai/feature-models.ts` — `'agent-reporter'` in `AiFeatureKey`-union + `AI_FEATURES`-entry (category `'agents'`, default `anthropic` / `claude-sonnet-4-6`, zoals de andere agents) (+10 regels). **Laag**
- **Conditioneel (fase-1-bevinding c)**: `src/lib/agents/registry/data-analyst/period-tools.ts` — **nieuw** (~100-140 regels, `query_period_activity` volgens het patroon van `content-tools.ts`: vaste geparametriseerde queries, `recordTableArtifact`, workspace-scoped via `ctx.workspaceId`) + `src/lib/agents/registry/data-analyst/query-tools.ts` (+2 regels, tool aan de lijst). **Medium**
- `docs/changelog.md` — entry bij finalize

Workspace-isolatie-check: **geen nieuwe API-routes, geen DB-mutaties** → geen cache-invalidation-werk. Alle query-tools filteren al hard op `ctx.workspaceId` (bestaand); de conditionele period-tool moet dat identiek doen (expliciet reviewen).
Tailwind-4-purge-check: **geen nieuwe UI-classes** — catalogus/inbox zijn data-driven; het icoon is een Lucide-naam die client-side dynamisch resolvet (`AgentIcon.tsx`, fallback Bot), geen CSS-impact.

# Bestanden die ik NIET aanraak

- `src/lib/brandclaw/orchestrator/*` — de motor blijft onaangeroerd (ADR D1)
- `src/lib/agents/schedules/*`, `src/lib/agents/jobs/*`, `src/lib/agents/notify-run-finished.ts` — scheduling/notificaties bestaan en zijn prod-gevalideerd; Remi is puur een consument
- `src/features/agents/components/*` (catalogus, detail, inbox, `ScheduleManagerCard`) — data-driven; WEEKLY is al de form-default
- `prisma/schema.prisma` — geen schema-wijziging (`AgentSchedule.agentId` en `AgentRun.agentId` zijn plain TEXT)
- `src/lib/agents/registry/data-analyst/{content,workspace}-tools.ts` — bestaande tools niet wijzigen; een eventueel period-inzicht is een níeuwe tool, geen parameter-refactor van bestaande
- `src/app/api/agents/*` — run-route valideert agentId als string + registry-lookup; niets te wijzigen
- Alles rond e-mail/Resend/Emailit — `weekly-report-email-via-resend` (roadmap post-launch) is de expliciete follow-up
- `docs/adr/2026-07-05-agents-architectuur.md` — hooguit optionele aanvulling-regel bij oplevering

# Smoke test plan

Fase 2, in de worktree (dev) + afsluitend op prod (BB-workspace):

1. **Catalogus**: open Agents-sectie → Remi-kaart zichtbaar met eigen icoon, rol-copy onderscheidend van Dana; Settings → AI Models toont "Agent — Reporter"-slot.
2. **Happy path (on-demand)**: op een workspace met recente activiteit → Remi-detail → "Weekrapport nu" → run COMPLETED; REPORT-artefact bevat exact de 4 blokken, in de workspace-content-taal; steekproef 3 cijfers → elk herleidbaar naar een attached TABLE-artefact van dezelfde run.
3. **Edge case (lege workspace)**: verse workspace zonder deliverables/reviews → run → per blok expliciete "geen data"-vermelding, geen enkel verzonnen cijfer, run kost < $0,05.
4. **Accept-flow**: REPORT accepteren → verschijnt als KnowledgeResource (source AGENT) in de Knowledge Library; markdown volledig kopieerbaar.
5. **Schedule (dev)**: schedule aanmaken met `EVERY_MINUTE` (dev-only cadence) → scheduled run landt in de inbox + run-notificatie ontvangen; daarna cadence op WEEKLY zetten en `nextRunAt` verifiëren (ma 08:00 Europe/Amsterdam).
6. **Error-state**: forceer een falende run in dev (bijv. tijdelijk invalide model-ID in het `agent-reporter`-slot via Settings → AI Models) → fout-notificatie met deep-link naar de run; model-ID terugzetten.
7. **Workspace-isolatie**: draai Remi in workspace A; verifieer dat het rapport uitsluitend workspace-A-data noemt en dat run + artefact niet zichtbaar zijn in de inbox van workspace B (tweede org/workspace).
8. **Kosten-gate (prod, BB)**: 5 opeenvolgende runs → gemiddelde `AgentRun`-cost ≤ $0,15 (na te vragen via Dana's `query_agent_run_costs` — dogfood-baseline ~$0,10).

# Risico's

- **A2 faalt bij de klant** ("leuk, maar wat leverde het op?") — kans: reëel, dé zwakste aanname. Mitigatie: fase-1-gate vóór alle code; frame-positionering "brand-operations weekly" (output + brand-health + markt), niet performance-rapport. Faalt de gate → stop, discovery voor ads-metrics-sync (`AdMetricSnapshot` is schema-only, de 5-min-cron synct alleen status).
- **Maand-granulariteit maakt het weekrapport mager** — kans: hoog (bekende tool-gap, zie Besliste punten #3). Mitigatie: fase-1-inventarisatie beslist over de period-tool; prompt dwingt eerlijk "geen data" af i.p.v. opvullen met maand-cijfers die als week-cijfers ogen.
- **Kosten-creep** (merkcontext-input + 4-blokken-output > Dana's gemiddelde run) — kans: laag-middel. Mitigatie: `maxToolCalls: 12` + `maxTokens: 12_000` als guards; 5-run-kostenmeting is acceptatiecriterium (counter-metric ≤ $0,15); Deloitte-faalmodus (kosten-onvoorspelbaarheid bij scheduled runs) expliciet bewaakt.
- **Persona-verwarring Dana↔Remi** (A4, ADR-consequentie A6 "twee AI-ingangen") — kans: middel. Mitigatie: scherpe rol-copy in de definition (catalogus is data-driven, dus copy = code); pilot-observatie in de feedbackloop.
- **Verkeerde code-basis** — lokale main-checkout mist de scheduling-infra (staat alleen op origin/main). Mitigatie: fase 2 uitsluitend in een verse worktree via `scripts/dev/worktree.sh agent-reporter` (brancht van origin/main).
- **Weekvenster-ambiguïteit** (schedule ma 08:00; wat is "deze week"?) — kans: laag maar irritant. Mitigatie: prompt definieert het venster expliciet als "de afgelopen 7 dagen t/m gisteren" en instrueert `sinceDays: 7` op de tools die dat ondersteunen.

# Out of scope

De 10 uit de idea-file, bindend:

- White-label/branding van het rapport (agency-logo, klant-huisstijl)
- PDF-export — markdown-copy volstaat voor de hypothese
- Klant-portal / share-links voor externe lezers
- E-mail-render — `weekly-report-email-via-resend` (roadmap post-launch) is de follow-up-task, aan te maken ná bewezen accept-ritme
- Ads-performance-blok — vereist een Meta-metrics-sync = eigen feature met eigen discovery
- Org-breed multi-client roll-up voor de agency-eigenaar (doorbreekt workspace-scoping)
- Configureerbare rapport-templates / report-builder
- Nieuwe externe databronnen (GA4, social-analytics, PR/sentiment)
- Slack/Teams-integratie
- Per-sectie-regenereren-UI (tegenvallend blok = hele run opnieuw)

Plus (technical planning): geen wijziging aan bestaande Dana-tools, geen tweede rapport-motor, geen schema-wijziging, geen DAILY-default-forcering per agent in `ScheduleManagerCard`.

# Notes

- **Evidence-gap uit de idea-file is gedicht**: `docs/reports/agents-marktonderzoek-en-uitbreidingsadvies-2026-07-14.md` is gecommit op origin/main (PR #128, commit `0681aa7e`) — advies #1 (rapportage-agent, agency-first) is nu citeerbaar.
- **Scheduling-infra referentie** (allemaal origin/main): `AgentSchedule`-model (plain-TEXT agentId, cadence WEEKLY + dayOfWeek + timezone, `nextRunAt` als claim-token), `src/lib/agents/schedules/{cadence,enqueue,schedule-api}.ts`, `src/lib/agents/jobs/agent-task.ts`, `src/lib/agents/notify-run-finished.ts`, `ScheduleManagerCard` (WEEKLY-default regel 233, `EVERY_MINUTE` dev-only).
- **E2E**: `e2e/tests/agents/agents-smoke.spec.ts` mockt `GET /api/agents` met een vaste agent-array — een 7e agent breekt niets; overwegen (niet verplicht) om Remi's use-case in de mock op te nemen als de smoke wordt uitgebreid.
- **Fase-1-uitvoering praktisch**: 4 Dana-runs op de BB-prod-workspace (per blok één use-case/prompt, `sinceDays: 7` waar mogelijk; blok ① zal maand-gebucket zijn — noteer precies dát als gap-bewijs), TABLE-artefacten overnemen, rapport handmatig schrijven in de content-taal van de klant-workspace.
- Fase-1-bevindingen (a) frame-acceptatie / (b) blok-waarde / (c) tool-gaten: __invullen na klant-update__.
- Succes-metric ná oplevering (pilot, geen task-AC): ≥75% inbox-accept van wekelijkse Remi-rapporten over 4 weken op ≥2 workspaces; zachte waakhond: genegeerde inbox-items niet structureel laten groeien.
