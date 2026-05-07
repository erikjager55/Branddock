---
id: content-versioning-crud
title: ContentVersion CRUD-routes + version history UI in canvas
fase: pre-launch
priority: now
effort: 3 dagen
owner: claude-code
status: done
created: 2026-05-07
completed: 2026-05-07
related-adr: -
related-spec: -
worktree: branddock-feat-content-versioning
---

# Probleem

`ContentVersion` model bestaat in Prisma schema (regel 1089) met `contentSnapshot`, `versionNumber`, `diffTracking`, `fidelityScores` velden, maar er zijn **geen routes** die versions schrijven of lezen. `src/lib/versioning.ts:1-94` dekt alleen `ResourceVersion` (personas, products, brand assets); content blijft orphan.

Gevolgen:
- `auto-trigger-fidelity-scoring` task is **blocked** omdat het ContentVersion-routes nodig heeft
- Geen edit-history per content-item — user kan niet terug naar eerdere AI-output of eigen edit
- Geen tracking van AI-vs-user edits voor learning-loop

# Voorstel

1. Implementeer CRUD-routes voor `ContentVersion` analoog aan bestaande `ResourceVersion` pattern in `src/lib/versioning.ts`:
   - `POST /api/content/[componentId]/versions` — create version (snapshot + edit-type "ai" | "user" | "regenerate")
   - `GET /api/content/[componentId]/versions` — list versions met diff-summary
   - `GET /api/content/[componentId]/versions/[versionId]` — full version detail
   - `POST /api/content/[componentId]/versions/[versionId]/restore` — restore + nieuwe version
2. Auto-create version bij elke `generate` / `regenerate` / save-edit in studio (hooks op routes uit `studio-content-generation-real-ai`)
3. UI: version-history sidebar in canvas (lijst, diff-view, restore-knop)
4. Cache invalidation per `cacheKeys.prefixes.CONTENT_VERSIONS(componentId)`

# Acceptatiecriteria

- [ ] 4 routes geïmplementeerd met workspace-isolation (`resolveWorkspaceId`)
- [ ] Version auto-created bij `generate` (edit-type "ai"), `regenerate` (edit-type "regenerate" + feedback-text), save-edit (edit-type "user")
- [ ] `versionNumber` auto-increment per `componentId`
- [ ] Diff-tracking veld bevat structured diff (welke velden veranderd, oude vs nieuwe waarde)
- [ ] UI: version-history sidebar in `src/components/canvas/...` met list + restore-button
- [ ] Restore creëert nieuwe versie (geen mutate-in-place) — version-trail blijft compleet
- [ ] `auto-trigger-fidelity-scoring` task is unblocked en kan ContentVersion.id gebruiken
- [ ] Geen `any` types
- [ ] `npx tsc --noEmit` 0 errors
- [ ] `npm run lint` 0 errors
- [ ] Smoke-test uitgevoerd

# Bestanden die ik aanraak

- `src/app/api/content/[componentId]/versions/route.ts` (nieuw)
- `src/app/api/content/[componentId]/versions/[versionId]/route.ts` (nieuw)
- `src/app/api/content/[componentId]/versions/[versionId]/restore/route.ts` (nieuw)
- `src/lib/versioning.ts` — helper functies voor ContentVersion (analoog aan ResourceVersion)
- `src/lib/diff/content-diff.ts` (nieuw) — structured diff
- `src/components/canvas/VersionHistorySidebar.tsx` (nieuw)
- `src/lib/cache-keys.ts` — nieuwe prefix CONTENT_VERSIONS
- Hooks in routes uit `studio-content-generation-real-ai`: generate/regenerate/save → call `createContentVersion()`

# Bestanden die ik NIET aanraak

- `prisma/schema.prisma` — `ContentVersion` model bestaat al, geen wijziging
- `auto-trigger-fidelity-scoring` route — die is unblocked en kan in eigen task afgerond worden
- ResourceVersion code — alleen pattern overnemen

# Smoke test plan

1. Generate een component → check dat ContentVersion #1 met edit-type "ai" is aangemaakt in DB
2. Edit content + save → ContentVersion #2 met edit-type "user" + diff-tracking veld bevat veranderde velden
3. Regenerate met feedback → ContentVersion #3 met edit-type "regenerate" + feedback in metadata
4. Open version-sidebar in canvas → 3 versions zichtbaar met timestamp + edit-type
5. Klik Restore op v1 → ContentVersion #4 wordt aangemaakt met content van v1 (niet mutate v1 zelf)
6. Verifieer dat workspace-isolation werkt (versions van workspace A onzichtbaar in workspace B)

# Risico's

- **Storage groei**: elke generate maakt versie aan → DB-tabel groeit snel. Mitigatie: cap op 50 versions per component, oudste versions cascade-delete bij overschreiding
- **Diff-tracking complexity**: structured diff voor genested JSON is non-triviaal. Mitigatie: gebruik bestaande lib (bv `deep-diff` of `microdiff`), niet zelf bouwen
- **Race conditions**: parallelle generate + save kunnen racen op versionNumber. Mitigatie: `@@unique([componentId, versionNumber])` constraint + retry-on-conflict in helper

# Out of scope

- Auto-trigger fidelity-scoring na version-create (eigen task `auto-trigger-fidelity-scoring`, wordt unblocked door deze)
- Version-comparison view (side-by-side diff) — toevoegen post-launch indien nodig
- Cross-component version tracking (per-deliverable bundle) — alleen per-component voor nu
- Resource versioning refactor (bestaande ResourceVersion pattern blijft)

# Notes

Dependency: deze task hoort logisch ná `studio-content-generation-real-ai` te komen, omdat versions worden gecreëerd bij generation-events. Kan wel parallel ontwikkeld worden mits de hooks pas worden ingebouwd nadat #1 echte AI levert.

Bestaande `ResourceVersion` pattern in `src/lib/versioning.ts:1-94` is de canonieke referentie — copy-mirror waar mogelijk om consistency te behouden.
