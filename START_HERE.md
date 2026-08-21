# START HERE

> Entry point voor mens en agent. Lees deze bij elke sessie-start.
> **Laatst bijgewerkt: 2026-08-21** (model-routing definitief: de meting kan haar eigen tabel
> niet dragen, routing blijft staan — zie hieronder. PR-poort staat op **125 goedkope + 18
> database**-bewakers.)
> Daarvoor: **2026-08-20** (een flappende `check` op main gerepareerd, judge-variantie
> gemeten zonder AI-kosten, en **het fontenprobleem bleek niet te bestaan**: drie
> scraper-bugs waarvan één sinds 05-03 élke gequote fontnaam miste. Item afgerond zonder
> één upload; elf workspaces opnieuw gescrapet. ⚠️ Fontdata van vóór 21-08 is onbetrouwbaar).
> Daarvoor: **2026-08-19** (bewakers-schoonmaak: PR-poort van 18 naar 37 bewakers,
> nachtelijke prod-bewaker, beslispunt 0 gekrompen).
> Daarvoor: **2026-08-18, derde helft** (retentie-plafond live, CSP op enforce,
> SSE-abort gedeeltelijk, de twee Neon-indexen aangemaakt en prod drift-vrij bevonden —
> zie hieronder. Twee sessies liepen elkaar in de weg; dat is de belangrijkste les van de dag).

---

## Huidige fase

**Live op productie, in acquisitie.** App én billing draaien op `branddock.app`
(main = production, Vercel Pro+Fluid). De launch-blockers uit het voorjaar zijn
allemaal weg: Vercel ✅, Stripe ✅, credits ✅ gebouwd en gesmoked.

Het zwaartepunt is verschoven van *bouwen tot het af is* naar **distributie**. Twee
sporen dragen dat:

1. **`brand.md` als instap-funnel** — gratis scan → download → claim → trial. Live en
   werkend: generator, Brand Score, rapport-mail, lifecycle-reeks 2.2-2.5, claim-flow
   en leads-dashboard staan er.
2. **De designbibliotheek** — Brand Manifest, Brand Library-accessor, StyleguideRule
   als eersteklas datatype, en sinds 15-08 ook de F-VAL-rules-pijler die ze écht leest.

**Wat er niét meer speelt:** het credit-model is compleet (bouw, Stripe-config,
smokes). Het enige dat rest is jouw schakelmoment: `NEXT_PUBLIC_TOPUP_ENABLED=true`
plus één echte betaal-smoke.

---

## Wat er landde (2026-08-20)

**Het fontenprobleem bestond niet — er lagen drie scraper-bugs onder.**
`brand-fonts-ontbreken-op-prod` is gesloten **zonder één geüpload bestand**, en dat is de
juiste uitkomst.

De reeks is **44 → 29 → 18 → 2 → 0**, en de reden is bruikbaarder dan de reeks: **elk van die
vijf getallen kwam uit een kolom die niemand had nageteld.** 44 was `count(fileUrl IS NULL)` —
maar Google-fonts hebben nooit een bestand nodig, dus 29. Toen viel de Adobe-kit-route af, dus
18. Toen bleken de "merkfonts" systeemfonts, plugin-icoonfonts en build-hashes, dus 2. Toen
kregen beide resterende merken een nieuwe website, dus 0. Vijf keer een aantal overgenomen uit
een bron zonder te toetsen wát erin stond — en de vierde correctie werd geschreven door
iemand die in diezelfde commit precies die fout veroordeelde.

> ⏭️ **Wil je hier ooit een getal bijwerken: tel het na aan de bron** — de tabel in de
> database, niet de body van de laatste PR. Elk van die vijf correcties was beter dan wat er
> stond en nog steeds niet het antwoord, telkens omdat iemand een betere bron vond en dáár
> het getal uit overnam in plaats van opnieuw te tellen. De vijfde moest van Erik komen.

**De drie bugs**, geen ervan zichtbaar in het oorspronkelijke probleem:

1. **`extractFontsFromCss` miste élke gequote fontnaam.** De tekenklasse sloot `"` uit, dus
   `font-family:"Open Sans"` gaf een lege capture. Sinds de eerste implementatie op
   **2026-03-05** — vijf maanden. ⚠️ **Onzichtbaar juist omdát enkele quotes en ongequote
   waarden wél werkten**: de scraper vond de ongequote systeemfonts uit de fallback-stack en
   miste de gequote merkfont die eráán voorafging. De fontlijst oogde gevuld en was precies
   de ruis zónder het merk — een gevaarlijker faalmodus dan een lege lijst, want een lege
   lijst valt op.
2. De `@font-face`-regex kapte multi-woord namen af bij de eerste spatie: `Museo` naast
   `Museo Sans 300`, zes keer gemeten. Eerst ten onrechte voor een site-eigenaardigheid
   aangezien — een verklaring die per geval plausibel is, hoort verdacht te worden zodra
   het geval zich herhaalt.
3. Systeemfonts, plugin-icoonfonts, build-hashes en query-string-payloads passeerden alle
   drie de bestaande filters.

**Uitkomst na elf re-analyses op productie**: vier merken hebben nu een commerciële huisletter
die eerder werd gemist — `Museo Sans` (Adullam), `proxima-nova` (Goed-Bouw), `Avenir Next`
(Nobox), `Red Hat Display` (Het Nieuwe Golfen). Zes styleguides die nul fonts hadden zijn
gevuld; elf van de vijftien zijn nu schoon.

⚠️ **Fontdata van vóór 21-08 is onbetrouwbaar** — ze bevat ruis én mist echte merkfonts.
PartnerSelect en DTS Ede zijn bewust níet opnieuw gescrapet (nieuwe website op komst), dus
hun rijen zijn nog de oude. PartnerSelects `sourceUrl` is bovendien een **Figma-prototype**,
wat de twee SHA1-hashes in hun fontlijst verklaart.

⚠️ **Twee regressies onderweg, allebei van mijzelf en allebei pas op productie zichtbaar.**
De quote-fix liet de match doorlopen tot de `;` en pikte Tailwinds sluithaak mee
(`Noto Color Emoji")`) — waarmee een bestáánd filter blind werd, want `noto color emoji`
stond gewoon in de lijst. De reparatie dáárvan sloopte de `var()`-resolutie, en werd gevangen
door `smoke:wpb-result-audit`: ander onderwerp, andere invoer. Beide keren dezelfde oorzaak —
getoetst met CSS die ik zelf verzon in plaats van met wat echte sites uitsturen. Dat is de
reden dat de poort **breed** moet zijn in plaats van diep.

Bewaakt door `smoke:font-scraper-ruis` (50 asserties): elke assertie is een gemeten
productie-vindplaats, mét tegenproef dat echte merkfonts blijven staan — anders zou een filter
dat álles weggooit ook groen zijn.


