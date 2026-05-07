---
id: <task-id-kebab-case>
title: <korte beschrijvende titel>
fase: <pre-launch | launch | post-launch>
priority: <now | next | later>
effort: <bv "2 dagen" | "1 week" | "4-6 uur">
owner: claude-code
status: <open | in-progress | blocked | done>
created: YYYY-MM-DD
completed: <YYYY-MM-DD bij done>
related-adr: <pad naar ADR | ->
related-spec: <pad naar spec | ->
worktree: <bv branddock-feat-<id> | -> als geen worktree>
---

# Probleem

<2-5 zinnen die het probleem of de motivatie beschrijven. Waarom is deze taak nodig? Wat is de huidige situatie en waarom voldoet die niet?>

# Voorstel

<2-5 zinnen over de aanpak op hoog niveau. Wat ga je bouwen, niet hoe in detail.>

# Acceptatiecriteria

- [ ] <criterium 1, observeerbaar resultaat>
- [ ] <criterium 2>
- [ ] <criterium 3>
- [ ] `npx tsc --noEmit` 0 errors
- [ ] `npm run lint` 0 errors
- [ ] Smoke-test uitgevoerd
- [ ] Documentatie bijgewerkt indien van toepassing

# Bestanden die ik aanraak

<Vooraf vastleggen om scope-creep te voorkomen. Parallel werkende agents lezen dit om overlap te vermijden.>

- `path/to/file1.ts`
- `path/to/file2.tsx`

# Bestanden die ik NIET aanraak

<Wat is buiten scope ondanks dat het verleidelijk is mee te nemen.>

- `path/to/file3.ts` — al af, niet refactoren in deze task

# Smoke test plan

<Concrete handmatige of geautomatiseerde test om te verifiëren dat het werkt.>

1. <stap 1>
2. <stap 2>
3. <verwacht resultaat>

# Risico's

- <risico 1 + mitigatie>
- <risico 2>

# Out of scope

- <feature die later kan>
- <verbetering die niet bij deze task hoort>

# Notes

<Optionele werkruimte voor links, beslissingen onderweg, gevonden gotchas. Mag groeien tijdens uitvoering.>
