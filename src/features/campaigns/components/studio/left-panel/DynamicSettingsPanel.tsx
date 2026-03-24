"use client";

import React from "react";
import { useContentStudioStore } from "@/stores/useContentStudioStore";
import {
  getSettingsForType,
  resolveDeliverableTypeId,
} from "@/features/campaigns/lib/deliverable-type-settings";
import type { SettingsField } from "@/features/campaigns/lib/deliverable-type-settings";
import { STUDIO } from "@/lib/constants/design-tokens";

interface DynamicSettingsPanelProps {
  contentType: string;
}

/**
 * Renders type-specific settings controls for a deliverable type.
 * Settings fields are defined per type in deliverable-type-settings.ts.
 */
export function DynamicSettingsPanel({ contentType }: DynamicSettingsPanelProps) {
  const { settings, setSettings } = useContentStudioStore();
  const typeId = resolveDeliverableTypeId(contentType);
  const fields = getSettingsForType(typeId);

  const currentSettings = (settings as unknown as Record<string, unknown>) || {};

  const getValue = (field: SettingsField): unknown => {
    return currentSettings[field.key] ?? field.default;
  };

  const update = (key: string, value: unknown) => {
    setSettings({ ...currentSettings, [key]: value } as never);
  };

  return (
    <div className="space-y-3">
      {fields.map((field) => (
        <FieldRenderer
          key={field.key}
          field={field}
          value={getValue(field)}
          onChange={(value) => update(field.key, value)}
        />
      ))}
    </div>
  );
}

// ─── Field Renderer ──────────────────────────────────────────

interface FieldRendererProps {
  field: SettingsField;
  value: unknown;
  onChange: (value: unknown) => void;
}

function FieldRenderer({ field, value, onChange }: FieldRendererProps) {
  switch (field.type) {
    case "pills":
      return (
        <PillsField
          label={field.label}
          options={field.options || []}
          value={String(value)}
          onChange={onChange}
        />
      );
    case "select":
      return (
        <SelectField
          label={field.label}
          options={field.options || []}
          value={String(value)}
          onChange={onChange}
        />
      );
    case "text":
      return (
        <TextField
          label={field.label}
          value={String(value)}
          placeholder={field.placeholder}
          onChange={onChange}
        />
      );
    case "toggle":
      return (
        <ToggleField
          label={field.label}
          value={Boolean(value)}
          onChange={onChange}
        />
      );
    case "number":
      return (
        <NumberField
          label={field.label}
          value={Number(value)}
          min={field.min}
          max={field.max}
          onChange={onChange}
        />
      );
    default:
      return null;
  }
}

// ─── Pills Field ─────────────────────────────────────────────

function PillsField({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: { value: string; label: string }[];
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-700 mb-1">{label}</label>
      <div className="flex gap-1 flex-wrap">
        {options.map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className={`px-2 py-1 text-xs rounded-md transition-colors border ${
              value === opt.value
                ? STUDIO.pill.active
                : `${STUDIO.pill.inactive}`
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── Select Field ────────────────────────────────────────────

function SelectField({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: { value: string; label: string }[];
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-700 mb-1">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-md border border-gray-200 px-3 py-1.5 text-sm focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}

// ─── Text Field ──────────────────────────────────────────────

function TextField({
  label,
  value,
  placeholder,
  onChange,
}: {
  label: string;
  value: string;
  placeholder?: string;
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-700 mb-1">{label}</label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-md border border-gray-200 px-3 py-1.5 text-sm focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
      />
    </div>
  );
}

// ─── Toggle Field ────────────────────────────────────────────

function ToggleField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between">
      <label className="text-xs font-medium text-gray-700">{label}</label>
      <button
        type="button"
        role="switch"
        aria-checked={value}
        onClick={() => onChange(!value)}
        className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
          value ? "bg-teal-500" : "bg-gray-200"
        }`}
      >
        <span
          className={`inline-block h-3.5 w-3.5 rounded-full bg-white transition-transform ${
            value ? "translate-x-4" : "translate-x-0.5"
          }`}
        />
      </button>
    </div>
  );
}

// ─── Number Field ────────────────────────────────────────────

function NumberField({
  label,
  value,
  min,
  max,
  onChange,
}: {
  label: string;
  value: number;
  min?: number;
  max?: number;
  onChange: (value: number) => void;
}) {
  const canDecrement = min === undefined || value > min;
  const canIncrement = max === undefined || value < max;

  return (
    <div className="flex items-center justify-between">
      <label className="text-xs font-medium text-gray-700">{label}</label>
      <div className="flex items-center gap-2">
        <button
          type="button"
          disabled={!canDecrement}
          onClick={() => onChange(value - 1)}
          className="h-6 w-6 rounded border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          −
        </button>
        <span className="text-sm font-medium text-gray-900 w-6 text-center">{value}</span>
        <button
          type="button"
          disabled={!canIncrement}
          onClick={() => onChange(value + 1)}
          className="h-6 w-6 rounded border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          +
        </button>
      </div>
    </div>
  );
}
