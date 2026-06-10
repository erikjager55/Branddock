---
id: lp-feature-image-diversity
title: LP feature-images divers + relevant voor sectietekst (brief-first + kwaliteitspoort)
fase: pre-launch
priority: now
effort: 8,5-9,5 dagen (6 fasen, elk zelfstandig shipbaar; fase 0 alleen al fixt het acute symptoom grotendeels)
owner: claude-code
status: open
created: 2026-06-10
completed: -
related-adr: docs/adr/2026-06-10-feature-visual-pipeline.md (te schrijven in fase 5)
related-spec: docs/audits/2026-06-10-lp-feature-image-diversity.md
worktree: TBD (main of branddock-feat-* — raakvlak-afstemming lp-image-source-wiring bepaalt)
---

# Probleem

De 4 feature-beelden van een gegenereerde landing page zijn vrijwel identiek (Napking: 4× "chef met gekruiste armen in keuken") en passen niet bij de sectieteksten. Root-cause-keten (volledig gediagnosticeerd, 9 oorzaken R1-R9): de scrape-beschrijving van Napkings ene bron-foto wordt als prescriptieve stijl-laag in elke prompt geplakt (R1), de 500-char-cap kapt exact het diverse "Subjects:"-deel af (R2), het feature-pad omzeilt alle gebouwde kwaliteitsmachinerie incl. de bestaande copy-image-coherence-judge (R3), cross-image-diversiteit bestaat nergens (R4), de gate-bypass laat ongereviewde scrape sturen terwijl gecureerde donts geblokkeerd zijn (R5), negatives zijn op nano-banana-pro effectief no-op (R6), er is geen image-brief per sectie (R7), de bron-laag is dood (R8) en feature-imageUrls missen een clobber-guard (R9). Volledige diagnose + bewijsvoering: `docs/audits/2026-06-10-lp-feature-image-diversity.md`.

# Voorstel

Brief-first + pipeline-first merge (uitslag 3-ontwerpen-jury): (0) stijl-laag-sanering + governance-gate + werkende negatives als quick-wins; (1) photographyStyle splitsen in deelbare stijl vs per-beeld onderwerp/compositie; (2) gestructureerde `imageBrief` ({subject, sceneType, composition, avoid}) per feature + hero uit de copy-LLM; (3) server-side prompt-bouw in de feature-route met angle/subject-rotatie, seeds en DeliverableComponent-persist; (4) kwaliteitspoort: paired G4-coherence-judge + multi-image set-diversity-judge + budget-capped gerichte retry (géén blind multi-candidate); (5) feature-clobber-guard, hero-brief-alignment, embedding-backfill + golden-set dry-run-tooling, ADR. Alle integratiepunten adversarieel geverifieerd tegen de code (zie audit §3/§8).

# Acceptatiecriteria

- [ ] Fase 0: Napking feature-prompts bevatten geen scrape-compositie ("arms crossed"/"confident chef") meer; brandImageryDonts bereiken de feature-route; negatives werken op nano-banana (prompt-directive); orphaned-anchor warning logt
- [ ] Fase 1: hero behoudt compositionFragment, features krijgen alleen stijl-fragment; subjectPool gevuld
- [ ] Fase 2: live-run levert 4 briefs met ≥3 verschillende sceneTypes en 0 identieke subjects (Napking + Better Brands)
- [ ] Fase 3: prompts server-side gebouwd (legacy payload blijft 1 release werken); DeliverableComponent-rows met imagePromptUsed per feature-beeld; TrustStrip-items niet in featureGaps
- [ ] Fase 4: Napking-herrun → 4 onderscheidende beelden die elk hun sectietekst visualiseren; coherence-scores gelogd; max 2 regeneraties/pagina afgedwongen
- [ ] Fase 5: settings-PATCH wist geen feature-beelden meer; dry-run-script rapporteert over 3 workspaces; ADR geschreven
- [ ] `npx tsc --noEmit` 0 errors
- [ ] `npm run lint` 0 errors
- [ ] Smoke-tests per fase uitgevoerd (zie audit §4 per fase)
- [ ] roadmap.md r83 + web-page-builder-canvas-step-mvp remaining + gotchas.md (2 lessen) bijgewerkt

# Bestanden die ik aanraak

