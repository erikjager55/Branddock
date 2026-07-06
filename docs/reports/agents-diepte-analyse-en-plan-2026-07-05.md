# AI Agents in Branddock — diepte-analyse & plan van aanpak

> **Datum**: 2026-07-05
> **Aanleiding**: user wil contentgeneratie, analyses, strategieën, tabellen e.d. via "Agents" toevoegen (referentie: sintra.ai en jasper.ai).
> **Methode**: (1) deep-research-workflow met adversariële verificatie (103 agents, 21 bronnen, 25 claims geverifieerd → 21 bevestigd / 4 verworpen); (2) aanvullende brede webscan van 5 spelers (vendor-claim-niveau, niet adversarieel geverifieerd); (3) volledige codebase-inventaris van bestaande agent-bouwstenen.
> **Kaders van de user**: Brandclaw-verhouding laten bepalen door de analyse; pre-launch MVP mág overwogen worden maar `vercel-deployment` (hard launch-blocker) mag niet gegijzeld worden.

---

## 1. Samenvatting

**Sintra en Jasper verkopen twee verschillende agent-UX-modellen, en géén van beide is een autonome achtergrond-loop.** Sintra verkoopt 12 persona-"AI employees" (benoemde helpers met een gedeelde kennisbank en 90+ klikbare use-cases) als goedkope prosumer-bundel met credit-metering. Jasper herpositioneerde zich in juni 2025 als multi-agent platform: 100+ gespecialiseerde taak-agents langs een vijf-fasen Content Pipeline, expliciet human-in-the-loop ("Orchestrated by humans, not left to run unchecked"), gegrond in één gedeelde merkcontext-laag (Jasper IQ). Het dominante, marktbewezen model 2025-2026 is **user-facing taak-agents met menselijke orkestratie en goedkeuring** — precies wat de faalmodi-literatuur (Deloitte TMT 2026) ook adviseert.

**Voor Branddock betekent dit**: het Sintra/Jasper-agents-model is een **ánder, lichter productconcept dan Brandclaw** (user-facing taak-agents vs autonome achtergrond-loop) — en tegelijk de logische **opstap ernaartoe**. Jaspers eigen pad bewijst het: eerst agents + guardrails, daarna meer autonomie. De bestaande Brandclaw-orchestrator (Anthropic tool-use loop) kan letterlijk de motor onder de user-facing agents worden.

**De white space**: geen enkele onderzochte speler combineert gestructureerde merk-DNA-grounding mét output-validatie tegen het merk. Jasper claimt guardrails (Brand IQ) maar G2-reviews betwisten de handhaving, en Jasper meteert merkcontext juist als **upsell-as** (Pro: 2 brand voices / 5 knowledge assets / 3 audiences; Style Guide alleen op Business). Branddock heeft beide al in huis: 12 canonical brand assets + BrandVoiceguide als gestructureerd merkmodel, en F-VAL als bewezen fidelity-scoring. **"Agents die op je volledige merk-DNA draaien en waarvan elke output tegen het merk gevalideerd wordt — op elke tier"** is een positionering die niemand inneemt.

**Haalbaarheid**: de codebase-inventaris laat zien dat ~80% van de motoriek al bestaat (agent-loop, ~40 Claw-tools met confirm-flow, aanroepbare pipelines voor content/strategie/research/review, job-queue + cron, brand-context-stack). Wat ontbreekt is de **productlaag**: agent-catalogus, taak-inbox/results-surface, generieke output-artefacten, scheduling-brug en run-status-tracking. Een geloofwaardige "Agents"-MVP is dus vooral orkestratie + surfacing — realistisch in 2-3 weken, met een pre-launch-lite-variant van ~1-1,5 week.

---

## 2. Sintra.ai — diepte-analyse

Alle onderstaande feiten zijn adversarieel geverifieerd (3-0 votes tenzij vermeld).

