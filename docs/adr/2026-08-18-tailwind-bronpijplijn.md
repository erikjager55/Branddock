---
id: 2026-08-18-tailwind-bronpijplijn
title: src/index.css van bevroren artefact naar echte Tailwind-bron
status: accepted
date: 2026-08-18
supersedes: -
superseded-by: -
---

# Context

`src/index.css` is de enige stylesheet die de app laadt (`src/app/layout.tsx:3`). Het is
**10.555 regels gecompileerde Tailwind-output die als bronbestand in git staat**: het opent met
`/*! tailwindcss v4.1.3 */` en bevat **geen `@import "tailwindcss"` en geen `@theme`**. De enige
`@import` is Google Fonts.

`postcss.config.mjs` draait wel `@tailwindcss/postcss`, maar zonder die directives valt er niets
te genereren en laat de plugin het bestand ongemoeid passeren. **Er wordt dus nooit iets
bijgegenereerd.** Elke utility-klasse die na het compileermoment in de code komt bestaat
simpelweg niet — stil, zonder build-fout, zonder waarschuwing.

## Dit is geen theoretisch risico; het is de dominante bugklasse van deze repo

Het bestand bevat drie losse `@layer utilities`-blokken (regels 10364, 10417, 10468) die
niets anders zijn dan een **archief van handmatige reparaties**, elk met een commentaar dat
een productiebug beschrijft:

- `z-20` ontbrak → de Claw history-popover (z-20) rende onder zijn eigen scrim (z-10), rijen
  onklikbaar. Gevonden via een regressie-smoke op 2026-07-06.
- `grid-cols-12` / `col-span-12` ontbraken → de 12-koloms layout van `BrandVoiceguidePage` en
  `MediaCardList` viel om.
- `order-1` / `order-2` ontbraken → mobiele volgorde in `HowItWorks` klopte niet.
- Zeven `bg-teal-*`, `border-emerald-100`, `ring-amber-100`, `resize-y`, `break-words` …

