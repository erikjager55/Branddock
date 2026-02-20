'use client';

import { Pencil, Sparkles, Lock, Unlock } from 'lucide-react';
import { OptimizedImage, Button } from '@/components/shared';
import type { PersonaWithMeta } from '../../types/persona.types';
import { CircularProgress } from './CircularProgress';

interface PersonaDetailHeaderProps {
  persona: PersonaWithMeta;
  isEditing: boolean;
  onEditToggle: () => void;
  onLockToggle: () => void;
  onRegenerate: () => void;
}

export function PersonaDetailHeader({
  persona,
  isEditing,
  onEditToggle,
  onLockToggle,
  onRegenerate,
}: PersonaDetailHeaderProps) {
  const completedMethods = persona.researchMethods.filter(
    (m) => m.status === 'COMPLETED' || m.status === 'VALIDATED',
  ).length;

  const initials = persona.name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <div data-testid="persona-detail-header" className="flex items-center gap-5">
      {/* Avatar */}
      <OptimizedImage
        src={persona.avatarUrl}
        alt={persona.name}
        avatar="lg"
        className="ring-2 ring-white shadow"
        fallback={
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-white text-lg font-bold ring-2 ring-white shadow">
            {initials}
          </div>
        }
      />

      {/* Name + meta */}
      <div className="flex-1 min-w-0">
        <h1 className="text-2xl font-bold text-gray-900">{persona.name}</h1>
        {persona.tagline && (
          <p className="text-sm text-gray-500 mt-0.5">{persona.tagline}</p>
        )}
        <div className="flex items-center gap-4 mt-2">
          <CircularProgress percentage={persona.validationPercentage} />
          <span className="text-sm text-gray-500">
            Methods Completed {completedMethods}/4
          </span>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-2 flex-shrink-0">
        <Button
          data-testid="persona-edit-button"
          variant={isEditing ? 'cta' : 'secondary'}
          size="sm"
          icon={Pencil}
          onClick={onEditToggle}
          disabled={persona.isLocked}
        >
          {isEditing ? 'Editing' : 'Edit Content'}
        </Button>

        <Button
          data-testid="persona-regenerate-button"
          variant="secondary"
          size="sm"
          icon={Sparkles}
          onClick={onRegenerate}
          disabled={persona.isLocked}
        >
          Regenerate with AI
        </Button>

        <Button
          data-testid="persona-lock-button"
          variant="secondary"
          size="sm"
          icon={persona.isLocked ? Lock : Unlock}
          onClick={onLockToggle}
        >
          {persona.isLocked ? 'Locked' : 'Unlocked'}
        </Button>
      </div>
    </div>
  );
}
