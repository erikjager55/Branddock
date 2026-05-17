---
id: content-items-test-coverage
title: Test coverage 53 content-types (Ronde 1 + Ronde 2)
fase: pre-launch
priority: now
effort: 1d representanten + 2-3d full sweep + bugfix-cluster variabel
owner: claude-code + user (UI-manual)
status: in-progress
created: 2026-05-12
started: 2026-05-13
completed: -
related-adr: -
related-spec: docs/playbooks/testplan-content-items.md
worktree: -
---

# Probleem

`docs/playbooks/testplan-content-items.md` (446 regels, 2026-04-24) definieert een afvinkbaar test-coverage plan voor alle 53 deliverable types in content mode. **0/53 vakjes gecheckt**. Pilot-klanten kunnen elk type kiezen — onbekende bugs in 5-10 types = onbekende pilot-failures.

Het testplan is een playbook (documentatie) maar geen task-file. Daardoor stond het niet op roadmap NOW pipeline en is het uit het zicht geraakt tijdens BCP Phase 2 + side-iteraties.

# Voorstel

3-fasen aanpak conform het bestaande playbook:

1. **Ronde 1 representanten (~1d)** — 8 representanten testen (1 per categorie): blog-post / linkedin-post / search-ad / newsletter / landing-page / explainer-video / one-pager / press-release. Test 6-staps flow: Setup → Knowledge → Strategy → Concept → Content (3 varianten) → Canvas (edit + preview + submit + approve + export).

2. **Ronde 1 varianten (~2d)** — 45 varianten testen, focus op categorie-specific checks per playbook sectie 4. Bug-log per `[type] [stap] severity: beschrijving → verwachte fix`.

3. **Bugfix-cluster (variabel)** — P1 (blokkeert) en P2 (content onbruikbaar) bugs uit log fixen. P3 (UX-nits) optioneel als laatste sprint #5-6 fill-in.

4. **Ronde 2 generator-evaluatie (~1d, na nieuwe asset-generators)** — per type vastleggen welke generator (GPT-image-2 / Claude HTML→PNG / huidige) de beste output levert. Sectie 4.5 in playbook.

# Acceptatiecriteria

- [ ] Ronde 1 representanten: 8/8 types gecheckt, bug-log gepopuleerd
- [ ] Ronde 1 varianten: 45/45 types gecheckt
- [ ] Summary-tabel (sectie 6) ingevuld: per categorie tested/passed/bugs
- [ ] Alle P1+P2 bugs gefixt of expliciet als post-launch gedeferd met rationale
- [ ] `gotchas.md` bijgewerkt met nieuwe lessen die uit testen kwamen
- [ ] Ronde 2 generator-evaluatie matrix ingevuld (kan later na asset-generator integratie)

# Bestanden die ik aanraak

- `docs/playbooks/testplan-content-items.md` — boxes checken + bug-log + summary
- `gotchas.md` — lessen die uit testen komen
- Variabel: bugfix-files volgen uit gevonden P1/P2 issues

# Bestanden die ik NIET aanraak

- Code-architectuur — alleen targeted bugfixes vanuit playbook, geen refactor-scope-creep
- Andere content-types die niet in playbook staan (legacy types, deprecated flows)

# Smoke test plan

Het playbook IS het smoke-test plan. Per type:
1. Open Create Content op Napking workspace (brand foundation gevuld, NL)
2. 6-staps flow doorlopen
3. Check passed/failed/bugs per criteria in playbook sectie 2

# Risico's

- **Volume**: 53 types × 6 stappen ≈ 3-4 dagen handwerk. Lange feedback-loop.
- **Bugfix-zwarte-gat**: P1 bug op shared code-pad blokkeert hele categorie. Mitigatie: fix vóór door te gaan, bug-log per categorie als hint of issue shared.
- **Bug-overlap**: zelfde bug op N types verspilt tijd. Mitigatie: na elk representant + categorie-bug pause, fix vóór varianten.

# Out of scope

- Refactor van bestaande implementatie buiten gevonden bugs
- Performance-tuning (apart post-launch werk)
- Asset-generator integratie zelf (vereiste voor Ronde 2 — separate task)
- Geautomatiseerde Playwright-suite (manual eerst, automatiseren post-launch)

# Notes

**Test-workspace**: Napking (brand foundation gevuld, `contentLanguage = nl`, naam = `Napking`). Persona + product + brand asset klaar als knowledge-selectors.

**Parallel-run protocol** (gestart 2026-05-13):
- **Sessie 1** — Long-Form Content (7 types, R: `blog-post`). Hoofdbrowser-profile.
- **Sessie 2** — Social Media (13 types, R: `linkedin-post`). Tweede browser of incognito-window om Zustand store + localStorage state-conflict te vermijden (zie regressie-hotspot `gotchas.md` 2026-04-19 stale-state cleanup).
- Beide rondes in zelfde Napking-workspace maar **aparte campaign-instances** — Strategy/Concept-state hangt aan campaign-id dus geen kruisbevuiling zolang het verschillende campaigns zijn.
- Bug-log: één gedeelde sectie 5 in `docs/playbooks/testplan-content-items.md`, per entry duidelijk type-prefix (`[blog-post]` vs `[linkedin-post]`).
- Cross-bug sync-point: na elk representant pauze, bug-log openen om duplicaten/shared-code-paden te herkennen (P1-cluster signal voor STOP-GATE).

**Bug-severities** (per playbook sectie 5):
- **P1**: blokkeert (flow stopt, error-toast, crash)
- **P2**: content onbruikbaar (output is leeg, placeholders, verkeerde taal)
- **P3**: UX-nit (style-issue, kleine copywriting-fout)

**STOP-GATE eind sprint #4**: na 8 representanten een bug-log review. Bepaalt sprint #5 bugfix-scope + of varianten parallel kunnen of bugfix-eerst nodig is.

**2026-05-17 — Tussentijdse STOP-GATE genomen**: P2 [shared-pipeline] effie-waardig leak gefixt vóór representanten-testen wordt hervat. Defense-in-depth (prompt-guard + output-sanitizer) toegepast in `campaign-strategy.ts` / `campaign-strategy-agents.ts` / `strategy-chain.ts` / `creative-angles.ts` + nieuwe utility `src/lib/ai/sanitize-strategy-output.ts` (24/24 smoke-test groen). Re-test linkedin-post Strategy-step in Napking single-content-mode om fix te verifiëren vóór door te gaan met overige 7 types. Zie `gotchas.md` 2026-05-17 (internal-rubric leak) + bug-log entry sectie 5 voor details.
