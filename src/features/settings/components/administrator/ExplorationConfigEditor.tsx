'use client';

import { useState } from 'react';
import {
  Plus,
  Trash2,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  GripVertical,
  Eye,
} from 'lucide-react';
import { ExplorationConfigPreviewModal } from './ExplorationConfigPreviewModal';
import { EXPLORATION_AI_MODELS } from '@/lib/ai/exploration/config.types';
import type {
  ExplorationConfigData,
  StoredDimension,
  StoredFieldSuggestionConfig,
} from '@/lib/ai/exploration/config.types';

// ─── Sub Type Options per Item Type ─────────────────────────

const SUB_TYPE_OPTIONS: Record<string, Array<{ value: string; label: string }>> = {
  brand_asset: [
    { value: 'purpose-statement', label: 'Purpose Statement' },
    { value: 'golden-circle', label: 'Golden Circle' },
    { value: 'brand-essence', label: 'Brand Essence' },
    { value: 'brand-promise', label: 'Brand Promise' },
    { value: 'mission-statement', label: 'Mission Statement' },
    { value: 'vision-statement', label: 'Vision Statement' },
    { value: 'brand-archetype', label: 'Brand Archetype' },
    { value: 'transformative-goals', label: 'Transformative Goals' },
    { value: 'brand-personality', label: 'Brand Personality' },
    { value: 'brand-story', label: 'Brand Story' },
    { value: 'brandhouse-values', label: 'Brandhouse Values' },
    { value: 'social-relevancy', label: 'Social Relevancy' },
  ],
  persona: [],
  product: [],
};

// ─── Available Context Sources ──────────────────────────────

const AVAILABLE_CONTEXT_SOURCES = [
  { key: 'brand_asset', label: 'Brand Assets' },
  { key: 'product', label: 'Products & Services' },
  { key: 'persona', label: 'Personas' },
  { key: 'market_insight', label: 'Market Insights' },
  { key: 'knowledge_resource', label: 'Knowledge Library' },
  { key: 'brandstyle', label: 'Brand Style' },
];

// ─── Props ──────────────────────────────────────────────────

interface ExplorationConfigEditorProps {
  initialData?: ExplorationConfigData;
  onSave: (data: Record<string, unknown>) => Promise<void>;
  onCancel: () => void;
}

// ─── Component ──────────────────────────────────────────────

