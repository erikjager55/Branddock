'use client';

import { MessageCircle, Copy } from 'lucide-react';
import { useTranslation } from 'react-i18next';
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
  const { t } = useTranslation('personas');
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
        {isDuplicating ? t('actionBar.duplicating') : t('actionBar.duplicate')}
      </Button>

      <Button
        data-testid="persona-chat-detail-button"
        variant="cta"
        size="sm"
        icon={MessageCircle}
        onClick={onChat}
      >
        {t('card.chatWith', { name: persona.name.split(' ')[0] })}
      </Button>
    </div>
  );
}
