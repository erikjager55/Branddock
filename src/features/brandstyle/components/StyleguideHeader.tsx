"use client";

import { Paintbrush, Download, RefreshCw } from "lucide-react";
import { Button } from "@/components/shared";
import { useExportPdf } from "../hooks/useBrandstyleHooks";
import type { BrandStyleguide } from "../types/brandstyle.types";

interface StyleguideHeaderProps {
  styleguide: BrandStyleguide;
  onAnalyzeNext: () => void;
}

export function StyleguideHeader({ styleguide, onAnalyzeNext }: StyleguideHeaderProps) {
  const exportPdf = useExportPdf();

  const createdDate = new Date(styleguide.createdAt).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="flex items-center justify-between mb-6">
      <div className="flex items-center gap-4">
        <div className="w-10 h-10 rounded-lg bg-teal-50 flex items-center justify-center">
          <Paintbrush className="w-5 h-5 text-teal-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Brand Styleguide</h1>
          <div className="flex items-center gap-2 text-sm text-gray-500">
            {styleguide.createdBy.name && (
              <>
                <span>Created by {styleguide.createdBy.name}</span>
                <span>·</span>
              </>
            )}
            <span>{createdDate}</span>
            {styleguide.sourceUrl && (
              <>
                <span>·</span>
                <span className="text-teal-600 truncate max-w-[200px]">
                  {styleguide.sourceUrl}
                </span>
              </>
            )}
          </div>
        </div>
      </div>
      <div className="flex gap-2">
        <Button variant="secondary" icon={RefreshCw} onClick={onAnalyzeNext}>
          Analyze Next
        </Button>
        <Button
          variant="secondary"
          icon={Download}
          onClick={() => exportPdf.mutate()}
          isLoading={exportPdf.isPending}
        >
          Export PDF
        </Button>
      </div>
    </div>
  );
}
