# START HERE

> Entry point voor mens en agent. Lees deze bij elke sessie-start.
> **Laatst bijgewerkt: 2026-08-18, derde helft** (retentie-plafond live, CSP op enforce,
> SSE-abort gedeeltelijk, de twee Neon-indexen aangemaakt en prod drift-vrij bevonden —
> zie hieronder. Twee sessies liepen elkaar in de weg; dat is de belangrijkste les van de dag).

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

**Elke bezoeker kreeg `lang="en"` op een Nederlandse pagina** (PR #335, changelog #484).
`static-rendering-regressie` begon als prestatietaak en eindigde als correctheidsfix. De
root layout leidde `<html lang>` af uit de UI-taalcookie, terwijl **geen enkele publieke
route `useTranslation` gebruikt** — marketing, brand.md en de klantpagina's zijn
hardgecodeerd Nederlands. Elke bezoeker zónder cookie, dus per definitie iedereen die
binnenkomt, kreeg daardoor een Engels taalattribuut. Geverifieerd op prod:
`branddock.app/marketing/pricing` gaf `lang="en"`, `linfi.branddock.app/pillar-page`
ook — terwijl daar `LandingPage.locale = 'nl-NL'` staat.

⚠️ **Statisch renderen blijkt niet vrij te schakelen, en dát is de blijvende uitkomst.**
De cookie-read was maar de helft: sinds de enforce-flip is `script-src` nonce-based met
`'strict-dynamic'`, en een gecachete respons draagt een verouderde nonce. Gemeten:
statisch bouwen laat **6 van de 10 CSP-tests falen**. De rendermodus blijft dus bewust
dynamisch; de inerte `generateStaticParams` en `revalidate` blijven staan mét die gemeten
reden erbij. Heropenen vraagt een CSP-scope zonder per-request nonce (2-4 dagen).

⚠️ **En de urgentie klopte niet**: 4 `PageEvent`-rijen op prod, 1 gepubliceerde
landingspagina. De prestatiewinst is vandaag nul. Tweede keer in twee dagen dat een
taaktekst een groter probleem beschreef dan de meting terugvond (zie de retentie-indexen).

**De les zit in de verificatie, niet in de fix** (gotcha 18-08). Vijf reviewrondes vonden
elk een gat dat de vorige had gemist, telkens met dezelfde vorm: het faalscenario zat niet
in de meting. Verse page loads misten client-navigatie; localhost miste de apex-rewrite;
en een adversariële reviewer verwijderde één regel uit de proxy waarmee de complete
server-fix verviel terwijl **alle** gates groen bleven — inclusief de browsercheck, die
`OK lang="nl"` meldde tegen HTML die `lang="en"` zei, omdat de client de DOM ná hydratie
repareert. De smoke leest nu ook de rauwe serverrespons.


**Landing-page-data heeft een plafond** (#286, changelog 474). Eén dagelijkse cron ruimt
PageEvents (13mnd), FormSubmissions (26mnd, lead-PII) en oude `compiledHtml`-artifacts op,
plus een `DELETE`-route voor een individueel AVG-wisverzoek. Drie reviewrondes haalden er
onder meer uit: een afkapdatum die op maandeinden tot 3 dagen te veel wiste, een pruner die
alles voorbij 4.000 pagina's stil oversloeg, en een `viewer` die lead-PII kon wissen.
✅ **De twee `createdAt`-indexen staan er** (#311): aangemaakt op `branddock-prod`/`production`
via de Neon-MCP, beide `indisvalid = true`. `CREATE INDEX CONCURRENTLY` werkt over die route
gewoon — de transactie-valkuil van de Neon SQL-editor speelt er niet.
⚠️ **Maar de urgentie klopte niet.** Gemeten vóór het aanmaken: `PageEvent` **4 rijen**
(oudste 14-08), `FormSubmission` **0** — samen 96 kB. De "volledige tabelscan" die dit item
naar Nu haalde las vier rijen. Terecht gedaan, maar om schema-drift te dichten, niet voor
prestaties. **Meet vóór je prioriteert**; de tekst van een taak beschrijft niet de toestand.

**Claude kan weer bij de prod-DB — via de Neon-MCP** (connector `claude.ai Neon`; één project,
één branch, dus geen verwarringsrisico). Meteen ingezet voor een volledige drift-check prod
tegen `schema.prisma`: 182 tabellen, 284 foreign keys, 115 enums → **geen drift**. Drie
signalen bleken onschuldig, en de enige echte afwijking zat lókaal. Die leverde de gotcha op:
`prisma migrate diff` gaf een lege migratie terwijl de DB wél afweek — Prisma kent geen
nullable list, dus de diff-engine kán dat verschil niet uitdrukken. Het commando waar iedereen
naar grijpt om drift te checken geeft daar dus vals groen.

**De twee veiligheidshooks kloppen weer** (#313 + #314, changelog 480). `guard-hooks-hardening`
stond sinds 17-07 te wachten op jouw akkoord; dat kwam nadat alle drie de gaten vandaag opnieuw
geraakt werden. De guard leidt de worktree nu af uit het commando in plaats van uit zijn eigen
cwd, `check-dangerous-bash` beslist op de operatie in plaats van op de tekst, en `gh pr merge`
waarschuwt. ⚠️ Twee gaten kwamen er tijdens het bouwen bij: `git -C <pad> <verb>` passeerde
**béide hooks al sinds hun ontstaan**, en `git worktree list` telde als HEAD-mutatie. Bewijs:
`npm run smoke:guard-hooks` 13/13 plus drie mutatietests. Niet bewezen: of de merge-waarschuwing
je daadwerkelijk bereikt — dat vraagt een tweede échte sessie.

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

**Twee taken op de Nu-lijst waren allang af — en de vraag "nooit begonnen of ongepusht?"
had een derde antwoord: gemerged.** `marketing-homepage-v2` landde op 15-07 (PR #151), en de
complete Out-of-scope-lijst Fase 2/3 volgde diezelfde avond in #152 en #153 — feature-,
oplossingen- en juridische pagina's bestaan allemaal. `kpi-fase0` landde op 20-07 (PR #215,
changelog #424); alle drie zijn acceptatiecriteria stuk voor stuk nagelopen: de 403-gate en
responsvorm van `/api/admin/growth-metrics`, de Growth-tab bínnen het `isDeveloper`-blok met
alle vier renderblokken, en groene CI (`check` 8m51s, `det-suite`, `e2e`) plus de in #424
vastgelegde dev-smoke. Beide branches waren na de merge netjes opgeruimd — dáárom was er geen
worktree.

Oorzaak van de verkeerde status: beide files hadden géén frontmatter en kregen die op 17-08
achteraf aangeplakt (#286) met een default `status: in-progress`; bij `marketing-homepage-v2`
plus een `created` ná de merge van zijn eigen werk. **Achteraf aangeplakte frontmatter is een
gok, geen registratie** — leid status en datum af uit `git log --diff-filter=A` van het bestand
en uit de merge-status van de PR. De pagina-voor-pagina-doorloop van de marketing-site loopt
verder als `marketing-site-verbeterslag`.

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

**2. 📣 [`brand-md-open-standaard`](tasks/brand-md-open-standaard.md) — jouw strategie-akkoord.**
Naar voren gehaald op een meting, niet op een gevoel: de funnel is technisch compleet en
leverde in vier dagen **4 page-events en 0 leads** op. Dat is geen infra-probleem meer maar
een distributie-probleem, en het enige wat de volgende stap tegenhoudt is jouw akkoord op de
omarm-strategie plus de outreach naar de maintainer. De upstream-PR's liggen als tekstpakket
klaar.

**3. 🔤 [`brand-fonts-ontbreken-op-prod`](tasks/brand-fonts-ontbreken-op-prod.md) — 44 van 44
merkfonts hebben geen bestand.** Gemeten, niet vermoed: de storage-URL-audit tegen Neon-prod
(18-08) vond `StyleguideFont.fileUrl` **44 van de 44 keer leeg**. Alles rendert in Inter —
ook PDF-exports en AI-content. Geen bug: het upload-pad bestaat volledig, er is nooit iets
geüpload. We verkopen merkconsistentie, en een klant die zijn eigen styleguide opent en
overal Inter ziet staan onder "Neue Haas Grotesk Display" ziet het product zijn belofte niet
waarmaken.

> Twee sporen: **B (de code)** kan ik zelfstandig doen, **A (de bestanden)** heeft jou nodig —
> per merk een `.woff2` plus de licentie-afweging, ~15 min per merk. Dit is dus geen
> "los-het-op-terwijl-je-weg-bent"-item zoals de vorige bewoner van deze plek.

---

## Open beslissingen (blokkeren werk)

0. **`test:csp` en `smoke:document-lang-browser` draaien in géén enkele workflow.** Ze zijn
   de enige automatische bescherming onder de bewuste keuze "dynamisch renderen blijft
   dynamisch", maar vragen een build + test-DB in CI. Kostenafweging, dus jouw besluit.
   Staat in [`document-lang-followups`](tasks/document-lang-followups.md).


1. **Resterende SSE-abort-wijzigingen** — de atomaire settings-merge, deel-resultaten bewaren
   vanaf 2 varianten, en de `cancel()`-detector staan klaar op `claude/sse-abort-disconnect`
   (`4a8f12b`). Ze vervangen de transactionele fresh-read die #295 net mergede; die versmalt
   het read-modify-write-venster maar sluit het niet (READ COMMITTED neemt geen row-lock).
   Er ligt een comment op #295; keuze is of ik doorpak of dat die sessie het zelf oppakt.
2. **brand.md-strategie** — akkoord op de omarm-strategie + outreach naar de maintainer;
   de upstream-PR's liggen als tekstpakket klaar.
3. **Meertaligheid brand.md-funnel** — de pagina's en mails zijn nu Nederlands. De wens was
   breder: site meertalig, mails volgen de gekozen taal. Vereist een locale-kolom op
   `GeneratedBrandProfile` (schemawijziging → Neon-push) en template-lookup per taal.
   Het fundament ligt er: `renderLayout` kent al een `locale`.

---

## Openstaande taken

### Nu
| Taak | Staat |
|---|---|
| [`brand-md-open-standaard`](tasks/brand-md-open-standaard.md) | in-progress — funnel live; rest is upstream-PR's + jouw strategie-akkoord |
| [`content-chain-followups`](tasks/content-chain-followups.md) | open — `content-chain-accessor` is ✅ **done** (alle 23 kruisingen). Wat rest zijn drie *keuzes*, geen bugs: dode code, de schrijf-kant, repurpose |
| [`lp-image-routes`](tasks/done/lp-image-routes.md) | review — wacht op één prod-smoke door jou |
| [`onboarding-flow-test`](tasks/onboarding-flow-test.md) | open — hangt op 3 externe testers |
| [`open-acties-2026-07-23`](tasks/open-acties-2026-07-23.md) | open — wacht-op-Erik-lijst. ⚠️ §B: de retentie-indexen zijn ✅ af (#311); wat resteert is `NEXT_PUBLIC_POSTHOG_KEY` op prod |
| [`marketing-site-verbeterslag`](tasks/marketing-site-verbeterslag.md) | in-progress — pagina-voor-pagina-doorloop van alle 26 marketing-URL's + verzamelbak voor website-brede wijzigingen |

### Volgende
[`brand-fonts-ontbreken-op-prod`](tasks/brand-fonts-ontbreken-op-prod.md) (⚠️ **44 van 44**
merkfonts op prod hebben géén bestand — alles rendert in Inter, ook in PDF-exports en
AI-content; het upload-pad bestaat al, er is nooit iets geüpload) ·
[`pg-major-sslmode-semantiek`](tasks/pg-major-sslmode-semantiek.md) (pg v9 maakt van onze
`sslmode=require` stil een zwakkere modus — nu vastleggen i.p.v. bij de upgrade ontdekken) ·
`workspaces-online-migratie` (4 workspaces resteren, jouw keuze) ·
[`deferred-browser-smokes-unblocked`](tasks/deferred-browser-smokes-unblocked.md)
(3 smokes wachtten op een blocker die sinds 05-07 weg is) ·
[`golden-set-blogpost-quality`](tasks/golden-set-blogpost-quality.md) (⚠️ de golden-set-gate is
per 16-08 gesplitst — `evaluate` kleurt je PR's niet meer rood; wat resteert is de inhoudelijke
vraag waarom 4-5 cases stabiel zakken) ·
[`document-lang-followups`](tasks/document-lang-followups.md) (restwerk uit
`static-rendering-regressie`: statisch renderen heropenen vraagt eerst een CSP-scope zonder
per-request nonce; plus dezelfde `lang`-bug op `/oauth/*`, `/reset-password` en
`/invite/accept`)

> ~~`headless-content-service` (P3.0a) · `brand-assistant-quick-create` (P3.0b)~~ — **beide bleken
> al gebouwd en gemerged** (changelog #413, PR's #185/#187/#188/#190/#192/#196). Er stond nog een
> stale kopie in `tasks/` naast de afgevinkte in `tasks/done/`; de duplicaten zijn 17-08 verwijderd.

### Later
`agent-vera-triggers` ·
`content-test-regression-7B` · `geo-seo-followup-later` · `i18n-ai-translation-pipeline` ·
`power-user-shortcuts` · `publishgate-second-opinion` · `validate-brand-domain-component-fit` ·
`video-chain-explainer-showcase` · `web-page-builder-acceptance-rest` ·
`mcp-external-data-enrichment-research` ·
[`lp-turnstile-form-endpoint`](tasks/lp-turnstile-form-endpoint.md) (⚠️ **blocked op een
trigger, niet op werk**: afgesplitst uit `lp-review-followups` bij het afronden daarvan.
Bouwen zonder waargenomen spam-druk zet een CAPTCHA in het conversiepad van een funnel met
nauwelijks verkeer. De taak draagt vier meetbare triggers plus de SQL om ze te toetsen)

---

## Losse eindjes uit deze sessie

- **F-VAL onder de drempel** bij `linkedin-post` (69), `linkedin-poll` (70), `search-ad`
  (70,5) en `twitter-thread` (71). Signaal, geen conclusie: Napking's styleguide staat op
  `published = false`, dus de stijl-pijler mist context. Sluit dat eerst uit.
- ~~Campagnewizard voorbij stap 3 ongetest~~ → **eigen taak sinds 16-08**:
  [`campagne-wizard-e2e-restscope`](tasks/done/campagne-wizard-e2e-restscope.md). Inclusief de
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
