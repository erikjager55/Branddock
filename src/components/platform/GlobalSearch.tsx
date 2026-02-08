"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import {
  Search,
  LayoutDashboard,
  Target,
  FileText,
  Users,
  Settings,
  Clock,
  ArrowRight,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface SearchItem {
  id: string;
  label: string;
  href: string;
  category: string;
  icon: React.ReactNode;
}

const allItems: SearchItem[] = [
  { id: "dashboard", label: "Dashboard", href: "/dashboard", category: "Pages", icon: <LayoutDashboard className="w-4 h-4" /> },
  { id: "knowledge", label: "Knowledge", href: "/knowledge", category: "Pages", icon: <FileText className="w-4 h-4" /> },
  { id: "strategy", label: "Strategy", href: "/strategy", category: "Pages", icon: <Target className="w-4 h-4" /> },
  { id: "settings", label: "Settings", href: "/settings", category: "Pages", icon: <Settings className="w-4 h-4" /> },
  { id: "campaign-brand", label: "Brand Awareness Campaign", href: "/strategy", category: "Campaigns", icon: <Target className="w-4 h-4" /> },
  { id: "campaign-launch", label: "Product Launch Q1", href: "/strategy", category: "Campaigns", icon: <Target className="w-4 h-4" /> },
  { id: "content-blog", label: "Blog Post: Brand Strategy", href: "/strategy", category: "Content", icon: <FileText className="w-4 h-4" /> },
  { id: "persona-cmo", label: "CMO Persona", href: "/knowledge", category: "Personas", icon: <Users className="w-4 h-4" /> },
  { id: "persona-founder", label: "Startup Founder Persona", href: "/knowledge", category: "Personas", icon: <Users className="w-4 h-4" /> },
  { id: "settings-billing", label: "Billing Settings", href: "/settings", category: "Settings", icon: <Settings className="w-4 h-4" /> },
];

const STORAGE_KEY = "branddock-recent-searches";

function getRecentSearches(): string[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
  } catch {
    return [];
  }
}

function saveRecentSearch(id: string) {
  const recent = getRecentSearches().filter((r) => r !== id);
  recent.unshift(id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(recent.slice(0, 5)));
}

export function GlobalSearch() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const filtered = query
    ? allItems.filter(
        (item) =>
          item.label.toLowerCase().includes(query.toLowerCase()) ||
          item.category.toLowerCase().includes(query.toLowerCase())
      )
    : [];

  const recentIds = getRecentSearches();
  const recentItems = recentIds
    .map((id) => allItems.find((item) => item.id === id))
    .filter(Boolean) as SearchItem[];

  const displayItems = query ? filtered : recentItems;

  const grouped = displayItems.reduce<Record<string, SearchItem[]>>(
    (acc, item) => {
      const key = query ? item.category : "Recent";
      if (!acc[key]) acc[key] = [];
      acc[key].push(item);
      return acc;
    },
    {}
  );

  const flatItems = Object.values(grouped).flat();

  const close = useCallback(() => {
    setOpen(false);
    setQuery("");
    setHighlightedIndex(0);
  }, []);

  const navigate = useCallback(
    (item: SearchItem) => {
      saveRecentSearch(item.id);
      close();
      router.push(item.href);
    },
    [close, router]
  );

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setHighlightedIndex((i) => Math.min(i + 1, flatItems.length - 1));
        break;
      case "ArrowUp":
        e.preventDefault();
        setHighlightedIndex((i) => Math.max(i - 1, 0));
        break;
      case "Enter":
        e.preventDefault();
        if (flatItems[highlightedIndex]) navigate(flatItems[highlightedIndex]);
        break;
      case "Escape":
        close();
        break;
    }
  };

  let globalIndex = -1;

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[60] flex items-start justify-center pt-[20vh]">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.1 }}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={close}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -10 }}
            transition={{ duration: 0.15 }}
            className="relative w-full max-w-lg mx-4 rounded-lg border border-border-dark bg-surface-dark shadow-2xl overflow-hidden"
            onKeyDown={handleKeyDown}
          >
            <div className="flex items-center gap-3 px-4 border-b border-border-dark">
              <Search className="w-5 h-5 text-text-dark/40 flex-shrink-0" />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setHighlightedIndex(0);
                }}
                placeholder="Search pages, campaigns, content..."
                className="flex-1 h-12 bg-transparent text-sm text-text-dark placeholder:text-text-dark/40 focus:outline-none"
              />
              <kbd className="text-[10px] font-mono text-text-dark/30 border border-border-dark rounded px-1.5 py-0.5">
                ESC
              </kbd>
            </div>

            <div className="max-h-80 overflow-y-auto p-2">
              {Object.keys(grouped).length === 0 ? (
                <div className="px-3 py-8 text-center text-sm text-text-dark/40">
                  {query ? "No results found" : "Start typing to search..."}
                </div>
              ) : (
                Object.entries(grouped).map(([category, items]) => (
                  <div key={category} className="mb-2">
                    <div className="flex items-center gap-2 px-3 py-1.5">
                      {!query && <Clock className="w-3 h-3 text-text-dark/30" />}
                      <span className="text-xs font-medium text-text-dark/40 uppercase tracking-wider">
                        {category}
                      </span>
                    </div>
                    {items.map((item) => {
                      globalIndex++;
                      const idx = globalIndex;
                      return (
                        <button
                          key={item.id}
                          onClick={() => navigate(item)}
                          className={cn(
                            "w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors",
                            idx === highlightedIndex
                              ? "bg-primary/10 text-primary"
                              : "text-text-dark hover:bg-background-dark"
                          )}
                        >
                          <span className="flex-shrink-0 text-text-dark/50">
                            {item.icon}
                          </span>
                          <span className="flex-1 text-left">{item.label}</span>
                          {idx === highlightedIndex && (
                            <ArrowRight className="w-4 h-4 text-primary/50" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                ))
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
