/**
 * Helper utilities for help search and tag filtering.
 */

import type { HelpSearchResponse, HelpArticleSummary, FaqItemResponse } from "@/types/help";

/**
 * Filter search results by tag (category slug).
 * The API already supports tag filtering, but this can be used
 * for client-side re-filtering when needed.
 */
export function filterByTag(
  results: HelpSearchResponse,
  tag: string | null
): HelpSearchResponse {
  if (!tag) return results;

  return {
    articles: results.articles.filter((a) => a.category.slug === tag),
    faqMatches: results.faqMatches, // FAQ items don't have categories
  };
}

/**
 * Highlight matching text in a string by wrapping matches in <mark> tags.
 * Returns the string with matches wrapped.
 */
export function highlightMatch(text: string, query: string): string {
  if (!query.trim()) return text;

  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const regex = new RegExp(`(${escaped})`, "gi");
  return text.replace(regex, "<mark>$1</mark>");
}

/**
 * Get total result count from a search response.
 */
export function getTotalResults(response: HelpSearchResponse): number {
  return response.articles.length + response.faqMatches.length;
}

/**
 * Check if a search response has any results.
 */
export function hasResults(response: HelpSearchResponse): boolean {
  return getTotalResults(response) > 0;
}

/**
 * Sort articles by relevance (helpfulYes desc, then readTimeMinutes asc).
 */
export function sortArticlesByRelevance(articles: HelpArticleSummary[]): HelpArticleSummary[] {
  return [...articles].sort((a, b) => {
    if (b.helpfulYes !== a.helpfulYes) return b.helpfulYes - a.helpfulYes;
    return a.readTimeMinutes - b.readTimeMinutes;
  });
}

/**
 * Sort FAQ items by helpfulness.
 */
export function sortFaqByHelpfulness(items: FaqItemResponse[]): FaqItemResponse[] {
  return [...items].sort((a, b) => b.helpfulYes - a.helpfulYes);
}
