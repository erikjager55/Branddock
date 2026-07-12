---
id: onboarding-flow-test
title: Onboarding flow validatie met 3 externe gebruikers
fase: pre-launch
priority: now
effort: 1 week
owner: claude-code + user (recruitment + observatie)
status: open
created: 2026-05-12
completed: -
related-adr: -
related-spec: -
worktree: branddock-launch
---

# Probleem

Onboarding-flow (signup → workspace-setup → eerste brand-asset → eerste campaign) is door founder + LINFI-pilot diepgaand getest in dev. Maar **niemand buiten Erik heeft de productie-versie doorlopen zonder begeleiding**. Onbekende drempels: confusion-points, terminologie-vragen, onverwachte foutmeldingen, UX-cliffhangers waar gebruiker afhaakt.

Productie-readiness vereist evidence dat verse gebruikers het zonder begeleiding redden. 3 externe gebruikers is een minimum-N voor "is dit überhaupt begrijpelijk" check vóór paying pilot-launch.

# Voorstel

1. **3 externe testers werven** — bij voorkeur uit doelgroep (marketing-managers / brand-strategists), niet vrienden/familie. Werving via netwerk: 1 founder/marketing-rol, 1 agency-marketeer, 1 in-house brand-manager.
2. **Test-script opstellen** — 6 taken zonder hints (tester moet zelf navigeren):
   - Signup met email + password
   - Workspace + brand-naam aanmaken
   - 1 brand-asset invullen (kies zelf: brand-purpose / archetype / mission)
   - 1 persona aanmaken
   - 1 content-piece genereren (kies zelf type)
   - Content publiceren (PublishGate-flow doorlopen)
3. **Observatie-protocol** — think-aloud sessies (~30-45 min per tester), opgenomen (met consent). Observator noteert: friction-points, terminologie-vragen, navigatie-fouten, AI-call-confusion, breekpunten waar tester opgeeft.
4. **Synthese** — top 10 friction-points geprioriteerd op severity (blokkeert / vertraagt / verwart). Voor elk: voorstel-fix met effort-hint.

# Acceptatiecriteria

**Recruitment**:
- [ ] 3 testers geworven uit doelgroep — geen vrienden/familie
- [ ] Compensation geregeld (~€50/tester gift card of equivalent) — verlaagt drop-out
- [ ] Consent-form ondertekend (sessie opnemen, anoniem rapporteren)

**Test-script**:
- [ ] 6-taken script gevalideerd (zelf doorlopen → klaar zonder context, doel duidelijk)
- [ ] Productie-URL gebruikt (geen dev-bypass)
- [ ] Verse account per tester (geen pre-seeded data)

**Sessie-uitvoering**:
- [ ] 3 sessies × 30-45 min uitgevoerd
- [ ] Recordings opgeslagen (lokaal of cloud, met consent)
- [ ] Live notes per sessie (timestamps van friction-points)

**Synthese**:
- [ ] Friction-rapport (`docs/audits/<datum>-onboarding-flow-test-resultaten.md`) — per tester: taak-completion-rate, time-on-task, friction-events met timestamps
- [ ] Cross-tester pattern-analyse: welke friction-points zien ≥2/3 testers (sterkst signaal)
- [ ] Top 10 friction-points met severity (P1 blokkeert / P2 vertraagt / P3 verwart) + effort-hint per fix
- [ ] P1-bugfix-cluster bouwen pre-launch; P2/P3 evt post-launch

# Bestanden die ik aanraak

**Documenten**:
- `docs/audits/<datum>-onboarding-flow-test-resultaten.md` (nieuw) — synthese-rapport
- `docs/playbooks/onboarding-test-script.md` (nieuw, kort) — script voor toekomstige test-rondes
- `gotchas.md` — friction-points die niet meteen worden gefixt maar wel relevant zijn voor latere copy/UI-tweaks

**Code** (alleen vanuit findings, geen pre-emptive wijzigingen):
- Variabel op basis van top-10 friction-points → aparte bugfix-cluster of inline tweaks

# Bestanden die ik NIET aanraak

- Geen onboarding-UI-refactor pre-test — het hele punt is om vóór wijzigingen te observeren wat verse ogen vinden
- Geen analytics-tooling buiten bestaande PostHog (al wired, sprint #2 entry #231)
- Geen quantitative survey-toolingen — pure qualitative observation

# Smoke test plan

**Pre-sessie checklist**:
- Vercel-deployment live + custom domain bereikbaar
- Sentry geconfigureerd (vangt onverwachte errors tijdens sessies)
- PostHog event-stream check (verifieer dat tester-acties events emitten)
- Test-workspace clean state (geen demo-data zichtbaar)

**Per sessie**:
- Tester logt in via productie-URL
- 6-taken script doorlopen, think-aloud
- Observator noteert; geen hints tenzij tester volledig stuck > 5min en geeft op
- Sessie eind: 5-min debrief — "wat was verwarrend?", "wat zou je veranderen?"

**Post-sessies**:
- Recordings reviewen
- Friction-events categoriseren
- P1-bugfix-cluster prioriteren

# Risico's

- **Recruitment drop-out** — testers cancellen op laatste moment. **Mitigatie**: 4 testers werven, 3 minimum target
- **Tester die vooraf gegoogeld heeft** — niet "vers" meer. **Mitigatie**: instructie pre-sessie "niet voorbereiden"
- **Observator-bias** — Erik kent waar friction-points zitten en hint onbedoeld. **Mitigatie**: 2-persoons-observatie of opname-only mode
- **Productie-bug tijdens sessie** — tester ziet 500-error en raakt afgeleid. **Mitigatie**: Sentry pre-check, deployment freeze tijdens test-week

# Out of scope

- A/B-testing onboarding-varianten — qualitative-first
- Quantitative drop-off-rate metingen (PostHog levert dit later automatisch met meer users)
- Self-serve onboarding-tutorial-bouw (eerst friction observeren, dan beslissen of tutorial nodig is)
- Multi-language onboarding (NL-only pre-launch)
- Mobile onboarding-test (desktop-first pilot)

# Notes

**Sprint-positie**: na vercel-deployment + stripe-billing-live + pilot-onboarding-better-brands. Zonder productie-deployment kan flow niet getest worden tegen live infra. Optimaal: sprint #7.

**Compensation-budget**: ~€150 (3× €50). Trek uit pre-launch buffer-budget.

**Volgorde-discipline**: P1-fixes binnen 1 week na sessies (anders verdamprt momentum). P2/P3 evalueren tegen launch-go/no-go.


## Voortgang 2026-07-12 (agent-deel geleverd)

- **Testprotocol geschreven**: `docs/playbooks/onboarding-test-protocol.md` — 6 taken, score-rubric, debrief-vragen, verwerkings-format en een expliciet go/no-go-criterium voor betaalde acquisitie.
- **Werving + observatie** (menswerk) staat als user-taak #8 op de takenlijst.
- Restpunt vóór de sessies: de geautomatiseerde technische pre-check (Playwright signup→workspace→asset→persona→generatie) draaien zodra er een verse test-run gepland wordt — zodat testers alleen op UX struikelen, niet op techniek.
