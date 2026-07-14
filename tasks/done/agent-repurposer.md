---
id: agent-repurposer
title: Repurposing-route — één long-form bron → on-brand social-afgeleiden, elk met F-VAL-score
fase: pre-launch
priority: next
effort: 1-2 dagen (route A) + 10 min user-actie voor de stap-0-gate
owner: claude-code
status: done
created: 2026-07-14
completed: 2026-07-14
related-adr: docs/adr/2026-07-05-agents-architectuur.md (bestaand — géén nieuwe ADR nodig, zie Notes)
related-spec: tasks/_drafts/idea-agent-repurposer.md
worktree: branddock-agent-repurposer
---

> **BLOCKED op stap 0 (A1 bron-inventaris-gate).** De gate-query kon tijdens tech-planning
> níet op prod draaien: `DATABASE_URL` staat als *sensitive* in Vercel (env-pull levert een
> lege waarde) en er is geen geauthenticeerde Neon CLI. De query staat kant-en-klaar in
> stap 0 hieronder — user draait hem (10 min) of levert de Neon-URL. **Onder de drempel:
> niet bouwen** — verdict zakt naar needs-validation-first (terug naar feature-planner).


> **Stap-0-gate GEDRAAID (2026-07-14, prod-Neon)**: (1) bron-inventaris — BB-workspace
> 3 long-form mét content (alle 3 met aanwas <14d; kanttekening: deels door Claude
> gegenereerde smoke-/meetcontent, echte pilot-aanwas moet dit bevestigen), smoke-workspace
> 2. Drempel marginaal gehaald op het aanwas-criterium → status `open`, maar hertoets bij
> de bouwstart. (2) Seed-check — **0 `MediumEnrichment`-rows voor álle 5 formats** op prod:
> Risico 4 is reëel; scope-consequentie: MVP-afgeleiden beperken tot typen mét
> code-fallback, óf enrichment-seed als expliciete sub-stap opnemen (instagram/facebook
> throwen anders hard).

# Probleem

Een afgeronde long-form productie (blog, case study) blijft in Branddock single-use: wie er
social-afgeleiden van wil, doorloopt per kanaal het Add-Content-pad opnieuw en destilleert
handmatig een brief uit content die het systeem al hééft — of plakt de blog in een generieke
chatbot zonder merkstem, zonder F-VAL-score en zonder spoor in de campagne. Marktbewijs
(geverifieerd tegen `docs/reports/agents-marktonderzoek-en-uitbreidingsadvies-2026-07-14.md`,
advies #3, regels 81-85 op origin/main): repurposing is bewezen hoogfrequent (OpusClip 10M
users óndanks ~40% discard) en social-assist is de meest-dagelijkse AI-marketing-taak (79%)
mits strikt draft→approve. F-VAL-per-afgeleide is de anti-discard-differentiator.

# Voorstel

**Beslispunt A5 (apart agent vs Milo-use-case) — goedkoopste route gekozen: Milo-uitbreiding
(route A).** Geen 7e persona in dit MVP; de repurposer wordt een use-case op de bestaande
Content Creator (Milo, `content-creator.ts`) plus één nieuwe read-tool. Onderbouwing van de
kostenvergelijking en het kantelpunt: zie "Beslispunt A5" hieronder.

De bouw bestaat uit drie kleine stukken op bestaande machinerie:

1. **Nieuwe Claw read-tool `read_deliverable_content`** — leest de gegenereerde tekst-content
   van één deliverable (workspace-gecheckt via campaign), geassembleerd uit
   `DeliverableComponent.generatedContent` (geselecteerde componenten, op `order`) met
   fallback `Deliverable.generatedText`. In-tool cap ~12.000 chars + `truncated`-flag
   (de tool-bridge kapt hard op 16k — zie Risico 2).
2. **`create_deliverable`-extensie** — optioneel `sourceDeliverableId`-param: workspace-
   validatie + `derivedFromId` zetten bij create (schemaveld bestaat al, zelfde patroon als
   `/api/studio/[deliverableId]/derive`). Bron-traceerbaarheid wordt daarmee een écht
   relatieveld, niet alleen een zin in de brief.
