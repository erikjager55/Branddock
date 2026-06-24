---
id: lp-variant-picker-single-option
title: Variant-picker — "Choose a different variant" verborgen bij 1 geleverde variant → user vast in "Variant chosen"
fase: pre-launch
priority: now
effort: ~2-4 uur
owner: claude-code
status: open
created: 2026-06-24
completed: -
related-adr: -
related-spec: -
worktree: -
---

# Probleem

Bij een partial generation (bv. slot-failure → slechts 1 variant geleverd) raakt de gebruiker vast.
`LandingPageGenerateBlock.tsx:1104` toont de knop **"Choose a different variant"** alleen als
`variantOptions.length > 1`. Met 1 variant is die knop verborgen, terwijl de begeleidende tekst
("Click below to choose a different variant or continue") wél een keuze belooft. Tegelijk laat de
generate-structured-variant-route bij regeneratie de DB-`structuredVariant` (de eerdere keuze)
ongemoeid; na een (harde) reload herlaadt de store die oude keuze → de UI staat in "Variant chosen"
met enkel "Open editor (Step 3)" en géén weg terug naar de keuze. Live opgetreden op de Napking-pagina
(2026-06-24): handmatige DB-ingreep (`structuredVariant` + `puckData` verwijderen) was nodig om te ontblokken.

# Voorstel

Twee samenhangende fixes: (a) toon "Choose a different variant" ook bij `length >= 1` (de knop doet
simpelweg `setStructuredVariant(null)` → keuze-weergave verschijnt, ook voor 1 optie — die heeft een
"Choose this variant"-knop). (b) Overweeg bij regeneratie de DB-`structuredVariant` te resetten (of een
"opties zijn nieuwer dan keuze"-detectie) zodat een reload niet terugvalt op een verouderde keuze.

# Acceptatiecriteria

- [ ] Met precies 1 geleverde variant + een eerder gekozen variant kan de gebruiker via de UI terug naar de keuze
- [ ] "Choose a different variant" verschijnt bij `>= 1` optie (tekst en knop matchen)
- [ ] Regeneratie laat geen verouderde keuze achter die na reload de picker blokkeert
- [ ] `npx tsc --noEmit` 0 errors + lint schoon
- [ ] Browser-smoke: genereer → (forceer of simuleer 1 variant) → reload → keuze opnieuw mogelijk

# Bestanden die ik aanraak

- `src/features/campaigns/components/canvas/accordion/LandingPageGenerateBlock.tsx` — gate `> 1` → `>= 1`
- (mogelijk) `src/app/api/landing-pages/[deliverableId]/generate-structured-variant/route.ts` — keuze-reset bij regeneratie

# Bestanden die ik NIET aanraak

- De generator/sanitizer-laag — niet gerelateerd

# Smoke test plan

1. Genereer varianten voor een Puck-type; zorg dat er 1 geleverd wordt (of pas count=1 toe).
2. Kies de variant, reload de pagina.
3. Verwacht: keuze-weergave of een zichtbare "Choose a different variant"-knop — geen doodlopende "Variant chosen".

# Risico's

- Reset van keuze bij regeneratie kan onbedoeld een bewuste keuze wissen → mitigatie: alleen resetten wanneer nieuwe opties daadwerkelijk zijn weggeschreven.

# Out of scope

- De onderliggende oorzaak van slot-failures (transient model/timeout) — aparte zorg.

# Notes

- Live opgetreden + handmatig ontblokt tijdens [[geo-stat-citation-source-leak]]-verificatie (2026-06-24).
