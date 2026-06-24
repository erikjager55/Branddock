---
id: geo-longform-heading-render-polish
title: GEO long-form render-polish — "TL;DR"-kop locale-consistent + heading-fontgroottes normaliseren
fase: pre-launch
priority: now
effort: ~0,5-1 dag
owner: claude-code
status: in-progress
related-adr: -
related-spec: docs/specs/2026-06-17-geo-seo-longform-plan.md
created: 2026-06-24
completed: -
worktree: branddock-feat-lp-quickwins
---

# Probleem

Twee zichtbare render-issues op de gegenereerde GEO long-form pagina (Napking, 2026-06-24):

1. **"TL;DR"-kop is inconsistent.** `long-form-geo-from-structured.ts:59` hardcodet `## TL;DR` (Engelse
   jargon-acroniem), terwijl de rest van de template Nederlands hardcodet ("Op een rij" r87,
   "Veelgestelde vragen" r100, "Bronnen" r104). Op een NL-pagina valt "TL;DR" uit de toon; de hardcoded
   koppen zijn bovendien niet locale-aware (de template draait ook voor andere talen).

2. **Grote sprong in heading-fontgroottes.** RichText-markdown `##`-koppen (TL;DR + alle prose-secties)
   vallen terug op **26px** (`puck-config.tsx:3118`), maar de dedicated component-koppen
   (Listicle "Op een rij", ComparisonTable-caption, FAQ "Veelgestelde vragen") vallen terug op
   `ds.typography.heading.sizes[length-2]` (~28+; regels 2140/2248/2358). Wanneer het merk geen scraped
   `tbr.heading.fontSize` heeft (fallback-tokens — hier "4 fallback"), lopen die twee bronnen zichtbaar
   uiteen: de component-koppen ogen duidelijk groter dan de prose-sectiekoppen.

# Voorstel

1. Maak de hardcoded section-labels locale-aware (TL;DR + Op een rij + Veelgestelde vragen + Bronnen) via
   een kleine locale-map, met NL-default "Samenvatting"/"In het kort" i.p.v. "TL;DR".
2. Normaliseer de "section heading"-fontgrootte: één canonieke bron/fallback voor zowel de RichText `##`-h2
   als de dedicated component-koppen, zodat ze in elk merk-scenario (ook fallback-tokens) gelijk zijn.

# Acceptatiecriteria

- [ ] "TL;DR" vervangen door een NL-label (locale-aware); alle section-labels consistent met de content-locale
- [ ] RichText `##`-koppen en Listicle/ComparisonTable/FAQ-koppen hebben dezelfde fontgrootte, óók bij fallback-tokens
- [ ] Geen regressie op LP/faq/product/microsite (puck-config is gedeeld) — visuele check per type
- [ ] `npx tsc --noEmit` 0 errors + lint schoon
- [ ] Browser-smoke: regenereer de GEO-pagina, bevestig consistente koppen + NL-label

# Bestanden die ik aanraak

- `src/features/campaigns/components/canvas/medium/puck-templates/long-form-geo-from-structured.ts` — locale-aware section-labels
- `src/features/campaigns/components/canvas/medium/puck-config.tsx` — heading-fontSize normaliseren (RichText h2 ↔ component-koppen)

# Bestanden die ik NIET aanraak

- De generator/schema/sanitizer-laag — niet gerelateerd aan render-typografie

# Smoke test plan

1. Regenereer de Napking GEO-pagina (of een andere blog-post).
2. Visueel: TL;DR-kop is NL en even groot als de prose-sectiekoppen; "Op een rij"/"Veelgestelde vragen"/comparison-caption matchen exact.
3. Open een landing-page + faq-page deliverable → bevestig geen heading-regressie.

# Risico's

- **puck-config typografie is gedeeld over alle page-types** → een fontSize-wijziging kan LP/faq/product raken. Plan-mode + per-type visuele check vereist. Mitigatie: wijzig de fallback gericht zodat scraped-token-merken (die `tbr.heading.fontSize` hebben) byte-identiek blijven; alleen het fallback-pad normaliseren.

# Out of scope

- Bredere typografie-herziening van het design-system.
- Volledige i18n van de template buiten de section-labels.

# Notes

- Gevonden tijdens [[geo-stat-citation-source-leak]]-verificatie (2026-06-24). Heading-size-indices in puck-config: RichText h2 = `tbr.heading.fontSize ?? 26` (r3118); component-koppen = `?? heading.sizes[length-2]` (r2140/2248/2358).
- **Deelresultaat 2026-06-24** (worktree `branddock-feat-lp-quickwins`): #3 TL;DR-kop opgelost — `## TL;DR` → `## Samenvatting` in de template (NL-consistent met de overige hardcoded koppen). De template heeft geen locale beschikbaar (ctx exposeert die niet), dus volledige locale-awareness van álle section-labels vereist eerst locale-doorvoer → blijft open. **#4 fontgroottes nog open** (gedeelde `puck-config.tsx` → plan-mode + per-type visuele check vereist).
