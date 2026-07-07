---
id: 2026-07-07-pricing-credits-launch
title: Launch-pricing — lage basis + prepaid credit-bundel + on-demand top-up, met platform-floor en output-only metering
status: accepted
date: 2026-07-07
supersedes: -
superseded-by: -
revises: 2026-07-05-agents-architectuur (D8 pricing)
---

# Context

`stripe-billing-live` is code-live-ready; de enige launch-blokker was de pricing zelf, die tot nu toe een placeholder was (FREE €0 / PRO €29 / AGENCY €99 / ENTERPRISE €249 flat). De agents-ADR (`2026-07-05-agents-architectuur`, D8) legde vast: **vaste maandprijs bij launch, per-token-metering later**. Bij het uitwerken bleek dat besluit onhoudbaar om twee redenen:

1. **Marge-realiteit (codebase + onderzoek).** De echte COGS is materieel: agent-run gem. $0,04 (55 gemeten runs, `AgentRun`), long-form artikel $3-6, korte content $0,10-0,50 (`cost-calculator.ts`: Sonnet $3/$15, Opus $15/$75 per M tokens). AI-native gross margins liggen op ~52% (ICONIQ 2026) / 50-60% (Bessemer) vs. de klassieke 80-90%. Bij **pure flat pricing** is een lage instap gevaarlijk: één power-user die 20 long-form/maand maakt kost ~€100 COGS op een €29-tier → structureel verlies. De AGENCY-placeholder (€99, 10 workspaces) was al verliesgevend bij >2-3 actieve merken — precies wat de eerste pilot (een bureau) gaat doen.
2. **De fair-use-rem was niet aangesloten.** `src/lib/stripe/usage-tracker.ts` (`trackAiUsage`) wordt nergens aangeroepen; `ai_usage_record` is leeg (0 rijen). De `AI_TOKENS`-limieten in `plan-limits.ts` bestaan op papier maar meten niets. Flat pricing zónder werkende cap = onbegrensd verlies op de duurste gebruiker.

De bestaande billing-spine anticipeert het gekozen model al grotendeels: `plan-limits.ts` heeft `aiOveragePer1kTokens` per tier, `src/lib/stripe/metered.ts` heeft `calculateOverage`/`reportUsageToStripe` (Stripe Billing Meter), `enforcement.ts` heeft `enforceFeature('AI_TOKENS')` + 402-guard. Het gat is de datavoeding + de UX + de payment-method- en BTW-laag voor de EU-markt.

Onderbouwing: deep-research workflow 2026-07-07 (13 adversarieel geverifieerde 3-0-claims + comparables) + interne COGS-analyse. Bronnen o.a. [Bessemer AI Pricing Playbook], [ICONIQ/SaaSMag AI-marges], [Frontify/Vendr], [Jasper pricing], [Monetizely tier-benchmark], [Stripe iDEAL→SEPA], [Stripe Tax EU/VAT].

# Decision

**Launch-pricing wordt een hybride: een lage vaste basis met een prepaid credit-bundel, plus on-demand top-up per credit voor actief gebruik.** De vaste "vaste-prijs-geen-metering"-lijn uit D8 van de agents-ADR wordt hiermee vervangen. Concreet, tien deelbeslissingen:

