# Branddock Changelog

Chronologisch overzicht van wat is gebouwd. Wordt automatisch bijgewerkt door de `task-finalize` skill na elke afgeronde task.

## Hoe te navigeren

| Periode | Plek | Format |
|---|---|---|
| **Entry #1 t/m #221** (R0.1 → BSTY-FONTS, dec 2025 - mei 2026) | `docs/archive/old-lists/CLAUDE-original-2026-05-07.md` "ACTIELIJST" sectie | Originele oude format, niet gemigreerd om tijd te besparen — volledig grep-baar |
| **Entry #222+** (vanaf 2026-05-07) | dit bestand, h2 per maand | Nieuw gestandaardiseerd format (zie hieronder) |

**Waarom niet alles gemigreerd?** De 221 historische entries vertegenwoordigen ~6 maanden zwaar werk en zijn perfect doorzoekbaar in het archief. Manueel reformatteren zou een dag werk kosten zonder substantiële winst — een grep door het archief geeft hetzelfde resultaat.

**Voor zoekvragen** "wanneer was X gebouwd?" of "wat deden we met Y?":
```bash
grep -n "<zoekterm>" docs/archive/old-lists/CLAUDE-original-2026-05-07.md
```

---

## Format per entry (vanaf #222)

```markdown
### <number>. <Task title>

<1-2 zin samenvatting van wat gebouwd werd en hoe het werkt.>

- Task: [tasks/done/<id>.md](tasks/done/<id>.md)
- ADR: <link of `-`>
- Spec: <link of `-`>
- Commit: <short hash>
```

Numbering wordt auto-incremented door `task-finalize` skill, doorgaand vanaf #222.

---

## 2026-05

### 222. Documentatie-architectuur migratie (week 1)

CLAUDE.md teruggebracht van 2323 → 270 regels, repo root van 37 → 5 .md bestanden. Nieuwe `docs/` structuur (adr/playbooks/specs/archive), `tasks/<id>.md` pattern, `roadmap.md` met Now/Next/Later, `START_HERE.md` als entry point, 8 retroactieve ADRs en `docs/changelog.md` als doorgaand register.

- Task: [tasks/done/docs-migration-week-1.md](../tasks/done/docs-migration-week-1.md)
- ADR: [adr/2026-05-07-claude-md-restructure.md](adr/2026-05-07-claude-md-restructure.md), [adr/2026-05-07-tasks-as-files.md](adr/2026-05-07-tasks-as-files.md)
- Spec: -
- Commit: <hash>

### 223. Backlog herstructurering — open plans + roadmap items naar tasks/

13 NOW + Next-bucket roadmap-items gedistilleerd naar `tasks/<id>.md` files volgens template (campaign-drafts, claw-page-awareness, power-user-shortcuts, hooks-routines-week-3, stripe-billing-live, vercel-deployment, pilot-onboarding-better-brands, posthog-sentry-browser, canvas-inline-edit-overlays, bv-wire-w1-full-centroid, content-styling-migratie, tech-debt-any-types, auto-trigger-fidelity-scoring). Roadmap-links bijgewerkt, originele plan-docs in archive gemarkeerd als gedistilleerd.

- Task: [tasks/done/tasks-migration-week-2.md](../tasks/done/tasks-migration-week-2.md)
- ADR: [adr/2026-05-07-tasks-as-files.md](adr/2026-05-07-tasks-as-files.md)
- Spec: -
- Commit: <hash>

### 224. Hooks + skills + subagents + eerste autonome routine (week 3)

`.claude/settings.json` met PostToolUse Edit hook (tsc + eslint via `post-edit-typecheck.sh`), PreToolUse Bash hook (`check-dangerous-bash.sh`), Stop hook (`session-summary.sh`). Skills `pre-commit` en `adr-create` toegevoegd naast bestaande `task-finalize`. Subagents `code-reviewer`, `regression-detector`, `doc-keeper`. Eerste autonome routine `nightly-doc-sync.yml` (02:00 NL, max 50K tokens) — eerste handmatige run + cost-monitoring blijven handover-items voor user.

- Task: [tasks/done/hooks-routines-week-3.md](../tasks/done/hooks-routines-week-3.md)
- ADR: -
- Spec: [playbooks/working-flow.md](playbooks/working-flow.md)
- Commit: <hash>
