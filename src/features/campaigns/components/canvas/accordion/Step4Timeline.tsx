'use client';

import React, { useCallback, useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useCanvasStore } from '../../../stores/useCanvasStore';
import { useClawStore } from '@/stores/useClawStore';
import { campaignKeys, contentLibraryKeys } from '../../../hooks';
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
import { PublishGate } from '../PublishGate';
import { VersionHistorySidebar } from '../VersionHistorySidebar';
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
  const queryClient = useQueryClient();
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
  const publishedVia = useCanvasStore((s) => s.publishedVia);
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
  // Schedule picker is collapsed by default (WordPress UX) — opens via Edit.
  const [showSchedulePicker, setShowSchedulePicker] = useState(false);
  const [showDownloadFormats, setShowDownloadFormats] = useState(false);
  const [showVersionHistory, setShowVersionHistory] = useState(false);

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

  // 2026-05-20 — contentType (already destructured above) used as a
  // fallback for preview-map + checklist resolution when MediumEnrichment
  // doesn't have a matching row (e.g. linkedin/poll-post isn't seeded
  // → platform/format end up null).
  const previewEntry = useMemo(
    () => resolvePreviewComponent(platform, format, contentType),
    [platform, format, contentType],
  );

  // Optimal timing suggestion
  const timingSuggestion = useMemo(
    () => getSuggestedPublishTime(platform),
    [platform],
  );

  // Publication checklist
  // Q4 (2026-05-19): adFormat doorgegeven zodat linkedin-ad sub-format
  // (single-image / video-ad / message-ad) format-specific checklist krijgt.
  // 2026-05-19 update: adFormat is single source of truth in Step 1
  // contentTypeInputs (was duplicated in Step 3 mediumConfig — verwarrend +
  // stale-state risico). Step 3 ad-format-sectie is verwijderd.
  const contentTypeInputs = useCanvasStore((s) => s.contentTypeInputs);
  const adFormat = (contentTypeInputs.adFormat as string | undefined) ?? null;
  const checklist = useMemo(
    () => getChecklistForPlatform(platform, format, adFormat, contentType),
    [platform, format, adFormat, contentType],
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
        case 'has-cta': {
          // 2026-05-19 verbreed:
          // - textGroup met 'cta'/'call-to-action' name (zelden gegenereerd
          //   als aparte group, alleen bij structured-output prompts)
          // - variant.cta field op preview (alleen bij visualBrief.cta —
          //   narrow case)
          // - regex match op CTA-verbs (NL + EN) zonder verplichte
          //   markdown-bold prefix (was te strict — Dutch ad-copy is
          //   meestal niet bold-wrapped)
          // - URL-aanwezigheid als sterk CTA-signaal (CTA leidt vaak naar
          //   landing-page link)
          const CTA_VERB_PATTERN =
            /\b(get|start|join|sign\s?up|sign\s?in|book|claim|download|discover|learn|try|shop|buy|register|subscribe|explore|request|schedule|apply|contact|begin|ontdek|probeer|klik|lees|vraag|plan|bel|mail|bestel|koop|krijg|schrijf|abonneer|registreer|neem|ga|reserveer|aanvraag|kies|word|meld)\b/i;
          const URL_PATTERN = /https?:\/\/\S+|www\.\S+/i;
          passed =
            textGroups.some((g) => g === 'cta' || g === 'call-to-action' || g.includes('cta')) ||
            Object.values(previewContent).some((v) => !!v?.cta) ||
            textGroups.some((g) => {
              const content = previewContent[g]?.content;
              if (!content) return false;
              return CTA_VERB_PATTERN.test(content) || URL_PATTERN.test(content);
            });
          break;
        }
        case 'has-meta':
          passed = textGroups.some((g) => g.includes('meta'));
          break;
        // 2026-05-20 — LinkedIn-poll specific checks (group structure:
        // context / question / option-1..4 / follow-up-comment / hashtags).
        case 'has-question':
          passed = textGroups.some((g) => g === 'question');
          break;
        case 'has-options':
          // At least 2 option-* groups with non-empty content.
          passed =
            textGroups.filter(
              (g) => /^option-[1-4]$/.test(g) && (previewContent[g]?.content?.trim().length ?? 0) > 0,
            ).length >= 2;
          break;
        case 'has-context':
          passed = textGroups.some(
            (g) => g === 'context' && (previewContent[g]?.content?.trim().length ?? 0) > 0,
          );
          break;
        case 'has-follow-up-comment':
          passed = textGroups.some(
            (g) =>
              g === 'follow-up-comment' &&
              (previewContent[g]?.content?.trim().length ?? 0) > 0,
          );
          break;
        case 'has-shownotes':
          passed = textGroups.some((g) => g.includes('show') || g.includes('notes'));
          break;
        case 'char-limit':
          passed = !charLimit || charCount <= charLimit;
          break;
        // 2026-05-22 — Google Search Ad (RSA) check-cases. Per-field
        // structure (headline-1..3, description-1..2, path-1/2,
        // sitelink-N-*) so the generic has-body etc. don't apply.
        case 'has-search-headlines': {
          const filled = ['headline-1', 'headline-2', 'headline-3'].filter(
            (g) => (previewContent[g]?.content?.trim().length ?? 0) > 0,
          ).length;
          passed = filled >= 3;
          break;
        }
        case 'has-search-descriptions': {
          const filled = ['description-1', 'description-2'].filter(
            (g) => (previewContent[g]?.content?.trim().length ?? 0) > 0,
          ).length;
          passed = filled >= 2;
          break;
        }
        case 'has-search-paths': {
          const filled = ['path-1', 'path-2'].filter(
            (g) => (previewContent[g]?.content?.trim().length ?? 0) > 0,
          ).length;
          passed = filled >= 1;
          break;
        }
        case 'has-search-sitelinks': {
          const completeCount = [1, 2, 3, 4].filter((n) =>
            (previewContent[`sitelink-${n}-title`]?.content?.trim().length ?? 0) > 0 &&
            (previewContent[`sitelink-${n}-description`]?.content?.trim().length ?? 0) > 0,
          ).length;
          passed = completeCount >= 1;
          break;
        }
        case 'search-char-limits': {
          // Hard caps per Google RSA spec
          const caps: Record<string, number> = {
            'headline-1': 30, 'headline-2': 30, 'headline-3': 30,
            'description-1': 90, 'description-2': 90,
            'path-1': 15, 'path-2': 15,
            'sitelink-1-title': 25, 'sitelink-2-title': 25, 'sitelink-3-title': 25, 'sitelink-4-title': 25,
            'sitelink-1-description': 35, 'sitelink-2-description': 35, 'sitelink-3-description': 35, 'sitelink-4-description': 35,
          };
          passed = Object.entries(caps).every(([group, cap]) => {
            const content = previewContent[group]?.content ?? '';
            return content.length <= cap;
          });
          break;
        }
        // 2026-05-22 — Google Responsive Display Ads (RDA) asset-library
        // checks. Mirror Google's Ad Strength score components: quantity
        // of unique assets per type.
        case 'has-rda-short-headline-min': {
          const filled = [1, 2, 3, 4, 5].filter(
            (n) => (previewContent[`short-headline-${n}`]?.content?.trim().length ?? 0) > 0,
          ).length;
          passed = filled >= 1;
          break;
        }
        case 'has-rda-short-headlines-full': {
          const filled = [1, 2, 3, 4, 5].filter(
            (n) => (previewContent[`short-headline-${n}`]?.content?.trim().length ?? 0) > 0,
          ).length;
          passed = filled === 5;
          break;
        }
        case 'has-rda-long-headline':
          passed = (previewContent['long-headline']?.content?.trim().length ?? 0) > 0;
          break;
        case 'has-rda-description-min': {
          const filled = [1, 2, 3, 4, 5].filter(
            (n) => (previewContent[`description-${n}`]?.content?.trim().length ?? 0) > 0,
          ).length;
          passed = filled >= 1;
          break;
        }
        case 'has-rda-descriptions-full': {
          const filled = [1, 2, 3, 4, 5].filter(
            (n) => (previewContent[`description-${n}`]?.content?.trim().length ?? 0) > 0,
          ).length;
          passed = filled === 5;
          break;
        }
        case 'has-rda-business-name':
          passed = (previewContent['business-name']?.content?.trim().length ?? 0) > 0;
          break;
        // 2026-05-22 — Retargeting-ad multi-scenario checks. Each
        // scenario requires 6 assets (primary-text, headline, cta,
        // creative-direction, offer-strategy, frequency-cap).
        case 'has-retargeting-cart-abandoner': {
          const required = ['primary-text', 'headline', 'cta', 'creative-direction', 'offer-strategy', 'frequency-cap'];
          passed = required.every(
            (f) => (previewContent[`cart-abandoner-${f}`]?.content?.trim().length ?? 0) > 0,
          );
          break;
        }
        case 'has-retargeting-page-visitor': {
          const required = ['primary-text', 'headline', 'cta', 'creative-direction', 'offer-strategy', 'frequency-cap'];
          passed = required.every(
            (f) => (previewContent[`page-visitor-${f}`]?.content?.trim().length ?? 0) > 0,
          );
          break;
        }
        case 'has-retargeting-past-customer': {
          const required = ['primary-text', 'headline', 'cta', 'creative-direction', 'offer-strategy', 'frequency-cap'];
          passed = required.every(
            (f) => (previewContent[`past-customer-${f}`]?.content?.trim().length ?? 0) > 0,
          );
          break;
        }
        case 'retargeting-char-limits': {
          const caps: Record<string, number> = {};
          for (const scenario of ['cart-abandoner', 'page-visitor', 'past-customer']) {
            caps[`${scenario}-primary-text`] = 300;
            caps[`${scenario}-headline`] = 40;
            caps[`${scenario}-cta`] = 20;
            caps[`${scenario}-creative-direction`] = 250;
            caps[`${scenario}-offer-strategy`] = 200;
            caps[`${scenario}-frequency-cap`] = 150;
          }
          passed = Object.entries(caps).every(([group, cap]) => {
            const content = previewContent[group]?.content ?? '';
            return content.length <= cap;
          });
          break;
        }
        // 2026-05-22 — Native-ad (sponsored article) per-asset checks.
        case 'has-native-headline':
          passed = (previewContent['headline']?.content?.trim().length ?? 0) > 0;
          break;
        case 'has-native-opening':
          passed = (previewContent['opening-paragraph']?.content?.trim().length ?? 0) > 0;
          break;
        case 'has-native-body':
          passed = (previewContent['body']?.content?.trim().length ?? 0) > 0;
          break;
        case 'has-native-brand-integration':
          passed = (previewContent['brand-integration']?.content?.trim().length ?? 0) > 0;
          break;
        case 'has-native-closing':
          passed = (previewContent['closing']?.content?.trim().length ?? 0) > 0;
          break;
        case 'has-native-disclosure':
          passed = (previewContent['disclosure-position']?.content?.trim().length ?? 0) > 0;
          break;
        case 'native-char-limits': {
          const caps: Record<string, number> = {
            'headline': 90,
            'subheadline': 140,
            'opening-paragraph': 500,
            'body': 2500,
            'brand-integration': 600,
            'closing': 300,
            'disclosure-position': 120,
          };
          passed = Object.entries(caps).every(([group, cap]) => {
            const content = previewContent[group]?.content ?? '';
            return content.length <= cap;
          });
          break;
        }
        case 'rda-char-limits': {
          const caps: Record<string, number> = {
            'short-headline-1': 30, 'short-headline-2': 30, 'short-headline-3': 30,
            'short-headline-4': 30, 'short-headline-5': 30,
            'long-headline': 90,
            'description-1': 90, 'description-2': 90, 'description-3': 90,
            'description-4': 90, 'description-5': 90,
            'business-name': 25,
          };
          passed = Object.entries(caps).every(([group, cap]) => {
            const content = previewContent[group]?.content ?? '';
            return content.length <= cap;
          });
          break;
        }
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
        // Local clock → UTC ISO (see handlePublish for rationale).
        const localDateTime = store.scheduledTime
          ? `${store.scheduledDate}T${store.scheduledTime}:00`
          : `${store.scheduledDate}T09:00:00`;
        body.scheduledFor = new Date(localDateTime).toISOString();
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
        // Channel publish that's scheduled → SCHEDULED status (was APPROVED).
        // Aligns with the local publish flow: scheduled = queued, not yet live.
        approvalStatus: data.status === 'published' ? 'PUBLISHED' : 'SCHEDULED',
        publishedAt: data.status === 'published' ? new Date().toISOString() : undefined,
        // Mark this publish as channel-driven so the status banner shows
        // "via LinkedIn" instead of "manual distribution".
        publishedVia: typeof data.channelPlatform === 'string' ? data.channelPlatform : undefined,
      });
      queryClient.invalidateQueries({ queryKey: contentLibraryKeys.all });
      queryClient.invalidateQueries({ queryKey: campaignKeys.all });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Publish failed');
    } finally {
      setIsSubmitting(false);
    }
  }, [deliverableId, queryClient]);

  // Approve, schedule for a future date, or publish immediately. The
  // schedule/publish branches both hit /publish — the route picks SCHEDULED
  // vs PUBLISHED based on the date. The approve branch hits /approval.
  const handlePublish = useCallback(async (action: 'approve' | 'schedule' | 'publish-now') => {
    setIsSubmitting(true);
    setError(null);

    const store = useCanvasStore.getState();

    try {
      if (action === 'schedule' || action === 'publish-now') {
        // The /publish route is now the single source of truth for both
        // SCHEDULED (future date) and PUBLISHED (now / past) — see WordPress-
        // style state machine in the route. We just hand it the user's
        // intent: a date for schedule, or publishNow=true for immediate.
        //
        // Date+time inputs return local-clock values ("2026-04-27", "09:00").
        // Build a Date from the local string (no Z), then toISOString() to
        // get a proper UTC ISO that the server stores. On read-back the
        // browser will convert UTC → local again, so the user sees their
        // original 09:00 regardless of timezone.
        const body: Record<string, unknown> = {};
        if (action === 'schedule' && store.scheduledDate) {
          const localDateTime = store.scheduledTime
            ? `${store.scheduledDate}T${store.scheduledTime}:00`
            : `${store.scheduledDate}T09:00:00`;
          body.scheduledPublishDate = new Date(localDateTime).toISOString();
        } else {
          body.publishNow = true;
        }

        const res = await fetch(`/api/studio/${deliverableId}/publish`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({ error: 'Failed to publish' }));
          throw new Error(err.error ?? 'Failed to publish');
        }
        const data = await res.json();

        store.setApprovalState({
          approvalStatus: data.approvalStatus,
          publishedAt: data.publishedAt ?? undefined,
          // Local publish leaves publishedVia null — explicit reset so a
          // re-publish after a channel-publish doesn't keep the channel tag.
          publishedVia: data.publishedVia ?? null,
        });
        if (data.approvalStatus === 'SCHEDULED') {
          store.setStepSummary('planner', {
            label: `Scheduled: ${formatDateDisplay(store.scheduledDate ?? '')}${store.scheduledTime ? ` at ${store.scheduledTime}` : ''}`,
          });
        } else {
          store.setStepSummary('planner', { label: 'Published' });
        }
      } else {
        // action === 'approve' — Mark as Ready (no publish intent yet).
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

      // Server cache is already invalidated by the route, but the TanStack
      // Query cache for Content Library / Campaigns lists holds stale data
      // until we explicitly invalidate — otherwise the traffic-light pill
      // stays red after Mark as Ready / Schedule.
      queryClient.invalidateQueries({ queryKey: contentLibraryKeys.all });
      queryClient.invalidateQueries({ queryKey: campaignKeys.all });

      // After "Mark as Ready" the user's work on this Canvas is done — the
      // item appears as ready in the overview. Navigate back to the
      // content library so they don't sit on a now-completed Canvas.
      // Schedule / Publish stay on the Canvas because the user may still
      // want to download formats or check the publish suggestion.
      if (action === 'approve') {
        useClawStore.getState().requestNavigation({ section: 'content-library' });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Action failed');
    } finally {
      setIsSubmitting(false);
    }
  }, [deliverableId, queryClient]);

  const isPublished = approvalStatus === 'PUBLISHED';
  const isScheduled = approvalStatus === 'SCHEDULED';
  const isApproved = approvalStatus === 'APPROVED';
  // "Ready for any next action" — content is no longer in DRAFT and has at
  // least been marked-as-ready or further along the pipeline.
  const isReady = isApproved || isScheduled || isPublished;
  const PreviewComponent = previewEntry.component;

  const ICON_MAP: Record<string, typeof Copy> = {
    Copy, FileText, Code, FileDown,
  };

  return (
    <div className="space-y-6">
      {/* Status banner — distinct copy per state. Distribution suffix
          ("via LinkedIn" vs "manual distribution") communicates how the
          publish was actually pushed out, separate from the publish status
          itself (Branddock-internal). */}
      {isReady && (() => {
        const distributionSuffix = (isPublished || isScheduled)
          ? (publishedVia
              ? ` · via ${publishedVia.charAt(0).toUpperCase()}${publishedVia.slice(1)}`
              : ' · manual distribution')
          : '';
        return (
          <div className={`flex items-center gap-3 p-4 rounded-lg border ${
            isScheduled
              ? 'bg-blue-50 border-blue-200'
              : 'bg-emerald-50 border-emerald-200'
          }`}>
            {isScheduled ? (
              <Clock className="h-5 w-5 text-blue-600 flex-shrink-0" />
            ) : (
              <CheckCircle2 className="h-5 w-5 text-emerald-600 flex-shrink-0" />
            )}
            <div>
              <p className={`text-sm font-medium ${isScheduled ? 'text-blue-800' : 'text-emerald-800'}`}>
                {isPublished ? `Content published${distributionSuffix}` :
                 isScheduled ? `Scheduled for publication${distributionSuffix}` :
                 'Content approved and ready'}
              </p>
              {scheduledDate && (
                <p className={`text-xs mt-0.5 ${isScheduled ? 'text-blue-600' : 'text-emerald-600'}`}>
                  {formatDateDisplay(scheduledDate)}{scheduledTime ? ` at ${scheduledTime}` : ''}
                </p>
              )}
              {!publishedVia && (isPublished || isScheduled) && (
                <p className={`text-xs mt-0.5 ${isScheduled ? 'text-blue-600' : 'text-emerald-600'}`}>
                  Distribute the content yourself, or connect a publishing channel to automate.
                </p>
              )}
            </div>
          </div>
        );
      })()}

      {/* Publish-readiness gate (entry #230) — shows the fidelity-score-badge
          + provides the override path when the gate blocks. Renders alongside
          the existing schedule/approve buttons rather than replacing them so
          the channel-publish + email-send flows stay intact. */}
      {!isPublished && (
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-3">
              <p className="text-sm font-medium text-gray-700">Publish-readiness</p>
              <button
                type="button"
                onClick={() => setShowVersionHistory((s) => !s)}
                className="text-xs text-gray-500 hover:text-gray-700 underline-offset-2 hover:underline"
              >
                {showVersionHistory ? 'Verberg versies' : 'Toon versies'}
              </button>
            </div>
            <PublishGate
              deliverableId={deliverableId}
              onPublish={() => handlePublish('publish-now')}
              isPublishing={isSubmitting}
            />
          </div>
        </div>
      )}

      {/* Version history (entry #227) — collapsible side-panel toont AI-versies +
          USER-edits met fidelity-scores en restore-knoppen. Bewaakt history
          buiten de actieve canvas-edit, zonder layout te restructuren. */}
      {showVersionHistory && (
        <div className="fixed inset-y-0 right-0 z-40 shadow-2xl">
          <VersionHistorySidebar
            deliverableId={deliverableId}
            onRestored={() => setShowVersionHistory(false)}
          />
        </div>
      )}

      {/* Send Campaign (email deliverables only) — also available once
          scheduled, the user may still want to push to Emailit. */}
      {isEmailDeliverable && campaignId && (isApproved || isScheduled) && (
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

        // WordPress-style primary-action label: derived from the current
        // schedule + status state. Mirrors WP behaviour:
        //   - already published, no future date  → "Update"  (re-save metadata)
        //   - already published, future date     → "Reschedule"
        //   - scheduled, future date             → "Update schedule"
        //   - scheduled, cleared date            → "Publish now"
        //   - draft/approved, no date            → "Publish now"
        //   - draft/approved, future date        → "Schedule"
        const hasFutureDate = !!scheduledDate;
        const primaryLabel = isSubmitting
          ? (hasFutureDate ? 'Scheduling…' : 'Publishing…')
          : isPublished
            ? (hasFutureDate ? 'Reschedule' : 'Update')
            : isScheduled
              ? (hasFutureDate ? 'Update schedule' : 'Publish now')
              : (hasFutureDate ? 'Schedule' : 'Publish now');
        const primaryAction: 'schedule' | 'publish-now' = hasFutureDate ? 'schedule' : 'publish-now';
        const formattedSchedule = scheduledDate
          ? `${formatDateDisplay(scheduledDate)}${scheduledTime ? ` at ${scheduledTime}` : ''}`
          : null;

        return (
          <div className="rounded-lg border border-gray-200 bg-white p-4 space-y-5">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-700">Finish &amp; Publish</h3>
              {isScheduled && formattedSchedule && (
                <span className="inline-flex items-center gap-1 text-xs text-blue-700">
                  <Clock className="h-3 w-3" />
                  Scheduled: {formattedSchedule}
                </span>
              )}
            </div>

            {/* WordPress-style "Publish: Immediately [Edit]" — collapsed by default */}
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 space-y-3">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-sm text-gray-700">
                  <Calendar className="h-4 w-4 text-gray-500" />
                  <span className="font-medium">Publish:</span>
                  <span className={hasFutureDate ? 'text-blue-700 font-medium' : 'text-gray-600'}>
                    {hasFutureDate ? formattedSchedule : 'Immediately'}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setShowSchedulePicker((v) => !v)}
                  className="text-xs font-medium text-primary hover:text-primary/80 underline-offset-2 hover:underline"
                >
                  {showSchedulePicker ? 'Done' : 'Edit'}
                </button>
              </div>

              {showSchedulePicker && (
                <>
                  {timingSuggestion && (
                    <button
                      type="button"
                      onClick={handleApplySuggestion}
                      className="w-full flex items-start gap-3 p-2.5 rounded-lg bg-primary/5 border border-primary/20 hover:bg-primary/10 transition-colors text-left"
                    >
                      <Sparkles className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-xs font-medium text-gray-800">
                          Suggested: {timingSuggestion.day} at {timingSuggestion.time}
                        </p>
                        <p className="text-[11px] text-gray-500 mt-0.5">{timingSuggestion.reason}</p>
                      </div>
                    </button>
                  )}

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label htmlFor="schedule-date" className="block text-[11px] font-medium text-gray-600 mb-1">
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
                      <label htmlFor="schedule-time" className="block text-[11px] font-medium text-gray-600 mb-1">
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

                  {hasFutureDate && (
                    <button
                      type="button"
                      onClick={() => {
                        useCanvasStore.getState().setScheduledDate(null);
                        useCanvasStore.getState().setScheduledTime(null);
                      }}
                      className="text-[11px] text-gray-500 hover:text-gray-700 underline underline-offset-2"
                    >
                      Clear schedule (publish immediately)
                    </button>
                  )}
                </>
              )}
            </div>

            {/* Primary action — Publish / Schedule / Update (label is dynamic).
                Disabled when there's nothing meaningful to do: already
                published with no new date implies a no-op republish that
                would overwrite publishedAt. The user must prik a date for
                Reschedule, or use a side action for unpublish/edit. */}
            {/* Two equal primary actions side-by-side. Without an active
                channel, Publish/Schedule has no real distribution to do, so
                we disable it and switch the visual emphasis to Mark as Ready
                (the only action that makes sense without a channel: flip
                status, distribute manually). With an active channel, Publish
                is the gradient primary and Mark as Ready is the border
                secondary. Both buttons share padding, height and icon size
                so they line up exactly. */}
            {(() => {
              const publishGated = !hasActiveChannels && !isPublished && !isScheduled;
              const publishDisabled =
                isSubmitting || (isPublished && !hasFutureDate) || publishGated;

              const publishClass = publishGated
                ? 'flex items-center justify-center gap-2 px-4 py-3 rounded-lg text-gray-500 font-medium border border-gray-300 bg-white disabled:opacity-50 disabled:cursor-not-allowed'
                : `flex items-center justify-center gap-2 px-4 py-3 rounded-lg text-white font-medium ${STUDIO.generateButton} disabled:opacity-50 disabled:cursor-not-allowed`;

              const readyPrimary = publishGated; // Mark as Ready takes the gradient when Publish is gated.
              const readyClass = readyPrimary
                ? `flex items-center justify-center gap-2 px-4 py-3 rounded-lg text-white font-medium ${STUDIO.generateButton} disabled:opacity-50 disabled:cursor-not-allowed`
                : 'flex items-center justify-center gap-2 px-4 py-3 rounded-lg text-gray-700 font-medium border border-gray-300 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed';

              const publishTitle = publishGated
                ? 'Connect a publishing channel in Settings → Integrations to enable Publish / Schedule.'
                : isPublished && !hasFutureDate
                  ? 'Already published. Pick a date to reschedule.'
                  : undefined;

              return (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 items-stretch">
                  <button
                    type="button"
                    onClick={() => handlePublish(primaryAction)}
                    disabled={publishDisabled}
                    title={publishTitle}
                    className={publishClass}
                  >
                    {hasFutureDate ? <Calendar className="h-4 w-4" /> : <Send className="h-4 w-4" />}
                    {primaryLabel}
                  </button>

                  <button
                    type="button"
                    onClick={async () => {
                      await handlePublish('approve');
                      setShowDownloadFormats(true);
                    }}
                    disabled={isSubmitting || isReady}
                    title={isReady ? 'Already approved.' : undefined}
                    className={readyClass}
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    {isApproved && !isScheduled && !isPublished ? 'Ready' : 'Mark as Ready'}
                  </button>
                </div>
              );
            })()}

            {/* Distribute to platform — separate concern from publish status.
                Local publish above marks the item as published in Branddock;
                this section controls whether it ALSO gets pushed to a
                connected platform (LinkedIn / WordPress / etc.). */}
            <div className="rounded-lg border border-gray-200 bg-white p-3 space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Distribute to platform
                </h4>
                {publishedVia && (
                  <span className="text-xs text-emerald-700 inline-flex items-center gap-1">
                    <CheckCircle2 className="h-3 w-3" />
                    Sent to {publishedVia}
                  </span>
                )}
              </div>

              {hasActiveChannels ? (
                <>
                  {hasMultipleChannels && (
                    <p className="text-xs text-gray-500">
                      Select a channel below, then click <span className="font-medium">Send to platform</span>.
                    </p>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      if (!effectiveChannelId) return;
                      handlePublishToChannel(effectiveChannelId);
                    }}
                    disabled={isSubmitting || (hasMultipleChannels && !selectedChannelId)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-gray-900 text-white text-xs font-medium hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Send className="h-3.5 w-3.5" />
                    Send to platform
                  </button>
                </>
              ) : (
                <p className="text-xs text-gray-500 inline-flex items-center gap-2">
                  <Plug className="h-3.5 w-3.5 flex-shrink-0 text-gray-400" />
                  Connect a channel in Settings → Integrations to auto-distribute.
                  Until then, you distribute the published content yourself.
                </p>
              )}
            </div>

            <div className="space-y-3">
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

              {/* No-active-channel hint moved into the Distribute panel above —
                  the local Publish/Schedule action no longer requires a channel. */}

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
