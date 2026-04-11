'use client';

import React, { useState, useRef } from 'react';
import {
  Link as LinkIcon,
  FileText,
  Plus,
  X,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Paperclip,
} from 'lucide-react';
import { useCampaignWizardStore } from '../../stores/useCampaignWizardStore';
import type { BriefingSource } from '../../types/campaign-wizard.types';

/**
 * Briefing Sources field used in SetupStep (both content and campaign mode).
 *
 * Lets the user attach external reference materials — web pages, blog posts,
 * social media URLs, or PDF documents — to the briefing. Each source is
 * parsed server-side into plain text and the result is injected into AI
 * prompts as additional context.
 *
 * The field is optional and additive: users can launch a campaign without
 * any briefing sources at all.
 */
export function BriefingSourcesField() {
  const sources = useCampaignWizardStore((s) => s.briefingSources);
  const addSource = useCampaignWizardStore((s) => s.addBriefingSource);
  const updateSource = useCampaignWizardStore((s) => s.updateBriefingSource);
  const removeSource = useCampaignWizardStore((s) => s.removeBriefingSource);

  const [showInput, setShowInput] = useState(false);
  const [urlInput, setUrlInput] = useState('');
  const [urlError, setUrlError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ─── URL handler ────────────────────────────────────────────
  const handleAddUrl = async () => {
    setUrlError(null);
    const url = urlInput.trim();
    if (!url) {
      setUrlError('Please enter a URL');
      return;
    }
    try {
      // Basic shape validation — server does the real check
      new URL(url);
    } catch {
      setUrlError('Not a valid URL');
      return;
    }

    const id = crypto.randomUUID();
    const source: BriefingSource = {
      id,
      type: 'url',
      url,
      status: 'processing',
    };
    addSource(source);
    setUrlInput('');
    setShowInput(false);

    try {
      const res = await fetch('/api/briefing-sources/parse-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error ?? `Parse failed (${res.status})`);
      }
      const data = await res.json();
      updateSource(id, {
        status: 'ready',
        title: data.title ?? url,
        extractedText: data.extractedText,
      });
    } catch (err) {
      updateSource(id, {
        status: 'error',
        errorMessage: err instanceof Error ? err.message : 'Failed to parse URL',
      });
    }
  };

  // ─── PDF upload handler ─────────────────────────────────────
  const handleFileSelected = async (file: File) => {
    if (!file.name.toLowerCase().endsWith('.pdf')) {
      setUrlError('Only PDF files are supported');
      return;
    }
    if (file.size > 20 * 1024 * 1024) {
      setUrlError('File size exceeds 20MB');
      return;
    }
    setUrlError(null);

    const id = crypto.randomUUID();
    const source: BriefingSource = {
      id,
      type: 'pdf',
      fileName: file.name,
      status: 'processing',
    };
    addSource(source);
    setIsUploading(true);
    setShowInput(false);

    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch('/api/briefing-sources/parse-pdf', {
        method: 'POST',
        body: formData,
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error ?? `Upload failed (${res.status})`);
      }
      const data = await res.json();
      updateSource(id, {
        status: 'ready',
        title: data.title ?? data.fileName,
        extractedText: data.extractedText,
      });
    } catch (err) {
      updateSource(id, {
        status: 'error',
        errorMessage: err instanceof Error ? err.message : 'Failed to parse PDF',
      });
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <div>
      <label className="block text-xs font-medium text-gray-600 mb-1">
        Reference materials
        <span className="text-gray-400 font-normal ml-1">
          (optional — web pages, blog posts, PDFs the AI should read)
        </span>
      </label>

      {/* Existing sources list */}
      {sources.length > 0 && (
        <ul className="space-y-1.5 mb-2">
          {sources.map((source) => (
            <SourceRow key={source.id} source={source} onRemove={() => removeSource(source.id)} />
          ))}
        </ul>
      )}

      {/* Add source UI */}
      {!showInput && (
        <button
          type="button"
          onClick={() => {
            setShowInput(true);
            setUrlError(null);
          }}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:text-primary-700 transition-colors"
        >
          <Plus className="h-3 w-3" />
          Add source
        </button>
      )}

      {showInput && (
        <div className="mt-1 space-y-2 rounded-lg border border-gray-200 bg-white p-3">
          {/* URL input */}
          <div>
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <LinkIcon className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
                <input
                  type="url"
                  value={urlInput}
                  onChange={(e) => setUrlInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddUrl()}
                  placeholder="https://example.com/article"
                  className="block w-full rounded-md border border-gray-200 bg-white py-1.5 pl-8 pr-2 text-xs placeholder:text-gray-400 focus:border-primary focus:ring-1 focus:ring-primary/20 outline-none"
                />
              </div>
              <button
                type="button"
                onClick={handleAddUrl}
                disabled={!urlInput.trim()}
                className="rounded-md bg-primary hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-3 py-1.5 text-xs font-medium"
              >
                Add URL
              </button>
            </div>
          </div>

          {/* OR divider */}
          <div className="flex items-center gap-2 text-[10px] uppercase text-gray-400">
            <div className="flex-1 h-px bg-gray-200" />
            or
            <div className="flex-1 h-px bg-gray-200" />
          </div>

          {/* PDF upload */}
          <div className="flex items-center gap-2">
            <label className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-md border border-dashed border-gray-300 hover:border-gray-400 px-3 py-2 text-xs text-gray-600 cursor-pointer transition-colors">
              <Paperclip className="h-3.5 w-3.5" />
              {isUploading ? 'Uploading...' : 'Upload PDF'}
              <input
                ref={fileInputRef}
                type="file"
                accept="application/pdf"
                disabled={isUploading}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFileSelected(file);
                }}
                className="hidden"
              />
            </label>
            <button
              type="button"
              onClick={() => {
                setShowInput(false);
                setUrlInput('');
                setUrlError(null);
              }}
              className="text-xs text-gray-500 hover:text-gray-700"
            >
              Cancel
            </button>
          </div>

          {urlError && (
            <p className="flex items-center gap-1 text-xs text-red-600">
              <AlertCircle className="h-3 w-3" />
              {urlError}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────

function SourceRow({ source, onRemove }: { source: BriefingSource; onRemove: () => void }) {
  const Icon = source.type === 'pdf' ? FileText : LinkIcon;
  const label = source.title || source.url || source.fileName || 'Untitled source';
  const subline =
    source.type === 'url'
      ? source.url
      : source.fileName;

  return (
    <li className="flex items-start gap-2 rounded-md border border-gray-200 bg-white px-2.5 py-1.5">
      <Icon className="h-3.5 w-3.5 text-gray-400 mt-0.5 flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-gray-800 truncate">{label}</p>
        {subline && subline !== label && (
          <p className="text-[10px] text-gray-500 truncate">{subline}</p>
        )}
        {source.extractedText && source.status === 'ready' && (
          <p className="text-[10px] text-gray-400 mt-0.5 line-clamp-2">
            {source.extractedText.slice(0, 200)}…
          </p>
        )}
        {source.status === 'error' && source.errorMessage && (
          <p className="text-[10px] text-red-600 mt-0.5">{source.errorMessage}</p>
        )}
      </div>
      <div className="flex items-center gap-1.5 flex-shrink-0">
        <StatusBadge status={source.status} />
        <button
          type="button"
          onClick={onRemove}
          className="rounded p-0.5 text-gray-400 hover:text-red-500 hover:bg-red-50"
          title="Remove source"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    </li>
  );
}

function StatusBadge({ status }: { status: BriefingSource['status'] }) {
  if (status === 'processing' || status === 'pending') {
    return <Loader2 className="h-3 w-3 text-primary animate-spin" />;
  }
  if (status === 'ready') {
    return <CheckCircle2 className="h-3 w-3 text-emerald-500" />;
  }
  return <AlertCircle className="h-3 w-3 text-red-500" />;
}
