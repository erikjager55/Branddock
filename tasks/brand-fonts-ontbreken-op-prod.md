---
id: brand-fonts-ontbreken-op-prod
title: Geen enkel merk op productie heeft een fontbestand — alles rendert in Inter
fase: post-launch
priority: next
effort: 2-4 uur code + per merk ~15 min upload (afhankelijk van licenties)
owner: claude-code + user (licenties + bestanden)
status: open
created: 2026-08-18
completed:
related-adr: docs/adr/2026-06-05-typography-font-canonicalization.md
related-spec: -
worktree: branddock-font-ruis  # 2026-08-20
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

- [~] Per merk op prod vastgelegd — **deels, per besluit 19-08**: de Adobe-kit-route is
      expliciet afgewezen door Erik (11 fonts). De 18 `COMMERCIAL`-fonts blijven open;
      de 15 `GOOGLE_FONTS` hadden nooit een probleem.
- [ ] Minstens één merk toont in de Typography-tab de échte merkfont (geen substituut-melding)
- [x] Een gedetecteerde font zonder bestand telt mee in de merk-gereedheid/`dataQuality` —
      ✅ 2026-08-18 (spoor B). `substitutedFontItems()` in
      `src/features/brandstyle/utils/data-quality.ts` beslist op het **renderplan**
      (`resolveFontRender`), niet op `fileUrl` — precies het onderscheid dat hierboven
      misging. Spiegelt ook de extra tak van de Typography-tab, waar een font zónder
      `availability` alsnog de echte Google Font laadt. Bewijs:
      `npm run smoke:brand-font-substitutes` **13/13** inclusief mutatietest: de naïeve
      `fileUrl`-telling geeft 44 waar de echte functie er 29 geeft — zouden die gelijk zijn,
      dan meet de smoke niets.
- [ ] Her-run van `scripts/dev/storage-url-audit.ts` op prod toont een niet-leeg
      `StyleguideFont.fileUrl`
- [ ] `npx tsc --noEmit` 0 errors
- [ ] `npm run lint` 0 errors
- [ ] Smoke-test uitgevoerd — `scripts/dev/typography-tab-browser-smoke.ts` op een merk mét
      een geüpload bestand: de computed `font-family` is dan de merkfont, niet `inter`
- [ ] Documentatie bijgewerkt indien van toepassing

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
