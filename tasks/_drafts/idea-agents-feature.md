---
id: agents-feature
title: Agents — user-facing persona-agents op merk-DNA met F-VAL-gevalideerde output
status: promoted (2026-07-05 → agents-foundation, agents-motor-wiring, agents-ui-inbox, agents-data-analyst, agents-scheduling, agents-brandclaw-convergentie)
created: 2026-07-05
verdict: ready-to-build
scope: Fase 1 MVP pre-launch (parallelle werkstroom, 2-3 weken); Fase 2 (scheduling) en Fase 3 (Brandclaw-convergentie) expliciet out-of-scope voor de MVP-bouw — update 2026-07-05: user besloot de technical-planning wél voor álle fasen te doen (task-files per fase; Fase 2/3 blijven gated op Fase 1-afronding resp. go/no-go)
blocked-by: - (Track C-voorrangsregel VERVULD 2026-07-05 — vercel-deployment is live op branddock-7y9n.vercel.app, main=production; de harde launch-blocker is opgelost en de week-1-trigger is daarmee afgehecht)
related-research: docs/reports/agents-diepte-analyse-en-plan-2026-07-05.md (adversarieel geverifieerde marktanalyse + codebase-inventaris + gefaseerd plan)
related-adr: docs/adr/2026-07-05-agents-architectuur.md (geschreven 2026-07-05 — voorwaarde 3 uit het verdict is daarmee vervuld; A1-aanpak beslist: pluggable output-contract met observations als eerste adapter)
---

# Probleemstelling (1 zin)

Branddocks motoren (deep research, strategie, contentgeneratie, F-VAL-review, competitor-analyse) zijn alleen bereikbaar via losse module-UI's die de gebruiker zelf moet kennen en bedienen — er is geen taakgerichte "geef opdracht, keur resultaat goed"-ingang, terwijl de markt (Sintra, Jasper) precies die agent-UX in 2025-2026 tot koopstandaard heeft gemaakt.

# WHO — Doelgebruiker

**Rol**: (1) SMB-merkeigenaar die marketing er "bij doet" en niet elke module wil leren; (2) agency-medewerker die per klant-workspace snel deliverables en analyses moet opleveren.
**Schaal (pre-launch)**: 4 pilot-workspaces in de pipeline (Better Brands, Linfi, Nobox, WRA Juristen) + founder-dogfood (N=1). Geen bredere userbase vóór launch.
**Acuut segment**: Better Brands als eerste pilot — de eerste indruk van BB bepaalt of Branddock als "content-generator met scoring" (Jasper-lookalike) of als "agents op je merk-DNA met bewijsbaar on-brand output" (uniek) geframed wordt.

## JTBD-narratief

> "Toen een merkeigenaar een concurrentie-scan plus een on-brand contentserie wilde, wilde hij dat werk gewoon laten uitvoeren en het resultaat beoordelen, maar hij moest zelf weten dat deep research onder Knowledge zit, strategie in de Campaign-wizard, review in Brand Alignment en content in de Canvas — of hij viel terug op ChatGPT, dat zijn merkcontext niet kent en niets valideert."

Eerlijkheidsclausule: dit narratief is gedestilleerd uit founder-observatie + marktanalyse, niet uit een letterlijk klantcitaat. Er ligt geen pilot-ticket "bouw agents". De marktvalidatie is indirect maar sterk (zie Evidence).

## Evidence

- `docs/reports/agents-diepte-analyse-en-plan-2026-07-05.md` — adversarieel geverifieerde analyse (21 bronnen, 25 claims geverifieerd): Sintra verkoopt 12 persona-helpers, Jasper herpositioneerde juni 2025 volledig naar "multi-agent platform"; human-in-the-loop taak-agents zijn het marktbewezen model.
- Zelfde rapport, §4-patroon (d): **geen enkele onderzochte speler combineert gestructureerd merk-DNA-grounding met output-validatie** — Branddock heeft beide motoren al in productie (`getBrandContext`-stack + F-VAL).
- Codebase-inventaris (rapport §8): ~80% van de motoriek bestaat; de Strategy Analyst "ís feitelijk al een agent — weggestopt in een tab van Brand Alignment". Discoverability van bestaande kracht is aantoonbaar het gat.
- Memory `content-types-picker-scope`: slechts ~24 van 55 content-types zijn bereikbaar via de UI — een tweede, onafhankelijk bewijs dat Branddock-capaciteit achter navigatie-drempels verstopt zit.
- Anti-evidence (eerlijk benoemd): geen pilot-klant heeft om "agents" gevraagd; Gartner (juni 2025) voorspelt dat >40% van agentic-AI-projecten vóór eind 2027 sneuvelt op kosten/onbewezen waarde.

