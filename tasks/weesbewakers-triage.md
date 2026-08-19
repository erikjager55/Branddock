---
id: weesbewakers-triage
title: 73 bewakerbestanden hebben geen npm-script en draaien dus nergens — 55 daarvan zijn groen
fase: post-launch
priority: next
effort: 2-4 uur
owner: claude-code
status: open
created: 2026-08-19
completed:
related-adr: -
related-spec: -
worktree: -
---

# Probleem

De survey van 19-08 (`slapende-bewakers-survey`) telde **78 smoke/eval-scripts in
`package.json`** en haakte daar 44 van aan. Die telling heeft een blinde vlek: een
bewakerbestand **zonder npm-script** komt er niet in voor.

Gemeten: **73 bestanden** in `scripts/smoke-tests/` en `scripts/eval/` zijn niet
bereikbaar vanuit een npm-script, ook niet via een import vanuit een bereikbaar
script. Daarvan draaien er **55 groen**, zonder database en zonder sleutels
(gemeten met een dode `DATABASE_URL` en ongeldige API-sleutels), samen **1.084
asserties**.

Gevonden doordat `smoke:deep-research` in de bewaker-audit uitkwam op een
`assertSafeUrl`-wijziging in `search.ts`; het naspeuren wie dát bewaakt leidde
naar `ssrf-guard.ts` — bestaand, groen, 65 asserties, nooit gedraaid.

## De splitsing

| groep | bestanden | asserties | oordeel |
|---|---:|---:|---|
| `web-page-builder-phaseNN` (junireeks) | 27 | 529 | ⚠️ vraagt ontdubbeling |
| overige, losse onderwerpen | 28 | 555 | direct bruikbaar |
| rood of timeout | 18 | — | apart uitzoeken |

⚠️ **De junireeks is geen simpele winst.** `smoke:web-page-builder` draait een
ketting van ~53 phase-bestanden via `&&`, maar dat is een **andere serie met
dezelfde nummers**: de ketting heeft `phase45-typescale-normalizer` (aug), de wezen
`phase45-result-audit` (5 juni). De junireeks 40-68 is nooit aan de ketting
toegevoegd. Of dat abandonnement of bewuste opvolging is, vraagt oordeel per
bestand — ze zijn wél allemaal groen, dus ze toetsen levende code.

## De 28 losse, gesorteerd op asserties

```
 65  ssrf-guard                      12  violation-dedup
 52  deliverable-content-accessor    11  brand-language-detect
 46  competitor-diff-engine          11  claw-fencing
 32  photography-token-truncation    10  agent-schedule-cadence
 31  property-evals                   8  enforce-brand-name-capitalization
 30  sanitize-strategy-output         7  security-medium
 29  feature-visual-prompts           6  plan-enforcement
 25  heuristic-stem-variants          3  compose-pipeline-gemini
 25  plan-and-solve                   3  ui-content-locale-separation
 23  section-edit-synthetic-ids       1  brandmd-emitter
 20  feature-visual-preserve          1  brandmd-lifecycle
 19  apify-fallback-chain
 19  auto-iterate
 18  edit-distance
 18  tree-of-thoughts-angles
 16  position-swap-judge
 14  feedback-compiler
```

**Twee daarvan zijn beveiligingsbewakers.** `ssrf-guard.ts` is op 30-06 gecommit
als onderdeel van `faf2dbe6` ("SSRF-convergentie — fetch-with-limit→safeFetch") en
heeft sindsdien nooit gedraaid. `security-medium.ts` idem sinds 26-06.

# Voorstel

1. De 28 losse een npm-script geven en aanhaken in `scripts/ci/run-guards.sh`
   (~4s totaal). Begin bij `ssrf-guard` en `security-medium`.
2. De junireeks per bestand beoordelen: gedekt door de augustus-ketting, of
   verloren dekking? Wat gedekt is, verwijderen; wat niet, aanhaken.
3. De 18 rode apart uitzoeken — een rode wees kan een verouderde assertie zijn
   (de klasse uit #375/#393) of een echte regressie die niemand ziet.

# Acceptatiecriteria

- [ ] De 28 losse hebben een npm-script en draaien in een gate
- [ ] Elk van de 27 junireeks-bestanden is beoordeeld: aangehaakt óf verwijderd
      met reden
- [ ] De 18 rode zijn getrieerd
- [ ] `package.json`-telling is niet langer de bron van waarheid voor "welke
      bewakers bestaan er" — de bestandslijst is dat

# Risico's

- **Een groene wees kan verouderd zijn.** Groen betekent hier "draait en toetst
  iets", niet "toetst het júiste". De junireeks is van begin juni; het gebied is
  sindsdien flink verbouwd. Draai `git log -S` op de asserties vóór je iets een
  regressie noemt (zie #375, #393).
- **Aanhaken is niet neutraal.** Een slapende bewaker aanzetten maakt van elke
  bevroren assertie een actieve blokkade — precies wat er bij
  `smoke:geo-directives` gebeurde.

# Notes

Meetmethode: elk bestand gedraaid met `DATABASE_URL` naar een dode poort en alle
`*_API_KEY` op `ongeldig`. ⚠️ De assertie-teller moet **drie** formaten aan: de
`✓`/`PASS`-markers, `N passed` en `Total: N`. Een eerste versie telde alleen de
markers en gaf bij `ssrf-guard` **"nul asserties"** terwijl hij er 65 doet — dat
las als een vals vinkje terwijl het een telfout was.
