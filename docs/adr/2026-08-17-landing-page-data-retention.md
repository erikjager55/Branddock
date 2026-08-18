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
(`tasks/done/lp-review-followups.md`). Ze zijn op 16-08 naar Nu gehaald omdat ze als
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
| `compiledHtml` | **nieuwste 5 beschikbare artifacts per pagina** | Instant rollback blijft op het bereik waarin praktisch teruggerold wordt |

Let op de formulering van de derde: het venster telt **beschikbare artifacts**, niet
publish-rijen. Compile bij publish is fail-soft (rij eerst, HTML erna, `console.warn`
bij falen), en zulke mislukkingen zijn meestal systematisch. Telde het venster rijen,
dan verloor een pagina wier vijf nieuwste compiles faalden élk artifact dat ze nog
had — de rijen ervóór vielen dan immers buiten het venster.

De windows staan als maanden in `src/lib/landing-pages/retention-policy.ts`. De
afkapdatum wordt kalendermatig berekend, niet als `maanden × 30`: een
dag-benadering schuift per jaar merkbaar weg, en een bewaartermijn die niet
overeenkomt met wat je opschrijft is bij een AVG-vraag niet uit te leggen.

Een kále `setMonth()` is daarvoor níet genoeg, en dat is een val waar de eerste
versie van deze code in liep: op een maandeinde rolt die vóóruit in plaats van te
clampen. Op 31-03 leverde `setMonth(-13)` **03-03** op in plaats van 28-02 — een
látere cutoff, en dus tot drie dagen data té veel verwijderd; op 31-08 verdween
lead-PII een dag te vroeg. Dat raakte vijf maanden per jaar. De dag wordt daarom
geclampt op de laatste dag van de doelmaand, en de rekenkunde loopt in UTC zodat
de termijn niet rond een DST-overgang een uur verschuift. Vastgelegd met zes
expliciete maandeinde-/schrikkeljaar-cases in de smoke.

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

## Wie mag wissen

**Alleen owner/admin.** Strenger dan de rollback-route in dezelfde map, die
alleen `viewer` weert — een pointer-swap is terug te draaien en dit niet, en
`src/lib/auth/require-role.ts` stelt owner/admin als norm voor destructieve
acties. Consequentie: een `member` die de leads dagelijks beheert kan géén
wisverzoek uitvoeren en moet het bij een owner/admin melden. Dat is een bewuste
keuze voor de veilige kant; loslaten naar `member` is één regel als de praktijk
erom vraagt.

Er is geen `AuditLog`-model in de codebase, dus het erasure-spoor is een
`console.info` met submissie- en deliverable-id. Genoeg om terug te vinden dát er
gewist is, niet genoeg voor een formele audit trail — dat vraagt een eigen model.

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

## Batched deletes, en waarom de derde stap anders werkt

De twee **delete**-stappen lopen in batches van 5.000 id's met een harde lus-cap
(40 batches = 200.000 rijen per tabel per nacht). Op een groeiende tabel is één
`deleteMany` over alles hoe je een serverless-timeout of een lange lock op Neon
koopt. Beide stappen leunen op een nieuwe `@@index([createdAt])` per tabel: geen
van de bestaande indexen leidde met `createdAt`, waardoor de nachtelijke prune een
volledige tabelscan was — óók als er niets te verwijderen valt. Dat is de énige
schemawijziging (twee additieve indexen, `prisma db push`).

De **compiledHtml**-stap kan dat patroon niet volgen: hij verwijdert geen rijen,
dus er "verdwijnt" niets waardoor een volgende run vanzelf verder komt. Een
cursor over alle pagina's die elke nacht bij de laagste id herbegint zou daarom
alles voorbij de eerste 4.000 pagina's **nooit** opruimen — stil, en door de
cuid-ordening precies bij de nieuwste pagina's, wat de hele maatregel zou
uithollen.

Een `groupBy` + `having` op "aantal HTML-dragende publishes > venster" lijkt de
oplossing maar is het niet, en dat is de moeite van het onthouden waard:
**"pagina is kandidaat" en "pagina heeft werk" zijn niet hetzelfde.** Een pagina
met 6 HTML-dragende publishes waarvan de live-pointer de oudste is blijft eeuwig
kandidaat (6 > 5) terwijl er niets prunebaar is — en géén drempel op aantallen
kan dat onderscheiden, want of de pointer binnen of buiten het venster valt is
geen kwestie van tellen. Zulke pagina's hopen zich op aan de kop van de ordening
en verhongeren alles erna.

Daarom staat de selectie in één SQL-statement met `row_number()`: rangschik per
pagina op versie aflopend **over alleen de rijen die nog HTML dragen**, neem wat
voorbij het venster valt en sluit de live-pointer uit. Kandidaten *zijn* dan
precies de prunebare rijen — ze verlaten de verzameling zodra ze geleegd zijn,
dus elke batch boekt vooruitgang en een vastgelopen pagina bestaat niet. Ook
komt de HTML het geheugen niet in: `compiledHtml` wordt nooit geselecteerd,
alleen `IS NOT NULL` getoetst.

