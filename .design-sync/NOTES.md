# design-sync — repo-specifieke aantekeningen (Branddock)

Eerste import: 2026-08-18. Project: `Branddock Design System`
(`6fbe4595-e6ab-4fd3-b630-88e72ea164c8`).

## Vorm en entry

- Dit is de **Next.js-app zelf**, geen gepubliceerd component-package: `private: true`,
  geen `main`/`exports`/`files`, geen `dist/`. Vorm = `package`, geen Storybook.
- **Gebruik altijd een expliciete `--entry` barrel**, nooit de synth-entry op `src/`.
  De synth-entry globt élk `.tsx`-bestand onder de bronroot en trekt dan de complete
  SaaS-app de bundel in. Huidige entry: `src/components/ui/layout/index.ts`.
- Bouwcommando: **geen**. `npm run build` is `prisma generate && next build` en levert
  een Next-app op, geen library-`dist`. Er is dus geen `buildCmd`.

## Waarom `dtsPropsFor` voor élk component

De props-interfaces in `src/components/ui/layout/*.tsx` zijn **niet geëxporteerd**
(`interface PageShellProps` zonder `export`). Zonder build én zonder export vindt de
extractor niets en emit hij `[key: string]: unknown` — waardeloos voor de design-agent,
want dát is wat hij leest om de API te leren. Alle contracten staan daarom handmatig in
`config.json` onder `dtsPropsFor`, met lokale types uitgeschreven (`MaxWidth`,
`WizardStep`, `ModuleKey` als volledige unie van 20 modulenamen).

⚠️ **Bij elke prop-wijziging in de bron moet `dtsPropsFor` mee.** Er is geen automatische
koppeling; de config rot stil als niemand hem bijwerkt.

## De barrel-val (opgelost, maar let op bij uitbreiding)

`FilterBar` haalde `SearchInput` op via `@/components/shared` (de barrel). Die
re-exporteert `OptimizedImage` → `next/image` → Next-internals met kale `process.env.*`.
Gevolg: de bundel crashte bij evaluatie (`process is not defined`), `window.BranddockDS`
bleef leeg en de render-check gaf 0/12.

Gemeten na één directe import (`@/components/shared/SearchInput`):
bundel 404 KB → 155 KB, inlined npm-packages 13 → 3, `process.env`-refs 8 → 0,
render-check 0/12 → 11/12 schoon.

⚠️ **Verwacht dit opnieuw bij het uitbreiden naar `src/components/shared/`.**
`OptimizedImage` staat daar zelf in scope en is een `next/image`-wrapper; die kan
in Claude Design niet echt renderen. Waarschijnlijk uitsluiten via
`componentSrcMap: {"OptimizedImage": null}` plus een entry die hem niet aantrekt.
`lib/bundle.mjs` forken is **geen** optie — dat bestand is in de converter gemarkeerd
als app-contractlaag die niet bewerkt hoort te worden.

## Purge-val in previews (Tailwind 4)

`src/index.css` is gecompileerde, gecommitte output. Van de 20 `MODULE_GRADIENTS` zijn er
**4 niet volledig aanwezig** in die CSS — dit raakt de échte app, niet alleen de previews:

| module | ontbreekt |
|---|---|
| `competitors` | `from-red-500` én `to-rose-600` (geen gradient) |
| `settings` | `from-gray-500` én `to-gray-600` (geen gradient) |
| `trend-radar` | `from-primary-500` (bestaat niet als klasse; alleen `to-` werkt) |
| `ai-trainer` | `from-cyan-500` (alleen `to-` werkt) |

Previews gebruiken daarom bewust modules met een wérkende gradient. Een kaart hoort het
component op zijn best te tonen, niet per ongeluk een app-bug te documenteren.

⚠️ **Controleer klassenaanwezigheid mét escaping.** Tailwind schrijft arbitraire waarden
geëscaped weg (`.from-\[\#1FD1B2\]`), dus een kale tekstvergelijking op `from-[#1FD1B2]`
geeft valse "ontbreekt"-treffers. Strip eerst de backslashes uit de CSS. Een eerste,
niet-ontsnapte check meldde 10 kapotte gradiënten; de echte uitkomst is 4.

