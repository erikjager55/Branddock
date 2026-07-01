'use client';

import React from 'react';
import { useTranslation } from 'react-i18next';
import { ContactOptions } from './ContactOptions';
import { SubmitRequestForm } from './SubmitRequestForm';

export function ContactSupport() {
  const { t } = useTranslation('help');
  return (
    <section>
      <h2 className="text-lg font-semibold text-gray-900 mb-6">
        {t('contact.title')}
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <ContactOptions />
        <SubmitRequestForm />
      </div>
    </section>
  );
}
