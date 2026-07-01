'use client';

import { useTranslation } from 'react-i18next';
import { EmptyState } from '@/components/shared';
import { Presentation } from 'lucide-react';
import { WorkshopCard } from './WorkshopCard';
import type { Workshop } from '../../types/workshop.types';

interface WorkshopCardListProps {
  workshops: Workshop[];
  onStart: (workshopId: string) => void;
}

export function WorkshopCardList({ workshops, onStart }: WorkshopCardListProps) {
  const { t } = useTranslation('workshop');
  const startable = workshops.filter(
    (w) => w.status === 'PURCHASED' || w.status === 'SCHEDULED',
  );

  if (startable.length === 0) {
    return (
      <EmptyState
        icon={Presentation}
        title={t('session.list.emptyTitle')}
        description={t('session.list.emptyDesc')}
      />
    );
  }

  return (
    <div className="space-y-3">
      <h2 className="text-lg font-semibold text-gray-900">
        {t('session.list.title')}
      </h2>
      {startable.map((workshop) => (
        <WorkshopCard
          key={workshop.id}
          workshop={workshop}
          onStart={onStart}
        />
      ))}
    </div>
  );
}
