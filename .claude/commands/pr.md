---
description: Commit, push en maak PR
---
git_status=$(git status --short)
branch=$(git branch --show-current)
diff_stat=$(git diff --stat)

Maak een commit (conventional commits format), push naar origin/$branch,
en open PR met samenvatting, testing, en breaking changes.
