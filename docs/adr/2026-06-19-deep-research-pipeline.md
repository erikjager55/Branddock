---
id: 2026-06-19-deep-research-pipeline
title: Deep Research-pipeline voor de Knowledge Library
status: accepted
date: 2026-06-19
supersedes: -
superseded-by: -
---

# Context

De Knowledge Library laat gebruikers kennisitems toevoegen via Manual Entry, Smart Import (alleen URL-type-detectie, geen AI-extractie) en File Upload. Gebruikers willen een vierde route: een onderwerp opgeven en een Claude-achtige deep-research-run laten draaien die een gecit eerd rapport oplevert dat als kennisitem kan worden opgeslagen.

De relevante infrastructuur bestaat al grotendeels:
- `KnowledgeResource` heeft al `content`/`aiSummary`/`aiKeyTakeaways`/`importedMetadata` en `ResourceType.RESEARCH`.
- Er zijn web-research-clients: Gemini web-grounding (`searchWithGrounding`), Exa (`fetchExaContext`), Semantic Scholar, Are.na.
- Er is een SSE-streaming-stack (`createStreamingResponse`, het build-strategy-routepatroon).
- **Trend Radar** (`src/lib/trend-radar/researcher.ts`) is een bestaande meerstaps onderzoeks-pipeline (DISCOVER → EXTRACT → SYNTHESIZE → EVALUATE → VALIDATE) met progress-tracking en bron-dedup.

Constraints: AI alleen via `src/lib/ai/`, per-feature model-selectie, workspace-scoping, strikte TypeScript (geen `any`), kosten/latency onder controle, en de UI moet live voortgang tonen (~1-3 min runs).

# Decision

Bouw een **deterministische fan-out pipeline** in `src/lib/knowledge-research/`, gemodelleerd op Trend Radar, met fasen PLAN → SEARCH → READ → VERIFY → SYNTHESIZE → FINALIZE. De orchestrator (`runDeepResearch`) krijgt een `sendEvent`-callback + `AbortSignal` + injecteerbare `DeepResearchDeps` (voor tests). Twee endpoints: een korte `clarify` (topic → 2-3 verfijningsvragen) en een SSE-`run` (topic + antwoorden → live events + eindrapport). De run schrijft **niet** naar de DB; opslaan gebeurt expliciet door de gebruiker via de bestaande create-route, die wordt uitgebreid met `content`/`aiSummary`/`aiKeyTakeaways`/`source`. Nieuwe `ResourceSource.DEEP_RESEARCH`. Synthese-model default Sonnet; clarify default Gemini Flash. Citaties als stabiele 1-based `[n]`-refs + een `## Sources`-sectie.

# Y-statement

In de context van **een nieuwe Deep Research-tab in de Knowledge Library**, facing **de keuze tussen een agentic tool-use loop en een deterministische meerstaps pipeline**, I decided **een deterministische fan-out pipeline (Trend Radar-stijl) met een `sendEvent`-callback en injecteerbare deps** to achieve **live streaming-voortgang, voorspelbaar token-budget en testbaarheid zonder DB-orphans**, accepting tradeoff **minder autonome flexibiliteit dan een agent-loop en duplicatie van orchestratie-logica naast Trend Radar**.

# Consequences

## Positief
- Live streaming geeft exacte controle over per-fase + per-bron events; voorspelbaar budget en latency.
- Geen tussentijdse DB-writes → een afgebroken run (modal gesloten) laat geen orphan-resource achter.
- Injecteerbare `DeepResearchDeps` maken een deterministische smoke-test mogelijk zonder echte API-kosten.
- Maximaal hergebruik van bestaande clients (grounding/exa/scholar/scrape) + create-route + markdown-render.

## Negatief / tradeoffs
- Orchestratie-logica staat naast Trend Radar; twee vergelijkbare pipelines (toekomstige consolidatie-kans).
- Deterministische fasen zijn minder adaptief dan een agent die zelf besluit welke tool wanneer te gebruiken.
- Bronnen worden dubbel opgeslagen (inline in markdown én structured in `importedMetadata`) — bewuste keuze (zelf-bevattend rapport + machine-leesbaar), maar lichte redundantie.

## Neutraal
- Nieuwe `ResourceSource.DEEP_RESEARCH` (additieve enum-waarde, `db push`, geen migratie-risico).
- Twee nieuwe `feature-models`-keys (`deep-research-clarify`, `deep-research-synthesis`).
- De run streamt inline binnen de POST i.p.v. fire-and-forget+polling (Trend Radar); de orchestrator is wel zo ontworpen dat een background-job-modus later via een Map-sink kan.

# Alternatives considered

- **Brandclaw agent-loop (`runAgentLoop`)**: streamt niet (wacht op complete response per turn), onvoorspelbaar tool-call-budget, en persisteert `Run`-rows mid-flight (orphan-risico). Niet gekozen.
- **Anthropic server-side `web_search`-tool / Perplexity Sonar**: nieuwe afhankelijkheid terwijl Gemini grounding + Exa al beschikbaar zijn. Uitgesteld.
- **Background job + polling (Trend Radar-stijl)**: robuuster bij zeer lange runs, maar de gebruiker koos live streaming en de modal-UX past daar beter bij. Background-modus blijft een latere optie.

# Notes

- Plan-bestand: `~/.claude/plans/goofy-launching-treasure.md`. Task: `tasks/knowledge-library-deep-research.md`.
- Referentie-implementaties: `src/lib/trend-radar/researcher.ts`, `src/app/api/campaigns/wizard/strategy/build-strategy/route.ts`.
- Degradatie-filosofie (uit Trend Radar): geen enkele fase mag de run hard killen — degradeer met fallbacks + `warnings[]`; gooi alleen fataal bij 0 bronnen.
