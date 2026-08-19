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
- **`smoke:storage-url-expiry`** haalt `images.pexels.com` en `pub-test.r2.dev` op.
  Zelfde bezwaar, kleinere blast radius.

# Wat er nog wacht

- [ ] De 28 nieuwe aanhaken in `scripts/ci/run-guards.sh` (+~15s op de `check`-job).
      ⚠️ Dat bestand is geclaimd door de design-sync-sessie; deze taak levert de
      meting, niet de wiring.
- [ ] De twee netwerk-bewakers in een nightly-job, niet in de PR-poort.
- [ ] De browser-groep: `smoke:document-lang-browser` vraagt `npm run build` plus
      een draaiende server. Zelfde afweging als `test:csp`.
- [ ] **De key/netwerk-groep inhoudelijk verifiëren kan ik niet**: dat vraagt echte
      AI-calls en dus een budget-akkoord van Erik. Classificeren kan wel.

# Gemeten meetfouten (voor wie dit herhaalt)

Drie keer was mijn eigen opstelling stuk vóór de data klopte:

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
