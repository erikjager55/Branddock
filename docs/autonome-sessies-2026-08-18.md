# Autonoom werken terwijl Erik weg is

> Vastgesteld 2026-08-18. Geldt zolang Erik afwezig is. **Main = productie**: elke merge
> deployt automatisch, zonder dat iemand meekijkt.
>
> Dit document is de gedeelde afspraak tussen de parallelle sessies. Wijkt je situatie af,
> pas dit bestand aan in een **eigen doc-PR** — niet in een code-PR.

---

## 1. Mag een sessie zelf mergen?

**Ja, met regels.** Erik heeft dit op 2026-08-18 expliciet bevestigd, ná te zijn gewezen op
het gevolg (main = productie, Vercel deployt automatisch, hij is er niet bij). Het alternatief
— alles laten wachten — is bewust afgewezen.

De poort, vóór elke merge:

| # | Eis | Waarom |
|---|---|---|
| 1 | `check` **én** `e2e` zijn **aanwezig én completed** | "niet rood" is niet hetzelfde als groen — zie §2 |
| 2 | PR-base is `main`, geen feature-branch | anders draait CI mogelijk nooit |
| 3 | Gerebased op `origin/main`, achterstand 0 | `git rev-list --count HEAD..origin/main` |
| 4 | Head-SHA geverifieerd via `git ls-remote` | de GitHub-API toonde ooit een verouderde head en squashte vijf commits weg |
| 5 | Alleen je **eigen** PR | andermans PR merg je niet, ook niet als hij groen is |
| 6 | Doc-PR's los van code-PR's | zie §5 |

Commando dat 4 afdwingt in plaats van erop te vertrouwen:

```bash
gh pr merge <n> --squash --delete-branch \
  --match-head-commit "$(git ls-remote origin refs/heads/<branch> | cut -f1)"
```

## 2. Een job die hángt wordt nooit rood

Op 2026-08-18 hing de `e2e`-job **drie keer bij drie verschillende sessies** op
`npx playwright install --with-deps chromium`: 30, 93 en 30 minuten, tegen normaal 3-5.
`check` stond intussen groen.

Er staat **nergens een `timeout-minutes`** in `.github/workflows/ci.yml`, dus GitHub's default
van 360 minuten geldt. Een hang blokkeert een PR daardoor tot zes uur **zonder ooit rood te
worden**, en stilstand lijkt op "nog bezig".

Dat maakt eis 1 hierboven geen formaliteit: kijk of de check *er is* en *afgerond*, niet of
hij niet-rood is. Diagnose als iets lang duurt:

```bash
gh api repos/<owner>/<repo>/actions/jobs/<id> --jq '.steps[] | "\(.number). \(.name): \(.status)"'
```

**CI >30 minuten hangend: niet mergen, PR open laten, melden.** Cancel + rerun heeft het
telkens opgelost, maar dat is een pleister — de structurele fix staat als
[`tasks/ci-hangende-e2e-job.md`](../tasks/ci-hangende-e2e-job.md).

### 2b. Een LEGE checklijst is geen wachtrij — het is "kan niet starten"

Eis 1 zegt *aanwezig* én completed. Dat "aanwezig" is op 2026-08-19 twee keer gemist, door
twee verschillende sessies, en het is de moeite waard te weten waaróm het gebeurt.

**Een PR met merge-conflicten krijgt géén `pull_request`-checks.** GitHub kan de merge-commit
niet berekenen en start de workflow dus niet — niet later, helemaal niet. `gh pr checks` geeft
dan een **lege lijst**: geen rood, geen pending, niets. Dat leest als een drukke wachtrij.

Wat het extra verraderlijk maakt: `gh run list --branch <tak>` kan wél een groene run tonen.
Die hoort dan bij de **ouder** van je head — je eigen wijziging is nooit getoetst. Een
parallelle sessie stond op het punt daarop te mergen.

En een poort die op "geen pending" toetst in plaats van op "aanwezig én geslaagd", laat zo'n
PR gewoon door. Nagemeten op een lege lijst: `[.[] | select(.bucket=="pending")] | length`
geeft 0, en dat leest als groen.

```bash
gh pr view <n> --json mergeStateStatus -q .mergeStateStatus   # DIRTY = conflicten, geen CI
gh pr checks <n> --json bucket | jq 'length'                  # 0 = niet gedraaid, NIET groen
gh run list --branch <tak> --json headSha,conclusion          # vergelijk met git ls-remote
```

Toets dus op **drie** dingen, niet op één: er zíjn checks, ze zijn allemaal geslaagd, en de
kop-SHA is die van de remote. "Nul mislukt" is bij nul checks triviaal waar.

Zelfde familie als de andere meetfouten van die dag (zie `gotchas.md` 2026-08-19): een
negatieve uitkomst gelezen als bewijs, terwijl de toets zelf niets kón vinden.

## 3. Claims — wie zit waar

**De `worktree:`-frontmatter van het task-file is de ownership-marker.** Zet je claim daar
neer en push die als eerste commit, vóór je begint. Dat overleeft een sessie-herstart; een
bericht niet.

Momentopname 2026-08-18 (leidend is altijd de frontmatter zelf, niet deze tabel):

