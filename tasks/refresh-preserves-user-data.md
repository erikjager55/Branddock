---
id: refresh-preserves-user-data
title: Een re-analyse mag user-edits niet vernietigen (W5, relatie-niveau)
fase: post-launch
priority: now
effort: ~2 dagen
owner: claude-code
status: done
created: 2026-08-14
completed: 2026-08-14
related-adr: docs/adr/2026-08-14-user-ownership-bij-re-analyse.md
related-spec: docs/specs/brandstyle-designbibliotheek-verbeterplan.md (W5)
worktree: branddock-refresh-preserves-user-data
---

# Probleem

W5 beloofde: *"re-scrape van een workspace met user-edits behoudt alle overrides en reviews"*. De
helft klopte. W5 fixte het **route**-niveau — de analyze-routes hergebruiken de styleguide-rij, dus
reviews, regels en snapshots overleven. Het **relatie**-niveau was nooit aangeraakt:

| Entiteit | Wat de engine deed | Gevolg |
|---|---|---|
| `StyleguideColor` | `deleteMany` (ongefilterd) + per rij `create` | handmatig toegevoegde kleuren weg; élke rij een nieuw `cuid` |
| `StyleguideLogo` | **ongefilterde** `deleteMany` | ook geüploade logo's weg — terwijl de comment erboven het tegendeel beweerde |
| `StyleguideComponent` | `deleteMany` + `createMany` | label-, stijl- en preview-edits weg |
| 8 × `*Donts`/guidelines | `result.x \|\| []` | lege AI-respons wist de gecureerde lijst |
| `StyleguideFont` | `deleteMany({ source: 'DETECTED' })` | **deed het wél goed** — dit is het patroon |

Daarbovenop: de zes `*Override`-vlaggen die de route-comments als bescherming aanhalen hadden
**geen enkele schrijver**. Ze stonden permanent op `false`.

Dit is de bugklasse uit `gotchas.md` waar de code het tegenovergestelde doet van wat de comment
belooft — en niemand merkte het, want er was geen enkele test die een refresh draaide.

# Voorstel

Het fonts-patroon generaliseren in plaats van iets nieuws verzinnen. Drie stappen: (1) `deleteMany`
mét provenance-filter, (2) de overlevende user-rijen lezen en hun natural keys bouwen, (3) de
inkomende analyzer-batch daartegen filteren vóór de `createMany`. Stap 3 is essentieel — zonder
suppressie verruil je dataverlies voor duplicaten.

Eigenaarschap krijgt de vorm van `StyleguideRule.source`: een `source String @default("scraped")`,
gestempeld op `'user'` door de routes waar de gebruiker iets wijzigt.

# Acceptatiecriteria

- [x] Een handmatig toegevoegde kleur overleeft een volledige re-analyse
- [x] Tags die een gebruiker op een kleur zette overleven (de rij is dan `user`)
- [x] Een geüpload logo overleeft, en er komt géén tweede scraped PRIMARY naast
- [x] Een bewerkt component overleeft, en de analyzer maakt geen duplicaat van hetzelfde
      `(type, label)`
- [x] Een gecureerde don'ts-lijst blijft staan wanneer de analyzer niets teruggeeft — **en ook
      wanneer hij wél iets teruggeeft**, zie Notes
- [x] Een door de gebruiker geschreven `photographyStyle`/`graphicElements`/… (de Json-helft van
      dezelfde secties) overleeft óók — anders is de halve sectie beschermd en de andere helft niet
- [x] `primaryFontName`/`typeScale` worden alleen door een **claim** beschermd, niet door de
      leeg-check: een site zonder herkenbare typeschaal is een geldig resultaat, en die stilzwijgend
      overslaan zou een stale schaal conserveren (zie Notes)
- [x] Een `*Override`-vlag die op `true` staat voorkomt aantoonbaar dat de scraper dat profiel
      overschrijft — de leescode bestond al, nu is er een writer
- [x] De website-scanner wist bij een re-scan geen bestaande styleguide meer, en dus ook geen
      regels, reviews of snapshots
- [x] De merkkleur behoudt haar sorteerplek na een tag-correctie (`pickBrand` kiest op sortOrder)
- [x] `PATCH /api/brandstyle` invalideert de cache — was de enige mutatieroute die dat niet deed
- [x] `npx tsc --noEmit` 0 errors · `npm run lint` 0 nieuwe errors (1 pre-existing op main:
      `export/design-system/[format]/route.ts` rules-of-hooks)
