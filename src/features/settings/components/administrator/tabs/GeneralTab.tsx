'use client';

import { useTranslation } from 'react-i18next';
import { Card } from '@/components/shared';
import { EXPLORATION_AI_MODELS } from '@/lib/ai/exploration/config.types';

// ─── Constants ──────────────────────────────────────────────
// Labels/descriptions are resolved via i18n (`subTypes.*` / `contextSources.*`).

const SUB_TYPE_OPTIONS: Record<string, string[]> = {
  brand_asset: [
    'purpose-statement',
    'golden-circle',
    'brand-essence',
    'brand-promise',
    'mission-statement',
    'brand-archetype',
    'transformative-goals',
    'brand-personality',
    'brand-story',
    'brandhouse-values',
    'social-relevancy',
  ],
  persona: [],
  product: [],
};

const AVAILABLE_CONTEXT_SOURCE_KEYS = [
  'brand_asset',
  'product',
  'persona',
  'detected_trend',
  'knowledge_resource',
  'brandstyle',
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
  const { t } = useTranslation('settings-admin');
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
          <h3 className="text-sm font-semibold text-gray-800">{t('general.targetingTitle')}</h3>
          <p className="text-xs text-gray-500 mt-0.5">
            {t('general.targetingSubtitle')}
          </p>
        </div>
        <div className="px-5 py-4">
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1.5">{t('general.itemTypeLabel')}</label>
              <select
                value={itemType}
                onChange={(e) => {
                  onItemTypeChange(e.target.value);
                  onItemSubTypeChange('');
                }}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
              >
                <option value="persona">{t('general.itemTypeSelect.persona')}</option>
                <option value="brand_asset">{t('general.itemTypeSelect.brand_asset')}</option>
                <option value="product">{t('general.itemTypeSelect.product')}</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1.5">
                {t('general.subTypeLabel')} <span className="text-gray-400">{t('general.optional')}</span>
              </label>
              {hasSubTypes ? (
                <select
                  value={itemSubType}
                  onChange={(e) => onItemSubTypeChange(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
                >
                  <option value="">{t('general.baseConfiguration')}</option>
                  {subTypeOptions.map((value) => (
                    <option key={value} value={value}>{t(`subTypes.${value}`)}</option>
                  ))}
                </select>
              ) : (
                <div className="px-3 py-2 text-sm text-gray-400 border border-gray-200 rounded-lg bg-gray-50">
                  {t('general.noSubTypes', { itemType })}
                </div>
              )}
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1.5">{t('general.labelLabel')}</label>
              <input
                value={label}
                onChange={(e) => onLabelChange(e.target.value)}
                placeholder={t('general.labelPlaceholder')}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
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
              <div className={`w-9 h-5 rounded-full transition-colors ${isActive ? 'bg-primary-500' : 'bg-gray-300'}`} />
              <div className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${isActive ? 'translate-x-4' : ''}`} />
            </div>
            <div>
              <span className="text-sm text-gray-700 font-medium">{t('general.activeLabel')}</span>
              <p className="text-xs text-gray-400">{t('general.activeHelp')}</p>
            </div>
          </label>
        </div>
      </Card>

      {/* ─── AI Model ─────────────────────────────────── */}
      <Card padding="none">
        <div className="px-5 pt-4 pb-1">
          <h3 className="text-sm font-semibold text-gray-800">{t('general.modelTitle')}</h3>
          <p className="text-xs text-gray-500 mt-0.5">
            {t('general.modelSubtitle')}
          </p>
        </div>
        <div className="px-5 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1.5">{t('general.providerLabel')}</label>
              <select
                value={provider}
                onChange={(e) => handleProviderChange(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
              >
                <option value="anthropic">{t('general.providerAnthropic')}</option>
                <option value="openai">{t('general.providerOpenai')}</option>
                <option value="google">{t('general.providerGoogle')}</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1.5">{t('general.modelLabel')}</label>
              <select
                value={model}
                onChange={(e) => onModelChange(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
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
                {t('general.temperatureLabel')} <span className="text-primary font-semibold">{temperature.toFixed(1)}</span>
              </label>
              <input
                type="range"
                min={0}
                max={1}
                step={0.1}
                value={temperature}
                onChange={(e) => onTemperatureChange(parseFloat(e.target.value))}
                className="w-full accent-primary"
              />
              <div className="flex justify-between text-[10px] text-gray-400 mt-1">
                <span>{t('general.precise')}</span>
                <span>{t('general.creative')}</span>
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1.5">{t('general.maxTokensLabel')}</label>
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
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
              />
            </div>
          </div>
        </div>
      </Card>

      {/* ─── Context Sources ──────────────────────────── */}
      <Card padding="none">
        <div className="px-5 pt-4 pb-1">
          <h3 className="text-sm font-semibold text-gray-800">{t('general.contextTitle')}</h3>
          <p className="text-xs text-gray-500 mt-0.5">
            {t('general.contextSubtitle')}
          </p>
        </div>
        <div className="px-5 py-4">
          <div className="grid grid-cols-2 gap-3">
            {AVAILABLE_CONTEXT_SOURCE_KEYS.map((key) => (
              <label
                key={key}
                className={`flex items-start gap-3 p-3 rounded-lg cursor-pointer border transition-colors ${
                  contextSources.includes(key)
                    ? 'border-primary-200 bg-primary-50/50'
                    : 'border-gray-100 hover:border-gray-200'
                }`}
              >
                <input
                  type="checkbox"
                  checked={contextSources.includes(key)}
                  onChange={() => toggleContextSource(key)}
                  className="rounded border-gray-300 text-primary focus:ring-primary-500 mt-0.5"
                />
                <div>
                  <span className="text-xs font-medium text-gray-700">{t(`contextSources.${key}.label`)}</span>
                  <p className="text-[10px] text-gray-400 mt-0.5">{t(`contextSources.${key}.description`)}</p>
                </div>
              </label>
            ))}
          </div>
        </div>
      </Card>
    </div>
  );
}
