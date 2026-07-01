'use client';

import { useState } from 'react';
import { Clock, User, RotateCcw } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { useFormat } from '@/lib/ui-i18n/format';
import { useVersionHistory } from '@/hooks/useVersionHistory';
import { useRestorePersonaVersion } from '../../../hooks';

interface VersionHistoryCardProps {
  personaId: string;
  isLocked: boolean;
}

export function VersionHistoryCard({ personaId, isLocked }: VersionHistoryCardProps) {
  const { t } = useTranslation('personas');
  const { formatDate } = useFormat();
  const { data: versions, isLoading } = useVersionHistory('PERSONA', personaId);
  const restoreMutation = useRestorePersonaVersion(personaId);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);

  const handleRestore = (versionId: string, versionNumber: number) => {
    restoreMutation.mutate(versionId, {
      onSuccess: () => {
        toast.success(t('versions.restoredTo', { version: versionNumber }));
        setConfirmingId(null);
      },
      onError: (err) => {
        toast.error(err instanceof Error ? err.message : t('versions.restoreFailed'));
        setConfirmingId(null);
      },
    });
  };

  const total = versions?.length ?? 0;

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="flex items-center gap-2 mb-3">
        <Clock className="w-4 h-4 text-gray-500" />
        <h3 className="text-sm font-semibold text-gray-900">{t('versions.title')}</h3>
        {total > 0 && (
          <span className="text-xs text-gray-400">({total})</span>
        )}
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {[1, 2].map((i) => (
            <div key={i} className="h-10 bg-gray-50 rounded animate-pulse" />
          ))}
        </div>
      ) : total === 0 ? (
        <p className="text-xs text-gray-400 py-2">
          {t('versions.empty')}
        </p>
      ) : (
        <div className="space-y-0">
          {versions!.slice(0, 5).map((v, index) => (
            <div
              key={v.id}
              className="flex gap-2.5 py-2.5 border-b border-gray-50 last:border-0"
            >
              {/* Version badge */}
              <div className="flex flex-col items-center">
                <div
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-semibold ${
                    index === 0
                      ? 'bg-primary-100 text-primary-700'
                      : 'bg-gray-100 text-gray-500'
                  }`}
                >
                  v{v.version}
                </div>
                {index < Math.min(total, 5) - 1 && (
                  <div className="w-px flex-1 bg-gray-100 mt-1" />
                )}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <p className="text-xs text-gray-900 truncate">
                  {v.changeNote ?? v.label ?? t('versions.versionLabel', { version: v.version })}
                </p>
                <div className="flex items-center gap-1.5 mt-0.5 text-[10px] text-gray-400">
                  <User className="w-2.5 h-2.5" />
                  <span>{v.createdBy?.name ?? t('versions.unknownUser')}</span>
                  <span>·</span>
                  <span>
                    {formatDate(v.createdAt, {
                      day: 'numeric',
                      month: 'short',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>

                {/* Restore — only for non-latest versions AND only when unlocked */}
                {index > 0 && !isLocked && (
                  <div className="mt-1.5">
                    {confirmingId === v.id ? (
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-amber-600">{t('versions.restoreQuestion')}</span>
                        <button
                          onClick={() => handleRestore(v.id, v.version)}
                          disabled={restoreMutation.isPending}
                          style={{ backgroundColor: '#d97706', color: '#ffffff' }}
                          className="px-2 py-0.5 text-[10px] font-medium rounded transition-opacity hover:opacity-90"
                        >
                          {restoreMutation.isPending ? '...' : t('actions.confirm')}
                        </button>
                        <button
                          onClick={() => setConfirmingId(null)}
                          className="text-[10px] text-gray-400 hover:text-gray-600"
                        >
                          {t('actions.cancel')}
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setConfirmingId(v.id)}
                        className="flex items-center gap-1 text-[10px] text-gray-400 hover:text-amber-600 transition-colors"
                      >
                        <RotateCcw className="w-2.5 h-2.5" />
                        {t('versions.restore')}
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}

          {total > 5 && (
            <p className="text-[10px] text-gray-400 pt-2 text-center">
              {t('versions.moreCount', { count: total - 5 })}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
