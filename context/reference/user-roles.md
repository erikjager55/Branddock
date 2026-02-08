# Gebruikersrollen — Branddock

**Laatste update:** 2026-02-03

## Rollen Overzicht

| Rol | Beschrijving | Kan uitnodigen | Kan verwijderen | Kan facturatie zien |
|-----|-------------|---------------|----------------|-------------------|
| **Owner** | Eigenaar van de workspace | ✅ Alle rollen | ✅ Alle behalve zichzelf | ✅ |
| **Admin** | Beheerder | ✅ Member, Viewer | ✅ Member, Viewer | ✅ |
| **Member** | Teamlid | ❌ | ❌ | ❌ |
| **Viewer** | Alleen lezen | ❌ | ❌ | ❌ |
| **Guest** | Extern, beperkte toegang | ❌ | ❌ | ❌ |

## Permissies Per Domein

### Strategie
| Actie | Owner | Admin | Member | Viewer | Guest |
|-------|-------|-------|--------|--------|-------|
| Aanmaken | ✅ | ✅ | ✅ | ❌ | ❌ |
| Bewerken | ✅ | ✅ | ✅ (eigen) | ❌ | ❌ |
| Verwijderen | ✅ | ✅ | ❌ | ❌ | ❌ |
| Bekijken | ✅ | ✅ | ✅ | ✅ | 🔒 Gedeeld |

### Kennisbibliotheek
[Invullen per actie]

### Content Generatie
[Invullen per actie]

### Settings
[Invullen per actie]

### Facturatie
[Invullen per actie]

## Onboarding Flow
1. Owner maakt workspace aan
2. Owner nodigt teamleden uit via e-mail
3. Uitgenodigde accepteert → rol wordt toegewezen
4. Eerste login → onboarding wizard
