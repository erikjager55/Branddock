'use client';

import React, { useState } from 'react';
import { CheckCircle } from 'lucide-react';
import { useSubmitTicket } from '@/hooks/use-help';
import { Button, Input, Select } from '@/components/shared';
import type { SubmitTicketRequest } from '@/types/help';

const categoryOptions = [
  { value: 'GENERAL', label: 'General' },
  { value: 'TECHNICAL', label: 'Technical' },
  { value: 'BILLING', label: 'Billing' },
  { value: 'FEATURE_REQUEST', label: 'Feature Request' },
  { value: 'BUG_REPORT', label: 'Bug Report' },
];

const priorityOptions: { value: SubmitTicketRequest['priority']; label: string }[] = [
  { value: 'LOW', label: 'Low' },
  { value: 'MEDIUM', label: 'Medium' },
  { value: 'HIGH', label: 'High' },
];

export function SubmitRequestForm() {
  const [subject, setSubject] = useState('');
  const [category, setCategory] = useState<string | null>(null);
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<SubmitTicketRequest['priority']>('MEDIUM');
  const [submitted, setSubmitted] = useState(false);

  const submitTicket = useSubmitTicket();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim() || !category || !description.trim()) return;

    submitTicket.mutate(
      {
        subject: subject.trim(),
        category: category as SubmitTicketRequest['category'],
        description: description.trim(),
        priority,
      },
      {
        onSuccess: () => {
          setSubmitted(true);
          setSubject('');
          setCategory(null);
          setDescription('');
          setPriority('MEDIUM');
        },
      },
    );
  };

  if (submitted) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <CheckCircle className="w-10 h-10 text-emerald-500 mb-3" />
        <h3 className="text-sm font-semibold text-gray-900 mb-1">
          Request Submitted
        </h3>
        <p className="text-sm text-gray-500 mb-4">
          We&apos;ll get back to you as soon as possible.
        </p>
        <Button variant="secondary" size="sm" onClick={() => setSubmitted(false)}>
          Submit Another Request
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Input
        label="Subject"
        value={subject}
        onChange={(e) => setSubject(e.target.value)}
        placeholder="Brief description of your issue"
        required
      />

      <Select
        label="Category"
        value={category}
        onChange={setCategory}
        options={categoryOptions}
        placeholder="Select a category..."
        required
      />

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">
          <span className="text-red-500 mr-0.5">*</span>
          Description
        </label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Describe your issue in detail..."
          rows={4}
          required
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-transparent transition-shadow resize-none"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Priority
        </label>
        <div className="flex items-center gap-4">
          {priorityOptions.map((opt) => (
            <label key={opt.value} className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="priority"
                value={opt.value}
                checked={priority === opt.value}
                onChange={() => setPriority(opt.value)}
                className="w-4 h-4 text-primary border-gray-300 focus:ring-primary/50"
              />
              <span className="text-sm text-gray-700">{opt.label}</span>
            </label>
          ))}
        </div>
      </div>

      <Button
        type="submit"
        variant="primary"
        isLoading={submitTicket.isPending}
        disabled={!subject.trim() || !category || !description.trim()}
      >
        Submit Request
      </Button>
    </form>
  );
}
