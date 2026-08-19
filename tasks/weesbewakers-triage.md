---
id: weesbewakers-triage
title: 73 bewakerbestanden hebben geen npm-script en draaien dus nergens — 55 daarvan zijn groen
fase: post-launch
priority: next
effort: 2-4 uur
owner: claude-code
status: open
created: 2026-08-19
completed:
related-adr: -
related-spec: -
worktree: -
---

# Probleem

De survey van 19-08 (`slapende-bewakers-survey`) telde **78 smoke/eval-scripts in
`package.json`** en haakte daar 44 van aan. Die telling heeft een blinde vlek: een
bewakerbestand **zonder npm-script** komt er niet in voor.

Gemeten: **73 bestanden** in `scripts/smoke-tests/` en `scripts/eval/` zijn niet
bereikbaar vanuit een npm-script, ook niet via een import vanuit een bereikbaar
script. Daarvan draaien er **55 groen**, zonder database en zonder sleutels
(gemeten met een dode `DATABASE_URL` en ongeldige API-sleutels), samen **1.084
asserties**.

Gevonden doordat `smoke:deep-research` in de bewaker-audit uitkwam op een
`assertSafeUrl`-wijziging in `search.ts`; het naspeuren wie dát bewaakt leidde
naar `ssrf-guard.ts` — bestaand, groen, 65 asserties, nooit gedraaid.

## De splitsing

| groep | bestanden | asserties | oordeel |
|---|---:|---:|---|
| `web-page-builder-phaseNN` (junireeks) | 27 | 529 | ⚠️ vraagt ontdubbeling |
| overige, losse onderwerpen | 28 | 555 | direct bruikbaar |
| rood of timeout | 18 | — | apart uitzoeken |

⚠️ **De junireeks is geen simpele winst.** `smoke:web-page-builder` draait een
ketting van ~53 phase-bestanden via `&&`, maar dat is een **andere serie met
dezelfde nummers**: de ketting heeft `phase45-typescale-normalizer` (aug), de wezen
`phase45-result-audit` (5 juni). De junireeks 40-68 is nooit aan de ketting
toegevoegd. Of dat abandonnement of bewuste opvolging is, vraagt oordeel per
bestand — ze zijn wél allemaal groen, dus ze toetsen levende code.

## ⚠️ Scherper gemeten: 76 src-modules hebben GEEN aangehaakte bewaker

De eerste splitsing hierboven telt bestanden. Belangrijker is welke **code** daardoor
onbewaakt is. Gemeten door de imports van alle aangehaakte bewakers (161 modules) af
te trekken van de imports van de wezen:

**76 `src/`-modules worden alléén door een weesbewaker geraakt.** Per gebied:

```
14  lib/brandstyle        3  lib/landing-pages     1  lib/utils
10  lib/ai                3  lib/brand-fidelity    1  lib/stripe
 8  lib/brandclaw         2  lib/export            1  lib/scraping
 8  lib/agents            2  lib/email             1  lib/products
 5  lib/content-test      2  lib/content-locale    1  lib/integrations
 4  lib/content           2  lib/competitors       1  lib/deliverable
 4  features/campaigns                             1  lib/constants
                                                   1  lib/claw · 1 lib/brandmd
```

⚠️ **`lib/agents` staat er met acht modules bij** — de complete registry
(`run-agent`, `artifact-contract`, `run-collector`, `data-analyst/query-tools`,
`schedules/cadence`). Dat is code die volgens de projectstand op **productie
draait**, met bewakers die er wél zijn maar nooit hebben gedraaid.

Dit maakt de junireeks-vraag ook kleiner. Van de 27 `web-page-builder-phaseNN`-
wezen importeren er **10** uitsluitend modules die de augustus-ketting óók raakt —
die zijn kandidaat om te verwijderen. De andere **17** raken modules die de ketting
niet aanraakt: `css-var-resolver`, `framework-defaults`, `color-pairings`,
`palette-usage-filter`, `observed-color-pairings`, `non-brand-colors`,
`semantic-role-resolver`, `component-extractor`, `variant-copy-diff`,
`canvas-angle-generator`, `fidelity-token-guard` en `google-fonts-catalog`.

## De 28 losse, gesorteerd op asserties

```
 65  ssrf-guard                      12  violation-dedup
 52  deliverable-content-accessor    11  brand-language-detect
 46  competitor-diff-engine          11  claw-fencing
 32  photography-token-truncation    10  agent-schedule-cadence
 31  property-evals                   8  enforce-brand-name-capitalization
 30  sanitize-strategy-output         7  security-medium
 29  feature-visual-prompts           6  plan-enforcement
 25  heuristic-stem-variants          3  compose-pipeline-gemini
 25  plan-and-solve                   3  ui-content-locale-separation
 23  section-edit-synthetic-ids       1  brandmd-emitter
 20  feature-visual-preserve          1  brandmd-lifecycle
 19  apify-fallback-chain
 19  auto-iterate
 18  edit-distance
 18  tree-of-thoughts-angles
 16  position-swap-judge
 14  feedback-compiler
```

