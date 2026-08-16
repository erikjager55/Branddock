---
id: campagne-wizard-e2e-restscope
title: Campagnewizard voorbij de briefing-gate — de vier ongeteste stappen + de gate zelf
fase: post-launch
priority: now
effort: 1-2 dagen (½ dag gate-onderzoek, 1 dag e2e-uitbreiding)
owner: claude-code
status: open
created: 2026-08-16
completed:
related-adr: -
related-spec: docs/playbooks/testplan-content-items.md
worktree: -
---

# Probleem

De e2e-sweep van 15-08 ([`e2e-content-items-playwright`](done/e2e-content-items-playwright.md))
had de campagnegenerator in zijn **titel** en in zijn scope. Het acceptatiecriterium staat op
`[x]`, maar zegt in dezelfde regel het tegenovergestelde:

> `- [x]` Campagnegenerator: gestopt op de briefing-gate (AI-score 68 < drempel 80) — **correct
> productgedrag, geen storing**. Setup + Knowledge + briefingvalidatie werken aantoonbaar. De
> stappen ná de gate (foundation, concept, deliverables, review) zijn hiermee **niet** afgedekt.

De taak ging vervolgens op `done`, en het restwerk bleef alleen achter als losse regel in
`START_HERE.md`. Dat is precies hoe werk verdwijnt.

**Wat er dus nooit door het echte klikpad is gegaan**: foundation, concept, deliverables en
review — vier van de zeven wizard-stappen, en juist de stappen waar de campagne z'n inhoud
krijgt.

## De gate is niet alleen een testblokkade

De sweep gebruikte een **rijk ingevulde** testbriefing en die haalde **68**. De gate is hard:
`canProceed()` leunt op de score en de UI zegt letterlijk *"Score moet minstens 80/100 zijn om
door te gaan"* (`BriefingReviewView.tsx:499`, i18n-key `briefingReview.scoreGate`).

Als een goed gevulde briefing 68 scoort, dan lopen echte gebruikers tegen dezelfde muur.
Dit is dezelfde klasse als de golden-set-gate (zie
[`golden-set-blogpost-quality`](golden-set-blogpost-quality.md)): een drempel waarvan niemand
weet of hij ooit gekalibreerd is, en die daardoor niet meet maar tegenhoudt.

**Onderzoek dus eerst de gate, dan pas de test.** Een e2e die met een kunstmatig opgepompte
briefing langs de poort glipt, test de wizard maar verbergt het echte probleem.

# Voorstel

**Stap 1 — meet de gate (½ dag).** Scoor 5-8 realistische briefings (van kaal tot rijk
gevuld) en leg de scoreverdeling vast. Beantwoord: welke dimensies trekken de score omlaag,
is 80 haalbaar met een briefing die een mens "compleet" zou noemen, en is 80 ooit
onderbouwd of gegokt? Uitkomst is een cijfer plus een oordeel, geen gevoel.

**Stap 2 — beslis** op basis van stap 1: gate bijstellen, de scoring bijstellen, of de gate
laten staan omdat 68 terecht is. **Niet de drempel verlagen tot de test groen wordt** — dat is
de lat verlagen tot je 'm niet meer voelt.

**Stap 3 — e2e uitbreiden.** Voeg de vier stappen toe aan het bestaande Playwright-project
(`e2e/content-sweep/`, eigen config, `retries: 0`, ruime timeout). Per stap vastleggen:
bereikt, output aanwezig, foutmelding, duur.

**Bijvangst meenemen** — het dode endpoint uit vondst 2 van de sweep:
`/api/campaigns/wizard/deliverable-types` bestaat nog en is in #468 (B5) inhoudelijk
rechtgezet naar de canonieke registry, maar zijn enige consument `useDeliverableTypes()`
(`features/campaigns/hooks/index.ts:566`) heeft **nul call-sites**. Gefixte dode code is nog
steeds dode code: verwijder beide, of documenteer waarom ze blijven.

## ✅ Stap 1+2 — gemeten en gefixt (2026-08-16)

**De gate was niet het probleem. De scoring eronder was stuk.** Drie defecten, alle drie
gevonden door de échte productie-call (`validateBriefing`, Gemini Flash) te draaien over 7
briefings van leeg tot overcompleet, tegen de Napking-workspace — dezelfde als de sweep.

### Defect 1 — `gaps[].field` werd nooit geproduceerd

De prompt vroeg *"List each missing or weak **element**"* en noemde de JSON-sleutels nergens.
Het model leverde dus `element`; het schema eist `field`. Elke run gaf een Zod-warning en
`validateAndCoerce` ging door met rauwe data.