1. **Credit-eenheid ("Brand Credit").** De klant ziet acties → credits, niet ruwe tokens (tokens variëren 5× per model en dekken beeld/video niet). Onder de motorkap wordt gemeten op **output-tokens** (lengte-accuraat), met de pre-flight-schatting als getoonde verwachting.
2. **Output-only metering — merkcontext/F-VAL nooit.** Alleen **output-tokens + beeld/video-generaties** kosten credits. Merk-context-injectie (input), F-VAL-scoring, chat, merk-DNA-inrichting en exploratie zijn **gratis (0 credits)**. Dit behoudt de anti-Jasper-differentiator (D8 agents-ADR) én levert een schoon verhaal: *"je betaalt voor wat je maakt, niet voor dat wij je merk kennen."*
3. **Credit-kosten per actie (typisch):** korte content **5** · long-form **80** · beeld **2** · videoclip **20** · agent-deliverable **3** · chat/F-VAL/setup/exploratie **0**. Deze zijn de pre-flight-schatting; de werkelijke afboeking is output-token-gebaseerd.
4. **Platform-floor €15/maand.** Elke prijs = `€15 floor + credits × incl.-tarief`. De floor dekt de kosten die géén credits kosten: infra/storage, de eenmalige merk-DNA-inrichting (credit-vrij, verbrandt AI), de **ongemeterde recurring AI** (competitor-monitoring, alignment-scans, trend-radar op de achtergrond), de Stripe-fee, plus marge. Reële vaste kost ≈ €4-6/account → ~€9-11 gegarandeerde contributie per account vóór enig verbruik. Dit is de winstmotor (user-directive: "niet kostendekkend maar winstgevend").
5. **Incl.-tarief < top-up-tarief.** Inbegrepen credits ~€0,06-0,07/credit (plan-korting); **on-demand top-up €0,10/credit** (premium voor flexibiliteit). Beide comfortabel boven de blended COGS (~€0,045/credit).
6. **Prepaid, niet in-arrears.** Credits worden vooraf gekocht/toegekend en afgeboekt; geen achteraf-facturatie van overage (geen bill-shock, geen debiteurenrisico). De bestaande `metered.ts` Billing-Meter-in-arrears-aanpak wordt vervangen door prepaid top-up-aankopen.
7. **Auto-topup met pre-flight reservering + guardrails.** Vóór een dure run wordt de kost geschat en de balans vooraf gecheckt/gereserveerd — nooit mid-run afkappen (voorkomt waardeloze output). Bij ontoereikend saldo: auto-topup (optimistisch toegekend tegen het SEPA-mandaat) met **plafond op onbevestigde blootstelling + melding per topup + toggle om uit te zetten**.
8. **Tiers + trial.** Gratis **28-daagse no-card reverse trial** (300 credits éénmalig, read-only lock op dag 28, geen kaart tot eerste top-up/conversie). Betaald: **Starter €39 / 400 cr / 2 ws / 2 seats**, **Growth €89 / 1.200 cr / 5 ws / 5 seats**, **Agency €299 / 4.000 cr / 15 ws / 10 seats**. **Enterprise = "Contact sales"** (custom; SSO/unlimited/dedicated). Credits zijn **gepoold op account/org-niveau** (niet per workspace) — de tier bepaalt het aantal merken + het pooled maandtegoed. 3 gepubliceerde tiers + contact-sales = de marktnorm (~3,2 tiers; een 4e geprijsde tier schaadt conversie).
9. **Top-up-packs:** basis €0,10/credit; 500/€50 · 1.500/€135 (10%) · 5.000/€400 (20%). Auto-topup default op de kleinste pack.
10. **EU-betaling + BTW.** **iDEAL** voor losse top-ups (single-use push); **iDEAL → herbruikbaar SEPA-incasso-mandaat** voor de recurring basis + auto-topup (creditcard is in NL/EU B2B geen vereiste). **Stripe Tax** aan: NL 21% BTW, **EU B2B reverse-charge (btw verlegd)** met BTW-nummer-veld + VIES-validatie, OSS voor B2C. Facturen dragen BTW-uitsplitsing + reverse-charge-notitie.

# Y-statement

