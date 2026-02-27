'use client';

import { useState } from 'react';
import { Save, Plus, Trash2, ChevronDown, ChevronRight } from 'lucide-react';
import { EXPLORATION_AI_MODELS } from '@/lib/ai/exploration/config.types';
import type { ExplorationConfigData, StoredDimension, StoredFieldSuggestionConfig } from '@/lib/ai/exploration/config.types';

interface ExplorationConfigEditorProps {
  initialData?: ExplorationConfigData;
  onSave: (data: Record<string, unknown>) => Promise<void>;
  onCancel: () => void;
}

const AVAILABLE_CONTEXT_SOURCES = [
  { key: 'brand_asset', label: 'Brand Assets' },
  { key: 'product', label: 'Products & Services' },
  { key: 'persona', label: 'Personas' },
  { key: 'market_insight', label: 'Market Insights' },
  { key: 'knowledge_resource', label: 'Knowledge Library' },
  { key: 'brandstyle', label: 'Brand Style' },
];

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
    <div className="border-2 border-teal-200 rounded-xl bg-white overflow-hidden">
      {/* Header */}
      <div className="bg-teal-50 px-6 py-4 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-teal-900">
          {isNew ? 'Nieuwe configuratie' : `Bewerken: ${label || itemType}`}
        </h3>
        <div className="flex items-center gap-2">
          <button
            onClick={onCancel}
            className="px-3 py-1.5 text-xs text-gray-600 hover:text-gray-800 border border-gray-300 rounded-lg transition-colors"
          >
            Annuleren
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-medium text-white bg-teal-600 hover:bg-teal-700 disabled:opacity-50 rounded-lg transition-colors"
          >
            <Save className="w-3.5 h-3.5" />
            {isSaving ? 'Opslaan...' : 'Opslaan'}
          </button>
        </div>
      </div>

      <div className="p-6 space-y-6">

        {/* ─── Targeting ──────────────────────────────── */}
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Item Type</label>
            <select
              value={itemType}
              onChange={(e) => setItemType(e.target.value)}
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
              Sub Type <span className="text-gray-400">(optioneel)</span>
            </label>
            <input
              value={itemSubType}
              onChange={(e) => setItemSubType(e.target.value)}
              disabled={!isNew}
              placeholder="e.g. social-relevancy"
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg disabled:bg-gray-50"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Label</label>
            <input
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="Weergavenaam"
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
          <span className="text-sm text-gray-700">Actief</span>
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
                <span>Precies (0)</span>
                <span>Creatief (1)</span>
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
          title={`Dimensies (${dimensions.length})`}
          isOpen={openSections.dimensions}
          onToggle={() => toggleSection('dimensions')}
        >
          <div className="space-y-3">
            {dimensions.map((dim, i) => (
              <div key={i} className="border border-gray-200 rounded-lg p-3 space-y-2 bg-gray-50/50">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-gray-500">Dimensie {i + 1}</span>
                  <button
                    onClick={() => removeDimension(i)}
                    className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
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
                    placeholder="Titel"
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
                  placeholder="Vraag voor deze dimensie..."
                  rows={2}
                  className="w-full px-2 py-1.5 text-xs border border-gray-200 rounded resize-none"
                />
                <input
                  value={dim.followUpHint ?? ''}
                  onChange={(e) => updateDimension(i, 'followUpHint', e.target.value)}
                  placeholder="Follow-up hint voor AI (optioneel)"
                  className="w-full px-2 py-1.5 text-xs border border-gray-200 rounded text-gray-500"
                />
              </div>
            ))}
            <button
              onClick={addDimension}
              className="flex items-center gap-1.5 text-xs text-teal-600 hover:text-teal-700 font-medium"
            >
              <Plus className="w-3.5 h-3.5" />
              Dimensie toevoegen
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
                placeholder="Je bent een senior merkstrateeg..."
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
                placeholder="Geef korte, constructieve feedback..."
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
                placeholder="Genereer een analyserapport..."
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
                  placeholder="Extraction hint voor AI"
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
              Field toevoegen
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
            Selecteer welke workspace data automatisch meegegeven wordt aan de AI als context.
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
    </div>
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
