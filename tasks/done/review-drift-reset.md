---
id: review-drift-reset
title: Reviewstatus-reset bij sectie-wijziging na re-analyse
fase: post-launch
priority: now
effort: 1,5-2 dagen
owner: claude-code
status: done
created: 2026-08-14
completed: 2026-08-14
related-adr: -
related-spec: docs/specs/brandstyle-designbibliotheek-verbeterplan.md (W5)
worktree: branddock-review-drift-reset
---

# Probleem

W5 maakte re-analyse niet-destructief: een refresh behoudt reviews en snapshots in plaats van de
styleguide te wissen. Daarmee ontstond een nieuw gat, dat het verbeterplan zelf benoemt
(§W5, "hash-anker"): *"per sectie bepalen wat écht gewijzigd is … en alleen dáár de reviewstatus
resetten"*. Een goedkeuring hoort bij een specifieke versie van de data — vandaag blijft
`colors-brand` op APPROVED staan nadat een re-scrape de merkkleuren heeft veranderd.

De machinerie ligt al klaar en wordt hergebruikt:

| Bestaand | Wat het doet |
|---|---|
| `analysis-engine.ts` fase 6 | maakt na elke analyse een snapshot, ná `writeResultToDb` — de vorige snapshot is dus de "voor", de nieuwe de "na" |
| `createBrandstyleSnapshot` | hash-dedupe: `created: false` = niets veranderd, een gratis en exacte no-op-gate |
| `computeSnapshotDiff` | gestructureerde diff (`colors/typography/rounded/spacing/elevation/components`) mét `cosmetic`-vlag voor anti-aliasing-ruis |
| `ACTIVE_REVIEW_SECTIONS` | de 16 token-granulaire review-keys die de publish-gate vormen |

Wat ontbrak: de mapping van diff-categorie naar review-sectie, en de reset zelf.

# Voorstel

Een pure mapper (`review-drift.ts`) die een `SnapshotDiff` omzet in de geraakte
`ReviewSectionKey`s, en een reset die in fase 6 van de analyse draait zodra er daadwerkelijk een
nieuwe snapshot is geschreven. Alleen `APPROVED` gaat terug naar `PENDING`, met een nieuwe
`staleAt`-stempel zodat het kalibratie-paneel het verschil kent tussen "gereset door drift" en
"nog nooit bekeken". `published` blijft ongemoeid.

# Acceptatiecriteria

- [x] Een niet-cosmetische kleurwijziging zet `colors-brand` van APPROVED naar PENDING mét
      `staleAt`; een cosmetische wijziging (RGB-afstand < 3) doet dat **niet**
- [x] `NEEDS_WORK` blijft staan, inclusief `feedback`
- [x] `published` blijft ongewijzigd — bewezen in de DB-smoke én in de echte analyse-run
- [x] Een re-analyse zonder wijzigingen (`created: false`) reset niets
- [x] Een logo-wijziging reset `brand-assets-logos`
- [x] Het kalibratie-paneel toont per gereset sectie een `review`-ask; die verdwijnt zodra de
      gebruiker de sectie opnieuw beoordeelt (`staleAt` → null)
- [x] Na een analyse zijn de brand-library-, rule- en brand-context-cache geïnvalideerd
- [x] `npx tsc --noEmit` 0 errors · `npm run lint` 0 nieuwe errors (1 pre-existing op main)
- [x] `smoke:review-drift` 23/23 · `smoke:review-drift-reset` 14/14 · `smoke:brand-library` 36/36 ·
      `smoke:styleguide-rules` 51/51 · `eval:brand-manifest-golden` 14/14 ·
      `smoke:geo-fidelity` 20/20

# Bestanden die ik aanraak

**Nieuw**: `src/lib/brandstyle/review-drift.ts` (puur) ·
`src/lib/brandstyle/review-drift-store.ts` (Prisma) · `scripts/smoke-tests/review-drift.ts` ·
`scripts/smoke-tests/review-drift-reset.ts` · `scripts/dev/verify-drift-run.ts`

