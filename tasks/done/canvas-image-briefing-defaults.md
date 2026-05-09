---
id: canvas-image-briefing-defaults
title: Per-content-type image-briefing defaults + suggestie-strook in Visual Brief
fase: pre-launch
priority: now
effort: 1 dag
owner: claude-code
status: done
created: 2026-05-08
completed: 2026-05-08
related-adr: -
related-spec: -
worktree: -
---

# Probleem

Visual Brief in Step 1 (`VisualBriefSection`) start altijd met een lege source-keuze + geen pre-selected style chip. Een blog-post krijgt dezelfde lege start als een sales-email of LinkedIn-ad, terwijl per content-type een logische default bestaat (LinkedIn-post → lifestyle/FLUX, blog-hero → illustration/Recraft, sales-email → product-shot/GPT Image 2). Erik's intuïtie wordt nergens in code gekapitaliseerd, dus de gebruiker doet steeds dezelfde keuzes opnieuw — en kiest vaak de generieke default-foto.

Audit-bronpaper: `docs/audits/2026-05-08-canvas-image-briefing-plan.md` Laag 4 (defaults-tabel met 23 content-types).

# Voorstel

Hardcoded mapping `content-type → { source, styleDirection, model, aspectRatio, rationale }` in nieuwe constants-file. Suggestie-strook bovenin `VisualBriefSection` toont de aanbeveling met een "Use defaults" CTA. Geen auto-applied — gebruiker moet expliciet klikken zodat eigen voorkeur niet wordt overschreven.

# Acceptatiecriteria

- [ ] Nieuwe file `src/features/campaigns/constants/image-briefing-defaults.ts` met 23+ content-types gemapped (zie audit Laag 4)
- [ ] Helper `getContentTypeImageDefaults(contentType: string)` retourneert `{ source, styleDirection, model, rationale }` of `null` voor onbekende types
- [ ] Suggestie-strook in `VisualBriefSection` (Step1Context.tsx regels 867+): toont type-naam + 3 chips (style, aspect, model) + 1-zin rationale + "Use defaults" + "Customize" knop
- [ ] "Use defaults" klik vult source + styleDirection in via bestaande `setVisualBriefSource` / `setVisualBriefStyleDirection` actions; "Customize" verbergt de strook (state in store, niet persisted)
- [ ] Onbekende content-types tonen geen strook (graceful fallback)
- [ ] `npx tsc --noEmit` 0 errors
- [ ] `npm run lint` 0 errors
- [ ] Smoke-test uitgevoerd: open Canvas voor blog-post, zie "Suggested for Blog post: Illustration · 16:9 · Recraft V3", klik Use defaults, source + chip ingevuld

# Bestanden die ik aanraak

- `src/features/campaigns/constants/image-briefing-defaults.ts` (nieuw)
- `src/features/campaigns/components/canvas/accordion/Step1Context.tsx` (suggestie-strook in VisualBriefSection)
- `src/features/campaigns/stores/useCanvasStore.ts` (optioneel: action `applyImageBriefingDefaults` als chained convenience-action)

# Bestanden die ik NIET aanraak

- `src/lib/ai/visual-brief-prompts.ts` — content-coupling task hoort in `canvas-image-content-coupling`
- `src/lib/ai/canvas-context.ts` — VisualBrief type uitbreiden hoort in `canvas-image-briefing-textarea` task
- 4 visual-routes — geen route-wijziging nodig, defaults zijn UI-laag
- `InsertImageModal.tsx` — bypass-laag deprecation niet in scope

# Smoke test plan

1. `npm run dev` → open Canvas voor een `linkedin-post` deliverable
2. Step 1 sectie Visual Brief toont strook: "Suggested for LinkedIn post: Lifestyle · 16:9 · FLUX 2 Pro"
3. Klik "Use defaults" → source = generate, chip = lifestyle (visueel actief)
4. Verify met blog-post: chip = illustration, model-hint = Recraft
5. Verify met onbekende content-type (bv. handmatig override naar `unknown-type`): geen strook getoond
6. Refresh page → strook verschijnt opnieuw, ingevulde source + chip blijven (persisted via debounced PATCH)

# Risico's

- **Defaults voelen "te assertief" voor power-users** → mitigatie: niet auto-applied, alleen suggestie. Customize-knop verbergt strook.
- **Tailwind 4 purge issues bij nieuwe utility-classes** → gebruik bestaande violet-hex inline styles uit VisualBriefSection (regels 858-865), of bg-primary
- **Defaults-tabel wordt achterhaald als nieuwe content-types worden toegevoegd** → docstring verwijst expliciet naar audit; nieuwe types moeten worden toegevoegd of fallback `null` is acceptabel

