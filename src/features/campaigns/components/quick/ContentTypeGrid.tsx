"use client";

import React from "react";
import { getContentTypesByCategory, type ContentCategory } from "@/lib/campaigns/content-types";
import { ContentTypeCard } from "./ContentTypeCard";

interface ContentTypeGridProps {
  category: ContentCategory;
  selectedTypeId: string | null;
  onSelect: (typeId: string) => void;
}

export function ContentTypeGrid({ category, selectedTypeId, onSelect }: ContentTypeGridProps) {
  const types = getContentTypesByCategory(category);

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
      {types.map((type) => (
        <ContentTypeCard
          key={type.id}
          type={type}
          isSelected={selectedTypeId === type.id}
          onClick={() => onSelect(type.id)}
        />
      ))}
    </div>
  );
}
