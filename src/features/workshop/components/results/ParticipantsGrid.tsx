'use client';

import { Users, User } from 'lucide-react';
import { OptimizedImage } from '@/components/shared';
import type { WorkshopParticipant } from '../../types/workshop.types';

interface ParticipantsGridProps {
  participants: WorkshopParticipant[];
}

export function ParticipantsGrid({ participants }: ParticipantsGridProps) {
  const safeParticipants = Array.isArray(participants) ? participants : [];
  if (safeParticipants.length === 0) return null;

  return (
    <div className="mb-6">
      <div className="flex items-center gap-2 mb-3">
        <Users className="w-5 h-5 text-teal-600" />
        <h3 className="text-lg font-semibold text-gray-900">Participants</h3>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {safeParticipants.map((p) => (
          <div
            key={p.id}
            className="flex items-center gap-3 p-3 bg-white border border-gray-100 rounded-lg"
          >
            <OptimizedImage
              src={p.avatarUrl}
              alt={p.name}
              avatar="sm"
              className="flex-shrink-0"
              fallback={
                <div className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
                  <User className="w-4 h-4 text-gray-400" />
                </div>
              }
            />
            <div className="min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">
                {p.name}
              </p>
              <p className="text-xs text-gray-500 truncate">{p.role}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