De live-uitsluiting in hetzelfde statement brengt het venster voor een
gelijktijdige rollback terug tot één statement. **Gesloten is die race niet**:
onder READ COMMITTED leest de subquery het snapshot van statement-start, en de
concurrent write raakt `LandingPage.livePublishId` — een andere rij in een andere
tabel dan de `PagePublish` die geüpdatet wordt — dus er is geen hercontrole. Een
pointer-swap die binnen dat venster commit kan de net-live geworden versie alsnog
haar artifact zien verliezen. Gevolg is degradatie naar runtime-render, geen
stukke pagina; een `FOR SHARE` op de betrokken `LandingPage`-rij zou het sluiten
als dat ooit de moeite blijkt.

Batchgrootte is hier bewust ruim (20.000). Anders dan bij de deletes, waar een
batch een index-geleide lookup begrenst, kost elke extra iteratie een volledige
`row_number()`-pass over `PagePublish` — klein batchen vermenigvuldigt het werk
dus in plaats van het te beperken.

De regel staat óók als pure functie (`selectPrunableCompiledHtml`) — die is de
leesbare specificatie en wordt in de smoke tegen het SQL-pad afgezet. Prijs van
deze keuze: het window loopt over de hele `PagePublish`-tabel per batch, wat bij
de huidige volumes ruim binnen de marge valt maar bij sterke groei een partiële
index verdient.

Elke stap meldt `truncated` wanneer de lus-cap geraakt is, en de cron neemt dat op
in de response plus een `console.warn`. Zonder dat signaal is "cap geraakt, werk
blijft liggen" niet te onderscheiden van "klaar".

# Consequences

**Goed**: drie onbegrensde tabellen hebben een plafond dat ook bij groei blijft
werken; er is een uitvoerbaar pad voor een wisverzoek; één additieve
schemawijziging (twee indexen), geen datamigratie.

**Prijs / grenzen**:

- Rollback naar een versie ouder dan de nieuwste 5 rendert via het runtime-pad:
  correct, maar langzamer en met verse merk-tokens in plaats van de bevroren.
- De erasure-route heeft geen UI. Er is nu ook geen submissions-lijst om een knop
  in te hangen (alleen het "Leads"-blok in `WebPagePublishPanel`), dus dit is
  voorlopig een API-actie — en alleen voor owner/admin.
- **Verweesde submissions (`landingPageId` wijst naar een verwijderde pagina).**
  Dat veld is bewust FK-loos (uit `lp-forms-leads`: leads moeten een pagina-delete
  overleven), dus een verwijderd deliverable laat rijen achter met een dood id.
  Die zijn via de `formId`-tak **wél leesbaar** — ze staan in het Leads-blok — en
  waren tot 17-08 door geen enkel deliverable te wissen: PII die we tonen en
  niemand kan verwijderen, wat precies is wat art. 17 verbiedt. De wis-route
  detecteert zo'n rij nu (leesbaar, maar `landingPageId` resolveert niet naar een
  bestaande pagina) en wist hem binnen de workspace. Structureel hoort hier een
  FK met `onDelete: SetNull`; die faalt op bestaande dangling waarden en vraagt
  dus eerst een data-opruiming — eigen taak.
- **Onbereikbaar blijft**: een submissie zónder `landingPageId` wiens sectie-id
  niet meer in enige draft-tree staat. `/api/f/[formId]` schrijft
  `landingPageId: null` als de sectie niet te herleiden is (zip-/WP-export), en
  `regenerate-puck-data` vernieuwt sectie-id's. Zulke rijen matchen geen enkele
  scope-tak, dus wissen is ruwe SQL. Een wis-route op `formId` binnen de workspace
  zou dit dichten en heeft een eigen auth-verhaal nodig.
- De wis-scope bindt de `formId`-tak aan `landingPageId: null` zodat een
  gedupliceerd deliverable — dat de sectie-id's verbatim erft — niet de
  pagina-gebonden leads van het origineel kan wissen. Restrisico binnen dezelfde
  workspace: de pagina-lóze leads blijven voor beide deliverables wisbaar, en een
  kopie die dezelfde slug publiceert kan de `LandingPage`-rij van het origineel
  overnemen (de publish-upsert keyt op `workspaceId, locale, slug`). Cross-tenant
  is dat niet, cross-deliverable wel.
- De eerste cron-run op productie kan een grote opruiming doen. De batch-cap
  begrenst dat per run; wat overblijft gaat de volgende nacht mee en `truncated`
  maakt zichtbaar dát er nog werk staat.
- Het 26-maands-window verwijdert leads definitief. Er is bewust geen
  soft-delete of archief: half verwijderen is bij PII geen verwijderen.
- **Wat de tenant-isolatie werkelijk draagt** is dat `formIds` en `pageIds`
  afgeleid worden uit het geautoriseerde deliverable — `formId` bevat de
  workspaceId en pagina-id's zijn unieke cuids, dus een vreemde rij matcht geen
  enkele OR-tak. Het `workspaceId`-predicaat in de `where` is defense-in-depth,
  niet de eerste verdedigingslinie; een mutatietest bevestigde dat het weglaten
  ervan de cross-tenant-casus niet opent.

**Herzien wanneer**: een klant een afwijkende bewaartermijn contractueel eist, de
eerste workspace >10k events/maand haalt (dan is partitionering interessanter dan
rij-delete), er een leads-scherm komt waar de erasure-actie in hoort, of een
`member` een wisverzoek moet kunnen uitvoeren.
