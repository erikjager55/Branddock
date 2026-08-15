---
id: headless-content-service
title: "P3.0a — Headless content-service: create + generate + contextSelection als één functie"
fase: launch
priority: next
effort: 1-2 dagen
owner: claude-code
status: open
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

- [ ] Service-functie bestaat; agents-confirm-route gebruikt hem (geen dubbele drain-implementatie meer)
- [ ] Aanroep zonder `campaignId` maakt/hergebruikt een default CONTENT-campagne
- [ ] `contextSelection`-ID's sturen aantoonbaar de prompt-context (smoke: met/zonder competitor-ID verschilt de opgenomen context)
- [ ] Headless smoke: één functie-aanroep → gegenereerd item zichtbaar in content-library
- [ ] Pre-gate-fouten komen als gestructureerd resultaat terug (geen throw zonder context)
- [ ] `npx tsc --noEmit` 0 errors · `npm run lint` 0 errors
- [ ] Cache-invalidatie na create/generate conform regel #10

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
