'use client';

import React, { useState, useRef, useEffect } from 'react';
import { ArrowLeft, Eye, EyeOff, Save, Copy, Share2, Trash2, MoreVertical } from 'lucide-react';
import { Badge, Button } from '@/components/shared';
import { ExportDropdown } from './ExportDropdown';
import { copyContentToClipboard } from '@/lib/studio/export-studio-content';
import { useContentStudioStore } from '@/stores/useContentStudioStore';

interface StudioHeaderProps {
  title: string;
  contentType: string;
  campaignTitle: string;
  contentTab: string | null;
  deliverableId: string;
  lastSavedAt: string | null;
  isPreviewMode: boolean;
  onBack: () => void;
  onTogglePreview: () => void;
  onDelete: () => void;
}

export function StudioHeader({
  title,
  contentType,
  campaignTitle,
  contentTab,
  deliverableId,
  lastSavedAt,
  isPreviewMode,
  onBack,
  onTogglePreview,
  onDelete,
}: StudioHeaderProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [copyFeedback, setCopyFeedback] = useState<string | null>(null);
  const feedbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Cleanup feedback timer on unmount
  useEffect(() => {
    return () => {
      if (feedbackTimerRef.current) clearTimeout(feedbackTimerRef.current);
    };
  }, []);

  const formatSavedTime = (iso: string) => {
    const diff = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'just now';
    if (mins === 1) return '1 min ago';
    return `${mins} min ago`;
  };

  const showFeedback = (msg: string) => {
    setCopyFeedback(msg);
    if (feedbackTimerRef.current) clearTimeout(feedbackTimerRef.current);
    feedbackTimerRef.current = setTimeout(() => setCopyFeedback(null), 2000);
  };

  const handleDuplicate = async () => {
    const store = useContentStudioStore.getState();
    const success = await copyContentToClipboard(store.textContent);
    showFeedback(success ? 'Copied to clipboard' : 'Copy failed');
    setMenuOpen(false);
  };

  const handleShare = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      showFeedback('Link copied');
    } catch {
      showFeedback('Copy failed');
    }
    setMenuOpen(false);
  };

  const handleDelete = () => {
    setMenuOpen(false);
    onDelete();
  };

  return (
    <div className="flex items-center justify-between px-4 py-3 bg-white border-b flex-shrink-0">
      {/* Left: Back + Title */}
      <div className="flex items-center gap-3">
        <button
          onClick={onBack}
          className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-gray-700"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-base font-semibold text-gray-900">{title}</h1>
            <Badge variant="default">{contentType}</Badge>
          </div>
          <p className="text-xs text-gray-400">{campaignTitle}</p>
        </div>
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-3">
        {/* Auto-save indicator */}
        {lastSavedAt && (
          <span className="text-xs text-gray-400 flex items-center gap-1">
            <Save className="h-3 w-3" />
            Auto-saved {formatSavedTime(lastSavedAt)}
          </span>
        )}

        {/* Copy feedback toast */}
        {copyFeedback && (
          <span className="text-xs text-emerald-600 font-medium animate-pulse">
            {copyFeedback}
          </span>
        )}

        {/* Preview toggle */}
        <Button
          variant="secondary"
          size="sm"
          icon={isPreviewMode ? EyeOff : Eye}
          onClick={onTogglePreview}
        >
          {isPreviewMode ? 'Edit' : 'Preview'}
        </Button>

        {/* Export dropdown */}
        <ExportDropdown
          title={title}
          contentType={contentType}
          campaignTitle={campaignTitle}
          contentTab={contentTab}
          deliverableId={deliverableId}
        />

        {/* Context menu */}
        <div className="relative">
          <button
            onClick={() => setMenuOpen((prev) => !prev)}
            className="p-1.5 rounded-md hover:bg-gray-100 transition-colors"
            aria-label="More actions"
          >
            <MoreVertical className="w-4 h-4 text-gray-500" />
          </button>

          {menuOpen && (
            <>
              {/* eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions */}
              <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
              <div className="absolute right-0 top-full mt-1 w-44 bg-white rounded-lg border border-gray-200 shadow-lg z-20 py-1">
                <button
                  onClick={handleDuplicate}
                  className="w-full flex items-center gap-3 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  <Copy className="w-4 h-4 text-gray-400" />
                  Copy Content
                </button>
                <button
                  onClick={handleShare}
                  className="w-full flex items-center gap-3 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  <Share2 className="w-4 h-4 text-gray-400" />
                  Copy Link
                </button>
                <button
                  onClick={handleDelete}
                  className="w-full flex items-center gap-3 px-3 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                >
                  <Trash2 className="w-4 h-4 text-red-400" />
                  Delete
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
