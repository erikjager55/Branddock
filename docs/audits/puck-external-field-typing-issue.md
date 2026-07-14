# Puck v0.21.2 — `external` field typing-mismatch on custom row shapes

> **Status**: OBSOLETE — NIET ingediend (check 2026-07-14). Upstream opgelost in
> `@puckeditor/core@0.22.x`: `mapRow` accepteert nu elke row-shape en mag
> `Record<string, string | number | ReactElement>` teruggeven (hun issue #506,
> closed met een typing-PR); `fetchList`/`mapProp` zijn `any`-getypeerd, dus de
> `string | null`-collapse uit dit rapport bestaat niet meer. Restpunt is hooguit
> een nette generic i.p.v. `any` — een voorkeur, geen blokkade. Actie verplaatst
> naar `tasks/web-page-builder-acceptance-rest.md`: upgrade 0.21.2 → 0.22.x
> overwegen (ontgrendelt `external`-velden voor bv. de persona-picker).
> **Reporter**: Branddock dev team
> **Found**: 2026-05-22 during spike-validation of Puck integration for our visual page builder
> **Worktree branch**: `branddock-feat-web-page-builder-canvas`

---

## Summary

`@puckeditor/core@0.21.2` external-field type signatures don't accept
custom row-shapes — `mapRow` / `mapProp` / `getItemSummary` are typed as
if the row is always `string | null`, which breaks when consumers want to
expose a list of `{ id, name }` objects (or any other shape) via
`fetchList`.

In our case we wanted to expose the workspace's personas (`{ id: string;
name: string }`) as a dropdown via `external`, but had to fall back to the
plain `select` field because the type errors blocked any `as` casts that
would have rolled cleanly through `tsc --strict`.

## Reproduction

```bash
mkdir puck-external-repro && cd puck-external-repro
npm init -y
npm install react@19.2.3 react-dom@19.2.3 typescript @puckeditor/core@0.21.2
```

Create `repro.tsx`:

```tsx
import type { Config } from '@puckeditor/core';

type Row = { id: string; name: string };

type Props = {
  PersonaCta: { personaId: string };
};

const config: Config<Props> = {
  components: {
    PersonaCta: {
      fields: {
        personaId: {
          type: 'external',
          placeholder: 'Pick persona…',
          // ── These three callbacks are typed against `string | null` rather
          // than the row-shape returned by `fetchList`. The cast-friendly
          // workarounds (`as never`, `as unknown as ...`) all fail under
          // tsc --strict.
          fetchList: async () => [{ id: 'p1', name: 'Marit' }],
          mapProp: (row) => row?.id ?? null,
          mapRow: (row) => ({ id: row.id, name: row.name }),
          getItemSummary: (row) => row?.name ?? 'No persona',
        },
      },
      defaultProps: { personaId: '' },
      render: ({ personaId }) => <span>{personaId}</span>,
    },
  },
};
```

Run `npx tsc --noEmit repro.tsx --strict --jsx react`.

## Expected behaviour

`fetchList` returns rows of type `R`; `mapRow`/`mapProp`/`getItemSummary`
all receive `R | null`. The current types collapse `R` to `string`.

## Actual behaviour

```
repro.tsx(15,11): error TS2322: Type '(row: { id: string; name: string; } | null) => string' is not assignable to type '((item: string | null, index?: number | undefined) => ReactNode) | ((item: string | null, index?: number | undefined) => ReactNode) | undefined'.
```

`mapRow` callback type expects `(item: string | null) => ReactNode`,
making it impossible to use rich row-shapes without disabling
type-checking.

## Workaround (what we shipped in Branddock)

Switched the persona-picker to `type: 'select'` with a pre-computed
options array from `CanvasContextStack.personas`:

```tsx
{
  personaId: {
    type: 'select',
    options: [
      { label: '— Geen persona —', value: '' },
      ...personas.map((p) => ({ label: p.name, value: p.id })),
    ],
  },
}
```

This works perfectly for ≤20 items / no async-fetch / no search. The
trade-off is that we can't power large lists or live-search fields with
`external` until the typing is fixed.

## Suggested fix

Re-introduce the generic row-type on `ExternalField<R>` (or
`ExternalFieldWithAdaptor<R>`) so consumers can declare the shape:

```ts
type ExternalField<R = unknown> = {
  type: 'external';
  placeholder?: string;
  fetchList: () => Promise<R[]>;
  mapProp: (row: R | null) => unknown;
  mapRow?: (row: R) => R;
  getItemSummary?: (item: R | null) => ReactNode;
};
```

Backwards compat: keep `R = unknown` as default so existing callers
without explicit `R` still type-check; new callers can narrow via
`type: 'external' as const` + per-field generic.

## Related

- Puck docs page (does not yet show this typing): <https://puckeditor.com/docs>
- Our spike memo with full reproduction context: `docs/audits/2026-05-22-landing-page-builder-puck-spike.md` (private — Branddock-internal)
- Affected packages: `@puckeditor/core` (latest 0.21.2 confirmed; not tested on 0.21.0-0.21.1 or future)

---

## Internal note for Branddock team (delete before filing)

This draft is ready to submit verbatim. To file:

1. Copy everything above the "Internal note" line
2. Open <https://github.com/puckeditor/puck/issues/new>
3. Title: "external field type signatures collapse custom row-shapes to string | null"
4. Paste, submit, link the issue # back in the MVP task-file

If the maintainers ask for a minimal reproduction repo, the snippet above
is self-contained. We don't need to share Branddock's actual repo.
