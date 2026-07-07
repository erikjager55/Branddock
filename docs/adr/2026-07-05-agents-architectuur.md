---
id: 2026-07-05-agents-architectuur
title: Agents — user-facing persona-agents op één gedeelde motor (runAgentLoop) met generiek artefact-model en F-VAL-poort
status: accepted
date: 2026-07-05
supersedes: -
superseded-by: -
---

# Context

De user wil een user-facing "Agents"-feature toevoegen (à la Sintra.ai/Jasper.ai): benoemde persona-agents die content genereren, analyses maken, strategieën bouwen en tabellen/rapporten opleveren. De onderbouwing staat in `docs/reports/agents-diepte-analyse-en-plan-2026-07-05.md` (adversarieel geverifieerde marktanalyse + codebase-inventaris) en `tasks/_drafts/idea-agents-feature.md` (feature-discovery, verdict `ready-to-build` — conditioneel). Besluiten van 2026-07-05 die vaststaan: Fase 1 MVP pre-launch als parallelle werkstroom (`vercel-deployment` blijft kritiek pad, week-1-voorrangsregel), persona-agents, Data Analyst/tabellen in de MVP, vaste maandprijs bij launch met per-token-metering later.

De relevante bestaande architectuur:

- **Brandclaw-orchestrator** (`src/lib/brandclaw/orchestrator/`): een generieke Anthropic multi-turn tool-use loop (`runAgentLoop`) met per-node tool-registry, guards (5-min wallclock, maxToolCalls 20), cost-calculator en PostHog-events — maar met een **hard-wired outputlaag**: `extractObservations()` verwacht een `observations`-JSON-array en `persistRun` schrijft uitsluitend naar `StrategyObservation(Run)`. Eén node geïmplementeerd (`strategy_analyst`); drie NodeTypes (`campaign_builder`, `measurement_eval`, `optimization`) bestaan alleen als enum. Vastgelegd in ADR `2026-05-08-brandclaw-agent-architectuur` (tool-use + versioned + immutable + no-autonomy) — die principes blijven van kracht.
- **Claw** (`src/lib/claw/`): conversationele Brand Assistant met ~40 tools, waaronder ~23 write-tools achter een human-in-the-loop confirm-flow (`requiresConfirmation` → `mutation_proposal` → `/api/claw/confirm`) en prompt-injection-fencing.
- **Aanroepbare motoren**: `runDeepResearch`, `orchestrateContentGeneration`, de losse stappen in `strategy-chain.ts`, `runFidelityForExternalContent` (F-VAL op kale tekst), alle gegrond via `getBrandContext`.
- **Async-infra**: DB-backed job-queue (`src/lib/agents/jobs/`) + Vercel Cron; de `AGENT_TASK`-handler is een stub.

Het probleem: agent-run-uitkomsten zijn nu domein-specifiek en verspreid (StrategyObservation, Deliverable, KnowledgeResource, ContentReviewLog, ClawConversation), er is geen agent-als-object-concept, geen unified results-surface, en de markt (Jasper's herpositionering juni 2025, Sintra's persona-model) heeft human-in-the-loop taak-agents tot koopstandaard gemaakt. Zwaarste onbewezen aanname uit de discovery (A1): de generalisatie van de observations-only outputlaag is nieuw werk met refactor-risico — deze ADR beslist de aanpak vóór de bouw, zodat dit niet tijdens de bouw ontdekt wordt.

# Decision

**Agents wordt de user-facing productlaag; Brandclaw wordt de latere autonomie-trap — beide op dezelfde motor.** Concreet, acht deelbeslissingen:

