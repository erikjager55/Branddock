---
id: brand-fonts-ontbreken-op-prod
title: Geen enkel merk op productie heeft een fontbestand — alles rendert in Inter
fase: post-launch
priority: next
effort: 2-4 uur code + per merk ~15 min upload (afhankelijk van licenties)
owner: claude-code + user (licenties + bestanden)
status: done
created: 2026-08-18
completed: 2026-08-20
related-adr: docs/adr/2026-06-05-typography-font-canonicalization.md
related-spec: -
worktree: -
---

# Probleem

De storage-URL-audit tegen Neon-productie (2026-08-18, `scripts/dev/storage-url-audit.ts`)
laat zien dat `StyleguideFont.fileUrl` **44 van de 44 keer leeg is**. Er staat op productie
dus géén enkel fontbestand.

> ⚠️ **Herzien 2026-08-18 (avond) — de impact hierboven is nagemeten en klopte niet.**
> Een leeg `fileUrl` betekent níet dat er een substituut rendert. Google Fonts laden bij
> Google en hebben nooit een bestand nodig. Gemeten op `branddock-prod`:
>
> | availability | aantal | rendert |
> |---|---|---|
> | `COMMERCIAL` | 18 | ❌ substituut |
> | `ADOBE_FONTS` | 11 | ❌ substituut — **geen enkele workspace heeft een `adobeFontsKitId`** |
> | `GOOGLE_FONTS` | 15 | ✅ de echte font |
>
> **29 van de 44**, niet 44 van de 44. Linfi (3 Google-fonts) heeft nul problemen.
>
> ⛔ **BESLUIT ERIK 2026-08-19: de drie Adobe-kit-id's doen we niet.** Het goedkope pad
> hieronder is dus geen actie meer — het staat er alleen nog als vastlegging van wat er
> gemeten is. De elf `ADOBE_FONTS`-fonts blijven op het metric-substituut renderen, net als
> de achttien `COMMERCIAL`-fonts. Wie dit later heropent: de meting hieronder klopt nog, maar
> controleer 'm opnieuw — hij is van 18-08.
>
> **En er ligt een veel goedkoper pad dan dit task-file aannam.** De elf Adobe-fonts hebben
> geen licentie-upload nodig maar één kit-id per workspace: `better brands` (6 fonts),
> `Branddock` (4) en `Napking` (1). Drie velden invullen repareert 11 van de 29. De echte
> upload-vraag beperkt zich tot de 18 `COMMERCIAL`-fonts, en die zitten bij vijf merken —
> DTS Ede (5), PartnerSelect (5), Zwarthout (3), Nobox (1), sulejman (1) — plus 3 in een
> smoke-testworkspace die je kunt negeren.
>
> De les is de bekende: **de tekst van een taak beschrijft niet de toestand.** Dit item
> leidde zijn impact af uit één kolom.

Gevolg voor de 29: die vallen terug op het metric-substituut. In de Typography-tab staat overal
*"Previewing with Inter — a metric substitute"*, en dat substituut werkt door in méér dan een
preview: de tab zegt het zelf — *"needed for accurate previews, PDF exports, and AI-generated
content"*.

**Dit is geen bug en geen ontbrekende functionaliteit.** Het upload-pad bestaat volledig:
`FontUploadModal.tsx`, `POST /api/brandstyle/fonts`, en daarnaast Adobe-Fonts-kit-ondersteuning
per workspace (`Workspace.adobeFontsKitId`). De D4-fallback doet precies wat hij hoort te doen
en meldt eerlijk dat hij een substituut toont. Het gat is puur: er is nooit iets geüpload.

Waarom het toch opgelost moet worden: we verkopen merkconsistentie. Een klant die zijn eigen
styleguide opent en overal Inter ziet — terwijl er "Neue Haas Grotesk Display" boven staat —
ziet het product zijn eigen belofte niet waarmaken. Bij een demo is dat het eerste wat opvalt.

# Voorstel

Twee sporen, los van elkaar uit te voeren.

**A — de data (jij, per merk).** Voor elk merk met gedetecteerde fonts: óf het `.woff2`-bestand
uploaden, óf een Adobe-Fonts-kit-id op de workspace zetten. Dit vereist een geldige licentie —
zie Open vragen.

**B — de zichtbaarheid (code).** Vandaag moet je pér merk de Typography-tab openen om te zien
dat er niets staat. Er is geen overzicht en geen signaal. Voorstel: het bestaande
`dataQuality`-mechanisme in `BrandOnboardingWizard` (dat al een `tab === "typography"`-filter
heeft) laten meetellen dat een gedetecteerde font zónder bestand een openstaand punt is, zodat
het in de merk-gereedheid opduikt in plaats van onzichtbaar te blijven.

## 🏁 GESLOTEN 2026-08-21 — de cijferreeks was 44 → 29 → 18 → 2 → 0

