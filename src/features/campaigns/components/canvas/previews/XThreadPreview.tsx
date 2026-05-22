'use client';

import React from 'react';
import type { PlatformPreviewProps } from '../../../types/canvas.types';
import { HeroImageSlot } from './HeroImageSlot';
import { SimpleMarkdown } from './SimpleMarkdown';
import { MessageCircle, Repeat2, Heart, BarChart3, Share, MoreHorizontal, BadgeCheck } from 'lucide-react';
import { extractCta, CtaButton } from './CtaButton';
import { InlineEditableSection, useEditableEntry, type InlineEditableEntry } from './InlineEditableSection';
import { AdditionalComponentsSection } from './AdditionalComponentsSection';

const THREAD_GROUPS = ['hook', 'tweet-2', 'tweet-3', 'tweet-4', 'tweet-5', 'tweet-6', 'cta-tweet'] as const;
type ThreadGroup = (typeof THREAD_GROUPS)[number];

const HANDLED_GROUPS = [
  'hook', 'hook-line', 'tweet-1',
  'tweet-2', 'tweet-3', 'tweet-4', 'tweet-5', 'tweet-6', 'tweet-7',
  'cta-tweet', 'cta', 'call-to-action',
  'hashtags',
  // Suppress model-hedge: when the model emits both the named tweet groups
  // AND a legacy "content"/"body" blob bundling all tweets with "1/", "2/"
  // prefixes, only the named groups should render — the blob is redundant.
  'content', 'body',
];

interface TweetSlot {
  group: ThreadGroup;
  entry: InlineEditableEntry;
}

interface TweetCardProps {
  slot: TweetSlot;
  position: number;
  total: number;
  name: string;
  handle: string;
  isLeader: boolean;
  isLast: boolean;
  heroImage?: PlatformPreviewProps['heroImage'];
  onAddImage?: PlatformPreviewProps['onAddImage'];
  hashtagsEntry: InlineEditableEntry | null;
  cta: string | null;
}

/**
 * X (Twitter) thread mockup — vertically stacked tweet cards connected by
 * a thread line. Iterates over the 7 semantic-hybrid tweet groups defined
 * in the seed (`hook` + `tweet-2..6` + `cta-tweet`) and renders only the
 * slots that actually have content. Hashtags and CTA are appended to the
 * final tweet per X convention; the hero image attaches to the leader.
 */
export function XThreadPreview({
  previewContent,
  isGenerating,
  heroImage,
  onAddImage,
  brandName,
}: PlatformPreviewProps) {
  const hookPrimary = useEditableEntry('hook');
  const hookFallback1 = useEditableEntry('hook-line');
  const hookFallback2 = useEditableEntry('tweet-1');
  const tweet2 = useEditableEntry('tweet-2');
  const tweet3 = useEditableEntry('tweet-3');
  const tweet4 = useEditableEntry('tweet-4');
  const tweet5 = useEditableEntry('tweet-5');
  const tweet6 = useEditableEntry('tweet-6');
  const ctaTweetPrimary = useEditableEntry('cta-tweet');
  const ctaTweetFallback1 = useEditableEntry('cta');
  const ctaTweetFallback2 = useEditableEntry('call-to-action');
  const hashtagsEntry = useEditableEntry('hashtags');

  const cta = extractCta(previewContent);
  const name = brandName ?? 'Brand Name';
  const handle = '@' + name.toLowerCase().replace(/\s+/g, '');

  if (isGenerating) {
    return <ThreadSkeleton />;
  }

  const slots: TweetSlot[] = [];
  const hookEntry = hookPrimary ?? hookFallback1 ?? hookFallback2;
  if (hookEntry) slots.push({ group: 'hook', entry: hookEntry });
  if (tweet2) slots.push({ group: 'tweet-2', entry: tweet2 });
  if (tweet3) slots.push({ group: 'tweet-3', entry: tweet3 });
  if (tweet4) slots.push({ group: 'tweet-4', entry: tweet4 });
  if (tweet5) slots.push({ group: 'tweet-5', entry: tweet5 });
  if (tweet6) slots.push({ group: 'tweet-6', entry: tweet6 });
  const ctaTweetEntry = ctaTweetPrimary ?? ctaTweetFallback1 ?? ctaTweetFallback2;
  if (ctaTweetEntry) slots.push({ group: 'cta-tweet', entry: ctaTweetEntry });

  const total = slots.length;

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden mx-auto w-full" style={{ maxWidth: '598px' }}>
      {slots.map((slot, idx) => (
        <TweetCard
          key={slot.group}
          slot={slot}
          position={idx + 1}
          total={total}
          name={name}
          handle={handle}
          isLeader={idx === 0}
          isLast={idx === total - 1}
          heroImage={idx === 0 ? heroImage : null}
          onAddImage={idx === 0 ? onAddImage : undefined}
          hashtagsEntry={idx === total - 1 ? hashtagsEntry : null}
          cta={idx === total - 1 ? cta : null}
        />
      ))}

      <AdditionalComponentsSection handledGroups={HANDLED_GROUPS} />
    </div>
  );
}

