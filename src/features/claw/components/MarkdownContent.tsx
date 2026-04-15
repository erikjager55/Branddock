'use client';

import React from 'react';

/**
 * Lightweight markdown renderer for chat messages.
 * Handles: **bold**, *italic*, `inline code`, ```code blocks```,
 * - bullet lists, 1. numbered lists, [links](url), line breaks.
 * No external dependencies.
 */
export function MarkdownContent({ content }: { content: string }) {
  const blocks = parseBlocks(content);

  return (
    <div className="text-sm text-gray-800 leading-relaxed space-y-2">
      {blocks.map((block, i) => (
        <Block key={i} block={block} />
      ))}
    </div>
  );
}

// ─── Block parsing ────────────────────────────────────────

type BlockType =
  | { type: 'paragraph'; content: string }
  | { type: 'heading'; level: number; content: string }
  | { type: 'hr' }
  | { type: 'code'; language: string; content: string }
  | { type: 'list'; ordered: boolean; items: string[] };

function parseBlocks(text: string): BlockType[] {
  const blocks: BlockType[] = [];
  const lines = text.split('\n');
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Code block
    if (line.trimStart().startsWith('```')) {
      const language = line.trim().slice(3).trim();
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].trimStart().startsWith('```')) {
        codeLines.push(lines[i]);
        i++;
      }
      i++; // skip closing ```
      blocks.push({ type: 'code', language, content: codeLines.join('\n') });
      continue;
    }

    // Horizontal rule (---, ***, ___)
    if (/^(\s*[-*_]){3,}\s*$/.test(line)) {
      blocks.push({ type: 'hr' });
      i++;
      continue;
    }

    // Headings (# to ######)
    const headingMatch = line.match(/^(#{1,6})\s+(.+)$/);
    if (headingMatch) {
      blocks.push({ type: 'heading', level: headingMatch[1].length, content: headingMatch[2] });
      i++;
      continue;
    }

    // List items (- or * or 1.)
    if (/^(\s*[-*]\s|^\s*\d+\.\s)/.test(line)) {
      const items: string[] = [];
      const ordered = /^\s*\d+\./.test(line);
      while (i < lines.length && /^(\s*[-*]\s|^\s*\d+\.\s)/.test(lines[i])) {
        items.push(lines[i].replace(/^\s*[-*]\s+|^\s*\d+\.\s+/, ''));
        i++;
      }
      blocks.push({ type: 'list', ordered, items });
      continue;
    }

    // Empty line — skip
    if (line.trim() === '') {
      i++;
      continue;
    }

    // Paragraph — collect consecutive non-empty, non-special lines
    const paraLines: string[] = [];
    while (
      i < lines.length &&
      lines[i].trim() !== '' &&
      !lines[i].trimStart().startsWith('```') &&
      !/^(\s*[-*]\s|^\s*\d+\.\s)/.test(lines[i]) &&
      !/^#{1,6}\s/.test(lines[i]) &&
      !/^(\s*[-*_]){3,}\s*$/.test(lines[i])
    ) {
      paraLines.push(lines[i]);
      i++;
    }
    blocks.push({ type: 'paragraph', content: paraLines.join('\n') });
  }

  return blocks;
}

// ─── Block rendering ──────────────────────────────────────

function Block({ block }: { block: BlockType }) {
  switch (block.type) {
    case 'heading': {
      const cls: Record<number, string> = {
        1: 'text-lg font-semibold text-gray-900',
        2: 'text-base font-semibold text-gray-900',
        3: 'text-sm font-semibold text-gray-900',
        4: 'text-sm font-medium text-gray-800',
        5: 'text-xs font-medium text-gray-800',
        6: 'text-xs font-medium text-gray-700',
      };
      const className = cls[block.level] ?? cls[3];
      const inner = <InlineMarkdown text={block.content} />;
      if (block.level === 1) return <h1 className={className}>{inner}</h1>;
      if (block.level === 2) return <h2 className={className}>{inner}</h2>;
      if (block.level === 3) return <h3 className={className}>{inner}</h3>;
      if (block.level === 4) return <h4 className={className}>{inner}</h4>;
      return <h5 className={className}>{inner}</h5>;
    }

    case 'hr':
      return <hr className="border-gray-200" />;

    case 'paragraph':
      return <p><InlineMarkdown text={block.content} /></p>;

    case 'code':
      return (
        <pre className="bg-gray-100 rounded-lg px-3 py-2 overflow-x-auto text-xs font-mono text-gray-700">
          <code>{block.content}</code>
        </pre>
      );

    case 'list': {
      const Tag = block.ordered ? 'ol' : 'ul';
      return (
        <Tag className={block.ordered ? 'list-decimal pl-5 space-y-1' : 'list-disc pl-5 space-y-1'}>
          {block.items.map((item, i) => (
            <li key={i}><InlineMarkdown text={item} /></li>
          ))}
        </Tag>
      );
    }
  }
}

// ─── Inline markdown ──────────────────────────────────────

function InlineMarkdown({ text }: { text: string }) {
  const parts = parseInline(text);
  return (
    <>
      {parts.map((part, i) => {
        switch (part.type) {
          case 'text':
            return <React.Fragment key={i}>{part.content}</React.Fragment>;
          case 'bold':
            return <strong key={i} className="font-semibold">{part.content}</strong>;
          case 'italic':
            return <em key={i}>{part.content}</em>;
          case 'code':
            return <code key={i} className="px-1 py-0.5 bg-gray-100 rounded text-xs font-mono">{part.content}</code>;
          case 'link':
            return (
              <a key={i} href={part.href} target="_blank" rel="noopener noreferrer"
                className="text-teal-600 underline hover:text-teal-700">
                {part.content}
              </a>
            );
        }
      })}
    </>
  );
}

type InlinePart =
  | { type: 'text'; content: string }
  | { type: 'bold'; content: string }
  | { type: 'italic'; content: string }
  | { type: 'code'; content: string }
  | { type: 'link'; content: string; href: string };

function parseInline(text: string): InlinePart[] {
  const parts: InlinePart[] = [];
  // Match: **bold**, *italic*, `code`, [text](url)
  const regex = /(\*\*(.+?)\*\*)|(\*(.+?)\*)|(`(.+?)`)|(\[(.+?)\]\((.+?)\))/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    // Text before match
    if (match.index > lastIndex) {
      parts.push({ type: 'text', content: text.slice(lastIndex, match.index) });
    }

    if (match[1]) {
      parts.push({ type: 'bold', content: match[2] });
    } else if (match[3]) {
      parts.push({ type: 'italic', content: match[4] });
    } else if (match[5]) {
      parts.push({ type: 'code', content: match[6] });
    } else if (match[7]) {
      parts.push({ type: 'link', content: match[8], href: match[9] });
    }

    lastIndex = match.index + match[0].length;
  }

  // Remaining text
  if (lastIndex < text.length) {
    parts.push({ type: 'text', content: text.slice(lastIndex) });
  }

  return parts.length > 0 ? parts : [{ type: 'text', content: text }];
}
