'use client';

import { useTranslation } from 'react-i18next';
import { Lock, Plus, SlidersHorizontal, Trash2 } from 'lucide-react';
import type { PanelField } from './section-editor-model';

/**
 * Rechterkolom van de eigen sectie-editor (E2): rendert het props-paneel van
 * de geselecteerde sectie op basis van het paneel-model uit
 * {@link fieldsToPanelModel}. Elke commit gaat als één `onCommit(key, value)`
 * omhoog — de editor duwt dat door `setSectionProps` (kernel, lock-respect)
 * het bestaande autosave-pad in. Geen debounce nodig: de autosave in
 * PuckPageBuilder debounced zelf al (1500ms).
 *
 * Gelockte secties tonen het paneel read-only + lock-melding (kernel-
 * semantiek gespiegeld in de UI; de kernel weigert een commit sowieso).
 */
export function SectionPropsPanel({
  section,
  typeLabel,
  fields,
  locked,
  onCommit,
}: {
  /** Geselecteerde sectie of `null` (lege staat). */
  section: { type: string; props: Record<string, unknown> } | null;
  /** Vertaald type-label voor de paneel-kop. */
  typeLabel: string;
  fields: PanelField[];
  locked: boolean;
  onCommit: (key: string, value: unknown) => void;
}) {
  const { t } = useTranslation('campaigns-canvas-medium');
  if (!section) {
    return (
      <div className="flex h-full items-center justify-center p-6 text-center">
        <p className="text-sm text-gray-400">{t('pageBuilder.editor.propsEmpty')}</p>
      </div>
    );
  }
  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-gray-200 px-4 py-3">
        <div className="flex items-center gap-2">
          <SlidersHorizontal className="h-4 w-4 text-gray-500" />
          <span className="text-sm font-semibold text-gray-900">{typeLabel}</span>
        </div>
        <p className="mt-0.5 text-xs text-gray-400">{section.type}</p>
      </div>
      {locked ? (
        <div className="mx-4 mt-3 flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2">
          <Lock className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-600" />
          <p className="text-xs text-amber-800">{t('pageBuilder.editor.lockedNotice')}</p>
        </div>
      ) : null}
      <div className="flex-1 space-y-4 overflow-y-auto p-4" style={{ minHeight: 0 }}>
        {fields.length === 0 ? (
          <p className="text-xs text-gray-400">{t('pageBuilder.editor.noFields')}</p>
        ) : (
          fields.map((field) => (
            <PanelFieldControl
              key={field.key}
              field={field}
              value={section.props[field.key]}
              disabled={locked}
              idPrefix={`se-${section.props.id ?? section.type}`}
              onCommit={(value) => onCommit(field.key, value)}
            />
          ))
        )}
      </div>
    </div>
  );
}

const INPUT_CLASS =
  'w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-400';

/**
 * Eén veld-control (recursief voor arrays). Volgt de ConfigFieldRenderer-
 * render-patronen (label + input-styling); custom velden roepen de
 * config-eigen render aan (→ PuckImageField, incl. readOnly bij lock).
 */
function PanelFieldControl({
  field,
  value,
  disabled,
  idPrefix,
  onCommit,
}: {
  field: PanelField;
  value: unknown;
  disabled: boolean;
  idPrefix: string;
  onCommit: (value: unknown) => void;
}) {
  const inputId = `${idPrefix}-${field.key}`;
  switch (field.kind) {
    case 'text':
      return (
        <div>
          <FieldLabel label={field.label} htmlFor={inputId} />
          <input
            id={inputId}
            type="text"
            value={typeof value === 'string' ? value : ''}
            disabled={disabled}
            onChange={(e) => onCommit(e.target.value)}
            className={INPUT_CLASS}
          />
        </div>
      );
    case 'textarea':
      return (
        <div>
          <FieldLabel label={field.label} htmlFor={inputId} />
          <textarea
            id={inputId}
            rows={3}
            value={typeof value === 'string' ? value : ''}
            disabled={disabled}
            onChange={(e) => onCommit(e.target.value)}
            className={INPUT_CLASS}
          />
        </div>
      );
    case 'select':
      return (
        <SelectControl
          field={field}
          value={value}
          disabled={disabled}
          inputId={inputId}
          onCommit={onCommit}
        />
      );
    case 'number':
      return (
        <div>
          <FieldLabel label={field.label} htmlFor={inputId} />
          <input
            id={inputId}
            type="number"
            value={typeof value === 'number' && Number.isFinite(value) ? value : ''}
            disabled={disabled}
            onChange={(e) => {
              if (e.target.value === '') return;
              const parsed = Number(e.target.value);
              if (Number.isFinite(parsed)) onCommit(parsed);
            }}
            className={INPUT_CLASS}
          />
        </div>
      );
    case 'array':
      return (
        <ArrayFieldControl
          field={field}
          value={value}
          disabled={disabled}
          idPrefix={inputId}
          onCommit={onCommit}
        />
      );
    case 'custom':
      // Config-eigen custom render — hergebruikt PuckImageField exact zoals
      // de Puck-editor dat deed (readOnly-arg dekt de lock-state).
      return field.renderCustom ? (
        <div>
          {field.renderCustom({
            value,
            onChange: onCommit as (v: never) => void,
            readOnly: disabled,
          })}
        </div>
      ) : null;
    default:
      return null;
  }
}

