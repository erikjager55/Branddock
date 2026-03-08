'use client';

import { Button } from '@/components/shared';
import { Lock, Unlock, Pencil } from 'lucide-react';
import { CanvasFrameworkRenderer } from './CanvasFrameworkRenderer';

interface CanvasTabProps {
  canvasData: Record<string, unknown> | null;
  canvasLocked: boolean;
  isEditing: boolean;
  onToggleLock: () => void;
  onToggleEdit: () => void;
}

export function CanvasTab({
  canvasData,
  canvasLocked,
  isEditing,
  onToggleLock,
  onToggleEdit,
}: CanvasTabProps) {
  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">
          Golden Circle Framework
        </h3>
        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            icon={canvasLocked ? Lock : Unlock}
            onClick={onToggleLock}
          >
            {canvasLocked ? 'Locked' : 'Unlocked'}
          </Button>
          {!canvasLocked && (
            <Button
              variant={isEditing ? 'primary' : 'secondary'}
              size="sm"
              icon={Pencil}
              onClick={onToggleEdit}
            >
              {isEditing ? 'Done' : 'Edit'}
            </Button>
          )}
        </div>
      </div>

      <CanvasFrameworkRenderer canvasData={canvasData} />
    </div>
  );
}
