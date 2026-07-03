'use client';

import { useTranslation } from 'react-i18next';
import { useSettingsStore } from '@/stores/useSettingsStore';
import { TeamPlanHeader } from './TeamPlanHeader';
import { TeamMembersTable } from './TeamMembersTable';
import { PendingInvites } from './PendingInvites';
import { RolePermissions } from './RolePermissions';
import { InviteMemberModal } from './InviteMemberModal';

export function TeamTab() {
  const { t } = useTranslation('settings-team');
  const isInviteModalOpen = useSettingsStore((s) => s.isInviteModalOpen);

  return (
    <div data-testid="team-tab" className="max-w-4xl space-y-6 p-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-900">{t('title')}</h2>
        <p className="mt-1 text-sm text-gray-500">{t('subtitle')}</p>
      </div>

      <TeamPlanHeader />
      <TeamMembersTable />
      <PendingInvites />
      <RolePermissions />

      {isInviteModalOpen && <InviteMemberModal />}
    </div>
  );
}
