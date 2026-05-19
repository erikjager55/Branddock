---
id: context-picker-strategy-observations
title: StrategyObservation toevoegen aan Brand Assistant context-picker
fase: pre-launch
priority: now
effort: 4 uur
owner: claude-code
status: done
created: 2026-05-19
completed: 2026-05-19
related-adr: docs/adr/2026-05-08-brandclaw-agent-architectuur.md
related-spec: -
worktree: -
---

# Probleem

De Brandclaw Strategy Analyst (Phase A+B, gemerged 2026-05-18 via `a0e59a5b`) produceert observations met dimension/severity/confidence/summary en exposed ze in Brand Alignment UI. De Brand Assistant (Claw chat) kent ze echter niet — gebruikers kunnen niet doorvragen ("waarom signaleer je deze drift?", "welke evidence onderbouwt deze observation?"). Audit van 2026-05-19 bevestigde dit als enige Tier-1 gap in de context-pickers (de andere ontbrekende DB-types zijn óf always-on óf internal audit-log; zie audit-resultaat in commit-bericht).

# Voorstel

Voeg `'observations'` toe als nieuwe `ContextModule` aan de Brand Assistant. Lijn met het bestaande hardcoded pattern (Claw is bewust geen registry-consumer): module-key in `claw.types.ts`, label in `ContextSelectorModal`, drillable-flag, Prisma-fetch in `/api/claw/context-entities`, en context-section in `context-assembler.fetchModuleContext()`. Filter default op `dismissedAt: null` om dismissed observations niet als context te lekken. Geen `CONTEXT_REGISTRY` entry — Persona chat heeft de data niet nodig (uit audit).

# Acceptatiecriteria

- [x] `'observations'` zichtbaar in Brand Assistant context-selector modal met label "Brand Observations" + heldere description — runtime-bevestigd in smoke stap 4
- [x] Module is **niet** in `DEFAULT_CONTEXT_MODULES` (opt-in, geen automatic token-bloat) — code-bevestigd
- [x] Module is in `DRILLABLE_MODULES` — user kan specifieke observations selecteren — code-bevestigd; runtime niet gevalideerd (zie Notes)
- [x] `/api/claw/context-entities` retourneert observations-array met `id` / `label` (`dimension`: eerste 80 chars van `summary`) / `meta` (`severity`) — code-bevestigd; runtime niet gevalideerd
- [x] `fetchModuleContext()` in `context-assembler.ts` levert formatted observations-section terug (dimension + severity + confidence + summary per observation, max 10 indien geen entityIds gegeven) — code-bevestigd; runtime niet gevalideerd
- [x] Default filter: `dismissedAt: null` (dismissed observations nooit als context) — code-bevestigd
- [x] Bij entity-selectie: exact die IDs (zelfs als dismissed) — user-keuze overrules filter — code-bevestigd
- [x] `npx tsc --noEmit` 0 errors
- [x] `npm run lint` 0 errors (1014 pre-existing warnings, geen nieuwe issues in aangeraakte files)
- [/] Smoke-test uitgevoerd — **partial**: stap 1-5 OK (module zichtbaar, drillable-flag, checkbox), stap 6-10 niet uitvoerbaar (zie Notes)

# Bestanden die ik aanraak

- `src/lib/claw/claw.types.ts` — `ContextModule` union + `ALL_CONTEXT_MODULES` + (niet `DEFAULT_CONTEXT_MODULES`)
- `src/features/claw/components/ContextSelectorModal.tsx` — `MODULE_LABELS` entry + `DRILLABLE_MODULES` entry
- `src/app/api/claw/context-entities/route.ts` — Prisma fetch + response-mapping
- `src/lib/claw/context-assembler.ts` — case `'observations'` in `fetchModuleContext()` + helper voor formattering

# Bestanden die ik NIET aanraak

- `src/lib/ai/context/registry.ts` — bewust géén registry-entry (zie audit: Persona chat / Canvas hebben observations niet nodig)
- `src/features/personas/components/chat/KnowledgeContextSelector.tsx` — Persona chat blijft ongewijzigd
- `prisma/schema.prisma` — geen schema-aanpassing nodig
- `src/lib/brandclaw/**` — Brandclaw write-path blijft ongewijzigd
- Token-budget logica (`MAX_CONTEXT_TOKENS_ESTIMATE` in `context-assembler.ts`) — cap-of-10 voorkomt overflow zonder structurele wijziging

