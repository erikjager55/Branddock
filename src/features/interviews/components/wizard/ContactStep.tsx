'use client';

import { useState } from 'react';
import { Button, Input } from '@/components/shared';
import type { Interview } from '../../types/interview.types';

interface ContactStepProps {
  interview: Interview;
  onSave: (data: Record<string, unknown>) => void;
  isSaving: boolean;
}

export function ContactStep({ interview, onSave, isSaving }: ContactStepProps) {
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
      <h2 className="text-lg font-semibold text-gray-900 mb-1">Contact Information</h2>
      <p className="text-sm text-gray-500 mb-6">
        Enter the interviewee&apos;s details for scheduling and follow-up.
      </p>

      <div className="space-y-4">
        <Input
          label="Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. John Smith"
        />
        <Input
          label="Position"
          value={position}
          onChange={(e) => setPosition(e.target.value)}
          placeholder="e.g. CEO"
        />
        <Input
          label="Email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="e.g. john@company.com"
        />
        <Input
          label="Phone (optional)"
          type="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="e.g. +1 (555) 123-4567"
        />
        <Input
          label="Company"
          value={company}
          onChange={(e) => setCompany(e.target.value)}
          placeholder="e.g. TechCorp Inc."
        />
      </div>

      <div className="mt-6">
        <Button variant="cta" size="md" onClick={handleSave} isLoading={isSaving}>
          Save Contact
        </Button>
      </div>
    </div>
  );
}
