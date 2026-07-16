---
id: canvas-variant-confirm-export
title: Variantkeuze gaat verloren + export is blind voor structured web-page-content
fase: launch
priority: now
effort: 4-6 uur
owner: claude-code
status: in-progress
created: 2026-07-16
completed:
related-adr: -
related-spec: -
worktree: branddock-canvas-variant-confirm-export
---

# Probleem

Pilot-tester `sljmn@me.com` meldde 2026-07-16 (BugReport `cmrnkuyqm000104jf4alll13i`,
severity medium): "de output copy en export html geeft niks terug. leeg bestand".

Prod-diagnose van zijn pillar-page: `settings.structuredVariantOptions` bevat **23,5KB**
aan gegenereerde content (2 varianten), maar `settings.structuredVariant` (de GEKOZEN
variant) en `puckData` **ontbreken**. Zijn enige `DeliverableComponent` is een `image`
met `generatedContent = null`. `settings.mediumConfig` is er wél — hij heeft Step 3 dus
bereikt en de sticky knop gebruikt.

**De dader** (na code-review gecorrigeerd — zie Notes voor wat ik eerst fout had):
`Step4Timeline.allText` bouwt de Copy/Download-inhoud **uitsluitend** uit
`previewContent`, en dat komt alleen uit `variantGroups` — de component-keten.
Structured/PUCK-types (landing-page, faq-page, product-page, microsite + de long-form
GEO-types) vullen die Map nooit; hun copy zit in `structuredVariant`. Voor die types is
`allText === ''` → `navigator.clipboard.writeText('')` en
`handleDownload('html')` schrijft letterlijk `<body></body>`. Dát is het lege bestand.

Zelfde familie als de twee-publish-ketens-gotcha (2026-06-24): een tweede keten schrijft
naar andere state en de eerste weet er niet van. Pijnlijk: dezelfde les gold in dit
bestand al voor de checklist (`puckSignals`, 2026-06-10, mét comment) — toen is `allText`
overgeslagen.

Bijkomende, echte defecten die tijdens de diagnose bovenkwamen:

1. **`Confirm & Continue` negeerde de previewde variant** — `LandingPageGenerateBlock`
   pakte hardcoded `variantOptions[0]` i.p.v. de actieve index. Wie B previewde en op de
   prominentste knop klikte, bevestigde stil A. Bovendien klemde de variant-kaart met
   `Math.min` terwijl de knop terugviel op `[0]`, en `activeVariantIndex` wordt bij een
   regenerate nooit gereset → na 4 → 2 varianten toont de kaart index 1 en bevestigt de
   knop index 0. Eén geklemde `safeVariantIndex` voor alle lezers.
2. **De keuze wordt pas ná het beeldwerk gepersisteerd** — op het **LP-pad** staat tussen
   de klik en de PATCH tot ~4,5 min (hero-gen 2× 75s + feature-gen 120s abort). Wie
   tussentijds doorklikt, verliest zijn keuze. **Geldt níet voor de gemelde pillar-page**
   (zie Notes) — daarom nu een vroege, geawaite PATCH die alleen op het LP-pad vuurt.
3. **`canvas/export/route.ts` kende ook maar één keten** (leest alleen
   `DeliverableComponent.generatedContent`). Latent: die route is **momenteel onbereikbaar**
   (`useExportDeliverables` heeft geen consumers). Meegefixt omdat de bug echt is en de
   route ooit gewired wordt — maar het is níet wat de tester raakte.

# Voorstel

1. Keuze **eerst** persisteren (fail-soft, niet-blokkerend), dan verrijken. De bestaande
   eind-PATCH overschrijft 'm met de verrijkte variant + puckData. Veilig omdat
   `PATCH /api/studio/[id]` settings shallow-merget.
2. Export-tekstopbouw naar een pure helper (`src/lib/campaigns/export-deliverable-text.ts`)
   die beide ketens kent: componenten → gekozen variant → eerlijke melding. Pure functie
   omdat een App-Router-route-file geen extra symbolen mag exporteren, en de
   keten-dispatch anders niet testbaar is. Hergebruikt `flattenPageVariantToText`
   (dispatcht op shape, dekt ook `geoArticle`).
3. `Confirm & Continue` gebruikt `activeVariantIndex`, met `[0]` als fallback.

# Acceptatiecriteria

- [x] Keuze persisteert vóór het beeldwerk
- [x] Export levert content voor structured/PUCK-types
- [x] Nooit meer een stil leeg bestand — geen variant gekozen → actionable melding
- [x] Component-keten ongewijzigd (geen regressie)
- [x] `Confirm & Continue` bevestigt de variant die de gebruiker ziet
- [x] Half-complete opgeslagen variant 500't de export niet (fail-soft + warn)
- [x] `npx tsc --noEmit` 0 errors
- [x] `npm run lint` 0 errors op gewijzigde files
- [x] **Geverifieerd tegen de échte prod-rij** — zie Smoke

# Bestanden die ik aanraak

- `src/lib/campaigns/export-deliverable-text.ts` — nieuw: pure, testbare tekstopbouw
- `src/app/api/campaigns/[id]/canvas/export/route.ts` — leunt op de helper
- `src/features/campaigns/components/canvas/accordion/Step4Timeline.tsx` — DE FIX: allText
  valt terug op de gekozen structured-variant
