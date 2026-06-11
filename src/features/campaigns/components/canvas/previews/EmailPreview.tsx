'use client';

import React from 'react';
import type { PlatformPreviewProps } from '../../../types/canvas.types';
import { HeroImageSlot } from './HeroImageSlot';
import { SimpleMarkdown } from './SimpleMarkdown';
import { extractCta } from './CtaButton';
import { InlineEditableSection, useEditableEntry, useEditableEntries, type InlineEditableEntry } from './InlineEditableSection';
import { AdditionalComponentsSection } from './AdditionalComponentsSection';
import { stripMarkdownForPlainText } from '../../../lib/strip-markdown';

const SEQUENCE_GROUP_RE = /^email-(\d+)-(subject|body)$/;

interface SequenceEmail {
  n: number;
  subject: InlineEditableEntry | null;
  body: InlineEditableEntry | null;
}

/** Collect email-N-subject/email-N-body pairs (sequence contracts,
 *  prompt-audit Fase 2) from the editable entries, ordered by N. */
function collectSequenceEmails(entries: Map<string, InlineEditableEntry>): SequenceEmail[] {
  const byIndex = new Map<number, SequenceEmail>();
  for (const [group, entry] of entries) {
    const m = SEQUENCE_GROUP_RE.exec(group);
    if (!m) continue;
    const n = Number(m[1]);
    const item = byIndex.get(n) ?? { n, subject: null, body: null };
    if (m[2] === 'subject') item.subject = entry;
    else item.body = entry;
    byIndex.set(n, item);
  }
  return Array.from(byIndex.values()).sort((a, b) => a.n - b.n);
}

/**
 * Email client mockup — styled like a real email template rendering.
 *
 * Seed template emits `subject-line + preheader + headline + body +
 * cta-button + footer`. The subject slot falls back through
 * subject → subject-line → headline; the preheader slot through
 * preheader → preview-text; the cta slot through cta → cta-button.
 * Anything left over (e.g. a separate `headline` next to `subject-line`,
 * or `footer`) drops into AdditionalComponentsSection at the bottom.
 */
