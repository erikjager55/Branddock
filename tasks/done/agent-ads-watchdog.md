---
id: agent-ads-watchdog
title: Ads-waakhond — propose-only agent voor creative-fatigue op gekoppelde Meta-accounts
fase: launch
priority: later
effort: "Fase 0: ~1 dag (validatie, geen code) · bouw na go: 7-11 dagen"
owner: claude-code
status: done
created: 2026-07-14
completed: 2026-07-14
related-adr: docs/adr/2026-07-14-ads-watchdog-datamodel.md
related-spec: tasks/_drafts/idea-agent-ads-watchdog.md
worktree: branddock-agent-ads-watchdog (alleen voor Fase 1+; Fase 0 is validatie zonder code)
---

> ⚠️ **GATE — Fase 0 is een go/no-go, geen formaliteit.** Discovery-verdict was `needs-validation-first`; de user heeft bewust gekozen voor promoveren mét de validatie-sprint als expliciete Fase 0. **Geen regel productie-code vóór een gedocumenteerde GO in de Notes-sectie.** Bij no-go: task → `blocked` of afvoeren, kosten blijven ~1 dag. Timing blijft tweede ring: ná launch, gegate op Fase-1-agents-adoptie in de pilot.

# Probleem

MKB-adverteerders met Meta Advantage+-campagnes zien performance verslechteren (frequency loopt op, CTR zakt, dezelfde creative draait wekenlang) zonder signaal of aanknopingspunt — Advantage+ is een black box. Branddock heeft de measurement-foundation al liggen (`AdMetricSnapshot`, bewust vooruit-gebouwd in `docs/specs/ad-publishing.md` §Fase C), maar die table heeft **nul writers in `src/`** en `AdCampaign` vereist een `deliverableId`, waardoor externe (niet-via-Branddock-gepubliceerde) campagnes onzichtbaar zijn. Zonder een read-side over het héle gekoppelde account bewaakt elke waakhond een lege tuin — en dat is precies waar de doelgroep leeft.

# Voorstel

Een 7e persona-agent (propose-only, DAILY schedule) die drie creative-gezondheid-signalen bewaakt — frequency-drempel, CTR-trend-daling, creative-leeftijd — en per signaal een REPORT + PROPOSAL (refresh-richting) in de agents-inbox zet. Confirm levert een on-brand refresh-creative als deliverable ín Branddock via het bestaande `create_deliverable`-confirm-pad (`src/app/api/agents/runs/[runId]/confirm/route.ts` draait al `orchestrateContentGeneration` + credits-charge — dit pad wordt integraal hergebruikt, geen nieuwe confirm-logica). De agent schrijft **nooit** iets naar Meta — product-invariant, statisch verifieerbaar doordat de nieuwe insights-client uitsluitend GET-calls bevat.

Vier fases, strikt sequentieel:

