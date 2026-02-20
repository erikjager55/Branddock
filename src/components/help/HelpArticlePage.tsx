"use client";

import React, { useState, useCallback } from "react";
import {
  ArrowLeft,
  Clock,
  BookOpen,
  ChevronRight,
  ThumbsUp,
  ThumbsDown,
  MessageSquare,
  Info,
  AlertTriangle,
} from "lucide-react";
import { Card, Button, Badge } from "@/components/shared";
import { useHelpArticle, useArticleFeedback } from "@/hooks/use-help";
import { useHelpStore } from "@/stores/useHelpStore";
import type { HelpArticleDetailResponse, TocItem } from "@/types/help";

// ─── ArticleBreadcrumb ──────────────────────────────────────

function ArticleBreadcrumb({
  categoryName,
  categorySlug,
  onBack,
}: {
  categoryName: string;
  categorySlug: string;
  onBack: () => void;
}) {
  return (
    <div className="flex items-center gap-2 text-sm">
      <button
        onClick={onBack}
        className="flex items-center gap-1.5 text-gray-500 hover:text-teal-600 transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Help Center
      </button>
      <ChevronRight className="h-3.5 w-3.5 text-gray-400" />
      <Badge variant="teal" size="sm">
        {categoryName}
      </Badge>
    </div>
  );
}

// ─── ArticleHeader ──────────────────────────────────────────

function ArticleHeader({
  title,
  subtitle,
  readTimeMinutes,
  publishedAt,
}: {
  title: string;
  subtitle: string | null;
  readTimeMinutes: number;
  publishedAt: string;
}) {
  const daysAgo = Math.floor(
    (Date.now() - new Date(publishedAt).getTime()) / (1000 * 60 * 60 * 24)
  );
  const updatedLabel =
    daysAgo === 0
      ? "Updated today"
      : daysAgo === 1
      ? "Updated yesterday"
      : `Updated ${daysAgo} days ago`;

  return (
    <div className="space-y-3">
      <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
      {subtitle && <p className="text-gray-600">{subtitle}</p>}
      <div className="flex items-center gap-4 text-sm text-gray-500">
        <span className="flex items-center gap-1.5">
          <Clock className="h-3.5 w-3.5" />
          {updatedLabel}
        </span>
        <span className="flex items-center gap-1.5">
          <BookOpen className="h-3.5 w-3.5" />
          {readTimeMinutes} min read
        </span>
      </div>
    </div>
  );
}

// ─── TableOfContents ────────────────────────────────────────

function TableOfContents({ items }: { items: TocItem[] }) {
  if (items.length === 0) return null;

  const handleClick = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  return (
    <Card padding="md" className="sticky top-6">
      <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
        In this article
      </h3>
      <nav className="space-y-1">
        {items.map((item) => (
          <button
            key={item.id}
            onClick={() => handleClick(item.id)}
            className={`block w-full text-left text-sm transition-colors hover:text-teal-600 ${
              item.level === 3 ? "pl-4 text-gray-500" : "text-gray-700 font-medium"
            }`}
          >
            {item.title}
          </button>
        ))}
      </nav>
    </Card>
  );
}

// ─── ArticleContent (Markdown Renderer) ─────────────────────

function ArticleContent({ content }: { content: string }) {
  const rendered = renderMarkdown(content);
  return (
    <div
      className="prose-branddock"
      dangerouslySetInnerHTML={{ __html: rendered }}
    />
  );
}

/**
 * Simple markdown → HTML renderer.
 * Handles: headers with IDs, bold, italic, links, lists, code blocks,
 * info/warning boxes, tables, and step numbers.
 */
