---
id: brand-md-open-standaard
title: brand.md omarmen — referentie-implementatie + full profile + gratis generator
fase: launch
priority: now
effort: ±2-3 dagen (herzien v2; excl. Eriks strategie-akkoord + outreach)
owner: claude-code
status: open
created: 2026-08-02
completed: -
related-adr: docs/adr/2026-07-17-public-brand-api.md
related-spec: docs/marketing/brand-md-launch-plan-2026-08-02.md (v2, incl. Bijlage A veldmapping) + docs/reports/100k-plan-fasering-2026-07-20.md (Fase 4) + docs/reports/concurrentieanalyse-2026-08-02.md
worktree: branddock-brand-md-open-standaard
---

# Probleem

> **Herzien 2026-08-03 (v2)**: onderzoek wees uit dat `brand.md` al bestáát als open standaard — Caio Pizzol (Head of DX, SuperDoc), site thebrand.md, GitHub `caiopizzol/brand.md`, spec v0.2 (draft), MIT, ~19 stars/15 commits, tooling beperkt tot een Claude-plugin met interview-generator. Pitch woordelijk gelijk aan ons v1-plan ("Like AGENTS.md for coding agents, brand.md gives AI tools your brand context"). Daarnaast een groeiend veldje varianten (brandbook.md, brandkit.md, brand-guidelines.md). De strategie is daarom gewijzigd van "eigen standaard lanceren" naar **omarmen + compatibele superset**: geen fragmentatie, wel het zwaartepunt worden via de beste tooling en de enige levende, gevalideerde implementatie.

De markt convergeert op "machine-readable brand context voor AI-agents" (Frontify MCP live; het brand.md-varianten-veldje). Wie het referentiepunt wordt, wint de agent-era. Branddock heeft daarvoor het beste uitgangspunt (context-stack, F-VAL, 17 MCP-tools + REST + extensie + n8n + Claude Skill, credit-vrij merk-DNA) maar minder distributie. Op user-directive van 2026-08-02 is dit de hoogste bouw-prioriteit; volledige strategie en golfplan in `docs/marketing/brand-md-launch-plan-2026-08-02.md` (v2).

# Voorstel

Adopteer de bestaande brand.md v0.2-spec als kern en maak Branddock de referentie-implementatie, met een compatibel **"full profile"** als superset (veldmapping: launch-plan Bijlage A). Zes onderdelen:

1. **Emitter i.p.v. nieuwe serializer** — hergebruik de bestaande design-system-exportlaag: nieuwe `brandmd`-emitter naast `designmd`/`brand-brief` in `src/lib/export/design-system/emitters/`, geregistreerd in het Export Format Registry (`export-formats.ts`), op het bestaande canonieke `DesignSystemModel` + resolver. Kern (Strategy/Voice/Visual, upstream-conform) + full-profile-secties (`## Audience`/personas, `## Products & Services`, `## Channel Tones`, gestructureerde `## Guardrails`) + frontmatter-blokken `provenance:`, `validation:`, `locales:`. Publiek profiel bevat nóóit concurrenten/OKR's/trends (die alleen in het extended/private profiel achter MCP-auth).
2. **Workspace-export**: UI-knop + REST-endpoint + MCP-tool; levende versie met gevulde `validation:`/`provenance:` (canonical-URL = de lead-loop).
3. **Gratis generator**: website-URL → brand.md via de bestaande scan-pipeline, zonder account (rate-limited, e-mail-gate na N runs); niet-zekere velden gemarkeerd `unvalidated`.
4. **Validator** (npm CLI + web): valideert upstream v0.2-kern én full profile; basis voor de "brand.md ready"-badge.
5. **Landingspagina** (EN + NL): uitleg, generator-CTA, full-profile-documentatie, ruimhartige links naar de upstream-spec.
6. **Upstream-PR-pakket** (met werkende tooling als bewijs): Audience-sectie, `provenance:`, gestructureerde guardrails.

# Acceptatiecriteria

