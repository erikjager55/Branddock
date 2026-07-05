'use client';

import { useTranslation } from 'react-i18next';
import { AlertTriangle } from 'lucide-react';
import { useDeleteAccount } from '@/hooks/use-settings';
import { Button } from '@/components/shared';

export function DangerZone() {
  const { t } = useTranslation('settings-account');
  const deleteAccount = useDeleteAccount();

  function handleDelete() {
    const confirmed = window.confirm(t('dangerZone.confirmDelete'));

    if (confirmed) {
      deleteAccount.mutate();
    }
  }

  return (
    <div data-testid="danger-zone" className="border border-red-200 bg-red-50/50 rounded-lg p-5">
      <div className="flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" />
        <div className="flex-1">
          <h3 className="text-base font-semibold text-gray-900">{t('dangerZone.title')}</h3>
          <p className="mt-1 text-sm text-gray-600">{t('dangerZone.description')}</p>

          <div className="mt-4">
            <Button
              data-testid="delete-account-button"
              variant="danger"
              onClick={handleDelete}
              isLoading={deleteAccount.isPending}
            >
              {t('dangerZone.deleteButton')}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
