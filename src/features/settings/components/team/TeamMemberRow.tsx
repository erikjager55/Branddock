'use client';

import { useState, useRef, useEffect } from 'react';
import { useUpdateMemberRole, useRemoveMember } from '@/hooks/use-settings';
import { OptimizedImage } from '@/components/shared';
import { RoleBadge } from './RoleBadge';
import { MoreHorizontal } from 'lucide-react';
import type { TeamMemberItem } from '@/types/settings';

interface TeamMemberRowProps {
  member: TeamMemberItem;
}

export function TeamMemberRow({ member }: TeamMemberRowProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [roleSubmenuOpen, setRoleSubmenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const updateRole = useUpdateMemberRole();
  const removeMember = useRemoveMember();

  // Close menu on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
        setRoleSubmenuOpen(false);
      }
    }
    if (menuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [menuOpen]);

  function handleRoleChange(role: 'admin' | 'member' | 'viewer') {
    updateRole.mutate({ memberId: member.id, data: { role } });
    setMenuOpen(false);
    setRoleSubmenuOpen(false);
  }

  function handleRemove() {
    removeMember.mutate(member.id);
    setMenuOpen(false);
  }

  // Build initials fallback
  const initials = member.name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const formattedDate = new Date(member.joinedAt).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  const isOwner = member.role.toLowerCase() === 'owner';

  return (
    <tr className="border-b border-gray-100 last:border-b-0 hover:bg-gray-50 transition-colors">
      {/* Member */}
      <td className="py-3 px-4">
        <div className="flex items-center gap-3">
          <OptimizedImage
            src={member.avatar}
            alt={member.name}
            avatar="sm"
            fallback={
              <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-medium">
                {initials}
              </div>
            }
          />
          <div className="min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">{member.name}</p>
            <p className="text-xs text-gray-500 truncate">{member.email}</p>
          </div>
        </div>
      </td>

      {/* Role */}
      <td className="py-3 px-4">
        <RoleBadge role={member.role} />
      </td>

      {/* Status */}
      <td className="py-3 px-4">
        <div className="flex items-center gap-1.5">
          <span
            className={`w-2 h-2 rounded-full ${
              member.isActive ? 'bg-green-500' : 'bg-gray-300'
            }`}
          />
          <span className="text-sm text-gray-600">
            {member.isActive ? 'Active' : 'Inactive'}
          </span>
        </div>
      </td>

      {/* Joined */}
      <td className="py-3 px-4">
        <span className="text-sm text-gray-500">{formattedDate}</span>
      </td>

      {/* Actions */}
      <td className="py-3 px-4">
        {!isOwner && (
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => {
                setMenuOpen(!menuOpen);
                setRoleSubmenuOpen(false);
              }}
              className="p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <MoreHorizontal className="w-4 h-4" />
            </button>

            {menuOpen && (
              <div className="absolute right-0 top-full mt-1 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-20 py-1">
                {/* Change Role */}
                <div className="relative">
                  <button
                    onClick={() => setRoleSubmenuOpen(!roleSubmenuOpen)}
                    className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center justify-between"
                  >
                    Change Role
                    <span className="text-gray-400 text-xs">&#9654;</span>
                  </button>

                  {roleSubmenuOpen && (
                    <div className="absolute left-full top-0 ml-1 w-36 bg-white border border-gray-200 rounded-lg shadow-lg z-30 py-1">
                      {(['admin', 'member', 'viewer'] as const).map((role) => (
                        <button
                          key={role}
                          onClick={() => handleRoleChange(role)}
                          disabled={member.role.toLowerCase() === role}
                          className={`w-full text-left px-3 py-1.5 text-sm hover:bg-gray-50 ${
                            member.role.toLowerCase() === role
                              ? 'text-gray-400 cursor-default'
                              : 'text-gray-700'
                          }`}
                        >
                          {role.charAt(0).toUpperCase() + role.slice(1)}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Remove */}
                <button
                  onClick={handleRemove}
                  className="w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50"
                >
                  Remove
                </button>
              </div>
            )}
          </div>
        )}
      </td>
    </tr>
  );
}
