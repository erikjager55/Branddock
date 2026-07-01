'use client';

import { useTranslation } from 'react-i18next';
import { useFormat } from '@/lib/ui-i18n/format';
import { Badge, Button } from '@/components/shared';
import {
  CheckCircle,
  Calendar,
  Users,
  Clock,
  User,
  FileDown,
  FileJson,
} from 'lucide-react';
import type { Workshop } from '../../types/workshop.types';
import { exportWorkshopPdf } from '../../utils/exportWorkshopPdf';

interface CompleteBannerProps {
  workshop: Workshop;
  brandAssetName?: string;
  onExportRaw: () => void;
}

export function CompleteBanner({ workshop, brandAssetName, onExportRaw }: CompleteBannerProps) {
  const { t } = useTranslation('workshop');
  const { formatDate } = useFormat();
  const completedDate = workshop.completedAt
    ? formatDate(workshop.completedAt, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    : t('common.na');

  const durationText = workshop.durationMinutes
    ? t('common.minutesShort', { minutes: Math.round(workshop.durationMinutes) })
    : t('common.na');

  return (
    <div data-testid="complete-banner" className="bg-emerald-50 border border-emerald-200 rounded-lg p-6 mb-6">
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3">
          <CheckCircle className="w-6 h-6 text-emerald-500 mt-0.5" />
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              {workshop.title || t('common.defaultTitle')}
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              {t('results.banner.subtitle')}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Badge variant="success">{t('results.banner.completed')}</Badge>
          <Button
            variant="secondary"
            size="sm"
            icon={FileDown}
            onClick={() => exportWorkshopPdf(workshop, brandAssetName)}
          >
            PDF
          </Button>
          <Button
            variant="secondary"
            size="sm"
            icon={FileJson}
            onClick={onExportRaw}
          >
            {t('results.banner.rawData')}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4 mt-4 pt-4 border-t border-emerald-200">
        <div className="flex items-center gap-2 text-sm">
          <Calendar className="w-4 h-4 text-emerald-600" />
          <div>
            <span className="text-gray-500 block text-xs">{t('results.banner.date')}</span>
            <span className="text-gray-900 font-medium">{completedDate}</span>
          </div>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <Users className="w-4 h-4 text-emerald-600" />
          <div>
            <span className="text-gray-500 block text-xs">{t('results.banner.participants')}</span>
            <span className="text-gray-900 font-medium">
              {workshop.participantCount ?? 0}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <Clock className="w-4 h-4 text-emerald-600" />
          <div>
            <span className="text-gray-500 block text-xs">{t('results.banner.duration')}</span>
            <span className="text-gray-900 font-medium">{durationText}</span>
          </div>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <User className="w-4 h-4 text-emerald-600" />
          <div>
            <span className="text-gray-500 block text-xs">{t('results.banner.facilitator')}</span>
            <span className="text-gray-900 font-medium">
              {workshop.facilitatorName || t('results.banner.selfGuided')}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
