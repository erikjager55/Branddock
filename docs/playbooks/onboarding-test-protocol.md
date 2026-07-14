# Onboarding-testprotocol — 3 externe gebruikers (pre-launch)

> Uitvoering van `tasks/onboarding-flow-test.md`. Dit protocol is klaar voor gebruik;
> de werving + observatie is menswerk (user-taak). Doel: evidence dat verse gebruikers
> de flow **zonder begeleiding** redden vóór betaalde acquisitie.

## Opzet

- **N = 3 testers uit de doelgroep** (geen vrienden/familie): 1 founder/marketing-rol,
  1 agency-marketeer, 1 in-house brand-manager.
- **Omgeving**: productie (`branddock-7y9n.vercel.app`), eigen device van de tester,
  schermdeling + hardop denken ("think-aloud"). Sessie ≤ 45 min.
- **Rol van de observator (Erik)**: alleen kijken en noteren. **Niet helpen** — pas bij
  een échte blokkade (>3 min vast) één hint geven en dat als P1 noteren.
- **Vastleggen per taak**: tijd, gelukt zonder hulp (ja/hint/nee), citaten bij verwarring,
  console-/netwerkfouten indien zichtbaar.

## De 6 taken (voorlezen, geen hints)

1. "Maak een account aan met je e-mailadres."
2. "Zet een workspace op voor je merk (kies zelf een naam)."
3. "Vul één merk-onderdeel in — kies zelf wat je logisch vindt (bv. brand purpose of missie)."
4. "Maak één persona aan die jouw doelgroep beschrijft."
5. "Genereer één stuk content — kies zelf het type."
6. "Vind terug wat het gegenereerde stuk van je merk gebruikt heeft (waarom is dit on-brand?)."

## Score per taak

| Score | Betekenis |
|---|---|
| ✅ | Zelfstandig < 5 min |
| ⚠️ | Gelukt met aarzeling/omweg of 1 hint |
| ❌ | Vast (>3 min) of opgegeven |

## Debrief-vragen (5 min, na afloop)

1. "Wat dacht je dat Branddock was toen je het eerste scherm zag?"
2. "Welk moment was het meest verwarrend?"
3. "Wat zou je verwachten dat er gebeurt na het genereren?"
4. "Zou je dit aan een collega laten zien? Wat zou je erbij zeggen?"
5. NPS-achtig: "Hoe waarschijnlijk gebruik je dit volgende week nog eens (1-10)?"

## Verwerking

- Bug-log per bevinding: `[taak-N] P1/P2/P3: beschrijving → verwachte fix` (P1 = blokkeert
  de taak, P2 = verwarring/omweg, P3 = cosmetisch).
- 2× hetzelfde ❌/⚠️-punt bij verschillende testers = automatisch P1.
- Resultaat + fixes terug in `tasks/done/onboarding-flow-test.md`; niet-evidente
  bevindingen → `gotchas.md`.

## Go/no-go-criterium

**Go** voor betaalde acquisitie als: alle 3 testers taak 1-5 halen met hooguit één ⚠️ per
tester, en geen enkel P1 open blijft. Anders: fixes eerst, daarna 1 hertest met een verse tester.

## Technische pre-check (agent, geautomatiseerd) — KLAAR

Draai vóór elke sessie de geautomatiseerde technische variant, zodat testers alleen op UX
struikelen, niet op kapotte techniek:

```
# lokaal (eigen dev-server op 3001 tegen branddock_test):
npm run test:onboarding-precheck

# tegen productie:
PLAYWRIGHT_BASE_URL=https://branddock-7y9n.vercel.app \
  npx playwright test --config e2e/playwright.config.ts -g "Onboarding pre-check"
```

De spec (`e2e/tests/global/onboarding-precheck.spec.ts`) maakt een vers account aan en
loopt taak 1-6 af. Taak 1-4 (signup → workspace → merk-asset → persona) zijn DB-only en
worden hard geassert; taak 5-6 (generatie + on-brand-trace) hangen aan de Anthropic-API en
worden als `⛔` gerapporteerd tot je de run tegen productie mét tegoed draait. De test print
een rubric-samenvatting (✅/⚠️/❌/⛔) per taak. **Groen op 1-4 = de technische onboarding-gate
is open; bevestig 5-6 live vóór de eerste sessie.**
