# strategy-ui-metering — kalibratie: wizard-launch metert de strategy-chain

- **Status**: done
- **Datum**: 2026-07-18
- **Aanleiding**: openstaand kalibratiepunt sinds de publieke API (P3-lijn): de API-job (`strategy-generation-job.ts`) boekt 80cr (`long-form`) voor de volledige campaign-strategy-chain, de UI-wizard boekte 0 voor hetzelfde werk. Eriks opdracht 2026-07-18: "de strategy-chain-ui calibratie moet nog uitgevoerd worden".
- **Worktree**: branddock-strategy-ui-metering

## Kalibratie-besluit (uitgevoerd)

**Eén prijs voor hetzelfde werk**: het lanceren van een chain-blueprint via de wizard kost 80cr (`CREDIT_COSTS['long-form']`), identiek aan de API-job. Meetpunt = `POST /api/campaigns/wizard/launch`:

- **Itereren in de wizard blijft gratis** (alle stap-routes ongewijzigd) — je betaalt voor de strategie die je daadwerkelijk lanceert, conform "betaal voor wat je maakt".
- **Gate**: alleen als er een chain-blueprint gelanceerd wordt (`architecture.journeyPhases` of `assetPlan.deliverables` aanwezig). QUICK/CONTENT-launches zonder blueprint blijven 0.
- **Idempotent** per campagne (`strategy-charge:launch:<campaignId>`) — retry/dubbelklik boekt niet dubbel.
- **Post-hoc + fail-soft** (`chargeAfter`) — een charge-fout laat de launch nooit falen; zelfde patroon als de job.
- **Sectie-regenerate blijft op beide paden ongemeterd** (parity; bewust ongewijzigd — apart besluit als dit misbruikgevoelig blijkt).

## File-list

- `src/app/api/campaigns/wizard/launch/route.ts` (chargeAfter + gate)
- `scripts/dev/strategy-ui-metering-smoke.ts` (nieuw)

## Bewijs

Smoke 8/8 (dev-server met `NEXT_PUBLIC_CREDITS_ENABLED=true`, org tijdelijk niet-unlimited): blueprint-launch → 201 + precies één -80-transactie op feature `campaign-strategy-generate`; QUICK-launch → 201 + géén boeking; herhaalde charge met zelfde idempotency-key boekt niet dubbel. tsc 0 errors. Gotcha onderweg: de flag heet `NEXT_PUBLIC_CREDITS_ENABLED` en `isOrgUnlimited` cachet 60s.

## Open voor Erik (niet blokkerend)

- Wizard-UI toont de 80cr-prijs nog nergens vóór de launch-klik — kandidaat voor een klein UI-label ("Launch — 80 credits") als de pilot daarom vraagt.
