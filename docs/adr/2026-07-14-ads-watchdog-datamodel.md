---
id: 2026-07-14-ads-watchdog-datamodel
title: Ads-watchdog datamodel — externe ad-discovery op AdCampaign met origin-discriminator + dagelijkse ad-level AdMetricSnapshot-sync
status: accepted
date: 2026-07-14
supersedes: -
superseded-by: -
---

# Context

De ads-watchdog-agent (task `agent-ads-watchdog`, GO op Fase 0 d.d. 2026-07-14) bewaakt creative-gezondheid op gekoppelde Meta-accounts: frequency-drempel, CTR-trend-daling en creative-leeftijd, met per signaal een propose-only refresh-voorstel. De measurement-foundation ligt er al (`AdMetricSnapshot`, bewust vooruit-gebouwd in Fase B / ADR `2026-05-22-ad-publishing-integration`), maar:

- `AdMetricSnapshot` heeft **nul writers** in `src/` — de tabel is leeg.
- `AdCampaign` vereist een `deliverableId`, waardoor alleen via-Branddock-gepubliceerde ads representeerbaar zijn. De doelgroep (MKB met bestaande Meta-campagnes) leeft juist in **extern aangemaakte** campagnes — zonder discovery bewaakt de waakhond een lege tuin.
- De Fase-0-veldmapping (handmatige read-only Graph-API-pull op het gekoppelde BB-account, v20.0) bewees: **alle drie de signalen zijn op ad-niveau beschikbaar** — `insights.frequency` en `insights.ctr` per dag (`time_increment=1`), creative-leeftijd via `ad.created_time`. Campagne-niveau werkt als fallback.

# Decision

1. **Geen parallel model — `AdCampaign` wordt de drager van discovered ads.** `AdCampaign.deliverableId` wordt nullable en er komt een `origin`-discriminator (`String @default("branddock")`, waarden `'branddock' | 'external'`). `AdMetricSnapshot` en zijn FK-keten blijven ongewijzigd; alle bestaande workspace-isolatie (via `ConnectedAdAccount.workspaceId`) blijft gelden.
2. **Sync-grain: één `AdCampaign`-rij per actieve externe ad** — consistent met de bestaande grain ("één rij per gepubliceerd creative"). Discovery-velden: `externalName` + `creativeCreatedAt` (uit `ad.created_time`, Fase-0-bewezen) naast de bestaande external-ID-kolommen.
3. **Snapshot-cadence: dagelijks, op ad-niveau.** Eén insights-call per account per dag (`level=ad`, Graph API aggregeert); upsert op de bestaande unique `[campaignId, windowStart, windowEnd]` (idempotent bij dubbele cron-tick). Retentie: geen actieve pruning pre-launch (volumes zijn klein); herzien bij schaal.
4. **Propose-only als product-invariant, statisch verifieerbaar**: de nieuwe insights-client (`src/lib/ad-providers/meta/insights.ts`) bevat uitsluitend GET-calls — de waakhond schrijft nooit iets naar Meta. Refresh-creatie loopt integraal over het bestaande `create_deliverable`-confirm-pad (credits uitsluitend dáár).
5. **Weekplafond als product-regel**: max 3 PROPOSALs per workspace per week; extra signalen worden gebundeld in één artefact in plaats van extra gemeld (anti-alert-moeheid, de gevalideerde counter-metric).
6. **Regressie-guard**: de bestaande 5-min `sync-ad-campaign-status`-cron krijgt een `origin: 'branddock'`-filter zodat discovered rows niet in de status-polling belanden (rate-limit-druk + betekenisloze statussync voor externe ads).

# Y-statement

In de context van **een ads-watchdog die het hele gekoppelde account moet kunnen lezen terwijl het bestaande datamodel alleen Branddock-gepubliceerde ads kent**, facing **het risico van een parallel datamodel dat de snapshot-FK-keten dupliceert of een sync die de bestaande publish-side verstoort**, I decided **discovered ads als `AdCampaign`-rijen met `origin`-discriminator en nullable `deliverableId` te representeren, met een dagelijkse ad-level insights-sync als eerste writer van `AdMetricSnapshot`**, to achieve **hergebruik van de complete bestaande keten (snapshots, workspace-isolatie, token-encryptie, cron-infra) met minimale schema-impact**, accepting tradeoff **een nullable-ripple op de kleine `deliverableId`-consumer-surface en een discriminator-kolom die elke toekomstige `AdCampaign`-query bewust moet meenemen**.

# Consequences

- Positief: `AdMetricSnapshot` krijgt zijn eerste writer zonder schema-wijziging aan die tabel; de agent-tools (Fase 2/3) lezen één uniform model; Branddock-published en externe ads zijn in de toekomst in één overzicht te tonen.
- Negatief: consumers van `AdCampaign.deliverableId` moeten nullable aankunnen (geverifieerde surface: `ad-publish/meta/route.ts` + status-sync-job; tsc flagt de rest); vergeten `origin`-filter in nieuwe queries is een sluipend risico — conventie: elke nieuwe `AdCampaign`-query benoemt expliciet welke origin hij bedoelt.
- Schema-change ⇒ handmatige Neon `prisma db push` vóór prod-deploy (gotcha `neon-schema-push-on-deploy`).

# Alternatives considered

- **Parallel model `ExternalAdCampaign`**: houdt het bestaande model onaangeroerd, maar dupliceert de snapshot-FK-keten (tweede snapshot-tabel of polymorfe FK), splijt de agent-read-side in twee paden en levert niets op dat de discriminator niet ook levert. Verworpen.
- **Account-level aggregatie i.p.v. ad-level rijen**: minder rijen, maar Fase 0 bewees dat ad-niveau beschikbaar is én creative-leeftijd/fatigue per definitie per creative leven; aggregatie zou signaal 3 onmogelijk maken. Verworpen.
- **Realtime/webhook-sync**: geen realtime-ambitie (idea-file out-of-scope); dagelijkse cadence matcht de beslissnelheid van fatigue-signalen en houdt rate-limit-druk verwaarloosbaar. Verworpen.

# Notes

- Fase-0-veldmapping en GO-besluit (incl. A3-antwoord "(c) direct een on-brand refresh-voorstel ter bevestiging"): `tasks/agent-ads-watchdog.md` §Notes.
- Drempel-startwaarden (frequency 3,5 · CTR −25%/14d · creative 45d) blijven hypotheses — kalibratie op de eerste 2 weken echte snapshots (Fase 2).
- App-review (`ads_read` approved) is pas nodig voor accounts van externe klanten; de pilot draait op development-mode (Fase-0-bewezen).
