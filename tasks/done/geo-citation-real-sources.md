---
id: geo-citation-real-sources
title: GEO stats — model citeert de echte knowledge-bron i.p.v. terug te vallen op (genullde) interne labels
fase: pre-launch
priority: next
effort: ~0,5 dag
owner: claude-code
status: done
created: 2026-06-24
completed: 2026-06-24
related-adr: -
related-spec: docs/specs/2026-06-17-geo-seo-longform-plan.md
worktree: -
---

# Probleem

Na de leak-fix ([[geo-stat-citation-source-leak]]) worden interne laagnamen als bron correct naar `null`
gescrubd → stats renderen label-only. Maar bij de Napking-verificatie werden **alle 4** de bronnen `null`:
het model citeerde het beschikbare Deep Research-rapport (met ~4 echte URLs + bronnen-sectie) níet, en
viel terug op interne labels (die de sanitizer wegving). Resultaat: 0 stats met een echte externe citatie,
terwijl die er wél was. Voor GEO/AEO-citeerbaarheid is een echte bron juist waardevol.

# Voorstel

Verbeter de prompt (`variant-generator.ts`) zodat het model `citeableStats[].source` actief mapt naar een
echte bron uit de knowledge-context of de `sources`-lijst (titel + URL), met expliciete instructie om bij
een passend research-cijfer de bijbehorende bron te citeren i.p.v. weg te laten. Overweeg de knowledge-bron
explicieter/gestructureerder aan te leveren (bv. een genummerde bronnenlijst die het model per stat kan
refereren). Behoud het null-gedrag uitsluitend voor échte first-party merk-cijfers.

# Acceptatiecriteria

- [ ] Bij aanwezige knowledge-bron met cijfers krijgt minstens een deel van de citeableStats een echte externe `source` (geen `null`)
- [ ] First-party merk-cijfers blijven correct `null` (label-only)
- [ ] Geen interne laagnamen (sanitizer blijft als vangnet actief)
- [ ] `npx tsc --noEmit` 0 errors + lint schoon
- [ ] Smoke: regenereer een GEO-pagina mét knowledge-bron en bevestig ≥1 echte bron in `structuredVariantOptions[*].citeableStats`

# Bestanden die ik aanraak

- `src/lib/landing-pages/variant-generator.ts` — prompt: stat-source actief koppelen aan knowledge/sources
- (mogelijk) de context-assembly die `additionalContextText` opbouwt — bron gestructureerder aanleveren

# Bestanden die ik NIET aanraak

- `src/lib/landing-pages/sanitize-geo-sources.ts` — vangnet blijft ongewijzigd
- Render/schema — al correct na de leak-fix

# Smoke test plan

1. Open een GEO-deliverable met een geselecteerde knowledge-resource die cijfers + URLs bevat.
2. Regenereer.
3. DB-check: `structuredVariantOptions[*].citeableStats[*].source` bevat ≥1 echte bron (URL/titel+jaar), 0 interne labels.

# Risico's

- Te dwingend "citeer altijd een bron" → model verzint alsnog → mitigatie: alleen citeren als de bron echt in context staat; sanitizer blijft vangnet.

# Out of scope

- Render/UI van bronnen (al af).

# Notes

- Volgt uit de live-verificatie van [[geo-stat-citation-source-leak]] (alle 4 sources null op de Napking-pagina, 2026-06-24).
- **Done 2026-06-24**: bindende constraint was de 7000-char-cap (user-knowledge defaultte naar reference) die de rapport-URLs (laatste ~426 chars) afkapte. Fix: nieuwe `geo-knowledge-context.ts` forceert de eerste ≤3 knowledge-resources op primary (16k) + prepend "## CITEERBARE BRONNEN"-handles; route gated op LONG_FORM_SEO_TYPES; prompt citeert uitsluitend uit die lijst. Live-harness op finale code: 1/4 citeableStats kreeg een echte bron + sources[] met echte URL (superlinen.com); first-party null; 0 interne labels. 5-ronde finalize-review clean. Bekende grens: bronnen >16k kunnen body-URLs afkappen (handle blijft fallback).
