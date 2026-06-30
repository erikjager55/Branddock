---
id: multi-market-transcreation-enterprise
title: Multi-markt transcreatie-fan-out + per-locale F-VAL + enterprise-GA (compliance, hreflang, RBAC, org-billing)
fase: post-launch
priority: later
effort: multi-maand (epic — go/no-go-gated, splitst in sub-tasks)
owner: claude-code
status: blocked
created: 2026-06-28
completed: -
related-adr: docs/adr/2026-06-28-multilingual-i18n-and-multi-market-content.md
related-spec: -
worktree: -
---

# Probleem

De daadwerkelijke multinationale capaciteit — één goedgekeurde bron-deliverable die transcreëert naar N markt-varianten, elk per-markt voice-/persona-/compliance-bewust en per-locale opnieuw F-VAL-gescoord, met hreflang-SEO, markt-scoped toegang en pricing die één keer voor N markten rekent — bestaat nog niet. Dit is de zwaarste, duurste en meest dependency-rijke laag van het meertaligheidsprogramma.

# Voorstel

Bouw bovenop de forward-compatible foundation (`Brand`/`BrandLocaleProfile`, locale-aware `getBrandContext`): (1) een runtime **transcreatie-engine** die de goedgekeurde bron-content consumeert + de overlay-merged brand-context per markt + `buildLocaleInstruction`, en varianten persisteert via de bestaande `derivedFromId`-self-relatie; (2) **per-locale F-VAL** door de expliciete target-locale in `computeFidelityScore`/`getHeuristicsForLocale` te threaden (+ activeer de dode `ContentReviewLog.language`-seam); (3) een **job-queue** voor de N-voudige fan-out; (4) **enterprise-GA**: `MarketClaim`-compliance, hreflang/`inLanguage`-alternates in `/p/[slug]`, markt-scoped RBAC, en org-level billing gemeten op actieve markten. **Go/no-go-gate**: mag de launch-blocker `vercel-deployment` niet gijzelen; start pas na expliciete beslissing + de harde dependencies.

# Acceptatiecriteria

- [ ] Eén bron-deliverable produceert N locale-varianten, elk geclusterd via `derivedFromId`, elk gescoord tegen zijn eigen pack-centroid + heuristieken.
- [ ] Markten zonder F-VAL-pack zijn geblokkeerd of beta-flagged (nooit stille en-GB-fallback); `SUPPORTED_LOCALES` + packs + `detect-brand-language` `ISO3_TO_LANG` breiden in lockstep uit.
- [ ] AI-kosten/latency begrensd door een echte job-queue, niet `bulk-generate` (MAX_CONCURRENCY 3 / 600s).
- [ ] `voiceOverrides` daadwerkelijk gemerged in `brand-voice-directive.ts`; markt × deliverable matrix-UI toont per-markt fidelity + approval.
- [ ] `MarketClaim` (per-jurisdictie approved/prohibited/disclaimer) als prompt-rails + post-generatie-gate in F-VAL Pijler 3; een verboden claim blokkeert die markt-variant.
- [ ] `/p/[slug]` emit correcte hreflang + per-profiel `inLanguage`-alternates.
- [ ] Markt-scoped RBAC: een gebruiker kan tot een subset van markten gescoped worden.
- [ ] Org-level entitlement gemeten op actieve `BrandLocaleProfile`-count; de 3 entitlement-systemen verzoend tot één bron.
- [ ] `npx tsc --noEmit` 0 errors · `npm run lint` 0 errors · Smoke-test uitgevoerd · Documentatie bijgewerkt

# Bestanden die ik aanraak

- `src/lib/ai/transcreation/*` (nieuw) — transcreatie-runtime
- `src/app/api/campaigns/[id]/bulk-generate/route.ts` + job-queue-infra
- `src/lib/brand-fidelity/composition-engine.ts` (`computeFidelityScore` :382 — review-bevinding: `evaluator.ts` bestaat NIET op package-root), `src/lib/brand-fidelity/heuristics/evaluator.ts` (:54 `getHeuristicsForBrand`) + `src/lib/brand-fidelity/heuristics/index.ts` (:32/:40) — per-content-locale threading; `src/lib/brand-fidelity/fidelity-runner.ts` (:707,:852) + `external-content-runner.ts` (:136 + `ContentReviewLog.language`) als `computeFidelityScore`-callsites
- `src/lib/studio/brand-voice-directive.ts` (`voiceOverrides`-merge)
- `prisma/schema.prisma` (`MarketClaim`, `Persona.localeProfileId`-tagging, RBAC-velden, org-billing)
- `src/app/p/[slug]/page.tsx` (hreflang/`inLanguage`-alternates)
- billing/entitlement (`src/lib/stripe/*`, `src/lib/constants/plan-limits.ts`, `Organization`/`Subscription`)
- markt × deliverable matrix-UI (nieuw)

# Bestanden die ik NIET aanraak

- De UI-i18n-laag (andere as).
- De content-locale-foundation-modellen (komen uit `[[content-locale-foundation]]`; hier alleen consumeren/uitbreiden).

# Smoke test plan

1. Maak 3 `BrandLocaleProfile`s (en-GB/nl-NL/de-DE) met DE-`voiceOverrides`; transcreëer één goedgekeurde bron → 3 varianten, DE in Sie-register, elk eigen F-VAL-score.
2. Definieer een `MarketClaim` verboden in DE → de DE-variant wordt geblokkeerd/geflagd.
3. Publiceer de 3 varianten → `/p/<slug>` toont correcte hreflang-alternates.
4. Scope een gebruiker tot {nl-NL} → DE/en-GB-kolommen onzichtbaar.

# Risico's

- AI-kosten × markt-aantal (12 markten × 20 deliverables ≈ 240 transcreatie + 240 F-VAL) → harde queue + cost-budget vereist.
- F-VAL pack-bouw per nieuwe markt (honderden entries) is een lange pool → markt-GA gated op pack-beschikbaarheid.
- N markten in één workspace concentreert blast-radius → markt-scoped RBAC + approval-gates moeten landen vóór brede blootstelling.
- `MarketClaim`-taxonomie vereist juridische input.

# Out of scope

- `Brand` naar org-scope tillen (gedeelde kern over sibling-workspaces) — seam is gereserveerd, capability is verre-toekomst.
- Workspace-per-markt (Approach B) en het openen van de `org.type==='AGENCY'`-gate — expliciet niet het gekozen pad.

# Notes

- Dit is een **epic**: splits per sub-item af zodra de go/no-go genomen is en de dependencies (job-queue, packs, juridisch, billing) concreet zijn. Status `blocked` tot dan.
- Dependencies: `[[content-locale-foundation]]` + `[[content-locale-target-picker]]` + job-queue-infra + F-VAL-packs per markt.
- **Per-locale F-VAL Pijler-1 centroid**: een `voiceOverrides` JSON-delta levert géén per-locale schrijf-sample-corpus; zonder per-locale samples valt de centroid stil terug op de globale (zwakke per-markt-fidelity). `BrandLocaleProfile.centroidEmbedding` (`vector(1536)`) is `Unsupported` in Prisma → schrijven via raw SQL; blijft `null` tot per-locale samples in `localizedAssets` bestaan (of accepteer een gedocumenteerde globale-centroid-fallback).
- `Persona.localeProfileId` is de nullable KOLOM uit `[[content-locale-foundation]]`; hier alleen de tagging-BEHAVIOR, geen tweede schema-add.
