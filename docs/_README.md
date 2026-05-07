# docs/

Alle persistent documentatie. Niet-runtime instructies horen hier (CLAUDE.md is voor runtime context).

## Structuur

| Directory | Doel |
|---|---|
| `adr/` | Architecture Decision Records — beslissingen vergrendeld met datum + Y-statement |
| `playbooks/` | Hoe-doe-je-X gidsen (PATTERNS.md voorbeeld, performance benchmarks, AI-werk principes) |
| `specs/` | Feature specs — zowel gebouwd (`built-features/`) als toekomstig |
| `archive/` | Afgeronde of obsolete documenten — niet weggooien, maar niet meer in actieve scope |
| `fidelity/` | F-VAL specifieke specs en plannen |
| `changelog.md` | Chronologisch overzicht van wat is gebouwd (was de "ACTIELIJST" in oude CLAUDE.md) |

## Niet-genoemde bestanden

Sommige bestanden in `docs/` staan los van bovenstaande structuur (bv `brand-assets-field-specifications.md`, `voice-fingerprinting-ws2-protocol.md`). Die zijn vaak referentie-documenten met beperkte doelgroep. Wanneer ze obsolete worden: naar `archive/`. Wanneer ze actief gebruikt worden: laten staan op huidig pad.
