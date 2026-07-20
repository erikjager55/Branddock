'use client';

import { useTranslation } from 'react-i18next';
import { useTeamMembers } from '@/hooks/use-settings';
import { TeamMemberRow } from './TeamMemberRow';
import { Skeleton, EmptyState } from '@/components/shared';
import { Users } from 'lucide-react';

export function TeamMembersTable() {
  const { t } = useTranslation('settings-team');
  const { data, isLoading } = useTeamMembers();

  if (isLoading) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-100">
          <Skeleton className="rounded" width={120} height={14} />
        </div>
        <div className="divide-y divide-gray-100">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 px-5 py-3">
              <Skeleton className="rounded-full" width={32} height={32} />
              <div className="flex-1 space-y-1.5">
                <Skeleton className="rounded" width="40%" height={12} />
                <Skeleton className="rounded" width="25%" height={10} />
              </div>
              <Skeleton className="rounded-full" width={60} height={20} />
              <Skeleton className="rounded" width={60} height={12} />
            </div>
          ))}
        </div>
      </div>
    );
  }

  const members = data?.members ?? [];

  if (members.length === 0) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-8">
        <EmptyState
          icon={Users}
          title={t('membersTable.empty.title')}
          description={t('membersTable.empty.description')}
        />
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
      <div className="px-5 py-3 border-b border-gray-100">
        <h3 className="text-sm font-semibold text-gray-900">
          {t('membersTable.title', { total: members.length })}
        </h3>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50">
              <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider py-2.5 px-4">
                {t('membersTable.columns.member')}
              </th>
              <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider py-2.5 px-4">
                {t('membersTable.columns.role')}
              </th>
              <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider py-2.5 px-4">
                {t('membersTable.columns.workspaces')}
              </th>
              <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider py-2.5 px-4">
                {t('membersTable.columns.status')}
              </th>
              <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider py-2.5 px-4">
                {t('membersTable.columns.joined')}
              </th>
              <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider py-2.5 px-4 w-12">
                {t('membersTable.columns.actions')}
              </th>
            </tr>
          </thead>
          <tbody>
            {members.map((member) => (
              <TeamMemberRow key={member.id} member={member} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