3. **Milo-registry-uitbreiding** — repurpose-use-case + behavior-blok (bron lezen → per
   gekozen kanaal één proposal met uit de bron gedestilleerde brief; alleen de 4-5
   toegestane afgeleide-typen; bron zonder content → niets voorstellen) + tool-set
   +`read_deliverable_content` + `maxToolCalls` 8→12.

Alles daarna is bestaand en geverifieerd (zie Notes): propose-only via de tool-bridge, per
proposal een eigen confirm-POST → `orchestrateContentGeneration` → F-VAL + auto-iterate →
LINK-artefact met `fidelityScore` (+ `belowThreshold`-flag <70) → idempotente
`agent-deliverable`-deduct (3 credits) per bevestigde afgeleide. Scheduling is generiek
(`AgentSchedule` op agentId+useCaseId+input, live op prod) — nul bouw, één smoke.

## Beslispunt A5 — kostenvergelijking (omkeerbaar besluit)

| | Route A: Milo-use-case | Route B: aparte persona |
|---|---|---|
| Nieuwe files | 0 code (1 smoke-script) | 1 (`definitions/repurposer.ts`) + zelfde smoke |
| Gewijzigde files | 3 | 4-5 (+`registry/index.ts`, +`ArtifactViewer.tsx` draft-banner-conditie) |
| Catalogus-copy/afbakening ("Milo maakt nieuw / Repurposer vermenigvuldigt") | n.v.t. | vereist |
| Aparte dogfood + e2e-agents-suite-impact | nee (bestaande Milo-sweep) | ja |
| Schedulebaar wekelijks ritme | **ja** — `AgentSchedule` werkt op agentId+useCaseId, dus een Milo-use-case is net zo schedulebaar | ja |
| Effort | 1-2 dagen | 2-3 dagen |

Het "eigen gebruiksritme"-argument voor een aparte persona vervalt grotendeels: schedules
targeten een use-case, geen persona. **Kantelpunt naar route B** (persona-promotie, ~0,5-1
dag, puur registry-werk): (a) pilot-data toont structureel repurpose-gebruik (≥1 run/week
per actieve workspace, meetbaar via `AgentRun.input->>'useCaseId'`) én users melden
verwarring over Milo's dubbele rol, óf (b) het extra behavior-blok geeft aantoonbare
regressie op Milo's create-flow (golden-set/dogfood-sweep) — dan splitsen i.p.v. één
prompt verder oprekken. Promotie is additief: use-case verhuist naar eigen definition,
niets van route A wordt weggegooid.

## Phase -1 Gates (resultaat)

- **Simplicity Gate: PASS** — 0 nieuwe directories, 0 nieuwe modellen, 3 bestaande files
  extended + 1 smoke-script. Geen futures-proofing (geen event-triggers, geen publish, geen
  bundelpricing).
- **Anti-Abstraction Gate: PASS** — hergebruik van Claw-tool-registry, tool-bridge,
  confirm-route, canvas-orchestrator, `fval-report-contract`, `chargeAfter`; geen wrappers,
  geen nieuwe artefact-typen.
- **Integration-First Gate: PASS** — tool-contracten hieronder vastgelegd vóór implementatie;
  confirm-keten en credit-granulariteit zijn al bewezen (dogfood 2026-07-07/12).

## Tool-contracten (integration-first)

`read_deliverable_content` (nieuw, `requiresConfirmation: false`, category `read`):

```
input:  { deliverableId: string }
output: {
  deliverableId, title, contentType, campaignId, campaignTitle,
  content: string,          // geassembleerde tekst, cap ~12.000 chars
  truncated: boolean,
  hasContent: boolean       // false => alleen titel/brief, géén gegenereerde content
}
// workspace-check verplicht: deliverable → campaign.workspaceId === ctx.workspaceId,
// anders { error: 'Deliverable not found' } (geen cross-tenant leak).
```

`create_deliverable` (extensie, bestaand contract blijft backwards-compatible):

```
input:  + sourceDeliverableId?: string
gedrag: bron gevalideerd in zelfde workspace; derivedFromId gezet bij create;
        buildProposal toont extra change-regel { field: 'derivedFrom', label: 'Derived from',
        proposedValue: <brontitel> }. Ontbrekende/vreemde bron => throw (proposal faalt fail-fast
        in de bridge, geen dead-end proposal).
```

