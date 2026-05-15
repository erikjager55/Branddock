---
id: tone-of-voice-merge-into-brand-voice
title: Tone of Voice tab consolideren in Brand Voice + moved-banner opruimen
fase: pre-launch
priority: now
effort: 1-2 dagen
owner: claude-code
status: done
created: 2026-05-15
completed: 2026-05-15
related-adr: docs/adr/2026-05-15-tone-of-voice-consolidation.md
related-spec: -
worktree: -
---

# Probleem

De Brand Styleguide heeft een aparte tab "Tone of Voice" met `contentGuidelines[]`, `writingGuidelines[]` en `examplePhrases` (do/don't). De Brand Voice module bevat `voiceDescription`, `toneDimensions`, vocabulary, channel-tones en writing-samples. Beide worden gelezen door AI-prompts (~25 files) — er is geen feitelijke overlap, maar wel een gespleten source-of-truth voor "hoe het merk klinkt". De Brand Personality view toont nog een migratie-banner "Voice, Tone & Communication Style — moved" als residu van een eerdere migratie naar Brand Voice; die heeft geen functie meer. Een gebruiker die de stem van het merk wil definiëren, raakt verdwaald tussen drie locaties.

# Voorstel

Consolideer de drie tone-of-voice velden in `BrandVoiceguide` (Voice DNA tab krijgt content/writing guidelines; Vocabulary tab krijgt do/don't examples), update alle 25 lees-sites (AI-context-builders, F-VAL alignment, export emitters, claw read-tools, brand-kit PDF, snapshots, campaign strategy), verwijder de Tone of Voice tab uit Brand Styleguide en verwijder de moved-banner uit Brand Personality. Schema-migratie is additief eerst (nieuwe velden op BrandVoiceguide), gevolgd door data-migratie via idempotent script, dan reads-switch, dan oude velden weg.

# Acceptatiecriteria

- [ ] `npx tsc --noEmit` 0 errors
- [ ] `npm run lint` 0 errors
- [ ] Prisma schema valid, `npx prisma db push` slaagt zonder data-loss-waarschuwing op stap 4, met `--accept-data-loss` op stap 14 (na verificatie)
- [ ] Migratie-script `prisma/scripts/migrate-tone-of-voice-to-voiceguide.ts` idempotent: 2e run logt `0 actions`
- [ ] Brand Voice → Voice DNA tab toont Content Guidelines + Writing Guidelines secties (OBSERVED/RECOMMENDED badges intact, edit/save werkt, persisteert na reload)
- [ ] Brand Voice → Vocabulary tab toont Do/Don't examples sectie (edit/save werkt)
- [ ] Brand Styleguide → tab "Tone of Voice" is verdwenen uit tab-nav, geen dead route, geen 404
- [ ] Brand Personality view → "Voice, Tone & Communication Style — moved" blok is verdwenen
- [ ] `getBrandContext(workspaceId)` bevat content + writing guidelines in `voiceContext` uit voiceguide (server-log check)
- [ ] F-VAL alignment, Studio tone-check, claw read-tools, campaign-strategy lezen alle uit voiceguide
- [ ] Brand-kit PDF-export bevat de guidelines in de voice-sectie
- [ ] Smoke-test uitgevoerd (alle 9 punten — zie sectie hieronder)
- [ ] Changelog entry toegevoegd

# Bestanden die ik aanraak

**Verwijderd**:
- `src/features/brandstyle/components/ToneOfVoiceSection.tsx`
- `src/app/api/brandstyle/tone-of-voice/route.ts`

**Geschreven**:
- `tasks/tone-of-voice-merge-into-brand-voice.md` (dit bestand)
- `docs/adr/2026-05-15-tone-of-voice-consolidation.md`
- `prisma/scripts/migrate-tone-of-voice-to-voiceguide.ts` (eenmalig migratie-script — uitgevoerd op alle 13 workspaces, daarna verwijderd voor lint-conformiteit; ADR documenteert het migratie-pad)

**Gewijzigd (schema + AI-context)**:
- `prisma/schema.prisma`
- `src/lib/ai/brand-context.ts`
- `src/lib/ai/knowledge-context-fetcher.ts`

**Gewijzigd (UI)**:
- `src/features/brandstyle/components/StyleguideTabNav.tsx`
- `src/features/brand-asset-detail/components/BrandPersonalitySection.tsx`
- `src/features/brandvoice/components/sections/VoiceDnaSection.tsx`
- `src/features/brandvoice/components/sections/VocabularySection.tsx`
- Brandstyle/brandvoice hooks + types files (`brandstyle.types.ts`, `brandvoice.types.ts`)

**Gewijzigd (overig — 23 lees-sites)**:
- `src/types/brandstyle.ts`
- `src/app/api/studio/[deliverableId]/tone-check/route.ts`
- `src/app/api/workspace/export/route.ts`
- `src/app/api/brandstyle/route.ts`
- `src/app/api/brandstyle/ai-context/route.ts`
- `src/features/brandstyle/types/brandstyle.types.ts`
- `src/features/brandstyle/utils/brand-kit/types.ts`
- `src/features/brandstyle/utils/brand-kit/buildCompositeBrandPdf.ts`
- `src/features/brandstyle/utils/exportBrandstylePdf.ts`
- `src/lib/snapshot-builders.ts`
- `src/lib/brandstyle/analysis-engine.ts`
- `src/lib/brandstyle/analysis-prompts.ts`
- `src/lib/alignment/data-fetcher.ts`
- `src/lib/alignment/audit-scoring.ts`
- `src/lib/claw/tools/read-tools.ts`
- `src/lib/alignment/fix-generator.ts`
- `src/lib/export/design-system/canonical.ts`
- `src/lib/export/design-system/resolver.ts`
- `src/lib/export/design-system/emitters/brand-brief.ts`
- `src/lib/export/design-system/emitters/designmd.ts`
- `src/lib/campaigns/strategy-chain.ts`

Mogelijk in scope (gevonden tijdens uitvoering): voiceguide section-mutations hook + voiceguide API route file(s) — exact pad volgt patroon huidige Voice DNA + Vocabulary endpoints.

# Bestanden die ik NIET aanraak

- `BrandPersonality.frameworkData.brandVoiceDescription/wordsWeUse/wordsWeAvoid/writingSample` cleanup — apart task, migratie-window is voorbij maar removal valt buiten deze scope
- OBSERVED/RECOMMENDED prefix-parser refactor — verhuist 1:1 als utility
- `examplePhrases` JSON-shape — blijft `{text, type: "do"|"dont"}[]`
- Brand Voice tabs-structuur (alleen velden bijschuiven, geen nieuwe tab)
- Centroid-recompute (guidelines zijn geen embedding-bron)
- F-VAL pijler-weighting wijziging

# Smoke test plan

1. **Migratie**: `npx tsx prisma/scripts/migrate-tone-of-voice-to-voiceguide.ts --dry-run` op lokale db, controleer log-output toont juiste plan; vervolgens live run; verifieer DB-state per workspace; 2e run logt `0 actions`
2. **Brand Voice CRUD**: open `/brandvoice` → Voice DNA tab → Content Guidelines blok zichtbaar met gemigreerde items + OBSERVED/RECOMMENDED badges → voeg item toe → save → reload → persist
3. **Brand Voice CRUD**: Voice DNA → Writing Guidelines blok → edit item → save → persist
4. **Brand Voice CRUD**: Vocabulary tab → Do/Don't examples blok → edit voorbeeld → save → persist
5. **Brand Styleguide cleanup**: `/brandstyle` → tab "Tone of Voice" weg, andere tabs (Colors/Typography/Imagery/Design Language) intact, geen render-fouten
6. **Brand Personality cleanup**: open een brand-asset detail → Personality view → "Voice, Tone & Communication Style — moved" blok rendert NIET meer
7. **AI-context regressie**: maak een test content-item via Studio → server-log check: `getBrandContext` payload bevat `voiceContext` met guidelines-tekst → AI-output bevat content-guidelines-stijl
8. **F-VAL regressie**: trigger PublishGate review op een test content-item → rules-pijler-findings worden gegenereerd op basis van guidelines uit voiceguide → geen 500 errors
9. **Export regressie**: `/api/workspace/export` of `/api/brandstyle/route` brand-kit PDF download → verifieer voice-sectie van PDF bevat content + writing guidelines + do/don't examples

# Risico's

- **F-VAL regressie**: rules-pijler kan op guidelines steunen voor evidence-extraction. Mitigatie: audit `src/lib/alignment/audit-scoring.ts` + `fix-generator.ts` voor `contentGuidelines`/`writingGuidelines`-paths; behoud signature, alleen bron-switch
- **AI-context payload-shape**: downstream prompts mogen geen breaking change zien. Mitigatie: behoud `voiceContext.guidelines` veldnamen identiek, alleen bron-fetch wijzigt
- **PDF brand-kit layout**: emit-volgorde kan visueel breken. Mitigatie: visuele test stap 9 vóór finalize
- **Data-verlies bij stap 14**: pas NA verificatie dat alle reads zijn omgezet. Mitigatie: `git grep` op verwijderde veldnamen vóór `db push --accept-data-loss`; rollback-plan via git revert (data zit dan al op beide locaties)
- **API-route gap**: clients die direct `/api/brandstyle/tone-of-voice` aanroepen krijgen 404. Mitigatie: geen externe clients pre-launch; intern alleen ToneOfVoiceSection die wordt verwijderd

# Out of scope

- Brand Personality `frameworkData` cleanup (apart task)
- Nieuwe Brand Voice features
- F-VAL pijler-weighting
- Centroid-recompute
- Refactor van OBSERVED/RECOMMENDED prefix-parser
- Channel Activation integraties

# Notes

**Stappen-volgorde** (1 commit per logische stap aangeraden):
1. Task-file + ADR (deze stap)
2. Prisma schema: add velden aan BrandVoiceguide
3. `prisma db push` + `prisma generate`
4. Migratie-script schrijven + lokaal runnen + verifiëren
5. AI-context-builders update (`brand-context.ts`, `knowledge-context-fetcher.ts`)
6. UI Brand Voice secties uitbreiden (`VoiceDnaSection`, `VocabularySection`)
7. Voiceguide API routes uitbreiden
8. Overige 23 lees-sites omschakelen
9. Verwijder Tone of Voice tab + ToneOfVoiceSection.tsx + `/api/brandstyle/tone-of-voice`
10. Verwijder moved-banner uit BrandPersonalitySection
11. Prisma schema: remove velden uit BrandStyleguide + `db push --accept-data-loss`
12. Type-check + lint + smoke-test (9 stappen)
13. task-finalize skill

**Conflict-policy migratie-script**:
- BrandVoiceguide bestaat niet voor workspace → create met velden uit styleguide
- BrandVoiceguide bestaat, veld leeg → kopieer uit styleguide
- BrandVoiceguide bestaat, veld al gevuld → log skip met workspaceId + veldnaam
- Styleguide veld leeg → niets doen voor dat veld

**Geen worktree** — single-track werk op `main`, geen parallelle conflicten verwacht.
