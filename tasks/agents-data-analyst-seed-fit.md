---
id: agents-data-analyst-seed-fit
title: smoke:agents-data-analyst kan nooit in CI draaien — hij hardcodeert twee dev-workspaces
fase: post-launch
priority: next
effort: 2-3 uur
owner: claude-code
status: open
created: 2026-08-19
completed:
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

# ⚠️ De voor de hand liggende fix maakt hem gróén en LEEG

De seed maakt twee workspaces aan, dus "pak gewoon de twee uit de seed" lijkt een
regel werk. Gemeten op een verse seed:

```
Branddock Demo | competitors = 3
TechCorp Brand | competitors = 0
```

De isolatie-assertie vergelijkt de concurrenten-tabel van A met die van B en eist
dat ze niet overlappen. Met een lege B is dat **triviaal waar**: geen overlap per
constructie. De bewaker zou groen worden zonder de eigenschap te toetsen — precies
het valse vinkje waar de hele bewakerslag van 19-08 over ging.

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
