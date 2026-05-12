---
id: compose-pipeline-gemini-migration
title: Compose-pipeline migratie van Flux Pro Kontext naar Gemini Image (nano-banana)
fase: pre-launch
priority: now
effort: ~1 dag
owner: claude-code
status: open
created: 2026-05-12
completed: -
related-adr: -
related-spec: -
worktree: -
---

# Probleem

Huidige compose-pipeline (`POST /api/studio/[deliverableId]/generate-visual-compose`) gebruikt FAL endpoint `fal-ai/flux-pro/kontext/multi` voor multi-image composition. Tijdens sprint #4 browser-smoke 2026-05-12 stelde user vast: **empirische ervaring is dat Gemini Image (`gemini-2.5-flash-image-preview`, codename "nano-banana") consistenter subject-identiteit behoudt en betere compositorische kwaliteit levert voor multi-reference use-cases**.

Daarnaast: de huidige route's error-message ("Check that FAL_KEY is configured") is misleidend wanneer de echte oorzaak iets anders is (zoals private storage URLs of model-deprecation) — verborgen in server-side `console.error`. Migratie naar Gemini levert ook gelegenheid voor betere error-surfacing.

# Voorstel

Compose-pipeline route migreren naar `gemini-2.5-flash-image-preview` met multi-image input + natural-language instruction. Bestaande FAL Flux Pro Kontext-pad behouden als optionele fallback achter feature-flag (post-launch te verwijderen wanneer Gemini-pad stabiel is in productie).

**Implementatie-pad**:
1. Nieuwe helper `geminiClient.composeFromImages(imageUrls, instruction, options)` in `src/lib/ai/gemini-client.ts` — wrapper rond Gemini Image-API met multi-reference support
2. `generate-visual-compose` route switch backend van `runFalGeneration` naar Gemini-helper
3. Error-handling verbeteren: specifieke error-messages voor: invalid-image-URL, content-policy-block, quota-exceeded, network-timeout
4. Telemetry-tracking via bestaande `createStructuredCompletion` of equivalent voor cost-tracking
5. Aspect-ratio mapping van FAL-format naar Gemini-format (Gemini gebruikt label-based ratios: "square", "portrait_4_3", etc.)

# Acceptatiecriteria

**Gemini helper**:
- [ ] `src/lib/ai/gemini-client.ts` — nieuwe export `composeFromImages(imageUrls: string[], instruction: string, options: ComposeOptions): Promise<ComposeResult>` met:
  - Input validation: 2-9 imageUrls, instruction niet leeg
  - Model: `gemini-2.5-flash-image-preview` (nano-banana)
  - Returnt `{ images: [{ url: string, width, height }], usage: { promptTokens, outputTokens } }`
- [ ] Aspect-ratio mapping helper: `mapAspectToGemini(falSize | label) -> GeminiAspectRatio`
- [ ] Error-handling: throws typed errors (`ComposeInvalidImageError`, `ComposePolicyBlockedError`, `ComposeQuotaError`, `ComposeNetworkError`)

**Route migration**:
- [ ] `src/app/api/studio/[deliverableId]/generate-visual-compose/route.ts`:
  - Vervang `runFalGeneration(COMPOSE_ENDPOINT, ...)` met `geminiClient.composeFromImages(...)`
  - `COMPOSE_ENDPOINT` constant verwijderd
  - Per-call try/catch met typed error-mapping → user-readable JSON error responses
  - Specifieke 4xx codes: 422 voor content-policy, 502 voor network/quota, 400 voor invalid-input

**Telemetry**:
- [ ] AICallSnapshot + AICallTrace records aangemaakt per compose-call (consistent met andere AI-calls in Branddock)
- [ ] Cost-tracking in telemetry: tokens + image-count

**Tests**:
- [ ] Smoke: `scripts/smoke-tests/compose-pipeline-gemini.ts` (nieuw) — fixture-test met 3 paren publieke image-URLs + instruction + verify response shape
- [ ] Manual UI-smoke (vereist vercel-deployment voor publieke storage): pick 2-3 Goed-Bouw library images + instruction "Dirk voor kantoor in middaglicht" → image gegenereerd reflecteert beide refs

**Quality gates**:
- [ ] `npx tsc --noEmit` 0 errors
- [ ] `npm run lint` 0 errors in nieuwe/gewijzigde files
- [ ] Backwards-compat: bestaande Step 2 image-picker UI hoeft niet te wijzigen (same input contract: referenceIds + instruction)
- [ ] Error-message UX: user ziet specifieke error i.p.v. generic "All compose generation calls failed"

