'use client';

import { useTranslation } from 'react-i18next';
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
  const { t } = useTranslation('workshop');
  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">
          {t('results.canvasTab.title')}
        </h3>
        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            icon={canvasLocked ? Lock : Unlock}
            onClick={onToggleLock}
          >
            {canvasLocked ? t('results.canvasTab.locked') : t('results.canvasTab.unlocked')}
          </Button>
          {!canvasLocked && (
            <Button
              variant={isEditing ? 'primary' : 'secondary'}
              size="sm"
              icon={Pencil}
              onClick={onToggleEdit}
            >
              {isEditing ? t('results.canvasTab.done') : t('results.canvasTab.edit')}
            </Button>
          )}
        </div>
      </div>

      <CanvasFrameworkRenderer canvasData={canvasData} />
    </div>
  );
}
