---
id: ci-hangende-e2e-job
title: De e2e-job kan uren hangen zonder ooit rood te worden — geen timeout, geen cache, geen retry
fase: post-launch
priority: now
effort: 2-4 uur (de fix is klein; het bewijzen dat hij werkt is het werk)
owner: claude-code
status: in-progress
created: 2026-08-18
completed: -
related-adr: -
related-spec: -
worktree: branddock-ci-hang  # geclaimd door sessie 78a1d49f, 2026-08-18
---

# Probleem

De `e2e`-job blijft hangen op stap 7, `npx playwright install --with-deps chromium`, en komt
dan nooit meer tot een conclusie. **Drie keer op 2026-08-18**, bij drie verschillende sessies:

| PR | duur van de hang | normale duur |
|---|---|---|
| #323 | ~30 min | 3-5 min |
| #334 | **93 min** | 3-5 min |
| (sessie `da`) | ~30 min | 3-5 min |

Alle drie op dezelfde stap. `check` was in alle gevallen allang groen, en de vier stappen
vóór de install (`checkout`, `setup-node`, `npm ci`, `prisma generate`) ook. Het bleef puur
steken op het binnenhalen van de browser. Cancel + rerun loste het telkens op — bij #323
daarna `check` 5m17s en `e2e` 4m27s.

## Waarom dit nú belangrijk is

**Er staat nergens een `timeout-minutes` in `.github/workflows/ci.yml`.** Niet op de jobs,
niet op de stappen. GitHub's default is dan **360 minuten**. Een hangende install blokkeert
een PR dus tot zes uur lang **zonder ooit rood te worden**.

Dat is geen ongemak maar een gat in de poort. Op 18-08 is besloten dat een sessie zijn eigen
PR mag mergen mits *alle checks groen zijn*. Een job die hangt is niet groen én niet rood — hij
is er gewoon niet. Vandaag bleek "groen" twee keer leeg te zijn:

- **#334**: `e2e` hing 93 minuten, `check` stond groen. Wie alleen op rood/groen kijkt ziet
  een PR die "nog draait" en wacht — of, erger, ziet drie groene vinkjes en één blanco en
  merget.
