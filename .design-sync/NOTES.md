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

## Uitbreiding naar shared/ + de levende ui/-bestanden (2026-08-18)

Scope ging van 12 naar **35 componenten**. Drie metingen bepaalden die scope, en ze
weerlegden alle drie een aanname:

**1. `src/components/ui/` is grotendeels dood.** 36 van de 40 bestanden hebben nul
importeurs — `dialog`, `select`, `tabs`, `form`, `label`, `checkbox`, alles. Een
opgetuigde shadcn-laag die de app nooit in gebruik nam. Alleen `AIErrorCard`, `InfoBox`,
`ModelUnavailableNotice` en `popover` leven. Niet gesynct: de design-agent zou anders
bouwen met componenten die het product niet gebruikt.
⚠️ Meet dit met een filter op **directe kinderen** van `ui/`; `ui/layout/` is wél levend
en mag niet worden meegeteld als "dode importeur". Mijn eerste meting deed dat fout.

**2. Acht naambotsingen, empirisch beslecht.** `Button`, `Badge`, `Card`, `Input`,
`Select`, `Skeleton`, `EmptyState` bestaan in `ui/` én `shared/`. `window.BranddockDS` is
plat, dus er kan er maar één winnen. De code wijst het aan: `Button` wordt **110×** uit
`shared/` geïmporteerd en **0×** uit `ui/`. `shared/` wint dus; `PageHeader` is de
uitzondering (15× de `ui/layout`-variant, 0× die uit `shared/`).

**3. Eén ongebruikt component blies de bundel op.** `shared/StatsCard` doet
`import * as LucideIcons` voor icoon-op-naam-lookup en trok daarmee de HELE
iconenbibliotheek mee: **155 KB -> 1727 KB**. Niet gesynct (en nergens in de app
gebruikt). ⚠️ Nog 6 andere app-bestanden doen dezelfde wildcard-import; die zitten wél
in de app-bundel. Kandidaat voor een eigen taak.

✅ **Opgelost in #334** (2026-08-19): alle zeven wildcard-imports zijn vervangen door
`src/lib/icons/icon-registry.ts` met 214 expliciete imports — 672 KB → 65 KB, bewaakt
door `npm run smoke:icon-registry`. Daarmee verviel de bundel-reden om `StatsCard` uit te
sluiten; de uitsluiting blijft staan om de dubbel-reden hierboven.

### Wat er nog meer nodig bleek

- **Eigen entry-barrel** (`.design-sync/entry.ts`). Nooit `@/components/shared`
  importeren: die barrel re-exporteert `OptimizedImage` -> `next/image` en dan crasht de
  bundel op `process is not defined`. Elk component uit zijn eigen bestand.
- **i18n-provider** (`.design-sync/preview-provider.tsx`). Acht `shared/`-componenten
  gebruiken `useTranslation`; zonder context toont de kaart letterlijk
  `comingSoon.defaultTitle`. Bewust NIET via `createI18n`: die hangt een
  `resourcesToBackend` met dynamische `import()` op, waardoor esbuild elk locale-bestand
  van elke taal meeneemt (538 -> 1874 KB). Nu statisch, alleen `common`, `shared` en
  `settings-billing` — de enige namespaces die de gesyncte componenten aanspreken.
- **`dtsPropsFor` voor alle 35.** Zonder build vindt de extractor niets, ook niet bij de
  17 `shared/`-componenten die hun Props wél exporteren. De contracten zijn mechanisch uit
  de bron gelezen en de verwezen types uitgeschreven.

### Bewust uitgesloten

| Component | Reden |
|---|---|
| `OptimizedImage` | `next/image` werkt niet buiten een Next-runtime |
| `WorkspaceSwitchGuard` | vereist workspace-context; geen ontwerp-element |
| `ItemKnowledgeSources`, `KnowledgeContextSelectorModal` | importeren de app-barrel (zie hierboven); bovendien de eerste ongebruikt |
| `StatsCard` / `StatsCardGrid` | bijna-dubbel van `StatCard` (1 gebruiker tegen 34, zwakkere `icon: string`). ⚠️ De iconen-wildcard uit punt 3 is sinds #334 wég; dat is niet langer de reden |
| 36 shadcn-bestanden in `ui/` | nul importeurs |

