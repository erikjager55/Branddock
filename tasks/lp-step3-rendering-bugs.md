---
id: lp-step3-rendering-bugs
title: LP Step 3 (Puck Medium) rendering- + brand-token-bugs uit smoke-test
fase: pre-launch
priority: now
effort: ~2-3 dagen (gemengd: state-bugs klein, brand-token/CTA-plan groter)
owner: claude-code
status: in-review
fixed-2026-06-03: "#1 (verplichte header-image → auto-generate bij keuze, reverseert 2026-05-28 removal), #2 (foto-persistentie naar puckData), #3 (CTA-floor: near-white bg → tokens.brand + textTransform 'none' tenzij gescraped), #4 (icon-map + compact-fallback + neutraal default-icoon), #5 (quote-cap 28px), #7 (footer nette tagline). Branch fix/lp-smoke-bugs. tsc+lint groen."
fixed-2026-06-04: "#6 button-confidence: low-affordance detectie (tekst-link zonder fill+border) → radius-floor (≥fallback 6px) + textTransform geforceerd 'none', bovenop near-white→brand. #6 vision-judge-gate (CTA-affordance flaggen) blijft DEFERRED — affordance-floor voorkomt nu platte-tekst-CTA's at render-time, dus detectie minder kritiek. #1 score-kwaliteit (separate task-file score-pijler): vocab-rails ≥1 item i.p.v. ≥3 → in variant-generator.ts. Browser-verificatie open."
created: 2026-06-03
related-task: web-page-builder-canvas-step-mvp (post-merge bugs uit smoke-test 2026-06-03)
related-spec: docs/specs/brandstyle-analyzer-improvement-plan.md (button-extractor kwaliteit)
worktree: TBD
---

# Probleem

Smoke-test 2026-06-03 (Napking-workspace, landing-page deliverable, Step 3 Puck Medium-preview) bracht 7 bevindingen op de gerenderde LP-pagina. Mix van state-bugs, brand-token-extractie-kwaliteit, een render-fallback-bug en twee feature-requests. De brand-token-issues raken de kern van de Puck brand-aware rendering: componenten renderen volledig op `tokens.button` / `tokens.text` uit scraped brandstyle, dus foute/incomplete scrape → fout resultaat.

## Bevindingen

| # | Bevinding | Type | Root-cause lead |
|---|---|---|---|
| 1 | Header-image altijd verplicht; auto-genereren als die ontbreekt | feature | Hero rendert zonder image-slot-enforcement; geen auto-generate-trigger op Step 3 mount |
| 2 | Geselecteerde foto verdwijnt uit header na stap-terug → stap 3 | state-bug | Hero-image-selectie niet gepersisteerd/gehydrateerd naar puckData op terugkeer naar Step 3 |
| 3 | CTA-knop niet conform huisstijl: KAPITALEN, geen button (moet blauw + radius), fout font | brand-token-bug | `tokens.button` voor Napking = uppercase + ontbrekende background; archetype-inferred `textTransform` overschrijft echte huisstijl. Renderers: `puck-config.tsx:356-360` (hero-CTA) + `:858-863` (final-CTA BrandCTA) |
| 4 | Icoon ontbreekt — toont rauwe naam "barchart3"/"calendar"/"refreshcw" | icon-resolutie-bug | `lucide-icon-map.tsx` allowlist mist deze iconen + normalisatie pakt `barchart3`/`refreshcw` niet; fallback lekt rauwe icon-naam als zichtbaar tekst-label i.p.v. default-icoon |
| 5 | Quote-tekst te groot | brand-token-bug | Testimonial-quote fontSize te hoog (scraped/default `tbr.display.fontSize`) — cappen |
| 6 | CTA's overal onvoldoende gestyled | design-plan | Zie **CTA-verbeterplan** hieronder (door user gevraagd) |
| 7 | Footer-tekst altijd afgekapt ("...Jij f...") | mapping-bug | `variant-to-puck-data` vult footer `tagline` (single-line, klein) met de lange hero-subhead → afgekapt. Footer hoort korte tagline te krijgen, niet de volledige subhead |

# CTA-verbeterplan (bevinding #6)

