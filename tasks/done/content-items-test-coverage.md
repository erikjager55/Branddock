---
id: content-items-test-coverage
title: Test coverage 53 content-types (Ronde 1 + Ronde 2)
fase: pre-launch
priority: now
effort: 1d representanten + 2-3d full sweep + bugfix-cluster variabel
owner: claude-code + user (UI-manual)
status: done
created: 2026-05-12
started: 2026-05-13
completed: 2026-07-07
related-adr: -
related-spec: docs/playbooks/testplan-content-items.md
worktree: branddock-content-ronde1 (fix/content-items-ronde1)
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

- [x] Ronde 1 representanten: 4/8 passed via picker (blog-post/linkedin-post/search-ad/landing-page) + 4/8 hidden-skip (newsletter/press-release/explainer-video/one-pager), bug-log gepopuleerd — 2026-07-01, 0 bugs
- [x] Ronde 1 varianten: 16/16 zichtbare varianten passed op Napking (2026-07-01), 0 bugs — reachability vooraf hard-geverifieerd
- [x] Summary-tabel (sectie 6) ingevuld: 24/24 zichtbaar getest, 23 passed, 1 bug (ebook) — 2026-07-01
- [x] Alle P1+P2 bugs gefixt of expliciet als post-launch gedeferd met rationale — ebook-bug gefixt (`fe95fef9` e-book quality bundle); 0 andere P1/P2; 3 structuur-leen-observaties doorgeschoven als post-launch content-nit
- [x] `gotchas.md` bijgewerkt met nieuwe lessen die uit testen kwamen — n.v.t.: 0 nieuwe bugs in de sweep; effie-leak (2026-05-17) + ebook-lessen waren al gedekt
- [ ] Ronde 2 generator-evaluatie matrix ingevuld — **DEFERRED (post-launch)**: gated op asset-generator-integratie (aparte/toekomstige task)

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

**2026-05-17 — Tussentijdse STOP-GATE genomen**: P2 [shared-pipeline] effie-waardig leak gefixt (commit `e849a1ed`). Defense-in-depth (prompt-guard + output-sanitizer) toegepast in `campaign-strategy.ts` / `campaign-strategy-agents.ts` / `strategy-chain.ts` / `creative-angles.ts` / `quick-concept/route.ts` + nieuwe utility `src/lib/ai/sanitize-strategy-output.ts` (30/30 smoke-test groen). Verificatie loopt mee met de reguliere Ronde 1 sweep — per representant DOM grep `document.body.innerText.match(/effie/gi)` → moet `null` zijn op de Strategy-step rationale-veld. Als bij een type alsnog "effie" verschijnt: leak-vector niet afgevangen, log in bug-log met type + UI-locatie + voorbeeld-text. Zie `gotchas.md` 2026-05-17 (internal-rubric leak) + bug-log entry sectie 5 voor details.

**2026-07-01 — Ronde 1 representanten AFGEROND (gecorrigeerd)**: pre-flight audit (3 parallelle prompt-path audits + 2 DB-geverifieerde precondities) → handmatige sweep op Napking. **4/8 passed via picker, 0 bugs**: blog-post, linkedin-post, search-ad, landing-page. Effie-fix runtime-herbevestigd (grep=null op linkedin-post Strategy); landing-page SEO-bracket-P1 niet opgetreden. **4/8 hidden-skip** — hun categorieën zijn **bewust** uit de Add-Content-picker gehaald (per user bevestigd 2026-07-01): newsletter (Email & Automation), press-release (PR/HR/Comms), explainer-video (Video & Audio), one-pager (Sales Enablement). Correctie: explainer-video + one-pager stonden eerst abusievelijk als PASSED (audit-miss: agent-3 zag de hidden-flag niet + niet echt via picker getest) — ingetrokken. **Picker-realiteit**: 31 van 55 code-type-definities zijn hidden; slechts 24 zichtbaar in 4 categorieën (Long-Form 8, Social Media 5, Advertising & Paid 6, Website 5). De 53-type-testplan-matrix (§4) is grotendeels achterhaald. **Nog open**: Ronde 1 varianten = de **~16 resterende zichtbare types** (NIET 45) + Ronde 2 → status blijft `in-progress`. Werk op worktree `branddock-content-ronde1` / branch `fix/content-items-ronde1` (vanaf main; i18n-werk in hoofdworktree onaangeroerd, draait in aparte sessie).

**2026-07-01 — Ronde 1 varianten AFGEROND → RONDE 1 COMPLEET**: 16/16 zichtbare varianten passed op Napking, 0 bugs. Reachability vooraf hard-geverifieerd (alle 16 resolven via `CONTENT_TYPE_TO_MEDIUM` × seed/fallback). 3 structuur-leen-observaties (product-page/social-ad/linkedin-article renderen met geleende component-structuur) = content-kwaliteit-nit voor post-launch, geen blocker. **Totaal Ronde 1: 24/24 zichtbare types getest, 23 passed, 1 bug (ebook — apart verbeterplan).** Enige resterende acceptance = **Ronde 2 generator-evaluatie**, die **gated is op asset-generator-integratie** (aparte/toekomstige task) → status blijft `in-progress` maar de pre-launch content-test-coverage is functioneel klaar. Kandidaat voor task-finalize met Ronde 2 expliciet deferred.

**2026-07-07 — GEFINALISEERD (lichte finalize, geen code-diff)**: het volledige Ronde 1-werk stond al op `main` (playbook #67 `23e0c0e5` + ebook-fix-bundel `fe95fef9`), dus geen 2-subagent code-review nodig — dit was een status/doc-afronding. Task → `tasks/done/`, changelog #366. Ronde 2 blijft gated op asset-generator-integratie. De worktree `branddock-content-ronde1` / branch `fix/content-items-ronde1` is al opgeruimd.
