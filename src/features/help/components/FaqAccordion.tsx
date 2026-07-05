'use client';

import React from 'react';
import { useTranslation } from 'react-i18next';
import { useFaq } from '@/hooks/use-help';
import { Skeleton } from '@/components/shared';
import { FaqItem } from './FaqItem';

export function FaqAccordion() {
  const { t } = useTranslation('help');
  const { data: faqItems, isLoading } = useFaq();

  return (
    <section>
      <h2 className="text-lg font-semibold text-gray-900 mb-4">
        {t('faq.title')}
      </h2>

      {isLoading ? (
        <div className="space-y-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="border-b border-gray-100 py-4">
              <Skeleton className="rounded" width="70%" height={16} />
            </div>
          ))}
        </div>
      ) : faqItems && faqItems.length > 0 ? (
        <div>
          {faqItems.map((item) => (
            <FaqItem key={item.id} item={item} />
          ))}
        </div>
      ) : (
        <p className="text-sm text-gray-500">{t('faq.empty')}</p>
      )}
    </section>
  );
}
