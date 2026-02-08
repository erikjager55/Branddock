# Beslissingen Log

Chronologisch overzicht van alle projectbeslissingen. Voor grote architectuurkeuzes, zie [ADR index](../adr/_index.md).

| ID | Datum | Beslissing | Rationale | Impact | Genomen door |
|----|-------|-----------|-----------|--------|-------------|
| D-001 | 2026-02-03 | Markdown als bron van waarheid (niet Notion) | Claude Code/Warp kan niet bij Notion lezen; markdown is Git-tracked en @-refereerbaar | Heel project | Erik + Claude |
| D-002 | 2026-02-03 | Orchestrator pattern boven extern framework (claude-flow) | Vermijdt framework-overhead; alles in markdown — doorzoekbaar voor mens én AI | Fase 4 architectuur | Erik + Claude |
| D-003 | 2026-02-03 | Route A (html.to.design) voor Figma pipeline | Levert bewerkbare Figma Design bestanden op die via MCP geautomatiseerd analyseerbaar zijn | Fase 1 workflow | Erik + Claude |