**De PR-poort staat op 121 goedkope bewakers** (120 `smoke:` + `eval:lp-variant-golden`),
plus **18 in de database-poort** (`run-db-guards.sh`). Dat was samen 37 bij de vorige update
en 3 aan het begin van de schoonmaak. Die twee poorten apart noemen is bewust: ze draaien
onder verschillende voorwaarden, en één samengeteld getal verbergt dat. ⚠️ **Aanhaken is niet langer gratis**:
de poort kost nu 1m54s in CI, 21% van de check-job en tweede na de build. Bij 18 bewakers was
dat ~10s. Wie er een toevoegt, voegt kosten toe — dat stond eerder als "bijna gratis" in de
kop van `run-guards.sh` en klopt niet meer.

**Van 3 draaiende bewakers naar 140** — **122** in de PR-poort (de laatste is
`eval:blog-post-golden`, zie hieronder), 18 in de e2e-job (database, met assertie-ondergrenzen),
plus vier nachtelijke workflows.

⚠️ **De telling zelf had een blinde vlek.** Wie bewakers telt in `package.json` ziet een
bestand zónder npm-script niet; dat waren er 73. Gemeten in code in plaats van in bestanden:
**76 src-modules werden door geen enkele aangehaakte bewaker geraakt. Nu 1.**

**Vier keer dezelfde klasse: een bewaker die op het verkeerde bevroor.** Een bewaker die niet
draait vangt niet alleen niets — hij verrot, en meldt zich bij het aanzetten als regressie.

- `image-coupling` eiste de CTA ín de beeldprompt; die is in F36 bewust weggehaald omdat het
  model 'm op het beeld rendeerde