function renderMarkdown(md: string): string {
  const lines = md.split("\n");
  const result: string[] = [];
  let inCodeBlock = false;
  let codeContent: string[] = [];
  let inList = false;
  let inTable = false;
  let tableRows: string[] = [];
  let stepCounter = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Code blocks
    if (line.startsWith("```")) {
      if (inCodeBlock) {
        result.push(
          `<pre class="bg-gray-900 text-gray-100 rounded-lg p-4 text-sm overflow-x-auto my-4"><code>${codeContent.join("\n")}</code></pre>`
        );
        codeContent = [];
        inCodeBlock = false;
      } else {
        inCodeBlock = true;
      }
      continue;
    }
    if (inCodeBlock) {
      codeContent.push(escapeHtml(line));
      continue;
    }

    // Table rows
    if (line.startsWith("|")) {
      if (!inTable) {
        inTable = true;
        tableRows = [];
      }
      // Skip separator row
      if (/^\|[\s-:|]+\|$/.test(line.trim())) continue;
      tableRows.push(line);
      continue;
    } else if (inTable) {
      result.push(renderTable(tableRows));
      tableRows = [];
      inTable = false;
    }

    // Close list if needed
    if (inList && !line.startsWith("- ") && !line.startsWith("* ") && line.trim() !== "") {
      result.push("</ul>");
      inList = false;
    }

    // Empty line
    if (line.trim() === "") {
      if (inList) {
        result.push("</ul>");
        inList = false;
      }
      continue;
    }

    // Info boxes
    if (line.startsWith("> **Info:**") || line.startsWith("> ℹ️")) {
      const text = line.replace(/^>\s*(\*\*Info:\*\*|ℹ️)\s*/, "");
      result.push(
        `<div class="flex gap-3 p-4 bg-blue-50 border-l-4 border-blue-400 rounded-r-lg my-4">
          <span class="flex-shrink-0 mt-0.5"><svg class="h-4 w-4 text-blue-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="m12 16v-4"/><path d="m12 8h.01"/></svg></span>
          <span class="text-sm text-blue-800">${inlineFormat(text)}</span>
        </div>`
      );
      continue;
    }

    // Warning boxes
    if (line.startsWith("> **Warning:**") || line.startsWith("> ⚠️")) {
      const text = line.replace(/^>\s*(\*\*Warning:\*\*|⚠️)\s*/, "");
      result.push(
        `<div class="flex gap-3 p-4 bg-yellow-50 border-l-4 border-yellow-400 rounded-r-lg my-4">
          <span class="flex-shrink-0 mt-0.5"><svg class="h-4 w-4 text-yellow-600" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg></span>
          <span class="text-sm text-yellow-800">${inlineFormat(text)}</span>
        </div>`
      );
      continue;
    }

    // Blockquotes (generic)
    if (line.startsWith("> ")) {
      const text = line.replace(/^>\s*/, "");
      result.push(
        `<blockquote class="border-l-4 border-gray-300 pl-4 py-1 my-3 text-gray-600 italic">${inlineFormat(text)}</blockquote>`
      );
      continue;
    }

    // Headers
    const h3Match = line.match(/^###\s+(.+)$/);
    if (h3Match) {
      const title = h3Match[1].trim();
      const id = headingToId(title);
      result.push(
        `<h3 id="${id}" class="text-lg font-semibold text-gray-900 mt-8 mb-3 scroll-mt-20">${inlineFormat(title)}</h3>`
      );
      continue;
    }

    const h2Match = line.match(/^##\s+(.+)$/);
    if (h2Match) {
      const title = h2Match[1].trim();
      const id = headingToId(title);
      // Check if it's a numbered step (e.g. "Step 1: ...")
      const stepMatch = title.match(/^Step\s+(\d+)/i);
      if (stepMatch) {
        stepCounter = parseInt(stepMatch[1], 10);
        result.push(
          `<div class="flex items-start gap-3 mt-8 mb-3" id="${id}">
            <span class="flex-shrink-0 w-8 h-8 rounded-full bg-teal-100 text-teal-700 flex items-center justify-center text-sm font-bold">${stepCounter}</span>
            <h2 class="text-xl font-semibold text-gray-900 scroll-mt-20">${inlineFormat(title)}</h2>
          </div>`
        );
      } else {
        result.push(
          `<h2 id="${id}" class="text-xl font-semibold text-gray-900 mt-8 mb-3 scroll-mt-20">${inlineFormat(title)}</h2>`
        );
      }
      continue;
    }

    const h1Match = line.match(/^#\s+(.+)$/);
    if (h1Match) {
      result.push(
        `<h1 class="text-2xl font-bold text-gray-900 mt-8 mb-4">${inlineFormat(h1Match[1].trim())}</h1>`
      );
      continue;
    }

    // Unordered lists
    if (line.startsWith("- ") || line.startsWith("* ")) {
      if (!inList) {
        result.push('<ul class="list-disc pl-5 space-y-1 my-3 text-gray-700">');
        inList = true;
      }
      result.push(`<li class="text-sm">${inlineFormat(line.slice(2))}</li>`);
      continue;
    }

    // Paragraph
    result.push(`<p class="text-sm text-gray-700 leading-relaxed my-3">${inlineFormat(line)}</p>`);
  }

  // Close open blocks
  if (inList) result.push("</ul>");
  if (inTable) result.push(renderTable(tableRows));
  if (inCodeBlock) {
    result.push(
      `<pre class="bg-gray-900 text-gray-100 rounded-lg p-4 text-sm overflow-x-auto my-4"><code>${codeContent.join("\n")}</code></pre>`
    );
  }

  return result.join("\n");
}

function renderTable(rows: string[]): string {
  if (rows.length === 0) return "";
  const parseRow = (row: string) =>
    row
      .split("|")
      .filter((c) => c.trim() !== "")
      .map((c) => c.trim());

  const headerCells = parseRow(rows[0]);
  const bodyCells = rows.slice(1).map(parseRow);

  let html =
    '<div class="overflow-x-auto my-4"><table class="w-full text-sm border-collapse">';
  html += "<thead><tr>";
  for (const cell of headerCells) {
    html += `<th class="border-b-2 border-gray-200 px-3 py-2 text-left font-semibold text-gray-700">${inlineFormat(cell)}</th>`;
  }
  html += "</tr></thead><tbody>";
  for (const row of bodyCells) {
    html += "<tr>";
    for (const cell of row) {
      html += `<td class="border-b border-gray-100 px-3 py-2 text-gray-600">${inlineFormat(cell)}</td>`;
    }
    html += "</tr>";
  }
  html += "</tbody></table></div>";
  return html;
}

function inlineFormat(text: string): string {
  // Bold
  let out = text.replace(/\*\*(.+?)\*\*/g, '<strong class="font-semibold text-gray-900">$1</strong>');
  // Italic
  out = out.replace(/\*(.+?)\*/g, "<em>$1</em>");
  // Inline code
  out = out.replace(
    /`([^`]+)`/g,
    '<code class="px-1.5 py-0.5 bg-gray-100 text-gray-800 rounded text-xs font-mono">$1</code>'
  );
  // Links
  out = out.replace(
    /\[([^\]]+)\]\(([^)]+)\)/g,
    '<a href="$2" class="text-teal-600 hover:text-teal-700 underline" target="_blank" rel="noopener noreferrer">$1</a>'
  );
  return out;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function headingToId(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

// ─── ArticleFeedback ────────────────────────────────────────

function ArticleFeedback({
  articleSlug,
  helpfulYes,
  helpfulNo,
}: {
  articleSlug: string;
  helpfulYes: number;
  helpfulNo: number;
}) {
  const [submitted, setSubmitted] = useState<"yes" | "no" | null>(null);
  const feedbackMutation = useArticleFeedback();

  const handleFeedback = (helpful: boolean) => {
    if (submitted) return;
    feedbackMutation.mutate(
      { slug: articleSlug, helpful },
      { onSuccess: () => setSubmitted(helpful ? "yes" : "no") }
    );
  };

  return (
    <div className="border-t border-gray-200 pt-6 mt-8">
      <div className="text-center">
        {submitted ? (
          <p className="text-sm text-gray-600">
            Thanks for your feedback!
          </p>
        ) : (
          <>
            <p className="text-sm font-medium text-gray-700 mb-3">
              Was this article helpful?
            </p>
            <div className="flex items-center justify-center gap-3">
              <button
                onClick={() => handleFeedback(true)}
                disabled={feedbackMutation.isPending}
                className="flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-200 hover:bg-emerald-50 hover:border-emerald-200 hover:text-emerald-700 transition-colors text-sm text-gray-600"
              >
                <ThumbsUp className="h-4 w-4" />
                Yes ({helpfulYes})
              </button>
              <button
                onClick={() => handleFeedback(false)}
                disabled={feedbackMutation.isPending}
                className="flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-200 hover:bg-red-50 hover:border-red-200 hover:text-red-700 transition-colors text-sm text-gray-600"
              >
                <ThumbsDown className="h-4 w-4" />
                No ({helpfulNo})
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ─── RelatedArticles ────────────────────────────────────────

function RelatedArticles({
  articles,
  onNavigate,
}: {
  articles: HelpArticleDetailResponse["relatedArticles"];
  onNavigate: (slug: string) => void;
}) {
  if (articles.length === 0) return null;

  return (
    <Card padding="lg">
      <h3 className="text-sm font-semibold text-gray-900 mb-3">
        Related Articles
      </h3>
      <div className="space-y-2">
        {articles.map((article) => (
          <button
            key={article.id}
            onClick={() => onNavigate(article.slug)}
            className="flex items-center justify-between w-full p-3 rounded-lg hover:bg-gray-50 transition-colors text-left group"
          >
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 group-hover:text-teal-600 transition-colors truncate">
                {article.title}
              </p>
              {article.subtitle && (
                <p className="text-xs text-gray-500 truncate mt-0.5">
                  {article.subtitle}
                </p>
              )}
            </div>
            <ChevronRight className="h-4 w-4 text-teal-500 flex-shrink-0 ml-2" />
          </button>
        ))}
      </div>
    </Card>
  );
}

// ─── StillNeedHelp ──────────────────────────────────────────

function StillNeedHelp({ onContactSupport }: { onContactSupport: () => void }) {
  return (
    <Card padding="lg" className="bg-gray-50">
      <div className="text-center">
        <MessageSquare className="h-6 w-6 text-gray-400 mx-auto mb-2" />
        <p className="text-sm font-medium text-gray-700 mb-1">
          Still need help?
        </p>
        <p className="text-xs text-gray-500 mb-3">
          Our support team is here for you
        </p>
        <Button
          variant="primary"
          size="sm"
          icon={MessageSquare}
          onClick={onContactSupport}
        >
          Contact Support
        </Button>
      </div>
    </Card>
  );
}

// ─── Main Page Component ────────────────────────────────────

export function HelpArticlePage({
  onNavigate,
}: {
  onNavigate: (section: string) => void;
}) {
  const { selectedArticleSlug, setSelectedArticleSlug } = useHelpStore();
  const slug = selectedArticleSlug ?? "";
  const { data: article, isLoading, error } = useHelpArticle(slug);

  const handleBack = useCallback(() => {
    setSelectedArticleSlug(null);
    onNavigate("help");
  }, [onNavigate, setSelectedArticleSlug]);

  const handleNavigateArticle = useCallback(
    (newSlug: string) => {
      setSelectedArticleSlug(newSlug);
    },
    [setSelectedArticleSlug]
  );

  const handleContactSupport = useCallback(() => {
    setSelectedArticleSlug(null);
    onNavigate("help");
    // The help page should scroll to contact section
  }, [onNavigate, setSelectedArticleSlug]);

  // Loading state
  if (isLoading) {
    return (
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-5xl mx-auto p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-gray-200 rounded w-48" />
            <div className="h-8 bg-gray-200 rounded w-3/4" />
            <div className="h-4 bg-gray-200 rounded w-1/2" />
            <div className="h-4 bg-gray-200 rounded w-36" />
            <div className="h-px bg-gray-200 my-6" />
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="h-4 bg-gray-200 rounded" />
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error || !article) {
    return (
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-5xl mx-auto p-6 text-center py-20">
          <BookOpen className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <h2 className="text-lg font-semibold text-gray-900 mb-2">
            Article not found
          </h2>
          <p className="text-sm text-gray-500 mb-4">
            The article you&apos;re looking for doesn&apos;t exist or has been
            removed.
          </p>
          <Button variant="primary" onClick={handleBack}>
            Back to Help Center
          </Button>
        </div>
      </div>
    );
  }

  const hasToc = article.toc.length > 0;

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-5xl mx-auto p-6">
        {/* Breadcrumb */}
        <ArticleBreadcrumb
          categoryName={article.category.name}
          categorySlug={article.category.slug}
          onBack={handleBack}
        />

        {/* Main layout: content + sidebar */}
        <div className={`mt-6 ${hasToc ? "grid grid-cols-[1fr,240px] gap-8" : ""}`}>
          {/* Article content column */}
          <div>
            <ArticleHeader
              title={article.title}
              subtitle={article.subtitle}
              readTimeMinutes={article.readTimeMinutes}
              publishedAt={article.publishedAt}
            />

            <div className="mt-6">
              <ArticleContent content={article.content} />
            </div>

            <ArticleFeedback
              articleSlug={article.slug}
              helpfulYes={article.helpfulYes}
              helpfulNo={article.helpfulNo}
            />
          </div>

          {/* Sidebar */}
          {hasToc && (
            <aside className="hidden lg:block">
              <TableOfContents items={article.toc} />
              <div className="mt-4">
                <RelatedArticles
                  articles={article.relatedArticles}
                  onNavigate={handleNavigateArticle}
                />
              </div>
              <div className="mt-4">
                <StillNeedHelp onContactSupport={handleContactSupport} />
              </div>
            </aside>
          )}
        </div>

        {/* Related articles below content if no sidebar */}
        {!hasToc && article.relatedArticles.length > 0 && (
          <div className="mt-8 max-w-2xl">
            <RelatedArticles
              articles={article.relatedArticles}
              onNavigate={handleNavigateArticle}
            />
          </div>
        )}

        {!hasToc && (
          <div className="mt-4 max-w-2xl">
            <StillNeedHelp onContactSupport={handleContactSupport} />
          </div>
        )}
      </div>
    </div>
  );
}