# WHAT — Probleem (niet oplossing)

Een gebruiker die "iets gedaan wil krijgen" (rapport, strategie, contentserie, merkcheck, tabel-analyse) moet vandaag eerst het juiste Branddock-mentale-model hebben: welke module, welke tab, welke wizard. Wie dat model mist, gebruikt een fractie van het platform of stapt uit naar een generieke chatbot. Resultaten van lange taken zijn bovendien versnipperd (StrategyObservation, Deliverable, KnowledgeResource, ContentReviewLog, ClawConversation) en deep research persisteert server-side niets — er is geen plek waar "werk dat voor mij gedaan is" landt en goedgekeurd wordt.

# WHY-NOW

Triggers:
- **Koopframe-verschuiving in de markt**: sinds Jaspers herpositionering (juni 2025) en Sintra's groei evalueren prospects tools in het frame "welke agents heb je?". BB en agency-prospects gaan Branddock daar bij eerste indruk aan afmeten.
- **Marginale kosten zijn nu historisch laag**: agent-loop, ~40 Claw-tools met confirm-flow, aanroepbare pipelines en brand-context-stack bestaan al — de MVP is vooral orkestratie + surfacing (2-3 weken), geen motorbouw (behalve Data Analyst).
- **Pre-launch venster**: de differentiator ("elke agent op volledig merk-DNA + F-VAL-score op elke output") landt maximaal als BB hem vanaf dag 1 ziet; achteraf toevoegen betekent een tweede eerste indruk verdienen.
- **Brandclaw-pad**: Agents is de user-facing opstap naar de al besloten Brandclaw-transformatie (zelfde motor: `runAgentLoop`); nu bouwen voorkomt straks een parallelle tweede surface.

Niet-triggers (eerlijk): geen klantvraag, geen omzet-effect pre-launch, en dit versnelt `vercel-deployment` of `stripe-billing-live` op geen enkele manier.

# SUCCESS METRICS

**Primaire metric** (één): **wekelijkse agent-run-adoptie per pilot-workspace** — binnen 30 dagen na Fase-1-livegang draait ≥3 van de 4 pilot-workspaces wekelijks ≥3 voltooide agent-runs waarvan de output geaccepteerd wordt (artefact bekeken + niet weggegooid / confirm gegeven). Meting: `AgentRun`-model + PostHog-events (`agent_run_started`, `agent_run_completed`, `agent_output_accepted`).

**Counter-metric (hard, mag NIET kapotgaan)**: **Track C-doorlooptijd** — `vercel-deployment` (3d effort) wordt niet later gemerged dan zonder deze werkstroom gepland. Operationalisering: zie de voorrangsregel onder CONSTRAINTS; elke week Agents-werk zonder Track C-progressie is een gefaalde counter-metric.

**Guardrails (secundair, bewaken)**:
- Gemiddelde F-VAL-score van agent-gegenereerde content ≥ score van dezelfde content via de bestaande Canvas-flow (de agents mogen de kwaliteitsclaim niet ondermijnen).
- Bestaande content-flow-adoptie (Canvas-deliverables per workspace) daalt niet zonder dat agent-runs die 1-op-1 vervangen — kannibalisatie zonder vervanging = regressie.
- Kosten per agent-run geïnstrumenteerd vanaf dag 1 (bestaande cost-calculator + PostHog) — input voor latere usage-pricing, en vroegsignaal voor de Deloitte-faalmodus (credit-verbranding).

# CONSTRAINTS

