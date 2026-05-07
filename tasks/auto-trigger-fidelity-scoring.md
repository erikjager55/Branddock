---
id: auto-trigger-fidelity-scoring
title: Auto-trigger fidelity-scoring na ContentVersion creation
fase: post-launch
priority: next
effort: 1 uur
owner: claude-code
status: blocked
created: 2026-05-07
completed: -
related-adr: docs/adr/2026-05-05-fval-three-pillar.md
related-spec: docs/fidelity/F-VAL-architecture.md
worktree: -
---

# Probleem

`scoreContentFidelity()` bestaat en werkt — getest via `/api/learning-loop/fidelity/rescore/[contentVersionId]`. Maar het wordt nooit automatisch getriggerd bij content-creation. Werkstroom D blijft architectonisch geblokkeerd op ontbreken van ContentVersion-creation routes (Studio cleanup item 192).

Wanneer Studio terugkomt of canvas-orchestrator persistence krijgt → 1-line `void scoreContentFidelity({...})` toevoegen na de create.

# Voorstel

Wachten tot één van twee triggers:
1. Canvas-orchestrator krijgt persistence (creëert ContentVersion records direct)
2. Studio version-flow terug (re-introduceert versioning routes)

Wanneer trigger arriveert: 1-line addition + smoke test + done.

# Acceptatiecriteria

- [ ] Identificeer ContentVersion-creation locatie (canvas-orchestrator OR studio route)
- [ ] `void scoreContentFidelity({ contentVersionId, brandContext })` toegevoegd na create
- [ ] Async fire-and-forget (geen wait — content-flow blokkeert niet)
- [ ] Error handling: scoring failure logt warning, breekt content-creation niet
- [ ] Smoke test: maak content via canvas → verify ContentFidelityScore record verschijnt in DB binnen 30s
- [ ] Verify LearningEvent `fidelity.scored` ge-emit
- [ ] `npx tsc --noEmit` 0 errors

# Bestanden die ik aanraak

Eén of beide:
- `src/lib/ai/canvas-orchestrator.ts` (als canvas persistence krijgt)
- `src/app/api/studio/[id]/versions/route.ts` (als Studio terugkomt)

# Bestanden die ik NIET aanraak

- `src/lib/learning-loop/fidelity-scorer.ts` — al af, geen wijzigingen
- `/api/learning-loop/fidelity/rescore/[id]` — bestaande route blijft beschikbaar als handmatige trigger

# Smoke test plan

1. Trigger content-creation via canvas (post-persistence implementatie)
2. Wait 30s
3. Query: `SELECT * FROM "ContentFidelityScore" WHERE "contentVersionId" = '<id>'`
4. Verify: 1 row, `compositeScore` populated, `judgeCallTraceId` populated
5. Query: `SELECT * FROM "LearningEvent" WHERE eventType = 'fidelity.scored' AND "entityId" = '<id>'`
6. Verify: 1 event geëmit binnen 30s window

# Risico's

- **Async race condition**: ContentVersion gecommit maar transaction nog niet door — scoring krijgt phantom ID. Mitigatie: trigger NA transaction.commit() in caller
- **Cost spike**: elke generation triggert ~$0.01 judge call. Bij 1000 gen/dag = $10/dag. Mitigatie: rate-limit per workspace, of debounce per content-versie

# Out of scope

- Re-trigger bij content-edit (alleen op create voor v1)
- Bulk-rescore historische content (manual via rescore endpoint)
- ContentVersion creation routes zelf bouwen (separate task)

# Notes

**Status: blocked** tot één van twee voorwaarden:
1. Canvas-orchestrator krijgt ContentVersion persistence (separate werkstroom)
2. Studio version-flow terug (separate beslissing — Studio is grotendeels verwijderd)

Triviaal werk wanneer trigger-locatie er is — vandaar `effort: 1 uur`. Status `blocked` zodat het zichtbaar blijft in `roadmap.md` Next-bucket maar niet ten onrechte als startbaar wordt gezien.
