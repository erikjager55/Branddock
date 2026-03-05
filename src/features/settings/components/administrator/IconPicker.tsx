'use client';

import { useState, useRef, useEffect } from 'react';
import {
  Compass, Heart, Leaf, Globe, Target, Shield, Lightbulb, Star,
  Users, Sparkles, Rocket, TrendingUp, Eye, Layers, Fingerprint,
  Package, Settings, CheckCircle, AlertTriangle, BookOpen,
  MessageCircle, Zap, Award, Crown, Gem, Puzzle, Flag, Map, Anchor, Brain,
  HelpCircle,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

// ─── Icon Registry ──────────────────────────────────────────

const ICON_MAP: Record<string, LucideIcon> = {
  Compass, Heart, Leaf, Globe, Target, Shield, Lightbulb, Star,
  Users, Sparkles, Rocket, TrendingUp, Eye, Layers, Fingerprint,
  Package, Settings, CheckCircle, AlertTriangle, BookOpen,
  MessageCircle, Zap, Award, Crown, Gem, Puzzle, Flag, Map, Anchor, Brain,
  HelpCircle,
};

const ICON_NAMES = Object.keys(ICON_MAP);

// ─── Props ──────────────────────────────────────────────────

interface IconPickerProps {
  value: string;
  onChange: (iconName: string) => void;
}

// ─── Component ──────────────────────────────────────────────

export function IconPicker({ value, onChange }: IconPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const SelectedIcon = ICON_MAP[value] ?? Compass;

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-1.5 text-xs border border-gray-200 rounded-lg hover:border-gray-300 transition-colors bg-white w-full"
      >
        <SelectedIcon className="w-4 h-4 text-teal-600" />
        <span className="text-gray-700 truncate">{value || 'Kies icoon'}</span>
      </button>

      {isOpen && (
        <div className="absolute z-20 top-full left-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg p-3 w-[280px]">
          <p className="text-[10px] text-gray-400 mb-2 font-medium uppercase tracking-wider">Selecteer icoon</p>
          <div className="grid grid-cols-6 gap-1">
            {ICON_NAMES.map((name) => {
              const Icon = ICON_MAP[name];
              const isSelected = name === value;
              return (
                <button
                  key={name}
                  type="button"
                  onClick={() => {
                    onChange(name);
                    setIsOpen(false);
                  }}
                  className={`p-2 rounded-lg transition-colors ${
                    isSelected
                      ? 'bg-teal-50 text-teal-600 ring-1 ring-teal-200'
                      : 'hover:bg-gray-50 text-gray-500 hover:text-gray-700'
                  }`}
                  title={name}
                >
                  <Icon className="w-4 h-4" />
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

/** Resolve a Lucide icon name string to its component. Falls back to Compass. */
export function resolveIcon(name: string): LucideIcon {
  return ICON_MAP[name] ?? Compass;
}
