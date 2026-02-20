'use client';

import { Button } from '@/components/shared';
import { ChevronLeft, Target, Lock, Unlock } from 'lucide-react';

interface GoldenCircleHeaderProps {
  isLocked: boolean;
  onBack: () => void;
  onToggleLock: () => void;
  isToggling: boolean;
}

export function GoldenCircleHeader({
  isLocked,
  onBack,
  onToggleLock,
  isToggling,
}: GoldenCircleHeaderProps) {
  return (
    <div className="mb-6">
      <button
        onClick={onBack}
        className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-2 transition-colors"
      >
        <ChevronLeft className="w-4 h-4" />
        Back to Asset
      </button>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Target className="w-6 h-6 text-teal-600" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Golden Circle Canvas</h1>
            <p className="text-sm text-gray-500">
              Define your WHY, HOW, and WHAT
            </p>
          </div>
        </div>
        <Button
          variant={isLocked ? 'secondary' : 'primary'}
          size="sm"
          icon={isLocked ? Lock : Unlock}
          onClick={onToggleLock}
          isLoading={isToggling}
        >
          {isLocked ? 'Locked' : 'Unlocked'}
        </Button>
      </div>
    </div>
  );
}