**Twee daarvan zijn beveiligingsbewakers.** `ssrf-guard.ts` is op 30-06 gecommit
als onderdeel van `faf2dbe6` ("SSRF-convergentie — fetch-with-limit→safeFetch") en
heeft sindsdien nooit gedraaid. `security-medium.ts` idem sinds 26-06.

## Junireeks mechanisch ontdubbeld (2026-08-19)

Het voorstel hieronder vraagt een oordeel per bestand: opvolging of abandonnement?
Dat oordeel is grotendeels overbodig gemaakt door eerst te bepalen **welke code**
alleen door een wees wordt geraakt — de imports van de 55 kettingleden afgetrokken
van die van de 27 wezen.

| uitkomst | aantal | wat het betekent |
|---|---:|---|
| raakt uitsluitend modules die de ketting al dekt | **10** | verwijder-kandidaat |
| raakt modules die nergens anders getoetst worden | **17** | ✅ aangehaakt |

**De 17 dragen samen 401 asserties** en dekken vrijwel de complete
brandstyle-palet-stack, die op productie draait en waar geen enkele aangehaakte
bewaker naar keek:

```
lib/brandstyle/color-pairings           lib/brandstyle/analysis-engine
lib/brandstyle/palette-usage-filter     lib/brandstyle/non-brand-colors
lib/brandstyle/observed-color-pairings  lib/brandstyle/css-var-resolver
lib/brandstyle/framework-defaults       lib/brandstyle/google-fonts-catalog
lib/landing-pages/brand-images          features/../useBrandFontLoader
```

