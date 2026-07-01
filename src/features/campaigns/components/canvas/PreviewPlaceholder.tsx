'use client';

import React from 'react';
import { useTranslation } from 'react-i18next';
import { Eye } from 'lucide-react';
import { EmptyState } from '@/components/shared';

export function PreviewPlaceholder() {
  const { t } = useTranslation('campaigns-canvas');
  return (
    <div className="w-96 flex-shrink-0 border-l border-gray-200 bg-white flex items-center justify-center p-6">
      <EmptyState
        icon={Eye}
        title={t('previewPlaceholder.title')}
        description={t('previewPlaceholder.description')}
      />
    </div>
  );
}
