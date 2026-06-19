---
id: geo-seo-fase1a-structured-data
title: GEO/SEO Fase 1a — metadata + structured-data + discovery voor bestaande page-types
fase: pre-launch
priority: now
effort: 2-4 dagen
owner: claude-code
status: in-progress
created: 2026-06-17
completed: -
related-adr: -
related-spec: docs/specs/2026-06-17-geo-seo-longform-plan.md
worktree: branddock-feat-geo-seo
---

# Probleem

Reeds-gepubliceerde page-types (faq-page/product-page) hebben al een `LandingPage`-snapshot + `settings.seoChecklist` (geschreven door `seo-pipeline.ts:337`) én — voor product/faq — JSON-LD via `/p/[slug]`. Maar de publieke route consumeerde de checklist niet voor de HTML-`<head>`: elke gepubliceerde pagina kreeg de generieke root-layout-`<title>`/meta (slechte social-share + niet AI-/SERP-citeerbaar). Daarnaast ontbreken Organization-publisher/BreadcrumbList in de JSON-LD en is er geen sitemap/robots/llms.txt op de canonieke app-domein-paden. Dit is de enige echt ongeblokkeerde GEO/SEO-quick-win (raakt geen generatie).

# Voorstel

Vul de head/JSON-LD/discovery-laag voor de al-gepubliceerde page-types. Drie sub-delen: (1) `generateMetadata` op `/p/[slug]` uit `settings.seoChecklist` — **GEBOUWD**; (2) `page-json-ld.ts` additief uitbreiden (Organization-publisher + BreadcrumbList + orphaned `howToSchema` wiren) met byte-identieke backward-compat voor faq/product; (3) root sitemap/robots/llms.txt — **GEBLOKKEERD op multi-tenant-beslissing**, zie Risico's.

# Acceptatiecriteria

