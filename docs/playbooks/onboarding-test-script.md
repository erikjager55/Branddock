# Onboarding-flow test-script

Voor pre-launch usability-validation met 3 externe testers. Doel: identificeer friction-points die nieuwe gebruikers tegenkomen vóór een paying-pilot live gaat.

## Pre-conditions

- Vercel-deployment live op productie-domain
- Sentry geconfigureerd (vangt onverwachte errors tijdens sessies)
- PostHog event-stream actief
- Geen demo-data in test-workspace (verse account per tester)
- Tester heeft consent-form ondertekend (sessie opname + anonieme rapportage)
- Tester is uit doelgroep: marketing-manager / brand-strategist / agency-marketeer

## Sessie-protocol (30-45 min)

### Intro (3 min)
- Welkom + uitleg: "Geen wrong answers, ik observeer alleen waar je vastloopt."
- Think-aloud aanmoedigen: "Vertel hardop wat je denkt en doet."
- Geen voorbereiding: "Niet vooraf googelen of de site bekijken."
- Recording-confirmatie + consent-bevestiging.

### 6 taken (zonder hints)

**Tester voert deze 6 taken in eigen tempo uit. Observator noteert friction-events met timestamp. Geen hints tenzij tester volledig stuck >5min EN zelf om hulp vraagt.**

1. **Signup** — Account aanmaken met e-mail + wachtwoord.
   - Friction-checks: e-mail-verificatie? duidelijk hoe verder?

2. **Workspace creëren** — Eerste workspace aanmaken met een merk-naam naar keuze.
   - Friction-checks: snapt tester verschil organization vs workspace? Verwarrende terminologie?

3. **Brand-asset invullen** — Kies één van: brand-purpose / archetype / mission. Vul in en sla op.
   - Friction-checks: weet tester wat een brand-asset is? Wat te invullen? Save-button vindbaar?

4. **Persona aanmaken** — Eén ideale klant-persona definiëren (naam, rol, pijn-punten).
   - Friction-checks: persona-form intuitief? Verplichte vs optionele velden duidelijk?

5. **Content genereren** — Kies een content-type (blog / social / e-mail naar keuze) en genereer één variant.
   - Friction-checks: snap tester briefing-flow? AI-call duur (15-30s) acceptabel? Outputs duidelijk?

6. **Content publiceren** — PublishGate-flow doorlopen voor de zojuist gegenereerde content.
   - Friction-checks: PublishGate-stappen duidelijk? Approval-flow makkelijk?

### Debrief (5 min)
- "Wat was het meest verwarrend?"
- "Wat zou je veranderen?"
- "Op een schaal 1-10, hoe waarschijnlijk zou je dit aanraden aan een vakgenoot?"

## Per-sessie note-template

Kopieer als nieuwe `docs/audits/YYYY-MM-DD-onboarding-tester-N.md`:

```markdown
# Onboarding test — tester N — YYYY-MM-DD

**Profiel**: [marketing-manager / agency / in-house brand-manager]
**Sessie-duur**: XX min
**Recording**: [link of locatie]

## Taak-completion

| # | Taak | Voltooid? | Tijd | Hulp nodig? |
|---|---|---|---|---|
| 1 | Signup | ✓ / ✗ | X min | nee / ja (HH:MM) |
| 2 | Workspace | | | |
| 3 | Brand-asset | | | |
| 4 | Persona | | | |
| 5 | Content gen | | | |
| 6 | PublishGate | | | |

## Friction-events

| Timestamp | Locatie | Wat ging mis / verwarde | Severity (P1/P2/P3) |
|---|---|---|---|
| HH:MM | Signup form | Tester zoekt "create account" knop | P3 |
| ... | | | |

## Tester-quotes

> "Quote 1..."
> "Quote 2..."

## Debrief-antwoorden

- Meest verwarrend: ...
- Zou veranderen: ...
- NPS-score: X/10
```

## Synthese-rapport (na 3 sessies)

Locatie: `docs/audits/YYYY-MM-DD-onboarding-flow-test-resultaten.md`

Structuur:
1. **Samenvatting** — N=3 testers, gemiddelde completion-rate, NPS-gemiddelde, top-3 issues.
2. **Cross-tester pattern-analyse** — friction-events die ≥2/3 testers raakten (sterk signaal).
3. **Top 10 friction-points** — severity (P1/P2/P3) + effort-hint per fix.
4. **P1-bugfix-cluster** — kandidaten voor pre-launch fix-sprint.

## Severity-rubric

- **P1 (blokkeert)**: Tester kon taak NIET zonder hint voltooien OF gaf op. Móét gefixt vóór launch.
- **P2 (vertraagt)**: Tester voltooide maar nam significant langer dan verwacht (>2× design-target). Aanbevolen pre-launch.
- **P3 (verwart)**: Tester voltooide vlot, maar zei achteraf het verwarrend te vinden. Post-launch acceptabel.

## Volgorde-discipline

- P1-fixes binnen 1 week na laatste sessie (anders verliest het momentum)
- P2-fixes tegen launch-go/no-go beslissing
- P3-fixes post-launch backlog met user-feedback-loop

## Recruitment-tips

- Werf 4 testers (1 reserve), 3 minimum target.
- Compensation €50/tester gift-card (verlaagt drop-out).
- Doelgroep-fit > beschikbaarheid: liever 1 echte marketing-lead dan 3 vrienden.
- Vermijd: vrienden, familie, mensen die al van Branddock hebben gehoord, technical people zonder marketing-rol.
- Bevestig 24u vóór sessie + recording-consent in de bevestiging.

## Observator-bias mitigatie

- 2-persoons-observatie waar mogelijk (1 leest taken voor, 1 noteert)
- Anders: recording-only mode + post-sessie review (observator hint NIET tijdens sessie)
- Erik kent friction-points → strikt vasthouden aan "geen hints onder 5 min stuck"
