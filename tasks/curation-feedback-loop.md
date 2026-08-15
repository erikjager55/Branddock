---
id: curation-feedback-loop
title: Feedback-loop → curatie-suggesties (R4, fase 2)
fase: post-launch
priority: now
effort: ~1,5 dag
owner: claude-code
status: done
created: 2026-08-15
completed: 2026-08-15
related-adr: -
related-spec: docs/specs/brandstyle-designbibliotheek-verbeterplan.md (R4, §5.3)
worktree: branddock-curation-feedback-loop
---

# Probleem

Het verbeterplan noemt R4: *"F-VAL-overtredingen, user-overrides en review-feedback zijn signalen
over de kwaliteit van de bibliotheek zelf, maar stroomden nergens terug."* Gevraagde uitkomst:
*"regel X wordt in 80% van generaties overtreden — te streng geformuleerd of verkeerd
geëxtraheerd?"*

**De logging bestond al.** Elke generatie schrijft een `ContentFidelityScore` met geneste
`BrandReviewFinding`-rijen (`fidelity-runner.ts:495-528`), en `mapViolationToFindingInput` zet
`{ ruleId, ruleType, pattern }` in `evidence`. Lokaal stonden er 331 scores en 1141 findings op 5
workspaces. Sinds #457 lopen ook de StyleguideRule-overtredingen mee via `mergeRuleResults`.

Wat ontbrak was de **aggregatie per regel** en het **tonen** ervan.

# Voorstel

Aggregeer de bestaande findings per regel, filter op een drempel, en toon ze als asks in het
kalibratie-paneel — met een uitvoerbare correctie erbij. Geen nieuwe logging, geen schema-wijziging.

# Acceptatiecriteria

- [x] Een regel die ≥15% van de generaties (min. 10) overtreedt levert één ask op, met percentage,
      aantal generaties en de leesbare regel
- [x] Een regel die niet meer bestaat levert **geen** ask op
- [x] Aggregatie op `(ruleType, pattern)`, niet op `ruleId` — bewezen tegen de echte data
- [x] `heuristic:*`-overtredingen komen niet in de asks
- [x] Een auto-synced regel biedt "haal uit je voice guide", en die actie laat de regel ook echt
      verdwijnen — bewezen op een wegwerp-workspace
- [x] Het paneel doet geen eigen fetch; `calibration-report.ts` blijft puur
- [x] Geen schema-wijziging, dus geen Neon-push
- [x] `npx tsc --noEmit` 0 errors · `npm run lint` 0 nieuwe errors (1 pre-existing op main)
- [x] Bestaande gates groen: `smoke:preserve-user-rows` 43/43 · `smoke:brand-library` 36/36 ·
      `smoke:styleguide-rules` 51/51 · `smoke:styleguide-rules-fval` 17/17 ·
      `smoke:review-drift` 23/23 · `smoke:review-drift-reset` 14/14 ·
      `eval:brand-manifest-golden` 14/14 · `smoke:geo-fidelity` 20/20

# Bestanden die ik aanraak

**Nieuw**: `src/lib/brandstyle/rule-violation-stats.ts` (puur) ·
`src/app/api/brandstyle/curation-signals/route.ts` ·
`scripts/smoke-tests/rule-violation-stats.ts` · `scripts/dev/verify-curation-signals.ts` ·
`scripts/dev/verify-curation-action.ts`

**Gewijzigd**: `src/lib/brandstyle/calibration-report.ts` ·
`src/features/brandstyle/components/BrandstyleCalibrationPanel.tsx` ·
`src/features/brandstyle/components/BrandStyleguidePage.tsx` ·
`src/features/brandstyle/api/brandstyle.api.ts` ·
`src/features/brandstyle/hooks/useBrandstyleHooks.ts` ·
`src/lib/ui-i18n/locales/{nl,en}/brandstyle.ts` · `package.json` · `docs/changelog.md`

# Bestanden die ik NIET aanraak

- `/api/brand-alignment/insights` — ander doel (categorie-aggregatie voor het pilot-KPI-dashboard)
- De heuristiek-regels
- De auto-sync-guards in `brand-rules/[id]` — die blokkade is bewust en wordt gerespecteerd

# Smoke test plan

1. `npm run smoke:rule-violation-stats` — 29/29, DB-vrij: sleutel-stabiliteit, heuristiek-filter,
   dode-regel-filter, dedupe per generatie, drempels.
2. `npx tsx scripts/dev/verify-curation-signals.ts` — de aggregatie over de échte findings, per
   workspace. Read-only.
3. `npx tsx scripts/dev/verify-curation-action.ts` — 6/6: bewijst dat de knop werkt, op een
   wegwerp-workspace.

# Risico's

- **De suggestie is niet weg te klikken.** Wie besluit dat een regel terecht streng is, ziet 'm
  blijven staan. Bewust geen dismiss-tabel: op de echte data surfacet er één per workspace.
- **De noemer is grofkorrelig**: alle generaties van de workspace, ook die waar de regel via
  `contentTypeFilter` nooit op van toepassing was. Voor zo'n regel onderschat het percentage. Staat
  in de ask-tekst.
- **`pattern` is voor StyleguideRule een omschrijving** (`describePattern`), geen letterlijke term.
  Prima als sleutel én label, maar de twee lanes lezen verschillend.

# Out of scope

