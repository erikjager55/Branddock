'use client';

import { MessageCircle, Copy } from 'lucide-react';
import { Button } from '@/components/shared';
import type { PersonaWithMeta } from '../../types/persona.types';

interface PersonaActionBarProps {
  persona: PersonaWithMeta;
  onChat: () => void;
  onDuplicate: () => void;
  isDuplicating?: boolean;
}

export function PersonaActionBar({
  persona,
  onChat,
  onDuplicate,
  isDuplicating,
}: PersonaActionBarProps) {
  return (
    <div data-testid="persona-action-bar" className="flex items-center gap-2 flex-wrap">
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
