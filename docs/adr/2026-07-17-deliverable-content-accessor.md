---
id: 2026-07-17-deliverable-content-accessor
title: Content-toegang via één getypeerde accessor — de twee content-ketens krijgen één deur
status: accepted
date: 2026-07-17
supersedes: -
superseded-by: -
---

# Context

Branddock bewaart de content van een `Deliverable` op **drie** plekken, afhankelijk van het
content-type en van hoe oud de rij is:

| | Keten | Opslag | Getypeerd? | Toegangen |
|---|---|---|---|---|
| **A** | Componenten | `DeliverableComponent.generatedContent` (+ `variantGroup`, `isSelected`) | ✅ Prisma-relatie | ~240 |
| **B** | Structured/PUCK | `Deliverable.settings.structuredVariant` / `.structuredVariantOptions` / `.puckData` | ❌ `Json?` | 39 rauw |
| **C** | Legacy tekst | `Deliverable.generatedText` | ✅ scalar | dood — geen enkele writer voedt 'm nog |

Keten B geldt voor de 4 `PUCK_WEBPAGE_TYPES` (landing-page, faq-page, product-page,
microsite) + de 7 `LONG_FORM_SEO_TYPES` (blog-post, pillar-page, whitepaper, case-study,
ebook, linkedin-article, thought-leadership).

**Voor een keten-B-deliverable is keten A niet "soms leeg" — hij is structureel altijd leeg.**
`orchestrate/route.ts:91` gate't puck-types weg vóór de enige twee plekken die ooit
tekst-componenten aanmaken (`canvas-orchestrator`, `seo-pipeline`); `generate-structured-variant`
bevat **nul** `deliverableComponent.create`. De enige component-rijen die zo'n deliverable
krijgt zijn beeld-rijen met `generatedContent = null`.

## Hoe dit ontstond

ADR [`2026-05-22-landing-page-builder-architectuur`](2026-05-22-landing-page-builder-architectuur.md),
beslissing 5:

> *"page-data als `Json` (jsonb) kolom in `deliverable.settings.puckData` (**hergebruik bestaande Deliverable-model**)"*

Er is de `Deliverable`-**rij** hergebruikt, niet de content-**keten**. Zelfde tabel, andere
vorm, andere lezers. Die ADR somt 8 tradeoffs op — Puck-upgrades, Vercel-lock-in,
drag-drop-UX, de seed-mapper — en **geen enkele** gaat over het ontstaan van een tweede
opslagplaats die elke downstream-consument voortaan moet kennen.

ADR [`2026-06-17-longform-puck-publish-chain`](2026-06-17-longform-puck-publish-chain.md)
zág de prijs, maar framede 'm als een eindige lijst:

> *"accepterend dat we een discriminant in **5 dispatch-punten** moeten toevoegen"* · *"in **alle 7 gate-sites**"*

## Wat het werkelijk kostte

Files met minstens één keten-discriminant (`isPuckRenderable` / `PUCK_WEBPAGE_TYPES` /
`LONG_FORM_SEO_TYPES` / `geoArticle` / `isLandingPageVariant`), gemeten over `origin/main`:

| Datum | Files | |
|---|---|---|
| 22-05 | **0** | ADR 1 — splitsing als "hergebruik" |
| 01-06 | 6 | |
| 17-06 | **15** | ADR 2 accepteert ~12 — de realiteit was toen al 15 |
| 01-07 | **28** | |
| 16-07 | 29 | plateau (het web-page-werk stopte, niet het probleem) |

De kosten zijn geen lijst van 12 dispatch-punten. Het is een belasting op **elke huidige en
toekomstige consument van content**.

## Waarom het blijft terugkomen

Vier keer dezelfde bug, en geen enkele keer door slordigheid:

