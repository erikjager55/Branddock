'use client';

import React, { useEffect, useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { Modal } from '@/components/shared/Modal';
import { Button } from '@/components/shared/Button';
import { useClawStore } from '@/stores/useClawStore';
import { ALL_CONTEXT_MODULES, type ContextModule } from '@/lib/claw/claw.types';

interface EntityOption {
  id: string;
  label: string;
  meta: string | null;
}

type EntityMap = Partial<Record<string, EntityOption[]>>;

const DRILLABLE_MODULES: ContextModule[] = [
  'brand_assets', 'personas', 'products', 'competitors', 'strategies', 'campaigns',
];

const MODULE_LABELS: Record<ContextModule, { label: string; description: string }> = {
  brand_assets: { label: 'Brand Assets', description: 'All 12 brand foundation assets with framework data' },
  brandstyle: { label: 'Brandstyle', description: 'Colors, typography, tone of voice, visual language' },
  personas: { label: 'Personas', description: 'Target audience profiles with demographics and psychographics' },
  products: { label: 'Products & Services', description: 'Product catalog with features and pricing' },
  competitors: { label: 'Competitors', description: 'Competitor analysis with positioning and scores' },
  trends: { label: 'Trends', description: 'Detected market trends and relevance scores' },
  strategies: { label: 'Business Strategies', description: 'OKR strategies with objectives and progress' },
  campaigns: { label: 'Campaigns', description: 'Active campaigns with strategy and deliverables' },
  alignment: { label: 'Brand Alignment', description: 'Consistency issues between brand elements' },
  knowledge: { label: 'Knowledge Library', description: 'Articles, case studies, and resources' },
  dashboard: { label: 'Dashboard Stats', description: 'Workspace health metrics and readiness' },
};

function estimateContextTokens(moduleCount: number): number {
  return 400 + moduleCount * 800;
}

export function ContextSelectorModal({ onClose }: { onClose: () => void }) {
  const { contextSelection, toggleModule, setContextSelection } = useClawStore();
  const [entities, setEntities] = useState<EntityMap>({});
  const [expandedModule, setExpandedModule] = useState<ContextModule | null>(null);

  const selectedCount = contextSelection.modules.length;
  const estimatedTokens = estimateContextTokens(selectedCount);

  useEffect(() => {
    fetch('/api/claw/context-entities')
      .then((r) => r.ok ? r.json() : null)
      .then((data) => { if (data) setEntities(data); })
      .catch(() => {});
  }, []);

  const toggleEntity = (module: ContextModule, entityId: string) => {
    const current = contextSelection.entityIds?.[module] ?? [];
    const updated = current.includes(entityId)
      ? current.filter((id) => id !== entityId)
      : [...current, entityId];

    setContextSelection({
      ...contextSelection,
      entityIds: {
        ...contextSelection.entityIds,
        [module]: updated.length > 0 ? updated : undefined,
      },
    });
  };

  const isDrillable = (mod: ContextModule) => DRILLABLE_MODULES.includes(mod);
  const getEntityCount = (mod: ContextModule) => {
    const ids = contextSelection.entityIds?.[mod];
    if (!ids?.length) return null;
    return ids.length;
  };

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      title="Context Sources"
      subtitle="Select which brand data the assistant can access"
      size="sm"
      footer={
        <div className="flex items-center justify-between w-full">
          <span className="text-xs text-gray-400">
            ~{estimatedTokens.toLocaleString()} tokens ({selectedCount} sources)
          </span>
          <Button variant="primary" size="sm" onClick={onClose}>
            Done
          </Button>
        </div>
      }
    >
      <div className="space-y-0.5">
        {ALL_CONTEXT_MODULES.map((mod) => {
          const info = MODULE_LABELS[mod];
          const isSelected = contextSelection.modules.includes(mod);
          const drillable = isDrillable(mod);
          const isExpanded = expandedModule === mod;
          const entityList = entities[mod] ?? [];
          const entityCount = getEntityCount(mod);

          return (
            <div key={mod}>
              {/* Module row */}
              <label
                className={`flex items-center gap-3 rounded-lg p-2.5 cursor-pointer transition-colors ${
                  isSelected
                    ? 'bg-teal-50 border border-teal-200'
                    : 'hover:bg-gray-50 border border-transparent'
                }`}
              >
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => toggleModule(mod)}
                  className="h-4 w-4 rounded border-gray-300 text-teal-600 focus:ring-teal-500"
                />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-gray-900">
                    {info.label}
                    {entityCount !== null && (
                      <span className="ml-1.5 text-xs text-teal-600 font-normal">
                        ({entityCount} selected)
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-gray-500">{info.description}</div>
                </div>

                {drillable && isSelected && entityList.length > 0 && (
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setExpandedModule(isExpanded ? null : mod);
                    }}
                    className="p-1 rounded text-gray-400 hover:text-gray-600"
                  >
                    {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                  </button>
                )}
              </label>

              {/* Entity list (expanded) */}
              {isExpanded && isSelected && entityList.length > 0 && (
                <div className="ml-10 mb-2 max-h-48 overflow-y-auto space-y-0.5">
                  <div className="text-xs text-gray-400 px-2 py-1">
                    No selection = all included
                  </div>
                  {entityList.map((entity) => {
                    const selectedIds = contextSelection.entityIds?.[mod] ?? [];
                    const isEntitySelected = selectedIds.length === 0 || selectedIds.includes(entity.id);
                    return (
                      <label
                        key={entity.id}
                        className={`flex items-center gap-2.5 px-2 py-1.5 rounded-md cursor-pointer transition-colors ${
                          isEntitySelected ? 'text-gray-900' : 'text-gray-400'
                        } hover:bg-gray-50`}
                      >
                        <input
                          type="checkbox"
                          checked={selectedIds.length === 0 || selectedIds.includes(entity.id)}
                          onChange={() => toggleEntity(mod, entity.id)}
                          className="h-3.5 w-3.5 rounded border-gray-300 text-teal-600 focus:ring-teal-500"
                        />
                        <span className="text-sm truncate">{entity.label}</span>
                        {entity.meta && (
                          <span className="text-xs text-gray-400 ml-auto flex-shrink-0">{entity.meta}</span>
                        )}
                      </label>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </Modal>
  );
}