- **Fase 0 — Validatie-sprint (go/no-go, ~1 dag, geen code)**
  1. Tel `ConnectedAdAccount`-rijen op prod (Neon-query): hoeveel, welke status, welke scopes gegrant?
  2. Vraag Better Brands (en evt. pilot-leads): draaien ze een Meta-account met actieve Advantage+-campagnes en willen ze koppelen? Plus A3-vraag: "als iets je zou vertellen dat je ad moe is, wat zou je dan willen krijgen?"
  3. Eén handmatige Graph-API-insights-pull (Graph API Explorer, bestaand token) op een echt Advantage+-account: documenteer per signaal (frequency, CTR-trend, creative-`created_time`) welk veld op welk niveau (account/campaign/adset/ad) daadwerkelijk beschikbaar is → **veldmapping-notitie in Notes** (dit is het API-contract waarop Fase 1 pegt).
  4. Verifieer Meta app-review-status voor `ads_read`/`ads_management` op de productie-app (A4) — scopes zitten al in `META_OAUTH_SCOPES` (`src/lib/ad-providers/meta/config.ts:9-15`), maar development-mode vs approved bepaalt of niet-eigen accounts kunnen koppelen.
  5. Leg go/no-go vast in Notes. GO-criteria (uit idea-file): ≥1 echt koppelbaar account + ≥2 van 3 signalen aantoonbaar uit de API + één positief klantsignaal op de A3-vraag.
  - N.B.: item "commit marktonderzoek-rapport" uit de idea-file is **al vervuld** — `docs/reports/agents-marktonderzoek-en-uitbreidingsadvies-2026-07-14.md` staat op origin/main (PR #128).

- **ADR (0,5 dag, ná Fase 0)** — roep `adr-create` aan. Vast te leggen: (a) discovered-campaign-representatie: `AdCampaign.deliverableId` → nullable + `origin`-discriminator (`'branddock' | 'external'`) i.p.v. een parallel model, zodat `AdMetricSnapshot` en zijn FK ongewijzigd blijven; (b) sync-grain: 1 `AdCampaign`-rij per actieve externe ad (consistent met bestaande grain "één row per gepubliceerd creative"); (c) snapshot-cadence (dagelijks) + retentie; (d) propose-only-invariant + weekplafond als product-regel.

- **Fase 1 — Read-side: campagne-discovery + insights-sync (3-4 dagen, grootste kosten-driver, eigen fase)**
  Schema-change + Meta-insights-client + dagelijkse sync-job die `AdMetricSnapshot` zijn eerste writer geeft. Patroon: `src/lib/jobs/sync-ad-campaign-status.ts` (token-decrypt via `src/lib/ad-tokens/encryption.ts`, 401 → account `expired`, fail-soft per account). Discovery upsert't externe actieve ads als `AdCampaign { origin: 'external', deliverableId: null }`; snapshots upserten op de bestaande unique `[campaignId, windowStart, windowEnd]` (idempotent bij dubbele cron-tick). **Regressie-plicht**: bestaande `syncAdCampaignStatus` selecteert op `status in ('publishing','active')` en zou discovered rows elke 5 min gaan pollen — `origin: 'branddock'`-filter toevoegen. Neon-gotcha: schema-delta handmatig `prisma db push` naar prod vóór deploy (`neon-schema-push-on-deploy`).

- **Fase 2 — Signaal-berekening (1-2 dagen)**
  Pure functies (input: snapshot-reeks + campagne-metadata; output: getypeerde signalen) — geen API-afhankelijkheid, TDD-vriendelijk, drempels als constants (startwaarden: frequency > 3,5 · CTR −25% over 14 dagen · zelfde creative > 45 dagen; kalibratie op Fase-0-data). Weekplafond hier: vóór PROPOSAL-creatie een count op `AgentArtifact` (type PROPOSAL, run.agentId `ads-watchdog`, laatste 7 dagen, workspace-scoped) — boven de cap (voorstel: 3/week) bundelen in één artefact i.p.v. extra melden. Geen nieuw model nodig.

- **Fase 3 — 7e agent + confirm-pad + lege staat (2-3 dagen)**
  Agent-definitie naar het patroon `src/lib/agents/registry/definitions/market-analyst.ts` (persona, read-tools, `outputContract: artifactOutputContract`), registratie in `src/lib/agents/registry/index.ts`, `AgentId`-union +1, featureKey `agent-ads-watchdog` in `feature-models.ts`. DAILY schedule via de **bestaande** `ScheduleManagerCard` + `AgentSchedule` (cadence `'DAILY'` bestaat al) — geen nieuwe schedule-UI. Run-notificatie via bestaand `notify-run-finished.ts`. Refresh-voorstel = `create_deliverable`-proposal → bestaand confirm-pad (cache-prefixes al gemapt in `TOOL_CACHE_PREFIXES`). Lege staat: hard-coded guard (±10 regels, geen abstractie) in run- en schedule-create-route — `agentId === 'ads-watchdog'` zonder actieve `ConnectedAdAccount` → 400; `AgentDetailPage` toont uitleg + koppel-CTA naar `settings/integrations/ad-accounts` (bestaande shared `Button`/EmptyState-primitives, geen nieuwe Tailwind-classes).

# Acceptatiecriteria

- [x] **Fase 0 afgerond en gedocumenteerd in Notes** (2026-07-14): prod-telling, BB-koppeling, veldmapping, app-review-status pragmatisch beantwoord, expliciete **GO**.
- [x] ADR geschreven en gecommit vóór enige schema-wijziging (`docs/adr/2026-07-14-ads-watchdog-datamodel.md`, PR #135).
- [x] Volledig bewezen: Fase-1-sync (smoke 11/11, echte Graph API) én de REPORT-helft (Fase-3-smoke: Ada-run op fixture-data → NL-rapport met per ad frequency/CTR-trend/leeftijd mét meetwaarden vs drempels; gezonde workspace → expliciet "geen signalen"-gedrag in prompt geborgd).
- [x] Bewezen (smoke): vermoeide fixture-ad (3 signalen) → run AWAITING_CONFIRMATION met create_deliverable-PROPOSAL waarvan de brief de signalen + refresh-richting benoemt; notificatie via bestaand notify-run-finished-kanaal (generiek, Fase-2-infra).
- [x] Confirm-pad bewezen (smoke): proposal → deliverable (facebook-post) → echte canvas-generatie draait. ⚠️ Credits-afwijking gedocumenteerd: de agent is niet-billable (monitoring gratis, consistent met Dana/Remi/Iris) en de confirm-charge is op `billable` gegate → de refresh-creative boekt tijdens de pilot 0 credits. Bekend credit-model-punt, zelfde klasse als het structured-variant-pad — melden bij credit-model-herziening, niet hier fixen.
- [x] GET-only statisch geverifieerd (insights.ts uitsluitend graphGet; review-check Fase 1) — er bestaat geen code-pad van agent naar Meta-writes.
- [x] Lege staat: koppel-CTA-banner op AgentDetailPage (i18n en/nl), 400-guards in run- én schedule-route (code; browser-verificatie bij prod-deploy), en het scheduled-pad (bestaande schedules) levert een eerlijke koppel-uitleg-REPORT (smoke, WRA-workspace).
- [x] Weekplafond bewezen (smoke): budget kunstmatig op de cap → run COMPLETED met 0 nieuwe proposals en het signaal gebundeld in het rapport; read_ad_signals levert het budget hard aan het model.
- [x] Bestaande `sync-ad-campaigns`-cron raakt discovered rows niet aan — origin-guard, smoke-bewezen (lastStatusSyncAt blijft NULL).
- [x] Sync-job invalideert `adAccounts`+`adCampaigns` per geraakte workspace; reads workspace-gescoped via de FK-keten (smoke-check isolatie groen).
- [x] `npx tsc --noEmit` 0 errors
- [x] `npm run lint` 0 errors op alle geraakte files
- [x] Smoke-tests: Fase 1 `ads-insights-sync-smoke.ts` 11/11 · Fase 2+3 `agent-ads-watchdog-smoke.ts` **27/27** (unit-signalen, fixture-scan, 3 echte Ada-runs, confirm→canvas-generatie, weekplafond, lege workspace)
- [x] Changelog #399 (Fase 1) + #400 (Fase 2+3); ad-publishing-spec-verwijzing bijgewerkt

# Bestanden die ik aanraak

> **Review Fase 2+3 (2026-07-14)**: 0 CRITICAL, 4 WARNINGs — W1 (memory-proposals aten het refresh-budget op → JSON-path-filter op create_deliverable), W2 (expired-account-staleness → account-status-filter + lastSnapshotAt in flagged), W3 (rij-caps: tabel ≤ MAX_TABLE_ROWS, flagged top-20) gefixt; W4 (weekplafond prompt-only) **bewust geaccepteerd voor de pilot** — zelfde patroon als Iris' max-3, budget hard in het tool-result, propose-only + confirm-frictie als vangnet; harde tool-wrap is de eerste hardening als Ada drift vertoont. MINORs gefixt: frequency-inflatie bij null-reach, CTR-epsilon-vloer, reconnect-nuance in foutmelding/banner. Bewuste restjes: schedule-PATCH-re-enable omzeilt de POST-guard (consistent met het eerlijke-report-pad voor bestaande schedules).
>
> **Fase 2+3 (2026-07-14): GEBOUWD** — persona **Ada** (Gauge), 9e agent. Signalen als pure functies (`ads-watchdog/signals.ts`), read-tools op de data-analyst-conventie (`tools.ts`: read_ad_signals met weekbudget + TABLE-artefact, read_ad_account_status), refresh via bestaand `create_deliverable`-confirm-pad (contentType facebook-post — canvas-fallback werkt, smoke-bewezen), 400-guards + koppel-CTA. Resterend ná deploy: prod-cron-tick-verificatie (05:30 UTC) + scheduled-e2e op prod (smoke-stap 9) + drempel-kalibratie op 2 weken echte snapshots.
>
> **Fase-1-status (2026-07-14): GEBOUWD + GEREVIEWD** — smoke `scripts/dev/ads-insights-sync-smoke.ts` 11/11 (echte Graph API; het verlopen van het eerste token bewees en passant het 401→expired-pad live). Review: 0 CRITICAL, 5 WARNINGs — **alle 5 gefixt vóór merge**: (W1) origin-filter op de twee bestaande `_count`-queries (ad-accounts-UI + disconnect-waarschuwing telden anders discovered ads mee), (W2) `@@unique([connectedAccountId, externalAdId])` + echte upsert (dubbele-tick-race), (W3) cursor-paginatie via graphGet i.p.v. `paging.next` raw volgen (appsecret_proof + MetaApiError-semantiek op élke pagina), (W4) verdwenen external rijen → status `paused` (anders vuurt Fase 2 op dode ads), (W5) snapshot-staart voor net-gepauzeerde ads. MINORs: TZ-aanname gedocumenteerd (windowStart = date_start als UTC-middernacht; key stabiel), `AD_CAMPAIGN_ORIGIN`-const i.p.v. magic strings, dode guard weg. Schaal-note (bewust later): insights-paginatie ongecapt + seriële upserts — bij >200 ads/account batching overwegen. Neon `prisma db push` + prod-cron-verificatie bij de merge. Fase 2 (signalen) + Fase 3 (agent) zijn de volgende bouwcycli.

**Fase 1 — read-side** (~7 files):
- `prisma/schema.prisma` — extend `AdCampaign`: `deliverableId String?` + relatie `Deliverable?`, nieuw `origin String @default("branddock")`, evt. `externalName String?` + `creativeCreatedAt DateTime?` (afhankelijk van Fase-0-veldmapping); ~15 regels; **risico hoog** (nullable-ripple + Neon-push)
- `src/lib/ad-providers/meta/insights.ts` — **nieuw**: `fetchActiveAds` (discovery, `level=ad`, incl. creative-`created_time`) + `fetchAdInsights` via bestaande `graphGet`-wrapper uit `client.ts`; alleen GET; ~120-180 regels; risico medium
- `src/lib/ad-providers/meta/types.ts` — extend: insights-response-types; ~40 regels; risico laag
- `src/lib/ad-providers/meta/index.ts` — exports; ~5 regels; risico laag
- `src/lib/jobs/sync-ad-insights.ts` — **nieuw**: discovery-upsert + snapshot-upsert per actieve `ConnectedAdAccount` (platform `meta`, status `active`), fail-soft per account, cache-invalidation per workspace; ~150-200 regels; **risico hoog** (kosten-driver, rate-limits)
- `src/lib/jobs/sync-ad-campaign-status.ts` — `origin: 'branddock'`-filter in de where-clause; ~2 regels; risico laag (maar regressie-gevoelig)
- `src/app/api/cron/sync-ad-insights/route.ts` — **nieuw**, patroon bestaande cron-routes (CRON_SECRET-guard); ~40 regels; risico laag
- `vercel.json` — cron-entry (dagelijks, bv. `30 5 * * *`); ~4 regels; risico laag
- `src/app/api/ad-publish/meta/route.ts` — alleen indien tsc de nullable relatie flagt (enige andere `adCampaign`-consumer); ~5 regels; risico laag

**Fase 2 — signalen** (~2 files, nieuwe directory #1):
- `src/lib/agents/registry/ads-watchdog/signals.ts` — **nieuw**: pure signaal-functies + drempel-constants + weekplafond-check; ~150 regels; risico medium
- `src/lib/agents/registry/ads-watchdog/tools.ts` — **nieuw**: read-tools (`read_ad_signals`, `read_ad_account_status`) volgens de `data-analyst`-subdirectory-conventie + `run-collector`; workspace-filter via `ConnectedAdAccount`; ~120 regels; risico medium

**Fase 3 — agent + UI** (~7 files):
- `src/lib/agents/registry/definitions/ads-watchdog.ts` — **nieuw**, patroon `market-analyst.ts`; ~70 regels; risico laag
- `src/lib/agents/registry/types.ts` — `AgentId`-union +1; 1 regel; risico laag
- `src/lib/agents/registry/index.ts` — bootstrap-registratie + tool-registratie; ~5 regels; risico laag
- `src/lib/ai/feature-models.ts` (+ `.server.ts` indien gespiegeld) — key `agent-ads-watchdog`; ~10 regels; risico laag
- `src/app/api/agents/run/route.ts` + `src/app/api/agents/schedules/route.ts` — hard-coded no-account-guard (400) voor deze agent; ~10 regels elk; risico laag
- `src/features/agents/components/AgentDetailPage.tsx` — lege-staat: koppel-CTA (shared Button, link naar ad-accounts-settings); ~30 regels; risico laag
- `src/features/agents/components/AgentIcon.tsx` — Lucide-icon-mapping (bv. `Radar`); ~2 regels; risico laag

**Workspace-isolatie per mutatie-punt**: sync-job schrijft via `ConnectedAdAccount → AdCampaign → AdMetricSnapshot` (isolatie erft via FK-keten) + `invalidateCache(adAccounts/adCampaigns)`; agent-tools filteren altijd op `workspaceId` via het account; confirm-/schedule-routes hebben bestaande `requireWorkspaceRole` + invalidatie.
**Tailwind-check**: geen nieuwe utility-classes — koppel-CTA gebruikt shared `Button` (`bg-primary` CSS-var, purge-veilig) en bestaande EmptyState-patronen.

# Bestanden die ik NIET aanraak

- `src/lib/brandclaw/orchestrator/agent-loop.ts` — de loop is af; deze agent is een consumer. Loop-wijziging nodig = stop-and-ask.
- `src/app/api/agents/runs/[runId]/confirm/route.ts` — het confirm-pad wordt hergebruikt via `create_deliverable`; als hier tóch een wijziging nodig blijkt = stop-and-ask (confirm-semantiek-drift-risico).
- `src/lib/ad-providers/meta/publish.ts` en `src/app/api/ad-publish/**` (behalve evt. tsc-fix) — publish-side is out-of-scope; de waakhond pusht niets.
- `src/lib/agents/registry/pipeline-tools.ts` — geen nieuwe pipeline-as-tool; refresh-generatie loopt via confirm.
- `src/lib/billing/**` — bestaand `chargeAfter`/`agent-deliverable`-pad volstaat; monitoring-runs zijn gratis (geen `billable: true` op de definitie).
- Geen dashboard-/grafiek-componenten, geen nieuwe pagina in de App.tsx-switch — signalen zijn agent-artefacten in de bestaande inbox.
- `AdMetricSnapshot`-schema zelf — structuur is bewust vooruit-gebouwd en blijft ongewijzigd; alleen vullen.

# Smoke test plan

1. **Happy path sync (Fase 1)**: koppel een echt Meta-account (BB of eigen), trigger `sync-ad-insights` handmatig (cron-route met CRON_SECRET) → `AdCampaign`-rijen met `origin: 'external'` voor elke actieve externe ad + `AdMetricSnapshot`-rijen met gevulde `impressions/ctr/raw`. Draai 2× direct achter elkaar → geen duplicaat-snapshots (unique `[campaignId, windowStart, windowEnd]`).
2. **Regressie status-sync**: laat de bestaande `sync-ad-campaigns`-cron een cycle draaien → discovered rows onaangeroerd (`lastStatusSyncAt` blijft NULL), Branddock-rows gedragen zich als voorheen.
3. **Happy path agent**: handmatige waakhond-run op de gesyncte data → altijd een REPORT (ook "geen signalen"); met een fixture-snapshot boven een drempel → PROPOSAL + in-app-notificatie bij run-afronding.
4. **Confirm-pad**: bevestig de PROPOSAL → deliverable aangemaakt, `orchestrateContentGeneration` levert on-brand copy+beeld, ledger toont exact één `agent-deliverable`-charge; grep/log-verificatie dat er in de hele flow geen enkele niet-GET-call naar `graph.facebook.com` is gedaan.
5. **Lege staat (edge)**: workspace zonder gekoppeld account → AgentDetailPage toont koppel-CTA; POST run/schedule voor deze agent → 400; geen runs, geen notificaties.
6. **Weekplafond (edge)**: fixture met >cap signalen in één week → bundeling in één artefact, geen extra notificaties boven de cap.
7. **Error-state**: zet account-token op `expired` (of trek in via Meta) → sync markeert account, volgende run rapporteert eerlijk "kan account niet lezen — herkoppel" zonder crash of retry-storm.
8. **Workspace-isolatie (multi-tenant)**: tweede workspace zonder account → GET agents-runs/artifacts toont níets van workspace 1; DB-check dat snapshots alleen via workspace-1-account bereikbaar zijn.
9. **Scheduled e2e (prod-verificatie)**: DAILY schedule aanmaken → cron-tick → headless run → artefact + notificatie, `nextRunAt` verspringt (zelfde bewijs als agents-scheduling-smoke).

# Risico's

- **Fase-0 no-go (A1/A2)** — waarschijnlijkheid reëel (0 gekoppelde accounts vermoed, Advantage+-granulariteit onbewezen). Mitigatie: Fase 0 is een harde gate; sunk cost bij no-go ≈ 1 dag; verdict wordt vastgelegd zodat het idee niet blijft rondzingen.
- **Nullable `deliverableId`-ripple** — bestaande code verwacht een verplichte relatie. Waarschijnlijkheid medium, impact medium. Mitigatie: consumer-surface is klein (alleen `ad-publish/meta/route.ts` + status-sync-job, geverifieerd via grep); tsc flagt de rest; `origin`-filter voorkomt dat de 5-min-status-sync discovered rows gaat pollen (rate-limit-druk).
- **Advantage+ rapporteert te grof (A2)** — frequency/CTR mogelijk alleen zinvol op campagne-niveau, creative-leeftijd vergt ad-level `created_time`. Mitigatie: Fase-0-veldmapping bepaalt het niveau vóór de schema-write; signalen zijn pure functies, niveau-switch is goedkoop.
- **Meta rate-limits bij accounts met veel ads** — N insights-calls per account per dag. Mitigatie: één `level=ad`-insights-call per account (Graph API aggregeert), dagelijkse cadence, fail-soft per account met voortgang-logging; geen real-time ambitie.
- **Meta app-review niet rond (A4)** — `ads_read` op de prod-app mogelijk alleen in development-mode → alleen eigen/BB-business-accounts koppelen. Mitigatie: Fase-0-check; pilot kan op development-mode draaien, app-review is een user-actie met doorlooptijd (vroeg starten indien GO).
- **Alert-moeheid (counter-metric)** — mitigatie: weekplafond hard in `signals.ts` (voorstel 3 PROPOSALs/workspace/week, bundeling daarboven), REPORT "geen signalen" genereert wél een run maar is DAILY-schedule-opt-in door de user zelf.
- **Token-verval tijdens monitoring** — gedekt door bestaande `refresh-ad-tokens`-cron; geen nieuw werk, wel smoke-stap 7.

# Out of scope

- Push van de refresh-creative naar Meta (zelfs PAUSED) — v1 eindigt bij het artefact in Branddock.
- Budget-/bid-voorstellen in welke vorm dan ook (ook niet als REPORT-tekst — prompt-instructie in de definitie).
- Autonoom of voorgesteld pauzeren/activeren van ads; geen auto-confirm, geen batch-confirm-all.
- Google Ads / PMax, LinkedIn — Meta-only v1; geen platform-branches voorbereiden in de nieuwe code.
- Performance-dashboard, grafieken, trend-UI — geen nieuw scherm, geen App.tsx-case.
- Brand-fidelity ↔ performance-correlatie (Fase C-droom) — eigen initiatief later.
- A/B-orkestratie, multi-variant refresh-batches, conversie-attributie/ROAS, audience-voorstellen, real-time webhooks.
- Nieuwe OAuth-scopes.

# Notes

> **RESTEREND NÁ DEPLOY (geen bouwwerk — daarom done, precedent Iris #397)**:
> (1) eerste prod-cron-tick 05:30 UTC verifiëren (`AdMetricSnapshot`-rijen op Neon);
> (2) scheduled-e2e op prod (smoke-stap 9: DAILY-schedule → cron → run+notificatie) — valt samen met Eriks pilot-adoptie (Ada-schedule aanmaken);
> (3) drempel-kalibratie ~2026-07-28 op 2 weken echte snapshots (frequency 3,5 · CTR −25% · leeftijd 45d zijn idea-file-hypotheses).

- **Fase-0-resultaten**:
  - **2026-07-14, item 1 (prod-telling)**: `ConnectedAdAccount` = **0 rijen** (0 active) — herbevestigd (eerdere telling bij planning idem).
  - **2026-07-14, bijvangst infra**: **`META_APP_ID`/`META_APP_SECRET` ontbreken volledig op Vercel-prod** — een Meta-account kóppelen kan op productie dus überhaupt nog niet. Dit is een voorwaarde vóór item 3 (insights-pull) en item 4 (app-review-check): Erik moet eerst de Meta-app-credentials op prod zetten (en de app in het Meta-dashboard hebben).
  - **2026-07-14, items 1-4 grotendeels afgerond** (Erik + Claude, stap-voor-stap-sessie):
    - **Meta-app "Branddock" aangemaakt** (App ID 2087286845540129, development-mode, Business-type, use-cases "Create & manage ads" + "Measure ad performance"), redirect-URI geregistreerd, `META_APP_ID`/`META_APP_SECRET` op Vercel-prod (secret na een plak-verwisseling geroteerd en opnieuw gezet — het oude secret heeft kort als client_id in OAuth-URLs gestaan).
    - **Item 2 ✅ GEKOPPELD**: `ConnectedAdAccount` rij aanwezig — "better brands" (`act_764986273365908`), workspace BB-prod, status active, long-lived token t/m 2026-09-12, alle 5 scopes. Koppel-bereidheid daarmee feitelijk beantwoord.
    - **Item 3 ✅ VELDMAPPING** (handmatige read-only Graph-API-pull v20.0, 2 actieve ads, echte spend):
      | signaal | veld | niveau | granulariteit |
      |---|---|---|---|
      | frequency | `insights.frequency` | **ad** | per dag (`time_increment=1`) |
      | CTR-trend | `insights.ctr` | **ad** | per dag |
      | creative-leeftijd | `ad.created_time` (+ `campaign.created_time`) | ad | — |
      Alle drie op ad-niveau — de fijnste granulariteit; campagne-niveau werkt ook (fallback). NB: campagnes zijn reguliere OUTCOME_TRAFFIC/OUTCOME_ENGAGEMENT (geen Advantage+) — signalen identiek; drempel-startwaarden blijven bruikbaar. Discovery-velden voor Fase 1 bevestigd: `id,name,effective_status,created_time,creative{id},campaign{id,name,objective},adset{id,name}`.
    - **Item 4 ✅ pragmatisch beantwoord**: development-mode volstaat voor de pilot — OAuth-koppeling én insights-reads werken op het eigen Business-account (bewezen). App-review (`ads_read` approved) is pas nodig voor accounts van externe klanten → aparte user-actie met doorlooptijd, niet blocking voor Fase 1.
    - **UI-bug bijvangst**: de "Connect Meta"-knop op `/settings/integrations/ad-accounts` is onzichtbaar (Tailwind-4-purge: `bg-emerald-600` niet in de gecompileerde CSS) én de pagina is nergens gelinkt vanuit de Integrations-tab — beide fixen bij Fase 1.
  - **GO/NO-GO: ✅ GO (2026-07-14, besloten door Erik + Claude)** — alle drie criteria gehaald: (1) account gekoppeld en werkend; (2) 3/3 signalen uit de API op ad-niveau; (3) A3-antwoord van Erik: **(c) "direct een voorstel voor een vers, on-brand creative dat je kunt bevestigen"** — het sterkste signaal, valideert exact de propose→confirm→create_deliverable-kern van het ontwerp. Fase 1 (metrics-sync) gestart; ADR: `docs/adr/2026-07-14-ads-watchdog-datamodel.md`.
- Premisse-verificatie bij tech-planning (2026-07-14, tegen origin/main): `AgentSchedule` bestaat (schema r5423, cadence `DAILY`), `agents-scheduling` is done (#390), marktonderzoek-rapport gecommit (PR #128), `AdMetricSnapshot` heeft nul writers in `src/` (grep-bevestigd), `ads_read` in `META_OAUTH_SCOPES` bevestigd. Let op: lokale `main` liep bij planning achter op origin/main — worktree vanaf `origin/main` spinnen (dat doet `scripts/dev/worktree.sh` al).
- Drempel-startwaarden (frequency 3,5 / CTR −25%/14d / creative 45d) zijn hypotheses uit de idea-file — kalibreren op de Fase-0-pull en de eerste 2 weken echte snapshots.
- Weekplafond-cap (voorstel 3) is een product-beslissing — bevestigen bij ADR.
- Fase 0 vereist geen worktree (geen code); Fase 1+ in `branddock-agent-ads-watchdog` via `scripts/dev/worktree.sh agent-ads-watchdog`.
