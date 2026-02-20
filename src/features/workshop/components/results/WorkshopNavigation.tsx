'use client';

import { Button } from '@/components/shared';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface WorkshopNavigationProps {
  onPrevious?: () => void;
  onNext?: () => void;
  hasPrevious: boolean;
  hasNext: boolean;
}

export function WorkshopNavigation({
  onPrevious,
  onNext,
  hasPrevious,
  hasNext,
}: WorkshopNavigationProps) {
  return (
    <div className="flex items-center gap-2">
      <Button
        variant="secondary"
        size="sm"
        icon={ChevronLeft}
        onClick={onPrevious}
        disabled={!hasPrevious}
      >
        Previous
      </Button>
      <Button
        variant="secondary"
        size="sm"
        icon={ChevronRight}
        iconPosition="right"
        onClick={onNext}
        disabled={!hasNext}
      >
        Next
      </Button>
    </div>
  );
}