export function EmailPreview({ previewContent, isGenerating, heroImage, onAddImage, mediumConfig, brandName }: PlatformPreviewProps) {
  // Inline-edit entries — null when no content has been generated yet.
  const subjectEntryPrimary = useEditableEntry('subject');
  const subjectEntryAlias = useEditableEntry('subject-line');
  const subjectEntryFallback = useEditableEntry('headline');
  const subjectEntry = subjectEntryPrimary ?? subjectEntryAlias ?? subjectEntryFallback;
  const preheaderEntryPrimary = useEditableEntry('preheader');
  // 're-engagement-email' contract (prompt-audit Fase 2) names the preheader
  // slot 'preview-text' — same inbox-preview semantics, same slot.
  const preheaderEntryAlias = useEditableEntry('preview-text');
  const preheaderEntry = preheaderEntryPrimary ?? preheaderEntryAlias;
  const bodyEntry = useEditableEntry('body');
  const ctaPrimary = useEditableEntry('cta');
  const ctaButtonFallback = useEditableEntry('cta-button');
  const ctaEntry = ctaPrimary ?? ctaButtonFallback;
  // Sequence types (welcome/nurture) emit email-N-subject/body pairs
  // instead of the single-email slots — render those as stacked cards.
  const allEntries = useEditableEntries();
  const sequenceEmails = React.useMemo(() => collectSequenceEmails(allEntries), [allEntries]);
  const sequenceGroups = React.useMemo(
    () => sequenceEmails.flatMap((e) => [e.subject?.group, e.body?.group]).filter((g): g is string => !!g),
    [sequenceEmails],
  );

  const cta = extractCta(previewContent) ?? '';
  const templateStyle = (mediumConfig?.templateStyle as string) ?? 'minimal';
  const ctaPlacement = (mediumConfig?.ctaPlacement as string) ?? 'bottom';
  const personalize = (mediumConfig?.personalize as boolean) ?? false;
  const isBranded = templateStyle === 'branded';
  const accentColor = isBranded ? '#0d9488' : '#1f2937';

  if (isGenerating) {
    return (
      <div className="bg-white rounded-lg border border-gray-200">
        <div className="animate-pulse p-4 space-y-3">
          <div className="h-4 w-2/3 rounded bg-gray-200" />
          <div className="h-3 w-full rounded bg-gray-200" />
          <div className="h-32 rounded bg-gray-200" />
          <div className="h-8 w-28 rounded bg-gray-200 mx-auto" />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-100 rounded-lg border border-gray-200 overflow-hidden">
      {/* Email client chrome */}
      <div className="bg-white border-b border-gray-200 px-4 py-2">
        <div className="flex items-center gap-1.5 mb-2">
          <div className="h-2.5 w-2.5 rounded-full bg-red-400" />
          <div className="h-2.5 w-2.5 rounded-full bg-yellow-400" />
          <div className="h-2.5 w-2.5 rounded-full bg-green-400" />
        </div>
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs">
            <span className="text-gray-400 w-10">From:</span>
            <span className="text-gray-700 font-medium">{brandName ?? 'Brand Name'} &lt;hello@{(brandName ?? 'brand').toLowerCase().replace(/\s+/g, '')}.com&gt;</span>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <span className="text-gray-400 w-10">To:</span>
            <span className="text-gray-700">{personalize ? '{{firstName}} {{lastName}}' : 'subscriber@email.com'}</span>
          </div>
          {subjectEntry && (
            <div className="flex items-center gap-2 text-xs">
              <span className="text-gray-400 w-10">Subject:</span>
              <InlineEditableSection
                entry={subjectEntry}
                size="compact"
                render={(text) => (
                  <span className="text-gray-900 font-semibold">{stripMarkdownForPlainText(text)}</span>
                )}
              />
            </div>
          )}
        </div>
      </div>

      {/* Email body — centered card on gray background */}
      <div className="p-4">
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          {/* Brand header bar */}
          <div className="h-1.5" style={{ backgroundColor: accentColor }} />

          {/* Hero image */}
          <HeroImageSlot image={heroImage} onAddImage={onAddImage} aspectRatio="aspect-[3/1]" rounded="rounded-none" />

          {/* Content */}
          <div className="px-6 py-5 space-y-4">
            {/* Greeting */}
            {personalize && (
              <p className="text-sm text-gray-700">Hi {'{{firstName}}'},</p>
            )}

            {/* Preheader / preview text */}
            {preheaderEntry && (
              <InlineEditableSection
                entry={preheaderEntry}
                render={(text) => (
                  <p className="text-xs text-gray-400 italic">{stripMarkdownForPlainText(text)}</p>
                )}
              />
            )}

            {/* CTA top placement */}
            {ctaPlacement === 'top' && (ctaEntry || cta) && (
              <div className="text-center py-2">
                {ctaEntry ? (
                  <InlineEditableSection
                    entry={ctaEntry}
                    render={(text) => (
                      <span className="inline-block px-6 py-2.5 text-sm font-semibold text-white rounded-md" style={{ backgroundColor: accentColor }}>
                        {stripMarkdownForPlainText(text).slice(0, 80)}
                      </span>
                    )}
                  />
                ) : (
                  <span className="inline-block px-6 py-2.5 text-sm font-semibold text-white rounded-md" style={{ backgroundColor: accentColor }}>
                    {cta}
                  </span>
                )}
              </div>
            )}

            {/* Body */}
            {bodyEntry && (
              <InlineEditableSection
                entry={bodyEntry}
                render={(text) => (
                  <div className="text-sm text-gray-700 leading-relaxed">
                    <SimpleMarkdown text={text} />
                  </div>
                )}
              />
            )}

            {/* Sequence emails — stacked cards, one per email-N pair */}
            {sequenceEmails.length > 0 && (
              <div className="space-y-4">
                {sequenceEmails.map((email) => (
                  <div key={email.n} className="rounded-lg border border-gray-200 overflow-hidden">
                    <div className="flex items-center gap-2 bg-gray-50 border-b border-gray-100 px-4 py-2">
                      <span className="inline-flex items-center justify-center h-5 w-5 rounded-full text-[10px] font-semibold text-white" style={{ backgroundColor: accentColor }}>
                        {email.n}
                      </span>
                      {email.subject ? (
                        <InlineEditableSection
                          entry={email.subject}
                          size="compact"
                          render={(text) => (
                            <span className="text-xs font-semibold text-gray-900">{stripMarkdownForPlainText(text)}</span>
                          )}
                        />
                      ) : (
                        <span className="text-xs italic text-gray-400">No subject generated</span>
                      )}
                    </div>
                    {email.body && (
                      <div className="px-4 py-3">
                        <InlineEditableSection
                          entry={email.body}
                          render={(text) => (
                            <div className="text-sm text-gray-700 leading-relaxed">
                              <SimpleMarkdown text={text} />
                            </div>
                          )}
                        />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* CTA bottom placement */}
            {ctaPlacement !== 'top' && (ctaEntry || cta) && (
              <div className="text-center py-2">
                {ctaEntry ? (
                  <InlineEditableSection
                    entry={ctaEntry}
                    render={(text) => (
                      <span className="inline-block px-6 py-2.5 text-sm font-semibold text-white rounded-md" style={{ backgroundColor: accentColor }}>
                        {stripMarkdownForPlainText(text).slice(0, 80)}
                      </span>
                    )}
                  />
                ) : (
                  <span className="inline-block px-6 py-2.5 text-sm font-semibold text-white rounded-md" style={{ backgroundColor: accentColor }}>
                    {cta}
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Additional generated components that don't fit the curated slots */}
          <div className="px-6 pb-3">
            <AdditionalComponentsSection
              handledGroups={['subject', 'subject-line', 'headline', 'preheader', 'preview-text', 'body', 'cta', 'cta-button', ...sequenceGroups]}
            />
          </div>

          {/* Footer */}
          <div className="border-t border-gray-100 px-6 py-3 bg-gray-50">
            <p className="text-[10px] text-gray-400 text-center leading-relaxed">
              {brandName ?? 'Brand Name'} · 123 Street · City, Country<br />
              <span className="underline">Unsubscribe</span> · <span className="underline">View in browser</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
