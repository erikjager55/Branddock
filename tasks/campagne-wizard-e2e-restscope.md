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

# Acceptatiecriteria

- [ ] Scoreverdeling van 5-8 briefings vastgelegd, met per briefing de zwaarst wegende
      dimensies
- [ ] Onderbouwd besluit over de 80-drempel (bijstellen / scoring bijstellen / laten staan),
      met het cijfer erbij
- [ ] E2E dekt foundation, concept, deliverables en review — elk met vastgelegde uitkomst
- [ ] De e2e komt langs de gate op een briefing die een mens realistisch zou indienen, niet op
      een kunstmatig opgepompte
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
