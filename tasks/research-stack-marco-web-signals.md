---
id: research-stack-marco-web-signals
title: Marco — extern web-/nieuwsbeeld per concurrent via Exa (nieuwe curated tool)
fase: post-launch
priority: next
effort: 1-2 dagen
owner: claude-code
status: open
created: 2026-07-15
completed: -
related-adr: docs/adr/2026-07-05-agents-architectuur.md (D4 dekt curated tool-toevoeging)
related-spec: docs/reports/research-stack-plan-2026-07-15.md
worktree: branddock-research-stack-marco
---

# Probleem

Marco's concurrent-beeld komt volledig uit wat wíj scrapen van de concurrent-site zelf
(`read_competitors`, `review_competitor_activities`). Wat er óver een concurrent gebeurt —
nieuws, funding, lanceringen, vermeldingen elders — is onzichtbaar. Voor de kernvraag
"what moved in our market?" is dat de helft van het antwoord. Exa's neural search met
datum-filters kan dit leveren zonder nieuwe infra.

# Voorstel

Eén nieuwe curated read-tool `read_competitor_web_signals` op Marco's namespace: per
(geselecteerde) concurrent een Exa-zoekslag naar recente externe vermeldingen (laatste N
dagen), teruggegeven als gefencede items (titel/URL/datum/snippet) + server-owned
TABLE-artefact. Prompt-uitbreiding zodat Marco de tool gebruikt bij marktvragen. Geen
schema-wijziging, geen opslag — on-demand lezen (caching optioneel via de bestaande
server-cache).

# Geverifieerde re-entry-punten (2026-07-15, tegen main)

- `src/lib/agents/registry/definitions/market-analyst.ts:51-58` — `registerMarketAnalystTools()`
  registreert nu 5 Claw-tools via `registerClawToolsForAgent`. De nieuwe tool wordt een
  **registry-native tool** (patroon: `registerAgentTool` + eigen module), zoals
  `ads-watchdog/tools.ts` — dat geeft `recordTableArtifact` + fencing out-of-the-box.
- Data-analyst-conventie: `src/lib/agents/registry/data-analyst/shared.ts` (clampInt,
  errorResult) + `table-contract.ts` (recordTableArtifact, MAX_TABLE_ROWS).
- Concurrent-data: `Competitor`-model, workspace-gescoped; namen/domeinen als query-input.
- Exa: `src/lib/exa/exa-client.ts`; waarschijnlijk dunne helper nodig voor per-bron-results
  (zie note in `research-stack-trend-radar.md` — als taak 1 die helper al bouwde: hergebruik).
- Voorbeeld-tool om te spiegelen: `src/lib/agents/registry/ads-watchdog/tools.ts`
  (workspace-scope, fencing, TABLE, caps).

# Contract (Integration-First)

`read_competitor_web_signals` — input `{ competitorId?: string, days?: number }`
(days clampInt 7-90, default 30; zonder competitorId: alle concurrenten van de workspace,
cap 5). Output naar het model:

```jsonc
{
  "competitorsScanned": 3,
  "windowDays": 30,
  "signals": "<gefenced JSON: [{ competitor, title, url, publishedAt?, snippet }] — cap 10/concurrent>"
}
```
Plus TABLE-artefact met dezelfde rijen (server-owned). Query-vorm per concurrent:
naam + domein-uitsluiting (eigen site eruit filteren — het gaat om extern nieuws).

# Acceptatiecriteria

- [ ] Marco beantwoordt "wat is er recent rond concurrent X gebeurd?" met échte externe
      bronnen (URL's niet van het domein van de concurrent zelf) — echte agent-run als bewijs.
- [ ] Zonder `EXA_API_KEY`: tool retourneert een eerlijke "not configured"-melding
      (errorResult-patroon), Marco degradeert netjes; run faalt niet.
- [ ] Workspace-isolatie: concurrenten van workspace A nooit zichtbaar in B (smoke-check).
- [ ] Alle content-afgeleide strings gefenced; TABLE gecapt (MAX_TABLE_ROWS).
- [ ] Kosten-datapunt: run met 3 concurrenten ≤ $0,15.
- [ ] `npx tsc --noEmit` 0 · `npm run lint` 0 · smoke-script met echte run · changelog-entry
- [ ] Dogfood-spec voor Marco geüpdatet als de nieuwe tool een use-case-wijziging vergt
      (waarschijnlijk niet: bestaande use-case "market-movement" dekt het semantisch).

# Bestanden die ik aanraak

| Bestand | Wijziging | Risico |
|---|---|---|
| `src/lib/agents/registry/market-analyst/web-signals.ts` | **nieuw** — de tool (conventie: eigen subdir zoals ads-watchdog) | medium |
| `src/lib/agents/registry/definitions/market-analyst.ts` | extend: registerAgentTool + behavior-regel ("for market movement, also check external web signals") | laag |
| evt. `src/lib/exa/exa-client.ts`-helper | zie taak 1; hergebruik indien al gebouwd | laag |
| `scripts/dev/marco-web-signals-smoke.ts` | nieuw | — |

# Bestanden die ik NIET aanraak

- `competitor-*`-scraping-pipelines (bestaand pad ongemoeid), `review_competitor_activities`
  (blijft de site-scrape-kant), Claw-tools buiten Marco's namespace, schema.

# Smoke-plan

1. Unit: query-bouw sluit het eigen domein uit; caps werken.
2. Directe tool-exec op lokale BB (heeft 2 concurrenten geseed) → echte Exa-resultaten,
   gefenced, TABLE aanwezig.
3. Echte Marco-run ("what moved in our market?") → rapport citeert externe bronnen.
4. Keyless-degradatie + workspace-isolatie.

# Risico's

- **Exa-resultaten over kleine NL-concurrenten kunnen dun zijn** → eerlijke "geen recente
  externe signalen"-uitkomst is een geldig antwoord; niet opvullen.
- **Naam-ambiguïteit** (concurrent heet "Sterk Merk") → query = naam + branche-context uit
  de Competitor-rij; documenteer de beperking in de tool-description.

# Out of scope

Opslag/geschiedenis van signalen (on-demand only), alerting/schedules op deze tool,
niet-Exa-bronnen (nieuws-API's), sentiment-analyse.

# Start-instructie voor de uitvoerende sessie

Lees `CLAUDE.md`+`gotchas.md`, dan deze file + `ads-watchdog/tools.ts` als spiegel.
`scripts/dev/worktree.sh research-stack-marco`. Als taak 1 (trend-radar) al gemerged is:
check of daar een Exa-bronnen-helper landde en hergebruik die. Werk → gates → smoke →
code-reviewer-subagent → PR → merge.