1. **Eén motor**: alle agents draaien op `runAgentLoop` (Brandclaw-orchestrator). Er komt géén tweede loop en géén parallelle tool-registry-implementatie. Per agent een eigen `AiFeatureKey` via `resolveFeatureModel` (de hardcoded Sonnet-default in de loop wordt daarbij vervangen door feature-model-resolutie).
2. **Pluggable outputlaag** (beslist A1): de loop wordt gegeneraliseerd van "observations-only" naar een per-agent **output-contract**: elke agent-definitie levert een output-JSON-schema + parser + persistence-adapter. `extractObservations`/`persistRun` worden de eerste adapter (Strategy Analyst blijft ongewijzigd op zijn eigen pad tot de Fase-3-migratie); nieuwe agents persisteren naar het generieke artefact-model.
3. **Generiek artefact-model**: nieuw `AgentRun`-model (status, agent-id, input, kosten, trace) + `AgentArtifact` met getypeerde vormen — `report` (markdown), `table` (JSON-schema → tabel-render), `findings` (F-VAL), `link` (verwijzing naar Deliverable/KnowledgeResource/…). Eén results-inbox in de UI toont runs + artefacten; bestaande domein-modellen blijven de bron voor hun eigen surfaces (een Content Creator-run levert échte Deliverables + een `link`-artefact, geen kopie).
4. **Code-gebaseerde curated agent-registry**: agents zijn code-objecten (naam/persona, rol, system-prompt, tool-set-scoping, use-case-knoppen, `AiFeatureKey`, output-contract) — geen DB-model, geen custom-builder. Zes MVP-agents: Research Analyst, Brand Guardian, Strategist, Content Creator, Market Analyst, Data Analyst (enige zonder bestaande motor; eerste drop-kandidaat; query-tools read-only, workspace-scoped, curated — geen vrije SQL).
5. **F-VAL-poort verplicht** op alle content-producerende agents: elke content-output toont fidelity-score + findings; onder de drempel volgt auto-iterate (bestaat) of een expliciete flag — nooit een stille lage score. Dit is de marktdifferentiator (geen enkele onderzochte concurrent combineert gestructureerd merk-DNA + output-validatie).
6. **Human-in-the-loop via de bestaande Claw confirm-flow**: alle write-acties van agents lopen door `requiresConfirmation` → confirm; geen autonome mutaties. Afbakening: **Claw = conversationele overlay** (vraag-antwoord, page-aware), **Agents = taak/output-gerichte surface** (opdracht → run → artefact → goedkeuring); ze delen tool-infra en confirm-flow, niet hun surface. Een eventuele "chat met agent X"-merge is expliciet uitgesteld.
7. **Autonomie-trap als toekomstpad, niet nu**: on-demand (MVP, Fase 1) → scheduled via de bestaande job-queue + `AGENT_TASK`-brug (Fase 2, ná `vercel-deployment`) → proactief-met-approval en Brandclaw-NodeType-convergentie (Fase 3). De no-autonomy-regel uit ADR 2026-05-08 blijft gelden tot een expliciete Fase-3-herziening.
8. **Pricing**: vaste maandprijs bij launch; per-token/usage-metering als latere fase op basis van pilot-verbruiksdata (cost-calculator + PostHog per run vanaf dag 1). Merkcontext en F-VAL-validatie worden **nooit** gemeterd (anti-Jasper-positionering).

# Y-statement

In de context van **de pre-launch Agents-feature (Fase 1 MVP) bovenop een codebase waar ~80% van de agent-motoriek al bestaat maar de outputlaag hard-wired en de uitkomsten versnipperd zijn**, facing **het risico dat een snelle tweede agent-loop of een chat-only invulling de Brandclaw-convergentie blokkeert en de merk-validatie-differentiator onzichtbaar laat**, I decided **één gedeelde motor (runAgentLoop) met pluggable output-contracten, een code-gebaseerde curated agent-registry, een generiek AgentRun/AgentArtifact-model met results-inbox, en een verplichte F-VAL-poort met human-in-the-loop confirm**, to achieve **een geloofwaardige, marktconforme Agents-productlaag in 2-3 weken die zonder herbouw kan doorgroeien naar scheduled runs en Brandclaw-autonomie**, accepting tradeoff **refactor-werk aan de orchestrator-outputlaag nú (i.p.v. een snelle losse loop), geen user-configureerbare agents, en geen scheduling/autonomie in de MVP**.

# Consequences