**Gewijzigd**: `prisma/schema.prisma` (`StyleguideReview.staleAt`) ·
`src/lib/brandstyle/analysis-engine.ts` · `src/lib/brandstyle/review-sections.ts` ·
`src/lib/brandstyle/calibration-report.ts` ·
`src/features/brandstyle/components/BrandstyleCalibrationPanel.tsx` ·
`src/features/brandstyle/components/review/ReviewSummaryHeader.tsx` (component-map hergebruikt
i.p.v. lokaal gedupliceerd) · `src/features/brandstyle/types/brandstyle.types.ts` ·
`src/app/api/brandstyle/finalize/route.ts` · `src/app/api/brandstyle/review/[section]/route.ts` ·
`package.json` · `docs/changelog.md`

# Bestanden die ik NIET aanraak

- De publish-/finalize-semantiek zelf
- De auto-unpublish bij een *handmatige* niet-APPROVED review (`review/[section]/route.ts`) —
  bewust asymmetrisch, zie Notes
- De `savedForAi`-vlaggen (een andere as dan review)
- De export- en rendererpaden

# Smoke test plan

1. `npm run smoke:review-drift` — pure mapping: elke diff-categorie naar de juiste sectie,
   cosmetische kleuren genegeerd, `system-roles` bij elke tokenwijziging, lege diff → lege set.
2. `npm run smoke:review-drift-reset` — hermetische scratch-workspace met APPROVED-reviews en twee
   snapshots; asserteert dat alleen de juiste secties PENDING worden, dat `NEEDS_WORK` en
   `published` ongemoeid blijven, en dat een tweede run niets doet.
3. Echte run: `npx tsx scripts/dev/verify-drift-run.ts` — wegwerp-workspace op een echte site,
   synthetische "voor"-snapshot, dan een volledige analyse. De enige test die de hele keten
   (engine → fase 6 → reset) draait.
4. Schema: `npx prisma db push` lokaal; bij deploy een geverifieerde Neon-push.

# Risico's

- **Lokaal bestaan nul review-rijen** (alle 18 workspaces), dus de reset is op deze data een no-op;
  de DB-smoke maakt daarom zijn eigen rijen. Zelfde geldt op prod voor elke workspace die
  `finalize` heeft gebruikt — dat verwijdert álle review-rijen.
- **Schema-wijziging** → handmatige Neon-push mét verificatie-query (gotcha 2026-07-13).
- **Te vaak resetten** leert de gebruiker wegklikken; vandaar de cosmetic-filter en de
  `created`-gate.

# Out of scope

- De twee W5-gaten die de inventarisatie blootlegde (zie Notes) — eigen taak.
- Depubliceren bij drift (bewuste keuze van de user).
- Zichtbaarheid in de review-badge en de History-tab (idem).

# Notes

## Bewijs

**Echte analyse-run** (`scripts/dev/verify-drift-run.ts`, wegwerp-workspace op dtsede.nl): de
engine schreef een verse snapshot, de driftreset vuurde, en drie goedkeuringen zijn ingetrokken
mét `staleAt` — terwijl `published` op true bleef en de analyse `COMPLETE` haalde. Dat is het enige
bewijs dat de wiring in fase 6 écht draait; de DB-smoke test de reset in isolatie.

Het harnas forceert de drift met een *synthetische* oudere snapshot, omdat een echte
site-wijziging niet af te dwingen is: zonder dat zou de hash-dedupe (`created: false`) terecht
niets doen.

## Afwijkingen van het plan

- **Twee bestanden in plaats van één**: `review-drift.ts` (puur) en `review-drift-store.ts`
  (Prisma). Zonder die knip trekt de smoke `@/lib/prisma` binnen en is hij niet DB-vrij — zelfde
  seam als in taak 1 en 2.
