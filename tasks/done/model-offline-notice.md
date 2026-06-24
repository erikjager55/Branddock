---
id: model-offline-notice
title: Duidelijke "model offline / kan niet genereren"-melding over alle AI-features
fase: pre-launch
priority: now
effort: ~1-1,5 dag
owner: claude-code
status: done
created: 2026-06-24
completed: 2026-06-24
related-adr: -
related-spec: -
worktree: -
---

# Probleem

Wanneer een LLM-provider onbereikbaar is (503/overloaded, netwerk, timeout, rate-limit, of een
ontbrekende/foute API-key) en genereren daardoor onmogelijk is, ziet de gebruiker nu een vage generieke
melding — in de Content Canvas zelfs alleen een klein rood `"Generation failed"`-spannetje. "Het model ligt
eruit" is niet te onderscheiden van "je invoer was onvolledig" of "de output was te lang". De classificatie
bestaat al (`parseAIError` in `src/lib/ai/error-handler.ts`) maar wordt niet consistent naar de UI gepropageerd.

# Voorstel

Eén gedeeld contract end-to-end: een `unavailable`-concept afgeleid van de bestaande `AIErrorType`,
additief meegestuurd in elke AI-error-payload (JSON + SSE), en aan de client geïnterpreteerd door één util
(`ai-error-client.ts`). Reactieve detectie (bij mislukte generatie-poging), over alle AI-features.
Presentatie: een onderscheidend inline-blok (`ModelUnavailableNotice`, rood + WifiOff + "Opnieuw proberen")
plus een korte sonner-toast. Géén proactieve health-ping deze ronde.

# Acceptatiecriteria

- [x] `error-handler.ts` exporteert `isModelUnavailable` + `buildAiErrorPayload`/`buildAiErrorResponseInit`/`buildAiErrorEvent`
- [x] SSE-paden (orchestrate, bulk-generate, auto-iterate, persona-chat, claw, seo-pipeline) sturen geclassificeerde error-events; content-gates ongemoeid
- [x] Non-SSE AI-routes geven het gestructureerde payload terug via de gedeelde helper
- [x] `ai-error-client.ts` + `ModelUnavailableNotice.tsx` bestaan en worden gebruikt
- [x] Content Canvas toont bij onbeschikbaar model het inline-blok + toast (niet het generieke spannetje)
- [x] Lege brief / woordtelling-gate tonen NOG STEEDS de gate-melding, géén "model offline" (geverifieerd via classificatie-smoke)
- [x] AbortError blijft silent; SSE stuck-state-guard ongewijzigd
- [x] `npx tsc --noEmit` 0 errors
- [x] `npm run lint` 0 errors op gewijzigde bestanden (repo-baseline van pre-existing warnings ongemoeid)
- [x] Classificatie-smoke uitgevoerd (11/11 cases groen: offline-oorzaken → unavailable, gates/validatie/truncation → niet)
- [x] Live SDK-smoke: echte Anthropic + OpenAI 401 (bad-key) → `unavailable:true, errorType:authentication, retryable:false` via `buildAiErrorPayload`
- [ ] **Live browser-pixel-smoke (gebruiker, low-risk)**: forceer ongeldige API-key → genereer in Canvas → rood inline-blok + toast; herstel → "Try again" slaagt; lege brief → nog steeds gate-melding

# Bestanden die ik aanraak

Backend:
- `src/lib/ai/error-handler.ts` (contract-helpers) + `src/lib/ai/index.ts` (re-export)
- `src/app/api/studio/[deliverableId]/orchestrate/route.ts`
- `src/app/api/campaigns/[id]/bulk-generate/route.ts`
- `src/app/api/studio/[deliverableId]/auto-iterate/trigger/route.ts`
- `src/lib/ai/persona-chat.ts`, `src/app/api/claw/chat/route.ts`, `src/lib/ai/seo-pipeline.ts`
- Non-SSE: `api/strategies/[id]/ai-review`, `api/personas/[id]/strategic-implications`,
  `api/competitors/discover`, `api/landing-pages/*` (generate/edit/rewrite/iterate),
  `api/studio/[deliverableId]/{photo-brief,suggest-visual-briefing}`, `api/media/ai-images/generate`
  + 1-regel upgrade op de al-conforme routes (completion, brand-assets regenerate, personas chat, workshops report)

