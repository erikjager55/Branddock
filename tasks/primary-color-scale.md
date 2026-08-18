---
id: primary-color-scale
title: index.css van bevroren artefact naar echte Tailwind-bron — 358 kapotte kleurklassen in één keer weg
fase: post-launch
priority: now
effort: guard + ADR + migratie uitgevoerd 18-08; rest is visuele verificatie
owner: claude-code
status: review
created: 2026-08-18
completed: -
related-adr: docs/adr/2026-08-18-tailwind-bronpijplijn.md
related-spec: -
worktree: branddock-primary-color-scale
---

# Probleem

Gevonden op 2026-08-18 als bijvangst van de Claude Design-sync (sessie `branddock-app-f8`).
De oorspronkelijke scope was "de `primary`-schaal ontbreekt". Bij het bouwen van de guard bleek
dat **een symptoom van iets veel breders**.

## De meting

`npm run smoke:css-utilities` scant 2727 bronbestanden op kleur-utilities in zeven families
(`bg text border ring from to via`), zet elke klasse om naar de CSS-selectorvorm die Tailwind
schrijft, en zoekt die op in `src/index.css`:

| | |
|---|---|
| Unieke kleur-utilities in gebruik | **846** |
| Daarvan **zonder definitie** in `src/index.css` | **366** |
| Waarvan `dark:`-varianten (dood — geen dark-mode geconfigureerd) | 8 |
| **Levend kapot** | **358** |
| Bestand-voorkomens van de levende set | **1.303** |

Verdeeld over 21 kleurfamilies. `primary` is niet eens de grootste:

```
emerald 46 · primary 45 · gray 41 · amber 33 · violet 25 · teal 25 · red 22
purple 19 · blue 18 · rose 17 · green 14 · indigo 13 · cyan 12 · slate 9
stone 6 · orange 5 · yellow 5 · sky 5 · pink 3 · lime 2 · fuchsia 1
```

De zwaarste individuele treffers:

| klasse | bestanden | effect |
|---|---|---|
| `hover:text-gray-600` | 70 | hover-kleur blijft ongewijzigd |
| `hover:text-red-500` | 43 | idem, op verwijder-acties |
| `bg-primary-50` | 33 | **rendert niets** — vlak blijft transparant |
| `text-primary-700` | 32 | erft ouderkleur |
| `bg-emerald-500` | 30 | **rendert niets** — dit is de gedocumenteerde EmptyState-knopbug, nog steeds levend |
| `focus:ring-primary-500` | 26 | focusring valt terug op `currentcolor` |
| `focus:ring-emerald-500` | 22 | idem |

Vier kleurfamilies bestaan **helemaal niet** in de gecompileerde CSS (`stone`, `sky`, `lime`,
`fuchsia` — 0 `--color-*`-definities), dus daar is élk gebruik dood.

Illustratief voor het patroon: `.text-gray-600` bestaat wél, `.hover\:text-gray-600:hover`
niet — terwijl `hover:text-gray-700`, `-800` en `-900` er wél staan. Het is geen systematische
uitsluiting maar **momentopname-drift**: wat op het compileer-moment in gebruik was staat erin,
alles wat daarna is bijgekomen niet.

## De oorzaak

`src/index.css` is **bevroren gecompileerde output** (10.500 regels, opent met
`/*! tailwindcss v4.1.3 */`). Het bevat **geen `@theme` en geen `@import "tailwindcss"`** — de
enige `@import` is Google Fonts. `postcss.config.mjs` draait wel `@tailwindcss/postcss`, maar
zonder die directives valt er niets te genereren en laat de plugin het bestand passeren.
`src/app/layout.tsx:3` importeert dit bestand als enige stylesheet.

Er wordt dus **nooit iets bijgegenereerd**. Elke klasse die na het compileer-moment in de code
komt bestaat simpelweg niet, stil, zonder build-fout. Dat is de gedeelde oorzaak van élke
"purge"-gotcha in deze repo — `min-h-0`, de EmptyState-knop, de vier kapotte `MODULE_GRADIENTS`
van 18-08, en deze 358. De term "purge" in eerdere documentatie is misleidend: er wordt niets
weggesnoeid, er komt alleen nooit iets bij.

