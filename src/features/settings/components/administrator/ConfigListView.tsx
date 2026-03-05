'use client';

import { useState, useMemo } from 'react';
import { Bot, Plus } from 'lucide-react';
import { Button, SearchInput, EmptyState } from '@/components/shared';
import { ConfigCard } from './ConfigCard';
import type { ExplorationConfigData } from '@/lib/ai/exploration/config.types';

// ─── Tab Config ─────────────────────────────────────────────

interface ItemTypeTab {
  key: string;
  label: string;
}

const ITEM_TYPE_TABS: ItemTypeTab[] = [
  { key: 'brand_asset', label: 'Brand Assets' },
  { key: 'persona', label: 'Personas' },
  { key: 'product', label: 'Products' },
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
          <h2 className="text-lg font-semibold text-gray-900">AI Exploration Configuratie</h2>
          <p className="text-sm text-gray-500 mt-0.5">
            Configureer prompts, dimensies, AI model en context per onderdeel
          </p>
        </div>
        <Button variant="primary" size="md" icon={Plus} onClick={onCreateConfig}>
          Nieuwe configuratie
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
                    ? 'text-teal-600 border-b-2 border-teal-500'
                    : 'text-gray-500 hover:text-gray-700 border-b-2 border-transparent'
                }`}
              >
                {tab.label}
                <span className={`text-[10px] font-semibold rounded-full px-1.5 py-0.5 ${
                  isActive ? 'bg-teal-100 text-teal-700' : 'bg-gray-100 text-gray-500'
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
        placeholder="Zoek op label of subtype..."
        className="max-w-sm"
      />

      {/* Grid */}
      {filteredConfigs.length === 0 ? (
        <EmptyState
          icon={Bot}
          title={search ? 'Geen resultaten' : 'Geen configuraties'}
          description={
            search
              ? `Geen configuraties gevonden voor "${search}"`
              : `Er zijn nog geen AI Exploration configuraties voor ${ITEM_TYPE_TABS.find((t) => t.key === activeTab)?.label ?? activeTab}. Het systeem gebruikt standaard instellingen.`
          }
          action={
            !search
              ? {
                  label: 'Nieuwe configuratie',
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
