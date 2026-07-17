---
id: 2026-07-17-public-brand-api
title: Publieke Brand-API + gehoste MCP-server met volledige chain-dekking
status: accepted
date: 2026-07-17
supersedes: -
superseded-by: -
---

# Context

Branddock's differentiator is de merklaag: een context-stack (12 brand assets, voice, style, personas, producten, concurrenten, kennis) die in élke AI-call wordt geïnjecteerd, plus F-VAL-validatie van output. Die laag is vandaag alleen bereikbaar via de eigen UI. De markt beweegt agentic: klanten werken in Claude/ChatGPT/agent-stacks en willen hun merkcontext dáár — de Postiz-case (analyse 2026-07-17) laat zien dat "aanroepbaar worden" (API/MCP/CLI) de grootste groeivector van dit moment is, en dat de positionering "brand guardrails voor AI-agents" onbezet is.

De voorbereidende bouwstenen bestaan inmiddels: de headless content-service (P3.0a, `createAndGenerateDeliverable` + `drainDeliverableGeneration` + `contextSelection`) en de Brand Assistant quick-create (P3.0b) bewijzen dat de generatie-motor volledig headless draait, met UI-pariteit in de context-selectie. Erik besloot expliciet (2026-07-17): **volledige chain-dekking, geen gefaseerde v0** — ook de gespecialiseerde chains (SEO-pipeline long-form, LP/Puck-builder, campaign-strategy-chain, video) horen bij de API-scope; en: connector-gebruik is generiek (élk doel), inhoud opslaan is opt-in, gedrag meten is metadata.

Constraints: (a) de prompt-/chain-laag is de gesloten moat en mag nooit via de API lekken; (b) deployment is gated op afronding van `security-residual-hardening` — een publieke API opent precies het aanvalsoppervlak dat daar wordt dichtgezet; (c) prod draait serverless op Vercel (maxDuration-grenzen voor lange chains); (d) de connector-UX van claude.ai/ChatGPT vereist een gehoste MCP-server met OAuth-login, wat een derde OAuth-rol introduceert naast de bestaande twee (social-login als client; Meta-tokens als client naar platforms).

# Decision

Eén **gehoste remote MCP-server + REST-API** die de volledige merklaag ontsluit, gebouwd ín de bestaande Next.js-app (geen aparte service):

1. **Tools/endpoints**: `get_brand_context`, `score_against_brand`, `rewrite_on_brand` (ephemeral), `generate_on_brand` (basis, via P3.0a), én per gespecialiseerde chain een tool (`generate_long_form_seo`, `generate_web_page`, `generate_campaign_strategy`, `generate_video`) — elk via dezelfde service-extractie als P3.0a. Plus discovery-lees-tools (`list_personas` / `list_products` / `list_competitors` / `search_knowledge`) en `contextSelection` op elke generatie-tool.
2. **Tweede-deur-principe**: elke write loopt door dezelfde domein-modellen als de UI (`Deliverable`, `Campaign`, …) + verplichte cache-invalidatie. Extern gegenereerd werk is direct zichtbaar in de UI; prompts/chains blijven server-side — de API exposeert uitkomsten, nooit chains.
3. **Auth**: Branddock als **OAuth-provider** via de Better Auth MCP/OIDC-provider-plugin (connector-flow: URL plakken → inloggen → workspace autoriseren) + per-workspace **API-keys** voor developers/automation.
4. **Opslag-principe**: inhoud opslaan is opt-in (alleen generate-tools maken Deliverables; reads/rewrites zijn ephemeral); élke tool-aanroep logt **metadata-only** (tool, workspace, timestamp, credits, latency, succes — nooit inhoud) naar PostHog + `ApiCallLog` als roadmap-motor.
5. **Uitrol**: alles achter feature-flag `PUBLIC_API_ENABLED` (default uit). Code mag landen op main; activatie pas ná launch én na afronding van de security-residual-gate.

# Y-statement

