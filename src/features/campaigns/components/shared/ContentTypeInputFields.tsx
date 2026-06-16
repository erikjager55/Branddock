/**
 * ContentTypeInputFields — shared form component for content-type-specific inputs.
 *
 * Used in:
 * - Canvas ContextPanel (ContentBriefCard) — review & edit pre-filled values
 * - Content mode wizard SetupStep — direct input before generation
 *
 * Renders fields from the content-type-inputs registry, grouped by category.
 */

import React, { useCallback, useEffect, useState } from 'react';
import { X, Plus, HelpCircle, Sparkles, Loader2 } from 'lucide-react';
import { Select } from '@/components/shared';
import {
  getContentTypeInputs,
  getInputCategories,
  type ContentTypeInputField,
  type ContentTypeInputValue,
  type InputCategory,
} from '@/features/campaigns/lib/content-type-inputs';

// ─── Types ─────────────────────────────────────────────────

export interface ContentTypeInputFieldsProps {
  typeId: string;
  values: Record<string, ContentTypeInputValue>;
  onChange: (key: string, value: ContentTypeInputValue) => void;
  /** Show AI-derived badge on fields that were auto-filled */
  aiDerivedKeys?: Set<string>;
  /** Compact mode hides help text and reduces spacing */
  compact?: boolean;
  /** If set, only render fields whose key is in this list */
  filterKeys?: string[];
}

// ─── Tag Input Sub-Component ───────────────────────────────

function TagInput({
  value,
  onChange,
  placeholder,
}: {
  value: string[];
  onChange: (tags: string[]) => void;
  placeholder?: string;
}) {
  const [inputValue, setInputValue] = React.useState('');

  const handleAdd = useCallback(() => {
    const trimmed = inputValue.trim();
    if (trimmed && !value.includes(trimmed)) {
      onChange([...value, trimmed]);
      setInputValue('');
    }
  }, [inputValue, value, onChange]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        handleAdd();
      }
    },
    [handleAdd],
  );

  const handleRemove = useCallback(
    (tag: string) => {
      onChange(value.filter((t) => t !== tag));
    },
    [value, onChange],
  );

  return (
    <div>
      {value.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-2">
          {value.map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium bg-gray-100 text-gray-700"
            >
              {tag}
              <button
                type="button"
                onClick={() => handleRemove(tag)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
        </div>
      )}
      <div className="flex gap-1.5">
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="flex-1 border border-gray-200 rounded-lg px-3 py-1.5 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-1 focus:ring-teal-500 focus:border-teal-500"
        />
        <button
          type="button"
          onClick={handleAdd}
          disabled={!inputValue.trim()}
          className="p-1.5 rounded-lg border border-gray-200 text-gray-400 hover:text-gray-600 hover:border-gray-300 disabled:opacity-40"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

// ─── Product Select Sub-Component (W2 product-koppeling) ───

interface ProductOption {
  id: string;
  name: string;
  category: string | null;
}

/**
 * W2 (plan §2.3) — dropdown gevoed door GET /api/products. De waarde is een
 * Product-id; Layer 7 lost die settings-first op naar volledige ProductContext.
 * Toont de huidige selectie-naam ook tijdens het laden, en degradeert naar een
 * lege-staat-melding wanneer de workspace nog geen producten heeft.
 */
function ProductSelectField({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  const [products, setProducts] = useState<ProductOption[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    fetch('/api/products')
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json() as Promise<{ products?: ProductOption[] }>;
      })
      .then((data) => {
        if (!active) return;
        setProducts(
          (data.products ?? []).map((p) => ({ id: p.id, name: p.name, category: p.category })),
        );
      })
      .catch((err: unknown) => {
        if (!active) return;
        setError(err instanceof Error ? err.message : 'Laden mislukt');
        setProducts([]);
      });
    return () => {
      active = false;
    };
  }, []);

  if (products === null && !error) {
    return (
      <div className="flex items-center gap-2 text-sm text-gray-400 border border-gray-200 rounded-lg px-3 py-1.5">
        <Loader2 className="w-3.5 h-3.5 animate-spin" />
        Producten laden…
      </div>
    );
  }

  if (error) {
    return (
      <p className="text-xs text-red-600 border border-red-200 bg-red-50 rounded-lg px-3 py-1.5">
        Producten laden mislukt ({error}). Vernieuw de pagina om opnieuw te proberen.
      </p>
    );
  }

  if (products && products.length === 0) {
    return (
      <p className="text-xs text-amber-700 border border-amber-200 bg-amber-50 rounded-lg px-3 py-1.5">
        Nog geen producten in deze workspace. Voeg er eerst één toe in de Producten-sectie — een product-page is altijd aan een product gekoppeld.
      </p>
    );
  }

  return (
    <Select
      value={value || null}
      onChange={(v) => onChange(v ?? '')}
      options={(products ?? []).map((p) => ({
        value: p.id,
        label: p.category ? `${p.name} · ${p.category}` : p.name,
      }))}
      placeholder={placeholder ?? 'Kies een product…'}
      allowClear
    />
  );
}

