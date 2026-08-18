---
id: geo-seo-followup-later
title: GEO/SEO opvolg — entity-reinforcement + restschema + deploy-verificatie (later)
fase: post-launch
priority: later
effort: onbekend (gefaseerd)
owner: claude-code
status: open
created: 2026-06-24
completed: -
related-adr: docs/adr/2026-06-17-geo-seo-optimization-goals-field.md
related-spec: docs/specs/2026-06-17-geo-seo-longform-plan.md
worktree: -
---

# Probleem

Een verzameling bewust-uitgestelde GEO/SEO-restpunten met lage urgentie of een harde externe dependency, samengebracht zodat de fase-tasks konden sluiten. Geen daarvan blokkeert launch.

# Voorstel

Per sub-item los oppakken wanneer de trigger zich voordoet (zie per item). Geen big-bang; splits een sub-item af naar een eigen task zodra het concreet wordt.

# Acceptatiecriteria

- [ ] **Externe entity-reinforcement** (Fase 3): GEO-content versterken met externe entity-bronnen (Wikidata/G2/Reddit) voor sterkere citeerbaarheid — eigen scoping/ADR, post-launch
- [ ] **Live AI-crawler-citation-meting** (Fase 3): meten óf een AI-antwoordmachine de pagina daadwerkelijk citeert (nu alleen de deterministische data-haak) — research + bron-keuze
- [~] **Restschema Fase 1a**: `BreadcrumbList` — ⚠️ **de trigger IS gevuurd** (audit 18-08). De
      marketing-site heeft inmiddels hiërarchie: `/marketing/features/[slug]`,
      `/marketing/solutions/[slug]`, `/marketing/vergelijk/[slug]`. Bewust níet gebouwd:
      die pagina's liggen bij `marketing-site-verbeterslag` (andere sessie). Wie dat oppakt
      kan `BreadcrumbList` in één moeite meenemen. `howToSchema`-wiring blijft lage waarde.
- [x] **Deploy-time browser-smoke** — ✅ **2026-08-18 gebouwd en gedraaid tegen productie**:
      `npm run smoke:published-page-prod` → **12/12** op `linfi.branddock.app`.

      ⚠️ **De les zit in de vertraging, niet in de smoke.** De blocker (`vercel-deployment`)
      verdween op **2026-07-05**; dit item bleef daarna 44 dagen staan. In die periode is
      precies de bug geland die deze smoke had gevangen: gepubliceerde pagina's hadden
      **géén `<title>`** (changelog #477), gevonden bij toeval tijdens CSP-werk op
      `linfi.branddock.app/pillar-page`. Een uitstel met een reden hoort een trigger te
      hebben, en een trigger die niemand aftikt is geen trigger — zie de gotcha van 16-08.

      De smoke draait mét een **controleroute** (`/reset-password`, zonder eigen metadata):
      die hoort de geërfde default `Branddock` te tonen. Zonder die tweede meting kan
      "er staat een titel" ook betekenen dat je naar de default kijkt, en dát onderscheid
      wás de bug.
- [x] **Nightly/cron staleness-recompute**: functioneel vervangen op agent-niveau door de SEO/GEO-watchdog-agent (`tasks/done/agent-seo-watchdog.md`, 2026-07-14) — scheduled scan herberekent staleness + 4 andere vervalsignalen en rapporteert push-based

# Bestanden die ik aanraak

- Per sub-item te bepalen bij oppakken (geen vooraf-scope; dit is een staging-bucket).

# Bestanden die ik NIET aanraak

- n.v.t.

# Smoke test plan

- Per sub-item bij uitvoering; deze task is een tracker, niet één uitvoerbare eenheid.

# Risico's

- Bucket-task — splits een sub-item af naar een eigen task zodra het concreet wordt opgepakt (anders scope-vervaging).

# Out of scope

- De zichtbaar-maken/activeren-laag → `geo-seo-followup-measurement-dashboard`
- Live-AI E2E (lokaal, nu) → `geo-seo-followup-live-ai-e2e`

# Notes

- Opgetild uit Deferred/Out-of-scope van `tasks/done/geo-seo-fase1a-*` + `-fase3-*` op 2026-06-24.
- `BreadcrumbList`/`howToSchema` waren al in Fase 1a als "deferred, lage waarde" gemarkeerd; deploy-smoke is hard geblokkeerd op `vercel-deployment`.