`CreditCostHint` is wél gesynct maar heeft **geen preview**: het component geeft `null`
terug tenzij `NEXT_PUBLIC_CREDITS_ENABLED === 'true'`. Het houdt zijn contract en kaart
(floor card); een lege render forceren is misleidender.
⚠️ `cfg.overrides.<Naam>.skip` verwacht een **lijst met story-namen**, geen boolean — een
boolean laat de build crashen op `not iterable`. En alle stories skippen levert alsnog een
lege root: de floor card komt er pas als er géén geschreven preview is.

### Observatie voor de app (niet gefixt)

`AIErrorCard` en `ModelUnavailableNotice` tonen **Engelse** teksten ("Try again",
"The AI model is currently unavailable") terwijl de rest van de UI Nederlands is. Die
strings komen uit `getUnavailableMessage` in `src/lib/ai/ai-error-client.ts` en lopen niet
via i18n.

## Bewaakt sinds 2026-08-19: `npm run smoke:design-sync-drift`

De risico's hieronder waren tot dan alleen opgeschreven. Drie ervan zijn nu
gecontroleerd, en de smoke draait mee in CI (`scripts/ci/run-guards.sh`):

| faalvorm | wat er misging zonder bewaking |
|---|---|
| prop-drift | `dtsPropsFor` is handgeschreven; verandert een prop, dan codeert de design-agent tegen een contract dat niet meer klopt |
| namespace-drift | de provider noemt zijn i18n-namespaces met de hand; een nieuwe namespace geeft rauwe sleutels op de kaart |
| nieuw component | een component in `ui/layout/` of `shared/` die niemand in `entry.ts` en `componentSrcMap` zet, ontbreekt stil |

Alle vier de faalvormen zijn mutatie-gekalibreerd. ⚠️ Twee dingen die de mutatietest
ving en die anders stil waren meegegaan: de entry-controle deed eerst een
deelreeks-match (`SkeletonBadge` bevat `Badge`, dus een verwijderde Badge-export
bleef onzichtbaar), en de prop-controle sloeg alarm op componenten waarvan de
interface `extends` gebruikt — daar mag de config méér noemen dan de bron opsomt.

Bijvangst bij het bouwen: `IssueCard` en `Modal` misten `'data-testid'` in hun
contract. Toegevoegd.

**De uitsluitingslijst staat in de smoke zelf**, niet in `config.json` — die
accepteert alleen bekende sleutels, en een uitsluiting zonder reden ziet er over
een half jaar uit als een vergissing.

## Re-sync risico's

- **`dtsPropsFor` is een handgeschreven kopie van de bron.** Wijzigt een prop, dan klopt
  het contract stil niet meer. Dit is de grootste stille-verval-bron van deze config.
- **De entry is één barrel.** Komt er een layout-primitive bij die niet in
  `src/components/ui/layout/index.ts` staat, dan mist hij zonder foutmelding.
- **De FilterBar-importfix staat los in de working tree** (bewuste keuze van Erik,
  2026-08-18) — niet gecommit. Raakt die verloren, dan breekt de bundel opnieuw.
- **Scope is nu 35 componenten.** Bewust niet 78: zie de scope-metingen hierboven.
- **De entry is een handgeschreven barrel.** Komt er een component bij in `shared/` of
  `ui/layout/`, dan mist die zonder foutmelding tot iemand `entry.ts` bijwerkt.
- **De i18n-provider noemt vier namespaces met de hand** (`common`, `shared`,
  `settings-billing`, `ai-errors`). Gaat een gesynct component een vijfde gebruiken, dan
  toont die kaart weer rauwe sleutels — zonder bouwfout, want de provider hoort bij de
  sync-toolchain en niet bij de Next-build.
  ⚠️ Dit is al één keer gebeurd: PR #334 verplaatste de AI-foutmeldingen naar een nieuwe
  `ai-errors`-namespace, waarna `ModelUnavailableNotice` en `AIErrorCard` sleutels toonden
  tot deze regel werd toegevoegd. Verplaatst iemand `locales/nl/{common,shared,
  settings-billing,ai-errors}.ts`, dan breekt de statische import hier op dezelfde stille
  manier.
