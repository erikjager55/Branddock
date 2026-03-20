# Gotchas

Lessons learned from past mistakes. Read this at the start of every session.

## 2026-03-20: AI prompt ↔ TypeScript interface mismatch (Website Scanner)

**What went wrong:** The AI prompts in `website-scanner.ts` defined response keys (`purposeWheel`, `brandHouseValues`) and inner structure (`{ confidence, frameworkData }`) that didn't match the TypeScript interfaces (`purposeStatement`, `coreValues`, `{ data, confidence }`). Since `createClaudeStructuredCompletion` doesn't validate against the TS type at runtime, the data came back with the AI's keys but the mapper tried to read the type's keys → everything was `undefined`.

**Rule:** When writing AI prompts that return structured JSON, always verify the prompt's response schema matches the TypeScript interface field-for-field. Check both key names AND nested structure. The TypeScript type is just a cast — it doesn't enforce anything at runtime.

## 2026-03-20: Spreading raw AI fields into Prisma create() (Website Scanner)

**What went wrong:** AI-generated persona/product/competitor fields were spread directly into `Prisma.create()` via `...persona.fields`. The AI returned fields not on the Prisma model (`companySize`, `targetAudience`, `personality` instead of `personalityType`), causing "Unknown arg" errors.

**Rule:** Never spread AI-generated data directly into Prisma operations. Always sanitize through a field whitelist first.
