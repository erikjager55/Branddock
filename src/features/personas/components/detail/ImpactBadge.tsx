'use client';

import { IMPACT_BADGES } from '../../constants/persona-demographics';

interface ImpactBadgeProps {
  impact: 'high' | 'medium' | 'low';
}

export function ImpactBadge({ impact }: ImpactBadgeProps) {
  const style = IMPACT_BADGES[impact];

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium ${style.bg} ${style.color}`}>
      {impact} impact
    </span>
  );
}