- `src/features/campaigns/components/canvas/accordion/LandingPageGenerateBlock.tsx` —
  geklemde safeVariantIndex + LP-only geawaite vroege persist
- `scripts/dev/canvas-export-structured-smoke.ts` — nieuw

# Bestanden die ik NIET aanraak

- `src/lib/landing-pages/flatten-variant.ts` — hergebruikt, niet gewijzigd. Zijn
  ontbrekende null-guards (tldr/sections/citeableStats/qa worden rechtstreeks
  geïtereerd) zijn afgedekt met een try/catch aan de export-kant; de flattener zelf
  hardenen raakt ook F-VAL-scoring → aparte beslissing.
- `PuckLayoutWrapper.tsx` — zie Out of scope.
- `src/lib/landing-pages/variant-generator.ts` — melding 2, `lp-locale-directive`.

# Smoke test plan

`npx tsx scripts/dev/canvas-export-structured-smoke.ts` → **23/23 groen**. Dekt:
sulejman's exacte staat (image-component zonder inhoud + options, geen keuze), mét
keuze, component-keten-regressie, echt-lege deliverable, half-complete variant, en
rommelige settings (null/array/string).

**Verificatie tegen de echte prod-rij** (zijn `settings`, 28KB, uit Neon):
- huidige staat → "(2 generated variant(s) available, but none chosen yet — pick a
  variant in the Canvas before exporting.)" i.p.v. een leeg bestand
- alsof hij variant 1 kiest → **8.722 tekens** echte content

# Risico's

- De vroege PATCH is een extra write per variantkeuze. Verwaarloosbaar; fail-soft en
  niet-blokkerend (`void` + `.catch`), dus hij kan de keuze-flow nooit ophouden.
- De "kies eerst een variant"-melding is Engels, conform de rest van deze route
  ("No generated content yet"). i18n van export-strings is een bredere sweep.

# Out of scope

- **`PuckLayoutWrapper`'s sticky Confirm & Continue** markeert de stap als goedgekeurd en
  gaat door zonder ooit een variant te eisen. Met de vroege persist is de schade weg (de
  keuze staat er al zodra je 'm maakt), maar de stap-gate zelf blijft te soepel: je kunt
  Step 2 nog steeds overslaan. Dat is een stepper-/gating-beslissing, geen bugfix —
  eigen task waard.
- Sulejman's bestaande deliverable healen: onnodig, hij kiest gewoon een variant.
- De taalmenging in zijn opgeslagen variant → `lp-locale-directive` (gefixt voor nieuwe
  generaties; oude varianten houden hun tekst).

# Notes

**Uit de code-review — ik had twee dingen aantoonbaar fout:**

1. **Ik fixte dode code.** Mijn eerste versie repareerde `canvas/export/route.ts`. Die
   route is onbereikbaar: `useExportDeliverables` (`content-canvas.hooks.ts:41`) heeft
   **geen enkele consument** in de repo. De knoppen die de tester indrukte zitten
   client-side in `Step4Timeline` (`handleCopyToClipboard` → `allText`,
   `handleDownload('html')` → `<body>${allText}</body>`). De echte fix moest dus naar
   `allText`. De route-fix is blijven staan (echte latente bug, 1 helper), maar hij was
   niet het antwoord op de melding.
2. **Mijn root-cause-claim klopte niet voor het gemelde type.** Ik schreef dat de keuze
   verloren ging door het ~4,5 min beeldwerk. Dat blok zit achter
   `if (isLandingPageVariant(variant))`, en `isLandingPageVariant` is **false** zodra
   `geoArticle in variant` — een pillar-page slaat het dus volledig over. Voor de tester
   bestond dat venster nooit; zijn state (options, geen `structuredVariant`) komt
   vrijwel zeker doordat hij nooit bevestigd heeft. Het beeldwerk-venster is echt, maar
   alleen op het LP-pad.
3. **De vroege PATCH introduceerde zelf een race.** Voor geo/faq/product/microsite (waar
   het beeldblok wordt overgeslagen) vuurden de vroege en de definitieve PATCH ~1ms na
   elkaar. `PATCH /api/studio/[id]` is read-modify-write zonder lock (findUnique → merge →
   update), dus een interleave kan `puckData` wegschrijven — dezelfde "leeg"-klasse die
   deze task wegneemt. Nu: alleen op het LP-pad (waar het venster bestaat) én `await` i.p.v.
   fire-and-forget, zodat de twee requests niet kunnen overlappen.

Verder had de export-route een subtiel gat: `if (d.components.length > 0)` i.p.v. "heeft
een component mét inhoud". Sulejman's lege image-component viel dus in de component-tak
en produceerde géén tekst én géén "(No generated content yet)" — alleen de kopregels.
Nu `componentText.length > 0`.

**Openstaand (bewust niet meegenomen):** `PATCH /api/studio/[deliverableId]` roept nergens
`invalidateCache` aan (CLAUDE.md-regel #10) — pre-existing, breder dan deze diff.
`preserveHeroOnSettings` ent bij een `structuredVariant`-only payload de hero-URL van de
vorige variant op de nieuwe; self-correct via de eind-PATCH, maar het venster bestaat.
Beide verdienen een eigen kijk.
