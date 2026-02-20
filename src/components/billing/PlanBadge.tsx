'use client';

// =============================================================
// PlanBadge — small badge showing current plan tier
//
// Used in sidebar footer, headers, settings pages.
// Shows "BETA" when billing is disabled (Free Beta mode).
// =============================================================

import React from 'react';
import { Crown, Sparkles, Building2, Rocket } from 'lucide-react';
import { Badge } from '@/components/shared';
import type { BadgeVariant } from '@/components/shared';
import type { PlanTier } from '@/types/billing';

interface PlanBadgeProps {
  tier: PlanTier;
  isFreeBeta?: boolean;
  className?: string;
}

const TIER_CONFIG: Record<PlanTier, {
  label: string;
  variant: BadgeVariant;
  icon: React.ElementType;
}> = {
  FREE: { label: 'Free', variant: 'default', icon: Rocket },
  PRO: { label: 'Pro', variant: 'teal', icon: Sparkles },
  AGENCY: { label: 'Agency', variant: 'info', icon: Building2 },
  ENTERPRISE: { label: 'Enterprise', variant: 'success', icon: Crown },
};

export function PlanBadge({ tier, isFreeBeta = false, className }: PlanBadgeProps) {
  if (isFreeBeta) {
    return (
      <Badge variant="teal" size="sm" icon={Sparkles} className={className}>
        BETA
      </Badge>
    );
  }

  const config = TIER_CONFIG[tier];

  return (
    <Badge variant={config.variant} size="sm" icon={config.icon} className={className}>
      {config.label}
    </Badge>
  );
}