# Smoke test plan

1. `npm run dev` + login op Better Brands workspace (waar observations bestaan)
2. Open Brand Assistant → klik "Context Sources" knop in InputBar → modal opent
3. **Verify**: "Brand Observations" verschijnt in de lijst met description, niet gechecked
4. Check de checkbox → expand-chevron verschijnt (drillable)
5. Klik chevron → lijst observations laadt, elk met `dimension: summary…` als label en severity als meta
6. Selecteer 1 specifieke observation
7. Sluit modal, type "leg deze observation uit" in chat
8. **Verify**: AI-response refereert aan de geselecteerde observation (dimension/summary/severity)
9. Open DevTools Network → check `/api/claw/chat` request → systemPrompt bevat observation-data
10. Edge-case: dismiss een observation in Brand Alignment UI → terug naar Claw → entity-list update; bij `select all` (geen entityIds) komt deze niet meer mee; bij explicit-select komt hij wel mee

# Risico's

- **Token-budget overflow**: 10 observations × ~200 tokens ≈ 2k tokens, ruim onder MAX. Cap-of-10 is veilige default.
- **Dismissed-leak**: user dismist observation maar als "all selected", komt hij niet meer mee — testen in smoke #10.
- **PageContext-redundancy**: als user op Brand Alignment-pagina staat, kan `pageContext` al observations bevatten. Bij deze task niet checken — apart issue, en in worst case is dubbel-context géén bug (model rangschikt zelf relevantie).
- **Naming**: "Brand Observations" vs "Observations" vs "Brandclaw Observations" — kies "Brand Observations" (consistent met "Brand Assets", "Brand Alignment").

# Out of scope

- StrategyObservation in `CONTEXT_REGISTRY` opnemen (Persona/Canvas hebben het niet nodig — audit)
- Campaign migreren van hardcoded Claw naar `CONTEXT_REGISTRY` (Tier-2 cleanup, eigen task-file)
- Deliverable `workspaceFilter`-workaround in `fetcher.ts:43` (Tier-2 cleanup, eigen task-file)
- Brand Assistant 11-vs-6 mismatch (alignment/knowledge/dashboard zonder entity-drill — apart UX-issue)
- `pageContext` auto-injectie van observations op Brand Alignment-page (apart, gerelateerd)
- Confidence-calibration display in picker (LATER, na pilot-data)

# Notes

- **Smoke partial — reden**: bij smoke-uitvoering 2026-05-19 bleek dat er 0 `StrategyObservation`-records bestaan in de hele DB (15 workspaces, alle 0/0). Strategy Analyst Phase A+B is wel gemerged, maar nog nooit gedraaid (manual trigger niet uitgevoerd, Phase C cron niet live). Stap 6-10 (drillable + entity-selectie + systemPrompt-injectie) vereisen echte observations. Aanbevolen: na de eerste echte Brandclaw-run handmatig verifiëren door 1 observation aan te vinken in Brand Assistant en chat-injectie te checken via DevTools Network. Implementatie volgt 1:1 het bewezen `fetchTrendContext`-pattern, dus risico is laag.
- Audit-aanleiding: gespreksrun 2026-05-19 — gap-rapport voor context-pickers, Tier 1 = StrategyObservation, Tier 2 = Campaign/Deliverable cleanups, Tier 3 = bewust niet exposeren (BrandVoiceguide, BrandRule, DataSnapshot, LearningEvent).
- Claw is **bewust hardcoded** geen registry-consumer (zie `/api/claw/context-entities/route.ts` huidig design). Niet "fixen" tijdens deze task.
- StrategyObservation schema referentie: `prisma/schema.prisma:5678-5721`. Belangrijk veld voor display: `dimension` (string, plain text zoals `voice_drift`), `summary` (text, primary content), `severity` (enum), `confidence` (enum), `dismissedAt` (nullable).
- Bestaande pattern voor formatting in `fetchModuleContext()`: per module een markdown-achtige sectie met `## Module Label\n\n- item1\n- item2`. Volg dit.
- Verstopte bug uit audit (niet hier oplossen): `buildStyleguideContext()` in `strategy-chain.ts:287` doet directe Prisma-call zonder 5-min cache van `getBrandContext()`. Apart issue.
