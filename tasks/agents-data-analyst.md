---
id: agents-data-analyst
title: Data Analyst-agent — curated read-only query-tools op workspace-data + TABLE-artefact + tabel-render
fase: pre-launch
priority: now
effort: 3-5 dagen
owner: claude-code
status: open
created: 2026-07-05
completed: -
related-adr: docs/adr/2026-07-05-agents-architectuur.md
related-spec: tasks/_drafts/idea-agents-feature.md
worktree: branddock-feat-agents-feature
---

# Probleem

De Data Analyst is de enige MVP-agent zonder bestaande motor (aanname A4 — grootste technische onzekerheid, structureel de **eerste drop-kandidaat** richting de lite-variant). Gebruikers kunnen vandaag nergens vragen stellen over hun eigen workspace-data ("hoeveel content per maand, wat is mijn F-VAL-trend, welke persona's zijn ondergedekt?") zonder zelf door modules te klikken. Vrije data-toegang (SQL/raw Prisma) is expliciet verboden; alleen voorgedefinieerde, workspace-scoped, read-only query-tools zijn toegestaan.

# Voorstel

Bouw een curated set query-tools (elk een hand-geschreven Prisma-aggregatie met verplicht `workspaceId`-filter, patroon `src/lib/brandclaw/tools/query-content-fidelity.ts` e.a.) en een `TABLE`-output-contract: de agent levert een JSON-tabel (`{columns: [{key, label, type}], rows: [...], summary}`) die door een strikte parser gevalideerd wordt vóór persistentie als `TABLE`-artefact. In de inbox komt een `TableArtifactView` (sorteerbare kolomkoppen is genoeg; geen grafiek-bibliotheek). Registry-entry met persona + use-case-knoppen ("Content-productie per maand", "F-VAL-trend", "Persona-dekking", "Campagne-status-overzicht") + `agent-data-analyst` feature-key.

Curated query-tools v1 (definitieve lijst tijdens bouw, ~5-7 stuks): deliverable-counts per periode/status/type; F-VAL-scoreverloop uit `ContentReviewLog`; persona/product-dekking in content; campagne-overzicht met status; competitor-snapshot-activiteit; agent-run-kosten per agent (dogfood voor A7-instrumentatie).

# Acceptatiecriteria

- [ ] Given de Data Analyst krijgt een vraag over workspace-data, When de run voltooit, Then rendert een tabel-artefact (JSON-schema-gevalideerd) in de inbox, uitsluitend gebaseerd op workspace-scoped read-only query-tools.
- [ ] Elke query-tool: (1) accepteert géén vrije filter-strings die naar SQL lekken, (2) filtert hard op `ctx.workspaceId`, (3) is read-only (geen enkele Prisma-write), (4) cap't het resultaat (≤200 rijen per tool-call) — afgedwongen in code, aantoonbaar in review.
- [ ] Tabel-parser wijst misvormde agent-output af → run COMPLETED met fallback: het `finalMessage` als `REPORT`-artefact + expliciete "tabel-parse mislukt"-notitie (nooit een corrupt TABLE-artefact).
- [ ] `TableArtifactView` in de inbox: kolomkoppen, type-bewuste rendering (datum/nummer/tekst), lege-tabel-state, >50 rijen → paginatie of scroll.
- [ ] Use-case-knoppen leveren in één klik een zinnige tabel op een gevulde dev-workspace; op een lege workspace een nette "geen data"-uitkomst (geen hallucinatie van cijfers — agent-instructie + spot-check).
- [ ] Cijfers in de tabel matchen de DB (steekproef: 3 waarden handmatig naverifiëerd via psql).
- [ ] `npx tsc --noEmit` 0 errors
- [ ] `npm run lint` 0 errors
- [ ] Smoke-test uitgevoerd
- [ ] Documentatie bijgewerkt indien van toepassing

# Bestanden die ik aanraak

