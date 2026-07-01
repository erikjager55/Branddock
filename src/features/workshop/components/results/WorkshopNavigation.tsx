'use client';

import { useTranslation } from 'react-i18next';
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
  const { t } = useTranslation('workshop');
  return (
    <div className="flex items-center gap-2">
      <Button
        variant="secondary"
        size="sm"
        icon={ChevronLeft}
        onClick={onPrevious}
        disabled={!hasPrevious}
      >
        {t('common.previous')}
      </Button>
      <Button
        variant="secondary"
        size="sm"
        icon={ChevronRight}
        iconPosition="right"
        onClick={onNext}
        disabled={!hasNext}
      >
        {t('common.next')}
      </Button>
    </div>
  );
}
