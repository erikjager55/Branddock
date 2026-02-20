'use client';

import { AlertTriangle } from 'lucide-react';
import { useDeleteAccount } from '@/hooks/use-settings';
import { Button } from '@/components/shared';

export function DangerZone() {
  const deleteAccount = useDeleteAccount();

  function handleDelete() {
    const confirmed = window.confirm(
      'Are you sure you want to delete your account? This action cannot be undone. All your data, workspaces, and team memberships will be permanently removed.',
    );

    if (confirmed) {
      deleteAccount.mutate();
    }
  }

  return (
    <div data-testid="danger-zone" className="border border-red-200 bg-red-50/50 rounded-lg p-5">
      <div className="flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" />
        <div className="flex-1">
          <h3 className="text-base font-semibold text-gray-900">Delete Account</h3>
          <p className="mt-1 text-sm text-gray-600">
            Permanently delete your account and all associated data. This action cannot be undone
            and will remove all your workspaces, brand assets, and team memberships.
          </p>

          <div className="mt-4">
            <Button
              data-testid="delete-account-button"
              variant="danger"
              onClick={handleDelete}
              isLoading={deleteAccount.isPending}
            >
              Delete Account
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