- Een tweede geval (#333) bleek bij navraag wél volledige CI te hebben gehad; die claim is
  nagemeten en klopte niet. Vermeld hier omdat het beeld anders scheefloopt.

**Een check die stilstaat is gevaarlijker dan een check die faalt**, want stilstand lijkt op
"nog bezig". Dit is dezelfde klasse als de bevroren-CSS-val: het faalgedrag is onzichtbaar
tenzij je er gericht naar kijkt.

## Wat er ontbreekt

```yaml
- name: Install Playwright chromium
  run: npx playwright install --with-deps chromium
```

Geen `timeout-minutes`, geen cache, geen retry — op een stap die twee netwerkpaden aanspreekt:
de browser-download én (door `--with-deps`) een `apt-get` voor systeembibliotheken. Elke run
haalt ~150 MB browser opnieuw op.

# Voorstel

Drie maatregelen, in volgorde van belang:

1. **`timeout-minutes` op beide jobs** (`check` en `e2e`). Dit is de kern: het zet een hang om
   van *onzichtbaar blokkeren* naar *rood worden*. Voorstel: `e2e: 25`, `check: 20` — ruim
   boven de waargenomen 3-7 minuten, ruim onder de 360 die er nu staat. Plus een strakke
   `timeout-minutes: 5` op de install-stap zelf, zodat de melding de juiste stap aanwijst.
2. **Cache `~/.cache/ms-playwright`**, gesleuteld op de opgeloste Playwright-versie uit
   `package-lock.json` (niet op de range `^1.58.2` uit `package.json` — die verandert niet als
   de daadwerkelijke versie meebeweegt). Haalt het netwerkpad in de meeste runs helemaal weg.
3. **Retry op de install-stap.** Met 1 en 2 is de kans klein, maar een tweede poging is
   goedkoper dan een gefaalde PR-run. Alleen deze stap, niet de hele job — een test die faalt
   moet blijven falen.

# Acceptatiecriteria

- [ ] `timeout-minutes` staat op `check` én `e2e`, plus op de install-stap
- [ ] **Bewezen dat de timeout doet wat hij belooft**: draai eenmalig een variant met een
      kunstmatig hangende stap (`sleep 400`) en toon aan dat de job **rood** wordt met de
      juiste stap in de melding — niet dat hij blijft staan. Zonder deze proef is de fix een
      aanname (les 2026-08-18: een check die niets vindt is pas bewijs als je 'm hebt laten falen)
- [ ] Cache aangebracht en aantoonbaar effectief: twee opeenvolgende runs, de tweede meldt
      `cache hit` en de install-stap is meetbaar korter. Noteer beide tijden.
- [ ] Cache-sleutel gebruikt de **opgeloste** versie uit `package-lock.json`
- [ ] Retry op de install-stap; een falende test faalt nog steeds meteen (niet meegerekt)
- [ ] Een run zonder cache-hit is nog steeds groen — de cache mag geen voorwaarde worden
- [ ] `npm run smoke:guard-hooks` ongewijzigd groen (raakt `.github/` niet, maar het is de
      goedkoopste controle dat er niets stuk is)

# Bestanden die ik aanraak

- `.github/workflows/ci.yml` — het enige bestand

⚠️ **Coördinatie**: `build-heap-investigation` raakt hetzelfde bestand (de twee
`NODE_OPTIONS: --max-old-space-size=8192`-regels). Sessie `branddock-app-47` heeft die taak
geclaimd. Stem af vóór je begint, of doe beide wijzigingen in één PR.

# Bestanden die ik NIET aanraak

- De e2e-tests zelf. Dit gaat over de runner, niet over wat er getest wordt.
- De `NODE_OPTIONS`-heapbump — eigen taak, eigen meting.

# Smoke test plan

1. Push een branch met alleen de timeout-wijziging plus een tijdelijke `sleep 400` in de
   install-stap → job wordt **rood** binnen de timeout, melding wijst de install-stap aan.
2. `sleep` eruit, opnieuw pushen → job groen, install-stap normaal.
3. Tweede push zonder wijzigingen → `cache hit` in het log, install-stap korter. Noteer beide.
4. Cache-sleutel handmatig ongeldig maken (versie ophogen) → `cache miss`, job nog steeds groen.

# Risico's

- **Een te krappe timeout maakt CI zelf flakey.** 25 minuten is ~5× de waargenomen duur; als
  de suite groeit moet die waarde mee. Zet de reden in een commentaar bij de regel, zodat de
  volgende die hem verhoogt weet waaraan hij moet meten.
- **Een cache kan een oude browser vasthouden** als de sleutel niet meebeweegt met de versie.
  Vandaar de eis op de opgeloste versie uit de lockfile.
- **Retry kan een echt probleem maskeren.** Beperk hem tot de install-stap en laat het
  retry-aantal in het log zien, zodat een structureel netwerkprobleem zichtbaar blijft.

# Out of scope

- De heapbump van 8 GB (`build-heap-investigation`).
- De duur van de e2e-suite zelf.
- De `live-eval`-job en de golden-set-drempel.

# Notes

- Waargenomen normale duren op 18-08: `check` 5m17s-7m51s, `e2e` 2m43s-5m15s.
- `@playwright/test` staat als `^1.58.2` in `package.json`; geïnstalleerd was 1.60.0. Dat
  verschil is precies waarom de cache-sleutel uit de lockfile moet komen.
- Diagnose-route die werkte, voor de volgende keer: `gh api
  repos/<owner>/<repo>/actions/jobs/<id> --jq '.steps[] | "\(.number). \(.name): \(.status)"'`
  toont welke stap hangt. Blind wachten op `gh pr checks` laat je niet zien wáár het vastzit.
