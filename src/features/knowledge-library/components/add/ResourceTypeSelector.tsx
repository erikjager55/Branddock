'use client';

import { useTranslation } from 'react-i18next';
import { RESOURCE_TYPE_ICONS } from '../../constants/library-constants';
import { ResourceTypeIcon } from '../shared/ResourceTypeIcon';
import type { ResourceType } from '../../types/knowledge-library.types';

interface ResourceTypeSelectorProps {
  selected: ResourceType;
  onChange: (type: ResourceType) => void;
}

const ALL_TYPES = Object.keys(RESOURCE_TYPE_ICONS) as ResourceType[];

export function ResourceTypeSelector({ selected, onChange }: ResourceTypeSelectorProps) {
  const { t } = useTranslation('knowledge-library');
  return (
    <div className="mb-4">
      <label className="block text-sm font-medium text-gray-700 mb-1">{t('manual.resourceTypeLabel')}</label>
      <select
        value={selected}
        onChange={(e) => onChange(e.target.value as ResourceType)}
        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-green-500"
      >
        {ALL_TYPES.map((type) => (
          <option key={type} value={type}>
            {t(`types.${type}`)}
          </option>
        ))}
      </select>
    </div>
  );
}