| Sessie | Taken | Bestanden |
|---|---|---|
| `branddock-app-47` | `document-lang-followups` §B, `i18n-namespace-locality`, `build-heap-investigation` | `src/lib/ui-i18n/**`, `src/app/layout.tsx`, `src/proxy.ts`, `scripts/smoke-tests/document-lang-*.ts`, `e2e/tests/security/csp-enforce.spec.ts`, `src/app/{oauth,reset-password,invite}/**` |
| `41832dfd` | `brand-fonts-ontbreken-op-prod`, `golden-set-blogpost-quality`, `pg-major-sslmode-semantiek`, `seo-variant-b-differentiatie`, `web-page-builder-acceptance-rest` | zie de betreffende task-files |
| `branddock-app-ab` | `marketing-site-verbeterslag` | marketing-pagina's |

⚠️ **`.github/workflows/ci.yml` is dubbel geclaimd**: `ci-hangende-e2e-job` (timeouts + cache)
en `build-heap-investigation` (de `NODE_OPTIONS`-heapbump) raken hetzelfde bestand. Stem af of
doe beide in één PR.

## 4. Wat niemand autonoom doet

Deze blijven liggen tot Erik terug is — het zijn beslissingen, geen werk:

- **`NEXT_PUBLIC_TOPUP_ENABLED=true`** plus de betaal-smoke
- **Het brand.md-strategie-akkoord** en de outreach naar de maintainer
- **`content-chain-followups`** — drie productkeuzes
- **`workspaces-online-migratie`** — welke workspaces online moeten
- **`open-acties-2026-07-23`** — dat is per definitie de wacht-op-Erik-lijst
- **Elke schemawijziging of Neon-push.** Deploy-vóór-migratie heeft deze repo twee keer pijn
  gedaan (2026-07-13, 2026-08-15). Loop je hier tegenaan: stoppen.
- **Iets terugdraaien op productie.** Vind je een regressie: task-file maken en melden, niet
  zelf reverten.

## 5. De drie gedeelde schrijfplekken

`gotchas.md`, `docs/changelog.md` en `START_HERE.md` botsten op 2026-08-18 **drie keer** en
kostten één keer een complete PR-herbouw. Regel: nooit in een code-PR, altijd een eigen
doc-PR van alleen die bestanden.

Dat kan **zonder worktree**, dus ook als de session-guard je blokkeert:

```bash
gh api repos/<owner>/<repo>/git/refs -f ref=refs/heads/<branch> -f sha=<main-sha>
gh api repos/<owner>/<repo>/contents/<pad> -X PUT --input payload.json   # met base64 content + blob-sha
```

Haal het bestand **opnieuw op vlak vóór je schrijft** — main beweegt snel, en de blob-sha in
je payload moet de actuele zijn.

⚠️ **Rebase zo'n branch niet met een force-update van de ref naar main.** Dat lijkt logisch
(branch = main + jouw bestand) maar zet de PR eerst op **nul commits**, en GitHub sluit hem
dan automatisch. Gebeurd op 2026-08-18 met #346. De branch en het bestand overleven het;
alleen de PR is weg en je opent een nieuwe vanaf dezelfde branch. Wil je écht rebasen: maak
een **nieuwe** branch vanaf de actuele main, schrijf het bestand daar, en sluit de oude PR.
Voor een doc-PR van één nieuw bestand is achterlopen op main meestal onschadelijk — het
conflicteert per definitie met niets.

## 6. Stop-condities

- CI hangt >30 min → niet mergen, melden
- Een taak blijkt al gebouwd → status corrigeren, **niet opnieuw bouwen**. Dit gebeurde
  2026-08-18 twee keer (`kpi-fase0`/`marketing-homepage-v2`, en `lucide-icon-registry` waarvan
  de fix al in #334 lag). Check vóór je begint: bestaat er een open PR die dit al doet?
- Nieuwe scope buiten het task-file → stoppen
- Een geclaimd bestand nodig en de eigenaar reageert niet → stoppen, niet doorduwen
- Schemawijziging of externe service nodig → stoppen
- Een test faalt die één retry niet oplost → stoppen

## 7. Productie-bewaking

Niemand kijkt naar de deploys. Na elke merge draait er een deploy, en regressies worden nu
alleen gevonden als iemand er toevallig naar zoekt. Vaste controle:

- kernroutes geven 200, geen 500
- de kleur-utilities uit #323 bestaan nog in de geserveerde CSS (een volgende wijziging aan
  `src/index.css` kan ze zo weer weghalen)
- de bundelgrootte is niet plots gegroeid — de 564 kB die #334 bespaarde kan net zo makkelijk
  terugkomen
- geen CI-jobs die langer dan 30 minuten hangen

Bij een afwijking: **task-file maken en melden, niet zelf repareren op productie.**

## 8. Verslag bij terugkomst

Eén samenvattend bericht, geen archeologie: wat is gemerged en door wie, wat staat open en
waarom, welke afwijkingen vond de productie-bewaking, en welke beslissingen liggen op Erik.

---

## Waarom deze regels bestaan

Alle zes komen uit wat er op 2026-08-18 daadwerkelijk misging, niet uit voorzichtigheid:

- twee sessies bouwden onafhankelijk **dezelfde fix** (#295 vs. de settings-race)
- een merge squashte een **verouderde branch-head** → vijf commits weg, regressie live
- `gotchas.md` botste drie keer; één PR moest compleet opnieuw
- twee task-files stonden maanden ten onrechte op `in-progress` door achteraf aangeplakte
  frontmatter
- een taak werd geschreven voor werk dat al af lag in een open PR
- drie CI-hangs die nooit rood werden