## Hard
- **Tijd**: Fase 1 MVP = 2-3 weken in een eigen worktree, parallel aan Track C. **Voorrangsregel (user-besluit 2026-07-05, aangescherpt)**: `vercel-deployment` is het kritieke pad. Realiteitscheck roadmap: Track C staat vandaag op "⏸️ niet gestart, worktree ~58 commits behind main" — "parallel" is dus nu nog een belofte, geen feit. Daarom hard: **als Track C niet uiterlijk in week 1 van de Agents-werkstroom daadwerkelijk gestart is, pauzeert Agents tot vercel-deployment gemerged is.** Lite-variant (3 agents: Research Analyst + Brand Guardian + Strategist, ~1-1,5 week) is de fallback bij elke tijdsdruk; **Data Analyst is de eerste drop-kandidaat** (enige agent zonder bestaande motor).
- **Tech**: één agent-motor — hergebruik `runAgentLoop` + bestaande Claw tool-registry + confirm-flow; géén tweede loop of parallelle tool-registry. F-VAL-poort verplicht op alle content-producerende agents. Agent-registry is code-based (curated), geen DB-model in MVP. Per agent een `AiFeatureKey` via `resolveFeatureModel`.
- **Data/security**: Data Analyst-query-tools zijn read-only en strikt workspace-scoped; geen vrije SQL, alleen voorgedefinieerde query-tools. Prompt-injection-fencing zoals bij bestaande Claw-tools.
- **Pricing (besluit vast)**: vaste maandprijs bij launch; per-token/usage-metering later; **merkcontext en F-VAL-validatie worden nooit gemeterd** (anti-Jasper-positionering). Instrumentatie voor latere metering wél vanaf dag 1.
- **Positionering (besluit vast)**: persona-agents — benoemde agents met naam/rol, professioneel ingevuld (Lucide/illustratie, geen cartoon, geen emoji). Definitieve namen zijn Fase-1-design.

## Soft
- Solo-dev: de echte schaarste is founder-aandacht, niet file-ownership. Worktree-discipline (naming `branddock-feat-agents-feature`) + task-files met file-ownership conform `tasks/_README.md`.
- Claw ↔ Agents-verwarring: twee AI-ingangen in één product vereisen een expliciete afbakening (Claw = conversationele overlay, Agents = taak/output-gerichte surface, gedeelde tool-infra) — vast te leggen in de Fase-0-ADR `agents-architectuur` (technical-planner-werk).

## Must NOT do
- Geen scheduling/cron-brug in MVP (de `AGENT_TASK`-stub blijft een stub) — dat is Fase 2, ná `vercel-deployment`.
- Geen autonomie: geen proactieve runs, geen autopilot, geen autonomie-schuif. Human-in-the-loop op elke write-actie via de bestaande confirm-flow.
- Geen custom agent-builder (Jasper-Business-territorium, expliciet niet ons MVP-model).
- Geen credits/usage-metering, geen outcome-pricing.
- Geen migratie van Brandclaw-NodeTypes of de Strategy Analyst naar de catalogus (Fase 3).
- Geen vrije-vorm data-toegang voor Data Analyst (alleen curated query-tools).

# SCOPE

## In-Scope (MVP — Fase 1)

**Zes persona-agents, elk een dunne config over een bestaande motor** (werknamen; persona-namen volgen in design):
1. **Research Analyst** → `runDeepResearch` → geciteerd rapport (KnowledgeResource)
2. **Brand Guardian** → `runFidelityForExternalContent` (F-VAL) → fidelity-score + findings
3. **Strategist** → stappen uit `strategy-chain.ts` → strategy blueprint (+ optioneel deliverables)
4. **Content Creator** → `create_deliverable` + `orchestrateContentGeneration` → deliverables in de Canvas
5. **Market Analyst** → competitor-tools + Strategy-Analyst-dimensies → analyse-rapport/observaties
6. **Data Analyst** → nieuwe curated query-tools op workspace-data → tabel-artefact (JSON-schema → tabel-render) — *enige nieuwe motor; eerste drop-kandidaat bij uitloop*

**Vijf bouwblokken**:
7. Code-gebaseerde agent-registry (per agent: system-prompt, tool-set-scoping, use-case-knoppen, `AiFeatureKey`)
8. Agents-sectie in de UI (SIDEBAR_NAV + App.tsx-case + `src/features/agents/`): catalogus → agent-detail met use-case-knoppen + chat (hergebruik Claw panel-mode met per-agent scoping)
9. `AgentRun` + generiek output-artefact-model (rapport/tabel/findings/deliverable-link) + results-inbox
10. F-VAL-poort op alle content-producerende agents — score + findings zichtbaar bij elke output (dé differentiator)
11. Human-in-the-loop: hergebruik Claw's confirm-flow voor alle write-acties

