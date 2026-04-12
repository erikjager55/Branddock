'use client';

import React from 'react';

/**
 * Lightweight inline markdown renderer for content previews. Handles the
 * subset of markdown that AI models typically produce in blog-post / article
 * content. No external dependencies — just regex + JSX.
 *
 * Supported:
 * - ## Heading 2, ### Heading 3
 * - **bold** and *italic*
 * - - bullet list items
 * - Paragraphs (blank-line separated)
 */
export function SimpleMarkdown({ text, className = '' }: { text: string; className?: string }) {
  if (!text) return null;

  const blocks = text.split(/\n{2,}/);

  return (
    <div className={`space-y-3 ${className}`}>
      {blocks.map((block, blockIdx) => {
        const trimmed = block.trim();
        if (!trimmed) return null;

        // Heading 2
        if (trimmed.startsWith('## ')) {
          return (
            <h2 key={blockIdx} className="text-lg font-bold text-gray-900 mt-5 mb-2">
              {renderInline(trimmed.slice(3))}
            </h2>
          );
        }

        // Heading 3
        if (trimmed.startsWith('### ')) {
          return (
            <h3 key={blockIdx} className="text-base font-semibold text-gray-800 mt-4 mb-1">
              {renderInline(trimmed.slice(4))}
            </h3>
          );
        }

        // Bullet list (block of lines starting with - )
        const lines = trimmed.split('\n');
        const isList = lines.every((l) => l.trimStart().startsWith('- ') || l.trim() === '');
        if (isList && lines.some((l) => l.trimStart().startsWith('- '))) {
          return (
            <ul key={blockIdx} className="list-disc list-inside space-y-1 text-sm text-gray-700">
              {lines
                .filter((l) => l.trimStart().startsWith('- '))
                .map((l, li) => (
                  <li key={li}>{renderInline(l.trimStart().slice(2))}</li>
                ))}
            </ul>
          );
        }

        // Regular paragraph (may contain line breaks)
        return (
          <p key={blockIdx} className="text-sm text-gray-700 leading-relaxed">
            {lines.map((line, li) => (
              <React.Fragment key={li}>
                {li > 0 && <br />}
                {renderInline(line)}
              </React.Fragment>
            ))}
          </p>
        );
      })}
    </div>
  );
}

/** Render inline markdown: **bold** and *italic* */
function renderInline(text: string): React.ReactNode {
  // Split on **bold** and *italic* markers
  const parts: React.ReactNode[] = [];
  let remaining = text;
  let key = 0;

  while (remaining.length > 0) {
    // Match **bold**
    const boldMatch = remaining.match(/\*\*(.+?)\*\*/);
    // Match *italic* (but not inside **)
    const italicMatch = remaining.match(/(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)/);

    const firstMatch =
      boldMatch && italicMatch
        ? (boldMatch.index ?? Infinity) <= (italicMatch.index ?? Infinity)
          ? boldMatch
          : italicMatch
        : boldMatch ?? italicMatch;

    if (!firstMatch || firstMatch.index === undefined) {
      parts.push(remaining);
      break;
    }

    // Text before the match
    if (firstMatch.index > 0) {
      parts.push(remaining.slice(0, firstMatch.index));
    }

    // The match itself
    if (firstMatch[0].startsWith('**')) {
      parts.push(
        <strong key={key++} className="font-semibold text-gray-900">
          {firstMatch[1]}
        </strong>,
      );
    } else {
      parts.push(
        <em key={key++} className="italic">
          {firstMatch[1]}
        </em>,
      );
    }

    remaining = remaining.slice(firstMatch.index + firstMatch[0].length);
  }

  return parts.length === 1 && typeof parts[0] === 'string' ? parts[0] : <>{parts}</>;
}