- [ ] **Erik-gate vooraf**: akkoord op de omarm-strategie (launch-plan v2 §3/§9) + outreach-toon richting maintainer
- [ ] Elk gegenereerd bestand valideert tegen de upstream v0.2-kernspec (gepinde versie, door de eigen validator aantoonbaar)
- [ ] Full-profile-documentatie online (≤2 pag.) met conformance-tekst + minimaal 2 voorbeeldbestanden
- [ ] Iedere workspace kan exporteren als full-profile brand.md (UI-knop + REST-endpoint + MCP-tool), met gevulde `validation:` en `provenance:` incl. canonical-URL
- [ ] Gratis generator: website-URL in → brand.md uit, zonder account verplicht (rate-limited), onzekere velden `unvalidated`
- [ ] Validator gepubliceerd (npm + web) en gebruikt in CI van de generator
- [ ] Publiek/privaat-scheiding afgedwongen: publiek profiel bevat geen concurrenten/OKR's/trends
- [ ] Upstream-PR's #1-#3 ingediend (accept is geen criterium — buiten onze controle)
- [ ] `npx tsc --noEmit` 0 errors
- [ ] `npm run lint` 0 errors
- [ ] Smoke-test uitgevoerd
- [ ] Documentatie bijgewerkt (changelog + roadmap-status)

# Bestanden die ik aanraak

> Geconcretiseerd 2026-08-03 na inventarisatie van de bestaande exportlaag (die er al grotendeels ligt):

- `src/lib/export/design-system/emitters/brandmd.ts` — **nieuw**: de brand.md-emitter (kern v0.2 + full profile), naar het patroon van `designmd.ts` (deterministisch, snapshot-getest); public/private-variant als parameter
- `src/lib/export/design-system/canonical.ts` + `resolver.ts` — uitbreiden waar het model velden mist die brand.md nodig heeft (o.a. persona-JTBD, channel tones, `validation:`-status uit `BrandAsset.status`/coverage, `provenance:`)
- `src/features/brandstyle/utils/export-formats.ts` — registry-entry `brandmd` (label "brand.md", consumers: elke AI-agent/Claude/ChatGPT/Cursor/n8n, status ready) + UI-ordening: brand.md wordt het primaire markdown-formaat
- `src/app/api/export/design-system/[format]/route.ts` — format `brandmd` toevoegen (zelfde endpoint-conventie)
- Website-scan-route (bestaande scan-pipeline) — generator-variant zonder workspace, zelfde emitter met `unvalidated`-markers op onzekere velden
- MCP-server + REST v1 (`docs/adr/2026-07-17-public-brand-api.md`-oppervlak) — read-only tool/endpoint die dezelfde emitter-output serveert; extended/private profiel alleen achter auth
- Marketing-site — landingspagina + full-profile-docs
- Nieuw klein package voor de validator (npm)

# Bestanden die ik NIET aanraak

- Prompt-/chain-laag (`src/lib/ai/` prompts) — de gesloten moat wordt nooit via export geëxposeerd (ADR public-brand-api)
- Billing/credits — export en generator zijn per pricing-ADR credit-vrij; geen metering-wijzigingen

# Smoke test plan

1. Exporteer full-profile brand.md vanuit de Better Brands-workspace → valideert tegen upstream v0.2-kern én full profile; bevat voice/style/personas/producten + gevulde `validation:`/`provenance:`
2. Draai de gratis generator op een externe website-URL → geldig bestand zonder ingelogde sessie, onzekere velden `unvalidated`
3. Controleer publiek/privaat: publiek bestand bevat géén concurrenten/OKR's/trends; extended profiel via MCP mét auth wel
4. Vraag het bestand op via MCP-tool en REST-endpoint → identieke inhoud
5. Voer het bestand aan Claude/ChatGPT en vraag om on-brand copy → merkcontext (incl. persona-taal) wordt aantoonbaar gebruikt
6. Draai de validator op een bestand van de upstream-repo (hun voorbeeld) → valideert als kern zonder full-profile-velden

