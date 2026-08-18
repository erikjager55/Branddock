---
id: marketing-homepage-v2
title: Marketing-homepage v2 (Fase 1) — homepage-herbouw + nav/footer-herstructuur, NL-first
fase: post-launch
priority: now
effort: 2-4 dagen
owner: claude-code
status: done
created: 2026-07-15
completed: 2026-07-15
related-adr: -
related-spec: -
worktree: branddock-marketing-homepage-v2 (opgeruimd na de merge)
---

# Task: marketing-homepage-v2 — Fase 1 website-verbeterplan

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

---

# Afronding (vastgesteld 2026-08-18)

Deze taak stond 34 dagen ten onrechte op `in-progress` en op de Nu-lijst in
`START_HERE.md`. Het werk was allang geland.

**Bewijs**:

| Fase | PR | Branch | Gemerged |
|---|---|---|---|
| 1 — homepage + nav/footer NL-first | [#151](https://github.com/erikjager55/Branddock/pull/151) | `feat/marketing-homepage-v2` | 2026-07-15 19:33 |
| 2a — NL-vertaling inner-pagina's + pricing-CTA-fix | [#152](https://github.com/erikjager55/Branddock/pull/152) | `feat/marketing-fase2` | 2026-07-15 19:47 |
| 2b — persona's/Trend Radar/campagne-pagina's + Oplossingen | [#153](https://github.com/erikjager55/Branddock/pull/153) | `feat/marketing-fase2` | 2026-07-15 20:23 |

Commit van Fase 1: `f97feb7b` — bevat alle vier bestanden uit de file-list
(`page.tsx`, `layout.tsx`, `HowItWorks.tsx`, `marketing.css`), geverifieerd als
voorouder van `origin/main`. **De hele Out-of-scope-lijst (Fase 2/3) hierboven is
in #152 en #153 diezelfde avond alsnog gebouwd** — feature-pagina's, oplossingen-
pagina's, resources/security/privacy/voorwaarden en de nav-dropdowns bestaan allemaal.

## Waarom de status verkeerd stond — het onthouden waard

De task-file had oorspronkelijk **geen frontmatter**. Die is op 2026-08-17 achteraf
toegevoegd door [#286](https://github.com/erikjager55/Branddock/pull/286)
(*"frontmatter toegevoegd aan kpi-fase0 + marketing-homepage-v2 zodat ze niet buiten
elke statusscan vallen"*) met een default `status: in-progress` en een verzonnen
`created: 2026-08-12` — een datum ná de merge van het werk dat erin beschreven staat.
Die twee velden zijn nooit tegen de repo gecontroleerd, en de rij in `START_HERE.md`
is er vervolgens op gebaseerd.

**Regel**: frontmatter die je achteraf aan een bestaande task-file plakt is een
*gok*, geen registratie. Leid `status` en `created` af uit `git log` van het bestand
zelf (`git log --diff-filter=A -- <pad>`) en uit de merge-status van de bijbehorende
PR — niet uit een default. Een verzonnen status wandelt binnen één dag door naar de
takenlijst en stuurt daarna het werk aan.

⚠️ `kpi-fase0` kreeg in dezelfde commit dezelfde behandeling (`status: in-progress`,
worktree `branddock-kpi-fase0` die niet bestaat) terwijl PR
[#215](https://github.com/erikjager55/Branddock/pull/215) op 2026-07-20 mergede.
**Nagelopen op 2026-08-18: ook daar was het werk af** — zie
[`kpi-fase0.md`](kpi-fase0.md). Daar klopte `created` overigens wél; alleen `status` en
`worktree` waren mis.

## Vervolg

De pagina-voor-pagina-verbeterslag over alle 26 marketing-URL's loopt verder als
[`marketing-site-verbeterslag`](../marketing-site-verbeterslag.md).
