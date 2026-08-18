---
id: content-chain-accessor
title: Eén getypeerde accessor voor deliverable-content — de twee content-ketens krijgen één deur
fase: launch
priority: now
effort: 5-8 dagen (3 fasen)
owner: claude-code
status: done
created: 2026-07-17
completed: 2026-08-18
related-adr: docs/adr/2026-07-17-deliverable-content-accessor.md
related-spec: -
worktree: - (opgeruimd na de merge)
---

# Probleem

Zie ADR [`2026-07-17-deliverable-content-accessor`](../docs/adr/2026-07-17-deliverable-content-accessor.md)
voor de volledige onderbouwing. Kort:

Content woont op **drie** plekken (`DeliverableComponent.generatedContent` = keten A;
`settings.structuredVariant`/`puckData` = keten B; `generatedText` = keten C, dood). Voor de
11 keten-B-types (4 PUCK-webpage + 7 long-form GEO) is keten A **structureel** leeg. Het
type-systeem beveelt de verkeerde keten aan: 240 getypeerde toegangen tot A, 39 rauwe tot B,
en `settings` staat in het schema gedocumenteerd als *"Type-specifieke settings"*.

Vier keer dezelfde bug in acht weken; twee gevonden door een externe tester in zijn eerste
uren. Een sweep vond **21 kruisingen** die nog open staan.

# Voorstel

`getDeliverableContent()` als enige deur, met een discriminated union die exhaustiviteit
afdwingt. `settings` typeren. Rauwe toegang verbieden via ESLint. Gefaseerd over 3 PR's.

# ⚠️ Sequencing — lees dit eerst

Deze task **raakt de bestanden van open PR's**. Start pas als deze gemerged zijn, anders
bouw je een onreviewbare stapel:

