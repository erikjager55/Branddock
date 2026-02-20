'use client';

import { EmptyState } from '@/components/shared';
import { Presentation } from 'lucide-react';
import { WorkshopCard } from './WorkshopCard';
import type { Workshop } from '../../types/workshop.types';

interface WorkshopCardListProps {
  workshops: Workshop[];
  onStart: (workshopId: string) => void;
}

export function WorkshopCardList({ workshops, onStart }: WorkshopCardListProps) {
  const startable = workshops.filter(
    (w) => w.status === 'PURCHASED' || w.status === 'SCHEDULED',
  );

  if (startable.length === 0) {
    return (
      <EmptyState
        icon={Presentation}
        title="No workshops available"
        description="Purchase a workshop first to start a session."
      />
    );
  }

  return (
    <div className="space-y-3">
      <h2 className="text-lg font-semibold text-gray-900">
        Available Workshops
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
