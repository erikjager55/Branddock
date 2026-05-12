---
id: marketing-site-pricing
title: Marketing site + pricing pagina — externe conversie-driver
fase: pre-launch
priority: now
effort: 1 week
owner: claude-code + user (copywriting + design beslissingen)
status: open
created: 2026-05-12
completed: -
related-adr: -
related-spec: -
worktree: branddock-launch
---

# Probleem

Branddock-app draait op `app.branddock.<domain>` (na vercel-deployment task). Maar wie ergens hoort over Branddock heeft geen publieke landingspagina om te bezoeken — geen "wat is Branddock", geen pricing, geen contact-formulier. Geen funnel-top.

Pilot-strategie leunt op outbound-werving (founder netwerk). Maar zodra pilot-klanten leveren, en zodra Branddock breder wordt gedeeld, is een marketing-site essentieel voor:
- Inbound traffic capture (SEO + referrals)
- Pricing-transparency (anders moeten prospects mailen voor info)
- Trust-signalen (founder-story, social proof, FAQ)
- Conversie-pad naar trial-signup

# Voorstel

Minimalistische marketing-site op `www.branddock.<domain>` (of root-domain met app-subdomain). 5 pagina's, vanaf elke pagina CTA naar app-signup.

**Sitemap**:
1. **Homepage** — value-prop + 3-bullet feature-summary + customer-quote + CTA "Start free trial"
2. **Pricing** — 3-tier (Starter / Pro / Agency) + per-tier feature-matrix + FAQ-onder
3. **Features** — diepere walkthroughs van Brand Voice / Content Studio / Brand Alignment / Brandclaw
4. **About** — founder-story + missie + team (Erik + AI)
5. **Contact** — email + LinkedIn + Calendly-link voor demo

**Tech-stack opties** (kiest user):
- (a) **Same Next.js repo, aparte route-group** — `/marketing/*` routes, SSG. Voordeel: één codebase. Nadeel: marketing-deploy coupled met app-deploy.
- (b) **Separate Next.js project, Vercel subdomain** — `www.branddock.<domain>` aparte deploy. Voordeel: ontkoppeling. Nadeel: 2 codebases.
- (c) **Statisch via Astro / 11ty** — losse statisch gegenereerde site. Voordeel: ultra-fast. Nadeel: 3e tech-stack in project.

Aanbeveling: (a) voor MVP, migrate naar (b) post-launch als marketing-velocity verschilt van app-velocity.

# Acceptatiecriteria

**5 pagina's gebouwd**:
- [ ] Homepage met hero + 3-bullet features + customer-quote + dual-CTA (signup + demo-Calendly)
- [ ] Pricing met 3-tier tabel + FAQ-onder + currency NL/EUR
- [ ] Features met 4 sectie-pages (Brand Voice / Content Studio / Brand Alignment / Brandclaw) — elk met screenshot + bullet-list
- [ ] About met founder-story + missie
- [ ] Contact met email + LinkedIn + Calendly-embed

**Conversie-funnel**:
- [ ] CTA naar app-signup vanaf elke pagina (sticky header + footer + inline)
- [ ] PostHog event-tracking op CTA-clicks per pagina
- [ ] Source-tracking via UTM-parameters in CTA-URLs (`?utm_source=marketing-site&utm_medium=hero`)

**SEO**:
- [ ] Meta-title + description per pagina
- [ ] OpenGraph + Twitter card images
- [ ] `sitemap.xml` + `robots.txt`
- [ ] Schema.org JSON-LD (Organization + WebSite + Product)
- [ ] Lighthouse score ≥ 90 op alle 4 (Performance / Accessibility / Best Practices / SEO)

**Content**:
- [ ] Copy in NL (primaire pilot-doelgroep)
- [ ] EN-vertaling deferred tot post-launch (één taal eerst kwalitatief, dan uitbreiden)
- [ ] Customer-quote — minimum 1 (van LINFI pilot of Better Brands)