// ─── Field Renderer ────────────────────────────────────────

function FieldRenderer({
  field,
  value,
  onChange,
  isAiDerived,
  compact,
}: {
  field: ContentTypeInputField;
  value: ContentTypeInputValue | undefined;
  onChange: (value: ContentTypeInputValue) => void;
  isAiDerived: boolean;
  compact: boolean;
}) {
  const labelContent = (
    <div className="flex items-center gap-1.5 mb-1">
      <label className="text-sm font-medium text-gray-700">
        {field.required && <span className="text-red-500 mr-0.5">*</span>}
        {field.label}
      </label>
      {isAiDerived && (
        <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-medium bg-violet-50 text-violet-600">
          <Sparkles className="w-2.5 h-2.5" />
          AI
        </span>
      )}
      {!compact && field.helpText && (
        <span className="group relative">
          <HelpCircle className="w-3.5 h-3.5 text-gray-300 cursor-help" />
          <span className="absolute left-5 top-0 z-10 hidden group-hover:block w-48 p-2 rounded-lg bg-gray-800 text-white text-xs shadow-lg">
            {field.helpText}
          </span>
        </span>
      )}
    </div>
  );

  switch (field.type) {
    case 'text':
      return (
        <div>
          {labelContent}
          <input
            type="text"
            value={(value as string) ?? ''}
            onChange={(e) => onChange(e.target.value)}
            placeholder={field.placeholder}
            className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-1 focus:ring-teal-500 focus:border-teal-500"
          />
        </div>
      );

    case 'textarea':
      return (
        <div>
          {labelContent}
          <textarea
            value={(value as string) ?? ''}
            onChange={(e) => onChange(e.target.value)}
            placeholder={field.placeholder}
            rows={3}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-1 focus:ring-teal-500 focus:border-teal-500 resize-y"
          />
        </div>
      );

    case 'number':
      return (
        <div>
          {labelContent}
          <input
            type="number"
            value={(value as number) ?? ''}
            onChange={(e) => {
              if (e.target.value === '') {
                onChange(0 as ContentTypeInputValue);
              } else {
                onChange(Number(e.target.value));
              }
            }}
            placeholder={field.placeholder}
            min={0}
            className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-1 focus:ring-teal-500 focus:border-teal-500"
          />
        </div>
      );

    case 'boolean':
      return (
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={!!value}
            onChange={(e) => onChange(e.target.checked)}
            className="h-4 w-4 rounded border-gray-300 text-teal-600 focus:ring-teal-500"
          />
          <span className="text-sm text-gray-700">{field.label}</span>
          {isAiDerived && (
            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-medium bg-violet-50 text-violet-600">
              <Sparkles className="w-2.5 h-2.5" />
              AI
            </span>
          )}
        </div>
      );

    case 'select':
      return (
        <div>
          {labelContent}
          <Select
            value={(value as string) ?? null}
            onChange={(v) => onChange(v ?? '')}
            options={(field.options ?? []).map((o) =>
              typeof o === 'string' ? { value: o, label: o } : o,
            )}
            placeholder={`Select ${field.label.toLowerCase()}…`}
            allowClear
          />
        </div>
      );

    case 'tags':
      return (
        <div>
          {labelContent}
          <TagInput
            value={Array.isArray(value) ? (value as string[]) : []}
            onChange={(tags) => onChange(tags)}
            placeholder={field.placeholder}
          />
        </div>
      );

    case 'product-select':
      return (
        <div>
          {labelContent}
          <ProductSelectField
            value={(value as string) ?? ''}
            onChange={(v) => onChange(v)}
            placeholder={field.placeholder}
          />
        </div>
      );

    default:
      return null;
  }
}

// ─── Main Component ────────────────────────────────────────

export function ContentTypeInputFields({
  typeId,
  values,
  onChange,
  aiDerivedKeys,
  compact = false,
  filterKeys,
}: ContentTypeInputFieldsProps) {
  const allFields = getContentTypeInputs(typeId);
  const fields = filterKeys
    ? allFields.filter((f) => filterKeys.includes(f.key))
    : allFields;
  const categories = getInputCategories(typeId);

  if (fields.length === 0) return null;

  // Group fields by category
  const grouped = new Map<InputCategory, ContentTypeInputField[]>();
  for (const field of fields) {
    const group = grouped.get(field.category) ?? [];
    group.push(field);
    grouped.set(field.category, group);
  }

  return (
    <div className={compact ? 'space-y-3' : 'space-y-5'}>
      {categories.map(({ category, label }) => {
        const categoryFields = grouped.get(category);
        if (!categoryFields?.length) return null;

        return (
          <div key={category}>
            <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
              {label}
            </h4>
            <div className={compact ? 'space-y-2' : 'space-y-3'}>
              {categoryFields.map((field) => (
                <FieldRenderer
                  key={field.key}
                  field={field}
                  value={values[field.key]}
                  onChange={(v) => onChange(field.key, v)}
                  isAiDerived={aiDerivedKeys?.has(field.key) ?? false}
                  compact={compact}
                />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
