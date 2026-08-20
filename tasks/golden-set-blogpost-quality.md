---
id: golden-set-blogpost-quality
title: De blog-post golden-set zakt stabiel op 4-5 van de 10 cases — echte bevinding, geen flake
fase: post-launch
priority: next
effort: 1-2 dagen (onderzoek eerst, dan pas prompt/rubric)
owner: unassigned
status: open
created: 2026-08-16
completed:
related-adr: -
related-spec: docs/specs/content-test-improvement-plan.md
worktree: -  # claim vervallen 20-08: sessie 41832dfd en worktree branddock-golden-set bestaan niet meer; vrij op te pakken
---

# Probleem

De `Content Golden-Sets`-nightly werd altijd afgedaan als "flakey live-LLM-eval". Log-analyse
over vijf nachten (task `golden-set-gate-decouple`, 2026-08-16) laat zien dat dat **niet klopt**:
het zijn steeds dezelfde cases.

| Case | 08-08 | 10-08 | 13-08 | 15-08 ✅ | 16-08 |
|---|---|---|---|---|---|
| Napking — SEO-focus extreem (multiple keywords) | ✗ | ✗ | ✗ | ✗ | ✗ |
| NieuweBrand — lege knowledge context | ✗ | ✗ | ✗ | ✗ | — |
| Napking — adversarial vage brief | ✗ | ✗ | ✗ | — | ✗ |
| Better Brands — thought-leadership | ✗ | ✗ | ✗ | — | ✗ |
| LINFI — vakmanschap-content | ✗ | ✗ | — | — | ✗ |
| **totaal falend (van 10)** | 5 | 5 | 4 | 2 | 4 |

Eén case faalt 5/5, drie falen 4/5. Zelfs de nacht die slaagde haalde maar 8/10. Het werkelijke
niveau is **~50-60%**, en de drempel staat op 70% — vandaar de flap (6 failures op 14 nachten).

**De drempel is niet gegokt, maar gekalibreerd op de rand.** `tasks/done/ci-golden-set-e2e-fixes.md`
zegt het zelf: de set werd bijgesteld tot lokaal 7/10 = precies 70%, met de notitie *"70% is de
rand — nightly kan flappen; structurele volgende stap is de v2 (orchestrator-wrapped prompts)"*.
Die v2 is er nooit gekomen en de taak ging op `done`.

**Wat de faalgevallen gemeen hebben** is opvallend en het kijken waard: vage brief, lege
knowledge-context, tegenstrijdige context, extreme SEO-eisen. Dat zijn precies de randgevallen
waar merkgetrouwheid het hardst nodig is.

# Voorstel

**Eerst kijken, dan pas draaien.** Sinds 2026-08-16 uploadt de nightly een bruikbaar artefact
(`golden-set-results-<sha>`) — dat werkte daarvóór nooit, zie de gotcha. De gate print nu ook de
faalgevallen bij naam in de log.

1. **Wat zakt er precies?** Download het artefact van 2-3 nachten en lees per falende case welke
   assert klapt — llm-rubric-oordeel of een deterministische assert (H1, keyword, lengte)?
2. **Prompt, rubric of terecht?** Drie mogelijkheden per case, en ze vragen tegengestelde acties:
   de productie-prompt is echt zwak op dit randgeval (→ prompt fixen), de rubric eist iets dat
   niemand wil (→ rubric fixen), of de case is een terechte afkeuring (→ laten staan en de
   drempel klopt niet).
3. **Judge-variantie meten** — `scripts/smoke-tests/position-swap-judge.ts` bestaat precies voor
   deze vraag. Hoeveel spreidt dezelfde case over runs?
4. **Pas daarna** aan drempel of set zitten.

**De grotere vraag eronder** (stond al als out-of-scope in `golden-set-gate-decouple`): de
promptfoo-sets hebben **eigen inline prompts** en referencen de productiecode niet. Ze testen dus
een handmatige benadering van de prompt en kunnen een echte productie-prompt-regressie per
definitie niet vangen. `scripts/eval/lp-variant-golden` is de enige die het échte pad test, en
dekt alleen LP. Zolang dat zo is, meet deze set iets anders dan wat gebruikers krijgen — dat
relativeert elke conclusie hieruit, en het is het overwegen waard om die v2 vóór de fixes te doen.

