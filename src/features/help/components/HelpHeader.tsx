import { HelpCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export function HelpHeader() {
  const { t } = useTranslation('help');
  return (
    <div className="text-center">
      <div className="flex justify-center mb-4">
        <HelpCircle className="w-12 h-12 text-primary" />
      </div>
      <h1 className="text-3xl font-bold text-gray-900">{t('header.title')}</h1>
      <p className="mt-2 text-gray-500">{t('header.subtitle')}</p>
    </div>
  );
}
