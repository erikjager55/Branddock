---
id: pilot-onboarding-better-brands
title: Eerste pilot-klant Better Brands live krijgen
fase: pre-launch
priority: now
effort: 2 dagen
owner: claude-code
status: open
created: 2026-05-07
completed: -
related-adr: -
related-spec: -
worktree: branddock-launch
---

# Probleem

Better Brands is voorbereid als pilot workspace (BrandPersonality + BrandVoiceguide gevuld, FidelityConfig STRICT-mode, F-VAL gevalideerd op BB content). Maar de workspace draait alleen in Erik's lokale dev. Voor échte pilot moet Better Brands eigen toegang hebben tot een live Branddock instance.

# Voorstel

Na `vercel-deployment` task af: clone Better Brands workspace data naar productie, creëer Better Brands user/owner in Better Auth, hand-over instructies + F-VAL demo flow + basic feedback-loop.

# Acceptatiecriteria

- [ ] Better Brands workspace data gemigreerd naar productie Neon DB (export uit lokaal, import in Neon)
- [ ] Better Brands organization owner-account aangemaakt (email-adres bekend)
- [ ] Welcome email (handmatig of via Emailit) verstuurd met login-link + 1-pager onboarding
- [ ] 30-min onboarding sessie ingepland met Better Brands stakeholder
- [ ] F-VAL demo getoond live: Branddock content vs vanille GPT-4o gap
- [ ] Feedback-kanaal afgesproken (Slack channel of email loop)
- [ ] Eerste live content-creatie sessie geobserveerd
- [ ] 1-week feedback loop ingesteld voor iteratie
- [ ] Smoke-test: Better Brands kan login, content creëren, F-VAL score zien, content downloaden

# Bestanden die ik aanraak

- Geen code-changes — pure data migratie + onboarding
- Mogelijk: `scripts/migrate-workspace-to-prod.ts` (nieuw) als handmatige export/import te omslachtig is

# Bestanden die ik NIET aanraak

- Andere workspace data (Linfi, Nobox, WRA) — die volgen apart

# Smoke test plan

1. Better Brands user logged in op productie domain
2. Workspace switcher toont alleen Better Brands workspace (correct multi-tenant isolation)
3. Brand assets aanwezig en gevuld
4. BrandVoiceguide volledig (description + tone + 3+ writing samples)
5. Maak nieuwe content via Canvas → genereer → F-VAL score zichtbaar
6. STRICT mode triggert wanneer score onder threshold
7. Vergelijking met vanille GPT-4o output toont gap (entry zichtbaar in UI)

# Risico's

- **Data corruptie tijdens migratie**: BV-WIRE complexe relations + pgvector embeddings. Mitigatie: `pg_dump` per-table met validatie post-import
- **Auth flow mismatch**: lokaal met dev-mode, productie verschilt. Mitigatie: test eerst met eigen account op productie
- **Better Brands stakeholder verwacht meer**: pre-launch product. Mitigatie: expliciete framing als "early access pilot, feedback loop ingebouwd"
- **F-VAL demo voldoet niet aan claim**: cijfers kunnen schommelen per content-type. Mitigatie: vooraf testen met BB content-types die eerder +15-18 punten gaven

# Out of scope

- White-label branding (alleen Branddock branding voor pilot)
- Custom feature requests buiten huidige scope
- Migratie van andere pilot workspaces (Linfi/Nobox/WRA — apart)
- Pricing/contract — pilot is gratis, geen Stripe-plan

# Notes

Pre-conditions:
1. `vercel-deployment` task afgerond → productie URL beschikbaar
2. `stripe-billing-live` NIET vereist voor pilot — pilot draait op gratis tier
3. F-VAL pijler 1 vereist gevulde BrandPersonality + BrandVoiceguide → BB heeft beide ✓

Onboarding 1-pager idealiter in Notion of PDF — niet in repo. User maakt deze.
