/**
 * Validation Card - Using Unified StatusCard
 * Validation items displayed with consistent design system
 */

import React from 'react';
import { StatusCard } from '../unified/StatusCard';
import { validationToCardData } from '../../utils/status-card-adapters';

interface ValidationItemData {
  id: string;
  method: string;
  assetType: string;
  status: 'pending' | 'in-progress' | 'completed';
  progress?: number;
  description?: string;
}

interface ValidationCardUnifiedProps {
  validation: ValidationItemData;
  onClick?: () => void;
}

export function ValidationCardUnified({ validation, onClick }: ValidationCardUnifiedProps) {
  const cardData = validationToCardData(validation, onClick);

  return <StatusCard data={cardData} />;
}

/**
 * List component for multiple validation items
 */
interface ValidationListUnifiedProps {
  validations: ValidationItemData[];
  onValidationClick?: (validationId: string) => void;
}

export function ValidationListUnified({ validations, onValidationClick }: ValidationListUnifiedProps) {
  if (validations.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <p>No validation items available</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {validations.map((validation) => (
        <ValidationCardUnified
          key={validation.id}
          validation={validation}
          onClick={onValidationClick ? () => onValidationClick(validation.id) : undefined}
        />
      ))}
    </div>
  );
}
