---
id: mcp-external-data-enrichment-research
title: Research — MCP-style externe data-enrichment bij content-generatie
fase: post-launch
priority: research
effort: ~2-3d research, implementatie afhankelijk van scope-keuze
owner: claude-code
status: open
track: B
created: 2026-05-12
completed: -
related-spec: -
worktree: branddock-brandclaw
---

# Achtergrond

Geïnspireerd op Cowork-werkwijze §5.4 + §6: hun marketing-plugin pult bij
`/draft-content` real-time data uit MCP-connectoren (Notion-stijlgids,
HubSpot-campagne, Ahrefs-keywords, Klaviyo-segment) om het concept te
verrijken voordat het AI-model begint te schrijven.

Branddock's huidige canvas-context-stack assembleert alleen interne data
(BrandVoiceguide, Brandstyle, BrandPersonality, Personas, Products,
Competitors). Externe data zoals zoekvolume per keyword, performance van
vorige campagnes, of pricing-context uit CRM ontbreekt op generation-time.

Improvement #9 uit content-test-improvement Cowork-analyse (geplaatst in
Track B research-bucket op 2026-05-12 omdat het Brandclaw-track scope is —
autonome marketing-loop heeft sowieso externe data nodig).

# Research-vragen

1. **Welke externe data is meest-waardevol bij generation?**
   - SEO keywords + zoekvolume (Ahrefs / SEMrush) — voor headline + meta
   - Competitor pricing + recent moves (Brandclaw competitive-tools)
   - CRM lead-status / segment (HubSpot) — voor email/landing variants
   - Performance van vorige campagnes (Google Analytics / Klaviyo opens)
   - Trending topics in industry (X / Reddit / Google Trends)

2. **MCP-server architectuur vs direct API integration?**
   - MCP-protocol = decoupled, multi-server, OAuth-flow per server
   - Direct API = simpeler, geen extra abstractielaag, snellere iteratie
   - Cowork-pattern: MCP voor flexibiliteit (placeholder ~~SEO mapped
     naar Ahrefs of SEMrush of Moz afhankelijk van workspace-config)

3. **Welke MCP-servers eerst?**
   - Quickest win: HubSpot (al een task in Track C voor stripe-billing
     dus credentials-mgmt al deels gebouwd)
   - Highest value: Ahrefs (SEO-data direct verbeterd door real-time
     keyword + competitor data)
   - Strategic: Notion (sommige klanten houden brand-docs daar)

4. **Latency-budget?**
   - Huidige generation duurt 15-30s voor blog (text only)
   - MCP-calls toevoegen voegt 2-5s toe per server-call
   - Acceptable tot ~45s totaal; daarna verliest user-momentum

5. **Caching-strategie?**
   - Keyword data: per workspace 24h cache (zoekvolume verandert traag)
   - Competitor data: 6h cache (mogelijk dagelijks refresh via Brandclaw
     polling-jobs)
   - CRM-segments: real-time (geen cache)

# Deliverables (research-fase)

- [ ] ADR `docs/adr/2026-XX-XX-mcp-vs-direct-integration.md` over MCP vs
      direct-API + decision-tree per data-source
- [ ] Latency-benchmark: instrument 3 candidate-sources (Ahrefs,
      HubSpot, Google Trends) met `Date.now()` rond hun API-calls; meet
      p50/p95 over 20 calls
- [ ] Workspace-config schema-uitbreiding voorstel voor MCP-server
      mappings (placeholder → server-URL + OAuth-status)
- [ ] Implementatie-plan: welke endpoint(s) zouden enrichment-data
      lezen + injecteren in canvas-context-stack vóór prompt-build?

# Beslissing-trigger

Pilot-feedback van eerste 5 klanten: vragen ze om SEO-data integration?
Brandclaw-tool-orchestrator landing in Track B markt deze ook af
(competitor-tools draaien daar dezelfde polling-infra).

# Cross-references

- Cowork-werkwijze document 2026-05 §5.4 + §6 (MCP-connectoren)
- `tasks/brandclaw-tool-orchestrator.md` (foundation infra die deze
  research kan hergebruiken voor polling-jobs en credentials-mgmt)
- `tasks/strategy-analyst-stub.md` (Phase B: competitor-data infra)

# Notes

Pre-launch out-of-scope. Eerste 5 pilot-klanten draaien op interne
context-only (Branddock voiceguide + brandstyle + competitors). Externe
data komt na pilot-feedback en na infra-foundation (Track B sprint #6+).

**2026-06-19**: deze task is de **client-helft** van de bredere
`mcp-integration-layer` (post-launch, zie `roadmap.md`). De server-helft
(Branddock blootstellen aan externe apps) is daar als M0/M2/M3 toegevoegd;
deze research = fase M1. Besluit: hele MCP-laag geparkeerd tot na launch.
