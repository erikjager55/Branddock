# Begrippen & Definities — Branddock

**Laatste update:** 2026-02-03

## Platform Begrippen

| Term | Definitie | Context |
|------|----------|---------|
| **Workspace** | De hoofdcontainer voor een organisatie/merk. Alle data leeft binnen een workspace. | Multi-tenant: elke klant heeft 1+ workspaces |
| **Campaign** | Een georganiseerde set content rondom een specifiek doel of thema | Vervangt eerder concept "Project" |
| **Strategy** | De merkstrategie: positionering, tone of voice, doelgroep, waarden | Pijler 1 van het platform |
| **Knowledge Base** | Kennisbibliotheek met documenten, bronmateriaal, en brand assets | Pijler 2: input voor AI generatie |
| **Content** | Door AI gegenereerde of handmatig gemaakte marketing content | Pijler 3: output van het platform |
| **Brand Voice** | De unieke schrijfstijl en toon van een merk | Onderdeel van Strategy |
| **Validation** | Onderzoek om strategie te valideren (interviews, enquêtes, workshops) | Onderdeel van de research flow |
| **AI Exploration** | AI-gestuurde verkenning van strategische mogelijkheden | Research methode |

## Technische Begrippen

| Term | Definitie |
|------|----------|
| **Context Library** | De `context/` mappenstructuur met alle projectkennis in markdown |
| **Component Portal** | Eén navigatiebestand per component dat linkt naar alle gerelateerde info |
| **Orchestrator** | De coördinerende agent die workers aanstuurt in Fase 4 |
| **Worker** | Een individuele agent die één module bouwt in een eigen git worktree |
| **Contract** | Een gedeelde TypeScript interface tussen modules, immutable tijdens development |
| **ADR** | Architecture Decision Record — formele vastlegging van architectuurkeuzes |
| **Scratchpad** | Agent werkgeheugen dat persisteert tussen sessies |

## Feature Prioriteiten

| Label | Betekenis |
|-------|----------|
| **Must** | Zonder dit werkt de app niet (MVP) |
| **Should** | Verwacht door gebruikers, workaround mogelijk (V1.1) |
| **Could** | Mooi om te hebben (Later) |
| **Won't** | Bewust uitgesteld (niet nu) |