**Pricing-tiers**:
- [ ] Starter (~€49/mnd): 1 workspace + 1 user + 50 content-items/mnd
- [ ] Pro (~€149/mnd): 3 workspaces + 5 users + 200 content-items/mnd + Brandclaw access
- [ ] Agency (~€399/mnd): 10 workspaces + 20 users + unlimited content-items + multi-tenant
- [ ] Tier-prijzen valideren met user vóór live (placeholder OK in eerste sprint, finalize in sprint #7)

**Deploy**:
- [ ] Bij optie (a): route-group `/marketing/*` in Next.js app
- [ ] Bij optie (b): separate Vercel project + www-subdomain DNS
- [ ] HTTPS via Vercel automatisch

# Bestanden die ik aanraak

**Bij optie (a)** — same repo:
- `src/app/marketing/page.tsx` (homepage)
- `src/app/marketing/pricing/page.tsx`
- `src/app/marketing/features/[slug]/page.tsx`
- `src/app/marketing/about/page.tsx`
- `src/app/marketing/contact/page.tsx`
- `src/app/marketing/layout.tsx` (marketing-specifieke nav + footer + tracking)
- `src/components/marketing/*` (Hero / FeatureCard / PricingTier / CTABanner)
- `public/marketing/*` (screenshots, hero images)
- `next.config.ts` — rewrites voor www-subdomain naar `/marketing/*` paths

**Bij optie (b)** — separate project:
- Nieuwe repo / directory `branddock-marketing/`
- Volledig nieuw Next.js project, scope hieronder uitwerken bij keuze

**Modify (beide)**:
- `vercel.json` — domain-config
- `docs/specs/marketing-site-pricing.md` (nieuw) — copywriting brief + tier-rationale

# Bestanden die ik NIET aanraak

- App-code (geen wijzigingen aan `src/features/*` of `src/app/api/*`)
- Stripe-pricing-IDs (komt uit `stripe-billing-live` task; deze task toont alleen UI)
- Email-templates (apart in onboarding-email-templates post-launch)
- Blog-content (post-launch content-marketing)

# Smoke test plan

1. Marketing-site bereikbaar op `www.<domain>` (of `/marketing/*` paths)
2. CTA-link naar app-signup werkt + UTM-params landen in PostHog session
3. Pricing-tabel rendert correct + FAQ accordion werkt
4. Calendly-embed op contact-page laadt
5. Lighthouse audit ≥ 90 op alle 4 metrics
6. Sitemap.xml en robots.txt bereikbaar
7. Schema.org JSON-LD valide (Google Rich Results test)
8. OpenGraph preview-card werkt (test via Twitter/LinkedIn preview)
9. Mobile-responsive (iPhone + Android Chrome dev-tools)

# Risico's

- **Copy-paralysis** — perfecte tekst kost weken, MVP-launch belangrijker dan perfectie. **Mitigatie**: time-box 2-3u per pagina voor copy v1; iteratie post-launch met feedback
- **Pricing-tier-finalize uitgesteld** — kan blokkeren bij merge. **Mitigatie**: placeholder-tiers OK in sprint #6, finalize sprint #7 vóór go-live
- **Lighthouse-degradatie** door images. **Mitigatie**: Next.js `<Image>` + lazy-load + WebP
- **Domain-config** complexiteit. **Mitigatie**: optie (a) start eenvoudiger; migratie naar (b) post-launch
- **Calendly-account** moet bestaan. **Mitigatie**: user moet Calendly-link aanleveren vóór contact-page deploy

# Out of scope

- Blog / content-marketing post-launch
- Multi-language (alleen NL pre-launch)
- Live-chat widget (Intercom etc.) — post-launch wanneer support-volume groeit
- Affiliate / partner-program
- Customer-portal voor existing klanten (login-only feature, niet marketing)
- Newsletter-signup (post-launch)
- A/B-testing van CTA-varianten (eerst baseline, dan iteratie)

# Notes

**Sprint-positie**: kan grotendeels parallel met stripe-billing-live (verschillende files). Start sprint #6, finalize sprint #7.

**Copywriting-handoff**: user levert copywriting input vóór sprint-start (key-message per pagina, value-prop, customer-quotes geselecteerd). Anders blocked op copy-decisions.

**Pricing-rationale**: tier-structuur volgt cost-model — Starter dekt unit-economics, Pro is sweet-spot voor SMB, Agency multi-tenant. Validatie via pilot-feedback in sprint #6.
