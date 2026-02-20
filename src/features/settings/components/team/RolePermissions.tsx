'use client';

import { useTeamPermissions } from '@/hooks/use-settings';
import { useSettingsStore } from '@/stores/useSettingsStore';
import { Skeleton } from '@/components/shared';
import { ChevronDown, ChevronUp, CheckCircle, XCircle } from 'lucide-react';
import type { RolePermissions as RolePermissionsType } from '@/types/settings';

const PERMISSION_LABELS: { key: keyof RolePermissionsType; label: string }[] = [
  { key: 'canManageMembers', label: 'Manage Members' },
  { key: 'canManageBilling', label: 'Manage Billing' },
  { key: 'canDeleteWorkspace', label: 'Delete Workspace' },
  { key: 'canInvite', label: 'Invite' },
  { key: 'canEditContent', label: 'Edit Content' },
  { key: 'canViewContent', label: 'View Content' },
];

const ROLES = ['owner', 'admin', 'member', 'viewer'] as const;

const ROLE_HEADER_COLORS: Record<string, string> = {
  owner: 'text-purple-700',
  admin: 'text-blue-700',
  member: 'text-green-700',
  viewer: 'text-gray-700',
};

export function RolePermissions() {
  const { data, isLoading } = useTeamPermissions();
  const isExpanded = useSettingsStore((s) => s.isRolePermissionsExpanded);
  const setIsExpanded = useSettingsStore((s) => s.setIsRolePermissionsExpanded);

  if (isLoading) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-5">
        <Skeleton className="rounded" width={180} height={14} />
      </div>
    );
  }

  const permissions = data?.permissions;

  return (
    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-gray-50 transition-colors"
      >
        <h3 className="text-sm font-semibold text-gray-900">Role Permissions</h3>
        {isExpanded ? (
          <ChevronUp className="w-4 h-4 text-gray-400" />
        ) : (
          <ChevronDown className="w-4 h-4 text-gray-400" />
        )}
      </button>

      {isExpanded && permissions && (
        <div className="border-t border-gray-100 overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider py-2.5 px-4">
                  Permission
                </th>
                {ROLES.map((role) => (
                  <th
                    key={role}
                    className={`text-center text-xs font-medium uppercase tracking-wider py-2.5 px-4 ${ROLE_HEADER_COLORS[role]}`}
                  >
                    {role.charAt(0).toUpperCase() + role.slice(1)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {PERMISSION_LABELS.map((perm) => (
                <tr
                  key={perm.key}
                  className="border-b border-gray-100 last:border-b-0"
                >
                  <td className="py-2.5 px-4 text-sm text-gray-700">{perm.label}</td>
                  {ROLES.map((role) => {
                    const hasPermission = permissions[role][perm.key];
                    return (
                      <td key={role} className="py-2.5 px-4 text-center">
                        {hasPermission ? (
                          <CheckCircle className="w-4.5 h-4.5 text-green-500 mx-auto" />
                        ) : (
                          <XCircle className="w-4.5 h-4.5 text-red-400 mx-auto" />
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
