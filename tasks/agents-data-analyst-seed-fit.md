---
id: agents-data-analyst-seed-fit
title: smoke:agents-data-analyst kan nooit in CI draaien — hij hardcodeert twee dev-workspaces
fase: post-launch
priority: next
effort: 2-3 uur
owner: claude-code
status: done
created: 2026-08-19
completed: 2026-08-19
related-adr: -
related-spec: -
worktree: -
---

# Probleem

`scripts/smoke-tests/agents-data-analyst.ts` toetst onder meer **workspace-isolatie**:
de data-analyst-agent van workspace A mag geen rijen van workspace B zien. Dat is
beveiligingsrelevant en het enige wat die eigenschap ergens toetst.

Hij kan alleen nooit draaien buiten één specifieke dev-database:

```ts
const wsA = await prisma.workspace.findFirst({ where: { name: "Zwarthout" }, ... });
const wsB = await prisma.workspace.findFirst({ where: { name: "Linfi" }, ... });
if (!wsA || !wsB) assert("dev workspaces Zwarthout + Linfi exist", false, "seed the dev DB first");
```

13 asserties slagen daarvóór; daarna stopt hij. Hij heeft geen npm-script en
draait dus nergens — gevonden in de weesbewaker-triage (`weesbewakers-triage`).

# ⚠️ CORRECTIE 2026-08-19 — de val die hier stond bestaat niet

Deze taak waarschuwde dat "pak de twee workspaces uit de seed" hem **groen en
leeg** zou maken, omdat `TechCorp Brand` nul concurrenten heeft en de
overlap-check dan triviaal slaagt.

**Dat klopt niet.** De assertie luidt:

```js
namesA.size > 0 && rowsB.length > 0 && overlap.length === 0
```

Hij eist dat BEIDE kanten niet-leeg zijn. Empirisch getoetst met de twee
seed-workspaces vóór de fix:

```
FAIL workspace isolation ... -- A=3 B=0 overlap=0
```

Luid rood, precies zoals het hoort. De auteur van die bewaker had de val al
gedicht; ik had de assertie moeten lezen vóór ik hem als risico opschreef.

De seed moest nog steeds uitgebreid worden — `rowsB.length > 0` vraagt echte
rijen — maar dat is aanvullen, niet een valstrik omzeilen.

# Voorstel

De seed moet de tweede workspace vullen vóór deze bewaker iets waard is:

1. `prisma/seed.ts` geeft `TechCorp Brand` een eigen set concurrenten (en waar de
   bewaker verder op leunt: campagnes met deliverables binnen het meetvenster).
   **Namen die niet overlappen met die van Branddock Demo**, anders toetst de
   overlap-check ruis in plaats van isolatie.
2. De bewaker leest de twee workspaces uit de seed in plaats van op naam te zoeken
   — bij voorkeur op een stabiel kenmerk, niet op `findFirst` zonder ordering.
3. Aanhaken in `scripts/ci/run-db-guards.sh` (e2e-job, daar staat de postgres).

# Acceptatiecriteria

- [ ] Beide seed-workspaces hebben concurrenten met niet-overlappende namen
- [ ] De isolatie-assertie faalt aantoonbaar als je de `workspaceId`-filter uit de
      query haalt (**mutatietest** — zonder dat bewijs is punt 1 niet af)
- [ ] De bewaker draait zonder dev-database en zonder API-sleutels
- [ ] Aangehaakt in de db-gate, gate blijft groen
- [ ] `npx tsc --noEmit` 0 errors

# Bestanden die ik aanraak

- `prisma/seed.ts` — tweede workspace vullen
- `scripts/smoke-tests/agents-data-analyst.ts` — workspace-selectie
- `package.json` — npm-script
- `scripts/ci/run-db-guards.sh` — aanhaken

# Risico's

- **De seed uitbreiden raakt élke test die op de seed leunt.** Zeventien
  db-bewakers draaien er nu tegen; een tweede gevulde workspace kan aannames
  breken die impliciet "er is er maar één met data" veronderstellen. Draai de hele
  db-gate vóór en ná.
- **Groen is hier geen bewijs.** Zonder de mutatietest uit de acceptatiecriteria
  weet je niet of de isolatie-assertie nog iets doet.

# Notes

Niet aangehaakt gelaten in #413, waar `agents-foundation` wél is aangehaakt. Die
twee zijn de enige bewakers van `lib/agents`, en dat draait op productie.
