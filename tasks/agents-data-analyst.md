---
id: agents-data-analyst
title: Data Analyst-agent — curated read-only query-tools op workspace-data + TABLE-artefact + tabel-render
fase: pre-launch
priority: now
effort: 3-5 dagen
owner: claude-code
status: in-review
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

- [x] Given de Data Analyst krijgt een vraag over workspace-data, When de run voltooit, Then rendert een tabel-artefact (JSON-schema-gevalideerd) in de inbox, uitsluitend gebaseerd op workspace-scoped read-only query-tools. *(Live runs op Zwarthout: use-case → 2 TABLE-artefacten met échte DB-rijen; TABLE is server-owned — zie status-blok.)*
- [x] Elke query-tool: (1) accepteert géén vrije filter-strings die naar SQL lekken, (2) filtert hard op `ctx.workspaceId`, (3) is read-only (geen enkele Prisma-write), (4) cap't het resultaat (≤200 rijen per tool-call) — afgedwongen in code, aantoonbaar in review. *(Inputs = geclampte getallen + allowlist-enums (`shared.ts`); raw SQL alleen als vaste geparametriseerde tagged-templates voor date_trunc-maandaggregatie; `MAX_TABLE_ROWS` in parser én queries; workspace-isolatie deterministisch bewezen in smoke.)*
- [x] Tabel-parser wijst misvormde agent-output af → run COMPLETED met fallback + expliciete "table parse failed"-notitie (nooit een corrupt TABLE-artefact). *(Architectuur-update: TABLE is server-owned — model-authored TABLE wordt al door de whitelist geweigerd; de strikte parser valideert de tool-gebouwde tabel vóór persistentie en registreert bij reject een REPORT-fallback met notitie + ruwe data — smoke-bewijs `agents-data-analyst.ts`.)*
- [x] `TableArtifactView` in de inbox: kolomkoppen, type-bewuste rendering (datum/nummer/tekst), lege-tabel-state, >50 rijen → paginatie of scroll. *(Sorteerbare koppen (asc/desc, type-bewust), nummer rechts + tabular-nums, datum-formatting, empty-state, >50 rijen → max-height + scroll; 11/11 browser-checks.)*
- [x] Use-case-knoppen leveren in één klik een zinnige tabel op een gevulde dev-workspace; op een lege workspace een nette "geen data"-uitkomst (geen hallucinatie van cijfers — agent-instructie + spot-check). *(content-production + persona-coverage live gedraaid; lege workspace WRA Juristen → lege tabel + eerlijk "geen persona's"-antwoord, geen verzonnen cijfers.)*
- [x] Cijfers in de tabel matchen de DB (steekproef: 3 waarden handmatig naverifiëerd via psql). *(Maandcounts 1/5/1/17, IN_PROGRESS=1, linkedin-post=7, landing-page=5, totaal 24 — allemaal psql-bevestigd; plus automatische cross-check in het smoke-script.)*
- [x] `npx tsc --noEmit` 0 errors
- [x] `npm run lint` 0 errors
- [x] Smoke-test uitgevoerd *(deterministisch script 22/22 + live API-runs + 11/11 browser-checks + e2e "Agents UI" 5/5)*
- [ ] Documentatie bijgewerkt indien van toepassing *(changelog-entry volgt bij task-finalize door de coördinator)*

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

---

# Status 2026-07-06 — GEBOUWD (branch `feat/agents-data-analyst`, worktree branddock-feat-agents-data)

## Architectuur-beslissing (afwijking t.o.v. het oorspronkelijke voorstel — gevolg van de motor-wiring-review-loops, NIET stil)

Het voorstel liet het model de tabel-JSON aanleveren; de motor-wiring-security-fix whitelist model-authored artefacten echter tot REPORT/LINK (geforgede-artefacten-fix). Daarom zijn **TABLE-artefacten hier volledig server-owned**: elke query-tool bouwt zijn tabel uit het échte Prisma-resultaat, valideert hem tegen de strikte parser (`table-contract.ts`) en registreert hem via `recordArtifact` in de run-collector (zelfde patroon als het deep-research-REPORT). Het model krijgt alleen een compacte, gefencede samenvatting + rij-preview terug. Netto-effect: het model kán geen tabel-cijfers verzinnen of vervalsen — sterker dan het oorspronkelijke "parser wijst model-output af"-criterium; de fallback-clausule (misvormd → REPORT + "table parse failed"-notitie, run COMPLETED) is behouden voor tool-bugs.

## Gebouwd

