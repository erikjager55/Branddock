# START HERE

> Entry point voor mens en agent. Lees deze bij elke sessie-start.
> **Laatst bijgewerkt: 2026-08-18** (retentie-plafond live, CSP op enforce, SSE-abort
> gedeeltelijk — zie hieronder. Twee sessies liepen elkaar in de weg; dat is de
> belangrijkste les van de dag).

---

## Huidige fase

**Live op productie, in acquisitie.** App én billing draaien op `branddock.app`
(main = production, Vercel Pro+Fluid). De launch-blockers uit het voorjaar zijn
allemaal weg: Vercel ✅, Stripe ✅, credits ✅ gebouwd en gesmoked.

Het zwaartepunt is verschoven van *bouwen tot het af is* naar **distributie**. Twee
sporen dragen dat:

1. **`brand.md` als instap-funnel** — gratis scan → download → claim → trial. Live en
   werkend: generator, Brand Score, rapport-mail, lifecycle-reeks 2.2-2.5, claim-flow
   en leads-dashboard staan er.
2. **De designbibliotheek** — Brand Manifest, Brand Library-accessor, StyleguideRule
   als eersteklas datatype, en sinds 15-08 ook de F-VAL-rules-pijler die ze écht leest.

**Wat er niét meer speelt:** het credit-model is compleet (bouw, Stripe-config,
smokes). Het enige dat rest is jouw schakelmoment: `NEXT_PUBLIC_TOPUP_ENABLED=true`
plus één echte betaal-smoke.

---

## Wat er landde (2026-08-18)

