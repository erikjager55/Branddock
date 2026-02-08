# Dependency Graph — Branddock

**Laatste update:** 2026-02-03
**Beheerder:** Orchestrator Agent
**Status:** Voorlopig — wordt definitief in Fase 2/3

---

## Module Overzicht

| Module | Biedt aan (provides) | Heeft nodig (requires) | Laag |
|--------|---------------------|----------------------|------|
| Auth & Users | user-context, permission-check | — | 1 |
| Workspace | workspace-config, tenant-context | user-context | 1 |
| Settings | user-prefs, notification-config | user-context, workspace-config | 2 |
| Kennisbibliotheek | knowledge-items, search-index | workspace-config, permission-check | 2 |
| Betaalmodule | subscription-status, quota-check | user-context, workspace-config | 2 |
| Strategie Generator | strategy-data, brand-profile | knowledge-items, workspace-config | 3 |
| API Koppelingen | external-data, sync-status | workspace-config, subscription-status | 3 |
| Content Generator | generated-content | strategy-data, knowledge-items, quota-check | 4 |
| ... | ... | ... | ... |

> ⚠️ Dit is een voorlopige inschatting. De definitieve graph wordt bepaald na Fase 2 (Component Definitie) en Fase 3 (Spec-Interviews).

## Laag Berekening

Laag = 1 + max(laag van alle requires)

```
Laag 1: Auth & Users, Workspace             ← geen afhankelijkheden, start direct
Laag 2: Settings, Kennis, Betaalmodule       ← wacht op Laag 1
Laag 3: Strategie, API Koppelingen           ← wacht op Laag 2
Laag 4: Content Generator                    ← wacht op Laag 3
Laag 5: ...                                  ← wacht op Laag 4
```

## Kritieke Paden

Het langste pad door de graph bepaalt de minimale doorlooptijd:

```
Auth → Workspace → Kennisbibliotheek → Strategie Generator → Content Generator
  L1       L1              L2                   L3                    L4
```

## Circulaire Afhankelijkheden

⚠️ ALS twee modules elkaar nodig hebben, is er een circulaire afhankelijkheid. Oplossing: definieer een interface-contract zodat beide modules onafhankelijk gebouwd kunnen worden tegen het contract.

| Module A | Module B | Opgelost via |
|----------|----------|-------------|

## Visualisatie

```
Auth ─────► Workspace ─────► Kennisbibliotheek ─────► Strategie ─────► Content
  │              │                    │                     │
  │              ├────► Settings      │                     │
  │              │                    │                     │
  │              ├────► Betaalmodule ─┤                     │
  │              │         │          │                     │
  │              │         ▼          │                     │
  │              └────► API Koppelingen                     │
  │                                                         │
  └── user-context wordt door ALLES gelezen ───────────────┘
```
