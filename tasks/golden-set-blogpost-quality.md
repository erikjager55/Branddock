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
worktree: branddock-golden-set  # geclaimd door sessie 41832dfd, 2026-08-18
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
3. **Judge-variantie meten** op de borderline-cases
   (`scripts/smoke-tests/position-swap-judge.ts`) — kost live-LLM-runs, ~55k tokens
   per run, bewust niet autonoom gestart.
4. **Het v2-besluit** (orchestrator-wrapped prompts). De thought-leadership-case is
   er het argument voor: die eist onderbouwing met data terwijl de eval geen enkele
   bron meegeeft, terwijl productie wél merk- en kennis-context injecteert.

# Acceptatiecriteria

- [x] Per falende case vastgelegd wélke assert zakt (artefact-analyse over ≥2 nachten) — 2026-08-18
- [x] Per case een verdict: prompt-probleem / rubric-probleem / terechte afkeuring — 2026-08-18
- [ ] **Productbesluit A — aannames in de tekst?** Hóórt gepubliceerde copy zijn
      aannames te benoemen bij een vage brief, of hoort dat in een begeleidend veld?
      De rubric eist het nu ín het artikel; de prompt kent al een verwante regel
      ("signaleer het conflict" bij off-brand briefs). Zonder dit besluit is niet te
      bepalen of de vage-brief-case een prompt-fout of een rubric-fout is. ⏳ Erik
- [ ] **Productbesluit B — keyword letterlijk in de H1?** Ook als de zin daardoor
      krom wordt? De LINFI-case toetst `contains 'handgemaakte vloeren'` op het hele
      artikel, met zoekterm `handgemaakte vloeren maatwerk`. Ja → de assert hoort op
      de H1-regel te toetsen (strenger én eerlijker). Nee → het moet een flexibele
      regex worden. ⏳ Erik
- [ ] Judge-variantie gemeten voor de borderline-cases
- [ ] Besluit over de 70%-drempel onderbouwd met data i.p.v. op de rand gekalibreerd
- [ ] Expliciet besluit over de v2 (orchestrator-wrapped prompts) — doen of bewust niet

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
