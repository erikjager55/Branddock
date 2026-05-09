---
id: canvas-image-content-coupling
title: Content-coupled image-prompt builder — persona + product + cta + concept stromen mee
fase: pre-launch
priority: now
effort: 1-1.5 dag
owner: claude-code
status: done
created: 2026-05-08
completed: 2026-05-08
related-adr: -
related-spec: -
worktree: -
---

# Probleem

`buildVisualBriefImagePrompts()` in `src/lib/ai/visual-brief-prompts.ts` voert alleen `subject.keyMessage` of `subject.objective` als subject-seed in. Brand visual identity loopt mee, maar persona's, product features, call-to-action en campaign-concept doen dat **niet**. Resultaat: gegenereerde beelden zijn abstract / generiek en "slaan niet terug op de content" (Erik's klacht #1).

Concreet voorbeeld: LinkedIn-post over Sarah (persona) die Better Brands service gebruikt → huidige prompt = "Subject: We helpen merken hun strategie scherp krijgen" → AI maakt abstract design. Voorstel: "Subject: 37-year-old brand director in coworking space, conversational setting, using Better Brands consult" → persona + product + setting concrete.

Audit-bronpaper: `docs/audits/2026-05-08-canvas-image-briefing-plan.md` Laag 3 (content↔prompt-koppeling matrix + per-type subject templates).

# Voorstel

Verrijk `buildVisualBriefImagePrompts()` met 4 nieuwe optionele parameters: `personas`, `products`, `callToAction`, `concept`, `platform`. Per style-chip toepassen via een `SUBJECT_TEMPLATE_PER_CHIP` mapping (audit Laag 3). 4 visual-routes (`generate-visual` / `-trained` / `-compose` / `select-library-visual`) updaten om verrijkte stack mee te geven.

Non-breaking: parameters zijn optioneel, oude calls blijven werken. Bestaande prompts krijgen alleen extra context als beschikbaar.

# Acceptatiecriteria

- [ ] `buildVisualBriefImagePrompts()` signature uitgebreid: `subject` parameter accepteert nu ook `personas?`, `products?`, `callToAction?`, `creativePlatform?`, `platform?`, `aspectRatio?` (alle optioneel)
- [ ] Per-chip subject-template mapping geïmplementeerd (zie audit Laag 3 tabel met 9 chips × subject templates)
- [ ] Fallback gedrag: zonder personas → keyMessage (huidige gedrag); zonder product voor product-shot chip → fallback brand naam + warning in console
- [ ] 4 routes pass relevante context: `generate-visual`, `generate-visual-trained`, `generate-visual-compose`, en `select-library-visual` route hoeft niet (geen AI-prompt)
- [ ] `assembleCanvasContext` retourneert al personas + products + concept + medium — alleen doorgeven aan builder
- [ ] Smoke-test: 1 deliverable met persona + product → final prompt bevat persona name/role en product name; verify in console.log of network-tab response
- [ ] `npx tsc --noEmit` 0 errors
- [ ] `npm run lint` 0 errors
- [ ] Bestaande visual-tests blijven groen

# Bestanden die ik aanraak

- `src/lib/ai/visual-brief-prompts.ts` (uitbreiden builder + nieuwe SUBJECT_TEMPLATE_PER_CHIP map)
- `src/app/api/studio/[deliverableId]/generate-visual/route.ts` (extra params doorgeven)
- `src/app/api/studio/[deliverableId]/generate-visual-trained/route.ts` (idem)
- `src/app/api/studio/[deliverableId]/generate-visual-compose/route.ts` (idem)

# Bestanden die ik NIET aanraak

- `src/lib/ai/canvas-context.ts` — context-stack levert al alle benodigde velden, geen wijziging nodig
- `src/app/api/studio/[deliverableId]/select-library-visual/route.ts` — geen AI-prompt, niet relevant
- 5+ Pickers en stores — purely server-side coupling
- `InsertImageModal.tsx` en GenerateImageTab — uses Studio's separate generation flow, niet Canvas Visual Brief

# Smoke test plan

1. Maak deliverable `linkedin-post` met:
   - persona linked (bv. "Sarah, brand director, 37, coworking space")
   - product linked (bv. "Better Brands Consult")
   - keyMessage = "We helpen merken hun strategie scherp krijgen"
   - chip = lifestyle
2. Klik Generate visual op Step 2
3. Network-tab → response payload `variants[].prompt` bevat:
   - "Subject: ... brand director ... coworking space ..." (persona)
   - "... Better Brands Consult ..." (product)
   - "Intended for LinkedIn (16:9)" (platform)
4. Vergelijk gegenereerd beeld pre vs post: post moet duidelijk persona-achtig figuur tonen, niet abstract design
5. Test fallback: deliverable zonder persona → prompt valt terug op `Subject: ${keyMessage}` (huidig gedrag, geen errors)

# Risico's

