---
id: marketing-composition-h4
title: Marketing-site compositie-herziening — Fase H4 (founder-foto, Oplossingen-screenshots)
fase: pre-launch
priority: now
effort: 2-4 uur
owner: claude-code
status: done
created: 2026-07-17
completed: 2026-07-17
related-adr: -
related-spec: -
worktree: branddock-marketing-composition-h4
---

# Probleem

Fase H4 van de compositie-herziening (zie `tasks/done/marketing-composition-v2.md`) stond bewust apart: About had geen visueel anker (geen foto), en beide Oplossingen-pagina's hadden nul productbewijs. Beide hadden assets nodig die niet meteen beschikbaar waren.

# Voorstel

**About**: Eriks portretfoto verwerkt in een founder-kaart in de Team-sectie (naam, rol, korte bio, rond uitgesneden foto).

**Oplossingen — marketingteams**: hergebruikt de bestaande `brand-alignment.png` (merk-check-screenshot) — geen nieuwe capture nodig, sluit inhoudelijk aan bij de "meetbare merkconsistentie"-pains/gains op die pagina.

**Oplossingen — bureaus**: nieuwe screenshot van de workspace-switcher (bewijs van multi-workspace-beheer). **Belangrijke afweging onderweg**: de echte agency-account (`erik@branddock.com`) heeft 16 workspaces met de échte namen van pilot-klanten (Linfi, PartnerSelect, Wassink Groep, DTS Ede, WRA Juristen, etc.) — die wilde ik niet ongevraagd publiek tonen. Erik koos voor de optie "placeholder-workspaces aanmaken": een aparte, lokale demo-AGENCY-organisatie ("Studio Noord") met 5 fictieve klantnamen (Havenstad Makelaars, Kade & Co, Lumen Kliniek, Meridian Retail, Noordlicht Reizen), puur voor de screenshot, direct daarna weer verwijderd uit de lokale dev-DB. Nul echte klantdata geraakt of geëxposeerd.

# Acceptatiecriteria

- [x] About-pagina toont Eriks foto in een founder-kaart (naam/rol/bio) in de Team-sectie
- [x] Oplossingen/marketingteams toont een productscreenshot (hergebruikt brand-alignment.png)
- [x] Oplossingen/bureaus toont een productscreenshot van de workspace-switcher, met uitsluitend fictieve klantnamen — geen echte pilot-klantnamen zichtbaar
- [x] `npx tsc --noEmit` 0 errors
- [x] `npm run lint` 0 errors
- [x] Lokale demo-organisatie/workspaces weer verwijderd uit de lokale dev-DB na de capture
- [x] Smoke-test: Playwright-screenshots van About + beide Oplossingen-pagina's, geen console-errors

# Bestanden die ik aanraak

- `src/app/marketing/about/page.tsx` — founder-kaart met foto
- `src/app/marketing/solutions/[slug]/page.tsx` — `screenshotPath`/`screenshotInset`-velden + rendering
- `public/marketing/team/erik-jager.jpg` (nieuw)
- `public/marketing/solutions/bureaus-workspaces.png` (nieuw)

# Bestanden die ik NIET aanraak

- Productie- of gedeelde dev-database — alle workspace/org-manipulatie gebeurde uitsluitend tegen de lokale dev-DB (`postgresql://erikjager:@localhost:5432/branddock`), nooit tegen Neon/prod
- Eriks echte 16 pilot-klant-workspaces onder "Branddock Agency" — niet aangeraakt, niet zichtbaar in enige screenshot

# Smoke test plan

1. Playwright: screenshot About-pagina — founder-kaart rendert correct, foto laadt
2. Playwright: screenshot Oplossingen/marketingteams — merk-check-screenshot zichtbaar tussen intro en pains/gains
3. Playwright: screenshot Oplossingen/bureaus — workspace-switcher-screenshot toont alleen fictieve namen
4. `npx tsc --noEmit` en `npm run lint` beide 0 errors

# Risico's

- Placeholder-workspace-namen mogen niet toevallig overlappen met een bestaande echte klant — gecontroleerd tegen de lijst van 16 echte workspace-namen, geen overlap

# Out of scope

- Verdere Oplossingen-uitbreidingen (bv. een derde doelgroep-pagina) — niet gevraagd

# Notes

Vervolg op `tasks/done/marketing-composition-v2.md` (H1-H3). Erik's founder-foto ontvangen als bijlage in de chat (16058499997 (1).jpeg via Downloads), verwerkt naar 560×560 JPEG. Beslissing over de klantnamen-privacy expliciet aan Erik voorgelegd via AskUserQuestion vóórdat er iets werd gecaptured — gekozen: placeholder-workspaces i.p.v. overslaan of vervagen.
