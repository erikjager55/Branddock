'use client';

import { Card } from '@/components/shared';
import { EXPLORATION_AI_MODELS } from '@/lib/ai/exploration/config.types';

// ─── Constants ──────────────────────────────────────────────

const SUB_TYPE_OPTIONS: Record<string, Array<{ value: string; label: string }>> = {
  brand_asset: [
    { value: 'purpose-statement', label: 'Purpose Statement' },
    { value: 'golden-circle', label: 'Golden Circle' },
    { value: 'brand-essence', label: 'Brand Essence' },
    { value: 'brand-promise', label: 'Brand Promise' },
    { value: 'mission-statement', label: 'Mission & Vision' },
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

const AVAILABLE_CONTEXT_SOURCES = [
  { key: 'brand_asset', label: 'Brand Assets', description: 'Content and framework data from brand assets' },
  { key: 'product', label: 'Products & Services', description: 'Product descriptions and features' },
  { key: 'persona', label: 'Personas', description: 'Persona profiles and demographics' },
  { key: 'detected_trend', label: 'Trend Radar', description: 'Activated trends and market insights' },
  { key: 'knowledge_resource', label: 'Knowledge Library', description: 'Knowledge sources and articles' },
  { key: 'brandstyle', label: 'Brand Style', description: 'Brand style and visual identity' },
];

// ─── Props ──────────────────────────────────────────────────

interface GeneralTabProps {
  itemType: string;
  itemSubType: string;
  label: string;
  provider: string;
  model: string;
  temperature: number;
  maxTokens: number;
  contextSources: string[];
  isActive: boolean;
  onItemTypeChange: (value: string) => void;
  onItemSubTypeChange: (value: string) => void;
  onLabelChange: (value: string) => void;
  onProviderChange: (value: string) => void;
  onModelChange: (value: string) => void;
  onTemperatureChange: (value: number) => void;
  onMaxTokensChange: (value: number) => void;
  onContextSourcesChange: (value: string[]) => void;
  onIsActiveChange: (value: boolean) => void;
}

// ─── Component ──────────────────────────────────────────────

export function GeneralTab({
  itemType,
  itemSubType,
  label,
  provider,
  model,
  temperature,
  maxTokens,
  contextSources,
  isActive,
  onItemTypeChange,
  onItemSubTypeChange,
  onLabelChange,
  onProviderChange,
  onModelChange,
  onTemperatureChange,
  onMaxTokensChange,
  onContextSourcesChange,
  onIsActiveChange,
}: GeneralTabProps) {
  const subTypeOptions = SUB_TYPE_OPTIONS[itemType] ?? [];
  const hasSubTypes = subTypeOptions.length > 0;
  const filteredModels = EXPLORATION_AI_MODELS.filter((m) => m.provider === provider);

  const handleProviderChange = (newProvider: string) => {
    onProviderChange(newProvider);
    const firstModel = EXPLORATION_AI_MODELS.find((m) => m.provider === newProvider);
    if (firstModel) onModelChange(firstModel.id);
  };

  const toggleContextSource = (key: string) => {
    if (contextSources.includes(key)) {
      onContextSourcesChange(contextSources.filter((s) => s !== key));
    } else {
      onContextSourcesChange([...contextSources, key]);
    }
  };

  return (
    <div className="space-y-6">
      {/* ─── Targeting ────────────────────────────────── */}
      <Card padding="none">
        <div className="px-5 pt-4 pb-1">
          <h3 className="text-sm font-semibold text-gray-800">Targeting</h3>
          <p className="text-xs text-gray-500 mt-0.5">
            Define which item type and subtype this configuration applies to
          </p>
        </div>
        <div className="px-5 py-4">
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1.5">Item Type</label>
              <select
                value={itemType}
                onChange={(e) => {
                  onItemTypeChange(e.target.value);
                  onItemSubTypeChange('');
                }}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-teal-500 focus:border-teal-500"
              >
                <option value="persona">Persona</option>
                <option value="brand_asset">Brand Asset</option>
                <option value="product">Product</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1.5">
                Sub Type <span className="text-gray-400">(optional)</span>
              </label>
              {hasSubTypes ? (
                <select
                  value={itemSubType}
                  onChange={(e) => onItemSubTypeChange(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-teal-500 focus:border-teal-500"
                >
                  <option value="">-- Base configuration --</option>
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
              <label className="block text-xs font-medium text-gray-700 mb-1.5">Label</label>
              <input
                value={label}
                onChange={(e) => onLabelChange(e.target.value)}
                placeholder="Display name"
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-teal-500 focus:border-teal-500"
              />
            </div>
          </div>

          {/* Active toggle */}
          <label className="flex items-center gap-3 mt-4 cursor-pointer">
            <div className="relative">
              <input
                type="checkbox"
                checked={isActive}
                onChange={(e) => onIsActiveChange(e.target.checked)}
                className="sr-only"
              />
              <div className={`w-9 h-5 rounded-full transition-colors ${isActive ? 'bg-teal-500' : 'bg-gray-300'}`} />
              <div className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${isActive ? 'translate-x-4' : ''}`} />
            </div>
            <div>
              <span className="text-sm text-gray-700 font-medium">Active</span>
              <p className="text-xs text-gray-400">When disabled, the default configuration will be used</p>
            </div>
          </label>
        </div>
      </Card>

      {/* ─── AI Model ─────────────────────────────────── */}
      <Card padding="none">
        <div className="px-5 pt-4 pb-1">
          <h3 className="text-sm font-semibold text-gray-800">AI Model & Parameters</h3>
          <p className="text-xs text-gray-500 mt-0.5">
            Choose the AI provider, model and creative settings
          </p>
        </div>
        <div className="px-5 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1.5">Provider</label>
              <select
                value={provider}
                onChange={(e) => handleProviderChange(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-teal-500 focus:border-teal-500"
              >
                <option value="anthropic">Anthropic</option>
                <option value="openai">OpenAI</option>
                <option value="google">Google (Gemini)</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1.5">Model</label>
              <select
                value={model}
                onChange={(e) => onModelChange(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-teal-500 focus:border-teal-500"
              >
                {filteredModels.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.label} — {m.description}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1.5">
                Temperature: <span className="text-teal-600 font-semibold">{temperature.toFixed(1)}</span>
              </label>
              <input
                type="range"
                min={0}
                max={1}
                step={0.1}
                value={temperature}
                onChange={(e) => onTemperatureChange(parseFloat(e.target.value))}
                className="w-full accent-teal-600"
              />
              <div className="flex justify-between text-[10px] text-gray-400 mt-1">
                <span>Precise (0)</span>
                <span>Creative (1)</span>
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1.5">Max Tokens</label>
              <input
                type="number"
                value={maxTokens}
                onChange={(e) => {
                  const val = parseInt(e.target.value);
                  if (!isNaN(val)) onMaxTokensChange(val);
                }}
                min={256}
                max={8192}
                step={256}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-teal-500 focus:border-teal-500"
              />
            </div>
          </div>
        </div>
      </Card>

      {/* ─── Context Sources ──────────────────────────── */}
      <Card padding="none">
        <div className="px-5 pt-4 pb-1">
          <h3 className="text-sm font-semibold text-gray-800">Context Sources</h3>
          <p className="text-xs text-gray-500 mt-0.5">
            Select which workspace data is automatically provided as context to the AI
          </p>
        </div>
        <div className="px-5 py-4">
          <div className="grid grid-cols-2 gap-3">
            {AVAILABLE_CONTEXT_SOURCES.map((source) => (
              <label
                key={source.key}
                className={`flex items-start gap-3 p-3 rounded-lg cursor-pointer border transition-colors ${
                  contextSources.includes(source.key)
                    ? 'border-teal-200 bg-teal-50/50'
                    : 'border-gray-100 hover:border-gray-200'
                }`}
              >
                <input
                  type="checkbox"
                  checked={contextSources.includes(source.key)}
                  onChange={() => toggleContextSource(source.key)}
                  className="rounded border-gray-300 text-teal-600 focus:ring-teal-500 mt-0.5"
                />
                <div>
                  <span className="text-xs font-medium text-gray-700">{source.label}</span>
                  <p className="text-[10px] text-gray-400 mt-0.5">{source.description}</p>
                </div>
              </label>
            ))}
          </div>
        </div>
      </Card>
    </div>
  );
}