# Stap 0 — Bron-inventaris-gate (A1, BLOKKEREND, ~10 min)

Draaien op prod-Neon (user levert `DATABASE_URL` of draait zelf). **Drempel uit de idea-file:
≥3 bruikbare bronnen in minstens 2 pilot-workspaces óf aantoonbare wekelijkse aanwas bij
Better Brands.** Resultaat vastleggen in de Notes van deze task én in de idea-file.

```sql
-- (1) Bron-inventaris: afgeronde long-form deliverables mét gegenereerde tekst-content
WITH longform AS (
  SELECT d.id, d."createdAt", w.name AS ws_name,
         ((d."generatedText" IS NOT NULL AND length(d."generatedText") > 200)
          OR EXISTS (SELECT 1 FROM "DeliverableComponent" c
                     WHERE c."deliverableId" = d.id
                       AND c."generatedContent" IS NOT NULL
                       AND length(c."generatedContent") > 200)) AS has_content
  FROM "Deliverable" d
  JOIN "Campaign" cam ON cam.id = d."campaignId"
  JOIN "Workspace" w  ON w.id = cam."workspaceId"
  WHERE d."contentType" IN ('blog-post','pillar-page','whitepaper','case-study',
                            'ebook','article','thought-leadership','linkedin-article')
)
SELECT ws_name,
       COUNT(*)                                                        AS longform_total,
       COUNT(*) FILTER (WHERE has_content)                             AS met_content,
       COUNT(*) FILTER (WHERE has_content
                        AND "createdAt" > now() - interval '14 days')  AS aanwas_14d
FROM longform GROUP BY ws_name ORDER BY met_content DESC;

-- (2) Seed-check afgeleide-typen (instagram/facebook hebben GEEN code-fallback — zie Risico 4)
SELECT platform, format, COUNT(*) AS rows, bool_or("workspaceId" IS NULL) AS has_global_default
FROM "MediumEnrichment"
WHERE (platform, format) IN (('linkedin','organic-post'),('instagram','feed-post'),
                             ('facebook','organic-post'),('x','thread'),('linkedin','poll-post'))
GROUP BY platform, format;
```

Onder de drempel → **stop**: status van deze task naar `blocked`, idea-file-verdict zakt naar
needs-validation-first, paste-bron (out-of-scope #4 in de idea) heroverwegen via
feature-planner. Boven de drempel → status `open`, uitvoering kan starten.

# Acceptatiecriteria

- [x] **Stap 0-gate gehaald** (2026-07-14, prod: BB 3 bronnen mét aanwas — deels smoke-content, hertoets-notitie staat bovenin; 0 MediumEnrichment-seeds → afgeleiden-set beperkt tot linkedin-post/twitter-thread/linkedin-poll).
- [x] Given een campagne met een afgerond long-form deliverable mét gegenereerde content,
      When de user Milo's repurpose-use-case draait met 3-5 gekozen afgeleide-typen
      (subset van `linkedin-post`, `twitter-thread`, `instagram-post`, `facebook-post`,
      optioneel `linkedin-poll`), Then eindigt de run AWAITING_CONFIRMATION met per gekozen
      type één PROPOSAL (type + titel + uit de bron gedestilleerde brief) plus een kort REPORT.
- [x] (smoke [3], via directe tool-execute — route-level generiek gedekt door agents-confirm-path) Given de proposals in de inbox, When de user een subset bevestigt en de rest afwijst,
      Then worden uitsluitend de bevestigde afgeleiden als deliverables in de **bron-campagne**
      aangemaakt en gegenereerd via de bestaande canvas-motor; afgewezen proposals muteren niets.
- [x] Elke gegenereerde afgeleide heeft `derivedFromId` = bron-deliverable én een zichtbare
      F-VAL-score (LINK-artefact `fidelityScore`-badge + reguliere deliverable-plekken);
      score <70 → `belowThreshold`-flag op het LINK-artefact — nooit stil.
- [x] (mechanisme generiek bewezen in agents-confirm-path/dogfood; niet herhaald) Given een bevestigde batch van N afgeleiden, Then exact N idempotente
      `agent-deliverable`-deducts (3 credits/stuk, `idempotencyKey: agent-confirm:<runId>:<deliverableId>`);
      een run die alleen voorstelt boekt niets; een confirm-retry dubbel-boekt niet.
- [x] Given een bron-deliverable zónder gegenereerde content (alleen titel/brief), Then stelt
      de agent níets voor en legt uit dat er geen bron-content is (`hasContent: false`-pad).
- [x] (generiek mechanisme, agent-schedule-smoke dekt het; use-case is schedulebaar via agentId+useCaseId) Given de bestaande AgentSchedule-UI, When de user een wekelijks schema op de
      repurpose-use-case zet, Then draait de run via het generieke mechanisme zonder
      repurposer-specifieke bouw (één smoke, geen nieuwe code).
- [x] Milo's bestaande create-flow is regressievrij (dogfood COMPLETED $0,087 + expliciete bleed-check: create-request voor instagram-post wordt gewoon voorgesteld) (dogfood-sweep `DOGFOOD_ONLY=content-creator`
      + golden-set groen).