In de context van **de agentic verschuiving waarbij klanten hun AI-werk in Claude/ChatGPT/agent-stacks doen en Branddock's merklaag alleen via de eigen UI bereikbaar is**, facing **het risico irrelevant te worden als bestemming terwijl de "brand guardrails voor AI-agents"-positie onbezet is**, I decided **één gehoste MCP-server + REST-API met volledige chain-dekking te bouwen op de bestaande headless services, met OAuth-provider-auth, tweede-deur-writes en metadata-only-analytics, achter een feature-flag tot de security-gate sluit**, to achieve **dat elke externe agent on-brand kan werken via Branddock terwijl de prompt-laag gesloten blijft en gebruiksdata de roadmap voedt**, accepting tradeoff **3-4 weken bouwwerk vóór er bewezen vraag is, een groter aanvalsoppervlak dat de security-afronding harder nodig maakt, en serverless-duration-complexiteit voor de lange chains**.

# Consequences

## Positief
- Elke chain-extractie maakt die chain meteen óók headless aanroepbaar voor agents en de Brand Assistant (bewezen bij P3.0a/b).
- De connector werkt voor Claude én ChatGPT met één server (beide spreken MCP); Custom-GPT-Actions kan er later als dunne OpenAPI-laag bij.
- Metadata-analytics geeft gemeten uitbreidingsvraag ("we meten wat je gebruikt, nooit wat je schrijft" is tegelijk het EU-privacy-verkoopargument).
- Credit-metering en F-VAL liften automatisch mee — geen nieuw billing-pad.

## Negatief / tradeoffs
- Volledige dekking vóór bewezen vraag is een gok van ~3-4 weken bouw; mitigatie: de service-extracties zijn ook zonder API waardevol (agents/chat).
- Nieuwe schema-modellen (`ApiKey`, `ApiCallLog`) → handmatige Neon-push bij deploy (bekende val, memory `neon-schema-push-on-deploy`).
- Lange chains (SEO-pipeline ~7,5 min) passen niet in één serverless request → asynchrone job-vorm (agent-jobs-lane of polling) nodig voor die tools.
- Derde OAuth-rol verhoogt auth-complexiteit; plugin-afhankelijkheid van Better Auth.

## Neutraal
- De API-doelgroep verschuift Branddock deels van bestemming naar infrastructuur — beoogde strategie (Brandclaw convergeert hierop).
- `rewrite_on_brand` introduceert de eerste bewust-ephemeral generatie-primitief (ook de motor onder de latere browser-extensie P3.7).

# Alternatives considered

- **Gefaseerde v0 (alleen context + score + basis-generatie)**: verworpen door Erik (2026-07-17) — een halve API ondermijnt de belofte; klanten die één chain missen haken af en het "geen halfwerk"-principe geldt.
- **Alleen REST/OpenAPI zonder MCP**: goedkoper, maar mist de connector-UX die de agentic golf draagt (claude.ai/ChatGPT koppelen in 30 seconden) — precies waar Postiz zijn 7× haalde.
- **Aparte API-service (microservice/subdomein met eigen codebase)**: schonere isolatie, maar dupliceert de chain-laag of forceert er een RPC-laag tussen; het tweede-deur-principe (zelfde Prisma-modellen, zelfde cache-invalidatie) is in-app triviaal en cross-service foutgevoelig.
- **Open-source SDK/self-host à la Postiz**: verworpen in de Postiz-analyse (les 5d) — de koper leeft niet op GitHub en de moat zít in de gesloten laag.

# Notes

- Herkomst: Postiz-verbeterplan §P3 (`docs/reports/postiz-analyse-2026-07-17.md` + verbeterplan, worktree agent-a0c326236bcdb7788) — daar staan ook P3.3-P3.7 (webhooks/nodes, ecosysteem-distributie, publish-integraties, Brandclaw, browser-extensie).
- Gerelateerd: ADR 2026-07-07 pricing (output-only metering — context/score credit-vrij, generatie kost credits), ADR 2026-07-05 agents-architectuur (zelfde loop, extern aanroepbaar).
- Task: `tasks/public-brand-api.md`.
