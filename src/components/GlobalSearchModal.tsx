import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Search, Command, ArrowRight, Clock, Zap } from 'lucide-react';
import { globalSearch } from '../services/GlobalSearchService';
import { SearchSection } from '../types/workflow';
import * as LucideIcons from 'lucide-react';

interface GlobalSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (route: string) => void;
  onAction?: (actionId: string) => void;
}

export function GlobalSearchModal({ isOpen, onClose, onNavigate, onAction }: GlobalSearchModalProps) {
  const [query, setQuery] = useState('');
  const [sections, setSections] = useState<SearchSection[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);

  // Search with debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      const results = globalSearch.search(query);
      setSections(results);
      setSelectedIndex(0);
    }, 150);

    return () => clearTimeout(timer);
  }, [query]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      inputRef.current?.focus();
      setQuery('');
      setSections(globalSearch.search(''));
    }
  }, [isOpen]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;

      const allResults = sections.flatMap(s => s.results);
      const maxIndex = allResults.length - 1;

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex(prev => Math.min(prev + 1, maxIndex));
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex(prev => Math.max(prev - 1, 0));
          break;
        case 'Enter':
          e.preventDefault();
          handleSelect(allResults[selectedIndex]);
          break;
        case 'Escape':
          e.preventDefault();
          onClose();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, sections, selectedIndex]);

  // Auto-scroll to selected item
  useEffect(() => {
    const selectedElement = resultsRef.current?.querySelector(`[data-index="${selectedIndex}"]`);
    if (selectedElement) {
      selectedElement.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  }, [selectedIndex]);

  const handleSelect = (result: any) => {
    if (result.action) {
      result.action();
      onAction?.(result.id);
    } else if (result.route) {
      onNavigate(result.route);
    }
    onClose();
  };

  const allResults = useMemo(() => 
    sections.flatMap(s => s.results),
    [sections]
  );

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh]">
        <div 
          className="w-full max-w-2xl mx-4 bg-background border border-border rounded-lg shadow-2xl overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Search Input */}
          <div className="flex items-center gap-3 px-4 py-4 border-b border-border">
            <Search className="h-5 w-5 text-muted-foreground flex-shrink-0" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search everything..."
              className="flex-1 bg-transparent outline-none text-foreground placeholder:text-muted-foreground"
            />
            <div className="flex items-center gap-2">
              <kbd className="hidden sm:inline-block px-2 py-1 text-xs font-mono bg-muted rounded border border-border">
                ESC
              </kbd>
            </div>
          </div>

          {/* Results */}
          <div 
            ref={resultsRef}
            className="max-h-[60vh] overflow-y-auto"
          >
            {sections.length === 0 && query.length >= 2 ? (
              <div className="px-4 py-12 text-center text-muted-foreground">
                <Search className="h-12 w-12 mx-auto mb-3 opacity-20" />
                <p>No results found for "{query}"</p>
                <p className="text-sm mt-1">Try a different search term</p>
              </div>
            ) : (
              sections.map((section, sectionIdx) => (
                <div key={section.id} className={sectionIdx > 0 ? 'border-t border-border' : ''}>
                  {/* Section Header */}
                  <div className="px-4 py-2 text-xs font-medium text-muted-foreground bg-muted/30">
                    {section.label}
                  </div>

                  {/* Section Results */}
                  <div>
                    {section.results.map((result, resultIdx) => {
                      const globalIndex = sections
                        .slice(0, sectionIdx)
                        .reduce((acc, s) => acc + s.results.length, 0) + resultIdx;
                      
                      const isSelected = globalIndex === selectedIndex;
                      const Icon = (LucideIcons as any)[result.icon || 'Circle'];

                      return (
                        <button
                          key={result.id}
                          data-index={globalIndex}
                          onClick={() => handleSelect(result)}
                          className={`w-full flex items-start gap-3 px-4 py-3 transition-colors ${
                            isSelected 
                              ? 'bg-accent text-accent-foreground' 
                              : 'hover:bg-accent/50'
                          }`}
                        >
                          {/* Icon */}
                          <div className={`h-10 w-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                            isSelected 
                              ? 'bg-primary/20 text-primary' 
                              : 'bg-muted text-muted-foreground'
                          }`}>
                            {Icon && <Icon className="h-5 w-5" />}
                          </div>

                          {/* Content */}
                          <div className="flex-1 text-left min-w-0">
                            <div className="font-medium truncate">{result.title}</div>
                            {result.subtitle && (
                              <div className="text-sm text-muted-foreground truncate">
                                {result.subtitle}
                              </div>
                            )}
                            {result.description && (
                              <div className="text-xs text-muted-foreground mt-1 line-clamp-1">
                                {result.description}
                              </div>
                            )}
                          </div>

                          {/* Action indicator */}
                          <div className="flex-shrink-0 flex items-center gap-2">
                            {result.metadata?.status && (
                              <span className={`text-xs px-2 py-0.5 rounded-full ${
                                result.metadata.status === 'approved' 
                                  ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                                  : result.metadata.status === 'ready-to-validate'
                                  ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                                  : 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400'
                              }`}>
                                {result.metadata.status}
                              </span>
                            )}
                            {isSelected && (
                              <ArrowRight className="h-4 w-4 text-muted-foreground" />
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          <div className="px-4 py-3 border-t border-border bg-muted/30">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1">
                  <kbd className="px-1.5 py-0.5 bg-background rounded border border-border font-mono">↑</kbd>
                  <kbd className="px-1.5 py-0.5 bg-background rounded border border-border font-mono">↓</kbd>
                  <span className="ml-1">Navigate</span>
                </div>
                <div className="flex items-center gap-1">
                  <kbd className="px-1.5 py-0.5 bg-background rounded border border-border font-mono">↵</kbd>
                  <span className="ml-1">Select</span>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <Command className="h-3 w-3" />
                <span>Powered by search</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