- `checkpoint-gates` stond **twee maanden rood** op een melding die op 17-06 naar het Engels ging
- de junifix van 24-06 (#340) bleek op **drie** plekken incompleet. De scherpste: de
  gedeelde GEO-directive droeg de vóór-fix-eis nog, en die wordt in **dezelfde prompt**
  gezet waar 27 regels verderop het tegenovergestelde staat — tegenstrijdig op precies het
  veld dat de lek veroorzaakte. Eén van de drie werd bovendien door CI *actief afgedwongen*:
  wie het promptbestand fatsoeneerde kreeg rood. Compleet gemaakt in `86a1a2e3`
- `ssrf-guard` droeg **65 beveiligingsasserties** die sinds 30-06 nooit hadden gedraaid

⚠️ `lib/agents` had nul dekking terwijl daar negen agents op productie draaien. Nu bewaakt
inclusief tenant-isolatie, met een mutatietest die aantoont dat die assertie een echte breuk
vangt.

**Model-routing: de ruis is groter dan de verschillen.** Het experiment van 13-05 herhaald op
de juli-generatie, met twee ONGEWIJZIGDE modellen als controle. Hun drift: **gemiddeld 4,0
punten, uitschieter 13**. De winnaars liggen 1-4 punten uit elkaar — deze methode kan die
verschillen dus niet onderscheiden, niet nu en met dezelfde opzet ook niet in mei. De twee
categorieën die van winnaar wisselden, deden dat op **nul** punten verschil.

⚠️ **Nagemeten met 5 samples (21-08, 240 generaties, $4): in ZEVEN van de acht
content-types is het verschil tussen winnaar en nummer 2 niet aantoonbaar.** Gemiddelde sd
2,9 punten, dus een verschil is pas hard vanaf ~5,9 — en de winnaars liggen 1-4 punten uit
elkaar. De extreemste conditie spreidt **61 tot 86 op identieke invoer** (sd 9,4). Eén
generatie daaruit trekken en die "de score van dit model" noemen is een greep, geen meting —
en precies zo is die tabel in mei tot stand gekomen.

**Instructie-trouw discrimineert wél, en kostte nul extra calls**: dezelfde 240 generaties
opnieuw gescoord tegen het woordbereik dat de briefs zélf stelden. Deterministisch, dus geen
judge en geen ruis in de meetlat. Opus 4.8 **87%**, Haiku 4.5 **33%** — 54 procentpunten
spreiding waar de kwaliteitsscore binnen de ruis bleef. ⚠️ Maar bij n=30 overlapt elk
interval met zijn buur: dit levert **tiers op, geen rangorde**. En de skeleton-instructie
ordent `sonnet-5` (4/4) en `gpt-5.6` (3/5) precies andersom — één dimensie volstaat niet.

**Besluit: routing blijft staan, geen vervolgmeting** (Erik, 21-08). Er is geen gemeten reden
om iets te verplaatsen. Wat er lag was niet "de routing is fout" maar "de routing is niet
aangetoond", en dat repareer je niet door hem alsnog te verzetten op dezelfde ruis. De comment
in `canvas-model-routing.ts` claimt geen gemeten optimum meer. Taak dicht:
[`model-routing-herijking`](tasks/model-routing-herijking.md).

⚠️ **Wat NIET is opgelost en bij een volgende modelwissel terugkomt**: er is geen mechanisme
dat merkt dat de onderbouwing van die tabel veroudert. #226 verving in juli drie modellen
zonder de meting te herhalen; dat viel pas in augustus op, bij toeval, via een bewaker die
nergens draaide. Wie de modellen weer ververst, ververst die comment niet vanzelf.

**De nachtelijke `canvas-tweaks` doet wat hij moet.** Run van 21-08 03:45 groen, met de
verwachte soft-warning: `3/5 slide-titels — missing: Onze aanpak in 3 stappen | De volgende
stap`. Derde run met exact dezelfde twee ontbrekende titels, dus vastgesteld modelgedrag en
geen variantie. Groen omdat de afwaardering klopt, niet omdat het probleem weg is.

**Een flappende `check` op main gerepareerd** (#445). Sinds de browserfase aanstond wisselde
main rood en groen zonder tussenliggende wijziging. De eerste diagnose (`networkidle` is
niet-deterministisch) klopte maar was niet genoeg: `/marketing/pricing` haalt tien externe
dingen op, waaronder een typekit-stylesheet in `<head>` die de parser blokkeert. Een
**verplichte** poort hing dus aan de uptime van typekit.net en posthog.com. Nu wordt alles
buiten de eigen host afgekapt. In de geslaagde run vóór de fix duurde één navigatie 24,6s van
de 30s limiet — de marge was er nooit.

**Judge-variantie gemeten, zonder één betaalde AI-call** (#443). Die meting stond weken als
"kost live-LLM-runs, ~55k tokens". Onjuist: de nachtelijke `live-eval` bewaart per run een
artefact, dus vier nachten herhaalde metingen stonden al klaar. Uitkomst: het slaagpercentage
schommelt **50 / 70 / 60 / 90%** op identieke invoer, met de gate op 70%. Dat herkadert het
drempel-besluit — bij ±20 punten spreiding flapt elke lijn tussen 50 en 90. De lijn verschuiven
helpt niet; meer cases of de wisseling wegnemen wel.

**Drie taken waren geclaimd door een sessie die niet meer bestaat.** Voor wie werk zoekt lezen
die als "bezet". Getoetst in plaats van aangenomen: de heartbeat-lock van de session-guard
verloopt na 15 minuten, een `# geclaimd door`-comment nooit. Twee opgeschoond, de derde niet
omdat er een open PR op dat bestand zat.

**Niet gevonden, en dat is ook een uitkomst**: de productie-scrapers dragen hetzelfde
`networkidle`-patroon, maar acht klantsites nagemeten gaven geen enkele hang. Eén alarmerende
meting (28,6s van 30) bleek een artefact van mijn eigen opzet — de variant die eerst draait
betaalt de koude start. Geen productiecode gewijzigd.

**De golden-set bewaakt nu ook de prompt die we écht shippen.** De promptfoo-set genereert met
een eigen inline prompt, dus een regressie in `BLOG_POST_SYSTEM` was onzichtbaar en de scores
beschreven een artefact dat geen gebruiker krijgt. Erik koos optie A: allebei, gescheiden.
`eval:blog-post-golden` (16 asserties, geen database, geen API-sleutel, geen AI-call) bouwt de
productie-prompt en toetst hem in de goedkope poort. Hij bewaakt vooral dat merk-, persona-,
campagne- en brief-context écht in de prompt landen — stil contextverlies is de ergste faalmodus
van dit product.

⚠️ **Twee van de drie openstaande "productbesluiten" bleken geen vragen maar defecten.** De ene
rubric eiste zichtbare aannames in de copy terwijl de shipped prompt juist zegt *"produce only
the final content"*; de andere assert was hoofdlettergevoelig en faalde wanneer het keyword
alleen aan een zinsbegin stond. Beide stonden weken als "wacht op Erik".

**De rode draad van deze twee dagen, breder dan bewakers.** De meetfouten hadden allemaal
dezelfde vorm: *een meting die iets oplevert, is juist daarom niet verdacht.* Een lege
database in plaats van een geseede; `env -u` dat niets wegneemt omdat `.env.local` het
terugzet; een teller die 65 asserties als 1 leest; `npm run` op een ontbrekend script dat
**stil niets** doet; een grep die commentaarregels meetelt (twee keer); een globale replace
die de judge van een experiment verwisselde; en een A/B-tijdmeting waarin de eerste variant
de koude start betaalt. Allemaal uitgeschreven in `gotchas.md` onder 19 en 20 augustus.

Wie hier begint en één ding meeneemt: **een uitkomst die je hypothese bevestigt, is het
moment om je meetopzet te verdenken** — niet het moment om te rapporteren.

---

## Wat er landde (2026-08-19)

**De bewakers-schoonmaak. Van 78 smoke-scripts draaiden er drie.** Een survey (#368) telde ze,
en de aanhaakslag daarna bracht de goedkope PR-poort van 18 naar **37 bewakers** — samen ruim
3.000 asserties die eerst nergens draaiden. Plus een nachtelijke productie-bewaker (#377) en
negen CSP-checks (#380).

Drie van die 37 kwamen pas laat in beeld en verdienen een aparte vermelding: `ssrf-guard.ts`
(65 asserties), `security-medium.ts` en `enforce-brand-name-capitalization.ts` hadden **geen
npm-script** en waren daardoor onzichtbaar voor de survey — die telde scripts in
`package.json`, niet bestanden op schijf. `ssrf-guard` is gecommit bij een SSRF-fix eind juni
en had sindsdien nooit gedraaid.

Drie dingen daaruit zijn belangrijker dan het aantal:

**1. Een bewaker die nergens draait, verrot naar de verkeerde kant.**
`smoke:geo-generation-prompt` stond sinds **24 juni ongezien rood**. Zijn assertie eiste de
tekst `VERPLICHTE bron` in de GEO-prompt — een eis die in juni bewust was wéggehaald, omdat
een verplichte bron het model dwong er één te verzinnen (meestal een interne laagnaam als
`brand-context`, die als bronvermelding op de klantpagina belandde). De bewaker faalde dus op
een *verbeterde* prompt. Wie hem eindelijk had aangezet, had een fix gerepareerd die geen bug
was. Nu bewaakt hij de reparatie in plaats van de weggehaalde eis (#375).

**2. Elf bewakers waren niet stuk maar konden niet starten.**
Ze golden als "heeft een database nodig". In werkelijkheid crashen ze op een *ontbrekende*
`DATABASE_URL`, niet op een onbereikbare: 71 van de 78 scripts laden zelf geen env-file, dus
`prisma.ts` valt om bij het importeren — nog vóór er één assertie draait. Met een gezette maar
dode URL komen ze alle elf groen terug, samen 2.315 asserties in ~17s (#374).

**3. Mijn eigen meting deugde niet, en dat is de bruikbaarste les.**
Ik concludeerde eerst dat alle 27 sleutel-bewakers "netjes falen zonder sleutel". Die conclusie
rustte op `env -u SLEUTEL`, en dat neemt niets weg als het script `.env.local` laadt. Ik had
netjes getoetst of mijn detector een vals vinkje kón vinden — maar niet of mijn *ingreep* iets
déed. Eén regel (de waarde printen ná het strippen) had het meteen laten zien. Een parallelle
sessie meldde het; de gotcha van 19-08 staat op beide namen.

**Verder**: de type-check draait in twee processen (#372) — dat verkleint de piek van 4,95 naar
4,12 GB maar **heft de 8 GB-bump niet op**, en dekt aantoonbaar nog exact dezelfde 3241
bestanden. En `smoke:storage-url-expiry` bleek nooit netwerk te doen (#379): de URL's in zijn
broncode zijn testdata. Dat was dezelfde fout die twee dagen eerder al in het survey-bestand
stond opgeschreven — een les opschrijven voorkomt hem niet, een toets wel.

---

## Wat er landde (2026-08-18)

**Elke bezoeker kreeg `lang="en"` op een Nederlandse pagina** (PR #335, changelog #484).
`static-rendering-regressie` begon als prestatietaak en eindigde als correctheidsfix. De
root layout leidde `<html lang>` af uit de UI-taalcookie, terwijl **geen enkele publieke
route `useTranslation` gebruikt** — marketing, brand.md en de klantpagina's zijn
hardgecodeerd Nederlands. Elke bezoeker zónder cookie, dus per definitie iedereen die
binnenkomt, kreeg daardoor een Engels taalattribuut. Geverifieerd op prod:
`branddock.app/marketing/pricing` gaf `lang="en"`, `linfi.branddock.app/pillar-page`
ook — terwijl daar `LandingPage.locale = 'nl-NL'` staat.

⚠️ **Statisch renderen blijkt niet vrij te schakelen, en dát is de blijvende uitkomst.**
De cookie-read was maar de helft: sinds de enforce-flip is `script-src` nonce-based met
`'strict-dynamic'`, en een gecachete respons draagt een verouderde nonce. Gemeten:
statisch bouwen laat **6 van de 10 CSP-tests falen**. De rendermodus blijft dus bewust
dynamisch; de inerte `generateStaticParams` en `revalidate` blijven staan mét die gemeten
reden erbij. Heropenen vraagt een CSP-scope zonder per-request nonce (2-4 dagen).

⚠️ **En de urgentie klopte niet**: 4 `PageEvent`-rijen op prod, 1 gepubliceerde
landingspagina. De prestatiewinst is vandaag nul. Tweede keer in twee dagen dat een
taaktekst een groter probleem beschreef dan de meting terugvond (zie de retentie-indexen).

**De les zit in de verificatie, niet in de fix** (gotcha 18-08). Vijf reviewrondes vonden
elk een gat dat de vorige had gemist, telkens met dezelfde vorm: het faalscenario zat niet
in de meting. Verse page loads misten client-navigatie; localhost miste de apex-rewrite;
en een adversariële reviewer verwijderde één regel uit de proxy waarmee de complete
server-fix verviel terwijl **alle** gates groen bleven — inclusief de browsercheck, die
`OK lang="nl"` meldde tegen HTML die `lang="en"` zei, omdat de client de DOM ná hydratie
repareert. De smoke leest nu ook de rauwe serverrespons.


**Landing-page-data heeft een plafond** (#286, changelog 474). Eén dagelijkse cron ruimt
PageEvents (13mnd), FormSubmissions (26mnd, lead-PII) en oude `compiledHtml`-artifacts op,
plus een `DELETE`-route voor een individueel AVG-wisverzoek. Drie reviewrondes haalden er
onder meer uit: een afkapdatum die op maandeinden tot 3 dagen te veel wiste, een pruner die
alles voorbij 4.000 pagina's stil oversloeg, en een `viewer` die lead-PII kon wissen.
✅ **De twee `createdAt`-indexen staan er** (#311): aangemaakt op `branddock-prod`/`production`
via de Neon-MCP, beide `indisvalid = true`. `CREATE INDEX CONCURRENTLY` werkt over die route
gewoon — de transactie-valkuil van de Neon SQL-editor speelt er niet.
⚠️ **Maar de urgentie klopte niet.** Gemeten vóór het aanmaken: `PageEvent` **4 rijen**
(oudste 14-08), `FormSubmission` **0** — samen 96 kB. De "volledige tabelscan" die dit item
naar Nu haalde las vier rijen. Terecht gedaan, maar om schema-drift te dichten, niet voor
prestaties. **Meet vóór je prioriteert**; de tekst van een taak beschrijft niet de toestand.

**Claude kan weer bij de prod-DB — via de Neon-MCP** (connector `claude.ai Neon`; één project,
één branch, dus geen verwarringsrisico). Meteen ingezet voor een volledige drift-check prod
tegen `schema.prisma`: 182 tabellen, 284 foreign keys, 115 enums → **geen drift**. Drie
signalen bleken onschuldig, en de enige echte afwijking zat lókaal. Die leverde de gotcha op:
`prisma migrate diff` gaf een lege migratie terwijl de DB wél afweek — Prisma kent geen
nullable list, dus de diff-engine kán dat verschil niet uitdrukken. Het commando waar iedereen
naar grijpt om drift te checken geeft daar dus vals groen.

**De twee veiligheidshooks kloppen weer** (#313 + #314, changelog 480). `guard-hooks-hardening`
stond sinds 17-07 te wachten op jouw akkoord; dat kwam nadat alle drie de gaten vandaag opnieuw
geraakt werden. De guard leidt de worktree nu af uit het commando in plaats van uit zijn eigen
cwd, `check-dangerous-bash` beslist op de operatie in plaats van op de tekst, en `gh pr merge`
waarschuwt. ⚠️ Twee gaten kwamen er tijdens het bouwen bij: `git -C <pad> <verb>` passeerde
**béide hooks al sinds hun ontstaan**, en `git worktree list` telde als HEAD-mutatie. Bewijs:
`npm run smoke:guard-hooks` 13/13 plus drie mutatietests. Niet bewezen: of de merge-waarschuwing
je daadwerkelijk bereikt — dat vraagt een tweede échte sessie.

**CSP staat op enforce** (#294, changelog 476) en de metadata-bug op gepubliceerde pagina's
is weg (#477). Beide uit een parallelle sessie.

**Weglopen tijdens een generatie kost minder tokens** (#287 + #303, changelog 475) — maar
gedeeltelijk. Wat er staat: guards vóór elke dure call, het signaal doorgezet tot in de
Anthropic-call, en een abort-registry per deliverable zodat een tabwissel in de Canvas een
lopende betaalde run níet meer afbreekt. Wat er níet staat: de atomaire settings-merge, het
bewaren van deel-resultaten en de `cancel()`-detector.

⚠️ **De rode draad van vandaag: twee sessies in dezelfde bestanden.** Een parallelle sessie
bouwde in #295 onafhankelijk exact dezelfde fix als ik (transactionele fresh-read in
`persistVariantOptions`), en mijn merge van #287 squashte een verouderde branch-head omdat
de GitHub-API die bleef tonen — waardoor vijf commits niet in main landden en er een al
gevonden regressie live stond tot #303. Precies waar `CLAUDE.md` voor waarschuwt, en niet
theoretisch gebleken. Twee praktische regels die dit had voorkomen: **verifieer de head-SHA
met `git ls-remote` vóór je merget**, en pak geen task-file op waar een andere sessie in
werkt zonder dat af te stemmen.

---

**Twee taken op de Nu-lijst waren allang af — en de vraag "nooit begonnen of ongepusht?"
had een derde antwoord: gemerged.** `marketing-homepage-v2` landde op 15-07 (PR #151), en de
complete Out-of-scope-lijst Fase 2/3 volgde diezelfde avond in #152 en #153 — feature-,
oplossingen- en juridische pagina's bestaan allemaal. `kpi-fase0` landde op 20-07 (PR #215,
changelog #424); alle drie zijn acceptatiecriteria stuk voor stuk nagelopen: de 403-gate en
responsvorm van `/api/admin/growth-metrics`, de Growth-tab bínnen het `isDeveloper`-blok met
alle vier renderblokken, en groene CI (`check` 8m51s, `det-suite`, `e2e`) plus de in #424
vastgelegde dev-smoke. Beide branches waren na de merge netjes opgeruimd — dáárom was er geen
worktree.

Oorzaak van de verkeerde status: beide files hadden géén frontmatter en kregen die op 17-08
achteraf aangeplakt (#286) met een default `status: in-progress`; bij `marketing-homepage-v2`
plus een `created` ná de merge van zijn eigen werk. **Achteraf aangeplakte frontmatter is een
gok, geen registratie** — leid status en datum af uit `git log --diff-filter=A` van het bestand
en uit de merge-status van de PR. De pagina-voor-pagina-doorloop van de marketing-site loopt
verder als `marketing-site-verbeterslag`.

## Wat er landde (2026-08-17)

**De campagnewizard is voor het eerst end-to-end getest** (#279-#284, changelog 473). De sweep
van 15-08 zette de campagnegenerator op afgevinkt met in dezelfde regel "de stappen ná de gate
zijn níét afgedekt" — vier van de zeven stappen waren nooit door het klikpad gegaan. Achter die
gate lagen **vijf productiebugs**: de briefing-scoring (drie defecten, waaronder gap-labels die
allemaal "Algemeen" toonden), stap 4 die met een harde 400 faalde door een modelnamen-lijst die
`claude-sonnet-5` miste, afgekapte JSON die als syntaxfout verscheen, en twee bugs die samen
maakten dat "Approve Concept" een campagne zónder AI-deliverables opleverde.

Meetbaar: dezelfde wizard en briefing gaven **1 deliverable vóór en 8 erna**, runtime 18-24 min
→ 6,0 min. De 80-drempel is bewust blijven staan — met werkende scoring blokkeert die precies
wat hij hoort te blokkeren.

⚠️ De rode draad is het onthouden waard: in vrijwel elk geval **bestond de diagnostiek al, maar
kwam ze nergens aan**. De parse-fout wees naar de verkeerde plek in de respons, de weigering bij
de conceptbeoordeling kwam als toast die geen enkele foutafvang ziet, en de `console.warn` die
de laatste bug verklaarde stond in de browserconsole die niemand las.

---

## Wat er landde (2026-08-16)

**Het ongecommitte werk is weg** (#266). De zeven bestanden die dagen los in de
main-worktree lagen staan vast: het complete HNG-invulboekwerk (fill-script,
hertest-script, prod-bundle, task-file), de bijgewerkte open-acties en de
lockfile-sync. **HNG is af** — de prod-import is gedraaid en de kennisbronnen zijn
geüpload. `docs/Branddock branddoc v3.pdf` blijft bewust buiten git (gitignore-regel
op `Branddock branddoc*.pdf`; klant-branddocs blijven wél tracked).

**Done-audit over 165 afgeronde taken** (16-08). Aanleiding: de e2e-sweep stond op `done`
terwijl vier campagnewizard-stappen ongetest waren. Uitkomst: 90 van de 165 done-taken hebben
onafgevinkte vakjes — dat is vooral een boekhoudgewoonte, geen verborgen werk. Drie gevallen
waren écht restwerk en zijn nu taken: de campagnewizard, twee visual-brief-smokes waarvan de
blocker sinds 05-07 weg is, en een Typography-browser-smoke. Les vastgelegd in `gotchas.md`.

**De content-keten heeft één deur gekregen** (#270-#276, zeven PR's). Content woonde op
drie plekken en het type-systeem wees consumenten naar de verkeerde; dat leverde in acht
weken vier keer dezelfde bug op. `resolveDeliverableContent()` handelt dat verschil nu één
keer af, en 21 van de 23 kruisingen zijn omgezet. Geverifieerd op je échte data, niet op
fixtures: **13 opgeslagen pagina's die 0 woorden opleverden geven er nu 497-1306**, en de
accessor gooide op geen enkele rij. Onderweg bleek de **ZIP-export voor élk content-type
leeg** (een geneste API-response die nooit werd uitgepakt), en zou een `derive` van een
web-page de tekst van de bronpagina hebben overgenomen. Twee kruisingen wachten op jouw
productkeuze; #12 bleek dode code.

**De golden-set-gate is gesplitst** (#267) — en de "flake" bleek een stabiele
bevinding. Twee dingen klopten niet aan het oude beeld. Het diagnose-pad was
onuitvoerbaar: het artefact `golden-set-results-<sha>` heeft nooit bestaan, want
`.promptfoo-results/` begint met een punt en `upload-artifact` slaat hidden files
over — de stap meldde `success` met alleen een warning. En het zijn geen flakes:
over vijf nachten zakken steeds dezelfde cases (SEO-focus extreem 5/5, lege
knowledge-context 4/5, vage brief 4/5, thought-leadership 4/5). Echt niveau ~50-60%
tegen een drempel van 70% die op de rand was gekalibreerd. Nu: `deterministic`
(key-loos, 1m16s) blokkeert PR's, `live-eval` draait nightly-only en faalt daar nog
steeds hard. **Een rode check op je PR is voortaan altijd van jou.** De drempel is
bewust niet verlaagd; de inhoudelijke vraag staat als
[`golden-set-blogpost-quality`](tasks/golden-set-blogpost-quality.md).

---

## Wat er landde (2026-08-15)

Twee parallelle sessies, negen PR's, alles gemerged met groene CI.

**Designbibliotheek** (#255-#259, #263): StyleguideRule bereikt de F-VAL-rules-pijler,
merkcontext via één gegate accessor met lint-regel, reviewstatus-driftreset, re-analyse
die geen user-edits meer vernietigt, curatie-suggesties uit F-VAL-overtredingen, en R4
compleet. Plus twee CI-fixes (#260, #262) die main van acht commits rood naar groen
brachten — de tsc-stap kreeg 8GB heap omdat hij omviel met out-of-memory.

**E2E-sweep + 8 bugs** (#261, changelog 468): alle 24 zichtbare content-types door het
echte klikpad. 7 leverden nul tekens op. Zes van de acht bugs faalden stil.

**Brand Score + lifecycle-mails** (#264, changelog 469): de score gaf iedereen exact 70;
nu 71-98 met uitleg. Mails herschreven naar Nederlands, één CTA per stuk.

---

## Top 3 om mee te beginnen

**1. 💳 TOPUP aanzetten.** Nog steeds het enige met directe omzet-impact, en er is geen
technisch werk meer — alleen `NEXT_PUBLIC_TOPUP_ENABLED=true` en één betaal-smoke.

**2. 📣 [`brand-md-open-standaard`](tasks/brand-md-open-standaard.md) — jouw strategie-akkoord.**
Naar voren gehaald op een meting, niet op een gevoel: de funnel is technisch compleet en
leverde in vier dagen **4 page-events en 0 leads** op. Dat is geen infra-probleem meer maar
een distributie-probleem, en het enige wat de volgende stap tegenhoudt is jouw akkoord op de
omarm-strategie plus de outreach naar de maintainer. De upstream-PR's liggen als tekstpakket
klaar.

**3. 🔤 ~~`brand-fonts-ontbreken-op-prod`~~ — ✅ AFGEROND 21-08, en er is niets geüpload.**
Dat is de juiste uitkomst: het werk dat hier lag bestond grotendeels niet. Volledige
uitkomst en de vier correcties op dit blok staan in
[`tasks/done/brand-fonts-ontbreken-op-prod.md`](tasks/done/brand-fonts-ontbreken-op-prod.md).

> **De cijferreeks van dit item is het bewaren waard: 44 → 29 → 18 → 2 → 0.** Vier keer werd
> een aantal overgenomen uit een kolom zonder te toetsen wát erin stond. Wat er onder lag was
> geen ontbrekend bestand maar drie scraper-bugs — waarvan één sinds de eerste implementatie
> (05-03) élke gequote fontnaam miste. De styleguides stonden vol systeemfonts en
> plugin-icoonfonts en misten hun échte merkfont.
>
> Na de reparatie en een re-analyse van elf workspaces: vier merken hebben nu een commerciële
> huisletter die eerder werd gemist (`Museo Sans`, `proxima-nova`, `Avenir Next`,
> `Red Hat Display`). PartnerSelect en DTS Ede zijn overgeslagen — nieuwe website op komst.

---

## Open beslissingen (blokkeren werk)

0. ✅ **OPGELOST 2026-08-19 — dit punt kan van je lijst.** Het luidde: `test:csp` en
   `smoke:document-lang-browser` draaien nergens en vragen een build + test-DB, dus het is
   een kostenafweging voor jou.

   Nagemeten in plaats van aangenomen, en de afweging viel de andere kant op:

   - **14 van de 15 CSP-checks draaien** (#380, #436). De aanname "build + database +
     chromium" klopte voor negen ervan helemaal niet — die gaan via HTTP. Voor de andere
     vijf bleek chromium in de `check`-job goedkoper dan het alternatief: de sweep heeft een
     PRODUCTIEBUILD nodig, dus naar de `e2e`-job verhuizen had dáár een tweede build gekost.
   - **De taalbewaker draait volledig** — fase 1 én 2. Dat kostte geen aparte beslissing; het
     probleem was de kóppeling (server én browser in één eis), niet de prijs.

   De **vijftiende** CSP-check blijft eruit en dat is geen open beslissing maar een feit: hij
   logt in en vraagt dus een geseede database, die de `check`-job niet heeft. Hij faalt daar
   op `sign-in faalde`, niet op een violation.

   ⚠️ Eén ding om te weten: fase 2 van de taalbewaker was tot 19-08 **stuk** en toetste niets
   (#435). Hij navigeerde met `history.pushState`, wat `usePathname()` in Next 16.2.9 niet
   bijwerkt. Was bijna aangehaakt als "zeven checks voor de prijs van één".


1. **Resterende SSE-abort-wijzigingen** — de atomaire settings-merge, deel-resultaten bewaren
   vanaf 2 varianten, en de `cancel()`-detector staan klaar op `claude/sse-abort-disconnect`
   (`4a8f12b`). Ze vervangen de transactionele fresh-read die #295 net mergede; die versmalt
   het read-modify-write-venster maar sluit het niet (READ COMMITTED neemt geen row-lock).
   Er ligt een comment op #295; keuze is of ik doorpak of dat die sessie het zelf oppakt.
2. **brand.md-strategie** — akkoord op de omarm-strategie + outreach naar de maintainer;
   de upstream-PR's liggen als tekstpakket klaar.
3. **Meertaligheid brand.md-funnel** — de pagina's en mails zijn nu Nederlands. De wens was
   breder: site meertalig, mails volgen de gekozen taal. Vereist een locale-kolom op
   `GeneratedBrandProfile` (schemawijziging → Neon-push) en template-lookup per taal.
   Het fundament ligt er: `renderLayout` kent al een `locale`.

4. **De blog-post golden-set** ([task](tasks/golden-set-blogpost-quality.md)) — ⚠️ **van drie
   vragen naar één.** Dit punt stond hier sinds vanochtend als "drie vragen, één zitting". Bij
   het uitzoeken bleken er **twee geen vraag aan jou** maar een fout in de eval.

   - ~~**A. aannames in de tekst?**~~ ✅ **opgelost — rubric-fout.** De shipped prompt
     schrijft het tegenovergestelde voor van wat de rubric eiste (*"Mentally adjust BEFORE
     writing — then produce only the final content"*). Het product had de vraag al
     beantwoord; de eval keek op de verkeerde plek.
   - ~~**B. keyword letterlijk in de H1?**~~ ✅ **opgelost — bug, geen keuze.** Correctie op
     wat hier vanochtend stond: de term stond er **élke** nacht in. `promptfoo`'s `contains`
     is hoofdlettergevoelig en faalde wanneer elk voorkomen aan een zinsbegin stond. De H1
     was alle vier de nachten identiek en droeg de volledige zoekterm.
   - **C. Wat doen we met de 70%-gate?** — **advies: nu niets, over ~4 nachten opnieuw
     meten.** De cijfers hier waren 50/70/60/90%; gecorrigeerd voor de bug van B wordt het
     **60/70/70/90%**. De spreiding blijft het probleem, niet de lijn — maar de fixes van
     vandaag veranderen komende nachten, en kiezen op oude data is opnieuw op de rand
     kalibreren.

   ✅ **En de vierde vraag is beantwoord: Erik koos A op 20-08.** Gebouwd en aangehaakt:
   `scripts/eval/blog-post-golden/run.ts`, 16 asserties, geen database, geen API-sleutel,
   geen AI-call — hij bouwt de productie-prompt en toetst hem, in de goedkope PR-poort.

   Daarmee is dit hele punt van je lijst. De promptfoo-set blijft ongewijzigd voor de
   nachtelijke kwaliteitsscores; de nieuwe runner vangt prompt-regressies gratis. Getoetst
   dat hij een breuk merkt: de H1-belofte uit `BLOG_POST_SYSTEM` weghalen laat hem omvallen
   op de juiste check.

---

## Openstaande taken

### Nu
| Taak | Staat |
|---|---|
| [`brand-md-open-standaard`](tasks/brand-md-open-standaard.md) | in-progress — funnel live; rest is upstream-PR's + jouw strategie-akkoord |
| [`lp-image-routes`](tasks/done/lp-image-routes.md) | review — wacht op één prod-smoke door jou |
| [`onboarding-flow-test`](tasks/onboarding-flow-test.md) | open — hangt op 3 externe testers |
| [`open-acties-2026-07-23`](tasks/open-acties-2026-07-23.md) | open — wacht-op-Erik-lijst. ⚠️ §B: de retentie-indexen zijn ✅ af (#311); wat resteert is `NEXT_PUBLIC_POSTHOG_KEY` op prod |
| [`marketing-site-verbeterslag`](tasks/marketing-site-verbeterslag.md) | in-progress — pagina-voor-pagina-doorloop van alle 26 marketing-URL's + verzamelbak voor website-brede wijzigingen |

### Volgende
[`pg-major-sslmode-semantiek`](tasks/pg-major-sslmode-semantiek.md) (pg v9 maakt van onze
`sslmode=require` stil een zwakkere modus. ✅ **Code af per 19-08** incl. de bewaker die er
nooit was aangesloten; wacht nog op één env-handeling van Erik — `verify-full` in de prod-URL,
en pas dáárna `DATABASE_SSL_STRICT=true`) ·
`workspaces-online-migratie` (4 workspaces resteren, jouw keuze) ·
[`deferred-browser-smokes-unblocked`](tasks/done/deferred-browser-smokes-unblocked.md) ✅ **done**
(3 smokes wachtten op een blocker die sinds 05-07 weg is) ·
[`golden-set-blogpost-quality`](tasks/golden-set-blogpost-quality.md) (⚠️ **stand 20-08: vier
van de vijf punten dicht.** De twee "productbesluiten" waren geen vragen maar defecten — de ene
rubric eiste wat productie verbiedt, de andere assert was hoofdlettergevoelig. De v2-vraag is
beantwoord (optie A) en gebouwd. Wat rest is de 70%-drempel, en die kán niet af vóór er ~4
nachten met de nieuwe fixes zijn gedraaid — vanaf 24-08) ·
[`document-lang-followups`](tasks/document-lang-followups.md) (restwerk uit
`static-rendering-regressie`: statisch renderen heropenen vraagt eerst een CSP-scope zonder
per-request nonce; plus dezelfde `lang`-bug op `/oauth/*`, `/reset-password` en
`/invite/accept`)

> ~~`headless-content-service` (P3.0a) · `brand-assistant-quick-create` (P3.0b)~~ — **beide bleken
> al gebouwd en gemerged** (changelog #413, PR's #185/#187/#188/#190/#192/#196). Er stond nog een
> stale kopie in `tasks/` naast de afgevinkte in `tasks/done/`; de duplicaten zijn 17-08 verwijderd.

### Later
`agent-vera-triggers` ·
`content-test-regression-7B` · `geo-seo-followup-later` · `i18n-ai-translation-pipeline` ·
`power-user-shortcuts` · `publishgate-second-opinion` · `validate-brand-domain-component-fit` ·
`video-chain-explainer-showcase` ·
`mcp-external-data-enrichment-research` ·
[`lp-turnstile-form-endpoint`](tasks/lp-turnstile-form-endpoint.md) (⚠️ **blocked op een
trigger, niet op werk**: afgesplitst uit `lp-review-followups` bij het afronden daarvan.
Bouwen zonder waargenomen spam-druk zet een CAPTCHA in het conversiepad van een funnel met
nauwelijks verkeer. De taak draagt vier meetbare triggers plus de SQL om ze te toetsen)

---

## Losse eindjes uit deze sessie

- ✅ **`canvas-tweaks` — opgelost, nacht van 20 op 21-08.** De job draaide om 03:45 en gaf
  exact de voorspelde vorm: **12 passed, 0 failed, 1 soft-warning**. Geen restant, geen
  bevinding.

  De soft-warning is de bekende 3/5 slide-titels, met dezelfde twee ontbrekende
  ("Onze aanpak in 3 stappen", "De volgende stap"). Daarmee is dat gedrag nu **drie keer
  onafhankelijk identiek** gemeten — twee keer op 20-08, één keer op 21-08. De aanname
  "reproduceerbaar gedrag, geen flake" staat steviger dan toen hij werd opgeschreven.

  Bijvangst uit diezelfde run: de golden-set haalde **9/10 = 90%**, de eerste nacht met de
  fixes van 20-08. Zie [`golden-set-blogpost-quality`](tasks/golden-set-blogpost-quality.md).


- **F-VAL onder de drempel** bij `linkedin-post` (69), `linkedin-poll` (70), `search-ad`
  (70,5) en `twitter-thread` (71). ✅ **Uitgesloten 19-08 — de Napking-verklaring klopt niet.**
  De opdracht was "sluit dat eerst uit"; dat is gedaan, en het antwoord is nee.

  | content-type | published (n, gem.) | unpublished (n, gem.) |
  |---|---|---|
  | `linkedin-poll` | 14 → **79,3** | **0 metingen** |
  | `twitter-thread` | 8 → **80,6** | **0 metingen** |
  | `search-ad` | 9 → 80,8 | 4 → 77,8 |
  | `linkedin-post` | 33 → **68,9** | 38 → **78,7** |

  Twee van de vier types hebben **nul** unpublished-metingen — hun score kán dus niet door
  een niet-gepubliceerde styleguide komen. En bij `linkedin-post` wijst het de andere kant
  op: de *gepubliceerde* groep scoort tien punten lager. Op productie staat Napking
  bovendien gewoon op `published = true` (24 regels); alleen lokaal staat hij op `false`,
  en dáár is gemeten.

  ✅ **Afgehecht 19-08 — en de "oorzaak" die ik eerst meldde was zélf een meetfout.**
  Het losse eindje beschrijft **verouderde scores**, meer niet.

  Ik meldde eerst een botsing tussen twee F-VAL-pijlers: het merk-DNA zou woorden
  voorschrijven die de anti-AI-detector bestraft. Die botsing bestónd, maar is **op
  2026-06-10 gerepareerd** — `detectAiTells()` heeft een `brandVocabulary`-allowlist,
  gevoed uit `wordsWeUse`, en de comment daarboven noemt letterlijk de twee woorden die ik
  als bewijs aanvoerde. Gemeten: `antiPattern` 6,37 vóór die datum, **9,13** erna.

  Mijn vergelijking "Linfi tegen de rest" was in werkelijkheid **vóór-de-fix tegen
  ná-de-fix**: Linfi heeft 33 scores, allemaal van 19-05, nul erna; de andere workspaces
  hebben er 10-16 van ná die datum. Geen workspace-effect, geen ontwerpspanning — een datum.
  Volledige analyse in [`fval-merkwoorden-vs-antipattern`](tasks/done/fval-merkwoorden-vs-antipattern.md)
  (ingetrokken, bewaard om de meetfout); les in `gotchas.md` 19-08.

  ⚠️ **Wat er wél uit volgt, en het enige actiepunt**: Linfi's 33 linkedin-post-scores zijn
  van vóór de fix en kleuren elke ranglijst waarin ze meedoen — ze trokken het gemiddelde van
  dit content-type omlaag. Wie F-VAL-cijfers per content-type of workspace rapporteert,
  filtert op `scoredAt >= '2026-06-10'` of hermeet eerst.

  ⚠️ En de published/unpublished-vergelijking bij dit content-type had een **confounder**:
  de published-groep bestónd uit Linfi.

  ⚠️ **Wat daarnaast waar blijft**: het publish-mechanisme bestaat. De stijl-pijler
  is systematisch zwakker zonder gepubliceerde styleguide — over alle workspaces 87,8
  (published) tegen 59-69 (unpublished), en bij `search-ad` 99,3 tegen 57,0. `brand-context.ts:1242`
  gate't zeven contextvelden op diezelfde vlag (manifest, kleuren, fonts, typografie,
  tone-of-voice, twee beeldvelden), en `styleguide-rule-compiler.ts:126` zet de rules-pijler
  op nul. Alleen verklaart dat déze vier scores niet. De echte oorzaak van de lage
  `linkedin-post` staat nog open.

- ⛔ **`better brands` op prod publiceren — BESLUIT 19-08: doen we niet.** De bevinding blijft
  staan als vastlegging: van de zeven prod-styleguides met `published = false` is dit de enige
  met échte content (22 regels, 5 deliverables, laatste 17-07), dus die vijf zijn gemaakt
  zonder de zeven gegate contextvelden en zonder de rules-pijler.

  **Consequenties van het schrappen, expliciet zodat niemand ze later voor een vergissing
  aanziet**: (1) de pilot-claim van +6,8 blijft gemeten onder deze omstandigheden — dus als
  ondergrens, zie hieronder; (2) nieuwe content in deze workspace blijft zonder die velden
  genereren; (3) wie de claim ooit wil aanscherpen, moet eerst publiceren én hermeten.
  Bijvangst: er staan **drie** workspaces met de naam `better brands` op prod, twee daarvan
  leeg en aangemaakt op 14-08.

  ✅ **Nagemeten 19-08 — de claim wordt hier níet door ondergraven, eerder andersom.**
  `docs/reports/pilot-hermeting-2026-07-21.md` noemt als bron: *"Workspace: Better brands
  (dev) — rijk merk-DNA, voiceguide mét centroid"* en *"8,9K chars merkcontext"*. Dat is
  precies de workspace die op `published = false` staat. Die 8,9K kwam er dus **zonder** de
  zeven gegate velden en zonder de `StyleguideRule`-bron in de rules-pijler.

  Wat dat wél en niet betekent: de stijl-pijler líep (via de voiceguide-centroid, een andere
  bron dan de styleguide), dus "pijler 1 actief" in het rapport klopt. Kleuren en fonts wegen
  nauwelijks voor tekstcontent — maar `brandManifest` en `brandToneOfVoice` vielen óók weg, en
  die zijn wél tekstrelevant. **De +6,8 is daarmee vermoedelijk een ondergrens, geen
  overschatting.** Publiceren maakt de claim dus niet stuk; het vraagt een hermeting om hem te
  kunnen aanscherpen. Het script is reproduceerbaar:
  `scripts/experiments/pilot-hermeting-2026-07.ts`.
- ~~Campagnewizard voorbij stap 3 ongetest~~ → **eigen taak sinds 16-08**:
  [`campagne-wizard-e2e-restscope`](tasks/done/campagne-wizard-e2e-restscope.md). Inclusief de
  vraag of de 80-drempel klopt — een rijk ingevulde briefing haalde 68.
- **`rule-structurer` en `brief-week-theme-prompt`** zijn dezelfde soort STRUCTURED-calls
  als de variant-generator en dus theoretisch kwetsbaar voor thinking-uitputting. Daar
  thinking uitzetten is een kwaliteitsafweging (ze redeneren over merkregels), geen bugfix.
  De nieuwe foutmelding wijst het aan als het gebeurt.
- **Mail 2.4** citeert nu de positionering uit de scan. Merken zonder bruikbare
  positionering vallen terug op een datum-variant — dat is de zwakkere versie.
- **`contentType` wordt gemengd behandeld — sommige consumenten normaliseren, andere niet.**
  Gevonden bij de verificatie-sweep van 19-08, na het opschonen van drie smoke-scripts die de
  display-naam als id schreven (#414). `evaluatePageQualityForType` vergelijkt **exact**
  (`=== 'landing-page'`), terwijl de send-route en twee Content-Library-views
  `.toLowerCase()` doen. De data is nu schoon en prod was het al, dus er is vandaag geen
  gevolg — maar de vraag "hoort `contentType` genormaliseerd te worden bij het schrijven?"
  staat open. Bewust niet opgelost: dat raakt meer plekken dan de opruiming die het aan het
  licht bracht.

- **`channelTones`** wordt nooit door een scan gevuld: 2,5 punt van de Brand Score is
  daarmee onbereikbaar zonder mens. Bewust zo gelaten.

---

## Hoe te beginnen

**Sessie-start** (Stream Deck):
```
Lees CLAUDE.md, gotchas.md en START_HERE.md.
Bevestig wat je begrijpt over de huidige fase en geef de top 3 actieve tasks.
```

**Bij task-werk**:
```
Werk aan tasks/<id>.md volgens de regels in CLAUDE.md.
Start in plan-mode. Bevestig file-set en acceptatiecriteria voor je begint.
```

**Nieuw feature-idee**: `Ik heb een idee voor X. Run feature-planner subagent.`
Pipeline: 6-assen discovery → `tasks/_drafts/idea-<id>.md` → technical-planner →
`tasks/<id>.md`. Gids: [`docs/playbooks/feature-discovery.md`](docs/playbooks/feature-discovery.md)

### Twee sessies tegelijk

Werkt, maar alleen met discipline. Vandaag ging het één keer mis en één keer goed:

- **Mis**: een branch vanaf *lokale* main nam ongepusht werk van een ander mee en
  deployde dat vóór de bijbehorende Neon-migratie. Vertak **altijd vanaf `origin/main`**,
  en controleer de PR-diff op bestandsaantal vóór de merge — niet alleen wat je zelf staged.
- **Goed**: de `session-guard` blokkeerde een tweede branch-mutatie. Hij beschermt
  eenrichting (HEAD/branch, niet `gh pr merge`) en laat pas na 15 minuten los. Een sessie
  die "dicht" lijkt kan de lock nog vasthouden — check `.claude-session.lock`.
- Na commits van een andere sessie: **`npx prisma generate`**. Schemawijzigingen laten je
  gegenereerde client achter en `tsc` faalt dan op bestanden die je niet aanraakte.

---

## Zie ook

- [`roadmap.md`](roadmap.md) — volledige Now/Next/Later met fasering
- [`docs/changelog.md`](docs/changelog.md) — wat is gebouwd (#469 en doorlopend)
- [`gotchas.md`](gotchas.md) — lessons learned, lees bij elke sessie
- [`CLAUDE.md`](CLAUDE.md) — runtime context + werkregels
- [`PATTERNS.md`](PATTERNS.md) — verplichte UI-primitives
- [`docs/adr/`](docs/adr/) — architecturale beslissingen
- [`docs/playbooks/working-flow.md`](docs/playbooks/working-flow.md) — operating manual