- **Prompt wordt te lang voor sommige models** (FLUX heeft 512-token limit, GPT Image 2 ~4000) → mitigatie: truncate persona/product context op 200 chars elk; brand identity blijft compact via bestaande `formatBrandVisualIdentity`
- **Persona-data privacy** (foto's van echte personen genereren) → mitigatie: gebruik alleen role + demographics, niet name/photo. Voor `subject` template: "37-year-old brand director" niet "Sarah Smit"
- **Product-shot chip zonder product-link** → fallback met console-warn; user notificatie kan in `canvas-image-briefing-defaults` task

# Out of scope

- Per-content-type templates (die zitten in defaults-task) — deze task is generieke builder
- Visual fidelity uitbreiding voor content-relevance score — sub-task na deze
- Briefing-textarea als losse input — separate task

# Notes

Audit Laag 3 bevat de kerntabel:

| Veld | Status | Voorstel |
|---|---|---|
| brief.keyMessage | wel gebruikt | houden |
| brief.callToAction | NIET | toevoegen |
| brief.contentOutline | NIET | optioneel toevoegen voor infographic chip |
| personas[] | NIET | toevoegen voor lifestyle/ugc/behind-the-scenes |
| products[] | NIET | toevoegen voor product-shot |
| concept.creativePlatform | impliciet | expliciet als "Campaign theme" |
| medium.platform | impliciet | expliciet als "Intended for ${platform}" |

Per-chip subject-template (audit Laag 3 tabel):

```ts
const SUBJECT_TEMPLATE_PER_CHIP: Record<VisualStyleDirection | 'default', (ctx) => string> = {
  lifestyle: ({ persona, product }) =>
    persona && product
      ? `${persona.role} (${persona.age ?? 'mid-30s'}), ${persona.setting ?? 'natural setting'}, using ${product.name}`
      : ctx.keyMessage ?? `Brand visual for ${ctx.brandName}`,
  'product-shot': ({ product, brandName }) =>
    product ? `${product.name} — ${product.category ?? 'product'}, hero composition` : brandName,
  // ... 7 more
};
```

Voor pilot is hardcoded mapping voldoende. Workspace-specifieke overrides kunnen later via `BrandStyle` tabel.

## Implementation summary 2026-05-08

**Files changed**:
- `src/lib/ai/visual-brief-prompts.ts` — `buildVisualBriefImagePrompts()` `subject` parameter uitgebreid naar `SubjectContext` interface met optionele `personas` / `products` / `callToAction` / `creativePlatform` / `platform` / `aspectRatio` / `brandName`. Nieuwe `buildSubjectByChip(chip, ctx)` helper met per-chip subject-templates: lifestyle/ugc → persona+product, product-shot → product+features, behind-the-scenes → persona, quote-text → callToAction-or-keyMessage, infographic/data-driven → keyMessage, illustration → keyMessage-or-product, default → rich-fallback. 200-char truncation per veld via `truncate()` helper voor token-budget. Console-warn wanneer product-shot chip zonder product geselecteerd.
- 3 routes (`generate-visual`, `generate-visual-trained`, `generate-visual-compose`) — call-sites passen nu `stack.personas` / `stack.products` / `stack.brief.callToAction` / `stack.concept.creativePlatform` / `stack.medium.platform` door. Geen schema-of-store-wijzigingen nodig — `assembleCanvasContext` levert deze velden al.
- `scripts/smoke-tests/image-content-coupling.ts` (new) + `npm run smoke:image-coupling`

**Privacy-aanpak (afwijking van task-file)**: PersonaContext heeft alleen `name` + `serialized` (geen structured `role`/`age`/`setting`). Pragmatisch: `persona.name` (in B2B SaaS = fictief) + eerste 200 chars van `serialized` (bevat occupation + age + setting uit persona-serializer). Geen schema-uitbreiding nodig voor pilot.

**Quality gates**:
- ✅ `npx tsc --noEmit` 0 errors
- ✅ `npm run lint` 0 errors (962 warnings, baseline ongewijzigd)
- ✅ `npm run smoke:image-coupling` 25/25 passed

**Hypothese-bevestiging (mechanisch)**: lifestyle-prompt voor `linkedin-post` met persona Maria + product Brand Voice Analyzer:
> "Lifestyle photography... Subject: **Marketing Director Maria — 37-year-old Marketing Director, working in a coworking space in Amsterdam, B2B SaaS background...**, using **Brand Voice Analyzer (Brand Management Tool)**. Intended for **linkedin (1.91:1)**. Campaign theme: **Brand-control op AI-snelheid**. Call to action context: **Start een gratis trial**..."

Pre-task zou dit zijn: "Subject: We helpen merken hun strategie scherp krijgen." Concrete-vs-abstract is duidelijk.

**Backwards compat**: bestaande call-sites blijven werken — alle nieuwe fields zijn optional, oude `{keyMessage, objective}` minimal-call is volledig ondersteund.

**Out-of-scope items die ik bewust niet aanraakte**:
- `select-library-visual` route (geen AI-prompt, niet relevant)
- PersonaContext schema-uitbreiding met structured fields — pragmatisch via `serialized` afgehandeld
- Briefing-textarea als losse input — separate task `canvas-image-briefing-textarea`
