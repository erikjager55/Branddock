---
id: brand-voice-content-integration
title: BrandVoiceGuide injectie in content generation prompts + voice-consistency scoring
fase: pre-launch
priority: now
effort: 3 dagen
owner: claude-code
status: done
created: 2026-05-07
completed: 2026-05-08
related-adr: docs/adr/2026-05-06-brand-voice-extraction.md
related-spec: -
worktree: branddock-feat-brand-voice-content
---

# Probleem

`publish-to-channel` route en alle studio component-generation routes gebruiken `masterMessage` + strategy + persona-context, maar **negeren `BrandVoiceGuide`**. De brand voice extraction (BV-0/1/2/3/5) is in 2026-05-06 gebouwd en levert tone, vocabulary constraints en personality-profile op, maar deze data komt niet in generation-prompts.

Gevolgen:
- Gegenereerde content matcht het declared brand voice profile niet
- Workspaces met grondig ingerichte voice-guides zien geen verschil in output t.o.v. workspaces zonder voice-guide
- Pillar 1 van F-VAL (style/tone) is structureel laag → fidelity-scores blijven matig zonder gerichte oorzaak

# Voorstel

1. Bouw `injectBrandVoiceContext(prompt, workspaceId)` helper die `BrandVoiceGuide.profile` (tone, vocabulary, personality, do's/don'ts) injecteert in een prompt-builder.
2. Wire deze helper in alle generation-routes uit `studio-content-generation-real-ai`: generate, generate-all, regenerate.
3. Voeg `voiceConsistencyScore` toe als nieuwe sub-score in QA-checks (parallel aan persona-check, consistency-check).
4. Cache `BrandVoiceGuide` per workspace (5-min cache, analoog aan `getBrandContext`).

# Acceptatiecriteria

- [ ] `injectBrandVoiceContext` helper geïmplementeerd in `src/lib/ai/brand-voice-injection.ts`
- [ ] Helper gebruikt door generate / generate-all / regenerate routes
- [ ] Generation-prompt bevat tone, top-3 vocabulary do's, top-3 don'ts, personality-keywords
- [ ] Voice-consistency-check route geïmplementeerd: `/api/studio/[deliverableId]/components/[componentId]/voice-check`
- [ ] Score 0-100 per dimensie (tone, vocabulary, personality) + overall
- [ ] Score zichtbaar in canvas component-detail naast bestaande consistency/persona scores
- [ ] Cache hit-rate >80% gemeten via debug log (5-min cache werkt)
- [ ] Workspaces zonder `BrandVoiceGuide` → graceful skip (helper retourneert prompt unchanged)
- [ ] Geen `any` types
- [ ] `npx tsc --noEmit` 0 errors
- [ ] `npm run lint` 0 errors
- [ ] Smoke-test uitgevoerd

# Bestanden die ik aanraak

- `src/lib/ai/brand-voice-injection.ts` (nieuw)
- `src/lib/cache/brand-voice-cache.ts` (nieuw)
- `src/app/api/studio/[deliverableId]/components/[componentId]/generate/route.ts` (uit task #1)
- `src/app/api/studio/[deliverableId]/components/generate-all/route.ts` (uit task #1)
- `src/app/api/studio/[deliverableId]/components/[componentId]/regenerate/route.ts` (uit task #1)
- `src/app/api/studio/[deliverableId]/components/[componentId]/voice-check/route.ts` (nieuw)
- `src/components/canvas/...` — score-badge UI in component detail

# Bestanden die ik NIET aanraak

- `prisma/schema.prisma` — `BrandVoiceGuide` model bestaat al (BV-0..5), geen wijziging
- F-VAL pillar 1 logica — voice-consistency is parallel score, geen merge in F-VAL voor nu
- Brand voice extraction routes (BV-0..5) — alleen consumeren

# Smoke test plan

1. Workspace met volledig ingericht `BrandVoiceGuide` (tone "warm authoritative", do's "use 'we'", don'ts "avoid jargon") → generate component → response respecteert do's/don'ts (manueel oordeel + voice-check score >70)
2. Workspace zonder `BrandVoiceGuide` → generate werkt nog steeds, helper retourneert prompt unchanged (logs bevestigen "no voice profile, skipping")
3. Voice-check route op een component → response bevat 4 sub-scores (tone, vocabulary, personality, overall) met reasoning
4. Cache hit verifiëren: 2x rapide generate-calls binnen 5 min → 2e call gebruikt cached profile (logs bevestigen)
5. Diff-test: zelfde prompt zonder vs met voice-injection → output meetbaar verschillend in tone-score (>15 punten)

# Risico's

- **Prompt-bloat**: voice-context kan generation-prompts oprekken naar 10K+ tokens, kost-impact. Mitigatie: cap op top-3 do's + top-3 don'ts + 1-zin tone summary; rest via voice-check route, niet in prompt
- **Voice-check als bottleneck**: extra AI-call per component = +token-cost + latency. Mitigatie: voice-check optioneel + asynchroon (parallel aan andere QA-checks, blocking alleen op user-request)
- **Cache-invalidation bij voice-update**: gebruiker kan voice-guide aanpassen tijdens generation. Mitigatie: cache-invalidation hook in BrandVoiceGuide PATCH route
- **F-VAL Pillar 1 dubbeling**: voice-score overlap met fidelity-score (style 35%). Mitigatie: voorlopig parallel laten draaien, post-launch consolidatie evalueren

# Out of scope

- F-VAL Pillar 1 herziening om voice-score in te bakken (post-launch evaluatie na 1 maand data)
- Voice-guide auto-extraction uit gegenereerde content (omgekeerde richting) — niet in deze task
- Multi-voice profielen per content-type (bv "casual" voor social, "formal" voor whitepaper) — kan later

# Notes

Dependency-volgorde: deze task hoort ná `studio-content-generation-real-ai` te komen, omdat de hooks anders nergens op hangen. Kan parallel met `content-versioning-crud` en `content-item-qa-gating`.

Brand voice schema-status: `BrandVoiceGuide` model is in 2026-05-06 gebouwd via BV-0..5, zie auto-memory `brand-voice-future-extraction.md` voor extractie-tabel + fidelity-pijler-mapping. LINFI tone-fix observation suggereert dat tone-injection meetbaar effect heeft.