**Probleem**: CTA's renderen inconsistent/zwak over álle LP's omdat ze 100% afhangen van scraped `tokens.button.*`, die onbetrouwbaar is. Bij incomplete scrape valt de CTA terug op platte tekst (geen background, uppercase uit archetype-inferentie). Geen gegarandeerde "dit is een knop"-affordance.

**Voorstel (oplopend):**
1. **Affordance-floor** — een CTA rendert NOOIT als platte tekst. Ontbreekt `tokens.button.background`/transparant → val terug op brand `primaryHex` (niet wit/transparant). Altijd zichtbare filled button + radius.
2. **textTransform-sanity** — uppercase alleen toepassen als de scrape het van échte buttons aantoonde, niet uit archetype-inferentie (RULER→uppercase override is hier fout). Default `none`.
3. **Radius + padding-floor** — `radiusPx` met zinvolle default (≥8px) i.p.v. 0; min-padding zodat het geen tekstlink wordt.
4. **Font** — `tokens.button.fontFamily` else bodyFont; valideer dat het een echt brand-font is, geen `system-ui`-fallback.
5. **Token-extractie verbeteren** — brandstyle-analyzer button-extractor: vang background-color, border-radius, text-transform, font van werkelijk gescrapete buttons + completeness/confidence-flag. Bij low-confidence → veilige brand-derived defaults (primaryHex bg, witte tekst, 8px radius, geen uppercase).
6. **Vision-judge gate** — voeg CTA-affordance toe aan F-VAL vision-judge / brand-fit-check zodat een platte-tekst-CTA gevlagd wordt.

# Voorgestelde fix-volgorde

1. **Quick wins (klein)**: #4 icon-map (iconen toevoegen + normalisatie + default-icoon-fallback), #5 quote-cap, #7 footer-mapping
2. **State-bug**: #2 hero-image-persistentie naar puckData op Step-3 re-mount
3. **CTA-floor (#3 + #6 punt 1-4)**: renderer-floors zodat CTA's altijd als knop tonen, ongeacht scrape-kwaliteit
4. **Feature #1**: verplichte header-image + auto-generate-flow
5. **Token-extractie (#6 punt 5-6)**: brandstyle-analyzer button-extractor verbeteren — mogelijk eigen sub-task

# Bestanden die ik waarschijnlijk aanraak

- `src/features/campaigns/components/canvas/medium/lucide-icon-map.tsx` — #4 iconen + normalisatie + fallback
- `src/features/campaigns/components/canvas/medium/puck-config.tsx` — #3 CTA-floor, #5 quote-cap, hero-CTA + BrandCTA renderers
- `src/features/campaigns/components/canvas/medium/variant-to-puck-data.ts` — #7 footer-tagline-mapping
- `src/lib/landing-pages/brand-tokens.ts` + `brand-tokens-v4-mappers.ts` — #3/#6 token-floors + textTransform-sanity
- Hero-image flow (Step 3 mount) — #1 verplichte image + auto-generate, #2 persistentie
- `docs/specs/brandstyle-analyzer-improvement-plan.md` — #6 button-extractor uitbreiding
- `docs/changelog.md` — entry

# Acceptatiecriteria

- [ ] #1 Header-image verplicht: ontbreekt er één → auto-generate getriggerd; geen LP zonder hero-image
- [ ] #2 Foto geselecteerd in eerdere stap blijft zichtbaar in header bij terugkeer naar Step 3
- [ ] #3 CTA toont als blauwe button met radius + brand-font, geen kapitalen (tenzij huisstijl dat echt voorschrijft)
- [ ] #4 Icoon-namen resolven naar Lucide-iconen; geen rauwe namen meer zichtbaar; onbekende naam → neutraal default-icoon
- [ ] #5 Quote-fontSize gecapt op leesbare maat
- [ ] #6 CTA-affordance-floor actief op alle 5 LP-types; platte-tekst-CTA onmogelijk
- [ ] #7 Footer toont korte tagline, niet de afgekapte hero-subhead
- [ ] 0 regressie op overige Puck-componenten; `npx tsc --noEmit` + `npm run lint` groen
- [ ] Smoke: LP in 2 workspaces (Napking + 1 ander) — alle 7 punten visueel bevestigd

# Out of scope

- Step-2 fidelity-bugs (aparte task: `lp-fidelity-bugfixes-step2`)
- Volledige brandstyle-analyzer re-architectuur (alleen button-extractor hier)