- `src/lib/agents/registry/data-analyst/table-contract.ts` — TABLE-shape (`{columns:[{key,label,type}], rows, summary?}`, pint op `renderTableMarkdown` in materialize-artifact + TableArtifactView), strikte parser (rij-cap 200, scalar-cellen, unieke kolommen), `recordTableArtifact` met REPORT-fallback + preview-cap (8k chars / 50 rijen, gefenced — DB-velden zijn user-data).
- `src/lib/agents/registry/data-analyst/shared.ts` — clamp/allowlist/window-helpers (het "kleine parametervlak").
- `src/lib/agents/registry/data-analyst/content-tools.ts` + `workspace-tools.ts` + `query-tools.ts` — 7 curated tools (per-tool query gedocumenteerd in de file):
  1. `query_content_production` — maandcounts Deliverable⋈Campaign (vaste `$queryRaw` date_trunc-template, params: geclampte `months` + `ctx.workspaceId`).
  2. `query_content_inventory` — `Deliverable.groupBy(contentType×status)` via `campaign.workspaceId`.
  3. `query_fval_scores` — maand-avg/min/max `ContentReviewLog.compositeScore` (vaste `$queryRaw`-template).
  4. `query_content_coverage` — persona-/product-dekking via `CampaignKnowledgeAsset` (dimension-allowlist) + `Deliverable.groupBy(campaignId)`; minst gedekt eerst.
  5. `query_campaign_overview` — `Campaign.findMany` + `_count.deliverables` + status-groupBy (status-allowlist-filter).
  6. `query_competitor_activity` — `Competitor.findMany` + `CompetitorActivity.groupBy(competitorId×severity)` in window.
  7. `query_agent_run_costs` — `AgentRun.groupBy(agentId)` kosten/tokens/latency + status-split (A7-dogfood).
- `src/lib/agents/registry/definitions/data-analyst.ts` — persona "Dana" (BarChart3), anti-hallucinatie-system-prompt (uitsluitend tool-cijfers; lege data eerlijk benoemen; lege artifacts-array — tabellen zijn al attached), 4 use-cases, featureKey `agent-data-analyst`, `maxToolCalls: 12`, geen write-tools → runs eindigen COMPLETED.
- `src/lib/agents/registry/index.ts` — 6e agent + tools geregistreerd in de bootstrap.
- `src/features/agents/components/TableArtifactView.tsx` + type-switch in `ArtifactViewer.tsx` — sorteerbare, type-bewuste tabel (zie criteria); Tailwind-4-purge-check op alle classes gedaan (alle aanwezig in de gecompileerde `src/index.css`; `tabular-nums`/`border-collapse`/max-height via inline style).
- i18n: `artifact.table.*`-keys (invalid/empty/rowCount/sortHint) in en+nl; placeholder-key verwijderd.
- `scripts/smoke-tests/agents-data-analyst.ts` — deterministische smoke (22 asserts, geen AI-kosten).

## Bewijs (2026-07-06, poort 3004, workspace Zwarthout)

| Check | Resultaat |
|---|---|
| Catalogus | `GET /api/agents` → 6 agents incl. `data-analyst` |
| Use-case-run "content-production" | COMPLETED 21,6s / $0.052 → 2 TABLE-artefacten (production + inventory), rijen = échte DB-data |
| psql-steekproef | maandcounts 2026-07=1 / 2026-06=5 / 2026-04=1 / 2026-03=17, IN_PROGRESS=1, linkedin-post=7, landing-page=5, totaal 24 — exact match |
| Vrije vraag ("welke persona's minste content + AI-spend") | COMPLETED, agent koos zelf `query_content_coverage` + `query_agent_run_costs`; beide tabellen psql-geverifieerd (agent-cost-delta van de eigen in-flight run is timing-correct) |
| Lege workspace (WRA Juristen) | COMPLETED → lege TABLE (0 rows, eerlijke summary) + "geen persona's geregistreerd"-antwoord, géén verzonnen cijfers |
| Accept TABLE | → `KnowledgeResource` (source AGENT) met correcte markdown-tabel (shape sluit op `renderTableMarkdown`) |
| Browser (Playwright, echte data) | 11/11: render, sort asc/desc (tekst + maand), rechts-uitgelijnde nummers, nl-plural rijenteller, accepted-state + Library-verwijzing, 0 page-errors — screenshot `/tmp/da-table-view.png` |
| Workspace-isolatie | deterministisch: Zwarthout- vs Linfi-competitor-tabellen 0 overlap; cross-check tool-totaal == onafhankelijke Prisma-count |
| Guard/truncatie | `maxToolCalls: 12`-override; truncatie-pad bewezen via foundation-smoke guard-fail (FAILED + nette melding, in de inbox zichtbaar op bestaande strategist-runs) — geen aparte >20-calls-live-run gedaan (kosten/betrouwbaarheid; het pad is agent-onafhankelijk) |
| Gates | `npx tsc --noEmit` 0 · eslint 0 op alle geraakte files · foundation-smoke 14/14 · data-analyst-smoke 22/22 · e2e "Agents UI" 5/5 (poort-3005-workaround per memory, config teruggedraaid) |

Totale live-smoke-kosten: ~$0.15 (3 runs).