- [x] `/p/[slug]` zet `<title>`/description/OpenGraph/canonical uit `settings.seoChecklist` (titleTag/metaDescription/ogTitle/ogDescription/canonicalTag); fail-soft → root-layout-defaults bij ontbrekende checklist
- [x] Canonical-fallback `https://<workspace>.branddock.app/<slug>` wanneer checklist geen canonicalTag heeft (dubbele-URL → duplicate-content-bescherming)
- [x] Pure, los-testbare mapping `seoChecklistToMetadata` (geen DB/Puck-koppeling)
- [x] `page-json-ld.ts`: Organization-`publisher` op FAQPage (additief; Product/Service hebben al brand/provider); faq/product core ongewijzigd (w2-w3 smoke 53/53)
- [x] Multi-tenant sitemap/robots/llms.txt (open vraag #6 OPGELOST): **per-workspace op het subdomein** via host-aware route-handlers (geen globale root-sitemap → geen cross-tenant lek); `/sitemap.xml`/`/robots.txt`/`/llms.txt` exempt in host-router
- [x] Smokes groen: `smoke:page-seo-metadata` (30/30) + `smoke:geo-discovery` (28/28) + `smoke:page-types-w2-w3` (53/53)
- [x] `npx tsc --noEmit` 0 errors · `npm run lint` 0 errors
- [x] 2-lens adversariële review (multitenant-security clean; nextjs-correctness fixes verwerkt: cache-control, fail-soft DB-error-handling, llms-titels via JOIN)
- [ ] **Deploy-time browser-smoke** (vereist echte subdomeinen, kan pas bij `vercel-deployment`): gepubliceerde faq/product-pagina toont pagina-specifieke `<title>` + OG (view-source); `<ws>.branddock.app/sitemap.xml` listet alleen die workspace
- [ ] Deferred binnen Fase 1a (gedocumenteerd, lage waarde nu): BreadcrumbList (geen site-hiërarchie voor losse pagina's) + `howToSchema`-wiring (onzekere string-vorm uit de AI)

# Bestanden die ik aanraak

- `src/app/p/[slug]/page.tsx` — generateMetadata + cached loader + canonical-fallback (GEDAAN)
- `src/lib/landing-pages/page-metadata.ts` — pure mapping + fallbackCanonical (NIEUW, GEDAAN)
- `src/lib/landing-pages/page-json-ld.ts` — Organization-publisher op FAQPage (GEDAAN)
- `src/lib/landing-pages/host-router.ts` — `workspaceSlugFromHost` + discovery-exemptions (GEDAAN)
- `src/lib/landing-pages/sitemap-host.ts` — pure builders sitemap/robots/llms (NIEUW, GEDAAN)
- `src/app/sitemap.xml/route.ts` + `src/app/robots.txt/route.ts` + `src/app/llms.txt/route.ts` — host-aware route-handlers (NIEUW, GEDAAN)
- `scripts/smoke-tests/page-seo-metadata.ts` + `scripts/smoke-tests/geo-discovery.ts` — smokes (NIEUW, GEDAAN)
- `scripts/smoke-tests/page-types-w2-w3.ts` — publisher-asserties toegevoegd (GEDAAN)
- `package.json` — smoke-scripts `smoke:page-seo-metadata` + `smoke:geo-discovery` (GEDAAN)

# Bestanden die ik NIET aanraak

- `src/lib/ai/seo-pipeline.ts` — persistentie is al correct; checklist-velden (author/dates) horen bij Fase 1b
- `src/app/marketing/robots.ts` + `src/app/marketing/sitemap.ts` — targeten `branddock.com`, blijven coëxisteren; alleen reconciliëren bij root-route-bouw

# Smoke test plan

1. `npm run smoke:page-seo-metadata` → 21/21 (GEDAAN)
2. Publiceer een product-page + faq-page; open `<workspace>.branddock.app/<slug>` → view-source: `<title>` = titleTag, `<meta name="description">`, `og:title/description`, canonical aanwezig; JSON-LD ongewijzigd
3. Pagina zonder seoChecklist → valt terug op root-layout-meta, geen crash

# Risico's

- **Multi-tenant sitemap/robots (open vraag #6)**: `/p/[slug]` leeft op `*.branddock.app`-subdomeinen, marketing op `branddock.com`. Eén globale root-sitemap vs per-workspace sitemap-index is een onbesliste architectuurkeuze (privacy/slug-enumeratie + schaal). **Niet gokken** — beslissen vóór bouw. Mitigatie: sub-deel 3 uitgesteld tot beslissing.
- JSON-LD-uitbreiding backward-compat: faq/product output moet byte-identiek blijven → smoke met before/after vergelijking vóór merge.

# Out of scope

- Long-form metadata (heeft pas een seoChecklist met author/dates ná Fase 1b/2)
- GEO-specifieke schema (BlogPosting/QAPage/DefinedTerm) — Fase 3

# Notes

- 2026-06-17: generateMetadata-slice gebouwd + geverifieerd in worktree `branddock-feat-geo-seo`. `settings.seoChecklist`-persistentie geverifieerd (seo-pipeline.ts:337) — de page consumeerde het simpelweg niet.
- 2026-06-17: Fase 1a afgerond op code-niveau. Open vraag #6 (multi-tenant sitemap) opgelost na trace van `host-router.ts`: canonical-URL is deterministisch (`https://<ws>.branddock.app/<slug>`) en de juiste sitemap-vorm is **per-workspace op het subdomein** (geen globale root-sitemap → geen cross-tenant slug-lek). Discovery-files zijn host-aware route-handlers (niet de Next-metadata-files, want die kunnen de Host niet lezen); marketing `app/marketing/robots.ts`+`sitemap.ts` (branddock.com) blijven coëxisteren — niet aangeraakt.
- 2026-06-17: 2-lens adversariële review — multitenant-security clean; nextjs-correctness-fixes verwerkt (cache-control op robots/llms, fail-soft DB-error-handling met `no-store` op sitemap/llms, llms-titels via JOIN i.p.v. N+1). Eén review-bevinding (robots error-handling) was false-positive: robots.txt doet geen DB-call.
- node_modules in de worktree via symlink (`ln -s ../branddock-app/node_modules`) — werkt voor tsc/tsx, niet voor Turbopack-dev (gotcha).