## Twee dode bestanden die actief misleiden

`src/styles/globals.css` en `src/styles/design-system.css` worden **nergens geïmporteerd**.
`globals.css` definieert bovendien `--primary: #0D9488` — een ándere kleur dan de levende
`#1fd1b2`. Wie daar de merkkleur aanpast verandert niets.

## Waar de merkkleur zit

| kleur | hex | OKLCH |
|---|---|---|
| `--primary` (app) | `#1FD1B2` | `oklch(0.771 0.139 176.4)` |
| `teal-400` | — | `oklch(0.777 0.152 181.9)` |
| `teal-500` | — | `oklch(0.704 0.140 182.5)` |

De merkkleur zit qua lichtheid op **`teal-400`, niet `teal-500`**. Wie `primary-500` naïef op
`teal-500` afbeeldt maakt élk accent donkerder dan het merk. (Sessie `branddock-app-f8` heeft
`trend-radar` op grond hiervan op `from-teal-400` gezet — PR #318.)

# Voorstel

**Fase 1 — de guard. ✅ AF.** `scripts/smoke-tests/css-utilities.ts` +
`npm run smoke:css-utilities`. Werkt met een baseline (`css-utilities-baseline.json`, nu 366
bekende gevallen), zodat hij vandaag al als CI-gate kan draaien: hij faalt op **nieuwe** drift
terwijl de achterstand apart wordt weggewerkt. `--strict` faalt op alles — dat is de eindstand
zodra de baseline leeg is. Gekalibreerd met een mutatietest (zie Smoke test plan).

**Fase 2 — optie A gekozen en uitgevoerd (18-08).** Het experiment besliste: een echte
build lost 321 van de 366 vanzelf op, de resterende 45 zijn de `primary`-ramp die in elk
scenario gedefinieerd moet worden, en van de 344 niet-reproduceerbare selectors is 182 dood
en valt de rest samen in één `@theme`-blok. Optie B zou 358 klassen appenden aan een bestand
dat A grotendeels weggooit.

`src/index.css` is nu **320 regels bron** in plaats van 10.555 regels artefact:
`@import "tailwindcss"` + `@import "tw-animate-css"` + een `@theme inline`-blok (primary-ramp
met stap 400 == `var(--primary)`, plus 40 semantische tokens) + de bestaande `:root`/`.dark`
variabelen + de vier `@layer components`-klassen + de WebKit-scrollbar-regels + `@media print`.

# Acceptatiecriteria

Fase 1 (af):
- [x] `npm run smoke:css-utilities` bestaat en draait groen
- [x] Guard is **aantoonbaar in staat te falen**: definitie van `.text-gray-600` verwijderd →
      exit 1, klasse bij naam genoemd met 312 bestanden; na herstel weer exit 0 en het bestand
      byte-identiek (les 2026-08-18 — een check die niets vindt is pas bewijs als je 'm hebt
      laten falen)
- [x] `npx tsc --noEmit` 0 errors
- [x] `npm run lint` (eslint op het nieuwe bestand) 0 errors

Fase 2 (uitgevoerd 18-08):
- [x] Experiment gedraaid: verse Tailwind-build vs gecommitte `index.css` via de PostCSS-AST.
      321 van de 366 automatisch opgelost; 45 resteerden = exact de `primary`-familie. Van de
      344 niet-reproduceerbare selectors: 182 dood, 162 migratiewerk, waarvan 119 semantische
      tokens die één `@theme`-blok oplost
- [x] Scope-keuze **A** vastgelegd in `docs/adr/2026-08-18-tailwind-bronpijplijn.md`
- [x] `src/index.css` is een bron van 320 regels (was 10.555); baseline van 366 → **0**
- [x] Guard herbouwd: toetst nu de **gegenereerde** CSS i.p.v. de bron — na de migratie is
      `index.css` immers geen output meer. Opnieuw gekalibreerd: `--color-primary-500` uit het
      `@theme`-blok gehaald → exit 1 met precies 9 geraakte klassen en hun vindplaatsen;
      na herstel exit 0 en het bestand byte-identiek
- [x] Guard toegevoegd aan `.github/workflows/ci.yml` (na de lint-stap, `--strict`)
- [x] `src/styles/globals.css` + `design-system.css` gemarkeerd als dood met een kopregel die
      naar `src/index.css` verwijst (bewust gemarkeerd i.p.v. verwijderd)
- [x] **Echte `next build` geslaagd** (exit 0): CSS-bundle 262 kB, met `bg-primary-50`,
      `bg-emerald-500`, `z-20`, `grid-cols-12`, `card-consistent`,
      `.scrollbar-thin::-webkit-scrollbar`, `.focus\:ring-primary-500` en `#1fd1b2` erin —
      plus `from-red-500` en `h-48`, die PR #318 nog met de hand toevoegt
- [x] `npx tsc --noEmit` 0 errors · `npm run lint` 0 errors (965 pre-existing warnings)

Nog open:
- [x] **Visuele ronde gedaan** (Playwright, lokale prod-build vs. live productie, zelfde
      routes `/` en `/marketing`):
      - **Focusring op een invoerveld gemeten in de browser**: oud `rgb(31, 41, 55)`
        (`#1f2937` = `--foreground`, de `currentcolor`-terugval), nieuw
        `oklab(0.771417 -0.138875 0.00867277)` = **`#1fd1b2`**, exact de merkkleur.
      - **Selector-aanwezigheid in de geladen CSS**: nieuw 2841/2895 selectors met
        `bg-primary-50`, `bg-primary-100`, `focus:ring-primary-500`, `bg-emerald-500`,
        `hover:text-gray-600` en `text-primary-700` allemaal aanwezig; oud mist alle zes.
        `z-20` en `grid-cols-12` zitten in béíde — dat waren de handmatige reparaties, wat
        het beeld intern consistent maakt.
      - **Rendering**: `/marketing` rendert volledig in beide (mozaïek, gradiënten,
        typografie, nav, knoppen). De verschillen die je ziet zijn marketing-copy van
        recentere commits, geen opmaakverlies.
      - ⚠️ Meetfout onderweg, het vermelden waard: de eerste versie van de check telde 203
        i.p.v. 2841 selectors en meldde vals ✗. Oorzaak: Tailwind 4 wikkelt álle output in
        `@layer`, dus een lus over `sheet.cssRules` ziet `CSSLayerBlockRule`-containers zonder
        `selectorText`. Recursief afdalen was nodig.
      - Niet gedekt: de shadcn-achtige componenten (dialog/popover/tooltip) zitten achter
        login en zijn dus niet in het klikpad meegenomen. Hun animaties komen nu uit
        `tw-animate-css`; de klassen zijn aantoonbaar aanwezig, het gedrag niet visueel getoetst.
- [x] **Gerebased op `091b7c3a`** en gepusht als PR #323 — CI groen (`check` 7m51s,
      `e2e` 3m3s), `MERGEABLE CLEAN`. Merge-volgorde met #318 maakt niet meer uit; hun
      CSS-append is overbodig geworden (`from-red-500` en `h-48` worden nu gegenereerd),
      hun `design-tokens.ts`- en `FilterBar.tsx`-wijzigingen blijven nodig
