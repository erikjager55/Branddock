'use client';

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button, Input } from '@/components/shared';
import type { Interview } from '../../types/interview.types';

interface ContactStepProps {
  interview: Interview;
  onSave: (data: Record<string, unknown>) => void;
  isSaving: boolean;
}

export function ContactStep({ interview, onSave, isSaving }: ContactStepProps) {
  const { t } = useTranslation('interviews');
  const [name, setName] = useState(interview.intervieweeName ?? '');
  const [position, setPosition] = useState(interview.intervieweePosition ?? '');
  const [email, setEmail] = useState(interview.intervieweeEmail ?? '');
  const [phone, setPhone] = useState(interview.intervieweePhone ?? '');
  const [company, setCompany] = useState(interview.intervieweeCompany ?? '');

  const handleSave = () => {
    onSave({
      intervieweeName: name || null,
      intervieweePosition: position || null,
      intervieweeEmail: email || null,
      intervieweePhone: phone || null,
      intervieweeCompany: company || null,
      currentStep: 2,
    });
  };

  return (
    <div className="max-w-xl">
      <h2 className="text-lg font-semibold text-gray-900 mb-1">{t('contact.title')}</h2>
      <p className="text-sm text-gray-500 mb-6">
        {t('contact.subtitle')}
      </p>

      <div className="space-y-4">
        <Input
          label={t('contact.nameLabel')}
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={t('contact.namePlaceholder')}
        />
        <Input
          label={t('contact.positionLabel')}
          value={position}
          onChange={(e) => setPosition(e.target.value)}
          placeholder={t('contact.positionPlaceholder')}
        />
        <Input
          label={t('contact.emailLabel')}
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder={t('contact.emailPlaceholder')}
        />
        <Input
          label={t('contact.phoneLabel')}
          type="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder={t('contact.phonePlaceholder')}
        />
        <Input
          label={t('contact.companyLabel')}
          value={company}
          onChange={(e) => setCompany(e.target.value)}
          placeholder={t('contact.companyPlaceholder')}
        />
      </div>

      <div className="mt-6">
        <Button variant="cta" size="md" onClick={handleSave} isLoading={isSaving}>
          {t('contact.save')}
        </Button>
      </div>
    </div>
  );
}
