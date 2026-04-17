'use client';

import React, { useRef, useState } from 'react';
import { Bug, X, AlertCircle, Upload, ImageIcon, Loader2 } from 'lucide-react';
import { useClawStore } from '@/stores/useClawStore';
import type { BugSeverity } from '@/stores/useClawStore';

const SEVERITIES: { value: BugSeverity; label: string; color: string }[] = [
  { value: 'low', label: 'Low', color: 'bg-blue-100 text-blue-700 ring-blue-200' },
  { value: 'medium', label: 'Medium', color: 'bg-amber-100 text-amber-700 ring-amber-200' },
  { value: 'high', label: 'High', color: 'bg-orange-100 text-orange-700 ring-orange-200' },
  { value: 'critical', label: 'Critical', color: 'bg-red-100 text-red-700 ring-red-200' },
];

export function BugReportForm() {
  const { bugReportForm, updateBugReportForm, closeBugReportForm, addMessage } = useClawStore();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!bugReportForm) return null;

  const handleSubmit = async () => {
    if (!bugReportForm.description.trim()) {
      setError('Description is required');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      const res = await fetch('/api/bug-reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          page: bugReportForm.page,
          description: bugReportForm.description.trim(),
          severity: bugReportForm.severity,
          screenshot: bugReportForm.screenshot.trim() || undefined,
        }),
      });

      if (!res.ok) throw new Error('Failed to submit bug report');

      // Add confirmation message to chat
      addMessage({
        id: crypto.randomUUID(),
        role: 'assistant',
        content: `Bug report submitted for **${bugReportForm.page}** (${bugReportForm.severity}). Type \`/bugs\` to view all reports.`,
        createdAt: new Date().toISOString(),
      });

      closeBugReportForm();
    } catch {
      setError('Failed to submit. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full bg-amber-100 flex items-center justify-center">
            <Bug size={14} className="text-amber-700" />
          </div>
          <h3 className="text-sm font-semibold text-gray-900">Report a Bug</h3>
        </div>
        <button
          onClick={closeBugReportForm}
          className="p-1 rounded-md hover:bg-amber-100 text-gray-400"
        >
          <X size={16} />
        </button>
      </div>

      {/* Page */}
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">Page / Section</label>
        <input
          type="text"
          value={bugReportForm.page}
          onChange={(e) => updateBugReportForm({ page: e.target.value })}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
        />
      </div>

      {/* Severity */}
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1.5">Severity</label>
        <div className="flex gap-2">
          {SEVERITIES.map((s) => (
            <button
              key={s.value}
              onClick={() => updateBugReportForm({ severity: s.value })}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                bugReportForm.severity === s.value
                  ? `${s.color} ring-2`
                  : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* Description */}
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">Description</label>
        <textarea
          value={bugReportForm.description}
          onChange={(e) => updateBugReportForm({ description: e.target.value })}
          placeholder="What happened? What did you expect?"
          rows={4}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm resize-y focus:outline-none focus:ring-2 focus:ring-amber-400"
        />
      </div>

      {/* Screenshot */}
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">Screenshot (optional)</label>

        {/* Preview */}
        {bugReportForm.screenshot && (
          <div className="mb-2 relative group">
            <img
              src={bugReportForm.screenshot}
              alt="Screenshot preview"
              className="w-full max-h-48 object-contain rounded-lg border border-gray-200 bg-white"
            />
            <button
              onClick={() => updateBugReportForm({ screenshot: '' })}
              className="absolute top-1.5 right-1.5 p-1 rounded-md bg-black/50 text-white opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <X size={12} />
            </button>
          </div>
        )}

        {/* Upload + URL input row */}
        {!bugReportForm.screenshot && (
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-dashed border-gray-300 text-xs text-gray-500 hover:border-amber-400 hover:text-amber-600 transition-colors disabled:opacity-40"
            >
              {isUploading ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
              {isUploading ? 'Uploading...' : 'Upload image'}
            </button>
            <input
              type="text"
              value=""
              onChange={(e) => updateBugReportForm({ screenshot: e.target.value })}
              placeholder="or paste a URL..."
              className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
            />
          </div>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp,image/gif"
          className="hidden"
          onChange={async (e) => {
            const file = e.target.files?.[0];
            if (!file) return;

            setIsUploading(true);
            setError('');
            try {
              const formData = new FormData();
              formData.append('file', file);
              const res = await fetch('/api/bug-reports/upload', {
                method: 'POST',
                body: formData,
              });
              if (!res.ok) {
                const data = await res.json().catch(() => ({}));
                throw new Error(data.error || 'Upload failed');
              }
              const data = await res.json();
              updateBugReportForm({ screenshot: data.url });
            } catch (err) {
              setError(err instanceof Error ? err.message : 'Upload failed');
            } finally {
              setIsUploading(false);
              // Reset file input so the same file can be selected again
              if (fileInputRef.current) fileInputRef.current.value = '';
            }
          }}
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
          disabled={isSubmitting || !bugReportForm.description.trim()}
          className="px-4 py-2 rounded-lg bg-amber-600 text-white text-sm font-medium hover:bg-amber-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          {isSubmitting ? 'Submitting...' : 'Submit Bug Report'}
        </button>
        <button
          onClick={closeBugReportForm}
          className="px-4 py-2 rounded-lg text-sm text-gray-600 hover:bg-gray-100 transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