Gevolg in de UI: `gap.field` is `undefined` → elke gap toont
`t("briefingReview.general")` (**"Algemeen"**) en `mapGapToField(undefined)` geeft `null`,
dus de klik-naar-het-juiste-veld werkte nooit. Precies de begeleiding die een gebruiker nodig
heeft om lángs de gate te komen, was stil uitgeschakeld.
**Fix**: de drie sleutels (`field` / `severity` / `suggestion`) expliciet benoemd in de prompt,
met de toegestane veldnamen erbij.

### Defect 2 — de rubric en de gate hanteerden een ander getal

De prompt zei `isComplete: true ONLY if overallScore >= 70`; `wizard-steps.ts:75` eist `>= 80`.
Het model markeerde een briefing dus als compleet waarna de UI 'm alsnog tegenhield (gemeten:
case *3-redelijk*, score 75, `isComplete: true`, geblokkeerd).
**Fix**: de rubric gelijkgetrokken op 80. Bewust die richting op — de bar gaat niet omlaag.

### Defect 3 — de validatie crashte op rijke briefings

`maxTokens: 8192` was te krap: bij een rijk gevulde briefing tegen een workspace met volledig
merk-DNA brak de JSON middenin af en gooide de hele validatie. **2 van de 9 runs.** De gebruiker
zag dan geen score maar een fout. Zelfde klasse als B6 (changelog #468): Gemini rekent
thinking-tokens mee in het output-budget.
**Fix**: 16384. Bewust het budget verhoogd i.p.v. thinking uitzetten — dit is een beoordelende
call, daar is redeneren de kwaliteit.

### Meetresultaat

| case | vóór (2 runs) | ná (2 runs) |
|---|---|---|
| 1-leeg | 58 / 58 | 65 / 65 |
| 2-minimaal | 55 / 58 | 55 / 58 |
| 3-redelijk | 75 / 76 | 75 / 78 |
| 4-rijk | 82 / 82 | 85 / 85 |
| **5-rijk+doelgroep** | **68 / 78** | **88 / 85** |
| 6-zeer-rijk | 82 / 82 | 85 / 78 |
| 7-overcompleet | 85 / **crash** | 94 / 88 |

**De 68 uit de sweep is gereproduceerd én verklaard**: case 5 is inhoudelijk rijker dan case 4
en scoorde tóch 14 punten lager. Die niet-monotonie is weg; rijke briefings halen nu 85-94.

### Wat NIET is opgelost — en niet oplosbaar is met prompt-werk

Er blijft **5-10 punten run-op-run-variantie**. Case 6 scoorde 85 en daarna 78: over de gate
heen en er weer onder. Dat is inherent aan een LLM-judge, niet aan deze prompt.

Twee gevolgen. (1) Elke harde drempel laat gevallen díé er vlak omheen zitten flippen — dat is
een eigenschap van het ontwerp, geen bug. (2) **De e2e moet een briefing gebruiken die er
comfortabel bóven zit** (case 7-niveau, 88-94), niet één die er tegenaan schurkt; anders is de
test zelf flakey. Vastgelegd zodat dat niet als "gate kapot" terugkomt.

### Besluit over de 80-drempel

**Laten staan.** Met een werkende scoring blokkeert 80 wat het hoort te blokkeren: een briefing
met alle velden kort-maar-concreet (case 3) haalt 75-78 en gaat niet door; een echt uitgewerkte
briefing haalt 85+. De klacht "de gate is te streng" kwam voort uit een kapotte meting, niet uit
een verkeerde drempel.

## Stap 3 — e2e voorbij de gate: één productiebug gevonden, één open (2026-08-16)

De bestaande `campaign-generator.spec.ts` bleek al een volwaardige driver. Hij hoefde niet
herschreven — alleen zijn briefing moest naar het niveau dat stabiel boven de 80 landt (zie
kalibratie hierboven). Dat lukte: **score 85, gate gepasseerd**, voor het eerst.

### 🐛 Productiebug: stap 4 van de wizard was volledig stuk

Direct achter de gate:

    Phase 2 (Strategy Foundation) failed: 400
    "thinking.type.enabled" is not supported for this model.
    Use "thinking.type.adaptive" and "output_config.effort"

Elke poging om de strategie-foundation te bouwen gaf een harde 400. In de UI zag dat eruit als
een Continue-knop die klikbaar is maar niets doet — geen foutmelding, geen voortgang.

**Oorzaak**: `ai-caller.ts` koos de thinking-API op een handmatige namenlijst
(`/opus-4-7|opus-4-8|opus-5/`). De strategy-chain draait op `claude-sonnet-5` en matchte niet.
Er stond zelfs een comment bij uit mei 2026 over precies deze klasse ("Voorheen falden Opus
calls silently") — tweede keer, andere familie.

**Fix**: detectie op **generatie** i.p.v. op naam (≥ 4.7 → adaptive). Geverifieerd tegen de
acht modelnamen die in de codebase voorkomen; het gedrag komt exact overeen met wat de comment
beschreef, maar een nieuwe familie op generatie 5 valt nu vanzelf goed.

**Waarom dit nooit eerder opviel**: de briefing-gate blokkeerde op stap 3, dus stap 4 werd nooit
bereikt. De sweep noteerde "correct productgedrag, geen storing" en de taak ging op `done`.
Achter die gate zat een dode stap. Exact het patroon uit de gotcha van diezelfde dag: een dode
feature verbergt zijn eigen gaten.

### ⚠️ Nog open: fase 1 produceert soms onparseerbare JSON

In 1 van de 4 runs faalde de briefing-validatie zelf:

    [validate-briefing] Failed to parse Gemini response as JSON:
    Expected ',' or ']' after array element at position 1643

Positie 1643 is vroeg — dit is dus geen afkapping (die was het `maxTokens`-probleem hierboven,
en dat is gefixt) maar **malformed JSON midden in een array**. Andere oorzaak, zelfde gevolg:
de gebruiker ziet geen score maar een fout, en de wizard blijft staan.

**Opgevolgd 2026-08-16.** De foutmelding was zelf het grootste probleem: hij toonde de
**eerste 200 tekens** van de respons terwijl de fout op positie 1643 zat. Je kreeg dus de kop
van een verder correcte JSON te zien en niets over de fout — daarom was dit niet te
diagnosticeren. De melding toont nu een venster van 240 tekens róndom de foutpositie, met een
`⟪PARSE FAALT HIER⟫`-markering, plus responslengte en `finishReason`.

**Reproductie mislukt, en dat is zelf een bevinding.** 22 echte validaties (14 via de
kalibratie, 8 gericht met exact de briefing die het brak) gaven **nul** parse-fouten. De
frequentie is dus veel lager dan de "1 op 4" die ik uit één waarneming afleidde — dat was een
steekproef van vier.

**Bewust géén retry toegevoegd.** Dat was verleidelijk (de gebruiker ziet nu een harde fout op
een geldige briefing), maar `createStructuredCompletion` is gedeeld door tientallen flows. Een
gedragswijziging daar, op een defect dat ik 22 keer niet kon reproduceren, is een gok met een
groot bereik. De volgende keer dat het gebeurt — in dev of op prod — staat er nu wél in de log
wat er precies misging; dán is er een onderbouwde fix mogelijk in plaats van een vangnet.

### Stand van de vier stappen

| stap | status |
|---|---|
| 4 Concept / Foundation | 🐛 was volledig stuk (400) — gefixt, herverificatie nodig |
| 5 Deliverables | nog niet bereikt |
| 6 Review | nog niet bereikt |
| 7 Afronding | nog niet bereikt |

**De e2e is nu bruikbaar maar niet betrouwbaar**: 4 runs gaven 4 verschillende uitkomsten,
telkens door een andere oorzaak (gate 68 → gate 78 → door met 85 → fase-1-parsefout). Elke run
kost ~6 minuten met echte AI-calls. De resterende stappen afdekken vraagt eerst dat fase 1
betrouwbaar is; anders meet je de flakiness, niet de wizard.

# Acceptatiecriteria

- [x] Scoreverdeling van 7 briefings vastgelegd (2 runs vóór, 2 ná de fixes)
- [x] Onderbouwd besluit: **scoring bijgesteld, drempel gelaten** — zie meetresultaat
- [~] E2E komt voorbij de gate en bereikte stap 4 (daar zat een 400-bug, nu gefixt).
      Stap 5-7 nog niet bereikt — geblokkeerd op de fase-1-parsefout hierboven
- [x] De e2e komt langs de gate op een realistische (zij het bewust overcomplete) briefing —
      score 85, zonder de gate te omzeilen
- [ ] `/api/campaigns/wizard/deliverable-types` + `useDeliverableTypes()`: verwijderd óf
      gedocumenteerd waarom ze blijven
- [ ] `npx tsc --noEmit` 0 errors · `eslint` 0 errors

# Smoke test plan

`npx playwright test --project=content-sweep --grep campaign`. De sweep-opzet vraagt
`CRON_SECRET` in de env (les uit 15-08: long-form/website-types nemen anders de queue-route
en blijven hangen).

# Risico's

- **De gate bijstellen zonder meting** is de verleiding. Eerst de verdeling, dan het besluit.
- **Een e2e die de gate omzeilt** (score forceren in de store) test de wizard wel maar
  verbergt of echte gebruikers er langs komen. Als je dat doet: leg het expliciet vast als
  bekende beperking.

# Out of scope

- De inhoudelijke kwaliteit van wat de wizard genereert — dit gaat over bereikbaarheid van de
  stappen, niet over de output.
- Vondst 3 uit de sweep (CONTENT-campagnes onzichtbaar in de campagnekiezer): **geen bug**.
  `campaigns/route.ts:30` sluit ze bewust uit mét comment ("they show in the content library").
  Kostte destijds een debugronde; hier vastgelegd zodat dat niet nog eens gebeurt.
