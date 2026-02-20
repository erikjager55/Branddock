"use client";

import React, { useState, useRef, useEffect } from "react";
import { Plus, ChevronDown, Sliders, Package } from "lucide-react";

// ─── Types ───────────────────────────────────────────────────

interface SplitButtonProps {
  onNavigate: (section: string) => void;
}

// ─── Component ───────────────────────────────────────────────

export function SplitButton({ onNavigate }: SplitButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Click-outside detection
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  function handleMenuItemClick(section: string) {
    setIsOpen(false);
    onNavigate(section);
  }

  return (
    <div ref={containerRef} data-testid="split-button" className="relative inline-flex">
      <button
        data-testid="split-button-main"
        onClick={() => onNavigate("research-custom")}
        className="inline-flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-l-lg text-sm font-medium transition-colors"
      >
        <Plus className="w-4 h-4" />
        New Research Plan
      </button>

      <button
        data-testid="split-button-dropdown"
        onClick={() => setIsOpen((prev) => !prev)}
        className="inline-flex items-center justify-center bg-green-700 hover:bg-green-800 text-white px-2 py-2 rounded-r-lg border-l border-green-600 transition-colors"
      >
        <ChevronDown className="w-4 h-4" />
      </button>

      {isOpen && (
        <div data-testid="split-button-menu" className="absolute right-0 mt-1 top-full w-56 bg-white rounded-lg shadow-lg border py-1 z-10">
          <button
            onClick={() => handleMenuItemClick("research-custom")}
            className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors text-left"
          >
            <Sliders className="w-4 h-4 text-gray-400" />
            Custom Research Plan
          </button>
          <button
            onClick={() => handleMenuItemClick("research-bundles")}
            className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors text-left"
          >
            <Package className="w-4 h-4 text-gray-400" />
            Browse Research Bundles
          </button>
        </div>
      )}
    </div>
  );
}
