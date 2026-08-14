---
id: 2026-08-14-brand-library-consumption
title: Eén gegate consumptie-façade voor merkcontext — de accessor naast de export-assembler
status: accepted
date: 2026-08-14
supersedes: -
superseded-by: -
---

# Context

W7.1 van het designbibliotheek-verbeterplan vraagt één verplicht consumptiepad
(`getBrandLibrary`), zodat gates, marker-stripping en provenance-filtering op één plek zitten. De
accessor bestaat sinds het W1/W7-werkpakket, maar levert alleen het manifest en heeft **nul
consumers**; alle ~24 leespaden lezen zelf `BrandStyleguide`-velden.

Inventarisatie (2026-08-14, 127 toegangen in 68 bestanden):

- **5** leespaden passen één of meer gates toe: `ai/brand-context`, `ai/canvas-context`,
  `consistent-models/{workspace,model}-context-resolver`, `brand-fidelity/styleguide-rule-compiler`.
- De rest leest ongegate, waaronder drie paden die rechtstreeks een prompt of een agent voeden:
  `claw/tools/read-tools` (Brand Assistant), `brand-fidelity/visual-fidelity-scorer` (vision-judge,
  inclusief ongestripte `OBSERVED:`-markers) en `ai/knowledge-context-fetcher`.
- Zelfs het best gegate pad heeft een gat: `brand-context` leest `fonts` zonder
  `typographySavedForAi`.

De bugklasse die W7.1 noemt (`gotchas.md` 2026-06-10 — `canvas-context` las `photographyStyle` langs
de imagery-gate om) is inmiddels gerepareerd. Deze ADR gaat dus niet over één bug, maar over de
vraag waarom die reparatie per consumer opnieuw gedaan moet worden.

# Beslissing

## D1 — Geen derde canoniek model

Er bestaan er al twee: `BrandManifest` (gecureerd, W1) en `DesignSystemModel` (compleet,
`src/lib/export/design-system/resolver.ts`, gedocumenteerd in `docs/design-system-export.md`). De
accessor schrijft er geen derde bij. Hij levert het manifest plus een **gesectioneerde projectie
van de styleguide-row**, en laat `buildDesignSystemModel` staan als de ongegate assembler voor
exports die de gebruiker zelf start.

De twee hebben een verschillende opdracht en horen dus niet samengevoegd te worden:

| | `buildDesignSystemModel` | `getBrandLibrary` |
|---|---|---|
| Doel | export naar bestandsformaten | consumptie door AI/agents |
| Gates | geen (bewust — eigen data, eigen export) | publish + per sectie |
| Markers | blijven staan | gestript |
| Vorm | semantische rollen (tokens) | secties + manifest |

## D2 — Hybride gating, niet alles-of-niets

Secties die **prozacontent** aan een prompt voeren zijn gegate; **render-tokens** niet. Dat is geen
nieuwe regel maar het vastleggen van een bestaande, bewuste keuze: `canvas-context.ts:694-697`
documenteert al "Rendering-tokens blijven bewust ongegate" naast een harde imagery-gate. Een
landingspagina moet in de merkkleuren renderen ook als de imagery-sectie nog niet gereviewd is; een
image-prompt mag geen ongereviewde fotografie-beschrijving krijgen.

Consequentie voor het contract: `getBrandLibrary` retourneert **niet langer `null`** wanneer de
styleguide niet gepubliceerd is (huidige gedrag, `index.ts:50`). Dan zou `canvas-context` er nooit
op kunnen. Nieuw: altijd een object, met `published: false` en de gegate secties leeg. Vrij te
wijzigen omdat de functie nul consumers heeft.

## D3 — `gates` reist mee

Het resultaat draagt per sectie of de gate open stond. Zonder dat is "deze sectie ontbreekt"
niet te onderscheiden van "deze sectie is leeg" — dezelfde stille nul die de Stap-0-spike bij de
rules-pijler blootlegde (ADR 2026-08-14-styleguide-rules-in-fval, D3). Het kalibratie-paneel kan er
later op bouwen.

## D4 — Marker-stripping aan de bron

Alle prozavelden gaan door `stripAnalyzerMarkers`/`stripAnalyzerMarkersFromList` vóórdat ze de
accessor verlaten — zoals `manifest-builder.ts` het al doet. Consumers strippen niet meer zelf;
vandaag doen vier van de tien het wél en zes niet, wat betekent dat `OBSERVED:`-tekst in
prompts belandt.

## D5 — `no-restricted-properties`, niet `no-restricted-syntax`

`eslint.config.mjs` gebruikt `no-restricted-syntax` al twee keer (de NL→EN-guard en de
i18n-guard), en ESLint flat-config doet **last-wins per rule-key**. Een derde blok met dezelfde
sleutel zou die guards op elk overlappend bestand stilzwijgend uitschakelen — de i18n-blok-comment
waarschuwt daar expliciet voor. `no-restricted-properties` is nog ongebruikt en botst niet.

Severity meteen `error`: `npm run lint` draait zonder `--max-warnings` en CI faalt alleen op
errors, dus een warning zou onzichtbaar zijn. De nog niet gemigreerde bestanden staan in een
`ignores:`-lijst in plaats van in ~29 losse `eslint-disable`-comments: één plek waar de resterende
schuld zichtbaar is, en die per migratie krimpt.

# Gevolgen

**Goed**

- Een nieuwe consumer erft gates, stripping en compressie automatisch; vergeten is geen optie meer.
- Drie ongegate promptpaden en één marker-leak worden gesloten.
- De `published`-gate wordt afdwingbaar op de "what you see is what the AI gets"-route.

**Prijs**

- Migratie is geen no-op: `brand-context` gaat `fonts` gaten, en drie paden gaan minder data zien.
  Dat is de bedoeling, maar het verandert AI-output en moet met een baseline-diff bewezen worden.
- Eén brede query per workspace in plaats van smalle selects. Opgevangen door dezelfde 5-min cache
  als `brand-context`; netto minder queries omdat de twee grootste consumers nu al bijna de hele
  row ophalen.
- De export-paden blijven ongegate. Dat is een bewuste uitstel-beslissing, geen vergetelheid: gating
  daar verandert de Brand Kit Bundle en verdient een eigen afweging.
