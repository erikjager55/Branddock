'use client';

import React from 'react';
import type { PlatformPreviewProps } from '../../../types/canvas.types';
import { InlineEditableSection, useEditableEntry, type InlineEditableEntry } from './InlineEditableSection';
import { AdditionalComponentsSection } from './AdditionalComponentsSection';
import { stripMarkdownForPlainText } from '../../../lib/strip-markdown';
import { MoreVertical } from 'lucide-react';

const HANDLED_GROUPS = [
  'headline-1', 'headline-2', 'headline-3',
  'description-1', 'description-2',
  'path-1', 'path-2',
  'sitelink-1-title', 'sitelink-1-description',
  'sitelink-2-title', 'sitelink-2-description',
  'sitelink-3-title', 'sitelink-3-description',
  'sitelink-4-title', 'sitelink-4-description',
  // Suppress fallback legacy naming the model may emit
  'headline', 'description', 'cta', 'cta-button', 'body',
];

interface SitelinkSlot {
  title: InlineEditableEntry | null;
  description: InlineEditableEntry | null;
}

/**
 * Google Search Ad mockup — replicates the SERP rendering for a
 * Responsive Search Ad: "Sponsored" badge, favicon + domain + display
 * path, combined Headline 1 · Headline 2 in blue, two descriptions
 * stacked, sitelinks in a 2x2 grid below. Headline 3 + alternative
 * combinations rendered as an "alternative configurations" preview
 * panel.
 */
