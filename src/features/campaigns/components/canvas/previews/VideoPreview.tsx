'use client';

import React from 'react';
import type { PlatformPreviewProps } from '../../../types/canvas.types';
import { HeroImageSlot } from './HeroImageSlot';
import { SimpleMarkdown } from './SimpleMarkdown';
import { Play, Heart, MessageCircle, Bookmark, Share2, Music, Eye } from 'lucide-react';
import { InlineEditableSection, useEditableEntry, type InlineEditableEntry } from './InlineEditableSection';
import { stripMarkdownForPlainText } from '../../../lib/strip-markdown';

/**
 * Platform-aware video preview.
 * Renders TikTok-style (9:16 dark overlay) or YouTube-style (16:9 card)
 * based on the `platform` prop.
 *
 * Hooks are called unconditionally at the top level so we can pass entries
 * down to the sub-style components.
 */
export function VideoPreview({ previewContent, isGenerating, heroImage, onAddImage, brandName, platform }: PlatformPreviewProps) {
  // Inline-edit entries — null when no content has been generated yet.
  const captionEntryPrimary = useEditableEntry('caption');
  const captionEntryFallback = useEditableEntry('body');
  const captionEntry = captionEntryPrimary ?? captionEntryFallback;
  const titleEntryPrimary = useEditableEntry('headline');
  const titleEntryFallback = useEditableEntry('hook');
  const titleEntry = titleEntryPrimary ?? titleEntryFallback;
  const descriptionEntry = useEditableEntry('description');

  // Map known groups for the GenericVideoStyle fallback (dynamic rendering).
  const entryMap: Record<string, ReturnType<typeof useEditableEntry>> = {
    title: useEditableEntry('title'),
    headline: titleEntryPrimary,
    hook: titleEntryFallback,
    body: captionEntryFallback,
    caption: captionEntryPrimary,
    description: descriptionEntry,
    script: useEditableEntry('script'),
    intro: useEditableEntry('intro'),
    conclusion: useEditableEntry('conclusion'),
  };

  const textEntries = Object.entries(previewContent).filter(
    ([, v]) => v.type === 'text' && v.content,
  );
  const fallbackCaption = previewContent.caption?.content ?? previewContent.body?.content ?? '';
  const fallbackTitle = previewContent.headline?.content ?? previewContent.hook?.content ?? fallbackCaption.slice(0, 80);
  const name = brandName ?? 'Brand Name';
  const handle = name.toLowerCase().replace(/\s+/g, '');

  if (isGenerating) {
    const ar = platform === 'tiktok' ? 'aspect-[9/16]' : 'aspect-video';
    return (
      <div className="bg-white rounded-lg border border-gray-200">
        <div className="animate-pulse p-3">
          <div className={`${ar} rounded bg-gray-200`} />
          <div className="h-4 w-3/4 rounded bg-gray-200 mt-3" />
        </div>
      </div>
    );
  }

  // TikTok / Reels / Shorts — vertical 9:16 with dark overlay UI
  if (platform === 'tiktok' || platform === 'instagram') {
    return <TikTokStyle captionEntry={captionEntry} fallbackCaption={fallbackCaption} name={name} handle={handle} heroImage={heroImage} onAddImage={onAddImage} />;
  }

  // YouTube — horizontal 16:9 card
  if (platform === 'youtube') {
    return <YouTubeStyle titleEntry={titleEntry} fallbackTitle={fallbackTitle} name={name} heroImage={heroImage} onAddImage={onAddImage} />;
  }

  // Default — generic video with script text
  return <GenericVideoStyle textEntries={textEntries} entryMap={entryMap} heroImage={heroImage} onAddImage={onAddImage} />;
}

// ─── TikTok / Reels Style ─────────────────────────────────

