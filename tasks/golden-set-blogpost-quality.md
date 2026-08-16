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
worktree: -
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

# Acceptatiecriteria

- [ ] Per falende case vastgelegd wélke assert zakt (artefact-analyse over ≥2 nachten)
- [ ] Per case een verdict: prompt-probleem / rubric-probleem / terechte afkeuring
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