**Landing-page-data heeft een plafond** (#286, changelog 474). Eén dagelijkse cron ruimt
PageEvents (13mnd), FormSubmissions (26mnd, lead-PII) en oude `compiledHtml`-artifacts op,
plus een `DELETE`-route voor een individueel AVG-wisverzoek. Drie reviewrondes haalden er
onder meer uit: een afkapdatum die op maandeinden tot 3 dagen te veel wiste, een pruner die
alles voorbij 4.000 pagina's stil oversloeg, en een `viewer` die lead-PII kon wissen.
⚠️ **Actie voor jou**: twee `createdAt`-indexen op Neon aanmaken — staat in
`open-acties-2026-07-23.md` §B mét de SQL. `CREATE INDEX CONCURRENTLY`, níet `prisma db push`.

**CSP staat op enforce** (#294, changelog 476) en de metadata-bug op gepubliceerde pagina's
is weg (#477). Beide uit een parallelle sessie.

**Weglopen tijdens een generatie kost minder tokens** (#287 + #303, changelog 475) — maar
gedeeltelijk. Wat er staat: guards vóór elke dure call, het signaal doorgezet tot in de
Anthropic-call, en een abort-registry per deliverable zodat een tabwissel in de Canvas een
lopende betaalde run níet meer afbreekt. Wat er níet staat: de atomaire settings-merge, het
bewaren van deel-resultaten en de `cancel()`-detector.

⚠️ **De rode draad van vandaag: twee sessies in dezelfde bestanden.** Een parallelle sessie
bouwde in #295 onafhankelijk exact dezelfde fix als ik (transactionele fresh-read in
`persistVariantOptions`), en mijn merge van #287 squashte een verouderde branch-head omdat
de GitHub-API die bleef tonen — waardoor vijf commits niet in main landden en er een al
gevonden regressie live stond tot #303. Precies waar `CLAUDE.md` voor waarschuwt, en niet
theoretisch gebleken. Twee praktische regels die dit had voorkomen: **verifieer de head-SHA
met `git ls-remote` vóór je merget**, en pak geen task-file op waar een andere sessie in
werkt zonder dat af te stemmen.

---

## Wat er landde (2026-08-17)

**De campagnewizard is voor het eerst end-to-end getest** (#279-#284, changelog 473). De sweep
van 15-08 zette de campagnegenerator op afgevinkt met in dezelfde regel "de stappen ná de gate
zijn níét afgedekt" — vier van de zeven stappen waren nooit door het klikpad gegaan. Achter die
gate lagen **vijf productiebugs**: de briefing-scoring (drie defecten, waaronder gap-labels die
allemaal "Algemeen" toonden), stap 4 die met een harde 400 faalde door een modelnamen-lijst die
`claude-sonnet-5` miste, afgekapte JSON die als syntaxfout verscheen, en twee bugs die samen
maakten dat "Approve Concept" een campagne zónder AI-deliverables opleverde.

Meetbaar: dezelfde wizard en briefing gaven **1 deliverable vóór en 8 erna**, runtime 18-24 min
→ 6,0 min. De 80-drempel is bewust blijven staan — met werkende scoring blokkeert die precies
wat hij hoort te blokkeren.

⚠️ De rode draad is het onthouden waard: in vrijwel elk geval **bestond de diagnostiek al, maar
kwam ze nergens aan**. De parse-fout wees naar de verkeerde plek in de respons, de weigering bij
de conceptbeoordeling kwam als toast die geen enkele foutafvang ziet, en de `console.warn` die
de laatste bug verklaarde stond in de browserconsole die niemand las.

---

## Wat er landde (2026-08-16)

**Het ongecommitte werk is weg** (#266). De zeven bestanden die dagen los in de
main-worktree lagen staan vast: het complete HNG-invulboekwerk (fill-script,
hertest-script, prod-bundle, task-file), de bijgewerkte open-acties en de
lockfile-sync. **HNG is af** — de prod-import is gedraaid en de kennisbronnen zijn
geüpload. `docs/Branddock branddoc v3.pdf` blijft bewust buiten git (gitignore-regel
op `Branddock branddoc*.pdf`; klant-branddocs blijven wél tracked).

**Done-audit over 165 afgeronde taken** (16-08). Aanleiding: de e2e-sweep stond op `done`
terwijl vier campagnewizard-stappen ongetest waren. Uitkomst: 90 van de 165 done-taken hebben
onafgevinkte vakjes — dat is vooral een boekhoudgewoonte, geen verborgen werk. Drie gevallen
waren écht restwerk en zijn nu taken: de campagnewizard, twee visual-brief-smokes waarvan de
blocker sinds 05-07 weg is, en een Typography-browser-smoke. Les vastgelegd in `gotchas.md`.

**De content-keten heeft één deur gekregen** (#270-#276, zeven PR's). Content woonde op
drie plekken en het type-systeem wees consumenten naar de verkeerde; dat leverde in acht
weken vier keer dezelfde bug op. `resolveDeliverableContent()` handelt dat verschil nu één
keer af, en 21 van de 23 kruisingen zijn omgezet. Geverifieerd op je échte data, niet op
fixtures: **13 opgeslagen pagina's die 0 woorden opleverden geven er nu 497-1306**, en de
accessor gooide op geen enkele rij. Onderweg bleek de **ZIP-export voor élk content-type
leeg** (een geneste API-response die nooit werd uitgepakt), en zou een `derive` van een
web-page de tekst van de bronpagina hebben overgenomen. Twee kruisingen wachten op jouw
productkeuze; #12 bleek dode code.

**De golden-set-gate is gesplitst** (#267) — en de "flake" bleek een stabiele
bevinding. Twee dingen klopten niet aan het oude beeld. Het diagnose-pad was
onuitvoerbaar: het artefact `golden-set-results-<sha>` heeft nooit bestaan, want
`.promptfoo-results/` begint met een punt en `upload-artifact` slaat hidden files
over — de stap meldde `success` met alleen een warning. En het zijn geen flakes:
over vijf nachten zakken steeds dezelfde cases (SEO-focus extreem 5/5, lege
knowledge-context 4/5, vage brief 4/5, thought-leadership 4/5). Echt niveau ~50-60%
tegen een drempel van 70% die op de rand was gekalibreerd. Nu: `deterministic`
(key-loos, 1m16s) blokkeert PR's, `live-eval` draait nightly-only en faalt daar nog
steeds hard. **Een rode check op je PR is voortaan altijd van jou.** De drempel is
bewust niet verlaagd; de inhoudelijke vraag staat als
[`golden-set-blogpost-quality`](tasks/golden-set-blogpost-quality.md).

---

## Wat er landde (2026-08-15)

Twee parallelle sessies, negen PR's, alles gemerged met groene CI.

**Designbibliotheek** (#255-#259, #263): StyleguideRule bereikt de F-VAL-rules-pijler,
merkcontext via één gegate accessor met lint-regel, reviewstatus-driftreset, re-analyse
die geen user-edits meer vernietigt, curatie-suggesties uit F-VAL-overtredingen, en R4
compleet. Plus twee CI-fixes (#260, #262) die main van acht commits rood naar groen
brachten — de tsc-stap kreeg 8GB heap omdat hij omviel met out-of-memory.

**E2E-sweep + 8 bugs** (#261, changelog 468): alle 24 zichtbare content-types door het
echte klikpad. 7 leverden nul tekens op. Zes van de acht bugs faalden stil.

**Brand Score + lifecycle-mails** (#264, changelog 469): de score gaf iedereen exact 70;
nu 71-98 met uitleg. Mails herschreven naar Nederlands, één CTA per stuk.

---

## Top 3 om mee te beginnen

**1. 💳 TOPUP aanzetten.** Nog steeds het enige met directe omzet-impact, en er is geen
technisch werk meer — alleen `NEXT_PUBLIC_TOPUP_ENABLED=true` en één betaal-smoke.

**2. 🗄️ Twee indexen op Neon.** Vijf minuten werk, en het enige losse eindje van het
retentiewerk dat gisteren live ging. De cron van 02:00 draait nu als volledige tabelscan.
SQL staat in `open-acties-2026-07-23.md` §B — `CREATE INDEX CONCURRENTLY`, buiten een
transactie, níet via `prisma db push` (die neemt prod-drift mee en locked `PageEvent`).

**3. 🧩 [`content-chain-accessor`](tasks/content-chain-accessor.md) — de laatste twee
kruisingen.** Fase 1 en 3 zijn af, fase 2 op #2 en #3 na. Die twee vragen géén techniek maar
een productkeuze van jou: wat toont het Content Library-stoplicht, en wat zegt de Brand
Assistant, bij `structured-unchosen`? Zie Open beslissingen #1. Zodra je kiest is het een
halve dag werk in de bestaande worktree `branddock-content-chain-accessor`.

---

## Open beslissingen (blokkeren werk)

1. **Content-accessor `structured-unchosen`** — twee productkeuzes, geen techniek:
   het Content Library-stoplicht toont rood + "No content generated" op een vólle pagina,
   en de Brand Assistant zegt onterecht "deze pagina heeft nog geen content".
2. **`guard-hooks-hardening`** — raakt je veiligheidsnet, vraagt expliciet akkoord.
   Kernvraag: móet `gh pr merge` blokkeren bij een co-sessie, of volstaat waarschuwen?
   ⚠️ **18-08 gaf hier nieuwe munitie voor**: twee sessies bouwden onafhankelijk dezelfde
   fix in hetzelfde bestand (#295 vs. mijn werk), en een merge op een verouderde API-head
   liet een al gevonden regressie live staan. De guard beschermt HEAD/branch-mutaties, maar
   niet tegen dít patroon.
3. **Resterende SSE-abort-wijzigingen** — de atomaire settings-merge, deel-resultaten bewaren
   vanaf 2 varianten, en de `cancel()`-detector staan klaar op `claude/sse-abort-disconnect`
   (`4a8f12b`). Ze vervangen de transactionele fresh-read die #295 net mergede; die versmalt
   het read-modify-write-venster maar sluit het niet (READ COMMITTED neemt geen row-lock).
   Er ligt een comment op #295; keuze is of ik doorpak of dat die sessie het zelf oppakt.
4. **brand.md-strategie** — akkoord op de omarm-strategie + outreach naar de maintainer;
   de upstream-PR's liggen als tekstpakket klaar.
5. **Meertaligheid brand.md-funnel** — de pagina's en mails zijn nu Nederlands. De wens was
   breder: site meertalig, mails volgen de gekozen taal. Vereist een locale-kolom op
   `GeneratedBrandProfile` (schemawijziging → Neon-push) en template-lookup per taal.
   Het fundament ligt er: `renderLayout` kent al een `locale`.

---

## Openstaande taken

### Nu
| Taak | Staat |
|---|---|
| [`brand-md-open-standaard`](tasks/brand-md-open-standaard.md) | in-progress — funnel live; rest is upstream-PR's + jouw strategie-akkoord |
| [`content-chain-accessor`](tasks/content-chain-accessor.md) | in-progress — fase 1 ✅ + fase 3 ✅; alleen kruisingen #2/#3 open (jouw productkeuze) |
| [`lp-image-routes`](tasks/lp-image-routes.md) | review — wacht op één prod-smoke door jou |
| [`seo-pipeline-speedup`](tasks/seo-pipeline-speedup.md) | open — fase 4a deed 12→7,5 min |
| [`onboarding-flow-test`](tasks/onboarding-flow-test.md) | open — hangt op 3 externe testers |
| [`open-acties-2026-07-23`](tasks/open-acties-2026-07-23.md) | open — wacht-op-Erik-lijst. ⚠️ §B bevat nu twee dingen die op jou wachten: de retentie-indexen op Neon (`CREATE INDEX CONCURRENTLY`, níet `prisma db push`) en `NEXT_PUBLIC_POSTHOG_KEY` op prod |
| [`lp-review-followups`](tasks/lp-review-followups.md) | open — retentie-items ✅ af (#286). SSE-abort ✅ grotendeels (#287/#303); **rest ligt klaar op `claude/sse-abort-disconnect` (`4a8f12b`)** en wacht op afstemming met #295. Vier robuustheid-items nog open |
| [`kpi-fase0`](tasks/kpi-fase0.md) | in-progress — meetfundament €100k-plan (funnel/activatie/noordster/Gate-1 als developer-tab); worktree `branddock-kpi-fase0` |
| [`marketing-homepage-v2`](tasks/marketing-homepage-v2.md) | in-progress — homepage-herbouw + nav/footer NL-first; worktree `branddock-marketing-homepage-v2` |

### Volgende
`workspaces-online-migratie` (4 workspaces resteren, jouw keuze) ·
[`deferred-browser-smokes-unblocked`](tasks/deferred-browser-smokes-unblocked.md)
(3 smokes wachtten op een blocker die sinds 05-07 weg is) ·
[`golden-set-blogpost-quality`](tasks/golden-set-blogpost-quality.md) (⚠️ de golden-set-gate is
per 16-08 gesplitst — `evaluate` kleurt je PR's niet meer rood; wat resteert is de inhoudelijke
vraag waarom 4-5 cases stabiel zakken) ·
[`guard-hooks-hardening`](tasks/guard-hooks-hardening.md) ·
[`static-rendering-regressie`](tasks/static-rendering-regressie.md) (⚠️ nieuw 18-08: élke
pagina-route rendert dynamic door één `await cookies()` in de root layout — `generateStaticParams`
op marketing en `revalidate` op de klant-landingspagina's leveren al maanden niets op)

> ~~`headless-content-service` (P3.0a) · `brand-assistant-quick-create` (P3.0b)~~ — **beide bleken
> al gebouwd en gemerged** (changelog #413, PR's #185/#187/#188/#190/#192/#196). Er stond nog een
> stale kopie in `tasks/` naast de afgevinkte in `tasks/done/`; de duplicaten zijn 17-08 verwijderd.

### Later
`agent-vera-triggers` ·
`content-test-regression-7B` · `geo-seo-followup-later` · `i18n-ai-translation-pipeline` ·
`power-user-shortcuts` · `publishgate-second-opinion` · `validate-brand-domain-component-fit` ·
`video-chain-explainer-showcase` · `web-page-builder-acceptance-rest` ·
`mcp-external-data-enrichment-research`

---

## Losse eindjes uit deze sessie

- **F-VAL onder de drempel** bij `linkedin-post` (69), `linkedin-poll` (70), `search-ad`
  (70,5) en `twitter-thread` (71). Signaal, geen conclusie: Napking's styleguide staat op
  `published = false`, dus de stijl-pijler mist context. Sluit dat eerst uit.
- ~~Campagnewizard voorbij stap 3 ongetest~~ → **eigen taak sinds 16-08**:
  [`campagne-wizard-e2e-restscope`](tasks/campagne-wizard-e2e-restscope.md). Inclusief de
  vraag of de 80-drempel klopt — een rijk ingevulde briefing haalde 68.
- **`rule-structurer` en `brief-week-theme-prompt`** zijn dezelfde soort STRUCTURED-calls
  als de variant-generator en dus theoretisch kwetsbaar voor thinking-uitputting. Daar
  thinking uitzetten is een kwaliteitsafweging (ze redeneren over merkregels), geen bugfix.
  De nieuwe foutmelding wijst het aan als het gebeurt.
- **Mail 2.4** citeert nu de positionering uit de scan. Merken zonder bruikbare
  positionering vallen terug op een datum-variant — dat is de zwakkere versie.
- **`channelTones`** wordt nooit door een scan gevuld: 2,5 punt van de Brand Score is
  daarmee onbereikbaar zonder mens. Bewust zo gelaten.

---

## Hoe te beginnen

**Sessie-start** (Stream Deck):
```
Lees CLAUDE.md, gotchas.md en START_HERE.md.
Bevestig wat je begrijpt over de huidige fase en geef de top 3 actieve tasks.
```

**Bij task-werk**:
```
Werk aan tasks/<id>.md volgens de regels in CLAUDE.md.
Start in plan-mode. Bevestig file-set en acceptatiecriteria voor je begint.
```

**Nieuw feature-idee**: `Ik heb een idee voor X. Run feature-planner subagent.`
Pipeline: 6-assen discovery → `tasks/_drafts/idea-<id>.md` → technical-planner →
`tasks/<id>.md`. Gids: [`docs/playbooks/feature-discovery.md`](docs/playbooks/feature-discovery.md)

### Twee sessies tegelijk

Werkt, maar alleen met discipline. Vandaag ging het één keer mis en één keer goed:

- **Mis**: een branch vanaf *lokale* main nam ongepusht werk van een ander mee en
  deployde dat vóór de bijbehorende Neon-migratie. Vertak **altijd vanaf `origin/main`**,
  en controleer de PR-diff op bestandsaantal vóór de merge — niet alleen wat je zelf staged.
- **Goed**: de `session-guard` blokkeerde een tweede branch-mutatie. Hij beschermt
  eenrichting (HEAD/branch, niet `gh pr merge`) en laat pas na 15 minuten los. Een sessie
  die "dicht" lijkt kan de lock nog vasthouden — check `.claude-session.lock`.
- Na commits van een andere sessie: **`npx prisma generate`**. Schemawijzigingen laten je
  gegenereerde client achter en `tsc` faalt dan op bestanden die je niet aanraakte.

---

## Zie ook

- [`roadmap.md`](roadmap.md) — volledige Now/Next/Later met fasering
- [`docs/changelog.md`](docs/changelog.md) — wat is gebouwd (#469 en doorlopend)
- [`gotchas.md`](gotchas.md) — lessons learned, lees bij elke sessie
- [`CLAUDE.md`](CLAUDE.md) — runtime context + werkregels
- [`PATTERNS.md`](PATTERNS.md) — verplichte UI-primitives
- [`docs/adr/`](docs/adr/) — architecturale beslissingen
- [`docs/playbooks/working-flow.md`](docs/playbooks/working-flow.md) — operating manual
