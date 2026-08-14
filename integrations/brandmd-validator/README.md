# brandmd-validate

Validator for [brand.md](https://thebrand.md) files — the open brand-identity
standard that gives AI tools your brand context.

```bash
npx brandmd-validate path/to/brand.md
```

Checks two layers:

- **Core (v0.2)** — YAML frontmatter with `name`, `version`, `language` and the
  `## Strategy` / `## Voice` / `## Visual` sections. Errors here fail the file
  (exit 1).
- **Full profile** (Branddock superset, additive) — `locales` / `validation` /
  `provenance` frontmatter and the `## Audience` / `## Products & Services` /
  `## Channel Tones` / `## Guardrails` sections. Reported, never required —
  parsers that only know the core simply skip them.

It also warns when a file contains `## Market Context` (the private extended
profile — never share those files) and reports `unvalidated` sections.

Dependency-free, Node ≥ 18, MIT.

No brand.md yet? Generate one from any website URL — free, no account:
**https://branddock.app/brandmd**

Full-profile documentation: `docs/specs/brand-md-full-profile.md` in the
Branddock repository. Upstream core spec: https://github.com/caiopizzol/brand.md
