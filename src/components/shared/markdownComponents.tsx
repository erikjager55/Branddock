import type React from 'react';
import type { Components } from 'react-markdown';

/**
 * Gedeelde `react-markdown`-component-map met design-token-conforme styling.
 *
 * Geëxtraheerd uit `BriefRenderView` zodat meerdere markdown-viewers (campagne-
 * brief, Deep Research-rapport) dezelfde render-regels delen. Bewust GEEN
 * `prose-*`-classes: die zijn weggepurged uit de gecompileerde Tailwind 4
 * `src/index.css` (zie gotchas 2026-04-19). Alle styling via expliciete
 * utility-classes die wél in de output staan.
 */
export const markdownComponents: Components = {
  h1: ({ children }: { children?: React.ReactNode }) => (
    <h1 className="text-2xl font-bold text-gray-900 mt-6 mb-3">{children}</h1>
  ),
  h2: ({ children }: { children?: React.ReactNode }) => (
    <h2 className="text-xl font-semibold text-gray-900 mt-6 mb-2 pb-1 border-b border-gray-200">
      {children}
    </h2>
  ),
  h3: ({ children }: { children?: React.ReactNode }) => (
    <h3 className="text-base font-semibold text-gray-900 mt-4 mb-2">{children}</h3>
  ),
  h4: ({ children }: { children?: React.ReactNode }) => (
    <h4 className="text-sm font-semibold text-gray-800 mt-3 mb-1">{children}</h4>
  ),
  p: ({ children }: { children?: React.ReactNode }) => (
    <p className="mb-2 leading-relaxed">{children}</p>
  ),
  ul: ({ children }: { children?: React.ReactNode }) => (
    <ul className="list-disc ml-6 mb-3 space-y-1">{children}</ul>
  ),
  ol: ({ children }: { children?: React.ReactNode }) => (
    <ol className="list-decimal ml-6 mb-3 space-y-1">{children}</ol>
  ),
  li: ({ children }: { children?: React.ReactNode }) => (
    <li className="leading-relaxed">{children}</li>
  ),
  strong: ({ children }: { children?: React.ReactNode }) => (
    <strong className="font-semibold text-gray-900">{children}</strong>
  ),
  em: ({ children }: { children?: React.ReactNode }) => (
    <em className="italic text-gray-600">{children}</em>
  ),
  code: ({ children }: { children?: React.ReactNode }) => (
    <code className="text-xs bg-gray-100 text-gray-800 px-1 py-0.5 rounded">
      {children}
    </code>
  ),
  blockquote: ({ children }: { children?: React.ReactNode }) => (
    <blockquote className="border-l-4 border-gray-300 pl-4 italic text-gray-600 my-2">
      {children}
    </blockquote>
  ),
  a: ({ href, children }: { href?: string; children?: React.ReactNode }) => (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="text-green-600 underline hover:text-green-700"
    >
      {children}
    </a>
  ),
};