- **De reden per sectie wordt niet gepersisteerd.** De mapper produceert wel een specifieke reden
  ("2 kleuren gewijzigd"), maar die staat alleen in de analyse-log; het kalibratie-paneel toont de
  generieke formulering. Een tweede kolom daarvoor woog niet op tegen de winst.

## Dekking — bewust deelbaar

Detecteerbaar via de snapshot-diff: `colors-brand`, `colors-neutrals`, `colors-semantic`,
`brand-assets-fonts`, `spacing-scale`, `spacing-radii`, `spacing-shadow`, `system-roles`,
`components-buttons`, en `brand-assets-logos` (via `scrapedJson.logoUrls`).

**Niet detecteerbaar**: de overige zes `components-*`-secties. `buildComponentTokens` in de
design-system-resolver emit uitsluitend `button-*`-varianten, dus form-inputs, status-chips,
product-cards, feature-icons, top-navigation en quote-blocks komen nooit in de diff voor. Dat
vraagt een fingerprint per componenttype in de snapshot — follow-up, geen sluipende halve dekking.

## Gevonden tijdens de uitvoering

1. **Lokaal bestaan nul review-rijen** (alle 18 workspaces). De feature raakt dus alleen
   workspaces ín de review-flow; `finalize` verwijdert álle review-rijen ("I'm done, stop asking
   me"), waarna er niets meer in te trekken valt. Inherent aan hoe finalize werkt.
2. **`prisma db push` liep vast op een pre-existing drift** (`LandingPage.livePublishId` mist een
   unique constraint lokaal). Die drift is niet van deze taak, dus de kolom is met een gerichte
   `ALTER TABLE … ADD COLUMN IF NOT EXISTS` toegevoegd in plaats van de drift stilzwijgend mee te
   pushen. **Bij de prod-push hetzelfde doen** — of de drift eerst apart beoordelen.
3. **`dam-auto-tagger` faalt op élke analyse met `400 temperature is deprecated for this model`**
   (3× gezien in de echte run). Dat is de klasse van `isTempDeprecatedModel`
   (`src/lib/ai/anthropic-client.ts`), die kennelijk niet op dit pad wordt toegepast: de
   automatische beeld-tagging werkt dus al een tijd niet. Pre-existing en los van deze taak.
4. **De asymmetrie is bewust**: een handmatige "needs work" depubliceert wél
   (`review/[section]/route.ts`), een driftreset niet. Een klik is een besluit, drift is een
   signaal — en sinds taak 1/2 hangt de hele merkcontext aan `published`.

## De twee W5-gaten die hier níet zijn opgelost

De inventarisatie liet zien dat W5's belofte ("een re-scrape behoudt alle overrides en reviews")
maar half klopt. Reviews blijven staan; overrides en user-edits niet:

1. **De zes `*Override`-vlaggen hebben geen enkele writer.** `buttonProfileOverride` c.s. worden
   alleen gelezen (`analysis-engine.ts:995-1050`); een repo-brede grep vindt nul schrijvers. De
   "override-bescherming" waar de analyze-routes en `rescrape-brand.ts` naar verwijzen is vandaag
   dus een no-op.
2. **Een refresh vernietigt user-edits.** `StyleguideColor` wordt volledig gewist en opnieuw
   aangemaakt (handmatig toegevoegde kleuren weg, en elke rij krijgt een nieuw id);
   `StyleguideLogo` idem zónder source-filter — ook geüploade logo's, ondanks de comment die het
   tegendeel beweert; `StyleguideComponent` idem. Elke `|| []` in `writeResultToDb` overschrijft
   bovendien een gecureerde donts-lijst met een lege array zodra de AI niets teruggeeft. Alleen
   `StyleguideFont` filtert correct op `source: 'DETECTED'`.

Dit verdient een eigen taak; het is groter en risicovoller dan de reviewreset.