- [x] `gotchas.md`-entries in een eigen doc-PR (#324), gemaakt via de Git Data API zonder
      worktree — plus een tweede entry over de 46 task-files die PR #286 en passant herschreef

# Bestanden die ik aanraak

- `scripts/smoke-tests/css-utilities.ts` — nieuw ✅
- `scripts/smoke-tests/css-utilities-baseline.json` — nieuw ✅
- `package.json` — één script-regel ✅
- `.github/workflows/ci.yml` — guard na de lint-stap ✅
- `src/index.css` — volledig vervangen door de bron ✅
- `src/styles/globals.css`, `src/styles/design-system.css` — gemarkeerd als dood ✅
- `package.json` + `package-lock.json` — `tw-animate-css` toegevoegd ✅ (levert de
  animatie-utilities die shadcn-achtige componenten gebruiken; die kwamen uit een plugin
  die ooit uit de dependencies is verdwenen terwijl het artefact ze bevroren hield)

# Bestanden die ik NIET aanraak

- `src/lib/constants/design-tokens.ts` en `src/components/ui/layout/*` — sessie
  `branddock-app-f8`, PR #318
- `src/app/layout.tsx` — sessie `branddock-app-47` (`static-rendering-regressie`)
- `gotchas.md`, `START_HERE.md`, `roadmap.md`, `docs/changelog.md`,
  `tasks/open-acties-2026-07-23.md`, `tasks/lp-review-followups.md` — sessie `branddock-app-da`
  gebruikt deze als merge-resolutie
- De 1.303 gebruiksplekken zelf — de klassen worden gedefinieerd, niet herschreven. Een
  zoek-vervang daarover is een andere taak met een ander risicoprofiel.

# Smoke test plan

1. `npm run smoke:css-utilities` → groen, meldt het aantal bekende baseline-gevallen.
2. **Kalibratie**: verwijder één bestaande definitie uit `src/index.css`
   (`perl -0pi -e 's/\n\s*\.text-gray-600\s*\{[^}]*\}//' src/index.css`) → guard moet exit 1
   geven en de klasse bij naam noemen. Herstel en controleer dat het bestand byte-identiek is.
3. `npm run smoke:css-utilities -- --report` → volledige lijst met `[NIEUW ]`/`[bekend]`.
4. `npm run smoke:css-utilities -- --strict` → faalt zolang de achterstand bestaat (verwacht).
5. Na fase 2: `npm run dev`, focus op een invoerveld geeft een **merkgroene** ring; een
   `bg-primary-50`-badge is zichtbaar getint in plaats van transparant.

# Risico's

- **`src/index.css` botst met PR #318** (sessie `branddock-app-f8` appendt vijf gradient-
  klassen onderaan hetzelfde bestand). Fase 1 raakt `index.css` niet, dus dit speelt pas bij
  fase 2. **#318 eerst laten landen.** Die sessie kan geen seintje garanderen (Erik drukt op
  de merge-knop), dus pollen: `gh pr view 318 --json state`.
