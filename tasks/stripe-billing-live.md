---
id: stripe-billing-live
title: Stripe live billing — checkout + webhooks + plan enforcement
fase: pre-launch
priority: now
effort: 1 week
owner: claude-code
status: done
created: 2026-05-07
completed: 2026-07-06
related-adr: -
related-spec: -
worktree: branddock-launch
---

> **Status 2026-07-06 — CODE-PORTIE DONE (changelog #357).** Deze task-file (2026-05-07) beschreef een from-scratch-bouw, maar een audit toonde dat de subscription-lifecycle al code-compleet + gewired was (checkout → webhook HMAC+idempotency → DB-sync → planTier → enforcement, portal, invoice-sync, live BillingTab). De hardening-werkstroom dichtte de resterende bugs/gaten: **S1** gratis-upgrade-exploit verwijderd + one-time-purchase-completion gewired (`payment_intent.succeeded`); **S2** factuur-/100 + yearly-mis-charge; **S3** echte usage-meter + env fail-fast; **S4** [go-live-playbook](../docs/playbooks/stripe-go-live.md). Commits 255b39de/c90ed171/ca0517d4 (+ deze docs-commit), branch `feat/stripe-billing-hardening`. **Resteert = human Stripe-dashboard-config** (account/products/prices/keys/webhook/portal/`NEXT_PUBLIC_BILLING_ENABLED=true`, zie playbook). **Uit scope (per-token-fase)**: metered-overage/usage-metering/trial/PaymentMethod-sync. De acceptatiecriteria hieronder zijn grotendeels via de bestaande code al vervuld; de `WorkspacePlan`-enum heet in de praktijk `PlanTier` (FREE/PRO/AGENCY/ENTERPRISE).

# Probleem

Pre-launch eindigt bij livegang. Zonder Stripe live billing kunnen gebruikers wel een account maken maar niet betalen — geen revenue, geen plan-enforcement, geen quota's. Settings → Billing UI bestaat al maar is niet wired aan Stripe API.

# Voorstel

Twee minimale plannen + checkout-flow + webhook handler + plan-enforcement middleware.

# Acceptatiecriteria

- [ ] Stripe account aangemaakt + API keys (test + live mode)
- [ ] 2 productplannen in Stripe Dashboard: `direct-monthly` + `agency-monthly` (max 5 workspaces)
- [ ] `WorkspacePlan` enum op Workspace model (FREE / DIRECT / AGENCY)
- [ ] Checkout flow: plan selectie → Stripe Checkout → redirect naar Settings → Billing
- [ ] Webhook handler `src/app/api/stripe/webhook/route.ts` — events: `checkout.session.completed`, `invoice.payment_succeeded`, `invoice.payment_failed`, `customer.subscription.deleted`
- [ ] HMAC signature verification op webhook (`stripe.webhooks.constructEvent`)
- [ ] Idempotency keys op alle subscription state-changes
- [ ] Plan-gate middleware `src/lib/billing/plan-gate.ts` — checkt workspace.plan tegen feature-allow-lists
- [ ] Subscription management in `BillingSettingsPage` (UI staat al — wire de echte data)
- [ ] Cancel flow + portal-link via Stripe Customer Portal
- [ ] Trialing state support (14-dagen trial bij signup)
- [ ] Env vars: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PUBLISHABLE_KEY`
- [ ] `npx tsc --noEmit` 0 errors
- [ ] Smoke-test: complete signup → checkout met test card → webhook arriveert → workspace.plan = DIRECT → cancel via portal → workspace.plan terug

# Bestanden die ik aanraak

- `prisma/schema.prisma` — WorkspacePlan enum, Workspace.plan, Workspace.stripeCustomerId, Workspace.stripeSubscriptionId
- `src/lib/billing/stripe-client.ts` (nieuw) — singleton Stripe SDK
- `src/lib/billing/plan-gate.ts` (nieuw) — feature-flag check tegen plan
- `src/app/api/stripe/checkout/route.ts` (nieuw) — POST checkout session
- `src/app/api/stripe/webhook/route.ts` (nieuw) — POST webhook handler
- `src/app/api/stripe/portal/route.ts` (nieuw) — POST customer portal session
- `src/features/settings/components/billing/BillingSettingsPage.tsx` — wire echte data
- `src/features/settings/api/billing.api.ts` — fetch subscription, cancel, etc.
- `src/features/settings/hooks/use-billing.ts` — TanStack Query hooks

# Bestanden die ik NIET aanraak

- Andere settings tabs (Account, Team, Notifications, Appearance) — niet gerelateerd
- AI provider configuratie — komt niet in plan-enforcement nu
- Andere routes — geen plan-gate toepassen tot Stripe werkt

# Smoke test plan

## Test mode
1. Run app met test API keys
2. Signup nieuwe user → workspace gecreëerd met plan=FREE
3. Settings → Billing → Upgrade → kies DIRECT plan → Stripe Checkout
4. Gebruik test card `4242 4242 4242 4242` → success → redirect terug
5. Verify webhook arriveerde + workspace.plan = DIRECT
6. Verify Stripe Customer ID + Subscription ID op workspace
7. Cancel via portal → check webhook update + workspace.plan = FREE
8. Test failed payment scenario via Stripe test card

## Plan-gate verifiëren
1. Plan-gate code op nieuwe feature toepassen (bv max-workspaces voor agency)
2. Verify FREE-plan workspace krijgt 403 op gated feature
3. Upgrade → toegang werkt

## Webhook idempotency
1. Replay zelfde webhook 2× via Stripe CLI
2. Verify state niet 2× gemuteerd

# Risico's

- **Webhook signature verkeerd**: kost dagen debuggen. Mitigatie: gebruik `stripe.webhooks.constructEvent` exact volgens docs
- **Idempotency vergeten**: dubbele plan-upgrade. Mitigatie: idempotency-key op every state-change, verify in DB
- **Customer portal niet branded**: ervaring breekt. Mitigatie: Stripe portal customization vooraf instellen
- **Live keys per ongeluk in test**: échte charges. Mitigatie: aparte env vars + dev/prod gate

# Out of scope

- Multi-currency support (alleen EUR voor MVP)
- Annual billing toggle (alleen monthly voor MVP)
- Usage-based billing (per-content-generated quota — komt later)
- Custom enterprise plans
- Coupon/discount management

# Notes

Plan-features mapping (initial):
- **FREE**: 1 workspace, 50 AI calls/mnd, 10 deliverables
- **DIRECT** (€X/mnd): 1 workspace, 500 AI calls/mnd, unlimited deliverables
- **AGENCY** (€Y/mnd): 5 workspaces, 2000 AI calls/mnd, unlimited deliverables, branding

Pricing: open beslissing, raadpleeg user.

Stripe webhook test setup: `stripe listen --forward-to localhost:3000/api/stripe/webhook`.
