'use client';

import { useTeam } from '@/hooks/use-settings';
import { useSettingsStore } from '@/stores/useSettingsStore';
import { useBillingPlan } from '@/hooks/use-billing';
import { Button, ProgressBar, Skeleton } from '@/components/shared';
import { PlanBadge } from '@/components/billing';
import { Users, Plus, ArrowUpRight } from 'lucide-react';
import { formatLimit } from '@/lib/constants/plan-limits';

export function TeamPlanHeader() {
  const { data, isLoading } = useTeam();
  const billing = useBillingPlan();
  const setIsInviteModalOpen = useSettingsStore((s) => s.setIsInviteModalOpen);
  const setActiveTab = useSettingsStore((s) => s.setActiveTab);

  if (isLoading || billing.isLoading) {
    return (
      <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
        <div className="flex items-center gap-3">
          <Skeleton className="rounded-lg" width={40} height={40} />
          <div className="flex-1 space-y-2">
            <Skeleton className="rounded" width="50%" height={14} />
            <Skeleton className="rounded" width="30%" height={10} />
          </div>
        </div>
        <Skeleton className="rounded" width="100%" height={8} />
      </div>
    );
  }

  const team = data?.team;
  if (!team) return null;

  const seatLimit = billing.limits.TEAM_MEMBERS;
  const seatCount = team.memberCount;
  const isUnlimited = !isFinite(seatLimit);
  const seatPercent = isUnlimited
    ? 0
    : seatLimit > 0
    ? Math.min(100, Math.round((seatCount / seatLimit) * 100))
    : 0;
  const seatColor = seatPercent > 80 ? 'red' as const : seatPercent >= 50 ? 'amber' as const : 'emerald' as const;

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <Users className="w-5 h-5 text-primary" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-gray-900">{team.name}</h3>
              <PlanBadge tier={billing.plan.tier} isFreeBeta={billing.isFreeBeta} />
            </div>
            <p className="text-xs text-gray-500 mt-0.5">
              {seatCount} of {isUnlimited ? 'Unlimited' : formatLimit(seatLimit)} seats used
            </p>
          </div>
        </div>

        <Button
          variant="cta"
          size="sm"
          icon={Plus}
          onClick={() => setIsInviteModalOpen(true)}
        >
          Invite Member
        </Button>
      </div>

      {!isUnlimited && (
        <div className="flex items-center justify-between mt-2">
          <ProgressBar value={seatPercent} color={seatColor} size="sm" />
          {billing.canUpgrade && (
            <button
              type="button"
              onClick={() => setActiveTab('billing')}
              className="flex items-center gap-1 text-xs text-primary hover:text-primary/80 font-medium ml-4 flex-shrink-0"
            >
              Upgrade Plan
              <ArrowUpRight className="w-3 h-3" />
            </button>
          )}
        </div>
      )}

      {isUnlimited && billing.isFreeBeta && (
        <p className="text-xs text-primary/70 mt-2">
          Unlimited seats during beta
        </p>
      )}
    </div>
  );
}
