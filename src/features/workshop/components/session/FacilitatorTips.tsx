'use client';

import { useTranslation } from 'react-i18next';
import { Lightbulb } from 'lucide-react';

const FACILITATOR_TIP_KEYS = [
  'session.tips.items.diversity',
  'session.tips.items.summarize',
  'session.tips.items.validate',
  'session.tips.items.focusWhy',
  'session.tips.items.actionItems',
];

interface FacilitatorTipsProps {
  currentStep: number;
}

export function FacilitatorTips({ currentStep }: FacilitatorTipsProps) {
  const { t } = useTranslation('workshop');
  if (currentStep !== 6) return null;

  return (
    <div className="mt-6 p-4 bg-amber-50 border border-amber-200 rounded-lg">
      <div className="flex items-center gap-2 mb-3">
        <Lightbulb className="w-5 h-5 text-amber-600" />
        <h3 className="text-sm font-semibold text-amber-800">
          {t('session.tips.title')}
        </h3>
      </div>
      <ul className="space-y-2">
        {FACILITATOR_TIP_KEYS.map((tipKey) => (
          <li key={tipKey} className="flex items-start gap-2 text-sm text-amber-700">
            <span className="mt-1 w-1.5 h-1.5 rounded-full bg-amber-400 flex-shrink-0" />
            {t(tipKey)}
          </li>
        ))}
      </ul>
    </div>
  );
}