export function SearchAdPreview({ isGenerating, brandName }: PlatformPreviewProps) {
  const headline1 = useEditableEntry('headline-1');
  const headline2 = useEditableEntry('headline-2');
  const headline3 = useEditableEntry('headline-3');
  const description1 = useEditableEntry('description-1');
  const description2 = useEditableEntry('description-2');
  const path1 = useEditableEntry('path-1');
  const path2 = useEditableEntry('path-2');

  const sitelinks: SitelinkSlot[] = [
    { title: useEditableEntry('sitelink-1-title'), description: useEditableEntry('sitelink-1-description') },
    { title: useEditableEntry('sitelink-2-title'), description: useEditableEntry('sitelink-2-description') },
    { title: useEditableEntry('sitelink-3-title'), description: useEditableEntry('sitelink-3-description') },
    { title: useEditableEntry('sitelink-4-title'), description: useEditableEntry('sitelink-4-description') },
  ];

  const name = brandName ?? 'Brand Name';
  const initial = name.charAt(0).toUpperCase();
  const domain = name.toLowerCase().replace(/\s+/g, '') + '.com';
  const activeSitelinks = sitelinks.filter((s) => s.title);

  if (isGenerating) {
    return <SearchAdSkeleton />;
  }

  return (
    <div className="mx-auto w-full max-w-2xl space-y-4">
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4">
        <div className="flex items-start gap-3">
          <div className="h-7 w-7 rounded-full flex items-center justify-center flex-shrink-0 bg-gray-100">
            <span className="text-xs font-bold text-gray-700">{initial}</span>
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 text-sm mb-0.5">
              <span className="font-semibold text-gray-900">Sponsored</span>
            </div>

            <div className="flex items-center gap-1 text-xs text-gray-600">
              <span className="font-medium text-gray-900">{domain}</span>
              <DisplayPath path1={path1} path2={path2} />
              <MoreVertical className="h-3 w-3 text-gray-400 ml-1" />
            </div>

            <HeadlineRow headline1={headline1} headline2={headline2} />

            {description1 && (
              <InlineEditableSection
                entry={description1}
                render={(text) => (
                  <p className="text-sm text-gray-700 leading-snug mt-1">{stripMarkdownForPlainText(text)}</p>
                )}
              />
            )}
            {description2 && (
              <InlineEditableSection
                entry={description2}
                render={(text) => (
                  <p className="text-sm text-gray-700 leading-snug mt-0.5">{stripMarkdownForPlainText(text)}</p>
                )}
              />
            )}

            {activeSitelinks.length > 0 && (
              <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 pt-3 border-t border-gray-100">
                {activeSitelinks.map((sitelink, idx) => (
                  <SitelinkRow key={idx} slot={sitelink} />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {headline3 && (
        <div className="mx-auto max-w-2xl">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1.5">Alternative headline (Google rotates between H1·H2 and H1·H3)</p>
          <div className="bg-gray-50 rounded-lg border border-gray-200 px-4 py-2">
            <InlineEditableSection
              entry={headline3}
              render={(text) => (
                <p className="text-base text-gray-700 leading-snug">{stripMarkdownForPlainText(text)}</p>
              )}
            />
          </div>
        </div>
      )}

      <AdditionalComponentsSection handledGroups={HANDLED_GROUPS} />
    </div>
  );
}

function HeadlineRow({ headline1, headline2 }: { headline1: InlineEditableEntry | null; headline2: InlineEditableEntry | null }) {
  return (
    <div className="flex items-baseline flex-wrap gap-x-2 mt-0.5">
      {headline1 ? (
        <InlineEditableSection
          entry={headline1}
          render={(text) => (
            <span className="text-xl text-blue-700 hover:underline cursor-pointer leading-tight">{stripMarkdownForPlainText(text)}</span>
          )}
        />
      ) : (
        <span className="text-xl text-blue-700 italic opacity-50">[headline 1]</span>
      )}

      {headline2 && (
        <>
          <span className="text-xl text-blue-700">·</span>
          <InlineEditableSection
            entry={headline2}
            render={(text) => (
              <span className="text-xl text-blue-700 hover:underline cursor-pointer leading-tight">{stripMarkdownForPlainText(text)}</span>
            )}
          />
        </>
      )}
    </div>
  );
}

function DisplayPath({ path1, path2 }: { path1: InlineEditableEntry | null; path2: InlineEditableEntry | null }) {
  if (!path1 && !path2) return null;
  return (
    <>
      {path1 && (
        <>
          <span className="text-gray-400">/</span>
          <InlineEditableSection
            entry={path1}
            size="compact"
            render={(text) => <span className="text-gray-600">{stripMarkdownForPlainText(text)}</span>}
          />
        </>
      )}
      {path2 && (
        <>
          <span className="text-gray-400">/</span>
          <InlineEditableSection
            entry={path2}
            size="compact"
            render={(text) => <span className="text-gray-600">{stripMarkdownForPlainText(text)}</span>}
          />
        </>
      )}
    </>
  );
}

function SitelinkRow({ slot }: { slot: SitelinkSlot }) {
  if (!slot.title) return null;
  return (
    <div>
      <InlineEditableSection
        entry={slot.title}
        render={(text) => (
          <p className="text-sm text-blue-700 hover:underline cursor-pointer leading-tight">{stripMarkdownForPlainText(text)}</p>
        )}
      />
      {slot.description && (
        <InlineEditableSection
          entry={slot.description}
          render={(text) => (
            <p className="text-xs text-gray-600 leading-snug mt-0.5">{stripMarkdownForPlainText(text)}</p>
          )}
        />
      )}
    </div>
  );
}

function SearchAdSkeleton() {
  return (
    <div className="mx-auto w-full max-w-2xl">
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4 animate-pulse">
        <div className="flex items-start gap-3">
          <div className="h-7 w-7 rounded-full bg-gray-200 flex-shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="h-3 w-20 bg-gray-200 rounded" />
            <div className="h-3 w-48 bg-gray-200 rounded" />
            <div className="h-5 w-3/4 bg-gray-200 rounded" />
            <div className="h-3 w-full bg-gray-200 rounded" />
            <div className="h-3 w-5/6 bg-gray-200 rounded" />
            <div className="grid grid-cols-2 gap-3 pt-3 border-t border-gray-100">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="space-y-1">
                  <div className="h-3 w-3/4 bg-gray-200 rounded" />
                  <div className="h-2.5 w-full bg-gray-200 rounded" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
