---
id: headless-content-service
title: "P3.0a — Headless content-service: create + generate + contextSelection als één functie"
fase: launch
priority: next
effort: 1-2 dagen
owner: claude-code
status: in-progress
created: 2026-07-17
completed: -
related-adr: - (kernprincipes vastgelegd in docs/reports/postiz-verbeterplan-2026-07-17.md §P3.0/P3.1)
related-spec: docs/reports/postiz-verbeterplan-2026-07-17.md
worktree: branddock-headless-content-service (aan te maken bij start)
---

# Probleem

Content-item-creatie mét generatie kan alleen via de UI-flow of via het geaccepteerde voorstel van de content-creator-agent. De create+generate-bedrading (`runDeliverableGeneration`) zit inline in `src/app/api/agents/runs/[runId]/confirm/route.ts:431-467` en is niet herbruikbaar; elk creatiepad eist een bestaande `campaignId` (geen default-campagne); de Brand Assistant-tool `create_deliverable` maakt een leeg item zonder generatie. Drie toekomstige afnemers (Brand Assistant quick-create, publieke API/MCP, agents) hebben dezelfde service nodig.

# Voorstel

Eén service-functie in `src/lib/` (bijv. `src/lib/content/headless-create.ts`):

`createAndGenerateDeliverable({ workspaceId, userId, campaignId?, contentType, title?, brief, contentTypeInputs?, contextSelection? })`

1. `ensureCampaign()` — bestaande `campaignId` valideren tegen workspace, anders default `type:'CONTENT'`-campagne per workspace resolven/aanmaken (patroon `ContentGenerateStep`/wizard-launch)
2. Deliverable-create met `settings.brief` (logica hergebruiken uit `src/lib/claw/tools/write-tools.ts:830-851`)
3. `contextSelection` ({ personaIds?, productIds?, competitorIds?, knowledgeResourceIds? }) persisteren op de deliverable-settings zoals de UI-selectie dat doet, zodat `assembleCanvasContext` dezelfde scoping ziet
4. Drain van `orchestrateContentGeneration` — verplaats `runDeliverableGeneration` uit de confirm-route naar de service (routes importeren voortaan de service; géén duplicaat)
5. Return: deliverableId + gepersisteerde componenten + fidelity-score

Pre-gates blijven intact (objective/keyMessage verplicht; brandName verplicht) — de service geeft nette foutobjecten terug i.p.v. te blokkeren zonder uitleg.

# Acceptatiecriteria

- [x] Service-functie bestaat; agents-confirm-route gebruikt hem (lokale `runDeliverableGeneration` verwijderd — één drain-implementatie)
- [x] Aanroep zonder `campaignId` maakt/hergebruikt een default CONTENT-campagne (`quick-content`-slug, idempotent via compound-unique upsert — smoke PASS)
- [x] `contextSelection`-ID's landen aantoonbaar in de settings die `assembleCanvasContext` leest (smoke: targetPersonas + contentTypeInputs.productId + additionalContextItems alle drie PASS) en knowledge-items gaan als `additionalContextText` de orchestrator in
- [x] Headless smoke met SMOKE_FULL=1: één functie-aanroep → echte AI-run (openai/gpt-5.4 via feature-routing) → 8 componenten gepersisteerd + F-VAL 78 + status IN_PROGRESS
- [x] Pre-gate-fouten als gestructureerd resultaat (BRIEF_INCOMPLETE / CONTENT_TYPE_UNKNOWN / CONTEXT_IDS_INVALID / CAMPAIGN_NOT_FOUND / CAMPAIGN_LOCKED)
- [x] `npx tsc --noEmit` 0 errors · eslint 0 errors
- [x] Cache-invalidatie na create (campaigns + dashboard prefixes)

# Bestanden die ik aanraak

- `src/lib/content/headless-create.ts` (nieuw)
- `src/app/api/agents/runs/[runId]/confirm/route.ts` (drain → service-import)
- evt. `src/lib/claw/tools/write-tools.ts` (create-logica delen, nog géén generate-optie — dat is P3.0b)

# Bestanden die ik NIET aanraak

- `src/lib/ai/canvas-orchestrator.ts` — motor blijft ongewijzigd (bewezen ~90-95% herbruikbaar)
- SSE-route `src/app/api/studio/[deliverableId]/orchestrate/route.ts` — UI-pad blijft zoals het is
- Brand Assistant chat-tools functioneel — quick-create is P3.0b

# Smoke test plan

1. tsx-harness of dev-route: `createAndGenerateDeliverable` aanroepen op een test-workspace zonder campaignId
2. Verwacht: CONTENT-campagne aangemaakt/hergebruikt, deliverable met componenten + F-VAL-score, item zichtbaar in de content-library-lijst
3. Tweede run mét `contextSelection` (1 product + 1 persona + 1 competitor): prompt-context bevat die entiteiten
4. Agents-flow regressie: content-creator-proposal accepteren werkt nog identiek

# Risico's

- Confirm-route-refactor raakt een productie-pad (agents) → regressie-smoke verplicht
- Default-campagne-semantiek (één per workspace vs per run) — keuze documenteren in de service-JSDoc

# Out of scope

- Publiek endpoint / MCP (P3.1/P3.2 — post-launch, security-gated)
- Brand Assistant generate-optie (P3.0b)
- Visual/video-generatie-stappen buiten de basis-orchestrator

# Notes

- Herkomst: Postiz-verbeterplan P3.0a + codebase-analyse 2026-07-17 (Explore-rapport in sessie; kernfeiten hierboven verwerkt)
- `contextSelection` is de API-vorm van de kennis-aan/uit-toggles — semantiek identiek houden aan de UI-selectie
