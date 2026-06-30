---
id: content-locale-target-picker
title: Per-generatie target-locale picker (single-markt, adresseerbaar) + analyze-route locale-lek dichten
fase: pre-launch
priority: now
effort: 1-2 weken
owner: claude-code
status: open
created: 2026-06-28
completed: -
related-adr: docs/adr/2026-06-28-multilingual-i18n-and-multi-market-content.md
related-spec: -
worktree: -
---

# Probleem

Na de content-locale-foundation is `getBrandContext` locale-aware, maar er is nog geen manier voor een operator om bewust één deliverable in een gekozen content-locale te laten genereren — generatie collapst altijd naar de workspace-default. Daarnaast localiseren 4 analyze-routes output naar de browser-taal van de operator (`Accept-Language` via `parseOutputLanguage`), waardoor de UI-taal van de operator stil in geproduceerde content bloedt.

# Voorstel

Voeg een optionele target-locale param toe aan de generatie-entry (canvas-orchestrator/studio + campaign-generate), gevoed uit de `BrandLocaleProfile`-set (default = default-profiel), thread `localeProfileId` door `getBrandContext` en persisteer 'm op de `Deliverable`. Toon een kleine per-generatie/per-campagne locale-picker, visueel onderscheiden van de workspace-default control. Route de 4 analyze-routes als bewuste, gescopete beslissing door de content-locale-resolver i.p.v. `Accept-Language`. Nog steeds één locale per call — geen fan-out, geen nieuwe packs.

# Acceptatiecriteria

- [ ] Eén deliverable kan in elke profiel-locale gegenereerd worden; output-taal matcht het gevraagde profiel; `localeProfileId` gepersisteerd op de Deliverable.
- [ ] F-VAL scoort tegen de pack van die locale (of en-GB-fallback indien geen pack — zichtbaar als beta, nooit stil).
- [ ] Per-generatie locale-picker (uit `BrandLocaleProfile`-rijen) is visueel onderscheiden van de workspace-default content-language control.
- [ ] De 4 analyze-routes (`products/analyze/url`+`pdf`, `competitors/analyze/url`, `competitors/[id]/refresh`) lopen door de content-locale-resolver i.p.v. `parseOutputLanguage(Accept-Language)`; gedragswijziging gedocumenteerd.
- [ ] Bestaande default-locale-generatie ongewijzigd.
- [ ] `npx tsc --noEmit` 0 errors
- [ ] `npm run lint` 0 errors
- [ ] Smoke-test uitgevoerd
- [ ] Documentatie bijgewerkt indien van toepassing

# Bestanden die ik aanraak

- `src/lib/ai/canvas-context.ts` — `assembleCanvasContext` (:413/:438) krijgt een `localeProfileId`-param → `getBrandContext(workspaceId, localeProfileId)` (review-bevinding: `canvas-orchestrator.ts` roept `getBrandContext` NIET aan)
- `src/app/api/studio/[deliverableId]/orchestrate/route.ts` + `src/app/api/campaigns/[id]/bulk-generate/route.ts` — de echte tekst-entrypoints (beide importeren `orchestrateContentGeneration`); geven `targetLocaleProfileId` door + persisteren op de Deliverable
- `src/lib/ai/canvas-orchestrator.ts` — alleen indien de pre-built `stack`-threading hier wijzigt
- Canvas/campaign UI — per-generatie locale-picker (uit `BrandLocaleProfile`)
- `src/app/api/products/analyze/url/route.ts`, `.../analyze/pdf/route.ts`, `src/app/api/competitors/analyze/url/route.ts`, `src/app/api/competitors/[id]/refresh/route.ts`
- `src/lib/ai/prompts/product-analysis.ts` (`parseOutputLanguage` :14) + `src/lib/ai/prompts/competitor-analysis.ts` (:5 import / :7 re-export) — beide via de content-locale-resolver i.p.v. `Accept-Language`

# Bestanden die ik NIET aanraak

- De transcreatie-fan-out / per-locale F-VAL-threading buiten één call → `[[multi-market-transcreation-enterprise]]`.
- `BrandLocaleProfile`-schema (komt uit `[[content-locale-foundation]]`).
- UI-locale-laag.

# Smoke test plan

1. Operator met UI op EN genereert één deliverable met target-locale `nl-NL` → output is Nederlands; Deliverable.localeProfileId = nl-profiel; F-VAL scoort tegen nl-NL-pack.
2. Genereer met een pack-loze locale (bv fr) → werkt, F-VAL valt zichtbaar terug op en-GB met beta-markering.
3. Run een product-analyse met operator-browser op DE en workspace-content-taal NL → analyse-output is NL (volgt content-locale), niet DE.
4. Default-generatie (geen target gekozen) ongewijzigd.

# Risico's

- Analyze-route-wijziging verandert huidig gedrag → bewuste, gescopete beslissing (in changelog + ADR genoteerd), niet incidenteel.
- Pack-loze locales mogen nooit stil en-GB scoren → expliciete beta-markering in de UI.

# Out of scope

- Multi-markt fan-out (1 bron → N varianten) → `[[multi-market-transcreation-enterprise]]`.
- `ContentReviewLog.language`-seam activeren → Fase 4.

# Notes

- Dit maakt output **locale-adresseerbaar** op de hete persistentietabellen vanaf dag 1, zodat Fase 4 geen backfill nodig heeft.
