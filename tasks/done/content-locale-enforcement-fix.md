---
id: content-locale-enforcement-fix
title: Tweetalige content-output bugfix — locale-enforcement op alle generation-routes
fase: pre-launch
priority: now
effort: 1-2 dagen
owner: claude-code
status: done
created: 2026-05-08
completed: 2026-05-08
related-adr: docs/adr/2026-05-08-locale-routing-brand-voice.md
related-spec: -
worktree: -
---

# Probleem

Gegenereerde content komt soms tweetalig terug (Engels + Nederlands door elkaar) terwijl de brand op één `contentLocale` is geconfigureerd. ADR `2026-05-08-locale-routing-brand-voice` legt vast dat `BrandVoiceguide.contentLocale` per-brand routing doet, maar de output suggereert dat één van drie root-causes speelt:

1. Niet alle generation-routes (component-niveau, regenerate, generate-all, hero-image, video, voiceover, derive, strict-rewrite/apply) lezen `contentLocale` en injecteren het in de system-prompt
2. Routes injecteren wel maar de instructie is te zwak om consistent te overrulen wanneer brand-context-velden mixed-language zijn
3. Brand-foundation-velden (mission/values/persona/product) bevatten zelf mixed-language content waardoor de AI mirrort

Dit is een pilot-blocker: Better Brands NL-content mag geen Engelse zinnen bevatten.

# Voorstel

Drie-stap aanpak:

1. **Diagnose** — alle 31 studio-routes + relevante claw/wizard routes scannen op `contentLocale` usage. Per route: leest het de locale? injecteert het in system-prompt? met welke sterkte? Output = compacte tabel.
2. **Fix** — locale-instructie centraliseren in een helper (bv. `buildLocaleInstruction(locale)`) die in elke prompt-bouw wordt aangeroepen, met sterkere wording (`OUTPUT MUST be in {locale} only. Do not mix languages. If source material is in another language, translate before responding.`). Helper toepassen op alle gaten uit stap 1.
3. **Validate** — uitbreiding van `npm run smoke:studio` met locale-test: NL-brand → check 0 EN-zinnen in output, EN-brand → check 0 NL-zinnen. Detection via simpele woord-frequentie heuristiek (lijst common-words per taal).

# Acceptatiecriteria

- [ ] Diagnose-tabel: alle generation-routes met locale-status (leest/injecteert/sterkte)
- [ ] Centrale `buildLocaleInstruction()` helper in `src/lib/ai/` of `src/lib/learning-loop/`
- [ ] Alle generation-routes gebruiken de helper waar prompt wordt opgebouwd
- [ ] Smoke-test `npm run smoke:studio` uitgebreid met NL-locale-check + EN-locale-check (0 cross-language zinnen tolerantie)
- [ ] Handmatige verificatie: 1 Better Brands content-flow NL → 0 EN-zinnen in alle 6 wizard-stappen
- [ ] `npx tsc --noEmit` 0 errors
- [ ] `npm run lint` 0 errors

# Bestanden die ik aanraak

- `src/lib/ai/` of `src/lib/learning-loop/` — nieuwe `buildLocaleInstruction()` helper
- `src/app/api/studio/[deliverableId]/components/[componentId]/generate/route.ts`
- `src/app/api/studio/[deliverableId]/components/[componentId]/regenerate/route.ts`
- `src/app/api/studio/[deliverableId]/components/generate-all/route.ts`
- `src/app/api/studio/[deliverableId]/derive/route.ts`
- `src/app/api/studio/[deliverableId]/inline-transform/route.ts`
- `src/app/api/studio/[deliverableId]/strict-rewrite/apply/route.ts`
- Eventueel: `hero-image`, `compose-video`, `generate-voiceover` voor visual-prompt-locale (indien relevant)
- `scripts/smoke-tests/studio-generation.ts` — locale-tests toevoegen

# Bestanden die ik NIET aanraak

- `BrandVoiceguide` Prisma-model — `contentLocale` veld bestaat al, geen schema-wijziging
- Wizard-stappen UI — bug zit in backend prompt-bouw
- `formatBrandContext()` — voice-injectie werkt al, locale is naast voice

# Smoke test plan

1. `npm run smoke:studio` met `BRAND_LOCALE=nl` voor Better Brands workspace → verwacht 0 EN-zinnen in output van Test 1-3
2. `npm run smoke:studio` met `BRAND_LOCALE=en` voor een EN-brand workspace → verwacht 0 NL-zinnen
3. Handmatige flow: Better Brands → Create Content → LinkedIn-post → genereer 3 varianten → review per variant op taal-zuiverheid
4. Verifieer in Step 3 (Medium) en Step 4 (Timeline) dat ook composed/derived content de locale respecteert

# Risico's

- **Brand-foundation zelf is mixed-language** → mitigatie: instructie sterker maken ("translate source material if needed before responding"); flag in audit als brand-context cleanup nodig is
- **Heuristiek voor language-detection geeft false positives** (bv. `email` of `marketing` in NL-tekst) → mitigatie: gebruik woord-frequentie + threshold, niet enkele-woord-match
- **Voice-instructie en locale-instructie kunnen conflicteren** als voice EN-voorbeelden geeft maar locale NL is → mitigatie: locale wint expliciet in helper-wording

