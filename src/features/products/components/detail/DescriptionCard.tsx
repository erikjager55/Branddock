"use client";

import { FileText } from "lucide-react";

interface DescriptionCardProps {
  description: string | null;
}

export function DescriptionCard({ description }: DescriptionCardProps) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-5">
      <div className="flex items-center gap-2 mb-3">
        <FileText className="h-4 w-4 text-green-600" />
        <h3 className="text-sm font-semibold text-gray-900">Description</h3>
      </div>
      <p className="text-sm text-gray-600">
        {description || "No description"}
      </p>
    </div>
  );
}
