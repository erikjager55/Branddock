# Autonoom werkplan — merkfonts, meetwerk en twee landmijnen

> **Sessie**: `41832dfd` · opgesteld 2026-08-18, na Eriks verzoek om een plan voor een
> langere autonome periode. Eén van vier parallelle sessies.
> **Leesbaar voor de andere sessies** — dit is tegelijk mijn claim.

---

## Claim (conventie 1)

| Taak | Bestanden |
|---|---|
| `brand-fonts-ontbreken-op-prod` | `src/features/brandstyle/**`, `scripts/dev/typography-tab-browser-smoke.ts` |
| `seo-variant-b-differentiatie` | `src/lib/ai/seo-pipeline*.ts`, `scripts/fidelity/**` |
| `pg-major-sslmode-semantiek` | `.env.example`, `src/lib/prisma.ts`, `docs/playbooks/**` |
| `golden-set-blogpost-quality` | `promptfoo/**`, `.promptfoo-results/**`, prompt-templates blog |
| ~~`web-page-builder-acceptance-rest`~~ ✅ | geen code geraakt — twee restpunten waren achterhaald, één geskipt op meting |

**Niet van mij, afgestemd**: `build-heap-investigation`, `i18n-namespace-locality` en
`document-lang-followups` liggen bij sessie `branddock-static-rendering-regressie`
(`src/lib/ui-i18n/**`, `src/app/layout.tsx`, `src/proxy.ts`, `src/app/{oauth,reset-password,invite}/**`).
Het design system ligt bij de design-sync-sessies.

⚠️ `src/lib/prisma.ts` is een centraal bestand. Mijn wijziging daar is een startup-check van
enkele regels; meld het als je er ook in moet.

---

## Volgorde en waarom

**P1 — `brand-fonts-ontbreken-op-prod`.** De storage-audit vond `StyleguideFont.fileUrl`
**44 van de 44 keer leeg** op productie. Élk merk rendert in Inter, en dat werkt door in de
Typography-tab, PDF-exports én AI-content. Voor een product dat verkoopt op *"AI die je merk
écht kent"* is dit de duurste van alle openstaande items — niet in uren, maar in geloofwaardigheid.
De uploads zelf hebben Erik nodig (licenties); wat ík kan doen is het gat zichtbaar en
verifieerbaar maken zodat het niet opnieuw maanden onopgemerkt blijft.

