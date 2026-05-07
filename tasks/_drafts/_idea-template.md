---
id: <kebab-case-id>
title: <korte beschrijvende titel>
status: pending-tech
created: YYYY-MM-DD
verdict: <ready-to-build | needs-validation-first | probably-don't-build>
---

# Probleemstelling (1 zin)

<Eén concrete zin die het probleem beschrijft, niet de oplossing. Test: kun je dit aan iemand uitleggen zonder Branddock te kennen?>

# WHO — Doelgebruiker

**Rol**: <bv brand manager bij agency / direct merk owner / agency-medewerker>
**Schaal**: <hoeveel zulke gebruikers in onze pilot/customer pipeline?>
**Acuut segment**: <wie heeft dit het meest urgent?>

## JTBD-narratief

> "Toen [situatie], wilde de gebruiker [progress maken], maar [workaround/frustratie]."

<concreet verhaal — geen fictie>

## Evidence

<verwijzingen naar bestaande artefacten die dit probleem ondersteunen>
- `gotchas.md:<datum>` — ...
- `docs/changelog.md:#<entry>` — ...
- Customer feedback (Slack/email): ...
- Eigen Branddock-gebruik observatie: ...

# WHAT — Probleem (niet oplossing)

<2-3 zinnen wat *waarneembaar* misgaat. Geen "we missen feature X" — wel "gebruiker probeert Y, ervaart Z".>

# WHY-NOW

<Waarom dit kwartaal? Wat is er veranderd dat dit urgent maakt?>

Triggers:
- ...
- ...

# SUCCESS METRICS

**Primaire metric** (één): <welke meting beweegt door deze feature, hoeveel, in welk venster?>

Bv: "% van pilot-klanten die binnen 7 dagen na onboarding een tweede campagne start, van X% naar Y%"

**Counter-metric** (mag NIET kapotgaan): <welke metric beschermen we?>

# CONSTRAINTS

## Hard
- Tijd: ...
- Tech: ...
- Data: ...
- Legal/privacy: ...

## Soft
- ...

## Must NOT do
- ...
- ...

# SCOPE

## In-Scope (MVP)
- ...
- ...

## Out-of-Scope (expliciet NIET, ook al verleidelijk)
- ...
- ...
- ...
- ...

> Out-of-Scope > In-Scope is een goed teken.

# AANNAMES

Aannames die WAAR moeten zijn voor deze feature te slagen:

- **<aanname 1>** — bewijs: ... — onbewezen? <ja/nee>
- **<aanname 2>** — bewijs: ...
- **<aanname 3>** — bewijs: ...

> Onbewezen aannames vereisen validatie VOOR build, niet erna.

# ACCEPTATIECRITERIA (MVP)

Given/When/Then format:

- [ ] Given <state>, When <user-actie>, Then <observeerbaar resultaat>
- [ ] Given ..., When ..., Then ...
- [ ] ...

# EERSTE TAAK (morgen startbaar)

<Concrete actie die je morgen kunt beginnen. Niet "aan feature werken" — wel "schema-uitbreiding voor X model schrijven".>

---

# Red Team Review

> Onafhankelijke kritiek. Stel: een ervaren PM zou dit plan zien — wat zou ze zeggen?

## Zwakste schakel
<welke aanname/keuze breekt het hele plan als hij fout is>

## Pleidooi tegen dit plan
<2-4 zinnen die argumenteren waarom dit niet gebouwd zou moeten worden>

## Wat zouden we leren door NIET te bouwen
<wat is de leeropbrengst van uitstel + alternatieve experimenten>

## Verdict van de planner

**<ready-to-build | needs-validation-first | probably-don't-build>**

Reden: ...

# 5-Punts Stop-Conditie (afgevinkt door feature-planner)

- [ ] Probleem in 1 zin formuleerbaar
- [ ] Eén primaire success-metric (niet 5)
- [ ] Out-of-Scope-lijst langer dan In-Scope-lijst
- [ ] MVP-acceptance-criteria concreet (Given/When/Then)
- [ ] Eerste taak morgen startbaar

# Volgende stap

<één regel: "Klaar voor technical-planner" / "Wacht op user-research om aanname X te valideren" / "Parkeren — op basis van Red Team Review niet de moeite waard">
