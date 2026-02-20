'use client';

// =============================================================
// BillingBanner — contextual billing notification bar
//
// Two modes:
// 1. Free Beta (BILLING_ENABLED=false): friendly banner
// 2. Usage Warning (billing enabled, >80% usage): upgrade prompt
// =============================================================

import React from 'react';
import { Sparkles, AlertTriangle, ArrowRight } from 'lucide-react';
import { Button } from '@/components/shared';
import { cn } from '@/lib/constants/design-tokens';

interface BillingBannerProps {
  isFreeBeta: boolean;
  usagePercentage?: number;
  onUpgrade?: () => void;
  className?: string;
}

export function BillingBanner({
  isFreeBeta,
  usagePercentage = 0,
  onUpgrade,
  className,
}: BillingBannerProps) {
  // Free Beta banner
  if (isFreeBeta) {
    return (
      <div
        className={cn(
          'flex items-center justify-between px-4 py-2.5 rounded-xl',
          'bg-gradient-to-r from-primary/10 to-emerald-50 border border-primary/20',
          className,
        )}
      >
        <div className="flex items-center gap-2">
          <div className="flex items-center justify-center h-7 w-7 rounded-lg bg-primary/15">
            <Sparkles className="h-4 w-4 text-primary" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-900">
              Free Beta — All features unlocked
            </p>
            <p className="text-xs text-gray-500">
              Enjoy full access during the beta period
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Usage warning banner (only show when >80%)
  if (usagePercentage <= 80) {
    return null;
  }

  const isAtLimit = usagePercentage >= 100;

  return (
    <div
      className={cn(
        'flex items-center justify-between px-4 py-2.5 rounded-xl',
        isAtLimit
          ? 'bg-red-50 border border-red-200'
          : 'bg-amber-50 border border-amber-200',
        className,
      )}
    >
      <div className="flex items-center gap-2">
        <div
          className={cn(
            'flex items-center justify-center h-7 w-7 rounded-lg',
            isAtLimit ? 'bg-red-100' : 'bg-amber-100',
          )}
        >
          <AlertTriangle
            className={cn(
              'h-4 w-4',
              isAtLimit ? 'text-red-600' : 'text-amber-600',
            )}
          />
        </div>
        <div>
          <p className="text-sm font-medium text-gray-900">
            {isAtLimit
              ? 'AI token limit reached'
              : `${usagePercentage}% of AI tokens used`}
          </p>
          <p className="text-xs text-gray-500">
            {isAtLimit
              ? 'Upgrade your plan to continue using AI features'
              : 'Consider upgrading to avoid interruptions'}
          </p>
        </div>
      </div>
      {onUpgrade && (
        <Button variant="primary" size="sm" onClick={onUpgrade} className="gap-1.5 flex-shrink-0">
          Upgrade
          <ArrowRight className="h-3.5 w-3.5" />
        </Button>
      )}
    </div>
  );
}