Daar komen de bekende gotchas bij: `min-h-0`, de EmptyState-knop (`bg-emerald-500`, wit op
transparant), en op 2026-08-18 vier kapotte `MODULE_GRADIENTS` (PR #318). Telkens dezelfde
oorzaak, telkens los gerepareerd, telkens beschreven als "Tailwind purge" — wat de diagnose
actief in de verkeerde richting stuurde. Er wordt niets weggesnoeid; er komt alleen nooit
iets bij.

## De meting

Guard `npm run smoke:css-utilities` (nieuw) scant 2727 bronbestanden op kleur-utilities in
zeven families en toetst elke klasse tegen `src/index.css`:

| | |
|---|---|
| Unieke kleur-utilities in gebruik | 846 |
| **Zonder definitie in `src/index.css`** | **366** |
| Waarvan `dark:` (dood — geen dark-mode geconfigureerd) | 8 |
| **Levend kapot** | **358**, over 1.303 bestand-voorkomens |

Verdeeld over 21 kleurfamilies: `emerald` 46 · `primary` 45 · `gray` 41 · `amber` 33 ·
`violet` 25 · `teal` 25 · `red` 22 · … Vier families (`stone`, `sky`, `lime`, `fuchsia`)
bestaan in het geheel niet. Zwaarste treffers: `hover:text-gray-600` (70 bestanden),
`hover:text-red-500` (43), `bg-primary-50` (33, rendert niets), `bg-emerald-500` (30).

## Het experiment dat de beslissing droeg

Een échte build gedraaid (`@tailwindcss/postcss`, dezelfde pijplijn als Next) met
`@import "tailwindcss"` en de bron gescand, daarna via de PostCSS-AST vergeleken met het
gecommitte bestand:

| | |
|---|---|
| Baseline ontbrekend | 366 |
| **Automatisch opgelost door een verse build** | **321** |
| Blijft ontbreken | **45 — exact en uitsluitend de `primary`-familie** |

Die 45 zijn verklaarbaar: `primary` is geen Tailwind-kleur en heeft geen `--color-primary-*`
in een `@theme`. Zonder die definitie kán geen build ze maken; dat werk zit in élke optie.

Andersom reproduceert een verse build 344 selectors uit het gecommitte bestand niet. Maar:

| | |
|---|---|
| **Dood** (niemand gebruikt ze nog) | **182** — verliezen is winst |
| **Echt migratiewerk** | **162** |

En die 162 vallen samen in vier groepen: **119 semantische theme-tokens** (`bg-background`,
`bg-muted`, `text-foreground`, `border-destructive` …), 28 arbitrary/`data-[…]`-varianten die
grotendeels van diezelfde tokens afhangen, 5 animatieklassen, en 10 overig waarvan een deel
vals alarm (`dark` en `group` zijn markers, geen utilities).

Cruciaal: de CSS-variabelen `--background`, `--foreground`, `--card`, `--muted`,
`--destructive` **bestaan al** in het `:root`-blok. Ze worden alleen nooit aan Tailwind
blootgesteld. Eén `@theme`-blok dat ze mapt regenereert alle 119. Het patroon staat er zelfs
al — `--color-primary: var(--primary)` — het is nooit afgemaakt: één stap, en alleen voor
`primary`.

# Beslissing

**`src/index.css` wordt een echte Tailwind-bron in plaats van een gecommit artefact.**

Het bestand gaat van ~10.555 regels gegenereerde output naar een bronbestand met:

1. de Google-Fonts-`@import` en `@import "tailwindcss"`;
2. een **`@theme`-blok** dat de bestaande semantische CSS-variabelen aan Tailwind koppelt
   (`--color-background: var(--background)` enz.) en een **`--color-primary-50…900`-ramp**
   toevoegt die op stap 400 exact `#1FD1B2` raakt — de merkkleur zit qua lichtheid op
   `teal-400` (`oklch(0.771 0.139 176.4)` vs `oklch(0.777 …)`), niet op `teal-500`;
3. de bestaande `:root`- en `.dark`-variabelenblokken, ongewijzigd;
4. de handgeschreven `@layer components`-klassen (`.card-consistent`, `.btn-consistent`,
   `.input-consistent`, `.badge-consistent`) en de `@media print`-regels;
5. géén van de drie reparatie-`@layer utilities`-blokken — die worden voortaan gegenereerd.

De build genereert de utilities bij elke `next build`. De guard
`npm run smoke:css-utilities --strict` met een **lege** baseline is de acceptatietest: elke
klasse die de code gebruikt moet in de output zitten, anders valt de CI-gate om.

# Overwogen alternatieven

**B — alle 358 ontbrekende klassen genereren en onderaan appenden.** Voorspelbaar en snel,
model blijft bevroren. Afgewezen omdat het het probleem bevriest in plaats van oplost: de
359e klasse is een kwestie van tijd, en het is aantoonbaar weggegooid werk — 321 van de 358
worden door een build gratis opgelost, en de appends zouden landen in een bestand dat deze
beslissing grotendeels weggooit. Het bestand bevat al drie generaties van precies deze
oplossing; dat patroon nog eens herhalen is het bewijs dat het niet werkt.

**C — alleen de `primary`-ramp (45 klassen).** De oorspronkelijke taakscope. Lost 13% op en
laat 313 kapotte klassen staan. Afgewezen zodra de meting liet zien dat `primary` één familie
van 21 is.

**Niets doen.** Afgewezen: de kosten zijn al betaald in vier gedocumenteerde productiebugs en
lopen door.

# Consequenties

**Positief**
- Alle 366 ontbrekende klassen verdwijnen; 182 dode klassen verdwijnen uit de output.
- De klasse fout houdt op te bestaan: nieuwe utilities worden voortaan gegenereerd.
- `src/index.css` gaat van 10.555 regels naar enkele honderden — reviewbaar, en niet langer
  een bestand waar elke parallelle sessie op botst (het was op 2026-08-18 twee keer een
  conflictbron).
- De term "purge" verdwijnt uit de documentatie; die stuurde de diagnose verkeerd.

**Negatief / risico**
- **Eenmalige visuele regressie mogelijk.** Een verse build produceert onvermijdelijk een
  iets andere CSS. De guard bewijst dekking, niet uiterlijk; een visuele ronde vóór de merge
  is verplicht.
- **Versiegat.** Het gecommitte bestand is gebouwd met Tailwind 4.1.3, geïnstalleerd staat
  4.3.0. Een deel van het verschil komt daarvandaan, niet van deze wijziging.
- **De 182 "dode" klassen zijn bepaald met een tekstzoekactie.** Een dynamisch samengestelde
  klassenaam kan daaraan ontsnappen; steekproef vereist.
- **Buildtijd** stijgt licht, want de CSS wordt nu daadwerkelijk gegenereerd.
- **De `@theme`-koppeling moet onderhouden worden**: een nieuwe semantische variabele in
  `:root` werkt pas als hij ook in `@theme` staat. De guard vangt dat.

# Y-statement

In de context van **de app-brede stylesheet**, met de behoefte aan **utilities die
betrouwbaar bestaan wanneer de code ze gebruikt**, hebben we gekozen voor **`src/index.css`
als echte Tailwind-bron met een `@theme`-blok**, en tegen **het bevroren artefact met
handmatige reparaties**, om **een bugklasse te beëindigen die al vier gedocumenteerde
productiebugs en 358 stil kapotte klassen heeft gekost**, met als afweging **een eenmalige
visuele verificatieronde en een licht hogere buildtijd**.
