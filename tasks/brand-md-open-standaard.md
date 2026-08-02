---
id: brand-md-open-standaard
title: brand.md als open standaard — spec + gratis generator + export + serving
fase: launch
priority: now
effort: ±2 dagen (scope €100k-plan Fase 4; excl. Eriks positionering-akkoord)
owner: claude-code
status: open
created: 2026-08-02
completed: -
related-adr: docs/adr/2026-07-17-public-brand-api.md
related-spec: docs/reports/100k-plan-fasering-2026-07-20.md (Fase 4) + docs/reports/concurrentieanalyse-2026-08-02.md
worktree: branddock-brand-md-open-standaard
---

# Probleem

De markt convergeert op "machine-readable brand context voor AI-agents": Frontify heeft al een eigen MCP-server live en publiceert actief over machine-readable brand governance; Markolé en ShopOS bewegen dezelfde kant op. Wie de standaardbron van merkcontext voor AI-agents wordt, wint de agent-era — en Branddock heeft daarvoor een beter uitgangspunt (bredere toolset: 17 MCP-tools + REST + browser-extensie + n8n + Claude Skill, plus het "merk-DNA is credit-vrij"-prijsmodel dat een open standaard geloofwaardig maakt) maar minder distributie. Het `brand.md`-initiatief stond als Fase 4 in het €100k-plan; op user-directive van 2026-08-02 is het naar voren gehaald als hoogste bouw-prioriteit, n.a.v. de concurrentieanalyse (`docs/reports/concurrentieanalyse-2026-08-02.md`).

# Voorstel

Definieer en publiceer het open bestandsformaat `brand.md` (zo geeft elk merk zijn merk-DNA aan elke AI-agent), maak Branddock de referentie-implementatie en bouw de gratis instap eromheen. Vier onderdelen: (1) publieke specificatie (open licentie, voorbeelden, versienummer); (2) export vanuit elke workspace — één klik genereert een geldig `brand.md` uit het bestaande merk-DNA, ook via MCP/REST op te vragen; (3) gratis generator als lead-magnet — website-URL → eerste `brand.md` via de bestaande website-scan (sluit aan op €100k-plan Fase 3); (4) landingspagina die de standaard uitlegt. Elk gegenereerd bestand verwijst naar Branddock als levend fundament (gevalideerd/F-VAL-gedekt exemplaar vereist een workspace).

# Acceptatiecriteria

- [ ] **Erik-gate vooraf**: naamgeving/positionering-akkoord — dit is een publieke standaard-claim (€100k-plan Fase 4-gate)
- [ ] Publieke `brand.md`-specificatie staat online (open licentie, minimaal 2 voorbeeldbestanden, versie 0.x)
- [ ] Iedere workspace kan zijn merk-DNA exporteren als geldig `brand.md` (UI-knop + REST-endpoint + MCP-tool)
- [ ] Gratis generator: website-URL in → `brand.md` uit, via de bestaande scan-pipeline, zonder account verplicht (rate-limited)
- [ ] Landingspagina live met uitleg, spec-link en generator-CTA
- [ ] Elk gegenereerd bestand bevat een verwijzing naar de bron (Branddock) + generatiedatum
- [ ] `npx tsc --noEmit` 0 errors
- [ ] `npm run lint` 0 errors
- [ ] Smoke-test uitgevoerd
- [ ] Documentatie bijgewerkt (changelog + roadmap-status)

# Bestanden die ik aanraak

> Definitieve file-set vaststellen in plan-mode; verwachte ankers:

- `src/lib/` — nieuwe serializer merk-DNA → `brand.md` (hergebruik context-registry / Dynamic Context System)
- Website-scan-route (bestaande scan-pipeline) — generator-variant zonder workspace
- MCP-server + REST v1 (`docs/adr/2026-07-17-public-brand-api.md`-oppervlak) — nieuwe read-only tool/endpoint
- Marketing-site — spec- + landingspagina

# Bestanden die ik NIET aanraak

- Prompt-/chain-laag (`src/lib/ai/` prompts) — de gesloten moat wordt nooit via export geëxposeerd (ADR public-brand-api)
- Billing/credits — export en generator zijn per pricing-ADR credit-vrij; geen metering-wijzigingen

# Smoke test plan

1. Exporteer `brand.md` vanuit de Better Brands-workspace → bestand valideert tegen de spec en bevat voice/style/personas/kernassets
2. Draai de gratis generator op een externe website-URL → geldig `brand.md` zonder ingelogde sessie
3. Vraag het bestand op via MCP-tool en REST-endpoint → identieke inhoud
4. Voer het bestand aan Claude/ChatGPT en vraag om on-brand copy → merkcontext wordt aantoonbaar gebruikt

# Risico's

- **Publieke standaard-claim zonder adoptie oogt leeg** → mitigatie: n8n-nodes, browser-extensie en Claude Skill consumeren het formaat vanaf dag 1 (eigen ecosysteem als eerste adopters)
- **Frontify/anderen claimen de naam of het frame eerder** → mitigatie: dit is precies waarom de taak naar voren staat; spec klein en snel publiceren, itereren in het openbaar
- **Gratis generator wordt scrape-doelwit / kostenlek** → mitigatie: rate-limiting + bestaande scan-pipeline hergebruiken (geen nieuwe AI-kosten-paden), fail-fast caps
- **Kwaliteitsrisico**: een magere scan levert een mager `brand.md` → mitigatie: bestand markeert expliciet welke velden `unvalidated` zijn; upgrade-pad naar workspace

# Out of scope

- Witlabel-klantrapport (€100k-plan Fase 5)
- Agent-landingspagina's / EN-site-breed (Fase 3 en 8 — los oppakbaar)
- Een `brand.md`-*import*-flow (andermans bestand inlezen als workspace-seed) — kandidaat-follow-up
- Governance-orgaan/community-proces rond de standaard — pas relevant bij externe adoptie

# Notes

- Aanleiding + marktonderbouwing: `docs/reports/concurrentieanalyse-2026-08-02.md` §4.2 en §6 (aanbeveling 2)
- Oorspronkelijke scope-omschrijving: `docs/reports/100k-plan-fasering-2026-07-20.md` Fase 4
- Strategische fit: "je betaalt voor wat je maakt, niet voor dat wij je merk kennen" — een open merkbestand is de geloofwaardige verlenging daarvan; Frontify kan dit model moeilijk volgen