⚠️ Vóór het aanhaken door de drift-detector gehaald, want juni-bewakers op een
stack die in augustus is verbouwd (#255-#259) is precies het risicoprofiel. 8 van
55 frases hadden een latere src-wijziging — allemaal fixture-namen (`'Ocean Blue'`)
of generieke woorden (`'headline'`, `'subhead'`). Alle 17 draaien groen.

### De 10 verwijder-kandidaten

**Niet verwijderd** — dat is een aparte beslissing en verwijderen is onomkeerbaar.
Wat hieronder staat is de meting, niet het besluit.

```
phase40-brand-fallback-no-leak    phase58-card-context
phase53-lp-contrast               phase59-accent-reservation
phase54-lp-rhythm                 phase62-button-component-reconcile
phase56-feature-images            phase63-section-band-alternation
phase57-font-assets               phase65-variant-angle-prompt
```

⚠️ **"Raakt dezelfde module" is niet hetzelfde als "toetst hetzelfde gedrag".**
Twee bewakers kunnen `color-pairings` importeren en er totaal andere dingen mee
doen. Wie deze tien wil opruimen, leest eerst wát het kettinglid met diezelfde
module toetst. De import-overlap maakt de leeslijst kort; hij vervangt de leesbeurt
niet.

# Voorstel

1. De 28 losse een npm-script geven en aanhaken in `scripts/ci/run-guards.sh`
   (~4s totaal). Begin bij `ssrf-guard` en `security-medium`.
2. De junireeks per bestand beoordelen: gedekt door de augustus-ketting, of
   verloren dekking? Wat gedekt is, verwijderen; wat niet, aanhaken.
3. De 18 rode apart uitzoeken — een rode wees kan een verouderde assertie zijn
   (de klasse uit #375/#393) of een echte regressie die niemand ziet.

# Acceptatiecriteria

- [x] **De 28 losse hebben een npm-script en draaien in een gate** — #399 (3) en
      #408 (25). Samen 546 asserties.
- [x] **Elk van de 27 junireeks-bestanden is beoordeeld** — #412. Mechanisch in
      plaats van per bestand: 17 raken modules die de ketting niet dekt en zijn
      aangehaakt, 10 raken uitsluitend al-gedekte modules.
      ⚠️ Die 10 zijn **niet verwijderd**, en dat is bewust. "Raakt dezelfde
      module" is niet hetzelfde als "toetst hetzelfde gedrag" — de import-overlap
      maakt de leeslijst kort, hij vervangt de leesbeurt niet. Het criterium is
      dus gehaald op *beoordeeld*, niet op *opgeruimd*.
- [x] **De 18 rode zijn getrieerd** — #411. Veertien hebben een echte database
      nodig, twee een sleutel, één is een CLI-tool, en precies één had een
      verouderde assertie (`checkpoint-gates`, rood op een correcte vertaling).
- [~] **`lib/agents` heeft bewaking in een gate** — deels. `agents-foundation`
      loopt in #413 (parallelle sessie). `agents-data-analyst` kan niet in CI
      draaien: hij hardcodeert de dev-workspaces Zwarthout en Linfi. Dat is
      herschrijfwerk tegen de seed en verdient een eigen task-file, geen regel
      hier.
- [ ] **`package.json`-telling is niet langer de bron van waarheid** — nog open,
      en dit is het criterium dat er het langst toe blijft doen.

      De hele survey begon met een telling uit `package.json`, en juist daardoor
      bleef `ssrf-guard.ts` onzichtbaar: 65 asserties op een beveiligingsoppervlak,
      gecommit bij een SSRF-fix eind juni, zonder npm-script. Een bewaker die niet
      meetelt als bewaker vind je niet door beter naar je lijst te kijken.

      ✅ **Gebouwd: `smoke:guard-wiring`** (2026-08-19). Hij legt de bestandslijst
      naast de gate-lijst en wordt rood bij een nieuw bestand zonder aanhaking —
      dezelfde vorm als `smoke:route-language`, die faalt bij *vergeten* in plaats
      van bij toevoegen. Zijn eerste bevinding was hijzelf.

      De 51 die bewust stilstaan hebben nu elk een reden in `NIET_AANGEHAAKT`,
      gegroepeerd: sleutel, database, cli, herschrijf, of gedekt-door-de-ketting.
      ⚠️ Die lijst is **schuld, geen uitzonderingslijst** — hij hoort te krimpen.
      Een tweede check meldt dode regels, zodat de lijst zelf niet kan verrotten.

## De poort is deterministisch — gemeten, 2026-08-19

Een gate van 119 bewakers is alleen bruikbaar als een rood vinkje te vertrouwen is.
Eén flakey bewaker maakt het geheel ruis, en dan gaat men rood negeren — exact de
faalwijze uit de golden-set-gotcha van 07-07.

Drie keer achter elkaar gedraaid, per bewaker exit-code én assertie-aantal
vergeleken:

    3 rondes × 119 bewakers = 357 datapunten
    afwijkend: 0

⚠️ **Wat dit niet aantoont**: dit is lokaal gemeten, sequentieel, op één machine.
CI draait op een andere OS met koude caches en andere timing. Het zegt dus dat de
bewakers zélf deterministisch zijn — niet dat de CI-omgeving dat is. De
e2e-hangups van 18-08 zaten in de omgeving, niet in de bewakers.

⚠️ En "nul afwijkend" is pas bewijs omdat de opzet is nagekeken: alle drie de
rondes registreerden 119 regels met echte exit-codes en assertie-aantallen. Een
lege vergelijking geeft ook nul verschillen.

## Wat de poort kost — gemeten 2026-08-19

Ná de groei van 18 naar 119 bewakers, uit zes geslaagde CI-runs op main
(8m32s–10m11s totaal, timeout 30 min):

| stap | tijd | aandeel |
|---|---:|---:|
| `npm run build` | 2m03s | 22% |
| **de bewakers-poort** | **1m54s** | **21%** |
| `npm run lint` | 1m27s | 16% |
| `npx tsc --noEmit` | 1m20s | 14% |
| `npm ci` | 1m04s | 11% |
| `typecheck:scripts` | 0m35s | 6% |
| taalbewaker + CSP-sweep | 0m14s | 1% |

⚠️ **"Aanhaken is bijna gratis" gold bij 18 bewakers en geldt niet meer.** Die zin
staat een paar keer in de commit-geschiedenis van vandaag en klopte op het moment
van schrijven; bij 119 is de poort de op één na duurste stap. Lokaal is het 64s,
in CI 1m54s — de runner is trager, dus lokaal meten onderschat.

Er is nu ruimte zat (30 min timeout, ~9 min gebruikt). Maar wie er nog honderd bij
wil hangen, meet eerst in plaats van de oude uitspraak over te nemen.

# Risico's

- **Een groene wees kan verouderd zijn.** Groen betekent hier "draait en toetst
  iets", niet "toetst het júiste". De junireeks is van begin juni; het gebied is
  sindsdien flink verbouwd. Draai `git log -S` op de asserties vóór je iets een
  regressie noemt (zie #375, #393).
- **Aanhaken is niet neutraal.** Een slapende bewaker aanzetten maakt van elke
  bevroren assertie een actieve blokkade — precies wat er bij
  `smoke:geo-directives` gebeurde.

# Notes

Meetmethode: elk bestand gedraaid met `DATABASE_URL` naar een dode poort en alle
`*_API_KEY` op `ongeldig`. ⚠️ De assertie-teller moet **drie** formaten aan: de
`✓`/`PASS`-markers, `N passed` en `Total: N`. Een eerste versie telde alleen de
markers en gaf bij `ssrf-guard` **"nul asserties"** terwijl hij er 65 doet — dat
las als een vals vinkje terwijl het een telfout was.
