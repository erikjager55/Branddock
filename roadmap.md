# Roadmap — initiatieven-index

> **Peildatum**: 2026-08-10 · **Fase**: launch (app, billing, credits-pilotmodus en pilot draaien live)
> **Leidend voor prioritering is het dashboard**: `docs/dashboard/` (pagina + ritueel in `docs/dashboard/README.md`). Dit bestand is de index per initiatief: status, gates en verwijzingen — geen dagelijkse sturing.
> **Historie**: `docs/changelog.md` (per oplevering) · vorige roadmap incl. volledige log: `docs/archive/old-lists/roadmap-pre-sanering-2026-08-10.md`.

---

## Fase-indeling

| Fase | Definitie | Hard criterium afronding |
|---|---|---|
| **Launch** (huidig) | Livegang afronden: betaling aan, eerste betalende klant, pilots op gang | TOPUP live; eerste betalende klant; 0 P0/P1 in core flows |
| **Post-launch** | Klantenwerving, schaal, Brandclaw-groeistadia | Doorlopend |

Pre-launch is afgerond (app + Stripe live sinds 2026-07-05/06). De oude pre-launch-tracks staan in het archief.

## Prioriteringskader

1. **Dashboard-banen** (leidend): *Nu afmaken* → *Maakt Branddock slimmer* → *Bewust in rust*. Verschuiven tussen banen alleen met reden (zie dashboard-README).
2. **Moat-toets** (visie §5, naast RICE): *versterkt dit de merk-graph, het bewijs (F-VAL/track-record) of de leerlus — of bouwt het kopieerbaar oppervlak?* Oppervlak verliest bij twijfel.
3. **RICE** voor volgorde binnen een baan; gates (evidence/data/go-besluit) gaan altijd vóór schedule.

---

## Initiatieven

### 💳 Launch & billing
Stripe live (#79-#88), credit-model volledig gebouwd (fase 0-6, #369-#386), credits live in pilotmodus sinds 2026-07-10; billing-fase-taken 1-4 done (2026-07-17). **Rest**: TOPUP-schakelmoment (Erik) + betaal-smoke; entitlement-verschillen bewust onafgedwongen tijdens pilot.
→ ADR `2026-07-07-pricing-credits-launch` · `docs/playbooks/stripe-go-live.md` · tasks/done/billing-*

### 🤖 Agents
Fase 1+2 live: 10 persona-agents op één motor, scheduling, inbox, memory (#359-#362, #390-#400). Vera-triggers in Fase-0-concierge (0 events — go/no-go bij Erik). **Convergentie-epic blocked** achter drie pilot-datapunten (adoptie, kosten, no-autonomy-herziening).
→ ADR `2026-07-05-agents-architectuur` · `tasks/agents-brandclaw-convergentie.md` · `tasks/agent-vera-triggers.md`

### 🐾 Brandclaw (autonomie + zelflerend)
Visie v3 canoniek-kandidaat: `docs/specs/brandclaw-vision.md` (organisme, zes groeistadia, drie moats, ontwerp-agenda §10). BC-1 (Bo's weekloop) live 2026-07-18. **Eerstvolgend**: BC-1.5 leerlus-dicht (voorstel, dashboard-stap 4) + ontwerp-documenten 1-2 (Signaalweb-spec, Interpretatie-methodologie — wacht op go).
→ `docs/reports/p36-brandclaw-herijking-2026-07-17.md` · ADR `2026-05-08-brandclaw-agent-architectuur`

### 🔌 MCP & merk-laag (gezicht 2)
**Live in pilotvorm** — sneller dan het oude plan: connector `branddock.app/mcp` (#416), read-tools + `import_brand_data` (#438), connector-pilot-hardening (#445), publieke Brand-API met rate-limiting (#447-#449). Connector-pilot per tester loopt (compen via Credit Admin).
→ ADR `2026-07-17-public-brand-api` · `docs/marketing/p34-agent-ecosysteem-distributie.md` (geabsorbeerd in visie §4)

### ✍️ Content-kwaliteit & leerlus
Test-layers 1+2 + auto-iterate live (mei); learning-loop-capture draait; **de terugkoppeling ontbreekt nog** (Layer 3 data-gated op 0 events; leerlus-dicht = BC-1.5). Content-accessor fase 1 klaar voor merge, fase 2 wacht op 2 productbesluiten.
→ `docs/specs/content-test-improvement-plan.md` · `tasks/content-chain-accessor.md` · `tasks/content-test-regression-7B.md`

### 📈 Groei & meting
KPI-fundament in aanbouw (`tasks/kpi-fase0.md`, €100k-plan): funnel, activatie, noordster-MRR. Marketing-site: homepage-v2 + composition done (2026-07/08); restjes = menswerk (copy-review, screenshots). Onboarding-test met 3 externen open.
→ `docs/reports/100k-plan-fasering-2026-07-20.md` · `tasks/onboarding-flow-test.md`

### 🔬 Competitive intelligence & research
Data-laag + AI-classifier + activities-UI + content-discovery live (mei). Research-stack-taken (Exa/S2 in trend-radar, Marco, GEO) done 2026-08. Fase 2 frameworks-UI conditional op pilot-validatie; monitoring-loop post-launch.
→ `tasks/_drafts/idea-competitive-intelligence-loop.md`

### 🌍 Meertaligheid
Fase 1-3 live (en↔nl, twee-selector-model). 1b (AI-vertaal-engine de/es/fr) post-launch; Fase 4-5 (multi-markt enterprise) blocked/go-no-go.
→ ADR `2026-06-28-multilingual-i18n-and-multi-market-content` · `tasks/multi-market-transcreation-enterprise.md`

### 🔍 GEO/SEO
Fase 1-3 + measurement-followups live (juni); pipeline-speedup meting-gated; rest in `tasks/geo-seo-followup-later.md` (post-launch bucket).

### 🔐 Security & platform
Audit-remediatie compleet t/m LOW (#345-#350, #447-#452, PR's #245-#250). Rest: `tasks/security-residual-hardening.md` (o.a. CSP-enforce-flip) + `tasks/guard-hooks-hardening.md` (wacht op Eriks akkoord). Bekende CI-wond: golden-sets-nightly (zie `tasks/golden-set-gate-decouple.md`).

---

## Later (3-12 maanden — visie-niveau, geen schedule)

Channel activation (Google/Meta Ads, Ayrshare) · externe integraties Tier 1 (Brandfetch, Perplexity Sonar, HubSpot, Slack) · Brand Assistant standalone · campagne-brief-uitbreidingen (KPI/budget/risk) · `fval-iteratie-3` (re-tuning op 3-6 mnd productie-data) · tech-debt (adapter-afbouw, dual-versioning, studio-cleanup) · privacy/DPA + cross-workspace benchmarks. Detail en context: archief-roadmap + `docs/specs/brandclaw-vision.md`.

---

## Cross-references

- Leidend dashboard: `docs/dashboard/` (bron + ritueel + artifact-URL)
- Operating manual: `docs/playbooks/working-flow.md` · runtime-instructie: `CLAUDE.md`
- Taken: `tasks/` · gebouwd: `docs/changelog.md` · beslissingen: `docs/adr/`
