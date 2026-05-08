---
id: content-item-qa-gating
title: QA-gating op content-publish — blokkeer lage consistency/persona/voice scores
fase: pre-launch
priority: now
effort: 2-3 dagen
owner: claude-code
status: done
created: 2026-05-07
completed: 2026-05-08
related-adr: -
related-spec: -
worktree: branddock-feat-qa-gating
---

# Probleem

Content-componenten kunnen nu naar PUBLISHED-status zonder kwaliteitsdrempel:
- `consistency-check` route levert `overallScore` op (regel 91), maar de UI dwingt geen drempel af vóór publish
- `persona-check` simuleert reacties, maar zonder blocking feedback-loop ("low relevance → require edit")
- Geen aggregate "readiness"-status per component

Gevolg: lage-kwaliteit content kan publiceren naar kanalen, brand-risk pre-launch.

# Voorstel

1. Definieer een **publish-readiness gate** met 3 sub-scores (consistency, persona, voice) en een drempel per dimensie + overall.
2. Block status-transition naar `PUBLISHED` als 1+ score onder drempel + geen user-override.
3. Override vereist expliciete user-actie ("publiceren ondanks lage score X" met reden).
4. UI: readiness-badge per component (groen/geel/rood), QA-dashboard per campagne (componenten gegroepeerd op readiness-status), block-feedback op publish-knop.
5. Override-events loggen (PostHog) voor analytics op pre-launch.

# Acceptatiecriteria

- [ ] Drempels gedefinieerd in `src/lib/qa/readiness-thresholds.ts` (configureerbaar per workspace, defaults: consistency >70, persona >65, voice >70, overall >70)
- [ ] `getContentReadiness(componentId)` helper retourneert `{ canPublish, blockingScores, scores }`
- [ ] Publish-route checkt readiness, returnt 422 met blocking-scores als gate faalt
- [ ] Override-mechanisme: aparte route `/components/[id]/publish-with-override` met required `reason` veld
- [ ] UI-badge per component: groen (alle scores boven drempel), geel (1-2 onder), rood (3+ onder of geen scores)
- [ ] Publish-knop disabled met tooltip als gate faalt; override-CTA naast knop
- [ ] QA-dashboard: campagne-pagina toont componenten gegroepeerd "ready / needs work / blocked"
- [ ] Override-event geschreven naar PostHog met workspace + component + scores + reason
- [ ] Geen `any` types
- [ ] `npx tsc --noEmit` 0 errors
- [ ] `npm run lint` 0 errors
- [ ] Smoke-test uitgevoerd

# Bestanden die ik aanraak

- `src/lib/qa/readiness-thresholds.ts` (nieuw)
- `src/lib/qa/get-content-readiness.ts` (nieuw)
- `src/app/api/studio/[deliverableId]/components/[componentId]/publish/route.ts` (bestaand of nieuw)
- `src/app/api/studio/[deliverableId]/components/[componentId]/publish-with-override/route.ts` (nieuw)
- `src/components/canvas/ReadinessBadge.tsx` (nieuw)
- `src/components/canvas/PublishButton.tsx` — disabled-logic + override-CTA
- `src/features/campaigns/components/QADashboard.tsx` (nieuw of integreren in bestaande campaign view)
- `src/lib/analytics/posthog-events.ts` — nieuwe event `content_publish_override`

# Bestanden die ik NIET aanraak

- `consistency-check` + `persona-check` route logica zelf — alleen de scores consumeren
- `BrandVoiceGuide` schema — voice-score komt via task `brand-voice-content-integration`
- Bestaande F-VAL flows — readiness-gate is parallel, geen F-VAL merge

# Smoke test plan

1. Genereer een lage-kwaliteit component (manipuleer prompt om persona-mismatch te forceren) → readiness-badge rood, publish-knop disabled met tooltip "persona-score 45 < 65"
2. Probeer direct PATCH naar `status: PUBLISHED` via API → 422 met blocking-scores in response body
3. Override via `publish-with-override` met reden "approved by client despite low score" → status wordt PUBLISHED, event in PostHog
4. Hoge-kwaliteit component (alle scores >75) → readiness groen, publish werkt direct
5. QA-dashboard toont 3 componenten correct gegroepeerd in 3 buckets
6. Workspace zonder voice-guide → voice-score afwezig, gate gebruikt alleen consistency + persona

# Risico's

- **Drempel-tuning**: te streng → user-frustration, te los → geen waarde. Mitigatie: defaults op 65-70, 1 week monitoren via PostHog override-rate, dan tunen
- **False-positives**: AI-scoring is noisy, goede content kan af en toe lage score krijgen. Mitigatie: override is laagdrempelig (1-klik + 1 reden); gate is guard-rail, niet hard-block
- **Voice-score ontbreekt** als `brand-voice-content-integration` nog niet af is. Mitigatie: voice-score als optioneel meenemen in readiness; bij ontbreken alleen consistency + persona evalueren
- **Existing PUBLISHED componenten**: backfill-logica nodig of legacy-vlag. Mitigatie: introduceer gate alleen voor NIEUWE publish-acties; bestaande PUBLISHED-status blijft

# Out of scope

- Auto-fix bij lage score (AI-suggested edits) — interessant maar buiten scope
- Workspace-tier-based drempels (gratis vs paid) — kan launch-fase
- A/B-test van drempels — post-launch
- F-VAL pillar-weights als input voor readiness — eerst voice-score laten landen

# Notes

Dependency: deze task heeft `brand-voice-content-integration` nodig voor voice-score (anders alleen 2 sub-scores). Kan ook eerst zonder voice-score landen en later voice-score erbij wiren.

Sequencing-advies van inventarisatie-agent: dit is #5 in de pre-launch volgorde — komt na #1 (real AI), #2 (versioning), #4 (voice). Override-rate-monitoring is de belangrijkste sturing voor drempel-tuning ná deployment.
