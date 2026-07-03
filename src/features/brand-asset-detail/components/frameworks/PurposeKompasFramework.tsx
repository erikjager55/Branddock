'use client';

import { Heart, Leaf, Globe } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Badge, Card } from '@/components/shared';
import type { PurposeKompasFrameworkData, PurposeKompasPillar } from '../../types/framework.types';

const PILLAR_CONFIG = {
  mens: {
    tKey: 'people',
    icon: Heart,
    color: 'text-rose-600',
    bgColor: 'bg-rose-50',
  },
  milieu: {
    tKey: 'environment',
    icon: Leaf,
    color: 'text-emerald-600',
    bgColor: 'bg-emerald-50',
  },
  maatschappij: {
    tKey: 'society',
    icon: Globe,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
  },
} as const;

const IMPACT_VARIANTS: Record<string, 'success' | 'warning' | 'default'> = {
  high: 'success',
  medium: 'warning',
  low: 'default',
};

function PillarCard({
  pillarKey,
  pillar,
}: {
  pillarKey: keyof typeof PILLAR_CONFIG;
  pillar: PurposeKompasPillar;
}) {
  const { t } = useTranslation('brand-asset-detail');
  const config = PILLAR_CONFIG[pillarKey];
  const Icon = config.icon;

  return (
    <Card padding="sm">
      <Card.Body>
        <div className="flex items-start gap-3">
          <div className={`mt-0.5 h-9 w-9 rounded-lg ${config.bgColor} flex items-center justify-center flex-shrink-0`}>
            <Icon className={`w-4 h-4 ${config.color}`} />
          </div>
          <div className="flex-1 space-y-1.5">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium text-gray-900">{t(`purposeKompas.${config.tKey}.label`)}</h4>
                <p className="text-xs text-gray-400">{t(`purposeKompas.${config.tKey}.description`)}</p>
              </div>
              <Badge variant={IMPACT_VARIANTS[pillar.impact] ?? 'default'}>
                {t('purposeKompas.impact', { level: pillar.impact })}
              </Badge>
            </div>
            <p className="text-sm text-gray-600">{pillar.description}</p>
          </div>
        </div>
      </Card.Body>
    </Card>
  );
}

export function PurposeKompasFramework({ data }: { data: PurposeKompasFrameworkData }) {
  return (
    <div className="space-y-3">
      {(Object.keys(PILLAR_CONFIG) as Array<keyof typeof PILLAR_CONFIG>).map(
        (key) =>
          data.pillars[key] && (
            <PillarCard key={key} pillarKey={key} pillar={data.pillars[key]} />
          )
      )}
    </div>
  );
}
