'use client';

import { useTranslation } from 'react-i18next';
import { ChevronLeft, Play } from 'lucide-react';
import { Badge } from '@/components/shared';

interface WorkshopSessionHeaderProps {
  title: string | null;
  assetName?: string;
  onBack: () => void;
}

export function WorkshopSessionHeader({
  title,
  assetName,
  onBack,
}: WorkshopSessionHeaderProps) {
  const { t } = useTranslation('workshop');
  return (
    <div className="mb-6">
      <button
        onClick={onBack}
        className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-2 transition-colors"
      >
        <ChevronLeft className="w-4 h-4" />
        {t('common.backToAsset')}
      </button>
      <div className="flex items-center gap-3">
        <h1 className="text-2xl font-bold text-gray-900">
          {title || t('common.defaultTitle')}
        </h1>
        <Badge variant="success" icon={Play}>
          {t('session.header.inProgress')}
        </Badge>
      </div>
      {assetName && (
        <p className="text-sm text-gray-500 mt-1">{assetName}</p>
      )}
    </div>
  );
}
