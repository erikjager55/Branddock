---
id: studio-content-generation-real-ai
title: Studio component generation — vervang TODO-stubs door echte AI-calls
fase: pre-launch
priority: now
effort: 1 week
owner: claude-code
status: open
created: 2026-05-07
completed: -
related-adr: -
related-spec: -
worktree: branddock-feat-studio-real-ai
---

# Probleem

De studio generation routes voor content-componenten retourneren placeholder-content in plaats van echte AI-calls:
- `src/app/api/studio/[deliverableId]/components/[componentId]/generate/route.ts:75` — TODO-stub
- `src/app/api/studio/[deliverableId]/components/generate-all/route.ts:36` — stub generation zonder cascading context
- `src/app/api/studio/[deliverableId]/components/[componentId]/regenerate/route.ts` — accepteert feedback maar gebruikt het niet (`// TODO: Call AI with feedback context`)

Gevolg: pre-launch content-flow lijkt te werken maar levert geen bruikbare output. Kritisch P0 — zonder dit is product-readiness onmogelijk.

# Voorstel

1. Vervang stubs in 3 routes door echte AI-calls via `src/lib/ai/openaiClient` of `anthropicClient` (per `WorkspaceAiConfig.contentGeneration`).
2. Bouw een **cascading-context builder** die per component injecteert: campaign strategy, master message, voorgaande componenten in dezelfde deliverable (voor consistency), brand context (`getBrandContext(workspaceId)`).
3. `regenerate`-route hergebruikt context + voegt user-feedback toe als steering-instructie in de prompt.
4. `generate-all` orchestreert sequentieel met context-cascade (component N krijgt output van 1..N-1 als context).
5. Cache invalidation per `cacheKeys.prefixes.STUDIO(workspaceId)` na elke mutatie.

# Acceptatiecriteria

- [ ] `generate` route levert echte AI-output (verifieerbaar via response-content + token-usage logging)
- [ ] `generate-all` orchestreert cascading: component 2 ziet component 1's output in zijn prompt
- [ ] `regenerate` route gebruikt user-feedback als prompt-steering (bevestig met diff tussen v1 en v2 output)
- [ ] Brand context (workspace/persona/product/voice) zit in elke generation-prompt
- [ ] Strategy + masterMessage zit in elke generation-prompt
- [ ] Cache invalidation aanroepen aanwezig in alle 3 routes
- [ ] Geen `any` types in nieuwe code
- [ ] Loading + error states in canvas-UI getest (component-level retry, error-banner)
- [ ] `npx tsc --noEmit` 0 errors
- [ ] `npm run lint` 0 errors
- [ ] Smoke-test uitgevoerd

# Bestanden die ik aanraak

- `src/app/api/studio/[deliverableId]/components/[componentId]/generate/route.ts`
- `src/app/api/studio/[deliverableId]/components/generate-all/route.ts`
- `src/app/api/studio/[deliverableId]/components/[componentId]/regenerate/route.ts`
- `src/lib/studio/cascading-context-builder.ts` (nieuw)
- `src/lib/studio/component-prompt-builder.ts` (nieuw of uitbreiden bestaande)
- `src/components/canvas/...` — UI-glue voor loading/error states (alleen waar nodig)

# Bestanden die ik NIET aanraak

- `prisma/schema.prisma` — geen schema-changes; ContentVersion komt in `content-versioning-crud`
- `src/lib/brand-context.ts` — alleen consumeren, niet wijzigen
- `src/lib/ai/openaiClient.ts` — alleen consumeren

# Smoke test plan

1. Open een campaign in canvas, klik Generate op een component → verifieer dat `response.content` substantiële AI-output bevat (>500 tokens) en niet een placeholder-string
2. Generate-all op een 4-component deliverable → component 4's prompt moet de output van 1+2+3 bevatten (check via verbose logging tijdelijk)
3. Edit een component, druk Regenerate met feedback "maak korter en directer" → v2 moet meetbaar korter zijn dan v1
4. Repeat met andere content-types (blog-post, linkedin-post, email-newsletter) — geen type-specifieke crashes
5. Check token-usage in PostHog event-log na generation

# Risico's

- **Token-cost spike**: cascading context kan per component groeien. Mitigatie: cap totale context-tokens op 8K per generation, truncate oudste componenten eerst
- **Prompt-quality regressie**: bestaande prompts elders in studio kunnen al beter zijn dan deze nieuwe builder. Mitigatie: 1-op-1 vergelijking met andere working AI-flows in repo (campaign-strategy chain) als baseline
- **Race conditions in generate-all**: parallel cascading is fragiel; ga sequentieel zelfs als trager
- **Brand-voice integratie**: niet in deze task, maar route moet wel `BrandVoiceGuide.profile` veld accepteren als optioneel input (forward-compat met `brand-voice-content-integration` task)

# Out of scope

- Brand voice profile integration (komt in `brand-voice-content-integration`)
- Content versioning / version history (komt in `content-versioning-crud`)
- QA-gating op publish (komt in `content-item-qa-gating`)
- Variant batch generation (komt in `variant-batch-generation` post-launch)
- Multi-format export (komt in `multi-format-export-engine` post-launch)

# Notes

Agent-inventarisatie 2026-05-07 identificeerde dit als P0 pre-launch. Zonder echte AI in deze 3 routes werkt de hele content-flow niet, ondanks dat de UI lijkt te functioneren.

Dependency-volgorde voor de 4 nieuwe pre-launch tasks: dit is #1, daarna `content-versioning-crud` (versions van AI-output), `brand-voice-content-integration` (voice in prompts hier), en als laatste `content-item-qa-gating` (gates op de AI-output uit deze routes).
