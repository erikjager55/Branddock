'use client';

import { Heart, Leaf, Globe } from 'lucide-react';
import { Badge, Card } from '@/components/shared';
import type { PurposeKompasFrameworkData, PurposeKompasPillar } from '../../types/framework.types';

const PILLAR_CONFIG = {
  mens: {
    label: 'Mens',
    description: 'Gezonde leefstijl, zelfontwikkeling en persoonlijke groei',
    icon: Heart,
    color: 'text-rose-600',
    bgColor: 'bg-rose-50',
  },
  milieu: {
    label: 'Milieu',
    description: 'Duurzaamheid, CO₂-reductie en circulaire productie',
    icon: Leaf,
    color: 'text-emerald-600',
    bgColor: 'bg-emerald-50',
  },
  maatschappij: {
    label: 'Maatschappij',
    description: 'Bestrijding ongelijkheid, community en sociale impact',
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
                <h4 className="font-medium text-gray-900">{config.label}</h4>
                <p className="text-xs text-gray-400">{config.description}</p>
              </div>
              <Badge variant={IMPACT_VARIANTS[pillar.impact] ?? 'default'}>
                {pillar.impact} impact
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