function TikTokStyle({ captionEntry, fallbackCaption, name, handle, heroImage, onAddImage }: {
  captionEntry: InlineEditableEntry | null;
  fallbackCaption: string;
  name: string;
  handle: string;
  heroImage?: PlatformPreviewProps['heroImage'];
  onAddImage?: () => void;
}) {
  return (
    <div className="relative rounded-xl overflow-hidden bg-black" style={{ aspectRatio: '9 / 16' }}>
      {/* Background image or placeholder */}
      {heroImage?.url ? (
        <img src={heroImage.url} alt="" className="absolute inset-0 w-full h-full object-cover opacity-80" />
      ) : (
        <div className="absolute inset-0">
          <HeroImageSlot image={heroImage} onAddImage={onAddImage} aspectRatio="aspect-[9/16]" rounded="rounded-none" />
        </div>
      )}

      {/* Dark gradient overlays */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/70" />

      {/* Right sidebar — action buttons */}
      <div className="absolute right-3 bottom-32 flex flex-col items-center gap-5">
        {[
          { icon: Heart, label: '2.4K' },
          { icon: MessageCircle, label: '89' },
          { icon: Bookmark, label: '156' },
          { icon: Share2, label: '43' },
        ].map(({ icon: Icon, label }) => (
          <div key={label} className="flex flex-col items-center gap-1">
            <div className="h-9 w-9 rounded-full bg-white/10 flex items-center justify-center">
              <Icon className="h-5 w-5 text-white" />
            </div>
            <span className="text-[10px] text-white font-medium">{label}</span>
          </div>
        ))}
      </div>

      {/* Bottom — username + caption + music */}
      <div className="absolute bottom-4 left-3 right-16 text-white">
        <p className="text-sm font-bold mb-1">@{handle}</p>
        {captionEntry ? (
          <InlineEditableSection
            entry={captionEntry}
            render={(text) => (
              <div className="text-xs leading-relaxed line-clamp-3 mb-2">
                <SimpleMarkdown text={text} />
              </div>
            )}
          />
        ) : fallbackCaption ? (
          <p className="text-xs leading-relaxed line-clamp-3 mb-2">{fallbackCaption}</p>
        ) : null}
        <div className="flex items-center gap-1.5 text-[10px] text-white/80">
          <Music className="h-3 w-3" />
          <span className="truncate">Original sound — {name}</span>
        </div>
      </div>
    </div>
  );
}

// ─── YouTube Style ────────────────────────────────────────

function YouTubeStyle({ titleEntry, fallbackTitle, name, heroImage, onAddImage }: {
  titleEntry: InlineEditableEntry | null;
  fallbackTitle: string;
  name: string;
  heroImage?: PlatformPreviewProps['heroImage'];
  onAddImage?: () => void;
}) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      {/* Video thumbnail — 16:9 */}
      <div className="relative">
        <HeroImageSlot image={heroImage} onAddImage={onAddImage} aspectRatio="aspect-video" rounded="rounded-none" />
        {/* Duration badge */}
        <div className="absolute bottom-2 right-2 bg-black/80 text-white text-[10px] font-medium px-1.5 py-0.5 rounded">
          0:30
        </div>
        {/* Play button overlay */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="h-12 w-12 rounded-full bg-black/60 flex items-center justify-center">
            <Play className="h-5 w-5 text-white ml-0.5" fill="white" />
          </div>
        </div>
      </div>

      {/* Video info */}
      <div className="px-3 py-2.5">
        <div className="flex gap-2.5">
          <div className="h-9 w-9 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
            <span className="text-xs font-bold text-red-600">{name.charAt(0).toUpperCase()}</span>
          </div>
          <div className="min-w-0">
            {titleEntry ? (
              <InlineEditableSection
                entry={titleEntry}
                render={(text) => (
                  <p className="text-sm font-medium text-gray-900 leading-snug line-clamp-2">{stripMarkdownForPlainText(text) || 'Video Title'}</p>
                )}
              />
            ) : (
              <p className="text-sm font-medium text-gray-900 leading-snug line-clamp-2">{fallbackTitle || 'Video Title'}</p>
            )}
            <p className="text-xs text-gray-500 mt-0.5">{name}</p>
            <div className="flex items-center gap-1 text-xs text-gray-500">
              <Eye className="h-3 w-3" />
              <span>1.2K views · 2 hours ago</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Generic Video Style ──────────────────────────────────

function GenericVideoStyle({ textEntries, entryMap, heroImage, onAddImage }: {
  textEntries: [string, { content: string | null; type: string }][];
  entryMap: Record<string, InlineEditableEntry | null>;
  heroImage?: PlatformPreviewProps['heroImage'];
  onAddImage?: () => void;
}) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      <div className="relative">
        <HeroImageSlot image={heroImage} onAddImage={onAddImage} aspectRatio="aspect-video" rounded="rounded-none" />
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="h-14 w-14 rounded-full bg-black/30 flex items-center justify-center">
            <Play className="h-7 w-7 text-white ml-0.5" />
          </div>
        </div>
      </div>
      {textEntries.length > 0 && (
        <div className="p-3">
          {textEntries.map(([group, value]) => {
            const lower = group.toLowerCase();
            const isPlainText = lower === 'title' || lower === 'headline';
            const entry = entryMap[group];
            const renderRow = (text: string) => (
              <div className="mb-2 last:mb-0">
                <p className="text-xs font-medium text-gray-400 uppercase mb-1">{group.replace(/_/g, ' ')}</p>
                {isPlainText ? (
                  <p className="text-sm text-gray-800 whitespace-pre-wrap line-clamp-4">{stripMarkdownForPlainText(text)}</p>
                ) : (
                  <div className="text-sm text-gray-800 line-clamp-4">
                    <SimpleMarkdown text={text} />
                  </div>
                )}
              </div>
            );
            return (
              <div key={group}>
                {entry ? (
                  <InlineEditableSection entry={entry} render={renderRow} />
                ) : (
                  renderRow(value.content ?? '')
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
