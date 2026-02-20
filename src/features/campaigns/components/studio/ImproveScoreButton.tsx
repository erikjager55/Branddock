'use client';

import React from 'react';
import { Sparkles } from 'lucide-react';
import { Button } from '@/components/shared';
import { useContentStudioStore } from '@/stores/useContentStudioStore';

export function ImproveScoreButton() {
  const handleClick = () => {
    useContentStudioStore.getState().setIsImprovePanelOpen(true);
  };

  return (
    <Button
      variant="cta"
      size="sm"
      icon={Sparkles}
      onClick={handleClick}
      fullWidth
    >
      Improve Score
    </Button>
  );
}

export default ImproveScoreButton;
