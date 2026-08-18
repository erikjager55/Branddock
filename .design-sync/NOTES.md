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

## De CSS-pijplijn (stand na PR #323, 2026-08-18)

Tot 18-08 was `src/index.css` een **bevroren artefact** van 10.555 regels zonder
`@import "tailwindcss"` en zonder `@theme`. `@tailwindcss/postcss` genereerde er dus
niets en liet het bestand passeren: elke utility die na het compileermoment in de code
kwam bestond simpelweg niet — stil, zonder build-fout. Dat is wat deze sync aan het licht
bracht (vier module-gradienten en `h-48`), en wat in PR #323 tot de wortel is aangepakt:
`index.css` is nu 320 regels **bron** met een echte `@theme inline`-ramp.

⚠️ **Gevolg voor de sync, en het is fataal als je het mist.** `cfg.cssEntry` wordt
onveranderd naar het Design System-project gekopieerd; een browser krijgt dat bestand
rechtstreeks. Een bronbestand met `@import "tailwindcss"` kan de browser niet oplossen,
en dan rendert **elke preview en elk gebouwd ontwerp ongestyled** — zonder foutmelding.

Daarom draait `.design-sync/compile-css.mjs` vóór elke build:

```
node .design-sync/compile-css.mjs        # src/index.css -> .design-sync/.cache/compiled.css
```

`cfg.cssEntry` wijst naar die output. De stap is correct in beide werelden: zonder
`@import "tailwindcss"` laat de plugin de inhoud passeren (output == input), ermee
compileert hij echt (gemeten: 320 regels in, 11.344 uit).

**Wat #323 hier oploste**: de vijf gradient-klassen en `h-48` die deze branch eerst met de
hand in een `@layer utilities`-blok zette, worden nu automatisch gegenereerd. Dat blok is
bij de rebase op `9d0fcbb7` dan ook vervallen. ⚠️ Tailwind 4 negeert door de gebruiker
geschreven `@layer utilities` sowieso — het werkte alleen zolang het bestand bevroren was
en de plugin er niets mee deed. `@layer components` blijft wel overeind.

**Wat er wél blijft**: `MODULE_GRADIENTS['trend-radar'].from` stond op `from-primary-500`,
een klasse die nooit heeft bestaan. Dat is een tokenfout, geen CSS-fout, en die fix zit in
deze branch.

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
