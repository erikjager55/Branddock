# Branddock Design System — hoe je hiermee bouwt

Dit is de UI-laag waarmee de Branddock-app zijn pagina's bouwt: 35 componenten, alle
beschikbaar op `window.BranddockDS`. Twee lagen die je door elkaar gebruikt —
**layout-primitives** (`PageShell`, `PageHeader`, `SectionCard`, `StatGrid`,
`WizardStepper`, …) en **gedeelde bouwstenen** (`Button`, `Badge`, `Card`, `Input`,
`Select`, `Modal`, `EmptyState`, `Skeleton`, …).

⚠️ De app heeft daarnaast een `src/components/ui/`-map met shadcn-primitives. **Die is
bewust niet gesynct**: 36 van de 40 bestanden hebben nul importeurs — opgetuigd, nooit
in gebruik genomen. Bouw dus met wat hier staat, niet met een shadcn-`Button`.

## Geen provider nodig

Elk component rendert zelfstandig. Er is geen ThemeProvider, geen context-wrapper en
geen initialisatie — importeer het component en gebruik het. De styling komt volledig
uit `styles.css` (die `_ds_bundle.css` importeert); laad die en je bent klaar.

## Elke pagina begint met PageShell + PageHeader

Dit is geen suggestie maar de huisregel van deze codebase. `PageShell` centreert en
begrenst de inhoud, `PageHeader` geeft de pagina zijn module-identiteit:

```jsx
<PageShell>
  <PageHeader
    moduleKey="personas"
    title="Persona's"
    subtitle="De doelgroepen waarvoor Branddock content schrijft."
    actions={<button className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white">Nieuwe persona</button>}
  />
  <StatGrid columns={3}>{/* ... */}</StatGrid>
</PageShell>
```

`moduleKey` is geen decoratie: hij bepaalt icoon én gradientkleur van de header. Kies de
sleutel die bij het onderwerp hoort (`personas`, `campaigns`, `content-library`,
`brandstyle`, `research`, `dashboard`, …) — de volledige lijst staat in
`PageHeader.d.ts`.

## De styling-idioom: Tailwind-utilities uit een vooraf gecompileerde stylesheet

Je schrijft je eigen layout-lijm met Tailwind-klassen. **Maar let op — en dit is de
belangrijkste regel hier:** de meegeleverde stylesheet is een *vooraf gecompileerde,
gesnoeide* build. Er is geen Tailwind-compiler die tijdens het renderen nog klassen
bijmaakt. **Een klasse die de Branddock-app zelf nergens gebruikt, bestaat hier niet en
doet stilzwijgend niets.**

Praktisch betekent dat:

- **Gebruik `bg-primary` / `text-primary` / `border-primary` voor merkkleur.** Die lopen
  via de CSS-variabele `--primary` (`#1fd1b2`) en kunnen niet weggesnoeid worden. Doe dit
  liever dan een kleurschaal-klasse te gokken.
- **Blijf bij het vocabulaire dat je in de componenten en previews ziet.** Betrouwbaar
  aanwezig zijn onder meer: `flex`, `items-center`, `gap-4`, `space-y-6`, `px-8`, `py-6`,
  `rounded-lg`, `rounded-xl`, `border-gray-200`, `bg-white`, `text-gray-900`,
  `text-gray-600`, `text-sm`, `font-semibold`.
- **Verzin geen exotische maten.** Bijvoorbeeld `h-48` zit níét in deze build; een element
  dat erop leunt krijgt hoogte nul. Zie je een variant leeg renderen, dan is een
  ontbrekende utility de eerste verdachte.
- Twijfel je? Lees `styles.css` en de bestanden die hij importeert. Dat is de waarheid,
  niet deze samenvatting.

## Iconen: Lucide, nooit emoji

Componenten met een `icon`-prop (`PageHeader`, `SectionCard`, `SelectionCard`, `Button`,
`Input`, `EmptyState`, `StatCard`, `CrossLinkCard`) verwachten een Lucide-icooncomponent.
Emoji zijn in deze codebase expliciet verboden.

## Samengestelde componenten

`Modal`, `Popover` en `Select` verwachten compositie. Kijk in hun `.prompt.md` voor de
vorm — `Popover` bijvoorbeeld als `<Popover><PopoverTrigger asChild>…</PopoverTrigger>
<PopoverContent>…</PopoverContent></Popover>`. De sub-onderdelen staan op
`window.BranddockDS` maar hebben geen eigen kaart.

## Tekst is Nederlands

De app-UI is Nederlands. Schrijf labels, knoppen en meldingen in het Nederlands, tenzij
je expliciet iets anders wordt gevraagd.

## Waar de waarheid staat

- `styles.css` + zijn imports — alle daadwerkelijk beschikbare styling.
- `components/<groep>/<Naam>/<Naam>.d.ts` — het prop-contract, met uitgeschreven unies.
- `components/<groep>/<Naam>/<Naam>.prompt.md` — per component het gebruik.
- `guidelines/` — de merk- en inhoudsrichtlijnen van Branddock zelf.