- [x] Bestaande gates groen: `smoke:brand-library` 36/36 · `smoke:styleguide-rules` 51/51 ·
      `smoke:styleguide-rules-fval` 17/17 · `smoke:review-drift` 23/23 ·
      `smoke:review-drift-reset` 14/14 · `eval:brand-manifest-golden` 14/14 ·
      `smoke:geo-fidelity` 20/20

# Bestanden die ik aanraak

**Nieuw**: `src/lib/brandstyle/preserve-user-rows.ts` (puur) ·
`scripts/smoke-tests/preserve-user-rows.ts` · `scripts/dev/verify-refresh-preserves.ts` ·
`docs/adr/2026-08-14-user-ownership-bij-re-analyse.md`

**Gewijzigd**: `prisma/schema.prisma` (4 kolommen) · `src/lib/brandstyle/analysis-engine.ts` ·
`src/lib/brandstyle/semantic-role-resolver.ts` (orderBy) ·
`src/lib/website-scanner/scanner-pipeline.ts` · `src/app/api/brandstyle/route.ts` ·
de vijf sectie-routes (`logo`, `imagery`, `typography`, `colors`, `design-language`) ·
`src/app/api/brandstyle/colors/[colorId]/route.ts` ·
`src/app/api/brandstyle/components/[id]/route.ts` · `eslint.config.mjs` ·
`scripts/fill-wra-juristen.ts` · `scripts/dev/seed-barneveld-brand.ts` ·
`scripts/dev/seed-branddock-brand.ts` · `package.json` · `docs/changelog.md`

Plus nieuw: `src/lib/brandstyle/claim-fields.ts` — het Prisma-laagje rond de pure claim-helpers,
zodat alle zes PATCH-routes dezelfde stempeling delen.

# Bestanden die ik NIET aanraak

- De token-provenance-laag (`originFromColor` kan straks `override` rapporteren — eigen taak)
- Stabiele kleur-id's via upsert-op-hex (bewust niet gekozen)
- `fonts/[id]` PATCH-edits op een DETECTED-rij — zelfde klasse, maar fonts hebben al een
  source-kolom; losse follow-up
- De publish-/review-semantiek

# Smoke test plan

1. `npm run smoke:preserve-user-rows` — 43/43, DB-vrij: de suppressie-helpers, de partiële update,
   het claim-mechanisme en `omitClaimed`.
2. `npx tsx scripts/dev/verify-refresh-preserves.ts` — 24/24: **twee echte analyses** op een
   wegwerp-workspace met user-edits ertussen. De enige test die de wiring bewijst — en die de
   ontwerpfout in de eerste versie boven water haalde.

   Eén van die 24 verdient toelichting: de harness voegt bewust óók een handmatige kleur toe mét een
   hex die de scraper wél vindt. Zonder dat geval is "de gebruiker houdt zijn eigen naam" een gratis
   assertie — de verversings-lus zou toch niets matchen, en het defect (een zelfgekozen naam die
   door de scrape wordt overschreven) zou er stil doorheen glippen.
