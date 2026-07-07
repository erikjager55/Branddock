# Track C — Deployment runbook

Master-document voor pre-launch go-live. Code-side prep is grotendeels gedaan (zie commits `ef24848d` + `4a2f7fd8`); dit document beschrijft de user-actions in volgorde.

**Aanname**: Account-toegang Vercel, Neon, Stripe, Sentry, Cloudflare R2 (of equivalent), domain-registrar. Alles gratis-tier-startable behalve Stripe (transaction-fee-only).

---

## Fase 1 — Database (Neon)

1. Maak Neon account (https://neon.tech) + project "branddock-prod".
2. Verify pgvector extension: `CREATE EXTENSION IF NOT EXISTS vector;` in Neon SQL editor.
3. Connection-string kopieren (Pooled mode aanbevolen voor Vercel serverless).
4. Lokaal: `DATABASE_URL=<neon-url> npx prisma db push` voor schema-push.
5. Vector-indexen aanmaken (HNSW cosine, idempotent): `DATABASE_URL="<neon-url>" npx tsx scripts/prod/create-vector-indexes.ts` — `prisma db push` maakt deze NIET aan (Prisma beheert het `Unsupported(vector)`-type niet).
6. Seed niet nodig — pilot draait op user-creëerde data.

## Fase 2 — Vercel project

1. Vercel account + GitHub-repo koppelen.
2. Project-config:
   - Build command: `npm run build`
   - Output: `.next` (default)
   - Node version: 22.x (matches `.github/workflows/ci.yml`)
   - Production branch: `main`
3. Environment variables instellen (kopieer uit `.env.example`):
   - **Required prod**: `DATABASE_URL`, `BETTER_AUTH_SECRET` (`openssl rand -base64 32`), `BETTER_AUTH_URL` (custom domain), `TOKEN_ENCRYPTION_KEY` (`openssl rand -base64 32` — BACK UP IN 1PASSWORD)
   - **AI-keys**: `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, `GEMINI_API_KEY`
   - **Cron-protectie**: `CRON_SECRET` (`openssl rand -hex 32`)
   - **Stripe** (zie fase 4): leeg laten tot fase 4 klaar is
   - **Sentry** (zie fase 5): leeg laten tot fase 5 klaar is
   - **R2 storage** (zie fase 3): vereist voor productie-uploads
   - **POSTHOG_API_KEY** + `POSTHOG_HOST` (eu.i.posthog.com)
4. Cron-config staat al in `vercel.json` (runs `/api/cron/run-jobs` elke minuut).
5. Eerste deploy: trigger via `git push origin main`.
6. Verify build slaagt + URL bereikbaar.

## Fase 3 — Object storage (Cloudflare R2)

1. Cloudflare account + R2 bucket "branddock-uploads" aanmaken.
2. API token genereren met R2-edit-permissions.
3. Custom domain `assets.branddock.com` (of subdomain naar keuze) koppelen aan R2 bucket.
4. Vercel env-vars instellen:
   - `R2_ACCOUNT_ID`
   - `R2_ACCESS_KEY_ID`
   - `R2_SECRET_ACCESS_KEY`
   - `R2_BUCKET_NAME=branddock-uploads`  (code leest `R2_BUCKET_NAME`, NIET `R2_BUCKET`)
   - `R2_PUBLIC_URL=https://assets.branddock.com`  (volledige URL, NIET los domein `R2_PUBLIC_DOMAIN`)
5. Test upload via in-app brand-asset image upload na deploy.

## Fase 4 — Stripe live-mode

Stripe code-infra is volledig gebouwd (11 lib-files + 7 API routes — zie `src/lib/stripe/` + `src/app/api/stripe/`). Wat nog moet:

1. Stripe account → Settings → Activate live mode (geverifieerde bedrijfsdata vereist).
2. Stripe Dashboard → Products & prices:
   - Product "Starter" met monthly price €49 (vervang met definitieve bedragen).
   - Product "Pro" met monthly price €149.
   - Product "Agency" met monthly price €399.
   - Kopieer per price de `price_xxx` ID.
3. Vercel env-vars (production):
   - `STRIPE_SECRET_KEY=sk_live_...`
   - `STRIPE_PUBLISHABLE_KEY=pk_live_...`
   - `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...` (zelfde waarde, voor client-bundle)
   - `STRIPE_PRICE_PRO_MONTHLY=price_xxx`
   - `STRIPE_PRICE_AGENCY_MONTHLY=price_xxx`
   - `NEXT_PUBLIC_BILLING_ENABLED=true`
4. Webhook-endpoint registreren in Stripe Dashboard:
   - URL: `https://app.branddock.com/api/stripe/webhook`
   - Events: `checkout.session.completed`, `invoice.payment_succeeded`, `invoice.payment_failed`, `customer.subscription.updated`, `customer.subscription.deleted`
   - Signing-secret kopieren → `STRIPE_WEBHOOK_SECRET` env-var.
5. Customer-portal config in Stripe → branding + features-toggles.
6. Smoke-test op productie:
   - Signup nieuwe user → Settings → Billing → Upgrade → kies plan
   - Test card `4242 4242 4242 4242` (in test-mode) of echte card in live (eigen workspace eerst).
   - Verify webhook → workspace.planTier = PRO/AGENCY.
   - Cancel via portal → workspace.planTier = FREE.

## Fase 5 — Sentry error tracking

Sentry SDK is al gewired in `next.config.ts`. Wat nog moet:

1. Sentry account + project "branddock-web" (Platform: Next.js).
2. DSN kopieren → Vercel env-var `NEXT_PUBLIC_SENTRY_DSN`.
3. Voor source-map upload: Auth token + org + project naam:
   - `SENTRY_AUTH_TOKEN` (Internal Integration met project:write scope)
   - `SENTRY_ORG=branddock` (of jouw org-slug)
   - `SENTRY_PROJECT=branddock-web`
4. (Optioneel) `SENTRY_TEST_SECRET` voor het smoke-endpoint protected route.
5. Smoke-test na deploy:
   - `curl 'https://app.branddock.com/api/test/sentry-trigger?secret=<TEST_SECRET>'`
   - Verify error binnen 1 min verschijnt in Sentry dashboard.

## Fase 6 — Custom domain + DNS

1. Domain-registrar (TransIP / Namecheap / GoDaddy) → DNS-records:
   - `app.branddock.com` → CNAME naar `cname.vercel-dns.com`
   - `www.branddock.com` → CNAME naar `cname.vercel-dns.com` (marketing-site)
   - `assets.branddock.com` → R2 / Cloudflare configureren
2. Vercel Project → Domains → add `app.branddock.com` + `www.branddock.com`.
3. SSL via Vercel automatisch (wacht ~15 min na DNS-propagation).
4. Update env-vars:
   - `BETTER_AUTH_URL=https://app.branddock.com`
   - `NEXT_PUBLIC_MARKETING_URL=https://www.branddock.com`
   - `NEXT_PUBLIC_CALENDLY_URL=<jouw Calendly schedule-link>` (voor /marketing/contact)
5. Re-deploy om env-var changes toe te passen.

## Fase 7 — Marketing-site polish

Scaffold staat in `src/app/marketing/` met COPY-TODO markers door alle pagina's. User-actions:

1. **Homepage** (`src/app/marketing/page.tsx`):
   - Hero-headline finaliseren (placeholder: "AI-content die past bij jouw merk")
   - 3-feature bullet-copy
   - Customer-quote (vereist pilot-input — bv. Better Brands of LINFI)
2. **Pricing** (`src/app/marketing/pricing/page.tsx`):
   - Pricing-bedragen valideren (placeholder: €49 / €149 / €399)
   - Feature-matrix per tier finaliseren
3. **About** (`src/app/marketing/about/page.tsx`):
   - Founder-story
   - Missie-statement
4. **Features** (`src/app/marketing/features/[slug]/page.tsx`):
   - 4 product-screenshots maken in `public/marketing/features/`:
     - `brand-voice.png`
     - `content-studio.png`
     - `brand-alignment.png`
     - (Brandclaw is post-launch, screenshot optioneel)
5. **Contact** (`src/app/marketing/contact/page.tsx`):
   - LinkedIn-URL vervangen
   - Calendly-link via `NEXT_PUBLIC_CALENDLY_URL` env-var

## Fase 8 — Pilot-onboarding Better Brands

Zie ook `tasks/pilot-onboarding-better-brands.md`. **Alleen het merk-DNA** wordt gemigreerd
(brand foundation, geen content/telemetrie-historie) naar een vers prod-account.

> ⚠️ De oude pg_dump-snippet hier was fout (niet-bestaande snake_case-tabelnamen, en
> `pg_dump` heeft geen `--where`-flag). Vervangen door de dedicated migratie-scripts.

**Technisch (jij draait, met prod-creds):** volg de runbook in
[`scripts/migrate-brand-dna/README.md`](../../scripts/migrate-brand-dna/README.md):
1. Owner registreert zich op prod (auto-provisioning maakt org+workspace+owner + lege assets).
2. `export.ts` (lokaal) → inspecteerbare `brand-dna-<slug>.json`-bundle.
3. `upload-images.ts` (R2-creds) → merk-beelden naar R2 + URLs herschreven.
4. `prisma db push` tegen Neon (schema actueel), dan `import.ts --dry-run`, dan de echte import.
5. `scripts/prod/create-vector-indexes.ts` als pgvector-data voor het eerst op prod landt.

**Operationeel (mens-stappen):**
6. Welcome-email via Emailit met login-link + 1-pager onboarding.
7. 30-min onboarding-sessie inplannen + feedback-kanaal afspreken.
8. Prod-smoke: BB logt in, workspace-switcher toont alleen BB (tenant-isolatie), assets/voice
   gevuld, content genereren → F-VAL-score zichtbaar → STRICT triggert onder threshold.

## Fase 9 — Onboarding-flow-test

Zie `docs/playbooks/onboarding-test-script.md` voor full protocol.

1. 3-4 externe testers werven (compensation €50/tester gift-card).
2. 3 sessies × 30-45 min uitvoeren met think-aloud.
3. Friction-rapport synthetiseren → `docs/audits/YYYY-MM-DD-onboarding-flow-test-resultaten.md`.
4. P1-bugfix-cluster bouwen pre-launch.

## Fase 10 — Go-live smoke checklist

Voer DEZE checklist door op productie vóór publiek bekendmaken:

- [ ] `https://app.branddock.com` → laadt + Better Auth signup werkt
- [ ] Nieuwe gebruiker → workspace creatie werkt
- [ ] Brand-asset save → schrijft naar Neon DB
- [ ] AI Exploration start → response binnen 30s (alle 3 providers)
- [ ] Content generation → SSE streaming werkt + variants opgeslagen
- [ ] F-VAL scoring → composite-score zichtbaar in UI
- [ ] Settings → Billing → Stripe Checkout flow (test card)
- [ ] Webhook arrives → workspace.planTier wijzigt
- [ ] Image upload → naar R2 bucket
- [ ] Cron job `/api/cron/run-jobs` zichtbaar in Vercel logs binnen 1 min
- [ ] `https://app.branddock.com/api/test/sentry-trigger?secret=...` → error in Sentry binnen 1 min
- [ ] `https://www.branddock.com/marketing` → laadt + Lighthouse ≥ 90
- [ ] `https://www.branddock.com/marketing/pricing` → 3 tiers + FAQ accordeon
- [ ] PostHog events stromen bij CTA-clicks

## Risico-mitigaties

- **TOKEN_ENCRYPTION_KEY verlies**: bricked OAuth voor ALLE users. Back-up in 1Password + tweede back-up offline.
- **Stripe live-keys per ongeluk in test-flow**: échte charges. Aparte env-vars per environment in Vercel.
- **DNS-propagation delay**: 24u buffer inplannen tussen DNS-changes en go-live aankondiging.
- **Sentry-DSN exposed in client bundle**: bekend en acceptabel (DSN is project-scoped, niet credential).
- **R2 public-domain niet branded**: assets.branddock.com vereist Cloudflare custom-domain config (gratis).

## Volgorde-volgorde

Strikte sequencing voor minimaal risico:
1. Neon (fase 1)
2. R2 (fase 3)
3. Sentry (fase 5)
4. Vercel + env-vars (fase 2) — eerste live deploy zonder Stripe, zonder custom domain
5. Custom domain (fase 6)
6. Stripe live (fase 4) — laatste, vereist verified domain
7. Marketing-site polish (fase 7) — parallel met Stripe live
8. Pilot-onboarding (fase 8) — na Stripe + marketing live
9. Onboarding-flow-test (fase 9) — laatste validatie vóór bredere launch
10. Go-live smoke (fase 10) — checklist vóór publieke aankondiging