- `src/lib/agents/registry/definitions/data-analyst.ts` (nieuw — persona, system-prompt met anti-hallucinatie-instructie, use-cases, TABLE-contract)
- `src/lib/agents/registry/data-analyst/query-tools.ts` (nieuw — de curated tools; evt. gesplitst per domein als het >300 regels wordt)
- `src/lib/agents/registry/data-analyst/table-contract.ts` (nieuw — JSON-schema + strikte parser + fallback)
- `src/lib/agents/registry/index.ts` — 6e agent registreren (regels: ~3)
- `src/features/agents/components/TableArtifactView.tsx` (nieuw) + de type-switch in `ArtifactViewer.tsx` (regels: ~10)
- `src/lib/ai/feature-models.ts` — alleen als de key in foundation nog niet gedefinieerd bleek (verwacht: al aanwezig)

# Bestanden die ik NIET aanraak

- `prisma/schema.prisma` — het `TABLE`-enum-lid landt al in `agents-foundation`; hier geen schema-werk.
- `src/lib/brandclaw/orchestrator/**`, API-routes, overige agent-definities.
- Geen grafiek-/chart-library toevoegen (`npm install` van visualisatie = out of scope, zie gates).

# Smoke test plan

1. Use-case "Content-productie per maand" op een gevulde workspace → tabel met maanden + counts; 3 waarden geverifieerd via psql tegen `Deliverable`.
2. Vrije vraag "welke persona's hebben de minste content?" → agent kiest juiste tool(s), tabel klopt.
3. Lege workspace → "geen data"-tabel of -melding, geen verzonnen cijfers.
4. Workspace-isolatie: identieke vraag in workspace B → uitsluitend B-data (geen overlap met A-waarden).
5. Misvormde output forceren (system-prompt-tweak in dev) → fallback-REPORT + parse-notitie, geen crash.
6. Guard: vraag die >20 tool-calls uitlokt → run truncated met nette melding.

# Risico's

- **A4 blijkt zwaarder dan gedacht** (waarschijnlijkheid: middel): query-tools + contract + render is nieuwbouw. Mitigatie is structureel: deze taak is als geheel de eerste drop — bij uitloop of Track-druk verschuift hij integraal naar post-MVP zonder dat de andere 5 agents er last van hebben (registry-entry is de enige koppeling).
- **Hallucinatie van cijfers**: LLM vult tabellen aan buiten tool-output → system-prompt verplicht "uitsluitend tool-resultaten in de tabel" + spot-check in de smoke; bij twijfel: tabel-rows 1-op-1 uit tool-output laten samenstellen door de parser i.p.v. door het model.
- Grote aggregaties op volle workspaces → rij-caps + `groupBy`-queries i.p.v. row-fetch; geen fetch-loops.

# Out of scope

- Grafieken/visualisaties, CSV-export — pilot-vraag eerst.
- Query-tools op externe data (ad-platforms, analytics) — alleen Branddock-workspace-data.
- Vrije SQL, dynamische query-builders, natural-language-to-Prisma — expliciet verboden (idea-doc Must-NOT).
- Cross-workspace/agency-rollups — workspace-scoped only.

# Notes

- **Phase -1 gates**: Simplicity — 1 sub-dir onder de bestaande registry; geen nieuwe dependencies (geen chart-lib, geen query-DSL). Anti-Abstraction — curated hand-geschreven tools i.p.v. een generieke query-abstractie: 5-7 concrete use-cases rechtvaardigen geen builder. Integration-First — het TABLE-JSON-schema is het contract; parser + renderer pinnen er beide op en worden tegen hetzelfde fixture getest.
- Dependencies: **`agents-foundation` done** (TABLE-enum, output-contract, run-API) + **`agents-ui-inbox` done of ver genoeg** dat `ArtifactViewer` bestaat (de type-switch-uitbreiding is hier ownership).
- Drop-protocol (idea-doc voorwaarde 2): bij lite-fallback → deze task op `status: blocked` met notitie, registry-entry niet mergen; niets anders hoeft terug.
