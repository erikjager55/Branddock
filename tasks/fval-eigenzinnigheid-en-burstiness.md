---
id: fval-eigenzinnigheid-en-burstiness
title: Twee gaten in de AI-tell-machinerie, gevonden bij het valideren van een externe "Humanizer"-prompt
fase: post-launch
priority: next
effort: 2-4 dagen (rubriek-dimensie + hermeting van gewichten kost meer dan de code zelf)
owner: unassigned
status: open
created: 2026-08-21
completed: -
related-adr: -
related-spec: -
worktree: -
---

# Probleem

Erik liet een extern prompt-sjabloon ("The Humanizer & AI Auditor" voor Iconica)
valideren tegen wat Branddock al doet. Dat sjabloon beoordeelt tekst op 4 pijlers:
AI-clichés, ritme/zinsvariatie ("burstiness"), voorspelbare structuur en
authentieke/eigenzinnige stem, in twee fasen (audit-rapport → herschrijving).

Uitkomst van de vergelijking: 3 van de 4 pijlers zijn al gedekt, deels uitgebreider
dan het sjabloon zelf (`detectAiTells()` in `src/lib/brand-fidelity/ai-tell-detector.ts`
kent 9 categorieën/~30 tell-definities, NL-bewust, met een `brandVocabulary`-allowlist;
`strict-mode.ts` doet exact het detecteer→herschrijf→hermeet→houd-beste-patroon).

Twee dingen zijn wél echt half of afwezig:

1. **Zinsvariatie wordt voorgeschreven, nooit gemeten.**
   `src/lib/studio/human-voice-directive.ts:67-68` instrueert het model expliciet
   ("Varieer zinslengte — kort. Lang met komma's en bijzin. Kort. Niet
   uniform-medium."), maar niets in `ai-tell-detector.ts` of de G-Eval-rubriek
   controleert ná generatie of dat ook gebeurd is. Een instructie zonder meting.

2. **Eigenzinnigheid/authentieke stem wordt nergens gescoord.**
   De 6 G-Eval-dimensies in `src/lib/brand-fidelity/g-eval-rubric.ts`
   (strategicAnchoring 0.20, audienceFit 0.15, brandRecognition 0.15,
   antiPattern 0.30, coherence 0.10, concreteness 0.10 — som 1.0, zie ook
   `fidelity-config.ts:15-19`) dekken geen van alle "neemt deze tekst een
   standpunt in, of blijft hij veilig/diplomatiek". `human-voice-directive.ts:46`
   noemt "mening" wel in de framing, maar dat is een instructie, geen rubriek.

De derde pijler uit het sjabloon (voorspelbare intro→bullets→kortom-structuur) is
al gedekt door drie losse bestaande signalen (`closing_formula`, `bullet_addiction`,
`announcement_meta`) — geen actie nodig daar.

# Voorstel

1. **Deterministische burstiness-check** (geen AI-call): meet de standaarddeviatie
   van zinslengte in een gegenereerde tekst en geef een score/vlag terug, naast de
   bestaande property-checks. Puur statistiek, dus goedkoop en instant.
2. **Nieuwe G-Eval-dimensie "eigenzinnigheid"** in `g-eval-rubric.ts`, met een
   rubriek die expliciet vraagt: neemt de tekst een positie in, of is hij
   diplomatiek-neutraal zonder scherpte? Dit vereist het herwegen van de bestaande
   6 gewichten naar 7 (som moet 1.0 blijven) — dat gewicht-besluit is voor Erik,
   niet iets om zelf te kiezen.
3. Meet eerst het effect op een bestaande contentset vóór dit standaard aan staat
   (zelfde discipline als `fval-personality-extern-pad.md`): een nieuwe dimensie
   verschuift de composite-score voor alle content, gepubliceerde drempels incluis.

# Acceptatiecriteria

- [ ] Burstiness-check gebouwd en getest op ≥10 bestaande teksten (mens vs. AI-baseline)
- [ ] Voorstel voor de nieuwe rubriek-gewichten, met de verschuiving op bestaande
      scores gemeten en voorgelegd aan Erik vóór het standaard aan staat
- [ ] Besluit van Erik vastgelegd: welk gewicht, en of de 6 bestaande dimensies
      proportioneel dalen of dat er één specifiek plaatsmaakt
- [ ] `npx tsc --noEmit` 0 errors
- [ ] `npm run lint` 0 errors

# Bestanden die ik aanraak

- `src/lib/brand-fidelity/ai-tell-detector.ts` (of een nieuw bestand ernaast voor de burstiness-check)
- `src/lib/brand-fidelity/g-eval-rubric.ts`
- `src/lib/brand-fidelity/fidelity-config.ts`

# Bestanden die ik NIET aanraak

- `src/lib/studio/human-voice-directive.ts` — de generatie-instructie voor
  zinsvariatie blijft staan; dit is een méétprobleem, geen promptprobleem
- De gecombineerde structuur-skeletcheck (pijler 3 uit het sjabloon) — de 3
  bestaande losse signalen dekken de kern al, bewust geen 4e overlappende check

# Smoke test plan

1. Draai de burstiness-check op een bekende AI-tekst (uniforme zinslengte) en een
   bekende mensentekst (variabele zinslengte) — het verschil moet meetbaar zijn.
2. Meet de composite-scoreverschuiving van de nieuwe rubriek-dimensie op dezelfde
   contentset als de STRICT-mode-validatie.

# Risico's

- Een nieuwe rubriek-dimensie raakt gepubliceerde F-VAL-drempels voor alle content
  — niet los van bestaande scores in te voeren zonder hermeting (zie punt 3 hierboven).
- "Eigenzinnigheid" is subjectiever dan de andere 6 dimensies en dus gevoeliger voor
  judge-variantie (zie `golden-set-blogpost-quality`-task: 50-90% spreiding over
  identieke invoer bij een vergelijkbaar soort oordeel).

# Out of scope

- De structuur-skeletcheck (zie hierboven)
- `fval-personality-extern-pad.md` — ander, ongerelateerd gat (personality-veld
  niet doorgegeven op het externe scoring-pad), niet dezelfde taak

# Notes

Gevonden via een validatie-opdracht van Erik op een extern "Humanizer"-promptsjabloon
(21-08). Volledige vergelijking tegen de 4 pijlers van dat sjabloon zit in de
sessiegeschiedenis, niet apart gedocumenteerd hier.