export function ExplorationConfigEditor({ initialData, onSave, onCancel }: ExplorationConfigEditorProps) {
  const isNew = !initialData;

  // ─── Form State ──────────────────────────────────────────
  const [itemType, setItemType] = useState(initialData?.itemType ?? 'persona');
  const [itemSubType, setItemSubType] = useState(initialData?.itemSubType ?? '');
  const [label, setLabel] = useState(initialData?.label ?? '');
  const [provider, setProvider] = useState(initialData?.provider ?? 'anthropic');
  const [model, setModel] = useState(initialData?.model ?? 'claude-sonnet-4-20250514');
  const [temperature, setTemperature] = useState(initialData?.temperature ?? 0.4);
  const [maxTokens, setMaxTokens] = useState(initialData?.maxTokens ?? 2048);
  const [systemPrompt, setSystemPrompt] = useState(initialData?.systemPrompt ?? '');
  const [feedbackPrompt, setFeedbackPrompt] = useState(initialData?.feedbackPrompt ?? '');
  const [reportPrompt, setReportPrompt] = useState(initialData?.reportPrompt ?? '');
  const [dimensions, setDimensions] = useState<StoredDimension[]>(initialData?.dimensions ?? []);
  const [fieldSuggestions, setFieldSuggestions] = useState<StoredFieldSuggestionConfig[]>(
    initialData?.fieldSuggestionsConfig ?? [],
  );
  const [contextSources, setContextSources] = useState<string[]>(initialData?.contextSources ?? []);
  const [isActive, setIsActive] = useState(initialData?.isActive ?? true);
  const [isSaving, setIsSaving] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  // ─── Collapsible Sections ────────────────────────────────
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    model: true,
    dimensions: true,
    prompts: false,
    fields: false,
    context: false,
  });
  const toggleSection = (key: string) =>
    setOpenSections((prev) => ({ ...prev, [key]: !prev[key] }));

  // ─── Model filtering by provider ────────────────────────
  const filteredModels = EXPLORATION_AI_MODELS.filter((m) => m.provider === provider);

  // ─── Sub type options for current item type ──────────────
  const subTypeOptions = SUB_TYPE_OPTIONS[itemType] ?? [];
  const hasSubTypes = subTypeOptions.length > 0;

  // ─── Handlers ────────────────────────────────────────────

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSave({
        itemType,
        itemSubType: itemSubType || null,
        label: label || null,
        provider,
        model,
        temperature,
        maxTokens,
        systemPrompt,
        feedbackPrompt,
        reportPrompt,
        dimensions,
        fieldSuggestionsConfig: fieldSuggestions.length > 0 ? fieldSuggestions : null,
        contextSources,
        isActive,
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleItemTypeChange = (newType: string) => {
    setItemType(newType);
    setItemSubType('');
  };

  const addDimension = () => {
    setDimensions((prev) => [
      ...prev,
      { key: `dim_${prev.length + 1}`, title: '', icon: 'HelpCircle', question: '' },
    ]);
  };

  const removeDimension = (index: number) => {
    setDimensions((prev) => prev.filter((_, i) => i !== index));
  };

  const updateDimension = (index: number, field: keyof StoredDimension, value: string) => {
    setDimensions((prev) => prev.map((d, i) => (i === index ? { ...d, [field]: value } : d)));
  };

  const moveDimension = (index: number, direction: 'up' | 'down') => {
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= dimensions.length) return;
    setDimensions((prev) => {
      const updated = [...prev];
      [updated[index], updated[newIndex]] = [updated[newIndex], updated[index]];
      return updated;
    });
  };

  const addFieldSuggestion = () => {
    setFieldSuggestions((prev) => [
      ...prev,
      { field: '', label: '', type: 'text' as const, extractionHint: '' },
    ]);
  };

  const removeFieldSuggestion = (index: number) => {
    setFieldSuggestions((prev) => prev.filter((_, i) => i !== index));
  };

  // ─── Render ──────────────────────────────────────────────

  return (
    <>
      <div className="border-2 border-teal-200 rounded-xl bg-white overflow-hidden flex flex-col" style={{ maxHeight: 'calc(100vh - 200px)' }}>
        {/* Header */}
        <div className="bg-teal-50 px-6 py-4 flex-shrink-0" style={{ borderBottom: '1px solid #ccfbf1' }}>
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-semibold text-teal-900">
                {isNew ? 'New Exploration Configuration' : `Edit Configuration`}
              </h3>
              <p className="text-xs text-teal-600 mt-0.5">
                {isNew ? 'Create a new AI exploration config for an item type' : `${label || itemType}${itemSubType ? ` / ${itemSubType}` : ''}`}
              </p>
            </div>
            <span className={`px-2 py-0.5 text-[10px] font-medium rounded-full ${isNew ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'}`}>
              {isNew ? 'NEW' : 'EDITING'}
            </span>
          </div>
        </div>

        {/* Scrollable content */}
        <div className="p-6 space-y-6 flex-1 overflow-y-auto" style={{ minHeight: 0 }}>

          {/* ─── Targeting ──────────────────────────────── */}
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Item Type</label>
              <select
                value={itemType}
                onChange={(e) => handleItemTypeChange(e.target.value)}
                disabled={!isNew}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg disabled:bg-gray-50"
              >
                <option value="persona">Persona</option>
                <option value="brand_asset">Brand Asset</option>
                <option value="product">Product</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Sub Type <span className="text-gray-400">(optional)</span>
              </label>
              {hasSubTypes ? (
                <select
                  value={itemSubType}
                  onChange={(e) => setItemSubType(e.target.value)}
                  disabled={!isNew}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg disabled:bg-gray-50"
                >
                  <option value="">-- All (base config) --</option>
                  {subTypeOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              ) : (
                <div className="px-3 py-2 text-sm text-gray-400 border border-gray-200 rounded-lg bg-gray-50">
                  No sub types for {itemType}
                </div>
              )}
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Label</label>
              <input
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder="Display name"
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg"
              />
            </div>
          </div>

          {/* Active toggle */}
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="rounded border-gray-300 text-teal-600 focus:ring-teal-500"
            />
            <span className="text-sm text-gray-700">Active</span>
          </label>

          {/* ─── Model Section ─────────────────────────── */}
          <CollapsibleSection
            title="AI Model & Parameters"
            isOpen={openSections.model}
            onToggle={() => toggleSection('model')}
          >
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Provider</label>
                <select
                  value={provider}
                  onChange={(e) => {
                    setProvider(e.target.value);
                    const firstModel = EXPLORATION_AI_MODELS.find((m) => m.provider === e.target.value);
                    if (firstModel) setModel(firstModel.id);
                  }}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg"
                >
                  <option value="anthropic">Anthropic</option>
                  <option value="openai">OpenAI</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Model</label>
                <select
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg"
                >
                  {filteredModels.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.label} — {m.description}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Temperature: {temperature}
                </label>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.1}
                  value={temperature}
                  onChange={(e) => setTemperature(parseFloat(e.target.value))}
                  className="w-full accent-teal-600"
                />
                <div className="flex justify-between text-[10px] text-gray-400 mt-0.5">
                  <span>Precise (0)</span>
                  <span>Creative (1)</span>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Max Tokens</label>
                <input
                  type="number"
                  value={maxTokens}
                  onChange={(e) => setMaxTokens(parseInt(e.target.value))}
                  min={256}
                  max={8192}
                  step={256}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg"
                />
              </div>
            </div>
          </CollapsibleSection>

          {/* ─── Dimensions Section ────────────────────── */}
          <CollapsibleSection
            title={`Dimensions (${dimensions.length})`}
            isOpen={openSections.dimensions}
            onToggle={() => toggleSection('dimensions')}
          >
            <div className="space-y-3">
              {dimensions.map((dim, i) => (
                <div
                  key={i}
                  className="border border-gray-200 rounded-lg bg-white shadow-sm overflow-hidden"
                >
                  {/* Dimension card header */}
                  <div className="flex items-center justify-between px-3 py-2 bg-gray-50 border-b border-gray-100">
                    <div className="flex items-center gap-2">
                      <GripVertical className="w-3.5 h-3.5 text-gray-300" />
                      <span className="text-xs font-medium text-gray-500">
                        Dimension {i + 1} of {dimensions.length}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => moveDimension(i, 'up')}
                        disabled={i === 0}
                        className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                        title="Move up"
                      >
                        <ChevronUp className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => moveDimension(i, 'down')}
                        disabled={i === dimensions.length - 1}
                        className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                        title="Move down"
                      >
                        <ChevronDown className="w-3.5 h-3.5" />
                      </button>
                      <div className="w-px h-4 bg-gray-200 mx-1" />
                      <button
                        onClick={() => removeDimension(i)}
                        className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                        title="Remove dimension"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                  {/* Dimension card body */}
                  <div className="p-3 space-y-2">
                    <div className="grid grid-cols-3 gap-2">
                      <input
                        value={dim.key}
                        onChange={(e) => updateDimension(i, 'key', e.target.value)}
                        placeholder="key"
                        className="px-2 py-1.5 text-xs border border-gray-200 rounded font-mono"
                      />
                      <input
                        value={dim.title}
                        onChange={(e) => updateDimension(i, 'title', e.target.value)}
                        placeholder="Title"
                        className="px-2 py-1.5 text-xs border border-gray-200 rounded"
                      />
                      <input
                        value={dim.icon}
                        onChange={(e) => updateDimension(i, 'icon', e.target.value)}
                        placeholder="Icon (Lucide)"
                        className="px-2 py-1.5 text-xs border border-gray-200 rounded font-mono"
                      />
                    </div>
                    <textarea
                      value={dim.question}
                      onChange={(e) => updateDimension(i, 'question', e.target.value)}
                      placeholder="Question for this dimension..."
                      rows={2}
                      className="w-full px-2 py-1.5 text-xs border border-gray-200 rounded resize-none"
                    />
                    <input
                      value={dim.followUpHint ?? ''}
                      onChange={(e) => updateDimension(i, 'followUpHint', e.target.value)}
                      placeholder="Follow-up hint for AI (optional)"
                      className="w-full px-2 py-1.5 text-xs border border-gray-200 rounded text-gray-500"
                    />
                  </div>
                </div>
              ))}
              <button
                onClick={addDimension}
                className="flex items-center gap-1.5 text-xs text-teal-600 hover:text-teal-700 font-medium"
              >
                <Plus className="w-3.5 h-3.5" />
                Add dimension
              </button>
            </div>
          </CollapsibleSection>

          {/* ─── Prompts Section ───────────────────────── */}
          <CollapsibleSection
            title="Prompts"
            isOpen={openSections.prompts}
            onToggle={() => toggleSection('prompts')}
          >
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  System Prompt
                  <span className="ml-2 text-gray-400 font-normal">
                    Variabelen: {'{{itemName}}, {{itemDescription}}, {{brandContext}}'}
                  </span>
                </label>
                <textarea
                  value={systemPrompt}
                  onChange={(e) => setSystemPrompt(e.target.value)}
                  rows={6}
                  className="w-full px-3 py-2 text-xs border border-gray-300 rounded-lg font-mono resize-y"
                  placeholder="You are a senior brand strategist..."
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Feedback Prompt
                  <span className="ml-2 text-gray-400 font-normal">
                    Variabelen: {'{{dimensionTitle}}, {{questionAsked}}, {{userAnswer}}, {{brandContext}}'}
                  </span>
                </label>
                <textarea
                  value={feedbackPrompt}
                  onChange={(e) => setFeedbackPrompt(e.target.value)}
                  rows={6}
                  className="w-full px-3 py-2 text-xs border border-gray-300 rounded-lg font-mono resize-y"
                  placeholder="Provide brief, constructive feedback..."
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Report Prompt
                  <span className="ml-2 text-gray-400 font-normal">
                    Variabelen: {'{{itemName}}, {{allAnswers}}, {{brandContext}}'}
                  </span>
                </label>
                <textarea
                  value={reportPrompt}
                  onChange={(e) => setReportPrompt(e.target.value)}
                  rows={8}
                  className="w-full px-3 py-2 text-xs border border-gray-300 rounded-lg font-mono resize-y"
                  placeholder="Generate an analysis report..."
                />
              </div>
            </div>
          </CollapsibleSection>

          {/* ─── Field Suggestions Section ─────────────── */}
          <CollapsibleSection
            title={`Field Suggestions (${fieldSuggestions.length})`}
            isOpen={openSections.fields}
            onToggle={() => toggleSection('fields')}
          >
            <div className="space-y-2">
              {fieldSuggestions.map((fs, i) => (
                <div key={i} className="grid grid-cols-[1fr_1fr_80px_1fr_32px] gap-2 items-start">
                  <input
                    value={fs.field}
                    onChange={(e) => {
                      const updated = [...fieldSuggestions];
                      updated[i] = { ...updated[i], field: e.target.value };
                      setFieldSuggestions(updated);
                    }}
                    placeholder="field.path"
                    className="px-2 py-1.5 text-xs border border-gray-200 rounded font-mono"
                  />
                  <input
                    value={fs.label}
                    onChange={(e) => {
                      const updated = [...fieldSuggestions];
                      updated[i] = { ...updated[i], label: e.target.value };
                      setFieldSuggestions(updated);
                    }}
                    placeholder="Label"
                    className="px-2 py-1.5 text-xs border border-gray-200 rounded"
                  />
                  <select
                    value={fs.type}
                    onChange={(e) => {
                      const updated = [...fieldSuggestions];
                      updated[i] = { ...updated[i], type: e.target.value as 'text' | 'select' };
                      setFieldSuggestions(updated);
                    }}
                    className="px-2 py-1.5 text-xs border border-gray-200 rounded"
                  >
                    <option value="text">text</option>
                    <option value="select">select</option>
                  </select>
                  <input
                    value={fs.extractionHint}
                    onChange={(e) => {
                      const updated = [...fieldSuggestions];
                      updated[i] = { ...updated[i], extractionHint: e.target.value };
                      setFieldSuggestions(updated);
                    }}
                    placeholder="Extraction hint for AI"
                    className="px-2 py-1.5 text-xs border border-gray-200 rounded"
                  />
                  <button
                    onClick={() => removeFieldSuggestion(i)}
                    className="p-1.5 text-gray-400 hover:text-red-500 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
              <button
                onClick={addFieldSuggestion}
                className="flex items-center gap-1.5 text-xs text-teal-600 hover:text-teal-700 font-medium"
              >
                <Plus className="w-3.5 h-3.5" />
                Add field
              </button>
            </div>
          </CollapsibleSection>

          {/* ─── Context Sources Section ───────────────── */}
          <CollapsibleSection
            title="Context Sources"
            isOpen={openSections.context}
            onToggle={() => toggleSection('context')}
          >
            <p className="text-xs text-gray-500 mb-3">
              Select which workspace data is automatically provided to the AI as context.
            </p>
            <div className="grid grid-cols-2 gap-2">
              {AVAILABLE_CONTEXT_SOURCES.map((source) => (
                <label key={source.key} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={contextSources.includes(source.key)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setContextSources((prev) => [...prev, source.key]);
                      } else {
                        setContextSources((prev) => prev.filter((s) => s !== source.key));
                      }
                    }}
                    className="rounded border-gray-300 text-teal-600 focus:ring-teal-500"
                  />
                  <span className="text-xs text-gray-700">{source.label}</span>
                </label>
              ))}
            </div>
          </CollapsibleSection>

        </div>

        {/* ─── Sticky Save/Cancel Bar ───────────────────── */}
        <div
          className="flex items-center justify-between flex-shrink-0"
          style={{
            padding: '12px 16px',
            borderTop: '1px solid #e5e7eb',
            backgroundColor: '#ffffff',
            boxShadow: '0 -2px 8px rgba(0,0,0,0.05)',
            borderRadius: '0 0 12px 12px',
          }}
        >
          <div className="flex items-center gap-2">
            <span
              className="text-xs font-bold uppercase tracking-wider rounded-full"
              style={{
                padding: '3px 10px',
                backgroundColor: '#fef3c7',
                color: '#92400e',
                border: '1px solid #fde68a',
              }}
            >
              EDITING
            </span>
            <span className="text-xs" style={{ color: '#9ca3af' }}>
              {dimensions.length} dimensies geconfigureerd
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowPreview(true)}
              className="flex items-center gap-1.5 text-sm font-medium rounded-lg transition-colors"
              style={{
                padding: '8px 16px',
                color: '#0d9488',
                backgroundColor: '#f0fdfa',
                border: '1px solid #99f6e4',
              }}
            >
              <Eye className="h-4 w-4" />
              Preview
            </button>
            <button
              type="button"
              onClick={onCancel}
              className="text-sm font-medium rounded-lg"
              style={{
                padding: '8px 20px',
                color: '#6b7280',
                backgroundColor: '#ffffff',
                border: '1px solid #e5e7eb',
              }}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving}
              className="flex items-center gap-1.5 text-sm font-medium rounded-lg disabled:opacity-50"
              style={{
                padding: '8px 24px',
                color: '#ffffff',
                background: 'linear-gradient(135deg, #14b8a6, #10b981)',
                border: 'none',
              }}
            >
              {isSaving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </div>
      </div>

      {/* ─── Preview Modal ────────────────────────────── */}
      <ExplorationConfigPreviewModal
        isOpen={showPreview}
        onClose={() => setShowPreview(false)}
        configLabel={label || 'Untitled Config'}
        itemType={itemType || ''}
        itemSubType={itemSubType || null}
        dimensions={dimensions.map((d) => ({
          key: d.key,
          title: d.title,
          question: d.question,
          followUpHint: d.followUpHint,
          icon: d.icon,
        }))}
        provider={provider}
        model={model}
      />
    </>
  );
}

// ─── Collapsible Section Helper ────────────────────────────

function CollapsibleSection({
  title,
  isOpen,
  onToggle,
  children,
}: {
  title: string;
  isOpen: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors"
      >
        <span className="text-sm font-medium text-gray-700">{title}</span>
        {isOpen ? (
          <ChevronDown className="w-4 h-4 text-gray-400" />
        ) : (
          <ChevronRight className="w-4 h-4 text-gray-400" />
        )}
      </button>
      {isOpen && <div className="p-4">{children}</div>}
    </div>
  );
}

