---
id: seo-fase4a-tail-parallel
title: SEO Fase 4a — stap 8 parallel met de variant-B/GEO-staart (dependency-graph-winst)
fase: pre-launch
priority: now
effort: 3-4 uur
owner: claude-code
status: done
created: 2026-07-13
completed: 2026-07-13
related-adr: -
related-spec: tasks/seo-pipeline-speedup.md (§Meting, Fase 4)
worktree: branddock-seo-fase4a-tail-parallel
---

# Probleem

De #387/#388-meting: stap 8 (publication-prep-checklist, snel model, gem. 73s met
spreiding 42-130s) draait sequentieel VÓÓR de staart (variant B + GEO-polish, samen
vermoedelijk ~60-90s aan ongetelde AI-tijd — de nieuwe step:9-timing kwantificeert het).
Maar de staart hangt uitsluitend aan de stap-7-output (`finalContent`): sinds ronde 2 is
stap 8 checklist-only en levert hij géén prose meer. De afhankelijkheid is dus
kunstmatig — pure dependency-graph-verspilling van ~1 minuut per run.

# Voorstel

Herstructureer het slot van `runSeoPipeline`: waves lopen t/m [7]; daarna draaien
**stap 8 en de staart concurrent** — stap 8 ∥ (variant B ∥ GEO-polish-A → GEO-polish-B).
Stap 8 houdt exact dezelfde events/checkpoint/resume-semantiek (start/complete-events,
output+timing in state, checkpoint na afloop); de staart blijft fail-soft zoals nu.
Verwachte winst: ~max-verborgen wordt min(stap 8, staart) ≈ 60-73s van de wall-clock.

**Bewuste, gedocumenteerde input-delta**: variant B krijgt de accumulatedContext
vóórtaan ZONDER het stap-8-checklist-JSON-blok (dat er vandaag wel in zit omdat stap 8
eerder klaar was). Dat blok is mechanische output over variant A — ruis, geen signaal —
en variant B is bovendien bewust de snelle-model-B-optie. Kwaliteitsrisico minimaal;
gevalideerd met een echte prod-run na deploy (visuele sanity + F-VAL indien gescoord).

Fase 4b (checklist in stap 7 mergen óf stap 7 conditioneel skippen — raakt de
premium-prose-stappen) blijft apart en gegate op een F-VAL-A/B.

# Acceptatiecriteria

- [x] Stap 8 en variant-B/polish draaien concurrent; de staart-duur wordt gemeten en gepersisteerd als timing-entry step:10 (via het complete-event) + console-log
- [x] UI-tracker ongewijzigd: 8 stappen, stap-8 start/complete-events, checkpoint na stap 8
- [x] Resume-semantiek intact: een run met stap 8 al in state slaat de call over en hergebruikt de checklist
- [x] Fail-soft intact: stap-8-fout → error-event (zoals de wave-fout vandaag); variant-B/polish-fouten degraderen zoals nu
- [x] `npx tsc --noEmit` 0 errors + lint 0 (gewijzigde files, --quiet)
- [ ] Smoke: prod-run na deploy (volgt in de sessie, ná merge) → wall-clock daalt ~1 min vs #387-baseline; outputs (A/B/checklist) aanwezig en gezond
- [x] §Meting-tabel gecorrigeerd (stap 8 = snel model, niet premium) + resultaat bijgeschreven

# Bestanden die ik aanraak

- `src/lib/ai/seo-pipeline.ts` — waves t/m [7]; concurrent slot voor stap 8 + staart
- `tasks/seo-pipeline-speedup.md`, `docs/changelog.md` — meting/afronding

# Out-of-scope

- Fase 4b (stap 7/8 mergen of conditioneel skippen) — gegate op F-VAL-A/B
- Stap-8-input-trim (de 42-130s-spreiding suggereert context-gevoeligheid; irrelevant zodra stap 8 achter de staart schuilgaat)
- `runner.ts`/`run-jobs` — eigendom agents-scheduling

# Smoke-test

1. tsc/lint + bestaande unit-smokes die de pipeline raken.
2. Prod na deploy (smoke-account): SEO-run → COMPLETED; step:0/8/9-timings uitlezen;
   wall-clock vergelijken met de 12m02-baseline; variant A+B + checklist aanwezig.

# Review (code-reviewer subagent, 2026-07-13)

0 CRITICAL, 2 WARNINGs — verwerkt:
- **W1 (gedocumenteerde trade-off)**: als waves 1-7 samen het 600s-continuation-budget overschrijden, vuurt de budget-return op het stap-8-checkpoint terwijl de staart al loopt — de continuation re-runt de staart en de losgelaten calls draaien detached door (dubbele AI-kosten + dubbele tracking-rijen, géén data-corruptie: de losgelaten generator bereikt de persist nooit). Geaccepteerd: het pad vereist een uitzonderlijk trage run (1-7 gemiddeld ~450s effectief), en de alternatieven zijn slechter (budget-check skippen → 800s-ceiling-risico midden in de persist; abort-plumbing → complexiteit die het edge-geval niet waard is).
- **W2 gefixt**: step:9 betekent sinds 4a het staart-restant ná stap 8 (+persist/charge) — comment bijgewerkt; de échte staart-duur wordt nu apart gemeten in de generator en via het complete-event als **step:10** gepersisteerd, zodat de winst hard aantoonbaar is.
- MINORs: no-op-catch direct na tail-creatie (unhandled-rejection-vangnet in álle paden), resume-input-nuance gedocumenteerd in de code (resume-pad ziet de pre-4a-context), header-comment van het bestand geactualiseerd.
- Reviewer bevestigde expliciet: geen yields uit promise-context, resume/checkpoint correct in alle volgordes, event-volgorde tracker byte-voor-byte gelijk, persist correct, en de stap-7-guard is een verbetering (oude fallback kon checklist-JSON als paginacontent persisten).
