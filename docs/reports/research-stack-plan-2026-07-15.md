# Research-stack-bundel — uitvoeringsplan (2026-07-15)

> **Voor de uitvoerende sessie (Claude Sonnet 5):** dit is het overkoepelende plan voor vier
> taken die de research-motoren (Exa neural search, Semantic Scholar, Nova's deep-research-
> pipeline) doortrekken naar vier product-oppervlakken. Elke taak heeft een eigen task-file
> met geverifieerde re-entry-punten, contracten en een smoke-plan — begin dáár, niet hier.
> Dit document geeft alleen volgorde, gedeelde patronen en de werkafspraken.

## Context

Op 2026-07-15 kwamen de EXA- en S2-keys live (user-taak #4) en is de scholar-wiring in Nova's
deep-research gedicht (#402). Drie checks (S2, Nova, Exa — zie chat-sessie + changelog #402)
wezen dezelfde beste vervolg-kandidaten aan: **trend-radar**, **Marco/concurrent-monitoring**
en **GEO long-form**; daarnaast kwam **brand-mention-monitoring** naar voren als nieuwe
capability. User-besluit 2026-07-15: alle vier plannen, uitvoering post-launch door een
aparte sessie.

## De vier taken, aanbevolen volgorde

| # | Task-file | Wat | Effort | Waarom deze volgorde |
|---|---|---|---|---|
| 1 | [`tasks/research-stack-trend-radar.md`](../../tasks/research-stack-trend-radar.md) | Exa + S2 als extra bronlagen in de trend-radar-researcher | 1-2d | Kleinste scope, zelfde "optionele verrijking"-patroon als #402 — warmdraai-taak |
| 2 | [`tasks/research-stack-marco-web-signals.md`](../../tasks/research-stack-marco-web-signals.md) | Nieuwe curated tool: extern web-/nieuwsbeeld per concurrent (Exa) voor Marco | 1-2d | Bouwt op patroon uit taak 1; raakt alleen de agents-registry |
| 3 | [`tasks/research-stack-geo-research-backed.md`](../../tasks/research-stack-geo-research-backed.md) | Research-backed `citeableStats` (Exa + S2) in de GEO-long-form-generatie | 2-4d | Grootste waarde (GEO-differentiator), raakt de generatie-keten — doe dit met de ervaring van 1+2 |
| 4 | [`tasks/brand-mention-monitor.md`](../../tasks/brand-mention-monitor.md) | Nieuwe capability: merkvermeldingen-monitor (Fase-0-gated) | Fase 0 ~½d · bouw 3-5d na GO | Echt nieuw — heeft een Fase-0-validatie vóór er code komt (idea-doc: `tasks/_drafts/idea-brand-mention-monitor.md`) |

Taken 1-3 zijn onafhankelijk uitvoerbaar (geen gedeelde bestanden behalve triviale
changelog-conflicten); 4 is gegate. Sequentieel uitvoeren is aanbevolen maar niet verplicht.

## Gedeelde patronen (verplicht — dit is de huisstijl van deze codebase)

1. **Optionele verrijking, fail-soft**: elke externe bron draait alleen mét key
   (`process.env.EXA_API_KEY` / `S2_API_KEY`), degradeert naar een warning, en blokkeert
   nooit de hoofdflow. Referentie-implementatie: het Exa- en scholar-blok in
   `src/lib/knowledge-research/phases/search.ts` (#402).
2. **Bestaande clients hergebruiken**: `fetchExaContext` (`src/lib/exa/exa-client.ts`) en
   `fetchScholarContext` (`src/lib/semantic-scholar/scholar-client.ts`). Géén nieuwe
   HTTP-clients bouwen; wél mag je een dunne query-builder per domein toevoegen (patroon
   `src/lib/exa/exa-queries.ts`).
3. **Content-afgeleide strings fencen** vóór ze een agent-/model-context ingaan:
   `fenceUntrustedContent` (`src/lib/ai/untrusted-fence.ts`). Zie de agents-registry-tools
   voor voorbeelden (bv. `src/lib/agents/registry/ads-watchdog/tools.ts`).
4. **Workspace-isolatie is hard**: elke query workspace-gescoped; agent-tools krijgen
   `ctx.workspaceId` en niets anders.
5. **Geen credit-metering op research/analyse** (pricing-ADR 2026-07-07): geen `billable`,
   geen chargeAfter — research is de gratis fundering.
6. **Werkwijze per taak**: eigen worktree via `scripts/dev/worktree.sh <task-id>` →
   bouwen → `npx tsc --noEmit` 0 + eslint 0 → smoke-script met échte runs (patroon
   `scripts/dev/agent-*-smoke.ts`) → code-reviewer-subagent op de diff → fixes → PR →
   CI groen → merge. Changelog-entry per taak (doorlopende nummering in
   `docs/changelog.md`).
7. **Kosten bewaken**: elke run die AI/externe API's raakt hoort in de smoke een
   kosten-datapunt te loggen; richtprijs ≤ $0,15 per run/generatie-verrijking.

## Wat de uitvoerende sessie moet weten (leeslijst per sessie-start)

- `CLAUDE.md` + `gotchas.md` + `START_HERE.md` (sessie-opener, verplicht).
- De task-file van de taak die je oppakt (volledig).
- `docs/changelog.md` #402 (het wiring-patroon) en #394-#400 (hoe de agents-bouwslagen
  van 2026-07-14 zijn aangepakt — zelfde kwaliteitslat).
- Voor taak 4: eerst `tasks/_drafts/idea-brand-mention-monitor.md` (discovery + Red Team).

## Expliciet uitgesteld (niet in deze bundel)

- Persona-onderzoek via Exa (matige waarde), S2 in andere agents, MCP-server (geparkeerd
  2026-07-15, besluiten staan in roadmap §🔌), Nova-onboarding-wow (kosten per signup).
