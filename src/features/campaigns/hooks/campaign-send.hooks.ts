// =============================================================
// Campaign Send hooks (4.2 step 4b)
// =============================================================

'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

export interface CampaignSendDto {
  id: string;
  status:
    | 'DRAFT'
    | 'QUEUED'
    | 'SENDING'
    | 'COMPLETED'
    | 'PARTIAL'
    | 'FAILED'
    | 'CANCELLED';
  subject: string;
  recipientCount: number;
  deliveredCount: number;
  openedCount: number;
  clickedCount: number;
  bouncedCount: number;
  complainedCount: number;
  unsubscribedCount: number;
  failedCount: number;
  errorMessage: string | null;
  startedAt: string | null;
  completedAt: string | null;
  scheduledAt: string | null;
  createdAt: string;
}

export const campaignSendKeys = {
  all: ['campaign-send'] as const,
  status: (campaignId: string, deliverableId: string) =>
    ['campaign-send', campaignId, deliverableId] as const,
};

/**
 * Poll the latest CampaignSend for a deliverable. Refetches every 5s while
 * the send is SENDING so the stats counters tick up as webhook events arrive.
 */
export function useCampaignSendStatus(campaignId: string, deliverableId: string) {
  return useQuery({
    queryKey: campaignSendKeys.status(campaignId, deliverableId),
    queryFn: async (): Promise<CampaignSendDto | null> => {
      const res = await fetch(
        `/api/campaigns/${campaignId}/deliverables/${deliverableId}/send-status`,
      );
      if (!res.ok) throw new Error('Failed to fetch send status');
      const data = await res.json();
      return data.send ?? null;
    },
    enabled: Boolean(campaignId && deliverableId),
    refetchInterval: (query) => {
      const send = query.state.data;
      if (!send) return false;
      if (send.status === 'SENDING' || send.status === 'QUEUED') return 5_000;
      // Still poll slowly for a minute after completion so opens / clicks show up
      const completedAt = send.completedAt ? new Date(send.completedAt).getTime() : 0;
      const ageMs = Date.now() - completedAt;
      return ageMs < 5 * 60_000 ? 10_000 : false;
    },
  });
}

export interface SendCampaignInput {
  recipientEmails: string[];
  subject?: string;
}

/** Fire a campaign send. Invalidates status on success so the UI polls fresh data. */
export function useSendCampaign(campaignId: string, deliverableId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: SendCampaignInput) => {
      const res = await fetch(
        `/api/campaigns/${campaignId}/deliverables/${deliverableId}/send`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(input),
        },
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.error ?? 'Failed to send campaign');
      }
      return data.send as { id: string; status: CampaignSendDto['status']; recipientCount: number; acceptedCount: number; failedCount: number };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: campaignSendKeys.status(campaignId, deliverableId) });
    },
  });
}
