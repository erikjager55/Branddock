---
id: geo-stat-citation-source-leak
title: GEO stat-citatie leak — interne context-laagnamen lekken als bron in citeableStats
fase: pre-launch
priority: now
effort: ~0,5 dag
owner: claude-code
status: done
created: 2026-06-24
completed: 2026-06-24
related-adr: -
related-spec: docs/specs/2026-06-17-geo-seo-longform-plan.md
worktree: -
---

# Probleem

Een gegenereerde long-form GEO/SEO web-page (Napking, deliverable `cmqrvsr5x001ei9ms6lm5w5hi`) toont in
de stats-band interne context-laagnamen als "bron": `Napking briefing: evidence pieces, 2024` (×3) en
`Napking brand-context: delivery evidence`. Een lezer hoort dit nooit te zien — dezelfde klasse als de
Effie-rubric-leak (gotcha 2026-05-17). De data-laag bleek bewezen onvoldoende: er is een echt Deep
Research-rapport geselecteerd bij generatie (`additionalContextItems` + 21.5k input-tokens) en tóch
citeerde het model de interne lagen. Root-cause zit in schema + prompt + render:
`page-type-schemas.ts:239` maakt `source` verplicht (model móét iets invullen → verzint laag-citaat),
`variant-generator.ts:740/743` instrueert "source uit de aangeleverde context" (brand-context-laag is
deel van die context), en `long-form-geo-from-structured.ts:64` plakt de source blind in het label.

# Voorstel

Vier verdedigingslagen: (1) schema `source` optioneel maken zodat een first-party cijfer eerlijk
zónder bron mag; (2) prompt herformuleren — externe bron óf weglaten, expliciet verbod op interne
laagnamen; (3) sanitizer-vangnet aan de bron (`sanitize-geo-sources.ts`) die interne-laag-patronen
naar `null` scrubt, gewired op het centrale parse-return-punt; (4) render-gate die `— bron` alleen
toont bij een non-null bron. Beleid: stats zonder externe bron tonen alleen het label, geen bron-regel.

# Acceptatiecriteria

- [ ] `geoStatSchema.source` is nullable/optional (geen geforceerde bron meer)
- [ ] Prompt verbiedt interne laagnamen (`brand-context`/`briefing`/`evidence pieces`/`delivery evidence`) als bron en staat weglaten toe voor first-party cijfers
- [ ] `cleanStatSource()` scrubt de 4 geobserveerde interne labels → `null`; echte bron/URL blijft ongewijzigd
- [ ] Sanitizer gewired op `variant-generator.ts` return → opgeslagen variant is schoon (render + geo-analysis + flatten profiteren mee)
- [ ] Render toont `label — bron` alleen bij echte bron; anders label-only
- [ ] `geo-analysis.ts` + `flatten-variant.ts` appenden `(bron: …)` alleen bij non-null source
- [ ] `npx tsc --noEmit` 0 errors
- [ ] `npm run lint` 0 errors
- [ ] Smoke-test uitgevoerd

# Bestanden die ik aanraak

- `src/lib/landing-pages/page-type-schemas.ts` — `geoStatSchema.source` nullable optional
- `src/lib/landing-pages/variant-generator.ts` — prompt-regels 729/740/743 + sanitizer wiren op return
- `src/lib/landing-pages/sanitize-geo-sources.ts` — NIEUW: `cleanStatSource` + `sanitizeLongFormGeoVariant`
- `src/features/campaigns/components/canvas/medium/puck-templates/long-form-geo-from-structured.ts` — render-gate
- `src/lib/landing-pages/geo-analysis.ts` — null-guard
- `src/lib/landing-pages/flatten-variant.ts` — null-guard

# Bestanden die ik NIET aanraak

- Copy-fouten ("tijdsbesparing" etc.) — losse per-pagina edits, niet deze task
- Merk-token fallback / off-brand CTA-kleur — hoort bij `lp-step3-rendering-bugs` (in-review)
- Brede backfill van bestaande GEO-pagina's — alleen de Napking-deliverable wordt via regeneratie geverifieerd

# Smoke test plan

1. `cleanStatSource` inline-check: 4 interne labels → null; `"Restaurant Linens Research, 2024"` + een URL → ongewijzigd.
2. Regenereer deliverable `cmqrvsr5x001ei9ms6lm5w5hi` in de Canvas (live AI, jouw actie in de app).
3. DB-check: `SELECT jsonb_path_query(settings::jsonb,'$.structuredVariant.citeableStats[*].source') FROM "Deliverable" WHERE id='cmqrvsr5x001ei9ms6lm5w5hi';` → geen briefing/brand-context/evidence-labels meer.
4. Visueel: stats-band toont label — echte bron voor research-cijfers, label-only voor first-party cijfers.

# Risico's

- Te brede denylist scrubt een legitieme bron weg → mitigatie: curated set + word-boundary, en render-gate is non-destructief (toont alleen niet).
- Schema-versoepeling (`source` optioneel) zou bestaande validatie kunnen raken → mitigatie: nullable+optional is additief, geen breaking change voor bestaande data.

# Out of scope

- Per-pagina copy-fixes en brand-token werk (zie "NIET aanraak").
- Een aparte ADR — wijziging is additief/bugfix-niveau, geen architectuur-beslissing.

# Notes

- Injectiepunt sanitizer: `variant-generator.ts:876` (`return { success: true, data }`).
- Gotcha-aanvulling bij afronding: data-laag-curatie stopt deze leak-klasse niet; prompt+schema+render is de vector (cross-ref Effie-leak 2026-05-17).
