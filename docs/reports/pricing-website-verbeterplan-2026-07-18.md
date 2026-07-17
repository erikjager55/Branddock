# Pricing- & website-verbeterplan — na de pricing-sessie (#180-#186)

> **Datum**: 2026-07-18 (nacht) · **Opdracht Erik**: analyseer de gemergde pricing-sessie, de impact op pricing/kernboodschap/website, stel autonoom een verbeterplan op en voer het uit.
> **Basis**: impact-analyse main @ 7c24081c · wig-besluit optie C (`docs/marketing/launch-wig-besluit.md`) · Postiz-verbeterplan P4/P2/P1.2.

## 1. Wat de pricing-sessie deed — en wat het betekent

**Gedaan (#180-#186):** `PLAN_CONFIGS` is de enige bron van waarheid geworden (ADR-prijzen exact: Starter €39/400cr · Growth €89/1.200cr · Agency €299/4.000cr; trial 28d/300cr; top-up-packs 500/1.500/5.000), de marketing-pricing-pagina en de homepage-teaser lezen er live uit, Settings→Facturering toont eindelijk echte cijfers, en seat/workspace-limieten worden op de juiste tier afgedwongen (incl. developer-override zichtbaar in de UI).

**Impact-conclusies:**
1. **P4 kan nu zuiver**: elke bundelvertaling die we tonen kan uit config + `CREDIT_COSTS` berekend worden — geen kopie-drift meer mogelijk. De sessie bouwde het fundament; P4 is de kroon erop.
2. **Er resteert één drift**: de JSON-LD in `marketing/layout.tsx` heeft 39/89/299 nog hardcoded — zelfde bug-klasse die #181 net oploste. Fixen in dit pakket.
3. **De gratis-laag is al half verteld**: "Betaal alleen voor wat je maakt" staat in de homepage-teaser en de FAQ noemt de per-actie-kosten. Wat ontbreekt is de **omgekeerde vertaling** (wat kríjg je voor een bundel) en de expliciete "wij rekenen niets voor het kennen en bewaken van je merk"-claim als differentiator — mét de zero-cost-lijst (context, F-VAL, chat) als bewijs.
4. **Kernboodschap loopt achter op het product** (bekend uit het wig-besluit, nu urgent): de hero zegt "Content die klinkt als jóúw merk" terwijl het product sinds vannacht een koppelbaar AI-marketingteam ís (9 agents + MCP-connector in Claude/ChatGPT + browser-extensie). De agent-feiten staan verspreid in ValuePillars/ProofStrip maar dragen het verhaal niet.

## 2. Het plan — vijf werkpakketten (één PR)

**W1 — P4.1 Bundelvertaling op de pricing-pagina.** Per tier-kaart een "wat je hiervoor maakt"-regel, berekend uit `monthlyCredits / CREDIT_COSTS` (bijv. Starter: "±80 social posts, óf 5 long-form artikelen, óf 200 beelden — mix vrij"). Eén gedeelde helper (`credit-examples.ts`) zodat homepage-teaser en pricing dezelfde rekensom gebruiken. Top-up-packs idem klein.

**W2 — P4.2 "Je betaalt voor wat je maakt"-sectie.** Prominente band op de pricing-pagina: links de gratis-laag (merkcontext, F-VAL-validatie, Brand Assistant — altijd gratis, uit `ZERO_COST_ACTIONS`), rechts de betaalde acties met credit-prijs. Kop: "Wij rekenen niets voor het kennen en bewaken van je merk." FAQ-item aanscherpen; JSON-LD-drift fixen (prijzen uit PLAN_CONFIGS).

**W3 — P2.1 Agent-first kernboodschap (wig optie C).** Hero wordt: eyebrow "Jouw AI-marketingteam", **H1 "Een AI-marketingteam dat je merk écht kent."**, subkop met het bewijs-element ("…en elke uiting meetbaar on-brand maakt met een F-VAL-score") + het koppel-feit ("werkt in Branddock, in Claude en ChatGPT, en overal waar je schrijft"). ValuePillars/ProofStrip/MODULES herschikken naar team-frame; meta-strip behoudt EU/AVG. **Risico-mitigatie uit het besluit**: agents doen wat ze nú doen (signaleren, adviseren, concepten in je inbox — jij keurt goed); "autopilot" komt nergens voor.

**W4 — P2.2 Guardrails-pagina** (`/marketing/guardrails`, SplitHeader family proof): de onbezette wig — "Elke agent kan content maken. Geen enkele weet of het on-brand is." Copy uit het P3.4-pakket (LP C), de 14 MCP-tools, de koppel-in-3-stappen, F-VAL-proof (bescheiden geframed per pilot-claim), CTA naar trial + connector-doc. Registratie in nav/footer/`sitemap-pages.ts`.

**W5 — P1.2 Publieke changelog** (`/marketing/changelog`): const-array-patroon (geen MDX — consistent met de site), geseed met ±8 recente user-facing releases in klanttaal (connector/MCP, browser-extensie, quick-create in de assistant, workspace-hernoemen, kloppende facturering, agents-roster, web-page-builder, F-VAL). Footer + sitemap-registratie. Wordt de vaste bron voor de LinkedIn-cadans (P1.1).

**Bewust NIET vannacht**: P2.3 vergelijkings-LP's (aparte concurrentie-claims verdienen daglicht-review — kandidaat voor de volgende sessie), en de legacy-sitemap `marketing/sitemap.ts` verwijderen (aparte kleine opruim-PR om de wijziging hier zuiver te houden — genoteerd).

## 3. Bewaking

- Alle nieuwe copy Nederlands, in de bestaande compositie-patronen (SplitHeader/families/tegels), geen nieuwe kleuren of frameworks.
- Cijfers uitsluitend uit `PLAN_CONFIGS`/`CREDIT_COSTS` — nooit literals.
- Claims-grens: F-VAL-cijfers bescheiden (briefing-gevoelig), geen autonomie-beloften, "werkt in Claude/ChatGPT" mag (is sinds vannacht feitelijk, flag staat aan).
- Gates: tsc/lint/build + Playwright-screenshotcheck van home/pricing/guardrails/changelog.