## Positief
- Eén motor = guards, cost-tracking, PostHog-instrumentatie en tool-registry gratis voor elke nieuwe agent; Fase-3-convergentie (Brandclaw-NodeTypes als agents) wordt een migratie, geen herbouw.
- De differentiator wordt product: F-VAL-score + findings zichtbaar op élke agent-output — de claim "bewijsbaar on-brand" die geen onderzochte concurrent kan kopiëren zonder F-VAL-equivalent.
- Het artefact-model lost een bestaand probleem op (versnipperde run-uitkomsten, deep research persisteert server-side niets) en geeft lange taken een zichtbare run-status.
- Kosten-instrumentatie per run vanaf dag 1 levert de data voor het latere usage-pricing-besluit én vroegsignalering van de Deloitte-faalmodus (kosten-onvoorspelbaarheid).
- Curated code-registry is type-safe, snel te bouwen en dwingt scope-discipline af (geen builder-verleiding).

## Negatief / tradeoffs
- **Refactor-risico outputlaag (aanname A1)**: het pluggable output-contract raakt `agent-loop.ts`/`persistence.ts`; de Strategy Analyst mag daarbij niet breken. Mitigatie: adapter-patroon waarbij het bestaande observations-pad de eerste, ongewijzigde adapter is; verificatie-spike als eerste technical-planner-stap.
- **Data Analyst is nieuwbouw** (aanname A4): query-tools + tabel-artefact zonder bestaande motor — de grootste technische onzekerheid, daarom structureel de eerste drop-kandidaat richting de lite-variant (3 agents).
- **Twee AI-ingangen** (Claw-overlay + Agents-sectie) kunnen verwarren; de afbakening in D6 moet in UI-copy en onboarding expliciet terugkomen (aanname A6, pilot-observatie).
- Extra pre-launch werkstroom naast Track C — afgedekt via de week-1-voorrangsregel uit het idea-doc (Agents pauzeert als `vercel-deployment` niet gestart is), maar het aandacht-risico blijft reëel.
- Geen runtime-configureerbare agents: elke nieuwe agent of tool-set-wijziging is een code-change + deploy.

## Neutraal
- Strategy Analyst blijft voorlopig in Brand Alignment Tab 5 op zijn eigen observations-pad; verhuizing naar de catalogus is Fase 3.
- De `AGENT_TASK`-stub in de job-queue blijft een stub tot Fase 2 (bewust — scheduling hangt aan Vercel Cron in productie, dus aan `vercel-deployment`).
- Persona-namen en avatar-stijl (professioneel, Lucide/illustratie, geen cartoon/emoji) zijn een Fase-1-design-beslissing, geen architectuur.
- ADR `2026-05-08-brandclaw-agent-architectuur` blijft `accepted`; deze ADR bouwt erop voort en herziet alleen het adoptiepad (user-facing laag eerst), niet de principes (tool-use, versioned, immutable, no-autonomy).

# Alternatives considered