| PR | Waarom het botst |
|---|---|
| [#174](https://github.com/erikjager55/Branddock/pull/174) | introduceert `export-deliverable-text.ts` (een proto-accessor) + de `Step4Timeline.allText`-fallback. **Beide worden door de accessor vervangen** — `buildDeliverableBody` gaat op in `getDeliverableContent`. |
| [#177](https://github.com/erikjager55/Branddock/pull/177) | `channel-payload.ts` is bewust het chokepoint waar de accessor inplugt. De guard blijft; alleen de extractie verandert. |
| [#173](https://github.com/erikjager55/Branddock/pull/173) · [#175](https://github.com/erikjager55/Branddock/pull/175) | raken de content-ketens niet; geen conflict. |

# Fase 1 — de accessor (eigen PR)

**Levert**: de deur, nog zonder consumenten. Volledig testbaar in isolatie.

- `src/lib/content/deliverable-content.ts`
  ```ts
  export type DeliverableContent =
    | { kind: 'components'; text: string; byGroup: Record<string, string>; heroImageUrl: string | null }
    | { kind: 'structured'; text: string; variant: PageVariantContent }
    | { kind: 'structured-unchosen'; optionCount: number }
    | { kind: 'empty' };

  export function getDeliverableContent(d: DeliverableLike): DeliverableContent;
  ```
  - Precedentie: componenten-mét-inhoud → gekozen variant → opties-zonder-keuze →
    `generatedText` (legacy-fallback) → empty.
  - **Fail-soft flatten**: `flattenPageVariantToText` itereert rechtstreeks over
    `tldr`/`sections`/`citeableStats`/`qa` en gooit op een half-complete opgeslagen variant
    (gotcha 2026-03-24). De accessor vangt dat en degradeert naar `empty` + warn; hij mag
    nooit een consument 500'en.
- `src/lib/content/deliverable-settings.ts` — `DeliverableSettings`-interface +
  `readDeliverableSettings(json)`-parser (defensief: Prisma-JSON kan alles zijn).
- `prisma/schema.prisma` — comment-correctie op `settings` (*"Type-specifieke settings"* →
  benoemt dat hier content in zit) + `generatedText` markeren als deprecated. **Geen
  schema-wijziging**, dus geen Neon-push.
- ESLint `no-restricted-syntax` op rauwe toegang, met expliciete uitzondering voor de
  accessor-module + de schrijf-paden.
- Smoke: elke `kind`, de flip-staat, half-complete variant, rommelige settings.

**Acceptatie**: `tsc` 0 · `lint` 0 · smoke groen · **de lint-regel vlagt aantoonbaar de 39
bestaande rauwe toegangen** (bewijs dat 'ie discrimineert; die worden in fase 2/3 opgeruimd,
tot dan een `eslint-disable` mét TODO-verwijzing naar deze task).

## ✅ Fase 1 — opgeleverd 2026-08-16

Acceptatie gehaald: `tsc` 0 · `lint` 0 errors · smoke **46/46** · lint-regel vlagde **17**
rauwe toegangen in 10 bestanden vóór de disables (discriminatie-bewijs). `prisma migrate diff`
tegen het main-schema: *No difference detected* — comment-only, dus **geen Neon-push**.

**Vier afwijkingen van de specificatie hierboven, elk met reden.**

1. **Naam.** De spec schrijft `getDeliverableContent()` in
   `src/lib/content/deliverable-content.ts` voor. Dat pad én die functienaam zijn sinds deze
   task is geschreven ingenomen door de publieke-API/MCP-reader (ADR `2026-07-17-public-brand-api`),
   met een ándere signatuur (async, workspace-gescoped, DB-query). Hernoemen raakt publiek
   API-oppervlak, dus de nieuwe accessor heet `resolveDeliverableContent()` in
   `src/lib/content/resolve-deliverable-content.ts`.
   ⚠️ **Die bestaande reader is zelf een kruising**: hij levert alleen `components` en geeft
   voor de 11 keten-B-types dus een lege lijst terug. De MCP-tool `get_deliverable_content` en
   `GET /api/v1/deliverable` hebben daarmee exact de bug die deze task bestrijdt. Opgenomen als
   **#23** hieronder.
2. **Precedentie omgedraaid.** De spec zegt "componenten-mét-inhoud → gekozen variant", maar de
   sectie *De flip* eist het tegenovergestelde en geeft daar de reden bij. Geïmplementeerd:
   **gekozen variant → componenten → opties-zonder-keuze → generatedText → empty.** Anders geeft
   de accessor na een GEO-flip juist de verouderde pre-flip-tekst terug. Er is een smoke die
   hierop assert.
3. **Lint-regel-sleutel en scope.** De spec zegt `no-restricted-syntax` zonder scope. Het
   config-bestand documenteert echter expliciet dat flat-config **last-wins per rule-key** doet
   en dat een extra `no-restricted-syntax`-blok de bestaande NL- en i18n-guards op elk
   overlappend bestand stil uitschakelt. De guard is daarom gescoped op
   `src/lib/**/*.ts` + `src/app/api/**/*.ts` — geen overlap met de andere twee blokken.
   Gevolg: de twee `.tsx`-call-sites (#8 Step4Timeline, #20 FeedbackBar) zijn niet lint-gedekt
   en worden in fase 2 met de hand gemigreerd.
4. **`puckData` niet in de guard.** 77 vindplaatsen, vrijwel allemaal legitiem render-werk in
   het landing-pages-domein. Het is een render-artefact, geen tekstbron.

**Twee ontwerpkeuzes die de spec openliet:**

- **Beeld- en videocomponenten tellen niet als tekst.** Hun `generatedContent` bevat de gebruikte
  *prompt* (zie de doc-comment op `DeliverableContentComponent`). Meenemen zou beeldprompts als
  artikeltekst laten doorgaan — tot in exports en F-VAL-scoring.
- **Variant-selectie binnen een groep**: de geselecteerde component wint, en zonder selectie
  variant 0. Zonder die filter plakt een tekstprojectie varianten A/B/C achter elkaar.

**Nieuw gevonden kruisingen** (stonden niet in de inventaris van 17-07):

| # | pad:regel | leest | wat er misgaat |
|---|---|---|---|
| 22 | `lib/agents/registry/seo-watchdog-scan.ts:171` | B (rauw) | ✅ **gefixt 2026-08-18** — Iris leest via de accessor; zod-validatie blijft op `content.variant`, `eslint-disable` weg |
| 23 | `lib/content/deliverable-content.ts` (publieke API + MCP) | A | ✅ **gefixt 2026-08-18** — `text` + `contentState` + `variantOptionCount` erbij (additief); `components` ongewijzigd |

# Fase 2 — de 9 gebruiker-zichtbare kruisingen (eigen PR)

Elk met een echte verificatie, niet alleen tsc.

| # | pad:regel | leest | wat de gebruiker ziet bij een pillar-page |
|---|---|---|---|
| 1 | `studio/[deliverableId]/publish-to-channel/route.ts:122` | A | ✅ **gefixt 2026-08-16** — `buildChannelPayload` leest nu beide ketens; guard blijft, `structured-unchosen` blokkeert nog steeds |
| 2 | `content-library/route.ts:208-211,230,246` | C | ✅ **gefixt 2026-08-17** — productkeuze gemaakt (zie hieronder). Stoplicht amber i.p.v. rood, hint noemt de handeling, `wordCount` klopt voor keten B/C |
| 3 | `lib/claw/tools/read-tools.ts:861-865` | A + C | ✅ **gefixt 2026-08-17** — productkeuze gemaakt (zie hieronder). Assistent leest nu alle drie de ketens; bij een ongekozen variant meldt hij de keuze i.p.v. "geen content" |
| 4 | `features/campaigns/lib/export-zip.ts:40,64` | C | ✅ **gefixt 2026-08-16** — las `json.generatedText` terwijl de route `{deliverable:{…}}` teruggeeft, dus ALTIJD leeg voor élk type. Nu één batch-POST naar de canvas-export-route (server-side, alle drie de ketens) i.p.v. een fetch-loop |
| 5 | `studio/[deliverableId]/auto-iterate/trigger/route.ts:84-140` | A | ✅ **gefixt 2026-08-16** — blobText valt terug op de accessor; de gate ziet nu de echte woordentelling |
| 6 | `studio/[deliverableId]/strict-rewrite/apply/route.ts:84-107` | A | ✅ **melding gefixt 2026-08-16** — keten-B krijgt nu een eerlijke uitleg i.p.v. "geen componenten". Écht herschrijven vereist de schrijf-kant van keten B = out of scope |
| 7 | `studio/[deliverableId]/auto-iterate/apply/route.ts:79-101` | A | ✅ **melding gefixt 2026-08-16** — idem #6 |
| 8 | `canvas/accordion/Step4Timeline.tsx:100` | A | ✅ **gemigreerd 2026-08-16** — eigen cast + try/catch vervangen door de accessor |
| 9 | `campaigns/[id]/canvas/export/route.ts:37-66` | A | ✅ **gemigreerd + BEREIKBAAR gemaakt 2026-08-16** — `buildDeliverableBody` delegeert nu aan de accessor, en de ZIP-export roept deze route aan. Niet verwijderd: hij bleek precies de server-side deur die #4 nodig had |

## ✅ Fase 2 — de twee productkeuzes, opgeleverd 2026-08-17

`structured-unchosen` (content gegenereerd, variant nog niet gekozen) dwong per
consument een keuze af. Beide zijn gemaakt op één principe: **de gebruiker heeft
werk staan, dus lieg niet dat het leeg is — maar gok ook niet welke versie hij
bedoelde.**

**#2 Content Library — voortgang, geen leegte.**

- Het stoplicht gaat **amber ("In progress")**, niet rood ("Not started"). Er is
  gegenereerd; alleen de keuze ontbreekt.
- De hint noemt de eerstvolgende handeling: *"2 versions — choose one"* in plaats
  van *"No content generated"*. Enkelvoud krijgt *"1 version — choose it"*.
- Nieuw filter-token `variant-unchosen` (Wat ontbreekt → "Version not chosen yet"
  / "Nog geen versie gekozen"), zodat de wachtrij in één klik te vinden is.
- **`hasContent` blijft `false`.** Dat veld schakelt in de UI de QuickPublishMenu
  vrij en de publish-guard (#412) weigert een deliverable zónder variantkeuze
  alsnog. Op `true` zetten zou een actie aanbieden die gegarandeerd afketst. Het
  stoplicht krijgt daarom een eigen signaal (`contentState`) i.p.v. een opgerekte
  `hasContent`.

**#3 Brand Assistant — eerlijk over de staat, geen ongekozen versie prijsgeven.**

- Bij `structured-unchosen` geeft de tool **geen** varianttekst terug, maar
  `pendingVariantChoice: true` + `variantOptionCount` + een instructie: meld de
  keuze en verwijs naar Canvas. Eén van de opties teruggeven zou de assistent
  laten samenvatten of hergebruiken uit een versie die de gebruiker nog kan
  weggooien — dat lekt door naar afgeleide content.
- De echte bug eronder is óók weg: de tool las alleen keten A + C en meldde dus
  "nog geen content" op een volle pillar-page. Nu leest hij alle drie de ketens.
- Bijvangst: het `isSelected: true`-filter op de component-query is verdwenen. Een
  variantgroep zónder expliciete selectie leverde nul componenten op terwijl
  variant 0 gewoon de levende tekst is; de accessor doet die selectie zelf.

**Twee dingen die de inventaris niet voorzag:**

1. **De route-helpers waren onsmokebaar.** `deriveReadiness` en `hintTokens`
   stonden ín het route-bestand, en een App-Router-route mag geen extra symbolen
   exporteren. Ze zijn verhuisd naar `src/lib/content/library-readiness.ts`, nu
   getest in plaats van nagebouwd in een smoke.
2. **De oude regel was óók fout voor keten A.** De smoke tegen echte rijen laat
   zien dat een LinkedIn-post mét 30+ gevulde componenten evengoed
   *"No content generated"* kreeg — de fout was dus breder dan de 11 keten-B-types.

**Bewijs** (`scripts/smoke-tests/content-library-readiness.ts`, **39/39**): 25 pure
assertions + 14 tegen **echte rijen** in de lokale DB, door de ECHTE route-query en
de ECHTE Claw-tool. Per rij drukt de smoke oud naast nieuw af:

```
ongekozen varianten (landing-page)  oud: "No content generated"  → nieuw: "2 versions — choose one"
gekozen variant     (landing-page)  oud: hasContent=false        → nieuw: hasContent=true
componenten         (linkedin-post) oud: hasContent=false        → nieuw: hasContent=true
echt leeg           (landing-page)  oud: "No content generated"  → nieuw: ongewijzigd
```

`tsc` 0 · `lint` 0 errors · fase-1-smoke 52/52 nog groen. Geen schema-wijziging,
dus geen Neon-push.

**Nog open in fase 2**: #22 (`seo-watchdog-scan.ts`, Iris leest de variant rauw,
draagt nog een `eslint-disable` met TODO) én #23 (de publieke reader), die in deze
opsomming ontbrak. Beide afgerond in de ronde hieronder.

## ✅ Fase 2 — restscope #22 + #23, opgeleverd 2026-08-18

**#23 — de publieke reader gaf een volle pagina als leeg item uit.**
`src/lib/content/deliverable-content.ts` mapte uitsluitend `components`, dus de
MCP-tool `get_deliverable_content` en `GET /api/v1/deliverable` leverden voor de 11
keten-B-types een lege lijst. Dat is dezelfde bug als #2/#3, maar op de enige plek
waar een klant of externe agent 'm ziet. Additief opgelost — het oppervlak zit nog
achter `PUBLIC_API_ENABLED`, dus er is geen externe consument, maar `components`
blijft ongewijzigd zodat er ook nooit één breekt:

- `text` — de platte tekst uit welke keten dan ook; `null` bij leeg.
- `contentState` — `ready` / `awaiting-choice` / `empty`. Zonder dit onderscheid
  leest een externe agent "geen tekst" als "leeg item" en genereert hij eroverheen.
- `variantOptionCount` — hoeveel versies op een keuze wachten.
- Bij `awaiting-choice` gaat er **geen** tekst mee, gelijk aan de keuze bij #3: een
  versie die de gebruiker nog kan weggooien lekt niet naar afgeleide content. De
  tool-beschrijving en de route-header zeggen dat nu ook.

**#22 — Iris leest via de accessor.** De rauwe
`longFormGeoVariantSchema.safeParse(settings.structuredVariant)` is vervangen door
`resolveDeliverableContent()` + dezelfde zod-validatie op `content.variant`; de
`eslint-disable` is weg. Iris scoort alleen long-form GEO, dus de schema-check
blijft — de accessor garandeert een page-variant, niet dít schema. Bijeffect: een
half-complete opgeslagen variant komt nu als `empty` binnen (skip) in plaats van als
een object dat pas verderop omvalt.

**Vier bevindingen uit de fresh-eyes-review van PR #288, in dezelfde ronde gefixt:**

1. **De tekstcomponent-regel stond op drie plekken** — de Prisma-`where` in
   `content-library/route.ts`, `NON_TEXT_COMPONENT_TYPES` in de accessor, en een
   kópie in de smoke. Ze waren gelijk, maar de smoke kon de drift per definitie niet
   vangen omdat hij de where-clause nabouwde. Nu één geëxporteerde
   `TEXT_COMPONENT_WHERE`, gebruikt door route én smoke.
2. **De docstring van `resolveDeliverableContentSignal` claimde te veel**
   ("uit elkaar lopen kan niet"). De *precedentie* wordt inderdaad niet herhaald,
   maar de *variantselectie* wél: de telling weet niet welke groep wat koos, dus
   staat álle tekst in niet-levende varianten, dan zegt het signaal `ready` waar de
   volledige accessor `empty` geeft. Benoemd i.p.v. weggeschreven.
3. **`hasContent` was tóch `true` bij `awaiting-choice` zodra er beeld/video op de
   rij stond** — precies de afketsende QuickPublishMenu die keuze #2 wilde
   vermijden. Nu `hasVisuals && !isAwaitingChoice`.
4. **De readiness-hints gingen langs i18next heen.** De route bouwde Engelse zinnen
   die de UI rauw rendert, terwijl dezelfde begrippen in
   `campaigns-content-library` wél vertaald staan: een Nederlandse gebruiker zag
   *"No content generated"* op de kaart en *"Geen content gegenereerd"* in het
   filter. Erger was de terugweg — het serverfilter leidde zijn tokens áf uit die
   Engelse tekst (`lower.includes('choose')`), dus één herformulering of vertaling
   had het filter stil kapotgemaakt. De API stuurt nu `readinessSignals` (tokens),
   `formatReadinessHint()` maakt er de zin van, en Engels blijft de bron via
   `defaultValue` — dat is niet alleen een vangnet: namespaces laden lazy, dus vóór
   die load ís de defaultValue wat er op het scherm staat.

**Bewijs**: `content-library-readiness` **59/59** (was 39/39; +12 voor de publieke
reader en de beeld/keuze-combinatie, +8 voor de i18n-laag), fase-1-smoke `deliverable-content-accessor`
**52/52** ongewijzigd, en de échte Iris-laag via
`SKIP_AI=1 scripts/dev/agent-seo-watchdog-smoke.ts` → **15/15** (geseede GEO-pagina's:
1 vervallen geflagd, 1 gezond, 1 corrupt geskipt). `tsc` 0 · `lint` 0.

⚠️ Eén assertie van de nieuwe smoke moest ik bijstellen omdat de werkelijkheid
anders was: de keten-B-rij in de lokale DB heeft **zowel 5 componenten als een
gekozen variant** (4.185 tekens). "Keten B heeft geen componenten" klopt dus niet als
regel — het is de flip-situatie uit §*De flip*, en juist daar bewijst de precedentie
zich: wie alleen `components` las kreeg een ánder (verouderd) antwoord. De check test
nu dát, in plaats van een lege lijst.

# Fase 3 — de 12 stille kruisingen (eigen PR)

Data- en AI-kwaliteit; geen directe UI-schade, wel structureel.

| # | pad:regel | leest | wat er misgaat |
|---|---|---|---|
| 10 | `lib/learning-loop/content-version.ts:196-201` | A | ✅ **gefixt 2026-08-16** — valt terug op de accessor via `snapshot.settings`; diffs en edit-badges werken weer voor web-pages |
| 11 | `lib/brand-fidelity/visual-fidelity-scorer.ts:460-475` | A | ✅ **gefixt 2026-08-16** — valt terug op de accessor; de coherence-judge krijgt weer copy-context |
| 12 | `lib/studio/context-builder.ts:211-231` | A | ⚪ **DODE CODE (2026-08-16)** — `compileComponentFeedback`, de enige aanroeper van `buildCascadingComponentContext`, heeft ZELF nul aanroepers. Dit pad draait nooit; een fix zou speculatief werk op dode code zijn. Verdient een opruim-besluit, geen keten-fix |
| 13 | `lib/ai/knowledge-context-fetcher.ts:145-147` | C | ✅ **gefixt 2026-08-16** — `contentSnippet` via de accessor (incl. componenten in de query) |
| 14 | `lib/ai/persona-prompt-builder.ts:178-179` | C | ✅ **gefixt 2026-08-16** — leest `contentSnippet`, `generatedText` blijft fallback voor oude context-objecten |
| 15 | `api/workspace/export/route.ts:122` | ✅ **gefixt 2026-08-16** — `components` gaan nu mee in de export; een GDPR-export die de helft van iemands content weglaat voldoet niet aan zijn doel |
| 16 | `studio/[deliverableId]/route.ts:51-54` | C | ✅ **gefixt 2026-08-16** — alle drie de ketens tellen mee (keten A via een `take: 1`-existentiecheck) |
| 17 | `studio/[deliverableId]/context/route.ts:55-58` | C | ✅ **gefixt 2026-08-16** — via de accessor |
| 18 | `studio/[deliverableId]/components/[componentId]/route.ts:82-93` | A | ✅ **gefixt 2026-08-16** — de studio-PATCH emit nu `content.edited` bij een echte Puck-tekstwijziging. Vergelijking op de COPY uit `puckData` (niet op de JSON), zodat een autosave die alleen layout/hero verzet géén event geeft — anders spamt elke autosave-tick de tabel vol |
| 19 | `studio/[deliverableId]/derive/route.ts:43,84-92` | A (dood) | ✅ **gefixt 2026-08-16** — keten-B-velden worden nu gestript. Bleek méér dan ballast: de accessor leest `structuredVariant` als waarheid, dus een afgeleide post gaf de tekst van de BRONPAGINA terug i.p.v. zijn eigen content. ⚠️ Rest-gap: repurpose neemt nog steeds géén bron-content mee (eigen feature-beslissing) |
| 20 | `canvas/FeedbackBar.tsx:40` | A | ✅ **gefixt 2026-08-16** — `structuredVariant` telt mee als tekst |
| 21 | `campaigns/[id]/deliverables/[did]/send/route.ts:93` | C | ✅ **gefixt 2026-08-16** — guard én `htmlBody` uit dezelfde bron. ⚠️ Alleen de guard omzetten zou een LEGE mail hebben verstuurd: het gat verplaatst naar één regel lager |

## Fase 3 — afgerond 2026-08-16

Alle twaalf kruisingen behandeld. Eén bleek dode code (#12); de rest is gefixt.

**Twee bevindingen die niet in de inventaris stonden:**

- **#19 was geen ballast maar een correctheidsfout.** Sinds de accessor `structuredVariant`
  als waarheid leest, zou een afgeleide post de tekst van de BRONPAGINA teruggeven.
- **#21 was een half gat.** Alleen de guard omzetten zou een LEGE mail hebben verstuurd —
  `htmlBody` las nog `generatedText`. Het gat verplaatst zich dan één regel naar beneden.

**Geverifieerd en NIET waar gebleken**: het vermoeden dat `puckData` en `structuredVariant`
uit elkaar lopen, waardoor de accessor stale tekst zou geven. Over 20 echte rijen bleek elk
verschil een compositie-artefact (testimonials die de Puck-renderer samenvoegt uit losse
variant-velden), geen content-drift.

# De flip — apart afhandelen in fase 1

Long-form defaultt op `['seo']` (`seo-pipeline-utils.ts:22-29`) → `isPuckRenderable` false →
keten A. Vinkt de gebruiker het GEO-doel aan, dan flipt het deliverable naar keten B terwijl
de oude `variantGroups` blijven staan. De accessor moet dan **niet** de verouderde
pre-flip-tekst teruggeven: als er een gekozen structured variant is, wint die — ongeacht wat
er nog aan componenten ligt. Dit is de enige situatie waarin #10 wél een diff produceert, en
dan een verkeerde.

# Bestanden die ik NIET aanraak

- De opslag zelf. Geen datamigratie, geen schema-wijziging (dus geen Neon-push). De accessor
  is een leeslaag.
- `variant-generator.ts` / de generatie-pipelines — die schrijven, de accessor leest.
- De **schrijf**-divergentie (twee ketens schrijven naar verschillende state; de
  publish-DRAFT-bug van 24-06). Aparte beslissing; deze task lost lezen op.

# Smoke test plan

Per fase eigen bewijs. Minimaal:
1. **Fase 1**: unit-smoke over elke `kind` + de flip + half-complete variant + rommelige
   settings. Plus: de lint-regel vlagt de bestaande rauwe toegangen (discriminatie-bewijs).
2. **Fase 2**: per kruising een echte reproductie. Voor #2 en #3 kan dat tegen een lokale
   pillar-page; voor #1 via de bestaande `publish-empty-guard-smoke` uitgebreid met de
   gevulde-payload-case.
3. **Fase 3**: #11 (hero-scoring zonder copy) verdient een echte generatie-run — dat is de
   enige die AI-output beïnvloedt.

Regel uit de gotchas (12-07): **een fix is pas een fix na een echte run van de getroffen
flow.** tsc-groen bewijst hier per definitie niets — beide takken compileren.

# Risico's

- **Grote refactor-oppervlakte** (21 call-sites). Mitigatie: 3 fasen, elk een eigen PR met
  eigen bewijs. Fase 1 raakt geen enkele consument en is dus veilig te mergen.
- **De lint-regel irriteert.** Elke uitzondering moet een bewuste keuze zijn met een comment,
  geen `eslint-disable` uit gemak. Review-punt.
- **`structured-unchosen` dwingt 21 productbeslissingen af** ("wat toon ik als er geen keuze
  is?"). Dat is het doel, maar het is werk en het vraagt Eriks input op minstens #2
  (Content Library-stoplicht) en #3 (Brand Assistant-antwoord).
- **De accessor kan zelf de volgende single point of failure worden.** Mitigatie: hij is puur,
  volledig gesmoked, en de externe randen houden hun eigen vangnet (#412).

# Restant na 2026-08-18 — alle 23 kruisingen zijn behandeld

> ⚠️ **Nog te verplaatsen naar `tasks/done/`.** Bewust niet gedaan op 18-08: twee open
> sessie-afronding-PR's (#300, #304) schrijven op dat moment aan `START_HERE.md` en
> verwijzen naar dit pad. Meenemen in de eerstvolgende done-sweep, zodra die geland zijn.

Er staat geen kruising meer open; deze taak is **done** (2026-08-18, PR #298).
Wat resteert zijn drie **beslissingen**, geen onafgemaakt werk. Ze hebben een eigen
task-file gekregen — [`content-chain-followups`](content-chain-followups.md) — zodat
ze niet in een losse-eindjes-sectie verdwijnen (les 2026-08-16). Hieronder blijven ze
staan als context bij de kruisingen waar ze uit voortkomen.

- **#12 dode code opruimen.** `buildCascadingComponentContext` en zijn enige
  aanroeper `compileComponentFeedback` hebben samen nul aanroepers. Niet gefixt maar
  ook niet verwijderd — dat is een opruim-besluit, geen ketenfix.
- **#6/#7 schrijf-kant van keten B.** Strict-rewrite en auto-iterate géven nu een
  eerlijke uitleg in plaats van "geen componenten", maar kunnen een keten-B-pagina
  nog steeds niet écht herschrijven. Dat vraagt de schrijf-kant, expliciet out of
  scope van deze leeslaag.
- **#19 repurpose neemt geen bron-content mee.** Het `derive`-pad strip nu de
  keten-B-velden (anders kreeg een afgeleide post de tekst van de bronpagina), maar
  het geeft de afgeleide deliverable ook géén bron-content. Dat is een
  feature-beslissing, geen bug.

De ESLint-guard blijft staan en er zit geen `eslint-disable` met een
`TODO(content-chain-accessor)` meer in de codebase — dat is de meetbare vorm van
"deze taak is af".

# Out of scope

- Storage normaliseren (ADR-alternatieven).
- `generatedText` droppen — aparte opruim-migratie.
- Schrijf-divergentie.
- De onbereikbare `canvas/export`-route: overweeg 'm te verwijderen i.p.v. te migreren, maar
  dat is een aparte beslissing.

# Notes

De sweep die deze inventaris opleverde staat in de sessie-analyse van 17-07. Twee
observaties die makkelijk verloren gaan:

- **`LONG_FORM_SEO_TYPES` heeft 7 leden, niet 6** — `thought-leadership` wordt in de
  ADR-teksten en in mijn eerdere analyses consequent vergeten.
- **`getContentReadiness` is niet stuk, hij beantwoordt de verkeerde vraag.** *"Is deze content
  goed genoeg?"* ≠ *"hebben we iets te versturen?"*. Een score is een proxy; de payload is het
  feit. Dat onderscheid is de reden dat de guard van #412 blijft bestaan náást de accessor.
