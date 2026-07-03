'use client';

import { useTranslation } from 'react-i18next';

export function AuthDivider() {
  const { t } = useTranslation('auth-chrome');
  return (
    <div className="relative my-6">
      <div className="absolute inset-0 flex items-center">
        <div className="w-full border-t border-gray-200" />
      </div>
      <div className="relative flex justify-center text-sm">
        <span className="px-3 bg-white text-gray-500">{t('divider.orWithEmail')}</span>
      </div>
    </div>
  );
}
