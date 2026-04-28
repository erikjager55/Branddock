'use client';

import React from 'react';
import { InlineEditableSection, useEditableEntries } from './InlineEditableSection';

/**
 * Renders any variant groups that the parent preview has NOT explicitly
 * placed in a curated slot. Each platform preview lists the groups it
 * already handles via `handledGroups`; everything else surfaces here so
 * the user can still edit it.
 *
 * Background: `MediumEnrichment.componentTemplate` defines what the AI
 * generates per platform/format (e.g. blog-article emits introduction,
 * body-sections, conclusion …) but the curated platform mockups only
 * surface the most prominent slots. Without this section, generated
 * components like `body-sections`, `footer`, `tags`, `thumbnail-concept`,
 * `interview-questions` etc. would be invisible and uneditable.
 */
export function AdditionalComponentsSection({ handledGroups }: { handledGroups: string[] }) {
  const entries = useEditableEntries();
  const handled = React.useMemo(
    () => new Set(handledGroups.map((g) => g.toLowerCase())),
    [handledGroups],
  );

  const remaining = Array.from(entries.values()).filter(
    (e) => !handled.has(e.group.toLowerCase()),
  );

  if (remaining.length === 0) return null;

  return (
    <div className="mt-3 pt-3 border-t border-gray-200 space-y-3">
      <p className="text-[11px] font-medium text-gray-500 uppercase tracking-wider">
        Additional components
      </p>
      {remaining.map((entry) => (
        <div key={entry.group}>
          <p className="text-[11px] font-medium text-gray-400 uppercase mb-1">
            {entry.group.replace(/[-_]/g, ' ')}
          </p>
          <InlineEditableSection
            entry={entry}
            render={(text) => (
              <p className="text-sm text-gray-700 whitespace-pre-wrap">{text}</p>
            )}
            size="compact"
          />
        </div>
      ))}
    </div>
  );
}
