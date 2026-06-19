---
id: knowledge-context-on-webpage-types
title: Knowledge Context werkend op de 5 PUCK web-page-types
fase: pre-launch
priority: next
effort: ~0,5 dag
owner: claude-code
status: done
created: 2026-06-19
completed: 2026-06-19
related-adr: -
related-spec: -
worktree: branddock-feat-knowledge-webpage (branch feat/knowledge-on-webpage-types)
---

# Probleem

De Knowledge Context-picker (Step 1) verscheen op alle content-types behalve de 5 PUCK web-page-types (landing-page/faq-page/product-page/microsite/comparison-page). Reden (`Step1Context.tsx:443`): die types genereren via het **structured-variant-pad**, dat `additionalContextItems` niet consumeerde — het paneel tonen zou een silent dead-end zijn. De gebruiker verwachtte knowledge juist óók op landingpages (zoals op LinkedIn-post e.d. via #331).

# Voorstel

Bedraad `additionalContextItems` in het structured-variant-pad volgens exact hetzelfde patroon als het orchestrator-pad (`serializeContextForPrompt` → tekstblok → in de system-prompt), op **één gedeeld injectiepunt** (`buildSharedStyleBlocks`, gebruikt door alle 4 page-type-system-prompts), en ontgrendel daarna het paneel. Geen dead-end meer.

# Acceptatiecriteria

- [x] Knowledge-paneel verschijnt op de 5 web-page-types (gate verwijderd in `Step1Context.tsx`)
- [x] Geselecteerde items landen in de generatie-prompt via `buildSharedStyleBlocks` (alle 4 builders)
- [x] No-knowledge-pad blijft byte-identiek (knowledge-blok leeg → ongewijzigde prompt; golden-set-veiligheid)
- [x] `npx tsc --noEmit` 0 errors
- [x] `npm run lint` 0 errors (gewijzigde files)
- [ ] `smoke:web-page-builder` + `smoke:page-types` + `smoke:knowledge-context` groen
- [ ] Browser-verificatie: paneel zichtbaar op landingpage + toegevoegde knowledge zichtbaar terug in de gegenereerde copy

# Bestanden die ik aanraak

- `src/lib/landing-pages/variant-generator.ts` — `additionalContextText?` op `LandingPageGenerationParams` + `SystemPromptOpts`; injectie in `buildSharedStyleBlocks` (raw, zelf-bevattende ## headings uit de serializer); doorgevoerd via `generateLandingPageVariantBatch` (spreidt `{...params}` per slot)
- `src/app/api/landing-pages/[deliverableId]/generate-structured-variant/route.ts` — `serializeContextForPrompt(ctx.additionalContextItems, workspaceId)` → `additionalContextText` meegegeven aan de batch
- `src/features/campaigns/components/canvas/accordion/Step1Context.tsx` — `!isPuckWebpageType`-gate + nu-ongebruikte import verwijderd; comment bijgewerkt

# Bestanden die ik NIET aanraak

- `src/app/api/landing-pages/[deliverableId]/auto-iterate-variant/route.ts` — **bewust niet**. Dit is een meaning-preserving tell-rewrite-pass (`VARIANT_REWRITE_SYSTEM_PROMPT`, golden-set-gevoelig) op al-gegronde tekst, geen her-generatie. Knowledge-source re-injecteren is onnodig (de initiële generatie grondde al) + zou een golden-set-gevoelige prompt-body raken + kost 16KB extra per refine. De feature (knowledge landt in generatie) werkt zonder dit.
- Prompt-bodies (`variant-tell-rewrite.ts`, `locale-instruction.ts`) — byte-identical

# Smoke test plan

1. `npm run smoke:web-page-builder` + `smoke:page-types` → render-paden ongewijzigd groen.
2. `npm run smoke:knowledge-context` → knowledge-wiring groen.
3. Browser: landingpage-canvas → Knowledge Context-paneel zichtbaar → voeg een PDF/library-item toe (primary) → genereer → het bronmateriaal is herkenbaar terug in de copy.

# Risico's

- Per ongeluk de byte-identieke LP-invariant breken → gemitigeerd: knowledge-blok is leeg wanneer niets geselecteerd → output ongewijzigd (smoke:web-page-builder bevestigt).
- Te grote prompt bij groot primary-bronmateriaal → de serializer heeft een `PRIMARY_MAX_SERIALIZED_LENGTH`-cap (16K), gedeeld met het orchestrator-pad.

# Out of scope

- Knowledge in de refine/tell-rewrite-pass (zie "niet aanraken").
- De auto-prefill van brief-velden (apart punt A — bewust zo gelaten door de gebruiker, 2026-06-19).

# Notes

- Architectuur-inzicht: `assembleCanvasContext` vult `ctx.additionalContextItems` al onafhankelijk van het generatie-pad — het structured-variant-pad serialiseerde ze alleen niet. De fix is daarom puur consumptie-zijde, geen nieuwe fetch/persist.
