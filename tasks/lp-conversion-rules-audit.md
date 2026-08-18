---
id: lp-conversion-rules-audit
title: "Historische conversie-promptset naast de huidige per-paginatype generatorregels leggen"
fase: post-launch
priority: later
effort: 0.5-1d
owner: claude-code + Erik (levert bronmateriaal)
status: blocked
created: 2026-08-16
related-spec: docs/specs/2026-08-07-webpage-builder-verbeterplan.md
worktree: -
---

# Probleem

Erik gebruikte in het verleden een set prompts/regels voor goed converterende
pagina's, per paginatype (livegang-gesprek 2026-08-14). De huidige generator
draagt per type een eigen regelset in `variant-generator.ts` (LP: 16 regels —
single-CTA-discipline, descriptieve headline ≤60, features 3-5 met anchoring,
FAQ dekt koopbarrières, PAS-narratief, micro-commitment-CTA, …; product/microsite/
FAQ eigen sets; long-form = GEO/citeerbaarheid, bewust geen conversie-opdracht).
Nooit geverifieerd is of de historische set punten bevat die in de huidige regels
ontbreken.

# Blokkade

Wacht op bronmateriaal: **Erik zoekt de oude promptset op** (niet in de repo of
git-historie aangetroffen; vermoedelijk pre-rewrite Brandshift/ULTIEM-era).
Zonder die set is dit niet uitvoerbaar — status `blocked`.

# Scope (na aanlevering)

1. Oude set naast de huidige per-type regels leggen; per regel: gedekt /
   gedeeltelijk / ontbreekt.
2. Ontbrekende regels met aantoonbare conversie-rationale toevoegen aan de juiste
   type-opdracht (LP-regels alleen uitbreiden, niet herformuleren — golden-set
   bewaakt de regressie).
3. Golden-set draaien (blog-post + LP) — pass-rate mag niet onder de drempel.

# Acceptatiecriteria

- [ ] Vergelijkingstabel oud vs. huidig in dit bestand of `docs/specs/`
- [ ] Ontbrekende regels toegevoegd + golden-set ≥ drempel
- [ ] Of expliciet: "oude set volledig gedekt, geen wijziging nodig"