| Wanneer | Wat brak | Gevonden door |
|---|---|---|
| 10-06 | Planner-checklist false negatives (`1d6ebbc1`) | intern |
| 24-06 | Publish liet het item op DRAFT (`ce73e8a9`) | intern |
| 16-07 | Copy/Export leverde een leeg bestand | **externe tester, eerste uren** |
| 17-06→17-07 | Kanaal-publicatie stuurde een lege post extern (#412) | structurele analyse |

**De codebase beveelt de verkeerde keten aan.** Wie content nodig heeft doet het voor de
hand liggende — `deliverable.generatedText` of `components[].generatedContent`: getypeerd,
autocomplete, zichtbaar in het model. Dat werkt voor de helft van de types. Voor de andere
helft komt er stilzwijgend niets. Het model misleidt actief:

```prisma
settings           Json?      // Type-specifieke settings   ← hier zit de artikeltekst
generatedContent   Json?      // legacy
generatedText      String?    @db.Text                      ← dit lijkt "de tekst"
```

`settings` staat gedocumenteerd als *"Type-specifieke settings"* — dat leest als
configuratie. Niemand raadt dat daar 23,5KB body in zit. En `generatedText` — het veld dat
er het meest naar uitziet — is dood.

Deze klasse is per definitie onzichtbaar voor `tsc`, lint en review: **beide takken
compileren prima**. Alleen een echte gebruiker met een echt content-type vindt 'm.

## Inventaris: 21 kruisingen

Een uitputtende sweep (2026-07-17) vond 21 consumenten die keten A of C lezen terwijl ze
keten-B-types kunnen krijgen. Volledige lijst met paden in
[`tasks/content-chain-accessor.md`](../../tasks/content-chain-accessor.md); samengevat:

- **9 gebruiker-zichtbaar, ongegate** — o.a. lege post extern (#412, gedicht), Content
  Library toont *"No content generated"* op een volle gepubliceerde pagina, Brand Assistant
  zegt *"deze pagina heeft nog geen content"*, ZIP-export leeg, auto-iterate meldt *"0 words"*.
- **12 stil** — versie-historie zonder diffs, hero-beelden gescoord zónder copy-context,
  Puck-edits emitten nooit een LearningEvent (feedback-loop-metrics tellen LP-edits niet mee),
  knowledge-context krijgt alleen een titel, GDPR-export mist keten A volledig.
- **13 littekens** — plekken die al per geval gepatcht zijn, elk met een comment die de
  volgende ontwikkelaar niet leest omdat die in een ander bestand werkt.

En de gemeenste mechaniek: long-form defaultt op `['seo']`, dus `isPuckRenderable` is
**false** en de deliverable loopt keten A. Vinkt de gebruiker in Step 1 het GEO-doel aan,
dan **flipt het deliverable naar keten B** terwijl de oude `variantGroups` in de DB blijven
staan. De 9 consumenten lezen dan niet *niets*, maar de **verouderde tekst van vóór de flip**
— stiller en misleidender dan leeg.

# Decision

1. **Eén getypeerde accessor is de enige deur naar deliverable-content.**
   `getDeliverableContent(deliverable)` in `src/lib/content/deliverable-content.ts`,
   retourneert een **discriminated union**:

   ```ts
   type DeliverableContent =
     | { kind: 'components'; text: string; byGroup: Record<string, string>; … }
     | { kind: 'structured'; text: string; variant: PageVariantContent; chosen: true; … }
     | { kind: 'structured-unchosen'; optionCount: number }   // varianten er wél, keuze nog niet
     | { kind: 'empty' };
   ```

   `kind` dwingt exhaustiviteit af: een consument die een tak vergeet krijgt een
   **compile-fout**, geen stille lege string. Dat is het hele punt — de gok wordt een
   type-fout.

2. **`Deliverable.settings` wordt getypeerd** via een `DeliverableSettings`-interface + een
   `readDeliverableSettings(json)`-parser. Prisma houdt de kolom `Json?` (geen migratie),
   maar de content-dragende sleutels worden zichtbaar en autocomplete-baar. Het schema-comment
   *"Type-specifieke settings"* wordt gecorrigeerd: daar zit content.

3. **`kind: 'structured-unchosen'` is een first-class staat, geen fout.** Het is de staat van
   de pilot-tester: 23,5KB gegenereerd, nog geen variant gekozen. Elke consument moet 'm
   expliciet afhandelen — de één met een melding ("kies eerst een variant"), de ander door 'm
   als leeg te behandelen. Wat niet mag: er stilzwijgend overheen lezen.

4. **Rauwe toegang wordt verboden en afgedwongen** met een ESLint `no-restricted-syntax`-regel
   op `settings.structuredVariant` / `.puckData` / `.structuredVariantOptions` en op
   `deliverable.generatedText`, met een uitzondering voor de accessor-module zelf en de
   schrijf-paden. Zonder afdwinging is dit een conventie, en conventies zijn precies wat vier
   keer gefaald heeft.

5. **`Deliverable.generatedText` wordt gemarkeerd als deprecated** (keten C) — geen writer
   voedt 'm nog. Niet nu droppen: de lees-surface is breed. De accessor leest 'm als laatste
   fallback zodat legacy-rijen niet stil leegvallen; de kolom verdwijnt in een aparte
   opruim-migratie.

6. **Vangnetten op externe randen blijven staan**, ook ná de accessor — zoals de
   payload-guard in `publish-to-channel` (#412). De accessor voorkomt de fout; het vangnet
   vangt de volgende keten die we nog niet kennen. Defense in depth op precies de plekken waar
   de schade onomkeerbaar is.

7. **Gefaseerd, niet in één PR.** Fase 1 accessor + typen + ESLint-regel (zonder consumenten);
   fase 2 de 9 zichtbare kruisingen; fase 3 de 12 stille. Elke fase eigen PR met eigen bewijs.

# Y-statement

In de context van **drie opslagplaatsen voor deliverable-content waarvan het type-systeem er
één aanbeveelt en één actief verbergt achter een veld dat "settings" heet**, facing **21
consumenten die de verkeerde keten lezen, vier herhalingen van dezelfde bug in acht weken
waarvan twee gevonden door een externe tester in zijn eerste uren, en een klasse fouten die
tsc/lint/review per definitie niet zien omdat beide takken compileren**, I decided **één
getypeerde accessor met een discriminated union tot enige deur te maken, `settings` te typeren
en rauwe toegang met een lint-regel te verbieden**, to achieve **dat een vergeten keten een
compile-fout wordt in plaats van een stille lege string bij de gebruiker**, accepting tradeoff
**een refactor over ~21 call-sites plus een lint-regel die een legitieme rauwe toegang soms
zal irriteren — tegenover een storage-migratie die we hiermee juist vermijden: de opslag
verandert niet, alleen de deur**.

# Consequences

**Positief**
- Een nieuwe consument kán de fout niet meer maken: de union dwingt beide takken af.
- De 21 bekende kruisingen worden systematisch afgehandeld i.p.v. per incident gepatcht — geen
  litteken nummer 14.
- `settings` wordt zichtbaar in het type-systeem; de tweede keten stopt met verstoppen.
- De accessor is de natuurlijke plek voor de flip-afhandeling (keten A → B bij GEO-doel), die
  nu nergens bestaat.

**Negatief / op te letten**
- ~21 call-sites aanpassen, elk met eigen verificatie. Geen big-bang: gefaseerd, per PR.
- De ESLint-regel raakt ook legitieme rauwe toegang (schrijf-paden, de accessor zelf) — die
  krijgen een expliciete uitzondering, en elke uitzondering is een bewuste keuze i.p.v. een
  vergissing.
- De accessor is een leeslaag. **Schrijf-divergentie blijft**: dat twee ketens naar
  verschillende state schrijven (de publish-DRAFT-bug van 24-06) lost dit niet op. Dat is een
  aparte beslissing — zie hieronder.
- `kind: 'structured-unchosen'` dwingt elke consument tot een productbeslissing ("wat doe ik
  als er geen keuze is?"). Dat is bedoeld, maar het is werk.

# Alternatieven overwogen

- **Storage normaliseren** — structured content óók als `DeliverableComponent`-rijen
  materialiseren (of andersom). Lost lezen én schrijven op, maar vereist een datamigratie over
  alle bestaande deliverables, raakt de generatie-pipelines, en zet het multi-markt-epic op
  pauze. Te grote blast-radius voor een probleem dat een leeslaag afdekt. Herweeg dit als de
  schrijf-divergentie opnieuw bijt.
- **De 21 kruisingen één voor één patchen** — dat is precies wat er vier keer gebeurd is. Levert
  litteken 14 en lost niets voor consument 22.
- **Alleen een lint-regel, geen accessor** — verbiedt de fout maar biedt geen alternatief; elke
  consument bouwt dan zijn eigen dispatch. Dat is de huidige situatie met extra frictie.
- **Keten B laten vallen, alles naar componenten** — gooit de Puck-architectuur weg die
  aantoonbaar werkt (ADR 2026-05-22 staat overeind; het probleem is de toegang, niet de keuze).

# Notes

De les die deze ADR eigenlijk vastlegt: **"hergebruik het bestaande model" is geen hergebruik
als je alleen de rij hergebruikt en niet de keten.** De tradeoff-sectie van 2026-05-22 zou de
zin *"elke bestaande en toekomstige lezer van content moet vanaf nu weten welke van de twee
opslagvormen geldt"* moeten hebben bevat. Dat is een sjabloon-vraag waard bij elke volgende
ADR die een tweede opslagvorm introduceert: **wie leest dit veld vandaag, en weten die het?**
