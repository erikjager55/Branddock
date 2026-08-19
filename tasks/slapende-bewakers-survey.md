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
- [ ] De browser-groep: `smoke:document-lang-browser` vraagt `npm run build` plus
      een draaiende server. Zelfde afweging als `test:csp`.
- [x] De sleutelgroep hermeten met een methode die standhoudt: **elf bewakers met
      2.315 asserties bleken gratis draaibaar** en zijn aangesloten (#374).
- [ ] De vier half-gratis bewakers splitsen: pure logica in de goedkope gate, de
      AI-laag apart. `smoke:locale` draait nu 30 van de 32 asserties voor niets.
- [ ] **Inhoudelijk verifiëren vraagt echte AI-calls** en dus een budget-besluit.
      Verwachting: een deel zijn verouderde asserties, geen bugs. Geen meting.

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
