# Task: marketing-homepage-v2 — Fase 1 website-verbeterplan

**Status**: in-progress
**Branch/worktree**: `feat/marketing-homepage-v2` · `branddock-marketing-homepage-v2`
**Plan**: website-verbeterplan v2 (in-house marketingteams · platform-breedte · NL-first · F-VAL bescheiden · geen quote/logo's)

## Scope (Fase 1 — grootste impact)
Homepage-herbouw + nav/footer-herstructuur, NL-first.

## File-list (ownership)
- `src/app/marketing/page.tsx` — volledige NL-rebuild: hero + tech-trustbalk + probleem + walkthrough + platform-breedte (12 modules) + waarde-pijlers + on-brand-bewijs + oplossingen-split + prijzen-teaser + FAQ + CTA
- `src/app/marketing/layout.tsx` — NL nav (Platform/Prijzen/Over ons/Contact + Inloggen + Gratis proberen) + NL footer + NL metadata + JSON-LD → branddock.app
- `src/app/marketing/HowItWorks.tsx` — nieuw: interactieve tabbed walkthrough (4 stappen, echte screenshots)
- `src/app/marketing/marketing.css` — scoped utilities (mkt-accent/chip/frame/hero-glow) via CSS-var (purge-immuun)

## Acceptatiecriteria
- `npx tsc --noEmit` → 0 fouten ✓
- eslint schoon op gewijzigde files
- NL-first; in-house marketingteams als primaire doelgroep; bureaus secundair
- Platform-breedte zichtbaar: persona's, Trend Radar, campagnes, beeld/video, landingspagina's, agents, meertalig
- F-VAL/merk-check bescheiden (geen hoofdrol)
- Geen verzonnen klant-quote of logo's
- Geen dode links (alleen naar bestaande /marketing/*-pagina's + app via appHref)

## Smoke-test
- Vercel preview-deploy rendert branddock.app-marketinghomepage; walkthrough-tabs wisselen; CTA's linken naar de app; screenshots laden.

## Out-of-scope (Fase 2/3)
- NL-vertaling van feature-/pricing-/about-/contact-pagina's
- Eigen feature-pagina's voor persona's / Trend Radar / campagnes / beeld-video (nieuwe screenshots)
- Oplossingen-pagina's (Voor marketingteams / Voor bureaus)
- Resources-hub + Security/AVG + Privacy/Voorwaarden
- Nav-dropdowns (nu platte links tot de doelpagina's bestaan)