- **Token-overrides** (de tweede helft van R4). Bewust uitgesteld: die pijp is vandaag leeg — alle
  158 kleuren staan op `scraped` en nul styleguides hebben claims. Die vult zich pas na W5 (#258),
  naarmate gebruikers daadwerkelijk gaan bewerken.
- Review-feedback als signaal (de derde helft van R4).
- Een regels-beheer-UI. De correcties zijn inline; een echte beheerpagina is apart werk.

# Notes

## De vondst die het ontwerp bepaalde: aggregeer niet op `ruleId`

Dat is de voor de hand liggende sleutel en precies de verkeerde. Zowel `brand-rule-sync.ts:179` als
`rule-structurer.ts:391` doen `deleteMany` + `createMany`, dus élke sync deelt verse cuid's uit en
verweest de historie. Gemeten op de echte data: van de **24 gerefereerde regel-ID's bestonden er nog
3**. Een suggestie op `ruleId` zou dus in 87% van de gevallen naar een niet-bestaande regel wijzen.

`(ruleType, pattern)` overleeft de sync wél — beide staan al in dezelfde `evidence`-JSON. Daardoor
werkt het met terugwerkende kracht op alle bestaande findings, zónder schema-wijziging of migratie.
Resultaat op de echte data: 6 van de 7 geaggregeerde regels leeft nog.

## Het venster is een aantal, geen periode

Eerste versie gebruikte 30 dagen. Het verificatie-harnas weerlegde dat meteen: **nul signalen op
alle vijf de workspaces**, terwijl er 331 metingen lagen — het gebruik is bursty (Linfi deed 178
generaties in vijf weken, daarna niets, en dat is inmiddels 45+ dagen geleden).

Op de laatste 200 generaties begrenzen werkt voor beide gebruikspatronen, en de noemer is dan
precies "de generaties waar we naar gekeken hebben" — ook eerlijker uit te leggen. Daarna surfacet
Linfi correct *luxe · 19% (34/178)* en valt de rest onder de drempel.

Zonder dat harnas was dit als werkende feature gemerged die op geen enkele workspace iets liet zien.

## Wat de twee code-reviews eruit haalden

Alle negen gates waren groen en het actiepad-harnas stond op 4/4 — en tóch faalde de knop voor de
meeste regels. Twee vondsten:

1. **De correctie wees naar een woord dat de gebruiker nooit heeft ingetypt.** De sync draait elke
   term door `expandStemVariants`, dus de regel met pattern `exclusieve` hoort bij de voiceguide-term
   `exclusief`. Mijn actie filterde de array op het *pattern*, vond niets, en gooide
   *"exclusieve is no longer in your voice guide"*. Het label toonde bovendien een woord dat nergens
   in de voiceguide staat. Geverifieerd op de echte data: Linfi's `wordsWeAvoid` bevat `exclusief`,
   niet `exclusieve` — en mijn eigen changelog noemde `exclusieve` als top-overtreder waarvoor de
   knop zou werken. Opgelost met een reverse-index `variant → bron-term`; zonder resolveerbare term
   komt er géén knop in plaats van een knop die zeker faalt.
2. **`auto:wordsWeAvoid` is niet de voiceguide.** Dat is de legacy-stream uit
   `BrandPersonality.frameworkData`, beheerd door een andere sync. Een voiceguide-PATCH raakt die
   rijen nooit. Eén workspace heeft er 17 naast een lege voiceguide — daar zou elke klik falen. Die
   bron is uit de mapping gehaald.

Het harnas miste beide omdat het uitsluitend `luxe` testte — precies het woord waarvan de basisvorm
de stem-expansie overleeft. Het test nu ook een woord dát expandeert.

Verder uit de reviews: drie van de vier correctie-routes invalideerden de brandstyle-cache niet
(waardoor een geslaagde correctie er als een mislukte uitzag en een tweede klik hard faalde); de
`take` op de findings had geen `orderBy` (heap-volgorde bepaalt dan wie de cap overleeft, wat elk
percentage structureel te laag maakt); dezelfde term uit twee bronvelden leverde één ask op die maar
één veld opschoonde, waarna de regel bleef bestaan; beide lanes deelden een sleutel, zodat een
styleguide-regel stil bij een voiceguide-ask werd opgeteld; en de StyleguideRule-lane leverde
knoploze asks op omdat de structurer élke regel ADVISORY maakt en ik alleen een verzwak-knop bood.

## De actie zit op de bron, niet op de regel

Van de 398 BrandRules zijn er **388 `auto:*`** en 10 `manual`. `PATCH/DELETE /api/brand-rules/[id]`
weigert auto-regels expliciet ("Cannot edit auto-synced rule — update the source field instead"), en
élke top-overtreden regel ("luxe", "perfect", "exclusieve", "premium") is
`auto:voiceguide.wordsWeAvoid`.

Die guard is bewust en wordt niet omzeild. Het curatiepunt van een gesynct artefact is de bron: de
term uit `wordsWeAvoid`/`vocabularyDont` halen via `PATCH /api/brandvoiceguide`, waarna de re-sync
de regel opruimt. `verify-curation-action.ts` bewijst dat end-to-end.

Per regelsoort:

| Soort | Actie | Route |
|---|---|---|
| `auto:voiceguide.*` | "Remove *luxe* from your voice guide" | `PATCH /api/brandvoiceguide` |
| `manual` BrandRule | Advisory maken / verwijderen | `PATCH`/`DELETE /api/brand-rules/[id]` |
| `StyleguideRule` | Advisory maken | `PATCH /api/brandstyle/rules/[ruleId]` (stempelt `source: 'user'`) |

## Dezelfde compiler voor dezelfde sleutel

Voor de StyleguideRule-lane is `evidence.pattern` de uitkomst van `describePattern(constraint)`, geen
letterlijke term. De route haalt de levende regels daarom door **`compileStyleguideRules`** — dezelfde
functie die de violations produceerde. Elke andere afleiding zou stil naast de sleutel grijpen.