function FieldLabel({ label, htmlFor }: { label: string; htmlFor?: string }) {
  return (
    <label htmlFor={htmlFor} className="mb-1.5 block text-sm font-medium text-gray-700">
      {label}
    </label>
  );
}

/**
 * Select/radio → één native select. Optie-waarden kunnen boolean/number zijn
 * (bv. PricingTable `highlighted`), dus matching loopt via `String(value)`
 * en de commit stuurt de rúwe optie-waarde terug de tree in.
 */
function SelectControl({
  field,
  value,
  disabled,
  inputId,
  onCommit,
}: {
  field: PanelField;
  value: unknown;
  disabled: boolean;
  inputId: string;
  onCommit: (value: unknown) => void;
}) {
  const options = field.options ?? [];
  const current = options.find((o) => String(o.value) === String(value));
  return (
    <div>
      <FieldLabel label={field.label} htmlFor={inputId} />
      <select
        id={inputId}
        value={current ? String(current.value) : ''}
        disabled={disabled}
        onChange={(e) => {
          const picked = options.find((o) => String(o.value) === e.target.value);
          if (picked) onCommit(picked.value);
        }}
        className={INPUT_CLASS}
      >
        {current ? null : <option value="" disabled hidden />}
        {options.map((o) => (
          <option key={String(o.value)} value={String(o.value)}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}

/**
 * Array-veld: herhaalbare item-cards (native `<details>`-accordion) met
 * add/remove; item-velden renderen recursief via {@link PanelFieldControl}
 * (dekt ook geneste arrays, bv. ComparisonTable-rows → cells). Elke
 * item-wijziging committet de volledige array — de kernel merged shallow
 * op prop-niveau, dus de array is de commit-eenheid.
 */
function ArrayFieldControl({
  field,
  value,
  disabled,
  idPrefix,
  onCommit,
}: {
  field: PanelField;
  value: unknown;
  disabled: boolean;
  idPrefix: string;
  onCommit: (value: unknown) => void;
}) {
  const { t } = useTranslation('campaigns-canvas-medium');
  const items: unknown[] = Array.isArray(value) ? value : [];

  const commitItem = (index: number, key: string, itemValue: unknown) => {
    const next = items.map((item, i) =>
      i === index
        ? { ...(typeof item === 'object' && item !== null ? item : {}), [key]: itemValue }
        : item,
    );
    onCommit(next);
  };

  return (
    <div>
      <FieldLabel label={field.label} />
      <div className="space-y-2">
        {items.map((item, index) => {
          const summary = field.itemSummary
            ? field.itemSummary(item, index)
            : t('pageBuilder.editor.itemFallback', { index: index + 1 });
          return (
            <details
              key={index}
              className="rounded-lg border border-gray-200 bg-gray-50"
            >
              <summary className="cursor-pointer select-none px-3 py-2 text-xs font-medium text-gray-700">
                {summary}
              </summary>
              <div className="space-y-3 border-t border-gray-200 bg-white p-3">
                {(field.itemFields ?? []).map((itemField) => (
                  <PanelFieldControl
                    key={itemField.key}
                    field={itemField}
                    value={
                      typeof item === 'object' && item !== null
                        ? (item as Record<string, unknown>)[itemField.key]
                        : undefined
                    }
                    disabled={disabled}
                    idPrefix={`${idPrefix}-${index}`}
                    onCommit={(v) => commitItem(index, itemField.key, v)}
                  />
                ))}
                <button
                  type="button"
                  disabled={disabled}
                  onClick={() => onCommit(items.filter((_, i) => i !== index))}
                  className="inline-flex items-center gap-1.5 rounded-md bg-red-50 px-2.5 py-1.5 text-xs font-medium text-red-600 hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  {t('pageBuilder.editor.arrayRemove')}
                </button>
              </div>
            </details>
          );
        })}
      </div>
      <button
        type="button"
        disabled={disabled}
        onClick={() => onCommit([...items, structuredClone(field.defaultItemProps ?? {})])}
        className="mt-2 inline-flex items-center gap-1.5 rounded-md border border-gray-200 bg-white px-2.5 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
      >
        <Plus className="h-3.5 w-3.5" />
        {t('pageBuilder.editor.arrayAdd')}
      </button>
    </div>
  );
}
