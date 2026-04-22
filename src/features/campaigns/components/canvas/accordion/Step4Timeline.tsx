'use client';

import React, { useCallback, useMemo, useState } from 'react';
import { useCanvasStore } from '../../../stores/useCanvasStore';
import { resolvePreviewComponent } from '../previews/preview-map';
import { SendCampaignModal } from '../SendCampaignModal';
import { CampaignSendStats } from '../CampaignSendStats';
import {
  getSuggestedPublishTime,
  getChecklistForPlatform,
  getExportFormats,
  CHAR_LIMITS,
} from '../../../lib/publish-timing';
import { usePublishChannels } from '@/features/settings/hooks/use-publish-channels';
import { STUDIO } from '@/lib/constants/design-tokens';
import type { PreviewContent } from '../../../types/canvas.types';
import {
  Calendar,
  Clock,
  CheckCircle2,
  Circle,
  Send,
  AlertCircle,
  Plug,
  Sparkles,
  Copy,
  FileText,
  Code,
  FileDown,
  ChevronDown,
  ChevronRight,
  AlertTriangle,
  ExternalLink,
} from 'lucide-react';

interface Step4TimelineProps {
  deliverableId: string;
  onAdvance?: () => void;
}

export function Step4Timeline({ deliverableId }: Step4TimelineProps) {
  const contextStack = useCanvasStore((s) => s.contextStack);
  const variantGroups = useCanvasStore((s) => s.variantGroups);
  const selections = useCanvasStore((s) => s.selections);
  const imageVariants = useCanvasStore((s) => s.imageVariants);
  const heroImage = useCanvasStore((s) => s.heroImage);
  const scheduledDate = useCanvasStore((s) => s.scheduledDate);
  const scheduledTime = useCanvasStore((s) => s.scheduledTime);
  const approvalStatus = useCanvasStore((s) => s.approvalStatus);
  const mediumConfigValues = useCanvasStore((s) => s.mediumConfigValues);
  const contentType = useCanvasStore((s) => s.contentType);
  const campaignId = useCanvasStore((s) => s.campaignId);
  const [showSendCampaign, setShowSendCampaign] = useState(false);

  // Email deliverable → unlock the Send Campaign flow once approved.
  const isEmailDeliverable =
    typeof contentType === 'string' && contentType.toLowerCase().includes('email');

  const { data: channels } = usePublishChannels();
  const [selectedChannelId, setSelectedChannelId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [publishSuccess, setPublishSuccess] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showDownloadFormats, setShowDownloadFormats] = useState(false);

  const platform = contextStack?.medium?.platform ?? null;
  const format = contextStack?.medium?.format ?? null;

  // Build preview content from selected variants
  const previewContent = useMemo<PreviewContent>(() => {
    const content: PreviewContent = {};
    for (const [group, variants] of variantGroups) {
      const selectedIdx = selections.get(group) ?? 0;
      const selected = variants[selectedIdx];
      if (selected) {
        content[group] = { content: selected.content, type: 'text' };
      }
    }
    return content;
  }, [variantGroups, selections]);

  const allText = useMemo(() => {
    return Object.values(previewContent)
      .filter((v) => v.type === 'text' && v.content)
      .map((v) => v.content)
      .join('\n\n');
  }, [previewContent]);

  const previewEntry = useMemo(
    () => resolvePreviewComponent(platform, format),
    [platform, format],
  );

  // Optimal timing suggestion
  const timingSuggestion = useMemo(
    () => getSuggestedPublishTime(platform),
    [platform],
  );

  // Publication checklist
  const checklist = useMemo(
    () => getChecklistForPlatform(platform, format),
    [platform, format],
  );

  const checklistResults = useMemo(() => {
    const textGroups = Object.keys(previewContent);
    const charCount = allText.length;
    const charLimit = platform ? CHAR_LIMITS[platform] : null;

    return checklist.map((item) => {
      let passed = false;
      switch (item.id) {
        case 'has-title':
          passed = textGroups.some((g) => g === 'title' || g === 'headline' || g === 'subject');
          break;
        case 'has-body':
          passed = textGroups.some((g) =>
            g === 'body' || g === 'caption' || g === 'introduction' || g === 'body-sections' ||
            g === 'content' || g === 'hook' || g === 'email-body' || g === 'main' || g === 'text' ||
            g === 'copy' || g === 'post' || g === 'article' || g === 'script'
          );
          break;
        case 'has-image':
          passed = !!heroImage?.url;
          break;
        case 'has-hashtags':
          passed = textGroups.some((g) => g === 'hashtags');
          break;
        case 'has-subject':
          passed = textGroups.some((g) => g === 'subject' || g === 'subject-line');
          break;
        case 'has-cta':
          // Check group keys + cta field on groups + text extraction
          passed = textGroups.some((g) => g === 'cta' || g === 'call-to-action') ||
            Object.values(previewContent).some((v) => !!v?.cta) ||
            textGroups.some((g) => {
              const content = previewContent[g]?.content;
              return content ? /\*\*(get|start|join|sign|book|claim|download|discover|learn|try|shop|buy|register|subscribe|explore|request|schedule|apply|contact)\b/i.test(content) : false;
            });
          break;
        case 'has-meta':
          passed = textGroups.some((g) => g.includes('meta'));
          break;
        case 'has-shownotes':
          passed = textGroups.some((g) => g.includes('show') || g.includes('notes'));
          break;
        case 'char-limit':
          passed = !charLimit || charCount <= charLimit;
          break;
        default:
          passed = false;
      }
      return { ...item, passed };
    });
  }, [checklist, previewContent, allText, heroImage, platform]);

  const requiredPassed = checklistResults.filter((c) => c.required).every((c) => c.passed);
  const allPassed = checklistResults.every((c) => c.passed);

  // Export formats
  const exportFormats = useMemo(() => getExportFormats(platform), [platform]);

  const handleCopyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(allText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* clipboard may not be available */ }
  };

  const handleDownload = (formatId: string) => {
    let content = allText;
    let ext = 'txt';
    let mime = 'text/plain';

    if (formatId === 'html') {
      content = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${previewContent.title?.content ?? 'Content'}</title></head><body>${allText.replace(/\n/g, '<br>')}</body></html>`;
      ext = 'html';
      mime = 'text/html';
    } else if (formatId === 'markdown') {
      ext = 'md';
      mime = 'text/markdown';
    }

    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `content.${ext}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Apply suggestion
  const handleApplySuggestion = () => {
    if (!timingSuggestion) return;
    const date = timingSuggestion.nextOccurrence.split('T')[0];
    useCanvasStore.getState().setScheduledDate(date);
    useCanvasStore.getState().setScheduledTime(timingSuggestion.time);
  };

  // Publish or schedule to a specific connected channel (LinkedIn, WordPress, Ayrshare, etc.)
  const handlePublishToChannel = useCallback(async (channelId: string) => {
    setIsSubmitting(true);
    setError(null);
    try {
      const body: Record<string, unknown> = { channelId };
      const store = useCanvasStore.getState();
      if (store.scheduledDate) {
        const dt = store.scheduledTime
          ? `${store.scheduledDate}T${store.scheduledTime}:00Z`
          : `${store.scheduledDate}T09:00:00Z`;
        body.scheduledFor = dt;
      } else {
        body.publishNow = true;
      }
      const res = await fetch(`/api/studio/${deliverableId}/publish-to-channel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error('Publish failed');
      const data = await res.json();
      setPublishSuccess(`${data.status === 'published' ? 'Published' : 'Scheduled'} to ${data.channelPlatform}`);
      store.setApprovalState({
        approvalStatus: data.status === 'published' ? 'PUBLISHED' : 'APPROVED',
        publishedAt: data.status === 'published' ? new Date().toISOString() : undefined,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Publish failed');
    } finally {
      setIsSubmitting(false);
    }
  }, [deliverableId]);

  // Schedule / Approve
  const handlePublish = useCallback(async (action: 'approve' | 'schedule') => {
    setIsSubmitting(true);
    setError(null);

    const store = useCanvasStore.getState();

    try {
      if (action === 'schedule' && store.scheduledDate) {
        const scheduledAt = store.scheduledTime
          ? `${store.scheduledDate}T${store.scheduledTime}:00`
          : `${store.scheduledDate}T09:00:00`;

        const res = await fetch(`/api/studio/${deliverableId}/publish`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ scheduledPublishDate: scheduledAt }),
        });
        if (!res.ok) throw new Error('Failed to schedule');

        store.setApprovalState({ approvalStatus: 'PUBLISHED', publishedAt: new Date().toISOString() });
        store.setStepSummary('planner', {
          label: `Scheduled: ${formatDateDisplay(store.scheduledDate)}${store.scheduledTime ? ` at ${store.scheduledTime}` : ''}`,
        });
      } else {
        const res = await fetch(`/api/studio/${deliverableId}/approval`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'APPROVED' }),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({ error: 'Failed to approve' }));
          throw new Error(err.error ?? 'Failed to approve');
        }

        store.setApprovalState({ approvalStatus: 'APPROVED' });
        store.setStepSummary('planner', { label: 'Ready for publishing' });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Action failed');
    } finally {
      setIsSubmitting(false);
    }
  }, [deliverableId]);

  const isPublished = approvalStatus === 'PUBLISHED';
  const isApproved = approvalStatus === 'APPROVED';
  const PreviewComponent = previewEntry.component;

  const ICON_MAP: Record<string, typeof Copy> = {
    Copy, FileText, Code, FileDown,
  };

  return (
    <div className="space-y-6">
      {/* Success state */}
      {(isPublished || isApproved) && (
        <div className="flex items-center gap-3 p-4 rounded-lg bg-emerald-50 border border-emerald-200">
          <CheckCircle2 className="h-5 w-5 text-emerald-600 flex-shrink-0" />
          <div>
            <p className="text-sm font-medium text-emerald-800">
              {isPublished ? 'Content scheduled for publishing' : 'Content approved and ready'}
            </p>
            {scheduledDate && (
              <p className="text-xs text-emerald-600 mt-0.5">
                {formatDateDisplay(scheduledDate)}{scheduledTime ? ` at ${scheduledTime}` : ''}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Send Campaign (email deliverables only) */}
      {isEmailDeliverable && campaignId && isApproved && (
        <div className="rounded-lg border border-gray-200 bg-white p-4 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-900">Ready to send via Emailit</p>
            <p className="text-xs text-gray-500 mt-0.5">
              Push the approved email to an inline recipient list. Stats flow back via the webhook.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowSendCampaign(true)}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium bg-teal-600 text-white hover:bg-teal-700 transition-colors"
          >
            <Send className="h-4 w-4" />
            Send campaign
          </button>
        </div>
      )}

      {/* Campaign send stats (renders when a send exists for this deliverable) */}
      {isEmailDeliverable && campaignId && (
        <CampaignSendStats campaignId={campaignId} deliverableId={deliverableId} />
      )}

      {isEmailDeliverable && campaignId && (
        <SendCampaignModal
          isOpen={showSendCampaign}
          onClose={() => setShowSendCampaign(false)}
          campaignId={campaignId}
          deliverableId={deliverableId}
          defaultSubject={previewContent.title?.content ?? 'Branddock email'}
        />
      )}

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700" role="alert">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          {error}
        </div>
      )}

      {/* ── Section 1: Content Review ─────────────────────────── */}
      <div className="rounded-lg border border-gray-200 bg-white overflow-hidden">
        <button
          type="button"
          onClick={() => setShowPreview(!showPreview)}
          className="w-full flex items-center justify-between px-4 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50"
        >
          <div className="flex items-center gap-2">
            <span>Content Review</span>
            <Badge platform={platform} label={previewEntry.label} />
          </div>
          {showPreview ? <ChevronDown className="h-4 w-4 text-gray-400" /> : <ChevronRight className="h-4 w-4 text-gray-400" />}
        </button>
        {showPreview && (
          <div className="border-t border-gray-200 p-4">
            <PreviewComponent
              previewContent={previewContent}
              imageVariants={imageVariants}
              isGenerating={false}
              heroImage={heroImage}
              mediumConfig={mediumConfigValues}
              brandName={contextStack?.brand?.brandName ?? undefined}
              platform={platform ?? undefined}
            />
          </div>
        )}
      </div>

      {/* ── Section 2: Publication Checklist ───────────────────── */}
      <div className="rounded-lg border border-gray-200 bg-white p-4">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">Publication Checklist</h3>
        <div className="space-y-2">
          {checklistResults.map((item) => (
            <div key={item.id} className="flex items-center gap-2.5">
              {item.passed ? (
                <CheckCircle2 className="h-4 w-4 text-emerald-500 flex-shrink-0" />
              ) : item.required ? (
                <AlertTriangle className="h-4 w-4 text-amber-500 flex-shrink-0" />
              ) : (
                <Circle className="h-4 w-4 text-gray-300 flex-shrink-0" />
              )}
              <span className={`text-sm ${item.passed ? 'text-gray-700' : item.required ? 'text-amber-700 font-medium' : 'text-gray-500'}`}>
                {item.label}
              </span>
              {!item.required && !item.passed && (
                <span className="text-[10px] text-gray-400 ml-auto">optional</span>
              )}
            </div>
          ))}
        </div>
        {!requiredPassed && (
          <p className="text-xs text-amber-600 mt-3 flex items-center gap-1">
            <AlertTriangle className="h-3 w-3" />
            Some required items are still missing — you can publish anyway, but double-check first.
          </p>
        )}
      </div>

      {/* ── Finish & Publish — unified actions panel ───────────── */}
      {!isPublished && (() => {
        const activeChannels = channels?.filter((ch) => ch.isActive) ?? [];
        const hasActiveChannels = activeChannels.length > 0;
        const hasMultipleChannels = activeChannels.length > 1;
        const effectiveChannelId = hasMultipleChannels
          ? selectedChannelId
          : (activeChannels[0]?.id ?? null);

        const publishLabel = isSubmitting
          ? 'Publishing...'
          : scheduledDate
            ? 'Schedule to Platform'
            : 'Publish Now';

        return (
          <div className="rounded-lg border border-gray-200 bg-white p-4 space-y-5">
            <h3 className="text-sm font-semibold text-gray-700">Finish &amp; Publish</h3>

            {/* Schedule (optional) */}
            <div className="space-y-3">
              <h4 className="text-xs font-semibold uppercase tracking-wide text-gray-500">Schedule (optional)</h4>

              {timingSuggestion && (
                <button
                  type="button"
                  onClick={handleApplySuggestion}
                  className="w-full flex items-start gap-3 p-3 rounded-lg bg-primary/5 border border-primary/20 hover:bg-primary/10 transition-colors text-left"
                >
                  <Sparkles className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-gray-800">
                      Suggested: {timingSuggestion.day} at {timingSuggestion.time}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">{timingSuggestion.reason}</p>
                  </div>
                </button>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="schedule-date" className="block text-xs font-medium text-gray-600 mb-1">
                    <Calendar className="h-3.5 w-3.5 inline mr-1" />
                    Date
                  </label>
                  <input
                    id="schedule-date"
                    type="date"
                    value={scheduledDate ?? ''}
                    onChange={(e) => useCanvasStore.getState().setScheduledDate(e.target.value || null)}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                  />
                </div>
                <div>
                  <label htmlFor="schedule-time" className="block text-xs font-medium text-gray-600 mb-1">
                    <Clock className="h-3.5 w-3.5 inline mr-1" />
                    Time
                  </label>
                  <input
                    id="schedule-time"
                    type="time"
                    value={scheduledTime ?? ''}
                    onChange={(e) => useCanvasStore.getState().setScheduledTime(e.target.value || null)}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                  />
                </div>
              </div>
            </div>

            {/* Two primary actions */}
            <div className="space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {/* Action 1 — Mark as Ready (opens download options on success) */}
                <button
                  type="button"
                  onClick={async () => {
                    if (!isApproved) {
                      await handlePublish('approve');
                    }
                    setShowDownloadFormats(true);
                  }}
                  disabled={isSubmitting}
                  className="flex items-center justify-center gap-2 px-4 py-3 rounded-lg text-gray-700 font-medium border border-gray-200 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  {isApproved ? 'Ready' : 'Mark as Ready'}
                </button>

                {/* Action 2 — Publish / Schedule to Platform */}
                <button
                  type="button"
                  onClick={() => {
                    if (!effectiveChannelId) return;
                    handlePublishToChannel(effectiveChannelId);
                  }}
                  disabled={!hasActiveChannels || isSubmitting || (hasMultipleChannels && !selectedChannelId)}
                  className={`flex items-center justify-center gap-2 px-4 py-3 rounded-lg text-white font-medium ${STUDIO.generateButton} disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  <Send className="h-4 w-4" />
                  {publishLabel}
                </button>
              </div>

              {/* Download format picker — appears after Mark as Ready */}
              {showDownloadFormats && (
                <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3">
                  <p className="text-xs font-medium text-emerald-800 mb-2 flex items-center gap-1.5">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Marked as ready — download a copy if you like
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {exportFormats.map((fmt) => {
                      const Icon = ICON_MAP[fmt.icon] ?? FileText;
                      const onClick = fmt.id === 'clipboard'
                        ? handleCopyToClipboard
                        : () => handleDownload(fmt.id);
                      return (
                        <button
                          key={fmt.id}
                          type="button"
                          onClick={onClick}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-emerald-200 bg-white text-xs font-medium text-gray-700 hover:bg-emerald-100"
                        >
                          <Icon className="h-3.5 w-3.5" />
                          {fmt.id === 'clipboard' && copied ? 'Copied!' : fmt.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* No active channel hint */}
              {!hasActiveChannels && (
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-700">
                  <Plug className="h-3.5 w-3.5 flex-shrink-0" />
                  <span>Connect a publishing channel in Settings → Integrations to enable Publish / Schedule. You can still Mark as Ready or download locally.</span>
                </div>
              )}

              {/* Channel selector — only shown when multiple active channels require a choice */}
              {hasMultipleChannels && (
                <div className="space-y-2">
                  <p className="text-xs font-medium text-gray-600">Select publishing channel</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {activeChannels.map((ch) => {
                      const isSelected = selectedChannelId === ch.id;
                      return (
                        <button
                          key={ch.id}
                          type="button"
                          onClick={() => setSelectedChannelId(isSelected ? null : ch.id)}
                          className={`flex items-center gap-3 p-2.5 rounded-lg border-2 text-left transition-colors ${
                            isSelected ? 'border-teal-500 bg-teal-50' : 'border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          <CheckCircle2 className={`h-4 w-4 flex-shrink-0 ${isSelected ? 'text-teal-600' : 'text-gray-300'}`} />
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-gray-900 truncate">{ch.label ?? ch.platform}</p>
                            <p className="text-xs text-gray-500 truncate">{ch.provider}</p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Success */}
              {publishSuccess && (
                <p className="text-sm text-emerald-600 flex items-center gap-1">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  {publishSuccess}
                </p>
              )}
            </div>
          </div>
        );
      })()}

      {/* Export stays available after Publish too (download approved/published content) */}
      {isPublished && (
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Download</h3>
          <div className="flex flex-wrap gap-2">
            {exportFormats.map((fmt) => {
              const Icon = ICON_MAP[fmt.icon] ?? FileText;
              const onClick = fmt.id === 'clipboard'
                ? handleCopyToClipboard
                : () => handleDownload(fmt.id);
              return (
                <button
                  key={fmt.id}
                  type="button"
                  onClick={onClick}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-gray-200 text-xs font-medium text-gray-600 hover:bg-gray-50"
                >
                  <Icon className="h-3.5 w-3.5" />
                  {fmt.id === 'clipboard' && copied ? 'Copied!' : fmt.label}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Helpers ────────────────────────────────────────────────

function Badge({ platform, label }: { platform: string | null; label: string }) {
  const colors: Record<string, string> = {
    linkedin: 'bg-blue-100 text-blue-700',
    instagram: 'bg-pink-100 text-pink-700',
    facebook: 'bg-blue-100 text-blue-800',
    tiktok: 'bg-gray-900 text-white',
    youtube: 'bg-red-100 text-red-700',
    email: 'bg-gray-100 text-gray-700',
    web: 'bg-teal-100 text-teal-700',
    podcast: 'bg-purple-100 text-purple-700',
  };
  const cls = platform ? (colors[platform] ?? 'bg-gray-100 text-gray-600') : 'bg-gray-100 text-gray-600';
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${cls}`}>
      {label}
    </span>
  );
}

function formatDateDisplay(dateStr: string): string {
  try {
    const date = new Date(dateStr + 'T00:00:00');
    if (isNaN(date.getTime())) return dateStr;
    return date.toLocaleDateString('en-US', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
    });
  } catch {
    return dateStr;
  }
}
