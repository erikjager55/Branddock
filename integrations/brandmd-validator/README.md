# brandmd-validate

Validator for [BRAND.md](https://thebrand.md) files — the open brand-identity
standard that gives AI tools your brand context.

```bash
npx brandmd-validate path/to/BRAND.md
```

Checks two layers:

- **Spec conformance (0.2.0 / 0.3.0)** — follows the spec's `specVersion`
  resolution rules (absent = 0.2.0; malformed values error, never a silent
  fallback). Validates the required frontmatter (`name`, `tagline`, integer
  `version`, `language`) and the required sections per version, accepting the
  official 0.2 aliases (`Colors`/`Core Colors`, `Typography`/`Typefaces`,
  `Style`/`Art Direction`). Errors here fail the file (exit 1).
- **Full profile** (Branddock superset, additive) — `locales` / `validation` /
  `provenance` frontmatter, structured persona sub-entries under
  `Strategy > Audience`, `#### Do`/`#### Don't` lists under
  `Strategy > Guardrails`, and the `## Products & Services` /
  `## Channel Tones` sections. Reported, never required — parsers that only
  know the core simply skip them.

It also warns when a file contains `## Market Context` (the private extended
profile — never share those files) and reports `unvalidated` sections.

Dependency-free, Node ≥ 18, MIT.

No brand.md yet? Generate one from any website URL — free, no account:
**https://branddock.app/brandmd**

Full-profile documentation: `docs/specs/brand-md-full-profile.md` in the
Branddock repository. Upstream core spec: https://github.com/caiopizzol/brand.md