Erik: *"haal dit van de takenlijst af"*. Het item is afgerond **zonder één geüpload
fontbestand**, en dat is de juiste uitkomst.

**Wat er werkelijk aan de hand was.** Dit item begon als "44 merkfonts missen hun bestand" en
eindigde als drie scraper-bugs. Vier keer werd een aantal overgenomen uit een kolom zonder te
toetsen wát erin stond:

| | claim | wat de meting zei |
|---|---|---|
| 18-08 | 44 van 44 fonts missen een bestand | 29 — Google-fonts hebben er nooit een nodig |
| 19-08 | 29 | 18 — Erik wijst de Adobe-kit-route af |
| 20-08 | 18 te uploaden | hooguit 2 — de rest is systeem-, plugin- en build-ruis |
| 20-08 | 2 | **0** — beide merken krijgen een nieuwe website |

**De drie bugs eronder**, geen van drieën zichtbaar in het oorspronkelijke probleem:
1. `extractFontsFromCss` miste **élke gequote fontnaam** — sinds de eerste implementatie
   (2026-03-05), vijf maanden. De styleguides bevatten daardoor de ongequote fallback-ruis
   en niet de gequote merkfont ervóór.
2. De `@font-face`-regex kapte multi-woord namen af bij de eerste spatie: `Museo` naast
   `Museo Sans 300`, zes keer gemeten.
3. Systeemfonts, plugin-icoonfonts, build-hashes en query-string-payloads passeerden alle
   filters.

**Resultaat na reparatie en re-analyse van elf workspaces**: vier merken hebben nu een
commerciële huisletter die eerder werd gemist — `Museo Sans` (Adullam), `proxima-nova`
(Goed-Bouw), `Avenir Next` (Nobox), `Red Hat Display` (Het Nieuwe Golfen). Zes styleguides
die nul fonts hadden zijn gevuld.

⏭️ **Wat bewust openblijft** (geen taak, alleen vastlegging): die vier commerciële fonts
renderen nog in een substituut tot iemand een bestand uploadt. PartnerSelect en DTS Ede zijn
overgeslagen wegens nieuwe websites. `Red` bij Het Nieuwe Golfen is geen scraper-artefact —
geen enkele CSS-vorm reproduceert het, de site declareert het zelf.

---

## ✅ AFGEROND 2026-08-20 — geen uploads nodig, en er lag een grotere bug onder

**Besluit Erik**: PartnerSelect en DTS Ede krijgen binnenkort een nieuwe website, dus opzoeken
en uploaden is voor beide niet nodig. Daarmee vervalt de **volledige** uploadlijst — de twee
zekere fonts (`Apercu`, `Apercu-Mono`) en beide twijfelgevallen zaten precies bij die twee
merken. Er blijft niets te uploaden.

De taak sluit dus zonder dat er één bestand is geüpload, en dat is de juiste uitkomst: het werk
dat hier lag bestond grotendeels niet.

### ⚠️ Wat er wél uit kwam, en het is groter dan deze taak

Bij het uitzoeken bleek `extractFontsFromCss` **gequote fontnamen volledig te missen**. De
regex sloot het dubbele-quote-teken uit (`[^;}"]+`), waardoor `font-family:"Open Sans"` een
**lege capture** gaf. Dat stond er sinds **2026-03-05**, de eerste implementatie — vijf maanden.

Waarom niemand het zag: enkele quotes en ongequote waarden wérkten wel. De scraper vond dus
netjes de ongequote systeem- en icoonfonts uit de fallback-stack (`SFMono-Regular`, `slick`,
`Geneva`), maar niet de gequote merkfont die eráán voorafging. Het resultaat oogde als een
gevulde fontlijst en was in werkelijkheid de ruis zónder het merk.

Dubbele quotes zijn juist de gangbare vorm in gecompileerde CSS — Tailwind, SCSS-output,
WordPress-thema's. Gerepareerd (één teken uit de character class; `resolveFontFamilyValue`
strípt de quotes al) en vastgelegd in `smoke:font-scraper-ruis` sectie D2, mét de regressie op
enkele quotes én de controle dat gequote rúis nog steeds gefilterd wordt.

⏭️ **Openstaand gevolg voor jou**: elke styleguide die vóór 2026-08-20 is gescrapet kan
merkfonts **missen**, niet alleen ruis bevatten. Een re-analyse (`scripts/rescrape-brand.ts
<merk>`) haalt ze alsnog op. Bewust niet zelf gedraaid: dat is een schrijfactie op productie en
raakt meer dan alleen fonts. Voor PartnerSelect en DTS Ede is het sowieso overbodig — die
worden opnieuw gescrapet zodra hun nieuwe site live staat.