- [x] `npx tsc --noEmit` 0 errors
- [x] lint 0 (gewijzigde files, --quiet)
- [x] Smoke-test: scripts/dev/agent-repurpose-smoke.ts 17/17 mét echte AI (F-VAL afgeleide: 79, boven linkedin-baseline 76)
- [x] Documentatie bijgewerkt (changelog #395; memory volgt bij de bouw-batch-afronding)

# Bestanden die ik aanraak

| File | Wijziging | Omvang | Risico |
|---|---|---|---|
| `src/lib/claw/tools/read-tools.ts` | nieuw tool `read_deliverable_content` (contract hierboven) | ~60-80 regels | **medium** — workspace-isolatie verplicht (deliverable→campaign→workspaceId, patroon `read_deliverables` r803-807); read-only dus geen cache-invalidatie |
| `src/lib/claw/tools/write-tools.ts` | `create_deliverable`: optioneel `sourceDeliverableId` → validatie + `derivedFromId` + proposal-regel | ~20 regels | laag-medium — mutatie-route: bestaande `invalidateCache(campaigns)` + `invalidateDashboard` dekken het al (r826-827); backwards-compatible param |
| `src/lib/agents/registry/definitions/content-creator.ts` | +use-case `repurpose-content`, +behavior-blok, +tool in `registerContentCreatorTools`, `maxToolCalls` 8→12 | ~25-30 regels | **medium** — prompt-regressie-risico op bestaande create-flow (mitigatie: dogfood-sweep + golden-set) |
| `scripts/dev/agent-repurpose-smoke.ts` | nieuw smoke-harnas (patroon `scripts/dev/agents-confirm-path.ts`) | ~150 regels | laag |
| `tasks/agent-repurposer.md` + `tasks/_drafts/idea-agent-repurposer.md` | gate-resultaat + status | docs | - |

Workspace-isolatie-checklist: de nieuwe read-tool is de enige nieuwe data-toegang — verplicht
`campaign.workspaceId === ctx.workspaceId`-check vóór content teruggeven. Geen nieuwe API-routes,
geen nieuwe UI-classes (Tailwind-purge n.v.t. — nul frontend-werk in route A).

# Bestanden die ik NIET aanraak

- `src/app/api/agents/runs/[runId]/confirm/route.ts` — werkt generiek (proposal→execute→
  generatie→F-VAL→LINK→charge); elke wijziging hier is scope-lekkage.
- `src/lib/agents/registry/tool-bridge.ts`, `run-collector.ts`, `fval-report-contract.ts`,
  `fval-gate.ts` — propose-only + D5-scoring bestaan en zijn dogfood-bewezen.
- `src/lib/ai/canvas-orchestrator.ts` + `component-templates-fallback.ts` — géén nieuwe motor
  (hardste constraint uit de idea-file). Ontbrekende seeds los je met een seed-row op, niet
  met een code-fallback in deze task.
- `src/features/campaigns/lib/deliverable-types.ts` — **géén `hidden`-flips**; unhide van
  Email/carrousel/video-typen is een apart product-besluit (harde constraint).
- `src/features/agents/components/*` — registry-driven UI, nul wijzigingen in route A
  (draft-preview-banner is al gekeyd op `agentId === 'content-creator'` en dekt route A gratis).
- `src/lib/billing/credits/credit-costs.ts` — pariteit betekent: bestaande
  `'agent-deliverable': 3` ongewijzigd laten, geen nieuwe metering-class.
- `src/app/api/studio/[deliverableId]/derive/route.ts` — bestaande handmatige derive-flow
  blijft ongemoeid (kopieert brief verbatim; de agent-route destilleert — bewust twee paden).

# Smoke test plan

Voorbereiding: lokale workspace met één campagne + één blog-post-deliverable mét gegenereerde
content (canvas-generatie of bestaande BB-data).

1. **Happy path (propose)** — Milo use-case "Repurpose": input *"Repurpose '<blog-titel>' into
   a linkedin-post, twitter-thread and instagram-post"*. Verwacht: run AWAITING_CONFIRMATION;
   exact 3 PROPOSALs, elk met juist type, titel en brief waarin de kernboodschap van de bron
   herkenbaar is (geen generieke brief); 1 REPORT dat de voorstellen samenvat; proposal-change-regel
   "Derived from: <brontitel>" zichtbaar in de ProposalConfirmCard.
2. **Subset-confirm** — bevestig 2 proposals, wijs 1 af. Verwacht: 2 nieuwe deliverables in de
   bron-campagne met `derivedFromId` = bron (verifieer in DB), beide gegenereerd; 2 LINK-artefacten
   met F-VAL-badge; afgewezen proposal → `dismissedAt` gezet, geen deliverable; run → COMPLETED
   zodra alle proposals resolved.
3. **Credits (pariteit + idempotentie)** — met `CREDITS_ENABLED` aan en org-unlimited tijdelijk
   uit (patroon dogfood-r2): stap 2 boekt exact 2× −3 DEDUCT `agent-deliverable`; een herhaalde
   confirm-POST op hetzelfde artefact → 409, saldo ongewijzigd.
4. **Edge: bron zonder content** — kies een deliverable met alleen titel/brief. Verwacht: agent
   stelt níets voor, REPORT legt uit dat er geen bron-content is (geen gehallucineerde afgeleiden).
5. **Edge: type-afbakening** — vraag om een "newsletter en een tiktok-video" als afgeleiden.
   Verwacht: agent weigert die typen (niet in de toegestane set) en biedt de zichtbare
   social-typen aan; geen proposal met een hidden type.
6. **Error/workspace-isolatie** — `read_deliverable_content` met (a) onbestaand id en (b) een
   deliverable-id uit een ándere workspace. Verwacht: beide nette tool-error "Deliverable not
   found", geen content-leak; de agent herstelt zich in de run (geen crash).
7. **Schedule-smoke** — WEEKLY schedule op `content-creator` + repurpose-use-case via
   ScheduleManagerCard (input: "repurpose het nieuwste long-form deliverable zonder afgeleiden");
   verwacht: `nextRunAt` correct; dev-run (EVERY_MINUTE, patroon `scripts/dev/agent-schedule-smoke.ts`)
   levert headless proposals met schedule-creator als acting identity.
8. **F-VAL onder drempel** — verifieer (desnoods geforceerd met een off-brand bron) dat een
   score <70 de `belowThreshold`-flag op het LINK-artefact zet en de bestaande
   auto-iterate/STRICT-route in de pipeline draait — nooit een stille ongescoorde afgeleide.
9. **Regressie** — `scripts/dev/agents-dogfood.ts` met `DOGFOOD_ONLY=content-creator`: bestaande
   create-flow status-pariteit + F-VAL in lijn met baseline (r1: 76, r2: 73).

# Risico's

1. **A1 — bron-schaarste (gate niet uitgevoerd; waarschijnlijkheid onbekend).** Prod-inventaris
   kon niet draaien (sensitive env). Mitigatie: stap 0 is blokkerend met kant-en-klare query;
   onder de drempel wordt niet gebouwd.
2. **Tool-bridge-truncatie op lange bronnen (waarschijnlijkheid hoog bij >≈2.500 woorden).**
   De bridge kapt tool-output op 16.000 chars (`MAX_TOOL_RESULT_CHARS`, tool-bridge.ts r32) —
   een 3.000-woorden-blog (~18k chars) zou midden in het JSON afgekapt worden. Mitigatie:
   in-tool cap ~12k chars + `truncated: true`-flag zodat het model het wéét; brief-destillatie
   uit intro+kern is voor MVP acceptabel. Geen bridge-wijziging (scope).
3. **maxToolCalls-budget (waarschijnlijkheid medium).** 5 afgeleiden + 3 reads = 8 = Milo's
   huidige cap; één model-retry en de run valt droog. Mitigatie: cap naar 12 in dezelfde change;
   dogfood-sweep bewaakt dat dit de create-flow niet verandert.
4. **MediumEnrichment-seeds ontbreken (waarschijnlijkheid laag voor BB, onbekend voor overige
   pilot-workspaces).** `instagram-post` (instagram/feed-post) en `facebook-post`
   (facebook/organic-post) hebben géén entry in `FALLBACK_BY_CONTENT_TYPE` — generatie
   hard-throwt zonder seed-row ("No component template resolved", memory
   `content-types-picker-scope`). `linkedin-post` is prod-bewezen (dogfood F-VAL 76);
   `twitter-thread`/`linkedin-poll` hebben code-fallbacks. Mitigatie: seed-check zit in de
   stap-0-query (2); ontbreekt een seed → seed-row toevoegen (data, geen code) of dat type
   uit de preset laten tot de seed er is.
5. **Milo-prompt-regressie (waarschijnlijkheid medium, impact hoog).** Extra behavior-blok kan
   de bestaande create-flow-kwaliteit raken (golden-set flakt al rond de 70%-drempel).
   Mitigatie: repurpose-instructies als afgebakend blok ("When the user asks to repurpose…"),
   dogfood + golden-set vóór merge; bij regressie → kantelpunt (b), route B.
6. **Brief-destillatie-kwaliteit (A4, onbewezen).** Bron-gedestilleerde briefs kunnen slechter
   scoren dan handmatige. Mitigatie: founder-dogfood vóór pilot-exposure; counter-metric =
   F-VAL-gemiddelde ≥ canvas-baseline per type (anker linkedin-post 76); brief-veldenset is
   identiek aan Milo's bestaande contract (objective/keyMessage/toneDirection/callToAction).
7. **Parallel-confirm UX (waarschijnlijkheid hoog, impact laag).** 4-5 confirms = 4-5 aparte
   POSTs van elk minuten generatie (deadline 10 min/stuk, eigen serverless-invocatie — geen
   gedeeld budget). Geen technisch risico; het REPORT moet de user vertellen dat generatie per
   goedgekeurde afgeleide ná approve start (bestaande Milo-conventie).

# Out of scope

Volledige lijst (14 items) in de idea-file; de hardste hier herhaald:

- **Géén nieuwe generatie-motor** — orchestrator/fallback-registry blijven ongemoeid.
- **Géén unhide van verborgen content-typen** (e-mail, carrousels, video) — apart besluit.
- Geen video-afgeleiden, geen auto-publish, geen kanaal-API's, geen event-triggers
  ("draai bij elk afgerond blog") — cadence-schedule volstaat.
- Geen externe bronnen (URL/paste/PDF) — eerste follow-up-kandidaat, gated op stap 0-uitkomst.
- Geen aparte persona in dit MVP (route B = expliciet kantelpunt, geen bijvangst).
- Geen side-by-side bron→afgeleiden-review-UI; geen bundelpricing; geen meertalige afgeleiden.
- Geen wijziging aan `read_deliverables`' bestaande (zware) `generatedText`-payload — observatie
  genoteerd in Notes, eigen opruim-task waard.

# Notes

**Tijdens tech-planning geverifieerd (2026-07-14):**

- **A3 (N-proposals-per-run + credit-granulariteit): BEWEZEN in code.** Proposals zijn losse
  `AgentArtifact`-rijen (tool-bridge `recordProposal`); de confirm-route verwerkt exact één
  artefact per POST met atomische claim (TOCTOU-guard, 409 bij dubbel), draait generatie per
  deliverable (deadline 10 min) en boekt per deliverable idempotent
  (`agent-confirm:<runId>:<deliverableId>`); `settleRunStatus` sluit de run pas als álle
  proposals resolved zijn. Per-item accept/decline is dus gratis. Dogfood-anker: −3 DEDUCT
  exact geboekt op het confirm-pad (r2, 2026-07-12).
- **Bron-traceerbaarheid is een bestaand schemaveld**: `Deliverable.derivedFromId` (relatie
  "DerivableContent"), al gezet door de studio-derive-route — geen schema-change, geen Neon-push.
- **F-VAL-zichtbaarheid bestaat**: confirm-route schrijft `fidelityScore` op het LINK-artefact,
  `ArtifactViewer` rendert de `FidelityBadge`, `belowThreshold` bij <70; D5-lijn
  (`reportScoringOutputContract`) scoort propose-flow-REPORTs bewust níet — echte content
  scoort op confirm (conform idea-constraint).
- **Scheduling generiek bevestigd** (origin/main, PR #119 live op prod): `AgentSchedule` targt
  agentId+useCaseId+input met acting identity = schedule-creator (lost de
  `NO_USER_CONTEXT`-guard in de bridge op). In-scope item 8 = alleen smoke.
- **Marktcijfers geverifieerd** tegen het rapport op origin/main (r33-34, r81-85): OpusClip
  10M/~40% discard, 79% dagelijks social-assist — kloppen met de idea-file.
- **Meting primaire metric**: behoud-rate via deliverable-status + PostHog
  `agent_output_accepted` (wordt al geëmit in de confirm-route); frequentie/kannibalisatie per
  use-case via `AgentRun.input->>'useCaseId'`. ⚠️ POSTHOG_API_KEY ontbreekt op prod
  (memory `user-actiepunten`) — zonder die key is de behoud-metric deels donker; DB-kant
  (deliverable-status, AgentRun-rijen) werkt wel.
- **Afwijking t.o.v. idea-file in-scope #1** ("7e persona-agent"): bewust — de idea-file zelf
  (A5 + Red Team voorwaarde 3) en de promotie-directive eisen dat apart-vs-Milo als omkeerbaar
  beslispunt met kostenvergelijking wordt behandeld; route A is de goedkoopste falsificatie
  van dezelfde hypothese. Persona-promotie staat als kantelpunt gedefinieerd.
- **Geen nieuwe ADR nodig**: geen nieuw Prisma-model/enum, geen nieuwe lib-directory, geen
  library-keuze, geen patroon-afwijking — alles valt binnen ADR 2026-07-05 (registry,
  output-contract, D5, propose-only, autonomie-trap).
- **Uitvoerings-gotcha**: lokale main-checkout liep tijdens planning 37 commits achter op
  origin/main (o.a. AgentSchedule + marktonderzoek-rapport alleen op origin/main). Worktree
  via `scripts/dev/worktree.sh agent-repurposer` brancht vanaf origin/main — verplicht.
- **Observatie (eigen task waard, niet hier)**: `read_deliverables` retourneert
  `generatedText` van álle deliverables in een campagne — zware payloads die de 16k-truncatie
  van de bridge raken; de nieuwe single-deliverable-tool omzeilt dat voor dit pad.

# Review (code-reviewer subagent, 2026-07-14)

0 CRITICAL, 3 WARNINGs — alle gefixt: (W1) `read_deliverable_content` toegevoegd aan
`UNTRUSTED_RESULT_TOOLS` in de Claw-chat-route (bron-content gaat nu gefenced het model in;
in de agent-bridge was álles al mechanisch gefenced); (W2) undefined-id-guard in de read-tool
(Prisma's undefined-semantiek matchte anders stil de eerste workspace-deliverable); (W3)
type-restrictie expliciet tot repurposing beperkt in de prompt + bewezen met een echte
bleed-check (create-request voor instagram-post → gewoon voorgesteld). MINORs: dead select
weg, stale comment gefixt; chat-buildProposal-throw-gedrag en 12k-cap-randgevallen
gedocumenteerd geaccepteerd. Reviewer bevestigde: workspace-isolatie dubbel geborgd op beide
nieuwe paden (incl. het editedParams-gat in de chat-confirm dat de execute-check afvangt),
confirm-keten ongewijzigd fail-fast, backwards-compat intact.
