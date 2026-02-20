'use client';

import React from 'react';
import { Button } from '@/components/shared';

// ─── Types ─────────────────────────────────────────────

interface BulkApplyButtonProps {
  pendingCount: number;
  onApply: () => void;
  isLoading: boolean;
}

// ─── Component ─────────────────────────────────────────

export function BulkApplyButton({ pendingCount, onApply, isLoading }: BulkApplyButtonProps) {
  return (
    <Button
      variant="cta"
      size="md"
      fullWidth
      onClick={onApply}
      disabled={pendingCount === 0 || isLoading}
      isLoading={isLoading}
    >
      Apply All Suggestions ({pendingCount} changes)
    </Button>
  );
}

export default BulkApplyButton;
