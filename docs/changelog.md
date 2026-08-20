# Branddock Changelog

Chronologisch overzicht van wat is gebouwd. Wordt automatisch bijgewerkt door de `task-finalize` skill na elke afgeronde task.

## Hoe te navigeren

| Periode | Plek | Format |
|---|---|---|
| **Entry #1 t/m #221** (R0.1 → BSTY-FONTS, dec 2025 - mei 2026) | `docs/archive/old-lists/CLAUDE-original-2026-05-07.md` "ACTIELIJST" sectie | Originele oude format, niet gemigreerd om tijd te besparen — volledig grep-baar |
| **Entry #222+** (vanaf 2026-05-07) | dit bestand, h2 per maand | Nieuw gestandaardiseerd format (zie hieronder) |

**Waarom niet alles gemigreerd?** De 221 historische entries vertegenwoordigen ~6 maanden zwaar werk en zijn perfect doorzoekbaar in het archief. Manueel reformatteren zou een dag werk kosten zonder substantiële winst — een grep door het archief geeft hetzelfde resultaat.

**Voor zoekvragen** "wanneer was X gebouwd?" of "wat deden we met Y?":
```bash
grep -n "<zoekterm>" docs/archive/old-lists/CLAUDE-original-2026-05-07.md
```

---

## Format per entry (vanaf #222)

```markdown
### <number>. <Task title>

<1-2 zin samenvatting van wat gebouwd werd en hoe het werkt.>

- Task: [tasks/done/<id>.md](tasks/done/<id>.md)
- ADR: <link of `-`>
- Spec: <link of `-`>
- Commit: <short hash>
```

Numbering wordt auto-incremented door `task-finalize` skill, doorgaand vanaf #222.

---

## 2026-08

### 515. De nieuwspagina liep een maand achter

Nieuwste item was 18 juli, terwijl er in augustus wel degelijk dingen landden die een klant
merkt. Vijf items toegevoegd in klanttaal, met de cijfers erbij: content die leeg leek is weer
zichtbaar (13 pagina's van 0 naar 497-1.306 woorden), gepubliceerde pagina's hebben weer een
titel, weglopen tijdens een generatie kost niets meer, de campagnewizard levert weer complete
campagnes (1 → 8 deliverables, 18-24 min → 6), en merkregels tellen mee in de merk-check.

Bewust **niet** overgenomen: het merendeel van de augustus-changelog is intern werk — bewakers,
CI, type-checks. Dat hoort niet op een klantpagina.

- Task: -
- ADR: -
- Spec: -

### 514. Acht van de elf asset-typen waren onzichtbaar in elk BRAND.md

Erik vroeg "vul Positioning in" op zijn eigen merk. De data bleek er al te staan.
`summarizeBrandAsset` zoekt in `frameworkData` naar vijf vaste sleutels — `statement`,
`promiseStatement`, `coreMessage`, `essence`, `why` — en Branddocks essence gebruikt
`essenceStatement` + `essenceNarrative`. Geen match, lege string, `_Not yet defined._` in
het bestand, terwijl de tekst in de database stond.

Gemeten op productie over 13 workspaces met framework-data, niet aangenomen:

| Asset-type | Treffers oud → nieuw |
|---|---|
| brand-archetype | 0 → 12 |
| brand-essence | 0 → 12 |
| mission-statement | 0 → 12 |
| social-relevancy | 0 → 12 |
| brand-story | 0 → 11 |
| transformative-goals | 0 → 11 |
| brand-personality | 0 → 9 |

**79 samenvattingen gerepareerd over 7 typen.** De drie die al werkten (`brand-promise`,
`golden-circle`, `purpose-statement`) blijven exact gelijk — die gebruiken toevallig wél een
sleutel uit de oude lijst. `brand-essence` voedt de Positioning-subsectie, dus élk gegenereerd
BRAND.md — het artefact van de gratis funnel — miste zijn positionering.

**Bewust niet gemapt**: `valueTension` (core-values). Dat veld beschrijft de spanning tússen
waarden, niet de waarden zelf; als samenvatting emitten zou het merk verkeerd weergeven. Leeg
is daar eerlijker dan misleidend.

⚠️ **Waarom geen enkele bewaker dit ving**: `smoke:brandmd-emitter` start bij een
fixture-`DesignSystemModel` — dus mét samenvattingen. Het samenvátten zelf had nul dekking.
Nieuwe bewaker `smoke:brand-asset-summary` (16 checks, ondergrens 16 in de gate) draagt de
echte sleutelnamen uit productie en bevat een mutatietest die aantoont dat de oude lijst
7 typen leeg liet.

Bijvangst: de kop van `run-guards.sh` claimde 119 bewakers terwijl de lijst er op `origin/main`
al 121 telde. Nu geformuleerd als meetmoment, met het telcommando erbij.

Nog open, als apart besluit: [`fval-personality-extern-pad`](tasks/fval-personality-extern-pad.md)
— `score_against_brand` geeft `personality: null` door en draait pijler 1 daardoor half.

- Task: [tasks/fval-personality-extern-pad.md](tasks/fval-personality-extern-pad.md)
- ADR: -
- Spec: docs/specs/brand-md-full-profile.md

### 513. brand.md stond nergens op de nieuwspagina — en leek daarna op de MCP-connector

De publieke nieuwspagina (`/marketing/changelog`) noemde `brand.md` **nul keer**, terwijl de
gratis generator sinds **12 augustus** live staat (commit `52521a51`) en de pagina in zijn eigen
kop zegt: *"nieuwe release = nieuwe entry hier"*. Die pagina is bovendien de vaste bron voor de
LinkedIn-cadans, dus wat er niet op staat wordt ook niet gedeeld. Nieuwste item was 18 juli: de
pagina liep een maand achter.

Toegevoegd: een entry voor de generator met een verdiepingslink naar het uitleg-artikel
(#507). `ChangelogEntry` heeft daarvoor een optioneel `href` + `linkLabel` gekregen; entries
zonder link renderen ongewijzigd.

⚠️ **Erik ving er een verwarring uit die ik zelf had gemaakt.** Mijn eerste tekst beloofde "het
open bestand waarmee ChatGPT, Claude, Cursor en elke andere AI-tool je merk kennen" — vrijwel
woordelijk wat het MCP-item twee plekken lager belooft ("je agent kent je merk"). Twee losse
producten met dezelfde belofte, boven elkaar. Beide teksten zeggen nu wat ze zijn:
**brand.md is een bestand dat je zelf meeneemt** (open standaard, gratis, geen account, en dus
een momentopname), **de MCP-connector is een levende koppeling** die altijd de actuele versie
ophaalt. Het brand.md-item wijst expliciet naar dat verschil.

De datum komt uit `git log --diff-filter=A`, niet uit het launch-kit: dat noemt 15 augustus,
maar dat was de dag dat de generator live is *getest*.

- Task: [tasks/done/brandmd-artikel.md](tasks/done/brandmd-artikel.md)
- ADR: -
- Spec: docs/marketing/brand-md-launch-plan-2026-08-02.md
### 514. De drie golden-set-vragen waren er twee minder — en één ervan was mijn eigen meetfout
### 515. De golden-set bewaakt nu ook de prompt die we écht shippen

De promptfoo-set genereert met een eigen inline prompt, niet met de productiecode. Een regressie
in `BLOG_POST_SYSTEM` was daardoor onzichtbaar, en de kwaliteitsscores beschreven een artefact dat
geen gebruiker krijgt. Erik koos optie A: allebei, gescheiden.

`scripts/eval/blog-post-golden/run.ts` — 16 asserties naar het precedent van `lp-variant-golden`.
Geen database (`GenerationContext` is vier platte strings), geen API-sleutel, geen AI-call: hij
bouwt de productie-prompt en toetst hem. Draait in de goedkope PR-poort.

Naast het contract dat de rubrics aannemen (keyword-in-H1, meta-description, géén FAQ) bewaakt hij
vooral dat merk-, persona-, campagne- en brief-context echt in de prompt landen. Dat is de ergste
faalmodus van dit product: prompt gebouwd, generatie geslaagd, merk afwezig.

Getoetst dat hij een breuk merkt in plaats van alleen groen te zijn: de H1-belofte uit
`BLOG_POST_SYSTEM` verwijderd geeft 1 van 16 rood op de juiste check; alle meta-vermeldingen
weghalen geeft er 2. Eén van de drie weghalen laat hem groen — hij toetst het contract, niet een
regel. Volledige poort na aanhaken: **122 bewakers, 0 gefaald**.

De promptfoo-set blijft ongewijzigd. Die beantwoordt "is de tekst goed?" ($0,34 per nacht, hoort
's nachts); deze runner "is de prompt nog heel?" (deterministisch, gratis, in de poort). Optie B
zou beide in één ding hebben gepropt en dat betaald met de enige historische reeks die er is.

- Task: [tasks/golden-set-blogpost-quality.md](../tasks/golden-set-blogpost-quality.md)
- ADR: -
- Spec: -

### 513. De drie golden-set-vragen waren er twee minder — en één ervan was mijn eigen meetfout

Twee van de drie "productbesluiten" bleken geen vragen aan Erik maar fouten in de eval.

**A — aannames in de tekst.** De rubric eiste dat de AI bij een vage brief zijn aannames
zichtbaar benoemt ín het artikel. `prompt-templates/helpers.ts:119` schrijft het
tegenovergestelde voor: *"If any answer is unclear... Mentally adjust BEFORE writing — then
produce only the final content."* Het product had de vraag dus al beantwoord, alleen niet op de
plek waar de eval keek. Waar aannames wél horen wist het ook: de SEO-pijplijn zet ze in een
gestructureerd briefing-veld, niet in de copy.

**B — keyword in de H1.** ⚠️ **Correctie op changelog 512.** Daar staat dat de letterlijke
term "twee van de vier nachten" in het artikel stond en de assert daarom een muntworp was. Dat
klopt niet. De term stond er élke nacht in; `promptfoo`'s `contains` is **hoofdlettergevoelig**
en faalt zodra elk voorkomen aan een zinsbegin of in een kop staat — 0 kleine-letter-treffers op
17 en 19 augustus, 1 op 18 en 20. Perfecte correlatie over vier nachten. De H1 was alle vier de
nachten identiek en droeg de volledige zoekterm; er viel niets te kiezen tussen streng en krom.

Gefixt als H1-assert, hoofdletterongevoelig — precies wat productie belooft en wat de eval-prompt
bestelt. Getoetst tegen de vier opgeslagen artikelen: 4/4 waar de oude F P F P gaf, met tegenproef
(faalt nog steeds zonder H1, bij een keyword alleen in de body, en bij een H1 zonder keyword).
Twee latente exemplaren meegenomen: `brand strategy` had in twee nachten één kleine-letter-treffer
in het hele artikel.

**C — de 70%-drempel.** Gecorrigeerd naar 60/70/70/90% (was 50/70/60/90; twee nachten werden door
de bug gedrukt). Advies: nu niets doen en over vier nachten opnieuw meten. Een drempel kiezen op
data van vóór de fixes is opnieuw op de rand kalibreren — de fout die deze taak beschrijft.

**Bijvangst die groter is dan de drie vragen.** #350 haalde de meta-descriptie-eis uit de rubric
met als reden dat productie er geen bestelt. De uitkomst was juist — de eval-prompt bestelt er
geen — maar de reden niet: `BLOG_POST_SYSTEM` noemt de meta-description **drie keer**. De meting
van 18-08 keek naar de user-prompt-formatregel, terwijl het outputcontract in de systeemprompt
staat.

De drift-guard die dit moest borgen had dezelfde blinde vlek: hij toetste letterlijk *"en het
bestelt geen meta-description"* op die user-prompt-regel, waar het antwoord triviaal nee is. Hij
bevestigde de premisse in plaats van hem te toetsen. Nu verbreed naar de systeemprompt en de
divergentie beide kanten op vastgepind (productie wel meta / geen FAQ; eval-prompt geen meta / wel
FAQ). Guard van 5 naar 8 checks, ondergrens in de poort mee bijgewerkt.

- Task: [tasks/golden-set-blogpost-quality.md](../tasks/golden-set-blogpost-quality.md)
- ADR: -
- Spec: -

### 512. CLAUDE.md gaf sinds 18-08 CSS-advies dat tegen de eigen ADR inging

Vier regels in `CLAUDE.md` beschreven de Tailwind-situatie van vóór PR #323. Ze stuurden een
nieuwe sessie regelrecht tegen ADR `2026-08-18-tailwind-bronpijplijn.md` in — en tegen wat
`src/index.css` inmiddels zelf in zijn kop zegt.

| Wat er stond | Waarom fout |
|---|---|
| "`src/index.css` is een gecompileerde, gecommitte output" | sinds #323 een echte bron met `@import "tailwindcss"` |
| "Voor missende utilities: append regel aan `src/index.css`" | het bestand zegt letterlijk: *voeg hier GEEN handgeschreven utility-klassen toe* |
| "`min-h-0` werkt niet door purge" | **nagemeten en onwaar**: de klasse staat in de gebouwde CSS |
| "Tailwind 4 purge issues" (verboden patroon 5) | purge was de verkeerde diagnose — er wordt niets gesnoeid, er kwam alleen nooit iets bij |

Gevonden bij het bouwen van #507: mijn eigen controle meldde eerst dat álle 17 gebruikte
klassen ontbraken, wat een kapotte detector bleek in plaats van kapotte CSS. Zonder die
tweede toets was ik het advies gevolgd en had ik een handgeschreven utility toegevoegd aan
een bestand dat dat verbiedt.

Vervangen door wat er nu geldt, inclusief de guard (`npm run smoke:css-utilities`, gedraaid:
2.737 bestanden, 847 utilities, 0 ontbrekend) en de twee Tailwind 4-eigenaardigheden uit de
gotcha. `CLAUDE.md` blijft op 279 regels, onder zijn eigen grens van 300.

- Task: [tasks/done/brandmd-artikel.md](tasks/done/brandmd-artikel.md)
- ADR: docs/adr/2026-08-18-tailwind-bronpijplijn.md
- Spec: -
### 511. Tenant-isolatie van de agents werd nergens getoetst — en de makkelijke fix maakte de bewaker leeg

`smoke:agents-data-analyst` toetst dat de data-analyst-agent van workspace A geen rijen van B ziet. Hij kon nergens draaien: hij zocht de dev-workspaces *Zwarthout* en *Linfi* op naam, die alleen in één persoonlijke database bestaan. Geen npm-script, dus ook nooit opgemerkt — gevonden in de weesbewaker-triage.

⚠️ **De task-file waarschuwde voor een val die niet bestond, en dat was mijn fout.** Ik schreef dat "pak de twee workspaces uit de seed" hem groen én leeg zou maken, omdat `TechCorp Brand` nul concurrenten heeft. De assertie eist echter `namesA.size > 0 && rowsB.length > 0 && overlap.length === 0` — beide kanten niet-leeg. Empirisch getoetst vóór de fix: `FAIL ... A=3 B=0 overlap=0`. Luid rood, precies zoals het hoort. Ik had de assertie moeten lezen vóór ik hem als risico opschreef; de correctie staat in het task-bestand zelf.

De seed geeft `TechCorp Brand` nu twee concurrenten met niet-overlappende namen, en de bewaker zoekt de workspaces op **slug** in plaats van op naam of volgorde. **MUTATIETEST**: `workspaceId`-filter uit `query_competitor_activity` gehaald → `FAIL ... A=5 B=5 overlap=5`. De assertie detecteert dus een echte isolatie-breuk. Risico uit de taak nagelopen: hele db-gate 17/17 groen met de nieuwe seed, 18/18 met deze erbij.

- Task: [tasks/agents-data-analyst-seed-fit.md](../tasks/agents-data-analyst-seed-fit.md)
- Commit: PR #428

### 510. De db-gate had geen assertie-ondergrenzen — één van de zeventien kon stil leeglopen

De goedkope gate kreeg ondergrenzen; de database-gate niet. Daarmee kon een bewaker naar nul asserties zakken en tóch groen melden — wat `smoke:settings-write` diezelfde ochtend letterlijk deed (exit 0 zonder `SMOKE_DB=1`).

`tel_asserties` is **letterlijk overgenomen** uit `run-guards.sh` in plaats van opnieuw bedacht: twee varianten van dezelfde telling lopen gegarandeerd uit elkaar. Hij neemt het maximum van assertie-regels en het getal uit een samenvattingsregel, want een bewaker die alleen `65 passed` print telt anders als **1** — en een ondergrens van 1 beschermt niets.

**MUTATIETEST**: grens 2 → 50 op een bewaker die er 2 doet → *"groen, maar 2 asserties waar er >=50 werden verwacht"*.

⚠️ Er staat een waarschuwing bij die vijf keer nodig bleek: **meet deze grenzen door de bestanden uit `origin/main` te draaien, niet via `npm run` op de werkboom.** Die liep 15 commits achter, kende de nieuwe scripts niet, en `npm run` op een ontbrekend script geeft **stil niets** — tien bewakers kwamen daardoor als "0 asserties" uit de meting.

- Commit: PR #422

### 509. Eén prompt sprak zichzelf tegen over stat-bronnen, 27 regels uit elkaar

De junifix van 24-06 (changelog #340) diagnosticeerde scherp: de **geforceerde** bron was de directe oorzaak dat het model er een verzon, en de brand-context-lagen *zijn* onderdeel van "de aangeleverde context". Die fix patchte `variant-generator.ts` maar niet het directive-blok dat via regel 747 in **dezelfde prompt** landt — waar regel 774 sinds die fix het tegenovergestelde zegt.

⚠️ En sinds het aanhaken van de slapende bewakers **dwong CI de verouderde helft actief af**: wie het promptbestand fatsoeneerde kreeg rood, en de goedkoopste weg naar groen was de oude tekst terugzetten.

Directive uitgelijnd op het beleid van ná de junifix (echte externe bron óf weglaten, nooit een interne laagnaam), **herformuleerd in plaats van geschrapt** omdat `geo-polish` dezelfde directive gebruikt. Versie naar 1.1.0.

**Het belangrijkste deel zijn drie asserties op de SAMENGESTELDE prompt.** Beide bestanden waren op zichzelf verdedigbaar; alleen hun combinatie was fout — en dat was met geen enkele check op één bestand te betrappen. Tweede vindplaats in dezelfde PR: de sanitizer-tak in `geo-analysis.ts` stond sinds 24-06 onbewaakt, want de fixture droeg alleen een echte bron.

- Commit: PR #393

### 508. `.design-sync` stond volledig buiten de type-check — 34 previews zonder vangnet

TypeScript's `**/*.ts` slaat dot-mappen over, dus `.design-sync/**` zat in **nul** type-checks: de contractlaag van het design system plus 34 previews. Een preview die een verwijderde prop gebruikt, rendert verkeerd in de componentkiezer zonder dat iets rood wordt.

Twee regels in `tsconfig.json` (include + een path-mapping voor `'branddock-app'`, de bundlernaam die de previews importeren). **MUTATIETEST**: een niet-bestaande prop op `<Button>` → `TS2322`, en na herstel exit 0. Twee driftcontroles erbij die borgen dat die regels blijven staan.

Bijvangst: de uitsluiting van `StatsCard` uit het design system stond op *"`import * as LucideIcons` blies de bundel op"*. Die reden verviel toen de iconenregistry landde. Gemeten waarom hij er tóch niet hoort — 1 gebruiker tegen 34 voor `StatCard`, en een zwakkere `icon: string` — en de reden vervangen op alle drie de plekken waar hij stond.

- Commit: PR #373

### 507. brand.md-artikel live op de marketing-site — en wat de eigen pipeline ervan bakte

Cornerstone-pagina `/marketing/resources/brand-md` bij de gratis generator: wat het formaat is,
hoe het zich verhoudt tot `llms.txt` en `AGENTS.md`, waarom Branddock een bestaande standaard
omarmt in plaats van een eigen te lanceren, en het verdienmodel expliciet benoemd (gratis
bestand, betaald onderhoud). NL, volgens het patroon van `resources/f-val`, met FAQ +
FAQPage-JSON-LD.

**De dogfooding is de eigenlijke uitkomst.** Het artikel is geschreven met de eigen long-form
SEO-pipeline via de MCP-connector (launch-plan §5: "dogfooding als bewijs"). Die leverde na
±35 minuten 2.664 goed gestructureerde woorden op die **niet publiceerbaar** waren: 6 verzonnen
interne links (alle 6 een 404), een F-VAL-cijferpaar "61 → 84" zonder enige bron, het door de
hermeting van 21-07 al gecorrigeerde "+12 op nieuwsbrieven", een verzonnen klantcasus die in
werkelijkheid persona Jesse Kramer is, géén vermelding van Caio Pizzol/MIT/spec v0.3.0, en géén
verwijzing naar de gratis generator. De pipeline kent de merk*stem* wel en de merk*strategie*
niet: wat in `docs/marketing/` staat, bereikt de generatie niet.

Gebruikt als grondstof (FAQ-vraagvormen, de sectie "wat het niet oplost"), niet als eindtekst.
F-VAL op de geplaatste tekst: **78 → 93** (TOP_TIER, baseline-positie 31 → 6) na het wegwerken
van em-dash-overdaad, twee buzzword-adjectieven en twee ongefundeerde cijferclaims.

Na Eriks review nog drie wijzigingen: de FAQ gebruikt nu het bestaande `<details>`-patroon met
roterende `ChevronDown` (zoals homepage en pricing), de trial-microcopy staat onder de knop
waar hij bij hoort in plaats van onder een rij van drie (de primaire knop is juist het gratis,
accountloze pad), en er is een tweede CTA halverwege toegevoegd.

⚠️ Beide scores zijn op **2 van de 3 pijlers** gemeten: de stijl-pijler had gewicht 0. Nagemeten
op prod — niet de styleguide (die staat op `published = true`, 9 regels) maar de **voiceguide**:
niet gepubliceerd en zonder centroid.

- Task: [tasks/brandmd-artikel.md](tasks/brandmd-artikel.md)
- ADR: -
- Spec: docs/marketing/brand-md-launch-plan-2026-08-02.md (v2, §3 omarm-strategie) + docs/marketing/launch-wig-besluit.md (optie C)

### 506. De taalbewaker hing aan typekit en posthog — een verplichte poort met een externe faalbron

`check` ging flappen op main zodra de browserfase aanstond: rood, groen, groen, rood binnen
twintig minuten zonder tussenliggende relevante wijziging. Gemeld door een parallelle sessie,
die main nakeek vóórdat hij concludeerde dat het aan zijn eigen PR lag.

De eerste diagnose — `waitUntil: 'networkidle'` is niet-deterministisch — klopte, maar alleen
die vervangen loste niets op: met `domcontentloaded` liep de navigatie net zo goed vast. Pas
het méten van wat `/marketing/pricing` werkelijk ophaalt wees de oorzaak aan: tien externe
verzoeken, die verschillende mijlpalen blokkeren. De typekit-stylesheet staat in `<head>` en
houdt de parser tegen (en dus DOMContentLoaded); de vier PostHog-scripts blijven pollen (en dus
treedt networkidle nooit in). De "voor de hand liggende" fix verhuisde naar een mijlpaal die
ná de blokkade ligt.

De eigenlijke fout was dus niet de wachtconditie maar dat een **verplichte** poort afhing van
de uptime van `typekit.net` en `posthog.com` — terwijl de check gaat over `<html lang>`, een
attribuut van onze eigen server en hydratie waar geen van beide aan meedoet. Nu wordt alles
buiten de eigen host afgekapt.

Bewust niet gedaan: wachten tot het attribuut de verwachte waarde heeft. Dat maakt de assertie
zichzelf waar — een fout-maar-stabiele waarde wordt dan een timeout in plaats van een leesbare
FOUT-regel.

Bewijs: vijf opeenvolgende rondes tegen een productiebuild (5× exit 0, 22 checks, 38-39s), plus
een mutatietest waarbij een omgedraaide verwachting exit 1 geeft met FOUT op zowel de server-
als de browserregel. Bij flakiness bewijst één groene run niets, en zonder de mutatie weet je
niet of je de bewaker hebt gerepareerd of stilgelegd.

Detail dat de diagnose scherper maakte: in de **geslaagde** CI-run duurde de navigatie 24,6s van
de 30s limiet. De marge was er nooit — het is geen "tweede navigatie faalt" maar "beide zaten
tegen de limiet".

- Task: -
- ADR: -
- Spec: -
- PR: #445

### 505. Judge-variantie gemeten zonder één betaalde AI-call — en de drempel-vraag blijkt verkeerd gesteld

De judge-variantie op de blog-post golden-set stond weken als "kost live-LLM-runs, ~55k tokens
per run, bewust niet autonoom gestart". Die aanname klopte niet: de nachtelijke `live-eval`
draait dagelijks dezelfde tien cases en bewaart per run een artefact. Vier nachten stonden nog
in GitHub (17 t/m 20 augustus; ouder was verlopen). Herhaalde runs op identieke invoer *zijn*
de meting — de vraag was al betaald, alleen niet opgehaald.

**De rubric veranderde middenin het venster** (`d090ce58`, 18-08 om 23:22 — ná de nachtrun van
18-08, vóór die van 19-08). Alle vier de nachten als één reeks lezen had die wijziging als
variantie geteld. Gesplitst in twee regimes van elk twee identieke runs werd de meting juist
scherper: het scheidt echte variantie van het effect van de fix, en bevestigt onafhankelijk dat
#350 deed wat hij beloofde (`SEO-focus extreem` gaat van stabiel-zakken naar stabiel-slagen,
zonder beweging bínnen een regime).

**Het slaagpercentage schommelt 40 punten op identieke invoer**: 50% / 70% / 60% / 90% over de
vier nachten, met de gate op 70%. Dat herkadert het openstaande besluit. De kop van
`golden-sets.yml` stelt dat het echte niveau ~50-60% is en dat 70% daar net boven ligt, dus dat
de gate flapt. Het werkelijke probleem is niet wáár de lijn ligt: tien cases waarvan er drie
wisselen geven een spreiding van ±20 punten, en dan flapt elke lijn tussen 50 en 90. Meer cases
of de wisseling wegnemen helpt; de lijn verschuiven niet.

**Eén flip bleek geen judge-variantie.** `contains 'handgemaakte vloeren'` wisselde F P F P — een
substring-check kan niet van mening veranderen, dus de variantie zit in de generatie. Dat is
precies het openstaande productbesluit B, nu met een getal: in de huidige vorm is die assert een
muntworp. Omgekeerd staat de vage-brief-case vier nachten op exact 2,50 en zakt elke keer; die
lost op met besluit A, niet met meer data.

Bijvangst: drie task-files droegen een claim van een sessie die niet meer bestaat, met opgeruimde
worktrees. Voor wie werk zoekt lezen die als "bezet" — één ervan was deze taak. Twee opgeschoond;
de derde bewust niet, want daar zit een open PR op het bestand.

- Task: [tasks/golden-set-blogpost-quality.md](../tasks/golden-set-blogpost-quality.md)
- ADR: -
- Spec: -

### 504. Beslispunt 0 opgelost — en de risico-analyse eronder klopte niet

`test:csp` en `smoke:document-lang-browser` stonden als kostenafweging op Eriks lijst: ze
draaien nergens en vragen een build, een database en een browser. Nagemeten viel die afweging
de andere kant op. De CSP-sweep heeft een **productiebuild** nodig (nonce-gedrag verschilt van
dev), dus naar de `e2e`-job verhuizen had dáár een tweede build gekost; chromium in `check` was
de goedkope kant.

Nu draaien **14 van de 15** CSP-checks en beide fasen van de taalbewaker. De vijftiende blijft
eruit en dat is geen open beslissing meer maar een feit: hij logt in en vraagt een geseede
database die deze job niet heeft.

**Wat het werkelijk kostte**, tegen 8m58s daarvoor:

```
Browsercache            0m03s
Install chromium        OVERGESLAGEN — cache-hit
taalbewaker fase 1+2    0m59s   (was 0m09s)
CSP-sweep               0m16s   (was 0m05s)
hele check-job          10m21s  (+1m23s, limiet 30 min)
```

⚠️ De hele risico-analyse ging over een chromium-**download** en de hangs van 18-08. Dat
gevaar geldt niet op het normale pad: de cachesleutel is dezelfde die de `e2e`-job al vult, dus
de installatie wordt overgeslagen. De dominante nieuwe kost is fase 2 van de taalbewaker
(+50s), niet de browser — precies de post die niemand had aangewezen.

- Task: [tasks/document-lang-followups.md](../tasks/document-lang-followups.md)
- Commit: PR #436, #437

### 503. Fase 2 van de taalbewaker was stuk en toetste niets

Bij het voorbereiden van die chromium-stap gaf fase 2 drie navigatie-scenario's rood. Dat leek
een productbug in `DocumentLangSync` — de component die juist bestaat om `<html lang>` bij
client-side navigatie bij te werken.

Eerst uitgesloten dat het product stuk was: de pure beslissingslogica klopt voor alle drie de
gevallen. Toen drie navigatie-mechanismen naast elkaar, startend op `/marketing/pricing`
(lang="nl") en navigerend naar `/` (verwacht "en"):

```
kale pushState              lang: nl -> nl   pathname=/
pushState + popstate        lang: nl -> nl   pathname=/
echte klik op een next/link lang: nl -> en   pathname=/
```

**Alleen de klik werkt.** Bij `pushState` verandert de URL wél maar de React-router niet, dus
het effect draait niet — die scenario's faalden ongeacht het gedrag van de component en hebben
nooit iets bewezen. Het comment erboven beweerde het omgekeerde en wees de klik-aanpak
expliciet af; juist die is de enige die werkt.

Nu 22 checks correct. Twee scenario's melden zich luid als overgeslagen omdat er geen link van
de app-shell naar `/marketing` of `/brandmd` is — een grens van wat er kán gebeuren, geen
dekkingsgat.

⚠️ Dit stond op het punt aangehaakt te worden als "zeven checks voor de prijs van één
chromium-installatie". Drie van die zeven waren leeg. Exit-code en assertie-aantal bewijzen dat
een bewaker draait, niet dat hij het juiste vastlegt — ook, en juist, bij je eigen bewakers.

- Task: [tasks/document-lang-followups.md](../tasks/document-lang-followups.md)
- Commit: PR #435

### 502. Mijn eigen schuldlijst klopte voor de meerderheid niet

Bij `smoke:guard-wiring` (#419) hoorde een lijst van **51 bewakers die "bewust stilstaan"**, elk
met een reden: sleutel, database, cli, herschrijf, of gedekt-door-de-ketting. Ik vulde die
redenen deels in uit eerdere classificaties en deels uit de bestandsnaam, en schreef er in
dezelfde commit bij dat de lijst hoort te krimpen.

**Toen heb ik ze nagemeten. 38 van de 51 kwamen groen terug** met een dode `DATABASE_URL` en
onbruikbare sleutels. De labels "database" en "sleutel" klopten voor de meerderheid niet.

Dat is precies waarom een onbewezen label niet in een schuldlijst hoort: **hij ziet er compleet
uit, en niemand toetst hem meer.** Eenenvijftig keurig gegroepeerde redenen lezen als werk dat
gedaan is.

De laatste tien stonden er als *"gedekt door de ketting"* — een claim op MODULE-overlap, terwijl
ik er zelf bij had geschreven dat dat geen gedragsoverlap is. Uitgewerkt bleek die waarschuwing
terecht: twintig kettingleden importeren `brand-tokens`, maar geen ervan toetst of het merk van
de ene klant niet in dat van de andere lekt — wat `phase40` wél doet. Ze zijn aangehaakt in
plaats van verwijderd: redundante dekking kost twee seconden, een ten onrechte verwijderde
bewaker kost een regressie.

Gate: 81 → **119 bewakers** in 64s. Stilstaande bewakers: 51 → **13**, en die dertien zijn
stuk voor stuk gedraaid en falen aantoonbaar.

- Task: [tasks/weesbewakers-triage.md](../tasks/weesbewakers-triage.md)
- Commit: PR #421, #424

### 501. `package.json` is niet langer de bron van waarheid — de bestandslijst is dat

De slapende-bewakers-survey begon met een telling uit `package.json`, en juist daardoor bleef
`ssrf-guard.ts` onzichtbaar: 65 asserties op een beveiligingsoppervlak, gecommit bij een
SSRF-fix eind juni, zónder npm-script. Dat is een andere blinde vlek dan "een bewaker die niet
draait" — het is een bewaker die **niet meetelt als bewaker**, en die vind je niet door beter
naar je lijst te kijken.

`smoke:guard-wiring` legt de bestandslijst naast de gate-lijst. Een nieuw bestand in
`scripts/smoke-tests/` of `scripts/eval/` dat nergens draait, maakt CI rood — dezelfde vorm als
`smoke:route-language`: falen bij *vergeten*, niet bij toevoegen. Zijn eerste bevinding was
hijzelf.

Een tweede check meldt **dode regels** in de schuldlijst: een bestand dat inmiddels wél draait
of niet meer bestaat. Zonder die check kan de lijst zelf verrotten — precies de fout die deze
survey blootlegde.

- Task: [tasks/weesbewakers-triage.md](../tasks/weesbewakers-triage.md)
- Commit: PR #419

### 500. De junireeks ontdubbeld zonder 27 handmatige oordelen

`smoke:web-page-builder` ketent 55 phase-bestanden aan elkaar, maar dat is een **andere serie
met dezelfde nummers**: de ketting heeft `phase45-typescale-normalizer` (augustus), de wezen
`phase45-result-audit` (5 juni). De junireeks 40-68 is nooit aan die ketting toegevoegd, en de
triage vroeg een oordeel per bestand: opvolging of abandonnement?

**Dat oordeel is grotendeels overbodig gemaakt door eerst mechanisch te bepalen welke code
alleen door een wees wordt geraakt** — de imports van de 55 kettingleden afgetrokken van die
van de 27 wezen:

| uitkomst | aantal |
|---|---:|
| raakt uitsluitend modules die de ketting al dekt | 10 — verwijder-kandidaat |
| raakt modules die nergens anders getoetst worden | **17** — aangehaakt |

Die 17 dragen **401 asserties** en dekken vrijwel de complete brandstyle-palet-stack:
`color-pairings`, `palette-usage-filter`, `observed-color-pairings`, `non-brand-colors`,
`analysis-engine`, `css-var-resolver`, `framework-defaults`, `google-fonts-catalog`,
`landing-pages/brand-images`. Code die op productie draait en waar geen enkele aangehaakte
bewaker naar keek.

De 10 verwijder-kandidaten zijn **niet** verwijderd. "Raakt dezelfde module" is niet hetzelfde
als "toetst hetzelfde gedrag" — de import-overlap maakt de leeslijst kort, hij vervangt de
leesbeurt niet.

- Task: [tasks/weesbewakers-triage.md](../tasks/weesbewakers-triage.md)
- Commit: PR #412

### 499. Van 3 draaiende bewakers naar 80 — en wat dat in dekking oplevert

De weesbestanden-triage telde 73 bewakerbestanden zonder npm-script. Daarvan zijn er in drie
stappen 45 aangehaakt (#399, #408, #411, #412), plus negen database-bewakers door een
parallelle sessie (#410). De goedkope PR-poort ging van 18 naar **80 bewakers in 47 seconden**.

**Het cijfer dat ertoe doet is een ander.** Modules die alléén door een niet-draaiende bewaker
werden geraakt: **76 → 15**. Dat 45 aangehaakte bewakers maar ~21 modules toevoegen, is zelf
de bevinding: veel bewakers dekken code die al gedekt was. Bestandsaantallen overdrijven de
winst; wie "80 bewakers" rapporteert meet activiteit, niet dekking.

Twee dingen die het aanhaken zelf opleverde:

**`ssrf-guard.ts` had 65 asserties en heeft nooit gedraaid.** Gecommit bij een SSRF-fix eind
juni, zonder npm-script, dus onzichtbaar voor elke telling die `package.json` leest. Dat is een
tweede blinde vlek naast "een bewaker die niet draait": een bewaker die niet eens meetelt als
bewaker — en die vind je niet door beter naar je lijst te kijken.

**De assertie-ondergrens kon 65 en 1 niet onderscheiden.** Bewakers die alleen een samenvatting
printen (`SSRF-guard: 65 passed`) werden als 1 geteld, en een ondergrens van 1 beschermt niets.
`tel_asserties()` neemt nu het maximum van assertie-regels en het getal uit een
samenvattingsregel. Nagemeten dat de correctie nodig was: de oude telling gaf op een versie met
3 asserties exact hetzelfde getal als op de echte met 65.

- Task: [tasks/weesbewakers-triage.md](../tasks/weesbewakers-triage.md)
- Commit: PR #399, #408, #412

### 498. Een bewaker die twee maanden rood stond op een correcte vertaling

Van de 18 rode weesbewakers had er precies **één** een verouderde assertie. De andere 17: veertien
hebben een echte database nodig, twee een sleutel, en één is helemaal geen bewaker maar een
CLI-tool die argumenten verwacht.

`smoke:checkpoint-gates` eiste de Nederlandse zin `"Workspace heeft 3 persona(s)"`. Die is op
2026-06-17 vertaald in commit `35097c25` — *"migrate crept-in Dutch UI/communication text to
English"* — een bewuste migratie, want de product-UI is monolinguaal Engels (ADR 2026-06-17).
De bewaker faalde dus **op een correcte vertaling**, twee maanden lang, ongezien: hij had geen
npm-script en draaide nergens.

Nu getoetst op het **gedrag** in plaats van op de zin: geen pass, severity `warn`, en de reden
noemt het aantal én de campagne-koppeling. De controle-mutatie maakt het punt — de melding
opnieuw vertalen (naar Duits) houdt hem groen, terwijl het weghalen van het aantal of de
koppeling hem laat omvallen.

⚠️ De eerste twee mutaties beten níet, en dat lag aan de mutaties: één vindplaats vervangen van
`campaign` (7× in het bestand) en van `severity: 'warn'` (11×). Een zwakke mutatie ziet eruit
als een zwakke assertie. Tel de vindplaatsen vóór je muteert.

- Task: [tasks/weesbewakers-triage.md](../tasks/weesbewakers-triage.md)
- Commit: PR #411

### 497. Een bewaker met een adres maar zonder bestemming — en drie keer een meting die het tegenovergestelde bewees

`smoke:db-ssl-mode` draaide nergens. Geen bewuste uitzondering: `run-db-guards.sh:36`
verwijst hem expliciet door met "goedkope groep in run-guards.sh, niet hier" — naar een plek
waar hij nooit is aangekomen. Hij bewaakt iets dat stil verzwakt: ná de pg-major betekent
dezelfde `sslmode=require`-string versleuteld **zonder** certificaat- en hostnaamcontrole.
Nu aangehaakt (15 asserties, 0,27s, puur), met een mutatietest op de gate-regel zelf —
ondergrens 14 geeft exit 0, ondergrens 999 exit 1. Dat een regel in het bestand staat bewijst
niet dat hij draait.

De leesbeurt vóór het aanhaken (regel uit #494) leverde meteen een gat op, en van een soort
die nog niet in de categorieën zat: **`no-verify` krijgt `level === 'ok'`.** Binnen de lens
van de bewaker klopt dat — `no-verify` wordt niet zwakker door de major, want hij is al zwak.
Maar `env-validation.ts` leest diezelfde uitkomst als "geen bezwaar", óók met
`DATABASE_SSL_STRICT=true`. De strengste stand laat de zwakste modus door. Niet stil
gerepareerd: de check zit op het productie-startpad, dus de assertie is geannoteerd met wat
`ok` hier wél en niet betekent, plus waarom `weakening` de functie over haar eigen onderwerp
zou laten liegen. Als beslispunt bij Erik neergelegd.

**Drie keer bewees een meting het tegenovergestelde van wat de tekst beweerde.** Dat is de
rode draad van deze entry, niet de bewaker.

1. **Twee lokale branches zouden ongepusht werk dragen** — inclusief Eriks besluiten van die
   dag. Onjuist: `git cherry` gaf patch-equivalent, en hun "unieke" inhoud was de ónafgevinkte
   versie van checklists die in main al afgevinkt stonden. Oorzaak: `rev-list --left-right`
   omgekeerd gelezen (45 commits *achter*, niet vooruit) en een three-dot diff gebruikt als
   bewijs van afwezigheid. Beide gaven een net, niet-leeg antwoord. Als gotcha vastgelegd —
   derde variant van "zit dit al in main?" in één week, na `merged: true` en "open task-file
   bewijst niets".
2. **`START_HERE` zei op drie plekken "44 van 44 merkfonts"** terwijl het task-file sinds
   18-08 "29 van de 44" zei en Eriks besluit van 19-08 er 18 van maakte. De sessie-opener liep
   achter op zijn eigen bron, in de top 3, op de plek die elke nieuwe sessie als eerste leest.
3. **De verklaring voor vier lage F-VAL-scores klopte niet.** Het losse eindje wees naar
   Napkings niet-gepubliceerde styleguide en vroeg "sluit dat eerst uit". Gemeten:
   `linkedin-poll` en `twitter-thread` hebben **nul** unpublished-metingen, en bij
   `linkedin-post` scoort de gepubliceerde groep juist tien punten lager (68,9 tegen 78,7).
   Op prod staat Napking gewoon op `published = true`.

   ⚠️ Het mechanisme eronder bestaat wél: de stijl-pijler is 87,8 (published) tegen 59-69
   (unpublished). `brand-context.ts:1242` gate't zeven contextvelden op die vlag,
   `styleguide-rule-compiler.ts:126` zet de rules-pijler op nul. Het verklaart déze vier
   scores alleen niet. **Bijvangst op prod**: `better brands` is de enige unpublished
   styleguide mét content (22 regels, 5 deliverables) — die zijn dus zonder merkcontext
   gemaakt. Plus drie workspaces met die naam, twee leeg.

- Task: [tasks/pg-major-sslmode-semantiek.md](../tasks/pg-major-sslmode-semantiek.md)
- ADR: `-`
- Spec: `-`
- Commit: PR #395, #397, #398

### 496. De taalbewaker en de CSP-policy draaien weer — en één sweep bleek half gratis

`smoke:document-lang-browser` is gebouwd nadat élke bezoeker `lang="en"` kreeg op een
Nederlandse pagina (#335). Daarna draaide hij nergens, want hij vroeg een server **én** een
browser. Die twee zijn ontkoppeld: fase 2 zit achter `SMOKE_BROWSER=1`, fase 1 draait in de
`check`-job tegen `next start` — 10 checks, geen chromium nodig.

Dezelfde vraag gesteld aan `test:csp`, die óók nergens draaide terwijl hij de enige
automatische bescherming is onder de enforce-flip. **Van de 15 checks vragen er negen geen
browser en geen database**: de vier policy-checks en de vijf nonce-integriteitschecks gaan via
Playwrights `request`-fixture. Gemeten door `PLAYWRIGHT_BROWSERS_PATH` naar een lege map te
wijzen — zonder die lege map zegt "het werkt hier" niets over een runner zonder browsers.

De zes overige gebruiken `page` en wachten op een kostenafweging. Beslispunt 0 in
`START_HERE.md` is daarmee van "0 van de 15 draait" naar "9 van de 15 draait" gegaan.

Erbij: een nieuwe bewaker die faalt bij **vergeten** in plaats van bij toevoegen. Wie een
publieke route bouwt en hem niet indeelt voor `<html lang>`, krijgt nu rood — de bewaker leest
de bestandsboom, niet een lijst. Alle 25 bestaande routes zijn geclassificeerd.

- Task: [tasks/document-lang-followups.md](../tasks/document-lang-followups.md)
- ADR: `-`
- Spec: `-`
- Commit: PR #380, #384, #385

### 495. Vier openstaande punten werden geen code — en dat is de uitkomst

Sectie C van `document-lang-followups` leverde vier keer een meting op in plaats van een fix.
Elk daarvan bespaart de volgende sessie werk dat niets had opgeleverd.

**Een `not-found.tsx` repareert de `/p`-404 niet.** De diagnose luidde "er is nergens een
`not-found.tsx`, dus Next' foutdocument vervangt de root layout" — wat impliceert dat er één
toevoegen het oplost. Gebouwd op beide niveaus, twee builds: de eigen 404-tekst rendert, de
status klopt, en het `<html>`-element draagt nog steeds géén `lang`. Het echte onderscheid
bleek uit de productiemeting ernaast: alleen een `notFound()` uit een *dynamisch segment*
verliest de layout; `/marketing/bestaat-niet` houdt hem gewoon.

**`decideHostRoute` heeft geen bewaker nodig** — de Next-build valt om met 6 fouten zodra je
er Prisma in importeert, want `DocumentLangSync` is een client-component. Een tweede controle
daarop zou nooit rood worden zonder dat de build eerder rood is.

**De CSP-sweep-fixture levert nul draaiende checks op** zolang de browser-groep op een
kostenafweging wacht. Eerst bouwen zou een slapende bewaker toevoegen aan een lijst die
diezelfde dag juist is opgeschoond.

**De drie landingspagina-lookups lopen echt uiteen**, maar prod heeft één rij en dev twee,
allebei zonder dubbele slug. Gelijktrekken vraagt een antwoord op welke rij juist is bij twee
gepubliceerde locales — locale-onderhandeling, en dat hoort bij het multi-markt-spoor.

Bijvangst die wél code werd: bij `publish` beweerde een comment dat on-demand revalidation
"het primaire verversmechanisme van de statisch gecachte render-route" is. Die route is niet
statisch gecacht. Alle drie de `revalidatePath`-aanroepen zeggen nu wat ze doen — niets — en
waarom ze toch blijven staan.

- Task: [tasks/document-lang-followups.md](../tasks/document-lang-followups.md)
- ADR: `-`
- Spec: `-`
- Commit: PR #386, #387, #388, #389, #390

### 494. Een slapende bewaker aanzetten is niet neutraal

Op één dag gingen 15 bewakers van "draait nergens" naar "blokkeert elke PR". Dat is de
bedoeling, maar er zat een gevolg aan dat vooraf niet is meegewogen: **elke bevroren assertie
in zo'n bewaker wordt daarmee een actieve blokkade op de fix van precies datgene wat hij
verkeerd bewaakt.**

`smoke:geo-directives` assert dat de GEO-directive de tekst "Citeerbare stats MET bron"
draagt. Dezelfde prompt zegt 27 regels verderop het tegenovergestelde: een first-party
merk-cijfer krijgt `source: null`. Die tweede helft is de fix van 24 juni (`2f78eec3`,
changelog #340) — een verplichte bron dwong het model er één te *verzinnen*, meestal een
interne context-laagnaam die als bronvermelding op de klantpagina belandde.

Zolang die bewaker nergens draaide was dat sluimerend. Sinds hij in de PR-poort staat dwingt
CI de verouderde helft áf: wie de directive fatsoeneert krijgt rood, en de goedkoopste weg
naar groen is de oude tekst terugzetten. Precies de fout die #375 moest herstellen, nu
geautomatiseerd.

De prompt is niet gewijzigd — dat is een generatie-kwaliteitsafweging. De assertie draagt nu
de hele uitleg, inclusief dat **zij** moet meebewegen en niet de directive terug. Gevonden
door een parallelle sessie, onafhankelijk nagetrokken op alle drie de vindplaatsen.

- Task: [tasks/slapende-bewakers-survey.md](../tasks/slapende-bewakers-survey.md)
- ADR: `-`
- Spec: `-`
- Commit: PR #391, #392

### 493. Twee bewakers bleken bevroren: één bewaakte de weggehaalde bug, de ander mocht niet draaien

`smoke:geo-generation-prompt` stond sinds **24 juni** ongezien rood. De assertie eiste de
letterlijke tekst `VERPLICHTE bron` in de GEO-prompt — een eis die in `2f78eec3` bewust was
weggehaald, omdat een verplichte bron het model dwong er één te verzinnen (meestal een interne
laagnaam als `brand-context`, die als bronvermelding op de klantpagina belandde). De bewaker
faalde dus op een *verbeterde* prompt, en niemand zag het omdat hij nergens draaide.

Vervangen door twee asserties op de reparatie in plaats van op de weggehaalde eis: de prompt
moet een interne laagnaam als bron verbieden, en een bronloos first-party cijfer toestaan.
Beide nagemeten door die zinnen uit de prompt te slopen.

`smoke:locale` hield 30 gratis asserties gevangen achter twee live AI-calls. Laag 2 draaide
onvoorwaardelijk, dus altijd exit 1 zonder sleutel, dus nergens aan te haken. Nu opt-in via
`SMOKE_AI=1` — zelfde vorm als `SMOKE_DB=1` — met een luide melding van wat er *niet*
getoetst is.

Gate: 29 → **31 bewakers**.

- Task: [tasks/slapende-bewakers-survey.md](../tasks/slapende-bewakers-survey.md)
- ADR: `-`
- Spec: `-`
- Commit: PR #375

### 492. Elf bewakers met 2.315 asserties draaiden niet omdat een variabele ontbrak, niet omdat ze een database nodig hadden

Elf bewakers golden als "heeft een database nodig". Ze crashen in werkelijkheid op een
**ontbrekende** `DATABASE_URL`, niet op een onbereikbare: 71 van de 78 smoke-scripts laden zelf
geen env-file, dus `src/lib/prisma.ts` valt om bij het *importeren* — nog vóór er één assertie
draait. Met een gezette-maar-dode URL komen ze alle elf groen terug, samen ~17s, aangevoerd door
`smoke:web-page-builder` met 1914 asserties.

Daarnaast draagt elke bewaker in `run-guards.sh` nu een **assertie-ondergrens**: groen mét te
weinig asserties faalt. Exit 0 bewijst niet dat er iets getoetst is — zo belandde
`smoke:settings-write` groen op een aanhaaklijst zonder één assertie te draaien. Nagemeten op een
bewaker die exit 0 geeft en niets doet.

Gemeten dat de gezette URL het gedrag van de oorspronkelijke 18 bewakers niet verandert: zelfde
exit-codes, zelfde assertie-aantallen, 18 van de 18.

- Task: [tasks/slapende-bewakers-survey.md](../tasks/slapende-bewakers-survey.md)
- ADR: `-`
- Spec: `-`
- Commit: PR #374

### 491. De type-check draait in twee processen — en dekt aantoonbaar nog steeds alles

De CI-type-check piekt op 4,95 GB en zat daarmee ver boven Node's default heap; vandaar de
8 GB-bump van 15-08. `tsconfig.json` dekt nu alleen de app (2750 bestanden, piek 4,12 GB),
`tsconfig.scripts.json` de overige 491 (piek 3,39 GB), met een eigen CI-stap.

**De bump blijft nodig** — 4,12 GB ligt nog altijd boven de default. De splitsing koopt marge,
geen oplossing.

De kern is de controle eromheen: met `tsc --listFilesOnly` is vergeleken wat beide configs samen
zien tegen de config van vóór de splitsing — 3241 tegen 3241, nul bestanden verloren. Die
vergelijking verdiende zichzelf meteen terug: de eerste include gebruikte `scripts/**/*.ts` en
liet acht `.tsx`-render-scripts stil buiten de dekking vallen.

- Task: [tasks/done/build-heap-investigation.md](../tasks/done/build-heap-investigation.md)
- ADR: `-`
- Spec: `-`
- Commit: PR #372

### 490. Zeven database-bewakers draaien nu in de e2e-job — en de weg ernaartoe legde drie meetfouten bloot

De `check`-job draait sinds #358 de goedkope bewakers; de groep die een échte database nodig heeft stond nog stil. Die hoort in `e2e`, want daar draait al een postgres en heeft `global-setup` het schema gepusht en geseed. `scripts/ci/run-db-guards.sh` draait er zeven, in 156s, ná de e2e-suite (twee ervan muteren: `lp-retention` wist rijen, `review-drift-reset` zet reviewstatussen terug).

⚠️ **De PR begon op vijftien en eindigde op zeven.** Alle drie de correcties hadden dezelfde vorm — gemeten in een omgeving die stiller meehielp dan gedacht:

1. **Lege database.** Geseed veranderde de uitkomst compleet: `smoke:context-priority` ging van "30s, 0 toetsen" naar "1s, 9 toetsen", en `seo-wiring`, `review-drift-reset` en `styleguide-rules-fval` van ROOD naar groen. Eén bewaker stond op het punt afgeschreven te worden als hol terwijl hij er negen toetst.
2. **`.env.local` laadde een sleutel stil mee.** `smoke:seo-wiring` was lokaal groen omdat npm `--env-file-if-exists=.env.local` gebruikt; in CI viel hij om met **1 PASS / 19 FAIL** op een ontbrekende `ANTHROPIC_API_KEY`. Hij hoort in de sleutelgroep.
3. **`env -u VAR` neemt een variabele niet weg** als `.env.local` hem bevat. Daardoor zaten zeven bewakers in de DB-groep die de database niet aanraken — `smoke:web-page-builder` slaagt met **1893 asserties** tegen een onbereikbare database. De werkende toets is een onbruikbare wáárde zetten, niet unsetten: een reeds gezette variabele wint wél van `--env-file`.

**Bijvangst, en het gevaarlijkste gat**: `smoke:settings-write` gaf zonder `SMOKE_DB=1` **exit 0** terwijl hij weigerde te draaien — groen zonder één assertie. Een parallelle sessie had precies die bewaker in haar lijst van "infrastructuurvrij" staan; door de melding is hij daar weggehaald vóór hij als vals vinkje in de PR-poort belandde. Andersom bleek uit die sessie dat vijf van mijn vijftien juist géén database nodig hadden.

`run-db-guards.sh` zet `SMOKE_DB=1` zelf en neemt daarom de rem over die het daarmee wegneemt: het weigert tegen een `DATABASE_URL` die niet lokaal is of geen `test` in de naam draagt. Niet theoretisch — een parallelle sessie richtte diezelfde dag bijna wissende bewakers op haar eigen dev-database.

- Task: [tasks/slapende-bewakers-survey.md](../tasks/slapende-bewakers-survey.md) (meting), PR #368
- ADR: `-`
- Spec: `-`
- Commit: PR #369

### 489. Merk-domein-componenten in het design system — NO-GO, gemeten op productiedata

`validate-brand-domain-component-fit` vroeg of het design system eigen componenten moest krijgen voor merkbegrippen (persona-kaart, merkregel, F-VAL-score) in plaats van generieke primitives. De drempel is **vóór** de eerste query vastgelegd in commit `c775fff0` — anders beslist de uitkomst achteraf wat "genoeg" was.

**Uitkomst: NO-GO.** De gemeten hergebruikfrequentie bleef onder de vooraf vastgelegde drempel; de bestaande primitives dekken de gevallen zonder dat er een merkspecifieke laag bij hoeft. De afweging staat volledig in het draft-bestand, inclusief de condities waaronder dit heropend hoort te worden.

⚠️ De waarde zit hier niet in de bouw maar in het níet bouwen — en in het feit dat de drempel niet meer verschoven kón worden toen de data tegenviel.

- Task: [tasks/_drafts/idea-brand-domain-specific-components.md](../tasks/_drafts/idea-brand-domain-specific-components.md) (`verdict: no-go-voorlopig`)
- ADR: `-`
- Spec: `-`
- Commit: PR #365

### 488. De CI-hersteltap uit #351 brak zelf elke PR met een cache-hit

#351 bracht tijdslimieten en hertes tegen de drie CI-hangs van 18-08 (30, 30 en 93 minuten, alle drie op de browserdownload). Eén stap daarin — apt draaien bij een cache-hit — faalde vervolgens op **élke** PR met een cache-hit.

**Root-cause**: apt is niet veilig af te kappen. Poging 1 werd op 180s afgebroken, poging 2 en 3 vielen om op de staat die de afgebroken transactie achterliet. Een parallelle sessie fixte in #362 de lock-conflicten (`DPkg::Lock::Timeout`); geverifieerd dat dat de klasse niet oploste — een run mét die fix faalde op dezelfde stap.

**De fix draait het om**: bij een cache-hit draait er nu **helemaal geen apt**. De e2e-suite is daarna groen, en dat is meteen het bewijs dat `ubuntu-latest` de chromium-bibliotheken zelf al meebrengt. ⚠️ Daarmee verschuift ook het vermoeden over de oorspronkelijke hangs: alle drie zaten op een stap die apt draaide.

- Task: `-` (CI-herstel)
- ADR: `-`
- Spec: `-`
- Commit: PR #364 (na #351, #362)

### 487. Het design system kon op drie manieren stil verrotten — nu bewaakt

De sync naar claude.ai/design levert 35 componenten met 103 beoordeelde previews. Drie manieren waarop dat stil uit de pas loopt zijn nu afgevangen door `smoke:design-sync-drift`: propcontracten die afwijken van de bron, i18n-namespaces die uit de preview-provider lopen, en componenten die uit de barrel verdwijnen zonder dat de sync het merkt.

⚠️ **De bewaker faalde eerst zijn eigen mutatietest.** De export-check gebruikte `entry.includes(naam)`, en `SkeletonBadge` bevat `Badge` — daardoor kón hij niet rood worden. Nu op woordgrens (`\b`). Een guard die zijn mutatietest niet doorstaat, bewaakt niets.

- Task: `-` (voortgekomen uit de design-sync)
- ADR: `-`
- Spec: `-`
- Commit: PR #360

### 486. `smoke:image-coupling` bewaakte precies het gedrag dat F36 bewust wegnam

Bij het aanzetten van de slapende bewakers viel `smoke:image-coupling` om. Eerste lezing: regressie. **Fout.** De call-to-action is bewust uit de beeldprompt gehaald in `059dd8ba` (F36, 13-05-2026), omdat het beeldmodel de tekst letterlijk op het beeld rendeerde — een Engelse overlay met typefout op een Nederlandse blog.

⚠️ **De les is breder dan deze bewaker**: een bewaker die niet draait vangt niet alleen niets, hij **verrot** ook. Hij blijft een gedrag eisen dat het product allang bewust heeft verlaten, en meldt zich bij het aanzetten als regressie. Aanbeveling voor wie er meer aanzet: draai `git log -S` op de betrokken assertie vóór je iets een regressie noemt.

- Task: `-`
- ADR: `-`
- Spec: `-`
- Commit: PR #359

### 485. 82 van de 85 bewakers draaiden nergens — de goedkope groep draait nu wel

`package.json` bevatte 77 smoke- en eval-scripts; **drie** stonden in een workflow. De andere 74 bestonden wel maar draaiden nooit, waaronder guards die speciaal gebouwd waren nádat er iets stil was misgegaan.

⚠️ **De PR-tekst van #358 zei "82 van de 85" en dat klopte niet**: dat getal telde de acht `test:*`-scripts mee, waarvan `test:e2e` en `test:csp` juist wél in een workflow stonden. Nagerekend op de package.json van commit `0a4e036a`. De strekking verandert niet, de noemer wel.

`scripts/ci/run-guards.sh` draait nu de goedkope, deterministische groep in de `check`-job — bewust **zonder** fail-fast, zodat één rode run alle kapotte bewakers laat zien in plaats van de eerste. Elke bewaker is vóór opname in een schone omgeving gedraaid.

⚠️ **De selectie op "groen in een schone omgeving" is te zwak gebleken** en is achteraf nagemeten op assertie-aantallen: alle 18 toetsen aantoonbaar iets (van 1 samenvattende bewaker over 211 iconen tot 294 asserties). Waar dat criterium wél faalde staat in #369.

- Task: [tasks/slapende-bewakers-survey.md](../tasks/slapende-bewakers-survey.md) (meting door een parallelle sessie, PR #368)
- ADR: `-`
- Spec: `-`
- Commit: PR #358

### 484. Elke nieuwe bezoeker kreeg `lang="en"` op een Nederlandse pagina — en statisch renderen bleek geen vrije keuze

`static-rendering-regressie` begon als prestatietaak: sinds de CSP-enforce-flip was zichtbaar dat **élke pagina-route `ƒ (Dynamic)`** is, waardoor `generateStaticParams` op drie marketing-routes en `revalidate = 604800` op de klant-landingspagina's al maanden niets opleverden. De meting bevestigde de diagnose en bracht twee dingen boven water die de taak niet kende.

**De winst is groter dan gedacht.** Met de cookie-read uit de root layout gaat de route-tabel van **2 naar 26** statische pagina-routes; de vijf die dynamisch blijven zijn dat terecht. **`/p/<workspace>/<slug>` heeft een tweede, onafhankelijke oorzaak**: een dynamisch segment zónder `generateStaticParams` krijgt in Next 16 geen ISR-pad, ook niet mét `revalidate`. Met een lege `generateStaticParams` werd de route `● (SSG)` en cachete hij écht (MISS → HIT, `s-maxage=604800`). De P0-ISR-fix die `?workspace=` ooit naar een padparameter verhuisde is dus door twee losse oorzaken geneutraliseerd gebleven.

⚠️ **Maar statisch renderen is niet vrij te schakelen, en dát is de kern.** `script-src` is nonce-based met `'strict-dynamic'`, per request gezet door de proxy. Een gecachete respons verdraagt dat principieel niet: de statische build serveert dezelfde 38 script-tags met **0** nonce-attributen (prod stempelt er 38), en een gecachete `/p` draagt de nonce van het eerste request terwijl de header een verse zendt. **Bewijs**: `npm run test:csp` tegen de statische build → **6 van de 10 falen**. De ADR-aanname dat de CSP zo ontworpen is dat statische rendering terug kan komen geldt alleen voor de twee hash-toegestane artifact-snippets, niet voor Next' eigen bootstrapscripts.

⚠️ **En de urgentie klopte niet.** Op prod gemeten: **4 `PageEvent`-rijen in totaal**, 1 gepubliceerde landingspagina. De prestatiewinst is vandaag vrijwel nul — dezelfde correctie als bij de retentie-indexen van 18-08.

**Wat wél mis was, ongeacht verkeer**: de root layout zette `<html lang>` uit de UI-cookie, terwijl **geen enkele publieke route `useTranslation` gebruikt** (marketing 0, brand.md 0, `/p` 0 — allemaal hardgecodeerd Nederlands). Geverifieerd op productie: `branddock.app/marketing/pricing` gaf zonder cookie `lang="en"`, mét `branddock-ui-locale=nl` gaf dezelfde pagina `lang="nl"`. `linfi.branddock.app/pillar-page` gaf `lang="en"` terwijl `LandingPage.locale = 'nl-NL'`. De hele acquisitie-funnel — bezoekers hebben per definitie nog geen cookie — kreeg een Nederlandse pagina met een Engels taalattribuut, en de app betaalde volledige dynamische rendering om dat foute antwoord te berekenen.

**De fix scheidt drie begrippen die door elkaar liepen**: documenttaal (`<html lang>`), UI-taal (de cookie) en contenttaal (`LandingPage.locale`). `document-locale.ts` leidt de documenttaal af uit het effectieve pad — `x-pathname`, door de proxy gezet ná de host-rewrite. De rendermodus blijft bewust dynamisch; de drie `generateStaticParams` en de `revalidate` blijven staan mét de gemeten reden waarom ze vandaag niets doen.

⚠️ **Vijf reviewrondes vonden elk een gat dat de vorige had gemist, en ze hadden allemaal dezelfde vorm: het faalscenario zat niet in de meting.** (1) `I18nProvider` zette `lang` ná hydratie terug; mijn meting meldde "6/6 correct" met uitsluitend verse page loads. (2) De fix daarvóór brak de apex-homepage — de client beoordeelde het browserpad `/` terwijl `decideHostRoute` dat naar `/marketing` rewrite't; onzichtbaar lokaal, want localhost is geen apex-host. (3) De gate toetste de losse helpers, niet de bedrading: verwissel workspace en slug en élke klantpagina viel stil terug, terwijl 52/52 groen bleef. (4) Een adversariële reviewer verwijderde één regel uit de proxy en draaide daarmee de complete server-fix terug terwijl **alle** gates groen bleven — inclusief de browsercheck, die `OK lang="nl"` meldde tegen HTML die `lang="en"` zei, omdat de client de DOM ná hydratie repareert. Daarom leest de browser-smoke nu ook de rauwe serverrespons. (5) De bewijstabel bleek gemeten tegen een base van 15 commits terug, met #323 ertussen dat de build-laag omgooit.

**Bewijs** (gemeten ná rebase op `c95d7eee`): `tsc` 0 · `eslint` 0 · `npm run test:csp` **15/15** · `npm run smoke:document-lang` **61/61**, meedraaiend in de CI-`check`-job · `npm run smoke:document-lang-browser` **16/16** in twee fases · route-tabel identiek aan de baseline. **Vijf mutatiekalibraties**, elk met een vooraf bekende faalverwachting: client-sync uit → 3/4 navigaties · kale `startsWith` → 3/61 · publieke-route-tak gesloopt → 4/61 · lookup-argumenten verwisseld → 2/61 · `x-pathname` uit de proxy → 4/16.

⚠️ **Ook de nieuwe guard moest zelf gecorrigeerd worden**: hij telde `<script type="application/ld+json">` mee als uitvoerbaar script en keurde daarmee een correcte build af (46 tags, 45 nonces). JSON-LD is data, geen code.

**Niet gedekt**: `/p/<workspace>/<slug>` staat nog niet in de browser-violation-sweep — dat vraagt een fixture van vier entiteiten, want de e2e-seed bevat geen landingspagina. En `/invite/accept` is dezelfde klasse (Nederlandse content, taal uit `?lang=`), bewust open gelaten omdat de precedentie daar een eigen beslissing vraagt.

- Task: [tasks/done/static-rendering-regressie.md](../tasks/done/static-rendering-regressie.md) · restwerk: [tasks/document-lang-followups.md](../tasks/document-lang-followups.md)
- ADR: `-` (geen architectuurwijziging — de bestaande rendermodus is bewust behouden)
- Spec: `-`
- Commit: PR #335

### 483. index.css was gecompileerde output die als bron in git stond — 358 kleurklassen renderden stil niets

De enige stylesheet van de app was 10.555 regels gecompileerde Tailwind-output, zónder `@import "tailwindcss"` en zónder `@theme`. `@tailwindcss/postcss` had daardoor niets te genereren en liet het bestand passeren: er kwam **nooit iets bij**. Elke utility die na het compileermoment in de code kwam bestond simpelweg niet — stil, zonder build-fout. Gemeten: **846 kleur-utilities in gebruik, 366 zonder definitie**, waarvan 358 levend over 1.303 bestand-voorkomens en 21 kleurfamilies. `bg-primary-50` in 33 bestanden, `bg-emerald-500` in 30 (de EmptyState-knopbug die als "opgelost" in het geheugen stond en gewoon nog leefde), `hover:text-gray-600` in 70.

**De diagnose stond al jaren verkeerd.** Overal heette dit "Tailwind purge". Er wordt niets weggesnoeid; er komt alleen nooit iets bij. Dat verschil stuurt je naar safelists in plaats van naar de pijplijn. Het bestand bevatte zelf al **drie generaties handmatige reparaties** in losse `@layer utilities`-blokken, elk met een commentaar over een productiebug: `z-20` (de Claw history-popover rende onder zijn eigen scrim, rijen onklikbaar), `grid-cols-12` (12-koloms layout brak), `order-1/2` (mobiele volgorde).

**Een experiment koos de aanpak, geen voorkeur.** Verse build vs. het gecommitte bestand, vergeleken via de PostCSS-AST: een echte build lost **321 van de 366** vanzelf op. De resterende 45 zijn de `primary`-familie, die geen Tailwind-kleur is en dus een `@theme`-definitie nodig heeft — dat werk zat in élk alternatief. Andersom reproduceert een verse build 344 selectors niet, maar **182 daarvan zijn dood** en van de 162 die overblijven zijn er 119 semantische tokens (`bg-background`, `bg-muted`, `text-foreground`) waarvan de CSS-variabelen al in `:root` stonden — ze werden alleen nooit aan Tailwind blootgesteld. Handmatig 358 klassen appenden was dus verdedigbaar geweest én weggegooid werk.

`src/index.css` is nu **320 regels bron**: `@import "tailwindcss"` + `@import "tw-animate-css"`, een `@theme inline`-blok met een primary-ramp waarvan **stap 400 `var(--primary)` IS** (de merkkleur ligt qua lichtheid op `teal-400`, niet `teal-500` — `oklch(0.771 0.139 176.4)`), de bestaande `:root`/`.dark`-variabelen, de vier `@layer components`-klassen, de WebKit-scrollbarregels en `@media print`.

**Twee Tailwind 4-eigenaardigheden die dit kostte** en die nu in de bron vastliggen: door de gebruiker geschreven `@layer utilities` wordt **volledig genegeerd** (custom klassen verdwijnen stil; `@layer components` blijft wél), en je hebt `@theme inline` nodig i.p.v. `@theme` zodra theme-waarden naar andere variabelen verwijzen — anders werken `.dark`-overrides alleen op `:root`.

**Bewijs, live op productie gemeten na de deploy**: de focusring op een invoerveld was `rgb(31, 41, 55)` (`#1f2937` = `--foreground`, de `currentcolor`-terugval omdat `focus:outline-none` de native outline weghaalde en `focus:ring-primary-500` niet bestond) en is nu `oklab(0.771417 -0.138875 …)` = **`#1fd1b2`**, exact de merkkleur. Selector-telling 2126 → 2835, met `bg-primary-50`, `focus:ring-primary-500`, `bg-emerald-500` en `hover:text-gray-600` alle vier van ✗ naar ✓. `z-20` en `grid-cols-12` zitten in béíde — dat waren de handmatige reparaties, wat het beeld intern consistent maakt. Alle 10 `data-[state=…]`-animatievarianten aanwezig in oud én nieuw met identieke keyframes (`enter`, `exit`, `accordion-down/up`), dus de overstap naar `tw-animate-css` verliest niets.

**Guard**: `npm run smoke:css-utilities` draait de echte Tailwind-build en toetst de **gegenereerde** CSS, niet de bron — na deze migratie is `index.css` immers geen output meer. Staat in `ci.yml` met `--strict` en een lege baseline. Gekalibreerd: `--color-primary-500` uit het `@theme`-blok halen geeft exit 1 met precies de 9 geraakte klassen en hun vindplaatsen.

⚠️ **Wat dit niet dekt**: dialog, popover en tooltip zijn niet door een klikpad gegaan — die zitten achter login. Hun animatieklassen en keyframes zijn aantoonbaar identiek aan de oude, maar het gedrag is niet visueel getoetst.

Bijvangst: `src/styles/globals.css` en `design-system.css` bleken nergens geïmporteerd, en `globals.css` definieerde een `--primary` die afweek van de levende merkkleur — wie daar de merkkleur aanpaste veranderde niets. Beide gemarkeerd als dood.

- Task: [tasks/done/primary-color-scale.md](../tasks/done/primary-color-scale.md)
- ADR: [docs/adr/2026-08-18-tailwind-bronpijplijn.md](adr/2026-08-18-tailwind-bronpijplijn.md)
- Spec: `-`

### 482. De settings-blob heeft één schrijfdeur — en de vorige "fix" sloot de race niet

`Deliverable.settings` is één JSON-blob waar tien codepaden in schrijven, allemaal als read-modify-write: lees de hele blob, spreid er sleutels overheen, schrijf 'm terug. Landt er tussen de read en de write een andere schrijver, dan verdwijnt diens werk. De autosave van de Puck-editor is de frequentste tegenpartij; bij `generate-structured-variant` was het venster **minutenlang** (de hele SSE-generatie), bij de SEO-pijplijn en de fidelity-scoring net zo goed.

⚠️ **De bestaande "fix" waar het task-file naar wees, werkte niet.** `publish/route.ts` zette read + write in één `prisma.$transaction` en noteerde dat de race daarmee "geëlimineerd" was. Onder de Postgres-default READ COMMITTED neemt een kale `SELECT` echter geen lock: beide transacties lezen de oude blob, de tweede `UPDATE` wacht netjes op de eerste — en overschrijft die dan alsnog met een payload die op de verouderde read is gebouwd. Een transactie zónder lock verplaatst het venster, hij sluit het niet. Dat patroon was inmiddels op twee plekken gekopieerd.

Cure: één gedeelde `updateDeliverableSettings()` die de rij leest onder `SELECT … FOR UPDATE` en in dezelfde transactie terugschrijft. Gekozen boven `jsonb_set` (de call-sites mergen hele objecten, geen losse paden) en boven serializable+retry (dat vraagt een retry-lus per call-site). De SEO-pijplijn zit al ín een transactie en kon de helper dus niet gebruiken — geneste interactieve transacties bestaan niet in Prisma — en kreeg daarom `lockDeliverableSettings(tx, id)`, dezelfde lock als los primitief.

**De scope groeide tijdens het werk.** Het plan telde zeven schrijvers, gevonden met een grep over `src/app/api`. Een sweep over de hele `src` vond er tien: `canvas-orchestrator` (2×), `seo-pipeline`, `fidelity-runner` (2×) en `headless-webpage` stonden er ook, met precies dezelfde vorm. Bewust níet omgezet: de versie-restore in `content-version.ts` (die vervángt de blob per definitie, geen read-modify-write) en een eenmalig onderhoudsscript.

Bijvangst: het stale snapshot is uit `generate-structured-variant` verdwenen in plaats van gerepareerd — `existingSettings` werd door twee call-sites heen doorgegeven en is nu weg, dus er valt niets meer per ongeluk op terug te vallen. Idem twee dode reads in `fidelity-runner`.

⚠️ **Wat dit niet oplost**: `regenerate-puck-data` rekent zijn merge nog steeds met de `puckData` van vóór de regeneratie. De lock beschermt de sleutels die die route níet schrijft; een autosave op diezelfde sleutel wordt nog altijd overschreven. Dat is inherent aan regenereren, en de client vraagt er expliciet bevestiging voor.

**Bewijs**: `SMOKE_DB=1 npm run smoke:settings-write` → **8/8** tegen een echte Postgres. De belangrijkste check is de mutatietest: dezelfde race draait óók met een kale `findUnique`, en dáár moet een sleutel verdwijnen — anders meet de smoke niets. Plus `smoke:hero-clobber-guard` 29/29 ongewijzigd (die dekt de omgezette `patchHeroVisualUrl`), `tsc` 0 errors, `lint` 0 errors.

- Task: [tasks/lp-review-followups.md](../tasks/lp-review-followups.md)

### 481. Variant B van de SEO-pipeline kreeg vijf minuten research nooit te zien

De SEO-pipeline besteedt vijf van zijn acht stappen aan research — keywords, concurrenten, SERP-gaps, E-E-A-T, de outline met meta-tags en interne links — en levert daarna twee varianten op. Variant B kreeg die research nooit. Zijn generator las de doorlopend groeiende `accumulatedContext` met een `.slice(-20000)` erop, onder de kop *"SEO RESEARCH CONTEXT (preserve all SEO elements from this research)"*. Die context groeit door élke stap achteraan aan te plakken, dus een tail-slice houdt per definitie de laatste stappen over: de prose. De prose-staart alleen al (stap 6 first draft + stap 7 editorial, mediaan-som **29.953 tekens** over 31 gemeten runs) is groter dan het venster van 20.000, waardoor de slice altijd middenin stap 6 of 7 begon en stap 5 nooit bereikte. Over **31 herspeelde echte runs kreeg 31/31 nul van de vijf researchstappen** door. Wat er wél in stond was het artikel — dat één sectie hoger al als `## ORIGINAL PAGE (Variant A)` in dezelfde prompt zat, afgekapt midden in een zin.

De helft van wat de pipeline oplevert werd dus geschreven zonder de research waar hij vijf minuten aan besteedt, terwijl de prompt het tegendeel beweerde. Variant B wordt als `DeliverableComponent` met `variantIndex: 1` weggeschreven en is gewoon selecteerbaar. Fase 4a (13-07) keek er langs: die noteerde als bewuste input-delta dat variant B "de accumulatedContext zonder het stap-8-checklist-JSON" ziet — een redenering over welk blok erbíj komt, terwijl de slice er al alles vóór stap 6 uit gooide.

**De fix is structureel**: stoppen met een gegroeide blob slicen, en selecteren op stapnummer. `renderStepBlock()` is nu de énige bron van het blokformaat — gebruikt door zowel de accumulatie in `runSeoPipeline` als de selectie. Variant B krijgt `RESEARCH_STEPS` (1-5); stap 8 krijgt via `STEP_CONTEXT_OVERRIDES` alles behalve de achterhaalde stap-6-draft, want die stap is checklist-only en zag tot nu toe twee versies van hetzelfde artikel terwijl zijn eigen prompt zegt *"step 7 already delivered the final prose"*. Stappen 1-7 blijven byte-identiek — door drie reviewers onafhankelijk nagerekend. Bijvangst: het opschuiven van het leesmoment sluit een latente read-after-await in `runCompetitorAnalysisStep`.

⚠️ **Het levert géén kwaliteitswinst op, en dat is de uitkomst.** Gepaarde F-VAL-A/B op herspeelde echte runs (n=8, 4 merken, judge cross-family): **gemiddelde Δ −0,1, spreiding −1 tot +1**, vijf van de acht cases bewegen niet. De fix staat op correctheidsgronden: de prompt levert wat hij belooft, stap 8 ziet één versie, en vers pad en resume-pad geven identieke input. De stap-8-wijziging is apart gemeten nadat drie reviewers terecht opmerkten dat daar alleen de omvang van bekend was terwijl die stap persistent wegschrijft: **4/4 cases geen enkele overtreding in beide armen**, titleTag-lengtes identiek, `h1` identiek in 3 van de 4 — en die ene afwijking viel uit in het voordeel van de nieuwe versie (sentence case waar de oude arm Title Case gaf, wat de huisregel schendt).

⚠️ **Vijf reviewrondes vonden nul bugs in de productiecode en ruim twintig fouten in de metingen en claims eromheen** — dat is het leerzame deel, en de drie zwaarste zijn dezelfde soort fout als de bug die onderzocht werd. (1) De survivor-teller matchte op de substring `## Step N:`, en artikelen bevatten zélf koppen als `## Step 1: selecting FSC® Accoya`; ik publiceerde 28/29 waar het 31/31 is. (2) De blok-parser liet het laatste blok doorlopen tot het einde van de prompt, waardoor stap 7 er 6.615-9.694 tekens brand-voice-directive en stap-8-instructies bij kreeg — vervuiling die via de tail-slice **uitsluitend in de OUD-arm** landde en een als "gepaard" gepresenteerde A/B scheeftrok (eerste ronde +0,50; schoon gemeten −0,1). (3) `loadCases` sloeg 2 van de 31 runs stil over terwijl twee ándere skip-redenen wél geteld werden; op het volledige archief schoof de mediaan van stap 7 met 6,4%. Plus een Brand-Context-bereik dat in geen enkele workspace voorkwam en een reproduce-commando dat niet werkte.

**Twee smokes, met een expliciete taakverdeling.** `smoke:seo-context` (41 checks, DB- en key-loos) dekt de pure functies. Dat bleek niet genoeg: een adversariële review kreeg **11 van 21 mutaties in `seo-pipeline.ts` langs zowel `tsc` als alle 41 checks**, waaronder een rechtstreekse revert van de fix en het slopen van het resume-pad. `smoke:seo-wiring` (31 checks) sluit dat gat door de échte `runSeoPipeline` te draaien met een onderschepte `globalThis.fetch` — negen AI-calls afgevangen, nul echte calls, en asserties op de prompts die de pipeline daadwerkelijk opbouwt. Module-mocking kan hier niet (esbuild geeft niet-configureerbare getters) en de pipeline gebruikt `messages.stream()`, dus de stub spreekt SSE. Van de zes ontsnapte mutaties worden er nu vijf gevangen; de zesde bleek een onjuiste review-bevinding — de `.sort()` in de wave-lus ís het vangnet dat de volgorde deterministisch houdt.

**Bijvangst met eigen taak**: variant B blijkt geen variant. Woord-overlap met variant A is 90,5-98,3% in béide armen, tegen een geijkte 65,0% voor twee volledig verschillende artikelen van hetzelfde merk en 18,8% tussen merken. Zie `tasks/seo-variant-b-differentiatie.md`.

Daarmee is `seo-pipeline-speedup` afgerond: snelheid stopte bewust op 7,5 min (Fase 4b NO-GO, gemeten 14-07), en Fase 3 landde niet als kostenoptimalisatie maar als bugfix.

- Task: [tasks/done/seo-pipeline-speedup.md](../tasks/done/seo-pipeline-speedup.md)
- ADR: `-`
- Spec: `-`
- Commit: `640932f1`

### 480. De twee veiligheidshooks bewaakten het verkeerde en hinderden het goede

Sluit [`guard-hooks-hardening`](../tasks/guard-hooks-hardening.md) af (#313 + #314). De taak stond sinds 17-07 open met de aantekening "niet uitvoeren zonder expliciet akkoord" — dat akkoord kwam er nadat **alle drie de gaten op één dag opnieuw geraakt werden**. Het scherpst was de combinatie: de guard blokkeerde élke lokale git-mutatie terwijl twee merges naar productie er ongehinderd langs gingen.

**Eriks drie keuzes**: `gh pr merge` waarschuwt (blokkeert niet — twee sessies die elk hun eigen PR mergen is legitiem); `check-dangerous-bash` wordt operatie-bewust; een onbepaalbaar doel wordt doorgelaten.

**Nieuwe gedeelde helper** `.claude/hooks/lib/guard-lib.sh`. Beide hooks stelden dezelfde vraag — *welke worktree raakt dit commando?* — en beantwoordden 'm allebei verkeerd: ze leidden 'm af uit de cwd van het hook-proces. Nu uit het commando zelf (`cd`, `git -C`), met het JSON-veld `cwd` als terugval en fail-open bij twijfel. Daarmee wordt werk in worktree X niet meer geblokkeerd door een sessie in Y — én wordt een commando dat vanuit X ín Y mutéért nu wél geblokkeerd, wat eerder ongemerkt doorging.

**`check-dangerous-bash` heeft drie lagen** in plaats van twee: CRITICAL (altijd), BRANCH-AWARE (force-push en `reset --hard` alleen blokkeren richting main/master) en WARNING. Force-push met lease op een eigen feature-branch mag dus weer.

⚠️ **Twee gaten kwamen er tijdens het bouwen bij, allebei van dezelfde soort — de guard keek naar hoe een commando geschreven was, niet naar wat het doet.** Dezelfde destructieve operatie met een ander argument glipte erlangs. En `git -C <pad> <verb>` passeerde **béide hooks al sinds hun ontstaan**, omdat elke detectie het werkwoord dírect achter `git` verwachtte; de smoke viel daar bij de eerste run over. Bijvangst: `worktree` stond kaal op de mutatielijst, dus `git worktree list` — puur lezen — telde als HEAD-mutatie.

⚠️ **De beloofde escape was onimplementeerbaar, niet alleen ongeïmplementeerd.** Een PreToolUse-hook kent alleen `allow` en `deny` — er is geen `ask`, dus een hook kan principieel niet om bevestiging vragen. En een escape-zin ín het commando wordt door Claude getypt in plaats van door de gebruiker: een self-service bypass. De melding zegt nu wat er wél geldt.

**Bewijs**: `npm run smoke:guard-hooks` → **13/13** tegen echte git-repo's en echte lockfiles met verse heartbeat, plus drie mutatietests (blokkeer-tak eruit → rij 1+4 vallen; beschermde branches leeg → rij 8+13; CRITICAL-lijst leeg → rij 11). `tsc` 0 errors, `eslint` schoon, `bash -n` groen. Na de merge opnieuw gedraaid vanuit de main-worktree, tegen de geïnstalleerde hooks.

⚠️ **Niet gedekt**: een tweede échte Claude-sessie. De smoke toetst de hook-logica, niet de integratie met de harness — en of de merge-waarschuwing Erik daadwerkelijk bereikt is daarmee niet bewezen (stderr bij exit 0 is niet gegarandeerd zichtbaar; daarom óók een `systemMessage`). Staat als restwerk in de task-file. Gat 1 blijft bewust een waarschuwing: twee sessies kunnen nog steeds tegelijk naar productie mergen.

- Task: [tasks/guard-hooks-hardening.md](../tasks/guard-hooks-hardening.md)
- ADR: -
- Spec: -
- PR's: #313 (hooks + smoke), #314 (gotcha)

### 479. De content-keten is dicht — de publieke API gaf een volle pillar-page als leeg item uit, en zes i18n-namespaces renderden nooit

Sluit [`content-chain-accessor`](../tasks/content-chain-accessor.md) af: alle 23 kruisingen lopen nu via `resolveDeliverableContent()`, en er staat geen `TODO(content-chain-accessor)`-disable meer in de codebase. Dat laatste is de meetbare vorm van "af".

**#23 was de zichtbaarste die nog openstond.** `src/lib/content/deliverable-content.ts` — gedeeld door de MCP-tool `get_deliverable_content` en `GET /api/v1/deliverable` — mapte uitsluitend `components`, en die zijn voor de 11 keten-B-types structureel leeg. Een pillar-page van 4.185 tekens kwam er dus als leeg item uit, op de enige plek waar een klant of externe agent de bug raakt. Additief opgelost: `text` (platte tekst uit welke keten dan ook), `contentState` (`ready`/`awaiting-choice`/`empty`) en `variantOptionCount` erbij, `components` ongewijzigd. Bij `awaiting-choice` gaat er géén tekst mee — gelijk aan de productkeuze bij #3: een versie die de gebruiker nog kan weggooien lekt niet door naar afgeleide content. De PR-tekst van #288 meldde "nog open: alleen #22"; #23 stond er ook nog en werd niet genoemd.

**#22**: Iris (`seo-watchdog-scan`) leest via de accessor in plaats van een rauwe `safeParse`; de zod-validatie blijft, want de accessor garandeert een page-variant en niet dít schema.

**Vier bevindingen uit een fresh-eyes-review van #288**, meegenomen omdat ze dezelfde bestanden raken. De belangrijkste: het readiness-filter leidde zijn tokens **af uit Engelse zinnen** met `lower.includes('choose')` — één herformulering of vertaling had het stil kapotgemaakt. De API stuurt nu tokens (`readinessSignals`), één formatter maakt er de zin van, en Engels blijft de bron via `defaultValue`. Verder: de tekstcomponent-regel stond op drie plekken (nu één `TEXT_COMPONENT_WHERE`), een docstring claimde een garantie die de variantselectie niet waarmaakt, en `hasContent` was tóch `true` bij een openstaande variantkeuze zodra er beeld op de rij stond — precies de publish-knop die gegarandeerd afketst.

⚠️ **Nagekomen vondst: zes namespaces met complete NL-vertalingen renderden nooit.** Namespaces laden lazy; `brand-dna`, `campaigns-cards`, `campaigns-content-types`, `campaigns-setup`, `claw-content-registry` en `campaigns-pipeline` werden nergens via `useTranslation` geladen. 84 aanroepen die voor een Nederlandse gebruiker allemaal Engels bleven — merk-DNA-secties, status-pills, kwaliteitslabels, content-type-labels, wizard-stappen, knowledge-library-filters. Niets kon dit zien: de fallback is `defaultValue`, en die ís de Engelse brontekst. Geen foutmelding, geen lege string, geen zichtbare sleutel. 37 `useTranslation`-calls in 21 bestanden aangesloten, met de bestaande namespace vooraan zodat kale sleutels hun default houden. Geborgd met `npm run smoke:i18n-namespaces` — statisch, CI-baar, en aantoonbaar discriminerend.

**Bewijs**: `content-library-readiness` 59/59 (was 39/39), waarvan 8 nieuwe checks die de hint door een échte i18next-instantie in `en` en `nl` renderen, inclusief de `_one`/`_other`-vorm en de koude start. `deliverable-content-accessor` 52/52 ongewijzigd. De échte Iris-laag via `SKIP_AI=1 agent-seo-watchdog-smoke` 15/15. `tsc` 0, `lint` 0 errors. Geen schema-wijziging, dus geen Neon-push.

⚠️ **Twee dingen die deze ronde kostten**, beide vastgelegd in `gotchas.md`. (1) Drie controles kwamen leeg terug terwijl de controle zélf stuk was — een probe op een niet-bestaande sleutel, een discriminatietest waarvan de string-vervanging niet matchte door quote-stijl, en een `git merge-file`-conflictcheck die nul conflicten meldde voor het énige bestand dat wél botst. Twee daarvan zouden een echte bevinding hebben begraven. (2) De bovenkant van `gotchas.md` is met parallelle sessies een gedeelde schrijfplek: één entry in een code-PR kostte een volledige herbouw van #291 (→ #298), en een uur later opnieuw een conflict — terwijl `package.json` beide keren vanzelf mergde.

Twee vervolgtaken vastgelegd: [`content-chain-followups`](../tasks/content-chain-followups.md) (dode code, de schrijf-kant van keten B, repurpose zonder bron-content) en [`i18n-namespace-locality`](../tasks/i18n-namespace-locality.md) (namespaces die alleen werken zolang een ánder scherm ze al laadde).

- PR's: #298, #307, #308
- Task: [tasks/content-chain-accessor.md](../tasks/content-chain-accessor.md) → **done**

### 478. De tabwissel kocht alsnog een tweede generatie — en waarom hij in main stond

Vervolg op #475, en tegelijk een les over mergen. Die entry meldde de tabwissel-regressie als opgelost: de AbortController verhuisde naar een registry per deliverable, zodat een stapwissel in de Canvas een lopende run niet meer afbrak. Dat klopte voor de *controller*, maar niet voor de **beslissing om te genereren**. `isGenerating` en `autoTriggeredRef` zijn component-lokaal, en `structuredVariantOptions` wordt pas bij `all_complete` naar de store geschreven — dus een verse instance na een stapwissel zag "niets aan de hand", de auto-trigger vuurde, `beginGeneration` brak de lopende betaalde run af en kocht een nieuwe. Twee betalen, één krijgen, bij een gewone klik op een eerdere stap.

Nu vraagt de auto-trigger aan de registry of er al iets loopt (`hasActiveGeneration`), en abonneert het blok zich via `useSyncExternalStore` in plaats van die registry één keer bij mount te lezen — zonder abonnement bleef een instance die tijdens een *mislukte* run mountte eeuwig in de spinner staan, en kocht elke volgende stapwissel opnieuw. De gracieperiode ging van 250ms naar één macrotask: StrictMode's cleanup en setup zitten in dezelfde effect-flush, dus meer uitstel kocht niets terwijl 250ms wél een venster gaf waarin een échte terugkeer een betaalde run doodde.

⚠️ **Waarom dit apart moest** is het onthouden waard. De fix zat al in de branch, maar de merge van #287 squashte een **verouderde branch-head**: de GitHub-API bleef die tonen terwijl de branch vijf commits verder was. De staleness was opgemerkt en er is toch gemerged — dat had het stoppunt moeten zijn. Gevolg: vijf commits landden niet, en een al gevonden regressie stond live tot deze PR. Regel voor de volgende keer: **verifieer de head-SHA met `git ls-remote` vóór een merge**, en controleer ná de merge of de wijziging écht in `main` zit in plaats van af te gaan op `merged: true`.

Bewust nog niet in main: de atomaire settings-merge, deel-resultaten bewaren vanaf 2 varianten, en de `cancel()`-detector. Die raken `generate-structured-variant/route.ts`, waar #295 uit een parallelle sessie zojuist eigen werk in zette — waaronder onafhankelijk exact dezelfde transactionele fresh-read. Afstemming loopt via een comment op #295; de wijzigingen staan klaar op `claude/sse-abort-disconnect`.

Smoke 13/13, `tsc` 0, `lint` 0 errors (965 warnings = baseline van main).

- Task: [tasks/lp-review-followups.md](../tasks/lp-review-followups.md)

### 477. Gepubliceerde landingspagina's hadden géén `<title>` en geen meta-description — een metadata-sleutel met waarde `undefined` wist de geërfde titel

Opgevallen tijdens de CSP-verificatie op prod: `linfi.branddock.app/pillar-page` had **geen enkel `<title>`-element**. Niet de verkeerde titel — helemaal geen. Terwijl `/reset-password`, dat geen eigen metadata heeft, netjes `<title>Branddock</title>` uit de root layout erft. Een klant-pillarpagina, gebouwd om gevonden te worden, was dus naamloos in elk zoekresultaat, elke browsertab en elke gedeelde link.

**Oorzaak.** `seoChecklistToMetadata` bouwde altijd een objectliteral met álle sleutels: `{ title, description, alternates, robots, openGraph }`. Next merge't route-metadata over de layout-defaults op **sleutel**-niveau, dus een aanwezige `title`-sleutel met waarde `undefined` *wist* de geërfde titel in plaats van hem te laten staan. De fail-soft-afslag die dat had moeten voorkomen (`niets bruikbaars → {}`) haalde het nooit: de route geeft altijd een `fallbackCanonical` mee, dus `canonical` is altijd gevuld en de early-return vuurde bij geen enkele pagina. Elke pagina zonder `settings.seoChecklist` kwam dus met een lege titel-sleutel binnen.

**Waarom niemand het zag.** De smoke dekte dit geval af in plaats van het te vangen: `assert('null + fallback → geen title', noChecklistFb.title === undefined)`. Die uitdrukking is waar bij *zowel* "sleutel afwezig" als "sleutel aanwezig met waarde undefined" — precies het onderscheid dat telt. De test is nu omgezet naar `!('title' in result)`.

**Wie het raakt.** `settings.seoChecklist` wordt uitsluitend door de SEO-pipeline geschreven (`src/lib/ai/seo-pipeline.ts`). Elke pagina uit de gewone webpage-builder heeft er geen, en had dus geen titel. Dezelfde leemte maakte dat `llms.txt` de kale slug als linktekst toonde — `- [pillar-page](…)` in plaats van een leesbare naam.

**De fallback, en waarom niet de voor de hand liggende.** Eerst `Deliverable.title` geprobeerd; dat bleek in de praktijk het content-type-label te bevatten ("Landing Page", "Blog Post"), dus dat zou letterlijk `<title>Landing Page</title>` in Google zetten — slechter dan de generieke layout-default. De echte kop van de pagina staat in `puckData`: de hero-`headline`, de H1 die de bezoeker ziet. Nieuwe pure helper `resolvePageTitleFromPuckData` leest die (hero-`headline` vóór sectie-`heading`, want dat laatste is H2-niveau), normaliseert witruimte en kapt op woordgrens af bij 120 tekens. Beide consumenten gebruiken hem nu, dus `<title>` en `llms.txt` kunnen niet meer uit elkaar lopen.

**Bewijs, end-to-end en niet alleen in de unit-test.** Tegen een echte productiebuild: pagina zónder checklist gaf vóór de fix niets en nu `<title>Horeca textielbeheer: waarom zelf doen je meer kost dan je denkt</title>` plus een meta-description; pagina mét checklist houdt onveranderd zijn pipeline-titel (`Horecatextiel Randstad | Vlekkeloos geregeld | Napking`), dus geen regressie; en de controleroute `/reset-password` erft nog steeds "Branddock", wat bewijst dat de inheritance zelf niet gesloopt is. `llms.txt` toont nu beide echte titels in plaats van slugs. Smokes: `page-derived-meta` 25/25 (nieuw) en `page-seo-metadata` 35/35. `tsc` 0 errors.

**Dezelfde leemte, tweede helft: de meta-description.** Ook die kwam alleen uit de checklist, dus pagina's uit de webpage-builder hadden er geen. De bron ligt naast de titel: de hero-`sub` is de opzettelijk geschreven samenvatting onder de H1 ("De verborgen prijs van eigen linnengoed-beheer in de Randstad, en wat restaurants terugwinnen door uit te besteden"). Zonder `sub` valt hij terug op de eerste lopende tekst uit een `content`/`body`-veld, afgekapt op 155 tekens op woordgrens. Die RichText-velden bevatten **markdown** (10 van de 11 in de dataset dragen `**` of `##`), dus er zit een strip-stap voor: koppen, quotes, bullets, links, vet/cursief, code en horizontale lijnen eruit — de tekst blijft.

⚠️ Twee bugs in mijn eigen eerste versie van die strip-stap, met één oorzaak, en het onthouden waard: de helper normaliseerde witruimte **vóór** het strippen. Alle regel-gebonden regels (koppen, quotes, bullets) zijn `^`-geankerd met de `m`-vlag, dus zodra de newlines platgeslagen zijn is er nog één regel en wordt alleen het eerste bullet geraakt — `- a\n- b` werd `eerste punt - tweede punt`. En een getrimde `'## '` matcht de kop-regel niet meer, want de verplichte spatie erna was al weg, dus `'##'` bleef staan als "beschrijving". Beide gevangen doordat de smoke op échte markdown-vormen test in plaats van op een geïdealiseerd voorbeeld.

⚠️ **Wat dit níet oplost**: pagina's zonder hero-`sub` én zonder lopende tekst (bijvoorbeeld puur een formulier of prijstabel) houden geen description. Dat is bewust: liever geen description dan een verzonnen samenvatting.

- Task: - (bugfix, gevonden tijdens de CSP-verificatie van #476)

### 476. CSP enforce-flip — nonce + strict-dynamic, met hashes voor de bevroren landingspagina's

De nonce-CSP stond sinds 17-07 in Report-Only op prod met als afspraak "een periode rapporten verzamelen, dan flippen". Die gate bleek niet uitvoerbaar zoals bedoeld: de nonce werd nergens op een script gestempeld — bewuste keuze van de meetfase — dus violeerde **élk** script op élke pagina en zijn de rapporten vrijwel volledig bekende ruis. Daarbij persisteert de collector niet (alleen `console.warn`) en bewaart Vercel runtime-logs dagen, geen maand; de opgeslagen CLI-token was bovendien verlopen. De beslissing is daarom genomen op een lokale meting tegen een échte productiebuild, met dezelfde headers als prod.

Die meting stuurde het ontwerp bij op twee punten. **Het oorspronkelijke plan — hashes voor al het publieke terrein, nonce alleen in de app — is gesneuveld**: Next zet per pagina tientallen inline scripts neer die de RSC-payload dragen (32 op `/marketing`), en die inhoud ís de pagina-inhoud, dus onhashbaar. Een hashes-only publieke policy zou de hydratie van élke publieke pagina blokkeren. En **het argument dat nonce-propagatie static/ISR zou kosten bleek niet te bestaan**: in de build-uitvoer is élke pagina-route al `ƒ (Dynamic)` en zijn alleen twee icon-PNG's statisch, omdat `await cookies()` in de root layout (UI-locale) de hele app op dynamic rendering zet. `generateStaticParams` op de marketing-pagina's en `revalidate = 604800` op `/p/…` zijn daarmee feitelijk inert — een prestatiebevinding op zichzelf, buiten deze scope, die een eigen taak verdient.

Wat er wél overblijft als echt obstakel staat los van rendering: **het bevroren artifact**. `compilePageArtifact` bakt `<script>…</script>` ín het opgeslagen `compiledHtml`, gemint op publish-moment. Een per-request nonce bereikt die bytes nooit — niet omdat de pagina statisch is, maar omdat de HTML dat is. Uitkomst: één policy-vorm, twee scopes. Overal `script-src 'nonce-…' 'strict-dynamic'`; op `/p/…` (ook via host-rewrite) daarnaast twee SHA-256-hashes van de twee varianten die `buildPageRuntimeScriptBody` kan opleveren. `'strict-dynamic'` negeert host-allowlists en `'self'`, maar laat nonce- én hash-bronnen staan — daarop rust die tak.

Drie details die makkelijk fout gaan, en waarom ze zo zijn opgelost. De scope wordt bepaald **ná** de host-rewrite: `decideHostRoute` zet `<workspace>.branddock.app/<slug>` om naar `/p/…`, dus een check op de rauwe pathname zou custom-domein-landingspagina's de app-scope geven en precies het artifact-script blokkeren dat de hashes moesten dekken. De scope-default is `app` (de strengere kant), zodat een vergeten publieke route hooguit prestatie kost en nooit stil bescherming weggeeft. En de hashes staan als **constante** in de edge-module — `node:crypto` bestaat daar niet en `crypto.subtle` is async — met de drift-bewaking in de smoke, die ze hercomputeert uit de échte snippets.

Bewijs, en bewust niet alleen "geen violations". Een gemint artifact (25.616 bytes, script zónder nonce) geserveerd onder enforce liet de view-beacon écht vuren: `PageEvent` ging van 3 naar 4. En een mutatietest — dezelfde pagina met de `sha256`-bronnen uit de header gestript — geeft exact 1 violation waar het mét hashes er 0 zijn, wat aantoont dat de hashes dragend zijn en niet meeliften op iets anders. Verder: nul eval-violations over zes routes (dus `'unsafe-eval'` kon weg), alle externe scripts same-origin, `application/ld+json` valt niet onder `script-src` (33 inline scripts, 32 violations), route-tabel vóór en ná identiek (2 static / 30 dynamic), ingelogde app-shell + drie zware secties schoon. Nieuwe suite `npm run test:csp` 10/10 — met eigen config, want de hoofdsuite draait `npm run dev` waar de CSP prod-only uit staat en een test daar altijd groen zou blijven staan. `smoke:security-residual` 37/37 (was 31).

Meegenomen: **`eu-assets.i.posthog.com`** staat nu in `connect-src`. posthog-js haalt daar bij init zijn remote config op; die host stond in geen enkele directive. Op prod is dat vandaag latent — er is geen `NEXT_PUBLIC_POSTHOG_KEY` gezet, dus posthog-js initialiseert niet — maar het zou stil toeslaan zodra de key landt. De vorige pass dichtte alleen de ingest-host.

⚠️ **Het risico dat blijft staan**: wie `buildPageRuntimeScriptBody` wijzigt, maakt élk reeds gepubliceerd artifact ongeldig — die dragen de oude bytes, en dat faalt **stil**: de pagina rendert gewoon, alleen de view-beacon en de form-enhancement niet. De smoke dwingt af dat de hash-lijst meebeweegt, maar niet dat de oude hash blijft staan. Vandaag nul risico: de snippets zijn sinds #251 niet gewijzigd, dus alle bestaande artifacts dragen één van deze twee bodies. De enforce-policy houdt `report-uri` aan, zodat er zicht blijft op wat er geblokkeerd wordt — een enforce zonder rapportage faalt stil, precies de klasse fout die deze migratie moest voorkomen.

- Task: [tasks/security-residual-hardening.md](../tasks/security-residual-hardening.md)
- ADR: [docs/adr/2026-08-18-csp-enforce-nonce-en-hashes.md](adr/2026-08-18-csp-enforce-nonce-en-hashes.md)

### 475. Weglopen tijdens een generatie kost geen tokens meer

De SSE-variantgenerator luisterde niet naar `request.signal`: liep een bezoeker weg, dan genereerde de server rustig door tot `maxDuration` (480s) — alle resterende varianten plus hun rewrite- en iterate-stappen, betaald voor niemand. Beide helften waren nodig, en dat is het niet-evidente deel: in deze SPA unmount de component bij wegnavigeren, maar de browser verbreekt de fetch dan **niet** vanzelf. Zonder een client-`AbortController` ging het server-signaal dus nooit af, hoeveel guards je server-side ook zet.

Client: één `AbortController` per **deliverable**, in een module-scope registry — bewust niet in het generatieblok. ⚠️ Dat wás de eerste opzet, en een 2-reviewer-ronde liet zien dat het een kostenregressie was: `HorizontalAccordion` rendert maar één stap tegelijk, dus een gewone tabwissel unmount het blok. Abort, betaalde varianten weg, en bij terugkomst kocht de auto-trigger ze meteen opnieuw — voor de meest voorkomende onderbreking dus **duurder dan niet aborteren**. Nu breekt alleen het verlaten van de Canvas af, met een uitgestelde abort zodat React StrictMode's cleanup→setup in dev niet elke Canvas-opening een generatie kost. ⚠️ Deze entry beschreef bij het mergen 250ms; dat is per #478 nul geworden, en de auto-trigger-helft van de tabwissel-regressie zat toen nog niet in main — zie #478. Server: guards vóór de volgende slot, de recovery-retry, de rewrite, tussen rewrite en iterate, en de persist. En omdat `anthropicClient.createChatCompletion` `abortSignal` al ondersteunde, is het signaal doorgezet tot in `generateLandingPageVariant`.

Twee dingen die aandacht vroegen. **De recovery-retry werkte tegen ons**: een geaborteerde HTTP-call gooit, en de bestaande foutafvang antwoordde daarop met een nieuwe generatie op recovery-temperatuur — dus juist bij weglopen kocht je een extra call. Nu breekt de loop af in plaats van te retryen. En **een abort vóór de server-response zette `fallbackToJson`**, waarna het JSON-pad álles opnieuw genereerde: dubbele kosten in precies het scenario dat goedkoper moest worden.

⚠️ **Bij abort wordt niets gepersisteerd** (bewuste keuze van Erik). De settings-snapshot in `persistVariantOptions` is dan minuten oud en de gebruiker kijkt niet, dus een overschreven autosave zou pas veel later opvallen — het read-modify-write-venster in dezelfde task-file staat nog open. Prijs: al betaalde varianten gaan verloren. Kosten van een gedraaide generatie worden wél geboekt (`trackVariantGeneration` staat vóór de skip-guard); een halverwege afgebroken call is niet te boeken en die input-tokens vallen dus buiten de meting.

⚠️ **Wat deze fix níet dekt** — een 2-reviewer-ronde haalde drie overschattingen uit de eerste versie van deze entry. (1) De guard-dekking stopte bij de slot-grens: `applyStrictTellRewrite` en `applySilentIterate` krijgen de signal níet, en er stond geen check tússen die twee — inmiddels toegevoegd, maar de calls erbinnen (rewrite + twee judge-rescores) blijven onafbreekbaar en zijn dus alleen op de grens te skippen. (2) De lopende Anthropic-call is **niet-streamend**, dus het afbreken van de socket scheelt latency, niet noodzakelijk geld; de echte besparing zit in calls die nooit starten. (3) Het voorbereidende werk vóór de stream — archetype-classificatie, creative angles, Exa/S2-statistieken — draait vóórdat de `Response` bestaat en is dus helemaal niet te aborteren. Het JSON-fallback-pad is ongedekt gebleven.

⚠️ **Niet end-to-end geverifieerd**: `tsc` 0, `lint` 0 errors (964 warnings, ongewijzigd), maar er is geen AI-key in de dev-container en een echte proef kost een echte generatie. De handmatige check staat in de task-file.

- Task: [tasks/lp-review-followups.md](../tasks/lp-review-followups.md)

### 474. Landing-page-data heeft een plafond — drie onbegrensde tabellen + een AVG-wisroutine

Drie retentie-punten uit de webpage-builder-review van 13-08 stonden bewust geparkeerd als "geen launch-blocker, wel afmaken vóór volume-groei". Ze zijn 16-08 naar Nu gehaald omdat ze als enige met de dag duurder worden, en nu gebouwd: **`PageEvent`** groeide onbegrensd via een publiek endpoint dat 60 events/min/IP toestaat terwijl het dashboard maar 30 dagen leest; **`FormSubmission`** bevatte lead-PII zonder enige wisroutine — workspace-delete cascadeerde wel, maar er was geen manier om één submissie te wissen, precies wat AVG art. 17 en een verwerkersafspraak eisen; **`PagePublish.compiledHtml`** bewaarde sinds ADR 2026-08-12 elk volledig HTML-artifact append-only.

Eén dagelijkse cron (`/api/cron/lp-retention`, 02:00) doet alle drie: 13 maanden voor events, 26 maanden voor leads, nieuwste 5 versies per pagina voor HTML. Elke stap wordt afzonderlijk afgevangen — een fout in de ene stap mag de andere twee niet laten groeien. Deletes lopen in batches van 5.000 met een lus-cap, niet als één `deleteMany` over de hele tabel: dat laatste is hoe je op een groeiende tabel een serverless-timeout of een lange lock op Neon koopt. Naast de tijdgebonden cron een **`DELETE .../submissions?id=…`** voor een individueel wisverzoek, want retentie ná 26 maanden is geen antwoord op "wis mijn gegevens nú".

⚠️ **De interessante bug is degene die niet gebeurd is.** "Bewaar de nieuwste 5 versies" is fout, en stil fout: rollback is een pointer-swap (`LandingPage.livePublishId`), dus ná een rollback naar een oude versie is de live pagina **niet** de nieuwste. Een naïeve pruner had juist de live pagina haar bevroren artifact afgenomen, waarna die terugvalt op runtime-render met verse merk-tokens — exact de stille herstijling die ADR 2026-08-12 wilde uitbannen, en niets in de UI dat het meldt. De pruner slaat de live versie daarom altijd over, ook buiten het venster.

**Een 2-reviewer-ronde over de eerste versie vond twee blockers en zeven warnings** — de moeite van het opschrijven waard, want het waren allemaal fouten van de soort "werkt vandaag, faalt stil bij groei of bij PII".

- **De afkapdatum wiste tot drie dagen te veel.** Een kale `setMonth(-13)` rolt op een maandeinde vóóruit: op 31-03 werd de cutoff **03-03** in plaats van 28-02, dus een látere grens en dus méér verwijderd; op 31-08 verdween lead-PII een dag te vroeg. Vijf maanden per jaar geraakt, en de ADR beweerde in dezelfde alinea dat dit "kalender-correct" was. Nu geclampt op de laatste dag van de doelmaand, in UTC, met zes maandeinde-/schrikkeljaar-cases vastgepind. Erger nog: de smoke gebruikte diezelfde `setMonth`-rekenkunde in zijn fixtures, dus fout en test streepten elkaar weg — de fixtures zijn nu dag-gebaseerd.
- **De HTML-pruner zou voorbij 4.000 pagina's nooit meer opruimen** — en dat kostte drie pogingen, wat het leerzame deel is. De cursor was run-lokaal en begon elke nacht bij de laagste id, en anders dan bij de deletes "verdwijnt" er niets waardoor een volgende run verder komt; door de cuid-ordening waren dat precies de nieuwste pagina's. Poging 2 (`groupBy` + `having` op HTML-dragende publishes) leek dat op te lossen maar niet: **"pagina is kandidaat" en "pagina heeft werk" zijn niet hetzelfde.** Een pagina met 6 HTML-dragende publishes waarvan de live-pointer de oudste is blijft eeuwig kandidaat (6 > 5) terwijl er niets te prunen valt, en géén aantallen-drempel kan dat onderscheiden — of de pointer binnen of buiten het venster valt is geen kwestie van tellen. Zulke pagina's hopen zich vooraan op en verhongeren de rest. Poging 3 drukt de regel exact uit met `row_number()` in één statement: kandidaten *zijn* de prunebare rijen, dus ze verlaten de verzameling zodra ze geleegd zijn en vastgelopen pagina's bestaan niet. Bijvangst: de live-uitsluiting zit nu in hetzelfde statement als de update, waardoor ook een race verdween — een rollback tussen selectie en update kon de net-live geworden versie haar artifact ontnemen.
- **Een `viewer` kon lead-PII onherroepelijk wissen.** De rolcheck selecteerde alleen `{ id: true }`, terwijl de rollback-route één map verderop expliciet viewers weert. Nu owner/admin — strenger dan rollback, want een pointer-swap is terug te draaien en dit niet.
- **De smoke was zelf een tabelbreed wisscript** dat via `npm run smoke:lp-retention` `.env.local` inlaadde, met als enige rem een comment in de docstring. Nu opt-in (`SMOKE_DB=1`), plus een weigering op een niet-lokale `DATABASE_URL` en een runtime-waarschuwing; een run zonder deel B eindigt bewust op exit 1, zodat halve dekking niet als groen leest.
- Verder: twee ontbrekende `@@index([createdAt])` maakten de nachtelijke prune een volledige tabelscan (dit is de énige schemawijziging, additief); een afgekapte run was niet te onderscheiden van een voltooide (nu `truncated` in de response plus een `console.warn`); de `IN`-lijst van de pruner groeide elke nacht mee met al-geleegde publishes; en de nieuwe cron had geen `maxDuration`, terwijl juist de laatste stap door een timeout uitgehongerd werd.

**De scherpste bevinding ging over het bewijs, niet over de code**: de IDOR-garantie stond in drie documenten en werd door géén enkele check gedekt — de test gebruikte een hand-geschreven `where` en een niet-bestaand id, en zou groen blijven als je `workspaceId` uit de route haalde. De scope-regel is daarom uit de route getrokken naar `submission-scope.ts` (Prisma- en auth-vrij), en de smoke test nu die échte functie tegen een echte submissie in een tweede workspace. Bijvangst van die splitsing: de `formId`-tak liet een gedupliceerd deliverable — dat de sectie-id's verbatim erft — de leads van het origineel wissen. Bij lezen hinderlijk, bij wissen destructief; de wis-scope bindt die tak nu aan `landingPageId: null`.

⚠️ En één claim moest naar beneden: **`workspaceId` in de `where` is defense-in-depth, niet de eerste verdedigingslinie.** Een mutatietest liet zien dat weglaten ervan de cross-tenant-casus níet opent — de isolatie zit erin dat `formIds`/`pageIds` afgeleid zijn van het geautoriseerde deliverable. Ook nieuw vastgelegd als bekende grens: een submissie zónder `landingPageId` wiens sectie-id niet meer in de draft staat is via geen route bereikbaar, dus voor die rijen is wissen vandaag ruwe SQL.

⚠️ **De scherpste bevinding van de tweede ronde ging weer over het bewijs**: één token verwisselen — `PAGE_EVENT_RETENTION_MONTHS` in plaats van `FORM_SUBMISSION_RETENTION_MONTHS` — halveert de bewaartermijn van lead-PII van 26 naar 13 maanden, en **elke check bleef groen**. De fixtures stonden op 830 en 0 dagen, dus onder béide vensters identiek; er zat niets in de band ertussen. Precies de faalrichting die bij een AVG-audit het minst te verdedigen is. Er staat nu een lead van 500 dagen en een event van 200 dagen die moeten overleven, en die vangen het.

**Bewijs**: `SMOKE_DB=1 npm run smoke:lp-retention` **47/47** tegen een echte Postgres (23 puur, 24 DB). Niet alleen groen maar getest op tanden — **zeven mutatietests, elk gemeten**, met het aantal checks dat valt: live-pointer-uitzondering uit de pure functie (3), `retentionCutoff` terug naar de naïeve versie zónder clamp én zónder guard (8), `workspaceId` uit de wis-scope (1), de twee retentie-vensters verwisseld (1), live-uitsluiting uit het SQL (2), venster telt rijen i.p.v. artifacts (3), `months`-guard weg (4). Cron end-to-end opnieuw gedraaid ná elke wijzigingsronde: 401 zonder token, 401 met verkeerd token, 200 met `truncated` per stap. `tsc` 0 · `lint` 0 errors (964 warnings, ongewijzigd).

**Een derde ronde vond nog twee dingen die het onthouden waard zijn.** Ten eerste: het bewaar-venster telde publish-*rijen* in plaats van beschikbare *artifacts*. Compile bij publish is fail-soft — de rij wordt aangemaakt en de HTML erna gevuld, met een `console.warn` bij falen — en zo'n mislukking is meestal systematisch, niet incidenteel. Een pagina met zeven publishes waarvan alleen de twee oudste nog HTML droegen, viel daardoor volledig leeg: de vijf nieuwste rijen dragen niets, en de twee laatste werkende artifacts vielen buiten het venster. Onherstelbaar, want een bevroren artifact is na een token-wijziging niet opnieuw te maken. De ranking loopt nu alleen over rijen die nog HTML dragen.

Ten tweede: `FormSubmission.landingPageId` is bewust FK-loos (leads moeten een pagina-delete overleven), dus een verwijderd deliverable laat rijen achter met een dood id. Ik had dat opgeschreven als "onbereikbaar voor lezen én wissen" — dat was **te gunstig**. Die rijen zijn via de `formId`-tak wél leesbaar en staan dus in het Leads-blok, maar de wis-scope kon er niet bij: PII die we admins tonen en die niemand kan verwijderen, en de 409 gaf de instructie "wis het bij het deliverable dat de pagina bezit" terwijl dat deliverable niet meer bestaat. De wis-route detecteert een verweesde rij nu en wist hem wél; een FK met `onDelete: SetNull` blijft de structurele oplossing maar faalt op bestaande dangling waarden en vraagt eerst een data-opruiming.

De zes robuustheid-items in dezelfde task-file blijven open.

⚠️ **Bij deploy**: `npx prisma db push` op Neon — twee additieve indexen (`PageEvent.createdAt`, `FormSubmission.createdAt`). Zonder die push draait de nachtelijke prune als volledige tabelscan; functioneel werkt hij wel.

- ADR: [docs/adr/2026-08-17-landing-page-data-retention.md](adr/2026-08-17-landing-page-data-retention.md)
- Task: [tasks/lp-review-followups.md](../tasks/lp-review-followups.md)

### 473. Campagnewizard end-to-end getest — vijf productiebugs die achter een gate zaten

De e2e-sweep van 15-08 had de campagnegenerator in zijn titel en zette het criterium op afgevinkt, met in dezelfde regel: *"De stappen ná de gate (foundation, concept, deliverables, review) zijn hiermee **niet** afgedekt."* Vier van de zeven wizard-stappen waren nooit door het klikpad gegaan. Die zijn nu alle vier gedekt — en achter die gate lagen **vijf productiebugs**, elk onzichtbaar zolang niemand er langskwam.

**De gate was niet te streng; de meting eronder was stuk** (#279). Een rijk ingevulde briefing scoorde 68 tegen een drempel van 80, wat las als "te streng afgesteld". Drie defecten in `validateBriefing`: (1) `gaps[].field` werd nooit geproduceerd omdat de prompt om *"element"* vroeg en de JSON-sleutels nergens benoemde, terwijl het schema `field` eist — gevolg: élke gap toonde "Algemeen" en de klik-naar-het-juiste-veld werkte nooit, precies de begeleiding die iemand nodig heeft om lángs de gate te komen. (2) De rubric zei `isComplete` vanaf 70 terwijl `wizard-steps.ts:75` 80 eist: het model noemde een briefing compleet waarna de UI 'm alsnog tegenhield. (3) `maxTokens: 8192` kapte de JSON af op rijke briefings — 2 van de 9 runs faalden volledig. Gemeten over 7 briefings (2 runs vóór, 2 ná): de niet-monotonie verdween (case 5 ging van 68/78 naar 88/85) en rijke briefings halen nu 85-94. **De drempel bleef staan** — met werkende scoring blokkeert 80 precies wat het hoort te blokkeren.

**Stap 4 was volledig stuk** (#280). Zodra de e2e voorbij de gate kwam: `Phase 2 (Strategy Foundation) failed: 400 — "thinking.type.enabled" is not supported for this model`. Elke Strategy Foundation-call faalde; in de UI een Continue-knop die klikbaar is en niets doet. Oorzaak: `ai-caller.ts` koos de thinking-API op een handmatige namenlijst (`/opus-4-7|opus-4-8|opus-5/`) die `claude-sonnet-5` miste. Er stond al een comment uit mei over precies deze klasse — tweede keer, andere familie. Nu detectie op modelgeneratie (≥4.7 → adaptive), geverifieerd tegen de acht modelnamen in de codebase.

**Afgekapte JSON werd een misleidende syntaxfout** (#281, #282). De opschoonstap sneed met `lastIndexOf('}')`; bij een afgekapte respons vindt die de sluithaak van het laatste complete object *binnen* een array, en het resultaat parseert als *"Expected ',' or ']' after array element"*. Er was nooit een syntaxprobleem — de code fabriceerde er een uit een truncatie, en de foutmelding toonde bovendien de eerste 200 tekens terwijl de fout op positie 1320 zat. Nu een echte brace-matcher (strings + escapes, 6/6 checks) en truncatie gaat naar de bestáánde retry-loop.

**"Approve Concept" leverde een lege campagne** (#283). `handleApprove` bouwde de blueprint met `elaborateResult?.assetPlan ?? {deliverables: []}` — een default ontworpen voor *content mode*, die in *campaign mode* binnenlekte terwijl het comment vier regels hoger zegt dat campaign mode een `elaborateResult` **vereist**. Wie op de opvallendste knop klikte kreeg stil een campagne zonder AI-aanbevolen deliverables; niemand liep vast (de catalogus staat er), maar een feature werd niet geleverd en "geen aanbevelingen" ziet er identiek uit als "de AI had niets te melden". En daaronder een tweede bug: `handleElaborate` begint met `resetPipeline()`, die `finalStrategy` en `finalArchitecture` op null zet — in het multi-variant pad de enige strategiebron, dus de elaboratie wiste haar eigen voorwaarde en de wizard bleef eeuwig op `generating_journey` staan. Dat gold al voor de bestaande Continue-route; de eerste fix maakte het bereikbaar. **Meetbaar resultaat: dezelfde wizard en briefing gaven 1 deliverable vóór en 8 erna** (blog-post ×2, linkedin-video, case-study, linkedin-carousel, landing-page, promotional-email, newsletter), met de runtime van 18-24 min naar 6,0 min.

**Wat de wizard onderweg eist, en geen bug is**: briefing ≥80 (met "verbeter met AI" als herstel), élk concept-element beoordeeld vóór goedkeuring, en minstens één geselecteerde deliverable. Die tweede kostte drie runs omdat de weigering als **toast** komt — geen `[role=alert]`, geen console-melding — dus geen van de diagnose-kanalen ving 'm; een screenshot loste het op ("0 of 6 elements rated" stond gewoon op het scherm).

**Testinfrastructuur**: `data-wizard-step` / `data-strategy-phase` / `data-elaborated` op de wizard-root plus testids op de knoppen. De Concept-stap doorloopt acht fasen terwijl het stepper-label onveranderd blijft, dus zonder die attributen leest een e2e echt werk als stilstand. Verder draft-opruiming vooraf (na 5 runs blokkeerde "Max 5 drafts per user" de suite op haar eigen residu), browserconsole in het rapport, en afronding wordt aan de DATA gevraagd — "wizard-element weg" is geen bewijs, want bij een timeout breekt Playwright de pagina af en verdwijnt datzelfde element. Tot slot (#284) de dode `deliverable-types`-keten verwijderd: route, hook, fetcher, query-key en type, plus de e2e-test die alleen `status === 200` controleerde en daarmee bestaansrecht verleende aan code die niemand gebruikt.

⚠️ **Rode draad**: in vrijwel elk geval bestond de diagnostiek al — ze kwam alleen nergens aan. De parse-fout wees naar de verkeerde plek, de gap-labels vielen terug op "Algemeen", de weigering kwam als toast, en de `console.warn` die de laatste bug verklaarde stond in de browserconsole die niemand las.

- Task: [tasks/done/campagne-wizard-e2e-restscope.md](../tasks/done/campagne-wizard-e2e-restscope.md)
- Commits: PR #279 · #280 · #281 · #282 · #283 · #284

### 472. Content-chain-accessor fase 2 + 3 — 21 van de 23 kruisingen omgezet

Vervolg op #471. De accessor stond er; deze zes PR's (#271-#276) zetten de consumenten om. Elke stap is geverifieerd tegen de ECHTE opgeslagen rijen via een nieuw script (`scripts/dev/content-chain-accessor-real-data.ts`), niet alleen tegen fixtures — de gotcha van 2026-07-12 zegt het expliciet: tsc bewijst hier per definitie niets, want beide takken compileren. Uitkomst over 39 keten-B-deliverables: **13 pagina's van 0 naar 497-1306 woorden**, 1 terecht leeg (`structured-unchosen`), **0 exceptions**.

**Fase 2 — de gebruiker-zichtbare kruisingen.** `publish-to-channel` (#1) bouwde zijn payload alleen uit de componentketen; een volle pillar-page leverde een lege payload waarop de guard uit #412 terecht blokkeerde — de gebruiker zag zijn volle pagina geweigerd. De guard is NIET soepeler geworden: `structured-unchosen` laat de body bewust leeg, want gokken wélke variant iemand bedoelde is erger dan niet publiceren naar de LinkedIn van een klant. `auto-iterate/trigger` (#5) meldde "Variant A contains 0 words" op volle pagina's. De twee apply-routes (#6/#7) schríjven een herschrijving in een component en kunnen dat voor keten B niet — de schrijf-kant staat op de niet-aanraken-lijst — dus daar is de mísleidende melding gefixt, niet het gedrag.

**De ZIP-export (#4) bleek voor élk content-type leeg**, niet alleen voor keten B: `fetchDeliverableContent` las `json.generatedText` terwijl de studio-route genest antwoordt als `{deliverable:{…}}`. Die property bestond nooit. Een type-fout kon dit niet vangen — de helper typeerde zijn eigen returnwaarde en `res.json()` is `any`; de belofte kwam van de helper, niet van de route. De "onbereikbare" canvas-export-route (#9) bleek precies de deur die dat nodig had (server-side, mét componenten) en is aangesloten in plaats van verwijderd — meteen ook de fetch-loop weg die CLAUDE.md verbiedt.

**Fase 3 — de stille kruisingen.** Hero-beelden werden gescoord zónder copy-context (#11): de coherence-judge kreeg nul context en scoorde gewoon door — geen fout, wel een betekenisloze meting. Een pillar-page als knowledge-source gaf de AI alleen titel + contentType (#13). Versie-historie kreeg nooit edit-badges voor web-pages, dus de learning-loop leerde niets van elke bewerking (#10). De **GDPR-export liet componenten volledig weg** (#15). En `derive` (#19) stond genoteerd als "dode ballast", maar was sinds fase 1 een correctheidsfout: de accessor leest `structuredVariant` als waarheid, dus een afgeleide instagram-post zou de tekst van de BRONPAGINA hebben teruggegeven — precies het risico dat de task-file zelf noemde ("de accessor kan zelf de volgende single point of failure worden").

**#18 vroeg om een ontwerp, niet om een fix.** Puck-bewerkingen emitten nooit een LearningEvent, maar naïef emitten op het PATCH-pad zou elke autosave-tick registreren. Nieuw `puck-data-text.ts` vergelijkt de COPY uit de render-boom (gesorteerde sleutels, zonder URL's/ids/enums), zodat een autosave die alleen layout of hero verzet een identieke string oplevert en dus geen event. **#21 was een half gat**: alleen de guard omzetten had het probleem één regel verplaatst en een LEGE mail naar echte ontvangers gestuurd, want `htmlBody` las nog `generatedText`. **#12 blijkt dode code** — `compileComponentFeedback` heeft zelf nul aanroepers; een keten-fix daar zou speculatief werk zijn.

⚠️ **Geverifieerd en weerlegd**: het vermoeden dat `puckData` en `structuredVariant` uit elkaar lopen (Puck-edits schrijven immers alleen `puckData`), waardoor de accessor stale tekst zou geven. Over 20 echte rijen bleek elk verschil een compositie-artefact — testimonials die de Puck-renderer samenvoegt uit losse variant-velden. Geen content-drift, geen fix nodig.

**Open**: kruisingen #2 (Content Library-stoplicht) en #3 (Brand Assistant-antwoord) — twee productkeuzes bij `structured-unchosen`, geen techniek.

Gates per PR: tsc 0 · lint 0 errors · accessor-smoke 52/52 · publish-guard-smoke 38/38 · real-data-run 0 exceptions.

- Task: [tasks/content-chain-accessor.md](../tasks/content-chain-accessor.md)
- ADR: [docs/adr/2026-07-17-deliverable-content-accessor.md](adr/2026-07-17-deliverable-content-accessor.md)
- Commits: PR #271 · #272 · #273 · #274 · #275 · #276

### 471. Content-chain-accessor fase 1 — één deur naar de drie content-ketens

Content woont in Branddock op **drie** plekken: de componentketen (`DeliverableComponent.generatedContent`), `settings.structuredVariant` voor de 11 keten-B-types (4 PUCK-webpage + 7 long-form GEO), en het vrijwel dode `generatedText`. Voor die 11 types is de componentketen **structureel leeg**, terwijl het type-systeem er juist naar wijst — 240 getypeerde toegangen tot keten A tegen ~42 rauwe tot B, en `settings` stond in het schema omschreven als "Type-specifieke settings". Dat misverstand leverde in acht weken vier keer dezelfde bug op: een volle pagina die zich als leeg voordoet. Fase 1 levert de leeslaag die dat verschil één keer afhandelt: `resolveDeliverableContent()` met een discriminated union (`components` / `structured` / `structured-unchosen` / `empty`) die de compiler exhaustiviteit laat afdwingen, plus een getypeerde `settings`-parser die Prisma-JSON defensief leest. Nog **zonder consumenten** — fase 2 en 3 migreren de call-sites.

**Vier afwijkingen van het task-file, elk gedwongen door de codebase.** (1) De spec schreef `getDeliverableContent()` in `src/lib/content/deliverable-content.ts` voor, maar dat pad én die naam zijn sinds juli ingenomen door de publieke-API/MCP-reader met een andere signatuur; hernoemen raakt publiek API-oppervlak, dus de nieuwe accessor heet `resolveDeliverableContent`. Bijvangst: **die bestaande reader is zélf een kruising** — hij levert alleen componenten, dus `get_deliverable_content` en `GET /api/v1/deliverable` geven voor keten-B-types een lege lijst. (2) De **precedentie is omgedraaid**: de spec zei "componenten → gekozen variant", maar zijn eigen sectie *De flip* eist het tegendeel en legt uit waarom — long-form defaultt op `['seo']` en flipt bij het aanvinken van het GEO-doel naar keten B terwijl de oude `variantGroups` blijven staan. Zou keten A voorgaan, dan geeft de accessor juist dán de verouderde pre-flip-tekst. Nu wint een gekozen variant altijd, met een smoke die daarop assert. (3) De lint-guard gebruikt **wel** `no-restricted-syntax` maar **gescoped** op `src/lib/**` + `src/app/api/**`: het config-bestand documenteert expliciet dat flat-config last-wins per rule-key doet en dat een extra blok de bestaande NL- en i18n-guards stil zou uitschakelen. (4) `puckData` blijft ongemoeid — 77 vindplaatsen, vrijwel allemaal legitiem render-werk.

Twee ontwerpkeuzes die de spec openliet: **beeld- en videocomponenten tellen niet als tekst** (hun `generatedContent` is de gebruikte prompt — meenemen zou beeldprompts als artikeltekst tot in exports en F-VAL-scoring laten doorgaan), en **binnen een variantgroep wint de geselecteerde component, anders variant 0** (zonder die filter plakt een tekstprojectie varianten A/B/C achter elkaar). Fail-soft is expliciet gesmoked: een half-complete opgeslagen variant laat `flattenPageVariantToText` gooien, en de accessor degradeert dan naar `empty` met een warn in plaats van een consument te 500'en — zonder terugval op componenten, want dat zou opnieuw pre-flip-tekst zijn.

De lint-regel vlagde vóór het plaatsen van de disables **17 rauwe toegangen in 10 bestanden** (het discriminatie-bewijs uit de acceptatie). Elke vindplaats kreeg een inline `eslint-disable` mét TODO en fase-verwijzing, zodat de schuld zichtbaar is op de plek zelf in plaats van in een config-lijst; alleen het hero-visual-schrijfpad staat in `ignores`. Daarbij kwam een **22e kruising** boven water die niet in de inventaris van 17-07 stond: de SEO-watchdog-agent (Iris) parseert `settings.structuredVariant` rechtstreeks. Schema-comments gecorrigeerd (`settings` benoemt nu dat er content in zit, `generatedText` als deprecated gemarkeerd) — `prisma migrate diff` tegen main: *No difference detected*, dus geen Neon-push.

Gates: tsc 0 · lint 0 errors · smoke 46/46.

- Task: [tasks/content-chain-accessor.md](../tasks/content-chain-accessor.md)
- ADR: [docs/adr/2026-07-17-deliverable-content-accessor.md](adr/2026-07-17-deliverable-content-accessor.md)
- Commit: PR #270

### 470. Golden-set-gate gesplitst — en de "flake" bleek een stabiele bevinding

De `Content Golden-Sets`-nightly stond al een maand te boek als flakey live-LLM-eval die je kon negeren. Twee bevindingen zetten dat recht. **(1) Het voorgeschreven diagnose-pad was onuitvoerbaar.** Het task-file schreef "download het artifact `golden-set-results-<sha>`" voor als eerste stap; dat artefact heeft **nooit** bestaan. De upload-stap meldde `success` met alleen een warning in de log — `No files were found with the provided path: .promptfoo-results/` — omdat de map met een punt begint en `actions/upload-artifact` hidden files standaard overslaat. Stap 1 was dus onmogelijk, en het falen was stil; vermoedelijk precies waarom de taak sinds 17-07 lag. **(2) Het zijn geen flakes.** Log-analyse over vijf nachten (08/10/13/15/16 augustus, 10 cases per run) laat steeds dezelfde cases zakken: "Napking SEO-focus extreem" **5/5**, en "NieuweBrand lege knowledge context", "Napking vage brief" en "Better Brands thought-leadership" elk 4/5. Zelfs de nacht die slaagde haalde 8/10. Het echte niveau is ~50-60% tegen een drempel van 70% — vandaar de muntworp (6 failures op 14 nachten, 43%; niet de 4-op-5 uit de meting van juli). De drempel bleek bovendien **op de rand gekalibreerd**: `ci-golden-set-e2e-fixes` stelde de set bij tot lokaal precies 7/10 en noteerde zelf "70% is de rand — nightly kan flappen". Die waarschuwing is uitgekomen en het naschrift staat nu in dat task-file.

**Wat er gebouwd is**: twee jobs i.p.v. één. `deterministic` (property-evals, plan-and-solve, tree-of-thoughts, position-swap, LP-variant-golden) is key-loos, snel en heeft harde exit-codes — die blokkeert PR's. `live-eval` (promptfoo blog-post + 70%-gate) draait alleen op `schedule` en `workflow_dispatch` en raakt geen enkele PR meer, maar faalt daar nog steeds hard. Vooraf geverifieerd dat branch-protection alleen `check` vereist en niet `evaluate`, dus de splitsing blokkeert geen merges. Artefact-map hernoemd naar `promptfoo-results/` (geen punt) mét `include-hidden-files: true` én `if-no-files-found: error`, zodat een leeg artefact voortaan hard faalt in plaats van stil te slagen; de gate print de falende cases nu bij naam in de log, zodat de eerste diagnose niet langer van het artefact afhangt. `permissions` terug naar `contents: read` — de PR-comment-stap kon niet meer vuren en is weg.

**De drempel is bewust niet verlaagd** ("de lat verlagen tot je 'm niet meer voelt"). De vier stabiel falende cases — vage brief, lege context, tegenstrijdige context, extreme SEO-eisen, precies de randgevallen waar merkgetrouwheid het hardst nodig is — zijn doorgezet als eigen taak, samen met de grotere vraag eronder: de promptfoo-sets hebben **eigen inline prompts** en referencen de productiecode niet, dus ze meten iets anders dan wat gebruikers krijgen.

- Task: [tasks/done/golden-set-gate-decouple.md](../tasks/done/golden-set-gate-decouple.md) → opvolging in [tasks/golden-set-blogpost-quality.md](../tasks/golden-set-blogpost-quality.md)
- Commit: PR #267

### 469. Brand Score meet weer echt + lifecycle-mails herschreven naar Nederlands

De Brand Score gaf **élk** gescand merk exact 70. Zes uiteenlopende sites — houtbewerker, horecatextiel, juridisch adviesbureau — kwamen alle zes op 70 uit: een constante die eruitziet als een meting, zichtbaar op de publieke resultaatpagina én in de rapport-mail. Drie structurele oorzaken. (1) `on-primary` stond niet in de rollenlijst van `draftPayloadToModel`, terwijl `scoreConsistency` juist op het primary/on-primary-**paar** checkt — die check kon nooit slagen, dus iedereen verloor dezelfde 40 punten; nu afgeleid via de bestaande `relativeLuminance` (WCAG-drempel, één luminantie-definitie in de codebase). (2) De kleurcheck keek of er kleuren wáren, niet of er gekózen was: zwarthout.com's acht "merkkleuren" zijn letterlijk het complete Bootstrap-5-palet, napking.nl draait op Tailwind-grijzen plus WooCommerce-paars. Nu wordt framework-default herkend (Bootstrap/Tailwind/WooCommerce/Material) op primary én op het aandeel eigen kleuren. (3) Guardrails en channel-tones wogen samen 50 van de 100 in AI-readiness terwijl een scan ze zelden vindt — herwogen naar 30, en wat de scan wél levert wordt gegradeerd in plaats van binair afgevinkt. Resultaat op dezelfde zes sites: **71 / 75 / 82 / 87 / 89 / 98**, met uitleg die een merkeigenaar kan repareren ("one typeface for both headings and body").

**Lifecycle-mails 2.2-2.5 herschreven (Nederlands).** De reeks uit #462 had twee tot drie CTA's per mail en was onderling uitwisselbaar; 2.5 zette "download het bestand (voor altijd van jou)" pal naast "claim een workspace" en ondermijnde zo zijn eigen vraag. Nu één CTA per mail met oplopend commitment — gebruiken (use-hub) → vergelijken (tweede scan) → aanvullen (claim) → beslissen (claim) — en download als tekstlink in de voettekst. 2.2 en 2.3 vragen bewust nog niet om een claim: wie het bestand nooit opende heeft geen reden om te betalen. **2.4 citeert de positionering die de scan uit hún site las** en vraagt of die klopt; de eerste opzet zei "5 secties onbevestigd", maar `draftPayloadToModel` zet alle vijf hard op `unvalidated`, dus dat getal was bij iedereen 5 en de personalisatie schijn. Mail 2.3 werkt bovendien pas ná de scoring-fix: zolang elk merk 70 kreeg, bewees een tweede scan juist dat het getal niets zei.

**Mailformat afdwingbaar gemaakt** (het gold als afspraak, niet als mechanisme): `renderLayout` kent nu een `locale` die `<html lang>` stuurt, plus vier body-primitives (`paragraph`/`note`/`link`/`bulletList`) die elke template kan gebruiken — ook invite, password-reset en verificatie. Bestaande templates ongewijzigd; locale optioneel met `en` als default. **Publieke brand.md-pagina's naar het Nederlands** (`/brandmd` + `/brandmd/use`, inclusief metadata en placeholders) — draait EN-first uit launch-plan §6 terug voor de funnel; spec-docs en upstream-PR's blijven Engels. `lang="nl"` staat op de marketing-wrapper omdat de root-layout `<html lang>` uit een UI-locale-cookie afleidt die een anonieme bezoeker niet heeft. **Bijvangst**: de hoofdpagina-fetch in de scan krijgt één retry bij timeout/netwerkfout — subpagina's faalden al fail-soft, maar een timeout op de hoofdpagina sloopte de hele scan én de lead (zwarthout.com timede twee van de drie keer uit op de 15s-grens). Geen retry op 4xx: dat is een bewuste weigering. Gates: tsc 0, eslint schoon, lifecycle-smoke groen — die ving tijdens het herschrijven een echte bug (`vars.domain` rauw in de HTML geïnterpoleerd, nu ge-escaped).

- Task: [tasks/brand-md-open-standaard.md](../tasks/brand-md-open-standaard.md)
- Commit: `26dbde2f` (PR #264)

### 468. E2E-sweep over alle 24 zichtbare content-types — 8 bugs, waarvan 6 stil

Een Playwright-sweep door het echte klikpad (Quick Content → Canvas → genereren) op de Napking-workspace legde bloot dat **7 van de 24 types nul tekens opleverden**. Zes van de acht bugs faalden stil: geen foutmelding, geen rode gate, hooguit een console-regel. De bestaande `content-studio`-specs konden dit niet vangen — die praten rechtstreeks met endpoints, meerdere suites mocken de route, en de config staat op 30s terwijl één generatie minuten duurt. **B1**: de SEO-pipeline stierf op stap 8/8 doordat de gebruikersprompt nog om "the final publication-ready version" vroeg terwijl de systeemprompt dat verbiedt en het budget (4000) van checklist-only uitging; bovendien was een stap-8-fout hard fataal terwijl een stap-8-*parse*fout tien regels verderop de checklist gewoon op `null` zet — er werd dus een voltooid artikel weggegooid om ontbrekende metadata. Prompt rechtgezet, budget 8000, stap 8 fail-soft. **B6**: website-varianten kapten af met **nul tekens** output; de foutmelding adviseerde "increase maxTokens", maar een probe met echte API-calls wees uit dat extended thinking standaard AAN staat op `claude-sonnet-5` en het hele budget opeet (4500 → 0 tekens, 12000 → 0 tekens, `thinking: disabled` → 3035 tekens). Budget verhogen financiert alleen meer thinking. Thinking-optie op de gedeelde client + `disabled` op de variant-generatie; de truncatie-fout benoemt dit nu zelf zodra `chars === 0` samenvalt met een thinking-block.

Verder: **B2** `AgentJob` boekte COMPLETED terwijl `SeoGenerationJob` FAILED stond — de handler kon "mislukt maar niet opnieuw proberen" niet uitdrukken, nu `NonRetryableJobError` (FAILED zónder retry). **B7** de beeldprompt ging ongekapt mee als alt-tekst en overschreed de eigen `max(500)` → HTTP 400, beeld weg, alleen een console-regel; cap in `setHeroImage` zodat alle 8 call-sites gedekt zijn (7 gaven de prompt door). **B8** `dam-auto-tagger` was volledig stuk — `temperature` op sonnet-5 geeft een harde 400, en deze route omzeilde de gedeelde client en dus diens bestaande guard. **B3** 9 verborgen types lekten in de Quick Content-picker (filterde op categorie, niet op `hidden`). **B4** `kickWorker` deed een stille early-return zonder `CRON_SECRET`: job blijft PENDING, UI toont oneindig "genereren". **B5** `/api/campaigns/wizard/deliverable-types` leidt nu af uit de canonieke registry i.p.v. zes IDs die nergens bestonden. Hertest 7/7 hersteld en op de data geverifieerd (blog-post 0→26.829 tekens met SEO-job COMPLETED 8/8; landing-page 0→10.961), met over de hele run 0 truncatie-, 0 temperature- en 0 hero-persist-fouten.

⚠️ **Meetval, gedocumenteerd**: `product-page` leek mislukt omdat de componentketen leeg was — zijn content stond in `settings.structuredVariantOptions`, de tweede keten uit ADR 2026-07-17. Het rapportscript telt nu beide ketens. Gevolg: B6 is niet-deterministisch (product-page paste wél binnen 4500 tokens, de andere vier niet).

- Task: [tasks/e2e-content-items-playwright.md](../tasks/e2e-content-items-playwright.md)
- Commit: `7d2df72f` (PR #261)

### 467. R4 compleet — noemer per regel, dismiss, en de twee ontbrekende signalen

De feedback-loop uit #466 had een gat dat pas zichtbaar werd toen ik 'm tegen de eigen data hield:
de noemer was plat `WINDOW_GENERATIONS = 200`, ongeacht wanneer een regel bestond. Een regel die
botst in bijna elke generatie waarin hij van toepassing wás, maar pas 50 generaties oud is, scoorde
6% en surfacete nooit — de loop was **blind voor precies de regels die net gecureerd zijn**. De
noemer is nu per regel: alleen generaties waarin de regel al bestond én (bij een `contentTypeFilter`)
van het juiste type was.

**`createdAt` bleek te liegen — twee keer.** De voor de hand liggende implementatie gaf op de echte
data nul signalen waar er eerst één was: alle 398 BrandRules dragen `createdAt` van de laatste sync,
terwijl de generaties uit mei-juli komen — `brand-rule-sync` doet delete+create, dus die datum is de
leeftijd van de rij, niet van de regel. Dezelfde val als het aggregeren op `ruleId` uit #466, op een
ander veld.

Mijn eerste reparatie (de eerste treffer als begin nemen) leverde mooie cijfers maar was
**niet-monotoon**: de noemer begint dan per definitie bij een treffer, dus een regel met 4
overtredingen scoorde lager dan dezelfde regel met 3 — slechter presteren maakte je onzichtbaar. Een
code-review ving dat. Wat het wél werd: ligt `createdAt` ná de nieuwste generatie, dan kán het geen
echte datum zijn en negeren we de grens. De noemer hangt zo alleen van het venster af, nooit van de
meting. Op de huidige data betekent dat: gedrag identiek aan #466 — eerlijk, want we wéten de
leeftijd niet. **En de wortel is gefixt**: beide syncs bewaren `createdAt` nu over hun delete+create
heen, dus vanaf nu is het veld wél een leeftijd en wordt de grens vanzelf actief.

**Dismiss** (`BrandStyleguide.dismissedCurationKeys`) heeft bewust geen expiry: de sleutel bevat het
pattern, dus zodra je de regel aanpast verandert de sleutel en komt de suggestie vanzelf terug.
Wegklikken bevriest deze regel in deze vórm, niet het onderwerp.

**De twee ontbrekende R4-poten**: token-overrides (≥25% van een sectie handmatig gecorrigeerd, min.
3 — "je corrigeerde 4 van de 12 kleuren, de extractie klopt waarschijnlijk niet") en review-feedback
(een `NEEDS_WORK`-review mét toelichting is het scherpste extractie-signaal dat er is, en stroomde
nergens terug). Beide staan vandaag op nul — de `source`-kolommen bestaan sinds gisteren en
`finalize` wist review-rijen — dus het paneel toont nu expliciet "nog te weinig generaties (4 van
10)" in plaats van stilte, want een lege lijst leest anders als "niets aan de hand".

**Backfill**: `scripts/dev/backfill-curated-colors.sql` beschermt de document-workspaces (Barneveld,
HNG, WRA). Twee voorwaarden, niet één: `sourceType='PDF'` **én** `detectorSource IS NULL` — dat
eerste veld wordt bij élke analyse overschreven en zegt dus "de laatste analyse was een PDF", niet
"deze rijen komen uit een document". Het UPDATE-blok staat uitgecommentarieerd in git: een review
wees erop dat `psql -f` het anders meteen uitvoert, terwijl de header een dry-run belooft.

Diezelfde review legde bloot dat de backfill het nieuwe override-signaal vals aanzette:
`source: 'user'` wordt door drie paden gezet (toevoegen, corrigeren, importeren) en alleen het
tweede zegt iets over extractiekwaliteit. Barneveld zou "je corrigeerde 10 van de 10 kleuren met de
hand" tonen, onwegklikbaar. Het signaal telt nu alleen kleuren mét een `detectorSource` — van wat we
extraheerden, hoeveel moest jij corrigeren.

Gates: tsc 0 · lint 0 errors · `smoke:rule-violation-stats` 43/43 · `preserve-user-rows` 43/43 ·
`review-drift` 23/23 · `review-drift-reset` 14/14 · `brand-library` 36/36 · `styleguide-rules` 51/51 ·
`styleguide-rules-fval` 17/17 · `geo-fidelity` 20/20 · `brand-manifest-golden` 14/14. Plus
`verify-r4-signals.ts` 12/12 op een wegwerp-workspace — nodig omdat de echte data voor die twee
signalen leeg is; zonder dat harnas zou ik alleen aantonen dát ze niets tonen.

**Schema**: één additieve kolom, vraagt een handmatige Neon-push.

Bewust blijven staan (zie `tasks/refresh-preserves-user-data.md`): de claim-release-knop, de
transactie op `claim-fields`, en het component-rename-duplicaat.

### 466. De bibliotheek leert van haar eigen gebruik — curatie-suggesties uit F-VAL-overtredingen (R4)

Het verbeterplan vroeg om een feedback-loop: *"regel X wordt in 80% van generaties overtreden — te
streng geformuleerd of verkeerd geëxtraheerd?"* De **logging bleek al te bestaan**: elke generatie
schrijft een `ContentFidelityScore` met geneste `BrandReviewFinding`-rijen, en
`mapViolationToFindingInput` zet `{ ruleId, ruleType, pattern }` in `evidence` — lokaal 331 scores
en 1141 findings. Wat ontbrak was de aggregatie per regel en het tonen ervan. Deze entry voegt dus
geen meting toe, alleen de lus die 'm terugkoppelt. Geen schema-wijziging.

**Aggregeer niet op `ruleId`** — dat is de voor de hand liggende sleutel en precies de verkeerde.
`brand-rule-sync` en `rule-structurer` doen allebei `deleteMany` + `createMany`, dus élke sync deelt
verse cuid's uit en verweest de historie: van de 24 gerefereerde regel-ID's bestonden er nog **3**.
Op `(ruleType, pattern)` aggregeren overleeft de sync wél, werkt met terugwerkende kracht op alle
bestaande findings, en levert meteen leesbare uitkomsten (6 van 7 regels nog levend).

**Het venster is een aantal, geen periode.** De eerste versie gebruikte 30 dagen; het
verificatie-harnas gaf nul signalen op alle vijf workspaces terwijl er 331 metingen lagen — het
gebruik is bursty (178 generaties in vijf weken, daarna niets, inmiddels 45+ dagen terug). Op de
laatste 200 generaties begrenzen werkt voor beide patronen en maakt de noemer precies "de
generaties waar we naar gekeken hebben". Zonder dat harnas was dit gemerged als een feature die op
geen enkele workspace iets liet zien.

**De actie zit op de bron, niet op de regel.** Van de 398 BrandRules zijn er 388 `auto:*`, en
`/api/brand-rules/[id]` weigert die expliciet te bewerken ("update the source field instead") —
terwijl élke top-overtreden regel ("luxe", "perfect", "exclusieve") juist auto-synced is. Die guard
wordt gerespecteerd, niet omzeild: het curatiepunt van een gesynct artefact is de bron, dus de
suggestie haalt de term uit `wordsWeAvoid`/`vocabularyDont` via `PATCH /api/brandvoiceguide` waarna
de re-sync de regel opruimt. Handmatige BrandRules en StyleguideRules gebruiken hun eigen CRUD.

Drempel ≥15% van de generaties bij minimaal 10 — afgestemd op de echte verdeling, niet op het
spec-voorbeeld van 80% (dat haalt geen enkele regel). Alleen regels die nog bestaan leveren een ask
op, waarmee het dangling-reference-probleem zichzelf oplost. De `heuristic:*`-regels blijven eruit:
die zijn niet te cureren en horen bij contentcoaching, niet bij bibliotheek-kwaliteit. De
StyleguideRule-lane haalt zijn levende regels door **dezelfde `compileStyleguideRules`** die de
violations produceerde — elke andere afleiding zou stil naast de sleutel grijpen.

**Wat de reviews eruit haalden.** Alle gates waren groen en het actiepad stond op 4/4, en tóch faalde
de knop voor de meeste regels: de sync expandeert stem-varianten, dus de regel met pattern
`exclusieve` hoort bij de voiceguide-term `exclusief`. De correctie filterde op het pattern, vond
niets, en gooide een fout — mét een label dat een woord toonde dat de gebruiker nooit had ingetypt.
Het harnas miste dat omdat het uitsluitend `luxe` testte, precies het woord waarvan de basisvorm de
expansie overleeft. Nu resolvet een reverse-index eerst de bron-term, en zonder resolveerbare term
komt er géén knop in plaats van een knop die zeker faalt. Verder bleek `auto:wordsWeAvoid` (zonder
`voiceguide.`) de legacy-stream uit `BrandPersonality` te zijn die een voiceguide-PATCH nooit raakt —
uit de mapping gehaald. En: drie van de vier correctie-routes invalideerden de brandstyle-cache niet,
de findings-query had geen `orderBy` onder zijn cap, dezelfde term uit twee bronvelden werd maar in
één veld opgeruimd, beide lanes deelden een sleutel, en de StyleguideRule-lane leverde knoploze asks
omdat de structurer élke regel ADVISORY maakt.

Gates: tsc 0 · lint 0 nieuwe errors (1 pre-existing) · `smoke:rule-violation-stats` 29/29 (DB-vrij) ·
`smoke:preserve-user-rows` 43/43 · `smoke:brand-library` 36/36 · `smoke:styleguide-rules` 51/51 ·
`smoke:styleguide-rules-fval` 17/17 · `smoke:review-drift` 23/23 · `smoke:review-drift-reset` 14/14 ·
`eval:brand-manifest-golden` 14/14 · `smoke:geo-fidelity` 20/20. Plus twee dev-harnassen: de
aggregatie over de échte findings (Linfi surfacet *luxe · 19% · 34/178*, en toont per regel of er
een wérkende correctie bij hoort) en het actiepad op een wegwerp-workspace (6/6 — de term eruit, de
regel weg, de andere lanes intact).

**Uit scope**: de token-overrides uit R4 — die pijp is vandaag leeg (alle 158 kleuren `scraped`,
nul claims) en vult zich pas na #465 naarmate gebruikers gaan bewerken.

### 465. Een re-analyse vernietigt geen user-edits meer (W5, relatie-niveau)

W5 beloofde dat een re-scrape "alle overrides en reviews behoudt". De helft klopte: de
analyze-routes hergebruiken sinds W5 de styleguide-rij, dus reviews, regels en snapshots overleven.
Het relatie-niveau was nooit aangeraakt. `writeResultToDb` wiste bij élke run alle kleuren
(handmatig toegevoegde weg, en elke overlevende rij kreeg een nieuw `cuid`), alle logo's — ook de
geüploade, ondanks de comment erboven die het tegendeel beweerde — en alle componenten. Acht
gecureerde don'ts-lijsten stonden als `result.x || []`, dus één lege AI-respons wiste ze. Alleen
`StyleguideFont` deed het goed, en dat patroon is nu gegeneraliseerd: `deleteMany` mét
provenance-filter, dan de overlevende user-rijen lezen, dan de inkomende batch daartegen filteren.
Die laatste stap is geen detail — zonder suppressie verruil je dataverlies voor duplicaten.

Eigenaarschap krijgt dezelfde vorm als `StyleguideRule.source`: een `source`-kolom op
`StyleguideColor` en `StyleguideComponent`, gestempeld op `'user'` zodra iemand een kleur toevoegt,
een tag corrigeert of een component bewerkt. Logo's hebben geen kolom nodig — `uploadedById` wordt
alleen door de upload-route gezet en is dus al de discriminator. De zes `*Override`-vlaggen bleken
**geen enkele schrijver** te hebben: de leescode in de engine bestond, maar geen route kon de
profielvelden zetten, dus de "override-bescherming" waar de analyze-routes naar verwijzen was een
no-op. `PATCH /api/brandstyle` accepteert die zes nu en stempelt de vlag mee.

De echte dubbele analyse-run legde bloot dat de partiële update te zwak was: hij beschermt alleen
tegen een *lege* AI-respons, terwijl een geslaagde respons een gecureerde don'ts-lijst gewoon
overschreef. Die velden hebben geen eigen rij en dus geen `source`-kolom; daarom houdt
`BrandStyleguide.userEditedFields` nu bij wélke lijsten de gebruiker zelf schreef, gevuld door de
PATCH-route en gerespecteerd door de engine. Een veld leegmaken geeft het terug aan de scraper.

**Tweede destructieve deur dicht**: `website-scanner/scanner-pipeline.ts` deed vóór een re-scan een
`brandStyleguide.delete` die zichzelf "atomic pattern" noemde. Élke relatie hangt aan
`onDelete: Cascade`, dus dat pad wiste ook de `StyleguideRule`-regels uit #461, de reviews en de
snapshots waar de driftdetectie van #463 op leunt. Nu hergebruikt hij de rij, net als

snapshots waar de driftdetectie van #464 op leunt. Nu hergebruikt hij de rij, net als
`/api/brandstyle/analyze/url` sinds W5.

Twee code-reviews haalden er daarna nog negen defecten uit die alle gates hadden overleefd. Vier
ondermijnden het doel van de taak zelf: `iconographyDonts` ontsnapte volledig aan de bescherming
doordat een expliciete sleutel ná de spread stond (geldige TypeScript, dus onzichtbaar voor `tsc`);
de claim werd alleen door de catch-all PATCH gezet terwijl de UI de vijf sectie-routes gebruikt —
exact het vlag-zonder-schrijver-patroon dat deze taak bij de `*Override`-vlaggen aanklaagt, en het
verificatie-harnas testte er langsheen door de kolom rechtstreeks te schrijven; de
sortOrder-herstempeling schoof de merkkleur naar achteren, waarna `pickBrand` in de LP-renderer een
andere kleur koos; en `resolveSemanticTokens` miste een `orderBy`, wat pas kapot gaat zodra rijen
een analyse overleven — met spontane review-drift (#463) tot gevolg. Verder: `colorPairings` misten

een analyse overleven — met spontane review-drift (#464) tot gevolg. Verder: `colorPairings` misten
de user-kleuren en draaiden de `recomputeColorPairings`-fix uit #17/#18 terug, één geüploade LOCKUP
blokkeerde álle gedetecteerde lockups, een component-rename brak de natural key (vandaar
`detectedLabel`), de kleur-PATCH claimde ook bij een lege body, en `PATCH /api/brandstyle`
invalideerde als enige mutatieroute geen cache.

**Schema-wijziging**: vier additieve kolommen, vraagt een handmatige Neon-push. Bestaande rijen
worden `scraped` — we kunnen niet achteraf raden wat ooit handmatig was, dus een bestaande
handmatige kleur is nog één re-analyse lang kwetsbaar. Gates: tsc 0 errors, lint 0 nieuwe errors (1
pre-existing), `smoke:preserve-user-rows` 43/43 (DB-vrij), `smoke:brand-library` 36/36,
`smoke:styleguide-rules` 51/51, `smoke:styleguide-rules-fval` 17/17, `smoke:review-drift` 23/23,
`smoke:review-drift-reset` 14/14, `eval:brand-manifest-golden` 14/14, `smoke:geo-fidelity` 20/20.
Plus **twee echte analyses achter elkaar** met user-edits ertussen (`verify-refresh-preserves.ts`,
24/24): de handmatige kleur, de tag-correctie, het geüploade logo, het bewerkte component en de
gecureerde lijst staan er na de refresh nog — zonder duplicaten, met de merkkleur op haar plek, en
met de gescrapte kleuren wél ververst. Er staan nu vier eigenaarschapsmechanismen naast elkaar
(source-kolom, `uploadedById`, `userEditedFields`, `*Override`) — waarom dat bewust is, staat in
`docs/adr/2026-08-14-user-ownership-bij-re-analyse.md`.

### 464. Reviewstatus vervalt wanneer een re-analyse de sectie verandert (W5-driftreset)

W5 maakte re-analyse niet-destructief — reviews blijven staan bij een refresh. Daarmee ontstond het
gat dat het verbeterplan zelf benoemt: een goedkeuring hoort bij een *specifieke versie* van de
data, dus `colors-brand` bleef APPROVED nadat een re-scrape de merkkleuren had veranderd. De
detectie hergebruikt de bestaande snapshot-machinerie in plaats van er iets naast te zetten: fase 6
van de analyse schrijft al een snapshot met hash-dedupe (`created: false` = niets veranderd, een
gratis en exacte no-op-gate) en `computeSnapshotDiff` levert al een gestructureerde diff. Nieuw is
alleen de mapping van diff-categorie naar review-sectie (`review-drift.ts`, puur) plus de reset zelf
(`review-drift-store.ts`). Alleen APPROVED gaat terug naar PENDING, met een nieuwe
`StyleguideReview.staleAt` zodat het kalibratie-paneel "gereset door drift" kan onderscheiden van
"nog nooit bekeken"; die stempel vervalt zodra de gebruiker de sectie opnieuw beoordeelt. NEEDS_WORK
blijft staan inclusief feedback, cosmetische kleurwijzigingen (RGB-afstand < 3) resetten niets, en
**`published` blijft ongemoeid** — bewust asymmetrisch met een handmatige "needs work", die wél
depubliceert: een klik is een besluit, drift is een signaal, en sinds #461/#462 hangt de hele

depubliceert: een klik is een besluit, drift is een signaal, en sinds #461/#463 hangt de hele
merkcontext-injectie aan die vlag. Bijvangst op dezelfde hook: de analyse-engine invalideerde
**nergens** een cache, waardoor de brand-library- en regel-cache na een re-analyse tot vijf minuten
de oude merkdata bleven serveren.

Dekking is bewust deelbaar: detecteerbaar zijn de drie kleursecties, fonts, de drie spacing-secties,
`system-roles`, `components-buttons` en `brand-assets-logos` (via `scrapedJson.logoUrls`). De
overige zes `components-*`-secties niet — de design-system-resolver emit alleen `button-*`-varianten
in het canonical model, dus die komen nooit in een diff voor. **Schema-wijziging**: één nullable
kolom, vraagt een handmatige Neon-push. Gates: tsc 0 errors, lint 0 nieuwe errors,
`smoke:review-drift` 23/23 (DB-vrij), `smoke:review-drift-reset` 14/14 (hermetisch),
`smoke:brand-library` 36/36, `smoke:styleguide-rules` 51/51, `eval:brand-manifest-golden` 14/14,
`smoke:geo-fidelity` 20/20. Plus een échte analyse-run op een wegwerp-workspace: drie goedkeuringen
ingetrokken, `published` onveranderd, analyse COMPLETE — het enige bewijs dat de wiring in fase 6
draait.

- Task: [tasks/review-drift-reset.md](../tasks/review-drift-reset.md)
- Spec: `docs/specs/brandstyle-designbibliotheek-verbeterplan.md` (W5, "hash-anker")

### 463. Merkcontext loopt via één gegate accessor — twaalf consumers gemigreerd + lint-regel (W7.1)

Elke consumer las tot nu toe zelf `BrandStyleguide`-velden, dus de gates (`published` + de zes
`*SavedForAi`-vlaggen) en de marker-stripping zaten verspreid over tientallen bestanden. Van de
~24 leespaden pasten er **5** gates toe. `getBrandLibrary` bestond wel, maar had **nul** consumers
en leverde alleen het manifest. **Fase 1**: de accessor is het consumptiecontract geworden — één
query, twee helften met een bewust verschil in gating (`sections` = prozacontent voor prompts,
gegate; `render` = tokens waarmee gerenderd wordt, ongegate zoals canvas-context al deed), een
`gates`-rapportage zodat "sectie ontbreekt" te onderscheiden is van "sectie is leeg", en
`mode: 'raw'` voor audit-paden die juist de ongereviewde staat moeten zien. Retourneert niet langer
`null` bij een niet-gepubliceerde styleguide, en hangt onder de bestaande server-cache met de
`brandstyle`-prefix zodat de invalidatie die élke mutatieroute al doet hem meeneemt. **Fase 2**:
acht lib-modules (`brand-context`, `canvas-context`, `knowledge-context-fetcher`,
`claw/read-tools`, `visual-fidelity-scorer`, beide `consistent-models`-resolvers,
`alignment/data-fetcher`) en vier routes (`brandstyle/ai-context`, `visual-brand-fit-check`,
`lp-fidelity-check`, `landing-pages/auto-iterate`) gemigreerd. **Fase 3**: `no-restricted-properties`
op `prisma|tx|db.brandStyleguide` als **error**, met een `ignores`-lijst die de resterende negen
lezers benoemt — bewust niet `no-restricted-syntax`, want die sleutel is al twee keer in gebruik
voor de NL/i18n-guards en flat-config doet last-wins per rule-key.

**Drie gaten gedicht**: `brand-context` las `fonts` langs `typographySavedForAi` heen (raakt Linfi +
Nobox, allebei published mét gesloten typografie-sectie); `visual-fidelity-scorer` zette een
ongegate, ongestripte `JSON.stringify` van de scrape als beoordelingsmaatstaf in de vision-judge;
`claw/read_brandstyle` en `knowledge-context-fetcher` leverden ongereviewde scrape-data aan de
assistent respectievelijk de prompt. **Grootste gedragsconsequentie**: `consistent-models` gaf
kleuren, fonts en logo-proza ongegate aan image-generatie-prompts en volgt nu dezelfde gates als
`brand-context` — bij een niet-gefinaliseerde styleguide krijgt de beeldgeneratie dus geen
merkcontext meer (lokaal 16 van 18 workspaces; op prod alleen wie de review nooit afrondde).

Bewijs: baseline-harnas (`scripts/dev/brand-context-baseline.ts`) dat `getBrandContext`,
`assembleCanvasContext`, `resolveWorkspaceBrandContext` en de alignment-module per workspace
vastlegt, met een gepubliceerde scratch-kloon omdat lokaal géén styleguide `published` is. Het
"vóór"-beeld komt uit de ongemigreerde taak-1-worktree. Elke gemeten afwijking is verklaard en
benoemd; canvas-context is byte-identiek. Gates: tsc 0 errors, lint 0 nieuwe errors (1 pre-existing
op main), `smoke:brand-library` 36/36 (DB-vrij), `smoke:styleguide-rules` 51/51,
`smoke:styleguide-rules-fval` 17/17, `eval:brand-manifest-golden` 14/14, `eval:brandstyle-golden`
PASS, `smoke:geo-fidelity` 20/20. Bijvangst-gotcha: flat-config `ignores` leest `[token]` in een
Next-route-pad als character-class, waardoor zo'n allowlist-entry stil niet matcht.

- Task: [tasks/brand-library-consumer-migration.md](../tasks/brand-library-consumer-migration.md)
- ADR: [docs/adr/2026-08-14-brand-library-consumption.md](adr/2026-08-14-brand-library-consumption.md)
- Spec: `docs/specs/brandstyle-designbibliotheek-verbeterplan.md` (W7.1)

### 462. brand.md lifecycle-mails — touchpoints 2.2-2.5 live, met opt-in en één-klik-uitschrijven

Fase 2 van de mailflow: na de rapport-mail (#455) volgen nu vier lifecycle-momenten, verzonden door de nieuwe dagelijkse cron `/api/cron/brandmd-lifecycle` (07:00 UTC). **2.2** (24 u-dag 7) geeft één praktische tip plus uitleg van `unvalidated`; **2.3** (dag 7-21) zet de benchmark-reflex in met een gratis concurrent-scan; **2.4** (dag 21-60) is feitelijk over veroudering; **2.5** (TTL ≤10 dagen) is de laatste mail. De vensterlogica zit als pure functie in `src/lib/brandmd/lifecycle.ts` — de cron blijft dun (kandidaten, versturen, boekhouden) en de beslissing is zonder DB of mailer te smoken. Harde grenzen: hooguit één mail per draft per run, cap 200 sends, `lifecycleStagesSent` als idempotente administratie, en een gemist 2.2-venster wordt stil afgemarkeerd in plaats van ingehaald — te laat versturen leest als spam.

**Toestemming is de kern van het ontwerp.** 2.2-2.4 zijn marketing en gaan alleen uit na een expliciet vinkje bij de download-gate (default UIT, `lifecycleOptInAt`); 2.5 is een transactioneel service-bericht over opgeslagen data en gaat ongeacht opt-in of opt-out — en wint van de reeks, want een TTL-melding is tijdgebonden. Nieuwe route `GET|POST /api/brandmd/unsubscribe?token=` (RFC 8058 one-click, hash-lookup als de download-route, `lifecycleOptOutAt` write-once, simpele HTML-bevestiging); 2.2-2.4 dragen `List-Unsubscribe` + `List-Unsubscribe-Post`, zodat Gmail/Outlook hun eigen knop tonen. Dat een GET muteert is bewust: een prefetch die per ongeluk uitschrijft faalt naar mínder mail.

**Copy-consistentie was een expliciete eis.** De rapport-mail beloofde "this is a one-time email — no follow-up sequence"; die belofte botste met alles wat hierboven staat. De footer heeft nu twee varianten (mét/zonder opt-in) die beide de eenmalige TTL-melding aankondigen, en de gate-copy op de generator is meegegaan. `_layout` kreeg een `footerLink` omdat `footerNote` als platte tekst ge-escaped wordt — een URL daarin kwam onklikbaar aan. Afbakening zonder backfill of uitzonderingslijst: de cron selecteert alleen drafts mét `claimTokenEnc` (versleuteld via `token-crypto`, gezet bij e-mail-capture), dus élke draft van vóór deze copy blijft automatisch buiten de reeks — precies degene die de one-time-belofte kreeg. Gates: tsc 0 errors, eslint schoon, emitter-smoke groen, nieuwe `brandmd-lifecycle`-smoke groen en mutatie-getest (vervalste vensters en genegeerde opt-out maken hem aantoonbaar rood). ⚠️ **Neon `prisma db push` vereist** voor 4 nieuwe velden op `GeneratedBrandProfile`.

- Task: [tasks/brand-md-open-standaard.md](../tasks/brand-md-open-standaard.md)
- Spec: [docs/marketing/brand-md-touchpoints-2026-08-03.md](marketing/brand-md-touchpoints-2026-08-03.md) fase 2
- Commit: zie git log (fase-2 lifecycle-mails)
### 461. StyleguideRule bereikt F-VAL's rules-pijler — doorvoer, modaliteit-scheiding en de vulling die eronder ontbrak

De Stap-0-spike mat dat regel-overtredende content (emoji, wij-vorm, superlatieven) gewoon 80+ scoorde omdat `score_against_brand` altijd `rulesEvaluated: 0` gaf: merkregels staan in `StyleguideRule`, maar de rules-pijler leest alleen `BrandRule`. **Fase A — de pijp**: `StyleguideRule` is nu een derde violation-bron in `mergeRuleResults`, naast BrandRule en de locale-heuristics, zónder materialisatie (`ruleId: styleguide:<sectie>:<id>`, `BLOCKING`→error/gewicht 3, `ADVISORY`→warning). Nieuw constraint-vocabulaire (`rule-constraints.ts`, Zod) met een tekst-familie (7 checks) en een visuele familie; alleen tekst-constraints compileren — visuele regels worden geteld en overgeslagen, want die horen bij de renderer. Gedeelde matchers uit `rule-compiler.ts` verhuisd (gedragsneutraal) plus een `unicodeWordBoundaryRegex`, omdat JavaScript's `\b` ASCII-only is en "dé"/"één" daardoor nooit matchten. Cap van 25 violations per regel zodat één brede regel de findings-persistentie niet overspoelt. **Fase B — vulling**: `BrandVoiceguide.vocabularyDont` werd nooit gesynct (91 termen over 9 workspaces bereikten de scoring niet) — nieuwe opt-in stream `auto:voiceguide.vocabularyDont`, plus een backfill-script dat weigert legacy-regels te wissen wanneer een lege voiceguide ze zou stranden. Deterministische constraint-afleiding markeerde alle 346 bestaande regels als visueel (0 tekst-checkbaar — bevestigd: de styleguide-secties zijn allemaal visueel). **Fase C — structurer**: de tekst-regels blijken in `BrandVoiceguide.writingGuidelines`/`contentGuidelines` te zitten; een AI-pass classificeert die naar constraints (nooit auteuren: geen regex, `forbidden-words` alleen met letterlijk genoemde woorden, perspectief via ingebouwde voornaamwoordtabellen) met deterministische vangnetten tegen gemiddelde-als-maximum, element-/positie-gebonden richtlijnen en elkaar uitsluitende u/je-regels. Gewired in finalize (fail-soft) + dry-run-backfill. Bijvangst: het dode `clearRuleCompilerCache` is gewired (een regelwijziging was tot 60s onzichtbaar), de gestructureerde tak van `buildHardRules` honoreert nu de `*SavedForAi`-gates die hij volledig omzeilde, en de copy/audio-views laten visuele regels weg. Gates: tsc 0 errors, lint schoon (1 pre-existing error op main in `export/design-system`), golden-eval 14/14, pure smoke 51/51 (DB-vrij), DB-smoke 17/17 (hermetische scratch-workspace: composiet 86 → 59). **Let op**: composietscores van workspaces mét regels schuiven omlaag zodra die regels bijten — pre/post-vergelijking van pilotcijfers is daardoor geen appels/appels meer.

- Task: [tasks/brandstyle-rules-to-fval.md](../tasks/brandstyle-rules-to-fval.md)
- ADR: [docs/adr/2026-08-14-styleguide-rules-in-fval.md](adr/2026-08-14-styleguide-rules-in-fval.md)
- Spec: `docs/specs/brandstyle-designbibliotheek-verbeterplan.md` (W2) + `docs/specs/spike-stap0-brand-manifest-dts-ede.md` §4

### 460. Levende laag verrijkt — Message Pillars, Art Direction en References-asset met terugwerkende kracht

De 0.3-secties zijn nu eersteklas workspace-data (waren alleen scan-draft). **Voice**: `BrandVoiceguide.messagePillars` (Json, ⚠️ Neon `db push` vereist) — voice-analyzer extraheert pillars (prompt + sanitize + review-toggle in VoiceAnalyzerReview), bewerkbaar blok in VoiceDnaSection (i18n en/nl), PATCH-route gevalideerd, claim seedt pillars uit de generator-scan. **Brandstyle**: Art Direction hergebruikt bestáánde data — `designPhilosophy` (AI Phase 3) als direction statement + photography-mood-woorden als keywords, via de resolver in de levende BRAND.md; geen nieuw veld nodig. **Merkfundament**: 12e canonical asset "References & Anti-References" (REFERENCES, categorie STRATEGY — bewust nooit scan-gevuld; menselijke keuze), automatisch in nieuwe/geclaimde workspaces, gemapt op de verplichte 0.3-subsectie. **Backfill**: `scripts/dev/enrich-brandmd-sections.ts` — niet-destructief (alleen lege velden; default dry-run, `--apply`): references-asset aanmaken, pillars afleiden uit de opgeslagen voice-corpus (1 AI-call), rapporteert styleguides zonder designPhilosophy (→ re-analyse). Smoke bewaakt de asset→subsectie-mapping.

- Task: [tasks/brand-md-open-standaard.md](../tasks/brand-md-open-standaard.md)
- Commit: zie git log (levende-laag-verrijking)

### 459. Scan-verrijking — Message Pillars en Art Direction eerlijk afgeleid

De generator streeft nu naar een zo compleet mogelijk bestand: de éne extractie-call levert additioneel `messagePillars` (3-6 terugkerende thema's + kernstatements uit de copy) en `artDirection` (design-keywords + direction statement, gegrond in de geobserveerde kleuren/typefaces die nu als context in de prompt meegaan), en de prompt maakt expliciet onderscheid tussen EXTRACTED- en INFERRED-velden zodat Personality/Promise vaker gevuld worden zonder verzinsels. References & Anti-References blijft bewust "Not yet defined" — dat is een menselijke strategische keuze en het sterkste claim-signaal. Emitter rendert de nieuwe velden in de verplichte 0.3-secties; Brand Score-completeness telt ze mee (8→10 checks); payload-velden additief-optioneel (geen schema-wijziging). Smoke + voorbeelden bijgewerkt, beide spec-valide.

- Task: [tasks/brand-md-open-standaard.md](../tasks/brand-md-open-standaard.md)
- Commit: zie git log (scan-verrijking)

### 458. BRAND.md 0.3-migratie — strikte spec-conformance voor emitter, validator en download

Hercontrole tegen de letterlijke spec-teksten (0.2 via commit-historie, 0.3 integraal) toonde dat onze "0.2-kern" een eigen lezing was: `version` als specversie-string i.p.v. integer-merkrevisie, ontbrekende `tagline`, eigen subsectienamen, en een validator die die eigen lezing circulair bevestigde. In één beweging naar spec v0.3.0: emitter met volledige frontmatter (`tagline`, `specVersion: "0.3.0"`, `version: 1`) en alle verplichte Strategy/Voice/Visual-subsecties (datamapping-tabel in de full-profile-spec v2; lege verplichte subsecties expliciet `_Not yet defined._` — nooit verzonnen); personas en Do/Don't-lijsten als `####`-conventies bínnen de spec-secties (onze upstream-PR-voorstellen, nu zelf geïmplementeerd); Typefaces zonder maten (DESIGN.md-grens); downloads heten canoniek `BRAND.md`. Validator v0.2.0 implementeert de echte resolutieregels (0.2.0/0.3.0, aliassen, malformed-`specVersion`-tabel); de emitter-smoke kruisvalideert voortaan tegen die validator. Voorbeelden geregenereerd en spec-valide.

- Task: [tasks/brand-md-open-standaard.md](../tasks/brand-md-open-standaard.md) (Uitvoeringsstand v4)
- Spec: [specs/brand-md-full-profile.md](specs/brand-md-full-profile.md) v2
- Commit: zie git log (0.3-migratie)

### 457. brand.md conformance-audit — upstream v0.3-respons, placeholder-fix, claim-time deepening

Audit tegen de upstream-spec wees uit dat thebrand.md naar **v0.3.0** is doorontwikkeld (Audience/Guardrails nu verplichte Strategy-subsecties, Governance-laag, specVersion, BRAND.md↔DESIGN.md-grens); onze v0.2-bestanden blijven per upstream-beleid onbeperkt geldig. Drie acties: (1) upstream-PR-pakket herschreven (`brandmd-upstream-proposals.md` v2) — speerpunt is nu provenance+validation-frontmatter, personas/Do-Don't als additieve conventies binnen de 0.3-secties; (2) placeholder-lek gefixt — de resolver emitte de framework-uitlegtekst (`BrandAsset.description`) als sectie-inhoud bij lege assets; fallback geschrapt, emitter en Brand Score tellen alleen echte inhoud; (3) **claim-time deepening** — POST `/api/brandmd/claim` start fail-soft de volledige intake-scan (website-scanner-pipeline via job-queue) op de verse workspace: brandstyle verdiept automatisch, assets/personas/producten via de bestaande review-&-apply-stap; claim-succespagina wijst daarheen. Ook in deze stroom: /brandmd-pagina's volledig geïntegreerd in de marketing-site (gedeelde nav/footer/licht schema, `MarketingFooter` geëxtraheerd, appHref-fix op de claim-pagina).

- Task: [tasks/brand-md-open-standaard.md](../tasks/brand-md-open-standaard.md) (Uitvoeringsstand v3)
- Spec: [specs/brandmd-upstream-proposals.md](specs/brandmd-upstream-proposals.md) v2
- Commits: `f245fb7` (site-integratie) + deze commit

### 456. Designbibliotheek-verbeterplan uitgevoerd — Brand Manifest, Brand Library-contract, regels, preview, refresh, Brand Kit Bundle

Alle stappen van `docs/specs/brandstyle-designbibliotheek-verbeterplan.md` in één werkpakket uitgevoerd (Stap 0 + W1-W7). **Stap 0**: handgemaakt DTS Ede-manifest + A/B-protocol (`docs/specs/spike-stap0-brand-manifest-dts-ede.md`; de A/B-run zelf vereist lokale DB+keys). **W1**: `BrandStyleguide.brandManifest/manifestGeneratedAt/manifestVersion` + deterministische `manifest-builder.ts` (quick facts, harde regels met provenance, semantic tokens, voice-baseline, substituties, known gaps, iteration guide), geïnjecteerd als primaire merkbron in `getBrandContext`, met Manifest-tab (digest + agent-view, "what you see is what the AI gets") en `GET/POST /api/brandstyle/manifest`. **W7**: `src/lib/brand-library/` — `getBrandLibrary(workspaceId,{view})` als verplicht consumptiepad met 7 channel-views (copy/web/image/video/audio/social/email) en `manifestVersion` als stempel-contract; golden-eval `eval:brand-manifest-golden` (12 checks). **W2**: `StyleguideRule`-model (DO/DONT/HARD_RULE, severity BLOCKING/ADVISORY als Brandclaw-gate, source in token-provenance-vocabulaire, constraint Json) + CRUD-routes + donts-migratiescript; builder gebruikt gestructureerde regels boven legacy `*Donts`. **W3**: gebruiksratio's uit `observedColorPairs` als richtlijn in het manifest ("#F1F1F1 ≈62% of observed backgrounds"). **W4**: pure specimen-generators (`specimens.ts`, met eerlijke floor cards) + Preview-tab die de stijl op échte `fixtureSamples` toepast. **W5**: `rescrape-brand.ts` default niet-destructief (refresh, `--hard` voor wissen), 6 `BRANDSTYLE_*`-flags gedocumenteerd in `.env.example`, finalize geeft kritieke kalibratie-warnings mee. **W6**: Brand Kit Bundle-export (`/api/export/brand-kit-bundle`, zip in DTS Ede-anatomie: README/SKILL.md/DESIGN.md+IterationGuide+KnownGaps/tokens.css met @font-face/tokens.json/fonts/assets/preview/ui_kit) + registratie in de export-dropdown. Gates: tsc 0 errors, bestaande golden-set 21/21, nieuwe eval 12/12. Lokaal geverifieerd: db push, donts-migratie (350 regels/17 styleguides), manifest-generatie (18 workspaces), Stap 0 A/B-run via Branddock MCP tegen prod (zie spike-doc §4 — belangrijkste bevinding: `rulesEvaluated: 0`, regels bereiken de F-VAL-engine nog niet). Nazorg tijdens verificatie: analyze-routes (URL+PDF) niet langer destructief (delete+create → refresh; dáár verdween eerder data bij re-analyse) + CRON_SECRET-dev-valkuil gedocumenteerd (zonder die variabele draait er lokaal geen job-worker en blijven analyses eeuwig PENDING). Bewust vervolgwerk: consumer-migratie naar de accessor (lint-regel), reviewstatus-reset per sectie-wijziging, renderer-handhaving van visuele constraints, StyleguideRule → F-VAL rules-pijler.

- Task: `-` (uitgevoerd vanuit spec `docs/specs/brandstyle-designbibliotheek-verbeterplan.md`, PR #254)

### 455. brand.md rapport-mail — touchpoint 2.1 live (Emailit)

De harde e-mail-gate op de generator (live-iteratie van 2026-08-14) legde adressen vast zonder er iets tegenover te stellen — deze mail maakt de gate-belofte waar. Eenmalige rapport-mail direct na de éérste e-mail-capture op een draft: Brand Score, hoofdbevindingen (gedeeld via nieuw `src/lib/brandmd/findings.ts` zodat resultaatpagina en mail exact hetzelfde vertellen), score-uitleg per dimensie, download-link, 3 gebruiksrecepten (Claude/ChatGPT/any chat) en claim-CTA. Dedupe zonder schema-wijziging (trigger alleen als `emailCapturedAt` nog null was), URLs uit het rauwe request-token (server bewaart alleen de hash), fail-soft via `trySendTransactional` — een mail-storing blokkeert de download nooit. Gate-copy belooft de mail nu expliciet; eerlijke one-time-footer met vervaldatum. Lifecycle-mails 2.2-2.5 blijven follow-up.

- Task: [tasks/brand-md-open-standaard.md](../tasks/brand-md-open-standaard.md)
- Spec: [marketing/brand-md-touchpoints-2026-08-03.md](marketing/brand-md-touchpoints-2026-08-03.md)
- Commit: `60d433c`

## 2026-07

### 454. brand.md-referentie-implementatie — emitter, gratis generator, claim-flow, leads-dashboard, validator

Autonome uitvoering van `tasks/brand-md-open-standaard.md` (omarm-strategie, launch-plan v2). **Emitter**: `brandmd` als primair markdown-formaat in het Export Format Registry — upstream v0.2-kern (Strategy/Voice/Visual) + full profile (Audience/Products/Channel Tones/Guardrails, frontmatter locales/validation/provenance); publiek profiel lekt nooit concurrenten, extended (Market Context) alleen achter auth; deterministisch met eigen smoke. Canonical/resolver additief uitgebreid; `validation:` gevuld uit echte `BrandAsset.status`/coverage. **Generator** (`/brandmd`): anonieme bounded scan (safeFetch, byte-caps, 1 AI-call), Brand Score (deterministisch, uitlegbaar: 40/35/25), scan-progress als vertelmoment, use-paneel + use-hub (`/brandmd/use`), rapport-laag achter e-mail. **Claim-borging**: `GeneratedBrandProfile` (payload+versie, gehasht CSPRNG-token, statusladder-timestamps, TTL 90d + cleanup-cron) → claim-pagina → materialisatie naar voor-ingevulde workspace via het bestaande workspace-create-transactiepatroon (canonical assets met scan-seed, voiceguide, styleguide-draft met sourceUrl, personas, producten, locale-anker) + cache-invalidatie; idempotent, e-mail-binding. **Leads-dashboard**: developer-paneel met funnel-conversies vs. touchpoints-v2-targets, per-domein-statusladder (Scanned→Paid), agency-signaal; activatie = eerste `ContentFidelityScore` (lazy write-once). **Aanroepbaar**: MCP-tool `get_brand_md` (18e) + `GET /api/v1/brand-md`. **Validator**: dependency-vrij npm-klaar package (`integrations/brandmd-validator`), gevalideerd tegen echte emitter-output; 2 voorbeeldbestanden gegenereerd via de emitter zelf; upstream-PR-pakket klaar (`docs/specs/brandmd-upstream-proposals.md`).

**Quality gates**: tsc 0 errors, eslint nieuwe bestanden 0 errors, emitter-smoke groen, validator-selftest + kruisvalidatie emitter↔validator groen. **Niet lokaal verifieerbaar** (geen DB/deploy in deze omgeving): e2e van generator→claim→dashboard; Neon `prisma db push` vereist bij deploy (nieuw model + enum).

**Erik-acties open**: strategie-gate formeel bevestigd via "voer uit"-directive; rest: outreach maintainer + upstream-PR's indienen, npm-publish validator, `db push`, deploy-smoke, Emailit-templates (follow-up-task touchpoints).

- Task: [tasks/brand-md-open-standaard.md](../tasks/brand-md-open-standaard.md)
- Spec: [specs/brand-md-full-profile.md](specs/brand-md-full-profile.md) + [marketing/brand-md-launch-plan-2026-08-02.md](marketing/brand-md-launch-plan-2026-08-02.md)
- Commits: `36f0b81` (emitter) + `52521a5` (generator/claim) + `1fc2a4f` (dashboard) + `ab8db31` (MCP/REST/validator/docs)

### 453. 8 offline workspaces naar prod gemigreerd + all-in-one import-tooling

Acht lokaal-only klant-/prospect-workspaces (org "Branddock Agency") stonden nog niet op prod. Alle 8 gemigreerd naar hun verse prod-workspace via de bestaande `migrate-brand-dna`-flow: Linfi, DTS Ede, Zwarthout, Napking, Goed-Bouw, PartnerSelect, Het Nieuwe Golfen, WRA Juristen — merk-DNA (assets, voiceguide, styleguide, brand rules, personas, producten, concurrenten) op prod geverifieerd, contenttaal per merk correct (nl/en) en elke styleguide gepubliceerd. Twee nieuwe helpers om het terminalwerk tot één commando terug te brengen: `scripts/migrate-brand-dna/import-all-2026-07-23.sh` (loopt de bewezen `import.ts` over alle bundles, leidt `--confirm-host` af uit de URL, default dry-run) en `scripts/migrate-brand-dna/nazorg.ts` (zet `contentLanguage` + publiceert de styleguide ná de import — beide migreren bewust niet mee in de bundle). Bundles onder `scripts/migrate-brand-dna/bundles/*-2026-07-23.json`. Bekend cosmetisch gat: Linfi mist 18 styleguide-preview-thumbnails (mei-extractie-artefacten, lokaal opgeruimd; echte logo's zijn externe linfi.nl-URLs, merkdata intact).

- Task: [tasks/workspaces-online-migratie.md](tasks/workspaces-online-migratie.md)

### 452. OAuth-connector-intrekpad — "Connected apps" met revoke (audit-LOW afgerond)

Het laatste audit-item dat als feature was geparkeerd (zie #451): de MCP-connector (claude.ai/ChatGPT) kreeg via de Better-Auth-mcp-plugin een `OauthAccessToken`-rij (access + refresh) per gebruiker per client, maar er was géén intrek-pad — ontkoppelen in de client stopt alleen die client; de tokenrij bleef geldig tot de 60-daagse refresh-expiry. Nu: nieuwe `listUserConnections`/`revokeUserConnection` (`src/lib/api/public/connections.ts`) die de tokens per client groeperen en, bij intrekken, de token- én consent-rijen in één transactie verwijderen (`requireOAuthToken` valideert elke MCP-request tegen `OauthAccessToken` → zonder rij onmiddellijk 401, de connector moet opnieuw koppelen én inloggen). Sessie-route `GET/DELETE /api/oauth/connections` strikt op de eigen `session.user.id` gescopet (geen IDOR; DELETE met optionele `clientId`, anders álle koppelingen). UI: `ConnectionsPanel` in Settings → API & Connectors (spiegelt `WebhooksPanel`), met revoke-knop + bevestiging per koppeling. Functioneel bewezen tegen de echte DB: 8/8 asserts (groepering, appName-join, tokenCount, transactie-delete van token+consent, en de koppeling verdwijnt uit de lijst). Daarmee is de volledige security-audit van 2026-07-23 afgehandeld.

- Task: `-` (security-audit remediatie — OAuth-revoke-feature)

### 451. Security-audit fase 3 (LOW) — DNS-rebind-bescherming bij webhook-dispatch

De outbound-webhook-dispatcher (`deliverToEndpoint`) deed een kale `fetch(endpoint.url)`. `validateWebhookUrl` draait alleen bij het aanmaken van een endpoint en checkt de letterlijke hostname — een owner/admin kan dus een publieke host registreren die later naar een intern IP resolvet (DNS-rebinding → blinde SSRF-probe, de HTTP-status komt terug in `lastDeliveryStatus`). Nu draait `assertSafeUrl(endpoint.url)` (DNS-resolutie + private/link-local/metadata-IP-check) vlak vóór elke dispatch; bij een intern adres gooit het en valt de delivery fail-soft in de bestaande catch. Sluit het laatste actief-fixbare audit-item. **Bewust NIET in deze ronde** (bewuste v1-trade-offs / feature-beslissing): OAuth-token-intrek-pad (60d refresh, geen revoke — feature, wacht op Eriks go/no-go), webhook-replay-nonce en plaintext signing-secret-at-rest (geaccepteerd, zoals Stripe/GitHub); de register-endpoint is al door de proxy-auth-ratelimit gedekt.

- Task: `-` (security-audit remediatie fase 3)

### 450. Security-audit fase 2 — info-leakage, lengtecaps + defensieve Emailit-parser

Drie MEDIUM-items uit de audit. **H2 (info-leakage)**: rauwe `err.message` (Prisma-schema-/provider-details) lekte naar API/MCP-clients. Gemaskeerd op de brede MCP-`runTool`-catch-all (`mcp-server.ts` — server-side log + generieke tool-error) en op de arbitraire catch-blokken van de generatie-services (headless-image/-video/-seo ×2 + rewrite ×2 → generieke message onder de bestaande `code`); de gecontroleerde error-klassen (HeadlessError/StrategyError) blijven hun bedoelde messages houden. **M1 (lengtecaps)**: `.max()` op de vrije-tekstvelden van generate/score/strategy/seo/webpage/rewrite in zowel REST als de MCP-spiegel (score-content 100k, briefing 20k, webpage/rewrite 10-50k, brief-velden 2k, keyword 200) — defense-in-depth bovenop de rate-limiting van fase 1b. **Emailit-parser**: `normaliseWebhookEvent` las alleen `payload.event`, terwijl Emailit `type: "email.bounced"` + `data.object` stuurt — suppression vuurde dus niet voor echte events. Nu defensief: leest beide vormen, strip't het prefix ("email.bounced" → "bounced"), en probeert meerdere kandidaat-veldnamen voor recipient/email-id binnen `data.object` óf top-level. 5/5 parser-asserts (beide vormen + null-gevallen). ⚠️ Exacte `data.object`-veldnamen nog te bevestigen met een echte delivery. Rest van de audit = alleen nog fase 3 (LOW).

- Task: `-` (security-audit remediatie fase 2)

### 449. Security-audit fase 1b — rate-limiting op de publieke Brand-API

Fixt CRITICAL-1 + CRITICAL-3: de publieke API (`/api/v1/*`, `/api/mcp`) had géén rate-limiting. Eén key kon elke generatie-route platslaan (tot 300s/req → provider-kosten + Vercel-concurrency-uitputting), en een ongeauthenticeerde flood op `/api/mcp` dwong per request een DB-lookup + Better-Auth-tokenvalidatie af (connection-pool-DoS die alle tenants raakt). De bestaande sliding-window-limiter (`checkGenericRateLimit`, Redis-backed op prod) was alleen op de sessie-routes aangesloten. Nieuwe helper `src/lib/api/public/rate-limit.ts` hangt 'm op dit oppervlak: **per-workspace 120/min** ná auth (op alle 12 v1-routes + `/api/mcp` — dekt ook H1: `score` was gratis-maar-ongelimiteerde F-VAL-judge) en **per-IP 60/min** vóór de auth-resolutie (blunt de unauth-flood; dekt ook H5). 429 met `Retry-After`. Functioneel bewezen: 6/6 asserts (120 toegestaan → rest geweigerd, buckets per workspace/IP geïsoleerd, Retry-After aanwezig). Daarmee zijn alle CRITICAL-bevindingen van de audit dicht.

- Task: `-` (security-audit remediatie fase 1b)

### 448. Security-audit fase 2 (H3) — Emailit-webhookverificatie gefixt + fail-closed

De audit (2026-07-23) vond dat `EMAILIT_WEBHOOK_SECRET` op prod niet gezet was → `verifyEmailitSignature` viel fail-open → een ongeauthenticeerde POST kon willekeurige adressen laten suppressen (ook eigen invites/resets). Bij het fixen bleek de verificatie zélf ook fout: ze tekende de HMAC over de body alleen, terwijl Emailit (docs/webhooks/request-signature) tekent over `${timestamp}.${rawBody}` met de `X-Emailit-Signature` + `X-Emailit-Timestamp`-headers en een door Emailit gegenereerd `whsec_`-secret. Elke echte delivery zou dus zijn afgewezen. Fix: verificatie herschreven naar de echte spec (hex HMAC-SHA256 over `{ts}.{body}`, timing-safe), replay-bescherming toegevoegd (5-min tolerantievenster op de timestamp), en **fail-closed in productie** — een ontbrekend secret weigert nu i.p.v. door te laten. 6/6 unit-asserts (geldig / verkeerd secret / oude body-only-vorm / replay / geen timestamp / fail-closed). ⚠️ Merge/deploy pas nadat het secret op prod staat (anders 401 op alle webhooks). **Apart geflagd (niet in deze PR)**: de event-parser leest `payload.event` terwijl Emailit `type`/`data.object` stuurt — suppression vuurt daardoor mogelijk niet voor echte events; te fixen zodra een geverifieerde test-delivery de echte payload-vorm toont.

- Task: `-` (security-audit remediatie H3)

### 447. Security-audit fase 1a — pre-flight credit-/trial-lock-blokkade op de publieke generatie-API

Fixt CRITICAL-2 uit de audit (2026-07-23): van de 8 betaalde generatie-endpoints had alleen `image-generate` een pre-flight saldo-blokkade; de overige 6 (generate, rewrite, webpage, video, seo, strategy) genereerden eerst en boekten pas daarna best-effort af (`chargeAfter(...).catch(()=>{})`). Omdat `deductCredits({force:true})` de saldo-bodem schrapt (en 0 afboekt zonder `CreditBalance`-rij), kon een key met 0/negatief saldo onbeperkt dure AI-generatie triggeren — én de trial read-only-lock omzeilen (die zit ín `enforceCreditBalance`). Nu spiegelt elke route + MCP-tool het bewezen `image-generate`-patroon: `enforceCreditsForAction(workspaceId, <action>, 1)` vóór de dure call, met de actie gelijk aan de post-hoc-afboeking (generate/rewrite/webpage = short, video = video-clip, seo/strategy = long-form). MCP-tools via een gedeelde `enforceOrToolError`-helper die de 402-NextResponse naar een tool-error vertaalt. Eén call dekt saldo + trial-lock + exempt + billing. 12 plekken (6 REST + 6 MCP). Rate-limiting (CRITICAL-1/3) volgt in fase 1b.

- Task: `-` (security-audit remediatie fase 1a)

### 446. API-sectie website: credit-toerekening + key-hygiëne verduidelijkt

De developer-sectie op `voor-ai-agents` legde de merk-vergrendelde API-key wel uit (aanmaken, curl, endpoints, "genereren kost dezelfde credits"), maar liet de vraag onbeantwoord die commercieel het meest telt: **wie betaalt die credits?** Toegevoegd: credits vallen altijd op de workspace van de key, dus de merkeigenaar betaalt z'n eigen verbruik — en voor bureaus houdt één key per klant-workspace elke klant op z'n eigen creditpot (klopt met de meter: key → workspace → org-pool, geverifieerd in de code). Plus een key-hygiëne-regel (behandel als wachtwoord, intrekken bij twijfel). Bijvangst: de REST-kaart claimde "dezelfde 17 capabilities als de MCP-tools" — gecorrigeerd naar de actuele stand (connector 17 tools, met een API-key komt `import_brand_data` erbij → 18; smoke #445). Puur copy op één pagina; geen gedragswijziging. **Terzijde geverifieerd**: `PUBLIC_API_ENABLED` staat al aan op prod (`/api/v1/brand-context` → 401, `/api/mcp` → 401, niet 404), dus de API + connector die deze sectie beschrijft leven al — er viel niets te activeren.

- Task: `-` (copy-verduidelijking n.a.v. vraag Erik)

### 445. Connector-pilot hardening — `import_brand_data` key-only + refresh-token 60d

Twee wijzigingen die de publieke MCP-connector klaarmaken voor de 6-weekse pilot. (1) **`import_brand_data` alleen nog op de API-key-route** (early return zodra `authVia !== 'api_key'`): het is de enige tool die bestaand merk-DNA overschrijft, en over de OAuth-connector is de aanroeper doorgaans zélf workspace-eigenaar — een rol-check beschermt daar dus niemand. Een API-key is een bewuste, per-merk vergrendelde handeling en daarmee het juiste toegangsniveau. Netto: **17 tools over OAuth** (claude.ai/ChatGPT), **18 met een key**. (2) **Refresh-token 7d → 60d** (`refreshTokenExpiresIn`): het token roteert alleen bij gebruik, dus 7 dagen betekent dat een tester die de connector een week niet aanraakt stil moet herkoppelen; 60d dekt een pilot-ronde plus marge. Bewust niet langer — er is (nog) geen intrek-knop, dus de expiry is de enige bovengrens op een verweesd token. Nieuwe in-memory smoke (`scripts/smoke-tests/mcp-connector-toolset.ts`, geen DB/netwerk) borgt de 17-vs-18-splitsing; marketing-connectorstappen bijgewerkt (Claude "Customize", ChatGPT developer-mode). Gebouwd in een parallelle sessie; hier afgerond + gemerged.

- Task: `-` (connector-pilot, actiepunt #18)

### 444. "Lege ACL = onbeperkt" wegwerkt — expliciete `workspaceScoped`-vlag + sweep over alle lezers

⚠️ **Deploy-volgorde**: nieuwe kolom `OrganizationMember.workspaceScoped`. Neon-push én backfill horen direct achter elkaar, vóór/bij de deploy — anders is elk gescopet lid tijdelijk onbeperkt. SQL + alternatief (`POST /api/admin/repair-defaults`) staan bovenaan de [task-file](../tasks/done/workspace-scoping-fail-open.md). Zonder de kolom 500't élk geauthenticeerd request.

Vervolg op #443. `WorkspaceMemberAccess` beperkt een member/viewer tot bepaalde workspaces, maar "nul rijen" werd overal gelezen als **onbeperkt** — een fail-open default die op drie manieren toesloeg: een verwijderde workspace cascadeerde de laatste rij weg (lid werd stil onbeperkt), de team-UI met alles uitgevinkt wiste alle rijen (bedoeld als "geen toegang", gaf toegang tot álles), en elk pad dat per ongeluk geen rijen schreef deed hetzelfde. De nieuwe vlag maakt "beperkt tot niets" uitdrukbaar: `true` = uitsluitend de gekoppelde rijen, `false` = onbeperkt; owner/admin bypassen de ACL sowieso.

De review legde bloot dat #440 alléén de resolver had omgezet. Vier andere lezers stonden nog op de oude telling en zijn meegenomen: `canActInWorkspace` (acting identity voor agent-runs, untrusted webhook-payload), `getWorkspaceUsers` (notificatie-fan-out), de workspaces-lijst, `POST /api/workspace/switch` en de publieke MCP/REST-`brand-resolver` (3 plekken). Verder: invite-accept keek naar `aclCount` i.p.v. de vlag en sloot daarmee juist een gestrand lid voorgoed buiten; workspace-delete meldt nu welke leden zonder workspace achterblijven (tot in de UI); de team-tabel toont "Geen toegang" i.p.v. "Alle"; en `repair-defaults` kreeg een idempotente backfill met diagnose.

Bewezen: na het verwijderen van zijn énige workspace geeft `hasWorkspaceAccess` voor dat lid **false** (was `true`), lege-ACL-leden ongewijzigd, backfill 2 → 0, `strandedMembers` correct gerapporteerd, Playwright `invite-accept` 6/6 en `permissions` 19/19 inclusief een nieuwe scoping-test.

- Task: [tasks/done/workspace-scoping-fail-open.md](../tasks/done/workspace-scoping-fail-open.md)
- ADR: `-`
- Gotcha: zie de 2026-07-22-entry over fail-open defaults
- Commit: `ff4cc5e1`

### 443. Workspace-scoping écht afdwingen — ACL-blinde resolver, tweede deur, rol/seats, tokensterkte

Vervolg op #442, dat gescopete uitnodigingen voor het eerst accepteerbaar maakte en daarmee blootlegde dat de scoping uit PR #220 **adviserend** was. Zes punten gesloten. (1) **De workspace-resolutie is ACL-bewust**: `getWorkspaceForOrganization` koos de *oudste* workspace van de organisatie zonder ACL-check en `getExplicitWorkspace` valideerde de cookie alleen op org-lidmaatschap — een gescopet lid dat zijn cookie wiste of vervalste las dus data buiten zijn scope, op een pad dat ~398 API-routes vertrouwen. Nieuwe gedeelde `accessibleWorkspaceIds`/`firstAccessibleWorkspace` spiegelen exact de regels van `hasWorkspaceAccess` (owner/admin bypassen; lege ACL = onbeperkt), zodat owners, admins en leden met lege ACL ongewijzigd gedrag houden. (2) **Tweede deur dicht**: de Better-Auth-organization-plugin exposeert een eigen `accept-invitation` op dezelfde tabellen die `workspaceIds` niet kent en dus een lid met nul ACL-rijen (= onbeperkt) aanmaakte; die route wordt nu in `beforeAcceptInvitation` geweigerd — bewust blokkeren i.p.v. nabouwen, omdat een `after`-hook per definitie ná de commit draait en dus niet fail-closed kán zijn. (3) **Rolverzoening** bij her-uitnodigen, met een vers-heidscheck (een 7 dagen oude mail overschrijft geen bewust gewijzigde rol) en een laatste-actieve-owner-guard. (4) **Seat-limiet** wordt nu ook bij accepteren gecheckt. (5) **CSPRNG-tokens** (`randomBytes(32)`) i.p.v. de `cuid()`-default, plus een per-IP rate-limit op het accept-endpoint. (6) **Playwright-spec** over zes takken van de accept-pagina (6/6 groen).

Bewezen met echte runs: gewiste én vervalste cookie landen binnen de scope, lege-ACL-leden ongewijzigd, plugin-deur geeft 400 en laat géén half lidmaatschap achter (uitnodiging blijft `pending`), rol member→viewer verzoend, token 43 tekens base64url, e-mail genormaliseerd.

- Task: [tasks/done/invite-acl-hardening.md](../tasks/done/invite-acl-hardening.md)
- ADR: `-`
- Gotcha: "leeg = onbeperkt" is fail-open + een `after`-hook kan niet fail-closed zijn (2026-07-22)
- Commit: `9822c04c`

### 442. Uitnodigingsflow gerepareerd — dode accept-link, verkeerde naam in de mail, resend die niets verstuurde

Eriks test-uitnodiging legde drie bugs bloot. (1) **De accept-link was dood**: de invite-mail linkt sinds dag één naar `/invite/accept?token=…`, maar die pagina heeft **nooit bestaan** (`git log --diff-filter=D` leeg) — de enige handler was de gelijknamige POST-**API**-route, die een GET vanuit een mailclient niet beantwoordt. Élke uitnodiging ooit liep dus dood op een 404; tweede vindplaats van exact de klasse die `reset-password` eerder trof. Gebouwd als zelfstandige client-page naar dat patroon (dus zonder `AuthGate`/`App.tsx` te raken), die alle zes endpoint-takken naar schermen vertaalt en het hoofdpad afhandelt dat ontbrak: een genodigde **zonder** account meldt zich inline aan met het uitgenodigde adres vastgezet. Na accepteren wordt de uitgenodigde organisatie expliciet actief gezet — zonder dat landt een net-aangemelde genodigde in zijn eigen lege auto-org van `provisionNewUser`. NL/EN via `?lang=` uit de mail. (2) **De mail noemde altijd de organisatie**: `Invitation.workspaceIds` (PR #220) werd nergens gebruikt, dus een uitnodiging voor één workspace las "Erik Jager's Brand" i.p.v. de workspace. Nieuwe gedeelde helper `resolveInviteTargetName` (één workspace → workspace-naam; nul of meerdere → organisatie) voor mail, accept-respons én resend; template-veld hernoemd `organizationName` → `targetName` zodat tsc elke call-site dwong mee te gaan — ving direct een vergeten vindplaats in `scripts/emailit-smoke-test.ts`. (3) **"Opnieuw versturen" verstuurde niets**: de route verzette alleen `expiresAt`; nu rendert en verstuurt hij de mail daadwerkelijk (fail-soft, de verlenging blijft staan als mail faalt). Browser-smoke: alle zes takken groen, aanmelden→lid→juiste org actief bewezen, 0 onverwachte console-errors.

**Review-ronde (4 passes, 7 subagents) legde nog vier defecten in het nieuwe pad bloot**, alle gefixt en gesmoked: (a) **hoofdlettergevoelig e-mailadres** — Better Auth lowercaset bij sign-up, wij sloegen verbatim op, dus een uitnodiging aan `Naam@Domein.nl` maakte een account op `naam@domein.nl` en liep daarna eeuwig op 403 vast, met de enige uitwegknop als lus (nu genormaliseerd + hoofdletterongevoelig vergeleken voor legacy-rijen); (b) **fail-open bij een verwijderde workspace** — nul ACL-rijen betekent ONBEPERKT (`workspace-resolver.ts:103`), dus een uitnodiging voor één inmiddels verwijderde workspace gaf toegang tot álle workspaces; nu fail-closed vóór de sessiecheck; (c) **de token-strip (tegen een PostHog-lek via `$current_url`) maakte de "uitloggen en opnieuw"-knop dood** — de reload landde op "link niet geldig"; token nu in `sessionStorage` + expliciete navigatie; (d) **ingetrokken uitnodigingen** meldden "al gebruikt" (twee spellingen in dezelfde tabel: onze `cancelled`, Better Auth's `canceled`/`rejected`). Verder: `code`-contract i.p.v. regex op Engelse fouttekst, P2002-race, workspace-cookie op alle succespaden, resend-cooldown, en het `emailSent`/`WORKSPACE_GONE`-signaal naar de UI. Zes takken browser-gesmoked, 0 hydration-warnings, 0 console-errors.

**Bewust NIET meegenomen** (documented in de task-file, vragen om Eriks besluit): de ACL-blinde `resolveWorkspaceId`/`getExplicitWorkspace`, de parallelle Better-Auth-accept-endpoint op dezelfde tabellen, rolverzoening bij her-uitnodigen, seat-limiet bij accepteren, cuid-tokens + rate-limiting, en e2e-dekking.

- Task: [tasks/done/invite-flow-fixes.md](../tasks/done/invite-flow-fixes.md)
- ADR: `-`
- Gotcha: mail-link naar een nooit-gebouwde landing (2026-07-22, tweede vindplaats)
- Commit: `dd7a5524`

### 441. Training-terminologie opgeruimd na de Stijlstudio-hernoeming

Sluitstuk van #439: de UI sprak nog overal over "getrainde modellen" terwijl er sinds #227 niets meer getraind wordt. **Levende teksten herschreven** (NL+EN): canvas-blok trained-style (laadtekst, lege staat, "Getraind model" → "Stijlmodel", stijlsterkte-hint verwijst nu naar de referentiestijl i.p.v. "het getrainde onderwerp"), de bron-chip "Getraind" → "Stijlmodel", de generator-omschrijving ("fine-tuned brand model" → stijlmodel), en in de Stijlstudio zelf de selectie-hint, de minimum-eis, de notitie-placeholder en "Trainingssamples" → "Voorbeeldbeelden". De curatietips heetten "Curatietips voor sterke LoRA-training" en bevatten een inmiddels onjuist advies over trainingsdata vs inferentiemodel — herschreven naar referentieset-taal. **Dode sleutels verwijderd**: de secties `shared`, `training`, `trainingModal` en `trainingStatus` (0 verwijzingen; hun componenten sneuvelden in #227) plus `detail.trainingFailedAlert`. **Bijvangst**: de statistiek-kaart "Training" telde een status die niets meer zet en stond dus permanent op 0 — nu "Concept"/"Draft" met de `draft`-waarde die de API al meestuurde. NL/EN-sleutelpariteit geverifieerd (274/274 en 371/371).

- Task: `-` (sluitstuk hernoeming #439)

### 440. Migratie-import waarschuwt bij contenttaal-verschil

De `Workspace`-rij migreert bewust niet mee in een merk-DNA-bundel (het ís de doel-workspace), dus `Workspace.contentLanguage` bleef bij een klant-migratie stil op de oude waarde staan: Nederlands merk-DNA landde in een Engelse workspace, waarna de settings-UI een andere taal toonde dan de generatie gebruikte. Twee keer geraakt — Better Brands (#411) en Adullam (2026-07-22). De export legt de bron-contenttaal nu vast in `meta.sourceContentLanguage`; de import vergelijkt die met de doel-workspace en waarschuwt bij verschil, in dry-run én echte run, met de instructie om de taal na afloop in de app om te zetten. Bundles van vóór dit veld slaan de check stil over. Bewezen op de echte Adullam-bundle: `nl` → Engelse doel-workspace geeft de waarschuwing, `nl` → `nl` zwijgt.

- Task: `-` (preventie n.a.v. de Adullam-migratie, #437)

### 439. "AI Trainer" hernoemd naar Stijlstudio (app + website)

Besluit Erik na de geslaagde hertest: sinds de #227-ombouw wordt er niets meer getraind (≥3 referentiebeelden → direct genereren), dus de naam dekte de lading niet meer. **NL: Stijlstudio · EN: Style Studio** — alle gebruikerszichtbare plekken om: sidebar-navigatie (beide locales), paginakop, "Terug naar…"-knoppen (3×), showcase-label, module-registry in `design-tokens.ts` en het credit-label op de marketing-pricingpagina. Twee bijvangsten: (1) de paginakop en de knop "Create Model" stonden **hardcoded in het Engels** — nu via i18n (`consistent-models.page.*`), dus de pagina is eindelijk tweetalig; (2) de canvas-hint stuurde gebruikers nog naar "train eerst een Consistent AI Model" — herschreven naar de werkelijkheid (stijlmodel maken met minimaal 3 referentiebeelden). Interne sleutels, routes en API-paden (`ai-trainer`, `/media/trainer`, `/api/consistent-models`) bewust ongewijzigd: geen gebruikerswinst, wel gebroken bladwijzers. Code-commentaren meegetrokken zodat de oude naam nergens meer rondslingert.

- Task: `-` (naamsbesluit Erik 2026-07-22, restpunt uit de trainer-ombouw #227)

### 438. MCP write-tool `import_brand_data` + werkbestand-flow + Adullam-import

Publieke MCP-tool (18e) die merkonderdelen idempotent in een merk laadt: de 11 brand assets (frameworkData per canonieke slug, deep-merge, auto-versioning incl. pre-import snapshot), brand voice (incl. BrandRule-sync), personas, producten, concurrenten, Trend Radar-trends en kennisbronnen. Gedeelde service `importBrandData()` met volledige tweede-deur-pariteit (plan-limits, trial-lock, rol-gate op workspace-settings, locale-anker-sync, researchMethods-provisioning, cache-invalidatie) en isLocked-respect op elk pad. Invulbaar werkbestand-template (`docs/templates/werkbestand-merkonderdelen.md`) + gevuld Adullam-importscript. Vijf review-rondes (10 subagents) doorlopen; alle CRITICAL/WARNING-bevindingen gefixt. Gebouwd in een Cowork-sessie op branch `claude/branddock-merkonderdelen-werkbestand-o2tmfs`; hier gemerged nadat de halve merge in de main-worktree was afgerond (entry hernummerd 433 → 438 wegens collisie met #433-#437).

- Task: [tasks/done/mcp-import-brand-data.md](../tasks/done/mcp-import-brand-data.md)
- ADR: `-`
- Spec: [docs/templates/werkbestand-merkonderdelen.md](templates/werkbestand-merkonderdelen.md)

### 437. Adullam-migratiebundle + migrate-tooling op workspace-id

Adullam bestond dubbel: het merk-DNA (import 21-07 via `scripts/import-merkonderdelen/adullam.ts`, dat `.env.local` laadt) landde in de **lokale** workspace, terwijl de klant-workspace op productie leeg bleef — Erik zag daardoor niets in de app. Bundle `adullam-2026-07-22.json` geëxporteerd: 76 rijen (11 brand-assets, voiceguide, styleguide + 10 kleuren, **19 brand rules**, 7 persona's, 6 producten, 1 concurrent). Drie tooling-verbeteringen die hieruit volgden: (1) `import.ts` accepteert nu **`--workspace-id`** — de enige eenduidige sleutel, want merknamen bestaan dubbel (lokaal én prod een "Adullam") en slugs zijn niet org-gescoped; `--slug` stopt voortaan bij meerdere treffers i.p.v. er stil één te kiezen. (2) De export-detector voor lokale beeld-refs matchte `/uploads/` óók binnen externe URL's → vals "draai upload-images"-alarm; nu wordt alleen een relatief pad (of localhost-URL) als lokaal geteld, bewezen met 5 URL-vormen. (3) Databronfix: de 7 `brandImages` uit de april-website-scan misten het `/wp-content`-deel (404); hersteld naar de geverifieerde absolute URL's (7× 200) in de lokale bron, zodat ook her-exports kloppen.

- Task: `-` (klant-migratie + tooling-hardening)

### 436. Credit-prijs stijlreferentie-beelden — nieuwe actie `image-4k` (5 credits)

Vervolg op Eriks "het bedrag klopt niet"-melding; besluit door Erik gedelegeerd ("maak hier een weloverwogen keuze"). Trained-style-beelden draaien sinds #435 op 4K via het Nano Banana `/edit`-pad met multi-ref — fal factureert per output-resolutie (4K ≈ 2× 1K), waardoor de generieke 2-credits-prijs de COGS niet meer dekte (marge ~0/negatief vs de ~46%-doelmarge uit de pricing-ADR 2026-07-07). Keuze: nieuwe `CreditAction` **`image-4k` = 5 credits** voor de drie stijlreferentie-flows (trainer-generate, AI Studio TRAINED_MODEL, canvas trained-style — charge én Gate-B-preflight waar aanwezig); reguliere beelden blijven 2. De pricing-pagina toont het nieuwe tarief automatisch uit de registry ("Beeld in jouw merkstijl (AI Trainer, 4K) — 5"). Terugdraaibaar met één registry-regel als Erik anders besluit.

- Task: `-` (micro-besluit binnen ADR 2026-07-07-pricing-credits-launch)
- ADR: [2026-07-07-pricing-credits-launch](adr/2026-07-07-pricing-credits-launch.md) (per-actie-registry, bewust bijstelbaar)

### 435. AI-trainer afwerking — previews op overzicht/hero, generatie-registratie, 4K-output

Eriks vervolgtest (22-07-nacht) na de #433/#434-fixes: stijl komt door, maar vier afwerkingsgaten. (1+2) **Previews**: niets zet nog een `thumbnailUrl` nu LoRA weg is — de lijst-API levert nu een resolved `previewUrl` (thumbnail ?? eerste referentiebeeld) voor de overzichtskaart, en de detail-hero valt terug op het eerste referentiebeeld. (3) **Twee-ketens-gat** (gotcha 2026-06-24-klasse): de AI Studio-route schreef alleen een `GeneratedImage` (mediabibliotheek) — trained-model-generaties maken nu óók fail-soft `ConsistentModelGeneration`-rijen aan (+`usageCount`-increment + cache-invalidatie), zodat de model-detailpagina hero/galerij/teller vult. (4) **4K**: `resolution`-optie op `generateFalImage` (default '1K'); de drie stijlreferentie-flows genereren op '4K' — geverifieerd met echte call via het /edit-pad: 4096×4096, 11,8MB (onder de 25MB-cap). Let op: fal rekent per output-resolutie, dus 4K verhoogt de COGS per trainer-beeld; de credit-prijs (2/beeld) is ongewijzigd.

- Task: `-` (bugfix-vervolg, zelfde keten als #433/#434)

### 434. AI-trainer bugfix ronde 2+3 — AI Studio-route + anchors + Nano Banana /edit-endpoint

Eriks hertest na #433 faalde identiek; twee extra lagen gevonden. **Ronde 2**: de "Beeld genereren"-knop loopt via `/api/media/ai-images/generate` (derde generate-route, gemist in de sweep) — nu ook door de URL-resolver, net als `fetchBrandStyleAnchors` (MediaAsset.fileUrl, dekt generate-visual/feature-visuals/logo-audit) en de model-detail-hero (`thumbnailUrl`/`sampleImageUrls`). **Ronde 3 (de echte stijl-killer)**: lokale probe met echte fal-calls bewees dat het `nano-banana-pro`-t2i-endpoint `image_urls` volledig negeert (fal dropt onbekende velden stil) terwijl de `/edit`-variant dezelfde refs wél volgt. Cure centraal in `generateFalImage`: automatische endpoint-switch naar `/edit` zodra refs meegaan op een nano-banana-model — alle callers gedekt. Bijvangst: F39-image-edit stuurde het bronbeeld óók naar t2i (werd stil genegeerd) → nu /edit; F40-anchors werkten op nano-banana nooit. End-to-end gevalideerd: illustratie-refs → illustratie-output in referentiestijl.

- Task: `-` (bugfix-vervolg, zelfde sessie als #433)
- Gotcha: [gotchas.md 2026-07-21](../gotchas.md) (uitgebreid met ronde 2+3)

### 433. AI-trainer bugfix — opgeslagen storage-URLs bij het lezen resolven (verlopen signed R2-URLs)

Eriks trainer-test na de #227-ombouw legde drie symptomen bloot met één oorzaak: oudere `ReferenceImage`/`ConsistentModelGeneration`-rijen dragen **verlopen signed R2-URLs** (van vóór `R2_PUBLIC_URL` op prod). De generate-routes stuurden die rauw als fal-`image_urls` — fal kon geen enkele referentie downloaden en Nano Banana genereerde **stil zonder stijl door** (illustratiestijl → foto), en de UI-previews 403'den. Lokaal onzichtbaar (local storage = niet-verlopende `/uploads/`-paden). Fix: nieuwe `resolveStorageUrl()`-helper (`src/lib/storage/resolve-storage-url.ts`) die élke opgeslagen URL-vorm (path-style én virtual-host signed, kale key, publieke CDN) bij het lézen normaliseert naar `R2_PUBLIC_URL` of een verse signed URL — toegepast in beide generate-routes en de drie serve-routes (model-detail, generations, reference-images). Assert-test 6/6 groen; echte prod-flow-validatie door Erik na deploy.

- Task: `-` (bugfix, root-cause-trace in sessie 2026-07-21)
- Gotcha: [gotchas.md 2026-07-21](../gotchas.md)

### 432. Pilot-claim hermeting — vanilla-baseline naar gpt-5.6, +7-claim blijft staan

Go Erik na fase 2. De in-product vanilla-baseline is gemoderniseerd (gpt-4o → gpt-5.6, incl. max_completion_tokens-fix) en de on-brand-gap is opnieuw gemeten met de volledige nieuwe stack: 3 content-types × 2 briefing-condities, Branddock (opus-4.8 + BVD) vs vanilla gpt-5.6 én gpt-4o-referentie, symmetrisch gescoord via F-VAL met de nieuwe judges. Uitkomst: **+6,8 gemiddeld tegen gpt-5.6** — de "+7"-claim blijft staan tegen de eerlijke moderne baseline; magere briefing +11 (patroon herhaalt zich), newsletter +9,5, gpt-4o-referentie +9,7 (het betere vanilla-model verklaart ~3 punten versmalling). Zwakste cel: rijk-gebriefde blog (−5) — niet mee demo'en. Rapport: docs/reports/pilot-hermeting-2026-07-21.md; script reproduceerbaar in scripts/experiments/. PR #229.

- Task: `-` (hermeting-opdracht Erik 2026-07-21)

### 431. LLM-modellen-refresh fase 2 — F-VAL-judges gekalibreerd en omgezet

Op Eriks go. Gepaarde kalibratie (10-teksten-corpus × oude vs. nieuwe judge, identieke rubric-context; script in scripts/experiments/) vooraf: gpt-5→gpt-5.6 composite-effect +0,5, sonnet-4-6→sonnet-5 −1,8 — beide binnen de ±2-band, dus swap zónder drempelwijziging (75/65 blijven). Sonnet 5 discrimineert AI-slop scherper (−18) bij vrijwel gelijke on-brand-scores. Mee omgezet: visual-judge (advisory pad) en STRICT-rewrite-generator naar sonnet-5. Bewust bevroren: vanilla-baseline op gpt-4o (meetinstrument +7-pilotclaim — moderniseren = productbesluit + her-meting). Kalibratie + besluit gedocumenteerd in docs/reports/model-review-2026-07-21.md. PR #228.

- Task: `-` (fase 2 van de modellen-review, go Erik 2026-07-21)

### 430. AI-trainer omgebouwd — LoRA-training eruit, referentie-gedreven generatie erin

Eriks kwaliteitsoordeel + go ("kunnen we de lora-training niet ombouwen?"). De structureel zwakke fal.ai-LoRA-pijplijn (trainen op 10-20 beelden, wachttijd, kosten, veroudert per basismodel) is volledig verwijderd; de drie generatiepaden (model-showcase, studio trained-style, media-library TRAINED_MODEL) draaien nu op multi-ref generatie: de referentiebeelden van het model gaan als image_urls rechtstreeks mee (Nano Banana Pro, cap 14 — zelfde mechanisme als brand-style anchors/F40). Upload + Claude-Vision-stijlanalyse + showcase blijven; minimum 3 refs (was 10), model is READY bij genoeg refs, wizard zonder trainingsstap, strength-slider vervallen. Bestaande modellen blijven werken via hun referentiebeelden. Geen schema-migratie (LoRA-kolommen ongebruikt laten staan — geen Neon-push). Opgeruimd: train/training-status-routes, training-pipeline/-poller, fal-LoRA-primitieven, LORA_QUALITY_CONFIG/FAL_MODEL_CONFIG/TRIGGER_WORDS, dode REPLICATE_API_TOKEN-env. PR #227.

- Task: [tasks/trainer-refs-ombouw.md](../tasks/trainer-refs-ombouw.md)

### 429. LLM-modellen-refresh fase 1 — generatie-paden naar de juli-2026-generatie

Review + swap op Eriks verzoek ("betere modellen bijgekomen"). Alle generatie-paden (45 bestanden: register-defaults, pickers, campagne-chain, canvas-routing, 10 agents, exploration, knowledge-research, brandstyle-analyse, persona-chat, trend-radar) van drie door-elkaar-lopende generaties naar: Claude Sonnet 5 (werkpaard), Claude Opus 4.8 (premium), GPT-5.6/terra/luna, Gemini 3.5 Flash / 3.1 Flash Lite; Claude Fable 5 als picker-optie. Bijvangst: twee door Google uitgezette model-ids (gemini-3-pro-preview, gemini-3.1-flash-lite-preview) uit code/pickers — dat waren actieve breukpunten — en prijstabellen bijgewerkt incl. first-match-ordering-fix. Bewust onaangeraakt: F-VAL-judges + vanilla-baseline (fase 2 mét golden-set-kalibratie), embeddings (vectors), dall-e-3-beeldpaden. Volledig rapport: docs/reports/model-review-2026-07-21.md. PR #226.

- Task: `-` (review-opdracht Erik 2026-07-21)

### 428. AI-trainer: upload-duidelijkheid afgemaakt + stijlanalyse-storage-fix

Drie vervolg-fixes op de upload-arc van #426. (1) PR #222: de weiger-alert toont nu de échte serverreden per bestand (te klein/te groot/corrupt) i.p.v. een kale "(400)". (2) PR #223: de uploader leest afmetingen vooraf in de browser (createImageBitmap) — te kleine (<512×512) of onleesbare bestanden krijgen direct een nl/en-melding mét gemeten maten, vóór er iets geüpload wordt. (3) PR #224: "Style analysis failed: The specified key does not exist" — de upload-route schrijft de volledige publieke URL naar `ReferenceImage.storageKey`, maar de stijlanalyzer gebruikte dat veld letterlijk als R2-sleutel (lokaal werkte het toevallig via de pad-vorm). `toR2Key()` normaliseert nu URL/pad/sleutel op alle drie de leespaden (GetObject, publieke URL, signed URL) — repareert ook bestaande rijen zonder datamigratie.

- Task: `-` (bugfix-arc)

### 427. Uitnodigingen en leden per workspace scopen

Erik: uitgenodigde leden werden meteen lid van álle werkomgevingen. Het ACL-model (`WorkspaceMemberAccess`, leeg = alle, afgedwongen in `hasWorkspaceAccess`/switch-route) bestond al maar werd door de invite-flow nooit gevuld. Nu: `Invitation.workspaceIds` (additieve kolom — **Neon db push vereist vóór gebruik op prod**), invite-route valideert de selectie (alleen member/viewer; owner/admin bypassen de ACL → 400), accept-route zet de ACL-rijen in de transactie, nieuwe PATCH `settings/team/members/[id]/workspace-access` voor bestaande leden, en `GET /api/workspaces` filtert nu ook de lijst voor beperkte leden (voorheen: alles zichtbaar, switchen 403). UI: workspace-kiezer in de uitnodigingsmodal (standaard = actieve werkomgeving bij "alleen geselecteerde"), werkomgevingen-kolom + "Werkomgevingen beheren" in de ledentabel, scope-regel op openstaande uitnodigingen (nl/en). Smoke op dev-DB: gescoped lid ziet alleen zijn workspace, lege ACL = alle. PR #220.

- Task: [tasks/workspace-scoped-invites.md](../tasks/workspace-scoped-invites.md)

### 426. AI-trainer upload: stille totaalfaal na per-bestand-fix hersteld

Vervolgbug op #425/PR #217: één geweigerd bestand (bv. model al op max 20 referentiebeelden) brak de hele per-bestand-uploadloop af, de hook invalideerde alleen bij succes en de UI toonde geen enkele foutmelding — samen leek uploaden "helemaal stuk". Nu: fouten per bestand verzameld (geslaagde uploads blijven staan), query-invalidatie via onSettled (ook na fouten), en duidelijke alerts (volledige faal + deels-geweigerd met details, nl/en). PR #219.

- Task: `-` (bugfix <30 min)

### 425. Gemeente Barneveld merk-DNA-seed + channelTones-fix in AI-context

Klant-workspace "Gemeente Barneveld" gevuld vanuit de aangeleverde brondocumenten (huisstijlhandboek v0.8 Public Cinema, FotografieWijzer v1.0) plus een kanaal-analyse van barneveld.nl/Instagram/LinkedIn (Facebook login-walled): 4 onderbouwde brand-assets (kernwaarden, personality, story, maatschappelijke opgaven — rest bewust DRAFT), volledige voiceguide mét per-kanaal tonen (website u-vorm/taakgericht, social je-vorm/activerend, e-mail service, werving energiek) en een published brandstyle (10 kleuren, Bree Serif/Fira Sans, fotografie-principes connectie/beweging/lef incl. AVG-regels). Seed: `scripts/dev/seed-barneveld-brand.ts`; bundle `scripts/migrate-brand-dna/bundles/barneveld-2026-07-20.json` (25 rijen). Bijvangst-bugfix: `formatBrandVoiceguide` gooide channelTones in de UI-vorm `{description, axisShift}` stilletjes weg (filterde op platte strings) — accepteert nu beide vormen; geverifieerd via getBrandContext-probe (11/11 checks). Geen persona's/producten/concurrenten verzonnen — dat vult de gemeente zelf. Logo-SVG's ontbreken (alleen PDF) — nalevering via Brandstyle-UI. PR #218.

- Task: `-` (klantdata-seed + bugfix <30 min)

### 424. Fase 0 €100k-plan: het meetfundament (Growth-KPI-dashboard)

Eerste fase van het €100k-coachplan (go Erik 2026-07-20; fasering in docs/reports/100k-plan-fasering-2026-07-20.md). Developer-only tab Settings → Growth (KPIs): de funnel per week (aanmelding → activatie → betaald, 8 weken), activatie-percentage tegen de 40%-lat, de noordster (netto nieuwe MRR per dag, rechtstreeks uit Stripe met jaarprijzen/12, fail-soft) en de Gate-1-stand (€3k · 10 klanten · 5 bureaus · 35%+). Activatie-definitie v1: ≥3 volledig ingevulde merk-assets én eerste goedgekeurde uiting (accept/publicatie) — gedocumenteerd, DNA gemeten op nu. Plus: workspace_activated-event bij de eerste accept en UTM-bron-attributie op signup_completed. Metadata-only; geen schema-wijziging. Endpoint- en UI-smoke op dev geverifieerd. PR #215.

- Task: [tasks/kpi-fase0.md](../tasks/kpi-fase0.md)

### 423. UX-verbeterplan v2 — doelgroep-diepteanalyse doorgevoerd (16 issues)

Uitvoering van Eriks her-audit met doelgroep-analyse (Merel/Bas/Jesse/agentic/automatiseerders), PR #214. **P0**: hero lijnt weer uit met de container (regressie uit de tweevlaks-hero; max()-padding op ink + meta), caption-contrast ≥4.5:1 (gray-500/600-sweep), 14px-root-besluit gedocumenteerd bij de bron. V2-02 bleek een audit-false-negative: ?view=register/login stond al live (query-genormaliseerd gemeten) — met curl-bewijs vastgelegd. **P1**: herbruikbaar Testimonial-proof-element op home/pricing/beide solutions (feitelijke pilot-regel tot Erik quotes vrijgeeft), agent-strook met de 9 échte namen+rollen op home, solutions-verdieping (teams: samenwerken/kanaal-blokken + security-link; bureaus: €-per-klantmerk-rekensom uit PLAN_CONFIGS, Remi's weekrapport als leverbaar, migratie- en rollen-regel + demo-CTA), founder-instappad (setup-scan-FAQ + Starter-regel + talen-FAQ en/nl/de/fr/es/pt/it), voor-ai-agents: copy-blok met werkende kopieer-knop, per-platform-koppelstappen, scopes-regel, 3 voorbeeldprompts én een #api-developer-sectie (REST/webhook-voorbeelden met HMAC, n8n; docs-site als TODO), platform-tegels één stijl, /marketing/voorwaarden (301 vanaf terms, NL-taallijn). Playwright-gemeten: h1 en logo op exact dezelfde x, clipboard bevat de connector-URL, alle nieuwe blokken renderen. Open besluiten Erik (V2-13/16): jaarfacturering, quotes, 5e voor-wie-kaart, KvK, demo-alias.

- Task: `-` (uitvoering UX-auditdocument v2, commit per issue)

### 422. UX-verbeterplan branddock.app — 19 issues in drie golven (P0/P1/P2)

Volledige uitvoering van Eriks UX-audit (19-07; UX-06 social proof bewust overgeslagen), PR's #211/#212/#213. **P0**: WCAG-contrast site-breed (slate-op-mint-knoppen 8.95:1, link-inkt #047857; was 1.64:1), registratie- vs login-context op alle CTA's (?view=register + trial-belofte op het registratiescherm), type-scale op merkspec via marketing-scoped px (app-root bewust ongemoeid), hero-blur-placeholder (LCP), juridische basis (privacy/voorwaarden/security uit concept-PR #161 + footer-blok + bedrijfsvermelding). **P1**: TrialNote-microcopy onder elke CTA, klikbare modulekaarten, pricing-herstructurering (badge/na-trial/Enterprise), violet uit de mozaïeken + kleurmapping, enkelvoudige title-suffixen, canonicals + host-scoped /marketing→/-redirect. **P2**: Voor-wie-kaarten volledig klikbaar, knop/typografie-systeem vastgelegd, platform-shots + orphan-vrije grids, probleem-sectie met score-vergelijk, HowItWorks-highlights + mini-CTA's, focus-visible + skip-link, hero-toggle prominenter, route /marketing/voor-ai-agents (301 vanaf guardrails). Open voor Erik: KvK-nummer, demo-URL-alias, jaarfacturering-besluit, juridische review.

- Task: `-` (uitvoering van Eriks UX-auditdocument, commit per issue)

### 421. Marketing-header: aankondigingsbalk, wig vooraan, dropdowns + mobiel menu

Derde Postiz-patroon op Eriks verzoek. (1) Aankondigingsbalk boven de nav — cadans-surface met config-blokje (nieuw bericht = nieuw id), dismissbaar via localStorage (useSyncExternalStore, geen setState-in-effect); startbericht: de Claude/ChatGPT-connector. (2) Nav-herstructurering: "Voor AI-agents" naar positie 1 met accent-dot; Platform en Oplossingen worden dropdowns (8 feature-pagina's resp. 2 solution-LP's + 3 vergelijk-pagina's — breedte-bewijs zonder klik); Nieuws (changelog) in de nav; Over ons/Contact naar de footer (stonden daar al). (3) CTA "Gratis proberen" → "Start gratis" met drempelverlager-microcopy. (4) Mobiel hamburger-menu — daarvoor had mobiel helemaal géén navigatie (omissie-fix). Bijvangst: `md:hidden` was door de Tailwind-4-purge afwezig in index.css → appended in het md-blok. Playwright-geverifieerd: dropdowns, dismiss-persistentie na reload, hamburger alleen op mobiel. PR #209.

- Task: `-` (header-iteratie op het wig-besluit, vervolg op #420)

### 420. Homepage: hero-modus-switch (platform ↔ AI-agent) + "Voor wie is Branddock?"-sectie

Twee Postiz-patronen overgenomen op verzoek van Erik (Postiz zit inmiddels Stripe-geverifieerd op ~$173K MRR na exact deze agent-herpositionering). (1) De hero heeft een toggle "In het platform" / "In je AI-agent": platform-modus is het bestaande teamverhaal; agent-modus wisselt H1 ("Geef Claude en ChatGPT je merk-DNA."), subcopy, CTA's (koppel-stappen → guardrails) én de visual — een gestileerde chat-mock (geen derde-partij-screenshot) met tool-chips en F-VAL-badge, plus de connector-URL branddock.app/mcp. (2) SolutionsSplit is uitgebreid naar "Voor wie is Branddock?" met vier doelgroep-kaarten: marketingteams, bureaus, agentic (MCP) en automatiseerders (API/webhooks/n8n). Claims-grens bewaakt: geen autopilot-taal, "jij keurt goed" in beide modi. Playwright-screenshots desktop + mobiel gecheckt. PR #208.

- Task: `-` (homepage-iteratie op het wig-besluit, vervolg op #414)

### 419. API-restjes: webhook-beheer-UI + deliverable.generated op alle generatie-paden

De laatste twee restjes uit de P3-lijn. (1) Outbound webhooks zijn nu zelf te beheren in Settings → API & Connectors: endpoints aanmaken (URL + event-selectie), signing-secret eenmalig zichtbaar (whsec_, HMAC-SHA256-uitleg erbij), delivery-status en auto-disable-badge per rij, verwijderen met confirm — zelfde patroon als de API-keys-lijst. (2) `deliverable.generated` vuurde alleen op het generieke content-pad; nu ook op webpage (headless service én UI-route), video (headless) en SEO (job-completion, idempotent via de COMPLETED-guard) — altijd fire-and-forget en metadata-only. Bewijs: emit-smoke 5/5 met echte webpage-generatie + lokale ontvanger (payload-shape + metadata-only-assert), webhooks-UI-browser-smoke 9/9 (secret-once, prefix na reload, delete). PR #207.

- Task: [tasks/done/api-restjes.md](../tasks/done/api-restjes.md)

### 418. Credit-kalibratie: wizard-launch van een strategie-blueprint metert 80cr

De API-job boekte 80cr voor de volledige campaign-strategy-chain; de UI-wizard boekte 0 voor hetzelfde werk. Nu één prijs: `POST /wizard/launch` boekt `long-form` (80) uitsluitend wanneer er een chain-blueprint gelanceerd wordt — itereren in de wizard blijft gratis, QUICK/CONTENT-launches zonder blueprint blijven 0, idempotent per campagne, post-hoc fail-soft. Sectie-regenerate blijft op beide paden bewust ongemeterd (parity). Smoke 8/8 met boekbare org (gotcha: de vlag heet `NEXT_PUBLIC_CREDITS_ENABLED`; `isOrgUnlimited` cachet 60s). PR #206.

- Task: [tasks/done/strategy-ui-metering.md](../tasks/done/strategy-ui-metering.md)

### 417. Brandclaw BC-1: Loop-pilot-agent Bo — wekelijkse content-loop met mens-goedkeuring

Eerste Brandclaw-increment (P3.6-herijking): agent Bo leest wekelijks de eigen merksignalen (productie-tempo, F-VAL-trend, persona-dekking, campagne-stand via Dana's query-tools onder eigen namespace) en zet maximaal drie content-kansen (pilot: linkedin-post/blog-post) als propose-only `create_deliverable`-voorstellen in de agents-inbox. Generatie + F-VAL draaien pas ná approve via het bestaande confirm-pad; publiceren blijft handmatig (BC-2). Geen schema-wijziging, 0-credit run. Smoke 16/16 met twee echte runs (rapport + 3 voorstellen binnen scope → confirm → echte generatie, $0,24/run). Activatie = WEEKLY-schedule aanmaken in de Agents-UI. PR #205.

- Task: [tasks/done/bc1-loop-pilot.md](../tasks/done/bc1-loop-pilot.md) · herijkingsnoot in [tasks/agents-brandclaw-convergentie.md](../tasks/agents-brandclaw-convergentie.md)

### 416. Korte connector-URL branddock.app/mcp + RFC 9728-discovery-varianten

`https://branddock.app/mcp` is de publieke connector-URL (rewrite naar /api/mcp + host-router-exemption; het oude pad blijft werken voor bestaande koppelingen en de extensie) — alle getoonde URL's (guardrails, homepage, changelog, Settings, playbook) op de korte vorm. Plus RFC 9728 §3.1-pad-varianten op de well-known-discovery (…/oauth-protected-resource/mcp → root-metadata) voor clients die het resource-pad in de discovery-URL invoegen. Icoon-rootcause gevonden: het "tip"-icoon in claude.ai is het oude favicon van de vorige domein-eigenaar in Google's favicon-cache (claude.ai's bron) — fix = Search-Console-re-crawl, niet code. PR's #203/#204.

- Task: `-` (kleine opvolg-PR's op de connector-arc, #413)

### 415. Merkbranding compleet: site-favicon, connector-icoon, extensie-logo + extensie-OAuth met merkkeuze

branddock.app serveerde geen enkel site-icoon (404 op favicon/icon/apple-icon) — browsertabs én de claude.ai-connector toonden generieke iconen. Het officiële beeldmerk staat nu op de Next-conventieplekken (site-breed) én in de MCP-Implementation-info (icons + websiteUrl, SDK-schema). Leerpunt: Turbopack's ICO-decoder eist RGBA — een dekkende screenshot-PNG is RGB en breekt de prod-build (lokaal onzichtbaar: next dev decodeert niet); opgelost met afgeronde hoeken (transparante hoekpixels → RGBA) en de prod-build als lokale gate. Daarnaast extensie v0.2.0: "Inloggen met Branddock" (dynamic client registration, PKCE via chrome.identity, silent refresh) naast de key-modus, met merk-dropdown ("Volg Branddock" default) die de brand-parameter meestuurt — 45/45 unit-tests. n8n-package publish-klaar na drie pre-publish-fouten (@types/node, NodeConnectionTypes-imports; isolated-vm/Node-24-caveat in README) + publicatie-playbook (`docs/playbooks/publicatie-pakket.md`). PR's #200/#201.

- Tasks: [tasks/done/public-brand-api.md](../tasks/done/public-brand-api.md) (staart)

### 414. Website draagt de wig: agent-first kernboodschap, guardrails-pagina, changelog, credit-vertaling, vergelijkings-LP's + responsive-purge-sweep

Uitvoering van het pricing- & website-verbeterplan (analyse na billing-PR's #180-#186, plan in `docs/reports/pricing-website-verbeterplan-2026-07-18.md`): hero en metadata agent-first per het launch-wig-besluit ("Een AI-marketingteam dat je merk écht kent." + F-VAL-bewijs + Claude/ChatGPT-koppel-feit, "Jij keurt goed" als vast mitigatie-element), nieuwe pagina's `/marketing/guardrails` (de onbezette wig, 17 MCP-tools, koppelen-in-3-stappen, eerlijk gemeten pilot-proof) en `/marketing/changelog` (8 releases in klanttaal — bron voor de LinkedIn-cadans), bundelvertaling + "wij rekenen niets voor het kennen en bewaken van je merk"-band live berekend uit PLAN_CONFIGS/CREDIT_COSTS (JSON-LD-drift meegefixt), en drie eerlijke vergelijkings-LP's (categorie-taal, krediet voor de ander, geen concurrent-claims). Bijvangst met impact: álle sm:-responsive-varianten bleken uit de gecompileerde index.css gepurged — sm:grid-cols-2 in 45 bestanden stil kapot (F-VAL-pijlers/platform/media-library stapelden op prod); 30 klassen cascade-veilig geappend mét de laag-volgorde-les in gotchas. PR's #197/#198/#199.

### 413. Publieke Brand-API + MCP-server (17 tools) + OAuth-connector: Branddock aanroepbaar in claude.ai/ChatGPT

De volledige P3-lijn uit het Postiz-verbeterplan, gebouwd achter `PUBLIC_API_ENABLED` en inmiddels live: headless content-service als fundament (create+generate als één functie, contextSelection = de kennis-toggles als API-vorm), Brand Assistant quick-create, REST v1 (12 routes incl. async SEO/strategy met polling, image/video, ephemeral rewrite), gehoste MCP-server met 17 geannoteerde tools, workspace-API-keys (hash-only + Settings-tab), outbound webhooks (HMAC, metadata-only) + n8n-node, Postiz-publish-provider, browser-extensie, en OAuth-connect (Better Auth mcp-plugin, PKCE, dynamic client registration, /.well-known-discovery, /oauth/login+consent) met "merken zijn taal": brand-parameter met membership-validatie, list_brands, viewer=guardrails-only, consent-merkvergrendeling. Kroon-test geslaagd: claude.ai haalt via de connector de prod-merkcontext op. Issuer gecanonicaliseerd naar branddock.app. Nieuwe metering: campaign-strategy-chain (was onbedoeld gratis, ook in de UI — kalibratie-punt), vlakke short-charge op API-generate. ADR `2026-07-17-public-brand-api`. PR's #185/#187/#188/#192/#190/#196.

- Tasks: [tasks/done/public-brand-api.md](../tasks/done/public-brand-api.md), [tasks/done/headless-content-service.md](../tasks/done/headless-content-service.md), [tasks/done/brand-assistant-quick-create.md](../tasks/done/brand-assistant-quick-create.md), [tasks/done/workspace-rename-and-metrics-matches.md](../tasks/done/workspace-rename-and-metrics-matches.md), [tasks/done/pilot-metrics-endpoint.md](../tasks/done/pilot-metrics-endpoint.md)
- Plan/analyse: [docs/reports/postiz-analyse-2026-07-17.md](reports/postiz-analyse-2026-07-17.md) + [docs/reports/postiz-verbeterplan-2026-07-17.md](reports/postiz-verbeterplan-2026-07-17.md)


### 412. Kanaal-publicatie kon een lege post naar LinkedIn/WordPress/e-mail sturen

Gevonden tijdens de structurele analyse van de content-ketens (n.a.v. de bugmeldingen van 16-07); **nog niet door een gebruiker gemeld — maar het publiceert extern**. `publish-to-channel` bouwt zijn payload uitsluitend uit `deliverable.components` — de component-keten. Voor de structured/PUCK-types (landing-page/faq-page/product-page/microsite + de 7 long-form GEO-types) is die keten **structureel leeg**, niet "soms": `orchestrate/route.ts:91` gate't ze weg vóór de enige plek die tekst-componenten aanmaakt, en `generate-structured-variant` bevat nul `deliverableComponent.create`. Hun copy zit in `settings.structuredVariant`. Gevolg: `bodyText === ''` → een leeg artikel op de WordPress van de klant en een lege LinkedIn-post, naar het publiek van de klant, onomkeerbaar. **De bestaande QA-gate vangt dit niet en kán dat niet**: `getContentReadiness` oordeelt op een F-VAL-score die via het LP-pad uit keten B komt, terwijl de payload uit keten A komt — een groene gate is dus juist bewijs dát er goede content is, waarna we niets versturen; en hij is expliciet failsafe-open (`no-version` → `canPublish: true`, met in de eigen types de comment *"no ContentVersion exists yet — never generated"*). Bereikbaar, niet latent: `Step4Timeline` rendert de kanaal-publish-knop zonder `isPuckType`-gate, terwijl datzelfde bestand 40 regels hoger wél `puckSignals` inpatcht voor de checklist. Fix: een leeg-guard op de **payload zelf** i.p.v. op een proxy ervoor, met de extractie naar een pure functie (`channel-payload.ts`) zodat de guard testbaar is zonder de halve stack én er één chokepoint is waar de latere content-accessor inplugt. Bewust géén beeld-uitzondering — een long-form-deliverable *heeft* een hero-image, dus die uitzondering zou de guard uitschakelen voor precies het geval dat 'm motiveert. **Vangnet, geen fix**: de structurele oplossing is dat de route beide ketens leest; het vangnet blijft daarna staan omdat het valideert wát er verstuurd wordt en dus elke toekomstige keten overleeft. **Bewijs**: smoke 23/23 — de exacte prod-vorm van een pillar-page tegen alle 3 providers, regressie-check op een echte social-post, provider-mapping (`linkedin-direct`, niet `linkedin`), whitespace, en de `caption`/`body-sections`/`introduction`-fallbacks. `tsc` 0 / `lint` 0.

- Task: [tasks/publish-empty-guard.md](../tasks/done/publish-empty-guard.md)
- Analyse: 21 kruisingen tussen de content-ketens; deze was de enige met externe, onomkeerbare impact. De overige 20 vragen de gedeelde accessor.

### 411. Content-locale-anker op elk creatiepad + één bron van waarheid

Gevonden tijdens de diagnose van de taalmenging-melding (#409); veroorzaakt die melding **niet**, maar het zijn twee echte bugs. (1) `provisionNewUser` — het sign-up-pad — legde géén `Brand` + `isDefault`-`BrandLocaleProfile`, terwijl `POST /api/workspaces` dat wél deed. Twee creatiepaden, dezelfde plicht, één die 'm niet kende: **3 van de 4 prod-workspaces stonden zonder anker** (alleen de via `migrate-brand-dna` gevulde had er één), waardoor `resolveTargetProfile` `null` gaf en generatie niet locale-adresseerbaar was — terwijl de Fase-2-target-picker en het multi-markt-epic (ADR 2026-06-28) aannemen dat het profiel bestaat. Zelfde klasse als het `MediumEnrichment`-incident (#168): defaults die alleen de seed zet, en de seed draait nooit op prod. (2) Drie velden claimden de content-taal met **tegenstrijdige precedentie** (`getBrandContext`: profiel > voiceguide > contentLanguage; de backfill: voiceguide > contentLanguage; de settings-PATCH: contentLanguage overschrijft het profiel) — de pilotklant-workspace heeft `contentLanguage='en'` maar profiel + voiceguide `nl-NL`: de generatie draait Nederlands terwijl de settings-UI "English" toont. ADR [`2026-07-16-content-locale-source-of-truth`](adr/2026-07-16-content-locale-source-of-truth.md): het isDefault-profiel is de enige bron van waarheid, `contentLanguage` een afgeleide spiegel (bewust niet gedropt — te brede lees-surface), de voiceguide-locale een aanmaak-suggestie. Geborgd door één gedeelde, transactie-bewuste, **niet-clobberende** `ensureBrandWithDefaultProfile()` op álle creatiepaden (deel de helper, niet de aanroep) + `repair-anchors` in het bestaande `repair-defaults`-endpoint, dat ontbrekende ankers maakt, een divergerende `contentLanguage` bijtrekt naar het profiel en de brand-context-cache invalideert. **Uit review**: `resolveInitialLocale` valideerde tegen de `LANG_TO_LOCALE`-values i.p.v. `SUPPORTED_LOCALES` — `nl-BE` (een echte picker-optie, "Nederlands (België)") viel daardoor weg en een Vlaams merk zou via de repair een `en-GB`-anker krijgen: **de repair zou precies de stille taalflip veroorzaken die de ADR opheft**. Gefixt, plus `languageForLocale()` via base-subtag (de omgekeerde map sloeg `nl-BE` stil over). **Bewijs**: een échte sign-up via het Better-Auth-pad levert `Brand=JA | profiel=en-GB | contentLanguage=en` (vóór de fix: `Brand=NEE | profiel=GEEN` — exact de staat van de pilot-tester). Smoke 14/14; de `nl-BE`-case faalt aantoonbaar op de pre-review-code. `tsc` 0 / `lint` 0.

- Task: [tasks/content-locale-anchor.md](../tasks/done/content-locale-anchor.md)
- ADR: [docs/adr/2026-07-16-content-locale-source-of-truth.md](adr/2026-07-16-content-locale-source-of-truth.md)
- Open (user-actie): `POST /api/admin/repair-defaults` op prod draaien als developer — zet de pilotklant-`contentLanguage` `en` → `nl` (zichtbaar in de UI; dat is het doel)

### 410. Copy/Export leverde een leeg bestand voor web-page-types

Pilot-tester meldde "de output copy en export html geeft niks terug. leeg bestand". Zijn pillar-page had **23,5KB** aan content in `settings.structuredVariantOptions`. Dader: `Step4Timeline.allText` bouwt de Copy/Download-inhoud uitsluitend uit `previewContent`, en dat komt alleen uit `variantGroups` — de **component-keten**. Structured/PUCK-types (landing-page, faq-page, product-page, microsite + de long-form GEO-types) vullen die Map nooit; hun copy zit in `structuredVariant`. Voor die types was `allText` leeg → `clipboard.writeText('')` en `handleDownload('html')` schreef letterlijk `<body></body>`. Zelfde familie als de twee-publish-ketens-gotcha (2026-06-24). Pijnlijk: dezelfde les gold in dít bestand al voor de checklist (`puckSignals`, 2026-06-10, mét comment) — `allText` was toen overgeslagen. Nu valt `allText` terug op de gekozen variant via `flattenPageVariantToText`, fail-soft (een half-complete opgeslagen variant mag een export-knop niet stukmaken — gotcha 2026-03-24). **Verder**: `Confirm & Continue` pakte hardcoded `variantOptions[0]` en negeerde de previewde variant (wie B previewde, bevestigde stil A); de kaart klemde met `Math.min` terwijl de knop terugviel op `[0]` en `activeVariantIndex` bij regenerate nooit gereset wordt → één geklemde `safeVariantIndex` voor alle lezers. De keuze wordt nu vóór het beeldwerk gepersisteerd, maar **alleen op het LP-pad** (daar staat tot ~4,5 min hero-/feature-generatie tussen klik en PATCH) en **geawait** — `PATCH /api/studio/[id]` is read-modify-write zonder lock, dus twee overlappende writes kunnen `puckData` wegschrijven. **Uit review**: mijn eerste versie fixte `canvas/export/route.ts` — die route is **onbereikbaar** (`useExportDeliverables` heeft geen consumers); meegefixt als latente bug via een pure, testbare helper, maar het was niet wat de tester raakte. **Bewijs**: smoke `canvas-export-structured-smoke` 23/23, en tegen de **échte prod-rij**: leeg → 8.722 tekens content. `tsc` 0 / `lint` 0.

- Task: [tasks/canvas-variant-confirm-export.md](../tasks/done/canvas-variant-confirm-export.md)
- Bug: pilot-tester, 2026-07-16 (severity medium)

### 409. Taalmenging in web-page-content — de generator adopteert de gedeelde locale-directive

Pilot-tester meldde (BugReport, severity **high**) dat Engels en Nederlands door elkaar liepen in een gegenereerde pillar-page: *"The WooCommerce Bol.com **koppeling** that gives you your evenings back"* — Engelse volzinnen met een Nederlandse term. Oorzaak: `variant-generator.ts` (het pad voor álle web-page-types) had de gedeelde `buildLocaleInstruction()` **nooit geadopteerd**; zijn enige taalregel was bullet 8 van 11 in een Nederlandstalige regellijst (`Locale en-US: alle content in deze taal`). Die verbiedt code-switching niet en eist niet dat anderstalig bronmateriaal vertaald wordt — terwijl de gedeelde directive daar letterlijk voor geschreven is ("Block code-switching mid-output", "translate, don't mirror"). Het medicijn bestond al; dit pad slikte het niet. Zelfde familie als de "twee plekken houden dezelfde waarheid bij"-gotchas. De directive gaat nu in `buildSharedStyleBlocks()` — één injectiepunt dat alle 5 system-prompts voedt (LP/FAQ/product/microsite/long-form GEO) — en staat bovenaan de stijl-stack zodat haar eigen "outranks any tone or style guidance below" klopt. **Bijvangst**: `params.locale ?? "nl-NL"` → `en-GB` (hardcoded NL-default terwijl `Workspace.contentLanguage` `@default("en")` is), en de human-voice-directive kreeg een binaire `startsWith('en') ? 'en' : 'nl'`-gok die élke Duitse workspace de **Nederlandse** voice-regels gaf → nu het base-subtag. **Uit review**: de GEO-directive zei letterlijk "vertaal niet" en sprak de fix dus tegen op precies de gemelde route — herformuleerd (niet geschrapt: `geo-polish.ts` heeft geen gedeelde directive en zou zijn enige taalregel verliezen). **Bewijs** (echte Anthropic-runs met een briefing die de talen al mengt — de werkelijke trigger; een kale NL-zin reproduceert niets): PRE **3/3 lek**, POST **0/3** — term vertaald naar "Integration". Smoke `lp-locale-mixing-smoke` 19/19 deterministisch, elke check aantoonbaar discriminerend. `tsc` 0 / `lint` 0.

- Task: [tasks/lp-locale-directive.md](../tasks/done/lp-locale-directive.md)
- Bug: pilot-tester, 2026-07-16 (severity high)

### 408. Brand-mention-monitor Fase-0 — NO-GO (research-stack-bundel 4/4, gated)

De 10e-agent-kandidaat (merkvermeldingen-waakhond op Exa) had een blocking Fase-0-gate: levert Exa genoeg relevante vermeldingen voor het NL-MKB-doelsegment? Handmatige Exa-pulls (30d, naam + branche-anker + eigen-domein-uitsluiting) op 5 merken wijzen **NO-GO** aan. NL-MKB-targets — Better Brands (1 vermelding/30d, 90% ruis), Sterk Merk (1, 90%), Branding a better world (0, 100%) — zijn structureel leeg + ruizig; alleen een scale-up (Picnic: 6/30d, 40% ruis) haalt beide bars, en die is niet de doelgroep. Gate (1) ≥3/maand faalt voor het doelsegment, gate (2) ruis < 50% haalt 1/5, gate (3) usersignaal is daarmee moot. Bevestigt exact de Red-Team-kernonzekerheid (Exa is geen social-listening-index; generieke merknamen verhogen de ruis). **Geen productie-code gebouwd** — de gate deed precies zijn werk. Taak → `blocked` met meetdata; reopen bij een bredere bron (social/news-API), scale-up-pilotklanten, of gegroeide Exa-NL-dekking. De Marco-web-signals-tool (#406) blijft de enige Exa-mentions-surface (concurrenten, niet eigen merk). Sluit de research-stack-bundel af (1-3 gebouwd, 4 gevalideerd-en-geparkeerd).

- Task: [tasks/brand-mention-monitor.md](../tasks/brand-mention-monitor.md) (status blocked)
- Rapport: [docs/reports/brand-mention-monitor-fase0-2026-07-15.md](reports/brand-mention-monitor-fase0-2026-07-15.md)

### 407. GEO long-form — research-backed citeableStats via Exa + S2 (research-stack-bundel 3/4)

Long-form GEO-artikelen leven van citeerbaarheid (`citedStats` is een van de hoogst gewogen GEO-signalen), maar de stats kwamen uit het model + workspace-kennis — het model kon geen échte actuele bronnen citeren en de sanitizer moest verzonnen bronnen juist wégpoetsen. Nu haalt de generate-structured-variant-route vóór generatie een klein pakket **echte, gebronde statistieken** op (Exa web + Semantic Scholar, **parallel** met de kennis-context-bouw) en legt die als gelabeld **"## GEVERIFIEERD BRONMATERIAAL"**-blok in de prompt; twee chirurgische regels in de GEO-system-prompt erkennen dat blok als geldige citeerbron. Deterministische cijfer-extractie (regex, géén extra LLM-call), elke bron door `cleanStatSource` gehaald (dezelfde filter die verzonnen/interne-laag-bronnen weert), fail-soft + key-gated. **De GEO-scoring, het schema en de source-sanitizer blijven ONGEWIJZIGD** (bevroren, diff-geverifieerd) — er verandert alleen wat het model als grondstof krijgt. **Bewijs**: nieuwe smoke `scripts/dev/geo-research-stats-smoke.ts` **15/15** (incl. A/B-generatie) met échte keys op lokale BB — keyless-pad byte-identiek (regressie), live 3 kandidaten met waardes letterlijk uit de bron + `cleanStatSource`-overlevende bronnen, en het verrijkte artikel bevat citeableStats die herleidbaar zijn tot het pakket, zonder interne-laag-leak. A/B-`citedStats`-signaal: verrijkt ≥ baseline (één sample; run 1: 4→14, run 2: 4→4 — de bron-verankering is robuust, de signaallift single-sample-variabel). Verrijkingskosten ≈ $0,005 < $0,05, +0 LLM-calls. `tsc` 0 / `lint` 0. Code-reviewer: 0 critical — WARNING (Exa/S2 sequentieel) verwerkt naar parallel, MINOR (`match.index`) verwerkt. Bundel 3/4; alleen brand-mention-monitor (Fase-0-gated) rest.

- Task: [tasks/research-stack-geo-research-backed.md](../tasks/research-stack-geo-research-backed.md)
- Spec: [docs/reports/research-stack-plan-2026-07-15.md](reports/research-stack-plan-2026-07-15.md)

### 406. Marco krijgt een externe-web-signalen-tool per concurrent (research-stack-bundel 2/4)

Marco's (market-analyst) concurrent-beeld kwam volledig uit wat wíj van de concurrent-site scrapen; wat er óver een concurrent gebeurt (nieuws, funding, lanceringen, vermeldingen elders) was onzichtbaar. Nieuwe registry-native read-tool **`read_competitor_web_signals`**: per concurrent een Exa-neural-search naar recente externe vermeldingen (datum-filter, **eigen domein uitgesloten**), teruggegeven als gefencede signalen + server-owned TABLE-artefact. Volgt de data-analyst-conventie (`ads-watchdog/tools.ts`): read-only, harde workspace-scope, dubbele fencing (model-facing `signals`-veld én TABLE-preview), geclampte input (days 7-90, cap 5 concurrenten / 10 signalen), fail-soft (keyless → eerlijke `EXA_NOT_CONFIGURED`, Marco degradeert naar de scrape-data). Exa-client kreeg twee additief-optionele knoppen (`excludeDomains`, `publishedDate` op `ExaBlock`) — geen bestaande caller breekt. Gedragsregel toegevoegd zodat Marco de tool bij marktvragen inzet en een leeg resultaat als eerlijk "geen recente externe signalen" behandelt (geen speculatie). **Bewijs**: nieuwe smoke `scripts/dev/marco-web-signals-smoke.ts` **13/13** + `FULL_RUN=1` **16/16** — echte Exa-round-trips, alle URL's extern (eigen domein eruit, subdomein-bewust), fencing, TABLE-caps, workspace-isolatie (concurrent uit andere workspace onzichtbaar), keyless-degradatie; echte Marco-run levert REPORT + "Competitor web signals"-TABLE met externe bron-URL's. Tool-kosten 3 concurrenten ≈ $0,015 < $0,15 (de agent-run zelf ~$0,13 rapport-reasoning). `tsc` 0 / `lint` 0. Code-reviewer: 0 critical/0 warning — MINOR eigen-domein-subdomein-robuustheid verwerkt (`isSameSite`). Bekende pre-existing follow-up: rauwe third-party strings in het gepersisteerde TABLE-artefact (conform data-analyst-patroon; fencing van geaccepteerde external-source-TABLEs is een bredere beslissing). Bundel 2/4.

- Task: [tasks/research-stack-marco-web-signals.md](../tasks/research-stack-marco-web-signals.md)
- ADR: [docs/adr/2026-07-05-agents-architectuur.md](adr/2026-07-05-agents-architectuur.md) (D4 dekt curated tool-toevoeging)
- Spec: [docs/reports/research-stack-plan-2026-07-15.md](reports/research-stack-plan-2026-07-15.md)

### 405. Marketing demo-boeking provider-neutraal — Morgen/Calendly/Cal.com via link i.p.v. iframe

Op user-vraag "kan ik Morgen gebruiken i.p.v. Calendly?": ja — en meteen een latente bug gedicht. De contactpagina embedde de boeking in een `<iframe>`, maar de productie-CSP staat alleen `frame-src 'self' https://js.stripe.com` toe → élke externe booking-iframe (Calendly óók) zou leeg renderen; bovendien weigeren veel booking-tools embedding (X-Frame-Options). **Fix**: boeking is nu een provider-neutrale **link** (opent de geoptimaliseerde boekingspagina in een nieuw tabblad) i.p.v. een embed — werkt met Morgen, Calendly, Cal.com zonder CSP-werk. Env-var `NEXT_PUBLIC_CALENDLY_URL` → provider-neutrale `NEXT_PUBLIC_BOOKING_URL` (oude naam blijft als fallback). Homepage-"Book a demo" valt zonder booking-URL nu terug op de contactpagina i.p.v. een dood `#`. Runbook bijgewerkt. **Rest van taak #9 voor de user**: pilot-quote (1 zin) + `NEXT_PUBLIC_BOOKING_URL` zetten (Morgen-link) + domein-keuze.

### 404. Trend-radar krijgt Exa + S2 als extra bronlagen (research-stack-bundel 1/4)

De trend-radar-researcher (`src/lib/trend-radar/researcher.ts`) zocht uitsluitend via Gemini-grounding; nu draaien **Exa** (neural search met 12-maands versheid-filter) en **Semantic Scholar** (academische vroegsignalen) mee als optionele, key-gated, fail-soft extra bronlagen — exact het #402-patroon. Elk extern resultaat wordt DIRECT naar een `Signal` gemapt (géén extra Gemini-call, dus verwaarloosbare kosten): Exa → `analysis`/`general`, S2 → `research` met citatie-getierde authority (≥50 citaties → `industry_specialist`, anders `general`), beide met echte bron-URL en gededupt over bron-URL heen tegen de grounding-signalen. Twee dunne bron-helpers (`searchExaSources`/`searchScholarSources`) naast de bestaande context-clients (geen tweede client); S2 draait sequentieel tegen de 1-rps-limiet. **Bewijs**: nieuwe smoke `scripts/dev/trend-radar-sources-smoke.ts` **21/21** + één end-to-end scan (`FULL_SCAN=1`, **22/22**) met échte keys — live Exa=15 + S2=8 signalen uit ≥2 lagen, echte https-URL's, correcte types, baseline zonder keys byte-identiek, dedup + S2-degradatie (invalid key → Exa overleeft) groen; verrijkingskosten ≈ $0,015 (3 Exa-searches, S2 gratis, 0 extra Gemini) < $0,15. `tsc` 0 / `lint` 0. Code-reviewer: 0 critical — de S2-authority-blanket-warning verwerkt via citatie-tiering. Bekende pre-existing follow-up (niet in scope): de trend-synthese-prompt fencet signal-strings nog niet (geldt al voor bestaande scraped content, geen regressie van deze diff). Bundel 1/4; Marco-web-signals, GEO-`citeableStats` en brand-mention-monitor volgen.

- Task: [tasks/research-stack-trend-radar.md](../tasks/research-stack-trend-radar.md)
- Spec: [docs/reports/research-stack-plan-2026-07-15.md](reports/research-stack-plan-2026-07-15.md)

### 402. S2 aangesloten op Nova's deep-research — de "scholar"-wiring-gap gedicht

De S2-key kwam 2026-07-15 binnen (user-taak #4; EXA/POSTHOG/EMAILIT dezelfde ochtend gezet). Bij de key-check bleek het brontype `"scholar"` al sinds de bouw in het deep-research-contract te bestaan (`knowledge-research/types.ts`) zonder ooit aangesloten te zijn — de zoekfase gebruikte alleen Gemini-grounding + Exa. Nu gedicht, exact op het bestaande Exa-patroon: optionele verrijking alleen mét `S2_API_KEY`, fail-soft naar een warning, en in de synthese als niet-op-nummer-citeerbare achtergrondcontext ("Peer-reviewed academic context") naast de neural-search-context. Nova, de Knowledge-Library-research en alle afnemers krijgen daarmee peer-reviewed bronnen naast web. **Bewijs**: bestaande deep-research-smoke 30/30 (regressie) + live zoekfase-run met de echte key — 9 papers gevonden, gefilterd op citatie-drempel tot bruikbare context. EXA-helft eerder op prod bewezen (Nova-run met 5 échte webbronnen, $0,048). Vervolg-kandidaten (bewust post-launch, roadmap): trend-radar-deep-dive, Marco-competitor-research en research-backed GEO-`citeableStats` via Nova.

### 401. Scheduling-MINORs-batch + security-hardening gemerged (PR #120)

Twee afhechtingen. **(1) PR #120 gemerged** (gebouwd 2026-07-13): de L9-rollout-gate ("test tegen een echte ad-token-rij") kon dicht zodra het BB-Meta-account gekoppeld was — bewijs: formaatcheck op de echte prod-rij (legacy-formaat → compat-pad), cross-versie-roundtrip met de échte oude writer (byte-identiek), nieuwe writes `v1:`; main conflictloos ingemerged, smokes 13/13 + 23/23 herdraaid. De eerste ads-cron-tick levert het live-praktijkbewijs. **(2) Scheduling-finalize-MINORs verwerkt** (7 van 12): trial-lock op schedule-PATCH, delete-confirms (schedules/memories, en/nl), enqueued-teller exclusief dedupe-joins, `DEFAULT_LOOP_TIMEOUT_MS`-spiegel vervangen door de geëxporteerde loop-constante, zombie-error-pad zonder dubbele telemetrie, agent-task-smoke assert nu de AgentJob-DB-rij, `AGENTS_DEV_CADENCE` gedocumenteerd. Vijf restjes bewust open (UX-/a11y-polish, gedocumenteerd in de task-file). Smokes: agent-task + agent-schedule volledig groen.

### 400. Ada live — 9e persona-agent bewaakt creative-gezondheid op gekoppelde ad-accounts (ads-watchdog Fase 2+3)

Sluitstuk van het ads-watchdog-traject dat vanochtend met Fase 0 begon: **Ada (Ads Watchdog, Gauge)** — de agent waar Eriks A3-antwoord "(c) direct een on-brand refresh-voorstel ter bevestiging" om vroeg. **Fase 2**: pure signaal-functies (`ads-watchdog/signals.ts`) — frequency > 3,5 (som impressies/som reach over de recente dagen, conservatief), CTR-daling ≥ 25% (recente vs oudere venster-helft, ≥4 punten anti-ruis), creative-leeftijd > 45d — plus het weekplafond (3 refresh-PROPOSALs/workspace/week, ADR-productregel). **Fase 3**: read-tools op de data-analyst-conventie (`read_ad_signals`: prioritering op signalen×spend, weekbudget hard in het tool-result, TABLE-artefact, Meta-adnamen gefenced; `read_ad_account_status`), definition met no-Meta-writes/no-budget-advies-framing, refresh via het bestáánde `create_deliverable`-confirm-pad (contentType facebook-post — canvas-registry-fallback werkt), 400-guards op run- én schedule-route bij 0 gekoppelde accounts + koppel-CTA-banner op de agent-detailpagina (i18n en/nl). 0-credit run; ⚠️ gedocumenteerde afwijking: door de billable-gate op de confirm-charge boekt de refresh-creative tijdens de pilot óók 0 credits (bekend credit-model-punt, zelfde klasse als het structured-variant-pad). **Bewijs**: smoke **27/27** — unit-signalen, fixture-scan (vermoeide ad → 3 signalen, paused uitgesloten, workspace-isolatie), echte Ada-run met NL-rapport (meetwaarden vs drempels per signaal) + proposal, **confirm → échte canvas-generatie van de refresh-creative**, weekplafond (cap → 0 proposals + bundeling in rapport), lege workspace → eerlijke koppel-uitleg. Resterend ná deploy: eerste prod-cron-tick (05:30 UTC) + drempel-kalibratie op 2 weken echte snapshots.

- Task: [tasks/done/agent-ads-watchdog.md](../tasks/done/agent-ads-watchdog.md)
- ADR: [docs/adr/2026-07-14-ads-watchdog-datamodel.md](adr/2026-07-14-ads-watchdog-datamodel.md)

### 399. Ads-watchdog Fase 1 — metrics-sync live: AdMetricSnapshot heeft zijn eerste writer (na Fase-0 GO)

Fase-0 GO dezelfde dag behaald in een begeleide sessie met de user (task #18): Meta-app "Branddock" aangemaakt (dev-mode), envs op prod (secret na plak-verwisseling geroteerd), BB-ad-account gekoppeld (`act_764986273365908`), veldmapping via read-only pull — **alle 3 fatigue-signalen op ad-niveau** — en A3-antwoord "(c) direct on-brand refresh-voorstel ter bevestiging". ADR + GO: PR #135 (#`docs/adr/2026-07-14-ads-watchdog-datamodel.md`). **Fase 1 gebouwd** conform ADR: `AdCampaign` krijgt `origin`-discriminator + nullable `deliverableId` + `externalName`/`creativeCreatedAt` (geen parallel model — snapshot-FK-keten ongewijzigd); nieuwe GET-only insights-client (`meta/insights.ts`: discovery + ad-level daily insights, paginatie-cap 200); dagelijkse sync-job `sync-ad-insights.ts` (discovery-upsert zonder Branddock-rijen te hijacken + snapshot-upsert op de bestaande unique window-key, fail-soft per account, 401→expired, cache-invalidation per workspace); cron-route + vercel-schedule 05:30; **origin-guard op de bestaande 5-min status-sync** (regressie). Bijvangst onderweg: onzichtbare Connect-knop gefixt (PR #134, Tailwind-purge) + vindbaarheids-link naar de ad-accounts-pagina. **Bewijs**: smoke 11/11 tegen de échte Graph API — 2 ads discovered → 2 `origin=external`-rijen + 4 snapshots (metrics + frequency in raw), idempotente herdraai, status-sync-regressie groen, workspace-isolatie via FK-keten. Schema-change ⇒ Neon db push vóór prod-gebruik.

- Task: [tasks/done/agent-ads-watchdog.md](../tasks/done/agent-ads-watchdog.md) (Fase 2+3 gevolgd in #400)
- ADR: [docs/adr/2026-07-14-ads-watchdog-datamodel.md](adr/2026-07-14-ads-watchdog-datamodel.md)

### 398. Vera-triggers + ads-watchdog: Fase 0 gestart — ADR-aanvulling event-driven trede + eerste gate-metingen

Op user-verzoek ("kunnen we verder met een adr-aanvulling en metrics-sync-traject") de tweede ring in beweging gezet — binnen de eigen Fase-0-gates van beide task-files (geen productie-code vóór GO). **ADR-aanvulling** op `docs/adr/2026-07-05-agents-architectuur.md` (§2026-07-14): event-driven propose-only als expliciete derde D7-trede, geverifieerd trigger-event (`approvalStatus → IN_REVIEW`, niet het dode `PipelineStatus.REVIEW`), floor-gedekt 0 credits, opt-in default UIT als kosten-gate, moeheid-invarianten (1 burst = 1 run = max 1 melding · issues-only · daily cap), en het cap-melding-beslispunt beslist (`AGENT_TRIGGER_CAP_REACHED`-enum-lid). **Vera Fase-0-meting** (prod): dam-upload marginaal (9 uploads in één BB-burst 5-7 juli; de 36 van vorige week zijn smoke-account-ruis), `IN_REVIEW`-transities 0 in 8 weken — de review-trigger heeft nog geen voer; concierge-window 2026-07-14 t/m 28. **Ads Fase-0**: `ConnectedAdAccount` = 0 herbevestigd én bijvangst: `META_APP_ID/SECRET` ontbreken volledig op Vercel-prod — koppelen kan überhaupt nog niet; items 2-4 (koppel-bereidheid/A3, insights-pull-veldmapping, app-review-status) zijn user-held en staan uitgevraagd in de task-file.

- ADR: [docs/adr/2026-07-05-agents-architectuur.md](adr/2026-07-05-agents-architectuur.md)
- Tasks: `tasks/agent-vera-triggers.md` (Fase-0-logboek) + `tasks/agent-ads-watchdog.md` (Fase-0-resultaten)

### 397. Iris live (ships-dormant) — SEO/GEO-watchdog bewaakt gepubliceerde GEO-content op verval (agents-uitbreiding bouw 3/3)

Derde en laatste bouw uit het agents-uitbreidingsplan (#394): `agent-seo-watchdog` ("Iris", 8e persona-agent) — de eerste agent waarvoor scheduled de natuurlijke modus is. **Scan (judge-vrij, $0 AI)**: nieuwe deterministische tool `scan_published_geo_content` her-scoort `settings.structuredVariant` via de échte `buildGeoOptimizationAnalysis` (zelfde pure functie als de publish-meet-haak) en berekent de 5 vervalsignalen — staleness, score-drift (publish- vs actuele score), canonical-drift, schema-drift, feit-veroudering (jaartal-heuristiek op citeableStats) — met fail-soft skip voor corrupte records, prioriteitssortering (stale eerst, grootste daling bovenaan), caps (25 flagged / 10 LINKs) en gefencede content-afgeleide data. **Rapport + herschrijf-voorstel**: één geprioriteerd REPORT (harde framing-constraint: onderhouds-backlog, nooit traffic-claims — we meten geen traffic), LINK-deep-links naar de canvas, max 3 refresh-briefs via de bestáánde confirmable `update_deliverable_brief` (géén nieuwe write-tool — herschrijf loopt bewust interactief via de structured-variant-flow + republish, zie re-entry-verificatie in de task-file). **0-credit**. **Ships-dormant**: Taak-0-gate op prod = 0 GEO-pagina's — op prod levert de eerste run het eerlijke "niets te bewaken"-rapport + schedule-advies (expliciet AC) tot de pilot GEO-content publiceert. **Bewijs**: smoke **34/34** (`scripts/dev/agent-seo-watchdog-smoke.ts`) — unit-helpers, geseede-DB-scan met alle 5 signalen (80→46), workspace-isolatie, echte run $0,094 met refresh-proposal die de decay-signalen benoemt, headless confirm → brief geüpdatet, lege workspace $0,058, én scheduled-bewijs (enqueue → runner → run `triggerType=scheduled` + notificatie "Iris finished a task"). Bijvangst: scan-result geeft `scannedAt` mee (eerste run hallucineerde een datum); staleness-recompute-cron-sub-item in `geo-seo-followup-later.md` functioneel vervangen.

- Task: [tasks/done/agent-seo-watchdog.md](../tasks/done/agent-seo-watchdog.md)
- Plan: [tasks/_drafts/idea-agent-seo-watchdog.md](../tasks/_drafts/idea-agent-seo-watchdog.md) + marktonderzoek (#PR 128)

### 396. Remi live — 7e persona-agent schrijft het wekelijkse klant-klare merkrapport (agents-uitbreiding bouw 2/3)

Tweede bouw uit het agents-uitbreidingsplan (#394): `agent-reporter` ("Remi", Reporting Analyst) op Dana's curated query-tools. **Fase 1 (code-loos, gate)**: golden report handmatig geschreven op échte BB-prod-data ([docs/reports/remi-golden-report-2026-07-14.md](reports/remi-golden-report-2026-07-14.md)) — bevindingen: (a) frame-acceptatie "brand-operations weekly zonder ads-cijfers" ligt als beslispunt bij Erik, (b) alle vier de blokken blijven (lege blokken bewijzen juist het eerlijke geen-data-gedrag), (c) maand-granulariteit-gap bevestigd → **nieuwe curated tool `query_period_activity`** (venster N dagen vs voorgaand venster: created/published/reviews/avg-F-VAL; bewust géén "completed" — geen completion-timestamp; Dana profiteert automatisch mee). **Fase 2**: registry-definition met vast 4-blokken-skelet (geproduceerd / F-VAL / campagnestatus / marktsignalen+focus), eigen namespace `agent:reporter` (memory-scoping is namespace-keyed — Dana's namespace delen zou geheugens mengen), **0-credit** zoals Dana (beslispunt: "inzicht in je merk is altijd gratis"; geen `billable`-flag = aantoonbaar nergens gemeterd). **Bewijs**: echte runs — BB-workspace perfect 4-blokken-NL-rapport met week-op-weekvergelijking ($0,068/32s), lege workspace eerlijk per-blok "geen data" ($0,065), kosten-gate 5 runs gem. $0,068 ≤ $0,15; smoke `scripts/dev/agent-reporter-smoke.ts`. Review: 0 CRITICAL, 3 WARNINGs gefixt (stale Dana-smoke-assert die de "Dana profiteert mee"-claim bewaakt, venster-woording prompt↔tool, changelog-AC) + dogfood-spec voor Remi.

- Task: [tasks/done/agent-reporter.md](../tasks/done/agent-reporter.md)
- Plan: [tasks/_drafts/idea-agent-reporter.md](../tasks/_drafts/idea-agent-reporter.md) + marktonderzoek (#PR 128)

### 395. Repurposing-route live — long-form → on-brand social-afgeleiden met F-VAL-score per afgeleide (agents-uitbreiding bouw 1/3)

Eerste bouw uit het agents-uitbreidingsplan (#394), route A: repurposing als Milo-use-case i.p.v. 7e persona. **Nieuw**: Claw read-tool `read_deliverable_content` (workspace-gescoped via de campaign-relatie, 12k-cap + truncated-flag onder de 16k-bridge-limiet, undefined-id-guard); `create_deliverable` + optioneel `sourceDeliverableId` (dubbele fail-fast-validatie, zet `derivedFromId`, "Derived from"-regel in de proposal); Milo + `repurpose-content`-use-case met gedistilleerde-brief-instructies (toegestane afgeleiden: linkedin-post/twitter-thread/linkedin-poll — instagram/facebook bewust uit tot er MediumEnrichment-seeds zijn: prod heeft er 0), promptVersion @2, maxToolCalls 8→12. Propose-only/confirm/F-VAL/credits lopen volledig over de bestaande keten. **Bewijs**: smoke 17/17 mét echte AI — proposals met écht gedistilleerde NL-briefs uit de bron, confirm → deliverable in de bron-campagne mét `derivedFromId` → generatie → **F-VAL 79** (boven de linkedin-baseline 76); lege bron → 0 proposals; verboden typen geweigerd; cross-workspace-read dicht. Dogfood-regressie Milo groen + expliciete bleed-check (create-request instagram-post wordt gewoon voorgesteld). Review: 0 CRITICAL, 3 WARNINGs gefixt (o.a. content-fencing in de Claw-chat-route). Stap-0-gate vooraf op prod gedraaid (marginaal gehaald, hertoets-notitie in de task-file).

- Task: [tasks/done/agent-repurposer.md](../tasks/done/agent-repurposer.md)
- Plan: [tasks/_drafts/idea-agent-repurposer.md](../tasks/_drafts/idea-agent-repurposer.md) + marktonderzoek (#PR 128)

### 394. Agents-uitbreiding gepland — 6 discoveries + 5 task-files, gates vooraf gedraaid op prod-data

Volledige planning-flow (feature-planner-discovery → technical-planner-promotie) voor de zes agents uit het marktonderzoek (#PR 128), op user-akkoord "meenemen in de launch". **Ready**: `agent-reporter` ("Remi", agency-rapportage op Dana's tools — Fase 1 is een code-loze golden-report-validatie; credits-beslispunt bij Erik) en `agent-repurposer` (long-form → social-afgeleiden met F-VAL-score; route A = Milo-use-case i.p.v. 7e persona — `AgentSchedule` targt use-cases, dus het ritme-argument verviel; gate marginaal gehaald: 3 BB-bronnen mét aanwas, deels smoke-content; bijvangst: **0 `MediumEnrichment`-seeds op prod** → instagram/facebook-afgeleiden zouden hard-throwen, scope-note toegevoegd). **Data-gated**: `agent-seo-watchdog` (0 geo-geanalyseerde pagina's op prod — opent zodra de pilot GEO-content publiceert). **Tweede ring met Fase-0-validaties**: `agent-vera-triggers` (event-triggered brand-review; vondst: `PipelineStatus.REVIEW` is dood — het echte event is `approvalStatus → IN_REVIEW`; ADR-aanvulling vereist) en `agent-ads-watchdog` (creative-gezondheid op Meta; vondst: `AdMetricSnapshot` heeft nul writers en `AdCampaign` vereist `deliverableId` — metrics-sync + account-discovery zijn eigen fases; ADR vereist). **Localization**: bewust géén task-file (dubbel gegate op het multi-market-epic) — wel idea-doc + agent-consumability-eisenblok op het epic (headless engine, PROPOSAL-subset-confirm, glossary op `BrandLocaleProfile`, F-VAL-P3-threading als score-voorwaarde). Roadmap: nieuwe subsectie onder 🤖 Agents. Coördinatie-note: reporter en toekomstige persona-agents raken dezelfde registry-touchpoints — sequencen.

- Rapport: [docs/reports/agents-marktonderzoek-en-uitbreidingsadvies-2026-07-14.md](reports/agents-marktonderzoek-en-uitbreidingsadvies-2026-07-14.md)
- Ideas: `tasks/_drafts/idea-agent-{reporter,seo-watchdog,repurposer,vera-triggers,ads-watchdog,localization}.md`
- Tasks: `tasks/agent-{reporter,seo-watchdog,repurposer,vera-triggers,ads-watchdog}.md`

### 393. Job-runner parallel — agent-lane concurrent met een rest-worker-pool (follow-up op #388)

De geparkeerde runner-follow-up, ontgrendeld door de agents-scheduling-merge (#119/#391). `runPendingJobs` draaide de batch dubbel-sequentieel: de AGENT_TASK-run werd volledig ge-await vóór de rest-batch startte (een 10-min-agent-run liet batch-genoten wachten en blies meestal meteen het 600s-budget), en de rest-jobs liepen één-voor-één (de #388-kick vangt alleen níeuwe dispatches — batch-genoten serialiseerden nog). Nu: de **agent-lane** (ongewijzigde semantiek: itereer door SKIPPED, max 1 échte start, geen budget-check) draait als eigen lane **concurrent** met een **rest-worker-pool** (cap 4; budget-check vóór elke claim op de oude plek; pull in batch-volgorde → prioriteit bepaalt startvolgorde). Claims blijven atomair (geen dubbel-werk, ook niet over gekickte invocations heen); invocation-duur = max(agent-run, pool) i.p.v. de som. Review-W1: `safeRunJob` voorkomt dat één runJob-throw de invocation vroeg laat sterven met handlers in flight. Verificatie: tsc 0, lint 0, jobs-smoke groen (agent-minirun + pool samen), overlap-smoke: 3 jobs zelfde startseconde, wall 12,5s vs som 35,7s (2,9×).

- Task: [tasks/done/runner-parallel-batch.md](../tasks/done/runner-parallel-batch.md)

### 392. Task-triage: zes open taken gereconcilieerd — web-page-builder afgehecht, drie stale premisses gecorrigeerd

Doc-keeper-audit over alle zes open task-files vs de codebase; uitkomst: **niets hiervan is nu bouwwaardig** — de waarde zat in reconciliatie. (1) **`web-page-builder-canvas-step-mvp` → done**: alle 6 fasen + follow-ups bleken al maanden gemerged (PR #14/#15, #267-#345); Track-4-rest gereconcilieerd (README bestond al; marketing-pricing-dogfood obsoleet via #384; calibratie-doc de facto ingehaald door #270/#316/#336); echte restjes (bundle-split render-route, perf-meting, Puck-bug-report) → nieuwe post-launch-task `web-page-builder-acceptance-rest`. (2) **`power-user-shortcuts`**: stappen 1-3 (auto-inherit, "add another like this", bulk-add) bleken **al gebouwd in april 2026** (`ccb7e1cd`, vóór de changelog-migratie) — gedescoped naar alleen stap 4+5, post-launch. (3) **`content-test-regression-7B`** → later, data-gated: prod heeft 0× rejected/edited-LearningEvents (2× approved); plus de-scopes (golden-sets-runner i.p.v. promptfoo, PublishGate-surface i.p.v. de verwijderde Studio-UI). (4) **`video-chain-explainer-showcase`** → post-launch, gated: de Video&Audio-categorie staat hidden (geen bereikbare surface) én per-scene-visuals bestaan inmiddels (alleen de script-chain ontbreekt). (5) `validate-brand-domain-component-fit`: premisse-drift gecorrigeerd (5 → 11 blokken). (6) `publishgate-second-opinion`: accuraat, geen actie. Roadmap-regels mee-gesynct.

- Audit + adviezen: zie de triage-blokken bovenin de betreffende task-files
- Nieuw: [tasks/web-page-builder-acceptance-rest.md](../tasks/web-page-builder-acceptance-rest.md)

### 391. Agents Fase 2 — scheduled runs, notificaties, per-agent memory + streaming agent-loop (autonomie-trap 2)

De `AGENT_TASK`-stub is een echte brug geworden: job-queue → registry → `runAgent` met `triggerType: 'scheduled'` en de schedule-creator als acting identity (gevalideerd via `canActInWorkspace` — actief lid + schrijfrol; propose-only blijft dus ook headless gelden). **Schedules**: `AgentSchedule`-model met DST-veilige cadence-algebra (Intl two-pass, smoke over beide Europe/Amsterdam-grenzen), exactly-once-enqueue per due-slot (idempotencyKey + conditionele nextRunAt-claim + P2002-vangst), CRUD (cap 20/workspace, EVERY_MINUTE dev-only mét runtime-gate) en beheer-UI op de agent-detailpagina + Manual/Scheduled-inboxfilter. **Queue-hardening**: max 1 gestárte agent-run per cron-tick met 680s-cap, per-workspace concurrency-cap=1 via advisory-xact-lock (SKIPPED zonder attempt), DISTINCT ON-workspace-fairness, en stale-RUNNING-reapers (900s; eigen-claim-guard op terminale writes; 24h-bound tegen historische wedges). **Notificaties**: in-app + e-mail (alleen scheduled, `emailEnabled`-gated, ge-await) bij COMPLETED/FAILED/AWAITING_CONFIRMATION, run-owner-only, met deep-link `agents-inbox?run=<id>` (in-app én via `?section=`-URL-param). **Per-agent memory**: `AgentMemory.agentId`, vrije recall-tool + propose-only `remember_agent_memory` (confirm-pad executeert; agentId server-owned — forge-proof), beheer-UI. **Streaming-loop**: `messages.stream().finalMessage()` per turn heft het non-streaming SDK-plafond van 21.333 tokens op (strategist → 32k); dogfood-sweep alle 6 agents groen vs baseline (0× truncatie, F-VAL 75/72, de 32k-config die eerder élke Stella-run instant liet falen draait door — `docs/reports/agents-dogfood-2026-07-13-streaming.md`). Review: 5 rondes × 2 subagents, 22 WARNINGs gefixt, ronde 5 = 0 CRITICAL / 0 WARNING. ⚠️ Deploy vereist gebatchte Neon `db push` (AgentSchedule, `AgentRun.scheduleId`, `AgentMemory.agentId`, `NotificationType`+3) — zie task-file.

- Task: [tasks/done/agents-scheduling.md](../tasks/done/agents-scheduling.md)
- ADR: [docs/adr/2026-07-05-agents-architectuur.md](adr/2026-07-05-agents-architectuur.md) (D7 autonomie-trap 2; geen nieuwe ADR nodig)
- Spec: `-`
- Commit: `7b1cb76d..97afb568` (10 commits op branch `feat/agents-scheduling`: 5 slices + 3 review-fix-rondes + finalize)

### 390. SEO Fase 4b gemeten: editorial review (stap 7) blijft — F-VAL-A/B zegt NO-GO

Gepaard A/B-experiment (n=4, BB-prod-workspace, echte runs; beide armen uit dezelfde run — de enige delta is de stap-7-pass; scoring cross-family met gpt-5 als judge, skipPersist). Uitkomst: gemiddeld 77,0 mét vs 75,25 zónder (Δ 1,75, nét binnen de marge), maar de vooraf geregistreerde beslisregel wijst **NO-GO**: arm B zakt in 2/4 onder de threshold én de winst is heterogeen — drie briefs 0/+1, één brief **+6** (judge 77→86: editorial redt daar aantoonbaar brand-fit). Een pass schrappen die 1-op-4 zes punten kwaliteit levert is pre-launch niet verdedigbaar; een conditionele gate is met n=4 niet betrouwbaar te bouwen. **Besluit: stap 7 blijft; de pipeline blijft ~7,5 min** (vs 12 vóór #388/#389). Herdraaibare harness: `scripts/fidelity/fase4b-editorial-ab.ts`. Bijvangst: (1) tijdens de meting bleek het Anthropic-tegoed op — stille prod-outage voor alle Claude-features, direct geëscaleerd en door Erik opgewaardeerd; (2) 2/4 briefs scoren in béide armen onder de threshold — draftkwaliteit is briefing-gevoelig, los van de editorial-vraag.

- Task: [tasks/done/seo-fase4b-editorial-ab.md](../tasks/done/seo-fase4b-editorial-ab.md)
- Meting: [tasks/seo-pipeline-speedup.md](../tasks/seo-pipeline-speedup.md) (§Fase 4b)

### 389. SEO Fase 4a — stap 8 parallel met de variant/polish-staart (~1 min van de wall-clock)

Vervolg op de #387-meting en de #388-kick: stap 8 (publication-prep-checklist, snel model, 42-130s) zat sequentieel vóór de variant-B/GEO-polish-staart terwijl beide uitsluitend aan de stap-7-output hangen — sinds ronde 2 is stap 8 checklist-only en levert hij geen prose meer. De wave-executor loopt nu t/m [7]; daarna draaien **stap 8 en de staart concurrent** (variant B ∥ GEO-polish-A → polish-B), waardoor de volledige stap-8-duur achter de staart verdwijnt. Events/checkpoint/resume-semantiek byte-voor-byte behouden (8-stappen-tracker, checkpoint na stap 8, resume-hergebruik); de staart blijft fail-soft. De échte staart-duur wordt nu gemeten en als timing-entry **step:10** gepersisteerd (complete-event → driver), en step:9 is geherdefinieerd als staart-restant + persist/charge. Bewuste, gedocumenteerde input-delta: variant B ziet de accumulatedContext zonder het stap-8-checklist-JSON (mechanische ruis over variant A). Gedocumenteerde trade-off: een run waarvan waves 1-7 het 600s-continuation-budget overschrijden kan de staart dubbel draaien (kosten, geen corruptie). Verwacht met #388 samen: wall-clock ~12 → ~8 min; prod-validatierun volgt. Fase 4b (checklist in stap 7 mergen of stap 7 conditioneel skippen) blijft gegate op een F-VAL-A/B. Verificatie: tsc 0, lint 0; review 0 CRITICAL / 2 WARNINGs verwerkt.

- Task: [tasks/done/seo-fase4a-tail-parallel.md](../tasks/done/seo-fase4a-tail-parallel.md)
- Meting: [tasks/seo-pipeline-speedup.md](../tasks/seo-pipeline-speedup.md) (§Fase 4a)

### 388. Job-queue instant-kick + SEO-overheid-instrumentatie — Fase 3b-uitvoering op de #387-meting

De grootste hefboom uit de #387-meting gedicht zonder de runner aan te raken (die is van de in-flight `agents-scheduling`-taak): **`dispatchJob` kickt nu direct de cron-worker** (fire-and-forget self-request met CRON_SECRET, serverless-safe via `after()` + 5s-abort, 10s-debounce tegen batch-amplificatie, fail-silent → minuut-cron blijft vangnet). Elke kick start een vérse invocation die alleen de nieuwe job claimt — dat haalt zowel de tot-60s-cron-wachttijd als het head-of-line-blocking weg (de #387-run wachtte 2m53 achter andere jobs) en laat SEO-continuations in seconden resumen. **Instrumentatie**: de SEO-driver schrijft nu `step:0` (setup) en `step:9` (post-stap-8-staart) bij in `state.timings`; review-vondst daarbij — die staart bevat variant-B + GEO-polish (1-3 AI-calls), dus de "~1m24 in-invocation overhead" uit #387 is grotendeels **ongetelde AI-tijd** (herkadert de Fase-3b-conclusie; de volgende run kwantificeert het exact). Continuation-runs verliezen hun timings niet meer (hydration-fix). Batch-parallellisatie in de runner = follow-up ná de agents-scheduling-merge. Verificatie: tsc 0, lint 0, kick-unit-smoke PASS; review 0 CRITICAL / 4 WARNINGs verwerkt.

- Task: [tasks/done/job-queue-latency.md](../tasks/done/job-queue-latency.md)
- Meting: [tasks/seo-pipeline-speedup.md](../tasks/seo-pipeline-speedup.md) (§Meting)

### 387. Deploy-smokes job-queue + SEO-meting gedraaid — go/no-go bepaald én stille sign-up-breuk op prod gevonden en gefixt

De laatste deploy-smoke van de launch-pad (taak #7), autonoom gedraaid via een gelabeld smoke-account (`erik+claude-smoke-7e@`). **Kritieke bijvangst**: elke nieuwe prod-sign-up bleek te 500'en op de missende `Organization.sepaPaymentMethodId`-kolom — de handmatige Neon-push van de Fase-4/5a/5b-delta was gerapporteerd als gedaan maar vermoedelijk vanuit een oud-schema-checkout gedraaid; onboarding was stil kapot sinds de 5a-deploy. Push opnieuw gedraaid vanaf actuele main (additief, "in sync") en geverifieerd met een echte sign-up (zie gotcha 2026-07-13). **Job-queue**: alle 7 gemigreerde job-types end-to-end COMPLETED op de deploy via de minuut-cron (website-scan, trend-research, brandstyle-URL, brandvoice-URL, bug-report, chat-feedback, SEO-generate). **SEO-meting (de gate voor `seo-pipeline-speedup` Fase 3/4)**: 6 pilot-runs + 1 verse run — wall-clock gem. 10,9-12 min vs effectieve AI-tijd 7,5-8,5 min; F-VAL 90-92 threshold-met. Verdict: doel 5-7 min nog niet gehaald; **grootste hefboom is de 2,4-4,5 min niet-AI-overhead (nieuw: Fase 3b overhead-analyse eerst)**, daarna **Fase 4 GO** (stap 7+8 = ~2,9 min premium; stap-8-spreiding 42-130s suggereert dat het checklist-only-pad niet altijd actief is), **Fase 3 context-trim NO-GO** als latency-maatregel (output-gedomineerd, zoals voorspeld). Volledige meting in de task-file.

- Task: [tasks/seo-pipeline-speedup.md](../tasks/seo-pipeline-speedup.md) (§Meting)
- Gotcha: Neon-push pas "gedaan" na een verificatie-write (gotchas.md 2026-07-13)

### 386. Auto-topup BTW-compliant (invoice-based) + cap-race atomair dicht — laatste gate vóór topup-enable

De twee herbeoordeel-punten uit playbook §9/§10 opgelost; er staat niets meer tussen de huidige staat en `NEXT_PUBLIC_TOPUP_ENABLED=true`. **(1) Invoice-based charging**: de off-session auto-topup-incasso loopt niet langer via een kale PaymentIntent (geen BTW mogelijk) maar via een `charge_automatically`-invoice met `automatic_tax` — pack-prijs ex-BTW als invoice-item, Stripe Tax rekent het tarief, en de bestaande `invoice.paid`-webhook persisteert de factuur gratis in Settings → Billing. Idempotency-anker verhuisd van PI-id naar invoice-id (`topup:<in_…>`); settle op `invoice.paid`, reversal + kill-switch op `invoice.payment_failed` (die voor topup-invoices bewust géén PAST_DUE op de subscription zet); dispute/refund-fallback herleidt invoice-charges zonder PI-metadata via `invoicePayments.list`. De mandaat-Checkout verzamelt nu verplicht een adres (tax-locatie). **(2) Cap-race (review-W2)**: cap-check + optimistische claim atomair in één transactie onder `pg_advisory_xact_lock` per org, claim-vóór-charge (draft-invoice eerst; bij over-cap wordt de draft gedelete, bij bewijsbare sync-pay-fout gevoid + reversal). Verificatie: tsc 0, lint 0, unit-smokes 49/49, e2e-testmode-smoke groen — BTW-factuur €50+€10,50, settle, exact één claim uit 2 parallelle calls, fail-pad reversal+kill-switch (playbook §11; herdraaibaar via `scripts/dev/credit-autotopup-e2e-smoke.ts`).

- Task: [tasks/done/credit-autotopup-invoice-tax.md](../tasks/done/credit-autotopup-invoice-tax.md)
- Playbook: [stripe-go-live §11](playbooks/stripe-go-live.md)

### 385. Stripe live-config + testmode-deploy-smokes billing groen — webhook-api_version-landmine gefixt

Volledige Stripe-productieconfiguratie via de API afgerond (user-taken #2/#6): webhook-endpoint van 9 → 14 events; iDEAL/SEPA display-preferences aan (SEPA-capability door Erik via dashboard, geverifieerd `active`); **Stripe Tax `active`** (head-office Ede, defaults `exclusive` + SaaS-B2B-taxcode, NL-registratie — live én testmode gespiegeld); `SELLER_VAT_NUMBER` in Vercel; **prijzen ADR-conform**: STARTER €39 en GROWTH €89 aangemaakt, AGENCY-prijs gecorrigeerd van €99 naar €299, oude-casing-producten gearchiveerd, alle actieve prijzen `tax_behavior: exclusive`, price-envs in prod+preview + redeploys. **Testmode-deploy-smokes (user-taak #3) allemaal groen** tegen echte Stripe-testmode met `stripe listen` + headless Playwright: iDEAL-testbank-mandaat → generated `sepa_debit`-pm; auto-topup optimistisch → settled; fail-IBAN → reversal + kill-switch; BTW-facturen NL-21% / DE-reverse-charge / FR-0%-zonder-OSS — alle `Invoice`-tax-velden correct gepersisteerd. **Kritieke bijvangst**: het prod-webhook-endpoint had geen `api_version`-pin en leverde events in account-default **2019-10-17**-shape (had de hele 5b-BTW-extractie stil gebroken) — endpoint opnieuw aangemaakt gepind op `2026-02-25.clover` + secret-rotatie in Vercel. Restpunten vóór topup-enable: W2-cap-race + auto-topup-PI buiten Stripe Tax (playbook §9/§10).

- Playbook: [stripe-go-live §8–10](playbooks/stripe-go-live.md)
- Gotcha: webhook-endpoints altijd pinnen op de SDK-`api_version` (gotchas.md 2026-07-12)

### 384. Marketing-site launch-klaar — ADR-pricing, features gemoderniseerd, JSON-LD

Het bestaande /marketing-scaffold (route-group, 6 pagina's, UTM-tracking) naar launch-klaar gebracht. **Pricing-pagina volledig op het ADR-credit-model**: Starter €39/400cr · Growth €89/1.200cr · Agency €299/4.000cr, top-up-packs (500/€50 · 1.500/€135 · 5.000/€400, €0,10/credit), 28-daagse no-card-trial met 300 credits, en een credit-FAQ die de differentiator expliciet maakt ("brand context and every brand-fit check are always free") + iDEAL/SEPA/reverse-charge-antwoord. **Stale productverhalen gemoderniseerd**: Content Studio/"53 types" → Content Canvas/25+ types (incl. web-page-builder + SEO/GEO), Brandclaw → AI Agents (de zes echte agents, propose-only/human-in-the-loop-framing) — nav, footer én sitemap-slugs mee. **SEO**: Schema.org JSON-LD (Organization/WebSite/Product+offers) in de layout; dode legal-footer-links verwijderd (pagina's bestaan nog niet — user-taak). Visueel geverifieerd met Playwright: 6/6 pagina's HTTP 200, 0 console-errors. Content-rest (copy-review, echte quote, product-screenshots, Calendly, legal, domein-rewrite) staat als user-taak #9 op de takenlijst.

- Task: [tasks/done/marketing-site-pricing.md](../tasks/done/marketing-site-pricing.md)
- ADR (prijzen): [docs/adr/2026-07-07-pricing-credits-launch.md](adr/2026-07-07-pricing-credits-launch.md)

### 383. Launch-pad-hygiëne — credit-model écht af (pre-flight-hints, auto-topup-instellingen), pricing-UI-fixes en task-reconciliatie

Completion-ronde over de resterende launch-pad-taken. **Credit-model-restjes gedicht**: pre-flight-kostenindicatie "kost ~N credits" (nieuw shared `CreditCostHint`, gevoed door de centrale registry) op de drie primaire generatie-CTA's — canvas-tekst (short 5 / long-form 80 via de template-categorie), AI-image (2) en AI-video (20); auto-topup-instellingen-UI + `/api/billing/auto-topup` (toggle/pack/plafond, owner/admin, aanzetten fail-closed 409 zonder actief mandaat of pack); Fase-2d-documentatie van de credit-keuze per background-job-type in `handlers.ts`; `metered.ts` in-arrears-pad expliciet gedeprecieerd. **review-live-pricing (code-deel)**: `PLAN_CONFIGS` bleek al ADR-conform (Starter €39/Growth €89/Agency €299; PRO legacy) — de taak-tekst zelf was stale; de jaarlijks-toggle is nu feature-gated via `yearlyAvailable` op `/api/stripe/prices` (geen -20%-belofte meer zonder echte yearly-prijzen). Nieuw gevonden en op de user-takenlijst gezet: prod mist de Starter/Growth-price-ids (checkout nieuwe tiers onmogelijk) en de lokale `STRIPE_SECRET_KEY` is corrupt (`ssk_live…`). **Onboarding-test**: volledig protocol geleverd (`docs/playbooks/onboarding-test-protocol.md`). **Task-reconciliatie**: pricing-credits fase2/3/6 + umbrella, review-live-pricing en pre-launch-browser-smoke-batch → `tasks/done/` met eerlijke delta-notities; de deploy-smokes en menswerk-delen staan als [USER]-taken op de takenlijst.

- Tasks: [pricing-credits-billing](../tasks/done/pricing-credits-billing.md) · [review-live-pricing](../tasks/done/review-live-pricing.md) · [pre-launch-browser-smoke-batch](../tasks/done/pre-launch-browser-smoke-batch.md)
- Playbook: [onboarding-test-protocol](playbooks/onboarding-test-protocol.md)

### 382. Credit-model Fase 5b — Stripe Tax/BTW: reverse-charge, OSS en factuur-uitsplitsing

Sluit het credit-launch-bouwwerk (Fase 0-6): de BTW-laag. **Checkout doet het werk** (Integration-First, geen eigen tarief- of VIES-logica): `automatic_tax` + verplichte adres-collectie + `tax_id_collection` (Stripe VIES-valideert; geldig EU-B2B-VAT → reverse-charge, ongeldig → fail-closed lokaal tarief, EU-B2C → OSS) op subscription- én top-up-sessies; top-up-`price_data` expliciet `tax_behavior: 'exclusive'`. **Persistentie**: `extractInvoiceTax` (API clover: `total_taxes`) schrijft `taxAmount/taxRate/netAmount/reverseCharge/customerVatNumber/sellerVatNumber` op het (additief uitgebreide) `Invoice`-model; `amount` blijft het totaal (bestaand UI-contract). **UI**: `InvoiceHistoryCard` toont netto/BTW(+tarief)/totaal, "btw verlegd (reverse charge)" en beide VAT-nummers. Bewuste deviaties gedocumenteerd in de task: geen org-VAT-veld/eigen VIES-route (Stripe-customer = bron; per factuur gepersisteerd) en de off-session auto-topup-PI valt buiten Stripe Tax (herbeoordeel-punt vóór topup-enable, playbook §9). Verificatie: smoke `credit-invoice-tax-smoke` 12/12 (NL-21%/reverse-charge/pre-tax-nulls/end-to-end-upsert), tsc/lint 0. Dashboard-acties (Stripe Tax aan, origin-adres, prijs-tax_behavior, OSS, `SELLER_VAT_NUMBER`) in playbook §9. Review-ronde (0 CRITICAL, 3 WARNINGs): reverse-charge-detectie belt-and-braces via `total_taxes[].taxability_reason` (het `customer_tax_exempt`-veld is onder automatic_tax een dode snapshot — de smoke valideerde de aanname i.p.v. Stripe-gedrag), top-up-Checkout krijgt `invoice_creation` (BTW-factuur is verplicht bij elke levering; de usage-reset in invoice.paid is daarbij gegate op subscription-billing_reasons), en de Neon-push van de Invoice-kolommen staat nu expliciet in playbook §9 (zonder push 500't de invoices-route na deploy). Hiermee zijn **Fase 4 + 5a + 5b compleet** — de resterende weg naar betaling-koppelen is dashboard-config + één gebatchte Neon-push + deploy-smokes (user-checklist).

- Task: [tasks/done/pricing-credits-fase5b-tax.md](../tasks/done/pricing-credits-fase5b-tax.md)
- ADR: [docs/adr/2026-07-07-pricing-credits-launch.md](adr/2026-07-07-pricing-credits-launch.md)
- Playbook: [docs/playbooks/stripe-go-live.md](playbooks/stripe-go-live.md) §9

### 381. Credit-model Fase 5a — iDEAL/SEPA op checkout + incasso-mandaat + auto-topup live

Het payments-deel van Fase 5 (gesplitst per de Simplicity-noot in de task; 5b = Tax/BTW volgt apart). **iDEAL** naast kaart op de top-up-Checkout (bewust geen sepa_debit voor one-offs — incasso settelt na dagen) en `card+ideal+sepa_debit` op de subscription-Checkout (iDEAL-eerste-betaling krijgt Stripe-native een SEPA-mandaat voor renewals). **Herbruikbaar incasso-mandaat** via Checkout `mode:'setup'` (volledig gehost, geen Elements): `sepa-mandate.ts` + `/api/stripe/setup-mandate` (GET status/POST start, owner/admin) + mandaat-blok in PaymentMethodsCard; status is webhook-owned ('active' nooit optimistisch; `mandate.updated` fail-closed). **Auto-topup is live** (het Fase-3-invulpunt): blootstellingsplafond over optimistisch-onbevestigde credits (settled-check in JS — SQL `NOT(path=true)` mist rijen zonder de key, JSON-NULL-semantiek), off-session PI tegen het mandaat, optimistische grant met idempotencyKey `topup:<pi.id>` (zelfde key als de succeeded-webhook → nooit dubbel-grant; succeeded markeert settled), reversal via `payment_intent.payment_failed` (force-deduct, idempotent), in-app notificatie per bijkoop (`AUTO_TOPUP`-enum). Review-ronde (1 CRITICAL + 5 WARNINGs): het single-use-iDEAL-pm-vs-generated-sepa_debit-pm-gat gedicht (`resolveSepaPaymentMethodId` via SetupAttempt-expand — anders faalde élke incasso terwijl de status 'actief' toonde), dispute/refund-reversal voor late SEPA-terugboekingen (`charge.dispute.created`/`charge.refunded`), race-tombstone (failed-vóór-grant kan nooit alsnog toekennen), geen pending-degradatie van een actief mandaat, en een kill-switch (één gefaalde incasso zet auto-topup uit — geen oneindige charge-cyclus). Bewust geaccepteerd + gedocumenteerd: de cap-race bij parallelle tekorten (~1s-venster; herbeoordelen vóór topup-enable). Verificatie: nieuwe smoke `credit-sepa-mandate-smoke` **19/19** (bewust zonder Stripe-API: de lokale key bleek live; charge-pad = deploy-smoke in testmode), regressie autotopup 5/5 + topup 4/4 + ledger 8/8 + enforce 4/4, tsc/lint 0. User-acties: **5 webhook-events** toevoegen in het Stripe-dashboard (setup_intent.succeeded, mandate.updated, payment_intent.payment_failed, charge.dispute.created, charge.refunded) + Neon db push (sepaPaymentMethodId + AUTO_TOPUP, te batchen met TRIAL_EXPIRING).

- Task: [tasks/done/pricing-credits-fase5a-payments.md](../tasks/done/pricing-credits-fase5a-payments.md)
- ADR: [docs/adr/2026-07-07-pricing-credits-launch.md](adr/2026-07-07-pricing-credits-launch.md)
- Playbook: [docs/playbooks/stripe-go-live.md](playbooks/stripe-go-live.md) §8

### 380. Credit-model Fase 4 — reverse-trial compleet: read-only-lock + T-3/T-0-vervalmeldingen

Voltooit de 28-daagse no-card reverse-trial (ADR 2026-07-07 D8). De trial-start (300cr-grant, idempotent) en de expiry-cron bestonden al (#372); dit levert de ontbrekende lifecycle: **(1) on-read trial-state** — nieuw `trial.ts` met `getTrialState`/`isReadOnlyLocked`, afgeleid uit `trialEndsAt` + betaal-historie (`lifetimeGranted > TRIAL_CREDITS` óf actieve subscription óf unlimited) — geen status-veld dat een cron moet zetten, dus nooit stale; **(2) read-only-lock** — één lock-check ín `enforceCreditBalance` (vóór de saldo-check, eigen 402 met `trialExpired: true`-conversie-CTA i.p.v. een misleidende "koop credits bij" op restsaldo) dekt de 6 gemeterde generatie-routes; `enforceNotLocked` op de 4 entity-create-routes én (review-W1) op de 5 post-hoc-generatie-ingangen (landing-pages, persona-image, edit-image, consistent-models, agent-run/confirm) zodat een gelockte org ook via chargeAfter-paden geen negatief saldo kan draaien; PATCH/DELETE-edits blijven bewust open (restpunt, copy is daarop eerlijk); lees-routes en merk-data blijven volledig intact (geen delete-pad geraakt); lock-lift is impliciet via de ledger — élke top-up/plan-grant tilt `lifetimeGranted` boven de trial-bundel; **(3) T-3/T-0-meldingen** — `trial-notify.ts` in de bestaande dagelijkse expire-trials-cron: in-app (`NotificationType.TRIAL_EXPIRING`, additief enum-lid → Neon `db push` vóór deploy) + e-mail via Emailit, dedup zonder schema-velden via het createdAt-venster rond `trialEndsAt`; **(4) UX** — `isLocked` in `/api/billing/balance` + lock-banner in `CreditBalanceCard` ("merkdata blijft veilig en zichtbaar"). Verificatie: nieuwe smoke `credit-trial-lock-smoke` 16/16 (state-matrix, 402-precedentie, entity-guard, dedup-vensters), regressie trial-expiry 5/5 + enforce 4/4, tsc/lint 0.

- Task: [tasks/done/pricing-credits-fase4-trial.md](../tasks/done/pricing-credits-fase4-trial.md)
- ADR: [docs/adr/2026-07-07-pricing-credits-launch.md](adr/2026-07-07-pricing-credits-launch.md)
- Spec: [tasks/pricing-credits-billing.md](../tasks/pricing-credits-billing.md)

### 379. F-VAL op rauwe content-REPORTs — Milo's inline draft krijgt een echte score (ADR-D5-gat gedicht)

De laatste open dogfood-bevinding (r1 #1 / r2 #5): `AgentArtifact.fidelityScore` bleef `NULL` op de content-REPORTs van de content-creator, terwijl ADR D5 eist dat élke content-output een fidelity-score toont. Nieuw `reportScoringOutputContract` (eigen module, wrapper om het gedeelde artifact-contract): na de atomaire run-finalize scoort het de zojuist aangemaakte REPORTs via `runFidelityForExternalContent` (zelfde pad als Vera's review — de score landt ook als `ContentReviewLog` in Brand Alignment) en schrijft `fidelityScore` terug op het artefact. Scoping: alleen REPORTs met `content.markdown`, geen `answerFallback` (generiek antwoord ≠ content), ≥50 woorden; fail-soft (een score-fout kan de run nooit falen). Alleen de content-creator gebruikt dit contract; de UI toonde al automatisch een `FidelityBadge` zodra de score er is. Gevalideerd met een echte run: `REPORT(F-VAL 71)`, run-gedrag/kosten ongewijzigd. NB-nummering: #378 is geclaimd door de golden-set-gate-fix (parallelle PR).

- Task: [tasks/done/agents-fval-report-scoring.md](../tasks/done/agents-fval-report-scoring.md)
- ADR: [docs/adr/2026-07-05-agents-architectuur.md](adr/2026-07-05-agents-architectuur.md) (D5)
- Rapporten: [agents-dogfood-2026-07-07.md](reports/agents-dogfood-2026-07-07.md) bevinding #1 · [agents-dogfood-2026-07-12.md](reports/agents-dogfood-2026-07-12.md) bevinding #5

### 378. Golden-set-gate hersteld — uitgefaseerd model-ID + herkalibratie sonnet-4-6 (evaluate weer betekenisvol)

De `evaluate`-check (Content Golden-Sets) stond structureel rood — op elke PR én op main. Echte root cause (anders dan de secrets-hypothese in de task): alle 8 golden-set-yamls draaiden op het **uitgefaseerde model-ID `claude-sonnet-4-5-20251001`** → Anthropic 404 op elke case → 0/10 < 70%-drempel. Fix in vier lagen: model-ID → `claude-sonnet-4-6` (8 configs); workflow-`permissions` voor de PR-comment ("Resource not accessible by integration"); herkalibratie van de blog-post-set op het nieuwe model — het output-contract dat de asserts al toetsten expliciet in de prompt (H1-direct zonder preamble, SEO-keyword letterlijk, harde lengte-eis, brand-primacy bij off-brand briefs) + `max_tokens` 4000→8000; en twee kapotte testgevallen gerepareerd (H1-regex met `$` kon nooit op meerregelige output matchen; de 2000-woorden-case asserteerde lengte die de brief nooit vroeg). Meetreeks: 0/10 (crash) → 4/10 → 5/10 → **7/10 (70%, gate groen)**; de 3 resterende fails zijn llm-rubric-borderline (judge-variantie — de reden dat de gate op pass-rate i.p.v. per-case gaat). NB: 70% is de rand; structurele vervolgstap is de v2 orchestrator-wrapped prompts. e2e-helft van de task was al gefixt (PR #93 + `skipTour`-vertaling). Zelfde stale-artefact-familie als gotchas 2026-05-29/06-10: een model-ID dat alleen in CI-configs leeft, veroudert onzichtbaar.

- Task: [tasks/done/ci-golden-set-e2e-fixes.md](../tasks/done/ci-golden-set-e2e-fixes.md)
- ADR: -
- Workflow: `.github/workflows/golden-sets.yml` + `tests/content-golden-sets/`

### 377. Dogfood-r2 follow-ups — angle-generator thinking-fix, strategist-foundation-budget, worktree.sh --done + opruimwerk

De twee open non-fatale defecten uit dogfood-ronde 2 (#375) gefixt, beide met echte runs gevalideerd. **Angle-generator**: `gemini-2.5-flash` heeft dynamic thinking standaard aan en die thinking-tokens tellen mee in `maxOutputTokens` — daarom loste de ronde-1-budgetverhoging niets op. Fix: `thinking: { google: { thinkingBudget: 0 } }` (angles zijn framing-keuzes, geen deep reasoning); validatie: 2 volwaardige angles op het ronde-2-deliverable, geen MAX_TOKENS-warn. **Strategist-foundation**: outputbudget 16k → 24k in `budgetWithThinking` (strategy-chain) — de foundation-JSON kapte op fast-tier/Haiku af bij ~57k chars waardoor de tool faalde en de agent zonder fundering improviseerde; de Claude-wrapper streamt (geen SDK-21.333-plafond) en de timeout schaalt automatisch mee. Validatie: strategist-run 0× truncatie (was 1×), foundation slaagt; run kost nu ~$0,19 i.p.v. ~$0,09-0,12 doordat de gelukte foundation-output als tool-result terug de loop in stroomt (46k input-tokens) — de agent bouwt weer op een echte fundering. **Tooling**: `worktree.sh --done <task-id>` geïmplementeerd (stond al in de eigen help-tekst maar bestond niet): verwijdert een schone taak-worktree + safe-delete van de gemergde branch, weigert dirty trees — live getest op beide paden. **Opruimwerk** (START_HERE item 1): worktrees `branddock-feat-agents-feature/-ui/-data` + `branddock-brandclaw` + `branddock-agents-dogfood-ronde2` verwijderd incl. gemergde lokale branches + remote `fix/agents-dogfood-ronde2`; `e2e-verify-main` bestond al niet meer.

- Task: [tasks/done/agents-budget-hygiene.md](../tasks/done/agents-budget-hygiene.md)
- ADR: [docs/adr/2026-07-05-agents-architectuur.md](adr/2026-07-05-agents-architectuur.md)
- Rapport: [docs/reports/agents-dogfood-2026-07-12.md](reports/agents-dogfood-2026-07-12.md) (bevindingen #2/#3)

### 376. Content-flow friction-tickets #7.A — afgeleide type→categorie-map, expliciete Plan-and-Solve-set, few-shot-diversiteit ads

Uitvoering van de CF-tickets uit de #7.A flow-analyse, na een verificatie-sweep die 4 van de 9 tickets achterhaald toonde (CF-1 templates / CF-2 twitter-thread / CF-9 LP-F-VAL waren al geland; CF-6/7 skip zolang de betrokken types hidden zijn). Geland: `TYPE_TO_CATEGORY` wordt afgeleid uit de 8 template-collecties (de handmatige voorganger had 9 phantom-IDs + 11 ontbrekende types die stil op `'long-form'` terugvielen, o.a. `facebook-ad`); Plan-and-Solve-eligibility is een expliciete set (long-form-categorie + `proposal-template`/`impact-report`, PUCK-website-types bewust uitgesloten); `getPromptTemplate()` warnt (once-per-type, niet op lege legacy-id) bij een generic-fallback-hit; `smoke:prompt-contracts` sectie (g) bewaakt de dekking via het échte lookup-pad (`hasDedicatedTemplate`) + een cross-collectie-collision-assert; en de 6 zichtbare ad-types kregen een tweede few-shot-anchor in een contrasterende branche + expliciete niet-kopiëren-instructie (anti example-bleed; 41 velden programmatisch binnen hun character-limits gevalideerd; versions advertising 1.3.0 / social-media 2.1.0). Kwaliteit: 2×2 reviewer-subagents over 2 rondes (r1: 4 WARNINGs gevonden + gefixt; r2: 0 CRITICAL / 0 WARNING, alle claims onafhankelijk gereproduceerd — 23/24 zichtbare types byte-identiek gedrag; enige delta is de bedoelde facebook-ad-fix op een dormant pad). Gates: tsc 0 · lint 0 · prompt-contracts 293/293.

- Task: [tasks/done/content-flow-improvements-7a.md](../tasks/done/content-flow-improvements-7a.md)
- ADR: [adr/2026-07-12-type-category-derivation-plan-and-solve.md](adr/2026-07-12-type-category-derivation-plan-and-solve.md)
- Spec: `docs/specs/content-flow-synthesis.md` (bron-tickets §F)
- Commits: `9adf77dd` (CF-1/3/4 + smoke g + ADR) · `eaff014d` (CF-5/8) · `02415d29` (review-fixes r1)

> NB nummering: #375 is bewust overgeslagen — dat nummer is geclaimd door de agents-dogfood-r2-entry uit de parallelle sessie (inmiddels gemerged via PR #102) om een renumber-collision te vermijden.

### 375. Agents dogfood-ronde 2 — strategist-regressie gevonden + gefixt, credit-metering op agents praktijk-gevalideerd

Herhaalmeting van de agents-dogfood (ronde 1 = #366-tijdvak, rapport 2026-07-07), autonoom uitgevoerd. **Hoofdvondst**: de ronde-1-hygiëne-fix (strategist `maxTokens` 16k→32k) bleek een fatale regressie — de Anthropic SDK weigert non-streaming calls met `maxTokens > 21.333` client-side ("Streaming is required…"), waardoor élke Stella-run sinds 2026-07-07 instant faalde, óók op productie. Fix: `NONSTREAMING_MAX_TOKENS`-clamp in `runLoopCore` (defense-in-depth voor alle agents, warn bij clamp) + strategist-definitie op 21.333; gevalideerd met een echte run (COMPLETED, 241,9s, $0,09). **Credit-metering op agent-runs voor het eerst in de praktijk gemeten**: sweep met credits aan boekt correct 0 transacties (5 gratis agents; Milo-proposal boekt niet), confirm-pad boekt exact −3 credits (`agent-deliverable`, idempotencyKey) — geen instrumentatie-blocker meer voor Fase 2. Guardrails opnieuw groen: ~$0,09/run, eindcontent F-VAL 73 (>70). Open bevindingen: angle-generator-truncatie niet verholpen (Gemini thinking-tokens eten het `maxOutputTokens`-budget) en de oorspronkelijke strategist-truncatie zit in de gedeelde `createClaudeStructuredCompletion`-default (16k) — beide non-fataal, gedocumenteerd. Harnassen verbeterd: `DOGFOOD_RUN_DATE`/`DOGFOOD_ONLY` op de sweep, route-parity credit-charge in het confirm-pad. Les vastgelegd als gotcha 2026-07-12.

- Task: [tasks/done/agents-dogfood-ronde2.md](../tasks/done/agents-dogfood-ronde2.md)
- ADR: [docs/adr/2026-07-05-agents-architectuur.md](adr/2026-07-05-agents-architectuur.md)
- Rapport: [docs/reports/agents-dogfood-2026-07-12.md](reports/agents-dogfood-2026-07-12.md)

### 374. Credits LIVE in pilotmodus — top-up-gate + activatie (betaling nog niet gekoppeld)

Het credit-model draait sinds 2026-07-10 live op productie in **pilotmodus**: pilots zien hun creditsaldo (Settings → Billing) dalen per generatie en hebben een hard **maximum** (het via het Credit Admin-paneel gegrante budget → bij 0 een nette 402), terwijl de **koop-flow volledig dicht** is. Daarvoor een derde vlag: `NEXT_PUBLIC_TOPUP_ENABLED` (default uit) — `TopupCard` verbergt zich, `createTopupCheckout` weigert server-side (geen route naar live-Stripe-charges), en de 402-copy is topup-bewust ("Neem contact op voor extra credits" i.p.v. een koopverwijzing). Activatie-volgorde: eerst grants/comps via het admin-paneel (eigen org unlimited, pilots capped), daarna `NEXT_PUBLIC_CREDITS_ENABLED=true` + rebuild-redeploy (NEXT_PUBLIC-vars zijn build-time). Betaling later koppelen = alleen `NEXT_PUBLIC_TOPUP_ENABLED=true` (na de launch-checklist: Stripe-price-map, Tax, iDEAL/SEPA). User-geverifieerd op prod. Bijvangst: `scripts/dev/credit-admin.ts` (saldo tonen/granten/zetten via CLI) alsnog gecommit.

- Task: [tasks/pricing-credits-fase6-usage-ux.md](../tasks/pricing-credits-fase6-usage-ux.md)
- ADR: [docs/adr/2026-07-07-pricing-credits-launch.md](adr/2026-07-07-pricing-credits-launch.md)
- Commit: `6ecbaaab` (#100)

### 373. Superuser Credit Admin-paneel — pilot-comps en grants vanuit de app

In-app platformbeheer van credits, zodat pilot-comps niet langer CLI-scripts vereisen. Nieuwe developer-only Settings-tab **Credit Admin** (zelfde `DEVELOPER_EMAILS`/`requireDeveloper()`-gating als AI Models/Bug Triage): per organisatie het saldo, een "Make unlimited"-toggle (comp aan/uit, met `invalidateOrgUnlimited`-cache-bust) en een grant-invoer (`grantCredits` type TOPUP met de admin-e-mail in de reason als audit-trail). API `/api/admin/credit-orgs` (GET lijst / POST grant|setUnlimited, zod-gevalideerd, 403 voor niet-superusers — live geverifieerd). Werkt bewust óók met credits-uit zodat pilot-orgs vóór de launch voorbereid konden worden. `DEVELOPER_EMAILS` in Vercel (Production+Preview) gezet op beide admin-adressen via de Vercel CLI.

- Task: [tasks/pricing-credits-fase6-usage-ux.md](../tasks/pricing-credits-fase6-usage-ux.md)
- ADR: -
- Commit: `#99`

### 372. Credit-model Fase 3+6 — billing-ON-gates, grants-trio, billing-UX en credit-vlag-ontkoppeling

Voltooit het credit-model tot live-klaar (PR #98, 2 reviewers × 2 rondes → ready-to-merge). **Gates**: unlimited-free-uitzondering per org (`Organization.unlimitedCredits`, gecachte `isOrgUnlimited` gewired in metering/charge/enforcement); pre-flight `enforceCreditsForAction` (402) op de 6 dure generatie-routes; trial-grant 300cr/28d bij signup (fail-soft, idempotent); plan-grant-maandbundel bij subscription-invoice (order-onafhankelijk via sync-first — review-CRITICAL-fix); handmatige top-up (Stripe Checkout + webhook-grant, idempotent per PaymentIntent, server-side prijs); grant-idempotentie (P2002-vangnet); confirm-time charge voor agent-deliverables; reaper-cron (15 min) + trial-expiry-cron (dagelijks, atomair nul-zetten via `FOR UPDATE`, alleen pure-trial-orgs). **Fase 6-UX**: `/api/billing/balance`, `use-credits`-hooks, `CreditBalanceCard` (saldo/trial/onbeperkt) + `TopupCard` in Settings → Billing. **Kritieke ontkoppeling**: prod bleek `NEXT_PUBLIC_BILLING_ENABLED=true` (subscriptions live) — een merge zou 0-saldo-orgs direct blokkeren; nieuwe `NEXT_PUBLIC_CREDITS_ENABLED`-vlag scheidt het credit-model van subscription-billing. Verificatie: smoke-suite 39/39 (ledger/exempt/enforce/grant-idem/reaper/topup/auto-topup/trial-expiry), in-app Pad-A-test (402 bij 0 saldo → grant 30 → video −20), tsc 0/lint 0. Launch-blocker gedocumenteerd: alle live Stripe-price-ids in de env-map vóór betaling-koppelen.

- Task: [tasks/pricing-credits-billing.md](../tasks/pricing-credits-billing.md)
- ADR: [docs/adr/2026-07-07-pricing-credits-launch.md](adr/2026-07-07-pricing-credits-launch.md)
- Commit: `840efb23` (#98)

### 371. Session/worktree-guard — één Claude-sessie per worktree geborgd

Voorkomt de multi-sessie-in-één-werkboom-race van 2026-07-07 (twee sessies deelden één `.git`/HEAD/index + `node_modules` → main-reset ↔ cherry-pick, `AA`-conflicten in de gedeelde index, verdwenen `node_modules/eslint`, ongegenereerde Prisma-client). Twee lagen: **structureel** — `scripts/dev/worktree.sh <task-id>` maakt in één commando een geïsoleerde worktree (branch vanaf `origin/main` + `.env.local` + `npm ci` + `prisma generate`), zodat de setup-frictie die worktrees deed mijden verdwijnt; **vangnet** — `.claude/hooks/session-guard.sh`, een per-worktree heartbeat-lock (geen PID → zelfhelend, stale na 15 min). SessionStart waarschuwt bij een levende co-sessie; PreToolUse(Bash) blokkeert (`exit 2`) HEAD/branch/index-mutaties (`checkout/switch/reset/rebase/cherry-pick/branch -f/-D/worktree/stash/merge`) onder een co-sessie — `commit`/`push`/edits/npm blijven vrij. Fail-open bij interne fouten. CLAUDE.md maakt "worktree per taak" een harde regel; `.gitignore` negeert de lock. Guard-logica getest op 6 scenario's (co-sessie-block, solo-allow, stale-takeover, non-git-allow, commit-allow, eigen-sessie-allow).

- Task: -
- ADR: -
- Spec: `gotchas.md` (2026-07-07)
- Commit: `08fcceb1` (#96)

### 370. CI-e2e-gate hersteld — critical-flow structureel groen

De CI-`e2e`-gate (`critical-flow.spec`) stond al lang rood op `main` én elke PR. Drie gelaagde, puur test-side oorzaken (de app was correct): (1) **stale testid** — de AI-Exploration-methode op de brand-asset-detail-pagina miste `data-testid="research-method-ai-exploration"` (weggevallen bij een refactor van `AssetResearchSidebarCard`); (2) **detach-hang** — de onboarding-tour detacht zichzelf uit de DOM tijdens de skip-klik → kale `.click()` hangt 30s; (3) **count-race** — `campaignCards.count()` telde vóór de async-geladen cards er waren → 0. Fixes: testid hersteld op de gedragsneutrale method-card; skip-klik `click({timeout:5s}).catch()` + `waitFor('hidden')` in `critical-flow.spec` (2×), `auth.fixture`, `performance.spec`; `await expect(cards.first()).toBeVisible()` vóór beide counts. Gediagnosticeerd door het Playwright-report-artifact te downloaden en de a11y-snapshot van het faalmoment te lezen. Gate nu groen (e2e + check success). Les vastgelegd in `gotchas.md`.

- Task: -
- ADR: -
- Spec: `gotchas.md` (2026-07-07)
- Commit: `16ba8107` (#93)

### 369. Credit-model billing — ledger + metering-scaffolding (Fase 0-2, billing OFF)

Prepaid credit-model per ADR `2026-07-07-pricing-credits-launch` (laag maandtarief + tokenbundel + output-only overage; merkcontext en F-VAL nooit gemeterd; iDEAL/SEPA + BTW; 28-daagse gratis tier). **Fase 0** — datamodel + config: `CreditBalance`/`CreditTransaction`/`CreditReservation` (+ enums), `PlanTier` +STARTER/GROWTH (PRO legacy behouden, additief schema), `plan-limits.ts` (Starter €39/400cr · Growth €89/1.200cr · Agency €299/4.000cr · floor €15 · top-up €0,10 · trial 300/28d), credit-kosten-registry. **Fase 1** — ledger-core: atomaire `deduct`/`grant`/`reserve`/`reconcile`/`release` + reaper, concurrency-veilig via conditionele `UPDATE … WHERE … RETURNING`, idempotent via `idempotencyKey`. **Fase 2** — metering-wiring (tracking-only, post-hoc `chargeAfter`): SEO long-form, content-agents, en alle primaire beeld/video/content-routes (`generate-visual`/`-trained`/`-feature-visuals`/`-video`, `personas/generate-image`, `landing-pages/generate-page`) met per-route pad-guards zodat alleen echte generatie boekt; compose/upload-routes bewust niet (dubbel-charge). Alles achter `isBillingEnabled()` → **billing staat OFF** (`NEXT_PUBLIC_BILLING_ENABLED=false`), dus dormant scaffolding zonder runtime-impact. Adversariële T-review (2 rondes): 2 CRITICAL gefixt (C1 agent-billable-gating, C2 reservering-TOCTOU) + hardening. Verificatie: tsc 0, lint 0, ledger-concurrency-smoke 8/8, deploy-smoke groen (Vercel + check). **Fase-3-gates vóór billing-ON**: `enforceCreditBalance`-wiring, credit-grants (trial/plan/topup), confirm-time charge, reaper-cron, en een **Neon `db push`** voor het schema-delta — gedocumenteerd in de task-file.

- Task: [tasks/pricing-credits-billing.md](../tasks/pricing-credits-billing.md)
- ADR: [docs/adr/2026-07-07-pricing-credits-launch.md](adr/2026-07-07-pricing-credits-launch.md)
- Commit: `e7ff8542` (#92)

### 368. Merk-DNA-migratie-tooling voor pilot-onboarding (Better Brands)

Scripts om **alleen het merk-fundament** van één workspace (brand assets, voice+centroid, brandstyle, personas, producten, concurrenten, trends, `FidelityConfig` STRICT, brand rules — ~18 modellen) van lokaal naar productie te migreren en te re-parenten in een vers-aangemeld prod-account (content/telemetrie-historie blijft lokaal). `scripts/migrate-brand-dna/`: `export` (lokaal → inspecteerbare JSON-bundle incl. pgvector via raw SQL), `upload-images` (lokale `/uploads/` → R2 + URL-rewrite, `R2_PUBLIC_URL` verplicht), `import` (één atomische transactie: fresh-workspace-guard over álle wipe-modellen, wipe+insert met `workspaceId`- en user-FK-remap, `Product.slug`-collision-resolver, `--confirm-host`-gate tegen wrong-DB-wipes, pgvector-restore). Bonus-fixes: `create-vector-indexes.ts` dekt nu alle 4 vector-kolommen (miste `CompetitorContentItem`); de foute Fase-8 pg_dump-snippet in de deployment-runbook gecorrigeerd. Geverifieerd via cross-DB round-trip (schema-kloon → export → import → 12/12 asserts groen, incl. confirm-host-gate, collision-resolver, centroid-restore 1536-dim, en +11 eerder stil-gedropte research-methods). Twee 2-subagent reviewrondes: ronde 1 → 1 CRITICAL + 5 WARNING; ronde 2 → 1 CRITICAL (`assertFresh` te smal) + 4 WARNING; alles gefixt. Prod-run + onboarding-mens-stappen resteren (task blijft `in-progress`).

- Task: [tasks/pilot-onboarding-better-brands.md](../tasks/pilot-onboarding-better-brands.md)
- ADR: -
- Spec: [scripts/migrate-brand-dna/README.md](../scripts/migrate-brand-dna/README.md)
- Commit: 368f2416

### 367. Content-items test-coverage Ronde 1 gefinaliseerd — pre-launch content-flow bugvrij (Ronde 2 gated)

Afronding van `content-items-test-coverage`: Ronde 1 was al compleet en gemerged op `main` (playbook `testplan-content-items.md` via `23e0c0e5`/#67, ebook-fix-bundel `fe95fef9`). 24/24 zichtbare content-types handmatig door de 6-staps flow (Setup → Knowledge → Strategy → Concept → Content → Canvas) getest op Napking: **23 passed, 1 bug (ebook) — inmiddels gefixt**, 0 nieuwe bugs. Representanten 4/8 via picker + 4/8 hidden-skip (categorieën bewust uit de Add-Content-picker); varianten 16/16 passed met vooraf hard-geverifieerde reachability. Picker-realiteit vastgelegd: 31 van 55 code-type-definities zijn hidden, 24 zichtbaar — de oude 53-type-matrix is achterhaald. Geen open P1/P2; 3 structuur-leen-observaties (product-page/social-ad/linkedin-article lenen component-structuur) doorgeschoven als post-launch content-kwaliteit-nit. **Ronde 2 (generator-evaluatie) expliciet deferred** — gated op asset-generator-integratie. Lichte finalize (status/doc, geen code-diff → geen 2-subagent review). Task → `tasks/done/`.

- Task: [tasks/done/content-items-test-coverage.md](../tasks/done/content-items-test-coverage.md)
- ADR: -
- Spec: [docs/playbooks/testplan-content-items.md](playbooks/testplan-content-items.md)
- Commits: `23e0c0e5` (Ronde 1 compleet, #67), `fe95fef9` (ebook-fix-bundel)

### 366. Stripe billing — LIVE op productie (go-live)

`stripe-billing-live` is volledig live gegaan op productie (`branddock-7y9n.vercel.app`). Bovenop de hardening (#79 — dode change-plan-exploit weg, one-time-purchase-completion, invoice/yearly-bug, env fail-fast) landden twee checkout-redirect-404-fixes (#85 checkout-success/cancel, #86 portal-return — de hybride SPA heeft geen URL-adresseerbare pagina's, dus redirect naar `/?checkout=…` + `App.tsx` opent de billing-tab) en een billing-styling-pass (#88 — PAID-badge groen [case-bug `PAID`≠`paid`], "Pro Pro"-redundantie weg, payment-copy naar "beheer via Stripe"). Go-live op het betterbrands.nl Stripe-account: 3 live-producten (PRO €29 / AGENCY €99 / ENTERPRISE €249), live-webhook (`we_…`, 9 events, enabled) op de Vercel-URL, Customer Portal (cancel at_period_end), en de live-vars + `NEXT_PUBLIC_BILLING_ENABLED=true` via een geïmporteerd `.env` in Vercel. End-to-end geverifieerd in test-mode (checkout→PRO, cancel→FREE) + live bevestigd. **Beide harde launch-blockers (Vercel + Stripe) zijn nu weg**; kritieke pad naar de eerste pilot = `pilot-onboarding-better-brands`.

- Task: [tasks/stripe-billing-live.md](../tasks/stripe-billing-live.md) — done (LIVE)
- PR's: #79 (hardening) · #85/#86 (redirect-fixes) · #88 (styling) · go-live via Stripe-API + Vercel-env
- Playbook: [docs/playbooks/stripe-go-live.md](playbooks/stripe-go-live.md)

### 365. Agents content sources — bronnen kiezen per agent-run (Brand-Assistant-pariteit)

Elke agent-use-case heeft nu een inklapbare "Content sources"-kiezer (zelfde modulelijst en labels als de Brand Assistant). Zonder selectie draait de run ongewijzigd op de volledige merkcontext; met selectie bevat de system-prompt alleen de gekozen bronnen (zelfde module-fetches als de Claw-overlay, incl. expliciete notitie wanneer het merkfundament is uitgesloten). Server-side gevalideerd en gefilterd; deselect-all wordt in de UI geblokkeerd. Deterministisch bewezen (prompt 20,9k → 7,7k bij personas-only).

- Task: [tasks/done/agents-context-sources.md](../tasks/done/agents-context-sources.md)
- ADR: [docs/adr/2026-07-05-agents-architectuur.md](adr/2026-07-05-agents-architectuur.md)
- Spec: -
- Commit: 22d84b9f (branch feat/agents-research-parity)

### 364. Agents research-parity — Nova op volle Library-diepte + motor-degradatie

Nova's deep research draait zonder config-override op exact de Library-defaults (6 queries/12 bronnen/verificatie/480s) — identieke prompts én identiek budget. De gedeelde research-motor degradeert nu netjes binnen zijn budget (leesfase stopt met partial, verify skipt bij krap restbudget, een gestárte synthese wordt nooit meer door de deadline weggegooid) en het agent-pad kreeg een server-afgedwongen once-per-run-guard (het model retryde een 8-min-onderzoek na een deadline-fout: 2×480s → guard-fail). Zware topics kunnen het gedeelde budget nog raken — de agent levert dan een eerlijk partial antwoord met advies.

- Task: [tasks/done/agents-research-parity.md](../tasks/done/agents-research-parity.md)
- ADR: [docs/adr/2026-07-05-agents-architectuur.md](adr/2026-07-05-agents-architectuur.md)
- Spec: -
- Commit: 22d84b9f (branch feat/agents-research-parity)

### 363. Agents domein-integraties — nav onder CREATE, antwoord-fallback, Marco→Competitors, Stella→Campaigns

Dogfood-feedback verwerkt: Agents staat als navigatie-item onder CREATE; een run die alleen tekst oplevert toont dat antwoord voortaan als REPORT-artefact (de "no parseable artifacts"-melding is structureel weg, incl. robuuste JSON-husk-strip); geaccepteerde concurrentie-analyses van Marco verschijnen als "Agent analyses"-sectie op de Competitors-pagina (canonieke category "Competitor Analysis" + nieuwe GET /api/knowledge/[id]); Stella's goedgekeurde campagne-strategie landt op campaign.strategicApproach en rendert als "Agent-strategie"-blok op de campagne-detail strategie-tab (wizard-blueprint blijft leidend); Milo kan zelf een campagne voorstellen. Review: 3 rondes, 0 CRITICAL, 8 WARNINGs gefixt.

- Task: [tasks/done/agents-domain-integraties.md](../tasks/done/agents-domain-integraties.md)
- ADR: [docs/adr/2026-07-05-agents-architectuur.md](adr/2026-07-05-agents-architectuur.md)
- Spec: -
- Commit: b1986bac (branch feat/agents-domain-integraties)

### 362. Agents Data Analyst — curated query-tools + server-owned TABLE-artefacten

Zesde persona-agent "Dana" (BarChart3) met 7 curated read-only query-tools (content-productie/maand, inventaris type×status, F-VAL-trend, persona/product-dekking, campagne-overzicht, competitor-activiteit, agent-run-kosten): vaste workspace-gescoped Prisma-queries met geclampte parametervlakken — het model kan geen cijfers verzinnen of vrije queries bouwen. Tabellen worden server-owned via de run-collector als TABLE-artefact geregistreerd (strikte parser + REPORT-fallback), gerenderd door een sorteerbare TableArtifactView en bij accept gematerialiseerd als markdown-tabel in de Knowledge Library. Review: 2 rondes, 0 CRITICAL, 4 WARNINGs gefixt; live smoke met psql-geverifieerde cijfers; eigen 22-assert smoke-script. Hiermee is Agents Fase 1 compleet (6 agents).

- Task: [tasks/done/agents-data-analyst.md](../tasks/done/agents-data-analyst.md)
- ADR: [docs/adr/2026-07-05-agents-architectuur.md](adr/2026-07-05-agents-architectuur.md)
- Spec: -
- Commit: 15b27152 (branch feat/agents-data-analyst)

### 361. Agents UI — catalogus + agent-detail + results-inbox + Claw agent-scoping

Agents-sectie in de SPA: catalogus met 5 persona-kaarten, agent-detailpagina met use-case-runner en run-historie, results-inbox met ArtifactViewer (REPORT/FINDINGS/LINK/PROPOSAL) en ProposalConfirmCard (approve/reject via de confirm-route, server-truth + 409-afhandeling). Claw-overlay kreeg optionele agent-scoping (persona in system-prompt; default-pad byte-identiek). i18n en/nl, stale-RUNNING-heuristiek, deep-links naar domein-pagina's. Review: 3 rondes, 0 CRITICAL, 6 WARNINGs gefixt (o.a. tab-in-scheme-XSS-bypass, stream-abort bij scope-wissel); e2e 5/5 + 13/13 browser-smoke.

- Task: [tasks/done/agents-ui-inbox.md](../tasks/done/agents-ui-inbox.md)
- ADR: [docs/adr/2026-07-05-agents-architectuur.md](adr/2026-07-05-agents-architectuur.md)
- Spec: -
- Commit: 2dcece5d (branch feat/agents-ui-inbox)

### 360. Agents motor-wiring — 5 persona-agents op bestaande motoren + propose-only confirm

Nova (Research Analyst), Vera (Brand Guardian), Stella (Strategist), Milo (Content Creator) en Marco (Market Analyst) draaien live op de bestaande motoren via een Claw→orchestrator tool-bridge: reads direct (mechanisch gefenced), writes propose-only (run-collector → PROPOSAL → AWAITING_CONFIRMATION → confirm-route met member+-gate, atomic claim, schema-hervalidatie en self-heal). Deep research schrijft direct door naar de Knowledge Library (source AGENT); Content-Creator-confirm draait de volledige generatie-pipeline incl. F-VAL (93 live gemeten). Review: 4 rondes, 3 CRITICAL (o.a. geforgede PROPOSal-artefacten → REPORT/LINK-whitelist) + 12 WARNINGs gefixt; alle 5 agents live gesmoked (~$1,20).

- Task: [tasks/done/agents-motor-wiring.md](../tasks/done/agents-motor-wiring.md)
- ADR: [docs/adr/2026-07-05-agents-architectuur.md](adr/2026-07-05-agents-architectuur.md)
- Spec: -
- Commit: 96b49fbc (branch feat/agents-motor-wiring)

### 359. Agents foundation — pluggable output-contract + AgentRun/AgentArtifact + registry + run-API

Eerste bouwtaak van het 🤖 Agents-initiatief (ADR `2026-07-05-agents-architectuur`). De Brandclaw agent-loop (`runAgentLoop`) is gegeneraliseerd naar een **pluggable output-contract**: de turn-loop is verbatim geëxtraheerd naar `runLoopCore`, het bestaande observations-pad werd de eerste adapter (`observations-adapter.ts`) en nieuwe agents draaien via `runAgentWithContract` — **aanname A1 bewezen zonder Strategy-Analyst-regressie** (baseline `7cb56c12` vs post-refactor `0e94e26d`, beide 17/17, structureel identieke DB-rijen). Nieuw: `AgentRun`/`AgentArtifact`-schema (additief, incl. `ResourceSource.AGENT`), code-based agent-registry (`src/lib/agents/registry/` — `AgentDefinition`, artifact-contract met atomaire finalize, run-entry met `resolveFeatureModel` + `assertProvider`), 6 `AiFeatureKey`s + Settings-categorie "Agents", 4 API-routes (`POST /api/agents/run` met Zod + 32KB-byte-cap + maxDuration 800, runs-list/-detail met caching, artifact accept/dismiss) en **accept-materialisatie naar de Knowledge Library** (domain-first write-through: first-accept-gated, advisory-locked tegen races, dead-id-zelfherstel, dismiss archiveert / re-accept de-archiveert). Cost-instrumentatie + PostHog-events (`agent_run_started/completed`, `agent_output_accepted`) vanaf dag 1 — ook op FAILED-runs via `OutputContractError`. Tevens **Brandclaw-reconciliatie**: `strategy-analyst-stub` → done (Phase C herbestemd met mapping-tabel), LATER-Brandclaw-tabel geabsorbeerd door het Fase-3-epic.

Review-loop: 5 rondes / 10 reviewers, 0 CRITICAL, 22 WARNINGs alle gefixt + geverifieerd (details in task-Notes). ⚠️ Rollout: handmatige Neon `prisma db push` vóór deploy-verkeer.

- Task: [tasks/done/agents-foundation.md](../tasks/done/agents-foundation.md)
- ADR: [adr/2026-07-05-agents-architectuur.md](adr/2026-07-05-agents-architectuur.md) (+ aanvullingen 2026-07-06)
- Spec: [reports/agents-diepte-analyse-en-plan-2026-07-05.md](reports/agents-diepte-analyse-en-plan-2026-07-05.md)
- Commit: (deze commit — branch `feat/agents-foundation`)

### 358. Stripe billing — live-correctness hardening

Een audit toonde dat de Stripe-subscription-lifecycle al code-compleet + gewired was (checkout → webhook met HMAC + idempotency → DB-sync → `planTier` → enforcement, customer-portal, invoice-sync, live `BillingTab`) — de stale task-file (2026-05-07) beschreef een from-scratch-bouw die er niet meer was. Deze werkstroom dichtte de resterende **code-bugs + revenue-gaten** zodat de bestaande billing live-correct is:

- **S1 (revenue/security)**: verwijderd de dode DB-only `change-plan`/`cancel`-routes + orphaned `BillingSettingsPage` (0 imports) die een subscription op `ACTIVE` zetten **zónder betaling** (gratis-upgrade-exploit) — plan-wijzigingen lopen uitsluitend via Stripe Checkout/Portal. En de one-time-aankopen gewired: nieuwe `payment_intent.succeeded`-webhook-case → `handlePurchaseSuccess` (had geen caller) → `BundlePurchase` PAID + unlock (anders: kaart charget, unlock nooit).
- **S2 (customer-facing bugs)**: factuur-`/100`-dubbeldeling weg (€29 toonde als €0.29); yearly-checkout charget niet langer de maandprijs — `getPriceIdForTier(tier, cycle)` + `STRIPE_PRICE_*_YEARLY`, met fail-safe (400 als de yearly-price ontbreekt i.p.v. stil de maandprijs).
- **S3 (launch-safety)**: AI-usage-meter toont echte data (`getUsageThisMonth`) i.p.v. hardcoded `142`; env-validatie fail-fast wanneer `NEXT_PUBLIC_BILLING_ENABLED=true` maar keys/prices ontbreken.
- **S4**: [`docs/playbooks/stripe-go-live.md`](playbooks/stripe-go-live.md) — de human Stripe-dashboard-stappen (account/products/prices/keys/webhook-events/portal/`BILLING_ENABLED`).

Launch-pricing = vaste maandprijs → metered-overage/usage-metering/trial + PaymentMethod-sync blijven per-token-fase (uit scope). Gates per stap: tsc 0 / lint 0. Gewerkt in worktree `branddock-launch` (branch `feat/stripe-billing-hardening`).

- Task: [tasks/stripe-billing-live.md](../tasks/stripe-billing-live.md) (code-portie done; dashboard-config = human, zie playbook)
- Commit: branch `feat/stripe-billing-hardening` (S1-S4)

### 357. vercel-deployment — LIVE op Vercel + serverless-hardening geconsolideerd (Track C)

De **hard launch-blocker is opgelost**: de app draait live op Vercel (`branddock-7y9n.vercel.app` · Pro + Fluid Compute · fra1), production-branch `main`. Geverifieerd: signup/auth (Better Auth) + Neon Postgres (pgvector + 3 HNSW-indexen) + AI (3 providers) + Cloudflare R2 uploads. De verkenning weerlegde "pure infra, 3 dagen": onder de infra zat een serverless-compatibiliteitslaag die kern-flows brak op Vercel. Geleverd (PR #76, merge `5e642ded`, bovenop i18n Fase 1-3):

- **Serverless-hardening (Fase 2)**: A2 — 3 upload-routes + media-fetch/logo-overlay via `getStorageProvider()` (R2 in prod, fail-closed); A4 — brandstyle/LP-screenshots via in-process `@sparticuz/chromium` + `playwright-core` i.p.v. tsx-child-process/`import('playwright')`; A1 — fire-and-forget onboarding-pipelines naar de `AgentJob`-queue (11 routes: brandstyle url+pdf, DAM auto-tag, bug-reports, chat-feedback, alignment-scan, trend-research); A3 — expliciete `maxDuration` op SSE/streaming-routes; A5 — cache bewust per-instance gedocumenteerd.
- **Deploy-config-fixes (Fase 1)**: `prisma generate && next build` (Vercel-buildfix), playwright-core dedupe (1.60.0 override), R2 env-naam-unificatie (`R2_BUCKET_NAME`/`R2_PUBLIC_URL`), Node-22-pin, Better Auth `trustedOrigins`.
- **Fase 3 Neon**: pooltuning (`pg.Pool` max serverless-cap) + `scripts/prod/create-vector-indexes.ts` (HNSW cosine op 3 vector-kolommen) + `prisma db push`.
- **Fase 4 CI/CD**: e2e critical-flow job + branch-protection op `main` (required `check`).

**Resterende follow-ups (op main, niet-blokkerend)**: A1 Tier 3 (website-scanner + brandvoice: in-memory Map → DB-progress, `tasks/serverless-hardening-jobs.md`), A3-deel-2 (SEO 8-staps-pipeline decompose), custom domein (nu `.vercel.app`), Stripe billing, marketing-site, pilot-onboarding. De e2e-CI-job is flaky + niet-verplicht (ving wél een echte i18n-gap: onboarding-skip-knop toont rúw `onboarding.skipTour`).

**Gotcha vastgelegd**: het prod-Neon-schema wordt via `prisma db push` beheerd, NIET door de Vercel-build — na elke schema-wijziging handmatig db-pushen naar Neon (anders 500't de deployed code op een onbekende enum/kolom).

- Task: [tasks/vercel-deployment.md](../tasks/vercel-deployment.md) + [tasks/serverless-hardening-jobs.md](../tasks/serverless-hardening-jobs.md)
- Plan: `snug-popping-tulip.md`
- Commit: PR #76 (`5e642ded`) — merge van `track/launch` (13 commits) in `main`

### 356. Meertaligheid Fase 1-3 — launch-ready afgerond (docs + status)

Afronding van het meertaligheid-programma tot een **launch-ready** staat, zodat `vercel-deployment` niet langer op i18n wacht. Fase 1-3 (`i18n-ui-foundation` + `content-locale-foundation` + `content-locale-target-picker`) zijn alle **done + gemerged op `main`** (#65/#68/#70/#71/#73/#74): en↔nl is live door de hele app en de twee-selector-visie (Display-language per gebruiker + Content-/Output-language per workspace/generatie) is compleet. Volledige gate-suite groen op main (tsc 0 / lint 0 / separation 3/3 / content-locale-foundation-smoke 46/46 / target-picker-smoke 8/8 / build). Deze commit: `i18n-ui-foundation` → done, roadmap §🌍 + START_HERE bijgewerkt naar launch-ready, alle open items expliciet **post-launch** geparkeerd.

**Post-launch (niet-blokkerend)**: `i18n-ai-translation-pipeline` (automatische AI-vertaal-engine voor onderhoud + de/es/fr — nu is en/nl geseed door de extractie-waves), de deferred Fase-3-follow-ups (F-VAL scoort nog tegen de workspace-default-pack i.p.v. de target-pack + de campagne-bulk-generatie-UI-picker), en Fase 4-5 (`multi-market-transcreation-enterprise`). Bewust Engels gelaten: puck-config (SSR-safe), canvas-previews, PDF-export, dode/demo-code.

- Task: [tasks/i18n-ui-foundation.md](../tasks/i18n-ui-foundation.md) (+ content-locale-foundation/target-picker → done)
- ADR: [adr/2026-06-28-multilingual-i18n-and-multi-market-content.md](adr/2026-06-28-multilingual-i18n-and-multi-market-content.md)
- Commit: (deze docs-commit)

### 355. Content-locale Fase 2 — per-generatie target-locale picker (direct bruikbaar)

Vervolg op #354: een operator kan nu **één deliverable in een gekozen taal laten genereren**. De Canvas-generatie-UI (Step1Context) heeft een **Output-language-picker** (default = workspace-standaard) die de geshipte talen biedt; kies je een taal zonder profiel → server-side **find-or-create** een niet-default `BrandLocaleProfile` (`resolveTargetProfile`, idempotent op `@@unique([workspaceId, locale])`). `targetLanguage` threadt door de bestaande pipeline (`orchestrate`/`bulk-generate` zod → `orchestrateContentGeneration` options → `assembleCanvasContext(…, localeProfileId)` → `getBrandContext(ws, profileId)`) en wordt gepersisteerd op `Deliverable.localeProfileId` (her-genereren behoudt de taal). **Default-pad ongewijzigd** (geen keuze → default-profiel-loos pad, byte-identiek). Daarnaast volgen de **4 analyze-routes** (products url/pdf, competitors url/refresh) nu de workspace-content-taal (`getContentOutputLanguage`) i.p.v. de browser-`Accept-Language` van de operator — **bewuste gedragswijziging** (UI-taal-lek gedicht). Client-safe `shipped-languages.ts` (geen prisma) als gedeelde talenlijst. Smoke `content-locale-target-picker.ts` 8/8. Gates per fase: tsc 0 / lint 0 / separation 3/3 / build.

**Follow-ups** (bewust uitgesteld): F-VAL scoort nog tegen de workspace-default heuristics-pack i.p.v. de target-pack (de threading zit tangled buiten het hoofd-`runFidelityScoring`-pad — de content genereert al correct in de doeltaal, alleen de score-pack verschilt); een taal-picker in de campagne-bulk-generatie-UI (de `bulkGenerateSSE`-plumbing accepteert al `targetLanguage`).

- Task: [tasks/content-locale-target-picker.md](../tasks/content-locale-target-picker.md)
- ADR: [adr/2026-06-28-multilingual-i18n-and-multi-market-content.md](adr/2026-06-28-multilingual-i18n-and-multi-market-content.md) (analyze-route-gedragswijziging genoteerd)
- Commit: 8dc13164 (P1+P2) · 548bd3ca (P4) · 69f848b7 (P5) · (P6 deze commit)

### 354. Content-locale foundation — content-taal-selector + multi-markt-datamodel (Approach C)

De tweede taal-as van het meertaligheid-programma: de **content-taal** (waarin de AI schrijft, per workspace), naast de al gelande UI-taal-as. Niet-brekend + forward-compatible multi-markt-fundament (ADR 2026-06-28). **Fase A+C**: additief schema — `Brand` (1:1 workspace) + `BrandLocaleProfile` (`@@unique([workspaceId, locale])`, gereserveerde JSON-deltas), nullable `localeProfileId` op `Deliverable`/`Persona`, `LandingPage` +`locale`+`localeProfileId` met unique-flip `[workspaceId,slug]` → `[workspaceId,locale,slug]` (compound-key-code in `publish-page.ts`/`p/[slug]`); backfill-script (17 workspaces → 17 default-profielen, 0 orphans) + seed-update. **Fase B**: `getBrandContext(workspaceId, localeProfileId?)` + cache-key `${workspaceId}:${localeProfileId ?? 'default'}` + `invalidateBrandContext` wist alle varianten; `resolveLocaleForBrand(workspaceId, requestedLocale?)`. Default-pad **byte-identiek** (geverifieerd tegen 17-workspace baseline); alleen een expliciet gekozen profiel (Fase 2) wint. **Fase D**: live Content-language-control in WorkspacesTab (per-workspace + create-form, onderscheiden van de Display-language), POST maakt Brand+profiel, PATCH synct profiel + mirror + invalideert de brand-context-cache (fixt een bestaande stale-cache-bug). Elke fase gate-groen (tsc 0 / lint 0 / separation 3/3 / build). Smoke `content-locale-foundation.ts` 46/46.

- Task: [tasks/content-locale-foundation.md](../tasks/content-locale-foundation.md)
- ADR: [adr/2026-06-28-multilingual-i18n-and-multi-market-content.md](adr/2026-06-28-multilingual-i18n-and-multi-market-content.md)
- Spec: -
- Commit: 1b8fc776 (A+C) · 787c39e0 (B) · 67fb8b71 (D) · (E deze commit)
- Vervolg: `content-locale-target-picker` (per-generatie target-locale + analyze-route-lekken, Fase 2)

### 353. Meertaligheid remediation — data-gedreven registries + gemiste clusters (5 waves)

Na #352 bleek bij het switchen naar nl nog veel Engels. Een multi-agent audit vond twee structurele oorzaken die de JSXText-extractie van #352 niet kón raken: **(A) data-gedreven constant-registries** (namen/titels uit `src/*/lib/*` + `src/lib/` + `src/config/`, gerenderd via `{item.name}`) en **(B) gemiste `src/components/*`-clusters** (de extractie-waves liepen op `src/features/*`). Opgelost met het **render-edge-patroon** (constant blijft en-bron + stabiele key; render via `t('ns:key', { defaultValue })`) + migratie van de gemiste clusters, in 5 waves:
- **Wave 1** — campagne-generator-registries: stepper (`wizard-steps`), campagnedoelen (`goal-types`), pipeline-config, `content-type-inputs` (726 keys), deliverable/content-item-namen.
- **Wave 2** — hele Brand Foundation-pagina (`src/components/brand-foundation` + `brand-assets` + `asset-content`) + `canonical-brand-assets` op stabiele slug (vertaalde namen vloeien nooit naar de DB terug).
- **Wave 3** — gedeelde AI-exploration-chat (dekt brand-asset + persona) + 17 merk-DNA-registry-groepen (234 keys).
- **Wave 4** — resterende live-pagina's (StrategicResearchPlanner, TeamManagement, ResearchDashboard, NewStrategyPage, ResearchValidationPage) + shared/lock/billing/versioning/impact-primitieven + brandstyle review-sections + auth-chrome.
- **Wave 5** — long-tail-registries met **liveness-verificatie** vooraf: products/media/consistent-models/trends-personas/claw-content render-edged (~328 keys); research-bundles/strategy-tools/business-strategy correct geskipt (DB-backed/dood/enum).

Bewust Engels (geverifieerd, geen bug): AI-gegenereerde/user-editable merk-content, AI-prompt-strings, enum/icon/Tailwind-class/MIME-identifiers, `.toFixed`-bedragen, dode/demo-code, PDF-export (aparte track). Runtime browser-smoke: cookie `branddock-ui-locale=nl` → loginscherm + `<html lang>` volledig Nederlands. Elke wave per-commit gate-groen (tsc 0 / lint 0 / separation-smoke 3/3 / build groen).

- Task: [tasks/i18n-ui-foundation.md](../tasks/i18n-ui-foundation.md)
- ADR: [adr/2026-06-28-multilingual-i18n-and-multi-market-content.md](adr/2026-06-28-multilingual-i18n-and-multi-market-content.md)
- Spec: -
- PR: #70 (waves 1-4, gemerged) + Wave 5 (`feat/i18n-wave5-longtail`)
- Commit: 4fd49c44 + 9889d73b + 239ab790 + f082554e + 1259d798 (via #70) · 0cd3d4c4 (wave 5)

### 352. Meertaligheid Fase 1 follow-ups — chrome afgemaakt + feature-extractie (4 waves) + toLocale-sweep

Vervolg op #351: de UI is nu grotendeels meertalig (en↔nl). **Chrome afgemaakt**: `SIDEBAR_NAV` item/section-labels render-edge via `t()`, `AuthPage` → `common:auth`, en `src/lib/ui-i18n/format.ts` (`useFormat()` — `Intl` + date-fns gebonden aan `i18n.language`). **Runtime**: lazy feature-namespaces via `i18next-resources-to-backend` (chrome blijft statisch). **Feature-extractie in 4 AI-gedreven Workflow-waves** (~35 namespaces; de extractie-agents genereerden en+nl direct): dashboard, campaigns (canvas/wizard/content-library/overview/core + canvas-medium/accordion/page), brandstyle, brand-asset-detail, media-library, business-strategy, competitors, personas, products, trend-radar, settings (account/team/billing/admin/misc), consistent-models, workshop, research, help, knowledge-library, claw, brandvoice, interviews, brand-alignment, website-scanner, commercial, white-label. Tot slot een **toLocale-sweep** (~130 datum/getal-sites → `useFormat`). Elke wave per-commit gate-groen (tsc 0 / lint 0 / separation-smoke 3/3 / build groen).

Bewust Engels gelaten (gedocumenteerd, geen bug): `puck-config.tsx` (server-safe, `useTranslation` zou de `/p/[slug]`-SSR breken — de renderToStaticMarkup-gotcha), `canvas/previews/*` (social-platform mock-chrome, ambigu), losse top-level `src/components/*.tsx`, `ai-studio`/`ai-trainer`-shells, `.ts` lib/services-formattering + `.toFixed`-bedragen. De ESLint-guard-allowlist is bewust niet verbreed (migrated files houden opzettelijk-gelaten enum/data-strings; verbreden zou false-positives geven).

- Task: [tasks/i18n-ui-foundation.md](../tasks/i18n-ui-foundation.md) (in-progress — follow-ups)
- ADR: [adr/2026-06-28-multilingual-i18n-and-multi-market-content.md](adr/2026-06-28-multilingual-i18n-and-multi-market-content.md)
- Spec: -
- Commit: 96938871 + 23e5ad38 + 9b6ced14 + 81420d63 + 2c944ca3 + a4491867 + 34cf8111

## 2026-06

### 351. Meertaligheid Fase 1 — i18next UI-runtime + Display-language selector (per gebruiker)

Eerste increment van het meertaligheid-programma (ADR 2026-06-28): een client-side **i18next**-runtime voor de UI-taal die de gebruiker *leest*, strikt gescheiden van de content-locale (de taal waarin de AI *schrijft*). De provider wordt in `layout.tsx` gemount — de server leest de `branddock-ui-locale`-cookie via `next/headers cookies()` en geeft `initialLocale` door aan een client-`I18nProvider` (één instance per request via `useState`-lazy-init, geen singleton-bleed), zodat `<html lang>` en de eerste paint geen hydration-flash geven. Een nieuwe **Display-language**-selector (`AppearanceTab`, vervangt de "coming soon"-placeholder) schrijft de bestaande per-user `AppearancePreference.language` + cookie + `i18n.changeLanguage`; `LocaleReconciler` reconcilieert na login naar de DB-pref. App-chrome live vertaald (en↔nl): de 9 settings-tab-labels, TopNav (Quick Content / Brand Assistant / Search / Notifications) en de sidebar (Settings / Help & Support). Getypeerde keys (`react-i18next.d.ts`, geen `any`), zod `/api/settings/appearance` verstrakt naar `z.enum(SHIPPED_LOCALES)` + read-time-normalisatie, en de verweesde `AppearanceSettingsPage.tsx` verwijderd. Een **scoped ESLint-guard** verbiedt nieuwe hardcoded strings in gemigreerde files (allowlist die meegroeit), en een separation-smoke bewijst dat `src/lib/ai/**` de UI-locale-laag nooit aanraakt.

**Finalize review-loop** — 2 ronden 2-subagent parallel review: ronde 1 → 0 CRITICAL, 3 WARNING gefixt (React 19 ref-during-render → `useState`-lazy-init; enum-divergentie → dode orphan verwijderd; loading-state); ronde 2 → 0 CRITICAL, 1 WARNING gefixt (read-time-locale-normalisatie in de GET-route). MINORs (tKey-union-typing, query-error-state, doneRef cross-user-edge) gedocumenteerd als follow-up.

**Quality gates**: tsc 0 errors, lint 0 errors (incl. de nieuwe guard, bewezen via probe), separation-smoke 3/3, build groen.

**Bewust uitgesteld** (increment 1 van een meervoudige task): de data-driven `SIDEBAR_NAV`-labels, `AuthPage`, per-pagina `PageHeader`-titels, `format.ts` + de ~171 `toLocale*`-datum/getal-sites, de feature-namespace-extractie, en de automatische AI-vertaalpipeline (nl-chrome is hand-geseed om de live-switch te bewijzen).

- Task: [tasks/i18n-ui-foundation.md](../tasks/i18n-ui-foundation.md) (in-progress — increment 1)
- ADR: [adr/2026-06-28-multilingual-i18n-and-multi-market-content.md](adr/2026-06-28-multilingual-i18n-and-multi-market-content.md)
- Spec: -
- Commit: `6dff2424`

### 350. Security — SSRF-convergentie: laatste raw-fetch-paden → safeFetch + rate-limit + byte-cap

Restscope van H1 (na #349). Sluit élk resterend server-side fetch-pad dat nog op het oude patroon zat (`fetch` + post-hoc `assertSafeRedirect`, soms zonder entry-validatie). `fetchWithSizeLimit` (`security/fetch-with-limit.ts`, 16 AI-artifact-callers) loopt nu via `safeFetch`; daarnaast in code-review nog 3 raw-fetch-routes ontdekt en geconverteerd: `media/import-url` (entry-probe), `media/stock/import` (user-URL die **geen enkele** SSRF-validatie had) en `export/proxy-image` (allowlisted). Het dode `assertSafeRedirect` is verwijderd. `safeFetch` kreeg fetch-spec-conforme method-handling (303 + 301/302-op-non-GET → bodyless GET; 307/308 behoudt method+body). Drie ongelimiteerde scrape-routes (`website-scanner`/`claw/scrape`/`briefing-sources/parse-url`) kregen `checkGenericRateLimit` (429 + Retry-After). `products/url-scraper` leest de body nu via `readBodyWithCap` (10MB stream-cap, OOM-defense). Ge-finalized via 3-ronde 2-subagent review (eindoordeel ready-to-merge, 0 CRITICAL/0 WARNING; charset-"regressie" weerlegd als false-positive — `Response.text()` is spec-matig óók UTF-8-only). Smoke `ssrf-guard.ts` 65/65, tsc 0, lint 0, build groen (echte node_modules + prisma + env in de worktree). H1 is hiermee volledig afgehecht.

- Task: [tasks/security-residual-hardening.md](../tasks/security-residual-hardening.md) (SSRF-blok afgevinkt; L4/L6/L9 + Zod-sweep blijven open)
- ADR: -
- Spec: [docs/audits/2026-06-26-security-audit.md](audits/2026-06-26-security-audit.md)
- Commit: ba0ff9b5 (PR #64)

### 349. Security — SSRF: safeFetch per-hop redirect-revalidatie in alle scrapers (H1 punt 1)

Sluitstuk van H1 (na de kern-hardening in `6f0875e4`). De scrapers volgden redirects met `redirect:'follow'` + een post-hoc `assertSafeRedirect`: het redirect-*request* vuurde nog vóór validatie tegen de interne target (blind-SSRF-venster op de redirect-hop). Nieuwe `safeFetch()` in `ssrf.ts` forceert `redirect:'manual'` en revalideert élke hop met `assertSafeUrl` (scheme + DNS-resolve-en-verifieer) vóór de connectie, plus credential-header-stripping (Authorization/Cookie) zodra een redirect de origin verlaat. Gewired op alle 7 scraper-fetches (products/url-scraper x2, brandstyle/url-scraper HTML+CSS, logo-color-extractor, multi-page-scraper, competitors/fetch-policy, media/import-scraped-image); redundante pre/post-checks verwijderd. Ge-finalized via 2-subagent review (beide ready-to-merge; reviewer-WARNING over cross-origin credential-leak meteen meegnomen) in een geïsoleerde git-worktree, omdat een parallelle i18n-sessie de hoofd-working-tree bezet hield. Smoke `ssrf-guard.ts` 62/62 (+8 safeFetch-tests: redirect→IMDS geblokkeerd vóór connectie, public-redirect gevolgd, opaque fail-closed, loop-cap, credential-strip cross/same-origin), tsc 0, lint 0, build groen. Restscope (`fetch-with-limit.ts`-conversie, rate-limit/byte-cap, 307/308-body) → `security-residual-hardening`.

- Task: [tasks/done/security-h1-ssrf-guard.md](../tasks/done/security-h1-ssrf-guard.md)
- ADR: -
- Spec: [docs/audits/2026-06-26-security-audit.md](audits/2026-06-26-security-audit.md)
- Commit: <hash> (PR #TBD)

### 348. Security — MEDIUM/LOW-cluster: RBAC-gaten + prototype-pollution + crypto/header hardening

Sluitstuk van de pre-launch security-audit (na #345/#346/#347). **RBAC**: invite-routes valideren `role` tegen een enum en laten alléén een owner een `owner` inviten — beide live routes gepatcht (`/api/organization/invite` + de échte UI-route `/api/settings/team/invite`, die `role: z.string()` verbatim opsloeg → admin→owner-escalatie via de accept-route; gevonden in review-ronde 1). `/api/workspace/export` en Claw `confirm` achter `requireWorkspaceRole` (viewer kon de hele workspace + interviewee-PII exfiltreren, resp. muteren via de agent). **Prototype-pollution**: `deepSet` weigert `__proto__`/`constructor`/`prototype`-segmenten (raakt het LLM-gevoede `update_asset_framework`-pad). **Hardening**: CSP-header (`frame-ancestors`/`object-src`/`base-uri`/`form-action`) in `proxy.ts`, GCM `authTagLength` op beide `createDecipheriv`, en `timingSafeEqual` op het webhook-Bearer-secret. Ge-finalized via 2-ronde 2-subagent review-loop; ronde-2 "CRITICAL" (native Better Auth `invite-member`) bleek een geverifieerde false-positive (library-guard crud-invites.mjs:123 blokkeert admin→owner al). Smoke `security-medium.ts` 7/7, tsc 0, lint 0, build groen. Restscope (L4/L6/L9 + Zod-sweep) gedocumenteerd.

- Task: [tasks/done/security-medium-cluster.md](../tasks/done/security-medium-cluster.md)
- ADR: -
- Spec: [docs/audits/2026-06-26-security-audit.md](audits/2026-06-26-security-audit.md)
- Commit: eba365a1 (PR #61)

### 347. Security — billing-integriteit: server-side purchase-prijs + plan-entitlement (H3 + M5)

Opvolg op #345/#346. **H3**: de one-time-purchase-route leidde de prijs uit een client-`amount` af (→ €0,50 voor een €99-bundle, of `amount:0` voor een gratis tool-unlock). `createPaymentIntent` accepteert geen prijs meer; nieuwe `resolveItemPrice()` haalt 'm server-side uit `ResearchBundle.price` (catalogus) resp. `Workshop.totalPrice` (workspace-scoped); onbekend/cross-workspace/null → fail-closed reject. **M5**: plan-entitlement werd alleen in de UI afgedwongen (`enforceFeature` had 0 call-sites). Nieuwe `enforcePlanLimit(ws, feature)`-helper (402 bij over-limiet, no-op zolang `BILLING_ENABLED=false`) gewired op de 4 hoofd-create-routes (personas/products/campaigns/knowledge-resources). Ge-finalized via 2-subagent review-loop (0 CRITICAL/0 WARNING round 1); smoke `plan-enforcement.ts` 6/6, tsc 0, lint 0, build groen. Restscope (overige create-paden, org/usage-limieten, TOCTOU-hard-cap, dormant-route + live workshop/research-purchase-routes) gedocumenteerd vóór billing-livegang.

- Task: [tasks/done/security-h3-purchase-entitlement.md](../tasks/done/security-h3-purchase-entitlement.md)
- ADR: -
- Spec: [docs/audits/2026-06-26-security-audit.md](audits/2026-06-26-security-audit.md)
- Commit: e00d7238 (PR #60)

### 346. Security — Claw-context fencen tegen indirecte prompt-injectie (H7)

Opvolg op #345 (OWASP Top 10 for LLM). De Claw-agent (de component mét write-tools) kreeg untrusted content rauw in z'n prompt; nu wordt élk attacker-controllable kanaal door `fenceUntrustedContent()` gehaald: (1) system-prompt-context (attachments, scraped competitor, trends, knowledge), (2) message-kanaal-attachments (`buildClaudeMessages`), (3) hoog-risico tool-results (`UNTRUSTED_RESULT_TOOLS`: review_content/read_landing_page_content/read_competitors/read_trends/read_knowledge/review_competitor_activities). Plus system-prompt-clausules (untrusted_content + tool-results zijn data, nooit instructies; geen interne tool-namen/laag-labels/award-jargon in output) en `navigate_to_page.section` `z.string()`→`z.enum` (L5). De fence stript geneste tags + escapet het `source`-attribuut (attacker-controllable filename). Ge-finalized via 4-ronde 2-subagent review-loop (0 CRITICAL/0 WARNING); smoke `claw-fencing.ts` 11/11, tsc 0, lint 0, build groen. Write-`execute`-tenant-scoping (al solide) ongemoeid.

- Task: [tasks/done/security-h7-claw-context-fencing.md](../tasks/done/security-h7-claw-context-fencing.md)
- ADR: -
- Spec: [docs/audits/2026-06-26-security-audit.md](audits/2026-06-26-security-audit.md)
- Commit: 30779ecd (PR #59)

### 345. Security-audit pre-launch — dep-patches + remediatie HIGH-findings

OWASP-ASVS-L2-audit (Fase 0-2: dep-scan + git-history-secrets + SAST + 6 parallelle handmatige reviewers) gevolgd door remediatie van de chirurgische HIGH-findings, ge-finalized via de 2-subagent review-loop (3 rondes tot 0 CRITICAL/0 WARNING). `npm audit` 10 high → 0 (next 16.1.6→16.2.9 + better-auth/undici/axios/ws/form-data/hono). Code-fixes: H1 SSRF-guard volledig gehard (`isPrivateIp` incl. IPv4-mapped hex + NAT64 + IPv4-compatible, async DNS-resolve-en-verifieer in `assertSafeUrl`/`assertSafeRedirect`, alle scrapers ge-await'd + post-redirect-revalidatie + playwright navigatie-interceptie; smoke 54/54); H2 JSON-LD stored-XSS escape op `/p/[slug]`; H4/H5 billing-RBAC + IDOR via nieuwe `requireWorkspaceRole` (rol-check op de org van de geresolvede workspace); H6 3 ongeauth LP-AI-routes achter `withAi`; H8 strategy-child-IDOR-scoping (5 routes). Uitgesteld als task-files: H1-residu (rate-limits), H3 purchase-prijs/entitlement, H7 Claw-context-fencing, MEDIUM-cluster.

- Task: `tasks/security-h1-ssrf-guard.md` (+ h3/h7/medium-cluster) — multi-task
- ADR: -
- Spec: [docs/audits/2026-06-26-security-audit.md](audits/2026-06-26-security-audit.md)
- Commit: 3062a142 (PR #58)

### 344. Brandstyle kalibratie-paneel — geconsolideerde "wat heb ik nodig"-asks

Eén surface bovenaan de Brand Styleguide die verspreide extractie-kwaliteitssignalen bundelt tot actiegerichte asks met severity (critical/suggestion/review) en deep-links naar de juiste tab. Pure functie `buildBrandstyleCalibrationReport` (`src/lib/brandstyle/calibration-report.ts`, geen server-imports) detecteert: ontbrekend primair logo (critical), ontbrekende donker/licht-variant (suggestion), expliciet low-confidence kleuren (review), gedetecteerde fonts zonder laadbaar bestand (suggestion), lege type-scale (review) en AI-only RECOMMENDED-richtlijnen (review). Het `BrandstyleCalibrationPanel` berekent het rapport client-side uit de reeds-geladen styleguide (geen extra fetch/route) en is gegate op `status === "COMPLETE"`. Komt uit lesson L6 van de brandstyle ↔ design-system-builder-vergelijking. Bevat ook een Prisma-7.4-fix in de e2e `global-setup` (`db push --skip-generate` → `--accept-data-loss`) die de hele e2e-suite deblokkeert, plus een seed-kleur op `confidence: "low"` voor een deterministische Playwright-smoke. Verificatie: 2-ronde finalize-review clean (0 CRITICAL/WARNING), tsc 0, lint 0, Playwright-smoke groen (paneel rendert + deep-link schakelt naar Colors-tab).

- Task: [tasks/done/brandstyle-calibration-report.md](../tasks/done/brandstyle-calibration-report.md)
- ADR: -
- Spec: -
- Commit: `9c8eff75`

### 343. GEO stats citeren de echte knowledge-bron (i.p.v. genullde labels)

Vervolg op de stat-citatie-leak: na de sanitizer renderden GEO-stats label-only omdat het model de échte knowledge-bron niet citeerde. Live-harness toonde de bindende constraint: user-geselecteerde knowledge-resources defaulten naar `reference` (7000-char-cap), waardoor de referenties/URLs (achteraan een research-rapport) worden afgekapt en het model ze nooit ziet. Fix: nieuwe `geo-knowledge-context.ts` forceert de eerste ≤3 knowledge-resources (dedup, bron-type-bewust) op `primary` (16k-cap → volledige bron incl. URLs bereikt het model) en prepend een expliciet "## CITEERBARE BRONNEN"-blok (titel + url als schone citeer-handle). De `generate-structured-variant`-route gebruikt dit gated op `LONG_FORM_SEO_TYPES`; de GEO-prompt citeert `citeableStats[].source` uitsluitend uit die lijst (null voor first-party / geen match; geen fabricage; geen interne labels). Live-AI-harness op de Napking-pagina + Deep Research-rapport: additionalContextText 7k→16k incl. URLs, 1/4 citeableStats kreeg een echte bron + `sources[]` met een echte externe URL (superlinen.com); first-party "280+" bleef null. 5-ronde finalize-review clean (0 CRITICAL/WARNING); tsc 0, lint 0. Bekende grens: bronnen >16k kunnen body-URLs afkappen — de title/url-handle blijft dan de citeer-fallback.

- Task: [tasks/done/geo-citation-real-sources.md](../tasks/done/geo-citation-real-sources.md)
- ADR: -
- Spec: [docs/specs/2026-06-17-geo-seo-longform-plan.md](specs/2026-06-17-geo-seo-longform-plan.md)
- Commit: `cb765045`

### 342. LP/GEO render quick-wins — variant-picker, TL;DR-kop NL, heading-fontgroottes gelijkgetrokken

Drie kleine render-/UX-fixes uit de Napking-pagina-review. (1) **Variant-picker**: "Choose a different variant" was gegate op `> 1` en dus verborgen bij een partial generation (1 geleverde variant), waardoor de gebruiker vastzat in de "Variant chosen"-state; gate → `>= 1` (`LandingPageGenerateBlock`, commit `7b3e795b`). (2) **GEO long-form TL;DR-kop**: de hardcoded Engelse "TL;DR" → "Samenvatting", consistent met de overige NL-koppen ("Op een rij"/"Veelgestelde vragen"/"Bronnen") (commit `bd138b9d`). (3) **Heading-fontgroottes**: de RichText-`##`-sectiekop viel terug op een platte 26px terwijl de dedicated component-koppen (FAQ/Listicle/ComparisonTable) de archetype-schaal `heading.sizes[len-2]` (28-56px, preset-afhankelijk) gebruikten — bij fallback-token-merken (zoals Napking, PLAYFUL) gaf dat een zichtbaar groot verschil. De RichText-h2-fallback gebruikt nu dezelfde preset-bewuste expressie → identiek by construction; scraped-token-merken blijven byte-identiek (alleen het fallback-pad gelijkgetrokken). Verificatie: tsc/lint groen + expression-parity bevestigd (h2 == component-kop). Open follow-up: volledige locale-awareness van de section-labels (vereist locale-doorvoer naar de template).

- Task: [tasks/done/lp-variant-picker-single-option.md](../tasks/done/lp-variant-picker-single-option.md), [tasks/done/geo-longform-heading-render-polish.md](../tasks/done/geo-longform-heading-render-polish.md)
- ADR: -
- Spec: [docs/specs/2026-06-17-geo-seo-longform-plan.md](specs/2026-06-17-geo-seo-longform-plan.md)
- Commit: `19272398`

### 341. "Model offline"-melding wanneer genereren niet mogelijk is

Wanneer een AI-provider onbereikbaar is (503/overloaded, 429 rate-limit, 401/ontbrekende API-key, netwerk of timeout) en genereren daardoor onmogelijk is, toont de UI nu een onderscheidende "model offline"-melding (rood inline-blok met "Try again" + sonner-toast) i.p.v. een generieke fout. Eén gedeeld error-contract is additief toegevoegd aan `error-handler.ts` (`isModelUnavailable` + `buildAiErrorPayload`/`buildAiErrorResponseInit`/`buildAiErrorEvent`) en gepropageerd over de SSE-routes (orchestrate, bulk-generate, auto-iterate, persona-chat, seo-pipeline) én de non-SSE AI-routes; content-/validatie-gates (lege brief, woordtelling, truncation) blijven bewust generiek. Client-side classificeert de nieuwe `ai-error-client.ts` (`interpretAiError`/`notifyAiError`/`errorFromResponse`) en rendert `ModelUnavailableNotice`, gewired in Canvas (store + orchestration-hook), persona-chat, beeld-/LP-/foto-generatie en bulk. AbortError blijft silent; de SSE stuck-state-guard is ongemoeid. Geverifieerd: classificatie-smoke 11/11 + live SDK-smoke (echte Anthropic/OpenAI 401 → unavailable); 2-subagent finalize-review (0 CRITICAL; claw-regressie gefixt door de rauwe message te behouden voor InputBar's credit/auth-detectie). Bekende, gedocumenteerde beperking: brede catches in de image/visual/competitors-routes kunnen een zeldzame storage/DB-uitval als "model offline" labelen (zelfde retry-actie).

- Task: [tasks/done/model-offline-notice.md](../tasks/done/model-offline-notice.md)
- ADR: -
- Spec: -
- Commit: `b759e64c`

### 340. GEO stat-citatie leak — interne context-laagnamen niet langer als bron

Een gegenereerde GEO long-form-pagina toonde interne context-laagnamen als citatie-bron in de stats-band ("Napking briefing: evidence pieces, 2024", "brand-context: delivery evidence") — dezelfde leak-klasse als de Effie-rubric (gotcha 2026-05-17). Data-laag-curatie (een echte knowledge-bron toevoegen) bleek onvoldoende: het model citeert de context-lagen zélf. Vier verdedigingslagen: `geoStatSchema.source` van verplicht → nullable/optional (de geforceerde bron was de directe oorzaak dat het model er een verzon); prompt-guard die een echte externe bron eist óf weglaten toestaat en interne laagnamen verbiedt; nieuwe `sanitize-geo-sources.ts` (`cleanStatSource` denylist + `sanitizeLongFormGeoVariant`) gewired op het parse-return-punt zodat de opgeslagen variant schoon is; en `cleanStatSource` als render-/scoring-vangnet in de Puck-template, `geo-analysis` en `flatten-variant` (heelt ook reeds-opgeslagen pre-fix varianten bij rebuild). Stats zonder echte externe bron renderen label-only. Live-AI E2E geverifieerd op een Napking-artikel (sources → null, geen leak in `structuredVariant` + `puckData`); 3-ronde finalize-review clean (0 CRITICAL/WARNING), sanitizer-smoke 15/15.

- Task: [tasks/done/geo-stat-citation-source-leak.md](../tasks/done/geo-stat-citation-source-leak.md)
- ADR: -
- Spec: [docs/specs/2026-06-17-geo-seo-longform-plan.md](specs/2026-06-17-geo-seo-longform-plan.md)
- Commit: `2f78eec3`

### 339. LP smoke-bugs Step 2 + Step 3 ge-finalized (render-verificatie)

Twee post-smoke-test bugfix-tasks (branch `fix/lp-smoke-bugs`, code reeds in main via de web-page-builder squash-merges) formeel afgerond na de openstaande browser-verificatie. Step 3 render-laag live bevestigd op een gepubliceerde Napking landing-page: CTA-affordance-floor (blauwe filled button + radius, geen uppercase/platte-tekst-CTA), Lucide icon-resolutie (geen rauwe icon-namen), quote-cap. Step 2: brand-fit-check media-URL-resolutie (disk-read) + LP auto-iterate op `structuredVariant` + beide-varianten-scoring + page-level 502-guard, gefinalized op merge-bewijs. Mapping-/UI-state-fixes (#7 footer-tagline, #1/#2 hero-image) verschijnen bij nieuwe generatie (niet retroactief op oude puckData).

- Task: [tasks/done/lp-step3-rendering-bugs.md](../tasks/done/lp-step3-rendering-bugs.md), [tasks/done/lp-fidelity-bugfixes-step2.md](../tasks/done/lp-fidelity-bugfixes-step2.md)
- ADR: -
- Spec: -
- Commit: `0327ee6d`

### 338. GEO-meet-paneel in de Canvas — geoOptimizationAnalysis zichtbaar (paneel-only)

Maakt de bij publish gepersisteerde `settings.geoOptimizationAnalysis` zichtbaar in Canvas Step 4: een `GeoOptimizationPanel` toont de GEO-composietscore + zone, de 5 onderliggende signalen (answer-first / atomic chunking / cited-stats / entity-clarity / structurele cues), de geëmitte schema.org-types, een 90-dagen-freshness-badge en de verbeterpunten. Pure view-model in `geo-panel-view.ts` (incl. `isRenderableGeoAnalysis` fail-soft-guard tegen gedrifte JSON); data via een uitgebreide `GET /api/studio/[id]/components` + `useCanvasComponents`. De F-VAL GEO-pijler in de publish-gate blijft **bewust dormant** (geen drempel-impact; activatie = 1-flag-vervolg). Tevens: de meet-haak-persist in `/api/landing-pages/publish` draait nu in een `prisma.$transaction` (read-modify-write-race op `settings` geëlimineerd). Live geverifieerd op een gepubliceerd Napking-artikel (geoScore 77); 3-ronde finalize-review clean (0 CRITICAL/WARNING), geo-panel smoke 25/25.

- Task: [tasks/done/geo-seo-followup-measurement-dashboard.md](../tasks/done/geo-seo-followup-measurement-dashboard.md)
- ADR: -
- Spec: [docs/specs/2026-06-17-geo-seo-longform-plan.md](specs/2026-06-17-geo-seo-longform-plan.md)
- Commit: `9994f381`

### 337. Web-page/GEO-publish markeert het content-item nu als PUBLISHED

De `/api/landing-pages/publish`-keten (GEO/long-form + de 5 PUCK_WEBPAGE_TYPES) maakte alleen de `LandingPage`-snapshot + `/p/[slug]` en liet de eigenaar-Deliverable op DRAFT/APPROVED staan — de pagina ging live maar verscheen nooit in het "online content-items"-overzicht (filtert op `approvalStatus === 'PUBLISHED'`). Bewust opengelaten gap uit GEO/SEO Fase 2 ("Bestanden die ik NIET aanraak"-lijst). Fix: na een geslaagde `publishLandingPage` synct de route de Deliverable (`approvalStatus=PUBLISHED`, `publishedAt`, `status=COMPLETED`, `publishedVia=webpage`, `publishedUrl`) + `invalidateCache(campaigns/dashboard)` (CLAUDE.md-regel #10), fail-soft zodat de al-geslaagde publish niet 500't. Geen backfill — werkt vanaf de eerstvolgende (re)publish.

- Task: - (bugfix <30 min)
- ADR: -
- Spec: -
- Commit: `ce73e8a9`

### 336. GEO/SEO Fase 3 — GEO-prompt-directive, composable seo-geo, F-VAL GEO-pijler, entity-JSON-LD, meet-haak + Claw-edit-gate

Sluit de GEO/SEO long-form-arc af (na #332 fundament + PR #56 render). Vijf increments: (1) canonieke **`buildGeoDirective()`** (answer-first / atomic chunking / cited-stats / entity-clarity / freshness + anti-patterns) als één bron, ingebed in de long-form GEO-generatie-prompt én de polish (geen drift); `LP_VARIANT_PROMPT_VERSION` 2.0.0→2.1.0. (2) **Composable seo-geo**: `runSeoPipeline` kreeg een `optimizationGoals`-param en past bij het seo-geo-profiel op long-form een fail-soft **`runGeoPolish()`** (judge-vrij, stil) toe vóór persist — verfijning op de ADR (interne stage i.p.v. return-naar-orchestrator; lager blast-radius), long-form-only kill-switch, byte-identiek bij seo-only. (3) **F-VAL GEO-pijler** `computeGeoScore()` — deterministisch, judge-vrij, **compute-gated** (draait alleen bij `geoOptimizationActive`; 3-pijler-composite byte-identiek wanneer uit), opt-in gewired in de runner + serializers. (4) **Entity-JSON-LD**: `buildBlogPostingJsonLd` met author Person+sameAs (alléén bij verifieerbare identiteit via nieuw `Workspace.authorProfile` Json + developer-only Settings-tab + `/api/settings/author-profile`), ImageObject, inLanguage, keywords/about/mentions; QAPage bewust niet (UGC-semantiek). (5) **Meet-haak** `settings.geoOptimizationAnalysis` (geoScore + signalen + schema-types + canonical, fail-soft bij publish) + freshness (`dateModified`≠`datePublished`, `isContentStale`-helper 90d). Plus de uit Fase 2 uitgestelde **Claw-edit-gate**: 4 sites `isPuckWebpageType`→`isPuckRenderable` (read/write-tools server-side enforce via DB-fetch; context-assembler-hint + chat-route-schema + client-wiring). Gebouwd via 7-subsysteem understand-workflow → 5 increments → adversariële recall-review (31 agents, 2.9M tokens): 1 major (chat-route Zod strlooft contentTypeInputs) + scorer-correctheid (NL-lidwoord vs voornaamwoord, kale-cijfer-citatie, answerFirst-mat-de-intro-niet-headline) + deploy-safety (workspace-fetch fail-soft) gefixt; alle bevindingen verwerkt of bewust geaccepteerd+gedocumenteerd. Gates: tsc 0, eslint 0, 13 GEO-smokes (233 checks) + prompt-contracts 235 + web-page-builder + page-types + knowledge-context + F-VAL-regressie groen. **Live-AI E2E van generatie+polish deferred** (geen key in worktree). **Productie-deploy: `prisma db push` (authorProfile-kolom).**

- Task: [tasks/geo-seo-fase3-geo-prompts-fval.md](tasks/geo-seo-fase3-geo-prompts-fval.md)
- ADR: [seo-pipeline-composable-stage](docs/adr/2026-06-17-seo-pipeline-composable-stage.md) (accepted)
- Spec: [docs/specs/2026-06-17-geo-seo-longform-plan.md](docs/specs/2026-06-17-geo-seo-longform-plan.md)
- Commit: feat/geo-seo-fase3 (PR)

### 335. Deep Research in de Knowledge Library — onderwerp → onderzoek → geciteerd rapport

Vierde manier om kennis toe te voegen naast Manual Entry / Smart Import / File Upload: de "Upload"-knop is hernoemd naar **"Add Item"** en de Add-Resource-modal heeft een nieuwe **Deep Research**-tab. Flow zoals Claude's deep research: typ een onderwerp → het systeem stelt 2-3 verfijningsvragen → een meerstaps server-side pipeline (`src/lib/knowledge-research/`: PLAN→SEARCH→READ→VERIFY→SYNTHESIZE→FINALIZE, deterministische fan-out gemodelleerd op Trend Radar, NIET de Brandclaw agent-loop want die streamt niet) streamt live voortgang via SSE → een geciteerd markdown-rapport dat je met bewerkbare titel/categorie/tags/samenvatting als `RESEARCH`-resource opslaat (nieuwe viewer-modal + "Read report" op grid/list-kaarten). Bronnen komen van Gemini web-grounding (redirect-links worden naar hun echte eind-URL geresolved + SSRF-gevalideerd vóór de domein-dedup) met optionele Exa-achtergrondcontext; synthese via Anthropic Sonnet 4.6 met afgedwongen `[n]`-citaties + een canoniek herbouwde `## Sources`-sectie (model kan geen niet-bestaande bronnummers injecteren). De run schrijft NIET naar de DB (geen orphan-resource bij afbreken); opslaan gaat via de bestaande create-route (uitgebreid met `content`/`aiSummary`/`aiKeyTakeaways`/`source`/`importedMetadata`), nieuwe additieve `ResourceSource.DEEP_RESEARCH`. Abort/deadline worden naar álle AI-calls geforward (nieuw `abortSignal` op de Anthropic- + Gemini-clients) zodat een disconnect/deadline lopende generaties direct stopt. Gebouwd via workflow (foundation → backend+frontend parallel → smoke) + 3 adversariële review-rondes (0 CRITICAL) + 3 echte live end-to-end runs die 2 defecten vingen die de fakes-smoke miste: gemini-2.5-flash thinking-tokens trunceerden de structured JSON (`thinkingBudget: 0`), en de grounding-redirect-domeinen capten bronnen op 2 (opgelost door redirect-resolutie vóór dedup). Gates: tsc 0, eslint 0, nieuwe `smoke:deep-research` 30/30 (dependency-injected fakes, geen API-kosten).

- Task: [tasks/done/knowledge-library-deep-research.md](../tasks/done/knowledge-library-deep-research.md)
- ADR: [docs/adr/2026-06-19-deep-research-pipeline.md](adr/2026-06-19-deep-research-pipeline.md)
- Spec: -
- Commit: PR #55 (squash op main)

### 334. Knowledge-context werkend op de 5 PUCK web-page-types

Vervolg op #331: de knowledge-context picker was verborgen voor de 5 PUCK web-page-types (landing-page/faq-page/product-page/microsite/comparison-page) omdat hun generatie via het structured-variant-pad loopt dat `additionalContextItems` niet consumeerde — het paneel tonen zou een silent dead-end zijn. Nu bedraad: `assembleCanvasContext` vulde `ctx.additionalContextItems` al, dus `generate-structured-variant` serialiseert ze via `serializeContextForPrompt` (exact het orchestrator-patroon) en geeft de tekst mee aan `generateLandingPageVariantBatch`. De injectie zit op één gedeeld punt — `buildSharedStyleBlocks` — zodat alle 4 type-specifieke system-prompts (faq/product/microsite/LP) het bronmateriaal raw krijgen (zelf-bevattende `## PRIORITY SOURCE MATERIAL`/`## ADDITIONAL CONTEXT`-headings uit de serializer, geen geneste dubbele heading). Daarna is de `!isPuckWebpageType`-gate in `Step1Context.tsx` verwijderd (+ ongebruikte import) zodat het paneel op web-page-types verschijnt. No-knowledge-pad blijft byte-identiek (knowledge-blok leeg → ongewijzigde prompt; golden-set-veiligheid). Bewust NIET in het auto-iterate/tell-rewrite-pad: dat is een meaning-preserving polish op al-gegronde tekst via de golden-set-gevoelige `VARIANT_REWRITE_SYSTEM_PROMPT`; knowledge re-injecteren is onnodig + risicovol. Gates: tsc 0, eslint 0, `smoke:web-page-builder` 68/68, `smoke:page-types` groen, `smoke:knowledge-context` 8/8; live-geverifieerd dat de knowledge-tekst in alle 4 web-page-prompts landt én dat het no-knowledge-pad clean blijft. (#332 → #334 hernummerd post-merge wegens parallelle #332/#333.)

- Task: [tasks/done/knowledge-context-on-webpage-types.md](../tasks/done/knowledge-context-on-webpage-types.md)
- ADR: -
- Commit: `main` (zie git log)

### 333. Gegenereerde content-item beelden groeien automatisch de Media Library

Beelden die je vanuit een content-item genereert (Canvas Step 2/3) belandden alleen als `DeliverableComponent.imageUrl` en bereikten nooit de Media Library — semantische zoek (`findSimilarMediaAssets`) en library-first hergebruik misten ze. PR #325 loste dit al op voor LP-feature-cards via de fire-and-forget util `importGeneratedImageToLibrary`, maar die zat in slechts 1 van de ~5 beeld-entry-points. Nu registreren **alle** content-item beeld-routes hun AI-output als `MediaAsset(source=AI_GENERATED)`: `generate-visual` / `-trained` / `-compose` via een nieuwe gecentraliseerde wrapper `ingestUploadsToLibrary` (resolvet id-keyed `MediaCategory` + leesbare naam uit het deliverable-type, dedupliceert de ingest-loop), en `refine-visual` / `edit-image` direct. Per-`contentType` categorie-mapping (social→`SOCIAL_MEDIA`, ads→`ADVERTISEMENT`, web→`HERO_IMAGE`, rest→`LIFESTYLE`) via pure `resolveMediaCategory` + `getDeliverableTypeById` (contentType = type-id, niet de displaynaam — kernbug uit de review). `refine-visual` gebruikt replace-per-slot (`sourceUrl`-marker `deliverable-component:{id}` in een transactie + best-effort blob-cleanup) zodat herhaald verfijnen één — de meest recente — asset oplevert i.p.v. één per iteratie. **Bijvangst-bugfix**: `edit-image` gaf een gesigneerde, verlopende fal-URL terug die de frontend rechtstreeks persisteerde (dode link na ~30-60 min) — nu eerst naar onze storage geüpload en de duurzame URL geretourneerd. Ingestie is overal fire-and-forget (faalt nooit de generatie) + media-cache-invalidatie. Nieuwe `smoke:content-library-ingest` (43/0) bevat een census-regressievangnet dat elke `storage.upload`-beeld-route dwingt te ingesten of expliciet te allowlisten. Live browser-E2E geverifieerd (nieuw linkedin-post content-item → echte generatie → 2 `MediaAsset(SOCIAL_MEDIA)` met embedding → zichtbaar in de Media Library). 3 adversariële review-rondes (workflow + 2× finalize 2-subagent-loop), 0 CRITICAL; #325-feature-visual-smokes 72/0 ongewijzigd.

- Task: [tasks/done/content-item-images-to-library.md](../tasks/done/content-item-images-to-library.md)
- ADR: -
- Spec: -
- Commit: PR #54 (squash op main)

### 332. GEO/SEO long-form fundament — metadata, discovery, SEO-eligibility + GEO-variant spike

Voegt Generative Engine Optimization (citeerbaarheid voor AI-answer-engines) + SEO toe aan long-form/page-types, additief. **Fase 1a**: `generateMetadata` op `/p/[slug]` uit `settings.seoChecklist` + canonical-fallback, per-workspace host-aware `sitemap.xml`/`robots.txt`/`llms.txt` (geen cross-tenant lek), Organization-publisher op FAQPage. **Fase 1b**: long-form SEO-eligibility via een `optimizationGoals` opt-in checkbox-groep (SEO default-aan, nieuw `checkbox-group`-veldtype) + gedeelde `shouldRunSeoPipeline`-gate. **Fase 2 (spike)**: `LongFormGeoVariantContent`-schema (discriminant `geoArticle`) + `buildLongFormGeoTemplateFromStructured` render-bridge op de gedeelde PageVariantContent-union, backward-compat behouden. Checkpoint — fasen lopen door (resterend: GEO-generatie, gate-spread, publish-keten, BlogPosting JSON-LD). Geverifieerd: tsc 0, eslint 0, prompt-contracts 235/235, web-page-builder + page-types 176 + GEO-smokes 110 groen; review-rondes clean + 2 xhigh code-reviews verwerkt.

- Task: [tasks/geo-seo-fase1a-structured-data.md](tasks/geo-seo-fase1a-structured-data.md) · [1b](tasks/geo-seo-fase1b-longform-seo-substrate.md) · [2](tasks/geo-seo-fase2-optimization-goals-puck-publish.md) · [3](tasks/geo-seo-fase3-geo-prompts-fval.md)
- ADR: [optimization-goals-field](docs/adr/2026-06-17-geo-seo-optimization-goals-field.md) · [longform-puck-publish-chain](docs/adr/2026-06-17-longform-puck-publish-chain.md) · [seo-pipeline-composable-stage](docs/adr/2026-06-17-seo-pipeline-composable-stage.md)
- Spec: [docs/specs/2026-06-17-geo-seo-longform-plan.md](docs/specs/2026-06-17-geo-seo-longform-plan.md)
- Commit: PR #53 (squash op main)

### 331. Knowledge-context in de content-item flow — picker-fixes + inline toevoegen + prioriteit/toelichting + campagne-pre-selectie

Twee samenhangende features op de Canvas Step-1 knowledge-context picker, in één commit (diffs verweven in dezelfde files). **Feature A (inline-add)**: de "Knowledge Context"-kaart is nu altijd zichtbaar met een prominente knop (was een kale 12px-link, verborgen op verse items); de picker toont lege/errored categorie-groepen i.p.v. ze stil te droppen (root-cause "library-items niet zichtbaar"); inline link/PDF toevoegen vanuit de picker schrijft naar de Knowledge Library (PDF/tekst geparset via `unpdf` naar nieuwe `KnowledgeResource.content`-kolom, dubbele cache-invalidatie `knowledge-resources` + `canvas-context-items`, ontbrekende `invalidateCache` op de upload-route hersteld); de selectie persisteert op `deliverable.settings.additionalContextItems` (overleeft reload/tab-switch). **Feature B (prioriteit/toelichting/pre-selectie)**: per item een `priority` ('primary'/'reference', default reference = gedrag ongewijzigd) + vrije `note`, end-to-end door 7 lagen (store → persist → hydration → beide orchestratie-flattens → orchestrate Zod-schema → serializer); `serializeContextForPrompt` rendert primary-items onder `## PRIORITY SOURCE MATERIAL` ("ground your output in it", ruimer leesbudget) en notes als `**User guidance on this source:**`; dubbele `## Additional Context`-heading in de orchestrator verwijderd; campagne-geselecteerde kennis (`CampaignKnowledgeAsset` + nieuwe generieke `sourceType`/`sourceId`, wizard schrijft nu lossless composite-keys i.p.v. alles als brand_asset, casing-bug gefixt) wordt bij eerste opening voorge-checkt als priority='primary' (brand_asset/persona/product gestript tegen dubbel-injectie, gereconcilieerd tegen live data, pre-filter vóór de dure sweep voor perf). Browser-geverifieerd (Playwright) incl. een gevonden+gefixte double-toggle-bug waardoor de modal niet sloot op Apply (gotcha toegevoegd). 3 adversariële review-rondes (workflows + 2-subagent finalize-loop), 0 CRITICAL. Gates: tsc 0, eslint 0 errors, `smoke:prompt-contracts` 235/235 (reference-framing byte-identiek), nieuwe `smoke:knowledge-context` 8/8 + `smoke:context-priority` 9/9, seeding end-to-end + dedup geverifieerd. Schema: `db push` (KnowledgeResource.content + CampaignKnowledgeAsset.sourceType/sourceId) — andere worktrees: `npx prisma generate` na pull.

- Task: [tasks/done/knowledge-context-inline-add.md](../tasks/done/knowledge-context-inline-add.md), [tasks/done/knowledge-context-priority-annotation-preselect.md](../tasks/done/knowledge-context-priority-annotation-preselect.md)
- ADR: -
- Spec: -
- Commit: `31edcdb0` (main)

### 330. Ingeslopen Nederlandse UI/communicatie-teksten → monolinguale Engelse UI

De product-UI bevatte verspreid ingeslopen Nederlands (aria-labels, placeholders, error-/toast-meldingen, marketing-copy, transactionele alert-emails, notificatie-/activity-labels, plus NL default/placeholder-content in de Puck-page-builder). Een multi-agent audit (workflow `dutch-to-english-audit`) wees uit dat er **geen i18n-framework** is (strings zijn hardcoded in JSX) en dat de taal van *gegenereerde klant-content* een aparte, volwassen locale-laag is (ADR `2026-05-08-locale-routing-brand-voice`). Gekozen aanpak: **directe hardcoded NL→EN-vervanging** van user-facing strings (géén i18n-laag), met de gegenereerde-content-locale-laag intact. Uitgevoerd in worktree `branddock-feat-nl-to-en` over ~80 files: **F1/F2/F3** (parallelle apply-agents) marketing-site + settings + shared components + canvas-UI + brandstyle/voice + competitors + transactionele competitor-alert-emails (`notify-major-events.ts`) + activity-labels. **F4** (handmatig): Puck-config + `template-helpers` scaffold-defaults → Engels (consistent met de al-Engelse `defaultBrandHero` + bestaande bilinguale placeholder-markers; géén locale-driven refactor want het zijn placeholders die de generatie overschrijft, RichText-default = `Write your content here.` zodat de `your content here`-marker matcht); de hardcoded `?? 'nl'`-taalfallbacks in 5 generated-content-paden (`generate-structured-variant`/`auto-iterate-variant` routes, `canvas-orchestrator`, `human-voice-directive`, `auto-iterate-integration`) uitgelijnd op `'en'` (= `Workspace.contentLanguage @default("en")`; brands mét expliciete voorkeur + de `nl→nl-NL`-mapping + per-taal-data onaangeraakt). **F5**: ESLint `no-restricted-syntax`-gate die nieuwe NL UI-strings blokkeert (hoog-precieze stopwoordenlijst op JSX-tekst + aria/placeholder/title, klant-content-paden hard uitgesloten) — vond 10 misses tijdens uitvoering, alle gefixt. NL code-comments + interne docs blijven Nederlands (bewuste gebruikerskeuze, conform CLAUDE.md-conventie). Géén doNotTouch/prompt-body files in de diff. Adversariële 4-reviewer pass: clean, 0 majors. Gates: tsc 0, eslint 0 errors, F5-gate 0 violations, `smoke:prompt-contracts` 235/235, `smoke:locale` 32/32, `smoke:web-page-builder` 68/68, `smoke:page-types`/`image-briefing`/`competitor-activities`/`feature-visual-gate` groen.

- Task: [tasks/done/dutch-to-english-ui-migration.md](../tasks/done/dutch-to-english-ui-migration.md)
- ADR: [docs/adr/2026-06-17-nl-to-en-ui-migration.md](adr/2026-06-17-nl-to-en-ui-migration.md)
- Commit: `35097c25` (main)

### 329. Website page-types W0-W5 — product/faq/microsite volwaardig + logo-garantie (L1+L2+L3)

Volledige uitvoering van `docs/specs/website-page-types-implementatieplan.md`: de 5 PUCK-webpage-types waren landingspagina's-in-vermomming (geen contentType-dispatch). **W0** (quick wins + logo-promptlaag L-Fase 1): `Brand:${name}` uit de image-prompt-builders + onconditionele unbranded-guard + `logos` in DEFAULT_NEGATIVE_SEGMENTS, microsite double-render-fix, type-eigen contentTypeInputs → builtPrompt, type-bewuste briefIncomplete-gate, merk-vreemde template-placeholders geneutraliseerd. **W1** (type-aware generatie): `page-type-schemas.ts` (faq/product/microsite Zod) + contentType-dispatch in variant-generator (`buildSharedStyleBlocks` byte-identiek voor LP) + per-type from-structured-builders + shape-dispatch in variantToPuckData/flatten + orchestrate-dubbelpad-gate; LP/comparison byte-compatibel. **W2** (product-page + Product-koppeling): `product-select` veldtype + Layer 7 settings-first productId + ProductImages, product-prompt met anti-hallucinatie + pageFlavor (saas/physical/service), `assignProductImagesToVariant`, server-guard 400, native SpecTable-component, Product/Service JSON-LD op /p/[slug]. **W3** (FAQ): categorie-ankernavigatie + FAQPage JSON-LD (rest zat al in W1). **W4** (microsite): AnchorNav (sticky/scroll-spy/a11y, eigen 'use client'-bestand zodat puck-config server-safe blijft) + StoryChapter (beeld/tekst-alternatie) + HighlightCards (inactief-by-default, activeerbaar in de editor) + block-beeld-slots + blueprint-mapping-promptregel. **W5** (logo-garantie): L-Fase 2 `visibleLogo`-boolean op de coherence-judge (logo-vrije kandidaat wint, zwaarste regen-reden, library-beeld beschermd) + hero-logo-gate (logo-fidelity<50 → auto-deselect naar schone variant, race-guarded, nul latency); L-Fase 3 opt-in hero-logo-overlay (WorkspaceAiConfig-toggle, luminantie-bewuste LIGHT/DARK-variant top-right) + anchor-curatie (`detect-logo-in-image` + `?audit=1`) + settings-UI. Testronde-fixes (browser-feedback): microsite-menu één regel + korte CTA, FAQ twee bijna-identieke CTA-panelen → één, RichText-font = role-body, échte logo in de nav, brand-fit graceful fallback (design-philosophy-judge bij ontbrekende bron-screenshot i.p.v. ENOENT-502), AnchorNav sticky alleen op de live pagina (niet-sticky in de ingebedde preview). Gates: tsc 0, eslint 0, nieuwe `smoke:page-types`-keten (w1 65 / w2-w3 51 / w4 20 / w5 20 / w5-l3 18 = 174), web-page-builder + prompt-contracts 235 + lp-text-quality 50 groen. Cherry-picked op main naast de parallelle content-types-chores (#328, disjuncte files).

- Tasks: [tasks/website-page-types-w0-w1.md](../tasks/website-page-types-w0-w1.md) t/m w5
- Spec: [docs/specs/website-page-types-implementatieplan.md](specs/website-page-types-implementatieplan.md)
- Commits: `f8c72bd5` (W0-W5) + `939546aa` `73617b57` `ffeb03ff` (testronde-fixes)

### 328. Content-item-categorieën Email & Automation / Sales Enablement / PR, HR & Communications verborgen uit de Add Content-picker

Drie categorieën uit de campaign content-type-picker gehaald via het reversibele hidden-flag patroon (mirror van de Video & Audio-verwijdering 2026-05-19), alles in `src/features/campaigns/lib/deliverable-types.ts`: de categorie-strings uit `DELIVERABLE_CATEGORIES` weggehaald (→ verdwijnen uit alle 6 picker-consumers: wizard SetupStep/DeliverablesStep, BulkGenerate, QuickContentForm, ContentFilters, AddDeliverableType) + `hidden: true` op de 17 onderliggende types (5 Email & Automation, 4 Sales Enablement, 8 PR, HR & Communications — `employer-brand-video` was al hidden). De category-keyed maps (fidelity `CATEGORY_DEFAULTS`, brand-voice `CATEGORY_CHANNEL_MAP`, canvas-model-routing `CATEGORY_OPTIMAL_MODEL`) zijn bewust intact gelaten — ze zijn `Record<string, …>` en houden de category-strings, zodat bestaande/hidden deliverables blijven genereren en scoren. Reversibel via `hidden→false` + de categorie-regel terugzetten. 2-reviewer finalize-pass: 0 CRITICAL / 0 WARNING; 1 geërfde MINOR (stale persisted `activeDeliverableTab` in localStorage kan een verwijderde tab eenmalig resurrecten — identiek aan het Video & Audio-precedent, geen regressie van deze change). Gates: tsc 0, lint 0. Ook cherry-picked naar worktree `branddock-feat-page-types` (`83c17479` + `e5d4b430`) waar de dev-server draait.

- Task: -
- ADR: -
- Spec: -
- Commit: `2b247fc1` (Email & Automation + Sales Enablement) + `f022977e` (PR, HR & Communications)

### 327. Prompt-audit verbeterplan fase 0-5 — volledige prompt-laag gesaneerd (truncatie, contracten, validatie, taal, configuratie)

Volledige uitvoering van het 5-fasen-verbeterplan uit de prompt-audit (409 bevindingen, 14 CRITICAL — rapport `docs/audits/2026-06-11-prompt-audit.md`), die alle vier de gemelde testklachten verklaarde (afgebroken teksten / verkeerde opdrachten / onvolledig / verkeerde volgorde). **F0+1 (commit `1039f0e2`)**: 9 quick-wins (o.a. Zod-velden die op het happy path wegvielen, SEO step 6 markdown-vs-JSON, Claw contentType-wiring waarmee de #318 LP-edit-tools voor het eerst bereikbaar zijn, frameworkData read-modify-write) + centrale truncatie-discipline (stop_reason/finish_reason-detectie in alle clients, `getMaxTokensForComponent` 2048→registry-budgetten, thinking-budget bovenop output, gedeelde `call-budget.ts`). **F2**: component-contract-laag — fallback-registry 7→32 entries (einde "exactly 0 entries" voor 17+ types), `FALLBACK_FIRST_TYPES`-precedence (tiktok scene-split terug), per-email sequence-groepen, faq/comparison/microsite eigen contracten, per-group silent-iterate verplaatst naar ná persistVariants (resultaat werd weggevaagd — latent sinds F24), nieuwe CI-gate `smoke:prompt-contracts` (235 checks). **F3**: validatie-hygiëne — `validateAndCoerce` (coerce-dan-enforce, per-call-site), regen-normalisatie vóór parse, C7 ad-runner (judges scoorden altijd lege content; cache heelt zelf via contentHash), judge-degraded-pad i.p.v. 500, auditor/UI-guards, admin-routes Zod. **F4**: taal/jargon/governance — locale-instruction gegeneraliseerd (Intl.DisplayNames, nooit meer stil ''), `withLocaleContract` op alle chain-prompts, award-jargon-sweep + `scrubConceptOutput`, gedeelde `analyzer-markers.ts` (OBSERVED/RECOMMENDED-strip + review-gates op beide consistent-models-resolvers), `fenceUntrustedContent` op 5 scrape-prompts. **F5**: exploration-éénwording (admin-`reportPrompt` echt geconsumeerd; 5→2 promptbronnen; sync-script niet-destructief; BV-WIRE voice-velden uit seed+script+3 DB-configs), `isTempDeprecatedModel` centraal, photo-brief/strategic-implications via anthropicClient (+brand-context), `foldNegativeIntoPrompt` op alle 6 LoRA-paden (negatives waren een stille no-op), golden-sets CI-gate faalt nu echt (<70% = rood), −3.157 regels dead code. Methode: 3 audit-rondes (132 agents, adversariële verificatie incl. live API-tests — bijvangst: gotcha-correctie sonnet-4-6+temperature=200 OK) + per fase parallelle file-disjuncte bouw-clusters met 2-reviewer pass (38 review-bevindingen verwerkt). Gates per fase groen: tsc 0, prompt-contracts 235/235, smoke:locale 32/32, heuristics-locales 50/50, web-page-builder/studio/ad-creative suites. Open: browser-smoke #318-tools + 4 representant-types (handmatig), dam-auto-tagger-centralisatie (parallelle sessie).

- Tasks: [tasks/done/prompt-audit-fase-0-1.md](../tasks/done/prompt-audit-fase-0-1.md) t/m [tasks/done/prompt-audit-fase-5.md](../tasks/done/prompt-audit-fase-5.md)
- Audit: [docs/audits/2026-06-11-prompt-audit.md](audits/2026-06-11-prompt-audit.md) (+ data-JSON)
- Commit: branch `fix/prompt-audit-fase-0-1`

### 326. Quality-mode instelbaar via Settings → AI Models (micro-restje #322)

De kandidaten-per-slot-knop voor LP feature-beelden (#322) was alleen via een handmatige WorkspaceAiConfig-row instelbaar; nu staat er een "Image generation"-sectie in de developer-only AI Models-tab met een 1/2/3-keuze (budget / quality / max, met kosten-hint per pagina) op een eigen mini-route (`/api/settings/feature-image-quality` — bewust naast `/api/settings/ai-models`, want dit is een tuning-knop en geen provider/model-keuze; 1 = row verwijderen = default, conform het reset-patroon). Tweede micro-restje gesloten zonder bouw: per-feature handmatige beeld-keuze bleek al volledig gedekt door #320's PuckImageField (picker + clear + bron-badge op beide feature-velden).

- Task: [tasks/done/lp-feature-image-followups.md](../tasks/done/lp-feature-image-followups.md) (extensie)
- ADR: `-`
- Spec: `-`
- Commit: branch `feat/lp-quality-mode-settings`


### 325. Gegenereerde feature-beelden groeien de Media Library (zelf-lerend hergebruik)

Sluitstuk op library-first (#323): definitieve AI-winnaars uit `generate-feature-visuals` worden fire-and-forget als MediaAsset geregistreerd (source `AI_GENERATED`, sceneType→categorie, naam = brief-subject, slug-suffix uit de unieke upload-bestandsnaam) waarna de dam-auto-tagger automatisch beschrijving + tags + pgvector-embedding levert. Daarmee kan de matcher een eerder gegenereerd beeld bij een volgende pagina hergebruiken voor $0 i.p.v. opnieuw te genereren — de bibliotheek wordt zelf-lerend. Echte foto's houden voorrang (PHOTO_REAL-boost) en de fail-closed coherence-poort blijft de kwaliteitsgrens; bewuste consequentie: her-generatie van dezelfde pagina kan het vorige beeld terugmatchen (gewenst hergebruik — vers afdwingen = asset archiveren of vervangen via de picker). Max 4 assets per page-run (alleen finals, library-matches worden niet her-geïmporteerd); import-fouten zijn non-blocking.

- Task: [tasks/done/lp-library-first-matching.md](../tasks/done/lp-library-first-matching.md) (extensie)
- ADR: [docs/adr/2026-06-10-feature-visual-pipeline.md](adr/2026-06-10-feature-visual-pipeline.md)
- Spec: `-`
- Commit: branch `feat/lp-generated-to-library`


### 324. Planner-checklist false negatives voor Puck web-pages + hero-row pariteit

De Publication Checklist in Canvas Step 4 false-flagde gegarandeerd op "Title or headline" en "Hero image" voor Puck web-pages: de checks lazen alleen DeliverableComponent-tekstgroep-namen en de `heroImage`-store-slice (die uitsluitend uit een `variantGroup='hero-image'`-rij hydrateert), terwijl de Puck-flow titel/hero in `settings.puckData`/`structuredVariant` persisteert. Gefixt langs vier lijnen: (1) Puck-specifieke checklist-branch ("Hero headline is set", required-pariteit met de oude web-branch); (2) checklist-signalen lezen voor Puck-types `contextStack.puckData` (gerenderde waarheid; volgt editor-edits na refetch) met de `structuredVariant`-snapshot als fallback, `has-meta` accepteert het door de SEO-pipeline teruggeschreven `contentTypeInputs.metaDescription` (puck-gated — de WordPress-excerpt van blog-article leest alleen de tekstgroep); (3) de SEO-pipeline-wipe spaart media-rijen (`notIn ['image','video','voiceover']`, orchestrator-conventie) i.p.v. alles te wissen; (4) AI-hero-flows upserten nu óók de `hero-image`-rij op het gedeelde chokepoint (`patchHeroVisualUrl`, alle 3 routes) — atomair op de compound-unique, gegate op nieuw `puckPatched`-signaal (rij spiegelt de gerenderde hero) en strikt additief in fill-only/self-heal-modus zodat een handmatige keuze nooit overschreven wordt; POST /hero-image is de andere race-helft en werd ook atomair. Review: 2 rondes × 2 verse subagents (0 critical, 7 warnings → alle gefixt) + ronde 3 inline wegens subagent-limiet. Browser-geverifieerd op de Napking LP vóór én na de rework: 5/5 groen, warning-regel weg, 0 console-errors. Smokes: phase68 30/30 (incl. nieuw `puckPatched`-contract); tsc 0, lint 0 errors.

- Task: [tasks/done/planner-checklist-puck-lp.md](../tasks/done/planner-checklist-puck-lp.md)
- ADR: `-`
- Spec: `-`
- Commit: `1d6ebbc1`

### 323. Library-first matching — echte merkfoto's vóór AI-generatie op het LP feature-pad

De Media Library is nu de eerste bron voor LP feature-beelden: een server-side slot-matcher (`source-image-matcher.ts`) matcht per slot de brief/copy semantisch tegen aiDescription-pgvector-embeddings (`findSimilarMediaAssets` + additieve `excludeCategories`-param), met greedy unieke toewijzing (één asset → max één slot), foto-categorieën-only, `auth:PHOTO_REAL`-boost, orphaned-disk-guard en throw-loze cold-start. Een match wordt pas geaccepteerd na de coherence-judge (≥55, **fail-closed** zonder oordeel) — "echt maar fout" valt terug op het AI-pad. Gedekte slots kosten $0 fal-spend (`sources: 'library'`, persist `imageSource: library:<assetId>` mét `aiProvider/aiModel: null` conform het select-library-patroon). Source-aware kwaliteitspoort: een library-foto kan nooit de duplicate-verliezer zijn van een (library, AI)-paar (swap-loop + `protectedIndices` in de gate) — de AI-sibling kan via brand-anchors op dezelfde foto geconditioneerd zijn. Review-ronde 1 ving een CRITICAL: webp-library-assets (21% van de embedde set) kregen een png-label waardoor de coherence-acceptatie fail-open passeerde én één invalide image-block de hele multi-image diversity-call stil uitschakelde → `prepareJudgeImage` sniff't nu png/jpeg/webp en converteert onbekende formats naar jpeg. Bevestigingsronde 0C/0W incl. live SQL-verificatie van de nieuwe `text[]`-param (G2-callers ongewijzigd). Smokes: matcher 11/11 (nieuw), gate 23/23 (+protected-cases), judge-image 7/7 (+webp/gif); golden-set dry-run met match-rapportage; npm smoke-entries toegevoegd.

- Task: [tasks/done/lp-library-first-matching.md](../tasks/done/lp-library-first-matching.md)
- ADR: [docs/adr/2026-06-10-feature-visual-pipeline.md](adr/2026-06-10-feature-visual-pipeline.md) beslissing 10 (geactiveerd)
- Spec: [docs/audits/2026-06-10-lp-feature-image-diversity.md](audits/2026-06-10-lp-feature-image-diversity.md)
- Commit: branch `feat/lp-library-first-matching`


### 322. LP feature-images follow-ups — werkende clear-knop, quality-mode, audit-nauwkeurigheid, judge-downscaling

Vier §9-follow-ups van #317, waarvan één een echte cross-PR-bug bleek: de "Verwijderen"-knop uit #320 werd door de #317 clobber-guard stil teruggedraaid (parallel ontwikkeld). **Clear-pad**: de knop stuurt nu `CLEAR_IMAGE_SENTINEL` — de guard herkent dat als expliciete user-intentie (sweep vóór de alignment-guards zodat de magic string nooit persist), normaliseert naar '' én spiegelt de clear naar `structuredVariant` op het PATCH-chokepoint (anders resurrecteerde elke sv→puck-rebuild het gewiste beeld); stale-race-bescherming blijft intact. Plus bron-badge op de veld-thumbnail (URL-heuristiek: AI-gegenereerd / media library / extern). **Quality-mode**: WorkspaceAiConfig featureKey `lp-feature-image-candidates` (1-3, default 1) stuurt num_images per slot; elke kandidaat wordt vóór upload ge-coherence-judged, de winnaar geüpload en de runner-up dient als gratis dupe-swap — mét re-judge van de set na swaps en fail-soft swap-uploads. **Audit-nauwkeurigheid**: per-slot generationDuration, iterationCount=1 bij retry, response `regenerated`/`swapped` alleen bij succes, telemetrie op werkelijke tellers. **Judge-downscaling**: `prepareJudgeImage` (sharp, >4MB → jpeg ≤1024px + magic-byte-sniff) vóór elke vision-judge-call. Reviews: 2 reviewers, 0 critical / 6 warnings → alle gefixt. Smokes: preserve 20/20, judge-image-prep 5/5 (nieuw), bestaande suites groen; tsc 0.

- Task: [tasks/done/lp-feature-image-followups.md](../tasks/done/lp-feature-image-followups.md)
- ADR: [docs/adr/2026-06-10-feature-visual-pipeline.md](adr/2026-06-10-feature-visual-pipeline.md) (beslissingen 6/9 geactualiseerd door deze task)
- Spec: [docs/audits/2026-06-10-lp-feature-image-diversity.md](audits/2026-06-10-lp-feature-image-diversity.md) §9
- Commit: branch `feat/lp-image-followups`


### 321. Brand Assistant tenant-hardening — scope-guard + write-tool IDOR dichtgezet

Twee bevindingen uit de Brand Assistant ("Claw") cross-tenant leak-audit afgehandeld. (1) **Scope-guard**: `SYSTEM_IDENTITY` (de assistant-system-prompt) verbood nergens om over merken buiten de workspace te praten, waardoor de assistant vragen over willekeurige (andere klant-)merken uit zijn trainingskennis beantwoordde. Toegevoegd: een expliciete "Scope boundary"-sectie die de assistant bindt aan de merken/concurrenten in de workspace-context, vragen over bedrijven die niet in context staan laat weigeren (niet uit general/training knowledge antwoorden), en fabricage over andere tenants verbiedt — met de eigen `Competitor`-records expliciet als in-scope (het is eigen concurrentieanalyse). (2) **Write-tool IDOR**: meerdere write-tools muteerden in `execute()` op `prisma.X.update({ where: { id } })` zónder workspace-check. Omdat `execute` los van `buildProposal` via de confirm-route draait met een client-geleverd entity-id, kon een gemanipuleerde confirm een entiteit uit een **andere** workspace muteren. Op `main` geverifieerd aanwezig en gefixt in 7 surfaces: `update_asset_content`, `update_asset_framework`, `update_persona`, `update_product`, `update_competitor`, `update_strategy_context` en `lock_entity` (brand_asset/persona/product — die had zelfs in `buildProposal` geen check). Patroon: `updateMany({ where: { id, workspaceId }, data })` + `count === 0 → throw`, of (waar al een `findFirst` stond) een `if (!row) throw` vóór de bare update. Prisma's `updateMany.count` telt gematchte rijen, dus een idempotente write throwt niet onterecht; de confirm-route vangt de throw als een nette tool-error (geen 500). Reeds-gescopede tools ongemoeid + geverifieerd (`update_interview`, `link_persona_to_product`, alle 4 deliverable-update-tools). 2-reviewer security-pass: 0 critical; de enige WARNING (statische smoke-scan miste multi-line `.update(`-calls) is gefixt — de scan slaat nu whitespace plat en dekt ook delete/upsert. tsc+lint 0; nieuwe smoke `smoke:claw-security` 8/8 + eenmalige cross-workspace integratietest tegen de echte DB (12/12: write geweigerd op alle 5 tools, DB ongemoeid, in-workspace write werkt met revert).

- Task: [tasks/done/claw-security-hardening.md](tasks/done/claw-security-hardening.md)
- ADR: `-`
- Spec: `-`
- Commit: branch `feat/claw-security-hardening`

### 320. Media-library picker als Puck image-field in de Layout editor + scroll/persist-fixes

`heroVisualUrl` (BrandHero) en `imageUrl` (FeatureSplit/FeatureGrid) zijn in de fullscreen Puck-editor geen kale URL-tekstvelden meer maar een herbruikbaar custom field (`PuckImageField`): thumbnail-preview + "Kies afbeelding" opent de bestaande `ImageSourcePanel`-interactie (library/smart-search/generate/upload/url/stock) in een modal bóven de editor; de keuze stroomt via Puck's onChange het bestaande autosave-pad in. FeatureGrid's ontbrekende `imageUrl`-field-def bleek een latente data-loss-bug (Puck stript props zonder field bij elke edit) — gefixt. Persistentie-correctheid: `syncHeroFromPuck` op het PATCH-chokepoint (dual-track sync bij autosave-vormige writes), `onlyIfEmpty`/`heroWriteMode: 'fill-only'` zodat de hero-self-heal een handmatige keuze nooit overschrijft, en re-hydrate-suppressie zolang een autosave pending/in-flight is (in-flight-teller). Scroll-fixes Layout editor (Playwright-gediagnosticeerd): Puck's hardcoded `100dvh` overflowde de wrapper (onderkant afgekapt → scoped CSS-override naar 100%) en een body-scroll-lock lekte via Puck's body→iframe-attributenspiegeling de preview in (editor-lock verwijderd; shared `Modal` kreeg een lock-teller + `lockBodyScroll`-prop + centrale Puck-guard). FidelityScoreBar staat in Step 2 boven de variant-selector. 5 review-iteraties (10 verse subagents), smokes phase61 29/29 + phase68 24/24. Browser-bewezen: library-pick → beide DB-sporen identiek (puckData + structuredVariant). NB: hernummerd van #316 (dubbele claim met text-quality; commit-messages d681ba50/0bc93926 vermelden nog #316); completeert `9e3282be` (gedeelde index met de zombie-tab-sessie — compileert niet standalone, hoort direct onder d681ba50).

- Task: [tasks/done/lp-editor-image-field.md](../tasks/done/lp-editor-image-field.md)
- ADR: -
- Spec: -
- Commit: d681ba50 + 0bc93926 (minors)

### 319. Brand-fit check werkend + zombie-tab workspace-auth op alle studio-routes

Twee samenhangende fixes uit dezelfde diagnose-sessie. **Brand-fit check**: de knop faalde altijd met het misleidende "Playwright niet beschikbaar?" — werkelijke keten: een onnodige `'use client'` op `puck-config.tsx` (pure render-functies) maakte `buildSpikePuckConfig` een client-reference-proxy in de route, en daaronder kan `renderToStaticMarkup` in de Next route-handler-laag fundamenteel geen hook-gebruikende componenten renderen (dual-React: Puck's `Render`/useMemo crasht op een null-dispatcher). Fix: render+screenshot verplaatst naar een tsx **child-process worker** (`scripts/workers/lp-screenshot-worker.tsx`, payload via temp-JSON, nu mét Puck-CSS + a11y-block) — zelfde bewezen patroon als de dev-harness; route-error verwijst nu naar de server-logs. End-to-end geverifieerd (Napking: judge-resultaat in 11s). De "N features zonder beeld"-knop (P2b gap-fill) is op user-verzoek uit PuckPageBuilder verwijderd (de #317 server-side feature-pipeline staat hier los van). **Zombie-tab fix**: de `branddock-workspace-id`-cookie is browser-globaal en een switch reload't alleen de eigen tab — alle andere open tabs werden stil inconsistent: élke cookie-scoped `/api/studio/*`-call 404'de (incl. de puckData-autosave = stille data-loss; zo verdween de hero "soms"). Alle 38 studio-routes zijn omgezet naar resource-based auth op de workspace ván het deliverable: 5 canvas-kritieke via `requireDeliverableAccess` (401/403/404-onderscheid), 33 via drop-in `resolveDeliverableWorkspaceId()` (`src/lib/deliverable/deliverable-access.ts`, hergebruikt `hasWorkspaceAccess` incl. per-member ACL). Defense-in-depth: `WorkspaceSwitchGuard` (BroadcastChannel) toont in andere tabs een blocking herlaad-overlay bij elke workspace/org-switch. Hero self-heal + Step1Context loggen nu gestructureerd (`{}` maskeerde de mismatch). Verificatie: auth-matrix via curl (zombie-scenario's 200, non-member 403/401, no-session 401), two-tab Playwright-smoke (`npm run smoke:zombie-tab-guard`), hero-smokes phase61/68 groen.

- Task: [tasks/workspace-zombie-tab-fix.md](../tasks/workspace-zombie-tab-fix.md)
- ADR: -
- Spec: [docs/audits/2026-06-10-workspace-cookie-zombie-tabs.md](audits/2026-06-10-workspace-cookie-zombie-tabs.md)
- Commit: 9e3282be (+ merge `56849bba` met #317-hotspots)
### 318. LP-tekst wijzigen via Brand Assistant in Step 3 (Medium)

De Brand Assistant ("Claw") kon in Canvas Step 3 (Medium) de pagina-inhoud van een landing page niet wijzigen — geen enkele write-tool raakte de Puck-`puckData`; de bestaande deliverable-tools vulden alléén de Step 1-briefing, en de system-prompt verklaarde de canvas zelfs expliciet "not directly editable through tools". Twee nieuwe tools heffen dat op: **`read_landing_page_content`** levert de bewerkbare tekstvelden met exacte paden + huidige waarden, **`update_landing_page_content`** past gerichte tekst-edits toe via `deepSet` en persisteert door dezelfde **hero-preserve chokepoint** (`preserveHeroOnSettings`) als de studio-autosave, zodat een tekst-edit nooit een gewirede hero-image clobbert. Beide tools volgen de veilige deliverable-scoping (workspace-check via `campaign.workspaceId` in zowel `buildProposal` als `execute` → geen cross-tenant pad) en zijn **tekst-only**: een componenten-agnostische walker met **copy-allowlist** (afgeleid uit de Puck-config) sluit structurele/enum/asset-props (`icon`/`bandTone`/`columns`/URLs/hrefs) uit, en `execute` her-valideert elk pad server-side zodat het model nooit een verzonnen of niet-copy pad kan schrijven. De system-prompt routeert web-page-deliverables naar de LP-tools (rule #5 verzwakt voor web-page-types) via een nieuw `contentType`-veld op `pageContext`; de canvas-preview ververst automatisch via de bestaande `canvas:refresh-deliverable`-keten (één case toegevoegd in de confirm-route → affected `deliverable`). Bijvangst: `PUCK_WEBPAGE_TYPES` (3× gedupliceerd) gecentraliseerd naar `src/lib/landing-pages/webpage-types.ts`. Geverifieerd end-to-end op de echte Napking-LP via een gesigneerde sessie + dev-server: de assistant koos de LP-tools, stelde een correcte kop-rewrite voor, en de confirm schreef de DB-kop daadwerkelijk om met hero intact (daarna teruggezet). tsc+lint 0; 32/32 helper-smoke + 9/9 tool-integratietest tegen de echte DB.

- Task: [tasks/done/lp-assistant-content-edits.md](tasks/done/lp-assistant-content-edits.md)
- ADR: `-` (binnen bestaande `docs/adr/2026-05-22-landing-page-builder-architectuur.md`)
- Spec: `-`
- Commit: branch `feat/lp-assistant-edits`

### 317. LP feature-beelden divers + sectie-relevant — brief-first prompts + judge-gated kwaliteitspoort

Fixt het "4x dezelfde chef"-symptoom (Napking) bij de wortel, in 6 fasen. **R1/R2**: de scraped `photographyStyle` (een OBSERVED-beschrijving van één bron-foto) stuurde via één gedeelde promptstaart élke feature-generatie, terwijl `slice(0,500)` exact het diverse Subjects-deel afkapte — de tokens zijn gesplitst (stijl deelbaar; compositie alleen voor de hero; subjects → inspiratiepool) met per-segment word-safe budgets. **R5/R6**: `canvas-context` leest photographyStyle nu gated (published && imagerySavedForAi, spiegel van brand-context) en negatives werken eindelijk op nano-banana-pro (`supportsNegativePrompt`-capability + prompt-directive-fallback, specifiek-eerst geordend met budget-reservering); `brandImageryDonts` + `brief.avoid` bereiken de feature-route. **R7**: de copy-LLM levert per hero/feature een gestructureerde `imageBrief` ({subject, sceneType-enum, composition, avoid}, `.catch(null)`-degradatie) met harde set-diversiteitsregel. **R3/R4**: de route bouwt prompts server-side (scene-templates, angle-rotatie, sibling-differentiatie, per-slot seeds — empirisch bewezen: nano-banana is deterministisch per seed) en krijgt een kwaliteitspoort: paired G4-coherence-judge per beeld + multi-image Haiku set-diversity-judge + deterministische gate met max 2 gerichte regeneraties (~$0,53-0,79/pagina); persist als `DeliverableComponent feature-visual:<i>` mét `imagePromptUsed` (audit-gat dicht). **R9**: feature-clobber-guard naast de hero-guard op het PATCH-chokepoint. Acceptatie op de echte Napking-secties: 4 onderscheidende, sectie-relevante beelden (wasmachine 85°C / voorraadkast / GOTS-label / bezorgbus), coherence 78×4, 0 dupes. **5 review-iteraties** (o.a. CanvasPage store-pollutie, Grid↔Split-wissel in de guard, brandImageryStyle-R1-zijdeur, slot-index-uniciteit gefixt) tot 0 critical/0 warning. tsc 0; 141 nieuwe smoke-checks (6 suites); golden-set dry-run over 3 workspaces; phase32-smoke omgehangen van handgespiegelde kopie naar de echte helper. Browser-verificatie Step 2/3 + merge-afstemming met `feat/lp-editor-image-field` staan open. NB: #316 is door twee parallelle sessies geclaimd (editor-image-field gecommit + text-quality gereserveerd) — chronologisch renumberen bij merge.

- Task: [tasks/done/lp-feature-image-diversity.md](../tasks/done/lp-feature-image-diversity.md)
- ADR: [docs/adr/2026-06-10-feature-visual-pipeline.md](adr/2026-06-10-feature-visual-pipeline.md)
- Spec: [docs/audits/2026-06-10-lp-feature-image-diversity.md](audits/2026-06-10-lp-feature-image-diversity.md)
- Commit: branch `feat/lp-feature-image-diversity` (12 commits, `a7d5a47f..`)

### 316. LP-tekstkwaliteit + fidelity-meting — length-penalty-artefact weg, HVD-pariteit, detector-gaten dicht

Onderzoek (31-agent workflow, `docs/audits/2026-06-10-lp-text-quality-fidelity.md`) toonde dat de laagste-van-alle-types LP-fidelity (composite 63.0, judge 46.2, n=47) voor ~13 punten een **meetartefact** was: 46/47 scores kregen een ×0.6 "severely short"-penalty omdat de LP-routes geen `targetWordCountOverride` meegaven en het registry-target 1550 woorden was tegen ~650 reële variant-copy. Daarnaast een echte copy-kloof: het LP-pad miste de complete kwaliteits-machinerie (HVD/model-routing/STRICT/silent-iterate) — empirisch 92% em-dash-prevalentie via het LP-pad vs 25% via het orchestrator-pad, en de detector miste precies de geplakte vorm ("over—zodat", PO-klacht #1). **Gebouwd (fase 1-5):** (1) *meting*: per-type scoring-targets (`STRUCTURED_VARIANT_WORD_TARGETS`, 650-700) + F33-override in score-variant-fidelity/auto-iterate-variant + Website-drempel 75→70 + placeholder-guard ("Schrijf hier je inhoud" = 21% van alle LP-scores) + contentHash-dedupe (nieuwe kolom) + baseline-recompute van de 46 penalty-rijen (62.4→75.8 composite, met JSON-backup); (2) *prompts*: HVD mode-gated in variant-generator + álle 32 em-dashes uit de prompt-instructietekst (model-priming) + anti-drieslag-regel + riskReducer-voorbeeld zonder "Geen X" + anti-fabricage (geen verzonnen testimonials/cijfers; schema-fallback voor lege author-velden) + LINFI/Better Brands-hardcode vervangen + locale uit voiceguide i.p.v. hardcoded nl-NL + model-routing naar sonnet-4-6; (3) *detector*: `em_dash_glued` + `hyphen_splice_conjunction` tells + brand-vocab-whitelist (geseede woorden tellen niet als lexicon-tell; vocabularyDo nu ook in de rules-allowlist) + do/avoid-dedup (Linfi 'exclusief'/'luxe' in beide lijsten — gefixt in data + analyzer-write-guard); (4) *loop-pariteit*: STRICT tell-rewrite per variant na batch-generatie (detector-gated, `variant-tell-rewrite.ts`) + verrijkte iterate-prompt (voiceguide-fingerprint + vocab + detector-tells + rule-violations) + silent composite-iterate achter `LP_SILENT_ITERATE=1`; (5) *meetbaarheid*: AICallSnapshot/Trace-capture voor LP-generatie (promptVersion 2.0.0; was onzichtbaar voor de prompt-registry) + golden-runner op de échte productie-prompt (`eval:lp-variant-golden`, prompt-only CI-safe + `--live`) + flatten-hygiëne (asset-key-suffixes, FAQ q→a-volgorde, judge-variant met sectielabels). **Empirische verificatie**: re-score-batch van 8 bestaande variants met live judge: composite 72.9 (was 63.0), judge 79.3 (was 46.2), 6/8 boven drempel — vóór enige nieuwe copy-generatie. tsc+lint 0; nieuwe smoke `smoke:lp-text-quality` 48/48; web-page-builder suites (phase6 35/35, phase6.2 14/14, phase10 40/40) groen.

**Adversariële review (4 dimensies + verificatie) → 4 majors gefixt vóór commit:** (1) brand-vocab-whitelist ontbrak in de rewrite-paden — dezelfde prompt zei "gebruik 'naadloos'" én "vermijd 'naadloos'", en STRICT keep-if-better beloonde het strippen van merkwoorden → whitelist nu op alle detector-call-sites; (2) silent-iterate's fire-and-forget settings-persist racete met de finale variant-write (clobber-klasse gotcha 2026-06-09) → `skipPersist`-optie in runFidelityScoring; (3) de locale-fix flipte LP-generatie naar Engels voor 3 NL-workspaces op de nooit-bewust-gezette DB-default `contentLanguage='en'` (incl. Zwarthout) → data-fix naar 'nl'; (4) de variant-targets raakten ook studio-paden die full component-text (~1450 w) scoren → `resolveScoringWordCountOverride` (webpage-scoped F33) op auto-iterate-trigger + integration-rescore, overige types byte-identiek. Plus minors: whitelist word-boundary i.p.v. substring, author-schema tolerant voor ontbrekende velden, AICall-tracking ge-await (serverless-safe), golden-yaml flake-mitigatie, backup-JSONs gegitignored.

- Audit/plan: `docs/audits/2026-06-10-lp-text-quality-fidelity.md` · Task: `tasks/lp-text-quality-fidelity.md`
- Commit: branch `feat/lp-text-quality-fidelity`


### 315. Compose-pipeline deblokkeerd — dode Gemini-model + relatieve ref-URL gefixt

Tijdens de end-to-end browser-verificatie van #314 bleek de compose-generatie zelf door twee **pre-existing** bugs volledig kapot (los van de hero-wiring-fix): (1) **dood Gemini-model** — `gemini-2.5-flash-image-preview` geeft sinds de GA-release een **404 NOT_FOUND** van Google (de `composeFromImages`-call in `gemini-client.ts` + de `COMPOSE_MODEL`-constanten in de compose- en refine-visual-routes), die de client als generieke "Network error reaching Gemini" maskeerde → vervangen door de GA-opvolger `gemini-2.5-flash-image`. (2) **relatieve reference-URL** — `fetchImageAsInlineData` deed `fetch('/uploads/media/…')` op de MediaAsset-URLs, wat server-side niet parsebaar is bij local-disk-storage (dev) → relatieve paden worden nu tegen `BETTER_AUTH_URL` geresolved (absolute CDN/S3-URLs in prod blijven ongewijzigd). Na beide fixes draait de volledige compose-flow end-to-end: een echte Gemini-compositie (Linfi-vloerluik, 832×1248) gegenereerd uit 3 library-refs + instructie, geüpload, en via de #314-fix gewired in `puckData.BrandHero` (heroVisualUrl ging van `null` → de compositie). tsc+lint 0; 72 web-page-builder smokes groen. Verificatie-harness `scripts/dev/run-compose-render.ts` (gesigneerde sessie-cookie + workspace-cookie → echte route → DB-check).

- Commit: branch `fix/compose-pipeline-model-refurl`

### 314. Image-source follow-up — compose + trained-style werkend in LP Step 2 (hero-wiring)

De compose- en trained-style image-bronnen waren dubbel kapot in de landingspagina-flow: (1) **source-gate 400** — `visualBrief.source` werd nooit gepersisteerd (alleen lokale tab-state), dus de server-routes weigerden met "switch to compose/trained first"; (2) **orphaned hero** — anders dan `generate-visual` misten `generate-visual-compose`/`-trained` de server-side `target:'hero'`-wiring, dus het gegenereerde beeld belandde als `DeliverableComponent` maar nooit in `puckData.BrandHero.heroVisualUrl` → de pagina bleef zonder header-foto. **Fix:** (1) de pickers' force-flush PATCH zet `visualBrief.source` nu expliciet ('compose'/'trained-style', ge-await vóór generate → de route leest de verse source) + de LP `onSourceChange` persisteert de source op tab-klik + de force-flush checkt nu `response.ok` zodat een PATCH-fout niet als misleidende generate-400 maskeert. (2) de atomische hero-patch is uit `generate-visual` geëxtraheerd naar een gedeelde `patchHeroVisualUrl`-helper (`src/lib/deliverable/patch-hero-visual.ts`, met pure+geteste `applyHeroUrlToSettings`-kern); compose + trained accepteren nu `target:'hero'` in hun `.strict()`-schema en roepen de helper post-upload aan — één server-side codepad op het smalste punt (per de orphaned-hero-LESSON). Backward-compat: `target` is optioneel/additief; niet-LP-callers (social-content) sturen 'm niet → helper draait niet. **Adversarieel gereviewd** (3 reviewers → 27 findings, 2 echt: force-flush `response.ok`-check toegevoegd; pre-existing settings-blob-RMW-race gedocumenteerd). tsc+lint 0 (geen nieuwe warnings); 72 web-page-builder smokes + nieuwe `phase68-hero-url-wiring` (13/13). **End-to-end browser-verificatie (compose/trained met echte AI-call) staat nog open.**

- Commit: branch `fix/image-source-compose-trained-hero`

### 313. Step 2 P4 — uniforme error-messaging + fidelity-race-guard + dead-code

Laatste hardening-stap van de Step 2-arc, drie sub-taken. (1) **Uniforme error-messaging**: alle Step 2-feedback (brief-incompleet, genereren, generatie-fout, auto-iterate, partialDelivery, hero-visual loading/fout, variant-keuze-fout, sectie-regen) loopt nu via de gedeelde `InfoBox`-primitive (severity-kleur + icon + `role`), met een nieuwe optionele `onDismiss`-prop (X-knop) voor transiënte banners; de lokale `ErrorBanner` is weg. Auto-iterate splitst echte fouten (`autoIterateError`) van informatieve meldingen (skipped/no_improvement blijven `info`), en variant-wissel reset de feedback (`selectVariant`) zodat variant B nooit A's melding toont. (2) **Fidelity-race-guard**: een per-variant write landt alleen als zijn generation-token nog actueel is voor die index (`bumpFidelityToken` + `shouldApplyFidelityWrite` in de store) — een trage/stale score-fetch na variant-wissel, regeneratie of reset wordt gedropt; een **globale monotone token-seq** (overleeft reset) voorkomt cross-generatie-collisie; `FidelityScoreBar` toont nooit meer variant-0's score op een andere variant. Orchestrator-pad blijft ongegate (backward-compat). (3) **Dead-code**: `VariantWorkspace` + `VariantCard` (cascade) + de nooit-gedispatchte `LandingPageVariantPreview` verwijderd (de levende `LandingPagePreview` blijft). **Adversarieel gereviewd** (3 reviewers → 30 findings, 6 echt): token-reset-collisie (→ globale seq), `autoIterateMsg` niet-dismissbaar + variant-switch-leak gefixt. tsc+lint 0 (geen nieuwe warnings); 71 web-page-builder smokes + nieuwe `phase67-fidelity-race` (15/15).

- Commit: branch `feat/lp-step2-p4-hardening`

### 312. Step 2 P3a — configureerbaar aantal landingspagina-varianten (1-4)

Het aantal varianten was vast op 2; nu kiest de user 2/3/4 via een segmented-selector bij de regenereer-knop (eerste auto-run blijft 2 → bestaand gedrag + kosten). De keten is end-to-end N-aware gemaakt: `generateLandingPageVariantBatch(count)` met `variantTemperatures(count)` (gespreide temps, geen clustering) + `fallbackAxes(count)` (N onderling-divergente CRO-assen: 3=+story-led, 4=+data-led+emotional — uit de al bestaande `VariantAxis`-set, geen prompt-wijziging), en `generateCreativeAngles(stack, type, count)` genereert N angles (system-prompt/JSON-schema/sanitisatie geparametriseerd; default 2 → `canvas-orchestrator` backward-compatible). De UI is N-proof: `accentFor(i)` (emerald/violet/blue/amber via **inline-style hexes** i.p.v. purge-gevoelige Tailwind-klassen — CLAUDE.md-gotcha), dynamische grid (`gridTemplateColumns`), `variantLabel`-fallbacks, geclampte actieve index, count-aware partial-banner + spinner. **Adversarieel gereviewd** (3 reviewers → 36 findings, 4 echt): count-validatie gehard tegen non-integer/string-input (float `2.5`/`"2"` glipte door `>=1 && <=4` maar miste downstream `===` → batch-size-mismatch) op route én generator-guard; a11y aria-live voor de actieve-variant-score. tsc+lint 0; 70 web-page-builder smokes + nieuwe `phase66-variant-count` (28/28).

- Commit: branch `feat/lp-step2-p3a-configurable-count`

### 311. Step 2 P3b — dynamische creative-angles per landingspagina-variant

De twee variants kregen tot nu toe een vaste, generieke divergentie-as (problem-led vs benefit-led). Nu vraagt de route eerst `generateCreativeAngles(ctx, contentType)` (Gemini Flash, best-effort, exact 2 of `null`) — brand-/context-specifieke tegenpool-invalshoeken met leesbare labels — en geeft die aan `generateLandingPageVariantBatch` mee. Per slot bepaalt een `slotParams(i)`-helper of de variant op een **angle** (hard-constraint `CREATIVE ANGLE`-blok in de system-prompt, axis onderdrukt) of op de generieke axis-fallback draait; zowel de parallelle poging als de recovery-retry gebruiken dezelfde slot-params, en een per-slot guard valt terug op de axis als een angle onverhoopt ontbreekt (geen crash). De labels (`angleLabel`) reizen mee terug via het result → route-respons → UI, worden gepersist in `settings.structuredVariantLabels`, en sturen de thumbnail-, detail- en auto-iterate-labels (`Variant A — <angle>`); bij `null` valt de UI terug op conservatief/creatief. Bij angle-failure draait alles ongewijzigd door op de oude axis-split. tsc+lint 0; 69 web-page-builder smokes + nieuwe `phase65-variant-angle-prompt` (9/9, angle-wint-van-axis + fallback) groen.

- Commit: branch `feat/lp-render-step23-provenance-hero-angles`

### 310. Orphaned-hero clobber-guard — gegenereerde header-image blijft betrouwbaar gewired

Root-cause-fix (audit 2026-06-08) voor een Napking-LP waarvan de gegenereerde + geüploade hero-image nooit in `puckData.BrandHero.heroVisualUrl` belandde terwijl feature-foto's wél wirede. Twee compounding oorzaken in `PuckPageBuilder.tsx`: (1) het re-hydrate-effect overschreef een net-gewirede hero met een stale `/context`-refetch die de BrandHero nog leeg had → nieuwe pure helper `preserveHeroVisual` (`hero-visual-preserve.ts`) behoudt een non-lege hero-URL wanneer de inkomende tree leeg is (nieuwe URL én echte clear passeren wél); (2) de self-heal zette zijn ref-guard onvoorwaardelijk vóór de async image-gen → één stille fout blokkeerde élke retry, nu gereset in de catch. Dev-recovery-tool `scripts/dev/wire-orphaned-hero.ts` hergebruikt een bestaande orphaned `DeliverableComponent variantGroup='visual'`-URL i.p.v. opnieuw te genereren. Lesson in `gotchas.md`. tsc+lint 0; nieuwe `phase61-hero-clobber-guard` smoke 7/7 (preserve / new-URL / echte-clear-passeert).

- Commit: branch `feat/lp-render-step23-provenance-hero-angles`

### 309. Provenance-consumptie smoke — bewijst dat de renderer brandProvenance threadt

Sloot een dekkingsgat uit de audit 2026-06-07: phase40–51 + `brandstyle-provenance.ts` dekken de extractie en de gate-input (`isScrapedOrigin`), maar geen smoke bewees dat `buildSpikePuckConfig` de provenance daadwerkelijk naar de renderer threadt én dat de elevation-gate (`forceFlatCards && !elevationIsScraped`) de output verandert — precies de tak die merk-fidelity boven archetype-aanname zet (Zwarthout/Napking preset-bugklasse). Nieuwe `phase60-provenance-consumption` smoke bouwt een fixture mét `brandProvenance` en assert de scraped-override-tak. Gewired in `package.json` (`test:brandstyle-eval` + `smoke:provenance-consumption`) + de `brandstyle-eval` CI-workflow. tsc 0; 11/11.

- Commit: branch `feat/lp-render-step23-provenance-hero-angles`

### 308. Step 2 preview-layout — leesbare thumbnails + detail + selectie drijft score

User-feedback op P1a: de twee side-by-side full-page previews (grid-cols-2, ~0.34 scale) waren onleesbaar, en de variant-selectie voor de fidelity-score (losse pill-toggle) was niet vindbaar. Herzien naar **thumbnails + detail**: een rij klikbare A/B-thumbnails (`VariantPuckPreview` met `maxHeight` = bovenkant van de pagina) waarmee je in één oogopslag vergelijkt én selecteert; de actieve thumbnail drijft nu de **fidelity-score, auto-iterate én** de detail-weergave. Daaronder één **full-width, leesbare** detail-kaart van de geselecteerde variant (preview op ~0.745 scale in een 560px-venster met interne scroll), met bewerken/per-sectie-regenereren (P1b/P1c) + "Kies". `VariantPuckPreview` kreeg `maxHeight` (thumbnail-cap) + `scroll` (leesbaar venster). Lost de twee gemelde issues (onleesbaar + selectie). tsc+lint 0; 67 web-page-builder smokes groen; detail-leesbaarheid visueel geverifieerd.

- Commit: branch `fix/step2-preview-thumbnails-detail`

### 307. Step 3 P2b — feature-beeld-transparantie + retry (landingspagina)

Vervolg op de Step-2-audit (W7: feature-beeld-budget 4 + 60s-timeout vielen stil terug op icons, zonder feedback welke). De Puck-builder (Step 3) detecteert nu features die als icon renderen (FeatureGrid/FeatureSplit zonder `imageUrl`) en toont een **opt-in** knop "N features zonder beeld" (geen waarschuwing — icon-design kan gewenst zijn). Klik genereert de ontbrekende beelden via `generateFeatureVisuals` (prompts uit de nu gedeelde `buildFeatureVisualInstruction`, geëxtraheerd naar `landing-page-visual-prompts.ts` zodat confirm-flow + Step 3 identieke prompts geven) en patcht de puckData **immutable** (alleen gewijzigde componenten + features-arrays gekloond) + persisteert + dispatcht `canvas:refresh-deliverable`. Toont "X/N gegenereerd" bij gedeeltelijk succes. tsc+lint 0; 67 web-page-builder smokes groen. **Hiermee is P2 (a+b) compleet; resteert P3 + P4 uit het verbeterplan.**

- Commit: branch `feat/step3-feature-image-retry`

### 306. Step 2 P2a — auto-iterate before/after-diff + iterate-tot-threshold (landingspagina)

Vervolg op de Step-2-audit (W5: auto-iterate was one-shot + opaak). "Verbeter variant automatisch" itereert nu **tot de drempel** (max 3×): elke iteratie voert het vorige resultaat terug en stopt zodra de fidelity-score ≥ drempel of niet verder verbetert (toont "Iteratie 2/3 — score …"). De uitkomst wordt **niet meer blind toegepast** maar als **voorstel** getoond: score before→after + een per-veld **before/after-diff** (nieuwe pure util `diffVariantCopy`, `src/lib/landing-pages/variant-copy-diff.ts`) met Toepassen/Verwerpen. Pas bij Toepassen wordt de variant vervangen + herscoord. tsc+lint 0; phase64 diff-smoke 9/9; 67 web-page-builder smokes groen.

- Commit: branch `feat/step2-auto-iterate-diff`

### 305. Step 2 P1b + P1c — per-sectie regenereren + tone/length-microtransforms (landingspagina)

Vervolg op de Step-2-audit (W2 + W3). **P1b — per-sectie regenereren**: `auto-iterate-variant`-route accepteert nu een optionele `section` (hero/trust/problem/features/socialProof/pricing/faq/finalCta); bij section-scope krijgt het een sectie-specifieke prompt-instructie, slaat het de "above-threshold"- + "no_improvement"-gates over (het is een expliciete regenereer-actie, geen auto-improve), en dwingt het de scope server-side af via een merge die ALLEEN die sectie vervangt (fallback op de originele sectie als de AI 'm wegliet → nooit `undefined` mergen). UI: een ↻-knop per sectie-header in `VariantCompareCard` (hero/problem/features/socialProof/faq/finalCta) werkt de lokale variant bij — gemerged in de laatste state zodat gelijktijdige edits aan andere secties overleven (geen clobber); de WYSIWYG-preview (P1a) werkt direct bij. **P1c — tone/length-microtransforms**: elk bewerkbaar veld krijgt in edit-mode Korter/Urgenter/Brand-voice-knoppen die de bestaande `useInlineTransform` (→ `inline-transform`-route, brand-voice-aware) hergebruiken; `deliverableId` via een `EditDeliverableCtx` (geen per-veld-prop). Adversariële review (6 dimensies) → 3 fixes toegepast (undefined-merge-fallback, regenerate-clobber-race via `vRef` + sectie-merge, skipped/no_improvement-afhandeling). tsc+lint 0; 66 web-page-builder smokes groen.

- Commit: branch `feat/step2-section-regen-microtransforms`

### 304. Step 2 P1a — WYSIWYG-preview per landingspagina-variant

Uit de Step-2-functionele audit (`docs/audits/2026-06-07-step2-functional-linkedin-vs-landingpage.md`): de landingspagina-Step-2 was functioneel armer dan de social-Step-2 — je bewerkte "blind" een tekstformulier en zag de echte pagina pas in Step 3 (W1). Nu rendert elke A/B-`VariantCompareCard` een **echte (geschaalde) Puck-preview** via dezelfde renderer als Step 3 (`buildSpikePuckConfig` + `variantToPuckDataFromStructured` + `<Render>`), passend op de kaart-breedte (`transform: scale`, gemeten via ResizeObserver), niet-interactief (`pointer-events:none`). De preview rendert uit de live `v`-state → veld-edits werken direct bij; het tekstformulier staat nu ingeklapt onder de preview (preview-first), de sticky "Kies deze variant"-knop blijft. Brand-fonts via `useBrandFontLoader`; a11y-style-block geïnjecteerd. Hero toont nog geen foto (die wordt bij de keuze gegenereerd) — wel echte layout/branding/typografie/kleur-banden/CTA-stijl. tsc+lint 0; visueel geverifieerd (2-up scaled cards, Napking).

- Commit: branch `feat/step2-wysiwyg-variant-preview`

### 303. Hero-image server-side gewired (einde client-race) — Napking + alle merken

De header-foto bleef leeg op opnieuw een merk (Napking): de hero-`canvas-visual` werd wél gegenereerd + geüpload (~21:30, nieuwste code) maar nooit in de puckData gebust (deliverable `updatedAt` onveranderd → de client-side persist landde niet). Root cause-klasse: de hero werd CLIENT-side gewired (confirm-flow + self-heal) wat structureel onbetrouwbaar is (re-hydrate-clobber + stale HMR over merges). **Fix: hero-wiring verplaatst naar de server.** De `generate-visual`-route accepteert nu `target: 'hero'` en bust ná een geslaagde upload de eerste URL ATOMISCH in `settings.puckData` (BrandHero) + `structuredVariant.hero` (read-modify-write op een verse settings-read). De server is de enige DB-autoriteit → dit landt gegarandeerd, onafhankelijk van client-races of HMR-staleness. Self-heal + confirm-flow geven nu `target:'hero'` mee; de self-heal dropt z'n client-PATCH en dispatcht alleen nog `canvas:refresh-deliverable` om de store te re-syncen. Immediate fix voor de bestaande Napking/BB-pagina's: bestaande canvas-visual via `scripts/dev/patch-hero-image.tsx` gewired. tsc+lint 0.

- Commit: branch `fix/hero-server-side-wiring`

### 302. generate-visual route robuust: upload-resilience + non-fatale persist (hero-betrouwbaarheid)

Vervolg op de header-foto-bug. Onderzoek (n.a.v. "orphaned canvas-visual-files op disk + 0 `DeliverableComponent variantGroup='visual'`-rows"): de 0-rows zijn NIET abnormaal — veel deliverables met een wérkende hero hebben óók 0 visual-rows (de hero leeft in `puckData.heroVisualUrl`, niet in DeliverableComponent). Write-path-probe bevestigde dat de `create()` valide is met de huidige Prisma-client. De échte fragiliteit zat in twee plekken die een geslaagde generatie alsnog beeldloos lieten eindigen: **(1)** de upload-loop was een kale `Promise.all` — faalde één download/overlay/upload, dan rejecte het geheel → de andere al-geüploade varianten werden georphand én de hele request 500'de (→ client kreeg geen URL → lege hero). Nu per-item try/catch + filter; 502 alleen als ÁLLE uploads falen. **(2)** een transient `prisma.$transaction`-fout 500'de de hele route → client kreeg geen `variants[0].url` → lege hero. Nu non-fataal: bij persist-fout retourneert de route tóch de geüploade URLs (zonder DB-id) zodat de hero alsnog landt; fidelity-scoring skipt de id-loze fallback-rows. Adversariële review: response-shape blijft geldig in alle paden, geen variabel-conflict. Plus eerdere fixes: hero self-heal await't de PATCH + dispatcht `canvas:refresh-deliverable` (clobber-race, PR #32). tsc+lint 0.

- Commit: branch `fix/generate-visual-robustness`

### 301. LP-render: contrast-veilige achtergrond-afwisseling tussen secties

User-eis: ritmiek in de LP zodat onderdelen visueel te onderscheiden zijn — zónder de valkuil van een bg-wijziging die de contrastratio breekt. Voor lichte merken renderde bijna elke sectie op `tokens.surface` (wit) → vlak. Nu: een `bandTone` ('base'|'alt') die de builder afwisselend toekent aan de "vlakke" secties (FeatureGrid/FeatureSplit/RichText/FAQ/PricingTable/StatsBlock) in finale volgorde (Hero/Testimonial/CTA/Footer hebben hun eigen distinctieve bg). De renderer leidt de sectie-bg af via `sectionBandBg(tokens, bandTone)` — 'alt' = een gescrapete `secondarySurface` (LINFI: cream) of anders een subtiele tint (surface 6% richting onSurface) — en **resolvet ALLE tekst/borders tegen die band-bg** i.p.v. de voorheen hardcoded `tokens.surface` (de contrast-valkuil): de audit-map (9 sectie-renderers) wees per sectie elke hardcoded-surface-referentie aan; FAQ/RichText/FeatureSplit/Pricing/StatsBlock/FeatureGrid alle omgezet (incl. de truly-flat FeatureGrid-cardBg → band, StatsBlock label/border dynamisch). Bestaande pagina's (gepersist vóór de feature) krijgen de bands alsnog via een idempotente normalisatie (`assignSectionBands`/`withSectionBands`) bij hydratie in `PuckPageBuilder` — geen regeneratie nodig. Cross-brand geverifieerd via render-harness (Better Brands neutraal-grijs, LINFI cream, Zwarthout grijs + dark-stats + peach-testimonial), alle tekst leesbaar. Deterministische contrast-garantie: phase63 (18/18 — alt-band houdt body-tekst AA voor light+dark surfaces; alternatie zonder twee gelijke buren). tsc+lint 0; 65 web-page-builder smokes groen (phase18-assertie geüpdatet: hero-CTA letterSpacing volgt nu tokens.button i.p.v. archetype-preset).

- Commit: branch `fix/lp-section-band-alternation`

### 300. LP-render: header-image-garantie + CTA conform brandstyle button-component + preset-audit

Vier Better Brands-bevindingen + een systeemaudit. **(1) Header-image altijd** — de hero-AI-gen draaide alleen in de Step 2-confirm-flow met een 45s-timeout; bij timeout/fout bleef de hero leeg. Nu: Step 3 **self-heal** in `PuckPageBuilder` (genereert + persisteert het beeld alsnog zodra de Medium-preview een BrandHero zónder beeld toont; één poging per deliverable per sessie) + confirm-flow gehard (45s→75s + 1 retry); `buildHeroVisualInstruction` geëxtraheerd naar gedeelde lib. **(2) CTA-knop zichtbaar + doel-URL** — een translucent scraped fill (`rgb(255 255 255 / .1)`) rendert onzichtbaar → `colorAlpha`/`isWeakButtonBackground` + `resolveCtaFill` vallen terug op de merk-accent; de bestaande Step 1-input `landingPageUrl` werd nooit naar de gerenderde `href` gebust (hardcoded `#`) → `resolveCtaHref` in beide builders, hero-CTA wordt navigerende `<a>`. **(3) CTA conform component** — `tokens.button` werd afgeleid uit de ruwe `buttonProfile` (kleur-only primary, geometrie verloren aan presets); nu reconcilieert `reconcileButtonWithComponent` met de accurate `StyleguideComponent` BUTTON-card (computed-style) → radius/border/gewicht/padding/grootte 1-op-1 als de Components-tab, voor élk merk. `resolveCtaVisual` respecteert outline (Better Brands/LINFI) vs filled (Zwarthout oranje, DTS blauw); hero+slot uit één bron. **(4) contrastRatio robuust** — normaliseert nu niet-6-hex kleuren (`rgb()`/space-syntax/named) — voorheen werd `rgb(255,255,255)` als zwart gemeten → witte tekst op een witte knop (LINFI). **Audit** `docs/audits/2026-06-07-archetype-preset-vs-scraped-audit.md`: buttons waren het enige geval waar een preset beschikbare accurate scraped data overschreef; resterend risico is structureel (FORM_INPUT latent + archetype-classificatie-afhankelijkheid). Cross-brand geverifieerd; tsc+lint 0; 63 web-page-builder smokes + phase61 (31/31) + phase62 (16/16) groen.

- Commit: branch `fix/lp-hero-sections-cta`

### 299. LP-render: single-image afdwingen + systematische contrast-borging + CTA-redesign

Drie user-bevindingen op de live Zwarthout-LP. **(1) Eén volledige afbeelding** — de AI-hero was een 3-panel collage/triptiek. `DEFAULT_NEGATIVE_SEGMENTS` (negative-prompts) uitgebreid met collage/triptych/diptych/split-screen/multi-panel/grid/borders/seams (geldt voor álle image-gen), + expliciete "A SINGLE cohesive full-frame photograph"-instructie in `buildHeroVisualInstruction` + `buildFeatureVisualInstruction`, + `negativePrompt` doorgegeven in de feature-visuals-route. **(2) Systematische contrast-borging** — nieuwe `safeHeadingColor(scraped, accent, onSurface, bg)` (accent-reservering + gegarandeerde contrast-clamp in één) toegepast op de tot dan ongeclampte kop-sites (FAQ-vraag, pricing-tier, RichText h1/h2/h3) — een lichte gescrapte kop-kleur op een lichte sectie werd onleesbaar (de FAQ-klacht); RichText-body ook geclampt (`readableTextColor`). Elke kop/body is nu contrast-geclampt, ongeacht klant. **(3) CTA-redesign** — de slot-CTA is nu een CONTAINED gebrande panel (donker-merk → donkere cinematische panel; light-merk → zachte brand-tint) met de merk-accent-knop (geen vibrant→charcoal-downgrade meer) i.p.v. losse tekst+donkere-knop op een leeg wit vlak. Cross-brand geverifieerd (Zwarthout/LINFI/Better Brands): FAQ leesbaar + CTA-panel adapteert dark/tint + accent-knop popt. Smoke phase59 (23/23, +5 contrast-guarantee-asserties); tsc+lint 0; sweep groen.

- Commit: branch `fix/lp-image-contrast-cta`

### 298. LP-render bugfix: hero-foto onzichtbaar (background-shorthand wist background-image op de client)

De hero-`<section>` zette in hetzelfde inline-style-object zowel de `background`-shorthand (dróeg de foto+scrim) ALS een `backgroundImage`-longhand die naar `undefined` resolvede. React's **client**-render past de shorthand toe en wist daarna `background-image` via de undefined longhand → de hero-foto verdween (witte kop op transparante/lichte sectie = onleesbaar). **SSR maskeerde het** (`renderToStaticMarkup` laat undefined uit de geserialiseerde style weg) — daardoor toonde elke server/harness-render de foto wél en leek alle data/serving/CSP correct. Fix: alleen longhands (`backgroundColor` + `backgroundImage` + `backgroundSize`/`Position`), nooit de shorthand ernaast. Root-cause + fix bewezen via Playwright (`getComputedStyle().backgroundImage`: buggy=`none`, fixed=`url(...)`). De feature-`<img>`-tags hadden het conflict niet en werkten al. tsc+lint 0; web-page-builder-sweep groen; gotchas-entry toegevoegd (klasse: meng nooit background-shorthand + longhand in React inline-style; verifieer render-bugs in een echte browser, niet alleen SSR).

- Commit: branch `fix/hero-background-image-shorthand`

### 297. Governed token-layer: provenance (V1–V5)

Provenance als first-class concept op de brandstyle/LP-token-laag, afgeleid van de Anthropic self-service-analytics les (één governed bron + herkomst bij elk antwoord + curatie op onzekerheid). **V1 (keystone)**: nieuwe `token-provenance.ts`; `extractBrandTokensWithProvenance` stempelt per kern-token de herkomst (scraped/logo/preset/fallback/derived)+confidence+bewijs tijdens het resolven (backward-compatible wrapper houdt `extractBrandTokensFromStyleguide`); doorgethread via `CanvasContextStack.brandProvenance`. Provenance is in-memory (deterministisch uit de styleguide), niet gepersisteerd. **V2**: `isScrapedOrigin()`-gate op `forceFlatCards` — archetype mag een echt-gescrapte card-shadow niet meer platslaan (de rest van de renderer deed al scraped-first). **V3**: user-facing data-quality-badge in `StyleguideHeader` ("N onzeker", via `data-quality.ts`) + developer-only `TokenProvenancePanel` op de LP-render (useDeveloperAccess-gated). **V4**: `BrandOnboardingWizard` onzekerheid-first — fallback/low-confidence kleuren+fonts bovenaan met gerichte jump (inline-edit + color-lock bewust gedescoped: `*Override`-flags beschermen profielen niet kleuren). **V5**: `[DET]` eval-suite `scripts/smoke-tests/brandstyle-provenance.ts` (24 asserts) + `npm run test:brandstyle-eval` + CI `.github/workflows/brandstyle-eval.yml` (ablation-per-PR op brandstyle/LP-paden). tsc 0; lint 0 errors; DET 24/24. **NB**: `canvas-context.ts` (V1) + `puck-config.tsx` (V2) belandden al op main via #25 door een parallelle-sessie `git add` in dezelfde werkboom; deze commit repareert main (de gecommitte imports verwezen naar de toen-nog-untracked `token-provenance.ts`).

- Audit: [docs/audits/2026-06-06-governed-token-layer-verbeterplan.md](audits/2026-06-06-governed-token-layer-verbeterplan.md)
- ADR: -
- Commit: 538ab8e5

### 296. Brandstyle: visualLanguage beschrijft resolved palette (Bootstrap-pollutie weg)

De visualLanguage-analyse (`colorApplication`/`promptFragment`/`summary`) draaide vóór de palette-resolutie en kreeg de rauwe gescrapte kleuren (`colorGroups.fromVariables/byFrequency`) incl. framework-defaults. Op een Bootstrap-site lekte zo `#7A00DF` paars als "primary" + de Bootstrap-semantiek in `promptFragment` — die via `brand-context.brandVisualLanguage` ALLE AI-generatie voedt (+ in de brandstyle-UI/PDF toont) — terwijl het resolved palet correct PRIMARY `#E06000` had. **Fix**: de `analyzeVisualLanguage`-call verplaatst naar ná `resolveColors` + usage-filter + `demoteAchromaticPrimary` + `capNeutrals`, gevoed met de definitieve resolved palette rol-gelabeld ("PRIMARY #E06000", "NEUTRAL #212529"); de prompt instrueert de AI expliciet alleen die kleuren te gebruiken. Live geverifieerd (Anthropic): output beschrijft "PRIMARY orange (#E06000) only for buttons/CTAs" + wit/charcoal achtergronden, ZERO Bootstrap-lek. tsc+lint 0; web-page-builder-sweep + brandstyle-provenance (24/24) groen. **Geldt voor toekomstige scrapes**; bestaande styleguides hebben de oude visualLanguage tot een (destructieve) re-scrape.

- Commit: branch `fix/visual-language-bootstrap-pollution`

### 295. LP-render AI-feature-beelden (P2 voltooid, budget 4/pagina)

Het laatste verbeterplan-gat: merken ZONDER bronbeeld (zwarthout, `brandImages=null`) krijgen nu AI-gegenereerde materiaal-/in-context-beelden op hun feature-cards → editorial FeatureSplit (P7) i.p.v. de icon-grid. Nieuwe lean route `POST /api/studio/[id]/generate-feature-visuals` (genereert per prompt, max 4, één beeld via fal.ai — hergebruikt model-selectie + brand-style-anchors + storage-upload; apart van generate-visual zodat de hero-picker onaangeroerd blijft). `canvas.api.generateFeatureVisuals` wrapper + `buildFeatureVisualInstruction` (per-feature materiaal-shot-prompt). `handleChooseVariant` hanteert beeld-prioriteit **handmatig > brandImages > AI**: brandImages-producer eerst, dan AI-gen voor lege hero/feature-slots (budget 4, 60s-race, best-effort). Partiële vulling valt terug op FeatureGrid die de geslaagde beelden als kaarten toont (geen discard — adversariële review-response). Gen-core live geverifieerd (fal.ai nano-banana-pro): 4/4 charred-timber feature-beelden voor zwarthout, gerenderd in de FeatureSplit. Smoke phase60 (19/19); tsc 0; lint 0 errors; sweep groen. **Hiermee is het volledige LP-design verbeterplan (12 principes + card-fix) geland.** Volledige browser-flow van de auth'd route = gebruikers-verificatie (net als hero-gen #290).

- Commit: branch `feat/lp-ai-feature-images`

### 294. LP-render P2 beeld-producer + P7 editorial split-layout

De laatste verbeterplan-tracks. **P2 (beeld-producer)**: `assignBrandImagesToVariant` vult lege hero/feature-beeld-slots met de brand-eigen `brandImages` (uit `BrandStyleguide.brandImages`, nu via canvas-context in de ctx) — merken MÉT bronbeeld krijgen echte foto's i.p.v. placeholders; alleen lege slots, in volgorde. `parseBrandImages` tolereert het scalar/null Json-veld + weert malformed URLs. **P7 (split-layout)**: nieuw `FeatureSplit`-component — features als editorial A-B-A-B volle-breedte rijen (beeld/tekst afwisselend per rij) i.p.v. een 3-koloms grid; de mapper kiest FeatureSplit wanneer ALLE features beeld dragen, anders FeatureGrid. **Cross-brand visueel geverifieerd**: Adullam (7 echte brandImages → hero + split-rijen met echte foto's), Zwarthout (placeholders → split); merk zonder bronbeeld = no-op. Adversariële review: SHIP (geen CRITICAL/WARNING; 1 NIT — URL-validatie — gefixt). Smoke phase60 (17/17); phase2 11→12 componenten; tsc+lint 0; sweep groen. Resterend P2: AI-per-feature-gen voor merken zonder bronbeeld (generateImage-infra bestaat; per-feature-gen = kosten/latency-keuze).

- Commit: branch `feat/lp-p2-p7`

### 293. LP-render copy-laag (P1/P4/P11): descriptieve header + PAS-binding + laagdrempelige CTA

De content-engine-laag van het verbeterplan in de variant-generator-prompt (`src/lib/landing-pages/variant-generator.ts`). **P1**: hero-headline van "benefit-led, max 44" → DESCRIPTIEF (noem WAT je verkoopt + differentiator, slaag voor de 5-seconden-test), aligned op de 60-char schema (prompt zat nog op de stale 44); subhead = believability-line ≤25 woorden. **P4**: feature-pilaren binden terug op de hero-belofte (PAS-narratief: problem → features-bewijs als één doorlopende boog) i.p.v. losse features. **P11**: primaire CTA = laagdrempelige micro-commitment (stalen/demo/adviesgesprek) i.p.v. een zware ask voor een koude lezer. **Geverifieerd via LIVE Anthropic-generatie** (nieuw dev-tool `scripts/dev/gen-lp-variant.tsx`) voor Zwarthout: headline "Verkoold gevelhout dat een leven lang zwart blijft" (50ch), 4 pilaar-bewijzende features, CTA "Vraag stalen aan", objectie-FAQ — gerenderd met de echte AI-copy via de render-harness. Prompt-structuur-smoke phase8 (39/39, +6 asserties); tsc+lint 0. Resterende follow-up: beeld-producer P2 (AI-feature-gen = infra/kosten-beslissing) + A-B-A-B split-layouts P7 (nieuwe componenten).

- Commit: branch `feat/lp-copy-layer`

### 292. LP-render verbeterplan: card-fix + accent-reservering + dark-ritme + measure-cap + trust-badge

De renderer-side tracks uit het deep-design verbeterplan (`docs/audits/2026-06-06-lp-design-verbeterplan.md` DEEL 5) gebouwd + visueel geverifieerd (SSR `<Render>` met echte DB-tokens → Playwright-screenshot; dev-tool `scripts/dev/render-lp-screenshot.tsx`), **cross-brand getest op Zwarthout + LINFI + Better Brands zonder regressies**. **Card-fix**: `isCardContextMismatch` negeert een mis-gescrapte near-black PRODUCT_CARD op een lichte sectie (Zwarthout's zwarte blokken) → sectie-passende styling. **P8 accent-reservering**: `reserveAccentForHeading` maakt accent-gekleurde koppen charcoal en reserveert de accent voor CTA/stats/eyebrow; de primaire hero-CTA draagt nu de accent (contrast-geclampt). **P3/P7/P9 dark-ritme**: de stats-band is een cinematische dark accent-beat voor élk merk met `hasDarkSections`+`darkSectionBg` (was archetype-beperkt). **P12**: RichText body measure-cap 40em + leading 1.6. **P10**: trust-items krijgen een badge-check-icon. Nieuwe smokes phase58 (12/12) + phase59 (12/12); tsc+lint 0; sweep groen; 3-dimensie adversariële review-workflow vóór merge. Copy-laag (P1/P4/P11) + beeld-producer (P2) + layout-alternatie (P7) blijven follow-up (content-engine / AI-gen-infra).

- Commit: branch `feat/lp-verbeterplan`

### 291. LP-render: resterende tracks (E-1/Track 2/E-3) + deep-design verbeterplan

De resterende tracks uit de Zwarthout-audit afgehandeld + een diepgaand best-practice design-onderzoek (4 lenzen / NN/g·Shapiro·CXL·Refactoring UI·Baymard) vertaald naar een verbeterplan. **E-1**: hero-h1 gebruikt de per-rol gescrapte `tbr.display.fontFamily`; `useBrandFontLoader` laadt per-rol display/heading/body/label-families. **Track 2**: per-feature beeld-infra — `imageUrl`-slot op `featureItemSchema`+`FeatureItem`, FeatureGrid rendert een `<img>` (vervangt de icon-badge) wanneer aanwezig, mapper threadt het door (producer = verbeterplan). **E-3**: non-Google font-bronnen — `BrandTokens.fontAssets`+`adobeFontsKitId` (workspace-kit) gedragen door de extractor; de canvas-loader laadt UPLOADED via `@font-face` + ADOBE_FONTS via de gedeelde `injectTypekitCss`, en sluit hun families uit de Google-aanvraag. **Track 6 gereframed**: DB-inspectie toont dat `hasDarkSections` al `true` is (#212529 = `background`+`dark`, L=14,5%); de vlakke hero was de pre-#290 race, niet een extractie-gat → opgelost door #289+#290. Data-quality cross-ref: Zwarthout's `visualLanguage.promptFragment` noemt nog `#7A00DF` purple als primary (Bootstrap-vervuiling → upstream brandstyle-extractie). Verbeterplan: `docs/audits/2026-06-06-lp-design-verbeterplan.md` (12 principes + Top-5 architecturale tracks). Nieuwe smokes phase56 (8/8) + phase57 (13/13), stale phase30-assertie bijgewerkt; tsc+lint 0; sweep (58 smokes) groen.

- Commit: branch `fix/lp-render-remaining-tracks`

### 290. LP-render: AI-hero-image deterministisch (geen kleurblok meer)

De verplichte hero-image werd fire-and-forget gegenereerd ná `onAdvance` → de pagina opende soms zonder foto (kleurblok), en de foto patchte er pas later (of nooit) in. `handleChooseVariant` genereert de hero nu **vóór** de éne persist en vouwt de URL IN de variant → Step 3 rendert de pagina mét de foto (deterministisch). `generateHeroVisualUrl` (puur, returnt URL) gesplitst van `generateHeroVisualFor`; 45s-race-ceiling zodat een hangende image-API de keuze-flow niet blokkeert (bij timeout: pagina zonder foto + duidelijke melding). De eerder onzichtbare `visualError`/`isGeneratingVisual`-state wordt nu getoond in de keuze-view (review-fix). tsc+lint 0; LP-smokes groen.

- Commit: branch `fix/lp-hero-gen-deterministic`

### 289. LP-render (Medium): contrast + typografie-load + ritmiek (Zwarthout-analyse)

Gegenereerde Zwarthout-landingspagina was deels onleesbaar/flets. Audit: `docs/audits/2026-06-06-lp-render-zwarthout.md` (2 workflows / 6 dimensies). Drie tracks: **Track 1 Contrast** (`resolveOnColor` clampt elke tekstkleur tegen de WERKELIJK gerenderde bg, + `normalizeColorToHex` voor gescrapte `rgb()`/3-digit; display/kop 3.0, body 5.0; full-bleed gebruikt scrim-kleur); **Track 3 Typografie laadt** (`stripFontWeightSuffix` "Sen Bold"→"Sen" + 'roboto' uit loader-`SYSTEM_FONTS` + weight-strip); **Track 4 Ritmiek** (preset-`sectionPaddingY` geclampt [40,56], 100vh-hero alleen bij image/placeholder-frame, final-CTA-kop als `BrandCTA.heading`). 2-reviewer: 1 CRITICAL (niet-hex bg→wit-op-wit) + 3 WARNING gefixt. Smokes `phase53/54/55`, stale `phase9/11/18` geüpdatet, sweep groen. (Changelog-entry miste in PR #20 door commit-na-push; code wél gemerged `0d289d2f`.) Gescoped/resteert: Track 2 beeld (zwarthout `brandImages`=null), Track 6 donker-sectie-extractie, E-1/E-3.

- Commit: PR #20 (`0d289d2f`)

### 288. Brandstyle: screenshotter page-load robuust (networkidle-hang → domcontentloaded + capped settle)

De component-screenshotter gebruikte `page.goto(..., waitUntil: 'networkidle')`. Op sites met doorlopende netwerk-activiteit (WordPress-plugins/ads/analytics/polling) settelde networkidle nooit → 30s-timeout → pagina overgeslagen → géén multi-page bulk computed-styles → usage-filter zonder primair signaal (de napking-variantie uit #287's observability).

- **Goto via `domcontentloaded`** (render-blocking CSS is dan al toegepast, hangt niet op continu netwerk) + een **best-effort gecapte settle**: `waitForLoadState('networkidle', 6s)` + `document.fonts.ready` (geracet met 2s-cap) + 400ms — elk niet-blokkerend (`.catch`), dus nooit meer een 30s-hang.
- **SPA-skeleton-guard** (review-fix): is de DOM ná de settle nog < `SPA_SKELETON_FLOOR` (30) elementen, dan één begrensde extra settle (networkidle 4s + 600ms) zodat een client-rendered SPA mid-hydratie geen skeleton laat scannen (en echte merk-kleuren niet als "ongebruikt" gedropt worden).

**Validatie**: live-test napking.nl — nieuwe strategie 1.3s, 553 elementen mét computed color + resolved body-bg (volledige extractie), skeleton-guard vuurt correct NIET op de echte DOM. Adversariële review: SHIP-WITH-FIX (beide fixes — `.catch` op `waitForTimeout` + skeleton-guard — toegepast). tsc 0 / lint 0.

- Commit: branch `fix/screenshotter-load-strategy`

### 287. Brandstyle: 3 gedeferde follow-ups (observed-pairs persist + kleur-mutatie onError + screenshotter-observability)

Drie open punten uit de #17-merge opgepakt:

- **Observed kleurcombinaties blijven behouden bij handmatige edit.** Nieuw `BrandStyleguide.observedColorPairs Json?` (raw fg|bg-paren) wordt bij de scrape gepersisteerd; `recomputeColorPairings` heromapt die observed paren op het BEWERKTE palet via `buildObservedColorPairings` (verwijderde kleur valt vanzelf weg, re-add herstelt), met fallback naar gegenereerd als er geen observed data is (oude styleguides). Voorheen degradeerden de combinaties bij de eerste add/delete naar gegenereerd. Additieve nullable kolom (`db push`), geen backfill.
- **Kleur-mutaties surfacen fouten.** `ColorsSection` toont nu een inline `role="alert"` bij een gefaalde add/delete (volgt het bestaande `ReviewDraftPanel`-idioom: lokale `useState` + `onError`, geen toast) + per-rij delete-spinner/disabled. Voorheen werd een 500 (bv. recompute-throw) stil geslikt.
- **Multi-page no-usage-data observeerbaar.** De usage-filter valt soms terug op de homepage pixel-pass omdat de component-screenshotter geen multi-page bulk-data leverde — eerder stil in 2 van 4 gevallen. 4 log/marker-toevoegingen (env-uit-log, bulk-PRESENT/ABSENT-log, "no bulk gathered"-warn, durable `multi-page-usage` provenance-marker in `frameworks`) maken elk geval traceerbaar. Geen control-flow-wijziging. (.env.local heeft de env aan → de napking-variantie is een runtime networkidle-hang, niet de env.)

**Review** (2 reviewers): 0 CRITICAL / 0 WARNING. **Bewijs**: nieuwe smoke `phase52` 10/10 (delete/re-add re-mapping + fallback); phase43/47/48/49/50/51 groen; tsc 0 / lint 0.

- Commit: branch `fix/brandstyle-deferred-followups`

### 286. Brandstyle palet: neutral-overpopulatie aangescherpt (cap 6 → 4)

Cross-brand controle (betterbrands.nl, een Tailwind-site) toonde 6 distincte grijzen die allemaal écht renderen maar de styleguide overpopuleren. `MAX_NEUTRALS` van 6 → 4: donkerste (tekst) + lichtste (surface) + de **2 meest-gebruikte** mid-grijzen (op `renderedWeight`). De mids worden op werkelijk gebruik gerangschikt — een functionele border-grijs (napking #6B7280) overleeft dus op merite, géén straf voor framework-herkomst, zodat de eerder gemaakte #6B7280-keuze bewaakt blijft. Merk-kleuren onaangeroerd; Zwarthout (2 neutrals) onveranderd.

**Bewijs**: smoke `phase49` 38/38 (betterbrands-achtig 6 → 4, usage-ranked mids, Slate Gray behouden, minst-gebruikte gevallen, greens intact, + her-cap-na-swap); phase47/48/50/51 groen; tsc+lint 0.

**Finalize-review-fix**: `demoteAchromaticPrimary` demote de ex-PRIMARY naar NEUTRAL ná de cap-in-de-filter → `capNeutrals` her-cap't ná de swap (geëxporteerd uit de filter), zodat een redundante near-black niet als 5e neutral binnenkomt en de cap (4) consistent blijft.

- Commit: branch `fix/brandstyle-extraction`

### 285. Brandstyle palet: strenge framework-match tegen "geleende" usage

Napking re-scrape (na #283, vers-herstarte dev-server, mét multi-page usage-data) hield Gutenberg-default **#ABB8C3** vast terwijl WP-admin #007CBA correct viel. Root-cause: #ABB8C3 rendert zélf nergens, maar ligt ~33 RGB van de echt-gerenderde Tailwind-grijs **#9CA3AF** (en ~31 van sage #A2B8A5) — binnen de losse `MATCH_TOLERANCE` (40). Zo absorbeerde de geleakte default het gebruik van z'n buurman → false-`strong` → overleefde de framework-gate. (Diagnose: live curl van napking.nl + afstandsberekening; de re-scrape zélf draaide op verse code na een stale-dev-server-restart.)

- **`renderStrength`** kreeg een optionele `tolerance`-param; **`STRICT_FRAMEWORK_TOLERANCE = 6`**.
- **`keep()`**: een framework-default behoudt mét multi-page-data alléén via een **near-exact** render (strict 6) — geen absorptie meer van een naburige kleur. Een ECHT toegepaste framework-kleur rendert op z'n exacte computed-waarde (dist 0), dus blijft. Zónder multi-page valt het terug op het #283-pixel-pass-gedrag.

**Review** (2 adversariële rondes op de geïmplementeerde code): ronde-1 ving een **severe over-drop** (de strict-only-versie negeerde de pixel-pass in de default-config zónder screenshotter → echte framework-merk-kleuren vielen) + een onder-drop (#ABB8C3 ↔ Bootstrap gray-500 #ADB5BD dist 7) → beide gefixt (pixel-pad hersteld voor no-multi-page; tolerantie 12→6); ronde-2 = SHIP (één narrow framework-only threshold-bias bewust geaccepteerd — een pixel-pad-fallback zou de #ABB8C3-absorptie heropenen).

**Bewijs**: smoke `phase51` 21/21 (incl. strict-match, Regression A pixel-strong-keep, Regression B #ADB5BD); napking-exact verificatie dropt #ABB8C3 in zowel multi-page als pixel-only config; phase47/48/49/50 groen; tsc+lint 0. **Vereist re-scrape Napking** → palet = Ocean Blue + charcoal/soft-white/slate/brown, géén #ABB8C3.

- Task: audit `docs/audits/2026-06-05-brandstyle-cross-brand-palette.md`
- Commit: branch `fix/brandstyle-extraction`

### 284. Brandstyle Typography-fonts-fix: Adobe-CLS-fallback canonicalisatie + geconsolideerd load-pad + weight-consistentie

De Typography-tab presenteerde gescrapte merk-fonts onjuist: Adobe's auto-gegenereerde CLS-fallback-family (`effra-fallback`) lekte als zelfstandige "Secondary/heading"-merkfont (D1), werd als heading-familie gekozen (D2), verscheen als dubbele kaart (D3), laadde inconsistent (D4), toonde de rauwe CSS-stack als label (D5) en de type-scale had gemengde eenheden (D6). Root-cause: de scrape-bron werd niet gecanonicaliseerd vóór de DB-split + twee divergerende font-load-paden.

- **Bron-canonicalisatie (F1)**: `canonicalizeFontFamily` + `dedupeBrandFonts` (pure helpers in `font-fallback.ts`, gedeelde `font-generic-families.ts`) strippen de `[\s-]fallback$`-suffix + generieke families + dedup `X`/`X-fallback`, toegepast vóór de split in `writeResultToDb` én in `selectDetectedFontNames`; `assignRole` + de computed-style-classifier (`normalizeName`) canonicaliseren beide vergelijkingszijden.
- **Extractor + type-scale (F2)**: extractor kiest de eerste *canoniceerbare* family (niet `split(',')[0]`); `normalizeTypeScale` (`type-scale-normalizer.ts`) normaliseert eenheden → rem met veldbehoud (object-spread), BEWUST geen dedup/level-collision (dat brak de size-gedreven `mapTypographyRoles`).
- **Load-pad + display (F3)**: `font-loading.ts` (`resolveFontRender`) + `typography-display.ts` consolideren FontCard + TypographySection op één availability-gedreven pad (substitute in de stack i.p.v. 404'ende Google-link); group-label toont alleen de family-naam; substitute-badge.
- **Weight-consistentie**: gedeelde `weightForLevel(level, scrapedWeight)` zodat Type-Scale- en In-Context-secties dezelfde heading-weights renderen (was 400 vs 700 bij lege scrape).
- **Smoke-suite hersteld**: de `smoke:web-page-builder`-keten was rood door pre-existing failures (gemaskeerd door early-exit op phase2); phase2/18/23/39 gediagnosticeerd (stale-assertie vs intentionele renderer-evolutie) en gefixt → 43/43 groen.

**Review**: 2 adversariële review-rondes (4 agents) → 0 CRITICAL; 2 WARNINGs gefixt (classifier `-fallback`-alignment + `useEffect` `workspaceKitId`-dep); ronde-2 = No issues found.

**Bewijs**: re-scrape Napking geverifieerd via psql (`effra-fallback` weg uit additionalFonts + StyleguideFont; typeScale → rem); nieuwe `smoke:brandstyle-typography` (phase44/45) + volledige web-page-builder-keten exit 0; tsc + lint 0.

- Task: [tasks/done/brandstyle-typography-fonts.md](tasks/done/brandstyle-typography-fonts.md)
- ADR: [docs/adr/2026-06-05-typography-font-canonicalization.md](docs/adr/2026-06-05-typography-font-canonicalization.md)
- Commit: branch fix/brandstyle-extraction

### 283. Brandstyle palet: framework-defaults moeten gebruik bewijzen (geen benefit-of-the-doubt)

Napking re-scrape (na #282) bevestigde PRIMARY = Ocean Blue #008ACF ✓, maar bij een controle tegen de **echte** napking.nl bleken twee framework-leaks: ACCENT "Deep Blue #007CBA" = de **WordPress-admin-kleur** (`--wp-admin-theme-color`, 0× in de gebruikte CSS) en Cool Gray #ABB8C3 = **Gutenberg core-default** ("Cyan bluish gray"). Beide overleefden omdat deze re-scrape géén multi-page usage-data had en `keep()` onbemeten kleuren benefit-of-the-doubt gaf (`!known → keep`) vóór de framework-gate.

- **`isFrameworkOrigin`** uitgebreid met de WP-admin-theme-color-familie (#007CBA/#006BA1/#005A87) — usage-gegate, géén hard-blocklist (blauw kan met corporate-merk-blauw overlappen).
- **`keep()` herordend**: framework-default-kleuren moeten POSITIEF sterk gebruik tonen. Zonder usage-data vallen alléén de **hex-bevestigde geleakte klassen** (`isFrameworkLeakHex` = CMS-neutral-grijzen + WP-admin-blauw); een **saturated framework-default-primary** (Bootstrap #0D6EFD/#20C997) houdt z'n benefit-of-the-doubt (kan een bewuste merk-kleur zijn → geen grayscale). Met usage-data is het gedrag byte-identiek aan vóór deze wijziging.

**Review** (2 adversariële agents): ronde-1 ving een over-drop (de oude reorder grayscale'de Bootstrap-merk-paletten zonder data) → gefixt met de leak-hex-split; ronde-2 op de verfijnde logica = **SHIP** (Leak ⊆ Origin bewezen, with-data-pad onveranderd, structurele bescherming intact).

**Bewijs**: nieuwe smoke `phase51` 14/14 (incl. over-drop-guard #0D6EFD/#20C997 behouden, #ABB8C3/#007CBA gedropt); `phase47` 24/24 (stale "keep-all"-assertie geüpdatet); 48/49/50 groen; tsc+lint 0. Grondwaarheid: napking.nl is WordPress+WooCommerce+Gutenberg+Tailwind (curl bevestigde #007CBA = WP-admin-var, font = Adobe "effra"). **Vereist re-scrape Napking** → verwacht: #007CBA + #ABB8C3 weg.

- Task: audit `docs/audits/2026-06-05-brandstyle-cross-brand-palette.md`
- Commit: branch `fix/brandstyle-extraction`

### 282. Brandstyle palet: brand-PRIMARY uit merk-signaal i.p.v. frequentie

Napking re-scrape onthulde dat de PRIMARY de near-black TEKSTkleur (#1A171B "Deep Charcoal") was, terwijl de échte merk-kleur (Ocean Blue #008ACF — letterlijk genoemd in de logo-guidelines: *"the brand's Ocean Blue (#008ACF)"*) naar ACCENT zakte. Root-cause: de AI-classifier kent PRIMARY toe aan de meest-prominente kleur, en op een merk met een achromatisch wordmark + chromatische accent is dat de ubiquitaire tekstkleur; de logo-pixel-rescue ving het niet (`brandImages` null + een overwegend-zwart wordmark levert via histogram tóch charcoal). Dit was de gedeferde "Fase 4" uit `docs/audits/2026-06-05-brandstyle-cross-brand-palette.md`.

- **`demoteAchromaticPrimary`** (`analysis-engine.ts`, array-niveau spiegel van `reclassifySaturatedNeutral`): demote een achromatische PRIMARY → NEUTRAL en promote de sterkste chromatische merk-kleur → PRIMARY, alléén met POSITIEF merk-bewijs (logo-guideline-vermelding +5, detector/vision-primary +4, vision-cta/accent +2, sterk gebruik +2, core-brand-tag +1; drempel 3 — een losse tag is onvoldoende). Draait NÁ de usage-filter zodat een gepromote kleur al door werkelijk-gebruik is gegaan.
- **Guards** (no-op): chromatische primary (Zwarthout-oranje), monochrome merken (geen chromatisch alternatief), detector/logo-asserted zwart zonder logo-genoemde chromatische hex; **nooit** framework/social/low-confidence/status-kleur gepromote; verzadigde donker-navy/teal primary (#0A1A2F s65) niet gedemote.

**Review**: 2 adversariële workflows (ontwerp + geïmplementeerde code), 6 lenzen, 13 agents → unaniem SHIP; 5 design-flaws vooraf ingebouwd (na-filter-plaatsing, saturatie-gegate achromatic-test, out-evidence-drempel tegen link-blauw-kaping, exact-token alert-tags, hoofdletter-ongevoelige hex-match).

**Bewijs**: smoke `web-page-builder-phase50-primary-from-brand-signal` 20/20 (alle 8 archetypes incl. red-team-regressies); tsc+lint 0; phase47/48/49 groen. **Vereist re-scrape Napking** → verwacht PRIMARY = Ocean Blue, Deep Charcoal → NEUTRAL.

- Task: audit `docs/audits/2026-06-05-brandstyle-cross-brand-palette.md`
- Commit: branch `fix/brandstyle-extraction`

### 281. Brandstyle palet: cross-brand — non-brand-uitsluiting + neutral-consolidatie

Cross-brand audit (Zwarthout schoon vs Napking vervuild; DB over ~10 merken): de usage+framework-filter ving Bootstrap-ruis maar niet (a) third-party widget/social-share-kleuren (napking WhatsApp #25D366; peoplemasterminds **8** social-netwerk-kleuren als brand-SECONDARY/ACCENT) en (b) CMS-admin-kleuren (WordPress #007CBA), én er was (c) universele neutral-overpopulatie (5-10 grijzen/merk). Audit: `docs/audits/2026-06-05-brandstyle-cross-brand-palette.md`. Inzicht: de AI tagt de ruis al zelf (`social`/`whatsapp`/`admin`/`system`).

- **Fase 1 — non-brand-uitsluiting** (`non-brand-colors.ts`): `isNonBrandColor` weert widget/social/admin-kleuren **altijd** (ongeacht usage, anders dan framework-defaults) — primair via de AI-tags, met een ZEER beperkte hex-backstop (alleen distinctieve niet-blauwe hexes: WhatsApp-groen, Instagram-pink). Bedraad in de usage-filter (`keep()`), maar **logo-kleuren winnen** (een wordmark-kleur is per definitie merk-eigen).
- **Fase 2 — neutral-consolidatie**: bijna-identieke NEUTRALs (kleur-afstand) worden samengevoegd tot één representant (meest-gebruikt), met behoud van donkerste+lichtste, cap 6, alléén bij render-bewijs. Napking 7 grijzen → 5; WhatsApp/WordPress weg; Ocean Blue (echte accent) blijft.

**Review** (adversariële 3-lens): 2 CRITICAL + 4 MAJOR gevonden+gefixt: `#FF0000` weerde elk merk-rood (verwijderd), WP-admin/Telegram/Twitter-blauwen weerden een corporate-blauw-band (alle blauwe platform-hexes uit de backstop → alléén via tag), safety-fallback heropende non-brand (→ brandPool-fallback), hard-exclude vóór logo (→ logo wint), consolidatie zonder render-bewijs (→ render-gated), MAX_NEUTRALS-amputatie (→ dedup-eerst + cap 6). De smoke ving daarna nog 2 over-reach-hexes (Telegram~Ocean Blue, Twitter~Material).

**Bewijs**: smoke `web-page-builder-phase49-cross-brand-palette` 27/27; phase43/45/47/48 groen; tsc+lint 0. **Vereist re-scrape (Napking + peoplemasterminds + Zwarthout-regressie) voor volledige validatie.**

- Task: audit `docs/audits/2026-06-05-brandstyle-cross-brand-palette.md`
- Commit: branch `fix/brandstyle-extraction`

### 280. Brandstyle palet: usage-gedreven filter (multi-page) i.p.v. hex-blocklist

User-eis na re-scrape: een kleur mag ALLEEN uit het palet vallen als hij aantoonbaar niet gebruikt wordt — niet op een hardgecodeerde hex-lijst (die brittle is + een echt-gebruikte kleur kan overslaan). Nieuwe `palette-usage-filter.ts` beslist op **werkelijk renderen**:

- **Signalen**: multi-page computed `color`/`background-color`/`border-color`-frequenties (uit de component-screenshotter, ~5 pagina's; `bulk-computed-styles`) + de homepage pixel-pass usageEvidence (`color-usage-verifier`). Bestond al, maar de multi-page-data werd niet in het keep/drop-besluit gebruikt en de pixel-pass keek alleen naar de homepage.
- **Regel**: logo + structurele kleuren (donkerste tekst / lichtste surface, over de gerenderde subset) altijd; geen usage-data → behouden (afwezigheid van bewijs ≠ bewijs van afwezigheid); rendert nergens → drop; framework-default → alleen bij STERK gebruik; elke andere gebruikte kleur → behouden. De oude hex/tag-drop (`isFrameworkNoiseColor`) is verwijderd; `resolveColors` geeft nu het volledige palet, de filter draait ná de component-screenshotter vóór persist.

Hiermee blijft bv. Slate Gray staan *omdat* hij aantoonbaar als muted tekst rendert (multi-page geverifieerd), terwijl een framework-kleur die nergens rendert (Bootstrap Blue) valt — en een wél-gebruikte kleur wordt nooit overgeslagen.

**Review**: adversariële 3-lens workflow → geen CRITICAL. Gefixt: MAJOR-1 (gefaalde/lege pixel-pass schreef `'none'` = "kon-niet-meten" → engine-guard negeert de pixel-pass zonder positief signaal, anders over-drop), MAJOR-2 (`border-color` toegevoegd zodat border-only accenten meetellen), MAJOR-3 (`renderStrength` sample-floor: 'strong' vereist ≥60 samples zodat een dunne pagina geen framework-kleur "strong" maakt), MINOR-1 (structureel over gerenderde subset), MINOR-2 (RGB-tolerantie 24→40, gelijk met de verifier), MINOR-3 (dode `isFrameworkNoiseColor` + phase46-smoke verwijderd). De smoke ving daarvóór al 2 bugs (transparant-regex matchte `rgb(r,g,0)`; drop-alleen-bij-bewijs).

**Bewijs**: smoke `web-page-builder-phase47-usage-filter` 21/21; regressie 44/45 groen; tsc+lint 0. **Vereist re-scrape voor volledige validatie** (Track A): `border-color`-collector + multi-page usage zijn pas op een live render te bevestigen.

- Task: vervolg op `docs/audits/2026-06-05-brandstyle-palette-framework-cleanup.md`
- Commit: branch `fix/brandstyle-extraction`

### 279. Brandstyle palet-framework-cleanup + Voice-analyse resilient (Fase A/C/E/F)

Verse re-scrape Zwarthout ná #278 toonde de kern-oorzaak achter alle kleur-klachten (kleurcombinaties/buttons/effects "niet op de site", overbodige kleuren, dubbel overzicht): het palet was **100% Bootstrap/WordPress framework-defaults** (12 kleuren, 6 getagd `unused`; echt logo-oranje ontbreekt). Plan + diagnose: `docs/audits/2026-06-05-brandstyle-palette-framework-cleanup.md`.

- **Fase A — palet de-frameworken**: nieuwe `isFrameworkNoiseColor` dropt in `resolveColors` framework-herkomst (Bootstrap/WordPress-tag exact-token of bekende hex) ÉN ongebruikt (`usageEvidence==='none'`/`unused`-tag), behoudt logo/gebruikte kleuren + de donkerste tekstkleur (tie-break op tekst-tag), met safety tegen leeg palet. `isFrameworkDefaultPrimary`-hexlijst verbreed. Zwarthout: dropt exact de 6 ongebruikte Bootstrap-kleuren (de bron van de slechte accent-pairings + teal/paars-gradients). **Fase C** (kleurcombinaties alleen echte kleuren) volgt automatisch uit A. **Fase E** — `SystemRolesSection` verwijderd; Color System is het enige kleur-overzicht (user-keuze). **Fase F** — "Recommended"-badge op verzonnen gradients (provenance uit de `RECOMMENDED:`-prefix).
- **Voice & imagery resilient (bonus)**: een Claude-JSON-hiccup in de voice-stap (malformed JSON, bv. onontsnapte quote in een geciteerde merk-frase) blokkeerde de HELE analyse. Nu niet-fataal: log + ga door met lege voice-data zodat kleuren/componenten/visual system wél persisten; + prompt-hardening (geen onontsnapte `"` in string-values).

**Iteratie 2 (na re-scrape-feedback)**: het palet bleef framework-vol omdat (a) de AI dit keer `framework`-tags zette (mijn FRAMEWORK_TAGS miste `framework`) en (b) Bootstrap's default link-blauw `usage:link` (zwakke usage) droeg, wat mijn `hasUsage`-guard spaarde. **Fase A verscherpt**: drop een framework-origin-kleur (tag `framework`/bootstrap/… of bekende hex, incl. Bootstrap semantic-hexes #198754/#FFC107/#DC3545) TENZIJ `usageEvidence==='strong'` — zwakke link/border-usage is geen brand-usage. Zwarthout dropt nu alle 6 framework-defaults, behoudt alleen de echte tekst/surface (Deep Charcoal + Soft White). **Fase B gebouwd**: de multi-page-merge gaf `logoColors` niet door → de logo-kleur-rescue draaide nooit → Zwarthout's oranje ontbrak volledig. 1-regel-fix (`logoColors: homepage.logoColors`); de rescue voegt nu het logo-oranje als PRIMARY toe. Smoke `phase46` 21/21 (14:20-palet → exact 6 framework-defaults gedropt). `[RE-SCRAPE]` validatie vereist.

**Gedeferd `[RE-SCRAPE]`**: Fase D (form-inputs computed-style-fallback). **Review (iter 1)**: adversariële 3-lens workflow → geen CRITICAL/MAJOR bevestigd; gefixt: exact-token-match (anti over-drop), donkerste-tie-break, NL→EN-badge, scrapedJson-comment, orphaned override-editor gedocumenteerd (0/15 styleguides hebben overrides).

**Bewijs**: smoke `web-page-builder-phase46-palette-framework` 20/20 (Zwarthout-palet → exact 6 unused gedropt) + phase45 58/58; tsc+lint 0. **Vereist re-scrape zwarthout.com voor volledige validatie** (Track A).

- Task: audit `docs/audits/2026-06-05-brandstyle-palette-framework-cleanup.md`
- Commit: branch `fix/brandstyle-extraction`

### 278. Brandstyle resultaat-audit fixes — components-depth + elevation + typografie + kleur + spacing + confidence

Vervolg op #277, gedreven door 15 screenshots van de live Brandstyle-UI (Zwarthout). User-observatie: components-tab toont vrijwel niets (form inputs/cards/chips = 0). Diepgaande audit (6-stream workflow + live-site HTML-probe + adversariële cross-check, alle root-causes in live code geverifieerd): `docs/audits/2026-06-05-brandstyle-result-audit.md`. **Kernbevinding**: form-inputs en product-cards zijn NIET afwezig op zwarthout.com (`/contact` + `/quote` hebben 21-24 echte `<input>`; shop heeft 9 `li.product-item`/pagina) — ze worden **gemist** door een merge-defect, dekking-gap en selector-gap.

- **Fase 1a (component merge)**: de Playwright-screenshotter verving `scraped.components` wholesale → static-gemergde form-inputs van `/contact` (die buiten de 5-pagina screenshot-slice vielen) gingen verloren. Nieuwe `backfillComponentsByType` houdt de screenshot-set leidend en backfilt alleen ontbrekende types. **Fase 1b/1d (coverage)**: `prioritiseScreenshotUrls` zet form-rijke pagina's (contact/offerte) vooraan en capt producten op 2 i.p.v. 4 bijna-identieke detailpagina's. **Fase 1c (selector)**: PRODUCT_CARD vangt nu WooCommerce/custom-theme kaarten (`li.product`/`.product-item`/`.wc-block-grid__product`).
- **Fase 2 (elevation)**: 1-regel shape-bug — `clusterElevation` deed `Array.isArray` op een `{tokens:[...]}`-object → Design-System/Visual-System toonden "0 shadows" terwijl de Spacing-tab er 4 had. Unwrap + strip `!important` + skip `none`.
- **Fase 3 (typografie)**: var()-resolutie splitst nu de komma-stack naar de eerste echte familie (geen "system-ui,…"-string meer als primary-font); fallback-chain-ruis (Roboto/Oxygen/Ubuntu) gefilterd (eerste familie per declaratie); WooCommerce/Elementor icon-fonts gefilterd; weight-suffix-strip ("Sen Bold" → "Sen") voor Google-Fonts-classificatie.
- **Fase 4a (kleur)**: chroma-gate — verzadigde kleuren (Bootstrap Blue/Vivid Purple) niet langer in de NEUTRAL-bucket maar ACCENT, behalve framework-default-ruis zonder usage-bewijs (blijft gemute neutral).
- **Fase 5a/5c (spacing/radii)**: computed-style px afgerond (5.42px → 5); pill/cirkel-radius (`50%`/`≥100px`) bewaard als sentinel zodat de "full"-radius een echte pill is i.p.v. 4px. 5b (non-monotone volgorde) bevestigd **stale data** — huidige builder sorteert al.
- **Fase 6a (confidence)**: `computeConfidence` telde `Object.keys().length` → degenereerde naar 100% voor élk element. Telt nu onderscheidende niet-default props (echte button 0.78, generieke balk 0.42).

**Bewust gedeferd** (per audit-risicovlaggen, baat bij re-scrape-validatie): 4b/4c (framework-kleuren bulk-droppen), 6b/6c (nav-handling, vision-confidence), 6d (gradient-provenance — feature met prompt+schema+UI), 6e (Components-telling label). **Review**: adversariële 4-lens workflow → geen CRITICAL; 1 MAJOR (pill-sentinel `9999` lekte in median/mostCommon/AI-prompt) + 1 MINOR (chroma-gate `undefined` usage) gefixt + smoke-coverage.

**Bewijs**: smoke `web-page-builder-phase45-result-audit` 58/58; regressie 41-44 groen; tsc+lint 0 errors. **Vereist re-scrape van zwarthout.com voor volledige validatie** (≥3 form-inputs, ≥5 product-cards, leesbare primary-font, consistente elevation) — Track A.

- Task: audit `docs/audits/2026-06-05-brandstyle-result-audit.md`
- ADR: -
- Spec: `docs/audits/2026-06-05-brandstyle-result-audit.md`
- Commit: branch `fix/brandstyle-extraction`

### 277. Brandstyle extractie-fidelity — Fase 1/2/3/4/5/6 (var-resolutie + framework-gate + kleurcombinaties + font-fallback)

Upstream-vervolg op #276: de scrape→brandstyle-extractie plaatste gescrapte info slecht (onopgeloste `var(--bs-*)`, framework-defaults als merk-design, gefabriceerde preview-tekst). Na 4-lagen deep-research + adversariële code-cross-check (audit `docs/audits/2026-06-05-brandstyle-extraction-pipeline.md`). Meta-oorzaak: drie niet-uniforme CSS-leespaden met verschillende var()-resolutie en geen gedeelde framework-default-gate.

**Fase 1 — gedeelde var-resolutie**: nieuwe property-agnostische `resolveCssVar`/`resolveOrKeep` (`css-var-resolver.ts`) bedraad in de typografie-extractor (fontSize/lineHeight/letterSpacing/fontWeight/fontFamily/color, alleen niet-null geresolveerd) + button-extractor (full-CSS-fallback voor de kleur-gefilterde var-map) + var-guard op lineHeight/letterSpacing in `toRoleEntry`. **Fase 2 — framework-default-gate**: `framework-defaults.ts` (selector- + primary-hex-detectie, focusset zodat een toevallig-Bootstrap-grijs als echte merk-kleur ongemoeid blijft) → component-confidence-penalty (×0.4) + `--bs-primary` detector-downgrade naar 'low' (geen Bootstrap-blauw meer als merk-primary) + logo-rescue-gate die framework-defaults negeert. **Fase 6 — display**: gefabriceerde button-CTA-tekst → neutrale rol-placeholder; dode `StyleGuideViewer`/`BrandstyleView` gemarkeerd.

**Review**: adversariële review-workflow vond 8 bugs (4 HIGH/2 MED/2 LOW) — allemaal gefixt (regex-paren-balancing in var-fallbacks, font-stack-resolutie-volgorde, namespaced-btn-class lookbehind, logo-rescue op ongemuteerde role, refuse-mode-regressie-guard, custom-Gutenberg over-match, declaratie-grens, low-confidence→NEUTRAL bij AI-skip).

**Bewijs**: smokes `phase41-brandstyle-var-resolution` 17/17 + `phase42-framework-default-gate` 19/19 (incl. alle bugfix-scenario's); regressie phase12/24/25/26 groen; tsc+lint 0 errors. Branch `fix/brandstyle-extraction` (`1576f4d8`→`bc139e5e`).

**Fase 3 — usage-enforce**: logo-kleur-redding-deblokkering zat al in de Fase-1/2-review-fixes (`frameworkHasPrimary` negeert framework-default-primaries); resterend deel: kleuren met `usageEvidence 'none'` (niet-gerenderd) die niet uit logo/detector komen → confidence 'low' vóór resolveColors. **Fase 5 — kleurcombinaties**: nieuwe `buildColorPairings` (`color-pairings.ts`) → WCAG-geverifieerde rol-gelabelde fg/bg-paren (knoppen met best-leesbare foreground, merk-op-surface, basis-leespaar); schema `colorPairings Json?` + persist (analyse + `recomputeColorPairings` na user color-add/-delete) + `ColorPairingsPanel` UI. Twee review-workflows vonden 8 (Fase 1/2) + 6 (Fase 3/5) bugs — allemaal gefixt (o.a. var-fallback-paren-balancing, font-stack-volgorde, namespaced-btn lookbehind, stale-pairings recompute, invalidateCache, grammatica, echte donkerste-neutral).

**Bewijs (Fase 3/5)**: smoke `phase43-color-pairings` 12/12; tsc+lint 0. Commits `df6c6c3d`+`b6b6f630`+`e83f8a24`.

**Fase 4 — font-fallback (lege fonts-tabel)**: drie deterministisch-testbare ingrepen + één `[RE-SCRAPE]`-wiring. (a) `extractSemanticFonts` vangt nu Bootstrap's `--bs-headings-font-family`/`--bs-body-font-family` — een brand-gecustomiseerde waarde overleeft, een vanilla system-stack wordt terecht gefilterd. (b) Nieuwe pure helpers (`font-fallback.ts`): de headless computed-style-render (die al `body/h1`-fonts captureert) triggert nu óók bij lege fonts i.p.v. alleen een zwak palet, en merget per-bron deficiëntie-gestuurd (`planHeadlessMerge`) zodat een goed statisch palet/fontset nooit door de grovere render wordt overschreven. (c) **Eerlijke persist**: StyleguideFont-rijen komen uit de écht gedetecteerde fonts (`selectDetectedFontNames`), nooit de AI-fallback; `primaryFontName` behoudt de AI-fallback alleen voor het typografieprofiel (LP-renderer heeft een font nodig). UI (`FontDisplayCard`) toont "Not detected on the site — AI suggestion: X" wanneer de naam niet in de gedetecteerde rijen zit, i.p.v. een confidente font-card. De computed-style-render zelf blijft `[RE-SCRAPE]` (vereist `BRANDSTYLE_HEADLESS_FALLBACK=1` + een echte gerenderde, niet-placeholder bron — Track A).

**Review (Fase 4)**: adversariële 4-lens review-workflow → geen CRITICAL; 1 MAJOR + 3 MINOR/NIT gefixt: font-role-classificatie van supplementaire headless-fonts (gerenderde CSS apart naar de classifier zónder de kleur-pipeline te raken), overbodige reprocess-skip bij niets-geadopteerd, NL→EN UI-copy, UPLOADED-rij comment-accuratesse. Verworpen (onbereikbaar/by-design): secondary-card false-negative, whitespace-spook-font, regex-over-match, kleur-pipeline-verstoring.

**Bewijs (Fase 4)**: smoke `phase44-font-fallback` 20/20 (`--bs-*`-resolutie + vanilla-filter + regressie ACSS-vars + `selectDetectedFontNames` geen-AI-leak + `planHeadlessMerge`-matrix); regressie 41/42/43 groen; tsc+lint 0 errors.

- Task: audit + plan `~/.claude/plans/functional-conjuring-harbor.md`
- ADR: -
- Spec: `docs/audits/2026-06-05-brandstyle-extraction-pipeline.md`
- Commit: `1576f4d8` + `32258522` + `9e03c71b` + `bc139e5e` + Fase 4 (branch `fix/brandstyle-extraction`)

### 276. LP brand-fidelity overhaul — scrape → tokens → render (geen app-identity-lek meer)

Systematische fix van off-brand/slecht-ogende landing-pages, na een 4-lagen deep-research (audit: `docs/audits/2026-06-04-lp-render-pipeline-napking.md`, plan: `~/.claude/plans/functional-conjuring-harbor.md`). Meta-oorzaak: de pipeline behandelde CSS-tekst-aanwezigheid als merk-design, viel bij zwakke extractie terug op **Branddock's eigen huisstijl** (teal #1FD1B2 / amber #F59E0B) en de renderer **verzon** visuals (textuur, 272px-koppen). Aanleiding: Zwarthout-LP renderde teal (nergens op de site) met verzonnen achtergrond-structuur.

**Fase 1 — identity-leak**: `DEFAULT_BRAND_TOKENS.brand/accent/brandSubtle/action` geneutraliseerd (slate i.p.v. teal/amber); `brand = pickBrand(colors) ?? onSurface` (donkerste klant-kleur), `accent = pickAccent ?? brand` — een klant-LP krijgt nooit meer de app-kleur. **Fase 2 — preset-over-scrape/sizing**: px/rem-misclassificatie op magnitude (Napking `[1.6..16]` werd ×16), hero-CTA radius uit scraped `tokens.button` (gecapt, niet MINIMAL→scherp/pill), `pickButtonStyle` padding gecapt (spacing[6]=96 giant button), display-koppen gecapt (88/120px i.p.v. 272), hero section-padding via `sectionRhythm`. **Fase 3 — render-eerlijkheid**: `readableTextColor` dwingt AA-contrast af op feature/trust/FAQ-body (onzichtbare tekst), `pickBackgroundDepth`→`none` (geen verzonnen textuur), feature/trust-koppen gecapt op 32px. **Fase 4 — confidence-gating**: garbage-button-detectie (transparant+padding 0, of `.wp-block-button` framework-selector → sane defaults), framework-default-kleuren (`bootstrap/wordpress` + `default/synced-block` tag) uitgesloten van brand/accent-picking.

**Bewijs**: nieuwe smoke `phase40-brand-fallback-no-leak` 20/20; cross-brand-verificatie (`scripts/verify-cross-brand-tokens.ts`) over alle 15 merken → **0 teal-leaks, 0 amber-leaks, 0 spacing-blowups**, elk merk krijgt zijn echte kleur (Zwarthout #212529 charcoal, Napking #008ACF blauw) of veilig-neutraal (Wassink #0F172A). tsc + lint 0 errors; token/render-smokes groen.

**Out-of-scope (Track A / live-verificatie)**: bron-website moet bereikbaar zijn voor een goede scrape (napking.nl/zwarthout.com zijn WordPress-placeholders); diepe scrape-pipeline-filtering (usageEvidence consumeren, in-scrape framework-filter, scrape-kwaliteitsguard met UI) + gegarandeerd hero-beeld vragen een live re-scrape om te verifiëren.

- Task: `tasks/lp-fidelity-bugfixes-step2.md` + `tasks/lp-step3-rendering-bugs.md` (smoke-bugs) + audit/plan hierboven
- ADR: -
- Spec: `docs/audits/2026-06-04-lp-render-pipeline-napking.md`
- Commit: (branch `fix/lp-smoke-bugs`, nog te committen)

## 2026-05

### 275. Competitor content-item discovery — RSS + sitemap producer voor CompetitorContentItem

Producer voor de sinds Fase 1 lege `CompetitorContentItem`-tabel — laatste nog-te-bouwen stuk van de competitive-intel arc (data → detectie → zichtbaarheid → **ingestie**). Tijdens een competitor-refresh ontdekt het blog/news/press/case-content via **RSS → sitemap-fallback**, classificeert het format (regex-first + gebatchte Claude Haiku 4.5-fallback, verbatim A3-prompt 100% accuracy) + tagt 2-3 thema's per item (gebatchte Haiku), schrijft `CompetitorContentItem`-rijen en emit `NEW_BLOG_POST` / `NEW_PRESS_RELEASE` / `NEW_CASE_STUDY` activities voor nieuw-geziene URLs. Pre-build probes: sitemap 71% / RSS 43% / classifier 100%.

**Architectuur**: nieuwe module `src/lib/competitors/content-discovery/` (fetch-policy met SSRF-guard + robots.txt-respect + 1req/s throttle + Branddock-UA, rss/sitemap-discoverers via cheerio xmlMode incl. sitemap-index-recursie, content-classifier, orchestrator met fetch-budget + 25-truncatie + never-throw). Draait **async vóór de transactie** (spiegelt de AI-pattern-classifier zodat netwerk+AI nooit TX-locks vasthouden); items gaan via nieuwe `contentItems`-param de dual-write-TX in en worden geschreven met `firstSeenSnapshotId` (null op no-op-hash-match — content-discovery staat los van de content-hash) via `createMany({skipDuplicates})` op `@@unique([competitorId, urlHash])` (race-safe). Pure `buildContentItemActivities` in diff-engine mapt de 3 content-cadence formats; overige formats (EBOOK/VIDEO/…) opgeslagen zonder event. Schema additief: `CompetitorContentItem.discovererVersion` (bootstrap-SQL geparkeerd).

Verificatie: tsc 0 · eslint 0 · dual-write smoke 31/31 (incl. content-items Scenario 4) · `smoke:competitor-content-discovery` 18/18 (RSS / sitemap-index / leeg, stub-fetch + stub-classifier) · live charthop.com = 24 items + 8 activities + Haiku-themes · 2-subagent review 0 critical (WARNINGs gefixt). Async/cron-discovery (haalt de ~10-20s latency van het refresh-pad) = Fase 4 brandclaw-monitoring.

- Task: [tasks/done/competitor-content-item-discovery.md](../tasks/done/competitor-content-item-discovery.md)
- ADR: 2026-05-08-competitor-snapshot-historie
- Spec: [tasks/_drafts/idea-competitor-content-item-discovery.md](../tasks/_drafts/idea-competitor-content-item-discovery.md)
- Commit: `b785299e`

### 274. Content-flow analyse #7.A — 8 categorie-rapporten + synthesis

Per-categorie content-flow analyse (long-form / social / advertising / email / website / video / sales / pr-hr) + `content-flow-synthesis.md` in `docs/specs/`, code-gegrond met file:line-refs. Legt twee structurele gaten bloot: (1) 5 kerntypes (`whitepaper`/`ebook`/`article`/`newsletter`/`microsite`) draaien op de generieke prompt door ontbrekende templates; (2) `TYPE_TO_CATEGORY` is gedivergeerd van de echte TEMPLATE_REGISTRY (~9 phantom-IDs, ~17 missende echte types) zodat `getCategoryForType()` mislabelt. Friction-tickets in `tasks/content-flow-improvements-7a.md` (CF-1 t/m CF-10). Documentatie-only (geen tsc/lint); sectie 6 deels pending Ronde 1.

- Task: [tasks/done/content-test-flow-analyse-7A.md](tasks/done/content-test-flow-analyse-7A.md)
- ADR: -
- Spec: docs/specs/content-flow-synthesis.md
- Commit: _(deze commit)_


### 273. `/feature` slash command — feature requests via Brand Assistant

Test-gebruikers kunnen nu een feature request indienen via `/feature` in de Brand Assistant, exact gespiegeld op de bestaande `/bug`-flow (geen AI-analyse). Nieuw workspace-scoped Prisma-model `FeatureReport` (parallel aan `BugReport`, los van het bestaande globale `FeatureRequest`/voting-board) met velden `title`/`description`/`impact` (nice-to-have|useful|important|critical) / optionele http(s)-`screenshot`-link / `status` (open→planned→in_progress→shipped|declined; terminale statussen stempelen `resolvedAt`/`resolvedById`). Twee API-routes: `POST/GET /api/feature-reports` (workspace-scoped, `?all=true` developer-only) + `PATCH /api/feature-reports/[id]` (developer-only status/notes). UI: `FeatureRequestForm` in de chat (page voor-ingevuld) + developer-`FeatureTriageTab` onder Settings → Developer met status-filters + status-transities + triage-notities. Alle vier de assistant-forms (bug/feature/feedback/quick) sluiten elkaar nu wederzijds uit (one-at-a-time). Reference-link wordt server-side gevalideerd op http(s) zodat de `<a href>`-render in triage `javascript:`/`data:` weert. Geverifieerd via Playwright end-to-end (login → /feature → submit → triage → status-transitie). **Merge-let op**: tabel lokaal additief via SQL aangemaakt (niet via Prisma-migratie) wegens pre-existing DB-drift uit de web-page-builder-worktree — los die drift op vóór een schone `db push`/deploy naar Neon.

- Task: [tasks/done/feature-request-slash-command.md](tasks/done/feature-request-slash-command.md)
- ADR: -
- Spec: -
- Commit: _(deze commit)_

### 272. Competitor scraping Apify-fallback — finalisatie van al-gemergde 3-step chain + Track B doc-reconciliatie

Formele finalisatie van `competitor-scraping-apify-fallback`, gebouwd + gemerged via PR #12 (`5173fac5`) maar met stale task-status "open" en zonder changelog-entry. Vierde geval van Track B doc-drift in deze sprint (na classifier #263 en activities-ui #271), daarom in dezelfde pass de hele competitor/Brandclaw backlog tegen `main` gereconcilieerd.

**Apify-fallback** (op main aanwezig, bevestigd): 3-step scraper-chain in `refresh/route.ts` (current `scrapeProductUrl` → `scrapeViaApify` op `<500` chars/throw → `scrapeUrlViaGemini`), `src/lib/scraping/apify-client.ts` singleton (`crawlerType: playwright:firefox` + residential proxy), smoke `apify-fallback-chain.ts` (4 scenarios), dependency `apify-client ^2.23.3`. Lost JS-heavy SPA scrape-failures op (Snowflake-case 0 → 2868 chars) die anders silently geen input aan de AI-classifier zouden leveren; Apify alleen op ~10% fail-pad (~$0.80/mnd @ pilot-volume).

**Doc-reconciliatie**: `APIFY_TOKEN` toegevoegd aan CLAUDE.md optionele env-vars (vereist op fail-pad); `strategy-analyst-stub` status gecorrigeerd naar in-progress (Phase A+B gemerged #260-262, Phase C open); roadmap Track B + Competitive Intelligence Loop bijgewerkt. Spike-branch `spike/apify-url-crawler` (superseded door #12) opgeruimd.

- Task: [tasks/done/competitor-scraping-apify-fallback.md](../tasks/done/competitor-scraping-apify-fallback.md)
- ADR: -
- Spec: [docs/specs/apify-integration-options.md](specs/apify-integration-options.md)
- Commit: `55d35c8a`

### 271. Competitor-activities-ui finalisatie + hardening — audit van al-gemergde feature + 7 minor fixes

Formele finalisatie van `competitor-activities-ui`, dat al gebouwd + gemerged was (PR #6 classifier, #8 timeline/digest/dashboard, #13 notifications, plus BA-tool en reconcile-cron branches) maar de `task-finalize`-ceremonie had overgeslagen: geen changelog, task bleef `in-progress`, geen 2-subagent review. Een 4-dimensionale audit-workflow (API/UI/notifications/conventies) met adversariële bug-verificatie bevestigde alle 11 acceptatiecriteria correct geïmplementeerd met **0 critical/major defects**; 9 minor bugs bevestigd (2 false-positives gekild). Alle 9 zijn gefixt op worktree `branddock-finalize-activities`:

- **Mark-all-read scope-divergence**: activities-route returnt nieuw `totalUnread` (ongefilterd); `ActivityTimelineSection` bindt badge + disable-gate daaraan i.p.v. de filter-scoped `unreadCount` — voorkomt stil acknowledgen van ongezien MAJOR-events onder een actief filter + onterecht disabled knop.
- **Digest half-lege card**: `acknowledgedAt: null` toegevoegd aan de `severityGroups` groupBy in `activity-summary`, zodat totals ⇄ topEvents/hotCompetitors ⇄ skip-gate dezelfde (unack'd) populatie tellen.
- **Reconcile-cron cache-invalidatie**: `invalidateCache(competitors + dashboard)` per gecorrigeerde workspace (verboden-patroon #10).
- **OrganizationMember user-resolutie**: nieuwe helper `src/lib/workspace/workspace-users.ts` (`getWorkspaceUsers`, spiegelt de ACL van `hasWorkspaceAccess()` + `isActive`-filter) vervangt de legacy `User.workspaceId` lookup in `notify-major-events.ts` + (consistentie) de trend-radar approve-route — multi-member workspaces krijgen nu wél notificaties.
- **Constant-time cron-auth**: nieuwe helper `src/lib/auth/cron-auth.ts` (`crypto.timingSafeEqual` + length-guard) toegepast op alle 4 cron-routes.
- **Dev email-observability**: `isEmailitConfigured()`-guard verwijderd zodat `trySendTransactional` z'n dev-stub console-log per ontvanger emit.
- **Silent-return logging**: gestructureerde `console.warn` bij 0-user workspace in `notifyMajorEvents`.

Verificatie: `tsc` 0 errors, `eslint` 0 errors, nieuwe smoke `npm run smoke:competitor-activities` 26/26 PASS (ACL-scoping, in-app notify-rows, 0-user warn, constant-time auth, reconcile drift-correctie + auth-gate, summary totals-invariant, acknowledge atomic-decrement race-safety). 3 code-review-ronden (6 subagents) → 0 critical/0 warning. Live browser-pass van detail/dashboard/digest blijft aanbevolen handmatige gate.

- Task: [tasks/done/competitor-activities-ui.md](../tasks/done/competitor-activities-ui.md)
- ADR: -
- Spec: -
- Commit: `5aaf1922`

### 267. Web-page builder MVP — Puck als Canvas Step 3 Medium-renderer + publish-flow

Volledige feature-branch (`branddock-feat-web-page-builder-canvas`, 8 commits, niet-gemerged in main) die de 5 web-page content-types (`landing-page` / `product-page` / `faq-page` / `comparison-page` / `microsite`) een visuele drag-drop editor + publish-flow geeft via Pattern B uit ADR 2026-05-22 (override Step 3 Medium-renderer ipv aparte feature-tab). Architectuur: Puck v0.21.2 (MIT) embedded in `PuckPageBuilder.tsx` consumeert `CanvasContextStack` via prop, brand-tokens komen structureel uit BrandStyleguide (PRIMARY/SECONDARY/ACCENT/NEUTRAL colors + DISPLAY/BODY fonts) via nieuwe `extractBrandTokensFromStyleguide` util — `assembleCanvasContext` laadt deze server-side. Edit-paradigma 3 lagen (per Optie B uit gesprek 2026-05-22, diff-preview verplicht voor alle AI-changes): Laag 1 direct visual editing via Puck-native drag-drop + inline text, Laag 2 component-level AI via context-menu met 4 instructies (shorten/formal/casual/alternatives) gevoed uit centrale `ai-edit-instructions` registry + `ComponentDiffPreviewModal` dual-render via `<Render>` × 2, Laag 3 page-level AI via 3 endpoints (auto-iterate met F-VAL judge integration + heuristic fallback, strict-rewrite met user-prompt, generate-page free-text → SpikeData via per-type template builders) + `PageDiffPreviewModal` met per-component accept-lane + score-delta badges. Persistentie: `LandingPage` model als immutable snapshot per publish (workspaceId_slug compound unique key, mirror van competitor-snapshot-historie ADR) + `DomainMapping` v2 schema-only. Publish-flow via `/api/landing-pages/publish` met auth + workspace-membership-check + `revalidatePath` on snapshot-write. Public render-route `/p/[slug]` met ISR 1h-fallback. Middleware-routing in `src/middleware.ts` voor `<workspace>.branddock.app/<slug>` subdomain-pattern via `decideHostRoute` pure util (host-port stripping + apex/lvh.me passthrough + exempt-path-prefixes voor /api/_next/p). 5 per-type templates leveren werkbaar startpunt zonder Step 2 variants; `variantToPuckData()` extraction-mapper parseert features/faq/pricing uit variant-content via heuristieken (bullet-lists, question-mark-blocks, EUR-price-tokens). 8 brand-aware components: BrandHero/BrandCTA/FeatureGrid/Testimonial/PricingTable/FAQ/Footer/RichText. Lock-toggle per component voorkomt AI-overschrijving (server-side enforced via 423 Locked + client-side via disabled buttons). F-VAL judge integration: `evaluatePageQualityViaFVAL` adapter wraps `runFidelityScoring` 3-pillar composite (style + judge + rules) — falls back naar heuristic stub bij null-outcome (insufficient signal). Bug-vondst tijdens build: Puck v0.21.2 `external` field typing-mismatch op custom row-shapes; workaround via `select` field met pre-computed options array. Bug-report draft `docs/audits/puck-external-field-typing-issue.md` klaar voor user-submission. Total LOC: 6175+ over 36 files. Smoke-suite: 279 assertions PASS over 7 zelfstandige `npx tsx`-scripts (geen browser-dependence; gebruikt `react-dom/server renderToStaticMarkup` voor rendering-validatie). Smoke-tests vonden + fixten 3 real bugs pre-commit: regex precedence in font-extraction (Phase 2), `Brand: undefined` leak in Claude-prompt (Phase 6), redundant nullish coalescing in test (Phase 6.2). Spike-validatie 2026-05-22 + browser-smoke groen 2026-05-23 bevestigden alle 5 spike-blocker aannames (A1/A2/A4/A6/A8). Productie-readiness open: alleen browser-smoke door user op `branddock-feat-web-page-builder-canvas` worktree + Puck bug-report submission resteren.

**Per-phase commits** (chronologisch op feature-branch):
- Phase 1 `2c28dd68` — Foundation: Prisma LandingPage/DomainMapping + 5-type dispatch in preview-map + spike-code naar productie-paden
- Phase 2 `690631f9` — 8 brand-aware components + structurele brand-tokens util (58 smoke ✅)
- Phase 3 `380d99da` — 5 per-type templates + smarter variantToPuckData seeding (74 smoke ✅)
- Phase 4 `29c9d8bb` — publish-laag: middleware host-router + LandingPage write + `/p/[slug]` render-route (44 smoke ✅)
- Phase 5 `f82f74cf` — component AI-menu (4 instructies) + lock-toggle (36 smoke ✅)
- Phase 6 `00553de3` — page-level AI utilities + 3 routes (35 smoke ✅)
- Phase 6.1 `23715313` — PageDiffPreviewModal + 3 page-level toolbar-knoppen in PuckPageBuilder (18 smoke ✅)
- Phase 6.2 `873d69b2` — F-VAL judge integration + Prisma migration file + Puck bug-report draft (14 smoke ✅)

- Task: [tasks/web-page-builder-canvas-step-mvp.md](../tasks/web-page-builder-canvas-step-mvp.md) (in-progress)
- ADR: [docs/adr/2026-05-22-landing-page-builder-architectuur.md](adr/2026-05-22-landing-page-builder-architectuur.md)
- Spec: [tasks/_drafts/idea-landing-page-builder.md](../tasks/_drafts/idea-landing-page-builder.md) (idea-doc, verdict ready-to-build)
- Spike-memo: [docs/audits/2026-05-22-landing-page-builder-puck-spike.md](audits/2026-05-22-landing-page-builder-puck-spike.md)
- Commits: feature-branch `branddock-feat-web-page-builder-canvas` (8 commits van `2c28dd68` t/m `873d69b2`)
- **Vervolg**: Phases 6.3-6.13 (UX-polish, fullscreen-editor, scope-knip) + spec-driven implementatie zie #268

### 268. Web-page builder follow-on — spec-driven landing-page + multi-variant + WCAG-plan

Vervolg op #267. Twee grote werkblokken sinds 2026-05-23:

**A. Phases 6.3-6.13 UX-polish** (19 commits, pre-2026-05-26): Phase 6.4 preview-first Step 3 + mini Puck.Preview in Step 2 (`83229f12`), Phase 6.5 markdown-blob fallback (`5db51e50`), Phase 6.6 minimal preview UI + remove component-level AI (`9f493437` — scope-knip), Phase 6.7 Branddock top action-bar + scope-knip (`9299abec`), Phase 6.8 flat preview + page-wide lock-toggle (`aae1355c`), Phase 6.9 high-contrast lock-toggle (`2cb6e170`), Phase 6.10 toggle inline-transform + diff-modal styling (`60da4875`), Phase 6.11 auto-iterate non-improvement rejection (`ce4ce178`), Phase 6.12 fullscreen editor portal + theming (`9e3b1518`), Phase 6.13 fullscreen viewport-coverage (`5ea13156`). Plus AI-fixes: maxTokens 8000→16000 (`f6465aaa`), per-step timeout 120s→240/300s SEO (`b929c6d4`), skip temperature voor Opus 4.7+/Sonnet 4.6+ (`5242c9e9`). Plus Next 16 compat: host-router naar proxy.ts (`48863b11`). Phase 6.2-fval smoke-suite 279 asserts blijft groen.

**B. Spec-driven landing-page implementatie** (15 commits, 2026-05-26):
- **Markdown-fix** (`f905f7d8`): RichText component rendert markdown via react-markdown (eerder ###/**/etc. zichtbaar als ruwe tokens). Brand-token-aware components-map.
- **Landing-page type-specificatie** (`ff725443`): `docs/specs/web-page-types/landing-page.md` (619 regels) met 4 secties — onderzoek (16 inzichten uit 13 bronnen: NN/g, Unbounce 2024, CXL, Cialdini, Frankwatching + Marketingfacts NL practitioner-bronnen) + anatomie (8 secties macro + micro per sectie + best-in-class voorbeelden) + onderbouwing (Fogg BAT + Cialdini 7 + Kahneman biases + NN/g attention-economics, cross-mapping naar anatomie) + doorvertaling (component-gap-analyse + LandingPageVariantContent schema + template-skelet + 6 F-VAL judge-dimensies).
- **Fase 1 Zod-schema** (`4e613a00`): `variant-schema.ts` met Zod v4 + superRefine cross-field constraint (finalCta.primaryCta === hero.primaryCta voor single-CTA discipline). Smoke phase7 27 asserts.
- **Fase 2 Variant-generator** (`2f95fd2a`): `variant-generator.ts` met buildPrompt + parseResponse + generateLandingPageVariant. Later aangepast: STRUCTURED useCase + 90s timeout + single-shot (`074a9513` — was eerder retry-loop met 6.2min hang in LINFI-test), daarna two-phase batch met per-failure recovery-temperature retry 0.7→0.5 / 0.3→0.4 (`b3e80e9c`). Smoke phase8 33 asserts incl. persona.serialized roundtrip.
- **Fase 3 Structured mapper** (`9c906e7c`): `landing-page-from-structured.ts` met 11 section-builders + conditional render voor problem + pricing. MVP-workarounds voor 3 v2-gap-componenten (TrustStrip/PainBullets/ImpactStats) via FeatureGrid + RichText. Smoke phase9 32 asserts.
- **Fase 4 Quality-dimensies** (`ceac51c6`): `landing-page-quality.ts` met 6 type-specifieke F-VAL dimensies (hero-clarity 20% / single-CTA 15% / readability 15% / social-proof 15% / anatomie 20% / objection 15%). 5 deterministisch + 1 LLM-injectable. Composite <70 → shouldAutoIterate. Smoke phase10 40 asserts.
- **Fase 5 Component-props** (`6f68fcae`): BrandHero.heroVisualUrl + BrandCTA.riskReducer + FeatureItem.icon + PricingTier.highlighted (additieve, backward-compat). Decoy-pricing-badge "Aanbevolen" + scale 1.05 bij highlighted-tier. Smoke phase11 22 asserts.
- **Fase 6a Generate-route** (`b558e385`): `POST /api/landing-pages/[id]/generate-structured-variant` met auth + workspace-check + PUCK_WEBPAGE_TYPES allowlist + assembleCanvasContext + batch + persist in settings.structuredVariantOptions. Cache-invalidatie studio + campaigns.
- **Fase 6b Store-slice + hydratie** (`04ae511d`): structuredVariant + structuredVariantOptions slices in useCanvasStore + CanvasPage hydrate uit settings. Bestaande puckData-hydratie via contextStack-path werkt automatisch.
- **Fase 6c Step 2 UX** (`cd13275a`): LandingPageGenerateBlock vervangt multi-variant grid voor PUCK_WEBPAGE_TYPES. Iteraties: Step 1 brief-summary (`3dfcb602`), copy-preview na generation (`ff7c319c`), auto-trigger op mount (`1ae2997f`), multi-variant 2-card keuze met carry-over fix via expliciete /context-fetch + setContextStack (`6fcfa6bf`).
- **Brand-styling consistency + WCAG plan** (`71ef9978`): `docs/specs/brand-styling-consistency-plan.md` (284 regels) — diagnose LINFI render-mismatch (goud overal vs linfi.nl minimalistisch wit-zwart, contrast-fail body-text) + 5-fase plan (token-roles / WCAG-gate / layout-style-presets / render-rules / AI brand-fit). Per-component do/don't matrix + WCAG-criteria checklist + 3-sprint fasering.

Total LOC 2026-05-26: ~3500 over 12 nieuwe + 6 gewijzigde files. Smoke chain: 154 nieuwe assertions over phase7-11, full chain 0 FAIL.

Browser-smoke 2026-05-26 LINFI bevestigd: brief → 2 variants → keuze → Step 3 Puck-tree met gekozen variant (carry-over werkt). Outstanding: LINFI-render gebruikt brand-color voor body-text (WCAG-fail + niet-on-brand) — Sprint 1 van styling-plan implementeert fix.

- Spec: [docs/specs/web-page-types/landing-page.md](specs/web-page-types/landing-page.md)
- Spec: [docs/specs/brand-styling-consistency-plan.md](specs/brand-styling-consistency-plan.md)
- Task: [tasks/web-page-builder-canvas-step-mvp.md](../tasks/web-page-builder-canvas-step-mvp.md) (in-progress; Fase 6c afronding open)
- Commits: feature-branch `branddock-feat-web-page-builder-canvas` (44 commits ahead van main; deze entry dekt commits `f905f7d8` t/m `71ef9978` plus pre-2026-05-26 6.3-6.13 reeks)

### 270. Web-page builder feature-branch consolidation merge — brandstyle Fase A-E + F-VAL vision-judge dim 8 + DTS C1-C11 + brand-fidelity Step 2 LP + 3 ADR-aanvullingen

Squash-merge van de volledige `branddock-feat-web-page-builder-canvas` feature-branch naar main na 135 commits over 6 dagen (24-29 mei). Bundelt 4 follow-up werkstromen die parallel aan #267/#268/#269 op dezelfde branch zijn gelandet plus de Track 5 brand-fidelity gap-fix en 3 nieuwe ADR-aanvullingen die de scope-uitbreidingen documenteren. Originele MVP-task (post-launch `priority: next`) gepromoot naar **pre-launch Track A sprint #6** in dezelfde merge — 5 dagen capaciteit ging hier naartoe en die realiteit verdiende erkenning op de roadmap.

**(A) Brandstyle Fase A-E LP-fidelity werkstroom** — andere Fase-labelling dan `brandstyle-analyzer-improvement-plan.md` plan A-E; documenteert via [ADR 2026-05-29-brandstyle-analyzer-lp-fidelity](adr/2026-05-29-brandstyle-analyzer-lp-fidelity.md) waarom een smal-en-diep pad gekozen is i.p.v. volledig 10-11-dagen-plan. Color-usage capture (`24105e16`) + hero-typography fingerprint h1-color uit bron (`b36ca91c`) + hero-pattern detection via vision-AI (split/centered/fullbleed/asymmetric/minimal-typographic, `08bc6966`) + LP-fidelity judge bron-vs-gegenereerd side-by-side (`057e4bf7`) + hero-screenshot persist + API + UI (`744ae61f`) + user-override surface voor color usage-tags (`3ff4122f`). Aanverwante brandstyle-fixes: framework-class-extensies voor Bricks/Divi/Elementor in component-extractors (`df831143`), universele button-scraper met CSS-var-resolution + DOM-presence filter (`efb14497`), component-extractor accuratesse (STATUS_CHIP false-positives weg + PRODUCT_CARD bredere selectors, `085e8290`), scanner-classifier primary-saturation guard + pastel→SEMANTIC (`98fbefb2`), Google Fonts loader in Puck-render (`2706a9c4`), font-UI consolidatie naar Typography-tab (`53409620`).

**(B) F-VAL vision-judge dim 8** ([ADR 2026-05-29-fval-vision-judge-dim8](adr/2026-05-29-fval-vision-judge-dim8.md)) — dim 8 `visual-fidelity` toegevoegd aan G-Eval rubric + composite-engine + auto-iterate trigger. Vision-judge volledig geïntegreerd (`944a8d34`, Playwright + Claude vision dim 8 setup `410dcee6`). Auto-iterate accepteert vision-score als blocker: composite < 70 OR visual-fidelity < 50 → refinement-loop. Per-content-type dispatch: alleen `PUCK_WEBPAGE_TYPES` krijgen dim 8; non-LP content blijft 7-dimensies. Calibration tegen Markdown-content-scores is open follow-up (Track 4.3).

**(C) DTS content-quality C1-C11** ([ADR 2026-05-29-dts-content-quality](adr/2026-05-29-dts-content-quality.md)) — alle 11 items uit `docs/specs/dts-content-quality-improvements.md` uitgevoerd in 2 commit-batches: C1+C2+C6+C7+C9 copy-DNA + sticky-CTA (`39171432`) + C3+C4+C5+C8+C10+C11 visuele DTS-verbeteringen (`d06b428e`). Vocabulary-rails (BrandVoiceguide.vocabularyDo/Dont) + voice few-shot sample (voiceSample TEXT) + hard render-constraints per archetype + type-scale text-hiërarchie + eyebrow pattern + max-width container + photo-scrim per archetype + flat-card discipline + sectie-blueprint + real-content fixture samples + StickyCtaBar component. Shared brand-voice-directive uitgebreid met vocabulary + voiceSample (`11283481`). Render-constraints leven als single-source-of-truth in code-constants; bij toekomstige archetype-uitbreidingen MOET deze file expliciet bijgewerkt worden.

**(D) Auto-iterate hardening** (~16 commits) — silent variant-clobber fix, NaN-score + lege preview-panes + 0-component-match (`0f9ebacf`), skip 'already_passing' check in heuristic mode (`1064cf81`), F-VAL initial check opt-in + maxTokens 2400→1500 + 90s server-cap performance (`6e2d249a`), 3 bugs uit user-test 2026-05-27 (`aea0d28d`), 5 screenshot-review issues (`809bb9e4`), hero-image preservation in auto-iterate merge + projected-skip side-effect (`0cbccff1`), StatsBlock + skip-projected halveert wachttijd (`2e8eb0ad`), Step 2 volledige variants + per-veld inline edit pennetje (`b09887e8`), direct advance na variant-keuze + no auto-hero + step3 loading-guard (`38dcfe10`), Step 2 ImageSourcePanel + Confirm-button parity (`3e621612`), hero.headline max 60 + nullable URLs voor AI null-outputs (`af7a688f`), surface hero-image API error detail + variant-axis prompt (`ec527061`), 3 user-bevindingen hero-font + confirm-step + JSON escape-repair (`a785273b`), variant-axis voor diversifying + back-nav step 1 (`23dd181b`), cleanup-orphan-media-assets dry-run + apply mode utility-script (`1439fc20`).

**(E) Brand-fidelity Step 2 LP gap-fix (Track 5 zippy-twirling-feigenbaum)** — `Step2ContentVariants.tsx:318-325` routeert LP-deliverables naar `LandingPageGenerateBlock` (aparte Step 2 host) zonder `FidelityScoreBar` + zonder SSE-events. Andere content-types kregen wel direct fidelity-score; LP zag hem pas in Step 3 (vision-judge dim 8 op gerenderde HTML). Pragmatische aanpak (scope A — deliverable-level): losse REST-endpoint `POST /api/landing-pages/[id]/score-variant-fidelity` die `runFidelityScoring` op gevlakte variant-text runt + payload returnt identiek aan SSE-event `fidelity_score_complete`. `LandingPageGenerateBlock` doet fire-and-forget call na variant-generation voor variant 0; client zet running → complete/skipped via bestaande store-setters. `FidelityScoreBar` gerenderd in variant-keuze view; pattern identiek aan content-deliverables in `Step2ContentVariants.tsx:388`. Bewust GEEN SSE-conversie van `generate-structured-variant` (was plan-default) — losse score-endpoint minder invasief, behoudt fast JSON-response voor variant-display, isoleert fidelity-failures van variant-flow. Per-variant scoring (scope B) blijft out-of-scope; alleen variant 0 gescoord (mirrors naar legacy `fidelityScore`-state). Commit `086486d3`.

**(F) Documentatie + roadmap (2026-05-29)** — 3 specs in `docs/specs/` gecommit met status-flags (`08a0ff12`): `dts-content-quality-improvements.md` ✅ done, `brandstyle-analyzer-improvement-plan.md` voorstel + sectie 10 implementatie-status van LP-fidelity werkstroom, `dts-comparison-improvements.md` research-doc. README onder `src/features/campaigns/components/canvas/medium/` updated naar 11 components + 40+ smoke-phases (`5726726d`). Roadmap.md NOW Track A sprint #6 + NEXT v2-custom-domains placeholder (`dad0d003`). Task-file refresh naar werkelijke staat met "Follow-up werkstromen sinds 2026-05-24" tabel (commit `33e25238` op main worktree). Plan-doc `~/.claude/plans/zippy-twirling-feigenbaum.md` approved 2026-05-29. Memory `branddock-branch-state-2026-05-29.md`.

**Pre-existing fix vereist op main**: `29871a2a` fix(ad-accounts) wrap useSearchParams in Suspense voor prerender-build — CI-blocker sinds Fase B Meta foundation (`fc38e10b`), niet door deze branch geïntroduceerd.

Quality gates: `npx tsc --noEmit` 0 errors, `npm run lint` 0 errors, `npm run build` exit 0 met route-table compleet. Browser-smoke 10-stappen blijft post-merge user-manual. Bundle-size meting post-merge (was geblokt op prerender-bug, fix nu gepusht). PR #14 squash-merge → één commit op main, granular history beschikbaar in PR.

- Task: [tasks/web-page-builder-canvas-step-mvp.md](../tasks/web-page-builder-canvas-step-mvp.md) (promoted pre-launch sprint #6 — 2026-05-29)
- ADRs: [adr/2026-05-29-brandstyle-analyzer-lp-fidelity.md](adr/2026-05-29-brandstyle-analyzer-lp-fidelity.md) + [adr/2026-05-29-fval-vision-judge-dim8.md](adr/2026-05-29-fval-vision-judge-dim8.md) + [adr/2026-05-29-dts-content-quality.md](adr/2026-05-29-dts-content-quality.md)
- Onderliggende ADR: [adr/2026-05-22-landing-page-builder-architectuur.md](adr/2026-05-22-landing-page-builder-architectuur.md)
- Plan: `~/.claude/plans/zippy-twirling-feigenbaum.md`
- Specs: [specs/dts-content-quality-improvements.md](specs/dts-content-quality-improvements.md), [specs/brandstyle-analyzer-improvement-plan.md](specs/brandstyle-analyzer-improvement-plan.md), [specs/dts-comparison-improvements.md](specs/dts-comparison-improvements.md)
- PR: https://github.com/erikjager55/Branddock/pull/14
- Commit (na squash-merge): TBD na merge

---

### 269. Brand-styleguide 1-op-1 fidelity — LP-renderer consumeert volledige scrape (8 batches)

Volledige doorhevel van BrandStyleguide-data naar LP-renderer (`puck-config.tsx`) zodat wat de Components-tab toont 1-op-1 in de gegenereerde landing-page terechtkomt. 8 batches: (1) Button uitgebreid met `border` / `transition` / `hoverBackground` / `hoverColor` op `ButtonTokens` + `mapButtonTokens` + `.lp-btn:hover` CSS-vars in `a11y-styles.ts`; (2) Typography 1-op-1 — h1/h2/h3/p/label/blockquote in BrandHero/FeatureGrid/PricingTable/Testimonial/FAQ/RichText halen `letterSpacing` + `textTransform` + `color` direct uit `typographyByRole`; (3) Section-colors — nieuwe tokens `darkSectionBg` (luminance-sorted darkest dark-bg) + `secondarySurface` (NEUTRAL/SECONDARY background-tagged, niet-surface, niet-brandSubtle), `hasDarkSections` detector verbreed (plain `background+dark` tags ipv alleen `usage:section-bg`); (4) Spacing-scale — `BrandStyleguide.spacingScale` JSON tokens worden via 3-condition rem/px heuristic (`hasFractional`→rem, `allInteger`+`hasLargeInt`→px, anders rem) doorgegeven aan `designSystem.spacing[]` zodat LP exact dezelfde rhythm krijgt als de scraper detecteerde; (5) PRODUCT_CARD — nieuwe `tokens.styleguideComponents.PRODUCT_CARD` driver voor FeatureGrid card-wrapper met `background`/`border`/`padding`/`borderRadius`/`boxShadow` overrides, plus elevation-fallback chain die archetype-shadow/border laat winnen wanneer scraped sample geen visuele afbakening geeft + C3 max-radius clamp via `pxFromCssValue` (rem-aware); (6) FEATURE_ICON — IconBlock badge-wrapper consumeert scraped sample (LINFI's gold-badge styling met witte icon), `pxFromCssValue` voor rem/em size-parsing; (7) TOP_NAVIGATION — nieuwe `BrandNav` Puck-component (8e in registry) leest scraped padding/bg/border/fontFamily, met scraped-button-styling voor de CTA-knop in nav; (8) QUOTE_BLOCK — Testimonial section pakt scraped bg/border/radius, scraped component-level padding wordt op inner wrapper toegepast (niet op section zelf — anders zou section-hoogte instorten). Nieuwe `src/lib/landing-pages/scraped-css-helpers.ts` centraliseert `isTransparentBackground()` (rgba/hsla alpha=0, transparent, var-resolves, inherit/initial) en `isNoOpBorder()` (width=0 met `(?=\s|$)` lookahead voorkomt `0.5px`-misclassificatie, `\bnone\b` voor style=none in shorthand). `canvas-context.ts` Prisma-select uitgebreid met `spacingScale` / `visualLanguage` / `components` (laatste met `orderBy [{confidence:'desc'},{sortOrder:'asc'}]` voor deterministische highest-conf pick). `mapStyleguideComponents` typeof-string guard voorkomt runtime-fouten op scraper-output met niet-string waardes. Twee nieuwe utility-scripts: `scripts/persist-brand-profiles.ts` (workspaceId+url → rendering-profiles persist zonder analyzer-run) + `scripts/rescrape-brand.ts` (workspace-name → volledige analyzer-cyclus met cascade-delete). LINFI eindstand verifieerd: spacing `[16,32,64,68,80,112]`, button 8 velden compleet (wit-bg / zwart border / Poppins / gold-hover-text), `darkSectionBg=#2E2F2A`, `secondarySurface=#FBF4BC` (cream), 4 styleguide-components (BUTTON/FORM_INPUT/FEATURE_ICON/TOP_NAVIGATION). Napking + Better Brands ook volledig re-analyzed (BUTTON, FORM_INPUT × 2). 3 review-iteraties: 4 CRITICAL fixes (productCard radius rem-handling + elevation-fallback, secondarySurface NEUTRAL/SECONDARY-only restrictie, darkSectionBg luminance-sort, brandSubtle defensive optional-chain) + 5 WARNING fixes (mapStyleguideComponents typeof-guard, productCard C3 max-radius clamp, a11y-styles `var(...,inherit)` fallback, centralized rgba-transparent detection, canvas-context deterministic ordering). Zero `tsc` errors, zero ESLint errors (1 pre-existing warning op `columns` destructure niet door dit werk geïntroduceerd), 580+ LP smoke-tests PASS / 0 FAIL over 27 testbestanden.

- Task: -
- ADR: -
- Spec: -
- Commit: `c0d6ac13`

### 266. Fase B — ad-publishing pipeline (Meta foundation + cron infra)

Complete Fase B end-to-end gebouwd per spec `docs/specs/ad-publishing.md`: 3 nieuwe Prisma-models (`ConnectedAdAccount` met encrypted OAuth-tokens, `AdCampaign` met state-machine draft→publishing→active|rejected|failed + 4 external IDs, `AdMetricSnapshot` lege table klaar voor Fase C fetch-job). AES-256-GCM token-encryption helper met IV-randomized roundtrip + auth-tag verificatie. Meta provider module (`src/lib/ad-providers/meta/`) bevat OAuth-flow (`buildAuthorizeUrl` + `exchangeCodeForShortLivedToken` + `convertToLongLivedToken` + `refreshLongLivedToken` + `appSecretProof`), Graph API client (`fetchUserMe` + `fetchAdAccounts`), en publish-pipeline (`publishFacebookAd` 4-step campaign→adset→creative→ad PAUSED + `fetchAdStatus` + `mapMetaStatusToInternal`). 7 API routes: `/api/ad-accounts` (GET list), `/api/ad-accounts/meta/{connect,callback,select,refresh,disconnect}` (OAuth-flow met CSRF state-tokens + soft-delete via `status='revoked'`), `/api/ad-publish/meta` (POST met inline-token-refresh + creative-spec validation + state-machine). Twee cron-jobs: `sync-ad-campaign-status` (5min, Meta-status polling met auth-error recovery) en `refresh-ad-tokens` (24u, pre-emptief verlengen 7d voor expiry). Twee Next.js standalone settings-pages (`/settings/integrations/ad-accounts` + `/select`) bypassen SPA-chrome voor OAuth UX. Twee smoke-tests: `npm run smoke:ad-encryption` (13 cases) + `smoke:ad-creative-validation` (15 cases), beide 0 failures. **Externe dependency** voor end-to-end: Meta App Dashboard met Business Verification + app-review approved (`META_APP_ID`/`META_APP_SECRET` env-vars). **Deferred uit deze sprint**: LinkedIn (7.6) — wacht op MDP approval; spiegelt zelfde shape als Meta zodra dependency klaar staat.

- Task: -
- ADR: [docs/adr/2026-05-22-ad-publishing-integration.md](docs/adr/2026-05-22-ad-publishing-integration.md)
- Spec: [docs/specs/ad-publishing.md](docs/specs/ad-publishing.md)
- Commit: _(deze commit)_

### 265. Ad-quality A.5.5 + A.5.6 — native-ad + retargeting-ad validators

Quality validation layer uitgebreid van 4 ad-types (search/display/facebook/linkedin) naar 6 met two new validators die structureel afwijken van de eerder geland set. **native-ad** volgt journalism rules in plaats van advertising rules: 13 L1-rules enforce dat headline + opening-paragraph zonder brand-mention werken, totaal brand-mentions ≤2 in body+brand-integration+closing (BuzzFeed Principle), en closing-takeaway geen sales-pitch is. L2-judge meet 4 editorial dimensions: editorial-voice-match, value-first-not-sales, brand-integration-naturalness, buzzfeed-principle (zou een lezer dit sharen zónder brand?). Weights L1=0.40/L2=0.60. **retargeting-ad** dekt 18 named groups (3 audience-scenarios × 6 fields) met scenario-aware rules: cart-abandoner mag geen aggressive urgency ("LAST CHANCE") gebruiken en moet specifieke friction adresseren (shipping/return/trust/payment-keyword), page-visitor moet new-angle hebben (Jaccard <0.6 met cart-abandoner copy), past-customer mag geen discount-language hebben (verspilt marge op trusted audience) en moet novelty leveren. L2-judge meet 4 scenario-fit dimensions: scenario-emotional-fit, friction-removal-precision, new-angle-quality, past-customer-novelty. Weights L1=0.35/L2=0.65 — scenario-fit is primair semantisch. `SUPPORTED_CONTENT_TYPES` in canvas-indicator uitgebreid naar set van 6.

- Task: -
- ADR: [docs/adr/2026-05-22-ad-quality-validation.md](docs/adr/2026-05-22-ad-quality-validation.md)
- Spec: [docs/specs/ad-quality-validation.md](docs/specs/ad-quality-validation.md)
- Commit: _(deze commit)_

### 264. Brand Assistant context-picker: `StrategyObservation` toegevoegd

Audit van Brand Assistant + Persona chat context-pickers (2026-05-19) wees 1 Tier-1 gap aan: AI-gegenereerde brand observations van Brandclaw Strategy Analyst (Phase A+B) waren wel zichtbaar in Brand Alignment UI, maar niet selecteerbaar als context in de chat. Nieuwe `ContextModule` `'observations'` toegevoegd (hardcoded Claw-pattern, geen `CONTEXT_REGISTRY`-entry — Persona chat / Canvas hebben observations niet nodig). Module is opt-in (niet in `DEFAULT_CONTEXT_MODULES`), drillable per observation, met `dismissedAt: null` default-filter die door explicit entity-IDs wordt overruled. Tier-2 cleanups (`Campaign` naar registry, `Deliverable` workspaceFilter-workaround) zijn vastgelegd als follow-up-tasks. Smoke partial: stap 1-5 runtime OK; 6-10 niet uitvoerbaar omdat er nog 0 observations in de hele DB bestaan (Strategy Analyst nog nooit gedraaid — geen manual trigger, Phase C cron niet live). Implementatie volgt 1:1 het bewezen `fetchTrendContext`-pattern.

- Task: [tasks/done/context-picker-strategy-observations.md](tasks/done/context-picker-strategy-observations.md)
- ADR: [docs/adr/2026-05-08-brandclaw-agent-architectuur.md](docs/adr/2026-05-08-brandclaw-agent-architectuur.md) (referentie — niet nieuw)
- Spec: -
- Commit: `711fdd19`

### 263. Competitor AI-event-classifier — pattern-detection bovenop diff-engine

AI-pattern-classifier toegevoegd die CATEGORY_REPOSITIONING (MAJOR) + TARGET_AUDIENCE_CHANGED (NOTABLE) detecteert bovenop de 7 deterministische diff-rules. Architectuur: async wrapper `computeDiffWithClassifier` draait BUITEN `prisma.$transaction` (refresh-route stap 8) zodat de 1-2s Haiku 4.5-call geen TX-locks vasthoudt; `applyCompetitorRefreshDualWrite` kreeg optionele `precomputedDetected` param. Inline Jaccard pre-filter bespaart ~33% AI-calls bij cosmetic shifts. Probe-baseline herbevestigd: 29/30 (96,7%) — geen Haiku-drift sinds 2026-05-08. Smoke 15/15 over 5 scenarios incl NL-fixture. Implementatie-afwijking gedocumenteerd in task-file: GEEN auto-severity-downgrade bij confidence<0,7 (audit toonde spread 0,92-0,98 te smal), alleen `[low-confidence]` summary-prefix.

- Task: [tasks/done/competitor-ai-event-classifier.md](tasks/done/competitor-ai-event-classifier.md)
- ADR: [`2026-05-08-competitor-snapshot-historie`](docs/adr/2026-05-08-competitor-snapshot-historie.md) (Fase 1 schema-context, geen nieuwe ADR)
- Spec: [tasks/_drafts/idea-competitor-ai-event-classifier.md](tasks/_drafts/idea-competitor-ai-event-classifier.md), audit [docs/audits/2026-05-08-competitor-classifier-events-accuracy.md](docs/audits/2026-05-08-competitor-classifier-events-accuracy.md)
- Commit: `9b448d2d`

### 262. Brandclaw Strategy Analyst — model-ID hotfix

Anthropic API gaf 404 op `claude-sonnet-4-6-20251001` (de dated suffix is geen
geldige model-ID). DEFAULT_MODEL in `agent-loop.ts` aangepast naar
`claude-sonnet-4-6`. Real-API smoke daarna 17/17 pass tegen Branddock Demo
workspace (4 tool-calls, $0.0549 cost, 24.9s latency, 0 false-positive
observations door two-reasons-test enforcement).

- Task: [tasks/strategy-analyst-stub.md](tasks/strategy-analyst-stub.md) (Phase B vervolg)
- ADR: -
- Spec: -
- Commit: `d488298c`

### 261. Brandclaw Strategy Analyst Phase B — 4 extra dimensions + UI sort/group

Phase B van de Strategy Analyst-stub levert de overige 4 observation-dimensies:
`fidelity_decline` (F-VAL composite-decline ≥10pt/30d per contentType),
`review_pattern` (top-3 finding-categorie herhaalt over 2-4 weken),
`alignment_gap` (AlignmentScan severity-distribution stagnant/worsening over
60+d met manual-fix-rate <50%), `publish_quality_trend` (publish-time F-VAL
daalt OF PublishGateOverride frequency stijgt). System-prompt bump
`strategy-analyst@0.1.0` → `0.2.0` met deterministische volgorde van
prompt-fragments zodat `computePromptVersion` stabiel blijft. UI: view-mode
toggle (Group per dimension / Severity flat-list) met SEVERITY_RANK comparator
(HIGH → MEDIUM → LOW, dan newest-first). Smoke-test breidt assertion uit naar
alle 5 dimension-fragments.

- Task: [tasks/strategy-analyst-stub.md](tasks/strategy-analyst-stub.md) (Phase B)
- ADR: [adr/2026-05-08-brandclaw-agent-architectuur.md](adr/2026-05-08-brandclaw-agent-architectuur.md)
- Spec: -
- Commit: `58094f8e`

### 260. Brandclaw Strategy Analyst Phase A vervolg — UI Tab 5

Phase A's UI-laag gewired: BrandclawObservationsTab in BrandAlignmentPage als
Tab 5 "Strategy Analyst" met Brain-icon. GET `/api/brandclaw/observations`
met dimension/severity/includeDismissed filters; PATCH
`/api/brandclaw/observations/[id]` met markRead/markActed/dismiss/undo
actions. ObservationCard rendert severity/confidence badges + action-buttons
+ dismiss-reden input. EvidenceModal toont DataSnapshot drilldown per
observation. TanStack Query 5 hooks (`useStrategyObservations`,
`useRunStrategyAnalyst`, `usePatchObservation`). `AlignmentTab` union type
uitgebreid met `brandclaw` variant.

- Task: [tasks/strategy-analyst-stub.md](tasks/strategy-analyst-stub.md) (Phase A vervolg)
- ADR: [adr/2026-05-08-brandclaw-agent-architectuur.md](adr/2026-05-08-brandclaw-agent-architectuur.md)
- Spec: -
- Commit: `8f09d2e3`

### 259. Fix — Auto-iterate "Verbeter automatisch" gate + silent-iter scope-fix

User klikte op de "Verbeter automatisch" CTA in canvas FidelityScoreBar (long-form
deliverable, blog/landing-page/newsletter) en kreeg `"Niet genoeg content om te
verbeteren — genereer eerst content"` terwijl content visueel zichtbaar was. Twee
compounding bugs gefixt: (1) silent auto-iterate (`canvas-orchestrator.ts:863-920`)
miste `variantIndex: 0` filter in zijn query — `groupIndex` defaultt naar 0 dus de
"variant-0" query matchte ALLE componenten, silent-iter kon variant B/C/D body
clobberen. (2) silent-iter pakte de langste text-component en verving die met een
F-VAL tightening rewrite (typisch ~40 woorden voor long-form), waarna variant-0
onder de hardcoded 50-woorden gate van `/auto-iterate/trigger` viel. Fix: (a)
scope-filter `variantIndex: 0` + `componentType notIn ['image', 'video', 'voiceover']`
+ `generatedContent: { not: null }` op silent-iter én beide apply-routes
(`/auto-iterate/apply`, `/strict-rewrite/apply`). (b) don't-shrink guard via
`getDeliverableTypeById().constraints.minWords` + relatieve 70%-floor +
`maxWords` cap (silent-iter alleen; apply-routes blijven user-explicit). (c)
trigger-gate met split error-message (F-VAL floor vs content-type richtlijn) +
type-aware label via `typeDef.name`. (d) `console.warn` op alle silent-return
paden inclusief no-eligible-component branch zodat smoke divergence kan zien.
5 review-iteraties, code-level integratie smoke 13/14 passes op 5 long-form
deliverables.

- Task: [tasks/done/auto-iterate-trigger-content-gate.md](tasks/done/auto-iterate-trigger-content-gate.md)
- ADR: -
- Spec: -
- Gotcha: `gotchas.md` 2026-05-17 "Silent auto-iterate clobbert variants + shrinkt long-form onder F-VAL gate"
- Plan: `~/.claude/plans/eager-hatching-planet.md`
- Commit: `cdd0e074`

### 258. Fix — Effie-rubric leak uit content-flow Strategy-step (P2 shared-pipeline)

Bugfix tijdens handmatige content-items-test-coverage Ronde 1: `linkedin-post`
Strategy-step bevatte letterlijk "effie-waardig" in de rationale-tekst — leak
uit interne Effie Award kwaliteits-rubric in `campaign-strategy.ts` prompts
(gedeeld tussen campaign-mode en single-content-mode via `selectedContentType`
parameter). 3-laagse defense-in-depth: (a) prompt-guards (EFFIE TEST → STRATEGIC
QUALITY TEST in `<internal_rubric>` + output-language-guards in 4 system-prompts
incl. buildStrategyBuildPrompt), (b) nieuwe `src/lib/ai/sanitize-strategy-output.ts`
utility met `scrubStrategyLayer()` toegepast op alle 3 StrategyLayer-productie-sites
(regeneration + concept-driven + quick-concept route), (c) `Effie/Cannes potential:`
labels in angle-context → `Award potential:`. Regex met word-boundary handelt
edge cases (Éffie accent, effie_award underscore, Effie/Cannes slash, Effie's
possessive) zonder onschuldige woorden (effectief, Jeffie) te raken. 30/30
smoke-cases groen. STOP-GATE genomen — representanten-test kan hervatten.

- Task: [tasks/content-items-test-coverage.md](tasks/content-items-test-coverage.md) (parent, still in-progress)
- ADR: -
- Spec: -
- Bug-log: `docs/playbooks/testplan-content-items.md` sectie 5 (linkedin-post FIXED 2026-05-17)
- Gotcha: `gotchas.md` 2026-05-17 "Internal-rubric prompt-jargon lekt via NL-vertaling"
- Follow-ups out-of-scope: veldnaam-rename `effieRationale` → `strategicQualityRationale`, hardcoded UI-labels in ConceptReviewView/ReviewStep/StrategySection, studio promo-video bio-leak
- Commit: `e849a1ed`

### 257. Track A code-debt phase close-out — Cluster A + B + C done

Closure-entry voor `code-debt-pre-launch-cleanup`. Alle drie de clusters (A
persist-TODOs / B API-deprecation / C cleanup) zijn afgerond binnen één
sessie 2026-05-17 plus eerder werk op 2026-05-12.

**Cluster A — Persist-TODOs (kritiek voor pilot UX):**
- Variant-selection persist via API (2026-05-12)
- Fix-options cache-based persist met 60-min TTL: `generateFixOptions` schrijft
  `FixOptionsResponse` naar `fix-options:${issueId}` cache, `applyFixOption`
  leest cache-hit zodat preview ↔ apply consistent zijn (geen temperature 0.3
  drift). Geen schema-change — gebruikt bestaande `lib/api/cache`.
- Persona image-storage via `getStorageProvider()`: base64 data-URI (~500KB
  per row) vervangen door stable storage URL (R2 prod, local dev). Best-effort
  cleanup van oude bestanden bij regeneratie. Persona-row shrinkt naar ~50
  bytes per avatar.
- ProseMirror diff via Markdown-isatie: rich-text inputs (headings, lists,
  blockquotes, marks bold/italic/code/underline/strike/link) serialiseren naar
  Markdown vóór paragraph-LCS, zodat formatting + structurele changes als
  remove+add entries verschijnen i.p.v. "no change". Geen externe lib —
  TipTap camelCase + canonical PM snake_case beide gehandhaafd.

**Cluster B — API-deprecation:**
- `analyzeMultipleSources` (deprecated) gemigreerd naar `synthesizeTrends` in
  researcher.ts: fallback bouwt raw-content `Signal[]` met long claim/evidence,
  zelfde patroon als de bestaande below-threshold augmentation. Twee
  deprecated functies + interne types verwijderd uit trend-analyzer.ts.
  Net -190 regels code.

**Cluster C — Cleanup:**
- Design-tokens dev-only nav-entry weg (2026-05-12).
- BrandAlignmentPage lazy-load — al gedaan via `lazy-imports.ts` + LazyWrapper
  (task-file comment was stale, verified 2026-05-17).
- urgencyLevel deprecation: input-type was number 1-5 maar canvas-orchestrator
  compareerde tegen string `'high'` — branch nooit gevuurd. Removed; strategic
  urgency loopt via adCtaType + hookFormat + urgencyMechanism.
- Step1Context `Suggest from content` error-bubble: parsed nu echte server 400
  body ("Insufficient context — add a key message, persona, or product first")
  i.p.v. generieke fallback.

**Bonus findings (deferred):**
- `DELIVERABLE_TYPE_SETTINGS` map heeft 0 consumers — full dead-code
- `buildMultiSource*` helpers in `prompts/trend-analysis.ts` orphaned na B
- `ImageSuggestion.strengths` field niet meer gerenderd sinds F-LinkedIn-1d

- Task: [tasks/done/code-debt-pre-launch-cleanup.md](tasks/done/code-debt-pre-launch-cleanup.md)
- ADR: -
- Spec: -
- Commits: 9f9b5ad2 (C: error-bubble + urgencyLevel), da9fc408 (B: analyze→synthesize), 9556016f (A: fix-options cache), 3dae25c6 (A: persona avatar storage), 5e919c5e (A: PM diff)
### 256. Brandclaw tool-orchestrator — Anthropic agent-loop + 4 query-tools live

Track B vervolg op data-collection (#255). Orchestrator is volledig
functioneel; `strategy-analyst-stub` (eerste agent-node) heeft hiermee
alle benodigde infrastructuur. Twee sub-fasen, beide groen.

**Fase 1 (commit b426d064)** — orchestrator infrastructure:
- 5 modules in `src/lib/brandclaw/orchestrator/`: types / tool-registry /
  cost-calculator / persistence / agent-loop + public index.ts.
- NodeType union (strategy_analyst / campaign_builder / measurement_eval
  / optimization), BrandclawRunContext, BrandclawTool, AgentLoopResult.
- Tool-registry per-node-type met cross-node isolation.
- Cost-calculator: Sonnet 4.6 / Opus 4.7 / Haiku 4.5 pricing + fallback.
  6-decimal precision matched Decimal(10,6).
- Persistence: createRunRow placeholder + persistRun finalize in
  transaction. ToolCallTrace per-entry getrunceerd naar 4KB voor jsonb
  size-budget.
- Agent-loop: multi-turn Anthropic tool-use met hard-timeout (5min),
  max-tool-calls (20), parallel tool-execute per turn, isError-result
  voor unknown/throwing tools, lenient JSON-parse voor observations.

**Fase 2 (deze commit)** — query-tools + telemetry:
- 4 strategy_analyst tools: `query_alignment_history`,
  `query_content_fidelity`, `query_review_history`,
  `query_brand_voice_drift` (default 90d window). Allen wrappen
  data-source via registry.
- tools/index.ts: side-effect register-imports.
- Agent-loop emit `brandclaw_run_completed` PostHog event fire-and-
  forget na persistRun.

**Smoke-test**: 23/23 → 29/29 groen. Tool-registry isolation +
cost-calculator + persistence E2E + v1 tools auto-register +
empty-workspace query execute. Anthropic API niet aangeroepen — real-API
test deferred naar strategy-analyst-stub.

**Unblockt**: `strategy-analyst-stub` (Phase 3 first node).

- Task: [tasks/done/brandclaw-tool-orchestrator.md](tasks/done/brandclaw-tool-orchestrator.md)
- ADR: [adr/2026-05-08-brandclaw-agent-architectuur.md](adr/2026-05-08-brandclaw-agent-architectuur.md)
- Spec: -
- Commits: `b426d064` (Fase 1) + commit deze entry

### 255. Brandclaw data-collection — DataSnapshot + 4 sources + Strategy Observation schema

Track B foundation pre-launch. ADR-2 schema-laag volledig live op
worktree `branddock-brandclaw`. Twee sub-fasen, beide groen.

**Schema (2 nieuwe models + 1 input-laag, 2 enums)**:
- `DataSnapshot` — immutable point-in-time inputs (workspaceId,
  sourceType TEXT, sourceId, payload JSONB, snapshotAt). Indexed op
  (workspaceId, sourceType, snapshotAt) + (sourceType, sourceId).
- `StrategyObservation` — versioned agent-output (agentVersion +
  promptVersion stempels voor drift-detection + A/B-testing).
  Evidence-veld linkt DataSnapshot rows.
- `StrategyObservationRun` — run-metadata met toolCallTrace JSON,
  totalCostUsd Decimal(10,6), latencyMs, triggerType.
- Enums ObservationSeverity (HIGH/MEDIUM/LOW) + Confidence per
  two-reasons-toets §11 — bewust apart van IssueSeverity.
- 2 formele Prisma migrations.

**Time-window primitives** (`src/lib/brandclaw/time-window.ts`): 4
helpers (`sinceNDaysAgo` / `between` / `sinceVersion` / `allTime`)
met `TimeWindow.toWhere(field)` Prisma-fragment-helper.

**DataSource registry + 4 v1 sources**:
- Singleton registry met lazy-init via `getDataSourceRegistry()`,
  importeert alle 4 v1 sources parallel via Promise.all.
- `alignment-scan-source.ts`: AlignmentScan + issue-counts per severity.
- `content-fidelity-source.ts`: ContentFidelityScore + BrandReviewFinding
  per severity/category.
- `review-log-source.ts`: ContentReviewLog (Δ-1) met source-mix +
  duration + finding-distribution.
- `voiceguide-source.ts`: drift via ResourceVersion VOICEGUIDE-historie
  + current voiceguide-state als baseline voor diff-walk.

**Smoke-test**: 16/16 (Fase 1) → 29/29 (Fase 2) groen.

**Unblockt**: `brandclaw-tool-orchestrator` (volgende task — Anthropic
tool-use die deze 4 sources via tools exposed aan Strategy Analyst
agent-loop).

- Task: [tasks/done/brandclaw-data-collection.md](tasks/done/brandclaw-data-collection.md)
- ADR: [adr/2026-05-08-brandclaw-agent-architectuur.md](adr/2026-05-08-brandclaw-agent-architectuur.md)
- Spec: -
- Commits: `90aa24ab` (Fase 1) + `1088b83a` (Fase 2)

### 254. Content-test sub-sprint #6.A — checkpoint-gates volledig gewired + closed

Closure-entry voor `content-test-wiring-gates-6A` task. Alle 8 checkpoint-gates
(brief-input / context-completeness / angle-diversity / variant-output /
sanitization / fidelity-composite / strict-rewrite / persistence) zijn
gedefinieerd in `src/lib/content-test/checkpoint-gates.ts` en gewired in
`canvas-orchestrator.ts`. Block-severity gates yielden SSE `error`-events met
`gate`-label voor client routing; warn-severity worden geaccumuleerd en
gepersisteerd naar `AICallTrace.gateWarnings`. PostHog telemetry via
`gate-metrics.ts` (`emitGateRunMetrics` + `checkGateDegradation`,
default-threshold 95% pass-rate over rolling 20-runs window) volgt de
infrastructuur op die productie-pipeline-health surfaceert.

Smoke-suite `scripts/smoke-tests/checkpoint-gates.ts` valideert 43 cases
(pass + block + warn per stage + batch-aggregator) — 43/43 groen op final
run. Bewuste interpretatie van acceptatie-bullet "8 stage-smokes × 8 files":
consolidated coverage gekozen boven 8 aparte files zonder coverage-winst.

Sub-sprint #6 Track A foundation hiermee volledig groen.

- Task: [tasks/done/content-test-wiring-gates-6A.md](tasks/done/content-test-wiring-gates-6A.md)
- ADR: -
- Spec: [docs/specs/content-test-improvement-plan.md §3.2](specs/content-test-improvement-plan.md)
- Commit: close-only entry (gates code in eerdere sprint-commits)

### 253. Image-quality-chain — 7 patterns A-G volledig geland

Multi-modal image quality pipeline volledig live: van prompt-construction tot
post-gen scoring + refine-loop + sourcing-strategie. Sluit Track A pre-launch
sprint #6/#7 image-quality scope (~10d effort over 4 sessies).

**7 patterns geleverd**:

- **Pattern A — Negative prompts** (commit 2645ee32/f9dc1180): defaults +
  per-workspace `imageryDonts` extension. Native `negative_prompt` parameter
  naar FAL Flux, Avoid-directive fallback voor Gemini Image. Consolideert
  signaal door duplicate "Avoid:" segment uit `ctx.brandImageryStyle` te
  verwijderen.
- **Pattern B — Multi-candidate** (commit 17f8ac4d): per-content-type
  default (`landing-page`/`blog-post`/`explainer-video`/`instagram-post(-carousel)`
  = 3, rest 2) via `getMultiCandidateDefault`. Auto-scoring parity:
  generate-visual (lifestyle FLUX) ontbrak fire-and-forget
  `scoreImageFidelity`; toegevoegd zodat alle 3 routes consistent zijn.
- **Pattern C — Dimension-breakdown UI** (commit f9dc1180): user-friendly NL
  labels + tooltips voor 5 visual-judge dimensies in
  `visual-dimension-labels.ts`. VisualFidelityDetail JudgeDimensions
  gebruikt `getDimensionLabel` ipv ruwe key-replace.
- **Pattern D — Image-to-image refine-loop** (commit 17f8ac4d):
  `refine-loop.ts` met `extractRefineHint` + `buildRefinePromptModification`
  heuristiek (5 dimension-templates, severity-sorted, max 3 hints).
  REFINE_TRIGGER_THRESHOLD 65, REFINE_MAX_ITERATIONS 2. POST endpoint
  `/api/studio/[id]/components/[componentId]/refine-visual` met lock-check
  + version-snapshot guards. UI `RefineImageButton` (groene Wand2 icoon)
  bij composite &lt; 65.
- **Pattern E — OCR text-in-image** (commit 94535a01): `ocr-check.ts` via
  Google Vision API. Penalty trekt 50% van OCR-deductie af van text-in-image
  dimension. OCR-data persisted in `aiJudgeDimensions.ocr` (geen schema-
  change). Smoke-script + `.env.example` documentatie.
- **Pattern F — Brand-color UI exposure** (commit 94535a01):
  VisualFidelityBadge toont nu off-brand count als kleine red pill naast
  composite-score, alleen wanneer `colorAlignment.unmatchedColors > 0`.
- **subjectIdentity 6e dimensie** (commit 94535a01): VISUAL_DIMENSIONS
  uitgebreid voor compose-flow drift-detection.
- **Pattern G1 — Modality-fit** (commit b33b767a): `recommendedModality`
  (photo/illustration/infographic/ugc/none) helper + 25+ content-types
  gemapped. ModalityHint banner met icoon + accent-color in ImageSourcePanel.
- **Pattern G2 — Reuse-detection** (commit eaf90808): pgvector embedding
  op MediaAsset.aiDescription via OpenAI text-embedding-3-small. Formele
  Prisma migration met IVFFlat cosine-index. Endpoint
  `/api/media/similar-semantic`, upload-trigger in `dam-auto-tagger`,
  `ReuseDetectionBanner` met dismissible UI (threshold 0.75).
- **Pattern G3 — Unified smart-search** (commit d45d126e): nieuwe tab in
  ImageSourcePanel combineert workspace library (semantic via pgvector,
  threshold 0.5) + Pexels (keyword). SmartSearchTab met source-badges +
  similarity-percentage + Pexels attribution footer.
- **Pattern G4 — Copy-image coherence-score** (commit b33b767a): Claude
  Haiku judge die image + variant text-content samen beoordeelt op
  subject-match / audience-match / message-reinforcement. 7e dimensie
  geïntegreerd in `aiJudgeDimensions.dimensions` onder
  `copy-image-coherence` key, gerendert via bestaande `getDimensionLabel`
  lookup.
- **Pattern G5 — Illustration pipeline templates** (commit deze entry):
  `illustration-templates.ts` met 5 styles (flat/3d/hand-drawn/minimalist/
  editorial) + per-content-type defaults (twitter→flat, blog→editorial,
  explainer-video→3d, tiktok-script→minimalist). Auto-injected vooraan
  positive-prompt wanneer chip='illustration'. Style-consistency over
  content-items binnen één campagne.

**Cost-impact per image-scoring totaal**: ~$0.04 (Sonnet visual-judge) +
~$0.001 (Haiku coherence) + ~$0.0015 (Vision OCR) = ~$0.043/image. Multi-
candidate 3× voor 5 expensive content-types = ~$0.13 per generation run.
Reuse-event bespaart 100% generation-cost.

**Quality-gates per fase**: TypeScript 0 errors, lint 0 errors, formele
Prisma migrations toegevoegd voor andere environments (MediaAsset.embedding,
VOICEGUIDE enum, MediaAsset.embeddingComputedAt + IVFFlat cosine-index).

**Out-of-scope** (vervolg-tasks): Backfill MediaAsset embeddings voor
bestaande workspaces (admin endpoint), Unsplash + Brandfetch integraties
(geen API keys; LATER roadmap, $99/mnd Brandfetch), v2 illustration via
ConsistentModel LoRA's (post-launch).

- Task: [tasks/done/image-quality-chain.md](tasks/done/image-quality-chain.md)
- ADR: -
- Spec: [docs/specs/content-test-improvement-plan.md §3.0.5](specs/content-test-improvement-plan.md)
- Commits: `2645ee32` + `f9dc1180` + `17f8ac4d` + `94535a01` + `b33b767a` + `eaf90808` + `d45d126e` + final G5

### 252. Tone of Voice tab consolidatie — BrandStyleguide → BrandVoiceguide

Schema-consolidatie van 3 velden (`contentGuidelines`, `writingGuidelines`, `examplePhrases`) plus de save-for-AI toggle (`toneSavedForAi` gesplitst in `guidelinesSavedForAi` + `examplePhrasesSavedForAi`) van `BrandStyleguide` naar `BrandVoiceguide`. Voice DNA tab in Brand Voice toont nu Content + Writing Guidelines (met OBSERVED/RECOMMENDED prefix-parsing), Vocabulary tab krijgt Do/Don't examples. Brand Styleguide "Tone of Voice" tab + `/api/brandstyle/tone-of-voice/` route + `ToneOfVoiceSection.tsx` zijn verwijderd. De migratie-banner "Voice, Tone & Communication Style — moved" in BrandPersonalitySection is opgeruimd.

**Migratie-pad** (additief eerst, data-loss laatst):
1. Prisma schema: ADD nieuwe kolommen op `BrandVoiceguide`
2. Data-migratie: idempotent script kopieerde 13 workspaces (10 nieuwe voiceguides, 3 updates) — script zelf na uitvoering verwijderd voor lint-conformiteit, ADR documenteert het pad
3. ~25 lees-sites omgeschakeld: AI-context-builders (`brand-context.ts`, `knowledge-context-fetcher.ts`), F-VAL alignment (`audit-scoring`, `data-fetcher`, `fix-generator`), claw read-tools, campaign-strategy-chain, snapshot-builders, consistent-models resolvers, design-system resolver/emitters, brand-kit composite PDF, Studio tone-check, brandstyle/ai-context route, workspace export route
4. UI: Voice DNA + Vocabulary section components uitgebreid; brandvoice API routes accepteren nieuwe velden via Zod
5. Cleanup: Tone of Voice tab/section/route weg, moved-banner weg, types opgeruimd
6. Prisma schema: REMOVE oude kolommen + `db push --accept-data-loss`
7. Formele Prisma migration toegevoegd (`20260515140000_consolidate_tone_of_voice_to_voiceguide`) voor reproducibility

**Alignment fix-generator reroute** — wanneer een Brand Alignment-fix `contentGuidelines` / `writingGuidelines` op een Brandstyle entity wil schrijven, routeren we de update transactioneel naar BrandVoiceguide. Lock-check op de Brandstyleguide entity behoudt governance-parity; best-effort version-snapshot van de voiceguide-state.

**Finalize review-loop** — 3 iteraties:
- Round 1: 2 CRITICAL gefixt (analysis-engine partial upsert preserve user-edits; fix-generator Brandstyle→Voiceguide reroute), 4 WARNING gefixt (legacy StyleguideTab union, snapshot-comment, brand-context gate-semantics, onNavigate dead-prop)
- Round 2: 1 CRITICAL gefixt (formele Prisma migration toegevoegd zodat andere environments kunnen reproduceren), 1 CRITICAL gefixt (fix-generator reroute toegevoegd met lock-check + version-snapshot)
- Round 3: 1 CRITICAL gefixt (e2e tests verwijderd voor tone_of_voice tab + section), 1 WARNING geaccepteerd met comment (ResourceVersion gebruikt STYLEGUIDE enum voor voiceguide-payload — geen VOICEGUIDE enum yet, follow-up)

**Files**:
- Task: [tasks/done/tone-of-voice-merge-into-brand-voice.md](tasks/done/tone-of-voice-merge-into-brand-voice.md)
- ADR: [adr/2026-05-15-tone-of-voice-consolidation.md](adr/2026-05-15-tone-of-voice-consolidation.md)
- Spec: -
- Commit: `3288adec`

### 222. Documentatie-architectuur migratie (week 1)

CLAUDE.md teruggebracht van 2323 → 270 regels, repo root van 37 → 5 .md bestanden. Nieuwe `docs/` structuur (adr/playbooks/specs/archive), `tasks/<id>.md` pattern, `roadmap.md` met Now/Next/Later, `START_HERE.md` als entry point, 8 retroactieve ADRs en `docs/changelog.md` als doorgaand register.

- Task: [tasks/done/docs-migration-week-1.md](../tasks/done/docs-migration-week-1.md)
- ADR: [adr/2026-05-07-claude-md-restructure.md](adr/2026-05-07-claude-md-restructure.md), [adr/2026-05-07-tasks-as-files.md](adr/2026-05-07-tasks-as-files.md)
- Spec: -
- Commit: `47cf1aa` (week 1) + `0abd656` (afronding)

### 223. Backlog herstructurering — open plans + roadmap items naar tasks/

13 NOW + Next-bucket roadmap-items gedistilleerd naar `tasks/<id>.md` files volgens template (campaign-drafts, claw-page-awareness, power-user-shortcuts, hooks-routines-week-3, stripe-billing-live, vercel-deployment, pilot-onboarding-better-brands, posthog-sentry-browser, canvas-inline-edit-overlays, bv-wire-w1-full-centroid, content-styling-migratie, tech-debt-any-types, auto-trigger-fidelity-scoring). Roadmap-links bijgewerkt, originele plan-docs in archive gemarkeerd als gedistilleerd.

- Task: [tasks/done/tasks-migration-week-2.md](../tasks/done/tasks-migration-week-2.md)
- ADR: [adr/2026-05-07-tasks-as-files.md](adr/2026-05-07-tasks-as-files.md)
- Spec: -
- Commit: `0abd656`

### 224. Hooks + skills + subagents + eerste autonome routine (week 3)

`.claude/settings.json` met PostToolUse Edit hook (tsc + eslint via `post-edit-typecheck.sh`), PreToolUse Bash hook (`check-dangerous-bash.sh`), Stop hook (`session-summary.sh`). Skills `pre-commit` en `adr-create` toegevoegd naast bestaande `task-finalize`. Subagents `code-reviewer`, `regression-detector`, `doc-keeper`. Eerste autonome routine `nightly-doc-sync.yml` (02:00 NL, max 50K tokens) — eerste handmatige run + cost-monitoring blijven handover-items voor user.

- Task: [tasks/done/hooks-routines-week-3.md](../tasks/done/hooks-routines-week-3.md)
- ADR: -
- Spec: [playbooks/working-flow.md](playbooks/working-flow.md)
- Commit: `0abd656`

### 225. Feature-planner sparring-partner (PM + Tech-Lead subagents)

Twee gescheiden subagents voor feature-discovery vóór code wordt geschreven. `feature-planner` (PM-mode) doet 6-assen discovery + anti-sycophancy (3 redenen om NIET te bouwen) + 5-punts stop-conditie + Red Team Review, output naar `tasks/_drafts/idea-<id>.md`. `technical-planner` (Tech-Lead-mode) past Phase -1 Gates (Simplicity/Anti-Abstraction/Integration-First) toe en promoot idea-file naar uitvoerbare `tasks/<id>.md`. Forced commitment moment tussen fases voorkomt premature technical design — onderzoek wees dit aan als #1 valkuil voor solo-devs. Plus: 2 nieuwe Stream Deck triggers (Plan feature, Tech plan), staging area `tasks/_drafts/`, gids `docs/playbooks/feature-discovery.md`. Smoke-test handover voor user.

- Task: [tasks/done/feature-planner-setup.md](../tasks/done/feature-planner-setup.md)
- ADR: [adr/2026-05-07-feature-planner-architecture.md](adr/2026-05-07-feature-planner-architecture.md)
- Spec: [playbooks/feature-discovery.md](playbooks/feature-discovery.md)
- Commit: `5bd7886`

### 226. Studio component generation — echte AI in 3 routes (P0)

TODO-stubs in `generate`/`regenerate`/`generate-all` routes vervangen door echte AI-calls via nieuwe `dispatchTextCompletion` (multi-provider: Anthropic/OpenAI/Google). Cascading-context werkt nu in generate-all (component N ziet output van 1..N-1 via uitgebreide `buildCascadingComponentContext` met `includeStatuses` parameter), feedback wordt eerlijk gehonoreerd in regenerate (bug-fix: oude versie las stale feedbackText), en NEEDS_REVISION rijen in generate-all gebruiken hun bestaande feedback (compileComponentFeedback). Observability via `aiProvider`/`generationDuration`/`promptUsed` op DeliverableComponent. Concurrency-guards via `updateMany` met status-filters voorkomen double-spend op parallelle calls; metadata pas op success-path. Cache invalidation per `prefixes.{studio,campaigns,dashboard}`. Long-form components (body_text/article/blog_body etc.) krijgen 8192 tokens + 180s timeout via per-componentType helper. Prompt-injection via `additionalInstructions`/`feedback` afgevangen (strip leading `#`, length cap). 6 nieuwe helpers: `anthropicClient` singleton, `dispatchTextCompletion`, `buildComponentPrompt`, `extractPersonaIdsFromSettings` (canonical `targetPersonas` key), `getMaxTokensForComponent`, `sanitizeUserInput`. Plus `npm run smoke:studio` integratie-test (`scripts/smoke-tests/studio-generation.ts`) die de routes-logica direct aanroept tegen real-DB + real-AI. 5 review-rounds (2-subagent loop) liepen tot 0 CRITICAL/WARNING.

- Task: [tasks/done/studio-content-generation-real-ai.md](../tasks/done/studio-content-generation-real-ai.md)
- ADR: -
- Spec: -
- Commit: `4a54fad` (initial) + `fbc44d7` (hardening)

### 227. ContentVersion CRUD + studio hooks + version-history sidebar

Server-side: 4 CRUD-routes onder `/api/content/[deliverableId]/versions/` (list/detail/create-USER/restore). Helper `src/lib/learning-loop/content-version.ts` met `createContentVersion` (auto-versionNumber met retry-on-P2002 race-protection, USER-edits krijgen automatisch diff via bestaande buildDiff/classifyEdit), `restoreContentVersion` (transactioneel revert van deliverable + componenten met P2025 graceful skip voor verwijderde componenten, schrijft nieuwe USER-version voor audit-trail), `buildDeliverableSnapshot`. ContentVersion is per-deliverable (Cat 4 design uit `branddock-learning-loop-decisions.md` beslissing 4): full deliverable + alle componenten in 1 snapshot, restore reverteert hele bundle. AI-versies krijgen `createdBy='AI'`, alle 4 diff-velden NULL; USER-versies krijgen `editorUserId` + `diffFromPrevious` + `diffSummary` + `editType`. Hooks in 3 studio-routes (generate/regenerate/generate-all) creëren automatisch AI-versions na success én vuren async `scoreContentFidelity` af (absorbeert `auto-trigger-fidelity-scoring` task). Cache: nieuwe `prefixes.contentVersions(deliverableId)`. Client-side: API-client + 4 TanStack hooks (`useContentVersions` met staleTime=0 voor refetch-on-focus, `useContentVersion` met staleTime=Infinity want immutable, `useCreateUserContentVersion`, `useRestoreContentVersion`) + `VersionHistorySidebar.tsx` component met loading/error/empty states + restore-confirmatie. UI-integratie in CanvasPage als handover (drop-in: `<VersionHistorySidebar deliverableId={...} />`). 2 review-rounds tot 0 CRITICAL/WARNING. Smoke-test (Test 4 in `npm run smoke:studio`) verifieert end-to-end: AI-version → USER-version met editType=expand → restore creëert nieuwe version en reverteert component-content.

- Task: [tasks/done/content-versioning-crud.md](../tasks/done/content-versioning-crud.md)
- ADR: -
- Spec: -
- Commit: `58355cf` (iter 1+2 server) + `9dc5e2a` (iter 3+4 UI)

### 228. Auto-trigger fidelity-scoring (absorbed in #227)

`scoreContentFidelity()` wordt nu async fire-and-forget aangeroepen na elke AI ContentVersion-creatie in generate/regenerate/generate-all. Was geblokkeerd op ContentVersion-routes; afgerond als deel van #227.

- Task: [tasks/done/auto-trigger-fidelity-scoring.md](../tasks/done/auto-trigger-fidelity-scoring.md)
- ADR: [adr/2026-05-05-fval-three-pillar.md](adr/2026-05-05-fval-three-pillar.md)
- Spec: -
- Commit: `58355cf`

### 229. Brand-voice content integration (absorbed by 3 eerdere werkstromen)

Task gesloten zonder nieuwe code: de scope was BrandVoiceguide injectie in generation-prompts + voice-consistency score, maar drie eerdere werkstromen leveren dit samen al. **(1) BV-1 (sessie 2026-05-06)** voegt `brandVoiceguide` veld aan `BrandContextBlock` en rendert via `formatBrandVoiceguide()` in alle drie tier-renders van `formatBrandContext()` — dus elke AI-call die `getBrandContext()` gebruikt krijgt voice automatisch. **(2) Sessie 3j fidelity-scorer (2026-05-06)** definieert `brand-fidelity` als universal core criterion in elke content-category met description "Voice consistency, value-message alignment, positioning reinforcement" — `source: 'ai-judge'` zodat de AI-judge call de voice-fit beoordeelt. **(3) Entry #227 content-versioning-crud (2026-05-07)** bedraadt `void scoreContentFidelity()` na elke AI ContentVersion in generate/regenerate/generate-all routes. Resultaat: voice gaat automatisch de prompt in én wordt automatisch achteraf gescoord. Aparte voice-check route + dedicated voice-score badge in canvas blijven open als follow-up indien gewenst, maar zijn UI-keuzes — geen integratie-werk meer nodig.

- Task: [tasks/done/brand-voice-content-integration.md](../tasks/done/brand-voice-content-integration.md)
- ADR: [adr/2026-05-06-brand-voice-extraction.md](adr/2026-05-06-brand-voice-extraction.md)
- Spec: -
- Commit: -

### 230. Content publish QA-gate (fidelity-score blokkeert bij sub-threshold)

Server-side: helper `src/lib/learning-loop/content-readiness.ts` `getContentReadiness(deliverableId, workspaceId)` haalt de meest recente `ContentFidelityScore` op over alle versies van de deliverable (niet alleen latest version, dat zou bij user-edits silent failsafe-open triggeren). Drie nieuwe API-routes: `GET /api/studio/[deliverableId]/readiness` (status-check voor UI), `POST /api/studio/[deliverableId]/publish-with-override` (override-pad met `reason: string min 10 max 500`, emit `content.published` met `reason="override (score N): <text>"` voor analytics). Bestaande `POST /api/studio/[deliverableId]/publish` route blokkeert nu met 422 bij `!canPublish` met details + override-endpoint URL. **Channel-publish gate**: `POST /api/studio/[deliverableId]/publish-to-channel` (de route die naar LinkedIn/email/WordPress pushed) heeft dezelfde gate gekregen — accepteert `overrideReason` body-veld als bypass, emit override-event bij gebruik. Failsafe-open bij no-version/no-score zodat infrastructuur-outage publish niet brickt. Threshold per content-type uit bestaande `fidelity-criteria.ts compositeThreshold` (70 default, 65 voor social, etc.). Client-side: API-client + 2 TanStack hooks + drop-in `PublishGate.tsx` component (badge groen/geel/rood + disabled publish-knop met tooltip + override-modal met escape-to-close, role=dialog, focus-trap-baseline + verplicht reden-veld). 3 review-rounds; round-2 vond gat in `/publish-to-channel`, round-3 verifieerde fix. Smoke-test Test 5 in `npm run smoke:studio` valideert end-to-end: composite=42 blocks, =78 allows, no-score failsafe-open. **Handover**: PublishGate UI is drop-in maar nog niet gewired in CanvasPage (zelfde patroon als VersionHistorySidebar uit #227); server-side gate werkt zonder UI-integratie, integratie is een aparte UI-task.

- Task: [tasks/done/content-item-qa-gating.md](../tasks/done/content-item-qa-gating.md)
- ADR: -
- Spec: -
- Commit: `817b586`

### 231. PostHog browser + Sentry frontend observability

Browser-side observability vóór de eerste pilot. PostHog: `posthog-js` package + `src/lib/analytics/posthog-browser.ts` (singleton met failsafe no-op zonder `NEXT_PUBLIC_POSTHOG_KEY`, mirror van bestaande `src/lib/analytics/posthog.ts` server-pattern uit sessie 4.5) + `src/components/analytics/PostHogProvider.tsx` (root-level client component, `useSession()`-driven identify/reset, group analytics op workspace + organization, default `https://eu.i.posthog.com`). Auto-pageview + auto-capture aan, session-recording uit (privacy + bundle). Sentry: `@sentry/nextjs` v10 modern pattern via `instrumentation.ts` (server + edge runtime) + `instrumentation-client.ts` (browser, met `browserTracingIntegration` voor history-API pageviews die de hybride-SPA nodig heeft). `next.config.ts` voorwaardelijk wrap met `withSentryConfig` — alleen actief wanneer `NEXT_PUBLIC_SENTRY_DSN` gezet (geen build-tijd source-map upload tenzij `SENTRY_AUTH_TOKEN` ook gezet, dus dev/CI veilig). Tunnel via `/monitoring` om ad-blockers te bypassen. **5 events live**: `login_succeeded` + `signup_completed` (AuthPage), `content_qa_gate_blocked` (1× per below-threshold transition via fingerprint-ref dedup), `content_qa_override_modal_opened`, `content_qa_override_fired` (alle 3 in PublishGate uit #230). **Deferred** (out-of-scope follow-up): `content_generated`, `content_published`, `campaign_created`, `campaign_briefing_completed` — vereisen edits in canvas-orchestratie en wizard-flow buiten deze 1u-scope. Env-vars vereist voor productie: `NEXT_PUBLIC_POSTHOG_KEY` + `SENTRY_DSN` + `NEXT_PUBLIC_SENTRY_DSN` (+ `SENTRY_ORG` + `SENTRY_PROJECT` + `SENTRY_AUTH_TOKEN` voor source-maps). tsc + eslint clean op alle 8 nieuwe/gewijzigde files.

- Task: [tasks/done/posthog-sentry-browser.md](../tasks/done/posthog-sentry-browser.md)
- ADR: -
- Spec: -
- Commit: `3eb5b4d`

### 232. Campaign drafts DB-backed (absorbed by 3 eerdere sessies)

Task gesloten zonder nieuwe code: scope was DB-backed campaign drafts met multi-device persistence + max-5 limit + naadloze launch. Drie eerdere commits leveren dit samen al volledig:

1. **`a6204bc` (Sessie 1)** — `feat: DB-backed campaign drafts — schema + API endpoints` toegevoegd: `CampaignStatus.DRAFT` enum + `Campaign.wizardState`/`wizardOwnerId`/`wizardStep`/`wizardLastSavedAt` columns + dedicated draft-lookup index `[workspaceId, status, wizardOwnerId, isArchived, wizardLastSavedAt]`. Routes `POST/GET /api/campaigns/wizard/drafts` met `MAX_DRAFTS_PER_USER = 5` enforced + `PATCH/DELETE /api/campaigns/wizard/drafts/[id]`.
2. **`e55fc3c` (Sessie 2)** — `feat: campaign wizard auto-save to DB drafts`: `useDraftAutoSave` hook met `buildServerSnapshot` (263 regels). Auto-save op stap-transities, niet field-changes. `useCampaignWizardStore` wired voor draft-linkage.
3. **`dfc81ac` (Sessie 3)** — `feat: drafts picker UI + resume flow`: `DraftCampaignsList` + `DraftPickerModal` componenten + `loadDraftForResume` helper. ActiveCampaignsPage toont drafts in eigen sectie (vervuilen Active lijst niet).

Plus `19ea44d` route-fix (CONTENT-drafts naar Content Library i.p.v. Campaigns page) maakt het type-onderscheid robuust. Launch-route `wizard/launch/route.ts` doet nu conditional UPDATE (regel 92, draftId → ACTIVE) of INSERT (regel 113, geen draft).

Alle 11 acceptatiecriteria uit task-file: 11/11 satisfied. Smoke-test plan kan uitgevoerd worden zodra je echt drafts wilt testen — implementatie staat klaar.

- Task: [tasks/done/campaign-drafts-db-backed.md](../tasks/done/campaign-drafts-db-backed.md)
- ADR: -
- Spec: [archive/plans-pending-task-migration/IMPLEMENTATIEPLAN-CAMPAIGN-DRAFTS.md](archive/plans-pending-task-migration/IMPLEMENTATIEPLAN-CAMPAIGN-DRAFTS.md)
- Commit: `a6204bc` + `e55fc3c` + `dfc81ac` + `19ea44d`

### 233. Pre-pilot UI-wiring — VersionHistorySidebar + PublishGate in Step4Timeline

Handover-werk uit #227 + #230 afgemaakt. Beide drop-in componenten leefden nog niet in de actieve UI; pilot-users zouden ze niet zien zonder deze wiring. Integratie minimaal-invasief in `Step4Timeline.tsx` (de "review + publish" stap van canvas-accordion):

1. `<PublishGate>` als banner-rij bovenaan (toont fidelity-score badge groen/geel/rood + override-modal-pad). Pad voor de existing schedule/approve buttons blijft intact zodat channel-publish + email-send flows werken; gate-knop is een extra publish-pad mét score-validatie.
2. `<VersionHistorySidebar>` als slide-over panel rechts (`fixed inset-y-0 right-0 z-40`), togglable via "Toon versies" / "Verberg versies" link in de readiness-rij.

Geen layout-restructure van CanvasPage nodig — beide secties hangen aan de bestaande Step4Timeline render-tree. tsc + eslint clean op de gewijzigde file (2 pre-existing warnings ongewijzigd).

- Task: handover van #227 + #230, geen aparte task-file
- ADR: -
- Spec: -
- Commit: `1f782c3`

### 234. Content-styling migratie volledig afgerond — 9 categorieën

Laatste open NOW-task uit pre-launch. **Validator-driven afgerond**: validator-script `scripts/validate-content-styling-migration.ts` (commit `e815861`) leest 3 source-files (canvas-orchestrator.ts + content-type-inputs.ts + medium-config-registry.ts) en checkt per categorie of de migratie compleet is op 4 plekken (field-builder, MEDIUM_CONFIG_HANDLED_KEYS Set, rich format-case, legacy-cleanup). Eerste run toonde 35 issues — na filteren van validator-false-positives (shared-helper functions zoals `socialContentStyleFields`) bleven er 9 echte gaps over. Alle 9 gefixt:

**MEDIUM_CONFIG_HANDLED_KEYS uitgebreid** (9 keys): sales `salesAngle`/`includePricing`, pr-hr `structure`/`quoteCount`/`includeBoilerplate`/`includeContactBlock`, carousel `transitionStyle`, video `colorGrade`/`quality`.

**Rich-format cases toegevoegd in `formatMediumConfig`**: sales (angle-mapping + pricing-toggle), pr-hr (structure + quote-count + boilerplate + contact-block), carousel (transition-style mapping), video (color-grade mapping + quality target).

**Field-builder toegevoegd**: `colorGrade()` in content-type-inputs.ts (warm/cool/vibrant/natural opties + helpText), opgenomen in `videoContentStyleFields()`.

**Legacy-cleanup**: `colorGrade` field verwijderd uit `medium-config-registry.ts` Step 3 Medium-sectie. Step 3 toont nu alleen platform-rendering (duration, aspectRatio, quality).

**Twee bewuste niet-migraties bevestigd**: `hasEmbargo` (gedropt 2026-04-28 als irrelevant voor HR/internal/career) en `proofPointDensity` (gedropt 2026-04-28 als 1-5 numeric te granular). Validator-expectations bijgewerkt om deze niet als gap te tellen. `ctaType` blijft semantisch gedeeld web-page rendering ↔ advertising migratie (1 veld, 2 use-cases).

Final validator: 10 categorieën, 0 issues. tsc + eslint clean op alle gewijzigde files (1 pre-existing warning in canvas-orchestrator.ts:144 niet door deze task).

- Task: [tasks/done/content-styling-migratie.md](../tasks/done/content-styling-migratie.md)
- ADR: -
- Spec: -
- Commit: `e815861` (validator) + `c331df8` (migratie-fixes)

### 234. Campaign-wizard concept-approval bug-fix + UX-redesign

Bug-fix + UX rework op de "Review Creative Concept" wizard-stap. **Bug**: button bleef disabled bij 6/6 ratings omdat de view rendeerde uit `finalStrategy ?? synthesizedStrategy` maar gate `allConceptRated()` en handler `handleApprove` lazen alleen `synthesizedStrategy`. In campaign-mode multi-variant flow vult `setFinalStrategyResult` `finalStrategy` met o.a. `effieRationale` terwijl `synthesizedStrategy` null kan blijven → silent gate-mismatch + silent handleApprove early-return. **Fix**: gate én handler dezelfde fallback-keten (`finalStrategy ?? synthesizedStrategy`) + dev-only `console.warn` (signature-deduped via module-level Set) wanneer beide bestaan en op concept-velden divergeren — diagnostiek voor follow-up investigation. **UX-redesign**: button altijd-klikbaar met `sonner` toast + smooth-scroll naar eerste ongeraten card bij `!allRated`; per-card status-dot (emerald/amber via inline-style ivm Tailwind 4 purge); "Mark all as approved" `<Button variant="ghost">` shortcut; "Refine Concept" ontkoppeld van `allRated` zodat refinement ook kan met partial input; progress-tekst kleurlogica (groen=compleet, amber=partial, leeg=0); optional feedback verplaatst naar `<details>` accordion met `useState`-driven open-state (lazy initializer leest `conceptFeedback`, daarna user-controlled via `onToggle`); ELEMENTS constant dedupliceert 6 inline cards. Twee parallelle code-reviewer rondes: round 1 ving sticky-footer-clash met de wizard's eigen Continue-button + 6 ontbrekende Tailwind utilities (`scroll-mt-24`, `pb-24`, `bg-emerald-500`, etc.) — beide opgelost door sticky te droppen en inline-styles waar nodig; round 2 ving `<details open={...}>` controlled/uncontrolled hybrid + scrollMarginTop overkill — opgelost via `useState` desync en verwijdering. Tests deferred (geen vitest/jest infra in repo — apart `vitest-setup` task aangeraden); E2E deferred (bestaande wizard-spec test alleen stepper-rendering, geen AI-flow precedent). gotchas-entry geschreven: "view-prop vs store-state divergentie maakt button silent-disabled" met prior art naar twee silent-failure incidenten uit april 2026.

- Task: [tasks/done/concept-approval-ux-fix.md](../tasks/done/concept-approval-ux-fix.md)
- ADR: -
- Spec: -
- Commit: `aee6d91`

### 235. Tech-debt any-types fully cleared — 0 real `: any` left in src/

Multi-cluster TypeScript-strictening voltooid: alle 146 `: any` annotations uit src/ vervangen door proper Prisma-types, generics, of `unknown`. Tegelijk Phase 0 voorloper voor Brand Control Program — schema-extensie van Δ-1/2/3/4 en Strategy Analyst-stub kan veilig op deze laag bouwen.

**Deze sessie (62 fixes in 6 refactor-commits + 1 docs-commit)**:
- `fcf4002` — knowledge-resources + personas API mappers (`Pick<KnowledgeResource>`, `Prisma.WhereInput`/`UpdateInput`, `GeminiImagePart`, full `Persona`)
- `4598dde` — strategies/route.ts mappers (`Prisma.BusinessStrategyGetPayload<{include}>` + optional `lockedBy` intersection voor 4 callers)
- `2b035e4` — component wrappers (`React.ComponentProps<typeof Updated>`) + `LucideIcon` op 11 icon-fields. Edge-case `CanvasWorkspaceShared.icon?: string` (key in iconMap, géén component)
- `804b385` — 4 brand asset canvases krijgen per-canvas data shape types (Mission/Golden/Archetype met `Archetype`-record/Values met `BrandValueItem`); spread-merge fix in MissionStatement zodat partial sessionContent fallt-back op defaultData
- `71302b9` — `cache.ts RouteHandler args: unknown[]` (HOC pattern), `validation-methods icon: LucideIcon`, 5 canvas state-updaters `value: unknown` met polymorphism-comments
- `5346c1e` — `ResearchPlanConfiguration` (export uit ResearchPlanContext, dekt tool-flow + bundle-flow union), lokale `ResearchItem` interface, `ChangeImpactService.activeCampaigns` minimal contract
- `3c25a07` — separate Brand Control Program plan + ADR-1 + ADR-3 (niet onderdeel van deze task maar wel onderbouwing voor de Phase 0 promotion)

**Latent bug surfaced + fixed**: `ResearchDashboard` las `researchPlanConfig.numberOfInterviews/numberOfQuestionnaires` direct, maar die velden zitten in `.configuration.numberOfInterviews/...` (geneste). Het oude `: any` maskeerde dit. Gefixt naar nested access; runtime-gedrag identiek dankzij bestaande `|| 3` fallback.

**Eind-staat**: 29 ruwe matches in `grep -rn ": any" src/`, waarvan 25 in `src/generated/prisma` (NIET aanraak per task-file) en 4 false-positives in comments/string-literals (AMBER-comment, `anyAlpha` varname, "Optional: any notes" string, Adobe-Fonts-detection comment). **0 echte `: any` annotations** in handgeschreven src/.

Two-subagent code-review: 0 CRITICAL, 3 WARNINGS — alle 3 gemarkeerd als acceptable/out-of-scope/pre-existing (deferred MINOR list). tsc + lint groen (0 errors, 960 warnings). E2E-smoke deferred wegens missing `branddock_test` database in env (niet code-gerelateerd; type-only refactor met identiek runtime-gedrag).

- Task: [tasks/done/tech-debt-any-types.md](../tasks/done/tech-debt-any-types.md)
- ADR: -
- Spec: [tasks/_drafts/idea-brand-control-program.md](../tasks/_drafts/idea-brand-control-program.md) (Phase 0 voorloper context)
- Commit: `fcf4002` + `4598dde` + `2b035e4` + `804b385` + `71302b9` + `5346c1e` + `33ea121` (finalize)

### 236. BV-WIRE W-1 full centroid — task closure

Implementation already landed in commit `323ba39` (2026-05-06): voice-similarity helpers (`cosineSimilarity` / `projectSimilarityToScore` / `fetchVoiceguideCentroid` / `embedContentForVoiceMatch` / `scoreVoiceSimilarity`), composition-engine 50/50 blend wiring (`voiceguideCentroid?: number[] | null` field, `pillar1EffectiveScore` combine), fidelity-runner parallel centroid-fetch alongside personality + config. `scorerVersion` krijgt `+voice-emb-1.0` suffix wanneer semantic actief was. style-scorer.ts blijft pure string-match — backwards compat. Empirical regression Better Brands: +24 punten Δ pre/post W-1-full (BB content thematisch verwant aan voiceguide samples maar gebruikt weinig van declared `wordsWeUse` — semantic match corrigeert deze underrepresentation).

Task formal closure 2026-05-08: implementation reviewed in scope of Brand Control Program Phase 1. Multi-workspace centroid seeding (Linfi / Nobox / WRA Juristen via `scripts/fidelity/seed-voiceguide-centroids.ts`) is operational follow-up — no further code-change needed. Demo workspace re-test deferred to runtime-environment (vereist DB + OPENAI_API_KEY).

- Task: [tasks/done/bv-wire-w1-full-centroid.md](../tasks/done/bv-wire-w1-full-centroid.md)
- ADR: -
- Spec: [tasks/_drafts/idea-brand-control-program.md](../tasks/_drafts/idea-brand-control-program.md) (Phase 1 #1)
- Commit: `323ba39` (implementation, 2026-05-06) + closure-commit `5489675`

### 237. Brand Assistant fill_form_fields foundation — Phase 0.2.A claw-page-awareness

Generic write-tool infrastructure waarmee de AI editable form-fields op elke page kan invullen via `fill_form_fields([{key, value}, ...])` — bracket-notation ondersteund. Mirror van bestaand `update_campaign_wizard` pattern: server-execute returnt `clientAction: 'form_fill'` met assignments; `MutationConfirmCard` routes naar `useFormFillStore.applyFill()` na user-confirm.

**Foundation geleverd (8 files, commit `f5b9090` + finalize-fixes):**
- `src/stores/useFormFillStore.ts` (new) — Zustand store met `registerFields` / `clearFields` / `applyFill` API; returns `{applied, missing}` zodat de client kan tonen welke keys de active page niet exposeert
- `src/lib/claw/claw.types.ts` — `formFillFields` array op `ClawPageContext`
- `src/app/api/claw/chat/route.ts` — Zod schema-extension
- `src/lib/claw/tools/write-tools.ts` — nieuw `fill_form_fields` tool met Zod input + `clientAction: 'form_fill'` op execute
- `src/lib/claw/context-assembler.ts` — `formatFormFillFields()` surfaces velden + tool-instructies in system prompt; instrueert preferring dedicated tools
- `src/features/claw/components/InputBar.tsx` — leest `useFormFillStore.fields` + includes in pageContext
- `src/features/claw/components/MutationConfirmCard.tsx` — `clientAction === 'form_fill'` handler + label-overlay (registered label i.p.v. raw key) + conditional footer text voor client-only tools ("Save manually to persist" vs DB-snapshot-message) + defensive type-predicate filter op assignments

**Deferred follow-ups** (eigen sub-cluster, niet langer in deze task-file):
- Page-wiring voor PersonaDetail/BrandAssetDetail/Step1Context — alle 3 hebben dedicated tools (update_persona, update_asset_*, update_deliverable_*); `fill_form_fields` is bedoeld voor pages zonder dedicated tool. Wiring pagina-specifiek edit-state-refactor zinnig zodra die pages er zijn.
- Δ-1 chat-integratie compat-criteria 1-3 (sectionPath voor Canvas Step 4 + content-text returns + chat-card pattern) — landen natuurlijk binnen Δ-1 implementation in Phase 2 van Brand Control Program.

**Two-subagent review**: 3 iteraties tot 0 CRITICAL/WARNING. Round 1: misleading footer text + defensive cast — beide gefixt. Round 2: type predicate value-property check — gefixt. Round 3: clean (1 soft-MINOR over string-literal coupling — established codebase pattern, deferred).

tsc + lint clean (0 errors, 960 warnings, declining trend). Smoke-test deferred — vereist gewired page; foundation is non-regression (AI ziet `formFillFields = []` tot page registreert, valt terug op dedicated tools).

Phase 0 voorloper #2 Brand Control Program — foundation klaar.

- Task: [tasks/done/claw-page-awareness.md](../tasks/done/claw-page-awareness.md)
- ADR: -
- Spec: [tasks/_drafts/idea-brand-control-program.md](../tasks/_drafts/idea-brand-control-program.md) (Phase 0.2.A)
- Commit: `f5b9090` (foundation) + `f709329` (finalize)

### 238. Competitor historie data-laag — Snapshot/Activity/ContentItem (Competitive-intel Fase 1)

Foundation voor de Competitive Intelligence Loop: drie nieuwe Prisma-modellen (`CompetitorSnapshot`, `CompetitorActivity`, `CompetitorContentItem`) met hash-based no-op detection (analoog aan `BrandstyleSnapshot`-pattern), 7 deterministische diff-rules (TAGLINE / VALUE_PROP / PRICING / NEW_PRODUCT / PRODUCT_REMOVED / STATUS / TIER), en refresh-route herschreven naar dual-write transactie via `applyCompetitorRefreshDualWrite` helper die ook door smoke-tests wordt hergebruikt.

**Geleverd (3 PRs, ~2300 regels):**
- **PR-1 schema** (`fd2738c`) — 3 modellen, 6 enums, 5 nieuwe Competitor-velden (monitoring + aggregaten), 1 unique constraint `(competitorId, contentHash)`, pgvector embedding-veld op ContentItem. Backwards-compat: 25 bestaande competitors krijgen defaults zonder NULL-issues.
- **PR-2 hash + diff + backfill** (`99df752`) — `snapshot-hash.ts` (sha256 + canonical sort + whitespace-normalize), `diff-engine.ts` (Jaccard word-set distance voor PRICING met min-length guard, set-diff met case-insensitive membership maar case-preserved values), `backfill-competitor-snapshots.ts` (idempotent per-row tx, 7 retroactive snapshots geschreven, 2e run schrijft 0).
- **PR-3 refresh dual-write** (`5d16834`) — route schrijft snapshot bij hash-mismatch, hergebruikt `applyCompetitorRefreshDualWrite` helper voor de transactie-body. Workflow events (STATUS_CHANGED, TIER_CHANGED) draaien ook op no-op pad. Defensive `isCanonicalShape` shape-guard op historic snapshot-JSON.

**Smoke-tests (totaal 67 asserts):** `competitor-diff-engine.ts` 46/46 (3 lagen: hash determinisme / 7 rules / no-op + edges), `competitor-refresh-dual-write.ts` 21/21 (3 scenarios: no-op-met-workflow-event, hash-miss content, idempotency). Beide gebruiken `tsx` runner volgens project-conventie.

**Two-subagent review**: 3 iteraties. Round 1: 2 CRITICAL (data-loss op hash-match, race condition zonder unique constraint) + 8 WARNING. Round 2: P2002 try/catch was unsafe wegens Prisma `$transaction(fn)` ontbreekt savepoints — verwijderd, race-tradeoff gedocumenteerd voor MVP. Round 3: 0 CRITICAL, alle resterende WARNINGs zijn edge-cases / MVP-tradeoffs (gedocumenteerd).

**Out-of-scope** (vervolg-tasks): AI-classified events (NEW_FORMAT_EMERGING, CATEGORY_REPOSITIONING, etc.), ContentItem auto-discovery, embedding-pipeline, Brandclaw monitoring (Fase 4 post-launch), positioning-frameworks UI (Fase 2), production-grade race-protection via raw SQL `INSERT ON CONFLICT`.

**Documentatie**: idea-doc, ADR, en `prisma/migrations-pending-bootstrap/2026-05-08_competitor_snapshot_models.sql` (voor toekomstige Vercel/Neon migration-bootstrap — project gebruikt sinds februari 2026 `db push` ipv migrations).

- Task: [tasks/done/competitor-snapshot-historie.md](../tasks/done/competitor-snapshot-historie.md)
- ADR: [adr/2026-05-08-competitor-snapshot-historie.md](adr/2026-05-08-competitor-snapshot-historie.md)
- Spec: [tasks/_drafts/idea-competitive-intelligence-loop.md](../tasks/_drafts/idea-competitive-intelligence-loop.md)
- Commit: `fd2738c` (PR-1 schema) + `99df752` (PR-2 hash+diff+backfill) + `5d16834` (PR-3 refresh) + `89b15f9` (finalize)

### 239. Δ-1 Content Review — foundation + engine + API v1 (Brand Control Program Phase 2 #1)

Foundation voor de drie review-surfaces (Brand Alignment Tab 3, Brand Assistant `review_content` chat-tool, PublishGate uitbreiding) — één engine, één endpoint, drie consumers. Schema-additions: `BrandReviewFinding` (XOR FK naar ContentFidelityScore OF ContentReviewLog, afgedwongen via raw Postgres CHECK constraint), `ContentReviewLog` (extern-content audit-rij met 90-dagen `retainUntil`), 2 enums (`BrandReviewSeverity`, `FindingCategory`). Engine `runFidelityForExternalContent` orchestreert F-VAL run zonder canvas-stack/persona/strategy summaries; mappt RuleViolations → BrandReviewFinding via heuristic-prefix-parsing (`heuristic:<locale>:<category>:*` → VOICE/CLAIMS/STYLE/AI_TELL, BrandRule fallback → TERMINOLOGY). API `POST /api/alignment/review-external` accepteert paste/url/file (file deferred naar B-2) met SSRF-hardened URL-ingest: scheme allowlist (http/https), DNS-resolve elke redirect-hop met private/loopback/link-local IP-block (RFC1918 + cloud-metadata + IPv6 ULA/link-local), manual redirect-follow (max 3 hops), byte-cap streaming reader (5 MB ceiling), Content-Length pre-check, opaqueredirect-guard, en backtracking-vrij stripHtml via 2-pass indexOf-scan. Status-mapping: 400/403/413/504/501/422 per IngestError code. Char-offsets in findings 1:1 consistent met `sourceContent` storage (pure slice voor compute, marker alleen in storage).

**Live smoke** (`scripts/heuristics/smoke-external-review.ts`): 1733ms run via Better Brands workspace, 5 findings persisted, XOR FK constraint geverifieerd, scorerVersion `composition-engine-v1.0+voice-emb-1.0` (W-1-full centroid actief), cascade-delete cleanup geverifieerd.

**Two-subagent review**: 4 iteraties. Round 1+2: meerdere CRITICAL (SSRF, char-offset/storage mismatch, type-only enum imports met casts, cache invalidation ontbreekt, payload size niet gecapped). Round 3+4: 0 CRITICAL / 0 WARNING — convergentie. Deferred-by-design: DNS-rebind TOCTOU (vereist custom dispatcher), `language` parameter als v1 audit-metadata only, `findingsCount` op ContentReviewLog (follow-up bij UI).

**Out-of-scope** (sub-clusters voor follow-up): B-2 file-upload (PDF via unpdf, DOCX via mammoth), C Surface 1 Brand Alignment Tab 3 UI, D Surface 2 Brand Assistant `review_content` chat-tool, E Surface 3 PublishGate uitbreiding (bevindingen-tabel render).

- Task: [tasks/done/content-review-multi-surface.md](../tasks/done/content-review-multi-surface.md)
- ADR: [adr/2026-05-08-fval-output-schema-bevindingen.md](adr/2026-05-08-fval-output-schema-bevindingen.md), [adr/2026-05-08-locale-routing-brand-voice.md](adr/2026-05-08-locale-routing-brand-voice.md), [adr/2026-05-08-brandclaw-agent-architectuur.md](adr/2026-05-08-brandclaw-agent-architectuur.md)
- Spec: [tasks/_drafts/idea-brand-control-program.md](../tasks/_drafts/idea-brand-control-program.md)
- Commit: `4c3cc99` (schema+migration) + `4232625` (engine) + `b3f3c20` (API+ingest v1) + `110e9fa` (smoke) + `8294350` (Prisma 7 import-fix scripts) + `f755ccb` (finalize)

### 240. Competitive-intel discovery cluster — cost-model + 2 vervolg-idea-docs ready-to-build

Pre-build discovery-werk voor de Competitive Intelligence Loop, vervolg op #238 Fase 1 data-laag. Drie validatie-probes uitgevoerd, 4 audit-docs geleverd, 2 vervolg-idea-docs van `pending-tech` naar `ready-to-build` gepromoot via evidence.

**Cost-model Fase 4 brandclaw-monitoring** (`docs/audits/2026-05-08-competitor-monitoring-cost-model.md`): pilot-tier ~$11/maand effectief, tier 1 (50 ws) ~$55/maand, tier 2 (100 ws) ~$110/maand. Worst-case (100 ws × 15 concurrenten × weekly-deep zonder hash-skip) ~$1100/maand. Hard-cap aanbevelingen per plan-tier (free 4 / pro 8 / ent 25 concurrenten), prompt-caching verplicht vóór cron actief, `WorkspaceMonitoringMetrics` model nodig in Fase 4 task. Validatie-blokker §1 voor Fase 2 promotion afgerond.

**Idea-doc `competitor-content-item-discovery`** (`tasks/_drafts/idea-competitor-content-item-discovery.md`): producer voor de lege `CompetitorContentItem`-tabel. Drie probes uitgevoerd: A1 RSS hit-rate 42.9% (verworpen, scope-cut), A2 sitemap-coverage 71.4% (boven 70% target), A3 URL-classifier accuracy 100% met Haiku 4.5 op 25 hand-gelabelde URLs. Definitieve MVP-scope: sitemap-first met robots.txt + 4 paden + recursie sub-sitemaps, RSS als secundaire fallback, AI-classifier voor format+themes, geen HTML-fallback (0% in sample), graceful skip voor competitors zonder bron (~28%). Effort 5-6 dagen.

**Idea-doc `competitor-ai-event-classifier`** (`tasks/_drafts/idea-competitor-ai-event-classifier.md`): pattern-detection bovenop deterministische diff-rules voor 2 strategische events (CATEGORY_REPOSITIONING + TARGET_AUDIENCE_CHANGED). A1 probe: 96.7% accuracy op 30 synthetische prev/next paren met Haiku 4.5 — CATEGORY 100%, TARGET_AUDIENCE 90% (1 borderline dual-event miss), NONE 100% (0 false-positives). Strikte JSON-only prompt verplicht (eerste run gaf 33% parse-errors zonder). MVP-scope strak: 2 events deze task; visual-rebrand/funding/leadership/format-emerging defereren naar vervolg-tasks die andere data-sources binnenhalen. Effort 3-4 dagen.

**Probe-infrastructuur**: 4 nieuwe scripts in `scripts/probes/` (`competitor-rss-hit-rate.ts`, `competitor-content-source-availability.ts`, `competitor-classifier-accuracy.ts`, `competitor-classifier-events-accuracy.ts`) — herbruikbare feature-feasibility-validatie pattern voor toekomstige idea-docs.

Beide vervolg-idea-docs zijn klaar voor technical-planner promotion zodra effort-window beschikbaar is. Validatie-blokker §2 (pilot-priority-check 3 leads) blijft open user-action.

- Task: -  (discovery-cluster, geen single task)
- ADR: [adr/2026-05-08-competitor-snapshot-historie.md](adr/2026-05-08-competitor-snapshot-historie.md) (parent)
- Spec: [tasks/_drafts/idea-competitive-intelligence-loop.md](../tasks/_drafts/idea-competitive-intelligence-loop.md), [tasks/_drafts/idea-competitor-content-item-discovery.md](../tasks/_drafts/idea-competitor-content-item-discovery.md), [tasks/_drafts/idea-competitor-ai-event-classifier.md](../tasks/_drafts/idea-competitor-ai-event-classifier.md)
- Commit: `41a7c90` (cost-model) + `bc6dc6f` (idea content-discovery) + `46d3b0a` (A1 RSS) + `d7f81ba` (A2 sitemap) + `583f384` (A3 classifier) + `6e3c7ed` (idea ai-event) + `7355f44` (A1 classifier-events) + `edd2e4b` (finalize)


### 241. Canvas+Studio audit + per-item tweaks 3-cluster + image-track 3-cluster + locale-fix (12-task pre-launch sprint)

Eén-sessie pre-launch sprint die de meeste open Canvas/Studio-werk afrondt. Discovery + 3 per-item-tweak-clusters (36 content-types met item-specifieke inputvelden + Asset Planner pre-fill + canvas-orchestrator rich-renders) + 3 image-flow-clusters (defaults / content-coupling / briefing-textarea + Claude Haiku suggest-route) + locale-bug-fix die mixed-language output structureel oplost. **254/254 smoke-checks groen** over 11 nieuwe `npm run smoke:*` scripts.

Per-item tweaks (3 builders → 36 types):
- `conversionContentStyleFields()` — 13 types (4 social + 7 ads + 2 email) met hookFormat/payoffPromise/targetObjection/proofPoint + per-hookFormat-value rich-renders in canvas-orchestrator
- `authorityContentFields()` + `narrativeAnchorFields()` — 10 types (6 long-form + 4 PR/case) met THESIS/ANTI-THESIS/PIVOT framing
- `skeletonInputFields(kind)` — 13 types met "USE EXACTLY — do NOT modify" skeleton instructie

Image-flow (3 layers):
- 25 type-defaults + suggestie-strook in `VisualBriefSection`
- `buildSubjectByChip()` injecteert persona+product+CTA+platform in image-prompts (4 routes)
- `briefingText` veld op VisualBrief + textarea + Claude Haiku `/suggest-visual-briefing` route

Locale-fix:
- `buildLocaleInstruction()` helper centraal in `prompt-templates.ts` (alle 4 tiers) + `buildBrandVoiceDirective` versterkt voor élke taal met "translate source material" clause

Bonus closures op latente werk in BCP Phase 1+2 + Cowork-pariteit:
- `heuristics-packages-multilingual` — en-GB/nl-BE/de-DE pakketten + ai-tells/Denglisch toegevoegd, registry compleet
- `voice-baseline-1pager` — derivation + format-helper + UI + judge-embed end-to-end gevalideerd
- `campaign-brief-output-mapper` — Cowork-pariteit Fase A: 10-sectie brief-render met week-thema AI-call + B2/B3/B4 placeholders
- `canvas-inline-edit-overlays` — 13 preview-consumers + ContentSectionsEditor cleanup
- `canvas-studio-audit` + 2 plan-tasks (per-item tweaks + image-briefing) — 3 audit-docs gespawnd

12 tasks afgerond, 13 task-files naar `tasks/done/`.

- Task: [tasks/done/canvas-studio-audit.md](../tasks/done/canvas-studio-audit.md), [tasks/done/canvas-per-item-tweaks-plan.md](../tasks/done/canvas-per-item-tweaks-plan.md), [tasks/done/canvas-image-briefing-plan.md](../tasks/done/canvas-image-briefing-plan.md), [tasks/done/content-locale-enforcement-fix.md](../tasks/done/content-locale-enforcement-fix.md), [tasks/done/canvas-tweaks-conversion-shortform.md](../tasks/done/canvas-tweaks-conversion-shortform.md), [tasks/done/canvas-tweaks-longform-authority.md](../tasks/done/canvas-tweaks-longform-authority.md), [tasks/done/canvas-tweaks-structured-skeleton.md](../tasks/done/canvas-tweaks-structured-skeleton.md), [tasks/done/canvas-image-briefing-defaults.md](../tasks/done/canvas-image-briefing-defaults.md), [tasks/done/canvas-image-content-coupling.md](../tasks/done/canvas-image-content-coupling.md), [tasks/done/canvas-image-briefing-textarea.md](../tasks/done/canvas-image-briefing-textarea.md), [tasks/done/heuristics-packages-multilingual.md](../tasks/done/heuristics-packages-multilingual.md), [tasks/done/voice-baseline-1pager.md](../tasks/done/voice-baseline-1pager.md), [tasks/done/campaign-brief-output-mapper.md](../tasks/done/campaign-brief-output-mapper.md), [tasks/done/canvas-inline-edit-overlays.md](../tasks/done/canvas-inline-edit-overlays.md)
- ADR: -
- Spec: [audits/2026-05-08-canvas-studio-state.md](audits/2026-05-08-canvas-studio-state.md), [audits/2026-05-08-canvas-per-item-tweaks-plan.md](audits/2026-05-08-canvas-per-item-tweaks-plan.md), [audits/2026-05-08-canvas-image-briefing-plan.md](audits/2026-05-08-canvas-image-briefing-plan.md)
- Commit: `a8363c0`

### 242. Campaign brief output-mapper — Fase A Cowork-pariteit (finalize + review-loop)

Render-laag bovenop bestaande `CampaignBlueprint` die wizard-output transformeert naar 10-secties Linfi-stijl markdown-brief: pure data-mapper (`brief-data-mapper.ts`) + markdown-renderer (`brief-renderer.ts`) + on-render Anthropic-call voor sectie 5 week-thema's + GET/POST routes onder `/api/campaigns/[id]/brief/{render,mark-ready}` + `BriefRenderView` modal in ContentLibraryCampaignMode. Secties 7/8/9 tonen expliciete "Not available — requires <follow-up-feature>" placeholders met links naar `campaign-kpi-structure` / `campaign-budget-table` / `campaign-risk-assessment`. Geen schema-wijzigingen.

**Implementation** (productie-commit `855f8a3`): 9 nieuwe files (~1688 regels) + ContentLibraryCampaignMode extension. Workspace-isolation via `resolveWorkspaceId()` + `findFirst({ where: { id, workspaceId } })` op beide routes. PostHog event `campaign_brief_marked_ready` op "Klaar voor klant"-knop. AI-call via `anthropicClient.createChatCompletion` met 6s timeout + Zod-schema voor week-theme response.

**Finalize review-loop** — 4 iteraties tot 0 CRITICAL/0 WARNING:
- Round 1: 0 CRITICAL + 14 WARNING (timeout 10s vs spec 6s, hardcoded sectionsRenderedCount, escape() newline corruption, Zod onbegrensd, mediumEnrichment unbounded, `new Date()` in mapper, etc.)
- Round 2: 0 CRITICAL + 4 WARNING (orderBy non-deterministic, sectionsRenderedCount counts flags niet sections, staleTime UX trap, unknownPriorities severity)
- Round 3: 1 CRITICAL (PG NULLS-sorting bug zelf-geintroduceerd in R2: `ORDER BY DESC` defaultt naar NULLS FIRST → workspace-overrides afgekapt bij 200-cap) + 1 WARNING (`<missing>` sentinel lekt naar user-message)
- Round 4: convergentie 0 CRITICAL / 0 WARNING

**Fixes geleverd**: timeout 10s→6s; `new Date()` injectable via `now?: Date` parameter; escape() strip newlines; Zod `.max(20)` op sectionsRenderedCount; sectionsRenderedCount via unique-section Set; staleTime 60_000 + Regenerate-knop; mediumEnrichment `take: 200` + `orderBy: [{ workspaceId: { sort: 'desc', nulls: 'last' } }, { id: 'asc' }]`; `${ch.priority}` defensive; `unknownPriorities` MissingDataFlag met `(empty)` sentinel.

**Quality gates**: tsc 0 errors, lint 0 errors (0 warnings in nieuwe files). Manual smoke-test (9 stappen UI-werk uit task-file) is user-action vóór live productie-gebruik.

**Out-of-scope** (B-cluster follow-ups): `campaign-kpi-structure` (sectie 7), `campaign-budget-table` (sectie 8), `campaign-risk-assessment` (sectie 9), brief-versioning, PDF/Notion/Word export.

- Task: [tasks/done/campaign-brief-output-mapper.md](../tasks/done/campaign-brief-output-mapper.md)
- ADR: -
- Spec: [tasks/_drafts/idea-campaign-brief-cowork-parity.md](../tasks/_drafts/idea-campaign-brief-cowork-parity.md) + [tasks/_drafts/idea-campaign-brief-cowork-parity-validation.md](../tasks/_drafts/idea-campaign-brief-cowork-parity-validation.md)
- Commit: `855f8a3` (initial implementation, parallel session) + `4b0cffe` (finalize)

### 243. Δ-1 Surface C — Brand Alignment "Content Review" tab UI

Eerste pilot-zichtbare review-surface bovenop bestaande Δ-1 API. Derde tab "Content Review" naast Alignment + Audit op `BrandAlignmentPage`. Paste-textarea (50-50000 chars getrimd) of URL-input + submit triggert POST `/api/alignment/review-external`, waarna nieuwe GET `/[reviewLogId]` route findings ophaalt voor render. Score-gauge (3-color emerald/amber/red) + threshold-badge + filterable findings-tabel met severity + category pills (counts per group) + before/after blocks voor top-issues.

**Geleverd** (productie-commit `994e772`, ~786 regels): nieuwe GET `/api/alignment/review-external/[reviewLogId]/route.ts` (workspace-isolated, expliciete severity-rank sort post-fetch wegens alfabetisch enum-sort default), `useReviewContent` hook (mutation + query met staleTime Infinity per ADR-2 immutability), `ContentReviewTab` (input UI met paste/url toggle), `ContentReviewResult` (score + filters + findings-table), `useBrandAlignmentStore` AlignmentTab union extend ("alignment" | "audit" | "review"), `BrandAlignmentPage` 3rd tab integratie. Severity-mapping HIGH→CRITICAL/MEDIUM→WARNING/LOW→SUGGESTION hergebruikt bestaande `SeverityBadge`.

**Architectuur-keuzes**: Optie B uit task-Notes (nieuwe GET-route ipv POST-extending — respecteert "POST niet aanraken"); filter-state lokaal in ContentReviewResult (geen Zustand); React text-children only render (geen `dangerouslySetInnerHTML`, XSS-mitigatie); `DEFAULT_COMPOSITE_THRESHOLD` geïmporteerd uit composition-engine ipv hardcoded magic-number.

**Finalize review-loop** — 3 iteraties tot 0 CRITICAL/0 WARNING:
- Round 1: 0 CRITICAL + 6 WARNING (severity-sort alfabetisch, trim min/max inconsistent, thresholdMet alleen op mutation, geen aria-pressed/role=alert, long-text overflow)
- Round 2: 0 CRITICAL + 3 WARNING (magic-number drift, incomplete tab-ARIA, char-counter untrimmed)
- Round 3: 0 CRITICAL + 0 WARNING (één future-proofing concern over latent threshold-divergence — defer als design-coupling, geen actuele bug)

**Quality gates**: tsc 0 errors, lint 0 errors (0 warnings in nieuwe files; 969 totaal pre-existing).

**Out-of-scope** (Δ-1 v2 follow-ups): file-upload UI (B-2 PDF/DOCX), tone-suggestions inline-edit, Surface D (Brand Assistant chat-tool), Surface E (PublishGate findings-block), history-list earlier reviews, auto-export PDF/CSV.

- Task: [tasks/done/content-review-tab-3-ui.md](../tasks/done/content-review-tab-3-ui.md)
- ADR: [adr/2026-05-08-fval-output-schema-bevindingen.md](adr/2026-05-08-fval-output-schema-bevindingen.md), [adr/2026-05-08-locale-routing-brand-voice.md](adr/2026-05-08-locale-routing-brand-voice.md)
- Spec: [tasks/_drafts/idea-brand-control-program.md](../tasks/_drafts/idea-brand-control-program.md)
- Commit: `994e772` (initial implementation) + `cf030f1` (finalize)

### 244. Δ-1 Surface D — Brand Assistant `review_content` chat-tool (finalize)

Δ-1 Surface D maakt F-VAL fidelity-review beschikbaar als chat-native tool in de Brand Assistant. User plakt content of URL in chat → tool draait F-VAL → `ReviewFindingsCard` rendert inline met composite-score, threshold-status en top-3 findings. Initial build was commit `534d60c`; finalize-cyclus voegt 5 review-rondes hardening toe.

**Geleverd** (initial `534d60c`, ~485 regels): nieuwe `review_content` analyze-tool in `analyze-tools.ts` (Zod discriminated-union paste/url, hergebruikt `runFidelityForExternalContent` engine + `ingestPaste`/`ingestUrl` met SSRF-mitigatie), `ReviewFindingsCard` met error-variant en `role="status"`, ChatArea `clientAction === 'review_findings_card'` routing, system-prompt anti-over-trigger contract, server-side smoke-test met 4 scenarios.

**Finalize review-loop** — 5 iteraties (skill hard-limit) tot 0 CRITICAL en alleen design-trade-off WARNINGs over:
- Round 1: 1 CRITICAL (broken Tab 3 deep-link) + 5 WARNINGs (Zod safeParse defense-in-depth, `take: 50` silent correctness, anti-over-trigger soft spot, top-findings text round-trip naar Anthropic, smoke-test 3 tautologie)
- Round 2: 0 CRITICAL + 3 WARNINGs (smoke-test silent-skip, vacuous-true op empty array, Zod issues join voor LLM-feedback)
- Round 3: 0 CRITICAL + 4 WARNINGs (deterministic test-ordering, andere fixture-string voor isolation-run, take=200 runaway-guard, Zod multi-issue join)
- Round 4: 0 CRITICAL + 1 WARNING (`failureReason: 'invalid_input'` semantisch correct voor Zod-fail, type-union uitgebreid)
- Round 5: 0 CRITICAL + 3 design-trade-off WARNINGs (alle expliciet als acceptable geframed door reviewers)

**Architectuur-keuzes**: defense-in-depth `safeParse` op tool-execute entry (chat-route trust Anthropic SDK; redundant guard hier voorkomt malformed-input slip), `take: 200` runaway-guard (Prisma's enum-orderBy is alfabetisch HIGH<LOW<MEDIUM, dus client-side severity-sort vereist), `TOP_FINDINGS_TEXT_CAP=280` (gestringified findings round-trippen naar Anthropic in elke vervolg-turn), Tab-3 deep-link verwijderd (URL-param parser is separate task wanneer pilot-feedback dit prioriteert), `failureReason: 'ingest_failed' | 'invalid_input'` discriminated zodat FE differentiated copy kan tonen (placeholder voor toekomst).

**Quality gates**: tsc 0 errors, lint 0 errors in nieuwe files (969 pre-existing warnings).

**Out-of-scope** (gedocumenteerd in task-Notes): URL-param parser voor Tab 3 deep-link, ReviewErrorCard differentiated copy per failureReason, Surface E PublishGate findings-block, severity-visual unification Surface C+D.

- Task: [tasks/done/content-review-chat-tool.md](../tasks/done/content-review-chat-tool.md)
- ADR: [adr/2026-05-08-fval-output-schema-bevindingen.md](adr/2026-05-08-fval-output-schema-bevindingen.md), [adr/2026-05-08-locale-routing-brand-voice.md](adr/2026-05-08-locale-routing-brand-voice.md)
- Spec: [tasks/_drafts/idea-content-review-chat-tool.md](../tasks/_drafts/idea-content-review-chat-tool.md)
- Commit: `534d60c` (initial implementation) + `f2f0455` (5-round hardening)

### 245. Δ-1 Surface E — PublishGate findings-block voor interne content (finalize)

Sluit de Δ-1 trifecta: Surface C (Tab 3 paste/url review-UI) en Surface D (Brand Assistant chat-tool) waren live op `main`; Surface E haakt structured findings nu ook in PublishGate voor INTERN gegenereerde canvas-content. Bij sub-threshold score toont PublishGate een uitvouwbaar amber-block met top-3 HIGH-severity findings (severity-pill + category + description + suggestion), zodat user concrete issues ziet vóór de override-modal-keuze. Schema staat al voor: `BrandReviewFinding.fidelityScoreId` is een nullable FK in XOR-relatie met `contentReviewLogId` (ADR-1) — geen migratie nodig.

**Geleverd** (initial `0b27fe0`, ~850 regels): shared util `src/lib/brand-fidelity/violation-to-finding.ts` (extract `mapViolationToFindingInput` + `mapSeverity` + `inferCategory` uit external runner; beide runners delen nu één mapper), `persistContentFidelityScoreIfPossible` extend met `BrandReviewFinding` nested-create via `fidelityScoreId` (atomic 1-roundtrip), nieuwe GET `/api/alignment/internal-findings/[fidelityScoreId]/route.ts` mirror van Surface C, `useInternalFindings` TanStack hook met `staleTime: Infinity` (scores immutable per ADR-2), `FindingsBlock` sub-component in `PublishGate.tsx` met expand/collapse + `key={fidelityScoreId}` voor state-reset bij regenerate. Smoke-test 16/16 + manual UX-smoke uitgevoerd op LINFI deliverable via dev-helper inject-fixture script.

**Finalize review-loop** — 5 iteraties (skill hard-limit) tot 0 CRITICAL/0 WARNING:
- Round 1: 2 CRITICAL (`findingsCount` aggregate ontbrak op create — ADR-1 join-free counter; `inject-fixture` geen NODE_ENV/localhost guard) + 1 WARNING (smoke-test 4 deels tautologisch zoals Surface D round 2)
- Round 2: 0 CRITICAL + 2 WARNINGs (`as string` cast violates "no any types" — revert naar runtime throw als defense-in-depth tegen `refetch()`; smoke-test 4 hard-fail breekt single-workspace seeds — back to soft-skip met luide warn)
- Round 3-4: 1 WARNING ronde 3 (`findingsCount` ook missend op fixture/smoke synthetic creates), 1 WARNING ronde 4 (`SMOKE_FINDINGS_COUNT` magic number — derive uit `smokeFindings.length`)
- Round 5: 0 CRITICAL + 0 WARNING — beide reviewers approve, MINORs als "bewuste keuze" gemarkeerd

**Architectuur-keuzes**: nested-create voor atomic findings+score persist (1 round-trip), aggregate-counter pattern (`findingsCount: findings.length`) gerold mirror op runner én fixture-injector én smoke-test, drift-detection assert in smoke (`findingsCount === persisted.length`), typed `Record<BrandReviewSeverity, …>` voor compile-time exhaustiveness, `key={fidelityScoreId}` voor state-reset bij regenerate, runtime throw in `useInternalFindings.queryFn` als defense-in-depth tegen `refetch()` (die `enabled: false` bypassed).

**Quality gates**: tsc 0 errors, lint 0 errors in nieuwe files (969 pre-existing warnings totaal), smoke `internal-findings.ts` 16/16 pass.

**Dev-helper toegevoegd**: `scripts/inject-publishgate-findings-fixture.ts` — synthetic ContentVersion + sub-threshold ContentFidelityScore + 5 findings injecteren op een gekozen deliverable, met NODE_ENV-prod refusal + localhost-DATABASE_URL guard + `--cleanup` flag. Voor toekomstige UX-smoke van Surface E zonder live F-VAL run te hoeven triggeren.

**Out-of-scope** (gedocumenteerd in task-Notes): `getContentReadiness` filtert niet op `judgeIdentifier` (bestaand readiness-query, niet door deze task geïntroduceerd), STRICT re-score path duplicate-rij-accumulation (bestaand pattern), `mapViolationToFindingInput` populeert `suggestion` nooit (productie heuristics emit geen replacement-text — render is conditioneel), `inferCategory` BrandRule→TERMINOLOGY route (ADR-1 ontwerpkeuze), `SEVERITY_RANK` triplicaat Surface C/D/E (extract naar shared util — separate cleanup-task), `ReviewFinding` type cross-import (extract naar `types/findings.ts` — separate cleanup-task), URL-param parser voor `?fidelityScoreId=` deep-link in BrandAlignmentPage, stale-findings race van 10s `useContentReadiness` staleTime + fire-and-forget persist (acceptable MVP window).

- Task: [tasks/done/publishgate-findings-block.md](../tasks/done/publishgate-findings-block.md)
- ADR: [adr/2026-05-08-fval-output-schema-bevindingen.md](adr/2026-05-08-fval-output-schema-bevindingen.md)
- Spec: -
- Commit: `0b27fe0` (initial implementation) + `9a86e6f` (5-round hardening)

### 246. Δ-1 cleanup-pack — shared SEVERITY_RANK + ReviewFinding types + SPA deep-link + InputBar tool_result fix

Drie cleanup-items uit de Surface D + E finalize-loops als 'separate task' geflagged zijn nu samen geadresseerd, plus een latente productie-bug die tijdens visual smoke aan het licht kwam:

**1. SEVERITY_RANK shared util**: nieuwe `src/lib/brand-fidelity/severity-rank.ts` met `Record<ReviewSeverity, number>` (compile-time exhaustiveness) + `severityRank()` helper met `?? 99` fallback. Drie call-sites (Surface C external GET route, Surface D analyze-tool, Surface E internal GET route) importeren ervan i.p.v. eigen inline-declaratie. Drift-risico bij toekomstige severity-uitbreiding (bijv. `CRITICAL`) weg.

**2. ReviewFinding types extract**: nieuwe `src/types/brand-review-finding.ts` met `ReviewSeverity` / `ReviewCategory` / `ReviewFinding` string-union types. `useReviewContent` (Surface C) en `useInternalFindings` (Surface E) importeren beide uit deze neutrale plek; de hooks-cross-import van Surface E naar Surface C is weg. `useReviewContent` re-exporteert types voor backwards-compat met bestaande consumers.

**3. SPA deep-link voor "View all findings"**: hybrid-SPA architectuur ondersteunt geen URL-params voor pagina-routing (browser-URL blijft constant; `<a href>` zou full reload veroorzaken), dus implementatie via Zustand-store preload-state:
- `useBrandAlignmentStore` extended met `preloadReviewLogId` / `preloadFidelityScoreId` + `openReviewByLogId(id)` / `openReviewByFidelityScoreId(id)` / `clearPreload()` actions (XOR via action-pattern: actie clears tegen-overgestelde field)
- `ContentReviewTab` leest preload-state op mount; bij aanwezigheid skip het paste/url input-form en render direct `ContentReviewResult` met pre-loaded findings via de juiste hook (`useReviewFindings` voor extern, `useInternalFindings` voor intern); synthetisch `ReviewSubmitResponse`-shape voor uniforme render. `clearPreload()` op submit-fire en op handleReset zodat fresh review altijd voorrang krijgt
- Surface D `ReviewFindingsCard`: button met `openReviewByLogId` + `setActiveSection('brand-alignment')` + `closeClaw()` (chat-overlay sluit, content-review tab opent)
- Surface E PublishGate `FindingsBlock`: button met `openReviewByFidelityScoreId` + `setActiveSection` (Canvas wordt verlaten, acceptable trade-off voor deep-link UX)

**4. Latente productie-bug ontdekt en gefixt** (`InputBar.tsx`): `tool_result` SSE event was sinds initial Surface D commit (534d60c) alleen een activity-status setter — `message.toolResults` werd NOOIT gepopuleerd. ChatArea iterates `message.toolResults?.map(...)` om de juiste card te dispatchen, maar door lege array viel het altijd door naar de generic "Data retrieved" badge — of niets. De assistent-text-output gaf zoveel detail (score, threshold, top-3 issues in markdown) dat het op een card leek; pas bij deze cleanup-pack visual smoke (waar de "View all findings" button moest verschijnen) viel op dat de card zelf nooit rendered. Fix: accumuleer SSE `tool_result` events in lokale array tijdens streaming, plak op assistant message bij `done` event. Generic `analyze` tools renderen nu de Wrench-badge (gewenst); `review_content` dispatcht naar ReviewFindingsCard zoals altijd bedoeld.

**Aanvullende cleanups uit finalize-loop**: `durationMs` optional gemaakt in `ReviewSubmitResponse` (preload-internal heeft geen duration; ScorePanel rendert "run took Xs" conditioneel pas vanaf > 0); useEffect-cleanup op ContentReviewTab unmount **verwijderd** (BrandAlignmentPage conditioneel rendert via `{activeTab === 'review' && ...}`, dus tab-switch zou preload wissen — handleSubmit + handleReset volstaan).

**Quality gates**: tsc 0 errors, lint 0 errors in nieuwe/aangeraakte files, smoke `internal-findings.ts` 16/16 pass, manual UX-smoke (Surface D card "View all" + Surface E "+ N more" deep-links beide bevestigd live).

- Task: [tasks/done/delta-1-cleanup-pack.md](../tasks/done/delta-1-cleanup-pack.md)
- ADR: -
- Spec: -
- Commit: `1008918` (initial cleanup-pack) + `4470717` (InputBar tool_result fix) + `bc3b69b` (3-round hardening)

### 247. Brand Alignment Insights tab — pilot-feedback dashboard voor Δ-1 surfaces

Brengt een 4e tab "Insights" naast Alignment / Audit / Content Review met 30d aggregaten over de Δ-1 trifecta — extern (Surface C+D paste/url, gecombineerd) plus intern (Surface E canvas-content). User-visible per workspace, geen org-overview. Geeft data om over 30 dagen pivot-vs-wasted-effort verdict per surface te kunnen geven.

**Geleverd** (initial `c0f274e`, ~790 regels):
- Nieuwe GET `/api/brand-alignment/insights/route.ts` — workspace-scoped 30d aggregate. Returnt KPI-totalen (reviews, findings, threshold-pass-rate, blocked-published-rate proxy via `Deliverable.publishedAt + thresholdMet=false`), top-5 finding-categories via Prisma `groupBy` met stabiele tie-break `[count desc, category asc]`, 7d day-bucket pass-rate trend voor sparkline, 5 meest recente reviews (extern + intern gemixt op scoredAt). `truncated` response-flag wanneer 5000+ records de runaway-cap raken.
- `useAlignmentInsights` TanStack hook met `staleTime: 60s`, `gcTime: 5min` expliciet, queryKey gepostfixed met workspaceId voor cross-workspace cache-isolation.
- `InsightsTab` component met KPI-tiles pattern (cf. `PromptUsageDashboard`), `SparklineChart` 7d trend (hergebruik van business-strategy SparklineChart, nu met `useId()` voor unique gradient-id ipv hardcoded `sparkline-fill`), top-5 categories ranking, recent-reviews lijst met source-pill (Paste / URL / Canvas) + score-color + relative-time. Empty-state placeholder bij 0 reviews; truncated-banner bij >=5000 records met expliciete sampling-methode-uitleg; "Workspace context niet beschikbaar" fallback bij failed useWorkspace.
- `useBrandAlignmentStore.AlignmentTab` union extend met `'insights'`; `BrandAlignmentPage` 4e tab-button + conditional render.

**Cross-task scope-creep**: SparklineChart hardcoded gradient-id collision was een latente bug die door de nieuwe InsightsTab consumer relevanter werd — `useId()` fix in dezelfde PR (geen API-change, backwards-compatible voor bestaande StrategyProgress consumer).

**Finalize review-loop** — 5 iteraties (skill hard-limit + 1 met user-akkoord) tot 0 CRITICAL en alleen acceptabele truncation-edge-case MINORs over:
- Round 1: 3 CRITICAL (Tailwind class overlap, workspace-isolation defense gap, SparklineChart gradient-id) + 6 WARNINGs (DEFAULT_COMPOSITE_THRESHOLD import, take cap + N+1 fold, override-rate label rename, role=alert, _count consistent, queryKey workspaceId)
- Round 2: 0 CRITICAL + 3 WARNINGs (workspace error fallback, gcTime expliciet, truncated flag)
- Round 3: 0 CRITICAL + 4 WARNINGs (`_count.findings` ipv relation-load tegen memory-spike, stable tie-break, isPending ipv isLoading, mixed-threshold semantics comment)
- Round 4: 0 CRITICAL + 2 WARNINGs (banner-text trend distortion, no-workspace copy)
- Round 5 (hard-limit + 1): 0 CRITICAL + 2 WARNINGs gefixt + corner-case truncation behaviour gedocumenteerd

**Quality gates**: tsc 0 errors, lint 0 errors in nieuwe files, manual UX-smoke pass op LINFI workspace (10 reviews, 16 findings, 20% pass-rate, 0% blocked-published — actionable productie-data).

**Out-of-scope** (gedocumenteerd in task-Notes): formatRelative NL drift met dashboard formatLastScan EN, empty-state CTA inert, trend-arrow ignores reviewCount, color-token drift, A11y debt (KPI-tiles geen role/aria-label, sparkline no role=img), tab-state geen URL-sync, denormalized findingsCount legacy-undercount, blockedPublishedRate proxy-overcounting, micro-race already covered.

- Task: [tasks/done/brand-alignment-insights-tab.md](../tasks/done/brand-alignment-insights-tab.md)
- ADR: -
- Spec: -
- Commit: `c0f274e` (initial implementation) + `64f7f95` (5-round hardening)

### 248. F-VAL rules-pijler audit — mapper categories + NL-NL packs + stem-variants

Drie incrementele wijzigingen op de F-VAL rules-pijler na visual-smoke ontdekking dat fluff-NL-tekst met "passie/kwaliteit/innovatie" 0 findings opleverde voor LINFI. Insights tab toonde 16/16 findings allemaal in TERMINOLOGY-categorie (mapper-quirk). Resultaat: rijkere category-spread + meer signal-coverage voor alle drie Δ-1 surfaces.

**Geleverd** (initial `accd88c`, ~415 regels):

- `inferCategory` in `violation-to-finding.ts` extended met `ruleType?: BrandRuleType` parameter. BrandRule violations routen nu via `v.ruleType`: REQUIRED_PHRASE → `BUSINESS`, STYLE_LIMIT → `STYLE`, PILLAR_REFERENCE → `BUSINESS`, FORBIDDEN_WORD blijft `TERMINOLOGY` (geen eenduidig pad zonder schema-extension). Insights tab krijgt category-spread i.p.v. 100% TERMINOLOGY voor alle BrandRule findings.

- NL-NL heuristic-pack uitbreiding: `vague-quality.ts` krijgt "passie" (always-flag) en "kwaliteit" (context-flag, requires-substantiation). `corporate-fluff.ts` krijgt "innovatie" en "innovaties" als stem-varianten van "innovatief". Vangt veelvoorkomende NL-cliché-buzzwords die voorheen door beide pillars heen vielen.

- `expandStemVariants(word)` helper in `brand-rule-sync.ts` — pure-functie, deterministische NL suffix-rules zonder linguistic library. `wordsWeAvoid` entries krijgen automatisch flexed/plural varianten als FORBIDDEN_WORD BrandRules. Beide sync-functies (`syncWordsAvoidToRules` legacy + `syncVoiceguideToRules`) gebruiken het. AntiPatterns blijven 1-op-1 (phrases). LINFI verified: 14 input wordsWeAvoid → 44 BrandRules; "innovatief" matcht nu ook "innovatie" in tekst → 1 FORBIDDEN_WORD violation (was 0).

**Suffix-rules (precision boven recall — false-positives in user-facing patterns/messages zijn schadelijker dan gemiste plurals)**:
- `-ief` (innovatief → innovatie/innovatieve/innovaties)
- `-eel` (passioneel → passionele) — geen plural (-en) want non-NL-noun risk
- `-iek` (uniek → unieke) — geen `+ en` want "unieken" geen NL-noun
- `-isch` (automatisch → automatische) — geen `-isme` want "logisme/basisme" non-words
- Default: `endsWith('e')` → `+ s` (luxe → luxes); else → `+ en` (kwaliteit → kwaliteiten)

**Gemist (deliberate trade-off, gedocumenteerd in helper-JSDoc)**: `materieel → materialen`, `techniek → technieken`, `fabriek → fabrieken`, `automatisch → automatisme`. User moet zulke plural-vormen handmatig in wordsWeAvoid invoeren als die actively unwanted zijn.

**Smoke-test** `heuristic-stem-variants.ts` 25/25 pass: 5 suffix-rules + edge cases (multi-word skip, korte input, empty=`[]`, whitespace, dedup).

**Finalize review-loop** — 4 iteraties tot Reviewer A clean (Reviewer B's WARNINGs blijven doc-clarity-claims op already-verified behavior):
- Round 1: 2 CRITICAL (`-isch + 'isme'` non-words; default-pad "luxee/kwaliteite") + 5 WARNINGs
- Round 2: 0 CRITICAL + 3 trade-off-WARNINGs gefixt naar conservatief
- Round 3: 5 WARNINGs over gemiste legitime plurals → resolved via uitgebreide JSDoc trade-off-block
- Round 4: Reviewer A clean ✓

**Quality gates**: tsc 0 errors, lint 0 errors, smoke 25/25 pass.

**LINFI productie-side-effect bevestigd**: na resync 14 → 44 wordsWeAvoid BrandRules. Heuristics blijven echter 0 violations: LINFI's `Workspace.contentLanguage='en'` → EN-GB pack i.p.v. NL-NL. **Separate user-action vereist** in workspace settings om naar 'nl' te switchen voor NL-NL heuristic-pack activatie.

**Out-of-scope** (gedocumenteerd in task-Notes): locale-guard op helper (NL-only morfologie), dubbele findings risk heuristic+BrandRule, BrandRule.category schema-field voor eenduidige FORBIDDEN_WORD-categorisatie, multi-locale heuristic-pack expansion (en-GB / nl-BE / de-DE), lemmatizer-library voor preciezere morfologie, deploy-time backfill-cron voor bestaande workspaces.

- Task: [tasks/done/fval-rules-pillar-audit.md](../tasks/done/fval-rules-pillar-audit.md)
- ADR: -
- Spec: -
- Commit: `accd88c` (initial implementation) + `82eca9c` (4-round hardening)

### 251. Brand Assistant page-wiring — Step1Context + PersonaDetail + BrandAssetDetail

Sluit BCP Phase 2 Phase 0.2.A vervolg-cluster af. Foundation (`useFormFillStore` + `fill_form_fields` tool + system-prompt surfacing + MutationConfirmCard handler) was 2026-05-08 gemerged maar geen enkele page registreerde nog velden — AI zag overal `formFillFields = []`. Resultaat na deze entry: Brand Assistant kan op de 3 hoogvolume-pages "vul X met Y" begrijpen, confirm-card tonen, en het veld via de bestaande mutation-paden persisteren.

**Geleverd** (`f4ee9ac` scaffold pad reused; eigen commit volgt):

- `src/features/campaigns/components/canvas/accordion/Step1Context.tsx` (modify) — `useEffect` registreert `objective` / `keyMessage` / `toneDirection` / `callToAction` + content-type-specifieke velden bij `useFormFillStore`. Setters routen direct via bestaande `useCanvasStore.setBriefField` + `setContentTypeInput` (geen refactor). `formatCurrentValue` helper voor string/array/boolean preview.
- `src/features/personas/components/detail/PersonaDetailPage.tsx` (modify) — page-level adapter expose 23 velden (13 strings + 10 string-arrays). Batched-mutate via `queueMicrotask` + ref accumulator: N synchrone setter-calls in `fill_form_fields.applyFill` loop worden in 1 `updatePersona.mutate(...)` gemerged ipv N parallelle PATCH-calls. `null → ''` coercion voor non-nullable string-fields (PATCH-schema accepteert null niet); null behouden voor nullable `quote` / `bio` zodat "clear" semantisch correct landt. Locked = geen velden exposeren.
- `src/features/brand-asset-detail/components/BrandAssetDetailPage.tsx` (modify) — polymorphic frameworkData adapter exposeert top-level keys ongeacht frameworkType (BRAND_ESSENCE / PURPOSE_WHEEL / etc.). Server-side shallow merge in `/api/brand-assets/[id]/framework` PATCH route betekent dat we alleen gewijzigde keys hoeven te sturen — elimineert stale-baseData race wanneer meerdere fills snel achter elkaar gebeuren. `humanizeKey` voor labels, `formatFrameworkPreview` voor previews (string/number/array → tekst, object → `<N fields>` hint).

**Trade-offs gedocumenteerd**:
- Geen bracket-notatie support in v1 — AI moet hele nested objecten/arrays meesturen wanneer het sub-keys wil wijzigen. Server merget shallow op top-level, dus partiële nested objecten verliezen niet-genoemde sub-keys. Acceptabel omdat de AI de structuur sowieso moet kennen voor consistente updates.
- Step1Context heeft geen lock-state check — content briefs zijn niet locked in huidige model. Persona/Asset wel.
- Browser-smoke (5 stappen Step1/Persona/Asset/Δ-1 compat/edge-case) uitgesteld naar pre-launch sprint #4 batch — consistent met de pre-launch-smoke-batch deferral (zie eerdere entry). Code passes tsc + lint clean, 2 review-rondes 0 CRITICAL.

**Δ-1 compat (uit done task acceptance-criteria)**:
- `pageContext.sectionPath` voor Canvas Step 4 — sinds Surface D shipped impliciet voldaan
- `inspect_current_entity` op Canvas Step 4 — Surface D gebruikt eigen `review_content` tool, niet inspect; criterium achterhaald
- Read-tool chat-card pattern — `BrandReviewResultCard` werkt via Surface D-pattern; geen nieuwe verificatie nodig

**Finalize review-loop** — 2 iteraties (clean op round 2):
- Round 1: 1 CRITICAL gefixt (BrandAssetDetailPage stale-baseData race; server merge betekent geen full-frameworkData spread nodig), 1 WARNING gefixt (PersonaDetailPage string null-coercion via `nullable` flag per veld)
- Round 2: Reviewer A clean, Reviewer B residual WARNINGs zijn "Pattern is safe, no action" — geen actionable changes

**Files modified**:
- `src/features/campaigns/components/canvas/accordion/Step1Context.tsx`
- `src/features/personas/components/detail/PersonaDetailPage.tsx`
- `src/features/brand-asset-detail/components/BrandAssetDetailPage.tsx`

**Documenten**:
- Task: [tasks/done/claw-page-awareness-vervolg.md](tasks/done/claw-page-awareness-vervolg.md)
- Parent task: [tasks/done/claw-page-awareness.md](tasks/done/claw-page-awareness.md) — Phase 0.2.A foundation

- Task: [tasks/done/claw-page-awareness-vervolg.md](tasks/done/claw-page-awareness-vervolg.md)
- ADR: -
- Spec: -
- Commit: `9240030`

### 250. BrandVoiceguide.contentLocale picker UI (Voice DNA tab)

Follow-up uit #249 deferred-list. Gaf user geen UI om `BrandVoiceguide.contentLocale` te overriden — voorheen alleen DB-script via backfill. Pilot start binnenkort en multi-locale brands (nl-BE, multi-merk agencies) hadden geen pad om handmatig te corrigeren wanneer auto-detect verkeerd zit of bewust afwijkende keuze nodig is.

**Geleverd** (scaffold `f4ee9ac` + finalize-iteratie):

- `src/app/api/i18n/detect-suggested-locale/route.ts` (nieuw) — GET endpoint wrapper rond `detectBrandLanguage(workspaceId)` PLUS `resolveLocaleForBrandWithSource(workspaceId)`. Twee onafhankelijke try/catch-blokken zodat een failure in detectie de active-locale niet onbruikbaar maakt (en omgekeerd). Auth-resolutie heeft eigen catch.
- `src/hooks/useSuggestedLocale.ts` (nieuw) — TanStack hook met `staleTime: Infinity` + workspaceId-scoped queryKey; types via canonical `Locale` + `LocaleSource` re-export uit locale-resolver.
- `src/lib/brand-fidelity/heuristics/locale-resolver.ts` — toegevoegd `resolveLocaleForBrandWithSource` (parallel queries, voor UI-indicator) naast bestaande `resolveLocaleForBrand` (hot-path, sequentieel met short-circuit). Exports `SUPPORTED_LOCALES`, `DEFAULT_LOCALE_BY_LANG`, `LocaleSource` als single source of truth.
- `src/app/api/brandvoiceguide/route.ts` — updateSchema accepteert `contentLocale: z.enum(SUPPORTED_LOCALES).nullable().optional()`. Import direct uit locale-resolver (geen lokale duplicatie).
- `src/features/brandvoice/components/sections/VoiceDnaSection.tsx` — Content-locale card met: "Currently active" pill (laat zien wat F-VAL gebruikt + source-label: voiceguide override / workspace default / fallback), aparte unsaved-cue, BCP-47 dropdown (4 locales), informatieve auto-detected regel met confidence-badge. `aria-label` op select.
- `src/features/brandvoice/hooks/index.ts` — `useUpdateVoiceguide` invalidates `['suggested-locale', workspaceId]` zodat de "Currently active" pill refresht na save.
- `scripts/smoke-tests/locale-picker-api.ts` (nieuw) — DB-laag + HTTP-laag tests met try/finally cleanup (restoreert LINFI's originele contentLocale ook bij mid-run crash).

**UX-iteratie** (gedreven door pilot-user testronde):
- Initiele "Use suggested" knop verwarrend (gebruiker dacht het was een bevestig-knop voor dropdown-keuze) → knop verwijderd, auto-detected blijft alleen als info-regel
- Geen indicatie welke locale F-VAL daadwerkelijk gebruikt → "Currently active" pill toegevoegd (los van unsaved dropdown-state)
- Save-actie refreshte niet de active-locale → cache-invalidation toegevoegd aan voiceguide-mutation

**Finalize review-loop** — 5 iteraties (hard limit; round 5 reviewer A clean, B 2 defensive WARNINGs over documented v1 trade-offs):
- Round 1: 2 CRITICAL gefixt (`DEFAULT_LOCALE_BY_LANG` + `SUPPORTED_LOCALE_VALUES` duplicaten — imports uit canonical resolver)
- Round 2: catch-block fabriceerde gefakede en-GB activeLocale (corrupted UI-truth) → returnt null bij resolver-fail; `<select>` aria-label toegevoegd; `key={contentLocale}` weggehaald (niet langer nodig na verwijderen "Use suggested"); non-null `!` weg
- Round 3: Zod-enum readonly-tuple fix; smoke-test in try/finally; workspaceId in invalidation
- Round 4: hot-path `resolveLocaleForBrand` terug naar sequential short-circuit (perf-regressie vermeden door behoud van parallel-variant alleen in WithSource); invalidation skipt expliciet als workspaceId falsy
- Round 5: clean op A, B's residuals zijn documented v1 limitaties (staleTime+detection-refresh)

**Whitelist consistency** nu via één bron: `SUPPORTED_LOCALES` in locale-resolver wordt gebruikt door Zod-enum (route), TS-type (`Locale`), en LOCALE_OPTIONS-codes (UI). `LocaleSource` type idem voor activeSource.

**Documenten**:
- Task `tasks/done/brandvoiceguide-locale-picker.md`
- ADR (referentie): `docs/adr/2026-05-08-locale-routing-brand-voice.md`, `docs/adr/2026-05-10-brand-language-auto-detect.md`

- Task: [tasks/done/brandvoiceguide-locale-picker.md](tasks/done/brandvoiceguide-locale-picker.md)
- ADR: -
- Spec: -
- Commits: scaffold `f4ee9ac`, finalize `0538a8d`

### 249. Brand-language auto-detect + backfill + runtime mismatch-guard

F-VAL rules-audit van vandaag onthulde dat 5 van 15 workspaces (incl. LINFI) verkeerd geconfigureerde `Workspace.contentLanguage` hadden — content was duidelijk NL maar veld stond op default 'en'. Resultaat: F-VAL Pijler 3 gebruikte EN-GB heuristic-pack ipv NL-NL, canvas-orchestrator injecteerde "Write in English" in elke generate-prompt. Auto-detect mechanism corrigeert alle workspaces tegelijk plus runtime-guard maakt toekomstige mismatches zichtbaar zonder user-flow te onderbreken.

**Geleverd** (initial `e5d2818`, ~950 regels):

- `franc-min` v6.2.0 dependency (42KB pure-JS, geen native bindings, ISO 639-3 trigram-detectie, 150+ talen)
- `src/lib/i18n/detect-brand-language.ts` (nieuw) — `detectBrandLanguage(workspaceId)` consolideert voiceguide.voiceDescription + writingSamples + brandAssets via flatten-helper (depth-cap 10 + WeakSet voor circular safety), runt franc, mapt naar 3 ondersteunde locales (nl-NL / en-GB / de-DE — FR detecteert maar mapt naar null tot heuristic-pack bestaat). Confidence-thresholds: `high` ≥2 sources én ≥300 chars; `medium` ≥1 source én ≥150 chars; `low` anders.
- `logBrandLanguageMismatchIfAny()` fire-and-forget runtime-guard met optimistic cache-set vóór await (concurrent-call dedup), MAX_CACHE_SIZE=500 + drop-oldest eviction, cache-clear in catch-branch (geen 5-min stilte na transient DB-error)
- `scripts/backfill-brand-language.ts` (nieuw) — workspace-iteratie audit/apply met productie-guard, `--apply` flag, `--workspace-slug` filter, idempotent. Workspaces zonder voiceguide-row krijgen alleen workspace.contentLanguage correctie (voiceguide.contentLocale blijft NULL). Action-enum: `update-ws` / `update-locale` / `update-both` / `skip-match` / `skip-no-signal` / `skip-low-conf` / `skip-medium-conf`.
- `src/lib/ai/canvas-orchestrator.ts` — fire-and-forget mismatch-guard call vóór BVD-build, try/catch defense-in-depth
- `scripts/smoke-tests/brand-language-detect.ts` — 11 fixture-tests (NL/EN/DE/FR/mixed/short/empty/code-blob)
- `docs/adr/2026-05-10-brand-language-auto-detect.md` — precedence-policy (voiceguide.contentLocale → workspace.contentLanguage → detection → en-GB), confidence-thresholds, override-policy (auto-detect is NIET runtime-override; backfill-tool + warn-log only), franc-min library-rationale vs alternatives

**Productie-data effect** na `--apply` op alle workspaces:
- 4 NL-correcties: linfi, better-brands, wra-juristen, goed-bouw (en → nl)
- 1 inverse: napking (nl → en, content was EN)
- 9 voiceguide.contentLocale fills waar voiceguide-row bestond
- 2 skipped voor no-signal: wassink-groep, techcorp-brand (geen tekstuele content)
- Verified idempotent: 2e run is no-op

**Finalize review-loop** — 4 iteraties (Reviewer A clean op iter 3; iter-4 WARNINGs zijn cache-race-nuances van bewust gedocumenteerd ontwerp):
- Round 1: 3 CRITICAL gefixt (FR-mapping drop, `!= null` undefined fix, francScore drop), 4 WARNINGs
- Round 2: action-enum `skip-medium-conf` toegevoegd, orderBy take:20 brandAssets, depth-cap + WeakSet, MAX_CACHE_SIZE 500, try/catch orchestrator
- Round 3: cache-clear in catch-branch, smoke FR-test comment expliciet, summary toont medium-conf count
- Round 4: 0 CRITICAL, 3 WARNINGs allemaal acceptable trade-offs rondom optimistic-cache-set design

**Quality gates**: tsc 0 errors, lint 0 errors, smoke 11/11 pass, backfill verified idempotent.

**Out-of-scope** (gedocumenteerd in task-Notes): helper-level unit tests (smoke draait franc-lib direct, helper integration is via backfill --apply live), franc-min margin gating, telemetry hook bij detection-failure, ES/PT/IT detection (geen heuristic-packs; UI accepteert wel manual-set), LRU eviction ipv insertion-order, BrandVoiceguide.contentLocale picker UI (separate task), auto-detect bij workspace-creation (chicken-and-egg met onboarding), multi-locale workspace support (post-launch).

- Task: [tasks/done/brand-language-auto-detect.md](../tasks/done/brand-language-auto-detect.md)
- ADR: [adr/2026-05-10-brand-language-auto-detect.md](adr/2026-05-10-brand-language-auto-detect.md)
- Spec: -
- Commit: `e5d2818` (initial implementation) + `021f262` (4-round hardening)### 404. Research-stack-bundel gepland — 4 uitvoeringsklare task-files voor een vervolg-sessie

User-besluit 2026-07-15 na drie convergerende checks (S2/Nova/Exa — welke oppervlakken profiteren nog meer van de verse research-keys?): trend-radar, Marco, GEO-long-form én de nieuwe brand-mention-monitor plannen voor uitvoering door een aparte (Sonnet 5-)sessie. **Geleverd**: overkoepelend plan ([docs/reports/research-stack-plan-2026-07-15.md](reports/research-stack-plan-2026-07-15.md) — volgorde, gedeelde patronen zoals fail-soft-verrijking/fencing/0-credit, werkafspraken per sessie) + vier task-files met geverifieerde re-entry-punten, contracten, smoke-plannen en start-instructies: `research-stack-trend-radar` (Exa+S2 naast Gemini-grounding, patroon #402), `research-stack-marco-web-signals` (curated tool voor extern nieuws per concurrent, eigen-domein-uitsluiting), `research-stack-geo-research-backed` (échte bron-stats in `citeableStats` — versterkt het zwaarst wegende GEO-signaal; A/B-datapunt verplicht, scoring ongemoeid) en `brand-mention-monitor` (10e agent, **Fase-0-gated** op Exa-dekking voor NL-MKB-merken; discovery + Red Team in `tasks/_drafts/idea-brand-mention-monitor.md`). Roadmap: nieuwe subsectie 🔬 + de MCP-besluiten van 2026-07-14 (AI-assistenten · OAuth 2.1 · read+F-VAL) vastgelegd in de geparkeerde MCP-sectie.

### 403. Marketing-site launch-polish — copy-fixes + 4 echte product-screenshots

Taak #9-afhechting (Claude-deel). **Copy-fixes**: de trial-claim op de homepage zei 2× "14 days free" terwijl het product een 28-dagen no-card trial heeft (feitelijke fout, gecorrigeerd); de agents-feature-pagina zei "six specialist agents" — bijgewerkt naar negen mét de nieuwe rollen (weekly reports, SEO/GEO- en ads-watchdogs). **Screenshots**: de "Screenshot goes here"-placeholder vervangen door echte `<img>`-render + vier échte product-screenshots geschoten (`public/marketing/features/`: agents-catalogus met alle 9 persona's, Brand Voice met gevulde voice-DNA, Brandstyle met kalibratie-flow, en Content Canvas met een écht gegenereerde LinkedIn-post op F-VAL 79 incl. score-opbouw). Gemaakt via een herbruikbaar Playwright-script (`scripts/dev/marketing-screenshots.mjs`, lokale dev-server + seed-account, EN-locale + BB-workspace via cookies) — onderweg vier dev-omgevingslessen opgedaan (HMR breekt networkidle; Next dev weigert 127.0.0.1 als origin; Better Auth eist BETTER_AUTH_URL-poortmatch; UI-taal komt uit appearance_preference, niet localStorage). **Rest voor de user** (taak #9): pilot-quote (1 zin), Calendly-account + `NEXT_PUBLIC_CALENDLY_URL`, domein-keuze.


