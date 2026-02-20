"use client";

import React from "react";
import type { ContentTypeDefinition } from "@/lib/campaigns/content-types";

interface ContentTypeCardProps {
  type: ContentTypeDefinition;
  isSelected: boolean;
  onClick: () => void;
}

export function ContentTypeCard({ type, isSelected, onClick }: ContentTypeCardProps) {
  const Icon = type.icon;

  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-all text-center ${
        isSelected
          ? "border-green-500 bg-green-50"
          : "border-gray-200 hover:border-gray-300 bg-white"
      }`}
    >
      <Icon className={`h-6 w-6 ${isSelected ? "text-green-600" : "text-gray-400"}`} />
      <span className={`text-sm font-medium ${isSelected ? "text-green-700" : "text-gray-700"}`}>
        {type.name}
      </span>
      <span className="text-xs text-gray-500 line-clamp-2">{type.description}</span>
    </button>
  );
}