## Out-of-Scope (expliciet NIET, ook al verleidelijk)

1. **Scheduling** ("elke maandag concurrentie-scan") — Fase 2, hard afhankelijk van Vercel Cron in productie, dus ná `vercel-deployment`
2. **Proactieve voorstellen** (agent stelt zelf werk voor) — Fase 2
3. **Run-notificaties** (in-app/e-mail bij voltooide runs) — Fase 2, leunt op digest-infra
4. **Per-agent geheugen** via `AgentMemory`/pgvector — Fase 2
5. **Autonomie-schuif per agent** (assisted → scheduled → autopilot) — Fase 3
6. **Brandclaw-convergentie**: Strategy Analyst-verhuizing + `campaign_builder`/`measurement_eval`/`optimization` als agents — Fase 3
7. **Per-workspace cost-budget-bewaking** met alerts — Fase 3 (instrumentatie wél nu)
8. **Custom agent-builder** (user maakt eigen agents) — geen enkel plan-horizon; curated is het model
9. **Usage-/credit-pricing, per-agent pricing-tiers** — pricing-besluit staat vast: vaste maandprijs
10. **"Chat met agent X" volledig via de Claw-overlay mergen** — afbakening eerst in ADR; eventuele merge later
11. **Meer dan 6 agents / agent-marketplace** — catalogus-uitbreiding pas op pilot-vraag
12. **Nieuwe motoren naast Data Analyst-query-tools** (bijv. eigen SEO-agent, translation-agent) — bestaande motoren only
13. **Agent-output naar externe kanalen publiceren** — Channel Activation blijft LATER-roadmap
14. **Mobile/PWA-surface voor Agents** — desktop-first

> Out-of-Scope (14) > In-Scope (11) — begrenzing klopt, en de zwaarste verleiding (scheduling) staat er expliciet bij.

# AANNAMES

Aannames die WAAR moeten zijn voor deze feature te slagen:

- **A1 — De bestaande motoren zijn generiek aanroepbaar vanuit een agent-context.** Bewijs: `runDeepResearch` is dependency-injectable, `orchestrateContentGeneration` staat los van HTTP, `runFidelityForExternalContent` draait al als Claw-tool. **Deels onbewezen**: de orchestrator-outputlaag is hard-wired op `observations` + `StrategyObservation`-persistence — de generalisatie naar generieke artefacten is nieuw werk met refactor-risico. Validatie: eerste technical-planner-spike.
- **A2 — Persona-framing verhoogt adoptie t.o.v. functionele module-navigatie.** Bewijs: Sintra's commerciële succes met 12 helpers + Jaspers pipeline-agents; use-case-knoppen verlagen de prompt-drempel aantoonbaar (Sintra-model). **Onbewezen als causaal verband** — vendor-succes is geen A/B-test. Validatie: primaire metric in de pilot; besluit persona-agents staat vast, dus dit is een te monitoren risico, geen open keuze.
- **A3 — Een zichtbare F-VAL-score bij elke output wordt als waarde ervaren, niet als frictie.** Bewijs: F-VAL is bewezen in de Canvas-flow. **Onbewezen in agent-context** (een lage score op agent-werk kan vertrouwen in de ágent schaden i.p.v. het merkbewustzijn versterken). Validatie: founder-dogfood vóór pilot-exposure; onder drempel → auto-iterate (bestaat) of expliciete flag.
- **A4 — Data Analyst-query-tools + tabel-artefact zijn in dagen (niet weken) veilig te bouwen.** Bewijs: geen — dit is de enige agent zonder motor. **Onbewezen; grootste technische onzekerheid.** Mitigatie is structureel: eerste drop-kandidaat richting lite-variant.
- **A5 — De parallelle werkstroom kannibaliseert Track C niet.** Bewijs: meertaligheid draaide eerder succesvol als parallelle werkstroom. **Onbewezen en historisch tegengesproken**: Track C staat al weken op "niet gestart" terwijl parallelle werkstromen wél liepen. Validatie: de harde voorrangsregel onder CONSTRAINTS (week-1-trigger) maakt dit meetbaar i.p.v. aspirationeel.
- **A6 — Gebruikers raken niet verward door twee AI-ingangen (Claw-overlay + Agents-sectie).** Bewijs: geen. Validatie: ADR-afbakening in Fase 0 + expliciete copy in de UI; pilot-observatie.
- **A7 — Kosten per run passen binnen een vaste maandprijs.** Bewijs: bestaande guards (maxToolCalls 20, 5-min wallclock, cost-calculator). **Onbewezen op pilot-volume** — instrumentatie vanaf dag 1 levert de data vóór het pricing-besluit bij `stripe-billing-live`.

