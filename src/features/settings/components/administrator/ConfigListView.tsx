'use client';

import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Bot, Plus } from 'lucide-react';
import { Button, SearchInput, EmptyState } from '@/components/shared';
import { ConfigCard } from './ConfigCard';
import type { ExplorationConfigData } from '@/lib/ai/exploration/config.types';

// ─── Tab Config ─────────────────────────────────────────────

interface ItemTypeTab {
  key: string;
}

const ITEM_TYPE_TABS: ItemTypeTab[] = [
  { key: 'brand_asset' },
  { key: 'persona' },
  { key: 'product' },
];

// ─── Props ──────────────────────────────────────────────────

interface ConfigListViewProps {
  configs: ExplorationConfigData[];
  onSelectConfig: (id: string) => void;
  onCreateConfig: () => void;
  onDeleteConfig: (id: string) => void;
  onDuplicateConfig: (config: ExplorationConfigData) => void;
}

// ─── Component ──────────────────────────────────────────────

export function ConfigListView({
  configs,
  onSelectConfig,
  onCreateConfig,
  onDeleteConfig,
  onDuplicateConfig,
}: ConfigListViewProps) {
  const { t } = useTranslation('settings-admin');
  const [activeTab, setActiveTab] = useState('brand_asset');
  const [search, setSearch] = useState('');

  // Count per tab
  const countByType = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const tab of ITEM_TYPE_TABS) {
      counts[tab.key] = configs.filter((c) => c.itemType === tab.key).length;
    }
    return counts;
  }, [configs]);

  // Filtered configs
  const filteredConfigs = useMemo(() => {
    let filtered = configs.filter((c) => c.itemType === activeTab);
    if (search.trim()) {
      const q = search.toLowerCase();
      filtered = filtered.filter((c) =>
        (c.label ?? '').toLowerCase().includes(q) ||
        (c.itemSubType ?? '').toLowerCase().includes(q) ||
        c.itemType.toLowerCase().includes(q),
      );
    }
    return filtered;
  }, [configs, activeTab, search]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">{t('list.title')}</h2>
          <p className="text-sm text-gray-500 mt-0.5">
            {t('list.subtitle')}
          </p>
        </div>
        <Button variant="primary" size="md" icon={Plus} onClick={onCreateConfig}>
          {t('list.newConfig')}
        </Button>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <div className="flex items-center gap-0">
          {ITEM_TYPE_TABS.map((tab) => {
            const isActive = tab.key === activeTab;
            const count = countByType[tab.key] ?? 0;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`relative flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition-colors ${
                  isActive
                    ? 'text-primary border-b-2 border-primary-500'
                    : 'text-gray-500 hover:text-gray-700 border-b-2 border-transparent'
                }`}
              >
                {t(`itemTypes.${tab.key}`)}
                <span className={`text-[10px] font-semibold rounded-full px-1.5 py-0.5 ${
                  isActive ? 'bg-primary-100 text-primary-700' : 'bg-gray-100 text-gray-500'
                }`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Search */}
      <SearchInput
        value={search}
        onChange={setSearch}
        placeholder={t('list.searchPlaceholder')}
        className="max-w-sm"
      />

      {/* Grid */}
      {filteredConfigs.length === 0 ? (
        <EmptyState
          icon={Bot}
          title={search ? t('list.noResults') : t('list.noConfigs')}
          description={
            search
              ? t('list.noResultsDescription', { query: search })
              : t('list.emptyDescription', { itemType: t(`itemTypes.${activeTab}`) })
          }
          action={
            !search
              ? {
                  label: t('list.newConfig'),
                  onClick: onCreateConfig,
                }
              : undefined
          }
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredConfigs.map((config) => (
            <ConfigCard
              key={config.id}
              config={config}
              onSelect={() => onSelectConfig(config.id)}
              onDuplicate={() => onDuplicateConfig(config)}
              onDelete={() => onDeleteConfig(config.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