- **`package.json` is in handen van sessie `branddock-app-da`** als merge-resolutie. De
  toevoeging is één regel onderaan de scripts-lijst — dat mergde 18-08 twee keer vanzelf.
- **Optie A kan een brede visuele regressie geven.** Daarom het experiment vóór de keuze, en
  een ADR vóór de uitvoering.
- **De guard kan te breed worden.** Bewust beperkt tot zeven kleurfamilies met een
  cijferschaal; niet-kleur-utilities en dynamisch samengestelde klassen blijven buiten beeld.
  Dat is een bewuste ondergrens, geen volledigheid — `min-h-0` zou hij bijvoorbeeld níét vangen.

# Out of scope

- **De 1.303 gebruiksplekken herschrijven** naar bestaande klassen.
- **De marketing-site** (`src/app/marketing/marketing.css`, `--primary: #07E5AB`). Bewust een
  andere kleur; die file bevat alleen eigen `.mkt-*`-klassen, geen Tailwind-utilities.
- **Niet-kleur-utilities** (`min-h-0`, spacing, typografie). Zelfde oorzaak, andere meting —
  verdient een eigen uitbreiding van de guard zodra de kleur-set schoon is.
- **De vier kapotte `MODULE_GRADIENTS`** — opgelost in PR #318.

# Notes

- Guard-ontwerp: klassen worden vergeleken op hun **volledige token inclusief variant**
  (`focus:ring-primary-500` → selector `.focus\:ring-primary-500`). Dat is nodig omdat de
  gecompileerde CSS varianten apart opslaat: `.ring-teal-500` bestaat, maar
  `.focus\:ring-teal-500:focus` is een aparte regel. Een check op alleen de basis-utility zou
  143 van de 358 gevallen missen.
- OKLCH-conversie met een eigen sRGB→OKLab-script (D65, Björn Ottosson-matrices).
- Bron van de vondst: `.design-sync/NOTES.md` in `branddock-design-sync-layout`. Die sessie
  mat 27 klassen / 495 voorkomens / 113 bestanden voor `primary`; mijn hermeting gaf 29 / 497 /
  113. Marginaal verschil, immaterieel — beide staan in PR #318 vermeld.
