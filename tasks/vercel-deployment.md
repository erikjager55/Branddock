---
id: vercel-deployment
title: Vercel deployment + Neon DB + custom domain + monitoring
fase: launch
priority: next
effort: 3 dagen
owner: claude-code
status: open
created: 2026-05-07
completed: -
related-adr: -
related-spec: -
worktree: -
---

# Probleem

Pre-launch eindigt bij livegang. Applicatie draait alleen localhost. Zonder productie-deployment kan niemand buiten Erik de app gebruiken — geen pilots, geen klanten, geen revenue.

# Voorstel

Vercel project setup met Neon serverless Postgres (heeft pgvector standaard), custom domain, productie env-vars, Sentry error tracking, GitHub Actions CI.

# Acceptatiecriteria

## Database
- [ ] Neon project aangemaakt + connection string
- [ ] pgvector extension verifiëren werkt op Neon
- [ ] Schema gepusht via `npx prisma db push` tegen productie DB
- [ ] Seed data (optioneel) of leeg — beslissen of demo workspaces geseed worden
- [ ] HNSW indexen aangemaakt via raw SQL (zelfde als lokaal)

## Vercel
- [ ] Vercel project gekoppeld aan GitHub repo
- [ ] Production branch: `main`
- [ ] Preview deployments per PR enabled
- [ ] Build command: `npm run build`
- [ ] Output: `.next` (Next.js default)
- [ ] Node version: 20.x
- [ ] Environment variables ingesteld per environment (production / preview):
  - `BETTER_AUTH_SECRET` (verschilt prod/preview)
  - `BETTER_AUTH_URL` (prod URL / preview URL)
  - `DATABASE_URL` (Neon connection string)
  - `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, `GEMINI_API_KEY`
  - `TOKEN_ENCRYPTION_KEY` (back-up zorgvuldig — verlies = bricked OAuth)
  - Optioneel: `FAL_KEY`, `ELEVENLABS_API_KEY`, etc.
  - `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` (na stripe-billing-live task)
- [ ] Vercel cron `/api/cron/run-jobs` geconfigureerd (every minute)

## Domain
- [ ] DNS-records ingesteld bij domain registrar
- [ ] Custom domain toegevoegd in Vercel
- [ ] SSL automatisch via Vercel
- [ ] `BETTER_AUTH_URL` aangepast naar custom domain

## Monitoring
- [ ] Sentry project aangemaakt
- [ ] `@sentry/nextjs` geïnstalleerd + wizard run
- [ ] DSN als env var
- [ ] Source maps upload tijdens build
- [ ] Test error → verifiëren in Sentry dashboard

## CI/CD
- [ ] GitHub Actions workflow voor PR-checks: `tsc --noEmit` + `npm run lint` + `npm run test:e2e --grep critical-flow`
- [ ] Branch protection op `main`: required checks + min 1 approval

## Smoke
- [ ] Productie URL bereikbaar
- [ ] Login flow werkt end-to-end
- [ ] Create brand asset werkt (DB write)
- [ ] AI exploration start → response (AI keys werken)
- [ ] Test error → arriveert in Sentry
- [ ] Cron job run zichtbaar in Vercel logs

# Bestanden die ik aanraak

- `vercel.json` — cron config + region (Frankfurt fra1 voor EU latency)
- `next.config.ts` — Sentry wrapper
- `sentry.client.config.ts` (nieuw, via wizard)
- `sentry.server.config.ts` (nieuw, via wizard)
- `.github/workflows/pr-checks.yml` (nieuw)
- `.env.example` — sync met nieuwe optionele vars
- `prisma/schema.prisma` — geen wijzigingen, alleen `db push` tegen Neon

# Bestanden die ik NIET aanraak

- Niets in `src/` voor deze task — pure infra
- Stripe-keys (komt in stripe-billing-live task)

# Smoke test plan

1. Trigger deploy via GitHub merge naar main
2. Build moet groen — Vercel logs check
3. Open productie URL → ziet auth-page
4. Signup nieuwe user → succesvol → AuthGate gepasseerd → Dashboard
5. Create brand asset → success in DB (verify via Neon dashboard)
6. AI Exploration start → response binnen 30s
7. Trigger expliciete error in een test-route → arriveert in Sentry binnen 1 min
8. Wacht 1 min → check `/api/cron/run-jobs` is gelogd in Vercel runtime logs

# Risico's

- **Env-var typo**: 1 ontbrekende var = silent runtime error. Mitigatie: env-var checklist + early `assertEnv()` calls bij app boot
- **Neon pgvector ontbreekt**: hoewel default — verifiëren met test-query op deploy. Mitigatie: smoke-test step
- **Better Auth URL mismatch**: cookies werken niet over domains. Mitigatie: `BETTER_AUTH_URL` exact matchen
- **TOKEN_ENCRYPTION_KEY verlies**: bricked OAuth voor alle bestaande users. Mitigatie: opslaan in 1Password/secrets manager + back-up document
- **Cold start latency**: serverless functions cold start kost 1-2s. Mitigatie: Vercel Edge Functions voor hot paths waar mogelijk

# Out of scope

- CDN voor static assets (Vercel doet dit automatisch)
- Multi-region failover
- Read replicas
- Self-hosted alternative (Railway, Fly.io) — alleen Vercel voor MVP
- Alternative DB providers (alleen Neon voor MVP)

# Notes

Region keuze: **fra1** (Frankfurt) voor EU GDPR + lage latency Nederlandse users.

Neon serverless tier: gratis tot 0.5GB storage. Bij groei → Launch Plan ($19/mnd).

Sentry: gratis tier 5K errors/mnd — voldoende voor pre-launch.

GitHub Actions: gratis voor publieke repos. Voor private: 2000 min/mnd gratis op Free plan.