## ✅ Stap 1+2 — artefact-analyse 2026-08-18

Artefacten van twee nachten gelezen (`31992103276` = 17-08, **5/10**;
`32096222565` = 18-08, **7/10**). Per falende case staat nu vast wélke assert
zakt. Conclusie vooraf: **drie van de vijf terugkerende faalgevallen kunnen met
de huidige prompt niet slagen.** Dat is geen kwaliteitssignaal maar een defect
in de set zelf.

| Case | Zakkende assert | Score | Verdict |
|---|---|---|---|
| SEO-focus extreem | `llm-rubric` — "Meta-description ≤155 chars" | 3,5 / 4,0 (2×) | **rubric-probleem, onmogelijk** |
| Better Brands thought-leadership | `llm-rubric` — "1+ concrete claims onderbouwd met data" | 3,375 / 4,0 (2×) | **rubric-tegenspraak** |
| Adversarial vage brief | `llm-rubric` — aannames niet transparant benoemd | 2,5 / 3,5 (2×) | **prompt-probleem (echte productvraag)** |
| Empty knowledge context | `llm-rubric` — verzint merkidentiteit | 1,5 (17-08) / pass 18-08 | **terechte afkeuring** |
| LINFI vakmanschap | `contains: 'handgemaakte vloeren'` | fail 17-08 / pass 18-08 | **brosse assert** |

**1. SEO-focus extreem — de rubric vraagt iets wat de prompt nooit bestelt.**
Het output-format in de prompt is H1 · 3-5 H2 · conclusie · FAQ · CTA. Een
meta-description staat daar niet bij, maar de rubric eist hem wel. Beide nachten
faalt de case op *uitsluitend* dit punt: keyword-plaatsing, dichtheid (1-2%) en
leesbaarheid worden expliciet goed bevonden. Deze case kan per definitie niet
slagen. Fix: meta-description aan het prompt-format toevoegen (als productie hem
levert) óf de bullet uit de rubric halen. Eén regel, en 3,5 wordt ≥4,0.

**2. Thought-leadership — de set spreekt zichzelf tegen.**
De rubric eist "concrete claims onderbouwd met data of voorbeeld", terwijl de
case geen enkele bron meekrijgt. De enige manier om eraan te voldoen is data
verzinnen — precies wat *Empty knowledge context* als hallucinatie afstraft. De
twee nachten laten allebei de kanten van die klem zien: 17-08 vérzon percentages
("20-30% sneller") en werd afgestraft omdat ze onderbouwing missen; 18-08 hield
zich in en werd afgestraft omdat er "zero data points" zijn. **Beide richtingen
zakken.** Dit is het sterkste argument voor de v2: productie injecteert wél
merk- en kennis-context, deze eval niet — de set straft dus het ontbreken van
iets wat het echte pad aanlevert.