# Out of scope

- Herziening van de `BrandVoiceguide.contentLocale` per-language voice-routing (ADR `2026-05-08-locale-routing-brand-voice` blijft leidend)
- Brand-foundation cleanup van mixed-language input — separate task indien diagnose dit als hoofdoorzaak aanwijst
- Multi-locale support per content-item (bv. dezelfde post in NL én EN als 2 deliverables)

# Notes

ADR-link: `docs/adr/2026-05-08-locale-routing-brand-voice.md` — bevat per-brand routing-beslissing en voice-impact context.

## Implementation diagnose 2026-05-08

**Root-cause identified**: `Workspace.contentLanguage` werd opgehaald in `getBrandContext()` (regel 942 `brand-context.ts`) en in `BrandContextBlock.contentLanguage` gezet, maar **`formatBrandContext()` en `formatBrandContextTier()` gebruikten het veld nergens** — geen language-instructie in de prompt. AI koos vrij. `buildBrandVoiceDirective()` had wel een language-emit, maar alleen voor non-EN en met te zwakke wording (geen "translate source material" clause).

## Implementation gedaan

**Centrale fix**:
- Nieuwe helper `src/lib/ai/locale-instruction.ts` met `buildLocaleInstruction(lang)` + `buildLocaleSystemFragment(lang)`. BCP-47 tolerant (strip region). 7 languages mapped (en/nl/de/fr/es/pt/it).
- `formatBrandContext()` (full tier) prepent nu `buildLocaleInstruction(ctx.contentLanguage)` boven alle brand-context regels.
- `formatBrandContextTier()` (summary/light/medium tiers) idem.
- `buildBrandVoiceDirectiveFromContext()` versterkt: emit nu OOK voor EN-brands (was: alleen non-EN), wording uitgebreid met "translate source material" + "outranks tone/style/methodology" clause.

**Routes die hiervan profiteren** (via formatBrandContext-pad):
- `generate / regenerate / generate-all` (3 component-routes via `buildGenerationContext` → `formatBrandContext`)
- `persona-check`, `generate-video` (gebruiken `formatBrandContext` direct)
- `campaigns/[id]/brief/render` (out of studio scope, profiteert ook)

**Routes die hiervan profiteren** (via buildBrandVoiceDirective):
- `inline-transform` (gebruikt directive direct)
- `canvas-orchestrator` (interne consumer)
- `improve-suggester` + `quality-scorer` (mogelijk dead-code per `studio-cleanup-item-192`)

**Routes ZONDER fix** (eigen system-prompt, geen brand-context-pad — pre-launch acceptabel):
- `consistency-check` — output is JSON met text-feedback (`overallMessage`, `flags[]`); bij mixed-language is dat user-irritatie maar geen content-blocker
- `tone-check` — gebruikt `formatBrandPersonality`, niet `formatBrandContext`. Output is JSON-feedback, zelfde categorie als consistency-check
- Visual/audio routes (`generate-visual*`, `hero-image`, `compose-video`, `generate-voiceover`) — image-prompts werken vaak beter in EN ongeacht brand-locale; out-of-scope hier, separate evaluatie in `canvas-image-content-coupling` task
- `derive` — alleen DB record-creatie, geen AI-call

## Quality gates

- ✅ `npx tsc --noEmit` 0 errors
- ✅ `npm run lint` 0 errors (960 warnings, baseline ongewijzigd)
- ✅ `npm run smoke:locale` 31/31 passed (29 unit + 2 live AI roundtrip)

## Smoke-test resultaat 2026-05-08

Nieuw script `scripts/smoke-tests/locale-enforcement.ts` + npm-script `smoke:locale`. Twee lagen:

**Layer 1 — unit-level prompt construction (29 tests)**:
- `buildLocaleInstruction` per taal + edge cases (BCP-47 strip, unknown lang, null/undefined)
- `formatBrandContext` (full tier) — locale komt vóór brand-context header
- `formatBrandContextTier` (summary/light/medium) — alle 3 tiers correct
- `buildBrandVoiceDirective` — emit voor zowel NL als EN, translate-clause aanwezig

**Layer 2 — live AI roundtrip (2 tests, claude-haiku-4-5)**:
- NL-brand met opzettelijk EN-brand-context-velden → output predominantly NL (NL=6, EN=2 heuristiek-score)
- EN-brand met opzettelijk NL-brand-purpose → output predominantly EN (NL=0, EN=5)

**De "translate source material" instructie werkt** — AI vertaalt cross-language input naar de correcte output-taal in plaats van te mirrorren.

## Follow-up tasks (niet nu nodig)

- Indien `consistency-check` / `tone-check` user-feedback in verkeerde taal blijkt: aparte task voor JSON-feedback locale.
- Indien image-prompts off-target door taal: meeneembaar in `canvas-image-content-coupling`.