Client:
- `src/lib/ai/ai-error-client.ts` (NIEUW), `src/components/ui/ModelUnavailableNotice.tsx` (NIEUW)
- `src/features/campaigns/stores/useCanvasStore.ts`, `src/features/campaigns/hooks/useCanvasOrchestration.ts`
- `src/features/campaigns/components/canvas/CanvasPage.tsx`, `wizard/ContentGenerateStep.tsx`
- `src/features/campaigns/api/canvas.api.ts`, `accordion/Step2ContentVariants.tsx`,
  `accordion/LandingPageGenerateBlock.tsx`, `PhotographyBriefPanel.tsx` (+ pickers)
- `src/features/personas/api/persona-chat.api.ts`, `hooks/usePersonaChat.ts`, `components/chat/PersonaChatInterface.tsx`
- Toast-only: `BulkGenerateModal.tsx`, persona/trend/settings AI-catches

# Bestanden die ik NIET aanraak

- `src/lib/ai/canvas-orchestrator.ts` — in-generator `yield event:'error'` zijn gates; provider-fout throwt naar route-catch
- `src/components/ui/AIErrorCard.tsx` — blijft de generieke kaart
- De openstaande GEO-stat-citation wijzigingen in de working tree — andere task

# Smoke test plan

1. `interpretAiError` inline-check: 503/429/network/timeout/missing-key → `unavailable:true` (auth `retryable:false`); woordtelling-gate/`invalid_request`/`unknown` → `unavailable:false`; AbortError → niet notificeren.
2. Forceer offline lokaal (ongeldige `ANTHROPIC_API_KEY`/`OPENAI_API_KEY`), genereer in Content Canvas → rood inline-blok + toast; herstel sleutel → "Opnieuw proberen" slaagt.
3. Negatief-pad: genereer met lege brief → bestaande gate-melding, géén "model offline".
4. Steekproef: persona-chat + Step 2 visual onder geforceerde offline → consistente offline-melding.

# Risico's

- Misclassificatie van een gate als "offline" → mitigatie: classificeer alléén op catch-grenzen rond een echte provider-call.
- Stuck-state SSE-regressie → mitigatie: AbortError blijft silent, `finally generating→complete`-guard ongemoeid.
- Dubbele notificatie → mitigatie: één notify-owner per surface + `suppressToast`.

# Out of scope

- Proactieve health-ping / banner vooraf + Genereer-knop disablen.
- Echte provider-reachability in `/api/ai/health`.
- UI-side auto-retry met backoff (clients retryen al 3× server-side).

# Notes

- Plan: `/Users/erikjager/.claude/plans/vivid-exploring-seahorse.md`.
- Cross-ref gotcha 2026-05-17 (Effie-leak, zelfde "interne classificatie lekt/ontbreekt naar UI"-familie) +
  2026-04-15/03-24 (silent-abort stuck-state).
- **Claw-chat bewust NIET op het contract**: `claw/chat` blijft de rauwe error-message sturen
  (`sendEvent('error', { message: String(err) })`) omdat `InputBar.tsx` credit-/auth-fouten via regex op
  die rauwe tekst detecteert (`buildAiErrorEvent` saneert de message → brak die detectie). Code-review-vondst.
- **Bekende beperking (geaccepteerd)**: de image/visual-routes (`generate-visual*`, `media/ai-images/generate`)
  en `competitors/discover` hebben een brede outer-catch die ook storage/DB/Exa omvat. Een non-provider-fout
  met een netwerk-achtige message (bv. R2-fetch-fail) kan daar als "model offline" worden gelabeld. De
  gangbare faalmodus is wél de provider, en de gebruikersactie (opnieuw proberen) is identiek, dus de
  classificatie blijft staan. Echte versmalling tot enkel de provider-call = follow-up indien nodig.
- Live SDK-smoke bevestigd: Anthropic + OpenAI met ongeldige sleutel → 401 → `unavailable:true` (authentication).