In de context van **launch-pricing voor een pre-launch EU B2B-platform met materiële, per-gebruiker variabele AI-kosten (~52% AI-native marge) en een billing-spine die ~80% van het metered/overage-model al bevat maar niet is aangesloten**, facing **het risico dat pure flat pricing op een lage instap structureel verlies draait op power-users en agencies (de eerste pilot), terwijl een te-krappe bundel het gevoel geeft "je kunt niks met de app"**, kozen we voor **een lage vaste basis + prepaid credit-bundel + on-demand top-up, met een €15 platform-floor, output-only metering (merkcontext/F-VAL gratis), pre-flight reservering met auto-topup, en iDEAL/SEPA + Stripe Tax voor de EU-markt**, to achieve **een instap die "relatief laag" blijft (Starter €39 < Jasper/neuroflash) én een gegarandeerd-winstgevende unit-economie (~46% blended marge, ~€142K jaarlijkse bruto-winst bij 300 gemixte users)**, accepting tradeoff **een meerdaags build-pakket (credit-ledger + metering-wiring op álle generatie-sites incl. background-jobs + top-up/SEPA + trial-logica + Stripe Tax), het herzien van D8 van de agents-ADR, en een prijs-bump t.o.v. de placeholder (€29/€99/€249 → €39/€89/€299)**.

# Consequences

## Positief
- **Lage instap wordt veilig.** Bij flat pricing is een lage basis + power-user verlies; bij basis + bundel + overage draagt de zware gebruiker zijn eigen kosten. De user-voorkeur (lage basis) en winstgevendheid zijn niet langer in conflict.
- **Marge geïnstrumenteerd.** Elke credit-afboeking voedt de echte usage-data die D8 als "latere fase" uitstelde — nu vanaf launch, geen speculatie.
- **Differentiator zichtbaar in de prijs.** "Creëren kost credits, kennen/beoordelen niet" maakt "merkcontext nooit meteren" tastbaar.
- **Hergebruik.** `metered.ts`/`usage-tracker.ts`/`enforcement.ts`/`aiOveragePer1kTokens` bestaan al; het is aansluiten + omzetten naar prepaid, geen from-scratch.
- **EU-fit.** iDEAL/SEPA + Stripe Tax dekken de NL/EU-realiteit (weinig creditcards, BTW-verlegging) die de go-live-playbook niet noemde.

## Negatief / tradeoffs
- **Groot build-pakket** (`pricing-credits-billing`): credit-ledger + afboeking op élke generatie-site (canvas, SEO-pipeline, agents, persona-chat, beeld/video) **incl. de background-jobs uit `serverless-hardening-jobs`** — die moeten óók credits boeken. Pre-flight-reservering is delicaat (schatten vóór genereren). Meerdaags, verdient eigen fasering.
- **Prijs-bump** t.o.v. de placeholder (€29/€99/€249 → €39/€89/€299) — nodig om genereuze bundels winstgevend te houden (long-form = €4 COGS). Starter €39 blijft onder Jasper (€59-69) en neuroflash (€42), dus "relatief laag" houdt stand.
- **Twee getallen dragen de calc** (blended €0,045/credit + achtergrond-AI-kosten) en zijn deels schatting — te valideren met de metering-smoke.
- **D8 agents-ADR herzien** (niet de rest van die ADR): de kosten-instrumentatie-per-run blijft, de "vaste-prijs"-lijn vervalt.
- **SEPA is niet instant** (dagen + weken terugdraaibaar) → auto-topup werkt op optimistisch-grant-tegen-mandaat met blootstellingsplafond; klein begrensd debiteurenrisico.

## Neutraal
- Enum-impact: `PlanTier` (`FREE/PRO/AGENCY/ENTERPRISE`) → mapping naar `FREE(trial)/STARTER/GROWTH/AGENCY` + `ENTERPRISE=contact-sales`; rename of extra enum-waarde + migratie. Schema-change → handmatige Neon `db push` (gotcha `neon-schema-push-on-deploy`).
- De €15 floor is uniform over alle tiers (op Agency proportioneel triviaal, op Starter ~40% van de prijs — bewust: kleine accounts dekken óók de vaste kosten).
- Charm pricing (€39/€89/€299) behouden; ronde bundels (400/1.200/4.000).

# 300-user winstgevendheid (onderbouwing)

