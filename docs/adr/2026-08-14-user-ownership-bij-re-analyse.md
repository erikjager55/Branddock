# ADR — Eigenaarschap van merkdata bij een re-analyse

**Datum**: 2026-08-14
**Status**: geaccepteerd
**Context**: verbeterplan W5 · changelog #460 · task `refresh-preserves-user-data`

## Context

Een brandstyle-analyse is niet eenmalig. Een workspace wordt opnieuw gescrapet als de site
verandert, als de eerste analyse tegenviel, of via de website-scanner bij onboarding. Tegelijk
bewerkt de gebruiker die data: hij voegt een merkkleur toe die de scraper miste, corrigeert
usage-tags, uploadt het echte logo in plaats van de gevonden favicon, hernoemt componenten en
cureert de don'ts-lijsten.

Die twee bewegingen botsten. W5 loste dat op *route*-niveau op (de analyze-routes hergebruiken de
styleguide-rij), maar niet op relatie-niveau: `writeResultToDb` wiste bij elke run alle kleuren,
logo's en componenten en overschreef acht gecureerde lijsten met een lege array.

De vraag die dit ADR beantwoordt: **hoe weet de analyzer wat van hem is en wat van de gebruiker?**

## Beslissing

Per datasoort het goedkoopste betrouwbare signaal, in plaats van één uniform mechanisme
forceren. Dat levert vier vormen op — bewust, want de onderliggende data verschilt te veel:

| Datasoort | Mechanisme | Waarom deze |
|---|---|---|
| `StyleguideColor`, `StyleguideComponent` | `source String @default("scraped")` | Eigen rijen, dus een kolom kan. Zelfde vorm als `StyleguideRule.source`, dat dit al deed. |
| `StyleguideLogo` | het bestaande `uploadedById` | Alleen de upload-route zet dat veld, de analyzer nooit. Het signaal ís er al; een tweede kolom zou twee waarheden opleveren. |
| `StyleguideFont` | `source: 'DETECTED' \| 'UPLOADED'` | Bestond al, en is het patroon waar de rest op is gemodelleerd. |
| Profielvelden (`buttonProfile` c.s.) | `*Override Boolean` | Bestonden al als leescode. Eén JSON-veld per profiel, dus een boolean volstaat. |
| Gecureerde lijsten (`logoDonts`, `colorDonts`, …) | `BrandStyleguide.userEditedFields String[]` | Kolommen op de styleguide zelf, geen rijen — dus geen `source`-kolom mogelijk, en twaalf booleans zou het schema opblazen. |

Elk mechanisme is alleen zo goed als zijn schrijver. Dat is niet theoretisch: de `*Override`-vlaggen
bestonden al maanden mét complete leescode en **zonder één schrijver**, dus de bescherming waar de
route-comments naar verwezen deed niets. `userEditedFields` liep in de eerste versie van dit werk
in precies dezelfde val — de claim hing aan de catch-all PATCH terwijl de UI de sectie-routes
gebruikt. Vandaar `claim-fields.ts`: één helper die alle zes PATCH-routes delen, zodat een nieuwe
route de stempeling niet kan vergeten.

Bij een re-analyse geldt overal dezelfde drieslag, overgenomen van de fonts-afhandeling:

1. `deleteMany` **mét** provenance-filter — user-rijen blijven staan
2. de overlevende user-rijen lezen en hun natural key bouwen
3. de inkomende analyzer-batch daartegen filteren vóór de `createMany`

Stap 3 is niet optioneel. Zonder suppressie verruil je dataverlies voor duplicaten: de gebruiker
houdt zijn eigen merkblauw én krijgt er elke run een gescrapte rij met dezelfde hex naast.

Natural keys: kleuren op genormaliseerde hex, componenten op `(type, detectedLabel ?? label)`, en
logo's op variant-exclusiviteit (alleen PRIMARY is een enkelvoudige slot) plus `fileUrl`.

