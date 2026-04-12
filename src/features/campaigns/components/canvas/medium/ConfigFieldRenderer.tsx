'use client';

import React from 'react';
import { useCanvasStore } from '../../../stores/useCanvasStore';
import type { ConfigFieldDefinition } from '../../../types/medium-config.types';

interface ConfigFieldRendererProps {
  field: ConfigFieldDefinition;
}

/** Renders a ConfigFieldDefinition to the appropriate UI element */
export function ConfigFieldRenderer({ field }: ConfigFieldRendererProps) {
  const configValues = useCanvasStore((s) => s.mediumConfigValues);
  const setConfigValue = useCanvasStore((s) => s.setMediumConfigValue);

  // Conditional rendering
  if (field.showWhen) {
    const depValue = configValues[field.showWhen.field];
    if (depValue !== field.showWhen.value) return null;
  }

  const value = configValues[field.key] ?? field.defaultValue;

  switch (field.type) {
    case 'select':
      return (
        <SelectField
          field={field}
          value={value as string}
          onChange={(v) => setConfigValue(field.key, v)}
        />
      );
    case 'button-group':
      return (
        <ButtonGroupField
          field={field}
          value={value as string}
          onChange={(v) => setConfigValue(field.key, v)}
        />
      );
    case 'slider':
      return (
        <SliderField
          field={field}
          value={value as number}
          onChange={(v) => setConfigValue(field.key, v)}
        />
      );
    case 'toggle':
      return (
        <ToggleField
          field={field}
          value={value as boolean}
          onChange={(v) => setConfigValue(field.key, v)}
        />
      );
    case 'radio-group':
      return (
        <RadioGroupField
          field={field}
          value={value as string}
          onChange={(v) => setConfigValue(field.key, v)}
        />
      );
    case 'number':
      return (
        <NumberField
          field={field}
          value={value as number}
          onChange={(v) => setConfigValue(field.key, v)}
        />
      );
    case 'color-grid':
      return (
        <ButtonGroupField
          field={field}
          value={value as string}
          onChange={(v) => setConfigValue(field.key, v)}
        />
      );
    default:
      return null;
  }
}

// ─── Sub-components ──────────────────────────────────────────

function FieldLabel({ field, htmlFor }: { field: ConfigFieldDefinition; htmlFor?: string }) {
  return (
    <div className="mb-1.5">
      <label htmlFor={htmlFor} className="text-sm font-medium text-gray-700">{field.label}</label>
      {field.helpText && (
        <p className="text-xs text-gray-400 mt-0.5">{field.helpText}</p>
      )}
    </div>
  );
}

function SelectField({
  field,
  value,
  onChange,
}: {
  field: ConfigFieldDefinition;
  value: string;
  onChange: (v: string) => void;
}) {
  const selectId = `field-${field.key}`;
  return (
    <div>
      <FieldLabel field={field} htmlFor={selectId} />
      <select
        id={selectId}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
      >
        {field.options?.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}

function ButtonGroupField({
  field,
  value,
  onChange,
}: {
  field: ConfigFieldDefinition;
  value: string;
  onChange: (v: string) => void;
}) {
  const cols = field.columns ?? (field.options?.length ?? 3);

  return (
    <div>
      <FieldLabel field={field} />
      <div
        className="grid gap-2"
        style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
      >
        {field.options?.map((opt) => {
          const isActive = value === opt.value;
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => onChange(opt.value)}
              aria-pressed={isActive}
              className={`px-3 py-2 text-sm font-medium rounded-lg border transition-colors ${
                isActive
                  ? 'bg-primary/10 text-primary border-primary/30'
                  : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
              }`}
            >
              {opt.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function SliderField({
  field,
  value,
  onChange,
}: {
  field: ConfigFieldDefinition;
  value: number;
  onChange: (v: number) => void;
}) {
  const min = field.min ?? 0;
  const max = field.max ?? 100;
  const step = field.step ?? 1;
  const sliderId = `field-${field.key}`;

  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <label htmlFor={sliderId} className="text-sm font-medium text-gray-700">{field.label}</label>
        <span className="text-sm font-medium text-primary">{value}</span>
      </div>
      {field.helpText && (
        <p className="text-xs text-gray-400 mb-1.5">{field.helpText}</p>
      )}
      <input
        id={sliderId}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-primary"
      />
    </div>
  );
}

function ToggleField({
  field,
  value,
  onChange,
}: {
  field: ConfigFieldDefinition;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <span className="text-sm font-medium text-gray-700">{field.label}</span>
        {field.helpText && (
          <p className="text-xs text-gray-400 mt-0.5">{field.helpText}</p>
        )}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={value}
        aria-label={field.label}
        onClick={() => onChange(!value)}
        className="relative inline-flex h-6 w-11 items-center rounded-full transition-colors"
        style={{ backgroundColor: value ? '#0d9488' : '#e5e7eb' }}
      >
        <span
          className="inline-block h-4 w-4 rounded-full bg-white transition-transform"
          style={{ transform: value ? 'translateX(22px)' : 'translateX(4px)' }}
        />
      </button>
    </div>
  );
}

function RadioGroupField({
  field,
  value,
  onChange,
}: {
  field: ConfigFieldDefinition;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <FieldLabel field={field} />
      <div className="space-y-2">
        {field.options?.map((opt) => (
          <label
            key={opt.value}
            className="flex items-start gap-3 cursor-pointer"
          >
            <input
              type="radio"
              name={field.key}
              value={opt.value}
              checked={value === opt.value}
              onChange={() => onChange(opt.value)}
              className="mt-0.5 h-4 w-4 text-primary accent-primary"
            />
            <div>
              <span className="text-sm font-medium text-gray-700">{opt.label}</span>
              {opt.description && (
                <p className="text-xs text-gray-400">{opt.description}</p>
              )}
            </div>
          </label>
        ))}
      </div>
    </div>
  );
}

function NumberField({
  field,
  value,
  onChange,
}: {
  field: ConfigFieldDefinition;
  value: number;
  onChange: (v: number) => void;
}) {
  const inputId = `field-${field.key}`;
  return (
    <div>
      <FieldLabel field={field} htmlFor={inputId} />
      <input
        id={inputId}
        type="number"
        min={field.min}
        max={field.max}
        step={field.step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
      />
    </div>
  );
}