Aannames: mix 60% Starter / 30% Growth / 10% Agency (180/90/30); gem. gebruiker verbruikt ~80-85% van de bundel + wat overage; blended COGS €0,045/credit; achtergrond-AI €1,5/€3/€10; infra+setup €1,5/€2,5/€8; Stripe 2,9%+€0,25.

| Tier | Users | Omzet/user (basis+overage) | Winst/user | Maandwinst |
|---|---|---|---|---|
| Starter €39 | 180 | €41 | €21,5 (52%) | €3.870 |
| Growth €89 | 90 | €95 | €41,7 (44%) | €3.753 |
| Agency €299 | 30 | €324 | €139 (43%) | €4.170 |
| **Totaal** | **300** | **≈ €25.650 MRR** | — | **≈ €11.793/mnd** |

→ **~46% blended marge; ~€308K ARR; ~€142K jaarlijkse bruto-/contributiewinst** (vóór eigen opex). De floors alleen leveren al ~€3.000-3.600/mnd gegarandeerde contributie. Overage is ~2× COGS, dus méér actief gebruik = méér marge; breakage verhoogt de winst. Niet meegerekend: trial-COGS als CAC (~€7/trial × conversieratio, eenmalig).

# Alternatives considered

- **Pure flat pricing (D8 agents-ADR).** Verworpen: verliesgevend op power-users en agencies zonder werkende cap; de cap (`trackAiUsage`) was niet aangesloten.
- **In-arrears metered overage** (de bestaande `metered.ts` Billing-Meter-aanpak). Verworpen t.o.v. prepaid: bill-shock + debiteurenrisico bij self-serve SMB; prepaid geeft hard-stop/optimistisch-grant met plafond.
- **Ruwe tokens als klant-eenheid.** Verworpen: onbegrijpelijk, model-afhankelijk (Opus 5× Haiku), dekt beeld/video niet.
- **Genereuze bundels op de placeholder-prijzen (€29/€69/€250).** Verworpen: bij long-form-COGS €4 zijn Growth/Agency-bundels dan verliesgevend bij vol verbruik — alleen breakage-afhankelijk, te fragiel voor de gevraagde winstzekerheid.
- **Creditcard-only.** Verworpen voor de EU/NL-markt: weinig bedrijven hebben een creditcard; iDEAL + iDEAL→SEPA is de vereiste.
- **4 gepubliceerde geprijsde tiers (incl. een €249-"Enterprise").** Verworpen: onderzoek toont conversieschade van een 4e tier; €249 is bovendien geen enterprise-prijs (Frontify mediaan ACV $32K/jr) — echte enterprise is custom.

# Notes
- Onderbouwing: deep-research 2026-07-07 (transcript in de sessie-workflow-dir) + interne COGS-query (`AgentRun`, `cost-calculator.ts`).
- Herziet D8 van `2026-07-05-agents-architectuur.md` (zie de gedateerde aanvulling daar); de overige agents-ADR-besluiten blijven `accepted`.
- Kern-code die dit raakt: `src/lib/constants/plan-limits.ts` (prijzen/enum/credits), `src/lib/stripe/metered.ts` + `usage-tracker.ts` + `enforcement.ts` (omzetten naar credit-ledger/prepaid), `prisma/schema.prisma` (`CreditBalance`/`CreditTransaction`, enum), álle generatie-sites (afboeking) incl. `src/lib/agents/jobs/handlers.ts`, Stripe Checkout (iDEAL/SEPA + Stripe Tax), `src/features/settings/components/billing/*` (usage-UI + BTW-facturen).
- Playbook-gevolg: `docs/playbooks/stripe-go-live.md` uitbreiden met credit-model, iDEAL/SEPA, Stripe Tax/BTW-nummer/OSS, en de nieuwe `STRIPE_PRICE_*`-set.
- Volgende stap: `tasks/pricing-credits-billing.md` (build, gefaseerd).
