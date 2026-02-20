'use client';

import { useState, useEffect, useRef } from 'react';
import { Search } from 'lucide-react';
import { useHelpStore } from '@/stores/useHelpStore';
import { useHelpSearch } from '@/hooks/use-help';
import { Badge } from '@/components/shared';

export function HelpSearchInput() {
  const searchQuery = useHelpStore((s) => s.searchQuery);
  const setSearchQuery = useHelpStore((s) => s.setSearchQuery);
  const activeTag = useHelpStore((s) => s.activeTag);

  const [localQuery, setLocalQuery] = useState(searchQuery);
  const [debouncedQuery, setDebouncedQuery] = useState(searchQuery);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Debounce: 300ms
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(localQuery);
      setSearchQuery(localQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [localQuery, setSearchQuery]);

  const { data } = useHelpSearch({
    query: debouncedQuery,
    tag: activeTag ?? undefined,
  });

  const hasResults =
    debouncedQuery.trim().length > 0 &&
    data &&
    (data.articles.length > 0 || data.faqMatches.length > 0);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div ref={containerRef} className="relative max-w-2xl mx-auto">
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
        <input
          type="text"
          value={localQuery}
          onChange={(e) => {
            setLocalQuery(e.target.value);
            setIsDropdownOpen(true);
          }}
          onFocus={() => {
            if (debouncedQuery.trim().length > 0) {
              setIsDropdownOpen(true);
            }
          }}
          placeholder="Search for articles, tutorials, and more..."
          className="w-full pl-12 px-5 py-4 text-lg rounded-xl border-2 border-gray-200 focus:border-primary focus:outline-none transition-colors"
        />
      </div>

      {/* Search results dropdown */}
      {isDropdownOpen && hasResults && (
        <div className="absolute z-50 w-full mt-2 bg-white border border-gray-200 rounded-xl shadow-lg max-h-80 overflow-y-auto">
          {data.articles.length > 0 && (
            <div className="p-2">
              <p className="px-3 py-1 text-xs font-medium text-gray-400 uppercase tracking-wider">
                Articles
              </p>
              {data.articles.map((article) => (
                <button
                  key={article.id}
                  onClick={() => {
                    console.log('Navigate to article:', article.slug);
                    setIsDropdownOpen(false);
                  }}
                  className="w-full flex items-center justify-between px-3 py-2 rounded-lg hover:bg-gray-50 text-left transition-colors"
                >
                  <span className="text-sm font-medium text-gray-900">
                    {article.title}
                  </span>
                  <Badge variant="default" size="sm">
                    {article.category.name}
                  </Badge>
                </button>
              ))}
            </div>
          )}

          {data.faqMatches.length > 0 && (
            <div className="p-2 border-t border-gray-100">
              <p className="px-3 py-1 text-xs font-medium text-gray-400 uppercase tracking-wider">
                FAQ
              </p>
              {data.faqMatches.map((faq) => (
                <button
                  key={faq.id}
                  onClick={() => {
                    console.log('Navigate to FAQ:', faq.id);
                    setIsDropdownOpen(false);
                  }}
                  className="w-full flex items-center justify-between px-3 py-2 rounded-lg hover:bg-gray-50 text-left transition-colors"
                >
                  <span className="text-sm font-medium text-gray-900">
                    {faq.question}
                  </span>
                  <Badge variant="teal" size="sm">
                    FAQ
                  </Badge>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
