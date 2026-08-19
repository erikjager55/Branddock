---
id: i18n-namespace-locality
title: i18n — namespaces die alleen werken zolang een ánder scherm ze geladen heeft
fase: post-launch
priority: later
effort: 2-4 uur (mechanisch) + de guard uitbreiden
owner: claude-code
status: done
created: 2026-08-18
completed: 2026-08-19
related-adr: docs/adr/2026-06-28-multilingual-i18n-and-multi-market-content.md
related-spec: -
worktree: branddock-static-rendering-regressie
---

# Probleem

Op 2026-08-18 (#298) bleek dat **zes** namespaces nergens via `useTranslation()`
geladen werden, waardoor hun complete Nederlandse vertalingen nooit renderden — 84
aanroepen die stil op de Engelse `defaultValue` terugvielen. Dat is opgelost, en
geborgd met `npm run smoke:i18n-namespaces`.

Die guard beantwoordt echter een **globale** vraag: *wordt deze namespace érgens
geladen?* Er is een tweede, zwakkere vorm die hij bewust niet vangt: een component dat
`t('andere-ns:sleutel')` schrijft terwijl het die namespace **zelf** niet laadt, en
een ánder component elders in de app dat wél doet.

Dat werkt — zolang dat andere component al gemount is geweest. Is het scherm nog niet
bezocht, dan is de namespace niet in de store en valt de lookup terug op het Engels.
Het gedrag hangt dus af van de volgorde waarin je door de app klikt, en dat is precies
het soort bug dat in een demo opduikt en in een test nooit.

Bekende vindplaatsen op het moment van schrijven (na de fix van #298):
`brandstyle-review` in `ReviewSummaryHeader`, `products-registry` in
`products/constants/category-i18n.ts`, plus `campaigns-content-inputs`,
`consistent-models-registry`, `media-registry` en `trends-personas-registry`.

# Voorstel

1. **Maak de verwijzing lokaal.** Elk component dat `t('ns:…')` schrijft, laadt die
   namespace zelf: `useTranslation(['eigen-ns', 'andere-ns'])`, met de eigen namespace
   **vooraan** zodat kale sleutels hun default houden. Dat is exact de ingreep uit
   #298 en kost één regel per bestand.
2. **Scherp de guard aan** van "wordt hij ergens geladen" naar "wordt hij geladen in
   het bestand dat hem aanroept". Dat is dezelfde scan in
   `scripts/smoke-tests/i18n-namespace-reachability.ts`, maar dan per bestand in
   plaats van globaal.
3. Voor niet-component-bestanden die een `TFunction` **doorkrijgen** (zoals
   `lib/claw/quick-actions.ts`) hoort de namespace bij de aanroeper. Die gevallen
   moeten expliciet uitgezonderd of naar hun caller herleid worden — anders wordt de
   strengere guard een bron van ruis.

# Uitkomst 2026-08-19

⚠️ **Vijf van de zes gedocumenteerde vindplaatsen bestonden niet meer.** Nagemeten met
een per-bestand-scan over 2610 bestanden: bij `products-registry`,
`campaigns-content-inputs`, `consistent-models-registry`, `media-registry` en
`trends-personas-registry` laadt inmiddels élke aanroeper de namespace zelf. Ze zijn
sinds het schrijven van deze taak stilletjes opgelost. Alleen `brandstyle-review` in
`ReviewSummaryHeader` was er nog — die werkte alleen zolang een van de
SystemRole-schermen al gemount was geweest.

Daarmee verschoof het zwaartepunt van opruimen naar de guard: één regel code-fix, en
de bewaking die voorkomt dat het terugkomt.

**Wat de guard nu doet** (`scripts/smoke-tests/i18n-namespace-reachability.ts`):
1. GLOBAAL — wordt elke aangeroepen namespace érgens geladen? (bestond al)
2. LOKAAL — laadt het bestand dat `t('ns:…')` schrijft hem ook zélf? (nieuw)

`TFUNCTION_RECIPIENTS` is de gedocumenteerde uitzondering voor bestanden die een
`TFunction` doorkrijgen. **Die lijst is leeg, en dat is een meting**: op 2026-08-19
bestond er geen enkel zo'n geval. De taak voorzag ruis uit die hoek; die is er niet.

**Kalibratie**: de fix terugdraaien maakt de guard rood op dat bestand, en een nieuw
geval introduceren in `MediaCardList` wordt óók gevonden.

⚠️ **Restpunt**: `npm run smoke:i18n-namespaces` draait in **geen enkele workflow**.
De guard uit #298 heeft dus nooit automatisch gedraaid. `ci.yml` is geclaimd door een
andere sessie met een open PR, dus de regel is daar aangedragen in plaats van zelf
toegevoegd. Zie `tasks/document-lang-followups.md` §A voor het bredere patroon.

# Waarom dit niet in #298 zat

De globale variant is bewijsbaar kapot (een namespace die nergens laadt, rendert
nooit); de lokale variant is bewijsbaar fragiel maar niet altijd kapot. Dat is een
ander soort claim, en het aanscherpen van de guard raakt tientallen bestanden buiten
de scope van die PR.

# Acceptatiecriteria

- [ ] Elk bestand dat een namespace aanroept, laadt hem ook zelf
- [ ] De guard controleert per bestand in plaats van globaal, met een expliciete
      uitzonderingslijst voor doorgegeven `TFunction`s
- [ ] **Discriminatie-bewijs**: de aangescherpte guard faalt aantoonbaar op een
      teruggezette vindplaats, mét de juiste bestandsnaam (les 2026-08-18)
- [ ] Steekproef op een echte i18next-instantie in `nl`: de betrokken schermen tonen
      Nederlands zonder dat er eerst een ander scherm bezocht is

# Out of scope

- Nieuwe talen of vertaalwerk — dit gaat puur over bereikbaarheid van wat er al ligt.
- De server-side teksten (mails, PDF) die buiten de client-i18next-laag vallen; zie de
  meertaligheid-ADR.