### Tweede purge-vondst: `GradientBanner height="lg"` rendert nul hoog

`HEIGHT_MAP.lg` is `h-48`, en **`h-48` staat niet in `src/index.css`** (`h-24` en `h-32`
wel). De `lg`-variant heeft daardoor geen hoogte — in de preview én in de app. De
preview-cel voor `lg` is daarom vervangen; een kaart hoort geen kapotte variant te tonen.

⚠️ Zolang dit niet gedicht is, is `height="lg"` onbruikbaar terwijl het contract hem
wel aanbiedt.

### Purge-fixes doorgevoerd (branch `feat/design-sync-layout`, 2026-08-18)

`src/index.css` heeft een gemarkeerd blok gekregen met de zes utilities die alleen via
`design-tokens.ts` worden samengesteld en die Tailwind daarom wegsnoeide: `h-48`,
`from-red-500`, `to-rose-600`, `from-gray-500`, `to-gray-600`, `from-cyan-500`.
Daarnaast is `MODULE_GRADIENTS['trend-radar'].from` van `from-primary-500` (bestaat niet)
naar `from-teal-500` gezet.

Geverifieerd na de fix: module-gradienten **20/20 volledig** (was 16/20), en
`GradientBanner height="lg"` rendert visueel aantoonbaar hoger dan `md` en `sm`.

⚠️ **De geuploade bundel is gebouwd op main VOOR deze fix.** De `lg`-cel is daarom
bewust uit `previews/GradientBanner.tsx` gelaten. Zodra deze branch gemerged is, hoort een
re-sync die cel terug te zetten — dan klopt hij wel.

### ⚠️ Groter, NIET gefixt: er is geen `primary`-kleurschaal

Tijdens de fix bleek dat de app **26 verschillende `primary-<cijfer>`-utilityklassen**
gebruikt die geen van alle bestaan. Dit is geen purge maar een ontbrekende configuratie:
er is geen `tailwind.config.*` (Tailwind 4 CSS-first) en `src/index.css` definieert geen
enkele `--color-primary-<n>`. Alleen het kale token werkt: `bg-primary`, `text-primary`,
`border-primary`, `ring-primary`, `from-primary`, `to-primary`, `text-primary-foreground`.

Meest gebruikt van de inerte klassen: `text-primary-700` (46 bestanden), `bg-primary-50`
(39), `ring-primary-500` (27), `bg-primary-100` (16), `border-primary-400` (15),
`border-primary-200` (14), `ring-primary-400` (14), `text-primary-500` (13).

Bewust niet aangeraakt: dit vraagt een ontwerpbesluit (een echte tint/shade-ramp vanaf
`#1FD1B2` definieren, of ~100 bestanden omschrijven naar het kale token). Beslissing ligt
bij Erik.

### Wat GEEN bug bleek

`StatGrid columns={4}` rendert in de kaart als 2×2. Dat is correct responsief gedrag:
`cols4` = `grid-cols-1 md:grid-cols-2 lg:grid-cols-4`, en de reviewkaart is smaller dan
de `lg`-breakpoint. Niet achterna jagen.

## Overig

- `[TOKENS_MISSING]` noemt `--radix-*`-variabelen: die zet Radix at runtime, verwacht afwezig.
- `[FONT_REMOTE]` "Inter": remote font-host `@import`, laadt at runtime. Geen actie.
- Losse tsc-fout in `.next/dev/types/validator.ts` (gegenereerd, 15-08) verwijst naar een
  verwijderde route. Pre-existing, los van deze sync.

## Re-sync risico's

- **`dtsPropsFor` is een handgeschreven kopie van de bron.** Wijzigt een prop, dan klopt
  het contract stil niet meer. Dit is de grootste stille-verval-bron van deze config.
- **De entry is één barrel.** Komt er een layout-primitive bij die niet in
  `src/components/ui/layout/index.ts` staat, dan mist hij zonder foutmelding.
- **De FilterBar-importfix staat los in de working tree** (bewuste keuze van Erik,
  2026-08-18) — niet gecommit. Raakt die verloren, dan breekt de bundel opnieuw.
- **Scope is nu 12 van 78.** `ui/` (40) en `shared/` (26) zijn nog niet gesynct.
