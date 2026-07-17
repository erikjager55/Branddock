---
id: marketing-composition-v2
title: Marketing-site compositie-herziening (hero, binnenpagina-headers, kaartsysteem)
fase: pre-launch
priority: now
effort: 1-2 dagen
owner: claude-code
status: done
created: 2026-07-16
completed: 2026-07-16
related-adr: -
related-spec: -
worktree: branddock-marketing-composition-v2
---

# Probleem

De marketing-site (branddock.app) heeft sinds de G1-G3-beeldtaalronde het juiste kleur/font/logo-systeem, maar de compositie eronder oogt generiek: de hero stapelt vijf visuele lagen tegelijk (foto + gradient + mozaïek + tekst-schaduw + los zwevend productkaartje), één kaart-component wordt voor elke sectie hergebruikt zonder hiërarchie, en de zes brandbook-kleuren worden willekeurig ingezet (bijna alles is blauw→mint). Analyse + verbeterplan zijn goedgekeurd door Erik (artifact "grafische-review-v2"), inclusief het door hem aangedragen tweevlaks-paneel als hero-structuur.

# Voorstel

Herbouw de hero als tweevlaks-paneel (effen inktpaneel met copy links, vol-mozaïek-paneel met productscreenshot rechts, feitenregel onderaan i.p.v. de dunne trust-bar) — Fase H1. Pas dezelfde tweevlaks-structuur toe als compacte header op alle binnenpagina's, met een kleur-familie-regel (product = blauw/mint, mensen = oranje/lime, bewijs = mint/lime) — Fase H2. Werk het kaartsysteem bij: icoon-tegels krijgen mini-mozaïek-vormen i.p.v. effen gradient-vierkanten, de losse statcijfer-kaarten worden één band, de FAQ-chevron wordt een roterende Lucide `ChevronDown`, de Growth-tier-badge op de prijzenpagina wordt steviger — Fase H3.

Fase H4 (Over ons founder-anker, Oplossingen-screenshots) staat **niet** in deze task — die heeft assets nodig die Erik nog moet aanleveren (portretfoto, of een bewuste keuze voor een signature-tegel in plaats van een foto).

# Acceptatiecriteria

- [x] Homepage-hero is een tweevlaks-paneel: inktpaneel (logo/eyebrow/H1/lead/dual-CTA) + vol-mozaïek-paneel met zwevende productscreenshot, feitenregel-rij vervangt de trust-bar
- [x] Sky-foto (`hero-sky.png`) is uit de hero verwijderd
- [x] Alle binnenpagina's met een gradient-banner-kop (platform, pricing, contact, features ×7, solutions ×2, about, f-val) gebruiken de compacte tweevlaks-header-variant
- [x] Kleur-familie-regel toegepast: product-pagina's blauw/mint, mensen-pagina's oranje/lime, bewijs-pagina's mint/lime
- [x] Icoon-tegels in kaartgrids gebruiken mini-mozaïek-vormen i.p.v. effen gradient-vierkanten
- [x] Statcijfers in de "ProofStrip" zijn één samenhangende band i.p.v. drie losse half-lege kaarten
- [x] FAQ-chevron is een Lucide `ChevronDown` die roteert bij open/dicht
- [x] Growth-tier-badge op /marketing/pricing is visueel duidelijk de aanbevolen keuze
- [x] `npx tsc --noEmit` 0 errors
- [x] `npm run lint` 0 errors
- [x] Smoke-test uitgevoerd (Playwright screenshots van alle geraakte pagina's, desktop + mobiel)

# Bestanden die ik aanraak

- `src/app/marketing/page.tsx` (Hero, PlatformBreadth-tegels, ProofStrip, FAQ, PricingTeaser-badge)
- `src/app/marketing/Mosaic.tsx` (uitgebreid met `palette`-prop + `MOSAIC_PRODUCT`/`MOSAIC_PEOPLE`/`MOSAIC_PROOF`-constanten)
- `src/app/marketing/marketing.css` (nieuwe tokens/utilities voor het tweevlaks-paneel, hero, mini-mozaïek-tegels, pricing-badge)
- Nieuw: `src/app/marketing/SplitHeader.tsx` (gedeeld tweevlaks-component voor alle binnenpagina-koppen)
- `src/app/marketing/platform/page.tsx`
- `src/app/marketing/pricing/page.tsx`
- `src/app/marketing/contact/page.tsx`
- `src/app/marketing/about/page.tsx`
- `src/app/marketing/resources/f-val/page.tsx`
- `src/app/marketing/features/[slug]/page.tsx`
- `src/app/marketing/solutions/[slug]/page.tsx`

# Bestanden die ik NIET aanraak

- `src/app/marketing/security/page.tsx`, `privacy/page.tsx`, `terms/page.tsx` — nog in review bij Erik (PR #161), niet aanraken tot dat traject is afgerond
- Founder-foto / Oplossingen-screenshots (Fase H4) — wacht op assets van Erik, aparte task later
- App-brede kleurmigratie (`#1FD1B2` → `#07E5AB`) — bewust gescopte, aparte design-system-migratie, blijft buiten deze task
- `src/app/marketing/layout.tsx` — nav/footer bleven ongemoeid, niet nodig voor deze compositie-herziening

# Smoke test plan

1. Playwright: screenshot homepage (desktop 1440 + mobiel 390) — verifieer tweevlaks-hero rendert correct, geen overlappende lagen, mosaic vult het rechterpaneel ✅
2. Playwright: screenshot elke binnenpagina met de nieuwe compacte header — verifieer kleur-familie klopt per pagina-type ✅
3. Playwright: screenshot platform-grid + F-VAL-pijlers + pricing-FAQ — verifieer mini-mozaïek-tegels, chevron ✅
4. `npx tsc --noEmit` en `npm run lint` beide 0 errors ✅
5. Visuele eindcontrole op localhost vóór PR ✅ — herhalen op productie na merge

# Risico's

- Kleur-familie-regel kan op sommige pagina's ambigu zijn (bv. F-VAL: product óf bewijs?) — besluit: F-VAL + de "Merk-check & inzichten"-featurepagina zijn samen "bewijs" (mint/lime), de overige 6 features zijn "product" (blauw/mint)
- SSR-veiligheid: **gemitigeerd door de bestaande SVG-`Mosaic`-component te hergebruiken** (uitgebreid met een `palette`-prop) i.p.v. een nieuwe canvas-gebaseerde renderer te introduceren — geen nieuw hydration-risico

# Out of scope

- Fase H4 (founder-foto, Oplossingen-screenshots) — aparte task zodra assets er zijn
- Security/Privacy/Terms-pagina's — apart traject (PR #161)
- App-brede kleurmigratie

# Notes

Basis: goedgekeurd analyse+verbeterplan-artifact "grafische-review-v2" (16 juli 2026), inclusief het door Erik aangedragen tweevlaks-paneel-referentiebeeld. Erik's akkoord: "voer het uit; akkoord" (16 juli 2026).

Implementatie week af van het oorspronkelijke idee in het artifact-mockup (canvas-gebaseerde mozaïek): de site heeft al een beproefde, SSR-veilige SVG-`Mosaic`-component — die is uitgebreid met een `palette`-prop i.p.v. een nieuwe renderer te bouwen. Robuuster, geen nieuw hydration-risico, minder code.

`brand-alignment`-featurepagina is heringedeeld van de productfamilie naar de bewijsfamilie (mint/lime, zelfde als F-VAL) — inhoudelijk kloppender: beide gaan over het meetbaar maken van merk-fideliteit, geen toevallige paginalocatie.