- **Aparte nieuwe agent-loop voor de user-facing agents** (Brandclaw-orchestrator onaangeroerd laten): snelste start zonder refactor-risico, maar twee motoren divergeren onvermijdelijk (guards, cost-tracking, tool-registries, model-resolutie) en de Fase-3-Brandclaw-convergentie zou de merge alsnog afdwingen — dan mét twee gedragen productiepaden. Verworpen: het refactor-risico van D2 is kleiner en eenmalig.
- **Alles via Claw** (agents als persona's binnen de bestaande overlay, geen nieuwe sectie): maximaal hergebruik, geen nieuw datamodel. Verworpen: Claw is conversationeel zonder run-persistentie — outputs blijven chat-blobs, er is geen taak-inbox, geen artefacten, geen run-status; de marktbewezen UX (catalogus + use-case-knoppen + results-inbox) is er niet in te realiseren. De tool-infra en confirm-flow worden wél hergebruikt (D6).
- **DB-gebaseerde agent-registry** (Prisma `Agent`-model, runtime-configureerbaar): flexibeler en voorbereid op een custom-builder. Verworpen voor MVP: zes curated agents rechtvaardigen geen migratie + admin-UI; een code-registry is type-safe en dagen sneller; de custom-builder is expliciet out-of-scope (Jasper-Business-territorium) en kan later alsnog een DB-laag krijgen zonder dat het output-contract verandert.
- **Observations-model hergebruiken als universele outputvorm** (alles in `StrategyObservation` persen): geen schema-werk. Verworpen: rapporten, tabellen en deliverable-links passen semantisch niet in een observation (severity/confidence/evidence), het zou het Brand-Alignment-domein vervuilen en de inbox zou op een oneigenlijk model leunen.
- **Direct Brandclaw bouwen** (de autonome loop als product, Agents overslaan): verworpen — de markt-analyse toont dat human-in-the-loop taak-agents het gevalideerde model zijn en volle autonomie de onbewezen faalmodus (Deloitte 2026; Gartner: >40% agentic-projecten geannuleerd vóór eind 2027). Agents ís het adoptiepad naar Brandclaw, precies zoals Jasper het deed (eerst agents + guardrails, daarna meer autonomie).

# Notes

- Onderbouwing: `docs/reports/agents-diepte-analyse-en-plan-2026-07-05.md` (marktanalyse §2-6, positionering §7, codebase-inventaris §8, gefaseerd plan §9, genomen besluiten §10) en `tasks/_drafts/idea-agents-feature.md` (discovery, aannames A1-A7, Red Team Review, week-1-voorrangsregel).
- Voortbouwend op: `2026-05-08-brandclaw-agent-architectuur.md` (motor-principes), `2026-05-05-fval-three-pillar.md` (validatie-pijler), `2026-05-12-cron-infra.md` (Fase-2-scheduling via Vercel Cron).
- Kern-code die deze ADR raakt: `src/lib/brandclaw/orchestrator/agent-loop.ts` + `persistence.ts` (output-contract), `src/lib/claw/tools/registry.ts` + confirm-flow (hergebruik), `src/lib/ai/feature-models.ts` (nieuwe `AiFeatureKey`s), `prisma/schema.prisma` (`AgentRun`/`AgentArtifact`), `src/App.tsx` + `SIDEBAR_NAV` (nieuwe sectie), `src/features/agents/` (nieuw).
- Volgende stap: ✅ technical-planner uitgevoerd 2026-07-05 — user besloot álle fasen te promoten: `tasks/agents-foundation.md`, `agents-motor-wiring.md`, `agents-ui-inbox.md`, `agents-data-analyst.md` (Fase 1), `agents-scheduling.md` (Fase 2), `agents-brandclaw-convergentie.md` (Fase 3-epic). `vercel-deployment` is 2026-07-05 gerealiseerd; de week-1-voorrangsregel uit het idea-doc is daarmee afgehecht.

## Aanvullingen 2026-07-05 (uit technical planning — verfijningen, geen herziening)

- **D6-verfijning (confirm in batch-context)**: write-tools draaien in agent-context nooit direct. De Claw→orchestrator-tool-bridge levert `buildProposal()`-output als `PROPOSAL`-artefact; de run eindigt in `AgentRun.status = AWAITING_CONFIRMATION` en bevestiging gebeurt post-run via de bestaande confirm-route. Géén loop-suspend/resume — dat zou een tweede loop-variant introduceren.
- **D1-verfijning (pipeline-motoren)**: `runDeepResearch` en `orchestrateContentGeneration` zijn pipelines, geen tool-use-agents — ze draaien als *pipeline-as-tool* bínnen `runAgentLoop`, met per-agent `timeoutMs`-overrides.
- **Vercel-runtime**: synchrone runs vereisen `export const maxDuration` op de run-route (Fluid; precedent 300s in studio-routes, hier ~800s); de deep-research-config wordt begrensd op ≤ ~10 min.
- **Fase 2 voegt een `AgentSchedule`-model toe** naast de `AGENT_TASK`-brug (niet in de oorspronkelijke beslissing benoemd). Elke schema-change vereist handmatige Neon `prisma db push` (gotcha `neon-schema-push-on-deploy`).
- **Mogelijk `'agents'`-lid** in de `AiFeatureDefinition.category`-union voor de Settings-groepering — beslispunt-met-fallback in `agents-foundation`.
- **Effort-realiteit**: Fase 1 telt in technical planning op naar 16-24 dagen (~3-4,5 wk) t.o.v. 2-3 wk in het idea-doc; de lite-fallback (Data Analyst droppen + motor-wiring trimmen naar 3 agents) komt op ~11-17 dagen. De lite-trigger is dus waarschijnlijker dan het idea-doc suggereert.

## Aanvullingen 2026-07-06 (uit agents-foundation-implementatie + user-directives)

- **D3-aanvulling — domain-first write-through + accept-materialisatie**: agents draaien de bestaande motoren, dus resultaten landen in de bestaande domein-modellen (automatisch zichtbaar in de module-UI's); de inbox toont `LINK`-referenties. Vrije REPORT/TABLE-artefacten (geen domein-thuis) materialiseren bij artifact-**accept** naar de Knowledge Library als `KnowledgeResource` met nieuw enum-lid `ResourceSource.AGENT` (helper `materializeArtifactOnAccept` in `src/lib/agents/registry/materialize-artifact.ts`: accept-gated, idempotent via `content.knowledgeResourceId`, fail-soft). Volledige integratie-matrix: `tasks/agents-motor-wiring.md`.
- **Brandclaw-reconciliatie (user-directive 2026-07-06)**: `strategy-analyst-stub` **Phase C is herbestemd** — geen bespoke weekly cron voor één node. Mapping: weekly Analyst-runs → gewone `AgentSchedule`-rij ná Fase-3-item-1; per-workspace concurrency-cap → `agents-scheduling` (generiek); cost-budget-alerts → Fase-3-item-4 (stond er al); BB-pilot-smoke → gekoppeld aan `pilot-onboarding-better-brands`. De LATER-roadmap "Brandclaw transformatie (Optie B)"-tabel is volledig geabsorbeerd door `agents-brandclaw-convergentie`; de `brand-assistant-standalone-app` J1-tekst-MVP wordt de facto geleverd door de Brand Guardian-agent. Details + gedateerde supersede-notes: `tasks/strategy-analyst-stub.md` + roadmap.
- **A1 bewezen (2026-07-06)**: de output-contract-refactor is geland zonder Strategy-Analyst-regressie — baseline-run `7cb56c12` (pre) vs `0e94e26d` (post) structureel identiek (17/17 smoke beide, zelfde promptVersion/trace-shape). Implementatie-vorm: `runLoopCore`-extractie + `runAgentLoop`-overloads + `runAgentWithContract` (geen placeholder-write in de contract-path; de run-entry bezit de `AgentRun`-lifecycle). De category-beslispunt-met-fallback is beslist: `'agents'`-lid toegevoegd (raakte zoals voorspeld maar 2 plekken).

## Aanvulling 2026-07-07 — D8 (pricing) herzien

- **D8 vervangen** door ADR [`2026-07-07-pricing-credits-launch`](2026-07-07-pricing-credits-launch.md). De "vaste maandprijs bij launch, per-token-metering later"-lijn is onhoudbaar gebleken (marge-realiteit + de fair-use-rem was nooit aangesloten: `trackAiUsage` wordt nergens aangeroepen, `ai_usage_record` leeg). Launch-model wordt nu: **lage vaste basis + prepaid credit-bundel + on-demand top-up (€0,10/credit)**, met een **€15 platform-floor** en **output-only metering**. De kern van D8 blijft staan: **merkcontext en F-VAL-validatie worden nooit gemeterd** (nu expliciet als 0-credit-acties). De kosten-instrumentatie-per-run (cost-calculator + PostHog) blijft de databron. Bouw: `tasks/pricing-credits-billing.md`. De overige agents-ADR-besluiten (D1-D7) blijven ongewijzigd `accepted`.
