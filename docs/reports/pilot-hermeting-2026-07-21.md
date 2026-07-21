# Pilot-claim hermeting — 2026-07-21

> Go Erik ("doe de hermeting") na de modellen-refresh: de vanilla-baseline stond nog op gpt-4o, terwijl een ChatGPT-gebruiker vandaag gpt-5.6 krijgt. Deze hermeting moderniseert de baseline én hermeet de on-brand-gap met de volledige nieuwe stack (generatie opus-4.8, F-VAL-judges gpt-5.6/sonnet-5).

## Methode

- **Workspace**: Better brands (dev) — rijk merk-DNA, voiceguide mét centroid (pijler 1 actief).
- **Matrix**: 3 content-types (newsletter, linkedin-post, blog-post) × 2 briefing-condities (rijk / mager), N=1 per cel.
- **Kanten**: Branddock (claude-opus-4-8 + brand-voice-directive, 8,9K chars merkcontext) vs. vanilla gpt-5.6 (nieuwe baseline) vs. vanilla gpt-4o (oude baseline, referentie). Identieke user-prompt per cel; alleen de system-prompt verschilt.
- **Scoring**: symmetrisch via `computeFidelityScore` (F-VAL composite, cross-family judges per generator-familie); targetWordCount = werkelijke lengte per output (length-control geneutraliseerd).
- Script: `scripts/experiments/pilot-hermeting-2026-07.ts` (reproduceerbaar).

## Resultaat

| Type | Briefing | Branddock | Vanilla gpt-5.6 | Δ nieuw | Vanilla gpt-4o | Δ oud-stijl |
|---|---|---|---|---|---|---|
| newsletter | rijk | 68 | 65 | +3 | 57 | +11 |
| newsletter | mager | 72 | 56 | +16 | 50 | +22 |
| linkedin-post | rijk | 69 | 59 | +10 | 65 | +4 |
| linkedin-post | mager | 60 | 60 | 0 | 56 | +4 |
| blog-post | rijk | 72 | 77 | −5 | 74 | −2 |
| blog-post | mager | 72 | 55 | +17 | 53 | +19 |

**Gemiddelde gap vs gpt-5.6: +6,8** (rijke briefing +2,7 · magere briefing +11,0)
Gemiddelde gap vs gpt-4o (referentie): +9,7 · Newsletter-gap vs gpt-5.6: +9,5

## Conclusies

1. **De "+7 punten on-brand"-claim blijft staan** tegen de gemoderniseerde baseline: +6,8 gemeten. De claim hoeft niet te worden aangepast; hij is nu wél gemeten tegen wat gebruikers vandaag echt als alternatief hebben.
2. **Het briefing-patroon uit de originele meting herhaalt zich exact**: hoe magerder de briefing, hoe groter de Branddock-winst (+11 mager vs +2,7 rijk). De demo-framing "magere briefing → meer Branddock" blijft de juiste.
3. **Nieuw datapunt**: het betere vanilla-model verklaart ~3 punten gap-versmalling (+9,7 → +6,8). Frontier-modellen schrijven beter generiek — maar merkkennis blijft het verschil; die haalt een model niet uit een briefing.
4. **Blog-post met rijke briefing is de zwakste cel** (−5): bij een uitgebreide briefing schrijft een frontier-model een sterke long-form. Consistent met de oorspronkelijke "briefing-gevoelig"-bevinding; niet demo'en met rijk-gebriefde blogs.
5. Newsletter blijft de beste demo (+9,5; was +12 tegen gpt-4o).

## Kanttekeningen

- N=1 per cel — de celwaarden hebben judge- en generatievariantie; het gemiddelde over 6 cellen is robuuster dan individuele cellen. Voor een publiek herhaalde claim: N=3 herhaling overwegen.
- Dev-meting; prod gebruikt dezelfde modellen/paden.
- `VANILLA_MODEL` in het product staat nu op gpt-5.6 (deze PR) — de in-app "vergelijk met vanille"-demo gebruikt vanaf nu de eerlijke moderne baseline.

## Claim-implicaties (geen actie nodig, wel bewust)

- "+7 punten on-brand versus vanilla-AI" — blijft geldig (+6,8 nieuw gemeten).
- "+12 op nieuwsbrieven" — tegen de nieuwe baseline is dit +9,5; bij hergebruik van dat specifieke cijfer in marketing: bijstellen of herformuleren naar "bijna +10".
