'use client';

import { Pencil, Sparkles, Lock, Unlock, MessageCircle, Copy } from 'lucide-react';
import { Button } from '@/components/shared';
import type { PersonaWithMeta } from '../../types/persona.types';

interface PersonaActionBarProps {
  persona: PersonaWithMeta;
  isEditing: boolean;
  onEditToggle: () => void;
  onLockToggle: () => void;
  onChat: () => void;
  onRegenerate: () => void;
  onDuplicate: () => void;
  isDuplicating?: boolean;
}

export function PersonaActionBar({
  persona,
  isEditing,
  onEditToggle,
  onLockToggle,
  onChat,
  onRegenerate,
  onDuplicate,
  isDuplicating,
}: PersonaActionBarProps) {
  return (
    <div data-testid="persona-action-bar" className="flex items-center gap-2 flex-wrap">
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
        data-testid="persona-duplicate-button"
        variant="secondary"
        size="sm"
        icon={Copy}
        onClick={onDuplicate}
        disabled={isDuplicating}
      >
        {isDuplicating ? 'Duplicating...' : 'Duplicate'}
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

      <Button
        data-testid="persona-chat-detail-button"
        variant="cta"
        size="sm"
        icon={MessageCircle}
        onClick={onChat}
      >
        Chat with {persona.name.split(' ')[0]}
      </Button>
    </div>
  );
}
