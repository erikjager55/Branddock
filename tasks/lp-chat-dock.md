---
id: lp-chat-dock
title: B1 — conversationeel bewerken: structurele Claw-tools + chat-ingang in Step 3
fase: launch
priority: now
effort: 5-7 dagen (gerealiseerd compacter door hergebruik confirm-machinerie)
owner: claude-code
status: done
created: 2026-08-12
completed: 2026-08-12
related-adr: docs/adr/2026-08-07-puck-exit-sectie-editor.md
related-spec: docs/specs/2026-08-07-webpage-builder-verbeterplan.md
worktree: claude/puck-editor-improvement-y9ep4x (remote sessie)
---

# Probleem

De Brand Assistant kon alleen tekst bewerken op webpagina's; de assembler-
instructie zei letterlijk "you cannot add/remove/reorder components". Voor
prompt-first bewerken als hoofdinteractie (verbeterplan Fase B) moet de chat
ook structuur aankunnen — binnen dezelfde vangrails als elke andere editlaag.

# Voorstel

Nieuwe Claw-write-tool `update_landing_page_structure` (add/remove/move/
duplicate, batch alles-of-niets) op de gedeelde `section-edit-tools`-kernel
(zelfde guards als de hover-toolbar: verplichte secties per type, locks,
registry-vocabulaire), via het bestaande propose→confirm-mechanisme
(`requiresConfirmation` + buildProposal met leesbare changes). Read-tool
uitgebreid met sectie-overzicht (id/type/volgorde/lock) als adresboek.
Assembler-instructie 5 herschreven. Chat-ingang: "Chat met je pagina"-knop
in de builder-header (opent de bestaande Brand Assistant; page-awareness
scoped het gesprek al op dit deliverable).

# Acceptatiecriteria

- [x] `update_landing_page_structure` met dry-run in buildProposal (voorstel is gegarandeerd uitvoerbaar) + defence-in-depth re-run in execute + hero-preserve chokepoint + cache-invalidatie
- [x] Guard-weigering geeft model + user een uitlegbare reden (required/locked/not-found/unknown-type/out-of-bounds)
- [x] `read_landing_page_content` levert sectie-overzicht; tip verwijst naar beide tools
- [x] Assembler-instructie 5: structuur-capaciteit + weigering-uitleg; beelden/links/kleuren blijven expliciet uit scope
- [x] "Chat met je pagina"-knop (i18n en/nl) in PuckLayoutWrapper
- [x] Kernel-batch getest: phase47 20/20 (alles-of-niets, reason+opIndex, geen input-mutatie)
- [x] tsc + eslint 0 errors op geraakte bestanden

# Scoping-besluiten

- **Confirm-per-tool i.p.v. bespoke batch-diff-modal**: de bestaande Claw-
  confirm toont per operatie een leesbare change-rij; consistent met alle
  andere write-tools. Een visuele voor/na-diff in de chat is een latere
  verfijning (herbeoordelen op accept-ratio-data, ADR-trigger 6).
- **`swap_section_pattern`** volgt in C-spoor (pattern-bibliotheek eerst).
- Multi-turn verfijning ("iets minder schreeuwerig") komt gratis uit de
  bestaande chat-loop; geen aparte state nodig.

# Notes

Files: `src/lib/landing-pages/section-edit-tools.ts` (applyStructureOperations),
`src/lib/claw/tools/write-tools.ts`, `src/lib/claw/tools/read-tools.ts`,
`src/lib/claw/context-assembler.ts`,
`src/features/campaigns/components/canvas/medium/PuckLayoutWrapper.tsx`,
i18n medium-catalogs en/nl, phase47-smoke.
