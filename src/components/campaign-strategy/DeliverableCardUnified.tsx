/**
 * Deliverable Card - Using Unified StatusCard
 * Deliverables displayed with consistent design system
 */

import React from 'react';
import { StatusCard } from '../unified/StatusCard';
import { deliverableToCardData } from '../../utils/status-card-adapters';

interface DeliverableData {
  id: string;
  title: string;
  type: string;
  status: 'not-started' | 'in-progress' | 'completed';
  description?: string;
  assignedTo?: string;
  dueDate?: string;
}

interface DeliverableCardUnifiedProps {
  deliverable: DeliverableData;
  onClick?: () => void;
}

export function DeliverableCardUnified({ deliverable, onClick }: DeliverableCardUnifiedProps) {
  const cardData = deliverableToCardData(deliverable, onClick);

  return <StatusCard data={cardData} />;
}

/**
 * List component for multiple deliverables
 */
interface DeliverableListUnifiedProps {
  deliverables: DeliverableData[];
  onDeliverableClick?: (deliverableId: string) => void;
}

export function DeliverableListUnified({ deliverables, onDeliverableClick }: DeliverableListUnifiedProps) {
  if (deliverables.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <p>No deliverables available</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {deliverables.map((deliverable) => (
        <DeliverableCardUnified
          key={deliverable.id}
          deliverable={deliverable}
          onClick={onDeliverableClick ? () => onDeliverableClick(deliverable.id) : undefined}
        />
      ))}
    </div>
  );
}
