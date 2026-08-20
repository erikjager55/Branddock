---
id: slapende-bewakers-survey
title: 31 bewakers draaien vandaag groen zonder enige infrastructuur — en staan in geen enkele workflow
fase: post-launch
priority: next
effort: aanhaken ~30 min; de twee netwerk-bewakers en de key-groep zijn aparte besluiten
owner: claude-code
status: open
created: 2026-08-19
completed: -
related-adr: -
related-spec: -
worktree: branddock-static-rendering-regressie
---

# Probleem

Op 2026-08-19 bleek dat van de 78 smoke-/eval-scripts in `package.json` er **drie**
in een workflow stonden. Een parallelle sessie haakte er 18 aan (#358). Deze taak
meet wat er van de resterende 60 nog aanhaakbaar is — en waarom dat meer oplevert
dan alleen dekking.

**Een bewaker die niet draait, vangt niet alleen niets — hij verrot ook.** Zijn
asserties bevriezen wat ooit waar was terwijl de code eromheen bewust verandert.
Twee gevallen op één dag, allebei gevonden bij het aanzetten:

- `smoke:image-coupling` eiste dat de call-to-action ín de beeldprompt zat. Die is
  in `059dd8ba` (F36, audit 13-05) **bewust verwijderd** omdat het image-model de
  gequote CTA letterlijk op het beeld rendeerde — een Nederlandse blog kreeg een
  Engelse overlay mét typefout. De assertie is omgekeerd (#359).
- `smoke:mcp-toolset` telde tools ("17 tools -- gevonden: 18"). `get_brand_md` is
  bewust toegevoegd in `ab8db316`. Nu een lijst op naam die meldt wélke tool
  erbij kwam (#367).

⚠️ **Gevolg voor wie de rest aanhaakt**: een rode uitkomst is niet automatisch een
bug. Draai `git log -S` op de betrokken assertie vóór je hem een regressie noemt.
Twee van de twee inhoudelijke roden vandaag waren achterstallig onderhoud.

# Meting

Alle 60 niet-aangehaakte bewakers gedraaid, per script 90-120s limiet.
⚠️ **Alle `*_API_KEY` en `*_TOKEN` gestript**: deze worktree heeft een `.env.local`
met echte sleutels, en een smoke die AI-calls doet zou geld uitgeven.

| Groep | Aantal | Toelichting |
|---|---:|---|
| **Infrastructuurvrij** | **30** | geen DB, geen sleutels, geen netwerk — samen ~15s |
| Netwerk-afhankelijk | 2 | zie hieronder |
| Database nodig | 26 | elders opgepakt tegen een wegwerp-DB |
| Browser nodig | 1 | `smoke:document-lang-browser` (vraagt een draaiende server) |
| Verouderde assertie | 1 | `smoke:mcp-toolset` — gefixt in #367 |

## De 31 die vandaag aanhaakbaar zijn

```
eval:brandstyle-golden           smoke:geo-longform-schema
smoke:ad-creative-validation     smoke:geo-optimization-goals
smoke:brand-font-substitutes     smoke:geo-panel
smoke:brand-library              smoke:geo-puck-renderable
smoke:brief-render               smoke:guard-hooks
smoke:claw-security              smoke:image-coupling
smoke:content-library-ingest     smoke:lp-assistant-edits
smoke:css-utilities              smoke:page-derived-meta
smoke:db-ssl-mode                smoke:page-seo-metadata
smoke:document-lang              smoke:preserve-user-rows
smoke:geo-author-profile         smoke:rule-violation-stats
smoke:geo-claw-gate              smoke:security-residual
smoke:geo-discovery              smoke:seo-context
smoke:geo-longform-render        eval:brand-manifest-golden       smoke:source-image-matcher
                                 smoke:voice-baseline
```

(`smoke:css-utilities` en `smoke:document-lang` staan al aangehaakt; ze komen hier
terug omdat ze in dezelfde meting zaten. Netto dus **28 nieuwe**.)

## ⚠️ Eén vals vinkje in mijn eigen lijst

`smoke:settings-write` stond eerst bij de 30 infrastructuurvrije. Hij is dat niet:
zonder `SMOKE_DB=1` print hij *"deze smoke heeft een echte database nodig"* en geeft
dan **exit 0**. Groen zonder één assertie.

Dat is de gevaarlijkste vorm: had die env-var ooit uit de workflow gevallen, dan liep
hij eeuwig mee als groen vinkje. Gevonden doordat een parallelle sessie er in de
DB-groep tegenaan liep en het doorgaf; hij is daar gefixt (#369) en hoort in die
groep thuis.

**Toets die je hierop moet doen vóór je iets aansluit**: draai de kandidaat één keer
zónder de omgeving die hij nodig heeft en kijk naar de exit-code. Alles wat dan 0
teruggeeft én over overslaan praat, is een vals vinkje.

⚠️ Mijn eigen scan hierop gaf 6 valse treffers op 1 echte: hij matchte het woord
"overgeslagen" in assertie-namen als `PASS sectie zonder props wordt overgeslagen`.
Tel assertie-regels, niet trefwoorden.

## ⚠️ Twee die er NIET in horen

- **`smoke:published-page-prod`** doet `fetch` naar **live productie**
  (`linfi.branddock.app/pillar-page`, `/sitemap.xml`, `branddock.app/reset-password`).
  Hij slaagde alleen omdat productie draait én die ene gepubliceerde pagina nog
  bestaat. In de PR-poort zou hij CI koppelen aan productie-beschikbaarheid: elke
  storing, en elke keer dat die pagina gedepubliceerd wordt, kleurt élke PR rood.
  Hoort in een nightly.
  ✅ **Draait sinds 19-08 nachtelijk** om 03:30 UTC (#377), met in de workflow
  expliciet wat een rode nacht betekent: faalt "de pagina is bereikbaar", dan hikt
  de site of is de pagina gedepubliceerd; faalt een metadata-check, dan is er een
  echte regressie.
- ~~**`smoke:storage-url-expiry`** haalt `images.pexels.com` en `pub-test.r2.dev`
  op.~~ ⚠️ **FOUT — herzien 19-08.** Die twee zijn testdata, geen aanroepen. Beide
  `fetch`-aanroepen zitten achter `SMOKE_R2=1`; zonder die vlag draait hij 16 checks
  pure logica en nul netwerk. Hoort dus in de goedkope gate, niet in een nightly.

  Dit is dezelfde fout als meetfout 4 hieronder, twee dagen later opnieuw gemaakt:
  ik las een URL in de broncode als bewijs van een aanroep. De toets die het wél
  uitwijst is naar de *aanroep* kijken (`fetch(`, `axios.`, `https.get(`) en
  controleren of die achter een opt-in-vlag staat. Zo gescand over alle 78: precies
  **één** bewaker doet een onvoorwaardelijke aanroep naar het internet
  (`published-page-prod`) en één naar localhost (`document-lang-browser`, die een
  draaiende server nodig heeft).

# De sleutel-/netwerkgroep — herzien, want de eerste meting deugde niet

**Wat hier eerst stond was fout.** Ik schreef: "27 kandidaten, alle sleutels
gestript, nul valse vinkjes, alle 27 falen eerlijk". Beide helften klopten niet.

**De sleutels waren nooit weg.** `env -u SLEUTEL npm run <bewaker>` neemt niets weg
bij een script dat `--env-file-if-exists=.env.local` gebruikt — node laadt de waarde
gewoon terug. Bewezen:

    env -u ANTHROPIC_API_KEY  → sleutel zichtbaar, 108 tekens
    ANTHROPIC_API_KEY=ongeldig → 8 tekens

Een reeds gezette variabele wint wél van `--env-file`; een weggestripte niet. Een
parallelle sessie liep tegen hetzelfde aan en meldde het.

**En bij de overige bewakers mat ik iets anders dan ik dacht.** Dat raakt namelijk
maar 5 van de 78 scripts:

| hoe het script zijn omgeving laadt | aantal |
|---|---:|
| `--env-file-if-exists=.env.local` | 5 |
| `--env-file-if-exists=.env` (bestaat niet) | 1 |
| kale `tsx`, laadt niets | 71 |

Die 71 nemen hun omgeving niet mee. Staat `DATABASE_URL` niet in de shell, dan valt
`src/lib/prisma.ts` om bij het *importeren* — nog vóór er één assertie draait:

    Error: DATABASE_URL is not configured in .env
        at src/lib/prisma.ts:9

Dát was wat ik 26 keer aanzag voor "faalt netjes zonder sleutel". Er faalde niets
netjes; er startte niets. Ik heb een foutafhandeling gemeten die nooit aan bod kwam,
en dat opgeschreven als bewijs over sleutelgedrag.

## De hermeting

Alle sleutels op een onbruikbare *waarde*, en `DATABASE_URL` gezet maar dood
(`127.0.0.1:59999`). Die dode poort is meteen het vangnet: `lp-retention` en
`review-drift-reset` verwijderen rijen, en tegen een dode poort kunnen ze niets.

**Elf van de 27 draaien groen zonder database én zonder sleutels** — samen 2.315
asserties, twee identieke runs elk, samen ~17s:

| bewaker | asserties | | bewaker | asserties |
|---|---:|---|---|---:|
| `smoke:web-page-builder` | 1914 | | `smoke:geo-blogposting-jsonld` | 26 |
| `smoke:page-types` | 181 | | `smoke:geo-analysis` | 15 |
| `smoke:heuristics-locales` | 51 | | `smoke:geo-directives` | 14 |
| `smoke:lp-text-quality` | 51 | | `eval:lp-variant-golden` | 13 |
| `smoke:deep-research` | 31 | | `smoke:geo-polish` | 13 |
| | | | `smoke:mcp-toolset` | 6 |

Ze zijn aangesloten in PR #374. De gate gaat daarmee van 18 naar 29 bewakers.

**Vier zijn half gratis**: de pure logica draait, alleen de AI-laag valt om met een
eerlijke 401. Die verdienen een splitsing, geen sleutel:

- `smoke:locale` — 30 geslaagd, 2 gefaald (alleen de live AI-roundtrip)
- `smoke:geo-generation-prompt` — 12 geslaagd, 1 gefaald
- `smoke:lp-retention` — 23/23 groen; deel B zit achter `SMOKE_DB=1`
- `smoke:conversion-tweaks` / `longform-tweaks` / `structured-tweaks` — volledig AI

**Acht hebben echt een database nodig**: `competitor-activities`,
`competitor-content-discovery`, `context-priority`, `knowledge-context`,
`review-drift-reset`, `styleguide-rules-fval`, `zombie-tab-guard`, `geo-fidelity`.
Die vallen onder `run-db-guards.sh` (#369).

## Eén manier van verrotten is nu uitgesloten — mechanisch

De vraag "bewaken deze 32 nog het júiste" is duur, want per bewaker een oordeel. Maar er
zit één deelvraag in die je wél machinaal kunt beantwoorden, en het is de gevaarlijkste.

**Een positieve assertie die verouderd is, valt om** zodra de bewaker draait — precies wat er
met `smoke:geo-generation-prompt` gebeurde. **Een negatieve niet.** `!x.includes('FOO')` slaagt
gratis zodra FOO hernoemd is: groen, mét een getelde assertieregel, voor altijd. Geen gate ziet
dat, ook de assertie-ondergrens niet.

**Uitkomst: nul holle negaties**, en niet door geluk.

De eerste scan was te grof — 105 negaties, 32 waarvan de tekst niet in `src/` staat. Vrijwel
allemaal geen bevinding: sentinels (`SHOULD-NOT-APPEAR`), verzonnen invoer
(`not-a-real-icon-name`), fixture-namen, en regex-patronen die per definitie niet letterlijk in
de broncode voorkomen. Dezelfde vals-positieve vorm als de "overgeslagen"-scan uit meetfout 4.

Het onderscheid dat wél werkt is `git log -S <tekst> -- src/`: **stond die tekst er ooit?** Een
sentinel nooit; een hernoemde productstring wel. Daarmee bleven van 89 onderzochte negaties er
**twee** over:

| bewaker | bewaakt de afwezigheid van |
|---|---|
| `content-item-library-ingest.ts:156` | `editedImageUrl: first.url` |
| `web-page-builder-phase8-variant-generator.ts:131` | `max 44 tekens` |

Beide veilig, en om dezelfde reden — ze staan **gekoppeld aan een positieve assertie op
hetzelfde onderwerp**:

```ts
assert('edit-image: retourneert stored-URL (upload.url)', edit.includes('editedImageUrl: upload.url'));
assert('edit-image: retourneert NIET de rauwe fal-URL',  !edit.includes('editedImageUrl: first.url'));

assert('P1: headline-limiet 60 (niet stale 44)',
  prompt.system.includes('max 60 tekens') && !prompt.system.includes('max 44 tekens'));
```

Wordt het veld of de limiet hernoemd, dan valt de *positieve* helft om vóórdat de negatieve hol
kan worden.

**Regel die daaruit volgt**: koppel elke negatieve assertie aan een positieve op hetzelfde
onderwerp. Losstaand bewaakt een negatie alleen de afwezigheid van een wóórd, en een woord kan
verdwijnen zonder dat het gedrag verandert.

⚠️ Wat dit **niet** aantoont: of de positieve asserties nog het juiste gedrag beschrijven. Dat
blijft het dure deel, en dat staat hieronder.

## Wat ik nog steeds niet gemeten heb

Of de bewakers **inhoudelijk** nog kloppen. Groen met geldige asserties zegt dat ze
draaien, niet dat ze het juiste bewaken. De vier AI-bewakers vragen echte calls en
dus een budget-besluit. Op basis van de twee gevallen die we deze week wél naliepen
— beide verouderde asserties, geen bugs — verwacht ik hetzelfde beeld. Verwachting,
geen meting.

# Wat er nog wacht

- [x] De goedkope groep aangesloten in `scripts/ci/run-guards.sh`: 18 → **29
      bewakers** (#358/#360 + #374), ~10s → ~30s op de `check`-job. Elke bewaker
      draagt daar nu een assertie-ondergrens.
- [x] De netwerk-groep geplaatst: het zijn er **geen twee maar één**.
      `smoke:published-page-prod` draait nachtelijk (#377);
      `smoke:storage-url-expiry` bleek geen netwerk te doen en hoort in de
      goedkope gate.
- [~] De browser-groep — **fase 1 draait sinds 19-08** (#380). Het probleem was de
      kóppeling, niet de kosten: de bewaker vroeg een server én een browser, dus draaide
      hij nergens. Fase 1 (wat de proxy en root layout uitsturen — precies de bug van
      #335) draait nu in de `check`-job tegen `next start`, 10 checks. Fase 2 zit achter
      `SMOKE_BROWSER=1` en wacht op dezelfde chromium-beslissing als de zes CSP-checks.
- [x] De sleutelgroep hermeten met een methode die standhoudt: **elf bewakers met
      2.315 asserties bleken gratis draaibaar** en zijn aangesloten (#374).
- [~] De half-gratis bewakers splitsen — **`smoke:locale` gedaan** (#375): laag 2
      achter `SMOKE_AI=1`, 30 asserties draaien nu gratis in de gate, met een luide
      melding van wát er níet getoetst is.
      **Resteren de drie tweaks-bewakers** (`conversion-`, `longform-`,
      `structured-tweaks`). Die hebben géén gratis laag om af te splitsen — ze zijn
      volledig AI en falen zonder sleutel met een eerlijke 401. Splitsen heeft daar dus
      geen zin; ze wachten op hetzelfde budget-besluit als het punt hieronder.
- [~] **Inhoudelijk verifiëren vraagt echte AI-calls** — ⚠️ **maar niet helemaal.
      Gesplitst op 2026-08-20; de helft die géén AI kost is gedaan.**

      Het punt stond hier als één blok, met "Geen meting" er eerlijk bij. Dat bleek
      te grof: de vraag *"toetst deze bewaker nog het juiste?"* valt uiteen in twee
      stukken, en maar één daarvan vraagt generatie.

      **Gratis te toetsen — gedaan.** De drie tweaks-bewakers bouwen hun invoer via
      `getContentTypeInputs(contentType)` en slaan een sleutel die daar niet in staat
      **stil** over. Hernoemt of verdwijnt er één, dan krijgt de "mét velden"-tak
      minder mee, gaat lijken op de "zonder"-tak, en faalt de bewaker om een reden
      die niets met kwaliteit te maken heeft — 's nachts, na elf AI-calls.

      Gemeten: **27 sleutels over 6 content-types, nul stille wegvallers.** Vandaag
      dus geen probleem, maar het pad was onbewaakt. Nu geborgd met
      `smoke:tweaks-fixture-sync` (15 asserties, leest alleen, kost niets), inclusief
      een mutatietest: `proofPoint` hernoemen in de definitie laat hem omvallen met
      de juiste diagnose.

      **Wat wél AI kost, en dus openblijft**: of de asserties nog de juiste
      kwaliteitsregressies vangen. Daarvoor moet er gegenereerd worden. ⏳ Erik —
      maar goedkoper dan het was: `canvas-tweaks` draait sinds 20-08 nachtelijk, dus
      die runs zijn er al. Zie de judge-variantie-meting in
      [`golden-set-blogpost-quality`](golden-set-blogpost-quality.md) voor de methode:
      artefacten van bestaande nachten lezen in plaats van runs kopen.

      **De les erachter**, en die is breder dan deze taak: "kost AI-calls" is vandaag
      twee keer een verkeerd etiket gebleken. Bij de judge-variantie stonden de runs
      al in GitHub; hier vroeg de helft van de vraag helemaal geen generatie. Splits
      zo'n blokkade in wat je kunt lezen en wat je moet draaien vóór je hem als
      budget-besluit wegzet.

# Gemeten meetfouten (voor wie dit herhaalt)

Vier keer was mijn eigen opstelling stuk vóór de data klopte:

1. **78× FAIL, 0× PASS.** `timeout` bestaat niet op macOS, en mijn naamextractie
   sloopte de dubbele punt (`eval:brandstyle-golden` → `evalbrandstyle-golden`).
   Een uitkomst die volledig één kant op wijst is verdacht, niet informatief.
2. **Nul runs.** Een herdraai-script grepte op een prefix die niet in het invoer-
   bestand stond.
3. ⚠️ **Bijna datavernietiging.** Datzelfde herdraai-script wees `DATABASE_URL` naar
   de **dev-database**, terwijl `smoke:lp-retention` rijen wist en
   `smoke:review-drift-reset` reviewstatussen reset. Dat het niets deed kwam door
   fout 2 — geluk, geen ontwerp. Draai de DB-groep tegen een wegwerp-database.
4. **"Groen zonder sleutels" ≠ "infrastructuurvrij".** De eerste meting liet
   `DATABASE_URL` staan; pas zónder bleek wie er echt geen omgeving nodig heeft.
   En "bevat een URL" ≠ "doet een netwerk-aanroep": een eerste scan vlagde 15
   scripts waarvan er 13 alleen `https://example.com` als testdata hadden.
5. **De duurste: een hele conclusie op een methode die niets wegnam.** `env -u VAR`
   laat `.env.local` de waarde terugladen (5 van de 78 scripts), en bij de andere 71
   crashte de bewaker al bij het importeren op een ontbrekende `DATABASE_URL` — nog
   vóór er iets getoetst werd. Ik las 26 van die crashes als "faalt netjes zonder
   sleutel" en publiceerde dat als bevinding. Hermeting: **elf van die 27 draaien
   gewoon gratis**, samen 2.315 asserties.

   De les zit niet in de vlag maar in de vorm: ik toetste of mijn detector een vals
   vinkje kón vinden, maar niet of mijn *ingreep* iets deed. Eén regel — de waarde
   printen na het strippen — had het meteen laten zien. Kalibreer niet alleen de
   meter, maar ook de knop waaraan je draait.
