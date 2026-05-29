'use client';

import React, { useState } from 'react';
import { Lightbulb, X, AlertCircle } from 'lucide-react';
import { useClawStore } from '@/stores/useClawStore';
import type { FeatureImpact } from '@/stores/useClawStore';

const IMPACTS: { value: FeatureImpact; label: string; color: string }[] = [
  { value: 'nice-to-have', label: 'Nice to have', color: 'bg-gray-100 text-gray-700 ring-gray-200' },
  { value: 'useful', label: 'Useful', color: 'bg-blue-100 text-blue-700 ring-blue-200' },
  { value: 'important', label: 'Important', color: 'bg-amber-100 text-amber-700 ring-amber-200' },
  { value: 'critical', label: 'Critical', color: 'bg-red-100 text-red-700 ring-red-200' },
];

export function FeatureRequestForm() {
  const { featureRequestForm, updateFeatureRequestForm, closeFeatureRequestForm, addMessage } =
    useClawStore();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  if (!featureRequestForm) return null;

  const canSubmit =
    featureRequestForm.title.trim().length > 0 && featureRequestForm.description.trim().length > 0;

  const handleSubmit = async () => {
    if (!canSubmit) {
      setError('Title and description are required');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      const res = await fetch('/api/feature-reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          page: featureRequestForm.page,
          title: featureRequestForm.title.trim(),
          description: featureRequestForm.description.trim(),
          impact: featureRequestForm.impact,
          screenshot: featureRequestForm.screenshot.trim() || undefined,
        }),
      });

      if (!res.ok) throw new Error('Failed to submit feature request');

      addMessage({
        id: crypto.randomUUID(),
        role: 'assistant',
        content: `Feature request submitted: **${featureRequestForm.title.trim()}** (${featureRequestForm.impact}). Thanks — we'll review it.`,
        createdAt: new Date().toISOString(),
      });

      closeFeatureRequestForm();
    } catch {
      setError('Failed to submit. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full bg-emerald-100 flex items-center justify-center">
            <Lightbulb size={14} className="text-emerald-700" />
          </div>
          <h3 className="text-sm font-semibold text-gray-900">Request a Feature</h3>
        </div>
        <button
          onClick={closeFeatureRequestForm}
          className="p-1 rounded-md hover:bg-emerald-100 text-gray-400"
        >
          <X size={16} />
        </button>
      </div>

      {/* Page */}
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">Page / Section</label>
        <input
          type="text"
          value={featureRequestForm.page}
          onChange={(e) => updateFeatureRequestForm({ page: e.target.value })}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
        />
      </div>

      {/* Title */}
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">Title</label>
        <input
          type="text"
          value={featureRequestForm.title}
          onChange={(e) => updateFeatureRequestForm({ title: e.target.value })}
          placeholder="A short summary of the feature"
          maxLength={200}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
        />
      </div>

      {/* Impact */}
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1.5">Impact</label>
        <div className="flex flex-wrap gap-2">
          {IMPACTS.map((i) => (
            <button
              key={i.value}
              onClick={() => updateFeatureRequestForm({ impact: i.value })}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                featureRequestForm.impact === i.value
                  ? `${i.color} ring-2`
                  : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
              }`}
            >
              {i.label}
            </button>
          ))}
        </div>
      </div>

      {/* Description */}
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">Description</label>
        <textarea
          value={featureRequestForm.description}
          onChange={(e) => updateFeatureRequestForm({ description: e.target.value })}
          placeholder="What would you like to be able to do? What problem does it solve?"
          rows={4}
          maxLength={5000}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm resize-y focus:outline-none focus:ring-2 focus:ring-emerald-400"
        />
      </div>

      {/* Reference link (optional) */}
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">
          Reference link (optional)
        </label>
        <input
          type="text"
          value={featureRequestForm.screenshot}
          onChange={(e) => updateFeatureRequestForm({ screenshot: e.target.value })}
          placeholder="Paste a URL to a mockup or example..."
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
        />
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 text-xs text-red-600">
          <AlertCircle size={14} />
          {error}
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-2 pt-1">
        <button
          onClick={handleSubmit}
          disabled={isSubmitting || !canSubmit}
          className="px-4 py-2 rounded-lg text-white text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          style={{
            backgroundColor: isSubmitting || !canSubmit ? '#9ca3af' : '#059669', // emerald-600
          }}
          onMouseEnter={(e) => {
            if (!isSubmitting && canSubmit) {
              e.currentTarget.style.backgroundColor = '#047857'; // emerald-700
            }
          }}
          onMouseLeave={(e) => {
            if (!isSubmitting && canSubmit) {
              e.currentTarget.style.backgroundColor = '#059669';
            }
          }}
        >
          {isSubmitting ? 'Submitting...' : 'Submit Feature Request'}
        </button>
        <button
          onClick={closeFeatureRequestForm}
          className="px-4 py-2 rounded-lg text-sm text-gray-600 hover:bg-gray-100 transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