**Agent-model — 12 persona-helpers.** Sintra biedt exact 12 rolgebaseerde "Helpers", elk met naam, uiterlijk en specialisme: Buddy (business development/strategie), Cassie (customer support), Commet (e-commerce), Dexter (data-analyse), Emmie (e-mailmarketing), Gigi (personal development), Milli (sales), Penn (copywriting), Scouty (recruitment), Seomi (SEO), Soshie (social media), Vizzy (virtual assistant). ([help.sintra.ai](https://help.sintra.ai/en/articles/9607295-sintra-helpers-explained), [sintra.ai/pricing](https://sintra.ai/pricing))

**Grounding — "Brain AI".** Een gedeelde bedrijfskennisbank (merknaam, feiten, bestanden, geüploade webpagina's) die automatisch in de output van elke Helper wordt geïnjecteerd. Belangrijk: dit is een **ongestructureerde kennisbank**, geen merkmodel — er is geen equivalent van Branddocks 12 canonical assets of voice-structuur. Helpers delen Brain AI-kennis maar geen live chatcontext tussen threads.

**Taak-uitvoering — 90+ klikbare "Use-Cases".** Naast vrije chat heeft elke Helper voorgedefinieerde, klikbare taakknoppen ("clickable buttons that will prompt the helper to execute a task right away"), bijv. Marketing Strategy Generator (Buddy) of LinkedIn-post-writer (Soshie). Dit verlaagt de prompt-drempel drastisch — een kernonderdeel van de UX.

**Pricing/doelgroep.** All-in bundel ("Sintra X", alle 12 helpers) met prijsanker + kortingslooptijden: 1 mnd $97 (getoond $48,50/mo), 3 mnd $59 ($23,60/mo), 12 mnd $52 ($15,60/mo). Alle plannen: 250 maandelijkse credits die agent-acties meteren (chat 0,1-1 credit, image-gen 0,5-1,8, scheduled tasks 1-20+), 15+ integraties. Doelgroep: solopreneurs/SMB. (Live geverifieerd 2026-07-05; kortingen lijken persistente promo.)

**Verworpen claims (belangrijk voor kalibratie):** de claim dat Sintra-helpers achtergrond-autonomie hebben en elkaar automatisch aanroepen werd **0-3 verworpen** — Sintra's positie op de autonomie-as is onbewezen. Ook per-helper-pricing ($39/losse helper) werd verworpen.

---

## 3. Jasper.ai — diepte-analyse

**Herpositionering juni 2025.** Op 10 juni 2025 lanceerde Jasper (CEO-blog + PR Newswire) zichzelf als "het eerste multi-agent platform gebouwd voor marketeers" — agents als kernproduct, niet als feature. ([jasper.ai/blog](https://www.jasper.ai/blog/introducing-first-multi-agent-platform-built-for-marketers))

**Agent-model — 100+ taak-agents langs een Content Pipeline.** Geen generieke copilot: per juli 2026 biedt Jasper 100+ gespecialiseerde, benoemde taak-agents, elk gebouwd voor één of meer stappen van de vijf-fasen pipeline **Plan → Create → Adapt → Activate → Optimize**. Flagships: Optimization Agent, Research Agent (gecitieerde deep-research-rapporten in 2-10 min), Personalization Agent, Translation Agent; daarnaast tientallen kleinere (Competitor Audit, Gap Finder, SEO/AEO/GEO Rewriter, Blog Post…). ([jasper.ai/agents](https://www.jasper.ai/agents))

**Autonomie-model — expliciet human-in-the-loop.** "Autonomous, but not uncontrolled": agents voeren multi-step workflows en long-running taken uit met geheugen over stappen heen, maar "humans stay firmly in control—setting intent, approving outputs, and adjusting direction"; "autonomy within defined guardrails". Dit is het frame van de marktleider — niet volle autonomie.

**Context-laag — Jasper IQ.** Alle agents en pipelines worden gevoed door één gedeelde merkcontext-laag ("the AI context layer for marketing"): Brand IQ (voice, visual guidelines, style guide) + Marketing IQ + Knowledge Base, geïnjecteerd in agents, Canvas/pipelines én de Jasper API's/MCP. Functioneel het dichtst bij Branddocks `getBrandContext`-stack. Daarnaast **Canvas**: een campagne-workspace als single source of truth waarin een messaging-wijziging door alle kanalen cascadeert.

**Guardrails-claim vs praktijk.** Jasper claimt "guardrails keep every detail aligned with your brand, from tone and imagery to compliance standards" en shipte een MCP Server om Brand IQ naar externe AI-tools te brengen (ChatGPT, Claude, Copilot). **Maar**: G2-reviews betwisten de daadwerkelijke handhaving (brand-voice-tweaks gaven "pretty much similar type of output"). De claim is vendor-positionering; validatie/scoring van output wordt niet gepubliceerd.

**Pricing — agents op elke tier, merkcontext gemeterd.** Pro $69/seat/mnd (maandelijks) of $59/seat/mnd (jaarlijks); Business custom (~$900+/mnd via secundaire bronnen, 12 mnd minimum). "100+ Purpose-Built Marketing Agents" staat op béíde tiers aangevinkt. De enterprise-differentiatie loopt langs twee assen: (1) **zelf agents bouwen** (no-code Custom Agent builder + complexe workflow-agents zoals GEO/translation/deep research: alleen Business); (2) **merkcontext als gemeterde upsell**: Pro krijgt 2 Brand Voices, 5 knowledge assets, 3 Audiences en géén Style Guide (Business: unlimited + Style Guide).

---

## 4. Brede scan — 5 spelers (vendor-claim-niveau)

> Niet adversarieel geverifieerd; feiten van vendor-pagina's per 2026-07-05, third-party waar gelabeld.

| Speler | Agent-model | Autonomie | Pricing | Merk-grounding |
|---|---|---|---|---|
| **Copy.ai** (GTM AI Platform) | Taak-agents + workflow-builder (Workflows / Copy Agents / Actions / Chat) | "Controlled automation" met guardrails | Seats + workflow-credits: $29/mo (Chat) → $1.000-3.000/mo (Growth/Scale) | Infobase (kennisbank) + Brand Voice-veld; geen output-validatie |
| **Writer.com** (AI HQ / Palmyra) | Agent-library (100+) + Agent Builder; "agents that act without prompts" (event-gedreven) | Hoog, met observability-laag als waarborg | Per seat: $29-39/user/mo; enterprise custom; aparte token-pricing | **Sterkste van de vijf**: Knowledge Graph (10M woorden) + afdwingbare style-guide-regels ("auditable compliance") — maar regel-enforcement, geen fidelity-score |
| **HubSpot Breeze** | Vaste taak-agents per functie (Prospecting/Customer/Data/Content/Social) + custom-builder (beta) | Hoog-autonoom binnen scope, handoff naar mens | **Outcome-based credits**: $0,50 per opgelost gesprek, $1,00 per lead | CRM-data + brand-voice-settings + Knowledge Vaults (vrij) |
| **Relevance AI** | Agent-builder + persona-flavored "AI workforce" (multi-agent teams) | **Expliciete trap L1 Assisted → L4 Self-Driving** | Usage-based dual-unit (actions + doorbelaste LLM-kosten): free → $19 → $234/mo → enterprise | Vrije knowledge bases; geen merkmodel |
| **Lindy.ai** | Persona-agents ("AI employee") + no-code builder + Autopilot (computer use) | Spectrum; approval-stappen configureerbaar | Usage-allowance per user: $50/$100/$200/mo | **Zwakste**: context uit gekoppelde apps; geen brand-voice-feature |

**Patronen uit de scan:**
- **(a) Taak-agents + builder domineert; persona is marketing-sausje.** Niemand verkoopt puur persona-agents; Lindy/Relevance plakken een "employee"-laag over wat onderliggend een builder is. Curated agent-libraries verlagen de drempel; self-serve builders zijn de enterprise-laag.
- **(b) Usage/credits verdringt seats.** 4 van 5 rekenen (mede) in verbruik; HubSpot het radicaalst (outcome-pricing). Instapprijzen lopen van $19 tot $1.000/mo — de markt is qua pricing totaal niet geconvergeerd.
- **(c) Human-in-the-loop is universeel, maar als glijdende schaal.** Iedereen verkoopt autonomie als doel en oversight als geruststelling; niemand forceert approval.
- **(d) Niemand doet gestructureerde merk-DNA-grounding + output-validatie samen.** Grounding is overal een vrije kennisbank + hooguit één brand-voice-veld. Writer komt het dichtst bij (style-guide-enforcement) maar zonder multi-dimensionaal merkmodel en zonder fidelity-score op output. **Dat gat is open.**

---

## 5. Markt: faalmodi & niet-belegde cijfers

**Geverifieerde faalmodi (Deloitte TMT Predictions 2026, nov 2025):**
1. Agent-acties zijn niet voorspelbaar en kunnen "novel or inefficient paths" nemen → "revenue for vendors and costs for customers could become less predictable and highly variable" (credit-verbranding).
2. "Agentic systems still need to prove that they can produce consistent and reliable value" (onbetrouwbare autonomie).

Beide pleiten voor **bounded, goedkeurings-gebaseerde agents met voorspelbare pricing** in een pre-launch product. Gartner (persbericht juni 2025, opgehaald als primaire bron) voorspelde bovendien dat >40% van agentic-AI-projecten vóór eind 2027 geannuleerd wordt — kostenbeheersing en bewezen waarde zijn de bottleneck, niet ambitie.

**Bewust NIET in dit rapport (verworpen bij adversariële verificatie):** Deloittes kwantitatieve 2030-voorspellingen (35% SaaS-vervanging door agents; 40% pricing-shift; 83% usage-based) werden 0-3 verworpen. **Er zijn dus geen betrouwbare marktomvang-/groeicijfers belegd** — vermijd deze getallen in pitches.

**Open vragen** (uit de research): hoe goed werken Brain AI/Brand IQ in de praktijk (hands-on test ontbreekt); Sintra's feitelijke autonomie-niveau; betrouwbare segmentcijfers.

---

## 6. Vergelijkingstabel Sintra vs Jasper vs Branddock-potentieel

| As | Sintra | Jasper | Branddock (potentieel) |
|---|---|---|---|
| Agent-model | 12 persona-"employees" | 100+ taak-agents langs Content Pipeline | Klein aantal rol-agents op merkfundament (curated) |
| Taaktypen | Chat + 90+ use-case-knoppen | Content, research, analyse, optimalisatie, vertaling | Content, strategie, research, review, analyse (motoren bestaan) |
| Grounding | Brain AI — vrije kennisbank | Jasper IQ — brand voice + knowledge, **gemeterd per tier** | **12 canonical assets + BrandVoiceguide + personas + producten — gestructureerd merk-DNA, universeel** |
| Output-validatie | Geen | Geclaimd (Brand IQ guardrails), betwist in reviews, geen score | **F-VAL 3-pijler fidelity-score, bewezen in productie** |
| Autonomie | Onbewezen (claim verworpen) | Human-in-the-loop, expliciet | Human-in-the-loop nu (Claw confirm-flow) → Brandclaw-trap later |
| Pricing | Bundel + credits, $15-48/mo | $59-69/seat (Pro), Business custom | n.t.b. — advies: voorspelbaar, merkcontext nóóit meteren |
| Doelgroep | Solopreneur/SMB | Marketing-teams/enterprise | SMB-merkeigenaren + agencies (tussenpositie) |

---

## 7. Strategische positionering

### 7.1 Verhouding tot Brandclaw

De analyse geeft een eenduidig antwoord op de openstaande vraag:

- **Het zijn twee verschillende productconcepten.** Sintra/Jasper-agents zijn *user-facing taak-agents met menselijke orkestratie* (user geeft opdracht, agent voert uit, mens keurt goed). Brandclaw is een *autonome achtergrond-loop* (observeert, analyseert, stelt voor — uiteindelijk optimaliseert). De markt heeft in 2025-2026 het eerste model gevalideerd; het tweede moet zijn waarde nog bewijzen (Deloitte).
- **Maar ze convergeren op dezelfde motor.** De Brandclaw-orchestrator (`runAgentLoop` + tool-registry + persistence + cost-tracking) is generiek genoeg om beide te dragen. De Strategy Analyst ís feitelijk al een agent — hij is alleen weggestopt in een tab van Brand Alignment.
- **Aanbevolen frame**: **"Agents" wordt de user-facing productlaag; Brandclaw wordt de autonomie-trap daarbovenop.** De bestaande Brandclaw-NodeTypes (`campaign_builder`, `measurement_eval`, `optimization`) worden later agents in dezelfde catalogus, met een autonomie-schuif per agent (à la Relevance L1→L4: eerst on-demand, dan scheduled, dan proactief-met-approval). Dit vervangt de Brandclaw-roadmap niet — het geeft hem een gezicht en een geleidelijk adoptiepad, exact zoals Jasper het deed (eerst agents + guardrails, daarna meer autonomie).

### 7.2 White space & differentiatie

1. **Gestructureerd merk-DNA als universele fundering.** Jasper meteert merkcontext per tier (2 voices/5 assets/3 audiences op Pro; Style Guide alleen Business); Sintra heeft slechts een vrije kennisbank. Branddock draait élke agent standaard op de volledige merk-DNA-stack — dat is de omgekeerde positionering en een verdedigbaar verhaal.
2. **Output-validatie tegen het merk.** Niemand publiceert een fidelity-score op agent-output; Jaspers handhaving wordt in reviews betwist. Branddock kan élke agent-output door F-VAL halen en de score + findings tonen. "Onze agents bewijzen dat hun werk on-brand is" is de claim die niemand kan kopiëren zonder een F-VAL-equivalent te bouwen.
3. **Bounded & voorspelbaar.** De Deloitte-faalmodi (credit-verbranding, onvoorspelbaarheid) omzeilen met begrensde agent-runs (bestaande guards: maxToolCalls, wallclock-cap, cost-calculator) en voorspelbare pricing — merkcontext en validatie nooit meteren.

### 7.3 Naming

Analyse-advies was functionele rol-agents; **user-besluit 2026-07-05: persona-agents** (Sintra-model — benoemde agents met naam/persona). Invulling: professionele persona's die de rol dragen (naam + licht avatar + rolduiding), passend bij de Branddock-huisstijl (Lucide-iconen/illustratie, geen cartoon-emoji). Definitieve namen zijn een design-beslissing in Fase 1.

---

## 8. Codebase-inventaris (samenvatting)

> Volledige inventaris uitgevoerd 2026-07-05 (Explore-agent, 57 tool-calls). Kernconclusie: **een Agents-feature is grotendeels een orkestratie- en surfacing-laag bovenop bestaande motoren.**

**Direct herbruikbaar:**
- **Brandclaw agent-loop** (`src/lib/brandclaw/orchestrator/agent-loop.ts`): echte Anthropic multi-turn tool-use loop met guards (5 min wallclock, maxToolCalls 20), per-node tool-registry (`tool-registry.ts`), cost-calculator, PostHog-events. Motor generiek; output nu hard-wired op `observations` + `StrategyObservation`-persistence.
- **Claw tool-fundament** (`src/lib/claw/tools/`): ~17 read-, 4 analyze-, 2 navigate- en ~23 write-tools mét human-in-the-loop confirm-flow (`requiresConfirmation` → `mutation_proposal` → `/api/claw/confirm`) en prompt-injection-fencing.
- **Aanroepbare pipelines**: `orchestrateContentGeneration` (content, async generator, los van HTTP), 8 losse strategie-stappen in `strategy-chain.ts` (incl. `createDeliverablesFromBlueprint`), `runDeepResearch` (6-fasen research, dependency-injectable), `runFidelityForExternalContent` (F-VAL op kale tekst — al bewezen als Claw-tool).
- **Grounding**: `getBrandContext(workspaceId, localeProfileId?)` — alle merk-lagen, 5-min cache, locale-aware.
- **Async-infra**: DB-backed job-queue (`src/lib/agents/jobs/` — dispatch/runner/handlers, retry + backoff + idempotency), Vercel Cron elke minuut, pgvector `AgentMemory`. **Let op: `AGENT_TASK`-handler is een stub.**
- **Model-config**: `resolveFeatureModel` + `WorkspaceAiConfig` — nieuwe agents krijgen elk een `AiFeatureKey`.
- **UI-pad**: `SIDEBAR_NAV` + `App.tsx`-switch + `PageShell`/`PageHeader` — nieuwe top-level sectie is een ingesleten, laag-risico patroon.

**De vijf gaten (nieuw te bouwen):**
1. **Agent-catalogus/registry** — "een agent" als selecteerbaar object (naam, doel, tool-set, system-prompt, model-slot). Voor MVP: code-registry (curated), geen DB nodig.
2. **Taak-inbox / results-surface** — unified overzicht van agent-runs, voortgang en outputs (nu verspreid over StrategyObservation, Deliverable, KnowledgeResource, ContentReviewLog, ClawConversation).
3. **Generieke output-artefacten** — rapport (markdown), tabel (JSON-schema), findings, deliverable-link; de orchestrator-outputlaag generaliseren (nu observations-only).
4. **Scheduling-brug** — job-queue → `runAgentLoop` koppelen (`AGENT_TASK` invullen); UI voor "elke maandag".
5. **Run-status-tracking** — persistente run-status voor lange taken (deep research persisteert nu niets server-side).

---

## 9. Plan van aanpak

> **User-besluiten 2026-07-05 verwerkt**: (1) Fase 1 MVP gaat **pre-launch** (volledige MVP incl. Data Analyst/tabellen), als parallelle werkstroom; (2) persona-agents; (3) Data Analyst in MVP; (4) pricing: vaste maandprijs bij launch, per-token/usage-metering als latere fase.
> Harde randvoorwaarde blijft: **`vercel-deployment` (Track C) blijft het kritieke pad** — de Agents-werkstroom draait parallel (zoals meertaligheid), nooit als blocker. De lite-variant (3 agents) blijft beschikbaar als fallback bij tijdsdruk.

### Fase 0 — Positionering + architectuur (2-3 dagen) — ✅ grotendeels afgerond 2026-07-05

- ✅ **ADR geschreven**: [`docs/adr/2026-07-05-agents-architectuur.md`](../adr/2026-07-05-agents-architectuur.md) — 8 deelbeslissingen (één motor, pluggable output-contract, AgentRun/AgentArtifact, code-registry, F-VAL-poort, Claw-afbakening, autonomie-trap, pricing).
- ✅ **Feature-discovery gedaan**: feature-planner → [`tasks/_drafts/idea-agents-feature.md`](../../tasks/_drafts/idea-agents-feature.md), verdict `ready-to-build` — conditioneel (Track C-voorrangsregel week 1; lite-fallback met Data Analyst als eerste drop; ADR vóór feature-code ✅).
- ✅ **Beslispunten user genomen** (zie §10).
- ⏳ **Rest**: technical-planner op het idea-doc → task-file(s) met file-ownership voor worktree `branddock-feat-agents-feature`; eerste implementatie-stap = A1-verificatie-spike (output-contract-adapter zonder Strategy-Analyst-regressie).

### Fase 1 — MVP "Agents" (2-3 weken, **pre-launch, parallelle werkstroom** — besluit 2026-07-05)

Marktbewezen MVP-vorm (Sintra/Jasper-synthese): klein aantal benoemde persona-agents, gegrond in de brand-context-stack, met klikbare use-cases naast chat, en human-in-the-loop-goedkeuring.

**De agents (elk een dunne config over een bestaande motor; definitieve persona-namen volgen in Fase 1-design):**

| Agent (rol, werknaam) | Motor (bestaand) | Output |
|---|---|---|
| **Research Analyst** | `runDeepResearch` (incl. brand-context) | Gecit. rapport → KnowledgeResource |
| **Brand Guardian** | `runFidelityForExternalContent` (F-VAL) | Fidelity-score + findings |
| **Strategist** | strategie-stappen uit `strategy-chain.ts` | Strategy blueprint (+ optioneel deliverables) |
| **Content Creator** | `create_deliverable` + `orchestrateContentGeneration` | Deliverables in de Canvas |
| **Market Analyst** | competitor-tools + Strategy-Analyst-dimensies | Analyse-rapport / observaties |
| **Data Analyst** (**in MVP** — besluit 2026-07-05) | nieuwe query-tools op workspace-data | Tabel-artefact (JSON-schema → tabel-render) |

**Te bouwen:**
1. Code-gebaseerde **agent-registry** (curated; per agent: system-prompt, tool-set-scoping, use-case-knoppen, `AiFeatureKey`).
2. **Agents-sectie** in de UI (SIDEBAR_NAV + App.tsx-case + `src/features/agents/`): catalogus → agent-detail met use-case-knoppen + chat (hergebruik Claw panel-mode met per-agent scoping).
3. **`AgentRun` + output-artefact-model** (rapport/tabel/findings/link) + results-inbox.
4. **F-VAL-poort op alle content-producerende agents** (de differentiator zichtbaar maken: score + findings bij elke output).
5. Human-in-the-loop: hergebruik Claw's confirm-flow voor alle write-acties.

**Lite-variant (fallback bij tijdsdruk, ~1-1,5 week):** alleen Research Analyst + Brand Guardian + Strategist (motoren bestaan volledig; geen scheduling, geen Data Analyst, minimale inbox). Terugvaloptie als de volledige MVP het launch-venster dreigt te raken.

### Fase 2 — Scheduling + proactiviteit (2-3 weken, ná Fase 1)

> **Update 2026-07-05**: `vercel-deployment` is gerealiseerd (app live op branddock-7y9n.vercel.app, main=production) — de harde dependency van deze fase is vervuld; enige resterende volgorde-dep is Fase 1 zelf.

- `AGENT_TASK`-stub invullen: job-queue → agent-registry → `runAgentLoop`-brug (generieke payload `{agentId, taskInput}`).
- Scheduled agents ("elke maandag concurrentie-scan") + run-status + notificaties (in-app/e-mail-infra bestaat uit competitor-digest-werk).
- Proactieve voorstellen (agent stelt werk voor; user keurt goed) — Relevance-L2-niveau.
- Per-agent geheugen via bestaande `AgentMemory` (pgvector).
- *Dep*: Vercel Cron in productie → daarom ná `vercel-deployment` (zelfde dep als Track B Phase C).

### Fase 3 — Brandclaw-convergentie (post-launch, maanden — vervangt/concretiseert de LATER-roadmap)

- Strategy Analyst verhuist als agent naar de catalogus (zelfde motor, nieuwe surface).
- `campaign_builder`, `measurement_eval`, `optimization` NodeTypes gebouwd als agents op dezelfde registry — dit ÍS de Brandclaw-transformatie (Optie B), nu met een adoptiepad.
- Autonomie-schuif per agent (assisted → scheduled → autopilot-met-approval-gates), cost-budget-bewaking per workspace (Deloitte-faalmodus).

### Pricing (besluit 2026-07-05, voor `stripe-billing-live`)

- **Bij launch: vaste prijs per maand** (voorspelbaar, geen credits) — sluit aan bij de Deloitte-faalmodus (credit-verbranding) en differentieert van de usage-chaos in de markt.
- **Latere fase: per-token/usage-metering** toevoegen (wanneer verbruiksdata uit de pilot een eerlijk tarief onderbouwt). Instrumentatie daarvoor vanaf dag 1 meenemen: de bestaande `cost-calculator` + PostHog-events per agent-run leveren de data.
- Merkcontext en F-VAL-validatie **nooit meteren** (anti-Jasper-positionering). Geen outcome-pricing pre-pilot.

### Risico's

| Risico | Mitigatie |
|---|---|
| Pre-launch scope-creep (concurreert met Track C) | Lite-variant strikt begrensd; task-files met file-ownership; `vercel-deployment` eerst of parallel in eigen worktree |
| Verwarring Claw ↔ Agents (twee AI-ingangen) | ADR-beslissing in Fase 0: Claw = chat-overlay, Agents = taak/output-surface, gedeelde tools; later evt. "chat met agent X" via Claw |
| Kosten per run / credit-verbranding | Bestaande guards (maxToolCalls, wallclock, cost-calculator) + PostHog-monitoring + per-workspace budget in Fase 3 |
| Autonomie-vertrouwen (Deloitte/Gartner-faalmodi) | Human-in-the-loop default; autonomie pas per trap; F-VAL-gate op alle content-output |
| Output-kwaliteit ondermijnt de claim | F-VAL-score tonen bij élke agent-output; onder drempel → auto-iterate (bestaat) of expliciete flag |

---

## 10. Beslispunten — GENOMEN (user, 2026-07-05)

1. **Timing Fase 1**: ✅ **pre-launch** — volledige MVP als parallelle werkstroom; `vercel-deployment` blijft het kritieke pad; lite-variant (3 agents) is de fallback bij tijdsdruk.
2. **Naming**: ✅ **persona-agents** (benoemde agents met naam/persona, professioneel ingevuld — geen cartoon-stijl; namen volgen in Fase 1-design).
3. **Data Analyst/tabellen**: ✅ **in de MVP** (enige agent zonder bestaande motor — extra bouwwerk: query-tools + tabel-artefact; eerste kandidaat om naar de fallback te verhuizen bij uitloop).
4. **Pricing**: ✅ **vaste maandprijs bij launch, per-token/usage in een latere fase**; merkcontext + F-VAL-validatie nooit meteren.

---

## 11. Verantwoording & bronnen

**Deep-research-statistieken**: 5 zoekhoeken, 21 bronnen gefetcht, 100 claims geëxtraheerd, 25 adversarieel geverifieerd (3-vote): 21 bevestigd, 4 verworpen, 0 onbeslist; 103 subagents.

**Belangrijkste primaire bronnen**: help.sintra.ai (helpers-explained; workspace-credits), sintra.ai/pricing, jasper.ai/agents + /jasper-iq + /pricing + launch-blog (10 juni 2025), Deloitte TMT Predictions 2026 (SaaS & AI agents, 2025-11-18), Gartner persbericht 2025-06-25. Brede scan (vendor-claim-niveau): copy.ai(/prices), writer.com/agents + persberichten, hubspot.com/products/artificial-intelligence + knowledge base, relevanceai.com(/pricing, docs), lindy.ai(/pricing, blog Lindy 3.0).

**Kanttekeningen**: vrijwel alle per-product-feiten zijn vendor-claims (betrouwbaar voor positionering/packaging, niet voor werking in de praktijk); pricing is een momentopname per 2026-07-05; de brede scan is niet adversarieel geverifieerd; marktomvang-cijfers zijn bewust weggelaten (verworpen bij verificatie).
