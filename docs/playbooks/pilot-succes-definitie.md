# Pilot-succes-definitie — Better Brands

> **Datum**: 2026-07-17 · **Product**: P5.1 uit `docs/reports/postiz-verbeterplan-2026-07-17.md`
> **Status**: ✅ BEKRACHTIGD 2026-07-17 — drempels C1-C5, peildata en consequentie-matrix zijn door Erik akkoord bevonden. De Postiz-les: criteria en peildatum vóóraf op papier, zodat de evaluatie uitvoering is en geen discussie.

---

## Context

- Better Brands' merk-DNA is op 2026-07-07 naar de prod-workspace gemigreerd; credits draaien live in pilotmodus.
- **Belangrijk voor de lat**: de "merk-DNA heeft vertraagde payoff"-nuance uit de Postiz-analyse geldt hier NIET — BB's foundation is al compleet gemigreerd. De pilot meet dus puur gebruik van de generatie-/validatie-/agent-laag, niet de opbouwfase.
- Bestaande signalen: Vera's review-trigger heeft 0 events, dam-upload marginaal (concierge-window t/m 28-07). De adoptie is dus aantoonbaar nog dun — deze definitie maakt expliciet wanneer dat een probleem is en wat er dan gebeurt.

## Meetvenster & peildata

| Venster | Periode | Waarom |
|---|---|---|
| Venster 1 | 2026-07-17 t/m **2026-07-28** | Sluit aan op bestaande kalibratie-momenten: einde Vera-concierge-window + Ada-drempel-kalibratie staan al op 28-07 |
| Venster 2 | 2026-07-29 t/m **2026-08-11** | Herkansing ná eventuele onboarding-fixes uit venster 1 |

## Criteria (voorstel — per week, tenzij anders vermeld)

| # | Criterium | Drempel | Meetbron |
|---|---|---|---|
| C1 | Content-items gegenereerd | ≥ 3 / week | Deliverable-rijen workspace BB |
| C2 | Content-items gepubliceerd of geëxporteerd | ≥ 1 / week | `approvalStatus=PUBLISHED` + exports |
| C3 | F-VAL-runs | ≥ 2 / week (of ≥ 50% van gegenereerde items gescoord) | Fidelity-run-logging |
| C4 | Agent-interactie (inbox geopend, advies opgevolgd of review-trigger) | ≥ 1 / week | Agent-inbox events / PostHog |
| C5 | Actieve weken | ≥ 2 van de ~2 weken in venster 1 actief (activiteit = C1 óf C4 gehaald) | afgeleid |

⚠️ **Meetbron-kanttekening**: Claude heeft geen directe prod-DB-toegang meer (Neon geroteerd). Meting loopt via app-API's/smoke-account, PostHog, of Erik leest de getallen zelf uit. Vóór peildatum 1 vastleggen wíe meet en hoe — anders is de peildatum een wens.

## Consequentie-matrix (vooraf afgesproken)

| Uitkomst venster 1 | Definitie | Actie |
|---|---|---|
| 🟢 Groen | ≥ 4 van 5 criteria gehaald | Opschalen: testers uitnodigen (user-actiepunt #8), TOPUP-schakelmoment agenderen |
| 🟠 Oranje | 2-3 van 5 gehaald, óf C1 wel maar C3/C4 niet | Niet opschalen. Diagnose-gesprek met BB-gebruiker(s): waar haakt het? Gerichte onboarding-fix, daarna venster 2 |
| 🔴 Rood | ≤ 1 van 5 gehaald | Niet opschalen. Framing/onboarding fundamenteel herzien vóór er testers bij komen — anders verbrandt elke tester op dezelfde drempel |

**Kill-nuance** (uit de Postiz-analyse, les 5d): rood ≠ product dood. "Kill fast" geldt voor kanalen en experimenten; voor de kern betekent rood: *niet opschalen op een lek fundament*. De pilot-klant is bovendien Eriks eigen bedrijf — lage adoptie kan ook "founder heeft geen tijd" betekenen; dat is zelf een bevinding (als de founder het product niet gebruikt, doet een vreemde het zeker niet) en hoort in de diagnose.

## Besluit (2026-07-17)

1. ✅ Drempels C1-C5 bekrachtigd zoals voorgesteld.
2. **Meetwijze**: Claude bereidt de meting voor via app-API's/smoke-account + PostHog (geen directe prod-DB-toegang); wat daarmee niet uitleesbaar is, levert Erik aan op de peildatum. Vóór 2026-07-28 draait er een eerste proefmeting zodat de peildatum geen verrassingen kent.
3. ✅ Peildatum 2026-07-28 staat — samen met de al geplande Vera/Ada-momenten.