- `src/lib/landing-pages/brand-tokens-v4-mappers.ts` (F0/F1)
- `src/lib/landing-pages/brand-tokens.ts` (F1)
- `src/lib/ai/canvas-context.ts` (F0 — gate)
- `src/lib/integrations/fal/fal-providers.ts` + `fal-client.ts` (F0 — negatives; staan NIET op de workstream-lijst)
- `src/app/api/studio/[deliverableId]/generate-feature-visuals/route.ts` (F0/F3/F4)
- `src/lib/ai/brand-style-anchors.ts` (F0 — warning)
- `src/lib/landing-pages/variant-schema.ts` + `variant-generator.ts` (F2)
- `src/lib/landing-pages/feature-visual-prompts.ts` (F3, NIEUW)
- `src/lib/brand-fidelity/feature-set-diversity-judge.ts` (F4, NIEUW)
- `src/lib/landing-pages/feature-visual-gate.ts` (F4, NIEUW)
- `src/features/campaigns/lib/feature-visual-preserve.ts` (F5, NIEUW)
- `src/features/campaigns/lib/landing-page-visual-prompts.ts` (F1/F5)
- `scripts/dev/backfill-media-embeddings.ts` + `scripts/dev/lp-feature-image-dryrun.ts` (F5, NIEUW)
- RAAKVLAK (minimale diffs, afstemmen): `src/features/campaigns/api/canvas.api.ts`, `LandingPageGenerateBlock.tsx` (r461-488 + race-ceiling), `PuckPageBuilder.tsx` (fillFeatureImages + TrustStrip-filter), `src/app/api/studio/[deliverableId]/route.ts` (2-regel guard-call)

# Bestanden die ik NIET aanraak

- `ImageSourcePanel.tsx`, `LibraryAssetPicker.tsx`, `ComposePicker.tsx`, `TrainedStylePicker.tsx`, `hero-visual-preserve.ts`, `patch-hero-visual.ts`, `generate-visual{,-compose,-trained}/route.ts`, `hero-image/route.ts`, `refine-visual/route.ts`, `gemini-client.ts` — kern van de parallelle `lp-image-source-wiring`-workstream (browser-verificatie open)
- `copy-image-coherence-judge.ts`, `refine-loop.ts`, `embedding-search.ts` — alleen consumeren, niet wijzigen
- `analysis-engine.ts` (scrape-kant) — hoort bij brandstyle-result-audit-plan

# Smoke test plan

1. Per fase de unit/route-smokes uit audit §4 (nieuw: `photography-token-truncation.ts`, prompt-lib-unit, gate-unit, preserve-unit)
2. Empirische pre-check fase 3: honoreert nano-banana-pro seed/num_images (mini-script `scripts/experiments/`)
3. Acceptatie-run: Napking LP regenereren → 4 onderscheidende, sectie-relevante beelden; coherence-scores in server-log; DeliverableComponent-rows in DB
4. Regressie: web-page-builder smoke-suite (43) groen; hero-browser-recept van lp-image-source-wiring herdraaien na elke fase die gedeelde files raakt
5. `git rev-list origin/main..main` bij elke sessie-start (silent-divergence-patroon)

# Risico's

- Gedeelde hotspots met lp-image-source-wiring → diffs minimaal, nieuwe logica in nieuwe files, raakvlak melden in hun task-file vóór merge
- imagerySavedForAi-gate verandert prompt-gedrag van bestaande workspaces → SQL-inventaris vooraf + changelog-vermelding
- Geen validation-feedback-retry in variant-generator → imageBrief optioneel + live monitoren op parse-failures
- Seed-honoring nano-banana onbevestigd → judge-laag (F4) is dan verplicht, niet optioneel
- Latency: judges + max 2 retries binnen de (te verhogen) 120s-race; Step-3 gap-fill blijft vangnet

# Out of scope

- Library-first matching + feature-target in source-UI (vervolg-task ná embedding-backfill + workstream-verificatie)
- Upstream scrape-fix photographyStyle (brandstyle-result-audit-plan)
- F-VAL dim-8 per-sectie, OCR, multi-candidate-3 default, re-scrape Napking

# Notes

- Ontwerp-proces: 3 onafhankelijke plannen + 2-koppige jury + 4 adversariële verifiers (20 claims: 11 klopt / 9 klopt-deels verwerkt / 0 fout) — details audit §3.
- Kosten: $0,52 → $0,53-0,79 per pagina default; quality-mode ≈ $1,05 later via WorkspaceAiConfig.
- G4-judge: base64 via disk-read (`public/`+pad), níet url-source (localhost). Multi-image-judge via `createClaudeStructuredCompletion` (ai-caller.ts), níet anthropicClient (dropt images).
