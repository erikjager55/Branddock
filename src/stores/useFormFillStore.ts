import { create } from 'zustand';

/**
 * Form-fill registry for the Brand Assistant `fill_form_fields` tool.
 *
 * Pages that want the AI to be able to fill their editable fields register
 * a list of {key, label, currentValue, setter} triples on mount and clear
 * them on unmount. The InputBar reads `fields` to include in pageContext;
 * MutationConfirmCard calls `applyFill` after the user confirms a proposal.
 *
 * Keys use the same bracket notation as `lib/utils/deep-set` for nested
 * fields (e.g. `goals[0].title`) — the page's setter is responsible for
 * the per-key write. This store does not interpret bracket notation; it
 * simply routes the value to the registered setter.
 */
export interface FormFillField {
  /** Stable identifier — the AI references this in `fill_form_fields` calls. */
  key: string;
  /** User-readable label shown in the MutationConfirmCard preview. */
  label: string;
  /** Current value preview — string for textareas, joined for arrays, null when empty. */
  currentValue: string | null;
  /** Setter the page provides; receives the AI-proposed value as `unknown`. */
  setter: (value: unknown) => void;
  /**
   * Optionele groep-id voor flush-batching. Velden die dezelfde groupId
   * delen worden samen geflushed via één call naar `flush` na alle setters.
   * Voorbeeld: alle 4 brief-fields delen groupId='brief' + één flushBrief
   * handler die N parallel-PATCH races vervangt door 1 expliciet PATCH.
   * (F10 fix — audit 2026-05-13.)
   */
  groupId?: string;
  /** Per-groupId expliciete save-handler. Genegeerd wanneer groupId ontbreekt. */
  flush?: () => void | Promise<void>;
}

export interface FormFillAssignment {
  key: string;
  value: unknown;
}

export interface FormFillResult {
  applied: string[];
  missing: string[];
}

interface FormFillStore {
  /** Currently-registered fields. Empty when no page is mounted that registers any. */
  fields: FormFillField[];
  /** Replace the registered field-set. Pages call this on mount or when the field-set changes. */
  registerFields: (fields: FormFillField[]) => void;
  /** Clear registered fields. Pages call this on unmount. */
  clearFields: () => void;
  /**
   * Apply a list of {key, value} assignments to the registered setters.
   * Returns which keys were applied vs missing — caller can surface missing
   * keys back to the user as a hint that the AI proposed a key that no page
   * is currently exposing.
   */
  applyFill: (assignments: FormFillAssignment[]) => FormFillResult;
}

export const useFormFillStore = create<FormFillStore>((set, get) => ({
  fields: [],
  registerFields: (fields) => set({ fields }),
  clearFields: () => set({ fields: [] }),
  applyFill: (assignments) => {
    const applied: string[] = [];
    const missing: string[] = [];
    const { fields } = get();
    // Collect unique flush-handlers per groupId om N parallel autosave-PATCHes
    // te vermijden bij multi-field fill. Pages registreren flush() voor één
    // expliciete save na alle setters (audit F10 fix 2026-05-13).
    const flushHandlersByGroup = new Map<string, NonNullable<FormFillField['flush']>>();
    for (const { key, value } of assignments) {
      const field = fields.find((f) => f.key === key);
      if (field) {
        field.setter(value);
        applied.push(key);
        if (field.groupId && field.flush) {
          flushHandlersByGroup.set(field.groupId, field.flush);
        }
      } else {
        missing.push(key);
      }
    }
    // Defer flushes naar microtask zodat Zustand alle setter-state-updates
    // gepropageerd zijn voordat flush het canvas-store leest.
    if (flushHandlersByGroup.size > 0) {
      void Promise.resolve().then(async () => {
        for (const handler of flushHandlersByGroup.values()) {
          try {
            await handler();
          } catch (err) {
            console.warn('[useFormFillStore] flush handler failed:', err);
          }
        }
      });
    }
    return { applied, missing };
  },
}));