3. Schema: lokaal een gerichte `ALTER TABLE` (zie Risico's), bij deploy een geverifieerde
   Neon-push.

# Risico's

- **Duplicaten in plaats van dataverlies** is de nieuwe faalmodus: matcht de suppressie-sleutel
  niet, dan verschijnt er een tweede rij. Gemitigeerd met lowercase-normalisatie; de echte run
  controleert expliciet op duplicaten.
- **De backfill kan niet raden wat handmatig was** — alle bestaande rijen worden `scraped`. Een
  bestaande handmatige kleur is dus nog één re-analyse lang kwetsbaar.
- **`scanner-pipeline` zit in het onboarding-pad.** De wijziging is dezelfde die de analyze-routes
  in W5 kregen, maar de echte run dekt alleen het re-scan-geval.
- **Schema-wijziging** → handmatige Neon-push mét verificatie-query (gotcha 2026-07-13). `prisma db
  push` liep opnieuw vast op de pre-existing `LandingPage.livePublishId`-drift (zie #463), dus de
  vier kolommen zijn met een gerichte `ALTER TABLE … ADD COLUMN IF NOT EXISTS` toegevoegd.

# Out of scope

- De feedback-loop (taak 4): regelovertredingen en user-overrides loggen en als curatie-suggesties
  tonen.
- Een UI voor de zes profielvelden — de API accepteert ze nu, de UI niet.

# Bekende beperkingen (bewust)

- **Een claim loslaten kan alleen via de API.** Er is geen "geef me de scraper-versie terug"-knop;
  het veld leegmaken is de enige weg terug.
- **`claim-fields.ts` doet read-modify-write zonder transactie.** Twee gelijktijdige sectie-saves
  kunnen één claim laten vallen. Single-user app, lage kans, niet de complexiteit van een
  optimistic lock waard — maar het staat hier zodat het niet als verrassing terugkomt.
- **Een component hernoemen naar een label dat een sibling van hetzelfde type al draagt** levert na
  de volgende analyse twee identieke labels op (de bewaarde rij keyt op `detectedLabel`, de verse op
  het gelijke `label`). Verwarrend in de UI, geen dataverlies.
- **Bestaande rijen zijn nog één re-analyse lang kwetsbaar** — de backfill kan niet raden wat ooit
  handmatig was. Wie op prod al gecureerde kleuren heeft staan, moet die dus opnieuw aanraken of ze
  met een gerichte UPDATE op `source: 'user'` zetten vóór de eerstvolgende scrape.

# Notes

## Wat de twee code-reviews eruit haalden

De eerste versie doorstond alle gates én de echte dubbele run, en had tóch negen defecten. Vier
daarvan ondermijnden het doel van de taak zelf:

1. **`iconographyDonts` ontsnapte volledig.** De regel `iconographyDonts: result.iconographyDonts || []`
   stond ná `...curated` in hetzelfde object-literal, dus de latere sleutel won. Zeven van de acht
   lijsten waren beschermd; de changelog claimde er acht. Niet te vangen door `tsc` of
   `no-dupe-keys` — een spread gevolgd door een expliciete sleutel is geldige TypeScript.
2. **De claim had geen schrijver — precies het gat dat ik bij de `*Override`-vlaggen aanklaagde.**
   `applyFieldClaims` hing alleen aan `PATCH /api/brandstyle`, maar de UI schrijft die velden via de
   vijf sectie-routes (`logo`, `imagery`, `typography`, `colors`, `design-language`). Erger: het
   verificatie-harnas zette `userEditedFields` rechtstreeks met Prisma en testte dus langs het gat
   heen. Nu loopt het harnas door `resolveFieldClaims` — dezelfde helper die de routes gebruiken.
3. **De sortOrder-herstempeling verplaatste de merkkleur.** `pickBrand` in de LP-renderer neemt de
   eerste PRIMARY op sortOrder. Eén tag-klik op de merkkleur schoof haar naar achteren, waarna de
   landingspagina's stilletjes een andere kleur kregen. User-rijen houden nu hun plek en de verse
   rijen vullen de gaten ertussen.
4. **`resolveSemanticTokens` had geen `orderBy`.** Dat werkte zolang elke analyse álle kleuren wiste
   en op volgorde herschreef. Nu rijen overleven is de fysieke rij-volgorde niet meer gelijk aan
   sortOrder, dus de "deterministische" resolver-output kon per run wisselen — met een spontane
   review-drift (#463) tot gevolg.

En vijf die het gedrag scheef zetten: de `colorPairings` misten de user-kleuren en draaiden de
`recomputeColorPairings`-fix uit #17/#18 terug; de logo-suppressie op `variant` hield één geüploade
LOCKUP alle gedetecteerde lockups laten blokkeren; een component-rename brak de natural key en gaf
alsnog een duplicaat (vandaar `detectedLabel`); de kleur-PATCH stempelde eigenaarschap ook bij een
lege body; en `PATCH /api/brandstyle` invalideerde als enige mutatieroute geen cache.

## Wat de derde ronde eruit haalde

Een re-review op de gecorrigeerde diff vond dat twee van de negen fixes zelf nieuwe randen hadden:

- **`recompute-color-pairings.ts` las de kleuren ook zonder `orderBy`.** Precies de gotcha die ik in
  dezelfde diff had opgeschreven, in de sibling die ik nu bij élke analyse aanroep.
- **De slot-discipline was niet doorgetrokken.** Componenten kregen `sortOrder: i` over de
  *ongefilterde* lijst, en de logo-upload-route geeft `sortOrder = aantal bestaande rijen` — allebei
  botsen zodra de detectievolgorde verschuift. Nu delen kleuren, componenten en logo's dezelfde
  `allocateFreeSlots`.

Plus vier die de dekking scheef lieten: de **Json-helften** van de imagery- en
design-language-secties (`photographyStyle`, `graphicElements`, …) waren via dezelfde routes
bewerkbaar maar niet claimbaar, dus de halve sectie was beschermd; vier sectie-routes misten nog
`invalidateCache`; `migrate-brand-dna/import.ts` — het pad dat op prod draait — stempelde geen
`source: 'user'` terwijl de drie seed-scripts dat wél deden; en de gedegradeerde PRIMARY-logo's
werden weggegooid in plaats van als LOCKUP bewaard.

Onderweg viel een **pre-existing bug** op die mijn eigen mechanisme blokkeerde: de typografieroute
accepteerde geen `null`, terwijl de UI dat stuurt zodra een veld leeg is. Een font-naam zonder URL
opslaan gaf dus een 400, en een claim op een typografieveld was daardoor niet los te laten. Schema
nu `nullable`, plus de ontbrekende `Prisma.JsonNull`-conversie voor `typeScale`.

## Afwijking van het plan: `userEditedFields`

Het plan ging uit van "partiële update" als volledige bescherming voor de acht don'ts-lijsten. De
**eerste echte dubbele analyse-run bewees dat dat te zwak was**: `onlyProvided` beschermt alleen
tegen een *lege* analyzer-respons, en op run 2 leverde de AI gewoon vier eigen `logoDonts` op — die
de gecureerde lijst overschreven. Het acceptatiecriterium was daarmee maar half gehaald.

Die velden hebben geen eigen rij en dus geen `source`-kolom. De oplossing volgt dezelfde gedachte:
`BrandStyleguide.userEditedFields String[]` houdt bij wélke lijsten de gebruiker zelf schreef,
gevuld door `PATCH /api/brandstyle` en gerespecteerd door `writeResultToDb`. Een veld leegmaken
geeft het terug aan de scraper. Zonder die extra kolom was de bescherming alleen op papier goed.

## De `*Override`-vlaggen hadden geen writer omdat er niets te schrijven viel

Bij de uitwerking bleek dat **geen enkele route de zes profielvelden accepteerde** — ze zijn
analyzer-only en het schema-comment zei letterlijk "voor toekomstige brand-onboarding UI". De
leescode in de engine (`analysis-engine.ts:1041-1076`) was compleet en correct; er was alleen nooit
iets dat de vlag aanzette. "Wiren" vroeg dus eerst een schrijver. De kleinste invulling: de
catch-all `PATCH /api/brandstyle` accepteert de zes velden en stempelt de bijbehorende vlag. Geen
nieuwe UI — die beslissing ligt bij de user.

## Sortering is betekenisdragend, geen presentatie

Bewaarde rijen **houden hun `sortOrder`**; de verse batch krijgt via `allocateFreeSlots` de posities
die overblijven. Dat geldt voor kleuren, componenten én logo's.

De eerste versie schoof user-rijen juist naar achteren. Dat leek onschuldig tot de review erop wees
dat `pickBrand` in de LP-renderer de eerste PRIMARY op `sortOrder` als merkkleur neemt: het toggelen
van één usage-tag op de merkkleur veranderde daarmee stilletjes de kleur van alle gegenereerde
landingspagina's. Dezelfde klasse zat in `resolveSemanticTokens` (geen `orderBy`) en in
`recompute-color-pairings.ts` (idem) — allebei werkten ze alleen zolang élke analyse de tabel leegde
en op volgorde herschreef.

## Componenten: alleen `sortOrder` telt niet als edit

`PATCH /api/brandstyle/components/[id]` stempelt `source: 'user'` bij een wijziging van `label`,
`extractedStyles` of `previewHtml` — niet bij een `sortOrder`-only PATCH. Die komt uit
drag-and-drop-herordening en zou anders per ongeluk het hele component bevriezen.

## Gevonden tijdens de uitvoering

1. **De component-extractor levert onder `tsx` niets op**: `page.evaluate` faalt met
   `ReferenceError: __name is not defined` (esbuild-helper die niet mee de browser-context in gaat).
   Zichtbaar op élke analyse in het harnas. Daardoor kon de echte run de component-suppressie niet
   op gescrapte data testen; het harnas maakt nu zelf een user-component aan zodat de scoped delete
   hoe dan ook gedekt is. **Pre-existing en los van deze taak** — maar het betekent wel dat de
   component-detectie in scripts stil niets doet.
2. **`dam-auto-tagger` faalt nog steeds met `400 temperature is deprecated for this model`** —
   3× per analyse, dus 6× in deze dubbele run. Al gemeld bij #459, nog steeds open.
3. **De kleur-`deleteMany` staat ~450 regels vóór de `create`-loop** in dezelfde functie. Faalt er
   iets tussenin, dan houdt de workspace nul kleuren over. Met de scoped delete is dat minder erg
   (user-kleuren blijven), maar het venster bestaat nog.
