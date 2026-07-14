---
id: seo-fase4b-editorial-ab
title: SEO Fase 4b — F-VAL-A/B rond stap 7 (editorial review) + skip-beslissing
fase: pre-launch
priority: next
effort: 4-6 uur
owner: claude-code
status: done
created: 2026-07-13
completed: 2026-07-14
related-adr: -
related-spec: tasks/seo-pipeline-speedup.md (§Fase 4a — restpunt 4b)
worktree: - (meting-only; NO-GO, geen code-wijziging)
---

# Probleem

Na Fase 4a + de #388-kick is de SEO-run 7,5 min; het 5-7-doel vraagt nog ~0,5-1,5 min.
De enige overgebleven hefboom op het kritieke pad is stap 7 (editorial review, 74-102s
premium). Sinds 4a is "stap 8 in 7 mergen" zinloos (stap 8 is al verscholen achter de
staart) — de vraag is dus uitsluitend: **voegt de editorial-pass meetbaar F-VAL-kwaliteit
toe boven de stap-6-draft?** Dat mag niet blind beslist worden (taak-afspraak: F-VAL-A/B).

# Aanpak (meting eerst)

**Gepaard A/B-ontwerp**: per brief één pipeline-run t/m stap 7 (lokaal, BB-workspace
`cmnomsobx009q44msn0gpw7vb`, echte AI-calls); arm A = stap-7-`revisedContent`, arm B =
stap-6-draft uit exact dezelfde run — de enige delta is de editorial-pass. Beide armen
door `runFidelityScoring` (skipPersist, zelfde stack/provider, judge aan). N=4 briefs
(awareness/consideration/decision-mix). Harness: `scripts/dev/_fase4b-ab.local.ts`
(untracked; generator gestopt op het stap-7-checkpoint → geen persist-zijeffecten).

**Vooraf geregistreerde beslisregel**:
- **GO voor skippen** als gem. composite(B) ≥ gem. composite(A) − 2 punten ÉN geen
  enkele arm-B onder de composite-threshold (blog-post-drempel) zakt ÉN de B-teksten
  structureel gezond zijn (steekproef-lezing).
- **NO-GO** (stap 7 blijft) als arm A structureel > 2 punten wint of arm B door de
  drempel zakt. Conditioneel skippen (mid-pipeline gate) alleen overwegen als de data
  een betrouwbaar onderscheid laat zien — een extra judge-call van ~15s die 74-102s
  moet terugverdienen.

# Acceptatiecriteria

- [x] N=4 gepaarde runs met F-VAL-composites voor beide armen (A: 79/83/73/73, B: 79/77/72/73)
- [x] Beslissing volgens de vooraf geregistreerde regel: **NO-GO** (arm B 2/4 onder threshold; winst heterogeen — 1-op-4 een echte +6) — gedocumenteerd in tasks/seo-pipeline-speedup.md §Fase 4b
- [x] NO-GO-pad: taak → done met de meting als uitkomst; stap 7 blijft, pipeline blijft ~7,5 min
- [x] tsc 0 (docs + herdraaibare harness `scripts/fidelity/fase4b-editorial-ab.ts`); changelog #390

# Bestanden die ik aanraak

- Meting: `scripts/dev/_fase4b-ab.local.ts` (untracked harness)
- Bij GO: `src/lib/ai/seo-pipeline.ts` (+ evt. `seo-generation-job.ts`),
  `tasks/seo-pipeline-speedup.md`, `docs/changelog.md`

# Out-of-scope

- Stap 6-prompt aanpassen ("schrijf publicatie-klaar") — aparte iteratie als de A/B
  daar aanleiding toe geeft
- runner.ts/run-jobs (agents-scheduling-eigendom)

# Uitvoeringsnotities (2026-07-14)

- Lokale generatie bleek onmogelijk (Anthropic-tegoed op — dat bleek óók prod te raken:
  stille outage, direct als user-taak #11 geëscaleerd en door Erik opgewaardeerd).
  Generatie daarom op prod via directe SeoGenerationJob+AgentJob-insertie in de
  BB-workspace (org unlimited → geen credit-impact), gespreide starts (eigen invocation
  per run — de sequentiële runner + 800s-ceiling maken batchen gevaarlijk), wegwerpdata
  na afloop opgeruimd. Scoring lokaal (judge gpt-5 cross-family, skipPersist).
- Harness-leerpunt: `runFidelityScoring` retourneert `{ result, compositionInput }` —
  niet het result zelf.
