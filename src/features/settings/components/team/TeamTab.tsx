'use client';

import { useSettingsStore } from '@/stores/useSettingsStore';
import { TeamPlanHeader } from './TeamPlanHeader';
import { TeamMembersTable } from './TeamMembersTable';
import { PendingInvites } from './PendingInvites';
import { RolePermissions } from './RolePermissions';
import { InviteMemberModal } from './InviteMemberModal';

export function TeamTab() {
  const isInviteModalOpen = useSettingsStore((s) => s.isInviteModalOpen);

  return (
    <div data-testid="team-tab" className="max-w-4xl space-y-6 p-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-900">Team Management</h2>
        <p className="mt-1 text-sm text-gray-500">
          Manage your team members, invitations, and role permissions.
        </p>
      </div>

      <TeamPlanHeader />
      <TeamMembersTable />
      <PendingInvites />
      <RolePermissions />

      {isInviteModalOpen && <InviteMemberModal />}
    </div>
  );
}