Wat er ná die twee merken aan ruis overblijft: **11 rijen bij vijf workspaces** — better brands
(4), Zwarthout (3), Branddock (2), Nobox (1), sulejman (1). Die verdwijnen bij dezelfde
re-analyse.

## ⚠️ HERZIEN 2026-08-20 — de uploadlijst klopte niet: 18 fonts, hooguit 3 echt

Bij het oppakken van de uploads bleek de lijst zelf het probleem. Van de **18** fonts die op
productie als `COMMERCIAL` ("moet geüpload worden") stonden, zijn er hooguit **drie** een echt
merkfont. De rest is scraper-ruis waarvoor geen bestand bestáát:

| Categorie | Aantal | Voorbeelden | Waar |
|---|---|---|---|
| Systeem-/OS-fonts | 6 | `SFMono-Regular`, `Geneva`, `Droid Sans`, `Bitstream Charter` | Branddock, Zwarthout, better brands, sulejman, DTS Ede |
| Plugin-icoonfonts | 4 | `ETmodules` (Divi), `slick` + `star` (slick-carousel), `DSEG7Classic` | Nobox, Zwarthout, PartnerSelect |
| Build-hashes | 2 | `2cca21a49f7dad…`, `43d730c59dee…` | PartnerSelect |
| Smoke-testworkspace | 3 | `RijksText`, `RijksCyrillicText`, `Rijksmuseum` | Claude Smoke 7 |
| **Echt merkfont** | **2 + 2?** | **`Apercu`**, **`Apercu-Mono`**; twijfel: `HelveticaNeue-Light`, `nexus` | PartnerSelect, DTS Ede |

⚠️ **Dit was géén verouderde data** — de eerste vraag die gesteld is. Zwarthout (06-06),
sulejman (16-07), Nobox (21-07) en Branddock (**17-08**) zijn allemaal ná de filterronde van
2026-06-05 gescrapet en bevatten dezelfde ruis. De filters waren **onvolledig**, niet oud, en
elke nieuwe scrape voegde er weer aan toe.

### Wat er gerepareerd is

`url-scraper.ts` had al drie filters (`GENERIC_FONT_FAMILY_NAMES`, `isWebSafeFallbackFont`,
`isIconFont`) — die zijn uitgebreid met de gemeten gevallen: systeemfonts, Divi/slick/swiper-
icoonfonts, en een hash-patroon (≥16 hex-tekens). `slick` en `star` matchen **exact** in plaats
van als fragment, anders sneuvelen "Slick Display" en "Star Grotesk"; dat is als tegenproef
vastgelegd.

Bewaakt door `npm run smoke:font-scraper-ruis` (**24/24**), waarin elke assertie een gemeten
productie-vindplaats is. Draagt een tegenproef — echte merkfonts blijven staan — zodat een
filter dat álles weggooit niet groen kan zijn. Mutatietest: één regel uit de systeemfont-lijst
halen geeft exit 1.

### ⏭️ Wat er nu van jou wordt gevraagd — en dat is veel minder

**Zeker uploaden (2):** `Apercu` en `Apercu-Mono` voor **PartnerSelect**. Dat is een echt
commercieel merkfont (Colophon Foundry) en vraagt een licentie-afweging.

**Eerst beslissen (2), bij DTS Ede:**
- `HelveticaNeue-Light` — ik heb hem als systeemfont gefilterd, maar Helvetica Neue ís een
  commercieel merkfont. Is dit DTS Ede's bedoelde huisletter of een CSS-fallback? Als het de
  huisletter is, hoort hij uit de systeemfont-lijst.
- `nexus` — kan Martin Majoors *Nexus* zijn (commercieel) of themaruis. Lowercase suggereert
  ruis, maar dat is een aanwijzing, geen bewijs.

**Niets doen voor de overige 14.** Daar bestaat geen fontbestand van; die horen uit de
styleguide te verdwijnen, niet gevuld te worden.

### Nog niet gedaan: de bestaande rijen opruimen

De filterfix voorkomt nieuwe ruis maar raakt de 14 bestaande rijen niet. Die verdwijnen bij een
re-analyse van het betreffende merk (`scripts/rescrape-brand.ts <merk>`), of via een gerichte
opruimquery. Bewust niet zelf uitgevoerd: het is een schrijfactie op productiedata en de
re-analyse raakt méér dan alleen fonts.

# Acceptatiecriteria

- [x] Per merk op prod vastgelegd — ✅ **afgerond 21-08**, al anders dan dit criterium
      bedoelde. De Adobe-kit-route is 19-08 afgewezen (11 fonts), de uploads voor
      PartnerSelect en DTS Ede zijn 20-08 vervallen (nieuwe website), en van de resterende
      `COMMERCIAL`-rijen bleek het merendeel scraper-ruis. Wat er per merk staat is nu
      gemeten en schoon; wat er níet staat is bewust.