> Zwaarste onbewezen aannames: A1 (output-generalisatie), A4 (Data Analyst) en A5 (aandacht-kannibalisatie). A1 en A4 worden vroeg in technical planning geverifieerd; A5 is via de voorrangsregel afgedwongen in plaats van gehoopt.

# ACCEPTATIECRITERIA (MVP)

- [ ] Given een workspace met volledig merk-DNA, When de user de Agents-sectie opent, Then ziet hij een catalogus van 6 benoemde persona-agents met rolduiding en klikbare use-cases (loading + error states aanwezig).
- [ ] Given de Research Analyst-detailpagina, When de user een use-case-knop klikt en een onderwerp opgeeft, Then start een `AgentRun` met zichtbare voortgangsstatus en landt het geciteerde rapport als artefact in de results-inbox.
- [ ] Given de Content Creator produceert een deliverable, When de run voltooit, Then toont de output een F-VAL-score + findings; onder de drempel volgt auto-iterate of een expliciete flag — nooit een stille lage score.
- [ ] Given een agent bereikt een write-actie (bijv. deliverable aanmaken), When de run die actie voorstelt, Then verschijnt de bestaande confirm-flow en wordt er zonder goedkeuring niets gemuteerd.
- [ ] Given de Data Analyst krijgt een vraag over workspace-data, When de run voltooit, Then rendert een tabel-artefact (JSON-schema) in de inbox, uitsluitend gebaseerd op workspace-scoped read-only query-tools.
- [ ] Given een run faalt of overschrijdt de guards (maxToolCalls/wallclock), When de user de inbox bekijkt, Then is de status "failed" met een begrijpelijke foutmelding en zijn er geen halve artefacten gepersisteerd.
- [ ] Given elke voltooide run, Then zijn kosten (tokens/USD via cost-calculator) en PostHog-events (`agent_run_started/completed`, `agent_output_accepted`) vastgelegd.

# EERSTE TAAK (morgen startbaar)

**ADR `agents-architectuur` schrijven** (`docs/adr/2026-07-XX-agents-architectuur.md`, Fase 0 uit het plan) met vier beslispunten: (1) vorm van de code-gebaseerde agent-registry, (2) generiek output-artefact-model + verhouding tot de bestaande observations-outputlaag (aanname A1 verifiëren), (3) afbakening Claw ↔ Agents (overlay vs taak-surface, gedeelde tool-infra), (4) autonomie-trap als toekomstpad (on-demand → scheduled → proactief-met-approval) zonder implementatie nu. Direct daarna: technical-planner op dit doc.

---

# Red Team Review

> Onafhankelijke kritiek. Stel: een ervaren PM zou dit plan zien — wat zou ze zeggen?

## Zwakste schakel

**A5 — de "parallelle werkstroom" is op dit moment een fictie.** De roadmap zegt letterlijk: Track C "⏸️ niet gestart (worktree ~58 commits behind main)". Het risico is niet file-conflicts maar founder-aandacht: het nieuwe, leuke werk (Agents) absorbeert de energie terwijl de saaie harde launch-blocker (deployment) geparkeerd blijft — precies het patroon dat de afgelopen weken al zichtbaar was. Als A5 faalt, faalt niet alleen deze feature maar de hele launch-planning. Daarom staat de week-1-voorrangsregel als harde constraint in dit doc, niet als intentie.

**Sub-zwakke schakel**: A1/A4 samen — als de output-generalisatie van de orchestrator tegenvalt én de Data Analyst meer dan een paar dagen kost, verdampt de "80% bestaat al"-premisse waar het hele pre-launch-argument op leunt, en wordt 2-3 weken stilzwijgend 4-5.

## Pleidooi tegen dit plan

