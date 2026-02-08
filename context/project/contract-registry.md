# Contract Registry — Branddock

**Laatste update:** 2026-02-03
**Beheerder:** Orchestrator Agent
**Regel:** Geen worker mag een contract wijzigen. Wijzigingen alleen via escalatie + ADR.
**Status:** Voorlopig — wordt definitief in Fase 3

---

## Overzicht

| Contract ID | Naam | Aanbieder | Afnemers | Status |
|------------|------|-----------|----------|--------|
| CTR-001 | UserContext | Auth & Users | Alle modules | 🔄 Draft |
| CTR-002 | PermissionCheck | Auth & Users | Alle modules | 🔄 Draft |
| CTR-003 | WorkspaceConfig | Workspace | Settings, Kennis, Strategie, ... | 🔄 Draft |
| CTR-004 | SubscriptionStatus | Betaalmodule | API Koppelingen, Content Gen | 🔄 Draft |
| CTR-005 | KnowledgeItems | Kennisbibliotheek | Strategie Generator, Content | 🔄 Draft |

---

## Contract Definities

### CTR-001: UserContext

**Aanbieder:** Auth & Users
**Afnemers:** Alle modules
**Type:** Synchrone functie-aanroep

```typescript
interface UserContext {
  userId: string;
  email: string;
  name: string;
  role: 'owner' | 'admin' | 'member' | 'viewer';
  workspaceId: string;
  permissions: Permission[];
  subscription: {
    plan: 'free' | 'starter' | 'pro' | 'enterprise';
    status: 'active' | 'trialing' | 'past_due' | 'canceled';
  };
}

// Hoe af te nemen:
function getCurrentUser(): Promise<UserContext>;
```

**Validatieregels:**
- userId is altijd een non-empty string (UUID v4)
- workspaceId is altijd aanwezig na onboarding
- permissions array kan leeg zijn (= geen expliciete permissies)

---

### CTR-002: PermissionCheck

**Aanbieder:** Auth & Users
**Afnemers:** Alle modules
**Type:** Synchrone functie-aanroep

```typescript
interface PermissionCheckRequest {
  userId: string;
  resource: string;      // bijv. 'strategy:123', 'knowledge:456'
  action: 'read' | 'write' | 'delete' | 'admin';
}

interface PermissionCheckResponse {
  allowed: boolean;
  reason?: string;       // alleen bij allowed: false
}

function checkPermission(req: PermissionCheckRequest): Promise<PermissionCheckResponse>;
```

---

### CTR-003: WorkspaceConfig
[Wordt uitgewerkt in Fase 3]

### CTR-004: SubscriptionStatus
[Wordt uitgewerkt in Fase 3]

### CTR-005: KnowledgeItems
[Wordt uitgewerkt in Fase 3]

---

## Wijzigingsproces

```
Worker detecteert dat contract niet past
        │
        ▼
Worker STOPT en rapporteert aan Orchestrator
        │
        ▼
Orchestrator analyseert impact:
├── Hoeveel modules geraakt?
├── Is het een breaking change?
└── Kan het backwards-compatible?
        │
        ▼
Orchestrator escaleert naar Erik met:
├── Huidige contract definitie
├── Voorgestelde wijziging
├── Impact analyse
└── Aanbeveling
        │
        ▼
Erik beslist → ADR wordt aangemaakt
        │
        ▼
Orchestrator update contract + notificeert alle workers
```
