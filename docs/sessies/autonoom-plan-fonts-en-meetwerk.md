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
| `web-page-builder-acceptance-rest` | `next.config.ts` (bundle-split), `e2e/` perf-meting |

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

### "Alle checks groen" is geen poort — het is een bewering die je moet controleren

Op één dag drie keer leeg gebleken, en dat is precies het predicaat waar een onbeheerde merge
op leunt:

| Geval | Wat "groen" verborg |
|---|---|
| #333 | `check` en `e2e` **draaiden nooit** — feature-branch als base, alleen Vercel stond groen |
| #334 | `e2e` hing **93 minuten** zonder ooit rood te worden |
| #332 | `e2e` hing 30 minuten op *Install Playwright chromium*; cancel + rerun gaf groen in 7 |

Een afwezige check is niet te onderscheiden van een geslaagde check als je alleen naar de kleur
kijkt — dezelfde fout als `|| true` in een meetcommando. Mijn poort vóór elke merge is daarom
niet "geen rood" maar:

1. `check` én `e2e` zijn **aanwezig** in de rollup én `COMPLETED/SUCCESS` — afwezigheid is een blocker
2. de base van de PR is **`main`**, niet een andere feature-branch
3. de head-SHA komt uit `git ls-remote`, niet uit de GitHub-API, en gaat mee als `--match-head-commit`
4. hangt CI >30 minuten: **niet mergen**, cancel + rerun, en bij herhaling laten liggen voor Erik

Dank aan de sessies `branddock-static-rendering-regressie` en `f8` — de eerste twee gevallen
komen van hen; zonder die melding was mijn poort een kleurcontrole gebleven.

---

## Voortgang

Elke afgeronde stap is een PR met zijn eigen bewijs. Deze regel wordt bijgewerkt zodra er iets
landt; de PR-titels zijn het logboek.

- [ ] P1 `brand-fonts-ontbreken-op-prod`
- [ ] P2 `seo-variant-b-differentiatie`
- [ ] P3 `pg-major-sslmode-semantiek`
- [ ] P4 `golden-set-blogpost-quality`
- [ ] P5 `web-page-builder-acceptance-rest`
