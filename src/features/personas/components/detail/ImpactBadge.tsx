'use client';

import { useTranslation } from 'react-i18next';
import { IMPACT_BADGES } from '../../constants/persona-demographics';

interface ImpactBadgeProps {
  impact: 'high' | 'medium' | 'low';
}

export function ImpactBadge({ impact }: ImpactBadgeProps) {
  const { t } = useTranslation('personas');
  // Persisted AI output can carry off-enum values ('High', 'HIGH') despite
  // the prop type — fall back to medium instead of crashing the render
  // (same defect class as audit 2026-06-11 alignment-auditor finding).
  const style = IMPACT_BADGES[impact] ?? IMPACT_BADGES.medium;

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium ${style.bg} ${style.color} ${style.border}`}>
      {t('impact.label', { impact })}
    </span>
  );
}
