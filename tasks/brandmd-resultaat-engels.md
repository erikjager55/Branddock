---
id: brandmd-resultaat-engels
title: Het conversiescherm van de gratis generator is Engels op een Nederlandse pagina
fase: post-launch
priority: next
effort: 2-4 uur (UI-copy + 6 bevindingen + 3 score-uitleggen; de keuze is groter dan het werk)
owner: unassigned
status: open
created: 2026-08-20
completed: -
related-adr: -
related-spec: docs/marketing/brand-md-touchpoints-2026-08-03.md
worktree: -
---

# Probleem

Gevonden bij de eerste end-to-end-toets van de funnel op productie (2026-08-20).

`/brandmd` is Nederlands: *"Geef elke AI-agent het geheugen van je merk"*, *"Plak je URL"*,
*"Genereer mijn brand.md"*. Maar het **resultaatscherm** — precies het moment waarop de bezoeker
zijn e-mailadres moet afgeven — is Engels:

> **Download your brand.md**
> Free — leave your email and your file downloads instantly. We'll also email you this full
> report with your download link, so you can pick it up on any device. No newsletter — just one
> reminder before your draft expires.

Met daartussen een Nederlandse placeholder (`jij@bedrijf.nl`). De taal wisselt dus middenin één
scherm.

Ook de **inhoud** komt Engels terug van de server, gemeten op een echte run:

- 6 bevindingen in `src/lib/brandmd/findings.ts` — *"Your tone of voice is recognizable…"*
- 3 score-uitleggen uit `src/lib/brandmd/score.ts` — *"9 of 10 core areas filled — missing:
  guardrails."*

De client rendert die rechtstreeks (`generator-client.tsx:277`); er zit geen vertaallaag tussen.

**Waarom dit telt**: dit is het conversiepunt van het enige acquisitiekanaal. De bezoeker leest
drie schermen Nederlands, en krijgt op het moment van betalen-met-een-e-mailadres opeens Engels.
Dezelfde klasse als de `lang="en"`-bug van 18-08: een Nederlandse pagina met een Engels
artefact, waar niemand over viel omdat het niet crasht.

# Voorstel

Eén beslissing eerst, want half vertalen is slechter dan consistent Engels:

**A. Alles Nederlands** — past bij de rest van `/brandmd` en bij de NL-MKB-doelgroep uit het
merk-DNA. Nadeel: het launch-plan is EN-first (Show HN, Product Hunt, upstream), dus bij de
internationale golf moet het alsnog tweetalig.

**B. Alles Engels** — consistent met het launch-plan, maar de Nederlandse hero en de NL-placeholder
moeten dan mee, en dat botst met de huidige NL-first-site.

**C. Tweetalig** — `renderLayout` kent al een `locale`, en de scan detecteert de taal al correct
(`language: nl` in het gegenereerde bestand). Meeste werk, maar het is de enige variant die
zowel de NL-funnel als de internationale golf bedient.

Zonder die keuze is dit geen uitvoerbare taak.

# Acceptatiecriteria

- [ ] Besluit van Erik vastgelegd (A, B of C) met de reden
- [ ] Geen taalwissel binnen één scherm — geverifieerd op de gerenderde productiepagina
- [ ] Bevindingen en score-uitleg volgen dezelfde taal als de UI eromheen
- [ ] Bewaker die een taalwissel op `/brandmd` vangt (naar het patroon van `smoke:document-lang-browser`)
- [ ] `npx tsc --noEmit` 0 errors

# Bestanden die dit raakt

- `src/app/brandmd/generator-client.tsx` — resultaatpaneel + gate-copy
- `src/lib/brandmd/findings.ts` — 6 teksten
- `src/lib/brandmd/score.ts` — 3 dimensie-uitleggen

# Out of scope

- Het gegenereerde BRAND.md-bestand zelf. Dat is voor een AI-agent bedoeld en de spec is Engels;
  `language: nl` in de frontmatter is de juiste plek voor de merktaal.
- De e-mail-gate als mechanisme (zie #520 en launch-plan §4b — apart besluit).

# Notes

Gemeten met een echte generator-run op `betterbrands.nl`: HTTP 200 in 20,5s, Brand Score 82,
4 bevindingen, alle 5 secties `unvalidated`. De eerlijkheidsmarkering werkt precies zoals
beloofd; alleen de taal wisselt.
