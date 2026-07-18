# api-restjes — webhook-Settings-UI + deliverable.generated op alle paden

- **Status**: done
- **Datum**: 2026-07-18
- **Aanleiding**: de twee open restjes uit `tasks/done/public-brand-api.md` (P3.3): webhook-beheer-UI en `deliverable.generated`-emits op de webpage/SEO/video-paden. Eriks opdracht 2026-07-18: "los de kleine restjes op".
- **Worktree**: branddock-api-restjes

## Gedaan

**1. deliverable.generated op alle generatie-paden** (was: alleen headless-create):
- `src/lib/content/headless-webpage.ts` — na persist+charge (headless/API-pad)
- `src/app/api/landing-pages/generate-page/route.ts` — UI-pad (client persisteert puckData ná de emit; race-noot in comment)
- `src/lib/content/headless-video.ts` — na component-write (resolveOrCreateDeliverable geeft nu ook campaignId terug)
- `src/lib/ai/seo-generation-job.ts` — na COMPLETED (eenmalig; re-dispatch stopt bij de guard)
- Alle emits fire-and-forget (`void dispatchWebhookEvent`), metadata-only, `fidelityScore: null` waar geen score bestaat.

**2. Webhook-beheer-UI** — `WebhooksPanel.tsx` in Settings → API & Connectors (onder de connector-instructies): endpoints aanmaken (URL + event-checkboxes, default `deliverable.generated`), signing-secret eenmalig zichtbaar (amber reveal, HMAC-uitleg), rijen met event-badges + secretPrefix + delivery-status + auto-disable-badge, delete met confirm. Zelfde TanStack-Query/reveal-once/row-patroon als de API-keys-lijst; loading + error states.

## Bewijs

- `scripts/dev/deliverable-generated-emit-smoke.ts` **5/5** — echte webpage-generatie op dev + lokale ontvanger: event ontvangen, juiste deliverableId, metadata-only, contentType aanwezig. (Video/SEO-sites zijn dezelfde one-liner na hun bewezen succes-punt — bewust niet in de smoke: fal-kosten resp. 5+ min pipeline.)
- `scripts/dev/webhooks-ui-smoke.ts` **9/9** (Playwright, echte route): panel rendert, create → whsec_-reveal, reload → alleen prefix + secret nergens in DOM, delete → rij weg.
- tsc + eslint 0 errors.

## Rest (user-held, ongewijzigd)

n8n-package npm-publish · Chrome Web Store (wacht op privacy-PR #161).