# Out of scope

- Workspace-overrides voor defaults — backlog (meeste pilots draaien op factory defaults)
- Defaults-tabel uitbreiden naar 53 content-types (het volledige testplan) — 23 dekt het pareto, rest valt veilig terug op `null`
- AI-driven dynamic defaults (model leert per workspace) — post-launch
- Briefing-textarea + AI-suggestie — separate task `canvas-image-briefing-textarea`

# Notes

Mapping-bron: `docs/audits/2026-05-08-canvas-image-briefing-plan.md` Laag 4. Tabel kopieert direct naar `IMAGE_BRIEFING_DEFAULTS` constant.

`selectModelForStyle()` in `visual-brief-prompts.ts` doet al de chip → model routing — daar hoef je niets aan te wijzigen, de strook toont alleen de UI-hint. Als chip = illustration → model auto-pickt Recraft V3 server-side.

## Decisions 2026-05-08 (Erik gedelegeerd)

- **`landing-page` default = compose, lege library-fallback**: **expliciete melding, geen silent fallback**. UI: "Bibliotheek is leeg — fallback naar plain generate. Upload assets om compose te gebruiken." User kan met één klik doorgaan met generate, of stoppen om assets te uploaden. Reden: silent degradatie ondergraaft user-trust ("waarom is het beeld minder dan ik verwachtte?"); expliciet maakt de afweging zichtbaar.
- **`tiktok-script` default = trained-style → wijzigen naar `lifestyle-photo`**: Better Brands pilot heeft (vermoedelijk) nog geen Replicate LoRA-getrainde modellen geseed. Trained-style faalt dan met workspace-zonder-models error. **Default wordt `lifestyle-photo`**; trained-style blijft beschikbaar als opt-in via picker. Bij wel-getrainde-models in workspace kunnen we de default later flippen via een runtime check (`hasConsistentModels(workspaceId)`), maar dat is buiten deze task — pilot-veiligheid eerst.

## Implementation summary 2026-05-08

**Files changed**:
- `src/features/campaigns/constants/image-briefing-defaults.ts` (new) — 25 content-types gemapped (audit Laag 4 had 23, plus `job-ad-copy` en `employee-story` apart). `getContentTypeImageDefaults(contentType)` retourneert `{source, styleDirection, modelHint, rationale}` of `null`. Plus `getContentTypeAspectHint(contentType)` aspect-ratio-mapping. Beide decisions verwerkt: tiktok-script default = `generate + lifestyle` (Q5 fallback), landing-page default = `compose` (Q4).
- `src/features/campaigns/components/canvas/accordion/Step1Context.tsx` — suggestion-strook bovenin `VisualBriefSection` met type-naam + chip-label + aspect-hint + model-hint + rationale + "Use defaults" / "Customize" buttons. Local state `suggestionDismissed` (per-session, niet persisted). Volgt bestaande Tailwind-4-inline-violet-styling-pattern. Graceful fallback: onbekende content-types tonen geen strook.
- `scripts/smoke-tests/image-briefing-defaults.ts` (new) + `npm run smoke:image-defaults`

**Quality gates**:
- ✅ `npx tsc --noEmit` 0 errors
- ✅ `npm run lint` 0 errors (962 warnings, baseline ongewijzigd)
- ✅ `npm run smoke:image-defaults` 20/20 passed (decision-validating + 25-type coverage + graceful-fallback + aspect-hints)

**UI-handover voor hand-test**:
1. Start dev-server (`npm run dev` — let op orphan-zombie per memory: kill -9 9639 + pkill next + rm `.next/dev/lock` indien stuck)
2. Open Canvas voor een `linkedin-post` deliverable → Step 1 → scroll naar Visual Brief
3. Verwacht: violet strook bovenin met "Suggested for linkedin-post: Lifestyle · 1:1 or 1.91:1 · FLUX 2 Pro" + rationale + 2 knoppen
4. Klik "Use defaults" → source-radio en chip moeten worden ingevuld op `generate` + `lifestyle` (visueel actief)
5. Open een blog-post deliverable → strook toont "Illustration · 16:9 (hero) · Recraft V3"
6. Klik "Customize" op een willekeurige strook → strook verdwijnt, andere knoppen blijven werken
7. Refresh page met `linkedin-post` → strook verschijnt opnieuw (per-session dismiss)
8. Open een hypothetische unknown content-type → géén strook (graceful fallback)

Bij issues: open `Step1Context.tsx` regel ~870 (suggestion-strook), of check `image-briefing-defaults.ts` voor mapping.
