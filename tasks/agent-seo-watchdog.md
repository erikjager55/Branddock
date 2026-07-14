---
id: agent-seo-watchdog
title: SEO/GEO-onderhoudswachter — scheduled agent die gepubliceerde GEO-content bewaakt
fase: launch
priority: now
effort: 2,5-3,5 dagen (waarvan 0,5 dag gate-datacheck vooraf; bouw start pas na de gate)
owner: claude-code
status: blocked
created: 2026-07-14
completed: -
related-adr: docs/adr/2026-07-05-agents-architectuur.md (bestaand — D4 dekt curated agent-toevoeging; géén nieuwe ADR nodig)
related-spec: tasks/_drafts/idea-agent-seo-watchdog.md
worktree: branddock-agent-seo-watchdog (pas na Taak 0 — de datacheck is code-loos)
---


> **Taak-0-gate GEDRAAID (2026-07-14, prod-Neon): FAALT vandaag** — 0 deliverables met
> `geoOptimizationAnalysis` op prod; er is nog niets te bewaken. Status → `blocked`,
> data-gated op pilot-gebruik: de gate gaat open zodra de pilot GEO-long-form/LP's
> publiceert (hangt samen met user-taken #5 pilot-adoptie en #12 LP-browser-smoke).
> Hertoets de query bij de bouwstart; de rest van dit plan blijft geldig.

# Probleem

Gepubliceerde long-form GEO-content veroudert onbewaakt: de publish-meting (`Deliverable.settings.geoOptimizationAnalysis`, geschreven door de meet-haak in `src/app/api/landing-pages/publish/route.ts`) markeert 90-dagen-staleness alleen als iemand toevallig het GEO-paneel opent. Er is geen push-mechanisme. De agents-scheduling-infra (live op prod 2026-07-14, PR #119: `AgentSchedule` + cron-enqueue + run-notificaties) staat er zonder één agent waarvoor "scheduled" de natuurlijke modus is. Volledige discovery + Red Team Review: `tasks/_drafts/idea-agent-seo-watchdog.md` (verdict ready-to-build, met twee harde voorwaarden die hieronder Taak 0 en de framing-constraint zijn geworden).

# Voorstel

Nieuwe curated registry-agent (7e/8e persona, Dana-patroon) met één deterministische scan-tool en een WEEKLY-schedule als beoogd gebruik:

1. **Scan (judge-vrij, $0 AI)**: eigen tool `scan_published_geo_content` queryt gepubliceerde deliverables van de workspace met een `geoOptimizationAnalysis`, her-scoort de actuele `settings.structuredVariant` via de pure functie `buildGeoOptimizationAnalysis` (`src/lib/landing-pages/geo-analysis.ts`) en berekent de 5 vervalsignalen: staleness (`isContentStale`, `author-profile.ts`), score-drift (publish-score vs actuele score), canonical-drift (`analysis.canonicalUrl` vs `deliverable.publishedUrl`), schema-drift (`schemaTypes`-diff) en feit-veroudering (jaartal-heuristiek op `citeableStats`).
2. **Rapport (één LLM-call, COGS ~$0,10)**: de agent schrijft één geprioriteerd REPORT-artefact ("wat eerst en waarom", per pagina publish- vs actuele score); de tool hangt server-owned LINK-artefacten (met `campaignId`) aan de run zodat elke pagina via de bestaande entity-navigatie direct in de Content Canvas opent.
3. **Herschrijf-voorstel (propose-only)**: per prioriteits-item stelt de agent een **refresh-brief** voor via de bestáánde confirmable Claw-tool `update_deliverable_brief` (welke stats verversen, welk GEO-signaal zwak is, canonical/schema-fix). Na confirm is de brief geüpdatet (bestaand confirm-pad, cache-invalidation al gedekt in `TOOL_CACHE_PREFIXES`); de user regenereert in de canvas via de bestaande structured-variant-flow en republiceert — de publish-hook herberekent dan de GEO-analyse (= het "nieuwe score"-bewijs).

Run zelf is 0 credits voor de user (agent is niet `billable`; analyse-agents zijn floor-gedekt per pricing-ADR). Scan-run kost alleen de rapport-LLM-call.

## Geverifieerd re-entry-punt (discovery-checkpunt 1 — uitkomst wijkt af van de aanname)

`runSeoPipeline` (8-staps, `src/lib/ai/seo-pipeline.ts`) is **niet** het herschrijfpad voor long-form GEO. De orchestrate-route (`src/app/api/studio/[deliverableId]/orchestrate/route.ts`) skipt puck-renderables via de W1-dubbelpad-gate, en long-form mét actief geo-doel ís puck-renderable (`isPuckRenderable`, `src/lib/landing-pages/webpage-types.ts`). Het levende generatie-/herschrijfpad voor exact de populatie die deze watchdog bewaakt is:

> `POST /api/landing-pages/[deliverableId]/generate-structured-variant` (werkt al op een bestaand deliverable) → variantkeuze in de canvas → republish via `landing-pages/publish` (herberekent `geoOptimizationAnalysis`).

Omdat auto-deploy expliciet out-of-scope is (must-not uit de idea-file), eindigt élke herschrijf hoe dan ook interactief in de canvas (variant kiezen + republiceren). Een headless confirm-generate zou dus credits uitgeven vóór review én de user alsnog de canvas insturen — meer machinerie, nul minder handwerk. **Er komt daarom géén nieuwe write-tool en géén confirm-route-specialisatie**: de proposal-semantiek (en de `acceptedAt`-metric uit de idea-file) loopt via `update_deliverable_brief`, de flow-start via het LINK-deep-link (case `deliverable` in `src/features/agents/lib/entity-navigation.ts` bestaat al, incl. canvas-navigatie met campaignId).

Checkpunt 2 (bron her-scoring): `settings.structuredVariant` — dezelfde canonieke contentbron als de publish-meet-haak; zelfde bewuste blinde vlek voor latere puckData-edits (zie Risico's + `tasks/geo-seo-followup-later.md`).
Checkpunt 3 (marktrapport committen): al gebeurd — `docs/reports/agents-marktonderzoek-en-uitbreidingsadvies-2026-07-14.md` staat op origin/main (PR #128). Actiepunt vervalt.

## Phase -1 Gates (technical planning 2026-07-14)

- **Simplicity Gate: PASS** — 0 nieuwe directories; 2 nieuwe files in de bestaande registry-structuur + 3 kleine extends. Geen nieuwe pipeline, geen light-rewrite-modus, geen GSC-voorbereiding.
- **Anti-Abstraction Gate: PASS** — pure functies (`buildGeoOptimizationAnalysis`, `computeGeoScore`, `isContentStale`, `isRenderableGeoAnalysis`) direct hergebruikt; geen wrapper-lagen; herschrijf via bestaande tool + bestaande routes.
- **Integration-First Gate: PASS** — tool-result-contract hieronder vastgelegd vóór implementatie; artifact- en confirm-contracten zijn de bestaande (`ARTIFACT_CONTRACT` in `definitions/shared.ts`, confirm-route generieke tool-executie).

# Taak 0 — "genoeg voer"-gate (code-loos, vóór de bouw, ~30 min)

Read-only query op de prod-DB (Neon), resultaat als tabel in Notes hieronder. Beslist (a) of de eerste run op de pilot iets zinvols oplevert en (b) de default-staleness-drempel.

```sql
SELECT c."workspaceId",
       COUNT(*) AS geo_pages,
       MIN(d.settings->'geoOptimizationAnalysis'->>'measuredAt') AS oldest_measured,
       MAX(d.settings->'geoOptimizationAnalysis'->>'measuredAt') AS newest_measured,
       COUNT(*) FILTER (
         WHERE (d.settings->'geoOptimizationAnalysis'->>'measuredAt')::timestamptz
               < now() - interval '90 days'
       ) AS stale_90d
FROM "Deliverable" d
JOIN "Campaign" c ON c.id = d."campaignId"
WHERE d.settings ? 'geoOptimizationAnalysis'
GROUP BY c."workspaceId"
ORDER BY geo_pages DESC;
```

**Gate-regel**: <2 pagina's met een `geoOptimizationAnalysis` op de pilot-workspace → stop, bespreek met user of (a) eerst content publiceren, (b) drempel verlagen, of (c) task parkeren. Geen sluipende scope ("dan scannen we ook externe pagina's") — dat is expliciet out-of-scope #5 in de idea-file.

# Contract — scan-tool result (Integration-First)

`scan_published_geo_content` — input: `{ staleAfterDays?: number }` (default 90). Output naar het model (gefenced via `fenceUntrustedContent` — titels/findings zijn content-afgeleid):

```jsonc
{
  "pagesScanned": 4,
  "healthy": 2,
  "flagged": [            // cap 25 in model-result; LINK-artefacten cap 10
    {
      "deliverableId": "…", "campaignId": "…", "title": "…",
      "publishedUrl": "https://…",
      "publishScore": 82, "currentScore": 74, "scoreDelta": -8,
      "measuredAt": "2026-03-30T…", "staleDays": 106, "isStale": true,
      "canonicalDrift": false,
      "schemaDrift": { "missing": ["FAQPage"], "added": [] },
      "agedStats": [{ "label": "…", "year": 2024 }],
      "weakSignals": ["citedStats", "entityClarity"]  // uit her-score findings
    }
  ]
}
```

- Query: `prisma.deliverable.findMany({ where: { campaign: { workspaceId: ctx.workspaceId }, approvalStatus: 'PUBLISHED' } })`, daarna JS-filter op `settings.geoOptimizationAnalysis` (pre-launch volumes; geen JSON-path-query nodig). **Workspace-isolatie via de campaign-relatie is verplicht** — de tool draait ook headless (scheduled) met alleen `ctx.workspaceId`.
- Corrupte/gedrifte JSON: hergebruik `isRenderableGeoAnalysis` (`geo-panel-view.ts`) als guard; niet-parsebare records overslaan met een `skipped`-teller, nooit throwen (fail-soft tool-conventie).
- De tool doet géén DB-mutaties → geen cache-invalidation nodig; run-finalize invalideert `agents` al.

# Acceptatiecriteria

- [ ] Taak 0 uitgevoerd; tabel in Notes; gate-besluit expliciet genoteerd (drempels/cadence eventueel bijgesteld)
- [ ] Given een workspace met ≥1 gepubliceerd GEO-deliverable met `measuredAt` ouder dan de drempel, When de (scheduled) run draait, Then één REPORT in de inbox met per pagina vervalsignalen + publish- vs actuele score + prioriteit, LINK-artefacten die naar de canvas navigeren, en 0 credits afgeboekt (CreditLedger leeg voor deze run)
- [ ] Given dat rapport, When de user het `update_deliverable_brief`-proposal voor één pagina bevestigt, Then is de brief van dát deliverable geüpdatet (bestaand confirm-pad) en start de user via het LINK-deep-link de bestaande structured-variant-regeneratie; na republish staat een verse `geoOptimizationAnalysis` met nieuwe score naast de oude in het GEO-paneel
- [ ] Given een workspace waar alles gezond is, When de run draait, Then meldt het REPORT expliciet "geen verval gedetecteerd" (artifacts-contract: geen stille no-op, geen valse urgentie)
- [ ] Given een workspace zonder enige gepubliceerde GEO-deliverable, When de run draait, Then legt het REPORT uit dat er niets te bewaken valt en adviseert het de schedule uit te zetten (dunste invulling van idea-criterium 4: eerste-run-uitleg, geen UI-gate)
- [ ] Given een falende run, Then bestaand gedrag: precies één fout-notificatie (`notify-run-finished.ts`), geen half artefact
- [ ] Het rapport bevat **nooit** traffic-/ranking-claims — behavior-prompt verbiedt het expliciet ("maintenance backlog, never traffic loss — we do not measure traffic"); smoke-check grep op rapport-output
- [ ] Scheduled-run-bewijs geleverd (zie smoke-test stap 6): run met `triggerType='scheduled'` + `scheduleId` gezet + notificatie ontvangen
- [ ] `npx tsc --noEmit` 0 errors
- [ ] `npm run lint` 0 errors
- [ ] Smoke-test uitgevoerd
- [ ] Changelog-entry bij afronden

# Bestanden die ik aanraak

| Bestand | Wijziging | Omvang | Risico |
|---|---|---|---|
| `src/lib/agents/registry/definitions/seo-watchdog.ts` | **nieuw** — persona + mission/behavior (framing-constraint hard in de prompt; "geen verval" expliciete uitkomst; proposal-gedrag: max 3 refresh-briefs per run), use-case `weekly-decay-scan`, `registerSeoWatchdogTools()` (eigen scan-tool + `read_deliverables` + `update_deliverable_brief` via `registerClawToolsForAgent`) | ~130 regels | laag |
| `src/lib/agents/registry/seo-watchdog-scan.ts` | **nieuw** — de deterministische scan-tool (contract hierboven) + pure drift-helpers (exporteerbaar voor smoke); `recordArtifact` voor LINKs (patroon `pipeline-tools.ts`) | ~200 regels | medium |
| `src/lib/agents/registry/types.ts` | extend — `'seo-watchdog'` in de `AgentId`-union | 1 regel | laag ⚠️ gedeeld met `agent-reporter` |
| `src/lib/agents/registry/index.ts` | extend — import + `registerAgent` + tools-registratie + toevoegen aan de memory-tools-loop | ~6 regels | laag ⚠️ gedeeld met `agent-reporter` |
| `src/lib/ai/feature-models.ts` | extend — `'agent-seo-watchdog'` in `AiFeatureKey` + `AI_FEATURES`-entry (anthropic / claude-sonnet-4-6, patroon-pariteit) | ~11 regels | laag ⚠️ gedeeld met `agent-reporter` |
| `tasks/agent-seo-watchdog.md` | Taak-0-tabel + gate-besluit in Notes | — | — |
| `docs/changelog.md` | entry bij afronden | — | — |

Geen UI-code: catalogus, detailpagina, schedule-picker, inbox en icon-resolutie zijn data-gedreven vanuit `listAgents()` (`AgentCard.tsx` / `AgentIcon.tsx` resolven Lucide-iconen op naam). Geen Tailwind-4-purge-surface.

# Bestanden die ik NIET aanraak

- `src/lib/ai/seo-pipeline.ts` + `seo-generation-job.ts` — niet het herschrijfpad voor deze populatie (zie re-entry-verificatie); geen refresh-modus bijbouwen
- `src/app/api/landing-pages/[deliverableId]/generate-structured-variant/route.ts` — bestaande herschrijf-route, ongewijzigd hergebruikt via de canvas
- `src/app/api/landing-pages/publish/route.ts` + `src/lib/landing-pages/geo-analysis.ts` — de meet-haak blijft de enige schrijver van `geoOptimizationAnalysis`
- `src/app/api/agents/runs/[runId]/confirm/route.ts` — `update_deliverable_brief` is generiek gedekt (incl. `TOOL_CACHE_PREFIXES`); geen specialisatie nodig
- `src/lib/agents/schedules/*` — volledig generiek; WEEKLY is al de UI-default (zie `tasks/agent-reporter.md`-verificatie van `ScheduleManagerCard`)
- `src/lib/claw/tools/write-tools.ts` — geen nieuwe confirmable tool
- Billing-modules — zie Risico's: het structured-variant-pad charget vandaag geen credits; pariteit herstellen is credit-model-werk, niet deze task

# Smoke test plan

Dev-setup: lokale workspace met ≥2 long-form-GEO-deliverables gepubliceerd via de canvas; van één de `settings.geoOptimizationAnalysis.measuredAt` in de DB op −120 dagen zetten (verval forceren).

1. **Happy path**: handmatige run via de agents-UI → één REPORT met beide pagina's, de stale pagina bovenaan, publish- vs actuele score zichtbaar; LINK-artefacten aanwezig; `CreditLedger` toont géén afboeking voor de run.
2. **Framing-check**: grep rapport-markdown op "traffic", "verkeer", "ranking", "bezoekers" → 0 hits met verlies-claim; wél "onderhoud"/"maintenance"-framing.
3. **Herschrijf-loop**: `update_deliverable_brief`-proposal confirmen → brief geüpdatet (canvas Step 1 toont refresh-brief); LINK-klik → Content Canvas opent met het juiste deliverable; regenerate + republish → GEO-paneel toont verse `measuredAt` + nieuwe score; tweede scan-run rapporteert de verbetering (delta positief of gezond).
4. **Lege state**: verse workspace zonder GEO-deliverables → run levert uitleg-REPORT "niets te bewaken" + advies schedule uit; geen crash, geen leeg artefact.
5. **Error-state**: `settings.geoOptimizationAnalysis` van één record corrupt maken (bv. `signals` verwijderen) → record wordt geskipt (teller in tool-result), run slaagt; daarna tool hard laten falen (bv. tijdelijke throw) → run FAILED + precies één fout-notificatie, geen half artefact.
6. **Scheduled-run-bewijs**: `AgentSchedule` aanmaken voor deze agent (dev: `EVERY_MINUTE` mag via `isDevCadenceAllowed`; anders WEEKLY met `nextRunAt` handmatig in het verleden) → cron-tick lokaal draaien → `AgentRun` met `triggerType='scheduled'` + `scheduleId` gezet, artefacten in de inbox, run-notificatie ontvangen; `nextRunAt` correct opgeschoven.
7. **Workspace-isolatie**: tweede workspace met eigen GEO-deliverable → scan van workspace A bevat géén pagina's van B (tool-result + LINKs controleren).
8. `npx tsc --noEmit` + `npm run lint` groen.

# Risico's

- **Te weinig voer op de pilot** (waarschijnlijkheid: hoog — pre-launch, handvol pagina's). Mitigatie: Taak 0 is een harde gate vóór de bouw; bij <2 pagina's expliciet user-besluit, geen scope-uitbreiding naar externe pagina's.
- **Her-scoring meet `structuredVariant`, niet latere puckData/Claw-edits** (waarschijnlijkheid: middel) → vals-negatieve "drift" mogelijk na handmatige edits. Mitigatie: zelfde bewuste beperking als de publish-meet-haak (gedocumenteerd in `publish/route.ts`); rapport-copy benoemt "gemeten op de canonieke contentbron"; flatten-scoring blijft `tasks/geo-seo-followup-later.md`.
- **Merge-conflict met `agent-reporter`** (waarschijnlijkheid: hoog als parallel gebouwd) — beide tasks raken `types.ts`-union, `index.ts`-bootstrap en `AI_FEATURES`; beide claimen "7e agent". Mitigatie: sequencen (wie het eerst merget wint de naam "7e") of file-ownership vooraf afstemmen; conflictoppervlak is klein en mechanisch.
- **Model negeert de framing-constraint** (waarschijnlijkheid: laag) — de deterministische tool-data bevat geen traffic-velden, dus de grondstof voor traffic-claims ontbreekt; behavior-prompt verbiedt het expliciet; smoke-stap 2 checkt het.
- **JSON-drift in oude `geoOptimizationAnalysis`-records** (waarschijnlijkheid: middel) → hergebruik `isRenderableGeoAnalysis` + skip-teller i.p.v. eigen parsing; nooit een run laten falen op één corrupt record.
- **Kosten-uitloop bij veel pagina's** (waarschijnlijkheid: laag nu) → cap flagged-items op 25 in het model-result en LINKs op 10; rapport blijft één LLM-call; COGS-doel ≤ $0,15/run haalbaar (Sonnet, compacte JSON-input).
- **Billing-bevinding (pre-existing, niet deze task)**: het structured-variant-pad charget vandaag géén credits — alleen het `runSeoPipeline`-pad boekt `'long-form'` (80). De idea-file-aanname "herschrijf kost 80 credits pre-flight" is voor deze populatie dus stale. De herschrijf volgt de bestaande flow as-is; credit-pariteit voor structured-variant-generatie is een los credit-model-punt (melden bij de billing-owner, niet hier fixen).

# Out of scope

Volledige lijst in de idea-file (10 items — o.a. auto-deploy, GSC, DataForSEO, crawler-citatie-meting, externe pagina's via WebsiteScan, light-rewrite-pipeline, auto-fix schema/canonical, cannibalisatie-analyse, agency-rollup, eigen digest-kanaal). Aanvullend uit deze tech-planning:

- Headless confirm-herschrijf (nieuwe confirmable write-tool + confirm-route-specialisatie) — bewust niet: zie re-entry-verificatie
- UI-gate "schedule aanzetten zonder GEO-content" in `ScheduleManagerCard` — eerste-run-uitleg dekt het criterium; UI-gate pas als de eerste-run-variant in de praktijk ruis geeft
- Credit-charge op het structured-variant-pad — billing-owner
- Nightly staleness-recompute-cron (`geo-seo-followup-later.md` sub-item) — deze agent vervangt dat sub-item functioneel op agent-niveau; sub-item daar afvinken/verwijzen zodra deze task done is

# Notes

- **Persona-naam**: productkeuze bij bouw (soft constraint idea-file). Bestaand: Nova, Vera, Stella, Milo, Marco, Dana; Remi is geclaimd door `agent-reporter`. Voorstel: **Iris** (waakzaam oog), icon bv. `Eye` of `Radar` (Lucide).
- **Rapportvorm**: REPORT (markdown) — prioriteitsverhaal met per-pagina-blokken leest beter dan TABLE voor "wat eerst en waarom"; TABLE blijft optie als dogfood anders uitwijst.
- **Success-metric-meting** (uit idea-file): `AgentArtifact.acceptedAt` op PROPOSALs van deze agent met run `triggerType='scheduled'` — werkt ongewijzigd omdat de refresh-brief een echt PROPOSAL-artefact is. Aanvullend outcome-signaal: verse `measuredAt` op een geflagde pagina ≤14 dagen na de flaggende run (query op `settings`).
- **Cadence**: default-advies WEEKLY in de agent-beschrijving; prod-floor is DAILY (`EVERY_MINUTE` dev-only, runtime-gehandhaafd in `enqueue.ts`). Geen code nodig — schedule-UI default staat al op WEEKLY.
- Taak-0-resultaat: _(tabel + gate-besluit hier invullen)_
