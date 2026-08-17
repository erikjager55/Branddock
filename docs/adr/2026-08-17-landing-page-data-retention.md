---
id: 2026-08-17-landing-page-data-retention
title: Data-retentie voor landing-page-data — PageEvent, FormSubmission en compiledHtml
status: accepted
date: 2026-08-17
supersedes: -
superseded-by: -
---

# Context

De 2-reviewer-ronde over de webpage-builder (2026-08-13) liet drie retentie-punten
bewust liggen als "geen launch-blocker, wel afmaken vóór volume-groei"
(`tasks/lp-review-followups.md`). Ze zijn op 16-08 naar Nu gehaald omdat ze als
enige items in die lijst met de dag duurder worden — het is schuld die zichzelf
oplaadt zodra er verkeer op de gepubliceerde pagina's staat.

Drie tabellen groeiden onbegrensd, elk om een andere reden:

1. **`PageEvent`** — `/api/t` is een publiek endpoint met 60 events/min/IP
   (`src/app/api/t/route.ts:35`). Geen TTL. Het stats-dashboard leest alleen de
   laatste 7 en 30 dagen (`stats/route.ts:74-85`), dus alles ouder is opslag en
   index-gewicht zonder lezer.
2. **`FormSubmission`** — lead-PII in `data Json`. Workspace-delete cascadeert,
   maar er was géén tijdgebonden retentie en géén manier om één submissie te
   wissen. Dat laatste is precies wat AVG art. 17 en een verwerkersafspraak
   vereisen; het stond als expliciet openstaand punt in het schema-commentaar
   op `FormSubmission`.
3. **`PagePublish.compiledHtml`** — sinds ADR 2026-08-12 bewaart elke publish
   een volledig bevroren HTML-artifact, append-only. Een pagina die honderd keer
   gepubliceerd wordt, bewaart honderd volledige HTML-documenten.

# Decision

## Windows

| Data | Window | Onderbouwing |
|---|---|---|
| `PageEvent` | **13 maanden** | Ruim voorbij het 30-daagse dashboard-venster, en houdt jaar-op-jaar-vergelijking mogelijk mocht die er komen |
| `FormSubmission` | **26 maanden** | Vaste termijn voor lead-PII. Lang genoeg voor een realistische B2B-salescyclus, kort genoeg om als bewaartermijn verdedigbaar te zijn |
| `compiledHtml` | **nieuwste 5 versies per pagina** | Instant rollback blijft op het bereik waarin praktisch teruggerold wordt |

De windows staan als maanden in `src/lib/landing-pages/retention-policy.ts` en de
afkapdatum wordt via `setMonth()` berekend, niet als `maanden × 30`. Een
dag-benadering schuift per jaar merkbaar weg, en een bewaartermijn die niet
overeenkomt met wat je opschrijft is bij een AVG-vraag niet uit te leggen.

**Één vast window, niet per workspace instelbaar.** Een `formRetentionDays` op
`Workspace` is overwogen en afgewezen: het kost een schemawijziging plus een
instellingen-scherm, en er is nog geen klant die een afwijkende termijn vraagt.
Zodra een bureau met een eigen verwerkersafspraak zich meldt is dit de plek om
die beslissing te herzien.

## Twee mechanismen, niet één

- **Tijdgebonden**: één dagelijkse cron (`/api/cron/lp-retention`, 02:00) doet
  alle drie de stappen. Elke stap wordt afzonderlijk afgevangen — een fout in de
  ene stap mag de andere twee niet laten groeien.
- **Op verzoek**: `DELETE /api/landing-pages/[deliverableId]/submissions?id=…`
  voor een individueel wisverzoek. Retentie ná 26 maanden is geen antwoord op
  "wis mijn gegevens nú".

## compiledHtml-pruning is veilig, en waarom

`puckData` en de publish-metadata blijven staan; alleen `compiledHtml` gaat op
`null`. Dat is geen nieuw geval: ADR 2026-08-12 heeft `null` al gedefinieerd als
"artifact ontbreekt → runtime-fallback-pad", en dat pad bestaat en werkt
(`src/app/p/[workspace]/[slug]/page.tsx:107`). Rollback naar een geprunede
versie levert dus een correcte pagina, alleen niet meer bit-voor-bit de bevroren
staat van toen.

**De live versie wordt altijd overgeslagen, ook buiten de nieuwste 5.** Rollback
is een pointer-swap (`LandingPage.livePublishId`), dus na een rollback naar een
oude versie is de live pagina níet de nieuwste. Zonder die uitzondering zou juist
de live pagina haar bevroren artifact verliezen en terugvallen op runtime-render
met verse merkcontext — precies de stille herstijling die ADR 2026-08-12 wilde
uitbannen. Dit is de belangrijkste assertie in de smoke.

## Batched deletes

De prunes lopen in batches van 5.000 id's met een harde lus-cap per run, niet als
één `deleteMany` over de hele tabel. Op een groeiende tabel is dat laatste hoe je
een serverless-timeout of een lange lock op Neon koopt.

# Consequences

**Goed**: drie onbegrensde tabellen hebben een plafond; de AVG-verplichting heeft
een uitvoerbaar pad; geen schemawijziging, dus geen Neon-migratie nodig.

**Prijs / grenzen**:

- Rollback naar een versie ouder dan de nieuwste 5 rendert via het runtime-pad:
  correct, maar langzamer en met verse merk-tokens in plaats van de bevroren.
- De erasure-route heeft geen UI. Er is nu ook geen submissions-lijst om een knop
  in te hangen (alleen het "Leads"-blok in `WebPagePublishPanel`), dus dit is
  voorlopig een API-actie.
- De eerste cron-run op productie kan een grote eerste opruiming doen. De
  batch-cap begrenst dat per run; wat overblijft gaat de volgende nacht mee.
- Het 26-maands-window verwijdert leads definitief. Er is bewust geen
  soft-delete of archief: half verwijderen is bij PII geen verwijderen.

**Herzien wanneer**: een klant een afwijkende bewaartermijn contractueel eist, de
eerste workspace >10k events/maand haalt (dan is partitionering interessanter dan
rij-delete), of er een leads-scherm komt waar de erasure-actie in hoort.
