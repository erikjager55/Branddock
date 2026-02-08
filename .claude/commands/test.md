---
description: Run tests voor gewijzigde bestanden
---
changed_files=$(git diff --name-only HEAD~1)
Identificeer relevante tests. Run unit tests + e2e indien UI changes.
Rapporteer failures met fix-suggesties.
