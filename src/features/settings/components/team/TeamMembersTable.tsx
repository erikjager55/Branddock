'use client';

import { useTeamMembers } from '@/hooks/use-settings';
import { TeamMemberRow } from './TeamMemberRow';
import { Skeleton, EmptyState } from '@/components/shared';
import { Users } from 'lucide-react';

export function TeamMembersTable() {
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
          title="No team members"
          description="Invite team members to start collaborating on your brand strategy."
        />
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
      <div className="px-5 py-3 border-b border-gray-100">
        <h3 className="text-sm font-semibold text-gray-900">
          Team Members ({members.length})
        </h3>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50">
              <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider py-2.5 px-4">
                Member
              </th>
              <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider py-2.5 px-4">
                Role
              </th>
              <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider py-2.5 px-4">
                Status
              </th>
              <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider py-2.5 px-4">
                Joined
              </th>
              <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider py-2.5 px-4 w-12">
                Actions
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
