---
id: public-brand-api
title: "P3.1+P3.2 — Publieke Brand-API + gehoste MCP-server (volledige chain-dekking)"
fase: post-launch
priority: next
effort: 3-4 weken
owner: claude-code
status: in-progress
created: 2026-07-17
completed: -
related-adr: docs/adr/2026-07-17-public-brand-api.md
related-spec: docs/reports/postiz-verbeterplan-2026-07-17.md (worktree agent-a0c326236bcdb7788)
worktree: branddock-public-brand-api
---

# Probleem

Branddock's merklaag (context-stack + F-VAL + generatie-chains) is alleen via de eigen UI bereikbaar terwijl klanten agentic werken (Claude/ChatGPT/agent-stacks). De "brand guardrails voor AI-agents"-positie is onbezet; Postiz' 7×-groei kwam precies uit aanroepbaar worden. Besluiten Erik 2026-07-17: volledige chain-dekking (geen v0-subset), generiek gebruik toegestaan, inhoud opslaan opt-in / gedrag meten metadata-only.

# Voorstel

Zie ADR `2026-07-17-public-brand-api`. Gefaseerde oplevering binnen deze task (alles achter `PUBLIC_API_ENABLED`, default uit):

- **Fase A — fundament** (deze branch, commit 1): `ApiKey` + `ApiCallLog`-modellen, key-beheer-route (owner/admin, hash-only opslag, key eenmalig zichtbaar), `requireApiKey`, metadata-usage-logging (ApiCallLog + PostHog `public_api_call`), REST v1: `GET /api/v1/brand-context` (gratis), `POST /api/v1/score` (gratis, external-content-runner), `POST /api/v1/generate` (P3.0a-service, vlakke `short`-charge idempotent per deliverable).
- **Fase B — MCP-server**: `/api/mcp` via @modelcontextprotocol/sdk (streamable HTTP) + Better Auth `mcp`/`oidc-provider`-plugin (OAuth-connect-flow), tools: context/score/generate + discovery-reads (`list_personas`/`list_products`/`list_competitors`/`search_knowledge`).
- **Fase C — `rewrite_on_brand`** (ephemeral primitief, ook voor P3.7).
- **Fase D — chain-extracties**: `generate_long_form_seo` (async job-vorm — pipeline ~7,5 min past niet in één request), `generate_web_page`, `generate_campaign_strategy`, `generate_video`.
- **Fase E — Settings-UI** voor key-beheer + docs-pagina "koppel in 3 stappen".

# Acceptatiecriteria