# Bestanden die ik aanraak

**Modify**:
- `src/lib/ai/gemini-client.ts` — `composeFromImages` toevoegen
- `src/app/api/studio/[deliverableId]/generate-visual-compose/route.ts` — backend-switch + error-handling

**Nieuw**:
- `scripts/smoke-tests/compose-pipeline-gemini.ts` — smoke fixture-test

**Read-only**:
- `src/lib/ai/anthropic-client.ts` — referentie voor error-typing pattern
- Bestaande Branddock telemetry-helpers

# Bestanden die ik NIET aanraak

- UI van Step 2 image-picker — backend-only migratie
- FAL_KEY env-var blijft (wordt nog gebruikt door `generate-visual` + `generate-visual-trained` routes)
- Andere routes die FAL gebruiken (single-image generate + trained-style) — apart te overwegen post-pilot-feedback
- Storage-provider — public-URL access blijft afhankelijk van Vercel-deployment (separate task)

# Smoke test plan

**Unit-niveau** (na implementatie):
1. `npx tsx scripts/smoke-tests/compose-pipeline-gemini.ts` — fixture-test met 3 fixture-paren publieke URLs + verify response shape + image-URL returned

**Live smoke** (vereist vercel-deployment voor publieke storage):
1. Open Canvas voor Goed-Bouw deliverable
2. Step 1: source = compose
3. Step 2: pick 2-3 reference images uit gallery (Directeur Dirk + KantoorGoedBouw)
4. Compose instruction: "Dirk staat voor het Goed-Bouw kantoor in middaglicht"
5. Klik Generate composition → wacht 5-15s (Gemini sneller dan Flux)
6. Verifieer Step 4: image gegenereerd, behoudt Dirk's gezicht + kantoor-setting
7. Network tab: 200-response, geen 5xx
8. Telemetry: AICallSnapshot + Trace records aangemaakt

# Risico's

- **Gemini Image content-policy blokkades** op real-world brand-imagery (people, logos, etc.) — kunnen onverwachte 422-errors triggeren. **Mitigatie**: typed error + user-readable message ("Content policy: image rejected — adjust instruction or pick different references")
- **Subject-identity drift** bij sommige reference-combinaties — Gemini kan eigen interpretatie geven die afwijkt van bron. **Mitigatie**: vergelijk output met bron in UI; users zien duidelijk wanneer compose niet matched
- **Pricing surprise** bij volume — Gemini ~$0.039/image, Flux ~$0.04-0.08. Vergelijkbaar maar valide bij scale. **Mitigatie**: telemetry-tracking + cost-alert in PostHog
- **Backwards-compat tijdens migratie**: tijdens deployment kan een refresh-window inconsistencies geven. **Mitigatie**: deploy als atomic switch, geen feature-flag flicker

# Out of scope

- `generate-visual` (single-image, geen refs) — blijft FAL/Flux Pro
- `generate-visual-trained` (trained-style LoRA) — blijft FAL, vereist trained-model infrastructure
- UI-niveau model-selectie ("choose Flux vs Gemini") — beslissing nu is volledige migratie, geen dual-pipeline
- Fine-tuning instructie-prompts voor specifieke style chips — apart prompt-tuning task post-feedback
- Image-editing varianten (inpainting, outpainting) — apart use-case
- Aspect-ratio extra: alleen mapping van bestaande FAL-sizes; geen nieuwe ratio's

# Notes

**Model-identifier**: `gemini-2.5-flash-image-preview` (codename "nano-banana"). Officiële naam volgt na model-GA; v1 gebruikt de preview-identifier.

**Tracking**: na sprint #5 (verwachte uitvoering), tussen 30-60 dagen post-launch monitoren compose-quality via gebruikers-feedback in Brand Alignment Insights tab. Bij significante quality-regressie: fallback-flag aanzetten (FAL pad behoud) en re-evaluate.

**Cross-references**:
- Sprint #4 smoke 2026-05-12: user-rapportage "nano-banana werkt beter voor compose"
- Bestaande Gemini image-gen: `src/lib/ai/gemini-client.ts:494` (`generateImage` met Imagen-4 — niet voor compose)
- FAL Compose endpoint: `src/app/api/studio/[deliverableId]/generate-visual-compose/route.ts:32`

**Sprint-positie**: sprint #5 Track A fill-in (parallel met testplan-content-items varianten). Geen blocker voor Track B/C werk. Smoke kan pas na vercel-deployment runnen.