Twee valkuilen zitten in die sleutels verstopt, allebei pas zichtbaar toen de reviews erop wezen.
Een component-**rename** is tegelijk de edit die eigenaarschap oplevert én de helft van de sleutel —
zonder het oorspronkelijke analyzer-label bewaren matcht de scraper zijn eigen component niet terug
en zet er alsnog een duplicaat naast. En **LOCKUP is meervoudig**: die op variant onderdrukken laat
één geüploade lockup alle gedetecteerde lockups permanent buiten de bibliotheek houden.

## Sorteervolgorde is betekenisdragend

`pickBrand` in de LP-renderer neemt de eerste PRIMARY op `sortOrder` als merkkleur. Overlevende
user-rijen houden daarom hun positie; de verse batch vult de gaten ertussen. De eerste versie
schoof user-rijen naar achteren, waardoor het toggelen van één usage-tag op de merkkleur stilletjes
de kleur van alle gegenereerde landingspagina's veranderde.

Diezelfde verschuiving legde een tweede aanname bloot: `resolveSemanticTokens` haalde de kleuren
zonder `orderBy` op. Dat werkte zolang elke analyse álle rijen wiste en op volgorde herschreef —
insertion-order was dan toevallig gelijk aan sortOrder. Zodra rijen overleven klopt dat niet meer,
en dan wisselt de "deterministische" resolver-output tussen twee identieke analyses. Dat had via de
snapshot-diff spontane review-resets (#459) opgeleverd.

**Les**: een rij die een analyse overleeft, breekt elke impliciete aanname over rij-volgorde.

## Alternatieven

**Eén uniform `source`-veld overal.** Kan niet voor de lijsten — die zijn kolommen op de styleguide,
geen rijen. Zou een parallelle tabel vragen voor iets dat een `String[]` afhandelt.

**Upsert op natural key in plaats van delete+create.** Aantrekkelijk (kleur-id's blijven stabiel,
wat referenties elders zou helpen), maar een veel grotere ingreep in `writeResultToDb` en het lost
het eigenaarschapsprobleem niet op — je moet nog steeds weten wat je niet mag aanraken. Expliciet
niet gekozen; blijft een zinnige follow-up.

**Alles bewaren en de gebruiker laten mergen.** Verschuift het probleem naar een conflict-UI die er
niet is, en maakt elke re-scrape een taak in plaats van een refresh.

## Gevolgen

- Bestaande rijen worden bij de migratie `scraped`. We kunnen niet achteraf raden wat ooit
  handmatig was, dus **een bestaande handmatige kleur is nog één re-analyse lang kwetsbaar**. Dat is
  de veilige kant: de huidige situatie blijft hooguit bestaan, er gaat niets extra's verloren.
- De nieuwe faalmodus is een duplicaat in plaats van dataverlies. Matcht de natural key niet (kleur
  met andere casing, hernoemd component), dan verschijnt er een tweede rij. Genormaliseerde
  sleutels dekken de bekende gevallen; de verificatie-run controleert expliciet op duplicaten.
- Iets wat de gebruiker claimt, blijft geclaimd tot hij het leegmaakt. Er is geen "geef me de
  scraper-versie terug"-knop in de UI — leegmaken via de API is de enige weg terug.
- Scripts die gecureerde merkdata importeren (`fill-*.ts`, brand-DNA-bundles) moeten `source: 'user'`
  meegeven, anders wist de eerste re-analyse hun werk alsnog.

## Verificatie

Puur testbaar deel in `scripts/smoke-tests/preserve-user-rows.ts` (43/43, DB-vrij). De wiring is
alleen te bewijzen met een echte run: `scripts/dev/verify-refresh-preserves.ts` draait **twee
volledige analyses** op een wegwerp-workspace met user-edits ertussen (24/24). Die tweede run is
wat de eerste versie van dit ontwerp onderuithaalde — zie de Notes in de task-file.