function TweetCard({
  slot,
  position,
  total,
  name,
  handle,
  isLeader,
  isLast,
  heroImage,
  onAddImage,
  hashtagsEntry,
  cta,
}: TweetCardProps) {
  return (
    <div className={`px-4 pt-4 ${isLast ? 'pb-4' : 'pb-2'}`}>
      <div className="flex gap-4">
        <div className="flex flex-col items-center flex-shrink-0 w-10">
          <div className="h-10 w-10 rounded-full bg-gray-900 flex items-center justify-center">
            <span className="text-sm font-bold text-white">{name.charAt(0).toUpperCase()}</span>
          </div>
          {!isLast && <div className="w-0.5 flex-1 bg-gray-200 mt-2 mb-0" />}
        </div>

        <div className="flex-1 min-w-0 pl-1">
          <div className="flex items-start justify-between mb-1">
            <div className="flex items-center gap-1 flex-wrap">
              <p className="text-sm font-bold text-gray-900">{name}</p>
              <BadgeCheck className="h-4 w-4" style={{ color: '#1D9BF0' }} />
              <p className="text-sm text-gray-500">{handle}</p>
              <span className="text-sm text-gray-500">·</span>
              <span className="text-xs text-gray-500">{position}/{total}</span>
            </div>
            <MoreHorizontal className="h-5 w-5 text-gray-400" />
          </div>

          <InlineEditableSection
            entry={slot.entry}
            render={(text) => (
              <div className="text-[15px] text-gray-900 leading-relaxed mb-2">
                <SimpleMarkdown text={text} />
              </div>
            )}
          />

          {hashtagsEntry && (
            <InlineEditableSection
              entry={hashtagsEntry}
              render={(text) => (
                <p className="text-[15px] mb-2" style={{ color: '#1D9BF0' }}>{text}</p>
              )}
            />
          )}

          {isLast && cta && (
            <div className="mb-2">
              <CtaButton text={cta} variant="link" />
            </div>
          )}

          {isLeader && (
            <div className="rounded-2xl overflow-hidden border border-gray-200 mt-2">
              <HeroImageSlot image={heroImage ?? null} onAddImage={onAddImage} aspectRatio="aspect-[16/9]" rounded="rounded-none" />
            </div>
          )}

          <TweetActionBar />
        </div>
      </div>
    </div>
  );
}

function TweetActionBar() {
  const actions = [
    { icon: MessageCircle, label: '3' },
    { icon: Repeat2, label: '5' },
    { icon: Heart, label: '24' },
    { icon: BarChart3, label: '1.2K' },
    { icon: Share, label: '' },
  ];
  return (
    <div className="flex items-center justify-between mt-2 pr-8 max-w-[420px]">
      {actions.map(({ icon: Icon, label }, idx) => (
        <div key={idx} className="flex items-center gap-1 text-gray-500">
          <Icon className="h-4 w-4" />
          {label && <span className="text-xs">{label}</span>}
        </div>
      ))}
    </div>
  );
}

function ThreadSkeleton() {
  return (
    <div className="bg-white rounded-lg border border-gray-200 mx-auto w-full" style={{ maxWidth: '598px' }}>
      {[0, 1, 2].map((i) => (
        <div key={i} className={`p-4 animate-pulse ${i > 0 ? 'border-t border-gray-100' : ''}`}>
          <div className="flex gap-3">
            <div className="flex flex-col items-center">
              <div className="h-10 w-10 rounded-full bg-gray-200" />
              {i < 2 && <div className="w-0.5 flex-1 bg-gray-200 mt-2" />}
            </div>
            <div className="flex-1 space-y-2">
              <div className="h-3.5 w-32 rounded bg-gray-200" />
              <div className="h-3 w-full rounded bg-gray-200" />
              <div className="h-3 w-4/5 rounded bg-gray-200" />
              {i === 0 && <div className="h-44 rounded-2xl bg-gray-200" />}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
