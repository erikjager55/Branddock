# P3.6 — Brandclaw-herijking na de API-lijn

> **Datum**: 2026-07-17 · **Product**: P3.6 uit het Postiz-verbeterplan
> **Status**: plan-pakket — bouwklaar, maar activatie is expliciet Eriks go-besluit (wig-besluit: "autopilot" pas claimen als het waar is). Vervangt niet de bestaande task `agents-brandclaw-convergentie`; het herijkt hem.

## Wat er sinds vandaag anders is

De oorspronkelijke Brandclaw-visie (autonome marketing-loop) vereiste een reeks bouwstenen die er nu grotendeels zíjn door de P3-lijn:

| Loop-stap | Bouwsteen | Status |
|---|---|---|
| Signaleren | Agents (Ada/Nova/…) + webhooks (P3.3: fidelity.below_threshold, content.published) | ✅ live / in PR |
| Genereren | Headless services: content, SEO, web-page, video, strategy (P3.0a + D1-D4) | ✅ in PR #190 |
| Valideren | F-VAL headless (score_against_brand) + fidelity-events | ✅ |
| Goedkeuren | Agents-inbox + proposal/confirm-flow (bestaand) | ✅ live |
| Publiceren | Bestaande publish-keten; externe kanalen = P3.5 | deels (P3.5-connector in bouw) |
| Meten | ApiCallLog/PostHog + pilot-metrics + Ada-snapshots | ✅ |

**Kernconclusie**: Brandclaw is geen bouwproject meer maar een órkestratie-project — de loop aan elkaar knopen die er al ligt, plus een autonomie-beleid.

## Herijkte fasering

**BC-1 — Draadloze loop met mens-goedkeuring (eerste zinvolle increment, ~1-2 wk)**
Een scheduled agent ("Loop-pilot") die wekelijks: signalen verzamelt (Ada-metrics, fidelity-events, content-gaps) → via de headless services 2-3 content-voorstellen genereert → F-VAL-scoort → als proposals in de inbox zet. Mens keurt goed; publiceren blijft handmatig/bestaande keten. Geen nieuw autonomie-risico: alles loopt door de bestaande confirm-flow.

**BC-2 — Goedgekeurd = gepubliceerd (na P3.5 + kanaal-credentials)**
Accept van een loop-proposal triggert de publish-keten naar het geconfigureerde kanaal. Autonomie-tier per workspace: `suggest` (BC-1-gedrag) | `auto_publish_approved`.

**BC-3 — Bounded autonomy (go-besluit Erik vereist)**
Per workspace instelbaar budget (X items/week, alleen types Y, F-VAL ≥ Z verplicht) waarbinnen de loop zonder per-item-goedkeuring publiceert; alles erbuiten → inbox. Wekelijkse digest + kill-switch. Pas hierna mag de marketing "autopilot" zeggen.

## Go-besluit-criteria voor BC-3 (voorstel, door Erik te bekrachtigen t.z.t.)

1. BC-2 draait ≥4 weken bij ≥2 workspaces zonder incident (geen off-brand-publicatie, geen budget-overschrijding)
2. F-VAL-drempel per type gekalibreerd op echte loop-output
3. Credits-metering op de loop gevalideerd (geen verrassingsfacturen)
4. Kill-switch + digest getest

## Open punten

- P3.5-kanaal (Postiz/Buffer/social) is de enige ontbrekende schakel voor BC-2 — connector-code in bouw, echte verificatie vereist kanaal-credentials (user-held).
- De bestaande task-file `agents-brandclaw-convergentie` bij BC-1-start bijwerken naar deze fasering.
- Loop-frequentie/scope eerste pilot: voorstel wekelijks, alleen Better Brands, alleen linkedin-post + blog-post.