# Risico's

- **Maintainer wijst PR's af of reageert niet** → geen blocker: full profile is additief-compatibel en bestaat onafhankelijk; fork-vanuit-kracht blijft terugvaloptie (MIT), nooit als startpunt
- **Spec verandert onder ons** → kern-versie pinnen per generator-release; validator rapporteert de gevalideerde versie
- **Iemand anders bouwt de URL-generator eerst** → de positie is vrij maar zichtbaar; snelheid is de mitigatie — daarom staat deze taak vooraan
- **Gratis generator wordt scrape-doelwit / kostenlek** → rate-limiting + bestaande scan-pipeline (geen nieuwe AI-kosten-paden) + fail-fast caps; Apify-fallback alleen waar de gewone scrape faalt
- **Kwaliteitsrisico**: magere scan → mager bestand → `validation: unvalidated` per veld + zichtbaar upgrade-pad naar workspace
- **Privacy/moat-lek**: publiek/privaat-scheiding is acceptatiecriterium; review-checklist in de PR

# Out of scope

- Fork van de spec (alleen bij vastgelopen stewardship én blokkerende spec — besluit van Erik, vanuit kracht)
- Governance-/werkgroep-stap (pas bij ≥3 externe consumers, launch-plan §9.6)
- Witlabel-klantrapport (€100k-plan Fase 5) · agent-LP's/EN-site-breed (Fase 3/8)
- brand.md-*import*-flow (andermans bestand als workspace-seed) — kandidaat-follow-up, past goed bij de omarm-strategie
- Directory + badge-programma (launch-plan golf 2, pas bij >50 bestanden)

# Notes

- **Bestaande exportlaag (inventarisatie 2026-08-03)** — de fundering ligt er al: Export Format Registry met 7 formaten waaronder werkende `designmd`- (Google Stitch) en `brand-brief`-emitters ("AGENTS.md-style, om als BRAND.md in je repo-root te droppen" — feitelijk een proto-brand.md met 12 assets + personas + concurrenten), canoniek `DesignSystemModel` + resolver + linter, brand-kit-ZIP ("Claude Design compatible"), workspace-JSON-export. De brand.md-emitter is dus een inpas-klus in een bewezen patroon, geen greenfield.
- **Productbeslissing bij bouw**: relatie brand-brief ↔ brand.md. Aanbeveling: brand.md wordt het primaire/standaard markdown-formaat (publiek profiel, standaard-conform, zónder concurrenten); brand-brief blijft bestaan als "extended agent brief" voor privégebruik (bevat wél concurrenten — mag nooit de publieke variant worden) en verwijst in zijn header naar brand.md. Later evt. samenvoegen.
- **`validation:` is direct vulbaar**: `BrandAsset.status` + coverage-% en de F-VAL-infrastructuur leveren de statussen zonder nieuw werk — de levende-implementatie-claim is dag één waar.

- **Strategie + golfplan + veldmapping**: `docs/marketing/brand-md-launch-plan-2026-08-02.md` (v2, 2026-08-03) — Bijlage A is de bouwspecificatie voor de serializer
- Aanleiding + marktonderbouwing: `docs/reports/concurrentieanalyse-2026-08-02.md` §4.2 en §6 (aanbeveling 2)
- Oorspronkelijke scope-omschrijving: `docs/reports/100k-plan-fasering-2026-07-20.md` Fase 4 (v1, achterhaald op het punt van de eigen standaard-claim)
- Strategische fit: "je betaalt voor wat je maakt, niet voor dat wij je merk kennen" — een open merkbestand is de geloofwaardige verlenging daarvan; dat het formaat niet van ons is, versterkt het neutraliteits-argument richting tool-bouwers
- Watchlist: thebrand.md + varianten-veldje (brandbook.md, brandkit.md, brand-guidelines.md) opnemen in Competitors-monitoring; growonrepeat.com als tier-3-ruis (chat 2026-08-03)
