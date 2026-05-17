---
id: auto-iterate-trigger-content-gate
title: Auto-iterate "Verbeter automatisch" gate + silent-iter scope-fix
fase: pre-launch
priority: now
effort: 3-5 uur
owner: claude-code
status: done
created: 2026-05-17
completed: 2026-05-17
related-adr: -
related-spec: -
worktree: -
---

# Probleem

User klikt op "Verbeter automatisch" in canvas FidelityScoreBar (long-form content: blog/landing-page/newsletter) en krijgt error `Niet genoeg content om te verbeteren — genereer eerst content`, terwijl de content zichtbaar is in het canvas. Root cause is silent auto-iterate (canvas-orchestrator.ts:863-920) die de langste text-component vervangt met een drastisch kortere F-VAL rewrite, waarna variant-0 onder de hardcoded 50-woorden floor van de trigger valt. Latente scope-bug daarnaast: silent-iter én beide apply-routes querie'n op `groupIndex: 0` zonder `variantIndex` filter, dus kunnen variant B/C/D content clobberen.

# Voorstel

Drie silent-failure punten dichten: (1) silent-iter query op `variantIndex: 0` filteren + finalText alleen accepteren wanneer wordCount ≥ type-specifieke minWords, (2) beide apply-routes (auto-iterate + strict-rewrite) zelfde scope-fix, (3) trigger-gate type-aware maken met betekenisvolle error-message. Op alle drie de punten dev-`console.warn` per gotcha 2026-05-08 patroon. Gotchas.md entry toevoegen.

# Acceptatiecriteria

- [ ] Silent-iter query in canvas-orchestrator.ts filtert `variantIndex: 0` + `componentType !== 'image'`
- [ ] Silent-iter accepteert finalText alleen wanneer wordCount ≥ type-minWords (anders skip update + warn)
- [ ] Trigger-gate gebruikt `getDeliverableTypeById(...)?.constraints?.minWords ?? 50` en geeft actionable error
- [ ] `/auto-iterate/apply` en `/strict-rewrite/apply` filteren `variantIndex: 0` + skip image-components
- [ ] `console.warn` op alle silent-return / acceptance punten met structured payload
- [ ] `gotchas.md` entry toegevoegd (datum 2026-05-17)
- [ ] `npx tsc --noEmit` 0 errors
- [ ] `npm run lint` 0 errors
- [ ] Smoke-test uitgevoerd

# Bestanden die ik aanraak

- `src/lib/ai/canvas-orchestrator.ts` — silent-iter regio 870-920
- `src/app/api/studio/[deliverableId]/auto-iterate/trigger/route.ts` — gate regio 79-92
- `src/app/api/studio/[deliverableId]/auto-iterate/apply/route.ts` — target-resolve regio 68-84
- `src/app/api/studio/[deliverableId]/strict-rewrite/apply/route.ts` — target-resolve regio 74-91
- `gotchas.md` — entry 2026-05-17

# Bestanden die ik NIET aanraak

- `src/lib/brand-fidelity/fidelity-runner.ts` — 50-woorden floor is correct voor F-VAL signal
- `src/features/campaigns/components/canvas/FidelityScoreBar.tsx` — alleen backend-fix
- `src/lib/studio/stores/component-pipeline-store.ts` — `groupIndex` voor sequence_item, andere semantiek

# Smoke test plan

1. Maak nieuw blog-post deliverable, genereer text
2. Check terminal logs: silent-iter warn (accepted of skipped: below_minwords)
3. Klik CTA "Verbeter automatisch" → verwacht SSE-stream zonder error, completion-block met score
4. Manueel via psql: shrink variant-0 body naar 30 woorden, refresh canvas, klik CTA opnieuw → verwacht error `Variant A bevat 30 woorden, minimum voor blog-post is 500…`
5. Variant-clobber check: genereer 3 varianten, voor silent-iter check via DB `updatedAt` per variantIndex — alleen variant 0 mag wijzigen

# Risico's

- minWords-config voor zelden gebruikte types onbekend → fallback `?? 50` houdt huidige gedrag
- silent-iter altijd skippen voor blog-post (minWords 500) wanneer F-VAL drastisch shrinkt → minder uplift, user moet vaker handmatig CTA klikken (acceptabel pre-launch)
- apply-routes scope-fix → frontend stuurt geen expliciete componentId, target-intentie blijft variant-0 → geen functionele breakage

# Out of scope

- E2E test-coverage canvas (zit in pre-launch-browser-smoke-batch)
- Refactor naar gedeelde target-resolver helper (3 call-sites, premature)
- Variant-aware UI die toont welke variant gemuteerd is

# Notes

Plan-file: `~/.claude/plans/eager-hatching-planet.md`. Pattern komt overeen met gotcha 2026-05-08 (view-vs-gate divergentie + silent failure).