- [~] Minstens één merk toont in de Typography-tab de échte merkfont — **deels, en het
      criterium zelf klopte niet**. Voor `GOOGLE_FONTS` was dit altijd al waar (Linfi
      rendert Oranienbaum en Poppins echt), wat dit criterium over het hoofd zag. Voor de
      `COMMERCIAL`-fonts blijft het onwaar zolang er geen bestand is — en dat is nu een
      bewuste keuze, geen openstaand werk.
- [x] Een gedetecteerde font zonder bestand telt mee in de merk-gereedheid/`dataQuality` —
      ✅ 2026-08-18 (spoor B). `substitutedFontItems()` in
      `src/features/brandstyle/utils/data-quality.ts` beslist op het **renderplan**
      (`resolveFontRender`), niet op `fileUrl` — precies het onderscheid dat hierboven
      misging. Spiegelt ook de extra tak van de Typography-tab, waar een font zónder
      `availability` alsnog de echte Google Font laadt. Bewijs:
      `npm run smoke:brand-font-substitutes` **13/13** inclusief mutatietest: de naïeve
      `fileUrl`-telling geeft 44 waar de echte functie er 29 geeft — zouden die gelijk zijn,
      dan meet de smoke niets.
- [~] Her-run van `storage-url-audit.ts` toont een niet-leeg `fileUrl` — **vervallen, niet
      gehaald.** Er is geen enkel bestand geüpload, dus elk `fileUrl` is nog leeg. Dat is de
      uitkomst van Eriks twee besluiten (Adobe-kits niet, PartnerSelect/DTS Ede nieuwe site),
      niet een gemiste stap. Het criterium ging uit van een probleem dat na meting grotendeels
      niet bestond.
- [x] `npx tsc --noEmit` 0 errors — ✅ bij elke PR (#442, #444, #452, #460)
- [x] `npm run lint` 0 errors — ✅ idem
- [~] Smoke-test op een merk mét geüpload bestand — **niet uitvoerbaar**: er ís geen merk met
      een geüpload bestand. In plaats daarvan is de scraper-kant gedekt door
      `smoke:font-scraper-ruis` (**50/50**, elke assertie een gemeten productie-vindplaats)
      plus de bestaande `smoke:brand-font-substitutes` (13/13).
- [x] Documentatie bijgewerkt — ✅ dit bestand, `START_HERE.md` (top-3 en Volgende-lijst
      opgeschoond), `gotchas.md` (twee entries), `docs/changelog.md`

# Bestanden die ik aanraak

- `src/features/brandstyle/components/BrandOnboardingWizard.tsx` — dataQuality-signaal (spoor B)
- `src/features/brandstyle/components/brand-assets/FontsGrid.tsx` — indien het signaal daar
  ook moet landen
- `scripts/dev/typography-tab-browser-smoke.ts` — assertie uitbreiden zodra er een echt
  bestand is om tegen te testen

# Smoke test plan

1. Upload op één merk (lokaal) een `.woff2` via de Fonts-kaart.
2. Draai `SMOKE_WORKSPACE_ID=<dat merk> npx tsx scripts/dev/typography-tab-browser-smoke.ts`.
3. Verwacht: de computed `font-family` is de merkfont in plaats van `inter`, en de
   substituut-melding is weg.

Let op: de smoke asserteert vandaag alléén dat Type Scale en In Context *hetzelfde* renderen.
Dat blijft groen met een substituut — die check bewijst consistentie, niet echtheid. Voor dit
onderwerp is een aparte assertie nodig.

# Risico's

- **Licenties.** `Neue Haas Grotesk Display` en `Suisse Int'l` (Het Nieuwe Golfen) zijn
  commercieel. Een `.woff2` uploaden zonder webfont-licentie is een juridisch probleem, geen
  technisch. De UI labelt ze niet voor niets als *"Commercial — upload"*.
- **Het substituut is soms de juiste uitkomst.** Voor een merk zónder licentie is Inter met een
  eerlijke melding beter dan een 404 of een stille mismatch. Spoor B moet dat kunnen uitdrukken
  ("bewust niet") en niet elk merk eeuwig als incompleet markeren.

# Out of scope

- Fonts automatisch downloaden van de klantsite — dat is precies de licentie-val hierboven.
- De D4-substituut-logica zelf; die werkt en meldt eerlijk wat hij doet.

# Open vragen

1. Voor welke merken hébben we een webfont-licentie? Dat bepaalt of dit een upload-actie is of
   een "bewust niet"-registratie.
2. Is de Adobe-Fonts-kit-route (`Workspace.adobeFontsKitId`) een reëel alternatief voor de
   pilot-merken? Die is al bedraad maar wordt nergens gebruikt.
3. Moet een merk zonder fontbestand een zichtbare waarschuwing krijgen richting de klant, of
   alleen intern in de gereedheids-meting?