Dit is de **tweede pre-launch scope-uitbreiding op rij**: het Brand Control Program verlegde de pilot-start al met 10-14 weken, en nu komt daar een werkstroom van 2-3 weken bij terwijl de daadwerkelijke launch-blocker (3 dagen werk!) al weken onaangeroerd ligt. Geen enkele pilot-klant heeft om agents gevraagd; het WHY-NOW is volledig positionerings- en marktframe-gedreven, gebouwd op vendor-claims van concurrenten. Gartner voorspelt dat >40% van agentic-projecten sneuvelt op onbewezen waarde — en Branddock voegt er bewust een zesde agent zonder motor (Data Analyst) aan toe. De goedkoopste route naar hetzelfde leren zou zijn: eerst deployen, BB onboarden, en kijken of gebruikers de bestaande modules überhaupt vinden.

## Wat zouden we leren door NIET te bouwen

- BB-pilot op de huidige feature-set zou in 2-4 weken laten zien wélke motoren gebruikers organisch vinden en welke taken ze buiten Branddock blijven doen — dat is de echte agent-catalogus-prioritering, gratis.
- Goedkoper tussen-experiment: use-case-knoppen (Sintra's kern-UX-inzicht) toevoegen aan bestaande surfaces of aan de Claw-overlay — dagen i.p.v. weken, test A2 (persona/knoppen-framing) zonder nieuw datamodel.
- Kostendata uit gewone pilot-usage zou A7 (vaste maandprijs haalbaar?) valideren vóór er een agents-belofte in de pricing staat.
- Dit alles is door de user gezien en gewogen: het positioneringsvenster (eerste indruk BB + markt-koopframe) is expliciet verkozen boven de leer-route. Dat is een legitieme strategische keuze — mits de voorrangsregel hard blijft.

## Verdict van de planner

**ready-to-build** — conditioneel, met drie niet-onderhandelbare voorwaarden in dit doc verankerd:

1. **Track C-voorrangsregel**: `vercel-deployment` daadwerkelijk gestart uiterlijk week 1 van de Agents-werkstroom, anders pauzeert Agents. De counter-metric is hierop ingericht.
2. **Lite-fallback met kalendertrigger**: bij elke uitloop of Track C-druk terug naar 3 agents (Research Analyst, Brand Guardian, Strategist); Data Analyst is de eerste drop.
3. **ADR `agents-architectuur` vóór de eerste regel feature-code** — A1 (output-generalisatie) en de Claw↔Agents-afbakening moeten beslist zijn, niet ontdekt tijdens de bouw.

Reden: de user-besluiten van 2026-07-05 staan vast en zijn strategisch consistent (agents als opstap naar de al besloten Brandclaw-transformatie, differentiator die niemand inneemt, ~80% motoriek aanwezig). De discovery-basis is ongewoon sterk (adversarieel geverifieerde analyse + codebase-inventaris). Het restrisico is geen product-risico maar een executie-risico (aandacht-kannibalisatie), en dat is met harde triggers afdekbaar. Zonder voorwaarde 1 zou dit verdict "needs-validation-first" zijn geweest.

# 5-Punts Stop-Conditie (afgevinkt door feature-planner)

- [x] Probleem in 1 zin formuleerbaar
- [x] Eén primaire success-metric (wekelijkse agent-run-adoptie per pilot-workspace; Track C-doorlooptijd als harde counter)
- [x] Out-of-Scope-lijst langer dan In-Scope-lijst (14 vs 11)
- [x] MVP-acceptance-criteria concreet (Given/When/Then, 7 stuks)
- [x] Eerste taak morgen startbaar (ADR `agents-architectuur`)

# Volgende stap

Klaar voor technical-planner — **alleen Fase 1 MVP promoten** (Fase 2 scheduling en Fase 3 Brandclaw-convergentie niet meenemen; die krijgen later hun eigen discovery-check). Volgorde: (1) ADR `agents-architectuur` via `adr-create`, met expliciete verificatie van aanname A1; (2) technical-planner op dit doc → task-file(s) in `tasks/` met file-ownership voor worktree `branddock-feat-agents-feature`; (3) parallel en met voorrang: Track C `vercel-deployment` starten — de week-1-trigger loopt vanaf de eerste Agents-commit.