- [x] Fase A (2026-07-17): routes 404 met flag uit ✓; 401 zonder/onbekende/ingetrokken key ✓; brand-context + score (F-VAL 80 via API) + generate (echte run, F-VAL 85, 8 componenten) ✓; 3 metadata-only usage-rijen ✓; key eenmalig zichtbaar + hash-only opslag ✓; tsc + lint groen — 17/17 smoke-checks (scripts/dev/public-api-smoke.ts)
- [x] Fase B (2026-07-17): MCP-server op /api/mcp (stateless WebStandard-transport, per-request McpServer) — handshake + 8 tools + get_brand_context (35k chars) + list_personas via echte MCP-SDK-client ✓; score via MCP F-VAL 80 ✓; generate-bedrading ✓; foutpad isError ✓ (scripts/dev/mcp-smoke.ts + mcp-ai-smoke.ts). OAuth → aparte fase (Better Auth mcp-plugin, WWW-Authenticate-discovery + evt. GET-stream her-evalueren bij connector-UX — zie codecomments)
- [x] Fase C (2026-07-17): rewrite_on_brand (service + POST /api/v1/rewrite + MCP-tool #8) — echte run: on-brand herschrijving via anthropic/sonnet, ephemeral bewezen (deliverable-count 31→31), 1 credit in usage-log ✓; feature-key 'rewrite-on-brand' in registry (per-workspace model-config)
- [x] Fase D (2026-07-17): alle vier chains extern aanroepbaar — **D1 SEO** async via bestaande job-lane + /api/v1/seo-generate + seo-status (smoke: echte enqueue PENDING 0/8 + cleanup) · **D2 video** /api/v1/video-generate (smoke: echte fal-run ltx-2-pro 6s → R2 + component; provider-limiet-validatie toegevoegd) · **D3 web-page** /api/v1/webpage-generate met gedeelde kern + puckData-persist (smoke: AI-gevuld, 5 componenten) · **D4 campaign-strategy** nieuwe CAMPAIGN_STRATEGY_GENERATE-job-lane + headless keten-orchestrator + eerste metering van deze chain (80cr) + /api/v1/strategy-generate + strategy-status (smoke: 21/21 incl. dedupe/herstart) — MCP-server nu **14 tools**, eind-smoke via echte MCP-client groen. ⚠️ Deploy-note: AgentJobType-enum-waarde vereist Neon-push (lokaal via ALTER TYPE gezet)
- [x] Fase E (2026-07-17): Settings-tab "API & Connectors" (key-lijst, create met eenmalig copy-blok, revoke met confirm + gedimde staat) + "Connect Claude/ChatGPT"-paneel (3 stappen, MCP-URL origin-based, 14-tools-lijst, flag-noot). Browser-smoke 11/11 (create → secret eenmalig → reload prefix-only → revoke-staat). NB: nav-labels via statische i18n-bundles (en+nl), rest defaultValue-pattern
- [x] Geen prompt-/chain-inhoud in enige API-response (moat-check: alle responses zijn uitkomsten — context-block, scores, ids, puckData, urls; system-prompts/chains blijven server-side)
- [x] `npx tsc --noEmit` 0 errors · lint 0 errors per fase
- [x] **Bonus buiten oorspronkelijke fasering (2026-07-17)**: P3.3 webhooks (WebhookEndpoint-model, HMAC-dispatcher op de centrale event-emitter, beheer-route met SSRF-guard, 31/31 smoke) + n8n-node-package · P3.5 Postiz-publish-provider (mock-contract-smoke 9/9; echte account-verificatie user-held) · P3.7 browser-extensie (MV3, build+verify+10/10 unit-tests; Web Store = Erik). Open restjes: webhook-Settings-UI, deliverable.generated-emit op webpage/seo/video-paden, n8n-package npm-publish, OAuth-connect-fase

# Bestanden die ik aanraak

- `prisma/schema.prisma` (ApiKey, ApiCallLog + Workspace-relaties)
- `src/lib/api/public/{auth,usage}.ts` (nieuw)
- `src/app/api/v1/{brand-context,score,generate}/route.ts` (nieuw)
- `src/app/api/workspace/api-keys/route.ts` (nieuw)
- `docs/adr/2026-07-17-public-brand-api.md` (nieuw)
- Fase B+: `src/app/api/mcp/*`, `src/lib/auth.ts` (plugins), Fase D: nieuwe services in `src/lib/content/`

# Bestanden die ik NIET aanraak

- `src/lib/ai/canvas-orchestrator.ts` — motor ongewijzigd; alles via services
- Bestaande UI-flows/routes — de API is een tweede deur, geen verbouwing van de eerste
- Stripe/credits-core — alleen bestaande `chargeAfter` aanroepen

# Smoke test plan

1. Dev-server met `PUBLIC_API_ENABLED=true` op 3005; key aanmaken via `/api/workspace/api-keys` (sessie)
2. `GET /api/v1/brand-context` met key → 200 + context-block; zonder key → 401; met flag uit → 404
3. `POST /api/v1/score` met ≥50-chars tekst → composite score conform in-app review
4. `POST /api/v1/generate` (linkedin-post, brief) → generated:true + F-VAL + item in content-library + `short`-charge in ledger + ApiCallLog-rij
5. Ingetrokken key → 401

# Risico's

- **Deploy-gate**: activatie pas ná launch + afronding security-residual (ADR); flag blijft uit op prod. Schema-push naar Neon nodig bij deploy (memory `neon-schema-push-on-deploy`) — Erik.
- Vlakke `short`-charge per API-generate is een schatting — kalibreren op echte volumes (kan afwijken van UI-canvas-metering).
- Lange chains vs serverless maxDuration → Fase D expliciet async.

# Out of scope

- P3.3+ (webhooks/nodes, directories, publish-integraties, extensie) — eigen producten
- Custom-GPT-Actions/OpenAPI-spec (volgt op Fase B)

# Notes

- 2026-07-17: Fase A gebouwd. Meter-bevinding onderweg: canvas-SSE-tekstgeneratie zelf boekt geen `chargeAfter` (alleen visual/video/agents/landing-page-routes doen dat) — de vlakke charge hier is dus strikter dan de UI-flow; bewust genoteerd als kalibratie-punt i.p.v. stilzwijgend overgenomen.
- Better Auth 1.4.18 bevat `mcp`- én `oidc-provider`-plugins (geverifieerd in node_modules); @modelcontextprotocol/sdk 1.29.0 al aanwezig.
