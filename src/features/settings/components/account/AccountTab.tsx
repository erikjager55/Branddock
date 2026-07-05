'use client';

import { useTranslation } from 'react-i18next';
import { ProfileForm } from './ProfileForm';
import { PasswordForm } from './PasswordForm';
import { EmailPreferences } from './EmailPreferences';
import { ConnectedAccounts } from './ConnectedAccounts';
import { DataExportSection } from './DataExportSection';
import { DangerZone } from './DangerZone';

export function AccountTab() {
  const { t } = useTranslation('settings-account');

  return (
    <div data-testid="account-tab" className="max-w-3xl space-y-6 p-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-900">{t('tab.title')}</h2>
        <p className="mt-1 text-sm text-gray-500">{t('tab.subtitle')}</p>
      </div>

      <ProfileForm />
      <PasswordForm />
      <EmailPreferences />
      <ConnectedAccounts />
      <DataExportSection />
      <DangerZone />
    </div>
  );
}
