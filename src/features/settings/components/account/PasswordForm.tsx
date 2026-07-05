'use client';

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useChangePassword } from '@/hooks/use-settings';
import { Button, Input, Card } from '@/components/shared';
import { Lock } from 'lucide-react';

export function PasswordForm() {
  const { t } = useTranslation('settings-account');
  const changePassword = useChangePassword();

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const isNewPasswordValid = newPassword.length >= 8;
  const doPasswordsMatch = newPassword === confirmPassword;
  const canSubmit =
    currentPassword.length > 0 &&
    isNewPasswordValid &&
    doPasswordsMatch &&
    !changePassword.isPending;

  function handleSubmit() {
    setError(null);
    setSuccess(false);

    if (!isNewPasswordValid) {
      setError(t('password.minValidation'));
      return;
    }
    if (!doPasswordsMatch) {
      setError(t('password.matchValidation'));
      return;
    }

    changePassword.mutate(
      { currentPassword, newPassword },
      {
        onSuccess: () => {
          setSuccess(true);
          setCurrentPassword('');
          setNewPassword('');
          setConfirmPassword('');
        },
        onError: (err) => {
          setError(err instanceof Error ? err.message : t('password.changeFailed'));
        },
      },
    );
  }

  return (
    <Card>
      <h3 data-testid="password-form" className="text-base font-semibold text-gray-900 mb-4">{t('password.title')}</h3>

      <div className="space-y-4">
        <Input
          label={t('password.currentLabel')}
          type="password"
          value={currentPassword}
          onChange={(e) => setCurrentPassword(e.target.value)}
          placeholder={t('password.currentPlaceholder')}
          icon={Lock}
          required
        />

        <Input
          label={t('password.newLabel')}
          type="password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          placeholder={t('password.newPlaceholder')}
          icon={Lock}
          required
          error={newPassword.length > 0 && !isNewPasswordValid ? t('password.minError') : undefined}
        />

        <Input
          label={t('password.confirmLabel')}
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          placeholder={t('password.confirmPlaceholder')}
          icon={Lock}
          required
          error={confirmPassword.length > 0 && !doPasswordsMatch ? t('password.matchError') : undefined}
        />
      </div>

      {error && (
        <p className="mt-3 text-sm text-red-600">{error}</p>
      )}

      {success && (
        <p className="mt-3 text-sm text-emerald-600">{t('password.success')}</p>
      )}

      <div className="mt-6 flex justify-end">
        <Button
          data-testid="password-update-button"
          onClick={handleSubmit}
          disabled={!canSubmit}
          isLoading={changePassword.isPending}
        >
          {t('password.update')}
        </Button>
      </div>
    </Card>
  );
}
