---
id: posthog-sentry-browser
title: PostHog + Sentry browser-side wiring
fase: pre-launch
priority: now
effort: 1 dag
owner: claude-code
status: done
created: 2026-05-07
completed: 2026-05-08
related-adr: -
related-spec: -
worktree: -
---

# Probleem

PostHog server-side analytics is gewired (entry #71 — agent_job, campaign_send, deliverable_approval events). Sentry server-side komt in `vercel-deployment` task. **Browser-side ontbreekt beide** — geen page-view tracking, geen frontend errors, geen activation funnel.

# Voorstel

`posthog-js` voor page-views + button-clicks + activation events. `@sentry/nextjs` browser-side voor frontend errors + source maps. Configureren als opt-in via env-vars (geen tracking als keys ontbreken).

# Acceptatiecriteria

## PostHog browser
- [ ] `posthog-js` geïnstalleerd
- [ ] `src/lib/analytics/posthog-client.ts` (nieuw) — singleton init met EU host (`eu.i.posthog.com`)
- [ ] Auto-pageview tracking (enable in init)
- [ ] Workspace + user identify on login (`posthog.identify(userId, { workspace, plan })`)
- [ ] 5 key activation events ge-instrumented:
  - `signup_completed`
  - `first_brand_asset_created`
  - `first_persona_created`
  - `first_campaign_launched`
  - `first_content_generated`
- [ ] Group analytics: `posthog.group('workspace', workspaceId)` na login

## Sentry browser
- [ ] Sentry browser config (al via `@sentry/nextjs` wizard in vercel-deployment)
- [ ] Source maps upload tijdens build
- [ ] Test error vanuit browser → arriveert in Sentry
- [ ] React error boundary integratie (per `App.tsx` ErrorBoundary wrap)

## Cross-cutting
- [ ] Env vars: `NEXT_PUBLIC_POSTHOG_API_KEY`, `NEXT_PUBLIC_POSTHOG_HOST` — beide met `NEXT_PUBLIC_` prefix voor browser
- [ ] Graceful no-op als keys ontbreken (geen errors lokaal)
- [ ] `npx tsc --noEmit` 0 errors

# Bestanden die ik aanraak

- `package.json` — `posthog-js` dependency
- `src/lib/analytics/posthog-client.ts` (nieuw)
- `src/lib/analytics/track-event.ts` (nieuw) — typed wrapper
- `src/app/layout.tsx` — PostHog Provider mount
- `src/components/auth/AuthGate.tsx` — identify on login
- 5x event-emit-locaties (signup, first asset/persona/campaign/content)

# Bestanden die ik NIET aanraak

- Server-side PostHog (`src/lib/analytics/posthog.ts`) — al af
- Sentry server config — komt via `vercel-deployment` Sentry wizard

# Smoke test plan

1. Met PostHog API key gezet: navigeer naar dashboard → check pageview event in PostHog dashboard
2. Login → check `identify` met workspace properties
3. Maak nieuwe brand asset → check `first_brand_asset_created` event
4. Trigger expliciete error in console → check arriveert in Sentry
5. Verwijder env vars → app draait nog (graceful no-op)

# Risico's

- **PII in events**: per ongeluk email of tokens loggen. Mitigatie: alleen workspace-id + plan-naam in identify, geen content-bodies
- **Bundle size**: posthog-js ~80KB gzipped. Mitigatie: lazy-load via dynamic import voor non-critical paths
- **Cookie consent**: GDPR vereist consent-banner. Mitigatie: defer of bouw simpele banner — beslissing user

# Out of scope

- Cookie consent banner (separate task indien GDPR-strict nodig)
- Funnel-rapporten in PostHog dashboard (configureer in PostHog UI, niet code)
- Heatmaps via posthog-js — opt-in later
- Session replay — opt-in later (privacy beslissing)

# Notes

EU host is verplicht voor GDPR (data blijft in EU).

Activation funnel-volgorde voor pilot-tracking:
1. signup_completed
2. first_brand_asset_created (binnen 1u)
3. first_campaign_launched (binnen 24u)
4. first_content_generated (binnen 48u)
