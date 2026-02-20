"use client";

import React from "react";
import { CONTENT_CATEGORIES, type ContentCategory } from "@/lib/campaigns/content-types";

interface ContentTypeTabsProps {
  activeCategory: ContentCategory;
  onChange: (category: ContentCategory) => void;
}

export function ContentTypeTabs({ activeCategory, onChange }: ContentTypeTabsProps) {
  return (
    <div className="flex gap-1 border-b mb-4">
      {CONTENT_CATEGORIES.map((cat) => (
        <button
          key={cat.id}
          onClick={() => onChange(cat.id)}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeCategory === cat.id
              ? "border-teal-600 text-teal-600"
              : "border-transparent text-gray-500 hover:text-gray-700"
          }`}
        >
          {cat.label}
        </button>
      ))}
    </div>
  );
}
