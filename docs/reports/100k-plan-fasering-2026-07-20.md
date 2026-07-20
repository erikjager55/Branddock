# Fasering €100k-plan — go/no-go per fase

> **Bron**: "Verbeterplan: route naar €100.000 per maand" (business-coachplan, 19-07-2026) + actuele stand van de codebase (20-07-2026).
> **Werkwijze**: Erik geeft per fase go/no-go; Claude bouwt een fase pas na expliciete go. Elke fase levert zelfstandig waarde en is los te stoppen.
> **Al gedekt vóór deze fasering**: registry-publicatiepakket (ClawHub/n8n/MCP-directories, publiceren = Erik) · vergelijkingspagina's NL · bewijs-voorop-hero + doelgroep-segmentatie · publieke changelog + aankondigingsbalk · Remi's weekrapport (agent) · pilot-metrics-endpoint · niet-doen-lijst geborgd (geen nieuwe agents/contenttypes/BC-3; Lex geschrapt conform coachplan).

## Fase 0 — Meetfundament (KPI-boom) — ±1 dag Claude

**Wat**: activatie-event instrumenteren (merk-DNA compleet + eerste goedgekeurde uiting = het echte aha-moment), funnel zichtbaar (bezoek → aanmelding → activatie → betaald → churn) en netto nieuwe MRR per dag als noordster-getal, op een simpel dashboard.
**Waarom eerst**: de vier kwartaalgates en het maandag-ritme uit het plan zijn zonder deze cijfers niet te bewaken; elke volgende fase wil je hieraan afmeten.
**Erik bij go**: niets — alleen straks elke maandag kijken.
**Niet in deze fase**: geen nieuwe events verzinnen buiten de KPI-boom.

## Fase 1 — Agent-kanaal vindbaar (A1 + A2-rest) — ±1-2 dagen Claude

**Wat**: publieke GitHub-repo-inhoud: `SKILL.md` (agents leren via de bestaande API merkcontext ophalen, on-brand genereren, F-VAL-checken) + een lichte CLI (naar het model van postiz-agent), README en voorbeelden. Registry-aanmeldingen klaargezet met de juiste teksten.
**Erik bij go**: repo public maken (of ik zet hem klaar onder jouw account na jouw akkoord) + de publicatieknoppen: ClawHub, MCP-directories, n8n-npm.
**Waarom nu**: "onvindbaar zijn in dit kanaal is hetzelfde als niet bestaan" — en het is dagen, geen maanden, omdat de MCP-laag er al is.

## Fase 2 — Gratis merk-scan (A5) — ±2-3 dagen Claude

**Wat**: publieke pagina op de site: URL invoeren → merk-scan (hergebruik website-scan + F-VAL-motor) → score + drie concrete bevindingen → deelbare resultaatpagina met instap-CTA. Rate-limiting + metadata-logging; scan-resultaten voeden de funnel uit Fase 0.
**Waarom**: het aha-moment-in-5-minuten voor Jesse, het saleswapen voor bureau-gesprekken (scan de klant vóór de demo), het linkbait-anker — de grootste PLG-hefboom uit het plan.
**Erik bij go**: geen besluit nodig behalve de go zelf; het pricing-experiment "scan als permanente instap" blijft een apart maandbesluit (we meten eerst).

## Fase 3 — Agent-LP's + EN-start (A3 + B-deel) — ±2 dagen Claude

**Wat**: programmatische landingspagina's per agent × use-case (`/claude/on-brand-content`, `/chatgpt/brand-guidelines`, `/n8n/brand-check`, …) — EN eerst, NL ernaast; plus de Frontify-vergelijkingspagina (Frontify staat al als concurrent in het merk-DNA) en een EN-hero op de agent-pagina's.
**Waarom**: het bewezen Postiz-draaiboek dat concurrenten nu kopiëren; SEO-massa in het kanaal waar jouw kans ligt, dat Engels praat.
**Erik bij go**: kort akkoord op de EN-kernzin ("Give every AI agent your brand memory…").

## Fase 4 — brand.md als open standaard (A4) — ±2 dagen Claude

**Wat**: de `brand.md`-specificatie (open bestandsformaat: zo geeft elk merk zijn merk-DNA aan elke agent), een gratis generator (website-URL → eerste brand.md via de bestaande scan) en een landingspagina. Elk brand.md-bestand in omloop verwijst naar Branddock als levend fundament.
**Erik bij go**: naamgeving/positionering-akkoord (dit is een publieke standaard-claim).

## Fase 5 — Witlabel-klantrapport v1 (D/retentie) — ±1-2 dagen Claude

**Wat**: Remi's wekelijkse merkrapport doorstuurbaar maken voor bureaus: klantlogo, nette export (PDF/link), "doorleverbaar aan je klant, op schema". Dit is het churn-anker én het demo-materiaal voor de bureau-outbound.
**Erik bij go**: dit raakt het witlabel/agency-plus-pricing-experiment — bouw v1 is los te geven, de tier-prijs (€599-699?) blijft jouw maandexperiment.

## Fase 6 — Golf-draaiboek + ecosysteem-templates (C) — ±1 dag Claude

**Wat**: het klaarliggende-golf-pakket (monitoringlijst agent-frameworks, LP-template, SKILL/connector-sjabloon, launchpost NL/EN) + kant-en-klare n8n/Make-flow-templates ("on-brand nieuwsbrief-flow", "social-flow met merk-check").
**Waarom**: reactietijd <72 uur als het volgende OpenClaw-moment komt — meesurfen is voorbereiding.

## Fase 7 — EN site-breed (B) — groter, bewust laat

**Wat**: volledige tweetalige marketing-site. Pas zinvol ná bewijs uit Fase 3 dat het EN-kanaal instroom levert (Gate 3-criterium: EN ≥30% van instroom).
**Erik bij go**: dit is de grootste investering; besluit op basis van Fase-3-data.

## Doorlopend (geen go nodig — loopt al of is Erik-only)

Maandag-cijfers + weekritme · LinkedIn-cadans (start 21-07) · pilotfocus peildatum 28-07 · founding-aanbod/outbound/beslisgesprekken (Erik) · pricing-experimenten één per maand (Erik-besluit) · publicatieknoppen uit Fase 1.

## Vangrails (gelden voor alle fasen)

Niet-doen-lijst uit het plan: geen nieuwe agents, geen nieuwe contenttypes, geen BC-3/autopilot-claims, geen betaalde ads onder 40% activatie, geen tweede product. Merkregels (nuchter, bewijs, "jij keurt goed") op alles.