**3. Vage brief — het enige geval waar de rubric een echte productwens uitdrukt.**
Gevraagd wordt dat de AI zijn aannames zichtbaar maakt. De prompt kent al een
verwant voorschrift ("botst de briefing met de kernidentiteit … signaleer het
conflict"), dus de analoge regel voor vage briefs is een consistente
prompt-uitbreiding — geen rubric-fout. Wel eerst een productbesluit: hóórt een
gepubliceerde blog-post aannames te benoemen, of hoort dat in een begeleidend
veld? Zoals het nu staat vraagt de rubric om tekst die je niet wilt publiceren.

**4. Empty knowledge context — echte bevinding, laten staan.**
17-08 schreef het model over 'NieuweBrand' alsof het bestond, inclusief
verzonnen waarden en "Neem een kijkje op ons platform". Dat is de
hallucinatie-klasse die deze case moet vangen, en hij ving hem. 18-08 ging het
wél goed: échte variatie, geen kapotte rubric. Verdient een prompt-guard.

**5. LINFI — een brosse assert, geen flake.**
`contains: 'handgemaakte vloeren'` is een letterlijke substring-eis op een
meerwoordige zoekterm (`handgemaakte vloeren maatwerk`) in lopende tekst. Zodra
het model er natuurlijker Nederlands van maakt, zakt de case. Vraag aan Erik:
eisen we het keyword letterlijk in de H1 óók als de zin daardoor krom wordt? Zo
ja, dan hoort de assert op de H1-regel te toetsen i.p.v. op het hele artikel; zo
nee, dan moet het een flexibele regex worden.

**Wat dit betekent voor de 70%-drempel.** Met twee structureel onhaalbare cases
is het plafond 8/10 en de praktijk 6-7/10. De gate staat daarmee precies op de
mediaan — flappen is dan wiskunde, geen pech. Volgorde: eerst de twee
rubric-defecten repareren, dan opnieuw meten, en pas dán een drempel kiezen.
Doe je het andersom, dan kalibreer je opnieuw op de rand.

**Nog te doen**, in volgorde:

1. ~~**Twee productbesluiten van Erik**~~ — **19-08: GEPARKEERD.** Erik pakt de twee
   vragen nu niet op (hóórt een blog-post zijn aannames te benoemen; eisen we het keyword
   letterlijk in de H1 ook als de zin krom wordt). Daarmee blijven de vage-brief- en
   LINFI-case staan zoals ze zijn — bewust, niet vergeten. De analyse eronder blijft
   geldig en maakt de besluiten later goedkoop.
2. ~~**De meta-description-case**~~ — ✅ **gedaan 2026-08-18.** De eis is uit beide
   rubrics (de algemene én die van de SEO-focus-case). Geverifieerd vóór het wijzigen:
   het productie-format voor `blog-post` is
   `'Format: Blog post with H1 title, H2 sections, conclusion, and CTA.'`
   (`src/lib/studio/prompt-templates/long-form.ts`) — géén meta-description. De rubric
   toetste dus iets wat noch de eval-prompt noch productie ooit oplevert; de rubric was
   fout, niet de prompt.

   ⚠️ **Bijvangst, en die versterkt het v2-argument**: productie kent voor `blog-post`
   óók **geen FAQ-sectie**, terwijl de eval er expliciet één bestelt (`FAQ-sectie
   (3 Q&A's)`) én erop toetst. Prompt en rubric zijn daar intern consistent, dus de
   nightly ziet er niets van — maar de set meet daarmee een format dat gebruikers niet
   krijgen. Dat is een tweede, onafhankelijke afwijking tussen eval en productie, en
   ik heb 'm bewust laten staan: hem wegnemen is de v2-vraag, geen rubric-fix.

   **Geborgd**: `npm run smoke:golden-set-drift` pint het productie-format vast. Wijzigt
   dat, dan faalt de guard en kijkt iemand naar de eval — in plaats van dat de twee stil
   uit elkaar lopen. Gekalibreerd met een mutatietest: een verschoven format geeft exit 1.
3. ~~**Judge-variantie meten** op de borderline-cases — kost live-LLM-runs~~ —
   ✅ **gedaan 2026-08-20, en het kostte niets.** Die aanname was fout: de nachtelijke
   `live-eval` bewaart per run een artefact, dus de herhaalde metingen stonden er al.
   Zie "Judge-variantie gemeten" hieronder.
4. **Het v2-besluit** (orchestrator-wrapped prompts). De thought-leadership-case is
   er het argument voor: die eist onderbouwing met data terwijl de eval geen enkele
   bron meegeeft, terwijl productie wél merk- en kennis-context injecteert.

# Judge-variantie gemeten — 2026-08-20, zonder één betaalde AI-call

De aanname dat deze meting live-LLM-runs kost (~55k tokens) klopte niet. De nachtelijke
`live-eval` draait al weken en bewaart per run een artefact met de score per case. Vier
nachten stonden nog in GitHub (17 t/m 20 augustus; 16-08 en ouder zijn verlopen). Vier
keer dezelfde tien cases op identieke invoer — dat ís de variantie-meting.

⚠️ **Eén regime-breuk in dat venster.** Commit `d090ce58` (#350) wijzigde de rubric op
18-08 om 23:22 — ná de nachtrun van 18-08, vóór die van 19-08. Runs uit verschillende
regimes naast elkaar leggen meet die wijziging, niet de variantie. Daarom twee paren van
elk twee identieke runs: 17+18 (oude rubric) en 19+20 (nieuwe).

## Het slaagpercentage schommelt 40 punten

| nacht | geslaagd | rubric | 70%-gate |
|---|---|---|---|
| 17-08 | 5/10 = 50% | oud | zakt |
| 18-08 | 7/10 = 70% | oud | haalt |
| 19-08 | 6/10 = 60% | nieuw | zakt |
| 20-08 | 9/10 = 90% | nieuw | haalt |

**Dit herkadert de drempel-vraag.** De kop van `golden-sets.yml` stelt dat het echte
niveau ~50-60% is en dat 70% daar net boven ligt, dus dat de gate flapt. De data wijst
iets anders aan: op identieke invoer levert dezelfde set 50% óf 90%. Het probleem is niet
wáár de lijn ligt, maar dat tien cases waarvan er drie wisselen een slaagpercentage met
±20 punten spreiding opleveren. **Elke** drempel tussen 50 en 90 flapt dan. De lijn
verschuiven lost dat niet op — meer cases, of de wisseling wegnemen, wel.

## Drie cases wisselen tussen twee identieke runs

| case | assert | 17 18 19 20 | duiding |
|---|---|---|---|
| Adversarial: Empty knowledge context | `llm-rubric` | F P F P | judge-variantie, in beide regimes |
| Seed: Better Brands thought-leadership | `llm-rubric` | F F F P | judge-variantie (nieuwe rubric) |
| Seed: LINFI vakmanschap-content | `contains` | F P F P | **géén** judge-variantie — zie hieronder |
| Evolved: SEO-focus extreem | `llm-rubric` | F F P P | **géén** variantie — dit is #350 die werkt |

Die laatste rij is een onafhankelijke bevestiging dat de rubric-fix deed wat hij beloofde:
stabiel gezakt vóór, stabiel geslaagd ná, en geen beweging bínnen een regime.

## De LINFI-flip is een generatie-probleem, geen judge-probleem

`contains 'handgemaakte vloeren'` is een **deterministische** assert — die kan niet
"anders geoordeeld" worden. Hij wisselt dus omdat het gegenereerde artikel de letterlijke
term twee van de vier nachten niet bevat. Dat is precies productbesluit B, nu met een
getal: in de huidige vorm is die assert een muntworp.

## Wat juist níet wisselt

`Evolved: Adversarial-input — vage brief` staat alle vier de nachten op exact 2,50 en
zakt elke keer. Geen ruis maar een consistente afkeuring — die lost op met productbesluit
A, niet met meer data.

**Reproduceren**: `gh run list --workflow=golden-sets.yml --json databaseId,event`, dan
`gh run download <id>` per nacht en de scores per case uit `blog-post-results.json`
(`results.results[].score` / `.success`, en `.gradingResult.componentResults[]` voor de
assert-uitslagen). Let op de repo-slug: `erikjager55/Branddock`, niet `erikjager/`.


# Acceptatiecriteria

- [x] Per falende case vastgelegd wélke assert zakt (artefact-analyse over ≥2 nachten) — 2026-08-18
- [x] Per case een verdict: prompt-probleem / rubric-probleem / terechte afkeuring — 2026-08-18
- [x] ~~**Productbesluit A — aannames in de tekst?**~~ — ✅ **HET PRODUCT HAD DE VRAAG
      AL BEANTWOORD.** Opgelost 2026-08-20, rubric-fout.

      `prompt-templates/helpers.ts:119` schrijft het tegenovergestelde voor van wat de
      rubric eiste:

      > *"If any answer is unclear, the content will feel generic. Mentally adjust
      > BEFORE writing — then produce only the final content."*

      De shipped prompt zegt dus: los de onduidelijkheid **mentaal** op en lever
      alleen de eindtekst. De rubric eiste zichtbare aannames ín het artikel. Dat is
      dezelfde klasse als de meta-descriptie-eis van #350: de rubric toetste iets wat
      productie niet belooft.

      Waar aannames wél thuishoren, wist het product ook al: de SEO-pijplijn zet ze in
      een gestructureerd **briefing-veld** (`ai/prompts/seo-prompts.ts:59`), niet in de
      copy. De vraag "in het artikel of in een begeleidend veld?" was dus beantwoord —
      alleen niet op de plek waar de eval keek.

      **Gefixt**: die bullet is vervangen door "WEL concrete, specifieke inhoud levert
      ondanks de vage brief". De overgebleven eisen (geen fluff, concreet, geen
      placeholders) zijn precies de goede toets onder productie's eigen regel.
- [x] ~~**Productbesluit B — keyword letterlijk in de H1?**~~ — ✅ **GEEN PRODUCTVRAAG.
      Opgelost 2026-08-20; het was een bug in de assert.**

      ⚠️ **Correctie op wat hier eerder stond.** Ik schreef op 20-08 dat de letterlijke
      term "twee van de vier keer" in het artikel stond en dat de assert daarom een
      muntworp was. Dat klopt niet. De term stond er **élke nacht** in (1 tot 4 keer).

      `promptfoo`'s `contains` is **hoofdlettergevoelig**, en de assert faalt zodra
      elke voorkomen aan een zinsbegin of in een kop staat:

      | nacht | kleine letter | hoofdletter | assert |
      |---|---|---|---|
      | 17-08 | 0 | 1 | faalde |
      | 18-08 | 1 | 3 | slaagde |
      | 19-08 | 0 | 2 | slaagde niet → faalde |
      | 20-08 | 1 | 1 | slaagde |

      Perfecte correlatie over 4/4 nachten. De H1 was bovendien alle vier de nachten
      **identiek** en droeg de volledige zoekterm — er viel dus niets te kiezen tussen
      "streng" en "krom Nederlands"; het model deed het gewoon goed.

      **Gefixt**: de assert toetst nu de H1, hoofdletterongevoelig, precies wat
      `BLOG_POST_SYSTEM` belooft (*"H1 contains the primary keyword"*) en wat de
      eval-prompt bestelt (*"H1 met het SEO-keyword, gebruik het keyword letterlijk"*).
      Getoetst tegen de vier opgeslagen artikelen: 4/4 PASS waar de oude F P F P gaf,
      mét tegenproef — hij faalt nog steeds bij een H1 zonder keyword, bij een keyword
      dat alleen in de body staat, en bij een ontbrekende H1.

      **Twee latente exemplaren van dezelfde bug meegenomen**: `duurzaam servies`
      (Napking) en `brand strategy` (Better Brands) waren ook `contains`. Napking zat
      ruim, maar Better Brands had in twee van de vier nachten **één** kleine-letter-
      treffer in het hele artikel — één zinsherschikking van dezelfde fout. Beide nu
      `icontains`.
- [x] Judge-variantie gemeten voor de borderline-cases — ✅ 2026-08-20 over vier
      nachtruns, gesplitst per rubric-regime. Drie cases wisselen tussen twee
      identieke runs, waarvan één (LINFI) géén judge-variantie is maar
      generatie-variantie. Zie de sectie hierboven
- [~] Besluit over de 70%-drempel onderbouwd met data i.p.v. op de rand gekalibreerd —
      **advies: nu NIETS aan de drempel doen, en over ~4 nachten opnieuw meten.**

      ⚠️ **Correctie op de cijfers die hier stonden.** Ik publiceerde 50/70/60/90% over
      vier nachten. Twee van die vier zijn gedrukt door de hoofdletter-bug in de
      LINFI-assert (zie B). Gecorrigeerd wordt het **60/70/70/90%** — nog steeds een
      spreiding van 30 punten met de gate op 70, maar minder dramatisch dan ik schreef.

      Dat de vraag verkeerd gesteld was, blijft staan: bij die spreiding op identieke
      invoer flapt elke lijn tussen 60 en 90, en de lijn verschuiven verandert daar
      niets aan. Wat wél helpt is het aantal wisselende bronnen verkleinen — en dat is
      precies wat A en B vandaag deden.

      **Daarom nu niet beslissen.** De drie fixes van 20-08 (H1-assert, twee
      `icontains`, de vage-brief-rubric) veranderen de uitkomst van komende nachten.
      Een drempel kiezen op data van vóór die fixes is opnieuw op de rand kalibreren —
      exact de fout die deze taak beschrijft. Na ~4 nachten ligt er schone data.

      **Wat er dan te kiezen valt**, in volgorde van mijn voorkeur:
      1. **Niets** — als de spreiding onder de fixes wegvalt, klopt 70% gewoon.
      2. **Meer cases.** Tien cases waarvan er één wisselt geeft al 10 punten sprong.
         Twintig cases halveert de ruis zonder de lat te verlagen.
      3. **De gate informatief maken** en de drempel op de trend leggen in plaats van
         op één nacht. Pas doen als 1 en 2 niet volstaan — een gate die niet blokkeert,
         wordt niet gelezen (gotcha 2026-07-07).

      Wat je níet moet doen is de lijn verlagen tot de nachten groen zijn. Dan meet je
      niets meer.
- [x] ~~**DE VRAAG: wat moet deze set bewaken?**~~ — ✅ **Erik koos A (2026-08-20): allebei,
      gescheiden.** Gebouwd en aangehaakt.

      **`scripts/eval/blog-post-golden/run.ts`** — 16 asserties, naar het precedent van
      `lp-variant-golden`. Geen database, geen API-sleutel, geen AI-call: hij bouwt de
      productie-prompt en toetst hem. Draait in de goedkope PR-poort als
      `eval:blog-post-golden:16`.

      Wat hij bewaakt, in vier groepen:

      | groep | wat | waarom |
      |---|---|---|
      | A | het contract dat de promptfoo-rubrics aannemen (keyword-in-H1, meta-description, géén FAQ) | verschuift er één, dan hoort iemand die rubrics ernaast te leggen — precies wat op 18-08 niet gebeurde |
      | B | dat merk-, persona-, campagne- en brief-context écht in de prompt landen | stil contextverlies is de ergste faalmodus van dit product: prompt gebouwd, generatie geslaagd, merk afwezig |
      | C | dat tone en length doorkomen, incl. de terugval bij een onbekende length | |
      | D | mutatietests | zonder die toetst A-C alleen dat er tékst is |

      **Getoetst dat hij een breuk merkt, niet alleen dat hij groen is.** De H1-belofte uit
      `BLOG_POST_SYSTEM` verwijderd → 1 van 16 faalt, op de juiste check. Alle drie de
      meta-vermeldingen verwijderd → 2 van 16. Eén vermelding weghalen laat hem groen, en dat
      is juist goed: hij toetst het contract, niet een regel. Productie daarna hersteld en
      opnieuw 16/16.

      **De promptfoo-set blijft ongewijzigd.** Die beantwoordt een andere vraag ("is de tekst
      goed?"), kost $0,34 per nacht en hoort daarom 's nachts. Deze runner beantwoordt "is de
      prompt nog heel?" — deterministisch, gratis, in de poort. Wat B zou hebben gekost (alle
      eerdere nachten onvergelijkbaar) is daarmee niet betaald.

      ⚠️ **Wat hiermee NIET is opgelost**: de divergentie zelf. Productie bestelt nog steeds
      een meta-description die de eval-prompt niet bestelt, en de eval-prompt een FAQ die
      productie niet bestelt. Die staat nu alleen niet meer stil — verandert een van beide
      kanten, dan valt de runner om en kijkt er iemand naar.

# Smoke test plan

`gh run download <nightly-run-id> -n golden-set-results-<sha>` en de JSON per case lezen.
Lokaal herhalen kan met `npx promptfoo eval -c tests/content-golden-sets/long-form/blog-post.yaml`
(kost ~55k tokens per run, ~3 min).

# Risico's

- **Verleiding om de drempel te verlagen tot hij groen is.** Dat is de lat verlagen tot je 'm niet
  meer voelt — expliciet afgewezen in `golden-set-gate-decouple`.
- **Conclusies trekken uit een set die de productie-prompt niet test.** Zie de grotere vraag
  hierboven; weeg die vóór je prompts gaat bijstellen.

# Out of scope

- De CI-structuur zelf — die is per 2026-08-16 gesplitst (`golden-set-gate-decouple`, done).