**P2 — `seo-variant-b-differentiatie`.** Variant B kost een volledige generatie en levert
volgens de meting ~95% hetzelfde als A. Er ligt al een herspeel-harnas
(`scripts/fidelity/variant-b-research-ab.ts`, gebouwd voor #315), dus dit is meten met
bestaand gereedschap. Uitkomst is óf een echte differentiatie óf het schrappen van een
betaalde stap — allebei winst.

**P3 — `pg-major-sslmode-semantiek`.** Klein (1-2 uur) en het type schuld dat later duur wordt:
`pg` v9 verandert de betekenis van `sslmode=require`. Nu vastleggen kost een middag, bij de
upgrade ontdekken kost een productie-incident.

**P4 — `golden-set-blogpost-quality`.** Vier tot vijf cases zakken stabiel op ~50-60% tegen een
drempel van 70. Dat is een echte bevinding, geen flake. Meetwerk eerst; de drempel is bewust
niet verlaagd en dat blijft zo tot de oorzaak bekend is.

**P5 — `web-page-builder-acceptance-rest`.** Drie kleine concrete restpunten. Vulwerk voor als
een van de bovenstaande op iets van Erik wacht.

---

## Werkregels die ik mezelf oplegt

**Bewijslast.** Elke code-PR draagt een test die aantoonbaar rood wordt zonder de fix. Vandaag
leverde dat drie keer een vondst op: de guard-smoke vond een gat van maanden oud, de
settings-smoke bewees dat zonder rijlock een sleutel sneuvelt, en de probe-route toonde beide
armen. Groen is geen bewijs — een mutatietest wel.

**Meet vóór je prioriteert.** De retentie-indexen werden als urgent opgevoerd wegens
"onbegrensde groei" en beschermden bij meting vier rijen. De heap-hypothese stond als feit in
`ci.yml` en bleek weerlegd. De tekst van een taak beschrijft niet de toestand.

**Een negatieve uitkomst telt pas als hij kán falen.** Vandaag drie keer misgegaan, één keer
door mij: mijn probe gaf 404 omdat de map met `_` begon en Next die niet routeert. Ik had
bijna geconcludeerd dat de signal niet vuurt.

**Coördinatie.** Conventies 1-3 van sessie `branddock-static-rendering-regressie` overgenomen,
plus een vierde: mergen met `--match-head-commit $(git ls-remote …)`. Conventie 3 vangt
"ik loop achter"; deze vangt het spiegelbeeld dat bij #287 misging — een verouderde head in de
GitHub-API, waardoor een squash vijf commits opat en een gevonden regressie live liet staan.

---

## Merge-beleid tijdens Eriks afwezigheid

`main` is productie. Ik merge zélf, want een groeiende stapel groene PR's is precies de knoop
die deze ochtend een halve dag kostte — maar alleen binnen deze grenzen:

**Wel**: documentatie en taakadministratie · tests en smokes · additieve guards en meetscripts ·
bugfixes met een mutatietest die aantoonbaar rood wordt zonder de fix.

**Niet, blijft groen klaarstaan tot Erik terug is**:
- schemawijzigingen (vereisen een Neon-push — code deployt vóór de migratie, zie 13-07)
- env-variabelen op productie
- alles wat billing, credits of Stripe raakt
- mutaties op productiedata
- product- of UX-keuzes; die documenteer ik met opties en laat ik liggen

**Stoppen en wachten** bij: een tweede sessie in hetzelfde bestand · een testfout die niet met
één retry weggaat · een externe dienst die eruit ligt · scope die buiten het task-file valt.

### De CI-poort — en een correctie op mijn eigen onderbouwing

⚠️ **Eerst een rechtzetting.** De eerste versie van dit document onderbouwde regel 1 met de
bewering dat bij #333 `check` en `e2e` **nooit gedraaid** hadden en alleen Vercel groen stond.
Die kreeg ik doorgegeven van een andere sessie en ik nam hem over zonder te meten. Nagemeten:

    #333  base=main  ·  e2e pass 2m43s  ·  check pass 6m44s

De bewering is dus **onjuist** en staat hier alleen nog als correctie. Ik laat 'm zichtbaar
staan in plaats van hem weg te poetsen, want het is exact de fout waar dit document tegen
waarschuwt: een cijfer overnemen en tot beleid maken zonder de meting zelf te doen. Dank aan
`branddock-static-rendering-regressie` en `dc` voor het terugdraaien.

**Wat wél staat**, met drie waarnemingen op één dag: `e2e` hangt intermitterend op
*Install Playwright chromium* en blokkeert dan **zonder rood te worden**. Ik zag het zelf bij
#332 (30 minuten; na cancel + rerun groen in 4m12s), `dc` zag er een, `f8` meldt er een van
93 minuten. Alle drie eindigden ná ingrijpen in een pass.

Dat onderscheid is wezenlijk. "Groen terwijl er niets draaide" zou betekenen dat je iets
ongetests kunt mergen — een correctheidsgat. "Hangt zonder rood te worden" betekent dat je
kunt blíjven wachten — een doorloopprobleem. Alleen het tweede is aangetoond.

**De poort blijft desondanks alle vier de regels**, want ze zijn goedkoop en een afwezige check
is principieel niet te onderscheiden van een geslaagde. Regel 1 is dus **defensief, niet op een
waargenomen geval**:

1. `check` én `e2e` zijn **aanwezig** in de rollup én `COMPLETED/SUCCESS` — afwezigheid is een
   blocker (defensief: nog nooit voorgekomen)
2. de base van de PR is **`main`**, niet een andere feature-branch (idem defensief)
3. de head-SHA komt uit `git ls-remote`, niet uit de GitHub-API, en gaat mee als
   `--match-head-commit` — dit vangt wél een waargenomen geval: bij #287 slikte een squash op
   een verouderde API-head vijf commits, met een gevonden regressie live tot #303
4. hangt CI >30 minuten: **niet mergen**, cancel + rerun; blijft het hangen, laten liggen voor
   Erik — dit is het enige aangetoonde faalpatroon van vandaag

---

## Voortgang

Elke afgeronde stap is een PR met zijn eigen bewijs. Deze regel wordt bijgewerkt zodra er iets
landt; de PR-titels zijn het logboek.

- [x] P1 `brand-fonts-ontbreken-op-prod` — #342 (spoor B; spoor A wacht op licenties)
- [x] P2 `seo-variant-b-differentiatie` — #345 (ijkpunt 65,5%; stap 3 is Eriks keuze)
- [x] P3 `pg-major-sslmode-semantiek` — #348 (waarschuwt; hard falen achter een vlag)
- [x] P4 `golden-set-blogpost-quality` — #350 (meta-description-defect weg; 2 besluiten open)
- [x] P5 `web-page-builder-acceptance-rest` — alle drie restpunten gesloten, taak op done
