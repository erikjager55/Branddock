---
id: curation-loop-completion
title: R4 afgemaakt + de beperkingen die bijten
fase: post-launch
priority: now
effort: ~1,5 dag
owner: claude-code
status: done
created: 2026-08-15
completed: 2026-08-15
related-adr: -
related-spec: docs/specs/brandstyle-designbibliotheek-verbeterplan.md (R4, §5.3)
worktree: branddock-curation-loop-completion
---

# Probleem

De brandstyle-stack (#461-#466) liet twee dingen bewust liggen: de andere twee poten van R4
(token-overrides en review-feedback als signaal) en zeven gedocumenteerde beperkingen.

De belangrijkste beperking bleek een gat in de feature die net was opgeleverd: de noemer was plat
`WINDOW_GENERATIONS = 200`, ongeacht wanneer een regel bestond. Een regel die in al zijn relevante
generaties botst maar pas 50 generaties oud is, scoorde 12/200 = 6% en surfacete nooit — de
feedback-loop was blind voor precies de regels die net gecureerd zijn.

# Voorstel

Noemer per regel begrenzen op de generaties waarin die regel van toepassing kón zijn, dismiss
toevoegen, en de twee R4-poten bouwen mét een eerlijke lege staat.

# Acceptatiecriteria

- [x] Een regel wordt beoordeeld tegen zijn eigen levensduur zodra `createdAt` betrouwbaar is;
      is die datum aantoonbaar een sync-artefact, dan geldt het volle venster (zie Notes)
- [x] Een regel met een `contentTypeFilter` telt alleen passende generaties; zonder filter in de
      workspace doet de route géén extra join
- [x] Een weggeklikte suggestie blijft weg; ná een wijziging aan die regel komt hij terug
- [x] ≥25% van de **geëxtraheerde** kleuren gecorrigeerd (min. 3) levert één ask op; handmatig
      toegevoegde en geïmporteerde kleuren tellen niet mee
- [x] Een NEEDS_WORK-review mét feedback levert een ask op die de tekst citeert
- [x] Bij <10 generaties toont het paneel "nog te weinig data", niet stilte
- [x] De backfill raakt alleen PDF-workspaces zónder `detectorSource`; het UPDATE-blok staat
      uitgecommentarieerd zodat `psql -f` niets muteert
- [x] `npx tsc --noEmit` 0 errors · `npm run lint` 0 errors
- [x] Alle gates groen: `smoke:rule-violation-stats` 43/43 · `preserve-user-rows` 43/43 ·
      `review-drift` 23/23 · `review-drift-reset` 14/14 · `brand-library` 36/36 ·
      `styleguide-rules` 51/51 · `styleguide-rules-fval` 17/17 · `geo-fidelity` 20/20 ·
      `brand-manifest-golden` 14/14

# Bestanden die ik aanraak

**Nieuw**: `src/app/api/brandstyle/curation-signals/dismiss/route.ts` ·
`scripts/dev/backfill-curated-colors.sql` · `scripts/dev/verify-r4-signals.ts`

**Gewijzigd**: `prisma/schema.prisma` (1 kolom) · `src/lib/brandstyle/rule-violation-stats.ts` ·
`src/app/api/brandstyle/curation-signals/route.ts` · `src/lib/brandstyle/calibration-report.ts` ·
`src/lib/brandstyle/review-sections.ts` · `BrandstyleCalibrationPanel.tsx` ·
`BrandStyleguidePage.tsx` · `brandstyle.api.ts` + hooks · i18n nl/en ·
`scripts/smoke-tests/rule-violation-stats.ts` · `scripts/dev/verify-curation-signals.ts` ·
`docs/changelog.md`

# Bestanden die ik NIET aanraak

- De drie beperkingen die bewust blijven staan (claim-release-knop, transactie op `claim-fields`,
  component-rename-duplicaat) — zie `tasks/done/refresh-preserves-user-data.md`
- De regels-beheer-UI · de heuristiek-regels

# Smoke test plan

1. `npm run smoke:rule-violation-stats` — 43/43, DB-vrij: leeftijdsgrens, artefact-test,
   monotonie, contentType-filtering, dismiss.
2. `npx tsx scripts/dev/verify-curation-signals.ts` — read-only over de échte findings; toont nu de
   eigen noemer per regel.
3. `npx tsx scripts/dev/verify-r4-signals.ts` — 12/12 op een wegwerp-workspace: beide nieuwe
   signalen, de drempels, de lege staat, en dat toegevoegde kleuren niet als correctie tellen.
4. `scripts/dev/backfill-curated-colors.sql` — dry-run eerst; lokaal 22 kleuren over 3
   PDF-workspaces, 136 URL-kleuren ongemoeid.

# Risico's

- **De leeftijdsgrens doet vandaag niets.** Alle bestaande regels dragen een sync-artefact-datum,
  dus het gedrag is identiek aan #466. Hij wordt vanzelf actief voor regels die ná deze deploy
  ontstaan, nu de syncs `createdAt` bewaren. Dat is eerlijker dan een metriek die mooie cijfers
  maakt uit een datum die niets betekent.
- **Twee van de drie nieuwe signalen tonen voorlopig niets** (overrides en review-feedback). Bekend
  en zichtbaar gemaakt via de lege staat.
- **De backfill is onomkeerbaar zonder handwerk**: een kleur op `user` wordt nooit meer door de
  scraper ververst. Daarom twee voorwaarden (PDF én geen `detectorSource`), een dry-run vooraf, en
  een UPDATE-blok dat uitgecommentarieerd in git staat.

# Notes

## Wat de twee code-reviews eruit haalden

Alle gates waren groen en tóch zaten er vier defecten in, waarvan twee met echte impact op klanten:

1. **Het SQL-script voerde de onomkeerbare UPDATE meteen uit.** De header zei "draai de dry-run
   eerst", maar `psql -f` draait het `BEGIN…COMMIT`-blok in hetzelfde bestand mee — en mijn comment
   stond omgekeerd ("comment het blok uit zodra de dry-run klopt"). Wie het gedocumenteerde commando
   plakte had de backfill al gedraaid. Het UPDATE-blok staat nu uitgecommentarieerd.
2. **De backfill zette het nieuwe override-signaal vals aan.** `source: 'user'` wordt door drie
   paden gezet: een handmatig *toegevoegde* kleur (POST), een *gecorrigeerde* kleur (PATCH), en de
   backfill. Alleen de tweede zegt iets over extractiekwaliteit. Na de backfill stond Barneveld op
   100% en zou het paneel melden "je corrigeerde 10 van de 10 kleuren met de hand" — op een
   workspace waar niemand iets corrigeerde, en niet weg te klikken. Nu telt het signaal alleen
   kleuren mét een `detectorSource`: van wat de scraper extraheerde, hoeveel moest jij corrigeren.
   Geverifieerd: de drie backfill-workspaces hebben 0 geëxtraheerde kleuren en het signaal zwijgt.
3. **`effectiveStart` was niet-monotoon.** Zie hieronder.
4. **De reset was onbereikbaar**: wie alles wegklikte zag een groen "alles in orde" zonder spoor of
   weg terug. Er is nu een teller in de payload en een "toon verborgen suggesties"-link, óók in de
   schone staat.

Kleiner, ook gefixt: de sleutellimiet van 300 tekens lag onder wat de styleguide-lane kan
produceren (een `describePattern()`-woordenlijst), de dismiss-write is nu een atomische
`array_append` in plaats van read-modify-write, de dry-run telde een kruisproduct, `sourceType='PDF'`
is aangevuld met `detectorSource IS NULL` (dat veld wordt bij élke analyse overschreven, dus het
zegt "laatste analyse was een PDF", niet "deze rijen komen uit een document"), en de detail-tekst
beweerde nog het oude noemer-gedrag.

## De vondst die het ontwerp redde: `createdAt` liegt

De leeftijdsgrens leek triviaal — `rule.createdAt` staat er gewoon. Het harnas tegen de échte data
weerlegde dat meteen: waar eerst `luxe 19%` surfacete, kwam er **nul** uit.

Oorzaak: **alle 398 BrandRules hebben `createdAt` van gisteren**, terwijl alle generaties uit
mei-juli komen. `brand-rule-sync` doet `deleteMany` + `createMany`, dus die datum is de leeftijd van
de *rij*, niet van de regel. Elke regel leek nieuwer dan alle data → nul geldige generaties → geen
enkele statistiek.

Exact dezelfde val als het aggregeren op `ruleId` uit #466, op een ander veld. Ik had de gotcha
gisteren zelf opgeschreven en liep er toch in.

**Mijn eerste oplossing was fout en een review ving 'm.** Ik liet de eerste treffer als begin
gelden wanneer die vóór `createdAt` lag. Dat leverde mooie cijfers op (`perfect` van 7% naar 24%)
maar is **niet-monotoon**: de noemer begint dan per definitie bij een treffer, dus een regel met 4
overtredingen scoort lager dan dezelfde regel met 3. Slechter presteren maakte je onzichtbaar. Een
metriek met die eigenschap hoort niet in productie, hoe goed de demo er ook uitzag.

**Wat het wel werd**: ligt `createdAt` ná de nieuwste generatie in het venster, dan kán het geen
echte aanmaakdatum zijn — een regel ontstaat niet ná de data waarin hij overtredingen heeft. Dan
negeren we de grens. De noemer hangt zo alleen van het venster af, nooit van de meting zelf. Op de
huidige data betekent dat: geen enkele grens actief, gedrag identiek aan #466 — eerlijk, want we
wéten de leeftijd niet.

**En de wortel is aangepakt**: beide syncs bewaren `createdAt` nu over hun delete+create heen,
gesleuteld op `(source, pattern)`. Vanaf nu is het veld dus wél een leeftijd, en wordt de grens
vanzelf actief voor regels die na deze deploy ontstaan. Bewezen in `verify-curation-action.ts`.

## Dismiss heeft geen expiry nodig

De sleutel is `<lane>::<ruleType>::<pattern>`. Verander je de regel, dan verandert de sleutel en
komt de suggestie vanzelf terug. Wegklikken bevriest dus deze regel in deze vórm, niet het
onderwerp — precies wat je wilt, en het scheelt een vervalmechanisme.

## De contentType-noemer is vandaag theoretisch

Geen van de 398 regels heeft een `contentTypeFilter`. De code is er, maar de join draait alleen
wanneer minstens één levende regel er een heeft — dus vandaag kost hij niets, en zodra iemand er een
zet klopt de noemer meteen. Gedekt in de pure smoke met synthetische rijen.
