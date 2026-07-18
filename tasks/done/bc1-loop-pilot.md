# bc1-loop-pilot — Brandclaw BC-1: Loop-pilot-agent (wekelijkse content-loop)

- **Status**: done
- **Datum**: 2026-07-18
- **Bron**: `docs/reports/p36-brandclaw-herijking-2026-07-17.md` (BC-1) · go van Erik 2026-07-18 ("ga door met brandclaw bc-1-go")
- **Worktree**: branddock-loop-pilot

## Scope

BC-1 uit de Brandclaw-herijking: een scheduled agent ("Bo", Loop-pilot) die wekelijks signalen leest (productie-tempo, F-VAL-trend, persona/product-dekking, campagne-stand) → max 3 content-voorstellen (pilot: alleen `linkedin-post`/`blog-post`) als propose-only `create_deliverable` in de agents-inbox zet → één REPORT-artefact met de signaal-onderbouwing. Mens keurt goed; generatie + F-VAL draaien ná approve via het bestaande confirm-pad. Publiceren blijft handmatig (BC-2 is de volgende trap).

## File-list

- `src/lib/agents/registry/definitions/loop-pilot.ts` (nieuw — definitie + tools-registratie)
- `src/lib/agents/registry/types.ts` (AgentId + "loop-pilot")
- `src/lib/ai/feature-models.ts` (AiFeatureKey + AI_FEATURES-entry `agent-loop-pilot`)
- `src/lib/agents/registry/index.ts` (bootstrap + memory-loop)
- `scripts/dev/agent-loop-pilot-smoke.ts` (nieuw)
- `tasks/agents-brandclaw-convergentie.md` (herijkingsnoot)

## Bewuste keuzes

- **Ads-signalen blijven bij Ada** — Loop-pilot krijgt Dana's query-tools, niet `read_ad_signals`; anders ontstaat een dubbel refresh-voorstel-circuit met Ada's weekbudget.
- **0-credit run** (geen `billable`), zoals alle analyse-agents; de content-charge valt in het bestaande confirm-pad. Zelfde bekende credit-model-punt als bij Ada (gedocumenteerd in `ads-watchdog.ts` header).
- **Cap = 3 voorstellen** via prompt + maxToolCalls 12; hard afdwingbaar weekbudget (à la Ada's `WEEKLY_PROPOSAL_CAP`) is BC-2-werk zodra de loop autonomer wordt.
- **Geen nieuw autonomie-risico**: alle writes lopen door proposal → confirm; run eindigt op AWAITING_CONFIRMATION.
- Geen nieuwe ADR: BC-1 is orkestratie binnen ADR 2026-07-05 (agents-architectuur); de fasering staat in het P3.6-rapport.

## Acceptatiecriteria

- [ ] Echte run op dev-workspace: 1 REPORT + TABLE-artefacten + ≤3 proposals binnen pilot-scope, 0 credits op de run
- [ ] Confirm-pad: voorstel → deliverable → canvas-generatie draait
- [ ] tsc + lint 0 errors
- [ ] WEEKLY schedule aan te maken via bestaande schedules-API/UI (geen code nodig)

## Activatie (na merge, Erik of sessie)

Prod-schedule aanmaken: Agents → Loop-pilot → schedule WEEKLY (voorstel: maandag 06:00, Better Brands). Eerste run reviewen in de inbox vóór bredere uitrol.

## Out-of-scope

BC-2 (approve = publiceren, autonomie-tier per workspace), BC-3 (bounded autonomy + kill-switch), hard weekbudget, andere content-types dan linkedin/blog.
